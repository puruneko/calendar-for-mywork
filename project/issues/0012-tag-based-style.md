# Issue #0012: タグベーススタイル自動適用

## Status

closed

---

## Summary

カレンダーアイテムの `tags` フィールドと状態（`Task.status`）に基づいて、スタイルを自動計算する仕組みを実装する。タグごとに対応するスタイルを定義でき、期限超過・完了済みなどの状態変化にも自動でスタイルが反応する。

---

## Background

### なぜタグベースのスタイルが必要か

現在、アイテムのスタイル（色・ボーダー等）は `CalendarItem.style` に手動で直接指定する形になっている。しかしこれでは、「重要」タグが付いたアイテムを一括で赤くしたい、期限を過ぎたタスクを自動でハイライトしたい、といった「条件に基づくスタイル変更」ができない。

タグとルールを組み合わせた自動スタイル計算を導入することで、ユーザーはアイテムごとに個別設定しなくても、タグを付けるだけで視覚的な分類が自動的に行われるようになる。

### なぜモデルの拡張が最小限で済むか

`CalendarItem` にはすでに以下のフィールドが存在する：
- `tags?: string[]` — タグ（分類用）
- `description?: string` — 詳細説明
- `style?: Partial<CSSStyleDeclaration>` — カスタムスタイル

また `Task` には `status: 'todo' | 'doing' | 'done' | 'undefined'` が存在するため、「完了」を `status === 'done'` で判定できる。

計画書が提案する `item.completed: boolean` フィールドは不要であり、現行モデルをそのまま使用する。

### スタイル計算の責任をどこに持たせるか

スタイル計算ロジックは純粋関数として `src/lib/utils/itemUtils.ts` に追加する。コンポーネントはこの関数を呼び出して計算されたスタイルを適用するだけにとどめ、ロジックとビューを分離する。

---

## Current Direction

### スタイル適用の優先度（低 → 高）

複数のスタイルが競合する場合、以下の優先度でマージする（後から適用されるほど優先度が高い）：

1. **タイプ別デフォルトスタイル** — `type: 'task'` / `'appointment'` / `'deadline'` ごとに設定された基準色
2. **タグスタイル** — タグとスタイルのマッピングテーブルから適用（複数タグはマージ）
3. **ルールベース条件付きスタイル** — 期限超過・完了など、状態に応じたプリセットルール
4. **手動指定スタイル** — `CalendarItem.style` に直接書かれた値（最優先）

この優先度設計の意図：手動指定は「このアイテムだけ特別にしたい」という明示的な意図であるため、自動ルールより強くする。ルールは「条件を満たしたら自動で変わる」視覚フィードバックであるため、デフォルトより強くする。

### タイプ別デフォルトカラー（モダン・目に優しいパレット）

プライベートとビジネスの両方で使えるモダンなパレットを採用した。これらは `getComputedItemStyle()` がデフォルトとして適用するが、タグ・ルール・手動指定で上書き可能。

| type | status | 色 | 印象 |
|---|---|---|---|
| `task` | `todo` / `undefined` | `#5B9CF6` | ソフトブルー（集中・未着手） |
| `task` | `doing` | `#FFA94D` | ウォームアンバー（活動・進行中） |
| `task` | `done` | `#A8C5A0` | セージグリーン（完了ルールで上書き） |
| `appointment` | — | `#6EBD8F` | ミントグリーン（予定・調和） |
| `deadline` | — | `#F07070` | ソフトコーラル（期限・警戒） |

### プリセットルール（Phase 1 で実装）

**期限超過タスク**（`overdue-task`）
- 条件: `type === 'task'` かつ `status !== 'done'` かつ `getSpanEnd(temporal)` が現在時刻より前
- 適用スタイル: `{ borderLeft: '3px solid #E53E3E' }`
- 意図: 対処が必要なアイテムを赤い左ボーダーで視覚的に警告する

**完了済みタスク**（`completed-task`）
- 条件: `type === 'task'` かつ `status === 'done'`
- 適用スタイル: `{ backgroundColor: '#cccccc', opacity: '0.6' }`
- 意図: 完了済みアイテムをグレーアウトし、未完了タスクへの視線集中を助ける

