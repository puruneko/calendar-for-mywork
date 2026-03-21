import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BUSINESS_HOURS,
  DEFAULT_STORAGE_DATA,
  type BusinessHours,
} from '../../src/lib/models/settings';
import { CalendarStorage } from '../../src/lib/storage/CalendarStorage.svelte';
import { MemoryBackend } from '../../src/lib/storage/MemoryBackend';

describe('BusinessHours', () => {
  describe('DEFAULT_BUSINESS_HOURS', () => {
    it('enabled が true であること', () => {
      expect(DEFAULT_BUSINESS_HOURS.enabled).toBe(true);
    });

    it('月〜金が営業日として設定されていること', () => {
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
      for (const key of weekdays) {
        const d = DEFAULT_BUSINESS_HOURS.weekDays[key];
        expect(d.enabled).toBe(true);
        expect(d.startTime).toBe('09:00');
        expect(d.endTime).toBe('17:30');
      }
    });

    it('土日が休みとして設定されていること', () => {
      const weekend = ['saturday', 'sunday'] as const;
      for (const key of weekend) {
        const d = DEFAULT_BUSINESS_HOURS.weekDays[key];
        expect(d.enabled).toBe(false);
      }
    });
  });

  describe('DEFAULT_STORAGE_DATA', () => {
    it('businessHours フィールドが含まれていること', () => {
      expect(DEFAULT_STORAGE_DATA.businessHours).toBeDefined();
      expect(DEFAULT_STORAGE_DATA.businessHours.enabled).toBe(true);
    });
  });

  describe('CalendarStorage との統合', () => {
    it('businessHours のデフォルト値で初期化されること', () => {
      const storage = new CalendarStorage(new MemoryBackend());
      expect(storage.businessHours.enabled).toBe(true);
      expect(storage.businessHours.weekDays.monday.startTime).toBe('09:00');
      expect(storage.businessHours.weekDays.saturday.enabled).toBe(false);
    });

    it('businessHours.enabled を部分更新できること', () => {
      const storage = new CalendarStorage(new MemoryBackend());
      storage.update({ businessHours: { enabled: false } });
      expect(storage.businessHours.enabled).toBe(false);
      // weekDays は変わらない
      expect(storage.businessHours.weekDays.monday.startTime).toBe('09:00');
    });

    it('特定曜日の startTime を更新できること', () => {
      const storage = new CalendarStorage(new MemoryBackend());
      const bh = storage.businessHours;
      storage.update({
        businessHours: {
          ...bh,
          weekDays: {
            ...bh.weekDays,
            monday: { ...bh.weekDays.monday, startTime: '08:00' },
          },
        },
      });
      expect(storage.businessHours.weekDays.monday.startTime).toBe('08:00');
      // 他の曜日は変わらない
      expect(storage.businessHours.weekDays.tuesday.startTime).toBe('09:00');
    });

    it('旧データ（businessHours なし）を読み込んでもデフォルト値が補完されること', () => {
      // businessHours を持たない旧データを返すカスタムバックエンドで検証
      const oldDataBackend = {
        load: () => ({ weekSettings: { startHour: 7 } }),
        save: () => {},
      };
      const storage = new CalendarStorage(oldDataBackend);
      expect(storage.businessHours.enabled).toBe(true);
      expect(storage.weekSettings.startHour).toBe(7);
    });

    it('バックエンドに businessHours が保存・復元されること', () => {
      const backend = new MemoryBackend();
      const s1 = new CalendarStorage(backend);
      const bh = s1.businessHours;
      s1.update({
        businessHours: {
          ...bh,
          weekDays: {
            ...bh.weekDays,
            friday: { ...bh.weekDays.friday, endTime: '16:00' },
          },
        },
      });

      const s2 = new CalendarStorage(backend);
      expect(s2.businessHours.weekDays.friday.endTime).toBe('16:00');
    });
  });
});
