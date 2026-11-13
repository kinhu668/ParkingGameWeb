// 材質庫的表面清單與每種表面的基準數值。不 import three、不碰 DOM：可以純函式測試。
// 貼圖是開機時用 GPU 烘的（surfaceBaker.ts）；這裡的數值是「沒有貼圖時這種表面長什麼樣」，
// 也是烘好之後貼圖去調變的基準（粗糙度、金屬度、清漆）。

/** 庫裡的表面。前 14 個是規格第 9 節列的；paintedMetal（塗裝鋼）與 plaster（粉刷牆）是場景需要而加的。 */
export const SURFACE_IDS = [
  'asphaltDry',
  'asphaltWet',
  'concrete',
  'epoxy',
  'wornPaint',
  'rustedIron',
  'galvanized',
  'corrugated',
  'brick',
  'glass',
  'tire',
  'carPaint',
  'plastic',
  'chrome',
  'paintedMetal',
  'plaster',
] as const;

export type SurfaceId = (typeof SURFACE_IDS)[number];

/** 一種表面的基準數值。 */
export interface SurfaceSpec {
  /** 展示台與沒有指定顏色時用的底色。 */
  readonly color: number;
  /** 基準粗糙度；烘出來的貼圖在它上下調變（貼圖值 0.5 = 不變）。 */
  readonly roughness: number;
  /** 金屬度的上限；貼圖把鏽、漆、髒污蓋住的地方壓低。 */
  readonly metalness: number;
  /** 清漆（只有車漆與環氧地坪有）。 */
  readonly clearcoat: number;
  readonly clearcoatRoughness: number;
  /** 貼圖鋪一次是幾公尺（世界座標三面投影）。 */
  readonly tileM: number;
  /** 法線貼圖的強度。 */
  readonly normalScale: number;
  /** 大尺度的明暗變化（0 = 沒有）：蓋掉大牆面上貼圖重複的感覺。 */
  readonly macro: number;
}

export const SURFACE_SPECS: Readonly<Record<SurfaceId, SurfaceSpec>> = {
  asphaltDry: { color: 0x5d5e62, roughness: 0.93, metalness: 0, clearcoat: 0, clearcoatRoughness: 0, tileM: 2.2, normalScale: 0.9, macro: 0.1 },
  asphaltWet: { color: 0x3c3e44, roughness: 0.55, metalness: 0, clearcoat: 0, clearcoatRoughness: 0, tileM: 2.2, normalScale: 0.6, macro: 0.08 },
  concrete: { color: 0xb9b5aa, roughness: 0.88, metalness: 0, clearcoat: 0, clearcoatRoughness: 0, tileM: 3.048, normalScale: 0.8, macro: 0.12 },
  epoxy: { color: 0x7d8a8c, roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.18, tileM: 2, normalScale: 0.35, macro: 0.05 },
  wornPaint: { color: 0xe6e3da, roughness: 0.78, metalness: 0, clearcoat: 0, clearcoatRoughness: 0, tileM: 1.1, normalScale: 0.6, macro: 0.06 },
  rustedIron: { color: 0x6f6a66, roughness: 0.62, metalness: 0.85, clearcoat: 0, clearcoatRoughness: 0, tileM: 1.5, normalScale: 0.9, macro: 0.1 },
  galvanized: { color: 0xaab0b4, roughness: 0.42, metalness: 0.9, clearcoat: 0, clearcoatRoughness: 0, tileM: 0.9, normalScale: 0.35, macro: 0.06 },
  corrugated: { color: 0x9aa0a4, roughness: 0.5, metalness: 0.8, clearcoat: 0, clearcoatRoughness: 0, tileM: 1.22, normalScale: 1.3, macro: 0.08 },
  brick: { color: 0x9a5a44, roughness: 0.9, metalness: 0, clearcoat: 0, clearcoatRoughness: 0, tileM: 1.28, normalScale: 1.1, macro: 0.14 },
  glass: { color: 0x1d2a33, roughness: 0.06, metalness: 0, clearcoat: 0, clearcoatRoughness: 0, tileM: 1.4, normalScale: 0, macro: 0 },
  tire: { color: 0x17181a, roughness: 0.9, metalness: 0, clearcoat: 0, clearcoatRoughness: 0, tileM: 1, normalScale: 0, macro: 0 },
  carPaint: { color: 0x1f63b3, roughness: 0.32, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.06, tileM: 0.22, normalScale: 0.5, macro: 0 },
  plastic: { color: 0x1c1d20, roughness: 0.62, metalness: 0, clearcoat: 0, clearcoatRoughness: 0, tileM: 0.4, normalScale: 0.45, macro: 0 },
  chrome: { color: 0xe6e9ec, roughness: 0.1, metalness: 1, clearcoat: 0, clearcoatRoughness: 0, tileM: 0.5, normalScale: 0.15, macro: 0 },
  paintedMetal: { color: 0x4a5056, roughness: 0.5, metalness: 0.25, clearcoat: 0, clearcoatRoughness: 0, tileM: 1.6, normalScale: 0.4, macro: 0.07 },
  plaster: { color: 0xcdbf9f, roughness: 0.92, metalness: 0, clearcoat: 0, clearcoatRoughness: 0, tileM: 2, normalScale: 0.7, macro: 0.12 },
};

/** 烘焙用的固定種子：同一個種子、同一個尺寸烘出來的每個像素都相同。 */
export const SURFACE_SEED = 20261112;

/** 表面在烘焙著色器裡的編號（surfaceIndex 的順序就是 SURFACE_IDS 的順序）。 */
export function surfaceIndex(id: SurfaceId): number {
  return SURFACE_IDS.indexOf(id);
}

/**
 * 疊在表面上的髒污（0–1，各自的強度）。貼圖是全庫共用的一張（四個色版各一種）。
 * 這些是材質上的靜態髒污／舊痕，與 effects/tireMarks.ts 倒車留下的動態輪胎痕無關。
 */
export interface SurfaceOverlays {
  /** 髒污：牆腳的濺痕與大片的髒斑。 */
  readonly dirt: number;
  /** 雨痕：垂直面上由上往下的水漬；下雨／潮濕的天氣更明顯。 */
  readonly streaks: number;
  /** 油漬：只在朝上的面。 */
  readonly oil: number;
  /** 舊輪胎痕：只在朝上的面。 */
  readonly tireMarks: number;
}

export const NO_OVERLAYS: SurfaceOverlays = { dirt: 0, streaks: 0, oil: 0, tireMarks: 0 };

/** 各畫質級別的材質細節（QUALITY_PRESETS 的 materials）。 */
export interface MaterialQualitySettings {
  /** 烘出來的貼圖邊長（像素）。 */
  readonly textureSizePx: number;
  /** 法線貼圖：磚縫、瓦楞、金屬片的立體感。low 不烘、不取樣。 */
  readonly normals: boolean;
  /** 三面都取樣再混合；false = 只取樣最正對的那一面（每個像素少取樣三分之二）。 */
  readonly triplanarBlend: boolean;
  /** 各向異性過濾的上限。 */
  readonly maxAnisotropy: number;
}
