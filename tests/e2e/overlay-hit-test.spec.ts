import { test, expect } from '@playwright/test';

test.describe('MonthView - Multi-day Bar Overlay Hit Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176');
    await page.waitForLoadState('networkidle');
    
    // MonthViewに切り替え
    await page.click('button:has-text("月表示")');
    await page.waitForSelector('.month-view', { timeout: 5000 });
  });

  test('複数日バーが実際にセルの上にオーバーレイされていることをelementFromPointで検証', async ({ page }) => {
    console.log('[TEST] elementFromPointヒットテストでバーがセルより前面にあることを確認');
    console.log('[REASON] for_fat_prompt.txtの要件: バーが視覚的にtdの上に表示される必要がある');
    
    // 複数日バーを取得
    const multiDayBar = page.locator('.multi-day-bar').first();
    await multiDayBar.waitFor({ state: 'visible' });
    
    // バーをビューポートにスクロール
    await multiDayBar.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500); // スクロール完了を待機
    
    const box = await multiDayBar.boundingBox();
    
    if (!box) {
      throw new Error('Bar bounding box not found');
    }
    
    console.log(`[INFO] Bar position: x=${box.x}, y=${box.y}, width=${box.width}, height=${box.height}`);
    
    // バーの中央、左端、右端でヒットテスト
    const testPoints = [
      { name: 'center', x: box.x + box.width / 2, y: box.y + box.height / 2 },
      { name: 'left', x: box.x + 5, y: box.y + box.height / 2 },
      { name: 'right', x: box.x + box.width - 5, y: box.y + box.height / 2 },
    ];
    
    for (const point of testPoints) {
      console.log(`[INFO] Testing point: ${point.name} (${point.x}, ${point.y})`);
      
      const hitResult = await page.evaluate((coords) => {
        const element = document.elementFromPoint(coords.x, coords.y);
        if (!element) return { found: false, className: '' };
        
        // バーまたはその子要素がヒットすることを確認
        const isBar = element.classList.contains('multi-day-bar');
        const isBarChild = element.classList.contains('bar-content');
        const parentIsBar = element.parentElement?.classList.contains('multi-day-bar');
        
        return {
          found: true,
          className: element.className,
          tagName: element.tagName,
          isBar,
          isBarChild,
          parentIsBar,
          isBarOrChild: isBar || isBarChild || parentIsBar,
        };
      }, point);
      
      console.log(`[INFO] Hit element at ${point.name}: <${hitResult.tagName} class="${hitResult.className}">`);
      console.log(`[INFO] Is bar or child: ${hitResult.isBarOrChild}`);
      
      // バーまたはその子要素がヒットすることを期待
      expect(hitResult.isBarOrChild).toBe(true);
      
      console.log(`[PASS] ${point.name} point hits the bar`);
    }
    
    console.log('[PASS] All hit tests passed - bar is correctly overlaying cells');
  });

  test('バーの中央位置がセルではなくバー自体を返すことを確認', async ({ page }) => {
    console.log('[TEST] バーの中央でのelementFromPointがバーを返すことを確認');
    
    const multiDayBar = page.locator('.multi-day-bar').first();
    await multiDayBar.waitFor({ state: 'visible' });
    
    // バーをビューポートにスクロール
    await multiDayBar.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const box = await multiDayBar.boundingBox();
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
    
    // バーまたはbar-contentがヒットすることを期待
    const isBarRelated = hit.includes('multi-day-bar') || hit.includes('bar-content');
    expect(isBarRelated).toBe(true);
    
    console.log('[PASS] Center point correctly hits the bar');
  });
});
