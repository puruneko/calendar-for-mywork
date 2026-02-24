<script lang="ts">
/**
 * WeekView - 1週間表示カレンダーコンポーネント
 * 
 * 縦軸: 時間（00:00 - 24:00）
 * 横軸: 曜日（月曜日 - 日曜日）
 */

import { DateTime } from 'luxon';
import type { CalendarItem } from '../models';
import { CalendarStorage } from '../storage';
import { DEFAULT_WEEK_SETTINGS } from '../models/settings';
import { getWeekDays, formatTime, formatWeekday, formatDate, generateTimeSlots, snapToMinorTick, getItemStart, getItemEnd, itemContainsDay, isTimed, isAllDay, isDeadlineTimed, isDeadlineDay, layoutWeekAllDay, type AllDayItem } from '../utils';

// Z-index層管理は CSS変数で集中管理（demo/App.svelte の :global(:root) に定義）
// このコメントは削除せず、開発者への注意喚起として残す

interface Props {
  /** 表示するアイテムリスト */
  items: CalendarItem[];

  /** 表示基準日（週の決定に使用） */
  currentDate: DateTime;

  /** CalendarStorage インスタンス。省略時はデフォルト設定で動作 */
  storage?: CalendarStorage;

  /** アイテムクリック時のイベントハンドラ */
  onItemClick?: (item: CalendarItem) => void;

  /** アイテム移動時のイベントハンドラ */
  onItemMove?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;

  /** アイテムリサイズ時のイベントハンドラ */
  onItemResize?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;

  /** 表示週変更時のイベントハンドラ */
  onViewChange?: (newDate: DateTime) => void;

  /** セルクリック時のイベントハンドラ */
  onCellClick?: (dateTime: DateTime, clickPosition: { x: number; y: number }) => void;
}

let {
  items = [],
  currentDate = DateTime.now(),
  storage,
  onItemClick,
  onItemMove,
  onItemResize,
  onViewChange,
  onCellClick,
}: Props = $props();

// ===== storage から設定値を取得（storage が未指定の場合はデフォルト値を使用）=====
let ws = $derived(storage?.weekSettings ?? DEFAULT_WEEK_SETTINGS);
let startHour = $derived(ws.startHour);
let endHour = $derived(ws.endHour);
let minorTick = $derived(ws.minorTick);
let majorTick = $derived(ws.majorTick);
let dayChangeThreshold = $derived(ws.dayChangeThreshold);
let showWeekend = $derived(ws.showWeekend);
let showAllDay = $derived(ws.showAllDay);
let defaultColorOpacity = $derived(ws.defaultColorOpacity);
let weekStartsOn = $derived(ws.weekStartsOn);
let itemRightMargin = $derived(ws.itemRightMargin);
let showParent = $derived(ws.showParent);
let parentDisplayIndex = $derived(ws.parentDisplayIndex);
const tickInterval = 60; // 後方互換性のため残す（内部用）

// 週の日付リストを取得（土日表示の設定を反映）
let weekDays = $derived.by(() => {
  const allDays = getWeekDays(currentDate, weekStartsOn);
  if (showWeekend) {
    return allDays;
  } else {
    // 平日のみ（月〜金）
    return allDays.filter(day => day.weekday >= 1 && day.weekday <= 5);
  }
});

// 時間スロットを生成（majorTick優先、tickIntervalは後方互換性のため）
let timeSlots = $derived(generateTimeSlots(startHour, endHour, majorTick));

// minorTickグリッド線を生成
let minorGridLines = $derived.by(() => {
  const lines: number[] = [];
  const totalMinutes = (endHour - startHour) * 60;
  for (let minutes = 0; minutes <= totalMinutes; minutes += minorTick) {
    lines.push(minutes);
  }
  return lines;
});

// 現在時刻線の位置を計算
let currentTimeLine = $derived.by(() => {
  const now = DateTime.now();
  const todayStart = now.startOf('day').set({ hour: startHour });
  const minutesFromStart = now.diff(todayStart, 'minutes').minutes;
  
  // 表示範囲外の場合はnullを返す
  const totalMinutes = (endHour - startHour) * 60;
  if (minutesFromStart < 0 || minutesFromStart > totalMinutes) {
    return null;
  }
  
  return {
    position: minutesFromStart,
    today: now.startOf('day')
  };
});

// ===== allday レーンの計算 =====

const ALLDAY_ITEM_HEIGHT = 24; // px（1レーンの高さ）
const ALLDAY_PADDING = 4;      // px（レーン上下の余白）

// allday 対象アイテム: isAllDay・isDeadlineDay アイテム、または複数日にまたがる timed アイテム
let alldayItems = $derived.by((): AllDayItem[] => {
  if (!showAllDay) return [];
  const filtered = items
    .filter(item => {
      const s = getItemStart(item);
      const e = getItemEnd(item, 'local', minorTick);
      if (!s || !e) return false;
      // allday アイテム
      if (isAllDay(item)) return true;
      // 日単位 Deadline
      if (isDeadlineDay(item)) return true;
      // 複数日またがり timed アイテム
      if (isTimed(item) && !s.hasSame(e.minus({ seconds: 1 }), 'day')) return true;
      return false;
    })
    // 日単位 Deadline を先頭に優先ソート
    .sort((a, b) => {
      const aDeadline = isDeadlineDay(a) ? 0 : 1;
      const bDeadline = isDeadlineDay(b) ? 0 : 1;
      return aDeadline - bDeadline;
    });

  return filtered.map(item => {
    const s = getItemStart(item)!;
    const e = getItemEnd(item, 'local', minorTick)!;
    let endDateStr: string;
    if (isAllDay(item) || isDeadlineDay(item)) {
      endDateStr = formatDate(e);
    } else {
      // timed の複数日アイテム: end は inclusive 時刻なので翌日 startOfDay を exclusive end とする
      endDateStr = formatDate(e.plus({ days: 1 }).startOf('day'));
    }
    return {
      id: item.id,
      dateRange: {
        start: formatDate(s),
        endExclusive: endDateStr,
      },
    };
  });
});

// allday レーンレイアウトを計算
let alldayLayout = $derived.by(() => {
  if (weekDays.length === 0) return { laneCount: 0, placements: [] };
  const weekStart = formatDate(weekDays[0]);
  const weekEnd = formatDate(weekDays[weekDays.length - 1].plus({ days: 1 }));
  return layoutWeekAllDay({ weekStart, weekEnd, items: alldayItems });
});

// allday レーン数と高さ（px）
let alldayLaneCount = $derived(alldayLayout.laneCount);
let alldayHeight = $derived(
  alldayLaneCount > 0
    ? alldayLaneCount * ALLDAY_ITEM_HEIGHT + ALLDAY_PADDING * 2
    : 0
);

// allday-item の配置情報（CalendarItem と placement を結合）
type PositionedAlldayItem = {
  item: CalendarItem;
  lane: number;
  startIndex: number;
  span: number;
  top: number;   // px
  left: string;  // CSS % 文字列
  width: string; // CSS % 文字列
};

let alldayPositioned = $derived.by((): PositionedAlldayItem[] => {
  const cols = weekDays.length;
  return alldayLayout.placements.map(p => {
    const item = items.find(i => i.id === p.id)!;
    return {
      item,
      lane: p.lane,
      startIndex: p.startIndex,
      span: p.span,
      top: ALLDAY_PADDING + p.lane * ALLDAY_ITEM_HEIGHT,
      left: `calc(${p.startIndex} / ${cols} * 100% + 4px)`,
      width: `calc(${p.span} / ${cols} * 100% - 8px)`,
    };
  });
});

// ===== 週全体レイアウトの一括計算 =====

/**
 * 週全体に表示するアイテムのレイアウトを一括計算する。
 * 各アイテムの top/height/left/width/styleStr を確定し、
 * dayIndex（0〜6）をキーとする Map として返す。
 *
 * 設計方針:
 *  - 全アイテムを一度走査して今週の表示対象を抽出
 *  - 各日ごとに重なり判定とカラム配置を計算
 *  - グループ判定はグループ内の最大 end と比較（従来バグ修正）
 *  - styleStr を derived 内で確定させ、テンプレート側では参照のみ
 */
