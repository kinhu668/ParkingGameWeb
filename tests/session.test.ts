// 一局遊戲：起始配置、開進車位後停妥、停妥後不再接受輸入、重來；
// 碰撞（退回上一步、反彈、冷卻、不穿模）、計時起算、兩種失敗、星數。
import { describe, expect, test } from 'vitest';
import { COLLISION_RULES, FIXED_STEP_SECONDS } from '../src/core/gameConfig';
import { forward, headingDelta, right } from '../src/core/heading';
import { createRng } from '../src/core/rng';
import { degToRad, ftToM, mToFt, mphToMps, mpsToMph } from '../src/core/units';
import { obbFromFt, vehicleHits, type Obb } from '../src/level/collision';
import { levelById } from '../src/level/levelCatalog';
import { REQUIRED_HOLD_STEPS, parkingConditionsMet } from '../src/level/parkingJudge';
import { PROTOTYPE_LAYOUT, PROTOTYPE_LAYOUT_FT, PROTOTYPE_LEVEL } from '../src/level/prototypeLayout';
import { UNLIMITED_RULES, type SessionRules } from '../src/level/scoring';
import {
  COLLISION_COOLDOWN_STEPS,
  hasDriveInput,
  restartSession,
  sessionSnapshot,
  startSession,
  stepSession,
  type Session,
  type SessionLayout,
} from '../src/level/session';
import { stepVehicle, type DriveInput } from '../src/vehicle/bicycleModel';
import { IDLE, inputsToStopAtSpotCenter } from './driveHelpers';

const FULL_THROTTLE: DriveInput = { ...IDLE, throttle: 1 };
const FULL_REVERSE: DriveInput = { ...IDLE, throttle: -1 };
const STEER_RIGHT: DriveInput = { ...IDLE, steer: 1 };

/** 依序餵一串輸入。 */
function run(session: Session, inputs: readonly DriveInput[]): Session {
  let current = session;
  for (const input of inputs) {
    current = stepSession(current, input);
  }
  return current;
}

/** 同一個輸入連跑 steps 步。 */
function repeat(session: Session, input: DriveInput, steps: number): Session {
  return run(
    session,
    Array.from({ length: steps }, () => input),
  );
}

/** 從原型場景的起點直線開進車位並停下（還沒等滿 1 秒）。 */
function driveIntoPrototypeSpot(): Session {
  const inputs = inputsToStopAtSpotCenter(PROTOTYPE_LAYOUT.startState, PROTOTYPE_LAYOUT.spot, 1);
  return run(startSession(PROTOTYPE_LAYOUT), inputs);
}

/** 車一開始就靜止停在車位正中央的配置。 */
const CENTERED_LAYOUT: SessionLayout = {
  spot: PROTOTYPE_LAYOUT.spot,
  startState: {
    ...PROTOTYPE_LAYOUT.startState,
    x: PROTOTYPE_LAYOUT.spot.x,
    z: PROTOTYPE_LAYOUT.spot.z,
  },
};

describe('原型場景的配置', () => {
  const { spot, startState } = PROTOTYPE_LAYOUT;

  test('車位 9×18 ft', () => {
    expect(PROTOTYPE_LAYOUT_FT.spot.widthFt).toBe(9);
    expect(PROTOTYPE_LAYOUT_FT.spot.lengthFt).toBe(18);
    expect(spot.widthM).toBe(ftToM(9));
    expect(spot.lengthM).toBe(ftToM(18));
  });

  test('車在車位正後方 60 ft、與車位同向、靜止、方向盤回正', () => {
    const dx = startState.x - spot.x;
    const dz = startState.z - spot.z;
    const spotRight = right(spot.headingRad);
    const spotForward = forward(spot.headingRad);
    expect(mToFt(dx * spotRight.x + dz * spotRight.z)).toBeCloseTo(0, 9);
    expect(mToFt(dx * spotForward.x + dz * spotForward.z)).toBeCloseTo(-60, 9);
    expect(headingDelta(startState.headingRad, spot.headingRad)).toBe(0);
    expect(startState.speedMps).toBe(0);
    expect(startState.steerRad).toBe(0);
  });
});

describe('開新的一局', () => {
  test('車在起始狀態、判定進度 0、未停妥', () => {
    const session = startSession(PROTOTYPE_LAYOUT);
    expect(session.vehicle).toEqual(PROTOTYPE_LAYOUT.startState);
    expect(session.heldSteps).toBe(0);
    expect(session.parked).toBe(false);
  });

  test('在起點不動不會停妥（車不在車位裡）', () => {
    const session = repeat(startSession(PROTOTYPE_LAYOUT), IDLE, 10 * REQUIRED_HOLD_STEPS);
    expect(session.heldSteps).toBe(0);
    expect(session.parked).toBe(false);
  });
});

