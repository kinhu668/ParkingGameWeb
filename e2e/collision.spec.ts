// 碰撞的 e2e：在 w1_l03 用真實鍵盤事件倒車去撞北側邊界，確認車被擋住、HUD 碰撞數 +1；
// 一直頂到超過上限 → 失敗面板；按重來鍵（T）全部歸零。
// 車的狀態只透過 window.__parkingGame.snapshot() 讀取（唯讀）。
import type { Page } from '@playwright/test';
import type { SessionSnapshot } from '../src/level/session';
import { expect, OUTPUT_DIR, test } from './fixtures';

// w1_l03（src/levels/w1_l03.json）：起點 (0, −33) ft、車頭朝南（heading 180）；
// 可行駛範圍的北緣在 z = −48，車身半長 7.5 ft → 車尾離北緣 7.5 ft，車身中心最北只能到 z = −40.5。
const START_Z_FT = -33;
const NORTHMOST_CENTER_Z_FT = -40.5;
const MAX_COLLISIONS = 4;
/** 整段的真實時間上限；軟體算圖幀率低也綽綽有餘。 */
const DEADLINE_MS = 60_000;
const POSITION_TOLERANCE_FT = 0.01;

/** 等遊戲畫完下一幀，再讀唯讀狀態。 */
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

/** 每幀讀狀態直到條件成立；途中每一幀車都不能越過北側邊界。 */
async function watchUntil(
  page: Page,
  done: (snapshot: SessionSnapshot) => boolean,
): Promise<SessionSnapshot> {
  const deadlineMs = Date.now() + DEADLINE_MS;
  let snapshot = await nextSnapshot(page);
  while (!done(snapshot)) {
    if (Date.now() > deadlineMs) {
      throw new Error(`時間內條件沒有成立，最後狀態：${JSON.stringify(snapshot)}`);
    }
    expect(snapshot.zFt).toBeGreaterThanOrEqual(NORTHMOST_CENTER_Z_FT - POSITION_TOLERANCE_FT);
    snapshot = await nextSnapshot(page);
  }
  return snapshot;
}

test('w1_l03：倒車撞邊界會被擋住並計數，超過上限失敗，按 T 重來歸零', async ({ page }) => {
  await page.goto('/?level=w1_l03&lang=zh-TW&view=top');

  const status = page.locator('#hud-status');
  const collisions = page.locator('#hud-collisions');
  const gear = page.locator('#hud-gear');

  // 進場：倒數是整個時間上限、還沒有碰撞、前進檔、沒有狀態面板。
  await expect(page.locator('#hud-time')).toHaveText('1:15.0');
  await expect(collisions).toHaveText(`0 / ${MAX_COLLISIONS}`);
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(status).toBeHidden();
  const atStart = await nextSnapshot(page);
  expect(atStart.status).toBe('ready');
  expect(atStart.elapsedS).toBe(0);
  await page.screenshot({ path: `${OUTPUT_DIR}/collision-start.png` });

  // 切到 R 檔再按住油門倒車：車尾撞到北側邊界。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await page.keyboard.down('KeyW');
  const firstHit = await watchUntil(page, (snapshot) => snapshot.collisions >= 1);
  expect(firstHit.status).toBe('driving');
  expect(firstHit.elapsedS).toBeGreaterThan(0);
  // 真的往北倒了（離開起點），而且停在邊界之前。
  expect(firstHit.zFt).toBeLessThan(START_Z_FT - 5);
  expect(firstHit.zFt).toBeGreaterThanOrEqual(NORTHMOST_CENTER_Z_FT - POSITION_TOLERANCE_FT);
  await expect(collisions).toHaveText(new RegExp(`^[1-${MAX_COLLISIONS}] / ${MAX_COLLISIONS}$`));
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await page.screenshot({ path: `${OUTPUT_DIR}/collision-first-hit.png` });

  // 繼續頂著：每 0.5 秒再計一次，超過上限就失敗。
  const failed = await watchUntil(page, (snapshot) => snapshot.status === 'failed');
  await page.keyboard.up('KeyW');
  expect(failed.collisions).toBe(MAX_COLLISIONS + 1);
  expect(failed.failReason).toBe('collisions');
  expect(failed.parked).toBe(false);
  expect(failed.speedMph).toBe(0);
  expect(failed.zFt).toBeGreaterThanOrEqual(NORTHMOST_CENTER_Z_FT - POSITION_TOLERANCE_FT);
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute('data-status', 'failed');
  await expect(status.locator('.hud-status-title')).toHaveText('停車失敗');
  await expect(page.locator('#hud-status-detail')).toHaveText('碰撞太多次');
  await expect(collisions).toHaveText(`${MAX_COLLISIONS + 1} / ${MAX_COLLISIONS}`);
  await page.screenshot({ path: `${OUTPUT_DIR}/collision-failed.png` });

  // 失敗後踩油門不會動。
  await page.keyboard.down('KeyW');
  await nextSnapshot(page);
  await nextSnapshot(page);
  const stillFailed = await nextSnapshot(page);
  await page.keyboard.up('KeyW');
  expect(stillFailed.zFt).toBe(failed.zFt);
  expect(stillFailed.status).toBe('failed');

  // 按 T（重來的備用鍵；R 是切換 D／R 檔）：面板消失，車回起點，計時與碰撞歸零，檔位回到 D。
  await page.keyboard.press('KeyT');
  await expect(status).toBeHidden();
  await expect(collisions).toHaveText(`0 / ${MAX_COLLISIONS}`);
  await expect(page.locator('#hud-time')).toHaveText('1:15.0');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  const afterRestart = await nextSnapshot(page);
  expect(afterRestart.status).toBe('ready');
  expect(afterRestart.collisions).toBe(0);
  expect(afterRestart.elapsedS).toBe(0);
  expect(Math.abs(afterRestart.zFt - START_Z_FT)).toBeLessThan(POSITION_TOLERANCE_FT);
});
