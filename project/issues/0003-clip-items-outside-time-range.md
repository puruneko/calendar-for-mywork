# 表示時刻範囲外のアイテムを非表示にし、範囲外継続を▲▼で示す

## Status

closed

---

## Summary

WeekView において、`startHour`・`endHour` で定義された表示時刻範囲の外側にあるアイテムは表示しない。ただし、アイテムが範囲をまたぐ場合（開始が範囲より前、または終了が範囲より後）は、範囲内に収まる部分のみ表示し、範囲外に続いていることを示すインジケーター（▲または▼）を表示する。設定変更時にも即座に反映する。

---

## Current Direction

`WeekView.svelte` の `weekLayout` 計算ロジックおよびテンプレートを変更する。

### 非表示の条件
- アイテムの終了時刻 ≤ `startHour` → 完全に範囲外のため非表示
- アイテムの開始時刻 ≥ `endHour` → 完全に範囲外のため非表示

### クリップ表示の条件
- アイテムの開始時刻 < `startHour` かつ 終了時刻 > `startHour` → 上端をクリップ、▲インジケーターを表示
- アイテムの開始時刻 < `endHour` かつ 終了時刻 > `endHour` → 下端をクリップ、▼インジケーターを表示

### クリップ時の表示
- `top` を `startHour` に合わせてクリップ（マイナスにしない）
- `height` を表示範囲内に収まるよう調整
- アイテム上端に `▲────` を表示（開始が範囲より前の場合）
- アイテム下端に `▼────` を表示（終了が範囲より後の場合）

### 変更対象
- `weekLayout` の `PositionedItem` 型に `clipTop: boolean`・`clipBottom: boolean` を追加
- `buildStyleStr` または `weekLayout` の計算で `top`・`height` をクリップ済み値に変換
- テンプレートで `clipTop`・`clipBottom` フラグに応じてインジケーターを表示

---

## TODO

* [x] `PositionedItem` 型に `clipTop`・`clipBottom` を追加する
* [x] `weekLayout` の計算で範囲外アイテムを除外し、クリップ値を計算する
* [x] テンプレートにインジケーター（▲▼）を追加する
* [x] ▼インジケーターをアイテム外側・下に独立配置（minorTick分の高さ、上揃え）
* [x] 設定変更時に即座に反映されることを確認する（`startHour`・`endHour` は `$derived` で連動）
* [x] すべてのテストがパスすることを確認する（103パス）

---

## Notes (Append Only)

* 2026-02-22 — Issue 作成。ユーザー要件：範囲外アイテム非表示 + 範囲外継続を `----▲-----` / `----▼-----` 形式で表示。
* 2026-02-22 — ▼インジケーターを `.clip-indicator-below` として `items-container` 内にアイテムとは別ループで `position: absolute` 配置。`top: item.top + item.height`、`height: minorTick px` で配置し上揃え（`align-items: flex-start`）で表示。テスト 103 パス確認。
* 2026-02-22 — ▼インジケーターの仕様変更。子要素（▼矢印・ライン）を除去し、`border-left: 2px dotted gray; border-right: 2px dotted gray` のみのシンプルな表示に変更。`left`・`width` をアイテムと揃えた。`.day-grid` 末尾に常時 1 minorTick 分の余白（`.grid-cell-minor-padding`）を追加し、clipが起きない場合もインジケーター表示領域を確保。テスト 103 パス確認。
* 2026-02-22 — `.calendar-item.clip-top` / `.clip-bottom` の `border-top`・`border-bottom`（dashed）を除去。`.day-grid` 先頭にも 1 minorTick 分の余白を追加し、▲インジケーターをアイテム外側・上に独立配置（`clip-indicator-above`）。全アイテムの `top` に `minorTick` px のオフセットを加算。E2Eテストの `expectedTop` 関数にもオフセットを反映。テスト 103 パス確認。
* 2026-02-22 — `time-column` にも `minorTick` px の余白（`.time-slot-minor-padding`）を開始時刻前と終了時刻後に追加し、`day-grid` の余白と揃えた。テスト 103 パス確認。
* 2026-02-22 — `clip-indicator-above/below` を三点リーダー（︙）表示に変更。`font-size: 75%; display: flex; justify-content: center; overflow: clip;` を適用。above は `align-items: flex-end`、below は `align-items: flex-start`。border 系 CSS を削除。テスト 105 パス確認（dnd.spec.ts の 1 件は既存の問題）。
* 2026-02-22 — 開始時刻前の余白に `grid-cell` / `time-slot` クラスを追加して罫線スタイルを統一（終了時刻後の余白には付与しない）。`dragPreviewStyle`・`handleCellClick`・`minor-grid-line`・`current-time-line` の Y 座標計算に `minorTick` オフセットを反映。テスト 105 パス確認（dnd.spec.ts の失敗 1 件は変更前から存在する既存の問題）。
* 2026-02-22 — `clip-indicator-above/below` の表示を三点リーダー（︙）から SVG（ダブルシェブロン）に変更。SVG サイズは `minorTick - 4` px でパディングを超えないよう制御。クリック時に `handleExpandStart`/`handleExpandEnd` を呼び出し、`majorTick` 単位でアイテムが表示されるよう `startHour`/`endHour` を変更（日跨ぎ考慮、0〜24時制限）。テスト 105 パス確認。
