// 一局遊戲：車輛狀態 + 碰撞 + 計時 + 失敗條件 + 停車判定 + 評分 + 重來。不 import three、不碰 DOM。
// Session 是不可變的值；每一步回傳新的 Session。
import { COLLISION_RULES, FIXED_STEP_SECONDS, PHYSICS_HZ } from '../core/gameConfig';
import { mToFt, mphToMps, mpsToMph, radToDeg } from '../core/units';
import { stepVehicle, type DriveInput, type VehicleState } from '../vehicle/bicycleModel';
import { vehicleHits, type Obb } from './collision';
import { angleErrorRad, isHoldComplete, nextHeldSteps, type ParkingSpot } from './parkingJudge';
import {
  UNLIMITED_RULES,
  failReason,
  starsFor,
  stepsToSeconds,
  type FailReason,
  type SessionRules,
  type Stars,
} from './scoring';

/** 一局的場景配置：要停的車位、車的起始狀態，以及（選填）會撞到的東西與規則。 */
export interface SessionLayout {
  readonly spot: ParkingSpot;
  readonly startState: VehicleState;
  /**
   * 會撞到的矩形：關卡的障礙物與四面邊界。不填 = 沒有東西可撞。
   * 起點不能與任何一個重疊（由關卡測試保證）；之後每一步都維持「車不與它們重疊」。
   */
  readonly obstacles?: readonly Obb[];
  /** 時間上限、2 星門檻、碰撞上限。不填 = 不限時、不限碰撞次數。 */
  readonly rules?: SessionRules;
}

/**
 * 一局的階段：
 * ready = 還沒有駕駛輸入、計時未開始；driving = 計時中；parked = 停妥（成功）；failed = 失敗。
 * parked 與 failed 之後不再接受駕駛輸入，直到重來。
 */
export type SessionStatus = 'ready' | 'driving' | 'parked' | 'failed';

/** 停妥那一刻的成績。 */
export interface SessionResult {
  readonly stars: Stars;
  /** 成績時間（步）：從第一次駕駛輸入到停妥成立的那一步，含判定的 1 秒。 */
  readonly timeSteps: number;
  readonly collisions: number;
  /** 停妥當下車頭與車位 heading 的夾角（弧度，絕對值）。 */
  readonly angleErrorRad: number;
}

export interface Session {
  readonly layout: SessionLayout;
  /** 最新一步的車輛狀態。 */
  readonly vehicle: VehicleState;
  /** 判定條件已連續成立的物理步數。 */
  readonly heldSteps: number;
  /** 已停妥。一旦成立就維持到重來為止。與 status === 'parked' 同義。 */
  readonly parked: boolean;
  readonly status: SessionStatus;
  /** 這一局已經跑了幾個物理步（不論有沒有開始計時）；碰撞冷卻用它當時鐘。 */
  readonly stepCount: number;
  /** 計時：第一次非空的駕駛輸入那一步算第 1 步，之後每步加 1；停妥或失敗後不再增加。 */
  readonly elapsedSteps: number;
  /** 已計入的碰撞次數。 */
  readonly collisions: number;
  /** 每個障礙物（與 layout.obstacles 同索引）的冷卻期限：stepCount 到這個值才會再計一次。 */
  readonly hitCooldownUntil: readonly number[];
  /** 失敗原因；沒有失敗是 null。 */
  readonly failReason: FailReason | null;
  /** 停妥的成績；還沒停妥是 null。 */
  readonly result: SessionResult | null;
}

/** 同一個物件的碰撞冷卻（0.5 秒 @ 60 Hz = 30 步）。用整數步數計。 */
export const COLLISION_COOLDOWN_STEPS = Math.round(COLLISION_RULES.cooldownSeconds * PHYSICS_HZ);

/** 反彈車速（絕對值）的上限。 */
const MAX_BOUNCE_SPEED_MPS = mphToMps(COLLISION_RULES.maxBounceSpeedMph);

const NO_OBSTACLES: readonly Obb[] = [];

/** 這一步有沒有駕駛輸入（油門、倒車、方向盤、手煞車任一個）。計時從第一次有輸入的那一步開始。 */
export function hasDriveInput(input: DriveInput): boolean {
  return input.throttle !== 0 || input.steer !== 0 || input.handbrake;
}

/** 開新的一局：車在起始狀態、判定進度為 0、未停妥、計時未開始、碰撞 0 次。 */
export function startSession(layout: SessionLayout): Session {
  return {
    layout,
    vehicle: layout.startState,
    heldSteps: 0,
    parked: false,
    status: 'ready',
    stepCount: 0,
    elapsedSteps: 0,
    collisions: 0,
    hitCooldownUntil: (layout.obstacles ?? NO_OBSTACLES).map(() => 0),
    failReason: null,
    result: null,
  };
}

/** 重來：同一個配置重新開一局。 */
export function restartSession(session: Session): Session {
  return startSession(session.layout);
}

/**
 * 撞到之後的車：位置與車頭退回上一步（上一步沒有重疊，所以不會卡進去、也穿不過去），
 * 車速 = −撞上去的車速 × 反彈係數，夾在上限內。方向盤照這一步的結果，不退回。
 */
function bounceBack(previous: VehicleState, moved: VehicleState): VehicleState {
  const bounceMps = -moved.speedMps * COLLISION_RULES.restitution;
  return {
    x: previous.x,
    z: previous.z,
    headingRad: previous.headingRad,
    speedMps: Math.min(Math.max(bounceMps, -MAX_BOUNCE_SPEED_MPS), MAX_BOUNCE_SPEED_MPS),
    steerRad: moved.steerRad,
  };
}

