// 地面的著色器片段：插進 MeshStandardMaterial（保留環境光、陰影、霧），柏油的細節全部用世界座標 xz 算。
// 這個檔案只處理字串與數值，不建材質、不碰 WebGL，可以單元測試。
import { createRng } from '../core/rng';
import { degToRad } from '../core/units';
import type { GroundQualitySettings } from '../render/quality';
import { GROUND_CONFIG } from '../render/renderConfig';

/** 噪聲層的順序；著色器裡 uGroundLayers 的索引就是這個順序。 */
export const GROUND_LAYER_ORDER = [
  'fineGrain',
  'coarseGrain',
  'macroA',
  'macroB',
  'cracks',
  'stains',
  'wetness',
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

/** 這個畫質級別要打開的著色器開關（#define 名稱）。 */
export function groundShaderDefines(quality: GroundQualitySettings): readonly string[] {
  const defines: string[] = [];
  if (quality.normals) {
    defines.push('GROUND_NORMALS');
  }
  if (quality.wetness) {
    defines.push('GROUND_WETNESS');
  }
  return defines;
}

const VERTEX_PARS = /* glsl */ `
varying vec2 vGroundXZ;
`;

/** 接在 begin_vertex 之後：頂點的世界座標 xz。紋理釘在世界上，地面網格怎麼平移都不會跟著滑動。 */
const VERTEX_MAIN = /* glsl */ `
vGroundXZ = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;
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
uniform vec4 uGroundWet;
uniform vec4 uGroundPuddle;
uniform vec4 uGroundHeights;
uniform vec2 uGroundNormalFade;

vec2 groundUv( vec4 layer, vec2 p ) {
	return vec2( layer.x * p.x - layer.y * p.y, layer.y * p.x + layer.x * p.y ) + layer.zw;
}

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
float groundMacroA = texture2D( uGroundNoise, groundUv( uGroundLayers[ 2 ], vGroundXZ ) ).g;
float groundMacroB = texture2D( uGroundNoise, groundUv( uGroundLayers[ 3 ], vGroundXZ ) ).g;

// 裂縫：取樣位置被兩層大片噪聲扭曲，而且只出現在一部分區域，裂縫層自己的周期就看不出來。
vec2 groundCrackWarp = ( vec2( groundMacroB, groundMacroA ) - 0.5 ) * uGroundCrack.w;
float groundCrackMask = smoothstep( uGroundCrack.x, uGroundCrack.y, 0.5 * ( 1.0 - groundMacroA ) + 0.5 * groundMacroB );
float groundCrack = texture2D( uGroundNoise, groundUv( uGroundLayers[ 4 ], vGroundXZ ) + groundCrackWarp ).b * groundCrackMask;

// 油漬與污斑：斑塊噪聲的高處，再被大片噪聲調整濃淡。
float groundStainNoise = texture2D( uGroundNoise, groundUv( uGroundLayers[ 5 ], vGroundXZ ) ).a;
float groundStain = smoothstep( uGroundStain.x, uGroundStain.y, groundStainNoise + 0.25 * ( groundMacroA - 0.5 ) );

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
	float groundWetNoise = 0.65 * texture2D( uGroundNoise, groundUv( uGroundLayers[ 6 ], vGroundXZ ) ).a + 0.35 * ( 1.0 - groundMacroB );
	groundWet = smoothstep( uGroundWet.x, uGroundWet.y, groundWetNoise );
	groundPuddle = smoothstep( uGroundPuddle.x, uGroundPuddle.y, groundWetNoise );
	// 濕的柏油比較深；積水處顆粒被水蓋住，對比降低。
	groundColor *= 1.0 - uGroundWet.z * groundWet;
#endif
diffuseColor.rgb = groundColor;
`;

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
 * @param defines 要打開的開關（groundShaderDefines 的結果）
 */
export function patchGroundShader(source: ShaderSource, defines: readonly string[]): void {
  const defineLines = defines.map((name) => `#define ${name}`).join('\n');

  let vertex = source.vertexShader;
  vertex = replaceOnce(vertex, '#include <common>', `#include <common>\n${VERTEX_PARS}`);
  vertex = replaceOnce(vertex, '#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_MAIN}`);
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
  source.fragmentShader = fragment;
}
