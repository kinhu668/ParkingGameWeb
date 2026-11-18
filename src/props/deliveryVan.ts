// 廂型貨車（暫用方塊，等 procedural-modeler 的模型）。
// 本地 X = 橫向、−Z = 前方；外框的底面（X × Z）要剛好等於 obstacleTypes.ts 的預設碰撞盒。
import type { BufferGeometry } from 'three';
import { assemble, box } from './partShapes';

/** 廂型貨車（暫用方塊，等 procedural-modeler 的模型）。的幾何（公尺，底面在 y = 0，帶頂點顏色）。 */
export function createDeliveryVanGeometry(): BufferGeometry {
  return assemble([
    box(7, 7.2, 20, 0, 0, 0, 0xf1efe8),
    box(6.3, 0.9, 18, 0, 7.2, 0, 0x8a8a8a),
    box(5.6, 0.45, 16, 0, 8.1, 0, 0xf1efe8),
    box(4.9, 0.45, 14, 0, 8.55, 0, 0x8a8a8a),
  ]);
}
