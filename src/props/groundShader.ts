// 地面的著色器片段：插進 MeshStandardMaterial（保留環境光、陰影、霧），柏油的細節全部用世界座標 xz 算。
// 路緣石、車擋這類又矮又長的箱子落在地面上的影子也在這裡直接算（低角度的太陽下，陰影貼圖畫不完整）。
// 這個檔案只處理字串與數值，不建材質、不碰 WebGL，可以單元測試。
import { ShaderChunk } from 'three';
import { createRng } from '../core/rng';
import { degToRad } from '../core/units';
import type { GroundQualitySettings } from '../render/quality';
import { GROUND_CONFIG, GROUND_REFLECTION_CONFIG } from '../render/renderConfig';

/** 噪聲層的順序；著色器裡 uGroundLayers 的索引就是這個順序。 */
export const GROUND_LAYER_ORDER = [
  'fineGrain',
  'coarseGrain',
  'macroA',
  'macroB',
  'cracks',
  'stains',
  'wetness',
  'stainStreaks',
] as const satisfies readonly (keyof typeof GROUND_CONFIG.layers)[];

/**
 * 一層噪聲的世界座標 → 貼圖座標：uv = 旋轉(xz) / 周期 + 位移。
 * 著色器收到的是 (cos/周期, sin/周期, 位移 u, 位移 v)。
 */
export interface GroundLayerTransform {
  readonly cosOverPeriod: number;
  readonly sinOverPeriod: number;
  readonly offsetU: number;
  readonly offsetV: number;
}

/** 各層的轉換；位移由種子決定，所以同一個種子的地面每次都一樣、換種子就換一片地面。 */
export function groundLayerTransforms(seed: number): readonly GroundLayerTransform[] {
  const rng = createRng(seed);
  return GROUND_LAYER_ORDER.map((name) => {
    const layer = GROUND_CONFIG.layers[name];
    const angleRad = degToRad(layer.angleDeg);
    return {
      cosOverPeriod: Math.cos(angleRad) / layer.periodM,
      sinOverPeriod: Math.sin(angleRad) / layer.periodM,
      offsetU: rng(),
      offsetV: rng(),
    };
  });
}

/** 把世界座標 (x, z) 換成某一層的貼圖座標（與著色器裡的 groundUv 是同一條式子）。 */
export function groundLayerUv(
  layer: GroundLayerTransform,
  x: number,
  z: number,
): { readonly u: number; readonly v: number } {
  return {
    u: layer.cosOverPeriod * x - layer.sinOverPeriod * z + layer.offsetU,
    v: layer.sinOverPeriod * x + layer.cosOverPeriod * z + layer.offsetV,
  };
}

/**
 * 油漬拉絲的方向與長度（世界座標的向量，公尺）：拉絲層貼圖 v 軸的方向 × 拖動距離。
 * 著色器與 groundStainAmount 用同一個向量。
 */
export function groundStainSmear(): { readonly x: number; readonly z: number } {
  const angleRad = degToRad(GROUND_CONFIG.layers.stainStreaks.angleDeg);
  return {
    x: Math.sin(angleRad) * GROUND_CONFIG.stainSmearM,
    z: Math.cos(angleRad) * GROUND_CONFIG.stainSmearM,
  };
}

/** 噪聲貼圖的一個取樣（四個色版，0–1）。 */
export interface GroundNoiseTexel {
  readonly grain: number;
  readonly patch: number;
  readonly crack: number;
  readonly blotch: number;
}

/** 噪聲貼圖的取樣函式：貼圖座標（以 1 為周期，可超出 0–1）→ 四個色版。 */
export type GroundNoiseSampler = (u: number, v: number) => GroundNoiseTexel;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * 世界座標 (x, z) 的油漬量（0 = 沒有、1 = 最深），與著色器裡 groundStain 是同一條式子：
 * 取樣位置先被較高頻的噪聲扭曲（邊緣彎彎曲曲），斑塊被順著車道拉長的條紋拖出尾巴（拉絲）、
 * 減去高頻的缺口（濺灑），再被兩層大片深淺調整濃淡，最後才過門檻。只看世界座標與種子，每次都一樣。
 * @param sample 噪聲貼圖的取樣函式
 * @param layers groundLayerTransforms 的結果
 */
