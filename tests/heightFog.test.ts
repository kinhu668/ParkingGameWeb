// 高度霧與天氣的「空氣」數值：雨、雷雨、夜晚有貼地的霧氣與光柱，晴天、黃昏、雨後沒有（著色器用回 three 原本的）；
// 霧氣沿視線的積分（近地濃、高處淡、俯視比平視薄）。不開 WebGL。
import { ShaderChunk } from 'three';
import { afterAll, describe, expect, test } from 'vitest';
import { WEATHER_IDS } from '../src/core/weather';
import { ftToM } from '../src/core/units';
import {
  heightFogChunks,
  installHeightFog,
  mistAmount,
  mistOpticalDepth,
} from '../src/render/heightFog';
import { WEATHER_PRESETS } from '../src/render/weatherPresets';

const MISTY = ['rain', 'storm', 'night'] as const;
const CLEAN = ['clear', 'dusk', 'wet'] as const;
const STOCK = { ...heightFogChunks(WEATHER_PRESETS.dusk.air) };

afterAll(() => {
  installHeightFog(WEATHER_PRESETS.dusk.air);
});

describe('天氣的空氣數值', () => {
  test('雨、雷雨、夜晚有貼地霧氣與頭燈光柱，路燈光錐比黃昏亮；雷雨 ≥ 雨 > 夜晚', () => {
    for (const weather of MISTY) {
      const { air } = WEATHER_PRESETS[weather];
      expect(air.mistDensityPerM, weather).toBeGreaterThan(0);
      expect(air.mistHeightM, weather).toBeGreaterThan(0);
      expect(air.headlightShaft, weather).toBeGreaterThan(0);
      expect(air.lampShaft, weather).toBeGreaterThan(WEATHER_PRESETS.dusk.air.lampShaft);
    }
    const { rain, storm, night } = WEATHER_PRESETS;
    expect(storm.air.mistDensityPerM).toBeGreaterThanOrEqual(rain.air.mistDensityPerM);
    expect(rain.air.mistDensityPerM).toBeGreaterThan(night.air.mistDensityPerM);
    expect(storm.air.lampShaft).toBeGreaterThanOrEqual(rain.air.lampShaft);
    expect(rain.air.lampShaft).toBeGreaterThan(night.air.lampShaft);
    expect(storm.air.headlightShaft).toBeGreaterThanOrEqual(rain.air.headlightShaft);
    expect(rain.air.headlightShaft).toBeGreaterThan(night.air.headlightShaft);
  });

  test('晴天、黃昏、雨後的空氣是乾淨的：沒有霧氣、沒有頭燈光柱、路燈光錐是基準亮度', () => {
    for (const weather of CLEAN) {
      expect(WEATHER_PRESETS[weather].air, weather).toEqual({
        mistDensityPerM: 0,
        mistHeightM: 1,
        lampShaft: 1,
        headlightShaft: 0,
      });
    }
    expect([...MISTY, ...CLEAN].sort()).toEqual([...WEATHER_IDS].sort());
  });
});

