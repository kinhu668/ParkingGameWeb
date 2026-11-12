// 2D 碰撞：有方向的矩形（OBB）與分離軸測試。不 import three、不碰 DOM。
// 內部一律公尺、弧度；heading 約定與 core/heading.ts 相同（0 朝 −Z、從上方看順時針為正）。
// 碰撞的資料來源只有關卡 JSON 的 `obstacles` 與 `bounds`；場景裡的擺設不在這裡。
import { forward, right, type GroundVector } from '../core/heading';
import { degToRad, ftToM } from '../core/units';
import type { VehicleState } from '../vehicle/bicycleModel';
import { VEHICLE_CONFIG_SI } from '../vehicle/vehicleConfig';

/** 地面上有方向的矩形。 */
export interface Obb {
  /** 中心的世界座標（m）。 */
  readonly x: number;
  readonly z: number;
  /** 橫向（垂直於 heading）的半寬（m）。 */
  readonly halfWidthM: number;
  /** 縱向（沿 heading）的半長（m）。 */
  readonly halfLengthM: number;
  readonly headingRad: number;
}

/** 對外（關卡資料）的矩形：英尺與度。 */
export interface ObbFt {
  readonly centerXFt: number;
  readonly centerZFt: number;
  /** 橫向（垂直於 heading）的寬度。 */
  readonly widthFt: number;
  /** 縱向（沿 heading）的長度。 */
  readonly lengthFt: number;
  readonly headingDeg: number;
}

/** 可行駛範圍：軸對齊矩形（英尺）。 */
export interface BoundsFt {
  readonly minXFt: number;
  readonly minZFt: number;
  readonly maxXFt: number;
  readonly maxZFt: number;
}

/**
 * 穿透深度要超過這個值才算重疊：剛好相切（間隙 0）不算，
 * 浮點誤差也不會讓「貼著停好」的車被判成撞到。
 */
const OVERLAP_EPSILON_M = 1e-9;

/**
 * 邊界碰撞盒的厚度（英尺），往可行駛範圍外面長。
 * 只要比一步的最大位移（最高速約 0.44 ft）大就穿不過去；取寬一點，四個角也互相蓋住。
 */
export const BOUNDS_WALL_THICKNESS_FT = 4;

const VEHICLE_HALF_WIDTH_M = VEHICLE_CONFIG_SI.widthM / 2;
const VEHICLE_HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;

/** 英尺／度的矩形 → 公尺／弧度。 */
export function obbFromFt(box: ObbFt): Obb {
  return {
    x: ftToM(box.centerXFt),
    z: ftToM(box.centerZFt),
    halfWidthM: ftToM(box.widthFt) / 2,
    halfLengthM: ftToM(box.lengthFt) / 2,
    headingRad: degToRad(box.headingDeg),
  };
}

/** 車身的矩形：與 vehicleCorners() 是同一個外框。 */
export function vehicleObb(vehicle: Pick<VehicleState, 'x' | 'z' | 'headingRad'>): Obb {
  return {
    x: vehicle.x,
    z: vehicle.z,
    halfWidthM: VEHICLE_HALF_WIDTH_M,
    halfLengthM: VEHICLE_HALF_LENGTH_M,
    headingRad: vehicle.headingRad,
  };
}

/** 矩形的四個角，從上方看順時針：前左、前右、後右、後左。 */
export function obbCorners(box: Obb): readonly [GroundVector, GroundVector, GroundVector, GroundVector] {
  const along = forward(box.headingRad);
  const across = right(box.headingRad);
  const corner = (lateralM: number, longitudinalM: number): GroundVector => ({
    x: box.x + across.x * lateralM + along.x * longitudinalM,
    z: box.z + across.z * lateralM + along.z * longitudinalM,
  });
  return [
    corner(-box.halfWidthM, box.halfLengthM),
    corner(box.halfWidthM, box.halfLengthM),
    corner(box.halfWidthM, -box.halfLengthM),
    corner(-box.halfWidthM, -box.halfLengthM),
  ];
}

/** 外接圓半徑（中心到角的距離）。 */
export function obbRadius(box: Obb): number {
  return Math.hypot(box.halfWidthM, box.halfLengthM);
}

/**
 * 粗篩：兩個外接圓有沒有碰到。回傳 false 代表一定沒有重疊；回傳 true 還要做分離軸測試。
 * 判斷比分離軸寬鬆（相切也算可能），所以不會漏判。
 */
