// 頭燈（與倒車燈）的光斑打在路緣上：地上的光斑是一片貼地的面片（carHeadlights.ts），路緣石、車擋、人行道
// 比它高，深度測試會把光斑切掉，路緣的頂面與立面就是黑的。這裡替每一塊矮東西在光斑範圍裡的部分補上貼片：
// 頂面一片、朝著車的立面一片，亮度用與地上光斑同一個函式（beamBrightness）在那個位置算，所以與地上的光連得起來。
// 不關深度測試：光仍然被車、牆、其他東西擋住，只是不再被路緣自己切掉。
// 一個網格、一個 draw call；頂點每幀依車的位置重填（車沒動就不重算）。純視覺。
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { forward, right } from '../core/heading';
import { SKIP_AMBIENT_OCCLUSION } from '../render/ambientOcclusionFlag';
import type { HeadlightQualitySettings } from '../render/quality';
import { HEADLIGHT_CONFIG as CONFIG } from '../render/renderConfig';
import type { VehiclePose } from './bicycleModel';
import { beamBrightness } from './carHeadlights';
import { VEHICLE_CONFIG_SI } from './vehicleConfig';

const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;
const RAISED = CONFIG.raisedSurfaces;

/**
 * 一塊會擋住貼地光斑的矮東西（路緣石、車擋、人行道）：底面是一個可以轉向的矩形（世界座標，公尺），頂面在 heightM。
 * (axisX, axisZ) 是矩形第一條邊的方向（單位向量），halfAlongM 是沿這個方向的半長，halfAcrossM 是垂直方向的半寬。
 */
export interface RaisedBox {
  readonly centerX: number;
  readonly centerZ: number;
  readonly axisX: number;
  readonly axisZ: number;
  readonly halfAlongM: number;
  readonly halfAcrossM: number;
  readonly heightM: number;
}

/** 與座標軸平行的矩形（世界座標）當成矮東西。 */
export function raisedBoxFromRect(
  rect: { readonly minX: number; readonly maxX: number; readonly minZ: number; readonly maxZ: number },
  heightM: number,
): RaisedBox {
  return {
    centerX: (rect.minX + rect.maxX) / 2,
    centerZ: (rect.minZ + rect.maxZ) / 2,
    axisX: 1,
    axisZ: 0,
    halfAlongM: (rect.maxX - rect.minX) / 2,
    halfAcrossM: (rect.maxZ - rect.minZ) / 2,
    heightM,
  };
}

/**
 * 中心在 (centerX, centerZ)、朝向 headingRad（heading 約定）的矩形：sizeXM 是它自己右方向的寬、sizeZM 是前後的長。
 */
export function raisedBoxAt(
  centerX: number,
  centerZ: number,
  headingRad: number,
  sizeXM: number,
  sizeZM: number,
  heightM: number,
): RaisedBox {
  const side = right(headingRad);
  return {
    centerX,
    centerZ,
    axisX: side.x,
    axisZ: side.z,
    halfAlongM: sizeXM / 2,
    halfAcrossM: sizeZM / 2,
    heightM,
  };
}

/** 車燈的光在地面座標 (x, z) 的亮度：頭燈與倒車燈各自的 0–1（與貼地光斑同一個函式）。 */
export function lampLightAt(
  pose: Pick<VehiclePose, 'x' | 'z' | 'headingRad'>,
  x: number,
  z: number,
): { readonly front: number; readonly reverse: number } {
  const ahead = forward(pose.headingRad);
  const side = right(pose.headingRad);
  const dx = x - pose.x;
  const dz = z - pose.z;
  const aheadM = dx * ahead.x + dz * ahead.z;
  const lateralM = dx * side.x + dz * side.z;
  return {
    front: beamBrightness(CONFIG.frontPool, lateralM, aheadM - HALF_LENGTH_M),
    reverse: beamBrightness(CONFIG.reversePool, lateralM, -aheadM - HALF_LENGTH_M),
  };
}

