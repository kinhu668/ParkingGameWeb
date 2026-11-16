// 畫質級別：級別 id、`?quality=` 解析、自動選擇、各級別的開關與數值。
// 不碰 DOM、不 import three：查詢字串與裝置線索（hints）由呼叫端傳入，全部可以純函式測試。
// `?quality=` 不是啟動模式，所以不在 urlParams.parseUrlMode 裡處理，可與任何模式並用。
import { parseLensFxParam } from '../core/urlParams';
import type { MaterialQualitySettings } from '../materials/surfaces';
import { QUALITY_PRESETS } from './renderConfig';

/** 畫質級別 id，由低到高。 */
export const QUALITY_LEVELS = ['low', 'medium', 'high', 'ultra'] as const;

export type QualityLevel = (typeof QUALITY_LEVELS)[number];

/**
 * 色調映射曲線（renderer.ts 對應到 three 的常數）。
 * `agx` 是 AgX 再加上黃昏的色調分級；`aces` 是 three 內建的 ACES Filmic，沒有色調分級。
 */
export type ToneMappingId = 'aces' | 'agx';

/** 環境光遮蔽（GTAO）的參數。 */
export interface AmbientOcclusionSettings {
  /** 取樣半徑（公尺）。 */
  readonly radiusM: number;
  /** 每個像素的取樣數；越多越乾淨也越貴。 */
  readonly samples: number;
  /** 降噪的取樣數。 */
  readonly denoiseSamples: number;
  /** 疊到畫面上的強度（0–1）。 */
  readonly intensity: number;
}

/** 泛光（UnrealBloomPass）的參數。 */
export interface BloomSettings {
  readonly strength: number;
  readonly radius: number;
  /** 亮度門檻（場景線性亮度）；高於這個值才會發光。 */
  readonly threshold: number;
}

/**
 * 鏡頭效果：暈影與色差。
 * 黃昏的色調分級（暗部偏冷、亮部偏暖、飽和度、對比）不在這裡：它併在色調映射的函式裡，
 * 每個級別都有、不花額外的全螢幕濾鏡（見 renderer.ts 與 TONE_LOOK_CONFIG）。
 */
export interface LensSettings {
  /**
   * 暈影強度：畫面角落壓暗的比例（0 = 沒有）。
   * 直接畫到畫面上的級別是在顯示空間壓暗（連最亮的太陽也會變灰，所以要輕）；
   * 走後製鏈的級別是在色調映射之前壓暗（等於角落少一點曝光，亮部仍然是亮的），可以重一點。
   */
  readonly vignette: number;
  /** 色差：畫面角落紅藍兩個色版錯開的量（0 = 沒有）。只有走後製鏈的級別才做得到。 */
  readonly chromaticAberration: number;
}

/**
 * 景深（render/depthOfField.ts）：對焦在玩家車，比對焦距離遠很多的背景與貼近鏡頭的前景略為模糊。
 * 模糊那一張是縮小的、取樣數少；深度沿用環境光遮蔽那一遍的，不多畫一遍場景。
 */
export interface DepthOfFieldSettings {
  /** 最模糊時的模糊半徑，以畫面高度為 1。 */
  readonly maxBlur: number;
  /** 模糊那一張的大小 = 繪圖緩衝區 × 這個比例（每一邊）。 */
  readonly resolutionScale: number;
  /** 模糊的取樣數（一圈一圈往外的圓盤）。 */
  readonly taps: number;
}

/**
 * 動態模糊（render/motionBlur.ts）：只算鏡頭自己的移動（由深度與前一幀的鏡頭矩陣重建每個像素的位移）。
 * 停車遊戲以看得清楚為主：很輕，位移小於門檻時完全沒有。
 */
export interface MotionBlurSettings {
  /** 快門：這一幀的位移有多少比例變成拖影（0–1）。 */
  readonly shutter: number;
  /** 拖影長度的上限，以畫面高度為 1。 */
  readonly maxBlur: number;
  /** 沿位移方向的取樣數。 */
  readonly taps: number;
}

