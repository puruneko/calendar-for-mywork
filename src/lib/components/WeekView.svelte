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
  
  /** 土日を表示するかどうか */
  showWeekend?: boolean;
  
  /** 終日イベントを表示するかどうか */
  showAllDay?: boolean;
  
  /** 設定変更時のイベントハンドラ */
  onSettingsChange?: (settings: {
    minorTick: number;
    startHour: number;
    endHour: number;
    showWeekend: boolean;
    showAllDay: boolean;
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
  onItemClick,
  onItemMove,
  onItemResize,
  onViewChange,
  onSettingsChange,
}: Props = $props();

// 週の日付リストを取得（土日表示の設定を反映）
let weekDays = $derived.by(() => {
  const allDays = getWeekDays(currentDate);
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
    if (!item.start) return false;
    return item.start.hasSame(day, 'day') || 
           (item.end && item.start < day.endOf('day') && item.end > day.startOf('day'));
  });
}

// アイテムの重なりを検出して横幅を調整
function getItemsWithLayout(day: DateTime): Array<CalendarItem & { left: number; width: number }> {
  const dayItems = getItemsForDay(day);
  
  // 時間順にソート
  const sorted = [...dayItems].sort((a, b) => {
    if (!a.start || !b.start) return 0;
    return a.start.toMillis() - b.start.toMillis();
  });
  
  // 重なりグループを検出
  const groups: CalendarItem[][] = [];
  let currentGroup: CalendarItem[] = [];
  
  sorted.forEach((item, index) => {
    if (!item.start || !item.end) return;
    
    if (currentGroup.length === 0) {
      currentGroup.push(item);
    } else {
      // 現在のグループの最後のアイテムと重なるかチェック
      const lastItem = currentGroup[currentGroup.length - 1];
      if (lastItem.end && item.start < lastItem.end) {
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
          return !existing.end || !item.start || existing.end <= item.start;
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
  if (!resizingItem || !resizeEdge || !resizingItem.start || !resizingItem.end) return;
  
  const deltaY = event.clientY - resizeStartY;
  const hourHeight = 60;
  const deltaMinutes = (deltaY / hourHeight) * 60;
  
  let newStart = resizingItem.start;
  let newEnd = resizingItem.end;
  
  if (resizeEdge === 'top') {
    // 上端をドラッグ → 開始時刻を変更（日付をまたぐことも可能）
    const rawStart = resizingItem.start.plus({ minutes: deltaMinutes });
    newStart = snapToMinorTick(rawStart, minorTick);
    
    // 開始時刻が終了時刻を超えないようにする
    if (newStart >= resizingItem.end) {
      newStart = resizingItem.end.minus({ minutes: minorTick });
    }
  } else {
    // 下端をドラッグ → 終了時刻を変更（日付をまたぐことも可能）
    const rawEnd = resizingItem.end.plus({ minutes: deltaMinutes });
    newEnd = snapToMinorTick(rawEnd, minorTick);
    
    // 終了時刻が開始時刻を下回らないようにする
    if (newEnd <= resizingItem.start) {
      newEnd = resizingItem.start.plus({ minutes: minorTick });
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
  if (!draggedItem.start || !draggedItem.end) return null;
  
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
  const duration = draggedItem.end.diff(draggedItem.start, 'minutes').minutes;
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
}) {
  // 親コンポーネントに設定変更を通知
  onSettingsChange?.(settings);
}

// アイテムの位置とサイズを計算（横幅調整あり）
function getItemStyle(item: CalendarItem & { left?: number; width?: number }): string {
  if (!item.start || !item.end) return '';
  
  const dayStart = item.start.startOf('day').set({ hour: startHour });
  const minutesFromStart = item.start.diff(dayStart, 'minutes').minutes;
  const duration = item.end.diff(item.start, 'minutes').minutes;
  
  const hourHeight = 60; // 1時間あたりのピクセル高さ
  const top = (minutesFromStart / 60) * hourHeight;
  const height = (duration / 60) * hourHeight;
  
  // 重なり時の横位置・横幅
  const left = item.left !== undefined ? `${item.left}%` : '4px';
  const right = item.width !== undefined ? `${100 - item.left! - item.width}%` : '4px';
  
  if (item.left !== undefined && item.width !== undefined) {
    return `top: ${top}px; height: ${height}px; left: ${left}; right: ${right};`;
  }
  
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
                  onclick={() => handleItemClick(item)}
                  onkeydown={(e) => e.key === 'Enter' && handleItemClick(item)}
                  role="button"
                  tabindex="0"
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
    background: var(--task-bg, rgba(224, 224, 224, 0.85));
    border-left: 4px solid #9e9e9e;
    border-radius: 4px;
  }

  .task.task-todo {
    background: var(--task-todo-bg, rgba(224, 224, 224, 0.85));
    border-left: 4px dashed #9e9e9e; /* 破線で未着手を表現 */
  }

  .task.task-doing {
    background: var(--task-doing-bg, rgba(224, 224, 224, 0.85));
    border-left: 4px solid #9e9e9e; /* 実線で進行中を表現 */
  }

  .task.task-done {
    background: var(--task-done-bg, rgba(224, 224, 224, 0.85));
    border-left: 4px double #9e9e9e; /* 二重線で完了を表現 */
  }

  .task.task-undefined {
    background: rgba(224, 224, 224, 0.85);
    border-left: 4px dotted #9e9e9e; /* 点線で未定義を表現 */
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
    height: 12px;
    cursor: ns-resize;
    z-index: 20;
    pointer-events: auto;
    user-select: none;
    -webkit-user-drag: none;
  }

  .resize-handle-top {
    top: -4px;
  }

  .resize-handle-bottom {
    bottom: -4px;
  }

  .resize-handle:hover {
    background-color: rgba(33, 150, 243, 0.3);
  }

  /* アイテム本体 */
  .item-content {
    padding: 4px 8px;
    flex: 1;
    overflow: hidden;
    cursor: move;
    pointer-events: auto;
  }
  
  .item-content * {
    pointer-events: none; /* 子要素がドラッグを妨げないようにする */
  }
  
  /* カレンダーアイテム全体をドラッグ可能にする */
  .calendar-item {
    cursor: move;
    z-index: 10; /* 横罫線(z-index:1)より上に表示 */
  }
</style>
