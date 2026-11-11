// 地面著色器用的噪聲貼圖：固定種子、CPU 產生、上下左右可無縫拼接的四個色版。
// 純函式、不 import three，可以不開 WebGL 測試。
//   R：顆粒高度（每個像素的亂數 + 中等斑駁 + 淺色碎石 + 深色孔隙），0.5 是平均高度
//   G：大片深淺（三個倍頻的 value noise，拉伸到 0–255）
//   B：裂縫（扭曲過的 Voronoi 格邊，斷斷續續；0 = 沒有裂縫、255 = 裂縫正中央）
//   A：斑塊（三個倍頻的 value noise，拉伸到 0–255；油漬與潮濕的分布都從這裡取）
import { createRng, type Rng } from '../core/rng';
import { GROUND_NOISE_CONFIG } from '../render/renderConfig';

const CHANNELS_PER_PIXEL = 4;
const BYTE_MAX = 255;

/** 各色版在一個像素裡的位移。 */
export const GROUND_NOISE_CHANNEL = { grain: 0, patch: 1, crack: 2, blotch: 3 } as const;

type Field = (u: number, v: number) => number;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

/** 取非負餘數（JS 的 % 對負數會回傳負值）。 */
function wrap(index: number, count: number): number {
  return ((index % count) + count) % count;
}

/**
 * 可無縫拼接的 value noise：cells × cells 個格點亂數，格點之間用 smoothstep 內插，邊緣繞回另一側。
 * 回傳的取樣函式吃任意的 u、v（以 1 為周期），回傳 [0, 1)。
 */
function createTileableNoise(rng: Rng, cells: number): Field {
  const lattice = Float32Array.from({ length: cells * cells }, () => rng());
  const at = (column: number, row: number): number =>
    lattice[wrap(row, cells) * cells + wrap(column, cells)] ?? 0;
  const smooth = (t: number): number => t * t * (3 - 2 * t);

  return (u, v) => {
    const x = u * cells;
    const y = v * cells;
    const column = Math.floor(x);
    const row = Math.floor(y);
    const tx = smooth(x - column);
    const ty = smooth(y - row);
    const top = at(column, row) + (at(column + 1, row) - at(column, row)) * tx;
    const bottom = at(column, row + 1) + (at(column + 1, row + 1) - at(column, row + 1)) * tx;
    return top + (bottom - top) * ty;
  };
}

/** 幾個倍頻的 value noise 依權重相加（權重和為 1 時結果在 [0, 1)）。 */
function createOctaves(rng: Rng, cells: readonly number[], weights: readonly number[]): Field {
  const octaves = cells.map((count, index) => ({
    sample: createTileableNoise(rng, count),
    weight: weights[index] ?? 0,
  }));
  return (u, v) => {
    let sum = 0;
    for (const octave of octaves) {
      sum += octave.sample(u, v) * octave.weight;
    }
    return sum;
  };
}

/**
 * 可無縫拼接的 Voronoi：每格一個抖動過的特徵點，回傳「到最近兩個特徵點的距離差」（F2 − F1，單位是貼圖邊長）。
 * 差值接近 0 的地方就是兩格的交界，裂縫沿著交界走。
 */
function createTileableCellEdges(rng: Rng, cells: number, jitter: number): Field {
  const pointX = new Float32Array(cells * cells);
  const pointY = new Float32Array(cells * cells);
  for (let index = 0; index < cells * cells; index += 1) {
    pointX[index] = 0.5 + (rng() - 0.5) * jitter;
    pointY[index] = 0.5 + (rng() - 0.5) * jitter;
  }

  return (u, v) => {
    const x = u * cells;
    const y = v * cells;
    const column = Math.floor(x);
    const row = Math.floor(y);
    let nearest = Infinity;
    let second = Infinity;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const index = wrap(row + dy, cells) * cells + wrap(column + dx, cells);
        const offsetX = column + dx + (pointX[index] ?? 0) - x;
        const offsetY = row + dy + (pointY[index] ?? 0) - y;
        const distance = Math.hypot(offsetX, offsetY);
        if (distance < nearest) {
          second = nearest;
          nearest = distance;
        } else if (distance < second) {
          second = distance;
        }
      }
    }
    return (second - nearest) / cells;
  };
}

