// 輪子：有胎紋的輪胎（封閉的環面，胎面有兩道縱溝、胎肩有交錯的花塊）、有深度的五輻輪圈（唇、桶身、立體輪輻、螺帽）、
// 輪圈後面的深色底盤。
// 幾何的輪軸沿本地 X、外側面朝 +X，中心在原點；左側的輪子由 carMesh.ts 轉半圈。
// 尺寸與輪輻的樣式預設是轎車的；停放用的其他車款（carModelKit.ts）給自己的。
import { BufferAttribute, BufferGeometry, CircleGeometry, CylinderGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAR_VISUAL_CONFIG as VISUAL } from '../render/renderConfig';
import { FacetBuilder, type Point3 } from './facetBuilder';

/** 一顆輪子的尺寸：輪胎半徑、胎寬、輪圈半徑。 */
export interface WheelSize {
  readonly radiusM: number;
  readonly widthM: number;
  readonly rimRadiusM: number;
}

const SEDAN_WHEEL: WheelSize = {
  radiusM: VISUAL.wheelRadiusM,
  widthM: VISUAL.wheelWidthM,
  rimRadiusM: VISUAL.rimRadiusM,
};

/** 輪圈的樣式：尺寸、輪輻數、輪輻的寬度（1 = 轎車那種粗的五輻；多輻的給小一點）。 */
export interface RimStyle {
  readonly size: WheelSize;
  readonly spokes: number;
  readonly spokeWidth: number;
}

const SEDAN_RIM: RimStyle = { size: SEDAN_WHEEL, spokes: VISUAL.rimSpokes, spokeWidth: 1 };

const GROOVE_M = VISUAL.treadDepthM;

/**
 * 停放的車的輪胎與輪圈一圈的段數（偶數），依擺設的細分。輪胎是沒有胎紋的光面（橫截面的點數少四成），
 * 所以 high 的 20 段比有胎紋的 12 段面數還少一點，輪廓卻圓得多。
 */
export const PARKED_WHEEL_SEGMENTS = { low: 12, high: 20 } as const;

/**
 * 輪胎橫截面（繞輪軸一圈的封閉輪廓）：[沿輪軸的位置, 半徑, 是不是胎肩花塊]。
 * 從內側胎唇繞過胎面到外側胎唇，最後沿輪圈的位置回到起點。胎面中央那一點的半徑剛好是輪胎半徑。
 * @param tread false = 沒有縱溝與花塊（背景車用）：遠看與有胎紋的一樣，點數少四成，省下來的面數拿去把輪胎做圓。
 */
function tireProfile(
  size: WheelSize,
  tread: boolean,
): readonly (readonly [number, number, boolean])[] {
  const radiusM = size.radiusM;
  const rimM = size.rimRadiusM;
  const halfWidthM = size.widthM / 2;
  const sidewallM = radiusM - rimM;
  const profile: readonly (readonly [number, number, boolean])[] = [
    [-0.8 * halfWidthM, rimM, false],
    [-0.98 * halfWidthM, rimM + 0.3 * sidewallM, false],
    [-halfWidthM, rimM + 0.62 * sidewallM, false],
    [-0.93 * halfWidthM, radiusM - 2 * GROOVE_M, false],
    [-0.84 * halfWidthM, radiusM - 0.5 * GROOVE_M, true],
    [-0.5 * halfWidthM, radiusM, true],
    [-0.42 * halfWidthM, radiusM, false],
    [-0.39 * halfWidthM, radiusM - GROOVE_M, false],
    [-0.29 * halfWidthM, radiusM - GROOVE_M, false],
    [-0.26 * halfWidthM, radiusM, false],
    [0, radiusM, false],
    [0.26 * halfWidthM, radiusM, false],
    [0.29 * halfWidthM, radiusM - GROOVE_M, false],
    [0.39 * halfWidthM, radiusM - GROOVE_M, false],
    [0.42 * halfWidthM, radiusM, false],
    [0.5 * halfWidthM, radiusM, true],
    [0.84 * halfWidthM, radiusM - 0.5 * GROOVE_M, true],
    [0.93 * halfWidthM, radiusM - 2 * GROOVE_M, false],
    [halfWidthM, rimM + 0.62 * sidewallM, false],
    [0.98 * halfWidthM, rimM + 0.3 * sidewallM, false],
    [0.8 * halfWidthM, rimM, false],
  ];
  return tread
    ? profile
    : profile
        .filter(([axialM]) => Math.abs(axialM) > 0.45 * halfWidthM || axialM === 0)
        .map(([axialM, radiusM]) => [axialM, radiusM, false] as const);
}

/**
 * 把一條橫截面（[沿輪軸的位置, 半徑]）繞輪軸（本地 X）轉一圈。法線朝「沿橫截面前進方向的左手邊」：
 * 往 +X 走的那一段朝外（遠離輪軸），往輪軸走的那一段朝 +X。重複的點是摺線（兩側各有自己的法線）。
 * @param closed 橫截面的頭尾是不是相接（輪胎是封閉的環面）
 */
