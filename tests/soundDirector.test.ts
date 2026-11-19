// 聲音導演：悶響的音量、每台車的警報聲、喇叭跟燈號同相、再撞不重來、第 4 台讓位、重來與結束全停、倒車嗶聲的節奏、
// 倒車雷達（越近越快、夠近變長音）。
import { describe, expect, test } from 'vitest';
import {
  DIRECTOR_START,
  alarmVariant,
  beepIntervalS,
  beepLengthS,
  directSound,
  sensorSnapshot,
  thudGain,
  type DirectorFrame,
  type DirectorState,
  type SoundCommand,
} from '../src/audio/soundDirector';
import { VOICE_SETTINGS } from '../src/audio/voices';
import { ALARM_RULES, FIXED_STEP_SECONDS } from '../src/core/gameConfig';
import { mphToMps } from '../src/core/units';
import {
  NO_ALARMS,
  alarmPulseOn,
  silenceAlarms,
  stepAlarms,
  type AlarmKind,
  type AlarmState,
} from '../src/level/alarm';

/** 索引 0、1、3、4 是喇叭型的車，2 是警報器型的車，5 是救護車，6 是錐（沒有反應）。 */
const KINDS: readonly (AlarmKind | null)[] = ['car', 'car', 'car', 'car', 'car', 'ambulance', null];

const QUIET: DirectorFrame = {
  dtS: FIXED_STEP_SECONDS,
  restarted: false,
  running: true,
  gear: 'forward',
  rearDistanceFt: Number.POSITIVE_INFINITY,
  hits: [],
  alarms: NO_ALARMS,
};

/** 一幀一幀跑：每一幀先走警報，再問導演；回傳最後的狀態與全部指令（連同第幾幀）。 */
function play(
  frames: readonly Partial<DirectorFrame & { hitIndices: readonly number[] }>[],
  start: { director: DirectorState; alarms: AlarmState } = { director: DIRECTOR_START, alarms: NO_ALARMS },
): { director: DirectorState; alarms: AlarmState; commands: { frame: number; command: SoundCommand }[] } {
  let { director, alarms } = start;
  const commands: { frame: number; command: SoundCommand }[] = [];
  frames.forEach((partial, frame) => {
    const { hitIndices = [], ...rest } = partial;
    const input = { ...QUIET, ...rest };
    alarms = input.restarted ? NO_ALARMS : stepAlarms(alarms, input.dtS, hitIndices, KINDS);
    if (!input.running) {
      alarms = silenceAlarms(alarms);
    }
    const result = directSound(director, {
      ...input,
      hits: hitIndices.map((index) => ({ index, impactSpeedMps: mphToMps(3) })),
      alarms,
    });
    director = result.state;
    commands.push(...result.commands.map((command) => ({ frame, command })));
  });
  return { director, alarms, commands };
}

/** seconds 秒的安靜幀。 */
function quiet(seconds: number, frame: Partial<DirectorFrame> = {}): Partial<DirectorFrame>[] {
  return Array.from({ length: Math.round(seconds / FIXED_STEP_SECONDS) }, () => frame);
}

function ofType<Type extends SoundCommand['type']>(
  commands: readonly { frame: number; command: SoundCommand }[],
  type: Type,
): (Extract<SoundCommand, { type: Type }> & { frame: number })[] {
  return commands.flatMap(({ frame, command }) =>
    command.type === type ? [{ ...(command as Extract<SoundCommand, { type: Type }>), frame }] : [],
  );
}

describe('悶響', () => {
  test('音量依撞擊車速：0 mph 是 0.4，6 mph 以上是 1，中間線性', () => {
    expect(thudGain(0)).toBeCloseTo(0.4, 6);
    expect(thudGain(mphToMps(3))).toBeCloseTo(0.7, 6);
    expect(thudGain(mphToMps(6))).toBeCloseTo(1, 6);
    expect(thudGain(mphToMps(25))).toBe(1);
  });

  test('每一次計入的碰撞都有悶響，不論撞到的是車、錐還是邊界牆', () => {
    for (const index of [0, 5, 6, 40]) {
      const { commands } = play([{ hitIndices: [index] }]);
      expect(ofType(commands, 'thud')).toHaveLength(1);
    }
  });

  test('同一幀撞到兩個只響一聲，用比較快的那一下', () => {
    const result = directSound(DIRECTOR_START, {
      ...QUIET,
      hits: [
        { index: 6, impactSpeedMps: mphToMps(1) },
        { index: 40, impactSpeedMps: mphToMps(5) },
      ],
    });
    expect(result.commands).toEqual([{ type: 'thud', gain: thudGain(mphToMps(5)) }]);
  });

  test('沒有碰撞就沒有任何指令', () => {
    expect(play(quiet(2)).commands).toEqual([]);
  });
});