describe('停妥', () => {
  test('車靜止在車位中央：第 59 步未停妥，第 60 步停妥', () => {
    let session = repeat(startSession(CENTERED_LAYOUT), IDLE, 59);
    expect(session.heldSteps).toBe(59);
    expect(session.parked).toBe(false);

    session = stepSession(session, IDLE);
    expect(session.heldSteps).toBe(60);
    expect(session.parked).toBe(true);
  });

  test('從起點直線開進車位、停下、等滿 1 秒 → 已停妥', () => {
    const stopped = driveIntoPrototypeSpot();
    expect(stopped.vehicle.speedMps).toBe(0);
    expect(stopped.parked).toBe(false);
    // 停下的位置在車位中心附近（前後餘裕是 1.5 ft）。
    const offsetFt = mToFt(Math.abs(stopped.vehicle.z - PROTOTYPE_LAYOUT.spot.z));
    expect(offsetFt).toBeLessThan(0.5);
    expect(stopped.vehicle.x).toBe(PROTOTYPE_LAYOUT.spot.x);

    const parked = repeat(stopped, IDLE, REQUIRED_HOLD_STEPS);
    expect(parked.parked).toBe(true);
    expect(parked.heldSteps).toBe(REQUIRED_HOLD_STEPS);
  });

  test('高速穿過車位不會停妥', () => {
    const session = repeat(startSession(PROTOTYPE_LAYOUT), FULL_THROTTLE, 10 * REQUIRED_HOLD_STEPS);
    expect(session.vehicle.z).toBeLessThan(PROTOTYPE_LAYOUT.spot.z - PROTOTYPE_LAYOUT.spot.lengthM);
    expect(session.heldSteps).toBe(0);
    expect(session.parked).toBe(false);
  });

  test('在車位裡等到一半開走 → 進度歸零', () => {
    let session = repeat(startSession(CENTERED_LAYOUT), IDLE, 30);
    expect(session.heldSteps).toBe(30);
    // 全油門 0.1 mph/步：幾步內車速就超過 0.5 mph，進度歸零；之後開出車位更不可能成立。
    session = repeat(session, FULL_THROTTLE, REQUIRED_HOLD_STEPS);
    expect(session.heldSteps).toBe(0);
    expect(session.parked).toBe(false);
  });
});

describe('停妥之後', () => {
  test('不再接受駕駛輸入：油門、倒車、方向盤都不會讓車動', () => {
    const parked = repeat(driveIntoPrototypeSpot(), IDLE, REQUIRED_HOLD_STEPS);
    expect(parked.parked).toBe(true);

    for (const input of [FULL_THROTTLE, FULL_REVERSE, STEER_RIGHT]) {
      const after = repeat(parked, input, 3 * REQUIRED_HOLD_STEPS);
      expect(after.vehicle).toEqual(parked.vehicle);
      expect(after.parked).toBe(true);
    }
  });

  test('成立的那一步車還在蠕行（低於 0.5 mph）→ 車速歸零，不會滑出車位', () => {
    // 每 3 步點一下油門：車速在 0、0.1、0.05 mph 之間循環，始終低於門檻；第 60 步剛好是踩油門的那一步。
    const inputs = Array.from({ length: REQUIRED_HOLD_STEPS }, (_, step) =>
      step % 3 === 2 ? FULL_THROTTLE : IDLE,
    );
    const beforeLast = run(startSession(CENTERED_LAYOUT), inputs.slice(0, -1));
    expect(beforeLast.parked).toBe(false);
    expect(beforeLast.vehicle.speedMps).toBe(0);

    const parked = stepSession(beforeLast, FULL_THROTTLE);
    expect(parked.parked).toBe(true);
    expect(parked.vehicle.speedMps).toBe(0);
    // 這一步本來有在動（位置變了），只是停妥時車速被歸零。
    expect(parked.vehicle.z).toBeLessThan(beforeLast.vehicle.z);

    const later = repeat(parked, IDLE, REQUIRED_HOLD_STEPS);
    expect(later.vehicle).toEqual(parked.vehicle);
  });
});

describe('重來', () => {
  test('停妥後重來：車回起始姿態、進度歸零、未停妥', () => {
    const parked = repeat(driveIntoPrototypeSpot(), IDLE, REQUIRED_HOLD_STEPS);
    expect(parked.parked).toBe(true);

    const restarted = restartSession(parked);
    expect(restarted.vehicle).toEqual(PROTOTYPE_LAYOUT.startState);
    expect(restarted.heldSteps).toBe(0);
    expect(restarted.parked).toBe(false);
    expect(restarted).toEqual(startSession(PROTOTYPE_LAYOUT));
  });

  test('重來後又能開，而且可以再停一次', () => {
    const parked = repeat(driveIntoPrototypeSpot(), IDLE, REQUIRED_HOLD_STEPS);
    const restarted = restartSession(parked);

    const moving = repeat(restarted, FULL_THROTTLE, 30);
    expect(moving.vehicle.speedMps).toBeCloseTo(mphToMps(3), 9);
    expect(moving.vehicle.z).toBeLessThan(PROTOTYPE_LAYOUT.startState.z);

    const inputs = inputsToStopAtSpotCenter(PROTOTYPE_LAYOUT.startState, PROTOTYPE_LAYOUT.spot, 1);
    const parkedAgain = repeat(run(restarted, inputs), IDLE, REQUIRED_HOLD_STEPS);
    expect(parkedAgain.parked).toBe(true);
    expect(parkedAgain.vehicle).toEqual(parked.vehicle);
  });

  test('判定進行到一半重來：進度歸零', () => {
    const halfway = repeat(startSession(CENTERED_LAYOUT), IDLE, 30);
    expect(halfway.heldSteps).toBe(30);

    const restarted = restartSession(halfway);
    expect(restarted.heldSteps).toBe(0);
    expect(restarted.parked).toBe(false);
    expect(restarted.vehicle).toEqual(CENTERED_LAYOUT.startState);
  });

  test('開到別處再重來：位置、車頭、車速、方向盤全部回到起始值', () => {
    const wandered = repeat(startSession(PROTOTYPE_LAYOUT), { ...FULL_THROTTLE, steer: 1 }, 90);
    expect(wandered.vehicle).not.toEqual(PROTOTYPE_LAYOUT.startState);
    expect(restartSession(wandered).vehicle).toEqual(PROTOTYPE_LAYOUT.startState);
  });
});

