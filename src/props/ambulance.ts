// 停在路邊的箱型救護車（美式 Type III）：廂型車的駕駛艙，後面接一個更高、更寬的醫療艙。
// 本地 X = 橫向（+X 是右側）、−Z = 前方；外框的底面（X × Z）要剛好是 7 × 20 英尺（碰撞盒）：
// 後照鏡尖端在 x = ±3.5、前車牌在 z = −10、後踏板保險桿在 z = +10。
// 識別標誌是車廂兩側青綠色的心電圖折線；不放紅十字、生命之星、號碼或任何真實單位的名稱。
// 字樣不做成幾何，由 AMBULANCE_LABELS_FT 的平面牌子貼上去。
import type { BufferGeometry } from 'three';
import { LENS, slopedPanel, wheelParts } from './deliveryVan';
import { assemble, bar, box, roller } from './partShapes';

const BODY = 0xf2f1ea;
const PANEL = 0xdcdad2;
const ORANGE = 0xe8742a;
const TEAL = 0x12807a;
const TRIM = 0x24272a;
const GLASS = 0x1c262e;
const GREY = 0x8b9196;
const PLATE = 0xe8e6dc;

// 駕駛艙與醫療艙的半寬、醫療艙的前後緣與車頂（英尺）。
const CAB_HALF = 2.9;
const BOX_HALF = 3.25;
const BOX_FRONT = -4.6;
const BOX_REAR = 9.6;
const BOX_ROOF = 8.3;
const BOX_LENGTH = BOX_REAR - BOX_FRONT;
const BOX_MID = (BOX_FRONT + BOX_REAR) / 2;
// 車頂燈條（在車廂前上緣、駕駛艙上方）：鏡片底面的高度與 Z。
const BAR_Y = BOX_ROOF + 0.26;
const BAR_Z = -4.05;

/** 字樣牌子的中心（英尺）：rightFt 是離中線的距離（貼在車皮外一點點，兩側對稱）、aheadFt 朝車頭為正、yFt 是中心高度。 */
export const AMBULANCE_LABELS_FT: {
  side: { rightFt: number; aheadFt: number; yFt: number; widthFt: number; heightFt: number };
  unit: { rightFt: number; aheadFt: number; yFt: number; widthFt: number; heightFt: number };
  rear: { aheadFt: number; yFt: number; widthFt: number; heightFt: number };
} = {
  // 車廂側面、色帶與上緣警示燈之間的白色面板。
  side: { rightFt: BOX_HALF + 0.04, aheadFt: -3.6, yFt: 6.85, widthFt: 9, heightFt: 0.9 },
  // 車廂側面後段、色帶上方（後置物櫃的上面）。
  unit: { rightFt: BOX_HALF + 0.04, aheadFt: -7.9, yFt: 5.3, widthFt: 2.4, heightFt: 0.7 },
  // 車尾兩扇門上方的橫板。
  rear: { aheadFt: -(BOX_REAR + 0.04), yFt: 7.15, widthFt: 3.6, heightFt: 0.7 },
};

type LampGroup = 'left' | 'right' | 'rear';

/** 警示燈的一顆鏡片（英尺）：盒子的寬（X）、高、長（Z），中心的 x、z 與底面高度 y。 */
interface Lamp {
  group: LampGroup;
  w: number;
  h: number;
  d: number;
  x: number;
  y: number;
  z: number;
  lens: { off: number; lit: number };
  /** 鏡片朝哪邊：front = −Z、back = +Z、side = 朝外（±X）、all = 四面都看得到（車頂燈條）。 */
  facing: 'front' | 'back' | 'side' | 'all';
}

const RED = { off: 0x8e1a17, lit: LENS.red.lit };
const CLEAR = { off: 0xd9dee0, lit: 0xf4f8ff };

