// 車身配件：保險桿與下擾流、頭燈與尾燈的燈組（燈殼 + 分格的燈罩 + 鍍鉻框）、方向燈、第三煞車燈、水箱罩、前後車牌、
// 門縫與引擎蓋／行李廂蓋的接縫、門把、輪拱唇、窗台的鍍鉻飾條、排氣尾管；背景車另外併入車外後視鏡。
// 每個配件是一小塊獨立的幾何，貼著車殼曲面（carBody.ts）放；最後依材質分區併進車殼，
// 所以玩家車與背景車都是「每個材質一個網格」，配件不多花 draw call。
// 建模約定：車頭朝本地 −Z、右側 +X、地面 y = 0。車長的兩端剛好是前車牌的字與後保險桿。
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Matrix4,
  Quaternion,
  Shape,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DEFAULT_SEED } from '../core/gameConfig';
import { createRng } from '../core/rng';
import type { VehicleDetail } from '../render/quality';
import { CAR_VISUAL_CONFIG as VISUAL } from '../render/renderConfig';
import { FacetBuilder, type Point3 } from './facetBuilder';
import {
  BODY_LAYOUT,
  bodyEndFaceZM,
  bodySideProfile,
  bodyTopHeightM,
  createShellGeometries,
  type BodyPart,
} from './carBody';
import { VEHICLE_CONFIG_SI } from './vehicleConfig';

/** 一個配件：名稱（測試與除錯用）、用哪個材質分區、幾何（車的本地座標）。 */
export interface CarFitting {
  readonly name: string;
  readonly part: BodyPart;
  readonly geometry: BufferGeometry;
}

const L = BODY_LAYOUT;
const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;

/** 配件的尺寸與位置（公尺）。 */
const FIT = {
  /** 保險桿：上下緣的高度、側面往車身中段包多長、轉角半徑、邊緣倒角、比鈑金每側寬多少。 */
  bumperBottomM: 0.3,
  bumperTopM: 0.47,
  bumperWrapM: 0.4,
  bumperCornerM: 0.17,
  bumperBevelM: 0.012,
  bumperProudM: 0.012,
  /** 下擾流（黑色）：下緣高度、比保險桿正面內縮多少。 */
  valanceBottomM: 0.185,
  valanceInsetM: 0.022,
  /** 車牌：寬、高、厚；前車牌掛在前保險桿正面，後車牌貼在行李廂的端面。 */
  plateWidthM: 0.36,
  plateHeightM: 0.115,
  plateThicknessM: 0.008,
  frontPlateCenterYM: 0.385,
  rearPlateCenterYM: 0.665,
  /** 車牌的字凸出牌面多少。 */
  plateTextProudM: 0.001,
  /** 燈組：內緣與外緣的 x、高度、燈殼深度、燈殼凸出端面多少、燈罩再凸出燈殼多少。 */
  lampInnerXM: 0.3,
  lampOuterXM: 0.71,
  lampHeightM: 0.125,
  lampDepthM: 0.1,
  lampProudM: 0.01,
  lensProudM: 0.004,
  /** 燈殼邊框的寬度（外圈是鍍鉻框，內圈露出黑色燈殼），以及相鄰兩格燈罩之間的分隔。 */
  lampRimM: 0.012,
  lampBezelM: 0.007,
  lampBezelProudM: 0.006,
  lampDividerM: 0.012,
  /** 頭燈：內側那一格（遠光）佔燈罩寬度的比例；外側是近光，兩格都是方燈。 */
  headlampInnerShare: 0.5,
  /** 尾燈：由內到外是倒車燈、尾燈（紅）、方向燈（琥珀）；這是倒車燈與方向燈各佔燈罩寬度的比例。 */
  taillampReverseShare: 0.23,
  taillampIndicatorShare: 0.19,
  /** 前方向燈：嵌在前保險桿正面，左右各一格（內緣、外緣的 x，下緣、上緣的高度，凸出保險桿多少）。 */
  frontIndicatorM: { innerX: 0.4, outerX: 0.62, bottom: 0.362, top: 0.408, proud: 0.003 },
  /** 第三煞車燈：行李廂蓋後緣上的一條（寬、高、前後深度、離車尾接縫多遠）。 */
  highMountM: { width: 0.34, height: 0.014, depth: 0.03, aheadOfTailM: 0.075 },
  headlampCenterYM: 0.585,
  taillampCenterYM: 0.685,
  /** 水箱罩：半寬、橫條數。 */
  grilleHalfWidthM: 0.26,
  grilleBars: 5,
  /** 接縫（門縫、引擎蓋、行李廂蓋）的線寬。 */
  seamWidthM: 0.007,
  /** 前門前緣在前擋下緣後方多遠、後門後緣的 Z 在後輪拱前緣之前多遠。 */
  frontDoorBehindCowlM: 0.07,
  rearDoorAheadOfArchM: 0.03,
  /** 引擎蓋、行李廂蓋的側縫在窗台（引擎蓋邊的摺線）內側多遠。 */
  lidSeamInsetM: 0.028,
  /** 門把：長、高、厚，在腰線下方多遠、離門後緣多遠。 */
  handleSizeM: { length: 0.11, height: 0.022, depth: 0.02 },
  handleBelowBeltM: 0.085,
  handleFromDoorRearM: 0.14,
  /**
   * 輪拱唇：沿輪拱一圈凸出來的折邊（烤漆）。凸出鈑金多少、唇面的寬度、唇面外緣到鈑金的斜面寬度、
   * 往輪拱裡面折進去多深、兩端沿輪拱的直邊往下延伸到離地多高。
   */
  archLipM: { proud: 0.008, face: 0.02, chamfer: 0.016, returnDepth: 0.024, legBottom: 0.285 },
  /** 窗台的鍍鉻飾條：斷面的邊長、比窗台往外、往上多少。 */
  beltlineM: { thickness: 0.011, out: 0.003, up: 0.004 },
  /** 天窗：前緣在車頂前緣後方多遠、前後長度、半寬，玻璃比車頂高多少。 */
  sunroofM: { behindHeader: 0.17, length: 0.6, halfWidth: 0.37, lift: 0.004 },
  /** 天線：後葉子板上一根直立的細桿（x、在後擋下緣後方多遠、粗細）；頂端剛好是車高，是整台車最高的地方。 */
  antennaM: { x: -0.6, behindRearWindow: 0.16, thickness: 0.007 },
  /** 排氣尾管：半徑、長度、中心的 x 與高度、管口比車尾內縮多少。 */
  exhaustM: { radius: 0.026, length: 0.13, x: -0.4, y: 0.218, insetFromTail: 0.014 },
  /**
   * 車外後視鏡：鏡殼的寬、高、前後深度，中心比前擋下緣的腰線高多少、在前擋下緣後方多遠，
   * 以及接到車門的支臂。鏡殼最外側剛好在車寬的一半。
   */
  mirrorM: {
    shell: { x: 0.19, y: 0.12, z: 0.07 },
    aboveCowl: 0.09,
    behindCowl: 0.3,
    arm: { x: 0.12, y: 0.035, z: 0.05 },
  },
} as const;

