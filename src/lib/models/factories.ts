/**
 * CalendarItem 生成関数
 *
 * CalendarItem は必ず createCalendarItem() を通して生成すること。
 * 生成時にバリデーションを自動実行し、不正なデータを早期検出する。
 *
 * temporal フィールドに TimeSpan を保持する新モデルに対応。
 *
 * type 別:
 *   - 'task'        → status 必須
 *   - 'appointment' → status 不要
 *   - 'deadline'    → status 不要
 *
 * temporal 別:
 *   - CalendarDateTimeRange  → 時刻付きアイテム（start/end: DateTime）
 *   - CalendarDateRange      → 終日アイテム（start/endExclusive: ISODate）
 *   - CalendarDateTimePoint  → 分単位期限（at: DateTime）
 *   - CalendarDatePoint      → 日単位期限（at: ISODate）
 */

import { DateTime } from 'luxon';
import type { Task, TaskStatus } from './Task';
import type { Appointment } from './Appointment';
import type { CalendarItem } from './CalendarItem';
import type { TimeSpan, ISODate } from './temporal';
import {
  createCalendarDateRange,
  createCalendarDateTimeRange,
  createCalendarDatePoint,
  createCalendarDateTimePoint,
} from './temporal';
import { validateCalendarItem } from './validation';

// ===== 引数型の定義 =====

type CommonFields = {
  id: string;
  title: string;
  tags?: string[];
  description?: string;
  style?: Partial<CSSStyleDeclaration>;
  parents?: string[];
  parentId?: string;
};

/** temporal を直接指定する汎用パラメータ */
type WithTemporal = CommonFields & {
  temporal: TimeSpan;
};

/** 時刻付きTask引数（shorthand） */
type TimedTaskParams = CommonFields & {
  type: 'task';
  status: TaskStatus;
  start: DateTime;
  end: DateTime;
  dateRange?: never;
  temporal?: never;
};

/** 終日Task引数（shorthand） */
type AllDayTaskParams = CommonFields & {
  type: 'task';
  status: TaskStatus;
  dateRange: { start: ISODate; endExclusive: ISODate };
  start?: never;
  end?: never;
  temporal?: never;
};

/** temporal 直接指定Task引数 */
type TemporalTaskParams = WithTemporal & {
  type: 'task';
  status: TaskStatus;
  start?: never;
  end?: never;
  dateRange?: never;
};

/** 時刻付きAppointment引数（shorthand） */
type TimedAppointmentParams = CommonFields & {
  type: 'appointment';
  status?: never;
  start: DateTime;
  end: DateTime;
  dateRange?: never;
  temporal?: never;
};

/** 終日Appointment引数（shorthand） */
type AllDayAppointmentParams = CommonFields & {
  type: 'appointment';
  status?: never;
  dateRange: { start: ISODate; endExclusive: ISODate };
  start?: never;
  end?: never;
  temporal?: never;
};

/** temporal 直接指定Appointment引数 */
type TemporalAppointmentParams = WithTemporal & {
  type: 'appointment';
  status?: never;
  start?: never;
  end?: never;
  dateRange?: never;
};

/** 分単位Deadline引数（shorthand: at: DateTime） */
type TimedDeadlineParams = CommonFields & {
  type: 'deadline';
  at: DateTime;
  datePoint?: never;
  temporal?: never;
  status?: never;
  start?: never;
  end?: never;
  dateRange?: never;
};

/** 日単位Deadline引数（shorthand: datePoint: ISODate） */
type DayDeadlineParams = CommonFields & {
  type: 'deadline';
  datePoint: ISODate;
  at?: never;
  temporal?: never;
  status?: never;
  start?: never;
  end?: never;
  dateRange?: never;
};

/** Deadline引数（temporal 直接指定） */
type TemporalDeadlineParams = WithTemporal & {
  type: 'deadline';
  status?: never;
  start?: never;
  end?: never;
  dateRange?: never;
  at?: never;
  datePoint?: never;
};

export type CalendarItemParams =
  | TimedTaskParams
  | AllDayTaskParams
  | TemporalTaskParams
  | TimedAppointmentParams
  | AllDayAppointmentParams
  | TemporalAppointmentParams
  | TimedDeadlineParams
  | DayDeadlineParams
  | TemporalDeadlineParams;

// ===== 内部ヘルパー =====

function assertValid(item: unknown): void {
  const result = validateCalendarItem(item);
  if (!result.valid) {
    const errors = result.errors.map(e => `  - [${e.field}] ${e.message}`).join('\n');
    throw new Error(`Invalid CalendarItem:\n${errors}`);
  }
}

function buildCommon(params: CommonFields): Omit<CalendarItem, 'type' | 'temporal'> {
  return {
    id: params.id,
    title: params.title,
    ...(params.tags !== undefined && { tags: params.tags }),
    ...(params.description !== undefined && { description: params.description }),
    ...(params.style !== undefined && { style: params.style }),
    ...(params.parents !== undefined && { parents: params.parents }),
    ...((params as any).parentId !== undefined && { parentId: (params as any).parentId }),
  };
}

/**
 * shorthand 引数から temporal を構築する
 */
