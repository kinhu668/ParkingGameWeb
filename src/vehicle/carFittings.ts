// 車身配件：保險桿與下擾流、頭燈與尾燈的燈組（燈殼 + 分格的燈罩）、水箱罩、前後車牌、門縫與引擎蓋／行李廂蓋的接縫、門把。
// 每個配件是一小塊獨立的幾何，貼著車殼曲面（carBody.ts）放；最後依材質分區併進車殼，
// 所以玩家車與背景車都是「每個材質一個網格」，配件不多花 draw call。
// 建模約定：車頭朝本地 −Z、右側 +X、地面 y = 0。車長的兩端剛好是前車牌的字與後保險桿。
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
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

type Point3 = readonly [number, number, number];

const L = BODY_LAYOUT;
const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;

/** 配件的尺寸與位置（公尺）。 */
const FIT = {
  /** 保險桿：上下緣的高度、側面往車身中段包多長、轉角半徑、邊緣倒角、比鈑金每側寬多少。 */
  bumperBottomM: 0.3,
  bumperTopM: 0.47,
  bumperWrapM: 0.4,
  bumperCornerM: 0.1,
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
  /** 燈殼邊框的寬度，以及主燈與內側小燈之間的分隔。 */
  lampRimM: 0.012,
  lampDividerM: 0.014,
  /** 內側小燈（頭燈的位置燈、尾燈的倒車燈）佔燈罩寬度的比例。 */
  lampInnerShare: 0.3,
  headlampCenterYM: 0.585,
  taillampCenterYM: 0.685,
  /** 水箱罩：半寬、橫條數。 */
  grilleHalfWidthM: 0.26,
  grilleBars: 3,
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
      curveSegments: 5,
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
 * 一端的左右兩個燈組：黑色燈殼裡嵌兩格燈罩（外側的主燈、內側的小燈），貼著端面、略凸出來。
 * @param front true = 頭燈、false = 尾燈
 */
function createLampClusters(
  front: boolean,
  centerYM: number,
): { housing: BufferGeometry; main: BufferGeometry; inner: BufferGeometry } {
  const outwardZ = front ? -1 : 1;
  const widthM = FIT.lampOuterXM - FIT.lampInnerXM;
  // 端面在燈組內緣最凸；燈殼的正面再凸出一點，後半埋進車殼裡（外緣端面往後收，燈殼的側面會露出來）。
  const faceZM = bodyEndFaceZM(front, FIT.lampInnerXM, centerYM) + outwardZ * FIT.lampProudM;
  const lensWidthM = widthM - 2 * FIT.lampRimM - FIT.lampDividerM;
  const innerWidthM = lensWidthM * FIT.lampInnerShare;
  const mainWidthM = lensWidthM - innerWidthM;
  const lensHeightM = FIT.lampHeightM - 2 * FIT.lampRimM;
  const lensDepthM = 0.02;
  const lensZM = faceZM + outwardZ * (FIT.lensProudM - lensDepthM / 2);

  const housing: BufferGeometry[] = [];
  const main: BufferGeometry[] = [];
  const inner: BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    housing.push(
      box(
        [widthM, FIT.lampHeightM, FIT.lampDepthM],
        [
          (side * (FIT.lampInnerXM + FIT.lampOuterXM)) / 2,
          centerYM,
          faceZM - (outwardZ * FIT.lampDepthM) / 2,
        ],
      ),
    );
    const innerCenterXM = FIT.lampInnerXM + FIT.lampRimM + innerWidthM / 2;
    const mainCenterXM = FIT.lampOuterXM - FIT.lampRimM - mainWidthM / 2;
    inner.push(box([innerWidthM, lensHeightM, lensDepthM], [side * innerCenterXM, centerYM, lensZM]));
    main.push(box([mainWidthM, lensHeightM, lensDepthM], [side * mainCenterXM, centerYM, lensZM]));
  }
  return { housing: merged(housing), main: merged(main), inner: merged(inner) };
}

