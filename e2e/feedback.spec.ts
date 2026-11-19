// 倒車雷達、天氣的環境聲與雷聲、背景音樂、被撞的車晃動的 e2e。無頭環境聽不到聲音，所以斷言的是遊戲自己的
// 唯讀旗標（window.__parkingGame.audio()、sways()）與實際發出的網路請求。操作一律送真實的鍵盤事件。
// 等待都用「每幀讀狀態直到條件成立」加寬鬆的上限，比的是遊戲時間，不是牆上時鐘。
// 型別只用 import type（規格檔不能把語系 JSON 帶進來）。
import type { Page } from '@playwright/test';
import type { AudioSnapshot } from '../src/audio/audioEngine';
import type { SensorSnapshot } from '../src/audio/soundDirector';
import type { AlarmSnapshot } from '../src/level/alarm';
import type { SwaySnapshot } from '../src/level/hitSway';
import type { SessionSnapshot } from '../src/level/session';
import { expect, OUTPUT_DIR, test } from './fixtures';

const SHOT_READY = 'body[data-shot-ready="true"]';
const SAVE_KEY = 'parkinggame.save.v1';
/** 等一個條件的真實時間上限；軟體算圖幀率低也夠。 */
const DEADLINE_MS = 90_000;
/** 倒車雷達的設定（VOICE_SETTINGS.beep）：farFt 以外是慢節奏，往 nearFt 線性縮短，不到 nearFt 是長音。 */
const SENSOR = { farFt: 8, nearFt: 1, periodS: 0.8, nearPeriodS: 0.13 } as const;
/** 兩個音樂檔的大小（位元組）。 */
const MUSIC_BYTES = { 'bgm_day.mp3': 773_612, 'bgm_night.mp3': 739_916 } as const;

interface GameState {
  readonly snapshot: SessionSnapshot;
  readonly audio: AudioSnapshot & SensorSnapshot & { readonly lightningStrikes: number };
  readonly alarms: readonly AlarmSnapshot[];
  readonly sways: readonly SwaySnapshot[];
}

/** 現在的四份唯讀快照（不等下一幀）。 */
async function readState(page: Page): Promise<GameState> {
  return page.evaluate(() => {
    const game = window.__parkingGame;
    if (game === undefined) {
      throw new Error('window.__parkingGame 不存在');
    }
    return { snapshot: game.snapshot(), audio: game.audio(), alarms: game.alarms(), sways: game.sways() };
  });
}

/** 等遊戲畫完下一幀，再讀快照（同一幀的）。 */
async function nextState(page: Page): Promise<GameState> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      }),
  );
  return readState(page);
}

/** 每幀讀狀態直到條件成立。 */
async function watchUntil(
  page: Page,
  what: string,
  done: (state: GameState) => boolean,
): Promise<GameState> {
  // 單調時鐘：這台機器的牆上時鐘會往前跳。
  const deadlineMs = performance.now() + DEADLINE_MS;
  let state = await nextState(page);
  while (!done(state)) {
    if (performance.now() > deadlineMs) {
      throw new Error(`等不到「${what}」，最後狀態：${JSON.stringify(state)}`);
    }
    state = await nextState(page);
  }
  return state;
}

/** 做第一個手勢（切一下鏡頭：不動車、不換檔），等聲音引擎開始出聲。 */
async function unlock(page: Page): Promise<void> {
  await page.keyboard.press('KeyV');
  await expect
    .poll(async () => (await nextState(page)).audio.contextState, { timeout: DEADLINE_MS })
    .toBe('running');
}

/** 記下這一頁對音樂檔發出的請求（檔名）。 */
function watchMusicRequests(page: Page): string[] {
  const requested: string[] = [];
  page.on('request', (request) => {
    const name = /\/audio\/([^/?]+\.mp3)/.exec(request.url())?.[1];
    if (name !== undefined) {
      requested.push(name);
    }
  });
  return requested;
}

/** 踩住剎車直到車停下來。 */
async function brakeToStop(page: Page): Promise<GameState> {
  await page.keyboard.down('KeyS');
  const stopped = await watchUntil(page, '停下來', (state) => state.snapshot.speedMph === 0);
  await page.keyboard.up('KeyS');
  return stopped;
}

