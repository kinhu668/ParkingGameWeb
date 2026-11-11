// 場景擺設：佈局（數量跟著畫質級別、通路淨空、同種子可重現）、網格（全部 InstancedMesh、真光源數、光錐不進環境光遮蔽）、
// 場地的固定陰影範圍，以及「純視覺」的保證（判定與物理的程式不認得它們）。不開 WebGL。
import { InstancedMesh, Mesh, OrthographicCamera, SpotLight, Vector3, type Object3D } from 'three';
import { describe, expect, test } from 'vitest';
import { DEFAULT_SEED } from '../src/core/gameConfig';
import { ftToM } from '../src/core/units';
import { DEMO_ROUTE_STEPS, demoVehicleAfterSteps } from '../src/level/demoRoute';
import { parkingSpotFromFt } from '../src/level/parkingJudge';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import { curbInnerBounds } from '../src/props/lotEdges';
import {
  FLAT_PROP_CATEGORIES,
  PROP_CATEGORIES,
  countProps,
  createLotLayout,
  lotKeepOutZones,
  placementFootprint,
  placementInKeepOut,
  pointInKeepOut,
  spotLocalToWorld,
  worldToSpotLocal,
  type LotLayout,
  type PropCategory,
} from '../src/props/lotLayout';
import { createLotProps, lampHeadPosition } from '../src/props/lotProps';
import { PARKED_CAR_BODY_PARTS, createParkedCars, parkedCarPlates } from '../src/props/parkedCars';
import { SKIP_AMBIENT_OCCLUSION } from '../src/render/ambientOcclusionFlag';
import { QUALITY_LEVELS, usesHdrChain, type QualityLevel } from '../src/render/quality';
import {
  FIXED_CAMERA_CONFIG,
  LOT_PROPS_CONFIG,
  QUALITY_PRESETS,
  SUN_CONFIG,
} from '../src/render/renderConfig';
import { lotShadowBox, shadowNormalBias } from '../src/render/scene';
import { fitShadowBox } from '../src/render/shadowArea';
import { SUN_DIRECTION } from '../src/render/sky';
import {
  createBodyGeometries,
  createPlateTextGeometry,
  plateText,
} from '../src/vehicle/carFittings';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';

const LOGIC_SOURCES: Record<string, string> = import.meta.glob(
  ['../src/level/**/*.ts', '../src/vehicle/bicycleModel.ts', '../src/core/**/*.ts'],
  { query: '?raw', import: 'default', eager: true },
);

const { spot, startState } = PROTOTYPE_LAYOUT;
const CAR_HALF_WIDTH_M = VEHICLE_CONFIG_SI.widthM / 2;
const CAR_HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;
/** 車身中心到車角的距離。 */
const CAR_REACH_M = Math.hypot(VEHICLE_CONFIG_SI.lengthM, VEHICLE_CONFIG_SI.widthM) / 2;

function layoutFor(level: QualityLevel, seed = DEFAULT_SEED): LotLayout {
  return createLotLayout(spot, startState, seed, QUALITY_PRESETS[level].props);
}

function propsGroupFor(level: QualityLevel): Object3D {
  const quality = QUALITY_PRESETS[level];
  return createLotProps(spot, layoutFor(level), quality.props, usesHdrChain(quality));
}

function meshesOf(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh) {
      meshes.push(object);
    }
  });
  return meshes;
}

function spotLightsOf(root: Object3D): SpotLight[] {
  const lights: SpotLight[] = [];
  root.traverse((object) => {
    if (object instanceof SpotLight) {
      lights.push(object);
    }
  });
  return lights;
}

const LAYOUTS = Object.fromEntries(
  QUALITY_LEVELS.map((level) => [level, layoutFor(level)]),
) as Record<QualityLevel, LotLayout>;