describe('sessionSnapshot（e2e 用的唯讀狀態）', () => {
  test('起點：位置 ft、heading 度、車速 mph、未停妥', () => {
    expect(sessionSnapshot(startSession(PROTOTYPE_LAYOUT))).toEqual({
      xFt: PROTOTYPE_LAYOUT_FT.start.xFt,
      zFt: PROTOTYPE_LAYOUT_FT.start.zFt,
      headingDeg: PROTOTYPE_LAYOUT_FT.start.headingDeg,
      speedMph: 0,
      parked: false,
      status: 'ready',
      elapsedS: 0,
      collisions: 0,
      angleErrorDeg: 0,
      stars: null,
      failReason: null,
    });
  });

  test('全油門 1 秒：車速 6 mph、往 −Z 走了約 4.4 ft', () => {
    const snapshot = sessionSnapshot(repeat(startSession(PROTOTYPE_LAYOUT), FULL_THROTTLE, 60));
    expect(snapshot.speedMph).toBeCloseTo(6, 9);
    // 半隱式積分：位移 = Σ v_k·dt（k = 1..60）= 6 mph/s × dt² × 60·61/2，比連續時間的 4.4 ft 多半步。
    expect(snapshot.zFt).toBeCloseTo(-(6 * 5280) / 3600 / 3600 * ((60 * 61) / 2), 9);
    expect(snapshot.xFt).toBeCloseTo(0, 9);
    expect(snapshot.headingDeg).toBe(0);
    expect(snapshot.parked).toBe(false);
  });

  test('倒車時車速為負；右轉後 heading 以度表示', () => {
    const reversing = sessionSnapshot(repeat(startSession(PROTOTYPE_LAYOUT), FULL_REVERSE, 30));
    expect(reversing.speedMph).toBeCloseTo(-3, 9);

    const turning = repeat(startSession(PROTOTYPE_LAYOUT), { ...FULL_THROTTLE, steer: 1 }, 90);
    const snapshot = sessionSnapshot(turning);
    expect(snapshot.headingDeg).toBeGreaterThan(0);
    expect(snapshot.headingDeg).toBeLessThan(180);
    expect(snapshot.headingDeg).toBeCloseTo((turning.vehicle.headingRad * 180) / Math.PI, 9);
  });

  test('停妥後 parked = true、車速 0、位置在車位中心附近', () => {
    const parked = repeat(driveIntoPrototypeSpot(), IDLE, REQUIRED_HOLD_STEPS);
    const snapshot = sessionSnapshot(parked);
    expect(snapshot.parked).toBe(true);
    expect(snapshot.speedMph).toBe(0);
    expect(Math.abs(snapshot.zFt - PROTOTYPE_LAYOUT_FT.spot.centerZFt)).toBeLessThan(1.5);
  });

  test('改快照不會影響遊戲狀態', () => {
    const session = startSession(PROTOTYPE_LAYOUT);
    const snapshot: { xFt: number } = sessionSnapshot(session);
    snapshot.xFt = 999;
    expect(sessionSnapshot(session).xFt).toBe(PROTOTYPE_LAYOUT_FT.start.xFt);
    expect(session.vehicle).toEqual(PROTOTYPE_LAYOUT.startState);
  });
});

// ───────────────────────── 碰撞、計時、失敗、評分 ─────────────────────────

const BRAKE: DriveInput = { ...IDLE, brake: true };

/** 英尺寫的碰撞盒（heading 0：寬沿 X、長沿 Z）。 */
function wallFt(xFt: number, zFt: number, widthFt: number, lengthFt: number): Obb {
  return obbFromFt({ centerXFt: xFt, centerZFt: zFt, widthFt, lengthFt, headingDeg: 0 });
}

/** 車身 15 ft 長：車頭朝北時前緣在中心前方 7.5 ft、後緣在後方 7.5 ft。 */
const HALF_CAR_FT = 7.5;

/** 原型場景加一面橫在前方的牆：牆的近緣離車頭 gapFt。 */
function layoutWithWallAhead(gapFt: number, rules?: SessionRules): SessionLayout {
  return {
    spot: PROTOTYPE_LAYOUT.spot,
    startState: PROTOTYPE_LAYOUT.startState,
    obstacles: [wallFt(0, -(HALF_CAR_FT + gapFt) - 1, 20, 2)],
    ...(rules === undefined ? {} : { rules }),
  };
}

/** 這一步如果不擋，車會不會壓到東西（測試自己重算一次，不看 session 的計數）。 */
function wouldHit(session: Session, input: DriveInput): boolean {
  const moved = stepVehicle(session.vehicle, input, FIXED_STEP_SECONDS);
  return vehicleHits(moved, session.layout.obstacles ?? []).length > 0;
}

