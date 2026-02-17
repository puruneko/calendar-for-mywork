/**
 * Task - 成果を前提とする作業単位
 * 
 * 特徴:
 * - 完了・進捗の概念を持つ
 * - 時間を占有しないTaskも許容
 * - 階層構造をサポート（parentId）
 */

import type { CalendarItem } from './CalendarItem';

export type TaskStatus = 'todo' | 'doing' | 'done' | 'undefined';

export interface Task extends CalendarItem {
  type: 'task';
  
  /** タスクの状態 */
  status: TaskStatus;
  
  /** 親タスクID（階層構造用） */
  parentId?: string;
}
