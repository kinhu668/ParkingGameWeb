// 餐車：廂型（step van）車身、短車鼻駕駛艙、後雙輪、車頂排煙罩與冷氣、車尾發電機與瓦斯桶，
// 右側（+X）是打開的出餐面：條紋遮陽棚、出餐窗、出餐檯、撐桿與菜單板。
// 本地 X = 橫向、−Z = 前方；外框的底面（X × Z）要剛好等於 obstacleTypes.ts 的預設碰撞盒（10 × 22 英尺）。
import { BoxGeometry, type BufferGeometry } from 'three';
import { tinted } from './lotProps';
import { assemble, bar, blob, box, cylinder, roller } from './partShapes';

const YELLOW = 0xf2b632;
const TEAL = 0x1fa7a0;
const CORAL = 0xf2705a;
const CREAM = 0xfff3d6;
const CHROME = 0xc9ced2;
const GREY = 0x8d9296;
const DARK = 0x1b1d20;
const GLASS = 0x22323b;
const TIRE = 0x15161a;

/** 車身的中線（車身佔 X −5 … +2.5）。 */
const BODY_X = -1.25;
const BODY_RIGHT = 2.5;
const CAB_HALF = 3.45;

/** 車輪：輪胎、輪圈、輪軸蓋。 */
function wheel(width: number, x: number, z: number): BufferGeometry[] {
  return [
    roller(1.3, width, x, 1.3, z, TIRE),
    roller(0.78, width + 0.04, x, 1.3, z, CHROME),
    roller(0.3, width + 0.12, x, 1.3, z, GREY),
  ];
}

/** 底盤、車輪、車身下緣的裙板（輪拱是裙板之間的缺口）。 */
function chassisParts(): BufferGeometry[] {
  const parts = [box(6.3, 1.7, 21, BODY_X, 1, 0, DARK)];
  for (const side of [-1, 1]) {
    parts.push(...wheel(0.9, BODY_X + side * 3.05, -7.6));
    parts.push(...wheel(1.7, BODY_X + side * 2.8, 5.5));
    const skirtX = BODY_X + side * 3.6;
    parts.push(box(0.3, 1.1, 9.45, skirtX, 1.6, -0.775, YELLOW));
    parts.push(box(0.3, 1.1, 2.25, skirtX, 1.6, 8.175, YELLOW));
  }
  return parts;
}

/** 駕駛艙：車鼻、水箱罩、頭燈、保險桿、擋風玻璃、側窗、後視鏡。 */
function cabParts(): BufferGeometry[] {
  const parts = [
    box(6.9, 6.9, 3.5, BODY_X, 2.7, -7.25, YELLOW),
    box(6.9, 3.3, 1.6, BODY_X, 1.6, -9.8, YELLOW),
    box(6.6, 0.4, 1.2, BODY_X, 4.9, -9.6, YELLOW),
    box(6.96, 0.9, 3.56, BODY_X, 3.5, -7.25, TEAL),
    box(6.96, 0.9, 1.66, BODY_X, 3.5, -9.8, TEAL),
    // 水箱罩與橫條
    box(3.4, 1.5, 0.1, BODY_X, 2.4, -10.66, DARK),
    box(3.2, 0.1, 0.06, BODY_X, 2.75, -10.72, CHROME),
    box(3.2, 0.1, 0.06, BODY_X, 3.1, -10.72, CHROME),
    box(3.2, 0.1, 0.06, BODY_X, 3.45, -10.72, CHROME),
    // 前保險桿
    box(7.1, 0.8, 0.5, BODY_X, 1.3, -10.75, CHROME),
    box(1.4, 0.45, 0.04, BODY_X, 1.5, -11, CREAM),
    // 擋風玻璃（中柱分兩片）、上方遮陽板與空白招牌帶
    box(6.2, 3.2, 0.08, BODY_X, 5.3, -9.02, GLASS),
    box(0.16, 3.2, 0.12, BODY_X, 5.3, -9.04, YELLOW),
    box(6.9, 0.14, 0.7, BODY_X, 8.6, -9.25, DARK),
    box(5.6, 0.6, 0.06, BODY_X, 8.85, -9.02, CREAM),
    bar([BODY_X - 1.6, 5.35, -9.1], [BODY_X - 0.3, 6.3, -9.1], 0.06, DARK),
    bar([BODY_X + 1.5, 5.35, -9.1], [BODY_X + 2.8, 6.3, -9.1], 0.06, DARK),
    // 車頂的示廓燈
    box(0.3, 0.14, 0.2, BODY_X - 1, 9.6, -8.8, 0xf59f2a),
    box(0.3, 0.14, 0.2, BODY_X, 9.6, -8.8, 0xf59f2a),
    box(0.3, 0.14, 0.2, BODY_X + 1, 9.6, -8.8, 0xf59f2a),
  ];
  for (const side of [-1, 1]) {
    const face = BODY_X + side * CAB_HALF;
    parts.push(
      // 頭燈、方向燈
      box(0.9, 0.8, 0.1, BODY_X + side * 2.55, 2.9, -10.66, 0xf4f7fa),
      box(0.9, 0.3, 0.1, BODY_X + side * 2.55, 2.45, -10.66, 0xf59f2a),
      box(1.1, 1.4, 0.06, BODY_X + side * 2.55, 2.35, -10.62, CHROME),
      // 側窗、車門縫、門把、踏階
      box(0.08, 3, 2.5, face, 5.3, -7.45, GLASS),
      box(0.05, 6.4, 0.06, face + side * 0.02, 2.9, -5.95, DARK),
      box(0.05, 2.3, 0.06, face + side * 0.02, 2.9, -8.9, DARK),
      box(0.08, 0.12, 0.45, face + side * 0.03, 4.8, -6.35, CHROME),
      box(0.5, 0.12, 1.6, face - side * 0.05, 1.7, -6.5, DARK),
      // 輪拱上緣
      box(0.2, 0.25, 3, face + side * 0.05, 2.7, -7.6, DARK),
      // 後視鏡
      bar([face, 7.6, -8.7], [face + side * 0.2, 7.6, -9.05], 0.07, DARK),
      bar([face, 6.3, -8.7], [face + side * 0.2, 6.3, -9.05], 0.07, DARK),
      box(0.3, 1.5, 0.14, face + side * 0.15, 6.2, -9.1, DARK),
    );
  }
  return parts;
}

