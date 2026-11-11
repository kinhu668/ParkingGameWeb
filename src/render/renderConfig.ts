// 畫面的可調數值：畫質級別、鏡頭、燈光、陰影、霧、後製、地面、車位標線、車輛外觀。
// 長度一律以英尺填寫，經 units.ts 換成公尺；顏色是 sRGB 十六進位。
import { degToRad, ftToM, mphToMps } from '../core/units';
import type { QualityLevel, QualitySettings } from './quality';

/** 算圖器。像素比上限與色調映射曲線跟著畫質級別走（QUALITY_PRESETS）。 */
export const RENDERER_CONFIG = {
  /** 曝光倍率。天空、太陽、補光的強度都是以 1 為準調的。 */
  toneMappingExposure: 1.0,
} as const;

/**
 * 各畫質級別的開關與數值（解析與自動選擇見 quality.ts）。
 * - low：直接畫到畫面上，沒有任何全螢幕濾鏡；天空貼圖烘得小、陰影貼圖小、像素比上限 1。
 * - medium：low 加上暈影，天空與陰影較細；仍然直接畫到畫面上，CPU 軟體算圖也跑得動。
 * - high：走高動態範圍的後製鏈：環境光遮蔽、泛光、色差、暈影、抖色。
 * - ultra：high 的全部再加強，另加 SMAA。對準高階顯示卡，只能由 `?quality=ultra` 開啟。
 * 黃昏的色調分級併在色調映射裡，四個級別都有。
 */
export const QUALITY_PRESETS: Readonly<Record<QualityLevel, QualitySettings>> = {
  low: {
    level: 'low',
    maxPixelRatio: 1,
    toneMapping: 'agx',
    shadowMapSize: 1024,
    msaaSamples: 4,
    skyCubeSizePx: 256,
    ambientOcclusion: null,
    bloom: null,
    lens: null,
    smaa: false,
  },
  medium: {
    level: 'medium',
    maxPixelRatio: 1.5,
    toneMapping: 'agx',
    shadowMapSize: 2048,
    msaaSamples: 4,
    skyCubeSizePx: 512,
    ambientOcclusion: null,
    bloom: null,
    lens: { vignette: 0.24, chromaticAberration: 0 },
    smaa: false,
  },
  high: {
    level: 'high',
    maxPixelRatio: 2,
    toneMapping: 'agx',
    shadowMapSize: 4096,
    msaaSamples: 4,
    skyCubeSizePx: 1024,
    ambientOcclusion: { radiusM: 0.6, samples: 12, denoiseSamples: 12, intensity: 0.85 },
    bloom: { strength: 0.18, radius: 0.5, threshold: 1.8 },
    lens: { vignette: 0.4, chromaticAberration: 0.0012 },
    smaa: false,
  },
  ultra: {
    level: 'ultra',
    maxPixelRatio: 2,
    toneMapping: 'agx',
    shadowMapSize: 4096,
    msaaSamples: 4,
    skyCubeSizePx: 2048,
    ambientOcclusion: { radiusM: 0.75, samples: 24, denoiseSamples: 16, intensity: 1 },
    bloom: { strength: 0.24, radius: 0.6, threshold: 1.6 },
    lens: { vignette: 0.4, chromaticAberration: 0.0012 },
    smaa: true,
  },
};

/**
 * 黃昏的色調分級，接在 AgX 色調映射之後（數值在顯示線性空間，也就是轉 sRGB 之前）。
 * 併在色調映射的函式裡，所以直接畫到畫面上（low、medium）與走後製鏈（high、ultra）的顏色是同一套。
 */
export const TONE_LOOK_CONFIG = {
  /** 暗部加上的冷色（線性 RGB）；越暗加越多。 */
  shadowLift: { r: 0.0, g: 0.0025, b: 0.007 },
  /** 亮部乘上的暖色（線性 RGB 倍率）。 */
  highlightTint: { r: 1.0, g: 0.955, b: 0.88 },
  /** 飽和度（1 = 不變）。AgX 的畫面偏灰，補回來。 */
  saturation: 1.3,
  /** 對比：以 contrastPivot 為支點的冪次（1 = 不變）。 */
  contrast: 1.1,
  contrastPivot: 0.18,
} as const;

