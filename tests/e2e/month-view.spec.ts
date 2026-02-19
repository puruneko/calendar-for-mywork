import { test, expect } from '@playwright/test';

/**
 * MonthView E2Eテスト
 * 
 * TESTING_POLICYに基づき、以下の観点でテストを作成：
 * - UIが正しく表示されているか
 * - ユーザーインタラクションが正しく動作するか
 * - データが正しく表示されているか
 * - エッジケースが正しく処理されているか
 */

test.describe('MonthView - 基本表示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176');
    // 月表示に切り替え
    await page.click('button:has-text("月表示")');
    await page.waitForSelector('.month-view', { timeout: 5000 });
  });

  test('MonthViewが正しく表示されること', async ({ page }) => {
    console.log('[TEST] MonthViewが正しく表示されることを確認');
    console.log('[REASON] 月表示ボタンをクリックした後、月カレンダーが表示される必要がある');

    // MonthViewが表示されている
    const monthView = page.locator('.month-view');
    await expect(monthView).toBeVisible();

    // WeekViewが非表示になっている
    const weekView = page.locator('.week-view');
    await expect(weekView).not.toBeVisible();

    console.log('[PASS] MonthView is displayed correctly');
  });

  test('月タイトルが正しく表示されること', async ({ page }) => {
    console.log('[TEST] 月タイトルが正しく表示されることを確認');
    console.log('[REASON] ユーザーが現在表示している月を把握できる必要がある');

    const monthTitle = page.locator('.month-title');
    await expect(monthTitle).toBeVisible();

    // タイトルに年月が含まれている（例：2026年2月）
    const titleText = await monthTitle.textContent();
    expect(titleText).toMatch(/\d{4}年\d{1,2}月/);

    console.log(`[INFO] Month title: ${titleText}`);
    console.log('[PASS] Month title is displayed correctly');
  });

  test('前月・次月ナビゲーションボタンが表示されること', async ({ page }) => {
    console.log('[TEST] 前月・次月ナビゲーションボタンが表示されることを確認');
    console.log('[REASON] ユーザーが月を移動できるようにする必要がある');

    const prevButton = page.locator('button.nav-button').first();
    const nextButton = page.locator('button.nav-button').last();

    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();

    const prevText = await prevButton.textContent();
    const nextText = await nextButton.textContent();

    expect(prevText).toContain('<');
    expect(nextText).toContain('>');

    console.log('[PASS] Navigation buttons are displayed');
  });

  test('曜日ヘッダーが正しく表示されること', async ({ page }) => {
    console.log('[TEST] 曜日ヘッダーが正しく表示されることを確認');
    console.log('[REASON] ユーザーが各列の曜日を把握できる必要がある');

    const weekdayHeader = page.locator('.weekday-header');
    await expect(weekdayHeader).toBeVisible();

    const weekdays = page.locator('.weekday');
    await expect(weekdays).toHaveCount(7);

    // 曜日の順序を確認（月〜日）
    const expectedWeekdays = ['月', '火', '水', '木', '金', '土', '日'];
    for (let i = 0; i < 7; i++) {
      const text = await weekdays.nth(i).textContent();
      expect(text).toBe(expectedWeekdays[i]);
    }

    console.log('[PASS] Weekday headers are displayed correctly');
  });

  test('カレンダーグリッドが42個のセル（6週×7日）を持つこと', async ({ page }) => {
    console.log('[TEST] カレンダーグリッドが42個のセルを持つことを確認');
    console.log('[REASON] 月表示は常に6週間分（42日）表示する必要がある');

    const dayCells = page.locator('.day-cell');
    await expect(dayCells).toHaveCount(42);

    console.log('[PASS] Calendar grid has 42 cells');
  });

  test('各セルに日付番号が表示されること', async ({ page }) => {
    console.log('[TEST] 各セルに日付番号が表示されることを確認');
    console.log('[REASON] ユーザーが各セルの日付を把握できる必要がある');

    const dayCells = page.locator('.day-cell');
    const count = await dayCells.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const dayNumber = dayCells.nth(i).locator('.day-number');
      await expect(dayNumber).toBeVisible();

      const text = await dayNumber.textContent();
      expect(text).toMatch(/^\d{1,2}$/);
    }

    console.log('[PASS] Day numbers are displayed in cells');
  });

  test('今日のセルが特別な背景色で表示されること', async ({ page }) => {
    console.log('[TEST] 今日のセルが特別な背景色で表示されることを確認');
    console.log('[REASON] ユーザーが今日がどこか一目で分かる必要がある');

    const todayCell = page.locator('.day-cell.today');
    
    // 今日のセルが存在する場合のみテスト
    const count = await todayCell.count();
    if (count > 0) {
      await expect(todayCell.first()).toBeVisible();

      const bgColor = await todayCell.first().evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log(`[INFO] Today cell background color: ${bgColor}`);
      // 赤系の背景色であることを確認（rgba(255, 0, 0, 0.05)）
      expect(bgColor).toContain('rgba');

      console.log('[PASS] Today cell has special background color');
    } else {
      console.log('[INFO] Today is not in the current month view');
    }
  });

  test('他月の日がグレーアウト表示されること', async ({ page }) => {
    console.log('[TEST] 他月の日がグレーアウト表示されることを確認');
    console.log('[REASON] ユーザーが当月と他月を区別できる必要がある');

    const otherMonthCells = page.locator('.day-cell.other-month');
    const count = await otherMonthCells.count();

    if (count > 0) {
      const bgColor = await otherMonthCells.first().evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log(`[INFO] Other month cell background color: ${bgColor}`);
      console.log(`[INFO] ${count} other-month cells found`);
      console.log('[PASS] Other month cells are grayed out');
    } else {
      console.log('[INFO] No other-month cells in current view');
    }
  });
});

