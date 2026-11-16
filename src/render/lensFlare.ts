// 鏡頭光暈：一道橫向的條紋與幾個鬼影，光源有兩種——
// - 夜裡的燈殼：從泛光已經模糊好的小張緩衝區裡挑（夠亮、整塊的才算）。
// - 太陽：白天泛光的門檻拉得比天空高（車漆才不會洗白），泛光裡沒有太陽；改由太陽在畫面上的位置直接畫，
//   被樓與車擋住多少看場景的深度（太陽周圍幾個點是不是天空）。
// 畫進自己的一張四分之一大小的緩衝區，由後製鏈最後一步加到畫面上（framePipeline.ts）。不用貼圖。
// 哪些像素算光源（flareSourceWeight）與著色器裡的式子相同，可以不開 WebGL 測。
import {
  Color,
  HalfFloatType,
  ShaderMaterial,
  Vector3,
  WebGLRenderTarget,
  type PerspectiveCamera,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { LensFlareSettings } from './quality';
import { POST_CONFIG } from './renderConfig';

const FLARE = POST_CONFIG.lensFlare;

/**
 * 一個像素算不算光暈的光源（0–1）。
 * @param luma 泛光緩衝區裡的亮度（已經過泛光的門檻、壓過上限、模糊過：一小點反光被周圍平均掉，整塊亮的才留得住）
 * @param isSky 這個像素後面是不是天空（沒有任何實體表面）：太陽圓盤一定是
 * @param surfaceScale 實體表面上的亮點算幾成（PostPreset.flareSurfaceScale）：有太陽的天氣是 0——
 *   車漆、積水上的太陽反光不算光源；沒有太陽的天氣是 1，夠亮的只有燈殼
 */
export function flareSourceWeight(luma: number, isSky: boolean, surfaceScale: number): number {
  const t = Math.min(
    Math.max((luma - FLARE.sourceMinLuma) / (FLARE.sourceMaxLuma - FLARE.sourceMinLuma), 0),
    1,
  );
  return t * t * (3 - 2 * t) * (isSky ? 1 : surfaceScale);
}

/** 場景裡太陽的方向（指向太陽的單位向量）與顏色。 */
export interface SceneSun {
  readonly direction: { readonly x: number; readonly y: number; readonly z: number };
  /** 太陽光的顏色（sRGB 十六進位）。 */
  readonly color: number;
}

const SCENE_SUN = new WeakMap<Scene, SceneSun>();

/** 登記這個場景的太陽（scene.ts 建場景時呼叫，這種天氣的太陽會起光暈才登記）。 */
export function setSceneSun(scene: Scene, sun: SceneSun): void {
  SCENE_SUN.set(scene, sun);
}

const SUN_CLIP = new Vector3();

/**
 * 太陽在畫面上的位置（x、y 都是 0–1，左下角是原點）。太陽在鏡頭後面就是 null。
 * 可以超出 0–1（太陽在畫面外）：著色器會在畫面邊緣把光暈淡掉。
 * @param camera 世界矩陣與投影矩陣都要是這一幀的
 */
export function sunScreenUv(
  camera: PerspectiveCamera,
  direction: SceneSun['direction'],
): { x: number; y: number } | null {
  // 方向（無限遠的點）換到鏡頭座標：鏡頭往 −Z 看，z ≥ 0 就是在後面。
  SUN_CLIP.set(direction.x, direction.y, direction.z).transformDirection(camera.matrixWorldInverse);
  if (SUN_CLIP.z >= -1e-4) {
    return null;
  }
  // applyMatrix4 會除以 w（透視投影的 w = −z），得到 −1–1 的畫面座標。
  SUN_CLIP.applyMatrix4(camera.projectionMatrix);
  return { x: SUN_CLIP.x * 0.5 + 0.5, y: SUN_CLIP.y * 0.5 + 0.5 };
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

function glslVec3(color: { readonly r: number; readonly g: number; readonly b: number }): string {
  return `vec3( ${glslFloat(color.r)}, ${glslFloat(color.g)}, ${glslFloat(color.b)} )`;
}

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tBloom;
  uniform sampler2D tDepth;
  uniform float streak;
  uniform float ghosts;
  uniform float surfaceScale;
  // 太陽：xy = 畫面上的位置（0–1），z = 強度（0 = 這一幀沒有太陽的光暈）。
  uniform vec3 sun;
  uniform vec3 sunColor;
  uniform float aspect;
  varying vec2 vUv;

  float skyAt( vec2 uv ) {
    return step( 0.99999, texture2D( tDepth, uv ).x );
  }

  // 太陽露出來幾成：太陽的位置與四周共五個點有幾個是天空；太陽靠近畫面邊緣時淡掉。
  float sunVisibility() {
    vec2 r = vec2( ${glslFloat(FLARE.sunProbeRadius)} / aspect, ${glslFloat(FLARE.sunProbeRadius)} );
    float sky = skyAt( sun.xy ) + skyAt( sun.xy + vec2( r.x, 0.0 ) ) + skyAt( sun.xy - vec2( r.x, 0.0 ) )
      + skyAt( sun.xy + vec2( 0.0, r.y ) ) + skyAt( sun.xy - vec2( 0.0, r.y ) );
    vec2 edge = smoothstep( vec2( 0.0 ), vec2( ${glslFloat(FLARE.edgeFade)} ), sun.xy )
      * smoothstep( vec2( 0.0 ), vec2( ${glslFloat(FLARE.edgeFade)} ), 1.0 - sun.xy );
    return sky / 5.0 * edge.x * edge.y;
  }

  // 一個邊緣柔的圓（以畫面高度為 1 的座標）。
  float ghostDisc( vec2 point, vec2 center, float radius ) {
    return 1.0 - smoothstep( radius * 0.55, radius, length( point - center ) );
  }

  // 這個位置的光源：泛光緩衝區的顏色 × 光源的權重（同 flareSourceWeight）。靠近畫面邊緣淡到 0，
  // 取樣點跑出畫面時不會把邊緣那一排像素拉成一條。
  vec3 flareSource( vec2 uv ) {
    vec3 color = texture2D( tBloom, uv ).rgb;
    float luma = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );
    float sky = step( 0.99999, texture2D( tDepth, uv ).x );
    float weight = smoothstep( ${glslFloat(FLARE.sourceMinLuma)}, ${glslFloat(FLARE.sourceMaxLuma)}, luma )
      * mix( surfaceScale, 1.0, sky );
    vec2 edge = smoothstep( vec2( 0.0 ), vec2( ${glslFloat(FLARE.edgeFade)} ), uv )
      * smoothstep( vec2( 0.0 ), vec2( ${glslFloat(FLARE.edgeFade)} ), 1.0 - uv );
    return color * weight * edge.x * edge.y;
  }

  void main() {
    // 橫向條紋：左右各取幾個樣本，離光源越遠越淡。樣本的間隔比模糊過的光源窄，相鄰的樣本會重疊，條紋是連續的。
    vec3 streakSum = vec3( 0.0 );
    for ( int i = - STREAK_TAPS; i <= STREAK_TAPS; i ++ ) {
      float x = float( i ) / float( STREAK_TAPS );
      float falloff = ( 1.0 - abs( x ) ) * ( 1.0 - abs( x ) );
      streakSum += flareSource( vUv + vec2( x * ${glslFloat(FLARE.streakHalfWidth)}, 0.0 ) ) * falloff;
    }
    vec3 flare = streakSum * ${glslVec3(FLARE.streakTint)} * streak;

    // 鬼影：光源對畫面中心鏡射到另一側，離中心的距離各乘一個比例。
    vec2 mirrored = 0.5 - vUv;
    vec3 ghostSum = flareSource( 0.5 + mirrored * ${glslFloat(FLARE.ghostScales[0])} ) * ${glslVec3(FLARE.ghostTints[0])};
    ghostSum += flareSource( 0.5 + mirrored * ${glslFloat(FLARE.ghostScales[1])} ) * ${glslVec3(FLARE.ghostTints[1])};
    ghostSum += flareSource( 0.5 + mirrored * ${glslFloat(FLARE.ghostScales[2])} ) * ${glslVec3(FLARE.ghostTints[2])};
    flare += ghostSum * ghosts;

    if ( sun.z > 0.0 ) {
      // 太陽的條紋與鬼影直接照它在畫面上的位置畫（座標以畫面高度為 1，圓才是圓的）。
      vec2 scale = vec2( aspect, 1.0 );
      vec2 point = ( vUv - 0.5 ) * scale;
      vec2 center = ( sun.xy - 0.5 ) * scale;
      vec2 offset = point - center;
      float along = max( 1.0 - abs( offset.x ) / ( ${glslFloat(FLARE.streakHalfWidth)} * aspect ), 0.0 );
      float across = exp( - offset.y * offset.y / ${glslFloat(FLARE.sunStreakHeight * FLARE.sunStreakHeight)} );
      vec3 sunFlare = ${glslVec3(FLARE.streakTint)} * along * along * across * streak;
      sunFlare += ghosts * (
        ${glslVec3(FLARE.ghostTints[0])} * ghostDisc( point, - center / ${glslFloat(FLARE.ghostScales[0])}, ${glslFloat(FLARE.sunGhostRadii[0])} )
        + ${glslVec3(FLARE.ghostTints[1])} * ghostDisc( point, - center / ${glslFloat(FLARE.ghostScales[1])}, ${glslFloat(FLARE.sunGhostRadii[1])} )
        + ${glslVec3(FLARE.ghostTints[2])} * ghostDisc( point, - center / ${glslFloat(FLARE.ghostScales[2])}, ${glslFloat(FLARE.sunGhostRadii[2])} )
      );
      flare += sunFlare * sunColor * ( sun.z * sunVisibility() * ${glslFloat(FLARE.sunLuma)} );
    }

    gl_FragColor = vec4( flare, 1.0 );
  }
`;

/**
 * 後製鏈裡的鏡頭光暈（排在泛光之後）。不改後製鏈的畫面，只把光暈畫進 texture；最後一步再把它加上去。
 */
export class LensFlarePass extends Pass {
  private readonly target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false });
  private readonly material: ShaderMaterial;
  private readonly quad: FullScreenQuad;
  private readonly sun = new Vector3();
  private readonly sunColor = new Color();

  /**
   * @param settings 這個畫質級別的光暈強度
   * @param bloomTexture 泛光模糊過的一張小緩衝區
   * @param depthTexture 場景的深度（環境光遮蔽那一遍畫的；天空是 1）
   */
  constructor(settings: LensFlareSettings, bloomTexture: Texture, depthTexture: Texture) {
    super();
    this.needsSwap = false;
    this.material = new ShaderMaterial({
      name: 'LensFlareShader',
      defines: { STREAK_TAPS: FLARE.streakTaps },
      uniforms: {
        tBloom: { value: bloomTexture },
        tDepth: { value: depthTexture },
        streak: { value: settings.streak },
        ghosts: { value: settings.ghosts },
        surfaceScale: { value: 1 },
        sun: { value: this.sun },
        sunColor: { value: this.sunColor },
        aspect: { value: 1 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  /** 光暈的畫面（線性亮度，直接加到場景上）。 */
  get texture(): Texture {
    return this.target.texture;
  }

  /**
   * 這一幀的場景與鏡頭（鏡頭的矩陣要是這一幀的）。
   * @param surfaceScale 實體表面上的亮點算幾成光源（PostPreset.flareSurfaceScale）
   * @param sunStrength 太陽的光暈有多強（PostPreset.sunFlare）；場景沒登記太陽就沒有
   */
  setScene(scene: Scene, camera: PerspectiveCamera, surfaceScale: number, sunStrength: number): void {
    const uniforms = this.material.uniforms;
    if (uniforms['surfaceScale'] !== undefined) {
      uniforms['surfaceScale'].value = surfaceScale;
    }
    if (uniforms['aspect'] !== undefined) {
      uniforms['aspect'].value = camera.aspect;
    }
    const sceneSun = SCENE_SUN.get(scene);
    const uv = sceneSun === undefined || sunStrength <= 0 ? null : sunScreenUv(camera, sceneSun.direction);
    if (sceneSun === undefined || uv === null) {
      this.sun.set(0, 0, 0);
      return;
    }
    this.sun.set(uv.x, uv.y, sunStrength);
    this.sunColor.set(sceneSun.color);
  }

  override setSize(width: number, height: number): void {
    this.target.setSize(
      Math.max(Math.round(width * FLARE.resolutionScale), 1),
      Math.max(Math.round(height * FLARE.resolutionScale), 1),
    );
  }

  override render(renderer: WebGLRenderer): void {
    renderer.setRenderTarget(this.target);
    this.quad.render(renderer);
  }

  override dispose(): void {
    this.target.dispose();
    this.material.dispose();
    this.quad.dispose();
  }
}
