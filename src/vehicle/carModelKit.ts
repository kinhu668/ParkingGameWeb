// 停放用新車款共用的配件工具：貼在車殼曲面上的貼片（燈、水箱罩、進氣口、條紋）、左右鏡射、輪拱唇、接縫、
// 引擎蓋進氣口、尾翼、後視鏡、車牌、輪子，以及把車殼與配件依材質分區併起來。
// 每一款車（carRally.ts、carWidebody.ts、carFastback.ts、carRoadster.ts）只寫自己的輪廓與招牌配件。
import { CylinderGeometry, Matrix4, Vector3, type BufferGeometry } from 'three';
import type { VehicleDetail } from '../render/quality';
import {
  box,
  createArchLips,
  createDoorMirrorShellGeometry,
  createPlate,
  DOOR_MIRROR_SIZE_M,
  merged,
  normalized,
  polyline,
  steps,
} from './carFittings';
import type { CarModelDimsM } from './carModels';
import type { CarModelPart, CarModelParts, CarModelWheel } from './carModelParts';
import type { CarShell } from './carShell';
import {
  createHubcapGeometry,
  createRimGeometry,
  createTireGeometry,
  PARKED_WHEEL_SEGMENTS,
  type WheelSize,
} from './carWheel';
import { FacetBuilder, type Point3 } from './facetBuilder';

/** 接縫（門縫、引擎蓋、行李廂蓋）的線寬。 */
const SEAM_WIDTH_M = 0.007;
/** 車牌的厚度，以及字凸出牌面多少。 */
export const PLATE_THICKNESS_M = 0.008;
export const PLATE_TEXT_PROUD_M = 0.001;

/** 把曲面上的二維座標（u, v）與凸出量放到車上的一點。 */
export type Place = (u: number, v: number, proudM: number) => Point3;

/** 車頭或車尾的端面：u = x、v = y。 */
export function onFace(shell: CarShell, front: boolean): Place {
  return (xM, yM, proudM) => [xM, yM, shell.endZM(front, xM, yM) + (front ? -proudM : proudM)];
}

/** 頂面（引擎蓋、車頂、行李廂蓋）：u = x、v = z。 */
export function onTop(shell: CarShell): Place {
  return (xM, zM, proudM) => [xM, shell.topYM(zM, xM) + proudM, zM];
}

/** 右側的鈑金側面：u = z、v = y。左側用 mirrored。 */
export function onSide(shell: CarShell): Place {
  return (zM, yM, proudM) => [shell.sideXM(zM, yM) + proudM, yM, zM];
}

/** 左右鏡射的一份（x 變號，三角形的繞向跟著換回來）。 */
export function mirrored(geometry: BufferGeometry): BufferGeometry {
  const copy = normalized(geometry.clone()).applyMatrix4(new Matrix4().makeScale(-1, 1, 1));
  const index = copy.getIndex();
  for (let corner = 0; index !== null && corner < index.count; corner += 3) {
    const second = index.getX(corner + 1);
    index.setX(corner + 1, index.getX(corner + 2));
    index.setX(corner + 2, second);
  }
  return copy;
}

/** 右側做好的配件加上鏡射到左側的那一份。 */
export function bothSides(geometry: BufferGeometry): BufferGeometry {
  return merged([normalized(geometry), mirrored(geometry)]);
}

/** 貼片的邊緣往曲面裡折多深（從側面看不到貼片底下的縫）。 */
const PATCH_SKIRT_M = 0.016;

/** 貼片的正面朝哪裡：凸出量加大時這一點往哪裡移。 */
function patchOutward(place: Place, u: number, v: number): Point3 {
  const [x, y, z] = place(u, v, 0);
  const [outX, outY, outZ] = place(u, v, 1);
  return [outX - x, outY - y, outZ - z];
}

/** 貼片邊緣的一圈裙邊（從正面的邊緣折進曲面）。 */
function addSkirt(
  builder: FacetBuilder,
  edge: readonly (readonly [number, number])[],
  place: Place,
  proudM: number,
  middle: Point3,
): void {
  builder.grid(
    [
      edge.map(([u, v]) => place(u, v, proudM)),
      edge.map(([u, v]) => place(u, v, Math.min(proudM, 0) - PATCH_SKIRT_M)),
    ],
    (center) => [center.x - middle[0], center.y - middle[1], center.z - middle[2]],
  );
}

/**
 * 貼在曲面上的四邊形（可以是梯形、平行四邊形）：四個角依序是左下、右下、右上、左上的 (u, v)，
 * 裡面分成 columns × rows 格跟著曲面彎，四周一圈裙邊。
 */
