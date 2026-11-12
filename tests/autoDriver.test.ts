// 腳本駕駛：直線、定曲率弧、倒車、停在指定點，以及路線 JSON 的驗證。全部跑真正的 stepSession。
import { describe, expect, test } from 'vitest';
import { PHYSICS_HZ } from '../src/core/gameConfig';
import { headingDelta } from '../src/core/heading';
import { degToRad, ftToM, mToFt, mphToMps, mpsToMph, radToDeg } from '../src/core/units';
import {
  INITIAL_DRIVER_STATE,
  autoDrive,
  runRoute,
  type Route,
} from '../src/level/autoDriver';
import { levelById } from '../src/level/levelCatalog';
import { RouteFormatError, parseRoute, vehicleOnRouteAt } from '../src/level/levelRoutes';
import { parkingSpotFromFt } from '../src/level/parkingJudge';
import type { SessionLayout } from '../src/level/session';
import type { VehicleState } from '../src/vehicle/bicycleModel';
import { VEHICLE_CONFIG_US } from '../src/vehicle/vehicleConfig';

/** 後軸最小迴轉半徑（ft）：軸距 ÷ tan(最大轉向角) ≈ 12.85。 */
const MIN_RADIUS_FT =
  VEHICLE_CONFIG_US.wheelbaseFt / Math.tan(degToRad(VEHICLE_CONFIG_US.maxSteerDeg));

/** 很遠的車位：這些測試只看車怎麼走，不要它中途停妥。 */
const FAR_SPOT = parkingSpotFromFt({
  centerXFt: 900,
  centerZFt: 900,
  widthFt: 9,
  lengthFt: 18,
  headingDeg: 0,
});

function layoutAt(xFt: number, zFt: number, headingDeg: number): SessionLayout {
  return {
    spot: FAR_SPOT,
    startState: {
      x: ftToM(xFt),
      z: ftToM(zFt),
      headingRad: degToRad(headingDeg),
      speedMps: 0,
      steerRad: 0,
    },
  };
}

function routeOf(raw: unknown): Route {
  return parseRoute({ level: 'test', segments: raw }, 'test.json').route;
}

/** 跑 seconds 秒之後的車。 */
function driveFor(layout: SessionLayout, route: Route, seconds: number, every = 1): VehicleState {
  return runRoute(layout, route, { maxSteps: seconds * PHYSICS_HZ, decisionEverySteps: every }).vehicle;
}

