// 車排盡頭的安全島：路緣圍起來的花台（暫用方塊，等 procedural-modeler 的模型）。路燈本身由環境佈局擺在島的中心。
// 本地 X = 橫向、−Z = 前方；外框的底面（X × Z）要剛好等於 obstacleTypes.ts 的預設碰撞盒。
import type { BufferGeometry } from 'three';
import { assemble, box } from './partShapes';

/** 安全島的幾何（公尺，底面在 y = 0，帶頂點顏色）。 */
export function createLampIslandGeometry(): BufferGeometry {
  return assemble([
    box(8, 0.5, 17, 0, 0, 0, 0xb9b4a8),
    box(7, 0.2, 16, 0, 0.5, 0, 0x5b4a3a),
    box(1.6, 0.6, 1.6, 0, 0.5, 0, 0xa8a49a),
    box(2, 1.2, 2, 0, 0.5, -5, 0x4f7a3a),
  ]);
}