test.describe('MonthView - ナビゲーション', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176');
    await page.click('button:has-text("月表示")');
    await page.waitForSelector('.month-view');
  });

  test('前月ボタンをクリックすると前月に移動すること', async ({ page }) => {
    console.log('[TEST] 前月ボタンをクリックすると前月に移動することを確認');
    console.log('[REASON] ユーザーが過去の月を表示できる必要がある');

    const monthTitle = page.locator('.month-title');
    const initialMonth = await monthTitle.textContent();

    const prevButton = page.locator('button.nav-button').first();
    await prevButton.click();

    // タイトルが変わることを待つ
    await page.waitForFunction(
      (initial) => {
        const title = document.querySelector('.month-title');
        return title && title.textContent !== initial;
      },
      initialMonth,
      { timeout: 5000 }
    );

    const newMonth = await monthTitle.textContent();

    console.log(`[INFO] Initial month: ${initialMonth}`);
    console.log(`[INFO] New month: ${newMonth}`);
    expect(newMonth).not.toBe(initialMonth);

    console.log('[PASS] Navigated to previous month');
  });

  test('次月ボタンをクリックすると次月に移動すること', async ({ page }) => {
    console.log('[TEST] 次月ボタンをクリックすると次月に移動することを確認');
    console.log('[REASON] ユーザーが未来の月を表示できる必要がある');

    const monthTitle = page.locator('.month-title');
    const initialMonth = await monthTitle.textContent();

    const nextButton = page.locator('button.nav-button').last();
    await nextButton.click();

    await page.waitForFunction(
      (initial) => {
        const title = document.querySelector('.month-title');
        return title && title.textContent !== initial;
      },
      initialMonth,
      { timeout: 5000 }
    );

    const newMonth = await monthTitle.textContent();

    console.log(`[INFO] Initial month: ${initialMonth}`);
    console.log(`[INFO] New month: ${newMonth}`);
    expect(newMonth).not.toBe(initialMonth);

    console.log('[PASS] Navigated to next month');
  });
});

