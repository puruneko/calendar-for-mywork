


## 📋 プロダクト改善計画 概要

**目的**: calendar-for-mywork を「見るだけツール」から「管理可能なツール」へ進化させる

**実装対象機能**:
1. **イベント編集ダイアログ** - Outlook風レイアウト、カスタムスタイル編集機能
2. **ビジネスアワー設定** - 営業時間の視覚化（グローバル+個別設定対応）
3. **タグベースのスタイル自動適用** - メトロカラー推奨、条件付きスタイル変更（期限超過・完了）

**デリバリー**: 各フェーズ完了時点で「動く機能」を提供

---

## 🏗️ アーキテクチャ概要

### ストア状態管理（イメージ）

```typescript
// 新規: src/lib/stores/eventEditDialog.ts
export const selectedItem = writable<CalendarItem | null>(null);
export const isEventEditDialogOpen = writable<boolean>(false);

export function openEventEditDialog(item: CalendarItem) {
  selectedItem.set(item);
  isEventEditDialogOpen.set(true);
}

export function closeEventEditDialog() {
  isEventEditDialogOpen.set(false);
  selectedItem.set(null);
}
```

### コンポーネント配置

```
WeekView.svelte / MonthView.svelte
    ↓ (ダブルクリック検知)
    setSelectedItem(item) → ストア更新
    ↓
EventEditDialog.svelte
    ↓ (ストア subscribe)
    表示/非表示の切り替え
    ↓ (保存/削除)
    ストア更新 + カレンダーリフレッシュ
```

---

## 🎨 機能 1: イベント編集ダイアログ

### 1-1. 概要

カレンダーアイテムをダブルクリックすると、詳細編集ダイアログが表示される。
ユーザーはここでアイテムの情報を確認・編集・削除できる。

### 1-2. UI レイアウト（Outlook風）

```
┌───────────────────────────────────────────────────────┐
│ タイトル入力欄                          [style] 件     │ ← 【上部】
├───────────────────────────────────────────────────────┤
│                                                         │
│ 【中部】開始・終了時間 + AllDay スイッチ               │
│ ┌─────────────────┬─────────────────┬──────────────┐  │
│ │ 2025年1月15日   │                 │              │  │
│ │ 09:00 - 17:30   │ [AllDay スイッチ] │             │  │
│ └─────────────────┴─────────────────┴──────────────┘  │
│                                                         │
│ 【タグ】                                                │
│ [タグ1] [タグ2] [タグ3] [× リセット]                   │
│ オプション: タグ追加ボタンまたは入力フィールド        │
│                                                         │
│ 【説明・メモ】                                          │
│ ┌──────────────────────────────────────────────────┐  │
│ │ (テキストエリア × 5行程度)                        │  │
│ │                                                   │  │
│ │                                                   │  │
│ └──────────────────────────────────────────────────┘  │
│                                                         │
├───────────────────────────────────────────────────────┤
│ [キャンセル] [削除] [保存]                              │ ← 【下部】
└───────────────────────────────────────────────────────┘
```

### 1-3. タイトル（上部）

```
┌─────────────────────────────┬──────────────┐
│ [テキスト入力 - タイトル]   │ [style] ボタン │
└─────────────────────────────┴──────────────┘

【style ボタン】
        ↓ クリック
┌─────────────────────────────────────────┐
│ スタイル設定                              │
├─────────────────────────────────────────┤
│ キー          │ 値                       │
├───────────────┼─────────────────────────┤
│ color         │ #009bbf                 │
│ backgroundColor │ (空)                  │
│ borderWidth   │ 2px                     │
│ ...           │ [+ 行追加]              │
└─────────────────────────────────────────┘
```

**仕様**:
- **style ボタン**: 別モーダル（またはサイドパネル）で CSS key/value テーブル編集
- **CSS key/value テーブル**:
  - 各行: `[key 入力] | [value 入力] | [削除ボタン]`
  - 最後の行に `[+ 行追加]` ボタン
  - 例: `borderColor | #ff0000` → `style.borderColor = '#ff0000'`
  - 入力値は CalendarItem.style に直接保存される

