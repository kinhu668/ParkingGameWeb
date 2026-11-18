// 車位方向指標：什麼時候顯示（距離、這一局的狀態）、門檻附近不閃、箭頭在各鏡頭下指的方向、兩種語言都有字。
import { describe, expect, test } from 'vitest';
import { TARGET_POINTER_RULES } from '../src/core/gameConfig';
import { LOCALES, setLocale, t } from '../src/core/i18n';
import { targetPointer } from '../src/core/targetPointer';
import { degToRad, ftToM, radToDeg } from '../src/core/units';
import { worldLevels } from '../src/level/levelCatalog';
import { PROTOTYPE_LEVEL } from '../src/level/prototypeLayout';
import { startSession } from '../src/level/session';
import { createGameCamera, viewYawRad } from '../src/render/gameCamera';
import { targetPointerReadout } from '../src/ui/hud';

const CAR = { x: 0, z: 0 };

/** 車位在世界方位 bearingDeg（0 = 北、順時針）、距離 distanceFt 的地方。 */
function spotAt(bearingDeg: number, distanceFt: number): { x: number; z: number } {
  const bearing = degToRad(bearingDeg);
  return { x: Math.sin(bearing) * ftToM(distanceFt), z: -Math.cos(bearing) * ftToM(distanceFt) };
}

describe('車位方向指標的規則', () => {
  test('車位離得遠才顯示；顯示之後要回到更近的門檻以內才收起（不會閃）', () => {
    const { showBeyondM, hideWithinM } = TARGET_POINTER_RULES;
    expect(hideWithinM).toBeLessThan(showBeyondM);
    // 門檻比一個車位的深度（18 ft）大得多：車位就在眼前時不需要箭頭。
    expect(hideWithinM).toBeGreaterThan(ftToM(30));
    expect(showBeyondM).toBeLessThanOrEqual(ftToM(50));
    const between = { x: 0, z: -(showBeyondM + hideWithinM) / 2 };
    expect(targetPointer(CAR, between, 0, false)).toBeNull();
    expect(targetPointer(CAR, between, 0, true)).not.toBeNull();
    expect(targetPointer(CAR, { x: 0, z: -(showBeyondM + 0.1) }, 0, false)).not.toBeNull();
    expect(targetPointer(CAR, { x: 0, z: -(hideWithinM - 0.1) }, 0, true)).toBeNull();
  });

  test('距離是車身中心到車位中心，取到 5 ft 的倍數', () => {
    expect(targetPointer(CAR, spotAt(0, 128), 0, false)?.distanceFt).toBe(130);
    expect(targetPointer(CAR, spotAt(200, 61), 0, false)?.distanceFt).toBe(60);
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
    const pointer = targetPointer(CAR, spotAt(bearingDeg, 80), degToRad(viewDeg), false);
    expect(radToDeg(pointer?.angleRad ?? NaN)).toBeCloseTo(expectedDeg, 6);
  });
});

describe('HUD 的車位方向指標', () => {
  const far = worldLevels(1).find((level) => level.id === 'w1_l04');
  if (far === undefined) {
    throw new Error('找不到 w1_l04');
  }

  test('進行中才顯示：停妥或失敗之後收起', () => {
    const session = startSession(far.layout);
    expect(targetPointerReadout(session, 0, false)).not.toBeNull();
    expect(targetPointerReadout({ ...session, status: 'parked' }, 0, true)).toBeNull();
    expect(targetPointerReadout({ ...session, status: 'failed' }, 0, true)).toBeNull();
  });

  test('原型關（車位在正前方 60 ft）：開場箭頭朝上、60 ft；開到 36 ft 以內就收起', () => {
    const session = startSession(PROTOTYPE_LEVEL.layout);
    expect(targetPointerReadout(session, session.vehicle.headingRad, false)).toEqual({
      angleRad: 0,
      distanceFt: 60,
    });
    const { spot } = session.layout;
    const near = { ...session, vehicle: { ...session.vehicle, z: spot.z + ftToM(35) } };
    expect(targetPointerReadout(near, session.vehicle.headingRad, true)).toBeNull();
  });

  test('俯視是北方朝上；其餘鏡頭的畫面上方就是鏡頭朝向（開場時 = 車頭方向）', () => {
    for (const level of worldLevels(1)) {
      const pose = level.layout.startState;
      const top = createGameCamera('top', pose);
      expect(viewYawRad(top)).toBe(0);
      for (const view of ['chase_near', 'chase_far', 'hood', 'cockpit'] as const) {
        const game = createGameCamera(view, pose);
        game.snapTo(pose);
        game.camera.updateMatrixWorld(true);
        const offDeg = radToDeg(Math.abs(Math.atan2(
          Math.sin(viewYawRad(game) - pose.headingRad),
          Math.cos(viewYawRad(game) - pose.headingRad),
        )));
        expect(offDeg, `${level.id} ${view}`).toBeLessThan(1);
      }
    }
  });

  test('兩種語言都有標籤', () => {
    for (const locale of LOCALES) {
      setLocale(locale);
      expect(t('hud.targetPointer').length).toBeGreaterThan(0);
    }
    setLocale('zh-TW');
  });
});
