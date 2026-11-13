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

/**
 * 空氣：貼地的霧氣（高度霧，render/heightFog.ts）與光在空氣裡散射出來的程度（光柱，render/lightShaft.ts）。
 * 雨、雷雨、夜晚才有；晴天、黃昏、雨後的空氣是乾淨的（只有原本那一層很淡的遠霧）。
 */
export interface AirPreset {
  /** 貼地霧氣在地面的濃度（每公尺的消光量）；0 = 沒有，霧就是原本的線性遠霧，一個像素都不變。 */
  readonly mistDensityPerM: number;
  /** 霧氣濃度每升高這麼多就剩下 1/e：越小越貼地。 */
  readonly mistHeightM: number;
  /** 路燈光錐的亮度倍率（1 = 黃昏的基準）。雨裡散射強，光錐比乾的夜晚明顯。 */
  readonly lampShaft: number;
  /** 頭燈光柱的亮度倍率；0 = 不畫（乾淨的空氣裡看不到車燈的光柱）。 */
  readonly headlightShaft: number;
}

/** 倒車輔助層小畫面（後視鏡、倒後鏡頭、鳥瞰）的暗部增益：夜裡把暗處抬亮，白天不動。只影響小畫面，不影響主畫面。 */
export interface AssistViewPreset {
  /** 最暗處的亮度乘上這個倍數（場景線性亮度，色調映射之前）；1 = 不動。 */
  readonly darkGain: number;
  /** 抬亮後的暗部最多到這個亮度；比它亮的地方（路燈、車燈、受光的牆）維持原樣。 */
  readonly kneeLuma: number;
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
  /** 有沒有閃電（閃光＋電弧）。 */
  readonly lightning: boolean;
  /** 路燈亮不亮（白天不亮）。 */
  readonly lampsOn: boolean;
  /** 建築、金屬、人行道（材質庫的表面）有多濕（0 乾、1 正在下大雨）：顏色變深、反光變亮、雨痕更明顯。 */
  readonly surfaceWetness: number;
  /** 貼地霧氣與光柱。 */
  readonly air: AirPreset;
  /** 倒車輔助層小畫面的暗部增益。 */
  readonly assistView: AssistViewPreset;
}

/** 乾淨的空氣：沒有貼地霧氣、沒有頭燈光柱；路燈光錐是基準亮度。 */
const CLEAR_AIR: AirPreset = { mistDensityPerM: 0, mistHeightM: 1, lampShaft: 1, headlightShaft: 0 };

/** 白天與黃昏：小畫面不必抬亮。 */
const NO_ASSIST_GAIN: AssistViewPreset = { darkGain: 1, kneeLuma: 0.3 };

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
  air: CLEAR_AIR,
  assistView: NO_ASSIST_GAIN,
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
    // 強度 3.45：仰角從 52° 降到 42° 之後受光的地面暗了約 15%（sin 42° ÷ sin 52°），補回大約一半；
    // 仰角不動，樓的影子長度不變。
    sun: { color: 0xfff3dc, intensity: 3.45, azimuthDeg: -38, elevationDeg: 42 },
    fog: { color: 0xa9bfd6, nearM: ftToM(260), farM: ftToM(1400), groundColor: 0x4a4744 },
    hemisphere: { skyColor: 0xbcd4ff, groundColor: 0x6e675f, intensity: 0.53 },
    ground: DRY_GROUND,
    rain: 0,
    lightning: false,
    lampsOn: false,
    surfaceWetness: 0,
    air: CLEAR_AIR,
    assistView: NO_ASSIST_GAIN,
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
    // 雨幕：貼地一層水氣，路燈與車燈在雨裡打出看得見的光柱。
    air: { mistDensityPerM: 0.02, mistHeightM: ftToM(13), lampShaft: 2.6, headlightShaft: 1 },
    assistView: { darkGain: 1.5, kneeLuma: 0.3 },
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
    air: CLEAR_AIR,
    assistView: NO_ASSIST_GAIN,
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
    // 比雨天更濃、更厚的水氣；光柱最明顯。
    air: { mistDensityPerM: 0.028, mistHeightM: ftToM(16), lampShaft: 3, headlightShaft: 1.2 },
    assistView: { darkGain: 2.6, kneeLuma: 0.3 },
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
    // 乾的夜晚：只有薄薄一層夜霧；光柱看得到，但比雨裡淡。
    air: { mistDensityPerM: 0.006, mistHeightM: ftToM(10), lampShaft: 2.4, headlightShaft: 0.6 },
    assistView: { darkGain: 5, kneeLuma: 0.3 },
  },
};

/**
 * 個別關卡的太陽方位（heading 約定：0 = 北 = −Z，順時針為正）。只蓋掉方位，仰角、顏色、強度仍是這種天氣的。
 * 這兩關的主建築在場地的南邊／東邊，預設方位的影子落在樓後面；太陽改從樓的那一側過來，
 * 樓的影子才落在場地上。`?weather=` 換了天氣也照用（樓的位置沒變）。
 * - w1_l03（大賣場，樓在南 +Z）：160° = 南南東，影子斜向西北掃進場地。
 * - w1_l06（郵局黃昏，樓在東 +X）：112° = 東南東，影子朝西北西落進場地。起點的車頭朝東，太陽一定在畫面裡；
 *   正東（90–100°）時夕陽剛好在樓頂正上方，整棟樓與車都被逆光洗白，偏到 112° 太陽在樓的右邊，招牌與磚牆仍看得清楚。
 */
