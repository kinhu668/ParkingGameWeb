// 小型拉力房車（停放用）：三廂短車身、圓潤的車頭與大橢圓頭燈、引擎蓋進氣口、行李廂上兩根支柱撐起的高尾翼、
// 金色多輻輪圈、前保險桿上的圓霧燈。車殼由 carShell.ts 放樣，配件用 carModelKit.ts 貼上去。
import type { BufferGeometry } from 'three';
import type { VehicleDetail } from '../render/quality';
import { box, createWrapBar, turnedToRear } from './carFittings';
import {
  assembleCarModel,
  bothSides,
  createDoorMirrors,
  createExhaustTip,
  createLidSeams,
  createLoft,
  createQuadPatch,
  createRoundPatch,
  createScoop,
  createShellArchLips,
  createSideSeam,
  createWingBlade,
  onFace,
  onSide,
  PLATE_TEXT_PROUD_M,
  PLATE_THICKNESS_M,
  rectRing,
} from './carModelKit';
import { carModelDimsM } from './carModels';
import type { CarModelPart, CarModelParts } from './carModelParts';
import { createCarShell, spline, type Knots } from './carShell';

const DIMS = carModelDimsM('rally');
/** 車頭、車尾的 z，前後軸的 z。 */
const F = -DIMS.lengthM / 2;
const R = DIMS.lengthM / 2;
const AXLE = DIMS.wheelbaseM / 2;
const WHEEL = { radiusM: 0.315, widthM: 0.215, rimRadiusM: 0.22 };
/** 金色的十輻輪圈。 */
const RIM = { spokes: 10, spokeWidth: 0.5, color: 0xc49a32 };
/** 鈑金半寬（車門處）與葉子板再鼓出的量；後視鏡補滿剩下的車寬。 */
const HALF_WIDTH_M = 0.8;
const FLARE_M = 0.018;
const CROWN_M = 0.035;
/** 車頂最高點：比車高（尾翼的頂端）低一點，整台車最高的是尾翼。 */
const ROOF_TOP_M = DIMS.heightM - 0.04;
/** 前擋下緣、前擋上緣、車頂最高點、後擋上緣、後擋下緣的 z。 */
const COWL_Z = -0.83;
const HEADER_Z = -0.1;
const ROOF_PEAK_Z = 0.3;
const REAR_HEADER_Z = 0.95;
const REAR_BASE_Z = 1.55;

const BELT: Knots = [
  [F, 0.66],
  [F + 0.35, 0.7],
  [COWL_Z, 0.92],
  [ROOF_PEAK_Z, 0.95],
  [REAR_BASE_Z, 0.99],
  [R - 0.3, 1],
  [R, 0.985],
];
const beltAt = spline(BELT);

/** 一個輪拱前後的葉子板外擴。 */
function flareKnots(axleZM: number): Knots {
  return [
    [axleZM - 0.56, 0],
    [axleZM - 0.3, FLARE_M],
    [axleZM + 0.3, FLARE_M],
    [axleZM + 0.56, 0],
  ];
}

