// 場景擺設的佈局：每一類擺設擺在哪裡、多大、朝哪裡。只做計算（固定種子的亂數），不建立任何網格、不需要 WebGL。
// 座標一律是車位本地座標（公尺）：原點在車位中心、+X 是車位右方、−Z 是車位前方。
// 每一類先依重要性排出全部候選位置，濾掉落在禁區裡的，再依畫質級別取前幾個：低級別的擺設是高級別的子集。
// 全部是純視覺：這裡的資料不進物理、不進碰撞、不進停車判定。
import { forward, headingDelta, right, type GroundVector } from '../core/heading';
import { createRng, type Rng } from '../core/rng';
import { degToRad, ftToM } from '../core/units';
import type { ParkingSpot } from '../level/parkingJudge';
import type { PropsQualitySettings } from '../render/quality';
import {
  FIXED_CAMERA_CONFIG,
  LOT_PROPS_CONFIG as LOT,
  SPOT_MARKING_CONFIG,
  SUN_CONFIG,
  WHEEL_STOP_CONFIG,
} from '../render/renderConfig';
import { VEHICLE_CONFIG_SI } from '../vehicle/vehicleConfig';
import { curbInnerBounds, wheelStopFootprint, type LocalRect } from './lotEdges';

/** 擺設的類別。 */
export const PROP_CATEGORIES = [
  'parkedCars',
  'lamps',
  'pillars',
  'beams',
  'buildings',
  'windows',
  'fencePosts',
  'fenceRails',
  'trees',
  'bushes',
  'stallLines',
  'wheelStops',
  'bins',
  'trafficCones',
  'signs',
  'drains',
] as const;

export type PropCategory = (typeof PROP_CATEGORIES)[number];

/** 平貼地面的類別：車壓過去也不算穿過東西（但仍然不放進通路禁區）。 */
export const FLAT_PROP_CATEGORIES: readonly PropCategory[] = ['stallLines', 'drains'];

/**
 * 一個擺設（車位本地座標，公尺）。佔地是以 (x, z) 為中心、轉了 headingRad 的矩形：
 * sizeX 是它自己左右方向的全寬，sizeZ 是前後方向的全長，sizeY 是高。
 */
export interface PropPlacement {
  readonly x: number;
  readonly z: number;
  /** 底面離地的高度。 */
  readonly y: number;
  /** 朝向（heading 約定，相對於車位的方向）：0 = 朝車位前方。 */
  readonly headingRad: number;
  readonly sizeX: number;
  readonly sizeY: number;
  readonly sizeZ: number;
  /** 0–1 的亂數，各類別自己解釋（車色、樹形、窗戶亮不亮…）。 */
  readonly variant: number;
}

/** 整個場地的擺設。 */
export type LotLayout = Readonly<Record<PropCategory, readonly PropPlacement[]>>;

/** 禁區（車位本地座標）：這些範圍裡不放任何擺設。 */
export interface KeepOutZones {
  /** 起點到車位的通路：從 from 沿 axis 方向的一條長方形。 */
  readonly corridor: {
    readonly fromX: number;
    readonly fromZ: number;
    /** 起點指向車位中心的單位向量。 */
    readonly axisX: number;
    readonly axisZ: number;
    /** 沿 axis 的範圍（起點是 0）。 */
    readonly minAlongM: number;
    readonly maxAlongM: number;
    readonly halfWidthM: number;
  };
  /** 目標車位矩形（含四周的餘裕）。 */
  readonly spotRect: LocalRect;
  /** `?cam=spot_low` 的鏡頭：位置、視線方向、視線左右多大的角度內、多遠以內要淨空。 */
  readonly camera: {
    readonly x: number;
    readonly z: number;
    readonly dirX: number;
    readonly dirZ: number;
    readonly radiusM: number;
    /** 視線左右各這個角度的餘弦。 */
    readonly minCos: number;
  };
}

/** 世界座標 → 車位本地座標。 */
export function worldToSpotLocal(spot: ParkingSpot, x: number, z: number): GroundVector {
  const lateral = right(spot.headingRad);
  const ahead = forward(spot.headingRad);
  const dx = x - spot.x;
  const dz = z - spot.z;
  return { x: dx * lateral.x + dz * lateral.z, z: -(dx * ahead.x + dz * ahead.z) };
}

/** 車位本地座標 → 世界座標。 */
export function spotLocalToWorld(spot: ParkingSpot, x: number, z: number): GroundVector {
  const lateral = right(spot.headingRad);
  const ahead = forward(spot.headingRad);
  return {
    x: spot.x + lateral.x * x - ahead.x * z,
    z: spot.z + lateral.z * x - ahead.z * z,
  };
}

/**
 * 這個車位與起點的禁區。
 * @param start 車的起點（世界座標）
 */
