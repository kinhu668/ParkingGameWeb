// 腳本駕駛：照一條參考路線，每個物理步回傳一份 DriveInput，跑在真正的 stepSession 上。
// 純函式，不 import three、不碰 DOM。內部一律公尺、秒、弧度。
// 路線是「段」的陣列，兩種段：
//   path：純追蹤（pure pursuit，以後軸為參考點）跟一條折線；最後一點是「車身中心」要停的位置，
//         接近終點減速、踩剎車停住。
//   arc ：先在原地把方向盤打到位，再走固定距離（後軸走的弧長）。倒車入庫、平行停車的那幾把用它。
// 每一段都在車完全停住之後才換下一段；整條路線跑完就一直踩著剎車。
import { forward, headingDelta, right, type GroundVector } from '../core/heading';
import { ftToM, mphPerSToMps2, mphToMps } from '../core/units';
import type { DriveInput, VehicleState } from '../vehicle/bicycleModel';
import { VEHICLE_CONFIG_SI } from '../vehicle/vehicleConfig';
import { startSession, stepSession, type Session, type SessionLayout } from './session';

/** 檔位：前進或倒車。 */
export type RouteGear = 'forward' | 'reverse';

/** 跟折線的一段。 */
export interface PathSegment {
  readonly kind: 'path';
  readonly gear: RouteGear;
  /** 巡航車速（m/s，正值）。 */
  readonly speedMps: number;
  /** 折線（m），至少兩點、相鄰兩點不重合。後軸沿著它走；最後一點是車身中心停下的位置。 */
  readonly points: readonly GroundVector[];
}

/** 方向盤固定、走固定距離的一段。 */
export interface ArcSegment {
  readonly kind: 'arc';
  readonly gear: RouteGear;
  /** 方向盤輸入：−1（左打到底）到 +1（右打到底）；0 = 直線。 */
  readonly steer: number;
  /** 後軸要走的距離（m，正值）。有轉向時不能超過半圈。 */
  readonly distanceM: number;
  /** 巡航車速（m/s，正值）。 */
  readonly speedMps: number;
}

export type RouteSegment = PathSegment | ArcSegment;

/** 一條參考路線。 */
export interface Route {
  readonly segments: readonly RouteSegment[];
}

/** 腳本駕駛的進度。不可變；每次決策回傳新的值。 */
export interface DriverState {
  /** 正在跑第幾段；等於段數 = 路線跑完。 */
  readonly segmentIndex: number;
  /** path：後軸目前投影在折線的第幾條邊上（只會往前）。 */
  readonly pathEdge: number;
  /** 這一段已經開始收尾煞車（之後不再踩油門）。 */
  readonly braking: boolean;
  /** arc：方向盤打到位、開始走的那一刻的車身姿態；還在打方向盤是 null。 */
  readonly arcStart: Pick<VehicleState, 'x' | 'z' | 'headingRad'> | null;
}

/** 路線起點的進度。 */
export const INITIAL_DRIVER_STATE: DriverState = {
  segmentIndex: 0,
  pathEdge: 0,
  braking: false,
  arcStart: null,
};

/** 腳本駕駛的調校值（美制，集中在這裡）。 */
const DRIVER_TUNING_US = {
  /** 前視距離 = 車速 × 這個秒數，但不小於下面的最小值。 */
  lookaheadSeconds: 0.45,
  minLookaheadFt: 5,
  /** 接近終點時的減速度：車速上限 = √(蠕行² + 2 × 減速度 × 剩餘距離)。 */
  approachDecelMphPerS: 7,
  /** 最後一小段的蠕行車速；用它進剎車，停的位置誤差才小。 */
  creepMph: 1.5,
  /** 車速低於「目標 − 這個值」才補油門，高於目標就放開滑行，免得每一步都在油門與滑行間切換。 */
  speedBandMph: 0.4,
  /** 方向盤與目標角度差在這個範圍內算打到位。 */
  steerSettledDeg: 0.01,
} as const;

const MIN_LOOKAHEAD_M = ftToM(DRIVER_TUNING_US.minLookaheadFt);
const APPROACH_DECEL_MPS2 = mphPerSToMps2(DRIVER_TUNING_US.approachDecelMphPerS);
const CREEP_MPS = mphToMps(DRIVER_TUNING_US.creepMph);
const SPEED_BAND_MPS = mphToMps(DRIVER_TUNING_US.speedBandMph);
const STEER_SETTLED_RAD = (DRIVER_TUNING_US.steerSettledDeg * Math.PI) / 180;

const WHEELBASE_M = VEHICLE_CONFIG_SI.wheelbaseM;
const HALF_WHEELBASE_M = WHEELBASE_M / 2;

/** 路線跑完之後（以及每一段收尾時）的輸入：踩住剎車。 */
const HOLD_INPUT: DriveInput = { throttle: 0, steer: 0, brake: true };

