// 路緣邊的消防栓：美式乾管型。薄的方形水泥墊、帶螺栓的圓形底法蘭、往法蘭略為變粗的短栓身、
// 左右（±X）兩個小的水帶接頭、正面（−Z）一個大的消防車接頭（都有蓋子與蓋頂的方頭）、
// 栓身與頂蓋之間的一圈箍、圓頂的頂蓋與頂端的五角操作螺帽。安全黃的栓身、白色的頂蓋與接頭蓋。
// 本地 X = 橫向、−Z = 前方；外框的底面（X × Z）要剛好等於 obstacleTypes.ts 的預設碰撞盒（1.4 × 1.4 ft）。
import { CylinderGeometry, SphereGeometry, type BufferGeometry } from 'three';
import { tinted } from './lotProps';
import { assemble, box, cylinder, roller } from './partShapes';

const CONCRETE = 0x8f8b82;
const YELLOW = 0xd9a514;
const YELLOW_DIRTY = 0xb4880f;
const YELLOW_DARK = 0x9c760c;
const WHITE = 0xe9e7e0;
const WHITE_DIRTY = 0xc3c1b9;
const STEEL = 0x70757b;

// 接頭的中心高度（英尺）。
const NOZZLE_Y = 1.5;

/** 軸沿 Z 的圓柱（正面的接頭）：中心在 (0, y, z)。 */
function frontRoller(radius: number, length: number, y: number, z: number, color: number): BufferGeometry {
  return tinted(new CylinderGeometry(radius, radius, length, 12).rotateX(Math.PI / 2).translate(0, y, z), color);
}

/** 法蘭上的一圈六角螺栓頭：count 顆，排在半徑 ringRadius 的圓上，底面在 y。 */
function boltParts(count: number, ringRadius: number, y: number, boltRadius: number): BufferGeometry[] {
  const parts: BufferGeometry[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = ((index + 0.5) / count) * Math.PI * 2;
    const x = Math.cos(angle) * ringRadius;
    const z = Math.sin(angle) * ringRadius;
    parts.push(cylinder(boltRadius, boltRadius, boltRadius * 1.4, x, y, z, STEEL, 6));
  }
  return parts;
}

/** 消防栓的幾何（公尺，底面在 y = 0，帶頂點顏色）。 */
export function createFireHydrantGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [
    // 水泥墊（最寬的一塊，剛好 1.4 × 1.4 ft）與底法蘭。
    box(1.4, 0.1, 1.4, 0, 0, 0, CONCRETE),
    cylinder(0.55, 0.55, 0.1, 0, 0.1, 0, YELLOW_DIRTY),
    ...boltParts(8, 0.48, 0.2, 0.045),
    // 栓身：下段往法蘭變粗（濺了泥水，比較髒），中間一圈接合箍，上段先直、到接頭那一節再變粗。
    cylinder(0.33, 0.42, 0.55, 0, 0.2, 0, YELLOW_DIRTY),
    cylinder(0.43, 0.43, 0.08, 0, 0.75, 0, YELLOW_DARK),
    cylinder(0.33, 0.33, 0.37, 0, 0.83, 0, YELLOW),
    cylinder(0.38, 0.33, 0.1, 0, 1.2, 0, YELLOW),
    cylinder(0.38, 0.38, 0.55, 0, 1.3, 0, YELLOW),
    // 左右的水帶接頭：一根橫穿栓身的短管，兩端各一個蓋子與方頭。
    roller(0.15, 1, 0, NOZZLE_Y, 0, YELLOW),
    // 正面的消防車接頭：比較粗。
    frontRoller(0.21, 0.27, NOZZLE_Y, -0.385, YELLOW),
    frontRoller(0.255, 0.13, NOZZLE_Y, -0.565, WHITE),
    box(0.11, 0.11, 0.05, 0, NOZZLE_Y - 0.055, -0.655, STEEL),
    // 栓身與頂蓋之間的箍（上面一圈螺栓）、頂蓋（短的直段加圓頂）、墊圈與五角操作螺帽。
    cylinder(0.45, 0.45, 0.08, 0, 1.85, 0, WHITE_DIRTY),
    ...boltParts(6, 0.42, 1.93, 0.032),
    cylinder(0.37, 0.39, 0.15, 0, 1.93, 0, WHITE),
    tinted(
      new SphereGeometry(0.37, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.8, 1).translate(0, 2.08, 0),
      WHITE,
    ),
    cylinder(0.11, 0.13, 0.05, 0, 2.35, 0, WHITE_DIRTY),
    cylinder(0.075, 0.09, 0.14, 0, 2.4, 0, STEEL, 5),
  ];
  for (const side of [-1, 1]) {
    parts.push(roller(0.185, 0.13, side * 0.555, NOZZLE_Y, 0, WHITE));
    parts.push(box(0.06, 0.1, 0.1, side * 0.65, NOZZLE_Y - 0.05, 0, STEEL));
  }
  return assemble(parts);
}
