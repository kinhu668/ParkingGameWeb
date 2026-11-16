// 景深：對焦在玩家車，比對焦距離遠很多的背景（與跟車鏡頭旁貼近鏡頭的前景）略為模糊。
// 兩步：先在縮小的緩衝區裡依每個像素的模糊量取少數幾個樣本，再照全解析度的模糊量混回清楚的畫面，
// 所以對焦範圍內的車邊緣仍然是銳利的。深度沿用環境光遮蔽那一遍的深度貼圖，不多畫一遍場景。
// 模糊量的式子（blurAmount）與著色器裡的相同，可以不開 WebGL 測。
import {
  HalfFloatType,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type PerspectiveCamera,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { GameCameraView } from '../core/cameraView';
import type { CameraPreset } from '../core/urlParams';
import type { DepthOfFieldSettings } from './quality';
import { POST_CONFIG } from './renderConfig';

/** 這一幀的對焦。 */
export interface LensFocus {
  /** 對焦的距離（公尺，沿視線方向的深度）。 */
  readonly distanceM: number;
  /** 比對焦距離近很多的前景要不要模糊。貼在車上的鏡頭不要：眼前的引擎蓋、儀表板必須清楚。 */
  readonly foreground: boolean;
}

const DOF = POST_CONFIG.depthOfField;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * 深度 depthM 的東西有多模糊（0 = 清楚、1 = 最模糊）。清楚的範圍與模糊的速度都跟對焦距離成比例：
 * 對焦距離的 sharpNear–sharpFar 倍之間是清楚的，往遠到 fullFar 倍最模糊；
 * 往近到 fullNear 倍最多模糊到 nearStrength（focus.foreground 為 false 時前景不模糊）。
 */
export function blurAmount(depthM: number, focus: LensFocus): number {
  const ratio = depthM / focus.distanceM;
  const far = smoothstep(DOF.sharpFar, DOF.fullFar, ratio);
  const near = focus.foreground
    ? DOF.nearStrength * (1 - smoothstep(DOF.fullNear, DOF.sharpNear, ratio))
    : 0;
  return Math.max(far, near);
}

/**
 * 一般遊戲各鏡頭的對焦：跟車鏡頭對焦在玩家車（鏡頭到車的距離）；引擎蓋與駕駛座對焦在車前不遠處、
 * 眼前的車身不模糊；俯視不做景深（整個場地都在同一個距離上，而且停車要看清楚每一條線）。
 * @param cameraToCarM 鏡頭到玩家車的距離（公尺）
 */
export function focusForGameView(view: GameCameraView, cameraToCarM: number): LensFocus | null {
  switch (view) {
    case 'chase_near':
    case 'chase_far':
      return { distanceM: Math.max(cameraToCarM, DOF.minFocusM), foreground: true };
    case 'hood':
    case 'cockpit':
      return { distanceM: DOF.onCarFocusM, foreground: false };
    case 'top':
      return null;
  }
}

/**
 * `?cam=` 定格各鏡頭的對焦：斜俯視（follow）與車位旁的低鏡頭（spot_low）對焦在車上；正上方俯視（top）不做景深。
 * @param cameraToCarM 鏡頭到車的距離（公尺）
 */
export function focusForPreset(preset: CameraPreset, cameraToCarM: number): LensFocus | null {
  return preset === 'top'
    ? null
    : { distanceM: Math.max(cameraToCarM, DOF.minFocusM), foreground: true };
}

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`;

/** 數字 → GLSL 的浮點數字面值（一定帶小數點）。 */
function glslFloat(value: number): string {
  return value.toFixed(5);
}

/** 兩個著色器共用：由深度貼圖算這個像素的模糊量（與 blurAmount 相同的式子）。 */
const BLUR_AMOUNT_GLSL = /* glsl */ `
  #include <packing>
  uniform sampler2D tDepth;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform float focusDistance;
  uniform float foreground;

  float blurAmountAt( vec2 uv ) {
    float depth = - perspectiveDepthToViewZ( texture2D( tDepth, uv ).x, cameraNear, cameraFar );
    float ratio = depth / focusDistance;
    float far = smoothstep( ${glslFloat(DOF.sharpFar)}, ${glslFloat(DOF.fullFar)}, ratio );
    float near = foreground * ${glslFloat(DOF.nearStrength)} * ( 1.0 - smoothstep( ${glslFloat(DOF.fullNear)}, ${glslFloat(DOF.sharpNear)}, ratio ) );
    return max( far, near );
  }
`;

/** 第一步（縮小的緩衝區）：黃金角螺旋上的幾個樣本，半徑跟著這個像素的模糊量；清楚的樣本權重低，不會滲進模糊的背景。 */
const BLUR_FRAGMENT_SHADER = /* glsl */ `
  ${BLUR_AMOUNT_GLSL}
  uniform sampler2D tDiffuse;
  uniform vec2 blurRadius;
  varying vec2 vUv;

  void main() {
    float amount = blurAmountAt( vUv );
    vec3 sum = texture2D( tDiffuse, vUv ).rgb;
    float weight = 1.0;
    for ( int i = 0; i < DOF_TAPS; i ++ ) {
      float t = ( float( i ) + 0.5 ) / float( DOF_TAPS );
      float angle = float( i ) * 2.39996;
      vec2 uv = vUv + vec2( cos( angle ), sin( angle ) ) * sqrt( t ) * blurRadius * amount;
      float tapWeight = 0.05 + blurAmountAt( uv );
      sum += texture2D( tDiffuse, uv ).rgb * tapWeight;
      weight += tapWeight;
    }
    gl_FragColor = vec4( sum / weight, 1.0 );
  }
`;

/** 第二步（全解析度）：照這個像素的模糊量，把模糊的那一張混回清楚的畫面。 */
const COMPOSITE_FRAGMENT_SHADER = /* glsl */ `
  ${BLUR_AMOUNT_GLSL}
  uniform sampler2D tDiffuse;
  uniform sampler2D tBlur;
  varying vec2 vUv;

  void main() {
    vec3 sharp = texture2D( tDiffuse, vUv ).rgb;
    vec3 blurred = texture2D( tBlur, vUv ).rgb;
    gl_FragColor = vec4( mix( sharp, blurred, blurAmountAt( vUv ) ), 1.0 );
  }
`;

/** 後製鏈裡的景深。每幀畫之前用 setFocus 給鏡頭與對焦；對焦是 null 的那一幀整個跳過。 */
export class DepthOfFieldPass extends Pass {
  private readonly blurTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
  /** 兩個著色器共用的 uniform（同一組物件，設一次兩邊都生效）。 */
  private readonly lens = {
    cameraNear: { value: 1 },
    cameraFar: { value: 2 },
    focusDistance: { value: 1 },
    foreground: { value: 0 },
  };
  /** 清楚的畫面（後製鏈上一步的輸出）。 */
  private readonly sharp: { value: Texture | null } = { value: null };
  private readonly blurRadius = new Vector2();
  private readonly blurMaterial: ShaderMaterial;
  private readonly compositeMaterial: ShaderMaterial;
  private readonly quad = new FullScreenQuad();

  /**
   * @param settings 這個畫質級別的景深設定
   * @param depthTexture 場景的深度（環境光遮蔽那一遍畫的）
   */
  constructor(
    private readonly settings: DepthOfFieldSettings,
    depthTexture: Texture,
  ) {
    super();
    const shared = { ...this.lens, tDiffuse: this.sharp, tDepth: { value: depthTexture } };
    this.blurMaterial = new ShaderMaterial({
      name: 'DepthOfFieldBlurShader',
      defines: { DOF_TAPS: settings.taps },
      uniforms: { ...shared, blurRadius: { value: this.blurRadius } },
      vertexShader: VERTEX_SHADER,
      fragmentShader: BLUR_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
    });
    this.compositeMaterial = new ShaderMaterial({
      name: 'DepthOfFieldCompositeShader',
      uniforms: { ...shared, tBlur: { value: this.blurTarget.texture } },
      vertexShader: VERTEX_SHADER,
      fragmentShader: COMPOSITE_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
    });
  }

  /** 這一幀的鏡頭與對焦；focus 是 null 就不做景深（俯視、沒有玩家車的畫面）。 */
  setFocus(camera: PerspectiveCamera, focus: LensFocus | null): void {
    this.enabled = focus !== null;
    if (focus === null) {
      return;
    }
    this.lens.cameraNear.value = camera.near;
    this.lens.cameraFar.value = camera.far;
    this.lens.focusDistance.value = focus.distanceM;
    this.lens.foreground.value = focus.foreground ? 1 : 0;
    // 模糊半徑以畫面高度為 1：橫向除以長寬比，圓盤在畫面上才是圓的。
    this.blurRadius.set(this.settings.maxBlur / camera.aspect, this.settings.maxBlur);
  }

  override setSize(width: number, height: number): void {
    const scale = this.settings.resolutionScale;
    this.blurTarget.setSize(
      Math.max(Math.round(width * scale), 1),
      Math.max(Math.round(height * scale), 1),
    );
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
  ): void {
    this.sharp.value = readBuffer.texture;
    this.quad.material = this.blurMaterial;
    renderer.setRenderTarget(this.blurTarget);
    this.quad.render(renderer);

    this.quad.material = this.compositeMaterial;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  override dispose(): void {
    this.blurTarget.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
    this.quad.dispose();
  }
}
