import { describe, expect, test } from 'vitest';
import { DEFAULT_SEED } from '../src/core/gameConfig';
import { createRng } from '../src/core/rng';

function take(seed: number, count: number): number[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng());
}

describe('createRng（mulberry32）', () => {
  test('同一個種子產生完全相同的序列', () => {
    expect(take(DEFAULT_SEED, 200)).toEqual(take(DEFAULT_SEED, 200));
    expect(take(0, 200)).toEqual(take(0, 200));
  });

  test('不同種子產生不同序列', () => {
    expect(take(1, 20)).not.toEqual(take(2, 20));
    expect(take(DEFAULT_SEED, 20)).not.toEqual(take(DEFAULT_SEED + 1, 20));
  });

  test('兩個產生器各有各的狀態，互不影響', () => {
    const first = createRng(7);
    const second = createRng(7);
    const fromFirst = [first(), first(), first()];
    const fromSecond = [second(), second(), second()];
    expect(fromSecond).toEqual(fromFirst);
  });

  test('已知值：mulberry32 種子 1 的前三個輸出（鎖住演算法，改壞了會被抓到）', () => {
    const rng = createRng(1);
    expect(rng()).toBe(0.6270739405881613);
    expect(rng()).toBe(0.002735721180215478);
    expect(rng()).toBe(0.5274470399599522);
  });

  test('輸出都在 [0, 1)，平均值接近 0.5', () => {
    const values = take(DEFAULT_SEED, 10000);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });

  test('種子折成無號 32 位元：−1 與 4294967295 是同一個種子，小數部分被捨去', () => {
    expect(take(-1, 10)).toEqual(take(4294967295, 10));
    expect(take(5.9, 10)).toEqual(take(5, 10));
  });
});
