<script lang="ts">
import { DateTime } from 'luxon';
import type { CalendarItem } from '../models';
import { formatTime, getItemStart, getItemEnd, itemContainsDay, isTimed } from '../utils';

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

// DnD状態
let draggedItem = $state<CalendarItem | null>(null);
let dragOverDay = $state<DateTime | null>(null);
let dragOffsetDays = $state<number>(0); // ドラッグ開始時のアイテム内での相対位置（日数）

// リサイズ状態
let resizingItem = $state<CalendarItem | null>(null);
let resizeEdge = $state<'left' | 'right' | null>(null);
let resizeStartX = $state<number>(0);
let resizeStartDay = $state<DateTime | null>(null);

// 1日あたりの最大表示アイテム数（通常時）
// セルの高さが140pxで、日付番号(22px) + 複数日バー(20px*N) + 単日アイテム(20px*N) + パディング
// 余裕を持って5アイテム表示可能
const MAX_ITEMS_PER_DAY = 5;

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

// リサイズ開始（複数日バーの左端/右端）
function handleResizeStart(event: MouseEvent, item: CalendarItem, edge: 'left' | 'right') {
  event.stopPropagation();
  event.preventDefault();
  
  // 親要素のdraggableを無効化
  const target = event.currentTarget as HTMLElement;
  const parentBar = target.closest('.multi-day-bar') as HTMLElement;
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
  
  // セルの幅を取得（最初のセルを参照）
  const firstCell = document.querySelector('.day-cell') as HTMLElement;
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
  const allBars = document.querySelectorAll('.multi-day-bar');
  allBars.forEach(el => {
    (el as HTMLElement).setAttribute('draggable', 'true');
  });
  
  resizingItem = null;
  resizeEdge = null;
  resizeStartX = 0;
  resizeStartDay = null;
}

// DnD: ドラッグ開始
function handleDragStart(event: DragEvent, item: CalendarItem, startDayIndex?: number, weekDays?: DateTime[]) {
  draggedItem = item;
  
  // マルチデイバーの場合、つかんだ位置（アイテム内での相対日数）を計算
  if (startDayIndex !== undefined && weekDays && isMultiDayItem(item)) {
    const itemStart = getItemStart(item);
    const target = event.target as HTMLElement;
    const barElement = target.closest('.multi-day-bar') as HTMLElement;
    
    if (itemStart && barElement) {
      // バーの左端からマウス位置までの距離を計算
      const barRect = barElement.getBoundingClientRect();
      const mouseX = event.clientX;
      const relativeX = mouseX - barRect.left;
      
      // テーブルセルの幅を取得（週の最初のセルから）
      const firstCell = barElement.closest('tr')?.querySelector('.day-cell') as HTMLElement;
      const cellWidth = firstCell?.getBoundingClientRect().width || 100;
      
      // マウス位置からつかんだセルのインデックスを計算
      const grabbedCellOffset = Math.floor(relativeX / cellWidth);
      dragOffsetDays = grabbedCellOffset;
      
      const grabDay = weekDays[startDayIndex + grabbedCellOffset];
      console.debug(`[MonthView DnD] Grabbed multi-day item: startDayIndex=${startDayIndex}, mouseX=${mouseX}, barLeft=${barRect.left}, relativeX=${relativeX}, cellWidth=${cellWidth}, grabbedCellOffset=${grabbedCellOffset}, grabDay=${grabDay?.toISODate()}, dragOffsetDays=${dragOffsetDays}`);
    }
  } else {
    dragOffsetDays = 0;
    console.debug(`[MonthView DnD] Grabbed single-day item or no offset, dragOffsetDays=0`);
  }
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
  }
}

