// 一局遊戲：起始配置、開進車位後停妥、停妥後不再接受輸入、重來。
import { describe, expect, test } from 'vitest';
import { forward, headingDelta, right } from '../src/core/heading';
import { ftToM, mToFt, mphToMps } from '../src/core/units';
import { REQUIRED_HOLD_STEPS } from '../src/level/parkingJudge';
import { PROTOTYPE_LAYOUT, PROTOTYPE_LAYOUT_FT } from '../src/level/prototypeLayout';
import {
  restartSession,
  sessionSnapshot,
  startSession,
  stepSession,
  type Session,
  type SessionLayout,
} from '../src/level/session';
import type { DriveInput } from '../src/vehicle/bicycleModel';
import { IDLE, inputsToStopAtSpotCenter } from './driveHelpers';

const FULL_THROTTLE: DriveInput = { ...IDLE, throttle: 1 };
const FULL_REVERSE: DriveInput = { ...IDLE, throttle: -1 };
const STEER_RIGHT: DriveInput = { ...IDLE, steer: 1 };

/** 依序餵一串輸入。 */
function run(session: Session, inputs: readonly DriveInput[]): Session {
  let current = session;
  for (const input of inputs) {
    current = stepSession(current, input);
  }
  return current;
}

/** 同一個輸入連跑 steps 步。 */
function repeat(session: Session, input: DriveInput, steps: number): Session {
  return run(
    session,
    Array.from({ length: steps }, () => input),
  );
}

/** 從原型場景的起點直線開進車位並停下（還沒等滿 1 秒）。 */
function driveIntoPrototypeSpot(): Session {
  const inputs = inputsToStopAtSpotCenter(PROTOTYPE_LAYOUT.startState, PROTOTYPE_LAYOUT.spot, 1);
  return run(startSession(PROTOTYPE_LAYOUT), inputs);
}

/** 車一開始就靜止停在車位正中央的配置。 */
const CENTERED_LAYOUT: SessionLayout = {
  spot: PROTOTYPE_LAYOUT.spot,
  startState: {
    ...PROTOTYPE_LAYOUT.startState,
    x: PROTOTYPE_LAYOUT.spot.x,
    z: PROTOTYPE_LAYOUT.spot.z,
  },
};

describe('原型場景的配置', () => {
  const { spot, startState } = PROTOTYPE_LAYOUT;

  test('車位 9×18 ft', () => {
    expect(PROTOTYPE_LAYOUT_FT.spot.widthFt).toBe(9);
    expect(PROTOTYPE_LAYOUT_FT.spot.lengthFt).toBe(18);
    expect(spot.widthM).toBe(ftToM(9));
    expect(spot.lengthM).toBe(ftToM(18));
  });

  test('車在車位正後方 60 ft、與車位同向、靜止、方向盤回正', () => {
    const dx = startState.x - spot.x;
    const dz = startState.z - spot.z;
    const spotRight = right(spot.headingRad);
    const spotForward = forward(spot.headingRad);
    expect(mToFt(dx * spotRight.x + dz * spotRight.z)).toBeCloseTo(0, 9);
    expect(mToFt(dx * spotForward.x + dz * spotForward.z)).toBeCloseTo(-60, 9);
    expect(headingDelta(startState.headingRad, spot.headingRad)).toBe(0);
    expect(startState.speedMps).toBe(0);
    expect(startState.steerRad).toBe(0);
  });
});

describe('開新的一局', () => {
  test('車在起始狀態、判定進度 0、未停妥', () => {
    const session = startSession(PROTOTYPE_LAYOUT);
    expect(session.vehicle).toEqual(PROTOTYPE_LAYOUT.startState);
    expect(session.heldSteps).toBe(0);
    expect(session.parked).toBe(false);
  });

  test('在起點不動不會停妥（車不在車位裡）', () => {
    const session = repeat(startSession(PROTOTYPE_LAYOUT), IDLE, 10 * REQUIRED_HOLD_STEPS);
    expect(session.heldSteps).toBe(0);
    expect(session.parked).toBe(false);
  });
});

