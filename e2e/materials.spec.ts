// 材質庫的 e2e：GPU 烘焙真的跑得起來（無頭 Chromium 的 SwiftShader 有 WebGL2）、固定種子烘兩次像素相同、
// 展示台畫得出來而且沒有 console error（fixture 會讓任何 console.error 的測試失敗）。
import { canvasStats, expect, MIN_DISTINCT_COLORS, test } from './fixtures';

const SHOT_READY = 'body[data-shot-ready="true"]';
const SLOW_READY_MS = 60_000;

test('?show=materials：烘得出整個材質庫，同一個種子烘兩次檢查碼相同', async ({ page }) => {
  const checksums: string[] = [];
  for (let round = 0; round < 2; round += 1) {
    await page.goto('/?show=materials&quality=low');
    await page.waitForSelector(SHOT_READY, { timeout: SLOW_READY_MS });
    const checksum = await page.locator('body').getAttribute('data-surface-checksum');
    expect(checksum).toMatch(/^\d+$/);
    checksums.push(checksum ?? '');
  }
  expect(checksums[0]).toBe(checksums[1]);
  // 16 種表面各一個樣本：畫面上不是一片單色。
  const stats = await canvasStats(page);
  expect(stats.distinctColors).toBeGreaterThan(MIN_DISTINCT_COLORS);
});

test('?show=material_brick（medium，含法線）：單一表面的特寫畫得出來', async ({ page }) => {
  await page.goto('/?show=material_brick&quality=medium');
  await page.waitForSelector(SHOT_READY, { timeout: SLOW_READY_MS });
  const stats = await canvasStats(page);
  expect(stats.distinctColors).toBeGreaterThan(MIN_DISTINCT_COLORS);
});
