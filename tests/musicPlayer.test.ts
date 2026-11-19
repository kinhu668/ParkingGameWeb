// 背景音樂的播放（音效引擎裡的那一段）：解鎖之前不下載、解鎖後下載該播的那一首、循環的接線與起訖點、
// 淡入、有警報時壓低、音樂開關與靜音、下載或解碼失敗時安靜地沒有音樂。用手寫的假 AudioContext。
import { describe, expect, test } from 'vitest';
import { createAudioEngine, masterGain, type AudioEngine } from '../src/audio/audioEngine';
import { MENU_TRACK, MUSIC_SETTINGS, musicTrackFor, type MusicTrack } from '../src/audio/music';
import type { SoundCommand } from '../src/audio/soundDirector';
import { DEFAULT_AUDIO, type AudioSettings } from '../src/core/save';
import { resolveWeather } from '../src/core/weather';
import { FakeAudioContext, FakeBuffer, FakeGestureTarget, FakeNode, downstream, fakeHost, settled } from './fakeAudio';

const HORN: SoundCommand = { type: 'alarmStart', index: 12, variant: { sound: 'horn', detuneCents: 0 } };
const SIREN: SoundCommand = { type: 'alarmStart', index: 0, variant: { sound: 'siren' } };
const DAY_SAMPLES = MUSIC_SETTINGS.tracks.day.samples;
const NIGHT_SAMPLES = MUSIC_SETTINGS.tracks.night.samples;

interface Stage {
  readonly context: FakeAudioContext;
  readonly target: FakeGestureTarget;
  readonly engine: AudioEngine;
  /** 下載過的網址，依先後。 */
  readonly fetched: string[];
}

/**
 * @param decodedSamples 解碼出來幾個取樣；null = 解不出來
 * @param fetchFails true = 下載不到
 */
function setup(
  track: MusicTrack | null,
  audio: AudioSettings = DEFAULT_AUDIO,
  decodedSamples: number | null = track === 'night' ? NIGHT_SAMPLES : DAY_SAMPLES,
  fetchFails = false,
): Stage {
  const context = new FakeAudioContext();
  context.decoded = decodedSamples === null ? null : new FakeBuffer(2, decodedSamples, 48000);
  const target = new FakeGestureTarget();
  const fetched: string[] = [];
  const engine = createAudioEngine(
    {
      ...fakeHost(context, target),
      fetchAudio: (url) => {
        fetched.push(url);
        return fetchFails ? Promise.reject(new Error('404')) : Promise.resolve(new ArrayBuffer(8));
      },
    },
    audio,
    null,
    track,
  );
  return { context, target, engine, fetched };
}

/** 做第一個手勢，等 context 開始、音樂載入完。 */
async function unlocked(...args: Parameters<typeof setup>): Promise<Stage> {
  const stage = setup(...args);
  stage.target.fire('keydown');
  await settled();
  await settled();
  return stage;
}

/** 音樂的音源（循環的緩衝音源；解鎖用的那一格無聲的不循環）。 */
function sourceOf(context: FakeAudioContext): FakeNode | undefined {
  return context.of('bufferSource').find((node) => node.loop);
}

/** 音源接出去的兩層增益：開關與淡入、音樂匯流排。 */
function chainOf(context: FakeAudioContext): { level: FakeNode; bus: FakeNode } {
  const [level, bus] = downstream(sourceOf(context) ?? new FakeNode('gain'));
  if (level === undefined || bus === undefined) {
    throw new Error('音樂沒有接上');
  }
  return { level, bus };
}