describe('每台車的警報聲', () => {
  test('救護車是警笛；每三台車有一台是警報器型；其餘是喇叭型，音高依索引輪流', () => {
    expect(alarmVariant(0, 'ambulance')).toEqual({ sound: 'siren' });
    expect(alarmVariant(2, 'car')).toEqual({ sound: 'yelp' });
    expect(alarmVariant(5, 'car')).toEqual({ sound: 'yelp' });
    expect([0, 1, 3, 4, 6, 7].map((index) => alarmVariant(index, 'car'))).toEqual([
      { sound: 'horn', detuneCents: -200 },
      { sound: 'horn', detuneCents: 0 },
      { sound: 'horn', detuneCents: 300 },
      { sound: 'horn', detuneCents: -200 },
      { sound: 'horn', detuneCents: 150 },
      { sound: 'horn', detuneCents: 300 },
    ]);
  });

  test('同一台車每次都是同一種聲音', () => {
    expect(alarmVariant(7, 'car')).toEqual(alarmVariant(7, 'car'));
  });
});

describe('警報', () => {
  test('撞到車：悶響加一次 alarmStart；撞到錐只有悶響', () => {
    expect(play([{ hitIndices: [1] }]).commands.map(({ command }) => command)).toEqual([
      { type: 'thud', gain: thudGain(mphToMps(3)) },
      { type: 'alarmStart', index: 1, variant: { sound: 'horn', detuneCents: 0 } },
    ]);
    expect(play([{ hitIndices: [6] }]).commands.map(({ command }) => command.type)).toEqual(['thud']);
  });

  test('喇叭的開關跟燈號同一個相位：每半個週期換一次，從響開始', () => {
    const { commands } = play([{ hitIndices: [0] }, ...quiet(2)]);
    const gates = ofType(commands, 'alarmGate');
    // 2 秒 ÷ 0.35 秒 = 5 次切換：關、開、關、開、關。
    expect(gates.map((gate) => gate.on)).toEqual([false, true, false, true, false]);
    for (const gate of gates) {
      // 第 frame 幀時警報已經過了 frame 步；開關與 alarmPulseOn 一致。
      expect(alarmPulseOn(gate.frame * FIXED_STEP_SECONDS)).toBe(gate.on);
    }
    const half = ALARM_RULES.flashPeriodS / 2 / FIXED_STEP_SECONDS;
    expect(gates[0]?.frame).toBe(Math.ceil(half));
  });

  test('警報器型與警笛一直響，不送開關', () => {
    const { commands } = play([{ hitIndices: [2, 5] }, ...quiet(2)]);
    expect(ofType(commands, 'alarmStart').map((start) => start.variant.sound)).toEqual(['yelp', 'siren']);
    expect(ofType(commands, 'alarmGate')).toEqual([]);
  });

  test('響的時候再撞：只有悶響，聲音不重來', () => {
    const { commands } = play([{ hitIndices: [0] }, ...quiet(1), { hitIndices: [0] }, ...quiet(1)]);
    expect(ofType(commands, 'alarmStart')).toHaveLength(1);
    expect(ofType(commands, 'thud')).toHaveLength(2);
    expect(ofType(commands, 'alarmStop')).toEqual([]);
  });

  test('響完自己停：alarmStop 用 expireFadeS；車 6 秒、救護車 2.5 秒', () => {
    const { commands } = play([{ hitIndices: [0, 5] }, ...quiet(7)]);
    const stops = ofType(commands, 'alarmStop');
    expect(stops.map((stop) => [stop.index, stop.fadeS])).toEqual([
      [5, ALARM_RULES.expireFadeS],
      [0, ALARM_RULES.expireFadeS],
    ]);
    expect((stops[0]?.frame ?? 0) * FIXED_STEP_SECONDS).toBeCloseTo(ALARM_RULES.sirenYelpS, 1);
    expect((stops[1]?.frame ?? 0) * FIXED_STEP_SECONDS).toBeCloseTo(ALARM_RULES.durationS, 1);
  });

  test('第 4 個警報響起時最舊的讓位（30 ms 淡出），之後不再回來，燈照閃', () => {
    const result = play([
      { hitIndices: [0] },
      ...quiet(0.5),
      { hitIndices: [1] },
      ...quiet(0.5),
      { hitIndices: [2] },
      ...quiet(0.5),
      { hitIndices: [3] },
      ...quiet(1),
    ]);
    const stops = ofType(result.commands, 'alarmStop');
    expect(stops).toHaveLength(1);
    expect(stops[0]).toMatchObject({ index: 0, fadeS: ALARM_RULES.restartFadeS });
    expect(ofType(result.commands, 'alarmStart').map((start) => start.index)).toEqual([0, 1, 2, 3]);
    // 讓位的那一台還在警報狀態裡（燈照閃），但不再有它的開關指令。
    expect(result.alarms.active.map((alarm) => alarm.index)).toEqual([0, 1, 2, 3]);
    const lastGateOfFirst = ofType(result.commands, 'alarmGate')
      .filter((gate) => gate.index === 0)
      .at(-1);
    expect(lastGateOfFirst?.frame ?? 0).toBeLessThan(stops[0]?.frame ?? 0);
    expect(result.director.known.filter((alarm) => alarm.sounding)).toHaveLength(ALARM_RULES.maxVoices);
  });

  test('讓位的警報響完時不再送 alarmStop', () => {
    const { commands } = play([{ hitIndices: [0, 1, 2, 3] }, ...quiet(7)]);
    // 同一幀四個：最舊的（索引 0）馬上讓位；之後三個各自響完。
    expect(ofType(commands, 'alarmStop').map((stop) => stop.index)).toEqual([0, 1, 2, 3]);
    expect(ofType(commands, 'alarmStop').filter((stop) => stop.index === 0)).toHaveLength(1);
  });
});