function buildTemporal(params: CalendarItemParams): TimeSpan {
  if ('temporal' in params && params.temporal) {
    return params.temporal;
  }
  // 分単位 Deadline shorthand: at: DateTime
  if ('at' in params && params.at instanceof DateTime) {
    return createCalendarDateTimePoint(params.at);
  }
  // 日単位 Deadline shorthand: datePoint: ISODate
  if ('datePoint' in params && params.datePoint) {
    return createCalendarDatePoint(params.datePoint as ISODate);
  }
  if ('start' in params && params.start && 'end' in params && params.end) {
    return createCalendarDateTimeRange(params.start as DateTime, params.end as DateTime);
  }
  if ('dateRange' in params && params.dateRange) {
    const dr = params.dateRange as { start: ISODate; endExclusive: ISODate };
    return createCalendarDateRange(dr.start, dr.endExclusive);
  }
  throw new Error(`createCalendarItem: cannot determine temporal from params (type="${(params as any).type}")`);
}

// ===== 統合生成関数 =====

/**
 * CalendarItem を生成する唯一の関数。
 * バリデーション失敗時は Error をスローする。
 *
 * @example
 * // 時刻付きTask（shorthand）
 * createCalendarItem({ type: 'task', status: 'todo', id: '1', title: '...',
 *   start: DateTime.now(), end: DateTime.now().plus({ hours: 1 }) })
 *
 * // 終日Task（shorthand）
 * createCalendarItem({ type: 'task', status: 'todo', id: '2', title: '...',
 *   dateRange: { start: toISODate(d), endExclusive: toISODate(d.plus({ days: 2 })) } })
 *
 * // 分単位Deadline（temporal 直接指定）
 * createCalendarItem({ type: 'deadline', id: '3', title: '期限',
 *   temporal: createCalendarDateTimePoint(DateTime.now()) })
 *
 * // 日単位Deadline（temporal 直接指定）
 * createCalendarItem({ type: 'deadline', id: '4', title: '期限',
 *   temporal: createCalendarDatePoint(toISODate(d)) })
 */
export function createCalendarItem(params: CalendarItemParams): CalendarItem {
  const validTypes = ['task', 'appointment', 'deadline'];
  const type = (params as any).type;
  if (!validTypes.includes(type)) {
    throw new Error(`createCalendarItem: unknown type "${type}". Supported types are: ${validTypes.join(', ')}.`);
  }

  const temporal = buildTemporal(params);
  const common = buildCommon(params);

  let item: CalendarItem;

  if (type === 'task') {
    const p = params as TimedTaskParams | AllDayTaskParams | TemporalTaskParams;
    item = { ...common, type: 'task', status: p.status, temporal } as Task;
  } else if (type === 'appointment') {
    item = { ...common, type: 'appointment', temporal } as Appointment;
  } else {
    // deadline
    item = { ...common, type: 'deadline', temporal };
  }

  assertValid(item);
  return item;
}

// ===== DnD/Resize後の更新関数 =====

/**
 * CalendarDateTimeRange アイテムの start/end を更新した新しいアイテムを返す。
 * （DnD・リサイズ後のアイテム更新に使用）
 * @throws {Error} CalendarDateTimeRange でないアイテムに呼んだ場合 or バリデーションエラー時
 */
export function updateTimedItem<T extends CalendarItem>(
  item: T,
  newStart: DateTime,
  newEnd: DateTime
): T {
  if (item.temporal.kind !== 'CalendarDateTimeRange') {
    throw new Error(
      `updateTimedItem: item "${item.id}" has temporal.kind="${item.temporal.kind}". Only CalendarDateTimeRange is supported. Use updateAllDayItem for CalendarDateRange.`
    );
  }
  const updated = {
    ...item,
    temporal: createCalendarDateTimeRange(newStart, newEnd),
  } as T;
  assertValid(updated);
  return updated;
}

/**
 * CalendarDateRange アイテムの dateRange を更新した新しいアイテムを返す。
 * （DnD後のアイテム更新に使用）
 * @throws {Error} CalendarDateRange でないアイテムに呼んだ場合 or バリデーションエラー時
 */
export function updateAllDayItem<T extends CalendarItem>(
  item: T,
  newDateRange: { start: ISODate; endExclusive: ISODate }
): T {
  if (item.temporal.kind !== 'CalendarDateRange') {
    throw new Error(
      `updateAllDayItem: item "${item.id}" has temporal.kind="${item.temporal.kind}". Only CalendarDateRange is supported. Use updateTimedItem for CalendarDateTimeRange.`
    );
  }
  const updated = {
    ...item,
    temporal: createCalendarDateRange(newDateRange.start, newDateRange.endExclusive),
  } as T;
  assertValid(updated);
  return updated;
}

/**
 * Point アイテムの at を更新した新しいアイテムを返す。
 * （DnD後のDeadlineアイテム更新に使用）
 */
export function updatePointItem<T extends CalendarItem>(
  item: T,
  newAt: DateTime | ISODate
): T {
  if (item.temporal.kind === 'CalendarDateTimePoint') {
    if (!(newAt instanceof DateTime)) {
      throw new Error(`updatePointItem: CalendarDateTimePoint requires a DateTime, got string`);
    }
    const updated = { ...item, temporal: createCalendarDateTimePoint(newAt) } as T;
    assertValid(updated);
    return updated;
  } else if (item.temporal.kind === 'CalendarDatePoint') {
    if (newAt instanceof DateTime) {
      throw new Error(`updatePointItem: CalendarDatePoint requires an ISODate string, got DateTime`);
    }
    const updated = { ...item, temporal: createCalendarDatePoint(newAt) } as T;
    assertValid(updated);
    return updated;
  } else {
    throw new Error(
      `updatePointItem: item "${item.id}" has temporal.kind="${item.temporal.kind}". Only CalendarDateTimePoint or CalendarDatePoint is supported.`
    );
  }
}
