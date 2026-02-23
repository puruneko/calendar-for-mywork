/**
 * カラム同期E2Eテスト
 * 曜日ヘッダーの各列とカレンダー本体の各列の左端X座標が完全に一致することを検証する。
 * 設定変更（showWeekend, showAllDay等）後も同期が保たれることを確認する。
 */

import { test, expect } from './test-base';

test.describe('MonthView - カラム同期', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // MonthViewに切り替え
    const monthButton = page.locator('button', { hasText: '月' });
    if (await monthButton.count() > 0) {
      await monthButton.click();
    } else {
      // CalendarViewのviewType切り替えボタン
      await page.locator('button[data-view="month"], button:has-text("Month"), label:has-text("月表示")').first().click();
    }
    await page.waitForTimeout(300);
  });

  /**
   * 曜日ヘッダーの各列とgrid-cellの左端X座標が一致することを確認
   */
  test('曜日ヘッダーとgrid-cellの列幅が完全に同期していること', async ({ page }) => {
    console.log('[TEST] 曜日ヘッダーとgrid-cellの列が同期していることを確認');
    console.log('[REASON] weekday-headerとweek-gridは同じscrolling contextに属し、スクロールバー幅を共有する必要がある');

    const weekdayCells = page.locator('.weekday-header .weekday');
    const gridCells = page.locator('.week-grid').first().locator('.grid-cell');

    const weekdayCount = await weekdayCells.count();
    const gridCellCount = await gridCells.count();

    console.log(`[INFO] weekday count: ${weekdayCount}, grid-cell count: ${gridCellCount}`);
    expect(weekdayCount).toBe(gridCellCount);

    // 各列の左端X座標を比較
    for (let i = 0; i < weekdayCount; i++) {
      const weekdayBox = await weekdayCells.nth(i).boundingBox();
      const gridCellBox = await gridCells.nth(i).boundingBox();

      expect(weekdayBox).not.toBeNull();
      expect(gridCellBox).not.toBeNull();

      const diff = Math.abs((weekdayBox!.x) - (gridCellBox!.x));
      console.log(`[INFO] column ${i}: weekday.x=${weekdayBox!.x.toFixed(1)}, grid.x=${gridCellBox!.x.toFixed(1)}, diff=${diff.toFixed(1)}px`);

      // 1px以内の誤差を許容（サブピクセルレンダリング考慮）
      expect(diff).toBeLessThanOrEqual(1);
    }

    console.log('[PASS] 曜日ヘッダーとgrid-cellの列が正しく同期している');
  });

  /**
   * showWeekend=falseに切り替えた後も列同期が保たれることを確認
   */
  test('土日非表示切り替え後も曜日ヘッダーとgrid-cellの列幅が同期していること', async ({ page }) => {
    console.log('[TEST] 土日非表示切り替え後の列同期を確認');
    console.log('[REASON] 5列グリッドへの切り替え後、曜日ヘッダーと本体の列幅が一致する必要がある');

    // 設定パネルを開く
    await page.locator('button.settings-button').click();
    await page.waitForTimeout(200);

    // インラインパネルの「土日を表示」チェックボックス
    const weekendLabel = page.locator('.settings-panel label', { hasText: '土日を表示' });
    const weekendInput = weekendLabel.locator('input[type="checkbox"]');
    await weekendInput.uncheck();
    await page.waitForTimeout(300);

    // パネルを閉じる
    await page.locator('button.settings-button').click();
    await page.waitForTimeout(300);

    // 列同期確認（5列）
    const weekdayCells = page.locator('.weekday-header .weekday');
    const gridCells = page.locator('.week-grid').first().locator('.grid-cell');

    const weekdayCount = await weekdayCells.count();
    expect(weekdayCount).toBe(5); // 土日非表示なので5列

    for (let i = 0; i < weekdayCount; i++) {
      const weekdayBox = await weekdayCells.nth(i).boundingBox();
      const gridCellBox = await gridCells.nth(i).boundingBox();
      const diff = Math.abs((weekdayBox!.x) - (gridCellBox!.x));
      console.log(`[INFO] column ${i}: diff=${diff.toFixed(1)}px`);
      expect(diff).toBeLessThanOrEqual(1);
    }

    console.log('[PASS] 5列表示でも列が正しく同期している');
  });

  /**
   * allday-itemが存在する場合（allday層の高さが変わる場合）も列同期が保たれることを確認
   */
  test('allday-item表示有無に関わらず曜日ヘッダーとgrid-cellの列幅が同期していること', async ({ page }) => {
    console.log('[TEST] allday-item表示切り替え後の列同期を確認');
    console.log('[REASON] allday層の高さ変化が列幅に影響しないことを確認する');

    // 設定パネルを開く
    await page.locator('button.settings-button').click();
    await page.waitForTimeout(200);

    // 終日タスク非表示に切り替え
    const alldayLabel = page.locator('.settings-panel label', { hasText: '終日タスク' });
    const alldayInput = alldayLabel.locator('input[type="checkbox"]');
    await alldayInput.uncheck();
    await page.waitForTimeout(300);

    // パネルを閉じる
    await page.locator('button.settings-button').click();
    await page.waitForTimeout(300);

    // 列同期確認
    const weekdayCells = page.locator('.weekday-header .weekday');
    const gridCells = page.locator('.week-grid').first().locator('.grid-cell');
    const weekdayCount = await weekdayCells.count();

    for (let i = 0; i < weekdayCount; i++) {
      const weekdayBox = await weekdayCells.nth(i).boundingBox();
      const gridCellBox = await gridCells.nth(i).boundingBox();
      const diff = Math.abs((weekdayBox!.x) - (gridCellBox!.x));
      expect(diff).toBeLessThanOrEqual(1);
    }

    console.log('[PASS] 終日タスク非表示でも列が正しく同期している');
  });

  /**
   * スクロールバーが表示されている場合も列同期が保たれることを確認
   */
  test('スクロールバー表示時も曜日ヘッダーとgrid-cellの列幅が同期していること', async ({ page }) => {
    console.log('[TEST] スクロールバー表示時の列同期を確認');
    console.log('[REASON] calendar-contentにスクロールバーが出ても曜日ヘッダーと列幅が一致する必要がある');

    // ウィンドウを小さくしてスクロールバーを強制表示
    await page.setViewportSize({ width: 800, height: 400 });
    await page.waitForTimeout(300);

    const weekdayCells = page.locator('.weekday-header .weekday');
    const gridCells = page.locator('.week-grid').first().locator('.grid-cell');
    const weekdayCount = await weekdayCells.count();

    for (let i = 0; i < weekdayCount; i++) {
      const weekdayBox = await weekdayCells.nth(i).boundingBox();
      const gridCellBox = await gridCells.nth(i).boundingBox();

      expect(weekdayBox).not.toBeNull();
      expect(gridCellBox).not.toBeNull();

      const diff = Math.abs((weekdayBox!.x) - (gridCellBox!.x));
      console.log(`[INFO] column ${i}: weekday.x=${weekdayBox!.x.toFixed(1)}, grid.x=${gridCellBox!.x.toFixed(1)}, diff=${diff.toFixed(1)}px`);
      expect(diff).toBeLessThanOrEqual(1);
    }

    console.log('[PASS] スクロールバー表示時も列が正しく同期している');
  });
});
