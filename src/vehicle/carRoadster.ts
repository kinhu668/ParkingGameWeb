// 小型雙座敞篷跑車（停放用）：低矮圓潤的車身、長引擎蓋短車尾、敞開的座艙（兩張座椅、中央鞍座、儀表台）、
// 前擋玻璃與黑色的框、座椅後方一對防滾籠、橢圓頭燈與圓尾燈、銀色五輻輪圈。
// 車殼由 carShell.ts 放樣（沒有車艙、頂面開一個座艙口），配件用 carModelKit.ts 貼上去。
import type { BufferGeometry } from 'three';
import type { VehicleDetail } from '../render/quality';
import { box, createWrapBar, merged, polyline, steps, turnedToRear } from './carFittings';
import {
  assembleCarModel,
  bothSides,
  createDoorMirrors,
  createExhaustTip,
  createLidSeams,
  createLoft,
  createQuadPatch,
  createRoundPatch,
  createShellArchLips,
  createSideSeam,
  onFace,
  onSide,
  PLATE_TEXT_PROUD_M,
  PLATE_THICKNESS_M,
  rectRing,
} from './carModelKit';
import { carModelDimsM } from './carModels';
import type { CarModelPart, CarModelParts } from './carModelParts';
import { COCKPIT_EDGE_T, createCarShell, spline, type CarShell, type Knots } from './carShell';
import { FacetBuilder, type Point3 } from './facetBuilder';

const DIMS = carModelDimsM('roadster');
/** 車頭、車尾的 z，前後軸的 z。 */
const F = -DIMS.lengthM / 2;
const R = DIMS.lengthM / 2;
const AXLE = DIMS.wheelbaseM / 2;
const WHEEL = { radiusM: 0.305, widthM: 0.2, rimRadiusM: 0.215 };
/** 銀色的五輻輪圈。 */
const RIM = { spokes: 5, spokeWidth: 1, color: 0xc8ccd0 };
/** 鈑金半寬（車門處）與葉子板再鼓出的量；後視鏡補滿剩下的車寬。 */
const HALF_WIDTH_M = 0.8;
const FLARE_M = 0.022;
const CROWN_M = 0.035;
/** 前擋下緣、前擋上緣的 z；座艙口的前後緣；防滾籠的 z。 */
const COWL_Z = -0.52;
const HEADER_Z = -0.06;
const COCKPIT_Z = [-0.3, 0.84] as const;
const HOOP_Z = 0.93;
/** 座艙地板的高度、座椅中線的 x。 */
const FLOOR_Y = 0.3;
const SEAT_X = 0.31;

