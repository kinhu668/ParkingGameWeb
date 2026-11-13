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

/** 碰撞規則（計畫 5.2、7.2）。 */
export const COLLISION_RULES = {
  /** 同一個物件撞到之後多久內不重複計次。 */
  cooldownSeconds: 0.5,
  /** 反彈係數：撞到後車速 = −撞上去的車速 × 這個值。 */
  restitution: 0.3,
  /** 反彈車速（絕對值）的上限。 */
  maxBounceSpeedMph: 3,
} as const;

/** 評分規則（計畫 7.2）。 */
export const SCORING_RULES = {
  /** 3 星：停妥當下的角度誤差要嚴格小於這個值。 */
  threeStarMaxAngleDeg: 3,
} as const;

/**
 * 「車位在後方」的 HUD 提示（core/spotHint.ts）：車位中心相對車頭的方位超過 showBeyondDeg 才出現，
 * 回到 hideWithinDeg 以內才收起；車離車位中心不到 minDistanceM（已經在車位上或正要進去）不顯示。
 */
export const SPOT_HINT_RULES = {
  showBeyondDeg: 120,
  hideWithinDeg: 100,
  minDistanceM: 3.6576,
} as const;
