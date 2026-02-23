/**
 * validateCalendarItem / validateCalendarItems の単体テスト
 * あらゆる不正パターンを網羅的に検証する
 * 
 * 新モデル: temporal フィールドに TimeSpan を保持
 */

import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { validateCalendarItem, validateCalendarItems } from '../../src/lib/models/validation';
import {
  toISODate, createCalendarDateRange, createCalendarDateTimeRange,
  createCalendarDatePoint, createCalendarDateTimePoint,
} from '../../src/lib/models';

// ===== テスト用ヘルパー =====
const now = DateTime.now();
const today = now.startOf('day');
const todayISO = toISODate(today);
const tomorrowISO = toISODate(today.plus({ days: 1 }));

const validTimedTask = () => ({
  id: 'task-1',
  type: 'task' as const,
  title: 'テストタスク',
  status: 'todo' as const,
  temporal: createCalendarDateTimeRange(today.set({ hour: 9 }), today.set({ hour: 10 })),
});

const validTimedAppointment = () => ({
  id: 'appt-1',
  type: 'appointment' as const,
  title: 'テスト予定',
  temporal: createCalendarDateTimeRange(today.set({ hour: 14 }), today.set({ hour: 15 })),
});

const validAllDayTask = () => ({
  id: 'allday-1',
  type: 'task' as const,
  title: '終日タスク',
  status: 'doing' as const,
  temporal: createCalendarDateRange(todayISO, tomorrowISO),
});

const validAllDayAppointment = () => ({
  id: 'allday-appt-1',
  type: 'appointment' as const,
  title: '終日予定',
  temporal: createCalendarDateRange(todayISO, toISODate(today.plus({ days: 3 }))),
});

const validDeadlineTimed = () => ({
  id: 'deadline-1',
  type: 'deadline' as const,
  title: '分単位期限',
  temporal: createCalendarDateTimePoint(today.set({ hour: 15 })),
});

const validDeadlineDate = () => ({
  id: 'deadline-2',
  type: 'deadline' as const,
  title: '日単位期限',
  temporal: createCalendarDatePoint(todayISO),
});

