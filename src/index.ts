/**
 * svelte-calendar-lib エントリーポイント
 * 
 * カレンダーUIライブラリのメインエクスポート
 */

// コンポーネント
export { WeekView, MonthView, CalendarView, SettingsModal } from './lib/components';

// データモデル
export type { CalendarItem, Task, TaskStatus, Appointment } from './lib/models';

// ユーティリティ
export * from './lib/utils';