/** 車牌的字：3×5 點陣（每列 3 個位元，由上到下）。 */
const GLYPH_COLUMNS = 3;
const GLYPH_ROWS = 5;
const GLYPHS: Readonly<Record<string, readonly number[]>> = {
  '0': [0b111, 0b101, 0b101, 0b101, 0b111],
  '1': [0b010, 0b110, 0b010, 0b010, 0b111],
  '2': [0b111, 0b001, 0b111, 0b100, 0b111],
  '3': [0b111, 0b001, 0b111, 0b001, 0b111],
  '4': [0b101, 0b101, 0b111, 0b001, 0b001],
  '5': [0b111, 0b100, 0b111, 0b001, 0b111],
  '6': [0b111, 0b100, 0b111, 0b101, 0b111],
  '7': [0b111, 0b001, 0b001, 0b001, 0b001],
  '8': [0b111, 0b101, 0b111, 0b101, 0b111],
  '9': [0b111, 0b101, 0b111, 0b001, 0b111],
  A: [0b010, 0b101, 0b111, 0b101, 0b101],
  C: [0b111, 0b100, 0b100, 0b100, 0b111],
  E: [0b111, 0b100, 0b111, 0b100, 0b111],
  F: [0b111, 0b100, 0b111, 0b100, 0b100],
  H: [0b101, 0b101, 0b111, 0b101, 0b101],
  J: [0b001, 0b001, 0b001, 0b101, 0b111],
  L: [0b100, 0b100, 0b100, 0b100, 0b111],
  P: [0b111, 0b101, 0b111, 0b100, 0b100],
  T: [0b111, 0b010, 0b010, 0b010, 0b010],
  U: [0b101, 0b101, 0b101, 0b101, 0b111],
  Y: [0b101, 0b101, 0b010, 0b010, 0b010],
  '-': [0b000, 0b000, 0b111, 0b000, 0b000],
};
const PLATE_LETTERS = 'ACEFHJLPTUY';
const PLATE_DIGITS = '0123456789';

/** 車牌號碼：三個字母、一槓、四個數字，由種子決定（同一個種子永遠是同一塊車牌）。 */
export function plateText(seed: number): string {
  const rng = createRng(seed);
  const pick = (alphabet: string): string =>
    alphabet.charAt(Math.min(Math.floor(rng() * alphabet.length), alphabet.length - 1));
  const letters = [pick(PLATE_LETTERS), pick(PLATE_LETTERS), pick(PLATE_LETTERS)].join('');
  const digits = [pick(PLATE_DIGITS), pick(PLATE_DIGITS), pick(PLATE_DIGITS), pick(PLATE_DIGITS)];
  return `${letters}-${digits.join('')}`;
}

/** 只留位置與法線、而且有索引：所有配件與車殼的屬性一致，才併得起來。 */
function normalized(geometry: BufferGeometry): BufferGeometry {
  geometry.deleteAttribute('uv');
  if (geometry.getIndex() === null) {
    const count = geometry.getAttribute('position').count;
    geometry.setIndex(Array.from({ length: count }, (_, index) => index));
  }
  return geometry;
}

function box(size: Point3, center: Point3): BufferGeometry {
  return normalized(new BoxGeometry(...size).translate(...center));
}

function steps(fromM: number, toM: number, count: number): number[] {
  return Array.from({ length: count + 1 }, (_, index) => fromM + ((toM - fromM) * index) / count);
}

/**
 * 貼著車頭或車尾端面的一塊弧形板：正面跟著端面的弧度走（每個 x 各取端面在 faceYM 那個高度的 Z）再凸出 proudM，
 * 厚度往車內長 depthM。從正面看是矩形（上下緣水平）；背面埋在車殼裡，不畫。
 * @param front true = 車頭、false = 車尾
 */
function createFaceSlab(
  front: boolean,
  faceYM: number,
  x: readonly [number, number],
  y: readonly [number, number],
  proudM: number,
  depthM: number,
  segments = 6,
): BufferGeometry {
  const outwardZ = front ? -1 : 1;
  const xs = steps(x[0], x[1], segments);
  const faceZ = xs.map((xM) => bodyEndFaceZM(front, xM, faceYM) + outwardZ * proudM);
  const row = (yM: number, back: boolean): Point3[] =>
    xs.map((xM, index): Point3 => [xM, yM, (faceZ[index] ?? 0) - (back ? outwardZ * depthM : 0)]);
  const builder = new FacetBuilder()
    .grid([row(y[0], false), row(y[1], false)], [0, 0, outwardZ])
    .grid([row(y[1], false), row(y[1], true)], [0, 1, 0])
    .grid([row(y[0], false), row(y[0], true)], [0, -1, 0]);
  for (const [index, other] of [
    [0, segments],
    [segments, 0],
  ] as const) {
    const xM = xs[index] ?? 0;
    const zM = faceZ[index] ?? 0;
    builder.grid(
      [
        [
          [xM, y[0], zM],
          [xM, y[1], zM],
        ],
        [
          [xM, y[0], zM - outwardZ * depthM],
          [xM, y[1], zM - outwardZ * depthM],
        ],
      ],
      [Math.sign(xM - (xs[other] ?? 0)), 0, 0],
    );
  }
  return builder.build();
}