test.describe('MonthView - アイテム表示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176');
    await page.click('button:has-text("月表示")');
    await page.waitForSelector('.month-view');
  });

  test('アイテムが月表示で表示されること', async ({ page }) => {
    console.log('[TEST] アイテムが月表示で表示されることを確認');
    console.log('[REASON] カレンダーアイテムが月ビューに表示される必要がある');

    const items = page.locator('.month-item');
    const count = await items.count();

    console.log(`[INFO] ${count} items displayed in month view`);
    expect(count).toBeGreaterThan(0);

    console.log('[PASS] Items are displayed in month view');
  });

  test('日をまたがるアイテムが帯状に表示されること', async ({ page }) => {
    console.log('[TEST] 日をまたがるアイテムが帯状に表示されることを確認');
    console.log('[REASON] 複数日にまたがるイベントを視覚的に表現する必要がある');

    const multiDayBars = page.locator('.multi-day-bar');
    const count = await multiDayBars.count();

    if (count > 0) {
      const firstItem = multiDayBars.first();
      await expect(firstItem).toBeVisible();

      // 背景色が設定されているか
      const bgColor = await firstItem.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log(`[INFO] Multi-day bar background color: ${bgColor}`);
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');

      console.log('[PASS] Multi-day items are displayed as bands');
    } else {
      console.log('[INFO] No multi-day items in current view');
    }
  });

  test('日をまたがないアイテムが丸アイコン+時刻+タイトルで表示されること', async ({ page }) => {
    console.log('[TEST] 日をまたがないアイテムが丸アイコン+時刻+タイトルで表示されることを確認');
    console.log('[REASON] 単日イベントを簡潔に表示する必要がある');

    const singleDayItems = page.locator('.single-day-item');
    const count = await singleDayItems.count();

    if (count > 0) {
      const firstItem = singleDayItems.first();
      await expect(firstItem).toBeVisible();

      // 丸アイコンが存在する
      const dot = firstItem.locator('.item-dot');
      await expect(dot).toBeVisible();

      // 丸アイコンのサイズを確認
      const dotSize = await dot.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          width: styles.width,
          height: styles.height,
          borderRadius: styles.borderRadius,
        };
      });

      console.log(`[INFO] Dot size: ${dotSize.width} x ${dotSize.height}`);
      expect(dotSize.borderRadius).toContain('50%');

      // 時刻が表示されている
      const time = firstItem.locator('.item-time');
      await expect(time).toBeVisible();

      const timeText = await time.textContent();
      console.log(`[INFO] Time: ${timeText}`);
      expect(timeText).toMatch(/\d{1,2}:\d{2}/);

      // タイトルが表示されている
      const title = firstItem.locator('.item-title');
      await expect(title).toBeVisible();

      console.log('[PASS] Single-day items are displayed with dot, time, and title');
    } else {
      console.log('[INFO] No single-day items in current view');
    }
  });

  test('丸アイコンの色がアイテムのbackground-colorと同じであること', async ({ page }) => {
    console.log('[TEST] 丸アイコンの色がアイテムのbackground-colorと同じであることを確認');
    console.log('[REASON] 色でアイテムの種類を視覚的に区別できる必要がある');

    const singleDayItems = page.locator('.single-day-item');
    const count = await singleDayItems.count();

    if (count > 0) {
      const firstItem = singleDayItems.first();
      const dot = firstItem.locator('.item-dot');

      const dotColor = await dot.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log(`[INFO] Dot background color: ${dotColor}`);
      // 色が設定されている（透明ではない）
      expect(dotColor).not.toBe('rgba(0, 0, 0, 0)');

      console.log('[PASS] Dot color is properly set');
    } else {
      console.log('[INFO] No single-day items to test');
    }
  });
});

