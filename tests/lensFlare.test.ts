import { PerspectiveCamera } from 'three';
import { describe, expect, test } from 'vitest';
import { lampFlareSources, sunScreenUv } from '../src/render/lensFlare';
import { POST_CONFIG, QUALITY_PRESETS } from '../src/render/renderConfig';
import { weatherPreset } from '../src/render/weatherPresets';

const FLARE = POST_CONFIG.lensFlare;
const SUN_WEATHERS = ['clear', 'wet', 'dusk'] as const;
const LAMP_WEATHERS = ['rain', 'storm', 'night'] as const;

describe('鏡頭光暈的強度', () => {
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

describe('起光暈的路燈', () => {
  // 鏡頭在原點、離地 2 公尺，往 −Z 平視。
  function camera(): PerspectiveCamera {
    const result = new PerspectiveCamera(50, 16 / 9, 0.3, 400);
    result.position.set(0, 2, 0);
    result.lookAt(0, 2, -1);
    result.updateMatrixWorld();
    return result;
  }

  test('正前方的燈頭在畫面正中央，距離是沿視線方向的距離', () => {
    const [source] = lampFlareSources(camera(), [{ x: 0, y: 2, z: -20 }]);
    expect(source?.x).toBeCloseTo(0.5, 6);
    expect(source?.y).toBeCloseTo(0.5, 6);
    expect(source?.viewDistanceM).toBeCloseTo(20, 6);
  });

  test('鏡頭後面、畫面外的燈不算', () => {
    expect(lampFlareSources(camera(), [{ x: 0, y: 2, z: 20 }])).toEqual([]);
    expect(lampFlareSources(camera(), [{ x: 0, y: 2, z: 0 }])).toEqual([]);
    // 視角 50°：正前方 10 公尺、高出 8 公尺的燈頭在畫面上緣之外。
    expect(lampFlareSources(camera(), [{ x: 0, y: 10, z: -10 }])).toEqual([]);
    expect(lampFlareSources(camera(), [{ x: 40, y: 2, z: -10 }])).toEqual([]);
  });

  test('由近到遠，最多 lampCount 盞', () => {
    const heads = [60, 10, 40, 25, 80].map((distanceM) => ({ x: 0, y: 3, z: -distanceM }));
    const sources = lampFlareSources(camera(), heads);
    expect(sources).toHaveLength(FLARE.lampCount);
    expect(sources.map((source) => Math.round(source.viewDistanceM))).toEqual(
      [10, 25, 40, 60, 80].slice(0, FLARE.lampCount),
    );
  });

  test('近的燈全亮，遠的照距離反比變淡，不會是 0', () => {
    const near = lampFlareSources(camera(), [{ x: 0, y: 2, z: -FLARE.lampFullDistanceM / 2 }])[0];
    const far = lampFlareSources(camera(), [{ x: 0, y: 2, z: -FLARE.lampFullDistanceM * 4 }])[0];
    expect(near?.strength).toBe(1);
    expect(far?.strength).toBeCloseTo(0.25, 6);
  });

  test('只有沒有太陽、路燈亮著的天氣有路燈的光暈', () => {
    for (const weather of LAMP_WEATHERS) {
      expect(weatherPreset(weather).lampsOn, weather).toBe(true);
      expect(weatherPreset(weather).post.lampFlare, weather).toBeGreaterThan(0);
      expect(weatherPreset(weather).post.lampFlare, weather).toBeLessThanOrEqual(1);
    }
    for (const weather of SUN_WEATHERS) {
      expect(weatherPreset(weather).post.lampFlare, weather).toBe(0);
    }
  });
});