describe('下載的時機', () => {
  test('第一個手勢之前不下載、不建立任何東西；狀態是 idle', async () => {
    const { context, engine, fetched } = setup('day');
    engine.run([HORN]);
    engine.setAudio({ ...DEFAULT_AUDIO, volume: 30 });
    await settled();
    expect(fetched).toEqual([]);
    expect(context.nodes).toEqual([]);
    expect(context.decodes).toBe(0);
    expect(engine.snapshot().music).toEqual({ track: 'day', state: 'idle', ducked: false });
  });

  test('手勢之後只下載這個畫面的那一首，一次；載入中是 loading，開始播是 playing', async () => {
    const { context, target, engine, fetched } = setup('night');
    target.fire('pointerup');
    expect(fetched).toEqual([]);
    expect(engine.snapshot().music.state).toBe('loading');
    await settled();
    await settled();
    expect(fetched).toEqual(['audio/bgm_night.mp3']);
    expect(context.decodes).toBe(1);
    expect(engine.snapshot().music).toEqual({ track: 'night', state: 'playing', ducked: false });
    // 之後的手勢、暫停、重來都不會再下載或重新開始。
    target.fire('keydown');
    engine.setHeld(true);
    await settled();
    engine.setHeld(false);
    await settled();
    engine.run([{ type: 'stopAll', fadeS: 0.05 }, { type: 'ambienceDip' }]);
    await settled();
    expect(fetched).toHaveLength(1);
    expect(context.of('bufferSource').filter((node) => node.loop)).toHaveLength(1);
    expect(sourceOf(context)?.stops).toEqual([]);
  });

  test('哪一首跟著實際的天氣（?weather= 蓋過關卡的）；關卡選擇畫面是白天的', async () => {
    const tracks = async (track: MusicTrack): Promise<string[]> => (await unlocked(track)).fetched;
    expect(await tracks(musicTrackFor(resolveWeather('', 'clear')))).toEqual(['audio/bgm_day.mp3']);
    expect(await tracks(musicTrackFor(resolveWeather('?weather=storm', 'clear')))).toEqual(['audio/bgm_night.mp3']);
    expect(await tracks(musicTrackFor(resolveWeather('?weather=rain', 'night')))).toEqual(['audio/bgm_day.mp3']);
    expect(await tracks(MENU_TRACK)).toEqual(['audio/bgm_day.mp3']);
  });

  test('這個畫面沒有音樂、或瀏覽器不能下載：沒有音樂的節點，狀態是 idle', async () => {
    const none = await unlocked(null);
    expect(none.fetched).toEqual([]);
    expect(sourceOf(none.context)).toBeUndefined();
    expect(none.engine.snapshot().music).toEqual({ track: null, state: 'idle', ducked: false });

    const context = new FakeAudioContext();
    const target = new FakeGestureTarget();
    const engine = createAudioEngine(fakeHost(context, target), DEFAULT_AUDIO, null, 'day');
    target.fire('keydown');
    await settled();
    expect(sourceOf(context)).toBeUndefined();
    expect(engine.snapshot().music).toEqual({ track: 'day', state: 'idle', ducked: false });
  });
});

describe('接線與循環', () => {
  test('音源 → 開關與淡入 → 音樂匯流排（0.35）→ 主音量 → 限幅器 → 輸出；不經過 sfx', async () => {
    const { context } = await unlocked('day');
    const source = sourceOf(context);
    expect(source?.buffer).toBe(context.decoded);
    const path = downstream(source ?? new FakeNode('gain'));
    expect(path.map((node) => node.kind)).toEqual(['gain', 'gain', 'gain', 'compressor', 'destination']);
    const { level, bus } = chainOf(context);
    expect(bus.gain.value).toBe(MUSIC_SETTINGS.gain);
    expect(MUSIC_SETTINGS.gain).toBe(0.35);
    const master = path[2];
    expect(master?.gain.value).toBeCloseTo(masterGain(DEFAULT_AUDIO), 12);
    // 主音量底下三條各自的匯流排：sfx 與音樂（這裡沒有環境聲）。
    const intoMaster = context.of('gain').filter((node) => master !== undefined && node.outputs.includes(master));
    expect(intoMaster).toHaveLength(2);
    expect(intoMaster).toContain(bus);
    expect(level.outputs).toEqual([bus]);
  });

  test('解碼出來剛好是原始長度：從頭循環到尾（64.4 秒／61.6 秒）', async () => {
    const day = sourceOf((await unlocked('day')).context);
    expect([day?.loop, day?.loopStart, day?.loopEnd]).toEqual([true, 0, 64.4]);
    expect(day?.starts).toEqual([0]);
    expect(day?.offsets).toEqual([0]);
    const night = sourceOf((await unlocked('night')).context);
    expect([night?.loop, night?.loopStart, night?.loopEnd]).toEqual([true, 0, 61.6]);
  });

  test('循環的接點：最後 20 毫秒加一條斜坡，最後一個取樣接上循環的第一個取樣（不會「喀」一聲）；更前面的不動', async () => {
    const stage = setup('day');
    const buffer = stage.context.decoded;
    if (buffer === null) {
      throw new Error('沒有緩衝區');
    }
    const channels = [
      { flat: -0.05, first: -0.19 },
      { flat: 0.1, first: 0.3 },
    ];
    channels.forEach(({ flat, first }, channel) => {
      buffer.getChannelData(channel).fill(flat);
      buffer.getChannelData(channel)[0] = first;
    });
    stage.target.fire('keydown');
    await settled();
    await settled();
    expect(sourceOf(stage.context)?.buffer).toBe(buffer);
    const ramp = Math.round(MUSIC_SETTINGS.seamRampS * 48000);
    expect(ramp).toBe(960);
    channels.forEach(({ flat, first }, channel) => {
      const samples = buffer.getChannelData(channel);
      expect(samples[DAY_SAMPLES - 1]).toBeCloseTo(first, 6);
      expect(samples[DAY_SAMPLES - 1 - ramp / 2]).toBeCloseTo((flat + first) / 2, 6);
      expect(samples[DAY_SAMPLES - 1 - ramp]).toBeCloseTo(flat, 6);
      expect(samples[1000]).toBeCloseTo(flat, 6);
      expect(samples[0]).toBeCloseTo(first, 6);
    });
  });

  test('解碼器沒有裁掉編碼器墊的取樣：跳過開頭的 1105 個，循環的長度還是原始長度', async () => {
    // 2685 格 × 1152 個取樣（整個檔，沒有裁）。
    const source = sourceOf((await unlocked('day', DEFAULT_AUDIO, 2685 * 1152)).context);
    const leadS = 1105 / 48000;
    expect(source?.loopStart).toBeCloseTo(leadS, 12);
    expect((source?.loopEnd ?? 0) - (source?.loopStart ?? 0)).toBeCloseTo(64.4, 9);
    expect(source?.offsets[0]).toBeCloseTo(leadS, 12);
  });

  test('開始播的時候從無聲淡入 1.5 秒', async () => {
    const { context } = await unlocked('day');
    const { level } = chainOf(context);
    expect(level.gain.value).toBe(0);
    expect(level.gain.events).toEqual([
      ['cancelScheduledValues', 0],
      ['setValueAtTime', 0, 0],
      ['linearRampToValueAtTime', 1, MUSIC_SETTINGS.fadeInS],
    ]);
    expect(MUSIC_SETTINGS.fadeInS).toBe(1.5);
  });
});

