/**
 * WeekView アイテム表示位置 E2Eテスト
 *
 * 各カレンダーアイテムが正しい時刻位置・高さで表示されているかを検証する。
 * 1時間 = 60px の座標系で計算する。
 * startHour=8 なので、8:00が top=0px の基準点。
 *
 * アイテムの position は CSS の style 属性から直接読み取る。
 * (boundingBox はスクロール位置に影響されるため不使用)
 */

import { test, expect } from './test-base';

const HOUR_HEIGHT = 60; // 1時間あたりのpx（WeekView固定値）
const START_HOUR = 8;   // デモアプリのデフォルトstartHour
const MINOR_TICK = 15;  // ▲インジケーター領域のオフセット（px）= minorTick の値

/** 時:分 → day-grid上の top(px) を計算 */
function expectedTop(hour: number, minute: number = 0): number {
  // MINOR_TICK px 分の ▲インジケーター領域が先頭に常時確保されているためオフセットを加算
  return (hour - START_HOUR) * HOUR_HEIGHT + (minute / 60) * HOUR_HEIGHT + MINOR_TICK;
}

/** 時間(分単位) → height(px) を計算 */
function expectedHeight(durationMinutes: number): number {
  return (durationMinutes / 60) * HOUR_HEIGHT;
}

/**
 * style属性から top または height の数値を取り出す。
 * 例: "top: 180px; height: 60px; left: 0%; width: 100%;" → top=180, height=60
 */
function parsePx(style: string, prop: string): number {
  const match = style.match(new RegExp(`${prop}:\\s*([0-9.]+)px`));
  if (!match) throw new Error(`"${prop}" not found in style: "${style}"`);
  return parseFloat(match[1]);
}

/**
 * 指定した日付の .day-column を返す。
 */
async function getDayColumn(page: any, targetDay: Date) {
  const dayColumns = page.locator('.day-column');
  const count = await dayColumns.count();
  const targetDayNum = targetDay.getDate();
  for (let i = 0; i < count; i++) {
    const dateText = await dayColumns.nth(i).locator('.date').textContent();
    if (dateText && parseInt(dateText.trim()) === targetDayNum) {
      return dayColumns.nth(i);
    }
  }
  return null;
}

/**
 * day-column 内のアイテムの style 属性を取得して top/height を検証するヘルパー。
 */
async function assertItemPosition(
  col: any,
  selector: string,
  titleFilter: string,
  expTop: number,
  expHeight: number
) {
  const item = col.locator(selector).filter({ hasText: titleFilter }).first();
  await expect(item).toBeVisible();
  const style = await item.getAttribute('style');
  expect(style).not.toBeNull();
  const actualTop = parsePx(style!, 'top');
  const actualHeight = parsePx(style!, 'height');
  expect(actualTop).toBeCloseTo(expTop, 0);
  expect(actualHeight).toBeCloseTo(expHeight, 0);
}

