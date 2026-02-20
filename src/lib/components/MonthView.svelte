<script lang="ts">
import { DateTime } from 'luxon';
import { tick } from 'svelte';
import type { CalendarItem } from '../models';
import { formatTime, getItemStart, getItemEnd, itemContainsDay, isTimed, layoutWeekAllDay, type AllDayItem, formatDate } from '../utils';

type Props = {
  items?: CalendarItem[];
  currentDate?: DateTime;
  onItemClick?: (item: CalendarItem) => void;
  onItemMove?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;
  onItemResize?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;
  onViewChange?: (date: DateTime) => void;
  onCellClick?: (dateTime: DateTime, clickPosition: { x: number; y: number }) => void;
  onDayClick?: (date: DateTime) => void;
};

let {
  items = [],
  currentDate = DateTime.now(),
  onItemClick,
  onItemMove,
  onItemResize,
  onViewChange,
  onCellClick,
  onDayClick,
}: Props = $props();

// セル展開状態（展開されている日を保持）
let expandedDay: DateTime | null = $state(null);
// 展開パネルの位置・サイズ（calendar-content基準の絶対座標）
let expandedPanelStyle: string = $state('');
// 展開パネルの位置計算が完了したかどうか（完了前はvisibility:hiddenで隠す）
let expandedPanelReady: boolean = $state(false);
// calendar-contentのDOM参照
let calendarContentEl: HTMLElement | null = $state(null);

// 展開パネルに表示するアイテム（隠れていたItemのみ）
// items や expandedDay が変わると自動再計算されるので、移動後も表示が更新される
let expandedHiddenItems = $derived.by(() => {
  if (!expandedDay) return [];
  // expandedDay の週を特定
  const targetWeek = weeks.find(week => week.some(d => d.hasSame(expandedDay!, 'day')));
  if (!targetWeek) return [];
  const dayIndex = targetWeek.findIndex(d => d.hasSame(expandedDay!, 'day'));
  // その日の複数日アイテム数（allday層で使用されるlane数）を計算
  const multiDayItemsInWeek = getMultiDayItemsForWeek(targetWeek);
  const multiDayItemsForThisDay = multiDayItemsInWeek.filter(
    ({ startIndex, span }) => dayIndex >= startIndex && dayIndex < startIndex + span
  );
  const maxLane = multiDayItemsForThisDay.length > 0
    ? Math.max(...multiDayItemsForThisDay.map(item => item.lane))
    : -1;
  const multiDayCountForThisDay = maxLane + 1;
  const remainingSlots = Math.max(0, MAX_ITEMS_PER_DAY - multiDayCountForThisDay);
  // expandedDay の単日アイテムのうち上限を超えた分を返す
  const singleDayItems = items.filter(item => itemContainsDay(item, expandedDay!) && !isMultiDayItem(item));
  return singleDayItems.slice(remainingSlots);
});

// DnD状態
let draggedItem = $state<CalendarItem | null>(null);
let dragOverDay = $state<DateTime | null>(null);
let dragOffsetDays = $state<number>(0); // ドラッグ開始時のアイテム内での相対位置（日数）
let dragGrabbedDate = $state<DateTime | null>(null); // ドラッグ開始時につかんだ日付

// リサイズ状態
let resizingItem = $state<CalendarItem | null>(null);
let resizeEdge = $state<'left' | 'right' | null>(null);
let resizeStartX = $state<number>(0);
let resizeStartDay = $state<DateTime | null>(null);

// 1日あたりの最大表示アイテム数（通常時）
// grid-cell の固定高さ = ITEMS_PER_DAY * ITEM_ROW_HEIGHT (px)
const MAX_ITEMS_PER_DAY = 6;
const ITEM_ROW_HEIGHT = 20; // px（single-day-item 1行の高さ）
const GRID_CELL_HEIGHT = MAX_ITEMS_PER_DAY * ITEM_ROW_HEIGHT; // 120px 固定

// 月の全ての日付を取得（前月・翌月の日も含む）
function getMonthDays(date: DateTime): DateTime[] {
  const startOfMonth = date.startOf('month');
  const endOfMonth = date.endOf('month');
  
  // 月初の曜日（週の何日目か）
  const startWeekday = startOfMonth.weekday; // 1=月曜、7=日曜
  
  // カレンダー表示開始日（月曜始まり）
  // 1日が月曜の場合は前月の最終週から開始
  const calendarStart = startOfMonth.minus({ days: startWeekday - 1 });
  
  // 月末の曜日
  const endWeekday = endOfMonth.weekday; // 1=月曜、7=日曜
  
  // カレンダー表示終了日（その週の日曜日）
  // まずその週の日曜日を求める（日単位で計算）
  const thisWeekSunday = endOfMonth.startOf('day').plus({ days: 7 - endWeekday });
  
  // 月末が日曜の場合は、翌週の日曜日まで
  const calendarEnd = endWeekday === 7 
    ? endOfMonth.startOf('day').plus({ days: 7 })
    : thisWeekSunday;
  
  // 日数を計算（開始日から終了日まで、両端を含む）
  const dayCount = Math.floor(calendarEnd.diff(calendarStart, 'days').days) + 1;
  
  const days: DateTime[] = [];
  for (let i = 0; i < dayCount; i++) {
    days.push(calendarStart.plus({ days: i }));
  }
  
  return days;
}

let monthDays = $derived(getMonthDays(currentDate));

// 週ごとにグループ化
let weeks = $derived.by(() => {
  const result: DateTime[][] = [];
  const weekCount = Math.ceil(monthDays.length / 7);
  for (let i = 0; i < weekCount; i++) {
    result.push(monthDays.slice(i * 7, (i + 1) * 7));
  }
  return result;
});

