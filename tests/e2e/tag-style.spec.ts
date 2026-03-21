import { test, expect } from './test-base';

/**
 * タグベーススタイル E2E テスト
 *
 * タグに応じたスタイルが自動適用され、型デフォルト色が正しく描画されることを検証する。
 */

test.describe('タグベーススタイル', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.week-view');
    await page.evaluate(() => localStorage.removeItem('demo-calendar'));
    await page.reload();
    await page.waitForSelector('.week-view');
  });

  test('「重要」タグ付きアイテムに赤背景（#ea4335 → rgb(234, 67, 53)）が適用されること', async ({ page }) => {
    // デモデータ id=1: プロジェクト企画書作成（tags: ['重要']）
    const item = page.locator('.calendar-item').filter({ hasText: 'プロジェクト企画書作成' }).first();
    await expect(item).toBeAttached();

    // ブラウザが hex → rgb に正規化するため rgb 形式で確認
    const styleAttr = await item.getAttribute('style');
    expect(styleAttr).toContain('rgb(234, 67, 53)'); // #ea4335
  });

  test('タグなしタスク（todo）に型デフォルト色（#5B9CF6 → rgb(91, 156, 246)）が適用されること', async ({ page }) => {
    // デモデータ id=2: コードレビュー（tags なし、status=todo）
    const item = page.locator('.calendar-item').filter({ hasText: 'コードレビュー' }).first();
    await expect(item).toBeAttached();

    const styleAttr = await item.getAttribute('style');
    expect(styleAttr).toContain('rgb(91, 156, 246)'); // #5B9CF6
  });

  test('appointment に型デフォルト色（#6EBD8F → rgb(110, 189, 143)）が適用されること', async ({ page }) => {
    // デモデータ id=3: チームミーティング（appointment）
    const item = page.locator('.calendar-item').filter({ hasText: 'チームミーティング' }).first();
    await expect(item).toBeAttached();

    const styleAttr = await item.getAttribute('style');
    expect(styleAttr).toContain('rgb(110, 189, 143)'); // #6EBD8F
  });

  test('doing タスクに型デフォルト色（#FFA94D → rgb(255, 169, 77)）が適用されること', async ({ page }) => {
    // デモデータ id=5: バグ修正#1234（status=doing、tags なし）
    const item = page.locator('.calendar-item').filter({ hasText: 'バグ修正#1234' }).first();
    await expect(item).toBeAttached();

    const styleAttr = await item.getAttribute('style');
    expect(styleAttr).toContain('rgb(255, 169, 77)'); // #FFA94D
  });
});
