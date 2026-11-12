// 關卡障礙物的類型表：每種類型的預設碰撞盒（英尺）。不 import three、不碰 DOM。
// 碰撞盒一律是 2D 矩形：寬 = 垂直於 heading 的橫向、長 = 沿 heading 的縱向；圓形物件用正方形近似。

/** 碰撞盒的大小（英尺）。 */
export interface ObstacleSizeFt {
  /** 橫向（垂直於 heading）的寬度。 */
  readonly widthFt: number;
  /** 縱向（沿 heading）的長度。 */
  readonly lengthFt: number;
}

/**
 * 每種類型的預設碰撞盒；關卡可以用 `size` 覆蓋。
 * null = 沒有預設值，關卡必須自己給 `size`（牆的長短每一面都不同）。
 */
export const OBSTACLE_DEFAULT_SIZE_FT = {
  parked_car: { widthFt: 6, lengthFt: 15 },
  cone: { widthFt: 1.2, lengthFt: 1.2 },
  shopping_cart: { widthFt: 2, lengthFt: 3.2 },
  cart_corral: { widthFt: 6, lengthFt: 16 },
  trash_bin: { widthFt: 2.5, lengthFt: 2.5 },
  dumpster: { widthFt: 6, lengthFt: 3.5 },
  mailbox: { widthFt: 1.8, lengthFt: 1.8 },
  pallet: { widthFt: 3.4, lengthFt: 4 },
  pallet_stack: { widthFt: 3.4, lengthFt: 4 },
  bollard: { widthFt: 0.8, lengthFt: 0.8 },
  barrier: { widthFt: 6, lengthFt: 1.5 },
  planter: { widthFt: 4, lengthFt: 4 },
  wall: null,
} as const satisfies Readonly<Record<string, ObstacleSizeFt | null>>;

/** 關卡 JSON 的 `obstacles[].type` 可用的值。 */
export type ObstacleType = keyof typeof OBSTACLE_DEFAULT_SIZE_FT;

/** 全部的類型（依上表的順序）。 */
export const OBSTACLE_TYPES = Object.keys(OBSTACLE_DEFAULT_SIZE_FT) as readonly ObstacleType[];

export function isObstacleType(value: string): value is ObstacleType {
  return (OBSTACLE_TYPES as readonly string[]).includes(value);
}

/** 這個類型的預設碰撞盒；沒有預設值（wall）回傳 null。 */
export function defaultObstacleSizeFt(type: ObstacleType): ObstacleSizeFt | null {
  return OBSTACLE_DEFAULT_SIZE_FT[type];
}
