# 0007 Temporal Model Redesign

## Status

closed

---

## Summary

CalendarItem の時間情報を `start/end/dateRange` の直接保持から、`temporal: TimeSpan` フィールドへ分離する型システムの全面再設計。
Deadline タイプ（#0006）の実装に先行して必要となった基盤整備。

---

## Current Direction

- `temporal` フィールドに `TimeSpan`（Discriminated Union）を保持する
- 内部時刻表現は引き続き Luxon DateTime を使用（ISODateTime 文字列化はしない）
- 全面移行（モデル層・utils・コンポーネント・デモ・テスト）

### TimeSpan の種類

| kind | 用途 |
|------|------|
| `CalendarDateTimeRange` | 時刻付きアイテム（旧TimedItem） |
| `CalendarDateRange` | 終日アイテム（旧AllDayItem、endExclusive に統一） |
| `CalendarDateTimePoint` | 分単位Deadline（at: DateTime） |
| `CalendarDatePoint` | 日単位Deadline（at: ISODate） |

---

## TODO

* [x] `temporal.ts` 新規作成（TimeSpan union + 型ガード + normalize + ファクトリ）
* [x] `CalendarItem.ts` 更新（temporal フィールド導入、type に 'deadline' 追加）
* [x] `calendarDate.ts` 更新（ISODate エイリアスへ移行、後方互換維持）
* [x] `calendarDateRange.ts` 更新（temporal.ts へ委譲）
* [x] `calendarDateRangeOps.ts` 更新（endExclusive 対応）
* [x] `Task.ts` / `Appointment.ts` 更新（コメント更新）
* [x] `factories.ts` 全面書き換え（shorthand + temporal 直接指定 + updatePointItem 追加）
* [x] `validation.ts` 全面書き換え（temporal フィールド検証）
* [x] `models/index.ts` 更新（新規エクスポート追加）
* [x] `itemUtils.ts` 更新（temporal 経由でアクセス）
* [x] `laneLayoutAlgorithm.ts` 更新（endExclusive 対応）
* [x] `WeekView.svelte` 更新（temporal.kind 参照に変更）
* [x] `MonthView.svelte` 更新（temporal.kind 参照に変更）
* [x] `demo/App.svelte` 更新（新API に移行）
* [x] unit テスト全件見直し・修正（128件全パス）
* [x] vite build 確認（成功）

---

## Notes (Append Only)

* 2026-02-23 — Issue #0006（Deadline実装）の前提として型再設計が必要と判断し、本Issueを分割・先行実装
* 2026-02-23 — Luxon DateTime をモデル層でも継続使用することをユーザーと合意（ISODateTime 文字列化は採用しない）
* 2026-02-23 — `CalendarDateRange.end` → `endExclusive` にリネームし exclusive であることを型名で明示
* 2026-02-23 — `tsc --emitDeclarationOnly` の `.svelte` モジュール解決エラーは今回の変更前から存在する既存問題（vite build は正常）
* 2026-02-23 — unit テスト: 126件（旧）→ 128件（新）、Deadline / updatePointItem のテストを追加
