import { PerspectiveCamera } from 'three';
import { describe, expect, test } from 'vitest';
import { WEATHER_IDS } from '../src/core/weather';
import { flareSourceWeight, sunScreenUv } from '../src/render/lensFlare';
import { LOT_PROPS_CONFIG, POST_CONFIG, QUALITY_PRESETS } from '../src/render/renderConfig';
import { weatherBloom, weatherPreset } from '../src/render/weatherPresets';

const FLARE = POST_CONFIG.lensFlare;
const SUN_WEATHERS = ['clear', 'wet', 'dusk'] as const;
const LAMP_WEATHERS = ['rain', 'storm', 'night'] as const;

describe('鏡頭光暈的光源遮罩', () => {
  test('暗的像素不是光源；越亮權重越高，到 sourceMaxLuma 為 1', () => {
    expect(flareSourceWeight(0, true, 1)).toBe(0);
    expect(flareSourceWeight(FLARE.sourceMinLuma, true, 1)).toBe(0);
    expect(flareSourceWeight(FLARE.sourceMaxLuma, true, 1)).toBe(1);
    expect(flareSourceWeight(POST_CONFIG.bloomMaxLuma, true, 1)).toBe(1);
    let previous = 0;
    for (let luma = 0; luma <= POST_CONFIG.bloomMaxLuma; luma += 0.25) {
      const weight = flareSourceWeight(luma, true, 1);
      expect(weight).toBeGreaterThanOrEqual(previous);
      previous = weight;
    }
  });

  test('有太陽的天氣：只有天上的太陽是光源，車漆與積水上再亮的反光都不是', () => {
    for (const weather of SUN_WEATHERS) {
      const scale = weatherPreset(weather).post.flareSurfaceScale;
      // 太陽的反光進泛光時最亮就是上限 bloomMaxLuma。
      expect(flareSourceWeight(POST_CONFIG.bloomMaxLuma, false, scale)).toBe(0);
      expect(flareSourceWeight(POST_CONFIG.bloomMaxLuma, true, scale)).toBe(1);
    }
  });

  test('沒有太陽的天氣：路燈的燈殼是光源', () => {
    const lampLuma = LOT_PROPS_CONFIG.lampGlowIntensity.hdr;
    for (const weather of LAMP_WEATHERS) {
      const scale = weatherPreset(weather).post.flareSurfaceScale;
      expect(flareSourceWeight(lampLuma, false, scale)).toBe(1);
    }
  });

  test('光源的亮度範圍在泛光的上限之內，而且全滿的亮度高過每一種天氣的泛光門檻', () => {
    expect(FLARE.sourceMinLuma).toBeGreaterThan(0);
    expect(FLARE.sourceMaxLuma).toBeGreaterThan(FLARE.sourceMinLuma);
    expect(FLARE.sourceMaxLuma).toBeLessThan(POST_CONFIG.bloomMaxLuma);
    for (const level of ['high', 'ultra'] as const) {
      const bloom = QUALITY_PRESETS[level].bloom;
      expect(bloom).not.toBeNull();
      if (bloom === null) {
        continue;
      }
      for (const weather of WEATHER_IDS) {
        expect(FLARE.sourceMaxLuma).toBeGreaterThanOrEqual(
          weatherBloom(bloom, weatherPreset(weather).post).threshold,
        );
      }
    }
  });

  test('光暈很輕：條紋與鬼影的強度都遠小於 1，ultra 不比 high 弱；low、medium 沒有', () => {
    expect(QUALITY_PRESETS.low.lensFlare).toBeNull();
    expect(QUALITY_PRESETS.medium.lensFlare).toBeNull();
    const high = QUALITY_PRESETS.high.lensFlare;
    const ultra = QUALITY_PRESETS.ultra.lensFlare;
    expect(high).not.toBeNull();
    expect(ultra).not.toBeNull();
    if (high === null || ultra === null) {
      return;
    }
    for (const flare of [high, ultra]) {
      expect(flare.streak).toBeGreaterThan(0);
      expect(flare.streak).toBeLessThan(0.2);
      expect(flare.ghosts).toBeGreaterThan(0);
      expect(flare.ghosts).toBeLessThan(0.2);
    }
    expect(ultra.streak).toBeGreaterThanOrEqual(high.streak);
    expect(ultra.ghosts).toBeGreaterThanOrEqual(high.ghosts);
  });
});

describe('太陽在畫面上的位置', () => {
  function cameraLooking(x: number, y: number, z: number): PerspectiveCamera {
    const camera = new PerspectiveCamera(50, 16 / 9, 0.3, 400);
    camera.position.set(3, 2, -5);
    camera.lookAt(3 + x, 2 + y, -5 + z);
    camera.updateMatrixWorld();
    return camera;
  }

  test('正對太陽：在畫面正中央；鏡頭平移不影響（太陽在無限遠）', () => {
    const uv = sunScreenUv(cameraLooking(0, 0.3, -1), { x: 0, y: 0.3, z: -1 });
    expect(uv?.x).toBeCloseTo(0.5, 6);
    expect(uv?.y).toBeCloseTo(0.5, 6);
  });

  test('太陽在視線上方、右方：畫面座標往上、往右', () => {
    const camera = cameraLooking(0, 0, -1);
    const up = sunScreenUv(camera, { x: 0, y: 0.2, z: -1 });
    expect(up?.x).toBeCloseTo(0.5, 6);
    expect(up?.y).toBeGreaterThan(0.5);
    expect(up?.y).toBeLessThan(1);
    const right = sunScreenUv(camera, { x: 0.2, y: 0, z: -1 });
    expect(right?.x).toBeGreaterThan(0.5);
    expect(right?.y).toBeCloseTo(0.5, 6);
    // 視角 50°：仰角超過 25° 就出了畫面上緣。
    const above = sunScreenUv(camera, { x: 0, y: 1, z: -1 });
    expect(above?.y).toBeGreaterThan(1);
  });

  test('太陽在鏡頭後面或正側面：沒有', () => {
    const camera = cameraLooking(0, 0, -1);
    expect(sunScreenUv(camera, { x: 0, y: 0.3, z: 1 })).toBeNull();
    expect(sunScreenUv(camera, { x: 1, y: 0, z: 0 })).toBeNull();
  });

  test('只有看得到太陽的天氣有太陽的光暈', () => {
    for (const weather of SUN_WEATHERS) {
      expect(weatherPreset(weather).post.sunFlare, weather).toBeGreaterThan(0);
      expect(weatherPreset(weather).post.sunFlare, weather).toBeLessThanOrEqual(1);
    }
    for (const weather of LAMP_WEATHERS) {
      expect(weatherPreset(weather).post.sunFlare, weather).toBe(0);
    }
  });
});