/** 同一個輸入一直跑到 predicate 成立為止，回傳成立的那一步；超過上限就丟錯。 */
function runUntil(
  session: Session,
  input: DriveInput,
  predicate: (session: Session) => boolean,
  maxSteps = 3600,
): Session {
  let current = session;
  for (let step = 0; step < maxSteps; step += 1) {
    current = stepSession(current, input);
    if (predicate(current)) {
      return current;
    }
  }
  throw new Error('步數上限內條件沒有成立');
}

describe('碰撞：退回上一步並反彈', () => {
  test('撞牆的那一步：位置與車頭退回上一步、車速反向、計一次', () => {
    let session = startSession(layoutWithWallAhead(3));
    let before = session;
    while (!wouldHit(session, FULL_THROTTLE)) {
      before = session;
      session = stepSession(session, FULL_THROTTLE);
      expect(session.collisions).toBe(0);
    }
    before = session;
    const impactMps = stepVehicle(before.vehicle, FULL_THROTTLE, FIXED_STEP_SECONDS).speedMps;
    const after = stepSession(before, FULL_THROTTLE);

    expect(after.collisions).toBe(1);
    expect(after.vehicle.x).toBe(before.vehicle.x);
    expect(after.vehicle.z).toBe(before.vehicle.z);
    expect(after.vehicle.headingRad).toBe(before.vehicle.headingRad);
    // 車頭離牆不到一步的距離，而且還沒碰到。
    const gapFt = mToFt(before.vehicle.z) - HALF_CAR_FT - -(HALF_CAR_FT + 3);
    expect(gapFt).toBeGreaterThanOrEqual(0);
    expect(gapFt).toBeLessThan(mToFt(impactMps * FIXED_STEP_SECONDS));
    // 低速撞上去（3 ft 加速到約 4 mph）：車速 = −撞上去的車速 × 反彈係數。
    expect(impactMps).toBeGreaterThan(0);
    expect(after.vehicle.speedMps).toBeCloseTo(-impactMps * COLLISION_RULES.restitution, 12);
    expect(after.status).toBe('driving');
  });

  test('高速撞上去：反彈車速夾在上限', () => {
    // 40 ft 的助跑：撞上去時超過 10 mph，× 反彈係數會超過上限。
    const hit = runUntil(startSession(layoutWithWallAhead(40)), FULL_THROTTLE, (s) => s.collisions > 0);
    expect(mpsToMph(hit.vehicle.speedMps)).toBeCloseTo(-COLLISION_RULES.maxBounceSpeedMph, 9);
  });

  test('倒車撞到後面的東西：往前彈（車速為正）', () => {
    const layout: SessionLayout = {
      spot: PROTOTYPE_LAYOUT.spot,
      startState: PROTOTYPE_LAYOUT.startState,
      obstacles: [wallFt(0, HALF_CAR_FT + 2 + 1, 20, 2)],
    };
    const hit = runUntil(startSession(layout), FULL_REVERSE, (s) => s.collisions > 0);
    expect(hit.vehicle.speedMps).toBeGreaterThan(0);
    expect(mToFt(hit.vehicle.z)).toBeLessThan(2);
    expect(vehicleHits(hit.vehicle, layout.obstacles ?? [])).toEqual([]);
  });

  test('一直踩著油門頂牆：車不會穿過去，也永遠不與牆重疊', () => {
    const layout = layoutWithWallAhead(3);
    let session = startSession(layout);
    for (let step = 0; step < 600; step += 1) {
      session = stepSession(session, FULL_THROTTLE);
      expect(vehicleHits(session.vehicle, layout.obstacles ?? [])).toEqual([]);
      expect(mToFt(session.vehicle.z)).toBeGreaterThanOrEqual(-3);
    }
    expect(session.collisions).toBeGreaterThan(1);
  });

  test('最高速衝向最小的障礙物（0.8 ft 護柱）：一步 0.44 ft，穿不過去', () => {
    // 護柱在正前方 120 ft，夠加速到最高速 18 mph。
    const bollard = wallFt(0, -(HALF_CAR_FT + 120) - 0.4, 0.8, 0.8);
    const layout: SessionLayout = {
      spot: PROTOTYPE_LAYOUT.spot,
      startState: PROTOTYPE_LAYOUT.startState,
      obstacles: [bollard],
    };
    let session = startSession(layout);
    let topMph = 0;
    for (let step = 0; step < 900; step += 1) {
      session = stepSession(session, FULL_THROTTLE);
      topMph = Math.max(topMph, mpsToMph(session.vehicle.speedMps));
      expect(vehicleHits(session.vehicle, layout.obstacles ?? [])).toEqual([]);
      // 車頭始終在護柱的近緣之前。
      expect(mToFt(session.vehicle.z) - HALF_CAR_FT).toBeGreaterThanOrEqual(-(HALF_CAR_FT + 120) - 1e-9);
    }
    expect(topMph).toBeCloseTo(18, 6);
    expect(session.collisions).toBeGreaterThan(0);
  });

  test('w1_l03 亂開 2 分鐘（固定種子）：每一步都不與任何障礙物或邊界重疊', () => {
    const level = levelById('w1_l03');
    if (level === undefined) {
      throw new Error('找不到 w1_l03');
    }
    // 拿掉時間與碰撞上限，讓車一直開下去。
    const layout: SessionLayout = { ...level.layout, rules: UNLIMITED_RULES };
    const obstacles = layout.obstacles ?? [];
    // 4 個障礙物 + 四面邊界。
    expect(obstacles).toHaveLength(8);
    expect(vehicleHits(layout.startState, obstacles)).toEqual([]);

    const rng = createRng(20261111);
    const throttles = [1, 1, 1, -1, -1, 0] as const;
    const steers = [-1, -0.5, 0, 0, 0.5, 1] as const;
    let session = startSession(layout);
    let input = IDLE;
    for (let step = 0; step < 7200; step += 1) {
      if (step % 45 === 0) {
        input = {
          throttle: throttles[Math.floor(rng() * throttles.length)] ?? 0,
          steer: steers[Math.floor(rng() * steers.length)] ?? 0,
          brake: rng() < 0.05,
        };
      }
      session = stepSession(session, input);
      expect(vehicleHits(session.vehicle, obstacles)).toEqual([]);
    }
    // 真的有撞到東西（否則這個測試什麼都沒驗到），而且不只撞到一種。
    expect(session.collisions).toBeGreaterThan(5);
    expect(session.hitCooldownUntil.filter((until) => until > 0).length).toBeGreaterThan(1);
    expect(session.status).toBe('driving');
  });
});

