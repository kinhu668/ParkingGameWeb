// 觸控層的 e2e：手機 viewport + hasTouch，用真實的觸控事件（CDP 的 Input.dispatchTouchEvent，可以多指）。
// 何時顯示（hasTouch、?touch=on／off、桌面）、拖方向盤轉向、踩油門前進、踩剎車減速（與油門同時踩）、
// 掛 R 後輔助層出現並能倒車、掛 D／重來收起、暫停後能點繼續、橫向與直向的版面不與輔助小窗搶點。
import type { CDPSession, Page } from '@playwright/test';
import { nextSnapshot } from './driving';
import { expect, OUTPUT_DIR, test } from './fixtures';

const LANDSCAPE = { width: 844, height: 390 };
const PORTRAIT = { width: 390, height: 844 };

const CONTROL_IDS = [
  'touch-wheel',
  'touch-brake',
  'touch-gas',
  'touch-gear-drive',
  'touch-gear-reverse',
  'touch-pause',
  'touch-restart',
] as const;
const ASSIST_IDS = ['assist-bird', 'assist-rear', 'assist-mirror-left', 'assist-mirror-right'] as const;

type Snapshot = Awaited<ReturnType<typeof nextSnapshot>>;

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Box extends Point {
  readonly width: number;
  readonly height: number;
}

/**
 * 螢幕上的手指：每根有自己的 id，可以同時按住好幾根。
 * CDP 的規則（實測）：touchStart／touchMove 要列出所有還按著的點；touchEnd 列出「要放開的那幾點」，其餘的繼續按著。
 */
class Fingers {
  private readonly points = new Map<number, Point>();

  private constructor(private readonly session: CDPSession) {}

  static async on(page: Page): Promise<Fingers> {
    return new Fingers(await page.context().newCDPSession(page));
  }

  private async send(type: 'touchStart' | 'touchMove'): Promise<void> {
    await this.session.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: [...this.points].map(([id, point]) => ({ id, x: point.x, y: point.y })),
    });
  }

  async down(id: number, point: Point): Promise<void> {
    this.points.set(id, point);
    await this.send('touchStart');
  }

  async move(id: number, point: Point): Promise<void> {
    this.points.set(id, point);
    await this.send('touchMove');
  }

  async up(id: number): Promise<void> {
    const point = this.points.get(id);
    if (point === undefined) {
      throw new Error(`手指 ${id} 沒有按著`);
    }
    this.points.delete(id);
    await this.session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [{ id, x: point.x, y: point.y }],
    });
  }
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

/** 用 id 這根手指踩住剎車到完全停住再放開；這一局必須還在進行。 */
async function brakeToStop(page: Page, fingers: Fingers, id: number): Promise<void> {
  await fingers.down(id, centerOf(await boxOf(page, 'touch-brake')));
  await expect(page.locator('#touch-brake')).toHaveAttribute('data-pressed', 'true');
  await waitFor(page, '停住', (snapshot) => snapshot.speedMph === 0);
  await fingers.up(id);
  await expect(page.locator('#touch-brake')).toHaveAttribute('data-pressed', 'false');
  expect((await nextSnapshot(page)).status).toBe('driving');
}

/** 掛 R 並等輔助層完全顯示。 */
async function shiftToReverse(page: Page): Promise<void> {
  await page.locator('#touch-gear-reverse').tap();
  await expect(page.locator('#hud-gear')).toHaveAttribute('data-gear', 'reverse');
  await expect(page.locator('#reverse-assist')).toHaveAttribute('data-visible', 'true');
  await expect(page.locator('#reverse-assist')).toHaveCSS('opacity', '1');
}

