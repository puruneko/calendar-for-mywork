/**
 * 日付関連のユーティリティ関数
 * 必ずLuxonを使用すること（Date型の直接操作禁止）
 */

import { DateTime } from 'luxon';

/**
 * 指定された日付が含まれる週の開始日（月曜日）を取得
 */
export function getWeekStart(date: DateTime): DateTime {
  return date.startOf('week');
}

/**
 * 指定された日付が含まれる週の終了日（日曜日）を取得
 */
export function getWeekEnd(date: DateTime): DateTime {
  return date.endOf('week');
}

/**
 * 指定された週の日付配列を取得（月曜日～日曜日）
 */
export function getWeekDays(date: DateTime): DateTime[] {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => start.plus({ days: i }));
}

/**
 * 2つの日時が同じ日かどうかを判定
 */
export function isSameDay(date1: DateTime, date2: DateTime): boolean {
  return date1.hasSame(date2, 'day');
}

/**
 * 時間範囲の配列を生成（例: 9:00, 10:00, 11:00...）
 */
export function generateTimeSlots(
  startHour: number = 0,
  endHour: number = 24,
  intervalMinutes: number = 60
): DateTime[] {
  const slots: DateTime[] = [];
  const baseDate = DateTime.now().startOf('day');
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      slots.push(baseDate.set({ hour, minute }));
    }
  }
  
  return slots;
}

/**
 * DateTimeを時刻文字列に変換（例: "09:00"）
 */
export function formatTime(dateTime: DateTime): string {
  return dateTime.toFormat('HH:mm');
}

/**
 * DateTimeを日付文字列に変換（例: "2026-02-17"）
 */
export function formatDate(dateTime: DateTime): string {
  return dateTime.toFormat('yyyy-MM-dd');
}

/**
 * DateTimeを曜日文字列に変換（例: "月"）
 */
export function formatWeekday(dateTime: DateTime, locale: string = 'ja'): string {
  return dateTime.setLocale(locale).toFormat('ccc');
}
