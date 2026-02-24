import type { StorageBackend } from './CalendarStorage.svelte';
import type { CalendarStorageData } from '../models/settings';

/**
 * localStorage バックエンド
 *
 * - ブラウザ環境用
 * - ページリロード後も設定値を保持する
 * - SSR 環境では load/save が no-op になる（安全）
 */
export class LocalStorageBackend implements StorageBackend {
  #key: string;

  /**
   * @param key localStorage のキー名（複数インスタンスを使う場合は別のキーを指定）
   */
  constructor(key: string = 'svelte-calendar-lib') {
    this.#key = key;
  }

  load(): Partial<CalendarStorageData> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(this.#key);
      if (!raw) return {};
      return JSON.parse(raw) as Partial<CalendarStorageData>;
    } catch {
      return {};
    }
  }

  save(data: CalendarStorageData): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(this.#key, JSON.stringify(data));
    } catch {
      // localStorage が使用不可の場合（プライベートモード等）は無視
    }
  }
}