export function createQuadPatch(
  place: Place,
  corners: readonly [
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
  ],
  proudM: number,
  columns = 1,
  rows = 1,
): BufferGeometry {
  const [a, b, c, d] = corners;
  const at = (s: number, t: number): [number, number] => [
    (1 - t) * ((1 - s) * a[0] + s * b[0]) + t * ((1 - s) * d[0] + s * c[0]),
    (1 - t) * ((1 - s) * a[1] + s * b[1]) + t * ((1 - s) * d[1] + s * c[1]),
  ];
  const ss = steps(0, 1, columns);
  const ts = steps(0, 1, rows);
  const middle = at(0.5, 0.5);
  const builder = new FacetBuilder().grid(
    ts.map((t) => ss.map((s) => place(...at(s, t), proudM))),
    patchOutward(place, ...middle),
  );
  addSkirt(
    builder,
    [
      ...ss.map((s) => at(s, 0)),
      ...ts.slice(1).map((t) => at(1, t)),
      ...[...ss].reverse().slice(1).map((s) => at(s, 1)),
      ...[...ts].reverse().slice(1).map((t) => at(0, t)),
    ],
    place,
    proudM,
    place(...middle, proudM),
  );
  return builder.build();
}

/** 貼在曲面上的橢圓（圓燈、橢圓燈）：中心 (u, v)、兩個半徑，一圈 segments 段，四周一圈裙邊。 */
export function createRoundPatch(
  place: Place,
  center: readonly [number, number],
  radii: readonly [number, number],
  proudM: number,
  segments = 12,
): BufferGeometry {
  const ring = (scale: number): [number, number][] =>
    Array.from({ length: segments + 1 }, (_, index) => {
      const angleRad = (2 * Math.PI * index) / segments;
      return [
        center[0] + scale * radii[0] * Math.cos(angleRad),
        center[1] + scale * radii[1] * Math.sin(angleRad),
      ];
    });
  const middle = place(...center, proudM);
  const outward = patchOutward(place, ...center);
  const edge = ring(1);
  const inner = ring(0.5);
  const builder = new FacetBuilder()
    .grid([edge, inner].map((points) => points.map(([u, v]) => place(u, v, proudM))), outward)
    .fan(inner.slice(1).map(([u, v]) => place(u, v, proudM)), middle, outward);
  addSkirt(builder, edge, place, proudM, middle);
  return builder.build();
}

/** 一串斷面接起來的實心體：每一圈的點數相同，頭尾兩圈各用扇形封起來。 */
export function createLoft(rings: readonly (readonly Point3[])[]): BufferGeometry {
  const middleOf = (ring: readonly Point3[]): Vector3 =>
    ring
      .reduce((sum, point) => sum.add(new Vector3(...point)), new Vector3())
      .multiplyScalar(1 / Math.max(ring.length, 1));
  const builder = new FacetBuilder().loop(rings);
  for (const [end, next] of [
    [0, 1],
    [rings.length - 1, rings.length - 2],
  ] as const) {
    const ring = rings[end] ?? [];
    const middle = middleOf(ring);
    const away = middle.clone().sub(middleOf(rings[next] ?? []));
    builder.fan(ring, [middle.x, middle.y, middle.z], [away.x, away.y, away.z]);
  }
  return builder.build();
}

/** 水平的矩形一圈（俯視逆時針）：中心、x 方向與 z 方向的邊長。直立的柱子、座椅的斷面用它。 */
export function rectRing(center: Point3, sizeXM: number, sizeZM: number): Point3[] {
  const [x, y, z] = center;
  return [
    [x - sizeXM / 2, y, z - sizeZM / 2],
    [x - sizeXM / 2, y, z + sizeZM / 2],
    [x + sizeXM / 2, y, z + sizeZM / 2],
    [x + sizeXM / 2, y, z - sizeZM / 2],
  ];
}

/**
 * 翼片（尾翼的橫板）：翼型斷面沿車寬擠出，兩端封起來。
 * @param topYM 翼片最高點的高度；centerZM：斷面中心的 z；pitchRad：後緣往上翹的角度
 */
export function createWingBlade(
  halfSpanM: number,
  chordM: number,
  thicknessM: number,
  topYM: number,
  centerZM: number,
  pitchRad: number,
): BufferGeometry {
  // 翼型：[沿弦的位置（−0.5 前緣、0.5 後緣）, 厚度方向（厚度的比例）]。
  const section = [
    [-0.5, 0],
    [-0.36, 0.5],
    [0, 0.45],
    [0.5, 0.12],
    [0.5, -0.06],
    [0, -0.45],
    [-0.36, -0.5],
  ] as const;
  const ring = (xM: number): Point3[] =>
    section.map(([along, across]): Point3 => {
      const zM = along * chordM;
      const yM = across * thicknessM;
      return [
        xM,
        yM * Math.cos(pitchRad) + zM * Math.sin(pitchRad),
        centerZM + zM * Math.cos(pitchRad) - yM * Math.sin(pitchRad),
      ];
    });
  const sectionTopM = Math.max(...ring(0).map(([, yM]) => yM));
  return createLoft([ring(-halfSpanM), ring(halfSpanM)]).translate(0, topYM - sectionTopM, 0);
}

