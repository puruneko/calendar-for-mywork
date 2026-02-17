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

- ✅ 1週間表示カレンダー（月曜日-日曜日）
- ✅ Task/Appointment の表示
- ✅ ステータス別の色分け（todo/doing/done）
- ✅ 週のナビゲーション（前週/次週/今日）
- ✅ アイテムクリックイベント
- ✅ レスポンシブデザイン
- ✅ アクセシビリティ対応

## 📊 テスト結果

- **単体テスト**: 10/10 パス ✅
- **E2Eテスト**: 7/7 パス ✅
- **ブラウザ動作**: エラーなし ✅

## 📚 ドキュメント

- [COOPERATION_POLICY.md](./COOPERATION_POLICY.md) - 開発ルール
- [ONBOARDING.md](./ONBOARDING.md) - 開発引き継ぎ情報
- [ARCHITECTURE.md](./ARCHITECTURE.md) - アーキテクチャ設計
- [LIBRARY_USAGE.md](./LIBRARY_USAGE.md) - 利用者向けガイド

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

- [ ] DnD機能（ドラッグ&ドロップ）
- [ ] ズーム機能（時間軸の拡大/縮小）
- [ ] 日表示モード
- [ ] 月表示モード
- [ ] 年表示モード
- [ ] 仮想スクロール（大量データ対応）
- [ ] アイテムのリサイズ機能

## 📄 ライセンス

MIT

## 🤝 貢献

プルリクエスト歓迎！
