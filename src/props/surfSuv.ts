// 車頂綁著衝浪板的休旅車（暫用方塊，等 procedural-modeler 的模型）。
// 本地 X = 橫向、−Z = 前方；外框的底面（X × Z）要剛好等於 obstacleTypes.ts 的預設碰撞盒。
import type { BufferGeometry } from 'three';
import { assemble, box } from './partShapes';

/** 車頂綁著衝浪板的休旅車（暫用方塊，等 procedural-modeler 的模型）。的幾何（公尺，底面在 y = 0，帶頂點顏色）。 */
export function createSurfSuvGeometry(): BufferGeometry {
  return assemble([
    box(6.6, 4.8, 19, 0, 0, 0, 0x4d6b7a),
    box(5.94, 0.6, 17.1, 0, 4.8, 0, 0x8a8a8a),
    box(5.28, 0.3, 15.2, 0, 5.4, 0, 0x4d6b7a),
    box(4.62, 0.3, 13.3, 0, 5.7, 0, 0x8a8a8a),
  ]);
}