// 日をまたがるアイテムかどうかを判定
function isMultiDayItem(item: CalendarItem): boolean {
  const itemStart = getItemStart(item);
  const itemEnd = getItemEnd(item);
  if (!itemStart || !itemEnd) return false;
  return !itemStart.hasSame(itemEnd, 'day');
}

// 指定日のアイテムを取得（単日アイテムのみ）
function getItemsForDay(day: DateTime): CalendarItem[] {
  return items.filter(item => {
    return itemContainsDay(item, day);
  });
}


// アイテムの背景色を取得
function getItemBgColor(item: CalendarItem): string {
  if (item.style?.backgroundColor && typeof item.style.backgroundColor === 'string') {
    return item.style.backgroundColor;
  }
  if (item.type === 'task') {
    const task = item as any;
    if (task.status === 'todo') return '#90caf9';
    if (task.status === 'doing') return '#ffb74d';
    if (task.status === 'done') return '#a5d6a7';
  }
  return '#ce93d8';
}

// 前月・次月への移動
function prevMonth() {
  onViewChange?.(currentDate.minus({ months: 1 }));
}

function nextMonth() {
  onViewChange?.(currentDate.plus({ months: 1 }));
}

function goToToday() {
  onViewChange?.(DateTime.now());
}

// セルクリック
function handleCellClick(event: MouseEvent, day: DateTime) {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const clickPosition = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
  onCellClick?.(day.startOf('day'), clickPosition);
}

// 日付番号クリック
function handleDayNumberClick(event: MouseEvent, day: DateTime) {
  event.stopPropagation();
  onDayClick?.(day);
}

// セルが展開されているかチェック
function isExpanded(day: DateTime): boolean {
  return expandedDay !== null && expandedDay.hasSame(day, 'day');
}

// expanded-panelの位置をDOMから再計算してexpandedPanelStyleに反映
// expandedDayまたはitemsが変化したとき（alldayItem移動等）に呼ばれる
function recalculatePanelPosition() {
  if (!expandedDay || !calendarContentEl) return;
  const dateStr = expandedDay.toISODate();
  const cellEl = calendarContentEl.querySelector(`.grid-cell[data-date="${dateStr}"]`) as HTMLElement | null;
  if (!cellEl) return;

  const contentRect = calendarContentEl.getBoundingClientRect();
  const cellRect = cellEl.getBoundingClientRect();
  const scrollTop = calendarContentEl.scrollTop;

  // パネルのtop: 最後に表示されているsingle-day-itemのbottom基準
  // → アイテム間隔(gap: 2px)がそのまま続くように見せ、「セルが延長された」錯覚を与える
  // ただしgrid-cellはoverflow:hiddenのため、lastItemがcellの外にはみ出す場合は
  // cellRect.bottomでclampして正しい位置を計算する
  const dayItemEls = cellEl.querySelectorAll('.single-day-item');
  let top: number;
  if (dayItemEls.length > 0) {
    const lastItemRect = dayItemEls[dayItemEls.length - 1].getBoundingClientRect();
    const clampedBottom = Math.min(lastItemRect.bottom, cellRect.bottom);
    top = clampedBottom + 2 - contentRect.top + scrollTop;
  } else {
    // アイテムなし（all-dayアイテムのみでremainingSlots=0等）: chrome-cellの底辺を基準
    const chromeCellEl = cellEl.closest('.week-stack')?.querySelector('.week-chrome')?.children[
      Array.from(cellEl.parentElement?.children ?? []).indexOf(cellEl)
    ] as HTMLElement | undefined;
    if (chromeCellEl) {
      const chromeRect = chromeCellEl.getBoundingClientRect();
      top = chromeRect.bottom + 2 - contentRect.top + scrollTop;
    } else {
      top = cellRect.top + 32 - contentRect.top + scrollTop; // フォールバック
    }
  }

  const left = cellRect.left - contentRect.left;
  const width = cellRect.width;
  expandedPanelStyle = `left: ${left}px; top: ${top}px; width: ${width}px;`;
  expandedPanelReady = true;
}

// items の変化を $effect で確実に追跡するための derived
// $props() で受け取った items は $effect の依存追跡に乗らないケースがあるため、
// $derived 経由で参照することで確実に変化を検知する
let itemsVersion = $derived(items.length + items.reduce((acc, i) => acc + (getItemStart(i)?.toMillis() ?? 0) + (getItemEnd(i)?.toMillis() ?? 0), 0));

// items または expandedDay が変化したとき、パネル位置をDOMから再計算
// alldayItemの移動でレーン数が変化しgrid-cellの位置がずれても正しく追従する
$effect(() => {
  // $derived経由でitemsの変化を確実に追跡
  const _version = itemsVersion;
  const _expandedDay = expandedDay;
  if (!_expandedDay) {
    expandedPanelReady = false;
    return;
  }
  // 位置計算前は非表示にして、計算完了後に表示する（位置ずれ一瞬表示を防ぐ）
  expandedPanelReady = false;
  // DOM更新完了後に再計算
  // tick()でSvelte DOM更新後、ダブルrAFでCSSリフロー（--allday-height変化等）完了を確実に待つ
  tick().then(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => recalculatePanelPosition());
    });
  });
});

// day-expanderクリック: 展開パネルをトグル
// cellEl: クリックされたgrid-cell要素
// hiddenItems: 隠れていたItemのリスト（overflowCount分）
function toggleExpand(event: MouseEvent, day: DateTime) {
  event.stopPropagation();
  if (isExpanded(day)) {
    expandedDay = null;
    expandedPanelStyle = '';
    return;
  }
  // expandedDayをセットすると$effectが発火してrecalculatePanelPositionが呼ばれる
  expandedDay = day;
}

// 展開パネル外クリックで閉じる
function handlePanelOutsideClick(event: MouseEvent) {
  event.stopPropagation();
  expandedDay = null;
  expandedPanelStyle = '';
}

// 展開パネルを閉じる
function closeExpandedPanel() {
  expandedDay = null;
  expandedPanelStyle = '';
}