export function createRallyParts(detail: VehicleDetail): CarModelParts {
  const shell = createCarShell({
    lengthM: DIMS.lengthM,
    wheelbaseM: DIMS.wheelbaseM,
    wheelRadiusM: WHEEL.radiusM,
    archGapM: 0.045,
    clearanceM: 0.17,
    halfWidth: [
      [F, 0.72],
      [F + 0.35, 0.745],
      [-AXLE, HALF_WIDTH_M],
      [AXLE, HALF_WIDTH_M],
      [R - 0.3, 0.765],
      [R, 0.74],
    ],
    flare: [...flareKnots(-AXLE), ...flareKnots(AXLE)],
    tuckM: 0.02,
    belt: BELT,
    crownM: CROWN_M,
    shoulderInsetM: 0.065,
    shoulderRoundM: 0.1,
    cabin: {
      roof: [
        [COWL_Z, beltAt(COWL_Z)],
        [HEADER_Z, ROOF_TOP_M - CROWN_M - 0.028],
        [ROOF_PEAK_Z, ROOF_TOP_M - CROWN_M],
        [REAR_HEADER_Z, ROOF_TOP_M - CROWN_M - 0.043],
        [REAR_BASE_Z, beltAt(REAR_BASE_Z)],
      ],
      headerZM: HEADER_Z,
      rearHeaderZM: REAR_HEADER_Z,
      sideGlassEndZM: 1.13,
      pillarsZM: [ROOF_PEAK_Z],
      pillarHalfWidthM: 0.04,
      tumblehomeM: 0.13,
      roofRailM: 0.045,
    },
    nose: { insetM: 0.012, depthM: 0.34, exponent: 2.6, leanTopM: 0.14, leanBottomM: 0.02, squashTop: 0.8, squashBottom: 0.35 },
    tail: { insetM: 0.012, depthM: 0.28, exponent: 3, leanTopM: 0.05, leanBottomM: 0.03, squashTop: 0.8, squashBottom: 0.4 },
  });
  const nose = onFace(shell, true);
  const tail = onFace(shell, false);
  const side = onSide(shell);
  const pieces: [CarModelPart, BufferGeometry][] = [];
  const add = (part: CarModelPart, ...geometries: BufferGeometry[]): void => {
    pieces.push(...geometries.map((geometry): [CarModelPart, BufferGeometry] => [part, geometry]));
  };

  // 車頭：包到車角的大橢圓頭燈（外側一小塊琥珀色方向燈）、兩燈之間的細水箱罩、保險桿下方的大進氣口與一對圓霧燈、下唇。
  add('trim', bothSides(createRoundPatch(nose, [0.5, 0.6], [0.21, 0.098], 0.003, 14)));
  add('chrome', bothSides(createRoundPatch(nose, [0.5, 0.6], [0.195, 0.084], 0.008, 14)));
  add(
    'headlight',
    bothSides(createRoundPatch(nose, [0.52, 0.6], [0.062, 0.062], 0.014, 10)),
    bothSides(createRoundPatch(nose, [0.395, 0.595], [0.045, 0.045], 0.014, 10)),
  );
  add('indicator', bothSides(createRoundPatch(nose, [0.635, 0.6], [0.035, 0.05], 0.014, 8)));
  add(
    'trim',
    createQuadPatch(nose, [[-0.27, 0.565], [0.27, 0.565], [0.27, 0.635], [-0.27, 0.635]], 0.004, 6),
    createQuadPatch(nose, [[-0.4, 0.235], [0.4, 0.235], [0.44, 0.365], [-0.44, 0.365]], 0.004, 8),
    bothSides(createRoundPatch(nose, [0.585, 0.305], [0.075, 0.075], 0.004, 10)),
    createWrapBar(0.71, F + 0.03, 0.4, 0.14, 0.215),
  );
  add('headlight', bothSides(createRoundPatch(nose, [0.585, 0.305], [0.058, 0.058], 0.01, 10)));

  // 引擎蓋：中後段的進氣口、一圈接縫。
  const scoop = createScoop(shell, { halfWidthM: 0.27, frontZM: -1.3, rearZM: -0.93, heightM: 0.075 });
  add('paint', scoop.skin);
  add('trim', scoop.mouth, createLidSeams(shell, shell.noseStartZM + 0.04, COWL_Z - 0.04, 0.03));

  // 側面：門縫、門把、葉子板上的側方向燈、輪拱唇、後視鏡。
  const rearDoorZ = AXLE - shell.archRadiusM - 0.03;
  add(
    'trim',
    ...[COWL_Z + 0.12, ROOF_PEAK_Z, rearDoorZ].map((zM) => bothSides(createSideSeam(shell, zM))),
  );
  add(
    'trim',
    ...[ROOF_PEAK_Z - 0.14, rearDoorZ - 0.14].map((zM) => {
      const yM = beltAt(zM) - 0.1;
      return bothSides(box([0.02, 0.026, 0.12], [shell.sideXM(zM, yM), yM, zM]));
    }),
  );
  add('indicator', bothSides(createQuadPatch(side, [[-0.86, 0.7], [-0.78, 0.7], [-0.78, 0.73], [-0.86, 0.73]], 0.004)));
  add('paint', createShellArchLips(shell, WHEEL, DIMS.wheelbaseM, 0.006, 0.02));
  const mirrors = createDoorMirrors(DIMS, beltAt(COWL_Z + 0.3) + 0.09, COWL_Z + 0.3);
  add('paint', mirrors.shells);
  add('trim', mirrors.backs);

  // 車尾：兩側的尾燈（紅色燈罩裡一顆圓的倒車燈、一顆圓的方向燈）、保險桿、下擾流、排氣尾管、行李廂蓋的接縫。
  add('trim', bothSides(createQuadPatch(tail, [[0.34, 0.74], [0.73, 0.74], [0.73, 0.92], [0.34, 0.92]], 0.004, 3)));
  add('taillight', bothSides(createQuadPatch(tail, [[0.36, 0.76], [0.71, 0.76], [0.71, 0.9], [0.36, 0.9]], 0.009, 3)));
  add('reverseLight', bothSides(createRoundPatch(tail, [0.45, 0.83], [0.045, 0.045], 0.013, 10)));
  add('indicator', bothSides(createRoundPatch(tail, [0.62, 0.83], [0.045, 0.045], 0.013, 10)));
  add('paint', turnedToRear(createWrapBar(HALF_WIDTH_M + 0.006, F, 0.42, 0.31, 0.56)));
  add('trim', turnedToRear(createWrapBar(HALF_WIDTH_M - 0.02, F + 0.02, 0.38, 0.2, 0.32)));
  add('chrome', createExhaustTip(-0.46, 0.25, R - 0.012, 0.038));
  add('trim', createLidSeams(shell, REAR_BASE_Z + 0.04, shell.tailStartZM - 0.02, 0.03));

  // 高尾翼：行李廂蓋兩側各一根往上收窄的支柱，撐起一片幾乎與車同寬的翼片。
  const wingZ = R - 0.24;
  add(
    'paint',
    createWingBlade(0.72, 0.25, 0.04, DIMS.heightM, wingZ, -0.08),
    bothSides(
      createLoft([
        rectRing([0.6, shell.topYM(wingZ, 0.6) - 0.01, wingZ - 0.02], 0.05, 0.26),
        rectRing([0.62, DIMS.heightM - 0.03, wingZ], 0.035, 0.16),
      ]),
    ),
  );

  const rearPlateY = 0.83;
  return assembleCarModel(
    detail,
    DIMS,
    shell,
    pieces,
    WHEEL,
    [HALF_WIDTH_M + FLARE_M - 0.012 - WHEEL.widthM / 2, HALF_WIDTH_M + FLARE_M - 0.012 - WHEEL.widthM / 2],
    RIM,
    {
      front: { yM: 0.465, zM: F + PLATE_TEXT_PROUD_M },
      rear: { yM: rearPlateY, zM: shell.endZM(false, 0, rearPlateY) + PLATE_THICKNESS_M },
    },
  );
}
