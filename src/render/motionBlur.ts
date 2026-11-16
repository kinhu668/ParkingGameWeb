// 動態模糊：只算鏡頭自己的移動造成的位移。這個檔案先放純函式（位移 → 拖影長度），著色器裡用同一條式子。
import type { MotionBlurSettings } from './quality';
import { POST_CONFIG } from './renderConfig';

const MOTION = POST_CONFIG.motionBlur;

/**
 * 一個像素這一幀在畫面上移動了 displacement（以畫面高度為 1），要拖多長的影（同樣以畫面高度為 1）。
 * - 低於 startDisplacement：0（幾乎靜止時畫面完全清楚）
 * - 到 fullDisplacement 之間平滑地長到「位移 × 快門」
 * - 不超過這個畫質級別的上限 maxBlur
 * - 一幀就超過 cutDisplacement：鏡頭切換，不拖
 */
export function motionBlurLength(displacement: number, settings: MotionBlurSettings): number {
  if (displacement >= MOTION.cutDisplacement) {
    return 0;
  }
  const t = Math.min(
    Math.max(
      (displacement - MOTION.startDisplacement) /
        (MOTION.fullDisplacement - MOTION.startDisplacement),
      0,
    ),
    1,
  );
  const ramp = t * t * (3 - 2 * t);
  return Math.min(displacement * settings.shutter * ramp, settings.maxBlur);
}
