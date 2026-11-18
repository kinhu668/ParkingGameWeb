// 柱子：方形水泥柱（暫用方塊，等 procedural-modeler 的模型）。
// 本地 X = 橫向、−Z = 前方；外框的底面（X × Z）要剛好等於 obstacleTypes.ts 的預設碰撞盒。
import type { BufferGeometry } from 'three';
import { assemble, box } from './partShapes';

/** 柱子的幾何（公尺，底面在 y = 0，帶頂點顏色）。 */
export function createPillarGeometry(): BufferGeometry {
  return assemble([
    box(2, 8.8, 2, 0, 0, 0, 0xb5b1a8),
    box(1.8, 1.1, 1.8, 0, 8.8, 0, 0x8a8a8a),
    box(1.6, 0.55, 1.6, 0, 9.9, 0, 0xb5b1a8),
    box(1.4, 0.55, 1.4, 0, 10.45, 0, 0x8a8a8a),
  ]);
}
