# MonthView 改善計画 Phase 6

最終更新: 2026-02-20

---

## 背景

MonthViewは2026-02-20のPhase 2〜5の大規模リファクタリングで3層CSS Grid構造が完成した。
Phase 6では、ユーザー指示による細部UI改善と、コード分析で発見した既存課題を解消する。

---

## タスク一覧

| ID | 区分 | タイトル | 優先度 | 状態 |
|---|---|---|---|---|
| 6-1 | UI | day-expander の通常時スタイル変更（8px・薄色） | 高 | 未着手 |
| 6-2 | UI | expanded-panel の「セル延長錯覚」改善 | 高 | 未着手 |
| 6-3 | 品質 | handleDragStartContinuous デッドコード削除 | 中 | 未着手 |
| 6-4 | 品質 | getPreviewStartIndex / getPreviewSpan デッドコード削除 | 中 | 未着手 |
| 6-5 | DnD | ドラッグプレビュー（ゴーストバー）の実装 | 中 | 未着手 |
| 6-6 | DnD | allday-item ↔ grid-cell クロスDnD 動作確認・修正 | 低 | 未着手 |

---

## Task 6-1: day-expander の通常時スタイル変更

### 仕様

- **通常時**: `height: 8px`、背景色を現在の `#e0e0e0` より薄い `#f0f0f0` に変更
- **hover時**: 現状維持（`height: 8px`、`background-color: #bdbdbd`）
  - 通常時が8pxになるため、hoverでの高さ変化アニメーションは廃止
- **active時（展開済み）**: 現状維持

### 変更箇所

`src/lib/components/MonthView.svelte` の `.day-expander` CSS:

```css
/* 変更前 */
.day-expander {
  height: 4px;
  background-color: #e0e0e0;
  ...
}
.day-expander:hover {
  background-color: #bdbdbd;
  height: 8px;
}

/* 変更後 */
.day-expander {
  height: 8px;                /* 4px → 8px */
  background-color: #f0f0f0;  /* #e0e0e0 → #f0f0f0（薄く） */
  ...
}
.day-expander:hover {
  background-color: #bdbdbd;
  /* height は通常時と同じ8pxのため削除 */
}
```

### テスト方針

- 既存のE2Eテスト（`month-view.spec.ts`の展開パネル関連）が引き続きパスすること
- CSS数値の変更のみなので新規テスト追加は不要
- `month-view.spec.ts` のセレクタが `.day-expander` を使っている場合は影響を確認する

---

## Task 6-2: expanded-panel の「セル延長錯覚」改善

### 問題の詳細分析

現在、`expanded-panel` の `top` はgrid-cellの `bottom` に設定されているが、
`.expanded-panel` の CSS に `padding: 4px 4px 0 4px;` があるため、
パネル内の最初のアイテムが grid-cell 内の最後のアイテムより `4px` 下にずれている。

結果として、grid-cell と expanded-panel の間に視覚的な隙間が生じており、
「セルが延長された」ように見えない。

### 解決策の検討

#### アプローチA: `padding-top: 0` にする（最小変更）

```css
.expanded-panel {
  padding: 0 4px 0 4px;  /* padding-topを4px→0に */
}
```

**メリット**: 最小変更で隙間解消。  
**デメリット**: パネル内の最初のアイテムがgrid-cellの内枠に直接くっつく。
ただし `gap: 2px` は残るため、grid-cell内の最後のアイテムとの間隔は
`grid-cell の padding-bottom(0) + panel の padding-top(0) + gap(2px)` = 2px となり、
grid-cell 内のアイテム間隔（`gap: 2px`）と完全に一致する。

#### アプローチB: border-top を追加して境界を明示する

grid-cell 最下端とパネル先頭の見た目上の連続性は、実際にはborderで分かれているため、
視覚的につながって見えるかどうかはブラウザのレンダリングに依存する可能性がある。

**採用しない理由**: 要件は「境界を隠す」ことなのでborderは増やしたくない。

#### 採用: アプローチA

`padding-top: 0` にすることで：
- パネル内アイテムの先頭が grid-cell の最後のアイテムと `gap: 2px` の間隔で並ぶ
- これは grid-cell 内のアイテム間の間隔と同一
- ユーザーには「同じリストが続いている」ように見える

**実装可能と判断**。

### 変更箇所

`src/lib/components/MonthView.svelte` の `.expanded-panel` CSS:

```css
/* 変更前 */
.expanded-panel {
  padding: 4px 4px 0 4px;
  ...
}

/* 変更後 */
.expanded-panel {
  padding: 0 4px 0 4px;   /* padding-topを4px→0 */
  ...
}
```

### テスト方針

- CSS変更のみ。既存E2Eテストがパスすることを確認する
- 新規テスト追加は不要

---

## Task 6-3: handleDragStartContinuous デッドコード削除

### 問題

`handleDragStartContinuous` 関数（300行目付近）が定義されているが、
テンプレート内のどこからも呼ばれていない。
allday-itemのDnDは `handleDragStart` のみ使用されている。

### 変更箇所

`src/lib/components/MonthView.svelte` の `handleDragStartContinuous` 関数を丸ごと削除（約54行）。

### テスト方針

- 削除後、全テストがパスすることを確認する（デッドコード削除なので動作変化なし）

---

## Task 6-4: getPreviewStartIndex / getPreviewSpan デッドコード削除

### 問題

`getPreviewStartIndex` / `getPreviewSpan` 関数が定義されているが、
テンプレート内のどこからも呼ばれていない（ドラッグプレビュー実装の準備コードとして残存）。

### 変更方針

Task 6-5（ドラッグプレビュー実装）でこれらを使う可能性がある。
そのため、6-5の着手前に状況を再評価する。

- **6-5を実装しない場合**: 削除する
- **6-5を実装する場合**: 6-5の中で活用する

---

## Task 6-5: ドラッグプレビュー（ゴーストバー）実装

### 概要

allday-item のドラッグ中に、ドロップ先週のどこにバーが移動するかをゴーストバー（半透明バー）で表示する。

### 実装方針

1. `getPreviewStartIndex` / `getPreviewSpan`（Task 6-4で保留中）を活用
2. 各週の `multiDayItemsInWeek` の計算ループ内で、ドラッグ中かつ `dragOverDay` が設定されている場合にプレビューを計算
3. `.allday-item.preview` クラスを追加し、`opacity: 0.4`、`pointer-events: none`、`border: 1px dashed` で表示

### テスト方針

- E2Eテストポリシーの制約（`page.mouse.*` API必須）に従い、ドラッグ操作後のプレビュー表示を検証
- ただし、ゴーストバーの位置・色等のビジュアル詳細は検証しない（TESTING_POLICYの禁止事項）

---

## Task 6-6: allday-item ↔ grid-cell クロスDnD 動作確認

### 調査内容

現在の `handleDrop` では、`isMultiDayItem(draggedItem)` で判定して処理を分岐している。
- allday-item → grid-cell へドロップ: 複数日アイテムを単一日にドロップした場合の挙動確認
- grid-cell → allday-item へドロップ: 現状では発生しない（allday層はpointer-events: none）

### 方針

このタスクは動作確認のみとし、問題があれば別フェーズで対応する。

---

## 変更履歴

- 2026-02-20: 初版作成（Phase 1〜5完了後の改善計画）
- 2026-02-20: Phase 6 計画を記載（ユーザー指示 + コード分析による課題）
