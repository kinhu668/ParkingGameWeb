// 車排盡頭的安全島：一圈水泥路緣（兩個短邊的轉角分段內縮，看起來是圓頭）、樹皮覆土、
// 中央的方形路燈基座（深色底板、四顆錨栓）、矮灌木與草叢、幾顆淺色石頭、短邊鼻端的黃漆。
// 路燈本身由環境佈局擺在島的中心，所以基座頂面留空。
// 本地 X = 橫向、Z = 縱向；外框的底面（X × Z）要剛好等於 obstacleTypes.ts 的預設碰撞盒（8 × 17 ft）。
import type { BufferGeometry } from 'three';
import { assemble, blob, box, cylinder } from './partShapes';

const CURB = 0xb9b4a8;
const CURB_SCUFFED = 0x9f9a8f;
const NOSE_YELLOW = 0xe0b422;
const MULCH = 0x4a3a2c;
const MULCH_LIGHT = 0x5e4a38;
const FOOTING = 0xc4c0b6;
const FOOTING_BASE = 0x8a867d;
const STEEL = 0x8b9096;
const ROCK = 0xcfcabd;
const GREEN_DARK = 0x3d6a33;
const GREEN_MID = 0x55863c;
const GREEN_OLIVE = 0x7a8f45;

const CURB_HEIGHT = 0.5;
const MULCH_HEIGHT = 0.4;

/** 安全島的幾何（公尺，底面在 y = 0，帶頂點顏色）。 */
export function createLampIslandGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [
    // 樹皮覆土：比路緣頂面低一點；中間一塊，兩端各兩塊跟著圓頭內縮。
    box(7, MULCH_HEIGHT, 14, 0, 0, 0, MULCH),
    // 中央的路燈基座：深色底板、淺色水泥塊，頂面留給燈桿。
    box(2.2, 0.12, 2.2, 0, MULCH_HEIGHT, 0, FOOTING_BASE),
    box(1.8, 1.5, 1.8, 0, MULCH_HEIGHT, 0, FOOTING),
  ];
  // 長邊的路緣；靠車道的一側被輪胎蹭得比較深。
  parts.push(box(0.5, CURB_HEIGHT, 14, -3.75, 0, 0, CURB));
  parts.push(box(0.5, CURB_HEIGHT, 14, 3.75, 0, 0, CURB_SCUFFED));

  for (const end of [-1, 1]) {
    // 短邊：中間一段直的鼻端，兩個轉角各用兩段較短的路緣往內收。
    parts.push(box(4, CURB_HEIGHT, 0.46, 0, 0, end * 8.23, CURB));
    for (const side of [-1, 1]) {
      parts.push(box(1.3, CURB_HEIGHT, 0.6, side * 2.55, 0, end * 7.8, CURB));
      parts.push(box(0.8, CURB_HEIGHT, 0.7, side * 3.4, 0, end * 7.25, CURB));
      // 轉角第一段朝外的面也漆黃。
      parts.push(box(1.3, 0.36, 0.04, side * 2.55, 0.14, end * 8.12, NOSE_YELLOW));
    }
    // 鼻端的黃漆：正面一道、頂面一道。
    parts.push(box(4, 0.36, 0.04, 0, 0.14, end * 8.48, NOSE_YELLOW));
    parts.push(box(4, 0.02, 0.3, 0, CURB_HEIGHT, end * 8.35, NOSE_YELLOW));
    // 圓頭裡的覆土。
    parts.push(box(6, MULCH_HEIGHT, 0.7, 0, 0, end * 7.2, MULCH_LIGHT));
    parts.push(box(3.9, MULCH_HEIGHT, 0.5, 0, 0, end * 7.78, MULCH));
  }

  // 基座四角的錨栓。
  for (const sideX of [-1, 1]) {
    for (const sideZ of [-1, 1]) {
      parts.push(cylinder(0.07, 0.07, 0.1, sideX * 0.68, MULCH_HEIGHT + 1.5, sideZ * 0.68, STEEL, 6));
    }
  }

  // 矮灌木：底部埋在覆土裡（球底剛好在 y = 0），離基座至少 1.5 ft。[半徑, x, z, 顏色]
  const shrubs: readonly (readonly [number, number, number, number])[] = [
    [1.3, -1.2, -5.5, GREEN_DARK],
    [1.0, 1.5, -4.2, GREEN_MID],
    [0.8, 1.0, -6.5, GREEN_OLIVE],
    [0.8, -2.2, -3.5, GREEN_MID],
    [1.3, 1.1, 5.4, GREEN_DARK],
    [1.0, -1.5, 4.0, GREEN_OLIVE],
    [0.9, -0.8, 6.5, GREEN_MID],
  ];
  for (const [radius, x, z, color] of shrubs) {
    parts.push(blob(radius, x, radius, z, color));
  }

  // 草叢：尖錐。[x, z, 高]
  const tufts: readonly (readonly [number, number, number])[] = [
    [2.6, -2.6, 1.0],
    [-2.7, -6.2, 0.8],
    [2.5, 6.6, 0.9],
    [-2.6, 2.6, 1.1],
    [2.7, 3.2, 0.8],
    [-2.4, 6.0, 0.9],
  ];
  for (const [x, z, height] of tufts) {
    parts.push(cylinder(0, 0.32, height, x, MULCH_HEIGHT, z, GREEN_OLIVE, 5));
  }

  // 幾顆淺色石頭。[半徑, x, z]
  const rocks: readonly (readonly [number, number, number])[] = [
    [0.38, 2.4, -0.9],
    [0.28, -2.5, 0.4],
    [0.32, -0.4, -2.9],
    [0.26, 2.3, 1.9],
    [0.34, 0.3, 2.8],
  ];
  for (const [radius, x, z] of rocks) {
    parts.push(cylinder(radius * 0.6, radius, radius * 0.9, x, MULCH_HEIGHT, z, ROCK, 5));
  }

  return assemble(parts);
}
