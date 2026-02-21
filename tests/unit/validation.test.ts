/**
 * validateCalendarItem / validateCalendarItems の単体テスト
 * あらゆる不正パターンを網羅的に検証する
 */

import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { validateCalendarItem, validateCalendarItems } from '../../src/lib/models/validation';
import { toCalendarDate, createCalendarDateRange } from '../../src/lib/models';

// ===== テスト用ヘルパー =====
const now = DateTime.now();
const today = now.startOf('day');

const validTimedTask = () => ({
  id: 'task-1',
  type: 'task' as const,
  title: 'テストタスク',
  start: today.set({ hour: 9 }),
  end: today.set({ hour: 10 }),
  status: 'todo' as const,
});

const validTimedAppointment = () => ({
  id: 'appt-1',
  type: 'appointment' as const,
  title: 'テスト予定',
  start: today.set({ hour: 14 }),
  end: today.set({ hour: 15 }),
});

const validAllDayTask = () => ({
  id: 'allday-1',
  type: 'task' as const,
  title: '終日タスク',
  dateRange: createCalendarDateRange(toCalendarDate(today), toCalendarDate(today.plus({ days: 1 }))),
  status: 'doing' as const,
});

const validAllDayAppointment = () => ({
  id: 'allday-appt-1',
  type: 'appointment' as const,
  title: '終日予定',
  dateRange: createCalendarDateRange(toCalendarDate(today), toCalendarDate(today.plus({ days: 3 }))),
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

// ===== TimedItem - start/end チェック =====
describe('validateCalendarItem - TimedItem start/end', () => {
  it('startがDateTimeでない場合はinvalid', () => {
    const result = validateCalendarItem({ ...validTimedTask(), start: '2024-01-01T09:00:00' as any });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'start')).toBe(true);
  });

  it('endがDateTimeでない場合はinvalid', () => {
    const result = validateCalendarItem({ ...validTimedTask(), end: new Date() as any });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'end')).toBe(true);
  });

  it('startがinvalid DateTimeの場合はinvalid', () => {
    const result = validateCalendarItem({ ...validTimedTask(), start: DateTime.fromISO('invalid') });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'start')).toBe(true);
  });

  it('endがinvalid DateTimeの場合はinvalid', () => {
    const result = validateCalendarItem({ ...validTimedTask(), end: DateTime.fromISO('invalid') });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'end')).toBe(true);
  });

  it('start >= end はinvalid', () => {
    const result = validateCalendarItem({
      ...validTimedTask(),
      start: today.set({ hour: 10 }),
      end: today.set({ hour: 9 }),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'start/end')).toBe(true);
  });

  it('start === end はinvalid', () => {
    const result = validateCalendarItem({
      ...validTimedTask(),
      start: today.set({ hour: 9 }),
      end: today.set({ hour: 9 }),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'start/end')).toBe(true);
  });

  it('複数日にまたがる時刻付きアイテムはinvalid', () => {
    const result = validateCalendarItem({
      ...validTimedTask(),
      start: today.set({ hour: 9 }),
      end: today.plus({ days: 2 }).set({ hour: 17 }),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'start/end' && e.message.includes('multiple days'))).toBe(true);
  });

  it('startのみでendがない場合はinvalid', () => {
    const { end: _e, ...rest } = validTimedTask();
    const result = validateCalendarItem(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'end')).toBe(true);
  });

  it('endのみでstartがない場合はinvalid', () => {
    const { start: _s, ...rest } = validTimedTask();
    const result = validateCalendarItem(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'start')).toBe(true);
  });
});

// ===== AllDayItem - dateRange チェック =====
describe('validateCalendarItem - AllDayItem dateRange', () => {
  it('dateRangeのstartが不正形式はinvalid', () => {
    const result = validateCalendarItem({
      ...validAllDayTask(),
      dateRange: { start: '2024/01/01' as any, end: '2024-01-02' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'dateRange.start')).toBe(true);
  });

  it('dateRangeのendが不正形式はinvalid', () => {
    const result = validateCalendarItem({
      ...validAllDayTask(),
      dateRange: { start: '2024-01-01', end: '20240102' as any },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'dateRange.end')).toBe(true);
  });

  it('dateRange.end <= dateRange.start はinvalid', () => {
    const result = validateCalendarItem({
      ...validAllDayTask(),
      dateRange: { start: '2024-01-05', end: '2024-01-03' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'dateRange')).toBe(true);
  });

  it('dateRange.start === dateRange.end はinvalid（end is exclusive）', () => {
    const result = validateCalendarItem({
      ...validAllDayTask(),
      dateRange: { start: '2024-01-01', end: '2024-01-01' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'dateRange')).toBe(true);
  });

  it('dateRangeがオブジェクトでない場合はinvalid', () => {
    const result = validateCalendarItem({
      ...validAllDayTask(),
      dateRange: 'invalid' as any,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'dateRange')).toBe(true);
  });
});

// ===== 排他性チェック =====
describe('validateCalendarItem - 排他性', () => {
  it('start/endとdateRangeの両方を持つ場合はinvalid', () => {
    const result = validateCalendarItem({
      id: 'mixed-1',
      type: 'task',
      title: '混在アイテム',
      start: today.set({ hour: 9 }),
      end: today.set({ hour: 10 }),
      dateRange: createCalendarDateRange(toCalendarDate(today), toCalendarDate(today.plus({ days: 1 }))),
      status: 'todo',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('dateRange'))).toBe(true);
  });

  it('start/endもdateRangeも持たない場合はinvalid', () => {
    const result = validateCalendarItem({
      id: 'no-date-1',
      type: 'task',
      title: '日時なしアイテム',
      status: 'todo',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'start/dateRange')).toBe(true);
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
    const count = validateCalendarItems([validTimedTask(), validAllDayTask(), validTimedAppointment()]);
    expect(count).toBe(0);
  });

  it('1件エラーがある場合は1を返す', () => {
    const count = validateCalendarItems([
      validTimedTask(),
      { ...validTimedTask(), id: 'task-2', start: today.set({ hour: 10 }), end: today.set({ hour: 9 }) }, // start > end
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