export function lotKeepOutZones(spot: ParkingSpot, start: GroundVector): KeepOutZones {
  const from = worldToSpotLocal(spot, start.x, start.z);
  const distanceM = Math.hypot(from.x, from.z);
  // 起點就在車位中心時沒有方向可言，當作從車位正後方進來。
  const axisX = distanceM > 0 ? -from.x / distanceM : 0;
  const axisZ = distanceM > 0 ? -from.z / distanceM : -1;
  const cameraX = FIXED_CAMERA_CONFIG.spotLowLateralM;
  const cameraZ = -FIXED_CAMERA_CONFIG.spotLowAheadM;
  const cameraDistanceM = Math.hypot(cameraX, cameraZ);
  return {
    corridor: {
      fromX: from.x,
      fromZ: from.z,
      axisX,
      axisZ,
      minAlongM: -LOT.corridorBehindStartM,
      maxAlongM: distanceM + spot.lengthM / 2 + LOT.corridorPastSpotM,
      halfWidthM: LOT.corridorHalfWidthM,
    },
    spotRect: {
      minX: -spot.widthM / 2 - LOT.spotMarginM,
      maxX: spot.widthM / 2 + LOT.spotMarginM,
      minZ: -spot.lengthM / 2 - LOT.spotMarginM,
      maxZ: spot.lengthM / 2 + LOT.spotMarginM,
    },
    camera: {
      x: cameraX,
      z: cameraZ,
      dirX: -cameraX / cameraDistanceM,
      dirZ: -cameraZ / cameraDistanceM,
      radiusM: LOT.cameraClearRadiusM,
      minCos: Math.cos(LOT.cameraClearHalfAngleRad),
    },
  };
}

/** 離鏡頭這麼近以內，不管在哪個方向都不放（貼著鏡頭的東西會被近平面切開）。 */
const CAMERA_NEAR_M = ftToM(1.5);

/** 本地座標的一個點在不在禁區裡。 */
export function pointInKeepOut(zones: KeepOutZones, x: number, z: number): boolean {
  const { corridor, spotRect, camera } = zones;
  const alongM = (x - corridor.fromX) * corridor.axisX + (z - corridor.fromZ) * corridor.axisZ;
  const acrossM = (x - corridor.fromX) * -corridor.axisZ + (z - corridor.fromZ) * corridor.axisX;
  if (
    alongM >= corridor.minAlongM &&
    alongM <= corridor.maxAlongM &&
    Math.abs(acrossM) <= corridor.halfWidthM
  ) {
    return true;
  }
  if (x >= spotRect.minX && x <= spotRect.maxX && z >= spotRect.minZ && z <= spotRect.maxZ) {
    return true;
  }
  const fromCameraX = x - camera.x;
  const fromCameraZ = z - camera.z;
  const fromCameraM = Math.hypot(fromCameraX, fromCameraZ);
  return (
    fromCameraM <= CAMERA_NEAR_M ||
    (fromCameraM <= camera.radiusM &&
      fromCameraX * camera.dirX + fromCameraZ * camera.dirZ >= camera.minCos * fromCameraM)
  );
}

/** 佔地取樣點的間距上限：比通路禁區窄得多，長條形的擺設不會「跨過」禁區而沒被發現。 */
const FOOTPRINT_SAMPLE_STEP_M = 1;

/** 擺設佔地矩形上的取樣點（中心、四邊、四角與內部的格點），本地座標。 */
export function placementFootprint(placement: PropPlacement): GroundVector[] {
  const lateral = right(placement.headingRad);
  const ahead = forward(placement.headingRad);
  const stepsX = Math.max(2, Math.ceil(placement.sizeX / FOOTPRINT_SAMPLE_STEP_M));
  const stepsZ = Math.max(2, Math.ceil(placement.sizeZ / FOOTPRINT_SAMPLE_STEP_M));
  const points: GroundVector[] = [];
  for (let ix = 0; ix <= stepsX; ix += 1) {
    const acrossM = (ix / stepsX - 0.5) * placement.sizeX;
    for (let iz = 0; iz <= stepsZ; iz += 1) {
      const alongM = (iz / stepsZ - 0.5) * placement.sizeZ;
      points.push({
        x: placement.x + lateral.x * acrossM + ahead.x * alongM,
        z: placement.z + lateral.z * acrossM + ahead.z * alongM,
      });
    }
  }
  return points;
}

/** 擺設的佔地有沒有碰到禁區。 */
export function placementInKeepOut(zones: KeepOutZones, placement: PropPlacement): boolean {
  return placementFootprint(placement).some((point) => pointInKeepOut(zones, point.x, point.z));
}

/** 佈局裡全部擺設的數目。 */
export function countProps(layout: LotLayout): number {
  return PROP_CATEGORIES.reduce((total, category) => total + layout[category].length, 0);
}

function place(
  x: number,
  z: number,
  size: { readonly x: number; readonly y: number; readonly z: number },
  headingRad = 0,
  variant = 0,
  y = 0,
): PropPlacement {
  return { x, z, y, headingRad, sizeX: size.x, sizeY: size.y, sizeZ: size.z, variant };
}

/** 每一類擺設用自己的亂數串（種子 + 類別序號），增減某一類的候選不會改到別類的結果。 */
function categoryRng(seed: number, category: PropCategory): Rng {
  return createRng(seed + 7919 * (PROP_CATEGORIES.indexOf(category) + 1));
}