### `getComputedItemStyle()` 関数の仕様

```
getComputedItemStyle(
  item: CalendarItem,
  tagStyleMap?: Record<string, Partial<CSSStyleDeclaration>>,
  now?: DateTime   // デフォルトは現在時刻
): Partial<CSSStyleDeclaration>
```

- `tagStyleMap` はユーザーが定義するタグ→スタイルのマッピング。省略時はタグスタイルを適用しない
- `now` はテスト容易性のために注入可能にする（デフォルトは呼び出し時の現在時刻）
- 戻り値はそのまま Svelte の `style:` ディレクティブまたは `style` 属性に渡せる形式

### コンポーネントへの統合

`WeekView` / `MonthView` は現在 `CalendarItem.style` を直接参照してアイテムのスタイルを決定している。これを `getComputedItemStyle()` の戻り値に切り替える。

`tagStyleMap` は `CalendarView` の prop として受け取り、`WeekView` / `MonthView` に渡す。これにより、ユーザーはライブラリ利用時にタグ→スタイルのマッピングを自分で定義できる。

```
<CalendarView
  {items}
  {storage}
  tagStyleMap={{ '重要': { backgroundColor: '#ea4335', color: '#fff' } }}
/>
```

---

## TODO

- [x] `src/lib/utils/itemUtils.ts` — `getComputedItemStyle()` 関数を追加（タイプ別デフォルト → タグスタイル → ルール → 手動の優先度でマージ）
- [x] `src/lib/utils/itemUtils.ts` — `METRO_COLOR_PRESETS` 定数を定義（type/status別デフォルトカラー）
- [x] `src/lib/utils/itemUtils.ts` — `PRESET_STYLE_RULES` 定数を定義（期限超過・完了済みのプリセットルール）
- [x] `src/lib/components/CalendarView.svelte` — `tagStyleMap` prop を追加し WeekView / MonthView に渡す
- [x] `src/lib/components/WeekView.svelte` — アイテム描画時に `getComputedItemStyle()` を使用するよう切り替え
- [x] `src/lib/components/MonthView.svelte` — アイテム描画時に `getComputedItemStyle()` を使用するよう切り替え
- [x] `src/index.ts` — `getComputedItemStyle` / `METRO_COLOR_PRESETS` / `PRESET_STYLE_RULES` をエクスポート（`utils/index.ts` 経由で自動公開）
- [x] `tests/unit/itemUtils.test.ts` — `getComputedItemStyle()` のユニットテスト（優先度・各ルール・タグマッピングの動作）20 tests
- [x] `tests/e2e/tag-style.spec.ts` — E2E テスト（タグスタイル適用・型デフォルト色の確認）4 tests
- [x] `demo/App.svelte` — `tagStyleMap` の使用例をデモに追加（`重要` タグで赤背景）

---

## Notes

* 2026-02-24 — Issue 作成。`current_task.md` 記載の改善計画（機能3）を現行実装方針に合わせて整理。
* 2026-03-21 — 実装完了。カラーパレットをメトロカラーからモダン・目に優しいパレットに変更（ユーザー要望）。
* `item.completed` フィールドは追加しない。`Task.status === 'done'` で完了判定を行う。`appointment` / `deadline` には status がないため期限超過・完了ルールは `task` 専用とする。
* `getComputedItemStyle` という名前は組み込みの `window.getComputedStyle` と区別するため `getComputed**Item**Style` とする。
* 現行コードでは `WeekView` / `MonthView` が `style` オブジェクトを直接参照している箇所がある。切り替えは既存の描画ロジックへの最小限の変更にとどめる。
* `tagStyleMap` の型は `Record<string, Partial<CSSStyleDeclaration>>` とし、タグ名（文字列）をキーにする。
* E2E テストでカラーを確認する際、`applyDefaultOpacity` がHEX色を `color-mix(in srgb, rgb(...) N%, transparent)` へと変換するため、インライン style 属性には rgb 形式が含まれる。テストは `getAttribute('style')` で確認する。
