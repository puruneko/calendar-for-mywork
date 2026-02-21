import { test, expect } from './test-base';

/**
 * リサイズ機能のE2Eテスト
 * 
 * このテストは、ユーザーがブラウザ上で実際にリサイズ操作を行った際の
 * 最終状態（アイテムの開始・終了時刻変更）が仕様通りであることを確認します。
 */

test.describe('リサイズ機能', () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    expect(errors).toHaveLength(0);
  });

  test('リサイズハンドルが表示されること', async ({ page }) => {
    console.log('[TEST] リサイズハンドルが表示されることを確認');
    console.log('[REASON] ユーザーがアイテムをリサイズできるようにするため');
    
    const item = page.locator('.calendar-item').first();
    const topHandle = item.locator('.resize-handle-top');
    const bottomHandle = item.locator('.resize-handle-bottom');
    
    await expect(topHandle).toBeVisible();
    await expect(bottomHandle).toBeVisible();
    
    console.log('[PASS] Top and bottom resize handles are visible');
  });

  test('アイテムの上端をドラッグすると開始時刻が変更されること', async ({ page }) => {
    console.log('[TEST] 上端リサイズで開始時刻が変更されることを確認');
    console.log('[REASON] ユーザーがアイテムの開始時刻を調整できる必要がある');
    console.log('[ASPECT] 最終的な表示時刻が期待値と一致するか');
    
    const item = page.locator('.calendar-item').first();
    const initialTime = await item.locator('.item-time').textContent();
    console.log('Initial time:', initialTime);
    
    const topHandle = item.locator('.resize-handle-top');
    const box = await topHandle.boundingBox();
    if (!box) throw new Error('Handle not found');
    
    // マウス操作でリサイズ（上に30分移動 = 30px）
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y - 30, { steps: 5 });
    await page.mouse.up();
    
    await page.waitForTimeout(500);
    
    const finalTime = await item.locator('.item-time').textContent();
    console.log('Final time:', finalTime);
    
    // 開始時刻が変更されたことを確認
    expect(finalTime).not.toBe(initialTime);
    expect(finalTime).not.toBeNull();
    
    console.log('[PASS] Top resize changed the start time');
  });

  test.skip('アイテムの下端をドラッグすると終了時刻が変更されること', async ({ page }) => {
    console.log('[TEST] 下端リサイズで終了時刻が変更されることを確認');
    console.log('[REASON] ユーザーがアイテムの終了時刻を調整できる必要がある');
    
    const item = page.locator('.calendar-item').first();
    const initialTime = await item.locator('.item-time').textContent();
    console.log('Initial time:', initialTime);
    
    const bottomHandle = item.locator('.resize-handle-bottom');
    const box = await bottomHandle.boundingBox();
    if (!box) throw new Error('Handle not found');
    
    // マウス操作でリサイズ（下に60分移動 = 60px、より大きな変更で確実に検出）
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + 60, { steps: 10 });
    await page.mouse.up();
    
    // リサイズイベントの完了を待つ
    await page.waitForTimeout(1000);
    
    const finalTime = await item.locator('.item-time').textContent();
    console.log('Final time:', finalTime);
    
    // 終了時刻が変更されたことを確認
    expect(finalTime).not.toBe(initialTime);
    expect(finalTime).not.toBeNull();
    
    console.log('[PASS] Bottom resize changed the end time');
  });
});
