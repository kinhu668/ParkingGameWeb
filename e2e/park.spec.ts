// 一般遊戲的 e2e：用真實鍵盤事件把車開進車位，確認成功訊息、語言切換、R 重來。
// 車的狀態只透過 window.__parkingGame.snapshot() 讀取（唯讀）；操作一律送鍵盤事件。
import type { Page } from '@playwright/test';
import type { SessionSnapshot } from '../src/level/session';
import { expect, OUTPUT_DIR, test } from './fixtures';

// 原型場景（src/level/prototypeLayout.ts）：車從 (0, 0) ft 朝北（−Z）出發，
// 車位中心在 (0, −60) ft、與車同向，直線開進去就能停。
const START_X_FT = 0;
const START_Z_FT = 0;
const SPOT_CENTER_Z_FT = -60;
/** 車位長 18 ft、車長 15 ft：置中時前後各有這麼多餘裕。 */
const SPOT_LENGTHWISE_MARGIN_FT = 1.5;

/** 車身中心離車位中心（縱向）在這個距離內就放開油門、拉手煞車；要比車位餘裕小。 */
const STOP_BAND_FT = 0.5;
/** 接近車位時的目標車速 = 剩餘距離 × 這個係數，再夾在下面兩個值之間：越近越慢。 */
const APPROACH_MPH_PER_FT = 0.4;
const MIN_APPROACH_MPH = 1.5;
const MAX_APPROACH_MPH = 10;
/** 比目標車速快超過這麼多就拉手煞車，否則只放開油門滑行。 */
const OVERSPEED_MPH = 1;
/** 整段駕駛的真實時間上限；軟體算圖幀率低也綽綽有餘。 */
const DRIVE_DEADLINE_MS = 90_000;
/** 位置比對的容許誤差（ft）。 */
const POSITION_TOLERANCE_FT = 0.01;

const DRIVE_KEYS = ['KeyW', 'KeyS', 'Space'] as const;
type DriveKey = (typeof DRIVE_KEYS)[number];

/** 等遊戲畫完下一幀，再讀唯讀狀態：每幀最多判斷一次，不靠寫死的毫秒數。 */
async function nextSnapshot(page: Page): Promise<SessionSnapshot> {
  return page.evaluate(
    () =>
      new Promise<SessionSnapshot>((resolve, reject) => {
        requestAnimationFrame(() => {
          const game = window.__parkingGame;
          if (game === undefined) {
            reject(new Error('window.__parkingGame 不存在'));
          } else {
            resolve(game.snapshot());
          }
        });
      }),
  );
}

/** 依車的現況決定這一幀要按住哪些鍵。 */
function keysToHold(snapshot: SessionSnapshot): readonly DriveKey[] {
  // 車朝 −Z 開：正值 = 車位還在前方，負值 = 開過頭了。
  const aheadFt = snapshot.zFt - SPOT_CENTER_Z_FT;
  if (Math.abs(aheadFt) <= STOP_BAND_FT) {
    return ['Space'];
  }

  const towardKey: DriveKey = aheadFt > 0 ? 'KeyW' : 'KeyS';
  // 朝車位方向的車速（mph）；過頭時是倒車的速度。
  const towardSpeedMph = aheadFt > 0 ? snapshot.speedMph : -snapshot.speedMph;
  const targetSpeedMph = Math.min(
    Math.max(Math.abs(aheadFt) * APPROACH_MPH_PER_FT, MIN_APPROACH_MPH),
    MAX_APPROACH_MPH,
  );

  if (towardSpeedMph > targetSpeedMph + OVERSPEED_MPH) {
    return ['Space'];
  }
  if (towardSpeedMph < targetSpeedMph) {
    return [towardKey];
  }
  return [];
}

/**
 * 閉迴路把車停進車位：每幀讀狀態 → 決定按鍵 → 只對有變化的鍵送 keydown／keyup。
 * 回傳時已停妥，所有鍵都已放開。
 */
async function driveIntoSpot(page: Page): Promise<SessionSnapshot> {
  const held = new Set<DriveKey>();
  async function hold(wanted: readonly DriveKey[]): Promise<void> {
    for (const key of DRIVE_KEYS) {
      if (wanted.includes(key) && !held.has(key)) {
        await page.keyboard.down(key);
        held.add(key);
      } else if (!wanted.includes(key) && held.has(key)) {
        await page.keyboard.up(key);
        held.delete(key);
      }
    }
  }

  const deadlineMs = Date.now() + DRIVE_DEADLINE_MS;
  let snapshot = await nextSnapshot(page);
  while (!snapshot.parked) {
    if (Date.now() > deadlineMs) {
      await hold([]);
      throw new Error(`時間內沒有停妥，最後狀態：${JSON.stringify(snapshot)}`);
    }
    await hold(keysToHold(snapshot));
    snapshot = await nextSnapshot(page);
  }
  await hold([]);
  return snapshot;
}

test('用鍵盤把車停進車位、切換語言、按 R 重來', async ({ page }) => {
  await page.goto('/?lang=zh-TW');

  const status = page.locator('#hud-status');
  const statusTitle = status.locator('.hud-status-title');
  const languageButton = page.locator('#hud-language');
  const html = page.locator('html');

  // 畫布與 HUD 出現，一開始是中文、沒有成功畫面、車在起點。
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('#hud-speed')).toHaveText('0.0');
  await expect(languageButton).toHaveText('English');
  await expect(html).toHaveAttribute('lang', 'zh-TW');
  await expect(status).toBeHidden();
  const atStart = await nextSnapshot(page);
  expect(atStart.parked).toBe(false);
  expect(Math.abs(atStart.xFt - START_X_FT)).toBeLessThan(POSITION_TOLERANCE_FT);
  expect(Math.abs(atStart.zFt - START_Z_FT)).toBeLessThan(POSITION_TOLERANCE_FT);
  await page.screenshot({ path: `${OUTPUT_DIR}/park-start-zh-TW.png` });

  // 開車：W 前進、接近後放開、空白鍵手煞；過頭就 S 倒回來。
  const parkedAt = await driveIntoSpot(page);
  expect(parkedAt.parked).toBe(true);
  expect(parkedAt.speedMph).toBe(0);
  expect(Math.abs(parkedAt.xFt - START_X_FT)).toBeLessThan(POSITION_TOLERANCE_FT);
  expect(Math.abs(parkedAt.zFt - SPOT_CENTER_Z_FT)).toBeLessThanOrEqual(SPOT_LENGTHWISE_MARGIN_FT);

  // 成功訊息（中文）。
  await expect(status).toBeVisible();
  await expect(statusTitle).toContainText('停車成功！');
  await page.screenshot({ path: `${OUTPUT_DIR}/park-success-zh-TW.png` });

  // 按語言按鈕：同一個訊息就地變成英文，<html lang> 跟著變。
  await languageButton.click();
  await expect(statusTitle).toContainText('Parked!');
  await expect(status).toBeVisible();
  await expect(html).toHaveAttribute('lang', 'en');
  await page.screenshot({ path: `${OUTPUT_DIR}/park-success-en.png` });

  // 按 R：成功畫面消失，車回到起點。
  await page.keyboard.press('KeyR');
  await expect(status).toBeHidden();
  const afterRestart = await nextSnapshot(page);
  expect(afterRestart.parked).toBe(false);
  expect(afterRestart.speedMph).toBe(0);
  expect(Math.abs(afterRestart.xFt - START_X_FT)).toBeLessThan(POSITION_TOLERANCE_FT);
  expect(Math.abs(afterRestart.zFt - START_Z_FT)).toBeLessThan(POSITION_TOLERANCE_FT);
});
