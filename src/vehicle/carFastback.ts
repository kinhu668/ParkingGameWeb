// 六〇年代斜背肌肉車（停放用）：長車頭、短車尾、車頂一路斜到尾端微微上翹的鴨尾；從車頭到車尾的兩條藍色飾條、
// 鍍鉻的前後保險桿與飾條、內凹的黑色水箱罩裡的圓頭燈、後輪前的側進氣口、五輻輪圈。
// 車殼由 carShell.ts 放樣，配件用 carModelKit.ts 貼上去。
import type { BufferGeometry } from 'three';
import type { VehicleDetail } from '../render/quality';
import { box, createWrapBar, turnedToRear } from './carFittings';
import {
  assembleCarModel,
  bothSides,
  createDoorMirrors,
  createExhaustTip,
  createLidSeams,
  createQuadPatch,
  createRoundPatch,
  createScoop,
  createShellArchLips,
  createSideSeam,
  onFace,
  onSide,
  onTop,
  PLATE_TEXT_PROUD_M,
  PLATE_THICKNESS_M,
  type Place,
} from './carModelKit';
import { carModelDimsM } from './carModels';
import type { CarModelPart, CarModelParts } from './carModelParts';
import { createCarShell, spline, type Knots } from './carShell';

const DIMS = carModelDimsM('fastback');
/** 車頭、車尾的 z，前後軸的 z。 */
const F = -DIMS.lengthM / 2;
const R = DIMS.lengthM / 2;
const AXLE = DIMS.wheelbaseM / 2;
const WHEEL = { radiusM: 0.34, widthM: 0.225, rimRadiusM: 0.215 };
/** 亮銀色的粗五輻輪圈。 */
const RIM = { spokes: 5, spokeWidth: 1, color: 0xb9bdc4 };
/** 鈑金半寬（車門處）與葉子板再鼓出的量；後視鏡補滿剩下的車寬。 */
const HALF_WIDTH_M = 0.855;
const FLARE_M = 0.012;
const CROWN_M = 0.03;
/** 前擋下緣、前擋上緣、車頂最高點、後擋上緣、後擋下緣（斜背的尾端）的 z。 */
const COWL_Z = -0.55;
const HEADER_Z = 0.05;
const ROOF_PEAK_Z = 0.4;
const REAR_HEADER_Z = 0.85;
const REAR_BASE_Z = 1.78;
/** 兩條飾條各自的內緣、外緣 x。 */
const STRIPE_X = [0.045, 0.29] as const;
/** 引擎蓋中央的進氣鼓包（飾條從它上面跨過去）。 */
const SCOOP = { halfWidthM: 0.6, frontZM: -1.3, rearZM: -0.7, heightM: 0.045 };

const BELT: Knots = [
  [F, 0.7],
  [F + 0.3, 0.74],
  [COWL_Z, 0.82],
  [0.6, 0.83],
  [1.5, 0.9],
  [R - 0.3, 0.905],
  [R, 0.935],
];
const beltAt = spline(BELT);

/** 一個輪拱前後的葉子板外擴。 */
function flareKnots(axleZM: number): Knots {
  return [
    [axleZM - 0.6, 0],
    [axleZM - 0.3, FLARE_M],
    [axleZM + 0.3, FLARE_M],
    [axleZM + 0.6, 0],
  ];
}

