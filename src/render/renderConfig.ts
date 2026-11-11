// 畫面的可調數值：畫質級別、鏡頭、天空、燈光、陰影、霧、後製、地面、車位標線、路緣石與車擋、車輛外觀。
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
 * 地面（ground）：low 的噪聲貼圖小、沒有潮濕反光；medium 加上潮濕反光；high、ultra 再加上法線（裂縫與顆粒的立體感）。
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
    ground: { textureSizePx: 512, maxAnisotropy: 2, normals: false, wetness: false },
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
    ground: { textureSizePx: 1024, maxAnisotropy: 4, normals: false, wetness: true },
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
    ground: { textureSizePx: 1024, maxAnisotropy: 8, normals: true, wetness: true },
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
    ground: { textureSizePx: 2048, maxAnisotropy: 16, normals: true, wetness: true },
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
  /** 主光是中性偏暖的棚燈，不是遊戲裡低角度的橘色夕陽；反射與補光仍來自黃昏的環境貼圖。 */
  keyLightColor: 0xfff1df,
  keyLightIntensity: 3.4,
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

/**
 * 黃昏的天空（three 的程序化 Sky，Preetham 大氣散射＋雲）。
 * 天空在建立場景時烘成立方體貼圖當背景，再由它生成環境貼圖（PMREM）；之後每幀只是查貼圖。
 */
export const SKY_CONFIG = {
  /** 大氣混濁度：越大地平線附近越霧、越暖。 */
  turbidity: 3,
  /** 瑞利散射係數：越大天頂越藍、太陽附近越橘紅。 */
  rayleigh: 3,
  mieCoefficient: 0.003,
  /** 米氏散射的方向性：越接近 1，太陽周圍的光暈越集中。 */
  mieDirectionalG: 0.85,
  cloudCoverage: 0.42,
  cloudDensity: 0.5,
  cloudElevation: 0.5,
  cloudScale: 0.0002,
  /**
   * 背景裡太陽圓盤的亮度倍率。原始的圓盤亮到幾萬，泛光會整片炸白；壓到這個比例後仍是畫面最亮的東西。
   * 環境貼圖一律不畫圓盤（那個亮點會在粗糙反射裡變成雜斑），太陽的高光由 DirectionalLight 負責。
   */
  sunDiscIntensity: 0.004,
  /**
   * 天空亮度的倍率（Sky 算出來的數值對這個場景的曝光來說太亮）。
   * 穹頂與環境貼圖各自乘上自己的倍率；地平線的霾烘進貼圖時會先除回來，畫出來剛好是霧色。
   */
  intensity: 0.35,
  /** 環境光（反射＋補光）的倍率。 */
  environmentIntensity: 0.4,
  /** 環境貼圖來源的每面邊長（像素）；只給反射與補光用，不必大。 */
  environmentCubeSizePx: 256,
} as const;

/**
 * 霧與地平線的霾。霧把遠處的地面染成 color；天空貼圖在地平線上也疊了一圈同色的霾，
 * 往上漸淡到 hazeTopDeg，所以地面與天空的交界是同一個顏色，沒有硬邊。
 */
export const FOG_CONFIG = {
  /** 黃昏的暖灰霾。 */
  color: 0x958282,
  nearM: ftToM(120),
  farM: ftToM(700),
  /** 霾從地平線往上淡到完全透明的仰角。 */
  hazeTopDeg: 9,
  /** 地平線以下這個俯角之後，環境貼圖的下半球是地面反彈色（只影響反射與補光，畫面上被地面擋住）。 */
  groundFadeDeg: 12,
  /** 環境貼圖下半球的顏色：受黃昏光的柏油。 */
  groundColor: 0x3b3531,
} as const;

/** 半球補光：上方是黃昏偏冷的天空色、下方是地面的暖色反彈。大部分的補光來自環境貼圖，這裡只補一點。 */
export const HEMISPHERE_LIGHT_CONFIG = {
  skyColor: 0x9fb4e0,
  groundColor: 0x6b5244,
  intensity: 0.25,
} as const;