// ===== 正常系テスト =====
describe('validateCalendarItem - 正常系', () => {
  it('有効なTimedTaskはvalidを返す', () => {
    const result = validateCalendarItem(validTimedTask());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('有効なTimedAppointmentはvalidを返す', () => {
    const result = validateCalendarItem(validTimedAppointment());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('有効なAllDayTaskはvalidを返す', () => {
    const result = validateCalendarItem(validAllDayTask());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('有効なAllDayAppointmentはvalidを返す', () => {
    const result = validateCalendarItem(validAllDayAppointment());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('有効な分単位DeadlineはValidを返す', () => {
    const result = validateCalendarItem(validDeadlineTimed());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('有効な日単位DeadlineはValidを返す', () => {
    const result = validateCalendarItem(validDeadlineDate());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('parentsを持つアイテムはvalidを返す', () => {
    const result = validateCalendarItem({ ...validTimedTask(), parents: ['ProjectA', 'Phase1'] });
    expect(result.valid).toBe(true);
  });

  it('tagsを持つアイテムはvalidを返す', () => {
    const result = validateCalendarItem({ ...validTimedTask(), tags: ['仕事', '重要'] });
    expect(result.valid).toBe(true);
  });

  it('status="done"のTaskはvalidを返す', () => {
    const result = validateCalendarItem({ ...validTimedTask(), status: 'done' });
    expect(result.valid).toBe(true);
  });

  it('status="doing"のTaskはvalidを返す', () => {
    const result = validateCalendarItem({ ...validTimedTask(), status: 'doing' });
    expect(result.valid).toBe(true);
  });

  it('status="undefined"のTaskはvalidを返す', () => {
    const result = validateCalendarItem({ ...validTimedTask(), status: 'undefined' });
    expect(result.valid).toBe(true);
  });
});

// ===== null / undefined テスト =====
describe('validateCalendarItem - null/undefined', () => {
  it('nullはinvalidを返す', () => {
    const result = validateCalendarItem(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('item');
  });

  it('undefinedはinvalidを返す', () => {
    const result = validateCalendarItem(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('item');
  });

  it('文字列はinvalidを返す', () => {
    const result = validateCalendarItem('not-an-object');
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('item');
  });
});

// ===== id チェック =====
describe('validateCalendarItem - id', () => {
  it('idが空文字はinvalid', () => {
    const result = validateCalendarItem({ ...validTimedTask(), id: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'id')).toBe(true);
  });

  it('idがスペースのみはinvalid', () => {
    const result = validateCalendarItem({ ...validTimedTask(), id: '   ' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'id')).toBe(true);
  });

  it('idがundefinedはinvalid', () => {
    const { id: _id, ...rest } = validTimedTask();
    const result = validateCalendarItem(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'id')).toBe(true);
  });

  it('idが数値はinvalid', () => {
    const result = validateCalendarItem({ ...validTimedTask(), id: 123 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'id')).toBe(true);
  });
});

// ===== title チェック =====
describe('validateCalendarItem - title', () => {
  it('titleが空文字はinvalid', () => {
    const result = validateCalendarItem({ ...validTimedTask(), title: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'title')).toBe(true);
  });

  it('titleがundefinedはinvalid', () => {
    const { title: _t, ...rest } = validTimedTask();
    const result = validateCalendarItem(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'title')).toBe(true);
  });
});

// ===== type チェック =====
describe('validateCalendarItem - type', () => {
  it('typeが不正値はinvalid', () => {
    const result = validateCalendarItem({ ...validTimedTask(), type: 'event' as any });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'type')).toBe(true);
  });

  it('typeがundefinedはinvalid', () => {
    const { type: _t, ...rest } = validTimedTask();
    const result = validateCalendarItem(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'type')).toBe(true);
  });
});

// ===== Task status チェック =====
describe('validateCalendarItem - task status', () => {
  it('taskにstatusがないはinvalid', () => {
    const { status: _s, ...rest } = validTimedTask();
    const result = validateCalendarItem(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'status')).toBe(true);
  });

  it('taskのstatusが不正値はinvalid', () => {
    const result = validateCalendarItem({ ...validTimedTask(), status: 'pending' as any });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'status')).toBe(true);
  });

  it('appointmentはstatusなしでもvalid', () => {
    const result = validateCalendarItem(validTimedAppointment());
    expect(result.valid).toBe(true);
  });
});

// ===== temporal - CalendarDateTimeRange チェック =====
describe('validateCalendarItem - CalendarDateTimeRange', () => {
  it('startがDateTimeでない場合はinvalid', () => {
    const result = validateCalendarItem({
      ...validTimedTask(),
      temporal: { kind: 'CalendarDateTimeRange', start: '2024-01-01T09:00:00' as any, end: today.set({ hour: 10 }) },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'temporal.start')).toBe(true);
  });

  it('endがDateTimeでない場合はinvalid', () => {
    const result = validateCalendarItem({
      ...validTimedTask(),
      temporal: { kind: 'CalendarDateTimeRange', start: today.set({ hour: 9 }), end: new Date() as any },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'temporal.end')).toBe(true);
  });

  it('start >= end はinvalid', () => {
    const result = validateCalendarItem({
      ...validTimedTask(),
      temporal: { kind: 'CalendarDateTimeRange', start: today.set({ hour: 10 }), end: today.set({ hour: 9 }) },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'temporal')).toBe(true);
  });

  it('複数日にまたがる時刻付きアイテムはinvalid', () => {
    const result = validateCalendarItem({
      ...validTimedTask(),
      temporal: { kind: 'CalendarDateTimeRange', start: today.set({ hour: 9 }), end: today.plus({ days: 2 }).set({ hour: 17 }) },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'temporal' && e.message.includes('multiple days'))).toBe(true);
  });
});

// ===== temporal - CalendarDateRange チェック =====
describe('validateCalendarItem - CalendarDateRange', () => {
  it('startが不正形式はinvalid', () => {
    const result = validateCalendarItem({
      ...validAllDayTask(),
      temporal: { kind: 'CalendarDateRange', start: '2024/01/01' as any, endExclusive: '2024-01-02' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'temporal.start')).toBe(true);
  });

  it('endExclusiveが不正形式はinvalid', () => {
    const result = validateCalendarItem({
      ...validAllDayTask(),
      temporal: { kind: 'CalendarDateRange', start: '2024-01-01', endExclusive: '20240102' as any },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'temporal.endExclusive')).toBe(true);
  });

  it('endExclusive <= start はinvalid', () => {
    const result = validateCalendarItem({
      ...validAllDayTask(),
      temporal: { kind: 'CalendarDateRange', start: '2024-01-05', endExclusive: '2024-01-03' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'temporal')).toBe(true);
  });
});

// ===== temporal なし =====
describe('validateCalendarItem - temporal なし', () => {
  it('temporalが未定義の場合はinvalid', () => {
    const result = validateCalendarItem({
      id: 'no-temporal',
      type: 'task',
      title: '時間なし',
      status: 'todo',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'temporal')).toBe(true);
  });

  it('temporal.kindが不正値の場合はinvalid', () => {
    const result = validateCalendarItem({
      id: 'bad-kind',
      type: 'task',
      title: '不正kind',
      status: 'todo',
      temporal: { kind: 'Unknown' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'temporal.kind')).toBe(true);
  });
});

// ===== parents / tags チェック =====
describe('validateCalendarItem - parents/tags', () => {
  it('parentsが配列でない場合はinvalid', () => {
    const result = validateCalendarItem({ ...validTimedTask(), parents: 'ProjectA' as any });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'parents')).toBe(true);
  });

  it('parentsに空文字が含まれる場合はinvalid', () => {
    const result = validateCalendarItem({ ...validTimedTask(), parents: ['ProjectA', ''] });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.startsWith('parents['))).toBe(true);
  });

  it('tagsが配列でない場合はinvalid', () => {
    const result = validateCalendarItem({ ...validTimedTask(), tags: '仕事' as any });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'tags')).toBe(true);
  });
});

// ===== validateCalendarItems（複数アイテム）=====
describe('validateCalendarItems', () => {
  it('全て有効なアイテムは0を返す', () => {
    const count = validateCalendarItems([validTimedTask(), validAllDayTask(), validTimedAppointment(), validDeadlineTimed()]);
    expect(count).toBe(0);
  });

  it('1件エラーがある場合は1を返す', () => {
    const count = validateCalendarItems([
      validTimedTask(),
      {
        id: 'task-2', type: 'task', title: 'エラー', status: 'todo',
        temporal: { kind: 'CalendarDateTimeRange', start: today.set({ hour: 10 }), end: today.set({ hour: 9 }) },
      },
    ]);
    expect(count).toBeGreaterThan(0);
  });

  it('id重複がある場合はエラーカウントが増える', () => {
    const count = validateCalendarItems([
      validTimedTask(), // id: 'task-1'
      { ...validTimedAppointment(), id: 'task-1' }, // 同じid
    ]);
    expect(count).toBeGreaterThan(0);
  });

  it('空配列は0を返す', () => {
    const count = validateCalendarItems([]);
    expect(count).toBe(0);
  });
});