export function groundStainAmount(
  sample: GroundNoiseSampler,
  layers: readonly GroundLayerTransform[],
  x: number,
  z: number,
): number {
  const config = GROUND_CONFIG;
  const layerOf = (name: (typeof GROUND_LAYER_ORDER)[number]): GroundLayerTransform => {
    const layer = layers[GROUND_LAYER_ORDER.indexOf(name)];
    if (layer === undefined) {
      throw new Error(`地面噪聲層不存在：${name}`);
    }
    return layer;
  };
  const uvOf = (name: (typeof GROUND_LAYER_ORDER)[number]): { u: number; v: number } =>
    groundLayerUv(layerOf(name), x, z);
  const stainLayer = layerOf('stains');
  // 漂移：油漬層的取樣位置被最大的那一層噪聲（347 ft）推開，每個地方推的方向與距離都不同，
  // 所以油漬層自己的格子（61.3 ft）在世界座標上不是整齊的格子，平移一個周期對不回去。
  const macroAUv = uvOf('macroA');
  const macroATexel = sample(macroAUv.u, macroAUv.v);
  const macroA = macroATexel.patch;
  const driftX = (macroATexel.patch - 0.5) * config.stainDriftM;
  const driftZ = (macroATexel.blotch - 0.5) * config.stainDriftM;
  const stainUv = groundLayerUv(stainLayer, x + driftX, z + driftZ);
  const warpTexel = sample(stainUv.u * config.stainWarpScale, stainUv.v * config.stainWarpScale);
  const warpU = (warpTexel.patch - 0.5) * config.stainWarp;
  const warpV = (warpTexel.blotch - 0.5) * config.stainWarp;

  const streakUv = uvOf('stainStreaks');
  const streak = sample(streakUv.u + warpU, (streakUv.v + warpV) / config.stainStreakStretch).blotch;
  // 斑塊的取樣位置沿拉絲方向被條紋拖動：邊緣拖出長短不一的尾巴。
  const smear = groundStainSmear();
  const bodyUv = groundLayerUv(
    stainLayer,
    x + driftX + smear.x * (streak - 0.5),
    z + driftZ + smear.z * (streak - 0.5),
  );
  const body = sample(bodyUv.u + warpU, bodyUv.v + warpV).blotch;
  const splatter = sample(
    stainUv.u * config.stainSplatterScale + warpU,
    stainUv.v * config.stainSplatterScale + warpV,
  ).patch;
  const macroBUv = uvOf('macroB');
  const macroB = sample(macroBUv.u, macroBUv.v).patch;

  const field =
    body +
    (streak - 0.5) * config.stainStreakWeight -
    (splatter - 0.5) * config.stainSplatterWeight +
    (macroA - 0.5) * config.stainMacroAWeight +
    (macroB - 0.5) * config.stainMacroBWeight;
  return smoothstep(config.stainStart, config.stainEnd, field);
}

/** 一個會在地面上留下影子的箱子：底面範圍（車位本地座標）與高度。 */
export interface GroundEdgeBox {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly heightM: number;
}

/**
 * 路緣石、車擋落在地面上的影子（著色器裡直接算，不靠陰影貼圖）。
 * 箱子用車位本地座標；origin 與 right 把世界座標換成本地座標。
 */
export interface GroundEdgeShadows {
  /** 車位中心（世界座標）。 */
  readonly originX: number;
  readonly originZ: number;
  /** 車位本地 +X 在世界座標的方向（單位向量）；本地 +Z 是它順時針轉 90°。 */
  readonly rightX: number;
  readonly rightZ: number;
  /** 地面上的點朝太陽每升高 1 公尺，水平走多遠（本地座標）：朝太陽的水平方向 ÷ tan(仰角)。 */
  readonly sunRunX: number;
  readonly sunRunZ: number;
  readonly boxes: readonly GroundEdgeBox[];
}

/** 影子邊緣的柔和度：視線被箱子擋住的那一段佔「地面 → 箱頂高度」這段光路的比例，從 0 到這個值由亮漸暗。 */
export const GROUND_EDGE_SHADOW_SOFTNESS = 0.06;