describe('碰撞冷卻：同一個物件 0.5 秒（30 步）內不重複計', () => {
  /** 車頭離牆 0.05 ft、以 5 mph 往前：下一步一定撞上。 */
  const closingLayout: SessionLayout = {
    spot: PROTOTYPE_LAYOUT.spot,
    startState: { ...PROTOTYPE_LAYOUT.startState, speedMps: mphToMps(5) },
    obstacles: [wallFt(0, -(HALF_CAR_FT + 0.05) - 1, 20, 2)],
  };

  test('冷卻是 30 步', () => {
    expect(COLLISION_COOLDOWN_STEPS).toBe(30);
  });

  test('第 1 步撞到：計一次，冷卻到第 31 步', () => {
    const hit = stepSession(startSession(closingLayout), IDLE);
    expect(hit.stepCount).toBe(1);
    expect(hit.collisions).toBe(1);
    expect(hit.hitCooldownUntil).toEqual([31]);
  });

  test('第 2–30 步再撞到同一個：照樣擋住、反彈，但不計；第 31 步（剛好 0.5 秒後）再計一次', () => {
    const fresh = startSession(closingLayout);
    for (const stepCount of [1, 15, 29]) {
      // 這個狀態下一步是第 stepCount + 1 步，仍在冷卻內。
      const cooling: Session = { ...fresh, stepCount, collisions: 1, hitCooldownUntil: [31] };
      const again = stepSession(cooling, IDLE);
      expect(again.collisions).toBe(1);
      expect(again.hitCooldownUntil).toEqual([31]);
      expect(again.vehicle.z).toBe(fresh.vehicle.z);
      expect(again.vehicle.speedMps).toBeLessThan(0);
    }
    const expired = stepSession({ ...fresh, stepCount: 30, collisions: 1, hitCooldownUntil: [31] }, IDLE);
    expect(expired.collisions).toBe(2);
    expect(expired.hitCooldownUntil).toEqual([61]);
  });

  test('一直頂著牆：計數只在「離上次計數滿 30 步」的撞擊增加', () => {
    let session = startSession(layoutWithWallAhead(1));
    let lastCountedStep = -Infinity;
    let expected = 0;
    let uncountedHits = 0;
    for (let step = 1; step <= 600; step += 1) {
      const hit = wouldHit(session, FULL_THROTTLE);
      session = stepSession(session, FULL_THROTTLE);
      if (hit && step - lastCountedStep >= COLLISION_COOLDOWN_STEPS) {
        expected += 1;
        lastCountedStep = step;
      } else if (hit) {
        uncountedHits += 1;
      }
      expect(session.collisions).toBe(expected);
    }
    // 10 秒內被計了好幾次，中間也有被冷卻擋掉的撞擊；但每 0.5 秒最多一次。
    expect(expected).toBeGreaterThan(3);
    expect(expected).toBeLessThanOrEqual(600 / COLLISION_COOLDOWN_STEPS);
    expect(uncountedHits).toBeGreaterThan(0);
  });

  test('不同物件各計各的：撞了前面的牆，冷卻內倒車撞到後面的牆也算', () => {
    const layout: SessionLayout = {
      spot: PROTOTYPE_LAYOUT.spot,
      startState: PROTOTYPE_LAYOUT.startState,
      obstacles: [
        wallFt(0, -(HALF_CAR_FT + 0.2) - 1, 20, 2),
        wallFt(0, HALF_CAR_FT + 0.2 + 1, 20, 2),
      ],
    };
    const front = runUntil(startSession(layout), FULL_THROTTLE, (s) => s.collisions === 1);
    expect(front.hitCooldownUntil[0]).toBe(front.stepCount + COLLISION_COOLDOWN_STEPS);
    expect(front.hitCooldownUntil[1]).toBe(0);

    const rear = runUntil(front, FULL_REVERSE, (s) => s.collisions === 2);
    // 第二次是在第一個物件的冷卻內發生的。
    expect(rear.stepCount - front.stepCount).toBeLessThan(COLLISION_COOLDOWN_STEPS);
    expect(rear.hitCooldownUntil[0]).toBe(front.hitCooldownUntil[0]);
    expect(rear.hitCooldownUntil[1]).toBe(rear.stepCount + COLLISION_COOLDOWN_STEPS);
  });

  test('同一步壓到兩個物件：一次計兩個', () => {
    const layout: SessionLayout = {
      spot: PROTOTYPE_LAYOUT.spot,
      startState: PROTOTYPE_LAYOUT.startState,
      obstacles: [
        wallFt(-2, -(HALF_CAR_FT + 1) - 0.5, 1, 1),
        wallFt(2, -(HALF_CAR_FT + 1) - 0.5, 1, 1),
      ],
    };
    const hit = runUntil(startSession(layout), FULL_THROTTLE, (s) => s.collisions > 0);
    expect(hit.collisions).toBe(2);
    expect(hit.hitCooldownUntil).toEqual([hit.stepCount + 30, hit.stepCount + 30]);
  });
});