test('倒車雷達：越靠近後面的車嗶得越快，不到 1 ft 變成長音；離開 R 檔就停', async ({ page }) => {
  test.slow();
  await page.goto('/?level=w1_l03&lang=zh-TW&view=top');
  await page.keyboard.press('KeyR');
  await expect(page.locator('#hud-gear')).toHaveAttribute('data-gear', 'reverse');
  const first = await watchUntil(page, '雷達開始量', (state) => state.audio.beepIntervalS !== null);
  // 起點離走道對面那台車還很遠：原本的慢節奏，掛進 R 檔的那一幀就先嗶一聲。
  expect(first.audio.rearDistanceFt).toBeGreaterThan(SENSOR.farFt);
  expect(first.audio.beepIntervalS).toBe(SENSOR.periodS);
  expect(first.audio.continuousBeep).toBe(false);
  await expect.poll(async () => (await nextState(page)).audio.beeps, { timeout: DEADLINE_MS }).toBeGreaterThan(0);

  // 一小段一小段往後退，每次停下來讀一次：距離與節奏。遠的時候退快一點，近了就慢慢來，最後幾英尺用爬的
  // （幀率很低的時候也來得及剎車，不會撞上去）。
  const readings: { distanceFt: number; intervalS: number; touched: boolean }[] = [];
  let state = first;
  for (let move = 0; move < 90 && !state.audio.continuousBeep; move += 1) {
    const aheadFt = state.audio.rearDistanceFt ?? 0;
    const targetMph = aheadFt > 12 ? -5 : aheadFt > 3.5 ? -1.5 : -0.7;
    await page.keyboard.down('KeyW');
    await watchUntil(
      page,
      '往後退一點',
      (now) => now.snapshot.speedMph <= targetMph || now.snapshot.collisions > 0 || now.audio.continuousBeep,
    );
    await page.keyboard.up('KeyW');
    state = await brakeToStop(page);
    const { rearDistanceFt, beepIntervalS } = state.audio;
    if (rearDistanceFt !== null && beepIntervalS !== null && !state.audio.continuousBeep) {
      readings.push({
        distanceFt: rearDistanceFt,
        intervalS: beepIntervalS,
        touched: state.snapshot.collisions > 0,
      });
    }
  }
  // 每一次讀到的節奏都照距離算：farFt 以外 0.8 秒，往 nearFt 線性縮短到 0.13 秒。
  for (const { distanceFt, intervalS } of readings) {
    const share = Math.min((distanceFt - SENSOR.nearFt) / (SENSOR.farFt - SENSOR.nearFt), 1);
    expect(intervalS).toBeCloseTo(SENSOR.nearPeriodS + (SENSOR.periodS - SENSOR.nearPeriodS) * share, 6);
  }
  // 真的有在變快：至少讀到一次比慢節奏快的，而且越近越快。萬一碰到了（會彈開一兩英尺再退）：碰到之後的不比先後。
  const quicker = readings.filter((reading) => reading.intervalS < SENSOR.periodS);
  expect(quicker.length).toBeGreaterThan(0);
  const approach = readings.filter((reading) => !reading.touched);
  for (let at = 1; at < approach.length; at += 1) {
    expect(approach[at]?.distanceFt).toBeLessThan(approach[at - 1]?.distanceFt ?? 0);
    expect(approach[at]?.intervalS).toBeLessThanOrEqual(approach[at - 1]?.intervalS ?? 0);
  }

  // 快碰到了（或已經輕輕碰上、被擋在原地）：長音。
  expect(state.audio.continuousBeep).toBe(true);
  expect(state.audio.rearDistanceFt).toBeLessThan(SENSOR.nearFt + 0.5);
  expect(state.audio.beepIntervalS).toBe(0);
  expect(state.snapshot.status).toBe('driving');
  await expect
    .poll(async () => (await nextState(page)).audio.voices, { timeout: DEADLINE_MS })
    .toContain('beepTone');
  await page.screenshot({ path: `${OUTPUT_DIR}/feedback-sensor-close.png` });

  // 換回 D 檔：雷達停，長音收掉。
  await page.keyboard.press('KeyR');
  await expect(page.locator('#hud-gear')).toHaveAttribute('data-gear', 'forward');
  const forward = await watchUntil(page, '長音停', (now) => !now.audio.voices.includes('beepTone'));
  expect(forward.audio.continuousBeep).toBe(false);
  expect(forward.audio.beepIntervalS).toBeNull();
  expect(forward.audio.rearDistanceFt).toBeNull();
});

