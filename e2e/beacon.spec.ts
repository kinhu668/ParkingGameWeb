// 目標車位上方的天空箭頭：每一關進場就有（含沒有環境模組的原型關、低畫質、`?fx=off`），
// 吊在車位中心正上方；停妥後淡出，重來後再出現。
// 箭頭的狀態只透過 window.__parkingGame.spotBeacon() 讀取（唯讀）；操作一律送鍵盤事件。
import type { Page } from '@playwright/test';
import type { SpotBeaconSnapshot } from '../src/props/spotBeacon';
import { driveIntoSpot, nextSnapshot } from './driving';
import {
  canvasStats,
  expect,
  MAX_DOMINANT_FRACTION,
  MIN_DISTINCT_COLORS,
  OUTPUT_DIR,
  test,
} from './fixtures';

/** 原型關的車位中心（ft）：車從 (0, 0) 朝北直線開進去。 */
const PROTOTYPE_SPOT = { xFt: 0, zFt: -60 };
/** 尖端離地至少這麼高（ft）：在車頂、路燈之上，是「吊在天上」而不是貼在地上。 */
const MIN_TIP_HEIGHT_FT = 12;
/** 整支箭頭至少這麼長（ft）。 */
const MIN_LENGTH_FT = 10;
const POSITION_TOLERANCE_FT = 0.01;

/** 等遊戲畫完下一幀，再讀箭頭的唯讀狀態。 */
async function beaconSnapshot(page: Page): Promise<SpotBeaconSnapshot> {
  return page.evaluate(
    () =>
      new Promise<SpotBeaconSnapshot>((resolve, reject) => {
        requestAnimationFrame(() => {
          const game = window.__parkingGame;
          if (game === undefined) {
            reject(new Error('window.__parkingGame 不存在'));
          } else {
            resolve(game.spotBeacon());
          }
        });
      }),
  );
}

/** 箭頭完全顯示、吊在 (xFt, zFt) 的正上方。 */
function expectBeaconAbove(beacon: SpotBeaconSnapshot, spot: { xFt: number; zFt: number }): void {
  expect(beacon.visible).toBe(true);
  expect(beacon.opacity).toBe(1);
  expect(Math.abs(beacon.xFt - spot.xFt)).toBeLessThan(POSITION_TOLERANCE_FT);
  expect(Math.abs(beacon.zFt - spot.zFt)).toBeLessThan(POSITION_TOLERANCE_FT);
  expect(beacon.tipHeightFt).toBeGreaterThan(MIN_TIP_HEIGHT_FT);
  // 尖端在下、桿頂在上。
  expect(beacon.topHeightFt - beacon.tipHeightFt).toBeGreaterThan(MIN_LENGTH_FT);
}

async function expectCanvasDrawn(page: Page): Promise<void> {
  const stats = await canvasStats(page);
  expect(stats.distinctColors).toBeGreaterThanOrEqual(MIN_DISTINCT_COLORS);
  expect(stats.dominantFraction).toBeLessThan(MAX_DOMINANT_FRACTION);
}

test('原型關、駕駛座：進場就有天空箭頭，吊在車位正上方，會浮動與自轉', async ({ page }) => {
  await page.goto('/?level=prototype&lang=zh-TW&view=cockpit');
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('#hud-camera')).toHaveAttribute('data-view', 'cockpit');

  const first = await beaconSnapshot(page);
  expectBeaconAbove(first, PROTOTYPE_SPOT);
  await expectCanvasDrawn(page);

  // 動畫跟著時間走：過一會兒轉了角度；位置還在車位正上方。
  await expect
    .poll(async () => (await beaconSnapshot(page)).spinRad, { timeout: 20_000 })
    .not.toBe(first.spinRad);
  expectBeaconAbove(await beaconSnapshot(page), PROTOTYPE_SPOT);
  // 還沒有人開車：這一局沒被箭頭影響。
  expect((await nextSnapshot(page)).status).toBe('ready');
  await page.screenshot({ path: `${OUTPUT_DIR}/beacon-cockpit-start.png` });
});

