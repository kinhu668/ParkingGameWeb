// 遊戲鏡頭的 e2e：用真實的 V 鍵切過五個鏡頭模式，每個模式都確認 HUD 顯示的名稱、
// 畫布真的有畫出東西（不是空白、不是整片同一個顏色），並存一張截圖；另外驗證 ?view= 與記住上次的選擇，
// 以及巷子那一關（車尾後面就是牆）開場的跟車鏡頭留在巷子裡、畫面中央看得到車。
import type { Page } from '@playwright/test';
import { GAME_CAMERA_VIEWS, type GameCameraView } from '../src/core/cameraView';
import type { CameraSnapshot } from '../src/render/gameCamera';
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
  // touch=off：看的是左下角的鍵盤操作說明（螢幕操作層開著時它會收起來）。
  await page.goto('/?level=prototype&view=chase_near&lang=zh-TW&fx=off&touch=off');
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
  await page.goto('/?level=prototype&view=cockpit&lang=zh-TW&touch=off');
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

/** 等遊戲畫完下一幀，再讀鏡頭的唯讀狀態。 */
async function cameraSnapshot(page: Page): Promise<CameraSnapshot> {
  return page.evaluate(
    () =>
      new Promise<CameraSnapshot>((resolve, reject) => {
        requestAnimationFrame(() => {
          const game = window.__parkingGame;
          if (game === undefined) {
            reject(new Error('window.__parkingGame 不存在'));
          } else {
            resolve(game.camera());
          }
        });
      }),
  );
}

/**
 * 畫布上以 (x, y)（NDC：−1 是左／下緣）為中心的一小塊的平均顏色（0–255）。
 * 與 canvasStats 相同，在 requestAnimationFrame 裡讀剛畫好的這一幀。
 */
async function canvasPatchColor(
  page: Page,
  x: number,
  y: number,
): Promise<{ readonly r: number; readonly g: number; readonly b: number }> {
  return page.evaluate(
    ({ ndcX, ndcY }) =>
      new Promise<{ r: number; g: number; b: number }>((resolve, reject) => {
        requestAnimationFrame(() => {
          const source = document.querySelector<HTMLCanvasElement>('#game-canvas');
          const context = document.createElement('canvas').getContext('2d');
          if (source === null || context === null) {
            reject(new Error('讀不到畫布'));
            return;
          }
          // 整張畫布縮成 64 × 36，取中心點周圍 3 × 3 格。
          const width = 64;
          const height = 36;
          context.canvas.width = width;
          context.canvas.height = height;
          context.drawImage(source, 0, 0, width, height);
          const column = Math.min(Math.max(Math.round(((ndcX + 1) / 2) * width) - 1, 0), width - 3);
          const row = Math.min(Math.max(Math.round(((1 - ndcY) / 2) * height) - 1, 0), height - 3);
          const pixels = context.getImageData(column, row, 3, 3).data;
          const sum = [0, 0, 0];
          for (let offset = 0; offset < pixels.length; offset += 4) {
            sum[0] = (sum[0] ?? 0) + (pixels[offset] ?? 0);
            sum[1] = (sum[1] ?? 0) + (pixels[offset + 1] ?? 0);
            sum[2] = (sum[2] ?? 0) + (pixels[offset + 2] ?? 0);
          }
          resolve({ r: (sum[0] ?? 0) / 9, g: (sum[1] ?? 0) / 9, b: (sum[2] ?? 0) / 9 });
        });
      }),
    { ndcX: x, ndcY: y },
  );
}

/** w1_l10：車在巷子南端，車尾後面 2.5 ft 就是南面那棟樓（bounds 的 z = 90 ft）；巷子在 x = −6.75～6.75 ft 之間。 */
const ALLEY = { startZFt: 80, southWallZFt: 90, minXFt: -6.75, maxXFt: 6.75 } as const;

