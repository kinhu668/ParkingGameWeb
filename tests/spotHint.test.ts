// 「車位在後方」的 HUD 提示：什麼時候顯示（方位、距離、檔位、這一局的狀態）、門檻附近不閃、兩種語言都有字。
import { describe, expect, test } from 'vitest';
import { SPOT_HINT_RULES } from '../src/core/gameConfig';
import { LOCALES, setLocale, t } from '../src/core/i18n';
import { spotBearingRad, spotBehindHint } from '../src/core/spotHint';
import { degToRad, ftToM } from '../src/core/units';
import { LEVELS, levelById } from '../src/level/levelCatalog';
import { PROTOTYPE_LEVEL } from '../src/level/prototypeLayout';
import { startSession } from '../src/level/session';
import { spotHintVisible } from '../src/ui/hud';

/** 車在原點、車頭朝北（−Z）。 */
const CAR = { x: 0, z: 0, headingRad: 0 };

/** 車位在車頭方位 bearingDeg（順時針）、距離 distanceM 的地方。 */
function spotAt(bearingDeg: number, distanceM = 15): { x: number; z: number } {
  const bearing = degToRad(bearingDeg);
  return { x: Math.sin(bearing) * distanceM, z: -Math.cos(bearing) * distanceM };
}

describe('車位相對車頭的方位', () => {
  test('正前方 0、右邊 +90°、左邊 −90°、正後方 ±180°', () => {
    expect(spotBearingRad(CAR, spotAt(0))).toBeCloseTo(0, 9);
    expect(spotBearingRad(CAR, spotAt(90))).toBeCloseTo(Math.PI / 2, 9);
    expect(spotBearingRad(CAR, spotAt(-90))).toBeCloseTo(-Math.PI / 2, 9);
    expect(Math.abs(spotBearingRad(CAR, spotAt(180)))).toBeCloseTo(Math.PI, 9);
    expect(spotBearingRad(CAR, { x: 0, z: 0 })).toBe(0);
  });

  test('跟著車頭轉：車頭朝東時，東邊的車位在正前方、西邊的在正後方', () => {
    const east = { x: 5, z: 2, headingRad: Math.PI / 2 };
    expect(spotBearingRad(east, { x: 25, z: 2 })).toBeCloseTo(0, 9);
    expect(Math.abs(spotBearingRad(east, { x: -25, z: 2 }))).toBeCloseTo(Math.PI, 9);
  });
});

describe('要不要顯示「車位在後方」', () => {
  test('車位在前方、兩側都不顯示；在後方的扇形裡才顯示', () => {
    for (const bearing of [0, 30, -45, 90, -90, 110, -115]) {
      expect(spotBehindHint(CAR, spotAt(bearing), false), `${bearing}°`).toBe(false);
    }
    for (const bearing of [125, -130, 150, 180, -179]) {
      expect(spotBehindHint(CAR, spotAt(bearing), false), `${bearing}°`).toBe(true);
    }
  });

  test('門檻附近不閃：顯示之後要回到更前面才收起', () => {
    const between = (SPOT_HINT_RULES.showBeyondDeg + SPOT_HINT_RULES.hideWithinDeg) / 2;
    expect(SPOT_HINT_RULES.hideWithinDeg).toBeLessThan(SPOT_HINT_RULES.showBeyondDeg);
    // 還沒顯示：不出現；已經顯示：留著。
    expect(spotBehindHint(CAR, spotAt(between), false)).toBe(false);
    expect(spotBehindHint(CAR, spotAt(between), true)).toBe(true);
    expect(spotBehindHint(CAR, spotAt(SPOT_HINT_RULES.hideWithinDeg - 1), true)).toBe(false);
    // 車位在側面（90°）以前一律不算後方。
    expect(SPOT_HINT_RULES.hideWithinDeg).toBeGreaterThanOrEqual(90);
  });

  test('已經在車位上（或正要進去）不顯示', () => {
    expect(spotBehindHint(CAR, spotAt(180, SPOT_HINT_RULES.minDistanceM - 0.1), false)).toBe(false);
    expect(spotBehindHint(CAR, spotAt(180, SPOT_HINT_RULES.minDistanceM - 0.1), true)).toBe(false);
    expect(spotBehindHint(CAR, spotAt(180, SPOT_HINT_RULES.minDistanceM + 0.1), false)).toBe(true);
    // 大約一個車身長以內。
    expect(SPOT_HINT_RULES.minDistanceM).toBeGreaterThan(ftToM(8));
    expect(SPOT_HINT_RULES.minDistanceM).toBeLessThan(ftToM(20));
  });
});

describe('各關的起點', () => {
  const hintAtStart = (id: string): boolean => {
    const level = id === PROTOTYPE_LEVEL.id ? PROTOTYPE_LEVEL : levelById(id);
    if (level === undefined) {
      throw new Error(`沒有 ${id}`);
    }
    return spotHintVisible(startSession(level.layout), 'forward', false);
  };

  test('w1_l05（直線倒車）：車位在起點正後方，一開始就顯示', () => {
    expect(hintAtStart('w1_l05')).toBe(true);
  });

  test('車位在前方的關卡（原型關、w1_l01）一開始不顯示', () => {
    expect(hintAtStart(PROTOTYPE_LEVEL.id)).toBe(false);
    expect(hintAtStart('w1_l01')).toBe(false);
  });

  test('每一關的起點都算得出來（不丟例外）；至少有一關顯示、大多數不顯示', () => {
    const shown = LEVELS.filter((level) => hintAtStart(level.id)).map((level) => level.id);
    expect(shown).toContain('w1_l05');
    expect(shown.length).toBeLessThan(LEVELS.length / 2);
  });
});

describe('HUD 的顯示條件', () => {
  const level = levelById('w1_l05');
  if (level === undefined) {
    throw new Error('沒有 w1_l05');
  }
  const session = startSession(level.layout);

  test('掛倒檔時不顯示（倒車輔助層已經在看後面了）', () => {
    expect(spotHintVisible(session, 'forward', false)).toBe(true);
    expect(spotHintVisible(session, 'reverse', false)).toBe(false);
    expect(spotHintVisible(session, 'reverse', true)).toBe(false);
  });

  test('這一局已經結束（停妥或失敗）不顯示', () => {
    expect(spotHintVisible({ ...session, status: 'parked' }, 'forward', true)).toBe(false);
    expect(spotHintVisible({ ...session, status: 'failed' }, 'forward', true)).toBe(false);
    expect(spotHintVisible({ ...session, status: 'driving' }, 'forward', false)).toBe(true);
  });

  test('兩種語言都有提示文字', () => {
    const texts = LOCALES.map((locale) => {
      setLocale(locale);
      return t('hud.spotBehind');
    });
    setLocale(LOCALES[0] ?? 'zh-TW');
    expect(new Set(texts).size).toBe(LOCALES.length);
    for (const text of texts) {
      expect(text.length).toBeGreaterThan(3);
      expect(text).not.toBe('hud.spotBehind');
    }
  });
});