### 1-4. 中部：開始・終了時間 + AllDay スイッチ

```
┌─────────────────────────┬──────────────────────┐
│ 開始時刻                   │ AllDay              │
│ [日付選択] [時刻選択]     │ [トグルスイッチ ◯  ] │
│ 2025-01-15  09:00       │                     │
│                          │                     │
│ 終了時刻                   │                     │
│ [日付選択] [時刻選択]     │                     │
│ 2025-01-15  17:30       │                     │
└─────────────────────────┴──────────────────────┘
```

**仕様**:
- **開始・終了**: datetime-local 入力、またはネイティブ日時選択ウィジェット
- **AllDay スイッチ**:
  - ON → 開始・終了の時刻部分を隠す（日付のみ表示）
  - OFF → 時刻も表示
- **バリデーション**: 終了時刻 > 開始時刻、またはエラー表示

### 1-5. タグ入力

```
┌──────────────────────────────────────────┐
│ [タグ1] [×]  [タグ2] [×]  [タグ3] [×]   │
│ [タグ入力エリア]                          │
│ (「,」で区切るか Enter で追加？)         │
└──────────────────────────────────────────┘
```

**仕様**:
- タグは `CalendarItem.tags: string[]` として保存
- 既存タグはチップ + 削除ボタン表示
- 新規タグ入力フィールド（Enter または , で追加）
- タグごとに対応する style が適用される（後述）

### 1-6. 説明・メモ

```
┌──────────────────────────────────────────┐
│ (テキストエリア × 5行)                    │
│ ここにメモを入力                          │
│                                            │
│                                            │
│                                            │
└──────────────────────────────────────────┘
```

**仕様**:
- `CalendarItem.description` に保存
- 1000字以下推奨

### 1-7. ボタン動作

| ボタン | 動作 | 確認 |
|--------|------|------|
| **キャンセル** | ダイアログ閉じて変更破棄 | なし |
| **削除** | アイテムを削除（確認ダイアログ表示） | **あり** |
| **保存** | 変更をストア/メモリに保存して閉じる | バリデーション後 |

### 1-8. 削除時の確認ダイアログ

```
┌─────────────────────────────────────┐
│ アイテムを削除します                 │
│                                      │
│ 「○○○○」                          │
│ 2025年1月15日 09:00 - 17:30        │
│                                      │
│ この操作は取り消せません。            │
│ 本当に削除しますか？               │
│                                      │
│ [キャンセル] [削除]                  │
└─────────────────────────────────────┘
```

### 1-9. バリデーション

| フィールド | ルール | エラーメッセージ |
|-----------|--------|-----------------|
| タイトル | 1字以上 | 「タイトルを入力してください」 |
| 開始時刻 | 終了時刻より前 | 「終了時刻は開始時刻より後にしてください」 |
| 終了時刻 | 開始時刻より後 | 「終了時刻は開始時刻より後にしてください」 |
| タグ | (制約なし) | - |
| 説明 | 1000字以下 | 「説明は 1000字以下です」 |

### 1-10. 保存処理

**フロー**:
1. バリデーション実行
2. エラーがあれば、該当フィールド上に赤い枠・エラーメッセージ表示
3. エラーなければ、CalendarItem をストアに保存（更新）
4. ダイアログ自動クローズ
5. 親コンポーネント（WeekView/MonthView）がストア購読で自動リフレッシュ

**コード例**:
```typescript
async function saveItem() {
  // (1) バリデーション
  const errors = validateItem(editingItem);
  if (errors.length > 0) {
    validationErrors.set(errors);
    return;
  }
  
  // (2) 保存
  await updateCalendarItem(editingItem);
  
  // (3) クローズ
  closeEventEditDialog();
}
```

---

## 📅 機能 2: ビジネスアワー設定

### 2-1. 概要