/** [−1, 1) 的亂數。 */
function signed(rng: Rng): number {
  return rng() * 2 - 1;
}

/** 假車位的一列。 */
interface StallRow {
  /** 這一列車位中心的 z。 */
  readonly centerZ: number;
  /** 車頭該朝的方向（車頭那一端有車擋）。 */
  readonly headingRad: number;
  /** 最靠近中線的車位編號（車位中心 x = ±編號 × 車位寬）。 */
  readonly firstStall: number;
  /** 背景車優先停這一列的程度：越小越優先。 */
  readonly parkingWeight: number;
}

interface Stall {
  readonly x: number;
  readonly z: number;
  readonly headingRad: number;
  readonly row: StallRow;
  /** 離中線第幾格（1 = 緊鄰目標車位）。 */
  readonly index: number;
}

/** 場地外的東西（建築、樹）相對於場地某一邊的位置（英尺）。 */
interface OutsideSpec {
  /** 在場地的哪一邊：n = 車位前方、s = 後方、e = 右、w = 左。 */
  readonly side: 'n' | 'e' | 's' | 'w';
  /** 沿著那一邊、相對於場地中心的位置。 */
  readonly alongFt: number;
  /** 離路緣內側多遠（建築是到它最近的那一面，樹是到樹幹）。 */
  readonly outFt: number;
}

interface BuildingSpec extends OutsideSpec {
  /** 沿著那一邊的寬、往外的深、高。 */
  readonly widthFt: number;
  readonly depthFt: number;
  readonly heightFt: number;
}

/** 背景建築的候選，依重要性排序：車位前方（跟車鏡頭看得到的那一面）最先，後方最後。 */
const BUILDING_SPECS: readonly BuildingSpec[] = [
  { side: 'n', alongFt: 46, outFt: 45, widthFt: 62, depthFt: 40, heightFt: 48 },
  { side: 'n', alongFt: -2, outFt: 64, widthFt: 30, depthFt: 40, heightFt: 34 },
  { side: 'n', alongFt: 118, outFt: 52, widthFt: 70, depthFt: 50, heightFt: 68 },
  { side: 'e', alongFt: -50, outFt: 45, widthFt: 90, depthFt: 50, heightFt: 52 },
  { side: 'w', alongFt: -40, outFt: 45, widthFt: 80, depthFt: 50, heightFt: 44 },
  { side: 'n', alongFt: 185, outFt: 30, widthFt: 60, depthFt: 60, heightFt: 40 },
  { side: 'n', alongFt: 70, outFt: 190, widthFt: 80, depthFt: 50, heightFt: 115 },
  { side: 'n', alongFt: 165, outFt: 170, widthFt: 60, depthFt: 60, heightFt: 92 },
  { side: 'n', alongFt: -120, outFt: 150, widthFt: 100, depthFt: 50, heightFt: 13 },
  { side: 'n', alongFt: -25, outFt: 240, widthFt: 60, depthFt: 50, heightFt: 100 },
  { side: 'e', alongFt: 50, outFt: 50, widthFt: 60, depthFt: 60, heightFt: 38 },
  { side: 'w', alongFt: 60, outFt: 55, widthFt: 70, depthFt: 60, heightFt: 60 },
  { side: 'w', alongFt: -108, outFt: 80, widthFt: 70, depthFt: 60, heightFt: 55 },
  { side: 'e', alongFt: -130, outFt: 120, widthFt: 70, depthFt: 70, heightFt: 80 },
  { side: 's', alongFt: -70, outFt: 50, widthFt: 80, depthFt: 50, heightFt: 46 },
  { side: 's', alongFt: 30, outFt: 55, widthFt: 70, depthFt: 50, heightFt: 64 },
  { side: 's', alongFt: 125, outFt: 40, widthFt: 60, depthFt: 60, heightFt: 40 },
  { side: 's', alongFt: -160, outFt: 45, widthFt: 60, depthFt: 50, heightFt: 34 },
];

/** 樹的候選（樹幹的位置），依重要性排序：跟車鏡頭看得到的前方與兩側先種。 */
const TREE_SPECS: readonly OutsideSpec[] = [
  { side: 'n', alongFt: 60, outFt: 12 },
  { side: 'w', alongFt: -25, outFt: 12 },
  { side: 'e', alongFt: -45, outFt: 13 },
  { side: 'n', alongFt: -68, outFt: 13 },
  { side: 'e', alongFt: -75, outFt: 12 },
  { side: 'w', alongFt: -60, outFt: 13 },
  { side: 'n', alongFt: 95, outFt: 10 },
  { side: 'n', alongFt: -95, outFt: 10 },
  { side: 'e', alongFt: -18, outFt: 14 },
  { side: 'w', alongFt: 15, outFt: 12 },
  { side: 'n', alongFt: 28, outFt: 15 },
  { side: 'e', alongFt: 10, outFt: 12 },
  { side: 'n', alongFt: -38, outFt: 16 },
  { side: 'w', alongFt: 45, outFt: 13 },
  { side: 'e', alongFt: 38, outFt: 13 },
  { side: 'n', alongFt: 8, outFt: 30 },
  { side: 'e', alongFt: 66, outFt: 12 },
  { side: 'w', alongFt: 72, outFt: 12 },
  { side: 'e', alongFt: -60, outFt: 24 },
  { side: 'w', alongFt: -45, outFt: 24 },
  { side: 's', alongFt: -15, outFt: 12 },
  { side: 's', alongFt: 45, outFt: 12 },
  { side: 's', alongFt: -75, outFt: 12 },
  { side: 's', alongFt: 15, outFt: 13 },
  { side: 's', alongFt: 95, outFt: 10 },
  { side: 's', alongFt: -95, outFt: 10 },
  { side: 's', alongFt: -45, outFt: 14 },
  { side: 's', alongFt: 75, outFt: 14 },
];

