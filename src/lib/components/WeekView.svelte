<script lang="ts">
/**
 * WeekView - 1週間表示カレンダーコンポーネント
 * 
 * 縦軸: 時間（00:00 - 24:00）
 * 横軸: 曜日（月曜日 - 日曜日）
 */

import { DateTime } from 'luxon';
import type { CalendarItem } from '../models';
import { getWeekDays, formatTime, formatWeekday, generateTimeSlots, snapToMinorTick } from '../utils';
import SettingsModal from './SettingsModal.svelte';

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
  onItemClick,
  onItemMove,
  onItemResize,
  onViewChange,
}: Props = $props();

// 週の日付リストを取得
let weekDays = $derived(getWeekDays(currentDate));

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
    if (!item.start) return false;
    return item.start.hasSame(day, 'day') || 
           (item.end && item.start < day.endOf('day') && item.end > day.startOf('day'));
  });
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
  
  resizingItem = item;
  resizeEdge = edge;
  resizeStartY = event.clientY;
  
  // グローバルマウスイベントをリッスン
  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
}

// リサイズ中
function handleResizeMove(event: MouseEvent) {
  if (!resizingItem || !resizeEdge || !resizingItem.start || !resizingItem.end) return;
  
  const deltaY = event.clientY - resizeStartY;
  const hourHeight = 60;
  const deltaMinutes = (deltaY / hourHeight) * 60;
  
  let newStart = resizingItem.start;
  let newEnd = resizingItem.end;
  
  if (resizeEdge === 'top') {
    // 上端をドラッグ → 開始時刻を変更
    const rawStart = resizingItem.start.plus({ minutes: deltaMinutes });
    newStart = snapToMinorTick(rawStart, minorTick);
    
    // 開始時刻が終了時刻を超えないようにする
    if (newStart >= resizingItem.end) {
      newStart = resizingItem.end.minus({ minutes: minorTick });
    }
  } else {
    // 下端をドラッグ → 終了時刻を変更
    const rawEnd = resizingItem.end.plus({ minutes: deltaMinutes });
    newEnd = snapToMinorTick(rawEnd, minorTick);
    
    // 終了時刻が開始時刻を下回らないようにする
    if (newEnd <= resizingItem.start) {
      newEnd = resizingItem.start.plus({ minutes: minorTick });
    }
  }
  
  // イベントを発火（リアルタイムプレビュー）
  onItemResize?.(resizingItem, newStart, newEnd);
  resizeStartY = event.clientY;
}

// リサイズ終了
function handleResizeEnd() {
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
  
  resizingItem = null;
  resizeEdge = null;
  resizeStartY = 0;
}

// ドラッグ&ドロップ関連の状態
let draggedItem = $state<CalendarItem | null>(null);
let draggedItemElement = $state<HTMLElement | null>(null);
let dragStartX = $state<number>(0);
let dragStartY = $state<number>(0);

// リサイズ関連の状態
let resizingItem = $state<CalendarItem | null>(null);
let resizeEdge = $state<'top' | 'bottom' | null>(null);
let resizeStartY = $state<number>(0);

// ドラッグプレビュー（移動先の影）のスタイルを計算
let dragPreviewStyle = $derived.by(() => {
  if (!draggedItem || !draggedItemElement) return null;
  if (!draggedItem.start || !draggedItem.end) return null;
  
  const rect = draggedItemElement.getBoundingClientRect();
  const hourHeight = 60;
  
  // アイテムの上端のY座標から時刻を計算
  let targetDay: DateTime | null = null;
  let targetMinutes = 0;
  
  // どの日の列に最も重なっているかを判定
  const itemCenterX = rect.left + rect.width / 2;
  const dayColumns = document.querySelectorAll('.day-column');
  
  dayColumns.forEach((col, index) => {
    const colRect = col.getBoundingClientRect();
    const overlapLeft = Math.max(rect.left, colRect.left);
    const overlapRight = Math.min(rect.right, colRect.right);
    const overlapWidth = Math.max(0, overlapRight - overlapLeft);
    const overlapRatio = overlapWidth / rect.width;
    
    if (overlapRatio >= dayChangeThreshold) {
      targetDay = weekDays[index];
      
      // アイテムの上端から時刻を計算
      const dayGrid = col.querySelector('.day-grid');
      if (dayGrid) {
        const gridRect = dayGrid.getBoundingClientRect();
        const offsetY = rect.top - gridRect.top;
        const hoursFromStart = offsetY / hourHeight;
        targetMinutes = hoursFromStart * 60;
      }
    }
  });
  
  if (!targetDay) return null;
  
  // 新しい開始位置を計算（minorTick単位にスナップ）
  const rawStart = targetDay.startOf('day').set({ hour: startHour }).plus({ minutes: targetMinutes });
  const newStart = snapToMinorTick(rawStart, minorTick);
  const dayStart = newStart.startOf('day').set({ hour: startHour });
  const top = newStart.diff(dayStart, 'minutes').minutes;
  
  // アイテムの期間を維持
  const duration = draggedItem.end.diff(draggedItem.start, 'minutes').minutes;
  const height = duration;
  
  return {
    day: targetDay,
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
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
  }
}

// ドラッグ終了
function handleDragEnd() {
  draggedItem = null;
  draggedItemElement = null;
  dragStartX = 0;
  dragStartY = 0;
}

// ドラッグオーバー（日列）
function handleDayDragOver(event: DragEvent, day: DateTime) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  // 新しいロジックでは、dragPreviewStyleが自動的にアイテム位置を追跡
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
  dragStartX = 0;
  dragStartY = 0;
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
}) {
  // 設定値を更新（親コンポーネントに通知）
  // TODO: 設定変更イベントを追加する必要がある
  console.log('Settings changed:', settings);
}