test.describe('WeekView アイテム表示位置', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.week-view')).toBeVisible();
    await page.locator('button.today').click();
    await page.waitForTimeout(200);
  });

  // ===== 今日のアイテム（d(0)） =====

  test('カスタム: 赤背景(8:00-9:00, task-todo)が正しい位置・高さで表示されること', async ({ page }) => {
    const col = await getDayColumn(page, new Date());
    expect(col).not.toBeNull();
    await assertItemPosition(col, '.calendar-item', 'カスタム: 赤背景', expectedTop(8, 0), expectedHeight(60));
  });

  test('プロジェクト企画書作成(9:00-12:00, task-doing)が正しい位置・高さで表示されること', async ({ page }) => {
    const col = await getDayColumn(page, new Date());
    expect(col).not.toBeNull();
    await assertItemPosition(col, '.calendar-item', 'プロジェクト企画書作成', expectedTop(9, 0), expectedHeight(180));
  });

  test('コードレビュー(10:00-11:00, task-todo)が正しい位置・高さで表示されること', async ({ page }) => {
    const col = await getDayColumn(page, new Date());
    expect(col).not.toBeNull();
    await assertItemPosition(col, '.calendar-item', 'コードレビュー', expectedTop(10, 0), expectedHeight(60));
  });

  test('チームミーティング(11:00-12:00, appointment)が正しい位置・高さで表示されること', async ({ page }) => {
    const col = await getDayColumn(page, new Date());
    expect(col).not.toBeNull();
    await assertItemPosition(col, '.appointment', 'チームミーティング', expectedTop(11, 0), expectedHeight(60));
  });

  test('要件定義書レビュー(13:00-14:00, task-doing)が正しい位置・高さで表示されること', async ({ page }) => {
    const col = await getDayColumn(page, new Date());
    expect(col).not.toBeNull();
    await assertItemPosition(col, '.calendar-item', '要件定義書レビュー', expectedTop(13, 0), expectedHeight(60));
  });

  test('バグ修正#1234(14:00-15:00, task-doing)が正しい位置・高さで表示されること', async ({ page }) => {
    const col = await getDayColumn(page, new Date());
    expect(col).not.toBeNull();
    await assertItemPosition(col, '.calendar-item', 'バグ修正#1234', expectedTop(14, 0), expectedHeight(60));
  });

  test('部署会議(15:00-16:00, appointment)が正しい位置・高さで表示されること', async ({ page }) => {
    const col = await getDayColumn(page, new Date());
    expect(col).not.toBeNull();
    await assertItemPosition(col, '.appointment', '部署会議', expectedTop(15, 0), expectedHeight(60));
  });

  test('週報作成(16:00-16:30, task-todo)が正しい位置・高さで表示されること', async ({ page }) => {
    const col = await getDayColumn(page, new Date());
    expect(col).not.toBeNull();
    await assertItemPosition(col, '.calendar-item', '週報作成', expectedTop(16, 0), expectedHeight(30));
  });

  test('メール返信(16:30-17:00, task-todo)が正しい位置・高さで表示されること', async ({ page }) => {
    const col = await getDayColumn(page, new Date());
    expect(col).not.toBeNull();
    await assertItemPosition(col, '.calendar-item', 'メール返信', expectedTop(16, 30), expectedHeight(30));
  });

  test('1on1ミーティング(17:00-17:30, appointment)が正しい位置・高さで表示されること', async ({ page }) => {
    const col = await getDayColumn(page, new Date());
    expect(col).not.toBeNull();
    await assertItemPosition(col, '.appointment', '1on1ミーティング', expectedTop(17, 0), expectedHeight(30));
  });

  test('夕会(18:00-18:30, task-todo)が正しい位置・高さで表示されること', async ({ page }) => {
    const col = await getDayColumn(page, new Date());
    expect(col).not.toBeNull();
    await assertItemPosition(col, '.calendar-item', '夕会', expectedTop(18, 0), expectedHeight(30));
  });

  // ===== 翌日のアイテム（翌日が今週内にある場合のみ） =====

  test('カスタム: 青+影(15:30-17:00, appointment)が翌日の列に正しい位置・高さで表示されること', async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const col = await getDayColumn(page, tomorrow);
    if (!col) return; // 翌日が今週外の場合はスキップ

    await assertItemPosition(col, '.appointment', 'カスタム: 青+影', expectedTop(15, 30), expectedHeight(90));
  });

  test('ランチMTG(12:00-13:00, appointment)が翌日の列に正しい位置・高さで表示されること', async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const col = await getDayColumn(page, tomorrow);
    if (!col) return; // 翌日が今週外の場合はスキップ

    await assertItemPosition(col, '.appointment', 'ランチMTG', expectedTop(12, 0), expectedHeight(60));
  });

  // ===== スクロール確認 =====

  test('20時(endHour)まで時刻スロットが表示されスクロールできること', async ({ page }) => {
    const calendarGrid = page.locator('.calendar-grid');
    await expect(calendarGrid).toBeVisible();

    // 最後のtime-slotまでスクロールして表示されることを確認
    const lastTimeSlot = page.locator('.time-slot').last();
    await lastTimeSlot.scrollIntoViewIfNeeded();
    await expect(lastTimeSlot).toBeVisible();

    // startHour=8, endHour=20 → 最後のスロットは 19:00
    const lastSlotText = await lastTimeSlot.textContent();
    expect(lastSlotText?.trim()).toBe('19:00');
  });

  test('.calendar-grid が overflow: auto でスクロール可能であること', async ({ page }) => {
    const calendarGrid = page.locator('.calendar-grid');
    const scrollable = await calendarGrid.evaluate((el: Element) => {
      return el.scrollHeight > el.clientHeight;
    });
    expect(scrollable).toBe(true);
  });

  test('全ての day-column が同じ高さ（720px = 12時間分）で表示されること', async ({ page }) => {
    // startHour=8, endHour=20 → 12時間 × 60px = 720px
    const expectedGridHeight = (20 - 8) * HOUR_HEIGHT; // 720px

    const dayColumns = page.locator('.day-column');
    const count = await dayColumns.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const dayGrid = dayColumns.nth(i).locator('.day-grid');
      const height = await dayGrid.evaluate((el: Element) => el.scrollHeight);
      expect(height).toBeGreaterThanOrEqual(expectedGridHeight);
    }
  });

  test('スクロール後も末尾アイテム（夕会18:00-18:30）が正しい位置に表示されること', async ({ page }) => {
    const calendarGrid = page.locator('.calendar-grid');
    // 末尾まで完全スクロール
    await calendarGrid.evaluate((el: Element) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(100);

    const col = await getDayColumn(page, new Date());
    expect(col).not.toBeNull();
    // style属性の top はスクロール位置に依存しないのでそのまま検証
    await assertItemPosition(col, '.calendar-item', '夕会', expectedTop(18, 0), expectedHeight(30));
  });

  test('スクロール前は先頭アイテム（カスタム: 赤背景8:00）が見えること', async ({ page }) => {
    const calendarGrid = page.locator('.calendar-grid');
    // 先頭にスクロール
    await calendarGrid.evaluate((el: Element) => { el.scrollTop = 0; });
    await page.waitForTimeout(100);

    const col = await getDayColumn(page, new Date());
    expect(col).not.toBeNull();
    const item = col!.locator('.calendar-item').filter({ hasText: 'カスタム: 赤背景' }).first();
    await expect(item).toBeVisible();
  });
});
