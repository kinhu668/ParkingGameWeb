// 檔位：自排（由車速與油門推導）與手排（按了掛 D／掛 R），以及手排時油門方向受檔位限制。
import { describe, expect, test } from 'vitest';
import { FIXED_STEP_SECONDS } from '../src/core/gameConfig';
import { stepVehicle, type DriveInput, type VehicleState } from '../src/vehicle/bicycleModel';
import {
  INITIAL_GEARBOX,
  inputForGear,
  nextGearbox,
  shiftTo,
  type Gearbox,
} from '../src/vehicle/gearbox';

const IDLE: DriveInput = { throttle: 0, steer: 0, handbrake: false, brake: false };
const FORWARD: DriveInput = { ...IDLE, throttle: 1 };
const BACKWARD: DriveInput = { ...IDLE, throttle: -1 };
const AT_REST: VehicleState = { x: 0, z: 0, headingRad: 0, speedMps: 0, steerRad: 0 };

/** 照 main.ts 的順序跑：輸入先套檔位 → 物理步 → 更新檔位。 */
function drive(
  start: { readonly vehicle: VehicleState; readonly gearbox: Gearbox },
  pressed: DriveInput,
  steps: number,
): { readonly vehicle: VehicleState; readonly gearbox: Gearbox } {
  let { vehicle, gearbox } = start;
  for (let step = 0; step < steps; step += 1) {
    vehicle = stepVehicle(vehicle, inputForGear(pressed, gearbox), FIXED_STEP_SECONDS);
    gearbox = nextGearbox(gearbox, 'driving', vehicle.speedMps, pressed.throttle);
  }
  return { vehicle, gearbox };
}

describe('自排（沒按過掛檔鍵）：行為與以前相同', () => {
  test('新的一局是自排 D 檔', () => {
    expect(INITIAL_GEARBOX).toEqual({ gear: 'forward', manual: false });
  });

  test('輸入原樣通過：W 前進、S 倒車', () => {
    expect(inputForGear(FORWARD, INITIAL_GEARBOX)).toBe(FORWARD);
    expect(inputForGear(BACKWARD, INITIAL_GEARBOX)).toBe(BACKWARD);
    expect(inputForGear(BACKWARD, { gear: 'reverse', manual: false })).toBe(BACKWARD);
    expect(inputForGear(FORWARD, { gear: 'reverse', manual: false })).toBe(FORWARD);
  });

  test('檔位由車速與油門推導：按 S 倒車 → R，再按 W 煞停後 → D', () => {
    const reversing = drive({ vehicle: AT_REST, gearbox: INITIAL_GEARBOX }, BACKWARD, 30);
    expect(reversing.vehicle.speedMps).toBeLessThan(0);
    expect(reversing.gearbox).toEqual({ gear: 'reverse', manual: false });

    // 還在後退時按 W 是煞車：檔位不變。
    const braking = drive(reversing, FORWARD, 1);
    expect(braking.gearbox.gear).toBe('reverse');
    const forward = drive(braking, FORWARD, 120);
    expect(forward.vehicle.speedMps).toBeGreaterThan(0);
    expect(forward.gearbox).toEqual({ gear: 'forward', manual: false });
  });

  test('ready（重來後還沒輸入）一律 D 檔；結束後不再換檔', () => {
    const reverse: Gearbox = { gear: 'reverse', manual: false };
    expect(nextGearbox(reverse, 'ready', 0, 0)).toEqual(INITIAL_GEARBOX);
    expect(nextGearbox(reverse, 'parked', 0, 1)).toBe(reverse);
    expect(nextGearbox(INITIAL_GEARBOX, 'failed', 0, -1)).toBe(INITIAL_GEARBOX);
  });

  test('檔位沒變時回傳同一個物件', () => {
    expect(nextGearbox(INITIAL_GEARBOX, 'driving', 3, 1)).toBe(INITIAL_GEARBOX);
  });
});

describe('手排（按了掛 D／掛 R）', () => {
  test('掛檔立刻換過去並進入手排', () => {
    expect(shiftTo('reverse')).toEqual({ gear: 'reverse', manual: true });
    expect(shiftTo('forward')).toEqual({ gear: 'forward', manual: true });
  });

  test('手排的檔位只有掛檔鍵能換：車速、油門、ready 都不會動它', () => {
    const reverse = shiftTo('reverse');
    expect(nextGearbox(reverse, 'driving', 5, 1)).toBe(reverse);
    expect(nextGearbox(reverse, 'ready', 0, 0)).toBe(reverse);
    expect(nextGearbox(reverse, 'driving', 0, 1)).toBe(reverse);
    const forward = shiftTo('forward');
    expect(nextGearbox(forward, 'driving', -3, -1)).toBe(forward);
  });

  test('同方向的油門原樣；反方向的油門變成腳剎，不推車', () => {
    expect(inputForGear(FORWARD, shiftTo('forward'))).toBe(FORWARD);
    expect(inputForGear(BACKWARD, shiftTo('reverse'))).toBe(BACKWARD);
    expect(inputForGear(BACKWARD, shiftTo('forward'))).toEqual({ ...IDLE, throttle: 0, brake: true });
    expect(inputForGear(FORWARD, shiftTo('reverse'))).toEqual({ ...IDLE, throttle: 0, brake: true });
    expect(inputForGear(IDLE, shiftTo('reverse'))).toBe(IDLE);
  });

  test('方向盤與手煞車不受檔位影響', () => {
    const pressed: DriveInput = { throttle: 1, steer: -1, handbrake: true, brake: false };
    expect(inputForGear(pressed, shiftTo('reverse'))).toEqual({
      throttle: 0,
      steer: -1,
      handbrake: true,
      brake: true,
    });
  });

  test('D 檔只能向前：按倒車油門會煞到停，之後再怎麼按車速都不會變成負的', () => {
    const cruising = drive({ vehicle: AT_REST, gearbox: shiftTo('forward') }, FORWARD, 90);
    expect(cruising.vehicle.speedMps).toBeGreaterThan(1);

    let state = cruising;
    for (let step = 0; step < 300; step += 1) {
      state = drive(state, BACKWARD, 1);
      expect(state.vehicle.speedMps).toBeGreaterThanOrEqual(0);
    }
    expect(state.vehicle.speedMps).toBe(0);
    expect(state.gearbox).toEqual({ gear: 'forward', manual: true });
  });

  test('R 檔只能向後：按倒車油門後退；按油門只會煞到停，不會往前', () => {
    const start = { vehicle: AT_REST, gearbox: shiftTo('reverse') };
    // 停著按油門：車不動。
    expect(drive(start, FORWARD, 60).vehicle).toEqual(AT_REST);

    const reversing = drive(start, BACKWARD, 60);
    expect(reversing.vehicle.speedMps).toBeLessThan(-0.5);
    expect(reversing.vehicle.z).toBeGreaterThan(0);

    let state = reversing;
    for (let step = 0; step < 300; step += 1) {
      state = drive(state, FORWARD, 1);
      expect(state.vehicle.speedMps).toBeLessThanOrEqual(0);
    }
    expect(state.vehicle.speedMps).toBe(0);
    expect(state.gearbox.gear).toBe('reverse');
  });

  test('行進中換檔：往前開時掛 R，倒車油門先煞停再後退', () => {
    const cruising = drive({ vehicle: AT_REST, gearbox: shiftTo('forward') }, FORWARD, 90);
    const shifted = { vehicle: cruising.vehicle, gearbox: shiftTo('reverse') };
    const later = drive(shifted, BACKWARD, 240);
    expect(later.vehicle.speedMps).toBeLessThan(0);
  });
});