describe('擺設數量跟著畫質級別', () => {
  test('總數 low < medium < high ≤ ultra，而且差得夠多', () => {
    const totals = QUALITY_LEVELS.map((level) => countProps(LAYOUTS[level]));
    const [low, medium, high, ultra] = totals;
    expect(low).toBeGreaterThan(60);
    expect(medium).toBeGreaterThan((low ?? 0) * 1.3);
    expect(high).toBeGreaterThan((medium ?? 0) * 1.2);
    expect(ultra).toBeGreaterThanOrEqual(high ?? 0);
  });

  test.each(['parkedCars', 'lamps', 'buildings', 'trees', 'bushes', 'fencePosts'] as const)(
    '%s：low < medium ≤ high ≤ ultra',
    (category) => {
      const [low, medium, high, ultra] = QUALITY_LEVELS.map(
        (level) => LAYOUTS[level][category].length,
      );
      expect(low).toBeGreaterThan(0);
      expect(medium).toBeGreaterThan(low ?? 0);
      expect(high).toBeGreaterThanOrEqual(medium ?? 0);
      expect(ultra).toBeGreaterThanOrEqual(high ?? 0);
    },
  );

  test('背景車、路燈、樹、建築的數量就是設定值（候選夠多，沒有被禁區濾到不夠）', () => {
    for (const level of QUALITY_LEVELS) {
      const { props } = QUALITY_PRESETS[level];
      const layout = LAYOUTS[level];
      expect(layout.parkedCars, level).toHaveLength(props.parkedCars);
      expect(layout.lamps, level).toHaveLength(props.lampHeads);
      expect(layout.trees, level).toHaveLength(props.trees);
      expect(layout.buildings, level).toHaveLength(props.buildings);
      expect(layout.bushes, level).toHaveLength(props.bushes);
      expect(layout.pillars, level).toHaveLength(props.pillars);
    }
  });

  test('每一類在最高級別都有東西；小細節在最低級別也有', () => {
    for (const category of PROP_CATEGORIES) {
      expect(LAYOUTS.ultra[category].length, category).toBeGreaterThan(0);
    }
    for (const category of ['wheelStops', 'bins', 'trafficCones', 'signs', 'drains'] as const) {
      expect(LAYOUTS.low[category].length, category).toBeGreaterThan(0);
      expect(LAYOUTS.ultra[category].length, category).toBeGreaterThan(
        LAYOUTS.low[category].length,
      );
    }
  });

  test('真光源：low、medium 沒有，high、ultra 只有少數幾盞（不是每盞燈都是真光源），而且不投影', () => {
    const counts = QUALITY_LEVELS.map((level) => spotLightsOf(propsGroupFor(level)).length);
    expect(counts).toEqual(QUALITY_LEVELS.map((level) => QUALITY_PRESETS[level].props.realLights));
    const [low, medium, high, ultra] = counts;
    expect(low).toBe(0);
    expect(medium).toBe(0);
    expect(high).toBeGreaterThan(0);
    expect(ultra).toBeGreaterThanOrEqual(high ?? 0);
    for (const level of ['high', 'ultra'] as const) {
      const lights = spotLightsOf(propsGroupFor(level));
      expect(lights.length).toBeLessThan(LAYOUTS[level].lamps.length / 2);
      expect(lights.length).toBeLessThanOrEqual(6);
      for (const light of lights) {
        expect(light.castShadow).toBe(false);
      }
    }
  });

  test('低級別的擺設是高級別的子集（候選依重要性排序，級別只決定取幾個）', () => {
    for (const category of ['parkedCars', 'lamps', 'trees', 'buildings', 'bushes'] as const) {
      const ultra = LAYOUTS.ultra[category];
      for (const placement of LAYOUTS.low[category]) {
        expect(ultra, category).toContainEqual(placement);
      }
    }
  });
});