/** 從 a 到 b 的一根方條（斷面是邊長 thicknessM 的正方形）。接縫與雨刷都用它。 */
export function createBeamGeometry(a: Point3, b: Point3, thicknessM: number): BufferGeometry {
  const from = new Vector3(...a);
  const along = new Vector3(...b).sub(from);
  const lengthM = along.length();
  const rotation = new Quaternion().setFromUnitVectors(
    new Vector3(0, 0, 1),
    along.clone().normalize(),
  );
  const center = from.add(along.multiplyScalar(0.5));
  return normalized(
    new BoxGeometry(thicknessM, thicknessM, lengthM).applyMatrix4(
      new Matrix4().compose(center, rotation, new Vector3(1, 1, 1)),
    ),
  );
}

/** 沿一串點的折線（每段一根方條）。 */
function polyline(points: readonly Point3[], thicknessM: number): BufferGeometry[] {
  const beams: BufferGeometry[] = [];
  for (let index = 0; index + 1 < points.length; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    if (a !== undefined && b !== undefined && Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) > 1e-4) {
      beams.push(createBeamGeometry(a, b, thicknessM));
    }
  }
  return beams;
}

function merged(geometries: readonly BufferGeometry[]): BufferGeometry {
  return mergeGeometries([...geometries]);
}

/** 把車頭那一端的幾何繞 Y 轉半圈，變成車尾那一端的。 */
function turnedToRear(geometry: BufferGeometry): BufferGeometry {
  return geometry.rotateY(Math.PI);
}

/**
 * 保險桿之類包住車頭的一條：俯視是前緣兩角收圓的 U 形實心板，沿高度擠出，上下緣倒角。
 * 以車頭為準建立（正面在 frontZM、往 +Z 包 wrapM）；車尾的用 turnedToRear 轉過去。
 */
function createWrapBar(
  halfWidthM: number,
  frontZM: number,
  wrapM: number,
  bottomM: number,
  topM: number,
): BufferGeometry {
  const bevelM = FIT.bumperBevelM;
  const cornerM = FIT.bumperCornerM;
  // Shape 的 X 是車的 X、Y 是車的 −Z；擠出方向（Shape 的 Z）之後轉成車的 Y。
  const front = -frontZM;
  const back = front - wrapM;
  const outline = new Shape();
  outline.moveTo(-halfWidthM, back);
  outline.lineTo(-halfWidthM, front - cornerM);
  outline.quadraticCurveTo(-halfWidthM, front, -halfWidthM + cornerM, front);
  outline.lineTo(halfWidthM - cornerM, front);
  outline.quadraticCurveTo(halfWidthM, front, halfWidthM, front - cornerM);
  outline.lineTo(halfWidthM, back);
  outline.closePath();
  return normalized(
    new ExtrudeGeometry(outline, {
      depth: topM - bottomM - 2 * bevelM,
      bevelEnabled: true,
      bevelThickness: bevelM,
      bevelSize: bevelM,
      // 倒角往內收：中段的輪廓就是畫的這一圈，最外緣剛好在 halfWidthM 與 frontZM。
      bevelOffset: -bevelM,
      bevelSegments: 1,
      curveSegments: 8,
    })
      .rotateX(-Math.PI / 2)
      .translate(0, bottomM + bevelM, 0),
  );
}

/** 鈑金在這一站最寬處的半寬。 */
function sheetHalfWidthM(zM: number): number {
  return Math.max(...bodySideProfile(zM).map(([xM]) => xM));
}

/** 鈑金側面在高度 yM 處的 x（沿側面輪廓內插）。 */
function sideXM(zM: number, yM: number): number {
  const profile = bodySideProfile(zM);
  for (let index = 0; index + 1 < profile.length; index += 1) {
    const [lowX, lowY] = profile[index] ?? [0, 0];
    const [highX, highY] = profile[index + 1] ?? [0, 0];
    if (yM >= lowY && yM <= highY && highY > lowY) {
      return lowX + ((highX - lowX) * (yM - lowY)) / (highY - lowY);
    }
  }
  return profile[0]?.[0] ?? 0;
}

