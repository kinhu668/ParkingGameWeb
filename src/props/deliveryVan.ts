// 並排停車的包裹貨車（step van）：高高的貨廂、短斜鼻、大擋風玻璃、滑門、捲門、後踏板。
// 本地 X = 橫向、−Z = 前方；外框的底面（X × Z）要剛好等於 obstacleTypes.ts 的預設碰撞盒（7 × 20 英尺）。
import { BoxGeometry, type BufferGeometry } from 'three';
import { tinted } from './lotProps';
import { assemble, box, roller } from './partShapes';

const TYRE = 0x161718;
const RIM = 0x8b9196;
const GLASS = 0x1c262e;
const TRIM = 0x24272a;

/** 燈的鏡片顏色：off 是車身上沒亮的樣子，lit 是警報亮起來的顏色。 */
export const LENS = {
  head: { off: 0xf3efd9, lit: 0xfff4d6 },
  amber: { off: 0xf2a23a, lit: 0xffb02e },
  red: { off: 0xc2201c, lit: 0xff2a1f },
} as const;

/** 警報時會亮的一對燈（左右對稱，英尺）：鏡片的寬、高、離中線的距離、底面高度、Z（負的在車頭、正的在車尾）。 */
export interface LampPair {
  readonly w: number;
  readonly h: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly lens: { readonly off: number; readonly lit: number };
}

// 包裹貨車警報時會亮的燈：頭燈、前方向燈、尾燈（紅）、後警示燈（橘）。倒車燈與示廓燈不閃。
const LAMPS: readonly LampPair[] = [
  { w: 0.9, h: 0.9, x: 2.4, y: 2.9, z: -9.84, lens: LENS.head },
  { w: 0.5, h: 0.4, x: 2.5, y: 2.3, z: -9.84, lens: LENS.amber },
  { w: 0.45, h: 0.9, x: 2.95, y: 2.3, z: 9.62, lens: LENS.red },
  { w: 0.45, h: 0.5, x: 2.95, y: 3.3, z: 9.62, lens: LENS.amber },
];

/** 斜板（擋風玻璃、引擎蓋）：寬沿 X，從 (fromY, fromZ) 斜到 (toY, toZ)。 */
export function slopedPanel(
  width: number,
  thickness: number,
  x: number,
  fromY: number,
  fromZ: number,
  toY: number,
  toZ: number,
  color: number,
): BufferGeometry {
  const dy = toY - fromY;
  const dz = toZ - fromZ;
  const geometry = new BoxGeometry(width, thickness, Math.hypot(dy, dz))
    .rotateX(Math.atan2(-dy, dz))
    .translate(x, (fromY + toY) / 2, (fromZ + toZ) / 2);
  return tinted(geometry, color);
}

/** 一顆輪子：胎、輪圈、輪轂蓋。x 是輪子中心。 */
export function wheelParts(radius: number, width: number, x: number, z: number): BufferGeometry[] {
  return [
    roller(radius, width, x, radius, z, TYRE),
    roller(radius * 0.56, width + 0.06, x, radius, z, RIM),
    roller(radius * 0.22, width + 0.14, x, radius, z, TRIM),
  ];
}

/**
 * 一側（side = ±1）的鏡片盒。lit = false 是車身上沒亮的鏡片；lit = true 是警報的疊加層：
 * 亮起來的顏色，並沿燈朝的方向（車頭 −Z、車尾 +Z）多凸出 0.02 英尺，剛好蓋在車身的鏡片外面。
 */
export function lampBoxes(lamps: readonly LampPair[], side: number, lit: boolean): BufferGeometry[] {
  return lamps.map(({ w, h, x, y, z, lens }) =>
    box(w, h, 0.08, side * x, y, lit ? z + Math.sign(z) * 0.02 : z, lit ? lens.lit : lens.off),
  );
}