export function boundingCirclesTouch(a: Obb, b: Obb): boolean {
  const reach = obbRadius(a) + obbRadius(b);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return dx * dx + dz * dz <= reach * reach;
}

/** 矩形投影到單位向量 axis 上的半徑。 */
function projectedRadius(box: Obb, across: GroundVector, along: GroundVector, axis: GroundVector): number {
  return (
    box.halfWidthM * Math.abs(across.x * axis.x + across.z * axis.z) +
    box.halfLengthM * Math.abs(along.x * axis.x + along.z * axis.z)
  );
}

/**
 * 分離軸測試：兩個矩形是否重疊。
 * 兩個矩形各出兩條邊的法線，共四條軸；只要有一條軸上兩者的投影不相交，就沒有重疊。
 * 剛好相切（間隙 0）不算重疊。
 */
export function obbsOverlap(a: Obb, b: Obb): boolean {
  const aAcross = right(a.headingRad);
  const aAlong = forward(a.headingRad);
  const bAcross = right(b.headingRad);
  const bAlong = forward(b.headingRad);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  for (const axis of [aAcross, aAlong, bAcross, bAlong]) {
    const distanceM = Math.abs(dx * axis.x + dz * axis.z);
    const reachM =
      projectedRadius(a, aAcross, aAlong, axis) + projectedRadius(b, bAcross, bAlong, axis);
    if (distanceM >= reachM - OVERLAP_EPSILON_M) {
      return false;
    }
  }
  return true;
}

/**
 * 可行駛範圍 → 四面邊界碰撞盒（西、東、北、南），貼在範圍外側。
 * 每一面都往兩端多伸一個厚度，四個角落不留縫。
 */
export function boundsWallsFt(bounds: BoundsFt): readonly ObbFt[] {
  const thicknessFt = BOUNDS_WALL_THICKNESS_FT;
  const centerXFt = (bounds.minXFt + bounds.maxXFt) / 2;
  const centerZFt = (bounds.minZFt + bounds.maxZFt) / 2;
  const spanXFt = bounds.maxXFt - bounds.minXFt + 2 * thicknessFt;
  const spanZFt = bounds.maxZFt - bounds.minZFt + 2 * thicknessFt;
  // heading 0：寬沿 X、長沿 Z。
  const wall = (xFt: number, zFt: number, widthFt: number, lengthFt: number): ObbFt => ({
    centerXFt: xFt,
    centerZFt: zFt,
    widthFt,
    lengthFt,
    headingDeg: 0,
  });
  return [
    wall(bounds.minXFt - thicknessFt / 2, centerZFt, thicknessFt, spanZFt),
    wall(bounds.maxXFt + thicknessFt / 2, centerZFt, thicknessFt, spanZFt),
    wall(centerXFt, bounds.minZFt - thicknessFt / 2, spanXFt, thicknessFt),
    wall(centerXFt, bounds.maxZFt + thicknessFt / 2, spanXFt, thicknessFt),
  ];
}

/** 沒有撞到任何東西時共用的空結果，免得每一步都配置新陣列。 */
const NO_HITS: readonly number[] = [];

/**
 * 車身與哪些障礙物重疊：回傳它們在 obstacles 裡的索引（由小到大）。沒有重疊回傳空陣列。
 * 先用外接圓粗篩，再做分離軸測試。
 */
export function vehicleHits(
  vehicle: Pick<VehicleState, 'x' | 'z' | 'headingRad'>,
  obstacles: readonly Obb[],
): readonly number[] {
  if (obstacles.length === 0) {
    return NO_HITS;
  }
  const body = vehicleObb(vehicle);
  let hits: number[] | undefined;
  obstacles.forEach((obstacle, index) => {
    if (boundingCirclesTouch(body, obstacle) && obbsOverlap(body, obstacle)) {
      hits ??= [];
      hits.push(index);
    }
  });
  return hits ?? NO_HITS;
}

/** 車身撞到的第一個障礙物的索引；沒有回傳 −1。 */
export function firstHit(
  vehicle: Pick<VehicleState, 'x' | 'z' | 'headingRad'>,
  obstacles: readonly Obb[],
): number {
  return vehicleHits(vehicle, obstacles)[0] ?? -1;
}