type PositionedItem = CalendarItem & {
  top: number;        // px (day-grid 上端からの距離、クリップ済み)
  height: number;     // px (クリップ済み)
  left: number;       // % (day-grid 幅に対する割合)
  width: number;      // % (day-grid 幅に対する割合)
  styleStr: string;   // 最終的な style 文字列
  clipTop: boolean;   // 開始時刻が startHour より前（上端クリップ）
  clipBottom: boolean; // 終了時刻が endHour より後（下端クリップ）
  isDeadline: boolean; // 分単位 Deadline（CalendarDateTimePoint）
};

let weekLayout = $derived.by((): Map<number, PositionedItem[]> => {
  const result = new Map<number, PositionedItem[]>();
  const hourHeight = 60; // 1時間 = 60px (固定)

  // --- ステップ1: 今週の各日に表示すべき timed アイテムを抽出 ---
  // dayIndex → CalendarItem[] のマップを作る
  const dayItems: CalendarItem[][] = weekDays.map(day =>
    items.filter(item => {
      // timed または分単位 Deadline のみ
      if (!isTimed(item) && !isDeadlineTimed(item)) return false;
      // 複数日またがりアイテムはグリッドに表示しない（分単位 Deadline は単一時刻なので常に単日）
      const s = getItemStart(item, 'local', minorTick);
      const e = getItemEnd(item, 'local', minorTick);
      if (s && e && !s.hasSame(e.minus({ seconds: 1 }), 'day')) return false;
      if (!itemContainsDay(item, day)) return false;
      // 表示時刻範囲の完全外側にあるアイテムは除外
      const dayStart = day.startOf('day');
      const rangeStart = dayStart.set({ hour: startHour, minute: 0, second: 0, millisecond: 0 });
      const rangeEnd = dayStart.set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).plus({ hours: endHour });
      if (s && e && (e <= rangeStart || s >= rangeEnd)) return false;
      return true;
    })
  );

  // --- ステップ2: 各日のアイテムにカラム配置を適用 ---
  weekDays.forEach((day, dayIndex) => {
    const sorted = [...dayItems[dayIndex]].sort((a, b) => {
      const sA = getItemStart(a);
      const sB = getItemStart(b);
      if (!sA || !sB) return 0;
      return sA.toMillis() - sB.toMillis();
    });

    // --- グループ化: グループ内最大 end との比較 (バグ修正) ---
    const groups: CalendarItem[][] = [];
    let currentGroup: CalendarItem[] = [];
    let groupMaxEnd: DateTime | null = null;

    sorted.forEach((item, index) => {
      const itemStart = getItemStart(item);
      const itemEnd = getItemEnd(item);
      if (!itemStart || !itemEnd) return;

      if (currentGroup.length === 0) {
        currentGroup.push(item);
        groupMaxEnd = itemEnd;
      } else if (groupMaxEnd && itemStart < groupMaxEnd) {
        // 現在のグループの最大 end より前に始まる → 同グループ
        currentGroup.push(item);
        if (itemEnd > groupMaxEnd) groupMaxEnd = itemEnd;
      } else {
        // 新しいグループ開始
        groups.push(currentGroup);
        currentGroup = [item];
        groupMaxEnd = itemEnd;
      }

      if (index === sorted.length - 1) {
        groups.push(currentGroup);
      }
    });

    // --- カラム配置 ---
    const positionedForDay: PositionedItem[] = [];

    groups.forEach(group => {
      const columns: CalendarItem[][] = [];

      group.forEach(item => {
        let placed = false;
        for (let col = 0; col < columns.length; col++) {
          const canPlace = columns[col].every(existing => {
            const existingEnd = getItemEnd(existing);
            const iStart = getItemStart(item);
            return !existingEnd || !iStart || existingEnd <= iStart;
          });
          if (canPlace) {
            columns[col].push(item);
            placed = true;
            break;
          }
        }
        if (!placed) {
          columns.push([item]);
        }
      });

      const columnCount = columns.length;
      const columnWidth = 100 / columnCount;

      columns.forEach((column, colIndex) => {
        column.forEach(item => {
          const itemStart = getItemStart(item)!;
          const itemEnd = getItemEnd(item)!;

          const dayStart = day.startOf('day').set({ hour: startHour });
          const rangeEnd = day.startOf('day').set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).plus({ hours: endHour });

          // クリップフラグを計算
          const clipTop = itemStart < dayStart;
          const clipBottom = itemEnd > rangeEnd;

          // top・height をクリップ済み値に変換
          const clippedStart = clipTop ? dayStart : itemStart;
          const clippedEnd = clipBottom ? rangeEnd : itemEnd;

          const minutesFromStart = clippedStart.diff(dayStart, 'minutes').minutes;
          const durationMinutes = clippedEnd.diff(clippedStart, 'minutes').minutes;

          const topOffset = minorTick; // 開始時刻前の ▲インジケーター領域分のオフセット(px)
          const top = (minutesFromStart / 60) * hourHeight + topOffset;
          const height = (durationMinutes / 60) * hourHeight;
          const left = colIndex * columnWidth;
          const width = columnWidth;

          // styleStr を確定
          const styleStr = buildStyleStr(item, top, height, left, width);

          positionedForDay.push({
            ...item,
            top,
            height,
            left,
            width,
            styleStr,
            clipTop,
            clipBottom,
            isDeadline: isDeadlineTimed(item),
          });
        });
      });
    });

    result.set(dayIndex, positionedForDay);
  });

  return result;
});

/** top/height/left/width + カスタムスタイルを結合して style 文字列を生成 */
function buildStyleStr(
  item: CalendarItem,
  top: number,
  height: number,
  left: number,
  width: number,
): string {
  let str = `top: ${top}px; height: ${height}px; left: ${left}%; width: ${width}%;`;

  if (item.style) {
    const customParts: string[] = [];
    for (const [key, value] of Object.entries(item.style)) {
      if (value === undefined || value === null || value === '') continue;
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      if ((cssKey === 'color' || cssKey === 'background-color' || cssKey === 'background') && typeof value === 'string') {
        const v = applyDefaultOpacity(value, defaultColorOpacity);
        if (v) customParts.push(`${cssKey}: ${v}`);
      } else {
        customParts.push(`${cssKey}: ${value}`);
      }
    }
    if (customParts.length > 0) {
      str += ' ' + customParts.join('; ') + ';';
    }
  }

  return str;
}

// allday アイテムの背景色を取得（MonthView と同じロジック）
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

// allday DnD 状態
let alldayDraggedItem = $state<CalendarItem | null>(null);
let alldayDragOverDay = $state<DateTime | null>(null);
let alldayDragOffsetDays = $state<number>(0);
let alldayDragGrabbedDate = $state<DateTime | null>(null);

// allday リサイズ状態
let alldayResizingItem = $state<CalendarItem | null>(null);
let alldayResizeEdge = $state<'left' | 'right' | null>(null);
let alldayResizeStartX = $state<number>(0);
let alldayResizeStartDay = $state<DateTime | null>(null);

// allday DnD: ドラッグ開始
function handleAlldayDragStart(event: DragEvent, item: CalendarItem, barStartIndex: number) {
  const target = event.target as HTMLElement;
  const barElement = target.closest('.allday-item') as HTMLElement;

  const itemStart = getItemStart(item);
  let newDragOffsetDays = 0;
  let newDragGrabbedDate: DateTime | null = null;

  if (itemStart) {
    const barRect = barElement?.getBoundingClientRect();
    if (barRect && barRect.width > 0) {
      const span = parseInt(barElement?.dataset?.span ?? '1') || 1;
      const perCellWidth = barRect.width / span;
      const mouseXInBar = event.clientX - barRect.left;
      const grabCellInBar = Math.max(0, Math.min(Math.floor(mouseXInBar / perCellWidth), span - 1));
      const weekGrabIndex = barStartIndex + grabCellInBar;
      const grabbedDay = weekDays[weekGrabIndex] ?? weekDays[barStartIndex];
      newDragOffsetDays = Math.floor(grabbedDay.startOf('day').diff(itemStart.startOf('day'), 'days').days);
      newDragGrabbedDate = grabbedDay.startOf('day');
    } else {
      newDragGrabbedDate = itemStart.startOf('day');
    }
  }

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
  }

  requestAnimationFrame(() => {
    alldayDraggedItem = item;
    alldayDragOffsetDays = newDragOffsetDays;
    alldayDragGrabbedDate = newDragGrabbedDate;
    if (barElement) barElement.style.opacity = '0.5';
  });
}

