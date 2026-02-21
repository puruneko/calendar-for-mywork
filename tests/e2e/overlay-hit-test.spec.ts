import { test, expect } from './test-base';

test.describe('MonthView - Multi-day Bar Overlay Hit Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176');
    await page.waitForLoadState('domcontentloaded');
    
    // MonthViewに切り替え
    await page.click('button:has-text("月表示")');
    await page.waitForSelector('.month-view', { timeout: 5000 });
  });

  test('複数日バーが実際にセルの上にオーバーレイされていることをelementFromPointで検証', async ({ page }) => {
    console.log('[TEST] elementFromPointヒットテストでバーがセルより前面にあることを確認');
    console.log('[REASON] for_fat_prompt.txtの要件: バーが視覚的にtdの上に表示される必要がある');
    
    // 新3層構造では .allday-item クラスを使用
    const alldayItem = page.locator('.allday-item').first();
    await alldayItem.waitFor({ state: 'visible' });
    
    // バーをビューポートにスクロール
    await alldayItem.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300); // スクロール完了を待機
    
    const box = await alldayItem.boundingBox();
    
    if (!box) {
      throw new Error('Bar bounding box not found');
    }
    
    console.log(`[INFO] Bar position: x=${box.x}, y=${box.y}, width=${box.width}, height=${box.height}`);
    
    // バーの中央でヒットテスト
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    const hitResult = await page.evaluate((coords) => {
      const element = document.elementFromPoint(coords.x, coords.y);
      if (!element) return { found: false, className: '', tagName: '' };
      
      // バーまたはその子要素がヒットすることを確認
      const isAlldayItem = element.classList.contains('allday-item');
      const isBarContent = element.classList.contains('bar-content');
      const isResizeHandle = element.classList.contains('resize-handle');
      const parentIsAlldayItem = element.parentElement?.classList.contains('allday-item');
      
      return {
        found: true,
        className: element.className,
        tagName: element.tagName,
        isAlldayItem,
        isBarContent,
        isResizeHandle,
        parentIsAlldayItem,
        isBarOrChild: isAlldayItem || isBarContent || isResizeHandle || parentIsAlldayItem,
      };
    }, { x: centerX, y: centerY });
    
    console.log(`[INFO] Hit element at center: <${hitResult.tagName} class="${hitResult.className}">`);
    console.log(`[INFO] Is bar or child: ${hitResult.isBarOrChild}`);
    
    // バーまたはその子要素がヒットすることを期待
    expect(hitResult.isBarOrChild).toBe(true);
    
    console.log('[PASS] Center point hits the bar or its child');
    console.log('[PASS] Bar is correctly overlaying cells');
  });

  test('バーの中央位置がセルではなくバー自体を返すことを確認', async ({ page }) => {
    console.log('[TEST] バーの中央でのelementFromPointがバーを返すことを確認');
    
    // 新3層構造では .allday-item クラスを使用
    const alldayItem = page.locator('.allday-item').first();
    await alldayItem.waitFor({ state: 'visible' });
    
    // バーをビューポートにスクロール
    await alldayItem.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    const box = await alldayItem.boundingBox();
    if (!box) {
      throw new Error('Bar bounding box not found');
    }
    
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    const hit = await page.evaluate(({ x, y }) => {
      const element = document.elementFromPoint(x, y);
      return element?.className || '';
    }, { x: centerX, y: centerY });
    
    console.log(`[INFO] elementFromPoint returned: ${hit}`);
    
    // バーまたはbar-content、リサイズハンドルがヒットすることを期待
    const isBarRelated = hit.includes('allday-item') || hit.includes('bar-content') || hit.includes('resize-handle');
    expect(isBarRelated).toBe(true);
    
    console.log('[PASS] Center point correctly hits the bar');
  });

  test('week-alldayレイヤーが正しいz-indexを持つこと', async ({ page }) => {
    console.log('[TEST] week-alldayレイヤーのz-indexがweek-gridより高いことを確認');
    console.log('[REASON] 複数日バーが単日アイテムより前面に表示される必要がある');

    // week-alldayはlaneCount=0のとき height:0 で visible にならない場合がある
    // alldayアイテムがある週のweek-alldayを取得する
    const weekAllday = page.locator('.week-allday').filter({ has: page.locator('.allday-item') }).first();
    await weekAllday.waitFor({ state: 'attached' });

    const alldayZIndex = await weekAllday.evaluate(el => {
      return window.getComputedStyle(el).zIndex;
    });

    const weekGrid = page.locator('.week-grid').first();
    const gridZIndex = await weekGrid.evaluate(el => {
      return window.getComputedStyle(el).zIndex;
    });

    console.log(`[INFO] week-allday z-index: ${alldayZIndex}`);
    console.log(`[INFO] week-grid z-index: ${gridZIndex}`);

    // week-alldayのz-indexがweek-gridより高いことを確認
    expect(parseInt(alldayZIndex) || 0).toBeGreaterThan(parseInt(gridZIndex) || 0);

    console.log('[PASS] week-allday has higher z-index than week-grid');
  });
});
