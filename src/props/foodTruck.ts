// 餐車：車身、遮陽棚、出餐檯（暫用方塊，等 procedural-modeler 的模型）。
// 本地 X = 橫向、−Z = 前方；外框的底面（X × Z）要剛好等於 obstacleTypes.ts 的預設碰撞盒。
import type { BufferGeometry } from 'three';
import { assemble, box } from './partShapes';

/** 餐車的幾何（公尺，底面在 y = 0，帶頂點顏色）。 */
export function createFoodTruckGeometry(): BufferGeometry {
  return assemble([
    box(10, 8, 22, 0, 0, 0, 0xe9c46a),
    box(9, 1, 19.8, 0, 8, 0, 0x8a8a8a),
    box(8, 0.5, 17.6, 0, 9, 0, 0xe9c46a),
    box(7, 0.5, 15.4, 0, 9.5, 0, 0x8a8a8a),
  ]);
}