/**
 * 鏡頭光暈（render/lensFlare.ts）：從泛光的緩衝區取太陽與燈這些最亮的光源，加上橫向的條紋與對稱的鬼影。
 * 數值是加到畫面上的比例（場景線性亮度），要很輕。
 */
export interface LensFlareSettings {
  /** 橫向條紋的強度。 */
  readonly streak: number;
  /** 鬼影（光源對畫面中心鏡射出去的幾個淡圓）的強度。 */
  readonly ghosts: number;
}

/**
 * 濕地／積水的倒影：把場景對地面鏡像後畫進一張縮小的貼圖（平面反射，render/groundReflection.ts），
 * 地面著色器在濕與積水的地方取樣。只有有積水的天氣（雨、雷雨、雨後）才會多畫這一遍。
 */
export interface GroundReflectionSettings {
  /** 倒影貼圖的大小 = 繪圖緩衝區 × 這個比例（每一邊）。 */
  readonly resolutionScale: number;
  /** 每幾幀重畫一次（1 = 每幀）。隔幀重畫時，貼圖與它的投影矩陣一起留著，靜止的東西不會錯位。 */
  readonly updateEveryFrames: number;
  /** 濕柏油上把倒影沿畫面的上下方向拉長（路燈在濕地上的長條反光）的取樣數；1 = 不拉長，只取一次。 */
  readonly streakTaps: number;
}

/** 地面（柏油）的畫質開關。 */
export interface GroundQualitySettings {
  /** 噪聲貼圖的邊長（像素）。 */
  readonly textureSizePx: number;
  /** 各向異性過濾的上限（實際值 = min(顯示卡支援的上限, 這個值)）；軟體算圖時越高越慢。 */
  readonly maxAnisotropy: number;
  /** 法線：裂縫與顆粒在斜光下的立體感。每個像素要多取樣幾次噪聲。 */
  readonly normals: boolean;
  /** 潮濕反光與小片積水。 */
  readonly wetness: boolean;
  /**
   * 濕地／積水裡看得到車、燈與建築的倒影（多畫一遍縮小的場景）；null = 不多畫，積水只映出天空（環境貼圖）。
   * 要有潮濕著色器（wetness）才有意義。
   */
  readonly reflection: GroundReflectionSettings | null;
}

/**
 * 場景擺設（路燈、柱子、背景建築、圍欄、樹、背景車、小細節）的密度。全部是純視覺、用 InstancedMesh 畫；
 * 數量都是「最多幾個」：候選位置依重要性排好，級別越高取得越多，所以低級別的擺設是高級別的子集。
 */
export interface PropsQualitySettings {
  /** 停在假車位裡的背景車。 */
  readonly parkedCars: number;
  /** 路燈的燈頭數（島上的雙臂路燈算兩個）。 */
  readonly lampHeads: number;
  /** 其中真的會照亮場景的燈（SpotLight，不投影）；其餘只有自發光燈殼、光錐與地上的光暈。 */
  readonly realLights: number;
  /**
   * 乾淨的空氣裡（黃昏）也畫路燈的光錐。false 的級別（low）只在有水氣的天氣（雨、雷雨、夜晚）才畫：
   * 那些天氣少了光錐就看不出空氣的厚度。
   */
  readonly lightCones: boolean;
  /** 混凝土柱。 */
  readonly pillars: number;
  /** 場地外的背景建築。 */
  readonly buildings: number;
  readonly trees: number;
  readonly bushes: number;
  /** 圍欄立柱的間距（公尺）；越小立柱與橫桿越多。 */
  readonly fencePostSpacingM: number;
  /** 小細節（假車位的車擋、垃圾桶、交通錐、標誌、排水孔蓋）各取候選的這個比例（0–1）。 */
  readonly detailFraction: number;
  /** 小細節與圍欄要不要投影。 */
  readonly detailShadows: boolean;
  /** 擺設的細分：low 的背景車輪圈只是一片圓盤、樹冠面數少（軟體算圖跑得動），high 的背景車有輪輻、樹冠較圓。 */
  readonly meshDetail: VehicleDetail;
}