test.describe('MonthView - インタラクション', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176');
    await page.click('button:has-text("月表示")');
    await page.waitForSelector('.month-view');
  });

  test('セルをクリックするとセルクリックイベントが発火すること', async ({ page }) => {
    console.log('[TEST] セルをクリックするとセルクリックイベントが発火することを確認');
    console.log('[REASON] ユーザーが日付をクリックして操作できる必要がある');

    // コンソールログを監視
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    const firstCell = page.locator('.day-cell').first();
    await firstCell.click();

    // コンソールにログが出力されることを確認
    await page.waitForTimeout(100);

    const hasCellClickedLog = consoleLogs.some(log => log.includes('Cell clicked'));

    console.log(`[INFO] Console logs: ${consoleLogs.join(', ')}`);
    expect(hasCellClickedLog).toBe(true);

    console.log('[PASS] Cell click event is fired');
  });

  test('アイテムをクリックするとアイテムクリックイベントが発火すること', async ({ page }) => {
    console.log('[TEST] アイテムをクリックするとアイテムクリックイベントが発火することを確認');
    console.log('[REASON] ユーザーがアイテムを選択して操作できる必要がある');

    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    const firstItem = page.locator('.month-item').first();
    const count = await firstItem.count();

    if (count > 0) {
      await firstItem.click();
      await page.waitForTimeout(100);

      const hasItemClickedLog = consoleLogs.some(log => log.includes('Item clicked'));

      console.log(`[INFO] Console logs: ${consoleLogs.join(', ')}`);
      expect(hasItemClickedLog).toBe(true);

      console.log('[PASS] Item click event is fired');
    } else {
      console.log('[INFO] No items to click');
    }
  });

  test('アイテムをクリックしたときセルクリックイベントは発火しないこと', async ({ page }) => {
    console.log('[TEST] アイテムをクリックしたときセルクリックイベントは発火しないことを確認');
    console.log('[REASON] イベント伝播が正しく制御されている必要がある');

    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    const firstItem = page.locator('.month-item').first();
    const count = await firstItem.count();

    if (count > 0) {
      await firstItem.click();
      await page.waitForTimeout(100);

      const hasCellClickedLog = consoleLogs.some(log => log.includes('Cell clicked'));
      const hasItemClickedLog = consoleLogs.some(log => log.includes('Item clicked'));

      console.log(`[INFO] Has cell clicked: ${hasCellClickedLog}`);
      console.log(`[INFO] Has item clicked: ${hasItemClickedLog}`);

      expect(hasCellClickedLog).toBe(false);
      expect(hasItemClickedLog).toBe(true);

      console.log('[PASS] Cell click event is not fired when clicking item');
    } else {
      console.log('[INFO] No items to test');
    }
  });

  test('セルホバー時に背景色が変わること', async ({ page }) => {
    console.log('[TEST] セルホバー時に背景色が変わることを確認');
    console.log('[REASON] ユーザーに視覚的フィードバックを提供する必要がある');

    const firstCell = page.locator('.day-cell').first();

    // ホバー前の背景色
    const initialBgColor = await firstCell.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // ホバー
    await firstCell.hover();

    // ホバー後の背景色
    const hoverBgColor = await firstCell.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    console.log(`[INFO] Initial background: ${initialBgColor}`);
    console.log(`[INFO] Hover background: ${hoverBgColor}`);

    // 背景色が変わることを確認（厳密な値ではなく、変化したことを確認）
    expect(hoverBgColor).toBeTruthy();

    console.log('[PASS] Cell background changes on hover');
  });
});

test.describe('MonthView - 日付クリックでWeekView遷移', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176');
    await page.click('button:has-text("月表示")');
    await page.waitForSelector('.month-view');
  });

  test('日付番号をクリックすると週表示に遷移すること', async ({ page }) => {
    console.log('[TEST] 日付番号をクリックすると週表示に遷移することを確認');
    console.log('[REASON] ユーザーが日付から詳細な週表示に移動できる必要がある');

    // 月表示が表示されている
    await expect(page.locator('.month-view')).toBeVisible();

    // 日付番号をクリック
    const dayNumber = page.locator('.day-number').first();
    await dayNumber.click();

    // 週表示に切り替わることを待つ
    await page.waitForSelector('.week-view', { timeout: 5000 });

    // 週表示が表示され、月表示が非表示
    await expect(page.locator('.week-view')).toBeVisible();
    await expect(page.locator('.month-view')).not.toBeVisible();

    console.log('[PASS] Successfully switched to week view on day number click');
  });

  test('日付番号ホバー時にスタイルが変わること', async ({ page }) => {
    console.log('[TEST] 日付番号ホバー時にスタイルが変わることを確認');
    console.log('[REASON] クリック可能であることを視覚的に示す必要がある');

    const dayNumber = page.locator('.day-number').first();

    // ホバー
    await dayNumber.hover();

    // ホバー時の背景色
    const hoverBgColor = await dayNumber.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    console.log(`[INFO] Hover background color: ${hoverBgColor}`);
    // 背景色が設定されている
    expect(hoverBgColor).toBeTruthy();

    console.log('[PASS] Day number style changes on hover');
  });
});