/** 貨廂：車身、色帶、車頂設備、左側的檢修門與百葉。 */
function cargoParts(): BufferGeometry[] {
  const left = BODY_X - 3.75;
  return [
    box(7.5, 7.3, 14.8, BODY_X, 2.7, 1.9, YELLOW),
    box(7.56, 0.9, 14.86, BODY_X, 3.5, 1.9, TEAL),
    box(7.56, 0.18, 14.86, BODY_X, 4.55, 1.9, CORAL),
    box(7.56, 0.25, 14.86, BODY_X, 9.6, 1.9, CREAM),
    box(7.3, 0.12, 14.6, BODY_X, 10, 1.9, CREAM),
    // 排煙罩
    box(2.6, 0.9, 3.2, BODY_X - 0.9, 10.12, 2.4, GREY),
    box(3, 0.15, 3.6, BODY_X - 0.9, 11.02, 2.4, CHROME),
    box(2.62, 0.1, 3.22, BODY_X - 0.9, 10.5, 2.4, DARK),
    // 冷氣
    box(2.6, 0.85, 3, BODY_X, 10.12, -2.6, CREAM),
    box(2.64, 0.3, 1, BODY_X, 10.3, -3.5, DARK),
    cylinder(0.85, 0.85, 0.08, BODY_X, 10.97, -2.4, DARK, 16),
    // 通風帽
    cylinder(0.3, 0.3, 0.55, BODY_X + 1.6, 10.12, 7, GREY),
    cylinder(0.5, 0.5, 0.12, BODY_X + 1.6, 10.67, 7, CHROME),
    // 左側：檢修門、百葉、電源接口
    box(0.06, 3.4, 2.6, left, 5.2, -1.5, CREAM),
    box(0.08, 0.14, 0.4, left - 0.03, 6.7, -0.5, CHROME),
    box(0.06, 1.6, 2.4, left, 6.2, 3.6, DARK),
    box(0.1, 0.1, 2.4, left - 0.02, 6.5, 3.6, GREY),
    box(0.1, 0.1, 2.4, left - 0.02, 6.9, 3.6, GREY),
    box(0.1, 0.1, 2.4, left - 0.02, 7.3, 3.6, GREY),
    box(0.08, 0.7, 0.7, left, 5.3, 7.6, GREY),
    // 車角的直條
    box(0.12, 7.3, 0.12, left + 0.03, 2.7, 9.27, CHROME),
    box(0.12, 7.3, 0.12, BODY_RIGHT - 0.03, 2.7, 9.27, CHROME),
  ];
}

