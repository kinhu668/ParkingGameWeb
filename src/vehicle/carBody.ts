// 車殼：沿車長（Z）一站一站放樣的封閉曲面。每一站是一圈橫截面（車底 → 門檻 → 側面 → 肩線 → 側窗 → 車頂邊梁 → 車頂），
// 輪拱是車底在輪軸附近沿圓弧抬高，車頭、車尾是橫截面依超橢圓縮成一個近乎平的端面（指數大 = 方正）。
// 摺線（門檻上緣、腰線、肩線、窗台、引擎蓋摺線，以及前後擋上下緣、車頭車尾的接縫）是重複的頂點：
// 兩側各有自己的法線，光影在那裡斷開，車身才有稜角而不是一整顆圓潤的肥皂。
// 同一張曲面的四邊形依位置分給不同材質（烤漆、玻璃、黑飾條）；燈組、保險桿、車牌、門縫是另外的配件（carFittings.ts）。
// 車艙那一段另外反面再畫一次當內襯（頂篷、柱內飾、門板、地板），從駕駛座往外看才有車頂內側與 A 柱。
// 建模約定：車頭朝本地 −Z、右側 +X、輪胎著地點 y = 0、原點在車身中心的地面投影。
import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { CAR_DETAIL_CONFIG, CAR_VISUAL_CONFIG as VISUAL } from '../render/renderConfig';
import type { VehicleDetail } from '../render/quality';
import { VEHICLE_CONFIG_SI } from './vehicleConfig';

/**
 * 整台車身的材質分區。車殼曲面只用到烤漆、玻璃、黑飾條與兩個車艙內襯（頂篷、門板地板）；
 * 燈殼、鍍鉻、車牌來自配件（carFittings.ts）。
 */
export const BODY_PARTS = [
  'paint',
  'glass',
  'trim',
  'headlight',
  'taillight',
  'reverseLight',
  'chrome',
  'plate',
  'headliner',
  'cabinTrim',
] as const;

export type BodyPart = (typeof BODY_PARTS)[number];

const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;
const HALF_WHEELBASE_M = VEHICLE_CONFIG_SI.wheelbaseM / 2;

/** 車身各條特徵線的位置（公尺，本地座標）。內裝、後視鏡、測試都用這一份。 */
export const BODY_LAYOUT = {
  /** 鈑金半寬（車身中段）。 */
  halfWidthM: VEHICLE_CONFIG_SI.widthM / 2 - VISUAL.mirrorOverhangM,
  /** 車艙底部（肩線內側）的半寬。 */
  cabinHalfWidthM: VEHICLE_CONFIG_SI.widthM / 2 - VISUAL.mirrorOverhangM - VISUAL.shoulderInsetM,
  /** 前擋下緣處的腰線高度。 */
  cowlHeightM: VISUAL.groundClearanceM + VISUAL.lowerBodyHeightM,
  /** 前擋下緣、前擋上緣（車頂前緣）、後擋上緣、後擋下緣的 Z。 */
  windshieldBaseZM: -HALF_LENGTH_M + VISUAL.hoodLengthM,
  windshieldTopZM: -HALF_LENGTH_M + VISUAL.hoodLengthM + VISUAL.windshieldRakeM,
  rearWindowTopZM: HALF_LENGTH_M - VISUAL.trunkLengthM - VISUAL.rearWindowRakeM,
  rearWindowBaseZM: HALF_LENGTH_M - VISUAL.trunkLengthM,
  /** 輪拱半徑。 */
  archRadiusM: VISUAL.wheelRadiusM + VISUAL.archGapM,
  /** B 柱中線的 Z（前後門的交界）。 */
  bPillarZM: -HALF_LENGTH_M + VISUAL.hoodLengthM + VISUAL.windshieldRakeM + VISUAL.bPillarBehindHeaderM,
  /** 車頭、車尾端面開始收的 Z（車殼與保險桿外罩的接縫）。 */
  noseStartZM: -HALF_LENGTH_M + VISUAL.bodyEndInsetM + VISUAL.noseDepthM,
  tailStartZM: HALF_LENGTH_M - VISUAL.bodyEndInsetM - VISUAL.tailDepthM,
  /** 車殼端面最前、最後的 Z：比車長內縮一點，凸出來的是保險桿與車牌。 */
  noseTipZM: -HALF_LENGTH_M + VISUAL.bodyEndInsetM,
  tailTipZM: HALF_LENGTH_M - VISUAL.bodyEndInsetM,
} as const;

