// 倒車雷達量的距離：車尾往正後方直直退，退多遠會碰到東西。純函式，不 import three、不碰 DOM。
// 看的是 collision.ts 的同一批碰撞盒（`layout.obstacles`：關卡的障礙物加四面邊界牆），所以「雷達說還有多遠」
// 與「再退多遠會被記一次碰撞」是同一把尺。只看正後方，不知道方向盤打了多少。
import { forward, right } from '../core/heading';
import { ftToM, mToFt } from '../core/units';
import type { VehicleState } from '../vehicle/bicycleModel';
import { VEHICLE_CONFIG_SI } from '../vehicle/vehicleConfig';
import { obbCorners, obbRadius, type Obb } from './collision';

/**
 * 掃的那一條帶子比車身每邊多寬這麼多（ft）：車尾的角差一點點就擦到的東西也算在後面。
 * 取得很小：倒進兩台車中間時，兩旁的車（各離 1 ft 以上）不會讓雷達一直叫。
 */
export const REAR_SENSOR_SIDE_MARGIN_FT = 0.25;

const HALF_BAND_M = VEHICLE_CONFIG_SI.widthM / 2 + ftToM(REAR_SENSOR_SIDE_MARGIN_FT);
const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;
/** 帶子的左緣與右緣（u 座標）。 */
const BAND_EDGES_M = [-HALF_BAND_M, HALF_BAND_M] as const;

/**
 * 車尾保險桿往正後方到最近的碰撞盒的淨距離（ft）；正後方沒有東西是 Infinity，已經貼著是 0。
 * 做法：把每個碰撞盒換到「車尾中點為原點、u 向右、w 向後」的座標，切出落在帶子（|u| ≤ 半寬）裡的那一塊，
 * 取它最小的 w。整塊都在車尾那條線之前（w ≤ 0：車頭前面的東西）不算。
 */
export function rearClearanceFt(
  vehicle: Pick<VehicleState, 'x' | 'z' | 'headingRad'>,
  obstacles: readonly Obb[],
): number {
  const ahead = forward(vehicle.headingRad);
  const across = right(vehicle.headingRad);
  const rearX = vehicle.x - ahead.x * HALF_LENGTH_M;
  const rearZ = vehicle.z - ahead.z * HALF_LENGTH_M;
  let nearestM = Number.POSITIVE_INFINITY;
  for (const obstacle of obstacles) {
    // 粗篩（每幀都跑，絕大多數的盒子在這裡就跳過）：整個外接圓都在帶子外面，或都在車尾那條線之前。
    const radiusM = obbRadius(obstacle);
    const centerU = (obstacle.x - rearX) * across.x + (obstacle.z - rearZ) * across.z;
    const centerW = -((obstacle.x - rearX) * ahead.x + (obstacle.z - rearZ) * ahead.z);
    if (Math.abs(centerU) - radiusM > HALF_BAND_M || centerW + radiusM <= 0) {
      continue;
    }
    let minW = Number.POSITIVE_INFINITY;
    let maxW = Number.NEGATIVE_INFINITY;
    const corners = obbCorners(obstacle);
    let previous = corners[3];
    let previousU = (previous.x - rearX) * across.x + (previous.z - rearZ) * across.z;
    let previousW = -((previous.x - rearX) * ahead.x + (previous.z - rearZ) * ahead.z);
    for (const corner of corners) {
      const u = (corner.x - rearX) * across.x + (corner.z - rearZ) * across.z;
      const w = -((corner.x - rearX) * ahead.x + (corner.z - rearZ) * ahead.z);
      if (Math.abs(u) <= HALF_BAND_M) {
        minW = Math.min(minW, w);
        maxW = Math.max(maxW, w);
      }
      // 這條邊穿過帶子的左緣或右緣：交點也是切出來那一塊的頂點。
      for (const edgeU of BAND_EDGES_M) {
        if ((previousU - edgeU) * (u - edgeU) < 0) {
          const crossW = previousW + ((edgeU - previousU) / (u - previousU)) * (w - previousW);
          minW = Math.min(minW, crossW);
          maxW = Math.max(maxW, crossW);
        }
      }
      previous = corner;
      previousU = u;
      previousW = w;
    }
    if (maxW > 0) {
      nearestM = Math.min(nearestM, Math.max(minW, 0));
    }
  }
  return mToFt(nearestM);
}