/** 路燈的候選：在哪一條線上（前方路緣外、B 列的中線、後方路緣外）、在第幾條車位分隔線、燈臂朝前還是朝後。 */
interface LampSpec {
  readonly line: 'north' | 'island' | 'south';
  /** x = 這個值 × 車位寬（x.5 剛好在兩個車位之間）。 */
  readonly stalls: number;
  /** 燈臂的方向：0 = 朝車位前方，π = 朝後方。 */
  readonly headingRad: number;
}

/** 依重要性排序：先是通路兩旁與目標車位附近的；前幾個在 high／ultra 是真的光源。 */
const LAMP_SPECS: readonly LampSpec[] = [
  { line: 'north', stalls: 1.5, headingRad: Math.PI },
  { line: 'island', stalls: -2.5, headingRad: 0 },
  { line: 'island', stalls: 2.5, headingRad: 0 },
  { line: 'north', stalls: -3.5, headingRad: Math.PI },
  { line: 'island', stalls: -2.5, headingRad: Math.PI },
  { line: 'island', stalls: 2.5, headingRad: Math.PI },
  { line: 'north', stalls: 4.5, headingRad: Math.PI },
  { line: 'north', stalls: -6.5, headingRad: Math.PI },
  { line: 'island', stalls: 6.5, headingRad: 0 },
  { line: 'island', stalls: -6.5, headingRad: 0 },
  { line: 'north', stalls: 7.5, headingRad: Math.PI },
  { line: 'island', stalls: 6.5, headingRad: Math.PI },
  { line: 'island', stalls: -6.5, headingRad: Math.PI },
  { line: 'south', stalls: 1.5, headingRad: 0 },
  { line: 'south', stalls: -1.5, headingRad: 0 },
  { line: 'south', stalls: 4.5, headingRad: 0 },
  { line: 'south', stalls: -4.5, headingRad: 0 },
  { line: 'south', stalls: 7.5, headingRad: 0 },
  { line: 'south', stalls: -7.5, headingRad: 0 },
];

/** 建築頂端的仰角要比太陽低這麼多度以上，才算「擋不到太陽」。 */
const BUILDING_SUN_CLEARANCE_DEG = 3;
/** 判斷建築擋不擋太陽時的視點高度（大約是跟車鏡頭最低的位置）。 */
const EYE_HEIGHT_M = ftToM(5);
/** 窗框凸出牆面的厚度（一半在牆裡）。 */
const WINDOW_THICKNESS_M = ftToM(0.8);
/** 灌木離路緣內側的距離：在路緣與圍欄之間。 */
const BUSH_OUT_FT = 2.2;

/** 取候選的前幾個（數量不是整數就無條件進位，負數當 0）。 */
function take<T>(candidates: readonly T[], count: number): T[] {
  return candidates.slice(0, Math.max(0, Math.ceil(count)));
}

/**
 * 產生整個場地的擺設。
 * @param spot 目標車位（場地以它的方向為準）
 * @param start 車的起點（世界座標）；起點到車位的通路上不放東西
 * @param seed 亂數種子；同一個種子、同樣的設定永遠得到同一份佈局
 * @param props 這個畫質級別的擺設密度
 */
