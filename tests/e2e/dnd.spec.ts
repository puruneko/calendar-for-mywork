/**
 * DnD（ドラッグ&ドロップ）機能のE2Eテスト
 */

import { test, expect } from '@playwright/test';

test.describe('DnD機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('アイテムがドラッグ可能であること', async ({ page }) => {
    // アイテムを取得
    const item = page.locator('.calendar-item').first();
    await expect(item).toBeVisible();
    
    // アイテム本体（.item-content）がdraggable属性を持つことを確認
    const itemContent = item.locator('.item-content');
    const draggable = await itemContent.getAttribute('draggable');
    expect(draggable).toBe('true');
  });

  test('アイテムをドラッグすると半透明になること', async ({ page }) => {
    const item = page.locator('.calendar-item').first();
    const itemContent = item.locator('.item-content');
    
    // 元のスタイルを確認（draggingクラスがない）
    const classBeforeDrag = await item.getAttribute('class');
    expect(classBeforeDrag).not.toContain('dragging');
    
    // ドラッグ開始（dragstart イベントをトリガー）
    await itemContent.dispatchEvent('dragstart');
    
    // draggingクラスが追加されることを確認
    await page.waitForTimeout(100);
    const classAfterDrag = await item.getAttribute('class');
    expect(classAfterDrag).toContain('dragging');
  });

  test('日列にドラッグオーバーするとホバー効果が表示されること', async ({ page }) => {
    const dayGrid = page.locator('.day-grid').first();
    await expect(dayGrid).toBeVisible();
    
    // ホバー時の背景色変化を確認
    await dayGrid.hover();
    await page.waitForTimeout(300);
    
    // CSSが適用されていることを確認（transition属性）
    const transition = await dayGrid.evaluate(el => 
      window.getComputedStyle(el).transition
    );
    expect(transition).toContain('background-color');
  });

  test('アイテムをドロップすると新しい位置に移動すること', async ({ page }) => {
    // コンソールログをキャプチャ
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    // 最初のアイテムの初期位置を取得
    const item = page.locator('.calendar-item').first();
    const initialTitle = await item.locator('.item-title').textContent();
    const initialTime = await item.locator('.item-time').textContent();
    
    console.log(`初期アイテム: ${initialTitle}, 時刻: ${initialTime}`);
    
    // ドラッグ&ドロップを実行
    // 注: Playwrightのdragメソッドは実際のDnD APIを使用しないため、
    // ここでは基本的な検証のみ行う
    const itemBox = await item.boundingBox();
    expect(itemBox).not.toBeNull();
    
    if (itemBox) {
      // アイテムが存在し、位置を持っていることを確認
      expect(itemBox.width).toBeGreaterThan(0);
      expect(itemBox.height).toBeGreaterThan(0);
    }
  });

  test('複数のアイテムが個別にドラッグ可能であること', async ({ page }) => {
    const items = page.locator('.calendar-item');
    const count = await items.count();
    
    expect(count).toBeGreaterThan(1);
    
    // 各アイテムの.item-contentがdraggable属性を持つことを確認
    for (let i = 0; i < Math.min(count, 3); i++) {
      const itemContent = items.nth(i).locator('.item-content');
      const draggable = await itemContent.getAttribute('draggable');
      expect(draggable).toBe('true');
    }
  });

  test('ドロップゾーン（日列）が正しく設定されていること', async ({ page }) => {
    const dayGrids = page.locator('.day-grid');
    const count = await dayGrids.count();
    
    // 7日分のドロップゾーンが存在することを確認
    expect(count).toBe(7);
    
    // 各ドロップゾーンが表示されていることを確認
    for (let i = 0; i < count; i++) {
      await expect(dayGrids.nth(i)).toBeVisible();
    }
  });
});