test('天氣的環境聲：雨、雷雨、雨後各有各的，晴天沒有；解鎖之前都沒有', async ({ page }) => {
  test.slow();
  for (const [query, ambience] of [
    ['level=w1_l03&weather=rain', 'rain'],
    ['level=w1_l08', 'rain'],
    ['level=w1_l10', 'rain'],
    ['level=w1_l04', 'drips'],
    ['level=w1_l03&weather=wet', 'drips'],
    ['level=w1_l07', 'storm'],
    ['level=w1_l08&weather=clear', null],
    ['level=w1_l03', null],
    // 環境聲是聲音，不是畫面特效：關掉特效還是有雨聲。
    ['level=w1_l08&fx=off', 'rain'],
  ] as const) {
    await page.goto(`/?${query}&lang=zh-TW&quality=low`);
    expect((await nextState(page)).audio.ambience, query).toBeNull();
    await unlock(page);
    expect((await nextState(page)).audio.ambience, query).toBe(ambience);
  }
});

test('雷聲：雷雨關每打一道閃電排一聲雷（解鎖之後的才算）；雨天沒有閃電也沒有雷', async ({ page }) => {
  test.slow();
  await page.goto('/?level=w1_l07&lang=zh-TW&quality=low');
  // 解鎖之前打的閃電沒有雷聲（指令直接丟掉，也不補）。
  expect((await nextState(page)).audio.thunders).toBe(0);
  await unlock(page);
  const start = await nextState(page);
  expect(start.audio.thunders).toBeLessThanOrEqual(start.audio.lightningStrikes);
  // 等下一道閃電：它一開始閃，雷聲就排進去（隔 0.3–2 秒才響）。一幀裡跳過好幾道只排最後一道，所以是「至少一聲、最多每道一聲」。
  const struck = await watchUntil(
    page,
    '下一道閃電',
    (state) => state.audio.lightningStrikes > start.audio.lightningStrikes,
  );
  expect(struck.audio.thunders).toBeGreaterThan(start.audio.thunders);
  expect(struck.audio.thunders - start.audio.thunders).toBeLessThanOrEqual(
    struck.audio.lightningStrikes - start.audio.lightningStrikes,
  );
  const again = await watchUntil(
    page,
    '再一道閃電',
    (state) => state.audio.lightningStrikes > struck.audio.lightningStrikes,
  );
  expect(again.audio.thunders).toBeGreaterThan(struck.audio.thunders);
  expect(again.audio.ambience).toBe('storm');

  // 暫停：閃電與雷聲的計數都停住。等得比兩道閃電之間最長的間隔（11 秒）還久：沒停住的話一定會多一道。
  await page.keyboard.press('Escape');
  await expect(page.locator('#hud-pause')).toBeVisible();
  const paused = await nextState(page);
  await page.waitForTimeout(12_000);
  const later = await nextState(page);
  expect(later.audio.lightningStrikes).toBe(paused.audio.lightningStrikes);
  expect(later.audio.thunders).toBe(paused.audio.thunders);

  await page.goto('/?level=w1_l08&lang=zh-TW&quality=low');
  await unlock(page);
  await page.waitForTimeout(4000);
  const rain = await nextState(page);
  expect(rain.audio.ambience).toBe('rain');
  expect(rain.audio.lightningStrikes).toBe(0);
  expect(rain.audio.thunders).toBe(0);
});

