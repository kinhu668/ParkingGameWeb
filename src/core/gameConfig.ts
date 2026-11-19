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

/**
 * 撞車警報與救護車燈條（docs/web-b1-plan.md §2.1、§2.2）。純表現層：不加碰撞次數，不影響星數與挑戰。
 * 閃光安全：每顆燈每秒明暗不超過 3 次（WCAG 2.3.1），所以三個週期都不能小於 1/3 秒。
 */
export const ALARM_RULES = {
  /** 車的警報從最後一次被計次算起響多久（秒）。 */
  durationS: 6,
  /** 警報燈一明一暗的週期（秒；亮暗各半，約 1.4 Hz）。喇叭跟著同一個相位。 */
  flashPeriodS: 0.7,
  /** 同時發聲的警報上限；超過時最舊的那一個讓位，它的燈照常閃完。 */
  maxVoices: 3,
  /** 停妥或失敗時聲音淡出的秒數。 */
  endFadeS: 0.8,
  /** 重來時聲音淡出的秒數；讓位給新警報的那一個也用這個長度。 */
  restartFadeS: 0.03,
  /** 警報響完自己停下來時淡出的秒數。 */
  expireFadeS: 0.06,
  /** 救護車被撞後短鳴、燈條快閃多久（秒）。 */
  sirenYelpS: 2.5,
  /** 燈條平常左右交替的週期（秒）。 */
  lightbarIdlePeriodS: 1,
  /** 燈條警戒時的週期（秒；每顆燈每秒 2.5 次）。 */
  lightbarAlertPeriodS: 0.4,
  /** 警戒時燈條的亮度倍數（待機是 1）。 */
  lightbarAlertLevel: 1.4,
  /** 系統要求減少動態效果時，待機的燈條恆亮並緩慢明暗：頻率（Hz）與最暗時少掉的比例。 */
  steadyPulseHz: 0.5,
  steadyPulseDepth: 0.25,
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

/**
 * 車位方向指標（core/targetPointer.ts）。
 * - 車位中心離車超過 showBeyondM（45 ft）就顯示，回到 hideWithinM（36 ft）以內才可能收起；
 * - 比這更近時，只有車位中心不在畫面裡才顯示（直式的俯視左右只看得到 15 ft）：
 *   畫面座標（−1 到 1）超出 offScreenBeyond 算在畫面外，回到 onScreenWithin 以內才算回到畫面裡；
 * - 離車位中心不到 minDistanceM（12 ft，已經在車位上或正要進去）不顯示；
 * - 距離取到 distanceStepFt 的倍數，數字不會每一幀都在跳。
 */
export const TARGET_POINTER_RULES = {
  showBeyondM: 13.716,
  hideWithinM: 10.9728,
  minDistanceM: 3.6576,
  offScreenBeyond: 0.95,
  onScreenWithin: 0.85,
  distanceStepFt: 5,
} as const;
