// 結算面板的內容（不需要 DOM 的部分）：由一局的現況算出星數／原因、時間、碰撞、角度誤差。
import { describe, expect, test } from 'vitest';
import { obbFromFt } from '../src/level/collision';
import { REQUIRED_HOLD_STEPS } from '../src/level/parkingJudge';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import { startSession, stepSession, type Session, type SessionLayout } from '../src/level/session';
import { resultReadout } from '../src/ui/results';
import type { DriveInput } from '../src/vehicle/bicycleModel';

const IDLE: DriveInput = { throttle: 0, steer: 0, handbrake: false };
const HANDBRAKE: DriveInput = { throttle: 0, steer: 0, handbrake: true };
const THROTTLE: DriveInput = { throttle: 1, steer: 0, handbrake: false };

function run(session: Session, input: DriveInput, steps: number): Session {
  let current = session;
  for (let step = 0; step < steps; step += 1) {
    current = stepSession(current, input);
  }
  return current;
}

/** 車一開始就停在車位正中央：拉住手煞車滿判定時間就停妥。 */
const IN_SPOT_LAYOUT: SessionLayout = {
  spot: PROTOTYPE_LAYOUT.spot,
  startState: {
    ...PROTOTYPE_LAYOUT.startState,
    x: PROTOTYPE_LAYOUT.spot.x,
    z: PROTOTYPE_LAYOUT.spot.z,
  },
  rules: { timeLimitSteps: 1200, targetSteps: 600, maxCollisions: 2 },
};

describe('resultReadout', () => {
  test('還沒結束（ready、driving）→ null', () => {
    const ready = startSession(IN_SPOT_LAYOUT);
    expect(resultReadout(ready)).toBeNull();
    expect(resultReadout(run(ready, HANDBRAKE, 5))).toBeNull();
  });

  test('停妥：星數、成績時間、碰撞 n / 上限、角度誤差', () => {
    const parked = run(startSession(IN_SPOT_LAYOUT), HANDBRAKE, REQUIRED_HOLD_STEPS);
    expect(parked.status).toBe('parked');
    expect(resultReadout(parked)).toEqual({
      outcome: 'parked',
      stars: 3,
      failReason: null,
      // 判定要連續成立 1 秒（60 步）。
      time: '0:01.0',
      collisions: '0 / 2',
      angle: '0.0°',
    });
  });

  test('超時失敗：原因是 timeout，時間是到失敗那一步為止', () => {
    const layout: SessionLayout = {
      ...PROTOTYPE_LAYOUT,
      rules: { timeLimitSteps: 90, targetSteps: 60, maxCollisions: 2 },
    };
    // 轉一下方向盤開始計時，之後放著不動直到超時。
    const started = stepSession(startSession(layout), { throttle: 0, steer: 1, handbrake: false });
    const failed = run(started, IDLE, 200);
    expect(failed.status).toBe('failed');
    expect(resultReadout(failed)).toMatchObject({
      outcome: 'failed',
      stars: null,
      failReason: 'timeout',
      time: '0:01.5',
      collisions: '0 / 2',
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
    expect(resultReadout(failed)).toMatchObject({
      outcome: 'failed',
      stars: null,
      failReason: 'collisions',
      collisions: '1 / 0',
    });
  });
});