// リサイズ開始（複数日バーの左端/右端）
function handleResizeStart(event: MouseEvent, item: CalendarItem, edge: 'left' | 'right') {
  event.stopPropagation();
  event.preventDefault();
  
  // 親要素のdraggableを無効化
  const target = event.currentTarget as HTMLElement;
  const parentBar = target.closest('.allday-item') as HTMLElement;
  if (parentBar) {
    parentBar.setAttribute('draggable', 'false');
  }
  
  resizingItem = item;
  resizeEdge = edge;
  resizeStartX = event.clientX;
  
  // リサイズ開始時のアイテムの開始日を記録
  const itemStart = getItemStart(item);
  if (itemStart) {
    resizeStartDay = itemStart.startOf('day');
  }
  
  // グローバルマウスイベントをリッスン
  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
}

// リサイズ中
function handleResizeMove(event: MouseEvent) {
  if (!resizingItem || !resizeEdge || !resizeStartDay) return;
  
  const itemStart = getItemStart(resizingItem);
  const itemEnd = getItemEnd(resizingItem);
  if (!itemStart || !itemEnd) return;
  
  // セルの幅を取得（最初のgrid-cellを参照）
  const firstCell = document.querySelector('.grid-cell') as HTMLElement;
  if (!firstCell) return;
  const cellWidth = firstCell.getBoundingClientRect().width;
  
  // マウスの移動量から日数を計算
  const deltaX = event.clientX - resizeStartX;
  const deltaDays = Math.round(deltaX / cellWidth);
  
  let newStart = itemStart;
  let newEnd = itemEnd;
  
  if (resizeEdge === 'left') {
    // 左端をドラッグ → 開始日を変更
    newStart = resizeStartDay.plus({ days: deltaDays }).set({
      hour: itemStart.hour,
      minute: itemStart.minute
    });
    
    // 開始日が終了日を超えないようにする（最低1日）
    if (newStart >= itemEnd.startOf('day')) {
      newStart = itemEnd.startOf('day').minus({ days: 1 }).set({
        hour: itemStart.hour,
        minute: itemStart.minute
      });
    }
  } else {
    // 右端をドラッグ → 終了日を変更
    const originalEnd = itemEnd.startOf('day');
    newEnd = originalEnd.plus({ days: deltaDays }).set({
      hour: itemEnd.hour,
      minute: itemEnd.minute
    });
    
    // 終了日が開始日を下回らないようにする（最低1日）
    if (newEnd.startOf('day') <= itemStart.startOf('day')) {
      newEnd = itemStart.startOf('day').plus({ days: 1 }).set({
        hour: itemEnd.hour,
        minute: itemEnd.minute
      });
    }
  }
  
  // イベントを発火（リアルタイムプレビュー）
  onItemResize?.(resizingItem, newStart, newEnd);
}

// リサイズ終了
function handleResizeEnd() {
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
  
  // すべての複数日バーのdraggableを再有効化
  const allBars = document.querySelectorAll('.allday-item');
  allBars.forEach(el => {
    (el as HTMLElement).setAttribute('draggable', 'true');
  });
  
  resizingItem = null;
  resizeEdge = null;
  resizeStartX = 0;
  resizeStartDay = null;
}

// DnD: ドラッグ開始（連続バー用）
function handleDragStartContinuous(event: DragEvent, item: CalendarItem, weekDays: DateTime[]) {
  draggedItem = item;
  
  // ドラッグ中のアイテムを視覚的に示す
  const target = event.target as HTMLElement;
  if (target) {
    target.style.opacity = '0.5';
  }
  
  if (isMultiDayItem(item)) {
    const itemStart = getItemStart(item);
    if (!itemStart) return;
    
    // マウス位置からつかんだ日付を計算
    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const barWidth = rect.width;
    const cellWidth = barWidth / weekDays.length;
    
    // クリック位置がどのセル（日付）に対応するか計算
    const clickedCellIndex = Math.floor(mouseX / cellWidth);
    const weekStart = weekDays[0].startOf('day');
    
    // 週内でのアイテムの開始インデックスを計算
    let itemStartIndexInWeek = -1;
    weekDays.forEach((day, index) => {
      if (itemContainsDay(item, day) && itemStartIndexInWeek === -1) {
        itemStartIndexInWeek = index;
      }
    });
    
    // つかんだセルのインデックス（週内での実際の位置）
    const grabbedCellIndex = itemStartIndexInWeek + clickedCellIndex;
    const clickedDay = weekDays[grabbedCellIndex] || weekDays[0];
    
    // つかんだ日付を保存
    dragGrabbedDate = clickedDay.startOf('day');
    
    // アイテムの開始日からつかんだ日までの日数差を計算
    const offsetDays = Math.floor(clickedDay.startOf('day').diff(itemStart.startOf('day'), 'days').days);
    dragOffsetDays = offsetDays;
    
    console.debug(`[MonthView DnD Continuous] Grabbed multi-day item: itemStart=${itemStart.toISODate()}, grabbedDate=${clickedDay.toISODate()}, clickedCellIndex=${clickedCellIndex}, grabbedCellIndex=${grabbedCellIndex}, dragOffsetDays=${dragOffsetDays}`);
  } else {
    dragOffsetDays = 0;
    dragGrabbedDate = null;
  }
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
  }
}

