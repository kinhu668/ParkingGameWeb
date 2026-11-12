// 原型關：一個車位 + 車的起始姿態。資料在 src/levels/prototype.json，這裡只是把它換成既有的匯出名稱。
// `?cam`、`?bench` 沒給 `level` 時用它，`?show=parking_spot` 與許多測試也用它的車位尺寸。
import prototypeJson from '../levels/prototype.json';
import { parseLevel, type LevelDefinition, type LevelStartFt } from './levelSchema';
import type { ParkingSpotFt } from './parkingJudge';
import type { SessionLayout } from './session';

/** 原型關（world 0，不出現在選關、不存檔）。 */
export const PROTOTYPE_LEVEL: LevelDefinition = parseLevel(prototypeJson, 'prototype.json');

/**
 * 場景配置（英尺、度）。
 * 車在原點、車頭朝北（−Z）；車位在車的正前方 60 ft、與車同向，直線開進去就能停。
 */
export const PROTOTYPE_LAYOUT_FT: { readonly spot: ParkingSpotFt; readonly start: LevelStartFt } = {
  spot: PROTOTYPE_LEVEL.spotFt,
  start: PROTOTYPE_LEVEL.startFt,
};

/** 判定、物理與算圖用的配置（公尺、弧度）。車一開始靜止、方向盤回正。 */
export const PROTOTYPE_LAYOUT: SessionLayout = PROTOTYPE_LEVEL.layout;
