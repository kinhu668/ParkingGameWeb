// 模擬參數集中在這裡。

/** 物理固定更新頻率（每秒步數），與畫面更新率脫鉤。 */
export const PHYSICS_HZ = 60;

/** 單幀最多累加的秒數；避免分頁切回來後一次補跑太多步物理。 */
export const MAX_FRAME_SECONDS = 0.25;

/** 程序化生成的預設亂數種子（32 位元無號整數）。 */
export const DEFAULT_SEED = 20261110;
