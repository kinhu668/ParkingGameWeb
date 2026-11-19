// 撞車警報與救護車燈條的狀態（純表現層）：誰在響、還剩多久、燈現在亮不亮。不 import three、不碰 DOM。
// 畫面（effects/vehicleBeacons.ts）與聲音（audio/soundDirector.ts）都讀這裡，所以聲光同相，暫停時一起停。
import { ALARM_RULES } from '../core/gameConfig';
import type { ObstacleType } from './obstacleTypes';

/** 被撞到的反應：car = 閃燈加喇叭；ambulance = 燈條改快閃並短鳴警笛。 */
export type AlarmKind = 'car' | 'ambulance';

/** 會有反應的類型。不在表裡的（餐車、牆、柱、錐、推車…）與邊界牆只有悶響。 */
export const ALARM_KINDS: Readonly<Partial<Record<ObstacleType, AlarmKind>>> = {
  parked_car: 'car',
  surf_suv: 'car',
  delivery_van: 'car',
};

/** 每個障礙物（與關卡的 `obstaclesFt` 同索引）的反應；null = 沒有。 */
export function alarmKinds(
  obstacles: readonly { readonly type: ObstacleType }[],
): readonly (AlarmKind | null)[] {
  return obstacles.map((obstacle) => ALARM_KINDS[obstacle.type] ?? null);
}

/**
 * 燈怎麼動：flash = 照常閃；steady = 系統要求減少動態效果（prefers-reduced-motion），恆亮；
 * frozen = `?fx=off` 與定格截圖，相位固定在 0，同一個網址每次畫面相同。
 */
export type LampMotion = 'flash' | 'steady' | 'frozen';

/** 這一局的燈怎麼動：`?fx=off` 優先（截圖要能重現），其次是系統的「減少動態效果」。 */
export function lampMotionFor(fxOff: boolean, reducedMotion: boolean): LampMotion {
  if (fxOff) {
    return 'frozen';
  }
  return reducedMotion ? 'steady' : 'flash';
}

/** 一個響著的警報（救護車是「警戒中」）。 */
export interface ActiveAlarm {
  /** 障礙物在關卡 `obstaclesFt` 裡的索引。 */
  readonly index: number;
  readonly kind: AlarmKind;
  /** 從第一次觸發算起過了多久（秒）。再被撞不歸零，所以閃爍相位與聲音不重來。 */
  readonly elapsedS: number;
  /** 還要響多久（秒）。再被撞就重設成整段長度。 */
  readonly remainingS: number;
}

export interface AlarmState {
  /** 這一局經過的模擬秒數（暫停時不走）；燈條的相位用它。 */
  readonly clockS: number;
  /** 響著的警報，依開始的先後（最舊的在前）。 */
  readonly active: readonly ActiveAlarm[];
}

/** 開局與重來：沒有警報，時鐘歸零。 */
export const NO_ALARMS: AlarmState = { clockS: 0, active: [] };

/** 每種反應持續多久（秒）。 */
const DURATION_S: Readonly<Record<AlarmKind, number>> = {
  car: ALARM_RULES.durationS,
  ambulance: ALARM_RULES.sirenYelpS,
};

/**
 * 走一幀。先讓響著的警報過 dtS 秒（到時的拿掉），再處理這一幀計入的碰撞：
 * 沒在響的開始響；已經在響的只把剩餘時間重設（相位不變）。暫停時 dtS = 0，什麼都不動。
 * @param hits 這一幀計入碰撞的障礙物索引（level/hitEvents.ts）；邊界牆的索引超出 kinds，會被略過
 * @param kinds 每個障礙物的反應（alarmKinds）
 */
export function stepAlarms(
  state: AlarmState,
  dtS: number,
  hits: readonly number[],
  kinds: readonly (AlarmKind | null)[],
): AlarmState {
  if (dtS === 0 && hits.length === 0) {
    return state;
  }
  const clockS = state.clockS + dtS;
  if (state.active.length === 0 && hits.length === 0) {
    return { clockS, active: state.active };
  }
  const active = state.active
    .map((alarm) => ({
      ...alarm,
      elapsedS: alarm.elapsedS + dtS,
      remainingS: alarm.remainingS - dtS,
    }))
    .filter((alarm) => alarm.remainingS > 0);
  for (const index of hits) {
    const kind = kinds[index] ?? null;
    if (kind === null) {
      continue;
    }
    const at = active.findIndex((alarm) => alarm.index === index);
    const ringing = active[at];
    if (ringing === undefined) {
      active.push({ index, kind, elapsedS: 0, remainingS: DURATION_S[kind] });
    } else {
      active[at] = { ...ringing, remainingS: DURATION_S[kind] };
    }
  }
  return { clockS, active };
}

