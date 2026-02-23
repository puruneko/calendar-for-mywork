import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { createCalendarItem, updateTimedItem, updateAllDayItem, updatePointItem } from '../../src/lib/models/factories';
import {
  toISODate, createCalendarDateRange, createCalendarDateTimeRange,
  createCalendarDatePoint, createCalendarDateTimePoint,
} from '../../src/lib/models';

const now = DateTime.now();
const start = now.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
const end = now.set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
const today = toISODate(now);
const tomorrow = toISODate(now.plus({ days: 1 }));
const dateRangeObj = { start: today, endExclusive: tomorrow };

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
      expect(item.temporal.kind).toBe('CalendarDateTimeRange');
    });

    it('statusがdoing/doneでも生成できること', () => {
      expect(() => createCalendarItem({ type: 'task', id: '2', title: 'doing', status: 'doing', start, end })).not.toThrow();
      expect(() => createCalendarItem({ type: 'task', id: '3', title: 'done', status: 'done', start, end })).not.toThrow();
    });

    it('parentsを含めて生成できること', () => {
      const item = createCalendarItem({ type: 'task', id: '4', title: 'p', status: 'todo', start, end, parents: ['A', 'B'] });
      expect(item.parents).toEqual(['A', 'B']);
    });

    it('styleを含めて生成できること', () => {
      const style = { backgroundColor: '#ff0000' } as Partial<CSSStyleDeclaration>;
      const item = createCalendarItem({ type: 'task', id: '5', title: 's', status: 'todo', start, end, style });
      expect(item.style).toEqual(style);
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
      const item = createCalendarItem({ type: 'task', id: 'a1', title: '終日', status: 'todo', dateRange: dateRangeObj });
      expect(item.type).toBe('task');
      expect(item.temporal.kind).toBe('CalendarDateRange');
    });

    it('dateRange.endExclusive <= dateRange.start の場合createCalendarDateRangeがErrorをスローすること', () => {
      expect(() => createCalendarDateRange(tomorrow, today)).toThrow('Invalid CalendarDateRange');
    });
  });

  describe('TimedAppointment', () => {
    it('正常なTimedAppointmentを生成できること', () => {
      const item = createCalendarItem({ type: 'appointment', id: 'b1', title: '予定', start, end });
      expect(item.type).toBe('appointment');
      expect(item.temporal.kind).toBe('CalendarDateTimeRange');
      expect('status' in item).toBe(false);
    });

    it('start >= end の場合Errorをスローすること', () => {
      expect(() => createCalendarItem({ type: 'appointment', id: 'b2', title: 'err', start: end, end: start })).toThrow();
    });
  });

  describe('AllDayAppointment', () => {
    it('正常なAllDayAppointmentを生成できること', () => {
      const item = createCalendarItem({ type: 'appointment', id: 'b3', title: '終日予定', dateRange: dateRangeObj });
      expect(item.type).toBe('appointment');
      expect(item.temporal.kind).toBe('CalendarDateRange');
    });
  });

  describe('Deadline', () => {
    it('CalendarDateTimePoint Deadlineを生成できること（temporal 直接指定）', () => {
      const at = now.set({ hour: 15, minute: 0, second: 0, millisecond: 0 });
      const item = createCalendarItem({
        type: 'deadline',
        id: 'd1',
        title: '分単位期限',
        temporal: createCalendarDateTimePoint(at),
      });
      expect(item.type).toBe('deadline');
      expect(item.temporal.kind).toBe('CalendarDateTimePoint');
    });

    it('CalendarDatePoint Deadlineを生成できること（temporal 直接指定）', () => {
      const item = createCalendarItem({
        type: 'deadline',
        id: 'd2',
        title: '日単位期限',
        temporal: createCalendarDatePoint(today),
      });
      expect(item.type).toBe('deadline');
      expect(item.temporal.kind).toBe('CalendarDatePoint');
    });

    it('at: DateTime shorthand で分単位 Deadline を生成できること', () => {
      const at = now.set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
      const item = createCalendarItem({ type: 'deadline', id: 'd3', title: '提案書締切', at });
      expect(item.type).toBe('deadline');
      expect(item.temporal.kind).toBe('CalendarDateTimePoint');
      if (item.temporal.kind === 'CalendarDateTimePoint') {
        expect(item.temporal.at.equals(at)).toBe(true);
      }
    });

    it('datePoint: ISODate shorthand で日単位 Deadline を生成できること', () => {
      const item = createCalendarItem({ type: 'deadline', id: 'd4', title: 'スプリント締切', datePoint: today });
      expect(item.type).toBe('deadline');
      expect(item.temporal.kind).toBe('CalendarDatePoint');
      if (item.temporal.kind === 'CalendarDatePoint') {
        expect(item.temporal.at).toBe(today);
      }
    });

    it('idが空の場合Errorをスローすること', () => {
      const at = now.set({ hour: 17, minute: 0 });
      expect(() => createCalendarItem({ type: 'deadline', id: '', title: '期限', at })).toThrow();
    });

    it('titleが空の場合Errorをスローすること', () => {
      expect(() => createCalendarItem({ type: 'deadline', id: 'd5', title: '', datePoint: today })).toThrow();
    });
  });

  describe('temporal 直接指定', () => {
    it('CalendarDateTimeRange を temporal で直接指定できること', () => {
      const item = createCalendarItem({
        type: 'task',
        id: 't1',
        title: '直接指定',
        status: 'todo',
        temporal: createCalendarDateTimeRange(start, end),
      });
      expect(item.temporal.kind).toBe('CalendarDateTimeRange');
    });

    it('CalendarDateRange を temporal で直接指定できること', () => {
      const item = createCalendarItem({
        type: 'appointment',
        id: 't2',
        title: '直接指定allday',
        temporal: createCalendarDateRange(today, tomorrow),
      });
      expect(item.temporal.kind).toBe('CalendarDateRange');
    });
  });
});