export function createLotLayout(
  spot: ParkingSpot,
  start: GroundVector,
  seed: number,
  props: PropsQualitySettings,
): LotLayout {
  const zones = lotKeepOutZones(spot, start);
  const inner = curbInnerBounds(spot);
  const stallWidthM = spot.widthM;
  const stallLengthM = spot.lengthM;
  const islandZ = LOT.islandBehindSpotM;
  const lotCenterX = (inner.minX + inner.maxX) / 2;
  const lotCenterZ = (inner.minZ + inner.maxZ) / 2;
  const allowed = (placement: PropPlacement): boolean => !placementInKeepOut(zones, placement);

  // ── 假車位 ─────────────────────────────────────────────
  // A 列與目標車位同一列（前方路緣邊）；B 列是場地中段背靠背的兩列；C 列貼著後方路緣。
  const aisleFirstStall = Math.ceil(LOT.aisleHalfWidthStalls + 0.5);
  const lastStall = Math.floor((inner.maxX - stallWidthM / 2) / stallWidthM);
  const rows: readonly StallRow[] = [
    { centerZ: 0, headingRad: 0, firstStall: 1, parkingWeight: 0 },
    { centerZ: islandZ - stallLengthM / 2, headingRad: Math.PI, firstStall: aisleFirstStall, parkingWeight: 1 },
    { centerZ: islandZ + stallLengthM / 2, headingRad: 0, firstStall: aisleFirstStall, parkingWeight: 1.6 },
    { centerZ: inner.maxZ - stallLengthM / 2, headingRad: Math.PI, firstStall: aisleFirstStall, parkingWeight: 3 },
  ];
  const stalls: Stall[] = [];
  for (const row of rows) {
    for (let index = row.firstStall; index <= lastStall; index += 1) {
      for (const side of [-1, 1]) {
        stalls.push({
          x: side * index * stallWidthM,
          z: row.centerZ,
          headingRad: row.headingRad,
          row,
          index,
        });
      }
    }
  }

  // ── 背景車 ─────────────────────────────────────────────
  // 緊鄰目標車位的那一格不停車（車身會太靠近通路）。每個假車位都抽一樣多次亂數，數量變了位置也不變。
  const carRng = categoryRng(seed, 'parkedCars');
  const carSize = {
    x: VEHICLE_CONFIG_SI.widthM,
    y: VEHICLE_CONFIG_SI.heightM,
    z: VEHICLE_CONFIG_SI.lengthM,
  };
  const carCandidates = stalls
    .filter((stall) => stall.index >= aisleFirstStall)
    .map((stall) => {
      const priority = stall.row.parkingWeight + 0.12 * stall.index + 2.6 * carRng();
      const lateralM = signed(carRng) * LOT.carJitterLateralM;
      const lengthwiseM = signed(carRng) * LOT.carJitterLengthwiseM;
      const reversed = carRng() < LOT.carReversedChance;
      const headingRad =
        stall.headingRad + (reversed ? Math.PI : 0) + signed(carRng) * LOT.carJitterHeadingRad;
      return {
        priority,
        placement: place(stall.x + lateralM, stall.z + lengthwiseM, carSize, headingRad, carRng()),
      };
    })
    .sort((a, b) => a.priority - b.priority)
    .map((candidate) => candidate.placement)
    .filter(allowed);

  // ── 假車位的標線與車擋 ─────────────────────────────────
  const lineWidthM = SPOT_MARKING_CONFIG.lineWidthM;
  const lineY = SPOT_MARKING_CONFIG.liftM;
  const stallLines: PropPlacement[] = [];
  const addLine = (x: number, z: number, sizeX: number, sizeZ: number): void => {
    stallLines.push(place(x, z, { x: sizeX, y: LOT.stallLineHeightM, z: sizeZ }, 0, 0, lineY));
  };
  for (let boundary = 1; boundary <= lastStall; boundary += 1) {
    for (const side of [-1, 1]) {
      const x = side * (boundary + 0.5) * stallWidthM;
      addLine(x, 0, lineWidthM, stallLengthM);
      if (boundary >= aisleFirstStall - 1) {
        addLine(x, islandZ, lineWidthM, 2 * stallLengthM);
        addLine(x, inner.maxZ - stallLengthM / 2, lineWidthM, stallLengthM);
      }
    }
  }
  // B 列兩排車位之間的那條線。
  const islandNearM = (aisleFirstStall - 0.5) * stallWidthM;
  const islandFarM = (lastStall + 0.5) * stallWidthM;
  for (const side of [-1, 1]) {
    addLine((side * (islandNearM + islandFarM)) / 2, islandZ, islandFarM - islandNearM, lineWidthM);
  }

  const stopSize = {
    x: WHEEL_STOP_CONFIG.lengthM,
    y: WHEEL_STOP_CONFIG.heightM,
    z: WHEEL_STOP_CONFIG.baseDepthM,
  };
  const targetStop = wheelStopFootprint(spot);
  const targetStopZ = (targetStop.minZ + targetStop.maxZ) / 2;
  /** B、C 列的車擋在車位裡面，離車頭那一端這麼遠。 */
  const stopInsetM = ftToM(1.4);
  const wheelStops = stalls.map((stall) => {
    const noseZ = forward(stall.headingRad).z;
    const z =
      stall.row.centerZ === 0 ? targetStopZ : stall.z + noseZ * (stallLengthM / 2 - stopInsetM);
    return place(stall.x, z, stopSize, stall.headingRad);
  });

  // ── 路燈 ───────────────────────────────────────────────
  const lampSize = { x: 2 * LOT.lampPoleRadiusM, y: LOT.lampHeightM, z: 2 * LOT.lampPoleRadiusM };
  const lampLineZ = {
    north: inner.minZ - LOT.lampOutsideCurbM,
    island: islandZ,
    south: inner.maxZ + LOT.lampOutsideCurbM,
  } as const;
  const lamps = LAMP_SPECS.filter((spec) => Math.abs(spec.stalls) <= lastStall + 0.5).map((spec) =>
    place(spec.stalls * stallWidthM, lampLineZ[spec.line], lampSize, spec.headingRad),
  );

  // ── 混凝土柱與橫梁 ─────────────────────────────────────
  // 柱子立在 B 列的中線上、每隔兩個車位一根，從通道邊往外排；柱頂一根橫梁把同一側的柱子連起來。
  const pillarCandidates: PropPlacement[] = [];
  for (let boundary = aisleFirstStall - 0.5; boundary <= lastStall + 0.5; boundary += 2) {
    for (const side of [-1, 1]) {
      pillarCandidates.push(place(side * boundary * stallWidthM, islandZ, LOT.pillarSizeM));
    }
  }
  const pillars = take(pillarCandidates.filter(allowed), props.pillars);
  const beams: PropPlacement[] = [];
  for (const side of [-1, 1]) {
    const xs = pillars.filter((pillar) => pillar.x * side > 0).map((pillar) => pillar.x);
    if (xs.length >= 2) {
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const beam = place(
        (minX + maxX) / 2,
        islandZ,
        { x: maxX - minX + LOT.pillarSizeM.x, y: LOT.beamThicknessM, z: LOT.beamThicknessM },
        0,
        0,
        LOT.pillarSizeM.y,
      );
      if (allowed(beam)) {
        beams.push(beam);
      }
    }
  }

  // ── 場地外：建築、窗、樹 ───────────────────────────────
  /** 場地某一邊外面的點：沿邊的位置、離路緣內側的距離（公尺）。 */
  const outside = (spec: OutsideSpec, outM: number): GroundVector => {
    const alongM = ftToM(spec.alongFt);
    switch (spec.side) {
      case 'n':
        return { x: lotCenterX + alongM, z: inner.minZ - outM };
      case 's':
        return { x: lotCenterX + alongM, z: inner.maxZ + outM };
      case 'e':
        return { x: inner.maxX + outM, z: lotCenterZ + alongM };
      case 'w':
        return { x: inner.minX - outM, z: lotCenterZ + alongM };
    }
  };

  // 太陽很低；建築不投影，所以擋在太陽與場地之間的建築會穿幫（太陽被擋住，場地卻還亮著）。
  // 從車位或起點看過去，方位在太陽左右 buildingSunGapDeg 以內、又高到碰得到太陽的建築不蓋。
  const sunBearingRad = degToRad(SUN_CONFIG.azimuthDeg) - spot.headingRad;
  const sunGapRad = degToRad(LOT.buildingSunGapDeg);
  const sunClearElevationRad = degToRad(SUN_CONFIG.elevationDeg - BUILDING_SUN_CLEARANCE_DEG);
  const viewpoints: readonly GroundVector[] = [
    { x: 0, z: 0 },
    { x: zones.corridor.fromX, z: zones.corridor.fromZ },
  ];
  const hidesSun = (building: PropPlacement): boolean =>
    viewpoints.some((eye) =>
      placementFootprint(building).some((point) => {
        const dx = point.x - eye.x;
        const dz = point.z - eye.z;
        const bearingRad = Math.atan2(dx, -dz);
        const topElevationRad = Math.atan2(building.sizeY - EYE_HEIGHT_M, Math.hypot(dx, dz));
        return (
          Math.abs(headingDelta(sunBearingRad, bearingRad)) < sunGapRad &&
          topElevationRad > sunClearElevationRad
        );
      }),
    );

  const buildingRng = categoryRng(seed, 'buildings');
  const buildings = take(
    BUILDING_SPECS.map((spec) => {
      const acrossSide = spec.side === 'n' || spec.side === 's';
      const center = outside(spec, ftToM(spec.outFt + spec.depthFt / 2));
      return place(
        center.x,
        center.z,
        {
          x: ftToM(acrossSide ? spec.widthFt : spec.depthFt),
          y: ftToM(spec.heightFt),
          z: ftToM(acrossSide ? spec.depthFt : spec.widthFt),
        },
        0,
        buildingRng(),
      );
    }).filter((building) => allowed(building) && !hidesSun(building)),
    props.buildings,
  );

  // 窗：只開在朝向場地的那幾面。每棟建築用自己的亂數串，建築數量變了窗也不變。
  const windows: PropPlacement[] = [];
  const windowSize = {
    x: LOT.buildingWindowSizeM.x,
    y: LOT.buildingWindowSizeM.y,
    z: WINDOW_THICKNESS_M,
  };
  buildings.forEach((building) => {
    const windowRng = createRng(seed + Math.round(building.variant * 0xffffff));
    const floors = Math.floor(
      (building.sizeY - 0.4 * LOT.buildingFloorHeightM) / LOT.buildingFloorHeightM,
    );
    const faces = [
      { axis: 'z', sign: 1, visible: lotCenterZ > building.z + building.sizeZ / 2 },
      { axis: 'z', sign: -1, visible: lotCenterZ < building.z - building.sizeZ / 2 },
      { axis: 'x', sign: 1, visible: lotCenterX > building.x + building.sizeX / 2 },
      { axis: 'x', sign: -1, visible: lotCenterX < building.x - building.sizeX / 2 },
    ] as const;
    for (const face of faces) {
      if (!face.visible) {
        continue;
      }
      const faceWidthM = face.axis === 'z' ? building.sizeX : building.sizeZ;
      const columns = Math.floor(
        (faceWidthM - 0.5 * LOT.buildingWindowSpacingM) / LOT.buildingWindowSpacingM,
      );
      for (let floor = 0; floor < floors; floor += 1) {
        for (let column = 0; column < columns; column += 1) {
          const alongM = (column - (columns - 1) / 2) * LOT.buildingWindowSpacingM;
          const lit = windowRng() < LOT.buildingWindowLitChance;
          const brightness = lit ? 0.55 + 0.45 * windowRng() : 0;
          const y = (floor + 0.35) * LOT.buildingFloorHeightM;
          windows.push(
            face.axis === 'z'
              ? place(
                  building.x + alongM,
                  building.z + (face.sign * building.sizeZ) / 2,
                  windowSize,
                  0,
                  brightness,
                  y,
                )
              : place(
                  building.x + (face.sign * building.sizeX) / 2,
                  building.z + alongM,
                  windowSize,
                  Math.PI / 2,
                  brightness,
                  y,
                ),
          );
        }
      }
    }
  });

  const treeRng = categoryRng(seed, 'trees');
  const trees = take(
    TREE_SPECS.map((spec) => {
      const trunk = outside(spec, ftToM(spec.outFt));
      const crownM = ftToM(12 + 6 * treeRng());
      const heightM = ftToM(16 + 8 * treeRng());
      return place(
        trunk.x + signed(treeRng) * ftToM(3),
        trunk.z + signed(treeRng) * ftToM(3),
        { x: crownM, y: heightM, z: crownM },
        treeRng() * 2 * Math.PI,
        treeRng(),
      );
    }).filter(allowed),
    props.trees,
  );

  // ── 灌木：路緣與圍欄之間的一圈，前方（車位那一側）先種 ──
  const bushRng = categoryRng(seed, 'bushes');
  const bushSpecs: OutsideSpec[] = [];
  for (let index = 0; index < 7; index += 1) {
    for (const side of [1, -1]) {
      bushSpecs.push({ side: 'n', alongFt: side * (12 + 11 * index), outFt: BUSH_OUT_FT });
    }
  }
  for (let index = 0; index < 8; index += 1) {
    bushSpecs.push({ side: 'e', alongFt: -68 + 20 * index, outFt: BUSH_OUT_FT });
    bushSpecs.push({ side: 'w', alongFt: -68 + 20 * index, outFt: BUSH_OUT_FT });
  }
  for (let index = 0; index < 6; index += 1) {
    for (const side of [1, -1]) {
      bushSpecs.push({ side: 's', alongFt: side * (10 + 14 * index), outFt: BUSH_OUT_FT });
    }
  }
  const bushes = take(
    bushSpecs
      .map((spec) => {
        const base = outside(spec, ftToM(spec.outFt));
        const alongM = signed(bushRng) * ftToM(1.5);
        const widthM = ftToM(3 + 2 * bushRng());
        const acrossSide = spec.side === 'n' || spec.side === 's';
        return place(
          base.x + (acrossSide ? alongM : 0),
          base.z + (acrossSide ? 0 : alongM),
          { x: widthM, y: widthM * (0.6 + 0.25 * bushRng()), z: widthM },
          bushRng() * 2 * Math.PI,
          bushRng(),
        );
      })
      .filter(allowed),
    props.bushes,
  );

  // ── 圍欄：路緣外的一圈立柱，相鄰兩根之間上下兩條橫桿 ──
  const fenceMinX = inner.minX - LOT.fenceOutsideCurbM;
  const fenceMaxX = inner.maxX + LOT.fenceOutsideCurbM;
  const fenceMinZ = inner.minZ - LOT.fenceOutsideCurbM;
  const fenceMaxZ = inner.maxZ + LOT.fenceOutsideCurbM;
  const fenceCorners: readonly GroundVector[] = [
    { x: fenceMinX, z: fenceMinZ },
    { x: fenceMaxX, z: fenceMinZ },
    { x: fenceMaxX, z: fenceMaxZ },
    { x: fenceMinX, z: fenceMaxZ },
  ];
  const fencePosts: PropPlacement[] = [];
  const fenceRails: PropPlacement[] = [];
  fenceCorners.forEach((from, cornerIndex) => {
    const to = fenceCorners[(cornerIndex + 1) % fenceCorners.length] ?? from;
    const sideLengthM = Math.hypot(to.x - from.x, to.z - from.z);
    const segments = Math.max(1, Math.round(sideLengthM / props.fencePostSpacingM));
    const segmentM = sideLengthM / segments;
    // 沿 X 的邊，橫桿不必轉；沿 Z 的邊轉 90°。
    const railHeadingRad = Math.abs(to.x - from.x) > Math.abs(to.z - from.z) ? 0 : Math.PI / 2;
    for (let segment = 0; segment < segments; segment += 1) {
      const startT = segment / segments;
      const midT = (segment + 0.5) / segments;
      const post = place(
        from.x + (to.x - from.x) * startT,
        from.z + (to.z - from.z) * startT,
        LOT.fencePostSizeM,
      );
      if (allowed(post)) {
        fencePosts.push(post);
      }
      for (const railY of LOT.fenceRailHeightsM) {
        const rail = place(
          from.x + (to.x - from.x) * midT,
          from.z + (to.z - from.z) * midT,
          { x: segmentM, y: LOT.fenceRailThicknessM, z: LOT.fenceRailThicknessM },
          railHeadingRad,
          0,
          railY,
        );
        if (allowed(rail)) {
          fenceRails.push(rail);
        }
      }
    }
  });

  // ── 小細節：垃圾桶、交通錐、標誌、排水孔蓋 ─────────────
  // 都靠在柱邊、B 列的中線上、或最外側車位與路緣之間的那一條空地，不放在通道中央。
  const stripX = inner.maxX - ftToM(3.5);
  const pillarNearX = (aisleFirstStall - 0.5) * stallWidthM;
  const pillarFarX = pillarNearX + 4 * stallWidthM;
  const mirrored = (x: number, z: number): GroundVector[] => [
    { x, z },
    { x: -x, z },
  ];

  const binSize = { x: ftToM(2), y: ftToM(3.3), z: ftToM(2) };
  const bins = [
    ...mirrored(pillarNearX + ftToM(2.4), islandZ),
    ...mirrored(stripX, ftToM(20)),
    ...mirrored(pillarFarX + ftToM(2.4), islandZ),
    ...mirrored(stripX, islandZ + stallLengthM + ftToM(9)),
  ].map((point) => place(point.x, point.z, binSize));

  const coneRng = categoryRng(seed, 'trafficCones');
  const coneSize = { x: ftToM(1.2), y: ftToM(2.3), z: ftToM(1.2) };
  const trafficCones = [
    ...mirrored(pillarNearX - ftToM(1.4), islandZ - ftToM(1.7)),
    ...mirrored(pillarNearX - ftToM(1.2), islandZ + ftToM(1.8)),
    ...mirrored(stripX, ftToM(40)),
    ...mirrored(stripX + ftToM(1.4), ftToM(43.5)),
    ...mirrored(stripX - ftToM(1), -ftToM(9)),
    ...mirrored(stripX + ftToM(1.2), -ftToM(11)),
    ...mirrored(stripX - ftToM(0.6), ftToM(118)),
    ...mirrored(stripX + ftToM(1.3), ftToM(121)),
  ].map((point) =>
    place(
      point.x + signed(coneRng) * ftToM(0.3),
      point.z + signed(coneRng) * ftToM(0.3),
      coneSize,
      coneRng() * 2 * Math.PI,
    ),
  );

  const signSize = { x: ftToM(1.7), y: ftToM(7.4), z: ftToM(0.3) };
  const signOutM = ftToM(1.8);
  const signs = [
    // 目標車位正前方、路緣外的那一支。
    { x: 0, z: inner.minZ - signOutM },
    ...mirrored(4.5 * stallWidthM, islandZ),
    { x: 3 * stallWidthM, z: inner.minZ - signOutM },
    { x: -5 * stallWidthM, z: inner.minZ - signOutM },
    { x: 7 * stallWidthM, z: inner.minZ - signOutM },
    ...mirrored(3 * stallWidthM, inner.maxZ + signOutM),
  ].map((point) => place(point.x, point.z, signSize, point.z > lotCenterZ ? 0 : Math.PI));

  const drainSize = { x: ftToM(2.4), y: ftToM(0.04), z: ftToM(2.4) };
  const northAisleZ = (stallLengthM / 2 + islandZ - stallLengthM) / 2;
  const southAisleZ = (islandZ + stallLengthM + inner.maxZ - stallLengthM) / 2;
  const drains = [
    ...mirrored(3.3 * stallWidthM, northAisleZ),
    ...mirrored(2.7 * stallWidthM, southAisleZ),
    ...mirrored(7.3 * stallWidthM, northAisleZ),
    ...mirrored(6.7 * stallWidthM, southAisleZ),
  ].map((point) => place(point.x, point.z, drainSize));

  const details = <T extends PropPlacement>(candidates: readonly T[]): T[] => {
    const kept = candidates.filter(allowed);
    return take(kept, kept.length * props.detailFraction);
  };

  return {
    parkedCars: take(carCandidates, props.parkedCars),
    lamps: take(lamps.filter(allowed), props.lampHeads),
    pillars,
    beams,
    buildings,
    windows,
    fencePosts,
    fenceRails,
    trees,
    bushes,
    stallLines: stallLines.filter(allowed),
    wheelStops: details(wheelStops),
    bins: details(bins),
    trafficCones: details(trafficCones),
    signs: details(signs),
    drains: details(drains),
  };
}