describe('全停', () => {
  test('重來：stopAll 用 restartFadeS，之後沒有警報的指令', () => {
    const { commands, director } = play([
      { hitIndices: [0, 5] },
      ...quiet(1),
      { restarted: true },
      ...quiet(7),
    ]);
    expect(ofType(commands, 'stopAll').map((stop) => stop.fadeS)).toEqual([ALARM_RULES.restartFadeS]);
    expect(ofType(commands, 'alarmStop')).toEqual([]);
    expect(director.known).toEqual([]);
    const restartFrame = ofType(commands, 'stopAll')[0]?.frame ?? 0;
    expect(commands.filter(({ frame }) => frame > restartFrame)).toEqual([]);
  });

  test('停妥或失敗：stopAll 用 endFadeS，只送一次；最後那一下的悶響排在它後面', () => {
    const { commands } = play([
      { hitIndices: [0] },
      ...quiet(1),
      { hitIndices: [1], running: false },
      ...quiet(2, { running: false }),
    ]);
    expect(ofType(commands, 'stopAll').map((stop) => stop.fadeS)).toEqual([ALARM_RULES.endFadeS]);
    const endFrame = ofType(commands, 'stopAll')[0]?.frame ?? 0;
    expect(commands.filter(({ frame }) => frame === endFrame).map(({ command }) => command.type)).toEqual([
      'stopAll',
      'thud',
    ]);
    // 結束的那一幀撞到的車不會開始叫；之後也沒有任何指令。
    expect(ofType(commands, 'alarmStart').map((start) => start.index)).toEqual([0]);
    expect(commands.filter(({ frame }) => frame > endFrame)).toEqual([]);
  });

  test('結束之後重來，新的一局照常', () => {
    const { commands } = play([
      { running: false },
      ...quiet(0.5, { running: false }),
      { restarted: true },
      { hitIndices: [0] },
    ]);
    expect(ofType(commands, 'alarmStart')).toHaveLength(1);
  });
});

describe('暫停', () => {
  test('dtS = 0 的幀沒有任何指令：喇叭停在當下，倒車嗶聲不響', () => {
    const started = play([{ hitIndices: [0], gear: 'reverse' }, ...quiet(0.2, { gear: 'reverse' })]);
    const paused = play(quiet(5, { dtS: 0, gear: 'reverse' }), started);
    expect(paused.commands).toEqual([]);
    // 繼續之後從停住的相位接下去：再過 0.15 秒左右才第一次關。
    const resumed = play(quiet(0.3, { gear: 'reverse' }), paused);
    expect(ofType(resumed.commands, 'alarmGate').map((gate) => gate.on)).toEqual([false]);
  });
});

