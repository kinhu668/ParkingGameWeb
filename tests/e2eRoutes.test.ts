// e2e 用鍵盤照路線開車（e2e/driving.ts 的 driveRoute）：這裡用同一份規劃邏輯在物理模型上跑，
// 確認第 1 關的車頭入庫與倒車入庫兩條路線在各種幀率下都停得進去、不碰到任何東西。
// e2e 一次要幾十秒；路線或關卡改了，先在這裡知道。
import { describe, expect, it } from 'vitest';
import { W1_L01_BACK_IN, W1_L01_HEAD_IN, createRoutePlanner, type RouteLeg } from '../e2e/driving';
import { PHYSICS_HZ } from '../src/core/gameConfig';
import { sessionChallenges } from '../src/level/challenges';
import { levelById } from '../src/level/levelCatalog';
import { sessionSnapshot, startSession, stepSession, type Session } from '../src/level/session';
import { driveInputForGear } from '../src/vehicle/gearbox';

/** 模擬的真實時間上限（秒）。 */
const MAX_SECONDS = 120;
/** 這裡不看「N 秒內」那一項：隨便給一個門檻。 */
const CHALLENGE_TIME_S = 1;

/**
 * 照路線開到停妥或失敗。
 * @param stepsPerFrame 每一個畫面幀跑幾步物理（60 Hz）：1 = 60 FPS、15 = 4 FPS；按鍵在一幀裡不變
 */
function drive(levelId: string, legs: readonly RouteLeg[], stepsPerFrame: number): Session {
  const level = levelById(levelId);
  if (level === undefined) {
    throw new Error(`沒有 ${levelId}`);
  }
  const plan = createRoutePlanner(legs);
  let session = startSession(level.layout);
  for (let frame = 0; frame < (MAX_SECONDS * PHYSICS_HZ) / stepsPerFrame; frame += 1) {
    if (session.status === 'parked' || session.status === 'failed') {
      break;
    }
    const step = plan(sessionSnapshot(session));
    if (step === null) {
      break;
    }
    const input = driveInputForGear(
      {
        gas: step.keys.includes('Slash'),
        brake: step.keys.includes('Period'),
        steer: (step.keys.includes('KeyD') ? 1 : 0) - (step.keys.includes('KeyA') ? 1 : 0),
      },
      step.reverse ? 'reverse' : 'forward',
    );
    for (let index = 0; index < stepsPerFrame; index += 1) {
      session = stepSession(session, input);
    }
  }
  return session;
}

describe('e2e 的鍵盤路線（w1_l01）', () => {
  const routes: readonly (readonly [string, readonly RouteLeg[], 'head_in' | 'back_in'])[] = [
    ['車頭入庫', W1_L01_HEAD_IN, 'head_in'],
    ['倒車入庫', W1_L01_BACK_IN, 'back_in'],
  ];
  // 60、30、10、6、4 FPS。
  const framesSteps = [1, 2, 6, 10, 15] as const;

  for (const [name, legs, challenge] of routes) {
    it.each(framesSteps)(`${name}：每幀 %i 步物理都停妥、零碰撞，拿到對應的挑戰`, (stepsPerFrame) => {
      const session = drive('w1_l01', legs, stepsPerFrame);
      expect(session.status).toBe('parked');
      expect(session.collisions).toBe(0);
      const earned = sessionChallenges(session, CHALLENGE_TIME_S);
      expect(earned).toContain(challenge);
      expect(earned).not.toContain(challenge === 'head_in' ? 'back_in' : 'head_in');
    });
  }
});
