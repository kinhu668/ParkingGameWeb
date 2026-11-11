// 模擬參數集中在這裡。

/** 物理固定更新頻率（每秒步數），與畫面更新率脫鉤。 */
export const PHYSICS_HZ = 60;

/** 一步物理的秒數（1/60 s）。 */
export const FIXED_STEP_SECONDS = 1 / PHYSICS_HZ;

/** 單幀最多累加的秒數；避免分頁切回來後一次補跑太多步物理。 */
export const MAX_FRAME_SECONDS = 0.25;

/** 程序化生成的預設亂數種子（32 位元無號整數）。 */
export const DEFAULT_SEED = 20261110;

/** 停車判定規則（規格第 2 節）。 */
export const PARKING_RULES = {
  /** 車速（絕對值）要嚴格小於這個值；剛好等於不算。 */
  maxSpeedMph: 0.5,
  /** 判定條件要連續成立多久才算停妥。 */
  holdSeconds: 1,
  /** 車頭與車位 heading 夾角的預設容許值（含邊界）；每個車位可以另外指定。 */
  defaultAngleToleranceDeg: 8,
} as const;
