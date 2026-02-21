<script lang="ts">
/**
 * デモアプリケーション
 */

import { DateTime } from 'luxon';
import { CalendarView } from '../src/lib/components';
import type { CalendarItem, Task, Appointment } from '../src/lib/models';
import { toCalendarDate, createCalendarDateRange } from '../src/lib/models';

// 基準日（今日）
const today = DateTime.now().startOf('day');
const d = (offset: number) => today.plus({ days: offset });

// サンプルデータ（100件: 今日を中心に前後1ヶ月、各パターンを網羅）
let items = $state<CalendarItem[]>([
  // ===== 今日 =====
  {
    id: '1',
    type: 'task',
    title: 'プロジェクト企画書作成',
    start: d(0).set({ hour: 9, minute: 0 }),
    end: d(0).set({ hour: 12, minute: 0 }),
    status: 'doing',
    parents: ['新規事業プロジェクト', '企画フェーズ'],
  } as Task,
  // 今日（オーバーフロー確認用: 10件）
  { id: '2', type: 'task', title: 'コードレビュー', start: d(0).set({ hour: 10, minute: 0 }), end: d(0).set({ hour: 11, minute: 0 }), status: 'todo', parents: ['機能開発Sprint#5', 'QA'] } as Task,
  { id: '3', type: 'appointment', title: 'チームミーティング', start: d(0).set({ hour: 11, minute: 0 }), end: d(0).set({ hour: 12, minute: 0 }), parents: ['週次定例会'] } as Appointment,
  { id: '4', type: 'task', title: '要件定義書レビュー', start: d(0).set({ hour: 13, minute: 0 }), end: d(0).set({ hour: 14, minute: 0 }), status: 'doing', parents: ['A社案件', '要件定義フェーズ'] } as Task,
  { id: '5', type: 'task', title: 'バグ修正#1234', start: d(0).set({ hour: 14, minute: 0 }), end: d(0).set({ hour: 15, minute: 0 }), status: 'doing', parents: ['機能開発Sprint#5'] } as Task,
  { id: '6', type: 'appointment', title: '部署会議', start: d(0).set({ hour: 15, minute: 0 }), end: d(0).set({ hour: 16, minute: 0 }) } as Appointment,
  { id: '7', type: 'task', title: '週報作成', start: d(0).set({ hour: 16, minute: 0 }), end: d(0).set({ hour: 16, minute: 30 }), status: 'todo' } as Task,
  { id: '8', type: 'task', title: 'メール返信', start: d(0).set({ hour: 16, minute: 30 }), end: d(0).set({ hour: 17, minute: 0 }), status: 'todo' } as Task,
  { id: '9', type: 'appointment', title: '1on1ミーティング', start: d(0).set({ hour: 17, minute: 0 }), end: d(0).set({ hour: 17, minute: 30 }) } as Appointment,
  { id: '10', type: 'task', title: '夕会', start: d(0).set({ hour: 18, minute: 0 }), end: d(0).set({ hour: 18, minute: 30 }), status: 'todo' } as Task,
  
  // ===== カスタムスタイル =====
  { id: 'c1', type: 'task', title: 'カスタム: 赤背景', start: d(0).set({ hour: 8, minute: 0 }), end: d(0).set({ hour: 9, minute: 0 }), status: 'todo', style: { backgroundColor: '#ff5252', color: '#fff', fontWeight: 'bold' } } as Task,
  { id: 'c2', type: 'task', title: 'カスタム: 緑+斜体', start: d(1).set({ hour: 13, minute: 0 }), end: d(1).set({ hour: 14, minute: 30 }), status: 'doing', style: { backgroundColor: '#4caf50', color: '#fff', fontStyle: 'italic', borderRadius: '8px' } } as Task,
  { id: 'c3', type: 'appointment', title: 'カスタム: 青+影', start: d(1).set({ hour: 15, minute: 30 }), end: d(1).set({ hour: 17, minute: 0 }), style: { backgroundColor: 'rgb(33,150,243)', color: '#fff', border: '2px solid #1976d2' } } as Appointment,
  { id: 'c4', type: 'task', title: 'カスタム: グラデーション', start: d(2).set({ hour: 9, minute: 0 }), end: d(2).set({ hour: 10, minute: 30 }), status: 'done', style: { background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', fontWeight: '600', borderRadius: '12px' } } as Task,
  { id: 'c5', type: 'appointment', title: 'カスタム: オレンジ点線', start: d(3).set({ hour: 14, minute: 0 }), end: d(3).set({ hour: 15, minute: 30 }), style: { backgroundColor: '#ff9800', color: '#333', border: '3px dotted #f57c00' } } as Appointment,
  { id: 'c6', type: 'task', title: 'カスタム: 透明度指定済み', start: d(2).set({ hour: 11, minute: 0 }), end: d(2).set({ hour: 12, minute: 0 }), status: 'todo', style: { backgroundColor: 'rgba(156,39,176,0.9)', color: '#fff', textDecoration: 'underline' } } as Task,

  // ===== 終日アイテム (単日・複数日) =====
  { id: 'a1', type: 'task', title: '終日: プロジェクト計画', dateRange: createCalendarDateRange(toCalendarDate(d(0)), toCalendarDate(d(1))), status: 'doing', parents: ['新規事業プロジェクト'] } as Task,
  { id: 'a2', type: 'appointment', title: '終日: 全社会議', dateRange: createCalendarDateRange(toCalendarDate(d(1)), toCalendarDate(d(2))) } as Appointment,
  { id: 'a3', type: 'task', title: '終日: 3日間研修', dateRange: createCalendarDateRange(toCalendarDate(d(2)), toCalendarDate(d(5))), status: 'todo', style: { backgroundColor: '#4caf50', color: '#fff' } } as Task,
  { id: 'a4', type: 'appointment', title: '終日: 出張（大阪）', dateRange: createCalendarDateRange(toCalendarDate(d(5)), toCalendarDate(d(8))), parents: ['営業活動'] } as Appointment,
  { id: 'a5', type: 'task', title: '終日: スプリント計画', dateRange: createCalendarDateRange(toCalendarDate(d(-7)), toCalendarDate(d(-5))), status: 'done', parents: ['開発チーム', 'Sprint#5'] } as Task,
  { id: 'a6', type: 'appointment', title: '終日: 年次総会', dateRange: createCalendarDateRange(toCalendarDate(d(14)), toCalendarDate(d(15))) } as Appointment,
  { id: 'a7', type: 'task', title: '終日: 月次レビュー', dateRange: createCalendarDateRange(toCalendarDate(d(-3)), toCalendarDate(d(-2))), status: 'done' } as Task,
  { id: 'a8', type: 'appointment', title: '終日: 週またぎイベント', dateRange: createCalendarDateRange(toCalendarDate(d(10)), toCalendarDate(d(17))), style: { backgroundColor: '#9c27b0', color: '#fff' } } as Appointment,
  { id: 'a9', type: 'task', title: '終日: 月またぎタスク', dateRange: createCalendarDateRange(toCalendarDate(d(25)), toCalendarDate(d(35))), status: 'todo', parents: ['Q2計画'] } as Task,
  { id: 'a10', type: 'appointment', title: '終日: 過去の終日', dateRange: createCalendarDateRange(toCalendarDate(d(-20)), toCalendarDate(d(-18))) } as Appointment,

  // ===== 時刻付きアイテム（前後1ヶ月を幅広くカバー） =====
  // 過去: -1〜-30日
  { id: 'p1', type: 'task', title: '先週の振り返り', start: d(-1).set({ hour: 10, minute: 0 }), end: d(-1).set({ hour: 11, minute: 0 }), status: 'done', parents: ['チーム', '週次'] } as Task,
  { id: 'p2', type: 'appointment', title: '先週のクライアント面談', start: d(-1).set({ hour: 14, minute: 0 }), end: d(-1).set({ hour: 15, minute: 30 }) } as Appointment,
  { id: 'p3', type: 'task', title: 'バグ修正#1000', start: d(-2).set({ hour: 9, minute: 0 }), end: d(-2).set({ hour: 12, minute: 0 }), status: 'done' } as Task,
  { id: 'p4', type: 'appointment', title: '先々週の全体会議', start: d(-7).set({ hour: 10, minute: 0 }), end: d(-7).set({ hour: 12, minute: 0 }) } as Appointment,
  { id: 'p5', type: 'task', title: 'スプリントレビュー', start: d(-7).set({ hour: 15, minute: 0 }), end: d(-7).set({ hour: 17, minute: 0 }), status: 'done', parents: ['開発チーム', 'Sprint#4'] } as Task,
  { id: 'p6', type: 'task', title: '仕様書作成', start: d(-10).set({ hour: 9, minute: 0 }), end: d(-10).set({ hour: 18, minute: 0 }), status: 'done', parents: ['B社案件'] } as Task,
  { id: 'p7', type: 'appointment', title: 'キックオフMTG', start: d(-14).set({ hour: 10, minute: 0 }), end: d(-14).set({ hour: 12, minute: 0 }), parents: ['新規事業プロジェクト'] } as Appointment,
  { id: 'p8', type: 'task', title: 'UI設計レビュー', start: d(-14).set({ hour: 14, minute: 0 }), end: d(-14).set({ hour: 16, minute: 0 }), status: 'done', parents: ['UIリニューアル'] } as Task,
  { id: 'p9', type: 'appointment', title: '月初計画MTG', start: d(-20).set({ hour: 9, minute: 0 }), end: d(-20).set({ hour: 11, minute: 0 }) } as Appointment,
  { id: 'p10', type: 'task', title: '先月の総括タスク', start: d(-25).set({ hour: 10, minute: 0 }), end: d(-25).set({ hour: 12, minute: 0 }), status: 'done' } as Task,
  { id: 'p11', type: 'task', title: '先月の設計レビュー', start: d(-28).set({ hour: 14, minute: 0 }), end: d(-28).set({ hour: 16, minute: 0 }), status: 'done', parents: ['A社案件', '設計フェーズ'] } as Task,
  { id: 'p12', type: 'appointment', title: '先月末の全社総会', start: d(-30).set({ hour: 10, minute: 0 }), end: d(-30).set({ hour: 17, minute: 0 }) } as Appointment,

  // 近未来: +1〜+14日
  { id: 'f1', type: 'task', title: 'ドキュメント更新', start: d(1).set({ hour: 10, minute: 0 }), end: d(1).set({ hour: 11, minute: 30 }), status: 'todo', parents: ['UIリニューアル', 'ドキュメント整備'] } as Task,
  { id: 'f2', type: 'appointment', title: 'クライアントA打ち合わせ', start: d(2).set({ hour: 14, minute: 0 }), end: d(2).set({ hour: 16, minute: 0 }), parents: ['A社案件', '要件定義フェーズ'] } as Appointment,
  { id: 'f3', type: 'appointment', title: 'ランチミーティング', start: d(3).set({ hour: 12, minute: 0 }), end: d(3).set({ hour: 13, minute: 0 }) } as Appointment,
  { id: 'f4', type: 'task', title: 'テスト実装', start: d(3).set({ hour: 14, minute: 0 }), end: d(3).set({ hour: 17, minute: 0 }), status: 'todo', parents: ['機能開発Sprint#5'] } as Task,
  { id: 'f5', type: 'task', title: 'パフォーマンス改善', start: d(4).set({ hour: 9, minute: 0 }), end: d(4).set({ hour: 12, minute: 0 }), status: 'todo' } as Task,
  { id: 'f6', type: 'appointment', title: '週次定例会', start: d(4).set({ hour: 14, minute: 0 }), end: d(4).set({ hour: 15, minute: 0 }), parents: ['週次定例会'] } as Appointment,
  { id: 'f7', type: 'task', title: 'セキュリティ監査対応', start: d(6).set({ hour: 10, minute: 0 }), end: d(6).set({ hour: 12, minute: 0 }), status: 'todo', parents: ['インフラチーム'] } as Task,
  { id: 'f8', type: 'appointment', title: '取締役会プレゼン', start: d(7).set({ hour: 10, minute: 0 }), end: d(7).set({ hour: 12, minute: 0 }), parents: ['新規事業プロジェクト'] } as Appointment,
  { id: 'f9', type: 'task', title: 'API設計書作成', start: d(8).set({ hour: 9, minute: 0 }), end: d(8).set({ hour: 12, minute: 0 }), status: 'todo', parents: ['B社案件', '設計フェーズ'] } as Task,
  { id: 'f10', type: 'appointment', title: 'B社ステークホルダーMTG', start: d(9).set({ hour: 14, minute: 0 }), end: d(9).set({ hour: 16, minute: 0 }), parents: ['B社案件'] } as Appointment,
  { id: 'f11', type: 'task', title: 'コードフリーズ対応', start: d(11).set({ hour: 9, minute: 0 }), end: d(11).set({ hour: 18, minute: 0 }), status: 'todo', parents: ['機能開発Sprint#5'] } as Task,
  { id: 'f12', type: 'appointment', title: 'スプリントレビュー#5', start: d(12).set({ hour: 15, minute: 0 }), end: d(12).set({ hour: 17, minute: 0 }), parents: ['開発チーム', 'Sprint#5'] } as Appointment,
  { id: 'f13', type: 'task', title: 'リリースノート作成', start: d(13).set({ hour: 10, minute: 0 }), end: d(13).set({ hour: 12, minute: 0 }), status: 'todo' } as Task,
  { id: 'f14', type: 'appointment', title: '外部研修', start: d(14).set({ hour: 9, minute: 0 }), end: d(14).set({ hour: 17, minute: 0 }) } as Appointment,

  // 遠未来: +15〜+30日
  { id: 'ff1', type: 'task', title: '次スプリント計画', start: d(15).set({ hour: 10, minute: 0 }), end: d(15).set({ hour: 12, minute: 0 }), status: 'todo', parents: ['開発チーム', 'Sprint#6'] } as Task,
  { id: 'ff2', type: 'appointment', title: '月次レポート提出', start: d(17).set({ hour: 15, minute: 0 }), end: d(17).set({ hour: 16, minute: 0 }) } as Appointment,
  { id: 'ff3', type: 'task', title: 'インフラ移行作業', start: d(18).set({ hour: 9, minute: 0 }), end: d(18).set({ hour: 18, minute: 0 }), status: 'todo', parents: ['インフラチーム'] } as Task,
  { id: 'ff4', type: 'appointment', title: 'A社最終提案', start: d(20).set({ hour: 14, minute: 0 }), end: d(20).set({ hour: 16, minute: 0 }), parents: ['A社案件'] } as Appointment,
  { id: 'ff5', type: 'task', title: 'Q2計画策定', start: d(22).set({ hour: 10, minute: 0 }), end: d(22).set({ hour: 12, minute: 0 }), status: 'todo', parents: ['Q2計画'] } as Task,
  { id: 'ff6', type: 'appointment', title: '年度末全体会議', start: d(25).set({ hour: 10, minute: 0 }), end: d(25).set({ hour: 17, minute: 0 }) } as Appointment,
  { id: 'ff7', type: 'task', title: '次期プロジェクト企画', start: d(28).set({ hour: 9, minute: 0 }), end: d(28).set({ hour: 12, minute: 0 }), status: 'todo', parents: ['新規事業プロジェクト', '次期フェーズ'] } as Task,
  { id: 'ff8', type: 'appointment', title: '来月の外部監査', start: d(30).set({ hour: 10, minute: 0 }), end: d(30).set({ hour: 17, minute: 0 }) } as Appointment,

  // 複数日またがり (timed)
  { id: 'm1', type: 'task', title: '3日間ワークショップ', start: d(1).set({ hour: 9, minute: 0 }), end: d(3).set({ hour: 17, minute: 0 }), status: 'doing', parents: ['研修プログラム'] } as Task,
  { id: 'm2', type: 'appointment', title: '出張（大阪）', start: d(5).set({ hour: 8, minute: 0 }), end: d(7).set({ hour: 20, minute: 0 }), parents: ['営業活動'] } as Appointment,
  { id: 'm3', type: 'task', title: '週またぎ開発タスク', start: d(-2).set({ hour: 9, minute: 0 }), end: d(2).set({ hour: 18, minute: 0 }), status: 'doing', parents: ['機能開発Sprint#5'] } as Task,
  { id: 'm4', type: 'appointment', title: '展示会参加', start: d(19).set({ hour: 9, minute: 0 }), end: d(21).set({ hour: 18, minute: 0 }) } as Appointment,
  { id: 'm5', type: 'task', title: '月またぎプロジェクト', start: d(28).set({ hour: 9, minute: 0 }), end: d(33).set({ hour: 18, minute: 0 }), status: 'todo', parents: ['Q2計画', '大型案件'] } as Task,

  // 同一日に多数（+1日: expanded-panel確認用）
  { id: 'e1', type: 'task', title: '朝のスタンドアップ', start: d(1).set({ hour: 9, minute: 0 }), end: d(1).set({ hour: 9, minute: 15 }), status: 'done' } as Task,
  { id: 'e2', type: 'appointment', title: '採用面接', start: d(1).set({ hour: 10, minute: 0 }), end: d(1).set({ hour: 11, minute: 0 }) } as Appointment,
  { id: 'e3', type: 'task', title: 'PRレビュー#234', start: d(1).set({ hour: 11, minute: 30 }), end: d(1).set({ hour: 12, minute: 30 }), status: 'todo', parents: ['機能開発Sprint#5'] } as Task,
  { id: 'e4', type: 'appointment', title: 'ランチMTG', start: d(1).set({ hour: 12, minute: 0 }), end: d(1).set({ hour: 13, minute: 0 }) } as Appointment,
  { id: 'e5', type: 'task', title: 'DB移行スクリプト作成', start: d(1).set({ hour: 14, minute: 0 }), end: d(1).set({ hour: 16, minute: 0 }), status: 'todo', parents: ['インフラチーム'] } as Task,
  { id: 'e6', type: 'appointment', title: '社外セミナー', start: d(1).set({ hour: 18, minute: 0 }), end: d(1).set({ hour: 20, minute: 0 }) } as Appointment,
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
  items = items.map(i =>
    i.id === item.id
      ? { ...i, start: newStart, end: newEnd }
      : i
  );
}

function handleItemResize(item: CalendarItem, newStart: DateTime, newEnd: DateTime) {
  console.debug('Item resized:', item, newStart, newEnd);
  items = items.map(i =>
    i.id === item.id
      ? { ...i, start: newStart, end: newEnd }
      : i
  );
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