test.describe('桌面（沒有觸控）', () => {
  test('預設不顯示觸控層，鍵盤操作說明照舊；不認得的 ?touch 值當作沒給', async ({ page }) => {
    await page.goto('/?level=w1_l01&lang=zh-TW');
    await expect(page.locator('#hud-speed')).toHaveText('0.0');
    await expect(page.locator('#hud')).toHaveAttribute('data-touch', 'off');
    await expect(page.locator('#touch-controls')).toBeHidden();
    await expect(page.locator('.hud-controls')).toBeVisible();

    await page.goto('/?level=w1_l01&lang=zh-TW&touch=maybe');
    await expect(page.locator('#hud-speed')).toHaveText('0.0');
    await expect(page.locator('#touch-controls')).toBeHidden();
    await expect(page.locator('.hud-controls')).toBeVisible();
  });

  test('?touch=on 強制顯示，滑鼠也能按；鍵盤照常能開車', async ({ page }) => {
    await page.goto('/?level=w1_l01&lang=en&touch=on');
    await expect(page.locator('#hud')).toHaveAttribute('data-touch', 'on');
    for (const id of CONTROL_IDS) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await expect(page.locator('#touch-gas')).toHaveText('Gas');
    await expect(page.locator('#touch-brake')).toHaveText('Brake');
    await expect(page.locator('#touch-pause')).toHaveText('Pause');
    await expect(page.locator('#touch-restart')).toHaveText('Restart');
    // 左下角讓給方向盤：鍵盤的操作說明收起來。
    await expect(page.locator('.hud-controls')).toBeHidden();

    // 鍵盤：W 前進，空白鍵手煞車停住。
    const start = await nextSnapshot(page);
    await page.keyboard.down('KeyW');
    await waitFor(page, '鍵盤前進', (snapshot) => snapshot.speedMph > 1.5);
    await page.keyboard.up('KeyW');
    await page.keyboard.down('Space');
    const stopped = await waitFor(page, '停住', (snapshot) => snapshot.speedMph === 0);
    await page.keyboard.up('Space');
    expect(stopped.zFt).toBeLessThan(start.zFt);

    // 滑鼠點掛 R：進入手排 R 檔。
    await page.locator('#touch-gear-reverse').click();
    await expect(page.locator('#hud-gear')).toHaveAttribute('data-gear', 'reverse');
    await expect(page.locator('#hud-gear')).toHaveAttribute('data-mode', 'manual');
  });
});

