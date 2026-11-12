// 障礙物模型：每個碰撞盒都有一個模型，模型外框的底面就是碰撞盒（看到的就是會撞到的）；
// 停放車輛交給 createParkedCars；邊界的內緣貼齊可行駛範圍；每一種都不是單色方塊。
import { Box3, Group, InstancedMesh, Matrix4, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { ftToM, mToFt } from '../src/core/units';
import { obbCorners, type Obb } from '../src/level/collision';
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
    expect(mToFt(box.max.y)).toBeLessThan(8);
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

  test('停放車輛：用背景車那一套轎車，位置與方向就是碰撞盒，車身外框對得上 6 × 15 ft', () => {
    const cars = group.children.find((child) => child.name === 'parkedCars');
    const expected = level.obstaclesFt.filter((obstacle) => obstacle.type === 'parked_car').length;
    if (expected === 0) {
      expect(cars).toBeUndefined();
      return;
    }
    expect(cars).toBeInstanceOf(Group);
    const indices = cars?.userData.obstacleIndices as readonly number[];
    expect(indices).toHaveLength(expected);
    const bodies = cars?.children.filter(
      (child): child is InstancedMesh => child instanceof InstancedMesh && child.name !== 'parkedCars:tire' && child.name !== 'parkedCars:rim',
    );
    const paint = bodies?.find((body) => body.name === 'parkedCars:paint');
    expect(paint?.count).toBe(expected);
    // 全部車殼分區合起來的外框（車的本地座標）。
    const shell = new Box3();
    for (const body of bodies ?? []) {
      body.geometry.computeBoundingBox();
      shell.union(body.geometry.boundingBox ?? new Box3());
    }
    const size = shell.getSize(new Vector3());
    expect(Math.abs(mToFt(size.x) - 6) / 2).toBeLessThan(0.25);
    expect(Math.abs(mToFt(size.z) - 15) / 2).toBeLessThan(0.25);
    indices.forEach((obstacleIndex, instance) => {
      const box = boxes[obstacleIndex];
      const matrix = new Matrix4();
      paint?.getMatrixAt(instance, matrix);
      const position = new Vector3().setFromMatrixPosition(matrix);
      expect(position.x).toBeCloseTo(box?.x ?? NaN, 5);
      expect(position.z).toBeCloseTo(box?.z ?? NaN, 5);
      // 車頭（本地 −Z）朝碰撞盒的 heading。
      const nose = new Vector3(0, 0, -1).transformDirection(matrix);
      expect(nose.x).toBeCloseTo(Math.sin(box?.headingRad ?? NaN), 9);
      expect(nose.z).toBeCloseTo(-Math.cos(box?.headingRad ?? NaN), 9);
    });
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
