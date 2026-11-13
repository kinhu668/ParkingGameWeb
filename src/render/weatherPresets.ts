// 每種天氣的數值表：天空、太陽（夜晚是月亮）、霧、半球補光、地面的潮濕與積水、雨量、閃電、路燈開關。
// `dusk` 是基準畫面：直接引用既有的 SKY_CONFIG／SUN_CONFIG／FOG_CONFIG／HEMISPHERE_LIGHT_CONFIG／GROUND_CONFIG，
// 一個數字都不改（tests/weather.test.ts 釘住）。其他天氣只是換數值，不加新的著色器分支。
import type { WeatherId } from '../core/weather';
import { ftToM } from '../core/units';
import type { QualityLevel } from './quality';
import {
  FOG_CONFIG,
  GROUND_CONFIG,
  HEMISPHERE_LIGHT_CONFIG,
  SKY_CONFIG,
  SUN_CONFIG,
} from './renderConfig';

/** 天空（three 的程序化 Sky）的參數；意義同 SKY_CONFIG。 */
export interface SkyPreset {
  readonly turbidity: number;
  readonly rayleigh: number;
  readonly mieCoefficient: number;
  readonly mieDirectionalG: number;
  readonly cloudCoverage: number;
  readonly cloudDensity: number;
  readonly cloudElevation: number;
  readonly cloudScale: number;
  /** 背景裡太陽（夜晚當月亮）圓盤的亮度倍率。 */
  readonly sunDiscIntensity: number;
  /** 天空亮度的倍率（穹頂）。 */
  readonly intensity: number;
  /** 環境光（反射＋補光）的倍率。 */
  readonly environmentIntensity: number;
  /**
   * 陰天的雲層：整片天空蓋上霧色的不透明度（0 = 沒有，只有地平線的霾；1 = 整片都是霧色）。
   * Preetham 天空畫不出陰天，用這一層把天空壓成灰的。
   */
  readonly overcast: number;
}

/** 主光：太陽，夜晚是月亮。方位用 heading 約定（0 = 北，順時針為正）。 */
export interface SunPreset {
  readonly color: number;
  readonly intensity: number;
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
}

/** 霧與地平線的霾；意義同 FOG_CONFIG。 */
export interface FogPreset {
  readonly color: number;
  readonly nearM: number;
  readonly farM: number;
  /** 環境貼圖下半球的顏色（地面的反彈色）。 */
  readonly groundColor: number;
}

/** 半球補光；意義同 HEMISPHERE_LIGHT_CONFIG。 */
export interface HemispherePreset {
  readonly skyColor: number;
  readonly groundColor: number;
  readonly intensity: number;
}

/** 地面的潮濕與積水：潮濕噪聲超過門檻的地方才濕；門檻越低濕的面積越大。 */
export interface GroundWetnessPreset {
  readonly wetStart: number;
  readonly wetEnd: number;
  readonly wetDarken: number;
  readonly wetRoughness: number;
  readonly puddleStart: number;
  readonly puddleEnd: number;
  readonly puddleRoughness: number;
  /**
   * 沒有潮濕著色器的畫質級別（low）用的替代：整片地面的底色乘上 colorScale、粗糙度換成 roughness。
   * null = 不動（乾的天氣，以及基準的 dusk）。
   */
  readonly fallback: { readonly colorScale: number; readonly roughness: number } | null;
}

/** 一種天氣的全部數值。 */
export interface WeatherPreset {
  readonly sky: SkyPreset;
  readonly sun: SunPreset;
  readonly fog: FogPreset;
  readonly hemisphere: HemispherePreset;
  readonly ground: GroundWetnessPreset;
  /** 雨量：雨絲數 = 這個畫質級別的上限 × 這個比例；0 = 不下雨。下雨時不揚灰塵、不飄落葉。 */
  readonly rain: number;
  /** 有沒有閃電（只有閃光，沒有電弧）。 */
  readonly lightning: boolean;
  /** 路燈亮不亮（白天不亮）。 */
  readonly lampsOn: boolean;
  /** 建築、金屬、人行道（材質庫的表面）有多濕（0 乾、1 正在下大雨）：顏色變深、反光變亮、雨痕更明顯。 */
  readonly surfaceWetness: number;
}