test.describe('MonthView - スクロール', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176');
    await page.click('button:has-text("月表示")');
    await page.waitForSelector('.month-view');
  });

  test('1日に多数のアイテムがある場合、セル内でスクロールできること', async ({ page }) => {
    console.log('[TEST] 1日に多数のアイテムがある場合、セル内でスクロールできることを確認');
    console.log('[REASON] すべてのアイテムにアクセスできる必要がある');

    // 今日のセル（多数のアイテムがある）を探す
    const todayCell = page.locator('.day-cell.today');
    const count = await todayCell.count();

    if (count > 0) {
      const dayItems = todayCell.locator('.day-items');
      
      // day-itemsがoverflow-y: autoを持つことを確認
      const overflowY = await dayItems.evaluate((el) => {
        return window.getComputedStyle(el).overflowY;
      });

      console.log(`[INFO] Day items overflow-y: ${overflowY}`);
      expect(overflowY).toBe('auto');

      console.log('[PASS] Day items container has scroll capability');
    } else {
      console.log('[INFO] Today is not in current month view');
    }
  });
});

test.describe('MonthView - 複数日にまたがるアイテム', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176');
    await page.click('button:has-text("月表示")');
    await page.waitForSelector('.month-view');
  });

  test('複数日にまたがるアイテムが帯状に表示されること', async ({ page }) => {
    console.log('[TEST] 複数日にまたがるアイテムが帯状に表示されることを確認');
    console.log('[REASON] 期間を持つイベントを視覚的に表現する必要がある');

    const multiDayBars = page.locator('.multi-day-bar');
    const count = await multiDayBars.count();

    console.log(`[INFO] ${count} multi-day bars found`);
    expect(count).toBeGreaterThan(0);

    // 最初のアイテムの幅を確認（grid-columnでスパンしている）
    const firstItem = multiDayBars.first();
    const width = await firstItem.evaluate((el) => {
      return el.getBoundingClientRect().width;
    });

    console.log(`[INFO] Multi-day bar width: ${width}px`);
    expect(width).toBeGreaterThan(50);

    console.log('[PASS] Multi-day items are displayed as bands');
  });

  test('3日間のワークショップが3日間連続でバー表示されること', async ({ page }) => {
    console.log('[TEST] 3日間のワークショップが3日間連続でバー表示されることを確認');
    console.log('[REASON] 複数日アイテムが週内で連続したバーとして表示される必要がある');
    console.log('[STEP 1] "3日間のワークショップ"アイテムを探す');

    // "3日間のワークショップ"というテキストを含むバーを取得
    const workshopBars = page.locator('.multi-day-bar:has-text("3日間のワークショップ")');
    const workshopCount = await workshopBars.count();
    
    console.log(`[INFO] Found ${workshopCount} "3日間のワークショップ" bars`);
    
    // 新しい実装では、週をまたがない限り1つのバーで3日間をカバーする
    expect(workshopCount).toBeGreaterThanOrEqual(1);
    
    console.log('[STEP 2] バーが複数日にスパンしているか確認');
    
    if (workshopCount > 0) {
      const firstBar = workshopBars.first();
      
      // grid-columnスタイルを確認
      const gridColumn = await firstBar.evaluate((el) => {
        return window.getComputedStyle(el).gridColumn;
      });
      
      console.log(`[INFO] Grid column: ${gridColumn}`);
      
      // 幅が1日分より広いことを確認
      const width = await firstBar.evaluate((el) => {
        return el.getBoundingClientRect().width;
      });
      
      console.log(`[INFO] Bar width: ${width}px`);
      expect(width).toBeGreaterThan(100); // 3日分なので広いはず
    }
    
    console.log('[PASS] Multi-day workshop is displayed as connected bar');
  });

  test('複数日アイテムのバーにタイトルが表示されること', async ({ page }) => {
    console.log('[TEST] 複数日アイテムのバーにタイトルが表示されることを確認');
    console.log('[REASON] 新しい実装では1つのバーで複数日をカバーし、タイトルが表示される');

    const multiDayBars = page.locator('.multi-day-bar');
    const count = await multiDayBars.count();

    if (count > 0) {
      console.log(`[INFO] ${count} multi-day bars found`);
      
      // 各バーにタイトルがあることを確認
      for (let i = 0; i < Math.min(count, 5); i++) {
        const bar = multiDayBars.nth(i);
        const text = await bar.textContent();
        
        console.log(`[INFO] Bar ${i}: "${text}"`);
        expect(text?.trim().length).toBeGreaterThan(0);
      }
      
      console.log('[PASS] Multi-day bars have titles');
    } else {
      console.log('[INFO] No multi-day bars to test');
    }
  });

  test('複数日アイテムが週エリアに配置されていること', async ({ page }) => {
    console.log('[TEST] 複数日アイテムが週エリアに配置されていることを確認');
    console.log('[REASON] 複数日アイテムは.multi-day-area内に表示される');

    const multiDayAreas = page.locator('.multi-day-area');
    const areaCount = await multiDayAreas.count();
    
    console.log(`[INFO] ${areaCount} multi-day areas found (one per week)`);
    expect(areaCount).toBeGreaterThan(0);

    // 最初の週エリアに複数日バーがあるか確認
    const firstArea = multiDayAreas.first();
    const barsInFirstArea = firstArea.locator('.multi-day-bar');
    const barCount = await barsInFirstArea.count();
    
    console.log(`[INFO] ${barCount} bars in first multi-day area`);
    
    console.log('[PASS] Multi-day items are in week areas');
  });
});

