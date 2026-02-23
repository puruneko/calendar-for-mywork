import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { createCalendarItem, updateTimedItem, updateAllDayItem } from '../../src/lib/models/factories';
import { createCalendarDateRange, toCalendarDate } from '../../src/lib/models';

const now = DateTime.now();
const start = now.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
const end = now.set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
const today = toCalendarDate(now);
const tomorrow = toCalendarDate(now.plus({ days: 1 }));
const dateRange = createCalendarDateRange(today, tomorrow);

describe('createCalendarItem', () => {
  describe('不正なtype', () => {
    it('未知のtypeを渡した場合Errorをスローすること', () => {
      expect(() => createCalendarItem({ type: 'abcdefg' as any, id: 'x', title: 'test', start, end })).toThrow(
        'unknown type "abcdefg"'
      );
    });

    it('typeが空文字の場合Errorをスローすること', () => {
      expect(() => createCalendarItem({ type: '' as any, id: 'x', title: 'test', start, end })).toThrow(
        'unknown type ""'
      );
    });

    it('typeがundefinedの場合Errorをスローすること', () => {
      expect(() => createCalendarItem({ type: undefined as any, id: 'x', title: 'test', start, end })).toThrow(
        'unknown type "undefined"'
      );
    });

    it('typeがnullの場合Errorをスローすること', () => {
      expect(() => createCalendarItem({ type: null as any, id: 'x', title: 'test', start, end })).toThrow(
        'unknown type "null"'
      );
    });
  });

  describe('TimedTask', () => {
    it('正常なTimedTaskを生成できること', () => {
      const item = createCalendarItem({ type: 'task', id: '1', title: 'テスト', status: 'todo', start, end });
      expect(item.type).toBe('task');
      expect(item.id).toBe('1');
      expect(item.title).toBe('テスト');
      expect('start' in item).toBe(true);
      expect('dateRange' in item && item.dateRange).toBeFalsy();
    });

    it('statusがdoing/doneでも生成できること', () => {
      expect(() => createCalendarItem({ type: 'task', id: '2', title: 'doing', status: 'doing', start, end })).not.toThrow();
      expect(() => createCalendarItem({ type: 'task', id: '3', title: 'done', status: 'done', start, end })).not.toThrow();
    });

    it('parentsを含めて生成できること', () => {
      const item = createCalendarItem({ type: 'task', id: '4', title: 'p', status: 'todo', start, end, parents: ['A', 'B'] });
      expect('parents' in item && item.parents).toEqual(['A', 'B']);
    });

    it('styleを含めて生成できること', () => {
      const style = { backgroundColor: '#ff0000' } as Partial<CSSStyleDeclaration>;
      const item = createCalendarItem({ type: 'task', id: '5', title: 's', status: 'todo', start, end, style });
      expect('style' in item && item.style).toEqual(style);
    });

    it('start >= end の場合Errorをスローすること', () => {
      expect(() => createCalendarItem({ type: 'task', id: '6', title: 'err', status: 'todo', start: end, end: start })).toThrow();
    });

    it('idが空の場合Errorをスローすること', () => {
      expect(() => createCalendarItem({ type: 'task', id: '', title: 'err', status: 'todo', start, end })).toThrow();
    });

    it('titleが空の場合Errorをスローすること', () => {
      expect(() => createCalendarItem({ type: 'task', id: '7', title: '', status: 'todo', start, end })).toThrow();
    });
  });

  describe('AllDayTask', () => {
    it('正常なAllDayTaskを生成できること', () => {
      const item = createCalendarItem({ type: 'task', id: 'a1', title: '終日', status: 'todo', dateRange });
      expect(item.type).toBe('task');
      expect('dateRange' in item && item.dateRange).toBeTruthy();
      expect('start' in item && item.start).toBeFalsy();
    });

    it('dateRange.start >= dateRange.end の場合createCalendarDateRange自体がErrorをスローすること', () => {
      // createCalendarDateRange が end <= start の場合にエラーをスローする
      expect(() => createCalendarDateRange(tomorrow, today)).toThrow('Invalid CalendarDateRange');
    });
  });

  describe('TimedAppointment', () => {
    it('正常なTimedAppointmentを生成できること', () => {
      const item = createCalendarItem({ type: 'appointment', id: 'b1', title: '予定', start, end });
      expect(item.type).toBe('appointment');
      expect('start' in item).toBe(true);
      expect('status' in item).toBe(false);
    });

    it('start >= end の場合Errorをスローすること', () => {
      expect(() => createCalendarItem({ type: 'appointment', id: 'b2', title: 'err', start: end, end: start })).toThrow();
    });
  });

  describe('AllDayAppointment', () => {
    it('正常なAllDayAppointmentを生成できること', () => {
      const item = createCalendarItem({ type: 'appointment', id: 'b3', title: '終日予定', dateRange });
      expect(item.type).toBe('appointment');
      expect('dateRange' in item && item.dateRange).toBeTruthy();
    });
  });
});

describe('updateTimedItem', () => {
  it('TimedItemのstart/endを更新できること', () => {
    const item = createCalendarItem({ type: 'task', id: 'u1', title: '更新', status: 'todo', start, end });
    const newStart = start.plus({ hours: 1 });
    const newEnd = end.plus({ hours: 1 });
    const updated = updateTimedItem(item, newStart, newEnd);
    expect('start' in updated && updated.start?.equals(newStart)).toBe(true);
    expect('end' in updated && updated.end?.equals(newEnd)).toBe(true);
  });

  it('AllDayItemに呼んだ場合Errorをスローすること', () => {
    const item = createCalendarItem({ type: 'task', id: 'u2', title: '終日', status: 'todo', dateRange });
    expect(() => updateTimedItem(item, start, end)).toThrow();
  });

  it('更新後のstart >= end の場合Errorをスローすること', () => {
    const item = createCalendarItem({ type: 'task', id: 'u3', title: '更新', status: 'todo', start, end });
    expect(() => updateTimedItem(item, end, start)).toThrow();
  });
});

describe('updateAllDayItem', () => {
  it('AllDayItemのdateRangeを更新できること', () => {
    const item = createCalendarItem({ type: 'appointment', id: 'v1', title: '終日予定', dateRange });
    const newRange = createCalendarDateRange(tomorrow, toCalendarDate(now.plus({ days: 3 })));
    const updated = updateAllDayItem(item, newRange);
    expect('dateRange' in updated && updated.dateRange).toEqual(newRange);
  });

  it('TimedItemに呼んだ場合Errorをスローすること', () => {
    const item = createCalendarItem({ type: 'appointment', id: 'v2', title: '予定', start, end });
    expect(() => updateAllDayItem(item, dateRange)).toThrow();
  });

  it('不正なdateRange(逆順)はcreateCalendarDateRange自体がErrorをスローすること', () => {
    // end <= start の場合は createCalendarDateRange がエラーをスローするため、
    // updateAllDayItem に渡す前に検出される
    expect(() => createCalendarDateRange(tomorrow, today)).toThrow('Invalid CalendarDateRange');
  });
});