/** 車牌：牌面（淺色的薄板）與字（黑色的點陣小方塊）。outwardZ 是牌面朝向（−1 朝前、+1 朝後），faceZM 是牌面的 Z。 */
function createPlate(
  text: string,
  centerYM: number,
  faceZM: number,
  outwardZ: number,
): { plate: BufferGeometry; text: BufferGeometry } {
  const plate = box(
    [FIT.plateWidthM, FIT.plateHeightM, FIT.plateThicknessM],
    [0, centerYM, faceZM - (outwardZ * FIT.plateThicknessM) / 2],
  );

  // 每個字 3 格寬、字與字隔 1 格，左右上下各留邊。
  const columns = text.length * (GLYPH_COLUMNS + 1) - 1;
  const cellWM = (FIT.plateWidthM * 0.86) / columns;
  const cellHM = (FIT.plateHeightM * 0.62) / GLYPH_ROWS;
  const textZM = faceZM + outwardZ * FIT.plateTextProudM;
  // 從外面看牌面，字要由左讀到右：朝後的牌面「右」是 +X，朝前的是 −X。
  const rightX = outwardZ;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  [...text].forEach((character, characterIndex) => {
    const rows = GLYPHS[character] ?? [];
    rows.forEach((bits, row) => {
      for (let column = 0; column < GLYPH_COLUMNS; column += 1) {
        if ((bits & (1 << (GLYPH_COLUMNS - 1 - column))) === 0) {
          continue;
        }
        const left = (characterIndex * (GLYPH_COLUMNS + 1) + column - columns / 2) * cellWM;
        const top = centerYM + (GLYPH_ROWS / 2 - row) * cellHM;
        const base = positions.length / 3;
        for (const [u, v] of [
          [left, top - cellHM],
          [left + cellWM, top - cellHM],
          [left + cellWM, top],
          [left, top],
        ] as const) {
          positions.push(u * rightX, v, textZM);
          normals.push(0, 0, outwardZ);
        }
        // 從外面看是逆時針（正面朝外）。
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    });
  });
  const glyphs = new BufferGeometry();
  glyphs.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  glyphs.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  glyphs.setIndex(indices);
  return { plate, text: glyphs };
}

/**
 * 一端的左右兩個燈組：黑色燈殼裡嵌幾格燈罩，外圈一圈鍍鉻框，整組跟著端面的弧度包向車角。
 * @param front true = 頭燈、false = 尾燈
 * @param shares 由內到外每一格燈罩佔的寬度比例（加起來是 1）
 * @param curveSegments 燈殼與鍍鉻框沿著端面的弧度分幾段
 * @returns housing：燈殼；lenses：由內到外每一格燈罩（左右併在一起）；bezel：鍍鉻框（尾燈另有一條橫過燈罩的飾條）
 */
function createLampClusters(
  front: boolean,
  centerYM: number,
  shares: readonly number[],
  curveSegments: number,
): { housing: BufferGeometry; lenses: BufferGeometry[]; bezel: BufferGeometry } {
  const bottomM = centerYM - FIT.lampHeightM / 2;
  const topM = centerYM + FIT.lampHeightM / 2;
  const lensWidthM =
    FIT.lampOuterXM - FIT.lampInnerXM - 2 * FIT.lampRimM - (shares.length - 1) * FIT.lampDividerM;
  const lensY = [bottomM + FIT.lampRimM, topM - FIT.lampRimM] as const;
  const bezelProudM = FIT.lampProudM + FIT.lampBezelProudM;
  const bezelDepthM = FIT.lampBezelProudM + 0.004;

  const housing: BufferGeometry[] = [];
  const bezel: BufferGeometry[] = [];
  const lenses: BufferGeometry[][] = shares.map(() => []);
  for (const side of [-1, 1]) {
    const slab = (
      fromXM: number,
      toXM: number,
      y: readonly [number, number],
      proudM: number,
      depthM: number,
      segments: number,
    ): BufferGeometry =>
      createFaceSlab(front, centerYM, [side * fromXM, side * toXM], y, proudM, depthM, segments);

    housing.push(
      slab(FIT.lampInnerXM, FIT.lampOuterXM, [bottomM, topM], FIT.lampProudM, FIT.lampDepthM, curveSegments),
    );
    // 鍍鉻框：上下兩條橫的跟著端面彎，左右兩條直的。
    bezel.push(
      slab(FIT.lampInnerXM, FIT.lampOuterXM, [topM - FIT.lampBezelM, topM], bezelProudM, bezelDepthM, curveSegments),
      slab(FIT.lampInnerXM, FIT.lampOuterXM, [bottomM, bottomM + FIT.lampBezelM], bezelProudM, bezelDepthM, curveSegments),
      slab(
        FIT.lampInnerXM,
        FIT.lampInnerXM + FIT.lampBezelM,
        [bottomM + FIT.lampBezelM, topM - FIT.lampBezelM],
        bezelProudM,
        bezelDepthM,
        1,
      ),
      slab(
        FIT.lampOuterXM - FIT.lampBezelM,
        FIT.lampOuterXM,
        [bottomM + FIT.lampBezelM, topM - FIT.lampBezelM],
        bezelProudM,
        bezelDepthM,
        1,
      ),
    );
    if (!front) {
      // 尾燈：一條細的鍍鉻飾條橫過整排燈罩，把燈分成上下兩列。
      bezel.push(
        slab(
          FIT.lampInnerXM + FIT.lampBezelM,
          FIT.lampOuterXM - FIT.lampBezelM,
          [centerYM - 0.003, centerYM + 0.003],
          bezelProudM,
          bezelDepthM,
          curveSegments,
        ),
      );
    }
    let fromXM = FIT.lampInnerXM + FIT.lampRimM;
    shares.forEach((share, index) => {
      const toXM = fromXM + lensWidthM * share;
      lenses[index]?.push(slab(fromXM, toXM, lensY, FIT.lampProudM + FIT.lensProudM, 0.02, Math.ceil(curveSegments / 2)));
      fromXM = toXM + FIT.lampDividerM;
    });
  }
  return { housing: merged(housing), lenses: lenses.map(merged), bezel: merged(bezel) };
}

/** 輪拱唇：四個輪拱各一圈凸出鈑金的折邊（唇面朝外、內緣往輪拱裡折、外緣一道斜面接回鈑金）。 */
function createArchLips(segments: number): BufferGeometry {
  const lip = FIT.archLipM;
  const radiusM = L.archRadiusM;
  const axleYM = VISUAL.wheelRadiusM;
  const builder = new FacetBuilder();
  for (const axleZM of [-VEHICLE_CONFIG_SI.wheelbaseM / 2, VEHICLE_CONFIG_SI.wheelbaseM / 2]) {
    /** 沿輪拱走的一串點：[輪拱邊緣上的 z, y, 往外（遠離輪軸）的方向 dz, dy]；兩端是往下的直邊。 */
    const path: (readonly [number, number, number, number])[] = [
      [axleZM - radiusM, lip.legBottom, -1, 0],
      ...steps(0, Math.PI, segments).map(
        (angleRad): readonly [number, number, number, number] => [
          axleZM - radiusM * Math.cos(angleRad),
          axleYM + radiusM * Math.sin(angleRad),
          -Math.cos(angleRad),
          Math.sin(angleRad),
        ],
      ),
      [axleZM + radiusM, lip.legBottom, 1, 0],
    ];
    for (const side of [-1, 1]) {
      /** 這一圈上、離輪拱邊緣 outM（往外為正）、比鈑金凸出 proudM 的點。 */
      const row = (outM: number, proudM: number): Point3[] =>
        path.map(([zM, yM, dz, dy]): Point3 => [
          side * (sheetHalfWidthM(zM) - 0.004 + proudM),
          yM + dy * outM,
          zM + dz * outM,
        ]);
      const inner = row(-0.004, -lip.returnDepth);
      const edge = row(-0.004, lip.proud);
      const face = row(lip.face, lip.proud);
      const foot = row(lip.face + lip.chamfer, 0);
      const middle = path[Math.floor(path.length / 2)] ?? [0, 0, 0, 1];
      builder
        // 往輪拱裡折進去的那一面：朝向輪軸。
        .grid([inner, edge], (center) => [0, axleYM - center.y, axleZM - center.z])
        .grid([edge, face], [side, 0, 0])
        .grid([face, foot], [side, middle[3], middle[2]]);
    }
  }
  return builder.build();
}

/** 天窗：車頂上一圈黑色的接縫，裡面一片跟著車頂弧度的深色玻璃。across、along：橫向、縱向各分幾段。 */
function createSunroof(across: number, along: number): { seam: BufferGeometry; glass: BufferGeometry } {
  const roof = FIT.sunroofM;
  const fromZM = L.windshieldTopZM + roof.behindHeader;
  const toZM = fromZM + roof.length;
  const xs = steps(-roof.halfWidth, roof.halfWidth, across);
  const zs = steps(fromZM, toZM, along);
  const onRoof = (xM: number, zM: number, liftM: number): Point3 => [
    xM,
    bodyTopHeightM(zM, xM) + liftM,
    zM,
  ];
  const outline: Point3[] = [
    ...zs.map((zM) => onRoof(-roof.halfWidth, zM, 0)),
    ...xs.slice(1).map((xM) => onRoof(xM, toZM, 0)),
    ...[...zs].reverse().slice(1).map((zM) => onRoof(roof.halfWidth, zM, 0)),
    ...[...xs].reverse().slice(1).map((xM) => onRoof(xM, fromZM, 0)),
  ];
  const insetM = FIT.seamWidthM;
  const glass = new FacetBuilder()
    .grid(
      steps(fromZM + insetM, toZM - insetM, along).map((zM) =>
        steps(-roof.halfWidth + insetM, roof.halfWidth - insetM, across).map((xM) =>
          onRoof(xM, zM, roof.lift),
        ),
      ),
      [0, 1, 0],
    )
    .build();
  return { seam: merged(polyline(outline, FIT.seamWidthM)), glass };
}

/** 窗台的鍍鉻飾條：左右各一條，沿側窗下緣從 A 柱根部到 C 柱。 */
function createBeltline(pieces: number): BufferGeometry {
  const { thickness, out, up } = FIT.beltlineM;
  const beams: BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    beams.push(
      ...polyline(
        steps(L.windshieldBaseZM + 0.05, L.rearWindowBaseZM - 0.05, pieces).map((zM): Point3 => {
          const [xM, yM] = bodySideProfile(zM).at(-1) ?? [0, 0];
          return [side * (xM + out), yM + up, zM];
        }),
        thickness,
      ),
    );
  }
  return merged(beams);
}