describe('停妥', () => {
  test('車靜止在車位中央：第 59 步未停妥，第 60 步停妥', () => {
    let session = repeat(startSession(CENTERED_LAYOUT), IDLE, 59);
    expect(session.heldSteps).toBe(59);
    expect(session.parked).toBe(false);

    session = stepSession(session, IDLE);
    expect(session.heldSteps).toBe(60);
    expect(session.parked).toBe(true);
  });

  test('從起點直線開進車位、停下、等滿 1 秒 → 已停妥', () => {
    const stopped = driveIntoPrototypeSpot();
    expect(stopped.vehicle.speedMps).toBe(0);
    expect(stopped.parked).toBe(false);
    // 停下的位置在車位中心附近（前後餘裕是 1.5 ft）。
    const offsetFt = mToFt(Math.abs(stopped.vehicle.z - PROTOTYPE_LAYOUT.spot.z));
    expect(offsetFt).toBeLessThan(0.5);
    expect(stopped.vehicle.x).toBe(PROTOTYPE_LAYOUT.spot.x);

    const parked = repeat(stopped, IDLE, REQUIRED_HOLD_STEPS);
    expect(parked.parked).toBe(true);
    expect(parked.heldSteps).toBe(REQUIRED_HOLD_STEPS);
  });

  test('高速穿過車位不會停妥', () => {
    const session = repeat(startSession(PROTOTYPE_LAYOUT), FULL_THROTTLE, 10 * REQUIRED_HOLD_STEPS);
    expect(session.vehicle.z).toBeLessThan(PROTOTYPE_LAYOUT.spot.z - PROTOTYPE_LAYOUT.spot.lengthM);
    expect(session.heldSteps).toBe(0);
    expect(session.parked).toBe(false);
  });

  test('在車位裡等到一半開走 → 進度歸零', () => {
    let session = repeat(startSession(CENTERED_LAYOUT), IDLE, 30);
    expect(session.heldSteps).toBe(30);
    // 全油門 0.1 mph/步：幾步內車速就超過 0.5 mph，進度歸零；之後開出車位更不可能成立。
    session = repeat(session, FULL_THROTTLE, REQUIRED_HOLD_STEPS);
    expect(session.heldSteps).toBe(0);
    expect(session.parked).toBe(false);
  });
});

describe('停妥之後', () => {
  test('不再接受駕駛輸入：油門、倒車、方向盤都不會讓車動', () => {
    const parked = repeat(driveIntoPrototypeSpot(), IDLE, REQUIRED_HOLD_STEPS);
    expect(parked.parked).toBe(true);

    for (const input of [FULL_THROTTLE, FULL_REVERSE, STEER_RIGHT]) {
      const after = repeat(parked, input, 3 * REQUIRED_HOLD_STEPS);
      expect(after.vehicle).toEqual(parked.vehicle);
      expect(after.parked).toBe(true);
    }
  });

  test('成立的那一步車還在蠕行（低於 0.5 mph）→ 車速歸零，不會滑出車位', () => {
    // 每 3 步點一下油門：車速在 0、0.1、0.05 mph 之間循環，始終低於門檻；第 60 步剛好是踩油門的那一步。
    const inputs = Array.from({ length: REQUIRED_HOLD_STEPS }, (_, step) =>
      step % 3 === 2 ? FULL_THROTTLE : IDLE,
    );
    const beforeLast = run(startSession(CENTERED_LAYOUT), inputs.slice(0, -1));
    expect(beforeLast.parked).toBe(false);
    expect(beforeLast.vehicle.speedMps).toBe(0);

    const parked = stepSession(beforeLast, FULL_THROTTLE);
    expect(parked.parked).toBe(true);
    expect(parked.vehicle.speedMps).toBe(0);
    // 這一步本來有在動（位置變了），只是停妥時車速被歸零。
    expect(parked.vehicle.z).toBeLessThan(beforeLast.vehicle.z);

    const later = repeat(parked, IDLE, REQUIRED_HOLD_STEPS);
    expect(later.vehicle).toEqual(parked.vehicle);
  });
});