export function createFastbackParts(detail: VehicleDetail): CarModelParts {
  const shell = createCarShell({
    lengthM: DIMS.lengthM,
    wheelbaseM: DIMS.wheelbaseM,
    wheelRadiusM: WHEEL.radiusM,
    archGapM: 0.05,
    clearanceM: 0.17,
    halfWidth: [
      [F, 0.8],
      [F + 0.3, 0.84],
      [-AXLE, HALF_WIDTH_M],
      [AXLE, HALF_WIDTH_M],
      [R - 0.3, 0.84],
      [R, 0.81],
    ],
    flare: [...flareKnots(-AXLE), ...flareKnots(AXLE)],
    tuckM: 0.025,
    belt: BELT,
    crownM: CROWN_M,
    shoulderInsetM: 0.06,
    shoulderRoundM: 0.08,
    cabin: {
      roof: [
        [COWL_Z, beltAt(COWL_Z)],
        [HEADER_Z, DIMS.heightM - CROWN_M - 0.03],
        [ROOF_PEAK_Z, DIMS.heightM - CROWN_M],
        [REAR_HEADER_Z, DIMS.heightM - CROWN_M - 0.05],
        [REAR_BASE_Z, beltAt(REAR_BASE_Z)],
      ],
      headerZM: HEADER_Z,
      rearHeaderZM: REAR_HEADER_Z,
      sideGlassEndZM: 1.2,
      pillarsZM: [0.6],
      pillarHalfWidthM: 0.03,
      tumblehomeM: 0.15,
      roofRailM: 0.04,
    },
    nose: { insetM: 0.012, depthM: 0.2, exponent: 4, leanTopM: 0, leanBottomM: 0.08, squashTop: 0.35, squashBottom: 0.3 },
    tail: { insetM: 0.012, depthM: 0.16, exponent: 4, leanTopM: 0, leanBottomM: 0.06, squashTop: 0.3, squashBottom: 0.3 },
  });
  const nose = onFace(shell, true);
  const tail = onFace(shell, false);
  const side = onSide(shell);
  const top = onTop(shell);
  const pieces: [CarModelPart, BufferGeometry][] = [];
  const add = (part: CarModelPart, ...geometries: BufferGeometry[]): void => {
    pieces.push(...geometries.map((geometry): [CarModelPart, BufferGeometry] => [part, geometry]));
  };

  // 兩條飾條：引擎蓋、車頂、行李廂蓋各一段（玻璃上不貼），車尾的端面再接一段。
  const [stripeInM, stripeOutM] = STRIPE_X;
  const topStripe = (fromZM: number, toZM: number, rows: number): BufferGeometry =>
    bothSides(
      createQuadPatch(top, [[stripeInM, fromZM], [stripeOutM, fromZM], [stripeOutM, toZM], [stripeInM, toZM]], 0.003, 2, rows),
    );
  add(
    'accent',
    topStripe(shell.noseStartZM + 0.01, COWL_Z - 0.03, 8),
    topStripe(HEADER_Z + 0.03, REAR_HEADER_Z - 0.03, 4),
    topStripe(REAR_BASE_Z + 0.03, shell.tailStartZM - 0.01, 2),
    bothSides(createQuadPatch(tail, [[stripeInM, 0.81], [stripeOutM, 0.81], [stripeOutM, 0.9], [stripeInM, 0.9]], 0.003, 2, 2)),
  );
  // 門檻上方的細飾條（兩個輪拱之間）。
  const rockerFromZ = -AXLE + shell.archRadiusM + 0.08;
  const rockerToZ = AXLE - shell.archRadiusM - 0.08;
  add('accent', bothSides(createQuadPatch(side, [[rockerFromZ, 0.3], [rockerToZ, 0.3], [rockerToZ, 0.345], [rockerFromZ, 0.345]], 0.003, 8)));
  add('chrome', bothSides(createQuadPatch(side, [[rockerFromZ, 0.215], [rockerToZ, 0.215], [rockerToZ, 0.24], [rockerFromZ, 0.24]], 0.004, 8)));

  // 車頭：內凹的黑色水箱罩（鍍鉻框）、兩側的圓頭燈、水箱罩裡一對小圓燈、鍍鉻保險桿、保險桿下的方向燈與進氣口。
  add('chrome', createQuadPatch(nose, [[-0.56, 0.49], [0.56, 0.49], [0.56, 0.67], [-0.56, 0.67]], 0.002, 8));
  add(
    'trim',
    createQuadPatch(nose, [[-0.54, 0.505], [0.54, 0.505], [0.54, 0.655], [-0.54, 0.655]], 0.005, 8),
    createQuadPatch(nose, [[-0.42, 0.21], [0.42, 0.21], [0.46, 0.33], [-0.46, 0.33]], 0.004, 8),
  );
  add(
    'chrome',
    bothSides(createRoundPatch(nose, [0.675, 0.585], [0.098, 0.098], 0.004, 14)),
    bothSides(createRoundPatch(nose, [0.2, 0.58], [0.066, 0.066], 0.008, 12)),
    createWrapBar(HALF_WIDTH_M + 0.01, F, 0.34, 0.36, 0.455),
  );
  add(
    'headlight',
    bothSides(createRoundPatch(nose, [0.675, 0.585], [0.084, 0.084], 0.012, 14)),
    bothSides(createRoundPatch(nose, [0.2, 0.58], [0.054, 0.054], 0.014, 12)),
  );
  add('indicator', bothSides(createQuadPatch(nose, [[0.56, 0.24], [0.7, 0.24], [0.7, 0.3], [0.56, 0.3]], 0.006, 2)));

  // 引擎蓋：中央的進氣鼓包（飾條貼在鼓包頂上，高度跟 createScoop 的斷面一致）、一圈接縫、兩側各一道散熱口。
  const scoop = createScoop(shell, SCOOP);
  const onScoop: Place = (xM, zM, proudM) => {
    const t = (zM - SCOOP.frontZM) / (SCOOP.rearZM - SCOOP.frontZM);
    return [xM, shell.topYM(zM, xM) + SCOOP.heightM * (1 - t) ** 1.4 + proudM, zM];
  };
  add('paint', scoop.skin);
  add(
    'accent',
    bothSides(
      createQuadPatch(
        onScoop,
        [[stripeInM, SCOOP.frontZM], [stripeOutM, SCOOP.frontZM], [stripeOutM, SCOOP.rearZM], [stripeInM, SCOOP.rearZM]],
        0.006,
        2,
        3,
      ),
    ),
  );
  add(
    'trim',
    scoop.mouth,
    createLidSeams(shell, shell.noseStartZM + 0.04, COWL_Z - 0.04, 0.03),
    bothSides(createQuadPatch(top, [[0.64, -1.2], [0.72, -1.2], [0.72, -0.9], [0.64, -0.9]], 0.004, 2, 3)),
  );

  // 側面：門縫、鍍鉻門把、後輪前的側進氣口（鍍鉻框）、輪拱唇、鍍鉻後視鏡。
  const doorRearZ = 0.6;
  add('trim', ...[COWL_Z + 0.08, doorRearZ].map((zM) => bothSides(createSideSeam(shell, zM))));
  const handleY = beltAt(doorRearZ - 0.16) - 0.09;
  add('chrome', bothSides(box([0.02, 0.026, 0.13], [shell.sideXM(doorRearZ - 0.16, handleY), handleY, doorRearZ - 0.16])));
  const scoopZ = AXLE - shell.archRadiusM - 0.07;
  add('chrome', bothSides(createQuadPatch(side, [[scoopZ - 0.2, 0.5], [scoopZ, 0.47], [scoopZ, 0.74], [scoopZ - 0.2, 0.71]], 0.003, 2, 2)));
  add('trim', bothSides(createQuadPatch(side, [[scoopZ - 0.185, 0.515], [scoopZ - 0.015, 0.49], [scoopZ - 0.015, 0.72], [scoopZ - 0.185, 0.695]], 0.006, 2, 2)));
  add('paint', createShellArchLips(shell, WHEEL, DIMS.wheelbaseM, 0.006, 0.02));
  const mirrors = createDoorMirrors(DIMS, beltAt(COWL_Z + 0.3) + 0.08, COWL_Z + 0.3);
  add('chrome', mirrors.shells);
  add('trim', mirrors.backs);

  // 車尾：黑色尾板上每側三道直立的尾燈（最外一道是方向燈）、內側的倒車燈、鍍鉻保險桿、雙排氣尾管、行李廂蓋的接縫。
  add('trim', bothSides(createQuadPatch(tail, [[0.26, 0.6], [0.74, 0.6], [0.74, 0.78], [0.26, 0.78]], 0.004, 4)));
  const lightBar = (xM: number): BufferGeometry =>
    createQuadPatch(tail, [[xM, 0.62], [xM + 0.1, 0.62], [xM + 0.1, 0.76], [xM, 0.76]], 0.01);
  add('taillight', bothSides(lightBar(0.36)), bothSides(lightBar(0.49)));
  add('indicator', bothSides(lightBar(0.62)));
  add('reverseLight', bothSides(createQuadPatch(tail, [[0.275, 0.64], [0.335, 0.64], [0.335, 0.74], [0.275, 0.74]], 0.01)));
  add(
    'chrome',
    turnedToRear(createWrapBar(HALF_WIDTH_M + 0.01, F, 0.3, 0.42, 0.515)),
    bothSides(createExhaustTip(0.5, 0.26, R - 0.012, 0.04)),
  );
  add('trim', createLidSeams(shell, REAR_BASE_Z + 0.02, shell.tailStartZM - 0.02, 0.03));

  const rearPlateY = 0.69;
  return assembleCarModel(
    detail,
    DIMS,
    shell,
    pieces,
    WHEEL,
    [HALF_WIDTH_M + FLARE_M - 0.012 - WHEEL.widthM / 2, HALF_WIDTH_M + FLARE_M - 0.012 - WHEEL.widthM / 2],
    RIM,
    {
      front: { yM: 0.408, zM: F + PLATE_TEXT_PROUD_M },
      rear: { yM: rearPlateY, zM: shell.endZM(false, 0, rearPlateY) + PLATE_THICKNESS_M },
    },
  );
}