describe('通路淨空', () => {
  /** 通路：中線左右各「半個車寬 + 5 ft」，從起點後方一個車身到車位前緣之外（世界座標，車位朝北）。 */
  const CLEAR_HALF_WIDTH_M = CAR_HALF_WIDTH_M + ftToM(5);
  const inCorridor = (x: number, z: number): boolean =>
    Math.abs(x - spot.x) <= CLEAR_HALF_WIDTH_M &&
    z >= spot.z - spot.lengthM / 2 - ftToM(1) &&
    z <= startState.z + CAR_HALF_LENGTH_M + ftToM(5);

  test('原型場景：車位朝北、起點在車位正後方（這裡的世界座標檢查才成立）', () => {
    expect(spot.headingRad).toBe(0);
    expect(startState.x).toBe(spot.x);
    expect(startState.z).toBeGreaterThan(spot.z);
    expect(CLEAR_HALF_WIDTH_M).toBeGreaterThan(VEHICLE_CONFIG_SI.widthM);
    expect(LOT_PROPS_CONFIG.corridorHalfWidthM).toBeGreaterThanOrEqual(CLEAR_HALF_WIDTH_M);
  });

  test.each(QUALITY_LEVELS)('%s：沒有任何擺設的中心或佔地落在起點→車位的通路與車位矩形裡', (level) => {
    const layout = LAYOUTS[level];
    for (const category of PROP_CATEGORIES) {
      for (const placement of layout[category]) {
        const points = [placement, ...placementFootprint(placement)].map((point) =>
          spotLocalToWorld(spot, point.x, point.z),
        );
        for (const point of points) {
          expect(inCorridor(point.x, point.z), `${category} @ ${point.x}, ${point.z}`).toBe(false);
          // 目標車位矩形（通路已經涵蓋，這裡再明確檢查一次）。
          const inSpot =
            Math.abs(point.x - spot.x) <= spot.widthM / 2 &&
            Math.abs(point.z - spot.z) <= spot.lengthM / 2;
          expect(inSpot, `${category} 在車位裡`).toBe(false);
        }
      }
    }
  });

  test.each(QUALITY_LEVELS)('%s：佈局自己的禁區檢查也全部通過（含 spot_low 鏡頭前方）', (level) => {
    const zones = lotKeepOutZones(spot, startState);
    for (const category of PROP_CATEGORIES) {
      for (const placement of LAYOUTS[level][category]) {
        expect(placementInKeepOut(zones, placement), category).toBe(false);
      }
    }
  });

  test('禁區涵蓋：起點、車位中心與四角、兩者之間的中線、車擋、spot_low 鏡頭正前方', () => {
    const zones = lotKeepOutZones(spot, startState);
    const start = worldToSpotLocal(spot, startState.x, startState.z);
    expect(pointInKeepOut(zones, start.x, start.z)).toBe(true);
    expect(pointInKeepOut(zones, 0, 0)).toBe(true);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        expect(pointInKeepOut(zones, (sx * spot.widthM) / 2, (sz * spot.lengthM) / 2)).toBe(true);
      }
      // 中線左右一個車寬都在禁區裡；兩個車位寬之外就不是了。
      expect(pointInKeepOut(zones, sx * VEHICLE_CONFIG_SI.widthM, start.z / 2)).toBe(true);
      expect(pointInKeepOut(zones, sx * 2 * spot.widthM, start.z / 2)).toBe(false);
    }
    for (let t = 0; t <= 1; t += 0.05) {
      expect(pointInKeepOut(zones, start.x * t, start.z * t)).toBe(true);
    }
    expect(pointInKeepOut(zones, 0, -spot.lengthM / 2 - ftToM(0.6))).toBe(true);
    // 鏡頭位置朝車位中心走 3 ft。
    const cameraX = FIXED_CAMERA_CONFIG.spotLowLateralM;
    const cameraZ = -FIXED_CAMERA_CONFIG.spotLowAheadM;
    const toSpot = ftToM(3) / Math.hypot(cameraX, cameraZ);
    expect(pointInKeepOut(zones, cameraX * (1 - toSpot), cameraZ * (1 - toSpot))).toBe(true);
  });

  test('示範路線（?cam、?bench）上車身掃過的範圍裡沒有立著的擺設', () => {
    const standing = PROP_CATEGORIES.filter((category) => !FLAT_PROP_CATEGORIES.includes(category));
    const obstacles = standing.flatMap((category) =>
      LAYOUTS.ultra[category].flatMap((placement) =>
        placementFootprint(placement).map((point) => ({
          category,
          ...spotLocalToWorld(spot, point.x, point.z),
        })),
      ),
    );
    expect(obstacles.length).toBeGreaterThan(500);
    for (let step = 0; step <= DEMO_ROUTE_STEPS; step += 5) {
      const vehicle = demoVehicleAfterSteps(startState, step);
      for (const obstacle of obstacles) {
        const distanceM = Math.hypot(obstacle.x - vehicle.x, obstacle.z - vehicle.z);
        if (distanceM <= CAR_REACH_M) {
          expect.fail(`第 ${step} 步車身碰到 ${obstacle.category}`);
        }
      }
    }
  });

  test('背景車：不在目標車位、不緊鄰目標車位、彼此不重疊、都在路緣以內', () => {
    const inner = curbInnerBounds(spot);
    const cars = LAYOUTS.ultra.parkedCars;
    expect(cars.length).toBeGreaterThanOrEqual(20);
    cars.forEach((car, index) => {
      expect(Math.hypot(car.x, car.z)).toBeGreaterThan(spot.widthM * 1.5);
      for (const point of placementFootprint(car)) {
        expect(point.x).toBeGreaterThan(inner.minX);
        expect(point.x).toBeLessThan(inner.maxX);
        expect(point.z).toBeGreaterThan(inner.minZ);
        expect(point.z).toBeLessThan(inner.maxZ);
      }
      for (const other of cars.slice(index + 1)) {
        expect(Math.hypot(car.x - other.x, car.z - other.z)).toBeGreaterThan(
          VEHICLE_CONFIG_SI.widthM,
        );
      }
    });
    // 有停在目標車位那一列兩旁的，也有停在後方的。
    expect(cars.some((car) => Math.abs(car.z) < spot.lengthM / 2 && car.x < 0)).toBe(true);
    expect(cars.some((car) => Math.abs(car.z) < spot.lengthM / 2 && car.x > 0)).toBe(true);
    expect(cars.some((car) => car.z > spot.lengthM)).toBe(true);
  });

  test('建築、樹、圍欄在路緣之外；建築不擋在太陽與場地之間', () => {
    const inner = curbInnerBounds(spot);
    const outside = (x: number, z: number): boolean =>
      x < inner.minX || x > inner.maxX || z < inner.minZ || z > inner.maxZ;
    for (const category of ['buildings', 'trees', 'fencePosts', 'fenceRails'] as const) {
      for (const placement of LAYOUTS.ultra[category]) {
        expect(outside(placement.x, placement.z), category).toBe(true);
      }
    }
    // 太陽方位上（從車位看過去）沒有高過太陽仰角的建築。
    const sunBearingRad = (SUN_CONFIG.azimuthDeg * Math.PI) / 180;
    const sunElevationRad = (SUN_CONFIG.elevationDeg * Math.PI) / 180;
    for (const building of LAYOUTS.ultra.buildings) {
      for (const point of placementFootprint(building)) {
        const bearingRad = Math.atan2(point.x, -point.z);
        if (Math.abs(bearingRad - sunBearingRad) < (5 * Math.PI) / 180) {
          const topElevationRad = Math.atan2(building.sizeY, Math.hypot(point.x, point.z));
          expect(topElevationRad).toBeLessThan(sunElevationRad);
        }
      }
    }
  });
});

