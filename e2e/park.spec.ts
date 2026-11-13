// 一般遊戲的 e2e：用真實鍵盤事件把車開進車位，確認成功訊息、語言切換、Backspace 重來。
// 車的狀態只透過 window.__parkingGame.snapshot() 讀取（唯讀）；操作一律送鍵盤事件。
import { driveIntoSpot, nextSnapshot } from './driving';
import { expect, OUTPUT_DIR, test } from './fixtures';

// 原型場景（src/level/prototypeLayout.ts）：車從 (0, 0) ft 朝北（−Z）出發，
// 車位中心在 (0, −60) ft、與車同向，直線開進去就能停。
const START_X_FT = 0;
const START_Z_FT = 0;
const SPOT_CENTER_Z_FT = -60;
/** 車位長 18 ft、車長 15 ft：置中時前後各有這麼多餘裕。 */
const SPOT_LENGTHWISE_MARGIN_FT = 1.5;
/** 位置比對的容許誤差（ft）。 */
const POSITION_TOLERANCE_FT = 0.01;

test('用鍵盤把車停進車位、切換語言、按 Backspace 重來', async ({ page }) => {
  await page.goto('/?level=prototype&lang=zh-TW');

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
  const parkedAt = await driveIntoSpot(page, SPOT_CENTER_Z_FT);
  expect(parkedAt.parked).toBe(true);
  expect(parkedAt.speedMph).toBe(0);
  expect(Math.abs(parkedAt.xFt - START_X_FT)).toBeLessThan(POSITION_TOLERANCE_FT);
  expect(Math.abs(parkedAt.zFt - SPOT_CENTER_Z_FT)).toBeLessThanOrEqual(SPOT_LENGTHWISE_MARGIN_FT);

  // 成功訊息（中文）。直線開進去：沒有碰撞、車身是正的、遠低於目標時間 → 3 星。
  await expect(status).toBeVisible();
  await expect(statusTitle).toContainText('停車成功！');
  await expect(status).toHaveAttribute('data-status', 'parked');
  await expect(page.locator('#hud-status-detail')).toHaveAttribute('data-stars', '3');
  expect(parkedAt.status).toBe('parked');
  expect(parkedAt.collisions).toBe(0);
  expect(parkedAt.stars).toBe(3);
  await page.screenshot({ path: `${OUTPUT_DIR}/park-success-zh-TW.png` });

  // 按語言按鈕：同一個訊息就地變成英文，<html lang> 跟著變。
  await languageButton.click();
  await expect(statusTitle).toContainText('Parked!');
  await expect(status).toBeVisible();
  await expect(html).toHaveAttribute('lang', 'en');
  await page.screenshot({ path: `${OUTPUT_DIR}/park-success-en.png` });

  // 提示寫的是目前綁在「重來」上的鍵。R 是切換 D／R 檔：按了不會重來，成功畫面還在。
  await expect(status.locator('.hud-status-hint')).toHaveText('Press Backspace / T to restart');
  await page.keyboard.press('KeyR');
  await nextSnapshot(page);
  await expect(status).toBeVisible();
  expect((await nextSnapshot(page)).parked).toBe(true);

  // 按 Backspace：成功畫面消失，車回到起點。
  await page.keyboard.press('Backspace');
  await expect(status).toBeHidden();
  const afterRestart = await nextSnapshot(page);
  expect(afterRestart.parked).toBe(false);
  expect(afterRestart.speedMph).toBe(0);
  expect(Math.abs(afterRestart.xFt - START_X_FT)).toBeLessThan(POSITION_TOLERANCE_FT);
  expect(Math.abs(afterRestart.zFt - START_Z_FT)).toBeLessThan(POSITION_TOLERANCE_FT);
});
