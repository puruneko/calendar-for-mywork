/**
 * カレンダーアイテムの基底インターフェース
 * TaskとAppointmentの共通属性を定義
 * 
 * TimedItem と AllDayItem は排他的な Union 型として実装
 */

import type { DateTime } from 'luxon';
import type { CalendarDateRange } from './calendarDateRange';

/**
 * 時刻を持つイベント（Timed Event）
 */
type TimedItem = {
  /** 開始日時（Luxon DateTime） */
  start: DateTime;
  /** 終了日時（Luxon DateTime） */
  end: DateTime;
  /** AllDay用の日付レンジ（Timedでは使用不可） */
  dateRange?: never;
};

/**
 * 終日イベント（AllDay Event）
 * 時刻を持たず、暦日レンジのみを扱う
 */
type AllDayItem = {
  /** AllDay用の日付レンジ（end は exclusive） */
  dateRange: CalendarDateRange;
  /** 開始日時（AllDayでは使用不可） */
  start?: never;
  /** 終了日時（AllDayでは使用不可） */
  end?: never;
};

/**
 * カレンダーアイテム
 * TimedItem または AllDayItem のいずれかを持つ
 */
export type CalendarItem = {
  /** 一意識別子 */
  id: string;
  
  /** アイテムタイプ */
  type: 'task' | 'appointment';
  
  /** 表示タイトル */
  title: string;
  
  /** タグ（分類用） */
  tags?: string[];
  
  /** 詳細説明 */
  description?: string;
  
  /** カスタムスタイル（CSSプロパティ） */
  style?: Partial<CSSStyleDeclaration>;
  
  /** 親階層の配列（0番目がTop parent、最後が直近のparent） */
  parents?: string[];
} & (TimedItem | AllDayItem);