/** 玩家車頭燈照地的做法。頭燈一律不投影（每多一張陰影貼圖，場景就多畫一遍）。 */
export interface HeadlightQualitySettings {
  /** 地上的光斑：車頭前方一片加色混合的貼地面片（倒車時車尾另有一小片）。不花光源的計算。 */
  readonly groundPool: boolean;
  /** 真的會照亮場景的頭燈（SpotLight）盞數：0 = 沒有、1 = 車頭中央一盞、2 = 左右各一盞。 */
  readonly spotLights: number;
}

/**
 * 光柱（render/lightShaft.ts）：路燈的光錐與車頭燈的光柱。有水氣的天氣（雨、雷雨、夜晚）每個級別都有，
 * 低畫質用便宜的版本（段數少、車頭只有一道、沒有霧氣流動的噪聲）。
 */
export interface LightShaftQualitySettings {
  /** 圓錐一圈的段數。 */
  readonly radialSegments: number;
  /** 車頭燈的光柱：1 = 車頭中央一道寬的、2 = 左右各一道。 */
  readonly headlightBeams: number;
  /** 霧氣流動的噪聲層數（0 = 沒有，亮度是平滑的）。 */
  readonly noiseOctaves: number;
}

/** 倒車輪胎痕（純視覺）：留在地上的段數上限與壽命。 */
export interface TireMarkQualitySettings {
  /** 最多同時留著幾段（左右後輪合計）；滿了就蓋掉最舊的。0 = 不畫。 */
  readonly maxSegments: number;
  /** 一段痕從留下到完全淡掉的時間（秒）。 */
  readonly lifetimeS: number;
}

/** 空氣感的粒子（純視覺）：車輪揚起的灰塵與場地上的落葉。數量都是上限，0 = 不畫。 */
export interface ParticleQualitySettings {
  /** 同時存在的灰塵粒子上限。 */
  readonly dust: number;
  /** 場地上的落葉片數。 */
  readonly leaves: number;
}

/** 車模的細分程度：low 面數少，high 輪拱與輪胎較圓。 */
export type VehicleDetail = 'low' | 'high';

/** 一個畫質級別的全部設定。算圖器、場景燈光、天空、後製鏈都只讀這個物件，不各自讀網址。 */
export interface QualitySettings {
  readonly level: QualityLevel;
  /** 像素比上限（實際值 = min(裝置像素比, 這個值)）。 */
  readonly maxPixelRatio: number;
  readonly toneMapping: ToneMappingId;
  /** 太陽陰影貼圖的邊長（像素）。 */
  readonly shadowMapSize: number;
  /** 抗鋸齒的多重取樣數（0 = 不開）。 */
  readonly msaaSamples: number;
  /** 天空烘成立方體貼圖的每面邊長（像素）；越小越省記憶體，天空也越糊。 */
  readonly skyCubeSizePx: number;
  /** 環境光遮蔽；null = 不開。 */
  readonly ambientOcclusion: AmbientOcclusionSettings | null;
  /** 泛光；null = 不開。 */
  readonly bloom: BloomSettings | null;
  /** 鏡頭效果（暈影、色差）；null = 不開。 */
  readonly lens: LensSettings | null;
  /** SMAA 抗鋸齒（疊在多重取樣之上）。 */
  readonly smaa: boolean;
  /** 景深；null = 不開。只有走後製鏈、而且開了環境光遮蔽（深度從那裡來）的級別才做得到。 */
  readonly depthOfField: DepthOfFieldSettings | null;
  /** 動態模糊；null = 不開。條件同景深。 */
  readonly motionBlur: MotionBlurSettings | null;
  /** 鏡頭光暈；null = 不開。要有泛光（光源從泛光的緩衝區取）。 */
  readonly lensFlare: LensFlareSettings | null;
  /** 地面（柏油）的細節。 */
  readonly ground: GroundQualitySettings;
  /** 材質庫（建築、擺設、車身的程序化 PBR 貼圖）的細節。 */
  readonly materials: MaterialQualitySettings;
  /** 車模的細分程度（CAR_DETAIL_CONFIG）。 */
  readonly vehicleDetail: VehicleDetail;
  /** 場景擺設的密度。 */
  readonly props: PropsQualitySettings;
  /** 倒車輪胎痕的段數與壽命。 */
  readonly tireMarks: TireMarkQualitySettings;
  /** 灰塵與落葉的數量。 */
  readonly particles: ParticleQualitySettings;
  /** 玩家車頭燈照地的做法。 */
  readonly headlights: HeadlightQualitySettings;
  /** 路燈與車頭燈的光柱。 */
  readonly lightShafts: LightShaftQualitySettings;
}

