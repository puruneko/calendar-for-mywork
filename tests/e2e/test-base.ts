import { test as base, expect } from '@playwright/test';

/**
 * 全E2Eテスト共通のカスタムフィクスチャ
 * - ブラウザのJSエラー（pageerror）を自動検知し、テスト終了時にfailさせる
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      console.error(`[Browser JS Error] ${error.message}`);
      errors.push(error.message);
    });
    await use(errors);
    // テスト終了後にブラウザJSエラーがあればfail
    if (errors.length > 0) {
      throw new Error(
        `Browser JS errors detected during test:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`
      );
    }
  },
});

export { expect };
