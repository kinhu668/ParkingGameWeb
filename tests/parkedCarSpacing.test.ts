// 裝飾背景車不穿插：彼此之間、與關卡 JSON 的 parked_car、與路燈桿之間都留有空隙。不開 WebGL。
import { describe, expect, test } from 'vitest';
import { degToRad, ftToM } from '../src/core/units';
import { LEVELS } from '../src/level/levelCatalog';
import {
  PARKED_CAR_CLEARANCE_FT,
  createEnvironmentLayout,
  footprintsTooClose,
} from '../src/props/environmentLayout';
import type { PropPlacement } from '../src/props/lotLayout';
import { QUALITY_LEVELS } from '../src/render/quality';
import { QUALITY_PRESETS } from '../src/render/renderConfig';

const BOUNDED = LEVELS.filter((level) => level.boundsFt !== undefined);

function car(xFt: number, zFt: number, headingDeg = 0): PropPlacement {
  return {
    x: ftToM(xFt),
    z: ftToM(zFt),
    y: 0,
    headingRad: degToRad(headingDeg),
    sizeX: ftToM(6),
    sizeY: 0,
    sizeZ: ftToM(15),
    variant: 0,
  };
}

describe('佔地的空隙', () => {
  test('並排：中心距 9 ft（空隙 3 ft）不算太近，7 ft（空隙 1 ft）算；重疊當然算', () => {
    const clearanceM = ftToM(PARKED_CAR_CLEARANCE_FT);
    expect(footprintsTooClose(car(0, 0), car(9, 0), clearanceM)).toBe(false);
    expect(footprintsTooClose(car(0, 0), car(7, 0), clearanceM)).toBe(true);
    expect(footprintsTooClose(car(0, 0), car(7, 0))).toBe(false);
    expect(footprintsTooClose(car(0, 0), car(5, 0))).toBe(true);
  });

  test('轉過的矩形：一台橫著的車頭伸進另一台的側面才算重疊', () => {
    expect(footprintsTooClose(car(0, 0), car(11, 0, 90))).toBe(false);
    expect(footprintsTooClose(car(0, 0), car(10, 0, 90))).toBe(true);
    // 斜 45° 的角落伸過來。
    expect(footprintsTooClose(car(0, 0), car(9, 9, 45))).toBe(false);
    expect(footprintsTooClose(car(0, 0), car(6, 6, 45))).toBe(true);
  });
});

describe.each(BOUNDED.map((level) => [level.id, level] as const))('%s 的背景車', (_id, level) => {
  const jsonCars = level.obstaclesFt
    .filter((obstacle) => obstacle.type === 'parked_car')
    .map((obstacle) => ({
      ...car(obstacle.centerXFt, obstacle.centerZFt, obstacle.headingDeg),
      sizeX: ftToM(obstacle.widthFt),
      sizeZ: ftToM(obstacle.lengthFt),
    }));

  test.each(QUALITY_LEVELS)('%s：彼此不穿插、不與 JSON 的 parked_car 重疊、不卡在路燈桿上', (quality) => {
    const layout = createEnvironmentLayout(level, QUALITY_PRESETS[quality].props);
    const cars = layout?.lot.parkedCars ?? [];
    const lamps = layout?.lot.lamps ?? [];
    const clearanceM = ftToM(PARKED_CAR_CLEARANCE_FT) - 1e-9;
    cars.forEach((one, index) => {
      for (const other of [...cars.slice(index + 1), ...jsonCars, ...lamps]) {
        expect(footprintsTooClose(one, other, clearanceM)).toBe(false);
      }
    });
  });
});