/** 自動選擇畫質用的裝置線索。瀏覽器不一定提供每一項，沒有就不填。 */
export interface QualityHints {
  /** 顯示卡名稱（WebGL 的 UNMASKED_RENDERER_WEBGL 或 RENDERER）。 */
  readonly rendererName?: string | undefined;
  /** `navigator.deviceMemory`（GB）。 */
  readonly deviceMemoryGb?: number | undefined;
  /** `navigator.hardwareConcurrency`（邏輯核心數）。 */
  readonly hardwareConcurrency?: number | undefined;
  /** 主要指標是手指（`pointer: coarse`）：手機與平板。 */
  readonly coarsePointer?: boolean | undefined;
}

/** 決議後的畫質：設定值，以及它是網址指定的還是自動選的。 */
export interface ResolvedQuality {
  readonly settings: QualitySettings;
  readonly source: 'url' | 'auto';
}

const QUALITY_PARAM = 'quality';

/** 顯示卡名稱含這些字（不分大小寫）就是 CPU 軟體算圖。 */
const SOFTWARE_RENDERER_MARKERS = [
  'swiftshader',
  'llvmpipe',
  'softpipe',
  'software',
  'microsoft basic render',
] as const;

/** 記憶體或核心數在這個值以下（含）算低階裝置。 */
const LOW_END_MEMORY_GB = 4;
const LOW_END_CORES = 4;

/** 軟體算圖用的級別：有天空、陰影、暈影，但不開環境光遮蔽與泛光（不必畫進半浮點緩衝區）。 */
const SOFTWARE_RENDERER_LEVEL: QualityLevel = 'medium';
const LOW_END_LEVEL: QualityLevel = 'medium';
/** 手機與平板（主要指標是手指）用的級別：螢幕的像素多、顯示卡的填充率低，後製鏈（半浮點＋環境光遮蔽＋泛光）最容易掉幀。 */
const TOUCH_DEVICE_LEVEL: QualityLevel = 'medium';
/** 自動選擇的上限。`ultra` 只能由 `?quality=ultra` 明確開啟。 */
const DEFAULT_LEVEL: QualityLevel = 'high';

function isQualityLevel(value: string): value is QualityLevel {
  return (QUALITY_LEVELS as readonly string[]).includes(value);
}

/** `?quality=` 指定的級別（不分大小寫）；沒給、空值或不認得 → undefined，不算錯誤。 */
export function parseQualityParam(urlSearch: string): QualityLevel | undefined {
  const requested = new URLSearchParams(urlSearch).get(QUALITY_PARAM)?.trim().toLowerCase();
  return requested !== undefined && isQualityLevel(requested) ? requested : undefined;
}

/** 顯示卡名稱看起來是不是 CPU 軟體算圖（SwiftShader、llvmpipe、softpipe、Microsoft Basic Render Driver…）。 */
export function isSoftwareRenderer(rendererName: string | undefined): boolean {
  if (rendererName === undefined) {
    return false;
  }
  const name = rendererName.toLowerCase();
  return SOFTWARE_RENDERER_MARKERS.some((marker) => name.includes(marker));
}

/**
 * 沒有指定 `?quality=` 時依裝置線索選級別：
 * 軟體算圖 → medium；手機與平板 → medium；記憶體或核心數很少 → medium；其餘 → high。永遠不會自動選 ultra。
 */
export function chooseAutoQuality(hints: QualityHints): QualityLevel {
  if (isSoftwareRenderer(hints.rendererName)) {
    return SOFTWARE_RENDERER_LEVEL;
  }
  if (hints.coarsePointer === true) {
    return TOUCH_DEVICE_LEVEL;
  }
  const lowMemory = hints.deviceMemoryGb !== undefined && hints.deviceMemoryGb <= LOW_END_MEMORY_GB;
  const fewCores =
    hints.hardwareConcurrency !== undefined && hints.hardwareConcurrency <= LOW_END_CORES;
  return lowMemory || fewCores ? LOW_END_LEVEL : DEFAULT_LEVEL;
}

