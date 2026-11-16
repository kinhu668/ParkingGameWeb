// 停放用新車款（拉力房車、寬體房車、斜背肌肉車、敞篷跑車）共用的車殼放樣：做法與轎車的 carBody.ts 相同
// （沿車長一站一站的橫截面、摺線用重複的頂點、輪拱是車底沿圓弧抬高、車頭車尾依超橢圓收成端面），
// 但每一條特徵線（半寬、葉子板外擴、腰線、車頂線）都是車款自己給的控制點，所以同一套程式放得出四種輪廓。
// 轎車的車殼不走這裡（它的外框被測試鎖住，維持原樣）。
// 建模約定：車頭朝本地 −Z、右側 +X、輪胎著地點 y = 0、原點在車身中心的地面投影。
import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import type { CarModelPart } from './carModelParts';

/** 一條特徵線的控制點：[沿車長的 z, 值]，z 遞增。同一個 z 連寫兩次是折角。 */
export type Knots = readonly (readonly [number, number])[];

/**
 * 通過控制點的平滑曲線（單調三次 Hermite：不會衝過控制點，連續兩點同值就是一段平的）。
 * 範圍外取端點的值。
 */
export function spline(knots: Knots): (at: number) => number {
  const slope = (index: number): number | undefined => {
    const [fromAt, fromValue] = knots[index] ?? [0, 0];
    const [toAt, toValue] = knots[index + 1] ?? [fromAt, fromValue];
    return index >= 0 && index + 1 < knots.length && toAt > fromAt
      ? (toValue - fromValue) / (toAt - fromAt)
      : undefined;
  };
  // 每個控制點的切線：兩側斜率的調和平均（異號就是 0）；端點與折角只有一側，就用那一側的斜率。
  const tangents = knots.map((_, index) => {
    const before = slope(index - 1);
    const after = slope(index);
    if (before === undefined || after === undefined) {
      return before ?? after ?? 0;
    }
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  });
  return (at: number): number => {
    const [firstAt, firstValue] = knots[0] ?? [0, 0];
    const [lastAt, lastValue] = knots[knots.length - 1] ?? [0, 0];
    if (at <= firstAt) {
      return firstValue;
    }
    if (at >= lastAt) {
      return lastValue;
    }
    const index = knots.findIndex(
      ([fromAt], segment) => at >= fromAt && at <= (knots[segment + 1]?.[0] ?? fromAt) && slope(segment) !== undefined,
    );
    const [fromAt, fromValue] = knots[index] ?? [0, 0];
    const [toAt, toValue] = knots[index + 1] ?? [0, 0];
    const span = toAt - fromAt;
    const t = (at - fromAt) / span;
    return (
      (2 * t ** 3 - 3 * t ** 2 + 1) * fromValue +
      (t ** 3 - 2 * t ** 2 + t) * span * (tangents[index] ?? 0) +
      (-2 * t ** 3 + 3 * t ** 2) * toValue +
      (t ** 3 - t ** 2) * span * (tangents[index + 1] ?? 0)
    );
  };
}

/** 車頭或車尾的端面。 */
export interface ShellEnd {
  /** 端面最外的那一點比車長的一半內縮多少（凸出來補滿車長的是保險桿、擾流或車牌）。 */
  readonly insetM: number;
  /** 收圓的深度與超橢圓指數（越大越方）。 */
  readonly depthM: number;
  readonly exponent: number;
  /** 端面的上緣、下緣各往車身中心退多少（斜的車頭、往內收的下巴）。 */
  readonly leanTopM: number;
  readonly leanBottomM: number;
  /** 收圓時橫截面的上半、下半往中心壓多少（1 = 縮成一點，圓鼓鼓的端面；小 = 上下緣的圓角小，端面高而平）。 */
  readonly squashTop: number;
  readonly squashBottom: number;
}

