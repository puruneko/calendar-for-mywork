# Issue #0010: イベント編集ダイアログ

## Status

open

---

## Summary

カレンダーアイテムをダブルクリックすると詳細編集ダイアログが開き、タイトル・時刻・タグ・説明・カスタムスタイルを編集・保存・削除できる機能を実装する。

このライブラリは現状「表示専用」であり、ユーザーがアイテムの内容を変更する手段を持っていない。編集 UI を追加することで「管理できるカレンダー」へと進化させることがこの Issue の目的である。

---

## Background

### なぜ編集ダイアログが必要か

現在の `WeekView` / `MonthView` はアイテムの表示・DnD・リサイズには対応しているが、アイテムの内容（タイトル・説明・タグ・スタイル）を変更する UI を持っていない。ライブラリの利用者が自前で編集 UI を構築する必要があり、採用コストが高い。

標準の編集ダイアログを提供することで、ライブラリ単体で「カレンダーアイテムの CRUD」を完結させる。

### なぜ Svelte stores（writable）を使わないか

このプロジェクトは Svelte 5 を採用しており、状態管理には `$state` / `$derived` を使う方針である（`AI_RUNTIME_RULES.md` に準拠）。`writable` 等の Svelte 3/4 stores はコードベースで使用していないため、ダイアログの状態も `$state` で管理する。

### なぜ items の永続化をこの Issue に含めないか

`CalendarStorage`（Issue #0009）は現状「設定値（WeekViewSettings / MonthViewSettings）」のみを永続化対象としており、`items` は引き続き親コンポーネントが props として渡す設計になっている。

編集結果を親に伝える手段としては **コールバック prop**（`onItemUpdate` / `onItemDelete`）を使用する。これにより、ライブラリはデータの保存先を問わず動作でき、永続化戦略をユーザーが自由に選択できる。

---

## Current Direction

### ダイアログの開閉管理

- ダブルクリックを `WeekView` / `MonthView` が検知し、クリックされたアイテムを `CalendarView` に伝える
- `CalendarView` が `$state` でダイアログの開閉状態と編集中アイテムを保持する
- `EventEditDialog.svelte` は `CalendarView` の子コンポーネントとして配置し、`CalendarView` がポータルのように表示/非表示を制御する

### 保存・削除の責任分界

- **保存**: `onItemUpdate(updatedItem: CalendarItem)` コールバックを `CalendarView` の prop として公開し、ユーザーが任意のストレージに書き込む
- **削除**: `onItemDelete(id: string)` コールバックを同様に公開する
- コールバックが提供されない場合、ダイアログは表示されるが保存・削除は何も起きない（無害なデフォルト）

### UI レイアウト（Outlook 風）

```
┌───────────────────────────────────────────────────────┐
│ [タイトル入力欄]                        [style ボタン]  │ ← 上部
├───────────────────────────────────────────────────────┤
│                                                        │
│  開始: [2026-02-24] [09:00]                            │
│  終了: [2026-02-24] [17:30]    [☐ AllDay]              │
│                                                        │
│  タグ: [重要 ×] [急ぎ ×]  [入力して Enter...]          │
│                                                        │
│  説明:                                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │（テキストエリア 5行）                              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
├───────────────────────────────────────────────────────┤
│ [キャンセル]              [削除]           [保存]       │ ← 下部
└───────────────────────────────────────────────────────┘
```

#### 種別コンボボックス（type 選択）

アイテムの `type` を変更するコンボボックス（`<select>`）を提供する。

| 選択肢 | 内部値 | 説明 |
|---|---|---|
| 予定（Appointment） | `appointment` | 時刻を持つ予定。開始・終了の時刻入力を表示する |
| タスク（Task） | `task` | ステータス（todo / doing / done）を持つ作業。時刻を持つ |
| 終日（AllDay） | `allday` | 終日イベント。時刻入力欄を非表示にし日付のみを入力させる |
| 締切（Deadline） | `deadline` | 締切日時を持つアイテム。終了時刻を「締切日時」として扱う |

**種別変更時の挙動:**
- `task` ↔ `appointment` 間の変更: 時刻は保持する。status フィールドは task 時のみ有効
- `allday` に変更: 時刻入力欄を非表示にし、開始・終了を日付のみで表現する（`temporal` を CalendarDateRange 型に切り替える）
- `allday` から他への変更: 時刻入力欄を再表示し、デフォルト時刻（09:00 / 10:00）を補完する
- `deadline` に変更: 「終了」ラベルを「締切」に変更する。開始時刻入力欄は保持する