/**
 * 車外後視鏡的鏡殼（以鏡殼中心為原點）：後端是圓角矩形的開口（朝後，鏡框與鏡面貼在上面），
 * 往前一路收小、往車身那一側靠，前端收成一個小圓面——流線形，不是一顆方塊。
 * @param side −1 左、+1 右（決定往哪一側收）
 */
export function createDoorMirrorShellGeometry(side: number): BufferGeometry {
  const { x, y, z } = FIT.mirrorM.shell;
  /** 圓角矩形的一圈：半寬 a、半高 b、圓角半徑 c，中心往車身那一側偏 inM。 */
  const ring = (zM: number, a: number, b: number, c: number, inM: number): Point3[] => {
    const points: Point3[] = [];
    for (const [cornerX, cornerY, startRad] of [
      [1, 1, 0],
      [-1, 1, Math.PI / 2],
      [-1, -1, Math.PI],
      [1, -1, (3 * Math.PI) / 2],
    ] as const) {
      for (let step = 0; step <= 3; step += 1) {
        const angleRad = startRad + (step * Math.PI) / 6;
        points.push([
          cornerX * (a - c) + c * Math.cos(angleRad) - side * inM,
          cornerY * (b - c) + c * Math.sin(angleRad),
          zM,
        ]);
      }
    }
    return points;
  };
  const rear = ring(z / 2, x / 2, y / 2, 0.024, 0);
  const nose = ring(-z / 2, 0.3 * x, 0.3 * y, 0.02, 0.026);
  return new FacetBuilder()
    .loop([
      rear,
      ring(0.1 * z, x / 2, y / 2, 0.024, 0),
      ring(-0.3 * z, 0.43 * x, 0.42 * y, 0.024, 0.012),
      nose,
    ])
    .fan(nose, [-side * 0.026, 0, -z / 2 - 0.004], [0, 0, -1])
    .fan(rear, [0, 0, z / 2], [0, 0, 1])
    .build();
}

/** 車外後視鏡在車上的位置（鏡殼中心）。 */
export function doorMirrorCenter(side: number): Point3 {
  return [
    side * (VEHICLE_CONFIG_SI.widthM / 2 - FIT.mirrorM.shell.x / 2),
    L.cowlHeightM + FIT.mirrorM.aboveCowl,
    L.windshieldBaseZM + FIT.mirrorM.behindCowl,
  ];
}

