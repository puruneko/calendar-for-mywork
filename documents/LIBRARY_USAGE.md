# ライブラリ利用者向けガイド

## インストール

```bash
npm install svelte-calendar-lib
```

## 基本的な使い方

### 1. データの準備

```typescript
import { DateTime } from 'luxon';
import type { Task, Appointment } from 'svelte-calendar-lib';

const tasks: Task[] = [
  {
    id: '1',
    type: 'task',
    title: 'プロジェクト企画書作成',
    start: DateTime.now().set({ hour: 9, minute: 0 }),
    end: DateTime.now().set({ hour: 12, minute: 0 }),
    status: 'doing',
    tags: ['仕事'],
  },
  {
    id: '2',
    type: 'task',
    title: 'コードレビュー',
    start: DateTime.now().set({ hour: 14, minute: 0 }),
    end: DateTime.now().set({ hour: 15, minute: 30 }),
    status: 'todo',
  },
];

const appointments: Appointment[] = [
  {
    id: '3',
    type: 'appointment',
    title: 'チームミーティング',
    start: DateTime.now().set({ hour: 10, minute: 0 }),
    end: DateTime.now().set({ hour: 11, minute: 0 }),
  },
];

const items = [...tasks, ...appointments];
```

### 2. CalendarView（週/月統合ビュー）の使用

```svelte
<script lang="ts">
  import { CalendarView } from 'svelte-calendar-lib';
  import { DateTime } from 'luxon';
  import type { CalendarItem } from 'svelte-calendar-lib';

  let items = $state<CalendarItem[]>([...]);
  let currentDate = $state(DateTime.now());
  let viewType = $state<'week' | 'month'>('week');

  function handleItemMove(item: CalendarItem, newStart: DateTime, newEnd: DateTime) {
    // データを更新
    items = items.map(i => 
      i.id === item.id 
        ? { ...i, start: newStart, end: newEnd }
        : i
    );
  }

  function handleItemClick(item: CalendarItem) {
    console.log('Clicked:', item);
  }

  function handleDayClick(date: DateTime) {
    // 月表示で日をクリックすると、その日の週表示に切り替わる
    currentDate = date;
    viewType = 'week';
  }
</script>

<CalendarView 
  {items}
  {currentDate}
  bind:viewType
  onItemMove={handleItemMove}
  onItemClick={handleItemClick}
  onDayClick={handleDayClick}
/>
```

### 3. WeekView（週表示のみ）の使用

```svelte
<script lang="ts">
  import { WeekView } from 'svelte-calendar-lib';
  import { DateTime } from 'luxon';
  import type { CalendarItem } from 'svelte-calendar-lib';

  let items = $state<CalendarItem[]>([...]);
  let currentDate = $state(DateTime.now());

  function handleItemMove(item: CalendarItem, newStart: DateTime, newEnd: DateTime) {
    items = items.map(i => 
      i.id === item.id 
        ? { ...i, start: newStart, end: newEnd }
        : i
    );
  }

  function handleItemResize(item: CalendarItem, newStart: DateTime, newEnd: DateTime) {
    items = items.map(i => 
      i.id === item.id 
        ? { ...i, start: newStart, end: newEnd }
        : i
    );
  }

  function handleItemClick(item: CalendarItem) {
    console.log('Clicked:', item);
  }
</script>

<WeekView 
  {items}
  {currentDate}
  startHour={8}
  endHour={20}
  minorTick={15}
  onItemMove={handleItemMove}
  onItemResize={handleItemResize}
  onItemClick={handleItemClick}
/>
```

### 4. MonthView（月表示のみ）の使用

```svelte
<script lang="ts">
  import { MonthView } from 'svelte-calendar-lib';
  import { DateTime } from 'luxon';
  import type { CalendarItem } from 'svelte-calendar-lib';

  let items = $state<CalendarItem[]>([...]);
  let currentDate = $state(DateTime.now());

  function handleItemClick(item: CalendarItem) {
    console.log('Clicked:', item);
  }

  function handleDayClick(date: DateTime) {
    console.log('Day clicked:', date);
    // 例: 週表示に切り替える
  }
</script>

<MonthView 
  {items}
  {currentDate}
  onItemClick={handleItemClick}
  onDayClick={handleDayClick}
/>
```

## API リファレンス

### CalendarView Props

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-----------|------|------|-----------|------|
| `items` | `CalendarItem[]` | ✔ | - | 表示するアイテムリスト |
| `currentDate` | `DateTime` | ✔ | - | 表示基準日 |
| `viewType` | `'week' \| 'month'` | - | `'week'` | 表示モード |
| `startHour` | `number` | - | `8` | 表示開始時刻（0-23） |
| `endHour` | `number` | - | `20` | 表示終了時刻（1-24） |
| `minorTick` | `number` | - | `15` | マイナーグリッド線の間隔、DnD移動単位（分） |
| `showWeekend` | `boolean` | - | `true` | 週末を表示するか |
| `showAllDay` | `boolean` | - | `true` | 全日イベントを表示するか |
| `defaultColorOpacity` | `number` | - | `0.5` | デフォルト色の透明度（0.0-1.0） |
| `weekStartsOn` | `number` | - | `1` | 週開始曜日（1=月曜） |
| `itemRightMargin` | `number` | - | `10` | アイテム右余白（px） |
| `showParent` | `boolean` | - | `true` | 親タスクを表示するか |
| `parentDisplayIndex` | `number` | - | `-1` | 親タスク表示インデックス |