describe('updateTimedItem', () => {
  it('CalendarDateTimeRange のstart/endを更新できること', () => {
    const item = createCalendarItem({ type: 'task', id: 'u1', title: '更新', status: 'todo', start, end });
    const newStart = start.plus({ hours: 1 });
    const newEnd = end.plus({ hours: 1 });
    const updated = updateTimedItem(item, newStart, newEnd);
    expect(updated.temporal.kind).toBe('CalendarDateTimeRange');
    if (updated.temporal.kind === 'CalendarDateTimeRange') {
      expect(updated.temporal.start.equals(newStart)).toBe(true);
      expect(updated.temporal.end.equals(newEnd)).toBe(true);
    }
  });

  it('CalendarDateRange アイテムに呼んだ場合Errorをスローすること', () => {
    const item = createCalendarItem({ type: 'task', id: 'u2', title: '終日', status: 'todo', dateRange: dateRangeObj });
    expect(() => updateTimedItem(item, start, end)).toThrow();
  });

  it('更新後のstart >= end の場合Errorをスローすること', () => {
    const item = createCalendarItem({ type: 'task', id: 'u3', title: '更新', status: 'todo', start, end });
    expect(() => updateTimedItem(item, end, start)).toThrow();
  });
});

describe('updateAllDayItem', () => {
  it('CalendarDateRange のdateRangeを更新できること', () => {
    const item = createCalendarItem({ type: 'appointment', id: 'v1', title: '終日予定', dateRange: dateRangeObj });
    const newEndExclusive = toISODate(now.plus({ days: 3 }));
    const updated = updateAllDayItem(item, { start: tomorrow, endExclusive: newEndExclusive });
    expect(updated.temporal.kind).toBe('CalendarDateRange');
    if (updated.temporal.kind === 'CalendarDateRange') {
      expect(updated.temporal.start).toBe(tomorrow);
      expect(updated.temporal.endExclusive).toBe(newEndExclusive);
    }
  });

  it('CalendarDateTimeRange アイテムに呼んだ場合Errorをスローすること', () => {
    const item = createCalendarItem({ type: 'appointment', id: 'v2', title: '予定', start, end });
    expect(() => updateAllDayItem(item, dateRangeObj)).toThrow();
  });

  it('不正なdateRange(逆順)はcreateCalendarDateRange自体がErrorをスローすること', () => {
    expect(() => createCalendarDateRange(tomorrow, today)).toThrow('Invalid CalendarDateRange');
  });
});

describe('updatePointItem', () => {
  it('CalendarDateTimePoint を更新できること', () => {
    const at = now.set({ hour: 15, minute: 0, second: 0, millisecond: 0 });
    const item = createCalendarItem({ type: 'deadline', id: 'w1', title: '期限', temporal: createCalendarDateTimePoint(at) });
    const newAt = at.plus({ hours: 1 });
    const updated = updatePointItem(item, newAt);
    expect(updated.temporal.kind).toBe('CalendarDateTimePoint');
    if (updated.temporal.kind === 'CalendarDateTimePoint') {
      expect(updated.temporal.at.equals(newAt)).toBe(true);
    }
  });

  it('CalendarDatePoint を更新できること', () => {
    const item = createCalendarItem({ type: 'deadline', id: 'w2', title: '日期限', temporal: createCalendarDatePoint(today) });
    const updated = updatePointItem(item, tomorrow);
    expect(updated.temporal.kind).toBe('CalendarDatePoint');
    if (updated.temporal.kind === 'CalendarDatePoint') {
      expect(updated.temporal.at).toBe(tomorrow);
    }
  });

  it('CalendarDateTimeRange アイテムに呼んだ場合Errorをスローすること', () => {
    const item = createCalendarItem({ type: 'task', id: 'w3', title: 'timed', status: 'todo', start, end });
    expect(() => updatePointItem(item, now)).toThrow();
  });
});
