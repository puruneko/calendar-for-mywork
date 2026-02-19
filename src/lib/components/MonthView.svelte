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
  onDayClick?: (date: DateTime) => void;
};

let {
  items = [],
  currentDate = DateTime.now(),
  onItemClick,
  onViewChange,
  onCellClick,
  onDayClick,
}: Props = $props();

// セル展開状態（展開されている日を保持）
let expandedDay: DateTime | null = $state(null);

// 1日あたりの最大表示アイテム数（通常時）
const MAX_ITEMS_PER_DAY = 3;

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

// 複数日にまたがるアイテムがその日に含まれるか判定
function isItemInDay(item: CalendarItem, day: DateTime): boolean {
  if (!item.start || !item.end) return false;
  const dayStart = day.startOf('day');
  const dayEnd = day.endOf('day');
  return item.start <= dayEnd && item.end >= dayStart;
}

// 複数日アイテムの表示スタイル（継続を示すために角を調整）
function getMultiDayItemClass(item: CalendarItem, day: DateTime): string {
  if (!item.start || !item.end) return '';
  
  const isStart = item.start.hasSame(day, 'day');
  const isEnd = item.end.hasSame(day, 'day');
  
  if (isStart && isEnd) return '';
  if (isStart) return 'multi-day-start';
  if (isEnd) return 'multi-day-end';
  return 'multi-day-continue';
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

// +N more クリック（セル展開）
function handleMoreClick(event: MouseEvent, day: DateTime) {
  event.stopPropagation();
  expandedDay = day;
}

// hideクリック（セル折りたたみ）
function handleHideClick(event: MouseEvent) {
  event.stopPropagation();
  expandedDay = null;
}

// セルが展開されているかチェック
function isExpanded(day: DateTime): boolean {
  return expandedDay !== null && expandedDay.hasSame(day, 'day');
}

// 週内の複数日アイテムを取得（週をまたがない範囲で）
function getMultiDayItemsForWeek(week: DateTime[]): Array<{item: CalendarItem, startIndex: number, span: number}> {
  const result: Array<{item: CalendarItem, startIndex: number, span: number}> = [];
  const processedItems = new Set<string>();
  
  // 週が空の場合は早期リターン
  if (week.length === 0) return result;
  
  items.forEach(item => {
    if (!isMultiDayItem(item) || !item.start || !item.end) return;
    if (processedItems.has(item.id)) return;
    
    // この週に含まれるかチェック
    const weekStart = week[0].startOf('day');
    const weekEnd = week[week.length - 1].endOf('day'); // 最後の日を使用
    
    if (item.start > weekEnd || item.end < weekStart) return;
    
    // 週内での開始インデックスとスパンを計算
    let startIndex = -1;
    let endIndex = -1;
    
    week.forEach((day, index) => {
      const dayStart = day.startOf('day');
      const dayEnd = day.endOf('day');
      
      // このアイテムがこの日に含まれるか
      if (item.start! <= dayEnd && item.end! >= dayStart) {
        if (startIndex === -1) {
          startIndex = index;
        }
        endIndex = index;
      }
    });
    
    if (startIndex !== -1 && endIndex !== -1) {
      result.push({
        item,
        startIndex,
        span: endIndex - startIndex + 1
      });
      processedItems.add(item.id);
    }
  });
  
  return result;
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
  <div class="calendar-body">
    {#each weeks as week, weekIndex}
      <div class="week-row">
        <!-- 複数日アイテムエリア -->
        <div class="multi-day-area">
          {#each getMultiDayItemsForWeek(week) as {item, startIndex, span}}
            <div 
              class="multi-day-bar"
              style="
                grid-column: {startIndex + 1} / span {span};
                background-color: {getItemBgColor(item)};
              "
              onclick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
            >
              {item.title}
            </div>
          {/each}
        </div>
        
        <!-- 日セル -->
        <div class="day-cells">
          {#each week as day}
            {@const dayItems = getItemsForDay(day).filter(item => !isMultiDayItem(item))}
            {@const isToday = day.hasSame(DateTime.now(), 'day')}
            {@const isCurrentMonth = day.hasSame(currentDate, 'month')}
            {@const expanded = isExpanded(day)}
            
            <div 
              class="day-cell {isToday ? 'today' : ''} {!isCurrentMonth ? 'other-month' : ''} {expanded ? 'expanded' : ''}"
              onclick={(e) => handleCellClick(e, day)}
            >
              <div 
                class="day-number"
                onclick={(e) => handleDayNumberClick(e, day)}
              >
                {day.day}
              </div>
              
              <div class="day-items">
                {#each (expanded ? dayItems : dayItems.slice(0, MAX_ITEMS_PER_DAY)) as item (item.id)}
                  <div 
                    class="month-item single-day-item"
                    onclick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                  >
                    <span class="item-dot" style="background-color: {getItemBgColor(item)};"></span>
                    <span class="item-time">{item.start ? formatTime(item.start) : ''}</span>
                    <span class="item-title">{item.title}</span>
                  </div>
                {/each}
                
                {#if !expanded && dayItems.length > MAX_ITEMS_PER_DAY}
                  <div 
                    class="more-items"
                    onclick={(e) => handleMoreClick(e, day)}
                  >
                    +{dayItems.length - MAX_ITEMS_PER_DAY} more
                  </div>
                {/if}
                
                {#if expanded}
                  <div 
                    class="hide-items"
                    onclick={(e) => handleHideClick(e)}
                  >
                    hide
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  
</div>

<style>
  .month-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: white;
    min-height: 0; /* flexアイテムのデフォルトmin-heightを上書き */
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

  .calendar-body {
    flex: 1;
    overflow-y: auto;
    border-left: 1px solid #e0e0e0;
    border-top: 1px solid #e0e0e0;
    min-height: 0; /* flexアイテムのデフォルトmin-heightを上書き */
  }

  .week-row {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid #e0e0e0;
  }

  .multi-day-area {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    padding: 4px;
    min-height: 24px;
    background-color: #fafafa;
  }

  .multi-day-bar {
    padding: 2px 6px;
    font-size: 12px;
    border-radius: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #333;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    min-height: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .multi-day-bar:hover {
    opacity: 0.8;
  }

  .day-cells {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
  }

  .day-cell {
    border-right: 1px solid #e0e0e0;
    border-bottom: 1px solid #e0e0e0;
    padding: 4px;
    overflow: hidden;
    cursor: pointer;
    min-height: 100px;
    position: relative;
  }

  .day-cell:hover {
    background-color: #f9f9f9;
  }

  .day-cell.expanded {
    overflow: visible;
    z-index: var(--z-cell-expanded);
    min-height: auto;
  }

  .day-cell.expanded .day-items {
    /* セルの下部から展開 */
    position: absolute;
    top: 0;
    left: -1px; /* 左の枠線を重ねる */
    right: -1px; /* 右の枠線を重ねる */
    background-color: white;
    border: 1px solid #e0e0e0; /* セルと同じ枠線 */
    padding: 4px;
    padding-top: 24px; /* 日付の高さ分を確保 */
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    z-index: var(--z-month-expanded-items);
    max-height: none; /* 制限なし */
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
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    display: inline-block;
    position: relative;
    z-index: var(--z-base);
  }

  /* 展開されたセルの日付は最前面に */
  .day-cell.expanded .day-number {
    z-index: var(--z-month-expanded-header);
  }

  .day-number:hover {
    background-color: rgba(33, 150, 243, 0.1);
    color: #2196f3;
  }

  .day-items {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
    flex: 1;
  }

  .month-item {
    cursor: pointer;
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

  .more-items {
    padding: 2px 4px;
    font-size: 11px;
    color: #2196f3;
    cursor: pointer;
    font-weight: 500;
  }

  .more-items:hover {
    text-decoration: underline;
  }

  .hide-items {
    font-size: 11px;
    color: #666;
    cursor: pointer;
    padding: 4px 8px;
    text-align: center;
    border-radius: 2px;
    margin-top: 4px;
    border-top: 1px solid #e0e0e0;
    background-color: #f5f5f5;
    font-weight: 500;
  }

  .hide-items:hover {
    background-color: #e0e0e0;
  }
</style>