/** 黃昏：基準畫面，全部引用既有設定。 */
const DUSK: WeatherPreset = {
  sky: { ...SKY_CONFIG, overcast: 0 },
  sun: SUN_CONFIG,
  fog: FOG_CONFIG,
  hemisphere: HEMISPHERE_LIGHT_CONFIG,
  ground: { ...GROUND_CONFIG, fallback: null },
  rain: 0,
  lightning: false,
  lampsOn: true,
  surfaceWetness: 0,
};

/** 門檻放在噪聲值域（0–1）之外：整片都不濕。 */
const DRY_GROUND: GroundWetnessPreset = {
  ...DUSK.ground,
  wetStart: 2,
  wetEnd: 3,
  puddleStart: 2,
  puddleEnd: 3,
};

/** 下雨中的地面：全面潮濕，低窪處成片積水。 */
const RAINY_GROUND: GroundWetnessPreset = {
  wetStart: -0.3,
  wetEnd: 0.05,
  wetDarken: 0.42,
  wetRoughness: 0.42,
  puddleStart: 0.46,
  puddleEnd: 0.56,
  puddleRoughness: 0.08,
  fallback: { colorScale: 0.62, roughness: 0.45 },
};

/** 陰雨的天空：整片灰雲，看不到太陽圓盤。 */
const RAIN_SKY: SkyPreset = {
  ...SKY_CONFIG,
  turbidity: 10,
  rayleigh: 1,
  cloudCoverage: 0.9,
  cloudDensity: 0.8,
  sunDiscIntensity: 0,
  intensity: 0.2,
  environmentIntensity: 0.3,
  overcast: 0.86,
};

export const WEATHER_PRESETS: Readonly<Record<WeatherId, WeatherPreset>> = {
  // 晴天：白色的太陽、藍天、少雲、遠而淡的霧、乾地、路燈不亮。
  // 仰角 42°（下午）：一層樓高的建築影子比樓高略長，蓋過人行道、落到路面上，看得出是影子。
  clear: {
    sky: {
      ...SKY_CONFIG,
      turbidity: 2,
      rayleigh: 1.1,
      cloudCoverage: 0.22,
      sunDiscIntensity: 0.002,
      intensity: 0.3,
      environmentIntensity: 0.34,
      overcast: 0,
    },
    sun: { color: 0xfff3dc, intensity: 3.1, azimuthDeg: -38, elevationDeg: 42 },
    fog: { color: 0xa9bfd6, nearM: ftToM(260), farM: ftToM(1400), groundColor: 0x4a4744 },
    hemisphere: { skyColor: 0xbcd4ff, groundColor: 0x6e675f, intensity: 0.5 },
    ground: DRY_GROUND,
    rain: 0,
    lightning: false,
    lampsOn: false,
    surfaceWetness: 0,
  },
  dusk: DUSK,
  // 雨天：灰雲蓋滿、太陽很弱偏冷、近而灰的霧、全面潮濕＋積水、雨絲、路燈亮。
  rain: {
    sky: RAIN_SKY,
    sun: { color: 0xc3ccd8, intensity: 0.9, azimuthDeg: -32, elevationDeg: 40 },
    fog: { color: 0x7a838c, nearM: ftToM(60), farM: ftToM(380), groundColor: 0x30343a },
    hemisphere: { skyColor: 0xa9b6c6, groundColor: 0x4c4f55, intensity: 0.75 },
    ground: RAINY_GROUND,
    rain: 0.6,
    lightning: false,
    lampsOn: true,
    surfaceWetness: 0.85,
  },
  // 雨後：雲散了一半、低角度的暖陽、大片潮濕與積水（粗糙度低，逆光看反光明顯）、路燈不亮。
  wet: {
    sky: {
      ...SKY_CONFIG,
      turbidity: 4,
      rayleigh: 1.6,
      cloudCoverage: 0.55,
      cloudDensity: 0.6,
      sunDiscIntensity: 0.003,
      intensity: 0.3,
      environmentIntensity: 0.5,
      overcast: 0.18,
    },
    sun: { color: 0xffe2bd, intensity: 4.6, azimuthDeg: -32, elevationDeg: 22 },
    fog: { color: 0xa8b0b6, nearM: ftToM(160), farM: ftToM(850), groundColor: 0x3a3b3d },
    hemisphere: { skyColor: 0xb7c8e2, groundColor: 0x5d5850, intensity: 0.4 },
    ground: {
      wetStart: 0.22,
      wetEnd: 0.5,
      wetDarken: 0.38,
      wetRoughness: 0.36,
      puddleStart: 0.52,
      puddleEnd: 0.6,
      puddleRoughness: 0.05,
      fallback: { colorScale: 0.74, roughness: 0.5 },
    },
    rain: 0,
    lightning: false,
    lampsOn: false,
    surfaceWetness: 0.5,
  },
  // 雷雨：比雨天更暗、霧更近、雨更密，加上閃光。
  storm: {
    sky: { ...RAIN_SKY, intensity: 0.11, environmentIntensity: 0.17, overcast: 0.93 },
    sun: { color: 0xaab4c4, intensity: 0.4, azimuthDeg: -32, elevationDeg: 40 },
    fog: { color: 0x474e58, nearM: ftToM(35), farM: ftToM(240), groundColor: 0x1e2126 },
    hemisphere: { skyColor: 0x8794a8, groundColor: 0x33363c, intensity: 0.5 },
    ground: RAINY_GROUND,
    rain: 1,
    lightning: true,
    lampsOn: true,
    surfaceWetness: 1,
  },
  // 夜晚：很暗的天空（白天的天空壓到很暗）、冷色的弱月光、深藍的近霧、乾地；路燈與車頭燈是主要光源。
  night: {
    sky: {
      ...SKY_CONFIG,
      turbidity: 2,
      rayleigh: 1.4,
      cloudCoverage: 0.2,
      sunDiscIntensity: 0.012,
      intensity: 0.012,
      environmentIntensity: 0.02,
      overcast: 0,
    },
    sun: { color: 0x8ea6e8, intensity: 0.55, azimuthDeg: 40, elevationDeg: 38 },
    fog: { color: 0x0b1020, nearM: ftToM(70), farM: ftToM(420), groundColor: 0x07090f },
    hemisphere: { skyColor: 0x3a4a78, groundColor: 0x14141c, intensity: 0.32 },
    ground: DRY_GROUND,
    rain: 0,
    lightning: false,
    lampsOn: true,
    surfaceWetness: 0,
  },
};