/** 太陽幾乎在正上方或正好沿著某個軸時，水平位移不能是 0（著色器裡要拿它當除數）。 */
const MIN_SUN_RUN_M = 1e-4;

/**
 * 組出地面影子要用的資料。
 * @param origin 車位中心（世界座標）
 * @param headingRad 車位的 heading
 * @param directionToSun 從被照的點指向太陽的方向（世界座標，不必是單位長；y 要大於 0）
 * @param boxes 會留下影子的箱子（車位本地座標）
 */
export function groundEdgeShadows(
  origin: { readonly x: number; readonly z: number },
  headingRad: number,
  directionToSun: { readonly x: number; readonly y: number; readonly z: number },
  boxes: readonly GroundEdgeBox[],
): GroundEdgeShadows {
  // 本地 +X = right(heading) = (cos, sin)；本地 +Z = (−sin, cos)。
  const rightX = Math.cos(headingRad);
  const rightZ = Math.sin(headingRad);
  const awayFromZero = (value: number): number =>
    Math.abs(value) < MIN_SUN_RUN_M ? MIN_SUN_RUN_M : value;
  return {
    originX: origin.x,
    originZ: origin.z,
    rightX,
    rightZ,
    sunRunX: awayFromZero(
      (directionToSun.x * rightX + directionToSun.z * rightZ) / directionToSun.y,
    ),
    sunRunZ: awayFromZero(
      (-directionToSun.x * rightZ + directionToSun.z * rightX) / directionToSun.y,
    ),
    boxes,
  };
}

/**
 * 地面上的點 (x, z)（世界座標）被這些箱子擋掉多少陽光（1 = 完全照得到、0 = 全在影子裡），
 * 與著色器裡的 groundEdgeLit 是同一條式子：從這一點朝太陽走到箱頂的高度，這段光路在水平面上是一條線段，
 * 線段穿過箱子底面範圍的那一截越長，擋得越多。
 */
export function groundEdgeLight(shadows: GroundEdgeShadows, x: number, z: number): number {
  const dx = x - shadows.originX;
  const dz = z - shadows.originZ;
  const localX = dx * shadows.rightX + dz * shadows.rightZ;
  const localZ = -dx * shadows.rightZ + dz * shadows.rightX;
  let lit = 1;
  for (const box of shadows.boxes) {
    const runX = shadows.sunRunX * box.heightM;
    const runZ = shadows.sunRunZ * box.heightM;
    const x0 = (box.minX - localX) / runX;
    const x1 = (box.maxX - localX) / runX;
    const z0 = (box.minZ - localZ) / runZ;
    const z1 = (box.maxZ - localZ) / runZ;
    const enter = Math.max(Math.min(x0, x1), Math.min(z0, z1), 0);
    const exit = Math.min(Math.max(x0, x1), Math.max(z0, z1), 1);
    lit *= 1 - smoothstep(0, GROUND_EDGE_SHADOW_SOFTNESS, exit - enter);
  }
  return lit;
}

/** 濕地與積水的倒影在這個場景裡怎麼做（看天氣、畫質級別與裝置；scene.ts 決定）。 */
export type GroundMirrorMode =
  /** 沒有：乾的天氣、基準的黃昏，或沒有潮濕著色器的級別。著色器與原本一模一樣。 */
  | 'none'
  /** 只映天空：濕與積水的地方用提高的反射率映出環境貼圖，不多畫一遍場景。 */
  | 'sky'
  /** 平面反射：另外映出車、燈與建築（倒影貼圖，render/groundReflection.ts）。 */
  | 'planar';

/**
 * 這個場景的地面倒影做法：天氣沒有積水的倒影（reflection = 0）或沒有潮濕著色器 → none；
 * 畫質級別有開倒影那一遍 → planar；其餘 → sky。
 */
export function groundMirrorMode(
  quality: Pick<GroundQualitySettings, 'wetness' | 'reflection'>,
  weatherReflection: number,
): GroundMirrorMode {
  if (!quality.wetness || weatherReflection <= 0) {
    return 'none';
  }
  return quality.reflection === null ? 'sky' : 'planar';
}

/**
 * 這個畫質級別要打開的著色器開關（#define 的內容）。
 * @param edgeBoxCount 要在著色器裡算影子的箱子數（路緣石、車擋）；0 = 不算
 * @param mirror 濕地與積水的倒影做法；不給 = 沒有
 */
