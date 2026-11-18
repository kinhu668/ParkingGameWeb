// 車位方向指標：什麼時候顯示（距離、車位在不在畫面裡、這一局的狀態）、門檻附近不閃、箭頭在各鏡頭下指的方向、兩種語言都有字。
import { describe, expect, test } from 'vitest';
import { TARGET_POINTER_RULES } from '../src/core/gameConfig';
import { LOCALES, setLocale, t } from '../src/core/i18n';
import { targetPointer, type TargetView } from '../src/core/targetPointer';
import { degToRad, ftToM, radToDeg } from '../src/core/units';
import { worldLevels } from '../src/level/levelCatalog';
import { PROTOTYPE_LEVEL } from '../src/level/prototypeLayout';
import { startSession } from '../src/level/session';
import { createGameCamera, targetView } from '../src/render/gameCamera';
import { targetPointerReadout } from '../src/ui/hud';

const CAR = { x: 0, z: 0 };

/** 鏡頭朝北、車位中心在畫面正中央。 */
const IN_VIEW: TargetView = { yawRad: 0, spotScreen: { x: 0, y: 0 } };
/** 鏡頭朝北、車位中心在鏡頭後面。 */
const BEHIND: TargetView = { yawRad: 0, spotScreen: null };

/** 車位在世界方位 bearingDeg（0 = 北、順時針）、距離 distanceFt 的地方。 */
function spotAt(bearingDeg: number, distanceFt: number): { x: number; z: number } {
  const bearing = degToRad(bearingDeg);
  return { x: Math.sin(bearing) * ftToM(distanceFt), z: -Math.cos(bearing) * ftToM(distanceFt) };
}

describe('車位方向指標的規則', () => {
  test('車位離得遠就顯示（在畫面裡也一樣）；顯示之後要回到更近的門檻以內才收起（不會閃）', () => {
    const { showBeyondM, hideWithinM } = TARGET_POINTER_RULES;
    expect(hideWithinM).toBeLessThan(showBeyondM);
    // 門檻比一個車位的深度（18 ft）大得多：車位就在眼前時不需要箭頭。
    expect(hideWithinM).toBeGreaterThan(ftToM(30));
    expect(showBeyondM).toBeLessThanOrEqual(ftToM(50));
    const between = { x: 0, z: -(showBeyondM + hideWithinM) / 2 };
    expect(targetPointer(CAR, between, IN_VIEW, false)).toBeNull();
    expect(targetPointer(CAR, between, IN_VIEW, true)).not.toBeNull();
    expect(targetPointer(CAR, { x: 0, z: -(showBeyondM + 0.1) }, IN_VIEW, false)).not.toBeNull();
    expect(targetPointer(CAR, { x: 0, z: -(hideWithinM - 0.1) }, IN_VIEW, true)).toBeNull();
  });

  test('近的時候：車位中心不在畫面裡（在鏡頭後面或超出畫面邊緣）才顯示', () => {
    const near = spotAt(120, 25);
    expect(targetPointer(CAR, near, IN_VIEW, false)).toBeNull();
    expect(targetPointer(CAR, near, BEHIND, false)).toMatchObject({ distanceFt: 25 });
    expect(targetPointer(CAR, near, { yawRad: 0, spotScreen: { x: 1.4, y: 0 } }, false)).not.toBeNull();
    expect(targetPointer(CAR, near, { yawRad: 0, spotScreen: { x: 0.2, y: -1.2 } }, false)).not.toBeNull();
  });

  test('車位中心在畫面邊緣附近晃動時維持原狀', () => {
    const { offScreenBeyond, onScreenWithin } = TARGET_POINTER_RULES;
    expect(onScreenWithin).toBeLessThan(offScreenBeyond);
    expect(offScreenBeyond).toBeLessThanOrEqual(1);
    const near = spotAt(60, 25);
    const edge: TargetView = { yawRad: 0, spotScreen: { x: (offScreenBeyond + onScreenWithin) / 2, y: 0 } };
    expect(targetPointer(CAR, near, edge, false)).toBeNull();
    expect(targetPointer(CAR, near, edge, true)).not.toBeNull();
  });

  test('已經在車位上或正要進去（12 ft 內）不顯示，就算車位中心在鏡頭後面', () => {
    expect(TARGET_POINTER_RULES.minDistanceM).toBeCloseTo(ftToM(12), 9);
    expect(targetPointer(CAR, spotAt(180, 11.5), BEHIND, true)).toBeNull();
    expect(targetPointer(CAR, spotAt(180, 12.5), BEHIND, false)).not.toBeNull();
  });

  test('距離是車身中心到車位中心，取到 5 ft 的倍數', () => {
    expect(targetPointer(CAR, spotAt(0, 128), IN_VIEW, false)?.distanceFt).toBe(130);
    expect(targetPointer(CAR, spotAt(200, 61), BEHIND, false)?.distanceFt).toBe(60);
    expect(TARGET_POINTER_RULES.distanceStepFt).toBe(5);
  });

  test.each([
    [0, 0, 0],
    [90, 0, 90],
    [270, 0, -90],
    [180, 0, 180],
    // 鏡頭朝東（90°）：北邊的車位在畫面左邊，東邊的在正上方。
    [0, 90, -90],
    [90, 90, 0],
    [135, 90, 45],
    // 鏡頭朝南：北邊的車位在畫面下方。
    [0, 180, 180],
  ])('車位在世界方位 %d°、畫面上方是 %d° → 箭頭轉 %d°', (bearingDeg, viewDeg, expectedDeg) => {
    const view: TargetView = { yawRad: degToRad(viewDeg), spotScreen: null };
    const pointer = targetPointer(CAR, spotAt(bearingDeg, 80), view, false);
    expect(radToDeg(pointer?.angleRad ?? NaN)).toBeCloseTo(expectedDeg, 6);
  });
});

