// 一局遊戲：車輛狀態 + 停車判定進度 + 已停妥旗標 + 重來。不 import three、不碰 DOM。
// Session 是不可變的值；每一步回傳新的 Session。
import { FIXED_STEP_SECONDS } from '../core/gameConfig';
import { mToFt, mpsToMph, radToDeg } from '../core/units';
import { stepVehicle, type DriveInput, type VehicleState } from '../vehicle/bicycleModel';
import { isHoldComplete, nextHeldSteps, type ParkingSpot } from './parkingJudge';

/** 一局的場景配置：要停的車位與車的起始狀態。 */
export interface SessionLayout {
  readonly spot: ParkingSpot;
  readonly startState: VehicleState;
}

export interface Session {
  readonly layout: SessionLayout;
  /** 最新一步的車輛狀態。 */
  readonly vehicle: VehicleState;
  /** 判定條件已連續成立的物理步數。 */
  readonly heldSteps: number;
  /** 已停妥。一旦成立就維持到重來為止。 */
  readonly parked: boolean;
}

/** 開新的一局：車在起始狀態、判定進度為 0、未停妥。 */
export function startSession(layout: SessionLayout): Session {
  return { layout, vehicle: layout.startState, heldSteps: 0, parked: false };
}

/** 重來：同一個配置重新開一局。 */
export function restartSession(session: Session): Session {
  return startSession(session.layout);
}

/**
 * 跑一個物理步：先更新車，再用更新後的狀態做停車判定。
 * 已停妥之後不再接受駕駛輸入，車留在原地，直到重來。
 */
export function stepSession(session: Session, input: DriveInput): Session {
  if (session.parked) {
    return session;
  }
  const vehicle = stepVehicle(session.vehicle, input, FIXED_STEP_SECONDS);
  const heldSteps = nextHeldSteps(session.heldSteps, vehicle, session.layout.spot);
  if (isHoldComplete(heldSteps)) {
    // 成立的那一步車速仍可能不是 0（低於門檻的蠕行）；歸零，免得之後滑出車位。
    return { layout: session.layout, vehicle: { ...vehicle, speedMps: 0 }, heldSteps, parked: true };
  }
  return { layout: session.layout, vehicle, heldSteps, parked: false };
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
}

/** 把一局的現況換成對外單位的快照。每次回傳新物件，改它不會影響遊戲。 */
export function sessionSnapshot(session: Session): SessionSnapshot {
  return {
    xFt: mToFt(session.vehicle.x),
    zFt: mToFt(session.vehicle.z),
    headingDeg: radToDeg(session.vehicle.headingRad),
    speedMph: mpsToMph(session.vehicle.speedMps),
    parked: session.parked,
  };
}