// DnD: ドラッグ開始（allday-item バー用）
// バー内のマウスX座標から「バーの何日目をつかんだか」を計算し、dragOffsetDaysに設定する。
// 例: 水木金(span=3)のバーの「木」部分をつかんだ場合、offsetDays=1
// requestAnimationFrameでdraggedItemをセットしてゴースト画像生成後にopacity変更
function handleDragStart(event: DragEvent, item: CalendarItem, barStartIndex: number, weekDays: DateTime[]) {
  const target = event.target as HTMLElement;
  const barElement = target.closest('.allday-item') as HTMLElement;

  const itemStart = getItemStart(item);

  let newDragOffsetDays = 0;
  let newDragGrabbedDate: DateTime | null = null;

  if (itemStart && isMultiDayItem(item)) {
    // バー要素のX座標からつかんだ列（週内インデックス）を計算
    const barRect = barElement?.getBoundingClientRect();
    if (barRect && barRect.width > 0) {
      const displaySpan = parseInt(barElement?.style?.getPropertyValue('--span') ?? '1') || 1;
      const perCellWidth = barRect.width / displaySpan;
      const mouseXInBar = event.clientX - barRect.left;
      const grabCellInBar = Math.floor(mouseXInBar / perCellWidth);
      const clampedGrabCellInBar = Math.max(0, Math.min(grabCellInBar, displaySpan - 1));
      const weekGrabIndex = barStartIndex + clampedGrabCellInBar;
      const grabbedDay = weekDays[weekGrabIndex] ?? weekDays[barStartIndex];
      newDragOffsetDays = Math.floor(grabbedDay.startOf('day').diff(itemStart.startOf('day'), 'days').days);
      newDragGrabbedDate = grabbedDay.startOf('day');
      console.debug(`[MonthView DnD] barStartIndex=${barStartIndex}, displaySpan=${displaySpan}, grabCellInBar=${clampedGrabCellInBar}, grabbedDay=${grabbedDay.toISODate()}, dragOffsetDays=${newDragOffsetDays}`);
    } else {
      newDragGrabbedDate = itemStart.startOf('day');
    }
  }

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
  }

  // requestAnimationFrameでゴースト画像生成後にdraggedItemをセット（opacityを変える）
  requestAnimationFrame(() => {
    draggedItem = item;
    dragOffsetDays = newDragOffsetDays;
    dragGrabbedDate = newDragGrabbedDate;
    if (barElement) {
      barElement.style.opacity = '0.5';
    }
  });
}

// DnD: ドラッグ開始（単日アイテム用 - オフセットなし）
// requestAnimationFrameでdraggedItemをセットすることで、ブラウザがゴースト画像を
// 生成した後にdisplay:noneが適用され、DnDが正常に機能する
function handleSingleDayDragStart(event: DragEvent, item: CalendarItem) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
  }
  requestAnimationFrame(() => {
    draggedItem = item;
    dragOffsetDays = 0;
    dragGrabbedDate = null;
  });
}

// DnD: ドラッグ終了
function handleDragEnd(event: DragEvent) {
  // ドラッグ中のアイテムの透明度を戻す
  const target = event.target as HTMLElement;
  const barElement = target.closest('.allday-item') as HTMLElement;
  if (barElement) {
    barElement.style.opacity = '1';
  }
  
  draggedItem = null;
  dragOverDay = null;
  dragGrabbedDate = null;
}

// DnD: ドラッグオーバー
function handleDragOver(event: DragEvent, day: DateTime) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dragOverDay = day;
}

// DnD: ドロップ
function handleDrop(event: DragEvent, day: DateTime) {
  event.preventDefault();
  
  if (!draggedItem) return;
  
  const itemStart = getItemStart(draggedItem);
  const itemEnd = getItemEnd(draggedItem);
  if (!itemStart || !itemEnd) return;
  
  // 単日アイテム: 時刻はそのまま、日付だけ変更
  if (!isMultiDayItem(draggedItem)) {
    const newStart = day.set({
      hour: itemStart.hour,
      minute: itemStart.minute,
      second: 0,
      millisecond: 0
    });
    const newEnd = day.set({
      hour: itemEnd.hour,
      minute: itemEnd.minute,
      second: 0,
      millisecond: 0
    });
    
    onItemMove?.(draggedItem, newStart, newEnd);
  } else {
    // 複数日アイテム: つかんだ位置を考慮して日数を保持
    const duration = itemEnd.diff(itemStart, 'days').days;
    // ドロップした日からオフセット分を引いた日を新しい開始日とする
    const newStart = day.startOf('day').minus({ days: dragOffsetDays });
    const newEnd = newStart.plus({ days: duration });
    
    console.debug(`[MonthView DnD Drop] Multi-day item: dropDay=${day.toISODate()}, dragOffsetDays=${dragOffsetDays}, duration=${duration}, newStart=${newStart.toISODate()}, newEnd=${newEnd.toISODate()}`);
    
    onItemMove?.(draggedItem, newStart, newEnd);
  }
  
  draggedItem = null;
  dragOverDay = null;
  dragOffsetDays = 0;
}

// プレビュー用: ドラッグ中のアイテムが指定週でどこに表示されるか計算
function getPreviewStartIndex(week: DateTime[], item: CalendarItem, dragOverDay: DateTime | null): number {
  if (!dragOverDay || !dragGrabbedDate) return -1;
  
  const itemStart = getItemStart(item);
  const itemEnd = getItemEnd(item);
  if (!itemStart || !itemEnd) return -1;
  
  // ドロップしたときの新しい開始日を計算
  const newStart = dragOverDay.startOf('day').minus({ days: dragOffsetDays });
  
  // 週内でのインデックスを計算
  const weekStart = week[0].startOf('day');
  const weekEnd = week[week.length - 1].endOf('day');
  
  if (newStart > weekEnd) return -1;
  
  let startIndex = -1;
  week.forEach((day, index) => {
    if (day.hasSame(newStart, 'day') || (newStart < day && startIndex === -1)) {
      if (startIndex === -1) {
        startIndex = Math.max(0, index - (newStart < day ? 1 : 0));
      }
    }
  });
  
  // 週の開始より前に開始する場合は0
  if (newStart < weekStart) {
    startIndex = 0;
  }
  
  return startIndex >= 0 ? startIndex : 0;
}

