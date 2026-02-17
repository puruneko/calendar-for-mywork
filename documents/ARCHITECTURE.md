# アーキテクチャ設計

## 1. 全体構成

```
┌─────────────────────────────────────┐
│     External Application            │
│  (VSCode, Obsidian, Web App, etc.)  │
└──────────────┬──────────────────────┘
               │
               │ props (data)
               │ event handlers
               ↓
┌─────────────────────────────────────┐
│   Calendar UI Library (Svelte)      │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  WeekView Component          │  │
│  │  - Rendering Engine          │  │
│  │  - Event Dispatcher          │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Data Models                 │  │
│  │  - CalendarItem (interface)  │  │
│  │  - Task                      │  │
│  │  - Appointment               │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 2. データフロー（一方向）

```
External Data Store
    ↓ (props)
Calendar Component
    ↓ (user interaction)
Event Dispatch (onItemMove, onItemClick, etc.)
    ↓ (event handler)
External Handler
    ↓ (update)
External Data Store
    ↓ (props update)
Re-render Calendar
```

**重要**: カレンダーは自分でデータを変更しない。すべてイベント経由で外部に通知。

## 3. データモデル

### 3.1 CalendarItem (基底インターフェース)

```typescript
interface CalendarItem {
  id: string;           // 一意識別子
  type: 'task' | 'appointment';
  title: string;        // 表示名
  start?: DateTime;     // 開始日時（Luxon DateTime）
  end?: DateTime;       // 終了日時
  tags?: string[];      // タグ
  description?: string; // 詳細
}
```

### 3.2 Task

```typescript
interface Task extends CalendarItem {
  type: 'task';
  status: 'todo' | 'doing' | 'done' | 'undefined';
  parentId?: string;    // 親タスクID（階層構造用）
}
```

**特徴**:
- 成果を前提とする作業単位
- 完了・進捗の概念を持つ
- 時間を占有しないTaskも許容

### 3.3 Appointment

```typescript
interface Appointment extends CalendarItem {
  type: 'appointment';
}
```

**特徴**:
- 時間拘束そのもの
- 完了概念を持たない
- start/endは必須（時間占有が前提）

## 4. コンポーネント設計

### 4.1 WeekView.svelte

**責務**:
- 1週間分のカレンダーグリッド描画
- Task/Appointmentの配置とレンダリング
- ユーザー操作の検知とイベント発火

**Props**:
```typescript
{
  items: CalendarItem[];      // 表示するアイテム
  currentDate: DateTime;      // 表示基準日
  startHour?: number;         // 表示開始時刻（デフォルト: 0）
  endHour?: number;           // 表示終了時刻（デフォルト: 24）
  tickInterval?: number;      // 時間軸の刻み（分単位、デフォルト: 60）
}
```

**Events**:
```typescript
{
  onItemClick?: (item: CalendarItem) => void;
  onItemMove?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;
  onItemResize?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;
  onViewChange?: (newDate: DateTime) => void;
}
```

## 5. レンダリング戦略

### 5.1 初期実装（シンプル）
- 全アイテムをDOM要素として描画
- CSS Grid / Flexboxによるレイアウト
- ~1,000件まで対応

### 5.2 最適化（将来）
- 仮想スクロール（表示範囲のみ描画）
- SVGベースレンダリング
- 10,000件対応

## 6. スタイリング方針

### 6.1 CSS変数によるカスタマイズ

```css
:root {
  --calendar-bg: #ffffff;
  --calendar-grid-color: #e0e0e0;
  --calendar-text-color: #333333;
  --task-todo-bg: #90caf9;
  --task-doing-bg: #ffb74d;
  --task-done-bg: #a5d6a7;
  --appointment-bg: #ce93d8;
}
```

### 6.2 デザイン原則
- メトロ系配色
- 企業利用可能な控えめデザイン
- 過度な装飾禁止
- 角丸は適度（border-radius: 4px程度）

## 7. データ管理モード

### モードA: 外部管理型（推奨）

```svelte
<script>
  let items = $state([...]); // 外部で管理

  function handleItemMove(item, newStart, newEnd) {
    // 外部でデータ更新
    items = items.map(i => 
      i.id === item.id 
        ? { ...i, start: newStart, end: newEnd }
        : i
    );
  }
</script>

<WeekView {items} onItemMove={handleItemMove} />
```

### モードB: 内部管理型（将来実装）

```svelte
<script>
  import { createCalendar } from 'svelte-calendar-lib';
  
  const calendar = createCalendar();
  calendar.addItem({ ... });
</script>

<WeekView calendar={calendar} />
```

## 8. 非機能要件

- **環境非依存**: Node.js専用APIを使わない
- **グローバル汚染禁止**: window等に副作用を出さない
- **DOM直操作禁止**: Svelteのリアクティブシステムを活用
- **日付計算**: 必ずLuxonを使用（Date型の直接操作禁止）
- **パフォーマンス**: 最初から最適化しない。問題が出たら対処

## 9. テスト戦略

### 9.1 単体テスト (Vitest)
- データモデルのバリデーション
- ユーティリティ関数のロジック
- コンポーネントの基本的な描画

### 9.2 E2Eテスト (Playwright)
- カレンダー表示の確認
- アイテムのクリック・移動
- 週の切り替え

## 10. ビルド成果物

```
dist/
├── index.js          # ESM形式のライブラリ
├── index.d.ts        # TypeScript型定義
└── style.css         # デフォルトスタイル（オプション）
```

**使用例**:
```typescript
import { WeekView } from 'svelte-calendar-lib';
import type { Task, Appointment } from 'svelte-calendar-lib';
```
