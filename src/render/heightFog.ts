// 高度霧：貼地的一層霧氣，越高越淡（濃度隨高度指數遞減）。疊在原本的線性遠霧上，
// 所以遠處的地面與建築的下半截融進霧裡，屋頂與燈頭仍然清楚：空氣讀得出厚度，不是整張畫面蓋一層灰。
//
// 做法：換掉 three 的霧的著色器片段（ShaderChunk 的 fog_*；改 ShaderChunk 是 three 提供的做法，
// 色調分級也是這樣掛的，見 renderer.ts）。每個吃霧的材質（地面、建築、車、雨絲…）自動都有，
// 不多一個 draw call、不需要深度貼圖，低畫質也跑得動。沿視線把濃度積分是解析式，每個像素只多幾個運算。
//
// 數值來自天氣（WeatherPreset.air），在建立場景時代進著色器（一個頁面只有一個場景、一種天氣；
// 著色器是第一次畫的時候才編譯的）。濃度是 0 的天氣（晴天、黃昏、雨後）用回 three 原本的片段，一個字都不改。
import { ShaderChunk } from 'three';
import type { AirPreset } from './weatherPresets';

/** 高度比（(點的高度 − 鏡頭高度) ÷ 霧氣厚度）夾在 ± 這個值以內：指數不會溢位。 */
const MAX_HEIGHT_RATIO = 30;
/** 高度比的絕對值小於這個值就當成水平視線（避免 0 ÷ 0）。 */
const LEVEL_EPSILON = 1e-3;

/** three 原本的霧的著色器片段（模組載入時記下來；沒有霧氣的天氣用回這一份）。 */
const STOCK_CHUNKS = {
  fog_pars_vertex: ShaderChunk.fog_pars_vertex,
  fog_vertex: ShaderChunk.fog_vertex,
  fog_pars_fragment: ShaderChunk.fog_pars_fragment,
  fog_fragment: ShaderChunk.fog_fragment,
} as const;

export type FogChunks = { readonly [Key in keyof typeof STOCK_CHUNKS]: string };

/**
 * 從鏡頭（高度 cameraYM）看到一個點（高度 pointYM、距離 distanceM）之間，貼地霧氣的光學厚度。
 * 濃度 = mistDensityPerM × exp(−高度 ÷ mistHeightM)，沿視線積分的解析解。與著色器裡的式子相同。
 */
export function mistOpticalDepth(
  air: Pick<AirPreset, 'mistDensityPerM' | 'mistHeightM'>,
  cameraYM: number,
  pointYM: number,
  distanceM: number,
): number {
  if (air.mistDensityPerM <= 0 || distanceM <= 0) {
    return 0;
  }
  const ratio = Math.min(
    Math.max((pointYM - cameraYM) / air.mistHeightM, -MAX_HEIGHT_RATIO),
    MAX_HEIGHT_RATIO,
  );
  const slope = Math.abs(ratio) > LEVEL_EPSILON ? (1 - Math.exp(-ratio)) / ratio : 1;
  return (
    air.mistDensityPerM * distanceM * Math.exp(-Math.max(cameraYM, 0) / air.mistHeightM) * slope
  );
}

/** 貼地霧氣把那個點蓋掉多少（0 = 完全看得到、1 = 完全是霧色）。 */
export function mistAmount(
  air: Pick<AirPreset, 'mistDensityPerM' | 'mistHeightM'>,
  cameraYM: number,
  pointYM: number,
  distanceM: number,
): number {
  return 1 - Math.exp(-mistOpticalDepth(air, cameraYM, pointYM, distanceM));
}

/** 著色器裡的浮點常數：一定帶小數點。 */
function glslFloat(value: number): string {
  const text = value.toPrecision(8);
  return /[.e]/.test(text) ? text : `${text}.0`;
}

/**
 * 這種空氣要用的霧的著色器片段。沒有貼地霧氣 → three 原本的四段；有 → 加上高度霧的版本
 * （頂點多傳一個世界高度，片段把高度霧的透光率乘進原本的霧）。
 */
export function heightFogChunks(air: Pick<AirPreset, 'mistDensityPerM' | 'mistHeightM'>): FogChunks {
  if (air.mistDensityPerM <= 0) {
    return STOCK_CHUNKS;
  }
  return {
    fog_pars_vertex: /* glsl */ `
#ifdef USE_FOG
	varying float vFogDepth;
	varying float vFogWorldY;
#endif
`,
    // 世界高度由視角座標反推（視角矩陣是旋轉＋平移）：實例化的網格、蒙皮的網格都不必另外處理。
    fog_vertex: /* glsl */ `
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
	vFogWorldY = dot( viewMatrix[ 1 ].xyz, mvPosition.xyz - viewMatrix[ 3 ].xyz );
#endif
`,
    fog_pars_fragment: /* glsl */ `
#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	varying float vFogWorldY;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif
`,
    fog_fragment: /* glsl */ `
#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	// 貼地的霧氣：濃度隨高度指數遞減，沿視線積分（解析式）。
	float mistRatio = clamp( ( vFogWorldY - cameraPosition.y ) / ${glslFloat(air.mistHeightM)}, ${glslFloat(-MAX_HEIGHT_RATIO)}, ${glslFloat(MAX_HEIGHT_RATIO)} );
	float mistSlope = abs( mistRatio ) > ${glslFloat(LEVEL_EPSILON)} ? ( 1.0 - exp( - mistRatio ) ) / mistRatio : 1.0;
	float mistDepth = ${glslFloat(air.mistDensityPerM)} * max( vFogDepth, 0.0 ) * exp( - max( cameraPosition.y, 0.0 ) / ${glslFloat(air.mistHeightM)} ) * mistSlope;
	fogFactor = 1.0 - ( 1.0 - fogFactor ) * exp( - mistDepth );
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
`,
  };
}

/**
 * 把這種空氣的霧掛進 three（之後才編譯的著色器都用它）。建立場景時、畫第一幀之前呼叫。
 * 一個頁面只有一個場景；同一頁先後建立不同天氣的場景時，已經編譯好的著色器不會跟著換。
 */
export function installHeightFog(air: Pick<AirPreset, 'mistDensityPerM' | 'mistHeightM'>): void {
  const chunks = heightFogChunks(air);
  ShaderChunk.fog_pars_vertex = chunks.fog_pars_vertex;
  ShaderChunk.fog_vertex = chunks.fog_vertex;
  ShaderChunk.fog_pars_fragment = chunks.fog_pars_fragment;
  ShaderChunk.fog_fragment = chunks.fog_fragment;
}
