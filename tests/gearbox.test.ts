// 檔位：自排（由車速與油門推導）與手排（按了掛 D／掛 R），以及手排時油門方向受檔位限制。
import { describe, expect, test } from 'vitest';
import { FIXED_STEP_SECONDS } from '../src/core/gameConfig';
import { stepVehicle, type DriveInput, type VehicleState } from '../src/vehicle/bicycleModel';
import {
  INITIAL_GEARBOX,
  gearboxForFrame,
  inputForGear,
  nextGearbox,
  shiftTo,
  type Gearbox,
} from '../src/vehicle/gearbox';

const IDLE: DriveInput = { throttle: 0, steer: 0, brake: false };
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

  test('方向盤不受檔位影響', () => {
    const pressed: DriveInput = { throttle: 1, steer: -1, brake: false };
    expect(inputForGear(pressed, shiftTo('reverse'))).toEqual({
      throttle: 0,
      steer: -1,
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

describe('重來：回到自排 D 檔', () => {
  const RESTART = { restarted: true, shift: null, canShift: true } as const;
  const STEER_ONLY: DriveInput = { ...IDLE, steer: 1 };
  const AUTO_REVERSE: Gearbox = { gear: 'reverse', manual: false };

  test('沒有重來、沒有掛檔：檔位不變（同一個物件）', () => {
    const reverse = shiftTo('reverse');
    expect(gearboxForFrame(reverse, { restarted: false, shift: null, canShift: true })).toBe(reverse);
  });

  test.each([
    ['手排 R', shiftTo('reverse')],
    ['手排 D', shiftTo('forward')],
    ['自排 R（倒車中或倒車撞到失敗）', AUTO_REVERSE],
  ])('%s 時重來：當幀就是 INITIAL_GEARBOX', (_name, gearbox) => {
    expect(gearboxForFrame(gearbox, RESTART)).toBe(INITIAL_GEARBOX);
    // 暫停中或上一局已經結束（不能換檔）時重來也一樣。
    expect(gearboxForFrame(gearbox, { ...RESTART, canShift: false })).toBe(INITIAL_GEARBOX);
  });

  test.each([
    ['什麼都不按', IDLE],
    ['只按著轉向', STEER_ONLY],
    ['按著油門', FORWARD],
    ['按著油門與轉向', { ...FORWARD, steer: -1 as const }],
    ['按著腳剎', { ...IDLE, brake: true }],
  ])('手排 R 檔重來後%s：一直是自排 D 檔，車不會往後', (_name, pressed) => {
    let gearbox = gearboxForFrame(shiftTo('reverse'), RESTART);
    let vehicle = AT_REST;
    // 重來的那一幀可能還沒跑物理步（狀態仍是 ready），之後按著鍵開始跑（driving）。
    gearbox = nextGearbox(gearbox, 'ready', vehicle.speedMps, pressed.throttle);
    expect(gearbox).toBe(INITIAL_GEARBOX);
    for (let step = 0; step < 180; step += 1) {
      // 之後的每一幀都沒有再重來、也沒有再按掛檔鍵。
      gearbox = gearboxForFrame(gearbox, { restarted: false, shift: null, canShift: true });
      ({ vehicle, gearbox } = drive({ vehicle, gearbox }, pressed, 1));
      expect(gearbox).toBe(INITIAL_GEARBOX);
      expect(vehicle.speedMps).toBeGreaterThanOrEqual(0);
    }
    expect(vehicle.speedMps > 0).toBe(pressed.throttle === 1);
  });

  test('重來之後又按了掛 R（同一幀或之後）：R 檔手排——這是玩家新下的指令', () => {
    expect(gearboxForFrame(shiftTo('reverse'), { ...RESTART, shift: 'reverse' })).toEqual({
      gear: 'reverse',
      manual: true,
    });
    const restarted = gearboxForFrame(shiftTo('reverse'), RESTART);
    expect(
      gearboxForFrame(restarted, { restarted: false, shift: 'reverse', canShift: true }),
    ).toEqual({ gear: 'reverse', manual: true });
  });

  test('暫停中或這一局已經結束：掛檔鍵不換檔', () => {
    expect(
      gearboxForFrame(INITIAL_GEARBOX, { restarted: false, shift: 'reverse', canShift: false }),
    ).toBe(INITIAL_GEARBOX);
  });

  test('重來後仍按著倒車油門：回到自排，車真的開始倒退時檔位才跟著變成 R（不是上一局留下的手排）', () => {
    const restarted = gearboxForFrame(shiftTo('reverse'), RESTART);
    const later = drive({ vehicle: AT_REST, gearbox: restarted }, BACKWARD, 30);
    expect(later.vehicle.speedMps).toBeLessThan(0);
    expect(later.gearbox).toEqual({ gear: 'reverse', manual: false });
  });
});
