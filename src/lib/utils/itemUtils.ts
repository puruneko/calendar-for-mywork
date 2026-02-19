/**
 * CalendarItem用のユーティリティ関数
 * Timed と AllDay の両方を安全に扱う
 */

import { DateTime } from 'luxon';
import type { CalendarItem } from '../models/CalendarItem';
import { toStartDateTime, toEndDateTime } from '../models/calendarDateRangeOps';

/**
 * アイテムがTimedかどうかを判定
 */
export function isTimed(item: CalendarItem): item is CalendarItem & { start: DateTime; end: DateTime } {
  return item.start !== undefined && item.end !== undefined;
}

/**
 * アイテムがAllDayかどうかを判定
 */
export function isAllDay(item: CalendarItem): boolean {
  return item.dateRange !== undefined;
}

/**
 * アイテムの開始日時を取得（AllDayの場合は00:00として返す）
 * @param item - カレンダーアイテム
 * @param zone - タイムゾーン（AllDayの場合のみ使用）
 */
export function getItemStart(item: CalendarItem, zone: string = 'local'): DateTime | null {
  if (isTimed(item)) {
    return item.start;
  } else if (item.dateRange) {
    return toStartDateTime(item.dateRange, zone);
  }
  return null;
}

/**
 * アイテムの終了日時を取得（AllDayの場合は00:00として返す）
 * @param item - カレンダーアイテム
 * @param zone - タイムゾーン（AllDayの場合のみ使用）
 */
export function getItemEnd(item: CalendarItem, zone: string = 'local'): DateTime | null {
  if (isTimed(item)) {
    return item.end;
  } else if (item.dateRange) {
    return toEndDateTime(item.dateRange, zone);
  }
  return null;
}

/**
 * アイテムが指定された日を含むかどうか判定
 */
export function itemContainsDay(item: CalendarItem, day: DateTime): boolean {
  const start = getItemStart(item);
  const end = getItemEnd(item);
  
  if (!start || !end) return false;
  
  return start < day.endOf('day') && end > day.startOf('day');
}

/**
 * 2つのアイテムが重なるかどうか判定
 */
export function itemsOverlap(item1: CalendarItem, item2: CalendarItem): boolean {
  const start1 = getItemStart(item1);
  const end1 = getItemEnd(item1);
  const start2 = getItemStart(item2);
  const end2 = getItemEnd(item2);
  
  if (!start1 || !end1 || !start2 || !end2) return false;
  
  return start1 < end2 && start2 < end1;
}