describe('重來', () => {
  test('停妥後重來：車回起始姿態、進度歸零、未停妥', () => {
    const parked = repeat(driveIntoPrototypeSpot(), IDLE, REQUIRED_HOLD_STEPS);
    expect(parked.parked).toBe(true);

    const restarted = restartSession(parked);
    expect(restarted.vehicle).toEqual(PROTOTYPE_LAYOUT.startState);
    expect(restarted.heldSteps).toBe(0);
    expect(restarted.parked).toBe(false);
    expect(restarted).toEqual(startSession(PROTOTYPE_LAYOUT));
  });

  test('重來後又能開，而且可以再停一次', () => {
    const parked = repeat(driveIntoPrototypeSpot(), IDLE, REQUIRED_HOLD_STEPS);
    const restarted = restartSession(parked);

    const moving = repeat(restarted, FULL_THROTTLE, 30);
    expect(moving.vehicle.speedMps).toBeCloseTo(mphToMps(3), 9);
    expect(moving.vehicle.z).toBeLessThan(PROTOTYPE_LAYOUT.startState.z);

    const inputs = inputsToStopAtSpotCenter(PROTOTYPE_LAYOUT.startState, PROTOTYPE_LAYOUT.spot, 1);
    const parkedAgain = repeat(run(restarted, inputs), IDLE, REQUIRED_HOLD_STEPS);
    expect(parkedAgain.parked).toBe(true);
    expect(parkedAgain.vehicle).toEqual(parked.vehicle);
  });

  test('判定進行到一半重來：進度歸零', () => {
    const halfway = repeat(startSession(CENTERED_LAYOUT), IDLE, 30);
    expect(halfway.heldSteps).toBe(30);

    const restarted = restartSession(halfway);
    expect(restarted.heldSteps).toBe(0);
    expect(restarted.parked).toBe(false);
    expect(restarted.vehicle).toEqual(CENTERED_LAYOUT.startState);
  });

  test('開到別處再重來：位置、車頭、車速、方向盤全部回到起始值', () => {
    const wandered = repeat(startSession(PROTOTYPE_LAYOUT), { ...FULL_THROTTLE, steer: 1 }, 90);
    expect(wandered.vehicle).not.toEqual(PROTOTYPE_LAYOUT.startState);
    expect(restartSession(wandered).vehicle).toEqual(PROTOTYPE_LAYOUT.startState);
  });
});

describe('sessionSnapshot（e2e 用的唯讀狀態）', () => {
  test('起點：位置 ft、heading 度、車速 mph、未停妥', () => {
    expect(sessionSnapshot(startSession(PROTOTYPE_LAYOUT))).toEqual({
      xFt: PROTOTYPE_LAYOUT_FT.start.xFt,
      zFt: PROTOTYPE_LAYOUT_FT.start.zFt,
      headingDeg: PROTOTYPE_LAYOUT_FT.start.headingDeg,
      speedMph: 0,
      parked: false,
    });
  });

  test('全油門 1 秒：車速 6 mph、往 −Z 走了約 4.4 ft', () => {
    const snapshot = sessionSnapshot(repeat(startSession(PROTOTYPE_LAYOUT), FULL_THROTTLE, 60));
    expect(snapshot.speedMph).toBeCloseTo(6, 9);
    // 半隱式積分：位移 = Σ v_k·dt（k = 1..60）= 6 mph/s × dt² × 60·61/2，比連續時間的 4.4 ft 多半步。
    expect(snapshot.zFt).toBeCloseTo(-(6 * 5280) / 3600 / 3600 * ((60 * 61) / 2), 9);
    expect(snapshot.xFt).toBeCloseTo(0, 9);
    expect(snapshot.headingDeg).toBe(0);
    expect(snapshot.parked).toBe(false);
  });

  test('倒車時車速為負；右轉後 heading 以度表示', () => {
    const reversing = sessionSnapshot(repeat(startSession(PROTOTYPE_LAYOUT), FULL_REVERSE, 30));
    expect(reversing.speedMph).toBeCloseTo(-3, 9);

    const turning = repeat(startSession(PROTOTYPE_LAYOUT), { ...FULL_THROTTLE, steer: 1 }, 90);
    const snapshot = sessionSnapshot(turning);
    expect(snapshot.headingDeg).toBeGreaterThan(0);
    expect(snapshot.headingDeg).toBeLessThan(180);
    expect(snapshot.headingDeg).toBeCloseTo((turning.vehicle.headingRad * 180) / Math.PI, 9);
  });

  test('停妥後 parked = true、車速 0、位置在車位中心附近', () => {
    const parked = repeat(driveIntoPrototypeSpot(), IDLE, REQUIRED_HOLD_STEPS);
    const snapshot = sessionSnapshot(parked);
    expect(snapshot.parked).toBe(true);
    expect(snapshot.speedMph).toBe(0);
    expect(Math.abs(snapshot.zFt - PROTOTYPE_LAYOUT_FT.spot.centerZFt)).toBeLessThan(1.5);
  });

  test('改快照不會影響遊戲狀態', () => {
    const session = startSession(PROTOTYPE_LAYOUT);
    const snapshot: { xFt: number } = sessionSnapshot(session);
    snapshot.xFt = 999;
    expect(sessionSnapshot(session).xFt).toBe(PROTOTYPE_LAYOUT_FT.start.xFt);
    expect(session.vehicle).toEqual(PROTOTYPE_LAYOUT.startState);
  });
});