describe('載入失敗', () => {
  test('下載不到：沒有音樂，不丟例外，狀態回到 idle，不重試', async () => {
    const { context, target, engine, fetched } = await unlocked('day', DEFAULT_AUDIO, DAY_SAMPLES, true);
    expect(fetched).toEqual(['audio/bgm_day.mp3']);
    expect(context.decodes).toBe(0);
    expect(sourceOf(context)).toBeUndefined();
    expect(engine.snapshot().music).toEqual({ track: 'day', state: 'idle', ducked: false });
    target.fire('keydown');
    engine.setAudio({ ...DEFAULT_AUDIO, music: false });
    engine.setAudio(DEFAULT_AUDIO);
    await settled();
    expect(fetched).toHaveLength(1);
    // 其他聲音不受影響。
    engine.run([{ type: 'beep', durationS: 0.1 }]);
    expect(engine.snapshot().beeps).toBe(1);
  });

  test('解不出來：一樣沒有音樂', async () => {
    const { context, engine } = await unlocked('day', DEFAULT_AUDIO, null);
    expect(context.decodes).toBe(1);
    expect(sourceOf(context)).toBeUndefined();
    expect(engine.snapshot().music.state).toBe('idle');
  });
});

describe('有警報時壓低', () => {
  test('車輛警報或警笛開始響就壓到一半，全部停了再回來；重來也回來', async () => {
    const { context, engine } = await unlocked('day');
    const { bus } = chainOf(context);
    context.currentTime = 4;
    engine.run([]);
    expect(bus.gain.events).toEqual([]);
    engine.run([HORN]);
    expect(engine.snapshot().music.ducked).toBe(true);
    expect(bus.gain.events).toEqual([['setTargetAtTime', 0.175, 4, MUSIC_SETTINGS.duckTauS]]);
    // 喇叭一響一停（開關）不會讓音樂跟著忽大忽小；第二個警報也不會再壓一次。
    engine.run([{ type: 'alarmGate', index: 12, on: false }, SIREN]);
    expect(bus.gain.events).toHaveLength(1);
    context.currentTime = 9;
    engine.run([{ type: 'alarmStop', index: 12, fadeS: 0.3 }]);
    expect(engine.snapshot().music.ducked).toBe(true);
    engine.run([{ type: 'alarmStop', index: 0, fadeS: 0.3 }]);
    expect(engine.snapshot().music.ducked).toBe(false);
    expect(bus.gain.events[1]).toEqual(['setTargetAtTime', 0.35, 9, MUSIC_SETTINGS.unduckTauS]);
    engine.run([HORN]);
    engine.run([{ type: 'stopAll', fadeS: 0.05 }]);
    expect(engine.snapshot().music.ducked).toBe(false);
    expect(bus.gain.events).toHaveLength(4);
    expect(MUSIC_SETTINGS.duckGain).toBe(0.5);
  });

  test('倒車雷達的長音、嗶聲與悶響不會壓低音樂', async () => {
    const { context, engine } = await unlocked('day');
    engine.run([{ type: 'beepTone', on: true }, { type: 'beep', durationS: 0.1 }, { type: 'thud', gain: 1 }]);
    expect(engine.snapshot().voices).toEqual(['beepTone']);
    expect(engine.snapshot().music.ducked).toBe(false);
    expect(chainOf(context).bus.gain.events).toEqual([]);
  });
});

