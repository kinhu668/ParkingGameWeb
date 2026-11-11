// 路緣石與車擋：位置、大小，以及「純視覺」的保證（不擋路、不在判定用的車位矩形裡、判定與物理的程式不認得它們）。
import { Box3, Mesh, OrthographicCamera, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { ftToM } from '../src/core/units';
import { DEMO_ROUTE_STEPS, demoVehicleAfterSteps } from '../src/level/demoRoute';
import { parkingSpotFromFt } from '../src/level/parkingJudge';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import {
  GROUND_EDGE_SHADOW_SOFTNESS,
  groundEdgeLight,
  groundEdgeShadows,
} from '../src/props/groundShader';
import {
  createCurbs,
  createWheelStop,
  curbInnerBounds,
  curbSegmentRects,
  edgeShadowBoxes,
  wheelStopFootprint,
} from '../src/props/lotEdges';
import { spotLocalToWorld } from '../src/props/lotLayout';
import { CURB_CONFIG, SUN_CONFIG, WHEEL_STOP_CONFIG } from '../src/render/renderConfig';
import { lotShadowBox } from '../src/render/scene';
import { SUN_DIRECTION } from '../src/render/sky';
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

describe('路緣石與車擋的影子', () => {
  const boxes = edgeShadowBoxes(spot);
  const shadows = groundEdgeShadows(spot, spot.headingRad, SUN_DIRECTION, boxes);
  /** 影子在地面上的方向（背向太陽的水平單位向量）與每公尺高度的影長。 */
  const sunFlatLength = Math.hypot(SUN_DIRECTION.x, SUN_DIRECTION.z);
  const away = { x: -SUN_DIRECTION.x / sunFlatLength, z: -SUN_DIRECTION.z / sunFlatLength };
  const shadowPerHeight = sunFlatLength / SUN_DIRECTION.y;
  /** 車位本地座標的點有多亮（1 = 照得到太陽、0 = 在影子裡）。 */
  const litAt = (localX: number, localZ: number): number => {
    const world = spotLocalToWorld(spot, localX, localZ);
    return groundEdgeLight(shadows, world.x, world.z);
  };

  test('箱子就是路緣石的四段與車擋：範圍與網格一致、高度相同，網格都會投影也收影', () => {
    expect(boxes).toHaveLength(5);
    const curbs = createCurbs(spot);
    curbs.updateMatrixWorld(true);
    const rects = curbSegmentRects(spot);
    const segments = curbs.children.filter((child): child is Mesh => child instanceof Mesh);
    expect(segments).toHaveLength(rects.length);
    segments.forEach((segment, index) => {
      const bounds = new Box3().setFromObject(segment, true);
      const box = boxes[index];
      const low = spotLocalToWorld(spot, box?.minX ?? NaN, box?.minZ ?? NaN);
      const high = spotLocalToWorld(spot, box?.maxX ?? NaN, box?.maxZ ?? NaN);
      // 網格的頂點是單精度浮點數。
      expect(bounds.min.x).toBeCloseTo(Math.min(low.x, high.x), 4);
      expect(bounds.max.x).toBeCloseTo(Math.max(low.x, high.x), 4);
      expect(bounds.min.z).toBeCloseTo(Math.min(low.z, high.z), 4);
      expect(bounds.max.z).toBeCloseTo(Math.max(low.z, high.z), 4);
      expect(bounds.max.y).toBeCloseTo(box?.heightM ?? NaN, 6);
      expect(segment.castShadow).toBe(true);
      expect(segment.receiveShadow).toBe(true);
    });

    const stop = boxes[4];
    const footprint = wheelStopFootprint(spot);
    expect(stop?.heightM).toBe(WHEEL_STOP_CONFIG.heightM);
    expect(stop?.minX).toBe(footprint.minX);
    expect(stop?.maxX).toBe(footprint.maxX);
    // 梯形斷面取平均寬度：比底面窄、比頂面寬。
    const depthM = (stop?.maxZ ?? NaN) - (stop?.minZ ?? NaN);
    expect(depthM).toBeLessThan(WHEEL_STOP_CONFIG.baseDepthM);
    expect(depthM).toBeGreaterThan(WHEEL_STOP_CONFIG.topDepthM);
    const block = createWheelStop(spot).children[0];
    expect(block?.castShadow).toBe(true);
    expect(block?.receiveShadow).toBe(true);
  });

  test('影子沒有破洞：沿著每一段路緣與車擋的背光面，每隔 1 ft 取一點都在影子裡', () => {
    const stepM = ftToM(1);
    // 背光面往影子方向走這麼遠（比最矮的車擋的影長短）。
    const reachM = 0.3;
    let checked = 0;
    for (const box of boxes) {
      const shadowLengthM = box.heightM * shadowPerHeight;
      expect(shadowLengthM).toBeGreaterThan(2 * reachM);
      // 影子朝本地 +X／+Z 還是 −X／−Z，就從那一側的面出發。
      const faceX = shadows.sunRunX < 0 ? box.maxX : box.minX;
      const faceZ = shadows.sunRunZ < 0 ? box.maxZ : box.minZ;
      const stepX = -Math.sign(shadows.sunRunX) * reachM;
      const stepZ = -Math.sign(shadows.sunRunZ) * reachM;
      // 影子是斜的：兩端各讓出一個影長，那裡的影子本來就偏到旁邊去。
      for (let x = box.minX + shadowLengthM; x < box.maxX - shadowLengthM; x += stepM) {
        // 橫向的箱子（前後路緣、車擋）：影子落在背光的長邊外側。
        if (box.maxX - box.minX > box.maxZ - box.minZ) {
          expect(litAt(x, faceZ + stepZ), `x=${x}`).toBeLessThan(0.02);
          checked += 1;
        }
      }
      for (let z = box.minZ + shadowLengthM; z < box.maxZ - shadowLengthM; z += stepM) {
        if (box.maxZ - box.minZ > box.maxX - box.minX) {
          expect(litAt(faceX + stepX, z), `z=${z}`).toBeLessThan(0.02);
          checked += 1;
        }
      }
    }
    // 四段路緣加起來超過 600 ft，再加上車擋。
    expect(checked).toBeGreaterThan(600);
  });

  test('影子只有影長那麼遠，邊緣是柔的；向陽的一側與場地中央照得到太陽', () => {
    // 前方路緣（箱子 0）的中段：影子落向場地內（+Z）。
    const curb = boxes[0];
    if (curb === undefined) {
      throw new Error('沒有前方路緣');
    }
    expect(shadows.sunRunZ).toBeLessThan(0);
    const x = (curb.minX + curb.maxX) / 4;
    const lengthAlongZ = curb.heightM * shadowPerHeight * away.z;
    expect(litAt(x, curb.maxZ + 0.5 * lengthAlongZ)).toBeLessThan(0.02);
    expect(litAt(x, curb.maxZ + 1.05 * lengthAlongZ)).toBe(1);
    // 影子尖端：由暗漸亮，不是一刀切。
    const tip = litAt(x, curb.maxZ + (1 - GROUND_EDGE_SHADOW_SOFTNESS / 2) * lengthAlongZ);
    expect(tip).toBeGreaterThan(0.05);
    expect(tip).toBeLessThan(0.95);
    // 路緣向陽的一側（場地外）、場地中央、起點、車位中心都照得到。
    expect(litAt(x, curb.minZ - 0.2)).toBe(1);
    expect(litAt(0, 0)).toBe(1);
    expect(groundEdgeLight(shadows, startState.x, startState.z)).toBe(1);
    expect(litAt(0, CURB_CONFIG.behindSpotM / 2)).toBe(1);
  });

  test('跟著車位轉：車位轉 90° 後，同一個本地位置的影子換成太陽在本地座標的新方向', () => {
    const turned = parkingSpotFromFt({
      centerXFt: 40,
      centerZFt: -25,
      widthFt: 9,
      lengthFt: 18,
      headingDeg: 90,
    });
    const turnedShadows = groundEdgeShadows(
      turned,
      turned.headingRad,
      SUN_DIRECTION,
      edgeShadowBoxes(turned),
    );
    // 世界座標的影子方向不變：每一段路緣背向太陽那一側 0.3 m 處仍在影子裡。
    const inner = curbInnerBounds(turned);
    const frontCurbMid = spotLocalToWorld(turned, 0, inner.minZ - CURB_CONFIG.widthM / 2);
    const shadowed = groundEdgeLight(
      turnedShadows,
      frontCurbMid.x + away.x * (CURB_CONFIG.widthM / 2 + 0.3),
      frontCurbMid.z + away.z * (CURB_CONFIG.widthM / 2 + 0.3),
    );
    expect(shadowed).toBeLessThan(0.02);
    const sunny = groundEdgeLight(
      turnedShadows,
      frontCurbMid.x - away.x * (CURB_CONFIG.widthM / 2 + 0.3),
      frontCurbMid.z - away.z * (CURB_CONFIG.widthM / 2 + 0.3),
    );
    expect(sunny).toBe(1);
  });

  test('陰影貼圖的固定範圍蓋住每一段路緣與車擋（連同頂面），標線與車身上的影子不會缺一塊', () => {
    const box = lotShadowBox(spot);
    const camera = new OrthographicCamera(box.left, box.right, box.top, box.bottom, box.near, box.far);
    camera.position
      .set(box.targetX, 0, box.targetZ)
      .add(new Vector3(SUN_DIRECTION.x, SUN_DIRECTION.y, SUN_DIRECTION.z).setLength(SUN_CONFIG.distanceM));
    camera.lookAt(box.targetX, 0, box.targetZ);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    for (const edge of boxes) {
      for (const x of [edge.minX, edge.maxX]) {
        for (const z of [edge.minZ, edge.maxZ]) {
          for (const y of [0, edge.heightM]) {
            const world = spotLocalToWorld(spot, x, z);
            const projected = new Vector3(world.x, y, world.z).project(camera);
            expect(Math.abs(projected.x)).toBeLessThan(1);
            expect(Math.abs(projected.y)).toBeLessThan(1);
            expect(Math.abs(projected.z)).toBeLessThan(1);
          }
        }
      }
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