describe('固定種子', () => {
  test('同種子、同設定的佈局完全相同', () => {
    for (const level of QUALITY_LEVELS) {
      expect(layoutFor(level)).toEqual(LAYOUTS[level]);
    }
    expect(layoutFor('high', 12345)).toEqual(layoutFor('high', 12345));
  });

  test('換種子：背景車、樹、窗戶跟著變；圍欄與標線這種規則的東西不變', () => {
    const other = layoutFor('high', DEFAULT_SEED + 1);
    expect(other.parkedCars).not.toEqual(LAYOUTS.high.parkedCars);
    expect(other.trees).not.toEqual(LAYOUTS.high.trees);
    expect(other.windows).not.toEqual(LAYOUTS.high.windows);
    expect(other.fencePosts).toEqual(LAYOUTS.high.fencePosts);
    expect(other.stallLines).toEqual(LAYOUTS.high.stallLines);
    expect(countProps(other)).toBeGreaterThan(0);
  });

  test('車位換位置、換方向：本地座標的佈局不變（跟著車位走）', () => {
    const moved = parkingSpotFromFt({
      centerXFt: 40,
      centerZFt: -25,
      widthFt: 9,
      lengthFt: 18,
      headingDeg: 90,
    });
    const start = spotLocalToWorld(moved, 0, ftToM(60));
    const layout = createLotLayout(moved, start, DEFAULT_SEED, QUALITY_PRESETS.medium.props);
    expect(layout.parkedCars.length).toBe(LAYOUTS.medium.parkedCars.length);
    layout.parkedCars.forEach((car, index) => {
      const reference = LAYOUTS.medium.parkedCars[index];
      expect(car.x).toBeCloseTo(reference?.x ?? NaN, 6);
      expect(car.z).toBeCloseTo(reference?.z ?? NaN, 6);
    });
    const back = worldToSpotLocal(moved, start.x, start.z);
    expect(back.x).toBeCloseTo(0, 9);
    expect(back.z).toBeCloseTo(ftToM(60), 9);
  });
});

