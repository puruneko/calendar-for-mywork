/**
 * CalendarItem用のユーティリティ関数
 * temporal フィールド（TimeSpan）を通じてアイテムの時間情報にアクセスする
 */

import { DateTime } from 'luxon';
import type { CalendarItem } from '../models/CalendarItem';
import { getSpanStart, getSpanEnd } from '../models/temporal';

/**
 * アイテムが CalendarDateTimeRange（時刻付き期間）かどうかを判定
 */
export function isTimed(item: CalendarItem): boolean {
  return item.temporal.kind === 'CalendarDateTimeRange';
}

/**
 * アイテムが CalendarDateRange（終日期間）かどうかを判定
 */
export function isAllDay(item: CalendarItem): boolean {
  return item.temporal.kind === 'CalendarDateRange';
}

/**
 * アイテムが Point（期限）かどうかを判定
 */
export function isDeadlinePoint(item: CalendarItem): boolean {
  return item.temporal.kind === 'CalendarDateTimePoint' || item.temporal.kind === 'CalendarDatePoint';
}

/**
 * アイテムが分単位 Deadline（CalendarDateTimePoint）かどうかを判定
 */
export function isDeadlineTimed(item: CalendarItem): boolean {
  return item.temporal.kind === 'CalendarDateTimePoint';
}

/**
 * アイテムが日単位 Deadline（CalendarDatePoint）かどうかを判定
 */
export function isDeadlineDay(item: CalendarItem): boolean {
  return item.temporal.kind === 'CalendarDatePoint';
}

/**
 * アイテムの開始日時を取得（レイアウト用）
 * - CalendarDateTimeRange: start をそのまま返す
 * - CalendarDateRange: start の 00:00 を返す
 * - CalendarDateTimePoint: at - minorTick分 を返す
 * - CalendarDatePoint: at の 00:00 を返す
 * 
 * @param item - カレンダーアイテム
 * @param zone - タイムゾーン（Date-only の場合のみ使用）
 * @param minorTick - Point の場合の幅（分）
 */
export function getItemStart(item: CalendarItem, zone: string = 'local'): DateTime {
  return getSpanStart(item.temporal, zone);
}

/**
 * アイテムの終了日時を取得（レイアウト用）
 * - CalendarDateTimeRange: end をそのまま返す
 * - CalendarDateRange: endExclusive の 00:00 を返す
 * - CalendarDateTimePoint: at を返す（終端 = 期限時刻）
 * - CalendarDatePoint: at の翌日 00:00 を返す
 * 
 * @param item - カレンダーアイテム
 * @param zone - タイムゾーン（Date-only の場合のみ使用）
 * @param minorTick - Point の場合の幅（分）
 */
export function getItemEnd(item: CalendarItem, zone: string = 'local', minorTick: number = 15): DateTime {
  return getSpanEnd(item.temporal, zone, minorTick);
}


/**
 * アイテムが指定された日を含むかどうか判定
 */
export function itemContainsDay(item: CalendarItem, day: DateTime, zone: string = 'local'): boolean {
  const start = getItemStart(item, zone);
  const end = getItemEnd(item, zone);
  return start < day.endOf('day') && end > day.startOf('day');
}

/**
 * 2つのアイテムが重なるかどうか判定
 */
export function itemsOverlap(item1: CalendarItem, item2: CalendarItem, zone: string = 'local'): boolean {
  const start1 = getItemStart(item1, zone);
  const end1 = getItemEnd(item1, zone);
  const start2 = getItemStart(item2, zone);
  const end2 = getItemEnd(item2, zone);
  return start1 < end2 && start2 < end1;
}