const L = BODY_LAYOUT;
const ROOF_LENGTH_M = L.rearWindowTopZM - L.windshieldTopZM;
/** 車頂最高點在車頂前緣後方這個比例處。 */
const ROOF_PEAK_FRACTION = 0.4;
const ROOF_PEAK_Z_M = L.windshieldTopZM + ROOF_PEAK_FRACTION * ROOF_LENGTH_M;
/** 前擋上緣、後擋上緣的車艙高度相對於最高點的比例。 */
const HEADER_HEIGHT_FRACTION = 0.975;
const REAR_HEADER_HEIGHT_FRACTION = 0.93;
const B_PILLAR_Z_M = L.bPillarZM;
/** 側窗只開到後擋上緣後方這裡，再往後是烤漆的 C 柱。 */
const C_PILLAR_Z_M = L.rearWindowTopZM + 0.22 * VISUAL.rearWindowRakeM;
/** 玻璃四周留給烤漆邊框（前擋下緣的集水槽、車頂前後緣）的寬度。 */
const GLASS_FRAME_M = 0.035;
const NOSE_START_Z_M = L.noseStartZM;
const TAIL_START_Z_M = L.tailStartZM;
/** 沿車長的摺線：這幾站各放兩次（位置相同、法線各算各的）。 */
const CREASE_STATIONS_Z_M = [
  NOSE_START_Z_M,
  L.windshieldBaseZM,
  L.windshieldTopZM,
  L.rearWindowTopZM,
  L.rearWindowBaseZM,
  TAIL_START_Z_M,
];

/** 半圈橫截面的點數（車底中線 → 車頂中線）；整圈把左半邊鏡射回來。摺線上的點各算兩次。 */
const HALF_RING_POINTS = 24;
const RING_POINTS = 2 * HALF_RING_POINTS - 2;

/** 半圈上的幾個點：窗台（腰線，也是引擎蓋的邊）、車頂／引擎蓋摺線的那一對。 */
const POINT = {
  rockerTop: 4,
  characterLine: 7,
  windowBase: 12,
  crownCrease: 20,
} as const;

/** 半圈上各條帶子（相鄰兩點之間）的編號。 */
const STRIP = {
  /** 車底與門檻（黑色）到這一條為止。 */
  rockerEnd: 3,
  sill: 13,
  sideGlassStart: 14,
  sideGlassEnd: 15,
  topStart: 18,
} as const;

/** 引擎蓋、行李廂蓋的摺線在中線到邊緣的這個比例處；摺線外側是斜面，內側幾乎是平的。 */
const CROWN_CREASE_T = 0.56;
const CROWN_SHOULDER_FRACTION = 0.74;

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

/** 腰線（肩線）高度：引擎蓋往車頭下降，車艙段緩升到行李廂，車尾再略降。 */
function beltHeightM(zM: number): number {
  if (zM <= L.windshieldBaseZM) {
    const t = (L.windshieldBaseZM - zM) / (L.windshieldBaseZM + HALF_LENGTH_M);
    return L.cowlHeightM - VISUAL.noseDropM * t ** 1.6;
  }
  if (zM <= L.rearWindowBaseZM) {
    const t = (zM - L.windshieldBaseZM) / (L.rearWindowBaseZM - L.windshieldBaseZM);
    return L.cowlHeightM + VISUAL.deckRiseM * smoothstep(t);
  }
  const t = (zM - L.rearWindowBaseZM) / (HALF_LENGTH_M - L.rearWindowBaseZM);
  return L.cowlHeightM + VISUAL.deckRiseM - VISUAL.tailDropM * t * t;
}

