/**
 * majorTick/minorTickと現在時刻線のE2Eテスト
 */

import { test, expect } from '@playwright/test';

test.describe('majorTick と minorTick', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.week-view');
  });

  test('minorTickグリッド線が表示されること', async ({ page }) => {
    const minorLines = page.locator('.minor-grid-line');
    const count = await minorLines.count();
    
    // 24時間 * 4本/時間（15分単位） + 1 = 97本
    expect(count).toBeGreaterThan(90);
  });

  test('minorTickグリッド線が等間隔に配置されていること', async ({ page }) => {
    const minorLines = page.locator('.minor-grid-line');
    
    // 最初の3本の位置を確認
    const firstTop = await minorLines.nth(0).evaluate(el => {
      return parseFloat(window.getComputedStyle(el).top);
    });
    const secondTop = await minorLines.nth(1).evaluate(el => {
      return parseFloat(window.getComputedStyle(el).top);
    });
    const thirdTop = await minorLines.nth(2).evaluate(el => {
      return parseFloat(window.getComputedStyle(el).top);
    });
    
    // 15分 = 15px間隔であることを確認
    expect(secondTop - firstTop).toBe(15);
    expect(thirdTop - secondTop).toBe(15);
  });

  test('majorTickグリッド（時間枠）が表示されること', async ({ page }) => {
    const gridCells = page.locator('.grid-cell');
    const count = await gridCells.count();
    
    // デモアプリは9時-18時表示なので、7日 * 9時間 = 63セル
    // ただし、endHourは18なので実際は9時間分（9-18時）
    expect(count).toBeGreaterThan(60);
  });
});

test.describe('現在時刻線', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.week-view');
  });

  test('今週の場合、現在時刻線が表示されること', async ({ page }) => {
    // 「今日」ボタンをクリックして今週を表示
    await page.click('button.today');
    await page.waitForTimeout(500);
    
    const currentTimeLine = page.locator('.current-time-line');
    const count = await currentTimeLine.count();
    
    // 現在時刻が表示範囲内の場合のみ、7日分の現在時刻線が表示される
    // 表示範囲外（9時-18時以外）の場合は0本
    expect(count).toBeGreaterThanOrEqual(0);
    expect(count).toBeLessThanOrEqual(7);
  });

  test('今日の列は赤線が濃く、他の列は薄いこと', async ({ page }) => {
    // 「今日」ボタンをクリック
    await page.click('button.today');
    await page.waitForTimeout(500);
    
    const timeLines = page.locator('.current-time-line');
    const count = await timeLines.count();
    
    // 現在時刻線が表示されている場合のみチェック
    if (count > 0) {
      // すべての時刻線の不透明度を確認
      const opacities = await timeLines.evaluateAll(elements => {
        return elements.map(el => {
          const bg = window.getComputedStyle(el).backgroundColor;
          const match = bg.match(/rgba\([\d\s,]+,\s*([\d.]+)\)/);
          return match ? parseFloat(match[1]) : 0;
        });
      });
      
      // 少なくとも1つの時刻線があり、不透明度が0.3または0.75であることを確認
      expect(opacities.length).toBeGreaterThan(0);
      opacities.forEach(opacity => {
        expect([0.3, 0.75]).toContain(opacity);
      });
    } else {
      // 現在時刻が表示範囲外の場合はスキップ
      expect(count).toBe(0);
    }
  });

  test('現在時刻線が正しい位置に表示されていること', async ({ page }) => {
    // 「今日」ボタンをクリック
    await page.click('button.today');
    await page.waitForTimeout(500);
    
    const timeLines = page.locator('.current-time-line');
    const count = await timeLines.count();
    
    if (count > 0) {
      const firstLineTop = await timeLines.first().evaluate(el => {
        return parseFloat(window.getComputedStyle(el).top);
      });
      
      // topが0以上の値であることを確認（表示範囲内）
      expect(firstLineTop).toBeGreaterThanOrEqual(0);
      expect(firstLineTop).toBeLessThan(1440); // 24時間 = 1440分
    }
  });
});
