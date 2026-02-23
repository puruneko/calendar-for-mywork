# WeekView / MonthView リファクタリング

## Status

open

---

## Summary

WeekView.svelte（1,917行）と MonthView.svelte（1,519行）が肥大化しており、可読性・保守性が低下している。
共通ロジックの抽出とサブコンポーネント分割を行い、各ファイルを600行以下に削減する。

---

## Current Direction

### 分割方針

- **サブコンポーネント**: Svelte コンポーネントとして切り出す。state は親（WeekView / MonthView）が保持し、props + events で受け渡す。グローバルstore は使用しない。
- **ロジック抽出**: 純粋関数は `src/lib/utils/` へ移動し、unit テストを追加する。
- **共通化**: 両View で重複しているロジック（`getItemBgColor`、`applyDefaultOpacity` 等）は共通ユーティリティとして一本化する。
- **各ステップでビルドを確認**し、E2E テストが全件パスすることを確認してから次のステップへ進む。

### 実施順序

```
Step 1: 共通ユーティリティ抽出（最小リスク）
Step 2: WeekLayout ロジック抽出（pure function）
Step 3: SettingsPanel サブコンポーネント抽出
Step 4: WeekAlldayLane サブコンポーネント抽出
Step 5: WeekTimedGrid サブコンポーネント抽出
Step 6: MonthWeekRow / MonthExpandedPanel 抽出
Step 7: 全テスト見直し・確認
```

---

## TODO

### Step 1: 共通ユーティリティ抽出

* [ ] `src/lib/utils/colorUtils.ts` を新規作成
  * `applyDefaultOpacity(color, opacity)` を WeekView から移動
  * `getItemBgColor(item)` を WeekView / MonthView 両方から統合（現在は両ファイルに重複実装）
* [ ] `src/lib/utils/calendarItemDisplay.ts` を新規作成
  * `getItemClass(item)` を WeekView から移動
  * `buildTitleAttr(item)` を新規作成（ホバー `title` 属性の文字列生成）
* [ ] `src/lib/utils/index.ts` を更新（新規ファイルを再エクスポート）
* [ ] WeekView / MonthView で新ユーティリティを import するよう更新
* [ ] ビルド確認・E2E 全パス確認

### Step 2: WeekLayout ロジック抽出

* [ ] `src/lib/utils/weekLayoutAlgorithm.ts` を新規作成
  * WeekView の `weekLayout` `$derived.by` 内にある時刻アイテム配置ロジック（~137行）を純粋関数 `layoutWeekTimed(items, weekDays, options)` として抽出
  * `PositionedItem` 型もこのファイルへ移動
  * `hourHeight = 60` マジック定数を module-level `const` として定義（現在 WeekView 内に4箇所重複）
* [ ] unit テストを `tests/unit/weekLayoutAlgorithm.test.ts` に追加
* [ ] WeekView の `weekLayout` を新関数を呼び出すよう更新
* [ ] ビルド確認・E2E 全パス確認

### Step 3: SettingsPanel サブコンポーネント抽出

* [ ] `src/lib/components/WeekSettingsPanel.svelte` を新規作成
  * 現行 WeekView のインラインパネル（~106行のテンプレート + CSS）を移動
  * Props: `minorTick`, `startHour`, `endHour`, `showWeekend`, `showAllDay`, `defaultColorOpacity`, `weekStartsOn`, `itemRightMargin`, `showParent`, `parentDisplayIndex`
  * Events: `onChange`（全設定オブジェクトを渡す）
  * 設定オブジェクトの再構築ロジックをパネル内に閉じ込める（現在は WeekView 内に9回繰り返しのインライン記述）
* [ ] `src/lib/components/MonthSettingsPanel.svelte` を新規作成
  * 現行 MonthView のインラインパネル（~59行）を移動
  * Props: `maxItemsPerDay`, `weekStartsOn`, `showWeekend`, `showAllDay`, `showSingleDay`
  * Events: `onChange`
* [ ] WeekView / MonthView でサブコンポーネントを使用するよう更新
* [ ] `src/lib/components/index.ts` を更新
* [ ] ビルド確認・E2E 全パス確認

### Step 4: WeekAlldayLane サブコンポーネント抽出

* [ ] `src/lib/components/WeekAlldayLane.svelte` を新規作成
  * WeekView の allday レーン全体（テンプレート ~154行 + CSS ~175行 + DnD/リサイズ関数7本）を移動
  * Props: `items`, `weekDays`, `alldayLaneCount`, `alldayPositioned`, `defaultColorOpacity`, `showAllDay`
  * Events: `onItemMove`, `onItemResize`, `onItemClick`
  * 内部 state: `alldayDraggedItem`, `alldayDragOverDay`, `alldayDragOffsetDays`, `alldayDragGrabbedDate`, `alldayResizingItem`, `alldayResizeEdge`, `alldayResizeStartX`, `alldayResizeStartDay`（全て子コンポーネント内に閉じ込め）
