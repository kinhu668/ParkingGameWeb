// 車款表：每一款車的外框尺寸（英尺）。不 import three、不碰 DOM——關卡的碰撞盒與程序化模型都讀這一份，
// 所以「看到的車有多大」與「會撞到的範圍」是同一組數字。
// 外框 = 整台車最外緣（含車外後視鏡、保險桿、尾翼、輪胎）；模型必須剛好填滿長與寬。
// 每一款的長寬都不超過轎車（15 × 6 ft）：關卡 JSON 的 parked_car 換成別款只會變小，原本開得過的路線仍然開得過。
import { ftToM } from '../core/units';
import { VEHICLE_CONFIG_US } from './vehicleConfig';

/** 全部的車款；sedan 是玩家開的那一台，其餘四款只當停放的車。 */
export const CAR_MODEL_IDS = ['sedan', 'rally', 'widebody', 'fastback', 'roadster'] as const;

export type CarModelId = (typeof CAR_MODEL_IDS)[number];

/** 一款車的外框與軸距（英尺）。 */
export interface CarModelDimsFt {
  readonly lengthFt: number;
  readonly widthFt: number;
  readonly heightFt: number;
  readonly wheelbaseFt: number;
}

export const CAR_MODEL_DIMS_FT: Readonly<Record<CarModelId, CarModelDimsFt>> = {
  sedan: {
    lengthFt: VEHICLE_CONFIG_US.lengthFt,
    widthFt: VEHICLE_CONFIG_US.widthFt,
    heightFt: VEHICLE_CONFIG_US.heightFt,
    wheelbaseFt: VEHICLE_CONFIG_US.wheelbaseFt,
  },
  /** 小型拉力房車：短車身、高尾翼（車高含尾翼）。 */
  rally: { lengthFt: 14.5, widthFt: 5.9, heightFt: 4.8, wheelbaseFt: 8.4 },
  /** 寬體性能房車：輪拱外擴到幾乎與後視鏡同寬，車身低。 */
  widebody: { lengthFt: 15, widthFt: 6, heightFt: 4.55, wheelbaseFt: 9 },
  /** 1960 年代的斜背肌肉車：長車頭、矮車頂。 */
  fastback: { lengthFt: 15, widthFt: 5.9, heightFt: 4.25, wheelbaseFt: 9 },
  /** 兩座敞篷小跑車：最短、最矮。 */
  roadster: { lengthFt: 13, widthFt: 5.7, heightFt: 4.05, wheelbaseFt: 7.6 },
};

/** 一款車的外框與軸距（公尺）。 */
export interface CarModelDimsM {
  readonly lengthM: number;
  readonly widthM: number;
  readonly heightM: number;
  readonly wheelbaseM: number;
}

export function carModelDimsM(model: CarModelId): CarModelDimsM {
  const dims = CAR_MODEL_DIMS_FT[model];
  return {
    lengthM: ftToM(dims.lengthFt),
    widthM: ftToM(dims.widthFt),
    heightM: ftToM(dims.heightFt),
    wheelbaseM: ftToM(dims.wheelbaseFt),
  };
}

export function isCarModelId(value: string): value is CarModelId {
  return (CAR_MODEL_IDS as readonly string[]).includes(value);
}
