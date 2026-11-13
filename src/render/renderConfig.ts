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
 * 車模（vehicleDetail）：low、medium 用較少的細分，high、ultra 用較多。
 * 材質庫（materials）：low 貼圖 128、沒有法線、只取樣最正對的一面；medium 256＋法線；high 512＋三面混合；ultra 1024。
 * 地面（ground）：low 的噪聲貼圖小、沒有潮濕反光；medium 加上潮濕反光；high、ultra 再加上法線（裂縫與顆粒的立體感）。
 * 頭燈（headlights）：low 只有發光的燈殼；medium 在車頭前方的地上加一片光斑；high、ultra 再加不投影的真光源。
 * 輪胎痕（tireMarks）與粒子（particles）：low 只有少量輪胎痕、沒有粒子；級別越高，痕留得越久、灰塵與落葉越多。
 * 擺設（props）：級別越高，背景車、路燈、樹、建築越多；只有 high、ultra 有幾盞真的會照亮場景的路燈，
 * 其餘的燈（與 low、medium 的全部）只有自發光燈殼、光錐與地上的光暈。
 * 光柱（lightShafts）：有水氣的天氣（雨、雷雨、夜晚）每個級別都有路燈光錐與車頭燈光柱；low 的段數少、車頭只有一道、
 * 沒有霧氣流動的噪聲。乾淨的空氣（黃昏）裡 low 不畫光錐（props.lightCones）。
 * 不在這張表裡、但也分級的：雨絲數（weatherPresets.ts 的 RAIN_CONFIG.maxStreaks，low 也有，數量少、每條較長較亮）、
 * 倒車輔助小畫面的成本（REVERSE_ASSIST_CONFIG.quality）。貼地的霧氣（高度霧）每個級別都一樣，不花額外的 draw call。
 */
