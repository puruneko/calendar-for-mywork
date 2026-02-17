/**
 * カレンダーアイテムの基底インターフェース
 * TaskとAppointmentの共通属性を定義
 */

import type { DateTime } from 'luxon';

export interface CalendarItem {
  /** 一意識別子 */
  id: string;
  
  /** アイテムタイプ */
  type: 'task' | 'appointment';
  
  /** 表示タイトル */
  title: string;
  
  /** 開始日時（Luxon DateTime） */
  start?: DateTime;
  
  /** 終了日時（Luxon DateTime） */
  end?: DateTime;
  
  /** タグ（分類用） */
  tags?: string[];
  
  /** 詳細説明 */
  description?: string;
}