/** 一片補上去的光：四個角（世界座標）與各角的亮度（頭燈、倒車燈各 0–1）。 */
export interface LightPatch {
  readonly corners: readonly [Corner, Corner, Corner, Corner];
  /** 'top' = 頂面、'side' = 立面。 */
  readonly face: 'top' | 'side';
}

interface Corner {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly front: number;
  readonly reverse: number;
}

/**
 * 這些矮東西在車燈光斑範圍裡要補哪些光（頂面與朝著車的立面）。純函式：單元測試直接檢查。
 * @param reversing 倒車燈亮不亮；不亮就只算頭燈
 * @param maxPatches 最多幾片（緩衝區的大小）；超過就不再加
 */
export function raisedLightPatches(
  boxes: readonly RaisedBox[],
  pose: Pick<VehiclePose, 'x' | 'z' | 'headingRad'>,
  reversing: boolean,
  maxPatches: number = RAISED.maxPatches,
): LightPatch[] {
  const patches: LightPatch[] = [];
  const liftM = RAISED.liftM;
  // 光斑佔的範圍（世界座標的四個角）：頭燈那一片，倒車時再加車尾那一片。只在這個範圍裡補。
  const ahead = forward(pose.headingRad);
  const sideways = right(pose.headingRad);
  const poolCorners: { x: number; z: number }[] = [];
  const addPool = (shape: { readonly lengthM: number; readonly halfWidthM: number }, sign: 1 | -1): void => {
    for (const aheadM of [HALF_LENGTH_M, HALF_LENGTH_M + shape.lengthM]) {
      for (const lateralM of [-shape.halfWidthM, shape.halfWidthM]) {
        poolCorners.push({
          x: pose.x + sign * ahead.x * aheadM + sideways.x * lateralM,
          z: pose.z + sign * ahead.z * aheadM + sideways.z * lateralM,
        });
      }
    }
  };
  addPool(CONFIG.frontPool, 1);
  if (reversing) {
    addPool(CONFIG.reversePool, -1);
  }
  for (const box of boxes) {
    // 車與光斑在這塊矩形自己的座標裡的位置：(u, v) = 沿第一條邊、沿垂直方向。
    const toBox = (x: number, z: number): { u: number; v: number } => {
      const relX = x - box.centerX;
      const relZ = z - box.centerZ;
      return { u: relX * box.axisX + relZ * box.axisZ, v: -relX * box.axisZ + relZ * box.axisX };
    };
    const { u: carU, v: carV } = toBox(pose.x, pose.z);
    const pool = poolCorners.map((corner) => toBox(corner.x, corner.z));
    const minU = Math.max(-box.halfAlongM, Math.min(...pool.map((corner) => corner.u)));
    const maxU = Math.min(box.halfAlongM, Math.max(...pool.map((corner) => corner.u)));
    const minV = Math.max(-box.halfAcrossM, Math.min(...pool.map((corner) => corner.v)));
    const maxV = Math.min(box.halfAcrossM, Math.max(...pool.map((corner) => corner.v)));
    if (minU >= maxU || minV >= maxV) {
      continue;
    }
    const cellsU = Math.max(1, Math.ceil((maxU - minU) / RAISED.cellM));
    const cellsV = Math.max(1, Math.ceil((maxV - minV) / RAISED.cellM));
    // 格點上的亮度先算好（相鄰的格子共用）。
    const nodes: { x: number; z: number; front: number; reverse: number }[] = [];
    for (let row = 0; row <= cellsV; row += 1) {
      const v = minV + ((maxV - minV) * row) / cellsV;
      for (let column = 0; column <= cellsU; column += 1) {
        const u = minU + ((maxU - minU) * column) / cellsU;
        const x = box.centerX + box.axisX * u - box.axisZ * v;
        const z = box.centerZ + box.axisZ * u + box.axisX * v;
        const light = lampLightAt(pose, x, z);
        nodes.push({ x, z, front: light.front, reverse: reversing ? light.reverse : 0 });
      }
    }
    const node = (column: number, row: number): (typeof nodes)[number] | undefined =>
      nodes[row * (cellsU + 1) + column];
    const lit = (corner: { front: number; reverse: number } | undefined): boolean =>
      corner !== undefined && (corner.front > 0 || corner.reverse > 0);
    const topY = box.heightM + liftM;
    // 立面從貼地光斑的高度開始：再往下那一小截已經被貼地的光斑照到了，重疊會亮成一條線。
    const baseY = Math.min(CONFIG.poolLiftM, box.heightM);
    const push = (
      a: (typeof nodes)[number] | undefined,
      b: (typeof nodes)[number] | undefined,
      c: (typeof nodes)[number] | undefined,
      d: (typeof nodes)[number] | undefined,
      yA: number,
      yB: number,
      yC: number,
      yD: number,
      face: LightPatch['face'],
      // 立面往外推一點點，不與路緣的面共面。
      offsetX = 0,
      offsetZ = 0,
    ): void => {
      if (a === undefined || b === undefined || c === undefined || d === undefined) {
        return;
      }
      if (patches.length >= maxPatches || !(lit(a) || lit(b) || lit(c) || lit(d))) {
        return;
      }
      const corner = (source: (typeof nodes)[number], y: number): Corner => ({
        x: source.x + offsetX,
        y,
        z: source.z + offsetZ,
        front: source.front,
        reverse: source.reverse,
      });
      patches.push({ corners: [corner(a, yA), corner(b, yB), corner(c, yC), corner(d, yD)], face });
    };

    // 頂面。
    for (let row = 0; row < cellsV; row += 1) {
      for (let column = 0; column < cellsU; column += 1) {
        push(
          node(column, row),
          node(column + 1, row),
          node(column + 1, row + 1),
          node(column, row + 1),
          topY,
          topY,
          topY,
          topY,
          'top',
        );
      }
    }

    // 立面：只補朝著車的那幾面（背光面本來就該是暗的），而且那一面要真的是矩形的邊（沒有被「光斑範圍」裁掉）。
    const sides: readonly {
      readonly onEdge: boolean;
      /** 這一面的外法線（矩形自己的座標）。 */
      readonly normalU: number;
      readonly normalV: number;
      readonly count: number;
      readonly at: (index: number) => (typeof nodes)[number] | undefined;
    }[] = [
      { onEdge: minV <= -box.halfAcrossM, normalU: 0, normalV: -1, count: cellsU, at: (i) => node(i, 0) },
      { onEdge: maxV >= box.halfAcrossM, normalU: 0, normalV: 1, count: cellsU, at: (i) => node(i, cellsV) },
      { onEdge: minU <= -box.halfAlongM, normalU: -1, normalV: 0, count: cellsV, at: (i) => node(0, i) },
      { onEdge: maxU >= box.halfAlongM, normalU: 1, normalV: 0, count: cellsV, at: (i) => node(cellsU, i) },
    ];
    for (const side of sides) {
      const edgeU = side.normalU * box.halfAlongM;
      const edgeV = side.normalV * box.halfAcrossM;
      const facesCar = side.normalU * (carU - edgeU) + side.normalV * (carV - edgeV) > 0;
      if (!side.onEdge || !facesCar) {
        continue;
      }
      const normalX = box.axisX * side.normalU - box.axisZ * side.normalV;
      const normalZ = box.axisZ * side.normalU + box.axisX * side.normalV;
      for (let index = 0; index < side.count; index += 1) {
        const from = side.at(index);
        const to = side.at(index + 1);
        push(from, to, to, from, baseY, baseY, topY, topY, 'side', normalX * liftM, normalZ * liftM);
      }
    }
  }
  return patches;
}

