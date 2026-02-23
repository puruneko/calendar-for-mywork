import { DateTime } from 'luxon';
import type { ISODate, CalendarDateRange } from './temporal';

/** 日数（AllDay表示幅に使用） */
export function diffDays(range: CalendarDateRange): number {
  const s = DateTime.fromISO(range.start);
  const e = DateTime.fromISO(range.endExclusive);
  return e.diff(s, 'days').days;
}

/** 指定日を含むか */
export function containsDate(
  range: CalendarDateRange,
  date: ISODate
): boolean {
  return range.start <= date && date < range.endExclusive;
}

/** 重なり判定（レーン配置用） */
export function overlaps(
  a: CalendarDateRange,
  b: CalendarDateRange
): boolean {
  return a.start < b.endExclusive && b.start < a.endExclusive;
}

/** 描画計算用にのみ DateTime へ変換 */
export function toStartDateTime(range: CalendarDateRange, zone: string) {
  return DateTime.fromISO(range.start, { zone }).startOf('day');
}

export function toEndDateTime(range: CalendarDateRange, zone: string) {
  return DateTime.fromISO(range.endExclusive, { zone }).startOf('day');
}
