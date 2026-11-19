// 這一步計入的碰撞（警報與音效用）：索引、撞擊車速；冷卻中再撞沒有事件；一步撞兩個出兩筆。
import { describe, expect, test } from 'vitest';
import { mphToMps } from '../src/core/units';
import { obbFromFt, type Obb } from '../src/level/collision';
import { countedHits, type CountedHit } from '../src/level/hitEvents';
import { levelById } from '../src/level/levelCatalog';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import {
  COLLISION_COOLDOWN_STEPS,
  restartSession,
  startSession,
  stepSession,
  type Session,
  type SessionLayout,
} from '../src/level/session';
import type { DriveInput } from '../src/vehicle/bicycleModel';
import { IDLE } from './driveHelpers';

const FULL_THROTTLE: DriveInput = { ...IDLE, throttle: 1 };
const FULL_REVERSE: DriveInput = { ...IDLE, throttle: -1 };

/** 車身 15 ft 長：車頭朝北時前緣在中心前方 7.5 ft。 */
const HALF_CAR_FT = 7.5;

/** 英尺寫的碰撞盒（heading 0：寬沿 X、長沿 Z）；原型場景的起點在原點、車頭朝北（−Z）。 */
function blockFt(xFt: number, zFt: number, widthFt: number, lengthFt: number): Obb {
  return obbFromFt({ centerXFt: xFt, centerZFt: zFt, widthFt, lengthFt, headingDeg: 0 });
}

function layoutWith(obstacles: readonly Obb[], speedMph = 0): SessionLayout {
  return {
    spot: PROTOTYPE_LAYOUT.spot,
    startState: { ...PROTOTYPE_LAYOUT.startState, speedMps: mphToMps(speedMph) },
    obstacles,
  };
}

/** 同一個輸入一步一步跑，收集每一步計入的碰撞（連同發生在第幾步）。 */
function drive(
  session: Session,
  input: DriveInput,
  steps: number,
): { session: Session; events: (CountedHit & { step: number })[] } {
  let current = session;
  const events: (CountedHit & { step: number })[] = [];
  for (let step = 0; step < steps; step += 1) {
    const next = stepSession(current, input);
    events.push(...countedHits(current, next).map((hit) => ({ ...hit, step: next.stepCount })));
    current = next;
  }
  return { session: current, events };
}

