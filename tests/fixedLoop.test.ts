import { describe, expect, test } from 'vitest';
import { advanceFixedLoop } from '../src/core/fixedLoop';
import { FIXED_STEP_SECONDS, MAX_FRAME_SECONDS, PHYSICS_HZ } from '../src/core/gameConfig';
import { stepVehicle, type DriveInput, type VehicleState } from '../src/vehicle/bicycleModel';

const START: VehicleState = { x: 0, z: 0, headingRad: 0, speedMps: 0, steerRad: 0 };

/** 依「第幾步物理」決定輸入，所以最後狀態只取決於總共跑了幾步。 */
function scriptedInput(step: number): DriveInput {
  if (step < 40) return { throttle: 1, steer: 0 };
  if (step < 80) return { throttle: 1, steer: 1 };
  if (step < 100) return { throttle: 0, steer: -1 };
  return { throttle: -1, steer: -0.5 };
}

/** 照主迴圈的用法餵一串幀時間：每幀推進累加器，要跑幾步就跑幾步物理。 */
function simulate(frames: readonly number[]) {
  let accumulatorSeconds = 0;
  let alpha = 0;
  let steps = 0;
  let maxStepsInOneFrame = 0;
  let state = START;
  for (const frameSeconds of frames) {
    const frame = advanceFixedLoop(accumulatorSeconds, frameSeconds);
    for (let i = 0; i < frame.steps; i += 1) {
      state = stepVehicle(state, scriptedInput(steps), FIXED_STEP_SECONDS);
      steps += 1;
    }
    accumulatorSeconds = frame.accumulatorSeconds;
    alpha = frame.alpha;
    maxStepsInOneFrame = Math.max(maxStepsInOneFrame, frame.steps);
  }
  return { steps, state, accumulatorSeconds, alpha, maxStepsInOneFrame };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

describe('一步的長度', () => {
  test('FIXED_STEP_SECONDS 是 1/60 s', () => {
    expect(FIXED_STEP_SECONDS).toBe(1 / 60);
    expect(FIXED_STEP_SECONDS * PHYSICS_HZ).toBeCloseTo(1, 15);
  });
});

describe('advanceFixedLoop：累加器', () => {
  test('剛好一步的幀：跑 1 步，沒有剩餘', () => {
    expect(advanceFixedLoop(0, FIXED_STEP_SECONDS)).toEqual({
      steps: 1,
      accumulatorSeconds: 0,
      alpha: 0,
    });
  });

  test('不滿一步的幀：不跑，時間留在累加器', () => {
    const frame = advanceFixedLoop(0, FIXED_STEP_SECONDS / 2);
    expect(frame.steps).toBe(0);
    expect(frame.accumulatorSeconds).toBe(FIXED_STEP_SECONDS / 2);
    expect(frame.alpha).toBeCloseTo(0.5, 12);
  });

  test('剩餘時間累積到下一幀：兩個 0.6 步的幀合起來跑 1 步', () => {
    const first = advanceFixedLoop(0, FIXED_STEP_SECONDS * 0.6);
    const second = advanceFixedLoop(first.accumulatorSeconds, FIXED_STEP_SECONDS * 0.6);
    expect(first.steps).toBe(0);
    expect(first.alpha).toBeCloseTo(0.6, 12);
    expect(second.steps).toBe(1);
    expect(second.alpha).toBeCloseTo(0.2, 12);
  });

  test('2.5 步的幀：跑 2 步，剩半步', () => {
    const frame = advanceFixedLoop(0, FIXED_STEP_SECONDS * 2.5);
    expect(frame.steps).toBe(2);
    expect(frame.accumulatorSeconds).toBeCloseTo(FIXED_STEP_SECONDS / 2, 12);
    expect(frame.alpha).toBeCloseTo(0.5, 12);
  });

  test('60 Hz 均勻幀跑 1 秒：每幀剛好 1 步，共 60 步', () => {
    const result = simulate(new Array<number>(PHYSICS_HZ).fill(FIXED_STEP_SECONDS));
    expect(result.steps).toBe(PHYSICS_HZ);
    expect(result.maxStepsInOneFrame).toBe(1);
    expect(result.accumulatorSeconds).toBe(0);
  });

  test('120 Hz 均勻幀跑 1 秒：每兩幀 1 步，共 60 步', () => {
    const result = simulate(new Array<number>(2 * PHYSICS_HZ).fill(FIXED_STEP_SECONDS / 2));
    expect(result.steps).toBe(PHYSICS_HZ);
    expect(result.maxStepsInOneFrame).toBe(1);
  });

  test('30 Hz 均勻幀跑 1 秒：每幀 2 步，共 60 步', () => {
    const result = simulate(new Array<number>(PHYSICS_HZ / 2).fill(FIXED_STEP_SECONDS * 2));
    expect(result.steps).toBe(PHYSICS_HZ);
    expect(result.maxStepsInOneFrame).toBe(2);
  });

  test('時間倒退（負的幀時間）當成 0：不跑、累加器不變', () => {
    const frame = advanceFixedLoop(FIXED_STEP_SECONDS / 4, -1);
    expect(frame.steps).toBe(0);
    expect(frame.accumulatorSeconds).toBe(FIXED_STEP_SECONDS / 4);
  });
});

describe('內插係數', () => {
  test('永遠在 [0, 1)，等於剩餘時間 ÷ 一步', () => {
    const frames = [0.004, 0.031, 0.0167, 0.009, 0.05, 0.0021, 0.1, 0.0333, 0.2, 5, 0.0001];
    let accumulatorSeconds = 0;
    for (const frameSeconds of frames) {
      const frame = advanceFixedLoop(accumulatorSeconds, frameSeconds);
      expect(frame.alpha).toBeGreaterThanOrEqual(0);
      expect(frame.alpha).toBeLessThan(1);
      expect(frame.accumulatorSeconds).toBeGreaterThanOrEqual(0);
      expect(frame.accumulatorSeconds).toBeLessThan(FIXED_STEP_SECONDS);
      expect(frame.alpha).toBe(frame.accumulatorSeconds / FIXED_STEP_SECONDS);
      accumulatorSeconds = frame.accumulatorSeconds;
    }
  });

  test('144 Hz 螢幕：係數隨幀前進，跑了一步就折回來', () => {
    const frameSeconds = 1 / 144;
    const first = advanceFixedLoop(0, frameSeconds);
    const second = advanceFixedLoop(first.accumulatorSeconds, frameSeconds);
    const third = advanceFixedLoop(second.accumulatorSeconds, frameSeconds);
    expect([first.steps, second.steps, third.steps]).toEqual([0, 0, 1]);
    expect(first.alpha).toBeCloseTo(60 / 144, 12);
    expect(second.alpha).toBeCloseTo(120 / 144, 12);
    expect(third.alpha).toBeCloseTo(180 / 144 - 1, 12);
  });
});

describe('均勻幀與不規則幀', () => {
  // 一輪不規則的幀時間（秒），每幀都在上限內；重複 4 輪。
  const irregularCycle = [
    0.004, 0.031, 0.0167, 0.009, 0.05, 0.0021, 0.1, 0.0333, 0.012, 0.007, 0.2, 0.0169, 0.008, 0.025,
    0.0162,
  ];
  const irregular = [...irregularCycle, ...irregularCycle, ...irregularCycle, ...irregularCycle];
  const totalSeconds = sum(irregular);
  const expectedSteps = Math.floor(totalSeconds * PHYSICS_HZ);

  const uniformFrameCount = 240;
  const uniform = new Array<number>(uniformFrameCount).fill(totalSeconds / uniformFrameCount);

  // 很慢的機器：每幀 0.2 秒，最後一幀補足剩下的時間。
  const slowFrameSeconds = 0.2;
  const slowFrameCount = Math.floor(totalSeconds / slowFrameSeconds);
  const slow = [
    ...new Array<number>(slowFrameCount).fill(slowFrameSeconds),
    totalSeconds - slowFrameCount * slowFrameSeconds,
  ];

  test('前提：三串幀總時間相同、沒有幀超過上限、總時間不落在步的邊界上', () => {
    expect(sum(uniform)).toBeCloseTo(totalSeconds, 12);
    expect(sum(slow)).toBeCloseTo(totalSeconds, 12);
    for (const frameSeconds of [...irregular, ...uniform, ...slow]) {
      expect(frameSeconds).toBeGreaterThan(0);
      expect(frameSeconds).toBeLessThanOrEqual(MAX_FRAME_SECONDS);
    }
    // 總時間離最近的步邊界至少 0.2 步，浮點誤差不會影響步數。
    const fraction = totalSeconds * PHYSICS_HZ - expectedSteps;
    expect(fraction).toBeGreaterThan(0.2);
    expect(fraction).toBeLessThan(0.8);
  });

  test('步數相同，等於總時間 × 60 取整', () => {
    expect(simulate(irregular).steps).toBe(expectedSteps);
    expect(simulate(uniform).steps).toBe(expectedSteps);
    expect(simulate(slow).steps).toBe(expectedSteps);
  });

  test('車輛狀態逐位元相同', () => {
    const fromIrregular = simulate(irregular).state;
    const fromUniform = simulate(uniform).state;
    const fromSlow = simulate(slow).state;
    for (const other of [fromUniform, fromSlow]) {
      expect(Object.is(other.x, fromIrregular.x)).toBe(true);
      expect(Object.is(other.z, fromIrregular.z)).toBe(true);
      expect(Object.is(other.headingRad, fromIrregular.headingRad)).toBe(true);
      expect(Object.is(other.speedMps, fromIrregular.speedMps)).toBe(true);
      expect(Object.is(other.steerRad, fromIrregular.steerRad)).toBe(true);
    }
    // 車真的有動，不是三個都停在原點。
    expect(Math.hypot(fromIrregular.x, fromIrregular.z)).toBeGreaterThan(1);
  });

  test('剩餘時間與內插係數也一致', () => {
    const fromIrregular = simulate(irregular);
    const fromUniform = simulate(uniform);
    expect(fromUniform.accumulatorSeconds).toBeCloseTo(fromIrregular.accumulatorSeconds, 9);
    expect(fromUniform.alpha).toBeCloseTo(fromIrregular.alpha, 6);
  });
});

describe('超長單幀', () => {
  const maxStepsPerFrame = Math.floor(MAX_FRAME_SECONDS * PHYSICS_HZ);

  test('上限 0.25 秒 = 15 步', () => {
    expect(maxStepsPerFrame).toBe(15);
  });

  test('5 秒的單幀只跑上限那麼多步，不是 300 步', () => {
    const frame = advanceFixedLoop(0, 5);
    expect(frame.steps).toBe(maxStepsPerFrame);
    expect(frame.accumulatorSeconds).toBeLessThan(FIXED_STEP_SECONDS);
  });

  test('超長單幀的結果和「剛好上限」的單幀完全相同', () => {
    expect(advanceFixedLoop(0, 5)).toEqual(advanceFixedLoop(0, MAX_FRAME_SECONDS));
    expect(advanceFixedLoop(0, 3600)).toEqual(advanceFixedLoop(0, MAX_FRAME_SECONDS));
    expect(advanceFixedLoop(0, Infinity)).toEqual(advanceFixedLoop(0, MAX_FRAME_SECONDS));
  });

  test('累加器裡已經有剩餘時也不會多跑超過一步', () => {
    const leftover = FIXED_STEP_SECONDS * 0.9;
    const frame = advanceFixedLoop(leftover, 5);
    expect(frame.steps).toBeLessThanOrEqual(maxStepsPerFrame + 1);
  });

  test('連續幾個超長幀：每幀都被截斷', () => {
    const result = simulate([5, 5, 5]);
    expect(result.maxStepsInOneFrame).toBeLessThanOrEqual(maxStepsPerFrame + 1);
    expect(result.steps).toBeLessThanOrEqual(3 * maxStepsPerFrame + 1);
    expect(result.steps).toBeGreaterThanOrEqual(3 * maxStepsPerFrame - 1);
  });

  test('剛好在上限內的幀不受影響', () => {
    const frame = advanceFixedLoop(0, FIXED_STEP_SECONDS * 10.5);
    expect(frame.steps).toBe(10);
  });
});