test('背景音樂：第一個手勢之前不下載；之後只下載這一關的那一首並循環播放', async ({ page }) => {
  test.slow();
  const requested = watchMusicRequests(page);
  await page.goto('/?level=w1_l03&lang=zh-TW&quality=low');
  const before = await nextState(page);
  expect(before.audio.music).toEqual({ track: 'day', state: 'idle', ducked: false });
  await page.waitForTimeout(1000);
  expect(requested).toEqual([]);

  const response = page.waitForResponse((candidate) => candidate.url().includes('/audio/'));
  await unlock(page);
  const music = await response;
  expect(music.status()).toBe(200);
  // 相對網址：就在頁面旁邊的 audio/ 底下（放在子路徑也一樣）。
  expect(new URL(music.url()).pathname).toBe('/audio/bgm_day.mp3');
  expect((await music.body()).byteLength).toBe(MUSIC_BYTES['bgm_day.mp3']);
  await expect
    .poll(async () => (await nextState(page)).audio.music.state, { timeout: DEADLINE_MS })
    .toBe('playing');
  expect(requested).toEqual(['bgm_day.mp3']);

  // 重來不會重新下載、也不會讓音樂從頭開始。
  await page.keyboard.press('KeyT');
  await nextState(page);
  expect((await nextState(page)).audio.music).toEqual({ track: 'day', state: 'playing', ducked: false });
  expect(requested).toEqual(['bgm_day.mp3']);

  // 暫停面板的音樂開關：關掉、存起來；重新整理後還是關的，解鎖也不下載。
  await page.keyboard.press('Escape');
  const toggle = page.locator('#pause-music');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText('關閉音樂');
  await toggle.click();
  await expect(toggle).toHaveText('開啟音樂');
  expect((await nextState(page)).audio.music.state).toBe('off');
  const saved = await page.evaluate((key) => window.localStorage.getItem(key), SAVE_KEY);
  expect((JSON.parse(saved ?? '{}') as { settings?: { audio?: unknown } }).settings?.audio).toEqual({
    volume: 70,
    muted: false,
    music: false,
  });
  await page.reload();
  await unlock(page);
  await page.waitForTimeout(1000);
  expect((await nextState(page)).audio.music).toEqual({ track: 'day', state: 'off', ducked: false });
  expect(requested).toEqual(['bgm_day.mp3']);
  // 再打開：這時才下載。
  await page.keyboard.press('Escape');
  await page.locator('#pause-music').click();
  await expect(page.locator('#pause-music')).toHaveText('關閉音樂');
  await expect.poll(() => requested, { timeout: DEADLINE_MS }).toEqual(['bgm_day.mp3', 'bgm_day.mp3']);
});

test('背景音樂：夜晚與雷雨播夜晚的那一首，關卡選擇畫面播白天的；展示台、定格、bench 都沒有', async ({ page }) => {
  test.slow();
  const requested = watchMusicRequests(page);
  for (const [query, track] of [
    ['level=w1_l09', 'night'],
    ['level=w1_l03&weather=storm', 'night'],
    ['level=w1_l09&weather=rain', 'day'],
  ] as const) {
    requested.length = 0;
    await page.goto(`/?${query}&lang=zh-TW&quality=low&fx=off`);
    expect((await nextState(page)).audio.music.track, query).toBe(track);
    expect(requested, query).toEqual([]);
    await unlock(page);
    await expect.poll(() => requested, { timeout: DEADLINE_MS }).toEqual([`bgm_${track}.mp3`]);
  }

  // 關卡選擇畫面：一樣第一個手勢才下載。
  requested.length = 0;
  await page.goto('/?lang=zh-TW');
  await expect(page.locator('.level-card').first()).toBeVisible();
  await page.waitForTimeout(1000);
  expect(requested).toEqual([]);
  const response = page.waitForResponse((candidate) => candidate.url().includes('/audio/'));
  await page.keyboard.press('KeyV');
  expect((await (await response).body()).byteLength).toBe(MUSIC_BYTES['bgm_day.mp3']);
  expect(requested).toEqual(['bgm_day.mp3']);

  // 沒有聲音的模式：按了鍵也不下載。
  for (const query of ['show=obstacle_ambulance', 'level=w1_l03&cam=top', 'level=w1_l03&bench=1']) {
    requested.length = 0;
    await page.goto(`/?${query}&quality=low`);
    if (!query.includes('bench')) {
      await expect(page.locator(SHOT_READY)).toBeAttached();
    }
    await page.keyboard.press('KeyV');
    await page.waitForTimeout(1000);
    expect(requested, query).toEqual([]);
  }
});

/**
 * w1_l07（起點兩側都停著車）：油門加方向盤往右打到底，約 1 秒後車頭右前角撞上右邊那台車的車身側面（約 6 mph）。
 * 一讀到碰撞就放開；回傳撞到之後車停下來的狀態。
 */
