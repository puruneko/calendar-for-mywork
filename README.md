# Svelte Calendar Library

純粋な描画専用カレンダーUIライブラリ

## 🎯 特徴

- **描画専用**: データ管理は利用側に委譲
- **ドメイン分離**: Task（作業）と Appointment（予定）を完全分離
- **組み込み前提**: VSCode/Obsidian/Electron/Tauri/Webアプリに対応
- **fullcalendar互換**: fullcalendarの設計思想を参考

## 📦 技術スタック

- TypeScript
- Svelte 5
- Vite
- Luxon (日付ライブラリ)
- Vitest (単体テスト)
- Playwright (E2Eテスト)

## 🚀 クイックスタート

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:5176` にアクセス

### テスト実行

```bash
# 単体テスト
npm test

# E2Eテスト
npm run test:e2e
```

## ✅ 実装済み機能

### コンポーネント
- ✅ WeekView（週表示カレンダー）
- ✅ MonthView（月表示カレンダー）
- ✅ CalendarView（週/月切り替え統合ビュー）
- ✅ SettingsModal（設定モーダル）

### 機能
- ✅ Task/Appointment の表示と区別
- ✅ ステータス別の色分け（todo/doing/done/undefined）
- ✅ 週/月のナビゲーション（前週/次週/今日、前月/次月）
- ✅ アイテムクリックイベント
- ✅ DnD機能（ドラッグ&ドロップでアイテム移動）
- ✅ リサイズ機能（上端/下端ハンドルで時間調整）
- ✅ 時間軸の刻み設定（majorTick/minorTick）
- ✅ 現在時刻線の表示
- ✅ カスタムスタイル機能（アイテム単位でスタイル指定可能）
- ✅ 親子関係の表示（parentId対応、親タスクの表示制御）
- ✅ アイテム右余白の設定（itemRightMargin）
- ✅ 表示時間帯のカスタマイズ（startHour/endHour）
- ✅ 週開始曜日の設定（weekStartsOn）
- ✅ 週末表示/非表示の切り替え（showWeekend）
- ✅ 全日イベント表示（showAllDay）
- ✅ レスポンシブデザイン
- ✅ アクセシビリティ対応

## 📊 テスト結果

- **単体テスト**: 33/33 パス ✅
  - dateUtils: 10件
  - dndUtils: 23件
- **E2Eテスト**: 7ファイル ✅
  - calendar.spec.ts（基本カレンダー機能）
  - custom-style.spec.ts（カスタムスタイル）
  - dnd.spec.ts（ドラッグ&ドロップ）
  - month-view.spec.ts（月表示）
  - resize-and-settings.spec.ts（リサイズと設定）
  - resize.spec.ts（リサイズ機能）
  - tick-and-timeline.spec.ts（時間軸の刻みと現在時刻線）
- **ブラウザ動作**: エラーなし ✅

## 📚 ドキュメント

- [ARCHITECTURE.md](./documents/ARCHITECTURE.md) - アーキテクチャ設計
- [LIBRARY_USAGE.md](./documents/LIBRARY_USAGE.md) - 利用者向けガイド
- [ONBOARDING.md](./documents/agent/ONBOARDING.md) - 開発引き継ぎ情報
- [COOPERATION_POLICY.md](./documents/agent/COOPERATION_POLICY.md) - 開発ルール
- [TESTING_POLICY.md](./documents/agent/TESTING_POLICY.md) - テスト方針

## 🎨 使用例

```typescript
import { WeekView } from 'svelte-calendar-lib';
import { DateTime } from 'luxon';
import type { Task, Appointment } from 'svelte-calendar-lib';

const items = [
  {
    id: '1',
    type: 'task',
    title: 'プロジェクト企画書作成',
    start: DateTime.now().set({ hour: 9 }),
    end: DateTime.now().set({ hour: 12 }),
    status: 'doing',
  } as Task,
  {
    id: '2',
    type: 'appointment',
    title: 'チームミーティング',
    start: DateTime.now().set({ hour: 14 }),
    end: DateTime.now().set({ hour: 15 }),
  } as Appointment,
];
```

```svelte
<WeekView 
  {items}
  currentDate={DateTime.now()}
  onItemClick={(item) => console.log('Clicked:', item)}
/>
```

## 🔜 今後の予定

- [ ] 日表示モード
- [ ] 年表示モード
- [ ] 仮想スクロール（大量データ対応）
- [ ] MonthViewの複数日アイテム表示改善（オーバーレイ機能）
- [ ] npmパッケージとして公開
- [ ] パフォーマンス最適化（1,000件以上のアイテム対応）
- [ ] タイムゾーン対応
- [ ] 繰り返しイベント（recurring events）

## 📄 ライセンス

MIT

## 🤝 貢献

プルリクエスト歓迎！
