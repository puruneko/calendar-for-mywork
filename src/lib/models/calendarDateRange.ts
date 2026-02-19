import { CalendarDate } from './calendarDate';

/**
 * AllDay専用の日付レンジ
 * end は exclusive（含まない）
 */
export interface CalendarDateRange {
  readonly start: CalendarDate; // inclusive
  readonly end: CalendarDate;   // exclusive
}

export function createCalendarDateRange(
  start: CalendarDate,
  end: CalendarDate
): CalendarDateRange {
  if (end <= start) {
    throw new Error(`Invalid CalendarDateRange: ${start} - ${end}`);
  }
  return { start, end };
}
