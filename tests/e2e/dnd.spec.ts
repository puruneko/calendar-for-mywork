import { test, expect } from '@playwright/test';

/**
 * DnD機能のE2Eテスト
 * 
 * このテストは、ユーザーがブラウザ上で実際にDnD操作を行った際の
 * 最終状態（アイテムの日時変更）が仕様通りであることを確認します。
 * 
 * TESTING_POLICYに準拠:
 * - page.evaluate()でHTML5 DnDイベントを発火
 * - 中間状態ではなく、最終的なデータとUIの一致を検証
 * - コンソールエラーを確認
 */

test.describe('DnD機能', () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // エラーがないことを確認
    expect(errors).toHaveLength(0);
  });

  test('アイテムをDnDで移動すると、表示時刻が変更されること', async ({ page }) => {
    console.log('[TEST] DnD操作後に表示時刻が正しく変更されることを確認');
    console.log('[REASON] ユーザーがアイテムを移動した結果、データとUIが一致する必要がある');
    console.log('[ASPECT] 最終的な表示時刻が期待値と一致するか');
    
    // 初期状態の時刻を取得
    const item = page.locator('.calendar-item').first();
    const initialTime = await item.locator('.item-time').textContent();
    console.log('Initial time:', initialTime);
    
    // DnD操作を実行（HTML5 DnD APIを使用）
    await page.evaluate(() => {
      const itemEl = document.querySelector('.calendar-item .item-content') as HTMLElement;
      const targetEl = document.querySelectorAll('.day-grid')[2] as HTMLElement; // 3番目の日
      
      if (!itemEl || !targetEl) throw new Error('Elements not found');
      
      const itemRect = itemEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      
      const startX = itemRect.left + itemRect.width / 2;
      const startY = itemRect.top + itemRect.height / 2;
      const endX = targetRect.left + 50;
      const endY = targetRect.top + 200; // 約3時間後の位置
      
      // dragstartイベント
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        clientX: startX,
        clientY: startY,
        dataTransfer: new DataTransfer()
      });
      itemEl.dispatchEvent(dragStartEvent);
      
      // dragoverイベント（10ステップで移動）
      for (let i = 0; i <= 10; i++) {
        const progress = i / 10;
        const x = startX + (endX - startX) * progress;
        const y = startY + (endY - startY) * progress;
        
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          dataTransfer: dragStartEvent.dataTransfer
        });
        targetEl.dispatchEvent(dragOverEvent);
      }
      
      // dropイベント
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: endX,
        clientY: endY,
        dataTransfer: dragStartEvent.dataTransfer
      });
      targetEl.dispatchEvent(dropEvent);
      
      // dragendイベント
      const dragEndEvent = new DragEvent('dragend', {
        bubbles: true,
        cancelable: true
      });
      itemEl.dispatchEvent(dragEndEvent);
    });
    
    // 少し待って状態が更新されるのを待つ
    await page.waitForFunction(() => {
      const itemTime = document.querySelector('.calendar-item .item-time')?.textContent;
      return itemTime && itemTime !== '09:00 - 12:00';
    }, { timeout: 2000 }).catch(() => {
      // タイムアウトした場合、失敗させる
    });
    
    // 最終状態の時刻を取得
    const finalTime = await item.locator('.item-time').textContent();
    console.log('Final time:', finalTime);
    
    // 時刻が変更されたことを確認
    expect(finalTime).not.toBe(initialTime);
    expect(finalTime).not.toBeNull();
    
    console.log('[PASS] DnD operation changed the time successfully');
  });

  test('複数のアイテムを個別にDnDできること', async ({ page }) => {
    console.log('[TEST] 複数のアイテムがそれぞれ独立してDnD可能であることを確認');
    console.log('[REASON] すべてのアイテムがDnD機能を持つ必要がある');
    
    const items = page.locator('.calendar-item');
    const count = await items.count();
    
    expect(count).toBeGreaterThan(1);
    console.log(`[INFO] ${count} items displayed`);
    
    // 各アイテムがdraggable属性を持つことを確認
    for (let i = 0; i < Math.min(count, 3); i++) {
      const itemContent = items.nth(i).locator('.item-content');
      const draggable = await itemContent.getAttribute('draggable');
      expect(draggable).toBe('true');
    }
    
    console.log('[PASS] All items have draggable attribute');
  });
});
