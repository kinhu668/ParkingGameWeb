// 聲音、撞車警報與救護車燈條的 e2e。無頭環境聽不到聲音，所以斷言的是遊戲自己的唯讀旗標：
// window.__parkingGame.audio()（解鎖、音量、正在響的聲音、累計的嗶聲與悶響）、alarms()、lightbars()。
// 操作一律送真實的鍵盤與滑鼠事件。型別只用 import type（規格檔不能把語系 JSON 帶進來）。
import type { Page } from '@playwright/test';
import type { AudioSnapshot } from '../src/audio/audioEngine';
import type { AlarmSnapshot, LightbarSnapshot } from '../src/level/alarm';
import type { SessionSnapshot } from '../src/level/session';
import { expect, OUTPUT_DIR, test } from './fixtures';

const SHOT_READY = 'body[data-shot-ready="true"]';
const SAVE_KEY = 'parkinggame.save.v1';
/** 等一個條件的真實時間上限；軟體算圖幀率低也夠。 */
const DEADLINE_MS = 60_000;
/** 警報長度（ALARM_RULES.durationS）與救護車的警戒長度（sirenYelpS）。 */
const ALARM_S = 6;
const SIREN_S = 2.5;

interface GameState {
  readonly snapshot: SessionSnapshot;
  readonly audio: AudioSnapshot;
  readonly alarms: readonly AlarmSnapshot[];
  readonly lightbars: readonly LightbarSnapshot[];
}

/** 等遊戲畫完下一幀，再讀四份唯讀快照（同一幀的）。 */
async function nextState(page: Page): Promise<GameState> {
  return page.evaluate(
    () =>
      new Promise<GameState>((resolve, reject) => {
        requestAnimationFrame(() => {
          const game = window.__parkingGame;
          if (game === undefined) {
            reject(new Error('window.__parkingGame 不存在'));
          } else {
            resolve({
              snapshot: game.snapshot(),
              audio: game.audio(),
              alarms: game.alarms(),
              lightbars: game.lightbars(),
            });
          }
        });
      }),
  );
}

/** 每幀讀狀態直到條件成立。 */
async function watchUntil(
  page: Page,
  what: string,
  done: (state: GameState) => boolean,
): Promise<GameState> {
  const deadlineMs = Date.now() + DEADLINE_MS;
  let state = await nextState(page);
  while (!done(state)) {
    if (Date.now() > deadlineMs) {
      throw new Error(`等不到「${what}」，最後狀態：${JSON.stringify(state)}`);
    }
    state = await nextState(page);
  }
  return state;
}

/** w1_l03：切到 R 檔、按住油門直線倒車，撞到走道對面那台車（collision.spec.ts 的同一條路）。 */
async function reverseIntoCar(page: Page, collisions: number): Promise<GameState> {
  await page.keyboard.press('KeyR');
  await expect(page.locator('#hud-gear')).toHaveAttribute('data-gear', 'reverse');
  await page.keyboard.down('KeyW');
  const hit = await watchUntil(page, `碰撞數到 ${collisions}`, (state) => state.snapshot.collisions >= collisions);
  await page.keyboard.up('KeyW');
  return hit;
}

test('解鎖：第一個手勢之前聲音引擎什麼都沒做；按鍵之後才建立並啟動', async ({ page }) => {
  await page.goto('/?level=w1_l03&lang=zh-TW&view=top');
  const before = await nextState(page);
  expect(before.audio).toEqual({
    unlockRequested: false,
    contextState: 'none',
    volume: 70,
    muted: false,
    voices: [],
    beeps: 0,
    thuds: 0,
  });

  // 切換鏡頭鍵：不會動到車，但也是玩家的手勢。
  await page.keyboard.press('KeyV');
  const after = await watchUntil(page, '解鎖', (state) => state.audio.unlockRequested);
  expect(after.audio.contextState).not.toBe('none');
  await expect
    .poll(async () => (await nextState(page)).audio.contextState, { timeout: 15_000 })
    .toBe('running');
});

