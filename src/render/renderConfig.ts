// 畫面的可調數值：鏡頭、燈光、陰影、霧、地面、車輛外觀。
// 長度一律以英尺填寫，經 units.ts 換成公尺；顏色是 sRGB 十六進位。
import { ftToM } from '../core/units';

/** 算圖器。 */
export const RENDERER_CONFIG = {
  /** 像素比上限；高 DPI 螢幕不必算超過 2 倍。 */
  maxPixelRatio: 2,
  toneMappingExposure: 1.0,
} as const;

/** 斜俯視跟隨鏡頭。偏移是世界座標：鏡頭在目標點的上方、南邊（+Z），朝北看。 */
export const CAMERA_CONFIG = {
  fovDeg: 40,
  nearM: ftToM(2),
  farM: ftToM(1500),
  offsetHeightM: ftToM(45),
  offsetBackM: ftToM(55),
  /** 跟隨平滑的時間常數（秒）；越大鏡頭越「拖」。 */
  followTimeConstantS: 0.25,
} as const;

/** 天空底色與霧（霧色 = 天空色，地面遠處會融進背景）。 */
export const SKY_CONFIG = {
  color: 0xb7cfe6,
  fogNearM: ftToM(140),
  fogFarM: ftToM(700),
} as const;

/** 半球補光：上方天空色、下方地面反彈色。 */
export const HEMISPHERE_LIGHT_CONFIG = {
  skyColor: 0xcfe2f7,
  groundColor: 0x57534a,
  intensity: 1.3,
} as const;

/** 太陽（DirectionalLight）與陰影。 */
export const SUN_CONFIG = {
  color: 0xfff0d9,
  intensity: 3.2,
  /** 從目標點指向太陽的方向（不必是單位長）：西南方上空，影子落向東北。 */
  directionToSun: { x: -0.75, y: 1, z: 0.6 },
  /** 光源離目標點的距離。 */
  distanceM: ftToM(160),
  shadowMapSize: 2048,
  /** 陰影相機是正方形，這是半邊長；範圍跟著車走，所以只要蓋住車附近。 */
  shadowHalfExtentM: ftToM(45),
  shadowNearM: ftToM(20),
  shadowFarM: ftToM(320),
  shadowBias: -0.0004,
  shadowNormalBias: 0.03,
} as const;

/** 地面與柏油顆粒貼圖。 */
export const GROUND_CONFIG = {
  /** 地面正方形邊長；要大於兩倍霧的遠端，邊緣才藏得住。 */
  sizeM: ftToM(2400),
  /** 一張貼圖鋪滿的邊長。 */
  tileM: ftToM(60),
  textureSizePx: 1024,
  roughness: 0.94,
  /** 柏油底色（sRGB 位元組）。 */
  baseColor: { r: 96, g: 97, b: 101 },
  /** 每個像素的細顆粒明暗幅度（± 位元組）。 */
  grainAmplitude: 15,
  /** 大片深淺不均的幅度（± 位元組）與一張貼圖內的格數。 */
  patchAmplitude: 7,
  patchCells: 11,
  /** 中等大小斑駁的幅度（± 位元組）與格數。 */
  mottleAmplitude: 6,
  mottleCells: 96,
  /** 淺色碎石：出現機率與提亮量（位元組）。 */
  stoneChance: 0.02,
  stoneBrighten: 46,
  /** 深色孔隙：出現機率與壓暗量（位元組）。 */
  pitChance: 0.015,
  pitDarken: 34,
} as const;

/** 車輛外觀。整體長寬高與軸距來自 VehicleConfig，這裡只放比例與顏色。 */
export const CAR_VISUAL_CONFIG = {
  /** 車身底部離地高度。 */
  groundClearanceM: ftToM(0.65),
  /** 下車身（引擎蓋高度以下）的高度。 */
  lowerBodyHeightM: ftToM(2.0),
  /** 車身側面比車寬（輪框蓋最外緣）每側內縮的量。 */
  bodySideInsetM: ftToM(0.15),
  /** 引擎蓋與後行李廂長度；兩者不等長，從上方看得出車頭車尾。 */
  hoodLengthM: ftToM(4.6),
  trunkLengthM: ftToM(2.3),
  /** 車艙底部比下車身每側內縮。 */
  cabinSideInsetM: ftToM(0.25),
  /** 車艙頂部比底部每側再內縮。 */
  cabinTopSideInsetM: ftToM(0.4),
  /** 前擋與後擋玻璃頂端往車艙中心收的距離（斜度）。 */
  windshieldRakeM: ftToM(2.0),
  rearWindowRakeM: ftToM(1.4),
  roofThicknessM: ftToM(0.18),
  wheelRadiusM: ftToM(1.1),
  wheelWidthM: ftToM(0.75),
  hubRadiusM: ftToM(0.62),
  wheelSegments: 28,
  /** 頭燈／尾燈色塊的寬、高、深。 */
  lightWidthM: ftToM(1.35),
  lightHeightM: ftToM(0.5),
  lightDepthM: ftToM(0.3),
  /** 燈塊與輪框蓋凸出所在表面的量，避免共面閃爍。 */
  trimProudM: ftToM(0.06),

  bodyColor: 0x1f63b3,
  bodyRoughness: 0.38,
  bodyMetalness: 0.25,
  glassColor: 0x18222d,
  glassRoughness: 0.12,
  tireColor: 0x17181a,
  tireRoughness: 0.9,
  hubColor: 0xb4bac1,
  hubRoughness: 0.4,
  headlightColor: 0xfff3d0,
  headlightEmissiveIntensity: 1.6,
  taillightColor: 0xe01218,
  taillightEmissiveIntensity: 1.3,
} as const;
