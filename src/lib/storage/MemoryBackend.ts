import type { StorageBackend } from './CalendarStorage.svelte';
import type { CalendarStorageData } from '../models/settings';

/**
 * インメモリストレージバックエンド
 *
 * - テスト・SSR・デフォルト用
 * - ページリロードでリセットされる
 */
export class MemoryBackend implements StorageBackend {
  #store: Partial<CalendarStorageData> = {};

  load(): Partial<CalendarStorageData> {
    return this.#store;
  }

  save(data: CalendarStorageData): void {
    this.#store = { ...data };
  }
}