export function groundShaderDefines(
  quality: GroundQualitySettings,
  edgeBoxCount = 0,
  mirror: GroundMirrorMode = 'none',
): readonly string[] {
  const defines: string[] = [];
  if (quality.normals) {
    defines.push('GROUND_NORMALS');
  }
  if (quality.wetness) {
    defines.push('GROUND_WETNESS');
  }
  if (edgeBoxCount > 0) {
    defines.push(`GROUND_EDGE_BOXES ${edgeBoxCount}`);
  }
  if (quality.wetness && mirror !== 'none') {
    defines.push('GROUND_MIRROR');
    if (mirror === 'planar') {
      // 取樣數寫進開關：迴圈的次數要是編譯期常數。
      defines.push(`GROUND_PLANAR_TAPS ${Math.max(Math.round(quality.reflection?.streakTaps ?? 1), 1)}`);
    }
  }
  return defines;
}

/**
 * 濕地／積水在某個視線角度的反射率（0–1），與著色器裡的 groundMirrorAmount 是同一條式子。
 * @param cosView 視線與地面法線夾角的餘弦（1 = 從正上方往下看，0 = 貼著地面看）
 * @param wet 這一點有多濕（0–1）
 * @param puddle 這一點是不是積水（0–1）
 */
export function groundMirrorAmount(cosView: number, wet: number, puddle: number): number {
  const config = GROUND_REFLECTION_CONFIG;
  const grazing = (1 - Math.min(Math.max(cosView, 0), 1)) ** config.fresnelPower;
  const film = config.wetReflectance + (config.wetGrazingReflectance - config.wetReflectance) * grazing;
  const water = config.puddleReflectance + (1 - config.puddleReflectance) * grazing;
  return Math.max(wet, puddle) * (film + (water - film) * puddle);
}

const VERTEX_PARS = /* glsl */ `
varying vec2 vGroundXZ;
`;

/** 接在 begin_vertex 之後：頂點的世界座標 xz。紋理釘在世界上，地面網格怎麼平移都不會跟著滑動。 */
const VERTEX_MAIN = /* glsl */ `
vGroundXZ = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;
`;

/**
 * 接在 shadowmap_vertex 之後：太陽的陰影座標改用沒有沿法線偏移的位置。
 * 那個偏移是給會自己遮到自己的曲面用的；地面是平的、自己不投影，偏移只會讓取樣點浮在地面上方，
 * 把矮東西（車擋、路緣、輪胎底）的影子吃掉一截，陰影貼圖小的級別尤其明顯。
 */
const VERTEX_SHADOW = /* glsl */ `
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * worldPosition;
	}
	#pragma unroll_loop_end
#endif
`;

