// 車頂綁著衝浪板的四輪驅動休旅車：方正的兩廂車身、尾門上的備胎、車頂架上往後伸出 3 英尺的長板。
// 本地 X = 橫向、−Z = 前方；外框的底面（X × Z）要剛好等於 obstacleTypes.ts 的預設碰撞盒（6.6 × 19 英尺）。
import { CylinderGeometry, type BufferGeometry } from 'three';
import { lampBoxes, LENS, slopedPanel, wheelParts, type LampPair } from './deliveryVan';
import { tinted } from './lotProps';
import { assemble, box } from './partShapes';

const GLASS = 0x1c262e;
const TRIM = 0x24272a;

// 休旅車警報時會亮的燈：頭燈、前方向燈、尾燈。
const LAMPS: readonly LampPair[] = [
  { w: 1, h: 0.6, x: 2.3, y: 2.6, z: -9.22, lens: LENS.head },
  { w: 0.5, h: 0.25, x: 2.55, y: 2.25, z: -9.22, lens: LENS.amber },
  { w: 0.4, h: 1.2, x: 2.7, y: 2.3, z: 5.92, lens: LENS.red },
];

/** 軸沿 Z 的圓柱（尾門上的備胎），中心在 (0, y, z)。 */
function disc(radius: number, depth: number, y: number, z: number, color: number): BufferGeometry {
  return tinted(new CylinderGeometry(radius, radius, depth, 14).rotateX(Math.PI / 2).translate(0, y, z), color);
}

/** 衝浪板休旅車的幾何（公尺，底面在 y = 0，帶頂點顏色）。 */
export function createSurfSuvGeometry(): BufferGeometry {
  const paint = 0x8fae9c;
  const shade = 0x7a9988;
  const board = 0x5fd0c8;
  const coral = 0xf0735a;
  const boardY = 6.34;
  const parts: BufferGeometry[] = [
    // 底盤、下車身、引擎蓋的隆起、車廂、車頂。
    box(5.2, 0.6, 14.6, 0, 0.9, -1.65, TRIM),
    box(6, 2.3, 15.1, 0, 1.3, -1.65, paint),
    box(4.8, 0.14, 3.2, 0, 3.6, -7.3, shade),
    box(5.6, 2.2, 10.4, 0, 3.6, 0.6, paint),
    box(5.7, 0.22, 10.7, 0, 5.8, 0.55, paint),
    // 擋風玻璃與後窗。
    slopedPanel(5.3, 0.1, 0, 3.7, -5.5, 5.75, -4.62, GLASS),
    slopedPanel(0.16, 0.14, -2.72, 3.6, -5.5, 5.8, -4.6, paint),
    slopedPanel(0.16, 0.14, 2.72, 3.6, -5.5, 5.8, -4.6, paint),
    box(4.8, 1.5, 0.06, 0, 4, 5.8, GLASS),
    // 儀表板：從側面看不會穿過 A 柱下方的空隙。
    box(5.5, 1, 0.45, 0, 3.6, -4.825, GLASS),
    // 水箱罩、前後保險桿、護板、車牌。
    box(3, 1, 0.08, 0, 2.3, -9.22, TRIM),
    box(6.2, 0.8, 0.55, 0, 1.1, -9.225, TRIM),
    box(2.4, 0.3, 0.4, 0, 0.95, -9.3, 0x9da3a8),
    box(6.2, 0.8, 0.6, 0, 1.1, 6.2, TRIM),
    box(0.9, 0.4, 0.05, -1.9, 2.1, 5.92, 0xe8e6dc),
    // 備胎：胎、輪圈、中心蓋。
    disc(1.25, 0.5, 3.3, 6.2, 0x161718),
    disc(0.78, 0.54, 3.3, 6.21, 0x9da3a8),
    disc(0.3, 0.56, 3.3, 6.22, TRIM),
    // 長板：中段、收窄的板頭與板尾、珊瑚色的中線、尾舵。
    box(1.9, 0.24, 8.4, 0, boardY, 3.2, board),
    box(1.6, 0.24, 0.8, 0, boardY, -1.4, board),
    box(1.15, 0.24, 0.7, 0, boardY, -2.15, board),
    box(0.6, 0.24, 0.5, 0, boardY, -2.75, board),
    box(1.6, 0.24, 0.9, 0, boardY, 7.85, board),
    box(1.15, 0.24, 0.7, 0, boardY, 8.65, board),
    box(0.6, 0.24, 0.5, 0, boardY, 9.25, board),
    box(0.32, 0.25, 11.6, 0, boardY, 3.2, coral),
    slopedPanel(0.07, 0.4, 0, boardY + 0.2, 8, boardY + 0.75, 8.7, coral),
  ];
  // 車頂架的橫桿與綁帶。
  for (const z of [-1.6, 4.4]) {
    parts.push(
      box(5.4, 0.12, 0.22, 0, 6.2, z, TRIM),
      box(1.96, 0.3, 0.16, 0, 6.32, z + 0.3, TRIM),
    );
  }
  for (const side of [-1, 1]) {
    const skin = side * 3.02;
    const glassX = side * 2.8;
    parts.push(
      // 側窗（三片）、門縫、門把、側踏板、車頂縱桿。
      box(0.06, 1.6, 2.9, glassX, 3.95, -2.9, GLASS),
      box(0.06, 1.6, 2.9, glassX, 3.95, 0.3, GLASS),
      box(0.06, 1.6, 3.1, glassX, 3.95, 3.6, GLASS),
      box(0.04, 2.1, 0.06, skin, 1.5, -4.5, shade),
      box(0.04, 2.1, 0.06, skin, 1.5, -1.3, shade),
      box(0.04, 2.1, 0.06, skin, 1.5, 1.4, shade),
      box(0.06, 0.1, 0.4, skin, 3.2, -1.9, TRIM),
      box(0.06, 0.1, 0.4, skin, 3.2, 0.8, TRIM),
      box(0.04, 0.5, 15.1, skin, 1.3, -1.65, shade),
      box(0.35, 0.14, 5.4, side * 3.05, 1.25, -1.6, TRIM),
      box(0.12, 0.14, 9.6, side * 2.6, 6.02, 0.6, TRIM),
      // 後照鏡，再加頭燈、方向燈、尾燈的鏡片（LAMPS）。
      box(0.5, 0.45, 0.28, side * 3.05, 3.7, -4.5, TRIM),
      ...lampBoxes(LAMPS, side, false),
      // 輪拱（深色的內襯與外擴的輪眉）與粗胎。
      box(0.04, 1.8, 3.4, skin, 1.3, -6.4, TRIM),
      box(0.04, 1.8, 3.4, skin, 1.3, 3.2, TRIM),
      box(0.3, 0.22, 3.7, side * 3.1, 3, -6.4, TRIM),
      box(0.3, 0.22, 3.7, side * 3.1, 3, 3.2, TRIM),
      ...wheelParts(1.4, 1, side * 2.7, -6.4),
      ...wheelParts(1.4, 1, side * 2.7, 3.2),
    );
  }
  return assemble(parts);
}

/** 警報時會亮的燈（頭燈、前方向燈、尾燈…）：與車身幾何同一個本地座標（公尺），頂點顏色是亮起來的顏色。 */
export function createSurfSuvLampGeometry(): BufferGeometry {
  return assemble([-1, 1].flatMap((side) => lampBoxes(LAMPS, side, true)));
}