describe('計時：從第一次駕駛輸入開始', () => {
  test('hasDriveInput：油門、倒車、方向盤、剎車任一個都算；全放開不算', () => {
    expect(hasDriveInput(IDLE)).toBe(false);
    expect(hasDriveInput(FULL_THROTTLE)).toBe(true);
    expect(hasDriveInput(FULL_REVERSE)).toBe(true);
    expect(hasDriveInput(STEER_RIGHT)).toBe(true);
    expect(hasDriveInput({ ...IDLE, steer: -0.2 })).toBe(true);
    expect(hasDriveInput(BRAKE)).toBe(true);
  });

  test('沒有輸入：不論等多久都是 ready、0 步', () => {
    const waiting = repeat(startSession(PROTOTYPE_LAYOUT), IDLE, 600);
    expect(waiting.status).toBe('ready');
    expect(waiting.elapsedSteps).toBe(0);
    expect(waiting.stepCount).toBe(600);
    expect(sessionSnapshot(waiting).elapsedS).toBe(0);
  });

  test('第一次有輸入的那一步是第 1 步；之後放開也繼續算', () => {
    const waiting = repeat(startSession(PROTOTYPE_LAYOUT), IDLE, 120);
    const first = stepSession(waiting, FULL_THROTTLE);
    expect(first.status).toBe('driving');
    expect(first.elapsedSteps).toBe(1);

    const later = repeat(first, IDLE, 89);
    expect(later.status).toBe('driving');
    expect(later.elapsedSteps).toBe(90);
    expect(sessionSnapshot(later).elapsedS).toBe(1.5);
  });

  test.each([
    ['方向盤', STEER_RIGHT],
    ['剎車', BRAKE],
    ['倒車', FULL_REVERSE],
  ])('只動%s也會開始計時', (_name, input) => {
    const started = stepSession(startSession(PROTOTYPE_LAYOUT), input);
    expect(started.status).toBe('driving');
    expect(started.elapsedSteps).toBe(1);
  });

  test('成績時間含判定的 1 秒：判定條件從第 n 步開始連續成立 → 成績是 n + 59 步', () => {
    const inputs = [
      ...inputsToStopAtSpotCenter(PROTOTYPE_LAYOUT.startState, PROTOTYPE_LAYOUT.spot, 1),
      ...Array.from({ length: REQUIRED_HOLD_STEPS }, () => IDLE),
    ];
    // 測試自己用物理與判定重算：條件第一次成立（之後不再中斷）是第幾步。
    let vehicle = PROTOTYPE_LAYOUT.startState;
    let firstMetStep = 0;
    inputs.forEach((input, index) => {
      vehicle = stepVehicle(vehicle, input, FIXED_STEP_SECONDS);
      const met = parkingConditionsMet(vehicle, PROTOTYPE_LAYOUT.spot);
      if (met && firstMetStep === 0) {
        firstMetStep = index + 1;
      } else if (!met) {
        firstMetStep = 0;
      }
    });
    // 煞到快停的最後幾步車速已低於門檻，所以判定比「完全停住」早一點開始。
    expect(firstMetStep).toBeGreaterThan(REQUIRED_HOLD_STEPS);

    const parked = run(startSession(PROTOTYPE_LAYOUT), inputs);
    expect(parked.status).toBe('parked');
    expect(parked.result?.timeSteps).toBe(firstMetStep + REQUIRED_HOLD_STEPS - 1);
    expect(parked.elapsedSteps).toBe(firstMetStep + REQUIRED_HOLD_STEPS - 1);
    // 第一步就有油門，所以計時與總步數一致；停妥後計時不再走。
    expect(parked.stepCount).toBe(parked.elapsedSteps);
    expect(repeat(parked, FULL_THROTTLE, 120).elapsedSteps).toBe(parked.elapsedSteps);
  });
});

