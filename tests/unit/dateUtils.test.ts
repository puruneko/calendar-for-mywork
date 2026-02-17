/**
 * dateUtils.ts の単体テスト
 */

import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import {
  getWeekStart,
  getWeekEnd,
  getWeekDays,
  isSameDay,
  generateTimeSlots,
  formatTime,
  formatDate,
  formatWeekday,
} from '../../src/lib/utils/dateUtils';

describe('dateUtils', () => {
  describe('getWeekStart', () => {
    it('月曜日の日付を返すこと', () => {
      // 2026-02-17は火曜日
      const date = DateTime.fromISO('2026-02-17');
      const weekStart = getWeekStart(date);
      
      expect(weekStart.weekday).toBe(1); // 月曜日
      expect(weekStart.toISODate()).toBe('2026-02-16');
    });
  });

  describe('getWeekEnd', () => {
    it('日曜日の日付を返すこと', () => {
      const date = DateTime.fromISO('2026-02-17');
      const weekEnd = getWeekEnd(date);
      
      expect(weekEnd.weekday).toBe(7); // 日曜日
      expect(weekEnd.toISODate()).toBe('2026-02-22');
    });
  });

  describe('getWeekDays', () => {
    it('月曜日から日曜日まで7日分の配列を返すこと', () => {
      const date = DateTime.fromISO('2026-02-17');
      const weekDays = getWeekDays(date);
      
      expect(weekDays).toHaveLength(7);
      expect(weekDays[0].weekday).toBe(1); // 月曜日
      expect(weekDays[6].weekday).toBe(7); // 日曜日
    });
  });

  describe('isSameDay', () => {
    it('同じ日の場合trueを返すこと', () => {
      const date1 = DateTime.fromISO('2026-02-17T10:00:00');
      const date2 = DateTime.fromISO('2026-02-17T15:30:00');
      
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('異なる日の場合falseを返すこと', () => {
      const date1 = DateTime.fromISO('2026-02-17T10:00:00');
      const date2 = DateTime.fromISO('2026-02-18T10:00:00');
      
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('generateTimeSlots', () => {
    it('指定された時間範囲のスロットを生成すること', () => {
      const slots = generateTimeSlots(9, 12, 60);
      
      expect(slots).toHaveLength(3);
      expect(slots[0].hour).toBe(9);
      expect(slots[1].hour).toBe(10);
      expect(slots[2].hour).toBe(11);
    });

    it('30分間隔のスロットを生成できること', () => {
      const slots = generateTimeSlots(9, 11, 30);
      
      expect(slots).toHaveLength(4);
      expect(slots[0].minute).toBe(0);
      expect(slots[1].minute).toBe(30);
    });
  });

  describe('formatTime', () => {
    it('時刻をHH:mm形式で返すこと', () => {
      const dateTime = DateTime.fromISO('2026-02-17T09:30:00');
      expect(formatTime(dateTime)).toBe('09:30');
    });
  });

  describe('formatDate', () => {
    it('日付をyyyy-MM-dd形式で返すこと', () => {
      const dateTime = DateTime.fromISO('2026-02-17');
      expect(formatDate(dateTime)).toBe('2026-02-17');
    });
  });

  describe('formatWeekday', () => {
    it('曜日を日本語で返すこと', () => {
      const dateTime = DateTime.fromISO('2026-02-17'); // 火曜日
      const weekday = formatWeekday(dateTime, 'ja');
      
      expect(weekday).toMatch(/火/);
    });
  });
});
