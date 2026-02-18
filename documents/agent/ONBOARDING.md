# ONBOARDING - 開発引き継ぎドキュメント

## プロジェクト概要

**カレンダーUIライブラリ** - 純粋な描画専用エンジン

- TypeScript + Svelte で実装
- fullcalendarを参考にした設計
- Task（作業単位）と Appointment（時間拘束）を完全分離
- データ管理は利用側に委譲し、UIレンダリングのみに特化

## 現在の開発状況

### ✅ 完了済み
- プロジェクト初期設定（package.json, tsconfig.json, vite.config.ts等）
- 依存関係のインストール（Svelte, Vite, Vitest, Playwright, Luxon等）

### 🚧 進行中
- 基本的なプロジェクト構造の作成

### 📋 未着手
- データモデル（Task/Appointment）の実装
- 1週間表示の基本カレンダーUIコンポーネント
- DnD機能
- ズーム機能
- テストコード

## 技術スタック

- **言語**: TypeScript
- **UIフレームワーク**: Svelte 4/5対応
- **ビルドツール**: Vite
- **テスト**: Vitest（単体）+ Playwright（E2E）
- **日付ライブラリ**: Luxon
- **開発ポート**: 5176

## ディレクトリ構造

```
.
├── src/                    # ソースコード
│   ├── lib/               # ライブラリ本体
│   │   ├── models/        # データモデル
│   │   ├── components/    # Svelteコンポーネント
│   │   └── utils/         # ユーティリティ
│   └── index.ts           # エントリーポイント
├── tests/
│   ├── unit/              # 単体テスト
│   └── e2e/               # E2Eテスト
├── demo/                  # デモアプリ
└── documents/             # ドキュメント
```

## 開発の引き継ぎチェックリスト

- [ ] COOPERATION_POLICY.mdを読んだ
- [ ] documents配下のドキュメントを全て読んだ
  - gitにコミットが無い場合は、initial_prompt.mdを読み新プロジェクトの概要を確認してください。コミットがある場合は読まないでください。

## 次にやるべきこと

gitのcommitログより確認

## 重要な制約事項

- TaskとAppointmentを絶対に統合しない
- データ正本を強要しない（外部管理型/内部管理型を選択可能に）
- 双方向データ同期をしない
- 環境依存のAPI（Node専用等）を使わない
- 日付計算は必ずLuxonを使用


## 最終更新

2026-02-17: プロジェクト初期セットアップ完了
