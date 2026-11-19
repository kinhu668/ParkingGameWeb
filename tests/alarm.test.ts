// 撞車警報的狀態：哪些類型會叫、觸發、再撞只延長、到時熄滅、暫停不前進、重來清空、閃光每秒不超過 3 次。
import { describe, expect, test } from 'vitest';
import { ALARM_RULES, FIXED_STEP_SECONDS } from '../src/core/gameConfig';
import {
  ALARM_KINDS,
  NO_ALARMS,
  alarmKinds,
  alarmLampOn,
  alarmPulseOn,
  alarmSnapshots,
  lampMotionFor,
  silenceAlarms,
  stepAlarms,
  type AlarmKind,
  type AlarmState,
} from '../src/level/alarm';
import { levelById } from '../src/level/levelCatalog';
import { OBSTACLE_TYPES } from '../src/level/obstacleTypes';

/** 索引 0、1 是車，2 是錐（沒有反應），3 是救護車；4 以後是邊界牆（不在表裡）。 */
const KINDS: readonly (AlarmKind | null)[] = ['car', 'car', null, 'ambulance'];

/** 沒有新的碰撞，連走 seconds 秒（一步 1/60 秒）。 */
function wait(state: AlarmState, seconds: number): AlarmState {
  let current = state;
  for (let step = 0; step < Math.round(seconds / FIXED_STEP_SECONDS); step += 1) {
    current = stepAlarms(current, FIXED_STEP_SECONDS, [], KINDS);
  }
  return current;
}

/** 一秒內由暗變亮的次數最多幾次（每 1 ms 取樣一次，滑動 1 秒的視窗）。 */
function maxFlashesPerSecond(lit: (timeS: number) => boolean, seconds: number): number {
  const rises: number[] = [];
  let previous = false;
  for (let ms = 0; ms <= seconds * 1000; ms += 1) {
    const now = lit((ms + 0.5) / 1000);
    if (now && !previous) {
      rises.push(ms);
    }
    previous = now;
  }
  return Math.max(
    0,
    ...rises.map((start) => rises.filter((at) => at >= start && at < start + 1000).length),
  );
}

describe('哪些障礙物會叫', () => {
  test('停放車、衝浪休旅車、快遞貨車是車的警報，救護車是警笛；其餘沒有反應', () => {
    expect(ALARM_KINDS).toEqual({ parked_car: 'car', surf_suv: 'car', delivery_van: 'car', ambulance: 'ambulance' });
    expect(alarmKinds([{ type: 'ambulance' }, { type: 'delivery_van' }])).toEqual(['ambulance', 'car']);
    for (const type of ['food_truck', 'wall', 'pillar', 'cone', 'shopping_cart', 'bollard'] as const) {
      expect(alarmKinds([{ type }])).toEqual([null]);
    }
    const silent = OBSTACLE_TYPES.filter((type) => ALARM_KINDS[type] === undefined);
    expect(silent).toContain('food_truck');
    expect(silent).toContain('fire_hydrant');
  });

  test('alarmKinds 與關卡的 obstaclesFt 同索引（含 rows 展開的停放車）', () => {
    const level = levelById('w1_l09');
    if (level === undefined) {
      throw new Error('找不到 w1_l09');
    }
    const kinds = alarmKinds(level.obstaclesFt);
    expect(kinds).toHaveLength(level.obstaclesFt.length);
    level.obstaclesFt.forEach((obstacle, index) => {
      expect(kinds[index]).toBe(ALARM_KINDS[obstacle.type] ?? null);
    });
    expect(kinds.filter((kind) => kind === 'car').length).toBeGreaterThan(0);
  });
});