/** 車外後視鏡的尺寸：鏡殼與支臂（carMesh.ts 的玩家車也用這一份）。 */
export const DOOR_MIRROR_SIZE_M = FIT.mirrorM;

/** 背景車用的車外後視鏡（併進車身）：鏡殼（烤漆），以及朝後的黑色鏡面與支臂。 */
function createDoorMirrors(): { shells: BufferGeometry; backs: BufferGeometry } {
  const { shell, arm } = FIT.mirrorM;
  const shells: BufferGeometry[] = [];
  const backs: BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const center = doorMirrorCenter(side);
    shells.push(createDoorMirrorShellGeometry(side).translate(...center));
    backs.push(
      box([shell.x - 0.03, shell.y - 0.03, 0.008], [center[0], center[1], center[2] + shell.z / 2]),
      box([arm.x, arm.y, arm.z], [center[0] - side * 0.12, center[1] - 0.035, center[2]]),
    );
  }
  return { shells: merged(shells), backs: merged(backs) };
}

/** 門縫、引擎蓋與行李廂蓋的接縫：貼著車殼的細黑線。 */
function createSeams(): { doors: BufferGeometry; hood: BufferGeometry; trunk: BufferGeometry } {
  const widthM = FIT.seamWidthM;
  const frontDoorZM = L.windshieldBaseZM + FIT.frontDoorBehindCowlM;
  const rearDoorZM =
    VEHICLE_CONFIG_SI.wheelbaseM / 2 - L.archRadiusM - FIT.rearDoorAheadOfArchM;
  const doors: BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    // 三條直的門縫：前門前緣、B 柱（前後門之間）、後門後緣，從門檻上緣到窗台。
    for (const zM of [frontDoorZM, L.bPillarZM, rearDoorZM]) {
      doors.push(
        ...polyline(
          bodySideProfile(zM).map(([xM, yM]): Point3 => [side * xM, yM, zM]),
          widthM,
        ),
      );
    }
    // 門的下緣：門檻上方的一條橫縫。
    doors.push(
      ...polyline(
        steps(frontDoorZM, rearDoorZM, 6).map((zM): Point3 => {
          const [xM, yM] = bodySideProfile(zM)[0] ?? [0, 0];
          return [side * xM, yM + 0.012, zM];
        }),
        widthM,
      ),
    );
  }

  /** 頂面上的一條縫：沿 z 走（固定 x）或沿 x 走（固定 z）。 */
  const alongZ = (xM: number, fromZM: number, toZM: number): BufferGeometry[] =>
    polyline(
      steps(fromZM, toZM, 6).map((zM): Point3 => [xM, bodyTopHeightM(zM, xM), zM]),
      widthM,
    );
  const acrossX = (zM: number, halfWidthM: number): BufferGeometry[] =>
    polyline(
      steps(-halfWidthM, halfWidthM, 10).map((xM): Point3 => [xM, bodyTopHeightM(zM, xM), zM]),
      widthM,
    );
  const lidHalfWidthM = (zM: number): number =>
    (bodySideProfile(zM).at(-1)?.[0] ?? 0) - FIT.lidSeamInsetM;

  // 引擎蓋：兩條側縫（摺線內側）、前緣（車頭接縫處）、後緣（前擋下緣前方）。
  const hoodFrontZM = L.noseStartZM + 0.01;
  const hoodRearZM = L.windshieldBaseZM - 0.03;
  const hoodHalfWidthM = Math.min(lidHalfWidthM(hoodFrontZM), lidHalfWidthM(hoodRearZM));
  const hood = [
    ...alongZ(-hoodHalfWidthM, hoodFrontZM, hoodRearZM),
    ...alongZ(hoodHalfWidthM, hoodFrontZM, hoodRearZM),
    ...acrossX(hoodFrontZM, hoodHalfWidthM),
    ...acrossX(hoodRearZM, hoodHalfWidthM),
  ];

  // 行李廂蓋：兩條側縫、前緣（後擋下緣後方）、後緣（車尾接縫處）。
  const trunkFrontZM = L.rearWindowBaseZM + 0.04;
  const trunkRearZM = L.tailStartZM - 0.01;
  const trunkHalfWidthM = Math.min(lidHalfWidthM(trunkFrontZM), lidHalfWidthM(trunkRearZM));
  const trunk = [
    ...alongZ(-trunkHalfWidthM, trunkFrontZM, trunkRearZM),
    ...alongZ(trunkHalfWidthM, trunkFrontZM, trunkRearZM),
    ...acrossX(trunkFrontZM, trunkHalfWidthM),
    ...acrossX(trunkRearZM, trunkHalfWidthM),
  ];

  return { doors: merged(doors), hood: merged(hood), trunk: merged(trunk) };
}

/** 四個門把：前後門靠後緣、腰線下方的鍍鉻小橫條。 */
function createDoorHandles(): BufferGeometry {
  const { length, height, depth } = FIT.handleSizeM;
  const rearDoorZM =
    VEHICLE_CONFIG_SI.wheelbaseM / 2 - L.archRadiusM - FIT.rearDoorAheadOfArchM;
  const handles: BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    for (const doorRearZM of [L.bPillarZM, rearDoorZM]) {
      const zM = doorRearZM - FIT.handleFromDoorRearM;
      const yM = (bodySideProfile(zM).at(-1)?.[1] ?? 0) - FIT.handleBelowBeltM;
      handles.push(box([depth, height, length], [side * sideXM(zM, yM), yM, zM]));
    }
  }
  return merged(handles);
}

/** 前後兩塊車牌的牌面與字（車的本地座標）。前車牌的字就是車長的最前端。 */
function createPlates(text: string): {
  front: ReturnType<typeof createPlate>;
  rear: ReturnType<typeof createPlate>;
} {
  return {
    front: createPlate(text, FIT.frontPlateCenterYM, -HALF_LENGTH_M + FIT.plateTextProudM, -1),
    rear: createPlate(
      text,
      FIT.rearPlateCenterYM,
      bodyEndFaceZM(false, 0, FIT.rearPlateCenterYM) + FIT.plateThicknessM,
      1,
    ),
  };
}