describe('倒車嗶聲', () => {
  const period = VOICE_SETTINGS.beep.periodS;

  test('掛進 R 檔的那一幀就響第一聲，之後每 0.8 秒（模擬時間）一聲', () => {
    const { commands } = play([...quiet(1), ...quiet(3.9, { gear: 'reverse' })]);
    const beeps = ofType(commands, 'beep');
    const first = Math.round(1 / FIXED_STEP_SECONDS);
    expect(beeps[0]?.frame).toBe(first);
    expect(beeps).toHaveLength(5);
    beeps.forEach((beep, count) => {
      expect((beep.frame - first) * FIXED_STEP_SECONDS).toBeCloseTo(count * period, 1);
    });
  });

  test('切回 D 檔就不再響；再掛 R 檔立刻又響', () => {
    const { commands } = play([
      ...quiet(0.3, { gear: 'reverse' }),
      ...quiet(3),
      ...quiet(0.3, { gear: 'reverse' }),
    ]);
    const frames = ofType(commands, 'beep').map((beep) => beep.frame);
    expect(frames).toEqual([0, Math.round(3.3 / FIXED_STEP_SECONDS)]);
  });

  test('這一局結束之後不響；D 檔不響', () => {
    expect(ofType(play(quiet(2, { gear: 'reverse', running: false })).commands, 'beep')).toEqual([]);
    expect(ofType(play(quiet(2)).commands, 'beep')).toEqual([]);
  });

  test('重來的那一幀回到 D 檔：不響', () => {
    const { commands } = play([
      ...quiet(0.3, { gear: 'reverse' }),
      { restarted: true },
      ...quiet(1),
    ]);
    expect(ofType(commands, 'beep')).toHaveLength(1);
  });
});

describe('倒車雷達：距離 → 節奏', () => {
  const { farFt, nearFt, periodS, nearPeriodS, durationS, dutyShare } = VOICE_SETTINGS.beep;

  test('8 ft 以外（含正後方沒有東西）是原本的 0.8 秒；剛好 1 ft 是 0.13 秒；不到 1 ft 是 0（長音）', () => {
    expect([farFt, nearFt, periodS, nearPeriodS]).toEqual([8, 1, 0.8, 0.13]);
    expect(beepIntervalS(Number.POSITIVE_INFINITY)).toBe(periodS);
    expect(beepIntervalS(40)).toBe(periodS);
    expect(beepIntervalS(farFt)).toBeCloseTo(periodS, 9);
    expect(beepIntervalS(nearFt)).toBeCloseTo(nearPeriodS, 9);
    expect(beepIntervalS(nearFt - 0.001)).toBe(0);
    expect(beepIntervalS(0)).toBe(0);
  });

  test('中間隨距離線性縮短：4.5 ft 是兩端的平均', () => {
    expect(beepIntervalS((farFt + nearFt) / 2)).toBeCloseTo((periodS + nearPeriodS) / 2, 9);
  });

  test('越近間隔越短（單調），而且在 1 ft 以外是連續的（沒有跳一大格）', () => {
    let previous = beepIntervalS(12);
    for (let distance = 12; distance >= 0; distance -= 0.01) {
      const interval = beepIntervalS(distance);
      expect(interval).toBeLessThanOrEqual(previous + 1e-12);
      if (distance >= nearFt) {
        expect(previous - interval).toBeLessThan(0.002);
      }
      previous = interval;
    }
  });

  test('一聲的長度跟著間隔縮短，永遠比間隔短：0.8 秒時是 0.22 秒，0.13 秒時約 0.07 秒', () => {
    expect(beepLengthS(periodS)).toBe(durationS);
    expect(beepLengthS(nearPeriodS)).toBeCloseTo(nearPeriodS * dutyShare, 9);
    for (let distance = nearFt; distance <= 12; distance += 0.05) {
      const interval = beepIntervalS(distance);
      expect(beepLengthS(interval)).toBeLessThan(interval - VOICE_SETTINGS.beep.gapS);
      // 起音與收音各 8 ms 放得進去。
      expect(beepLengthS(interval)).toBeGreaterThan(4 * VOICE_SETTINGS.beep.edgeS);
    }
  });
});