/** 停妥或失敗：警報全停、燈熄；時鐘照走（救護車的燈條繼續待機）。 */
export function silenceAlarms(state: AlarmState): AlarmState {
  return state.active.length === 0 ? state : { clockS: state.clockS, active: [] };
}

/** 警報的相位：true 是亮（喇叭響）的半週期。每一次警報都從亮開始。 */
export function alarmPulseOn(elapsedS: number): boolean {
  return elapsedS % ALARM_RULES.flashPeriodS < ALARM_RULES.flashPeriodS / 2;
}

/** 警報燈現在亮不亮：flash 跟著相位閃；steady 與 frozen 恆亮到警報結束。 */
export function alarmLampOn(elapsedS: number, motion: LampMotion): boolean {
  return motion !== 'flash' || alarmPulseOn(elapsedS);
}

/** 燈條的模式：idle = 待機（慢慢左右交替）；alert = 被撞之後的警戒（快閃）。 */
export type LightbarMode = 'idle' | 'alert';

/** 燈條三組燈現在亮不亮，以及亮度倍數（待機是 1）。 */
export interface LightbarLamps {
  /** 左組（紅）。 */
  readonly left: boolean;
  /** 右組（白）。 */
  readonly right: boolean;
  /** 車尾中間的琥珀燈。 */
  readonly rear: boolean;
  readonly level: number;
}

/**
 * 燈條在 timeS 的樣子。flash：左右交替、各佔半個週期，琥珀燈晚四分之一個週期（看起來像在轉）；
 * 每顆燈每個週期只亮一次。frozen：相位固定在 0（只有左組亮）。
 * steady：三組恆亮，待機時緩慢明暗（不是閃爍），警戒只是更亮。
 */
export function lightbarState(
  timeS: number,
  mode: LightbarMode,
  motion: LampMotion = 'flash',
): LightbarLamps {
  const alert = mode === 'alert';
  if (motion === 'steady') {
    const dip = 0.5 - 0.5 * Math.cos(2 * Math.PI * ALARM_RULES.steadyPulseHz * timeS);
    return {
      left: true,
      right: true,
      rear: true,
      level: alert ? ALARM_RULES.lightbarAlertLevel : 1 - ALARM_RULES.steadyPulseDepth * dip,
    };
  }
  const periodS = alert ? ALARM_RULES.lightbarAlertPeriodS : ALARM_RULES.lightbarIdlePeriodS;
  const phase = motion === 'frozen' ? 0 : (timeS / periodS) % 1;
  return {
    left: phase < 0.5,
    right: phase >= 0.5,
    rear: phase >= 0.25 && phase < 0.75,
    level: alert ? ALARM_RULES.lightbarAlertLevel : 1,
  };
}

/** 這個障礙物（救護車）的燈條現在是哪個模式。 */
export function lightbarMode(state: AlarmState, index: number): LightbarMode {
  return state.active.some((alarm) => alarm.index === index) ? 'alert' : 'idle';
}

/** 給 e2e 讀的：一個響著的車輛警報。 */
export interface AlarmSnapshot {
  /** 障礙物在關卡裡的索引。 */
  readonly index: number;
  readonly remainingS: number;
  /** 警報燈現在亮不亮。 */
  readonly lit: boolean;
}

/** 響著的車輛警報（救護車的警戒看 lightbarSnapshots）。 */
export function alarmSnapshots(state: AlarmState, motion: LampMotion): AlarmSnapshot[] {
  return state.active
    .filter((alarm) => alarm.kind === 'car')
    .map((alarm) => ({
      index: alarm.index,
      remainingS: alarm.remainingS,
      lit: alarmLampOn(alarm.elapsedS, motion),
    }));
}

/** 給 e2e 讀的：一台救護車的燈條。 */
export interface LightbarSnapshot {
  /** 障礙物在關卡裡的索引。 */
  readonly index: number;
  readonly mode: LightbarMode;
  readonly left: boolean;
  readonly right: boolean;
  readonly rear: boolean;
}

/** 這一關每台救護車的燈條現況（依障礙物的順序）。 */
export function lightbarSnapshots(
  state: AlarmState,
  kinds: readonly (AlarmKind | null)[],
  motion: LampMotion,
): LightbarSnapshot[] {
  return kinds.flatMap((kind, index) => {
    if (kind !== 'ambulance') {
      return [];
    }
    const mode = lightbarMode(state, index);
    const { left, right, rear } = lightbarState(state.clockS, mode, motion);
    return [{ index, mode, left, right, rear }];
  });
}