describe('path：跟折線', () => {
  test('直線前進：車身中心停在最後一點（誤差 < 0.15 ft），車頭不偏、車速 0', () => {
    const route = routeOf([{ type: 'path', gear: 'forward', speed_mph: 12, points: [[0, 0], [0, -80]] }]);
    const end = driveFor(layoutAt(0, 0, 0), route, 20);
    expect(mToFt(end.x)).toBeCloseTo(0, 6);
    expect(Math.abs(mToFt(end.z) + 80)).toBeLessThan(0.15);
    expect(end.speedMps).toBe(0);
    expect(end.headingRad).toBe(0);
  });

  test('巡航車速不超過指定值（加上一點容許），而且真的開到接近那個速度', () => {
    const route = routeOf([{ type: 'path', gear: 'forward', speed_mph: 8, points: [[0, 0], [0, -200]] }]);
    let fastestMph = 0;
    for (let seconds = 1; seconds <= 8; seconds += 1) {
      fastestMph = Math.max(fastestMph, mpsToMph(driveFor(layoutAt(0, 0, 0), route, seconds).speedMps));
    }
    expect(fastestMph).toBeGreaterThan(7);
    expect(fastestMph).toBeLessThan(8.6);
  });

  test('直線倒車：車往車尾方向走，中心停在最後一點，車頭方向不變', () => {
    const route = routeOf([{ type: 'path', gear: 'reverse', speed_mph: 5, points: [[0, 0], [0, 40]] }]);
    const end = driveFor(layoutAt(0, 0, 0), route, 20);
    expect(Math.abs(mToFt(end.z) - 40)).toBeLessThan(0.15);
    expect(mToFt(end.x)).toBeCloseTo(0, 6);
    expect(end.headingRad).toBe(0);
    expect(end.speedMps).toBe(0);
  });

  test('起點偏了 3 ft：閉迴路修回線上，停下時橫向誤差 < 0.2 ft、角度 < 1°', () => {
    const route = routeOf([{ type: 'path', gear: 'forward', speed_mph: 8, points: [[0, 0], [0, -90]] }]);
    const end = driveFor(layoutAt(3, 0, 0), route, 25);
    expect(Math.abs(mToFt(end.x))).toBeLessThan(0.2);
    expect(Math.abs(radToDeg(headingDelta(0, end.headingRad)))).toBeLessThan(1);
    expect(Math.abs(mToFt(end.z) + 90)).toBeLessThan(0.2);
  });

  test('倒車時起點偏了 2 ft 也修得回來（倒車的轉向方向沒有弄反）', () => {
    const route = routeOf([{ type: 'path', gear: 'reverse', speed_mph: 4, points: [[0, 0], [0, 60]] }]);
    const end = driveFor(layoutAt(-2, 0, 0), route, 30);
    expect(Math.abs(mToFt(end.x))).toBeLessThan(0.2);
    expect(Math.abs(radToDeg(headingDelta(0, end.headingRad)))).toBeLessThan(1);
    expect(Math.abs(mToFt(end.z) - 60)).toBeLessThan(0.2);
  });

  test('折線轉 90°：先朝北、轉向東，停在終點、車頭朝東', () => {
    const route = routeOf([
      {
        type: 'path',
        gear: 'forward',
        speed_mph: 7,
        points: [[0, 0], [0, -30], [4, -40], [14, -44], [60, -44]],
      },
    ]);
    const end = driveFor(layoutAt(0, 0, 0), route, 30);
    expect(Math.abs(mToFt(end.x) - 60)).toBeLessThan(0.2);
    expect(Math.abs(mToFt(end.z) + 44)).toBeLessThan(0.3);
    expect(Math.abs(radToDeg(headingDelta(degToRad(90), end.headingRad)))).toBeLessThan(1.5);
  });
});

describe('arc：方向盤固定走固定距離', () => {
  const quarterFt = (MIN_RADIUS_FT * Math.PI) / 2;

  test('先在原地把方向盤打到位：打滿之前車不動', () => {
    const route = routeOf([{ type: 'arc', gear: 'forward', steer: 1, distance_ft: quarterFt, speed_mph: 4 }]);
    // 35° ÷ 90°/s ≈ 0.39 s；0.3 s 時還在打方向盤。
    const early = runRoute(layoutAt(0, 0, 0), route, { maxSteps: 18 }).vehicle;
    expect(early.x).toBe(0);
    expect(early.z).toBe(0);
    expect(early.steerRad).toBeGreaterThan(0);
    expect(early.steerRad).toBeLessThan(degToRad(VEHICLE_CONFIG_US.maxSteerDeg));
  });

  test('右打到底前進四分之一圈：車頭轉 90°，後軸走在半徑 12.85 ft 的圓上', () => {
    const route = routeOf([{ type: 'arc', gear: 'forward', steer: 1, distance_ft: quarterFt, speed_mph: 4 }]);
    const end = driveFor(layoutAt(0, 0, 0), route, 15);
    expect(radToDeg(end.headingRad)).toBeCloseTo(90, 0);
    expect(end.speedMps).toBe(0);
    // 起點後軸在 (0, 4.5)，圓心在它右邊 (R, 4.5)；轉 90° 後後軸在 (R, 4.5 − R)，車身中心再往東 4.5。
    expect(mToFt(end.x)).toBeCloseTo(MIN_RADIUS_FT + 4.5, 0);
    expect(mToFt(end.z)).toBeCloseTo(4.5 - MIN_RADIUS_FT, 0);
  });

  test('右打到底倒車四分之一圈：車頭往左轉 90°（倒車入庫的那一把）', () => {
    const route = routeOf([{ type: 'arc', gear: 'reverse', steer: 1, distance_ft: quarterFt, speed_mph: 4 }]);
    const end = driveFor(layoutAt(0, 0, 90), route, 15);
    expect(Math.abs(radToDeg(headingDelta(0, end.headingRad)))).toBeLessThan(0.6);
    // 起點後軸在 (−4.5, 0)，圓心在它右邊（南）(−4.5, R)；結束時後軸在 (−4.5 − R, R)，車頭朝北。
    expect(mToFt(end.x)).toBeCloseTo(-4.5 - MIN_RADIUS_FT, 0);
    expect(mToFt(end.z)).toBeCloseTo(MIN_RADIUS_FT - 4.5, 0);
  });

  test('steer 0 是直線：走滿指定距離', () => {
    const route = routeOf([{ type: 'arc', gear: 'reverse', steer: 0, distance_ft: 20, speed_mph: 4 }]);
    const end = driveFor(layoutAt(0, 0, 0), route, 15);
    expect(Math.abs(mToFt(end.z) - 20)).toBeLessThan(0.15);
    expect(end.x).toBe(0);
  });

  test('兩段反向的弧（平行停車的 S 形）：車頭回到原本的方向，橫移 2R(1 − cos θ)', () => {
    const thetaRad = degToRad(40);
    const arcFt = MIN_RADIUS_FT * thetaRad;
    const route = routeOf([
      { type: 'arc', gear: 'reverse', steer: 1, distance_ft: arcFt, speed_mph: 3 },
      { type: 'arc', gear: 'reverse', steer: -1, distance_ft: arcFt, speed_mph: 3 },
    ]);
    const end = driveFor(layoutAt(0, 0, 90), route, 30);
    expect(Math.abs(radToDeg(headingDelta(degToRad(90), end.headingRad)))).toBeLessThan(0.5);
    expect(mToFt(end.z)).toBeCloseTo(2 * MIN_RADIUS_FT * (1 - Math.cos(thetaRad)), 0);
    expect(mToFt(end.x)).toBeCloseTo(-2 * MIN_RADIUS_FT * Math.sin(thetaRad), 0);
  });
});

