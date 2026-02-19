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
│  │  CalendarView                │  │
│  │  - Week/Month Switcher       │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│    ┌────────┴────────┐             │
│    ↓                 ↓             │
│  ┌─────────┐    ┌──────────┐      │
│  │WeekView │    │MonthView │      │
│  │+ DnD    │    │+ Events  │      │
│  │+ Resize │    │          │      │
│  └─────────┘    └──────────┘      │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Data Models                 │  │
│  │  - CalendarItem (interface)  │  │
│  │  - Task                      │  │
│  │  - Appointment               │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Utils                       │  │
│  │  - dateUtils                 │  │
│  │  - dndUtils                  │  │
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

### 4.1 CalendarView.svelte

**責務**:
- 週表示/月表示の切り替え
- 共通のナビゲーション機能
- 設定の統合管理

**Props**:
```typescript
{
  items: CalendarItem[];
  currentDate: DateTime;
  viewType: 'week' | 'month';  // 表示モード
  // WeekView用
  startHour?: number;
  endHour?: number;
  minorTick?: number;
  showWeekend?: boolean;
  showAllDay?: boolean;
  // その他
  onViewTypeChange?: (viewType: 'week' | 'month') => void;
  // ... その他のイベントハンドラ
}
```

### 4.2 WeekView.svelte

**責務**:
- 1週間分のカレンダーグリッド描画
- Task/Appointmentの配置とレンダリング
- DnD（ドラッグ&ドロップ）機能
- リサイズ機能
- 現在時刻線の表示

**Props**:
```typescript
{
  items: CalendarItem[];           // 表示するアイテム
  currentDate: DateTime;           // 表示基準日
  startHour?: number;              // 表示開始時刻（デフォルト: 8）
  endHour?: number;                // 表示終了時刻（デフォルト: 20）
  majorTick?: number;              // メジャーグリッド線の間隔（デフォルト: 60分）
  minorTick?: number;              // マイナーグリッド線の間隔、DnD移動単位（デフォルト: 15分）
  showWeekend?: boolean;           // 週末表示（デフォルト: true）
  showAllDay?: boolean;            // 全日イベント表示（デフォルト: true）
  defaultColorOpacity?: number;    // デフォルト色の透明度（デフォルト: 0.5）
  weekStartsOn?: number;           // 週開始曜日（1=月曜、デフォルト: 1）
  itemRightMargin?: number;        // アイテム右余白（デフォルト: 10px）
  showParent?: boolean;            // 親タスク表示（デフォルト: true）
  parentDisplayIndex?: number;     // 親タスク表示インデックス（デフォルト: -1）
}
```

**Events**:
```typescript
{
  onItemClick?: (item: CalendarItem) => void;
  onItemMove?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;
  onItemResize?: (item: CalendarItem, newStart: DateTime, newEnd: DateTime) => void;
  onViewChange?: (newDate: DateTime) => void;
  onCellClick?: (dateTime: DateTime, clickPosition: { x: number; y: number }) => void;
  onSettingsChange?: (settings: any) => void;
}
```

**主要機能**:
- Z-index層管理（グリッド線、アイテム、リサイズハンドル、現在時刻線など）
- DnDプレビュー表示
- リサイズハンドル（上端/下端）
- カスタムスタイル適用（アイテム単位）
- 親子関係の表示

### 4.3 MonthView.svelte

**責務**:
- 月カレンダーグリッドの描画
- 日単位のアイテム表示
- 月間ナビゲーション

**Props**:
```typescript
{
  items: CalendarItem[];
  currentDate: DateTime;
  onItemClick?: (item: CalendarItem) => void;
  onViewChange?: (date: DateTime) => void;
  onCellClick?: (dateTime: DateTime, clickPosition: { x: number; y: number }) => void;
  onDayClick?: (date: DateTime) => void;  // 日クリックで週表示へ切り替え
}
```

**主要機能**:
- 42日表示（6週間）
- 複数日にまたがるアイテムの表示
- オーバーレイ機能（進行中）

### 4.4 SettingsModal.svelte

**責務**:
- カレンダー設定のUI
- 設定値のバリデーション

**Props**:
```typescript
{
  show: boolean;
  settings: {
    startHour: number;
    endHour: number;
    minorTick: number;
    showWeekend: boolean;
    showAllDay: boolean;
    // ... その他の設定
  };
  onClose?: () => void;
  onSave?: (settings: any) => void;
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

## 9. スタイリング規約

### 9.1 z-index管理

**原則**: z-indexのハードコーディングは**禁止**。CSS変数で集中管理する。

**定義場所**: `demo/App.svelte` の `:global(:root)`

```css
:global(:root) {
  /* z-index階層の定義（集中管理） */
  --z-base: 1;                      /* 基本レベル（グリッド線など） */
  --z-timeline: 5;                  /* タイムライン、ドラッグプレビュー */
  --z-cell-expanded: 10;            /* 展開セル、カレンダーアイテム */
  --z-resize-handle: 20;            /* リサイズハンドル */
  --z-dnd-dragging: 100;            /* ドラッグ中のアイテム、現在時刻線 */
  --z-modal-backdrop: 1000;         /* モーダル背景 */
  --z-modal-content: 1001;          /* モーダルコンテンツ */
  --z-month-expanded-items: 1000;   /* MonthView展開エリア */
  --z-month-expanded-header: 1001;  /* MonthView展開時の日付 */
}
```

**使用方法**:
```css
.calendar-item {
  z-index: var(--z-cell-expanded);  /* ✅ 正しい */
}

.modal-backdrop {
  z-index: 1000;  /* ❌ 禁止：ハードコーディング */
}
```

**理由**:
- 重複や競合を防ぐ
- 階層構造を一元管理
- 変更時の影響範囲を最小化
- 開発者が全体のz-index構造を把握しやすい

**違反時の対応**:
ハードコードされたz-indexを発見した場合は、即座にCSS変数に置き換える。

---

## 10. テスト戦略

### 10.1 単体テスト (Vitest)
**実装済み: 33件**

- **dateUtils (10件)**
  - 週の日付取得
  - 時間スロット生成
  - 時刻フォーマット
  - スナップ処理

- **dndUtils (23件)**
  - DnD位置計算
  - 時間変換
  - スナップ処理
  - 重複チェック

### 10.2 E2Eテスト (Playwright)
**実装済み: 7ファイル**

- **calendar.spec.ts**: 基本カレンダー機能
  - アイテム表示
  - クリックイベント
  - ナビゲーション

- **custom-style.spec.ts**: カスタムスタイル機能
  - アイテム単位のスタイル適用
  - 色/透明度のカスタマイズ

- **dnd.spec.ts**: ドラッグ&ドロップ
  - アイテム移動
  - スナップ処理
  - イベント発火

- **month-view.spec.ts**: 月表示
  - 月カレンダー表示
  - 日クリック → 週表示切り替え

- **resize-and-settings.spec.ts**: リサイズと設定
  - リサイズハンドル操作
  - 設定モーダル

- **resize.spec.ts**: リサイズ機能詳細
  - 上端/下端ハンドル
  - 時間調整

- **tick-and-timeline.spec.ts**: 時間軸
  - majorTick/minorTick設定
  - 現在時刻線表示

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