営業時間帯を視覚的に強調表示する機能。営業外の時間帯を薄い灰色で背景に表示することで、
ユーザーが「営業時間内だけを確認すればいい」と判断できるようにする。

### 2-2. 設定場所

**位置**: 既存の「設定」ダイアログに新規セクションを追加

```
【設定ダイアログ】
├─ 【基本設定】
├─ 【表示設定】
│  ├─ 開始時間: [select]
│  ├─ 終了時間: [select]
│  └─ ...
└─ 【営業時間設定】 ← 【新規追加】
   ├─ ☑ 営業時間を表示
   ├─ 月曜日: ☑ 09:00 - 17:30
   ├─ 火曜日: ☑ 09:00 - 17:30
   ├─ 水曜日: ☑ 09:00 - 17:30
   ├─ 木曜日: ☑ 09:00 - 17:30
   ├─ 金曜日: ☑ 09:00 - 17:30
   ├─ 土曜日: ☐ (無効)
   ├─ 日曜日: ☐ (無効)
   └─ [リセット] [保存]
```

### 2-3. データ構造

```typescript
interface BusinessHours {
  enabled: boolean;
  weekDays: {
    monday: { enabled: boolean; startTime: string; endTime: string };
    tuesday: { enabled: boolean; startTime: string; endTime: string };
    wednesday: { enabled: boolean; startTime: string; endTime: string };
    thursday: { enabled: boolean; startTime: string; endTime: string };
    friday: { enabled: boolean; startTime: string; endTime: string };
    saturday: { enabled: boolean; startTime: string; endTime: string };
    sunday: { enabled: boolean; startTime: string; endTime: string };
  };
}

// デフォルト値
const defaultBusinessHours: BusinessHours = {
  enabled: true,
  weekDays: {
    monday: { enabled: true, startTime: "09:00", endTime: "17:30" },
    tuesday: { enabled: true, startTime: "09:00", endTime: "17:30" },
    wednesday: { enabled: true, startTime: "09:00", endTime: "17:30" },
    thursday: { enabled: true, startTime: "09:00", endTime: "17:30" },
    friday: { enabled: true, startTime: "09:00", endTime: "17:30" },
    saturday: { enabled: false, startTime: "00:00", endTime: "00:00" },
    sunday: { enabled: false, startTime: "00:00", endTime: "00:00" }
  }
};
```

**保存先**: `storage.businessHours` （メモリ上、Phase 2 で永続化）

### 2-4. UI コンポーネント

**BusinessHoursSettings.svelte**:
```typescript
// props
export let businessHours: BusinessHours;
export let onSave: (hours: BusinessHours) => void;

// 曜日ループで各行をレンダリング
const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

{#each weekDays as day}
  <div class="business-hours-row">
    <label>{getDayLabel(day)}</label>
    <input 
      type="checkbox" 
      bind:checked={businessHours.weekDays[day].enabled}
    />
    {#if businessHours.weekDays[day].enabled}
      <input 
        type="time" 
        bind:value={businessHours.weekDays[day].startTime}
      />
      <span>-</span>
      <input 
        type="time" 
        bind:value={businessHours.weekDays[day].endTime}
      />
    {/if}
  </div>
{/each}
```

### 2-5. ビジネスアワーの描画（WeekView）

**描画時のロジック**:

```typescript
function renderBusinessHoursOverlay(dayOfWeek: string, totalHours: number): void {
  const dayConfig = businessHours.weekDays[dayOfWeek];
  
  if (!dayConfig.enabled) return; // 営業時間なし
  
  // (1) 営業開始・終了を分単位に変換
  const startMinutes = timeToMinutes(dayConfig.startTime);     // 例: 09:00 → 540
  const endMinutes = timeToMinutes(dayConfig.endTime);         // 例: 17:30 → 1050
  
  // (2) ピクセル位置を計算
  const pixelsPerMinute = hourlyCellHeight / 60;
  const startPixel = startMinutes * pixelsPerMinute;
  const height = (endMinutes - startMinutes) * pixelsPerMinute;
  
  // (3)営業外時間帯のオーバーレイを描画
  // 営業開始前
  renderOverlay({
    top: 0,
    height: startPixel,
    backgroundColor: 'rgba(0, 0, 0, 0.04)'
  });
  
  // 営業終了後
  renderOverlay({
    top: startPixel + height,
    height: totalPixels - (startPixel + height),
    backgroundColor: 'rgba(0, 0, 0, 0.04)'
  });
  
  // (4) 営業時間帯の左ボーダー表示
  renderBorder({
    top: startPixel,
    height: height,
    borderLeftColor: '#4285f4',
    borderLeftWidth: '2px'
  });
}
```

