id: 0005
title: 設定UIをインラインパネルに変更（WeekView・MonthView共通）
status: open
type: feature
priority: high
assignee: unassigned
created: 2026-02-23
updated: 2026-02-23
related_specs: [system-baseline.spec.md]
related_decisions: []
related_tasks: []

---

## 1. Background

現在の設定UIはモーダルダイアログ（SettingsModal / MonthSettingsModal）で実装されており、
画面全体を覆うオーバーレイが表示される。

ユーザーからの要求として、モーダルではなくナビゲーションメニューのように
設定ボタンを押すと設定パネルが下に表示されるインラインUIに変更する。

---

## 2. Expected Behavior

- 設定ボタンを押すと、ヘッダー直下にインラインで設定パネルが展開される
- 再度ボタンを押すと閉じる（トグル動作）
- WeekView・MonthView の両方に適用する
- 設定パネル内の文字・UIはカレンダー本体より少し小さめにする
- 設定ボタンのアイコンを以下のSVGに変更する:
  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="4" y1="21" x2="4" y2="14"></line>
    <line x1="4" y1="10" x2="4" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12" y2="3"></line>
    <line x1="20" y1="21" x2="20" y2="16"></line>
    <line x1="20" y1="12" x2="20" y2="3"></line>
    <line x1="1" y1="14" x2="7" y2="14"></line>
    <line x1="9" y1="8" x2="15" y2="8"></line>
    <line x1="17" y1="16" x2="23" y2="16"></line>
  </svg>
  ```

---

## 3. Non-Goals

- 設定項目の内容変更は行わない（既存の設定項目をそのまま移植する）
- モーダルコンポーネントファイルは削除せず、import・使用箇所のみ除去する

---

## 4. Constraints

- WeekView.svelte / MonthView.svelte のみ変更する（外部APIは変更しない）
- `onSettingsChange` など外部向けのプロパティ・イベントは維持する

---

## 5. Acceptance Criteria

- [ ] WeekView で設定ボタンを押すとインラインパネルが開閉する
- [ ] MonthView で設定ボタンを押すとインラインパネルが開閉する
- [ ] 設定ボタンのアイコンが指定のSVGになっている
- [ ] パネル内の文字・フォームがカレンダー本体より小さめ
- [ ] 既存の設定項目が全て機能する
- [ ] モーダル（SettingsModal / MonthSettingsModal）が表示されなくなっている

---

## 6. TODO

- [x] Issue 作成
- [x] WeekView: SettingsModal を削除しインラインパネルを実装
- [x] MonthView: MonthSettingsModal を削除しインラインパネルを実装
- [x] アイコン変更（両View）
- [x] 動作確認・テスト修正（unit 126件パス、ビルド成功）

---

## 7. Definition of Done

- [ ] 全Acceptance Criteriaを満たす
- [ ] 既存テストが通る（またはUIの変更に伴う修正を完了している）
- [ ] ユーザーが承認
