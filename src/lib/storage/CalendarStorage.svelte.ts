/**
 * CalendarStorage — 永続化可能な状態管理レイヤー
 *
 * 設計方針:
 * - StorageBackend インターフェースにより永続化先を差し替え可能
 * - デフォルトは MemoryBackend（テスト・SSR でも安全）
 * - Svelte のリアクティビティと連携するため $state を内部で使用
 */

import type { CalendarStorageData, WeekViewSettings, MonthViewSettings, BusinessHours } from '../models/settings';
import { DEFAULT_STORAGE_DATA } from '../models/settings';

/** 深い部分更新用のユーティリティ型 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * 永続化バックエンドのインターフェース
 *
 * 同期 API。非同期バックエンドは将来の拡張として async 版 IF を別途検討。
 */
export interface StorageBackend {
  /** 保存済みデータを読み込む。未保存の場合は空オブジェクトを返す */
  load(): Partial<CalendarStorageData>;
  /** データを保存する */
  save(data: CalendarStorageData): void;
}

/**
 * CalendarStorage — 設定値の一元管理クラス
 *
 * @example
 * // メモリバックエンド（デフォルト）
 * const storage = new CalendarStorage();
 *
 * @example
 * // localStorage バックエンド
 * const storage = new CalendarStorage(new LocalStorageBackend('my-calendar'));
 *
 * @example
 * // 初期値の上書き
 * const storage = new CalendarStorage(undefined, {
 *   weekSettings: { startHour: 8, endHour: 20 }
 * });
 */
export class CalendarStorage {
  #backend: StorageBackend;
  #data: CalendarStorageData = $state(DEFAULT_STORAGE_DATA);
  #listeners: Set<(data: CalendarStorageData) => void> = new Set();

  constructor(
    backend?: StorageBackend,
    overrides?: DeepPartial<CalendarStorageData>
  ) {
    // MemoryBackend を動的に import しないため、インライン実装
    this.#backend = backend ?? {
      load: () => ({}),
      save: () => {},
    };

    // デフォルト値 → バックエンドから読み込んだ値 → 上書き値 の順でマージ
    const loaded = this.#backend.load();
    this.#data = deepMerge(
      DEFAULT_STORAGE_DATA,
      loaded as DeepPartial<CalendarStorageData>,
      overrides ?? {}
    );
  }

  /** 現在の全設定値を取得 */
  get data(): CalendarStorageData {
    return this.#data;
  }

  /** WeekViewSettings を取得 */
  get weekSettings(): WeekViewSettings {
    return this.#data.weekSettings;
  }

  /** MonthViewSettings を取得 */
  get monthSettings(): MonthViewSettings {
    return this.#data.monthSettings;
  }

  /** BusinessHours を取得 */
  get businessHours(): BusinessHours {
    return this.#data.businessHours;
  }

  /**
   * 設定値を部分更新する
   *
   * @example
   * storage.update({ weekSettings: { startHour: 8 } });
   */
  update(patch: DeepPartial<CalendarStorageData>): void {
    this.#data = deepMerge(this.#data, patch);
    this.#backend.save(this.#data);
    this.#notify();
  }

  /**
   * 変更リスナーを登録する
   * @returns リスナーを解除する関数
   */
  subscribe(listener: (data: CalendarStorageData) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify(): void {
    for (const listener of this.#listeners) {
      listener(this.#data);
    }
  }
}

/** 深いマージユーティリティ（immutable） */
function deepMerge<T extends object>(
  base: T,
  ...patches: DeepPartial<T>[]
): T {
  let result = { ...base };
  for (const patch of patches) {
    for (const key in patch) {
      const val = patch[key as keyof typeof patch];
      if (val !== undefined && val !== null && typeof val === 'object' && !Array.isArray(val)) {
        result[key as keyof T] = deepMerge(
          result[key as keyof T] as object,
          val as DeepPartial<object>
        ) as T[keyof T];
      } else if (val !== undefined) {
        result[key as keyof T] = val as T[keyof T];
      }
    }
  }
  return result;
}
