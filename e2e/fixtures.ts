// e2e 共用：每個測試自動收集 pageerror 與 console error，測試結束時必須一個都沒有。
// 兩個 spec 都從這裡 import `test`／`expect`，不必各自重複掛監聽。
import { expect, test as base } from '@playwright/test';

/** 測試自己存的截圖放這裡（已在 .gitignore）。 */
export const OUTPUT_DIR = 'e2e/output';

export const test = base.extend<{ readonly pageProblems: readonly string[] }>({
  pageProblems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => {
        problems.push(`pageerror: ${error.message}`);
      });
      page.on('console', (message) => {
        if (message.type() === 'error') {
          problems.push(`console.error: ${message.text()}`);
        }
      });

      await use(problems);

      expect(problems, '頁面不應該有 pageerror 或 console error').toEqual([]);
    },
    // auto：測試沒有明講要用這個 fixture 也會套用。
    { auto: true },
  ],
});

export { expect };
