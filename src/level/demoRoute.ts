// `?cam` 與 `?bench` 共用的固定示範路線：一張「時間 → 輸入」的表。不 import three、不碰 DOM。
// 從原型場景的起點出發：直行加速 → 右轉 → 左轉繞回來 → 右轉擺正 → 手煞車，最後停進車位。
// 同樣的步數永遠得到同樣的車輛狀態，截圖才能逐像素比較。
import { FIXED_STEP_SECONDS, PHYSICS_HZ } from '../core/gameConfig';
import { stepVehicle, type DriveInput, type VehicleState } from '../vehicle/bicycleModel';

/** 示範路線的總長（秒）；`?bench` 也跑這麼久。 */
export const DEMO_ROUTE_SECONDS = 10;

/** 示範路線的總物理步數。 */
export const DEMO_ROUTE_STEPS = Math.round(DEMO_ROUTE_SECONDS * PHYSICS_HZ);

/** 拉住手煞車、其餘放開；路線的最後一段，也是路線結束之後的輸入。 */
const HOLD_INPUT: DriveInput = { throttle: 0, steer: 0, handbrake: true };

/**
 * 路線表：每一列的輸入用到 untilSeconds 為止（不含），依時間遞增排列。
 * 數值是用現在的車輛手感調出來的；改了 VehicleConfig 車就不會剛好停進車位，要重調。
 */
const DEMO_ROUTE: readonly { readonly untilSeconds: number; readonly input: DriveInput }[] = [
  { untilSeconds: 1.75, input: { throttle: 1, steer: 0, handbrake: false } },
  { untilSeconds: 3, input: { throttle: 1, steer: 1, handbrake: false } },
  { untilSeconds: 5.5, input: { throttle: 1, steer: -1, handbrake: false } },
  { untilSeconds: 7, input: { throttle: 1, steer: 1, handbrake: false } },
  { untilSeconds: 7.25, input: { throttle: 1, steer: 0, handbrake: false } },
  { untilSeconds: DEMO_ROUTE_SECONDS, input: HOLD_INPUT },
];

/** 第 stepIndex 個物理步（從 0 起算）要用的輸入。路線結束之後一直拉著手煞車。 */
export function demoInputAtStep(stepIndex: number): DriveInput {
  for (const segment of DEMO_ROUTE) {
    // 分段邊界換成整數步數再比較，不累加浮點秒數。
    if (stepIndex < Math.round(segment.untilSeconds * PHYSICS_HZ)) {
      return segment.input;
    }
  }
  return HOLD_INPUT;
}

/** 從 start 出發沿示範路線跑 steps 步物理後的車輛狀態。 */
export function demoVehicleAfterSteps(start: VehicleState, steps: number): VehicleState {
  let vehicle = start;
  for (let stepIndex = 0; stepIndex < steps; stepIndex += 1) {
    vehicle = stepVehicle(vehicle, demoInputAtStep(stepIndex), FIXED_STEP_SECONDS);
  }
  return vehicle;
}