/** 車尾：後門、尾燈、平台、發電機、瓦斯桶、後保險桿。 */
function rearParts(): BufferGeometry[] {
  const parts = [
    box(5.6, 6, 0.06, BODY_X, 3.3, 9.31, CREAM),
    box(0.08, 6, 0.08, BODY_X, 3.3, 9.33, DARK),
    box(0.1, 1.2, 0.12, BODY_X + 0.3, 5.4, 9.36, CHROME),
    box(7.3, 0.25, 1.4, BODY_X, 2.15, 10, DARK),
    box(7.3, 0.7, 0.4, BODY_X, 1.3, 10.6, CHROME),
    box(1.4, 0.45, 0.04, BODY_X, 1.42, 11, CREAM),
    // 發電機
    box(2.8, 2.2, 1.15, BODY_X - 2, 2.4, 10, GREY),
    box(2.3, 0.9, 0.06, BODY_X - 2, 3.4, 10.6, DARK),
    box(2.3, 0.08, 0.08, BODY_X - 2, 3.65, 10.63, CHROME),
    box(2.3, 0.08, 0.08, BODY_X - 2, 3.95, 10.63, CHROME),
    box(0.5, 0.3, 0.06, BODY_X - 2.8, 2.8, 10.6, CORAL),
    // 瓦斯桶的固定架
    bar([BODY_X + 0.3, 3.6, 10.62], [BODY_X + 3.2, 3.6, 10.62], 0.08, DARK),
  ];
  for (const x of [BODY_X + 1.1, BODY_X + 2.4]) {
    parts.push(
      cylinder(0.52, 0.52, 1.7, x, 2.4, 10, CREAM),
      blob(0.52, x, 4.1, 10, CREAM),
      cylinder(0.2, 0.2, 0.3, x, 4.55, 10, CHROME, 8),
    );
  }
  for (const side of [-1, 1]) {
    const x = BODY_X + side * 3.3;
    parts.push(
      box(0.5, 1.1, 0.08, x, 5.6, 9.32, 0xc8262b),
      box(0.5, 0.4, 0.08, x, 6.75, 9.32, 0xf59f2a),
      box(0.4, 0.2, 0.08, x, 9.3, 9.32, 0xc8262b),
    );
  }
  return parts;
}

