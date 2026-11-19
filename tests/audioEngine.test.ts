// 音效引擎：第一個手勢才建立並解鎖、解鎖前的指令丟掉、匯流排接線、音量與靜音、暫停與背景分頁停住、
// 沒有 AudioContext 或建立失敗時安靜地什麼都不做。用手寫的假 AudioContext（tests/fakeAudio.ts）。
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  MASTER_HEADROOM,
  browserAudioHost,
  createAudioEngine,
  masterGain,
  type AudioEngine,
} from '../src/audio/audioEngine';
import type { SoundCommand } from '../src/audio/soundDirector';
import { DEFAULT_AUDIO } from '../src/core/save';
import {
  FakeAudioContext,
  FakeGestureTarget,
  FakeNode,
  FakeParam,
  asContext,
  downstream,
  fakeHost,
  settled,
} from './fakeAudio';

const GESTURES = ['pointerdown', 'pointerup', 'keydown', 'touchend'];

const HORN: SoundCommand = { type: 'alarmStart', index: 12, variant: { sound: 'horn', detuneCents: 0 } };
const SIREN: SoundCommand = { type: 'alarmStart', index: 0, variant: { sound: 'siren' } };

function setup(): {
  context: FakeAudioContext;
  target: FakeGestureTarget;
  engine: AudioEngine;
  created: () => number;
} {
  const context = new FakeAudioContext();
  const target = new FakeGestureTarget();
  let created = 0;
  const engine = createAudioEngine(
    {
      ...fakeHost(context, target),
      createContext: () => {
        created += 1;
        return asContext(context);
      },
    },
    DEFAULT_AUDIO,
  );
  return { context, target, engine, created: () => created };
}

/** 做第一個手勢並等 context 開始。 */
async function unlocked(): Promise<ReturnType<typeof setup>> {
  const stage = setup();
  stage.target.fire('keydown');
  await settled();
  return stage;
}

/** 主音量節點：接到限幅器的那一個增益。 */
function masterOf(context: FakeAudioContext): FakeNode {
  const [limiter] = context.of('compressor');
  const master = context.of('gain').find((node) => limiter !== undefined && node.outputs.includes(limiter));
  if (master === undefined) {
    throw new Error('找不到主音量節點');
  }
  return master;
}

