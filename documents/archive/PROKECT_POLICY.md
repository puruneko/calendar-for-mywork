# PROJECT_POLICY.md

## 目的（Purpose）

本ディレクトリ `project/` は、**コードではなく「プロジェクトの意思・仕様・作業状況」を管理する領域**である。
AI・人間を問わず、実装時の判断は必ず本ディレクトリの内容を根拠とすること。

`src/` 等の実装コードよりも、**意思決定の正本（Source of Truth）は project/ にある**。

---

## 基本原則（Core Principles）

1. **project/ は実装対象ではない**

   * ここは編集・参照する場所であり、アプリケーションから読み込む対象ではない。
   * 実行コードから参照してはならない。

2. **仕様はコードではなく project/specs に記述する**

   * コードコメントに仕様を書かない。
   * 振る舞いの定義は specs が唯一の正本。

3. **判断に迷った場合は project/ を優先**

   * README やコードよりも `project/decisions` を優先する。

4. **AIは project/ を読まずに実装してはならない**

   * 変更作業の前に必ず relevant な issue / spec / decision を確認する。

5. **project/ の更新とコード変更は同一コミットに含めてもよい**

   * Issue更新は「ドキュメント変更」ではなく「作業の一部」である。

---

## ディレクトリ構造と役割（Directory Semantics）

```
project/
 ├─ issues/        課題・要求・バグの管理
 ├─ specs/         現在有効な仕様（唯一の仕様書）
 ├─ decisions/     設計判断の記録（ADR）
 ├─ tasks/         実装単位の作業分解
 ├─ roadmap/       将来計画（任意）
 └─ templates/     各種テンプレート
```

---

## issues/ の扱い（Issue Management）

* 1ファイル = 1 Issue
* 状態は frontmatter で管理する：

```
status: open | in-progress | blocked | closed
```

* AIは Issue を読まずに変更してはならない。
* 実装理由は Issue に記録し、コードコメントに書かない。

---

## specs/ の扱い（Specification Rules）

* ここに書かれている内容が**現在の正式仕様**。
* 過去仕様は Git 履歴で管理し、別フォルダを作らない。
* AIは仕様変更を「推測」で行ってはならない。
* 仕様変更が必要な場合は Issue を作成する。

---

## decisions/ の扱い（Architectural Decisions）

設計選択の理由を記録する領域。

例：

* なぜこのライブラリを採用したか
* なぜこの設計を避けたか
* トレードオフの説明

AIは禁止事項：

* decisions を無視して別アプローチを実装すること。

---

## tasks/ の扱い（Execution Units）

tasks は Issue を実装可能な単位に分解したもの。

AIは：

* tasks を実行単位として扱う
* Issue を直接「全部実装」しようとしてはならない

---

## AI作業ルール（Mandatory Rules for AI Agents）

AIは作業開始時に必ず以下を行うこと：

1. 対象 Issue を特定
2. 関連 specs を読む
3. 関連 decisions を確認
4. 影響範囲を self-check
5. その後にのみ実装

この手順を省略してはならない。

---

## 禁止事項（Strictly Forbidden）

以下は禁止：

* project/ を参照せずに実装すること
* 仕様をコードから逆算して解釈すること
* Issue を更新せずに「完了」と判断すること
* decisions を無視した設計変更
* project/ をアプリのデータとして利用すること

---

## Git運用ルール（Git Relationship）

* ブランチは Issue ID と対応させる：

```
feature/0007-add-export
fix/0012-null-error
```

* コミットメッセージに Issue ID を含める：

```
#0007 CSV export implementation
```

---

## この構造の意図（Why This Exists）

この project/ 構造は：

* Issue管理ツールへの依存を排除
* Git履歴に意思決定を統合
* AI作業の文脈欠落を防止
* 長期保守で情報が散逸しないようにする

ためのものである。

---

## 最重要ルール（Prime Directive）

**コードはいつでも捨てて再生成できる。
しかし project/ に蓄積された意思決定は再生成できない。**

したがって、すべての変更は project/ と整合していなければならない。