/**
 * 車頂最高點比前擋下緣的腰線高多少（不含車頂弧度）：最高點那一站的車頂中線剛好等於車高。
 * 車頂線是以前擋下緣的腰線為基準的絕對高度，腰線往車尾升高不會把車頂頂高。
 */
const GREENHOUSE_PEAK_M = VEHICLE_CONFIG_SI.heightM - VISUAL.crownM - L.cowlHeightM;
/** 後擋下緣的車頂線比例：剛好落在升高後的行李廂腰線上，玻璃與行李廂蓋接得起來。 */
const REAR_BASE_FRACTION = VISUAL.deckRiseM / GREENHOUSE_PEAK_M;

/** 車頂線高出前擋下緣腰線的比例（0 = 沒有車艙，1 = 車頂最高點）。 */
function greenhouseFraction(zM: number): number {
  if (zM <= L.windshieldBaseZM || zM >= L.rearWindowBaseZM) {
    return 0;
  }
  if (zM < L.windshieldTopZM) {
    const t = (zM - L.windshieldBaseZM) / VISUAL.windshieldRakeM;
    return HEADER_HEIGHT_FRACTION * (1 - (1 - t) ** 1.25);
  }
  if (zM <= L.rearWindowTopZM) {
    const t = (zM - L.windshieldTopZM) / ROOF_LENGTH_M;
    return t < ROOF_PEAK_FRACTION
      ? 1 - (1 - HEADER_HEIGHT_FRACTION) * ((ROOF_PEAK_FRACTION - t) / ROOF_PEAK_FRACTION) ** 2
      : 1 -
          (1 - REAR_HEADER_HEIGHT_FRACTION) *
            ((t - ROOF_PEAK_FRACTION) / (1 - ROOF_PEAK_FRACTION)) ** 2;
  }
  const t = (zM - L.rearWindowTopZM) / VISUAL.rearWindowRakeM;
  return REAR_BASE_FRACTION + (REAR_HEADER_HEIGHT_FRACTION - REAR_BASE_FRACTION) * (1 - t ** 1.35);
}

/** 車底高度：平常是離地高度，輪軸前後沿輪拱的圓弧抬高。 */
function floorHeightM(zM: number): number {
  let heightM = VISUAL.groundClearanceM;
  for (const axleZM of [-HALF_WHEELBASE_M, HALF_WHEELBASE_M]) {
    const offsetM = zM - axleZM;
    if (Math.abs(offsetM) < L.archRadiusM) {
      heightM = Math.max(
        heightM,
        VISUAL.wheelRadiusM + Math.sqrt(L.archRadiusM ** 2 - offsetM ** 2),
      );
    }
  }
  return heightM;
}

/**
 * 一站橫截面的右半圈（x ≥ 0），從車底中線到車頂中線，共 HALF_RING_POINTS 點，依序是 [x, y]。
 * 門檻上緣、腰線、肩線、窗台、車頂摺線各重複一次（摺線）。
 */
