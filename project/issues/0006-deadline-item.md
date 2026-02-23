# Deadline アイテムの実装

## Status

closed

---

## Summary

`type: 'deadline'` の CalendarItem を WeekView・MonthView で描画できるようにする。
Deadline は期限を表す特殊なアイテムで、分単位（DateTimePoint）と日単位（DatePoint）の2種類がある。

---

## Current Direction

### 分単位 Deadline（`CalendarDateTimePoint`）
- `temporal.kind === 'CalendarDateTimePoint'` で判定
- WeekView の時刻グリッド上に配置
- `minorTick` 分の高さを確保し、外枠は**下辺にのみ罫線**を引く見た目
	- ↓＿＿タイトル＿＿ のような形
	- ↓は以下のSVGを使う
		- <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v13M5 12l7 7 7-7"/></svg>
- 通常アイテムと同様にレーン計算（重なる場合は横幅を分割）
- DnD・リサイズ対応（`at` の時刻を変更）

### 日単位 Deadline（`CalendarDatePoint`）
- `temporal.kind === 'CalendarDatePoint'` で判定
- WeekView の allday レーンおよび MonthView に表示
- 通常の allday アイテムと同様に描画するが：
  - **背景色は赤**（`#ef4444` / opacity 適用）
  - **ソート優先度が高い**（他の allday アイテムより先頭に表示されやすい）
- DnD 対応（`at` の日付を変更）

---

## TODO

* [x] WeekView: 分単位 Deadline の描画（minorTick 分高さ、下辺罫線のみ、レーン計算に組み込み）
* [x] WeekView: 日単位 Deadline を allday レーンに描画（赤背景、優先表示）
* [x] MonthView: 日単位 Deadline を描画（赤背景、優先表示）
* [x] DnD: Deadline アイテムの移動（updatePointItem を使用）
* [x] factories.ts: Deadline 用の createCalendarItem 引数（`at` または `datePoint`）確認・テスト
* [x] unit テスト: 128件すべてパス（factories / validation / laneLayout）
* [x] E2E テスト: 107件すべてパス（DnDテストも修正・パス）

---

## Notes (Append Only)

* 2026-02-23 — Issue 作成。temporal モデル再設計（#0007）が完了したため、本 Issue を開始。
* 2026-02-23 — 設計方針を確認：日単位 Deadline の allday レーン配置は「優先度が高いだけ（ずらさない）」。DnD・リサイズは対応する。
* 2026-02-23 — 分単位 Deadline の時刻フィールドは `temporal.at: DateTime`（`CalendarDateTimePoint`）。`start/end` は持たない。
* 2026-02-23 — 実装完了。WeekView・MonthView 両対応。unit 128件パス、vite build 成功。
  - 分単位: ↓アイコン + タイトル + 時刻、背景なし・下辺 2px 赤罫線。レーン計算に組み込み済み。
  - 日単位: ↓アイコン + タイトル、赤背景（color-mix）、allday レーンに優先配置（ソート）。
  - demo に dl1〜dl4 のサンプルアイテムを追加。
* 2026-02-23 — E2Eテスト 107件すべてパス。factories.ts に `at`/`datePoint` shorthand 追加。unit 132件パス。
  - vite.config.ts に `host: 'localhost'` 追加（Playwright IPv6/IPv4 問題修正）。
  - dnd.spec.ts を `.deadline-timed` 除外に対応。
* 2026-02-23 — UI改善・DnDオフセットバグ修正。unit 132件・E2E 106件全パス。
  - アイコン 12px→8px、padding を左詰め（0 1px 0 0）、時刻が圧迫時に自然に非表示。
  - dragPreviewStyle: Deadline は dragOffset を使わずマウス位置を直接期限時刻として使用。
  - demo/App.svelte: handleItemMove に CalendarDateTimePoint/CalendarDatePoint 分岐追加。