/** 這種天氣的數值。 */
export function weatherPreset(weather: WeatherId): WeatherPreset {
  return WEATHER_PRESETS[weather];
}

/**
 * 雨絲：一個跟著車走的長方體裡的短線段，一個 draw call。low 沒有雨絲（靠霧、壓暗的地面與天空表現雨天）。
 */
export const RAIN_CONFIG = {
  /** 各畫質級別的雨絲數上限（實際數量 = 上限 × 這種天氣的雨量）。 */
  maxStreaks: { low: 0, medium: 900, high: 1800, ultra: 3000 } satisfies Record<QualityLevel, number>,
  /** 雨絲所在的長方體：以車為中心的水平邊長與高度。 */
  boxSizeM: ftToM(110),
  boxHeightM: ftToM(42),
  /** 落下的速度與一條雨絲的長度。 */
  fallSpeedMps: 13,
  streakLengthM: ftToM(2.6),
  /** 風把雨吹斜：水平速度（世界座標）。 */
  windXMps: 2.6,
  windZMps: 1.1,
  color: 0xc9d6e6,
  opacity: 0.34,
} as const;

/** 閃電（只有閃光）：時間表與閃光曲線的數值。 */
export const LIGHTNING_CONFIG = {
  /** 第一道閃電的時間（秒）；固定，方便截圖。 */
  firstStrikeS: 2,
  /** 兩道之間的間隔範圍（秒）；下限不低於 3 秒（光敏感考量）。 */
  minGapS: 4,
  maxGapS: 11,
  /** 一道閃電是兩下閃光：第二下在這麼久之後、亮度是第一下的這個比例。 */
  secondPulseDelayS: 0.16,
  secondPulseScale: 0.6,
  /** 一下閃光淡掉的時間常數（秒）與整道閃電的長度（之後當作 0）。 */
  decayS: 0.09,
  durationS: 0.7,
  /** 閃光最亮時：半球補光與環境光各乘上（1 + 這個值）；霧色與天空往 flashColor 靠這個比例。幅度刻意壓低。 */
  hemisphereBoost: 2.2,
  environmentBoost: 3,
  fogBlend: 0.3,
  skyBoost: 1.6,
  flashColor: 0xb9c6e6,
} as const;
