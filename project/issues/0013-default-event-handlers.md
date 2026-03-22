# Issue #0013: CalendarView 既定イベントハンドラの内蔵

## Status

open

---

## Summary

現在、`CalendarView` を使う側がアイテムの移動・リサイズ・編集・削除・表示日付変更などのすべてのイベントハンドラを自分で定義しなければならない。これを、既定の動作をライブラリ内部に持たせ、利用者は必要なときだけカスタムハンドラを渡す形に変更する。

理想的な最小使用例：

```svelte
<CalendarView
    {items}
    bind:viewType
    {storage}
/>
```

---

## Background

### なぜ既定ハンドラが必要か

現状の `CalendarView` は「イベントを発火するだけ」の設計であり、アイテムの状態管理をすべて利用者に委ねている。これにより、最小限のデモすら `handleItemMove` / `handleItemResize` / `handleItemUpdate` / `handleItemDelete` / `handleViewChange` / `onDayClick` など多数のハンドラ定義が必要になっている。

ライブラリとして「何も渡さなくても動く」既定動作を内部に持つことで、導入コストが大幅に下がる。カスタム動作が必要なユーザーのみハンドラを上書きできる形が理想的。

### 内部状態の管理方針

- `CalendarView` は `internalItems` / `internalCurrentDate` を `$state` として管理する。
- 外部から `items` prop が変化したときは `$effect` で同期する。
- 外部から `currentDate` prop が提供された場合は `$effect` で同期する。未提供の場合は `DateTime.now()` で初期化。
- WeekView / MonthView には `internalItems` / `internalCurrentDate` を渡す。

### ハンドラの優先判定

- 利用者が `onItemMove` 等を渡した場合 → 利用者のハンドラのみ呼ぶ（内部の既定は走らせない）。
- 渡さなかった場合 → 既定ハンドラが `internalItems` を更新する。

---

## Current Direction

### 既定ハンドラの実装内容

| ハンドラ | 既定動作 |
|---|---|
| `onItemMove` | `diffDays` / `updateTimedItem` / `updateAllDayItem` / `updatePointItem` で `internalItems` を更新 |
| `onItemResize` | `updateTimedItem` / `updateAllDayItem` で `internalItems` を更新 |
| `onItemUpdate`（ダイアログ保存） | 該当 id のアイテムを置換 |
| `onItemDelete`（ダイアログ削除） | 該当 id のアイテムを除外 |
| `onViewChange` | `internalCurrentDate` を更新（ユーザーコールバックも併せて呼ぶ） |
| `onDayClick` | `viewType` を `week` に切替 + `internalCurrentDate` を更新（既存動作を維持） |

### App.svelte の変更方針

デモの `App.svelte` から以下を除去：
- `currentDate` state および `handleViewChange`
- `handleItemClick`（console.log のみ）
- `handleItemMove`
- `handleItemResize`
- `handleCellClick`（console.log のみ）
- `handleItemUpdate`
- `handleItemDelete`
- `onDayClick` への受け渡し

`tagStyleMap` はデモ表示のため維持する。

---

## TODO

- [x] `src/lib/components/CalendarView.svelte` — `internalItems` / `internalCurrentDate` の内部状態追加
- [x] `src/lib/components/CalendarView.svelte` — 既定ハンドラ（move / resize / update / delete）の実装
- [x] `src/lib/components/CalendarView.svelte` — `handleViewChange` / `handleDayClick` を内部 currentDate 更新込みに修正
- [x] `src/lib/components/CalendarView.svelte` — WeekView / MonthView へ `internalItems` / `internalCurrentDate` を渡すよう変更
- [x] `demo/App.svelte` — 不要な状態ミューテーションハンドラを除去し最小 API に簡略化（ログ出力フックのみ残留）
- [x] テスト実行（unit 170件パス / E2E 121件パス・2件スキップ・6件は変更前から存在する時刻依存テスト）

---

## Notes

* 2026-03-22 — Issue 作成。ユーザー要求：最小 props `{items} bind:viewType {storage}` のみで既定動作が完結するよう CalendarView を改修。
* 2026-03-22 — 実装完了。設計方針：ユーザーコールバックは「追加フック」として既定ハンドラの後に呼ぶ（既定を必ず実行）。これにより App.svelte はログ出力フックのみ保持し、状態管理は CalendarView が担当する。E2E で既存 6件失敗（custom-style 時刻依存）は変更前から存在し本実装と無関係。
