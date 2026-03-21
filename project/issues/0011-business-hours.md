# Issue #0011: ビジネスアワー設定

## Status

closed

---

## Summary

WeekView の時間グリッドに「営業時間外の背景色」を重ねることで、ユーザーが業務時間帯を一目で把握できるようにする。営業時間は曜日ごとに個別設定でき、設定は `CalendarStorage` を通じて永続化される。

---

## Background

### なぜビジネスアワー設定が必要か

現在の WeekView は 0〜24 時（または startHour〜endHour）の範囲をフラットに表示するため、実際の業務時間（例: 月〜金 09:00〜17:30）とそれ以外の時間帯の区別が視覚的にできない。

営業外の時間帯を薄いグレーで塗ることで、ユーザーは「業務時間内のスケジュール」だけに注目しやすくなり、スケジュール密度の把握・余白の発見が容易になる。

### なぜ MonthView には適用しないか

MonthView は時間軸を持たないため、営業時間の視覚化は意味をなさない。WeekView 専用の機能として実装する。

### なぜ CalendarStorage に統合するか

ビジネスアワー設定は「どの曜日の何時から何時が営業時間か」というユーザー固有の設定値であり、ブラウザを閉じても保持されるべきデータである。既存の `CalendarStorageData`（WeekViewSettings / MonthViewSettings を管理）に `businessHours` フィールドを追加することで、同じ永続化機構を再利用できる。

---

## Current Direction

### データ構造の設計方針

`CalendarStorageData` に `businessHours` フィールドを追加する。曜日ごとに「有効/無効」「開始時刻」「終了時刻」を持つ。

```
BusinessHours {
  enabled: boolean           // 機能全体の有効/無効スイッチ
  weekDays: {
    monday    : { enabled: boolean, startTime: "HH:MM", endTime: "HH:MM" }
    tuesday   : { ... }
    wednesday : { ... }
    thursday  : { ... }
    friday    : { ... }
    saturday  : { ... }
    sunday    : { ... }
  }
}
```

**デフォルト値**:
- `enabled: true`
- 月〜金: `enabled: true`, `startTime: "09:00"`, `endTime: "17:30"`
- 土日: `enabled: false`, `startTime: "00:00"`, `endTime: "00:00"`

時刻は `"HH:MM"` 形式の文字列（例: `"09:00"`）として保持する。数値（分）ではなく文字列にするのは、`<input type="time">` の `value` と直接 bind できるためである。

### WeekView での描画方針

各日の列（day column）に対して、その曜日の営業時間設定を参照し、**営業時間外**の領域を `position: absolute` のオーバーレイ div で覆う。

具体的には以下の2つの div を描画する：

1. **営業開始前オーバーレイ**: 列の最上部〜営業開始時刻の高さ分
2. **営業終了後オーバーレイ**: 営業終了時刻〜列の最下部の高さ分

`pointer-events: none` を設定して、アイテムの DnD やクリックを妨げないようにする。

**視覚仕様**:
- 営業時間外背景色: `rgba(0, 0, 0, 0.04)`（極めて薄いグレー、視認性を損なわない）
- 営業時間帯の左ボーダー: `2px solid #4285f4`（Google カレンダーライクな青い境界線）

### 設定 UI の配置

既存の「設定」ダイアログ（`SettingsModal.svelte` / `MonthSettingsModal.svelte`）とは別に、WeekView の設定ダイアログ（`SettingsModal.svelte`）に「営業時間」セクションを追加する。

```
【設定ダイアログ（WeekView）】
├─ 基本設定（startHour, endHour, minorTick ...）
└─ 営業時間設定  ← 【新規追加】
   ☑ 営業時間を表示する
   月曜日: ☑ 09:00 ─ 17:30
   火曜日: ☑ 09:00 ─ 17:30
   水曜日: ☑ 09:00 ─ 17:30
   木曜日: ☑ 09:00 ─ 17:30
   金曜日: ☑ 09:00 ─ 17:30
   土曜日: ☐ （時刻入力は非表示）
   日曜日: ☐ （時刻入力は非表示）
```

各曜日行の仕様:
- チェックボックスが OFF の場合、時刻入力欄は非表示にする（誤解を避けるため）
- `<input type="time">` を使用して時刻を入力させる
- 設定変更は即時 `storage.update()` に反映する（保存ボタン不要、既存設定ダイアログの方針に合わせる）

---

## TODO

- [ ] `src/lib/models/settings.ts` — `BusinessHours` 型・デフォルト値を追加し、`CalendarStorageData` に `businessHours` フィールドを追加
- [ ] `src/lib/components/SettingsModal.svelte` — 「営業時間設定」セクションを追加（曜日別 enabled チェックボックス + 時刻入力）
- [ ] `src/lib/components/WeekView.svelte` — 各 day column にビジネスアワーオーバーレイを描画するロジックを追加
- [ ] `src/lib/storage/LocalStorageBackend.ts` / `MemoryBackend.ts` — `businessHours` フィールドの load/save が正しく動作することを確認（`deepMerge` で自動対応されるはずだが検証する）
- [ ] `tests/unit/businessHours.test.ts` — `BusinessHours` デフォルト値・マージロジックのユニットテスト
- [ ] `tests/e2e/business-hours.spec.ts` — E2E テスト（設定 UI の操作・描画の検証）

---

## Notes

* 2026-02-24 — Issue 作成。`current_task.md` 記載の改善計画（機能2）を現行実装方針に合わせて整理。
* MonthView への適用は複雑性に対してメリットが小さいため対象外とした。
* `CalendarStorageData` に `businessHours` を追加するため、`DEFAULT_STORAGE_DATA` の更新と既存の LocalStorageBackend のデータ互換性（旧データに `businessHours` がない場合のフォールバック）を考慮する必要がある。`deepMerge` によりデフォルト値が補完されるため、基本的に後方互換性は保たれる。
* 時刻は `"HH:MM"` 文字列形式。`<input type="time">` と直接 bind するため、数値（分）への変換は描画時のみ行う。
