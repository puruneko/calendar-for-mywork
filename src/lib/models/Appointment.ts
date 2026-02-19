/**
 * Appointment - 時間拘束そのもの
 * 
 * 特徴:
 * - 完了概念を持たない
 * - Timed（時刻指定）と AllDay（終日）の両方をサポート
 * - CalendarItemの排他的Union型により、start/end または dateRange のいずれかを持つ
 */

import type { CalendarItem } from './CalendarItem';

export type Appointment = CalendarItem & {
  type: 'appointment';
};
