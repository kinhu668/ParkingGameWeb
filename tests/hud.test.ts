// HUD 裡不需要 DOM 就能驗證的部分：車速文字、語言按鈕的切換目標、鏡頭名稱的翻譯鍵、
// 倒數／碰撞／檔位／角度誤差的文字，以及由一局的現況算出的顯示內容。
import { beforeEach, describe, expect, test } from 'vitest';
import { GAME_CAMERA_VIEWS } from '../src/core/cameraView';
import { DEFAULT_BINDINGS, type ControlBindings } from '../src/core/controls';
import { LOCALES, setLocale, t } from '../src/core/i18n';
import { mphToMps } from '../src/core/units';
import { degToRad, ftToM } from '../src/core/units';
import { obbFromFt } from '../src/level/collision';
import { REQUIRED_HOLD_STEPS } from '../src/level/parkingJudge';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import { startSession, stepSession, type Session, type SessionLayout } from '../src/level/session';
import type { DriveInput } from '../src/vehicle/bicycleModel';
import { fillTemplate, keyText, keysText } from '../src/ui/controlsPanel';
import { formatStars, formatTime } from '../src/ui/format';
import {
  cameraViewLabelKey,
  controlRowKeys,
  formatAngleDeg,
  formatCollisions,
  formatSpeedMph,
  gearFor,
  hudReadout,
  otherLocale,
} from '../src/ui/hud';

describe('formatSpeedMph', () => {
  test('m/s 換成 mph，固定一位小數', () => {
    expect(formatSpeedMph(0)).toBe('0.0');
    expect(formatSpeedMph(mphToMps(18))).toBe('18.0');
    expect(formatSpeedMph(mphToMps(0.5))).toBe('0.5');
    expect(formatSpeedMph(mphToMps(6.04))).toBe('6.0');
  });

  test('倒車顯示正數，不會出現 -0.0', () => {
    expect(formatSpeedMph(mphToMps(-9))).toBe('9.0');
    expect(formatSpeedMph(-0)).toBe('0.0');
    expect(formatSpeedMph(mphToMps(-0.01))).toBe('0.0');
  });
});

describe('otherLocale', () => {
  test('兩種語言互相切換，切兩次回到原本的語言', () => {
    expect(otherLocale('zh-TW')).toBe('en');
    expect(otherLocale('en')).toBe('zh-TW');
    for (const locale of LOCALES) {
      expect(otherLocale(otherLocale(locale))).toBe(locale);
    }
  });
});

describe('cameraViewLabelKey：鏡頭名稱', () => {
  beforeEach(() => {
    setLocale('zh-TW');
  });

  test('每個鏡頭模式各有自己的名稱，沒有兩個模式共用', () => {
    const keys = GAME_CAMERA_VIEWS.map(cameraViewLabelKey);
    expect(new Set(keys).size).toBe(GAME_CAMERA_VIEWS.length);
  });

  test.each([
    ['chase_near', '近距離跟車', 'Chase Cam (Near)'],
    ['chase_far', '遠距離跟車', 'Chase Cam (Far)'],
    ['hood', '引擎蓋', 'Hood Cam'],
    ['cockpit', '駕駛座', 'Cockpit'],
    ['top', '俯視', 'Top-Down'],
  ] as const)('%s：中文「%s」、英文 “%s”，切換語言後跟著變', (view, chinese, english) => {
    expect(t(cameraViewLabelKey(view))).toBe(chinese);
    setLocale('en');
    expect(t(cameraViewLabelKey(view))).toBe(english);
  });
});

describe('formatTime', () => {
  test('m:ss.s，秒補零', () => {
    expect(formatTime(0)).toBe('0:00.0');
    expect(formatTime(5)).toBe('0:05.0');
    expect(formatTime(75)).toBe('1:15.0');
    expect(formatTime(600)).toBe('10:00.0');
    expect(formatTime(61.5)).toBe('1:01.5');
  });

  test('無條件捨去到 0.1 秒；一步（1/60 秒）的倍數不會因為浮點誤差少 0.1', () => {
    expect(formatTime(59.99)).toBe('0:59.9');
    expect(formatTime(0.09)).toBe('0:00.0');
    // 4494 步 = 74.9 秒。
    expect(formatTime(4494 / 60)).toBe('1:14.9');
    expect(formatTime(18 / 60)).toBe('0:00.3');
  });

  test('負值當 0；沒有上限（Infinity）顯示破折號', () => {
    expect(formatTime(-3)).toBe('0:00.0');
    expect(formatTime(Infinity)).toBe('–:––.–');
    expect(formatTime(NaN)).toBe('–:––.–');
  });
});

