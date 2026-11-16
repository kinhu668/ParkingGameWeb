// 寬體跑房車（停放用）：低趴的三廂車身、鼓得快跟後視鏡一樣寬的葉子板、整片黑的大嘴水箱罩與前下擾流板、
// 引擎蓋散熱孔、黑色側裙、行李廂上的尾翼（帶端板）、黑色多輻輪圈、後下擾流鰭片與左右各一支排氣尾管。
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
  createLoft,
  createQuadPatch,
  createShellArchLips,
  createSideSeam,
  createWingBlade,
  onFace,
  onSide,
  onTop,
  PLATE_THICKNESS_M,
  rectRing,
} from './carModelKit';
import { carModelDimsM } from './carModels';
import type { CarModelPart, CarModelParts } from './carModelParts';
import { createCarShell, spline, type Knots } from './carShell';

const DIMS = carModelDimsM('widebody');
/** 車頭、車尾的 z，前後軸的 z。 */
const F = -DIMS.lengthM / 2;
const R = DIMS.lengthM / 2;
const AXLE = DIMS.wheelbaseM / 2;
/** 扁平比低的寬胎。 */
const WHEEL = { radiusM: 0.335, widthM: 0.265, rimRadiusM: 0.25 };
/** 黑色的細十輻輪圈。 */
const RIM = { spokes: 10, spokeWidth: 0.42, color: 0x141414 };
/** 鈑金半寬（車門處）與葉子板再鼓出的量；後視鏡補滿剩下的車寬。 */
const HALF_WIDTH_M = 0.815;
const FLARE_M = 0.09;
const CROWN_M = 0.03;
/** 車頂最高點：比車高（尾翼的頂端）低一點，整台車最高的是尾翼。 */
const ROOF_TOP_M = DIMS.heightM - 0.03;
/** 前擋下緣、前擋上緣、車頂最高點、後擋上緣、後擋下緣的 z。 */
const COWL_Z = -0.82;
const HEADER_Z = -0.02;
const ROOF_PEAK_Z = 0.36;
const REAR_HEADER_Z = 1.02;
const REAR_BASE_Z = 1.64;

const BELT: Knots = [
  [F, 0.6],
  [F + 0.35, 0.66],
  [COWL_Z, 0.87],
  [ROOF_PEAK_Z, 0.9],
  [REAR_BASE_Z, 0.95],
  [R - 0.3, 0.96],
  [R, 0.945],
];
const beltAt = spline(BELT);

/** 一個輪拱前後的葉子板外擴：靠車門那一側是一階陡的（外掛寬體的樣子），靠車頭、車尾那一側緩緩收回保險桿。 */
function flareKnots(axleZM: number): Knots {
  const toEnd = Math.sign(axleZM);
  const knots: [number, number][] = [
    [axleZM - toEnd * 0.54, 0],
    [axleZM - toEnd * 0.42, FLARE_M],
    [axleZM + toEnd * 0.34, FLARE_M],
    [axleZM + toEnd * 0.66, 0],
  ];
  return toEnd > 0 ? knots : knots.reverse();
}

