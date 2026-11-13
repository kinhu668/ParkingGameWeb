// 個別關卡的太陽方位（大賣場 w1_l03、郵局黃昏 w1_l06 的樓影要落在場地上）與晴天的亮度微調。
// 不開 WebGL：只測方位、影子的方向與天氣數值。
import { describe, expect, test } from 'vitest';
import { forward } from '../src/core/heading';
import { degToRad } from '../src/core/units';
import { WEATHER_IDS } from '../src/core/weather';
import { LEVELS, levelById } from '../src/level/levelCatalog';
import { facingSide } from '../src/props/environmentLayout';
import { directionToSun } from '../src/render/sky';
import {
  LEVEL_SUN_AZIMUTH_DEG,
  WEATHER_PRESETS,
  sunAzimuthDeg,
} from '../src/render/weatherPresets';

/** bounds 的某一邊往場地裡面的方向（世界座標 x、z）。 */
const INWARD = {
  n: { x: 0, z: 1 },
  s: { x: 0, z: -1 },
  w: { x: 1, z: 0 },
  e: { x: -1, z: 0 },
} as const;

/** 影子在地面上的方向（單位向量）：太陽的反方向。 */
function shadowDirection(azimuthDeg: number): { x: number; z: number } {
  const toSun = forward(degToRad(azimuthDeg));
  return { x: -toSun.x, z: -toSun.z };
}

/** 主建築的影子有多少是朝場地裡面落的（1 = 正對場地、0 = 沿著牆、負的 = 落在樓後面）。 */
function shadowIntoLot(levelId: string, weather: (typeof WEATHER_IDS)[number]): number {
  const level = levelById(levelId);
  if (level === undefined) {
    throw new Error(`找不到 ${levelId}`);
  }
  // 主建築在車頭起始朝向的那一邊（environmentLayout 的規則）。
  const inward = INWARD[facingSide(level.startFt.headingDeg)];
  const shadow = shadowDirection(sunAzimuthDeg(weather, levelId));
  return shadow.x * inward.x + shadow.z * inward.z;
}

