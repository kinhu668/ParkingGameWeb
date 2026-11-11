// 第 1 階段唯一的場景：一個車位 + 車的起始姿態。對外用英尺與度，內部換成公尺與弧度。
// 第 2 階段由關卡 JSON 取代。
import { degToRad, ftToM } from '../core/units';
import { parkingSpotFromFt, type ParkingSpotFt } from './parkingJudge';
import type { SessionLayout } from './session';

/**
 * 場景配置（英尺、度）。
 * 車在原點、車頭朝北（−Z）；車位在車的正前方 60 ft、與車同向，直線開進去就能停。
 */
export const PROTOTYPE_LAYOUT_FT = {
  spot: {
    centerXFt: 0,
    centerZFt: -60,
    widthFt: 9,
    lengthFt: 18,
    headingDeg: 0,
  },
  start: {
    xFt: 0,
    zFt: 0,
    headingDeg: 0,
  },
} as const satisfies {
  readonly spot: ParkingSpotFt;
  readonly start: { readonly xFt: number; readonly zFt: number; readonly headingDeg: number };
};

/** 判定、物理與算圖用的配置（公尺、弧度）。車一開始靜止、方向盤回正。 */
export const PROTOTYPE_LAYOUT: SessionLayout = {
  spot: parkingSpotFromFt(PROTOTYPE_LAYOUT_FT.spot),
  startState: {
    x: ftToM(PROTOTYPE_LAYOUT_FT.start.xFt),
    z: ftToM(PROTOTYPE_LAYOUT_FT.start.zFt),
    headingRad: degToRad(PROTOTYPE_LAYOUT_FT.start.headingDeg),
    speedMps: 0,
    steerRad: 0,
  },
};