test.describe('手機橫向', () => {
  test.use({ viewport: LANDSCAPE, hasTouch: true });

  test('有觸控就顯示觸控層（中文文案）；?touch=off 不顯示', async ({ page }) => {
    await page.goto('/?level=w1_l01&lang=zh-TW');
    await expect(page.locator('#hud')).toHaveAttribute('data-touch', 'on');
    for (const id of CONTROL_IDS) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await expect(page.locator('#touch-gas')).toHaveText('油門');
    await expect(page.locator('#touch-brake')).toHaveText('剎車');
    await expect(page.locator('#touch-pause')).toHaveText('暫停');
    await expect(page.locator('#touch-restart')).toHaveText('重來');
    await expect(page.locator('#touch-gear-drive')).toHaveAttribute('aria-label', '掛 D 檔');
    await expect(page.locator('#touch-gear-reverse')).toHaveAttribute('aria-label', '掛 R 檔');
    // 頁面不捲動、不縮放。
    await expect(page.locator('body')).toHaveCSS('touch-action', 'none');
    await expect(page.locator('#touch-wheel')).toHaveCSS('touch-action', 'none');

    await page.goto('/?level=w1_l01&lang=zh-TW&touch=off');
    await expect(page.locator('#hud-speed')).toHaveText('0.0');
    await expect(page.locator('#hud')).toHaveAttribute('data-touch', 'off');
    await expect(page.locator('#touch-controls')).toHaveCount(0);
  });

  test('踩油門前進；油門不放再踩剎車（兩指）會減速到停', async ({ page }) => {
    await page.goto('/?level=w1_l01&lang=zh-TW');
    await expect(page.locator('#touch-gas')).toBeVisible();
    const fingers = await Fingers.on(page);
    const start = await nextSnapshot(page);
    expect(start.speedMph).toBe(0);

    await fingers.down(1, centerOf(await boxOf(page, 'touch-gas')));
    await expect(page.locator('#touch-gas')).toHaveAttribute('data-pressed', 'true');
    const moving = await waitFor(page, '前進', (snapshot) => snapshot.speedMph > 3);
    // 起點朝 −Z：前進就是 z 變小。自排，檔位仍是 D。
    expect(moving.zFt).toBeLessThan(start.zFt);
    await expect(page.locator('#hud-gear')).toHaveAttribute('data-gear', 'forward');
    await expect(page.locator('#hud-gear')).toHaveAttribute('data-mode', 'auto');

    // 油門還踩著，另一根手指踩剎車：腳剎優先，車慢下來直到停住。
    await fingers.down(2, centerOf(await boxOf(page, 'touch-brake')));
    await expect(page.locator('#touch-brake')).toHaveAttribute('data-pressed', 'true');
    await expect(page.locator('#touch-gas')).toHaveAttribute('data-pressed', 'true');
    await page.screenshot({ path: `${OUTPUT_DIR}/touch-landscape-pedals.png` });
    const stopped = await waitFor(page, '剎停', (snapshot) => snapshot.speedMph === 0);
    expect(stopped.status).toBe('driving');

    // 放開剎車（油門還踩著）→ 又往前走；全部放開後踏板都彈回來。
    await fingers.up(2);
    await expect(page.locator('#touch-brake')).toHaveAttribute('data-pressed', 'false');
    await waitFor(page, '再前進', (snapshot) => snapshot.speedMph > 1);
    await fingers.up(1);
    await expect(page.locator('#touch-gas')).toHaveAttribute('data-pressed', 'false');
    await brakeToStop(page, fingers, 3);
  });

  test('拖方向盤轉向（同時踩油門），放開回正', async ({ page }) => {
    await page.goto('/?level=w1_l01&lang=zh-TW');
    const wheel = page.locator('#touch-wheel');
    await expect(wheel).toBeVisible();
    const fingers = await Fingers.on(page);
    const start = await nextSnapshot(page);

    // 從方向盤正上方順時針拖到正右方：向右打。
    const box = await boxOf(page, 'touch-wheel');
    const center = centerOf(box);
    const radius = (box.width / 2) * 0.75;
    const onRim = (degrees: number): Point => ({
      x: center.x + Math.cos((degrees * Math.PI) / 180) * radius,
      y: center.y + Math.sin((degrees * Math.PI) / 180) * radius,
    });
    await fingers.down(1, onRim(-90));
    await expect(wheel).toHaveAttribute('data-held', 'true');
    for (let degrees = -75; degrees <= 0; degrees += 15) {
      await fingers.move(1, onRim(degrees));
    }
    await expect.poll(async () => Number(await wheel.getAttribute('aria-valuenow'))).toBeGreaterThan(80);

    // 方向盤不放，另一根手指踩油門：車往右彎（heading 順時針增加）。
    await fingers.down(2, centerOf(await boxOf(page, 'touch-gas')));
    const turned = await waitFor(
      page,
      '右轉',
      (snapshot) => headingChangeDeg(start.headingDeg, snapshot.headingDeg) > 8,
    );
    expect(turned.xFt).toBeGreaterThan(start.xFt);
    await page.screenshot({ path: `${OUTPUT_DIR}/touch-landscape-steering.png` });
    // 只放開油門：方向盤那根手指還握著。
    await fingers.up(2);
    await expect(page.locator('#touch-gas')).toHaveAttribute('data-pressed', 'false');
    await expect(wheel).toHaveAttribute('data-held', 'true');

    // 放開方向盤：很快回正。
    await fingers.up(1);
    await expect(wheel).toHaveAttribute('data-held', 'false');
    await expect.poll(async () => Number(await wheel.getAttribute('aria-valuenow'))).toBe(0);
    await brakeToStop(page, fingers, 3);

    // 往左拖：角度是負的。
    await fingers.down(4, onRim(-90));
    for (let degrees = -105; degrees >= -150; degrees -= 15) {
      await fingers.move(4, onRim(degrees));
    }
    await expect.poll(async () => Number(await wheel.getAttribute('aria-valuenow'))).toBeLessThan(-50);
    await fingers.up(4);
    await expect.poll(async () => Number(await wheel.getAttribute('aria-valuenow'))).toBe(0);
  });

  test('掛 R：輔助層出現、油門變成倒車；掛 D 收起；重來回到 D 檔', async ({ page }) => {
    await page.goto('/?level=w1_l05&view=chase_near&lang=zh-TW');
    const gear = page.locator('#hud-gear');
    const assist = page.locator('#reverse-assist');
    await expect(page.locator('#touch-gear-reverse')).toBeVisible();
    await expect(gear).toHaveAttribute('data-gear', 'forward');
    await expect(assist).toHaveAttribute('data-visible', 'false');
    await expect(page.locator('#touch-gear-drive')).toHaveAttribute('data-active', 'true');
    const fingers = await Fingers.on(page);
    const start = await nextSnapshot(page);

    await shiftToReverse(page);
    await expect(gear).toHaveAttribute('data-mode', 'manual');
    await expect(page.locator('#touch-gear-reverse')).toHaveAttribute('data-active', 'true');
    await expect(page.locator('#touch-gear-drive')).toHaveAttribute('data-active', 'false');
    for (const id of ASSIST_IDS) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }

    // R 檔踩油門：往後走（起點朝 −Z，倒車是 z 變大）。一有速度就放開、剎停，免得幀率低時倒太遠。
    await fingers.down(1, centerOf(await boxOf(page, 'touch-gas')));
    const reversing = await waitFor(page, '倒車', (snapshot) => snapshot.speedMph < -1.5);
    await fingers.up(1);
    expect(reversing.zFt).toBeGreaterThan(start.zFt);
    await brakeToStop(page, fingers, 2);
    await expect(assist).toHaveAttribute('data-visible', 'true');
    await page.screenshot({ path: `${OUTPUT_DIR}/touch-landscape-reverse.png` });

    // 掛 D：輔助層收起，油門又是向前。
    await page.locator('#touch-gear-drive').tap();
    await expect(gear).toHaveAttribute('data-gear', 'forward');
    await expect(assist).toHaveAttribute('data-visible', 'false');
    await expect(assist).toBeHidden();
    const beforeForward = await nextSnapshot(page);
    await fingers.down(3, centerOf(await boxOf(page, 'touch-gas')));
    const forward = await waitFor(page, '前進', (snapshot) => snapshot.speedMph > 1.5);
    await fingers.up(3);
    expect(forward.zFt).toBeLessThan(beforeForward.zFt);
    await brakeToStop(page, fingers, 4);

    // 再掛 R，點重來：車回起點、自排 D 檔、輔助層收起。
    await shiftToReverse(page);
    await page.locator('#touch-restart').tap();
    await expect(gear).toHaveAttribute('data-gear', 'forward');
    await expect(gear).toHaveAttribute('data-mode', 'auto');
    await expect(assist).toHaveAttribute('data-visible', 'false');
    const restarted = await nextSnapshot(page);
    expect(restarted.status).toBe('ready');
    expect(restarted.zFt).toBeCloseTo(start.zFt, 2);
    expect(restarted.xFt).toBeCloseTo(start.xFt, 2);
  });
});