/** 出餐面（+X 側）：出餐窗、出餐檯、條紋遮陽棚、撐桿、菜單板。 */
function servingParts(): BufferGeometry[] {
  const from = -3.6;
  const to = 6.6;
  const middle = (from + to) / 2;
  const parts = [
    // 出餐窗：深色的開口、窗框、裡面的層架與抽油煙罩
    box(0.06, 3.2, 9.4, BODY_RIGHT, 5.35, middle, 0x2a2420),
    box(0.1, 0.16, 9.7, BODY_RIGHT + 0.02, 8.55, middle, CHROME),
    box(0.1, 3.36, 0.16, BODY_RIGHT + 0.02, 5.27, from + 0.33, CHROME),
    box(0.1, 3.36, 0.16, BODY_RIGHT + 0.02, 5.27, to - 0.33, CHROME),
    box(0.1, 3.2, 0.12, BODY_RIGHT + 0.02, 5.35, middle, CHROME),
    box(0.05, 0.1, 4.2, BODY_RIGHT + 0.03, 7.3, middle + 2.3, GREY),
    box(0.05, 0.7, 3.6, BODY_RIGHT + 0.03, 7.7, middle - 2.3, GREY),
    // 出餐檯與托架
    box(1.4, 0.16, 9.8, BODY_RIGHT + 0.7, 5.15, middle, CHROME),
    box(0.08, 0.3, 9.8, BODY_RIGHT + 1.4, 5.02, middle, GREY),
    // 檯上的醬料瓶、餐巾盒
    cylinder(0.11, 0.13, 0.5, BODY_RIGHT + 0.9, 5.31, middle - 3.2, 0xc8262b, 8),
    cylinder(0.11, 0.13, 0.5, BODY_RIGHT + 0.9, 5.31, middle - 2.85, YELLOW, 8),
    box(0.5, 0.4, 0.7, BODY_RIGHT + 0.8, 5.31, middle + 3.2, TEAL),
    box(0.4, 0.06, 0.6, BODY_RIGHT + 0.8, 5.71, middle + 3.2, CREAM),
  ];
  for (const z of [from + 0.6, middle, to - 0.6]) {
    parts.push(bar([BODY_RIGHT, 4.3, z], [BODY_RIGHT + 1.3, 5.1, z], 0.1, GREY));
  }

  // 遮陽棚：從車身 (2.5, 9.1) 斜到外緣 (4.9, 8.2)，十條兩色相間，外緣垂一道布邊
  const rise = -0.9;
  const run = 2.4;
  const slope = Math.hypot(run, rise);
  const stripes = 10;
  const stripeWidth = (to - from) / stripes;
  for (let i = 0; i < stripes; i += 1) {
    const z = from + (i + 0.5) * stripeWidth;
    const color = i % 2 === 0 ? CORAL : CREAM;
    parts.push(
      tinted(
        new BoxGeometry(slope, 0.08, stripeWidth)
          .rotateZ(Math.atan2(rise, run))
          .translate(BODY_RIGHT + run / 2, 9.1 + rise / 2, z),
        color,
      ),
      box(0.06, 0.45, stripeWidth, BODY_RIGHT + run, 7.78, z, color),
    );
  }
  parts.push(box(0.14, 0.14, to - from, BODY_RIGHT + 0.05, 9.08, middle, CHROME));
  for (const z of [from + 0.1, to - 0.1]) {
    parts.push(
      // 落地的撐桿、斜撐、遮陽棚的邊框
      box(0.12, 8.2, 0.12, 4.94, 0, z, CHROME),
      box(0.5, 0.08, 0.5, 4.75, 0, z, DARK),
      bar([BODY_RIGHT, 6.6, z], [4.85, 8.15, z], 0.08, GREY),
      bar([BODY_RIGHT, 9.05, z], [4.9, 8.15, z], 0.1, CHROME),
    );
  }
  parts.push(bar([4.9, 8.15, from], [4.9, 8.15, to], 0.1, CHROME));

  // 菜單板（空白，只有色條；文字由別處加）
  const boardZ = -6.2;
  parts.push(
    box(0.1, 4.2, 0.1, 3.25, 0, boardZ, DARK),
    box(0.1, 4.2, 0.1, 4.75, 0, boardZ, DARK),
    box(1.7, 2.6, 0.12, 4, 1.5, boardZ, 0x2b3a3a),
    box(1.9, 0.14, 0.16, 4, 4.1, boardZ, CORAL),
    box(1.9, 0.14, 0.16, 4, 1.4, boardZ, CORAL),
    box(0.9, 0.3, 0.04, 4, 3.5, boardZ - 0.07, YELLOW),
    box(1.2, 0.08, 0.04, 3.95, 3.1, boardZ - 0.07, CREAM),
    box(1, 0.08, 0.04, 3.85, 2.75, boardZ - 0.07, CREAM),
    box(1.2, 0.08, 0.04, 3.95, 2.4, boardZ - 0.07, CREAM),
    box(0.8, 0.08, 0.04, 3.75, 2.05, boardZ - 0.07, TEAL),
  );
  return parts;
}

/**
 * 車頂的店名招牌：立在出餐側的車頂邊（遮陽棚正上方），兩面都留白給店名
 * （文字由別處貼在兩面中央的 9.2 × 1.45 英尺），外圈是邊框與端蓋，
 * 下面三個腳座，背面（−X）兩端各一根斜撐，上緣一排燈泡。
 */
function marqueeParts(): BufferGeometry[] {
  const x = 2.2;
  const from = -3.4;
  const to = 6.4;
  const middle = (from + to) / 2;
  const parts = [
    // 板面（厚 0.3，兩面在 x = 2.05 與 2.35）與上下邊框
    box(0.3, 1.8, to - from, x, 10.25, middle, CREAM),
    box(0.4, 0.15, to - from - 0.6, x, 10.25, middle, TEAL),
    box(0.4, 0.15, to - from - 0.6, x, 11.9, middle, TEAL),
  ];
  for (const z of [from + 0.15, to - 0.15]) {
    parts.push(
      // 端蓋、從車頂撐到端蓋背面的斜撐
      box(0.4, 1.8, 0.3, x, 10.25, z, TEAL),
      bar([1.1, 10.1, z], [2, 11.6, z], 0.1, CHROME),
    );
  }
  for (const z of [from + 1, middle, to - 1]) {
    parts.push(box(0.3, 0.25, 0.4, x, 10, z, CHROME));
  }
  for (let i = 0; i < 9; i += 1) {
    parts.push(blob(0.12, x, 12.1, from + 0.5 + i * 1.1, YELLOW));
  }
  return parts;
}

/** 餐車的幾何（公尺，底面在 y = 0，帶頂點顏色）。 */
export function createFoodTruckGeometry(): BufferGeometry {
  return assemble([
    ...chassisParts(),
    ...cabParts(),
    ...cargoParts(),
    ...rearParts(),
    ...servingParts(),
    ...marqueeParts(),
  ]);
}
