// 天空與太陽方向裡不必開 WebGL 就能驗證的部分：太陽方向的換算（天空與 DirectionalLight 共用）、地平線的霾。
import { Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { degToRad } from '../src/core/units';
import { FOG_CONFIG, SKY_CONFIG, SUN_CONFIG } from '../src/render/renderConfig';
import { SUN_DIRECTION, directionToSun, groundBlendAt, hazeOpacityAt } from '../src/render/sky';

const DIGITS = 9;

describe('太陽方向 directionToSun', () => {
  test('回傳單位向量', () => {
    for (const [azimuthDeg, elevationDeg] of [
      [0, 0],
      [-32, 9],
      [135, 60],
      [270, 89],
    ] as const) {
      const direction = directionToSun(degToRad(azimuthDeg), degToRad(elevationDeg));
      expect(Math.hypot(direction.x, direction.y, direction.z)).toBeCloseTo(1, DIGITS);
    }
  });

  test('方位用 heading 約定：0 = 北（−Z）、90° = 東（+X）、180° = 南（+Z）、270° = 西（−X）', () => {
    const north = directionToSun(0, 0);
    expect(north.x).toBeCloseTo(0, DIGITS);
    expect(north.z).toBeCloseTo(-1, DIGITS);

    const east = directionToSun(degToRad(90), 0);
    expect(east.x).toBeCloseTo(1, DIGITS);
    expect(east.z).toBeCloseTo(0, DIGITS);

    const south = directionToSun(degToRad(180), 0);
    expect(south.x).toBeCloseTo(0, DIGITS);
    expect(south.z).toBeCloseTo(1, DIGITS);

    const west = directionToSun(degToRad(270), 0);
    expect(west.x).toBeCloseTo(-1, DIGITS);
    expect(west.z).toBeCloseTo(0, DIGITS);
  });

  test('仰角只決定高度：y = sin(仰角)，水平長度 = cos(仰角)；正上方時水平分量為 0', () => {
    const direction = directionToSun(degToRad(40), degToRad(30));
    expect(direction.y).toBeCloseTo(0.5, DIGITS);
    expect(Math.hypot(direction.x, direction.z)).toBeCloseTo(Math.cos(degToRad(30)), DIGITS);

    const zenith = directionToSun(degToRad(123), degToRad(90));
    expect(zenith.y).toBeCloseTo(1, DIGITS);
    expect(Math.hypot(zenith.x, zenith.z)).toBeCloseTo(0, DIGITS);
  });
});

describe('遊戲場景的太陽 SUN_DIRECTION', () => {
  test('就是 SUN_CONFIG 的方位與仰角（天空的太陽位置與 DirectionalLight 共用這個向量）', () => {
    expect(SUN_DIRECTION).toEqual(
      directionToSun(degToRad(SUN_CONFIG.azimuthDeg), degToRad(SUN_CONFIG.elevationDeg)),
    );
  });

  test('黃昏：太陽在地平線上方、很低，不是正午也不是夜晚', () => {
    expect(SUN_CONFIG.elevationDeg).toBeGreaterThan(3);
    expect(SUN_CONFIG.elevationDeg).toBeLessThan(20);
    expect(SUN_DIRECTION.y).toBeGreaterThan(0);
  });

  test('在車的左前方（西北）：從起點朝北開，跟車鏡頭看得到太陽', () => {
    // 朝北是 −Z；西是 −X。
    expect(SUN_DIRECTION.z).toBeLessThan(0);
    expect(SUN_DIRECTION.x).toBeLessThan(0);
    // 與正北的夾角小於近距離跟車鏡頭的水平半視角（大約 44°）。
    const toNorth = new Vector3(SUN_DIRECTION.x, 0, SUN_DIRECTION.z).angleTo(new Vector3(0, 0, -1));
    expect(toNorth).toBeLessThan(degToRad(44));
  });

  test('影子很長：車高的 4 倍以上', () => {
    expect(1 / Math.tan(degToRad(SUN_CONFIG.elevationDeg))).toBeGreaterThan(4);
  });
});

describe('地平線的霾（遠處的地面融進天空）', () => {
  test('地平線與以下完全不透明：那一圈就是霧色', () => {
    expect(hazeOpacityAt(0)).toBe(1);
    expect(hazeOpacityAt(-5)).toBe(1);
    expect(hazeOpacityAt(-90)).toBe(1);
  });

  test('往上單調變淡，到 hazeTopDeg 以上完全透明', () => {
    let previous = hazeOpacityAt(0);
    for (let elevationDeg = 0.5; elevationDeg <= FOG_CONFIG.hazeTopDeg; elevationDeg += 0.5) {
      const opacity = hazeOpacityAt(elevationDeg);
      expect(opacity).toBeLessThan(previous);
      expect(opacity).toBeGreaterThanOrEqual(0);
      previous = opacity;
    }
    expect(hazeOpacityAt(FOG_CONFIG.hazeTopDeg)).toBe(0);
    expect(hazeOpacityAt(FOG_CONFIG.hazeTopDeg + 1)).toBe(0);
    expect(hazeOpacityAt(90)).toBe(0);
  });

  test('沒有硬邊：地平線上方第一度只淡一點，頂端附近已經幾乎透明', () => {
    expect(hazeOpacityAt(1)).toBeGreaterThan(0.7);
    expect(hazeOpacityAt(FOG_CONFIG.hazeTopDeg - 0.5)).toBeLessThan(0.02);
  });

  test('地平線以上是霧色，以下漸漸換成地面反彈色', () => {
    expect(groundBlendAt(10)).toBe(0);
    expect(groundBlendAt(0)).toBe(0);
    expect(groundBlendAt(-FOG_CONFIG.groundFadeDeg / 2)).toBeCloseTo(0.5, DIGITS);
    expect(groundBlendAt(-FOG_CONFIG.groundFadeDeg)).toBe(1);
    expect(groundBlendAt(-90)).toBe(1);
  });

  test('天空的亮度倍率是正的（霾烘進貼圖時要除以它）', () => {
    expect(SKY_CONFIG.intensity).toBeGreaterThan(0);
    expect(SKY_CONFIG.environmentIntensity).toBeGreaterThan(0);
  });
});
