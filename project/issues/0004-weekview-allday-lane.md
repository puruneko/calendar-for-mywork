# WeekView に allday レーンを追加する

## Status

closed

---

## Summary

WeekView の曜日ヘッダーとグリッドの間に allday レーンを追加する。
allday レーンには終日アイテムおよび複数日またがりアイテムを表示する。
MonthView と同じ `layoutWeekAllDay` アルゴリズムを使用し、バー同士の重なりを防ぐ。
DOM から高さを取得して事後調整する方法は禁止し、すべての高さ・位置を `$derived` で事前計算して inline style として反映する。

---

## Current Direction

- `alldayLaneCount`・`alldayHeight` を `$derived` で事前計算する
- `.time-allday-spacer` と `.day-allday` に同じ `alldayHeight` を適用して高さを同期する
- `.allday-item` は `position: absolute` で `top: lane * 24px`・`left/width` を % 計算で配置する
- `pointer-events: none` を `.day-allday` に設定し、子の `.allday-item` のみ `pointer-events: auto` にする（MonthView のバグ防止策と同じ）
- `.items-container`（timed item）の stacking context は既存のまま維持する

---

## TODO

* [x] `alldayItems`・`alldayLayout`・`alldayLaneCount`・`alldayHeight` を `$derived` で追加
* [x] `.time-column` に `.time-allday-spacer` を追加
* [x] `.day-column` に `.day-allday` を追加（allday バー表示領域）
* [ ] allday 用 DnD ハンドラを実装（初期実装では省略）
* [x] CSS を追加
* [x] すべてのテストがパスすることを確認する（105パス）

---

## Notes (Append Only)

* 2026-02-22 — Issue 作成。
* 2026-02-22 — 実装完了。`alldayPositioned` を `$derived` で事前計算し、`dayIndex=0` の `day-allday` 内に `allday-canvas`（全曜日幅）を配置して `allday-item` を `position: absolute` で描画。`time-allday-spacer` で `time-column` の高さを同期。DOM から高さを取得する処理は一切なし。テスト 105 パス（失敗 1 件は既存の dnd.spec.ts の問題）。
* 2026-02-22 — `time-allday-spacer` と `day-allday` の `border-bottom` を削除。`allday-item` に `z-index: 2` を追加して縦罫線より前面に表示。テスト 105 パス確認。
* 2026-02-22 — `time-allday-spacer` に「ALLDAY」表記を追加。`allday-item` に `getItemBgColor()` によるスタイル適用。allday DnD（移動・リサイズ）を実装（`handleAlldayDragStart/End/Over/Drop`・`handleAlldayResizeStart/Move/End`）。`allday-drop-grid` で各列へのドロップを受け取り。テスト 105 パス確認。
* 2026-02-22 — `allday-item` に `ondragover`・`ondrop` を追加してバー上へのドロップを許可。`grid-cell-minor-padding`（上下余白）にも `ondragover`・`ondrop` を追加してドロップキャンセルを防止。AllDayエリア表示設定は既存の「終日予定を表示」チェックボックス（`showAllDay`）で対応済みであることを確認。テスト 105 パス確認。