describe('stepAlarms', () => {
  test('被計次的車開始響：整段 6 秒、從亮開始', () => {
    const state = stepAlarms(NO_ALARMS, FIXED_STEP_SECONDS, [1], KINDS);
    expect(state.active).toEqual([{ index: 1, kind: 'car', elapsedS: 0, remainingS: 6 }]);
    expect(alarmSnapshots(state, 'flash')).toEqual([{ index: 1, remainingS: 6, lit: true }]);
  });

  test('沒有反應的障礙物與邊界牆：什麼都不會響', () => {
    const state = stepAlarms(NO_ALARMS, FIXED_STEP_SECONDS, [2, 4, 7], KINDS);
    expect(state.active).toEqual([]);
  });

  test('約 6 秒後自己停', () => {
    const ringing = stepAlarms(NO_ALARMS, 0, [0], KINDS);
    expect(wait(ringing, 5.9).active).toHaveLength(1);
    expect(wait(ringing, 6.1).active).toEqual([]);
  });

  test('響著的時候再被計次：剩餘時間回到 6 秒，已經響了多久不歸零（相位與聲音不重來）', () => {
    const ringing = wait(stepAlarms(NO_ALARMS, 0, [0], KINDS), 2);
    const again = stepAlarms(ringing, FIXED_STEP_SECONDS, [0], KINDS);
    expect(again.active).toHaveLength(1);
    expect(again.active[0]?.remainingS).toBe(6);
    expect(again.active[0]?.elapsedS).toBeCloseTo(2 + FIXED_STEP_SECONDS, 9);
    // 從第二次算起再響 6 秒。
    expect(wait(again, 5.9).active).toHaveLength(1);
    expect(wait(again, 6.1).active).toEqual([]);
  });

  test('各響各的，依開始的先後排', () => {
    const first = wait(stepAlarms(NO_ALARMS, 0, [1], KINDS), 1);
    const both = stepAlarms(first, FIXED_STEP_SECONDS, [0], KINDS);
    expect(both.active.map((alarm) => alarm.index)).toEqual([1, 0]);
    // 先響的先停。
    expect(wait(both, 5.5).active.map((alarm) => alarm.index)).toEqual([0]);
  });

  test('同一幀撞到兩台：兩個都響', () => {
    const state = stepAlarms(NO_ALARMS, FIXED_STEP_SECONDS, [0, 1], KINDS);
    expect(state.active.map((alarm) => alarm.index)).toEqual([0, 1]);
  });

  test('救護車：警戒 2.5 秒，不算車的警報', () => {
    const alert = stepAlarms(NO_ALARMS, 0, [3], KINDS);
    expect(alert.active).toEqual([{ index: 3, kind: 'ambulance', elapsedS: 0, remainingS: 2.5 }]);
    expect(alarmSnapshots(alert, 'flash')).toEqual([]);
    expect(wait(alert, 2.4).active).toHaveLength(1);
    expect(wait(alert, 2.6).active).toEqual([]);
  });

  test('暫停（dt = 0、沒有碰撞）：回傳同一個狀態', () => {
    const ringing = wait(stepAlarms(NO_ALARMS, 0, [0], KINDS), 1);
    expect(stepAlarms(ringing, 0, [], KINDS)).toBe(ringing);
    expect(stepAlarms(NO_ALARMS, 0, [], KINDS)).toBe(NO_ALARMS);
  });

  test('時鐘只跟著模擬時間走', () => {
    expect(wait(NO_ALARMS, 3).clockS).toBeCloseTo(3, 6);
    expect(wait(stepAlarms(NO_ALARMS, 0, [0], KINDS), 3).clockS).toBeCloseTo(3, 6);
  });

  test('停妥或失敗：警報全停，時鐘不變；重來用 NO_ALARMS', () => {
    const ringing = wait(stepAlarms(NO_ALARMS, 0, [0, 3], KINDS), 1);
    const silenced = silenceAlarms(ringing);
    expect(silenced.active).toEqual([]);
    expect(silenced.clockS).toBe(ringing.clockS);
    expect(silenceAlarms(silenced)).toBe(silenced);
    expect(NO_ALARMS).toEqual({ clockS: 0, active: [] });
  });
});

describe('警報燈的相位', () => {
  test('亮暗各半個週期，從亮開始', () => {
    const period = ALARM_RULES.flashPeriodS;
    expect(alarmPulseOn(0)).toBe(true);
    expect(alarmPulseOn(period * 0.25)).toBe(true);
    expect(alarmPulseOn(period * 0.75)).toBe(false);
    expect(alarmPulseOn(period * 1.25)).toBe(true);
    expect(alarmPulseOn(period * 1.75)).toBe(false);
  });

  test('每秒由暗變亮不超過 3 次（WCAG 2.3.1）', () => {
    expect(ALARM_RULES.flashPeriodS).toBeGreaterThanOrEqual(1 / 3);
    const flashes = maxFlashesPerSecond((timeS) => alarmLampOn(timeS, 'flash'), ALARM_RULES.durationS);
    expect(flashes).toBeGreaterThanOrEqual(1);
    expect(flashes).toBeLessThanOrEqual(3);
  });

  test('減少動態效果（steady）與定格（frozen）：恆亮到警報結束', () => {
    for (const motion of ['steady', 'frozen'] as const) {
      expect(maxFlashesPerSecond((timeS) => alarmLampOn(timeS, motion), ALARM_RULES.durationS)).toBe(1);
      for (let ms = 0; ms < ALARM_RULES.durationS * 1000; ms += 7) {
        expect(alarmLampOn(ms / 1000, motion)).toBe(true);
      }
    }
  });

  test('快照的 lit 跟著相位', () => {
    const ringing = stepAlarms(NO_ALARMS, 0, [0], KINDS);
    const dark = wait(ringing, ALARM_RULES.flashPeriodS * 0.75);
    expect(alarmSnapshots(dark, 'flash')[0]?.lit).toBe(false);
    expect(alarmSnapshots(dark, 'steady')[0]?.lit).toBe(true);
    expect(alarmSnapshots(dark, 'flash')[0]?.remainingS).toBeCloseTo(
      ALARM_RULES.durationS - ALARM_RULES.flashPeriodS * 0.75,
      1,
    );
  });
});

test('警報的常數：6 秒、最多 3 個聲音、短鳴 2.5 秒', () => {
  expect(ALARM_RULES.durationS).toBe(6);
  expect(ALARM_RULES.maxVoices).toBe(3);
  expect(ALARM_RULES.sirenYelpS).toBe(2.5);
  expect(ALARM_RULES.endFadeS).toBe(0.8);
  expect(ALARM_RULES.restartFadeS).toBe(0.03);
});

describe('燈怎麼動', () => {
  test('?fx=off 優先（定格、可重現）；其次是系統的減少動態效果（恆亮）；否則照常閃', () => {
    expect(lampMotionFor(false, false)).toBe('flash');
    expect(lampMotionFor(false, true)).toBe('steady');
    expect(lampMotionFor(true, false)).toBe('frozen');
    expect(lampMotionFor(true, true)).toBe('frozen');
  });
});