describe('countedHits：這一步計入的碰撞', () => {
  test('沒撞到的每一步都沒有事件', () => {
    const { session, events } = drive(startSession(layoutWith([])), FULL_THROTTLE, 120);
    expect(session.collisions).toBe(0);
    expect(events).toEqual([]);
  });

  test('撞到的那一步出一筆：索引是 layout.obstacles 的索引，車速是撞之前那一步的車速', () => {
    // 第 0 個在很遠的地方，前方的牆是第 1 個。
    const layout = layoutWith(
      [blockFt(200, 200, 2, 2), blockFt(0, -(HALF_CAR_FT + 0.05) - 1, 20, 2)],
      5,
    );
    const before = startSession(layout);
    const after = stepSession(before, IDLE);
    expect(after.collisions).toBe(1);
    const hits = countedHits(before, after);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.index).toBe(1);
    expect(hits[0]?.impactSpeedMps).toBeCloseTo(mphToMps(5), 9);
  });

  test('倒車撞到：車速仍是絕對值', () => {
    const layout = layoutWith([blockFt(0, HALF_CAR_FT + 0.05 + 1, 20, 2)], -4);
    const before = startSession(layout);
    const hits = countedHits(before, stepSession(before, IDLE));
    expect(hits).toHaveLength(1);
    expect(hits[0]?.impactSpeedMps).toBeCloseTo(mphToMps(4), 9);
  });

  test('一直頂著同一面牆：冷卻中沒有事件，每 30 步才再出一筆，筆數等於碰撞次數', () => {
    const layout = layoutWith([blockFt(0, -(HALF_CAR_FT + 0.2) - 1, 20, 2)]);
    const { session, events } = drive(startSession(layout), FULL_THROTTLE, 200);
    expect(session.collisions).toBeGreaterThanOrEqual(3);
    expect(events).toHaveLength(session.collisions);
    for (let index = 1; index < events.length; index += 1) {
      const gap = (events[index]?.step ?? 0) - (events[index - 1]?.step ?? 0);
      expect(gap).toBeGreaterThanOrEqual(COLLISION_COOLDOWN_STEPS);
    }
    expect(events.every((event) => event.index === 0)).toBe(true);
  });

  test('同一步壓到兩個物件：兩筆，車速相同', () => {
    const layout = layoutWith([
      blockFt(-2, -(HALF_CAR_FT + 1) - 0.5, 1, 1),
      blockFt(2, -(HALF_CAR_FT + 1) - 0.5, 1, 1),
    ]);
    const { session, events } = drive(startSession(layout), FULL_THROTTLE, 120);
    const first = events.filter((event) => event.step === events[0]?.step);
    expect(first.map((event) => event.index)).toEqual([0, 1]);
    expect(first[0]?.impactSpeedMps).toBe(first[1]?.impactSpeedMps);
    expect(first[0]?.impactSpeedMps).toBeGreaterThan(0);
    expect(events).toHaveLength(session.collisions);
  });

  test('不同物件各出各的：前面的牆在冷卻中，倒車撞到後面的牆仍有事件', () => {
    const layout = layoutWith([
      blockFt(0, -(HALF_CAR_FT + 0.2) - 1, 20, 2),
      blockFt(0, HALF_CAR_FT + 0.2 + 1, 20, 2),
    ]);
    const front = drive(startSession(layout), FULL_THROTTLE, 40);
    expect(front.events.map((event) => event.index)).toEqual([0]);
    const rear = drive(front.session, FULL_REVERSE, 25);
    expect(rear.events.map((event) => event.index)).toEqual([1]);
    expect((rear.events[0]?.step ?? 0) - (front.events[0]?.step ?? 0)).toBeLessThan(
      COLLISION_COOLDOWN_STEPS + 40,
    );
  });

  test('這一局結束之後（失敗）不再有事件', () => {
    const layout: SessionLayout = {
      ...layoutWith([blockFt(0, -(HALF_CAR_FT + 0.2) - 1, 20, 2)]),
      rules: { timeLimitSteps: 100000, targetSteps: 1000, maxCollisions: 1 },
    };
    const { session, events } = drive(startSession(layout), FULL_THROTTLE, 400);
    expect(session.status).toBe('failed');
    expect(events).toHaveLength(2);
    expect(countedHits(session, stepSession(session, FULL_THROTTLE))).toEqual([]);
  });

  test('同一個 Session 比自己、重來後的新局：沒有事件', () => {
    const layout = layoutWith([blockFt(0, -(HALF_CAR_FT + 0.05) - 1, 20, 2)], 5);
    const hit = stepSession(startSession(layout), IDLE);
    expect(countedHits(hit, hit)).toEqual([]);
    const fresh = restartSession(hit);
    expect(countedHits(fresh, fresh)).toEqual([]);
  });

  test('真實關卡：索引小於 obstaclesFt.length 的是關卡障礙物，其餘四個是邊界牆', () => {
    const level = levelById('w1_l09');
    if (level === undefined) {
      throw new Error('找不到 w1_l09');
    }
    const total = level.layout.obstacles?.length ?? 0;
    expect(total).toBe(level.obstaclesFt.length + 4);
    // 這一關第 0 個障礙物在起點正前方（併排的車）：直直往前開，第一筆事件就是它。
    const { events } = drive(startSession(level.layout), FULL_THROTTLE, 600);
    expect(events[0]?.index).toBe(0);
    expect(events[0]?.index).toBeLessThan(level.obstaclesFt.length);
  });
});
