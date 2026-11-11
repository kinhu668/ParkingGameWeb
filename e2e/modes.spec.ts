// 三種網址模式的 e2e：?show（展示）、?cam&t（固定鏡頭截圖）、?bench（效能測試）。
import type { Page } from '@playwright/test';
import type { BenchStats } from '../src/render/benchStats';
import { expect, OUTPUT_DIR, test } from './fixtures';

/** ?show 與 ?cam 畫完第一幀後在 <body> 設的旗標。 */
const SHOT_READY = 'body[data-shot-ready="true"]';
/** ?bench 以真實時間跑約 10 秒；軟體算圖再留寬一點。 */
const BENCH_DEADLINE_MS = 90_000;
/** bench 結果裡必須是「大於 0 的有限數字」的欄位。 */
const BENCH_NUMBER_FIELDS = [
  'avgFps',
  'low1Fps',
  'drawCallsAvg',
  'drawCallsMax',
] as const satisfies readonly (keyof BenchStats)[];

/** 開網址、等定格旗標，存一張截圖並回傳 PNG 的 base64（方便比對兩張是否完全相同）。 */
async function captureShot(page: Page, url: string, fileName: string): Promise<string> {
  await page.goto(url);
  await expect(page.locator(SHOT_READY)).toBeAttached();
  const png = await page.screenshot({ path: `${OUTPUT_DIR}/${fileName}` });
  return png.toString('base64');
}

test('?show=car_sedan 只展示車子', async ({ page }) => {
  await page.goto('/?show=car_sedan');

  await expect(page.locator(SHOT_READY)).toBeAttached();
  await expect(page.locator('#game-canvas')).toBeVisible();
  // 展示模式沒有 HUD；id 認得，所以也沒有「找不到」的提示。
  await expect(page.locator('#hud')).toBeEmpty();
  await expect(page.locator('#show-notice')).toHaveCount(0);

  await page.screenshot({ path: `${OUTPUT_DIR}/show-car_sedan.png` });
});

test('?cam=top&t=2 的截圖可重現', async ({ page }) => {
  const url = '/?cam=top&t=2';
  const first = await captureShot(page, url, 'cam-top-t2.png');
  // 重開同一個網址再截一次：同樣的步數 → 同樣的車輛狀態 → 逐位元組相同的圖。
  const second = await captureShot(page, url, 'cam-top-t2-repeat.png');

  expect(first.length).toBeGreaterThan(0);
  expect(second === first, '兩次截圖必須完全相同').toBe(true);
});

test('?bench 跑完後輸出統計數字', async ({ page }) => {
  const benchLogs: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'log' && message.text().startsWith('[bench] ')) {
      benchLogs.push(message.text());
    }
  });

  await page.goto('/?bench');
  const result = page.locator('#bench-result');
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('data-result', /avgFps/, { timeout: BENCH_DEADLINE_MS });

  // 無頭軟體算圖的數字不代表真實效能；這裡只驗證「真的有輸出，而且是合理的數字」。
  const stats: unknown = JSON.parse((await result.getAttribute('data-result')) ?? 'null');
  expect(stats).toEqual(expect.any(Object));
  const fields = stats as Readonly<Record<string, unknown>>;
  for (const field of BENCH_NUMBER_FIELDS) {
    const value = fields[field];
    expect(typeof value === 'number' && Number.isFinite(value) && value > 0, `${field} = ${String(value)}`).toBe(
      true,
    );
  }

  // 同一份結果也印到 console。
  expect(benchLogs).toEqual([`[bench] ${JSON.stringify(stats)}`]);

  await page.screenshot({ path: `${OUTPUT_DIR}/bench-result.png` });
});