// プレビュー用: ドラッグ中のアイテムの表示スパンを計算
function getPreviewSpan(week: DateTime[], item: CalendarItem, dragOverDay: DateTime | null): number {
  if (!dragOverDay || !dragGrabbedDate) return 0;
  
  const itemStart = getItemStart(item);
  const itemEnd = getItemEnd(item);
  if (!itemStart || !itemEnd) return 0;
  
  // ドロップしたときの新しい開始日と終了日を計算
  const newStart = dragOverDay.startOf('day').minus({ days: dragOffsetDays });
  const duration = itemEnd.diff(itemStart, 'days').days;
  const newEnd = newStart.plus({ days: duration });
  
  const weekStart = week[0].startOf('day');
  const weekEnd = week[week.length - 1].endOf('day');
  
  // この週に含まれる部分を計算
  const displayStart = newStart < weekStart ? weekStart : newStart;
  const displayEnd = newEnd > weekEnd ? weekEnd : newEnd;
  
  if (displayStart > weekEnd || displayEnd < weekStart) return 0;
  
  // スパンを計算
  let span = 0;
  week.forEach((day) => {
    if (day >= displayStart && day <= displayEnd) {
      span++;
    }
  });
  
  return span;
}

// 週内の複数日アイテムを取得（レーン割り当て付き）
// Phase 1で実装したlayoutWeekAllDayアルゴリズムを使用
function getMultiDayItemsForWeek(week: DateTime[]): Array<{item: CalendarItem, startIndex: number, span: number, lane: number}> {
  if (week.length === 0) return [];
  
  // CalendarItemをAllDayItem形式に変換
  // layoutWeekAllDayのdateRange.endはexclusive（終了日の翌日）
  // timed itemのendはinclusive時刻（例: 17:00）なので、日付部分を+1日してexclusiveに変換する
  // allday itemのendはdateRangeのexclusive endをそのまま使用する
  const allDayItems: AllDayItem[] = items
    .filter(item => isMultiDayItem(item))
    .map(item => {
      const start = getItemStart(item);
      const end = getItemEnd(item);
      if (!start || !end) return null;

      let endDateStr: string;
      if (item.dateRange) {
        // AllDay item: dateRange.end は既にexclusive
        endDateStr = formatDate(end);
      } else {
        // Timed item: end は "2/23 17:00" のような時刻付き → 翌日のstartOfDayをexclusiveとする
        // "2/21 09:00" 〜 "2/23 17:00" のアイテムは 2/21, 2/22, 2/23 の3日間を占める
        // exclusive endは 2/24
        endDateStr = formatDate(end.plus({ days: 1 }).startOf('day'));
      }

      return {
        id: item.id,
        dateRange: {
          start: formatDate(start),
          end: endDateStr,
        },
      };
    })
    .filter((item): item is AllDayItem => item !== null && item.dateRange.start !== ''); // 有効な日付のみ
  
  // 週の開始日と終了日を取得
  const weekStart = formatDate(week[0]);
  const weekEnd = formatDate(week[6].plus({ days: 1 })); // exclusive end
  
  // layoutWeekAllDayアルゴリズムを呼び出し
  const layout = layoutWeekAllDay({
    weekStart,
    weekEnd,
    items: allDayItems,
  });
  
  // 結果を元のCalendarItemと紐付け
  return layout.placements.map(placement => {
    const item = items.find(i => i.id === placement.id)!;
    return {
      item,
      startIndex: placement.startIndex,
      span: placement.span,
      lane: placement.lane,
    };
  });
}
</script>

