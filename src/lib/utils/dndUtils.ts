/**
 * DnD（ドラッグ&ドロップ）関連のユーティリティ関数
 */

import { DateTime } from 'luxon';

/**
 * ドロップ位置（Y座標）から時刻を計算
 * 
 * @param yPosition - ドロップ位置のY座標（ピクセル）
 * @param startHour - 表示開始時刻
 * @param hourHeight - 1時間あたりのピクセル高さ
 * @returns 開始時刻からの分数
 */
export function calculateMinutesFromY(
  yPosition: number,
  _startHour: number = 0,
  hourHeight: number = 60
): number {
  const hoursFromStart = yPosition / hourHeight;
  return hoursFromStart * 60;
}

/**
 * ドロップ位置とベース日付から新しい開始日時を計算
 * 
 * @param baseDate - ベースとなる日付
 * @param yPosition - ドロップ位置のY座標（ピクセル）
 * @param startHour - 表示開始時刻
 * @param hourHeight - 1時間あたりのピクセル高さ
 * @returns 新しい開始日時
 */
export function calculateNewStartTime(
  baseDate: DateTime,
  yPosition: number,
  startHour: number = 0,
  hourHeight: number = 60
): DateTime {
  const minutesFromStart = calculateMinutesFromY(yPosition, startHour, hourHeight);
  return baseDate.startOf('day').set({ hour: startHour }).plus({ minutes: minutesFromStart });
}

/**
 * アイテムの期間を維持したまま、新しい終了日時を計算
 * 
 * @param originalStart - 元の開始日時
 * @param originalEnd - 元の終了日時
 * @param newStart - 新しい開始日時
 * @returns 新しい終了日時
 */
export function calculateNewEndTime(
  originalStart: DateTime,
  originalEnd: DateTime,
  newStart: DateTime
): DateTime {
  const duration = originalEnd.diff(originalStart, 'minutes').minutes;
  return newStart.plus({ minutes: duration });
}

/**
 * 時間を15分単位にスナップ
 * 
 * @param dateTime - 対象の日時
 * @returns 15分単位にスナップされた日時
 * @deprecated snapToMinorTickを使用してください
 */
export function snapToQuarterHour(dateTime: DateTime): DateTime {
  return snapToMinorTick(dateTime, 15);
}

/**
 * 時間を指定した分単位にスナップ
 * 
 * @param dateTime - 対象の日時
 * @param minorTick - スナップ単位（分）
 * @returns 指定した分単位にスナップされた日時
 */
export function snapToMinorTick(dateTime: DateTime, minorTick: number = 15): DateTime {
  const minutes = dateTime.minute;
  const snappedMinutes = Math.round(minutes / minorTick) * minorTick;
  return dateTime.set({ minute: snappedMinutes, second: 0, millisecond: 0 });
}
