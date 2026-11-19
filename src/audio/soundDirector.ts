// 聲音導演（純邏輯）：每幀吃遊戲狀態，吐出聲音指令。不碰 Web Audio、不 import three、不碰 DOM。
// 警報的開關用 level/alarm.ts 的同一個相位，所以聲音與閃燈同步，暫停（dtS = 0）時一起停住。
import { ALARM_RULES } from '../core/gameConfig';
import { mpsToMph } from '../core/units';
import { alarmPulseOn, type AlarmKind, type AlarmState } from '../level/alarm';
import type { CountedHit } from '../level/hitEvents';
import type { Gear } from '../vehicle/gearbox';
import { VOICE_SETTINGS } from './voices';

/** 一個警報用哪種聲音：喇叭型（每台車音高不同）、警報器型、救護車的警笛。 */
export type AlarmVariant =
  | { readonly sound: 'horn'; readonly detuneCents: number }
  | { readonly sound: 'yelp' }
  | { readonly sound: 'siren' };

/** 給音效引擎的指令。index 是障礙物在關卡裡的索引。 */
export type SoundCommand =
  | { readonly type: 'thud'; readonly gain: number }
  /** 倒車雷達的一聲嗶，長 durationS 秒。 */
  | { readonly type: 'beep'; readonly durationS: number }
  /** 倒車雷達的長音（快碰到了）開始或停掉。 */
  | { readonly type: 'beepTone'; readonly on: boolean }
  | { readonly type: 'alarmStart'; readonly index: number; readonly variant: AlarmVariant }
  | { readonly type: 'alarmGate'; readonly index: number; readonly on: boolean }
  | { readonly type: 'alarmStop'; readonly index: number; readonly fadeS: number }
  | { readonly type: 'stopAll'; readonly fadeS: number };

/** 導演記得的一個警報：sounding = 還有聲音（讓位之後是 false，燈照閃）；gateOn = 上一幀喇叭是不是響的。 */
interface KnownAlarm {
  readonly index: number;
  readonly sounding: boolean;
  readonly gateOn: boolean;
}

export interface DirectorState {
  /** 響著的警報，依開始的先後（最舊的在前）。 */
  readonly known: readonly KnownAlarm[];
  /** 掛在 R 檔之後、離上一聲嗶開始（或長音結束）過了多久（模擬秒）；不在 R 檔是 null。 */
  readonly reverseS: number | null;
  /** 上一聲嗶多長（秒）：它還沒結束，下一聲與長音都不會開始。 */
  readonly beepLengthS: number;
  /** 倒車雷達的長音是不是響著。 */
  readonly tone: boolean;
  /** 這一幀雷達量到的距離（ft）；不在 R 檔是 null，正後方沒有東西是 Infinity。 */
  readonly rearDistanceFt: number | null;
  /** 上一幀這一局是不是還在進行。 */
  readonly running: boolean;
}

/** 開局。 */
export const DIRECTOR_START: DirectorState = {
  known: [],
  reverseS: null,
  beepLengthS: 0,
  tone: false,
  rearDistanceFt: null,
  running: true,
};

/** 一幀的遊戲狀態。 */
export interface DirectorFrame {
  /** 這一幀走了多少模擬時間（秒）；暫停時是 0。 */
  readonly dtS: number;
  /** 這一幀重來了。 */
  readonly restarted: boolean;
  /** 這一局還在進行（還沒停妥、還沒失敗）。 */
  readonly running: boolean;
  readonly gear: Gear;
  /** 車尾到正後方最近的碰撞盒的距離（ft；level/rearSensor.ts），沒有東西是 Infinity。只在 R 檔用到。 */
  readonly rearDistanceFt: number;
  /** 這一幀計入的碰撞（level/hitEvents.ts）。 */
  readonly hits: readonly CountedHit[];
  /** 這一幀之後的警報狀態。 */
  readonly alarms: AlarmState;
}

/** 喇叭型警報每台車的變調（音分），依障礙物索引輪流。 */
const HORN_DETUNE_CENTS = [-200, 0, 150, 300] as const;
/** 每幾台車有一台用警報器型。 */
const YELP_EVERY = 3;

/** 這個障礙物的警報用哪種聲音。同一台車每次都一樣。 */
export function alarmVariant(index: number, kind: AlarmKind): AlarmVariant {
  if (kind === 'ambulance') {
    return { sound: 'siren' };
  }
  if (index % YELP_EVERY === YELP_EVERY - 1) {
    return { sound: 'yelp' };
  }
  return { sound: 'horn', detuneCents: HORN_DETUNE_CENTS[index % HORN_DETUNE_CENTS.length] ?? 0 };
}

/** 悶響的音量：依撞擊車速，從 minGain 線性到 1。 */
export function thudGain(impactSpeedMps: number): number {
  const { minGain, fullSpeedMph } = VOICE_SETTINGS.thud;
  const share = Math.min(mpsToMph(impactSpeedMps) / fullSpeedMph, 1);
  return minGain + (1 - minGain) * share;
}

/**
 * 倒車雷達：車尾離後面的東西 distanceFt 時，兩聲嗶隔多久（秒）。farFt 以外是原本的慢節奏，
 * 往 nearFt 線性縮短；不到 nearFt 是 0（連續的長音）。
 */
export function beepIntervalS(distanceFt: number): number {
  const { farFt, nearFt, periodS, nearPeriodS } = VOICE_SETTINGS.beep;
  if (distanceFt < nearFt) {
    return 0;
  }
  const share = Math.min((distanceFt - nearFt) / (farFt - nearFt), 1);
  return nearPeriodS + (periodS - nearPeriodS) * share;
}