export function revolve(
  profile: readonly (readonly [number, number])[],
  segments: number,
  closed: boolean,
  radiusAt: (radiusM: number, point: number, segment: number) => number = (radiusM) => radiusM,
): BufferGeometry {
  const profilePoints = profile.length;
  const positions = new Float32Array(segments * profilePoints * 3);
  const indices: number[] = [];
  for (let segment = 0; segment < segments; segment += 1) {
    const angleRad = (2 * Math.PI * segment) / segments;
    const nextSegment = (segment + 1) % segments;
    profile.forEach(([axialM, radiusM], point) => {
      const r = radiusAt(radiusM, point, segment);
      const offset = (segment * profilePoints + point) * 3;
      positions[offset] = axialM;
      positions[offset + 1] = r * Math.cos(angleRad);
      positions[offset + 2] = r * Math.sin(angleRad);
      if (!closed && point === profilePoints - 1) {
        return;
      }
      const nextPoint = (point + 1) % profilePoints;
      const a = segment * profilePoints + point;
      const b = segment * profilePoints + nextPoint;
      const c = nextSegment * profilePoints + point;
      const d = nextSegment * profilePoints + nextPoint;
      indices.push(a, c, b, b, c, d);
    });
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * 輪胎。segments 是一圈的段數（偶數）：胎肩花塊每隔一段凹下去，輪子轉動時看得出在轉。
 * 第 segments/2 段剛好在正下方，所以輪胎最低點離輪軸剛好一個輪胎半徑。
 * @param tread false = 沒有縱溝與花塊的光面輪胎（背景車用）
 */
export function createTireGeometry(
  segments: number,
  tread = true,
  size: WheelSize = SEDAN_WHEEL,
): BufferGeometry {
  const profile = tireProfile(size, tread);
  return revolve(
    profile.map(([axialM, radiusM]) => [axialM, radiusM] as const),
    segments,
    true,
    (radiusM, point, segment) =>
      profile[point]?.[2] === true && segment % 2 === 1 ? radiusM - GROOVE_M : radiusM,
  );
}

/** 輪圈正面（輪輻、輪轂蓋）在輪軸方向的位置（半個胎寬的比例），以及輪圈的桶身往內多深。 */
const RIM_FACE_SHARE = 0.72;
const RIM_BARREL_DEPTH_M = 0.07;
/** 一圈至少這麼多段才加螺帽與煞車碟盤（玩家車的高細分）；背景車與低細分不加。 */
const DETAILED_RIM_SEGMENTS = 32;
/** 輪轂（輪輻的根部）的半徑，以及中央蓋子的半徑（輪圈半徑的比例）。 */
const HUB_RADIUS_SHARE = 0.27;
const CAP_RADIUS_SHARE = 0.11;

/**
 * 輪圈：捲邊的唇、往內凹的桶身、從輪轂斜向桶身的立體輪輻（正面有一道稜）、輪轂上的螺帽與中央的蓋子，合併成一個幾何。
 * 段數夠多（玩家車）時，輪輻後面還有一片煞車碟盤。
 */
export function createRimGeometry(segments: number, style: RimStyle = SEDAN_RIM): BufferGeometry {
  const rimM = style.size.rimRadiusM;
  const hubRadiusM = HUB_RADIUS_SHARE * rimM;
  const capRadiusM = CAP_RADIUS_SHARE * rimM;
  const faceXM = (RIM_FACE_SHARE * style.size.widthM) / 2;
  const backXM = faceXM - RIM_BARREL_DEPTH_M;
  /** 桶身內壁的半徑（唇的內緣再往內一階）。 */
  const barrelM = rimM - 0.026;
  // 唇與桶身：從胎唇外側捲過來，折進桶身，一路到底。
  const barrel = revolve(
    [
      [faceXM - 0.014, rimM + 0.004],
      [faceXM + 0.004, rimM + 0.004],
      [faceXM + 0.011, rimM - 0.003],
      [faceXM + 0.009, rimM - 0.013],
      [faceXM - 0.004, rimM - 0.02],
      [faceXM - 0.004, rimM - 0.02],
      [faceXM - 0.012, barrelM],
      [backXM, barrelM - 0.006],
    ],
    segments,
    false,
  );
  // 輪轂：從輪輻根部的錐面到正面的平台（鎖螺帽的地方），再到中央略凸的蓋子。
  const hub = revolve(
    [
      [backXM + 0.02, 1.25 * hubRadiusM],
      [faceXM - 0.006, hubRadiusM],
      [faceXM + 0.002, 0.86 * hubRadiusM],
      [faceXM + 0.002, 0.86 * hubRadiusM],
      [faceXM + 0.003, capRadiusM + 0.004],
      [faceXM + 0.003, capRadiusM + 0.004],
      [faceXM + 0.01, capRadiusM],
      [faceXM + 0.01, capRadiusM],
      [faceXM + 0.013, 0.5 * capRadiusM],
      [faceXM + 0.014, 0],
    ],
    Math.max(Math.round(segments / 2), 10),
    false,
  );

  // 輪輻：根部寬、往輪圈收窄，正面從輪轂往桶身略往內斜，中間鼓起一道稜；斷面的法線是平滑的（圓潤的鑄造輪輻）。
  const spokes = new FacetBuilder();
  const thicknessM = 0.03;
  for (let spoke = 0; spoke < style.spokes; spoke += 1) {
    const angleRad = (2 * Math.PI * spoke) / style.spokes;
    const radial = [Math.cos(angleRad), Math.sin(angleRad)] as const;
    const across = [-Math.sin(angleRad), Math.cos(angleRad)] as const;
    /** 輪輻在某個半徑的斷面：背面左緣 → 正面左緣 → 稜 → 正面右緣 → 背面右緣。 */
    const section = (
      radiusM: number,
      frontXM: number,
      halfFrontM: number,
      halfBackM: number,
    ): Point3[] =>
      (
        [
          [frontXM - thicknessM, -halfBackM],
          [frontXM, -halfFrontM],
          [frontXM + 0.005, 0],
          [frontXM, halfFrontM],
          [frontXM - thicknessM, halfBackM],
        ] as const
      ).map(([xM, acrossM]): Point3 => [
        xM,
        radial[0] * radiusM + across[0] * acrossM,
        radial[1] * radiusM + across[1] * acrossM,
      ]);
    spokes.grid(
      [
        section(
          0.8 * hubRadiusM,
          faceXM,
          0.2 * rimM * style.spokeWidth,
          0.24 * rimM * style.spokeWidth,
        ),
        section(
          barrelM + 0.004,
          faceXM - 0.01,
          0.1 * rimM * style.spokeWidth,
          0.13 * rimM * style.spokeWidth,
        ),
      ],
      // 第一格是輪輻的左側面：朝左（−across），略朝外。
      [0.3, -across[0], -across[1]],
    );
  }

  const parts: BufferGeometry[] = [barrel, hub, spokes.build()];
  if (segments >= DETAILED_RIM_SEGMENTS) {
    // 螺帽：輪轂平台上、兩根輪輻之間各一顆。
    const lugCircleM = (0.86 * hubRadiusM + capRadiusM) / 2;
    for (let lug = 0; lug < style.spokes; lug += 1) {
      const angleRad = (2 * Math.PI * (lug + 0.5)) / style.spokes;
      const nut = new CylinderGeometry(0.006, 0.007, 0.01, 6)
        .rotateZ(-Math.PI / 2)
        .translate(faceXM + 0.007, lugCircleM * Math.cos(angleRad), lugCircleM * Math.sin(angleRad));
      nut.deleteAttribute('uv');
      parts.push(nut);
    }
    // 煞車碟盤：輪輻後面的一片（外緣一圈厚度、盤面、中央的帽）。
    parts.push(
      revolve(
        [
          [backXM + 0.008, 0.8 * barrelM],
          [backXM + 0.02, 0.8 * barrelM],
          [backXM + 0.02, 0.8 * barrelM],
          [backXM + 0.02, 0.42 * barrelM],
          [backXM + 0.02, 0.42 * barrelM],
          [backXM + 0.034, 0.38 * barrelM],
        ],
        segments,
        false,
      ),
    );
  }
  return mergeGeometries(parts);
}

/** 輪圈後面的深色圓盤（輪圈內側的底），從輪輻之間看進去不會穿到車底另一邊。 */
export function createBrakeDiscGeometry(segments: number): BufferGeometry {
  return new CircleGeometry(SEDAN_WHEEL.rimRadiusM, segments)
    .rotateY(Math.PI / 2)
    .translate((RIM_FACE_SHARE * SEDAN_WHEEL.widthM) / 2 - RIM_BARREL_DEPTH_M + 0.004, 0, 0);
}

/** 低細分的背景車用的輪蓋：一片略凸的圓盤蓋住整個輪圈（沒有輪輻），用輪圈的材質畫。 */
export function createHubcapGeometry(
  segments: number,
  size: WheelSize = SEDAN_WHEEL,
): BufferGeometry {
  const rimM = size.rimRadiusM;
  const faceXM = (RIM_FACE_SHARE * size.widthM) / 2;
  return revolve(
    [
      [faceXM - 0.012, rimM],
      [faceXM, 0.9 * rimM],
      [faceXM + 0.008, 0.3 * rimM],
      [faceXM + 0.01, 0],
    ],
    segments,
    false,
  );
}
