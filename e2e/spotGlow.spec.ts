// 目標車位的發光標記：每一關進場就有（含沒有環境模組的原型關、低畫質、`?fx=off`），
// 貼著車位輪廓、只到腰的高度；停妥後變綠再淡出，重來後再出現。
// 另外守住 w1_l05 的回歸：以前吊在車位上空的箭頭會把遠距跟車的鏡頭包住，手機上整個畫面一片暗紅黑。
// 標記的狀態只透過 window.__parkingGame.spotGlow() 讀取（唯讀）；操作一律送鍵盤事件。
import type { Page } from '@playwright/test';
import { CAMERA_VIEW_STORAGE_KEY } from '../src/core/cameraView';
import type { SpotGlowSnapshot } from '../src/props/spotGlow';
import { driveIntoSpot, nextSnapshot } from './driving';
import {
  canvasStats,
  expect,
  MAX_DOMINANT_FRACTION,
  MIN_DISTINCT_COLORS,
  OUTPUT_DIR,
  test,
} from './fixtures';

/** 原型關的車位（ft）：車從 (0, 0) 朝北直線開進去。 */
const PROTOTYPE_SPOT = { xFt: 0, zFt: -60, widthFt: 9, lengthFt: 18 };
/** 光牆頂端的高度範圍（ft）：看得出是立體的，又比駕駛座的眼睛（3.8 ft）與引擎蓋鏡頭（3.55 ft）低。 */
const MIN_HEIGHT_FT = 2;
const MAX_HEIGHT_FT = 3.5;
const TOLERANCE_FT = 0.01;

/** 等遊戲畫完下一幀，再讀標記的唯讀狀態。 */
async function glowSnapshot(page: Page): Promise<SpotGlowSnapshot> {
  return page.evaluate(
    () =>
      new Promise<SpotGlowSnapshot>((resolve, reject) => {
        requestAnimationFrame(() => {
          const game = window.__parkingGame;
          if (game === undefined) {
            reject(new Error('window.__parkingGame 不存在'));
          } else {
            resolve(game.spotGlow());
          }
        });
      }),
  );
}

/** 標記完全顯示、琥珀色，圍著這個車位。 */
function expectGlowAround(
  glow: SpotGlowSnapshot,
  spot: { xFt: number; zFt: number; widthFt: number; lengthFt: number },
): void {
  expect(glow.visible).toBe(true);
  expect(glow.opacity).toBe(1);
  expect(glow.green).toBe(0);
  expect(Math.abs(glow.xFt - spot.xFt)).toBeLessThan(TOLERANCE_FT);
  expect(Math.abs(glow.zFt - spot.zFt)).toBeLessThan(TOLERANCE_FT);
  expect(Math.abs(glow.widthFt - spot.widthFt)).toBeLessThan(TOLERANCE_FT);
  expect(Math.abs(glow.lengthFt - spot.lengthFt)).toBeLessThan(TOLERANCE_FT);
  expect(glow.heightFt).toBeGreaterThan(MIN_HEIGHT_FT);
  expect(glow.heightFt).toBeLessThan(MAX_HEIGHT_FT);
}

async function expectCanvasDrawn(page: Page): Promise<void> {
  const stats = await canvasStats(page);
  expect(stats.distinctColors).toBeGreaterThanOrEqual(MIN_DISTINCT_COLORS);
  expect(stats.dominantFraction).toBeLessThan(MAX_DOMINANT_FRACTION);
}

test('原型關、駕駛座：進場就有發光標記，貼著車位輪廓，會脈動', async ({ page }) => {
  await page.goto('/?level=prototype&lang=zh-TW&view=cockpit');
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('#hud-camera')).toHaveAttribute('data-view', 'cockpit');

  const first = await glowSnapshot(page);
  expectGlowAround(first, PROTOTYPE_SPOT);
  await expectCanvasDrawn(page);

  // 脈動跟著時間走：過一會兒亮度變了（輕微，不會暗到看不見）；位置與大小不動。
  await expect
    .poll(async () => (await glowSnapshot(page)).pulse, { timeout: 20_000 })
    .toBeLessThan(1);
  const later = await glowSnapshot(page);
  expect(later.pulse).toBeGreaterThan(0.5);
  expectGlowAround(later, PROTOTYPE_SPOT);
  // 還沒有人開車：這一局沒被標記影響。
  expect((await nextSnapshot(page)).status).toBe('ready');
  await page.screenshot({ path: `${OUTPUT_DIR}/spot-glow-cockpit-start.png` });
});