describe('失敗', () => {
  test('超過時間上限：剛好用完還在開，多一步失敗；車停住、不再接受輸入', () => {
    const rules: SessionRules = { timeLimitSteps: 120, targetSteps: 60, maxCollisions: 5 };
    const layout: SessionLayout = { ...PROTOTYPE_LAYOUT, obstacles: [], rules };
    const atLimit = repeat(startSession(layout), FULL_THROTTLE, 120);
    expect(atLimit.status).toBe('driving');
    expect(atLimit.failReason).toBeNull();
    expect(atLimit.vehicle.speedMps).toBeGreaterThan(0);

    const failed = stepSession(atLimit, FULL_THROTTLE);
    expect(failed.status).toBe('failed');
    expect(failed.failReason).toBe('timeout');
    expect(failed.parked).toBe(false);
    expect(failed.result).toBeNull();
    expect(failed.vehicle.speedMps).toBe(0);
    expect(failed.elapsedSteps).toBe(121);

    for (const input of [FULL_THROTTLE, FULL_REVERSE, STEER_RIGHT]) {
      expect(repeat(failed, input, 120)).toBe(failed);
    }
    expect(sessionSnapshot(failed)).toMatchObject({
      status: 'failed',
      failReason: 'timeout',
      parked: false,
      stars: null,
      speedMph: 0,
    });
  });

  test('還沒開始計時就不會超時', () => {
    const rules: SessionRules = { timeLimitSteps: 10, targetSteps: 5, maxCollisions: 0 };
    const waiting = repeat(startSession({ ...PROTOTYPE_LAYOUT, rules }), IDLE, 600);
    expect(waiting.status).toBe('ready');
  });

  test('停妥成立的那一步剛好用完時間 → 成功；晚一步 → 失敗（失敗判斷在停車判定之前）', () => {
    // 車一開始就在車位中央：第 1 步踩一下剎車開始計時，第 60 步判定成立。
    const withLimit = (timeLimitSteps: number): Session =>
      repeat(
        stepSession(
          startSession({
            ...CENTERED_LAYOUT,
            rules: { timeLimitSteps, targetSteps: 30, maxCollisions: 0 },
          }),
          BRAKE,
        ),
        IDLE,
        REQUIRED_HOLD_STEPS - 1,
      );
    expect(withLimit(60).status).toBe('parked');
    expect(withLimit(60).result?.timeSteps).toBe(60);
    expect(withLimit(59).status).toBe('failed');
    expect(withLimit(59).failReason).toBe('timeout');
    expect(withLimit(59).parked).toBe(false);
  });

  test('碰撞上限 0：碰一次就失敗（嚴格大於 0）', () => {
    const rules: SessionRules = { timeLimitSteps: 3600, targetSteps: 600, maxCollisions: 0 };
    const layout = layoutWithWallAhead(3, rules);
    const failed = runUntil(startSession(layout), FULL_THROTTLE, (s) => s.status !== 'driving');
    expect(failed.status).toBe('failed');
    expect(failed.failReason).toBe('collisions');
    expect(failed.collisions).toBe(1);
    expect(failed.vehicle.speedMps).toBe(0);
    expect(vehicleHits(failed.vehicle, layout.obstacles ?? [])).toEqual([]);
    expect(repeat(failed, FULL_THROTTLE, 60)).toBe(failed);
  });

  test('碰撞上限 2：第 2 次還沒失敗，第 3 次失敗', () => {
    const rules: SessionRules = { timeLimitSteps: 36000, targetSteps: 600, maxCollisions: 2 };
    const start = startSession(layoutWithWallAhead(1, rules));
    const second = runUntil(start, FULL_THROTTLE, (s) => s.collisions === 2);
    expect(second.status).toBe('driving');
    expect(second.failReason).toBeNull();

    const third = runUntil(second, FULL_THROTTLE, (s) => s.collisions === 3);
    expect(third.status).toBe('failed');
    expect(third.failReason).toBe('collisions');
  });

  test('失敗後重來：計時、碰撞、冷卻、狀態全部歸零', () => {
    const rules: SessionRules = { timeLimitSteps: 3600, targetSteps: 600, maxCollisions: 0 };
    const layout = layoutWithWallAhead(3, rules);
    const failed = runUntil(startSession(layout), FULL_THROTTLE, (s) => s.status === 'failed');
    const restarted = restartSession(failed);
    expect(restarted).toEqual(startSession(layout));
    expect(restarted).toMatchObject({
      status: 'ready',
      stepCount: 0,
      elapsedSteps: 0,
      collisions: 0,
      hitCooldownUntil: [0],
      failReason: null,
      result: null,
    });
    expect(restarted.vehicle).toEqual(layout.startState);
    // 重來之後又能開。
    expect(stepSession(restarted, FULL_THROTTLE).status).toBe('driving');
  });
});