describe('formatStars', () => {
  test('實心 + 空心一共 3 顆', () => {
    expect(formatStars(0)).toBe('☆☆☆');
    expect(formatStars(1)).toBe('★☆☆');
    expect(formatStars(2)).toBe('★★☆');
    expect(formatStars(3)).toBe('★★★');
    expect(formatStars(7)).toBe('★★★');
  });
});

describe('formatAngleDeg／formatCollisions', () => {
  test('角度：弧度 → 度的絕對值，一位小數', () => {
    expect(formatAngleDeg(0)).toBe('0.0°');
    expect(formatAngleDeg(degToRad(2.96))).toBe('3.0°');
    expect(formatAngleDeg(-degToRad(12.34))).toBe('12.3°');
    expect(formatAngleDeg(Math.PI)).toBe('180.0°');
  });

  test('碰撞：次數 / 上限；沒有上限只顯示次數', () => {
    expect(formatCollisions(0, 4)).toBe('0 / 4');
    expect(formatCollisions(5, 4)).toBe('5 / 4');
    expect(formatCollisions(2, Infinity)).toBe('2');
  });
});

describe('gearFor：檔位', () => {
  test('踩油門／倒車，車停著或同方向在走 → 踩的那個方向', () => {
    expect(gearFor(0, 1, 'reverse')).toBe('forward');
    expect(gearFor(0, -1, 'forward')).toBe('reverse');
    expect(gearFor(3, 1, 'reverse')).toBe('forward');
    expect(gearFor(-2, -1, 'forward')).toBe('reverse');
  });

  test('反向踩是煞車：車還在往原方向走時不換檔，煞停後才換', () => {
    expect(gearFor(3, -1, 'forward')).toBe('forward');
    expect(gearFor(-2, 1, 'reverse')).toBe('reverse');
    expect(gearFor(0, -1, 'forward')).toBe('reverse');
  });

  test('沒踩油門：滑行、停著、被彈回去都維持原本的檔位', () => {
    expect(gearFor(3, 0, 'forward')).toBe('forward');
    expect(gearFor(0, 0, 'forward')).toBe('forward');
    expect(gearFor(0, 0, 'reverse')).toBe('reverse');
    // 往前撞到東西被彈回去（車速為負），不論有沒有繼續踩油門都還是前進檔。
    expect(gearFor(-1, 0, 'forward')).toBe('forward');
    expect(gearFor(-1, 1, 'forward')).toBe('forward');
  });
});

describe('hudReadout：由一局的現況算出顯示內容', () => {
  const THROTTLE: DriveInput = { throttle: 1, steer: 0, handbrake: false };
  const IDLE_INPUT: DriveInput = { throttle: 0, steer: 0, handbrake: false };

  function repeat(session: Session, input: DriveInput, steps: number): Session {
    let current = session;
    for (let step = 0; step < steps; step += 1) {
      current = stepSession(current, input);
    }
    return current;
  }

  /** 時間上限 20 秒、碰撞上限 1、前方 2 ft 有一面牆。 */
  const layout: SessionLayout = {
    spot: PROTOTYPE_LAYOUT.spot,
    startState: PROTOTYPE_LAYOUT.startState,
    obstacles: [
      obbFromFt({ centerXFt: 0, centerZFt: -10.5, widthFt: 20, lengthFt: 2, headingDeg: 0 }),
    ],
    rules: { timeLimitSteps: 1200, targetSteps: 600, maxCollisions: 1 },
  };

  test('開始前：倒數是整個時間上限、碰撞 0 / 上限、沒有狀態面板', () => {
    expect(hudReadout(startSession(layout))).toEqual({
      speed: '0.0',
      time: '0:20.0',
      lowTime: false,
      collisions: '0 / 1',
      angle: '0.0°',
      outcome: null,
      stars: null,
      failReason: null,
    });
  });

  test('開始計時後倒數往下走；剩不到 10 秒標成偏低', () => {
    const early = repeat(startSession({ ...layout, obstacles: [] }), THROTTLE, 90);
    expect(hudReadout(early).time).toBe('0:18.5');
    expect(hudReadout(early).lowTime).toBe(false);
    const late = repeat(early, IDLE_INPUT, 540);
    expect(hudReadout(late).time).toBe('0:09.5');
    expect(hudReadout(late).lowTime).toBe(true);
  });

  test('撞到一次：碰撞 1 / 1，還沒失敗；再撞一次 → 失敗面板與原因', () => {
    let session = startSession(layout);
    while (session.collisions === 0) {
      session = stepSession(session, THROTTLE);
    }
    expect(hudReadout(session)).toMatchObject({ collisions: '1 / 1', outcome: null });

    while (session.status === 'driving') {
      session = stepSession(session, THROTTLE);
    }
    expect(hudReadout(session)).toMatchObject({
      collisions: '2 / 1',
      outcome: 'failed',
      failReason: 'collisions',
      stars: null,
      speed: '0.0',
    });
  });

  test('超時 → 失敗面板、原因是時間，倒數停在 0', () => {
    const failed = repeat(startSession({ ...layout, obstacles: [] }), { ...THROTTLE, steer: 1 }, 1201);
    expect(hudReadout(failed)).toMatchObject({
      time: '0:00.0',
      outcome: 'failed',
      failReason: 'timeout',
    });
  });

  test('停妥 → 成功面板與星數；角度誤差照車身實際的歪斜', () => {
    const tilted: SessionLayout = {
      spot: PROTOTYPE_LAYOUT.spot,
      startState: {
        ...PROTOTYPE_LAYOUT.startState,
        x: PROTOTYPE_LAYOUT.spot.x,
        z: PROTOTYPE_LAYOUT.spot.z + ftToM(0.2),
        headingRad: degToRad(4),
      },
      rules: { timeLimitSteps: 1200, targetSteps: 600, maxCollisions: 1 },
    };
    const parked = repeat(startSession(tilted), IDLE_INPUT, REQUIRED_HOLD_STEPS);
    expect(hudReadout(parked)).toMatchObject({
      angle: '4.0°',
      outcome: 'parked',
      stars: 2,
      failReason: null,
    });
  });

  test('沒有規則的配置：倒數顯示破折號、碰撞只有次數', () => {
    const readout = hudReadout(
      startSession({ spot: PROTOTYPE_LAYOUT.spot, startState: PROTOTYPE_LAYOUT.startState }),
    );
    expect(readout.time).toBe('–:––.–');
    expect(readout.collisions).toBe('0');
    expect(readout.lowTime).toBe(false);
  });
});

