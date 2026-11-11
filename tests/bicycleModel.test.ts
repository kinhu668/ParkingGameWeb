import { describe, expect, test } from 'vitest';
import { FIXED_STEP_SECONDS, PHYSICS_HZ } from '../src/core/gameConfig';
import { forward, headingDelta, right, type GroundVector } from '../src/core/heading';
import { degToRad, ftToM, mToFt, mphToMps, mpsToMph, radToDeg } from '../src/core/units';
import {
  interpolateVehiclePose,
  stepVehicle,
  vehicleCorners,
  type DriveInput,
  type VehicleState,
} from '../src/vehicle/bicycleModel';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';

const DT = FIXED_STEP_SECONDS;
const DIGITS = 9;
const FULL_TURN_RAD = 2 * Math.PI;

const AT_REST: VehicleState = { x: 0, z: 0, headingRad: 0, speedMps: 0, steerRad: 0 };
const IDLE: DriveInput = { throttle: 0, steer: 0, handbrake: false };
const FULL_THROTTLE: DriveInput = { ...IDLE, throttle: 1 };
const FULL_REVERSE: DriveInput = { ...IDLE, throttle: -1 };
const HANDBRAKE: DriveInput = { ...IDLE, handbrake: true };
const STEER_RIGHT: DriveInput = { ...IDLE, steer: 1 };
const STEER_LEFT: DriveInput = { ...IDLE, steer: -1 };

/** 最高速前進中的車（heading 0、在原點）。 */
const AT_TOP_SPEED: VehicleState = { ...AT_REST, speedMps: VEHICLE_CONFIG_SI.maxSpeedMps };

/** 秒 → 物理步數。 */
function stepsIn(seconds: number): number {
  return Math.round(seconds * PHYSICS_HZ);
}

/** 用同一個輸入連跑 steps 步，回傳每一步之後的狀態。 */
function trace(start: VehicleState, input: DriveInput, steps: number): VehicleState[] {
  const states: VehicleState[] = [];
  let state = start;
  for (let i = 0; i < steps; i += 1) {
    state = stepVehicle(state, input, DT);
    states.push(state);
  }
  return states;
}

/** 用同一個輸入連跑 steps 步，回傳最後的狀態。 */
function run(start: VehicleState, input: DriveInput, steps: number): VehicleState {
  return trace(start, input, steps).at(-1) ?? start;
}

/** 後軸中心：車身中心往後半個軸距（測試裡獨立算一份，不靠 bicycleModel）。 */
function rearAxle(state: VehicleState): GroundVector {
  const f = forward(state.headingRad);
  const halfWheelbaseM = VEHICLE_CONFIG_SI.wheelbaseM / 2;
  return { x: state.x - f.x * halfWheelbaseM, z: state.z - f.z * halfWheelbaseM };
}

function distance(a: GroundVector, b: GroundVector): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function speedMph(state: VehicleState): number {
  return mpsToMph(state.speedMps);
}

function steerDeg(state: VehicleState): number {
  return radToDeg(state.steerRad);
}

/** 速度歷程裡不准有「上一步為正、下一步為負」或反過來的直接變號。 */
function expectNoDirectSignFlip(start: VehicleState, states: VehicleState[]): void {
  let previous = start.speedMps;
  for (const state of states) {
    expect(previous * state.speedMps).toBeGreaterThanOrEqual(0);
    previous = state.speedMps;
  }
}

describe('加速與極速', () => {
  test('全油門 1 秒後 6 mph', () => {
    expect(speedMph(run(AT_REST, FULL_THROTTLE, stepsIn(1)))).toBeCloseTo(6, DIGITS);
  });

  test('全油門 3 秒後 18 mph', () => {
    expect(speedMph(run(AT_REST, FULL_THROTTLE, stepsIn(3)))).toBeCloseTo(18, DIGITS);
  });

  test('之後不超過 18 mph，並停在剛好極速', () => {
    const states = trace(AT_REST, FULL_THROTTLE, stepsIn(6));
    for (const state of states) {
      expect(state.speedMps).toBeLessThanOrEqual(VEHICLE_CONFIG_SI.maxSpeedMps);
    }
    for (const state of states.slice(stepsIn(3))) {
      expect(state.speedMps).toBe(VEHICLE_CONFIG_SI.maxSpeedMps);
    }
  });

  test('倒車 1 秒後 −6 mph，最高 −9 mph，之後不超過', () => {
    const states = trace(AT_REST, FULL_REVERSE, stepsIn(4));
    expect(speedMph(states[stepsIn(1) - 1] ?? AT_REST)).toBeCloseTo(-6, DIGITS);
    expect(speedMph(states[stepsIn(1.5) - 1] ?? AT_REST)).toBeCloseTo(-9, DIGITS);
    for (const state of states) {
      expect(state.speedMps).toBeGreaterThanOrEqual(-VEHICLE_CONFIG_SI.maxReverseSpeedMps);
    }
    for (const state of states.slice(stepsIn(1.5))) {
      expect(state.speedMps).toBe(-VEHICLE_CONFIG_SI.maxReverseSpeedMps);
    }
  });

  test('第一步就用更新後的車速移動（先算車速、再算位置）', () => {
    const state = stepVehicle(AT_REST, FULL_THROTTLE, DT);
    const expectedSpeed = VEHICLE_CONFIG_SI.accelerationMps2 * DT;
    expect(state.speedMps).toBeCloseTo(expectedSpeed, 15);
    expect(state.z).toBeCloseTo(-expectedSpeed * DT, 15);
  });
});

