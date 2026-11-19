// 聲音導演：悶響的音量、每台車的警報聲、喇叭跟燈號同相、再撞不重來、第 4 台讓位、重來與結束全停、倒車嗶聲的節奏。
import { describe, expect, test } from 'vitest';
import {
  DIRECTOR_START,
  alarmVariant,
  directSound,
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
