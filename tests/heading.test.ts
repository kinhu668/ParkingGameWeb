import { describe, expect, test } from 'vitest';
import {
  forward,
  headingDelta,
  headingFromDirection,
  headingToRotationY,
  normalizeHeading,
  right,
  type GroundVector,
} from '../src/core/heading';
import { degToRad, radToDeg } from '../src/core/units';

const DIGITS = 12;

function expectVector(actual: GroundVector, x: number, z: number): void {
  expect(actual.x).toBeCloseTo(x, DIGITS);
  expect(actual.z).toBeCloseTo(z, DIGITS);
}

/** headingDelta 以度為單位的包裝，方便對照規格的數字。 */
function deltaDeg(fromDeg: number, toDeg: number): number {
  return radToDeg(headingDelta(degToRad(fromDeg), degToRad(toDeg)));
}

/**
 * Three.js 繞 +Y 軸右手旋轉 φ 的公式（只取 XZ 分量）：
 * x' = x cos φ + z sin φ、z' = −x sin φ + z cos φ。
 * 在這裡手寫一份，獨立於 heading.ts，用來驗算 rotation.y 的換算。
 */
function rotateAroundY(v: GroundVector, phiRad: number): GroundVector {
  const c = Math.cos(phiRad);
  const s = Math.sin(phiRad);
  return { x: v.x * c + v.z * s, z: -v.x * s + v.z * c };
}

const MODEL_FORWARD: GroundVector = { x: 0, z: -1 };
const MODEL_RIGHT: GroundVector = { x: 1, z: 0 };
const SAMPLE_HEADINGS_DEG = [0, 30, 90, 135, 180, 270, 355, -45, 400];

describe('forward：車頭方向', () => {
  test('0° 朝 −Z（北）', () => {
    expectVector(forward(degToRad(0)), 0, -1);
  });

  test('90° 朝 +X（東）', () => {
    expectVector(forward(degToRad(90)), 1, 0);
  });

  test('180° 朝 +Z（南）', () => {
    expectVector(forward(degToRad(180)), 0, 1);
  });

  test('270° 朝 −X（西），−90° 相同', () => {
    expectVector(forward(degToRad(270)), -1, 0);
    expectVector(forward(degToRad(-90)), -1, 0);
  });
});

describe('right：車身右側方向', () => {
  test('0°／90°／180°／270° 的右側分別是 +X／+Z／−X／−Z', () => {
    expectVector(right(degToRad(0)), 1, 0);
    expectVector(right(degToRad(90)), 0, 1);
    expectVector(right(degToRad(180)), -1, 0);
    expectVector(right(degToRad(270)), 0, -1);
  });

  test('與前方垂直、都是單位長', () => {
    for (const deg of SAMPLE_HEADINGS_DEG) {
      const f = forward(degToRad(deg));
      const r = right(degToRad(deg));
      expect(f.x * r.x + f.z * r.z).toBeCloseTo(0, DIGITS);
      expect(Math.hypot(f.x, f.z)).toBeCloseTo(1, DIGITS);
      expect(Math.hypot(r.x, r.z)).toBeCloseTo(1, DIGITS);
    }
  });

  test('右側是前方順時針轉 90°（從上方看）', () => {
    for (const deg of SAMPLE_HEADINGS_DEG) {
      const r = right(degToRad(deg));
      const f = forward(degToRad(deg + 90));
      expectVector(r, f.x, f.z);
    }
  });
});

describe('headingFromDirection：由方向反推', () => {
  test('四個主方向', () => {
    expect(radToDeg(headingFromDirection(0, -1))).toBeCloseTo(0, DIGITS);
    expect(radToDeg(headingFromDirection(1, 0))).toBeCloseTo(90, DIGITS);
    expect(radToDeg(headingFromDirection(0, 1))).toBeCloseTo(180, DIGITS);
    expect(radToDeg(headingFromDirection(-1, 0))).toBeCloseTo(-90, DIGITS);
  });

  test('是 forward 的反函式（差整圈視為相同）', () => {
    for (const deg of SAMPLE_HEADINGS_DEG) {
      const f = forward(degToRad(deg));
      const recovered = headingFromDirection(f.x, f.z);
      expect(headingDelta(degToRad(deg), recovered)).toBeCloseTo(0, DIGITS);
    }
  });

  test('向量不必是單位長', () => {
    expect(radToDeg(headingFromDirection(5, -5))).toBeCloseTo(45, DIGITS);
    expect(radToDeg(headingFromDirection(-0.01, 0.01))).toBeCloseTo(-135, DIGITS);
  });
});

