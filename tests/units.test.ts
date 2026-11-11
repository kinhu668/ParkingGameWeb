import { describe, expect, test } from 'vitest';
import {
  degToRad,
  ftToM,
  mToFt,
  msToS,
  mphPerSToMps2,
  mphToMps,
  mps2ToMphPerS,
  mpsToMph,
  radToDeg,
} from '../src/core/units';

describe('長度 ft ↔ m', () => {
  test('1 ft = 0.3048 m（精確值）', () => {
    expect(ftToM(1)).toBe(0.3048);
    expect(mToFt(0.3048)).toBe(1);
  });

  test('已知值：1 英里 = 5280 ft = 1609.344 m；1 m ≈ 3.28084 ft', () => {
    expect(ftToM(5280)).toBeCloseTo(1609.344, 9);
    expect(mToFt(1)).toBeCloseTo(3.280839895, 9);
  });

  test('來回換算還原', () => {
    for (const feet of [0, 1.5, 4.6, 9, 15, 18, -60, 1234.5678]) {
      expect(mToFt(ftToM(feet))).toBeCloseTo(feet, 12);
    }
  });
});

describe('速度 mph ↔ m/s', () => {
  test('1 mph = 0.44704 m/s（精確值）', () => {
    expect(mphToMps(1)).toBe(0.44704);
    expect(mpsToMph(0.44704)).toBe(1);
  });

  test('已知值：60 mph = 26.8224 m/s；0.5 mph = 0.22352 m/s', () => {
    expect(mphToMps(60)).toBeCloseTo(26.8224, 12);
    expect(mphToMps(0.5)).toBeCloseTo(0.22352, 12);
  });

  test('1 mph 就是每小時 5280 ft（與 ft 的係數互相一致）', () => {
    const secondsPerHour = 3600;
    expect(mphToMps(1) * secondsPerHour).toBeCloseTo(ftToM(5280), 9);
  });

  test('來回換算還原，負值（倒車）也一樣', () => {
    for (const mph of [0, 0.49, 0.5, 9, 18, -9, -0.5]) {
      expect(mpsToMph(mphToMps(mph))).toBeCloseTo(mph, 12);
    }
  });
});

describe('加速度 mph/s ↔ m/s²', () => {
  test('1 mph/s = 0.44704 m/s²（精確值）', () => {
    expect(mphPerSToMps2(1)).toBe(0.44704);
    expect(mps2ToMphPerS(0.44704)).toBe(1);
  });

  test('已知值：6 mph/s = 2.68224 m/s²；30 mph/s = 13.4112 m/s²', () => {
    expect(mphPerSToMps2(6)).toBeCloseTo(2.68224, 12);
    expect(mphPerSToMps2(30)).toBeCloseTo(13.4112, 12);
  });

  test('來回換算還原', () => {
    for (const mphPerS of [0, 3, 6, 18, 30, -18]) {
      expect(mps2ToMphPerS(mphPerSToMps2(mphPerS))).toBeCloseTo(mphPerS, 12);
    }
  });
});

describe('角度 度 ↔ 弧度', () => {
  test('180° = π、90° = π/2、360° = 2π', () => {
    expect(degToRad(180)).toBe(Math.PI);
    expect(degToRad(90)).toBe(Math.PI / 2);
    expect(degToRad(360)).toBe(2 * Math.PI);
    expect(radToDeg(Math.PI)).toBe(180);
  });

  test('已知值：35° ≈ 0.610865 rad；1 rad ≈ 57.29578°', () => {
    expect(degToRad(35)).toBeCloseTo(0.6108652382, 10);
    expect(radToDeg(1)).toBeCloseTo(57.2957795131, 10);
  });

  test('來回換算還原，負角度也一樣', () => {
    for (const degrees of [0, 3, 8, 35, 90, 120, 270, 355, -8, -90]) {
      expect(radToDeg(degToRad(degrees))).toBeCloseTo(degrees, 12);
    }
  });
});

describe('時間 ms → s', () => {
  test('1000 ms = 1 s；一幀 60 fps ≈ 16.67 ms ≈ 1/60 s', () => {
    expect(msToS(1000)).toBe(1);
    expect(msToS(0)).toBe(0);
    expect(msToS(1000 / 60)).toBeCloseTo(1 / 60, 12);
  });
});