describe('controlRowKeys：HUD 操作說明要畫的鍵帽', () => {
  test('兩個動作一列：各列主要鍵（預設是 W S、A D、Q R）', () => {
    expect(controlRowKeys(DEFAULT_BINDINGS, ['throttle', 'reverse'])).toEqual([
      { action: 'throttle', code: 'KeyW' },
      { action: 'reverse', code: 'KeyS' },
    ]);
    expect(
      controlRowKeys(DEFAULT_BINDINGS, ['gearDrive', 'gearReverse']).map((cap) => cap.code),
    ).toEqual(['KeyQ', 'KeyR']);
  });

  test('一個動作一列：列出它全部的鍵（重來是 Backspace 與 T，不再是 R）', () => {
    expect(controlRowKeys(DEFAULT_BINDINGS, ['restart']).map((cap) => cap.code)).toEqual([
      'Backspace',
      'KeyT',
    ]);
    expect(controlRowKeys(DEFAULT_BINDINGS, ['handbrake']).map((cap) => cap.code)).toEqual([
      'Slash',
      'Space',
    ]);
    expect(controlRowKeys(DEFAULT_BINDINGS, ['brake']).map((cap) => cap.code)).toEqual(['Comma']);
  });

  test('照目前的綁定畫，不寫死', () => {
    const custom: ControlBindings = {
      ...DEFAULT_BINDINGS,
      throttle: ['KeyI', 'ArrowUp'],
      restart: ['Enter', 'KeyT'],
    };
    expect(controlRowKeys(custom, ['throttle', 'reverse']).map((cap) => cap.code)).toEqual([
      'KeyI',
      'KeyS',
    ]);
    expect(controlRowKeys(custom, ['restart']).map((cap) => cap.code)).toEqual(['Enter', 'KeyT']);
  });
});

describe('按鍵提示文字：keyText／keysText／fillTemplate', () => {
  test('鍵帽文字跟著語言走（空白鍵有翻譯，其餘照寫）', () => {
    setLocale('zh-TW');
    expect(keyText('Space')).toBe('空白鍵');
    expect(keyText('Comma')).toBe(',');
    setLocale('en');
    expect(keyText('Space')).toBe('Space');
    expect(keysText(DEFAULT_BINDINGS.restart)).toBe('Backspace / T');
    expect(keysText(DEFAULT_BINDINGS.handbrake)).toBe('/ / Space');
    expect(keysText(DEFAULT_BINDINGS.pause)).toBe('Esc');
  });

  test('fillTemplate 把 {名稱} 換成值；沒給的名稱原樣留著', () => {
    expect(fillTemplate('Press {key} to restart', { key: 'Backspace / T' })).toBe(
      'Press Backspace / T to restart',
    );
    expect(fillTemplate('{key} → {action}', { key: 'R' })).toBe('R → {action}');
    expect(fillTemplate('沒有要換的', { key: 'R' })).toBe('沒有要換的');
  });
});
