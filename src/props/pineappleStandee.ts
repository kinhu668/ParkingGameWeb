// 巨型鳳梨吉祥物立牌（暫用方塊，等 procedural-modeler 的模型）。
// 本地 X = 橫向、−Z = 前方；外框的底面（X × Z）要剛好等於 obstacleTypes.ts 的預設碰撞盒。
import type { BufferGeometry } from 'three';
import { assemble, box } from './partShapes';

/** 巨型鳳梨吉祥物立牌（暫用方塊，等 procedural-modeler 的模型）。的幾何（公尺，底面在 y = 0，帶頂點顏色）。 */
export function createPineappleStandeeGeometry(): BufferGeometry {
  return assemble([
    box(4, 7.2, 4, 0, 0, 0, 0xf2b632),
    box(3.6, 0.9, 3.6, 0, 7.2, 0, 0x8a8a8a),
    box(3.2, 0.45, 3.2, 0, 8.1, 0, 0xf2b632),
    box(2.8, 0.45, 2.8, 0, 8.55, 0, 0x8a8a8a),
  ]);
}