**なぜスイッチではなくコンボボックスか:**
AllDay の ON/OFF だけでは `deadline` 型を選択する手段がない。また、`type` は CalendarItem の根幹的な属性であり、ユーザーが明示的に選択する操作が適切である。スイッチは「2択の切り替え」に向いているが、種別は4種類あるためコンボボックスが自然なUIである。

### スタイル編集について

`CalendarItem.style` フィールドはモデルとして引き続き存在し、DnD・ライブラリ利用者がコード経由で設定したスタイルはそのまま表示される。

ただし、**編集ダイアログからのスタイル編集は提供しない**。

**理由:**
ユーザーが任意のCSSを入力できるUIは、`position: fixed` によるUIの破壊や `url()` / `expression()` を使った注入攻撃のリスクがある。これを安全に防ぐためにはPostCSSを使ったASTベースのサニタイズが必要だが、ライブラリとして依存を増やすことが望ましくないため、この Issue ではスコープ外とする。

### バリデーション

バリデーションは「保存ボタン」押下時に実行し、エラーがある場合は該当フィールドの下に赤いメッセージを表示して保存を中断する。

| フィールド | ルール | エラーメッセージ |
|---|---|---|
| タイトル | 1文字以上 | 「タイトルを入力してください」 |
| 開始・終了時刻 | 終了 > 開始（AllDay 時は終了日 ≥ 開始日） | 「終了時刻は開始時刻より後にしてください」 |
| 説明 | 1000文字以下 | 「説明は1000文字以下です」 |

### 削除時の確認ダイアログ

削除は取り消せない操作のため、確認ダイアログを挟む。

```
┌──────────────────────────────────────┐
│ アイテムを削除します                  │
│                                       │
│ 「チーム定例」                        │
│ 2026年2月24日 09:00 - 10:00          │
│                                       │
│ この操作は取り消せません。             │
│                                       │
│ [キャンセル]         [削除]           │
└──────────────────────────────────────┘
```

### 現行モデルとの対応関係

改善計画書（`current_task.md`）は実装方針の一部が現行コードと異なる。以下を正として実装する。

| 計画書の記述 | 現行実装 | 正しい実装方針 |
|---|---|---|
| `item.name` | `item.title` | `title` を使う |
| `item.startTime / endTime` | `item.temporal: TimeSpan` | `getSpanStart()` / `getSpanEnd()` で取得する |
| `item.completed` | `(item as Task).status === 'done'` | `status` フィールドを使う（`appointment` には status なし） |
| `type: 'Task' \| 'Appointment' \| 'AllDay'` | `type: 'task' \| 'appointment' \| 'deadline'` | 現行の型リテラルを使う |
| `writable` ストア | `$state` | `$state` を使う |
| `on:click` 等 | `onclick` 等（Svelte 5 記法） | Svelte 5 記法を使う |

---

## TODO

- [ ] `src/lib/components/EventEditDialog.svelte` — ダイアログ本体（タイトル・種別コンボボックス・時刻・タグ・説明・ボタン）
- [ ] `src/lib/components/EventEditDialog.svelte` — バリデーションロジック（保存時に実行、エラー表示）
- [ ] `src/lib/components/EventEditDialog.svelte` — 削除確認サブダイアログ
- [ ] `src/lib/components/CalendarView.svelte` — `onItemUpdate` / `onItemDelete` コールバック prop 追加
- [ ] `src/lib/components/CalendarView.svelte` — ダイアログ開閉 `$state`・編集中アイテム `$state` を追加
- [ ] `src/lib/components/WeekView.svelte` — アイテムのダブルクリック検知 → 親への通知
- [ ] `src/lib/components/MonthView.svelte` — アイテムのダブルクリック検知 → 親への通知
- [ ] `src/lib/components/index.ts` — `EventEditDialog` / `StyleEditor` をエクスポート
- [ ] `demo/App.svelte` — `onItemUpdate` / `onItemDelete` ハンドラを実装（デモ用インメモリ更新）
- [ ] `tests/e2e/event-edit-dialog.spec.ts` — E2E テスト（ダイアログ起動・フィールド編集・スタイル編集・保存・バリデーションエラー・削除確認）

---

## Notes

* 2026-02-24 — Issue 作成。`current_task.md` 記載の改善計画（機能1）を現行実装方針に合わせて整理。
* items の CRUD 永続化は CalendarStorage のスコープ外。`onItemUpdate` / `onItemDelete` コールバックで親に委譲する設計とした。将来 Issue で CalendarStorage に items CRUD を統合する可能性あり。
* Svelte 5 記法（`onclick`, `$state`, `$props` 等）を使用する。Svelte 3/4 の `writable` / `on:click` は使わない。