export interface RaisedPoolLight {
  /** 加進場景的網格（世界座標）。 */
  readonly mesh: Mesh;
  /** 依車的位置重填貼片；車與倒車燈都沒變就什麼都不做。 */
  update(pose: Pick<VehiclePose, 'x' | 'z' | 'headingRad'>, reversing: boolean): void;
}

const VERTICES_PER_PATCH = 4;
const INDICES_PER_PATCH = 6;
/** 與貼地的光斑同一個順位：排在標線、輪胎痕之後畫。 */
const PATCH_RENDER_ORDER = 2;

/**
 * 建立「光斑打在路緣上」的貼片。這個畫質級別沒有貼地光斑（low）或場景裡沒有矮東西就回傳 undefined。
 * @param boxes 場景裡的路緣石、車擋、人行道（世界座標）
 * @param hdr 這個級別是不是走高動態範圍的後製鏈（決定亮度，與貼地光斑相同）
 */
export function createRaisedPoolLight(
  boxes: readonly RaisedBox[],
  settings: HeadlightQualitySettings,
  hdr: boolean,
): RaisedPoolLight | undefined {
  if (!settings.groundPool || boxes.length === 0) {
    return undefined;
  }
  const maxPatches = RAISED.maxPatches;
  const positions = new Float32Array(maxPatches * VERTICES_PER_PATCH * 3);
  const colors = new Float32Array(maxPatches * VERTICES_PER_PATCH * 3);
  const indices = new Uint16Array(maxPatches * INDICES_PER_PATCH);
  for (let patch = 0; patch < maxPatches; patch += 1) {
    const vertex = patch * VERTICES_PER_PATCH;
    indices.set(
      [vertex, vertex + 1, vertex + 2, vertex, vertex + 2, vertex + 3],
      patch * INDICES_PER_PATCH,
    );
  }
  const geometry = new BufferGeometry();
  const positionAttribute = new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage);
  const colorAttribute = new BufferAttribute(colors, 3).setUsage(DynamicDrawUsage);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', colorAttribute);
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.setDrawRange(0, 0);

  // 亮度與貼地的光斑相同：有真光源時只補一點形狀。
  const frontScale =
    (hdr ? CONFIG.poolBrightness.hdr : CONFIG.poolBrightness.direct) *
    (settings.spotLights > 0 ? CONFIG.poolWithLightScale : 1);
  const frontColor = new Color(CONFIG.color).multiplyScalar(frontScale);
  const reverseColor = new Color(CONFIG.reverseColor).multiplyScalar(
    hdr ? CONFIG.reverseBrightness.hdr : CONFIG.reverseBrightness.direct,
  );

  const mesh = new Mesh(
    geometry,
    new MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      // 立面的貼片從兩側都看得到（鏡頭可能在路緣的任何一邊）。
      side: DoubleSide,
      // 貼片與路緣的面幾乎共面：往鏡頭推一點，不閃。
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    }),
  );
  mesh.name = 'headlightRaisedPool';
  mesh.renderOrder = PATCH_RENDER_ORDER;
  mesh.frustumCulled = false;
  mesh.userData[SKIP_AMBIENT_OCCLUSION] = true;

  let shown: { x: number; z: number; headingRad: number; reversing: boolean } | undefined;
  return {
    mesh,
    update(pose, reversing) {
      if (
        shown !== undefined &&
        shown.x === pose.x &&
        shown.z === pose.z &&
        shown.headingRad === pose.headingRad &&
        shown.reversing === reversing
      ) {
        return;
      }
      shown = { x: pose.x, z: pose.z, headingRad: pose.headingRad, reversing };
      const patches = raisedLightPatches(boxes, pose, reversing, maxPatches);
      patches.forEach((patch, patchIndex) => {
        patch.corners.forEach((corner, cornerIndex) => {
          const offset = (patchIndex * VERTICES_PER_PATCH + cornerIndex) * 3;
          positions[offset] = corner.x;
          positions[offset + 1] = corner.y;
          positions[offset + 2] = corner.z;
          colors[offset] = frontColor.r * corner.front + reverseColor.r * corner.reverse;
          colors[offset + 1] = frontColor.g * corner.front + reverseColor.g * corner.reverse;
          colors[offset + 2] = frontColor.b * corner.front + reverseColor.b * corner.reverse;
        });
      });
      positionAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;
      geometry.setDrawRange(0, patches.length * INDICES_PER_PATCH);
    },
  };
}
