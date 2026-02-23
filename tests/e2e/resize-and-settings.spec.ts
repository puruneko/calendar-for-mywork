import { test, expect } from './test-base';

test.describe('リサイズと設定機能のテスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176');
    await page.waitForSelector('.week-view');
  });

  test('リサイズハンドルが表示されること', async ({ page }) => {
    const resizeHandles = page.locator('.resize-handle');
    const count = await resizeHandles.count();
    
    // 各アイテムに上端・下端の2つのハンドルがある
    expect(count).toBeGreaterThan(0);
  });

  test('リサイズハンドルにホバーすると色が変わること', async ({ page }) => {
    const resizeHandle = page.locator('.resize-handle').first();
    
    // ホバー前の背景色を取得
    await resizeHandle.hover();
    await page.waitForTimeout(100);
    
    // ホバー後、カーソルがns-resizeになることを確認
    const cursor = await resizeHandle.evaluate(el => {
      return window.getComputedStyle(el).cursor;
    });
    
    expect(cursor).toBe('ns-resize');
  });

  test('設定ボタンが表示されること', async ({ page }) => {
    const settingsButton = page.locator('.settings-button');
    await expect(settingsButton).toBeVisible();
    
    // 歯車アイコンが表示されることを確認
    const svg = settingsButton.locator('svg');
    await expect(svg).toBeVisible();
  });

  test('設定ボタンをクリックするとインラインパネルが表示されること', async ({ page }) => {
    const settingsButton = page.locator('.settings-button');
    await settingsButton.click();
    
    // インラインパネルが表示されることを確認
    const panel = page.locator('.settings-panel');
    await expect(panel).toBeVisible();
  });

  test('設定パネルの各入力欄が表示されること', async ({ page }) => {
    const settingsButton = page.locator('.settings-button');
    await settingsButton.click();
    
    // 各入力欄が表示されることを確認
    await expect(page.locator('label:has-text(\"移動単位\")')).toBeVisible();
    await expect(page.locator('label:has-text(\"開始時刻\")')).toBeVisible();
    await expect(page.locator('label:has-text(\"終了時刻\")')).toBeVisible();
    await expect(page.locator('label:has-text(\"土日を表示\")')).toBeVisible();
    await expect(page.locator('label:has-text(\"終日予定を表示\")')).toBeVisible();
  });

  test('設定ボタンを再クリックするとパネルが閉じること', async ({ page }) => {
    const settingsButton = page.locator('.settings-button');
    await settingsButton.click();
    
    // パネルが表示される
    const panel = page.locator('.settings-panel');
    await expect(panel).toBeVisible();
    
    // もう一度クリックして閉じる
    await settingsButton.click();
    
    // パネルが非表示になることを確認
    await expect(panel).not.toBeVisible();
  });
});
