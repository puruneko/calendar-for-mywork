<script lang="ts">
import { DateTime } from 'luxon';
import type { CalendarItem } from '../models';
import type { CalendarStorage } from '../storage';
import WeekView from './WeekView.svelte';
import MonthView from './MonthView.svelte';
import EventEditDialog from './EventEditDialog.svelte';
import {
  toISODate, diffDays,
  updateTimedItem, updateAllDayItem, updatePointItem,
} from '../models';

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
  /** タグ → スタイルのマップ（タグベーススタイル自動適用） */
  tagStyleMap?: Record<string, Partial<CSSStyleDeclaration>>;
};

let {
  items = [],
  currentDate,
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
  tagStyleMap,
}: Props = $props();

// ===== 内部状態 =====
let internalItems = $state<CalendarItem[]>([...items]);
let internalCurrentDate = $state<DateTime>(currentDate ?? DateTime.now());

// 外部 items prop が変化したら同期
$effect(() => {
  internalItems = [...items];
});

// 外部 currentDate prop が提供・変化したら同期
$effect(() => {
  if (currentDate !== undefined) {
    internalCurrentDate = currentDate;
  }
});

// ===== 既定ハンドラ =====
function defaultHandleItemMove(item: CalendarItem, newStart: DateTime, newEnd: DateTime) {
  internalItems = internalItems.map(i => {
    if (i.id !== item.id) return i;
    if (i.temporal.kind === 'CalendarDateRange') {
      const span = diffDays(i.temporal);
      const newStartDate = toISODate(newStart.startOf('day'));
      const newEndDate = toISODate(newStart.startOf('day').plus({ days: span }));
      return updateAllDayItem(i, { start: newStartDate, endExclusive: newEndDate });
    }
    if (i.temporal.kind === 'CalendarDatePoint') {
      return updatePointItem(i, toISODate(newStart.startOf('day')));
    }
    if (i.temporal.kind === 'CalendarDateTimePoint') {
      return updatePointItem(i, newStart);
    }
    return updateTimedItem(i, newStart, newEnd);
  });
}

function defaultHandleItemResize(item: CalendarItem, newStart: DateTime, newEnd: DateTime) {
  internalItems = internalItems.map(i => {
    if (i.id !== item.id) return i;
    if (i.temporal.kind === 'CalendarDateRange') {
      return updateAllDayItem(i, {
        start: toISODate(newStart.startOf('day')),
        endExclusive: toISODate(newEnd.startOf('day')),
      });
    }
    return updateTimedItem(i, newStart, newEnd);
  });
}

function defaultHandleItemUpdate(updated: CalendarItem) {
  internalItems = internalItems.map(i => i.id === updated.id ? updated : i);
}

function defaultHandleItemDelete(id: string) {
  internalItems = internalItems.filter(i => i.id !== id);
}

// ===== アイテム操作（既定ハンドラは常に実行、ユーザーコールバックは追加フック） =====
function handleItemMove(item: CalendarItem, newStart: DateTime, newEnd: DateTime) {
  defaultHandleItemMove(item, newStart, newEnd);
  onItemMove?.(item, newStart, newEnd);
}

function handleItemResize(item: CalendarItem, newStart: DateTime, newEnd: DateTime) {
  defaultHandleItemResize(item, newStart, newEnd);
  onItemResize?.(item, newStart, newEnd);
}

// ===== 編集ダイアログ状態 =====
let editingItem = $state<CalendarItem | null>(null);

function handleItemDblClick(item: CalendarItem) {
  editingItem = item;
}

function handleDialogSave(updated: CalendarItem) {
  defaultHandleItemUpdate(updated);
  onItemUpdate?.(updated);
  editingItem = null;
}

function handleDialogDelete(id: string) {
  defaultHandleItemDelete(id);
  onItemDelete?.(id);
  editingItem = null;
}

function handleDialogClose() {
  editingItem = null;
}

// ===== ビュー制御 =====
function switchToWeek() {
  viewType = 'week';
  onViewTypeChange?.('week');
}

function switchToMonth() {
  viewType = 'month';
  onViewTypeChange?.('month');
}

function handleViewChange(date: DateTime) {
  internalCurrentDate = date;
  onViewChange?.(date);
}

function handleDayClick(date: DateTime) {
  viewType = 'week';
  internalCurrentDate = date;
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
      items={internalItems}
      currentDate={internalCurrentDate}
      {storage}
      {onItemClick}
      onItemMove={handleItemMove}
      onItemResize={handleItemResize}
      onViewChange={handleViewChange}
      {onCellClick}
      {tagStyleMap}
      onItemDblClick={handleItemDblClick}
    />
  {:else}
    <MonthView
      items={internalItems}
      currentDate={internalCurrentDate}
      {storage}
      {onItemClick}
      onItemMove={handleItemMove}
      onItemResize={handleItemResize}
      onViewChange={handleViewChange}
      {onCellClick}
      {tagStyleMap}
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