/** 鏡頭在巷子裡（南牆的前面、兩面牆之間、高過車頂），車身中心在畫面中央，那裡畫的是藍色的車漆。 */
async function expectCarShownInAlley(page: Page, view: GameCameraView): Promise<void> {
  await expect(page.locator('#hud-camera')).toHaveAttribute('data-view', view);
  const camera = await cameraSnapshot(page);
  expect(camera.view).toBe(view);
  expect(camera.zFt, `${view}：鏡頭在南牆後面或裡面`).toBeLessThan(ALLEY.southWallZFt - 1);
  expect(camera.zFt).toBeGreaterThan(ALLEY.startZFt);
  expect(camera.xFt).toBeGreaterThan(ALLEY.minXFt + 1);
  expect(camera.xFt).toBeLessThan(ALLEY.maxXFt - 1);
  expect(camera.yFt, `${view}：鏡頭沒有高過車頂`).toBeGreaterThan(8);

  const { carScreen } = camera;
  if (carScreen === null) {
    throw new Error(`${view}：車在鏡頭後面`);
  }
  expect(Math.abs(carScreen.x), `${view}：車不在畫面中央`).toBeLessThan(0.2);
  expect(Math.abs(carScreen.y), `${view}：車不在畫面中央`).toBeLessThan(0.4);

  // 車身中心那一塊是藍色的車漆——不是屋頂或牆的紅磚，也不是地面的灰。
  const paint = await canvasPatchColor(page, carScreen.x, carScreen.y);
  expect(paint.b - paint.r, `${view}：畫面中央不是車漆 ${JSON.stringify(paint)}`).toBeGreaterThan(40);
  expect(paint.b - paint.g, `${view}：畫面中央不是車漆 ${JSON.stringify(paint)}`).toBeGreaterThan(20);
}

test('巷子關（w1_l10）開場：遠、近距離跟車都在巷子裡看得到車，不是只看到屋頂的磚；重來後也一樣', async ({
  page,
}) => {
  // 關卡自己的天氣（雨）、不關特效：就是玩家回報的那個畫面。
  await page.goto('/?level=w1_l10&view=chase_far&lang=zh-TW&touch=off');
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expectCarShownInAlley(page, 'chase_far');
  const opening = await cameraSnapshot(page);
  // 被牆擠近時視角比平常寬。
  expect(opening.fovDeg).toBeGreaterThan(60);
  await page.screenshot({ path: `${OUTPUT_DIR}/alley-opening-chase_far.png` });

  // 開場不滑動：過幾幀鏡頭還在同一個位置。
  await page.waitForTimeout(500);
  const settled = await cameraSnapshot(page);
  expect(Math.abs(settled.zFt - opening.zFt)).toBeLessThan(0.01);
  expect(Math.abs(settled.yFt - opening.yFt)).toBeLessThan(0.01);

  // 切一圈回到近距離跟車：同樣在巷子裡。一次按一下、等 HUD 換了再按下一下（同一幀裡連按只算一次）。
  const label = page.locator('#hud-camera');
  for (const view of ['hood', 'cockpit', 'top', 'chase_near'] as const) {
    await page.keyboard.press('KeyV');
    await expect(label).toHaveAttribute('data-view', view);
  }
  await expectCarShownInAlley(page, 'chase_near');
  await page.screenshot({ path: `${OUTPUT_DIR}/alley-opening-chase_near.png` });

  // 再切到遠距離跟車、重來：鏡頭直接回到開場的位置。
  await page.keyboard.press('KeyV');
  await expect(label).toHaveAttribute('data-view', 'chase_far');
  await page.keyboard.press('Backspace');
  await expectCarShownInAlley(page, 'chase_far');
  const restarted = await cameraSnapshot(page);
  expect(Math.abs(restarted.zFt - opening.zFt)).toBeLessThan(0.01);
  expect(Math.abs(restarted.yFt - opening.yFt)).toBeLessThan(0.01);
});
