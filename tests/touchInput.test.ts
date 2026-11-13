// 觸控操作的純邏輯：`?touch=`、何時顯示、方向盤角度、觸控 → 駕駛輸入、與鍵盤合併，以及中英文文案。
import { describe, expect, test } from 'vitest';
import { FIXED_STEP_SECONDS } from '../src/core/gameConfig';
import {
  NO_TOUCH_DRIVE,
  WHEEL_MAX_ANGLE_RAD,
  keyboardHintsEnabled,
  mergeDriveInputs,
  steerFromWheelAngle,
  touchDriveInput,
  touchLayerEnabled,
  wheelAngleAfterDrag,
  wheelAngleAfterRelease,
  type WheelPoint,
} from '../src/core/touchInput';
import { parseTouchParam } from '../src/core/urlParams';
import en from '../src/locale/en.json';
import zhTW from '../src/locale/zh-TW.json';
import { stepVehicle, type DriveInput, type VehicleState } from '../src/vehicle/bicycleModel';
import { INITIAL_GEARBOX, inputForGear, shiftTo } from '../src/vehicle/gearbox';

const RADIUS_PX = 70;

/** 方向盤上某個角度（度，0 = 正右方，順時針）的點。 */
function at(degrees: number, radiusPx = RADIUS_PX * 0.8): WheelPoint {
  const rad = (degrees * Math.PI) / 180;
  return { dx: Math.cos(rad) * radiusPx, dy: Math.sin(rad) * radiusPx };
}

describe('?touch= 與何時顯示', () => {
  test('只認 on 與 off，其餘當作沒給', () => {
    expect(parseTouchParam('?touch=on')).toBe('on');
    expect(parseTouchParam('?level=w1_l01&touch=off')).toBe('off');
    for (const search of ['', '?touch', '?touch=', '?touch=ON', '?touch=1', '?touch=yes']) {
      expect(parseTouchParam(search)).toBeUndefined();
    }
  });

  test('沒給參數（或不認得的值）：顯示——桌面用滑鼠、手機用手指都有螢幕操作層', () => {
    expect(touchLayerEnabled(undefined)).toBe(true);
    expect(touchLayerEnabled(parseTouchParam('?touch=maybe'))).toBe(true);
    expect(touchLayerEnabled(parseTouchParam(''))).toBe(true);
  });

  test('off 隱藏、on 顯示', () => {
    expect(touchLayerEnabled('on')).toBe(true);
    expect(touchLayerEnabled('off')).toBe(false);
    expect(touchLayerEnabled(parseTouchParam('?level=w1_l01&touch=off'))).toBe(false);
  });

  test('鍵盤提示（鍵帽、「按 … 繼續」）：主要指標是手指的裝置不顯示，桌面顯示', () => {
    expect(keyboardHintsEnabled(false)).toBe(true);
    expect(keyboardHintsEnabled(true)).toBe(false);
  });
});

describe('虛擬方向盤', () => {
  test('手指順時針繞中心 → 角度為正（向右），逆時針為負', () => {
    expect(wheelAngleAfterDrag(0, at(-90), at(-60), RADIUS_PX)).toBeCloseTo(Math.PI / 6, 6);
    expect(wheelAngleAfterDrag(0, at(-90), at(-120), RADIUS_PX)).toBeCloseTo(-Math.PI / 6, 6);
  });

  test('繞過 ±180° 的接縫不會跳一整圈', () => {
    expect(wheelAngleAfterDrag(0, at(170), at(-170), RADIUS_PX)).toBeCloseTo((20 * Math.PI) / 180, 6);
    expect(wheelAngleAfterDrag(0, at(-170), at(170), RADIUS_PX)).toBeCloseTo((-20 * Math.PI) / 180, 6);
  });

  test('夾在最大角度；打到底後往回拖馬上有反應', () => {
    let angle = 0;
    for (let degrees = 0; degrees < 300; degrees += 20) {
      angle = wheelAngleAfterDrag(angle, at(degrees), at(degrees + 20), RADIUS_PX);
    }
    expect(angle).toBe(WHEEL_MAX_ANGLE_RAD);
    expect(steerFromWheelAngle(angle)).toBe(1);
    const back = wheelAngleAfterDrag(angle, at(300), at(280), RADIUS_PX);
    expect(back).toBeLessThan(WHEEL_MAX_ANGLE_RAD);
  });

  test('太靠近中心的移動不算', () => {
    expect(wheelAngleAfterDrag(0.3, at(0, 2), at(90, 2), RADIUS_PX)).toBe(0.3);
    expect(wheelAngleAfterDrag(0.3, at(0), at(90, 2), RADIUS_PX)).toBe(0.3);
  });

  test('放開後短時間內回正，停在剛好 0，不越過', () => {
    let angle = -WHEEL_MAX_ANGLE_RAD;
    const first = wheelAngleAfterRelease(angle, 1 / 60);
    expect(first).toBeGreaterThan(angle);
    expect(first).toBeLessThan(0);
    for (let frame = 0; frame < 30; frame += 1) {
      angle = wheelAngleAfterRelease(angle, 1 / 60);
      expect(angle).toBeLessThanOrEqual(0);
    }
    // 半秒以內一定回正。
    expect(angle).toBe(0);
    expect(wheelAngleAfterRelease(0, 1)).toBe(0);
    expect(wheelAngleAfterRelease(0.2, 0)).toBe(0.2);
  });

  test('角度 → 轉向輸入：線性，夾在 ±1', () => {
    expect(steerFromWheelAngle(0)).toBe(0);
    expect(steerFromWheelAngle(WHEEL_MAX_ANGLE_RAD / 2)).toBeCloseTo(0.5, 9);
    expect(steerFromWheelAngle(-WHEEL_MAX_ANGLE_RAD * 2)).toBe(-1);
  });
});

