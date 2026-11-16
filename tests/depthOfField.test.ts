// 景深的純函式：各鏡頭的對焦、深度 → 模糊量。不開 WebGL。
import { describe, expect, test } from 'vitest';
import { GAME_CAMERA_VIEWS } from '../src/core/cameraView';
import { CAMERA_PRESETS } from '../src/core/urlParams';
import { blurAmount, focusForGameView, focusForPreset } from '../src/render/depthOfField';
import { POST_CONFIG } from '../src/render/renderConfig';

const DOF = POST_CONFIG.depthOfField;

describe('各鏡頭的對焦', () => {
  test('跟車鏡頭對焦在玩家車：對焦距離 = 鏡頭到車的距離，前景也模糊', () => {
    for (const view of ['chase_near', 'chase_far'] as const) {
      expect(focusForGameView(view, 9)).toEqual({ distanceM: 9, foreground: true });
      expect(focusForGameView(view, 14)).toEqual({ distanceM: 14, foreground: true });
    }
  });

  test('鏡頭被擠到貼著車：對焦距離不低於下限', () => {
    expect(focusForGameView('chase_near', 0.5)?.distanceM).toBe(DOF.minFocusM);
    expect(focusForPreset('follow', 0)?.distanceM).toBe(DOF.minFocusM);
  });

  test('引擎蓋與駕駛座：對焦在車前固定的距離，前景（眼前的車身）不模糊', () => {
    for (const view of ['hood', 'cockpit'] as const) {
      expect(focusForGameView(view, 1)).toEqual({ distanceM: DOF.onCarFocusM, foreground: false });
      expect(focusForGameView(view, 30)).toEqual(focusForGameView(view, 1));
    }
  });

  test('俯視不做景深（一般遊戲與 ?cam=top 都是）', () => {
    expect(focusForGameView('top', 40)).toBeNull();
    expect(focusForPreset('top', 45)).toBeNull();
  });

  test('每一個鏡頭都有定義；除了俯視都有對焦', () => {
    for (const view of GAME_CAMERA_VIEWS) {
      expect(focusForGameView(view, 10) === null, view).toBe(view === 'top');
    }
    for (const preset of CAMERA_PRESETS) {
      expect(focusForPreset(preset, 20) === null, preset).toBe(preset === 'top');
    }
    expect(focusForPreset('follow', 21.6)).toEqual({ distanceM: 21.6, foreground: true });
    expect(focusForPreset('spot_low', 21.6)).toEqual({ distanceM: 21.6, foreground: true });
  });
});

describe('blurAmount：深度 → 模糊量', () => {
  const chase = { distanceM: 10, foreground: true };
  const onCar = { distanceM: DOF.onCarFocusM, foreground: false };

  test('對焦的車與清楚範圍裡的東西完全不模糊', () => {
    expect(blurAmount(10, chase)).toBe(0);
    expect(blurAmount(10 * DOF.sharpNear, chase)).toBe(0);
    expect(blurAmount(10 * DOF.sharpFar, chase)).toBe(0);
    // 旁邊車位的車（離鏡頭 6–16 公尺）也是清楚的。
    for (let depth = 6; depth <= 16; depth += 1) {
      expect(blurAmount(depth, chase), `${depth} m`).toBe(0);
    }
  });

  test('越遠越模糊，到 fullFar 倍最模糊，再遠不會超過 1', () => {
    let previous = 0;
    for (let ratio = DOF.sharpFar; ratio <= DOF.fullFar; ratio += 0.2) {
      const amount = blurAmount(10 * ratio, chase);
      expect(amount).toBeGreaterThanOrEqual(previous);
      previous = amount;
    }
    expect(blurAmount(10 * DOF.fullFar, chase)).toBe(1);
    expect(blurAmount(5000, chase)).toBe(1);
    expect(blurAmount(10 * (DOF.sharpFar + DOF.fullFar) * 0.5, chase)).toBeCloseTo(0.5, 9);
  });

  test('貼近鏡頭的前景最多模糊到 nearStrength，比遠景輕', () => {
    expect(DOF.nearStrength).toBeLessThan(1);
    expect(blurAmount(10 * DOF.fullNear, chase)).toBe(DOF.nearStrength);
    expect(blurAmount(0.1, chase)).toBe(DOF.nearStrength);
    const partly = blurAmount(10 * (DOF.fullNear + DOF.sharpNear) * 0.5, chase);
    expect(partly).toBeGreaterThan(0);
    expect(partly).toBeLessThan(DOF.nearStrength);
  });

  test('貼在車上的鏡頭：眼前的引擎蓋、儀表板不模糊，遠處的樓才模糊', () => {
    for (const depth of [0.3, 1, 2, 5, DOF.onCarFocusM]) {
      expect(blurAmount(depth, onCar), `${depth} m`).toBe(0);
    }
    expect(blurAmount(DOF.onCarFocusM * DOF.fullFar, onCar)).toBe(1);
  });

  test('模糊量只跟「深度 ÷ 對焦距離」有關', () => {
    expect(blurAmount(30, { distanceM: 10, foreground: true })).toBe(
      blurAmount(60, { distanceM: 20, foreground: true }),
    );
  });
});
