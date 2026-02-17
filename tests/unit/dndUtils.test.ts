/**
 * dndUtils.ts の単体テスト
 */

import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import {
  calculateMinutesFromY,
  calculateNewStartTime,
  calculateNewEndTime,
  snapToQuarterHour,
} from '../../src/lib/utils/dndUtils';

describe('dndUtils', () => {
  describe('calculateMinutesFromY', () => {
    it('Y座標0の場合、0分を返すこと', () => {
      const minutes = calculateMinutesFromY(0, 0, 60);
      expect(minutes).toBe(0);
    });

    it('Y座標60（1時間分）の場合、60分を返すこと', () => {
      const minutes = calculateMinutesFromY(60, 0, 60);
      expect(minutes).toBe(60);
    });

    it('Y座標120（2時間分）の場合、120分を返すこと', () => {
      const minutes = calculateMinutesFromY(120, 0, 60);
      expect(minutes).toBe(120);
    });

    it('Y座標30（30分分）の場合、30分を返すこと', () => {
      const minutes = calculateMinutesFromY(30, 0, 60);
      expect(minutes).toBe(30);
    });
  });

  describe('calculateNewStartTime', () => {
    it('Y座標0の場合、開始時刻と同じ時刻を返すこと', () => {
      const baseDate = DateTime.fromISO('2026-02-17');
      const newStart = calculateNewStartTime(baseDate, 0, 9, 60);
      
      expect(newStart.hour).toBe(9);
      expect(newStart.minute).toBe(0);
    });

    it('Y座標60（1時間分）の場合、開始時刻+1時間を返すこと', () => {
      const baseDate = DateTime.fromISO('2026-02-17');
      const newStart = calculateNewStartTime(baseDate, 60, 9, 60);
      
      expect(newStart.hour).toBe(10);
      expect(newStart.minute).toBe(0);
    });

    it('Y座標30（30分分）の場合、開始時刻+30分を返すこと', () => {
      const baseDate = DateTime.fromISO('2026-02-17');
      const newStart = calculateNewStartTime(baseDate, 30, 9, 60);
      
      expect(newStart.hour).toBe(9);
      expect(newStart.minute).toBe(30);
    });

    it('日付が正しく保持されること', () => {
      const baseDate = DateTime.fromISO('2026-02-20');
      const newStart = calculateNewStartTime(baseDate, 60, 8, 60);
      
      expect(newStart.toISODate()).toBe('2026-02-20');
    });
  });

  describe('calculateNewEndTime', () => {
    it('元の期間（1時間）を維持すること', () => {
      const originalStart = DateTime.fromISO('2026-02-17T09:00:00');
      const originalEnd = DateTime.fromISO('2026-02-17T10:00:00');
      const newStart = DateTime.fromISO('2026-02-17T14:00:00');
      
      const newEnd = calculateNewEndTime(originalStart, originalEnd, newStart);
      
      expect(newEnd.hour).toBe(15);
      expect(newEnd.minute).toBe(0);
    });

    it('元の期間（2.5時間）を維持すること', () => {
      const originalStart = DateTime.fromISO('2026-02-17T09:00:00');
      const originalEnd = DateTime.fromISO('2026-02-17T11:30:00');
      const newStart = DateTime.fromISO('2026-02-17T14:00:00');
      
      const newEnd = calculateNewEndTime(originalStart, originalEnd, newStart);
      
      expect(newEnd.hour).toBe(16);
      expect(newEnd.minute).toBe(30);
    });

    it('日をまたぐ場合も正しく計算すること', () => {
      const originalStart = DateTime.fromISO('2026-02-17T09:00:00');
      const originalEnd = DateTime.fromISO('2026-02-17T12:00:00');
      const newStart = DateTime.fromISO('2026-02-18T22:00:00');
      
      const newEnd = calculateNewEndTime(originalStart, originalEnd, newStart);
      
      expect(newEnd.day).toBe(19);
      expect(newEnd.hour).toBe(1);
      expect(newEnd.minute).toBe(0);
    });
  });

  describe('snapToQuarterHour', () => {
    it('0分は0分にスナップすること', () => {
      const dateTime = DateTime.fromISO('2026-02-17T09:00:00');
      const snapped = snapToQuarterHour(dateTime);
      
      expect(snapped.minute).toBe(0);
    });

    it('7分は0分にスナップすること', () => {
      const dateTime = DateTime.fromISO('2026-02-17T09:07:00');
      const snapped = snapToQuarterHour(dateTime);
      
      expect(snapped.minute).toBe(0);
    });

    it('8分は15分にスナップすること', () => {
      const dateTime = DateTime.fromISO('2026-02-17T09:08:00');
      const snapped = snapToQuarterHour(dateTime);
      
      expect(snapped.minute).toBe(15);
    });

    it('15分は15分にスナップすること', () => {
      const dateTime = DateTime.fromISO('2026-02-17T09:15:00');
      const snapped = snapToQuarterHour(dateTime);
      
      expect(snapped.minute).toBe(15);
    });

    it('23分は30分にスナップすること', () => {
      const dateTime = DateTime.fromISO('2026-02-17T09:23:00');
      const snapped = snapToQuarterHour(dateTime);
      
      expect(snapped.minute).toBe(30);
    });

    it('52分は45分にスナップすること', () => {
      const dateTime = DateTime.fromISO('2026-02-17T09:52:00');
      const snapped = snapToQuarterHour(dateTime);
      
      expect(snapped.minute).toBe(45);
    });

    it('秒とミリ秒が0にリセットされること', () => {
      const dateTime = DateTime.fromISO('2026-02-17T09:15:30.500');
      const snapped = snapToQuarterHour(dateTime);
      
      expect(snapped.second).toBe(0);
      expect(snapped.millisecond).toBe(0);
    });
  });
});
