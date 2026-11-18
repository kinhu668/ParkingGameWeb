// 車位方向指標：車位離得遠（隔著幾排車、或在俯視鏡頭的畫面外）時，HUD 顯示一個指向車位的箭頭與距離。
// 純函式，不 import three、不碰 DOM；怎麼顯示在 ui/hud.ts。
import { TARGET_POINTER_RULES } from './gameConfig';
import { headingDelta, headingFromDirection } from './heading';
import { mToFt } from './units';

export interface TargetPointer {
  /** 箭頭在畫面上要轉的角度（弧度，0 = 朝畫面上方，順時針為正）。 */
  readonly angleRad: number;
  /** 車身中心到車位中心的距離（英尺），取到 distanceStepFt 的倍數。 */
  readonly distanceFt: number;
}

/**
 * 車位方向指標的內容；不用顯示時回傳 null。
 * 車位中心離車超過 showBeyondM 才出現，回到 hideWithinM 以內才收起（中間那一段維持原狀，不會閃）：
 * 近了之後車位的發光標記就在眼前，不需要箭頭。
 * @param viewYawRad 畫面「上方」對應的地面方向（heading 約定）：俯視是 0（北方朝上），其餘鏡頭是鏡頭朝向
 * @param shown 上一幀有沒有在顯示
 */
export function targetPointer(
  vehicle: { readonly x: number; readonly z: number },
  spot: { readonly x: number; readonly z: number },
  viewYawRad: number,
  shown: boolean,
): TargetPointer | null {
  const dx = spot.x - vehicle.x;
  const dz = spot.z - vehicle.z;
  const distanceM = Math.hypot(dx, dz);
  if (distanceM <= (shown ? TARGET_POINTER_RULES.hideWithinM : TARGET_POINTER_RULES.showBeyondM)) {
    return null;
  }
  const step = TARGET_POINTER_RULES.distanceStepFt;
  return {
    angleRad: headingDelta(viewYawRad, headingFromDirection(dx, dz)),
    distanceFt: Math.round(mToFt(distanceM) / step) * step,
  };
}