* [ ] WeekView で `<WeekAlldayLane>` を使用するよう更新
* [ ] ビルド確認・E2E 全パス確認

### Step 5: WeekTimedGrid サブコンポーネント抽出

* [ ] `src/lib/components/WeekTimedGrid.svelte` を新規作成
  * WeekView の時刻グリッド（時間軸・アイテム描画・DnD・リサイズ・クリップインジケーター）を移動
  * テンプレート ~200行 + CSS ~350行 + 関数8本（click/resize/DnD）
  * Props: `weekDays`, `weekLayout`, `timeSlots`, `minorGridLines`, `currentTimeLine`, `startHour`, `endHour`, `minorTick`, `dragPreviewStyle`, `defaultColorOpacity`
  * Events: `onItemMove`, `onItemResize`, `onItemClick`, `onCellClick`, `onExpandStart`, `onExpandEnd`
  * 内部 state: timed DnD state 全て、resize state 全て
  * `dragPreviewStyle` の計算もこのコンポーネント内へ移動
* [ ] WeekView で `<WeekTimedGrid>` を使用するよう更新
* [ ] ビルド確認・E2E 全パス確認

### Step 6: MonthWeekRow / MonthExpandedPanel 抽出

* [ ] `src/lib/components/MonthWeekRow.svelte` を新規作成
  * MonthView の1週分（chrome + allday + grid の3層）を移動
  * テンプレート ~143行 + CSS ~200行 + DnD/リサイズ関数（getMultiDayItemsForWeek 含む）
  * Props: `week`, `weeks`, `colsPerWeek`, `maxItemsPerDay`, `showAllDay`, `showSingleDay`, `showWeekend`, `defaultColorOpacity`, `draggedItem`, `dragOverDay`, `expandedDay`, `items`
  * Events: `onItemMove`, `onItemResize`, `onItemClick`, `onCellClick`, `onDayNumberClick`, `onToggleExpand`
  * DnD state を親 MonthView から受け取るか、子に閉じ込めるか検討
* [ ] `src/lib/components/MonthExpandedPanel.svelte` を新規作成
  * 展開パネル（~30行のテンプレート + ~40行のCSS）を移動
  * Props: `items`, `expandedDay`, `expandedPanelStyle`, `expandedPanelReady`
  * Events: `onItemClick`, `onClose`, `onDrop`
* [ ] MonthView で両サブコンポーネントを使用するよう更新
* [ ] ビルド確認・E2E 全パス確認

### Step 7: 全テスト見直し・確認

* [ ] E2E テスト全件実行・セレクターが変わっていないか確認
* [ ] 変更が必要なテストを修正
* [ ] unit テスト全件実行
* [ ] 最終ビルド確認

---

## 削減目標

| ファイル | 現在 | 目標 |
|---------|------|------|
| `WeekView.svelte` | 1,917行 | ~600行 |
| `MonthView.svelte` | 1,519行 | ~500行 |
| `WeekSettingsPanel.svelte` | 新規 | ~130行 |
| `MonthSettingsPanel.svelte` | 新規 | ~80行 |
| `WeekAlldayLane.svelte` | 新規 | ~350行 |
| `WeekTimedGrid.svelte` | 新規 | ~400行 |
| `MonthWeekRow.svelte` | 新規 | ~350行 |
| `MonthExpandedPanel.svelte` | 新規 | ~80行 |
| `colorUtils.ts` | 新規 | ~80行 |
| `calendarItemDisplay.ts` | 新規 | ~50行 |
| `weekLayoutAlgorithm.ts` | 新規 | ~180行 |

---

## Notes (Append Only)

* 2026-02-23 — 分析完了。WeekView 1,917行・MonthView 1,519行を確認。
  - WeekView の主な肥大化要因: `weekLayout` $derived（~137行）、allday レーン（~154行テンプレート + ~175行CSS）、時刻グリッド（~200行テンプレート + ~350行CSS）、設定パネル（~106行）
  - MonthView の主な肥大化要因: `getMultiDayItemsForWeek`（~60行）、`recalculatePanelPosition`（~40行）、週行レンダリング（3層構造 ~143行）
  - 両View共通の重複: `getItemBgColor`（独立実装が2つ存在）、`applyDefaultOpacity`（WeekViewのみ、MonthViewは未使用）、DnDパターン（Start/Move/End/Drop の4関数セット）
  - `hourHeight = 60` が WeekView 内に4箇所重複
  - MonthView に未使用関数あり: `getPreviewStartIndex`、`getPreviewSpan`（削除対象）
  - 推定実装コスト: ~150 iterations。クレジット消費が大きいため、実装は別セッションで行う。
