/**
 * laneLayoutAlgorithm.ts の単体テスト
 */

import { describe, it, expect } from 'vitest';
import { layoutWeekAllDay, type WeekContext, type AllDayItem, type LaneLayout } from '../../src/lib/utils/laneLayoutAlgorithm';

describe('laneLayoutAlgorithm', () => {
  describe('layoutWeekAllDay', () => {
    describe('正確性テスト', () => {
      it('for_fat_promptの例題を正しく処理すること', () => {
        // weekStart = 2026-02-16 (月曜日)
        // A: 16–20 (月-木、4日間) → Lane 0
        // B: 17–19 (火-水、2日間) → Lane 1
        // C: 19–21 (木-金、2日間) → Lane 1 (Bの後に配置可能)
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [
            { id: 'A', dateRange: { start: '2026-02-16', end: '2026-02-20' } },
            { id: 'B', dateRange: { start: '2026-02-17', end: '2026-02-19' } },
            { id: 'C', dateRange: { start: '2026-02-19', end: '2026-02-21' } },
          ],
        };

        const result = layoutWeekAllDay(context);

        expect(result.laneCount).toBe(2);
        expect(result.placements).toHaveLength(3);

        // A: Lane 0, startIndex=0, span=4
        const placementA = result.placements.find(p => p.id === 'A');
        expect(placementA).toEqual({
          id: 'A',
          lane: 0,
          startIndex: 0,
          span: 4,
        });

        // B: Lane 1, startIndex=1, span=2
        const placementB = result.placements.find(p => p.id === 'B');
        expect(placementB).toEqual({
          id: 'B',
          lane: 1,
          startIndex: 1,
          span: 2,
        });

        // C: Lane 1, startIndex=3, span=2
        const placementC = result.placements.find(p => p.id === 'C');
        expect(placementC).toEqual({
          id: 'C',
          lane: 1,
          startIndex: 3,
          span: 2,
        });
      });

      it('単一日アイテム（endDateがundefined）を正しく処理すること', () => {
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [
            { id: 'single', dateRange: { start: '2026-02-17' } }, // endなし = 単日
          ],
        };

        const result = layoutWeekAllDay(context);

        expect(result.laneCount).toBe(1);
        expect(result.placements).toHaveLength(1);
        expect(result.placements[0]).toEqual({
          id: 'single',
          lane: 0,
          startIndex: 1, // 火曜日
          span: 1,
        });
      });

      it('空のアイテムリストでlaneCount=0を返すこと', () => {
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [],
        };

        const result = layoutWeekAllDay(context);

        expect(result.laneCount).toBe(0);
        expect(result.placements).toHaveLength(0);
      });

      it('週をまたぐアイテムを正しくクランプすること', () => {
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [
            // 週の前から始まるアイテム
            { id: 'before', dateRange: { start: '2026-02-14', end: '2026-02-18' } },
            // 週の後まで続くアイテム
            { id: 'after', dateRange: { start: '2026-02-20', end: '2026-02-25' } },
            // 週全体をカバーするアイテム
            { id: 'full', dateRange: { start: '2026-02-10', end: '2026-02-28' } },
          ],
        };

        const result = layoutWeekAllDay(context);

        // before: 週の前から始まる → startIndex=0にクランプ
        const before = result.placements.find(p => p.id === 'before');
        expect(before?.startIndex).toBe(0);
        expect(before?.span).toBe(2); // 月-火

        // after: 週の後まで続く → endIndex=7にクランプ
        const after = result.placements.find(p => p.id === 'after');
        expect(after?.startIndex).toBe(4); // 金曜日
        expect(after?.span).toBe(3); // 金-日

        // full: 週全体をカバー
        const full = result.placements.find(p => p.id === 'full');
        expect(full?.startIndex).toBe(0);
        expect(full?.span).toBe(7);
      });

      it('週の範囲外のアイテムを除外すること', () => {
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [
            // 完全に週の前
            { id: 'before-week', dateRange: { start: '2026-02-10', end: '2026-02-15' } },
            // 完全に週の後
            { id: 'after-week', dateRange: { start: '2026-02-23', end: '2026-02-28' } },
            // 週内のアイテム
            { id: 'in-week', dateRange: { start: '2026-02-17', end: '2026-02-19' } },
          ],
        };

        const result = layoutWeekAllDay(context);

        expect(result.placements).toHaveLength(1);
        expect(result.placements[0].id).toBe('in-week');
      });
    });

    describe('決定論性テスト', () => {
      it('同じ入力で複数回呼び出しても同一の出力を返すこと', () => {
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [
            { id: 'A', dateRange: { start: '2026-02-16', end: '2026-02-20' } },
            { id: 'B', dateRange: { start: '2026-02-17', end: '2026-02-19' } },
            { id: 'C', dateRange: { start: '2026-02-19', end: '2026-02-21' } },
          ],
        };

        const result1 = layoutWeekAllDay(context);
        const result2 = layoutWeekAllDay(context);
        const result3 = layoutWeekAllDay(context);

        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);
      });

      it('アイテムの入力順序を変えても同じレイアウトになること', () => {
        const items: AllDayItem[] = [
          { id: 'A', dateRange: { start: '2026-02-16', end: '2026-02-20' } },
          { id: 'B', dateRange: { start: '2026-02-17', end: '2026-02-19' } },
          { id: 'C', dateRange: { start: '2026-02-19', end: '2026-02-21' } },
        ];

        const context1: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [...items],
        };

        const context2: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [items[2], items[0], items[1]], // 順序を変更
        };

        const context3: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [items[1], items[2], items[0]], // 別の順序
        };

        const result1 = layoutWeekAllDay(context1);
        const result2 = layoutWeekAllDay(context2);
        const result3 = layoutWeekAllDay(context3);

        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);
      });
    });

    describe('境界値テスト', () => {
      it('週の開始日ぴったりに始まるアイテムを処理できること', () => {
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [
            { id: 'exact-start', dateRange: { start: '2026-02-16', end: '2026-02-18' } },
          ],
        };

        const result = layoutWeekAllDay(context);

        expect(result.placements[0].startIndex).toBe(0);
        expect(result.placements[0].span).toBe(2);
      });

      it('週の終了日ぴったりに終わるアイテムを処理できること', () => {
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [
            { id: 'exact-end', dateRange: { start: '2026-02-21', end: '2026-02-23' } },
          ],
        };

        const result = layoutWeekAllDay(context);

        expect(result.placements[0].startIndex).toBe(5); // 土曜日
        expect(result.placements[0].span).toBe(2); // 土-日
      });

      it('週全体をカバーするアイテム（span=7）を処理できること', () => {
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [
            { id: 'full-week', dateRange: { start: '2026-02-16', end: '2026-02-23' } },
          ],
        };

        const result = layoutWeekAllDay(context);

        expect(result.placements[0].startIndex).toBe(0);
        expect(result.placements[0].span).toBe(7);
      });
    });

    describe('ソートルールテスト', () => {
      it('startIndexが小さい順に処理されること', () => {
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [
            { id: 'Wed', dateRange: { start: '2026-02-18' } }, // 水曜
            { id: 'Mon', dateRange: { start: '2026-02-16' } }, // 月曜
            { id: 'Fri', dateRange: { start: '2026-02-20' } }, // 金曜
          ],
        };

        const result = layoutWeekAllDay(context);

        // 全て同じレーンに配置される（重ならない）
        expect(result.laneCount).toBe(1);
        expect(result.placements[0].id).toBe('Mon');
        expect(result.placements[1].id).toBe('Wed');
        expect(result.placements[2].id).toBe('Fri');
      });

      it('startIndexが同じ場合、spanが大きい順（DESC）に処理されること', () => {
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [
            { id: 'short', dateRange: { start: '2026-02-16', end: '2026-02-17' } }, // span=1
            { id: 'long', dateRange: { start: '2026-02-16', end: '2026-02-20' } },  // span=4
            { id: 'medium', dateRange: { start: '2026-02-16', end: '2026-02-18' } }, // span=2
          ],
        };

        const result = layoutWeekAllDay(context);

        // longが最初のレーン、medium/shortは別レーン
        const longPlacement = result.placements.find(p => p.id === 'long');
        expect(longPlacement?.lane).toBe(0);
      });

      it('startIndexとspanが同じ場合、idのアルファベット順（ASC）に処理されること', () => {
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [
            { id: 'C', dateRange: { start: '2026-02-16', end: '2026-02-18' } },
            { id: 'A', dateRange: { start: '2026-02-16', end: '2026-02-18' } },
            { id: 'B', dateRange: { start: '2026-02-16', end: '2026-02-18' } },
          ],
        };

        const result = layoutWeekAllDay(context);

        // A, B, Cの順に別レーンに配置される
        expect(result.placements[0].id).toBe('A');
        expect(result.placements[1].id).toBe('B');
        expect(result.placements[2].id).toBe('C');
      });
    });

    describe('レーン割り当てテスト', () => {
      it('重ならないアイテムを同じレーンに配置すること', () => {
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [
            { id: '1', dateRange: { start: '2026-02-16', end: '2026-02-17' } }, // 月
            { id: '2', dateRange: { start: '2026-02-17', end: '2026-02-18' } }, // 火
            { id: '3', dateRange: { start: '2026-02-18', end: '2026-02-19' } }, // 水
          ],
        };

        const result = layoutWeekAllDay(context);

        expect(result.laneCount).toBe(1);
        expect(result.placements[0].lane).toBe(0);
        expect(result.placements[1].lane).toBe(0);
        expect(result.placements[2].lane).toBe(0);
      });

      it('重なるアイテムを別レーンに配置すること', () => {
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [
            { id: '1', dateRange: { start: '2026-02-16', end: '2026-02-18' } }, // 月-火
            { id: '2', dateRange: { start: '2026-02-17', end: '2026-02-19' } }, // 火-水
          ],
        };

        const result = layoutWeekAllDay(context);

        expect(result.laneCount).toBe(2);
        expect(result.placements[0].lane).toBe(0);
        expect(result.placements[1].lane).toBe(1);
      });

      it('複雑な重なりパターンで最小レーン数を使用すること', () => {
        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items: [
            { id: 'A', dateRange: { start: '2026-02-16', end: '2026-02-18' } }, // 月-火
            { id: 'B', dateRange: { start: '2026-02-17', end: '2026-02-19' } }, // 火-水
            { id: 'C', dateRange: { start: '2026-02-18', end: '2026-02-20' } }, // 水-木
            { id: 'D', dateRange: { start: '2026-02-19', end: '2026-02-21' } }, // 木-金
          ],
        };

        const result = layoutWeekAllDay(context);

        // A -> Lane 0
        // B -> Lane 1 (Aと重なる)
        // C -> Lane 0 (Aの後に配置可能)
        // D -> Lane 1 (Bの後、Cと重なる)
        expect(result.laneCount).toBe(2);

        const placementA = result.placements.find(p => p.id === 'A');
        const placementB = result.placements.find(p => p.id === 'B');
        const placementC = result.placements.find(p => p.id === 'C');
        const placementD = result.placements.find(p => p.id === 'D');

        expect(placementA?.lane).toBe(0);
        expect(placementB?.lane).toBe(1);
        expect(placementC?.lane).toBe(0);
        expect(placementD?.lane).toBe(1);
      });
    });

    describe('パフォーマンステスト', () => {
      it('100個のアイテムを効率的に処理できること', () => {
        const items: AllDayItem[] = [];
        for (let i = 0; i < 100; i++) {
          const startDay = 16 + (i % 7);
          const endDay = startDay + 1 + (i % 3);
          items.push({
            id: `item-${i}`,
            dateRange: {
              start: `2026-02-${startDay}`,
              end: `2026-02-${Math.min(endDay, 23)}`,
            },
          });
        }

        const context: WeekContext = {
          weekStart: '2026-02-16',
          weekEnd: '2026-02-23',
          items,
        };

        const startTime = performance.now();
        const result = layoutWeekAllDay(context);
        const endTime = performance.now();

        expect(result.placements.length).toBeGreaterThan(0);
        expect(endTime - startTime).toBeLessThan(100); // 100ms以内
      });
    });
  });
});
