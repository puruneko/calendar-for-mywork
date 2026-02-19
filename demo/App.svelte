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
    parents: ['新規事業プロジェクト', '企画フェーズ'],
  } as Task,
  {
    id: '2',
    type: 'task',
    title: 'コードレビュー',
    start: DateTime.now().set({ hour: 14, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().set({ hour: 15, minute: 30, second: 0, millisecond: 0 }),
    status: 'todo',
    tags: ['開発'],
    parents: ['機能開発Sprint#5', '開発フェーズ', 'QA'],
  } as Task,
  {
    id: '3',
    type: 'task',
    title: 'ドキュメント更新',
    start: DateTime.now().plus({ days: 1 }).set({ hour: 10, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().plus({ days: 1 }).set({ hour: 11, minute: 30, second: 0, millisecond: 0 }),
    status: 'done',
    parents: ['UIリニューアル', 'ドキュメント整備'],
  } as Task,
  
  // Appointment examples
  {
    id: '4',
    type: 'appointment',
    title: 'チームミーティング',
    start: DateTime.now().set({ hour: 10, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().set({ hour: 11, minute: 0, second: 0, millisecond: 0 }),
    parents: ['週次定例会'],
  } as Appointment,
  {
    id: '5',
    type: 'appointment',
    title: 'クライアント打ち合わせ',
    start: DateTime.now().plus({ days: 2 }).set({ hour: 14, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().plus({ days: 2 }).set({ hour: 16, minute: 0, second: 0, millisecond: 0 }),
    parents: ['A社案件', '要件定義フェーズ'],
  } as Appointment,
  {
    id: '6',
    type: 'appointment',
    title: 'ランチミーティング',
    start: DateTime.now().plus({ days: 3 }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().plus({ days: 3 }).set({ hour: 13, minute: 0, second: 0, millisecond: 0 }),
    // parentsなし（トップレベル）
  } as Appointment,
  
  // カスタムスタイルのサンプル
  {
    id: '7',
    type: 'task',
    title: 'カスタムスタイル1 (赤背景)',
    start: DateTime.now().set({ hour: 16, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().set({ hour: 17, minute: 30, second: 0, millisecond: 0 }),
    status: 'todo',
    style: {
      backgroundColor: '#ff5252',
      color: '#ffffff',
      fontWeight: 'bold',
    },
  } as Task,
  {
    id: '8',
    type: 'task',
    title: 'カスタムスタイル2 (緑背景+斜体)',
    start: DateTime.now().plus({ days: 1 }).set({ hour: 13, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().plus({ days: 1 }).set({ hour: 14, minute: 30, second: 0, millisecond: 0 }),
    status: 'doing',
    style: {
      backgroundColor: '#4caf50',
      color: '#fff',
      fontStyle: 'italic',
      borderRadius: '8px',
    },
  } as Task,
  {
    id: '9',
    type: 'appointment',
    title: 'カスタムスタイル3 (青背景+影)',
    start: DateTime.now().plus({ days: 1 }).set({ hour: 15, minute: 30, second: 0, millisecond: 0 }),
    end: DateTime.now().plus({ days: 1 }).set({ hour: 17, minute: 0, second: 0, millisecond: 0 }),
    style: {
      backgroundColor: 'rgb(33, 150, 243)',
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)',
      border: '2px solid #1976d2',
    },
  } as Appointment,
  {
    id: '10',
    type: 'task',
    title: 'カスタムスタイル4 (グラデーション)',
    start: DateTime.now().plus({ days: 2 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().plus({ days: 2 }).set({ hour: 10, minute: 30, second: 0, millisecond: 0 }),
    status: 'done',
    style: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#fff',
      fontWeight: '600',
      borderRadius: '12px',
    },
  } as Task,
  {
    id: '11',
    type: 'appointment',
    title: 'カスタムスタイル5 (オレンジ+点線)',
    start: DateTime.now().plus({ days: 3 }).set({ hour: 14, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().plus({ days: 3 }).set({ hour: 15, minute: 30, second: 0, millisecond: 0 }),
    style: {
      backgroundColor: '#ff9800',
      color: '#333',
      border: '3px dotted #f57c00',
      fontSize: '14px',
    },
  } as Appointment,
  {
    id: '12',
    type: 'task',
    title: 'カスタムスタイル6 (透明度指定済み)',
    start: DateTime.now().plus({ days: 2 }).set({ hour: 11, minute: 0, second: 0, millisecond: 0 }),
    end: DateTime.now().plus({ days: 2 }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 }),
    status: 'todo',
    style: {
      backgroundColor: 'rgba(156, 39, 176, 0.9)', // 透明度指定済み（上書きされない）
      color: '#fff',
      textDecoration: 'underline',
    },
  } as Task,
]);

let currentDate = $state(DateTime.now());

// カレンダー設定
let startHour = $state(8);
let endHour = $state(20);
let minorTick = $state(15);
let showWeekend = $state(true);
let showAllDay = $state(true);
let defaultColorOpacity = $state(0.5);
let weekStartsOn = $state(1);
let itemRightMargin = $state(10);
let showParent = $state(true);
let parentDisplayIndex = $state(-1);

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

function handleItemResize(item: CalendarItem, newStart: DateTime, newEnd: DateTime) {
  console.log('Item resized:', item, newStart, newEnd);
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

function handleSettingsChange(settings: {
  minorTick: number;
  startHour: number;
  endHour: number;
  showWeekend: boolean;
  showAllDay: boolean;
  defaultColorOpacity: number;
  weekStartsOn: number;
  itemRightMargin: number;
  showParent: boolean;
  parentDisplayIndex: number;
}) {
  console.log('Settings changed:', settings);
  minorTick = settings.minorTick;
  startHour = settings.startHour;
  endHour = settings.endHour;
  showWeekend = settings.showWeekend;
  showAllDay = settings.showAllDay;
  defaultColorOpacity = settings.defaultColorOpacity;
  weekStartsOn = settings.weekStartsOn;
  itemRightMargin = settings.itemRightMargin;
  showParent = settings.showParent;
  parentDisplayIndex = settings.parentDisplayIndex;
}

function handleCellClick(dateTime: DateTime, clickPosition: { x: number; y: number }) {
  console.log('Cell clicked!');
  console.log('DateTime:', dateTime.toISO());
  console.log('Click Position:', clickPosition);
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
      tickInterval={60}
      onItemClick={handleItemClick}
      onItemMove={handleItemMove}
      onItemResize={handleItemResize}
      onViewChange={handleViewChange}
      onCellClick={handleCellClick}
      onSettingsChange={handleSettingsChange}
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