/**
 * 斜俯視跟隨鏡頭（`?cam=follow` 的定格與 `?bench` 用；一般遊戲的鏡頭見 GAME_CAMERA_CONFIG）。
 * 偏移是世界座標：鏡頭在目標點的上方、南邊（+Z），朝北看。
 */
export const CAMERA_CONFIG = {
  fovDeg: 40,
  nearM: ftToM(2),
  farM: ftToM(1500),
  offsetHeightM: ftToM(45),
  offsetBackM: ftToM(55),
  /** 跟隨平滑的時間常數（秒）；越大鏡頭越「拖」。 */
  followTimeConstantS: 0.25,
} as const;

/** `?cam=` 的固定鏡頭預設。`follow` 沿用 CAMERA_CONFIG，這裡是另外兩個。 */
export const FIXED_CAMERA_CONFIG = {
  /** `top`：車位正上方的高度；夠高才看得到示範路線左右繞出去的那一段。 */
  topHeightM: ftToM(150),
  /** `spot_low`：鏡頭相對車位中心的位置，以車位自己的方向為準。橫向負值 = 車位左側。 */
  spotLowLateralM: ftToM(-17),
  /** 沿車位 heading 往前的距離（鏡頭在車位前方，回頭看車頭）。 */
  spotLowAheadM: ftToM(15),
  spotLowHeightM: ftToM(4.5),
  /** 鏡頭看向車位中心上方這個高度（大約是車身腰線）。 */
  spotLowLookAtHeightM: ftToM(2),
} as const;

/**
 * 一般遊戲的鏡頭（按 V 循環）。每個模式有自己的視角（fovDeg）與近平面（nearM）；
 * 貼在車上的兩個模式近平面要很近，否則會把眼前的引擎蓋、儀表板切掉。
 */
export const GAME_CAMERA_CONFIG = {
  farM: ftToM(1500),

  /** 車向前快過這個速度，跟車鏡頭的平滑朝向才追車頭；倒車快過這個速度則極慢地跟。其間（幾乎靜止）不動。 */
  headingFollowSpeedMps: mphToMps(1),
  /** 前進時平滑朝向追車頭的時間常數（秒）；轉彎時鏡頭會稍微落後。 */
  headingTimeConstantS: 0.35,
  /** 倒車時的時間常數（秒）：很慢，鏡頭留在車尾後方，不會甩到車頭前面。 */
  reverseHeadingTimeConstantS: 2,
  /** 跟車鏡頭位置與看向點的平滑時間常數（秒）。 */
  positionTimeConstantS: 0.14,
  lookAtTimeConstantS: 0.08,

  /** 近距離跟車：鏡頭在車尾後方不遠、略高於車頂，看向車身上方。 */
  chaseNear: {
    fovDeg: 58,
    nearM: ftToM(1),
    /** 鏡頭離車尾（後保險桿）的水平距離。 */
    behindRearM: ftToM(11),
    heightM: ftToM(5.5),
    /** 看向車身中心上方這個高度。 */
    lookAtHeightM: ftToM(4),
  },
  /** 遠距離跟車：較高較遠的斜俯視，看得到車四周的地面。 */
  chaseFar: {
    fovDeg: 45,
    nearM: ftToM(2),
    behindRearM: ftToM(30),
    heightM: ftToM(22),
    lookAtHeightM: ftToM(2),
  },
  /** 引擎蓋：視點在引擎蓋中線上方，沿車頭向前略俯，畫面下方看得到引擎蓋與車頭。 */
  hood: {
    fovDeg: 65,
    nearM: ftToM(0.25),
    /** 相對車身中心：向右為正。 */
    lateralM: 0,
    heightM: ftToM(3.55),
    /** 相對車身中心：向車頭為正。前擋下緣在 2.9 ft，這裡在它前方的引擎蓋上。 */
    aheadM: ftToM(4.2),
    pitchDownRad: degToRad(5),
  },
  /** 駕駛座：左側座位的眼睛位置，低於車頂、高於儀表板，在前擋後方。 */
  cockpit: {
    fovDeg: 72,
    nearM: ftToM(0.25),
    lateralM: ftToM(-1.3),
    heightM: ftToM(3.9),
    aheadM: ftToM(-0.8),
    pitchDownRad: degToRad(3),
  },
  /** 俯視：車正上方垂直往下看，畫面上方是北（−Z），停車對位用。 */
  top: {
    fovDeg: 50,
    nearM: ftToM(2),
    heightM: ftToM(70),
  },
} as const;

