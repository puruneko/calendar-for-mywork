/**
 * CalendarItem 生成関数
 *
 * CalendarItem は必ず createCalendarItem() を通して生成すること。
 * 生成時にバリデーションを自動実行し、不正なデータを早期検出する。
 *
 * 引数の型により自動判別:
 *   - start/end を持つ → TimedItem (Task or Appointment)
 *   - dateRange を持つ → AllDayItem (Task or Appointment)
 *   - type: 'task' → status 必須
 *   - type: 'appointment' → status 不要
 */

import { DateTime } from 'luxon';
import type { Task, TaskStatus } from './Task';
import type { Appointment } from './Appointment';
import type { CalendarItem } from './CalendarItem';
import type { CalendarDateRange } from './calendarDateRange';
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

/** 時刻付きTask引数 */
type TimedTaskParams = CommonFields & {
  type: 'task';
  status: TaskStatus;
  start: DateTime;
  end: DateTime;
  dateRange?: never;
};

/** 終日Task引数 */
type AllDayTaskParams = CommonFields & {
  type: 'task';
  status: TaskStatus;
  dateRange: CalendarDateRange;
  start?: never;
  end?: never;
};

/** 時刻付きAppointment引数 */
type TimedAppointmentParams = CommonFields & {
  type: 'appointment';
  status?: never;
  start: DateTime;
  end: DateTime;
  dateRange?: never;
};

/** 終日Appointment引数 */
type AllDayAppointmentParams = CommonFields & {
  type: 'appointment';
  status?: never;
  dateRange: CalendarDateRange;
  start?: never;
  end?: never;
};

export type CalendarItemParams =
  | TimedTaskParams
  | AllDayTaskParams
  | TimedAppointmentParams
  | AllDayAppointmentParams;

// ===== 内部ヘルパー =====

function assertValid(item: unknown): void {
  const result = validateCalendarItem(item);
  if (!result.valid) {
    const errors = result.errors.map(e => `  - [${e.field}] ${e.message}`).join('\n');
    throw new Error(`Invalid CalendarItem:\n${errors}`);
  }
}

function buildCommon(params: CommonFields): Partial<CalendarItem> {
  return {
    id: params.id,
    title: params.title,
    ...(params.tags !== undefined && { tags: params.tags }),
    ...(params.description !== undefined && { description: params.description }),
    ...(params.style !== undefined && { style: params.style }),
    ...(params.parents !== undefined && { parents: params.parents }),
    ...(params.parentId !== undefined && { parentId: params.parentId }),
  };
}

// ===== タイプ別内部生成関数 =====

/**
 * Task CalendarItem を生成する内部関数。
 * バリデーションは呼び出し元の createCalendarItem で行う。
 */
function createTaskCalendarItem(params: TimedTaskParams | AllDayTaskParams): Task {
  const common = buildCommon(params);
  if (params.dateRange !== undefined) {
    // AllDayTask
    return {
      ...common,
      type: 'task',
      status: params.status,
      dateRange: params.dateRange,
    } as Task;
  } else {
    // TimedTask
    return {
      ...common,
      type: 'task',
      status: params.status,
      start: params.start,
      end: params.end,
    } as Task;
  }
}

/**
 * Appointment CalendarItem を生成する内部関数。
 * バリデーションは呼び出し元の createCalendarItem で行う。
 */
function createAppointmentCalendarItem(params: TimedAppointmentParams | AllDayAppointmentParams): Appointment {
  const common = buildCommon(params);
  if (params.dateRange !== undefined) {
    // AllDayAppointment
    return {
      ...common,
      type: 'appointment',
      dateRange: params.dateRange,
    } as Appointment;
  } else {
    // TimedAppointment
    return {
      ...common,
      type: 'appointment',
      start: params.start,
      end: params.end,
    } as Appointment;
  }
}

// ===== 統合生成関数 =====

/**
 * CalendarItem を生成する唯一の関数。
 * 引数の型（type・start/end vs dateRange）によって自動的にアイテム種別を判断する。
 * バリデーション失敗時は Error をスローする。
 *
 * @example
 * // 時刻付きTask
 * createCalendarItem({ type: 'task', status: 'todo', id: '1', title: '...',
 *   start: DateTime.now(), end: DateTime.now().plus({ hours: 1 }) })
 *
 * // 終日Appointment
 * createCalendarItem({ type: 'appointment', id: '2', title: '...',
 *   dateRange: createCalendarDateRange(toCalendarDate(d), toCalendarDate(d.plus({ days: 2 }))) })
 */
export function createCalendarItem(params: CalendarItemParams): CalendarItem {
  let item: CalendarItem;

  if (params.type === 'task') {
    item = createTaskCalendarItem(params);
  } else if (params.type === 'appointment') {
    item = createAppointmentCalendarItem(params);
  } else {
    throw new Error(`createCalendarItem: unknown type "${(params as any).type}". Supported types are: "task", "appointment".`);
  }

  assertValid(item);
  return item;
}

// ===== DnD/Resize後の更新関数 =====

/**
 * TimedItem の start/end を更新した新しいアイテムを返す。
 * （DnD・リサイズ後のアイテム更新に使用）
 * @throws {Error} AllDayItemに呼んだ場合 or バリデーションエラー時
 */
export function updateTimedItem<T extends CalendarItem>(
  item: T,
  newStart: DateTime,
  newEnd: DateTime
): T {
  if ('dateRange' in item && item.dateRange) {
    throw new Error(
      `updateTimedItem: item "${item.id}" is an AllDay item. Use updateAllDayItem instead.`
    );
  }
  const updated = { ...item, start: newStart, end: newEnd } as T;
  assertValid(updated);
  return updated;
}

/**
 * AllDayItem の dateRange を更新した新しいアイテムを返す。
 * （DnD後のアイテム更新に使用）
 * @throws {Error} TimedItemに呼んだ場合 or バリデーションエラー時
 */
export function updateAllDayItem<T extends CalendarItem>(
  item: T,
  newDateRange: CalendarDateRange
): T {
  if (!('dateRange' in item) || !item.dateRange) {
    throw new Error(
      `updateAllDayItem: item "${item.id}" is a Timed item. Use updateTimedItem instead.`
    );
  }
  const updated = { ...item, dateRange: newDateRange } as T;
  assertValid(updated);
  return updated;
}
