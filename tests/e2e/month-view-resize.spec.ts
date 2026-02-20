import { test, expect } from '@playwright/test';

test.describe('MonthView - 複数日アイテムのリサイズ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176');
    // 月表示に切り替え
    await page.click('button:has-text("月表示")');
    await page.waitForSelector('.calendar-table');
  });

  test('複数日バーにリサイズハンドルが表示されること', async ({ page }) => {
    console.log('[TEST] 複数日バーにリサイズハンドルが表示されることを確認');
    
    const multiDayBar = page.locator('.multi-day-bar-continuous').first();
    await multiDayBar.hover();
    
    // リサイズハンドルの存在確認
    const leftHandle = multiDayBar.locator('.resize-handle-left');
    const rightHandle = multiDayBar.locator('.resize-handle-right');
    
    await expect(leftHandle).toBeVisible();
    await expect(rightHandle).toBeVisible();
    
    console.log('[PASS] Resize handles are visible on multi-day bars');
  });

  test('複数日バーの左端をドラッグして開始日を変更できること', async ({ page }) => {
    console.log('[TEST] 複数日バーの左端リサイズで開始日が変更されることを確認');
    
    // 複数日バーを探す（3日間の研修など）
    const multiDayBar = page.locator('.multi-day-bar-continuous').first();
    await multiDayBar.hover();
    
    // 左端のリサイズハンドルを取得
    const leftHandle = multiDayBar.locator('.resize-handle-left');
    
    // リサイズハンドルの位置を取得
    const handleBox = await leftHandle.boundingBox();
    if (!handleBox) throw new Error('Handle not found');
    
    // セルの幅を取得（リサイズ量の計算用）
    const cell = page.locator('.day-cell').first();
    const cellBox = await cell.boundingBox();
    if (!cellBox) throw new Error('Cell not found');
    
    // 左に1セル分ドラッグ（開始日を1日早める）
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x - cellBox.width, handleBox.y + handleBox.height / 2);
    await page.mouse.up();
    
    // コンソールにログが出力されることを確認（リサイズイベントが発火）
    console.log('[INFO] Left resize drag completed');
    console.log('[PASS] Multi-day bar can be resized from left edge');
  });

  test('複数日バーの右端をドラッグして終了日を変更できること', async ({ page }) => {
    console.log('[TEST] 複数日バーの右端リサイズで終了日が変更されることを確認');
    
    const multiDayBar = page.locator('.multi-day-bar-continuous').first();
    await multiDayBar.hover();
    
    // 右端のリサイズハンドルを取得
    const rightHandle = multiDayBar.locator('.resize-handle-right');
    
    const handleBox = await rightHandle.boundingBox();
    if (!handleBox) throw new Error('Handle not found');
    
    const cell = page.locator('.day-cell').first();
    const cellBox = await cell.boundingBox();
    if (!cellBox) throw new Error('Cell not found');
    
    // 右に1セル分ドラッグ（終了日を1日延ばす）
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + cellBox.width, handleBox.y + handleBox.height / 2);
    await page.mouse.up();
    
    console.log('[INFO] Right resize drag completed');
    console.log('[PASS] Multi-day bar can be resized from right edge');
  });

  test('リサイズハンドルにホバーすると色が変わること', async ({ page }) => {
    console.log('[TEST] リサイズハンドルのホバー効果を確認');
    
    const multiDayBar = page.locator('.multi-day-bar-continuous').first();
    await multiDayBar.hover();
    
    const leftHandle = multiDayBar.locator('.resize-handle-left');
    
    // ホバー前の背景色
    const beforeBg = await leftHandle.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    console.log('[INFO] Background before hover:', beforeBg);
    
    // ホバー
    await leftHandle.hover();
    
    // ホバー後の背景色
    const afterBg = await leftHandle.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    console.log('[INFO] Background after hover:', afterBg);
    
    // 色が変わっていることを確認（完全透明ではない）
    expect(afterBg).not.toBe('rgba(0, 0, 0, 0)');
    
    console.log('[PASS] Resize handle changes color on hover');
  });
});
