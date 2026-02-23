/**
 * カレンダーアイテムの基底インターフェース
 * 
 * 設計方針:
 * - Item と 時間情報（TimeSpan）は完全に分離する
 * - temporal フィールドに TimeSpan を保持し、start/end/dateRange は持たない
 * - これにより RRULE・Occurrence・Floating Time 等の将来拡張に対応できる
 */

import type { TimeSpan } from './temporal';

/**
 * カレンダーアイテム
 * 時間情報は temporal フィールドに TimeSpan として保持する
 */
export type CalendarItem = {
  /** 一意識別子 */
  id: string;
  
  /** アイテムタイプ */
  type: 'task' | 'appointment' | 'deadline';
  
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
  
  /** 時間占有情報 */
  temporal: TimeSpan;
};