/**
 * 引擎蓋上的進氣口：前面開口、往後收進引擎蓋的一塊鼓包。
 * @returns skin：鼓包的外皮（烤漆）；mouth：前面的開口（黑）
 */
export function createScoop(
  shell: CarShell,
  size: {
    readonly halfWidthM: number;
    readonly frontZM: number;
    readonly rearZM: number;
    readonly heightM: number;
  },
): { skin: BufferGeometry; mouth: BufferGeometry } {
  /** 鼓包在某一站的斷面：從左緣貼著引擎蓋、抬到頂、再回到右緣。 */
  const section = (t: number): Point3[] => {
    const zM = size.frontZM + (size.rearZM - size.frontZM) * t;
    const halfWidthM = size.halfWidthM * (1 - 0.18 * t);
    const liftM = size.heightM * (1 - t) ** 1.4;
    return (
      [
        [-1, 0],
        [-0.86, 0.8],
        [-0.6, 1],
        [0.6, 1],
        [0.86, 0.8],
        [1, 0],
      ] as const
    ).map(([across, up]): Point3 => {
      const xM = across * halfWidthM;
      return [xM, shell.topYM(zM, xM) - 0.004 + up * (liftM + 0.004), zM];
    });
  };
  const front = section(0);
  return {
    skin: new FacetBuilder()
      .grid([0, 0.3, 0.65, 1].map(section), (center) => [center.x, 0.5, 0])
      .build(),
    mouth: new FacetBuilder()
      .fan(
        front.map(([xM, yM, zM]): Point3 => [xM, yM, zM + 0.012]),
        [0, shell.topYM(size.frontZM, 0), size.frontZM + 0.012],
        [0, 0, -1],
      )
      .build(),
  };
}

/** 側面的一條直縫（門縫）：右側，沿這一站的鈑金側面從門檻上緣到頂面邊緣。 */
export function createSideSeam(shell: CarShell, zM: number): BufferGeometry {
  return merged(
    polyline(
      shell.sideProfile(zM).map(([xM, yM]): Point3 => [xM, yM, zM]),
      SEAM_WIDTH_M,
    ),
  );
}

/** 頂面上的一條縫：沿一串 (x, z) 走，貼著頂面。 */
function createTopSeam(
  shell: CarShell,
  path: readonly (readonly [number, number])[],
): BufferGeometry {
  return merged(
    polyline(
      path.map(([xM, zM]): Point3 => [xM, shell.topYM(zM, xM), zM]),
      SEAM_WIDTH_M,
    ),
  );
}

/** 引擎蓋或行李廂蓋的一圈接縫：兩條側縫（頂面邊緣內側 insetM）與前後兩條橫縫。 */
export function createLidSeams(
  shell: CarShell,
  fromZM: number,
  toZM: number,
  insetM: number,
): BufferGeometry {
  const halfWidthM = Math.min(shell.topEdgeXM(fromZM), shell.topEdgeXM(toZM)) - insetM;
  const zs = steps(fromZM, toZM, 5);
  const xs = steps(-halfWidthM, halfWidthM, 8);
  return merged([
    createTopSeam(shell, zs.map((zM) => [-halfWidthM, zM] as const)),
    createTopSeam(shell, zs.map((zM) => [halfWidthM, zM] as const)),
    createTopSeam(shell, xs.map((xM) => [xM, fromZM] as const)),
    createTopSeam(shell, xs.map((xM) => [xM, toZM] as const)),
  ]);
}

/** 四個輪拱的唇（烤漆）：凸出鈑金 proudM、唇面寬 faceM。 */
export function createShellArchLips(
  shell: CarShell,
  wheel: WheelSize,
  wheelbaseM: number,
  proudM: number,
  faceM: number,
): BufferGeometry {
  return createArchLips(8, {
    radiusM: shell.archRadiusM,
    axleYM: wheel.radiusM,
    axlesZM: [-wheelbaseM / 2, wheelbaseM / 2],
    sheetHalfWidthM: (zM) => Math.max(...shell.sideProfile(zM).map(([xM]) => xM)),
    lip: { proud: proudM, face: faceM, chamfer: 0.016, returnDepth: 0.024, legBottom: wheel.radiusM * 0.85 },
  });
}

/**
 * 左右兩個車外後視鏡：鏡殼（烤漆）、朝後的黑色鏡面與接到車門的支臂。鏡殼最外側剛好在車寬的一半。
 * @param yM、zM 鏡殼中心的高度與 z
 */