/** 這個級別的設定值。 */
export function qualitySettings(level: QualityLevel): QualitySettings {
  return QUALITY_PRESETS[level];
}

/**
 * 拿掉倒影那一遍，其餘的設定不變（積水仍然映出天空）。
 */
export function withoutGroundReflection(settings: QualitySettings): QualitySettings {
  return settings.ground.reflection === null
    ? settings
    : { ...settings, ground: { ...settings.ground, reflection: null } };
}

/**
 * 自動選畫質時，這台裝置要不要省掉倒影那一遍（多畫一遍縮小的場景）：
 * - 手機與平板（主要指標是手指）：螢幕的像素多、顯示卡的填充率低，多畫一遍場景最容易掉幀。
 * - CPU 軟體算圖：每多一個 draw call 都是 CPU 在算，本來就只有個位數到二十幾幀。
 */
export function skipsGroundReflection(hints: QualityHints): boolean {
  return hints.coarsePointer === true || isSoftwareRenderer(hints.rendererName);
}

/** 拿掉景深、動態模糊、鏡頭光暈，其餘的設定不變。本來就都沒有的級別原樣傳回。 */
export function withoutLensEffects(settings: QualitySettings): QualitySettings {
  return settings.depthOfField === null && settings.motionBlur === null && settings.lensFlare === null
    ? settings
    : { ...settings, depthOfField: null, motionBlur: null, lensFlare: null };
}

/**
 * 這台裝置要不要關掉景深、動態模糊、鏡頭光暈（每一項都是多一到兩個全螢幕濾鏡）：
 * 手機與平板的填充率低；CPU 軟體算圖每多一個全螢幕濾鏡就少好幾幀。與倒影不同，
 * 就算 `?quality=high` 明確指定了級別也照關——要在這些裝置上看，用 `?fx=on`。
 */
export function skipsLensEffects(hints: QualityHints): boolean {
  return hints.coarsePointer === true || isSoftwareRenderer(hints.rendererName);
}

/**
 * 決議畫質：有效的 `?quality=` > 自動選擇。
 * - 自動選擇時，手機、平板與軟體算圖拿掉倒影那一遍（skipsGroundReflection）；`?quality=` 明確指定的級別照表給。
 * - 景深、動態模糊、鏡頭光暈：`?fx=off` 一律關、`?fx=on` 一律照級別給；都沒給時，手機、平板與軟體算圖關掉
 *   （skipsLensEffects，不管級別是自動選的還是網址指定的）。
 */
export function resolveQuality(urlSearch: string, hints: QualityHints): ResolvedQuality {
  const requested = parseQualityParam(urlSearch);
  const auto = qualitySettings(chooseAutoQuality(hints));
  const base =
    requested !== undefined
      ? qualitySettings(requested)
      : skipsGroundReflection(hints)
        ? withoutGroundReflection(auto)
        : auto;
  const lensFx = parseLensFxParam(urlSearch);
  const lensEffects = lensFx === 'on' || (lensFx === undefined && !skipsLensEffects(hints));
  return {
    settings: lensEffects ? base : withoutLensEffects(base),
    source: requested !== undefined ? 'url' : 'auto',
  };
}

/**
 * 這個級別要不要走高動態範圍的後製鏈（EffectComposer + 半浮點緩衝區）：
 * 環境光遮蔽、泛光、SMAA 任一個開了就要。都沒開時場景直接畫到畫面上，暈影（如果有）只是事後疊上去的一層。
 */
export function usesHdrChain(settings: QualitySettings): boolean {
  return settings.ambientOcclusion !== null || settings.bloom !== null || settings.smaa;
}

/** 實際使用的像素比：裝置像素比，但不超過這個級別的上限。 */
export function effectivePixelRatio(settings: QualitySettings, devicePixelRatio: number): number {
  return Math.min(devicePixelRatio, settings.maxPixelRatio);
}
