// 測試共用：產生「沿直線開到車位中心附近停下」的逐步輸入，讓判定與 session 測試都走真正的物理。
import { FIXED_STEP_SECONDS } from '../src/core/gameConfig';
import type { ParkingSpot } from '../src/level/parkingJudge';
import { stepVehicle, type DriveInput, type VehicleState } from '../src/vehicle/bicycleModel';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';

export const IDLE: DriveInput = { throttle: 0, steer: 0, handbrake: false };

/** 找不到停下來的時機就放棄的步數上限（60 秒）。 */
const MAX_APPROACH_STEPS = 3600;

/**
 * 車已經對準車位中心（中心在車的行進直線上）時，回傳每一步的輸入：
 * 先踩油門（throttle = 1 前進、−1 倒車），離中心的距離不超過手煞車的煞停距離後改拉手煞車直到停下。
 * 停下的位置離車位中心不到一步的行進距離（最高速時約 0.44 ft）。
 */
export function inputsToStopAtSpotCenter(
  start: VehicleState,
  spot: ParkingSpot,
  throttle: 1 | -1,
): DriveInput[] {
  const inputs: DriveInput[] = [];
  let vehicle = start;
  let braking = false;
  for (let step = 0; step < MAX_APPROACH_STEPS; step += 1) {
    const remainingM = Math.hypot(spot.x - vehicle.x, spot.z - vehicle.z);
    const stoppingM = vehicle.speedMps ** 2 / (2 * VEHICLE_CONFIG_SI.handbrakeMps2);
    if (remainingM <= stoppingM) {
      braking = true;
    }
    if (braking && vehicle.speedMps === 0) {
      return inputs;
    }
    const input: DriveInput = braking ? { ...IDLE, handbrake: true } : { ...IDLE, throttle };
    inputs.push(input);
    vehicle = stepVehicle(vehicle, input, FIXED_STEP_SECONDS);
  }
  throw new Error('車沒有在步數上限內停下');
}