**CSS**:
```css
.non-business-hours {
  background-color: rgba(0, 0, 0, 0.04);  /* 薄い灰色 */
  pointer-events: none;
}

.business-hours-border {
  border-left: 2px solid #4285f4;
}
```

### 2-6. Week/Month View での適用

- **Week View**: 各日の時間グリッドに営業外背景を重ねる
- **Month View**: 月齢ビューでは営業時間表示を非表示（複雑すぎるため）

---

## 🎨 機能 3: タグベースのスタイル自動適用

### 3-1. 概要

アイテムに「タグ」を付与すると、そのタグに対応した CSS スタイルが自動的に適用される。
また、「ルール」（条件付きスタイル）によって、期限超過や完了状態に応じたスタイルも自動適用される。

### 3-2. データ構造拡張

```typescript
// CalendarItem に追加
interface CalendarItem {
  id: string;
  name: string;
  description: string;
  startTime: DateTime;
  endTime: DateTime;
  type: 'Task' | 'Appointment' | 'AllDay';  // ← 既存?
  
  // 【新規追加】
  tags: string[];                           // 例: ['重要', '急ぎ']
  style?: Record<string, string>;           // CSS key/value
                                            // 例: { color: '#009bbf', borderWidth: '2px' }
  completed?: boolean;                      // タスク完了フラグ
  // ...
}
```

### 3-3. デフォルトタグ & メトロカラー

**プリセット色（推奨）**:

```typescript
const metroColorPresets = {
  'Task': '#009bbf',           // 東西線スカイ
  'Appointment': '#c1a470',    // 有楽町線ゴールド
  'AllDay': '#8f76d6'          // 半蔵門線パープル
};

// タグごとの推奨色例（ユーザが後から自由に設定可能）
const tagColorRecommendations: Record<string, string> = {
  '重要': '#ea4335',           // 赤
  '急ぎ': '#fbbc04',           // 黄
  'プロジェクトA': '#34a853',   // 緑
  'プロジェクトB': '#4285f4',   // 青
  // ...
};
```

### 3-4. ルールベース条件付きスタイル（プリセット）

**Phase 1 で実装するプリセットルール**:

```typescript
interface StyleRule {
  id: string;
  name: string;
  description: string;
  condition: (item: CalendarItem, now: Date) => boolean;
  style: Record<string, string>;
}

const presetRules: StyleRule[] = [
  {
    id: 'overdue-task',
    name: '期限超過タスク',
    description: '完了されていないタスクで、期限が今日より前の場合',
    condition: (item, now) => {
      return (
        item.type === 'Task' &&
        !item.completed &&
        item.endTime < now
      );
    },
    style: {
      borderColor: '#ff0000',
      borderWidth: '3px'
    }
  },
  {
    id: 'completed-task',
    name: '完了済みタスク',
    description: '完了フラグが true のタスク',
    condition: (item, now) => {
      return item.type === 'Task' && item.completed;
    },
    style: {
      backgroundColor: '#cccccc',
      opacity: '0.6'
    }
  }
];
```

### 3-5. スタイル適用ロジック

**関数**: `getComputedStyle(item: CalendarItem, now: Date): Record<string, string>`

