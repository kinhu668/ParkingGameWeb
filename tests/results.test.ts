// 結算面板的內容（不需要 DOM 的部分）：由一局的現況算出星數／原因、時間、碰撞、角度誤差。
import { describe, expect, test } from 'vitest';
import { obbFromFt } from '../src/level/collision';
import { REQUIRED_HOLD_STEPS } from '../src/level/parkingJudge';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import { startSession, stepSession, type Session, type SessionLayout } from '../src/level/session';
import { resultReadout, type ChallengeContext } from '../src/ui/results';
import type { DriveInput } from '../src/vehicle/bicycleModel';

const IDLE: DriveInput = { throttle: 0, steer: 0 };
const BRAKE: DriveInput = { throttle: 0, steer: 0, brake: true };
const THROTTLE: DriveInput = { throttle: 1, steer: 0 };

function run(session: Session, input: DriveInput, steps: number): Session {
  let current = session;
  for (let step = 0; step < steps; step += 1) {
    current = stepSession(current, input);
  }
  return current;
}

/** 車一開始就停在車位正中央：踩住剎車滿判定時間就停妥。 */
const IN_SPOT_LAYOUT: SessionLayout = {
  spot: PROTOTYPE_LAYOUT.spot,
  startState: {
    ...PROTOTYPE_LAYOUT.startState,
    x: PROTOTYPE_LAYOUT.spot.x,
    z: PROTOTYPE_LAYOUT.spot.z,
  },
  rules: { timeLimitSteps: 1200, targetSteps: 600, maxCollisions: 2 },
};

/** 「N 秒內」10 秒、存檔裡沒有拿過任何挑戰。 */
const NO_BEST: ChallengeContext = { timeS: 10, best: () => [] };

describe('resultReadout', () => {
  test('還沒結束（ready、driving）→ null', () => {
    const ready = startSession(IN_SPOT_LAYOUT);
    expect(resultReadout(ready, NO_BEST)).toBeNull();
    expect(resultReadout(run(ready, BRAKE, 5), NO_BEST)).toBeNull();
  });

  test('停妥：星數、成績時間、碰撞 n / 上限、角度誤差', () => {
    const parked = run(startSession(IN_SPOT_LAYOUT), BRAKE, REQUIRED_HOLD_STEPS);
    expect(parked.status).toBe('parked');
    expect(resultReadout(parked, NO_BEST)).toEqual({
      outcome: 'parked',
      stars: 3,
      failReason: null,
      // 判定要連續成立 1 秒（60 步）。
      time: '0:01.0',
      collisions: '0 / 2',
      angle: '0.0°',
      // 原型關是一般車位：五項挑戰；車頭朝車位底部停在正中央，倒車入庫以外都拿到。
      challenges: [
        { id: 'time', state: 'earned' },
        { id: 'no_collisions', state: 'earned' },
        { id: 'centered', state: 'earned' },
        { id: 'head_in', state: 'earned' },
        { id: 'back_in', state: 'none' },
      ],
      challengeTimeS: 10,
    });
  });

  test('這一局沒拿到、存檔裡以前拿過的挑戰是 best；這一局拿到的不論存檔都是 earned；不認得的 id 不顯示', () => {
    const parked = run(startSession(IN_SPOT_LAYOUT), BRAKE, REQUIRED_HOLD_STEPS);
    const readout = resultReadout(parked, {
      timeS: 10,
      best: () => ['back_in', 'head_in', 'someday_new'],
    });
    expect(readout?.challenges).toEqual([
      { id: 'time', state: 'earned' },
      { id: 'no_collisions', state: 'earned' },
      { id: 'centered', state: 'earned' },
      { id: 'head_in', state: 'earned' },
      { id: 'back_in', state: 'best' },
    ]);
  });

  test('倒車入庫的朝向、偏離中心、超過 N 秒：只有零碰撞與倒車入庫；角度誤差看較近的合法朝向', () => {
    const layout: SessionLayout = {
      ...IN_SPOT_LAYOUT,
      startState: {
        ...IN_SPOT_LAYOUT.startState,
        // 往車位前方偏 1 ft（還在車位內），車頭轉 180°。
        z: IN_SPOT_LAYOUT.startState.z - 0.3048,
        headingRad: Math.PI,
      },
    };
    const parked = run(startSession(layout), BRAKE, REQUIRED_HOLD_STEPS);
    expect(parked.status).toBe('parked');
    // 判定的 1 秒就超過 0.5 秒的門檻。
    const readout = resultReadout(parked, { timeS: 0.5, best: () => ['time'] });
    expect(readout?.angle).toBe('0.0°');
    expect(readout?.stars).toBe(3);
    expect(readout?.challengeTimeS).toBe(0.5);
    expect(readout?.challenges).toEqual([
      { id: 'time', state: 'best' },
      { id: 'no_collisions', state: 'earned' },
      { id: 'centered', state: 'none' },
      { id: 'head_in', state: 'none' },
      { id: 'back_in', state: 'earned' },
    ]);
  });

  test('路邊平行停車的車位只有三項', () => {
    const layout: SessionLayout = {
      ...IN_SPOT_LAYOUT,
      spot: { ...IN_SPOT_LAYOUT.spot, headInHeadingRad: null },
    };
    const parked = run(startSession(layout), BRAKE, REQUIRED_HOLD_STEPS);
    expect(resultReadout(parked, NO_BEST)?.challenges).toEqual([
      { id: 'time', state: 'earned' },
      { id: 'no_collisions', state: 'earned' },
      { id: 'centered', state: 'earned' },
    ]);
  });

  test('超時失敗：原因是 timeout，時間是到失敗那一步為止', () => {
    const layout: SessionLayout = {
      ...PROTOTYPE_LAYOUT,
      rules: { timeLimitSteps: 90, targetSteps: 60, maxCollisions: 2 },
    };
    // 轉一下方向盤開始計時，之後放著不動直到超時。
    const started = stepSession(startSession(layout), { throttle: 0, steer: 1 });
    const failed = run(started, IDLE, 200);
    expect(failed.status).toBe('failed');
    expect(resultReadout(failed, NO_BEST)).toMatchObject({
      outcome: 'failed',
      stars: null,
      failReason: 'timeout',
      time: '0:01.5',
      collisions: '0 / 2',
      // 失敗的一局沒有挑戰（那一排不顯示）。
      challenges: [],
    });
  });

  test('碰撞太多次失敗：原因是 collisions，碰撞數超過上限', () => {
    const layout: SessionLayout = {
      spot: PROTOTYPE_LAYOUT.spot,
      startState: PROTOTYPE_LAYOUT.startState,
      obstacles: [
        obbFromFt({ centerXFt: 0, centerZFt: -10.5, widthFt: 20, lengthFt: 2, headingDeg: 0 }),
      ],
      rules: { timeLimitSteps: 6000, targetSteps: 600, maxCollisions: 0 },
    };
    const failed = run(startSession(layout), THROTTLE, 300);
    expect(failed.status).toBe('failed');
    expect(resultReadout(failed, NO_BEST)).toMatchObject({
      outcome: 'failed',
      stars: null,
      failReason: 'collisions',
      collisions: '1 / 0',
    });
  });
});
