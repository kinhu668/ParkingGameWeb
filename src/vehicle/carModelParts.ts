// 停放車輛用的車款幾何：每一款車給出「靜態車身（依材質分區）＋一顆輪子＋車牌上的字」，
// 由 props/parkedCars.ts 整批實例化。玩家車（carMesh.ts）不走這裡。
// 建模約定與玩家車相同：車頭朝本地 −Z、右側 +X、輪胎著地點 y = 0、原點在車身中心的地面投影。
// 外框（含後視鏡、保險桿、尾翼、輪胎）剛好是 carModels.ts 的長寬高——關卡的碰撞盒就是那組數字。
import type { BufferGeometry } from 'three';
import type { VehicleDetail } from '../render/quality';
import { CAR_VISUAL_CONFIG as VISUAL } from '../render/renderConfig';
import { BODY_LAYOUT } from './carBody';
import { createBodyGeometries, createPlateTextGeometry } from './carFittings';
import type { CarModelId } from './carModels';
import {
  createHubcapGeometry,
  createRimGeometry,
  createTireGeometry,
  PARKED_WHEEL_SEGMENTS,
} from './carWheel';
import { createRallyParts } from './carRally';
import type { Point3 } from './facetBuilder';
import { VEHICLE_CONFIG_SI } from './vehicleConfig';

/**
 * 停放車輛的材質分區。paint、accent 的顏色每台車各自決定（accent：條紋之類的第二個車色，沒有就不給）；
 * glass 不透明（看不進車艙）；upholstery 是敞篷車看得到的座椅與內裝。
 */
export const CAR_MODEL_PARTS = [
  'paint',
  'accent',
  'glass',
  'trim',
  'chrome',
  'headlight',
  'taillight',
  'reverseLight',
  'indicator',
  'plate',
  'upholstery',
] as const;

export type CarModelPart = (typeof CAR_MODEL_PARTS)[number];

/** 一顆輪子：幾何的外側面朝 +X、輪軸在原點；左側的輪子轉半圈。 */
export interface CarModelWheel {
  readonly radiusM: number;
  readonly widthM: number;
  readonly rimRadiusM: number;
  /** 輪圈的顏色（sRGB）。 */
  readonly rimColor: number;
  readonly tire: BufferGeometry;
  readonly rim: BufferGeometry;
  /** 右前輪、右後輪的輪心（車的本地座標）；左側鏡射。 */
  readonly centers: readonly [Point3, Point3];
}

export interface CarModelParts {
  /** 靜態車身（含保險桿、燈組、空的牌面、後視鏡、尾翼…），不含輪子與車牌上的字。沒有用到的分區不出現。 */
  readonly body: ReadonlyMap<CarModelPart, BufferGeometry>;
  readonly wheel: CarModelWheel;
  /** 前後兩塊車牌上的字（車的本地座標，只有位置與法線、有索引）。 */
  readonly plateText: (text: string) => BufferGeometry;
}

/** 轎車：玩家車的車殼（低細分）併入後視鏡、拿掉車牌上的字與車艙內襯。 */
function createSedanParts(detail: VehicleDetail): CarModelParts {
  const body = new Map<CarModelPart, BufferGeometry>();
  for (const [part, geometry] of createBodyGeometries('low', { plateText: false, mirrors: true })) {
    if (part !== 'headliner' && part !== 'cabinTrim') {
      body.set(part, geometry);
    }
  }
  const segments = PARKED_WHEEL_SEGMENTS[detail];
  const wheelXM = BODY_LAYOUT.halfWidthM - VISUAL.wheelTuckM - VISUAL.wheelWidthM / 2;
  const halfWheelbaseM = VEHICLE_CONFIG_SI.wheelbaseM / 2;
  return {
    body,
    wheel: {
      radiusM: VISUAL.wheelRadiusM,
      widthM: VISUAL.wheelWidthM,
      rimRadiusM: VISUAL.rimRadiusM,
      rimColor: VISUAL.rimColor,
      tire: createTireGeometry(segments, false),
      rim: detail === 'high' ? createRimGeometry(segments) : createHubcapGeometry(segments),
      centers: [
        [wheelXM, VISUAL.wheelRadiusM, -halfWheelbaseM],
        [wheelXM, VISUAL.wheelRadiusM, halfWheelbaseM],
      ],
    },
    plateText: createPlateTextGeometry,
  };
}

const BUILDERS: Readonly<Record<CarModelId, (detail: VehicleDetail) => CarModelParts>> = {
  sedan: createSedanParts,
  // 四款新車建模完成前先用轎車頂著（關卡還不會擺出這四款）。
  rally: createRallyParts,
  widebody: createSedanParts,
  fastback: createSedanParts,
  roadster: createSedanParts,
};

/**
 * 建立一款車的停放用幾何。每次呼叫都是新的幾何。
 * @param detail low：輪圈只是一片輪蓋、輪胎 12 段；high：有輪輻的輪圈、輪胎 20 段。車身的面數兩者相同。
 */
export function createCarModelParts(model: CarModelId, detail: VehicleDetail): CarModelParts {
  return BUILDERS[model](detail);
}