```typescript
function getComputedStyle(
  item: CalendarItem,
  now: Date = new Date()
): Record<string, string> {
  let computedStyle: Record<string, string> = {};
  
  // (1) デフォルトスタイル（type 別）
  if (item.type === 'Task') {
    computedStyle = { ...metroColorPresets['Task'] };
  } else if (item.type === 'Appointment') {
    computedStyle = { ...metroColorPresets['Appointment'] };
  } else if (item.type === 'AllDay') {
    computedStyle = { ...metroColorPresets['AllDay'] };
  }
  
  // (2) タグに応じたスタイル適用
  if (item.tags && item.tags.length > 0) {
    item.tags.forEach(tag => {
      const tagStyle = item.style || {};
      // タグに対応するスタイルがあれば適用
      // 例: { color: '#009bbf' }
      Object.assign(computedStyle, tagStyle);
    });
  }
  
  // (3) ルールベース条件付きスタイル適用
  presetRules.forEach(rule => {
    if (rule.condition(item, now)) {
      Object.assign(computedStyle, rule.style);
    }
  });
  
  // (4) 手動指定スタイル（最優先）
  if (item.style) {
    Object.assign(computedStyle, item.style);
  }
  
  return computedStyle;
}
```

**適用優先度**:
1. デフォルトスタイル（type 別メトロカラー）
2. タグスタイル（複数タグ → マージ）
3. ルールベース条件付きスタイル
4. 手動指定スタイル（最優先、上書き）

### 3-6. UI での色・スタイル設定

**style ボタン（再掲）**:

編集ダイアログの「style」ボタンを押すと、CSS key/value テーブルが表示される。

```
┌──────────────────────────────────────┐
│ スタイル設定                           │
├──────────────┬──────────────────────┤
│ キー         │ 値                     │
├──────────────┼──────────────────────┤
│ color        │ #009bbf               │
│ borderColor  │ #ff0000               │
│ background   │ #ffffff               │
│ opacity      │ 0.6                   │
│              │ [+ 行追加]            │
└──────────────┴──────────────────────┘
```

**仕様**:
- 各行: `[key 入力フィールド] | [value 入力フィールド] | [削除]`
- value は **カラーピッカー** または **テキスト入力** のどちらか選択可能
  - 推奨: `backgroundColor`, `color`, `borderColor` は カラーピッカー
  - その他（`opacity`, `borderWidth`, etc.）はテキスト
- `[+ 行追加]` で新規行追加可能

### 3-7. メトロカラー推奨表示

**カラーピッカー内に推奨色を配置**:

```
┌─────────────────────────────────────┐
│ 【推奨色（メトロカラー）】            │
│ [■ 東西線スカイ #009bbf]             │
│ [■ 有楽町線ゴールド #c1a470]        │
│ [■ 半蔵門線パープル #8f76d6]        │
│                                       │
│ 【その他色】                          │
│ [カラーピッカー]                      │
│ または                               │
│ [16進数 入力: #______]               │
└─────────────────────────────────────┘
```

---

## 🔄 データフロー（全体図）

```
【ユーザー操作】
    ↓
WeekView/MonthView
  ↓ (ダブルクリック)
  → setSelectedItem(item) → eventEditDialog ストア更新
    ↓
EventEditDialog
  ↓ (表示)
  → 編集フォーム表示
  ↓
  【スタイル ボタン クリック】
    ↓
    StyleEditor ダイアログ表示
      ↓ (CSS key/value 編集)
      → item.style 更新
      ↓
    【確定】
      ↓
    StyleEditor クローズ
    ↓
  【保存 ボタン クリック】
    ↓
    バリデーション
      ↓ (エラーなし)
      → calendarStore 更新
        → calendarItems リスト更新
          ↓
    EventEditDialog クローズ
    ↓
WeekView/MonthView 自動リフレッシュ
  ↓
getComputedStyle(item) 実行
  ↓ (スタイル計算)
  → アイテム描画（メトロカラー + ルール適用）
```

---

## 📦 実装チェックリスト

### 1: イベント編集ダイアログ