export function bodyHalfSection(zM: number): [number, number][] {
  const halfWidthM = L.halfWidthM * (1 - VISUAL.planTaper * Math.abs(zM / HALF_LENGTH_M) ** 3);
  const floorM = floorHeightM(zM);
  const beltM = beltHeightM(zM);
  const fraction = greenhouseFraction(zM);
  /** 車艙在這一站的腰線以上有多高。 */
  const cabinM = Math.max(GREENHOUSE_PEAK_M * fraction - (beltM - L.cowlHeightM), 0);
  const sideM = beltM - floorM;
  /** 門檻（下緣斜角）的高度；輪拱上方側面很矮時跟著縮小。 */
  const rockerM = Math.min(0.07, 0.3 * sideM);

  const baseXM = halfWidthM - VISUAL.shoulderInsetM;
  const topXM = baseXM - VISUAL.tumblehomeM * fraction;
  const railM = Math.min(VISUAL.roofRailM, cabinM / 2);
  /** 側窗那條斜線：從車艙底部到車頂邊梁下緣。 */
  const glassTopM = beltM + cabinM - railM;
  const onGlass = (t: number, bulgeM: number): [number, number] => [
    baseXM + (topXM - baseXM) * t + bulgeM,
    beltM + (glassTopM - beltM) * t,
  ];
  const sillT = cabinM > 0 ? Math.min(0.03, 0.25 * cabinM) / (cabinM - railM) : 0;
  const roofEdgeXM = topXM - railM;
  const topM = beltM + cabinM;
  /** 頂面的弧度（0–1）：車艙段是拋物線；引擎蓋與行李廂蓋是「斜面 + 摺線 + 近乎平的中段」。 */
  const crownAt = (t: number): number => {
    if (cabinM > 0) {
      return 1 - t * t;
    }
    return t > CROWN_CREASE_T
      ? (CROWN_SHOULDER_FRACTION * (1 - t)) / (1 - CROWN_CREASE_T)
      : CROWN_SHOULDER_FRACTION +
          (1 - CROWN_SHOULDER_FRACTION) * (1 - (t / CROWN_CREASE_T) ** 2);
  };
  const crown = (t: number): [number, number] => [
    roofEdgeXM * t,
    topM + VISUAL.crownM * crownAt(t),
  ];

  const rockerTop: [number, number] = [halfWidthM - 0.004, floorM + rockerM];
  const characterLine: [number, number] = [halfWidthM, floorM + 0.64 * sideM];
  const shoulderEdge: [number, number] = [
    halfWidthM - 0.026,
    beltM - Math.min(0.012, 0.05 * sideM),
  ];
  const windowBase: [number, number] = [baseXM, beltM];
  const crownCrease = crown(CROWN_CREASE_T);

  return [
    [0, floorM],
    [0.55 * halfWidthM, floorM],
    [halfWidthM - 0.06, floorM],
    [halfWidthM - 0.016, floorM + 0.4 * rockerM],
    rockerTop,
    rockerTop,
    [halfWidthM - 0.002, floorM + 0.38 * sideM],
    characterLine,
    characterLine,
    [halfWidthM - 0.014, floorM + 0.86 * sideM],
    shoulderEdge,
    shoulderEdge,
    windowBase,
    windowBase,
    onGlass(sillT, 0),
    onGlass(0.55, 0.012 * fraction),
    [topXM, glassTopM],
    [topXM - 0.293 * railM, topM - 0.293 * railM],
    crown(1),
    crown(0.8),
    crownCrease,
    crownCrease,
    crown(0.28),
    crown(0),
  ];
}

/** 這一站的鈑金側面輪廓（右側）：門檻上緣 → 腰線 → 肩線 → 窗台，依序是 [x, y]。門縫沿著它走。 */
export function bodySideProfile(zM: number): [number, number][] {
  return bodyHalfSection(zM).slice(POINT.rockerTop + 1, POINT.windowBase + 1);
}

/** 頂面（引擎蓋、擋風玻璃、車頂、行李廂蓋）在 (x, z) 的高度；x 超出頂面邊緣時取邊緣的高度。 */
export function bodyTopHeightM(zM: number, xM: number): number {
  // 從窗台往中線走：x 遞減。
  const top = bodyHalfSection(zM).slice(POINT.windowBase + 1);
  const x = Math.abs(xM);
  for (let index = 0; index + 1 < top.length; index += 1) {
    const [outerX, outerY] = top[index] ?? [0, 0];
    const [innerX, innerY] = top[index + 1] ?? [0, 0];
    if (x <= outerX && x >= innerX && outerX > innerX) {
      return outerY + ((innerY - outerY) * (outerX - x)) / (outerX - innerX);
    }
  }
  return top[0]?.[1] ?? 0;
}

/**
 * 車頭或車尾端面在 (x, y) 的 Z：端面是把收圓起點那一圈橫截面朝中心縮小，所以先算出這一點落在哪個縮放比例上。
 * 燈組、水箱罩這些配件靠它貼著端面放。
 * @param front true = 車頭、false = 車尾
 */
