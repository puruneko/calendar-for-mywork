/**
 * CalendarItem のバリデーション関数
 * データの不正を早期に検出してコンソールエラーを出力する
 */

import { DateTime } from 'luxon';
import type { CalendarItem } from './CalendarItem';

export type ValidationError = {
  field: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

/**
 * 単一の CalendarItem をバリデーション
 * @returns ValidationResult - valid: false の場合 errors に詳細が入る
 */
export function validateCalendarItem(item: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // null / undefined チェック
  if (item === null || item === undefined) {
    return { valid: false, errors: [{ field: 'item', message: 'item is null or undefined' }] };
  }

  if (typeof item !== 'object') {
    return { valid: false, errors: [{ field: 'item', message: `item must be an object, got ${typeof item}` }] };
  }

  const i = item as Record<string, unknown>;

  // --- id チェック ---
  if (!i.id || typeof i.id !== 'string' || (i.id as string).trim() === '') {
    errors.push({ field: 'id', message: 'id must be a non-empty string' });
  }

  // --- title チェック ---
  if (!i.title || typeof i.title !== 'string' || (i.title as string).trim() === '') {
    errors.push({ field: 'title', message: 'title must be a non-empty string' });
  }

  // --- type チェック ---
  if (i.type !== 'task' && i.type !== 'appointment') {
    errors.push({ field: 'type', message: `type must be 'task' or 'appointment', got: ${String(i.type)}` });
  }

  // --- Task 固有チェック ---
  if (i.type === 'task') {
    const validStatuses = ['todo', 'doing', 'done', 'undefined'];
    if (!i.status || !validStatuses.includes(i.status as string)) {
      errors.push({ field: 'status', message: `task.status must be one of ${validStatuses.join('|')}, got: ${String(i.status)}` });
    }
  }

  // --- 排他性チェック: start/end と dateRange は共存不可 ---
  const hasStart = i.start !== undefined && i.start !== null;
  const hasEnd = i.end !== undefined && i.end !== null;
  const hasDateRange = i.dateRange !== undefined && i.dateRange !== null;

  if (hasStart && hasDateRange) {
    errors.push({ field: 'start/dateRange', message: 'item cannot have both start and dateRange (use one or the other)' });
  }
  if (hasEnd && hasDateRange) {
    errors.push({ field: 'end/dateRange', message: 'item cannot have both end and dateRange (use one or the other)' });
  }

  // --- どちらも持っていない ---
  if (!hasStart && !hasDateRange) {
    errors.push({ field: 'start/dateRange', message: 'item must have either start/end (TimedItem) or dateRange (AllDayItem)' });
  }

  // --- TimedItem チェック ---
  if (hasStart || hasEnd) {
    // start が DateTime であること
    if (!hasStart) {
      errors.push({ field: 'start', message: 'start is missing (end is present)' });
    } else if (!(i.start instanceof DateTime)) {
      errors.push({ field: 'start', message: `start must be a Luxon DateTime, got: ${typeof i.start}` });
    } else {
      const start = i.start as DateTime;
      if (!start.isValid) {
        errors.push({ field: 'start', message: `start is invalid DateTime: ${start.invalidReason} (${start.invalidExplanation})` });
      }
    }

    // end が DateTime であること
    if (!hasEnd) {
      errors.push({ field: 'end', message: 'end is missing (start is present)' });
    } else if (!(i.end instanceof DateTime)) {
      errors.push({ field: 'end', message: `end must be a Luxon DateTime, got: ${typeof i.end}` });
    } else {
      const end = i.end as DateTime;
      if (!end.isValid) {
        errors.push({ field: 'end', message: `end is invalid DateTime: ${end.invalidReason} (${end.invalidExplanation})` });
      }
    }

    // start < end チェック
    if (i.start instanceof DateTime && i.end instanceof DateTime &&
        (i.start as DateTime).isValid && (i.end as DateTime).isValid) {
      const start = i.start as DateTime;
      const end = i.end as DateTime;
      if (start >= end) {
        errors.push({ field: 'start/end', message: `start must be before end: ${start.toISO()} >= ${end.toISO()}` });
      }
      // 複数日にまたがる時刻付きアイテムは警告（WeekViewで表示崩れの原因）
      if (!start.hasSame(end.minus({ milliseconds: 1 }), 'day')) {
        errors.push({ field: 'start/end', message: `timed item spans multiple days: ${start.toISODate()} -> ${end.toISODate()} (use dateRange instead)` });
      }
    }
  }

  // --- AllDayItem チェック ---
  if (hasDateRange) {
    const dr = i.dateRange as Record<string, unknown>;
    if (typeof dr !== 'object' || dr === null) {
      errors.push({ field: 'dateRange', message: 'dateRange must be an object with start and end' });
    } else {
      const drStart = dr.start;
      const drEnd = dr.end;

      // start が YYYY-MM-DD 形式であること
      if (typeof drStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(drStart)) {
        errors.push({ field: 'dateRange.start', message: `dateRange.start must be YYYY-MM-DD, got: ${String(drStart)}` });
      }

      // end が YYYY-MM-DD 形式であること
      if (typeof drEnd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(drEnd)) {
        errors.push({ field: 'dateRange.end', message: `dateRange.end must be YYYY-MM-DD, got: ${String(drEnd)}` });
      }

      // start < end チェック（end は exclusive）
      if (typeof drStart === 'string' && typeof drEnd === 'string') {
        if (drEnd <= drStart) {
          errors.push({ field: 'dateRange', message: `dateRange.end must be after start (end is exclusive): ${drStart} >= ${drEnd}` });
        }
        // dateRange が1日以上であること（start == end は0日間 = 無効）
        if (drStart === drEnd) {
          errors.push({ field: 'dateRange', message: `dateRange must span at least 1 day (end is exclusive, so start and end cannot be equal)` });
        }
      }
    }
  }

  // --- parents チェック ---
  if (i.parents !== undefined) {
    if (!Array.isArray(i.parents)) {
      errors.push({ field: 'parents', message: `parents must be an array, got: ${typeof i.parents}` });
    } else {
      (i.parents as unknown[]).forEach((p, idx) => {
        if (typeof p !== 'string' || (p as string).trim() === '') {
          errors.push({ field: `parents[${idx}]`, message: `parents[${idx}] must be a non-empty string, got: ${String(p)}` });
        }
      });
    }
  }

  // --- tags チェック ---
  if (i.tags !== undefined) {
    if (!Array.isArray(i.tags)) {
      errors.push({ field: 'tags', message: `tags must be an array, got: ${typeof i.tags}` });
    } else {
      (i.tags as unknown[]).forEach((t, idx) => {
        if (typeof t !== 'string' || (t as string).trim() === '') {
          errors.push({ field: `tags[${idx}]`, message: `tags[${idx}] must be a non-empty string, got: ${String(t)}` });
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 複数の CalendarItem を一括バリデーション
 * コンソールにエラーを出力し、エラーがあったアイテムの数を返す
 */
export function validateCalendarItems(items: unknown[]): number {
  let errorCount = 0;

  // id重複チェック
  const ids = items
    .filter(i => i !== null && i !== undefined && typeof i === 'object')
    .map(i => (i as Record<string, unknown>).id)
    .filter(id => typeof id === 'string');
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    console.error(`[CalendarItem validation] Duplicate ids found: ${[...new Set(duplicates)].join(', ')}`);
    errorCount++;
  }

  // 各アイテムのバリデーション
  items.forEach((item, index) => {
    const result = validateCalendarItem(item);
    if (!result.valid) {
      errorCount++;
      const i = item as Record<string, unknown>;
      const label = `id="${String(i?.id ?? '?')}" title="${String(i?.title ?? '?')}" (index=${index})`;
      console.error(
        `[CalendarItem validation failed] ${label}:\n${result.errors.map(e => `  - [${e.field}] ${e.message}`).join('\n')}`
      );
    }
  });

  if (errorCount > 0) {
    console.warn(`[CalendarItem validation] ${errorCount} item(s) with errors found.`);
  }

  return errorCount;
}
