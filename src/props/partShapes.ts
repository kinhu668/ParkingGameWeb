// 模型零件的共用形狀：盒、圓柱、橫躺的圓柱、細桿、球，都帶頂點顏色。
// 單位是英尺；assemble 把整個模型合成一個幾何並換成公尺。本地 X = 橫向、−Z = 前方（與車的模型相同）。
import {
  BoxGeometry,
  CylinderGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ftToM } from '../core/units';
import { tinted } from './lotProps';

// ── 零件（單位：英尺；最後整個模型一起換成公尺）──────────────────────────

/** 盒子：寬（X）、高、長（Z），中心在 (x, z)、底面在 y。 */
export function box(
  width: number,
  height: number,
  length: number,
  x: number,
  y: number,
  z: number,
  color: number,
): BufferGeometry {
  return tinted(new BoxGeometry(width, height, length).translate(x, y + height / 2, z), color);
}

/** 直立的圓柱（可以上下不同半徑），底面在 y。 */
export function cylinder(
  topRadius: number,
  bottomRadius: number,
  height: number,
  x: number,
  y: number,
  z: number,
  color: number,
  segments = 12,
): BufferGeometry {
  return tinted(
    new CylinderGeometry(topRadius, bottomRadius, height, segments).translate(x, y + height / 2, z),
    color,
  );
}

/** 橫躺的圓柱（軸沿 X）：輪子、郵筒的圓頂。中心在 (x, y, z)。 */
export function roller(radius: number, width: number, x: number, y: number, z: number, color: number): BufferGeometry {
  return tinted(
    new CylinderGeometry(radius, radius, width, 12).rotateZ(Math.PI / 2).translate(x, y, z),
    color,
  );
}

export type Point = readonly [number, number, number];

/** 細桿：從 from 到 to 的一根方桿。 */
export function bar(from: Point, to: Point, thickness: number, color: number): BufferGeometry {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const direction = end.clone().sub(start);
  const geometry = new BoxGeometry(thickness, thickness, direction.length());
  geometry.applyQuaternion(
    new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), direction.normalize()),
  );
  const middle = start.add(end).multiplyScalar(0.5);
  return tinted(geometry.translate(middle.x, middle.y, middle.z), color);
}

/** 球（灌木）。 */
export function blob(radius: number, x: number, y: number, z: number, color: number): BufferGeometry {
  return tinted(new SphereGeometry(radius, 8, 6).translate(x, y, z), color);
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** 英尺的零件合成一個公尺的幾何。 */
export function assemble(parts: readonly BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries([...parts]);
  const scale = ftToM(1);
  return merged.scale(scale, scale, scale);
}
