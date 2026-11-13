// 螢幕操作層在桌面（滑鼠＋鍵盤）與這一輪新增的手機功能：
// 桌面預設看得到方向盤／剎車／油門與鍵帽、滑鼠拖方向盤與按踏板能開車、鍵盤照常；
// 點鍵帽（不是控制項本體）改鍵：存檔、標籤、按鍵設定面板一致，同一鍵擋下來、Esc 取消；
// 手機橫向與直向：鏡頭鍵依序切換、輔助小窗明顯比舊尺寸小但仍可見、沒有鍵帽與鍵盤提示。
import type { Page } from '@playwright/test';
import { GAME_CAMERA_VIEWS } from '../src/core/cameraView';
import { nextSnapshot } from './driving';
import { expect, OUTPUT_DIR, test } from './fixtures';

const CONTROLS_KEY = 'parkinggame.controls.v1';

type Snapshot = Awaited<ReturnType<typeof nextSnapshot>>;

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Box extends Point {
  readonly width: number;
  readonly height: number;
}

async function boxOf(page: Page, id: string): Promise<Box> {
  const box = await page.locator(`#${id}`).boundingBox();
  if (box === null) {
    throw new Error(`#${id} 沒有顯示`);
  }
  return box;
}

function centerOf(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** 每幀讀狀態直到符合條件；等不到就丟錯。 */
async function waitFor(page: Page, what: string, done: (snapshot: Snapshot) => boolean): Promise<Snapshot> {
  const deadlineMs = Date.now() + 30_000;
  let snapshot = await nextSnapshot(page);
  while (!done(snapshot)) {
    if (Date.now() > deadlineMs) {
      throw new Error(`等不到「${what}」：${JSON.stringify(snapshot)}`);
    }
    snapshot = await nextSnapshot(page);
  }
  return snapshot;
}

/** 車頭方向的變化（度），收到 (−180, 180]。 */
function headingChangeDeg(from: number, to: number): number {
  return ((((to - from + 180) % 360) + 360) % 360) - 180;
}

/** 滑鼠按住 id 這個控制項的正中央直到狀態符合條件，然後放開。 */
async function mouseHoldUntil(
  page: Page,
  id: string,
  what: string,
  done: (snapshot: Snapshot) => boolean,
): Promise<Snapshot> {
  const center = centerOf(await boxOf(page, id));
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  try {
    return await waitFor(page, what, done);
  } finally {
    await page.mouse.up();
  }
}

/** 按住一個鍵直到狀態符合條件，然後放開。 */
async function keyHoldUntil(
  page: Page,
  code: string,
  what: string,
  done: (snapshot: Snapshot) => boolean,
): Promise<Snapshot> {
  await page.keyboard.down(code);
  try {
    return await waitFor(page, what, done);
  } finally {
    await page.keyboard.up(code);
  }
}

/** localStorage 裡的按鍵存檔；沒有是 null。 */
async function storedBindings(page: Page): Promise<Record<string, readonly string[]> | null> {
  return page.evaluate((key) => {
    const text = window.localStorage.getItem(key);
    if (text === null) {
      return null;
    }
    return (JSON.parse(text) as { bindings: Record<string, readonly string[]> }).bindings;
  }, CONTROLS_KEY);
}

test.describe('桌面：滑鼠與鍵盤', () => {
  test('預設看得到方向盤／剎車／油門與鍵帽；滑鼠拖方向盤轉向、按油門前進、按剎車停住；鍵盤 W 照常', async ({
    page,
  }) => {
    await page.goto('/?level=w1_l01&lang=zh-TW');
    await expect(page.locator('#hud')).toHaveAttribute('data-touch', 'on');
    await expect(page.locator('#hud')).toHaveAttribute('data-keys', 'on');
    for (const id of ['touch-wheel', 'touch-brake', 'touch-gas', 'touch-camera']) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    // 鍵帽寫的是預設綁定：方向盤左右是 A／D，油門 W，剎車 S，切換檔位 R。
    for (const [action, text] of [
      ['steerLeft', 'A'],
      ['steerRight', 'D'],
      ['throttle', 'W'],
      ['brake', 'S'],
      ['gearToggle', 'R'],
      ['pause', 'Esc'],
      ['restart', 'Backspace'],
      ['toggleCamera', 'V'],
    ] as const) {
      await expect(page.locator(`#touch-key-${action}`)).toBeVisible();
      await expect(page.locator(`#touch-key-${action}`)).toHaveText(text);
    }
    // 鍵帽疊在自己的控制項上：左右轉在方向盤上，W 在油門上，S 在剎車上，R 在切換檔位鈕上。
    const wheelBox = await boxOf(page, 'touch-wheel');
    expect(overlaps(await boxOf(page, 'touch-key-steerLeft'), wheelBox)).toBe(true);
    expect(overlaps(await boxOf(page, 'touch-key-steerRight'), wheelBox)).toBe(true);
    expect((await boxOf(page, 'touch-key-steerLeft')).x).toBeLessThan((await boxOf(page, 'touch-key-steerRight')).x);
    expect(overlaps(await boxOf(page, 'touch-key-throttle'), await boxOf(page, 'touch-gas'))).toBe(true);
    expect(overlaps(await boxOf(page, 'touch-key-brake'), await boxOf(page, 'touch-brake'))).toBe(true);
    expect(overlaps(await boxOf(page, 'touch-key-gearToggle'), await boxOf(page, 'touch-gear'))).toBe(true);
    // 沒有分開的掛 D、掛 R 鍵帽，也沒有倒車油門的鍵帽。
    for (const removed of ['gearDrive', 'gearReverse', 'reverse']) {
      await expect(page.locator(`#touch-key-${removed}`)).toHaveCount(0);
    }
    await page.screenshot({ path: `${OUTPUT_DIR}/screen-controls-desktop-zh-TW.png` });

    const start = await nextSnapshot(page);
    expect(start.speedMph).toBe(0);

    // 滑鼠按住油門本體：前進（起點朝 −Z，z 變小）；這不是改鍵。
    const moving = await mouseHoldUntil(page, 'touch-gas', '滑鼠踩油門前進', (snapshot) => snapshot.speedMph > 2);
    expect(moving.zFt).toBeLessThan(start.zFt);
    await expect(page.locator('#touch-key-throttle')).toHaveAttribute('data-listening', 'false');
    await expect(page.locator('#touch-key-message')).toBeHidden();
    await expect(page.locator('#touch-gas')).toHaveAttribute('data-pressed', 'false');
    // 滑鼠按住剎車本體：停住。
    const stopped = await mouseHoldUntil(page, 'touch-brake', '滑鼠踩剎車停住', (snapshot) => snapshot.speedMph === 0);
    expect(stopped.status).toBe('driving');

    // 滑鼠拖方向盤（從正上方順時針拖到正右方）並握著，同時用鍵盤 W 前進：車往右彎——滑鼠與鍵盤的輸入合在一起。
    const wheel = page.locator('#touch-wheel');
    const center = centerOf(wheelBox);
    const radius = (wheelBox.width / 2) * 0.75;
    const onRim = (degrees: number): Point => ({
      x: center.x + Math.cos((degrees * Math.PI) / 180) * radius,
      y: center.y + Math.sin((degrees * Math.PI) / 180) * radius,
    });
    const top = onRim(-90);
    await page.mouse.move(top.x, top.y);
    await page.mouse.down();
    await expect(wheel).toHaveAttribute('data-held', 'true');
    for (let degrees = -75; degrees <= 0; degrees += 15) {
      const point = onRim(degrees);
      await page.mouse.move(point.x, point.y);
    }
    await expect.poll(async () => Number(await wheel.getAttribute('aria-valuenow'))).toBeGreaterThan(80);
    const before = await nextSnapshot(page);
    const turned = await keyHoldUntil(
      page,
      'KeyW',
      '鍵盤前進＋滑鼠右轉',
      (snapshot) => headingChangeDeg(before.headingDeg, snapshot.headingDeg) > 8,
    );
    expect(turned.xFt).toBeGreaterThan(before.xFt);
    // 放開滑鼠：方向盤回正。
    await page.mouse.up();
    await expect(wheel).toHaveAttribute('data-held', 'false');
    await expect.poll(async () => Number(await wheel.getAttribute('aria-valuenow'))).toBe(0);
    await keyHoldUntil(page, 'Comma', '停住', (snapshot) => snapshot.speedMph === 0);
    expect((await nextSnapshot(page)).status).toBe('driving');

    // 滑鼠點「鏡頭」：與 V 同一個循環。
    const label = page.locator('#hud-camera');
    const first = await label.getAttribute('data-view');
    await page.locator('#touch-camera').click();
    await expect(label).not.toHaveAttribute('data-view', first ?? '');

    // 桌面有鍵盤：暫停面板上「按 Esc 繼續」的提示照舊。
    await page.locator('#touch-pause').click();
    await expect(page.locator('#hud-pause')).toBeVisible();
    await expect(page.locator('#hud-pause .hud-status-hint')).toBeVisible();
    await expect(page.locator('#hud-pause .hud-status-hint')).toHaveText('按 Esc 繼續');
    await page.keyboard.press('Escape');
    await expect(page.locator('#hud-pause')).toBeHidden();

    // 桌面的輔助小窗沒有被縮小：1280×720 還是原本的 310×194 與 218 寬的後視鏡。
    await page.keyboard.press('KeyR');
    await expect(page.locator('#reverse-assist')).toHaveAttribute('data-visible', 'true');
    await expect(page.locator('#reverse-assist')).toHaveAttribute('data-compact', 'false');
    const rear = await boxOf(page, 'assist-rear');
    expect(Math.round(rear.width)).toBe(310);
    expect(Math.round(rear.height)).toBe(194);
    expect(Math.round((await boxOf(page, 'assist-mirror-left')).width)).toBe(218);
  });

  test('點油門的鍵帽改鍵：存檔、標籤、按鍵設定面板一致；舊鍵失效、新鍵能開；踩踏板本體不會開始改鍵', async ({
    page,
  }) => {
    await page.goto('/?level=w1_l01&lang=zh-TW');
    const cap = page.locator('#touch-key-throttle');
    const message = page.locator('#touch-key-message');
    await expect(cap).toHaveText('W');
    await expect(message).toBeHidden();
    expect(await storedBindings(page)).toBeNull();
    const start = await nextSnapshot(page);

    // 點鍵帽：進入等按鍵（鍵帽亮起、下方有提示）；踏板本身沒有被踩下去。
    await cap.click();
    await expect(cap).toHaveAttribute('data-listening', 'true');
    await expect(message).toBeVisible();
    await expect(message).toHaveAttribute('data-kind', 'listening');
    await expect(message).toContainText('油門');
    await expect(message).toContainText('Esc');
    await expect(page.locator('#touch-gas')).toHaveAttribute('data-pressed', 'false');
    await page.screenshot({ path: `${OUTPUT_DIR}/screen-controls-listening-zh-TW.png` });

    // 按 S（已經是剎車的鍵）：擋下來並說明是誰的，綁定與存檔不變——與按鍵設定面板同一條規則。
    await page.keyboard.press('KeyS');
    await expect(cap).toHaveAttribute('data-listening', 'false');
    await expect(message).toHaveAttribute('data-kind', 'warning');
    await expect(message).toContainText('剎車');
    await expect(cap).toHaveText('W');
    expect(await storedBindings(page)).toBeNull();
    // 等按鍵時按下去的 S 不是遊戲輸入：車沒動、這一局還沒開始。
    expect((await nextSnapshot(page)).status).toBe('ready');

    // 再點一次，按 Esc：取消，什麼都沒變（也沒有暫停）。
    await cap.click();
    await expect(cap).toHaveAttribute('data-listening', 'true');
    await page.keyboard.press('Escape');
    await expect(cap).toHaveAttribute('data-listening', 'false');
    await expect(message).toBeHidden();
    await expect(cap).toHaveText('W');
    await expect(page.locator('#hud-pause')).toBeHidden();

    // 再點一次，按 I：油門的主要鍵改成 I，備用鍵（↑）不動；寫進 parkinggame.controls.v1，鍵帽立刻是 I。
    await cap.click();
    await page.keyboard.press('KeyI');
    await expect(cap).toHaveAttribute('data-listening', 'false');
    await expect(cap).toHaveText('I');
    await expect(cap).toHaveAttribute('data-code', 'KeyI');
    await expect(message).toHaveAttribute('data-kind', 'info');
    await expect(message).toContainText('I');
    const stored = await storedBindings(page);
    expect(stored?.throttle).toEqual(['KeyI', 'ArrowUp']);
    expect(stored?.brake).toEqual(['KeyS', 'ArrowDown', 'Comma']);
    expect(stored?.gearToggle).toEqual(['KeyR']);
    await page.screenshot({ path: `${OUTPUT_DIR}/screen-controls-rebound-zh-TW.png` });

    // 舊的 W 不再是油門：按住幾幀車都不動。
    await page.keyboard.down('KeyW');
    for (let frame = 0; frame < 10; frame += 1) {
      const snapshot = await nextSnapshot(page);
      expect(snapshot.speedMph).toBe(0);
      expect(snapshot.status).toBe('ready');
    }
    await page.keyboard.up('KeyW');
    // 新的 I 能開。
    const moving = await keyHoldUntil(page, 'KeyI', '用新鍵前進', (snapshot) => snapshot.speedMph > 1.5);
    expect(moving.zFt).toBeLessThan(start.zFt);
    // 踩油門踏板本體（滑鼠）：照常開車，不會進入改鍵。
    await mouseHoldUntil(page, 'touch-gas', '滑鼠踩油門', (snapshot) => snapshot.speedMph > 2.5);
    await expect(cap).toHaveAttribute('data-listening', 'false');
    await expect(cap).toHaveText('I');
    await mouseHoldUntil(page, 'touch-brake', '停住', (snapshot) => snapshot.speedMph === 0);
    await expect(page.locator('#touch-key-brake')).toHaveAttribute('data-listening', 'false');

    // 按鍵設定面板（暫停 → 按鍵設定）顯示同一份綁定；在面板裡改剎車，回來後螢幕上的鍵帽也跟著變。
    await page.keyboard.press('Escape');
    await expect(page.locator('#hud-pause')).toBeVisible();
    await page.locator('#pause-controls').click();
    await expect(page.locator('#controls-panel')).toBeVisible();
    await expect(page.locator('#bind-throttle-0')).toHaveText('I');
    await expect(page.locator('#bind-throttle-1')).toHaveText('↑');
    await page.locator('#bind-brake-0').click();
    await page.keyboard.press('KeyB');
    await expect(page.locator('#bind-brake-0')).toHaveText('B');
    await page.locator('#controls-done').click();
    await page.locator('#pause-resume').click();
    await expect(page.locator('#touch-controls')).toBeVisible();
    await expect(page.locator('#touch-key-brake')).toHaveText('B');
    await expect(cap).toHaveText('I');

    // 重新整理後還在。
    await page.reload();
    await expect(page.locator('#touch-key-throttle')).toHaveText('I');
    await expect(page.locator('#touch-key-brake')).toHaveText('B');
  });

  test('點方向盤上的鍵帽改左轉鍵（英文）；拖方向盤本體不會開始改鍵；等按鍵時去踩踏板 = 不改了', async ({ page }) => {
    await page.goto('/?level=w1_l01&lang=en');
    const left = page.locator('#touch-key-steerLeft');
    const message = page.locator('#touch-key-message');
    await expect(left).toHaveText('A');
    await expect(page.locator('#touch-key-steerRight')).toHaveText('D');
    await page.screenshot({ path: `${OUTPUT_DIR}/screen-controls-desktop-en.png` });

    // 拖方向盤本體：只是轉向。
    const wheelBox = await boxOf(page, 'touch-wheel');
    const center = centerOf(wheelBox);
    await page.mouse.move(center.x, center.y - wheelBox.height * 0.36);
    await page.mouse.down();
    await page.mouse.move(center.x - wheelBox.width * 0.3, center.y - wheelBox.height * 0.2);
    await page.mouse.move(center.x - wheelBox.width * 0.36, center.y);
    await expect
      .poll(async () => Number(await page.locator('#touch-wheel').getAttribute('aria-valuenow')))
      .toBeLessThan(-40);
    await expect(left).toHaveAttribute('data-listening', 'false');
    await expect(message).toBeHidden();
    await page.mouse.up();

    // 點左邊的鍵帽 → 等按鍵；這時去踩油門踏板 = 不改了（踏板照常是開車）。
    await left.click();
    await expect(left).toHaveAttribute('data-listening', 'true');
    await expect(message).toContainText('Steer left');
    await mouseHoldUntil(page, 'touch-gas', '踩油門', (snapshot) => snapshot.speedMph > 1.5);
    await expect(left).toHaveAttribute('data-listening', 'false');
    await expect(message).toBeHidden();
    await expect(left).toHaveText('A');
    await mouseHoldUntil(page, 'touch-brake', '停住', (snapshot) => snapshot.speedMph === 0);

    // 再點一次，按 J：左轉改成 J；按住 J＋W 車往左彎，舊的 A 不再轉向。
    await left.click();
    await page.keyboard.press('KeyJ');
    await expect(left).toHaveText('J');
    await expect(message).toContainText('Steer left is now J.');
    expect((await storedBindings(page))?.steerLeft).toEqual(['KeyJ', 'ArrowLeft']);
    const before = await nextSnapshot(page);
    await page.keyboard.down('KeyJ');
    const turned = await keyHoldUntil(
      page,
      'KeyW',
      '用新鍵左轉',
      (snapshot) => headingChangeDeg(before.headingDeg, snapshot.headingDeg) < -6,
    );
    await page.keyboard.up('KeyJ');
    expect(turned.xFt).toBeLessThan(before.xFt);
    await keyHoldUntil(page, 'Comma', '停住', (snapshot) => snapshot.speedMph === 0);
    expect((await nextSnapshot(page)).status).toBe('driving');
  });
});

/** 上一版（縮小之前）手機上倒後鏡頭與後視鏡的大小（CSS 像素）。 */
const PREVIOUS_ASSIST = {
  landscape: { rear: { width: 168, height: 105 }, mirror: { width: 143, height: 95 } },
  portrait: { rear: { width: 242, height: 151 }, mirror: { width: 100, height: 67 } },
} as const;

for (const [name, viewport, previous] of [
  ['橫向', { width: 844, height: 390 }, PREVIOUS_ASSIST.landscape],
  ['直向', { width: 390, height: 844 }, PREVIOUS_ASSIST.portrait],
] as const) {
  test.describe(`手機${name} ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });

    test('鏡頭鍵依 V 的順序循環；輔助小窗明顯變小但仍可見、不與操作層重疊；沒有鍵帽與鍵盤提示', async ({
      page,
    }) => {
      await page.goto('/?level=w1_l05&view=chase_near&lang=zh-TW');
      const camera = page.locator('#touch-camera');
      const label = page.locator('#hud-camera');
      await expect(camera).toBeVisible();
      await expect(camera).toHaveText('鏡頭');
      await expect(camera).toHaveAttribute('aria-label', '鏡頭');
      // 手機沒有鍵盤：不放鍵帽。
      await expect(page.locator('#hud')).toHaveAttribute('data-keys', 'off');
      await expect(page.locator('.touch-key')).toHaveCount(0);

      // 點鏡頭鍵：chase_near → chase_far → hood → cockpit → top → 回到 chase_near，HUD 的名稱跟著換。
      await expect(label).toHaveAttribute('data-view', 'chase_near');
      const names = ['近距離跟車', '遠距離跟車', '引擎蓋', '駕駛座', '俯視'];
      for (let step = 1; step <= GAME_CAMERA_VIEWS.length; step += 1) {
        await camera.tap();
        const index = step % GAME_CAMERA_VIEWS.length;
        await expect(label).toHaveAttribute('data-view', GAME_CAMERA_VIEWS[index] ?? '');
        await expect(label).toHaveText(names[index] ?? '');
      }
      // 選擇有記住（與 V 同一條路）：切到遠距離跟車後存檔裡是它。
      await camera.tap();
      await expect(label).toHaveAttribute('data-view', 'chase_far');
      await camera.tap();
      await camera.tap();
      await camera.tap();
      await camera.tap();
      await expect(label).toHaveAttribute('data-view', 'chase_near');

      // 點切換檔位鈕切到 R：輔助小窗出現。
      await page.locator('#touch-gear').tap();
      await expect(page.locator('#hud-gear')).toHaveAttribute('data-gear', 'reverse');
      await expect(page.locator('#reverse-assist')).toHaveAttribute('data-visible', 'true');
      await expect(page.locator('#reverse-assist')).toHaveCSS('opacity', '1');
      await expect(page.locator('#reverse-assist')).toHaveAttribute('data-compact', 'true');
      const rear = await boxOf(page, 'assist-rear');
      const bird = await boxOf(page, 'assist-bird');
      const mirrorLeft = await boxOf(page, 'assist-mirror-left');
      const mirrorRight = await boxOf(page, 'assist-mirror-right');
      // 每一邊至少比舊尺寸少 30%（面積不到一半）……
      expect(rear.width).toBeLessThanOrEqual(previous.rear.width * 0.7);
      expect(rear.height).toBeLessThanOrEqual(previous.rear.height * 0.7);
      expect(bird.height).toBeLessThanOrEqual(previous.rear.height * 0.7);
      for (const mirror of [mirrorLeft, mirrorRight]) {
        expect(mirror.width).toBeLessThanOrEqual(previous.mirror.width * 0.7);
        expect(mirror.height).toBeLessThanOrEqual(previous.mirror.height * 0.7 + 1);
      }
      // ……但不是小點：都看得到、有一定大小、在畫面內。
      for (const id of ['assist-rear', 'assist-bird', 'assist-mirror-left', 'assist-mirror-right']) {
        await expect(page.locator(`#${id}`)).toBeVisible();
      }
      expect(rear.width).toBeGreaterThanOrEqual(100);
      expect(rear.height).toBeGreaterThanOrEqual(60);
      expect(mirrorLeft.width).toBeGreaterThanOrEqual(64);
      expect(mirrorLeft.height).toBeGreaterThanOrEqual(42);
      expect(mirrorRight.x + mirrorRight.width).toBeLessThanOrEqual(viewport.width);
      // 鏡頭鍵（與其他控制項）不壓到小窗。
      const cameraBox = await boxOf(page, 'touch-camera');
      for (const view of [rear, bird, mirrorLeft, mirrorRight]) {
        expect(overlaps(cameraBox, view)).toBe(false);
        expect(overlaps(await boxOf(page, 'touch-wheel'), view)).toBe(false);
        expect(overlaps(await boxOf(page, 'touch-gas'), view)).toBe(false);
      }
      // 倒車時切鏡頭照樣可以，小窗還在。
      await camera.tap();
      await expect(label).toHaveAttribute('data-view', 'chase_far');
      await expect(page.locator('#reverse-assist')).toHaveAttribute('data-visible', 'true');
      await page.screenshot({ path: `${OUTPUT_DIR}/screen-controls-phone-${viewport.width}x${viewport.height}.png` });

      // 暫停面板：「按 Esc 繼續」的鍵盤提示收起來，按鈕照常。
      await page.locator('#touch-pause').tap();
      await expect(page.locator('#hud-pause')).toBeVisible();
      await expect(page.locator('#hud-pause .hud-status-hint')).toBeHidden();
      await expect(page.locator('#pause-resume')).toBeVisible();
      await page.locator('#pause-resume').tap();
      await expect(page.locator('#hud-pause')).toBeHidden();
    });
  });
}
