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
- データモデル（Task/Appointment/CalendarItem）の実装
- WeekView（週表示）コンポーネント - 完全実装
- MonthView（月表示）コンポーネント - 完全実装（下記「MonthView実装詳細」参照）
- CalendarView（統合ビュー）コンポーネント - 週/月切り替え対応
- SettingsModal（設定モーダル）コンポーネント
- DnD機能（ドラッグ&ドロップ）- WeekView/MonthView両対応
- リサイズ機能（WeekView: 上端/下端ハンドル、MonthView: allday-itemの左右ハンドル）
- 時間軸の刻み機能（majorTick/minorTick）
- 現在時刻線の表示
- カスタムスタイル機能（アイテム単位のスタイル指定）
- 親子関係の表示機能（parentId対応）
- 設定可能な右余白（itemRightMargin）
- レスポンシブデザイン
- アクセシビリティ対応
- 単体テスト: 58件（dateUtils, dndUtils, laneLayoutAlgorithm）
- E2Eテスト: 9ファイル（calendar, custom-style, dnd, month-view, month-view-resize, overlay-hit-test, resize-and-settings, resize, tick-and-timeline）

### 📋 未着手
- 日表示モード
- 年表示モード
- 仮想スクロール（大量データ対応）
- ライブラリのnpmパッケージ公開

## MonthView 実装詳細（2026-02-20 最新）

### 3層構造アーキテクチャ
MonthViewは週ごとに3層スタックで構成されています：

```
week-stack（flex: column）
├── week-chrome    … Layer 1: 日付番号（chrome-cell × 7）
├── week-allday    … Layer 2: 複数日バー（allday-item、CSS Grid絶対配置）
└── week-grid      … Layer 3: 単日アイテム（grid-cell × 7）
```

### 主要CSSクラス名
| クラス名 | 説明 |
|---|---|
| `.week-stack` | 週全体のコンテナ（CSS変数 `--allday-height`, `--grid-cell-height` を保持） |
| `.chrome-cell` | 日付番号セル。`.today`, `.other-month`, `.drag-over` 修飾あり |
| `.week-allday` | 複数日バーのキャンバス。高さ = `laneCount × 24px` |
| `.allday-item` | 複数日バー。CSS変数 `--lane`, `--start-index`, `--span` で配置 |
| `.allday-grid-lines` | allday領域の縦罫線用透明グリッド |
| `.grid-cell` | 単日アイテムのセル。高さ固定 `--grid-cell-height`（デフォルト120px=6行分） |
| `.day-expander` | セル底部の展開トグルボタン（アイテム数が上限超過時のみ表示） |
| `.expanded-panel` | calendar-content直下に絶対配置される展開パネル |
| `.expanded-panel-overlay` | パネル外クリックで閉じるための透明オーバーレイ |
| `.resize-handle-left` / `.resize-handle-right` | allday-item の左右リサイズハンドル |

### レーン配置アルゴリズム（laneLayoutAlgorithm.ts）
`layoutWeekAllDay(items, weekStart, weekEnd)` で複数日バーのレーン（行）を計算します。
- **deterministic**: アイテムIDでソートするため、毎回同じ結果が返る
- **入力のend**: `CalendarItem.end` が timed（例: `17:00`）の場合は **`+1日`してexclusiveに変換**してから渡す
  - これにより週またぎアイテムが翌週でも正しいspanで表示される

### DnDの実装ポイント
- `allday-item`のドラッグ: `handleDragStart(event, item, barStartIndex, weekDays)` を使用
  - バー内のマウスX座標から「つかんだ列」を計算し `dragOffsetDays` にセット
  - ドロップ時: `newStart = dropDay - dragOffsetDays` で移動先を決定
- 単日アイテムのドラッグ: `handleSingleDayDragStart(event, item)` を使用（オフセットなし）
- `chrome-cell` と `grid-cell` 両方がドラッグイベントを受け取り、`drag-over` クラスで同期表示

### 展開パネルの仕組み
- `MAX_ITEMS_PER_DAY = 6` を超えるItemがある日に `day-expander` ボタンが表示される
- クリックで `toggleExpand(event, day, cellEl, hiddenItems)` が呼ばれる
  - `cellEl.getBoundingClientRect()` でgrid-cellの位置を取得
  - `top = cellRect.bottom`（grid-cellの真下）にパネルを配置
  - `border-top: none` + `box-shadow: 左右下のみ` でセルが延長されたように見せる
- `expandedHiddenItems`（上限超過分のItemのみ）をパネルに表示
- オーバーレイ外クリックで `expandedDay = null` にリセット

## 技術スタック

- **言語**: TypeScript
- **UIフレームワーク**: Svelte 5（runes mode: `$state`, `$derived`）
- **ビルドツール**: Vite
- **テスト**: Vitest（単体）+ Playwright（E2E）
- **日付ライブラリ**: Luxon
- **開発ポート**: 5176

## テスト実行コマンド

```bash
npm run test:function   # 単体テスト（58件）
npm run test:e2e        # E2Eテスト（73件パス、2スキップ）
npx playwright test month-view.spec.ts  # MonthViewのみ
```

## ディレクトリ構造

```
.
├── src/
│   ├── lib/
│   │   ├── models/        # データモデル（Task, Appointment, CalendarItem）
│   │   ├── components/    # Svelteコンポーネント
│   │   │   ├── MonthView.svelte   ★ 最近大幅改修
│   │   │   ├── WeekView.svelte
│   │   │   ├── CalendarView.svelte
│   │   │   └── SettingsModal.svelte
│   │   └── utils/
│   │       ├── laneLayoutAlgorithm.ts  ★ 複数日バーのレーン配置
│   │       ├── itemUtils.ts
│   │       ├── dateUtils.ts
│   │       └── dndUtils.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   │   ├── laneLayoutAlgorithm.test.ts  ★ 25件
│   │   ├── dateUtils.test.ts
│   │   └── dndUtils.test.ts
│   └── e2e/
│       ├── month-view.spec.ts           ★ 33件
│       ├── overlay-hit-test.spec.ts     ★ 新規
│       ├── month-view-resize.spec.ts    ★ 新規
│       └── ...（他6ファイル）
├── demo/
│   └── App.svelte   # デモアプリ（今日基準のサンプルデータ）
└── documents/
    └── agent/
        └── plan/
            └── monthview_refactoring_plan.md  # 完了済みリファクタリング計画
```

## 開発の引き継ぎチェックリスト

- [ ] COOPERATION_POLICY.mdを読んだ
- [ ] documents配下のドキュメントを全て読んだ
  - gitにコミットが無い場合は、initial_prompt.mdを読み新プロジェクトの概要を確認してください。コミットがある場合は読まないでください。

## 次にやるべきこと

最新commitログとONBOARDINGの「未着手」セクションから確認。
主な候補：
1. **日表示モード**の実装
2. **vite library build**設定（npmパッケージ公開準備）
3. **MonthViewのDnD改善**（allday-item→grid-cellへのDnD等）

## 重要な制約事項

- TaskとAppointmentを絶対に統合しない
- データ正本を強要しない（外部管理型/内部管理型を選択可能に）
- 双方向データ同期をしない
- 環境依存のAPI（Node専用等）を使わない
- 日付計算は必ずLuxonを使用
- テストは毎回実施・メンテナンスすること（実装変更時は必ずテストも更新）

## 最終更新

2026-02-20: MonthViewの大幅リファクタリング完了（3層CSS Grid構造・レーン配置アルゴリズム・DnDオフセット計算・day-expander・expanded-panel）