/**
 * 跑一個物理步。順序固定（計畫 5.2）：
 * 更新車 → 碰撞（退回上一步並反彈、計次）→ 計時 → 失敗判斷 → 停車判定 → 評分。
 * 已停妥或已失敗之後不再接受駕駛輸入，車留在原地，直到重來。
 */
export function stepSession(session: Session, input: DriveInput): Session {
  if (session.status === 'parked' || session.status === 'failed') {
    return session;
  }
  const { layout } = session;
  const rules = layout.rules ?? UNLIMITED_RULES;
  const stepCount = session.stepCount + 1;

  // 更新車，再看新的位置有沒有壓到障礙物或邊界。
  const moved = stepVehicle(session.vehicle, input, FIXED_STEP_SECONDS);
  const hits = vehicleHits(moved, layout.obstacles ?? NO_OBSTACLES);
  let vehicle = moved;
  let collisions = session.collisions;
  let hitCooldownUntil = session.hitCooldownUntil;
  if (hits.length > 0) {
    vehicle = bounceBack(session.vehicle, moved);
    // 同時壓到的每個物件各計各的；還在冷卻中的不重複計，也不延長它的冷卻。
    const counted = hits.filter((index) => stepCount >= (hitCooldownUntil[index] ?? 0));
    if (counted.length > 0) {
      collisions += counted.length;
      hitCooldownUntil = hitCooldownUntil.map((until, index) =>
        counted.includes(index) ? stepCount + COLLISION_COOLDOWN_STEPS : until,
      );
    }
  }

  // 計時：第一次有駕駛輸入的那一步開始算，之後不論有沒有輸入都繼續。
  const driving = session.status === 'driving' || hasDriveInput(input);
  const elapsedSteps = driving ? session.elapsedSteps + 1 : 0;

  // 失敗判斷在停車判定之前：同一步既超時又停妥算失敗。失敗後車停住。
  const failed = failReason({ elapsedSteps, collisions, rules });
  if (failed !== null) {
    return {
      layout,
      vehicle: { ...vehicle, speedMps: 0 },
      heldSteps: 0,
      parked: false,
      status: 'failed',
      stepCount,
      elapsedSteps,
      collisions,
      hitCooldownUntil,
      failReason: failed,
      result: null,
    };
  }

  const heldSteps = nextHeldSteps(session.heldSteps, vehicle, layout.spot);
  if (isHoldComplete(heldSteps)) {
    const errorRad = angleErrorRad(vehicle, layout.spot);
    return {
      layout,
      // 成立的那一步車速仍可能不是 0（低於門檻的蠕行）；歸零，免得之後滑出車位。
      vehicle: { ...vehicle, speedMps: 0 },
      heldSteps,
      parked: true,
      status: 'parked',
      stepCount,
      elapsedSteps,
      collisions,
      hitCooldownUntil,
      failReason: null,
      result: {
        stars: starsFor({
          timeSteps: elapsedSteps,
          targetSteps: rules.targetSteps,
          collisions,
          angleErrorRad: errorRad,
        }),
        timeSteps: elapsedSteps,
        collisions,
        angleErrorRad: errorRad,
      },
    };
  }
  return {
    layout,
    vehicle,
    heldSteps,
    parked: false,
    status: driving ? 'driving' : 'ready',
    stepCount,
    elapsedSteps,
    collisions,
    hitCooldownUntil,
    failReason: null,
    result: null,
  };
}

/** 給 e2e 讀的狀態快照，對外一律美制單位與度。 */
export interface SessionSnapshot {
  /** 車身中心的世界座標（ft）。 */
  readonly xFt: number;
  readonly zFt: number;
  /** 車頭方向（度），0 朝 −Z、順時針為正，範圍 [0, 360)。 */
  readonly headingDeg: number;
  /** 車速（mph），前進為正、倒車為負。 */
  readonly speedMph: number;
  /** 是否已停妥（成功）。 */
  readonly parked: boolean;
  /** 一局的階段。 */
  readonly status: SessionStatus;
  /** 開始計時後經過的秒數；還沒有駕駛輸入是 0。 */
  readonly elapsedS: number;
  /** 已計入的碰撞次數。 */
  readonly collisions: number;
  /** 車頭與車位 heading 的夾角（度，絕對值）。 */
  readonly angleErrorDeg: number;
  /** 停妥後的星數（1–3）；還沒停妥是 null。 */
  readonly stars: Stars | null;
  /** 失敗原因；沒有失敗是 null。 */
  readonly failReason: FailReason | null;
}

/** 把一局的現況換成對外單位的快照。每次回傳新物件，改它不會影響遊戲。 */
export function sessionSnapshot(session: Session): SessionSnapshot {
  return {
    xFt: mToFt(session.vehicle.x),
    zFt: mToFt(session.vehicle.z),
    headingDeg: radToDeg(session.vehicle.headingRad),
    speedMph: mpsToMph(session.vehicle.speedMps),
    parked: session.parked,
    status: session.status,
    elapsedS: stepsToSeconds(session.elapsedSteps),
    collisions: session.collisions,
    angleErrorDeg: radToDeg(angleErrorRad(session.vehicle, session.layout.spot)),
    stars: session.result?.stars ?? null,
    failReason: session.failReason,
  };
}
