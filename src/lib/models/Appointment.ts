/**
 * Appointment - 時間拘束そのもの
 * 
 * 特徴:
 * - 完了概念を持たない
 * - start/endは必須（時間占有が前提）
 */

import type { CalendarItem } from './CalendarItem';
import type { DateTime } from 'luxon';

export interface Appointment extends CalendarItem {
  type: 'appointment';
  
  /** 開始日時（必須） */
  start: DateTime;
  
  /** 終了日時（必須） */
  end: DateTime;
}
