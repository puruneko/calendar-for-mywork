# Issue #0009: CalendarStorage — 永続化可能な状態管理レイヤー

## Status

closed

## Summary

現在、設定値（startHour, endHour, minorTick 等）は `demo/App.svelte` のローカル state として散在しており、`handleSettingsChange` / `handleMonthSettingsChange` 経由でコンポーネントに戻す迂回が必要。

将来的に localStorage・ローカルファイル・サーバーなど複数の永続化バックエンドを柔軟に選べるよう、**`CalendarStorage` シングルトン + `StorageBackend` インターフェース**を導入し、設定値を一元管理する。

## Background

- 設定値がdemoのローカルで管理されており、将来的にカスタム値が散らばる可能性がある
- `currentDate` / `activeView` は props のまま維持（永続化対象外）
- `CalendarStorage` はライブラリの公開 API として提供する
- バックエンドは差し替え可能（Memory / LocalStorage / 将来: File, Server）

## Scope

### 永続化対象（CalendarStorageData）
```typescript
type CalendarStorageData = {
  weekSettings: WeekViewSettings;
  monthSettings: MonthViewSettings;
};
```

### 永続化対象外（props のまま）
- `currentDate: DateTime`
- `activeView: 'week' | 'month'`
- `items: CalendarItem[]`

## Design

### ファイル構成

```
src/lib/
├── storage/
│   ├── CalendarStorage.ts       ← StorageBackend IF + CalendarStorage クラス
│   ├── MemoryBackend.ts         ← デフォルト（テスト・SSR用）
│   ├── LocalStorageBackend.ts   ← ブラウザ用
│   └── index.ts
└── models/
    └── settings.ts              ← WeekViewSettings / MonthViewSettings 型定義
```

### 型定義（settings.ts）

```typescript
export type WeekViewSettings = {
  startHour: number;           // デフォルト: 0
  endHour: number;             // デフォルト: 24
  minorTick: number;           // デフォルト: 15
  majorTick: number;           // デフォルト: 60
  dayChangeThreshold: number;  // デフォルト: 0.75
  showWeekend: boolean;        // デフォルト: true
  showAllDay: boolean;         // デフォルト: true
  defaultColorOpacity: number; // デフォルト: 0.5
  weekStartsOn: number;        // デフォルト: 1
  itemRightMargin: number;     // デフォルト: 10
  showParent: boolean;         // デフォルト: true
  parentDisplayIndex: number;  // デフォルト: -1
};

export type MonthViewSettings = {
  maxItemsPerDay: number;      // デフォルト: 3
  weekStartsOn: number;        // デフォルト: 1
  showWeekend: boolean;        // デフォルト: true
  showAllDay: boolean;         // デフォルト: true
  showSingleDay: boolean;      // デフォルト: true
};

export type CalendarStorageData = {
  weekSettings: WeekViewSettings;
  monthSettings: MonthViewSettings;
};
```

### StorageBackend インターフェース

```typescript
export interface StorageBackend {
  load(): Partial<CalendarStorageData>;
  save(data: CalendarStorageData): void;
}
```

### CalendarStorage クラス

```typescript
export class CalendarStorage {
  constructor(
    backend?: StorageBackend,           // 省略時は MemoryBackend
    overrides?: DeepPartial<CalendarStorageData>  // 初期値の上書き
  )

  get data(): CalendarStorageData       // 現在の全設定値を取得
  update(patch: DeepPartial<CalendarStorageData>): void  // 部分更新
}
```

### CalendarView の変更

```typescript
// 変更前（14個のバラバラな props）
<CalendarView
  {items}
  {startHour}
  {endHour}
  {minorTick}
  ...
  onSettingsChange={handleSettingsChange}
/>

// 変更後（storage 1個に集約）
const storage = new CalendarStorage(new LocalStorageBackend('my-calendar'), {
  weekSettings: { startHour: 8, endHour: 20 }
});

<CalendarView {items} {storage} />
```

### WeekView / MonthView の変更

- props から個別設定値を受け取る代わりに、`storage.data.weekSettings.*` を参照
- 設定変更時は `storage.update({ weekSettings: { ... } })` を呼ぶ（`onSettingsChange` コールバック不要）
- Svelte の reactivity は `$derived` で `storage.data` を参照することで維持

## TODO

- [x] `src/lib/models/settings.ts` — WeekViewSettings / MonthViewSettings 型定義
- [x] `src/lib/storage/CalendarStorage.svelte.ts` — StorageBackend IF + CalendarStorage クラス（`$state` で reactivity 管理）
- [x] `src/lib/storage/MemoryBackend.ts` — インメモリ実装
- [x] `src/lib/storage/LocalStorageBackend.ts` — localStorage 実装
- [x] `src/lib/storage/index.ts` — エクスポート
- [x] `CalendarView.svelte` — `storage` prop 追加、個別設定 props を削除
- [x] `WeekView.svelte` — storage 経由に変更、`onSettingsChange` を削除
- [x] `MonthView.svelte` — storage 経由に変更、`onMonthSettingsChange` を削除
- [x] `demo/App.svelte` — CalendarStorage を使う形に更新、CSS変数（`--z-resize-handle` 等）を定義
- [x] `src/index.ts` — CalendarStorage / StorageBackend / 型をエクスポート
- [x] `tests/unit/calendarStorage.test.ts` — unit テスト追加（9件）
- [x] E2E テスト見直し・修正（デモデータとテスト期待値の整合）

## Notes

* 2026-02-24 — 設計確定。currentDate/activeView は props のまま。CalendarStorage はライブラリ公開 API。
* StorageBackend は同期 API（`load`/`save`）。非同期バックエンドは将来の拡張として async 版 IF を別途検討。
* `weekStartsOn` は WeekViewSettings と MonthViewSettings 両方に存在するが、同じ値を使いたい場合はユーザが両方に同じ値を渡す設計（将来的に共通化を検討）。
* 2026-02-24 — 実装完了。`CalendarStorage.ts` を `.svelte.ts` にリネームし `$state` を導入することで reactivity バグを修正。`demo/App.svelte` に CSS変数 `--z-resize-handle` 等を追加し resize-handle のポインターイベント問題を解消。unit 141件・E2E 106件（2 skipped）全パスにてクローズ。
