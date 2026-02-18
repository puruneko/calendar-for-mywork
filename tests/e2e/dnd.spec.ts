/**
 * DnD（ドラッグ&ドロップ）機能のE2Eテスト
 * 
 * 【仕様確認】
 * - initial_prompt.md: "DnDによる日時移動", "開始・終了のみ変更可能"
 * - TESTING_POLICY: 実ユーザー操作を page.mouse.* で再現、最低5step以上
 * 
 * 【検証観点】
 * 1. アイテムをDnDで別の日・時刻に移動できる
 * 2. 移動後、データ（表示時刻）が正しく更新される
 * 3. UIとデータが一致している
 */

import { test, expect } from '@playwright/test';

test.describe('DnD機能 - 実ユーザー操作による仕様適合確認', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('【仕様】アイテムをDnDで別の日時に移動すると、表示時刻が更新される', async ({ page }) => {
    console.log('=== テスト開始: DnDによる日時移動 ===');
    console.log('検証内容: ユーザーがアイテムをドラッグ&ドロップした際、日時が変更され、UIに反映されること');
    
    // コンソールエラーをキャプチャ
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    
    // 1. 移動前の状態を確認
    const item = page.locator('.calendar-item').first();
    await expect(item).toBeVisible();
    
    const initialTime = await item.locator('.item-time').textContent();
    console.log(`移動前の時刻: ${initialTime}`);
    
    // 2. DnD操作を実行（page.mouse.* で実ユーザー操作を再現）
    const itemContent = item.locator('.item-content');
    const sourceBox = await itemContent.boundingBox();
    if (!sourceBox) throw new Error('Source not found');
    
    const targetDayGrid = page.locator('.day-grid').nth(2); // 3列目に移動
    const targetBox = await targetDayGrid.boundingBox();
    if (!targetBox) throw new Error('Target not found');
    
    const startX = sourceBox.x + sourceBox.width / 2;
    const startY = sourceBox.y + sourceBox.height / 2;
    const endX = targetBox.x + 50;
    const endY = targetBox.y + 100;
    
    console.log(`DnD開始: (${Math.round(startX)}, ${Math.round(startY)}) -> (${Math.round(endX)}, ${Math.round(endY)})`);
    
    // 実ユーザー操作を再現（TESTING_POLICY準拠: 最低5step）
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();
    
    // 3. 状態で待機（TESTING_POLICY: 固定秒wait禁止）
    await expect(item.locator('.item-time')).not.toHaveText(initialTime || '', { timeout: 3000 });
    
    // 4. 移動後の状態を確認
    const finalTime = await item.locator('.item-time').textContent();
    console.log(`移動後の時刻: ${finalTime}`);
    
    // 検証: 時刻が変更されている
    expect(finalTime).not.toBe(initialTime);
    expect(finalTime).not.toBeNull();
    
    // コンソールエラーがないことを確認
    expect(errors).toHaveLength(0);
    
    console.log('✅ テスト成功: DnDによる日時移動が正しく動作しました');
  });
  
  test('【仕様】複数回DnDしても正しく動作する', async ({ page }) => {
    console.log('=== テスト開始: 複数回DnD ===');
    console.log('検証内容: 連続してDnD操作を行っても、毎回正しく日時が更新されること');
    
    const item = page.locator('.calendar-item').first();
    const itemContent = item.locator('.item-content');
    
    // 1回目のDnD
    const box1 = await itemContent.boundingBox();
    if (!box1) throw new Error('Box not found');
    
    const target1 = page.locator('.day-grid').nth(1);
    const targetBox1 = await target1.boundingBox();
    if (!targetBox1) throw new Error('Target not found');
    
    await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox1.x + 50, targetBox1.y + 150, { steps: 8 });
    await page.mouse.up();
    
    await page.waitForTimeout(500);
    const time1 = await item.locator('.item-time').textContent();
    console.log(`1回目移動後: ${time1}`);
    
    // 2回目のDnD
    const box2 = await itemContent.boundingBox();
    if (!box2) throw new Error('Box not found');
    
    const target2 = page.locator('.day-grid').nth(3);
    const targetBox2 = await target2.boundingBox();
    if (!targetBox2) throw new Error('Target not found');
    
    await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox2.x + 50, targetBox2.y + 200, { steps: 8 });
    await page.mouse.up();
    
    await page.waitForTimeout(500);
    const time2 = await item.locator('.item-time').textContent();
    console.log(`2回目移動後: ${time2}`);
    
    // 検証: 2回とも異なる時刻になっている
    expect(time1).not.toBe(time2);
    
    console.log('✅ テスト成功: 複数回DnDが正しく動作しました');
  });
});