/** sfx 匯流排：接到主音量的那一個增益。 */
function sfxOf(context: FakeAudioContext): FakeNode {
  const master = masterOf(context);
  const sfx = context.of('gain').find((node) => node.outputs.includes(master));
  if (sfx === undefined) {
    throw new Error('找不到 sfx 匯流排');
  }
  return sfx;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('第一個手勢之前', () => {
  test('不建立 AudioContext、沒有聲音、指令直接丟掉（不排隊）', async () => {
    const { context, engine, created, target } = setup();
    engine.run([{ type: 'thud', gain: 1 }, { type: 'beep' }, HORN]);
    engine.setHeld(true);
    engine.setHeld(false);
    engine.setHidden(true);
    engine.setHidden(false);
    expect(created()).toBe(0);
    expect(context.nodes).toEqual([]);
    expect(context.resumes).toBe(0);
    expect(engine.snapshot()).toEqual({
      unlockRequested: false,
      contextState: 'none',
      volume: 70,
      muted: false,
      voices: [],
      beeps: 0,
      thuds: 0,
    });
    // 解鎖之後也不會補播剛才那幾個。
    target.fire('pointerdown');
    await settled();
    expect(engine.snapshot()).toMatchObject({ voices: [], beeps: 0, thuds: 0 });
    expect(context.of('oscillator')).toEqual([]);
  });

  test('在 window 上聽 pointerdown、keydown、touchend（capture、passive）', () => {
    const { target } = setup();
    expect(target.listening().sort()).toEqual([...GESTURES].sort());
    expect(target.options).toEqual(GESTURES.map(() => ({ capture: true, passive: true })));
  });
});

describe('解鎖', () => {
  test.each(GESTURES)('%s：同步建立 context、resume、播一格無聲的緩衝', (gesture) => {
    const { context, target, engine, created } = setup();
    target.fire(gesture);
    // 還沒等任何 promise：這三件事都要在手勢的處理函式裡同步做完。
    expect(created()).toBe(1);
    expect(context.resumes).toBe(1);
    const [silent] = context.of('bufferSource');
    expect(silent?.buffer?.length).toBe(1);
    expect(silent?.buffer?.data[0]).toBe(0);
    expect(silent?.outputs).toEqual([context.destination]);
    expect(silent?.starts).toHaveLength(1);
    expect(engine.snapshot().unlockRequested).toBe(true);
  });

  test('context 開始之後拿掉手勢監聽；之後的手勢不再建立或 resume', async () => {
    const { context, target, engine, created } = await unlocked();
    expect(engine.snapshot().contextState).toBe('running');
    expect(target.listening()).toEqual([]);
    target.fire('keydown');
    expect(created()).toBe(1);
    expect(context.resumes).toBe(1);
  });

  test('第一個手勢沒有成功（瀏覽器還不讓它開始）：繼續聽，下一個手勢再試，只建立一次', async () => {
    const { context, target, engine, created } = setup();
    context.blocked = true;
    target.fire('touchend');
    await settled();
    expect(engine.snapshot()).toMatchObject({ unlockRequested: true, contextState: 'suspended' });
    expect(target.listening().sort()).toEqual([...GESTURES].sort());
    context.blocked = false;
    target.fire('pointerdown');
    await settled();
    expect(created()).toBe(1);
    expect(context.resumes).toBe(2);
    expect(engine.snapshot().contextState).toBe('running');
    expect(target.listening()).toEqual([]);
  });

  test('解鎖的手勢之後的指令照常執行，即使 context 還沒回報 running', () => {
    const { target, engine } = setup();
    target.fire('keydown');
    engine.run([{ type: 'thud', gain: 0.5 }, { type: 'beep' }, HORN]);
    expect(engine.snapshot()).toMatchObject({ voices: ['alarm:12'], beeps: 1, thuds: 1 });
  });

  test('context 一直起不來：只收開頭那幾幀的指令，之後的丟掉（不會疊在一起等它開始時一次爆出來）', async () => {
    const { context, target, engine } = setup();
    context.blocked = true;
    target.fire('keydown');
    for (let frame = 0; frame < 30; frame += 1) {
      engine.run([]);
    }
    engine.run([{ type: 'thud', gain: 0.5 }, { type: 'beep' }, HORN]);
    target.fire('keydown');
    engine.run([{ type: 'beep' }]);
    await settled();
    expect(engine.snapshot()).toMatchObject({ contextState: 'suspended', voices: [], beeps: 0, thuds: 0 });
    expect(context.of('oscillator')).toEqual([]);

    // 終於開始之後就照常。
    context.blocked = false;
    target.fire('keydown');
    await settled();
    engine.run([{ type: 'beep' }]);
    expect(engine.snapshot()).toMatchObject({ contextState: 'running', beeps: 1 });
  });

  test.each([
    ['觸控按下去', 'pointerdown', { pointerType: 'touch' }],
    ['筆按下去', 'pointerdown', { pointerType: 'pen' }],
    ['Esc 鍵', 'keydown', { key: 'Escape' }],
  ])('%s 不算使用者啟動：不建立 context、不算解鎖，繼續聽', (_name, type, detail) => {
    const { target, engine, created } = setup();
    target.fire(type, detail);
    engine.run([{ type: 'beep' }]);
    expect(created()).toBe(0);
    expect(engine.snapshot()).toMatchObject({ unlockRequested: false, contextState: 'none', beeps: 0 });
    expect(target.listening().sort()).toEqual([...GESTURES].sort());
  });

  test('觸控放開（pointerup）就解鎖', async () => {
    const { target, engine, created } = setup();
    target.fire('pointerdown', { pointerType: 'touch' });
    target.fire('pointerup', { pointerType: 'touch' });
    await settled();
    expect(created()).toBe(1);
    expect(engine.snapshot()).toMatchObject({ unlockRequested: true, contextState: 'running' });
  });

  test('context 一建立就已經是 running（沒有 statechange）：不再 resume，也不再聽手勢', () => {
    const { context, target, engine } = setup();
    context.state = 'running';
    target.fire('keydown');
    expect(context.resumes).toBe(0);
    expect(target.listening()).toEqual([]);
    engine.setHeld(true);
    expect(context.suspends).toBe(1);
  });
});

describe('訊號路徑', () => {
  test('sfx 匯流排 → 主音量 → 限幅器 → 輸出；沒有其他空的匯流排', async () => {
    const { context } = await unlocked();
    const [limiter] = context.of('compressor');
    expect(limiter?.outputs).toEqual([context.destination]);
    expect([
      limiter?.threshold.value,
      limiter?.knee.value,
      limiter?.ratio.value,
      limiter?.attack.value,
      limiter?.release.value,
    ]).toEqual([-6, 0, 20, 0.003, 0.25]);
    const master = masterOf(context);
    const sfx = sfxOf(context);
    expect(sfx.outputs).toEqual([master]);
    expect(sfx.gain.value).toBe(1);
    expect(context.of('gain')).toHaveLength(2);
  });

  test('每一種聲音都進 sfx 匯流排，不直接接到輸出', async () => {
    const { context, engine } = await unlocked();
    const sfx = sfxOf(context);
    engine.run([
      { type: 'thud', gain: 0.5 },
      { type: 'beep' },
      HORN,
      { type: 'alarmStart', index: 2, variant: { sound: 'yelp' } },
      SIREN,
    ]);
    const sources = [...context.of('oscillator'), ...context.of('bufferSource').slice(1)];
    const audible = sources.filter((source) => downstream(source).includes(context.destination));
    // 悶響 3 個音源、嗶聲 2 個、喇叭 2 個、警報器與警笛的載波各 1 個。
    expect(audible).toHaveLength(9);
    for (const source of audible) {
      expect(downstream(source)).toContain(sfx);
    }
    // 其餘兩個是低頻振盪器：只推載波的頻率參數，本身不出聲。
    const modulators = sources.filter((source) => !audible.includes(source));
    expect(modulators).toHaveLength(2);
    for (const modulator of modulators) {
      const [depth] = downstream(modulator);
      expect(depth?.outputs.every((output) => output instanceof FakeParam)).toBe(true);
    }
    expect(context.nodes.filter((node) => node.outputs.includes(context.destination))).toEqual([
      context.of('compressor')[0],
      context.of('bufferSource')[0],
    ]);
  });
});

describe('指令', () => {
  test('悶響與嗶聲累計次數；警報與警笛出現在 voices，停了就消失', async () => {
    const { context, engine } = await unlocked();
    engine.run([{ type: 'thud', gain: 0.4 }, { type: 'thud', gain: 1 }, { type: 'beep' }]);
    expect(engine.snapshot()).toMatchObject({ thuds: 2, beeps: 1, voices: [] });
    engine.run([HORN, SIREN]);
    expect(engine.snapshot().voices).toEqual(['alarm:12', 'siren:0']);
    const sounding = context.of('oscillator').filter((node) => node.stops.length === 0);
    expect(sounding).toHaveLength(4);
    context.currentTime = 3;
    engine.run([{ type: 'alarmStop', index: 12, fadeS: 0.06 }]);
    expect(engine.snapshot().voices).toEqual(['siren:0']);
    expect(sounding.filter((node) => node.stops.length === 1).map((node) => node.stops[0])).toEqual([
      3.06, 3.06,
    ]);
  });

  test('同一個障礙物的 alarmStart 重複送不會疊第二個聲音', async () => {
    const { context, engine } = await unlocked();
    engine.run([HORN]);
    const count = context.nodes.length;
    engine.run([HORN]);
    expect(context.nodes).toHaveLength(count);
    expect(engine.snapshot().voices).toEqual(['alarm:12']);
  });

  test('alarmGate 只動那一台的喇叭；對不存在的警報沒有作用', async () => {
    const { context, engine } = await unlocked();
    engine.run([HORN, { type: 'alarmStart', index: 13, variant: { sound: 'horn', detuneCents: 0 } }]);
    const sfx = sfxOf(context);
    const [first, second] = context.of('gain').filter((node) => node.outputs.includes(sfx));
    const before = [first?.gain.events.length, second?.gain.events.length];
    engine.run([
      { type: 'alarmGate', index: 13, on: false },
      { type: 'alarmGate', index: 99, on: false },
    ]);
    expect(first?.gain.events).toHaveLength(before[0] ?? -1);
    expect(second?.gain.events.at(-1)?.slice(0, 2)).toEqual(['setTargetAtTime', 0]);
  });

  test('stopAll：所有持續的聲音在 fadeS 內停掉，voices 清空；之後可以再開始', async () => {
    const { context, engine } = await unlocked();
    engine.run([HORN, SIREN]);
    context.currentTime = 5;
    engine.run([{ type: 'stopAll', fadeS: 0.03 }]);
    expect(engine.snapshot().voices).toEqual([]);
    for (const oscillator of context.of('oscillator')) {
      expect(oscillator.stops).toEqual([5.03]);
    }
    engine.run([HORN]);
    expect(engine.snapshot().voices).toEqual(['alarm:12']);
  });
});

describe('音量與靜音', () => {
  test('主音量 = 靜音 ? 0 :（音量 ÷ 100）² × 0.8', () => {
    expect(MASTER_HEADROOM).toBe(0.8);
    expect(masterGain({ volume: 100, muted: false })).toBeCloseTo(0.8, 9);
    expect(masterGain({ volume: 70, muted: false })).toBeCloseTo(0.392, 9);
    expect(masterGain({ volume: 50, muted: false })).toBeCloseTo(0.2, 9);
    expect(masterGain({ volume: 0, muted: false })).toBe(0);
    expect(masterGain({ volume: 100, muted: true })).toBe(0);
  });

  test('建立時就是存檔裡的音量；出聲中改音量用 setTargetAtTime（時間常數 0.02 秒）', async () => {
    const { context, engine } = await unlocked();
    const master = masterOf(context);
    expect(master.gain.value).toBeCloseTo(0.392, 9);
    context.currentTime = 2;
    engine.setAudio({ volume: 40, muted: false });
    expect(master.gain.events).toEqual([['setTargetAtTime', masterGain({ volume: 40, muted: false }), 2, 0.02]]);
    expect(engine.snapshot()).toMatchObject({ volume: 40, muted: false });
  });

  test('靜音只把主音量降到 0：警報照常進行，取消靜音就接上', async () => {
    const { context, engine } = await unlocked();
    engine.run([HORN]);
    const nodes = context.nodes.length;
    engine.setAudio({ volume: 70, muted: true });
    expect(masterOf(context).gain.events.at(-1)?.slice(0, 2)).toEqual(['setTargetAtTime', 0]);
    expect(engine.snapshot()).toMatchObject({ muted: true, voices: ['alarm:12'] });
    expect(context.of('oscillator').every((node) => node.stops.length === 0)).toBe(true);
    // 靜音中的指令照常執行。
    engine.run([{ type: 'thud', gain: 1 }, SIREN]);
    expect(engine.snapshot()).toMatchObject({ thuds: 1, voices: ['alarm:12', 'siren:0'] });
    expect(context.nodes.length).toBeGreaterThan(nodes);
    engine.setAudio({ volume: 70, muted: false });
    expect(masterOf(context).gain.events.at(-1)?.slice(0, 2)).toEqual(['setTargetAtTime', masterGain(DEFAULT_AUDIO)]);
  });

  test('暫停中（context 停住）改音量：直接設值，繼續時第一個取樣就是新的音量', async () => {
    const { context, engine } = await unlocked();
    engine.setHeld(true);
    await settled();
    expect(context.state).toBe('suspended');
    engine.setAudio({ volume: 100, muted: false });
    const master = masterOf(context);
    expect(master.gain.value).toBeCloseTo(0.8, 9);
    expect(master.gain.events.some(([method]) => method === 'setTargetAtTime')).toBe(false);
  });

  test('解鎖之前改的音量，建立時就用上', async () => {
    const { context, target, engine } = setup();
    engine.setAudio({ volume: 20, muted: false });
    expect(engine.snapshot()).toMatchObject({ volume: 20, contextState: 'none' });
    target.fire('keydown');
    await settled();
    expect(masterOf(context).gain.value).toBeCloseTo(masterGain({ volume: 20, muted: false }), 9);
  });
});

describe('暫停與背景分頁', () => {
  test('暫停：suspend；繼續：resume。警報的聲音留著，從停住的地方接下去', async () => {
    const { context, engine } = await unlocked();
    engine.run([HORN]);
    engine.setHeld(true);
    await settled();
    expect(context.suspends).toBe(1);
    expect(engine.snapshot()).toMatchObject({ contextState: 'suspended', voices: ['alarm:12'] });
    // 每一幀都會叫 setHeld：沒有變化就不重複 suspend。
    engine.setHeld(true);
    await settled();
    expect(context.suspends).toBe(1);
    engine.setHeld(false);
    await settled();
    expect(context.resumes).toBe(2);
    expect(engine.snapshot().contextState).toBe('running');
    expect(context.of('oscillator').every((node) => node.stops.length === 0)).toBe(true);
  });

  test('分頁切到背景：suspend；切回來：resume', async () => {
    const { context, engine } = await unlocked();
    engine.setHidden(true);
    await settled();
    expect(context.state).toBe('suspended');
    engine.setHidden(false);
    await settled();
    expect(context.state).toBe('running');
  });

  test('暫停中又切到背景，要兩個都解除才繼續', async () => {
    const { context, engine } = await unlocked();
    engine.setHeld(true);
    engine.setHidden(true);
    await settled();
    engine.setHidden(false);
    await settled();
    expect(context.state).toBe('suspended');
    engine.setHeld(false);
    await settled();
    expect(context.state).toBe('running');
  });

  test('暫停後馬上繼續（suspend 還沒完成）：最後是出聲的', async () => {
    const { context, engine } = await unlocked();
    engine.setHeld(true);
    engine.setHeld(false);
    await settled();
    expect(context.state).toBe('running');
  });

  test('我們自己停住的時候，手勢不會把聲音叫醒（暫停面板上的點擊、按鍵）', async () => {
    const { context, target, engine } = await unlocked();
    engine.setHeld(true);
    await settled();
    // 停住之後重新聽手勢。
    expect(target.listening().sort()).toEqual([...GESTURES].sort());
    const resumes = context.resumes;
    target.fire('pointerdown');
    target.fire('keydown');
    await settled();
    expect(context.resumes).toBe(resumes);
    expect(context.state).toBe('suspended');
  });

  test('第一個手勢發生在暫停中：仍然在手勢裡解鎖一次，然後停住；繼續時就有聲音', async () => {
    const { context, target, engine } = setup();
    engine.setHeld(true);
    target.fire('pointerdown');
    expect(context.resumes).toBe(1);
    await settled();
    expect(context.state).toBe('suspended');
    engine.setHeld(false);
    await settled();
    expect(context.state).toBe('running');
  });

  test('被系統打斷（來電、切 App）：重新聽手勢，下一次觸碰再解鎖', async () => {
    const { context, target, engine } = await unlocked();
    context.blocked = true;
    context.setState('suspended');
    await settled();
    expect(engine.snapshot().contextState).toBe('suspended');
    expect(target.listening().sort()).toEqual([...GESTURES].sort());
    context.blocked = false;
    target.fire('touchend');
    await settled();
    expect(engine.snapshot().contextState).toBe('running');
    expect(target.listening()).toEqual([]);
  });

  test.each([
    [
      '被系統打斷（來電、Siri）後一直沒恢復',
      async ({ context }: ReturnType<typeof setup>) => {
        context.blocked = true;
        context.setState('suspended');
        await settled();
      },
    ],
    [
      '從背景回來，瀏覽器要等下一個手勢才讓它恢復（iPhone）',
      async ({ context, engine }: ReturnType<typeof setup>) => {
        engine.setHidden(true);
        await settled();
        context.blocked = true;
        engine.setHidden(false);
        await settled();
      },
    ],
  ])(
    '%s：頭幾幀之後，悶響、嗶聲與新的警報都丟掉（不會疊在同一個時間點、恢復時一起爆出來）；已經在響的警報照樣開關與停掉',
    async (_name, stall) => {
      const stage = await unlocked();
      const { context, target, engine } = stage;
      engine.run([HORN]);
      const horn = context.of('oscillator');
      await stall(stage);
      expect(context.state).toBe('suspended');

      // 頭 30 幀照收（恢復得快就聽得到）。
      for (let frame = 0; frame < 29; frame += 1) {
        engine.run([]);
      }
      engine.run([{ type: 'beep' }]);
      expect(engine.snapshot().beeps).toBe(1);
      const queued = context.of('oscillator').length;

      // 之後：這段時間的嗶聲、悶響、新的警報都不排隊。
      for (let frame = 0; frame < 5; frame += 1) {
        engine.run([{ type: 'beep' }, { type: 'thud', gain: 1 }, SIREN]);
      }
      expect(engine.snapshot()).toMatchObject({ voices: ['alarm:12'], beeps: 1, thuds: 0 });
      expect(context.of('oscillator')).toHaveLength(queued);
      expect(context.of('bufferSource').filter((source) => source.buffer?.length !== 1)).toEqual([]);

      // 已經在響的那一台照樣停得掉（恢復時不會卡著一直響）。
      engine.run([{ type: 'alarmGate', index: 12, on: false }]);
      engine.run([{ type: 'alarmStop', index: 12, fadeS: 0.15 }]);
      expect(engine.snapshot().voices).toEqual([]);
      for (const oscillator of horn) {
        expect(oscillator.stops).toEqual([context.currentTime + 0.15]);
      }

      // 手指放開、恢復之後照常。
      context.blocked = false;
      target.fire('touchend');
      await settled();
      engine.run([{ type: 'beep' }, { type: 'thud', gain: 1 }, SIREN]);
      expect(engine.snapshot()).toMatchObject({
        contextState: 'running',
        voices: ['siren:0'],
        beeps: 2,
        thuds: 1,
      });
    },
  );

  test('暫停了很久再繼續：resume 還沒完成的那幾幀，聲音照收不漏', async () => {
    const { context, engine } = await unlocked();
    engine.setHeld(true);
    await settled();
    for (let frame = 0; frame < 100; frame += 1) {
      engine.run([]);
    }
    engine.setHeld(false);
    expect(context.state).toBe('suspended');
    engine.run([{ type: 'beep' }, { type: 'thud', gain: 1 }, HORN]);
    expect(engine.snapshot()).toMatchObject({ voices: ['alarm:12'], beeps: 1, thuds: 1 });
    await settled();
    expect(context.state).toBe('running');
  });
});

describe('不能出聲的環境', () => {
  test('瀏覽器沒有 AudioContext：不掛監聽，所有呼叫都是空動作', () => {
    const target = new FakeGestureTarget();
    const engine = createAudioEngine(
      { createContext: undefined, gestureTarget: target as unknown as Window },
      DEFAULT_AUDIO,
    );
    expect(target.listening()).toEqual([]);
    engine.run([{ type: 'thud', gain: 1 }, HORN, { type: 'stopAll', fadeS: 0.03 }]);
    engine.setAudio({ volume: 30, muted: true });
    engine.setHeld(true);
    engine.setHidden(true);
    expect(engine.snapshot()).toEqual({
      unlockRequested: false,
      contextState: 'none',
      volume: 30,
      muted: true,
      voices: [],
      beeps: 0,
      thuds: 0,
    });
  });

  test('建立 AudioContext 丟例外：不往外丟、不寫 console，之後不再試', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const target = new FakeGestureTarget();
    let attempts = 0;
    const engine = createAudioEngine(
      {
        createContext: () => {
          attempts += 1;
          throw new Error('no audio device');
        },
        gestureTarget: target as unknown as Window,
      },
      DEFAULT_AUDIO,
    );
    expect(() => {
      target.fire('keydown');
    }).not.toThrow();
    expect(target.listening()).toEqual([]);
    target.fire('keydown');
    engine.run([{ type: 'beep' }]);
    expect(attempts).toBe(1);
    expect(engine.snapshot()).toMatchObject({ unlockRequested: true, contextState: 'none', beeps: 0 });
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  test('建好 context 之後接線丟例外：把 context 關掉，之後不再試', () => {
    const { context, target, engine, created } = setup();
    context.createDynamicsCompressor = () => {
      throw new Error('no compressor');
    };
    expect(() => {
      target.fire('keydown');
    }).not.toThrow();
    target.fire('keydown');
    engine.run([{ type: 'beep' }]);
    expect(created()).toBe(1);
    expect(context.closes).toBe(1);
    expect(target.listening()).toEqual([]);
    expect(engine.snapshot()).toMatchObject({ unlockRequested: true, contextState: 'none', beeps: 0 });
  });

  test('resume／suspend 被拒絕：沒有未處理的 rejection，下一個手勢再試', async () => {
    const { context, target, engine } = setup();
    context.rejecting = true;
    target.fire('keydown');
    engine.setHeld(true);
    await settled();
    expect(engine.snapshot()).toMatchObject({ unlockRequested: true, contextState: 'suspended' });
    context.rejecting = false;
    engine.setHeld(false);
    target.fire('keydown');
    await settled();
    expect(engine.snapshot().contextState).toBe('running');
  });
});

describe('browserAudioHost', () => {
  test('用 window.AudioContext；只有舊版的 webkitAudioContext 也可以；都沒有就是 undefined', () => {
    class Modern {}
    class Legacy {}
    const view = (extra: object): Window & typeof globalThis =>
      ({ addEventListener: () => undefined, removeEventListener: () => undefined, ...extra }) as unknown as Window &
        typeof globalThis;
    expect(browserAudioHost(view({ AudioContext: Modern })).createContext?.()).toBeInstanceOf(Modern);
    expect(browserAudioHost(view({ webkitAudioContext: Legacy })).createContext?.()).toBeInstanceOf(Legacy);
    expect(browserAudioHost(view({})).createContext).toBeUndefined();
  });
});
