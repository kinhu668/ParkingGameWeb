// 觸控操作的純邏輯：要不要顯示觸控層、虛擬方向盤的角度（拖曳、夾住、放開回正）、
// 觸控狀態 → 駕駛輸入、與鍵盤輸入合併。不 import three、不碰 DOM。
import type { DriveInput } from '../vehicle/bicycleModel';
import type { Gearbox } from '../vehicle/gearbox';
import type { TouchParam } from './urlParams';

/**
 * 要不要顯示螢幕操作層（方向盤、踏板、掛檔等）。預設顯示：手機用手指、桌面用滑鼠都能操作。
 * 只有 `?touch=off` 才隱藏；`?touch=on` 與沒給（或不認得的值）都顯示。
 */
export function touchLayerEnabled(param: TouchParam | undefined): boolean {
  return param !== 'off';
}

/**
 * 要不要顯示鍵盤提示（控制項上的鍵帽、暫停與結算面板上的「按 … 繼續／重來」）。
 * 主要指標是手指（`pointer: coarse`，手機與平板）就不顯示：那裡沒有鍵盤，畫面上已經有按鈕。
 */
export function keyboardHintsEnabled(coarsePointer: boolean): boolean {
  return !coarsePointer;
}

/** 方向盤往一邊最多轉這麼多（弧度，約 120°）；轉到這裡就是打到底。 */
export const WHEEL_MAX_ANGLE_RAD = (2 * Math.PI) / 3;

/** 放開後從打到底回正要多久（秒）：短回彈。 */
const WHEEL_RETURN_SECONDS = 0.18;

/** 手指離方向盤中心比「半徑 × 這個比例」還近時角度不穩定，這段移動不算。 */
const WHEEL_DEAD_RADIUS_FRACTION = 0.15;

/** 把角度差收到 (−π, π]：手指繞過 ±π 的接縫時不會突然跳一整圈。 */
function wrapAngle(rad: number): number {
  let wrapped = rad;
  while (wrapped > Math.PI) {
    wrapped -= 2 * Math.PI;
  }
  while (wrapped <= -Math.PI) {
    wrapped += 2 * Math.PI;
  }
  return wrapped;
}

/** 手指相對方向盤中心的位置（CSS 像素，x 向右、y 向下）。 */
export interface WheelPoint {
  readonly dx: number;
  readonly dy: number;
}

/**
 * 手指從 from 拖到 to 之後方向盤的角度（弧度，順時針＝向右為正）。
 * 角度的變化 = 手指繞中心轉了多少，結果夾在 ±WHEEL_MAX_ANGLE_RAD。
 * 任一點太靠近中心（radiusPx 的一小部分以內）就不動。
 */
export function wheelAngleAfterDrag(
  angleRad: number,
  from: WheelPoint,
  to: WheelPoint,
  radiusPx: number,
): number {
  const deadPx = radiusPx * WHEEL_DEAD_RADIUS_FRACTION;
  if (Math.hypot(from.dx, from.dy) < deadPx || Math.hypot(to.dx, to.dy) < deadPx) {
    return angleRad;
  }
  // 螢幕座標 y 向下，atan2(dy, dx) 增加就是順時針。
  const delta = wrapAngle(Math.atan2(to.dy, to.dx) - Math.atan2(from.dy, from.dx));
  return Math.min(Math.max(angleRad + delta, -WHEEL_MAX_ANGLE_RAD), WHEEL_MAX_ANGLE_RAD);
}

/** 放開方向盤後經過 seconds 的角度：等速回正，停在剛好 0，不會越過。 */
export function wheelAngleAfterRelease(angleRad: number, seconds: number): number {
  const step = (WHEEL_MAX_ANGLE_RAD / WHEEL_RETURN_SECONDS) * Math.max(seconds, 0);
  if (Math.abs(angleRad) <= step) {
    return 0;
  }
  return angleRad - Math.sign(angleRad) * step;
}

/** 方向盤角度 → 轉向輸入（−1 左打到底 … +1 右打到底）。 */
export function steerFromWheelAngle(angleRad: number): number {
  return Math.min(Math.max(angleRad / WHEEL_MAX_ANGLE_RAD, -1), 1);
}

/** 觸控層這一幀的狀態。 */
export interface TouchDriveState {
  /** 方向盤角度（弧度，向右為正）。 */
  readonly wheelAngleRad: number;
  /** 油門踏板是否踩著。 */
  readonly gas: boolean;
  /** 剎車踏板是否踩著。 */
  readonly brake: boolean;
}

/** 什麼都沒碰。 */
export const NO_TOUCH_DRIVE: TouchDriveState = { wheelAngleRad: 0, gas: false, brake: false };

/**
 * 觸控狀態 → 駕駛輸入。油門踏板只有一顆：方向是目前檔位允許的方向——
 * 自排與手排 D 檔向前，手排 R 檔向後（要倒車先點掛 R）。剎車踏板是腳剎。
 */
export function touchDriveInput(state: TouchDriveState, gearbox: Gearbox): DriveInput {
  const direction = gearbox.manual && gearbox.gear === 'reverse' ? -1 : 1;
  return {
    throttle: state.gas ? direction : 0,
    steer: steerFromWheelAngle(state.wheelAngleRad),
    handbrake: false,
    brake: state.brake,
  };
}

/**
 * 鍵盤與觸控的輸入合在一起（外接鍵盤與螢幕可以同時用）：
 * 油門以鍵盤為主，鍵盤沒踩才看觸控；轉向相加後夾在 ±1；手煞車與腳剎任一邊踩著就算。
 */
export function mergeDriveInputs(keyboard: DriveInput, touch: DriveInput): DriveInput {
  return {
    throttle: keyboard.throttle !== 0 ? keyboard.throttle : touch.throttle,
    steer: Math.min(Math.max(keyboard.steer + touch.steer, -1), 1),
    handbrake: keyboard.handbrake || touch.handbrake,
    brake: (keyboard.brake ?? false) || (touch.brake ?? false),
  };
}
