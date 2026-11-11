// 單車模型（bicycle model）：車的狀態、單步更新、車身四角。
// 內部一律公尺、秒、弧度；數值全部來自 VEHICLE_CONFIG_SI。不 import three、不碰 DOM。
import { forward, normalizeHeading, right, type GroundVector } from '../core/heading';
import { VEHICLE_CONFIG_SI } from './vehicleConfig';

/** 車輛狀態。 */
export interface VehicleState {
  /** 車身中心的世界座標 x（m）。 */
  readonly x: number;
  /** 車身中心的世界座標 z（m）。 */
  readonly z: number;
  /** 車頭方向（rad），0 朝 −Z、順時針為正，範圍 [0, 2π)。 */
  readonly headingRad: number;
  /** 車速（m/s），前進為正、倒車為負。 */
  readonly speedMps: number;
  /** 前輪轉向角（rad），向右為正，範圍 ±最大轉向角。 */
  readonly steerRad: number;
}

/** 駕駛輸入。 */
export interface DriveInput {
  /** 油門：+1 前進、−1 倒車、0 放開。 */
  readonly throttle: -1 | 0 | 1;
  /** 方向盤：−1（左打到底）到 +1（右打到底），0 = 放開。超出範圍會被夾住。 */
  readonly steer: number;
  /** 手煞車是否按住。 */
  readonly handbrake: boolean;
}

/** 車身四角的世界座標，從上方看順時針排列。 */
export type VehicleCorners = readonly [
  frontLeft: GroundVector,
  frontRight: GroundVector,
  rearRight: GroundVector,
  rearLeft: GroundVector,
];

// 前後懸對稱（計畫第 14 節假設 1）：後軸在車身中心後方半個軸距。
const HALF_WHEELBASE_M = VEHICLE_CONFIG_SI.wheelbaseM / 2;
const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;
const HALF_WIDTH_M = VEHICLE_CONFIG_SI.widthM / 2;

/**
 * 從 current 朝 target 移動，最多走 maxDelta；夠近就停在剛好 target，不會越過。
 * 減速「停在剛好 0、同一步不變號」靠的就是這個。
 */
function moveToward(current: number, target: number, maxDelta: number): number {
  const remaining = target - current;
  if (Math.abs(remaining) <= maxDelta) {
    return target;
  }
  return current + Math.sign(remaining) * maxDelta;
}

/** 步驟 1：方向盤。有輸入朝「輸入 × 最大轉向角」打，沒輸入回正。 */
function nextSteer(steerRad: number, steerInput: number, dtSeconds: number): number {
  if (steerInput === 0) {
    return moveToward(steerRad, 0, VEHICLE_CONFIG_SI.steerReturnRateRadPerS * dtSeconds);
  }
  // 輸入夾在 ±1，目標就在 ±最大轉向角內；moveToward 不會越過目標，所以轉向角也出不了這個範圍。
  const clampedInput = Math.min(Math.max(steerInput, -1), 1);
  return moveToward(
    steerRad,
    clampedInput * VEHICLE_CONFIG_SI.maxSteerRad,
    VEHICLE_CONFIG_SI.steerRateRadPerS * dtSeconds,
  );
}

/** 步驟 2：車速。優先順序：手煞車 → 沒油門滑行 → 反向油門煞車 → 同向（或靜止）加速。 */
function nextSpeed(speedMps: number, input: DriveInput, dtSeconds: number): number {
  if (input.handbrake) {
    return moveToward(speedMps, 0, VEHICLE_CONFIG_SI.handbrakeMps2 * dtSeconds);
  }
  if (input.throttle === 0) {
    return moveToward(speedMps, 0, VEHICLE_CONFIG_SI.coastDecelMps2 * dtSeconds);
  }
  // 油門與行進方向相反：只煞到 0。這一步停在 0，下一步（速度為 0）才走下面的加速。
  if (speedMps * input.throttle < 0) {
    return moveToward(speedMps, 0, VEHICLE_CONFIG_SI.brakeMps2 * dtSeconds);
  }
  const speedLimitMps =
    input.throttle > 0 ? VEHICLE_CONFIG_SI.maxSpeedMps : -VEHICLE_CONFIG_SI.maxReverseSpeedMps;
  return moveToward(speedMps, speedLimitMps, VEHICLE_CONFIG_SI.accelerationMps2 * dtSeconds);
}

/**
 * 跑一步物理，回傳新狀態（不改動傳入的狀態）。順序固定（計畫 4.3）：
 * 方向盤 → 車速 → heading → 位置 → heading 正規化。
 */
export function stepVehicle(
  state: VehicleState,
  input: DriveInput,
  dtSeconds: number,
): VehicleState {
  const steerRad = nextSteer(state.steerRad, input.steer, dtSeconds);
  const speedMps = nextSpeed(state.speedMps, input, dtSeconds);

  // 步驟 3：Δθ = (speed / 軸距) × tan(steer) × dt。倒車時 speed 為負，同樣向右打 heading 會減少。
  const headingChangeRad =
    (speedMps / VEHICLE_CONFIG_SI.wheelbaseM) * Math.tan(steerRad) * dtSeconds;
  const newHeadingRad = state.headingRad + headingChangeRad;

  // 步驟 4：後軸沿中點方向 forward(θ + Δθ/2) 走 speed × dt，再換回車身中心。
  //   後軸   = 中心 − forward(θ) × 軸距/2
  //   新中心 = 新後軸 + forward(θ + Δθ) × 軸距/2
  // 兩式合併成「中心 + 後軸位移 + (新舊 forward 的差) × 軸距/2」。
  // 這樣靜止時每一項都剛好是 0，位置逐位元不變，不會因為來回換算累積誤差。
  const travelM = speedMps * dtSeconds;
  const travelDirection = forward(state.headingRad + headingChangeRad / 2);
  const oldForward = forward(state.headingRad);
  const newForward = forward(newHeadingRad);

  return {
    x: state.x + travelDirection.x * travelM + (newForward.x - oldForward.x) * HALF_WHEELBASE_M,
    z: state.z + travelDirection.z * travelM + (newForward.z - oldForward.z) * HALF_WHEELBASE_M,
    headingRad: normalizeHeading(newHeadingRad),
    speedMps,
    steerRad,
  };
}

/** 車身矩形四個角的世界座標：中心 + right(θ)·(±寬/2) + forward(θ)·(±長/2)。 */
export function vehicleCorners(state: VehicleState): VehicleCorners {
  const forwardDirection = forward(state.headingRad);
  const rightDirection = right(state.headingRad);
  const corner = (lateralM: number, longitudinalM: number): GroundVector => ({
    x: state.x + rightDirection.x * lateralM + forwardDirection.x * longitudinalM,
    z: state.z + rightDirection.z * lateralM + forwardDirection.z * longitudinalM,
  });
  return [
    corner(-HALF_WIDTH_M, HALF_LENGTH_M),
    corner(HALF_WIDTH_M, HALF_LENGTH_M),
    corner(HALF_WIDTH_M, -HALF_LENGTH_M),
    corner(-HALF_WIDTH_M, -HALF_LENGTH_M),
  ];
}
