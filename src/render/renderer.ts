// 建立 WebGLRenderer（three 0.187 只支援 WebGL2），並設定色調映射。畫布大小與後製鏈由 framePipeline.ts 負責。
import {
  ACESFilmicToneMapping,
  CustomToneMapping,
  PCFShadowMap,
  SRGBColorSpace,
  ShaderChunk,
  WebGLRenderer,
  type ToneMapping,
} from 'three';
import { usesHdrChain, type QualitySettings, type ToneMappingId } from './quality';
import { RENDERER_CONFIG, TONE_LOOK_CONFIG } from './renderConfig';

const TONE_MAPPINGS: Readonly<Record<ToneMappingId, ToneMapping>> = {
  aces: ACESFilmicToneMapping,
  // AgX + 黃昏的色調分級：用 three 的「自訂色調映射」掛進去（見 installToneLook）。
  agx: CustomToneMapping,
};

/** three 內建的自訂色調映射預設是「什麼都不做」；要換掉的就是這一行。 */
const DEFAULT_CUSTOM_TONE_MAPPING = 'vec3 CustomToneMapping( vec3 color ) { return color; }';

/** 數字 → GLSL 的浮點數字面值（一定帶小數點）。 */
function glslFloat(value: number): string {
  return value.toFixed(5);
}

function glslVec3(color: { readonly r: number; readonly g: number; readonly b: number }): string {
  return `vec3( ${glslFloat(color.r)}, ${glslFloat(color.g)}, ${glslFloat(color.b)} )`;
}

/**
 * 自訂色調映射的 GLSL：先做 three 內建的 AgX（含曝光），再做黃昏的色調分級。純函式，方便測試。
 * 輸入是場景線性亮度，輸出是顯示線性空間（之後 three 才轉成 sRGB）。
 */
export function toneLookShader(): string {
  const look = TONE_LOOK_CONFIG;
  return /* glsl */ `vec3 CustomToneMapping( vec3 color ) {
	color = AgXToneMapping( color );
	const vec3 lumaWeights = vec3( 0.2126, 0.7152, 0.0722 );
	float luma = dot( color, lumaWeights );
	// 暗部往冷色抬一點，亮部乘上暖色。
	color += ${glslVec3(look.shadowLift)} * ( 1.0 - luma ) * ( 1.0 - luma );
	color *= mix( vec3( 1.0 ), ${glslVec3(look.highlightTint)}, smoothstep( 0.08, 0.7, luma ) );
	// 飽和度，再以中間灰為支點加一點對比。
	luma = dot( color, lumaWeights );
	color = max( mix( vec3( luma ), color, ${glslFloat(look.saturation)} ), 0.0 );
	color = ${glslFloat(look.contrastPivot)} * pow( color / ${glslFloat(look.contrastPivot)}, vec3( ${glslFloat(look.contrast)} ) );
	return clamp( color, 0.0, 1.0 );
}`;
}

/**
 * 把黃昏的色調分級掛進 three 的自訂色調映射（改 ShaderChunk 是 three 提供的做法）。
 * 色調映射在每個材質的著色器裡執行，所以不管是直接畫到畫面上、還是後製鏈最後一步，用的都是這一個函式，
 * 各畫質級別的顏色才會是同一套，而且不必為了調色多一個全螢幕濾鏡。重複呼叫沒有副作用。
 */
function installToneLook(): void {
  const chunk = ShaderChunk.tonemapping_pars_fragment;
  const shader = toneLookShader();
  if (chunk.includes(shader)) {
    return;
  }
  if (!chunk.includes(DEFAULT_CUSTOM_TONE_MAPPING)) {
    throw new Error('three 的色調映射著色器裡找不到 CustomToneMapping 的預設實作');
  }
  ShaderChunk.tonemapping_pars_fragment = chunk.replace(DEFAULT_CUSTOM_TONE_MAPPING, shader);
}

export function createRenderer(canvas: HTMLCanvasElement, quality: QualitySettings): WebGLRenderer {
  installToneLook();
  // 走後製鏈時場景先畫進離屏緩衝區（多重取樣在那裡開），畫布本身只收最後一張全螢幕的圖，不必再開抗鋸齒。
  const antialias = !usesHdrChain(quality) && quality.msaaSamples > 0;
  const renderer = new WebGLRenderer({ canvas, antialias });
  renderer.outputColorSpace = SRGBColorSpace;
  // 色調映射只做一次：直接畫到畫面上時由材質著色器做；走後製鏈時畫到離屏緩衝區不會映射，
  // 由後製鏈最後一步（同樣是畫到畫面上）依這裡的設定來做。
  renderer.toneMapping = TONE_MAPPINGS[quality.toneMapping];
  renderer.toneMappingExposure = RENDERER_CONFIG.toneMappingExposure;
  renderer.shadowMap.enabled = true;
  // r186 起 PCFSoftShadowMap 已棄用，PCFShadowMap 本身就是柔邊。
  renderer.shadowMap.type = PCFShadowMap;
  return renderer;
}