describe('滑行', () => {
  test('18 mph 放開油門：6 秒停下，停在剛好 0，不變號', () => {
    const states = trace(AT_TOP_SPEED, IDLE, stepsIn(8));
    const justBefore = states[stepsIn(5.9) - 1] ?? AT_REST;
    const atSixSeconds = states[stepsIn(6) - 1] ?? AT_TOP_SPEED;

    expect(speedMph(justBefore)).toBeCloseTo(0.3, DIGITS);
    expect(speedMph(atSixSeconds)).toBeCloseTo(0, DIGITS);
    for (const state of states) {
      expect(state.speedMps).toBeGreaterThanOrEqual(0);
    }
    // 第 6 秒那一步可能因浮點殘值還剩極小的正數，下一步起必須是剛好 0，而且一直是 0。
    for (const state of states.slice(stepsIn(6))) {
      expect(state.speedMps).toBe(0);
    }
  });

  test('倒車 −9 mph 放開油門：3 秒停下，停在剛好 0，不變號', () => {
    const start = { ...AT_REST, speedMps: -VEHICLE_CONFIG_SI.maxReverseSpeedMps };
    const states = trace(start, IDLE, stepsIn(4));
    expect(speedMph(states[stepsIn(3) - 1] ?? start)).toBeCloseTo(0, DIGITS);
    for (const state of states) {
      expect(state.speedMps).toBeLessThanOrEqual(0);
    }
    for (const state of states.slice(stepsIn(3))) {
      expect(state.speedMps).toBe(0);
    }
  });

  test('靜止且沒輸入：完全不動', () => {
    const start: VehicleState = { ...AT_REST, x: 3.25, z: -7.5, headingRad: degToRad(40) };
    expect(run(start, IDLE, stepsIn(1))).toEqual(start);
  });
});

describe('反向油門煞車', () => {
  test('18 mph 反向油門：1 秒到 0，繼續按才開始倒車', () => {
    const states = trace(AT_TOP_SPEED, FULL_REVERSE, stepsIn(2));
    const atOneSecond = states[stepsIn(1) - 1] ?? AT_TOP_SPEED;
    const atTwoSeconds = states[stepsIn(2) - 1] ?? AT_TOP_SPEED;

    // 前 1 秒是 18 mph/s 的煞車，一路不為負。
    expect(speedMph(states[stepsIn(0.5) - 1] ?? AT_REST)).toBeCloseTo(9, DIGITS);
    expect(speedMph(atOneSecond)).toBeCloseTo(0, DIGITS);
    for (const state of states.slice(0, stepsIn(1))) {
      expect(state.speedMps).toBeGreaterThanOrEqual(0);
    }

    // 一定有一步剛好是 0，而且沒有從正直接跳到負。
    expect(states.some((state) => state.speedMps === 0)).toBe(true);
    expectNoDirectSignFlip(AT_TOP_SPEED, states);

    // 再按 1 秒：以 6 mph/s 倒車（停在 0 的那一步最多佔掉兩步）。
    const speedPerStepMps = VEHICLE_CONFIG_SI.accelerationMps2 * DT;
    expect(atTwoSeconds.speedMps).toBeLessThan(0);
    expect(atTwoSeconds.speedMps).toBeGreaterThanOrEqual(-mphToMps(6) - 1e-9);
    expect(atTwoSeconds.speedMps).toBeLessThanOrEqual(-mphToMps(6) + 2 * speedPerStepMps + 1e-9);
  });

  test('前進中反向油門：這一步停在剛好 0，下一步才倒車', () => {
    const almostStopped = { ...AT_REST, speedMps: (VEHICLE_CONFIG_SI.brakeMps2 * DT) / 2 };
    const stopped = stepVehicle(almostStopped, FULL_REVERSE, DT);
    const reversing = stepVehicle(stopped, FULL_REVERSE, DT);

    expect(stopped.speedMps).toBe(0);
    expect(reversing.speedMps).toBeCloseTo(-VEHICLE_CONFIG_SI.accelerationMps2 * DT, 15);
  });

  test('倒車中前進油門：這一步停在剛好 0，下一步才前進', () => {
    const almostStopped = { ...AT_REST, speedMps: -(VEHICLE_CONFIG_SI.brakeMps2 * DT) / 2 };
    const stopped = stepVehicle(almostStopped, FULL_THROTTLE, DT);
    const advancing = stepVehicle(stopped, FULL_THROTTLE, DT);

    expect(stopped.speedMps).toBe(0);
    expect(advancing.speedMps).toBeCloseTo(VEHICLE_CONFIG_SI.accelerationMps2 * DT, 15);
  });

  test('倒車 −9 mph 按前進：0.5 秒煞到 0，再 1 秒約 +6 mph', () => {
    const start = { ...AT_REST, speedMps: -VEHICLE_CONFIG_SI.maxReverseSpeedMps };
    const states = trace(start, FULL_THROTTLE, stepsIn(1.5));
    expect(speedMph(states[stepsIn(0.5) - 1] ?? start)).toBeCloseTo(0, DIGITS);
    expectNoDirectSignFlip(start, states);
    const finalMph = speedMph(states.at(-1) ?? start);
    expect(finalMph).toBeGreaterThan(5.7);
    expect(finalMph).toBeLessThanOrEqual(6 + 1e-9);
  });
});

