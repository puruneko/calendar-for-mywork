<script lang="ts">
/**
 * WeekView - 1週間表示カレンダーコンポーネント
 * 
 * 縦軸: 時間（00:00 - 24:00）
 * 横軸: 曜日（月曜日 - 日曜日）
 */

import { DateTime } from 'luxon';
import type { CalendarItem } from '../models';
import { getWeekDays, formatTime, formatWeekday, generateTimeSlots, snapToMinorTick, getItemStart, getItemEnd, itemContainsDay, isTimed } from '../utils';
import SettingsModal from './SettingsModal.svelte';

// Z-index層管理は CSS変数で集中管理（demo/App.svelte の :global(:root) に定義）
// このコメントは削除せず、開発者への注意喚起として残す

interface Props {
  /** 表示するアイテムリスト */
  items: CalendarItem[];
  
  /** 表示基準日（週の決定に使用） */
  currentDate: DateTime;
  
  /** 表示開始時刻（0-23） */
  startHour?: number;
  
  /** 表示終了時刻（1-24） */
  endHour?: number;
  
  /** 時間軸の刻み（分単位） - 非推奨: majorTickを使用してください */
  tickInterval?: number;
  
  /** 1セルの単位（分単位）- メジャーグリッド線の間隔 */
  majorTick?: number;
  
  /** セル内の細かい単位（分単位）- マイナーグリッド線の間隔、DnD移動単位 */
  minorTick?: number;
  
  /** アイテムクリック時のイベントハンドラ */
  onItemClick?: (item: CalendarItem) => void;
  
  /** アイテム移動時のイベントハンドラ */
  onItemMove?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;
  
  /** アイテムリサイズ時のイベントハンドラ */
  onItemResize?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;
  
  /** 表示週変更時のイベントハンドラ */
  onViewChange?: (newDate: DateTime) => void;
  
  /** DnD時の日付変更閾値（0.0-1.0、アイテム幅の何%が別の列に入ったら移動とみなすか） */
  dayChangeThreshold?: number;
  
  /** 土日を表示するかどうか */
  showWeekend?: boolean;
  
  /** 終日イベントを表示するかどうか */
  showAllDay?: boolean;
  
  /** アイテムの色のデフォルト透明度（0-1） */
  defaultColorOpacity?: number;
  
  /** アイテム表示領域の右マージン（px） */
  itemRightMargin?: number;
  
  /** 週の開始曜日（1=月曜, 7=日曜） */
  weekStartsOn?: number;
  
  /** parent表示を有効にするか */
  showParent?: boolean;
  
  /** parent表示の階層インデックス（slice(n)に適用） */
  parentDisplayIndex?: number;
  
  /** セルクリック時のイベントハンドラ */
  onCellClick?: (dateTime: DateTime, clickPosition: { x: number; y: number }) => void;
  
  /** 設定変更時のイベントハンドラ */
  onSettingsChange?: (settings: {
    minorTick: number;
    startHour: number;
    endHour: number;
    showWeekend: boolean;
    showAllDay: boolean;
    defaultColorOpacity: number;
    weekStartsOn: number;
    itemRightMargin: number;
    showParent: boolean;
    parentDisplayIndex: number;
  }) => void;
}

let {
  items = [],
  currentDate = DateTime.now(),
  startHour = 0,
  endHour = 24,
  tickInterval = 60,
  majorTick = 60,
  minorTick = 15,
  dayChangeThreshold = 0.75,
  showWeekend = true,
  showAllDay = true,
  defaultColorOpacity = 0.5,
  itemRightMargin = 10,
  weekStartsOn = 1,
  showParent = true,
  parentDisplayIndex = -1,
  onItemClick,
  onItemMove,
  onItemResize,
  onViewChange,
  onCellClick,
  onSettingsChange,
}: Props = $props();

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

// 各日のアイテムをフィルタリング
function getItemsForDay(day: DateTime): CalendarItem[] {
  return items.filter(item => {
    // AllDayアイテムは除外（別レーンで表示）
    if (!isTimed(item)) return false;
    // 時刻付きでも複数日にまたがるアイテムはWeekViewのグリッドには表示しない
    // （height計算が何千pxにもなりUIが破綻するため。dateRangeで定義すべき）
    const itemStart = getItemStart(item);
    const itemEnd = getItemEnd(item);
    if (itemStart && itemEnd && !itemStart.hasSame(itemEnd.minus({ seconds: 1 }), 'day')) return false;
    return itemContainsDay(item, day);
  });
}

