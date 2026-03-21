import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { createCalendarItem } from '../../src/lib/models/factories';
import {
  METRO_COLOR_PRESETS,
  PRESET_STYLE_RULES,
  getComputedItemStyle,
} from '../../src/lib/utils/itemUtils';

const now = DateTime.now();
const start = now.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
const end   = now.set({ hour: 10, minute: 0, second: 0, millisecond: 0 });

describe('METRO_COLOR_PRESETS', () => {
  it('task/todo カラーが定義されていること', () => {
    expect(METRO_COLOR_PRESETS.task.todo).toBe('#5B9CF6');
  });

  it('task/doing カラーが定義されていること', () => {
    expect(METRO_COLOR_PRESETS.task.doing).toBe('#FFA94D');
  });

  it('task/done カラーが定義されていること', () => {
    expect(METRO_COLOR_PRESETS.task.done).toBe('#A8C5A0');
  });

  it('appointment カラーが定義されていること', () => {
    expect(METRO_COLOR_PRESETS.appointment).toBe('#6EBD8F');
  });

  it('deadline カラーが定義されていること', () => {
    expect(METRO_COLOR_PRESETS.deadline).toBe('#F07070');
  });
});

describe('getComputedItemStyle', () => {
  describe('1. 型デフォルト（status 別）', () => {
    it('task/todo はソフトブルーになること', () => {
      const item = createCalendarItem({ type: 'task', id: '1', title: 'todo', status: 'todo', start, end });
      const style = getComputedItemStyle(item);
      expect(style.backgroundColor).toBe('#5B9CF6');
    });

    it('task/doing はウォームアンバーになること', () => {
      const item = createCalendarItem({ type: 'task', id: '2', title: 'doing', status: 'doing', start, end });
      const style = getComputedItemStyle(item);
      expect(style.backgroundColor).toBe('#FFA94D');
    });

    it('task/done はセージグリーンになること（ルール前）', () => {
      const item = createCalendarItem({ type: 'task', id: '3', title: 'done', status: 'done', start, end });
      // completed-task ルールで上書きされるため、型デフォルト直後の値ではなく最終値で確認
      const style = getComputedItemStyle(item);
      // completed-task ルール適用後は #cccccc になるはず
      expect(style.backgroundColor).toBe('#cccccc');
    });

    it('appointment はミントグリーンになること', () => {
      const item = createCalendarItem({ type: 'appointment', id: '4', title: '予定', start, end });
      const style = getComputedItemStyle(item);
      expect(style.backgroundColor).toBe('#6EBD8F');
    });

    it('deadline はソフトコーラルになること', () => {
      const item = createCalendarItem({ type: 'deadline', id: '5', title: '締切', at: end });
      const style = getComputedItemStyle(item);
      expect(style.backgroundColor).toBe('#F07070');
    });
  });

  describe('2. タグスタイル', () => {
    it('タグに対応するスタイルが適用されること', () => {
      const item = createCalendarItem({ type: 'task', id: '6', title: 'tagged', status: 'todo', start, end, tags: ['重要'] });
      const tagStyleMap = { '重要': { backgroundColor: '#ea4335', color: '#fff' } };
      const style = getComputedItemStyle(item, tagStyleMap);
      expect(style.backgroundColor).toBe('#ea4335');
      expect(style.color).toBe('#fff');
    });

    it('複数タグは後のタグが優先されること', () => {
      const item = createCalendarItem({ type: 'task', id: '7', title: 'multi-tag', status: 'todo', start, end, tags: ['A', 'B'] });
      const tagStyleMap = {
        'A': { backgroundColor: '#aaaaaa' },
        'B': { backgroundColor: '#bbbbbb' },
      };
      const style = getComputedItemStyle(item, tagStyleMap);
      expect(style.backgroundColor).toBe('#bbbbbb');
    });

    it('マッチしないタグは無視されること', () => {
      const item = createCalendarItem({ type: 'task', id: '8', title: 'no-match', status: 'todo', start, end, tags: ['存在しないタグ'] });
      const tagStyleMap = { '重要': { backgroundColor: '#ea4335' } };
      const style = getComputedItemStyle(item, tagStyleMap);
      expect(style.backgroundColor).toBe('#5B9CF6'); // 型デフォルト
    });
  });

  describe('3. ルールベース', () => {
    it('completed-task ルール: status=done のタスクがグレーアウトされること', () => {
      const item = createCalendarItem({ type: 'task', id: '9', title: 'done', status: 'done', start, end });
      const style = getComputedItemStyle(item);
      expect(style.backgroundColor).toBe('#cccccc');
      expect(style.opacity).toBe('0.6');
    });

    it('overdue-task ルール: 期限超過（status≠done）に赤左ボーダーが付くこと', () => {
      // now より過去の時刻でアイテムを作成
      const pastStart = now.minus({ hours: 3 });
      const pastEnd   = now.minus({ hours: 2 });
      const item = createCalendarItem({ type: 'task', id: '10', title: 'overdue', status: 'todo', start: pastStart, end: pastEnd });
      const style = getComputedItemStyle(item, undefined, now);
      expect(style.borderLeft).toBe('3px solid #E53E3E');
    });

    it('overdue-task ルール: status=done なら期限超過でもボーダーが付かないこと', () => {
      const pastStart = now.minus({ hours: 3 });
      const pastEnd   = now.minus({ hours: 2 });
      const item = createCalendarItem({ type: 'task', id: '11', title: 'done-past', status: 'done', start: pastStart, end: pastEnd });
      const style = getComputedItemStyle(item, undefined, now);
      expect(style.borderLeft).toBeUndefined();
    });

    it('overdue-task ルール: 未来のアイテムにはボーダーが付かないこと', () => {
      const item = createCalendarItem({ type: 'task', id: '12', title: 'future', status: 'todo', start, end });
      // now を過去に設定することで「未来扱い」にする
      const pastNow = now.minus({ hours: 24 });
      const style = getComputedItemStyle(item, undefined, pastNow);
      expect(style.borderLeft).toBeUndefined();
    });
  });

  describe('4. 手動指定（最優先）', () => {
    it('item.style がタグスタイル・ルールより優先されること', () => {
      const item = createCalendarItem({
        type: 'task',
        id: '13',
        title: 'manual',
        status: 'todo',
        start,
        end,
        tags: ['重要'],
        style: { backgroundColor: '#ff00ff', color: '#000' },
      });
      const tagStyleMap = { '重要': { backgroundColor: '#ea4335', color: '#fff' } };
      const style = getComputedItemStyle(item, tagStyleMap);
      expect(style.backgroundColor).toBe('#ff00ff');
      expect(style.color).toBe('#000');
    });
  });

  describe('優先度の総合確認', () => {
    it('型デフォルト → タグ → ルール → 手動 の順で上書きされること', () => {
      // status=todo → 型デフォルトは #5B9CF6
      // タグ '重要' → #ea4335 で上書き
      // ルール: status≠done、未来なのでボーダーなし
      // 手動: fontWeight:'bold' だけ追加（backgroundColor は上書きしない）
      const item = createCalendarItem({
        type: 'task',
        id: '14',
        title: 'priority',
        status: 'todo',
        start,
        end,
        tags: ['重要'],
        style: { fontWeight: 'bold' },
      });
      const tagStyleMap = { '重要': { backgroundColor: '#ea4335' } };
      const style = getComputedItemStyle(item, tagStyleMap);
      expect(style.backgroundColor).toBe('#ea4335'); // タグ（手動で上書きなし）
      expect(style.fontWeight).toBe('bold');          // 手動
    });
  });
});

describe('PRESET_STYLE_RULES', () => {
  it('overdue-task と completed-task の2ルールが定義されていること', () => {
    const ids = PRESET_STYLE_RULES.map(r => r.id);
    expect(ids).toContain('overdue-task');
    expect(ids).toContain('completed-task');
  });
});
