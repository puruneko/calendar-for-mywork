import { DateTime } from 'luxon';
import type { ISODate } from './temporal';
import { toISODate, parseISODate } from './temporal';

/**
 * @deprecated ISODate を使用してください
 * 後方互換性のためのエイリアス
 */
export type CalendarDate = ISODate;

/**
 * @deprecated toISODate を使用してください
 * DateTime → ISODate（CalendarDate）
 */
export function toCalendarDate(dt: DateTime): ISODate {
  return toISODate(dt);
}

/**
 * @deprecated parseISODate を使用してください
 * 外部入力 → ISODate（CalendarDate）
 */
export function parseCalendarDate(value: string): ISODate {
  return parseISODate(value);
}