/** 車艙（有車頂的車才有）。 */
export interface ShellCabin {
  /** 車頂邊線的高度（不含車頂弧度）：第一點是前擋下緣、最後一點是後擋下緣，兩點都落在腰線上。 */
  readonly roof: Knots;
  /** 前擋上緣、後擋上緣的 z。 */
  readonly headerZM: number;
  readonly rearHeaderZM: number;
  /** 側窗開到這裡為止，再往後是烤漆的 C 柱。 */
  readonly sideGlassEndZM: number;
  /** 側窗之間的柱子（黑色）的中線 z，與柱寬的一半。 */
  readonly pillarsZM: readonly number[];
  readonly pillarHalfWidthM: number;
  /** 車艙底部比鈑金側面每側內縮（肩線），頂部再內縮（側窗內傾）；車頂邊梁的圓角半徑。 */
  readonly tumblehomeM: number;
  readonly roofRailM: number;
}

export interface ShellSpec {
  readonly lengthM: number;
  readonly wheelbaseM: number;
  readonly wheelRadiusM: number;
  /** 輪拱比輪胎大多少、車底離地多高。 */
  readonly archGapM: number;
  readonly clearanceM: number;
  /** 鈑金的半寬、葉子板在半寬之外再鼓出多少。 */
  readonly halfWidth: Knots;
  readonly flare: Knots;
  /** 兩個輪拱之間，車門下半部往內收多少。 */
  readonly tuckM: number;
  /** 腰線（引擎蓋邊、窗台、行李廂蓋邊）的高度。 */
  readonly belt: Knots;
  /** 引擎蓋、車頂、行李廂蓋的中線比邊緣高多少。 */
  readonly crownM: number;
  /** 頂面的邊緣比鈑金側面每側內縮多少、肩部的圓角有多大。 */
  readonly shoulderInsetM: number;
  readonly shoulderRoundM: number;
  readonly cabin?: ShellCabin;
  /** 敞篷車的座艙開口：頂面在這兩個 z 之間、靠中線的那幾條不畫（座艙另外做）。 */
  readonly cockpitZM?: readonly [number, number];
  readonly nose: ShellEnd;
  readonly tail: ShellEnd;
}

/** 放樣好的車殼：各材質分區的幾何，以及讓配件貼著曲面放的取樣函式。 */
export interface CarShell {
  readonly geometries: Map<CarModelPart, BufferGeometry>;
  /** 車頭、車尾端面開始收圓的 z，以及輪拱半徑。 */
  readonly noseStartZM: number;
  readonly tailStartZM: number;
  readonly archRadiusM: number;
  /** 這一站的鈑金側面輪廓（右側）：門檻上緣 → 腰線 → 肩線 → 頂面邊緣，依序是 [x, y]。 */
  sideProfile(zM: number): [number, number][];
  /** 鈑金側面在高度 yM 的 x。 */
  sideXM(zM: number, yM: number): number;
  /** 頂面（引擎蓋、玻璃、車頂、行李廂蓋）在 (x, z) 的高度；x 超出頂面邊緣時取邊緣的高度。 */
  topYM(zM: number, xM: number): number;
  /** 頂面邊緣（引擎蓋邊、車頂邊梁內緣）的 x。 */
  topEdgeXM(zM: number): number;
  /** 車頭或車尾端面在 (x, y) 的 z。 */
  endZM(front: boolean, xM: number, yM: number): number;
}

