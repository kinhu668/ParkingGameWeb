// 鏡頭光暈：一道橫向的條紋與幾個鬼影。光源只有場景登記的太陽與路燈的燈頭，照它們在畫面上的位置直接畫
// （不從畫面的亮點找：車漆、積水、櫥窗再亮也不起光暈）——
// - 太陽（有太陽的天氣）：被樓與車擋住多少看場景的深度（太陽周圍幾個點是不是天空）。
// - 路燈的燈頭（沒有太陽、路燈亮的天氣）：取畫面裡最近的幾盞，越遠越淡；燈頭前面有東西擋著就沒有。
// 畫進自己的一張四分之一大小的緩衝區，由後製鏈最後一步加到畫面上（framePipeline.ts）。不用貼圖。
import {
  Color,
  HalfFloatType,
  ShaderMaterial,
  Vector3,
  Vector4,
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

/** 場景裡亮著的路燈：燈頭的位置（世界座標）與燈光的顏色。 */
export interface SceneLamps {
  readonly heads: readonly { readonly x: number; readonly y: number; readonly z: number }[];
  /** 燈殼的顏色（sRGB 十六進位）。 */
  readonly color: number;
}

const SCENE_LAMPS = new WeakMap<Scene, SceneLamps>();

/** 登記這個場景亮著的路燈（scene.ts 建場景時呼叫）。 */
export function setSceneLamps(scene: Scene, lamps: SceneLamps): void {
  SCENE_LAMPS.set(scene, lamps);
}

/** 一盞起光暈的燈：畫面上的位置（0–1，左下角是原點）、沿視線方向離鏡頭多遠、光暈的強度（0–1）。 */
export interface LampFlareSource {
  readonly x: number;
  readonly y: number;
  readonly viewDistanceM: number;
  readonly strength: number;
}

const LAMP_POINT = new Vector3();

/**
 * 這一幀起光暈的燈：在鏡頭前面、落在畫面裡的燈頭，由近到遠最多 FLARE.lampCount 盞。
 * 強度在 lampFullDistanceM 之內是 1，再遠就照距離反比淡下去（燈頭在畫面上越來越小）。
 * @param camera 世界矩陣與投影矩陣都要是這一幀的
 */
export function lampFlareSources(camera: PerspectiveCamera, heads: SceneLamps['heads']): LampFlareSource[] {
  const sources: LampFlareSource[] = [];
  for (const head of heads) {
    LAMP_POINT.set(head.x, head.y, head.z).applyMatrix4(camera.matrixWorldInverse);
    const viewDistanceM = -LAMP_POINT.z;
    if (viewDistanceM <= camera.near) {
      continue;
    }
    LAMP_POINT.applyMatrix4(camera.projectionMatrix);
    const x = LAMP_POINT.x * 0.5 + 0.5;
    const y = LAMP_POINT.y * 0.5 + 0.5;
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      continue;
    }
    sources.push({ x, y, viewDistanceM, strength: Math.min(FLARE.lampFullDistanceM / viewDistanceM, 1) });
  }
  return sources.sort((a, b) => a.viewDistanceM - b.viewDistanceM).slice(0, FLARE.lampCount);
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
  uniform sampler2D tDepth;
  uniform float streak;
  uniform float ghosts;
  // 太陽：xy = 畫面上的位置（0–1），z = 強度（0 = 這一幀沒有太陽的光暈）。
  uniform vec3 sun;
  uniform vec3 sunColor;
  // 路燈的燈頭：xy = 畫面上的位置，z = 強度（0 = 沒有這一盞），w = 沿視線方向離鏡頭多遠（公尺）。
  uniform vec4 lamps[ LAMP_COUNT ];
  uniform vec3 lampColor;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform float aspect;
  varying vec2 vUv;

  float skyAt( vec2 uv ) {
    return step( 0.99999, texture2D( tDepth, uv ).x );
  }

  // 光源靠近畫面邊緣時淡掉：鏡頭轉動時光暈不會突然出現或消失。
  float edgeFade( vec2 uv ) {
    vec2 edge = smoothstep( vec2( 0.0 ), vec2( ${glslFloat(FLARE.edgeFade)} ), uv )
      * smoothstep( vec2( 0.0 ), vec2( ${glslFloat(FLARE.edgeFade)} ), 1.0 - uv );
    return edge.x * edge.y;
  }

  // 這個位置畫到的表面沿視線方向的距離，是不是不比 nearest 近。
  float openAt( vec2 uv, float nearest ) {
    float depth = texture2D( tDepth, uv ).x;
    return step( nearest, cameraNear * cameraFar / ( cameraFar - depth * ( cameraFar - cameraNear ) ) );
  }

  // 太陽、燈頭露出來幾成：它的位置與四周共五個點，有幾個沒被更近的東西擋住；靠近畫面邊緣時淡掉。
  // 一個樹梢、一根燈桿掃過去時光暈是漸漸暗下去，不是一幀就消失。
  float sunVisibility() {
    vec2 r = vec2( ${glslFloat(FLARE.probeRadius)} / aspect, ${glslFloat(FLARE.probeRadius)} );
    float sky = skyAt( sun.xy ) + skyAt( sun.xy + vec2( r.x, 0.0 ) ) + skyAt( sun.xy - vec2( r.x, 0.0 ) )
      + skyAt( sun.xy + vec2( 0.0, r.y ) ) + skyAt( sun.xy - vec2( 0.0, r.y ) );
    return sky / 5.0 * edgeFade( sun.xy );
  }

  // 燈頭的距離留一點餘裕：燈殼自己就畫在那裡。
  float lampVisibility( vec4 lamp ) {
    vec2 r = vec2( ${glslFloat(FLARE.probeRadius)} / aspect, ${glslFloat(FLARE.probeRadius)} );
    float nearest = lamp.w * ${glslFloat(FLARE.lampDepthSlack)};
    float open = openAt( lamp.xy, nearest ) + openAt( lamp.xy + vec2( r.x, 0.0 ), nearest )
      + openAt( lamp.xy - vec2( r.x, 0.0 ), nearest ) + openAt( lamp.xy + vec2( 0.0, r.y ), nearest )
      + openAt( lamp.xy - vec2( 0.0, r.y ), nearest );
    return open / 5.0 * edgeFade( lamp.xy );
  }

  // 一個邊緣柔的圓（以畫面高度為 1 的座標）。
  float ghostDisc( vec2 point, vec2 center, float radius ) {
    return 1.0 - smoothstep( radius * 0.55, radius, length( point - center ) );
  }

  // 一個光源（在畫面上 source 的位置）在這個像素的條紋與鬼影；ghostGain 是鬼影的倍率。
  // 座標以畫面高度為 1，圓才是圓的。
  vec3 flareOf( vec2 source, float ghostGain ) {
    vec2 scale = vec2( aspect, 1.0 );
    vec2 point = ( vUv - 0.5 ) * scale;
    vec2 center = ( source - 0.5 ) * scale;
    vec2 offset = point - center;
    // 橫向條紋：離光源越遠越淡。
    float along = max( 1.0 - abs( offset.x ) / ( ${glslFloat(FLARE.streakHalfWidth)} * aspect ), 0.0 );
    float across = exp( - offset.y * offset.y / ${glslFloat(FLARE.streakHeight * FLARE.streakHeight)} );
    vec3 flare = ${glslVec3(FLARE.streakTint)} * along * along * across * streak;
    // 鬼影：光源對畫面中心鏡射到另一側，離中心的距離各除以一個比例。
    flare += ghosts * ghostGain * (
      ${glslVec3(FLARE.ghostTints[0])} * ghostDisc( point, - center / ${glslFloat(FLARE.ghostScales[0])}, ${glslFloat(FLARE.ghostRadii[0])} )
      + ${glslVec3(FLARE.ghostTints[1])} * ghostDisc( point, - center / ${glslFloat(FLARE.ghostScales[1])}, ${glslFloat(FLARE.ghostRadii[1])} )
      + ${glslVec3(FLARE.ghostTints[2])} * ghostDisc( point, - center / ${glslFloat(FLARE.ghostScales[2])}, ${glslFloat(FLARE.ghostRadii[2])} )
    );
    return flare;
  }

  void main() {
    vec3 flare = vec3( 0.0 );
    if ( sun.z > 0.0 ) {
      flare += flareOf( sun.xy, 1.0 ) * sunColor * ( sun.z * sunVisibility() * ${glslFloat(FLARE.sunLuma)} );
    }
    for ( int i = 0; i < LAMP_COUNT; i ++ ) {
      vec4 lamp = lamps[ i ];
      if ( lamp.z > 0.0 ) {
        flare += flareOf( lamp.xy, ${glslFloat(FLARE.lampGhostGain)} ) * lampColor * ( lamp.z * lampVisibility( lamp ) * ${glslFloat(FLARE.lampLuma)} );
      }
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
  private readonly lamps = Array.from({ length: FLARE.lampCount }, () => new Vector4());
  private readonly lampColor = new Color();

  /**
   * @param settings 這個畫質級別的光暈強度
   * @param depthTexture 場景的深度（環境光遮蔽那一遍畫的；天空是 1）
   */
  constructor(settings: LensFlareSettings, depthTexture: Texture) {
    super();
    this.needsSwap = false;
    this.material = new ShaderMaterial({
      name: 'LensFlareShader',
      defines: { LAMP_COUNT: FLARE.lampCount },
      uniforms: {
        tDepth: { value: depthTexture },
        streak: { value: settings.streak },
        ghosts: { value: settings.ghosts },
        sun: { value: this.sun },
        sunColor: { value: this.sunColor },
        lamps: { value: this.lamps },
        lampColor: { value: this.lampColor },
        cameraNear: { value: 1 },
        cameraFar: { value: 2 },
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
   * 這一幀的場景與鏡頭（鏡頭的矩陣要是這一幀的）。場景沒登記太陽、路燈就沒有那一種光暈。
   * @param sunStrength 太陽的光暈有多強（PostPreset.sunFlare）
   * @param lampStrength 路燈的光暈有多強（PostPreset.lampFlare）
   */
  setScene(scene: Scene, camera: PerspectiveCamera, sunStrength: number, lampStrength: number): void {
    const uniforms = this.material.uniforms;
    if (uniforms['aspect'] !== undefined && uniforms['cameraNear'] !== undefined && uniforms['cameraFar'] !== undefined) {
      uniforms['aspect'].value = camera.aspect;
      uniforms['cameraNear'].value = camera.near;
      uniforms['cameraFar'].value = camera.far;
    }
    const sceneSun = SCENE_SUN.get(scene);
    const uv = sceneSun === undefined || sunStrength <= 0 ? null : sunScreenUv(camera, sceneSun.direction);
    if (sceneSun === undefined || uv === null) {
      this.sun.set(0, 0, 0);
    } else {
      this.sun.set(uv.x, uv.y, sunStrength);
      this.sunColor.set(sceneSun.color);
    }
    const sceneLamps = SCENE_LAMPS.get(scene);
    const sources =
      sceneLamps === undefined || lampStrength <= 0 ? [] : lampFlareSources(camera, sceneLamps.heads);
    this.lamps.forEach((lamp, index) => {
      const source = sources[index];
      if (source === undefined) {
        lamp.set(0, 0, 0, 0);
      } else {
        lamp.set(source.x, source.y, source.strength * lampStrength, source.viewDistanceM);
      }
    });
    if (sceneLamps !== undefined) {
      this.lampColor.set(sceneLamps.color);
    }
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
