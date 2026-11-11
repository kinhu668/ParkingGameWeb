// bench 統計：已知的幀時間與 draw calls 序列 → 平均 FPS、1% low、draw calls 平均與最大。
import { describe, expect, test } from 'vitest';
import { computeBenchStats, type BenchSample } from '../src/render/benchStats';
import { BENCH_CONFIG } from '../src/render/renderConfig';

const DIGITS = 9;

function samples(frameSeconds: readonly number[], drawCalls: readonly number[] = []): BenchSample[] {
  return frameSeconds.map((seconds, index) => ({
    frameSeconds: seconds,
    drawCalls: drawCalls[index] ?? 0,
  }));
}

/** 同一個值重複 count 次。 */
function repeat(value: number, count: number): number[] {
  return Array.from({ length: count }, () => value);
}

describe('computeBenchStats', () => {
  test('1% low 取的是最慢 1% 的幀', () => {
    expect(BENCH_CONFIG.lowFraction).toBe(0.01);
  });

  test('每幀都是 1/60 秒：平均 FPS 與 1% low 都是 60', () => {
    const stats = computeBenchStats(samples(repeat(1 / 60, 600)));
    expect(stats.frames).toBe(600);
    expect(stats.avgFps).toBeCloseTo(60, DIGITS);
    expect(stats.low1Fps).toBeCloseTo(60, DIGITS);
  });

  test('平均 FPS = 幀數 ÷ 總時間，不是各幀 FPS 的平均', () => {
    // 0.01 s 與 0.03 s 兩幀：2 ÷ 0.04 = 50 FPS（各幀 FPS 平均會是 66.7）。
    const stats = computeBenchStats(samples([0.01, 0.03]));
    expect(stats.avgFps).toBeCloseTo(50, DIGITS);
  });

  test('200 幀：1% = 最慢的 2 幀，取平均幀時間換算', () => {
    // 198 幀 0.01 s + 0.04 s + 0.06 s；最慢 2 幀平均 0.05 s → 20 FPS。慢的幀放在中間，確認有排序。
    const frameSeconds = [...repeat(0.01, 100), 0.04, 0.06, ...repeat(0.01, 98)];
    const stats = computeBenchStats(samples(frameSeconds));
    expect(stats.frames).toBe(200);
    expect(stats.low1Fps).toBeCloseTo(20, DIGITS);
    expect(stats.avgFps).toBeCloseTo(200 / (198 * 0.01 + 0.1), DIGITS);
  });

  test('不到 100 幀：1% 不滿一幀，取最慢的那一幀', () => {
    const stats = computeBenchStats(samples([0.01, 0.05, 0.02, 0.01]));
    expect(stats.low1Fps).toBeCloseTo(20, DIGITS);
  });

  test('199 幀仍只取 1 幀（無條件捨去）', () => {
    const stats = computeBenchStats(samples([...repeat(0.01, 197), 0.02, 0.1]));
    expect(stats.low1Fps).toBeCloseTo(10, DIGITS);
  });

  test('只有一幀也算得出來', () => {
    const stats = computeBenchStats(samples([0.025], [7]));
    expect(stats).toEqual({ frames: 1, avgFps: 40, low1Fps: 40, drawCallsAvg: 7, drawCallsMax: 7 });
  });

  test('draw calls：每幀平均與最大值', () => {
    const stats = computeBenchStats(samples(repeat(0.01, 4), [20, 22, 21, 25]));
    expect(stats.drawCallsAvg).toBe(22);
    expect(stats.drawCallsMax).toBe(25);
  });

  test('1% low 不會高於平均 FPS', () => {
    const stats = computeBenchStats(samples([0.011, 0.02, 0.016, 0.017, 0.033, 0.016]));
    expect(stats.low1Fps).toBeLessThanOrEqual(stats.avgFps);
  });

  test('不改動傳入的陣列', () => {
    const input = samples([0.03, 0.01, 0.02]);
    const copy = input.map((sample) => ({ ...sample }));
    computeBenchStats(input);
    expect(input).toEqual(copy);
  });

  test('沒有任何一幀 → 丟錯，不回傳假數字', () => {
    expect(() => computeBenchStats([])).toThrow();
  });
});
