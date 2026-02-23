<script lang="ts">
/**
 * デモアプリケーション
 */

import { DateTime } from 'luxon';
import { CalendarView } from '../src/lib/components';
import type { CalendarItem } from '../src/lib/models';
import {
  toCalendarDate, createCalendarDateRange, validateCalendarItems, diffDays,
  createCalendarItem,
  updateTimedItem, updateAllDayItem,
} from '../src/lib/models';

// 基準日（今日）
const today = DateTime.now().startOf('day');
const d = (offset: number) => today.plus({ days: offset });

// サンプルデータ（今日を中心に前後1ヶ月、各パターンを網羅）
// 全アイテムは必ず生成関数を通して作成すること（バリデーション自動実行）
let items = $state<CalendarItem[]>([
  // ===== 今日 =====
  createCalendarItem({ type: 'task', id: '1', title: 'プロジェクト企画書作成', start: d(0).set({ hour: 9 }), end: d(0).set({ hour: 12 }), status: 'doing', parents: ['新規事業プロジェクト', '企画フェーズ'] }),
  createCalendarItem({ type: 'task', id: '2', title: 'コードレビュー', start: d(0).set({ hour: 10 }), end: d(0).set({ hour: 11 }), status: 'todo', parents: ['機能開発Sprint#5', 'QA'] }),
  createCalendarItem({ type: 'appointment', id: '3', title: 'チームミーティング', start: d(0).set({ hour: 11 }), end: d(0).set({ hour: 12 }), parents: ['週次定例会'] }),
  createCalendarItem({ type: 'task', id: '4', title: '要件定義書レビュー', start: d(0).set({ hour: 13 }), end: d(0).set({ hour: 14 }), status: 'doing', parents: ['A社案件', '要件定義フェーズ'] }),
  createCalendarItem({ type: 'task', id: '5', title: 'バグ修正#1234', start: d(0).set({ hour: 14 }), end: d(0).set({ hour: 15 }), status: 'doing', parents: ['機能開発Sprint#5'] }),
  createCalendarItem({ type: 'appointment', id: '6', title: '部署会議', start: d(0).set({ hour: 15 }), end: d(0).set({ hour: 16 }) }),
  createCalendarItem({ type: 'task', id: '7', title: '週報作成', start: d(0).set({ hour: 16 }), end: d(0).set({ hour: 16, minute: 30 }), status: 'todo' }),
  createCalendarItem({ type: 'task', id: '8', title: 'メール返信', start: d(0).set({ hour: 16, minute: 30 }), end: d(0).set({ hour: 17 }), status: 'todo' }),
  createCalendarItem({ type: 'appointment', id: '9', title: '1on1ミーティング', start: d(0).set({ hour: 17 }), end: d(0).set({ hour: 17, minute: 30 }) }),
  createCalendarItem({ type: 'task', id: '10', title: '夕会', start: d(0).set({ hour: 18 }), end: d(0).set({ hour: 18, minute: 30 }), status: 'todo' }),

  // ===== カスタムスタイル =====
  createCalendarItem({ type: 'task', id: 'c1', title: 'カスタム: 赤背景', start: d(0).set({ hour: 8 }), end: d(0).set({ hour: 9 }), status: 'todo', style: { backgroundColor: '#ff5252', color: '#fff', fontWeight: 'bold' } }),
  createCalendarItem({ type: 'task', id: 'c2', title: 'カスタム: 緑+斜体', start: d(1).set({ hour: 13 }), end: d(1).set({ hour: 14, minute: 30 }), status: 'doing', style: { backgroundColor: '#4caf50', color: '#fff', fontStyle: 'italic', borderRadius: '8px' } }),
  createCalendarItem({ type: 'appointment', id: 'c3', title: 'カスタム: 青+影', start: d(1).set({ hour: 15, minute: 30 }), end: d(1).set({ hour: 17 }), style: { backgroundColor: 'rgb(33,150,243)', color: '#fff', border: '2px solid #1976d2' } }),
  createCalendarItem({ type: 'task', id: 'c4', title: 'カスタム: グラデーション', start: d(2).set({ hour: 9 }), end: d(2).set({ hour: 10, minute: 30 }), status: 'done', style: { background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', fontWeight: '600', borderRadius: '12px' } }),
  createCalendarItem({ type: 'appointment', id: 'c5', title: 'カスタム: オレンジ点線', start: d(3).set({ hour: 14 }), end: d(3).set({ hour: 15, minute: 30 }), style: { backgroundColor: '#ff9800', color: '#333', border: '3px dotted #f57c00' } }),
  createCalendarItem({ type: 'task', id: 'c6', title: 'カスタム: 透明度指定済み', start: d(2).set({ hour: 11 }), end: d(2).set({ hour: 12 }), status: 'todo', style: { backgroundColor: 'rgba(156,39,176,0.9)', color: '#fff', textDecoration: 'underline' } }),

  // ===== 終日アイテム (単日・複数日) =====
  createCalendarItem({ type: 'task', id: 'a1', title: '終日: プロジェクト計画', dateRange: createCalendarDateRange(toCalendarDate(d(0)), toCalendarDate(d(1))), status: 'doing', parents: ['新規事業プロジェクト'] }),
  createCalendarItem({ type: 'appointment', id: 'a2', title: '終日: 全社会議', dateRange: createCalendarDateRange(toCalendarDate(d(1)), toCalendarDate(d(2))) }),
  createCalendarItem({ type: 'task', id: 'a3', title: '終日: 3日間研修', dateRange: createCalendarDateRange(toCalendarDate(d(2)), toCalendarDate(d(5))), status: 'todo', style: { backgroundColor: '#4caf50', color: '#fff' } }),
  createCalendarItem({ type: 'appointment', id: 'a4', title: '終日: 出張（大阪）', dateRange: createCalendarDateRange(toCalendarDate(d(5)), toCalendarDate(d(8))), parents: ['営業活動'] }),
  createCalendarItem({ type: 'task', id: 'a5', title: '終日: スプリント計画', dateRange: createCalendarDateRange(toCalendarDate(d(-7)), toCalendarDate(d(-5))), status: 'done', parents: ['開発チーム', 'Sprint#5'] }),
  createCalendarItem({ type: 'appointment', id: 'a6', title: '終日: 年次総会', dateRange: createCalendarDateRange(toCalendarDate(d(14)), toCalendarDate(d(15))) }),
  createCalendarItem({ type: 'task', id: 'a7', title: '終日: 月次レビュー', dateRange: createCalendarDateRange(toCalendarDate(d(-3)), toCalendarDate(d(-2))), status: 'done' }),
  createCalendarItem({ type: 'appointment', id: 'a8', title: '終日: 週またぎイベント', dateRange: createCalendarDateRange(toCalendarDate(d(10)), toCalendarDate(d(17))), style: { backgroundColor: '#9c27b0', color: '#fff' } }),
  createCalendarItem({ type: 'task', id: 'a9', title: '終日: 月またぎタスク', dateRange: createCalendarDateRange(toCalendarDate(d(25)), toCalendarDate(d(35))), status: 'todo', parents: ['Q2計画'] }),
  createCalendarItem({ type: 'appointment', id: 'a10', title: '終日: 過去の終日', dateRange: createCalendarDateRange(toCalendarDate(d(-20)), toCalendarDate(d(-18))) }),

  // ===== 時刻付きアイテム（前後1ヶ月を幅広くカバー） =====
  // 過去: -1〜-30日
  createCalendarItem({ type: 'task', id: 'p1', title: '先週の振り返り', start: d(-1).set({ hour: 10 }), end: d(-1).set({ hour: 11 }), status: 'done', parents: ['チーム', '週次'] }),
  createCalendarItem({ type: 'appointment', id: 'p2', title: '先週のクライアント面談', start: d(-1).set({ hour: 14 }), end: d(-1).set({ hour: 15, minute: 30 }) }),
  createCalendarItem({ type: 'task', id: 'p3', title: 'バグ修正#1000', start: d(-2).set({ hour: 9 }), end: d(-2).set({ hour: 12 }), status: 'done' }),
  createCalendarItem({ type: 'appointment', id: 'p4', title: '先々週の全体会議', start: d(-7).set({ hour: 10 }), end: d(-7).set({ hour: 12 }) }),
  createCalendarItem({ type: 'task', id: 'p5', title: 'スプリントレビュー', start: d(-7).set({ hour: 15 }), end: d(-7).set({ hour: 17 }), status: 'done', parents: ['開発チーム', 'Sprint#4'] }),
  createCalendarItem({ type: 'task', id: 'p6', title: '仕様書作成', start: d(-10).set({ hour: 9 }), end: d(-10).set({ hour: 18 }), status: 'done', parents: ['B社案件'] }),
  createCalendarItem({ type: 'appointment', id: 'p7', title: 'キックオフMTG', start: d(-14).set({ hour: 10 }), end: d(-14).set({ hour: 12 }), parents: ['新規事業プロジェクト'] }),
  createCalendarItem({ type: 'task', id: 'p8', title: 'UI設計レビュー', start: d(-14).set({ hour: 14 }), end: d(-14).set({ hour: 16 }), status: 'done', parents: ['UIリニューアル'] }),
  createCalendarItem({ type: 'appointment', id: 'p9', title: '月初計画MTG', start: d(-20).set({ hour: 9 }), end: d(-20).set({ hour: 11 }) }),
  createCalendarItem({ type: 'task', id: 'p10', title: '先月の総括タスク', start: d(-25).set({ hour: 10 }), end: d(-25).set({ hour: 12 }), status: 'done' }),
  createCalendarItem({ type: 'task', id: 'p11', title: '先月の設計レビュー', start: d(-28).set({ hour: 14 }), end: d(-28).set({ hour: 16 }), status: 'done', parents: ['A社案件', '設計フェーズ'] }),
  createCalendarItem({ type: 'appointment', id: 'p12', title: '先月末の全社総会', start: d(-30).set({ hour: 10 }), end: d(-30).set({ hour: 17 }) }),

  // 近未来: +1〜+14日
  createCalendarItem({ type: 'task', id: 'f1', title: 'ドキュメント更新', start: d(1).set({ hour: 10 }), end: d(1).set({ hour: 11, minute: 30 }), status: 'todo', parents: ['UIリニューアル', 'ドキュメント整備'] }),
  createCalendarItem({ type: 'appointment', id: 'f2', title: 'クライアントA打ち合わせ', start: d(2).set({ hour: 14 }), end: d(2).set({ hour: 16 }), parents: ['A社案件', '要件定義フェーズ'] }),
  createCalendarItem({ type: 'appointment', id: 'f3', title: 'ランチミーティング', start: d(3).set({ hour: 12 }), end: d(3).set({ hour: 13 }) }),
  createCalendarItem({ type: 'task', id: 'f4', title: 'テスト実装', start: d(3).set({ hour: 14 }), end: d(3).set({ hour: 17 }), status: 'todo', parents: ['機能開発Sprint#5'] }),
  createCalendarItem({ type: 'task', id: 'f5', title: 'パフォーマンス改善', start: d(4).set({ hour: 9 }), end: d(4).set({ hour: 12 }), status: 'todo' }),
  createCalendarItem({ type: 'appointment', id: 'f6', title: '週次定例会', start: d(4).set({ hour: 14 }), end: d(4).set({ hour: 15 }), parents: ['週次定例会'] }),
  createCalendarItem({ type: 'task', id: 'f7', title: 'セキュリティ監査対応', start: d(6).set({ hour: 10 }), end: d(6).set({ hour: 12 }), status: 'todo', parents: ['インフラチーム'] }),
  createCalendarItem({ type: 'appointment', id: 'f8', title: '取締役会プレゼン', start: d(7).set({ hour: 10 }), end: d(7).set({ hour: 12 }), parents: ['新規事業プロジェクト'] }),
  createCalendarItem({ type: 'task', id: 'f9', title: 'API設計書作成', start: d(8).set({ hour: 9 }), end: d(8).set({ hour: 12 }), status: 'todo', parents: ['B社案件', '設計フェーズ'] }),
  createCalendarItem({ type: 'appointment', id: 'f10', title: 'B社ステークホルダーMTG', start: d(9).set({ hour: 14 }), end: d(9).set({ hour: 16 }), parents: ['B社案件'] }),
  createCalendarItem({ type: 'task', id: 'f11', title: 'コードフリーズ対応', start: d(11).set({ hour: 9 }), end: d(11).set({ hour: 18 }), status: 'todo', parents: ['機能開発Sprint#5'] }),
  createCalendarItem({ type: 'appointment', id: 'f12', title: 'スプリントレビュー#5', start: d(12).set({ hour: 15 }), end: d(12).set({ hour: 17 }), parents: ['開発チーム', 'Sprint#5'] }),
  createCalendarItem({ type: 'task', id: 'f13', title: 'リリースノート作成', start: d(13).set({ hour: 10 }), end: d(13).set({ hour: 12 }), status: 'todo' }),
  createCalendarItem({ type: 'appointment', id: 'f14', title: '外部研修', start: d(14).set({ hour: 9 }), end: d(14).set({ hour: 17 }) }),

  // 遠未来: +15〜+30日
  createCalendarItem({ type: 'task', id: 'ff1', title: '次スプリント計画', start: d(15).set({ hour: 10 }), end: d(15).set({ hour: 12 }), status: 'todo', parents: ['開発チーム', 'Sprint#6'] }),
  createCalendarItem({ type: 'appointment', id: 'ff2', title: '月次レポート提出', start: d(17).set({ hour: 15 }), end: d(17).set({ hour: 16 }) }),
  createCalendarItem({ type: 'task', id: 'ff3', title: 'インフラ移行作業', start: d(18).set({ hour: 9 }), end: d(18).set({ hour: 18 }), status: 'todo', parents: ['インフラチーム'] }),
  createCalendarItem({ type: 'appointment', id: 'ff4', title: 'A社最終提案', start: d(20).set({ hour: 14 }), end: d(20).set({ hour: 16 }), parents: ['A社案件'] }),
  createCalendarItem({ type: 'task', id: 'ff5', title: 'Q2計画策定', start: d(22).set({ hour: 10 }), end: d(22).set({ hour: 12 }), status: 'todo', parents: ['Q2計画'] }),
  createCalendarItem({ type: 'appointment', id: 'ff6', title: '年度末全体会議', start: d(25).set({ hour: 10 }), end: d(25).set({ hour: 17 }) }),
  createCalendarItem({ type: 'task', id: 'ff7', title: '次期プロジェクト企画', start: d(28).set({ hour: 9 }), end: d(28).set({ hour: 12 }), status: 'todo', parents: ['新規事業プロジェクト', '次期フェーズ'] }),
  createCalendarItem({ type: 'appointment', id: 'ff8', title: '来月の外部監査', start: d(30).set({ hour: 10 }), end: d(30).set({ hour: 17 }) }),

  // 複数日またがり (allday)
  createCalendarItem({ type: 'task', id: 'm1', title: '3日間ワークショップ', dateRange: createCalendarDateRange(toCalendarDate(d(1)), toCalendarDate(d(3))), status: 'doing', parents: ['研修プログラム'] }),
  createCalendarItem({ type: 'appointment', id: 'm2', title: '出張（大阪）', dateRange: createCalendarDateRange(toCalendarDate(d(5)), toCalendarDate(d(7))), parents: ['営業活動'] }),
  createCalendarItem({ type: 'task', id: 'm3', title: '週またぎ開発タスク', dateRange: createCalendarDateRange(toCalendarDate(d(-2)), toCalendarDate(d(2))), status: 'doing', parents: ['機能開発Sprint#5'] }),
  createCalendarItem({ type: 'appointment', id: 'm4', title: '展示会参加', dateRange: createCalendarDateRange(toCalendarDate(d(19)), toCalendarDate(d(21))) }),
  createCalendarItem({ type: 'task', id: 'm5', title: '月またぎプロジェクト', dateRange: createCalendarDateRange(toCalendarDate(d(28)), toCalendarDate(d(33))), status: 'todo', parents: ['Q2計画', '大型案件'] }),

  // 同一日に多数（+1日: expanded-panel確認用）
  createCalendarItem({ type: 'task', id: 'e1', title: '朝のスタンドアップ', start: d(1).set({ hour: 9 }), end: d(1).set({ hour: 9, minute: 15 }), status: 'done' }),
  createCalendarItem({ type: 'appointment', id: 'e2', title: '採用面接', start: d(1).set({ hour: 10 }), end: d(1).set({ hour: 11 }) }),
  createCalendarItem({ type: 'task', id: 'e3', title: 'PRレビュー#234', start: d(1).set({ hour: 11, minute: 30 }), end: d(1).set({ hour: 12, minute: 30 }), status: 'todo', parents: ['機能開発Sprint#5'] }),
  createCalendarItem({ type: 'appointment', id: 'e4', title: 'ランチMTG', start: d(1).set({ hour: 12 }), end: d(1).set({ hour: 13 }) }),
  createCalendarItem({ type: 'task', id: 'e5', title: 'DB移行スクリプト作成', start: d(1).set({ hour: 14 }), end: d(1).set({ hour: 16 }), status: 'todo', parents: ['インフラチーム'] }),
  createCalendarItem({ type: 'appointment', id: 'e6', title: '社外セミナー', start: d(1).set({ hour: 18 }), end: d(1).set({ hour: 20 }) }),
]);

let currentDate = $state(DateTime.now());
let viewType = $state<'week' | 'month'>('week');

// カレンダー設定（WeekView用）
let startHour = $state(8);
let endHour = $state(20);
let minorTick = $state(15);
let showWeekend = $state(true);
let showAllDay = $state(true);
let defaultColorOpacity = $state(0.5);
let weekStartsOn = $state(1);
let itemRightMargin = $state(10);
let showParent = $state(true);
let parentDisplayIndex = $state(-1);

// MonthView専用設定
let monthMaxItemsPerDay = $state(6);
let monthWeekStartsOn = $state(1);
let monthShowWeekend = $state(true);
let monthShowAllDay = $state(true);
let monthShowSingleDay = $state(true);

// イベントハンドラ
function handleItemClick(item: CalendarItem) {
  console.debug('Item clicked:', item);
  console.debug(`クリック: ${item.title}\nタイプ: ${item.type}`);
}

function handleItemMove(item: CalendarItem, newStart: DateTime, newEnd: DateTime) {
  console.debug('Item moved:', item, newStart, newEnd);
  items = items.map(i => {
    if (i.id !== item.id) return i;
    // AllDayアイテム（dateRange）はCalendarDateで更新し、元の期間を保持する
    if ('dateRange' in i && i.dateRange) {
      const span = diffDays(i.dateRange);
      const newStartDate = toCalendarDate(newStart.startOf('day'));
      const newEndDate = toCalendarDate(newStart.startOf('day').plus({ days: span }));
      return { ...i, dateRange: createCalendarDateRange(newStartDate, newEndDate) };
    }
    // TimedアイテムはDateTimeで更新
    return { ...i, start: newStart, end: newEnd };
  });
}

function handleItemResize(item: CalendarItem, newStart: DateTime, newEnd: DateTime) {
  console.debug('Item resized:', item, newStart, newEnd);
  items = items.map(i => {
    if (i.id !== item.id) return i;
    // AllDayアイテム（dateRange）はCalendarDateで更新
    if ('dateRange' in i && i.dateRange) {
      const newStartDate = toCalendarDate(newStart.startOf('day'));
      const newEndDate = toCalendarDate(newEnd.startOf('day'));
      return { ...i, dateRange: createCalendarDateRange(newStartDate, newEndDate) };
    }
    // TimedアイテムはDateTimeで更新
    return { ...i, start: newStart, end: newEnd };
  });
}

function handleViewChange(newDate: DateTime) {
  console.debug('View changed:', newDate);
  currentDate = newDate;
}

function handleSettingsChange(settings: {
  minorTick: number;
  startHour: number;
  endHour: number;
  showWeekend: boolean;
  showAllDay: boolean;
  defaultColorOpacity: number;
  weekStartsOn: number;
  itemRightMargin: number;
  showParent: boolean;
  parentDisplayIndex: number;
}) {
  console.debug('Settings changed:', settings);
  minorTick = settings.minorTick;
  startHour = settings.startHour;
  endHour = settings.endHour;
  showWeekend = settings.showWeekend;
  showAllDay = settings.showAllDay;
  defaultColorOpacity = settings.defaultColorOpacity;
  weekStartsOn = settings.weekStartsOn;
  itemRightMargin = settings.itemRightMargin;
  showParent = settings.showParent;
  parentDisplayIndex = settings.parentDisplayIndex;
}

// items変化時に自動バリデーション（不正データをコンソールに出力）
$effect(() => {
  validateCalendarItems(items);
});

function handleMonthSettingsChange(settings: {
  maxItemsPerDay: number;
  weekStartsOn: number;
  showWeekend: boolean;
  showAllDay: boolean;
  showSingleDay: boolean;
}) {
  console.debug('MonthView settings changed:', settings);
  monthMaxItemsPerDay = settings.maxItemsPerDay;
  monthWeekStartsOn = settings.weekStartsOn;
  monthShowWeekend = settings.showWeekend;
  monthShowAllDay = settings.showAllDay;
  monthShowSingleDay = settings.showSingleDay;
}

function handleCellClick(dateTime: DateTime, clickPosition: { x: number; y: number }) {
  console.debug('Cell clicked!');
  console.debug('DateTime:', dateTime.toISO());
  console.debug('Click Position:', clickPosition);
}
</script>

<div class="demo-app">
  <header class="app-header">
    <h1>📅 Calendar Library Demo</h1>
    <p>Svelte + TypeScript カレンダーUIライブラリのデモ</p>
  </header>
  
  <main class="app-main">
    <CalendarView
      {items}
      {currentDate}
      bind:viewType
      {startHour}
      {endHour}
      {minorTick}
      {showWeekend}
      {showAllDay}
      {defaultColorOpacity}
      {weekStartsOn}
      {itemRightMargin}
      {showParent}
      {parentDisplayIndex}
      monthMaxItemsPerDay={monthMaxItemsPerDay}
      monthWeekStartsOn={monthWeekStartsOn}
      monthShowWeekend={monthShowWeekend}
      monthShowAllDay={monthShowAllDay}
      monthShowSingleDay={monthShowSingleDay}
      onItemClick={handleItemClick}
      onItemMove={handleItemMove}
      onItemResize={handleItemResize}
      onViewChange={handleViewChange}
      onCellClick={handleCellClick}
      onSettingsChange={handleSettingsChange}
      onMonthSettingsChange={handleMonthSettingsChange}
    />
  </main>
</div>

<style>
  .demo-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #f5f5f5;
  }

  .app-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .app-header h1 {
    font-size: 28px;
    margin-bottom: 8px;
  }

  .app-header p {
    font-size: 14px;
    opacity: 0.9;
  }

  .app-main {
    flex: 1;
    overflow: hidden;
    padding: 16px;
    min-height: 0;
  }

  :global(:root) {
    --calendar-bg: #ffffff;
    --calendar-grid-color: #e0e0e0;
    --calendar-text-color: #333333;
    --task-todo-bg: #90caf9;
    --task-doing-bg: #ffb74d;
    --task-done-bg: #a5d6a7;
    --appointment-bg: #ce93d8;
    --calendar-font-family: 'Segoe UI', sans-serif;
    
    /* z-index階層の定義（集中管理） */
    --z-base: 1;
    --z-timeline: 5;
    --z-cell-expanded: 10;
    --z-resize-handle: 20;
    --z-dnd-dragging: 100;
    --z-modal-backdrop: 1000;
    --z-modal-content: 1001;
    --z-month-expanded-items: 1000;
    --z-month-expanded-header: 1001;
  }
</style>
