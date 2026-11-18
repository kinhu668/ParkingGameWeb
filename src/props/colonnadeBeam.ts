// 柱列的橫樑：跨在相鄰兩根柱子（pillar.ts）的柱頭上，讓一排柱子讀起來是一道騎樓的框架。
// 樑身、略寬的深色壓頂、兩側的滴水線、模板接縫、兩端墊在柱頭上的支承鋼板、跨中底下的一盞筒燈。
// 本地 Z = 樑的長向；最寬的地方（支承鋼板）也只有 1.16 ft，俯視時 2 × 2 ft 的柱頭在樑的兩側都還看得到。
import type { BufferGeometry } from 'three';
import { assemble, box } from './partShapes';

// 水泥與鋼的顏色與 pillar.ts 相同，樑和柱頭才接得起來。
const CONCRETE = 0xb5b1a8;
const CONCRETE_DARK = 0x97938a;
const STEEL = 0x8b9096;
const LAMP_HOUSING = 0x242528;
const LAMP_LENS = 0xf2e3bd;

/** 柱列頂上的橫樑（公尺，帶頂點顏色）：跨在相鄰兩根柱子的柱頭上。本地 Z = 樑的長向，中心在原點，樑身的底面在 y = 0。 */
export function createColonnadeBeamGeometry(spanFt: number): BufferGeometry {
  const parts: BufferGeometry[] = [
    // 樑身與壓頂：壓頂比樑身略寬、顏色較深，兩側各挑出一道簷線；相鄰的樑在柱頭上對接。
    box(0.92, 1, spanFt, 0, 0, 0, CONCRETE),
    box(1.04, 0.1, spanFt, 0, 1, 0, CONCRETE_DARK),
    // 滴水線：靠近樑底、沿兩側通長的一道深色線；兩端各縮 0.02 ft，才不會和樑的端面疊在同一個平面上。
    box(0.96, 0.07, spanFt - 0.04, 0, 0.12, 0, CONCRETE_DARK),
    // 跨中底下的筒燈：深色燈殼，暖白的燈罩略凸出殼底。
    box(0.46, 0.2, 0.8, 0, -0.2, 0, LAMP_HOUSING),
    box(0.3, 0.06, 0.62, 0, -0.24, 0, LAMP_LENS),
  ];
  // 模板接縫：大約每 3.5 ft 一道略凸的深色線，繞過樑的兩側與底面。
  const panels = Math.max(2, Math.round(spanFt / 3.5));
  for (let seam = 1; seam < panels; seam += 1) {
    parts.push(box(0.94, 1.02, 0.05, 0, -0.01, (seam / panels - 0.5) * spanFt, CONCRETE_DARK));
  }
  // 支承鋼板：兩端各一塊，墊在樑和柱頭之間，比樑身寬所以從兩側看得到；同樣比端面縮 0.02 ft。
  for (const end of [-1, 1]) {
    parts.push(box(1.16, 0.1, 0.9, 0, 0, end * (spanFt / 2 - 0.47), STEEL));
  }
  return assemble(parts);
}