function gearSign(gear: RouteGear): 1 | -1 {
  return gear === 'forward' ? 1 : -1;
}

/** 後軸中心：車身中心往後半個軸距。 */
function rearAxle(vehicle: VehicleState): GroundVector {
  const ahead = forward(vehicle.headingRad);
  return { x: vehicle.x - ahead.x * HALF_WHEELBASE_M, z: vehicle.z - ahead.z * HALF_WHEELBASE_M };
}

/** 踩剎車從這個車速停下來要走的距離。 */
function brakingDistanceM(speedMps: number): number {
  return speedMps ** 2 / (2 * VEHICLE_CONFIG_SI.brakeMps2);
}

/**
 * 油門：把車速（沿檔位方向）帶到「巡航車速與接近終點上限取小」。
 * 太快就踩反向油門（= 煞車，只會煞到 0）；略低於目標才補油門；其餘放開滑行。
 */
function throttleFor(
  vehicle: VehicleState,
  gear: RouteGear,
  cruiseMps: number,
  remainingM: number,
): -1 | 0 | 1 {
  const sign = gearSign(gear);
  const speedMps = vehicle.speedMps * sign;
  const capMps = Math.sqrt(CREEP_MPS ** 2 + 2 * APPROACH_DECEL_MPS2 * Math.max(remainingM, 0));
  const targetMps = Math.min(cruiseMps, capMps);
  if (speedMps > targetMps + SPEED_BAND_MPS) {
    return sign === 1 ? -1 : 1;
  }
  if (speedMps < targetMps - SPEED_BAND_MPS || speedMps <= 0) {
    return sign;
  }
  return 0;
}

/** 折線上（兩端沿第一、最後一條邊延伸）弧長 s 處的點。 */
function pointAtArcLength(points: readonly GroundVector[], lengths: readonly number[], s: number): GroundVector {
  let edge = 0;
  let edgeStart = 0;
  while (edge < lengths.length - 1 && s > edgeStart + (lengths[edge] ?? 0)) {
    edgeStart += lengths[edge] ?? 0;
    edge += 1;
  }
  const from = points[edge] ?? { x: 0, z: 0 };
  const to = points[edge + 1] ?? from;
  const ratio = (s - edgeStart) / (lengths[edge] ?? 1);
  return { x: from.x + (to.x - from.x) * ratio, z: from.z + (to.z - from.z) * ratio };
}

/** 一步決策的結果。done = 這一段已經跑完（車停住了），呼叫端換下一段。 */
interface SegmentStep {
  readonly input: DriveInput;
  readonly state: DriverState;
  readonly done: boolean;
}

/** path：純追蹤。 */
function drivePath(segment: PathSegment, state: DriverState, vehicle: VehicleState): SegmentStep {
  const { points } = segment;
  const sign = gearSign(segment.gear);
  const lengths = points.slice(1).map((point, index) => {
    const from = points[index] ?? point;
    return Math.hypot(point.x - from.x, point.z - from.z);
  });
  const totalM = lengths.reduce((sum, length) => sum + length, 0);
  const axle = rearAxle(vehicle);

  // 後軸投影到目前這條邊；超過邊的終點就換下一條（只往前，不回頭找）。
  let edge = Math.min(state.pathEdge, lengths.length - 1);
  let edgeStartM = lengths.slice(0, edge).reduce((sum, length) => sum + length, 0);
  let alongM = 0;
  for (;;) {
    const from = points[edge] ?? axle;
    const to = points[edge + 1] ?? from;
    const lengthM = lengths[edge] ?? 1;
    alongM = ((axle.x - from.x) * (to.x - from.x) + (axle.z - from.z) * (to.z - from.z)) / lengthM;
    if (alongM <= lengthM || edge >= lengths.length - 1) {
      break;
    }
    edgeStartM += lengthM;
    edge += 1;
  }
  const axleS = edgeStartM + alongM;
  // 車身中心在後軸的「行進方向」前方（前進）或後方（倒車）半個軸距。
  const remainingM = totalM - axleS - sign * HALF_WHEELBASE_M;

  const speedMps = Math.abs(vehicle.speedMps);
  const braking = state.braking || remainingM <= brakingDistanceM(speedMps);
  const nextState: DriverState = { ...state, pathEdge: edge, braking };
  if (braking && vehicle.speedMps === 0) {
    return { input: HOLD_INPUT, state: nextState, done: true };
  }

  // 純追蹤：在「行進方向」的座標系裡看前視點，曲率 = 2 × 橫向偏移 ÷ 距離²。
  const lookaheadM = Math.max(MIN_LOOKAHEAD_M, speedMps * DRIVER_TUNING_US.lookaheadSeconds);
  const goal = pointAtArcLength(points, lengths, axleS + lookaheadM);
  const dx = goal.x - axle.x;
  const dz = goal.z - axle.z;
  const across = right(vehicle.headingRad);
  const lateralM = (dx * across.x + dz * across.z) * sign;
  const curvature = (2 * lateralM) / Math.max(dx * dx + dz * dz, 1e-9);
  // 倒車時同樣的方向盤讓 heading 往反方向變，所以乘上檔位的正負號。
  const steerRad = Math.atan(sign * WHEELBASE_M * curvature);
  const steer = Math.min(Math.max(steerRad / VEHICLE_CONFIG_SI.maxSteerRad, -1), 1);

  if (braking) {
    return { input: { throttle: 0, steer, brake: true }, state: nextState, done: false };
  }
  return {
    input: { throttle: throttleFor(vehicle, segment.gear, segment.speedMps, remainingM), steer },
    state: nextState,
    done: false,
  };
}

