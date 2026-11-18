// 車位方向指標：車位離得遠（隔著幾排車）或不在畫面裡（俯視、直式的窄畫面、車位在側後方）時，
// HUD 顯示一個指向車位的箭頭與距離。純函式，不 import three、不碰 DOM；怎麼顯示在 ui/hud.ts。
import { TARGET_POINTER_RULES as RULES } from './gameConfig';
import { headingDelta, headingFromDirection } from './heading';
import { mToFt } from './units';

/** 指標需要知道的鏡頭狀態（render/gameCamera.ts 的 targetView 每幀算好）。 */
export interface TargetView {
  /** 畫面「上方」對應的地面方向（heading 約定）：俯視是 0（北方朝上），其餘鏡頭是鏡頭朝向。 */
  readonly yawRad: number;
  /** 車位中心在畫面上的位置（−1 到 1 是畫面內）；在鏡頭後面是 null。 */
  readonly spotScreen: { readonly x: number; readonly y: number } | null;
}

export interface TargetPointer {
  /** 箭頭在畫面上要轉的角度（弧度，0 = 朝畫面上方，順時針為正）。 */
  readonly angleRad: number;
  /** 車身中心到車位中心的距離（英尺），取到 distanceStepFt 的倍數。 */
  readonly distanceFt: number;
}

/**
 * 車位方向指標的內容；不用顯示時回傳 null。規則見 TARGET_POINTER_RULES：
 * 遠了一定顯示；近了只在車位中心不在畫面裡時顯示；已經在車位上不顯示。門檻附近維持原狀，不會閃。
 * @param shown 上一幀有沒有在顯示
 */
export function targetPointer(
  vehicle: { readonly x: number; readonly z: number },
  spot: { readonly x: number; readonly z: number },
  view: TargetView,
  shown: boolean,
): TargetPointer | null {
  const dx = spot.x - vehicle.x;
  const dz = spot.z - vehicle.z;
  const distanceM = Math.hypot(dx, dz);
  if (distanceM < RULES.minDistanceM) {
    return null;
  }
  if (distanceM <= (shown ? RULES.hideWithinM : RULES.showBeyondM)) {
    const limit = shown ? RULES.onScreenWithin : RULES.offScreenBeyond;
    const { spotScreen } = view;
    if (spotScreen !== null && Math.abs(spotScreen.x) <= limit && Math.abs(spotScreen.y) <= limit) {
      return null;
    }
  }
  const step = RULES.distanceStepFt;
  return {
    angleRad: headingDelta(view.yawRad, headingFromDirection(dx, dz)),
    distanceFt: Math.round(mToFt(distanceM) / step) * step,
  };
}
