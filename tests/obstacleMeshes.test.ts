// 障礙物模型：每個碰撞盒都有一個模型，模型外框的底面就是碰撞盒（看到的就是會撞到的）；
// 停放車輛交給 createParkedCars；邊界的內緣貼齊可行駛範圍；每一種都不是單色方塊。
import { Box3, Group, InstancedMesh, Matrix4, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { ftToM, mToFt } from '../src/core/units';
import { obbCorners, type Obb } from '../src/level/collision';
import { PROP_SIGNS } from '../src/level/environmentSigns';
import { LEVELS, levelById } from '../src/level/levelCatalog';
import type { LevelDefinition } from '../src/level/levelSchema';
import { OBSTACLE_DEFAULT_SIZE_FT, OBSTACLE_TYPES } from '../src/level/obstacleTypes';
import {
  BOUNDS_STYLES,
  boundsVisualBoxesFt,
  createObstacleGeometry,
  createObstacleMeshes,
  createObstacleShowcase,
  type ModelObstacleType,
} from '../src/props/obstacleMeshes';
import { SHOWCASE_IDS, createShowcaseObject } from '../src/render/showcase';
import { CAR_MODEL_DIMS_FT } from '../src/vehicle/carModels';

function requireLevel(id: string): LevelDefinition {
  const level = levelById(id);
  if (level === undefined) {
    throw new Error(`找不到 ${id}`);
  }
  return level;
}

/** 這個實例的模型外框底面四個角（世界座標），順序與 obbCorners 相同：前左、前右、後右、後左。 */
function footprintCorners(mesh: InstancedMesh, instance: number): Vector3[] {
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox ?? new Box3();
  const matrix = new Matrix4();
  mesh.getMatrixAt(instance, matrix);
  return [
    new Vector3(box.min.x, box.min.y, box.min.z),
    new Vector3(box.max.x, box.min.y, box.min.z),
    new Vector3(box.max.x, box.min.y, box.max.z),
    new Vector3(box.min.x, box.min.y, box.max.z),
  ].map((corner) => corner.applyMatrix4(matrix));
}

function expectFootprintMatches(corners: readonly Vector3[], box: Obb): void {
  const expected = obbCorners(box);
  corners.forEach((corner, index) => {
    expect(corner.x).toBeCloseTo(expected[index]?.x ?? NaN, 4);
    expect(corner.z).toBeCloseTo(expected[index]?.z ?? NaN, 4);
    // 實例矩陣是 32 位元浮點數，所以比到 0.1 公釐。立在地面上（輪子、底座可以低到地面，不會埋進去超過 1 公分）。
    expect(Math.abs(corner.y)).toBeLessThan(0.01);
  });
}

const MODEL_TYPES = OBSTACLE_TYPES.filter((type): type is ModelObstacleType => type !== 'parked_car');

/** 比人高的大型障礙物（柱子、餐車、貨車、救護車、鳳梨立牌）；其餘的都不到 8 ft。 */
const TALL_TYPES: readonly ModelObstacleType[] = [
  'pillar',
  'food_truck',
  'delivery_van',
  'ambulance',
  'pineapple_standee',
];

describe('各種障礙物的模型', () => {
  test.each(MODEL_TYPES.filter((type) => type !== 'wall'))('%s：不是一個方塊，底面在地上，有顏色', (type) => {
    const geometry = createObstacleGeometry(type);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox ?? new Box3();
    // 一個方塊是 24 個頂點。
    expect(geometry.getAttribute('position').count).toBeGreaterThan(24 * 3);
    expect(geometry.getAttribute('color')).toBeDefined();
    expect(Math.abs(box.min.y)).toBeLessThan(0.01);
    expect(mToFt(box.max.y)).toBeGreaterThan(0.3);
    expect(mToFt(box.max.y)).toBeLessThan(TALL_TYPES.includes(type) ? 13 : 8);
  });

  test.each(MODEL_TYPES.filter((type) => type !== 'wall'))(
    '%s：模型本身的外框與預設碰撞盒相差不到 0.25 ft（縮放前就對得上）',
    (type) => {
      const size = OBSTACLE_DEFAULT_SIZE_FT[type];
      const geometry = createObstacleGeometry(type);
      geometry.computeBoundingBox();
      const extent = (geometry.boundingBox ?? new Box3()).getSize(new Vector3());
      expect(Math.abs(mToFt(extent.x) - size.widthFt) / 2).toBeLessThan(0.25);
      expect(Math.abs(mToFt(extent.z) - size.lengthFt) / 2).toBeLessThan(0.25);
      expect(mToFt(extent.x)).toBeGreaterThan(size.widthFt * 0.7);
      expect(mToFt(extent.z)).toBeGreaterThan(size.lengthFt * 0.7);
    },
  );

  test('購物車比推車回收架矮、比交通錐高；郵筒比垃圾桶高', () => {
    const height = (type: ModelObstacleType): number => {
      const geometry = createObstacleGeometry(type);
      geometry.computeBoundingBox();
      return mToFt(geometry.boundingBox?.max.y ?? 0);
    };
    expect(height('shopping_cart')).toBeGreaterThan(height('cone'));
    expect(height('cart_corral')).toBeGreaterThan(height('shopping_cart'));
    expect(height('mailbox')).toBeGreaterThan(height('trash_bin'));
    expect(height('pallet')).toBeLessThan(1);
    expect(height('pallet_stack')).toBeGreaterThan(3);
  });

  test('`?show=obstacle_<type>` 每一種都登錄了，建得出東西', () => {
    for (const type of OBSTACLE_TYPES) {
      expect(SHOWCASE_IDS).toContain(`obstacle_${type}`);
      const object = createShowcaseObject(`obstacle_${type}`, 'low');
      expect(object).toBeDefined();
      expect(createObstacleShowcase(type, 'low').children.length).toBeGreaterThan(0);
    }
  });
});

describe.each(LEVELS.map((level) => [level.id, level] as const))('%s 的障礙物', (_id, level) => {
  const group = createObstacleMeshes(level, 'low');
  const boxes = level.layout.obstacles ?? [];
  const obstacleCount = level.obstaclesFt.length;

  test('每個障礙物都有模型，一個不多、一個不少', () => {
    const seen: number[] = [];
    for (const child of group.children) {
      const indices: unknown = child.userData.obstacleIndices;
      if (Array.isArray(indices)) {
        seen.push(...indices.filter((index): index is number => typeof index === 'number'));
      }
    }
    expect(seen.sort((a, b) => a - b)).toEqual(level.obstaclesFt.map((_, index) => index));
  });

  test('模型外框的底面與碰撞盒重合', () => {
    for (const child of group.children) {
      if (!(child instanceof InstancedMesh) || !child.name.startsWith('obstacle:')) {
        continue;
      }
      const indices = child.userData.obstacleIndices as readonly number[];
      expect(child.count).toBe(indices.length);
      indices.forEach((obstacleIndex, instance) => {
        const box = boxes[obstacleIndex];
        expect(level.obstaclesFt[obstacleIndex]?.type).toBe(child.name.slice('obstacle:'.length));
        if (box !== undefined) {
          expectFootprintMatches(footprintCorners(child, instance), box);
        }
      });
    }
  });

  test('停放車輛：每一台畫成關卡指定的那款車，位置與方向就是碰撞盒，碰撞盒就是那款車的外框', () => {
    const cars = group.children.find((child) => child.name === 'parkedCars');
    const expected = level.obstaclesFt.filter((obstacle) => obstacle.type === 'parked_car').length;
    if (expected === 0) {
      expect(cars).toBeUndefined();
      return;
    }
    expect(cars).toBeInstanceOf(Group);
    const indices = cars?.userData.obstacleIndices as readonly number[];
    expect(indices).toHaveLength(expected);
    /** 每一款的烤漆網格裡已經對過幾台。 */
    const seen = new Map<string, number>();
    for (const obstacleIndex of indices) {
      const obstacle = level.obstaclesFt[obstacleIndex];
      const model = obstacle?.model;
      if (obstacle === undefined || model === undefined) {
        expect.fail('停放車輛要有車款');
      }
      expect([obstacle.widthFt, obstacle.lengthFt]).toEqual([
        CAR_MODEL_DIMS_FT[model].widthFt,
        CAR_MODEL_DIMS_FT[model].lengthFt,
      ]);
      const instance = seen.get(model) ?? 0;
      seen.set(model, instance + 1);
      const box = boxes[obstacleIndex];
      for (const part of ['paint', 'rest']) {
        const mesh = cars?.getObjectByName(`parkedCars:${model}:${part}`);
        if (!(mesh instanceof InstancedMesh)) {
          expect.fail(`找不到 ${model} 的 ${part}`);
        }
        const matrix = new Matrix4();
        mesh.getMatrixAt(instance, matrix);
        const position = new Vector3().setFromMatrixPosition(matrix);
        expect(position.x).toBeCloseTo(box?.x ?? NaN, 5);
        expect(position.z).toBeCloseTo(box?.z ?? NaN, 5);
        // 車頭（本地 −Z）朝碰撞盒的 heading。
        const nose = new Vector3(0, 0, -1).transformDirection(matrix);
        expect(nose.x).toBeCloseTo(Math.sin(box?.headingRad ?? NaN), 9);
        expect(nose.z).toBeCloseTo(-Math.cos(box?.headingRad ?? NaN), 9);
      }
    }
    // 每一款的實例數就是這一關那一款有幾台，沒有多畫的車。
    for (const [model, count] of seen) {
      const paint = cars?.getObjectByName(`parkedCars:${model}:paint`);
      expect(paint instanceof InstancedMesh ? paint.count : NaN).toBe(count);
    }
    const drawn = (cars?.children ?? []).reduce(
      (total, child) =>
        total + (child instanceof InstancedMesh && child.name.endsWith(':paint') ? child.count : 0),
      0,
    );
    expect(drawn).toBe(expected);
  });

  test('邊界：四面，內緣貼齊可行駛範圍', () => {
    const bounds = group.children.find((child) => child.name === 'bounds');
    if (level.boundsFt === undefined) {
      expect(bounds).toBeUndefined();
      return;
    }
    expect(bounds).toBeInstanceOf(InstancedMesh);
    if (!(bounds instanceof InstancedMesh)) {
      return;
    }
    expect(bounds.count).toBe(4);
    const { minXFt, maxXFt, minZFt, maxZFt } = level.boundsFt;
    const inner = [0, 1, 2, 3].map((instance) => footprintCorners(bounds, instance));
    // 順序：北、南、西、東。
    expect(Math.max(...(inner[0] ?? []).map((corner) => corner.z))).toBeCloseTo(ftToM(minZFt), 4);
    expect(Math.min(...(inner[1] ?? []).map((corner) => corner.z))).toBeCloseTo(ftToM(maxZFt), 4);
    expect(Math.max(...(inner[2] ?? []).map((corner) => corner.x))).toBeCloseTo(ftToM(minXFt), 4);
    expect(Math.min(...(inner[3] ?? []).map((corner) => corner.x))).toBeCloseTo(ftToM(maxXFt), 4);
    expect(obstacleCount + 4).toBe(boxes.length);
  });
});

describe('貼在模型上的字', () => {
  /** 一個障礙物（中心 (20, −10) ft）身上的牌子：文字、位置（英尺）、字朝哪個方向（世界座標的單位向量）。 */
  function labelsOf(type: ModelObstacleType, headingDeg: number) {
    const size = OBSTACLE_DEFAULT_SIZE_FT[type];
    if (size === null) {
      throw new Error(`${type} 沒有預設尺寸`);
    }
    const group = createObstacleMeshes({
      obstaclesFt: [{ type, centerXFt: 20, centerZFt: -10, widthFt: size.widthFt, lengthFt: size.lengthFt, headingDeg }],
    });
    return group.children
      .filter((child) => child.name === 'sign')
      .map((sign) => ({
        text: sign.userData.signText as string,
        xFt: mToFt(sign.position.x) - 20,
        yFt: mToFt(sign.position.y),
        zFt: mToFt(sign.position.z) + 10,
        facing: new Vector3(0, 0, 1).applyQuaternion(sign.quaternion),
      }));
  }

  test('餐車：車頂招牌兩面都是虛構的店名，在出餐面（車身右側）那一邊、比車頂高，一面朝外一面朝內', () => {
    // heading 90：車頭朝 +X，右側（出餐面）朝 +Z。
    const labels = labelsOf('food_truck', 90);
    expect(labels.map((label) => label.text)).toEqual([PROP_SIGNS.foodTruck, PROP_SIGNS.foodTruck]);
    const [outer, inner] = labels;
    expect(outer?.zFt).toBeCloseTo(2.37, 4);
    expect(inner?.zFt).toBeCloseTo(2.03, 4);
    for (const label of labels) {
      // 招牌的中心在車身中心後方 1.5 ft（遮陽棚的正上方），高過車頂（10 ft）。
      expect(label.xFt).toBeCloseTo(-1.5, 4);
      expect(label.yFt).toBeGreaterThan(10.5);
    }
    expect(outer?.facing.z).toBeCloseTo(1, 5);
    expect(inner?.facing.z).toBeCloseTo(-1, 5);
    // 牌面在模型的招牌板上：板子比牌面高、比牌面寬。
    const geometry = createObstacleGeometry('food_truck');
    geometry.computeBoundingBox();
    expect(mToFt(geometry.boundingBox?.max.y ?? 0)).toBeGreaterThan(11.15 + 0.65);
  });

  test('貨車：貨廂兩側各一片虛構的字樣，貼在車身外側、字朝車外', () => {
    // heading 0：車頭朝 −Z，右側朝 +X。
    const labels = labelsOf('delivery_van', 0);
    expect(labels.map((label) => label.text)).toEqual([PROP_SIGNS.deliveryVan, PROP_SIGNS.deliveryVan]);
    const [rightSide, leftSide] = labels;
    expect(rightSide?.xFt).toBeCloseTo(3.27, 4);
    expect(leftSide?.xFt).toBeCloseTo(-3.27, 4);
    expect(rightSide?.facing.x).toBeCloseTo(1, 5);
    expect(leftSide?.facing.x).toBeCloseTo(-1, 5);
    for (const label of labels) {
      // 在貨廂上（車身中心後方 3.2 ft）、色帶上方，沒有超出 7 ft 寬的碰撞盒。
      expect(label.zFt).toBeCloseTo(3.2, 4);
      expect(label.yFt).toBeGreaterThan(5);
      expect(Math.abs(label.xFt)).toBeLessThan(OBSTACLE_DEFAULT_SIZE_FT.delivery_van.widthFt / 2);
    }
  });

  test('救護車：車廂兩側各有虛構的單位名稱與編號、車尾有 AMBULANCE，都貼在車皮外、字朝車外', () => {
    // heading 0：車頭朝 −Z，右側朝 +X，車尾朝 +Z。
    const labels = labelsOf('ambulance', 0);
    expect(labels.map((label) => label.text)).toEqual([
      PROP_SIGNS.ambulance,
      PROP_SIGNS.ambulance,
      PROP_SIGNS.ambulanceUnit,
      PROP_SIGNS.ambulanceUnit,
      PROP_SIGNS.ambulanceRear,
    ]);
    expect(labels.map((label) => label.text)).toEqual([
      'MAPLE HOLLOW AMBULANCE',
      'MAPLE HOLLOW AMBULANCE',
      'MEDIC 7',
      'MEDIC 7',
      'AMBULANCE',
    ]);
    const size = OBSTACLE_DEFAULT_SIZE_FT.ambulance;
    const geometry = createObstacleGeometry('ambulance');
    geometry.computeBoundingBox();
    const roofFt = mToFt(geometry.boundingBox?.max.y ?? 0);
    const sides = labels.slice(0, 4);
    sides.forEach((label, index) => {
      // 偶數是右側（+X）、奇數是左側（−X）；貼在醫療艙的車皮外一點點，沒有超出 7 ft 寬的碰撞盒。
      const sign = index % 2 === 0 ? 1 : -1;
      expect(label.xFt * sign).toBeGreaterThan(3.2);
      expect(Math.abs(label.xFt)).toBeLessThan(size.widthFt / 2);
      expect(label.facing.x).toBeCloseTo(sign, 5);
      // 在醫療艙上（車身中心的後方）、色帶上方、車頂以下。
      expect(label.zFt).toBeGreaterThan(0);
      expect(label.yFt).toBeGreaterThan(4.5);
      expect(label.yFt).toBeLessThan(roofFt - 1);
    });
    // 兩側的牌子左右對稱。
    expect(sides[0]?.zFt).toBeCloseTo(sides[1]?.zFt ?? NaN, 5);
    expect(sides[2]?.zFt).toBeCloseTo(sides[3]?.zFt ?? NaN, 5);
    const rear = labels[4];
    expect(rear?.xFt).toBeCloseTo(0, 5);
    expect(rear?.facing.z).toBeCloseTo(1, 5);
    expect(rear?.zFt).toBeGreaterThan(9.5);
    expect(rear?.zFt).toBeLessThan(size.lengthFt / 2);
  });

  test('交通錐、柱子、鳳梨立牌身上沒有字', () => {
    for (const type of ['cone', 'pillar', 'pineapple_standee'] as const) {
      expect(labelsOf(type, 0)).toEqual([]);
    }
  });
});

describe('柱列頂上的橫樑', () => {
  const pillar = OBSTACLE_DEFAULT_SIZE_FT.pillar;
  const pillarAt = (centerXFt: number, centerZFt: number) => ({
    type: 'pillar' as const,
    centerXFt,
    centerZFt,
    widthFt: pillar.widthFt,
    lengthFt: pillar.lengthFt,
    headingDeg: 0,
  });
  /** 每一根樑兩端的位置（英尺，四捨五入到 0.01）與樑身底面的高度（英尺）。 */
  function beamsOf(source: Parameters<typeof createObstacleMeshes>[0]) {
    const beams: { ends: string[]; bottomFt: number }[] = [];
    for (const child of createObstacleMeshes(source, 'low').children) {
      if (!(child instanceof InstancedMesh) || child.name !== 'pillarBeams') {
        continue;
      }
      child.geometry.computeBoundingBox();
      const box = child.geometry.boundingBox ?? new Box3();
      // 樑不比柱頭寬（俯視時看得到柱頭的兩側），燈具垂在樑下不到半英尺。
      expect(Math.max(-mToFt(box.min.x), mToFt(box.max.x))).toBeLessThanOrEqual(0.6 + 1e-6);
      expect(mToFt(box.min.y)).toBeGreaterThanOrEqual(-0.45 - 1e-6);
      for (let instance = 0; instance < child.count; instance += 1) {
        const matrix = new Matrix4();
        child.getMatrixAt(instance, matrix);
        const ends = [box.min.z, box.max.z].map((z) => {
          const end = new Vector3(0, 0, z).applyMatrix4(matrix);
          return `${mToFt(end.x).toFixed(2)},${mToFt(end.z).toFixed(2)}`;
        });
        beams.push({ ends: ends.sort(), bottomFt: mToFt(new Vector3().applyMatrix4(matrix).y) });
      }
    }
    return beams;
  }

  test.each([
    ['w1_l07', 11],
    ['w1_l10', 13],
  ] as const)('%s：%i 根柱子排成一列，相鄰的兩根之間各一根樑，架在柱頭上', (id, pillarCount) => {
    const level = requireLevel(id);
    const pillars = level.obstaclesFt.filter((obstacle) => obstacle.type === 'pillar');
    expect(pillars).toHaveLength(pillarCount);
    const beams = beamsOf(level);
    expect(beams).toHaveLength(pillarCount - 1);
    const sorted = [...pillars].sort((a, b) => a.centerXFt - b.centerXFt);
    const expected = sorted.slice(1).map((to, index) => {
      const from = sorted[index] ?? to;
      return [from, to].map((end) => `${end.centerXFt.toFixed(2)},${end.centerZFt.toFixed(2)}`).sort();
    });
    expect(beams.map((beam) => beam.ends).sort()).toEqual(expected.sort());
    // 樑身的底面就是柱頭的頂面，比車頂（約 5 ft）高得多：車從下面過。
    const pillarGeometry = createObstacleGeometry('pillar');
    pillarGeometry.computeBoundingBox();
    const capitalTopFt = mToFt(pillarGeometry.boundingBox?.max.y ?? 0);
    expect(capitalTopFt).toBeGreaterThan(9);
    for (const beam of beams) {
      expect(beam.bottomFt).toBeCloseTo(capitalTopFt, 4);
    }
  });

  test('斜著排的兩根柱子：樑沿著兩根柱子的連線', () => {
    const beams = beamsOf({ obstaclesFt: [pillarAt(10, 20), pillarAt(16, 28)] });
    expect(beams.map((beam) => beam.ends)).toEqual([['10.00,20.00', '16.00,28.00']]);
  });

  test('隔太遠的柱子（超過 14 ft）、單獨一根柱子、沒有柱子的關卡：沒有樑', () => {
    expect(beamsOf({ obstaclesFt: [pillarAt(0, 0), pillarAt(20, 0)] })).toEqual([]);
    expect(beamsOf({ obstaclesFt: [pillarAt(0, 0)] })).toEqual([]);
    expect(beamsOf(requireLevel('w1_l06'))).toEqual([]);
  });
});

describe('邊界的樣子', () => {
  test('停車場與街道是矮路緣（不擋視線）；巷子是高牆，厚到鏡頭不會跑到牆的另一面', () => {
    for (const environment of ['open_lot', 'warehouse_club', 'post_office', 'city_street'] as const) {
      expect(BOUNDS_STYLES[environment].heightFt).toBeLessThan(1);
    }
    expect(BOUNDS_STYLES.narrow_alley.heightFt).toBeGreaterThan(15);
    expect(BOUNDS_STYLES.narrow_alley.depthFt).toBeGreaterThan(30);
  });

  test('四面視覺方塊不伸進可行駛範圍', () => {
    const bounds = { minXFt: -10, maxXFt: 20, minZFt: -30, maxZFt: 40 };
    for (const box of boundsVisualBoxesFt(bounds, 4)) {
      const insideX = box.centerXFt + box.widthFt / 2 > bounds.minXFt && box.centerXFt - box.widthFt / 2 < bounds.maxXFt;
      const insideZ = box.centerZFt + box.lengthFt / 2 > bounds.minZFt && box.centerZFt - box.lengthFt / 2 < bounds.maxZFt;
      expect(insideX && insideZ).toBe(false);
    }
  });
});

describe('原型關', () => {
  test('沒有障礙物、沒有邊界 → 什麼都不畫', () => {
    expect(createObstacleMeshes(requireLevel('prototype')).children).toHaveLength(0);
  });
});
