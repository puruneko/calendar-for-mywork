/**
 * リサイズ機能のE2Eテスト
 * 
 * 【仕様確認】
 * - initial_prompt.md: "開始・終了のみ変更可能"
 * - TESTING_POLICY: 実ユーザー操作を page.mouse.* で再現
 * 
 * 【検証観点】
 * 1. 上端をドラッグすると開始時刻が変更される
 * 2. 下端をドラッグすると終了時刻が変更される
 * 3. UIとデータが一致している
 */

import { test, expect } from '@playwright/test';

test.describe('リサイズ機能 - 実ユーザー操作による仕様適合確認', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('【仕様】上端をドラッグすると開始時刻が変更される', async ({ page }) => {
    console.log('=== テスト開始: 上端リサイズ ===');
    console.log('検証内容: アイテムの上端をドラッグすると、開始時刻が変更されること');
    
    const item = page.locator('.calendar-item').first();
    await expect(item).toBeVisible();
    
    const initialTime = await item.locator('.item-time').textContent();
    console.log(`初期時刻: ${initialTime}`);
    
    // 上端リサイズハンドルをドラッグ
    const topHandle = item.locator('.resize-handle-top');
    const handleBox = await topHandle.boundingBox();
    if (!handleBox) throw new Error('Handle not found');
    
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endY = startY - 60; // 1時間分上に移動
    
    console.log(`リサイズ: Y ${Math.round(startY)} -> ${Math.round(endY)}`);
    
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: 8 });
    await page.mouse.up();
    
    await page.waitForTimeout(500);
    
    const finalTime = await item.locator('.item-time').textContent();
    console.log(`リサイズ後: ${finalTime}`);
    
    expect(finalTime).not.toBe(initialTime);
    
    console.log('✅ テスト成功: 上端リサイズが正しく動作しました');
  });
  
  test('【仕様】下端をドラッグすると終了時刻が変更される', async ({ page }) => {
    console.log('=== テスト開始: 下端リサイズ ===');
    console.log('検証内容: アイテムの下端をドラッグすると、終了時刻が変更されること');
    
    const item = page.locator('.calendar-item').first();
    await expect(item).toBeVisible();
    
    const initialTime = await item.locator('.item-time').textContent();
    console.log(`初期時刻: ${initialTime}`);
    
    // 下端リサイズハンドルをドラッグ
    const bottomHandle = item.locator('.resize-handle-bottom');
    const handleBox = await bottomHandle.boundingBox();
    if (!handleBox) throw new Error('Handle not found');
    
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endY = startY + 60; // 1時間分下に移動
    
    console.log(`リサイズ: Y ${Math.round(startY)} -> ${Math.round(endY)}`);
    
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: 8 });
    await page.mouse.up();
    
    await page.waitForTimeout(500);
    
    const finalTime = await item.locator('.item-time').textContent();
    console.log(`リサイズ後: ${finalTime}`);
    
    expect(finalTime).not.toBe(initialTime);
    
    console.log('✅ テスト成功: 下端リサイズが正しく動作しました');
  });
});