const FRAGMENT_PARS = /* glsl */ `
varying vec2 vGroundXZ;
uniform sampler2D uGroundNoise;
uniform vec4 uGroundLayers[ ${GROUND_LAYER_ORDER.length} ];
uniform vec4 uGroundContrast;
uniform vec3 uGroundDustTint;
uniform vec4 uGroundCrack;
uniform vec4 uGroundStain;
uniform vec3 uGroundStainTint;
uniform vec3 uGroundStainWarp;
uniform vec4 uGroundStainShape;
uniform vec2 uGroundStainMacro;
uniform vec2 uGroundStainSmear;
uniform float uGroundStainDrift;
uniform vec4 uGroundWet;
uniform vec4 uGroundPuddle;
uniform vec4 uGroundHeights;
uniform vec2 uGroundNormalFade;

vec2 groundUv( vec4 layer, vec2 p ) {
	return vec2( layer.x * p.x - layer.y * p.y, layer.y * p.x + layer.x * p.y ) + layer.zw;
}

#ifdef GROUND_EDGE_BOXES
uniform vec4 uGroundEdgeFrame;
uniform vec3 uGroundEdgeSun;
uniform vec4 uGroundEdgeBoxes[ GROUND_EDGE_BOXES ];
uniform float uGroundEdgeHeights[ GROUND_EDGE_BOXES ];

// 路緣石、車擋的影子：從地面這一點朝太陽走到箱頂的高度，這段光路在水平面上是一條線段；
// 線段穿過箱子底面範圍的那一截越長，擋掉的陽光越多（邊緣因此是柔的）。
float groundEdgeLight( vec2 p ) {
	vec2 offset = p - uGroundEdgeFrame.xy;
	vec2 local = vec2( dot( offset, uGroundEdgeFrame.zw ), dot( offset, vec2( - uGroundEdgeFrame.w, uGroundEdgeFrame.z ) ) );
	float lit = 1.0;
	for ( int i = 0; i < GROUND_EDGE_BOXES; i ++ ) {
		vec2 run = uGroundEdgeSun.xy * uGroundEdgeHeights[ i ];
		vec2 t0 = ( uGroundEdgeBoxes[ i ].xy - local ) / run;
		vec2 t1 = ( uGroundEdgeBoxes[ i ].zw - local ) / run;
		vec2 tNear = min( t0, t1 );
		vec2 tFar = max( t0, t1 );
		float enter = max( max( tNear.x, tNear.y ), 0.0 );
		float leave = min( min( tFar.x, tFar.y ), 1.0 );
		lit *= 1.0 - smoothstep( 0.0, uGroundEdgeSun.z, leave - enter );
	}
	return lit;
}
#endif

#ifdef GROUND_MIRROR
// 濕地與積水的倒影：x 積水正視的反射率、y 濕柏油正視的反射率、z 濕柏油貼地看的上限、w 隨視線角度上升的指數。
uniform vec4 uGroundMirror;
// x 倒影的整體強度（天氣）、y 積水的底色再壓暗的比例。
uniform vec2 uGroundMirrorLook;
#endif
#ifdef GROUND_PLANAR_TAPS
// 平面反射的貼圖（場景對地面鏡像後畫的，線性亮度、有 mipmap）與「世界座標 → 貼圖座標」的矩陣。
uniform sampler2D uGroundReflection;
uniform mat4 uGroundReflectionMatrix;
// 0 = 這一次不取倒影貼圖（用別的鏡頭畫同一個場景時），退回環境貼圖。
uniform float uGroundReflectionStrength;
// x 拉長的長度、y 顆粒把倒影推開的量、z 上下方向推開的倍數（都是貼圖座標）。
uniform vec3 uGroundReflectionShape;
// 取第幾級 mip（越大越糊）：x 濕柏油、y 積水。
uniform vec2 uGroundReflectionBlur;
#endif

#ifdef GROUND_NORMALS
// 表面高度（公尺）：細顆粒 + 粗顆粒 − 裂縫。
float groundHeight( vec2 p, vec2 crackWarp, float crackMask ) {
	float fine = texture2D( uGroundNoise, groundUv( uGroundLayers[ 0 ], p ) ).r;
	float coarse = texture2D( uGroundNoise, groundUv( uGroundLayers[ 1 ], p ) ).r;
	float crack = texture2D( uGroundNoise, groundUv( uGroundLayers[ 4 ], p ) + crackWarp ).b;
	return fine * uGroundHeights.x + coarse * uGroundHeights.y - crack * crackMask * uGroundHeights.z;
}
#endif
`;

