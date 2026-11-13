// 腳剎（DriveInput.brake）：會讓車減速、停在剛好 0；力道與反向油門的煞車相同。
import { describe, expect, test } from 'vitest';
import { FIXED_STEP_SECONDS } from '../src/core/gameConfig';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import { hasDriveInput, startSession, stepSession } from '../src/level/session';
import { stepVehicle, type DriveInput, type VehicleState } from '../src/vehicle/bicycleModel';
import { carLightsFor } from '../src/vehicle/carMesh';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';

const IDLE: DriveInput = { throttle: 0, steer: 0 };
const BRAKE: DriveInput = { ...IDLE, brake: true };
const DT = FIXED_STEP_SECONDS;

function moving(speedMps: number): VehicleState {
  return { x: 0, z: 0, headingRad: 0, speedMps, steerRad: 0 };
}

/** 從這個車速到停住要幾步。 */
function stepsToStop(speedMps: number, input: DriveInput): number {
  let state = moving(speedMps);
  let steps = 0;
  while (state.speedMps !== 0 && steps < 10_000) {
    state = stepVehicle(state, input, DT);
    steps += 1;
  }
  return steps;
}

describe('腳剎：車輛模型', () => {
  test('每一步減速 brakeMps2 × dt（前進與倒車都一樣）', () => {
    const decel = VEHICLE_CONFIG_SI.brakeMps2 * DT;
    expect(stepVehicle(moving(5), BRAKE, DT).speedMps).toBeCloseTo(5 - decel, 12);
    expect(stepVehicle(moving(-3), BRAKE, DT).speedMps).toBeCloseTo(-3 + decel, 12);
  });

  test('停在剛好 0，不會變號；停著踩腳剎車不動', () => {
    let state = moving(0.01);
    state = stepVehicle(state, BRAKE, DT);
    expect(state.speedMps).toBe(0);
    expect(stepVehicle(moving(0), BRAKE, DT)).toEqual(moving(0));
  });

  test('比滑行快停', () => {
    expect(stepsToStop(6, BRAKE)).toBeLessThan(stepsToStop(6, IDLE));
  });

  test('踩著腳剎再踩油門：車不會加速，停著就一直停著', () => {
    const state = stepVehicle(moving(0), { ...BRAKE, throttle: 1 }, DT);
    expect(state.speedMps).toBe(0);
    expect(stepVehicle(moving(4), { ...BRAKE, throttle: 1 }, DT).speedMps).toBeLessThan(4);
    expect(stepVehicle(moving(-4), { ...BRAKE, throttle: -1 }, DT).speedMps).toBeGreaterThan(-4);
  });

  test('力道與反向油門的煞車相同（前進與倒車都一樣）', () => {
    expect(stepVehicle(moving(5), BRAKE, DT)).toEqual(
      stepVehicle(moving(5), { ...IDLE, throttle: -1 }, DT),
    );
    expect(stepVehicle(moving(-3), BRAKE, DT)).toEqual(
      stepVehicle(moving(-3), { ...IDLE, throttle: 1 }, DT),
    );
  });

  test('沒填 brake 與 brake: false 完全相同（照腳本開的路線不受影響）', () => {
    const start = moving(4);
    for (const throttle of [-1, 0, 1] as const) {
      const without: DriveInput = { throttle, steer: 0.5 };
      expect(stepVehicle(start, { ...without, brake: false }, DT)).toEqual(
        stepVehicle(start, without, DT),
      );
    }
  });

  test('方向盤照常：踩腳剎時還是可以轉', () => {
    const state = stepVehicle(moving(5), { ...BRAKE, steer: 1 }, DT);
    expect(state.steerRad).toBeGreaterThan(0);
  });
});

describe('腳剎：一局與車燈', () => {
  test('踩腳剎算駕駛輸入（開始計時），什麼都沒按不算', () => {
    expect(hasDriveInput(BRAKE)).toBe(true);
    expect(hasDriveInput(IDLE)).toBe(false);
    expect(hasDriveInput({ ...IDLE, brake: false })).toBe(false);
    expect(stepSession(startSession(PROTOTYPE_LAYOUT), BRAKE).status).toBe('driving');
  });

  test('一局裡踩腳剎：車慢下來並停住', () => {
    let session = startSession(PROTOTYPE_LAYOUT);
    for (let step = 0; step < 60; step += 1) {
      session = stepSession(session, { ...IDLE, throttle: 1 });
    }
    const cruisingMps = session.vehicle.speedMps;
    expect(cruisingMps).toBeGreaterThan(1);
    session = stepSession(session, BRAKE);
    expect(session.vehicle.speedMps).toBeLessThan(cruisingMps);
    for (let step = 0; step < 120 && session.vehicle.speedMps !== 0; step += 1) {
      session = stepSession(session, BRAKE);
    }
    expect(session.vehicle.speedMps).toBe(0);
    expect(session.status).toBe('driving');
  });

  test('踩腳剎亮煞車燈；沒踩不亮', () => {
    expect(carLightsFor(BRAKE, 3, 'forward').braking).toBe(true);
    expect(carLightsFor(BRAKE, 0, 'reverse').braking).toBe(true);
    expect(carLightsFor(IDLE, 3, 'forward').braking).toBe(false);
    expect(carLightsFor({ ...IDLE, brake: false }, 3, 'forward').braking).toBe(false);
  });
});
