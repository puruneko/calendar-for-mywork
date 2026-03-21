/**
 * カレンダー設定値の型定義
 *
 * CalendarStorage で永続化される設定値。
 * currentDate / activeView / items は props のまま（永続化対象外）。
 */

export type WeekViewSettings = {
  /** 表示開始時刻（時）。デフォルト: 0 */
  startHour: number;
  /** 表示終了時刻（時）。デフォルト: 24 */
  endHour: number;
  /** DnD・リサイズのスナップ単位（分）。デフォルト: 15 */
  minorTick: number;
  /** メジャーグリッド線の間隔（分）。デフォルト: 60 */
  majorTick: number;
  /** DnD で列を変更する閾値（0〜1）。デフォルト: 0.75 */
  dayChangeThreshold: number;
  /** 土日を表示するか。デフォルト: true */
  showWeekend: boolean;
  /** allday レーンを表示するか。デフォルト: true */
  showAllDay: boolean;
  /** デフォルト背景色の透明度（0〜1）。デフォルト: 0.5 */
  defaultColorOpacity: number;
  /** 週の開始曜日（0=日, 1=月...）。デフォルト: 1 */
  weekStartsOn: number;
  /** アイテム右余白（px）。デフォルト: 10 */
  itemRightMargin: number;
  /** 親階層を表示するか。デフォルト: true */
  showParent: boolean;
  /** 親階層の表示インデックス（-1=最後）。デフォルト: -1 */
  parentDisplayIndex: number;
};

export type MonthViewSettings = {
  /** 1日に表示するアイテムの最大数。デフォルト: 3 */
  maxItemsPerDay: number;
  /** 週の開始曜日（0=日, 1=月...）。デフォルト: 1 */
  weekStartsOn: number;
  /** 土日を表示するか。デフォルト: true */
  showWeekend: boolean;
  /** allday アイテムを表示するか。デフォルト: true */
  showAllDay: boolean;
  /** 単日アイテムを表示するか。デフォルト: true */
  showSingleDay: boolean;
};

// ============================================================
// BusinessHours
// ============================================================

/** 曜日キー（Luxon の weekday 順: 1=Monday...7=Sunday） */
export type WeekDayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/** 各曜日の営業時間設定 */
export type BusinessDaySettings = {
  /** この曜日を営業日として扱うか */
  enabled: boolean;
  /** 営業開始時刻（"HH:MM" 形式） */
  startTime: string;
  /** 営業終了時刻（"HH:MM" 形式） */
  endTime: string;
};

/** ビジネスアワー全体設定 */
export type BusinessHours = {
  /** 機能全体の有効/無効スイッチ */
  enabled: boolean;
  weekDays: Record<WeekDayKey, BusinessDaySettings>;
};

/** CalendarStorage で永続化される全設定値 */
export type CalendarStorageData = {
  weekSettings: WeekViewSettings;
  monthSettings: MonthViewSettings;
  businessHours: BusinessHours;
};

/** WeekViewSettings のデフォルト値 */
export const DEFAULT_WEEK_SETTINGS: WeekViewSettings = {
  startHour: 0,
  endHour: 24,
  minorTick: 15,
  majorTick: 60,
  dayChangeThreshold: 0.75,
  showWeekend: true,
  showAllDay: true,
  defaultColorOpacity: 0.5,
  weekStartsOn: 1,
  itemRightMargin: 10,
  showParent: true,
  parentDisplayIndex: -1,
};

/** MonthViewSettings のデフォルト値 */
export const DEFAULT_MONTH_SETTINGS: MonthViewSettings = {
  maxItemsPerDay: 3,
  weekStartsOn: 1,
  showWeekend: true,
  showAllDay: true,
  showSingleDay: true,
};

const DEFAULT_BUSINESS_DAY: BusinessDaySettings = { enabled: true,  startTime: '09:00', endTime: '17:30' };
const DEFAULT_OFF_DAY: BusinessDaySettings      = { enabled: false, startTime: '00:00', endTime: '00:00' };

/** BusinessHours のデフォルト値（月〜金: 09:00〜17:30、土日: 休み） */
export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  enabled: true,
  weekDays: {
    monday:    { ...DEFAULT_BUSINESS_DAY },
    tuesday:   { ...DEFAULT_BUSINESS_DAY },
    wednesday: { ...DEFAULT_BUSINESS_DAY },
    thursday:  { ...DEFAULT_BUSINESS_DAY },
    friday:    { ...DEFAULT_BUSINESS_DAY },
    saturday:  { ...DEFAULT_OFF_DAY },
    sunday:    { ...DEFAULT_OFF_DAY },
  },
};

/** CalendarStorageData のデフォルト値 */
export const DEFAULT_STORAGE_DATA: CalendarStorageData = {
  weekSettings: DEFAULT_WEEK_SETTINGS,
  monthSettings: DEFAULT_MONTH_SETTINGS,
  businessHours: DEFAULT_BUSINESS_HOURS,
};
