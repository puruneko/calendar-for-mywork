# WeekView の曜日ヘッダーを縦スクロール中も常に表示する

## Status

closed

---

## Summary

WeekView において、縦スクロール時に `.day-header`（曜日・日付ヘッダー行）および `.time-header`（時刻列の上部スペーサー）がカレンダー本体と一緒にスクロールアウトする問題を修正する。また、修正に伴い発生した派生問題（ヘッダーの z-index・縦罫線の消失）も同一 Issue として解決する。

過去の修正試行において、列の罫線ズレ・スクロール不可・カレンダー本体の上部が曜日エリアに隠れる、という不具合が発生した実績がある。

---

## Current Direction

`WeekView.svelte` の CSS のみを変更する。DOM 構造は変更しない。

- `.day-header`・`.time-header` に `position: sticky; top: 0; z-index: 30;` を付与してヘッダーを固定。
- `.items-container` に `z-index: 1` を付与して stacking context を形成し、内部の `.calendar-item`（z-index: 10）を外部に漏らさない。`.day-grid` には `z-index` を設定しない（flex アイテムに `z-index` を設定すると隣接する `border-right` が覆われるため）。これにより `.day-header`（sticky, z-index: 30）が確実に上に表示され、`border-right` への影響もない。

---

## TODO

* [x] `.day-header`・`.time-header` に `position: sticky; top: 0;` を付与する
* [x] ヘッダーの `z-index` をカレンダーアイテムより高く設定する
* [x] 縦罫線が白または透明になる問題を解消する
* [x] すべてのテストがパスすることを確認する

---

## Notes (Append Only)

* 2026-02-22 — `.day-header`・`.time-header` に `position: sticky; top: 0; z-index: 10;` を付与。DOM 構造の変更なし。
* 2026-02-22 — スクロール時にヘッダーがカレンダーアイテムより下レイヤーになる問題を発見。`.day-column` に `position: relative` を追加し、ヘッダーの `z-index` を 30 に引き上げた。
* 2026-02-22 — `position: relative` を `.day-column` に追加したことで 16 時以降の縦罫線が消失。`.day-column` の `position: relative` を除去し、`.day-grid` に `isolation: isolate` を試みた。
* 2026-02-22 — `.day-grid` の `isolation: isolate` が縦罫線を白くする原因と判明。`.items-container` への移動も効果なし。
* 2026-02-22 — `.day-column` に `isolation: isolate` を設定する方針に変更。`isolation: isolate` は `border` には影響せず、stacking context のみを閉じ込める。テスト 103 パス確認。実装完了。
* 2026-02-22 — 縦罫線が再発。`isolation: isolate` が flex アイテム間の描画順序に影響し border が隠れることが判明。`isolation: isolate` を除去し、代わりに `.day-grid` に `position: relative; z-index: 0;` を付与。これにより `.day-grid` が stacking context を形成し、内部の `.calendar-item`（z-index: 10）を外部に漏らさない。`.day-header`（sticky, z-index: 30）は `.day-grid` の外のため確実に上に表示される。テスト 103 パス確認。
* 2026-02-22 — 縦罫線が再々発。原因は `.day-grid` の CSS が2か所に重複定義されており、後の定義（`transition` のみ）が前の定義（`position: relative; z-index: 0`）を上書きして stacking context が失われていた。2つの定義を1つに統合して解決。テスト 103 パス確認。
* 2026-02-22 — 縦罫線が再々々発。`.day-grid` に `z-index: 0` を設定すると flex アイテムとして stacking context が形成され、隣接する `.day-column` の `border-right` が覆われることが判明。`.day-grid` から `z-index` を除去し、代わりに `.items-container` に `z-index: 1` を設定して stacking context を形成。これにより `.calendar-item` の z-index が外部に漏れず、`border-right` への影響もなくなった。テスト 103 パス確認。
* 2026-02-22 — 縦罫線が endHour に関わらず一定時間分しか表示されない問題の根本原因を特定。`.items-container` の `height: 100%` は包含ブロック（`.day-grid`）が `height: auto` の場合に不定となり、拡大率や描画タイミングによって異なる値を参照していた。`height: 100%` を `bottom: 0` に変更して解決。テスト 103 パス確認。
* 2026-02-22 — `.day-column` の `border-right` が `day-column` の content 高さでしか描画されないため、グリッド全体に縦罫線が引かれない問題を解決。`.day-column` から `border-right` を除去し、`.day-header` と `.day-grid` それぞれに `border-right` を設定することで、グリッドの実際の高さ全体に縦罫線が表示されるようにした。テスト 103 パス確認。