export const QUALITY_PRESETS: Readonly<Record<QualityLevel, QualitySettings>> = {
  low: {
    level: 'low',
    materials: { textureSizePx: 128, normals: false, triplanarBlend: false, maxAnisotropy: 2 },
    tireMarks: { maxSegments: 60, lifetimeS: 6 },
    particles: { dust: 0, leaves: 0 },
    headlights: { groundPool: false, spotLights: 0 },
    lightShafts: { radialSegments: 12, headlightBeams: 1, noiseOctaves: 0 },
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
    vehicleDetail: 'low',
    props: {
      parkedCars: 5,
      lampHeads: 4,
      realLights: 0,
      lightCones: false,
      pillars: 4,
      buildings: 5,
      trees: 5,
      bushes: 6,
      fencePostSpacingM: ftToM(20),
      detailFraction: 0.3,
      detailShadows: false,
      meshDetail: 'low',
    },
  },
  medium: {
    level: 'medium',
    materials: { textureSizePx: 256, normals: true, triplanarBlend: false, maxAnisotropy: 4 },
    tireMarks: { maxSegments: 160, lifetimeS: 10 },
    particles: { dust: 64, leaves: 36 },
    headlights: { groundPool: true, spotLights: 0 },
    lightShafts: { radialSegments: 20, headlightBeams: 2, noiseOctaves: 1 },
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
    vehicleDetail: 'low',
    props: {
      parkedCars: 10,
      lampHeads: 8,
      realLights: 0,
      lightCones: true,
      pillars: 8,
      buildings: 9,
      trees: 10,
      bushes: 14,
      fencePostSpacingM: ftToM(12),
      detailFraction: 0.6,
      detailShadows: false,
      meshDetail: 'low',
    },
  },
  high: {
    level: 'high',
    materials: { textureSizePx: 512, normals: true, triplanarBlend: true, maxAnisotropy: 8 },
    tireMarks: { maxSegments: 360, lifetimeS: 16 },
    particles: { dust: 110, leaves: 100 },
    headlights: { groundPool: true, spotLights: 1 },
    lightShafts: { radialSegments: 28, headlightBeams: 2, noiseOctaves: 2 },
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
    vehicleDetail: 'high',
    props: {
      parkedCars: 22,
      lampHeads: 15,
      realLights: 3,
      lightCones: true,
      pillars: 8,
      buildings: 14,
      trees: 20,
      bushes: 28,
      fencePostSpacingM: ftToM(8),
      detailFraction: 1,
      detailShadows: true,
      meshDetail: 'high',
    },
  },
  ultra: {
    level: 'ultra',
    materials: { textureSizePx: 1024, normals: true, triplanarBlend: true, maxAnisotropy: 16 },
    tireMarks: { maxSegments: 600, lifetimeS: 24 },
    particles: { dust: 160, leaves: 160 },
    headlights: { groundPool: true, spotLights: 2 },
    lightShafts: { radialSegments: 36, headlightBeams: 2, noiseOctaves: 2 },
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
    vehicleDetail: 'high',
    props: {
      parkedCars: 30,
      lampHeads: 19,
      realLights: 5,
      lightCones: true,
      pillars: 8,
      buildings: 18,
      trees: 28,
      bushes: 40,
      fencePostSpacingM: ftToM(8),
      detailFraction: 1,
      detailShadows: true,
      meshDetail: 'high',
    },
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
 * 跟車鏡頭的遮擋半透明：擋在鏡頭與玩家車之間的擺設（路燈、樹、背景車、建築塊…）淡成半透明，不擋了再恢復。
 */
export const OCCLUSION_FADE_CONFIG = {
  /** 擋住時的不透明度：仍看得出是什麼東西，但看得到後面的車。 */
  opacity: 0.3,
  /** 從不透明淡到半透明（或淡回來）要多久（秒）。 */
  fadeSeconds: 0.2,
  /** 視線旁邊多寬以內算擋住（公尺）：視線是幾條細線，擺設的佔地往外擴這麼多再測。 */
  sightMarginM: ftToM(0.7),
  /** 鏡頭離擺設這麼近（公尺）也淡掉：近平面會把它切開，畫面上是一塊破掉的車頂或牆。 */
  cameraClearanceM: ftToM(1.5),
  /** 視線看向車身上的幾個點：左右、前後各縮進車身的這個比例，高度是車高的這個比例。 */
  targetInset: 0.8,
  targetHeightRatio: 0.6,
  /** 比這個高度矮的障礙物與方塊不淡（交通錐、推車、路緣、人行道擋不住車）。 */
  minHeightM: ftToM(3.45),
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
    heightM: ftToM(3.8),
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

/**
 * 倒車輔助層的四台鏡頭（左右後視鏡、倒後鏡頭、鳥瞰）與各畫質的成本。
 * 四個畫面各畫進一張小的離屏緩衝區，再貼到主畫面上；長寬比在 core/assistLayout.ts。
 */
export const REVERSE_ASSIST_CONFIG = {
  farM: ftToM(600),
  /** 左右後視鏡：鏡頭在鏡殼外緣的上方、鏡面後面一點，朝車尾看，略往外、略往下。畫面左右鏡像。 */
  mirror: {
    fovDeg: 42,
    nearM: 0.05,
    /** 比車寬的一半再往外多少。 */
    outboardM: 0.04,
    heightM: ftToM(3.25),
    /** 相對車身中心往車頭的距離（後視鏡在前擋下緣附近）。 */
    aheadM: ftToM(1.45),
    yawOutRad: degToRad(12),
    pitchDownRad: degToRad(7),
  },
  /** 倒後鏡頭：車尾中央、行李廂蓋的高度，廣角、往下俯。畫面左右鏡像（與真車的倒車顯影一樣）。 */
  rear: {
    fovDeg: 96,
    nearM: 0.05,
    /** 鏡頭在後保險桿後面多少。 */
    behindRearM: 0.03,
    heightM: ftToM(3),
    pitchDownRad: degToRad(32),
  },
  /** 鳥瞰：車正上方垂直往下的正交鏡頭，車頭朝畫面上方、車在正中央。 */
  bird: {
    heightM: 20,
    /** 畫面上下各看多遠（公尺）；左右依長寬比。 */
    halfDepthM: ftToM(19),
    /** 離地這個高度以上的東西切掉不畫（燈頭、樹冠、雨遮不會蓋住車）。 */
    clipAboveGroundM: ftToM(10.5),
  },
  /**
   * 各畫質的成本：緩衝區解析度的倍率、多重取樣數、每幀最多重畫幾個視口（其餘沿用上一張，輪流更新）。
   * low、medium 沒有顯示卡也要跑得動：解析度減半或每幀只重畫一半。
   */
  quality: {
    low: { resolutionScale: 0.5, msaaSamples: 0, viewsPerFrame: 2 },
    medium: { resolutionScale: 1, msaaSamples: 0, viewsPerFrame: 2 },
    high: { resolutionScale: 1, msaaSamples: 4, viewsPerFrame: 4 },
    ultra: { resolutionScale: 1, msaaSamples: 4, viewsPerFrame: 4 },
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
  /**
   * 陰影相機的半邊長（正方形）。展示台用這個；一般遊戲的陰影範圍是蓋住整塊場地的固定範圍
   * （shadowArea.ts），車開出場地才跟著車移動。
   */
  shadowHalfExtentM: ftToM(45),
  shadowNearM: ftToM(20),
  shadowFarM: ftToM(320),
  shadowBias: -0.0004,
  shadowNormalBias: 0.03,
  /** 陰影貼圖一個像素比這個值乘出來的還大時，法線偏移跟著放大（範圍大、貼圖小的級別才不會有條紋）。 */
  shadowNormalBiasTexels: 1.2,
  /**
   * 陰影貼圖的法線偏移超過「東西的高度 × 這個比例」時，這麼矮的東西（假車位的車擋）在貼圖裡畫不出影子，
   * 改由地面的著色器直接算（scene.ts 的 lotGroundEdgeBoxes）。
   */
  shadowBiasPerCasterHeight: 0.4,
  /** 場地的固定陰影範圍：路緣內緣往外多留這麼寬（圍欄、路緣外的路燈與樹），以及會投影的東西最高多高。 */
  lotShadowMarginM: ftToM(18),
  lotShadowMaxHeightM: ftToM(27),
  /** 陰影相機的近、遠平面在算出來的範圍之外各多留這麼多。 */
  lotShadowDepthMarginM: ftToM(10),
  /**
   * 會投影的東西（建築、巷子的高牆）最高算多高：只用來把陰影相機的近平面往太陽那邊推，
   * 比 lotShadowMaxHeightM 高的樓頂才不會被近平面切掉。不影響陰影範圍的寬高（解析度不變）。
   */
  lotShadowCasterHeightM: ftToM(70),
  /**
   * 建築的影子最長多長（props/shadowReach.ts）。黃昏的太陽很低，照實投影整塊場地都在樓的影子裡；
   * 建築在陰影貼圖裡被壓矮到「這個長度 × tan(仰角)」，影子只蓋到樓前這一段。
   * 晴天、雨天、夜晚的太陽（月亮）夠高，算出來的上限比樓還高，影子是照實的。
   */
  buildingShadowReachM: ftToM(60),
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
    /** 油漬的拉絲（A）：周期是橫向的；著色器裡再沿車道方向（大致是 Z）拉長成細長條。 */
    stainStreaks: { periodM: ftToM(35.3), angleDeg: -8.3 },
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
  /**
   * 油漬：不是圓團，而是「斑塊 + 拉絲 − 缺口」再過門檻的不規則形狀（超過 start 才開始有、到 end 最深）；
   * 乘上的顏色；油漬處的粗糙度（比乾柏油亮）。
   */
  stainStart: 0.74,
  stainEnd: 0.9,
  stainTint: { r: 0.45, g: 0.43, b: 0.42 },
  stainRoughness: 0.7,
  /** 取樣位置的扭曲：扭曲噪聲的頻率（油漬層貼圖座標的倍數）與扭曲量（貼圖座標）；邊緣因此彎彎曲曲。 */
  stainWarpScale: 3.7,
  stainWarp: 0.05,
  /**
   * 拉絲：條紋噪聲沿拉絲方向拉長的倍數（越大條紋越細長）、它在油漬形狀裡的權重，
   * 以及斑塊被條紋沿拉絲方向拖動的距離（公尺，最大到最小）：斑塊的邊緣因此被拖出一條條長短不一的尾巴。
   */
  stainStreakStretch: 6,
  stainStreakWeight: 0.24,
  stainSmearM: ftToM(16),
  /** 濺灑的缺口與小點：高頻噪聲的頻率倍數與權重（把斑塊邊緣咬出缺口、在旁邊留下零星小點）。 */
  stainSplatterScale: 2.9,
  stainSplatterWeight: 0.16,
  /** 兩層大片深淺各自調整油漬濃淡的幅度：哪幾處有油漬因此不照著油漬層自己的周期重複。 */
  stainMacroAWeight: 0.25,
  stainMacroBWeight: 0.2,
  /**
   * 漂移（公尺，最大到最小）：油漬層的取樣位置被最大的那一層噪聲（macroA，347 ft）往兩個方向推開。
   * 油漬層的周期只有 61.3 ft，不漂移的話大俯視看得出油漬成排；漂移之後同一塊油漬每隔一個周期
   * 落在不同的地方（差十幾英尺，比油漬本身大），就對不回去了。
   */
  stainDriftM: ftToM(140),
  /** 潮濕：分布噪聲超過 start 開始濕、到 end 全濕；濕的地方顏色變深、粗糙度降低。 */
  wetStart: 0.64,
  wetEnd: 0.84,
  wetDarken: 0.28,
  wetRoughness: 0.62,
  /** 小片積水：分布噪聲超過這兩個值之間形成水面邊緣；水面的粗糙度（不是鏡子）。 */
  puddleStart: 0.87,
  puddleEnd: 0.91,
  puddleRoughness: 0.2,
  /** 潮濕分布的取樣位置也跟著油漬的扭曲噪聲推開這麼多（貼圖座標），濕斑的邊緣才不是圓弧。 */
  wetWarp: 0.016,
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
 * 目標車位的發光標記（props/spotGlow.ts）：沿車位輪廓從地面升起的一圈低矮半透明光牆＋輪廓內側貼地的光暈。
 * 駕駛座視角很平，看不清地上的標線；這圈光讓玩家遠遠就知道目標在哪。每一關都有（含原型關）。
 * 它是玩法標記，不是環境效果：`?fx=off` 也顯示（只是不脈動）、低畫質也有、不吃霧、不靠光暈。
 */
export const SPOT_GLOW_CONFIG = {
  /** 琥珀色：與地面的白漆標線、車燈的白光都分得開；亮度不超過 1，不靠 bloom 也不會洗成白塊。 */
  color: 0xffab1a,
  /** 停妥後的顏色（綠）。 */
  parkedColor: 0x35e07a,
  /**
   * 光牆頂端離地的高度。必須比每一個鏡頭模式的鏡頭都低（引擎蓋 3.55 ft、駕駛座 3.8 ft）：
   * 鏡頭永遠在牆頂之上，不可能被標記包住或貼著牆面看（以前吊在空中的箭頭就是把遠距跟車的鏡頭包在裡面）。
   */
  heightM: ftToM(3.2),
  /** 光牆與地面光暈的下緣離地多高：略高於車位標線，避免共面閃爍。 */
  liftM: ftToM(0.06),
  /** 光牆貼地處的不透明度；往上照 (1 − 高度比例)^wallFalloff 淡到 0。 */
  wallOpacity: 0.85,
  wallFalloff: 1.7,
  /** 光牆沿高度切成幾層（頂點之間是直線內插，層數越多漸層越接近上面的曲線）。 */
  wallLayers: 6,
  /** 貼地光暈：從輪廓往車位中心多寬、輪廓上的不透明度（往內淡到 0）。 */
  groundBandM: ftToM(2.2),
  groundOpacity: 0.6,
  /** 脈動：整體不透明度在 1 − pulseDepth 與 1 之間來回，一個來回 pulsePeriodS 秒。 */
  pulseDepth: 0.3,
  pulsePeriodS: 1.8,
  /** 停妥後：這麼久之內由琥珀變綠，綠色共維持 greenHoldSeconds（含變色的時間），再用 fadeSeconds 淡到 0。 */
  greenSeconds: 0.2,
  greenHoldSeconds: 0.7,
  fadeSeconds: 0.8,
  /**
   * 遠處用的光幕：光牆只到腰的高度，離遠了只剩一條細線，被鄰車擋住就看不到。光幕從牆頂再往上延伸一段很淡的漸層，
   * 遠遠地、隔著鄰車的車頂也看得出目標在哪。它不是實心的東西：
   * - 最濃的地方（牆頂）也只有 opacity 這麼淡，往上照 (1 − 高度比例)^falloff 淡到 0；
   * - 離鏡頭 fadeNearM 以內完全不畫、到 fadeFarM 才是全濃：車開近了它自己消失，剩下原本的光牆。
   * 所以鏡頭就算在光幕的範圍裡（遠距跟車的鏡頭會飛到車位上空），眼前也沒有東西。
   */
  veil: {
    heightM: ftToM(15),
    opacity: 0.2,
    falloff: 1.4,
    layers: 6,
    fadeNearM: ftToM(22),
    fadeFarM: ftToM(48),
  },
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

/**
 * 車輛外觀。整體長寬高與軸距來自 VehicleConfig（碰撞與停車判定用的矩形不變），這裡只放比例、細分與顏色。
 * 車殼是沿車長放樣的一張曲面（carBody.ts）；後視鏡最外緣剛好是車寬，所以鈑金每側比車寬內縮 mirrorOverhangM。
 */
export const CAR_VISUAL_CONFIG = {
  /** 車身底部離地高度。 */
  groundClearanceM: ftToM(0.65),
  /** 前擋下緣處的腰線（引擎蓋後緣）比車底高多少。 */
  lowerBodyHeightM: ftToM(2.0),
  /** 後視鏡凸出鈑金的量；鈑金半寬 = 車寬/2 − 這個值。 */
  mirrorOverhangM: ftToM(0.25),
  /** 車頭、車尾比車身中段收窄的比例（俯視的梭形）。 */
  planTaper: 0.07,
  /** 引擎蓋與後行李廂長度；兩者不等長，從上方看得出車頭車尾。 */
  hoodLengthM: ftToM(4.6),
  trunkLengthM: ftToM(2.3),
  /** 引擎蓋往車頭下降的量、行李廂比引擎蓋後緣高的量、行李廂往車尾下降的量。 */
  noseDropM: ftToM(0.34),
  deckRiseM: ftToM(0.2),
  tailDropM: ftToM(0.12),
  /** 前擋與後擋玻璃頂端往車艙中心收的距離（斜度）。 */
  windshieldRakeM: ftToM(2.45),
  rearWindowRakeM: ftToM(2.3),
  /** 車頂與引擎蓋中線比兩側高出的弧度。 */
  crownM: ftToM(0.09),
  /** 車艙底部比鈑金側面每側內縮（肩線）。 */
  shoulderInsetM: ftToM(0.25),
  /** 車艙頂部比底部每側再內縮（側窗內傾）。 */
  tumblehomeM: ftToM(0.38),
  /** 車頂邊梁的圓角半徑；A 柱、C 柱就是這一圈，寬度也由它決定。 */
  roofRailM: ftToM(0.15),
  /** B 柱前後寬度的一半，以及它在車頂前緣後方多遠。 */
  pillarHalfWidthM: ftToM(0.14),
  bPillarBehindHeaderM: ftToM(1.45),
  /** 車頭、車尾端面收邊的深度，以及超橢圓指數（越大越方：端面幾乎是平的，只有邊緣收圓角）。 */
  noseDepthM: ftToM(0.75),
  tailDepthM: ftToM(0.65),
  endExponent: 6.5,
  /** 車殼的端面比車長每端內縮這麼多；凸出來補滿車長的是保險桿（與前車牌）。 */
  bodyEndInsetM: ftToM(0.11),

  wheelRadiusM: ftToM(1.1),
  wheelWidthM: ftToM(0.75),
  rimRadiusM: ftToM(0.72),
  /** 輪拱比輪胎大多少，以及輪胎側面比鈑金內縮多少。 */
  archGapM: ftToM(0.2),
  wheelTuckM: ftToM(0.06),
  /** 胎紋：溝深與胎肩花塊的凹凸。 */
  treadDepthM: ftToM(0.035),
  rimSpokes: 5,

  /** 儀表板：頂面比腰線高多少、前後深度、離前擋下緣多遠。 */
  dashboardHeightM: ftToM(0.1),
  dashboardLengthM: ftToM(1.5),
  dashboardInsetM: ftToM(0.08),
  /** 方向盤：半徑、往前傾的角度、轉向角放大成方向盤轉角的倍率。 */
  steeringWheelRadiusM: ftToM(0.58),
  steeringWheelTiltRad: degToRad(24),
  steeringRatio: 8,
  /**
   * 車內後視鏡。鏡殼中心在前擋上緣前方 aheadOfHeaderM、比該處的玻璃低 belowGlassM（貼著玻璃內側掛著）；
   * 離駕駛的眼睛夠遠，整面鏡子才在駕駛座畫面的右上方、不被畫面邊緣切掉。
   * yawRad：鏡面轉向駕駛的角度；tiltRad：往下俯的角度；rimM、bezelM：鍍鉻邊與黑色鏡框的寬度。
   */
  rearViewMirror: {
    sizeM: { x: 0.22, y: 0.07, z: 0.03 },
    aheadOfHeaderM: 0.1,
    belowGlassM: 0.07,
    yawRad: 0.3,
    tiltRad: 0.1,
    rimM: 0.006,
    bezelM: 0.008,
    /** 支桿的粗細，以及頂端的底座在前擋上緣前方多遠（越靠前，從駕駛座看支桿越短）。 */
    stemM: 0.016,
    mountAheadOfHeaderM: 0.03,
  },

  bodyColor: 0x1f63b3,
  bodyRoughness: 0.32,
  bodyMetalness: 0.4,
  clearcoat: 1,
  /**
   * 車上最光滑的表面（清漆、玻璃、鏡面）的粗糙度。不能再低：太陽在太光滑的表面上的高光會超過
   * 後製鏈半浮點緩衝區的上限，變成無限大，經過泛光後整個畫面變黑（引擎蓋視角最容易遇到）。
   */
  minGlossRoughness: 0.12,
  /**
   * 引擎蓋鏡頭專用的烤漆（等於鏡頭前加一片偏光鏡）：視線貼著引擎蓋、正對低角度的夕陽，
   * 平常的烤漆在這個角度幾乎整片是太陽與天空的掠射反光，看不出車色與摺線。
   * 只在 `view=hood` 套用：金屬感與底漆反光降低（漫射的車色變多）、清漆變淡變霧、環境反射收斂；其他鏡頭與展示台不受影響。
   */
  hoodViewPaint: {
    metalness: 0.1,
    specularIntensity: 0.25,
    clearcoat: 0.15,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.7,
  },
  glassColor: 0x0d1820,
  glassOpacity: 0.48,
  /** 黑色飾條、底盤、輪拱內襯。 */
  trimColor: 0x15171a,
  trimRoughness: 0.7,
  /** 頂篷與柱內飾：淺色，再加一點自發光，背光時也不會一團黑。 */
  headlinerColor: 0x9a9388,
  headlinerEmissiveIntensity: 0.16,
  /** 門板與地板。 */
  cabinTrimColor: 0x3a3d42,
  cabinTrimEmissiveIntensity: 0.08,
  dashboardColor: 0x30353c,
  dashboardRoughness: 0.85,
  dashAccentColor: 0x8d949c,
  seatColor: 0x4a4038,
  /** 錶框與中控螢幕的光：螢幕比錶框暗。 */
  gaugeColor: 0x9fd4f2,
  gaugeEmissiveIntensity: 0.55,
  screenColor: 0x2b4d68,
  screenEmissiveIntensity: 0.5,
  tireColor: 0x17181a,
  tireRoughness: 0.92,
  rimColor: 0xc4c9cf,
  rimRoughness: 0.28,
  rimMetalness: 0.9,
  mirrorGlassColor: 0xdfe6ee,
  /** 鍍鉻飾件（水箱罩橫條、燈框、門把）。 */
  chromeColor: 0xc9ced4,
  chromeRoughness: 0.22,
  /** 車牌底色與字的顏色（字用黑飾條的材質）。 */
  plateColor: 0xeeece4,
  plateRoughness: 0.6,
  headlightColor: 0xfff3d0,
  headlightEmissiveIntensity: 2.3,
  taillightColor: 0xe01218,
  /** 尾燈平常的亮度，以及踩煞車時的亮度。 */
  taillightEmissiveIntensity: 0.9,
  brakeLightEmissiveIntensity: 4,
  /** 倒車燈：沒亮時的燈殼顏色、亮起來的顏色與亮度。 */
  reverseLightOffColor: 0x8d939c,
  reverseLightColor: 0xf4f6ff,
  reverseLightEmissiveIntensity: 3,
} as const;

/**
 * 車模的細分（QUALITY_PRESETS 的 vehicleDetail）。
 * stationStepM：車殼沿車長的取樣間距；archSegments：每個輪拱的段數；
 * endScales：車頭、車尾收圓時各圈的縮放比例（由外到內，最後一定是 0）；wheelSegments：輪胎一圈的段數（偶數）。
 */
export const CAR_DETAIL_CONFIG = {
  low: {
    stationStepM: 0.34,
    archSegments: 6,
    endScales: [0.975, 0.92, 0.8, 0.45, 0],
    wheelSegments: 20,
  },
  high: {
    stationStepM: 0.16,
    archSegments: 12,
    endScales: [0.992, 0.97, 0.94, 0.9, 0.84, 0.72, 0.4, 0],
    wheelSegments: 40,
  },
} as const;

/**
 * 場景擺設：路緣圍成的場地裡與場地外的純視覺物件（沒有碰撞、不進停車判定）。
 * 位置都以車位自己的方向為準（車位本地座標：+X 右、−Z 車位前方）；數量跟著畫質級別走（QUALITY_PRESETS 的 props）。
 * 假車位與目標車位同寬同長，沿前方路緣一列（A 列，目標車位在其中）、場地中段背靠背兩列（B 列）、後方路緣一列（C 列）；
 * 車位中線兩側留一條直通的通道，起點就在通道上。
 */
export const LOT_PROPS_CONFIG = {
  /** 禁區：起點到車位的通路，中線左右各這麼寬以內不放任何擺設（車寬 6 ft 的一半 + 6 ft）。 */
  corridorHalfWidthM: ftToM(9),
  /** 通路禁區往起點後方、車位前緣之外各延伸多遠。 */
  corridorBehindStartM: ftToM(14),
  corridorPastSpotM: ftToM(2),
  /** 目標車位矩形四周再留這麼寬。 */
  spotMarginM: ftToM(1.5),
  /** `?cam=spot_low` 的鏡頭前方（視線左右各 cameraClearHalfAngleRad 以內）這個半徑內不放擺設，免得擋住鏡頭。 */
  cameraClearRadiusM: ftToM(12),
  cameraClearHalfAngleRad: degToRad(50),

  /** 中央通道的半寬，以車位寬為單位：最靠近通道的假車位從這裡開始。 */
  aisleHalfWidthStalls: 1.5,
  /** B 列（背靠背兩列）的中線在車位中心後方多遠。 */
  islandBehindSpotM: ftToM(73),

  /** 背景車：左右、前後的隨機偏移，與停歪的角度上限。 */
  carJitterLateralM: ftToM(0.45),
  carJitterLengthwiseM: ftToM(0.7),
  carJitterHeadingRad: degToRad(2.5),
  /** 車頭朝外（倒車入庫）的比例。 */
  carReversedChance: 0.22,
  /** 背景車的車色（不含玩家車的藍）。 */
  carColors: [0xd9dadc, 0xa9adb3, 0x1c1d20, 0x4a4d52, 0x8e1a1c, 0x2f4a3a, 0xb9a98a, 0x6a2a22, 0xe8e4da],
  carRoughness: 0.36,
  carMetalness: 0.45,

  /** 路燈：桿高、桿半徑、燈臂長、燈殼大小（寬、厚、長）。 */
  lampHeightM: ftToM(22),
  lampPoleRadiusM: ftToM(0.3),
  lampArmLengthM: ftToM(6),
  lampHeadSizeM: { x: ftToM(1.5), y: ftToM(0.45), z: ftToM(3) },
  lampColor: 0x2c2f33,
  /** 路緣外的路燈離路緣內側多遠。 */
  lampOutsideCurbM: ftToM(2.5),
  /** 燈殼底下的發光面：暖黃，亮度高過泛光門檻。 */
  lampGlowColor: 0xffd49a,
  lampGlowIntensity: 3.2,
  /** 光錐（render/lightShaft.ts 的光柱）：頂端與地面的半徑；亮度沿光軸的分布見 lampCone。 */
  lampConeTopRadiusM: ftToM(0.8),
  lampConeBottomRadiusM: ftToM(13),
  lampConeColor: 0xffc98a,
  /** 光錐沿光軸的亮度：燈頭下方很快亮起來，往地面淡到 0；越張越稀（半徑的這個冪次）。 */
  lampCone: { riseFraction: 0.03, falloffExponent: 1, spreadExponent: 0.25 },
  /**
   * 光錐與光暈是加色混合。走後製鏈的級別加在色調映射之前（場景亮度），直接畫到畫面上的級別加在色調映射之後
   * （顯示亮度，同樣的數值看起來亮得多），所以兩邊各有自己的亮度。
   * 光錐的數值是黃昏（乾淨的空氣）的亮度；雨、雷雨、夜晚再乘上天氣的倍率（WeatherPreset.air.lampShaft）。
   */
  lampConeBrightness: { hdr: 0.12, direct: 0.1 },
  /** 地上的光暈（沒有真光源的燈才畫）：半徑與中心的亮度。 */
  lampPoolRadiusM: ftToM(14),
  lampPoolBrightness: { hdr: 0.32, direct: 0.085 },
  /** 真光源（SpotLight）：強度（燭光）、照射距離、半角、邊緣柔化。 */
  lampLightIntensity: 150,
  lampLightDistanceM: ftToM(75),
  lampLightAngleRad: degToRad(58),
  lampLightPenumbra: 0.85,

  /** 混凝土柱與柱頂的橫梁。 */
  pillarSizeM: { x: ftToM(1.6), y: ftToM(11), z: ftToM(1.6) },
  beamThicknessM: ftToM(1.1),
  concreteColor: 0x8f8b84,
  concreteRoughness: 0.92,

  /** 圍欄：離路緣內側的距離、立柱與橫桿的尺寸、橫桿的高度。 */
  fenceOutsideCurbM: ftToM(4),
  fencePostSizeM: { x: ftToM(0.3), y: ftToM(3.9), z: ftToM(0.3) },
  fenceRailThicknessM: ftToM(0.16),
  fenceRailHeightsM: [ftToM(1.7), ftToM(3.4)],
  fenceColor: 0x4b4f55,

  /** 背景建築：樓層高、窗的寬高與間距、亮著的窗的比例與顏色。 */
  buildingFloorHeightM: ftToM(11),
  buildingWindowSizeM: { x: ftToM(6.5), y: ftToM(4.6) },
  buildingWindowSpacingM: ftToM(11),
  buildingWindowLitChance: 0.36,
  buildingWindowLitColor: { r: 1.25, g: 0.9, b: 0.5 },
  buildingWindowDarkColor: { r: 0.045, g: 0.055, b: 0.075 },
  buildingColors: [0x6f6a66, 0x7d766c, 0x5b6068, 0x8a8178, 0x676e74, 0x756a62],
  buildingRoughness: 0.95,
  /** 太陽方位左右這個角度內不放會擋住太陽的建築（建築不投影，擋住太陽場地卻還亮著會穿幫）。 */
  buildingSunGapDeg: 15,

  /** 樹與灌木。 */
  trunkColor: 0x4a3a2c,
  foliageColors: [0x3d5a2e, 0x4a6a33, 0x34502c, 0x566f38],
  foliageRoughness: 0.95,

  /** 假車位的標線（沒有磨損著色器，顏色比目標車位的漆暗一點）。 */
  stallLineColor: 0xbdbbb0,
  stallLineHeightM: ftToM(0.02),

  /** 垃圾桶、交通錐、標誌、排水孔蓋的顏色。 */
  binColor: 0x2f4f3f,
  binLidColor: 0x25282c,
  trafficConeColor: 0xe2571c,
  trafficConeStripeColor: 0xe9e6dc,
  trafficConeBaseColor: 0x1b1c1e,
  signPoleColor: 0x8b9096,
  signPlateColor: 0x1d4fa8,
  signMarkColor: 0xe9e9e4,
  drainColor: 0x26282b,

  /** 監視器（掛在路燈桿上）：離地高度與各部分的顏色。 */
  cameraMountHeightM: ftToM(13.5),
  cameraBracketColor: 0x3a3d42,
  cameraBodyColor: 0xd9dbd6,
  cameraLensColor: 0x101216,
  /** 繳費機：佔地與高度、各部分的顏色。 */
  payStationSizeM: { x: ftToM(2.2), y: ftToM(5.2), z: ftToM(1.5) },
  payStationBaseColor: 0x8f8b84,
  payStationBodyColor: 0x27405e,
  payStationCapColor: 0xe0b23a,
  payStationScreenColor: 0x9fc4d8,
  payStationKeypadColor: 0xb9bcc0,
  payStationSlotColor: 0x15171a,
} as const;

/**
 * 玩家車頭燈照地（carHeadlights.ts）：地上的光斑（加色混合的貼地面片）與不投影的真光源。
 * 用哪幾樣跟著畫質級別走（QUALITY_PRESETS 的 headlights）。位置都是車的本地座標：車頭朝 −Z、右側 +X。
 */
export const HEADLIGHT_CONFIG = {
  /** 兩盞頭燈離車身中線多遠（左右各一盞真光源時用；光斑的兩瓣見 frontPool）。 */
  lampOffsetM: ftToM(2.0),
  /** 暖白。 */
  color: 0xffe2b0,

  /** 光斑離地高度：比車位標線與輪胎痕高一點，不會共面閃爍。 */
  poolLiftM: ftToM(0.07),
  /** 車頭前方的光斑：兩盞燈各一瓣，離車越遠越寬、越淡。 */
  frontPool: {
    lengthM: ftToM(40),
    halfWidthM: ftToM(11),
    /** 兩瓣的中線離車身中線多遠。 */
    lobeOffsetM: ftToM(2.0),
    /** 每一瓣的寬度（高斯的 σ）：車頭處與最遠處。 */
    nearSpreadM: ftToM(1.1),
    farSpreadM: ftToM(6),
    /** 從車頭往前這麼遠才亮到最亮（燈在保險桿上，正下方照不到）。 */
    riseM: ftToM(3.5),
    /** 往遠處變淡的冪次；越大遠處越快變暗。 */
    falloffExponent: 1.4,
  },
  /**
   * 光斑最亮處的亮度（加色混合）。走後製鏈的級別加在色調映射之前（場景亮度），直接畫到畫面上的級別加在
   * 色調映射之後（顯示亮度，同樣的數值看起來亮得多），所以兩邊各有自己的亮度。
   */
  poolBrightness: { hdr: 0.55, direct: 0.17 },
  /** 有真光源時光斑只是補一點形狀，亮度乘上這個比例。 */
  poolWithLightScale: 0.5,

  /** 倒車燈在車尾後方地上的一小片冷白光：只有一瓣，比頭燈淡很多。 */
  reversePool: {
    lengthM: ftToM(11),
    halfWidthM: ftToM(5.5),
    lobeOffsetM: 0,
    nearSpreadM: ftToM(1.8),
    farSpreadM: ftToM(3.2),
    riseM: ftToM(2),
    falloffExponent: 1.5,
  },
  reverseColor: 0xe9efff,
  reverseBrightness: { hdr: 0.16, direct: 0.05 },

  /**
   * 真光源（SpotLight，不投影）：全部加起來的強度（燭光；兩盞時各一半）、照射距離、半角、邊緣柔化、
   * 隨距離衰減的冪次（低於物理的 2：車燈的配光本來就把光往遠處送，近處才不會有一團過亮的熱點）。
   */
  lightIntensity: 70,
  lightDistanceM: ftToM(80),
  lightAngleRad: degToRad(20),
  lightPenumbra: 0.9,
  lightDecay: 1,
  /** 光源比燈殼高（低角度掠射只照得亮車頭前面一小塊），並在車頭前緣之前這麼遠，光錐裡沒有自己的車身。 */
  lightHeightM: ftToM(3.4),
  lightAheadOfNoseM: ftToM(0.3),
  /** 光軸瞄準車頭前方這麼遠的地面。 */
  lightAimAheadM: ftToM(40),

  /**
   * 光斑打在路緣上（vehicle/headlightCurbs.ts）：路緣石、車擋、人行道比貼地的光斑高，會把光斑切掉；
   * 在它們的頂面與朝著車的立面補上同樣亮度的貼片。
   */
  raisedSurfaces: {
    /** 比這個高度矮的東西才補（再高的是牆，車燈照牆是另一回事；有真光源的級別由 SpotLight 照）。 */
    maxHeightM: ftToM(1.5),
    /** 貼片的格子大小：亮度存在頂點上，格子要與貼地光斑的格子（約 0.8 ft）差不多細，才跟得上兩瓣光的形狀。 */
    cellM: ftToM(0.8),
    /** 貼片比路緣的面高出（立面是往外）多少，不共面。 */
    liftM: ftToM(0.02),
    /** 貼片數的上限（緩衝區的大小）；整片光斑都落在人行道上也夠用。 */
    maxPatches: 3600,
  },

  /**
   * 光柱（render/lightShaft.ts）：有水氣的天氣（雨、雷雨、夜晚）裡，頭燈在空氣中打出來的那道光。
   * 從燈殼的高度往前、略往下；兩道（low 是車頭中央一道寬的）。亮度再乘上天氣的倍率
   * （WeatherPreset.air.headlightShaft；0 = 乾淨的空氣，不建立）。
   */
  shaft: {
    /** 光源端在車頭前緣之前多遠、離地多高（燈殼的高度）。 */
    aheadOfNoseM: ftToM(0.1),
    heightM: ftToM(2.15),
    /** 光軸往下俯的角度：光柱的下緣在車頭前方十幾英尺碰到地面，接上地上的光斑。 */
    pitchDownRad: degToRad(2.5),
    /** 一道光柱的形狀：燈殼處與最遠處的半徑、長度、沿光軸的亮度。 */
    beam: {
      nearRadiusM: ftToM(0.45),
      farRadiusM: ftToM(4.6),
      lengthM: ftToM(36),
      riseFraction: 0.03,
      falloffExponent: 1.6,
      spreadExponent: 0.5,
    },
    /** 只有一道時（low）：光源端與遠端都放寬成這個倍數，蓋住兩盞燈。 */
    singleBeamWidthScale: 1.7,
    /** 最亮處加到畫面上的量（走後製鏈／直接畫到畫面上），還要乘上天氣的倍率。 */
    brightness: { hdr: 0.3, direct: 0.24 },
  },
} as const;

/**
 * 光柱（render/lightShaft.ts）共用的數值：路燈的光錐與車頭燈的光柱都用同一個著色器。
 */
export const LIGHT_SHAFT_CONFIG = {
  /** 圓錐沿光軸切成幾段（頂點只用來定形狀，亮度是每個像素算的，不必多）。 */
  heightSegments: 2,
  /** 邊緣的柔和度：亮度 ∝（弦長 ÷ 這一處的直徑）的這個冪次。1 = 照實（邊緣收得很急）；越大邊緣越柔。 */
  edgeExponent: 2.2,
  /** 順著光軸看（俯視路燈、從車後看頭燈）弦長比直徑長得多；亮度最多算到「橫著看正中間」的這個倍數，不洗白。 */
  maxThickness: 1.25,
  /**
   * 光柱的表面離鏡頭這麼近以內完全不畫、到這麼遠才是全亮：鏡頭穿進光柱的瞬間不會整片跳掉，
   * 貼在鏡頭旁邊的那一盞（近看只是一大片沒有形狀的亮面）也跟著淡。
   */
  cameraFadeNearM: ftToM(1.5),
  cameraFadeFarM: ftToM(34),
  /** 遠處的光柱被線性遠霧吃掉的比例（1 = 到霧的遠端完全看不見）。 */
  fogFade: 0.85,
  /** 霧氣流動的噪聲：亮度上下的幅度（0–1）、一格的大小、流動的速度（世界座標，公尺／秒）。 */
  noiseAmount: 0.3,
  noiseCellM: ftToM(4.5),
  noiseDriftMps: { x: 0.35, y: -0.5, z: 0.15 },
  /** 視線與圓錐斜面幾乎平行時，二次式退化；係數的絕對值小於這個值就當成平行。 */
  parallelEpsilon: 1e-5,
} as const;

/**
 * 倒車輪胎痕（effects/tireMarks.ts）：只在倒車時，沿左右後輪的軌跡留下一段一段貼地的深色痕。
 * 純視覺，沒有碰撞；段數上限與壽命跟著畫質級別走（QUALITY_PRESETS 的 tireMarks）。
 */
export const TIRE_MARK_CONFIG = {
  /** 痕寬：略小於胎寬（0.75 ft）。 */
  widthM: ftToM(0.55),
  /** 後輪每走這麼遠留下一段。 */
  segmentLengthM: ftToM(0.9),
  /** 離地高度：比地面高一點、比假車位與目標車位的標線（0.02、0.03 ft）低，痕穿過標線時被標線蓋住。 */
  liftM: ftToM(0.012),
  /** 橡膠的深灰，以及剛留下時的不透明度（克制：比標線的對比低得多）。 */
  color: 0x0c0c0d,
  opacity: 0.4,
  /** 壽命過了這個比例之後開始淡出，到壽命結束完全消失。 */
  fadeStartFraction: 0.5,
  /** 一次更新裡沿車頭方向倒退超過這麼遠才算在倒車（濾掉浮點誤差）。 */
  minReverseStepM: 1e-5,
  /** 一次更新的位移超過這麼遠當作瞬移（重來），不留痕。 */
  teleportStepM: ftToM(6.5),
} as const;

/**
 * 灰塵與落葉（effects/dust.ts、effects/leaves.ts）。純視覺，數量跟著畫質級別走（QUALITY_PRESETS 的 particles）。
 * 落葉避開起點到車位的通路、目標車位與 `?cam=spot_low` 的鏡頭前方（與場地擺設同一份禁區）。
 */
export const PARTICLE_CONFIG = {
  /** 弱風吹去的方向（heading 約定：0 = 北，順時針為正）。 */
  windHeadingDeg: 118,

  leaf: {
    /** 葉片長度的範圍。 */
    minSizeM: ftToM(0.6),
    maxSizeM: ftToM(0.95),
    /** 黃昏下的枯葉色。 */
    colors: [0xb5651d, 0xc9922e, 0x8a4b23, 0x9c8a3a, 0xa3441e],
    roughness: 0.85,
    /** 一片葉子從落下到被吹走的一輪有多久（秒）。 */
    minCycleS: 32,
    maxCycleS: 58,
    /** 一輪裡：開頭這個比例在落下，結尾這個比例被風捲走；中間分成幾次「停著 → 被吹一小段」。 */
    fallFraction: 0.1,
    blowFraction: 0.08,
    minHops: 2,
    maxHops: 4,
    /** 每一小段裡停在地上的比例。 */
    restFraction: 0.72,
    /** 從多高落下、飄落時左右擺動的幅度。 */
    fallHeightM: ftToM(7),
    swayM: ftToM(0.6),
    /** 被吹一小段：順風走多遠、離地多高。 */
    minHopLengthM: ftToM(3),
    maxHopLengthM: ftToM(7),
    hopHeightM: ftToM(0.7),
    /** 最後被風捲走：順風走多遠、升到多高（同時縮小到消失）。 */
    blowLengthM: ftToM(9),
    blowHeightM: ftToM(4),
    /** 停在地上時離地多高（不與地面共面）、葉面傾斜多少。 */
    restLiftM: ftToM(0.05),
    restTiltRad: degToRad(7),
    /** 離路緣內側至少這麼遠。 */
    curbMarginM: ftToM(2),
  },

  dust: {
    /**
     * 受黃昏光的塵土色（比柏油亮、偏暖，在陰影裡的地面上也分得出來），以及一顆粒子最濃時的不透明度：
     * 單顆仍是半透明的薄霧，幾顆疊在後輪旁才是一團看得出來的揚塵，蓋不住標線。
     */
    color: 0xcfbfa3,
    opacity: 0.34,
    /** 粒子的直徑：剛揚起與消失前。 */
    startSizeM: ftToM(1.3),
    endSizeM: ftToM(3.8),
    /** 壽命（秒）的範圍。 */
    minLifetimeS: 1.1,
    maxLifetimeS: 2.0,
    /** 車速低於這個值不揚塵。 */
    minSpeedMps: mphToMps(0.6),
    /** 每走 1 公尺揚起的粒子數 = 粒子上限 × 這個比例（上限小的級別揚得少，粒子不會還沒淡掉就被蓋掉）。 */
    emitPerMeterPerCapacity: 0.07,
    /** 起步（車速低於 launchSpeedMps）時多揚幾倍；方向盤打到底時再多幾倍。 */
    launchBoost: 2.2,
    launchSpeedMps: mphToMps(5),
    steerBoost: 1.2,
    /** 揚起的位置：後輪著地點附近，離地這麼高以內、前後左右這麼遠以內。 */
    spawnHeightM: ftToM(0.5),
    spawnSpreadM: ftToM(0.7),
    /** 初速：往上、往外側、往車行進的反方向（最後一項是車速的比例，有上限）。 */
    riseSpeedMps: 0.45,
    outwardSpeedMps: 0.6,
    trailSpeedFraction: 0.18,
    maxTrailSpeedMps: 0.9,
    /** 速度每秒剩下的比例（空氣阻力）。 */
    dragPerSecond: 0.25,
    /** 貼圖（程式裡畫的柔邊圓點）的邊長。 */
    spriteSizePx: 32,
    /** 一次更新的位移超過這麼遠當作瞬移，不揚塵。 */
    teleportStepM: ftToM(6.5),
  },
} as const;
