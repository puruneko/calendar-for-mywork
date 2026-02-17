/**
 * カレンダーのE2Eテスト
 */

import { test, expect } from '@playwright/test';

test.describe('Calendar WeekView', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('カレンダーが正しく表示されること', async ({ page }) => {
    // ヘッダーが表示されていること
    await expect(page.locator('.app-header h1')).toContainText('Calendar Library Demo');
    
    // カレンダーが表示されていること
    await expect(page.locator('.week-view')).toBeVisible();
    
    // 週のヘッダーが表示されていること
    await expect(page.locator('.week-header')).toBeVisible();
  });

  test('ナビゲーションボタンが機能すること', async ({ page }) => {
    // 「今日」ボタンが表示されていること
    const todayButton = page.locator('button.today');
    await expect(todayButton).toBeVisible();
    await expect(todayButton).toContainText('今日');
    
    // 前週・次週ボタンが表示されていること
    const navButtons = page.locator('.nav-button');
    await expect(navButtons).toHaveCount(3);
  });

  test('7日分の曜日列が表示されること', async ({ page }) => {
    const dayColumns = page.locator('.day-column');
    await expect(dayColumns).toHaveCount(7);
    
    // 各列にヘッダーが表示されていること
    const dayHeaders = page.locator('.day-header');
    await expect(dayHeaders).toHaveCount(7);
  });

  test('時刻列が表示されること', async ({ page }) => {
    const timeColumn = page.locator('.time-column');
    await expect(timeColumn).toBeVisible();
    
    // 時刻スロットが表示されていること
    const timeSlots = page.locator('.time-slot');
    await expect(timeSlots.first()).toBeVisible();
  });

  test('カレンダーアイテムが表示されること', async ({ page }) => {
    // アイテムが表示されていることを確認
    const items = page.locator('.calendar-item');
    const itemCount = await items.count();
    
    expect(itemCount).toBeGreaterThan(0);
  });

  test('Taskアイテムが正しいスタイルで表示されること', async ({ page }) => {
    // Task (doing) が存在すること
    const doingTask = page.locator('.task.task-doing').first();
    await expect(doingTask).toBeVisible();
    
    // タイトルが表示されていること
    await expect(doingTask.locator('.item-title')).toBeVisible();
  });

  test('Appointmentアイテムが表示されること', async ({ page }) => {
    const appointments = page.locator('.appointment');
    const count = await appointments.count();
    
    expect(count).toBeGreaterThan(0);
  });
});
