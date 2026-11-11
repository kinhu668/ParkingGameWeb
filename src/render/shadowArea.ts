// 太陽陰影相機的範圍：算出剛好蓋住一塊地面（加上地面上一定高度的東西）的正交視錐。
// 純計算，不 import three。座標與 three 的陰影相機一致：相機在光源位置看向目標點，上方是世界的 +Y。
import type { GroundVector } from '../core/heading';

/** 三維方向（不必是單位長）。 */
export interface ShadowDirection {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** 陰影相機的設定：目標點（世界座標，地面上）與正交視錐的六個面（相對於光源位置）。 */
export interface ShadowBox {
  readonly targetX: number;
  readonly targetZ: number;
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
  readonly top: number;
  readonly near: number;
  readonly far: number;
}

/** 光的方向與鉛直線的夾角小到水平分量不到這個比例，就當作正上方。 */
const MIN_SIDE_LENGTH = 1e-6;

/** 近平面最少離光源這麼遠。 */
const MIN_NEAR_M = 0.1;

/**
 * 蓋住一塊地面的陰影範圍。
 * @param directionToSun 從被照的點指向太陽的方向
 * @param corners 要蓋住的地面範圍的角（世界座標）
 * @param maxHeightM 地面上會投影的東西最高多高
 * @param lightDistanceM 光源離目標點多遠
 * @param depthMarginM 近、遠平面各多留多少
 */
export function fitShadowBox(
  directionToSun: ShadowDirection,
  corners: readonly GroundVector[],
  maxHeightM: number,
  lightDistanceM: number,
  depthMarginM: number,
): ShadowBox {
  const length = Math.hypot(directionToSun.x, directionToSun.y, directionToSun.z);
  // 相機的三個軸：back 指向太陽；side = 上 × back；up = back × side。
  const back = {
    x: directionToSun.x / length,
    y: directionToSun.y / length,
    z: directionToSun.z / length,
  };
  const sideLength = Math.hypot(back.z, back.x);
  // 光從正上方來時「上 × back」是零向量，側向任選世界的 +X。
  const side =
    sideLength > MIN_SIDE_LENGTH
      ? { x: back.z / sideLength, y: 0, z: -back.x / sideLength }
      : { x: 1, y: 0, z: 0 };
  const up = {
    x: back.y * side.z - back.z * side.y,
    y: back.z * side.x - back.x * side.z,
    z: back.x * side.y - back.y * side.x,
  };

  const targetX = corners.reduce((sum, corner) => sum + corner.x, 0) / corners.length;
  const targetZ = corners.reduce((sum, corner) => sum + corner.z, 0) / corners.length;

  let left = Infinity;
  let right = -Infinity;
  let bottom = Infinity;
  let top = -Infinity;
  let nearest = -Infinity;
  let farthest = Infinity;
  for (const corner of corners) {
    for (const y of [0, maxHeightM]) {
      const dx = corner.x - targetX;
      const dz = corner.z - targetZ;
      const across = dx * side.x + y * side.y + dz * side.z;
      const upward = dx * up.x + y * up.y + dz * up.z;
      const towardSun = dx * back.x + y * back.y + dz * back.z;
      left = Math.min(left, across);
      right = Math.max(right, across);
      bottom = Math.min(bottom, upward);
      top = Math.max(top, upward);
      nearest = Math.max(nearest, towardSun);
      farthest = Math.min(farthest, towardSun);
    }
  }
  return {
    targetX,
    targetZ,
    left,
    right,
    bottom,
    top,
    near: Math.max(lightDistanceM - nearest - depthMarginM, MIN_NEAR_M),
    far: lightDistanceM - farthest + depthMarginM,
  };
}