test('撞車警報：被撞的車閃燈加喇叭約 6 秒，碰撞只算一次；重來立刻全停', async ({ page }) => {
  await page.goto('/?level=w1_l03&lang=zh-TW&view=top');
  const hit = await reverseIntoCar(page, 1);
  expect(hit.snapshot.collisions).toBe(1);
  expect(hit.alarms).toHaveLength(1);
  const [alarm] = hit.alarms;
  expect(alarm?.remainingS).toBeGreaterThan(ALARM_S - 1);
  expect(alarm?.remainingS).toBeLessThanOrEqual(ALARM_S);
  expect(hit.audio.voices).toEqual([`alarm:${alarm?.index}`]);
  expect(hit.audio.thuds).toBe(1);
  expect(hit.lightbars).toEqual([]);

  // 燈在亮暗之間切換（同一個警報）。
  await watchUntil(page, '警報燈暗', (state) => state.alarms[0]?.lit === false);
  await watchUntil(page, '警報燈亮', (state) => state.alarms[0]?.lit === true);

  // 放著不動：約 6 秒（遊戲時間）後自己停，沒有多算碰撞。
  const cleared = await watchUntil(page, '警報響完', (state) => state.alarms.length === 0);
  const ringS = cleared.snapshot.elapsedS - hit.snapshot.elapsedS;
  expect(ringS).toBeGreaterThan(ALARM_S - 0.2);
  expect(ringS).toBeLessThan(ALARM_S + 1.5);
  expect(cleared.snapshot.collisions).toBe(1);
  expect(cleared.snapshot.status).toBe('driving');
  await expect
    .poll(async () => (await nextState(page)).audio.voices, { timeout: 5_000 })
    .toEqual([]);

  // 往前開離那台車再倒回去撞第二次，警報又響；按 T 重來，同一幀就全部清掉。
  await page.keyboard.press('KeyR');
  await expect(page.locator('#hud-gear')).toHaveAttribute('data-gear', 'forward');
  await page.keyboard.down('KeyW');
  await watchUntil(page, '往前開離', (state) => state.snapshot.zFt > cleared.snapshot.zFt + 6);
  await page.keyboard.up('KeyW');
  const again = await reverseIntoCar(page, 2);
  expect(again.alarms).toHaveLength(1);
  expect(again.audio.voices).toHaveLength(1);
  await page.keyboard.press('KeyT');
  const restarted = await watchUntil(page, '重來', (state) => state.snapshot.collisions === 0);
  expect(restarted.alarms).toEqual([]);
  expect(restarted.audio.voices).toEqual([]);
});

test('靜音與音量：暫停面板的設定立刻生效、存起來，重新整理後還在；HUD 的靜音鈕與面板同步', async ({ page }) => {
  await page.goto('/?level=w1_l03&lang=zh-TW');
  const hudMute = page.locator('#hud-mute');
  const panelMute = page.locator('#pause-mute');
  const readout = page.locator('#pause-volume');
  // 按鈕寫的是按下去會發生的事：現在有聲音，所以是「靜音」。
  await expect(hudMute).toHaveText('靜音');
  await expect(hudMute).toHaveAttribute('aria-label', '靜音');

  await page.keyboard.press('Escape');
  await expect(page.locator('#hud-pause')).toBeVisible();
  await expect(readout).toHaveText('70%');
  await panelMute.click();
  expect((await nextState(page)).audio.muted).toBe(true);
  await expect(panelMute).toHaveText('取消靜音');
  await expect(hudMute).toHaveText('取消靜音');
  await page.locator('#pause-volume-down').click();
  await page.locator('#pause-volume-down').click();
  await expect(readout).toHaveText('50%');
  expect((await nextState(page)).audio).toMatchObject({ volume: 50, muted: true });
  await page.screenshot({ path: `${OUTPUT_DIR}/audio-pause-sound-row.png` });
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}') as { settings?: { audio?: unknown } },
    SAVE_KEY,
  );
  expect(saved.settings?.audio).toEqual({ volume: 50, muted: true });

  // 重新整理：還沒有任何手勢，設定已經是存的那一組。
  await page.reload();
  const reloaded = await nextState(page);
  expect(reloaded.audio).toMatchObject({ unlockRequested: false, volume: 50, muted: true });
  await expect(hudMute).toHaveText('取消靜音');
  await expect(hudMute).toHaveAttribute('aria-label', '取消靜音');

  // HUD 的靜音鈕：取消靜音，面板跟著變，音量不動；到頂、到底都夾住。
  await hudMute.click();
  expect((await nextState(page)).audio).toMatchObject({ volume: 50, muted: false });
  await expect(hudMute).toHaveText('靜音');
  await page.keyboard.press('Escape');
  await expect(page.locator('#hud-pause')).toBeVisible();
  await expect(panelMute).toHaveText('靜音');
  await expect(readout).toHaveText('50%');
  for (let press = 0; press < 7; press += 1) {
    await page.locator('#pause-volume-up').click();
  }
  await expect(readout).toHaveText('100%');
  expect((await nextState(page)).audio.volume).toBe(100);
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}') as { settings?: { audio?: unknown } },
    SAVE_KEY,
  );
  expect(stored.settings?.audio).toEqual({ volume: 100, muted: false });
});

