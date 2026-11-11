// 地面：一大片平面，貼固定種子生成的柏油顆粒貼圖。
import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three';
import { createRng, type Rng } from '../core/rng';
import { GROUND_CONFIG } from '../render/renderConfig';

const CHANNELS_PER_PIXEL = 4;
const BYTE_MAX = 255;

/**
 * 可無縫拼接的 value noise：cells × cells 個格點亂數，格點之間用 smoothstep 內插，邊緣繞回另一側。
 * 回傳的取樣函式吃 [0, 1) 的 u、v，回傳 [0, 1)。
 */
function createTileableNoise(rng: Rng, cells: number): (u: number, v: number) => number {
  const lattice = Float32Array.from({ length: cells * cells }, () => rng());
  const at = (column: number, row: number): number =>
    lattice[(row % cells) * cells + (column % cells)] ?? 0;
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

/**
 * 產生柏油貼圖的 RGBA 位元組（sRGB），邊長 GROUND_CONFIG.textureSizePx，上下左右可無縫拼接。
 * 純函式：同一個種子每次產生完全相同的位元組。
 */
export function generateAsphaltPixels(seed: number): Uint8Array<ArrayBuffer> {
  const size = GROUND_CONFIG.textureSizePx;
  const rng = createRng(seed);
  const patchNoise = createTileableNoise(rng, GROUND_CONFIG.patchCells);
  const mottleNoise = createTileableNoise(rng, GROUND_CONFIG.mottleCells);
  // 亂數 [0, 1) → [−1, 1)。
  const signed = (value: number): number => value * 2 - 1;

  const pixels = new Uint8Array(size * size * CHANNELS_PER_PIXEL);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const u = column / size;
      const v = row / size;
      let shade =
        signed(rng()) * GROUND_CONFIG.grainAmplitude +
        signed(patchNoise(u, v)) * GROUND_CONFIG.patchAmplitude +
        signed(mottleNoise(u, v)) * GROUND_CONFIG.mottleAmplitude;

      const speckle = rng();
      if (speckle < GROUND_CONFIG.stoneChance) {
        shade += GROUND_CONFIG.stoneBrighten;
      } else if (speckle < GROUND_CONFIG.stoneChance + GROUND_CONFIG.pitChance) {
        shade -= GROUND_CONFIG.pitDarken;
      }

      // Uint8Array 寫入會取 256 的餘數而不是夾住，所以先夾在 0–255。
      const channel = (base: number): number =>
        Math.min(Math.max(Math.round(base + shade), 0), BYTE_MAX);
      const offset = (row * size + column) * CHANNELS_PER_PIXEL;
      pixels[offset] = channel(GROUND_CONFIG.baseColor.r);
      pixels[offset + 1] = channel(GROUND_CONFIG.baseColor.g);
      pixels[offset + 2] = channel(GROUND_CONFIG.baseColor.b);
      pixels[offset + 3] = BYTE_MAX;
    }
  }
  return pixels;
}

/**
 * 建立地面網格（y = 0 的水平面，只收陰影不投影）。
 * @param seed 柏油貼圖的亂數種子
 * @param anisotropy 貼圖的各向異性過濾等級；斜看地面時遠處才不會糊成一片
 */
export function createGround(seed: number, anisotropy: number): Mesh {
  const size = GROUND_CONFIG.textureSizePx;
  const texture = new DataTexture(
    generateAsphaltPixels(seed),
    size,
    size,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  const repeats = GROUND_CONFIG.sizeM / GROUND_CONFIG.tileM;
  texture.repeat.set(repeats, repeats);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;

  const ground = new Mesh(
    new PlaneGeometry(GROUND_CONFIG.sizeM, GROUND_CONFIG.sizeM),
    new MeshStandardMaterial({ map: texture, roughness: GROUND_CONFIG.roughness, metalness: 0 }),
  );
  // PlaneGeometry 預設立在 XY 平面、面朝 +Z；繞 X 轉 −90° 讓它躺平、面朝 +Y。
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}