describe('autoDrive：一次決策', () => {
  const route = routeOf([
    { type: 'path', gear: 'forward', speed_mph: 6, points: [[0, 0], [0, -20]] },
    { type: 'arc', gear: 'reverse', steer: 0, distance_ft: 5, speed_mph: 3 },
  ]);
  const start = layoutAt(0, 0, 0).startState;

  test('是純函式：同樣的進度與車輛狀態得到同樣的結果，不改傳入的值', () => {
    const first = autoDrive(route, INITIAL_DRIVER_STATE, start);
    const second = autoDrive(route, INITIAL_DRIVER_STATE, start);
    expect(second).toEqual(first);
    expect(INITIAL_DRIVER_STATE).toEqual({ segmentIndex: 0, pathEdge: 0, braking: false, arcStart: null });
    expect(first.input).toEqual({ throttle: 1, steer: 0, handbrake: false });
  });

  test('一段跑完才換下一段；整條跑完之後一直拉著手煞車', () => {
    const done = { ...INITIAL_DRIVER_STATE, segmentIndex: 2 };
    expect(autoDrive(route, done, start)).toEqual({
      input: { throttle: 0, steer: 0, handbrake: true },
      state: done,
    });
    // 倒車那一段：車還在動就不會開始（先拉手煞車等它停）。
    const rolling = { ...start, speedMps: mphToMps(2) };
    const waiting = autoDrive(route, { ...INITIAL_DRIVER_STATE, segmentIndex: 1 }, rolling);
    expect(waiting.input).toEqual({ throttle: 0, steer: 0, handbrake: true });
    expect(waiting.state.arcStart).toBeNull();
  });

  test('同一條路線跑兩次，逐步結果完全相同（?cam 的定格可重現）', () => {
    const once = runRoute(layoutAt(0, 0, 0), route, { maxSteps: 600 });
    const twice = runRoute(layoutAt(0, 0, 0), route, { maxSteps: 600 });
    expect(twice.vehicle).toEqual(once.vehicle);
    expect(mToFt(once.vehicle.z)).toBeCloseTo(-15, 0);
  });

  test('20 Hz 決策（每 3 步一次）也停在同一個地方附近', () => {
    const straight = routeOf([{ type: 'path', gear: 'forward', speed_mph: 12, points: [[0, 0], [0, -80]] }]);
    const end = driveFor(layoutAt(0, 0, 0), straight, 20, 3);
    expect(Math.abs(mToFt(end.z) + 80)).toBeLessThan(0.3);
    expect(end.speedMps).toBe(0);
  });
});