/** 包裹貨車的幾何（公尺，底面在 y = 0，帶頂點顏色）。 */
export function createDeliveryVanGeometry(): BufferGeometry {
  const body = 0xefece3;
  const panel = 0xdedbd0;
  const band = 0x1f4e8c;
  const stripe = 0xe8862e;
  const amber = LENS.amber.off;
  const red = LENS.red.off;
  const half = 3.2;
  const parts: BufferGeometry[] = [
    // 底盤、貨廂、駕駛艙下半、鼻子。
    box(5.6, 0.8, 18.6, 0, 0.8, 0, TRIM),
    box(half * 2, 7.5, 13.1, 0, 1.5, 3.05, body),
    box(half * 2, 3.3, 5, 0, 1.5, -6, body),
    box(6.2, 3.6, 4.2, 0, 4.8, -5.6, 0x2b3035),
    // A 柱：補上擋風玻璃與側窗之間的空隙。
    slopedPanel(0.3, 0.75, -3.05, 4.8, -8.15, 8.4, -7.4, body),
    slopedPanel(0.3, 0.75, 3.05, 4.8, -8.15, 8.4, -7.4, body),
    box(half * 2, 0.6, 5.1, 0, 8.4, -6.05, body),
    box(6.2, 2.6, 1.4, 0, 1.5, -9.1, body),
    slopedPanel(6.2, 0.12, 0, 4.1, -9.8, 4.8, -8.4, body),
    // 擋風玻璃（中柱分成兩片）與雨刷。
    slopedPanel(6, 0.1, 0, 4.8, -8.45, 8.4, -7.7, GLASS),
    slopedPanel(0.14, 0.14, 0, 4.8, -8.47, 8.4, -7.72, body),
    slopedPanel(0.06, 0.06, -1.5, 4.9, -8.5, 5.9, -8.3, TRIM),
    slopedPanel(0.06, 0.06, 1.5, 4.9, -8.5, 5.9, -8.3, TRIM),
    // 水箱罩、前保險桿、車牌。
    box(3.4, 1.3, 0.08, 0, 2.4, -9.84, TRIM),
    box(6.6, 0.7, 0.5, 0, 1.2, -9.75, TRIM),
    box(1, 0.45, 0.06, 0, 1.35, -10, 0xe8e6dc).translate(0, 0, 0.03),
    // 捲門：門框、橫向的肋、把手、後踏板、車牌。
    box(5.6, 6.5, 0.08, 0, 2.2, 9.6, panel),
    box(0.9, 0.12, 0.14, 0, 2.5, 9.66, TRIM),
    box(6.8, 0.35, 0.95, 0, 1.15, 9.525, TRIM),
    box(1, 0.45, 0.05, 0, 1.6, 9.63, 0xe8e6dc),
    // 車頂：前緣的示廓燈座、車頂的橫肋。
    box(half * 2, 0.12, 0.3, 0, 9, -8.4, TRIM),
  ];
  for (let rib = 0; rib < 12; rib += 1) {
    parts.push(box(5.5, 0.07, 0.05, 0, 2.75 + rib * 0.5, 9.65, 0xbdbab0));
  }
  for (let rib = 0; rib < 5; rib += 1) {
    parts.push(box(6.3, 0.08, 0.25, 0, 9, -2.4 + rib * 2.8, panel));
  }
  for (const x of [-2.4, -0.5, 0, 0.5, 2.4]) {
    parts.push(box(0.3, 0.14, 0.16, x, 9.12, -8.42, amber));
  }
  for (const x of [-2.6, -0.4, 0, 0.4, 2.6]) {
    parts.push(box(0.3, 0.12, 0.08, x, 8.75, 9.62, red));
  }
  for (const side of [-1, 1]) {
    const skin = side * (half + 0.02);
    parts.push(
      // 塗裝：一條寬的深藍色帶與細的橘色線。
      box(0.04, 1.3, 18.1, skin, 3.4, 0.55, band),
      box(0.04, 0.2, 18.1, skin, 3.1, 0.55, stripe),
      // 滑門：車窗、門縫、把手、下方的踏階。
      box(0.06, 3, 3.9, side * (half - 0.08), 5.1, -5.9, GLASS),
      box(0.05, 6.6, 0.07, skin, 1.7, -3.75, TRIM),
      box(0.05, 3.2, 0.07, skin, 1.7, -8.05, TRIM),
      box(0.05, 0.07, 4.3, skin, 8.3, -5.9, TRIM),
      box(0.08, 0.12, 0.5, skin, 4.1, -4.3, TRIM),
      box(0.3, 0.2, 2.6, side * 3.05, 1.3, -5, TRIM),
      // 後照鏡：兩支桿與直立的鏡子。
      box(0.3, 0.06, 0.06, side * 3.3, 6.9, -8.2, TRIM),
      box(0.3, 0.06, 0.06, side * 3.3, 5.6, -8.2, TRIM),
      box(0.1, 1.7, 0.6, side * 3.45, 5.4, -8.3, TRIM),
      // 頭燈、方向燈、尾燈（紅）、警示燈（橘）的鏡片（LAMPS），再加倒車燈。
      ...lampBoxes(LAMPS, side, false),
      box(0.45, 0.35, 0.08, side * 2.95, 3.9, 9.62, 0xeeeade),
      // 側面的示廓燈與輪拱。
      box(0.05, 0.14, 0.3, skin, 8.7, -3.2, amber),
      box(0.05, 0.14, 0.3, skin, 8.7, 9.2, red),
      box(0.05, 1.5, 3.3, skin, 1.5, -6.6, TRIM),
      box(0.05, 1.5, 3.3, skin, 1.5, 5.2, TRIM),
      ...wheelParts(1.35, 0.9, side * 2.8, -6.6),
      ...wheelParts(1.35, 0.9, side * 2.8, 5.2),
    );
    // 貨廂側板的接縫。
    for (let seam = 0; seam < 4; seam += 1) {
      parts.push(box(0.03, 3.9, 0.06, skin, 4.9, -1 + seam * 2.8, panel));
    }
  }
  return assemble(parts);
}

/** 警報時會亮的燈（頭燈、前方向燈、尾燈…）：與車身幾何同一個本地座標（公尺），頂點顏色是亮起來的顏色。 */
export function createDeliveryVanLampGeometry(): BufferGeometry {
  return assemble([-1, 1].flatMap((side) => lampBoxes(LAMPS, side, true)));
}