// allday DnD: ドラッグ終了
function handleAlldayDragEnd(event: DragEvent) {
  const target = event.target as HTMLElement;
  const barElement = target.closest('.allday-item') as HTMLElement;
  if (barElement) barElement.style.opacity = '1';
  alldayDraggedItem = null;
  alldayDragOverDay = null;
  alldayDragGrabbedDate = null;
}

// allday DnD: ドラッグオーバー
function handleAlldayDragOver(event: DragEvent, day: DateTime) {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  alldayDragOverDay = day;
}

// allday DnD: ドロップ
function handleAlldayDrop(event: DragEvent, day: DateTime) {
  event.preventDefault();
  if (!alldayDraggedItem) return;

  const itemStart = getItemStart(alldayDraggedItem);
  const itemEnd = getItemEnd(alldayDraggedItem);
  if (!itemStart || !itemEnd) return;

  const duration = itemEnd.diff(itemStart, 'days').days;
  const newStart = day.startOf('day').minus({ days: alldayDragOffsetDays });
  const newEnd = newStart.plus({ days: duration });

  onItemMove?.(alldayDraggedItem, newStart, newEnd);

  alldayDraggedItem = null;
  alldayDragOverDay = null;
  alldayDragOffsetDays = 0;
}

// allday リサイズ: 開始
function handleAlldayResizeStart(event: MouseEvent, item: CalendarItem, edge: 'left' | 'right') {
  event.stopPropagation();
  event.preventDefault();

  const target = event.currentTarget as HTMLElement;
  const parentBar = target.closest('.allday-item') as HTMLElement;
  if (parentBar) parentBar.setAttribute('draggable', 'false');

  alldayResizingItem = item;
  alldayResizeEdge = edge;
  alldayResizeStartX = event.clientX;

  const itemStart = getItemStart(item);
  if (itemStart) alldayResizeStartDay = itemStart.startOf('day');

  document.addEventListener('mousemove', handleAlldayResizeMove);
  document.addEventListener('mouseup', handleAlldayResizeEnd);
}

// allday リサイズ: 移動中
function handleAlldayResizeMove(event: MouseEvent) {
  if (!alldayResizingItem || !alldayResizeEdge || !alldayResizeStartDay) return;

  const itemStart = getItemStart(alldayResizingItem);
  const itemEnd = getItemEnd(alldayResizingItem);
  if (!itemStart || !itemEnd) return;

  // day-column の幅を取得（最初の allday-item から計算）
  const firstDayColumn = document.querySelector('.day-column') as HTMLElement;
  if (!firstDayColumn) return;
  const cellWidth = firstDayColumn.getBoundingClientRect().width;

  const deltaX = event.clientX - alldayResizeStartX;
  const deltaDays = Math.round(deltaX / cellWidth);

  let newStart = itemStart;
  let newEnd = itemEnd;

  if (alldayResizeEdge === 'left') {
    newStart = alldayResizeStartDay.plus({ days: deltaDays }).set({
      hour: itemStart.hour, minute: itemStart.minute
    });
    if (newStart >= itemEnd.startOf('day')) {
      newStart = itemEnd.startOf('day').minus({ days: 1 }).set({
        hour: itemStart.hour, minute: itemStart.minute
      });
    }
  } else {
    const originalEnd = itemEnd.startOf('day');
    newEnd = originalEnd.plus({ days: deltaDays }).set({
      hour: itemEnd.hour, minute: itemEnd.minute
    });
    if (newEnd.startOf('day') <= itemStart.startOf('day')) {
      newEnd = itemStart.startOf('day').plus({ days: 1 }).set({
        hour: itemEnd.hour, minute: itemEnd.minute
      });
    }
  }

  onItemResize?.(alldayResizingItem, newStart, newEnd);
}

// allday リサイズ: 終了
function handleAlldayResizeEnd() {
  document.removeEventListener('mousemove', handleAlldayResizeMove);
  document.removeEventListener('mouseup', handleAlldayResizeEnd);

  const allBars = document.querySelectorAll('.allday-item');
  allBars.forEach(el => (el as HTMLElement).setAttribute('draggable', 'true'));

  alldayResizingItem = null;
  alldayResizeEdge = null;
  alldayResizeStartX = 0;
  alldayResizeStartDay = null;
}

// アイテムクリックハンドラ
function handleItemClick(item: CalendarItem) {
  // リサイズ中はクリックイベントを無視
  if (resizingItem) return;
  onItemClick?.(item);
}

// リサイズ開始
function handleResizeStart(event: MouseEvent, item: CalendarItem, edge: 'top' | 'bottom') {
  event.stopPropagation();
  event.preventDefault();
  
  // 親要素のdraggableを無効化（リサイズ中はドラッグ不可）
  const target = event.currentTarget as HTMLElement;
  const parentItem = target.closest('.calendar-item') as HTMLElement;
  if (parentItem) {
    parentItem.setAttribute('draggable', 'false');
  }
  
  resizingItem = item;
  resizeEdge = edge;
  resizeStartY = event.clientY;
  
  // グローバルマウスイベントをリッスン
  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
}

// リサイズ中
function handleResizeMove(event: MouseEvent) {
  if (!resizingItem || !resizeEdge) return;
  
  const itemStart = getItemStart(resizingItem);
  const itemEnd = getItemEnd(resizingItem);
  if (!itemStart || !itemEnd) return;
  
  // AllDayアイテムのリサイズは未対応
  if (!isTimed(resizingItem)) return;
  
  const deltaY = event.clientY - resizeStartY;
  const hourHeight = 60;
  const deltaMinutes = (deltaY / hourHeight) * 60;
  
  let newStart = itemStart;
  let newEnd = itemEnd;
  
  if (resizeEdge === 'top') {
    // 上端をドラッグ → 開始時刻を変更（日付をまたぐことも可能）
    const rawStart = itemStart.plus({ minutes: deltaMinutes });
    newStart = snapToMinorTick(rawStart, minorTick);
    
    // 開始時刻が終了時刻を超えないようにする
    if (newStart >= itemEnd) {
      newStart = itemEnd.minus({ minutes: minorTick });
    }
  } else {
    // 下端をドラッグ → 終了時刻を変更（日付をまたぐことも可能）
    const rawEnd = itemEnd.plus({ minutes: deltaMinutes });
    newEnd = snapToMinorTick(rawEnd, minorTick);
    
    // 終了時刻が開始時刻を下回らないようにする
    if (newEnd <= itemStart) {
      newEnd = itemStart.plus({ minutes: minorTick });
    }
  }
  
  // イベントを発火（リアルタイムプレビュー）
  onItemResize?.(resizingItem, newStart, newEnd);
  // 注意: resizeStartYは更新しない（累積的な変更を追跡するため）
}

// リサイズ終了
function handleResizeEnd() {
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
  
  // すべてのカレンダーアイテムのdraggableを再有効化
  const allItems = document.querySelectorAll('.calendar-item');
  allItems.forEach(el => {
    (el as HTMLElement).setAttribute('draggable', 'true');
  });
  
  resizingItem = null;
  resizeEdge = null;
  resizeStartY = 0;
}

// ドラッグ&ドロップ関連の状態
let draggedItem = $state<CalendarItem | null>(null);
let draggedItemElement = $state<HTMLElement | null>(null);
let dragStartMouseY = $state<number>(0);
let dragStartItemY = $state<number>(0);
let currentDragOverDay = $state<DateTime | null>(null);
let currentDragOverY = $state<number | null>(null);
let currentDragOverX = $state<number | null>(null);