/** 太陽（DirectionalLight）與陰影。陰影貼圖的解析度跟著畫質級別走。 */
export const SUN_CONFIG = {
  /** 低角度的陽光穿過厚大氣，偏橘。 */
  color: 0xffb98a,
  intensity: 8,
  /**
   * 太陽的方位（heading 約定：0 = 北，順時針為正）與仰角。西北方、很低：
   * 車從起點朝北開，太陽在左前方，跟車鏡頭看得到它；影子又長又斜，落向東南（鏡頭這一側）。
   */
  azimuthDeg: -32,
  elevationDeg: 9,
  /** 光源離目標點的距離。 */
  distanceM: ftToM(160),
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

/**
 * 地面：一大片平面，柏油的細節在著色器裡用世界座標（xz）算，不會隨地面網格平移，也沒有可見的重複周期。
 * 噪聲來源是一張固定種子的四色版貼圖（R 顆粒、G 大片深淺、B 裂縫、A 斑塊），
 * 以幾個互不成整數比的周期與角度疊起來：每一層自己會重複，疊在一起就看不出周期。
 * 貼圖解析度、法線、潮濕反光跟著畫質級別走（QUALITY_PRESETS 的 ground）。
 */
export const GROUND_CONFIG = {
  /** 地面正方形邊長；要大於兩倍霧的遠端，邊緣才藏得住。地面跟著車走，車開不到邊緣。 */
  sizeM: ftToM(2400),
  roughness: 0.93,
  /** 柏油底色。 */
  baseColor: 0x5d5e62,

  /**
   * 各層噪聲在世界座標上的周期與旋轉角度。周期彼此不成整數比、角度都不同，
   * 所以疊起來的圖樣在看得到的範圍（霧的遠端 700 ft）內不會重複。
   */
  layers: {
    /** 細顆粒（R）：貼近看得到的碎石與孔隙。 */
    fineGrain: { periodM: ftToM(13.7), angleDeg: 0 },
    /** 粗顆粒（R）：中距離看到的斑駁。 */
    coarseGrain: { periodM: ftToM(47.3), angleDeg: 27.3 },
    /** 大片深淺 A、B（G）：鋪面新舊不均。 */
    macroA: { periodM: ftToM(347), angleDeg: 61.7 },
    macroB: { periodM: ftToM(113), angleDeg: -38.9 },
    /** 裂縫（B）。 */
    cracks: { periodM: ftToM(43.9), angleDeg: 14.2 },
    /** 油漬與污斑（A）。 */
    stains: { periodM: ftToM(61.3), angleDeg: -53.3 },
    /** 潮濕與積水的分布（A）。 */
    wetness: { periodM: ftToM(187), angleDeg: 43.1 },
  },

  /** 顆粒造成的明暗幅度（線性亮度的比例）：細顆粒、粗顆粒。 */
  fineGrainContrast: 0.5,
  coarseGrainContrast: 0.62,
  /** 大片深淺的明暗幅度：A、B。 */
  macroAContrast: 0.26,
  macroBContrast: 0.2,
  /** 老舊、積塵的區塊乘上的顏色（偏暖偏淺）。 */
  dustTint: { r: 1.08, g: 1.04, b: 0.97 },
  /** 裂縫：出現的範圍（大片噪聲超過 start 才開始有、到 end 全有）、壓暗的比例、被大片噪聲扭曲的量（貼圖座標）。 */
  crackMaskStart: 0.5,
  crackMaskEnd: 0.66,
  crackDarken: 0.78,
  crackWarp: 0.035,
  /** 油漬：斑塊噪聲超過 start 才開始有、到 end 最深；乘上的顏色；油漬處的粗糙度（比乾柏油亮）。 */
  stainStart: 0.68,
  stainEnd: 0.9,
  stainTint: { r: 0.45, g: 0.43, b: 0.42 },
  stainRoughness: 0.7,
  /** 潮濕：分布噪聲超過 start 開始濕、到 end 全濕；濕的地方顏色變深、粗糙度降低。 */
  wetStart: 0.64,
  wetEnd: 0.84,
  wetDarken: 0.28,
  wetRoughness: 0.62,
  /** 小片積水：分布噪聲超過這兩個值之間形成水面邊緣；水面的粗糙度（不是鏡子）。 */
  puddleStart: 0.87,
  puddleEnd: 0.91,
  puddleRoughness: 0.2,
  /** 法線用的高度（公尺）：細顆粒、粗顆粒的起伏，與裂縫的深度。 */
  fineGrainHeightM: 0.0011,
  coarseGrainHeightM: 0.004,
  crackDepthM: 0.006,
  /** 法線從這個距離開始淡出、到這個距離完全平坦（遠處的起伏小於一個像素，只會閃爍）。 */
  normalFadeStartM: ftToM(60),
  normalFadeEndM: ftToM(220),
} as const;

/** 地面噪聲貼圖（CPU 產生，固定種子）各色版的參數。格數是「一張貼圖內」的格數，貼圖上下左右可無縫拼接。 */
export const GROUND_NOISE_CONFIG = {
  /** R 顆粒：每個像素的亂數幅度、中等斑駁的幅度與格數（以 0.5 為中心，0–1）。 */
  grainAmplitude: 0.24,
  mottleAmplitude: 0.2,
  mottleCells: 96,
  /** 淺色碎石與深色孔隙：出現機率與亮度偏移。 */
  stoneChance: 0.02,
  stoneBrighten: 0.42,
  pitChance: 0.015,
  pitDarken: 0.36,
  /** G 大片深淺：三個倍頻的格數與權重。 */
  patchCells: [4, 9, 19],
  patchWeights: [0.5, 0.3, 0.2],
  /** B 裂縫：Voronoi 格數、格點抖動（0–1）、裂縫半寬（佔貼圖邊長的比例）、座標扭曲量與扭曲噪聲格數。 */
  crackCells: 6,
  crackJitter: 0.85,
  crackHalfWidth: 0.0016,
  crackWarp: 0.02,
  crackWarpCells: 13,
  /** 裂縫不是整張網：斷續噪聲（格數）低於 start 的段落整段消失，到 end 才完整。 */
  crackBreakCells: 7,
  crackBreakStart: 0.5,
  crackBreakEnd: 0.68,
  /** A 斑塊：三個倍頻的格數與權重。 */
  blotchCells: [5, 13, 31],
  blotchWeights: [0.55, 0.3, 0.15],
} as const;

/**
 * 車位標線：磨損過的漆。幾何仍是完整的矩形外框（外緣就是判定用的車位邊界），
 * 缺口、毛邊、褪色在著色器裡依車位本地座標算，所以每次畫出來都一樣。
 */
export const SPOT_MARKING_CONFIG = {
  /** 線寬（4 英吋）。線畫在車位邊界的內側，外緣就是邊界。 */
  lineWidthM: ftToM(1 / 3),
  /** 標線離地高度；夠高才不會與地面共面閃爍，又低到看不出浮起來。 */
  liftM: ftToM(0.03),
  /** 舊漆：不是全新的純白。 */
  color: 0xe4e2d6,
  roughness: 0.82,
  /** 漆面剝落的噪聲：最大一層的格子大小，往下兩層各縮小這個倍數。 */
  chipSizeM: ftToM(0.42),
  chipLacunarity: 3.1,
  /** 整段磨損的噪聲格子大小（沿線看到的一段一段深淺）。 */
  patchSizeM: ftToM(2.6),
  /** 基本磨損量（0 = 全新、1 = 全掉光）；整段磨損、線的邊緣、輪胎壓過處各自再加上的量。 */
  baseWear: 0.22,
  patchWear: 0.3,
  edgeWear: 0.26,
  tireWear: 0.34,
  /** 剝落邊緣的柔和度（噪聲值的範圍）；越小邊緣越銳利。 */
  chipSoftness: 0.05,
  /** 輪胎壓過的位置：車從車位後方進來，左右輪各在離中線這麼遠的地方壓過後緣的線。 */
  tireTrackOffsetM: ftToM(2.6),
  tireTrackHalfWidthM: ftToM(0.55),
  /** 褪色：漆面乘上的最暗比例（噪聲決定哪裡褪得多）。 */
  fadeMin: 0.62,
  /** 整體不透明度：舊漆薄，略透出底下的柏油。 */
  opacity: 0.94,
} as const;

/**
 * 停車場的路緣石：圍住場地的一圈低矮水泥邊。純視覺，沒有碰撞。
 * 範圍以車位自己的方向為準：左右對稱於車位中線，前緣在車位前緣之外，後緣在車位後方遠處（起點之後）。
 */
export const CURB_CONFIG = {
  /** 場地半寬（車位中線到左右路緣內側）。 */
  halfWidthM: ftToM(84),
  /** 車位前緣到前方路緣內側的距離。 */
  aheadOfSpotM: ftToM(4.5),
  /** 車位中心到後方路緣內側的距離；起點在車位後方 60 ft，還要留迴轉的空間。 */
  behindSpotM: ftToM(150),
  /** 路緣石的斷面：寬與高（各 6 英吋）。 */
  widthM: ftToM(0.5),
  heightM: ftToM(0.5),
  color: 0x9a968d,
  roughness: 0.9,
} as const;

/**
 * 車擋（輪擋）：車位盡頭的一條水泥塊。純視覺，沒有碰撞。
 * 放在車位前緣標線的外側：停車判定的車位矩形裡沒有它，車停到最前面也不會插進去。
 */
export const WHEEL_STOP_CONFIG = {
  /** 長（橫跨車位的方向）、底寬、頂寬、高。斷面是梯形。 */
  lengthM: ftToM(6),
  baseDepthM: ftToM(0.65),
  topDepthM: ftToM(0.4),
  heightM: ftToM(0.36),
  /** 車位前緣（標線外緣）到車擋最近那一面的距離。 */
  gapFromSpotM: ftToM(0.3),
  color: 0xb5ad94,
  roughness: 0.86,
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
  headlightEmissiveIntensity: 3,
  taillightColor: 0xe01218,
  taillightEmissiveIntensity: 0.9,
} as const;
