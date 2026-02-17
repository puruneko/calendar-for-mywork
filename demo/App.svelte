<script lang="ts">
/**
 * デモアプリケーション
 */

import { DateTime } from 'luxon';
import { WeekView } from '../src/lib/components';
import type { CalendarItem, Task, Appointment } from '../src/lib/models';

// サンプルデータ
let items = $state<CalendarItem[]>([
  // Task examples
  {
    id: '1',
    type: 'task',
    title: 'プロジェクト企画書作成',
    start: DateTime.now().set({ hour: 9, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().set({ hour: 12, minute: 0, second: 0, millisecond: 0 }),
    status: 'doing',
    tags: ['仕事'],
  } as Task,
  {
    id: '2',
    type: 'task',
    title: 'コードレビュー',
    start: DateTime.now().set({ hour: 14, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().set({ hour: 15, minute: 30, second: 0, millisecond: 0 }),
    status: 'todo',
    tags: ['開発'],
  } as Task,
  {
    id: '3',
    type: 'task',
    title: 'ドキュメント更新',
    start: DateTime.now().plus({ days: 1 }).set({ hour: 10, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().plus({ days: 1 }).set({ hour: 11, minute: 30, second: 0, millisecond: 0 }),
    status: 'done',
  } as Task,
  
  // Appointment examples
  {
    id: '4',
    type: 'appointment',
    title: 'チームミーティング',
    start: DateTime.now().set({ hour: 10, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().set({ hour: 11, minute: 0, second: 0, millisecond: 0 }),
  } as Appointment,
  {
    id: '5',
    type: 'appointment',
    title: 'クライアント打ち合わせ',
    start: DateTime.now().plus({ days: 2 }).set({ hour: 14, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().plus({ days: 2 }).set({ hour: 16, minute: 0, second: 0, millisecond: 0 }),
  } as Appointment,
  {
    id: '6',
    type: 'appointment',
    title: 'ランチミーティング',
    start: DateTime.now().plus({ days: 3 }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().plus({ days: 3 }).set({ hour: 13, minute: 0, second: 0, millisecond: 0 }),
  } as Appointment,
]);

let currentDate = $state(DateTime.now());

// イベントハンドラ
function handleItemClick(item: CalendarItem) {
  console.log('Item clicked:', item);
  alert(`クリック: ${item.title}\nタイプ: ${item.type}`);
}

function handleItemMove(item: CalendarItem, newStart: DateTime, newEnd: DateTime) {
  console.log('Item moved:', item, newStart, newEnd);
  items = items.map(i =>
    i.id === item.id
      ? { ...i, start: newStart, end: newEnd }
      : i
  );
}

function handleViewChange(newDate: DateTime) {
  console.log('View changed:', newDate);
  currentDate = newDate;
}
</script>

<div class="demo-app">
  <header class="app-header">
    <h1>📅 Calendar Library Demo</h1>
    <p>Svelte + TypeScript カレンダーUIライブラリのデモ</p>
  </header>
  
  <main class="app-main">
    <WeekView
      {items}
      {currentDate}
      startHour={8}
      endHour={20}
      tickInterval={60}
      onItemClick={handleItemClick}
      onItemMove={handleItemMove}
      onViewChange={handleViewChange}
    />
  </main>
</div>

<style>
  .demo-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #f5f5f5;
  }

  .app-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .app-header h1 {
    font-size: 28px;
    margin-bottom: 8px;
  }

  .app-header p {
    font-size: 14px;
    opacity: 0.9;
  }

  .app-main {
    flex: 1;
    overflow: hidden;
    padding: 16px;
  }

  :global(:root) {
    --calendar-bg: #ffffff;
    --calendar-grid-color: #e0e0e0;
    --calendar-text-color: #333333;
    --task-todo-bg: #90caf9;
    --task-doing-bg: #ffb74d;
    --task-done-bg: #a5d6a7;
    --appointment-bg: #ce93d8;
    --calendar-font-family: 'Segoe UI', sans-serif;
  }
</style>