test('原型關、近距離跟車：停妥後箭頭淡出，重來後再出現', async ({ page }) => {
  await page.goto('/?level=prototype&lang=zh-TW&view=chase_near');
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('#hud-camera')).toHaveAttribute('data-view', 'chase_near');
  expectBeaconAbove(await beaconSnapshot(page), PROTOTYPE_SPOT);
  await expectCanvasDrawn(page);
  await page.screenshot({ path: `${OUTPUT_DIR}/beacon-chase-near-start.png` });

  // 開進車位：停妥之前（車身已經在車位裡調整時）箭頭一直是完全顯示。
  let lowestOpacityWhileDriving = 1;
  const watch = setInterval(() => {
    void page
      .evaluate(() => {
        const game = window.__parkingGame;
        return game === undefined || game.snapshot().parked ? 1 : game.spotBeacon().opacity;
      })
      .then((opacity) => {
        lowestOpacityWhileDriving = Math.min(lowestOpacityWhileDriving, opacity);
      })
      .catch(() => undefined);
  }, 250);
  const parked = await driveIntoSpot(page, PROTOTYPE_SPOT.zFt);
  clearInterval(watch);
  expect(parked.status).toBe('parked');
  expect(lowestOpacityWhileDriving).toBe(1);

  // 停妥：淡到 0、不再畫；位置沒有變。
  await expect.poll(async () => (await beaconSnapshot(page)).opacity, { timeout: 20_000 }).toBe(0);
  const faded = await beaconSnapshot(page);
  expect(faded.visible).toBe(false);
  expect(Math.abs(faded.zFt - PROTOTYPE_SPOT.zFt)).toBeLessThan(POSITION_TOLERANCE_FT);
  await expect(page.locator('#hud-status')).toHaveAttribute('data-status', 'parked');
  await page.screenshot({ path: `${OUTPUT_DIR}/beacon-chase-near-parked.png` });

  // 重來：箭頭回來，不透明度回到 1。
  await page.keyboard.press('Backspace');
  await expect(page.locator('#hud-status')).toBeHidden();
  await expect.poll(async () => (await beaconSnapshot(page)).opacity, { timeout: 20_000 }).toBe(1);
  expectBeaconAbove(await beaconSnapshot(page), PROTOTYPE_SPOT);
  expect((await nextSnapshot(page)).parked).toBe(false);
});

test('窄巷、側向停車、低畫質、?fx=off：進場都有箭頭，在各自的車位正上方', async ({ page }) => {
  // 窄巷（雨、倒車入庫、牆高 22 ft）：桿頂高過牆。
  await page.goto('/?level=w1_l10&lang=zh-TW&view=cockpit');
  await expect(page.locator('#game-canvas')).toBeVisible();
  const alley = await beaconSnapshot(page);
  expectBeaconAbove(alley, { xFt: 3, zFt: -30.75 });
  expect(alley.topHeightFt).toBeGreaterThan(22 + 4);
  await expectCanvasDrawn(page);

  // 側向停車（heading 90°、車位長 25 ft）：一樣在車位中心、直立；低畫質也有。
  await page.goto('/?level=w1_l08&lang=zh-TW&view=chase_near&quality=low');
  await expect(page.locator('html')).toHaveAttribute('data-quality', 'low');
  await expect(page.locator('#game-canvas')).toBeVisible();
  expectBeaconAbove(await beaconSnapshot(page), { xFt: 0, zFt: 9.75 });
  await expectCanvasDrawn(page);

  // `?fx=off`：玩法標記照樣顯示，只是停在起始姿勢（不轉、不浮動）。
  await page.goto('/?level=prototype&lang=zh-TW&view=cockpit&fx=off');
  await expect(page.locator('#game-canvas')).toBeVisible();
  const still = await beaconSnapshot(page);
  expectBeaconAbove(still, PROTOTYPE_SPOT);
  expect(still.spinRad).toBe(0);
  await nextSnapshot(page);
  await nextSnapshot(page);
  expect(await beaconSnapshot(page)).toEqual(still);
  await expectCanvasDrawn(page);
});
