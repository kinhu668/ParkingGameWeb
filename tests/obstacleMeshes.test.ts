// 障礙物方塊：每個碰撞盒各一個方塊、順序相同，方塊的底面就是碰撞盒（看到的就是會撞到的）。
import { Box3, Mesh, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { mToFt } from '../src/core/units';
import { obbCorners, type Obb } from '../src/level/collision';
import { LEVELS, levelById } from '../src/level/levelCatalog';
import type { LevelDefinition } from '../src/level/levelSchema';
import { OBSTACLE_TYPES } from '../src/level/obstacleTypes';
import {
  BOUNDS_BOX_STYLE,
  OBSTACLE_BOX_STYLES,
  createObstacleBoxes,
} from '../src/props/obstacleMeshes';

function requireLevel(id: string): LevelDefinition {
  const level = levelById(id);
  if (level === undefined) {
    throw new Error(`找不到 ${id}`);
  }
  return level;
}

/** 方塊底面四個角的世界座標（本地 ±0.5 的單位立方體，經過縮放、旋轉、平移）。 */
function footprintCorners(mesh: Mesh): Vector3[] {
  mesh.updateMatrixWorld(true);
  // 與 obbCorners 同樣的順序：前左、前右、後右、後左（前 = 本地 −Z）。
  return [
    new Vector3(-0.5, -0.5, -0.5),
    new Vector3(0.5, -0.5, -0.5),
    new Vector3(0.5, -0.5, 0.5),
    new Vector3(-0.5, -0.5, 0.5),
  ].map((corner) => corner.applyMatrix4(mesh.matrixWorld));
}

function expectFootprintMatches(mesh: Mesh, box: Obb): void {
  const expected = obbCorners(box);
  footprintCorners(mesh).forEach((corner, index) => {
    expect(corner.x).toBeCloseTo(expected[index]?.x ?? NaN, 9);
    expect(corner.z).toBeCloseTo(expected[index]?.z ?? NaN, 9);
    // 立在地面上。
    expect(corner.y).toBeCloseTo(0, 9);
  });
}

describe('方塊樣式', () => {
  test('每種障礙物都有高度與顏色', () => {
    expect(Object.keys(OBSTACLE_BOX_STYLES).sort()).toEqual([...OBSTACLE_TYPES].sort());
    for (const style of [...Object.values(OBSTACLE_BOX_STYLES), BOUNDS_BOX_STYLE]) {
      expect(style.heightFt).toBeGreaterThan(0);
    }
  });

  test('邊界是矮路緣：比車身矮得多，不擋視線', () => {
    expect(BOUNDS_BOX_STYLE.heightFt).toBeLessThan(1);
  });
});

describe.each(LEVELS.map((level) => [level.id, level] as const))('%s 的方塊', (_id, level) => {
  const group = createObstacleBoxes(level);
  const boxes = level.layout.obstacles ?? [];

  test('每個碰撞盒各一個方塊，順序相同；底面與碰撞盒重合', () => {
    expect(group.children).toHaveLength(boxes.length);
    group.children.forEach((child, index) => {
      expect(child).toBeInstanceOf(Mesh);
      const box = boxes[index];
      if (child instanceof Mesh && box !== undefined) {
        expectFootprintMatches(child, box);
      }
    });
  });
});

describe('w1_l03', () => {
  const level = requireLevel('w1_l03');
  const group = createObstacleBoxes(level);

  test('2 台鄰車、1 個交通錐、1 台購物車，加四面邊界', () => {
    expect(group.children.map((child) => child.name)).toEqual([
      'parked_car',
      'parked_car',
      'cone',
      'shopping_cart',
      'bounds',
      'bounds',
      'bounds',
      'bounds',
    ]);
  });

  test('鄰車的方塊：橫停（heading 90）→ 世界座標裡 15 ft 沿 X、6 ft 沿 Z、高 4.6 ft', () => {
    const car = group.children[0];
    if (car === undefined) {
      throw new Error('沒有方塊');
    }
    const size = new Box3().setFromObject(car).getSize(new Vector3());
    expect(mToFt(size.x)).toBeCloseTo(15, 6);
    expect(mToFt(size.z)).toBeCloseTo(6, 6);
    expect(mToFt(size.y)).toBeCloseTo(4.6, 6);
  });

  test('方塊會投影也會接收陰影；同一種顏色共用材質', () => {
    const meshes = group.children.filter((child): child is Mesh => child instanceof Mesh);
    for (const mesh of meshes) {
      expect(mesh.castShadow).toBe(true);
      expect(mesh.receiveShadow).toBe(true);
    }
    expect(meshes[0]?.material).toBe(meshes[1]?.material);
    expect(meshes[0]?.material).not.toBe(meshes[2]?.material);
    expect(meshes[0]?.geometry).toBe(meshes[2]?.geometry);
  });
});

describe('原型關', () => {
  test('沒有障礙物、沒有邊界 → 一個方塊都沒有', () => {
    expect(createObstacleBoxes(requireLevel('prototype')).children).toHaveLength(0);
  });
});