- [ ] **ストア実装**
  - [ ] `src/lib/stores/eventEditDialog.ts` 新規作成
  - [ ] `selectedItem` writable
  - [ ] `isEventEditDialogOpen` writable
  - [ ] `openEventEditDialog()`, `closeEventEditDialog()` 関数

- [ ] **EventEditDialog コンポーネント**
  - [ ] 基本構造（title, style button, 開始/終了, AllDay, tags, description）
  - [ ] フォーム入力フィールド実装
  - [ ] バリデーションロジック

- [ ] **StyleEditor サブコンポーネント**
  - [ ] CSS key/value テーブル UI
  - [ ] 行追加・削除機能
  - [ ] カラーピッカー統合（推奨: メトロカラー）

- [ ] **WeekView/MonthView 統合**
  - [ ] ダブルクリック検知 → ストア更新
  - [ ] EventEditDialog 購読・表示

- [ ] **保存処理**
  - [ ] バリデーション
  - [ ] ストア更新
  - [ ] 親コンポーネント自動リフレッシュ

- [ ] **E2E テスト（Playwright）**
  - [ ] ダイアログ起動
  - [ ] フィールド編集
  - [ ] スタイル編集
  - [ ] 保存成功
  - [ ] バリデーションエラー
  - [ ] 削除確認

### 2: ビジネスアワー設定

- [ ] **ストア実装**
  - [ ] `storage.businessHours` デフォルト値設定

- [ ] **BusinessHoursSettings コンポーネント**
  - [ ] 曜日別営業時間 UI
  - [ ] チェックボックス・時刻入力
  - [ ] リセット・保存機能

- [ ] **ビジネスアワー描画ロジック**
  - [ ] `renderBusinessHoursOverlay()` 関数
  - [ ] 営業外時間帯背景描画
  - [ ] WeekView への統合

- [ ] **設定ダイアログ統合**
  - [ ] 既存設定ダイアログに「営業時間設定」セクション追加

- [ ] **E2E テスト**
  - [ ] 営業時間設定
  - [ ] 描画の正確性
  - [ ] 曜日別設定の独立性

### 3: タグベーススタイル自動適用

- [ ] **データモデル拡張**
  - [ ] `CalendarItem` に `tags`, `style`, `completed` フィールド追加

- [ ] **メトロカラープリセット**
  - [ ] `metroColorPresets` 定義

- [ ] **ルールベース条件付きスタイル**
  - [ ] `presetRules` 定義（期限超過、完了）
  - [ ] `getComputedStyle()` 関数実装

- [ ] **UI での style 編集**
  - [ ] StyleEditor で style 編集機能
  - [ ] カラーピッカー統合

- [ ] **既存イベント への style 適用**
  - [ ] Week/Month View で描画時に `getComputedStyle()` 呼び出し
  - [ ] スタイル反映

- [ ] **E2E テスト**
  - [ ] タグ追加時 style 適用
  - [ ] 期限超過時 border 赤表示
  - [ ] 完了時 background グレー表示

---


## 📝 実装例（疑似コード）

### EventEditDialog.svelte

