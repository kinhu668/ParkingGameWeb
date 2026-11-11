// 固定時間步長：畫面每幀的經過時間進累加器，每滿一步（1/60 s）就該跑一步物理。
// 這裡只算「這一幀要跑幾步」，實際跑物理由呼叫端做，所以是純函式、不碰 DOM。
import { FIXED_STEP_SECONDS, MAX_FRAME_SECONDS } from './gameConfig';

/** 一幀推進累加器的結果。 */
export interface FixedLoopFrame {
  /** 這一幀要跑的物理步數。 */
  readonly steps: number;
  /** 跑完後累加器剩下的秒數，在 [0, 一步)；下一幀要傳回來。 */
  readonly accumulatorSeconds: number;
  /** 算圖內插係數，在 [0, 1)：0 = 剛好停在最新一步，接近 1 = 快到下一步。 */
  readonly alpha: number;
}

/**
 * 把一幀的經過時間加進累加器，回傳要跑幾步物理與剩餘時間。
 * 單幀時間夾在 [0, MAX_FRAME_SECONDS]：分頁切回來時不會一次補跑太多步，時間倒退也不會扣累加器。
 */
export function advanceFixedLoop(accumulatorSeconds: number, frameSeconds: number): FixedLoopFrame {
  const cappedFrameSeconds = Math.min(Math.max(frameSeconds, 0), MAX_FRAME_SECONDS);
  let remainingSeconds = accumulatorSeconds + cappedFrameSeconds;
  let steps = 0;
  while (remainingSeconds >= FIXED_STEP_SECONDS) {
    remainingSeconds -= FIXED_STEP_SECONDS;
    steps += 1;
  }
  return {
    steps,
    accumulatorSeconds: remainingSeconds,
    alpha: remainingSeconds / FIXED_STEP_SECONDS,
  };
}
