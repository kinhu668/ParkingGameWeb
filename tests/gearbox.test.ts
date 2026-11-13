// 檔位：永遠有一個明確的檔位（開局 D），一個動作在 D↔R 之間切換；油門往目前檔位的方向推，不會變成剎車。
import { describe, expect, test } from 'vitest';
import { FIXED_STEP_SECONDS } from '../src/core/gameConfig';
import { forward } from '../src/core/heading';
import { levelById } from '../src/level/levelCatalog';
import { startSession, stepSession, type Session } from '../src/level/session';
import { stepVehicle, type VehicleState } from '../src/vehicle/bicycleModel';
import {
  INITIAL_GEAR,
  NO_PEDAL_INPUT,
  driveInputForGear,
  gearForFrame,
  toggledGear,
  type Gear,
  type PedalInput,
} from '../src/vehicle/gearbox';

const GAS: PedalInput = { ...NO_PEDAL_INPUT, gas: true };
const BRAKE: PedalInput = { ...NO_PEDAL_INPUT, brake: true };
const AT_REST: VehicleState = { x: 0, z: 0, headingRad: 0, speedMps: 0, steerRad: 0 };

/** 照 main.ts 的順序跑：踏板套上檔位 → 物理步。 */
function drive(vehicle: VehicleState, pedals: PedalInput, gear: Gear, steps: number): VehicleState {
  let state = vehicle;
  for (let step = 0; step < steps; step += 1) {
    state = stepVehicle(state, driveInputForGear(pedals, gear), FIXED_STEP_SECONDS);
  }
  return state;
}

describe('檔位：D↔R 切換', () => {
  test('新的一局是 D 檔', () => {
    expect(INITIAL_GEAR).toBe('forward');
  });

  test('切換：D → R、R → D', () => {
    expect(toggledGear('forward')).toBe('reverse');
    expect(toggledGear('reverse')).toBe('forward');
  });

  test('沒有重來、沒按切換：檔位不變', () => {
    expect(gearForFrame('reverse', { restarted: false, toggles: 0, canShift: true })).toBe('reverse');
    expect(gearForFrame('forward', { restarted: false, toggles: 0, canShift: true })).toBe('forward');
  });

  test('按一下換到另一檔；同一幀按兩下等於沒換、三下等於一下', () => {
    const press = (gear: Gear, toggles: number): Gear =>
      gearForFrame(gear, { restarted: false, toggles, canShift: true });
    expect(press('forward', 1)).toBe('reverse');
    expect(press('reverse', 1)).toBe('forward');
    expect(press('forward', 2)).toBe('forward');
    expect(press('forward', 3)).toBe('reverse');
  });

  test('暫停中或這一局已經結束：切換鍵不換檔', () => {
    expect(gearForFrame('forward', { restarted: false, toggles: 1, canShift: false })).toBe('forward');
    expect(gearForFrame('reverse', { restarted: false, toggles: 1, canShift: false })).toBe('reverse');
  });

  test.each<Gear>(['forward', 'reverse'])('%s 檔時重來：當幀就回到 D 檔', (gear) => {
    expect(gearForFrame(gear, { restarted: true, toggles: 0, canShift: true })).toBe('forward');
    // 暫停中或上一局已經結束（不能換檔）時重來也一樣。
    expect(gearForFrame(gear, { restarted: true, toggles: 0, canShift: false })).toBe('forward');
  });

  test('重來之後又按了切換（同一幀或之後）：R 檔——這是玩家新下的指令', () => {
    expect(gearForFrame('reverse', { restarted: true, toggles: 1, canShift: true })).toBe('reverse');
    const restarted = gearForFrame('reverse', { restarted: true, toggles: 0, canShift: true });
    expect(gearForFrame(restarted, { restarted: false, toggles: 1, canShift: true })).toBe('reverse');
  });
});

describe('踏板套上檔位', () => {
  test('油門往目前檔位的方向推：D 是 +1、R 是 −1；沒踩是 0', () => {
    expect(driveInputForGear(GAS, 'forward')).toEqual({ throttle: 1, steer: 0, brake: false });
    expect(driveInputForGear(GAS, 'reverse')).toEqual({ throttle: -1, steer: 0, brake: false });
    expect(driveInputForGear(NO_PEDAL_INPUT, 'forward').throttle).toBe(0);
    expect(driveInputForGear(NO_PEDAL_INPUT, 'reverse').throttle).toBe(0);
  });

  test('油門絕不會變成剎車：兩個檔位踩油門都不帶 brake', () => {
    for (const gear of ['forward', 'reverse'] as const) {
      const input = driveInputForGear(GAS, gear);
      expect(input.brake).toBe(false);
      expect(input.throttle).not.toBe(0);
    }
  });

  test('剎車與方向盤不受檔位影響；可以同時踩油門與剎車', () => {
    expect(driveInputForGear({ gas: false, steer: -1, brake: true }, 'reverse')).toEqual({
      throttle: 0,
      steer: -1,
      brake: true,
    });
    expect(driveInputForGear({ gas: true, steer: 0.5, brake: true }, 'forward')).toEqual({
      throttle: 1,
      steer: 0.5,
      brake: true,
    });
  });
});