async function hitNeighbour(page: Page): Promise<{ hit: GameState; rest: GameState }> {
  const before = (await nextState(page)).snapshot.collisions;
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyW');
  const hit = await watchUntil(page, '撞上隔壁的車', (state) => state.snapshot.collisions > before);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyD');
  const rest = await watchUntil(page, '車停下來', (state) => state.snapshot.speedMph === 0);
  return { hit, rest };
}

test('被撞的車會晃：只有那一台、約 1 秒多停住；判定照常、那台車照樣擋路；音樂在警報響時壓低', async ({ page }) => {
  test.slow();
  await page.goto('/?level=w1_l07&weather=clear&lang=zh-TW&quality=low');
  await unlock(page);
  expect((await nextState(page)).sways).toEqual([]);
  const { hit, rest } = await hitNeighbour(page);
  // 晃的就是被撞（警報響）的那一台。
  expect(hit.alarms).toHaveLength(1);
  expect(hit.sways).toHaveLength(1);
  expect(hit.sways[0]?.index).toBe(hit.alarms[0]?.index);
  expect(hit.sways[0]?.amplitude).toBeGreaterThan(0.05);
  expect(hit.sways[0]?.amplitude).toBeLessThanOrEqual(1);
  expect(hit.audio.thuds).toBeGreaterThanOrEqual(1);
  await expect
    .poll(async () => (await nextState(page)).audio.music.ducked, { timeout: DEADLINE_MS })
    .toBe(true);

  // 放著不動：幅度只會變小，2 秒（遊戲時間）內停住、回到原位；這段時間碰撞數不變、這一局照常進行。
  let last = rest.sways[0]?.amplitude ?? 0;
  const settled = await watchUntil(page, '晃完', (state) => {
    const amplitude = state.sways[0]?.amplitude ?? 0;
    expect(amplitude).toBeLessThanOrEqual(last);
    last = amplitude;
    return state.sways.length === 0;
  });
  expect(settled.snapshot.elapsedS - rest.snapshot.elapsedS).toBeLessThan(2);
  expect(settled.snapshot.collisions).toBe(rest.snapshot.collisions);
  expect(settled.snapshot.status).toBe('driving');
  expect(settled.snapshot.xFt).toBe(rest.snapshot.xFt);
  expect(settled.snapshot.zFt).toBe(rest.snapshot.zFt);

  // 那台車照樣擋路：再踩油門，同一台車在差不多的地方又擋住它、又晃一次。
  // （晃動只讀碰撞盒、不改它，這是程式結構保證的；這裡的一英尺容許量比晃動推開的 0.4 ft 大，量不出那麼細。）
  const again = await hitNeighbour(page);
  expect(again.hit.snapshot.collisions).toBe(rest.snapshot.collisions + 1);
  expect(again.hit.alarms.map((alarm) => alarm.index)).toEqual([hit.sways[0]?.index]);
  expect(again.hit.sways.every((sway) => sway.index === hit.sways[0]?.index)).toBe(true);
  // 撞到會彈開一點再停，所以比的是「撞上的那個位置」，容許一英尺（第一次讀到碰撞時車可能已經彈開幾幀）。
  expect(Math.abs(again.hit.snapshot.xFt - hit.snapshot.xFt)).toBeLessThan(1);
  expect(Math.abs(again.hit.snapshot.zFt - hit.snapshot.zFt)).toBeLessThan(1);

  // 警報響完，音樂回來。
  const quiet = await watchUntil(page, '警報響完', (state) => state.alarms.length === 0);
  expect(quiet.sways).toEqual([]);
  await expect
    .poll(async () => (await nextState(page)).audio.music.ducked, { timeout: DEADLINE_MS })
    .toBe(false);
});

test('被撞的車：減少動態效果時只輕輕晃一下；?fx=off 不晃', async ({ page }) => {
  test.slow();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?level=w1_l07&weather=clear&lang=zh-TW&quality=low');
  const gentle = await hitNeighbour(page);
  expect(gentle.hit.sways).toHaveLength(1);
  expect(gentle.hit.sways[0]?.amplitude).toBeGreaterThan(0);
  expect(gentle.hit.sways[0]?.amplitude).toBeLessThanOrEqual(0.3);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?level=w1_l07&weather=clear&lang=zh-TW&quality=low&fx=off');
  const still = await hitNeighbour(page);
  expect(still.hit.alarms).toHaveLength(1);
  expect(still.hit.sways).toEqual([]);
  expect(still.rest.sways).toEqual([]);
});