describe('霧氣沿視線的積分', () => {
  const rain = WEATHER_PRESETS.rain.air;
  const eyeM = ftToM(5.5);

  test('沒有霧氣的天氣一律是 0；距離 0 也是 0', () => {
    for (const weather of CLEAN) {
      expect(mistAmount(WEATHER_PRESETS[weather].air, eyeM, 0, 200)).toBe(0);
    }
    expect(mistOpticalDepth(rain, eyeM, 0, 0)).toBe(0);
  });

  test('越遠越濃，而且在 0–1 之間', () => {
    let previous = 0;
    for (const distanceM of [5, 10, 20, 40, 80, 160]) {
      const amount = mistAmount(rain, eyeM, 0, distanceM);
      expect(amount).toBeGreaterThan(previous);
      expect(amount).toBeLessThan(1);
      previous = amount;
    }
  });

  test('同樣的距離：地面比屋頂濃得多（近地濃、高處淡）', () => {
    const ground = mistAmount(rain, eyeM, 0, 30);
    const roof = mistAmount(rain, eyeM, ftToM(40), 30);
    expect(ground).toBeGreaterThan(roof * 1.8);
    expect(roof).toBeGreaterThan(0);
  });

  test('從高處垂直往下看（?cam=top）只隔著薄薄一層，遠比平視同樣距離的地面淡', () => {
    const heightM = ftToM(150);
    const fromTop = mistAmount(rain, heightM, 0, heightM);
    const level = mistAmount(rain, eyeM, 0, heightM);
    expect(fromTop).toBeLessThan(level * 0.35);
    expect(fromTop).toBeGreaterThan(0);
    // 雨天的俯視不被霧洗白。
    expect(fromTop).toBeLessThan(0.2);
  });

  test('一般的跟車距離不被霧蓋掉：雨天 30 ft 外的地面蓋不到三成，夜晚不到一成', () => {
    expect(mistAmount(rain, eyeM, 0, ftToM(30))).toBeLessThan(0.3);
    expect(mistAmount(WEATHER_PRESETS.night.air, eyeM, 0, ftToM(30))).toBeLessThan(0.1);
    // 雷雨一百英尺外的地面明顯在霧裡。
    expect(mistAmount(WEATHER_PRESETS.storm.air, eyeM, 0, ftToM(100))).toBeGreaterThan(0.3);
  });

  test('水平視線（高度相同）不會除以零', () => {
    const amount = mistAmount(rain, eyeM, eyeM, 50);
    expect(Number.isFinite(amount)).toBe(true);
    expect(amount).toBeGreaterThan(0);
    expect(mistAmount(rain, eyeM, eyeM + 1e-7, 50)).toBeCloseTo(amount, 6);
  });
});

describe('霧的著色器片段', () => {
  test('沒有霧氣的天氣用 three 原本的片段，一個字都不改', () => {
    for (const weather of CLEAN) {
      const chunks = heightFogChunks(WEATHER_PRESETS[weather].air);
      expect(chunks).toEqual(STOCK);
    }
    expect(STOCK.fog_fragment).not.toContain('mist');
  });

  test('有霧氣的天氣：頂點多傳世界高度，片段把霧氣乘進原本的霧，濃度與厚度來自天氣', () => {
    for (const weather of MISTY) {
      const { air } = WEATHER_PRESETS[weather];
      const chunks = heightFogChunks(air);
      expect(chunks.fog_pars_vertex).toContain('vFogWorldY');
      expect(chunks.fog_vertex).toContain('vFogWorldY');
      expect(chunks.fog_pars_fragment).toContain('vFogWorldY');
      expect(chunks.fog_fragment).toContain('mistDepth');
      expect(chunks.fog_fragment).toContain(air.mistDensityPerM.toPrecision(8));
      expect(chunks.fog_fragment).toContain(air.mistHeightM.toPrecision(8));
      // 原本的線性遠霧還在。
      expect(chunks.fog_fragment).toContain('smoothstep( fogNear, fogFar, vFogDepth )');
    }
    expect(heightFogChunks(WEATHER_PRESETS.rain.air).fog_fragment).not.toBe(
      heightFogChunks(WEATHER_PRESETS.storm.air).fog_fragment,
    );
  });

  test('installHeightFog 換掉 three 的片段；換回乾淨的空氣就復原', () => {
    installHeightFog(WEATHER_PRESETS.storm.air);
    expect(ShaderChunk.fog_fragment).toContain('mistDepth');
    expect(ShaderChunk.fog_vertex).toContain('vFogWorldY');
    installHeightFog(WEATHER_PRESETS.clear.air);
    expect(ShaderChunk.fog_fragment).toBe(STOCK.fog_fragment);
    expect(ShaderChunk.fog_vertex).toBe(STOCK.fog_vertex);
    expect(ShaderChunk.fog_pars_vertex).toBe(STOCK.fog_pars_vertex);
    expect(ShaderChunk.fog_pars_fragment).toBe(STOCK.fog_pars_fragment);
  });
});