describe('車輛模型：油門依檔位推進', () => {
  test('D 檔按住油門往前走', () => {
    const vehicle = drive(AT_REST, GAS, 'forward', 60);
    expect(vehicle.speedMps).toBeGreaterThan(0.5);
    // 車頭朝 −Z：往前走 z 變小。
    expect(vehicle.z).toBeLessThan(0);
  });

  test('R 檔按住油門往後走，不是停在原地', () => {
    const vehicle = drive(AT_REST, GAS, 'reverse', 60);
    expect(vehicle.speedMps).toBeLessThan(-0.5);
    expect(vehicle.z).toBeGreaterThan(0);
  });

  test('R 檔倒車中踩剎車：煞到剛好停住，不會往前', () => {
    let vehicle = drive(AT_REST, GAS, 'reverse', 60);
    for (let step = 0; step < 300; step += 1) {
      vehicle = drive(vehicle, BRAKE, 'reverse', 1);
      expect(vehicle.speedMps).toBeLessThanOrEqual(0);
    }
    expect(vehicle.speedMps).toBe(0);
  });

  test('行進中換檔：往前開時切到 R 再踩油門，先減速到停、再往後走', () => {
    const cruising = drive(AT_REST, GAS, 'forward', 90);
    expect(cruising.speedMps).toBeGreaterThan(1);
    const slowing = drive(cruising, GAS, 'reverse', 1);
    expect(slowing.speedMps).toBeLessThan(cruising.speedMps);
    expect(drive(cruising, GAS, 'reverse', 240).speedMps).toBeLessThan(0);
  });

  test('重來後仍按著油門：回到 D 檔，車往前，不會往後', () => {
    const gear = gearForFrame('reverse', { restarted: true, toggles: 0, canShift: true });
    let vehicle = AT_REST;
    for (let step = 0; step < 180; step += 1) {
      vehicle = drive(vehicle, GAS, gear, 1);
      expect(vehicle.speedMps).toBeGreaterThanOrEqual(0);
    }
    expect(vehicle.speedMps).toBeGreaterThan(0);
  });
});

/** 一局裡按住同一組踏板跑幾步（照 main.ts：踏板套上檔位 → stepSession）。 */
function runSession(session: Session, pedals: PedalInput, gear: Gear, steps: number): Session {
  let current = session;
  for (let step = 0; step < steps; step += 1) {
    current = stepSession(current, driveInputForGear(pedals, gear));
  }
  return current;
}

/** 車沿自己的車頭方向離起點多遠（m）；往後走是負的。 */
function aheadOfStartM(session: Session): number {
  const start = session.layout.startState;
  const ahead = forward(start.headingRad);
  return (session.vehicle.x - start.x) * ahead.x + (session.vehicle.z - start.z) * ahead.z;
}

describe.each(['w1_l05', 'w1_l06'])('回歸：倒車關 %s 掛 R 檔後油門是倒車，不是剎車', (levelId) => {
  const level = levelById(levelId);
  if (level === undefined) {
    throw new Error(`找不到關卡 ${levelId}`);
  }
  const { layout } = level;

  test('切到 R 檔按住油門：車往後走', () => {
    const gear = gearForFrame(INITIAL_GEAR, { restarted: false, toggles: 1, canShift: true });
    expect(gear).toBe('reverse');
    const session = runSession(startSession(layout), GAS, gear, 45);
    expect(session.status).toBe('driving');
    expect(session.vehicle.speedMps).toBeLessThan(-0.5);
    expect(aheadOfStartM(session)).toBeLessThan(-0.2);
  });

  test('D 檔按住油門：車往前走', () => {
    const session = runSession(startSession(layout), GAS, INITIAL_GEAR, 45);
    expect(session.vehicle.speedMps).toBeGreaterThan(0.5);
    expect(aheadOfStartM(session)).toBeGreaterThan(0.2);
  });

  test('R 檔倒車中踩剎車：停住', () => {
    const reversing = runSession(startSession(layout), GAS, 'reverse', 45);
    const stopped = runSession(reversing, BRAKE, 'reverse', 120);
    expect(stopped.vehicle.speedMps).toBe(0);
    expect(aheadOfStartM(stopped)).toBeLessThan(aheadOfStartM(reversing));
  });
});

describe('倒車關 w1_l05：玩家的開法（切到 R、踩油門、踩剎車）可以停妥', () => {
  test('直線倒進後方的車位', () => {
    const level = levelById('w1_l05');
    if (level === undefined) {
      throw new Error('找不到關卡 w1_l05');
    }
    const { layout } = level;
    const spot = layout.spot;
    let session = startSession(layout);
    // 倒到車身中心接近車位中心就放開油門踩剎車（車頭朝 −Z，車位在 +Z 那一邊）。
    for (let step = 0; step < 60 * 30 && session.status !== 'parked'; step += 1) {
      const remainingM = spot.z - session.vehicle.z;
      const pedals = remainingM > 1.2 ? GAS : BRAKE;
      session = stepSession(session, driveInputForGear(pedals, 'reverse'));
    }
    expect(session.status).toBe('parked');
    expect(session.collisions).toBe(0);
  });
});