describe('手煞車', () => {
  test('18 mph 手煞車：0.6 秒停下，停在剛好 0', () => {
    const states = trace(AT_TOP_SPEED, HANDBRAKE, stepsIn(1));
    expect(speedMph(states[stepsIn(0.3) - 1] ?? AT_REST)).toBeCloseTo(9, DIGITS);
    expect(speedMph(states[stepsIn(0.6) - 1] ?? AT_TOP_SPEED)).toBeCloseTo(0, DIGITS);
    for (const state of states) {
      expect(state.speedMps).toBeGreaterThanOrEqual(0);
    }
    for (const state of states.slice(stepsIn(0.6))) {
      expect(state.speedMps).toBe(0);
    }
  });

  test('手煞車比滑行快', () => {
    const steps = stepsIn(0.5);
    const withHandbrake = run(AT_TOP_SPEED, HANDBRAKE, steps);
    const coasting = run(AT_TOP_SPEED, IDLE, steps);
    expect(withHandbrake.speedMps).toBeLessThan(coasting.speedMps);
    // 走的距離也比較短（heading 0，往 −Z 走）。
    expect(-withHandbrake.z).toBeLessThan(-coasting.z);
  });

  test('手煞車按住時油門無效：前進或倒車油門的結果都和沒踩油門一樣', () => {
    const steps = stepsIn(1);
    const noThrottle = trace(AT_TOP_SPEED, HANDBRAKE, steps);
    expect(trace(AT_TOP_SPEED, { ...HANDBRAKE, throttle: 1 }, steps)).toEqual(noThrottle);
    expect(trace(AT_TOP_SPEED, { ...HANDBRAKE, throttle: -1 }, steps)).toEqual(noThrottle);
  });

  test('靜止時按住手煞車再踩油門：車不動', () => {
    const forwardAttempt = run(AT_REST, { ...HANDBRAKE, throttle: 1 }, stepsIn(1));
    const reverseAttempt = run(AT_REST, { ...HANDBRAKE, throttle: -1 }, stepsIn(1));
    expect(forwardAttempt).toEqual(AT_REST);
    expect(reverseAttempt).toEqual(AT_REST);
  });

  test('倒車中手煞車：0.3 秒停下，不變號', () => {
    const start = { ...AT_REST, speedMps: -VEHICLE_CONFIG_SI.maxReverseSpeedMps };
    const states = trace(start, { ...HANDBRAKE, throttle: -1 }, stepsIn(0.5));
    expect(speedMph(states[stepsIn(0.3) - 1] ?? start)).toBeCloseTo(0, DIGITS);
    for (const state of states) {
      expect(state.speedMps).toBeLessThanOrEqual(0);
    }
    expect(states.at(-1)?.speedMps).toBe(0);
  });
});