export function bodyEndFaceZM(front: boolean, xM: number, yM: number): number {
  const startZM = front ? NOSE_START_Z_M : TAIL_START_Z_M;
  const depthM = front ? VISUAL.noseDepthM : VISUAL.tailDepthM;
  const ring = bodyHalfSection(startZM);
  const centerYM = ((ring[0]?.[1] ?? 0) + (ring[POINT.windowBase]?.[1] ?? 0)) / 2;
  const x = Math.abs(xM);
  const y = yM - centerYM;
  // 從中心朝 (x, y) 射出去，與輪廓的哪一段相交、交在多遠：縮放比例 = 1 / 那個倍數。
  let scale = 0;
  for (let index = 0; index + 1 < ring.length; index += 1) {
    const [ax, ayAbsolute] = ring[index] ?? [0, 0];
    const [bx, byAbsolute] = ring[index + 1] ?? [0, 0];
    const ay = ayAbsolute - centerYM;
    const by = byAbsolute - centerYM;
    const denominator = x * (by - ay) - y * (bx - ax);
    if (Math.abs(denominator) < 1e-12) {
      continue;
    }
    const along = (ax * (by - ay) - ay * (bx - ax)) / denominator;
    const across = (ax * y - ay * x) / denominator;
    if (along > 0 && across >= 0 && across <= 1) {
      scale = Math.max(scale, 1 / along);
    }
  }
  const offsetM = endOffsetM(depthM, Math.min(scale, 1));
  return front ? L.noseTipZM + offsetM : L.tailTipZM - offsetM;
}

/** 一站：Z、橫截面取樣的 Z（車頭車尾收圓時固定在收圓起點）、縮放比例。 */
interface Station {
  readonly zM: number;
  readonly sectionZM: number;
  readonly scale: number;
}

/** 車頭或車尾收圓：橫截面縮到 scale 時這一站離端點多遠（超橢圓）。 */
function endOffsetM(depthM: number, scale: number): number {
  return depthM * (1 - (1 - scale ** VISUAL.endExponent) ** (1 / VISUAL.endExponent));
}

function createStations(detail: VehicleDetail): Station[] {
  const { stationStepM, archSegments, endScales } = CAR_DETAIL_CONFIG[detail];

  // 特徵線一定要有一站；成對靠很近的站讓轉折處（玻璃邊框、柱子邊緣）保持銳利。
  const features = [
    NOSE_START_Z_M,
    L.windshieldBaseZM,
    L.windshieldBaseZM + GLASS_FRAME_M,
    L.windshieldTopZM - GLASS_FRAME_M,
    L.windshieldTopZM,
    ROOF_PEAK_Z_M,
    B_PILLAR_Z_M - VISUAL.pillarHalfWidthM,
    B_PILLAR_Z_M + VISUAL.pillarHalfWidthM,
    L.rearWindowTopZM,
    L.rearWindowTopZM + GLASS_FRAME_M,
    C_PILLAR_Z_M,
    L.rearWindowBaseZM - GLASS_FRAME_M,
    L.rearWindowBaseZM,
    TAIL_START_Z_M,
  ];
  for (const axleZM of [-HALF_WHEELBASE_M, HALF_WHEELBASE_M]) {
    for (let step = 0; step <= archSegments; step += 1) {
      features.push(axleZM - L.archRadiusM * Math.cos((Math.PI * step) / archSegments));
    }
  }
  features.sort((a, b) => a - b);

  // 相鄰特徵線之間太寬就等分補站；幾乎重疊的只留一站。
  const spaced: number[] = [];
  for (const zM of features) {
    const previous = spaced.at(-1);
    if (previous === undefined) {
      spaced.push(zM);
      continue;
    }
    const gapM = zM - previous;
    if (gapM < 0.005) {
      continue;
    }
    const pieces = Math.ceil(gapM / stationStepM);
    for (let piece = 1; piece <= pieces; piece += 1) {
      spaced.push(previous + (gapM * piece) / pieces);
    }
  }
  // 摺線的站放兩次：兩站之間的四邊形面積是零，但兩邊的頂點法線各算各的。
  const middle = spaced.flatMap((zM) =>
    CREASE_STATIONS_Z_M.some((creaseZM) => Math.abs(creaseZM - zM) < 1e-6) ? [zM, zM] : [zM],
  );

  const nose = endScales.map((scale) => ({
    zM: L.noseTipZM + endOffsetM(VISUAL.noseDepthM, scale),
    sectionZM: NOSE_START_Z_M,
    scale,
  }));
  const tail = endScales.map((scale) => ({
    zM: L.tailTipZM - endOffsetM(VISUAL.tailDepthM, scale),
    sectionZM: TAIL_START_Z_M,
    scale,
  }));
  return [
    ...nose.reverse(),
    ...middle.map((zM) => ({ zM, sectionZM: zM, scale: 1 })),
    ...tail,
  ];
}

