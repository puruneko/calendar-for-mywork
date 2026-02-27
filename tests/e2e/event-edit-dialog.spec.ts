import { test, expect } from '@playwright/test';

/**
 * Event Edit Dialog E2E テスト
 *
 * カレンダーアイテムをダブルクリックして編集ダイアログが開き、
 * 各フィールドの編集・保存・削除・バリデーションが正しく動作することを検証する。
 */

test.describe('イベント編集ダイアログ', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // WeekView が描画されるまで待機
    await expect(page.locator('.week-view')).toBeVisible();
  });

  test('アイテムをダブルクリックするとダイアログが開くこと', async ({ page }) => {
    // 「カスタム: 赤背景」アイテムをダブルクリック
    const item = page.locator('.item-content').filter({ hasText: 'カスタム: 赤背景' }).first();
    await item.dblclick();

    // ダイアログが表示されること
    await expect(page.locator('.dialog')).toBeVisible();
    // タイトル入力欄に「カスタム: 赤背景」が入力されていること
    await expect(page.locator('.title-input')).toHaveValue('カスタム: 赤背景');
  });

  test('Escapeキーでダイアログが閉じること', async ({ page }) => {
    const item = page.locator('.item-content').filter({ hasText: 'カスタム: 赤背景' }).first();
    await item.dblclick();
    await expect(page.locator('.dialog')).toBeVisible();

    // backdrop に keydown を直接ディスパッチして閉じる
    await page.locator('.dialog-backdrop').dispatchEvent('keydown', { key: 'Escape', bubbles: true });
    await expect(page.locator('.dialog')).not.toBeVisible();
  });

  test('キャンセルボタンでダイアログが閉じること', async ({ page }) => {
    const item = page.locator('.item-content').filter({ hasText: 'カスタム: 赤背景' }).first();
    await item.dblclick();
    await expect(page.locator('.dialog')).toBeVisible();

    await page.locator('.btn-cancel').click();
    await expect(page.locator('.dialog')).not.toBeVisible();
  });

  test('タイトルを編集して保存するとアイテムが更新されること', async ({ page }) => {
    const item = page.locator('.item-content').filter({ hasText: 'カスタム: 赤背景' }).first();
    await item.dblclick();
    await expect(page.locator('.dialog')).toBeVisible();

    // タイトルを変更
    const titleInput = page.locator('.title-input');
    await titleInput.fill('カスタム: 赤背景（更新済み）');

    // 保存
    await page.locator('.btn-save').click();

    // ダイアログが閉じること
    await expect(page.locator('.dialog')).not.toBeVisible();

    // アイテムタイトルが更新されていること
    await expect(page.locator('.item-content').filter({ hasText: 'カスタム: 赤背景（更新済み）' })).toBeVisible();

    // 元のタイトルが消えていること
    await expect(page.locator('.item-content').filter({ hasText: 'カスタム: 赤背景' }).filter({ hasNotText: '更新済み' })).toHaveCount(0);
  });

  test('種別コンボボックスに4つの選択肢があること', async ({ page }) => {
    const item = page.locator('.item-content').filter({ hasText: 'カスタム: 赤背景' }).first();
    await item.dblclick();
    await expect(page.locator('.dialog')).toBeVisible();

    const typeSelect = page.locator('#ed-type');
    await expect(typeSelect.locator('option')).toHaveCount(4);
    // select の option は hidden 扱いになるため count のみ確認し、selectOption で動作を検証
    await typeSelect.selectOption('appointment');
    await typeSelect.selectOption('task');
    await typeSelect.selectOption('allday');
    await typeSelect.selectOption('deadline');
    // 元に戻す
    await typeSelect.selectOption('task');
  });

  test('種別をalldayに変更すると時刻入力欄が非表示になること', async ({ page }) => {
    const item = page.locator('.item-content').filter({ hasText: 'カスタム: 赤背景' }).first();
    await item.dblclick();
    await expect(page.locator('.dialog')).toBeVisible();

    // 時刻入力欄が表示されていること
    await expect(page.locator('.time-input').first()).toBeVisible();

    // 種別をalldayに変更
    await page.locator('#ed-type').selectOption('allday');

    // 時刻入力欄が非表示になること
    await expect(page.locator('.time-input')).toHaveCount(0);
  });

  test('タイトルを空にして保存するとバリデーションエラーが表示されること', async ({ page }) => {
    const item = page.locator('.item-content').filter({ hasText: 'カスタム: 赤背景' }).first();
    await item.dblclick();
    await expect(page.locator('.dialog')).toBeVisible();

    // タイトルを空にする
    await page.locator('.title-input').fill('');

    // 保存
    await page.locator('.btn-save').click();

    // エラーメッセージが表示されること
    await expect(page.locator('.field-error').filter({ hasText: 'タイトルを入力してください' })).toBeVisible();

    // ダイアログが閉じないこと
    await expect(page.locator('.dialog')).toBeVisible();
  });

  test('削除ボタンをクリックすると確認ダイアログが表示されること', async ({ page }) => {
    const item = page.locator('.item-content').filter({ hasText: 'カスタム: 赤背景' }).first();
    await item.dblclick();
    await expect(page.locator('.dialog')).toBeVisible();

    // 削除ボタンをクリック
    await page.locator('.btn-delete').click();

    // 確認ダイアログが表示されること
    await expect(page.locator('.confirm-dialog')).toBeVisible();
    await expect(page.locator('.confirm-title')).toHaveText('アイテムを削除します');
    await expect(page.locator('.confirm-item-title')).toHaveText('「カスタム: 赤背景」');
    await expect(page.locator('.confirm-warning')).toContainText('取り消せません');
  });

  test('削除確認ダイアログでキャンセルすると元のダイアログに戻ること', async ({ page }) => {
    const item = page.locator('.item-content').filter({ hasText: 'カスタム: 赤背景' }).first();
    await item.dblclick();
    await page.locator('.btn-delete').click();
    await expect(page.locator('.confirm-dialog')).toBeVisible();

    // キャンセル
    await page.locator('.confirm-footer .btn-cancel').click();

    // 確認ダイアログが閉じ、編集ダイアログは残ること
    await expect(page.locator('.confirm-dialog')).not.toBeVisible();
    await expect(page.locator('.dialog')).toBeVisible();
  });

  test('削除を確定するとアイテムが削除されること', async ({ page }) => {
    const item = page.locator('.item-content').filter({ hasText: 'カスタム: 赤背景' }).first();
    await item.dblclick();
    await page.locator('.btn-delete').click();
    await expect(page.locator('.confirm-dialog')).toBeVisible();

    // 削除を確定
    await page.locator('.confirm-footer .btn-delete').click();

    // ダイアログが閉じること
    await expect(page.locator('.dialog')).not.toBeVisible();
    // アイテムが消えていること
    await expect(page.locator('.item-content').filter({ hasText: 'カスタム: 赤背景' })).toHaveCount(0);
  });

  test('タグを追加して保存するとタグが反映されること', async ({ page }) => {
    // タグのないアイテムを編集
    const item = page.locator('.item-content').filter({ hasText: 'チームミーティング' }).first();
    await item.dblclick();
    await expect(page.locator('.dialog')).toBeVisible();

    // タグを追加
    await page.locator('.tag-input').fill('重要');
    await page.keyboard.press('Enter');
    await expect(page.locator('.tag-chip').filter({ hasText: '重要' })).toBeVisible();

    // 保存
    await page.locator('.btn-save').click();
    await expect(page.locator('.dialog')).not.toBeVisible();
  });
});