describe('方向盤', () => {
  // 35° ÷ 90°/s = 23.33 步 → 第 24 步到底；35° ÷ 120°/s = 17.5 步 → 第 18 步回正。
  const stepsToLock = Math.ceil((35 / 90) * PHYSICS_HZ);
  const stepsToCenter = Math.ceil((35 / 120) * PHYSICS_HZ);
  const AT_RIGHT_LOCK: VehicleState = { ...AT_REST, steerRad: VEHICLE_CONFIG_SI.maxSteerRad };

  test('每步以 90°/s 打方向盤', () => {
    expect(steerDeg(stepVehicle(AT_REST, STEER_RIGHT, DT))).toBeCloseTo(90 / PHYSICS_HZ, DIGITS);
    expect(steerDeg(stepVehicle(AT_REST, STEER_LEFT, DT))).toBeCloseTo(-90 / PHYSICS_HZ, DIGITS);
  });

  test('向右 35/90 秒打到底，停在剛好 +35°', () => {
    expect(stepsToLock).toBe(24);
    const states = trace(AT_REST, STEER_RIGHT, stepsToLock);
    expect(steerDeg(states[stepsToLock - 2] ?? AT_REST)).toBeLessThan(35);
    expect(states[stepsToLock - 1]?.steerRad).toBe(VEHICLE_CONFIG_SI.maxSteerRad);
  });

  test('向左 35/90 秒打到底，停在剛好 −35°', () => {
    const states = trace(AT_REST, STEER_LEFT, stepsToLock);
    expect(steerDeg(states[stepsToLock - 2] ?? AT_REST)).toBeGreaterThan(-35);
    expect(states[stepsToLock - 1]?.steerRad).toBe(-VEHICLE_CONFIG_SI.maxSteerRad);
  });

  test('按住不放也不超過 ±35°', () => {
    for (const state of trace(AT_REST, STEER_RIGHT, stepsIn(2))) {
      expect(state.steerRad).toBeLessThanOrEqual(VEHICLE_CONFIG_SI.maxSteerRad);
    }
    for (const state of trace(AT_REST, STEER_LEFT, stepsIn(2))) {
      expect(state.steerRad).toBeGreaterThanOrEqual(-VEHICLE_CONFIG_SI.maxSteerRad);
    }
  });

  test('超出 ±1 的輸入被夾住，還是只到 ±35°', () => {
    expect(run(AT_REST, { ...IDLE, steer: 5 }, stepsIn(2)).steerRad).toBe(
      VEHICLE_CONFIG_SI.maxSteerRad,
    );
    expect(run(AT_REST, { ...IDLE, steer: -5 }, stepsIn(2)).steerRad).toBe(
      -VEHICLE_CONFIG_SI.maxSteerRad,
    );
  });

  test('放開後每步以 120°/s 回正', () => {
    const state = stepVehicle(AT_RIGHT_LOCK, IDLE, DT);
    expect(steerDeg(state)).toBeCloseTo(35 - 120 / PHYSICS_HZ, DIGITS);
  });

  test('從打到底放開：35/120 秒回正，停在剛好 0，不擺過頭', () => {
    expect(stepsToCenter).toBe(18);
    const fromRight = trace(AT_RIGHT_LOCK, IDLE, stepsToCenter + 5);
    expect(fromRight[stepsToCenter - 2]?.steerRad).toBeGreaterThan(0);
    for (const state of fromRight.slice(stepsToCenter - 1)) {
      expect(state.steerRad).toBe(0);
    }

    const atLeftLock = { ...AT_REST, steerRad: -VEHICLE_CONFIG_SI.maxSteerRad };
    const fromLeft = trace(atLeftLock, IDLE, stepsToCenter + 5);
    expect(fromLeft[stepsToCenter - 2]?.steerRad).toBeLessThan(0);
    for (const state of fromLeft.slice(stepsToCenter - 1)) {
      expect(state.steerRad).toBe(0);
    }
  });

  test('類比輸入 0.5：朝 17.5° 移動並停在那裡', () => {
    const state = run(AT_REST, { ...IDLE, steer: 0.5 }, stepsIn(1));
    expect(steerDeg(state)).toBeCloseTo(17.5, DIGITS);
  });

  test('右打到底時改打左：以 90°/s 經過 0 打到 −35°', () => {
    const states = trace(AT_RIGHT_LOCK, STEER_LEFT, 2 * stepsToLock);
    expect(steerDeg(states[0] ?? AT_REST)).toBeCloseTo(35 - 90 / PHYSICS_HZ, DIGITS);
    expect(states.at(-1)?.steerRad).toBe(-VEHICLE_CONFIG_SI.maxSteerRad);
  });
});

describe('直行方向', () => {
  test('heading 0° 直行：z 減少、x 不變', () => {
    const state = run(AT_REST, FULL_THROTTLE, stepsIn(2));
    expect(state.z).toBeLessThan(0);
    expect(state.x).toBe(0);
    expect(state.headingRad).toBe(0);
  });

  test('heading 90° 直行：x 增加、z 不變', () => {
    const start = { ...AT_REST, headingRad: degToRad(90) };
    const state = run(start, FULL_THROTTLE, stepsIn(2));
    expect(state.x).toBeGreaterThan(0);
    expect(state.z).toBeCloseTo(0, DIGITS);
    expect(state.headingRad).toBe(start.headingRad);
  });

  test('heading 180° 直行 z 增加；270° 直行 x 減少', () => {
    const south = run({ ...AT_REST, headingRad: degToRad(180) }, FULL_THROTTLE, stepsIn(2));
    expect(south.z).toBeGreaterThan(0);
    expect(south.x).toBeCloseTo(0, DIGITS);

    const west = run({ ...AT_REST, headingRad: degToRad(270) }, FULL_THROTTLE, stepsIn(2));
    expect(west.x).toBeLessThan(0);
    expect(west.z).toBeCloseTo(0, DIGITS);
  });

  test('heading 0° 倒車：z 增加、x 不變', () => {
    const state = run(AT_REST, FULL_REVERSE, stepsIn(2));
    expect(state.z).toBeGreaterThan(0);
    expect(state.x).toBe(0);
  });

  test('定速 18 mph 直行 1 秒走 26.4 ft', () => {
    const state = run(AT_TOP_SPEED, FULL_THROTTLE, stepsIn(1));
    expect(mToFt(-state.z)).toBeCloseTo(26.4, DIGITS);
  });
});