// リサイズ関連の状態
let resizingItem = $state<CalendarItem | null>(null);
let resizeEdge = $state<'top' | 'bottom' | null>(null);
let resizeStartY = $state<number>(0);

// ドラッグプレビュー（移動先の影）のスタイルを計算
let dragPreviewStyle = $derived.by(() => {
  if (!draggedItem || !currentDragOverDay || currentDragOverY === null) return null;
  
  const itemStart = getItemStart(draggedItem);
  const itemEnd = getItemEnd(draggedItem);
  if (!itemStart || !itemEnd) return null;
  
  // AllDay / 日単位Deadline のドラッグは別ロジックで処理
  if (!isTimed(draggedItem) && !isDeadlineTimed(draggedItem)) return null;
  
  // ターゲット日のグリッドを取得
  const dayGrids = document.querySelectorAll('.day-grid');
  let targetDayRect: DOMRect | null = null;
  
  for (let i = 0; i < weekDays.length; i++) {
    if (weekDays[i].hasSame(currentDragOverDay, 'day')) {
      targetDayRect = dayGrids[i].getBoundingClientRect();
      break;
    }
  }
  
  if (!targetDayRect) return null;
  
  // 分単位 Deadline はマウス位置を直接期限時刻として扱う（オフセット不要）
  // 通常アイテムはドラッグ開始時のマウスとアイテム上端の差分を考慮
  const isDeadlineItem = isDeadlineTimed(draggedItem);
  
  let itemTopY: number;
  if (isDeadlineItem) {
    // Deadline: マウス位置をそのまま使用（期限の下辺 = マウス位置）
    itemTopY = currentDragOverY;
  } else {
    const dragOffset = dragStartMouseY - dragStartItemY;
    itemTopY = currentDragOverY - dragOffset;
  }
  
  // アイテムの上端位置から時刻を計算
  // minorTick px 分の ▲インジケーター領域が先頭に常時確保されているためオフセットを減算
  const y = itemTopY - targetDayRect.top - minorTick;
  const hourHeight = 60;
  const hoursFromStart = y / hourHeight;
  const minutesFromStart = hoursFromStart * 60;
  
  // 新しい開始位置を計算（minorTick単位にスナップ）
  const rawStart = currentDragOverDay.startOf('day').set({ hour: startHour }).plus({ minutes: minutesFromStart });
  const newStart = snapToMinorTick(rawStart, minorTick);
  const dayStart = newStart.startOf('day').set({ hour: startHour });
  const top = newStart.diff(dayStart, 'minutes').minutes;
  
  // アイテムの期間を維持（Deadline は minorTick 分固定）
  const duration = isDeadlineItem ? minorTick : itemEnd.diff(itemStart, 'minutes').minutes;
  const height = duration;
  
  return {
    day: currentDragOverDay,
    top: (top / 60) * hourHeight + minorTick, // minorTick px 分のオフセットを加算
    height: (height / 60) * hourHeight,
    newStart,
    newEnd: newStart.plus({ minutes: duration })
  };
});

// ドラッグ開始
function handleDragStart(event: DragEvent, item: CalendarItem) {
  draggedItem = item;
  draggedItemElement = event.currentTarget as HTMLElement;
  dragStartMouseY = event.clientY;
  
  // アイテムの現在のY位置を取得
  const itemRect = draggedItemElement.getBoundingClientRect();
  dragStartItemY = itemRect.top;
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
  }
}

// ドラッグ終了
function handleDragEnd() {
  draggedItem = null;
  draggedItemElement = null;
  dragStartMouseY = 0;
  dragStartItemY = 0;
  currentDragOverDay = null;
  currentDragOverY = null;
  currentDragOverX = null;
}

// ドラッグオーバー（日列）
function handleDayDragOver(event: DragEvent, day: DateTime) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  
  // 現在のマウス位置を記録
  currentDragOverDay = day;
  currentDragOverY = event.clientY;
  currentDragOverX = event.clientX;
}

// ドロップ処理
function handleDrop(event: DragEvent, day: DateTime) {
  event.preventDefault();
  
  if (!draggedItem || !dragPreviewStyle) return;
  
  // Deadline（CalendarDateTimePoint）はマウス位置 = アイテム下辺 = 期限時刻
  // newEnd（= newStart + minorTick）が実際の期限時刻になる
  const moveStart = isDeadlineTimed(draggedItem) ? dragPreviewStyle.newEnd : dragPreviewStyle.newStart;
  const moveEnd = isDeadlineTimed(draggedItem) ? dragPreviewStyle.newEnd : dragPreviewStyle.newEnd;
  onItemMove?.(draggedItem, moveStart, moveEnd);
  
  // 状態をリセット
  draggedItem = null;
  draggedItemElement = null;
  dragStartMouseY = 0;
  dragStartItemY = 0;
  currentDragOverDay = null;
  currentDragOverY = null;
  currentDragOverX = null;
}

// 前の週に移動
function goToPreviousWeek() {
  const newDate = currentDate.minus({ weeks: 1 });
  onViewChange?.(newDate);
}

// 次の週に移動
function goToNextWeek() {
  const newDate = currentDate.plus({ weeks: 1 });
  onViewChange?.(newDate);
}

// 今週に戻る
function goToToday() {
  const newDate = DateTime.now();
  onViewChange?.(newDate);
}

// 設定モーダル関連
let showSettings = $state(false);

function toggleSettings() {
  showSettings = !showSettings;
}

// 設定変更ハンドラ
function handleSettingsChange(patch: Partial<typeof DEFAULT_WEEK_SETTINGS>) {
  if (storage) {
    storage.update({ weekSettings: { ...ws, ...patch } });
  }
}

// ▲インジケータークリック：startHour を majorTick 単位でアイテム開始時刻以前に拡張
function handleExpandStart(item: CalendarItem) {
  const itemStart = getItemStart(item);
  if (!itemStart) return;

  const majorTickHours = majorTick / 60;
  const newStartHour = Math.max(0, Math.floor(itemStart.hour / majorTickHours) * majorTickHours);

  if (newStartHour >= startHour) return;
  handleSettingsChange({ startHour: newStartHour });
}

// ▼インジケータークリック：endHour を majorTick 単位でアイテム終了時刻以降に拡張
function handleExpandEnd(item: CalendarItem) {
  const itemEnd = getItemEnd(item);
  if (!itemEnd) return;

  const majorTickHours = majorTick / 60;
  const newEndHour = Math.min(24, Math.ceil((itemEnd.hour + itemEnd.minute / 60) / majorTickHours) * majorTickHours);

  if (newEndHour <= endHour) return;
  handleSettingsChange({ endHour: newEndHour });
}

// セルクリックハンドラ
function handleCellClick(event: MouseEvent, day: DateTime) {
  // アイテムクリックの場合はイベントが伝播しないのでここには来ない
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  
  // クリック位置（グリッド内の相対座標）
  const clickPosition = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
  
  // Y座標から時刻を計算
  // minorTick px 分の ▲インジケーター領域が先頭に確保されているためオフセットを減算
  const hourHeight = 60; // 1時間あたりのピクセル高さ
  const minutesFromStart = ((clickPosition.y - minorTick) / hourHeight) * 60;
  const clickDateTime = day.startOf('day').set({ hour: startHour }).plus({ minutes: minutesFromStart });
  
  // 親コンポーネントに通知
  onCellClick?.(clickDateTime, clickPosition);
}

// カラー値に透明度を追加（透明度指定がない場合のみ）
function applyDefaultOpacity(color: string | undefined, opacity: number): string | undefined {
  if (!color) return undefined;
  
  // linear-gradient, radial-gradient, conic-gradientなどの複雑な値はそのまま返す
  if (color.includes('gradient') || color.includes('url(')) {
    return color;
  }
  
  // rgb/rgba/hsl/hsla形式をチェック
  if (color.includes('rgb') || color.includes('hsl')) {
    // すでにalphaが指定されている場合はそのまま
    if (color.includes('rgba') || color.includes('hsla')) {
      return color;
    }
    // rgb() -> rgba(), hsl() -> hsla()に変換
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    }
    if (color.startsWith('hsl(')) {
      return color.replace('hsl(', 'hsla(').replace(')', `, ${opacity})`);
    }
  }
  
  // HEXカラー (#fff, #ffffff)の場合、color-mixで透明度を追加
  if (color.startsWith('#')) {
    return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
  }
  
  // その他の色名やCSS変数の場合もcolor-mixで透明度を追加
  return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
}