/** 取代 map_fragment：算出柏油的顏色，以及後面粗糙度、法線要用的幾個量。 */
const FRAGMENT_ALBEDO = /* glsl */ `
float groundFine = texture2D( uGroundNoise, groundUv( uGroundLayers[ 0 ], vGroundXZ ) ).r;
float groundCoarse = texture2D( uGroundNoise, groundUv( uGroundLayers[ 1 ], vGroundXZ ) ).r;
vec4 groundMacroATexel = texture2D( uGroundNoise, groundUv( uGroundLayers[ 2 ], vGroundXZ ) );
float groundMacroA = groundMacroATexel.g;
float groundMacroB = texture2D( uGroundNoise, groundUv( uGroundLayers[ 3 ], vGroundXZ ) ).g;

// 裂縫：取樣位置被兩層大片噪聲扭曲，而且只出現在一部分區域，裂縫層自己的周期就看不出來。
vec2 groundCrackWarp = ( vec2( groundMacroB, groundMacroA ) - 0.5 ) * uGroundCrack.w;
float groundCrackMask = smoothstep( uGroundCrack.x, uGroundCrack.y, 0.5 * ( 1.0 - groundMacroA ) + 0.5 * groundMacroB );
float groundCrack = texture2D( uGroundNoise, groundUv( uGroundLayers[ 4 ], vGroundXZ ) + groundCrackWarp ).b * groundCrackMask;

// 油漬與污斑：不是圓團。取樣位置先被較高頻的噪聲扭曲（邊緣彎彎曲曲），
// 斑塊被順著車道拉長的條紋拖出尾巴（拉絲）、減去高頻的缺口（濺灑），再被大片噪聲調整濃淡，最後才過門檻。
// 漂移：取樣位置被最大的那一層噪聲推開，油漬層自己的周期在世界座標上就不是整齊的格子。
vec2 groundStainXZ = vGroundXZ + ( groundMacroATexel.ga - 0.5 ) * uGroundStainDrift;
vec2 groundStainUv = groundUv( uGroundLayers[ 5 ], groundStainXZ );
vec2 groundStainWarp = texture2D( uGroundNoise, groundStainUv * uGroundStainWarp.x ).ga - 0.5;
vec2 groundStreakUv = groundUv( uGroundLayers[ 7 ], vGroundXZ ) + groundStainWarp * uGroundStainWarp.y;
float groundStainStreak = texture2D( uGroundNoise, vec2( groundStreakUv.x, groundStreakUv.y / uGroundStainShape.x ) ).a;
vec2 groundStainBodyUv = groundUv( uGroundLayers[ 5 ], groundStainXZ + uGroundStainSmear * ( groundStainStreak - 0.5 ) );
float groundStainBody = texture2D( uGroundNoise, groundStainBodyUv + groundStainWarp * uGroundStainWarp.y ).a;
float groundStainSplatter = texture2D( uGroundNoise, groundStainUv * uGroundStainShape.z + groundStainWarp * uGroundStainWarp.y ).g;
float groundStain = smoothstep( uGroundStain.x, uGroundStain.y,
	groundStainBody
	+ ( groundStainStreak - 0.5 ) * uGroundStainShape.y
	- ( groundStainSplatter - 0.5 ) * uGroundStainShape.w
	+ ( groundMacroA - 0.5 ) * uGroundStainMacro.x
	+ ( groundMacroB - 0.5 ) * uGroundStainMacro.y );

float groundShade = 1.0
	+ ( groundFine - 0.5 ) * uGroundContrast.x
	+ ( groundCoarse - 0.5 ) * uGroundContrast.y
	+ ( groundMacroA - 0.5 ) * uGroundContrast.z
	+ ( groundMacroB - 0.5 ) * uGroundContrast.w;
vec3 groundColor = diffuseColor.rgb * max( groundShade, 0.0 );
groundColor *= mix( vec3( 1.0 ), uGroundDustTint, smoothstep( 0.35, 0.8, groundMacroB ) );
groundColor *= 1.0 - uGroundCrack.z * groundCrack;
groundColor *= mix( vec3( 1.0 ), uGroundStainTint, groundStain );

float groundWet = 0.0;
float groundPuddle = 0.0;
#ifdef GROUND_WETNESS
	// 濕斑的取樣位置跟著油漬的扭曲噪聲推開，邊緣才不是圓弧。
	float groundWetNoise = 0.65 * texture2D( uGroundNoise, groundUv( uGroundLayers[ 6 ], vGroundXZ ) + groundStainWarp * uGroundStainWarp.z ).a + 0.35 * ( 1.0 - groundMacroB );
	groundWet = smoothstep( uGroundWet.x, uGroundWet.y, groundWetNoise );
	groundPuddle = smoothstep( uGroundPuddle.x, uGroundPuddle.y, groundWetNoise );
	// 濕的柏油比較深；積水處顆粒被水蓋住，對比降低。
	groundColor *= 1.0 - uGroundWet.z * groundWet;
	#ifdef GROUND_MIRROR
		// 積水越深，底下的柏油越看不清楚：底色再暗一點，倒影才浮得出來。
		groundColor *= 1.0 - uGroundMirrorLook.y * groundPuddle;
	#endif
#endif
diffuseColor.rgb = groundColor;

float groundEdgeLit = 1.0;
#ifdef GROUND_EDGE_BOXES
	groundEdgeLit = groundEdgeLight( vGroundXZ );
#endif
`;