describe('個別關卡的太陽方位 sunAzimuthDeg', () => {
  test('只有 w1_l03 與 w1_l06 有覆寫；其餘關卡與原型關都是這種天氣的預設', () => {
    expect(Object.keys(LEVEL_SUN_AZIMUTH_DEG).sort()).toEqual(['w1_l03', 'w1_l06']);
    for (const weather of WEATHER_IDS) {
      const preset = WEATHER_PRESETS[weather].sun.azimuthDeg;
      expect(sunAzimuthDeg(weather)).toBe(preset);
      expect(sunAzimuthDeg(weather, 'prototype')).toBe(preset);
      for (const level of LEVELS) {
        if (!(level.id in LEVEL_SUN_AZIMUTH_DEG)) {
          expect(sunAzimuthDeg(weather, level.id), level.id).toBe(preset);
        }
      }
    }
  });

  test('w1_l03（樓在南邊）：預設的晴天影子落在樓後面；覆寫後朝北落進場地，而且是斜的', () => {
    const level = levelById('w1_l03');
    expect(facingSide(level?.startFt.headingDeg ?? 0)).toBe('s');
    const preset = shadowDirection(WEATHER_PRESETS.clear.sun.azimuthDeg);
    expect(preset.z).toBeGreaterThan(0);
    expect(shadowIntoLot('w1_l03', 'clear')).toBeGreaterThan(0.85);
    const shadow = shadowDirection(sunAzimuthDeg('clear', 'w1_l03'));
    expect(shadow.z).toBeLessThan(-0.85);
    // 不是正對著牆：影子斜斜地掃進場地（橫向分量 0.2–0.5）。
    expect(Math.abs(shadow.x)).toBeGreaterThan(0.2);
    expect(Math.abs(shadow.x)).toBeLessThan(0.5);
  });

  test('w1_l06（樓在東邊）：預設的黃昏影子只擦過東緣；覆寫後朝西落進場地', () => {
    const level = levelById('w1_l06');
    expect(facingSide(level?.startFt.headingDeg ?? 0)).toBe('e');
    const preset = shadowDirection(WEATHER_PRESETS.dusk.sun.azimuthDeg);
    expect(-preset.x).toBeLessThan(0.7);
    expect(shadowIntoLot('w1_l06', 'dusk')).toBeGreaterThan(0.9);
    expect(shadowDirection(sunAzimuthDeg('dusk', 'w1_l06')).x).toBeLessThan(-0.9);
    // 不在正東：起點的車頭朝東，夕陽偏到樓的一側，不會正好壓在樓頂上把整個畫面洗白。
    expect(Math.abs(sunAzimuthDeg('dusk', 'w1_l06') - 90)).toBeGreaterThanOrEqual(15);
  });

  test('`?weather=` 換了天氣，這兩關的方位覆寫仍然適用（樓的位置沒變）', () => {
    for (const weather of WEATHER_IDS) {
      expect(sunAzimuthDeg(weather, 'w1_l03')).toBe(LEVEL_SUN_AZIMUTH_DEG.w1_l03);
      expect(sunAzimuthDeg(weather, 'w1_l06')).toBe(LEVEL_SUN_AZIMUTH_DEG.w1_l06);
      expect(shadowIntoLot('w1_l03', weather), weather).toBeGreaterThan(0.85);
      expect(shadowIntoLot('w1_l06', weather), weather).toBeGreaterThan(0.9);
    }
  });

  test('沒被連坐：w1_l05（樓在北邊、晴天）仍用預設方位，影子照舊落進場地', () => {
    expect(sunAzimuthDeg('clear', 'w1_l05')).toBe(WEATHER_PRESETS.clear.sun.azimuthDeg);
    expect(shadowIntoLot('w1_l05', 'clear')).toBeGreaterThan(0.7);
  });

  test('覆寫只動方位：仰角不變，太陽仍在地平線上方同一個高度', () => {
    for (const [levelId, weather] of [['w1_l03', 'clear'], ['w1_l06', 'dusk']] as const) {
      const elevationRad = degToRad(WEATHER_PRESETS[weather].sun.elevationDeg);
      const base = directionToSun(degToRad(WEATHER_PRESETS[weather].sun.azimuthDeg), elevationRad);
      const moved = directionToSun(degToRad(sunAzimuthDeg(weather, levelId)), elevationRad);
      expect(moved.y).toBeCloseTo(base.y, 12);
      expect(Math.hypot(moved.x, moved.y, moved.z)).toBeCloseTo(1, 12);
    }
  });
});

describe('晴天的亮度（太陽從 52° 降到 42° 之後補回一部分）', () => {
  /** 太陽直射在水平地面上的照度（相對值）。 */
  const direct = (intensity: number, elevationDeg: number): number =>
    intensity * Math.sin(degToRad(elevationDeg));

  test('仰角仍是 42°（樓影長度不變）；直射的地面亮度補回降太陽損失的三成到八成', () => {
    const sun = WEATHER_PRESETS.clear.sun;
    expect(sun.elevationDeg).toBe(42);
    const before = direct(3.1, 52);
    const lowered = direct(3.1, 42);
    const now = direct(sun.intensity, sun.elevationDeg);
    const recovered = (now - lowered) / (before - lowered);
    expect(recovered).toBeGreaterThan(0.3);
    expect(recovered).toBeLessThan(0.8);
    // 補光只多一點點：陰影裡不會跟著亮到看不出影子。
    expect(WEATHER_PRESETS.clear.hemisphere.intensity).toBeGreaterThanOrEqual(0.5);
    expect(WEATHER_PRESETS.clear.hemisphere.intensity).toBeLessThanOrEqual(0.56);
  });

  test('其他天氣的太陽與補光沒有動', () => {
    expect(WEATHER_PRESETS.rain.sun.intensity).toBe(0.9);
    expect(WEATHER_PRESETS.wet.sun.intensity).toBe(4.6);
    expect(WEATHER_PRESETS.storm.sun.intensity).toBe(0.4);
    expect(WEATHER_PRESETS.night.sun.intensity).toBe(0.55);
    expect(WEATHER_PRESETS.rain.hemisphere.intensity).toBe(0.75);
    expect(WEATHER_PRESETS.storm.hemisphere.intensity).toBe(0.5);
    expect(WEATHER_PRESETS.night.hemisphere.intensity).toBe(0.32);
  });
});