describe('擺設的網格', () => {
  test.each(QUALITY_LEVELS)('%s：全部是 InstancedMesh，實例數與佈局一致', (level) => {
    const layout = LAYOUTS[level];
    const meshes = meshesOf(propsGroupFor(level));
    expect(meshes.length).toBeGreaterThan(10);
    const counts = new Map<string, number>();
    for (const mesh of meshes) {
      // 唯一的例外：背景車的車牌號碼每台不同，全部併成一個普通的網格。
      if (mesh.name !== 'parkedCars:plateText') {
        expect(mesh, mesh.name).toBeInstanceOf(InstancedMesh);
      }
      expect(mesh.name).not.toBe('');
      counts.set(mesh.name, mesh instanceof InstancedMesh ? mesh.count : 0);
    }
    expect(counts.get('parkedCars:paint')).toBe(layout.parkedCars.length);
    expect(counts.get('parkedCars:tire')).toBe(layout.parkedCars.length * 4);
    expect(counts.get('lampPosts')).toBe(layout.lamps.length);
    expect(counts.get('lampLenses')).toBe(layout.lamps.length);
    expect(counts.get('concrete')).toBe(layout.pillars.length + layout.beams.length);
    expect(counts.get('buildings')).toBe(layout.buildings.length);
    expect(counts.get('buildingWindows')).toBe(layout.windows.length);
    expect(counts.get('fence')).toBe(layout.fencePosts.length + layout.fenceRails.length);
    expect(counts.get('treeTrunks')).toBe(layout.trees.length);
    expect(counts.get('foliage')).toBe(layout.trees.length * 2 + layout.bushes.length);
    expect(counts.get('stallLines')).toBe(layout.stallLines.length);
    expect(counts.get('wheelStops')).toBe(layout.wheelStops.length);
    expect(counts.get('trafficCones')).toBe(layout.trafficCones.length);
    // 一類一個 draw call：網格數不隨實例數成長（背景車的車牌號碼全部併成一個網格，只佔其中一個）。
    expect(meshes.length).toBeLessThanOrEqual(27);
    expect(meshes.filter((mesh) => !(mesh instanceof InstancedMesh)).length).toBeLessThanOrEqual(1);
  });

  test('光錐只在 medium 以上；光錐與光暈是加色、不寫深度、不進環境光遮蔽', () => {
    const named = (level: QualityLevel, name: string): Mesh | undefined =>
      meshesOf(propsGroupFor(level)).find((mesh) => mesh.name === name);
    expect(named('low', 'lampCones')).toBeUndefined();
    for (const level of ['medium', 'high', 'ultra'] as const) {
      const cones = named(level, 'lampCones');
      expect(cones).toBeInstanceOf(InstancedMesh);
      expect(cones instanceof InstancedMesh ? cones.count : 0).toBe(LAYOUTS[level].lamps.length);
    }
    for (const level of QUALITY_LEVELS) {
      for (const name of ['lampCones', 'lampPools']) {
        const mesh = named(level, name);
        if (mesh === undefined) {
          continue;
        }
        expect(mesh.userData[SKIP_AMBIENT_OCCLUSION]).toBe(true);
        expect(mesh.castShadow).toBe(false);
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        expect(material?.transparent).toBe(true);
        expect(material?.depthWrite).toBe(false);
      }
      // 其他擺設都參與環境光遮蔽。
      expect(named(level, 'parkedCars:paint')?.userData[SKIP_AMBIENT_OCCLUSION]).toBeUndefined();
    }
  });

  test('地上的光暈只給沒有真光源的燈；真光源在燈頭、垂直往下照', () => {
    for (const level of QUALITY_LEVELS) {
      const group = propsGroupFor(level);
      const lamps = LAYOUTS[level].lamps;
      const lights = spotLightsOf(group);
      const pools = meshesOf(group).find((mesh) => mesh.name === 'lampPools');
      expect(pools instanceof InstancedMesh ? pools.count : 0).toBe(lamps.length - lights.length);
      lights.forEach((light, index) => {
        const lamp = lamps[index];
        if (lamp === undefined) {
          expect.fail('真光源比路燈多');
        }
        const head = lampHeadPosition(lamp);
        expect(light.position.x).toBeCloseTo(head.x, 9);
        expect(light.position.y).toBeCloseTo(head.y, 9);
        expect(light.position.z).toBeCloseTo(head.z, 9);
        expect(light.target.position.x).toBeCloseTo(head.x, 9);
        expect(light.target.position.y).toBe(0);
        expect(light.target.parent).toBe(group);
        expect(light.position.y).toBeGreaterThan(ftToM(15));
      });
    }
  });

  test('背景車的車牌：每台車的號碼都不同（固定種子），也不與玩家車相同；全部的字只多一個 draw call', () => {
    const cars = LAYOUTS.ultra.parkedCars;
    const plates = parkedCarPlates(cars.length);
    expect(plates).toHaveLength(cars.length);
    expect(new Set(plates).size).toBe(cars.length);
    expect(plates).not.toContain(plateText(DEFAULT_SEED));
    for (const plate of plates) {
      expect(plate).toMatch(/^[A-Z]{3}-\d{4}$/);
    }
    // 固定種子：每次都是同一組；車比較少的級別用的是同一串的前幾個。
    expect(parkedCarPlates(cars.length)).toEqual(plates);
    expect(parkedCarPlates(5)).toEqual(plates.slice(0, 5));

    const group = createParkedCars(cars, 'high');
    const text = group.getObjectByName('parkedCars:plateText');
    if (!(text instanceof Mesh) || text instanceof InstancedMesh) {
      expect.fail('車牌號碼要是一個普通的網格');
    }
    expect(text.userData.plates).toEqual(plates);
    expect(text.castShadow).toBe(false);
    // 共用的車殼裡不再有車牌的字（否則每台車都疊著同一個號碼），牌面還在。
    const trim = group.getObjectByName('parkedCars:trim');
    const plate = group.getObjectByName('parkedCars:plate');
    if (!(trim instanceof InstancedMesh) || !(plate instanceof InstancedMesh)) {
      expect.fail('飾條與牌面要是 InstancedMesh');
    }
    const trimFittings: unknown = trim.geometry.userData.fittings;
    expect(trimFittings).not.toContain('plate:front:text');
    expect(trimFittings).not.toContain('plate:rear:text');
    expect(plate.geometry.userData.fittings).toContain('plate:front');
    // 每台車前後各一塊：字的三角形數 = 各號碼的字（前 + 後）加起來，而且落在各自的車牌位置上。
    const expectedIndices = plates.reduce(
      (total, each) => total + (createPlateTextGeometry(each).index?.count ?? 0),
      0,
    );
    expect(text.geometry.index?.count).toBe(expectedIndices);
    text.geometry.computeBoundingBox();
    const bounds = text.geometry.boundingBox;
    const xs = cars.map((car) => car.x);
    expect(bounds?.min.x).toBeGreaterThan(Math.min(...xs) - VEHICLE_CONFIG_SI.lengthM);
    expect(bounds?.max.x).toBeLessThan(Math.max(...xs) + VEHICLE_CONFIG_SI.lengthM);
    expect(bounds?.max.y).toBeLessThan(1);
    expect(bounds?.min.y).toBeGreaterThan(0.2);
    // 玩家車的號碼不變。
    expect(createBodyGeometries('low').get('trim')?.userData.fittings).toContain('plate:front:text');
  });

  test('背景車：重用轎車的車殼分區，每個分區一個 InstancedMesh，車色不只一種，只有烤漆投影', () => {
    const cars = LAYOUTS.ultra.parkedCars;
    const meshes = meshesOf(createParkedCars(cars, 'high'));
    // 車殼分區 + 輪胎 + 輪圈 + 一個裝全部車牌號碼的網格。
    expect(meshes).toHaveLength(PARKED_CAR_BODY_PARTS.length + 3);
    const paint = meshes.find((mesh) => mesh.name === 'parkedCars:paint');
    if (!(paint instanceof InstancedMesh) || paint.instanceColor === null) {
      expect.fail('烤漆要是有實例顏色的 InstancedMesh');
    }
    const colors = new Set<string>();
    for (let index = 0; index < paint.count; index += 1) {
      colors.add(
        `${paint.instanceColor.getX(index)}|${paint.instanceColor.getY(index)}|${paint.instanceColor.getZ(index)}`,
      );
    }
    expect(colors.size).toBeGreaterThanOrEqual(4);
    expect(meshes.filter((mesh) => mesh.castShadow).map((mesh) => mesh.name)).toEqual([
      'parkedCars:paint',
    ]);
    // low 的輪子面數比較少。
    const triangles = (detail: 'low' | 'high'): number =>
      meshesOf(createParkedCars(cars, detail)).reduce(
        (total, mesh) => total + (mesh.geometry.index?.count ?? 0) / 3,
        0,
      );
    expect(triangles('low')).toBeLessThan(triangles('high'));
    expect(meshesOf(createParkedCars([]))).toHaveLength(0);
  });

  test('網格數（draw call）隨級別增加：low 比 ultra 少', () => {
    const drawCalls = QUALITY_LEVELS.map((level) => meshesOf(propsGroupFor(level)).length);
    expect(drawCalls[0]).toBeLessThan(drawCalls[3] ?? 0);
    const instances = QUALITY_LEVELS.map((level) =>
      meshesOf(propsGroupFor(level)).reduce(
        (total, mesh) => total + (mesh instanceof InstancedMesh ? mesh.count : 0),
        0,
      ),
    );
    expect(instances[0]).toBeLessThan(instances[1] ?? 0);
    expect(instances[1]).toBeLessThan(instances[2] ?? 0);
    expect(instances[2]).toBeLessThanOrEqual(instances[3] ?? 0);
  });
});