describe('音樂開關與靜音', () => {
  test('音樂關著：解鎖後不下載，狀態是 off；打開才下載並淡入', async () => {
    const { context, engine, fetched } = await unlocked('day', { ...DEFAULT_AUDIO, music: false });
    expect(fetched).toEqual([]);
    expect(engine.snapshot().music).toEqual({ track: 'day', state: 'off', ducked: false });
    engine.setAudio(DEFAULT_AUDIO);
    expect(engine.snapshot().music.state).toBe('loading');
    await settled();
    await settled();
    expect(fetched).toEqual(['audio/bgm_day.mp3']);
    expect(engine.snapshot().music.state).toBe('playing');
    expect(chainOf(context).level.gain.events.at(-1)).toEqual(['linearRampToValueAtTime', 1, 1.5]);
  });

  test('靜音蓋過音樂開關：靜音時不下載，取消靜音才下載；解鎖前就是 off', async () => {
    const muted = { ...DEFAULT_AUDIO, muted: true };
    const before = setup('day', muted);
    expect(before.engine.snapshot().music.state).toBe('off');
    const { engine, fetched } = await unlocked('day', muted);
    expect(fetched).toEqual([]);
    expect(engine.snapshot().music.state).toBe('off');
    engine.setAudio(DEFAULT_AUDIO);
    await settled();
    await settled();
    expect(fetched).toHaveLength(1);
    expect(engine.snapshot().music.state).toBe('playing');
  });

  test('暫停時（context 停住）關掉：直接設成無聲；再打開從無聲淡入，不重新下載、不重新開始', async () => {
    const { context, engine, fetched } = await unlocked('day');
    const { level } = chainOf(context);
    context.currentTime = 20;
    engine.setHeld(true);
    await settled();
    expect(context.state).toBe('suspended');
    level.gain.value = 1;
    engine.setAudio({ ...DEFAULT_AUDIO, music: false });
    expect(engine.snapshot().music.state).toBe('off');
    expect(level.gain.value).toBe(0);
    expect(level.gain.events.at(-1)).toEqual(['cancelScheduledValues', 20]);
    engine.setAudio(DEFAULT_AUDIO);
    expect(engine.snapshot().music.state).toBe('playing');
    expect(level.gain.events.slice(-3)).toEqual([
      ['cancelScheduledValues', 20],
      ['setValueAtTime', 0, 20],
      ['linearRampToValueAtTime', 1, 21.5],
    ]);
    expect(fetched).toHaveLength(1);
    expect(context.of('bufferSource').filter((node) => node.loop)).toHaveLength(1);
  });

  test('出聲中靜音：音樂很快收掉（不是硬切）；取消靜音再淡入', async () => {
    const { context, engine } = await unlocked('day');
    const { level } = chainOf(context);
    context.currentTime = 7;
    engine.setAudio({ ...DEFAULT_AUDIO, muted: true });
    expect(level.gain.events.slice(-2)).toEqual([
      ['cancelScheduledValues', 7],
      ['setTargetAtTime', 0, 7, MUSIC_SETTINGS.offTauS],
    ]);
    expect(engine.snapshot().music.state).toBe('off');
    context.currentTime = 8;
    engine.setAudio(DEFAULT_AUDIO);
    expect(level.gain.events.at(-1)).toEqual(['linearRampToValueAtTime', 1, 9.5]);
  });

  test('載入中關掉：載完照樣開始走，但沒有聲音', async () => {
    const { context, target, engine } = setup('day');
    target.fire('keydown');
    engine.setAudio({ ...DEFAULT_AUDIO, music: false });
    await settled();
    await settled();
    expect(sourceOf(context)?.starts).toEqual([0]);
    const { level } = chainOf(context);
    expect(level.gain.value).toBe(0);
    expect(level.gain.events).toEqual([]);
    expect(engine.snapshot().music.state).toBe('off');
  });
});