describe('轉向方向', () => {
  const steps = stepsIn(1);

  test('前進 + 右轉 → heading 增加', () => {
    const state = run(AT_REST, { ...FULL_THROTTLE, steer: 1 }, steps);
    expect(headingDelta(AT_REST.headingRad, state.headingRad)).toBeGreaterThan(0);
    // 車往右前方走：x 增加、z 減少。
    expect(state.x).toBeGreaterThan(0);
    expect(state.z).toBeLessThan(0);
  });

  test('前進 + 左轉 → heading 減少', () => {
    const state = run(AT_REST, { ...FULL_THROTTLE, steer: -1 }, steps);
    expect(headingDelta(AT_REST.headingRad, state.headingRad)).toBeLessThan(0);
    expect(state.x).toBeLessThan(0);
    expect(state.z).toBeLessThan(0);
  });

  test('倒車 + 右轉 → heading 減少', () => {
    const state = run(AT_REST, { ...FULL_REVERSE, steer: 1 }, steps);
    expect(headingDelta(AT_REST.headingRad, state.headingRad)).toBeLessThan(0);
  });

  test('倒車 + 左轉 → heading 增加', () => {
    const state = run(AT_REST, { ...FULL_REVERSE, steer: -1 }, steps);
    expect(headingDelta(AT_REST.headingRad, state.headingRad)).toBeGreaterThan(0);
  });

  test('左右對稱：左轉是右轉的鏡像', () => {
    const turnedRight = run(AT_REST, { ...FULL_THROTTLE, steer: 1 }, steps);
    const turnedLeft = run(AT_REST, { ...FULL_THROTTLE, steer: -1 }, steps);
    expect(turnedLeft.x).toBeCloseTo(-turnedRight.x, DIGITS);
    expect(turnedLeft.z).toBeCloseTo(turnedRight.z, DIGITS);
    expect(headingDelta(0, turnedLeft.headingRad)).toBeCloseTo(
      -headingDelta(0, turnedRight.headingRad),
      DIGITS,
    );
  });

  test('heading 一直留在 [0, 2π)，往左跨過 0° 也一樣', () => {
    const lockedLeft = { ...AT_TOP_SPEED, steerRad: -VEHICLE_CONFIG_SI.maxSteerRad };
    const states = trace(lockedLeft, { ...FULL_THROTTLE, steer: -1 }, stepsIn(10));
    // 第一步就往左跨過 0°，要折到接近 2π 而不是負值。
    expect(states[0]?.headingRad).toBeGreaterThan(Math.PI);
    for (const state of states) {
      expect(state.headingRad).toBeGreaterThanOrEqual(0);
      expect(state.headingRad).toBeLessThan(FULL_TURN_RAD);
    }
  });
});

describe('單步的積分公式', () => {
  const start: VehicleState = {
    x: ftToM(12),
    z: ftToM(-30),
    headingRad: degToRad(25),
    speedMps: VEHICLE_CONFIG_SI.maxSpeedMps,
    steerRad: VEHICLE_CONFIG_SI.maxSteerRad,
  };
  const input: DriveInput = { throttle: 1, steer: 1, handbrake: false };
  const next = stepVehicle(start, input, DT);
  const expectedTurn =
    (start.speedMps / VEHICLE_CONFIG_SI.wheelbaseM) * Math.tan(start.steerRad) * DT;

  test('Δθ = (speed / 軸距) × tan(steer) × dt', () => {
    expect(next.headingRad - start.headingRad).toBeCloseTo(expectedTurn, 14);
  });

  test('後軸沿 forward(θ + Δθ/2) 走 speed × dt', () => {
    const before = rearAxle(start);
    const after = rearAxle(next);
    const direction = forward(start.headingRad + expectedTurn / 2);
    const travelM = start.speedMps * DT;
    expect(after.x - before.x).toBeCloseTo(direction.x * travelM, 12);
    expect(after.z - before.z).toBeCloseTo(direction.z * travelM, 12);
  });

  test('從靜止起步的第一步：方向盤 → 車速 → heading 依序生效', () => {
    const first = stepVehicle(AT_REST, input, DT);
    const steerRad = VEHICLE_CONFIG_SI.steerRateRadPerS * DT;
    const speedMps = VEHICLE_CONFIG_SI.accelerationMps2 * DT;
    expect(first.steerRad).toBeCloseTo(steerRad, 15);
    expect(first.speedMps).toBeCloseTo(speedMps, 15);
    expect(first.headingRad).toBeGreaterThan(0);
    expect(first.headingRad).toBeCloseTo(
      (speedMps / VEHICLE_CONFIG_SI.wheelbaseM) * Math.tan(steerRad) * DT,
      15,
    );
  });
});