describe('觸控 → 駕駛輸入', () => {
  test('什麼都沒碰就是沒有輸入', () => {
    expect(touchDriveInput(NO_TOUCH_DRIVE, INITIAL_GEARBOX)).toEqual({
      throttle: 0,
      steer: 0,
      brake: false,
    });
  });

  test('油門的方向跟著檔位：自排與手排 D 向前，手排 R 向後', () => {
    const gas = { ...NO_TOUCH_DRIVE, gas: true };
    expect(touchDriveInput(gas, INITIAL_GEARBOX).throttle).toBe(1);
    expect(touchDriveInput(gas, shiftTo('forward')).throttle).toBe(1);
    expect(touchDriveInput(gas, shiftTo('reverse')).throttle).toBe(-1);
    // 自排因為鍵盤倒車而顯示 R 檔時，觸控油門仍是向前。
    expect(touchDriveInput(gas, { gear: 'reverse', manual: false }).throttle).toBe(1);
  });

  test('觸控油門套上檔位後仍是油門（不會被當成反向而變成剎車）', () => {
    for (const gearbox of [INITIAL_GEARBOX, shiftTo('forward'), shiftTo('reverse')]) {
      const input = touchDriveInput({ ...NO_TOUCH_DRIVE, gas: true }, gearbox);
      expect(inputForGear(input, gearbox)).toEqual(input);
    }
  });

  test('剎車踏板是腳剎；可以與油門同時踩', () => {
    const both = touchDriveInput({ wheelAngleRad: 0, gas: true, brake: true }, INITIAL_GEARBOX);
    expect(both).toMatchObject({ throttle: 1, brake: true });
  });

  test('手排 R 檔踩油門 → 車真的往後走；踩剎車 → 慢下來', () => {
    const start: VehicleState = { x: 0, z: 0, headingRad: 0, speedMps: 0, steerRad: 0 };
    const gearbox = shiftTo('reverse');
    let vehicle = start;
    const gas = inputForGear(touchDriveInput({ ...NO_TOUCH_DRIVE, gas: true }, gearbox), gearbox);
    for (let step = 0; step < 60; step += 1) {
      vehicle = stepVehicle(vehicle, gas, FIXED_STEP_SECONDS);
    }
    expect(vehicle.speedMps).toBeLessThan(0);
    expect(vehicle.z).toBeGreaterThan(0);
    const reversingSpeed = Math.abs(vehicle.speedMps);
    const brake = inputForGear(touchDriveInput({ ...NO_TOUCH_DRIVE, brake: true }, gearbox), gearbox);
    for (let step = 0; step < 20; step += 1) {
      vehicle = stepVehicle(vehicle, brake, FIXED_STEP_SECONDS);
    }
    expect(Math.abs(vehicle.speedMps)).toBeLessThan(reversingSpeed);
  });
});

describe('鍵盤與觸控合併', () => {
  const NONE: DriveInput = { throttle: 0, steer: 0, brake: false };

  test('只有一邊有輸入就是那一邊；鍵盤的行為不變', () => {
    const keyboard: DriveInput = { throttle: -1, steer: 1, brake: false };
    expect(mergeDriveInputs(keyboard, NONE)).toEqual(keyboard);
    const touch: DriveInput = { throttle: 1, steer: -0.4, brake: true };
    expect(mergeDriveInputs(NONE, touch)).toEqual(touch);
  });

  test('油門以鍵盤為主；轉向相加後夾住；剎車任一邊踩著就算', () => {
    const merged = mergeDriveInputs(
      { throttle: -1, steer: 1 },
      { throttle: 1, steer: 0.5, brake: true },
    );
    expect(merged).toEqual({ throttle: -1, steer: 1, brake: true });
    expect(mergeDriveInputs({ ...NONE, steer: -1 }, { ...NONE, steer: 0.25 }).steer).toBeCloseTo(-0.75, 9);
  });
});

describe('觸控層的文案', () => {
  test('中英文都有：方向盤、油門、剎車、掛檔、暫停、重來', () => {
    expect(zhTW['touch.gas']).toBe('油門');
    expect(zhTW['touch.brake']).toBe('剎車');
    expect(zhTW['touch.pause']).toBe('暫停');
    expect(zhTW['touch.restart']).toBe('重來');
    expect(zhTW['touch.gearDrive']).toBe('掛 D 檔');
    expect(zhTW['touch.gearReverse']).toBe('掛 R 檔');
    expect(en['touch.gas']).toBe('Gas');
    expect(en['touch.brake']).toBe('Brake');
    expect(en['touch.pause']).toBe('Pause');
    expect(en['touch.restart']).toBe('Restart');
    expect(en['touch.gearDrive']).toBe('Shift to D');
    expect(en['touch.gearReverse']).toBe('Shift to R');
    expect(zhTW['touch.wheel']).not.toBe('');
    expect(en['touch.wheel']).not.toBe('');
  });
});