// 警示燈只有這一張表：車身上沒亮的鏡片與亮起來的疊加層都從這裡建。
// left / right 組是左右兩側的紅燈（車頂燈條的右半是透明白）；rear 組是橘燈。
const LAMPS: readonly Lamp[] = [-1, 1].flatMap((side): Lamp[] => {
  const group: LampGroup = side < 0 ? 'left' : 'right';
  return [
    // 車頂燈條的半邊：內、外兩節鏡片（左半紅、右半透明白）。
    ...[0.85, 2.15].map(
      (x): Lamp => ({ group, w: 1.2, h: 0.42, d: 0.8, x: side * x, y: BAR_Y, z: BAR_Z, lens: side < 0 ? RED : CLEAR, facing: 'all' }),
    ),
    // 水箱罩上緣兩個角落的紅燈。
    { group, w: 0.5, h: 0.3, d: 0.08, x: side * 0.98, y: 3.29, z: -9.63, lens: RED, facing: 'front' },
    // 車尾上緣角落的紅燈。
    { group, w: 0.8, h: 0.45, d: 0.08, x: side * 2.6, y: 7.6, z: BOX_REAR + 0.02, lens: RED, facing: 'back' },
    // 車廂側面上緣前角、後角的紅燈。
    { group, w: 0.08, h: 0.4, d: 0.8, x: side * (BOX_HALF + 0.02), y: 7.6, z: -3.9, lens: RED, facing: 'side' },
    { group, w: 0.08, h: 0.4, d: 0.8, x: side * (BOX_HALF + 0.02), y: 7.6, z: 8.9, lens: RED, facing: 'side' },
    // 橘燈：車尾上緣內側兩顆、車廂側面上緣中間各一顆。
    { group: 'rear', w: 0.8, h: 0.45, d: 0.08, x: side * 1.6, y: 7.6, z: BOX_REAR + 0.02, lens: LENS.amber, facing: 'back' },
    { group: 'rear', w: 0.08, h: 0.4, d: 0.8, x: side * (BOX_HALF + 0.02), y: 7.6, z: BOX_MID, lens: LENS.amber, facing: 'side' },
  ];
});

/**
 * 一顆鏡片的盒子。lit = false 是車身上沒亮的鏡片；lit = true 是警報的疊加層：
 * 亮起來的顏色，沿鏡片朝的方向多凸出 0.02 英尺（車頂燈條四面都看得到，整圈放大 0.02）。
 */
function lampBox({ w, h, d, x, y, z, lens, facing }: Lamp, lit: boolean): BufferGeometry {
  if (!lit) return box(w, h, d, x, y, z, lens.off);
  const proud = 0.02;
  if (facing === 'all') return box(w + proud * 2, h + proud * 2, d + proud * 2, x, y - proud, z, lens.lit);
  if (facing === 'side') return box(w, h, d, x + Math.sign(x) * proud, y, z, lens.lit);
  return box(w, h, d, x, y, z + (facing === 'front' ? -proud : proud), lens.lit);
}

/** 車廂側面一扇門（置物櫃門、側門）的四條門縫：z 從 zFrom 到 zTo、y 從 yFrom 到 yTo。 */
function sideDoorSeams(x: number, zFrom: number, zTo: number, yFrom: number, yTo: number): BufferGeometry[] {
  const length = zTo - zFrom;
  const middle = (zFrom + zTo) / 2;
  return [
    box(0.05, yTo - yFrom, 0.05, x, yFrom, zFrom, TRIM),
    box(0.05, yTo - yFrom, 0.05, x, yFrom, zTo, TRIM),
    box(0.05, 0.05, length, x, yFrom, middle, TRIM),
    box(0.05, 0.05, length, x, yTo, middle, TRIM),
  ];
}

// 心電圖折線（沿車廂側面的距離、高度）：平的基線、小波、高尖峰、往下的凹、回到基線、再一個小波。
const ECG: readonly (readonly [number, number])[] = [
  [0, 5],
  [2, 5],
  [2.3, 5.35],
  [2.6, 5],
  [3.1, 5],
  [3.3, 4.8],
  [3.65, 6.2],
  [4, 4.3],
  [4.25, 5],
  [4.9, 5],
  [5.3, 5.4],
  [5.7, 5],
  [7.6, 5],
];

/** 一側（side = ±1）的心電圖折線：凸出車皮 0.03 英尺；兩側都從觀看者的左邊畫到右邊。 */
function ecgTrace(side: number): BufferGeometry[] {
  const thickness = 0.1;
  const x = side * (BOX_HALF + 0.03 - thickness / 2);
  const zAt = (along: number): number => BOX_MID - side * (along - 3.8);
  const segments: BufferGeometry[] = [];
  let from: readonly [number, number] | undefined;
  for (const to of ECG) {
    if (from) segments.push(bar([x, from[1], zAt(from[0])], [x, to[1], zAt(to[0])], thickness, TEAL));
    from = to;
  }
  return segments;
}