/** 兩聲隔 intervalS 秒時，一聲嗶多長（秒）：平常是 durationS，嗶得快就跟著縮短，兩聲之間一定有空檔。 */
export function beepLengthS(intervalS: number): number {
  const { durationS, dutyShare } = VOICE_SETTINGS.beep;
  return Math.min(durationS, intervalS * dutyShare);
}

/** 給 e2e 讀的倒車雷達狀態（併在 `__parkingGame.audio()` 裡）。 */
export interface SensorSnapshot {
  /** 車尾到正後方最近的東西的距離（ft）；不在 R 檔、這一局結束了、或正後方沒有東西是 null。 */
  readonly rearDistanceFt: number | null;
  /** 現在兩聲嗶隔多久（秒）；長音是 0；不在 R 檔是 null。 */
  readonly beepIntervalS: number | null;
  /** 長音是不是響著。 */
  readonly continuousBeep: boolean;
}

export function sensorSnapshot(state: DirectorState): SensorSnapshot {
  const { rearDistanceFt, tone } = state;
  return {
    rearDistanceFt: rearDistanceFt !== null && Number.isFinite(rearDistanceFt) ? rearDistanceFt : null,
    beepIntervalS: rearDistanceFt === null ? null : tone ? 0 : beepIntervalS(rearDistanceFt),
    continuousBeep: tone,
  };
}

/** 比較模擬時間用的容許誤差（秒）：60 步各 1/60 秒加起來不會剛好是 1。 */
const TIME_EPSILON_S = 1e-9;

/**
 * 走一幀。指令的順序：先全停（重來、剛結束），再悶響（所以最後那一下撞擊聽得到），然後警報、倒車雷達。
 */
export function directSound(
  state: DirectorState,
  frame: DirectorFrame,
): { readonly state: DirectorState; readonly commands: readonly SoundCommand[] } {
  const commands: SoundCommand[] = [];
  let before = state.known;
  if (frame.restarted) {
    commands.push({ type: 'stopAll', fadeS: ALARM_RULES.restartFadeS });
    before = [];
  } else if (state.running && !frame.running) {
    commands.push({ type: 'stopAll', fadeS: ALARM_RULES.endFadeS });
    before = [];
  }

  // 同一幀撞到好幾個只響一聲，用最快的那一下。
  if (frame.hits.length > 0) {
    const fastestMps = Math.max(...frame.hits.map((hit) => hit.impactSpeedMps));
    commands.push({ type: 'thud', gain: thudGain(fastestMps) });
  }

  const active = frame.running ? frame.alarms.active : [];
  for (const alarm of before) {
    if (alarm.sounding && !active.some((ringing) => ringing.index === alarm.index)) {
      commands.push({ type: 'alarmStop', index: alarm.index, fadeS: ALARM_RULES.expireFadeS });
    }
  }
  const known = active.map((alarm): KnownAlarm => {
    const variant = alarmVariant(alarm.index, alarm.kind);
    const gateOn = variant.sound !== 'horn' || alarmPulseOn(alarm.elapsedS);
    const earlier = before.find((candidate) => candidate.index === alarm.index);
    if (earlier === undefined) {
      // 新的警報從響的半週期開始（elapsedS = 0），不必另外送開關。
      commands.push({ type: 'alarmStart', index: alarm.index, variant });
      return { index: alarm.index, sounding: true, gateOn: true };
    }
    if (earlier.sounding && earlier.gateOn !== gateOn) {
      commands.push({ type: 'alarmGate', index: alarm.index, on: gateOn });
    }
    return { ...earlier, gateOn };
  });
  // 超過上限：最舊的讓位（它的燈照常閃完，聲音不再回來）。
  let sounding = known.filter((alarm) => alarm.sounding).length;
  for (let at = 0; at < known.length && sounding > ALARM_RULES.maxVoices; at += 1) {
    const alarm = known[at];
    if (alarm?.sounding === true) {
      commands.push({ type: 'alarmStop', index: alarm.index, fadeS: ALARM_RULES.restartFadeS });
      known[at] = { ...alarm, sounding: false };
      sounding -= 1;
    }
  }

  // 倒車雷達：掛進 R 檔的那一幀先響一聲；之後離上一聲超過「現在這個距離的間隔」就再響一聲（模擬時間），
  // 所以車一靠近，下一聲馬上提前；夠近就換成長音，退開一點才變回一聲一聲。
  const beep = VOICE_SETTINGS.beep;
  let reverseS: number | null = null;
  let lengthS = 0;
  let tone = false;
  let rearDistanceFt: number | null = null;
  if (frame.running && frame.gear === 'reverse') {
    rearDistanceFt = frame.rearDistanceFt;
    const first = state.reverseS === null;
    const sinceS = state.reverseS === null ? 0 : state.reverseS + frame.dtS;
    const close = rearDistanceFt < (state.tone ? beep.releaseFt : beep.nearFt);
    const intervalS = beepIntervalS(rearDistanceFt);
    // 上一聲還沒結束就等它結束：兩個同頻率的聲音疊在一起會忽大忽小。
    tone = close && (state.tone || sinceS >= state.beepLengthS - TIME_EPSILON_S);
    reverseS = sinceS;
    lengthS = state.beepLengthS;
    if (tone) {
      reverseS = 0;
      lengthS = 0;
    } else if (
      !close &&
      (first || sinceS >= Math.max(intervalS, state.beepLengthS + beep.gapS) - TIME_EPSILON_S)
    ) {
      lengthS = beepLengthS(intervalS);
      commands.push({ type: 'beep', durationS: lengthS });
      reverseS = 0;
    }
  }
  if (tone !== state.tone) {
    commands.push({ type: 'beepTone', on: tone });
  }
  return {
    state: { known, reverseS, beepLengthS: lengthS, tone, rearDistanceFt, running: frame.running },
    commands,
  };
}
