// 倒車輔助層小畫面（後視鏡、倒後鏡頭、鳥瞰）的夜間暗部增益：夜晚、雷雨把暗處抬亮到看得出內容，
// 白天與黃昏完全不動，亮部不被洗白，主畫面不受影響（只在小畫面的貼圖著色器裡做）。不開 WebGL。
import { describe, expect, test } from 'vitest';
import { WEATHER_IDS } from '../src/core/weather';
import { NO_ASSIST_LIFT, assistLiftedLuma } from '../src/render/reverseAssistViews';
import { WEATHER_PRESETS } from '../src/render/weatherPresets';

describe('各種天氣的暗部增益', () => {
  test('晴天、黃昏、雨後不抬亮（增益剛好是 1）', () => {
    for (const weather of ['clear', 'dusk', 'wet'] as const) {
      expect(WEATHER_PRESETS[weather].assistView.darkGain, weather).toBe(1);
    }
    expect(NO_ASSIST_LIFT.darkGain).toBe(1);
  });

  test('夜晚抬得最多，雷雨次之，雨天只抬一點', () => {
    const gain = (weather: 'night' | 'storm' | 'rain'): number =>
      WEATHER_PRESETS[weather].assistView.darkGain;
    expect(gain('night')).toBeGreaterThanOrEqual(4);
    expect(gain('night')).toBeGreaterThan(gain('storm'));
    expect(gain('storm')).toBeGreaterThan(gain('rain'));
    expect(gain('rain')).toBeGreaterThan(1);
    for (const weather of WEATHER_IDS) {
      const { kneeLuma } = WEATHER_PRESETS[weather].assistView;
      expect(kneeLuma).toBeGreaterThan(0.1);
      // 抬亮的上限在中間調以下：不會把暗部抬成一片白。
      expect(kneeLuma).toBeLessThanOrEqual(0.4);
    }
  });
});

describe('抬亮的曲線', () => {
  const night = WEATHER_PRESETS.night.assistView;
  const lumas = [0, 0.001, 0.003, 0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 3, 8];

  test('白天與黃昏：每個亮度都原封不動', () => {
    for (const weather of ['clear', 'dusk', 'wet'] as const) {
      for (const luma of lumas) {
        expect(assistLiftedLuma(luma, WEATHER_PRESETS[weather].assistView)).toBe(luma);
      }
    }
  });

  test('夜晚的暗處（路面、路緣、車身）亮了好幾倍：接近增益的倍數', () => {
    // 夜裡沒被路燈照到的柏油大約是 0.5–2% 的線性亮度。
    for (const luma of [0.003, 0.005, 0.01, 0.02]) {
      const lifted = assistLiftedLuma(luma, night);
      expect(lifted / luma).toBeGreaterThan(night.darkGain * 0.7);
      expect(lifted / luma).toBeLessThanOrEqual(night.darkGain);
    }
    // 2% 的暗部抬到約 8% 以上：色調映射後看得出輪廓，不是黑塊。
    expect(assistLiftedLuma(0.02, night)).toBeGreaterThan(0.08);
  });

  test('亮部不變：受光的牆、路燈、車燈不被洗白；抬亮的結果不超過上限', () => {
    for (const luma of [0.3, 0.5, 1, 3, 8]) {
      expect(assistLiftedLuma(luma, night)).toBe(luma);
    }
    for (const luma of lumas.filter((value) => value < night.kneeLuma)) {
      expect(assistLiftedLuma(luma, night)).toBeLessThanOrEqual(night.kneeLuma);
      expect(assistLiftedLuma(luma, night)).toBeGreaterThanOrEqual(luma);
    }
    expect(assistLiftedLuma(0, night)).toBe(0);
  });

  test('單調不減：原本比較亮的地方抬完仍然比較亮（明暗次序不反轉）', () => {
    for (const weather of WEATHER_IDS) {
      const view = WEATHER_PRESETS[weather].assistView;
      let previous = 0;
      for (let step = 0; step <= 2000; step += 1) {
        const lifted = assistLiftedLuma(step / 1000, view);
        expect(lifted).toBeGreaterThanOrEqual(previous);
        previous = lifted;
      }
    }
  });

  test('雷雨與雨天也抬，但比夜晚少', () => {
    const luma = 0.01;
    const lifted = (weather: 'night' | 'storm' | 'rain'): number =>
      assistLiftedLuma(luma, WEATHER_PRESETS[weather].assistView);
    expect(lifted('night')).toBeGreaterThan(lifted('storm'));
    expect(lifted('storm')).toBeGreaterThan(lifted('rain'));
    expect(lifted('rain')).toBeGreaterThan(luma);
  });
});
