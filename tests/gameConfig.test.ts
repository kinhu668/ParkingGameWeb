import { expect, test } from 'vitest';
import {
  DEFAULT_SEED,
  MAX_FRAME_SECONDS,
  PARKING_RULES,
  PHYSICS_HZ,
} from '../src/core/gameConfig';

test('物理頻率是 60 Hz', () => {
  expect(PHYSICS_HZ).toBe(60);
});

test('單幀時間上限是有限正數，至少容得下一步物理', () => {
  expect(Number.isFinite(MAX_FRAME_SECONDS)).toBe(true);
  expect(MAX_FRAME_SECONDS).toBeGreaterThanOrEqual(1 / PHYSICS_HZ);
});

test('預設種子是 32 位元無號整數', () => {
  expect(Number.isInteger(DEFAULT_SEED)).toBe(true);
  expect(DEFAULT_SEED).toBeGreaterThanOrEqual(0);
  expect(DEFAULT_SEED).toBeLessThanOrEqual(0xffffffff);
});

test('停車判定規則與規格第 2 節一致：< 0.5 mph、±8°、持續 1 秒', () => {
  expect(PARKING_RULES).toEqual({ maxSpeedMph: 0.5, holdSeconds: 1, defaultAngleToleranceDeg: 8 });
});
