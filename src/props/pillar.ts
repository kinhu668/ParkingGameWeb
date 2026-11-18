// 柱子：有頂棚的卸貨區／停車場的方形水泥結構柱。底座、柱身（模板接縫）、黃黑相間的警示漆、
// 四個轉角的橡膠護角（上下有鋼箍）、頂端的柱頭。
// 本地 X = 橫向、−Z = 前方；外框的底面（X × Z）要剛好等於 obstacleTypes.ts 的預設碰撞盒（2 × 2 ft）。
import type { BufferGeometry } from 'three';
import { assemble, box } from './partShapes';

const CONCRETE = 0xb5b1a8;
const CONCRETE_DARK = 0x97938a;
const HAZARD_YELLOW = 0xe6b91e;
const HAZARD_BLACK = 0x1c1c1e;
const RUBBER = 0x242528;
const STEEL = 0x8b9096;

/** 柱子的幾何（公尺，底面在 y = 0，帶頂點顏色）。 */
export function createPillarGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [
    // 底座（最寬的一塊，剛好 2 × 2 ft）與柱身。
    box(2, 0.3, 2, 0, 0, 0, CONCRETE_DARK),
    box(1.76, 9.5, 1.76, 0, 0.3, 0, CONCRETE),
    // 柱頭：先一圈托座，再一塊與底座同寬的頂板。
    box(1.88, 0.45, 1.88, 0, 9.8, 0, CONCRETE_DARK),
    box(2, 0.75, 2, 0, 10.25, 0, CONCRETE),
  ];
  // 模板接縫：柱身上幾道略凹的深色線。
  for (const y of [5.4, 7.4, 9.2]) {
    parts.push(box(1.78, 0.05, 1.78, 0, y, 0, CONCRETE_DARK));
  }
  // 警示漆：從底座到 3.5 ft，黃黑相間；最下面兩道被輪胎蹭得比較髒。
  const stripeHeight = 0.4;
  for (let stripe = 0; stripe < 8; stripe += 1) {
    const yellow = stripe % 2 === 0;
    const scuffed = stripe < 2;
    const color = yellow ? (scuffed ? 0xb9962a : HAZARD_YELLOW) : HAZARD_BLACK;
    parts.push(box(1.8, stripeHeight, 1.8, 0, 0.3 + stripe * stripeHeight, 0, color));
  }
  // 轉角的橡膠護角，上下各一道鋼箍；保險桿高度有一段磨亮的擦痕。
  for (const sideX of [-1, 1]) {
    for (const sideZ of [-1, 1]) {
      const x = sideX * 0.88;
      const z = sideZ * 0.88;
      parts.push(box(0.24, 3.2, 0.24, x, 0.3, z, RUBBER));
      parts.push(box(0.24, 0.3, 0.24, x, 1.55, z, 0x4a4b4e));
      for (const y of [0.42, 3.26]) {
        parts.push(box(0.26, 0.12, 0.26, sideX * 0.87, y, sideZ * 0.87, STEEL));
      }
    }
  }
  return assemble(parts);
}
