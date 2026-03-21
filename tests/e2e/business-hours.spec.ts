import { test, expect } from '@playwright/test';

/**
 * ビジネスアワー E2E テスト
 *
 * 営業時間外オーバーレイが正しく描画され、設定パネルから変更できることを検証する。
 */

test.describe('ビジネスアワー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.week-view')).toBeVisible();
    // localStorage をクリアして初期状態に戻す
    await page.evaluate(() => localStorage.removeItem('demo-calendar'));
    await page.reload();
    await expect(page.locator('.week-view')).toBeVisible();
  });

  test('デフォルト状態でオーバーレイが描画されること', async ({ page }) => {
    // デフォルト有効なのでオーバーレイが存在するはず
    await expect(page.locator('.bh-overlay').first()).toBeVisible();
  });

  test('営業時間帯に青いボーダーが表示されること', async ({ page }) => {
    await expect(page.locator('.bh-active-border').first()).toBeVisible();
  });

  test('設定パネルに営業時間セクションが表示されること', async ({ page }) => {
    // 設定ボタンを開く
    await page.locator('.settings-button').click();
    await expect(page.locator('.setting-section-header').filter({ hasText: '営業時間' })).toBeVisible();
    await expect(page.locator('text=営業時間を表示する')).toBeVisible();
  });

  test('営業時間を無効にするとオーバーレイが消えること', async ({ page }) => {
    await page.locator('.settings-button').click();
    // 「営業時間を表示する」チェックボックスを OFF にする
    const masterToggle = page.locator('input[type="checkbox"]').filter({ has: page.locator('xpath=following-sibling::text()[normalize-space()="営業時間を表示する"]') }).first();
    // テキスト付きのラベルを探す
    await page.locator('.setting-section-header').filter({ hasText: '営業時間' }).waitFor();
    const toggleLabel = page.locator('.settings-panel-inner label').filter({ hasText: '営業時間を表示する' });
    const toggleCheckbox = toggleLabel.locator('input[type="checkbox"]');
    await toggleCheckbox.uncheck();

    // オーバーレイが消えること
    await expect(page.locator('.bh-overlay')).toHaveCount(0);
    await expect(page.locator('.bh-active-border')).toHaveCount(0);
  });

  test('設定パネルに月〜日の7行が表示されること', async ({ page }) => {
    await page.locator('.settings-button').click();
    await page.locator('.setting-section-header').filter({ hasText: '営業時間' }).waitFor();

    // 月〜日の各曜日行が表示されること
    for (const day of ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日']) {
      await expect(page.locator('.bh-day-label').filter({ hasText: day })).toBeVisible();
    }
  });

  test('月〜金は時刻入力欄が表示されること', async ({ page }) => {
    await page.locator('.settings-button').click();
    await page.locator('.setting-section-header').filter({ hasText: '営業時間' }).waitFor();

    // 時刻入力欄（bh-time-input）が月〜金の5行 × 2 = 10個存在すること
    const timeInputs = page.locator('.bh-time-input');
    await expect(timeInputs).toHaveCount(10);
  });
});
