import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarStorage } from '../../src/lib/storage/CalendarStorage.svelte';
import { MemoryBackend } from '../../src/lib/storage/MemoryBackend';
import { DEFAULT_WEEK_SETTINGS, DEFAULT_MONTH_SETTINGS } from '../../src/lib/models/settings';

describe('CalendarStorage', () => {
  let storage: CalendarStorage;

  beforeEach(() => {
    storage = new CalendarStorage(new MemoryBackend());
  });

  describe('初期化', () => {
    it('デフォルト値で初期化されること', () => {
      expect(storage.data.weekSettings.startHour).toBe(DEFAULT_WEEK_SETTINGS.startHour);
      expect(storage.data.weekSettings.endHour).toBe(DEFAULT_WEEK_SETTINGS.endHour);
      expect(storage.data.weekSettings.minorTick).toBe(DEFAULT_WEEK_SETTINGS.minorTick);
      expect(storage.data.monthSettings.maxItemsPerDay).toBe(DEFAULT_MONTH_SETTINGS.maxItemsPerDay);
    });

    it('初期値を上書きして初期化できること', () => {
      const customStorage = new CalendarStorage(new MemoryBackend(), {
        weekSettings: { startHour: 9, endHour: 18 },
      });
      expect(customStorage.data.weekSettings.startHour).toBe(9);
      expect(customStorage.data.weekSettings.endHour).toBe(18);
      // 指定していない項目はデフォルト値
      expect(customStorage.data.weekSettings.minorTick).toBe(DEFAULT_WEEK_SETTINGS.minorTick);
    });
  });

  describe('update', () => {
    it('weekSettings を部分更新できること', () => {
      storage.update({ weekSettings: { startHour: 9 } });
      expect(storage.data.weekSettings.startHour).toBe(9);
      // 他の設定は変わらない
      expect(storage.data.weekSettings.endHour).toBe(DEFAULT_WEEK_SETTINGS.endHour);
    });

    it('monthSettings を部分更新できること', () => {
      storage.update({ monthSettings: { maxItemsPerDay: 5 } });
      expect(storage.data.monthSettings.maxItemsPerDay).toBe(5);
      expect(storage.data.monthSettings.weekStartsOn).toBe(DEFAULT_MONTH_SETTINGS.weekStartsOn);
    });

    it('weekSettings と monthSettings を同時に更新できること', () => {
      storage.update({
        weekSettings: { startHour: 8, endHour: 22 },
        monthSettings: { showWeekend: false },
      });
      expect(storage.data.weekSettings.startHour).toBe(8);
      expect(storage.data.weekSettings.endHour).toBe(22);
      expect(storage.data.monthSettings.showWeekend).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('update 後にリスナーが呼ばれること', () => {
      const calls: typeof storage.data[] = [];
      const unsubscribe = storage.subscribe((data) => calls.push(data));

      storage.update({ weekSettings: { startHour: 10 } });
      expect(calls).toHaveLength(1);
      expect(calls[0].weekSettings.startHour).toBe(10);

      unsubscribe();
    });

    it('unsubscribe 後はリスナーが呼ばれないこと', () => {
      const calls: typeof storage.data[] = [];
      const unsubscribe = storage.subscribe((data) => calls.push(data));

      storage.update({ weekSettings: { startHour: 10 } });
      unsubscribe();
      storage.update({ weekSettings: { startHour: 11 } });

      expect(calls).toHaveLength(1);
    });
  });

  describe('MemoryBackend との連携', () => {
    it('update するとバックエンドに保存されること', () => {
      const backend = new MemoryBackend();
      const s = new CalendarStorage(backend);
      s.update({ weekSettings: { startHour: 7 } });

      const loaded = backend.load();
      expect(loaded.weekSettings?.startHour).toBe(7);
    });

    it('バックエンドから読み込んで初期化されること', () => {
      const backend = new MemoryBackend();
      // 先に保存
      const s1 = new CalendarStorage(backend);
      s1.update({ weekSettings: { startHour: 6 } });

      // 同じバックエンドで新しいインスタンスを作成
      const s2 = new CalendarStorage(backend);
      expect(s2.data.weekSettings.startHour).toBe(6);
    });
  });
});
