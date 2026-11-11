// 輪子：有胎紋的輪胎（封閉的環面，胎面有兩道縱溝、胎肩有交錯的花塊）、五輻輪圈、輪圈後面的深色煞車盤。
// 幾何的輪軸沿本地 X、外側面朝 +X，中心在原點；左側的輪子由 carMesh.ts 轉半圈。
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  TorusGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAR_VISUAL_CONFIG as VISUAL } from '../render/renderConfig';

const RADIUS_M = VISUAL.wheelRadiusM;
const RIM_M = VISUAL.rimRadiusM;
const HALF_WIDTH_M = VISUAL.wheelWidthM / 2;
const SIDEWALL_M = RADIUS_M - RIM_M;
const GROOVE_M = VISUAL.treadDepthM;

/**
 * 輪胎橫截面（繞輪軸一圈的封閉輪廓）：[沿輪軸的位置, 半徑, 是不是胎肩花塊]。
 * 從內側胎唇繞過胎面到外側胎唇，最後沿輪圈的位置回到起點。胎面中央那一點的半徑剛好是輪胎半徑。
 */
const TIRE_PROFILE: readonly (readonly [number, number, boolean])[] = [
  [-0.8 * HALF_WIDTH_M, RIM_M, false],
  [-0.98 * HALF_WIDTH_M, RIM_M + 0.3 * SIDEWALL_M, false],
  [-HALF_WIDTH_M, RIM_M + 0.62 * SIDEWALL_M, false],
  [-0.93 * HALF_WIDTH_M, RADIUS_M - 2 * GROOVE_M, false],
  [-0.84 * HALF_WIDTH_M, RADIUS_M - 0.5 * GROOVE_M, true],
  [-0.5 * HALF_WIDTH_M, RADIUS_M, true],
  [-0.42 * HALF_WIDTH_M, RADIUS_M, false],
  [-0.39 * HALF_WIDTH_M, RADIUS_M - GROOVE_M, false],
  [-0.29 * HALF_WIDTH_M, RADIUS_M - GROOVE_M, false],
  [-0.26 * HALF_WIDTH_M, RADIUS_M, false],
  [0, RADIUS_M, false],
  [0.26 * HALF_WIDTH_M, RADIUS_M, false],
  [0.29 * HALF_WIDTH_M, RADIUS_M - GROOVE_M, false],
  [0.39 * HALF_WIDTH_M, RADIUS_M - GROOVE_M, false],
  [0.42 * HALF_WIDTH_M, RADIUS_M, false],
  [0.5 * HALF_WIDTH_M, RADIUS_M, true],
  [0.84 * HALF_WIDTH_M, RADIUS_M - 0.5 * GROOVE_M, true],
  [0.93 * HALF_WIDTH_M, RADIUS_M - 2 * GROOVE_M, false],
  [HALF_WIDTH_M, RIM_M + 0.62 * SIDEWALL_M, false],
  [0.98 * HALF_WIDTH_M, RIM_M + 0.3 * SIDEWALL_M, false],
  [0.8 * HALF_WIDTH_M, RIM_M, false],
];

/**
 * 輪胎。segments 是一圈的段數（偶數）：胎肩花塊每隔一段凹下去，輪子轉動時看得出在轉。
 * 第 segments/2 段剛好在正下方，所以輪胎最低點離輪軸剛好一個輪胎半徑。
 */
export function createTireGeometry(segments: number): BufferGeometry {
  const profilePoints = TIRE_PROFILE.length;
  const positions = new Float32Array(segments * profilePoints * 3);
  const indices: number[] = [];
  for (let segment = 0; segment < segments; segment += 1) {
    const angleRad = (2 * Math.PI * segment) / segments;
    const sunken = segment % 2 === 1;
    TIRE_PROFILE.forEach(([axialM, radiusM, block], point) => {
      const r = block && sunken ? radiusM - GROOVE_M : radiusM;
      const offset = (segment * profilePoints + point) * 3;
      positions[offset] = axialM;
      positions[offset + 1] = r * Math.cos(angleRad);
      positions[offset + 2] = r * Math.sin(angleRad);

      const nextSegment = (segment + 1) % segments;
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

/** 輪圈：外緣一圈唇邊、放射狀的輪輻、中央的輪轂蓋，合併成一個幾何。 */
export function createRimGeometry(segments: number): BufferGeometry {
  const faceXM = 0.72 * HALF_WIDTH_M;
  const lipTubeM = 0.014;
  const lip = new TorusGeometry(RIM_M - lipTubeM / 2, lipTubeM, 6, segments)
    .rotateY(Math.PI / 2)
    .translate(faceXM, 0, 0);
  const hubRadiusM = 0.24 * RIM_M;
  const hub = new CylinderGeometry(0.8 * hubRadiusM, hubRadiusM, 0.04, 16)
    .rotateZ(-Math.PI / 2)
    .translate(faceXM, 0, 0);

  const spokeLengthM = RIM_M - 0.6 * hubRadiusM;
  const parts: BufferGeometry[] = [lip, hub];
  for (let spoke = 0; spoke < VISUAL.rimSpokes; spoke += 1) {
    parts.push(
      new BoxGeometry(0.024, spokeLengthM, 0.22 * RIM_M)
        .translate(faceXM - 0.012, 0.6 * hubRadiusM + spokeLengthM / 2, 0)
        .rotateX((2 * Math.PI * spoke) / VISUAL.rimSpokes),
    );
  }
  return mergeGeometries(parts);
}

/** 輪圈後面的深色圓盤（煞車盤與輪圈內側），從輪輻之間看進去不會穿到車底另一邊。 */
export function createBrakeDiscGeometry(segments: number): BufferGeometry {
  return new CircleGeometry(RIM_M, segments).rotateY(Math.PI / 2).translate(0.45 * HALF_WIDTH_M, 0, 0);
}