// DnD: ドラッグ終了
function handleDragEnd() {
  draggedItem = null;
  dragOverDay = null;
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

// 週内の複数日アイテムを取得（レーン割り当て付き）
function getMultiDayItemsForWeek(week: DateTime[]): Array<{item: CalendarItem, startIndex: number, span: number, lane: number}> {
  const result: Array<{item: CalendarItem, startIndex: number, span: number, lane: number}> = [];
  const processedItems = new Set<string>();
  
  // 週が空の場合は早期リターン
  if (week.length === 0) return result;
  
  // まず全てのアイテムを収集
  const allItems: Array<{item: CalendarItem, startIndex: number, span: number}> = [];
  
  items.forEach(item => {
    if (!isMultiDayItem(item)) return;
    if (processedItems.has(item.id)) return;
    
    const itemStart = getItemStart(item);
    const itemEnd = getItemEnd(item);
    if (!itemStart || !itemEnd) return;
    
    // この週に含まれるかチェック
    const weekStart = week[0].startOf('day');
    const weekEnd = week[week.length - 1].endOf('day');
    
    if (itemStart > weekEnd || itemEnd < weekStart) return;
    
    // 週内での開始インデックスとスパンを計算
    let startIndex = -1;
    let endIndex = -1;
    
    week.forEach((day, index) => {
      if (itemContainsDay(item, day)) {
        if (startIndex === -1) {
          startIndex = index;
        }
        endIndex = index;
      }
    });
    
    if (startIndex !== -1 && endIndex !== -1) {
      allItems.push({
        item,
        startIndex,
        span: endIndex - startIndex + 1
      });
      processedItems.add(item.id);
    }
  });
  
  // レーン割り当てアルゴリズム
  // 各レーンが占有している範囲を追跡
  const lanes: Array<Array<{start: number, end: number}>> = [];
  
  allItems.forEach(({item, startIndex, span}) => {
    const itemEnd = startIndex + span - 1;
    
    // 空いているレーンを探す
    let assignedLane = -1;
    for (let i = 0; i < lanes.length; i++) {
      const laneOccupied = lanes[i];
      let canFit = true;
      
      // このレーンに既に配置されているアイテムと重なりチェック
      for (const occupied of laneOccupied) {
        if (!(itemEnd < occupied.start || startIndex > occupied.end)) {
          // 重なる
          canFit = false;
          break;
        }
      }
      
      if (canFit) {
        assignedLane = i;
        break;
      }
    }
    
    // 空いているレーンがない場合、新しいレーンを作成
    if (assignedLane === -1) {
      assignedLane = lanes.length;
      lanes.push([]);
    }
    
    // レーンに配置
    lanes[assignedLane].push({ start: startIndex, end: itemEnd });
    
    result.push({
      item,
      startIndex,
      span,
      lane: assignedLane
    });
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

  <!-- カレンダーコンテンツ（スクロール可能） -->
  <div class="calendar-content">
    <!-- カレンダーテーブル -->
    <table class="calendar-table">
    <!-- 曜日ヘッダー -->
    <thead>
      <tr class="weekday-header">
        <th class="weekday">月</th>
        <th class="weekday">火</th>
        <th class="weekday">水</th>
        <th class="weekday">木</th>
        <th class="weekday">金</th>
        <th class="weekday">土</th>
        <th class="weekday">日</th>
      </tr>
    </thead>

    <!-- カレンダーボディ -->
    <tbody class="calendar-body">
      {#each weeks as week, weekIndex}
        {@const multiDayItemsInWeek = getMultiDayItemsForWeek(week)}
        
        <tr class="week-row">
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
            {@const isToday = day.hasSame(DateTime.now(), 'day')}
            {@const isCurrentMonth = day.hasSame(currentDate, 'month')}
            {@const expanded = isExpanded(day)}
            
            <td 
              class="day-cell"
              class:today={isToday}
              class:other-month={!isCurrentMonth}
              class:expanded={expanded}
              class:drag-over={dragOverDay?.hasSame(day, 'day')}
              onclick={(e) => handleCellClick(e, day)}
              ondragover={(e) => handleDragOver(e, day)}
              ondrop={(e) => handleDrop(e, day)}
            >
              <div 
                class="day-number"
                onclick={(e) => handleDayNumberClick(e, day)}
              >
                {day.day}
              </div>
              
              <!-- 複数日アイテムのスペーサー（レーン分のスペースを確保） -->
              <div class="multi-day-spacers">
                {#each Array(multiDayCountForThisDay) as _, laneIndex}
                  <div class="multi-day-spacer">
                    <!-- このセルが開始日で、このレーンに配置されるバーを表示 -->
                    {#each multiDayItemsInWeek.filter(({startIndex, lane}) => dayIndex === startIndex && lane === laneIndex) as {item, span}}
                      <div 
                        class="multi-day-bar"
                        draggable="true"
                        ondragstart={(e) => handleDragStart(e, item, dayIndex, week)}
                        ondragend={handleDragEnd}
                        style="
                          background-color: {getItemBgColor(item)};
                          width: {span === 1 ? '100%' : `calc(${span * 100}% + ${(span - 1) * 9}px)`};
                        "
                      >
                        <!-- リサイズハンドル（左端） -->
                        <div 
                          class="resize-handle resize-handle-left"
                          onmousedown={(e) => handleResizeStart(e, item, 'left')}
                          ondragstart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          draggable="false"
                        ></div>
                        
                        <!-- バー本体 -->
                        <div 
                          class="bar-content"
                          onclick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                        >
                          {item.title}
                        </div>
                        
                        <!-- リサイズハンドル（右端） -->
                        <div 
                          class="resize-handle resize-handle-right"
                          onmousedown={(e) => handleResizeStart(e, item, 'right')}
                          ondragstart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          draggable="false"
                        ></div>
                      </div>
                    {/each}
                  </div>
                {/each}
              </div>
              
              <div class="day-items">
                {#if expanded}
                  <!-- 展開時: 全アイテム（複数日 + 単日）を表示 -->
                  {@const allDayItems = getItemsForDay(day)}
                  {@const multiDayItems = allDayItems.filter(item => isMultiDayItem(item))}
                  {@const singleDayItemsExpanded = allDayItems.filter(item => !isMultiDayItem(item))}
                  
                  <!-- 複数日アイテム -->
                  {#each multiDayItems as item (item.id)}
                    <div 
                      class="month-item multi-day-item-expanded"
                      draggable="true"
                      ondragstart={(e) => handleDragStart(e, item)}
                      ondragend={handleDragEnd}
                      onclick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                    >
                      <span class="item-dot" style="background-color: {getItemBgColor(item)};"></span>
                      <span class="item-time">{isTimed(item) && getItemStart(item) ? formatTime(getItemStart(item)!) : ''}</span>
                      <span class="item-title">{item.title}</span>
                    </div>
                  {/each}
                  
                  <!-- 単日アイテム -->
                  {#each singleDayItemsExpanded as item (item.id)}
                    <div 
                      class="month-item single-day-item"
                      draggable="true"
                      ondragstart={(e) => handleDragStart(e, item)}
                      ondragend={handleDragEnd}
                      onclick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                    >
                      <span class="item-dot" style="background-color: {getItemBgColor(item)};"></span>
                      <span class="item-time">{isTimed(item) && getItemStart(item) ? formatTime(getItemStart(item)!) : ''}</span>
                      <span class="item-title">{item.title}</span>
                    </div>
                  {/each}
                {:else}
                  <!-- 通常時: 単日アイテムのみ表示 -->
                  {#each singleDayItems.slice(0, remainingSlots) as item (item.id)}
                    <div 
                      class="month-item single-day-item"
                      draggable="true"
                      ondragstart={(e) => handleDragStart(e, item)}
                      ondragend={handleDragEnd}
                      onclick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                    >
                      <span class="item-dot" style="background-color: {getItemBgColor(item)};"></span>
                      <span class="item-time">{isTimed(item) && getItemStart(item) ? formatTime(getItemStart(item)!) : ''}</span>
                      <span class="item-title">{item.title}</span>
                    </div>
                  {/each}
                {/if}
                
                {#if !expanded && overflowCount > 0}
                  <div 
                    class="more-items"
                    onclick={(e) => handleMoreClick(e, day)}
                  >
                    +{overflowCount} more
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
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
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

  .calendar-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  }

  .weekday-header {
    border-bottom: 1px solid #e0e0e0;
  }

  .weekday {
    padding: 12px;
    text-align: center;
    font-weight: 600;
    font-size: 14px;
    color: #666;
    border: 1px solid #e0e0e0;
  }

  .calendar-body {
  }

  .week-row {
  }

  .multi-day-spacer {
    height: 18px;
    margin-bottom: 2px;
    position: relative;
    overflow: visible; /* バーがはみ出せるように */
  }

  .multi-day-bar {
    padding: 0;
    font-size: 11px;
    border-radius: 3px;
    color: #333;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    height: 18px;
    cursor: move;
    display: flex;
    align-items: center;
    position: absolute;
    top: 0;
    left: 0;
    z-index: var(--z-base);
  }

  .multi-day-bar:hover {
    opacity: 0.8;
  }

  .multi-day-bar:active {
    cursor: grabbing;
  }

  .bar-content {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: auto;
    padding: 2px 6px;
    display: flex;
    align-items: center;
  }

  .resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 4px;
    cursor: ew-resize;
    z-index: 10;
    pointer-events: auto;
    user-select: none;
    -webkit-user-drag: none;
    background-color: rgba(158, 158, 158, 0);
    transition: background-color 0.2s ease;
  }

  .resize-handle-left {
    left: 0;
  }

  .resize-handle-right {
    right: 0;
  }

  .multi-day-bar:hover .resize-handle {
    background-color: rgba(158, 158, 158, 0.4);
  }



  .day-cell {
    border: 1px solid #e0e0e0;
    padding: 4px;
    cursor: pointer;
    height: 150px; /* 固定高さ */
    position: relative;
    vertical-align: top;
    width: 14.28%; /* 7列なので 100/7 - table-layout: fixedで均等に */
    overflow: visible; /* 複数日バーがはみ出せるように */
  }

  .day-cell:hover {
    background-color: #f9f9f9;
  }

  .day-cell.drag-over {
    background-color: rgba(33, 150, 243, 0.1);
    box-shadow: inset 0 0 0 2px rgba(33, 150, 243, 0.5);
  }

  .day-cell.expanded {
    z-index: var(--z-cell-expanded);
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
    overflow-y: auto; /* スクロール可能に */
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

  .multi-day-spacers {
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: visible; /* 複数日バーがはみ出せるように */
  }

  .day-items {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto !important; /* スクロール可能に（必須） */
    overflow-x: hidden; /* 横方向は隠す */
    flex: 1;
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
