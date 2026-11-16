// 每一關停放的車：車款組合固定（關卡 id 當種子）而且有變化；看到的車多大、佔地與碰撞盒就多大。不開 WebGL。
import { describe, expect, test } from 'vitest';
import { DEFAULT_SEED } from '../src/core/gameConfig';
import { LEVELS } from '../src/level/levelCatalog';
import { parseLevel } from '../src/level/levelSchema';
import { createEnvironmentLayout } from '../src/props/environmentLayout';
import { createLotLayout, type ParkedCar } from '../src/props/lotLayout';
import { QUALITY_LEVELS } from '../src/render/quality';
import { QUALITY_PRESETS } from '../src/render/renderConfig';
import { CAR_MODEL_DIMS_FT, CAR_MODEL_IDS, carModelDimsM } from '../src/vehicle/carModels';

const rawLevels = import.meta.glob<unknown>('../src/levels/*.json', { eager: true, import: 'default' });

function expectFootprintOfModel(car: ParkedCar): void {
  const dims = carModelDimsM(car.model);
  expect([car.sizeX, car.sizeY, car.sizeZ]).toEqual([dims.widthM, dims.heightM, dims.lengthM]);
}

describe('關卡 JSON 的停放車輛', () => {
  const withCars = LEVELS.filter((level) =>
    level.obstaclesFt.some((obstacle) => obstacle.type === 'parked_car'),
  );

  test('有停放車輛的關卡不只一關', () => {
    expect(withCars.length).toBeGreaterThanOrEqual(5);
  });

  test.each(withCars.map((level) => [level.id, level] as const))(
    '%s：每一台都有車款，碰撞盒是那款車的外框，相鄰兩台不同款',
    (_id, level) => {
      const cars = level.obstaclesFt.filter((obstacle) => obstacle.type === 'parked_car');
      cars.forEach((car, index) => {
        const model = car.model ?? 'sedan';
        expect(CAR_MODEL_IDS).toContain(car.model);
        expect(car.widthFt).toBe(CAR_MODEL_DIMS_FT[model].widthFt);
        expect(car.lengthFt).toBe(CAR_MODEL_DIMS_FT[model].lengthFt);
        expect(car.model).not.toBe(cars[index + 1]?.model);
      });
      expect(new Set(cars.map((car) => car.model)).size).toBe(
        Math.min(cars.length, CAR_MODEL_IDS.length),
      );
      // 不是停放車輛的障礙物沒有車款。
      for (const obstacle of level.obstaclesFt) {
        if (obstacle.type !== 'parked_car') {
          expect(obstacle.model).toBeUndefined();
        }
      }
    },
  );

  test('同一份 JSON 重新解析，車款與碰撞盒完全相同', () => {
    for (const [path, raw] of Object.entries(rawLevels)) {
      const first = parseLevel(raw, path);
      const again = parseLevel(raw, path);
      expect(again.obstaclesFt, path).toEqual(first.obstaclesFt);
      expect(again.layout.obstacles, path).toEqual(first.layout.obstacles);
    }
  });

  test('整個第 1 世界五款車都出場，各關的組合不全相同', () => {
    const all = withCars.flatMap((level) =>
      level.obstaclesFt.flatMap((obstacle) => (obstacle.model === undefined ? [] : [obstacle.model])),
    );
    expect(new Set(all)).toEqual(new Set(CAR_MODEL_IDS));
    const firstTwo = new Set(
      withCars.map((level) =>
        level.obstaclesFt
          .flatMap((obstacle) => (obstacle.model === undefined ? [] : [obstacle.model]))
          .slice(0, 2)
          .join(','),
      ),
    );
    expect(firstTwo.size).toBeGreaterThan(1);
  });
});

describe.each(
  LEVELS.filter((level) => level.boundsFt !== undefined).map((level) => [level.id, level] as const),
)('%s 的背景車', (_id, level) => {
  const carsAt = (quality: (typeof QUALITY_LEVELS)[number]): readonly ParkedCar[] =>
    createEnvironmentLayout(level, QUALITY_PRESETS[quality].props)?.lot.parkedCars ?? [];

  test.each(QUALITY_LEVELS)('%s：每一台都有車款，佔地就是那款車的外框；重算一次完全相同', (quality) => {
    const cars = carsAt(quality);
    cars.forEach(expectFootprintOfModel);
    expect(carsAt(quality)).toEqual(cars);
  });

  test('畫質低的級別是高級別的前幾台：同一個位置的車在每個級別都是同一款', () => {
    const ultra = carsAt('ultra');
    for (const quality of QUALITY_LEVELS) {
      const cars = carsAt(quality);
      expect(cars).toEqual(ultra.slice(0, cars.length));
    }
  });

  test('有五台以上就不只兩款', () => {
    const cars = carsAt('ultra');
    if (cars.length >= CAR_MODEL_IDS.length) {
      expect(new Set(cars.map((car) => car.model)).size).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('背景車的車款跟著關卡走', () => {
  test('同一種環境的兩關，背景車的車款順序不同', () => {
    const orders = LEVELS.filter((level) => level.boundsFt !== undefined).map((level) =>
      (createEnvironmentLayout(level, QUALITY_PRESETS.ultra.props)?.lot.parkedCars ?? [])
        .map((car) => car.model)
        .join(','),
    );
    const withCars = orders.filter((order) => order !== '');
    expect(withCars.length).toBeGreaterThan(3);
    expect(new Set(withCars).size).toBeGreaterThan(withCars.length / 2);
  });

  test('原型關的停車場：車款固定、有變化，佔地是車款的外框；換種子就是另一組', () => {
    const level = LEVELS.find((each) => each.id === 'prototype');
    if (level === undefined) {
      expect.fail('找不到原型關');
    }
    const { spot, startState } = level.layout;
    const layout = (seed: number): readonly ParkedCar[] =>
      createLotLayout(spot, startState, seed, QUALITY_PRESETS.ultra.props).parkedCars;
    const cars = layout(DEFAULT_SEED);
    cars.forEach(expectFootprintOfModel);
    expect(layout(DEFAULT_SEED)).toEqual(cars);
    expect(new Set(cars.map((car) => car.model))).toEqual(new Set(CAR_MODEL_IDS));
    expect(layout(DEFAULT_SEED + 1).map((car) => car.model)).not.toEqual(cars.map((car) => car.model));
    const low = createLotLayout(spot, startState, DEFAULT_SEED, QUALITY_PRESETS.low.props).parkedCars;
    expect(low).toEqual(cars.slice(0, low.length));
  });
});