/** 外表面的一塊四邊形（from、to 兩站之間、半圈上第 strip 條帶子）用哪個材質。 */
function outerPart(from: Station, to: Station, strip: number): BodyPart {
  const zM = (from.zM + to.zM) / 2;
  const scale = (from.scale + to.scale) / 2;

  // 車頭、車尾的端面整片是烤漆（下緣被保險桿與下擾流蓋住）。
  if (scale < 1) {
    return 'paint';
  }
  // 車底與門檻是黑的；輪拱的邊緣因此有一圈黑色的唇。
  if (strip <= STRIP.rockerEnd) {
    return 'trim';
  }
  const inCabin = zM > L.windshieldBaseZM && zM < L.rearWindowBaseZM;
  if (!inCabin) {
    return 'paint';
  }
  if (strip === STRIP.sill) {
    return 'trim';
  }
  if (strip >= STRIP.sideGlassStart && strip <= STRIP.sideGlassEnd) {
    if (zM < L.windshieldBaseZM + GLASS_FRAME_M || zM > C_PILLAR_Z_M) {
      return 'paint';
    }
    return Math.abs(zM - B_PILLAR_Z_M) < VISUAL.pillarHalfWidthM ? 'trim' : 'glass';
  }
  if (strip >= STRIP.topStart) {
    const windshield =
      zM > L.windshieldBaseZM + GLASS_FRAME_M && zM < L.windshieldTopZM - GLASS_FRAME_M;
    const rearWindow =
      zM > L.rearWindowTopZM + GLASS_FRAME_M && zM < L.rearWindowBaseZM - GLASS_FRAME_M;
    return windshield || rearWindow ? 'glass' : 'paint';
  }
  return 'paint';
}

/**
 * 建立車殼曲面各材質分區的幾何。所有分區共用同一份頂點（外表面一份法線、內襯一份反向的法線），
 * 只有索引不同；沒有任何四邊形的分區不會出現在結果裡。
 */