// アイテムのCSSクラスを取得
function getItemClass(item: CalendarItem): string {
  if (item.type === 'deadline') {
    return 'calendar-item deadline';
  }
  if (item.type === 'task') {
    const task = item as any;
    return `calendar-item task task-${task.status}`;
  }
  return 'calendar-item appointment';
}
</script>

<div class="week-view">
  <!-- ヘッダー: ナビゲーションと週表示 -->
  <div class="week-header">
    <button class="nav-button settings-button" onclick={toggleSettings} title="設定" aria-expanded={showSettings}>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="4" y1="21" x2="4" y2="14"></line>
        <line x1="4" y1="10" x2="4" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12" y2="3"></line>
        <line x1="20" y1="21" x2="20" y2="16"></line>
        <line x1="20" y1="12" x2="20" y2="3"></line>
        <line x1="1" y1="14" x2="7" y2="14"></line>
        <line x1="9" y1="8" x2="15" y2="8"></line>
        <line x1="17" y1="16" x2="23" y2="16"></line>
      </svg>
    </button>
    <button class="nav-button" onclick={goToPreviousWeek}>◀</button>
    <button class="nav-button" onclick={goToNextWeek}>▶</button>
    <button class="nav-button today" onclick={goToToday}>今日</button>
    <span class="week-title">
      {weekDays[0].toFormat('yyyy年M月d日')} - {weekDays[weekDays.length - 1].toFormat('M月d日')}
    </span>
  </div>
  
  <!-- 設定インラインパネル -->
  {#if showSettings}
    <div class="settings-panel">
      <div class="settings-panel-inner">
        <!-- 移動単位 -->
        <div class="setting-item">
          <label for="wv-minorTick">移動単位（分）</label>
          <input id="wv-minorTick" type="number" value={minorTick} min="1" max="60" step="1"
            onblur={(e) => {
              const v = parseInt((e.currentTarget as HTMLInputElement).value);
              if (v > 0 && v <= 60 && 60 % v === 0) handleSettingsChange({ minorTick: v });
              else (e.currentTarget as HTMLInputElement).value = String(minorTick);
            }}
          />
          <span class="hint">60の約数（例: 5, 10, 15, 30）</span>
        </div>
        <!-- 開始時刻 -->
        <div class="setting-item">
          <label for="wv-startHour">開始時刻（時）</label>
          <input id="wv-startHour" type="number" value={startHour} min="0" max="23" step="1"
            onblur={(e) => {
              const v = parseInt((e.currentTarget as HTMLInputElement).value);
              if (Number.isInteger(v) && v >= 0 && v < endHour) handleSettingsChange({ startHour: v });
              else (e.currentTarget as HTMLInputElement).value = String(startHour);
            }}
          />
        </div>
        <!-- 終了時刻 -->
        <div class="setting-item">
          <label for="wv-endHour">終了時刻（時）</label>
          <input id="wv-endHour" type="number" value={endHour} min="1" max="24" step="1"
            onblur={(e) => {
              const v = parseInt((e.currentTarget as HTMLInputElement).value);
              if (Number.isInteger(v) && v > startHour && v <= 24) handleSettingsChange({ endHour: v });
              else (e.currentTarget as HTMLInputElement).value = String(endHour);
            }}
          />
        </div>
        <!-- 土日表示 -->
        <div class="setting-item setting-item-inline">
          <label>
            <input type="checkbox" checked={showWeekend}
              onchange={(e) => handleSettingsChange({ showWeekend: (e.currentTarget as HTMLInputElement).checked })}
            />
            土日を表示
          </label>
        </div>
        <!-- 終日予定 -->
        <div class="setting-item setting-item-inline">
          <label>
            <input type="checkbox" checked={showAllDay}
              onchange={(e) => handleSettingsChange({ showAllDay: (e.currentTarget as HTMLInputElement).checked })}
            />
            終日予定を表示
          </label>
        </div>
        <!-- 透明度 -->
        <div class="setting-item">
          <label for="wv-opacity">アイテムの透明度</label>
          <div class="setting-row">
            <input id="wv-opacity" type="range" min="0" max="1" step="0.05" value={defaultColorOpacity}
              oninput={(e) => handleSettingsChange({ defaultColorOpacity: parseFloat((e.currentTarget as HTMLInputElement).value) })}
            />
            <span class="setting-value">{Math.round(defaultColorOpacity * 100)}%</span>
          </div>
        </div>
        <!-- 週の開始曜日 -->
        <div class="setting-item">
          <label for="wv-weekStartsOn">週の開始曜日</label>
          <select id="wv-weekStartsOn" value={weekStartsOn}
            onchange={(e) => handleSettingsChange({ weekStartsOn: parseInt((e.currentTarget as HTMLSelectElement).value) })}
          >
            <option value={1}>月曜日</option>
            <option value={2}>火曜日</option>
            <option value={3}>水曜日</option>
            <option value={4}>木曜日</option>
            <option value={5}>金曜日</option>
            <option value={6}>土曜日</option>
            <option value={7}>日曜日</option>
          </select>
        </div>
        <!-- アイテム右余白 -->
        <div class="setting-item">
          <label for="wv-itemRightMargin">アイテム右余白 (px)</label>
          <input id="wv-itemRightMargin" type="number" min="0" max="50" value={itemRightMargin}
            onchange={(e) => handleSettingsChange({ itemRightMargin: parseInt((e.currentTarget as HTMLInputElement).value) })}
          />
        </div>
        <!-- 親階層表示 -->
        <div class="setting-item setting-item-inline">
          <label>
            <input type="checkbox" checked={showParent}
              onchange={(e) => handleSettingsChange({ showParent: (e.currentTarget as HTMLInputElement).checked })}
            />
            親階層を表示
          </label>
        </div>
        <!-- 親階層インデックス -->
        <div class="setting-item">
          <label for="wv-parentIndex">親階層のインデックス</label>
          <input id="wv-parentIndex" type="number" value={parentDisplayIndex}
            onchange={(e) => handleSettingsChange({ parentDisplayIndex: parseInt((e.currentTarget as HTMLInputElement).value) })}
          />
          <span class="hint">-1で最後の親を表示</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- カレンダーグリッド -->
  <div class="calendar-grid">
    <!-- 時刻列 -->
    <div class="time-column">
      <div class="time-header"></div>
      <!-- allday レーンの高さ分のスペーサー（allday-row と高さを同期） -->
      {#if alldayHeight > 0}
        <div class="time-allday-spacer" style="height: {alldayHeight}px;">
          <span class="time-allday-label">ALLDAY</span>
        </div>
      {/if}
      <!-- 常時 1 minorTick 分の余白（▲インジケーター表示領域・開始時刻前） -->
      <div class="time-slot time-slot-minor-padding" style="height: {minorTick}px;"></div>
      {#each timeSlots as slot}
        <div class="time-slot">{formatTime(slot)}</div>
      {/each}
      <!-- 常時 1 minorTick 分の余白（▼インジケーター表示領域・終了時刻後） -->
      <div class="time-slot-minor-padding" style="height: {minorTick}px;"></div>
    </div>

    <!-- 各曜日の列 -->
    {#each weekDays as day, dayIndex}
      <div class="day-column">
        <!-- 曜日ヘッダー -->
        <div class="day-header">
          <div class="weekday">{formatWeekday(day)}</div>
          <div class="date">{day.day}</div>
        </div>

        <!-- allday レーン（終日・複数日アイテムを表示） -->
        {#if alldayHeight > 0}
          <div
            class="day-allday"
            style="height: {alldayHeight}px;"
          >
            <!-- 縦罫線（各 day-column の右端） -->
            <div class="allday-border-right {dayIndex < weekDays.length - 1 ? 'has-border' : ''}"></div>
            <!-- allday バー：この列が startIndex と一致するアイテムのみここで絶対配置 -->
            <!-- バーの left/width は day-column 全体ではなく、allday-canvas（全曜日をまたぐ絶対座標）で管理するため
                 ここでは dayIndex=0 の列にのみ allday-canvas を配置する -->
            {#if dayIndex === 0}
              <div
                class="allday-canvas"
                style="width: calc(100% * {weekDays.length});"
              >
                <!-- DnD ドロップ受け取り用グリッド -->
                <div class="allday-drop-grid" style="grid-template-columns: repeat({weekDays.length}, minmax(0, 1fr));">
                  {#each weekDays as dropDay, dropIdx}
                    <div
                      class="allday-drop-cell"
                      class:drag-over={alldayDragOverDay?.hasSame(dropDay, 'day')}
                      ondragover={(e) => handleAlldayDragOver(e, dropDay)}
                      ondrop={(e) => handleAlldayDrop(e, dropDay)}
                    ></div>
                  {/each}
                </div>
                {#each alldayPositioned as p (p.item.id)}
                  <div
                    class="allday-item"
                    class:dragging={alldayDraggedItem?.id === p.item.id}
                    class:deadline-day={p.item.type === 'deadline'}
                    draggable="true"
                    data-span={p.span}
                    style={p.item.type === 'deadline'
                      ? `top: ${p.top}px; left: calc(${p.startIndex} / ${weekDays.length} * 100% + calc(${p.span} / ${weekDays.length} * 100% / 2)); width: calc(${p.span} / ${weekDays.length} * 100% / 2 - 4px); background-color: color-mix(in srgb, #ef4444 ${defaultColorOpacity * 100}%, transparent); border: 2px solid #ef4444; color: #7f1d1d; box-sizing: border-box;`
                      : `top: ${p.top}px; left: ${p.left}; width: ${p.width}; background-color: ${getItemBgColor(p.item)};`}
                    ondragstart={(e) => handleAlldayDragStart(e, p.item, p.startIndex)}
                    ondragend={handleAlldayDragEnd}
                    ondragover={(e) => {
                      e.preventDefault();
                      // allday バー上でのドラッグオーバーは、対応する曜日のドロップセルに委譲
                      const barLeft = (e.currentTarget as HTMLElement).getBoundingClientRect().left;
                      const barWidth = (e.currentTarget as HTMLElement).getBoundingClientRect().width;
                      const spanCount = p.span;
                      const cellWidth = barWidth / spanCount;
                      const mouseXInBar = e.clientX - barLeft;
                      const cellIndex = Math.max(0, Math.min(Math.floor(mouseXInBar / cellWidth), spanCount - 1));
                      const dayIndex = p.startIndex + cellIndex;
                      const targetDay = weekDays[dayIndex];
                      if (targetDay) handleAlldayDragOver(e, targetDay);
                    }}
                    ondrop={(e) => {
                      e.preventDefault();
                      // allday バー上でのドロップは、対応する曜日に委譲
                      const barLeft = (e.currentTarget as HTMLElement).getBoundingClientRect().left;
                      const barWidth = (e.currentTarget as HTMLElement).getBoundingClientRect().width;
                      const spanCount = p.span;
                      const cellWidth = barWidth / spanCount;
                      const mouseXInBar = e.clientX - barLeft;
                      const cellIndex = Math.max(0, Math.min(Math.floor(mouseXInBar / cellWidth), spanCount - 1));
                      const dayIndex = p.startIndex + cellIndex;
                      const targetDay = weekDays[dayIndex];
                      if (targetDay) handleAlldayDrop(e, targetDay);
                    }}
                    title={p.item.title}
                    onclick={(e) => { e.stopPropagation(); onItemClick?.(p.item); }}
                    role="button"
                    tabindex="0"
                  >
                    {#if p.item.type === 'deadline'}
                      <!-- 日単位 Deadline: ←アイコン + タイトル（赤背景・右半分） -->
                      <span class="deadline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M19 12H6M12 5l-7 7 7 7"/>
                        </svg>
                      </span>
                      <div class="allday-bar-content">{p.item.title}</div>
                    {:else}
                      <!-- 通常 allday アイテム -->
                      <!-- 左端リサイズハンドル -->
                      <div
                        class="allday-resize-handle allday-resize-handle-left"
                        onmousedown={(e) => handleAlldayResizeStart(e, p.item, 'left')}
                      ></div>
                      <div class="allday-bar-content">{p.item.title}</div>
                      <!-- 右端リサイズハンドル -->
                      <div
                        class="allday-resize-handle allday-resize-handle-right"
                        onmousedown={(e) => handleAlldayResizeStart(e, p.item, 'right')}
                      ></div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- 時間グリッド -->
        <div 
          class="day-grid"
          ondragover={(e) => handleDayDragOver(e, day)}
          ondrop={(e) => handleDrop(e, day)}
          onclick={(e) => handleCellClick(e, day)}
        >
          <!-- 常時 1 minorTick 分の余白（▲インジケーター表示領域・開始時刻前） -->
          <div
            class="grid-cell grid-cell-minor-padding"
            style="height: {minorTick}px;"
            ondragover={(e) => handleDayDragOver(e, day)}
            ondrop={(e) => handleDrop(e, day)}
          ></div>
          {#each timeSlots as slot}
            <div class="grid-cell"></div>
          {/each}
          <!-- 常時 1 minorTick 分の余白（▼インジケーター表示領域・終了時刻後） -->
          <div
            class="grid-cell-minor-padding"
            style="height: {minorTick}px;"
            ondragover={(e) => handleDayDragOver(e, day)}
            ondrop={(e) => handleDrop(e, day)}
          ></div>
          
          <!-- minorTickグリッド線 -->
          {#each minorGridLines as minutes}
            <div 
              class="minor-grid-line" 
              style="top: {minutes + minorTick}px;"
            ></div>
          {/each}
          
          <!-- 現在時刻線 -->
          {#if currentTimeLine && weekDays.some(d => d.hasSame(currentTimeLine.today, 'day'))}
            {@const isToday = day.hasSame(currentTimeLine.today, 'day')}
            {@const opacity = isToday ? 0.75 : 0.3}
            <div 
              class="current-time-line" 
              style="top: {currentTimeLine.position + minorTick}px; background-color: rgba(244, 67, 54, {opacity});"
            ></div>
          {/if}

          <!-- ドラッグプレビュー（移動先の影） -->
          {#if dragPreviewStyle && dragPreviewStyle.day.hasSame(day, 'day')}
            <div
              class="drag-preview"
              style="top: {dragPreviewStyle.top}px; height: {dragPreviewStyle.height}px;"
            ></div>
          {/if}

          <!-- アイテム表示 -->
          <div class="items-container" style="right: {itemRightMargin}px;">
            {#each weekLayout.get(dayIndex) ?? [] as item (item.id)}
              <div
                class="{getItemClass(item)} {draggedItem?.id === item.id ? 'dragging' : ''} {item.clipTop ? 'clip-top' : ''} {item.clipBottom ? 'clip-bottom' : ''} {item.isDeadline ? 'deadline-timed' : ''}"
                style={item.styleStr}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, item)}
                ondragend={handleDragEnd}
              >
                {#if item.isDeadline}
                  <!-- 分単位 Deadline: ↓アイコン + タイトル（下辺罫線のみ） -->
                  <div
                    class="item-content deadline-content"
                    title={item.temporal.kind === 'CalendarDateTimePoint' ? `${item.title} (${formatTime(item.temporal.at)})` : item.title}
                    onclick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                    onkeydown={(e) => e.key === 'Enter' && handleItemClick(item)}
                    role="button"
                    tabindex="0"
                  >
                    <span class="deadline-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 5v13M5 12l7 7 7-7"/>
                      </svg>
                    </span>
                    <span class="deadline-title">{item.title}</span>
                    {#if item.temporal.kind === 'CalendarDateTimePoint'}
                      <span class="deadline-time">{formatTime(item.temporal.at)}</span>
                    {/if}
                  </div>
                {:else}
                  <!-- 通常アイテム -->
                  <!-- リサイズハンドル（上端）- clipTop のときは表示しない -->
                  {#if !item.clipTop}
                    <div 
                      class="resize-handle resize-handle-top"
                      onmousedown={(e) => handleResizeStart(e, item, 'top')}
                      ondragstart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      draggable="false"
                      role="slider"
                      aria-label="開始時刻を変更"
                    ></div>
                  {/if}
                  
                  <!-- アイテム本体（クリック可能） -->
                  <div
                    class="item-content"
                    title={item.temporal.kind === 'CalendarDateTimeRange' ? `${item.title} (${formatTime(item.temporal.start)} - ${formatTime(item.temporal.end)})` : item.title}
                    onclick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                    onkeydown={(e) => e.key === 'Enter' && handleItemClick(item)}
                    role="button"
                    tabindex="0"
                  >
                    {#if showParent && item.parents && item.parents.length > 0}
                      {@const index = parentDisplayIndex >= 0 && parentDisplayIndex < item.parents.length ? parentDisplayIndex : item.parents.length - 1}
                      <div class="item-parent">{item.parents[index]}</div>
                    {/if}
                    <div class="item-title">{item.title}</div>
                    {#if item.temporal.kind === 'CalendarDateTimeRange'}
                      <div class="item-time">
                        {formatTime(item.temporal.start)} - {formatTime(item.temporal.end)}
                      </div>
                    {/if}
                  </div>
                  
                  <!-- リサイズハンドル（下端）- clipBottom のときは表示しない -->
                  {#if !item.clipBottom}
                    <div 
                      class="resize-handle resize-handle-bottom"
                      onmousedown={(e) => handleResizeStart(e, item, 'bottom')}
                      ondragstart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      draggable="false"
                      role="slider"
                      aria-label="終了時刻を変更"
                    ></div>
                  {/if}
                {/if}
              </div>
            {/each}

            <!-- ▲ インジケーター（アイテム外側・上に独立配置） -->
            {#each weekLayout.get(dayIndex) ?? [] as item (item.id + '-above')}
              {#if item.clipTop}
                {@const svgSize = minorTick - 4}
                <div
                  class="clip-indicator-above"
                  style="top: {item.top - minorTick}px; height: {minorTick}px; left: {item.left}%; width: {item.width}%;"
                  aria-label="開始時刻は表示範囲より前"
                  role="button"
                  tabindex="0"
                  onclick={(e) => { e.stopPropagation(); handleExpandStart(item); }}
                  onkeydown={(e) => e.key === 'Enter' && handleExpandStart(item)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 11l-5-5-5 5M17 18l-5-5-5 5"/></svg>
                </div>
              {/if}
            {/each}

            <!-- ▼ インジケーター（アイテム外側・下に独立配置） -->
            {#each weekLayout.get(dayIndex) ?? [] as item (item.id + '-below')}
              {#if item.clipBottom}
                {@const svgSize = minorTick - 4}
                <div
                  class="clip-indicator-below"
                  style="top: {item.top + item.height}px; height: {minorTick}px; left: {item.left}%; width: {item.width}%;"
                  aria-label="終了時刻は表示範囲より後"
                  role="button"
                  tabindex="0"
                  onclick={(e) => { e.stopPropagation(); handleExpandEnd(item); }}
                  onkeydown={(e) => e.key === 'Enter' && handleExpandEnd(item)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .week-view {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--calendar-bg, #ffffff);
    color: var(--calendar-text-color, #333333);
    font-family: var(--calendar-font-family, 'Segoe UI', sans-serif);
  }

  .week-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-bottom: 2px solid var(--calendar-grid-color, #e0e0e0);
  }

  .nav-button {
    padding: 8px 16px;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .nav-button:hover {
    background: #e0e0e0;
  }

  .nav-button.today {
    background: #2196f3;
    color: white;
    border-color: #2196f3;
  }

  .nav-button.settings-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }

  .nav-button.settings-button:hover {
    background: #e3f2fd;
    border-color: #2196f3;
  }

  /* 設定インラインパネル */
  .settings-panel {
    border-bottom: 1px solid var(--calendar-grid-color, #e0e0e0);
    background: #fafafa;
  }

  .settings-panel-inner {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    padding: 8px 16px;
    align-items: flex-end;
  }

  .setting-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 100px;
  }

  .setting-item-inline {
    justify-content: flex-end;
    padding-bottom: 4px;
  }

  .setting-item label {
    font-size: 11px;
    color: #666;
    font-weight: 500;
    white-space: nowrap;
  }

  .setting-item input[type="number"],
  .setting-item select {
    font-size: 12px;
    padding: 3px 6px;
    border: 1px solid #ddd;
    border-radius: 3px;
    background: white;
    width: 80px;
  }

  .setting-item input[type="number"]:focus,
  .setting-item select:focus {
    outline: none;
    border-color: #2196f3;
  }

  .setting-item input[type="checkbox"] {
    margin-right: 4px;
  }

  .setting-item .hint {
    font-size: 10px;
    color: #999;
  }

  .setting-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .setting-row input[type="range"] {
    width: 80px;
  }

  .setting-value {
    font-size: 11px;
    color: #666;
    min-width: 32px;
  }

  .week-title {
    flex: 1;
    text-align: center;
    font-size: 18px;
    font-weight: 600;
  }

  .calendar-grid {
    display: flex;
    flex: 1;
    overflow: auto;
    /* スティッキーヘッダーが機能するためにはスクロールコンテナが overflow:auto であること */
  }

  .time-column {
    width: 80px;
    flex-shrink: 0;
    border-right: 1px solid var(--calendar-grid-color, #e0e0e0);
  }

  .time-header {
    height: 60px;
    border-bottom: 1px solid var(--calendar-grid-color, #e0e0e0);
    position: sticky;
    top: 0;
    z-index: 30;
    background: var(--calendar-bg, #ffffff);
  }

  .time-slot {
    height: 60px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 4px;
    font-size: 12px;
    color: #666;
    border-bottom: 1px solid var(--calendar-grid-color, #e0e0e0);
  }

  /* clip-indicator 表示領域（開始時刻前・終了時刻後）の余白 */
  .time-slot-minor-padding {
    flex-shrink: 0;
  }

  /* allday レーンのスペーサー（time-column 内） */
  .time-allday-spacer {
    flex-shrink: 0;
    box-sizing: border-box;
    background: var(--calendar-bg, #ffffff);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .time-allday-label {
    font-size: 9px;
    color: #999;
    font-weight: 500;
    letter-spacing: 0.05em;
    writing-mode: horizontal-tb;
    user-select: none;
  }

  /* allday レーン（day-column 内） */
  .day-allday {
    position: relative;
    overflow: visible;
    box-sizing: border-box;
    pointer-events: none; /* 子要素(allday-item)のみイベントを受ける */
    flex-shrink: 0;
  }

  /* allday 縦罫線 */
  .allday-border-right {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 0;
  }

  .allday-border-right.has-border {
    border-right: 1px solid var(--calendar-grid-color, #e0e0e0);
  }

  /* allday-canvas: dayIndex=0 の day-allday を起点に全曜日幅に広がるキャンバス */
  .allday-canvas {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    pointer-events: none;
  }

  /* allday バー */
  .allday-item {
    position: absolute;
    height: 22px;
    border-radius: 3px;
    background-color: #ce93d8;
    color: #333;
    font-size: 11px;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    display: flex;
    align-items: center;
    pointer-events: auto;
    box-sizing: border-box;
    overflow: hidden;
    z-index: 2; /* 縦罫線（allday-border-right）より前面に表示 */
  }

  .allday-item:hover {
    opacity: 0.85;
  }

  .allday-bar-content {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 6px;
    pointer-events: none;
  }

  .allday-item.dragging {
    opacity: 0.5;
  }

  .allday-item:hover {
    opacity: 0.85;
  }

  /* ===== Deadline スタイル ===== */

  /* 分単位 Deadline: 背景なし・下辺罫線のみ */
  .calendar-item.deadline-timed {
    background-color: transparent !important;
    border: none !important;
    border-bottom: 2px solid #ef4444 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  .deadline-content {
    display: flex;
    align-items: center;
    gap: 1px;
    padding: 0 1px 0 0;
    height: 100%;
    overflow: hidden;
    min-width: 0;
  }

  .deadline-icon {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    color: #ef4444;
    line-height: 1;
  }

  .deadline-title {
    font-size: 11px;
    font-weight: 600;
    color: #7f1d1d;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .deadline-time {
    font-size: 10px;
    color: #ef4444;
    flex-shrink: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-left: 2px;
  }

  /* 日単位 Deadline: allday バーの赤スタイル */
  .allday-item.deadline-day {
    font-weight: 600;
  }

  .allday-item.deadline-day .deadline-icon {
    color: #7f1d1d;
  }

  /* allday リサイズハンドル（MonthView と同じスタイル） */
  .allday-resize-handle {
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

  .allday-resize-handle:hover {
    background-color: rgba(0, 0, 0, 0.2);
  }

  .allday-resize-handle-left {
    left: 0;
    border-radius: 3px 0 0 3px;
  }

  .allday-resize-handle-right {
    right: 0;
    border-radius: 0 3px 3px 0;
  }

  /* allday ドロップグリッド */
  .allday-drop-grid {
    display: grid;
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  .allday-drop-cell {
    height: 100%;
    pointer-events: auto;
    box-sizing: border-box;
  }

  .allday-drop-cell.drag-over {
    background-color: rgba(33, 150, 243, 0.1);
  }

  .day-column {
    flex: 1;
    min-width: 120px;
  }

  .day-header {
    height: 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--calendar-grid-color, #e0e0e0);
    border-right: 1px solid var(--calendar-grid-color, #e0e0e0);
    background: #fafafa;
    position: sticky;
    top: 0;
    z-index: 30;
  }

  .day-column:last-child .day-header {
    border-right: none;
  }

  .weekday {
    font-size: 12px;
    color: #666;
    font-weight: 500;
  }

  .date {
    font-size: 20px;
    font-weight: 600;
    margin-top: 4px;
  }

  .day-grid {
    position: relative;
    transition: background-color 0.2s;
    border-right: 1px solid var(--calendar-grid-color, #e0e0e0);
  }

  .day-column:last-child .day-grid {
    border-right: none;
  }

  .grid-cell {
    height: 60px;
    border-bottom: 1px solid var(--calendar-grid-color, #e0e0e0);
  }

  /* 常時 1 minorTick 分の余白（▼インジケーター表示領域） */
  .grid-cell-minor-padding {
    flex-shrink: 0;
  }

  .items-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0; /* height:100% は包含ブロックが height:auto の場合に不定になるため bottom:0 を使用 */
    pointer-events: none;
    z-index: 1; /* stacking context を形成し、内部の calendar-item の z-index を外部に漏らさない */
  }

  .calendar-item {
    position: absolute;
    left: 0;
    right: 0;
    border-radius: 4px;
    cursor: pointer;
    pointer-events: auto;
    overflow: visible; /* リサイズハンドルを見えるようにする */
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
  }

  .calendar-item:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }

  /* Task スタイル - 柔軟で動かしやすいデザイン */
  .task {
    /* background: var(--task-bg, rgba(224, 224, 224, 0.85)); */
    background: color-mix(in srgb, var(--task-todo-bg) 50%, transparent);
    border-radius: 4px;
  }

  .task.task-todo {
    /* background: var(--task-todo-bg, rgba(224, 224, 224, 0.85)); */
  }

  .task.task-doing {
    /* background: var(--task-doing-bg, rgba(224, 224, 224, 0.85)); */
  }

  .task.task-done {
    /* background: var(--task-done-bg, rgba(224, 224, 224, 0.85)); */
  }

  .task.task-undefined {
    background: rgba(224, 224, 224, 0.85);
  }

  /* Appointment スタイル - 固定的で動かしにくいデザイン */
  .appointment {
    --base: var(--appointment-bg, rgba(224, 224, 224, 0.85)); /* ←ここを好きな色に変えるだけ */

    background: var(--base);
    border-radius: 2px;

    /* ▼ 外側の高さ（浮き） */
    box-shadow:
      0 1px 0 rgba(255,255,255,0.35) inset,   /* 上面の光 */
      0 -2px 0 rgba(0,0,0,0.1) inset,        /* 下側の締まり */
      0 1px 3px rgba(0,0,0,0.25),             /* 接地影 */
      0 2px 2px rgba(0,0,0,0.18);           /* 拡散影 */

    border: 1px solid color-mix(in srgb, lightgray, black 25%);
  }
  
  .appointment:hover {
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.25); /* ホバー時も強めの影 */
  }
  
  /* アポイントメントのカーソルを変更して動かしにくさを表現 */
  .appointment {
    cursor: default;
  }
  
  .appointment .item-content {
    cursor: default;
  }
  
  /* タスクは通常のカーソル */
  .task {
    cursor: move;
  }
  
  .task .item-content {
    cursor: move;
  }

  .item-parent {
    font-size: 9px;
    color: #999;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 1px;
    font-weight: 400;
    line-height: 1.1;
    opacity: 0.8;
  }

  .item-title {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #333;
    line-height: 1.3;
  }

  .item-time {
    font-size: 11px;
    color: #555;
    margin-top: 2px;
    line-height: 1.2;
  }

  /* ドラッグ中のスタイル */
  .calendar-item.dragging {
    opacity: 0.5;
    cursor: move;
  }

  .day-grid:hover {
    background-color: rgba(33, 150, 243, 0.05);
  }

  /* minorTickグリッド線 */
  .minor-grid-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background-color: rgba(0, 0, 0, 0.05);
    pointer-events: none;
    z-index: var(--z-base);
  }

  /* 現在時刻線 */
  .current-time-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    pointer-events: none;
    z-index: var(--z-dnd-dragging);
  }

  /* ドラッグプレビュー（移動先の影） */
  .drag-preview {
    position: absolute;
    left: 0;
    right: 0;
    background-color: rgba(33, 150, 243, 0.1);
    border: 2px dashed rgba(33, 150, 243, 0.4);
    border-radius: 4px;
    pointer-events: none;
    z-index: var(--z-timeline);
  }

  /* ▲ 上端クリップインジケーター（アイテム外側・上に独立配置） */
  .clip-indicator-above {
    position: absolute;
    pointer-events: auto;
    user-select: none;
    z-index: var(--z-cell-expanded);
    font-size: 75%;
    display: flex;
    justify-content: center;
    overflow: clip;
    align-items: flex-end;
    cursor: pointer;
  }

  /* ▼ 下端クリップインジケーター（アイテム外側・下に独立配置） */
  .clip-indicator-below {
    position: absolute;
    pointer-events: auto;
    user-select: none;
    z-index: var(--z-cell-expanded);
    font-size: 75%;
    display: flex;
    justify-content: center;
    overflow: clip;
    align-items: flex-start;
    cursor: pointer;
  }

  /* クリップ時は上下の border-radius を除去 */
  .calendar-item.clip-top {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  .calendar-item.clip-bottom {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  /* リサイズハンドル */
  .resize-handle {
    position: absolute;
    left: 0;
    right: 0;
    height: 4px;
    cursor: ns-resize;
    z-index: var(--z-resize-handle);
    pointer-events: auto;
    user-select: none;
    -webkit-user-drag: none;
    background-color: rgba(158, 158, 158, 0);
    transition: background-color 0.2s ease;
  }

  .resize-handle-top {
    top: 0;
  }

  .resize-handle-bottom {
    bottom: 0;
  }

  .calendar-item:hover .resize-handle {
    background-color: rgba(158, 158, 158, 0.4);
  }

  /* アイテム本体 */
  .item-content {
    padding: 2px 6px 4px 6px;
    flex: 1;
    overflow: hidden;
    cursor: move;
    pointer-events: auto;
    position: relative;
  }
  
  .item-content * {
    pointer-events: none; /* 子要素がドラッグを妨げないようにする */
  }
  
  /* カレンダーアイテム全体をドラッグ可能にする */
  .calendar-item {
    cursor: move;
    z-index: var(--z-cell-expanded);
  }
</style>