const BELT: Knots = [
  [F, 0.6],
  [F + 0.35, 0.665],
  [COWL_Z, 0.78],
  [0.3, 0.8],
  [HOOP_Z, 0.84],
  [R - 0.3, 0.82],
  [R, 0.78],
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

/** 座艙的內襯：地板與四面往內看的牆，牆的上緣接到座艙口的邊。 */
function createCockpitTub(shell: CarShell): BufferGeometry {
  const edgeXM = (zM: number): number => COCKPIT_EDGE_T * shell.topEdgeXM(zM);
  const [frontZM, rearZM] = COCKPIT_Z;
  const wall = (points: readonly (readonly [number, number])[]): Point3[][] => [
    points.map(([xM, zM]): Point3 => [xM, shell.topYM(zM, xM), zM]),
    points.map(([xM, zM]): Point3 => [xM, FLOOR_Y, zM]),
  ];
  const zs = steps(frontZM, rearZM, 4);
  const across = (zM: number): [number, number][] =>
    steps(-edgeXM(zM), edgeXM(zM), 4).map((xM) => [xM, zM]);
  const floorXM = Math.max(edgeXM(frontZM), edgeXM(rearZM));
  return new FacetBuilder()
    .grid(wall(zs.map((zM) => [edgeXM(zM), zM])), [-1, 0, 0])
    .grid(wall(zs.map((zM) => [-edgeXM(zM), zM])), [1, 0, 0])
    .grid(wall(across(frontZM)), [0, 0, 1])
    .grid(wall(across(rearZM)), [0, 0, -1])
    .grid(
      [
        [
          [-floorXM, FLOOR_Y, frontZM],
          [floorXM, FLOOR_Y, frontZM],
        ],
        [
          [-floorXM, FLOOR_Y, rearZM],
          [floorXM, FLOOR_Y, rearZM],
        ],
      ],
      [0, 1, 0],
    )
    .build();
}

/** 右側的座椅：坐墊，加上往後仰、往上收成頭枕的椅背。 */
function createSeat(): BufferGeometry {
  return merged([
    box([0.44, 0.14, 0.46], [SEAT_X, FLOOR_Y + 0.07, 0.3]),
    createLoft([
      rectRing([SEAT_X, FLOOR_Y + 0.08, 0.55], 0.44, 0.13),
      rectRing([SEAT_X, 0.87, 0.68], 0.42, 0.11),
      rectRing([SEAT_X, 0.94, 0.7], 0.26, 0.09),
      rectRing([SEAT_X, 1.08, 0.73], 0.24, 0.08),
    ]),
  ]);
}

/** 右側的防滾籠：行李廂蓋前緣立起來的一個拱。 */
function createRollHoop(shell: CarShell): BufferGeometry {
  const baseYM = shell.topYM(HOOP_Z, SEAT_X) - 0.03;
  return merged(
    polyline(
      [
        [SEAT_X - 0.17, baseYM, HOOP_Z],
        [SEAT_X - 0.17, 1.09, HOOP_Z],
        [SEAT_X - 0.11, 1.15, HOOP_Z],
        [SEAT_X + 0.11, 1.15, HOOP_Z],
        [SEAT_X + 0.17, 1.09, HOOP_Z],
        [SEAT_X + 0.17, baseYM, HOOP_Z],
      ],
      0.036,
    ),
  );
}

/**
 * 前擋：往後仰的一片玻璃，兩根 A 柱與上面的橫框。橫框的頂端就是車高。
 * @returns glass：玻璃；frame：黑色的框
 */
function createWindscreen(shell: CarShell): { glass: BufferGeometry; frame: BufferGeometry } {
  const baseXM = shell.topEdgeXM(COWL_Z) - 0.02;
  const topXM = baseXM - 0.08;
  const baseYM = shell.topYM(COWL_Z, baseXM) - 0.03;
  const frameM = 0.04;
  return {
    glass: createLoft([
      rectRing([0, baseYM, COWL_Z], 2 * baseXM, 0.012),
      rectRing([0, DIMS.heightM - frameM, HEADER_Z], 2 * topXM, 0.012),
    ]),
    frame: merged([
      bothSides(
        createLoft([
          rectRing([baseXM, baseYM, COWL_Z], frameM, 0.05),
          rectRing([topXM, DIMS.heightM, HEADER_Z], frameM, 0.05),
        ]),
      ),
      box([2 * topXM, frameM, 0.05], [0, DIMS.heightM - frameM / 2, HEADER_Z]),
    ]),
  };
}

export function createRoadsterParts(detail: VehicleDetail): CarModelParts {
  const shell = createCarShell({
    lengthM: DIMS.lengthM,
    wheelbaseM: DIMS.wheelbaseM,
    wheelRadiusM: WHEEL.radiusM,
    archGapM: 0.04,
    clearanceM: 0.15,
    halfWidth: [
      [F, 0.68],
      [F + 0.35, 0.74],
      [-AXLE, 0.795],
      [AXLE, HALF_WIDTH_M],
      [R - 0.3, 0.76],
      [R, 0.72],
    ],
    flare: [...flareKnots(-AXLE), ...flareKnots(AXLE)],
    tuckM: 0.025,
    belt: BELT,
    crownM: CROWN_M,
    shoulderInsetM: 0.075,
    shoulderRoundM: 0.13,
    cockpitZM: COCKPIT_Z,
    nose: { insetM: 0.012, depthM: 0.4, exponent: 2.3, leanTopM: 0.16, leanBottomM: 0.03, squashTop: 0.85, squashBottom: 0.4 },
    tail: { insetM: 0.012, depthM: 0.32, exponent: 2.6, leanTopM: 0.07, leanBottomM: 0.04, squashTop: 0.8, squashBottom: 0.45 },
  });
  const nose = onFace(shell, true);
  const tail = onFace(shell, false);
  const side = onSide(shell);
  const pieces: [CarModelPart, BufferGeometry][] = [];
  const add = (part: CarModelPart, ...geometries: BufferGeometry[]): void => {
    pieces.push(...geometries.map((geometry): [CarModelPart, BufferGeometry] => [part, geometry]));
  };

  // 車頭：車角上往後掃的橢圓頭燈（裡面兩顆圓燈、外側琥珀色方向燈）、下方寬的進氣口與兩側的小霧燈、下唇。
  add('trim', bothSides(createRoundPatch(nose, [0.5, 0.53], [0.2, 0.08], 0.003, 14)));
  add('chrome', bothSides(createRoundPatch(nose, [0.5, 0.53], [0.185, 0.067], 0.008, 14)));
  add(
    'headlight',
    bothSides(createRoundPatch(nose, [0.5, 0.53], [0.052, 0.052], 0.014, 10)),
    bothSides(createRoundPatch(nose, [0.385, 0.525], [0.04, 0.04], 0.014, 10)),
  );
  add('indicator', bothSides(createRoundPatch(nose, [0.62, 0.535], [0.04, 0.045], 0.014, 8)));
  add(
    'trim',
    createQuadPatch(nose, [[-0.36, 0.22], [0.36, 0.22], [0.4, 0.33], [-0.4, 0.33]], 0.012, 12, 2),
    createWrapBar(0.66, F + 0.03, 0.36, 0.13, 0.19),
  );
  add('indicator', bothSides(createQuadPatch(nose, [[0.5, 0.23], [0.6, 0.23], [0.6, 0.3], [0.5, 0.3]], 0.006, 2)));

  // 引擎蓋與行李廂蓋的接縫。
  add(
    'trim',
    createLidSeams(shell, shell.noseStartZM + 0.04, COWL_Z - 0.06, 0.03),
    createLidSeams(shell, HOOP_Z + 0.12, shell.tailStartZM - 0.02, 0.03),
  );

  // 前擋、座艙（內襯、兩張座椅、中央鞍座、儀表台與方向盤柱）、防滾籠。
  const windscreen = createWindscreen(shell);
  add('glass', windscreen.glass);
  add('trim', windscreen.frame);
  add('upholstery', createCockpitTub(shell), bothSides(createSeat()));
  add(
    'trim',
    box([0.16, 0.22, COCKPIT_Z[1] - COCKPIT_Z[0]], [0, FLOOR_Y + 0.11, (COCKPIT_Z[0] + COCKPIT_Z[1]) / 2]),
    box([1.1, 0.16, 0.12], [0, beltAt(COCKPIT_Z[0]) - 0.1, COCKPIT_Z[0] + 0.06]),
    box([0.3, 0.3, 0.03], [-SEAT_X, beltAt(COCKPIT_Z[0]) - 0.1, COCKPIT_Z[0] + 0.2]),
  );
  add('chrome', bothSides(createRollHoop(shell)));

  // 側面：門縫、門把、葉子板上的側方向燈、輪拱唇、後視鏡。
  const doorRearZ = AXLE - shell.archRadiusM - 0.12;
  add('trim', ...[COWL_Z + 0.06, doorRearZ].map((zM) => bothSides(createSideSeam(shell, zM))));
  const handleY = beltAt(doorRearZ) - 0.12;
  add('paint', bothSides(box([0.02, 0.026, 0.12], [shell.sideXM(doorRearZ - 0.14, handleY), handleY, doorRearZ - 0.14])));
  add('indicator', bothSides(createQuadPatch(side, [[-0.8, 0.6], [-0.72, 0.6], [-0.72, 0.63], [-0.8, 0.63]], 0.004)));
  add('paint', createShellArchLips(shell, WHEEL, DIMS.wheelbaseM, 0.006, 0.02));
  const mirrors = createDoorMirrors(DIMS, beltAt(COWL_Z + 0.2) + 0.07, COWL_Z + 0.2);
  add('paint', mirrors.shells);
  add('trim', mirrors.backs);

  // 車尾：兩側橢圓的尾燈座裡各一顆圓的紅燈、圓的方向燈與小的倒車燈，保險桿、下擾流、雙排氣尾管。
  add('trim', bothSides(createRoundPatch(tail, [0.5, 0.67], [0.2, 0.075], 0.004, 14)));
  add('taillight', bothSides(createRoundPatch(tail, [0.57, 0.67], [0.06, 0.06], 0.01, 10)));
  add('indicator', bothSides(createRoundPatch(tail, [0.44, 0.67], [0.05, 0.05], 0.01, 10)));
  add('reverseLight', bothSides(createRoundPatch(tail, [0.35, 0.67], [0.028, 0.028], 0.01, 8)));
  add('paint', turnedToRear(createWrapBar(0.78, F, 0.36, 0.3, 0.5)));
  add('trim', turnedToRear(createWrapBar(0.74, F + 0.02, 0.32, 0.19, 0.3)));
  add('chrome', bothSides(createExhaustTip(0.42, 0.24, R - 0.012, 0.035)));

  const frontPlateY = 0.415;
  const rearPlateY = 0.67;
  return assembleCarModel(
    detail,
    DIMS,
    shell,
    pieces,
    WHEEL,
    [0.795 + FLARE_M - 0.012 - WHEEL.widthM / 2, HALF_WIDTH_M + FLARE_M - 0.012 - WHEEL.widthM / 2],
    RIM,
    {
      front: { yM: frontPlateY, zM: F + PLATE_TEXT_PROUD_M },
      rear: { yM: rearPlateY, zM: shell.endZM(false, 0, rearPlateY) + PLATE_THICKNESS_M },
    },
  );
}