/** 配件名稱：車牌上的字。背景車把它從共用的車殼裡拿掉，換成每台車自己的號碼。 */
export const PLATE_TEXT_FITTINGS: readonly string[] = ['plate:front:text', 'plate:rear:text'];

/** 一台車前後兩塊車牌上的字（車的本地座標，只有位置與法線、有索引）。 */
export function createPlateTextGeometry(text: string): BufferGeometry {
  const plates = createPlates(text);
  return merged([plates.front.text, plates.rear.text]);
}

/** 配件名稱：背景車才併進車身的車外後視鏡（玩家車的後視鏡是另外的網格，鏡面會反光）。 */
export const MIRROR_FITTINGS: readonly string[] = ['mirror:shells', 'mirror:backs'];

/**
 * 建立全部的配件（還沒併進車殼）。每次呼叫都是新的幾何。
 * @param detail low：跟著曲面彎的配件（燈組、水箱罩、輪拱唇、窗台飾條、天窗）段數少一半、水箱罩少兩條橫條
 *   （背景車與低畫質用；配件的種類與位置相同）
 */
export function createCarFittings(detail: VehicleDetail = 'high'): CarFitting[] {
  const fittings: CarFitting[] = [];
  const add = (name: string, part: BodyPart, geometry: BufferGeometry): void => {
    fittings.push({ name, part, geometry });
  };
  const high = detail === 'high';
  const lampSegments = high ? 6 : 3;

  // 保險桿（烤漆）與下擾流（黑）。前保險桿的正面讓出車牌的厚度；後保險桿的正面就是車尾。
  const frontBumperZM = -HALF_LENGTH_M + FIT.plateThicknessM + FIT.plateTextProudM;
  const bumperHalfWidthM =
    sheetHalfWidthM(frontBumperZM + FIT.bumperWrapM) + FIT.bumperProudM;
  const bumper = (frontZM: number): BufferGeometry =>
    createWrapBar(bumperHalfWidthM, frontZM, FIT.bumperWrapM, FIT.bumperBottomM, FIT.bumperTopM);
  const valance = (frontZM: number): BufferGeometry =>
    createWrapBar(
      bumperHalfWidthM - FIT.valanceInsetM,
      frontZM + FIT.valanceInsetM,
      FIT.bumperWrapM - 2 * FIT.valanceInsetM,
      FIT.valanceBottomM,
      FIT.bumperBottomM + FIT.bumperBevelM,
    );
  add('bumper:front', 'paint', bumper(frontBumperZM));
  add('valance:front', 'trim', valance(frontBumperZM));
  add('bumper:rear', 'paint', turnedToRear(bumper(-HALF_LENGTH_M)));
  add('valance:rear', 'trim', turnedToRear(valance(-HALF_LENGTH_M)));
  add('arch:lips', 'paint', createArchLips(high ? 16 : 8));

  // 燈組：頭燈是兩格方燈（遠光、近光）；尾燈由內到外是倒車燈、尾燈、方向燈。
  const headlamps = createLampClusters(true, FIT.headlampCenterYM, [
    FIT.headlampInnerShare,
    1 - FIT.headlampInnerShare,
  ], lampSegments);
  add('headlamp:housing', 'trim', headlamps.housing);
  add('headlamp:lens', 'headlight', merged(headlamps.lenses));
  add('headlamp:bezel', 'chrome', headlamps.bezel);
  const taillamps = createLampClusters(false, FIT.taillampCenterYM, [
    FIT.taillampReverseShare,
    1 - FIT.taillampReverseShare - FIT.taillampIndicatorShare,
    FIT.taillampIndicatorShare,
  ], lampSegments);
  const [reverseLens, tailLens, rearIndicatorLens] = taillamps.lenses;
  if (reverseLens === undefined || tailLens === undefined || rearIndicatorLens === undefined) {
    throw new Error('尾燈燈組少了一格燈罩');
  }
  add('taillamp:housing', 'trim', taillamps.housing);
  add('taillamp:lens', 'taillight', tailLens);
  add('reverselamp:lens', 'reverseLight', reverseLens);
  add('taillamp:bezel', 'chrome', taillamps.bezel);

  // 方向燈（琥珀色）：前面的嵌在保險桿正面，後面的是尾燈最外側那一格。
  const indicator = FIT.frontIndicatorM;
  add(
    'turnsignal:lens',
    'indicator',
    merged([
      rearIndicatorLens,
      ...[-1, 1].map((side) =>
        box(
          [indicator.outerX - indicator.innerX, indicator.top - indicator.bottom, 0.012],
          [
            (side * (indicator.innerX + indicator.outerX)) / 2,
            (indicator.bottom + indicator.top) / 2,
            frontBumperZM - indicator.proud + 0.006,
          ],
        ),
      ),
    ]),
  );

  // 第三煞車燈：行李廂蓋後緣上的一條，與尾燈同一個材質（煞車時一起加亮）；底下一條黑色的座。
  const highMount = FIT.highMountM;
  const highMountZM = L.tailStartZM - highMount.aheadOfTailM;
  const highMountYM = bodyTopHeightM(highMountZM, highMount.width / 2);
  add(
    'stoplamp:highmount',
    'taillight',
    box(
      [highMount.width, highMount.height, highMount.depth],
      [0, highMountYM + highMount.height / 2 + 0.004, highMountZM],
    ),
  );
  add(
    'stoplamp:base',
    'trim',
    box(
      [highMount.width + 0.03, 0.012, highMount.depth + 0.02],
      [0, highMountYM, highMountZM - 0.004],
    ),
  );

  // 水箱罩：兩個頭燈之間跟著端面彎的黑色格柵、鍍鉻橫條與外框；車尾對應的位置是車牌上方的一條鍍鉻飾條。
  const grilleHeightM = FIT.lampHeightM - 0.02;
  const grilleX = [-FIT.grilleHalfWidthM, FIT.grilleHalfWidthM] as const;
  const grilleBottomM = FIT.headlampCenterYM - grilleHeightM / 2;
  const grilleTopM = FIT.headlampCenterYM + grilleHeightM / 2;
  const grilleSlab = (
    x: readonly [number, number],
    y: readonly [number, number],
    proudM: number,
    depthM: number,
  ): BufferGeometry => createFaceSlab(true, FIT.headlampCenterYM, x, y, proudM, depthM, high ? 8 : 4);
  add('grille', 'trim', grilleSlab(grilleX, [grilleBottomM, grilleTopM], 0.004, 0.04));
  const barInsetM = 0.012;
  const grilleBars = high ? FIT.grilleBars : FIT.grilleBars - 2;
  add(
    'grille:bars',
    'chrome',
    merged([
      ...Array.from({ length: grilleBars }, (_, index) => {
        const yM = grilleBottomM + ((index + 1) * grilleHeightM) / (grilleBars + 1);
        return grilleSlab(
          [grilleX[0] + barInsetM, grilleX[1] - barInsetM],
          [yM - 0.004, yM + 0.004],
          0.009,
          0.01,
        );
      }),
      // 外框：上下兩條橫的、左右兩條直的。
      grilleSlab(grilleX, [grilleTopM - 0.007, grilleTopM], 0.011, 0.012),
      grilleSlab(grilleX, [grilleBottomM, grilleBottomM + 0.007], 0.011, 0.012),
      ...[-1, 1].map((side) =>
        createFaceSlab(
          true,
          FIT.headlampCenterYM,
          [side * (FIT.grilleHalfWidthM - 0.007), side * FIT.grilleHalfWidthM],
          [grilleBottomM + 0.007, grilleTopM - 0.007],
          0.011,
          0.012,
          1,
        ),
      ),
    ]),
  );
  const garnishZM = bodyEndFaceZM(false, FIT.lampInnerXM, FIT.taillampCenterYM);
  add(
    'trunk:garnish',
    'chrome',
    box(
      [2 * FIT.lampInnerXM - 0.02, 0.016, 0.014],
      [0, FIT.taillampCenterYM + FIT.lampHeightM / 2 - 0.012, garnishZM],
    ),
  );
  add('trim:beltline', 'chrome', createBeltline(high ? 14 : 7));
  const sunroof = high ? createSunroof(8, 4) : createSunroof(4, 2);
  add('sunroof:seam', 'trim', sunroof.seam);
  add('sunroof:glass', 'glass', sunroof.glass);
  // 天線：後葉子板上一根直立的細桿，底下一個小座。
  const antenna = FIT.antennaM;
  const antennaZM = L.rearWindowBaseZM + antenna.behindRearWindow;
  const antennaYM = bodyTopHeightM(antennaZM, antenna.x);
  add(
    'antenna',
    'trim',
    merged([
      box([0.03, 0.012, 0.03], [antenna.x, antennaYM + 0.004, antennaZM]),
      createBeamGeometry(
        [antenna.x, antennaYM, antennaZM],
        [antenna.x, VEHICLE_CONFIG_SI.heightM, antennaZM],
        antenna.thickness,
      ),
    ]),
  );
  const exhaust = FIT.exhaustM;
  add(
    'exhaust:tip',
    'chrome',
    normalized(
      new CylinderGeometry(exhaust.radius, exhaust.radius, exhaust.length, 10)
        .rotateX(Math.PI / 2)
        .translate(exhaust.x, exhaust.y, HALF_LENGTH_M - exhaust.insetFromTail - exhaust.length / 2),
    ),
  );

  // 車牌：同一個號碼前後各一塊。
  const plates = createPlates(plateText(DEFAULT_SEED));
  add('plate:front', 'plate', plates.front.plate);
  add('plate:front:text', 'trim', plates.front.text);
  add('plate:rear', 'plate', plates.rear.plate);
  add('plate:rear:text', 'trim', plates.rear.text);

  const seams = createSeams();
  add('seam:doors', 'trim', seams.doors);
  add('seam:hood', 'trim', seams.hood);
  add('seam:trunk', 'trim', seams.trunk);
  add('handle:doors', 'chrome', createDoorHandles());

  const mirrors = createDoorMirrors();
  add('mirror:shells', 'paint', mirrors.shells);
  add('mirror:backs', 'trim', mirrors.backs);
  return fittings;
}

