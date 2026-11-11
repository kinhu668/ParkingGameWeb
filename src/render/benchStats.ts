// 由逐幀的幀時間與 draw calls 算出 bench 統計值。純函式，不 import three、不碰 DOM。
import { BENCH_CONFIG } from './renderConfig';

/** 一幀的量測值。 */
export interface BenchSample {
  /** 這一幀與上一幀的間隔（秒）。 */
  readonly frameSeconds: number;
  /** 這一幀的 draw calls（FramePipeline.drawCalls()：場景 + 陰影貼圖 + 後製鏈的每個濾鏡）。 */
  readonly drawCalls: number;
}

export interface BenchStats {
  /** 納入統計的幀數（不含暖機）。 */
  readonly frames: number;
  /** 平均 FPS = 幀數 ÷ 總時間。 */
  readonly avgFps: number;
  /** 1% low：最慢 1% 幀（至少 1 幀）的平均幀時間換算成 FPS。 */
  readonly low1Fps: number;
  /** 每幀 draw calls 的平均。 */
  readonly drawCallsAvg: number;
  /** 每幀 draw calls 的最大值。 */
  readonly drawCallsMax: number;
}

/** 算統計值。至少要有一幀，否則沒有東西可算。 */
export function computeBenchStats(samples: readonly BenchSample[]): BenchStats {
  const frames = samples.length;
  if (frames === 0) {
    throw new Error('bench 沒有量到任何一幀');
  }

  let totalSeconds = 0;
  let totalDrawCalls = 0;
  let drawCallsMax = 0;
  for (const sample of samples) {
    totalSeconds += sample.frameSeconds;
    totalDrawCalls += sample.drawCalls;
    drawCallsMax = Math.max(drawCallsMax, sample.drawCalls);
  }

  // 最慢的幀 = 幀時間最長的幀。幀數不到 100 時 1% 不滿一幀，就取最慢的那一幀。
  const slowestFirst = samples.map((sample) => sample.frameSeconds).sort((a, b) => b - a);
  const lowFrames = Math.max(1, Math.floor(frames * BENCH_CONFIG.lowFraction));
  let lowSeconds = 0;
  for (const frameSeconds of slowestFirst.slice(0, lowFrames)) {
    lowSeconds += frameSeconds;
  }

  return {
    frames,
    avgFps: frames / totalSeconds,
    low1Fps: lowFrames / lowSeconds,
    drawCallsAvg: totalDrawCalls / frames,
    drawCallsMax,
  };
}