/** 把一個色版線性拉伸到剛好用滿 0–255（著色器裡的門檻才不必跟著種子調）。 */
function stretchChannel(pixels: Uint8Array, values: Float32Array, channel: number): void {
  let low = Infinity;
  let high = -Infinity;
  for (const value of values) {
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  const range = high > low ? high - low : 1;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] ?? 0;
    pixels[index * CHANNELS_PER_PIXEL + channel] = Math.round(((value - low) / range) * BYTE_MAX);
  }
}

/**
 * 產生地面噪聲貼圖的 RGBA 位元組（線性數值，不是顏色），邊長 sizePx，上下左右可無縫拼接。
 * 純函式：同一個種子與邊長每次產生完全相同的位元組。
 */
export function generateAsphaltPixels(seed: number, sizePx: number): Uint8Array<ArrayBuffer> {
  const config = GROUND_NOISE_CONFIG;
  const rng = createRng(seed);
  const mottle = createTileableNoise(rng, config.mottleCells);
  const patch = createOctaves(rng, config.patchCells, config.patchWeights);
  const blotch = createOctaves(rng, config.blotchCells, config.blotchWeights);
  const cellEdges = createTileableCellEdges(rng, config.crackCells, config.crackJitter);
  const warpU = createTileableNoise(rng, config.crackWarpCells);
  const warpV = createTileableNoise(rng, config.crackWarpCells);
  const crackBreak = createTileableNoise(rng, config.crackBreakCells);
  // 亂數 [0, 1) → [−1, 1)。
  const signed = (value: number): number => value * 2 - 1;
  // 裂縫至少一個像素寬，低解析度的貼圖才不會斷成點。
  const crackHalfWidth = Math.max(config.crackHalfWidth, 1 / sizePx);

  const pixelCount = sizePx * sizePx;
  const pixels = new Uint8Array(pixelCount * CHANNELS_PER_PIXEL);
  const patchValues = new Float32Array(pixelCount);
  const blotchValues = new Float32Array(pixelCount);

  for (let row = 0; row < sizePx; row += 1) {
    for (let column = 0; column < sizePx; column += 1) {
      const u = column / sizePx;
      const v = row / sizePx;
      const index = row * sizePx + column;
      const offset = index * CHANNELS_PER_PIXEL;

      let grain =
        0.5 + signed(rng()) * config.grainAmplitude + signed(mottle(u, v)) * config.mottleAmplitude;
      const speckle = rng();
      if (speckle < config.stoneChance) {
        grain += config.stoneBrighten;
      } else if (speckle < config.stoneChance + config.pitChance) {
        grain -= config.pitDarken;
      }
      // Uint8Array 寫入會取 256 的餘數而不是夾住，所以先夾在 0–1。
      pixels[offset + GROUND_NOISE_CHANNEL.grain] = Math.round(
        Math.min(Math.max(grain, 0), 1) * BYTE_MAX,
      );

      patchValues[index] = patch(u, v);
      blotchValues[index] = blotch(u, v);

      // 取樣位置先被低頻噪聲扭曲，Voronoi 的直邊才會變成彎彎曲曲的裂縫。
      const edgeDistance =
        cellEdges(
          u + signed(warpU(u, v)) * config.crackWarp,
          v + signed(warpV(u, v)) * config.crackWarp,
        ) / 2;
      const crack =
        (1 - smoothstep(0, crackHalfWidth, edgeDistance)) *
        smoothstep(config.crackBreakStart, config.crackBreakEnd, crackBreak(u, v));
      pixels[offset + GROUND_NOISE_CHANNEL.crack] = Math.round(crack * BYTE_MAX);
    }
  }

  stretchChannel(pixels, patchValues, GROUND_NOISE_CHANNEL.patch);
  stretchChannel(pixels, blotchValues, GROUND_NOISE_CHANNEL.blotch);
  return pixels;
}
