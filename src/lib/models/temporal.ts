/**
 * Temporal Model
 * 
 * 時間占有の抽象型（TimeSpan）を定義する。
 * Item と 時間情報を分離し、将来の RRULE・Occurrence・Floating Time 拡張に備える。
 * 
 * 内部時刻表現は Luxon DateTime を使用する（ISODateTime 文字列は使わない）。
 */

import { DateTime } from 'luxon';

// ============================================================
// ブランド型（ISODate のみ文字列ブランド型を使用）
// ============================================================

/**
 * YYYY-MM-DD 形式のタイムゾーン非依存な暦日型。
 * 既存の CalendarDate を ISODate として再エクスポートする。
 */
export type ISODate = string & { readonly __brand: 'ISODate' };

/** 外部文字列 → ISODate（バリデーション付き） */
export function parseISODate(value: string): ISODate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ISODate: "${value}" (expected YYYY-MM-DD)`);
  }
  return value as ISODate;
}

/** Luxon DateTime → ISODate */
export function toISODate(dt: DateTime): ISODate {
  return dt.toISODate() as ISODate;
}

// ============================================================
// TimeSpan の各バリアント（Discriminated Union）
// ============================================================

/**
 * 日付のみの期間（終端は exclusive）
 * 例: 2026-02-01 〜 2026-02-03（2/1, 2/2 の 2日間）
 */
export interface CalendarDateRange {
  readonly kind: 'CalendarDateRange';
  readonly start: ISODate;          // inclusive
  readonly endExclusive: ISODate;   // exclusive
}

/**
 * 日時付きの期間
 * 例: 2026-02-01T09:00 〜 2026-02-01T10:00
 */
export interface CalendarDateTimeRange {
  readonly kind: 'CalendarDateTimeRange';
  readonly start: DateTime;
  readonly end: DateTime;
}

/**
 * 日付のみの一点（期限など）
 * 例: 2026-02-28（この日が期限）
 */
export interface CalendarDatePoint {
  readonly kind: 'CalendarDatePoint';
  readonly at: ISODate;
}

/**
 * 日時付きの一点（分単位の期限など）
 * 例: 2026-02-28T15:00
 */
export interface CalendarDateTimePoint {
  readonly kind: 'CalendarDateTimePoint';
  readonly at: DateTime;
}

/**
 * 時間占有の抽象型（Union）
 */
export type TimeSpan =
  | CalendarDateRange
  | CalendarDateTimeRange
  | CalendarDatePoint
  | CalendarDateTimePoint;

// ============================================================
// ファクトリ関数
// ============================================================

export function createCalendarDateRange(start: ISODate, endExclusive: ISODate): CalendarDateRange {
  if (endExclusive <= start) {
    throw new Error(`Invalid CalendarDateRange: start=${start} endExclusive=${endExclusive} (endExclusive must be after start)`);
  }
  return { kind: 'CalendarDateRange', start, endExclusive };
}

export function createCalendarDateTimeRange(start: DateTime, end: DateTime): CalendarDateTimeRange {
  if (!start.isValid) throw new Error(`Invalid start DateTime: ${start.invalidReason}`);
  if (!end.isValid) throw new Error(`Invalid end DateTime: ${end.invalidReason}`);
  if (start >= end) throw new Error(`Invalid CalendarDateTimeRange: start must be before end (${start.toISO()} >= ${end.toISO()})`);
  return { kind: 'CalendarDateTimeRange', start, end };
}

export function createCalendarDatePoint(at: ISODate): CalendarDatePoint {
  return { kind: 'CalendarDatePoint', at };
}

export function createCalendarDateTimePoint(at: DateTime): CalendarDateTimePoint {
  if (!at.isValid) throw new Error(`Invalid at DateTime: ${at.invalidReason}`);
  return { kind: 'CalendarDateTimePoint', at };
}

// ============================================================
// 型ガード
// ============================================================

export function isRange(span: TimeSpan): span is CalendarDateRange | CalendarDateTimeRange {
  return span.kind === 'CalendarDateRange' || span.kind === 'CalendarDateTimeRange';
}

export function isPoint(span: TimeSpan): span is CalendarDatePoint | CalendarDateTimePoint {
  return span.kind === 'CalendarDatePoint' || span.kind === 'CalendarDateTimePoint';
}

export function hasTime(span: TimeSpan): span is CalendarDateTimeRange | CalendarDateTimePoint {
  return span.kind === 'CalendarDateTimeRange' || span.kind === 'CalendarDateTimePoint';
}

export function isDateOnly(span: TimeSpan): span is CalendarDateRange | CalendarDatePoint {
  return span.kind === 'CalendarDateRange' || span.kind === 'CalendarDatePoint';
}

// ============================================================
// 正規化処理（レイアウトエンジン用）
// ============================================================

/**
 * 任意の TimeSpan を CalendarDateTimeRange に正規化する。
 * Date-only の場合はその日の 00:00 〜 翌日 00:00 として昇格させる。
 * Point の場合は minorTick 分の Range として表現する。
 * 
 * @param span - 正規化対象の TimeSpan
 * @param zone - タイムゾーン（Date-only 昇格時に使用）
 * @param minorTick - Point の場合の幅（分）、デフォルト 15
 */
export function normalizeToDateTimeRange(
  span: TimeSpan,
  zone: string = 'local',
  minorTick: number = 15
): CalendarDateTimeRange {
  switch (span.kind) {
    case 'CalendarDateTimeRange':
      return span;

    case 'CalendarDateRange': {
      const start = DateTime.fromISO(span.start, { zone }).startOf('day');
      const end = DateTime.fromISO(span.endExclusive, { zone }).startOf('day');
      return { kind: 'CalendarDateTimeRange', start, end };
    }

    case 'CalendarDateTimePoint': {
      const start = span.at.minus({ minutes: minorTick });
      const end = span.at;
      return { kind: 'CalendarDateTimeRange', start, end };
    }

    case 'CalendarDatePoint': {
      const start = DateTime.fromISO(span.at, { zone }).startOf('day');
      const end = start.plus({ days: 1 });
      return { kind: 'CalendarDateTimeRange', start, end };
    }
  }
}

/**
 * TimeSpan の開始日時を取得する（レイアウト用）
 */
export function getSpanStart(span: TimeSpan, zone: string = 'local'): DateTime {
  return normalizeToDateTimeRange(span, zone).start;
}

/**
 * TimeSpan の終了日時を取得する（レイアウト用）
 */
export function getSpanEnd(span: TimeSpan, zone: string = 'local', minorTick: number = 15): DateTime {
  return normalizeToDateTimeRange(span, zone, minorTick).end;
}
