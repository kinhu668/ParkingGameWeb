// 可解性：每一關用腳本駕駛跑參考路線（真正的 stepSession），必須停妥、0 碰撞、
// 角度誤差 < 3°、時間 ≤ 目標時間 × 0.85 —— 也就是 3 星拿得到，而且時間還有餘裕。
// 另外用 20 Hz 決策（模擬低幀率）再跑一次，仍然要停妥。
import { describe, expect, test } from 'vitest';
import { PHYSICS_HZ, SCORING_RULES } from '../src/core/gameConfig';
import { mToFt, radToDeg } from '../src/core/units';
import { runRoute } from '../src/level/autoDriver';
import { worldLevels } from '../src/level/levelCatalog';
import { ROUTE_LEVEL_IDS, routeForLevel } from '../src/level/levelRoutes';
import type { LevelDefinition } from '../src/level/levelSchema';
import { stepsToSeconds } from '../src/level/scoring';
import type { Session } from '../src/level/session';

/** 參考路線的時間必須不超過目標時間的這個比例。 */
const TIME_MARGIN_RATIO = 0.85;

/** 低幀率：每 3 個物理步決策一次 = 20 Hz。 */
const LOW_RATE_DECISION_STEPS = 3;

const WORLD_1 = worldLevels(1);

const CASES: readonly (readonly [string, LevelDefinition])[] = WORLD_1.map(
  (level) => [level.id, level] as const,
);

function drive(level: LevelDefinition, decisionEverySteps: number): Session {
  const route = routeForLevel(level.id);
  if (route === undefined) {
    throw new Error(`${level.id} 沒有參考路線`);
  }
  // 跑到時間上限為止；停妥或失敗會提早結束。
  return runRoute(level.layout, route, {
    maxSteps: Math.round(level.timeLimitS * PHYSICS_HZ) + PHYSICS_HZ,
    decisionEverySteps,
  });
}

/** 失敗時印在斷言訊息裡：車最後在哪、離車位中心多遠。 */
function describeEnd(level: LevelDefinition, session: Session): string {
  const { vehicle } = session;
  return [
    `status=${session.status}`,
    `pos=(${mToFt(vehicle.x).toFixed(2)}, ${mToFt(vehicle.z).toFixed(2)}) ft`,
    `heading=${radToDeg(vehicle.headingRad).toFixed(2)}°`,
    `spot=(${level.spotFt.centerXFt}, ${level.spotFt.centerZFt}) heading ${level.spotFt.headingDeg}°`,
    `collisions=${session.collisions}`,
    `elapsed=${stepsToSeconds(session.elapsedSteps).toFixed(2)}s`,
  ].join(' ');
}

describe('第 1 世界的參考路線', () => {
  test('10 關都有參考路線，而且沒有多出不屬於任何關卡的路線', () => {
    expect(WORLD_1).toHaveLength(10);
    expect(ROUTE_LEVEL_IDS).toEqual(WORLD_1.map((level) => level.id));
  });
});

describe.each(CASES)('%s 的可解性', (_id, level) => {
  const session = drive(level, 1);

  test('參考路線停妥、0 碰撞', () => {
    expect(session.status, describeEnd(level, session)).toBe('parked');
    expect(session.collisions, describeEnd(level, session)).toBe(0);
  });

  test('角度誤差 < 3°、時間 ≤ 目標時間 × 0.85 → 3 星', () => {
    const result = session.result;
    expect(result, describeEnd(level, session)).not.toBeNull();
    if (result === null) {
      return;
    }
    expect(radToDeg(result.angleErrorRad)).toBeLessThan(SCORING_RULES.threeStarMaxAngleDeg);
    expect(stepsToSeconds(result.timeSteps)).toBeLessThanOrEqual(level.targetTimeS * TIME_MARGIN_RATIO);
    expect(result.collisions).toBe(0);
    expect(result.stars).toBe(3);
  });

  test('20 Hz 決策（低幀率）仍然停妥', () => {
    const lowRate = drive(level, LOW_RATE_DECISION_STEPS);
    expect(lowRate.status, describeEnd(level, lowRate)).toBe('parked');
  });
});
