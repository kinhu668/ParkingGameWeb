// 倒車輔助的引導線（地面上的折線，車身座標）：倒後鏡頭的綠／黃／紅距離帶與藍色中心虛線（固定在車上），
// 以及鳥瞰用的綠色倒車軌跡（跟著方向盤彎）。純幾何，不 import three、不碰 DOM；投影到畫面由算圖端做。
import { ftToM } from '../core/units';
import { VEHICLE_CONFIG_SI } from './vehicleConfig';

/** 車身座標的地面點：以車身中心為原點，向右、向車頭為正（公尺）。 */
export interface GroundPoint {
  readonly lateralM: number;
  readonly aheadM: number;
}

export type GuideColor = 'green' | 'yellow' | 'red' | 'blue';

/** 一條引導線。 */
export interface GuideLine {
  readonly color: GuideColor;
  readonly dashed: boolean;
  readonly points: readonly GroundPoint[];
}

const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;
const HALF_WIDTH_M = VEHICLE_CONFIG_SI.widthM / 2;
const HALF_WHEELBASE_M = VEHICLE_CONFIG_SI.wheelbaseM / 2;

/** 距離帶：離後保險桿多遠到多遠（公尺），由近到遠是紅、黃、綠。 */
export const REVERSE_GUIDE_BANDS: readonly {
  readonly color: GuideColor;
  readonly fromM: number;
  readonly toM: number;
}[] = [
  { color: 'red', fromM: ftToM(1), toM: ftToM(3.5) },
  { color: 'yellow', fromM: ftToM(3.5), toM: ftToM(7.5) },
  { color: 'green', fromM: ftToM(7.5), toM: ftToM(14) },
];

export const REVERSE_GUIDE_CONFIG = {
  /** 距離帶的兩條邊線比車身每側多寬多少。 */
  sideMarginM: ftToM(0.5),
  /** 每一帶遠端往內畫的短橫線長度。 */
  tickM: ftToM(1.6),
  /** 藍色中心虛線：離後保險桿多遠到多遠。 */
  centerFromM: ftToM(1),
  centerToM: ftToM(17),
  /** 鳥瞰的倒車軌跡：後軸走這麼遠（公尺），每隔多遠取一點。 */
  pathLengthM: ftToM(10),
  pathStepM: ftToM(1),
  /** 軌跡上每隔多遠畫一條連接左右的橫線。 */
  pathRungM: ftToM(5),
  /** 方向盤小於這個角度（弧度）當作直線倒車。 */
  straightSteerRad: 1e-4,
} as const;

/** 後保險桿後方 distanceM、橫向 lateralM 的地面點。 */
function behindRear(lateralM: number, distanceM: number): GroundPoint {
  return { lateralM, aheadM: -(HALF_LENGTH_M + distanceM) };
}

/**
 * 倒後鏡頭的固定引導線：左右兩條邊線分成紅、黃、綠三帶，每帶遠端各有一條往內的短橫線，
 * 中間一條藍色虛線。
 */
export function rearCameraGuides(): readonly GuideLine[] {
  const config = REVERSE_GUIDE_CONFIG;
  const sideM = HALF_WIDTH_M + config.sideMarginM;
  const lines: GuideLine[] = [];
  for (const band of REVERSE_GUIDE_BANDS) {
    for (const side of [-1, 1]) {
      lines.push({
        color: band.color,
        dashed: false,
        // 近端 → 遠端 → 往內的短橫線，一筆畫成「ㄱ」形。
        points: [
          behindRear(side * sideM, band.fromM),
          behindRear(side * sideM, band.toM),
          behindRear(side * (sideM - config.tickM), band.toM),
        ],
      });
    }
  }
  lines.push({
    color: 'blue',
    dashed: true,
    points: [behindRear(0, config.centerFromM), behindRear(0, config.centerToM)],
  });
  return lines;
}

/**
 * 以目前的方向盤角度倒車、後軸走了 distanceM 之後，車身上的 start 點會在哪裡（仍用現在的車身座標）。
 * 與 bicycleModel 同一套運動學：後軸中點沿車身方向走，迴轉中心在後軸的延長線上、離後軸中點 軸距 ÷ tan(轉向角)。
 */
export function reversePathPoint(
  start: GroundPoint,
  steerRad: number,
  distanceM: number,
): GroundPoint {
  if (Math.abs(steerRad) < REVERSE_GUIDE_CONFIG.straightSteerRad) {
    return { lateralM: start.lateralM, aheadM: start.aheadM - distanceM };
  }
  // 迴轉中心（向右打在右邊）；倒車時車身繞它轉 distanceM ÷ 半徑，車尾甩向方向盤打的那一側。
  const radiusM = VEHICLE_CONFIG_SI.wheelbaseM / Math.tan(steerRad);
  const angleRad = distanceM / radiusM;
  const offsetLateralM = start.lateralM - radiusM;
  const offsetAheadM = start.aheadM + HALF_WHEELBASE_M;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    lateralM: radiusM + offsetLateralM * cos - offsetAheadM * sin,
    aheadM: -HALF_WHEELBASE_M + offsetLateralM * sin + offsetAheadM * cos,
  };
}

/**
 * 鳥瞰的綠色倒車軌跡：左右後車角接下來會掃過的兩條線，加上幾條連接左右的橫線（像梯子）。
 */
export function reversePathGuides(steerRad: number): readonly GuideLine[] {
  const config = REVERSE_GUIDE_CONFIG;
  const corners = [-1, 1].map((side) => ({ lateralM: side * HALF_WIDTH_M, aheadM: -HALF_LENGTH_M }));
  const steps = Math.round(config.pathLengthM / config.pathStepM);
  const lines: GuideLine[] = corners.map((corner) => ({
    color: 'green',
    dashed: false,
    points: Array.from({ length: steps + 1 }, (_, index) =>
      reversePathPoint(corner, steerRad, index * config.pathStepM),
    ),
  }));
  const rungs = Math.round(config.pathLengthM / config.pathRungM);
  for (let rung = 1; rung <= rungs; rung += 1) {
    const distanceM = rung * config.pathRungM;
    lines.push({
      color: 'green',
      dashed: false,
      points: corners.map((corner) => reversePathPoint(corner, steerRad, distanceM)),
    });
  }
  return lines;
}