describe('場地的固定陰影範圍', () => {
  const box = lotShadowBox(spot);

  /** 與 three 的陰影相機同樣的擺法：在光源位置看向目標點。 */
  function shadowCamera(): OrthographicCamera {
    const camera = new OrthographicCamera(box.left, box.right, box.top, box.bottom, box.near, box.far);
    const toSun = new Vector3(SUN_DIRECTION.x, SUN_DIRECTION.y, SUN_DIRECTION.z).setLength(
      SUN_CONFIG.distanceM,
    );
    camera.position.set(box.targetX, 0, box.targetZ).add(toSun);
    camera.lookAt(box.targetX, 0, box.targetZ);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    return camera;
  }

  test('蓋住整塊場地：四個角、路緣外的圍欄、路燈頂端都在陰影相機的視錐裡', () => {
    const camera = shadowCamera();
    const inner = curbInnerBounds(spot);
    const fence = LOT_PROPS_CONFIG.fenceOutsideCurbM;
    const points: Vector3[] = [];
    for (const x of [inner.minX - fence, 0, inner.maxX + fence]) {
      for (const z of [inner.minZ - fence, (inner.minZ + inner.maxZ) / 2, inner.maxZ + fence]) {
        const world = spotLocalToWorld(spot, x, z);
        points.push(new Vector3(world.x, 0, world.z));
        points.push(new Vector3(world.x, LOT_PROPS_CONFIG.lampHeightM, world.z));
      }
    }
    for (const point of points) {
      const projected = point.clone().project(camera);
      expect(Math.abs(projected.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(projected.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(projected.z)).toBeLessThanOrEqual(1);
    }
  });

  test('比原本跟著車走的範圍大，但沒有大到浪費解析度', () => {
    const inner = curbInnerBounds(spot);
    const width = box.right - box.left;
    expect(width).toBeGreaterThan(2 * SUN_CONFIG.shadowHalfExtentM);
    expect(width).toBeGreaterThan(inner.maxX - inner.minX);
    // 場地對角線加上兩倍的餘裕以內。
    const diagonal = Math.hypot(inner.maxX - inner.minX, inner.maxZ - inner.minZ);
    expect(width).toBeLessThan(diagonal + 4 * SUN_CONFIG.lotShadowMarginM);
    expect(box.near).toBeGreaterThan(0);
    expect(box.far).toBeGreaterThan(box.near);
  });

  test('fitShadowBox：正上方的光，範圍就是地面的外框', () => {
    const fitted = fitShadowBox(
      { x: 0, y: 1, z: 0 },
      [
        { x: -10, z: -4 },
        { x: 10, z: -4 },
        { x: 10, z: 4 },
        { x: -10, z: 4 },
      ],
      3,
      50,
      1,
    );
    expect(fitted.targetX).toBeCloseTo(0, 9);
    expect(fitted.targetZ).toBeCloseTo(0, 9);
    expect(Math.max(fitted.right, fitted.top)).toBeCloseTo(10, 9);
    expect(Math.min(fitted.right, fitted.top)).toBeCloseTo(4, 9);
    expect(fitted.near).toBeCloseTo(50 - 3 - 1, 9);
    expect(fitted.far).toBeCloseTo(51, 9);
  });

  test('法線偏移：貼圖越小、範圍越大就越大，但不小於基本值', () => {
    expect(shadowNormalBias(10, 4096)).toBe(SUN_CONFIG.shadowNormalBias);
    expect(shadowNormalBias(80, 1024)).toBeGreaterThan(shadowNormalBias(80, 2048));
    expect(shadowNormalBias(80, 1024)).toBeGreaterThan(SUN_CONFIG.shadowNormalBias);
  });
});

describe('擺設是純視覺', () => {
  test('判定、物理、輸入的程式都不認得它們', () => {
    const entries = Object.entries(LOGIC_SOURCES);
    expect(entries.length).toBeGreaterThan(5);
    for (const [path, source] of entries) {
      expect(source, path).not.toMatch(
        /lotLayout|lotProps|parkedCars|LOT_PROPS_CONFIG|PropPlacement/,
      );
    }
  });

  test('擺設的類別清單與佈局的鍵一致', () => {
    const keys = Object.keys(LAYOUTS.ultra).sort();
    const categories: PropCategory[] = [...PROP_CATEGORIES];
    expect(keys).toEqual(categories.sort());
  });
});
