// 車款表：轎車就是 VehicleConfig 的那一台；其餘車款的佔地不超過轎車，關卡的路線才不會因為換車款而開不過。
import { describe, expect, test } from 'vitest';
import { ftToM } from '../src/core/units';
import {
  CAR_MODEL_DIMS_FT,
  CAR_MODEL_IDS,
  carModelDimsM,
  isCarModelId,
} from '../src/vehicle/carModels';
import { VEHICLE_CONFIG_SI, VEHICLE_CONFIG_US } from '../src/vehicle/vehicleConfig';

describe('車款表', () => {
  test('有轎車與四款新車，轎車排第一', () => {
    expect(CAR_MODEL_IDS).toEqual(['sedan', 'rally', 'widebody', 'fastback', 'roadster']);
    expect(isCarModelId('roadster')).toBe(true);
    expect(isCarModelId('truck')).toBe(false);
    expect(isCarModelId('toString')).toBe(false);
  });

  test('轎車的尺寸就是玩家車的 VehicleConfig', () => {
    expect(CAR_MODEL_DIMS_FT.sedan).toEqual({
      lengthFt: VEHICLE_CONFIG_US.lengthFt,
      widthFt: VEHICLE_CONFIG_US.widthFt,
      heightFt: VEHICLE_CONFIG_US.heightFt,
      wheelbaseFt: VEHICLE_CONFIG_US.wheelbaseFt,
    });
    expect(carModelDimsM('sedan')).toEqual({
      lengthM: VEHICLE_CONFIG_SI.lengthM,
      widthM: VEHICLE_CONFIG_SI.widthM,
      heightM: VEHICLE_CONFIG_SI.heightM,
      wheelbaseM: VEHICLE_CONFIG_SI.wheelbaseM,
    });
  });

  test.each(CAR_MODEL_IDS)('%s：佔地不超過轎車，比例像一台車', (model) => {
    const dims = CAR_MODEL_DIMS_FT[model];
    expect(dims.lengthFt).toBeLessThanOrEqual(VEHICLE_CONFIG_US.lengthFt);
    expect(dims.widthFt).toBeLessThanOrEqual(VEHICLE_CONFIG_US.widthFt);
    expect(dims.lengthFt).toBeGreaterThanOrEqual(12);
    expect(dims.widthFt).toBeGreaterThanOrEqual(5.5);
    expect(dims.heightFt).toBeGreaterThan(3.8);
    expect(dims.heightFt).toBeLessThan(5.2);
    // 軸距佔車長的五到七成：前後懸都留得下輪拱。
    expect(dims.wheelbaseFt / dims.lengthFt).toBeGreaterThan(0.5);
    expect(dims.wheelbaseFt / dims.lengthFt).toBeLessThan(0.7);
    expect(carModelDimsM(model).lengthM).toBeCloseTo(ftToM(dims.lengthFt), 12);
  });

  test('四款新車的尺寸彼此不同（不是同一台車換皮）', () => {
    const footprints = CAR_MODEL_IDS.map((model) => {
      const dims = CAR_MODEL_DIMS_FT[model];
      return `${dims.lengthFt}x${dims.widthFt}x${dims.heightFt}x${dims.wheelbaseFt}`;
    });
    expect(new Set(footprints).size).toBe(CAR_MODEL_IDS.length);
  });
});