describe('全鎖定速繞圈', () => {
  const expectedRadiusM = ftToM(9 / Math.tan(degToRad(35)));
  const TOLERANCE = 0.01;

  /** 從 heading 0、原點出發繞一圈多，回傳後軸軌跡到理論圓心的距離範圍與累計轉角。 */
  function circle(input: DriveInput, speedMps: number, steerRad: number, seconds: number) {
    const start: VehicleState = { ...AT_REST, speedMps, steerRad };
    // 圓心在後軸的轉向側（右轉在右邊、左轉在左邊），距離一個迴轉半徑。
    const side = Math.sign(steerRad);
    const startAxle = rearAxle(start);
    const r = right(start.headingRad);
    const center: GroundVector = {
      x: startAxle.x + r.x * side * expectedRadiusM,
      z: startAxle.z + r.z * side * expectedRadiusM,
    };

    let previous = start;
    let totalTurnRad = 0;
    let minRadiusM = Infinity;
    let maxRadiusM = 0;
    let widestM = 0;
    for (const state of trace(start, input, stepsIn(seconds))) {
      const axle = rearAxle(state);
      const radiusM = distance(axle, center);
      minRadiusM = Math.min(minRadiusM, radiusM);
      maxRadiusM = Math.max(maxRadiusM, radiusM);
      widestM = Math.max(widestM, distance(axle, startAxle));
      totalTurnRad += headingDelta(previous.headingRad, state.headingRad);
      previous = state;
    }
    return { minRadiusM, maxRadiusM, widestM, totalTurnRad };
  }

  test('理論半徑 9 ft ÷ tan 35° ≈ 12.85 ft', () => {
    expect(mToFt(expectedRadiusM)).toBeCloseTo(12.85, 2);
  });

  test('前進右轉：後軸軌跡半徑在 1% 內，順時針繞滿一圈', () => {
    const result = circle(
      { throttle: 1, steer: 1, handbrake: false },
      VEHICLE_CONFIG_SI.maxSpeedMps,
      VEHICLE_CONFIG_SI.maxSteerRad,
      4,
    );
    expect(result.totalTurnRad).toBeGreaterThan(FULL_TURN_RAD);
    expect(result.minRadiusM).toBeGreaterThan(expectedRadiusM * (1 - TOLERANCE));
    expect(result.maxRadiusM).toBeLessThan(expectedRadiusM * (1 + TOLERANCE));
    // 軌跡上離起點最遠的點是對面那一點，距離 = 直徑。
    expect(result.widestM).toBeGreaterThan(2 * expectedRadiusM * (1 - TOLERANCE));
    expect(result.widestM).toBeLessThan(2 * expectedRadiusM * (1 + TOLERANCE));
  });

  test('前進左轉：同樣半徑，逆時針繞滿一圈', () => {
    const result = circle(
      { throttle: 1, steer: -1, handbrake: false },
      VEHICLE_CONFIG_SI.maxSpeedMps,
      -VEHICLE_CONFIG_SI.maxSteerRad,
      4,
    );
    expect(result.totalTurnRad).toBeLessThan(-FULL_TURN_RAD);
    expect(result.minRadiusM).toBeGreaterThan(expectedRadiusM * (1 - TOLERANCE));
    expect(result.maxRadiusM).toBeLessThan(expectedRadiusM * (1 + TOLERANCE));
  });

  test('倒車右轉：同樣半徑，逆時針繞滿一圈', () => {
    const result = circle(
      { throttle: -1, steer: 1, handbrake: false },
      -VEHICLE_CONFIG_SI.maxReverseSpeedMps,
      VEHICLE_CONFIG_SI.maxSteerRad,
      8,
    );
    expect(result.totalTurnRad).toBeLessThan(-FULL_TURN_RAD);
    expect(result.minRadiusM).toBeGreaterThan(expectedRadiusM * (1 - TOLERANCE));
    expect(result.maxRadiusM).toBeLessThan(expectedRadiusM * (1 + TOLERANCE));
  });
});

describe('靜止時打方向盤', () => {
  const parked: VehicleState = {
    x: ftToM(7.3),
    z: ftToM(-41.9),
    headingRad: degToRad(123.4),
    speedMps: 0,
    steerRad: 0,
  };

  test('位置與 heading 逐位元不變，只有轉向角在動', () => {
    const states = [
      ...trace(parked, STEER_RIGHT, stepsIn(1)),
      ...trace({ ...parked, steerRad: VEHICLE_CONFIG_SI.maxSteerRad }, STEER_LEFT, stepsIn(1)),
    ];
    for (const state of states) {
      expect(state.x).toBe(parked.x);
      expect(state.z).toBe(parked.z);
      expect(state.headingRad).toBe(parked.headingRad);
      expect(state.speedMps).toBe(0);
    }
    expect(states[stepsIn(1) - 1]?.steerRad).toBe(VEHICLE_CONFIG_SI.maxSteerRad);
    expect(states.at(-1)?.steerRad).toBe(-VEHICLE_CONFIG_SI.maxSteerRad);
  });

  test('按住手煞車打方向盤也不動', () => {
    const state = run(parked, { throttle: 1, steer: 1, handbrake: true }, stepsIn(1));
    expect(state.x).toBe(parked.x);
    expect(state.z).toBe(parked.z);
    expect(state.headingRad).toBe(parked.headingRad);
  });
});

