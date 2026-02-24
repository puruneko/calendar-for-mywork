<script lang="ts">
/**
 * デモアプリケーション
 */

import { DateTime } from 'luxon';
import { CalendarView } from '../src/lib/components';
import { CalendarStorage, LocalStorageBackend } from '../src/lib/storage';
import type { CalendarItem } from '../src/lib/models';
import {
  toISODate, createCalendarDateRange, validateCalendarItems, diffDays,
  createCalendarItem,
  updateTimedItem, updateAllDayItem, updatePointItem,
} from '../src/lib/models';

// CalendarStorage を作成（LocalStorageBackend で永続化）
const storage = new CalendarStorage(new LocalStorageBackend('demo-calendar'), {
  weekSettings: { startHour: 8, endHour: 20 },
  monthSettings: { maxItemsPerDay: 6 },
});

// 基準日（今日）
const today = DateTime.now().startOf('day');
const d = (offset: number) => today.plus({ days: offset });

// サンプルデータ
let items = $state<CalendarItem[]>([
  // ===== 今日 =====
  createCalendarItem({ type: 'task', id: '1', title: 'プロジェクト企画書作成', start: d(0).set({ hour: 9 }), end: d(0).set({ hour: 12 }), status: 'doing', parents: ['新規事業プロジェクト', '企画フェーズ'] }),
  createCalendarItem({ type: 'task', id: '2', title: 'コードレビュー', start: d(0).set({ hour: 10 }), end: d(0).set({ hour: 11 }), status: 'todo', parents: ['機能開発Sprint#5', 'QA'] }),
  createCalendarItem({ type: 'appointment', id: '3', title: 'チームミーティング', start: d(0).set({ hour: 11 }), end: d(0).set({ hour: 12 }), parents: ['週次定例'] }),
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
  createCalendarItem({ type: 'appointment', id: 'c3', title: 'カスタム: 青+影', start: d(1).set({ hour: 15, minute: 30 }), end: d(1).set({ hour: 17 }), style: { backgroundColor: 'rgb(33,150,243)', color: '#fff', border: '2px solid #1976d2', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' } }),
  createCalendarItem({ type: 'task', id: 'c4', title: 'カスタム: グラデーション', start: d(2).set({ hour: 9 }), end: d(2).set({ hour: 10, minute: 30 }), status: 'done', style: { background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', fontWeight: '600', borderRadius: '12px' } }),
  createCalendarItem({ type: 'appointment', id: 'c5', title: 'カスタム: オレンジ点線', start: d(3).set({ hour: 14 }), end: d(3).set({ hour: 15, minute: 30 }), style: { backgroundColor: '#ff9800', color: '#333', border: '3px dotted #f57c00' } }),
  createCalendarItem({ type: 'task', id: 'c6', title: 'カスタム: 透明度指定済み', start: d(2).set({ hour: 11 }), end: d(2).set({ hour: 12 }), status: 'todo', style: { backgroundColor: 'rgba(156,39,176,0.9)', color: '#fff', textDecoration: 'underline' } }),

  // ===== 終日アイテム =====
  createCalendarItem({ type: 'task', id: 'a1', title: '終日: プロジェクト計画', dateRange: { start: toISODate(d(0)), endExclusive: toISODate(d(1)) }, status: 'doing', parents: ['新規事業プロジェクト'] }),
  createCalendarItem({ type: 'appointment', id: 'a2', title: '終日: 全社会議', dateRange: { start: toISODate(d(1)), endExclusive: toISODate(d(2)) } }),
  createCalendarItem({ type: 'task', id: 'a3', title: '終日: 3日間研修', dateRange: { start: toISODate(d(2)), endExclusive: toISODate(d(5)) }, status: 'todo', style: { backgroundColor: '#4caf50', color: '#fff' } }),
  createCalendarItem({ type: 'appointment', id: 'a4', title: '終日: 出張（大阪）', dateRange: { start: toISODate(d(5)), endExclusive: toISODate(d(8)) }, parents: ['営業活動'] }),
  createCalendarItem({ type: 'appointment', id: 'a8', title: '終日: 週またぎイベント', dateRange: { start: toISODate(d(10)), endExclusive: toISODate(d(17)) }, style: { backgroundColor: '#9c27b0', color: '#fff' } }),

  // ===== Deadline アイテム =====
  createCalendarItem({ type: 'deadline', id: 'dl1', title: '提案書締切（分単位）', at: d(0).set({ hour: 17 }) }),
  createCalendarItem({ type: 'deadline', id: 'dl2', title: 'レポート提出締切（分単位）', at: d(1).set({ hour: 12 }) }),
  createCalendarItem({ type: 'deadline', id: 'dl3', title: 'スプリント締切（日単位）', datePoint: toISODate(d(3)) }),
  createCalendarItem({ type: 'deadline', id: 'dl4', title: 'リリース期限（日単位）', datePoint: toISODate(d(14)) }),

  // ===== 複数日またがり (allday) =====
  createCalendarItem({ type: 'task', id: 'm1', title: '3日間ワークショップ', dateRange: { start: toISODate(d(1)), endExclusive: toISODate(d(3)) }, status: 'doing', parents: ['研修プログラム'] }),
  createCalendarItem({ type: 'appointment', id: 'm2', title: '出張（大阪）', dateRange: { start: toISODate(d(5)), endExclusive: toISODate(d(7)) }, parents: ['営業活動'] }),
  createCalendarItem({ type: 'task', id: 'm3', title: '週またぎ開発タスク', dateRange: { start: toISODate(d(-2)), endExclusive: toISODate(d(2)) }, status: 'doing', parents: ['機能開発Sprint#5'] }),
  createCalendarItem({ type: 'appointment', id: 'm4', title: '展示会参加', dateRange: { start: toISODate(d(19)), endExclusive: toISODate(d(21)) } }),
  createCalendarItem({ type: 'task', id: 'm5', title: '月またぎプロジェクト', dateRange: { start: toISODate(d(28)), endExclusive: toISODate(d(33)) }, status: 'todo', parents: ['Q2計画', '大型案件'] }),

  // ===== 近未来 =====
  createCalendarItem({ type: 'task', id: 'f1', title: 'ドキュメント更新', start: d(1).set({ hour: 10 }), end: d(1).set({ hour: 11, minute: 30 }), status: 'todo', parents: ['UIリニューアル'] }),
  createCalendarItem({ type: 'appointment', id: 'f2', title: 'クライアント打ち合わせ', start: d(2).set({ hour: 14 }), end: d(2).set({ hour: 16 }), parents: ['A社案件'] }),
  createCalendarItem({ type: 'appointment', id: 'f3', title: 'ランチMTG', start: d(1).set({ hour: 12 }), end: d(1).set({ hour: 13 }) }),
  createCalendarItem({ type: 'task', id: 'f4', title: 'テスト実装', start: d(3).set({ hour: 14 }), end: d(3).set({ hour: 17 }), status: 'todo', parents: ['機能開発Sprint#5'] }),
  createCalendarItem({ type: 'task', id: 'f5', title: 'パフォーマンス改善', start: d(4).set({ hour: 9 }), end: d(4).set({ hour: 12 }), status: 'todo' }),
  createCalendarItem({ type: 'appointment', id: 'f6', title: '週次定例', start: d(4).set({ hour: 14 }), end: d(4).set({ hour: 15 }) }),
  createCalendarItem({ type: 'appointment', id: 'f8', title: '取締役会プレゼン', start: d(7).set({ hour: 10 }), end: d(7).set({ hour: 12 }), parents: ['新規事業プロジェクト'] }),
  createCalendarItem({ type: 'task', id: 'f9', title: 'API設計書作成', start: d(8).set({ hour: 9 }), end: d(8).set({ hour: 12 }), status: 'todo', parents: ['B社案件'] }),
]);

let currentDate = $state(DateTime.now());
let viewType = $state<'week' | 'month'>('week');

// バリデーション（開発時のみ）
validateCalendarItems(items);

function handleItemClick(item: CalendarItem) {
  console.log('Item clicked:', item);
}

function handleItemMove(item: CalendarItem, newStart: DateTime, newEnd: DateTime) {
  console.debug('Item moved:', item.id, newStart.toISO(), newEnd.toISO());
  items = items.map(i => {
    if (i.id !== item.id) return i;
    if (i.temporal.kind === 'CalendarDateRange') {
      const span = diffDays(i.temporal);
      const newStartDate = toISODate(newStart.startOf('day'));
      const newEndDate = toISODate(newStart.startOf('day').plus({ days: span }));
      return updateAllDayItem(i, { start: newStartDate, endExclusive: newEndDate });
    }
    if (i.temporal.kind === 'CalendarDatePoint') {
      return updatePointItem(i, toISODate(newStart.startOf('day')));
    }
    if (i.temporal.kind === 'CalendarDateTimePoint') {
      return updatePointItem(i, newStart);
    }
    return updateTimedItem(i, newStart, newEnd);
  });
}

function handleItemResize(item: CalendarItem, newStart: DateTime, newEnd: DateTime) {
  console.debug('Item resized:', item.id, newStart.toISO(), newEnd.toISO());
  items = items.map(i => {
    if (i.id !== item.id) return i;
    if (i.temporal.kind === 'CalendarDateRange') {
      return updateAllDayItem(i, {
        start: toISODate(newStart.startOf('day')),
        endExclusive: toISODate(newEnd.startOf('day')),
      });
    }
    return updateTimedItem(i, newStart, newEnd);
  });
}

function handleViewChange(date: DateTime) {
  currentDate = date;
}

function handleCellClick(dateTime: DateTime, _clickPosition: { x: number; y: number }) {
  console.log('Cell clicked:', dateTime.toISO());
}
</script>

<div class="demo-app">
  <CalendarView
    {items}
    {currentDate}
    bind:viewType
    {storage}
    onItemClick={handleItemClick}
    onItemMove={handleItemMove}
    onItemResize={handleItemResize}
    onViewChange={handleViewChange}
    onCellClick={handleCellClick}
    onDayClick={handleViewChange}
  />
</div>

<style>
  /* Z-index層管理（WeekView/MonthView が参照する CSS変数） */
  :global(:root) {
    --z-base: 1;
    --z-timeline: 5;
    --z-cell-expanded: 10;
    --z-resize-handle: 20;
    --z-dnd-dragging: 30;
    --z-modal: 100;
  }

  .demo-app {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>
