// 評分與失敗條件：1／2／3 星的每個邊界、兩種失敗的「嚴格大於」。
import { describe, expect, test } from 'vitest';
import { COLLISION_RULES, PHYSICS_HZ, SCORING_RULES } from '../src/core/gameConfig';
import { degToRad } from '../src/core/units';
import {
  UNLIMITED_RULES,
  failReason,
  rulesFromLevel,
  secondsToSteps,
  starsFor,
  stepsToSeconds,
  type ScoreInput,
  type SessionRules,
} from '../src/level/scoring';

/** 目標時間 20 秒 = 1200 步。 */
const TARGET_STEPS = 1200;

/** 拿得到 3 星的成績；各測試只改要看的那一項。 */
const PERFECT: ScoreInput = {
  timeSteps: 900,
  targetSteps: TARGET_STEPS,
  collisions: 0,
  angleErrorRad: degToRad(1),
};

describe('規則常數', () => {
  test('3 星角度 3°、冷卻 0.5 秒、反彈係數在 0 與 1 之間', () => {
    expect(SCORING_RULES.threeStarMaxAngleDeg).toBe(3);
    expect(COLLISION_RULES.cooldownSeconds).toBe(0.5);
    expect(COLLISION_RULES.restitution).toBeGreaterThan(0);
    expect(COLLISION_RULES.restitution).toBeLessThan(1);
    expect(COLLISION_RULES.maxBounceSpeedMph).toBeGreaterThan(0);
  });
});

describe('秒 ↔ 步', () => {
  test('60 Hz：1 秒 = 60 步，四捨五入到整數步', () => {
    expect(PHYSICS_HZ).toBe(60);
    expect(secondsToSteps(1)).toBe(60);
    expect(secondsToSteps(22)).toBe(1320);
    expect(secondsToSteps(0.5)).toBe(30);
    expect(secondsToSteps(0.01)).toBe(1);
    expect(stepsToSeconds(90)).toBe(1.5);
  });

  test('rulesFromLevel：秒換成步、碰撞上限照抄', () => {
    expect(rulesFromLevel(75, 22, 4)).toEqual({
      timeLimitSteps: 4500,
      targetSteps: 1320,
      maxCollisions: 4,
    });
  });
});

describe('starsFor', () => {
  test('目標時間內、0 碰撞、角度 < 3° → 3 星', () => {
    expect(starsFor(PERFECT)).toBe(3);
    expect(starsFor({ ...PERFECT, angleErrorRad: 0 })).toBe(3);
  });

  test('時間：剛好等於目標時間仍算目標時間內；多一步就只有 1 星', () => {
    expect(starsFor({ ...PERFECT, timeSteps: TARGET_STEPS })).toBe(3);
    expect(starsFor({ ...PERFECT, timeSteps: TARGET_STEPS + 1 })).toBe(1);
    expect(starsFor({ ...PERFECT, timeSteps: TARGET_STEPS - 1 })).toBe(3);
  });

  test('碰撞：1 次就沒有 3 星，但目標時間內還有 2 星', () => {
    expect(starsFor({ ...PERFECT, collisions: 1 })).toBe(2);
    expect(starsFor({ ...PERFECT, collisions: 5 })).toBe(2);
  });

  test('角度：剛好 3° 不算（嚴格小於），差一點點就算', () => {
    expect(starsFor({ ...PERFECT, angleErrorRad: degToRad(3) })).toBe(2);
    expect(starsFor({ ...PERFECT, angleErrorRad: degToRad(2.999) })).toBe(3);
    expect(starsFor({ ...PERFECT, angleErrorRad: degToRad(7.9) })).toBe(2);
    // 傳負的夾角也看絕對值。
    expect(starsFor({ ...PERFECT, angleErrorRad: -degToRad(5) })).toBe(2);
    expect(starsFor({ ...PERFECT, angleErrorRad: -degToRad(1) })).toBe(3);
  });

  test('超過目標時間：再乾淨、再正也只有 1 星', () => {
    const slow = { ...PERFECT, timeSteps: TARGET_STEPS + 600 };
    expect(starsFor(slow)).toBe(1);
    expect(starsFor({ ...slow, collisions: 3, angleErrorRad: degToRad(7) })).toBe(1);
  });

  test('沒有規則（不限時）：一律在目標時間內', () => {
    expect(starsFor({ ...PERFECT, timeSteps: 1e9, targetSteps: UNLIMITED_RULES.targetSteps })).toBe(3);
  });
});

describe('failReason', () => {
  const rules: SessionRules = { timeLimitSteps: 3600, targetSteps: 1200, maxCollisions: 2 };

  test('都在限度內 → null', () => {
    expect(failReason({ elapsedSteps: 0, collisions: 0, rules })).toBeNull();
    expect(failReason({ elapsedSteps: 1800, collisions: 1, rules })).toBeNull();
  });

  test('時間：剛好用完還沒失敗，多一步才失敗', () => {
    expect(failReason({ elapsedSteps: 3600, collisions: 0, rules })).toBeNull();
    expect(failReason({ elapsedSteps: 3601, collisions: 0, rules })).toBe('timeout');
  });

  test('碰撞：剛好等於上限還沒失敗，嚴格大於才失敗', () => {
    expect(failReason({ elapsedSteps: 10, collisions: 2, rules })).toBeNull();
    expect(failReason({ elapsedSteps: 10, collisions: 3, rules })).toBe('collisions');
  });

  test('上限 0：碰一次就失敗；0 次不失敗', () => {
    const strict: SessionRules = { ...rules, maxCollisions: 0 };
    expect(failReason({ elapsedSteps: 10, collisions: 0, rules: strict })).toBeNull();
    expect(failReason({ elapsedSteps: 10, collisions: 1, rules: strict })).toBe('collisions');
  });

  test('同一步兩個條件都成立 → 回報碰撞', () => {
    expect(failReason({ elapsedSteps: 3601, collisions: 3, rules })).toBe('collisions');
  });

  test('沒有規則：永遠不失敗', () => {
    expect(failReason({ elapsedSteps: 1e9, collisions: 1e6, rules: UNLIMITED_RULES })).toBeNull();
  });
});