/**
 * 整台車身各材質分區的幾何：車殼曲面（carBody.ts）加上併進去的配件。
 * 每個分區的 `userData.fittings` 是併進這個分區的配件名稱。
 * @param options plateText: false = 不併入車牌上的字（背景車另外畫每台車自己的號碼）；
 *   mirrors: true = 併入車外後視鏡（背景車用；玩家車的後視鏡是另外的網格）
 */
export function createBodyGeometries(
  detail: VehicleDetail,
  options: { readonly plateText?: boolean; readonly mirrors?: boolean } = {},
): Map<BodyPart, BufferGeometry> {
  const geometries = createShellGeometries(detail);
  const byPart = new Map<BodyPart, CarFitting[]>();
  for (const fitting of createCarFittings(detail)) {
    if (options.plateText === false && PLATE_TEXT_FITTINGS.includes(fitting.name)) {
      continue;
    }
    if (options.mirrors !== true && MIRROR_FITTINGS.includes(fitting.name)) {
      continue;
    }
    byPart.set(fitting.part, [...(byPart.get(fitting.part) ?? []), fitting]);
  }
  for (const [part, fittings] of byPart) {
    const shell = geometries.get(part);
    const geometry = merged([
      ...(shell === undefined ? [] : [shell]),
      ...fittings.map((fitting) => fitting.geometry),
    ]);
    geometry.userData.fittings = fittings.map((fitting) => fitting.name);
    geometries.set(part, geometry);
  }
  return geometries;
}