export function createWidebodyParts(detail: VehicleDetail): CarModelParts {
  const shell = createCarShell({
    lengthM: DIMS.lengthM,
    wheelbaseM: DIMS.wheelbaseM,
    wheelRadiusM: WHEEL.radiusM,
    archGapM: 0.035,
    clearanceM: 0.13,
    halfWidth: [
      [F, 0.74],
      [F + 0.35, 0.775],
      [-AXLE, HALF_WIDTH_M],
      [AXLE, HALF_WIDTH_M],
      [R - 0.3, 0.785],
      [R, 0.755],
    ],
    flare: [...flareKnots(-AXLE), ...flareKnots(AXLE)],
    tuckM: 0.025,
    belt: BELT,
    crownM: CROWN_M,
    shoulderInsetM: 0.07,
    shoulderRoundM: 0.09,
    cabin: {
      roof: [
        [COWL_Z, beltAt(COWL_Z)],
        [HEADER_Z, ROOF_TOP_M - CROWN_M - 0.03],
        [ROOF_PEAK_Z, ROOF_TOP_M - CROWN_M],
        [REAR_HEADER_Z, ROOF_TOP_M - CROWN_M - 0.045],
        [REAR_BASE_Z, beltAt(REAR_BASE_Z)],
      ],
      headerZM: HEADER_Z,
      rearHeaderZM: REAR_HEADER_Z,
      sideGlassEndZM: 1.2,
      pillarsZM: [ROOF_PEAK_Z],
      pillarHalfWidthM: 0.04,
      tumblehomeM: 0.14,
      roofRailM: 0.045,
    },
    nose: { insetM: 0.02, depthM: 0.26, exponent: 3.6, leanTopM: 0.14, leanBottomM: 0.01, squashTop: 0.75, squashBottom: 0.2 },
    tail: { insetM: 0.012, depthM: 0.26, exponent: 3.2, leanTopM: 0.05, leanBottomM: 0.03, squashTop: 0.8, squashBottom: 0.35 },
  });
  const nose = onFace(shell, true);
  const tail = onFace(shell, false);
  const side = onSide(shell);
  const top = onTop(shell);
  const pieces: [CarModelPart, BufferGeometry][] = [];
  const add = (part: CarModelPart, ...geometries: BufferGeometry[]): void => {
    pieces.push(...geometries.map((geometry): [CarModelPart, BufferGeometry] => [part, geometry]));
  };

  // 車頭：整片黑的梯形大嘴（上寬下窄）、兩側的黑色下進氣口、往車角上挑的黑色細長燈殼（裡面一條細燈、外端一小段方向燈）、
  // 兩層的前下擾流板（中間一層貼著車頭、外面一層退後，跟著收圓的車角）。
  add(
    'trim',
    createQuadPatch(nose, [[-0.36, 0.15], [0.36, 0.15], [0.45, 0.575], [-0.45, 0.575]], 0.007, 8, 6),
    bothSides(createQuadPatch(nose, [[0.47, 0.17], [0.7, 0.19], [0.7, 0.34], [0.5, 0.34]], 0.007, 4, 2)),
    bothSides(createQuadPatch(nose, [[0.46, 0.49], [0.73, 0.54], [0.73, 0.6], [0.46, 0.555]], 0.007, 5)),
    createWrapBar(0.56, F, 0.3, 0.09, 0.122),
    createWrapBar(0.81, F + 0.1, 0.32, 0.09, 0.122),
  );
  add('headlight', bothSides(createQuadPatch(nose, [[0.48, 0.52], [0.6, 0.542], [0.6, 0.566], [0.48, 0.544]], 0.011, 3)));
  add('indicator', bothSides(createQuadPatch(nose, [[0.63, 0.55], [0.71, 0.562], [0.71, 0.584], [0.63, 0.572]], 0.011, 2)));

  // 引擎蓋：中間一道橫的散熱槽、兩側各一個斜的散熱孔、一圈接縫。
  add(
    'trim',
    createQuadPatch(top, [[-0.16, -1.34], [0.16, -1.34], [0.14, -1.28], [-0.14, -1.28]], 0.003, 3),
    bothSides(createQuadPatch(top, [[0.26, -1.18], [0.46, -1.1], [0.46, -1], [0.3, -1.04]], 0.003, 2)),
    createLidSeams(shell, shell.noseStartZM + 0.04, COWL_Z - 0.04, 0.03),
  );

  // 側面：門縫、門把、葉子板上的側方向燈、前葉子板後方的排氣孔、黑色側裙、輪拱唇、後視鏡。
  const rearDoorZ = AXLE - shell.archRadiusM - 0.05;
  add(
    'trim',
    ...[COWL_Z + 0.12, ROOF_PEAK_Z, rearDoorZ].map((zM) => bothSides(createSideSeam(shell, zM))),
  );
  add(
    'trim',
    ...[ROOF_PEAK_Z - 0.14, rearDoorZ - 0.3].map((zM) => {
      const yM = beltAt(zM) - 0.1;
      return bothSides(box([0.02, 0.026, 0.12], [shell.sideXM(zM, yM), yM, zM]));
    }),
  );
  add('trim', bothSides(createQuadPatch(side, [[-0.88, 0.52], [-0.8, 0.52], [-0.83, 0.64], [-0.88, 0.64]], 0.004)));
  add('indicator', bothSides(createQuadPatch(side, [[-0.9, 0.7], [-0.82, 0.7], [-0.82, 0.725], [-0.9, 0.725]], 0.004)));
  const skirtLengthM = 2 * (AXLE - shell.archRadiusM) - 0.06;
  add('trim', bothSides(box([0.07, 0.045, skirtLengthM], [HALF_WIDTH_M + 0.02, 0.125, 0])));
  // 輪拱：烤漆的外擴葉子板邊緣再壓一圈黑色的唇，讓外擴的那一階看得出來。
  add('paint', createShellArchLips(shell, WHEEL, DIMS.wheelbaseM, 0.004, 0.045));
  add('trim', createShellArchLips(shell, WHEEL, DIMS.wheelbaseM, 0.008, 0.016));
  const mirrors = createDoorMirrors(DIMS, beltAt(COWL_Z + 0.3) + 0.09, COWL_Z + 0.3);
  add('paint', mirrors.shells);
  add('trim', mirrors.backs);

  // 車尾：橫長的尾燈（紅色燈罩裡一段倒車燈、一段方向燈）、保險桿、黑色下擾流與直鰭片、左右各一支排氣尾管、行李廂蓋的接縫。
  add('trim', bothSides(createQuadPatch(tail, [[0.28, 0.72], [0.74, 0.72], [0.74, 0.87], [0.28, 0.87]], 0.004, 3)));
  add('taillight', bothSides(createQuadPatch(tail, [[0.3, 0.735], [0.72, 0.735], [0.72, 0.855], [0.3, 0.855]], 0.009, 3)));
  add('reverseLight', bothSides(createQuadPatch(tail, [[0.33, 0.765], [0.43, 0.765], [0.43, 0.825], [0.33, 0.825]], 0.013)));
  add('indicator', bothSides(createQuadPatch(tail, [[0.58, 0.765], [0.69, 0.765], [0.69, 0.825], [0.58, 0.825]], 0.013)));
  add('paint', turnedToRear(createWrapBar(0.775, F, 0.34, 0.3, 0.5)));
  add(
    'trim',
    turnedToRear(createWrapBar(0.75, F + 0.02, 0.3, 0.14, 0.31)),
    ...[-0.24, -0.08, 0.08, 0.24].map((xM) => box([0.014, 0.1, 0.2], [xM, 0.17, R - 0.1])),
  );
  add('chrome', bothSides(createExhaustTip(0.5, 0.215, R - 0.004, 0.045)));
  add('trim', createLidSeams(shell, REAR_BASE_Z + 0.04, shell.tailStartZM - 0.02, 0.03));

  // 尾翼：行李廂蓋兩側各一根黑色支柱，撐起一片比車頂略低的翼片，兩端各一塊黑色端板（端板的頂端是整台車最高的地方）。
  const wingZ = R - 0.2;
  const wingHalfSpanM = 0.78;
  const wingTopM = DIMS.heightM - 0.07;
  add('paint', createWingBlade(wingHalfSpanM, 0.24, 0.035, wingTopM, wingZ, -0.06));
  add(
    'trim',
    bothSides(
      createLoft([
        rectRing([0.5, shell.topYM(wingZ, 0.5) - 0.01, wingZ - 0.04], 0.03, 0.22),
        rectRing([0.5, wingTopM - 0.03, wingZ], 0.02, 0.14),
      ]),
    ),
    bothSides(box([0.012, 0.14, 0.3], [wingHalfSpanM, DIMS.heightM - 0.07, wingZ + 0.01])),
  );

  const frontPlateY = 0.34;
  const rearPlateY = 0.62;
  const wheelXM = HALF_WIDTH_M + FLARE_M - 0.012 - WHEEL.widthM / 2;
  return assembleCarModel(detail, DIMS, shell, pieces, WHEEL, [wheelXM, wheelXM], RIM, {
    front: { yM: frontPlateY, zM: shell.endZM(true, 0, frontPlateY) - PLATE_THICKNESS_M },
    rear: { yM: rearPlateY, zM: shell.endZM(false, 0, rearPlateY) + PLATE_THICKNESS_M },
  });
}