test('原型關、近距離跟車：停妥後標記變綠再淡出，重來後再出現', async ({ page }) => {
  await page.goto('/?level=prototype&lang=zh-TW&view=chase_near');
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('#hud-camera')).toHaveAttribute('data-view', 'chase_near');
  expectGlowAround(await glowSnapshot(page), PROTOTYPE_SPOT);
  await expectCanvasDrawn(page);
  await page.screenshot({ path: `${OUTPUT_DIR}/spot-glow-chase-near-start.png` });

  // 開進車位：停妥之前（車身已經在車位裡調整時）標記一直是琥珀色、完全顯示。
  let lowestOpacityWhileDriving = 1;
  let highestGreenWhileDriving = 0;
  const watch = setInterval(() => {
    void page
      .evaluate(() => {
        const game = window.__parkingGame;
        return game === undefined || game.snapshot().parked
          ? { opacity: 1, green: 0 }
          : { opacity: game.spotGlow().opacity, green: game.spotGlow().green };
      })
      .then(({ opacity, green }) => {
        lowestOpacityWhileDriving = Math.min(lowestOpacityWhileDriving, opacity);
        highestGreenWhileDriving = Math.max(highestGreenWhileDriving, green);
      })
      .catch(() => undefined);
  }, 250);
  const parked = await driveIntoSpot(page, PROTOTYPE_SPOT.zFt);
  clearInterval(watch);
  expect(parked.status).toBe('parked');
  expect(lowestOpacityWhileDriving).toBe(1);
  expect(highestGreenWhileDriving).toBe(0);

  // 停妥：變綠，然後淡到 0、不再畫；位置沒有變。
  await expect.poll(async () => (await glowSnapshot(page)).green, { timeout: 20_000 }).toBe(1);
  await expect.poll(async () => (await glowSnapshot(page)).opacity, { timeout: 20_000 }).toBe(0);
  const faded = await glowSnapshot(page);
  expect(faded.visible).toBe(false);
  expect(Math.abs(faded.zFt - PROTOTYPE_SPOT.zFt)).toBeLessThan(TOLERANCE_FT);
  await expect(page.locator('#hud-status')).toHaveAttribute('data-status', 'parked');
  await page.screenshot({ path: `${OUTPUT_DIR}/spot-glow-chase-near-parked.png` });

  // 重來：標記回來，琥珀色、不透明度回到 1。
  await page.keyboard.press('Backspace');
  await expect(page.locator('#hud-status')).toBeHidden();
  await expect.poll(async () => (await glowSnapshot(page)).opacity, { timeout: 20_000 }).toBe(1);
  expectGlowAround(await glowSnapshot(page), PROTOTYPE_SPOT);
  expect((await nextSnapshot(page)).parked).toBe(false);
});