// アイテムの重なりを検出して横幅を調整
function getItemsWithLayout(day: DateTime): Array<CalendarItem & { left: number; width: number }> {
  const dayItems = getItemsForDay(day);
  
  // 時間順にソート
  const sorted = [...dayItems].sort((a, b) => {
    const startA = getItemStart(a);
    const startB = getItemStart(b);
    if (!startA || !startB) return 0;
    return startA.toMillis() - startB.toMillis();
  });
  
  // 重なりグループを検出
  const groups: CalendarItem[][] = [];
  let currentGroup: CalendarItem[] = [];
  
  sorted.forEach((item, index) => {
    const itemStart = getItemStart(item);
    const itemEnd = getItemEnd(item);
    if (!itemStart || !itemEnd) return;
    
    if (currentGroup.length === 0) {
      currentGroup.push(item);
    } else {
      // 現在のグループの最後のアイテムと重なるかチェック
      const lastItem = currentGroup[currentGroup.length - 1];
      const lastEnd = getItemEnd(lastItem);
      if (lastEnd && itemStart < lastEnd) {
        currentGroup.push(item);
      } else {
        // 新しいグループ開始
        groups.push(currentGroup);
        currentGroup = [item];
      }
    }
    
    // 最後のアイテム
    if (index === sorted.length - 1) {
      groups.push(currentGroup);
    }
  });
  
  // 各グループ内でレイアウトを計算
  const result: Array<CalendarItem & { left: number; width: number }> = [];
  
  groups.forEach(group => {
    const columns: CalendarItem[][] = [];
    
    group.forEach(item => {
      // このアイテムが配置できる最初の列を探す
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        const columnItems = columns[col];
        const canPlace = columnItems.every(existing => {
          const existingEnd = getItemEnd(existing);
          const itemStart = getItemStart(item);
          return !existingEnd || !itemStart || existingEnd <= itemStart;
        });
        
        if (canPlace) {
          columnItems.push(item);
          placed = true;
          break;
        }
      }
      
      // 配置できる列がなければ新しい列を作成
      if (!placed) {
        columns.push([item]);
      }
    });
    
    // 各アイテムの位置を計算
    const columnWidth = 100 / columns.length;
    
    columns.forEach((column, colIndex) => {
      column.forEach(item => {
        result.push({
          ...item,
          left: colIndex * columnWidth,
          width: columnWidth
        });
      });
    });
  });
  
  return result;
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
  
  // AllDayアイテムのドラッグは未対応
  if (!isTimed(draggedItem)) return null;
  
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
  
  // マウスY座標からアイテムの上端位置を計算
  // ドラッグ開始時のマウスとアイテム上端の差分を考慮
  const dragOffset = dragStartMouseY - dragStartItemY;
  const itemTopY = currentDragOverY - dragOffset;
  
  // アイテムの上端位置から時刻を計算
  const y = itemTopY - targetDayRect.top;
  const hourHeight = 60;
  const hoursFromStart = y / hourHeight;
  const minutesFromStart = hoursFromStart * 60;
  
  
  // 新しい開始位置を計算（minorTick単位にスナップ）
  const rawStart = currentDragOverDay.startOf('day').set({ hour: startHour }).plus({ minutes: minutesFromStart });
  const newStart = snapToMinorTick(rawStart, minorTick);
  const dayStart = newStart.startOf('day').set({ hour: startHour });
  const top = newStart.diff(dayStart, 'minutes').minutes;
  
  // アイテムの期間を維持
  const duration = itemEnd.diff(itemStart, 'minutes').minutes;
  const height = duration;
  
  return {
    day: currentDragOverDay,
    top: (top / 60) * hourHeight,
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
  
  // dragPreviewStyleで計算済みの新しい開始・終了日時を使用
  onItemMove?.(draggedItem, dragPreviewStyle.newStart, dragPreviewStyle.newEnd);
  
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
function handleSettingsChange(settings: {
  minorTick: number;
  startHour: number;
  endHour: number;
  showWeekend: boolean;
  showAllDay: boolean;
  defaultColorOpacity: number;
  weekStartsOn: number;
  itemRightMargin: number;
  showParent: boolean;
  parentDisplayIndex: number;
}) {
  // 親コンポーネントに設定変更を通知
  onSettingsChange?.(settings);
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
  const hourHeight = 60; // 1時間あたりのピクセル高さ
  const minutesFromStart = (clickPosition.y / hourHeight) * 60;
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

// アイテムの位置とサイズを計算（横幅調整あり + カスタムスタイル適用）
function getItemStyle(item: CalendarItem & { left?: number; width?: number }): string {
  const itemStart = getItemStart(item);
  const itemEnd = getItemEnd(item);
  if (!itemStart || !itemEnd) return '';
  
  const dayStart = itemStart.startOf('day').set({ hour: startHour });
  const minutesFromStart = itemStart.diff(dayStart, 'minutes').minutes;
  const duration = itemEnd.diff(itemStart, 'minutes').minutes;
  
  const hourHeight = 60; // 1時間あたりのピクセル高さ
  const top = (minutesFromStart / 60) * hourHeight;
  const height = (duration / 60) * hourHeight;
  
  // 重なり時の横位置・横幅
  const left = item.left !== undefined ? `${item.left}%` : '0px';
  const width = item.width !== undefined ? `${item.width}%` : '100%';
  
  // 基本スタイル
  let styleStr = item.left !== undefined && item.width !== undefined
    ? `top: ${top}px; height: ${height}px; left: ${left}; width: ${width};`
    : `top: ${top}px; height: ${height}px;`;
  
  // カスタムスタイルを適用
  if (item.style) {
    const customStyles: string[] = [];
    
    // デバッグ: styleプロパティの内容を確認
    if (item.title.includes('カスタムスタイル')) {
      console.debug(`[DEBUG] ${item.title} - style:`, item.style);
      console.debug(`[DEBUG] Object.entries:`, Object.entries(item.style));
    }
    
    for (const [key, value] of Object.entries(item.style)) {
      if (value !== undefined && value !== null && value !== '') {
        // キャメルケースをケバブケースに変換 (backgroundColor -> background-color)
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        
        // colorプロパティの場合、透明度を自動追加
        if ((cssKey === 'color' || cssKey === 'background-color' || cssKey === 'background') && typeof value === 'string') {
          const colorWithOpacity = applyDefaultOpacity(value, defaultColorOpacity);
          if (colorWithOpacity) {
            customStyles.push(`${cssKey}: ${colorWithOpacity}`);
          }
        } else {
          customStyles.push(`${cssKey}: ${value}`);
        }
      }
    }
    
    if (item.title.includes('カスタムスタイル')) {
      console.debug(`[DEBUG] ${item.title} - customStyles:`, customStyles);
    }
    
    if (customStyles.length > 0) {
      styleStr += ' ' + customStyles.join('; ') + ';';
    }
  }
  
  return styleStr;
}

// アイテムのCSSクラスを取得
function getItemClass(item: CalendarItem): string {
  if (item.type === 'task') {
    const task = item as any; // Type assertion needed since status only exists on Task
    return `calendar-item task task-${task.status}`;
  }
  return 'calendar-item appointment';
}
</script>

<div class="week-view">
  <!-- ヘッダー: ナビゲーションと週表示 -->
  <div class="week-header">
    <button class="nav-button settings-button" onclick={toggleSettings} title="設定">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6m0 6v6M1 12h6m6 0h6"/>
        <path d="m4.93 4.93 4.24 4.24m5.66 5.66 4.24 4.24M4.93 19.07l4.24-4.24m5.66-5.66 4.24-4.24"/>
      </svg>
    </button>
    <button class="nav-button" onclick={goToPreviousWeek}>◀</button>
    <button class="nav-button today" onclick={goToToday}>今日</button>
    <span class="week-title">
      {weekDays[0].toFormat('yyyy年M月d日')} - {weekDays[weekDays.length - 1].toFormat('M月d日')}
    </span>
    <button class="nav-button" onclick={goToNextWeek}>▶</button>
  </div>
  
  <!-- 設定モーダル -->
  {#if showSettings}
    <SettingsModal
      {minorTick}
      {startHour}
      {endHour}
      {showWeekend}
      {showAllDay}
      {defaultColorOpacity}
      {weekStartsOn}
      {itemRightMargin}
      {showParent}
      {parentDisplayIndex}
      onClose={toggleSettings}
      onChange={handleSettingsChange}
    />
  {/if}

  <!-- カレンダーグリッド -->
  <div class="calendar-grid">
    <!-- 時刻列 -->
    <div class="time-column">
      <div class="time-header"></div>
      {#each timeSlots as slot}
        <div class="time-slot">{formatTime(slot)}</div>
      {/each}
    </div>

    <!-- 各曜日の列 -->
    {#each weekDays as day, dayIndex}
      <div class="day-column">
        <!-- 曜日ヘッダー -->
        <div class="day-header">
          <div class="weekday">{formatWeekday(day)}</div>
          <div class="date">{day.day}</div>
        </div>

        <!-- 時間グリッド -->
        <div 
          class="day-grid"
          ondragover={(e) => handleDayDragOver(e, day)}
          ondrop={(e) => handleDrop(e, day)}
          onclick={(e) => handleCellClick(e, day)}
        >
          {#each timeSlots as slot}
            <div class="grid-cell"></div>
          {/each}
          
          <!-- minorTickグリッド線 -->
          {#each minorGridLines as minutes}
            <div 
              class="minor-grid-line" 
              style="top: {minutes}px;"
            ></div>
          {/each}
          
          <!-- 現在時刻線 -->
          {#if currentTimeLine && weekDays.some(d => d.hasSame(currentTimeLine.today, 'day'))}
            {@const isToday = day.hasSame(currentTimeLine.today, 'day')}
            {@const opacity = isToday ? 0.75 : 0.3}
            <div 
              class="current-time-line" 
              style="top: {currentTimeLine.position}px; background-color: rgba(244, 67, 54, {opacity});"
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
            {#each getItemsWithLayout(day) as item (item.id)}
              <div
                class="{getItemClass(item)} {draggedItem?.id === item.id ? 'dragging' : ''}"
                style={getItemStyle(item)}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, item)}
                ondragend={handleDragEnd}
              >
                <!-- リサイズハンドル（上端） -->
                <div 
                  class="resize-handle resize-handle-top"
                  onmousedown={(e) => handleResizeStart(e, item, 'top')}
                  ondragstart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  draggable="false"
                  role="slider"
                  aria-label="開始時刻を変更"
                ></div>
                
                <!-- アイテム本体（クリック可能） -->
                <div
                  class="item-content"
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
                  {#if item.start && item.end}
                    <div class="item-time">
                      {formatTime(item.start)} - {formatTime(item.end)}
                    </div>
                  {/if}
                </div>
                
                <!-- リサイズハンドル（下端） -->
                <div 
                  class="resize-handle resize-handle-bottom"
                  onmousedown={(e) => handleResizeStart(e, item, 'bottom')}
                  ondragstart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  draggable="false"
                  role="slider"
                  aria-label="終了時刻を変更"
                ></div>
              </div>
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
  }

  .time-column {
    width: 80px;
    flex-shrink: 0;
    border-right: 1px solid var(--calendar-grid-color, #e0e0e0);
  }

  .time-header {
    height: 60px;
    border-bottom: 1px solid var(--calendar-grid-color, #e0e0e0);
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

  .day-column {
    flex: 1;
    min-width: 120px;
    border-right: 1px solid var(--calendar-grid-color, #e0e0e0);
  }

  .day-column:last-child {
    border-right: none;
  }

  .day-header {
    height: 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--calendar-grid-color, #e0e0e0);
    background: #fafafa;
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
  }

  .grid-cell {
    height: 60px;
    border-bottom: 1px solid var(--calendar-grid-color, #e0e0e0);
  }

  .items-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    pointer-events: none;
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
    position: relative;

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

  .day-grid {
    transition: background-color 0.2s;
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