export const LEVEL_SUN_AZIMUTH_DEG: Readonly<Record<string, number>> = {
  w1_l03: 160,
  w1_l06: 112,
};

/** 這一關、這種天氣的太陽方位（度）：關卡有覆寫就用覆寫的，否則是天氣預設的。 */
export function sunAzimuthDeg(weather: WeatherId, levelId?: string): number {
  const override = levelId === undefined ? undefined : LEVEL_SUN_AZIMUTH_DEG[levelId];
  return override ?? WEATHER_PRESETS[weather].sun.azimuthDeg;
}

/** 這種天氣的數值。 */
export function weatherPreset(weather: WeatherId): WeatherPreset {
  return WEATHER_PRESETS[weather];
}

/**
 * 雨絲：一個跟著車走的長方體裡的短線段，一個 draw call。每個畫質級別都有；low 的數量少，
 * 所以每一條畫得長一點、亮一點（lowStreak），一眼看得出在下雨，又不拖慢低階裝置。
 */
export const RAIN_CONFIG = {
  /** 各畫質級別的雨絲數上限（實際數量 = 上限 × 這種天氣的雨量）。 */
  maxStreaks: { low: 560, medium: 900, high: 1800, ultra: 3000 } satisfies Record<QualityLevel, number>,
  /** low 的雨絲：長度是一般的這個倍數、不透明度換成這個值（數量比 medium 少，靠每一條更醒目補回來）。 */
  lowStreak: { lengthScale: 1.5, opacity: 0.6 },
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

/** 閃電：時間表、閃光曲線，以及看得見的電弧（effects/lightningBolt.ts、effects/lightningArc.ts）的數值。 */
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
  fogBlend: 0.15,
  skyBoost: 1.6,
  flashColor: 0xb9c6e6,

  /**
   * 電弧：每一道閃電有一條主電弧與一條次電弧，從雲底打到場地外面的地上，閃光期間看得見、跟著閃光亮與淡。
   * 形狀與落點只由種子與「第幾道」決定。落點以車位為準：從車位中心沿某個方位走出場地邊界，再往外 extra 那麼遠；
   * 電弧越往上越往場地外面斜，所以不會從場地（玩家）上空穿過。
   */
  arc: {
    /**
     * 第一道（t = firstStrikeS，截圖用）主電弧的方位：相對車位的朝向、順時針（0 = 車位前方、90 = 右方）。
     * 148° 是車位的右後方：`?cam=spot_low` 的鏡頭正朝這個方向看，俯視鏡頭（`?cam=top`）也拍得到落點。
     */
    firstBearingDeg: 148,
    /** 之後每一道的方位比前一道多轉這麼多（黃金角：不會老是打在同一側），再加上 ± jitter 的亂數。 */
    turnDeg: 137.5,
    bearingJitterDeg: 14,
    /** 次電弧的方位 = 主電弧的方位 + 這個角度（大致在場地的另一側）。 */
    secondaryBearingDeg: 180,
    /** 落點在場地邊界之外多遠：主電弧與次電弧各自的範圍。 */
    mainExtraM: { min: ftToM(30), max: ftToM(48) },
    secondaryExtraM: { min: ftToM(20), max: ftToM(34) },
    /** 整條電弧（含半空中的折線與分岔）離場地外框至少這麼遠：折線的亂數偏移把點推進來時，再把它推出去。 */
    keepOutMarginM: ftToM(12),
    /** 雲底的高度範圍，以及電弧頂端比落點更往場地外面多遠、左右偏多遠（最大）。 */
    cloudHeightM: { min: ftToM(380), max: ftToM(470) },
    leanOutM: { min: ftToM(60), max: ftToM(150) },
    leanSideM: ftToM(70),
    /** 折線：對半細分幾次（主電弧 2^n 段）、第一次偏移的幅度（佔全長的比例）、每細分一次幅度剩多少。 */
    subdivisions: 6,
    jitterFraction: 0.06,
    roughness: 0.62,
    /** 分岔：幾條（最少、最多）、從主電弧的哪一段分出去（由上往下的比例）、長度（佔主電弧的比例）、細分次數。 */
    branches: { min: 3, max: 5 },
    branchFrom: { min: 0.12, max: 0.72 },
    branchLength: { min: 0.1, max: 0.24 },
    branchSubdivisions: 4,
    /** 面片的寬度（含外圍的光暈；中間最亮的芯只佔 coreFraction）與各部分的亮度比例。 */
    mainWidthM: ftToM(5),
    secondaryScale: 0.7,
    branchScale: 0.5,
    coreFraction: 0.12,
    /** 芯與光暈在閃光最亮時加到畫面上的量：走後製鏈（場景亮度，芯超過泛光門檻）／直接畫到畫面上（顯示亮度）。 */
    coreBrightness: { hdr: 9, direct: 1.25 },
    haloBrightness: { hdr: 0.5, direct: 0.22 },
    /** 離鏡頭這麼近以內的電弧完全不畫、到這麼遠才全亮：電弧不可能塞住鏡頭。 */
    cameraFadeNearM: ftToM(25),
    cameraFadeFarM: ftToM(60),
    /** 遠處的電弧被霧吃掉的比例（它自己會發光，不會完全消失）。 */
    fogFade: 0.45,
    /** 落點地上的一圈閃光：半徑、離地高度（高過人行道）、最亮處的亮度。 */
    groundGlowRadiusM: ftToM(24),
    groundGlowLiftM: ftToM(0.6),
    groundGlowBrightness: { hdr: 1.2, direct: 0.4 },
  },
} as const;
