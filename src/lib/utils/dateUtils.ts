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
 * @param date - 基準日
 * @param weekStartsOn - 週の開始曜日（1=月曜, 7=日曜）デフォルトは1（月曜）
 */
export function getWeekDays(date: DateTime, weekStartsOn: number = 1): DateTime[] {
  // 指定された曜日まで戻る
  let start = date.startOf('day');
  while (start.weekday !== weekStartsOn) {
    start = start.minus({ days: 1 });
  }
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

/**
 * ISO日付文字列間の日数差を計算（タイムゾーン非依存）
 * 
 * @param dateA - ISO日付文字列 (YYYY-MM-DD)
 * @param dateB - ISO日付文字列 (YYYY-MM-DD)
 * @returns dateB - dateA の日数差（dateB が後なら正、前なら負）
 * 
 * 注意: この関数はタイムゾーンの影響を受けないよう、UTC midnightで計算します。
 * レーン配置アルゴリズムで使用するため、Luxonを使用せず純粋なDate APIで実装。
 */
export function diffDaysISO(dateA: string, dateB: string): number {
  // ISO文字列を UTC midnight として解釈
  const a = new Date(dateA + 'T00:00:00Z');
  const b = new Date(dateB + 'T00:00:00Z');
  
  // ミリ秒差を日数に変換
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = b.getTime() - a.getTime();
  
  return Math.round(diffMs / msPerDay);
}