/** 半圈橫截面的點數（車底中線 → 車頂中線）；整圈把左半邊鏡射回來。摺線上的點各算兩次。 */
const HALF_RING_POINTS = 24;
const RING_POINTS = 2 * HALF_RING_POINTS - 2;
const POINT = { rockerTop: 4, windowBase: 12, crownCrease: 20 } as const;
/** 半圈上各條帶子（相鄰兩點之間）的編號。 */
const STRIP = {
  rockerEnd: 3,
  sill: 13,
  sideGlassStart: 14,
  sideGlassEnd: 15,
  topStart: 18,
  cockpitStart: 19,
} as const;
/** 頂面邊緣到座艙開口邊緣（頂面第二個點）佔半寬的比例。 */
export const COCKPIT_EDGE_T = 0.8;
/** 引擎蓋、行李廂蓋的摺線在中線到邊緣的這個比例處；摺線外側是斜面，內側幾乎是平的。 */
const CROWN_CREASE_T = 0.56;
const CROWN_SHOULDER_FRACTION = 0.74;
/** 玻璃四周留給烤漆邊框的寬度。 */
const GLASS_FRAME_M = 0.035;
/** 相鄰兩站最遠隔這麼遠、每個輪拱分幾段、車頭車尾收圓時各圈的縮放比例（最後一定是 0）。 */
const STATION_STEP_M = 0.3;
const ARCH_SEGMENTS = 8;
const ARCH_LEG_M = 0.006;
const END_SCALES = [0.985, 0.95, 0.88, 0.74, 0.45, 0];
/** 車門下半部從輪拱邊緣開始，隔多長才收到底。 */
const TUCK_BLEND_M = 0.33;

function smoothstep(value: number): number {
  const t = Math.min(Math.max(value, 0), 1);
  return t * t * (3 - 2 * t);
}

interface Station {
  readonly zM: number;
  readonly sectionZM: number;
  readonly scale: number;
}

