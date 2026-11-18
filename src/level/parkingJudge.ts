// 停車判定（計畫第 5 節）：純函式，不 import three、不碰 DOM。
// 每個物理步檢查三個條件，連續成立滿 REQUIRED_HOLD_STEPS 步才算停妥；中斷就歸零。
import { PARKING_RULES, PHYSICS_HZ } from '../core/gameConfig';
import { forward, headingDelta, right } from '../core/heading';
import { degToRad, ftToM, mphToMps } from '../core/units';
import { vehicleCorners, type VehicleState } from '../vehicle/bicycleModel';

/** 對外（關卡資料）的車位：英尺與度。 */
export interface ParkingSpotFt {
  /** 車位中心的世界座標（ft）。 */
  readonly centerXFt: number;
  readonly centerZFt: number;
  /** 橫向（垂直於 heading）的寬度。 */
  readonly widthFt: number;
  /** 縱向（沿 heading）的長度。 */
  readonly lengthFt: number;
  /** 車位的方向（縱向軸）。沒有 headInHeadingDeg 的車位（路邊平行停車）只接受車頭朝這個方向。 */
  readonly headingDeg: number;
  /**
   * 一般車位才有：車頭入庫時車頭朝的方向（朝車位底部、遠離通道），等於 headingDeg 或它的反向。
   * 有這個欄位的車位兩個朝向都算停妥：朝它 = 車頭入庫，朝它的反向 = 倒車入庫。
   */
  readonly headInHeadingDeg?: number;
  /** 夾角容許值（含邊界）；不填用 PARKING_RULES.defaultAngleToleranceDeg。 */
  readonly angleToleranceDeg?: number;
}

/** 判定用的車位：公尺與弧度。 */
export interface ParkingSpot {
  /** 車位中心的世界座標（m）。 */
  readonly x: number;
  readonly z: number;
  readonly widthM: number;
  readonly lengthM: number;
  readonly headingRad: number;
  /** 一般車位：車頭入庫的車頭方向，兩個朝向都合法。null = 只接受 headingRad（路邊平行停車）。 */
  readonly headInHeadingRad: number | null;
  readonly angleToleranceRad: number;
}

/** 吸收浮點誤差用的長度容差：剛好壓在邊線上的角不會因為最後一個位元被判成在外。 */
const LENGTH_EPSILON_M = 1e-9;

/** 吸收浮點誤差用的角度容差：剛好等於容許值的夾角算在內。 */
const ANGLE_EPSILON_RAD = 1e-9;

/** 車速門檻。嚴格小於、不加容差。 */
const MAX_PARKED_SPEED_MPS = mphToMps(PARKING_RULES.maxSpeedMph);

/** 判定條件要連續成立的物理步數（1 秒 @ 60 Hz = 60）。用整數步數計，不累加浮點秒數。 */
export const REQUIRED_HOLD_STEPS = Math.round(PARKING_RULES.holdSeconds * PHYSICS_HZ);

/** 英尺／度的車位資料 → 判定用的公尺／弧度。 */
export function parkingSpotFromFt(spot: ParkingSpotFt): ParkingSpot {
  return {
    x: ftToM(spot.centerXFt),
    z: ftToM(spot.centerZFt),
    widthM: ftToM(spot.widthFt),
    lengthM: ftToM(spot.lengthFt),
    headingRad: degToRad(spot.headingDeg),
    headInHeadingRad: spot.headInHeadingDeg === undefined ? null : degToRad(spot.headInHeadingDeg),
    angleToleranceRad: degToRad(spot.angleToleranceDeg ?? PARKING_RULES.defaultAngleToleranceDeg),
  };
}

/**
 * 車頭與合法朝向的夾角（弧度，絕對值）。HUD 的角度誤差與 3 星的門檻都看它。
 * 一般車位有兩個合法朝向（車頭入庫、倒車入庫），取較近的那個，範圍 0–π/2；
 * 路邊平行停車只有車位的 heading，範圍 0–π。
 */
export function angleErrorRad(vehicle: Pick<VehicleState, 'headingRad'>, spot: ParkingSpot): number {
  if (spot.headInHeadingRad === null) {
    return Math.abs(headingDelta(vehicle.headingRad, spot.headingRad));
  }
  const fromHeadIn = Math.abs(headingDelta(vehicle.headingRad, spot.headInHeadingRad));
  return Math.min(fromHeadIn, Math.PI - fromHeadIn);
}

/** 停進一般車位的方式；路邊平行停車沒有這個分別。 */
export type ParkFacing = 'head_in' | 'back_in';

/**
 * 車頭離哪個合法朝向比較近：朝車位底部 = 車頭入庫，朝通道 = 倒車入庫（看停妥的車頭方向，不看最後的檔位）。
 * 路邊平行停車的車位回傳 null。
 */
export function parkFacing(
  vehicle: Pick<VehicleState, 'headingRad'>,
  spot: ParkingSpot,
): ParkFacing | null {
  if (spot.headInHeadingRad === null) {
    return null;
  }
  const fromHeadIn = Math.abs(headingDelta(vehicle.headingRad, spot.headInHeadingRad));
  return fromHeadIn <= Math.PI / 2 ? 'head_in' : 'back_in';
}

/** 條件 1：車身四個角都在車位內。角轉到車位本地座標（橫向、縱向）後比半寬、半長；邊線算內。 */
function allCornersInside(vehicle: VehicleState, spot: ParkingSpot): boolean {
  const spotRight = right(spot.headingRad);
  const spotForward = forward(spot.headingRad);
  const maxLateralM = spot.widthM / 2 + LENGTH_EPSILON_M;
  const maxLongitudinalM = spot.lengthM / 2 + LENGTH_EPSILON_M;
  return vehicleCorners(vehicle).every((corner) => {
    const dx = corner.x - spot.x;
    const dz = corner.z - spot.z;
    const lateralM = dx * spotRight.x + dz * spotRight.z;
    const longitudinalM = dx * spotForward.x + dz * spotForward.z;
    return Math.abs(lateralM) <= maxLateralM && Math.abs(longitudinalM) <= maxLongitudinalM;
  });
}

/**
 * 條件 2：車頭與合法朝向的夾角在容許值內（含邊界）。
 * 一般車位兩個朝向都合法；路邊平行停車車頭反向時差值是 180°，不會被當成對正。
 */
function headingAligned(vehicle: VehicleState, spot: ParkingSpot): boolean {
  return angleErrorRad(vehicle, spot) <= spot.angleToleranceRad + ANGLE_EPSILON_RAD;
}

/** 條件 3：車速夠慢。倒車是負值，看絕對值。 */
function slowEnough(vehicle: VehicleState): boolean {
  return Math.abs(vehicle.speedMps) < MAX_PARKED_SPEED_MPS;
}

/** 這一步的三個條件是否同時成立。 */
export function parkingConditionsMet(vehicle: VehicleState, spot: ParkingSpot): boolean {
  return slowEnough(vehicle) && headingAligned(vehicle, spot) && allCornersInside(vehicle, spot);
}

/** 跑完一步物理後更新「已連續成立幾步」：這一步成立就加 1，不成立歸零。 */
export function nextHeldSteps(heldSteps: number, vehicle: VehicleState, spot: ParkingSpot): number {
  return parkingConditionsMet(vehicle, spot) ? heldSteps + 1 : 0;
}

/** 連續成立的步數是否已經滿了（停妥）。 */
export function isHoldComplete(heldSteps: number): boolean {
  return heldSteps >= REQUIRED_HOLD_STEPS;
}
