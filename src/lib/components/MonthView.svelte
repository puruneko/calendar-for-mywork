<script lang="ts">
import { DateTime } from 'luxon';
import type { CalendarItem } from '../models';
import { formatTime } from '../utils';

type Props = {
  items?: CalendarItem[];
  currentDate?: DateTime;
  onItemClick?: (item: CalendarItem) => void;
  onViewChange?: (date: DateTime) => void;
  onCellClick?: (dateTime: DateTime, clickPosition: { x: number; y: number }) => void;
};

let {
  items = [],
  currentDate = DateTime.now(),
  onItemClick,
  onViewChange,
  onCellClick,
}: Props = $props();

// 月の全ての日付を取得（前月・翌月の日も含む）
function getMonthDays(date: DateTime): DateTime[] {
  const startOfMonth = date.startOf('month');
  const endOfMonth = date.endOf('month');
  
  // 月初の曜日（週の何日目か）
  const startWeekday = startOfMonth.weekday; // 1=月曜、7=日曜
  
  // カレンダー表示開始日（月曜始まり）
  const calendarStart = startOfMonth.minus({ days: startWeekday - 1 });
  
  // 6週間分（42日）表示
  const days: DateTime[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(calendarStart.plus({ days: i }));
  }
  
  return days;
}

let monthDays = $derived(getMonthDays(currentDate));

// 週ごとにグループ化
let weeks = $derived(() => {
  const result: DateTime[][] = [];
  for (let i = 0; i < 6; i++) {
    result.push(monthDays.slice(i * 7, (i + 1) * 7));
  }
  return result;
});

// 日をまたがるアイテムかどうかを判定
function isMultiDayItem(item: CalendarItem): boolean {
  if (!item.start || !item.end) return false;
  return !item.start.hasSame(item.end, 'day');
}

// アイテムを日付ごとにグループ化
function getItemsForDay(day: DateTime): CalendarItem[] {
  return items.filter(item => {
    if (!item.start || !item.end) return false;
    return item.start.hasSame(day, 'day') || 
           (item.start < day.endOf('day') && item.end > day.startOf('day'));
  });
}

// アイテムの背景色を取得
function getItemBgColor(item: CalendarItem): string {
  if (item.style?.backgroundColor) {
    return item.style.backgroundColor as string;
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
</script>

<div class="month-view">
  <!-- ヘッダー -->
  <div class="month-header">
    <button class="nav-button" onclick={prevMonth}>&lt;</button>
    <h2 class="month-title">{currentDate.toFormat('yyyy年M月')}</h2>
    <button class="nav-button" onclick={nextMonth}>&gt;</button>
  </div>

  <!-- 曜日ヘッダー -->
  <div class="weekday-header">
    <div class="weekday">月</div>
    <div class="weekday">火</div>
    <div class="weekday">水</div>
    <div class="weekday">木</div>
    <div class="weekday">金</div>
    <div class="weekday">土</div>
    <div class="weekday">日</div>
  </div>

  <!-- カレンダーグリッド -->
  <div class="calendar-grid">
    {#each weeks as week}
      {#each week as day}
        {@const dayItems = getItemsForDay(day)}
        {@const isToday = day.hasSame(DateTime.now(), 'day')}
        {@const isCurrentMonth = day.hasSame(currentDate, 'month')}
        
        <div 
          class="day-cell {isToday ? 'today' : ''} {!isCurrentMonth ? 'other-month' : ''}"
          onclick={(e) => handleCellClick(e, day)}
        >
          <div class="day-number">{day.day}</div>
          
          <div class="day-items">
            {#each dayItems as item (item.id)}
              {#if isMultiDayItem(item)}
                {#if item.start && item.start.hasSame(day, 'day')}
                  <div 
                    class="month-item multi-day-item"
                    style="background-color: {getItemBgColor(item)};"
                    onclick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                  >
                    {item.title}
                  </div>
                {/if}
              {:else}
                <div 
                  class="month-item single-day-item"
                  onclick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                >
                  <span class="item-dot" style="background-color: {getItemBgColor(item)};"></span>
                  <span class="item-time">{item.start ? formatTime(item.start) : ''}</span>
                  <span class="item-title">{item.title}</span>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/each}
    {/each}
  </div>
</div>

<style>
  .month-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: white;
  }

  .month-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
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

  .weekday-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    border-bottom: 1px solid #e0e0e0;
  }

  .weekday {
    padding: 12px;
    text-align: center;
    font-weight: 600;
    font-size: 14px;
    color: #666;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: repeat(6, 1fr);
    flex: 1;
    border-left: 1px solid #e0e0e0;
    border-top: 1px solid #e0e0e0;
  }

  .day-cell {
    border-right: 1px solid #e0e0e0;
    border-bottom: 1px solid #e0e0e0;
    padding: 4px;
    overflow: hidden;
    cursor: pointer;
    min-height: 100px;
  }

  .day-cell:hover {
    background-color: #f9f9f9;
  }

  .day-cell.today {
    background-color: rgba(255, 0, 0, 0.05);
  }

  .day-cell.other-month {
    background-color: #fafafa;
  }

  .day-cell.other-month .day-number {
    color: #ccc;
  }

  .day-number {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
    color: #333;
  }

  .day-items {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .month-item {
    cursor: pointer;
  }

  .multi-day-item {
    padding: 2px 6px;
    font-size: 12px;
    border-radius: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #333;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }

  .single-day-item {
    padding: 2px 4px;
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
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
</style>