describe('headingDelta：夾角差折到 (−180°, 180°]', () => {
  test('355° 對 3° = 8°（跨過 0°）', () => {
    expect(deltaDeg(355, 3)).toBeCloseTo(8, DIGITS);
    expect(deltaDeg(3, 355)).toBeCloseTo(-8, DIGITS);
  });

  test('0° 對 180° = 180°，反過來也是 +180° 而不是 −180°', () => {
    expect(headingDelta(0, Math.PI)).toBe(Math.PI);
    expect(headingDelta(Math.PI, 0)).toBe(Math.PI);
    expect(deltaDeg(0, 180)).toBeCloseTo(180, DIGITS);
    expect(deltaDeg(180, 0)).toBeCloseTo(180, DIGITS);
    expect(deltaDeg(90, 270)).toBeCloseTo(180, DIGITS);
  });

  test('相同方向 = 0，差整圈也是 0', () => {
    expect(deltaDeg(30, 30)).toBeCloseTo(0, DIGITS);
    expect(deltaDeg(30, 390)).toBeCloseTo(0, DIGITS);
    expect(deltaDeg(-330, 30)).toBeCloseTo(0, DIGITS);
  });

  test('正值 = 順時針、負值 = 逆時針', () => {
    expect(deltaDeg(0, 90)).toBeCloseTo(90, DIGITS);
    expect(deltaDeg(0, 270)).toBeCloseTo(-90, DIGITS);
    expect(deltaDeg(10, 182)).toBeCloseTo(172, DIGITS);
    expect(deltaDeg(10, 198)).toBeCloseTo(-172, DIGITS);
  });

  test('結果永遠落在 (−180°, 180°]', () => {
    for (let fromDeg = -720; fromDeg <= 720; fromDeg += 37) {
      for (let toDeg = -720; toDeg <= 720; toDeg += 23) {
        const delta = headingDelta(degToRad(fromDeg), degToRad(toDeg));
        expect(delta).toBeGreaterThan(-Math.PI);
        expect(delta).toBeLessThanOrEqual(Math.PI);
      }
    }
  });

  test('from 加上結果等於 to（差整圈視為相同）', () => {
    for (const fromDeg of SAMPLE_HEADINGS_DEG) {
      for (const toDeg of SAMPLE_HEADINGS_DEG) {
        const from = degToRad(fromDeg);
        const to = degToRad(toDeg);
        const reached = forward(from + headingDelta(from, to));
        const target = forward(to);
        expectVector(reached, target.x, target.z);
      }
    }
  });
});

describe('headingToRotationY：φ = −θ', () => {
  test('回傳 heading 的相反數', () => {
    expect(headingToRotationY(degToRad(90))).toBe(-Math.PI / 2);
    expect(headingToRotationY(degToRad(-35))).toBe(degToRad(35));
    expect(headingToRotationY(0)).toBeCloseTo(0, DIGITS);
  });

  test('驗算：90° → φ = −90°，本地車頭 (0, −1) 轉到 +X', () => {
    const rotated = rotateAroundY(MODEL_FORWARD, headingToRotationY(degToRad(90)));
    expectVector(rotated, 1, 0);
  });

  test('用 R_y(φ) 轉本地車頭（−Z），得到 forward(θ)', () => {
    for (const deg of SAMPLE_HEADINGS_DEG) {
      const theta = degToRad(deg);
      const expected = forward(theta);
      expectVector(rotateAroundY(MODEL_FORWARD, headingToRotationY(theta)), expected.x, expected.z);
    }
  });

  test('用 R_y(φ) 轉本地右側（+X），得到 right(θ)', () => {
    for (const deg of SAMPLE_HEADINGS_DEG) {
      const theta = degToRad(deg);
      const expected = right(theta);
      expectVector(rotateAroundY(MODEL_RIGHT, headingToRotationY(theta)), expected.x, expected.z);
    }
  });

  test('不取負號（φ = +θ）會轉錯邊：90° 會朝 −X', () => {
    const wrong = rotateAroundY(MODEL_FORWARD, degToRad(90));
    expectVector(wrong, -1, 0);
  });
});

describe('normalizeHeading：折到 [0, 2π)', () => {
  const FULL_TURN_RAD = 2 * Math.PI;

  test('已經在範圍內的值原封不動（逐位元相同）', () => {
    for (const heading of [0, 0.1, 1, degToRad(123.4), Math.PI, 6.28]) {
      expect(normalizeHeading(heading)).toBe(heading);
    }
  });

  test('負值與超過一圈的值折回來', () => {
    expect(radToDeg(normalizeHeading(degToRad(-90)))).toBeCloseTo(270, DIGITS);
    expect(radToDeg(normalizeHeading(degToRad(-1)))).toBeCloseTo(359, DIGITS);
    expect(radToDeg(normalizeHeading(degToRad(400)))).toBeCloseTo(40, DIGITS);
    expect(radToDeg(normalizeHeading(degToRad(-725)))).toBeCloseTo(355, DIGITS);
  });

  test('剛好一圈、負零、極小負值都回傳 0，不會回傳 2π', () => {
    expect(normalizeHeading(FULL_TURN_RAD)).toBe(0);
    expect(normalizeHeading(-FULL_TURN_RAD)).toBe(0);
    expect(normalizeHeading(-0)).toBe(0);
    expect(normalizeHeading(-1e-20)).toBe(0);
  });

  test('結果一律在 [0, 2π)，方向不變', () => {
    for (const degrees of [...SAMPLE_HEADINGS_DEG, -720, -360, 360, 719.5, -0.001]) {
      const heading = degToRad(degrees);
      const normalized = normalizeHeading(heading);
      expect(normalized).toBeGreaterThanOrEqual(0);
      expect(normalized).toBeLessThan(FULL_TURN_RAD);
      expectVector(forward(normalized), forward(heading).x, forward(heading).z);
    }
  });
});