describe('parseRoute：路線 JSON 的驗證', () => {
  const pathSegment = { type: 'path', gear: 'forward', speed_mph: 8, points: [[0, 0], [0, -10]] };
  const bad = (segments: unknown): (() => unknown) => () => parseRoute({ level: 'x', segments }, 'x.json');

  test('英尺、mph 換成公尺、m/s', () => {
    const { levelId, route } = parseRoute({ level: 'w1_l01', segments: [pathSegment] }, 'w1_l01.json');
    expect(levelId).toBe('w1_l01');
    expect(route.segments).toEqual([
      {
        kind: 'path',
        gear: 'forward',
        speedMps: mphToMps(8),
        points: [{ x: 0, z: 0 }, { x: 0, z: ftToM(-10) }],
      },
    ]);
  });

  test('不合格的資料丟 RouteFormatError，訊息有檔名與位置', () => {
    expect(bad([])).toThrow(RouteFormatError);
    expect(bad([{ ...pathSegment, type: 'spline' }])).toThrow(/x\.json: segments\[0\]\.type/);
    expect(bad([{ ...pathSegment, gear: 'drive' }])).toThrow(/segments\[0\]\.gear/);
    expect(bad([{ ...pathSegment, points: [[0, 0]] }])).toThrow(/至少要兩點/);
    expect(bad([{ ...pathSegment, points: [[0, 0], [0, 0]] }])).toThrow(/重合/);
    expect(bad([{ ...pathSegment, points: [[0, 0], [0, 'a']] }])).toThrow(/points\[1\]\[1\]/);
    expect(bad([{ ...pathSegment, speed_mph: 0 }])).toThrow(/speed_mph/);
    expect(bad([{ ...pathSegment, speed_mph: 19 }])).toThrow(/不能超過 18 mph/);
    expect(bad([{ ...pathSegment, gear: 'reverse', speed_mph: 10 }])).toThrow(/不能超過 9 mph/);
    expect(bad([{ type: 'arc', gear: 'reverse', steer: 1.5, distance_ft: 5, speed_mph: 3 }])).toThrow(/steer/);
    expect(bad([{ type: 'arc', gear: 'reverse', steer: 1, distance_ft: 0, speed_mph: 3 }])).toThrow(/distance_ft/);
    expect(bad([{ type: 'arc', gear: 'reverse', steer: 1, distance_ft: 41, speed_mph: 3 }])).toThrow(/半圈/);
    expect(() => parseRoute({ segments: [pathSegment] }, 'x.json')).toThrow(/level/);
    expect(() => parseRoute([], 'x.json')).toThrow(/必須是物件/);
  });
});

describe('vehicleOnRouteAt：?cam 定格用的車輛狀態', () => {
  const level = levelById('w1_l06');
  const prototype = levelById('prototype');
  if (level === undefined || prototype === undefined) {
    throw new Error('找不到關卡');
  }

  test('t = 0 在起點；很大的 t 停在車位裡（車頭與車位同向）', () => {
    expect(vehicleOnRouteAt(level, 0)).toEqual(level.layout.startState);
    const parked = vehicleOnRouteAt(level, 9999);
    expect(mToFt(parked?.x ?? NaN)).toBeCloseTo(level.spotFt.centerXFt, 0);
    expect(mToFt(parked?.z ?? NaN)).toBeCloseTo(level.spotFt.centerZFt, 0);
    expect(parked?.speedMps).toBe(0);
    expect(vehicleOnRouteAt(level, 9999)).toEqual(parked);
  });

  test('中途的 t 在路上：已經離開起點、還沒到車位', () => {
    const midway = vehicleOnRouteAt(level, 4);
    expect(mToFt(midway?.x ?? NaN)).toBeGreaterThan(level.startFt.xFt + 10);
    expect(mToFt(midway?.z ?? NaN)).toBeLessThan(level.spotFt.centerZFt - 10);
  });

  test('負的 t 當 0；沒有參考路線的關卡（原型關）回傳 undefined', () => {
    expect(vehicleOnRouteAt(level, -5)).toEqual(level.layout.startState);
    expect(vehicleOnRouteAt(prototype, 3)).toBeUndefined();
  });
});
