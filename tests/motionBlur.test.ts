// 動態模糊的純函式：位移 → 拖影長度。不開 WebGL。
import { describe, expect, test } from 'vitest';
import { motionBlurLength } from '../src/render/motionBlur';
import { POST_CONFIG, QUALITY_PRESETS } from '../src/render/renderConfig';

const MOTION = POST_CONFIG.motionBlur;

describe('motionBlurLength：位移 → 拖影長度', () => {
  const settings = { shutter: 0.3, maxBlur: 0.012, taps: 6 };

  test('沒有位移、或位移低於門檻：完全不拖（定格與幾乎靜止的畫面是清楚的）', () => {
    expect(motionBlurLength(0, settings)).toBe(0);
    expect(motionBlurLength(MOTION.startDisplacement * 0.5, settings)).toBe(0);
    expect(motionBlurLength(MOTION.startDisplacement, settings)).toBe(0);
  });

  test('過了門檻平滑地變長，不會突然跳出來；拖滿之後是「位移 × 快門」', () => {
    let previous = 0;
    for (let d = MOTION.startDisplacement; d <= MOTION.fullDisplacement; d += 0.0005) {
      const length = motionBlurLength(d, settings);
      expect(length).toBeGreaterThanOrEqual(previous);
      expect(length - previous).toBeLessThan(0.001);
      previous = length;
    }
    expect(motionBlurLength(MOTION.fullDisplacement, settings)).toBeCloseTo(
      MOTION.fullDisplacement * settings.shutter,
      12,
    );
    expect(motionBlurLength(0.02, settings)).toBeCloseTo(0.02 * settings.shutter, 12);
  });

  test('不超過這個畫質級別的上限', () => {
    expect(motionBlurLength(0.1, settings)).toBe(settings.maxBlur);
    expect(motionBlurLength(0.29, settings)).toBe(settings.maxBlur);
  });

  test('一幀就移動很大（鏡頭切換）：那一幀不拖', () => {
    expect(motionBlurLength(MOTION.cutDisplacement, settings)).toBe(0);
    expect(motionBlurLength(2, settings)).toBe(0);
  });

  test('high 與 ultra 的設定：拖影都比位移短，上限只有畫面高度的百分之一、二', () => {
    for (const level of ['high', 'ultra'] as const) {
      const preset = QUALITY_PRESETS[level].motionBlur;
      if (preset === null) {
        throw new Error(`${level} 要有動態模糊`);
      }
      for (const d of [0.005, 0.01, 0.05, 0.2]) {
        expect(motionBlurLength(d, preset), `${level} ${d}`).toBeLessThan(d);
        expect(motionBlurLength(d, preset), `${level} ${d}`).toBeLessThanOrEqual(0.02);
      }
    }
  });
});