export function createCarShell(spec: ShellSpec): CarShell {
  const halfLengthM = spec.lengthM / 2;
  const halfWheelbaseM = spec.wheelbaseM / 2;
  const archRadiusM = spec.wheelRadiusM + spec.archGapM;
  const noseTipZM = -halfLengthM + spec.nose.insetM;
  const tailTipZM = halfLengthM - spec.tail.insetM;
  const noseStartZM = noseTipZM + spec.nose.depthM;
  const tailStartZM = tailTipZM - spec.tail.depthM;
  const halfWidthAt = spline(spec.halfWidth);
  const flareAt = spline(spec.flare);
  const beltAt = spline(spec.belt);
  const { cabin } = spec;
  const roofAt = cabin === undefined ? undefined : spline(cabin.roof);
  const cowlZM = cabin?.roof[0]?.[0] ?? 0;
  const rearBaseZM = cabin?.roof[cabin.roof.length - 1]?.[0] ?? 0;
  /** 這一站的車艙比腰線高多少。 */
  const cabinHeightM = (zM: number): number =>
    roofAt === undefined || zM <= cowlZM || zM >= rearBaseZM
      ? 0
      : Math.max(roofAt(zM) - beltAt(zM), 0);
  const cabinPeakM = Math.max(...(cabin?.roof ?? []).map(([zM]) => cabinHeightM(zM)), 1e-6);

  /** 車底高度：平常是離地高度，輪軸前後沿輪拱的圓弧抬高。 */
  const floorAt = (zM: number): number => {
    let heightM = spec.clearanceM;
    for (const axleZM of [-halfWheelbaseM, halfWheelbaseM]) {
      const offsetM = zM - axleZM;
      if (Math.abs(offsetM) < archRadiusM) {
        heightM = Math.max(heightM, spec.wheelRadiusM + Math.sqrt(archRadiusM ** 2 - offsetM ** 2));
      }
    }
    return heightM;
  };

  /** 一站橫截面的右半圈（x ≥ 0），從車底中線到車頂中線，共 HALF_RING_POINTS 點。 */
  const halfSection = (zM: number): [number, number][] => {
    const doorXM = halfWidthAt(zM);
    const flareM = flareAt(zM);
    const outerXM = doorXM + flareM;
    const floorM = floorAt(zM);
    const beltM = beltAt(zM);
    const cabinM = cabinHeightM(zM);
    const fraction = cabinM / cabinPeakM;
    const sideM = beltM - floorM;
    // 門檻（下緣的黑色斜角）：輪拱裡只留一道細邊。
    const rockerM = floorM > spec.clearanceM ? 0.012 : Math.min(0.07, 0.3 * sideM);
    const roundM = Math.min(spec.shoulderRoundM, 0.3 * sideM);
    const tuckM =
      spec.tuckM *
      smoothstep((zM + halfWheelbaseM - archRadiusM) / TUCK_BLEND_M) *
      smoothstep((halfWheelbaseM - archRadiusM - zM) / TUCK_BLEND_M);

    const baseXM = doorXM - spec.shoulderInsetM;
    const topXM = baseXM - (cabin?.tumblehomeM ?? 0) * fraction;
    const railM = Math.min(cabin?.roofRailM ?? 0, cabinM / 2);
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
        : CROWN_SHOULDER_FRACTION + (1 - CROWN_SHOULDER_FRACTION) * (1 - (t / CROWN_CREASE_T) ** 2);
    };
    const crown = (t: number): [number, number] => [roofEdgeXM * t, topM + spec.crownM * crownAt(t)];

    const rockerTop: [number, number] = [outerXM - 0.004 - tuckM, floorM + rockerM];
    const characterLine: [number, number] = [outerXM, floorM + 0.62 * sideM];
    const shoulderEdge: [number, number] = [
      doorXM + 0.45 * flareM - 0.45 * roundM,
      beltM - 0.3 * roundM,
    ];
    const windowBase: [number, number] = [baseXM, beltM];
    const crownCrease = crown(CROWN_CREASE_T);
    return [
      [0, floorM],
      [0.55 * doorXM, floorM],
      [outerXM - 0.06 - tuckM, floorM],
      [outerXM - 0.016 - tuckM, floorM + 0.4 * rockerM],
      rockerTop,
      rockerTop,
      [outerXM - 0.002 - 0.42 * tuckM, floorM + 0.36 * sideM],
      characterLine,
      characterLine,
      [doorXM + 0.8 * flareM - 0.1 * roundM, beltM - roundM],
      shoulderEdge,
      shoulderEdge,
      windowBase,
      windowBase,
      onGlass(sillT, 0),
      onGlass(0.55, 0.012 * fraction),
      [topXM, glassTopM],
      [topXM - 0.293 * railM, topM - 0.293 * railM],
      crown(1),
      crown(COCKPIT_EDGE_T),
      crownCrease,
      crownCrease,
      crown(0.28),
      crown(0),
    ];
  };

  /** 車頭或車尾收圓起點的那一圈，以及它朝哪個高度縮、腰線以下的一半有多高。 */
  const endRing = (front: boolean): { half: [number, number][]; centerYM: number; halfHeightM: number } => {
    const half = halfSection(front ? noseStartZM : tailStartZM);
    const floorM = half[0]?.[1] ?? 0;
    const beltM = half[POINT.windowBase]?.[1] ?? 0;
    return { half, centerYM: (floorM + beltM) / 2, halfHeightM: (beltM - floorM) / 2 };
  };
  const rings = { nose: endRing(true), tail: endRing(false) };

  /** 端面上縮放比例 scale 的那一圈，原本高度 yM 的點縮到多高：寬度照比例縮，上下兩半各依自己的比例往中心壓。 */
  const capYM = (front: boolean, scale: number, yM: number): number => {
    const end = front ? spec.nose : spec.tail;
    const { centerYM } = front ? rings.nose : rings.tail;
    const squash = yM > centerYM ? end.squashTop : end.squashBottom;
    return centerYM + (yM - centerYM) * (1 - (1 - scale) * squash);
  };

  /** 端面上縮放比例 scale 的那一圈、高度 yM（已經縮過）的點的 z：超橢圓的收圓，加上端面上下緣往車身中心退的量。 */
  const capZM = (front: boolean, scale: number, yM: number): number => {
    const end = front ? spec.nose : spec.tail;
    const ring = front ? rings.nose : rings.tail;
    const round = 1 - (1 - scale ** end.exponent) ** (1 / end.exponent);
    const v = (yM - ring.centerYM) / ring.halfHeightM;
    const leanM = (v > 0 ? end.leanTopM * v : -end.leanBottomM * v) * (1 - round);
    const inwardM = end.depthM * round + leanM;
    return front ? noseTipZM + inwardM : tailTipZM - inwardM;
  };

  const endZM = (front: boolean, xM: number, yM: number): number => {
    const end = front ? spec.nose : spec.tail;
    const ring = front ? rings.nose : rings.tail;
    /** (x, y) 在不在縮放比例 scale 的那一圈裡面：把這一點放大回原本那一圈，數它右邊有幾條邊。 */
    const inside = (scale: number): boolean => {
      const squash = yM > ring.centerYM ? end.squashTop : end.squashBottom;
      const x = Math.abs(xM) / scale;
      const y = ring.centerYM + (yM - ring.centerYM) / (1 - (1 - scale) * squash);
      let crossings = 0;
      for (let index = 0; index + 1 < ring.half.length; index += 1) {
        const [ax, ay] = ring.half[index] ?? [0, 0];
        const [bx, by] = ring.half[index + 1] ?? [0, 0];
        if (ay > y !== by > y && x < ax + ((bx - ax) * (y - ay)) / (by - ay)) {
          crossings += 1;
        }
      }
      return crossings % 2 === 1;
    };
    // 二分法找出這一點剛好落在哪個縮放比例的那一圈上。
    let outer = 1;
    let inner = 0;
    for (let step = 0; step < 20 && inside(1); step += 1) {
      const middle = (outer + inner) / 2;
      if (inside(middle)) {
        outer = middle;
      } else {
        inner = middle;
      }
    }
    return capZM(front, outer, yM);
  };

  // 特徵線一定要有一站；成對靠很近的站讓轉折處（玻璃邊框、柱子邊緣）保持銳利。
  const features = [noseStartZM, tailStartZM, ...(spec.cockpitZM ?? [])];
  const creases = [noseStartZM, tailStartZM];
  if (cabin !== undefined) {
    features.push(
      ...cabin.roof.map(([zM]) => zM),
      cowlZM + GLASS_FRAME_M,
      cabin.headerZM - GLASS_FRAME_M,
      cabin.headerZM,
      cabin.rearHeaderZM,
      cabin.rearHeaderZM + GLASS_FRAME_M,
      cabin.sideGlassEndZM,
      rearBaseZM - GLASS_FRAME_M,
      ...cabin.pillarsZM.flatMap((zM) => [zM - cabin.pillarHalfWidthM, zM + cabin.pillarHalfWidthM]),
    );
    creases.push(cowlZM, cabin.headerZM, cabin.rearHeaderZM, rearBaseZM);
  }
  for (const axleZM of [-halfWheelbaseM, halfWheelbaseM]) {
    for (let step = 0; step <= ARCH_SEGMENTS; step += 1) {
      features.push(axleZM - archRadiusM * Math.cos((Math.PI * step) / ARCH_SEGMENTS));
    }
    // 輪拱兩端外側各多一站：輪拱的直邊才是直的，不是斜到下一站。
    features.push(axleZM - archRadiusM - ARCH_LEG_M, axleZM + archRadiusM + ARCH_LEG_M);
  }
  features.sort((a, b) => a - b);
  // 相鄰特徵線之間太寬就等分補站；幾乎重疊的只留一站。摺線的站放兩次（兩邊的頂點法線各算各的）。
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
    const pieces = Math.ceil(gapM / STATION_STEP_M);
    for (let piece = 1; piece <= pieces; piece += 1) {
      spaced.push(previous + (gapM * piece) / pieces);
    }
  }
  const middle = spaced.flatMap((zM) =>
    creases.some((creaseZM) => Math.abs(creaseZM - zM) < 1e-6) ? [zM, zM] : [zM],
  );
  const stations: Station[] = [
    ...END_SCALES.map((scale) => ({ zM: noseTipZM, sectionZM: noseStartZM, scale })).reverse(),
    ...middle.map((zM) => ({ zM, sectionZM: zM, scale: 1 })),
    ...END_SCALES.map((scale) => ({ zM: tailTipZM, sectionZM: tailStartZM, scale })),
  ];

  const positions = new Float32Array(stations.length * RING_POINTS * 3);
  stations.forEach((station, stationIndex) => {
    const front = station.sectionZM === noseStartZM;
    const half = halfSection(station.sectionZM);
    for (let ring = 0; ring < RING_POINTS; ring += 1) {
      // 前半圈是右側由下往上，後半圈是左側由上往下（鏡射）。
      const mirrored = ring >= HALF_RING_POINTS;
      const [xM, yM] = half[mirrored ? RING_POINTS - ring : ring] ?? [0, 0];
      const offset = (stationIndex * RING_POINTS + ring) * 3;
      const scaledYM = station.scale < 1 ? capYM(front, station.scale, yM) : yM;
      positions[offset] = (mirrored ? -xM : xM) * station.scale;
      positions[offset + 1] = scaledYM;
      positions[offset + 2] = station.scale < 1 ? capZM(front, station.scale, scaledYM) : station.zM;
    }
  });

  /** 外表面的一塊四邊形用哪個材質；undefined = 不畫（座艙開口）。 */
  const partOf = (from: Station, to: Station, strip: number): CarModelPart | undefined => {
    const zM = (from.zM + to.zM) / 2;
    if (from.scale < 1 || to.scale < 1) {
      return 'paint';
    }
    // 車底與門檻是黑的；輪拱的邊緣因此有一圈黑色的唇。
    if (strip <= STRIP.rockerEnd) {
      return 'trim';
    }
    if (
      spec.cockpitZM !== undefined &&
      strip >= STRIP.cockpitStart &&
      zM > spec.cockpitZM[0] &&
      zM < spec.cockpitZM[1]
    ) {
      return undefined;
    }
    if (cabin === undefined || zM <= cowlZM || zM >= rearBaseZM) {
      return 'paint';
    }
    if (strip === STRIP.sill) {
      return 'trim';
    }
    if (strip >= STRIP.sideGlassStart && strip <= STRIP.sideGlassEnd) {
      if (zM < cowlZM + GLASS_FRAME_M || zM > cabin.sideGlassEndZM) {
        return 'paint';
      }
      return cabin.pillarsZM.some((pillarZM) => Math.abs(zM - pillarZM) < cabin.pillarHalfWidthM)
        ? 'trim'
        : 'glass';
    }
    if (strip >= STRIP.topStart) {
      const windshield = zM > cowlZM + GLASS_FRAME_M && zM < cabin.headerZM - GLASS_FRAME_M;
      const rearWindow = zM > cabin.rearHeaderZM + GLASS_FRAME_M && zM < rearBaseZM - GLASS_FRAME_M;
      return windshield || rearWindow ? 'glass' : 'paint';
    }
    return 'paint';
  };

  const indices = new Map<CarModelPart, number[]>();
  const corner = new Vector3();
  for (let stationIndex = 0; stationIndex + 1 < stations.length; stationIndex += 1) {
    const from = stations[stationIndex];
    const to = stations[stationIndex + 1];
    if (from === undefined || to === undefined) {
      continue;
    }
    for (let ring = 0; ring < RING_POINTS; ring += 1) {
      const strip = ring < HALF_RING_POINTS - 1 ? ring : RING_POINTS - 1 - ring;
      const part = partOf(from, to, strip);
      if (part === undefined) {
        continue;
      }
      const a = stationIndex * RING_POINTS + ring;
      const b = stationIndex * RING_POINTS + ((ring + 1) % RING_POINTS);
      const list = indices.get(part) ?? [];
      // 收成一條線或一個點的三角形（摺線的重複站、沒有車艙時疊在窗台上的那幾點）不畫。
      for (const triangle of [
        [a, b, a + RING_POINTS],
        [b, b + RING_POINTS, a + RING_POINTS],
      ] as const) {
        const [p, q, r] = triangle.map((vertex) => corner.clone().fromArray(positions, vertex * 3));
        if (p !== undefined && q !== undefined && r !== undefined && q.sub(p).cross(r.sub(p)).lengthSq() > 1e-16) {
          list.push(...triangle);
        }
      }
      indices.set(part, list);
    }
  }

  // 法線用整張外表面算，分區交界才不會有接縫。
  const whole = new BufferGeometry();
  whole.setAttribute('position', new BufferAttribute(positions, 3));
  whole.setIndex([...indices.values()].flat());
  whole.computeVertexNormals();
  const normals = whole.getAttribute('normal');
  // 車頂與擋風玻璃是連續的弧面：那一對摺線頂點的法線併回同一個（摺線只留給引擎蓋與行李廂蓋）。
  const sum = new Vector3();
  const other = new Vector3();
  stations.forEach((station, stationIndex) => {
    if (station.scale < 1 || cabinHeightM(station.sectionZM) <= 0) {
      return;
    }
    for (const first of [POINT.crownCrease, RING_POINTS - POINT.crownCrease - 1]) {
      const a = stationIndex * RING_POINTS + first;
      sum.fromBufferAttribute(normals, a).add(other.fromBufferAttribute(normals, a + 1)).normalize();
      normals.setXYZ(a, sum.x, sum.y, sum.z);
      normals.setXYZ(a + 1, sum.x, sum.y, sum.z);
    }
  });

  // 每個分區只留自己用到的頂點。
  const geometries = new Map<CarModelPart, BufferGeometry>();
  for (const [part, partIndices] of indices) {
    const remap = new Map<number, number>();
    const partPositions: number[] = [];
    const partNormals: number[] = [];
    const compact = partIndices.map((vertex) => {
      let index = remap.get(vertex);
      if (index === undefined) {
        index = remap.size;
        remap.set(vertex, index);
        partPositions.push(positions[vertex * 3] ?? 0, positions[vertex * 3 + 1] ?? 0, positions[vertex * 3 + 2] ?? 0);
        partNormals.push(normals.getX(vertex), normals.getY(vertex), normals.getZ(vertex));
      }
      return index;
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(partPositions), 3));
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(partNormals), 3));
    geometry.setIndex(compact);
    geometries.set(part, geometry);
  }

  const sideProfile = (zM: number): [number, number][] =>
    halfSection(zM).slice(POINT.rockerTop + 1, POINT.windowBase + 1);
  return {
    geometries,
    noseStartZM,
    tailStartZM,
    archRadiusM,
    sideProfile,
    sideXM: (zM, yM) => {
      const profile = sideProfile(zM);
      for (let index = 0; index + 1 < profile.length; index += 1) {
        const [lowX, lowY] = profile[index] ?? [0, 0];
        const [highX, highY] = profile[index + 1] ?? [0, 0];
        if (yM >= lowY && yM <= highY && highY > lowY) {
          return lowX + ((highX - lowX) * (yM - lowY)) / (highY - lowY);
        }
      }
      return profile[0]?.[0] ?? 0;
    },
    topYM: (zM, xM) => {
      // 從頂面邊緣往中線走：x 遞減。
      const top = halfSection(zM).slice(POINT.windowBase + 1);
      const x = Math.abs(xM);
      for (let index = 0; index + 1 < top.length; index += 1) {
        const [outerX, outerY] = top[index] ?? [0, 0];
        const [innerX, innerY] = top[index + 1] ?? [0, 0];
        if (x <= outerX && x >= innerX && outerX > innerX) {
          return outerY + ((innerY - outerY) * (outerX - x)) / (outerX - innerX);
        }
      }
      return top[0]?.[1] ?? 0;
    },
    topEdgeXM: (zM) => halfSection(zM)[STRIP.topStart]?.[0] ?? 0,
    endZM,
  };
}