describe('可重現', () => {
  /** 一段混合前進、轉彎、煞車、倒車、手煞車的輸入。 */
  function scriptedInput(step: number): DriveInput {
    if (step < 90) return { throttle: 1, steer: 0, handbrake: false };
    if (step < 200) return { throttle: 1, steer: 1, handbrake: false };
    if (step < 260) return { throttle: 0, steer: -0.4, handbrake: false };
    if (step < 330) return { throttle: -1, steer: -1, handbrake: false };
    if (step < 420) return { throttle: -1, steer: 0.7, handbrake: false };
    if (step < 450) return { throttle: 1, steer: 0, handbrake: true };
    return { throttle: 1, steer: -1, handbrake: false };
  }

  function drive(): VehicleState[] {
    const states: VehicleState[] = [];
    let state: VehicleState = { ...AT_REST, x: ftToM(5), z: ftToM(-8), headingRad: degToRad(310) };
    for (let step = 0; step < 600; step += 1) {
      state = stepVehicle(state, scriptedInput(step), DT);
      states.push(state);
    }
    return states;
  }

  test('同一串輸入跑兩次，每一步的狀態逐位元相同', () => {
    const first = drive();
    const second = drive();
    expect(second).toHaveLength(first.length);
    first.forEach((a, index) => {
      const b = second[index] ?? AT_REST;
      expect(Object.is(a.x, b.x)).toBe(true);
      expect(Object.is(a.z, b.z)).toBe(true);
      expect(Object.is(a.headingRad, b.headingRad)).toBe(true);
      expect(Object.is(a.speedMps, b.speedMps)).toBe(true);
      expect(Object.is(a.steerRad, b.steerRad)).toBe(true);
    });
  });

  test('這段路真的有開出去，而且數值都有限', () => {
    const states = drive();
    const last = states.at(-1) ?? AT_REST;
    expect(distance(last, { x: ftToM(5), z: ftToM(-8) })).toBeGreaterThan(ftToM(10));
    for (const state of states) {
      expect(Number.isFinite(state.x)).toBe(true);
      expect(Number.isFinite(state.z)).toBe(true);
      expect(state.headingRad).toBeGreaterThanOrEqual(0);
      expect(state.headingRad).toBeLessThan(FULL_TURN_RAD);
      expect(Math.abs(state.steerRad)).toBeLessThanOrEqual(VEHICLE_CONFIG_SI.maxSteerRad);
      expect(state.speedMps).toBeLessThanOrEqual(VEHICLE_CONFIG_SI.maxSpeedMps);
      expect(state.speedMps).toBeGreaterThanOrEqual(-VEHICLE_CONFIG_SI.maxReverseSpeedMps);
    }
  });

  test('stepVehicle 不改動傳入的狀態', () => {
    const start = Object.freeze({ ...AT_TOP_SPEED, steerRad: 0.1 });
    const copy = { ...start };
    stepVehicle(start, { throttle: 1, steer: 1, handbrake: false }, DT);
    expect(start).toEqual(copy);
  });
});

