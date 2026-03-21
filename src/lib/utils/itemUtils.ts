/**
 * CalendarItem用のユーティリティ関数
 * temporal フィールド（TimeSpan）を通じてアイテムの時間情報にアクセスする
 */

import { DateTime } from 'luxon';
import type { CalendarItem } from '../models/CalendarItem';
import type { Task } from '../models/Task';
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

// ============================================================
// タグベーススタイル自動適用
// ============================================================

/** タイプ別デフォルトカラープリセット */
export const METRO_COLOR_PRESETS = {
  task:        { todo: '#5B9CF6', doing: '#FFA94D', done: '#A8C5A0', undefined: '#5B9CF6' },
  appointment: '#6EBD8F',
  deadline:    '#F07070',
} as const;

type StyleRule = {
  id: string;
  apply: (item: CalendarItem, now: DateTime) => Partial<CSSStyleDeclaration> | null;
};

/** プリセットスタイルルール（期限超過・完了タスク） */
export const PRESET_STYLE_RULES: StyleRule[] = [
  {
    id: 'overdue-task',
    apply: (item, now) => {
      if (item.type !== 'task' || (item as Task).status === 'done') return null;
      if (getSpanEnd(item.temporal) >= now) return null;
      return { borderLeft: '3px solid #E53E3E' };
    },
  },
  {
    id: 'completed-task',
    apply: (item) => {
      if (item.type !== 'task' || (item as Task).status !== 'done') return null;
      return { backgroundColor: '#cccccc', opacity: '0.6' };
    },
  },
];

/**
 * アイテムの最終スタイルを計算する（優先度: 型デフォルト → タグ → ルール → 手動）
 *
 * @param item - カレンダーアイテム
 * @param tagStyleMap - タグ名 → スタイルのマップ
 * @param now - 現在日時（テスト用に注入可能）
 */
export function getComputedItemStyle(
  item: CalendarItem,
  tagStyleMap?: Record<string, Partial<CSSStyleDeclaration>>,
  now: DateTime = DateTime.now(),
): Partial<CSSStyleDeclaration> {
  // 1. 型デフォルト（status 別含む）
  let result: Partial<CSSStyleDeclaration> = {};
  if (item.type === 'task') {
    const status = (item as Task).status ?? 'undefined';
    result.backgroundColor = METRO_COLOR_PRESETS.task[status as keyof typeof METRO_COLOR_PRESETS.task]
      ?? METRO_COLOR_PRESETS.task.todo;
  } else if (item.type === 'appointment') {
    result.backgroundColor = METRO_COLOR_PRESETS.appointment;
  } else {
    result.backgroundColor = METRO_COLOR_PRESETS.deadline;
  }

  // 2. タグスタイル（複数タグはマージ、後のタグが優先）
  if (tagStyleMap && item.tags) {
    for (const tag of item.tags) {
      if (tagStyleMap[tag]) result = { ...result, ...tagStyleMap[tag] };
    }
  }

  // 3. ルールベース
  for (const rule of PRESET_STYLE_RULES) {
    const ruleStyle = rule.apply(item, now);
    if (ruleStyle) result = { ...result, ...ruleStyle };
  }

  // 4. 手動指定（最優先）
  if (item.style) result = { ...result, ...item.style };

  return result;
}