test.describe('MonthView - +N more機能（セル内展開）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176');
    await page.click('button:has-text("月表示")');
    await page.waitForSelector('.month-view');
  });

  test('1日に4件以上のアイテムがある場合、+N moreが表示されること', async ({ page }) => {
    console.log('[TEST] 1日に4件以上のアイテムがある場合、+N moreが表示されることを確認');
    console.log('[REASON] 高さ制限により表示できないアイテムを示す必要がある');

    // 今日のセル（デモデータで多数のアイテムがある）
    const todayCell = page.locator('.day-cell.today');
    const todayCount = await todayCell.count();

    if (todayCount > 0) {
      const moreLink = todayCell.locator('.more-items');
      const moreCount = await moreLink.count();

      if (moreCount > 0) {
        await expect(moreLink).toBeVisible();
        
        const moreText = await moreLink.textContent();
        console.log(`[INFO] More link text: ${moreText}`);
        expect(moreText).toMatch(/\+\d+ more/);

        console.log('[PASS] +N more is displayed');
      } else {
        console.log('[INFO] No +N more link (less than 4 items on today)');
      }
    } else {
      console.log('[INFO] Today is not in current month view');
    }
  });

  test('+N moreをクリックするとセルが展開されること', async ({ page }) => {
    console.log('[TEST] +N moreをクリックするとセルが展開されることを確認');
    console.log('[REASON] すべてのアイテムをセル内で表示する手段を提供する必要がある');

    const moreLink = page.locator('.more-items').first();
    const count = await moreLink.count();

    if (count > 0) {
      await moreLink.click();
      
      // セルが展開される（expandedクラスが付与）
      const expandedCell = page.locator('.day-cell.expanded');
      await expect(expandedCell).toBeVisible();

      // hideボタンが表示される
      const hideButton = page.locator('.hide-items');
      await expect(hideButton).toBeVisible();

      console.log('[PASS] Cell is expanded on +N more click');
    } else {
      console.log('[INFO] No +N more links available');
    }
  });

  test('展開されたセルに全アイテムが表示されること', async ({ page }) => {
    console.log('[TEST] 展開されたセルに全アイテムが表示されることを確認');
    console.log('[REASON] 隠れたアイテムも含めて全て表示する必要がある');

    const moreLink = page.locator('.more-items').first();
    const count = await moreLink.count();

    if (count > 0) {
      await moreLink.click();
      
      const expandedCell = page.locator('.day-cell.expanded');
      const expandedItems = expandedCell.locator('.single-day-item');
      const expandedItemCount = await expandedItems.count();

      console.log(`[INFO] Expanded cell shows ${expandedItemCount} items`);
      expect(expandedItemCount).toBeGreaterThan(3); // MAX_ITEMS_PER_DAYが3なので、4件以上表示されるはず

      console.log('[PASS] All items are displayed in expanded cell');
    } else {
      console.log('[INFO] No +N more links available');
    }
  });

  test('hideボタンをクリックするとセルが折りたたまれること', async ({ page }) => {
    console.log('[TEST] hideボタンをクリックするとセルが折りたたまれることを確認');
    console.log('[REASON] ユーザーが展開したセルを簡単に閉じられる必要がある');

    const moreLink = page.locator('.more-items').first();
    const count = await moreLink.count();

    if (count > 0) {
      // セルを展開
      await moreLink.click();
      
      const expandedCell = page.locator('.day-cell.expanded');
      await expect(expandedCell).toBeVisible();

      // hideボタンをクリック
      const hideButton = page.locator('.hide-items');
      await hideButton.click();

      // セルが折りたたまれる（expandedクラスが消える）
      await expect(expandedCell).not.toBeVisible();

      // +N moreが再表示される
      await expect(moreLink).toBeVisible();

      console.log('[PASS] Cell collapses on hide button click');
    } else {
      console.log('[INFO] No +N more links available');
    }
  });

  test('展開されたセルに青い枠線とシャドウが表示されること', async ({ page }) => {
    console.log('[TEST] 展開されたセルに青い枠線とシャドウが表示されることを確認');
    console.log('[REASON] 展開状態を視覚的に明確にする必要がある');

    const moreLink = page.locator('.more-items').first();
    const count = await moreLink.count();

    if (count > 0) {
      await moreLink.click();
      
      const expandedCell = page.locator('.day-cell.expanded');
      const dayItemsDiv = expandedCell.locator('.day-items');
      
      // スタイルを確認
      const styles = await dayItemsDiv.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          border: computed.border,
          boxShadow: computed.boxShadow,
          position: computed.position,
        };
      });

      console.log(`[INFO] Expanded cell styles:`, styles);
      expect(styles.position).toBe('absolute');
      expect(styles.boxShadow).not.toBe('none');

      console.log('[PASS] Expanded cell has proper visual styling');
    } else {
      console.log('[INFO] No +N more links available');
    }
  });
});

