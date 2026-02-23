/**
 * データモデルのエクスポート
 */

// === メインモデル ===
export type { CalendarItem } from './CalendarItem';
export type { Task, TaskStatus } from './Task';
export type { Appointment } from './Appointment';

// === Temporal モデル（新設計の中心） ===
export type {
  ISODate,
  TimeSpan,
  CalendarDateRange,
  CalendarDateTimeRange,
  CalendarDatePoint,
  CalendarDateTimePoint,
} from './temporal';
export {
  parseISODate,
  toISODate,
  createCalendarDateRange,
  createCalendarDateTimeRange,
  createCalendarDatePoint,
  createCalendarDateTimePoint,
  isRange,
  isPoint,
  hasTime,
  isDateOnly,
  normalizeToDateTimeRange,
  getSpanStart,
  getSpanEnd,
} from './temporal';

// === 後方互換エイリアス（@deprecated） ===
export type { CalendarDate } from './calendarDate';
export { toCalendarDate, parseCalendarDate } from './calendarDate';

// === バリデーション ===
export type { ValidationError, ValidationResult } from './validation';
export { validateCalendarItem, validateCalendarItems } from './validation';

// === DateRange ユーティリティ ===
export { diffDays, containsDate, overlaps, toStartDateTime, toEndDateTime } from './calendarDateRangeOps';

// === ファクトリ ===
export type { CalendarItemParams } from './factories';
export {
  createCalendarItem,
  updateTimedItem,
  updateAllDayItem,
  updatePointItem,
} from './factories';