test('倒車嗶聲：只有 R 檔會嗶，一切到 R 就先嗶一聲；暫停時不嗶，切回 D 檔就停', async ({ page }) => {
  await page.goto('/?level=w1_l03&lang=zh-TW&view=top');
  expect((await nextState(page)).audio.beeps).toBe(0);
  await page.keyboard.press('KeyR');
  await expect(page.locator('#hud-gear')).toHaveAttribute('data-gear', 'reverse');
  await watchUntil(page, '第一聲', (state) => state.audio.beeps >= 1);
  await watchUntil(page, '第三聲', (state) => state.audio.beeps >= 3);

  // 暫停：一聲都不多。
  await page.keyboard.press('Escape');
  await expect(page.locator('#hud-pause')).toBeVisible();
  const paused = (await nextState(page)).audio.beeps;
  await page.waitForTimeout(2500);
  expect((await nextState(page)).audio.beeps).toBe(paused);

  // 繼續：接著嗶。
  await page.keyboard.press('Escape');
  await expect(page.locator('#hud-pause')).toBeHidden();
  await watchUntil(page, '繼續之後再嗶', (state) => state.audio.beeps > paused);

  // 切回 D 檔：不再嗶。
  await page.keyboard.press('KeyR');
  await expect(page.locator('#hud-gear')).toHaveAttribute('data-gear', 'forward');
  const forward = (await nextState(page)).audio.beeps;
  await page.waitForTimeout(2500);
  expect((await nextState(page)).audio.beeps).toBe(forward);
  expect((await nextState(page)).audio.thuds).toBe(0);
});

test('救護車（w1_l09）：燈條平常左右交替；撞上車尾短鳴警笛、改成警戒，約 2.5 秒後回到待機', async ({ page }) => {
  await page.goto('/?level=w1_l09&lang=zh-TW&quality=low');
  const first = await nextState(page);
  expect(first.lightbars).toHaveLength(1);
  expect(first.lightbars[0]).toMatchObject({ index: 0, mode: 'idle' });
  expect(first.alarms).toEqual([]);
  await watchUntil(page, '左組亮', (state) => state.lightbars[0]?.left === true && state.lightbars[0].right === false);
  await watchUntil(page, '右組亮', (state) => state.lightbars[0]?.right === true && state.lightbars[0].left === false);
  await watchUntil(page, '又換回左組', (state) => state.lightbars[0]?.left === true && state.lightbars[0].right === false);

  // 起點在救護車正後方約 30 ft：直直往前開就撞上車尾（車尾在 x = −60 ft）。
  await page.keyboard.down('KeyW');
  const hit = await watchUntil(page, '撞上救護車', (state) => state.snapshot.collisions >= 1);
  await page.keyboard.up('KeyW');
  expect(hit.snapshot.collisions).toBe(1);
  expect(hit.snapshot.xFt).toBeLessThan(-60);
  expect(hit.lightbars[0]?.mode).toBe('alert');
  expect(hit.audio.voices).toEqual(['siren:0']);
  expect(hit.audio.thuds).toBe(1);
  // 救護車不是車輛警報：alarms() 裡沒有它。
  expect(hit.alarms).toEqual([]);
  await page.screenshot({ path: `${OUTPUT_DIR}/audio-ambulance-alert.png` });

  const idle = await watchUntil(page, '回到待機', (state) => state.lightbars[0]?.mode === 'idle');
  const alertS = idle.snapshot.elapsedS - hit.snapshot.elapsedS;
  expect(alertS).toBeGreaterThan(SIREN_S - 0.2);
  expect(alertS).toBeLessThan(SIREN_S + 1.5);
  expect(idle.snapshot.collisions).toBe(1);
  await expect
    .poll(async () => (await nextState(page)).audio.voices, { timeout: 5_000 })
    .toEqual([]);
});

test('?fx=off：燈條的相位固定（只有左組亮），同一個網址每次畫面相同', async ({ page }) => {
  await page.goto('/?level=w1_l09&lang=zh-TW&quality=low&fx=off');
  const first = await nextState(page);
  expect(first.lightbars).toEqual([{ index: 0, mode: 'idle', left: true, right: false, rear: false }]);
  await page.waitForTimeout(1300);
  expect((await nextState(page)).lightbars).toEqual(first.lightbars);
  await page.waitForTimeout(700);
  expect((await nextState(page)).lightbars).toEqual(first.lightbars);
});

test('截圖：救護車三個角度、w1_l09 夜晚開場、被撞的車亮著警報燈', async ({ page }) => {
  for (const [name, query] of [
    ['front', ''],
    ['side', '&az=90'],
    ['rear', '&az=180'],
  ] as const) {
    await page.goto(`/?show=obstacle_ambulance${query}`);
    await expect(page.locator(SHOT_READY)).toBeAttached();
    await page.screenshot({ path: `${OUTPUT_DIR}/audio-ambulance-${name}.png` });
  }

  await page.goto('/?level=w1_l09&lang=zh-TW&fx=off');
  await nextState(page);
  await page.screenshot({ path: `${OUTPUT_DIR}/audio-l09-night-opening.png` });

  // ?fx=off：警報燈恆亮到警報結束，所以這一張每次都一樣。
  await page.goto('/?level=w1_l03&lang=zh-TW&fx=off');
  const hit = await reverseIntoCar(page, 1);
  expect(hit.alarms[0]?.lit).toBe(true);
  expect((await nextState(page)).alarms[0]?.lit).toBe(true);
  await page.screenshot({ path: `${OUTPUT_DIR}/audio-car-alarm-lamps.png` });
});