### WeekView Props

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-----------|------|------|-----------|------|
| `items` | `CalendarItem[]` | ✔ | - | 表示するアイテムリスト |
| `currentDate` | `DateTime` | ✔ | - | 表示基準日（週の決定に使用） |
| `startHour` | `number` | - | `8` | 表示開始時刻（0-23） |
| `endHour` | `number` | - | `20` | 表示終了時刻（1-24） |
| `majorTick` | `number` | - | `60` | メジャーグリッド線の間隔（分） |
| `minorTick` | `number` | - | `15` | マイナーグリッド線の間隔、DnD移動単位（分） |
| `showWeekend` | `boolean` | - | `true` | 週末を表示するか |
| `showAllDay` | `boolean` | - | `true` | 全日イベントを表示するか |
| `defaultColorOpacity` | `number` | - | `0.5` | デフォルト色の透明度（0.0-1.0） |
| `weekStartsOn` | `number` | - | `1` | 週開始曜日（1=月曜） |
| `itemRightMargin` | `number` | - | `10` | アイテム右余白（px） |
| `showParent` | `boolean` | - | `true` | 親タスクを表示するか |
| `parentDisplayIndex` | `number` | - | `-1` | 親タスク表示インデックス |

### MonthView Props

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-----------|------|------|-----------|------|
| `items` | `CalendarItem[]` | ✔ | - | 表示するアイテムリスト |
| `currentDate` | `DateTime` | ✔ | - | 表示基準日 |

### Events（共通）

| イベント | 型 | 説明 |
|---------|------|------|
| `onItemClick` | `(item: CalendarItem) => void` | アイテムがクリックされた時 |
| `onItemMove` | `(item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void` | アイテムがドラッグ移動された時（WeekView） |
| `onItemResize` | `(item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void` | アイテムがリサイズされた時（WeekView） |
| `onViewChange` | `(newDate: DateTime) => void` | 週/月の表示が変更された時 |
| `onCellClick` | `(dateTime: DateTime, clickPosition: { x: number; y: number }) => void` | セルがクリックされた時 |
| `onDayClick` | `(date: DateTime) => void` | 日がクリックされた時（MonthView） |
| `onSettingsChange` | `(settings: any) => void` | 設定が変更された時（WeekView） |
| `onViewTypeChange` | `(viewType: 'week' \| 'month') => void` | 表示モードが変更された時（CalendarView） |

## データモデル

### CalendarItem (基底)

```typescript
interface CalendarItem {
  id: string;
  type: 'task' | 'appointment';
  title: string;
  start?: DateTime;
  end?: DateTime;
  tags?: string[];
  description?: string;
}
```

### Task

```typescript
interface Task extends CalendarItem {
  type: 'task';
  status: 'todo' | 'doing' | 'done' | 'undefined';
  parentId?: string;
}
```

### Appointment

```typescript
interface Appointment extends CalendarItem {
  type: 'appointment';
}
```

## カスタマイズ

### CSS変数

```css
:root {
  --calendar-bg: #ffffff;
  --calendar-grid-color: #e0e0e0;
  --calendar-text-color: #333333;
  --task-todo-bg: #90caf9;
  --task-doing-bg: #ffb74d;
  --task-done-bg: #a5d6a7;
  --appointment-bg: #ce93d8;
  --calendar-font-family: 'Segoe UI', sans-serif;
}
```

### アイテム単位のカスタムスタイル

```typescript
const items: CalendarItem[] = [
  {
    id: '1',
    type: 'task',
    title: 'VIP会議',
    start: DateTime.now().set({ hour: 14 }),
    end: DateTime.now().set({ hour: 15 }),
    status: 'todo',
    customStyle: {
      backgroundColor: '#ff5252',  // 赤色の背景
      color: '#ffffff',            // 白色のテキスト
      opacity: 0.9,
    }
  }
];
```

### スタイルのオーバーライド

```svelte
<style>
  :global(.calendar-item) {
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
</style>
```

### 親子関係の表示

```typescript
const items: CalendarItem[] = [
  {
    id: 'parent-1',
    type: 'task',
    title: '親タスク',
    start: DateTime.now().set({ hour: 9 }),
    end: DateTime.now().set({ hour: 17 }),
    status: 'doing',
  },
  {
    id: 'child-1',
    type: 'task',
    title: '子タスク',
    start: DateTime.now().set({ hour: 10 }),
    end: DateTime.now().set({ hour: 12 }),
    status: 'doing',
    parentId: 'parent-1',  // 親タスクを参照
  }
];
```

`showParent={true}` にすると、子タスクの表示時に親タスクも表示されます。

## 使用例

### VSCode拡張での利用

```typescript
// extension.ts
import { WeekView } from 'svelte-calendar-lib';

const panel = vscode.window.createWebviewPanel(
  'calendar',
  'Calendar',
  vscode.ViewColumn.One,
  {}
);

panel.webview.html = getWebviewContent();
```

### Obsidianプラグインでの利用

```typescript
// main.ts
import { Plugin } from 'obsidian';
import { WeekView } from 'svelte-calendar-lib';

export default class CalendarPlugin extends Plugin {
  async onload() {
    // カレンダービューの登録
  }
}
```

## FAQ

**Q: TaskとAppointmentの違いは？**
A: Taskは成果を前提とする作業単位で、完了・進捗の概念を持ちます。Appointmentは時間拘束そのもので、完了概念を持ちません。

**Q: データは誰が管理する？**
A: 利用側が管理します。カレンダーは描画専用で、データを直接変更しません。すべての変更はイベント経由で通知されます。

**Q: 日付計算はどうする？**
A: 必ずLuxonを使用してください。JavaScriptのDate型を直接操作しないでください。

**Q: スタイルは自由にカスタマイズできる？**
A: はい。CSS変数を上書きすることで、カラーやフォントを自由に変更できます。
