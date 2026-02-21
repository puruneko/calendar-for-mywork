<script lang="ts">
import { DateTime } from 'luxon';
import type { CalendarItem } from '../models';
import WeekView from './WeekView.svelte';
import MonthView from './MonthView.svelte';

type ViewType = 'week' | 'month';

type Props = {
  items?: CalendarItem[];
  currentDate?: DateTime;
  viewType?: ViewType;
  // WeekView用設定
  startHour?: number;
  endHour?: number;
  minorTick?: number;
  showWeekend?: boolean;
  showAllDay?: boolean;
  defaultColorOpacity?: number;
  weekStartsOn?: number;
  itemRightMargin?: number;
  showParent?: boolean;
  parentDisplayIndex?: number;
  // MonthView専用設定
  monthMaxItemsPerDay?: number;
  monthWeekStartsOn?: number;
  monthShowWeekend?: boolean;
  monthShowAllDay?: boolean;
  onItemClick?: (item: CalendarItem) => void;
  onItemMove?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;
  onItemResize?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;
  onViewChange?: (date: DateTime) => void;
  onCellClick?: (dateTime: DateTime, clickPosition: { x: number; y: number }) => void;
  onSettingsChange?: (settings: any) => void;
  onMonthSettingsChange?: (settings: { maxItemsPerDay: number; weekStartsOn: number; showWeekend: boolean; showAllDay: boolean; }) => void;
  onViewTypeChange?: (viewType: ViewType) => void;
  onDayClick?: (date: DateTime) => void;
};

let {
  items = [],
  currentDate = DateTime.now(),
  viewType = $bindable('week'),
  startHour = 8,
  endHour = 20,
  minorTick = 15,
  showWeekend = true,
  showAllDay = true,
  defaultColorOpacity = 0.5,
  weekStartsOn = 1,
  itemRightMargin = 10,
  showParent = true,
  parentDisplayIndex = -1,
  monthMaxItemsPerDay = 6,
  monthWeekStartsOn = 1,
  monthShowWeekend = true,
  monthShowAllDay = true,
  onItemClick,
  onItemMove,
  onItemResize,
  onViewChange,
  onCellClick,
  onSettingsChange,
  onMonthSettingsChange,
  onViewTypeChange,
  onDayClick,
}: Props = $props();

function switchToWeek() {
  viewType = 'week';
  onViewTypeChange?.('week');
}

function switchToMonth() {
  viewType = 'month';
  onViewTypeChange?.('month');
}

function handleDayClick(date: DateTime) {
  // 週表示に切り替えて、その日を表示
  viewType = 'week';
  onViewChange?.(date);
  onViewTypeChange?.('week');
  onDayClick?.(date);
}
</script>

<div class="calendar-view">
  <!-- ビュー切り替えボタン -->
  <div class="view-switcher">
    <button 
      class="view-button {viewType === 'week' ? 'active' : ''}"
      onclick={switchToWeek}
    >
      週表示
    </button>
    <button 
      class="view-button {viewType === 'month' ? 'active' : ''}"
      onclick={switchToMonth}
    >
      月表示
    </button>
  </div>

  <!-- ビュー表示 -->
  {#if viewType === 'week'}
    <WeekView
      {items}
      {currentDate}
      {startHour}
      {endHour}
      {minorTick}
      {showWeekend}
      {showAllDay}
      {defaultColorOpacity}
      {weekStartsOn}
      {itemRightMargin}
      {showParent}
      {parentDisplayIndex}
      {onItemClick}
      {onItemMove}
      {onItemResize}
      {onViewChange}
      {onCellClick}
      {onSettingsChange}
    />
  {:else}
    <MonthView
      {items}
      {currentDate}
      maxItemsPerDay={monthMaxItemsPerDay}
      weekStartsOn={monthWeekStartsOn}
      showWeekend={monthShowWeekend}
      showAllDay={monthShowAllDay}
      {onItemClick}
      {onItemMove}
      {onItemResize}
      {onViewChange}
      {onCellClick}
      onDayClick={handleDayClick}
      onSettingsChange={onMonthSettingsChange}
    />
  {/if}
</div>

<style>
  .calendar-view {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .view-switcher {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    background-color: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
  }

  .view-button {
    padding: 8px 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: white;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .view-button:hover {
    background-color: #f0f0f0;
  }

  .view-button.active {
    background-color: #2196f3;
    color: white;
    border-color: #2196f3;
  }
</style>
