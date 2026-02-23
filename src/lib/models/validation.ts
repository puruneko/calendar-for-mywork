/**
 * CalendarItem のバリデーション関数
 * データの不正を早期に検出してコンソールエラーを出力する
 * 
 * 新モデル: temporal フィールドに TimeSpan を保持
 */

import { DateTime } from 'luxon';

export type ValidationError = {
  field: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

/**
 * TimeSpan をバリデーション
 */
function validateTimeSpan(span: unknown, errors: ValidationError[]): void {
  if (span === null || span === undefined || typeof span !== 'object') {
    errors.push({ field: 'temporal', message: 'temporal must be a TimeSpan object' });
    return;
  }

  const s = span as Record<string, unknown>;
  const kind = s.kind;

  const validKinds = ['CalendarDateRange', 'CalendarDateTimeRange', 'CalendarDatePoint', 'CalendarDateTimePoint'];
  if (!validKinds.includes(kind as string)) {
    errors.push({ field: 'temporal.kind', message: `temporal.kind must be one of ${validKinds.join('|')}, got: ${String(kind)}` });
    return;
  }

  switch (kind) {
    case 'CalendarDateRange': {
      const start = s.start;
      const endExclusive = s.endExclusive;
      if (typeof start !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
        errors.push({ field: 'temporal.start', message: `CalendarDateRange.start must be YYYY-MM-DD, got: ${String(start)}` });
      }
      if (typeof endExclusive !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(endExclusive)) {
        errors.push({ field: 'temporal.endExclusive', message: `CalendarDateRange.endExclusive must be YYYY-MM-DD, got: ${String(endExclusive)}` });
      }
      if (typeof start === 'string' && typeof endExclusive === 'string' && endExclusive <= start) {
        errors.push({ field: 'temporal', message: `CalendarDateRange.endExclusive must be after start: ${start} >= ${endExclusive}` });
      }
      break;
    }
    case 'CalendarDateTimeRange': {
      const start = s.start;
      const end = s.end;
      if (!(start instanceof DateTime) || !start.isValid) {
        errors.push({ field: 'temporal.start', message: `CalendarDateTimeRange.start must be a valid Luxon DateTime` });
      }
      if (!(end instanceof DateTime) || !end.isValid) {
        errors.push({ field: 'temporal.end', message: `CalendarDateTimeRange.end must be a valid Luxon DateTime` });
      }
      if (start instanceof DateTime && end instanceof DateTime && start.isValid && end.isValid) {
        if (start >= end) {
          errors.push({ field: 'temporal', message: `CalendarDateTimeRange.start must be before end: ${start.toISO()} >= ${end.toISO()}` });
        }
        // 複数日にまたがる時刻付きアイテムは警告
        if (!start.hasSame(end.minus({ milliseconds: 1 }), 'day')) {
          errors.push({ field: 'temporal', message: `CalendarDateTimeRange spans multiple days: ${start.toISODate()} -> ${end.toISODate()} (consider using CalendarDateRange instead)` });
        }
      }
      break;
    }
    case 'CalendarDatePoint': {
      const at = s.at;
      if (typeof at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(at)) {
        errors.push({ field: 'temporal.at', message: `CalendarDatePoint.at must be YYYY-MM-DD, got: ${String(at)}` });
      }
      break;
    }
    case 'CalendarDateTimePoint': {
      const at = s.at;
      if (!(at instanceof DateTime) || !at.isValid) {
        errors.push({ field: 'temporal.at', message: `CalendarDateTimePoint.at must be a valid Luxon DateTime` });
      }
      break;
    }
  }
}

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
  const validTypes = ['task', 'appointment', 'deadline'];
  if (!validTypes.includes(i.type as string)) {
    errors.push({ field: 'type', message: `type must be one of ${validTypes.join('|')}, got: ${String(i.type)}` });
  }

  // --- Task 固有チェック ---
  if (i.type === 'task') {
    const validStatuses = ['todo', 'doing', 'done', 'undefined'];
    if (!i.status || !validStatuses.includes(i.status as string)) {
      errors.push({ field: 'status', message: `task.status must be one of ${validStatuses.join('|')}, got: ${String(i.status)}` });
    }
  }

  // --- temporal チェック ---
  if (i.temporal === undefined || i.temporal === null) {
    errors.push({ field: 'temporal', message: 'temporal is required' });
  } else {
    validateTimeSpan(i.temporal, errors);
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
