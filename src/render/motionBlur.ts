// 動態模糊：只算鏡頭自己的移動造成的位移（由深度與前一幀的鏡頭矩陣重建），沿位移方向取幾個樣本。
// 鏡頭跟著的那台車是跟鏡頭一起動的，在畫面上幾乎不動：車身周圍一個球的範圍內不拖（subjectBlurScale）。
// 位移 → 拖影長度的式子（motionBlurLength）與著色器裡的相同，可以不開 WebGL 測。
import {
  Matrix4,
  ShaderMaterial,
  Vector4,
  type PerspectiveCamera,
  type Texture,
  type WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { MotionBlurSettings } from './quality';
import { POST_CONFIG } from './renderConfig';

const MOTION = POST_CONFIG.motionBlur;

/**
 * 一個像素這一幀在畫面上移動了 displacement（以畫面高度為 1），要拖多長的影（同樣以畫面高度為 1）。
 * - 低於 startDisplacement：0（幾乎靜止時畫面完全清楚）
 * - 到 fullDisplacement 之間平滑地長到「位移 × 快門」
 * - 不超過這個畫質級別的上限 maxBlur
 * - 一幀就超過 cutDisplacement：鏡頭切換，不拖
 */
export function motionBlurLength(displacement: number, settings: MotionBlurSettings): number {
  if (displacement >= MOTION.cutDisplacement) {
    return 0;
  }
  const t = Math.min(
    Math.max(
      (displacement - MOTION.startDisplacement) /
        (MOTION.fullDisplacement - MOTION.startDisplacement),
      0,
    ),
    1,
  );
  const ramp = t * t * (3 - 2 * t);
  return Math.min(displacement * settings.shutter * ramp, settings.maxBlur);
}

/** 鏡頭跟著的主體（玩家車）：世界座標的中心與半徑（公尺）。這個球裡的東西不拖影。 */
export interface MotionSubject {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radiusM: number;
}

/** 玩家車在地面上的位置（公尺）→ 動態模糊的主體：球心在車身的高度，半徑蓋住整台車。 */
export function motionSubjectAt(x: number, z: number): MotionSubject {
  return { x, y: MOTION.subjectHeightM, z, radiusM: MOTION.subjectRadiusM };
}

/**
 * 離主體中心 distanceM 的像素，拖影長度乘上的比例：半徑以內是 0（車身清楚），
 * 到半徑的 subjectFeather 倍平滑地回到 1。與著色器裡的式子相同。
 */
export function subjectBlurScale(distanceM: number, radiusM: number): number {
  const t = Math.min(Math.max((distanceM - radiusM) / (radiusM * (MOTION.subjectFeather - 1)), 0), 1);
  return t * t * (3 - 2 * t);
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

/**
 * 由深度把這個像素投回前一幀的鏡頭，得到它在畫面上的位移，沿位移方向取幾個樣本平均。
 * 拖影長度的式子與 motionBlurLength 相同。
 */
const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tDepth;
  uniform mat4 reprojection;
  uniform mat4 clipToWorld;
  // 主體：xyz = 世界座標的中心，w = 半徑。
  uniform vec4 subject;
  uniform float aspect;
  uniform float shutter;
  uniform float maxBlur;
  varying vec2 vUv;

  void main() {
    vec4 clip = vec4( vUv * 2.0 - 1.0, texture2D( tDepth, vUv ).x * 2.0 - 1.0, 1.0 );
    vec4 previous = reprojection * clip;
    // 位移（以畫面高度為 1）：這一幀的位置 − 前一幀的位置。
    vec2 motion = ( clip.xy - previous.xy / previous.w ) * 0.5 * vec2( aspect, 1.0 );
    float displacement = length( motion );
    float ramp = smoothstep( ${glslFloat(MOTION.startDisplacement)}, ${glslFloat(MOTION.fullDisplacement)}, displacement );
    float blur = displacement < ${glslFloat(MOTION.cutDisplacement)} ? min( displacement * shutter * ramp, maxBlur ) : 0.0;
    // 主體（玩家車）周圍不拖（同 subjectBlurScale）。
    vec4 world = clipToWorld * clip;
    blur *= smoothstep( subject.w, subject.w * ${glslFloat(MOTION.subjectFeather)}, distance( world.xyz / world.w, subject.xyz ) );
    vec3 color = texture2D( tDiffuse, vUv ).rgb;
    if ( blur > 0.0 ) {
      vec2 step = motion / displacement * blur / vec2( aspect, 1.0 ) / float( MOTION_TAPS );
      for ( int i = 1; i <= MOTION_TAPS; i ++ ) {
        color += texture2D( tDiffuse, vUv - step * float( i ) ).rgb;
      }
      color /= float( MOTION_TAPS + 1 );
    }
    gl_FragColor = vec4( color, 1.0 );
  }
`;

/**
 * 後製鏈裡的動態模糊。每幀畫之前用 setCamera 給鏡頭；active 為 false 的那一幀（定格、沒有前一幀）整個跳過，
 * 並且忘掉前一幀的鏡頭——下一次從頭開始，不會拿很久以前的鏡頭來算位移。
 */
export class MotionBlurPass extends Pass {
  private readonly material: ShaderMaterial;
  private readonly quad: FullScreenQuad;
  private readonly viewProjection = new Matrix4();
  private readonly previousViewProjection = new Matrix4();
  private readonly reprojection = new Matrix4();
  private readonly clipToWorld = new Matrix4();
  private readonly subject = new Vector4();
  private hasPrevious = false;

  /**
   * @param settings 這個畫質級別的動態模糊設定
   * @param depthTexture 場景的深度（環境光遮蔽那一遍畫的）
   */
  constructor(settings: MotionBlurSettings, depthTexture: Texture) {
    super();
    this.material = new ShaderMaterial({
      name: 'MotionBlurShader',
      defines: { MOTION_TAPS: settings.taps },
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: depthTexture },
        reprojection: { value: this.reprojection },
        clipToWorld: { value: this.clipToWorld },
        subject: { value: this.subject },
        aspect: { value: 1 },
        shutter: { value: settings.shutter },
        maxBlur: { value: settings.maxBlur },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  /**
   * 這一幀的鏡頭（世界矩陣要已經更新）。
   * @param subject 鏡頭跟著的主體；null = 這一幀不可以拖影（定格、沒有前一幀可比）
   */
  setCamera(camera: PerspectiveCamera, subject: MotionSubject | null): void {
    const active = subject !== null;
    this.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.enabled = active && this.hasPrevious;
    if (this.enabled && subject !== null) {
      // 這一幀的裁切座標 → 世界 → 前一幀的裁切座標。
      this.clipToWorld.copy(this.viewProjection).invert();
      this.reprojection.multiplyMatrices(this.previousViewProjection, this.clipToWorld);
      this.subject.set(subject.x, subject.y, subject.z, subject.radiusM);
      setUniformValue(this.material, 'aspect', camera.aspect);
    }
    this.previousViewProjection.copy(this.viewProjection);
    this.hasPrevious = active;
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
  ): void {
    setUniformValue(this.material, 'tDiffuse', readBuffer.texture);
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  override dispose(): void {
    this.material.dispose();
    this.quad.dispose();
  }
}

function setUniformValue(material: ShaderMaterial, name: string, value: number | Texture): void {
  const uniform = material.uniforms[name];
  if (uniform === undefined) {
    throw new Error(`著色器「${material.name}」沒有 uniform「${name}」`);
  }
  uniform.value = value;
}