<div class="month-view">
  <!-- ヘッダー -->
  <div class="month-header">
    <div class="header-left">
      <button class="nav-button" onclick={prevMonth}>&lt;</button>
      <h2 class="month-title">{currentDate.toFormat('yyyy年M月')}</h2>
      <button class="nav-button" onclick={nextMonth}>&gt;</button>
    </div>
    <button class="today-button" onclick={goToToday}>Today</button>
  </div>

  <!-- カレンダーコンテンツ（スクロール可能） -->
  <div class="calendar-content" class:dragging-active={draggedItem !== null} bind:this={calendarContentEl}>

    <!-- 曜日ヘッダー（固定列グリッド） -->
    <div class="weekday-header">
      <div class="weekday">月</div>
      <div class="weekday">火</div>
      <div class="weekday">水</div>
      <div class="weekday">木</div>
      <div class="weekday">金</div>
      <div class="weekday">土</div>
      <div class="weekday">日</div>
    </div>

    <!-- 展開パネル（calendar-content基準で絶対配置・最前面） -->
    <!-- 隠れていたItemのみ表示。grid-cellの真下にピッタリ配置してセル延長に見せる -->
    {#if expandedDay !== null}
      <!-- オーバーレイ背景（クリックで閉じる） -->
      <div class="expanded-panel-overlay" onclick={handlePanelOutsideClick}></div>
      <!-- 展開パネル本体（grid-cellの真下にピッタリ） -->
      <!-- expandedPanelReadyがtrueになるまでvisibility:hiddenで隠す（位置ずれ一瞬表示を防ぐ） -->
      <div class="expanded-panel" style="{expandedPanelStyle}; visibility: {expandedPanelReady ? 'visible' : 'hidden'}">
        <!-- 隠れていたItemのみ表示 -->
        {#each expandedHiddenItems as item (item.id)}
          <div
            class="month-item single-day-item"
            class:multi-day-expanded={isMultiDayItem(item)}
            class:dragging={draggedItem === item}
            draggable="true"
            ondragstart={(e) => handleSingleDayDragStart(e, item)}
            ondragend={handleDragEnd}
            onclick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
          >
            <span class="item-dot" style="background-color: {getItemBgColor(item)};"></span>
            <span class="item-time">{isTimed(item) && getItemStart(item) ? formatTime(getItemStart(item)!) : ''}</span>
            <span class="item-title">{item.title}</span>
          </div>
        {/each}
        <!-- 閉じるボタン（▲）: パネル底端に配置 -->
        <button
          class="day-expander expanded-panel-close"
          onclick={(e) => { e.stopPropagation(); closeExpandedPanel(); }}
          title="折りたたむ"
          aria-label="折りたたむ"
        >
          <span class="expander-arrow">▲</span>
        </button>
      </div>
    {/if}

    <!-- カレンダーボディ -->
    <div class="calendar-body">
      {#each weeks as week, weekIndex}
        {@const multiDayItemsInWeek = getMultiDayItemsForWeek(week)}
        {@const laneCount = multiDayItemsInWeek.length > 0 ? Math.max(...multiDayItemsInWeek.map(item => item.lane)) + 1 : 0}
        {@const alldayHeight = laneCount * 24}

        <!-- Week: single CSS Grid row containing 3-layer stack -->
        <div class="week-stack" style="--allday-height: {alldayHeight}px; --lane-count: {laneCount}; --grid-cell-height: {GRID_CELL_HEIGHT}px">

          <!-- Layer 1: Week Chrome (date numbers) - grid of 7 -->
          <div class="week-chrome">
            {#each week as day}
              {@const isToday = day.hasSame(DateTime.now(), 'day')}
              {@const isCurrentMonth = day.hasSame(currentDate, 'month')}
              <div
                class="chrome-cell"
                class:today={isToday}
                class:other-month={!isCurrentMonth}
                class:drag-over={dragOverDay?.hasSame(day, 'day')}
                ondragover={(e) => handleDragOver(e, day)}
                ondrop={(e) => handleDrop(e, day)}
              >
                <div
                  class="day-number"
                  onclick={(e) => handleDayNumberClick(e, day)}
                >
                  {day.day}
                </div>
              </div>
            {/each}
          </div>

          <!-- Layer 2: All-Day Canvas (multi-day bars) - absolute positioned inside week-allday -->
          <!-- week-alldayは完全透明。縦罫線はallday-grid-linesで描画 -->
          <div class="week-allday">
            <!-- 縦罫線用の透明グリッド（week-gridと同じ列幅） -->
            <!-- allday-grid-line-cellがDnDドロップ先を担当（allday-item不在セルへのDnD対応） -->
            <div class="allday-grid-lines">
              {#each week as _, i}
                <div
                  class="allday-grid-line-cell"
                  class:first={i === 0}
                  class:drag-over={dragOverDay?.hasSame(week[i], 'day')}
                  ondragover={(e) => handleDragOver(e, week[i])}
                  ondrop={(e) => handleDrop(e, week[i])}
                ></div>
              {/each}
            </div>
            {#each multiDayItemsInWeek as {item, startIndex, span, lane}}
              <div
                class="allday-item"
                class:dragging={draggedItem === item}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, item, startIndex, week)}
                ondragend={handleDragEnd}
                onclick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                style="
                  --lane: {lane};
                  --start-index: {startIndex};
                  --span: {span};
                  background-color: {getItemBgColor(item)};
                "
              >
                <!-- 左端リサイズハンドル -->
                <div
                  class="resize-handle resize-handle-left"
                  onmousedown={(e) => handleResizeStart(e, item, 'left')}
                ></div>
                <div class="bar-content">{item.title}</div>
                <!-- 右端リサイズハンドル -->
                <div
                  class="resize-handle resize-handle-right"
                  onmousedown={(e) => handleResizeStart(e, item, 'right')}
                ></div>
              </div>
            {/each}
          </div>

          <!-- Layer 3: Day Grid (single-day items) - grid of 7 -->
          <div class="week-grid">
            {#each week as day}
              {@const singleDayItems = getItemsForDay(day).filter(item => !isMultiDayItem(item))}
              {@const dayIndex = week.indexOf(day)}
              {@const multiDayItemsForThisDay = multiDayItemsInWeek.filter(({startIndex, span}) => dayIndex >= startIndex && dayIndex < startIndex + span)}
              {@const maxLane = multiDayItemsForThisDay.length > 0 ? Math.max(...multiDayItemsForThisDay.map(item => item.lane)) : -1}
              {@const multiDayCountForThisDay = maxLane + 1}
              {@const remainingSlots = Math.max(0, MAX_ITEMS_PER_DAY - multiDayCountForThisDay)}
              {@const displayedSingleDayCount = Math.min(remainingSlots, singleDayItems.length)}
              {@const totalDisplayedCount = displayedSingleDayCount + multiDayCountForThisDay}
              {@const totalItemsCount = singleDayItems.length + multiDayCountForThisDay}
              {@const overflowCount = totalItemsCount - totalDisplayedCount}
              {@const expanded = isExpanded(day)}
              <!-- 隠れているItem: 表示上限を超えた単日Item（複数日Itemはallday層で表示済みなので含めない） -->
              {@const hiddenItems = singleDayItems.slice(remainingSlots)}

              <div
                class="grid-cell"
                data-date={day.toISODate()}
                class:drag-over={dragOverDay?.hasSame(day, 'day')}
                onclick={(e) => handleCellClick(e, day)}
                ondragover={(e) => handleDragOver(e, day)}
                ondrop={(e) => handleDrop(e, day)}
              >
                <!-- 通常時: 単日アイテム表示エリア（上限まで） -->
                <div class="day-items">
                  {#each singleDayItems.slice(0, remainingSlots) as item (item.id)}
                    <div
                      class="month-item single-day-item"
                      class:dragging={draggedItem === item}
                      draggable="true"
                      ondragstart={(e) => handleSingleDayDragStart(e, item)}
                      ondragend={handleDragEnd}
                      onclick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                    >
                      <span class="item-dot" style="background-color: {getItemBgColor(item)};"></span>
                      <span class="item-time">{isTimed(item) && getItemStart(item) ? formatTime(getItemStart(item)!) : ''}</span>
                      <span class="item-title">{item.title}</span>
                    </div>
                  {/each}
                </div>

                <!-- day-expanderボタン(open用): オーバーフロー時に下端に表示。展開中は非表示 -->
                {#if overflowCount > 0 && !expanded}
                  <button
                    class="day-expander"
                    onclick={(e) => { toggleExpand(e, day); }}
                    title={`さらに${overflowCount}件`}
                    aria-label={`さらに${overflowCount}件表示`}
                  >
                    <span class="expander-arrow">▼</span>
                  </button>
                {/if}
              </div>
            {/each}
          </div>

        </div>
      {/each}
    </div>

  </div>
  
</div>

<style>
  .month-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: white;
    overflow: hidden; /* スクロールは.calendar-contentで処理 */
  }

  .calendar-content {
    flex: 1;
    overflow-y: auto; /* 縦スクロール可能 */
    min-height: 0; /* flexアイテムのデフォルトmin-heightを上書き */
    position: relative;
  }

  /* ドラッグ中: レイヤー構造を明確に */
  
  /* ドラッグ中のallday-itemを前面に */
  .calendar-content.dragging-active .allday-item.dragging {
    z-index: 100;
  }
  
  /* ドラッグ中でないアイテムのpointer-eventsを無効化してDnDのヒットテストを通過させる */
  .calendar-content.dragging-active .allday-item:not(.dragging) {
    pointer-events: none;
  }
  
  .calendar-content.dragging-active .month-item:not(.dragging) {
    pointer-events: none;
  }

  /* ドラッグ中はオーバーレイを透過させてドロップ先のcellにイベントを届ける */
  .calendar-content.dragging-active .expanded-panel-overlay {
    pointer-events: none;
  }

  /* ドラッグ中はexpanded-panel自体もpointer-events:noneにしてドロップ先cellにイベントを届ける */
  /* ドラッグ中のitem(.dragging)はautoのまま維持 */
  .calendar-content.dragging-active .expanded-panel {
    pointer-events: none;
  }
  .calendar-content.dragging-active .expanded-panel .month-item.dragging {
    pointer-events: auto;
  }

  .month-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .month-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }

  .nav-button {
    background: none;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 16px;
  }

  .nav-button:hover {
    background-color: #f5f5f5;
  }

  .today-button {
    background-color: #2196f3;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .today-button:hover {
    background-color: #1976d2;
  }

  /* ===== カレンダーグリッド（CSS Grid統一） ===== */

  /*
   * 列ずれ防止の核心:
   * weekday-header / week-chrome / week-allday / week-grid の全てが
   * 同一の --col-widths を参照し、列幅を完全に同期する。
   * <table> は列幅の計算が各行独立なので廃止した。
   */

  /* 7列グリッドのテンプレート（共通定義） */
  .weekday-header,
  .week-chrome,
  .week-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }

  /* 曜日ヘッダー */
  .weekday-header {
    border-bottom: 1px solid #e0e0e0;
  }

  .weekday {
    padding: 12px;
    text-align: center;
    font-weight: 600;
    font-size: 14px;
    color: #666;
    /* 縦の罫線のみ（左） */
    border-left: 1px solid #e0e0e0;
    box-sizing: border-box;
  }

  .weekday:first-child {
    border-left: none;
  }

  /* カレンダーボディ：週ごとのブロック */
  .calendar-body {
    display: flex;
    flex-direction: column;
  }

  /* ===== Week Stack: 3層を縦に積む ===== */
  /*
   * week-stackが1つのカレンダー行（週）を表す。
   * 外枠の罫線はweek-stackに持たせ、内部の各層は罫線を持たない。
   * - 左右は縦線（各セルの左border）
   * - 上下は横線（week-stackのtop borderのみ、bottomは次のweek-stackのtopで共有）
   */
  .week-stack {
    position: relative;
    display: flex;
    flex-direction: column;
    border-top: 1px solid #e0e0e0;
  }

  .calendar-body .week-stack:last-child {
    border-bottom: 1px solid #e0e0e0;
  }

  /* ===== Layer 1: Week Chrome (日付番号) ===== */
  /* chrome層は日付番号のみ表示。背景・罫線はgrid層が担当 */
  .week-chrome {
    position: relative;
    z-index: 3;
    /* pointer-eventsはauto: chrome-cellがDnDイベント(dragover/drop)を受け取る */
  }

  .chrome-cell {
    /* 縦の罫線のみ（左） */
    border-left: 1px solid #e0e0e0;
    padding: 4px;
    min-height: 30px;
    box-sizing: border-box;
    position: relative;
  }

  .chrome-cell:first-child {
    border-left: none;
  }

  .chrome-cell.today {
    background-color: #e3f2fd;
  }

  .chrome-cell.drag-over {
    background-color: rgba(33, 150, 243, 0.15);
  }

  .chrome-cell.other-month {
    background-color: #f9f9f9;
  }

  .chrome-cell .day-number {
    pointer-events: auto;
    cursor: pointer;
    display: inline-block;
    padding: 4px 8px;
    border-radius: 50%;
    font-weight: 500;
    font-size: 14px;
  }

  .chrome-cell .day-number:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .chrome-cell.today .day-number {
    background-color: #2196f3;
    color: white;
  }

  .chrome-cell.other-month .day-number {
    color: #999;
  }

  /* ===== Layer 2: All-Day Canvas (複数日バー) ===== */
  /*
   * week-alldayは完全透明にして罫線はallday-grid-linesで描画。
   * allday-itemは週全体を基準に絶対配置する。
   * 高さは laneCount * 24px。laneが0なら高さ0で消える。
   */
  .week-allday {
    position: relative;
    z-index: 2;
    height: var(--allday-height, 0px);
    width: 100%;
    overflow: visible;
    pointer-events: none; /* 子要素(allday-item)のみイベントを受ける */
    background: transparent;
  }

  /* allday領域の縦罫線（week-gridと同じ列幅に合わせた透明グリッド） */
  .allday-grid-lines {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .allday-grid-line-cell {
    border-left: 1px solid #e0e0e0;
    height: 100%;
    box-sizing: border-box;
    pointer-events: auto; /* allday領域の空白セルへのDnDドロップを受け取る */
  }

  .allday-grid-line-cell.first {
    border-left: none;
  }

  .allday-grid-line-cell.drag-over {
    background-color: rgba(33, 150, 243, 0.1);
  }

  .allday-item {
    position: absolute;
    /* topはlane番号 × 1行高さ(24px) */
    top: calc(var(--lane) * 24px);
    /* leftは開始インデックス × セル幅(1/7) */
    left: calc(var(--start-index) / 7 * 100%);
    /* widthはspan × セル幅(1/7) */
    width: calc(var(--span) / 7 * 100%);
    height: 22px;
    padding: 0;
    font-size: 11px;
    border-radius: 3px;
    color: #333;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    cursor: move;
    display: flex;
    align-items: center;
    pointer-events: auto;
    box-sizing: border-box;
  }

  .allday-item:hover {
    opacity: 0.8;
  }

  .allday-item:active {
    cursor: grabbing;
  }

  .allday-item.dragging {
    opacity: 0.5;
  }

  /* リサイズハンドル */
  .resize-handle {
    position: absolute;
    top: 0;
    width: 8px;
    height: 100%;
    cursor: col-resize;
    z-index: 10;
    background-color: transparent;
    transition: background-color 0.15s;
    flex-shrink: 0;
  }

  .resize-handle:hover {
    background-color: rgba(0, 0, 0, 0.2);
  }

  .resize-handle-left {
    left: 0;
    border-radius: 3px 0 0 3px;
  }

  .resize-handle-right {
    right: 0;
    border-radius: 0 3px 3px 0;
  }

  .bar-content {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
    padding: 2px 6px;
    display: flex;
    align-items: center;
  }

  /* ===== Layer 3: Day Grid (単日アイテム) ===== */
  .week-grid {
    position: relative;
    z-index: 1;
  }

  .grid-cell {
    /* 縦の罫線のみ（左）。横線はweek-stackのborder-topで担当 */
    border-left: 1px solid #e0e0e0;
    padding: 4px;
    /* 全週で同じ高さに固定（Item 6個分 = 120px） */
    height: var(--grid-cell-height, 120px);
    overflow: hidden;
    cursor: pointer;
    position: relative;
    box-sizing: border-box;
  }

  .grid-cell:first-child {
    border-left: none;
  }

  .grid-cell:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }

  .grid-cell.drag-over {
    background-color: rgba(33, 150, 243, 0.1);
  }

  .day-items {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
    flex: 1;
    position: relative;
  }

  /* ===== day-expanderボタン ===== */
  /* grid-cellの下端に絶対配置。オーバーフロー時に表示される小さなボタン */
  .day-expander {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 8px;
    background-color: #f0f0f0;
    border: none;
    padding: 0;
    cursor: s-resize;
    z-index: 51;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    transition: background-color 0.15s;
    border-radius: 0 0 2px 2px;
    overflow: visible;
  }

  .day-expander:hover {
    background-color: #bdbdbd;
  }

  .expander-arrow {
    font-size: 7px;
    line-height: 1;
    color: #666;
    position: absolute;
    right: 3px;
    bottom: 0;
    pointer-events: none;
    user-select: none;
  }

  /* ===== 展開パネル（calendar-content基準の絶対配置） ===== */
  /*
   * grid-cellの真下にピッタリ配置し、「日付セルが延長された」ように見せる。
   * - 背景・罫線・パディングはgrid-cellに完全一致
   * - box-shadowは左・右・下のみ（上はgrid-cellと繋がるので不要）
   * - border-topはなし（grid-cellの下端と隙間なく繋がる）
   */
  .expanded-panel-overlay {
    position: absolute;
    inset: 0;
    z-index: 99;
    cursor: default;
  }

  .expanded-panel {
    position: absolute;
    z-index: 100;
    background-color: white;
    /* grid-cellと同じ罫線（左・右・下のみ。上はgrid-cellと繋がる） */
    border-left: 1px solid #e0e0e0;
    border-right: 1px solid #e0e0e0;
    border-bottom: 1px solid #e0e0e0;
    border-top: none;
    /* 上部のpadding/margin/borderを0にして最後のitemと隙間なく繋げる */
    padding: 0 4px 0 4px;
    margin-top: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    /* grid-cellと同じスタイル: 影なし */
    box-shadow: none;
    box-sizing: border-box;
  }

  /* 展開パネル内の閉じるボタン（パネル底部に配置） */
  .expanded-panel-close {
    position: static;
    width: 100%;
    margin-top: 2px;
    border-radius: 0 0 2px 2px;
    cursor: n-resize;
    flex-shrink: 0;
  }

  .expanded-panel-close:hover {
    background-color: #bdbdbd;
  }

  .month-item {
    cursor: move;
    border-radius: 3px;
    transition: background-color 0.15s;
  }

  .month-item:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .month-item:active {
    cursor: grabbing;
  }

  /* ドラッグ中の単日Itemを半透明にして「移動中」を示す（allday-itemと同様） */
  .single-day-item.dragging {
    opacity: 0.4;
  }


  .single-day-item {
    padding: 2px 4px;
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
  }

  .multi-day-item-expanded {
    padding: 2px 4px;
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
    background-color: rgba(0, 0, 0, 0.02); /* 複数日アイテムを区別 */
    border-radius: 3px;
  }

  .item-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .item-time {
    flex-shrink: 0;
    font-weight: 500;
    color: #555;
  }

  .item-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #333;
  }

  /* .more-items / .hide-items は cell-resizer に統合したため削除 */
</style>