/** three 的打光片段裡，太陽（DirectionalLight）的陰影那一行的結尾；路緣石與車擋的影子乘在這裡，只擋陽光、不擋路燈與車燈。 */
const SUN_SHADOW_ANCHOR = 'vDirectionalShadowCoord[ i ] ) : 1.0;';
const SUN_SHADOW_WITH_EDGES = 'vDirectionalShadowCoord[ i ] ) * groundEdgeLit : 1.0;';

/** 接在 roughnessmap_fragment 之後：油漬、潮濕、積水各自把粗糙度往下拉。 */
const FRAGMENT_ROUGHNESS = /* glsl */ `
roughnessFactor = mix( roughnessFactor, uGroundStain.z, groundStain );
#ifdef GROUND_WETNESS
	roughnessFactor = mix( roughnessFactor, uGroundWet.w, groundWet );
	roughnessFactor = mix( roughnessFactor, uGroundPuddle.z, groundPuddle );
#endif
`;

/** 接在 normal_fragment_maps 之後：用高度的有限差分算世界座標的法線，再轉到視角座標。 */
const FRAGMENT_NORMAL = /* glsl */ `
#ifdef GROUND_NORMALS
{
	float groundEps = uGroundHeights.w;
	float groundH0 = groundHeight( vGroundXZ, groundCrackWarp, groundCrackMask );
	float groundHx = groundHeight( vGroundXZ + vec2( groundEps, 0.0 ), groundCrackWarp, groundCrackMask );
	float groundHz = groundHeight( vGroundXZ + vec2( 0.0, groundEps ), groundCrackWarp, groundCrackMask );
	vec2 groundSlope = vec2( groundHx - groundH0, groundHz - groundH0 ) / groundEps;
	// 遠處的起伏小於一個像素：淡出，免得閃爍。積水的水面是平的。
	float groundFade = 1.0 - smoothstep( uGroundNormalFade.x, uGroundNormalFade.y, length( vViewPosition ) );
	groundSlope *= groundFade * ( 1.0 - groundPuddle );
	vec3 groundNormal = normalize( vec3( - groundSlope.x, 1.0, - groundSlope.y ) );
	normal = normalize( ( viewMatrix * vec4( groundNormal, 0.0 ) ).xyz );
}
#endif
`;

/**
 * 接在 lights_fragment_end 之後：濕與積水的地方把「間接鏡面反射」換成倒影。
 * 反射率隨視線角度上升（貼著地面看最亮），數值是美術用的（GROUND_REFLECTION_CONFIG）；映出來的東西
 * 沒有倒影貼圖時是環境貼圖（只有天空），有的時候是平面反射（車、燈、建築）。被水面反射走的光不再照到底下的柏油。
 * radiance 是 three 在這之前算好的環境貼圖取樣（lights_fragment_maps）。
 */