```ts
<script lang="ts">
  import { selectedItem, isEventEditDialogOpen, closeEventEditDialog } from '$lib/stores/eventEditDialog';
  import StyleEditor from './StyleEditor.svelte';
  
  let isStyleEditorOpen = false;
  let validationErrors: string[] = [];
  
  function handleSave() {
    // バリデーション
    validationErrors = validateItem($selectedItem);
    if (validationErrors.length > 0) return;
    
    // 保存
    updateCalendarItem($selectedItem);
    
    // クローズ
    closeEventEditDialog();
  }
  
  function handleDelete() {
    if (confirm('本当に削除しますか？')) {
      deleteCalendarItem($selectedItem.id);
      closeEventEditDialog();
    }
  }
</script>

{#if $isEventEditDialogOpen && $selectedItem}
  <div class="modal-overlay" on:click={closeEventEditDialog}>
    <div class="modal" on:click|stopPropagation>
      {/* 上部：タイトル + style ボタン */}
      <div class="modal-header">
        <input bind:value={$selectedItem.name} placeholder="タイトル" />
        <button on:click={() => isStyleEditorOpen = true}>style</button>
      </div>
      
      {/* style エディタ */}
      {#if isStyleEditorOpen}
        <StyleEditor bind:style={$selectedItem.style} onClose={() => isStyleEditorOpen = false} />
      {/if}
      
      {/* 中部：開始/終了 + AllDay */}
      <div class="modal-body">
        <div class="datetime-section">
          <input type="datetime-local" bind:value={$selectedItem.startTime} />
          <input type="datetime-local" bind:value={$selectedItem.endTime} />
          <label>
            <input type="checkbox" bind:checked={$selectedItem.allDay} />
            All Day
          </label>
        </div>
        
        {/* タグ */}
        <div class="tags-section">
          {#each $selectedItem.tags as tag, i}
            <span class="tag">{tag} <button on:click={() => removeTag(i)}>×</button></span>
          {/each}
          <input 
            type="text" 
            placeholder="タグを入力"
            on:keydown={e => e.key === 'Enter' && addTag(e.target.value)}
          />
        </div>
        
        {/* 説明 */}
        <textarea bind:value={$selectedItem.description} placeholder="説明・メモ"></textarea>
      </div>
      
      {/* ボタン */}
      <div class="modal-footer">
        <button on:click={closeEventEditDialog}>キャンセル</button>
        <button on:click={handleDelete} class="danger">削除</button>
        <button on:click={handleSave} class="primary">保存</button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* モーダルスタイル */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    padding: 16px;
  }
</style>
```

### getComputedStyle 関数

```typescript
// src/lib/utils/styleComputation.ts

import type { CalendarItem } from '$lib/types/CalendarItem';

const metroColorPresets = {
  'Task': '#009bbf',
  'Appointment': '#c1a470',
  'AllDay': '#8f76d6'
};

const presetRules = [
  {
    id: 'overdue-task',
    name: '期限超過タスク',
    condition: (item: CalendarItem, now: Date) => 
      item.type === 'Task' && !item.completed && item.endTime < now,
    style: { borderColor: '#ff0000', borderWidth: '3px' }
  },
  {
    id: 'completed-task',
    name: '完了済みタスク',
    condition: (item: CalendarItem) => 
      item.type === 'Task' && item.completed,
    style: { backgroundColor: '#cccccc', opacity: '0.6' }
  }
];

export function getComputedStyle(
  item: CalendarItem,
  now: Date = new Date()
): Record<string, string> {
  let computedStyle: Record<string, string> = {};
  
  // (1) デフォルト
  if (metroColorPresets[item.type]) {
    computedStyle.color = metroColorPresets[item.type];
  }
  
  // (2) ルール適用
  presetRules.forEach(rule => {
    if (rule.condition(item, now)) {
      Object.assign(computedStyle, rule.style);
    }
  });
  
  // (3) 手動スタイル（最優先）
  if (item.style) {
    Object.assign(computedStyle, item.style);
  }
  
  return computedStyle;
}
```

---

## ✨ 完了イメージ

**完了後のツール像**:
- ✅ イベント詳細編集が可能
- ✅ Outlook風の直感的 UI
- ✅ カスタムスタイル定義可能
- ✅ 営業時間の可視化
- ✅ 期限超過・完了タスクの自動スタイル変更
- ✅ メトロカラー推奨、自由な色選択も可能

**Google Calendar/Outlook との比較**:
| 機能 | Google | Outlook | calendar-for-mywork |
|------|--------|---------|-------------------|
| イベント編集 | ✅ | ✅ | ✅ |
| カスタムスタイル | ⚠️ 限定的 | ⚠️ 限定的 | ✅ 自由度高 |
| 営業時間表示 | ✅ | ✅ | ✅ |
| タグ/カテゴリ | ✅ | ✅ | ✅（タグ） |
| 条件付きスタイル | ❌ | ❌ | ✅ |