/** 幾幀之後晃到第一個高點（1.8 Hz、阻尼比 0.28：撞到之後約 0.12 秒）。 */
const PEAK_FRAMES = 7;
const FRAME_MS = 1000 / 60;

declare global {
  interface Window {
    /** 截圖用：把畫面更新定住、一幀一幀走（下面的 addInitScript 裝的）。 */
    __frames?: { frozen: boolean; step: (frames: number, frameMs: number) => void };
  }
}

/** 那台車的模型現在比原位斜了幾度：讀的是畫出來的模型（實例的矩陣；正淡成半透明時是替身的），不是晃動的狀態。 */
async function shownTiltDeg(page: Page, index: number): Promise<number> {
  return page.evaluate((at) => window.__parkingGame?.swayTiltDeg(at) ?? Number.NaN, index);
}

test('截圖：被撞的車晃到最斜的那一幀與停下來之後；雨天與雷雨的開場；倒車貼近', async ({ page }) => {
  test.slow();
  // 把 requestAnimationFrame 包起來：有車開始晃的那一幀之後就定住，之後由測試一幀一幀（每幀 1/60 秒）往前走，
  // 所以「撞到之後第 7 幀」每次都是同一個姿勢。遊戲的時間來自這個回呼的時間參數。
  await page.addInitScript(() => {
    const real = window.requestAnimationFrame.bind(window);
    let held: FrameRequestCallback[] = [];
    let nowMs = 0;
    const frames = {
      frozen: false,
      step(count: number, frameMs: number): void {
        for (let frame = 0; frame < count; frame += 1) {
          nowMs += frameMs;
          const callbacks = held;
          held = [];
          for (const callback of callbacks) {
            callback(nowMs);
          }
        }
      },
    };
    window.__frames = frames;
    window.requestAnimationFrame = (callback) => {
      if (frames.frozen) {
        held.push(callback);
        return 0;
      }
      return real((time) => {
        // 已經排進去、還沒跑的那一幀也要定住（不然撞到之後會多走一幀真實時間）。
        if (frames.frozen) {
          held.push(callback);
          return;
        }
        nowMs = time;
        callback(time);
        if ((window.__parkingGame?.sways().length ?? 0) > 0) {
          frames.frozen = true;
        }
      });
    };
  });
  await page.goto('/?level=w1_l07&weather=clear&lang=zh-TW');
  await nextState(page);
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyW');
  await page.waitForFunction(() => window.__frames?.frozen === true, undefined, {
    polling: 100,
    timeout: DEADLINE_MS,
  });
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyD');
  const struck = await readState(page);
  expect(struck.sways).toHaveLength(1);
  await page.evaluate(([count, frameMs]) => window.__frames?.step(count, frameMs), [PEAK_FRAMES, FRAME_MS] as const);
  const peak = await readState(page);
  expect(peak.sways).toHaveLength(1);
  // 畫出來的那台車真的斜了：約 6 mph 的一撞，第一個高點斜好幾度（滿格是 6°）。
  const struckIndex = struck.sways[0]?.index ?? -1;
  const peakTiltDeg = await shownTiltDeg(page, struckIndex);
  expect(peakTiltDeg).toBeGreaterThan(2);
  expect(peakTiltDeg).toBeLessThan(7);
  await page.screenshot({ path: `${OUTPUT_DIR}/feedback-sway-peak.png` });
  // 走完 2 秒：停住，模型回到原位。
  await page.evaluate(([count, frameMs]) => window.__frames?.step(count, frameMs), [120, FRAME_MS] as const);
  expect((await readState(page)).sways).toEqual([]);
  expect(await shownTiltDeg(page, struckIndex)).toBe(0);
  await page.screenshot({ path: `${OUTPUT_DIR}/feedback-sway-rest.png` });

  // 雨天（w1_l08）與雷雨（w1_l07）的開場畫面；雨絲在動，畫得慢，截圖的時限放寬。
  for (const [name, level] of [
    ['rain-l08', 'w1_l08'],
    ['storm-l07', 'w1_l07'],
  ] as const) {
    await page.goto(`/?level=${level}&lang=zh-TW`);
    await nextState(page);
    await page.screenshot({ path: `${OUTPUT_DIR}/feedback-${name}.png`, timeout: 120_000 });
  }
});