/** 救護車的幾何（公尺，底面在 y = 0，帶頂點顏色；警示燈是沒亮的鏡片）。 */
export function createAmbulanceGeometry(): BufferGeometry {
  const amber = LENS.amber.off;
  const red = LENS.red.off;
  const rearSkin = BOX_REAR + 0.02;
  const parts: BufferGeometry[] = [
    // 底盤。
    box(4.6, 0.7, 18.6, 0, 0.8, 0, TRIM),
    // 醫療艙：上半一整塊；下半在後輪拱的前後各一塊，中間是深色的輪拱內壁。
    box(BOX_HALF * 2, BOX_ROOF - 2.9, BOX_LENGTH, 0, 2.9, BOX_MID, BODY),
    box(BOX_HALF * 2, 1.6, 7.55, 0, 1.3, -0.825, BODY),
    box(BOX_HALF * 2, 1.6, 3.35, 0, 1.3, 7.925, BODY),
    box(4.3, 1.6, 3.3, 0, 1.3, 4.6, TRIM),
    // 駕駛艙：鼻子、引擎蓋下的車身、腰線以下的門；前輪拱也是挖空的。
    box(CAB_HALF * 2, 1.45, 0.85, 0, 1.5, -9.125, BODY),
    box(CAB_HALF * 2, 1.05, 1.65, 0, 2.95, -8.725, BODY),
    box(CAB_HALF * 2, 1.65, 3.3, 0, 2.95, -6.25, BODY),
    box(CAB_HALF * 2, 1.45, 1.1, 0, 1.5, -5.15, BODY),
    box(4.2, 1.45, 3, 0, 1.5, -7.2, TRIM),
    // 斜的引擎蓋：厚板，上表面從車頭的 4.0 斜到擋風玻璃下緣的 4.6 英尺。
    slopedPanel(CAB_HALF * 2, 0.5, 0, 3.764, -9.417, 4.364, -7.717, BODY),
    // 車窗後面的深色車內、B 柱、駕駛艙車頂、擋風玻璃。
    box(5.6, 2.2, 2.35, 0, 4.6, -5.775, 0x2b3035),
    box(CAB_HALF * 2, 2.2, 0.3, 0, 4.6, -4.75, BODY),
    box(CAB_HALF * 2, 0.25, 2.45, 0, 6.8, -5.825, BODY),
    slopedPanel(5.5, 0.08, 0, 4.6, -7.8, 6.85, -6.95, GLASS),
    // 駕駛艙車頂到醫療艙車頂的楔形導流罩：厚板，下半埋在車頂與車廂裡。
    slopedPanel(5.4, 1, 0, 6.615, -6.553, 7.865, -4.353, BODY),
    // 水箱罩與橫條、前保險桿與下面內縮的深色下擾流、前車牌。
    box(2.6, 1.05, 0.08, 0, 2.6, -9.57, TRIM),
    box(6.3, 0.6, 0.5, 0, 1.3, -9.71, GREY),
    box(5.9, 0.4, 0.36, 0, 0.9, -9.68, TRIM),
    box(1, 0.45, 0.04, 0, 1.38, -9.98, PLATE),
    // 車尾：橫過兩扇門的色帶、門縫、車牌、灰色的後踏板保險桿與止滑面。
    box(BOX_HALF * 2, 0.75, 0.04, 0, 3.05, rearSkin, ORANGE),
    box(BOX_HALF * 2, 0.1, 0.04, 0, 3.86, rearSkin, TEAL),
    box(0.06, 5.1, 0.07, 0, 1.6, 9.63, TRIM),
    box(4.76, 0.05, 0.07, 0, 6.7, 9.63, TRIM),
    box(4.76, 0.05, 0.07, 0, 1.6, 9.63, TRIM),
    box(1, 0.45, 0.05, -1.2, 2.2, 9.64, PLATE),
    box(6.5, 0.35, 0.95, 0, 1, 9.525, GREY),
    box(5.8, 0.04, 0.7, 0, 1.35, 9.6, TRIM),
    // 車頂：冷氣箱、天線、燈條的深色底座與中段（鏡片在 LAMPS；短腳、隔板與端蓋在下面左右各一份）。
    box(2.4, 0.4, 3.2, 0, BOX_ROOF, 5.2, PANEL),
    box(0.2, 0.08, 0.2, 1.9, BOX_ROOF, 0.5, TRIM),
    bar([1.9, BOX_ROOF, 0.5], [1.9, 8.95, 0.75], 0.04, TRIM),
    box(5.9, 0.1, 0.96, 0, BAR_Y - 0.1, BAR_Z, TRIM),
    box(0.5, 0.46, 0.88, 0, BAR_Y, BAR_Z, TRIM),
    // 車尾上緣中間的白色照明燈：深色框與淺灰鏡片（不閃）。
    box(1.1, 0.46, 0.05, 0, 7.6, rearSkin, TRIM),
    box(0.9, 0.3, 0.08, 0, 7.68, rearSkin, CLEAR.off),
    // 警示燈沒亮的鏡片。
    ...LAMPS.map((lamp) => lampBox(lamp, false)),
  ];
  for (const y of [2.72, 2.87, 3.02, 3.17]) {
    parts.push(box(2.4, 0.05, 0.04, 0, y, -9.62, GREY));
  }
  // 車頂的橫肋、駕駛艙車頂前緣的示廓燈（橘）、車尾上緣的示廓燈（紅）。
  for (const z of [-2.2, 1, 7.6, 9.2]) {
    parts.push(box(6.3, 0.06, 0.2, 0, BOX_ROOF, z, PANEL));
  }
  for (const x of [-2.2, -0.5, 0, 0.5, 2.2]) {
    parts.push(box(0.25, 0.1, 0.14, x, 7.05, -6.92, amber));
  }
  for (const x of [-0.45, 0, 0.45]) {
    parts.push(box(0.3, 0.12, 0.08, x, 8.1, rearSkin, red));
  }
  for (const side of [-1, 1]) {
    const cabSkin = side * (CAB_HALF + 0.02);
    const cabSeam = side * (CAB_HALF + 0.03);
    const boxSkin = side * (BOX_HALF + 0.02);
    const boxSeam = side * (BOX_HALF + 0.03);
    parts.push(
      // 擋風玻璃旁的 A 柱、A 柱後面的三角窗、雨刷、側窗。
      slopedPanel(0.3, 0.22, side * 2.75, 4.6, -7.8, 6.85, -6.95, BODY),
      slopedPanel(0.2, 0.8, side * 2.78, 4.459, -7.426, 6.709, -6.576, GLASS),
      slopedPanel(0.05, 0.05, side * 1.3, 4.7, -7.83, 5.5, -7.53, TRIM),
      box(0.04, 2, 2, side * 2.82, 4.7, -5.9, GLASS),
      // 頭燈與橘色方向燈，後面墊一塊深色燈框；保險桿上的霧燈也是深色框加鏡片。
      box(1.52, 0.9, 0.06, side * 2.14, 2.75, -9.56, TRIM),
      box(0.9, 0.66, 0.08, side * 1.95, 2.87, -9.6, LENS.head.off),
      box(0.32, 0.66, 0.08, side * 2.64, 2.87, -9.6, amber),
      box(0.7, 0.26, 0.02, side * 2.2, 1.47, -9.97, TRIM),
      box(0.44, 0.14, 0.02, side * 2.2, 1.53, -9.985, LENS.head.off),
      // 車頂燈條：短腳、兩節鏡片之間的深色隔板、矮的灰色端蓋（鏡片的端面露在端蓋上方，側面也看得到）。
      box(0.45, 0.16, 0.6, side * 1.9, BOX_ROOF, BAR_Z, TRIM),
      box(0.1, 0.46, 0.88, side * 1.5, BAR_Y, BAR_Z, TRIM),
      box(0.2, 0.24, 0.92, side * 2.85, BAR_Y, BAR_Z, GREY),
      // 車廂側面上緣、紅燈與橘燈之間的白色照明燈：深色框與淺灰鏡片（不閃，不在 LAMPS）。
      ...[-0.7, 5.7].flatMap((z) => [
        box(0.06, 0.5, 1.3, boxSkin, 7.55, z, TRIM),
        box(0.08, 0.34, 1.1, side * (BOX_HALF + 0.03), 7.63, z, CLEAR.off),
      ]),
      // 後照鏡：兩支桿、直立的鏡殼與鏡面（鏡殼外緣在 x = ±3.5）。
      box(0.55, 0.07, 0.07, side * 3.13, 5.85, -7.5, TRIM),
      box(0.55, 0.07, 0.07, side * 3.13, 4.95, -7.5, TRIM),
      box(0.12, 1.4, 0.6, side * 3.44, 4.75, -7.5, TRIM),
      box(0.1, 1.2, 0.03, side * 3.44, 4.85, -7.19, 0x9aa7b0),
      // 駕駛艙的塗裝：橘色腰帶與細的青綠線。
      box(0.04, 0.75, 4.95, cabSkin, 3.05, -7.075, ORANGE),
      box(0.04, 0.1, 4.95, cabSkin, 3.86, -7.075, TEAL),
      // 駕駛艙的門：門縫、把手、踏板、前輪拱的外緣。
      box(0.05, 3, 0.06, cabSeam, 1.6, -4.98, TRIM),
      box(0.05, 1.65, 0.06, cabSeam, 2.95, -7.7, TRIM),
      box(0.05, 0.06, 0.75, cabSeam, 1.6, -5.33, TRIM),
      box(0.08, 0.1, 0.45, cabSeam, 4.15, -5.3, TRIM),
      box(0.3, 0.15, 1.1, side * 2.95, 1.3, -5.15, TRIM),
      box(0.12, 0.1, 3.2, side * 2.94, 2.95, -7.2, TRIM),
      // 醫療艙的塗裝、後輪拱的外緣、裙邊的防撞條。
      box(0.04, 0.75, BOX_LENGTH, boxSkin, 3.05, BOX_MID, ORANGE),
      box(0.04, 0.1, BOX_LENGTH, boxSkin, 3.86, BOX_MID, TEAL),
      box(0.14, 0.12, 3.6, side * 3.3, 2.88, 4.6, TRIM),
      box(0.05, 0.22, 7.55, boxSkin, 1.3, -0.825, GREY),
      box(0.05, 0.22, 3.35, boxSkin, 1.3, 7.925, GREY),
      // 色帶下方的置物櫃：中段兩扇、後段一扇，各有小把手。
      ...sideDoorSeams(boxSeam, -1.4, 2.7, 1.6, 2.9),
      box(0.05, 1.3, 0.05, boxSeam, 1.6, 0.65, TRIM),
      ...sideDoorSeams(boxSeam, 6.6, 9.3, 1.6, 2.9),
      box(0.07, 0.12, 0.28, boxSeam, 2.45, 0.3, GREY),
      box(0.07, 0.12, 0.28, boxSeam, 2.45, 1, GREY),
      box(0.07, 0.12, 0.28, boxSeam, 2.45, 7, GREY),
      ...ecgTrace(side),
      // 車尾的門：外側門縫、車窗、扶手，還有尾燈柱（紅、橘、倒車燈）。
      box(0.05, 5.15, 0.07, side * 2.36, 1.6, 9.63, TRIM),
      box(1.45, 1.6, 0.06, side * 1.3, 4.6, 9.61, GLASS),
      box(0.07, 1.3, 0.14, side * 0.3, 4.3, 9.67, GREY),
      box(0.5, 0.6, 0.08, side * 2.8, 5.5, rearSkin, red),
      box(0.5, 0.6, 0.08, side * 2.8, 4.85, rearSkin, amber),
      box(0.5, 0.5, 0.08, side * 2.8, 4.3, rearSkin, 0xeeeade),
      // 輪子：前輪單胎；後輪較寬、輪轂凸出（雙胎的樣子）。
      ...wheelParts(1.3, 0.8, side * 2.42, -7.2),
      ...wheelParts(1.3, 1.25, side * 2.55, 4.6),
      roller(0.42, 1.37, side * 2.55, 1.3, 4.6, GREY),
    );
  }
  // 左側前段是一扇高的置物櫃門；右側（路緣側）是有小窗的側門。
  const leftSeam = -(BOX_HALF + 0.03);
  const rightSeam = BOX_HALF + 0.03;
  parts.push(
    ...sideDoorSeams(leftSeam, -4.3, -1.9, 1.6, 6.1),
    box(0.07, 0.12, 0.28, leftSeam, 4.2, -2.25, GREY),
    ...sideDoorSeams(rightSeam, -4.3, -1.7, 1.6, 7.3),
    box(0.05, 1.3, 1.3, BOX_HALF + 0.015, 5.4, -3, GLASS),
    box(0.08, 0.12, 0.4, rightSeam, 4.2, -2.05, GREY),
  );
  return assemble(parts);
}

/** 警報時會亮的鏡片，依閃爍的組別分開：與車身幾何同一個本地座標（公尺），頂點顏色是亮起來的顏色。 */
export function createAmbulanceLampGeometry(): { left: BufferGeometry; right: BufferGeometry; rear: BufferGeometry } {
  const lit = (group: LampGroup): BufferGeometry =>
    assemble(LAMPS.filter((lamp) => lamp.group === group).map((lamp) => lampBox(lamp, true)));
  return { left: lit('left'), right: lit('right'), rear: lit('rear') };
}
