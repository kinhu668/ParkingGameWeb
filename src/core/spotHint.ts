// 「車位在後方」的提示：車位在車的後方、玩家朝前看不到它（例如一開始車位就在正後方的直線倒車關）時，
// HUD 顯示一行低調的提示。純函式，不 import three、不碰 DOM；怎麼顯示在 ui/hud.ts。
import { forward, right } from './heading';
import { SPOT_HINT_RULES } from './gameConfig';
import { degToRad } from './units';

/**
 * 車位中心相對車頭方向的方位（弧度，0 = 正前方、±π = 正後方，右邊為正）。
 * 車就在車位中心上時回傳 0。
 */
export function spotBearingRad(
  vehicle: { readonly x: number; readonly z: number; readonly headingRad: number },
  spot: { readonly x: number; readonly z: number },
): number {
  const dx = spot.x - vehicle.x;
  const dz = spot.z - vehicle.z;
  const ahead = forward(vehicle.headingRad);
  const side = right(vehicle.headingRad);
  const aheadM = dx * ahead.x + dz * ahead.z;
  const lateralM = dx * side.x + dz * side.z;
  return aheadM === 0 && lateralM === 0 ? 0 : Math.atan2(lateralM, aheadM);
}

/**
 * 要不要顯示「車位在後方」。
 * 車位中心在車後方的扇形裡（方位超過 showBeyondDeg）、而且不是已經貼在車位上（距離超過 minDistanceM）才顯示；
 * 顯示之後要等方位回到 hideWithinDeg 以內才收起（中間那一段維持原狀，方位在門檻附近晃動時提示不會閃）。
 * @param shown 上一幀有沒有在顯示
 */
export function spotBehindHint(
  vehicle: { readonly x: number; readonly z: number; readonly headingRad: number },
  spot: { readonly x: number; readonly z: number },
  shown: boolean,
): boolean {
  const distanceM = Math.hypot(spot.x - vehicle.x, spot.z - vehicle.z);
  if (distanceM < SPOT_HINT_RULES.minDistanceM) {
    return false;
  }
  const bearing = Math.abs(spotBearingRad(vehicle, spot));
  return bearing > degToRad(shown ? SPOT_HINT_RULES.hideWithinDeg : SPOT_HINT_RULES.showBeyondDeg);
}