describe('倒車雷達：導演', () => {
  const beep = VOICE_SETTINGS.beep;
  const reverse = (rearDistanceFt: number): Partial<DirectorFrame> => ({ gear: 'reverse', rearDistanceFt });
  const gapsS = (frames: readonly number[]): number[] =>
    frames.slice(1).map((frame, index) => (frame - (frames[index] ?? 0)) * FIXED_STEP_SECONDS);

  test('距離固定時照那個距離的間隔嗶：4.5 ft 約 0.465 秒一聲，1.2 ft 約 0.15 秒一聲，而且比較短', () => {
    for (const distance of [4.5, 1.2]) {
      const beeps = ofType(play(quiet(3, reverse(distance))).commands, 'beep');
      const interval = beepIntervalS(distance);
      expect(beeps.length).toBeGreaterThan(3 / interval - 2);
      for (const gap of gapsS(beeps.map((each) => each.frame))) {
        // 一幀 1/60 秒：間隔是「不小於那個間隔的最少幀數」。
        expect(gap).toBeGreaterThanOrEqual(interval - 1e-9);
        expect(gap).toBeLessThan(interval + FIXED_STEP_SECONDS + 1e-9);
      }
      for (const each of beeps) {
        expect(each.durationS).toBeCloseTo(beepLengthS(interval), 9);
      }
    }
  });

  test('一路倒車靠近：嗶聲越來越密、越來越短，最後換成長音，之後不再一聲一聲地嗶', () => {
    // 3 秒內從 10 ft 退到 0.4 ft（約 2.2 mph）。
    const frames = Array.from({ length: 180 }, (_, frame) => reverse(10 - (9.6 * frame) / 179));
    const { commands, director } = play(frames);
    const beeps = ofType(commands, 'beep');
    const gaps = gapsS(beeps.map((each) => each.frame));
    expect(beeps.length).toBeGreaterThanOrEqual(6);
    gaps.slice(1).forEach((gap, index) => {
      expect(gap).toBeLessThanOrEqual((gaps[index] ?? 0) + 1e-9);
    });
    expect(gaps[0]).toBeGreaterThan(0.6);
    expect(gaps.at(-1)).toBeLessThan(0.25);
    beeps.slice(1).forEach((each, index) => {
      expect(each.durationS).toBeLessThanOrEqual((beeps[index]?.durationS ?? 0) + 1e-9);
    });
    // 下一聲永遠在上一聲結束之後。
    beeps.slice(1).forEach((each, index) => {
      const previous = beeps[index];
      expect((each.frame - (previous?.frame ?? 0)) * FIXED_STEP_SECONDS).toBeGreaterThanOrEqual(
        (previous?.durationS ?? 0) + beep.gapS - 1e-9,
      );
    });
    const tones = ofType(commands, 'beepTone');
    expect(tones.map((tone) => tone.on)).toEqual([true]);
    expect(beeps.every((each) => each.frame < (tones[0]?.frame ?? 0))).toBe(true);
    expect(director.tone).toBe(true);
    expect(sensorSnapshot(director)).toMatchObject({ beepIntervalS: 0, continuousBeep: true });
    expect(sensorSnapshot(director).rearDistanceFt).toBeCloseTo(0.4, 9);
  });

  test('長音等上一聲嗶結束才開始（同頻率的兩個聲音不疊在一起）', () => {
    // 遠處先嗶一聲（0.22 秒長），下一幀起突然只剩 0.5 ft。
    const { commands } = play([reverse(20), ...quiet(1, reverse(0.5))]);
    const [first] = ofType(commands, 'beep');
    const [tone] = ofType(commands, 'beepTone');
    expect(ofType(commands, 'beep')).toHaveLength(1);
    expect(tone?.on).toBe(true);
    expect(((tone?.frame ?? 0) - (first?.frame ?? 0)) * FIXED_STEP_SECONDS).toBeGreaterThanOrEqual(
      beep.durationS - 1e-9,
    );
    expect(((tone?.frame ?? 0) - (first?.frame ?? 0)) * FIXED_STEP_SECONDS).toBeLessThan(
      beep.durationS + 2 * FIXED_STEP_SECONDS,
    );
  });

  test('已經貼著後面的東西才掛 R 檔：直接是長音，沒有那一聲嗶', () => {
    const { commands } = play(quiet(0.5, reverse(0.3)));
    expect(commands).toEqual([{ frame: 0, command: { type: 'beepTone', on: true } }]);
  });

  test('長音響起之後要退到 1.25 ft 以外才變回一聲一聲；退開之後隔一個間隔才嗶第一聲', () => {
    const near = play(quiet(0.5, reverse(0.8)));
    const held = play(quiet(1, reverse(1.2)), near);
    expect(held.commands).toEqual([]);
    expect(sensorSnapshot(held.director)).toEqual({ rearDistanceFt: 1.2, beepIntervalS: 0, continuousBeep: true });
    const released = play(quiet(1, reverse(1.3)), held);
    expect(released.commands[0]).toEqual({ frame: 0, command: { type: 'beepTone', on: false } });
    const beeps = ofType(released.commands, 'beep');
    expect(beeps.length).toBeGreaterThan(3);
    expect((beeps[0]?.frame ?? 0) * FIXED_STEP_SECONDS).toBeGreaterThanOrEqual(beepIntervalS(1.3) - 0.02);
    // 沒開過長音的時候，1.2 ft 是一聲一聲的（遲滯只在長音響著時才有）。
    expect(ofType(play(quiet(1, reverse(1.2))).commands, 'beepTone')).toEqual([]);
  });

  const ended: Partial<DirectorFrame> = { ...reverse(0.5), running: false };
  test.each<[string, Partial<DirectorFrame>, Partial<DirectorFrame>]>([
    ['切回 D 檔', { gear: 'forward' }, {}],
    ['這一局結束', ended, ended],
    ['重來', { restarted: true }, {}],
  ])('%s：長音停掉', (_name, frame, later) => {
    const near = play(quiet(0.5, reverse(0.5)));
    const after = play([frame, ...quiet(0.5, later)], near);
    expect(ofType(after.commands, 'beepTone')).toEqual([{ type: 'beepTone', on: false, frame: 0 }]);
    expect(after.director.tone).toBe(false);
    expect(sensorSnapshot(after.director)).toEqual({
      rearDistanceFt: null,
      beepIntervalS: null,
      continuousBeep: false,
    });
  });

  test('暫停（dtS = 0）：不嗶、長音的狀態不變；繼續之後接著原本的相位', () => {
    const started = play(quiet(0.3, reverse(4.5)));
    const paused = play(quiet(5, { ...reverse(4.5), dtS: 0 }), started);
    expect(paused.commands).toEqual([]);
    const resumed = play(quiet(0.3, reverse(4.5)), paused);
    // 0.3 秒前嗶過一聲，間隔 0.465 秒：繼續後約 0.165 秒嗶下一聲。
    const [next] = ofType(resumed.commands, 'beep');
    expect((next?.frame ?? 0) * FIXED_STEP_SECONDS).toBeCloseTo(beepIntervalS(4.5) - 0.3, 1);

    const toned = play(quiet(0.3, reverse(0.5)));
    expect(play(quiet(5, { ...reverse(0.5), dtS: 0 }), toned).commands).toEqual([]);
  });

  test('一幀很長（卡了一下）也只嗶一聲，不會補嗶', () => {
    const { commands } = play([reverse(1.2), { ...reverse(1.2), dtS: 0.25 }, reverse(1.2)]);
    expect(ofType(commands, 'beep').map((each) => each.frame)).toEqual([0, 1]);
  });

  test('快照：不在 R 檔沒有讀數；R 檔而正後方沒有東西，距離是 null、間隔是 0.8 秒', () => {
    expect(sensorSnapshot(DIRECTOR_START)).toEqual({
      rearDistanceFt: null,
      beepIntervalS: null,
      continuousBeep: false,
    });
    expect(sensorSnapshot(play([reverse(Number.POSITIVE_INFINITY)]).director)).toEqual({
      rearDistanceFt: null,
      beepIntervalS: 0.8,
      continuousBeep: false,
    });
    expect(sensorSnapshot(play([reverse(4.5)]).director)).toEqual({
      rearDistanceFt: 4.5,
      beepIntervalS: beepIntervalS(4.5),
      continuousBeep: false,
    });
  });
});
