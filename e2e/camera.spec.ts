// 遊戲鏡頭的 e2e：用真實的 V 鍵切過五個鏡頭模式，每個模式都確認 HUD 顯示的名稱、
// 畫布真的有畫出東西（不是空白、不是整片同一個顏色），並存一張截圖；另外驗證 ?view= 與記住上次的選擇。
import type { Page } from '@playwright/test';
import { GAME_CAMERA_VIEWS, type GameCameraView } from '../src/core/cameraView';
import {
  canvasStats,
  expect,
  MAX_DOMINANT_FRACTION,
  MIN_DISTINCT_COLORS,
  OUTPUT_DIR,
  test,
} from './fixtures';

/** 每個模式在 HUD 上的中文名稱。 */
const VIEW_NAMES_ZH: Readonly<Record<GameCameraView, string>> = {
  chase_near: '近距離跟車',
  chase_far: '遠距離跟車',
  hood: '引擎蓋',
  cockpit: '駕駛座',
  top: '俯視',
};
const VIEW_NAMES_EN: Readonly<Record<GameCameraView, string>> = {
  chase_near: 'Chase Cam (Near)',
  chase_far: 'Chase Cam (Far)',
  hood: 'Hood Cam',
  cockpit: 'Cockpit',
  top: 'Top-Down',
};

/** 等 HUD 換到這個鏡頭，確認畫布有內容，存截圖，回傳畫面的簽名。 */
async function checkView(page: Page, view: GameCameraView): Promise<string> {
  const label = page.locator('#hud-camera');
  await expect(label).toHaveAttribute('data-view', view);
  await expect(label).toHaveText(VIEW_NAMES_ZH[view]);

  const stats = await canvasStats(page);
  expect(stats.distinctColors, `${view}：畫面顏色太少`).toBeGreaterThanOrEqual(MIN_DISTINCT_COLORS);
  expect(stats.dominantFraction, `${view}：畫面幾乎是單一顏色`).toBeLessThan(MAX_DOMINANT_FRACTION);

  await page.screenshot({ path: `${OUTPUT_DIR}/view-${view}.png` });
  return stats.signature;
}

test('按 V 依序切過五個鏡頭，每個都畫得出來，第五次回到近距離跟車', async ({ page }) => {
  // 指定 ?view= 當起點，不受之前存過的鏡頭影響。fx=off：落葉不飄，繞一圈回來的畫面才能逐像素比較。
  await page.goto('/?level=prototype&view=chase_near&lang=zh-TW&fx=off');
  await expect(page.locator('#game-canvas')).toBeVisible();
  // 操作說明有「V 切換鏡頭」這一列。
  await expect(page.locator('.hud-controls')).toContainText('切換鏡頭');
  await expect(page.locator('.hud-controls .hud-key', { hasText: /^V$/ })).toHaveCount(1);

  const signatures = new Map<GameCameraView, string>();
  for (const view of GAME_CAMERA_VIEWS) {
    signatures.set(view, await checkView(page, view));
    await page.keyboard.press('KeyV');
  }

  // 五個鏡頭的畫面兩兩不同：真的換了鏡頭，不是只換 HUD 上的字。
  expect(new Set(signatures.values()).size).toBe(GAME_CAMERA_VIEWS.length);

  // 按了五次 V：繞一圈回到起點，畫面也和一開始一樣（車沒動過）。
  const label = page.locator('#hud-camera');
  await expect(label).toHaveAttribute('data-view', 'chase_near');
  await expect(label).toHaveText(VIEW_NAMES_ZH.chase_near);
  expect((await canvasStats(page)).signature === signatures.get('chase_near')).toBe(true);
});

test('?view=cockpit 一進場就是駕駛座；切換語言時鏡頭名稱與操作說明一起換', async ({ page }) => {
  await page.goto('/?level=prototype&view=cockpit&lang=zh-TW');
  const label = page.locator('#hud-camera');
  const controls = page.locator('.hud-controls');
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(label).toHaveAttribute('data-view', 'cockpit');
  await expect(label).toHaveText(VIEW_NAMES_ZH.cockpit);
  await expect(controls).toContainText('切換鏡頭');

  await page.locator('#hud-language').click();
  await expect(label).toHaveText(VIEW_NAMES_EN.cockpit);
  await expect(label).toHaveAttribute('data-view', 'cockpit');
  await expect(controls).toContainText('Change camera');

  // 英文介面下切換，名稱直接是英文。
  await page.keyboard.press('KeyV');
  await expect(label).toHaveAttribute('data-view', 'top');
  await expect(label).toHaveText(VIEW_NAMES_EN.top);
});

test('記住上次的鏡頭：重新進場沿用，?view= 優先，不認得的 ?view= 當作沒給', async ({ page }) => {
  const label = page.locator('#hud-camera');

  // 全新的瀏覽器環境、沒有 ?view=：預設是近距離跟車。
  await page.goto('/?level=prototype&lang=zh-TW');
  await expect(label).toHaveAttribute('data-view', 'chase_near');

  // 切兩次到引擎蓋，重新整理後還是引擎蓋。
  await page.keyboard.press('KeyV');
  await expect(label).toHaveAttribute('data-view', 'chase_far');
  await page.keyboard.press('KeyV');
  await expect(label).toHaveAttribute('data-view', 'hood');
  await page.reload();
  await expect(label).toHaveAttribute('data-view', 'hood');

  // 有效的 ?view= 蓋過存的。
  await page.goto('/?level=prototype&view=top&lang=zh-TW');
  await expect(label).toHaveAttribute('data-view', 'top');

  // 不認得的 ?view= 不是錯誤：照常進遊戲，用存的鏡頭。
  await page.goto('/?level=prototype&view=nope&lang=zh-TW');
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(label).toHaveAttribute('data-view', 'hood');
});

test('?cam 與 ?show 不受 ?view= 影響：沒有遊戲 HUD，也沒有鏡頭名稱', async ({ page }) => {
  await page.goto('/?cam=top&t=2&view=cockpit');
  await expect(page.locator('body[data-shot-ready="true"]')).toBeAttached();
  await expect(page.locator('#hud')).toBeEmpty();
  await expect(page.locator('#hud-camera')).toHaveCount(0);

  await page.goto('/?show=car_sedan&view=cockpit');
  await expect(page.locator('body[data-shot-ready="true"]')).toBeAttached();
  await expect(page.locator('#hud-camera')).toHaveCount(0);
});