describe('vehicleCorners：車身四角', () => {
  const halfLengthFt = 7.5;
  const halfWidthFt = 3;

  function cornersFt(state: VehicleState): { x: number; z: number }[] {
    return vehicleCorners(state).map((corner) => ({ x: mToFt(corner.x), z: mToFt(corner.z) }));
  }

  function expectCornersFt(state: VehicleState, expected: [number, number][]): void {
    const actual = cornersFt(state);
    expect(actual).toHaveLength(4);
    expected.forEach(([x, z], index) => {
      expect(actual[index]?.x).toBeCloseTo(x, DIGITS);
      expect(actual[index]?.z).toBeCloseTo(z, DIGITS);
    });
  }

  test('heading 0°：順序是左前、右前、右後、左後', () => {
    expectCornersFt(AT_REST, [
      [-halfWidthFt, -halfLengthFt],
      [halfWidthFt, -halfLengthFt],
      [halfWidthFt, halfLengthFt],
      [-halfWidthFt, halfLengthFt],
    ]);
  });

  test('heading 90°（朝 +X）：車頭兩角在 +X 側，右側在 +Z', () => {
    expectCornersFt({ ...AT_REST, headingRad: degToRad(90) }, [
      [halfLengthFt, -halfWidthFt],
      [halfLengthFt, halfWidthFt],
      [-halfLengthFt, halfWidthFt],
      [-halfLengthFt, -halfWidthFt],
    ]);
  });

  test('heading 180°：整台車掉頭', () => {
    expectCornersFt({ ...AT_REST, headingRad: degToRad(180) }, [
      [halfWidthFt, halfLengthFt],
      [-halfWidthFt, halfLengthFt],
      [-halfWidthFt, -halfLengthFt],
      [halfWidthFt, -halfLengthFt],
    ]);
  });

  test('跟著車身中心平移', () => {
    const state = { ...AT_REST, x: ftToM(100), z: ftToM(-50) };
    expectCornersFt(state, [
      [100 - halfWidthFt, -50 - halfLengthFt],
      [100 + halfWidthFt, -50 - halfLengthFt],
      [100 + halfWidthFt, -50 + halfLengthFt],
      [100 - halfWidthFt, -50 + halfLengthFt],
    ]);
  });

  test('斜向 30°：四角到中心等距，對邊長度是車長與車寬', () => {
    const state = { ...AT_REST, x: ftToM(4), z: ftToM(9), headingRad: degToRad(30) };
    const [frontLeft, frontRight, rearRight, rearLeft] = vehicleCorners(state);
    const halfDiagonalM = Math.hypot(VEHICLE_CONFIG_SI.lengthM, VEHICLE_CONFIG_SI.widthM) / 2;
    for (const corner of [frontLeft, frontRight, rearRight, rearLeft]) {
      expect(distance(corner, state)).toBeCloseTo(halfDiagonalM, DIGITS);
    }
    expect(distance(frontLeft, frontRight)).toBeCloseTo(VEHICLE_CONFIG_SI.widthM, DIGITS);
    expect(distance(rearLeft, rearRight)).toBeCloseTo(VEHICLE_CONFIG_SI.widthM, DIGITS);
    expect(distance(frontLeft, rearLeft)).toBeCloseTo(VEHICLE_CONFIG_SI.lengthM, DIGITS);
    expect(distance(frontRight, rearRight)).toBeCloseTo(VEHICLE_CONFIG_SI.lengthM, DIGITS);
    // 車頭兩角的中點在車身中心前方半個車長。
    const f = forward(state.headingRad);
    expect((frontLeft.x + frontRight.x) / 2).toBeCloseTo(
      state.x + (f.x * VEHICLE_CONFIG_SI.lengthM) / 2,
      DIGITS,
    );
    expect((frontLeft.z + frontRight.z) / 2).toBeCloseTo(
      state.z + (f.z * VEHICLE_CONFIG_SI.lengthM) / 2,
      DIGITS,
    );
  });
});

describe('算圖內插 interpolateVehiclePose', () => {
  const previous = { x: 1, z: -2, headingRad: degToRad(10), steerRad: degToRad(-4) };
  const current = { x: 3, z: -6, headingRad: degToRad(20), steerRad: degToRad(4) };

  test('alpha 0 是上一步、alpha 1 是這一步', () => {
    const atStart = interpolateVehiclePose(previous, current, 0);
    expect(atStart.x).toBe(previous.x);
    expect(atStart.z).toBe(previous.z);
    expect(atStart.headingRad).toBe(previous.headingRad);
    expect(atStart.steerRad).toBe(previous.steerRad);

    const atEnd = interpolateVehiclePose(previous, current, 1);
    expect(atEnd.x).toBeCloseTo(current.x, DIGITS);
    expect(atEnd.z).toBeCloseTo(current.z, DIGITS);
    expect(atEnd.headingRad).toBeCloseTo(current.headingRad, DIGITS);
    expect(atEnd.steerRad).toBeCloseTo(current.steerRad, DIGITS);
  });

  test('alpha 0.25：位置、heading、轉向角都走四分之一', () => {
    const pose = interpolateVehiclePose(previous, current, 0.25);
    expect(pose.x).toBeCloseTo(1.5, DIGITS);
    expect(pose.z).toBeCloseTo(-3, DIGITS);
    expect(radToDeg(pose.headingRad)).toBeCloseTo(12.5, DIGITS);
    expect(radToDeg(pose.steerRad)).toBeCloseTo(-2, DIGITS);
  });

  test('heading 跨過 0°：358° → 2° 走 4° 的短弧，不是倒轉 356°', () => {
    const from = { ...previous, headingRad: degToRad(358) };
    const to = { ...current, headingRad: degToRad(2) };
    expect(radToDeg(interpolateVehiclePose(from, to, 0.25).headingRad)).toBeCloseTo(359, DIGITS);
    expect(radToDeg(interpolateVehiclePose(from, to, 0.75).headingRad)).toBeCloseTo(1, DIGITS);
    // 反方向（2° → 358°）同樣走短弧。
    expect(radToDeg(interpolateVehiclePose(to, from, 0.25).headingRad)).toBeCloseTo(1, DIGITS);
  });

  test('靜止的車（前後兩步相同）不論 alpha 多少，姿態逐位元不變', () => {
    const still = { x: 12.3, z: -4.56, headingRad: degToRad(123.4), steerRad: 0 };
    for (const alpha of [0, 0.1, 0.5, 0.999]) {
      expect(interpolateVehiclePose(still, still, alpha)).toEqual(still);
    }
  });
});
