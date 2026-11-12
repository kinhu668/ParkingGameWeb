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
  /** 停好時車頭該朝的方向。倒車入庫的車位也是填車頭方向，判定不另外放寬 180°。 */
  readonly headingDeg: number;
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
    angleToleranceRad: degToRad(spot.angleToleranceDeg ?? PARKING_RULES.defaultAngleToleranceDeg),
  };
}

/** 車頭與車位 heading 的夾角（弧度，絕對值，0–π）。HUD 的角度誤差與 3 星的門檻都看它。 */
export function angleErrorRad(vehicle: Pick<VehicleState, 'headingRad'>, spot: ParkingSpot): number {
  return Math.abs(headingDelta(vehicle.headingRad, spot.headingRad));
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
 * 條件 2：車頭與車位 heading 的夾角在容許值內（含邊界）。
 * headingDelta 折到 (−180°, 180°]，所以車頭反向時差值是 180°，不會被當成對正。
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
