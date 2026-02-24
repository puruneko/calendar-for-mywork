/**
 * svelte-calendar-lib エントリーポイント
 *
 * カレンダーUIライブラリのメインエクスポート
 */

// コンポーネント
export { WeekView, MonthView, CalendarView } from './lib/components';

// データモデル
export type { CalendarItem, Task, TaskStatus, Appointment } from './lib/models';
export type { WeekViewSettings, MonthViewSettings, CalendarStorageData } from './lib/models';
export { DEFAULT_WEEK_SETTINGS, DEFAULT_MONTH_SETTINGS, DEFAULT_STORAGE_DATA } from './lib/models';

// ストレージ
export { CalendarStorage, MemoryBackend, LocalStorageBackend } from './lib/storage';
export type { StorageBackend, DeepPartial } from './lib/storage';

// ユーティリティ
export * from './lib/utils';