const FRAGMENT_MIRROR = /* glsl */ `
#ifdef GROUND_MIRROR
{
	float groundMirrorMask = max( groundWet, groundPuddle );
	// 地面是平的：視線與法線的夾角只看視線方向與世界的上方（視角座標）。
	float groundCosView = saturate( dot( geometryViewDir, normalize( viewMatrix[ 1 ].xyz ) ) );
	float groundGrazing = pow( 1.0 - groundCosView, uGroundMirror.w );
	float groundFilm = mix( uGroundMirror.y, uGroundMirror.z, groundGrazing );
	float groundWater = mix( uGroundMirror.x, 1.0, groundGrazing );
	float groundMirrorAmount = uGroundMirrorLook.x * groundMirrorMask * mix( groundFilm, groundWater, groundPuddle );
	vec3 groundMirror = radiance;
	#ifdef GROUND_PLANAR_TAPS
	{
		vec4 groundPlanarCoord = uGroundReflectionMatrix * vec4( vGroundXZ.x, 0.0, vGroundXZ.y, 1.0 );
		vec2 groundPlanarUv = groundPlanarCoord.xy / groundPlanarCoord.w;
		// 濕柏油：顆粒把倒影打散、變糊，並沿畫面的上下方向拉長（路燈在濕地上的長條反光）。積水是平的：清楚、不拉長。
		float groundPlanarRough = 1.0 - groundPuddle;
		groundPlanarUv += ( vec2( groundFine, groundCoarse ) - 0.5 ) * uGroundReflectionShape.y * groundPlanarRough * vec2( 1.0, uGroundReflectionShape.z );
		float groundPlanarLod = mix( uGroundReflectionBlur.y, uGroundReflectionBlur.x, groundPlanarRough );
		#if GROUND_PLANAR_TAPS > 1
			vec3 groundPlanar = vec3( 0.0 );
			for ( int i = 0; i < GROUND_PLANAR_TAPS; i ++ ) {
				float groundPlanarAlong = float( i ) / float( GROUND_PLANAR_TAPS - 1 ) - 0.5;
				groundPlanar += textureLod( uGroundReflection, groundPlanarUv + vec2( 0.0, groundPlanarAlong * uGroundReflectionShape.x * groundPlanarRough ), groundPlanarLod ).rgb;
			}
			groundPlanar /= float( GROUND_PLANAR_TAPS );
		#else
			vec3 groundPlanar = textureLod( uGroundReflection, groundPlanarUv, groundPlanarLod ).rgb;
		#endif
		groundMirror = mix( groundMirror, groundPlanar, uGroundReflectionStrength );
	}
	#endif
	reflectedLight.indirectSpecular = mix( reflectedLight.indirectSpecular, groundMirror * groundMirrorAmount, groundMirrorMask );
	reflectedLight.directDiffuse *= 1.0 - groundMirrorAmount;
	reflectedLight.indirectDiffuse *= 1.0 - groundMirrorAmount;
}
#endif
`;

/** 著色器原始碼（頂點＋片段）。 */
export interface ShaderSource {
  vertexShader: string;
  fragmentShader: string;
}

/** 把 anchor 換成 replacement；找不到就丟錯（three 改版把片段改名時，寧可立刻發現，不要悄悄變回素色地面）。 */
function replaceOnce(source: string, anchor: string, replacement: string): string {
  if (!source.includes(anchor)) {
    throw new Error(`地面著色器：找不到插入點 ${anchor}`);
  }
  return source.replace(anchor, replacement);
}

/**
 * 把柏油的片段插進 MeshStandardMaterial 的著色器原始碼。
 * @param defines 要打開的開關（groundShaderDefines 的結果，每一項是一行 #define 的內容）
 */
export function patchGroundShader(source: ShaderSource, defines: readonly string[]): void {
  const defineLines = defines.map((name) => `#define ${name}`).join('\n');

  let vertex = source.vertexShader;
  vertex = replaceOnce(vertex, '#include <common>', `#include <common>\n${VERTEX_PARS}`);
  vertex = replaceOnce(vertex, '#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_MAIN}`);
  vertex = replaceOnce(
    vertex,
    '#include <shadowmap_vertex>',
    `#include <shadowmap_vertex>\n${VERTEX_SHADOW}`,
  );
  source.vertexShader = vertex;

  let fragment = source.fragmentShader;
  fragment = replaceOnce(
    fragment,
    '#include <common>',
    `${defineLines}\n#include <common>\n${FRAGMENT_PARS}`,
  );
  fragment = replaceOnce(fragment, '#include <map_fragment>', FRAGMENT_ALBEDO);
  fragment = replaceOnce(
    fragment,
    '#include <roughnessmap_fragment>',
    `#include <roughnessmap_fragment>\n${FRAGMENT_ROUGHNESS}`,
  );
  fragment = replaceOnce(
    fragment,
    '#include <normal_fragment_maps>',
    `#include <normal_fragment_maps>\n${FRAGMENT_NORMAL}`,
  );
  fragment = replaceOnce(
    fragment,
    '#include <lights_fragment_begin>',
    replaceOnce(ShaderChunk.lights_fragment_begin, SUN_SHADOW_ANCHOR, SUN_SHADOW_WITH_EDGES),
  );
  fragment = replaceOnce(
    fragment,
    '#include <lights_fragment_end>',
    `#include <lights_fragment_end>\n${FRAGMENT_MIRROR}`,
  );
  source.fragmentShader = fragment;
}