/** 門縫、引擎蓋與行李廂蓋的接縫：貼著車殼的細黑線。 */
function createSeams(): { doors: BufferGeometry; hood: BufferGeometry; trunk: BufferGeometry } {
  const widthM = FIT.seamWidthM;
  const frontDoorZM = L.windshieldBaseZM + FIT.frontDoorBehindCowlM;
  const rearDoorZM =
    VEHICLE_CONFIG_SI.wheelbaseM / 2 - L.archRadiusM - FIT.rearDoorAheadOfArchM;
  const steps = (fromM: number, toM: number, count: number): number[] =>
    Array.from({ length: count + 1 }, (_, index) => fromM + ((toM - fromM) * index) / count);

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

/** 建立全部的配件（還沒併進車殼）。每次呼叫都是新的幾何。 */
export function createCarFittings(): CarFitting[] {
  const fittings: CarFitting[] = [];
  const add = (name: string, part: BodyPart, geometry: BufferGeometry): void => {
    fittings.push({ name, part, geometry });
  };

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

  // 燈組：頭燈（主燈 + 位置燈都是頭燈的光色）、尾燈（主燈是尾燈、內側是倒車燈）。
  const headlamps = createLampClusters(true, FIT.headlampCenterYM);
  add('headlamp:housing', 'trim', headlamps.housing);
  add('headlamp:lens', 'headlight', merged([headlamps.main, headlamps.inner]));
  const taillamps = createLampClusters(false, FIT.taillampCenterYM);
  add('taillamp:housing', 'trim', taillamps.housing);
  add('taillamp:lens', 'taillight', taillamps.main);
  add('reverselamp:lens', 'reverseLight', taillamps.inner);

  // 水箱罩：兩個頭燈之間的黑色格柵與鍍鉻橫條；車尾對應的位置是車牌上方的一條鍍鉻飾條。
  const grilleZM = bodyEndFaceZM(true, FIT.grilleHalfWidthM, FIT.headlampCenterYM);
  const grilleHeightM = FIT.lampHeightM - 0.02;
  add(
    'grille',
    'trim',
    box(
      [2 * FIT.grilleHalfWidthM, grilleHeightM, 0.04],
      [0, FIT.headlampCenterYM, grilleZM + 0.02 - 0.006],
    ),
  );
  add(
    'grille:bars',
    'chrome',
    merged(
      Array.from({ length: FIT.grilleBars }, (_, index) =>
        box(
          [2 * FIT.grilleHalfWidthM - 0.02, 0.012, 0.012],
          [
            0,
            FIT.headlampCenterYM + ((index - (FIT.grilleBars - 1) / 2) * grilleHeightM) / FIT.grilleBars,
            grilleZM - 0.006,
          ],
        ),
      ),
    ),
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

  // 車牌：同一個號碼前後各一塊。前車牌的字就是車長的最前端。
  const text = plateText(DEFAULT_SEED);
  const frontPlate = createPlate(
    text,
    FIT.frontPlateCenterYM,
    -HALF_LENGTH_M + FIT.plateTextProudM,
    -1,
  );
  add('plate:front', 'plate', frontPlate.plate);
  add('plate:front:text', 'trim', frontPlate.text);
  const rearPlate = createPlate(
    text,
    FIT.rearPlateCenterYM,
    bodyEndFaceZM(false, 0, FIT.rearPlateCenterYM) + FIT.plateThicknessM,
    1,
  );
  add('plate:rear', 'plate', rearPlate.plate);
  add('plate:rear:text', 'trim', rearPlate.text);

  const seams = createSeams();
  add('seam:doors', 'trim', seams.doors);
  add('seam:hood', 'trim', seams.hood);
  add('seam:trunk', 'trim', seams.trunk);
  add('handle:doors', 'chrome', createDoorHandles());
  return fittings;
}

/**
 * 整台車身各材質分區的幾何：車殼曲面（carBody.ts）加上併進去的配件。
 * 每個分區的 `userData.fittings` 是併進這個分區的配件名稱。
 */
export function createBodyGeometries(detail: VehicleDetail): Map<BodyPart, BufferGeometry> {
  const geometries = createShellGeometries(detail);
  const byPart = new Map<BodyPart, CarFitting[]>();
  for (const fitting of createCarFittings()) {
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
