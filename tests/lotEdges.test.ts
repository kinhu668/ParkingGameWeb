// 路緣石與車擋：位置、大小，以及「純視覺」的保證（不擋路、不在判定用的車位矩形裡、判定與物理的程式不認得它們）。
import { Box3, Mesh, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { ftToM } from '../src/core/units';
import { DEMO_ROUTE_STEPS, demoVehicleAfterSteps } from '../src/level/demoRoute';
import { parkingSpotFromFt } from '../src/level/parkingJudge';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import {
  createCurbs,
  createWheelStop,
  curbInnerBounds,
  wheelStopFootprint,
} from '../src/props/lotEdges';
import { CURB_CONFIG, WHEEL_STOP_CONFIG } from '../src/render/renderConfig';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';

const LOGIC_SOURCES: Record<string, string> = import.meta.glob(
  ['../src/level/**/*.ts', '../src/vehicle/bicycleModel.ts', '../src/core/**/*.ts'],
  { query: '?raw', import: 'default', eager: true },
);

const { spot, startState } = PROTOTYPE_LAYOUT;
/** 車身中心到車角的距離：車不管朝哪個方向，車身都在中心周圍這個半徑內。 */
const CAR_REACH_M = Math.hypot(VEHICLE_CONFIG_SI.lengthM, VEHICLE_CONFIG_SI.widthM) / 2;

/** 物件在世界座標的外框。 */
function worldBounds(object: ReturnType<typeof createCurbs>): Box3 {
  object.updateMatrixWorld(true);
  return new Box3().setFromObject(object, true);
}

describe('車擋 wheelStop', () => {
  test('整個在車位前緣之外：判定用的車位矩形裡沒有它，車停到最前面也不會插進去', () => {
    const footprint = wheelStopFootprint(spot);
    const spotFrontZ = -spot.lengthM / 2;
    expect(footprint.maxZ).toBeLessThan(spotFrontZ);
    expect(spotFrontZ - footprint.maxZ).toBeCloseTo(WHEEL_STOP_CONFIG.gapFromSpotM, 9);
    expect(WHEEL_STOP_CONFIG.gapFromSpotM).toBeGreaterThan(0);
  });

  test('橫跨車位中線、比車位窄，緊貼在車位前方（還在路緣石以內）', () => {
    const footprint = wheelStopFootprint(spot);
    expect(footprint.minX).toBeCloseTo(-footprint.maxX, 9);
    expect(footprint.maxX - footprint.minX).toBeLessThan(spot.widthM);
    expect(footprint.minZ).toBeGreaterThan(curbInnerBounds(spot).minZ);
    expect(-spot.lengthM / 2 - footprint.maxZ).toBeLessThan(ftToM(1));
  });

  test('網格的外框就是底面範圍，高度低於車身底部以外的東西（矮矮一條）', () => {
    const origin = parkingSpotFromFt({
      centerXFt: 0,
      centerZFt: 0,
      widthFt: 9,
      lengthFt: 18,
      headingDeg: 0,
    });
    const bounds = worldBounds(createWheelStop(origin));
    const footprint = wheelStopFootprint(origin);
    expect(bounds.min.x).toBeCloseTo(footprint.minX, 6);
    expect(bounds.max.x).toBeCloseTo(footprint.maxX, 6);
    expect(bounds.min.z).toBeCloseTo(footprint.minZ, 6);
    expect(bounds.max.z).toBeCloseTo(footprint.maxZ, 6);
    expect(bounds.min.y).toBeCloseTo(0, 6);
    expect(bounds.max.y).toBeCloseTo(WHEEL_STOP_CONFIG.heightM, 6);
    expect(WHEEL_STOP_CONFIG.heightM).toBeLessThan(ftToM(0.6));
  });

  test('跟著車位的位置與方向：heading 90° 時在車位東側（+X）', () => {
    const turned = parkingSpotFromFt({
      centerXFt: 40,
      centerZFt: -25,
      widthFt: 9,
      lengthFt: 18,
      headingDeg: 90,
    });
    const bounds = worldBounds(createWheelStop(turned));
    expect(bounds.min.x).toBeGreaterThan(ftToM(40 + 9));
    expect(bounds.getCenter(new Vector3()).z).toBeCloseTo(ftToM(-25), 6);
    expect(bounds.max.z - bounds.min.z).toBeCloseTo(WHEEL_STOP_CONFIG.lengthM, 6);
  });
});

describe('路緣石 curbs', () => {
  test('圍住車位、起點與整條示範路線，車身碰不到路緣', () => {
    // 原型場景的車位朝北（heading 0）：車位本地座標 = 世界座標 − 車位中心。
    expect(spot.headingRad).toBe(0);
    const inner = curbInnerBounds(spot);
    const inside = (x: number, z: number, marginM: number): boolean =>
      x - spot.x - marginM > inner.minX &&
      x - spot.x + marginM < inner.maxX &&
      z - spot.z - marginM > inner.minZ &&
      z - spot.z + marginM < inner.maxZ;

    expect(inside(startState.x, startState.z, CAR_REACH_M)).toBe(true);
    // 車位的四個角都在場地內。
    expect(inside(spot.x - spot.widthM / 2, spot.z - spot.lengthM / 2, 0)).toBe(true);
    expect(inside(spot.x + spot.widthM / 2, spot.z + spot.lengthM / 2, 0)).toBe(true);

    for (let step = 0; step <= DEMO_ROUTE_STEPS; step += 10) {
      const vehicle = demoVehicleAfterSteps(startState, step);
      expect(inside(vehicle.x, vehicle.z, CAR_REACH_M), `第 ${step} 步`).toBe(true);
    }
  });

  test('起點到車位的直線路徑上沒有任何一段路緣', () => {
    const curbs = createCurbs(spot);
    curbs.updateMatrixWorld(true);
    const corridor = new Box3(
      new Vector3(
        Math.min(startState.x, spot.x) - spot.widthM,
        0,
        Math.min(startState.z, spot.z - spot.lengthM / 2),
      ),
      new Vector3(
        Math.max(startState.x, spot.x) + spot.widthM,
        VEHICLE_CONFIG_SI.heightM,
        Math.max(startState.z, spot.z) + VEHICLE_CONFIG_SI.lengthM,
      ),
    );
    const segments = curbs.children.filter((child): child is Mesh => child instanceof Mesh);
    expect(segments).toHaveLength(4);
    for (const segment of segments) {
      expect(new Box3().setFromObject(segment, true).intersectsBox(corridor)).toBe(false);
    }
  });

  test('一圈低矮的水泥條：外框 = 內緣往外一個路緣寬，高 6 英吋，會投影', () => {
    const origin = parkingSpotFromFt({
      centerXFt: 0,
      centerZFt: 0,
      widthFt: 9,
      lengthFt: 18,
      headingDeg: 0,
    });
    const curbs = createCurbs(origin);
    const bounds = worldBounds(curbs);
    const inner = curbInnerBounds(origin);
    expect(bounds.min.x).toBeCloseTo(inner.minX - CURB_CONFIG.widthM, 6);
    expect(bounds.max.x).toBeCloseTo(inner.maxX + CURB_CONFIG.widthM, 6);
    expect(bounds.min.z).toBeCloseTo(inner.minZ - CURB_CONFIG.widthM, 6);
    expect(bounds.max.z).toBeCloseTo(inner.maxZ + CURB_CONFIG.widthM, 6);
    expect(bounds.min.y).toBeCloseTo(0, 6);
    expect(bounds.max.y).toBeCloseTo(ftToM(0.5), 6);
    for (const child of curbs.children) {
      expect(child.castShadow).toBe(true);
    }
  });
});

describe('路緣石與車擋是純視覺', () => {
  test('判定、物理、輸入的程式都不認得它們', () => {
    const entries = Object.entries(LOGIC_SOURCES);
    expect(entries.length).toBeGreaterThan(5);
    for (const [path, source] of entries) {
      expect(source, path).not.toMatch(/lotEdges|CURB_CONFIG|WHEEL_STOP_CONFIG/);
    }
  });
});