describe('HUD 的車位方向指標', () => {
  const far = worldLevels(1).find((level) => level.id === 'w1_l04');
  if (far === undefined) {
    throw new Error('找不到 w1_l04');
  }

  test('進行中、掛前進檔才顯示：停妥或失敗之後收起；掛倒檔時讓給倒車輔助層', () => {
    const session = startSession(far.layout);
    expect(targetPointerReadout(session, 'forward', IN_VIEW, false)).not.toBeNull();
    expect(targetPointerReadout(session, 'reverse', IN_VIEW, true)).toBeNull();
    expect(targetPointerReadout({ ...session, status: 'parked' }, 'forward', IN_VIEW, true)).toBeNull();
    expect(targetPointerReadout({ ...session, status: 'failed' }, 'forward', IN_VIEW, true)).toBeNull();
  });

  test('原型關（車位在正前方 60 ft）：開場箭頭朝上、60 ft；開到 36 ft 以內、車位在畫面裡就收起', () => {
    const session = startSession(PROTOTYPE_LEVEL.layout);
    const view: TargetView = { yawRad: session.vehicle.headingRad, spotScreen: { x: 0, y: 0.2 } };
    expect(targetPointerReadout(session, 'forward', view, false)).toEqual({ angleRad: 0, distanceFt: 60 });
    const { spot } = session.layout;
    const near = { ...session, vehicle: { ...session.vehicle, z: spot.z + ftToM(35) } };
    expect(targetPointerReadout(near, 'forward', view, true)).toBeNull();
  });

  test('鏡頭狀態：俯視是北方朝上；其餘鏡頭的畫面上方就是鏡頭朝向（開場時 = 車頭方向）', () => {
    for (const level of worldLevels(1)) {
      const pose = level.layout.startState;
      const { spot } = level.layout;
      expect(targetView(createGameCamera('top', pose), spot).yawRad).toBe(0);
      for (const view of ['chase_near', 'chase_far', 'hood', 'cockpit'] as const) {
        const game = createGameCamera(view, pose);
        game.snapTo(pose);
        const yaw = targetView(game, spot).yawRad;
        const offDeg = radToDeg(
          Math.abs(Math.atan2(Math.sin(yaw - pose.headingRad), Math.cos(yaw - pose.headingRad))),
        );
        expect(offDeg, `${level.id} ${view}`).toBeLessThan(1);
      }
    }
  });

  test('鏡頭狀態：車位在車頭正前方時在畫面中線上；在車後方時（引擎蓋鏡頭）在鏡頭後面', () => {
    const pose = { ...PROTOTYPE_LEVEL.layout.startState };
    const ahead = { x: pose.x + Math.sin(pose.headingRad) * 20, z: pose.z - Math.cos(pose.headingRad) * 20 };
    const behind = { x: pose.x - Math.sin(pose.headingRad) * 20, z: pose.z + Math.cos(pose.headingRad) * 20 };
    const hood = createGameCamera('hood', pose);
    hood.snapTo(pose);
    const seen = targetView(hood, ahead).spotScreen;
    expect(seen).not.toBeNull();
    expect(Math.abs(seen?.x ?? 1)).toBeLessThan(0.01);
    expect(Math.abs(seen?.y ?? 2)).toBeLessThan(1);
    expect(targetView(hood, behind).spotScreen).toBeNull();
  });

  test('兩種語言都有標籤', () => {
    for (const locale of LOCALES) {
      setLocale(locale);
      expect(t('hud.targetPointer').length).toBeGreaterThan(0);
    }
    setLocale('zh-TW');
  });
});