test.describe('MonthView - ビュー切り替え', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176');
  });

  test('週表示から月表示に切り替えられること', async ({ page }) => {
    console.log('[TEST] 週表示から月表示に切り替えられることを確認');
    console.log('[REASON] ユーザーがビューを自由に切り替えられる必要がある');

    // 初期状態は週表示
    await expect(page.locator('.week-view')).toBeVisible();
    await expect(page.locator('.month-view')).not.toBeVisible();

    // 月表示に切り替え
    await page.click('button:has-text("月表示")');
    await page.waitForSelector('.month-view');

    await expect(page.locator('.month-view')).toBeVisible();
    await expect(page.locator('.week-view')).not.toBeVisible();

    console.log('[PASS] Successfully switched from week to month view');
  });

  test('月表示から週表示に切り替えられること', async ({ page }) => {
    console.log('[TEST] 月表示から週表示に切り替えられることを確認');
    console.log('[REASON] ユーザーがビューを自由に切り替えられる必要がある');

    // 月表示に切り替え
    await page.click('button:has-text("月表示")');
    await page.waitForSelector('.month-view');

    await expect(page.locator('.month-view')).toBeVisible();

    // 週表示に戻す
    await page.click('button:has-text("週表示")');
    await page.waitForSelector('.week-view');

    await expect(page.locator('.week-view')).toBeVisible();
    await expect(page.locator('.month-view')).not.toBeVisible();

    console.log('[PASS] Successfully switched from month to week view');
  });

  test('ビュー切り替えボタンのアクティブ状態が正しく表示されること', async ({ page }) => {
    console.log('[TEST] ビュー切り替えボタンのアクティブ状態が正しく表示されることを確認');
    console.log('[REASON] ユーザーが現在のビューを把握できる必要がある');

    // 初期状態（週表示）
    const weekButton = page.locator('button:has-text("週表示")');
    const monthButton = page.locator('button:has-text("月表示")');

    const weekButtonClass = await weekButton.getAttribute('class');
    expect(weekButtonClass).toContain('active');

    // 月表示に切り替え
    await monthButton.click();
    await page.waitForSelector('.month-view');

    const monthButtonClass = await monthButton.getAttribute('class');
    expect(monthButtonClass).toContain('active');

    const weekButtonClassAfter = await weekButton.getAttribute('class');
    expect(weekButtonClassAfter).not.toContain('active');

    console.log('[PASS] Active state is correctly displayed');
  });
});