test('窄巷、側向停車、低畫質、?fx=off：進場都有標記，圍著各自的車位', async ({ page }) => {
  // 窄巷（雨、倒車入庫）。
  await page.goto('/?level=w1_l10&lang=zh-TW&view=cockpit');
  await expect(page.locator('#game-canvas')).toBeVisible();
  expectGlowAround(await glowSnapshot(page), { xFt: 3, zFt: -30.75, widthFt: 9, lengthFt: 17.5 });
  await expectCanvasDrawn(page);

  // 側向停車（heading 90°、車位長 25 ft）：一樣貼著車位、方向跟著車位；低畫質也有。
  await page.goto('/?level=w1_l08&lang=zh-TW&view=chase_near&quality=low');
  await expect(page.locator('html')).toHaveAttribute('data-quality', 'low');
  await expect(page.locator('#game-canvas')).toBeVisible();
  const parallel = await glowSnapshot(page);
  expectGlowAround(parallel, { xFt: 0, zFt: 9.75, widthFt: 8.5, lengthFt: 25 });
  expect(Math.abs(parallel.headingDeg - 90)).toBeLessThan(1e-6);
  await expectCanvasDrawn(page);

  // `?fx=off`：玩法標記照樣顯示，只是不脈動。
  await page.goto('/?level=prototype&lang=zh-TW&view=cockpit&fx=off');
  await expect(page.locator('#game-canvas')).toBeVisible();
  const still = await glowSnapshot(page);
  expectGlowAround(still, PROTOTYPE_SPOT);
  expect(still.pulse).toBe(1);
  await nextSnapshot(page);
  await nextSnapshot(page);
  expect(await glowSnapshot(page)).toEqual(still);
  await expectCanvasDrawn(page);
});

test.describe('手機直向 390×844：w1_l05（直線倒車，車位在起點正後方）', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  // 以前：遠距跟車的鏡頭在車尾後 30 ft、高 22 ft，正好落在吊在車位上空的箭頭裡，整個畫面是一片暗紅黑。
  for (const [name, query, storedView] of [
    ['記住的鏡頭是遠距跟車', '', 'chase_far'],
    ['網址指定遠距跟車', '&view=chase_far', undefined],
    ['預設鏡頭', '', undefined],
    ['駕駛座', '&view=cockpit', undefined],
  ] as const) {
    test(`${name}：進場就看得到場地，不是一整片同一個顏色`, async ({ page }) => {
      if (storedView !== undefined) {
        await page.addInitScript(
          ([key, view]) => {
            window.localStorage.setItem(key, view);
          },
          [CAMERA_VIEW_STORAGE_KEY, storedView] as const,
        );
      }
      await page.goto(`/?level=w1_l05&lang=zh-TW${query}`);
      await expect(page.locator('#game-canvas')).toBeVisible();
      if (storedView !== undefined) {
        await expect(page.locator('#hud-camera')).toHaveAttribute('data-view', storedView);
      }
      // 發光標記圍著後方的車位，只到腰的高度：鏡頭在它上面。
      expectGlowAround(await glowSnapshot(page), { xFt: 0, zFt: 35, widthFt: 10, lengthFt: 19 });
      await expectCanvasDrawn(page);
      expect((await nextSnapshot(page)).status).toBe('ready');
      await page.screenshot({
        path: `${OUTPUT_DIR}/spot-glow-l05-portrait-${storedView ?? (query === '' ? 'default' : query.slice(6))}.png`,
      });
    });
  }
});

test('「車位在後方」的提示：w1_l05 一進場就有，掛倒檔後收起；車位在前方的關卡沒有', async ({ page }) => {
  // w1_l05（直線倒車）：車位在起點正後方，朝前看不到發光標記。
  await page.goto('/?level=w1_l05&view=cockpit&lang=zh-TW');
  const hint = page.locator('#hud-spot-hint');
  const gear = page.locator('#hud-gear');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(hint).toBeVisible();
  await expect(hint).toHaveText('▼ 車位在後方');
  await page.screenshot({ path: `${OUTPUT_DIR}/spot-hint-w1_l05-cockpit.png` });

  // 切到 R 檔：倒車輔助層接手看後面，提示收起；切回 D 檔又出現。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await expect(hint).toBeHidden();
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(hint).toBeVisible();

  // 英文介面也有。
  await page.goto('/?level=w1_l05&view=chase_near&lang=en');
  await expect(page.locator('#hud-spot-hint')).toHaveText('▼ Spot is behind you');
  await expect(page.locator('#hud-spot-hint')).toBeVisible();

  // 車位在正前方的關卡不顯示。
  await page.goto('/?level=prototype&view=cockpit&lang=zh-TW');
  await expect(page.locator('#hud-gear')).toHaveAttribute('data-gear', 'forward');
  await expect(page.locator('#hud-spot-hint')).toBeHidden();
});