export function createDoorMirrors(
  dims: CarModelDimsM,
  yM: number,
  zM: number,
): { shells: BufferGeometry; backs: BufferGeometry } {
  const { shell, arm } = DOOR_MIRROR_SIZE_M;
  const xM = dims.widthM / 2 - shell.x / 2;
  return {
    shells: merged(
      [-1, 1].map((side) => createDoorMirrorShellGeometry(side).translate(side * xM, yM, zM)),
    ),
    backs: bothSides(
      merged([
        box([shell.x - 0.03, shell.y - 0.03, 0.008], [xM, yM, zM + shell.z / 2]),
        box([arm.x, arm.y, arm.z], [xM - 0.12, yM - 0.035, zM]),
      ]),
    ),
  };
}

/** 一根排氣尾管（鍍鉻）：管口朝後，在 zM。 */
export function createExhaustTip(xM: number, yM: number, zM: number, radiusM: number): BufferGeometry {
  const lengthM = 0.14;
  return normalized(
    new CylinderGeometry(radiusM, radiusM, lengthM, 10)
      .rotateX(Math.PI / 2)
      .translate(xM, yM, zM - lengthM / 2),
  );
}

/** 前後車牌的位置：牌面中心的高度與牌面的 z（前牌朝前、後牌朝後）。 */
export interface PlateMounts {
  readonly front: { readonly yM: number; readonly zM: number };
  readonly rear: { readonly yM: number; readonly zM: number };
}

function createPlates(mounts: PlateMounts, text: string): ReturnType<typeof createPlate>[] {
  return [
    createPlate(text, mounts.front.yM, mounts.front.zM, -1),
    createPlate(text, mounts.rear.yM, mounts.rear.zM, 1),
  ];
}

/** 輪圈的樣子：輪輻數、輪輻的寬度（1 = 粗的五輻）、顏色（sRGB）。 */
export interface RimLook {
  readonly spokes: number;
  readonly spokeWidth: number;
  readonly color: number;
}

/**
 * 併好的一個分區：只屬於退化三角形（收成一點的格子）的頂點算不出法線，抄同一個三角形裡別的頂點的，
 * 所有頂點的法線才都是單位長。
 */
function withUnitNormals(geometry: BufferGeometry): BufferGeometry {
  const normals = geometry.getAttribute('normal');
  const index = geometry.getIndex();
  const isUnit = (vertex: number): boolean =>
    Math.hypot(normals.getX(vertex), normals.getY(vertex), normals.getZ(vertex)) > 0.5;
  for (let corner = 0; index !== null && corner < index.count; corner += 3) {
    const triangle = [index.getX(corner), index.getX(corner + 1), index.getX(corner + 2)];
    const good = triangle.find(isUnit);
    for (const vertex of triangle) {
      if (!isUnit(vertex)) {
        if (good === undefined) {
          normals.setXYZ(vertex, 0, 1, 0);
        } else {
          normals.setXYZ(vertex, normals.getX(good), normals.getY(good), normals.getZ(good));
        }
      }
    }
  }
  return geometry;
}

/**
 * 把車殼、配件、輪子、車牌組成一款車的停放用幾何。
 * @param pieces 配件：[材質分區, 幾何]（車的本地座標）
 * @param wheelXM 右側輪心的 x（前、後）
 */
export function assembleCarModel(
  detail: VehicleDetail,
  dims: CarModelDimsM,
  shell: CarShell,
  pieces: readonly (readonly [CarModelPart, BufferGeometry])[],
  wheel: WheelSize,
  wheelXM: readonly [number, number],
  rim: RimLook,
  plates: PlateMounts,
): CarModelParts {
  const byPart = new Map<CarModelPart, BufferGeometry[]>();
  for (const [part, geometry] of [
    ...shell.geometries,
    ...pieces,
    ...createPlates(plates, '').map((plate) => ['plate', plate.plate] as const),
  ]) {
    byPart.set(part, [...(byPart.get(part) ?? []), normalized(geometry)]);
  }
  const segments = PARKED_WHEEL_SEGMENTS[detail];
  const carWheel: CarModelWheel = {
    ...wheel,
    rimColor: rim.color,
    tire: createTireGeometry(segments, false, wheel),
    rim:
      detail === 'high'
        ? createRimGeometry(segments, { size: wheel, spokes: rim.spokes, spokeWidth: rim.spokeWidth })
        : createHubcapGeometry(segments, wheel),
    centers: [
      [wheelXM[0], wheel.radiusM, -dims.wheelbaseM / 2],
      [wheelXM[1], wheel.radiusM, dims.wheelbaseM / 2],
    ],
  };
  return {
    body: new Map(
      [...byPart].map(([part, geometries]) => [part, withUnitNormals(merged(geometries))]),
    ),
    wheel: carWheel,
    plateText: (text) => merged(createPlates(plates, text).map((plate) => plate.text)),
  };
}