describe('評分', () => {
  /** 原型場景直線開進車位；目標時間可調。 */
  function parkStraight(rules: SessionRules, obstacles: readonly Obb[] = []): Session {
    const layout: SessionLayout = { ...PROTOTYPE_LAYOUT, obstacles, rules };
    const inputs = inputsToStopAtSpotCenter(layout.startState, layout.spot, 1);
    return repeat(run(startSession(layout), inputs), IDLE, REQUIRED_HOLD_STEPS);
  }

  test('目標時間內、0 碰撞、車身擺正 → 3 星', () => {
    const parked = parkStraight({ timeLimitSteps: 3600, targetSteps: 1800, maxCollisions: 3 });
    expect(parked.status).toBe('parked');
    expect(parked.result).toEqual({
      stars: 3,
      timeSteps: parked.elapsedSteps,
      collisions: 0,
      angleErrorRad: 0,
    });
    expect(sessionSnapshot(parked)).toMatchObject({ status: 'parked', parked: true, stars: 3 });
  });

  test('成績時間剛好等於目標時間 → 仍是 3 星；目標少一步 → 1 星', () => {
    const reference = parkStraight({ timeLimitSteps: 3600, targetSteps: 1800, maxCollisions: 3 });
    const timeSteps = reference.result?.timeSteps ?? 0;
    expect(timeSteps).toBeGreaterThan(REQUIRED_HOLD_STEPS);

    const exact = parkStraight({ timeLimitSteps: 3600, targetSteps: timeSteps, maxCollisions: 3 });
    expect(exact.result?.stars).toBe(3);
    const late = parkStraight({ timeLimitSteps: 3600, targetSteps: timeSteps - 1, maxCollisions: 3 });
    expect(late.result?.stars).toBe(1);
    expect(late.status).toBe('parked');
  });

  test('撞到車位後面的牆、彈回來停妥：目標時間內但有 1 次碰撞 → 2 星', () => {
    // 牆的近緣貼著車位的後緣（z = −69）；一路全油門撞上去，放開後滑回車位裡停下。
    const layout: SessionLayout = {
      ...PROTOTYPE_LAYOUT,
      obstacles: [wallFt(0, -69 - 1, 20, 2)],
      rules: { timeLimitSteps: 3600, targetSteps: 1800, maxCollisions: 3 },
    };
    const hit = runUntil(startSession(layout), FULL_THROTTLE, (s) => s.collisions === 1);
    const parked = runUntil(hit, IDLE, (s) => s.status !== 'driving');
    expect(parked.status).toBe('parked');
    expect(parked.result?.collisions).toBe(1);
    expect(parked.result?.stars).toBe(2);
  });

  test('0 碰撞、目標時間內，但車身歪了 3° 以上（仍在 8° 容許內）→ 2 星', () => {
    // 車一開始就斜 5° 停在車位中央（車位 9×18 ft，斜 5° 的 6×15 ft 車身四角仍在裡面）。
    const layout: SessionLayout = {
      spot: PROTOTYPE_LAYOUT.spot,
      startState: { ...CENTERED_LAYOUT.startState, headingRad: degToRad(5) },
      rules: { timeLimitSteps: 3600, targetSteps: 1800, maxCollisions: 0 },
    };
    const parked = repeat(stepSession(startSession(layout), BRAKE), IDLE, REQUIRED_HOLD_STEPS - 1);
    expect(parked.status).toBe('parked');
    expect(parked.result?.stars).toBe(2);
    expect(parked.result?.angleErrorRad).toBeCloseTo(degToRad(5), 12);
    expect(sessionSnapshot(parked).angleErrorDeg).toBeCloseTo(5, 9);

    // 同樣的情況斜 2° → 3 星。
    const straighter = repeat(
      stepSession(
        startSession({ ...layout, startState: { ...layout.startState, headingRad: degToRad(2) } }),
        BRAKE,
      ),
      IDLE,
      REQUIRED_HOLD_STEPS - 1,
    );
    expect(straighter.result?.stars).toBe(3);
  });

  test('沒有給規則的配置：不限時、不限碰撞，停妥照樣有成績', () => {
    const parked = repeat(driveIntoPrototypeSpotWithoutRules(), IDLE, REQUIRED_HOLD_STEPS);
    expect(parked.status).toBe('parked');
    expect(parked.result?.stars).toBe(3);
  });
});

/** 只有車位與起點的配置（沒有 obstacles、rules）。 */
function driveIntoPrototypeSpotWithoutRules(): Session {
  const layout: SessionLayout = {
    spot: PROTOTYPE_LAYOUT.spot,
    startState: PROTOTYPE_LAYOUT.startState,
  };
  return run(startSession(layout), inputsToStopAtSpotCenter(layout.startState, layout.spot, 1));
}

describe('原型關的規則', () => {
  // 原型關的 max_collisions 是 0（嚴格大於才失敗 → 碰一次就失敗），
  // 但它沒有 bounds、沒有障礙物，根本沒有東西可撞，所以不會因為碰撞失敗。
  test('max_collisions 0、沒有任何碰撞盒、時間上限 600 秒、目標 30 秒', () => {
    expect(PROTOTYPE_LEVEL.maxCollisions).toBe(0);
    expect(PROTOTYPE_LEVEL.boundsFt).toBeUndefined();
    expect(PROTOTYPE_LEVEL.obstaclesFt).toEqual([]);
    expect(PROTOTYPE_LAYOUT.obstacles).toEqual([]);
    expect(PROTOTYPE_LAYOUT.rules).toEqual({
      timeLimitSteps: 36000,
      targetSteps: 1800,
      maxCollisions: 0,
    });
  });

  test('在原型關亂繞 60 秒：碰撞 0 次、沒有失敗', () => {
    let session = startSession(PROTOTYPE_LAYOUT);
    for (let step = 0; step < 3600; step += 1) {
      const steer = step % 600 < 300 ? 1 : -1;
      session = stepSession(session, { ...FULL_THROTTLE, steer });
    }
    expect(session.collisions).toBe(0);
    expect(session.status).toBe('driving');
  });

  test('直線開進車位 → 停妥、3 星（既有的直線停車流程不受規則影響）', () => {
    const parked = repeat(driveIntoPrototypeSpot(), IDLE, REQUIRED_HOLD_STEPS);
    expect(parked.status).toBe('parked');
    expect(parked.collisions).toBe(0);
    expect(parked.result?.stars).toBe(3);
    // 整趟不到 30 秒。
    expect(parked.result?.timeSteps).toBeLessThan(1800);
  });
});
