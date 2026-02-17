<script lang="ts">
/**
 * WeekView - 1週間表示カレンダーコンポーネント
 * 
 * 縦軸: 時間（00:00 - 24:00）
 * 横軸: 曜日（月曜日 - 日曜日）
 */

import { DateTime } from 'luxon';
import type { CalendarItem } from '../models';
import { getWeekDays, formatTime, formatWeekday, generateTimeSlots } from '../utils';

interface Props {
  /** 表示するアイテムリスト */
  items: CalendarItem[];
  
  /** 表示基準日（週の決定に使用） */
  currentDate: DateTime;
  
  /** 表示開始時刻（0-23） */
  startHour?: number;
  
  /** 表示終了時刻（1-24） */
  endHour?: number;
  
  /** 時間軸の刻み（分単位） */
  tickInterval?: number;
  
  /** アイテムクリック時のイベントハンドラ */
  onItemClick?: (item: CalendarItem) => void;
  
  /** アイテム移動時のイベントハンドラ */
  onItemMove?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;
  
  /** アイテムリサイズ時のイベントハンドラ */
  onItemResize?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;
  
  /** 表示週変更時のイベントハンドラ */
  onViewChange?: (newDate: DateTime) => void;
}

let {
  items = [],
  currentDate = DateTime.now(),
  startHour = 0,
  endHour = 24,
  tickInterval = 60,
  onItemClick,
  onItemMove,
  onItemResize,
  onViewChange,
}: Props = $props();

// 週の日付リストを取得
let weekDays = $derived(getWeekDays(currentDate));

// 時間スロットを生成
let timeSlots = $derived(generateTimeSlots(startHour, endHour, tickInterval));

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
  onItemClick?.(item);
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
    <button class="nav-button" onclick={goToPreviousWeek}>◀</button>
    <button class="nav-button today" onclick={goToToday}>今日</button>
    <span class="week-title">
      {weekDays[0].toFormat('yyyy年M月d日')} - {weekDays[6].toFormat('M月d日')}
    </span>
    <button class="nav-button" onclick={goToNextWeek}>▶</button>
  </div>

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
        <div class="day-grid">
          {#each timeSlots as slot}
            <div class="grid-cell"></div>
          {/each}

          <!-- アイテム表示 -->
          <div class="items-container">
            {#each getItemsForDay(day) as item (item.id)}
              <div
                class={getItemClass(item)}
                style={getItemStyle(item)}
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
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    pointer-events: auto;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
</style>
