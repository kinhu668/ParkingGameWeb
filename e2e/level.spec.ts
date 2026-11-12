// `?level=<id>` 的 e2e：指定關卡進得去、車頭方向對；沒給就是原型關；不認得的 id 有明確的提示。
// 車的狀態只透過 window.__parkingGame 讀取（唯讀）；操作一律送鍵盤事件。
import type { Page } from '@playwright/test';
import type { SessionSnapshot } from '../src/level/session';
import {
  canvasStats,
  expect,
  MAX_DOMINANT_FRACTION,
  MIN_DISTINCT_COLORS,
  OUTPUT_DIR,
  test,
} from './fixtures';

/** ?cam 畫完定格的那一幀後在 <body> 設的旗標。 */
const SHOT_READY = 'body[data-shot-ready="true"]';
/** 位置與角度比對的容許誤差（ft、度）。 */
const TOLERANCE = 0.01;
/** w1_l03 的起點（ft、度）：heading 180 = 朝 +Z，面向 z = +13 的車位。 */
const W1_L03_START = { xFt: 0, zFt: -33, headingDeg: 180 };
/** 按住 W 之後車至少要往前（+Z）走這麼遠才算數。 */
const MIN_ADVANCE_FT = 3;
/** 等車開出去的真實時間上限；軟體算圖幀率低也綽綽有餘。 */
const DRIVE_DEADLINE_MS = 30_000;

interface GameState {
  readonly levelId: string;
  readonly snapshot: SessionSnapshot;
}

/** 等遊戲畫完下一幀，再讀唯讀狀態。 */
async function nextState(page: Page): Promise<GameState> {
  return page.evaluate(
    () =>
      new Promise<GameState>((resolve, reject) => {
        requestAnimationFrame(() => {
          const game = window.__parkingGame;
          if (game === undefined) {
            reject(new Error('window.__parkingGame 不存在'));
          } else {
            resolve({ levelId: game.levelId, snapshot: game.snapshot() });
          }
        });
      }),
  );
}

test('?level=w1_l03：車在起點、車頭朝 +Z（heading 180），按 W 往車位那一側前進', async ({ page }) => {
  await page.goto('/?level=w1_l03&view=top&lang=zh-TW');

  await expect(page.locator('html')).toHaveAttribute('data-level', 'w1_l03');
  await expect(page.locator('#level-notice')).toHaveCount(0);
  await expect(page.locator('#hud-speed')).toHaveText('0.0');

  const atStart = await nextState(page);
  expect(atStart.levelId).toBe('w1_l03');
  expect(atStart.snapshot.parked).toBe(false);
  expect(Math.abs(atStart.snapshot.xFt - W1_L03_START.xFt)).toBeLessThan(TOLERANCE);
  expect(Math.abs(atStart.snapshot.zFt - W1_L03_START.zFt)).toBeLessThan(TOLERANCE);
  expect(Math.abs(atStart.snapshot.headingDeg - W1_L03_START.headingDeg)).toBeLessThan(TOLERANCE);

  const stats = await canvasStats(page);
  expect(stats.distinctColors).toBeGreaterThanOrEqual(MIN_DISTINCT_COLORS);
  expect(stats.dominantFraction).toBeLessThan(MAX_DOMINANT_FRACTION);
  await page.screenshot({ path: `${OUTPUT_DIR}/level-w1_l03-top.png` });

  // 只踩油門、不轉向：車沿車頭方向走。heading 180 → z 變大（朝車位），x 不動。
  await page.keyboard.down('KeyW');
  const deadlineMs = Date.now() + DRIVE_DEADLINE_MS;
  let state = await nextState(page);
  while (state.snapshot.zFt < W1_L03_START.zFt + MIN_ADVANCE_FT) {
    if (Date.now() > deadlineMs) {
      throw new Error(`車沒有往 +Z 前進，最後狀態：${JSON.stringify(state.snapshot)}`);
    }
    state = await nextState(page);
  }
  await page.keyboard.up('KeyW');

  expect(state.snapshot.speedMph).toBeGreaterThan(0);
  expect(Math.abs(state.snapshot.xFt - W1_L03_START.xFt)).toBeLessThan(TOLERANCE);
  expect(Math.abs(state.snapshot.headingDeg - W1_L03_START.headingDeg)).toBeLessThan(TOLERANCE);
});

test('沒給 level：一般遊戲、?cam、?bench 都是原型關（heading 0）', async ({ page }) => {
  const html = page.locator('html');

  await page.goto('/?lang=zh-TW');
  await expect(html).toHaveAttribute('data-level', 'prototype');
  const { levelId, snapshot } = await nextState(page);
  expect(levelId).toBe('prototype');
  expect(snapshot).toEqual({ xFt: 0, zFt: 0, headingDeg: 0, speedMph: 0, parked: false });

  // ?cam：沒給 level 與明講 level=prototype 是同一張圖。
  await page.goto('/?cam=top&t=2');
  await expect(page.locator(SHOT_READY)).toBeAttached();
  await expect(html).toHaveAttribute('data-level', 'prototype');
  const implicit = (await page.screenshot()).toString('base64');
  await page.goto('/?cam=top&t=2&level=prototype');
  await expect(page.locator(SHOT_READY)).toBeAttached();
  const explicit = (await page.screenshot()).toString('base64');
  expect(explicit === implicit, '有沒有寫 level=prototype 必須是同一張圖').toBe(true);

  // ?bench：一啟動就決定關卡，不必等它跑完。
  await page.goto('/?bench');
  await expect(page.locator('#bench-result')).toBeVisible();
  await expect(html).toHaveAttribute('data-level', 'prototype');
});

test('?cam 可以指定關卡：w1_l03 定格在起點', async ({ page }) => {
  await page.goto('/?cam=top&t=2&level=w1_l03');
  await expect(page.locator(SHOT_READY)).toBeAttached();
  await expect(page.locator('html')).toHaveAttribute('data-level', 'w1_l03');
  await page.screenshot({ path: `${OUTPUT_DIR}/level-w1_l03-cam-top.png` });
});

test('不認得的 level：不啟動遊戲，畫面列出可用的關卡 id', async ({ page }) => {
  await page.goto('/?level=w9_l99&lang=zh-TW');

  const notice = page.locator('#level-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('找不到這個關卡');
  await expect(notice.locator('code')).toHaveText(['prototype', 'w1_l01', 'w1_l03']);
  // 沒有悄悄退回原型關：沒有決議出關卡，也沒有遊戲狀態與 HUD。
  await expect(page.locator('html')).not.toHaveAttribute('data-level');
  expect(await page.evaluate(() => window.__parkingGame === undefined)).toBe(true);
  await expect(page.locator('#hud')).toBeEmpty();

  // ?cam、?bench 帶不認得的 level 也一樣。
  await page.goto('/?cam=top&t=2&level=w9_l99&lang=en');
  await expect(notice).toContainText('Unknown level');
  await expect(page.locator(SHOT_READY)).toHaveCount(0);
});
