<script lang="ts">
import { DateTime } from 'luxon';
import type { CalendarItem } from '../models';
import type { CalendarStorage } from '../storage';
import WeekView from './WeekView.svelte';
import MonthView from './MonthView.svelte';
import EventEditDialog from './EventEditDialog.svelte';

type ViewType = 'week' | 'month';

type Props = {
  items?: CalendarItem[];
  currentDate?: DateTime;
  viewType?: ViewType;
  /** CalendarStorage インスタンス。省略時はデフォルト設定で動作 */
  storage?: CalendarStorage;
  onItemClick?: (item: CalendarItem) => void;
  onItemMove?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;
  onItemResize?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;
  onViewChange?: (date: DateTime) => void;
  onCellClick?: (dateTime: DateTime, clickPosition: { x: number; y: number }) => void;
  onViewTypeChange?: (viewType: ViewType) => void;
  onDayClick?: (date: DateTime) => void;
  /** アイテム更新コールバック（編集ダイアログで保存時に呼ばれる） */
  onItemUpdate?: (item: CalendarItem) => void;
  /** アイテム削除コールバック（編集ダイアログで削除時に呼ばれる） */
  onItemDelete?: (id: string) => void;
};

let {
  items = [],
  currentDate = DateTime.now(),
  viewType = $bindable('week'),
  storage,
  onItemClick,
  onItemMove,
  onItemResize,
  onViewChange,
  onCellClick,
  onViewTypeChange,
  onDayClick,
  onItemUpdate,
  onItemDelete,
}: Props = $props();

// ===== 編集ダイアログ状態 =====
let editingItem = $state<CalendarItem | null>(null);

function handleItemDblClick(item: CalendarItem) {
  editingItem = item;
}

function handleDialogSave(updated: CalendarItem) {
  onItemUpdate?.(updated);
  editingItem = null;
}

function handleDialogDelete(id: string) {
  onItemDelete?.(id);
  editingItem = null;
}

function handleDialogClose() {
  editingItem = null;
}

function switchToWeek() {
  viewType = 'week';
  onViewTypeChange?.('week');
}

function switchToMonth() {
  viewType = 'month';
  onViewTypeChange?.('month');
}

function handleDayClick(date: DateTime) {
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
      {storage}
      {onItemClick}
      {onItemMove}
      {onItemResize}
      {onViewChange}
      {onCellClick}
      onItemDblClick={handleItemDblClick}
    />
  {:else}
    <MonthView
      {items}
      {currentDate}
      {storage}
      {onItemClick}
      {onItemMove}
      {onItemResize}
      {onViewChange}
      {onCellClick}
      onDayClick={handleDayClick}
      onItemDblClick={handleItemDblClick}
    />
  {/if}
</div>

<!-- 編集ダイアログ -->
{#if editingItem}
  <EventEditDialog
    item={editingItem}
    onSave={handleDialogSave}
    onDelete={handleDialogDelete}
    onClose={handleDialogClose}
  />
{/if}

<style>
  .calendar-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
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