// アイテムの位置とサイズを計算
function getItemStyle(item: CalendarItem): string {
  if (!item.start || !item.end) return '';
  
  const dayStart = item.start.startOf('day').set({ hour: startHour });
  const minutesFromStart = item.start.diff(dayStart, 'minutes').minutes;
  const duration = item.end.diff(item.start, 'minutes').minutes;
  
  const hourHeight = 60; // 1時間あたりのピクセル高さ
  const top = (minutesFromStart / 60) * hourHeight;
  const height = (duration / 60) * hourHeight;
  
  return `top: ${top}px; height: ${height}px;`;
}

// アイテムのCSSクラスを取得
function getItemClass(item: CalendarItem): string {
  if (item.type === 'task') {
    return `calendar-item task task-${item.status}`;
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
      {weekDays[0].toFormat('yyyy年M月d日')} - {weekDays[6].toFormat('M月d日')}
    </span>
    <button class="nav-button" onclick={goToNextWeek}>▶</button>
  </div>
  
  <!-- 設定モーダル -->
  {#if showSettings}
    <SettingsModal
      {minorTick}
      {startHour}
      {endHour}
      showWeekend={true}
      showAllDay={true}
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
          <div class="items-container">
            {#each getItemsForDay(day) as item (item.id)}
              <div
                class="{getItemClass(item)} {draggedItem?.id === item.id ? 'dragging' : ''}"
                style={getItemStyle(item)}
                onclick={() => handleItemClick(item)}
                onkeydown={(e) => e.key === 'Enter' && handleItemClick(item)}
                role="button"
                tabindex="0"
              >
                <!-- リサイズハンドル（上端） -->
                <div 
                  class="resize-handle resize-handle-top"
                  onmousedown={(e) => handleResizeStart(e, item, 'top')}
                  role="slider"
                  aria-label="開始時刻を変更"
                ></div>
                
                <!-- アイテム本体（ドラッグ可能） -->
                <div
                  class="item-content"
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, item)}
                  ondragend={handleDragEnd}
                >
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
    bottom: 0;
    pointer-events: none;
  }

  .calendar-item {
    position: absolute;
    left: 4px;
    right: 4px;
    border-radius: 4px;
    cursor: pointer;
    pointer-events: auto;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
  }

  .calendar-item:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }

  /* Task スタイル */
  .task.task-todo {
    background: var(--task-todo-bg, #90caf9);
    border-left: 4px solid #2196f3;
  }

  .task.task-doing {
    background: var(--task-doing-bg, #ffb74d);
    border-left: 4px solid #ff9800;
  }

  .task.task-done {
    background: var(--task-done-bg, #a5d6a7);
    border-left: 4px solid #4caf50;
  }

  .task.task-undefined {
    background: #e0e0e0;
    border-left: 4px solid #9e9e9e;
  }

  /* Appointment スタイル */
  .appointment {
    background: var(--appointment-bg, #ce93d8);
    border-left: 4px solid #9c27b0;
  }

  .item-title {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #333;
  }

  .item-time {
    font-size: 11px;
    color: #555;
    margin-top: 2px;
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
    z-index: 1;
  }

  /* 現在時刻線 */
  .current-time-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    pointer-events: none;
    z-index: 10;
  }

  /* ドラッグプレビュー（移動先の影） */
  .drag-preview {
    position: absolute;
    left: 4px;
    right: 4px;
    background-color: rgba(33, 150, 243, 0.1);
    border: 2px dashed rgba(33, 150, 243, 0.4);
    border-radius: 4px;
    pointer-events: none;
    z-index: 5;
  }

  /* リサイズハンドル */
  .resize-handle {
    position: absolute;
    left: 0;
    right: 0;
    height: 8px;
    cursor: ns-resize;
    z-index: 20;
  }

  .resize-handle-top {
    top: 0;
  }

  .resize-handle-bottom {
    bottom: 0;
  }

  .resize-handle:hover {
    background-color: rgba(33, 150, 243, 0.3);
  }

  /* アイテム本体 */
  .item-content {
    padding: 4px 8px;
    flex: 1;
    overflow: hidden;
  }
</style>