/** `?show=` 展示台：深色背景、圓形地台、固定主光與 3/4 視角。 */
export const SHOWCASE_CONFIG = {
  backgroundColor: 0x1b1e23,
  /** 地台比車身與白色標線都暗，物件才跳得出來。 */
  floorColor: 0x3a3e45,
  floorRoughness: 0.9,
  floorRadiusM: ftToM(30),
  floorSegments: 96,
  /**
   * 從物件指向主光的方向：正前方偏右的上空。從鏡頭看過去車頂最亮、車頭次之、
   * 側面最暗但仍受光，三個面分得開；影子落在車後，不擋住物件。
   */
  directionToKeyLight: { x: 0.45, y: 1, z: -0.75 },
  /** 鏡頭方位：從物件正前方（本地 −Z）往右繞的角度。 */
  cameraAzimuthDeg: 38,
  /** 鏡頭仰角：從水平面往上的角度。 */
  cameraElevationDeg: 24,
  /**
   * 鏡頭距離 = 「包圍球剛好塞滿畫面」的距離 × 這個倍數。包圍球由包圍盒的對角線算出，
   * 對長條形的物件偏大，所以拉近一點讓物件佔滿畫面中央。
   */
  fitScale: 0.9,
} as const;

/** `?bench` 效能測試。跑多久由示範路線的長度決定。 */
export const BENCH_CONFIG = {
  /** 開頭略過的幀數（編譯著色器、上傳貼圖的那幾幀不算）。 */
  warmupFrames: 30,
  /** 時間到了但量到的幀數還不到這個數（幀率極低）就繼續跑，確保算得出統計。 */
  minMeasuredFrames: 10,
  /** 「1% low」取最慢的這個比例的幀。 */
  lowFraction: 0.01,
  /** FPS 與平均 draw calls 顯示到小數第幾位。 */
  decimals: 1,
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

/** 鏡頭效果與後製鏈裡不隨畫質級別改變的數值。 */
export const POST_CONFIG = {
  /** 暈影從離畫面中心多遠開始、到多遠壓到最暗（以畫面半高為 1；16:9 的角落大約是 2）。 */
  vignetteInner: 0.85,
  vignetteOuter: 2.1,
  /** 環境光遮蔽的降噪半徑（像素）。 */
  aoDenoiseRadiusPx: 8,
  /** `?cam` 定格前，要等後製鏈的非同步資源（SMAA 查表貼圖）最多這麼久（毫秒）；逾時就照常畫。 */
  readyTimeoutMs: 2000,
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

/** 車位標線。 */
export const SPOT_MARKING_CONFIG = {
  /** 線寬（4 英吋）。線畫在車位邊界的內側，外緣就是邊界。 */
  lineWidthM: ftToM(1 / 3),
  /** 標線離地高度；夠高才不會與地面共面閃爍，又低到看不出浮起來。 */
  liftM: ftToM(0.03),
  color: 0xf1f1ea,
  roughness: 0.82,
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
  /** 儀表板：下車身頂面上、前擋後方的一條箱子，整個藏在車艙玻璃裡，只有駕駛座視角看得到。 */
  dashboardHeightM: ftToM(0.35),
  dashboardLengthM: ftToM(1.85),
  /** 儀表板比車艙底部每側內縮，也離前擋下緣這麼遠（玻璃往內斜，要退到斜面後方）。 */
  dashboardInsetM: ftToM(0.45),
  /** A 柱（沿前擋兩側斜邊的細柱）的粗細。 */
  pillarThicknessM: ftToM(0.18),

  bodyColor: 0x1f63b3,
  bodyRoughness: 0.38,
  bodyMetalness: 0.25,
  glassColor: 0x18222d,
  glassRoughness: 0.12,
  dashboardColor: 0x23272d,
  dashboardRoughness: 0.85,
  tireColor: 0x17181a,
  tireRoughness: 0.9,
  hubColor: 0xb4bac1,
  hubRoughness: 0.4,
  headlightColor: 0xfff3d0,
  headlightEmissiveIntensity: 1.6,
  taillightColor: 0xe01218,
  taillightEmissiveIntensity: 1.3,
} as const;