for (const [name, viewport] of [
  ['橫向', LANDSCAPE],
  ['直向', PORTRAIT],
] as const) {
  test.describe(`版面（手機${name} ${viewport.width}×${viewport.height}）`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });

    test('每個控制項都點得到、不與輔助小窗重疊；暫停後能點繼續、重來', async ({ page }) => {
      await page.goto('/?level=w1_l05&view=chase_near&lang=zh-TW');
      await expect(page.locator('#touch-controls')).toBeVisible();
      await shiftToReverse(page);

      const controls = new Map<string, Box>();
      for (const id of CONTROL_IDS) {
        controls.set(id, await boxOf(page, id));
      }
      const views = new Map<string, Box>();
      for (const id of ASSIST_IDS) {
        views.set(id, await boxOf(page, id));
      }

      for (const [id, box] of controls) {
        // 在畫面內、夠大。
        expect(box.x, id).toBeGreaterThanOrEqual(0);
        expect(box.y, id).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, id).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height, id).toBeLessThanOrEqual(viewport.height);
        expect(Math.min(box.width, box.height), id).toBeGreaterThanOrEqual(44);
        // 不壓到任何一個輔助小窗，也不壓到別的控制項。
        for (const [viewId, viewBox] of views) {
          expect(overlaps(box, viewBox), `${id} 與 ${viewId}`).toBe(false);
        }
        for (const [otherId, otherBox] of controls) {
          if (otherId !== id) {
            expect(overlaps(box, otherBox), `${id} 與 ${otherId}`).toBe(false);
          }
        }
        // 點它的正中央，點到的就是它（沒有被別的東西蓋住）。
        const center = centerOf(box);
        const hit = await page.evaluate(
          ({ x, y }) => document.elementFromPoint(x, y)?.closest('[id^="touch-"]')?.id ?? null,
          center,
        );
        expect(hit, id).toBe(id);
      }
      // 輔助小窗的正中央沒有被觸控層的任何東西蓋住。
      for (const [viewId, viewBox] of views) {
        const hit = await page.evaluate(
          ({ x, y }) => document.elementFromPoint(x, y)?.closest('#touch-controls') !== null,
          centerOf(viewBox),
        );
        expect(hit, viewId).toBe(false);
      }
      // 方向盤在左、踏板在右。
      const wheel = controls.get('touch-wheel');
      const brake = controls.get('touch-brake');
      const gas = controls.get('touch-gas');
      expect((wheel?.x ?? 0) + (wheel?.width ?? 0)).toBeLessThan(brake?.x ?? 0);
      expect((brake?.x ?? 0) + (brake?.width ?? 0)).toBeLessThan(gas?.x ?? 0);
      await page.screenshot({ path: `${OUTPUT_DIR}/touch-layout-${viewport.width}x${viewport.height}.png` });

      // 踏板與方向盤真的收得到觸控。
      const fingers = await Fingers.on(page);
      await fingers.down(1, centerOf(await boxOf(page, 'touch-brake')));
      await expect(page.locator('#touch-brake')).toHaveAttribute('data-pressed', 'true');
      await fingers.down(2, centerOf(await boxOf(page, 'touch-wheel')));
      await expect(page.locator('#touch-wheel')).toHaveAttribute('data-held', 'true');
      await fingers.up(2);
      await fingers.up(1);
      await expect(page.locator('#touch-brake')).toHaveAttribute('data-pressed', 'false');

      // 暫停：觸控層收起，暫停面板上的按鈕點得到；繼續後觸控層回來，檔位還是 R。
      await page.locator('#touch-pause').tap();
      await expect(page.locator('#hud-pause')).toBeVisible();
      await expect(page.locator('#touch-controls')).toBeHidden();
      for (const id of ['pause-resume', 'pause-retry', 'pause-select']) {
        const box = await boxOf(page, id);
        expect(box.x, id).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, id).toBeLessThanOrEqual(viewport.width);
      }
      await page.locator('#pause-resume').tap();
      await expect(page.locator('#hud-pause')).toBeHidden();
      await expect(page.locator('#touch-controls')).toBeVisible();
      await expect(page.locator('#hud-gear')).toHaveAttribute('data-gear', 'reverse');

      // 掛 D 收起輔助層；再掛 R 後重來也收起，回到自排 D 檔。
      await page.locator('#touch-gear-drive').tap();
      await expect(page.locator('#reverse-assist')).toHaveAttribute('data-visible', 'false');
      await shiftToReverse(page);
      await page.locator('#touch-restart').tap();
      await expect(page.locator('#hud-gear')).toHaveAttribute('data-gear', 'forward');
      await expect(page.locator('#hud-gear')).toHaveAttribute('data-mode', 'auto');
      await expect(page.locator('#reverse-assist')).toHaveAttribute('data-visible', 'false');
    });
  });
}
