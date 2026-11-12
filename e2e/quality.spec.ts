// 畫質級別的 e2e：自動選擇在軟體算圖上選到 medium、?quality= 強制四個級別都畫得出來、
// 走後製鏈的級別（high／ultra）截圖可重現、鏡頭切換與視窗縮放後仍然正常。
// 無頭 Chromium 用 SwiftShader 軟體算圖：high／ultra 每幀要好幾百毫秒，所以這裡盡量用定格的 ?cam。
import type { Page } from '@playwright/test';
import { QUALITY_LEVELS, type QualityLevel } from '../src/render/quality';
import {
  canvasStats,
  expect,
  imageStats,
  MAX_DOMINANT_FRACTION,
  MIN_DISTINCT_COLORS,
  OUTPUT_DIR,
  test,
  type CanvasStats,
} from './fixtures';

const SHOT_READY = 'body[data-shot-ready="true"]';
/** 定格在示範路線的終點附近：車停在車位裡，鏡頭在車位左前方的低角度，看得到車、地面與天空。 */
const SHOT_QUERY = 'cam=spot_low&t=9';
/** high／ultra 在軟體算圖上第一幀要編譯很多著色器、烘天空，等久一點。 */
const SLOW_READY_MS = 60_000;
/** 縮放視窗測試用的大小。 */
const RESIZED_VIEWPORT = { width: 960, height: 540 } as const;

/** 確認決議出來的畫質級別與來源（寫在 <html> 上）。 */
async function expectQuality(page: Page, level: QualityLevel, source: 'url' | 'auto'): Promise<void> {
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-quality', level);
  await expect(html).toHaveAttribute('data-quality-source', source);
}

/** 畫面有內容：不是空白、不是整片同一個顏色。回傳畫面的簽名。 */
function expectDrawn(stats: CanvasStats, label: string): string {
  expect(stats.distinctColors, `${label}：畫面顏色太少`).toBeGreaterThanOrEqual(MIN_DISTINCT_COLORS);
  expect(stats.dominantFraction, `${label}：畫面幾乎是單一顏色`).toBeLessThan(MAX_DOMINANT_FRACTION);
  return stats.signature;
}

/** 一般遊戲（每幀重畫）：直接讀畫布這一幀。 */
async function expectCanvasDrawn(page: Page, label: string): Promise<string> {
  return expectDrawn(await canvasStats(page), label);
}

/** 開定格截圖的網址，等它畫好，存檔並回傳 PNG 的 base64。 */
async function captureShot(page: Page, url: string, fileName: string): Promise<string> {
  await page.goto(url);
  await expect(page.locator(SHOT_READY)).toBeAttached({ timeout: SLOW_READY_MS });
  const png = await page.screenshot({ path: `${OUTPUT_DIR}/${fileName}` });
  return png.toString('base64');
}

test('沒有 ?quality=：軟體算圖自動選 medium；不認得的值當作沒給', async ({ page }) => {
  await page.goto('/?level=prototype&lang=zh-TW');
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expectQuality(page, 'medium', 'auto');

  await page.goto('/?level=prototype&quality=nope&lang=zh-TW');
  await expect(page.locator('#hud-camera')).toBeVisible();
  await expectQuality(page, 'medium', 'auto');
  await expectCanvasDrawn(page, 'quality=nope');
});

test('?quality= 四個級別（不分大小寫）都畫得出定格截圖，而且彼此不同', async ({ page }) => {
  const shots = new Map<QualityLevel, string>();
  for (const level of QUALITY_LEVELS) {
    // 大小寫混用也認得。
    const shot = await captureShot(
      page,
      `/?${SHOT_QUERY}&quality=${level.toUpperCase()}`,
      `quality-${level}.png`,
    );
    await expectQuality(page, level, 'url');
    // ?quality= 不改變啟動模式：仍是定格截圖，沒有遊戲 HUD。
    await expect(page.locator('#hud')).toBeEmpty();
    // 定格模式只畫一次，畫布讀不回來，所以看截圖本身。
    expectDrawn(await imageStats(page, shot), `quality=${level}`);
    shots.set(level, shot);
  }
  // 四個級別的畫面兩兩不同：級別真的改變了算圖，不是只改標籤。
  expect(new Set(shots.values()).size).toBe(QUALITY_LEVELS.length);
});

for (const level of ['high', 'ultra'] as const) {
  test(`?quality=${level}：走後製鏈的定格截圖可重現`, async ({ page }) => {
    const url = `/?${SHOT_QUERY}&quality=${level}`;
    const first = await captureShot(page, url, `quality-${level}-repeat-1.png`);
    // 重開同一個網址：環境光遮蔽的雜訊是固定種子、SMAA 的查表貼圖等載入後才定格，所以逐位元組相同。
    const second = await captureShot(page, url, `quality-${level}-repeat-2.png`);
    expect(first.length).toBeGreaterThan(0);
    expect(second === first, '兩次截圖必須完全相同').toBe(true);
  });
}

test('?quality=high 的一般遊戲：後製鏈跟著鏡頭切換與視窗縮放', async ({ page }) => {
  await page.goto('/?level=prototype&quality=high&view=chase_far&lang=zh-TW');
  const label = page.locator('#hud-camera');
  await expect(label).toHaveAttribute('data-view', 'chase_far', { timeout: SLOW_READY_MS });
  await expectQuality(page, 'high', 'url');
  const farSignature = await expectCanvasDrawn(page, 'high chase_far');
  await page.screenshot({ path: `${OUTPUT_DIR}/quality-high-chase_far.png` });

  // 換鏡頭：後製鏈（含環境光遮蔽）每幀都用目前的鏡頭，畫面跟著變。
  await page.keyboard.press('KeyV');
  await expect(label).toHaveAttribute('data-view', 'hood');
  const hoodSignature = await expectCanvasDrawn(page, 'high hood');
  expect(hoodSignature === farSignature, '換鏡頭後畫面應該不同').toBe(false);

  // 縮放視窗：畫布與後製鏈的緩衝區一起跟上，畫面仍然正常。
  await page.setViewportSize(RESIZED_VIEWPORT);
  await expect
    .poll(async () => page.locator('#game-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width))
    .toBe(RESIZED_VIEWPORT.width);
  expect(
    await page.locator('#game-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.height),
  ).toBe(RESIZED_VIEWPORT.height);
  await expectCanvasDrawn(page, 'high resized');
  await page.screenshot({ path: `${OUTPUT_DIR}/quality-high-resized.png` });
});
