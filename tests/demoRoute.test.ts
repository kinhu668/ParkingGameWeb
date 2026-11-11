// 固定示範路線（?cam 與 ?bench 共用）：時間 → 輸入的表、可重現、最後停進車位。
import { describe, expect, test } from 'vitest';
import { FIXED_STEP_SECONDS, PHYSICS_HZ } from '../src/core/gameConfig';
import {
  DEMO_ROUTE_SECONDS,
  DEMO_ROUTE_STEPS,
  demoInputAtStep,
  demoVehicleAfterSteps,
} from '../src/level/demoRoute';
import { parkingConditionsMet } from '../src/level/parkingJudge';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import { stepVehicle } from '../src/vehicle/bicycleModel';

const START = PROTOTYPE_LAYOUT.startState;

describe('示範路線 demoRoute', () => {
  test('總長 10 秒 = 600 步', () => {
    expect(DEMO_ROUTE_SECONDS).toBe(10);
    expect(DEMO_ROUTE_STEPS).toBe(DEMO_ROUTE_SECONDS * PHYSICS_HZ);
  });

  test('一開始直行加速，結尾拉手煞車；路線結束後一直拉著', () => {
    expect(demoInputAtStep(0)).toEqual({ throttle: 1, steer: 0, handbrake: false });
    expect(demoInputAtStep(DEMO_ROUTE_STEPS - 1)).toEqual({ throttle: 0, steer: 0, handbrake: true });
    expect(demoInputAtStep(DEMO_ROUTE_STEPS)).toEqual({ throttle: 0, steer: 0, handbrake: true });
    expect(demoInputAtStep(DEMO_ROUTE_STEPS * 10)).toEqual({ throttle: 0, steer: 0, handbrake: true });
  });

  test('分段邊界落在整數步：第 104 步還在直行，第 105 步（1.75 秒）開始右轉', () => {
    expect(demoInputAtStep(104).steer).toBe(0);
    expect(demoInputAtStep(105).steer).toBe(1);
  });

  test('路線包含前進、右轉、左轉、手煞車', () => {
    const inputs = Array.from({ length: DEMO_ROUTE_STEPS }, (_, step) => demoInputAtStep(step));
    expect(inputs.some((input) => input.throttle === 1)).toBe(true);
    expect(inputs.some((input) => input.steer > 0)).toBe(true);
    expect(inputs.some((input) => input.steer < 0)).toBe(true);
    expect(inputs.some((input) => input.handbrake)).toBe(true);
  });

  test('0 步就是起點', () => {
    expect(demoVehicleAfterSteps(START, 0)).toEqual(START);
  });

  test('同樣的步數跑兩次，狀態逐位元相同', () => {
    expect(demoVehicleAfterSteps(START, 120)).toEqual(demoVehicleAfterSteps(START, 120));
    expect(demoVehicleAfterSteps(START, DEMO_ROUTE_STEPS)).toEqual(
      demoVehicleAfterSteps(START, DEMO_ROUTE_STEPS),
    );
  });

  test('一次跑完與一步一步跑（bench 的跑法）結果相同', () => {
    let vehicle = START;
    for (let step = 0; step < 300; step += 1) {
      vehicle = stepVehicle(vehicle, demoInputAtStep(step), FIXED_STEP_SECONDS);
    }
    expect(vehicle).toEqual(demoVehicleAfterSteps(START, 300));
  });

  test('t = 2 秒時車已經離開起點、還在前進', () => {
    const vehicle = demoVehicleAfterSteps(START, 2 * PHYSICS_HZ);
    expect(vehicle.z).toBeLessThan(START.z);
    expect(vehicle.speedMps).toBeGreaterThan(0);
  });

  test('路線中途真的有左右繞（不是一路直行）', () => {
    let maxAbsX = 0;
    for (let steps = 0; steps <= DEMO_ROUTE_STEPS; steps += 10) {
      maxAbsX = Math.max(maxAbsX, Math.abs(demoVehicleAfterSteps(START, steps).x));
    }
    expect(maxAbsX).toBeGreaterThan(PROTOTYPE_LAYOUT.spot.widthM);
  });

  test('跑完時車靜止、方向盤回正，而且停在車位內（判定條件成立）', () => {
    const vehicle = demoVehicleAfterSteps(START, DEMO_ROUTE_STEPS);
    expect(vehicle.speedMps).toBe(0);
    expect(vehicle.steerRad).toBe(0);
    expect(parkingConditionsMet(vehicle, PROTOTYPE_LAYOUT.spot)).toBe(true);
  });

  test('路線結束後再跑也不會動', () => {
    expect(demoVehicleAfterSteps(START, DEMO_ROUTE_STEPS + 120)).toEqual(
      demoVehicleAfterSteps(START, DEMO_ROUTE_STEPS),
    );
  });
});