export function createShellGeometries(detail: VehicleDetail): Map<BodyPart, BufferGeometry> {
  const stations = createStations(detail);
  const positions = new Float32Array(stations.length * RING_POINTS * 3);

  stations.forEach((station, stationIndex) => {
    const half = bodyHalfSection(station.sectionZM);
    const floorM = half[0]?.[1] ?? 0;
    const beltM = half[POINT.windowBase]?.[1] ?? 0;
    /** 收圓時橫截面朝這個高度（車底與腰線的中間）縮。 */
    const centerYM = (floorM + beltM) / 2;
    for (let ring = 0; ring < RING_POINTS; ring += 1) {
      // 前半圈是右側由下往上，後半圈是左側由上往下（鏡射）。
      const mirrored = ring >= HALF_RING_POINTS;
      const [xM, yM] = half[mirrored ? RING_POINTS - ring : ring] ?? [0, 0];
      const offset = (stationIndex * RING_POINTS + ring) * 3;
      positions[offset] = (mirrored ? -xM : xM) * station.scale;
      positions[offset + 1] = centerYM + (yM - centerYM) * station.scale;
      positions[offset + 2] = station.zM;
    }
  });

  const indices = new Map<BodyPart, number[]>();
  const push = (part: BodyPart, a: number, b: number, c: number): void => {
    const list = indices.get(part) ?? [];
    list.push(a, b, c);
    indices.set(part, list);
  };

  for (let stationIndex = 0; stationIndex + 1 < stations.length; stationIndex += 1) {
    const from = stations[stationIndex];
    const to = stations[stationIndex + 1];
    if (from === undefined || to === undefined) {
      continue;
    }
    const inCabin = from.zM >= L.windshieldBaseZM - 1e-6 && to.zM <= L.rearWindowBaseZM + 1e-6;
    for (let ring = 0; ring < RING_POINTS; ring += 1) {
      const nextRing = (ring + 1) % RING_POINTS;
      const strip = ring < HALF_RING_POINTS - 1 ? ring : RING_POINTS - 1 - ring;
      const a = stationIndex * RING_POINTS + ring;
      const b = stationIndex * RING_POINTS + nextRing;
      const c = a + RING_POINTS;
      const d = b + RING_POINTS;

      const part = outerPart(from, to, strip);
      push(part, a, b, c);
      push(part, b, d, c);

      // 內襯：車艙段把同一塊四邊形反面再畫一次；玻璃的位置留空。
      if (inCabin && part !== 'glass') {
        const lining = strip >= STRIP.sideGlassStart ? 'headliner' : 'cabinTrim';
        push(lining, a, c, b);
        push(lining, b, c, d);
      }
    }
  }

  // 法線用整張外表面算，分區交界才不會有接縫。
  const shell = new BufferGeometry();
  const positionAttribute = new BufferAttribute(positions, 3);
  shell.setAttribute('position', positionAttribute);
  shell.setIndex(
    BODY_PARTS.filter((part) => part !== 'headliner' && part !== 'cabinTrim').flatMap(
      (part) => indices.get(part) ?? [],
    ),
  );
  shell.computeVertexNormals();
  const outwardNormals = shell.getAttribute('normal');
  const sum = new Vector3();
  const other = new Vector3();
  // 重疊在同一點、只屬於零面積四邊形的頂點（沒有車艙的站，窗台到車頂邊梁那幾點）算不出法線：抄同一圈上一點的。
  for (let vertex = 1; vertex < outwardNormals.count; vertex += 1) {
    if (sum.fromBufferAttribute(outwardNormals, vertex).lengthSq() < 1e-12) {
      other.fromBufferAttribute(outwardNormals, vertex - 1);
      outwardNormals.setXYZ(vertex, other.x, other.y, other.z);
    }
  }
  // 車頂與擋風玻璃是連續的弧面：那一對摺線頂點的法線併回同一個（摺線只留給引擎蓋與行李廂蓋）。
  stations.forEach((station, stationIndex) => {
    if (station.scale < 1 || greenhouseFraction(station.sectionZM) <= 0) {
      return;
    }
    for (const first of [POINT.crownCrease, RING_POINTS - POINT.crownCrease - 1]) {
      const a = stationIndex * RING_POINTS + first;
      sum
        .fromBufferAttribute(outwardNormals, a)
        .add(other.fromBufferAttribute(outwardNormals, a + 1))
        .normalize();
      outwardNormals.setXYZ(a, sum.x, sum.y, sum.z);
      outwardNormals.setXYZ(a + 1, sum.x, sum.y, sum.z);
    }
  });
  const inwardNormals = new BufferAttribute(
    Float32Array.from(outwardNormals.array, (component) => -component),
    3,
  );

  const geometries = new Map<BodyPart, BufferGeometry>();
  for (const part of BODY_PARTS) {
    const partIndices = indices.get(part);
    if (partIndices === undefined) {
      continue;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', positionAttribute);
    geometry.setAttribute(
      'normal',
      part === 'headliner' || part === 'cabinTrim' ? inwardNormals : outwardNormals,
    );
    geometry.setIndex(partIndices);
    geometries.set(part, geometry);
  }
  return geometries;
}
