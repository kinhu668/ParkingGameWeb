// 每一關的幾何：起點不壓到任何障礙物或邊界（碰撞「車永遠不與障礙物重疊」的不變量從這裡開始）、
// 目標車位在 bounds 內、不與障礙物重疊、比車身大。
import { describe, expect, test } from 'vitest';
import { mToFt } from '../src/core/units';
import {
  BOUNDS_WALL_THICKNESS_FT,
  obbCorners,
  obbsOverlap,
  vehicleHits,
  vehicleObb,
  type Obb,
} from '../src/level/collision';
import { LEVELS } from '../src/level/levelCatalog';
import type { LevelDefinition } from '../src/level/levelSchema';
import { rulesFromLevel } from '../src/level/scoring';
import { VEHICLE_CONFIG_US } from '../src/vehicle/vehicleConfig';

/** 車位至少要比車身大這麼多（寬與長都是），否則停不進去。 */
const MIN_SPOT_MARGIN_FT = 1.5;

const CASES: readonly (readonly [string, LevelDefinition])[] = LEVELS.map(
  (level) => [level.id, level] as const,
);

/** 目標車位的矩形。 */
function spotObb(level: LevelDefinition): Obb {
  const { spot } = level.layout;
  return {
    x: spot.x,
    z: spot.z,
    halfWidthM: spot.widthM / 2,
    halfLengthM: spot.lengthM / 2,
    headingRad: spot.headingRad,
  };
}

describe.each(CASES)('%s 的幾何', (_id, level) => {
  const obstacles = level.layout.obstacles ?? [];
  const wallCount = level.boundsFt === undefined ? 0 : 4;

  test('碰撞盒 = 障礙物（依 JSON 順序）＋ 四面邊界；規則由秒換成步', () => {
    expect(obstacles).toHaveLength(level.obstaclesFt.length + wallCount);
    level.obstaclesFt.forEach((obstacle, index) => {
      expect(mToFt(obstacles[index]?.x ?? NaN)).toBeCloseTo(obstacle.centerXFt, 9);
      expect(mToFt(obstacles[index]?.z ?? NaN)).toBeCloseTo(obstacle.centerZFt, 9);
      expect(mToFt(obstacles[index]?.halfWidthM ?? NaN)).toBeCloseTo(obstacle.widthFt / 2, 9);
      expect(mToFt(obstacles[index]?.halfLengthM ?? NaN)).toBeCloseTo(obstacle.lengthFt / 2, 9);
    });
    expect(level.layout.rules).toEqual(
      rulesFromLevel(level.timeLimitS, level.targetTimeS, level.maxCollisions),
    );
  });

  test('起點不壓到任何障礙物或邊界', () => {
    expect(vehicleHits(level.layout.startState, obstacles)).toEqual([]);
  });

  test('起點的車身四角都在 bounds 內', () => {
    const { boundsFt } = level;
    if (boundsFt === undefined) {
      return;
    }
    for (const corner of obbCorners(vehicleObb(level.layout.startState))) {
      expect(mToFt(corner.x)).toBeGreaterThanOrEqual(boundsFt.minXFt);
      expect(mToFt(corner.x)).toBeLessThanOrEqual(boundsFt.maxXFt);
      expect(mToFt(corner.z)).toBeGreaterThanOrEqual(boundsFt.minZFt);
      expect(mToFt(corner.z)).toBeLessThanOrEqual(boundsFt.maxZFt);
    }
  });

  test('目標車位不與任何障礙物或邊界重疊，四角都在 bounds 內', () => {
    const spot = spotObb(level);
    obstacles.forEach((obstacle, index) => {
      expect(obbsOverlap(spot, obstacle), `碰撞盒 ${index}`).toBe(false);
    });
    const { boundsFt } = level;
    if (boundsFt !== undefined) {
      for (const corner of obbCorners(spot)) {
        expect(mToFt(corner.x)).toBeGreaterThanOrEqual(boundsFt.minXFt - 1e-9);
        expect(mToFt(corner.x)).toBeLessThanOrEqual(boundsFt.maxXFt + 1e-9);
        expect(mToFt(corner.z)).toBeGreaterThanOrEqual(boundsFt.minZFt - 1e-9);
        expect(mToFt(corner.z)).toBeLessThanOrEqual(boundsFt.maxZFt + 1e-9);
      }
    }
  });

  test('車位比車身至少大 1.5 ft', () => {
    expect(level.spotFt.widthFt - VEHICLE_CONFIG_US.widthFt).toBeGreaterThanOrEqual(MIN_SPOT_MARGIN_FT);
    expect(level.spotFt.lengthFt - VEHICLE_CONFIG_US.lengthFt).toBeGreaterThanOrEqual(MIN_SPOT_MARGIN_FT);
  });

  test('bounds 至少放得下一台車迴轉（比邊界厚度大得多）', () => {
    const { boundsFt } = level;
    if (boundsFt === undefined) {
      return;
    }
    expect(boundsFt.maxXFt - boundsFt.minXFt).toBeGreaterThan(VEHICLE_CONFIG_US.lengthFt + BOUNDS_WALL_THICKNESS_FT);
    expect(boundsFt.maxZFt - boundsFt.minZFt).toBeGreaterThan(VEHICLE_CONFIG_US.lengthFt + BOUNDS_WALL_THICKNESS_FT);
  });
});
