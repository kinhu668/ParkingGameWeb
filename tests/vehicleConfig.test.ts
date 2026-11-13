import { describe, expect, test } from 'vitest';
import { degToRad, ftToM, mphPerSToMps2, mphToMps } from '../src/core/units';
import { VEHICLE_CONFIG_SI, VEHICLE_CONFIG_US } from '../src/vehicle/vehicleConfig';

describe('VEHICLE_CONFIG_US 與規格第 4 節逐項一致', () => {
  test('最高速度 18 mph、倒車 9 mph', () => {
    expect(VEHICLE_CONFIG_US.maxSpeedMph).toBe(18);
    expect(VEHICLE_CONFIG_US.maxReverseSpeedMph).toBe(9);
  });

  test('加速度 6、煞車 18、滑行減速 3 mph/s', () => {
    expect(VEHICLE_CONFIG_US.accelerationMphPerS).toBe(6);
    expect(VEHICLE_CONFIG_US.brakeMphPerS).toBe(18);
    expect(VEHICLE_CONFIG_US.coastDecelMphPerS).toBe(3);
  });

  test('最大轉向角 35°、打方向盤 90°/s、回正 120°/s', () => {
    expect(VEHICLE_CONFIG_US.maxSteerDeg).toBe(35);
    expect(VEHICLE_CONFIG_US.steerRateDegPerS).toBe(90);
    expect(VEHICLE_CONFIG_US.steerReturnRateDegPerS).toBe(120);
  });

  test('軸距 9 ft、車身長 15 ft、寬 6 ft、高 4.6 ft', () => {
    expect(VEHICLE_CONFIG_US.wheelbaseFt).toBe(9);
    expect(VEHICLE_CONFIG_US.lengthFt).toBe(15);
    expect(VEHICLE_CONFIG_US.widthFt).toBe(6);
    expect(VEHICLE_CONFIG_US.heightFt).toBe(4.6);
  });

  test('只有這 12 個數值，沒有多也沒有少', () => {
    expect(VEHICLE_CONFIG_US).toEqual({
      maxSpeedMph: 18,
      maxReverseSpeedMph: 9,
      accelerationMphPerS: 6,
      brakeMphPerS: 18,
      coastDecelMphPerS: 3,
      maxSteerDeg: 35,
      steerRateDegPerS: 90,
      steerReturnRateDegPerS: 120,
      wheelbaseFt: 9,
      lengthFt: 15,
      widthFt: 6,
      heightFt: 4.6,
    });
  });
});

describe('VEHICLE_CONFIG_SI 等於經 units.ts 換算的結果', () => {
  test('逐項等於對應美制數值的換算', () => {
    expect(VEHICLE_CONFIG_SI).toEqual({
      maxSpeedMps: mphToMps(VEHICLE_CONFIG_US.maxSpeedMph),
      maxReverseSpeedMps: mphToMps(VEHICLE_CONFIG_US.maxReverseSpeedMph),
      accelerationMps2: mphPerSToMps2(VEHICLE_CONFIG_US.accelerationMphPerS),
      brakeMps2: mphPerSToMps2(VEHICLE_CONFIG_US.brakeMphPerS),
      coastDecelMps2: mphPerSToMps2(VEHICLE_CONFIG_US.coastDecelMphPerS),
      maxSteerRad: degToRad(VEHICLE_CONFIG_US.maxSteerDeg),
      steerRateRadPerS: degToRad(VEHICLE_CONFIG_US.steerRateDegPerS),
      steerReturnRateRadPerS: degToRad(VEHICLE_CONFIG_US.steerReturnRateDegPerS),
      wheelbaseM: ftToM(VEHICLE_CONFIG_US.wheelbaseFt),
      lengthM: ftToM(VEHICLE_CONFIG_US.lengthFt),
      widthM: ftToM(VEHICLE_CONFIG_US.widthFt),
      heightM: ftToM(VEHICLE_CONFIG_US.heightFt),
    });
  });

  // 手算的 SI 數字，不經 units.ts，防止換算函式與設定一起錯。
  test('速度：18 mph = 8.04672 m/s、9 mph = 4.02336 m/s', () => {
    expect(VEHICLE_CONFIG_SI.maxSpeedMps).toBeCloseTo(8.04672, 12);
    expect(VEHICLE_CONFIG_SI.maxReverseSpeedMps).toBeCloseTo(4.02336, 12);
  });

  test('加減速：6／18／3 mph/s = 2.68224／8.04672／1.34112 m/s²', () => {
    expect(VEHICLE_CONFIG_SI.accelerationMps2).toBeCloseTo(2.68224, 12);
    expect(VEHICLE_CONFIG_SI.brakeMps2).toBeCloseTo(8.04672, 12);
    expect(VEHICLE_CONFIG_SI.coastDecelMps2).toBeCloseTo(1.34112, 12);
  });

  test('轉向：35° = 7π/36、90°/s = π/2、120°/s = 2π/3', () => {
    expect(VEHICLE_CONFIG_SI.maxSteerRad).toBeCloseTo((7 * Math.PI) / 36, 12);
    expect(VEHICLE_CONFIG_SI.steerRateRadPerS).toBeCloseTo(Math.PI / 2, 12);
    expect(VEHICLE_CONFIG_SI.steerReturnRateRadPerS).toBeCloseTo((2 * Math.PI) / 3, 12);
  });

  test('尺寸：9／15／6／4.6 ft = 2.7432／4.572／1.8288／1.40208 m', () => {
    expect(VEHICLE_CONFIG_SI.wheelbaseM).toBeCloseTo(2.7432, 12);
    expect(VEHICLE_CONFIG_SI.lengthM).toBeCloseTo(4.572, 12);
    expect(VEHICLE_CONFIG_SI.widthM).toBeCloseTo(1.8288, 12);
    expect(VEHICLE_CONFIG_SI.heightM).toBeCloseTo(1.40208, 12);
  });
});
