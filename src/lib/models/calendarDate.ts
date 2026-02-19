import { DateTime } from 'luxon';

/** YYYY-MM-DD のみを許可する暦日型 */
export type CalendarDate = string & { readonly __brand: 'CalendarDate' };

/** DateTime → CalendarDate */
export function toCalendarDate(dt: DateTime): CalendarDate {
  return dt.toISODate() as CalendarDate;
}

/** 外部入力 → CalendarDate */
export function parseCalendarDate(value: string): CalendarDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid CalendarDate: ${value}`);
  }
  return value as CalendarDate;
}