/** arc 已經走了多遠：有轉向時用 heading 的變化 × 後軸迴轉半徑，直線用位移。 */
function arcTravelledM(segment: ArcSegment, start: NonNullable<DriverState['arcStart']>, vehicle: VehicleState): number {
  if (segment.steer === 0) {
    return Math.hypot(vehicle.x - start.x, vehicle.z - start.z);
  }
  const radiusM = WHEELBASE_M / Math.tan(Math.abs(segment.steer) * VEHICLE_CONFIG_SI.maxSteerRad);
  return Math.abs(headingDelta(start.headingRad, vehicle.headingRad)) * radiusM;
}

/** arc：原地打方向盤 → 走固定距離 → 踩剎車停住。 */
function driveArc(segment: ArcSegment, state: DriverState, vehicle: VehicleState): SegmentStep {
  const hold: DriveInput = { throttle: 0, steer: segment.steer, brake: true };
  let start = state.arcStart;
  if (start === null) {
    const targetRad = segment.steer * VEHICLE_CONFIG_SI.maxSteerRad;
    const settled = Math.abs(vehicle.steerRad - targetRad) <= STEER_SETTLED_RAD;
    if (!settled || vehicle.speedMps !== 0) {
      return { input: hold, state, done: false };
    }
    start = { x: vehicle.x, z: vehicle.z, headingRad: vehicle.headingRad };
  }
  const remainingM = segment.distanceM - arcTravelledM(segment, start, vehicle);
  const braking = state.braking || remainingM <= brakingDistanceM(Math.abs(vehicle.speedMps));
  const nextState: DriverState = { ...state, arcStart: start, braking };
  if (braking) {
    return { input: hold, state: nextState, done: vehicle.speedMps === 0 };
  }
  return {
    input: {
      throttle: throttleFor(vehicle, segment.gear, segment.speedMps, remainingM),
      steer: segment.steer,
    },
    state: nextState,
    done: false,
  };
}

/**
 * 一次決策：看現在的車輛狀態，回傳這一步的輸入與新的進度。
 * 一段跑完（車停住）就在同一次決策裡接下一段；整條跑完回傳「踩住剎車」。
 */
export function autoDrive(
  route: Route,
  state: DriverState,
  vehicle: VehicleState,
): { readonly input: DriveInput; readonly state: DriverState } {
  let current = state;
  for (;;) {
    const segment = route.segments[current.segmentIndex];
    if (segment === undefined) {
      return { input: HOLD_INPUT, state: current };
    }
    const step =
      segment.kind === 'path'
        ? drivePath(segment, current, vehicle)
        : driveArc(segment, current, vehicle);
    if (!step.done) {
      return { input: step.input, state: step.state };
    }
    current = { ...INITIAL_DRIVER_STATE, segmentIndex: current.segmentIndex + 1 };
  }
}

export interface RouteRunOptions {
  /** 最多跑幾個物理步；停妥或失敗會提早結束。 */
  readonly maxSteps: number;
  /** 每幾個物理步決策一次（中間沿用上一次的輸入）；不填 = 每一步。3 = 20 Hz，模擬低幀率。 */
  readonly decisionEverySteps?: number;
}

/** 從關卡起點沿路線跑真正的 stepSession，回傳最後的一局。 */
export function runRoute(layout: SessionLayout, route: Route, options: RouteRunOptions): Session {
  const every = options.decisionEverySteps ?? 1;
  let session = startSession(layout);
  let driver = INITIAL_DRIVER_STATE;
  let input: DriveInput = HOLD_INPUT;
  for (let step = 0; step < options.maxSteps; step += 1) {
    if (session.status === 'parked' || session.status === 'failed') {
      break;
    }
    if (step % every === 0) {
      const decision = autoDrive(route, driver, session.vehicle);
      driver = decision.state;
      input = decision.input;
    }
    session = stepSession(session, input);
  }
  return session;
}
