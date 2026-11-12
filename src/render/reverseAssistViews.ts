// 倒車輔助層的四個畫面：左右後視鏡、倒後鏡頭、鳥瞰。每個畫面用自己的鏡頭把同一個場景畫進一張小的
// 離屏緩衝區，再貼到主畫面上對應的位置（位置由 core/assistLayout.ts 算，DOM 外框用同一份）。
// - 緩衝區存的是場景線性亮度；貼到畫面上時才做色調映射與色域轉換，顏色與主畫面是同一套。
// - 後視鏡與倒後鏡頭左右鏡像（鏡子與真車的倒車顯影都是這樣）：畫面左邊就是車的左邊。
// - 陰影貼圖沿用主畫面這一幀剛畫好的，不重畫。
// - 跟車鏡頭的遮擋半透明不套用在這裡：畫這四個畫面時擺設都是不透明的（drawScene，見 occlusionFade.ts）。
// 引導線與文字不在這裡：那是疊在上面的 SVG／DOM（ui/reverseAssist.ts），這裡只提供投影。
import {
  HalfFloatType,
  LinearFilter,
  OrthographicCamera,
  PerspectiveCamera,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type Camera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import {
  ASSIST_VIEW_ASPECT,
  ASSIST_VIEW_IDS,
  type AssistLayout,
  type AssistViewId,
  type Rect,
} from '../core/assistLayout';
import { forward, right } from '../core/heading';
import type { VehiclePose } from '../vehicle/bicycleModel';
import type { GroundPoint } from '../vehicle/reverseGuides';
import { VEHICLE_CONFIG_SI } from '../vehicle/vehicleConfig';
import { effectivePixelRatio, type QualitySettings } from './quality';
import { REVERSE_ASSIST_CONFIG as CONFIG } from './renderConfig';

const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;
const HALF_WIDTH_M = VEHICLE_CONFIG_SI.widthM / 2;

/** 這個畫面要不要左右鏡像：朝後看的三個要，鳥瞰不要。 */
export const ASSIST_VIEW_MIRRORED: Readonly<Record<AssistViewId, boolean>> = {
  bird: false,
  rear: true,
  mirrorLeft: true,
  mirrorRight: true,
};

export type AssistCameras = Readonly<Record<AssistViewId, Camera>>;

/** 畫面上的點：左上 (0, 0)、右下 (1, 1)。 */
export interface ScreenPoint {
  readonly u: number;
  readonly v: number;
}

function mirrorCamera(): PerspectiveCamera {
  return new PerspectiveCamera(
    CONFIG.mirror.fovDeg,
    ASSIST_VIEW_ASPECT.mirrorLeft,
    CONFIG.mirror.nearM,
    CONFIG.farM,
  );
}

/** 建立四台鏡頭（還沒擺位；先呼叫 placeAssistCameras）。不需要 WebGL。 */
export function createAssistCameras(): AssistCameras {
  const halfDepthM = CONFIG.bird.halfDepthM;
  const halfWidthM = halfDepthM * ASSIST_VIEW_ASPECT.bird;
  return {
    // 近平面在離地 clipAboveGroundM 的高度：比它高的東西不畫。遠平面在地面下一點。
    bird: new OrthographicCamera(
      -halfWidthM,
      halfWidthM,
      halfDepthM,
      -halfDepthM,
      CONFIG.bird.heightM - CONFIG.bird.clipAboveGroundM,
      CONFIG.bird.heightM + 1,
    ),
    rear: new PerspectiveCamera(
      CONFIG.rear.fovDeg,
      ASSIST_VIEW_ASPECT.rear,
      CONFIG.rear.nearM,
      CONFIG.farM,
    ),
    mirrorLeft: mirrorCamera(),
    mirrorRight: mirrorCamera(),
  };
}

/** 鏡頭擺在 (x, y, z)，沿水平方向 (dirX, dirZ) 看、再往下俯 pitchDownRad。 */
function aim(
  camera: Camera,
  x: number,
  y: number,
  z: number,
  dirX: number,
  dirZ: number,
  pitchDownRad: number,
): void {
  camera.position.set(x, y, z);
  const levelM = Math.cos(pitchDownRad);
  camera.lookAt(x + dirX * levelM, y - Math.sin(pitchDownRad), z + dirZ * levelM);
}

/** 把四台鏡頭擺到車上（pose 是算圖用的姿態），並更新它們的矩陣。 */
export function placeAssistCameras(cameras: AssistCameras, pose: VehiclePose): void {
  const ahead = forward(pose.headingRad);
  const side = right(pose.headingRad);

  // 鳥瞰：車正上方往下看，畫面上方是車頭。
  cameras.bird.up.set(ahead.x, 0, ahead.z);
  cameras.bird.position.set(pose.x, CONFIG.bird.heightM, pose.z);
  cameras.bird.lookAt(pose.x, 0, pose.z);

  // 倒後鏡頭：車尾中央往後看。
  const rearBackM = HALF_LENGTH_M + CONFIG.rear.behindRearM;
  aim(
    cameras.rear,
    pose.x - ahead.x * rearBackM,
    CONFIG.rear.heightM,
    pose.z - ahead.z * rearBackM,
    -ahead.x,
    -ahead.z,
    CONFIG.rear.pitchDownRad,
  );

  // 後視鏡：朝車尾看，往外偏 yawOutRad。
  const mirror = CONFIG.mirror;
  const lateralM = HALF_WIDTH_M + mirror.outboardM;
  const back = Math.cos(mirror.yawOutRad);
  const out = Math.sin(mirror.yawOutRad);
  for (const [camera, sign] of [
    [cameras.mirrorLeft, -1],
    [cameras.mirrorRight, 1],
  ] as const) {
    aim(
      camera,
      pose.x + side.x * sign * lateralM + ahead.x * mirror.aheadM,
      mirror.heightM,
      pose.z + side.z * sign * lateralM + ahead.z * mirror.aheadM,
      -ahead.x * back + side.x * sign * out,
      -ahead.z * back + side.z * sign * out,
      mirror.pitchDownRad,
    );
  }

  for (const id of ASSIST_VIEW_IDS) {
    cameras[id].updateMatrixWorld();
  }
}

const ORIGIN_POSE: VehiclePose = { x: 0, z: 0, headingRad: 0, steerRad: 0 };

/**
 * 車身座標的地面點 → 某個畫面上的位置的投影器。鏡頭都固定在車上，所以結果與車在哪裡無關。
 * 不需要 WebGL。
 */
export function createGuideProjector(): (view: AssistViewId, point: GroundPoint) => ScreenPoint {
  const cameras = createAssistCameras();
  placeAssistCameras(cameras, ORIGIN_POSE);
  const scratch = new Vector3();
  return (view, point) => {
    // 車頭朝 −Z、右側 +X（heading 0）。
    scratch.set(point.lateralM, 0, -point.aheadM).project(cameras[view]);
    const u = (scratch.x + 1) / 2;
    return { u: ASSIST_VIEW_MIRRORED[view] ? 1 - u : u, v: (1 - scratch.y) / 2 };
  };
}

const BLIT_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`;

/** 把一張離屏緩衝區貼到目前的視口：可左右鏡像、可半透明（淡入淡出），並做色調映射與色域轉換。 */
const BLIT_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tView;
  uniform float opacity;
  uniform float mirrored;
  varying vec2 vUv;
  void main() {
    vec2 uv = vec2( mix( vUv.x, 1.0 - vUv.x, mirrored ), vUv.y );
    gl_FragColor = vec4( texture2D( tView, uv ).rgb, opacity );
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface ReverseAssistViews {
  /**
   * 預先編譯場景裡的材質畫進離屏緩衝區用的著色器（不擋畫面）：第一次倒車時才編譯會卡一下。
   */
  warmUp(scene: Scene): void;
  /**
   * 主畫面畫完之後呼叫：重畫（部分）視口，再把四張貼到主畫面上。opacity ≤ 0 時什麼都不做。
   * @param layout 四個視口在畫面上的位置（CSS 像素）
   */
  render(scene: Scene, pose: VehiclePose, layout: AssistLayout, opacity: number): void;
}

/** 把場景畫進小畫面的那一段包在這裡面跑：給場景一個機會先換成「小畫面該看到的樣子」，畫完再換回來。 */
export type AssistSceneGuard = (draw: () => void) => void;

/**
 * 建立四個視口的鏡頭與緩衝區。renderer 要用同一個 quality 建立。
 * @param drawScene 畫小畫面時包在外面的那一層（GameScene.drawUnfaded：不套用遮擋半透明）；不給就直接畫
 */
export function createReverseAssistViews(
  renderer: WebGLRenderer,
  quality: QualitySettings,
  drawScene: AssistSceneGuard = (draw) => {
    draw();
  },
): ReverseAssistViews {
  const cost = CONFIG.quality[quality.level];
  const cameras = createAssistCameras();
  // 半浮點才裝得下比 1 亮的天空與燈；顯示卡不能畫進浮點緩衝區就退回 8 位元（亮部會被夾住）。
  const type =
    renderer.extensions.has('EXT_color_buffer_float') ||
    renderer.extensions.has('EXT_color_buffer_half_float')
      ? HalfFloatType
      : UnsignedByteType;
  const targetOf = (): WebGLRenderTarget =>
    new WebGLRenderTarget(1, 1, {
      type,
      samples: cost.msaaSamples,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      generateMipmaps: false,
    });
  const targets: Readonly<Record<AssistViewId, WebGLRenderTarget>> = {
    bird: targetOf(),
    rear: targetOf(),
    mirrorLeft: targetOf(),
    mirrorRight: targetOf(),
  };

  const blitMaterial = new ShaderMaterial({
    name: 'AssistBlitShader',
    uniforms: { tView: { value: null }, opacity: { value: 1 }, mirrored: { value: 0 } },
    vertexShader: BLIT_VERTEX_SHADER,
    fragmentShader: BLIT_FRAGMENT_SHADER,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const blit = new FullScreenQuad(blitMaterial);
  const uniforms = blitMaterial.uniforms;

  const canvasSize = new Vector2();
  /** 上一幀有沒有顯示；剛出現的那一幀四張都要重畫，否則會看到舊畫面。 */
  let shownLastFrame = false;
  /** 輪流更新：下一個要重畫的視口。 */
  let nextView = 0;

  function resizeTarget(target: WebGLRenderTarget, rect: Rect): boolean {
    const scale = effectivePixelRatio(quality, window.devicePixelRatio) * cost.resolutionScale;
    const width = Math.max(Math.round(rect.width * scale), 1);
    const height = Math.max(Math.round(rect.height * scale), 1);
    if (target.width === width && target.height === height) {
      return false;
    }
    target.setSize(width, height);
    return true;
  }

  return {
    warmUp(scene) {
      // 著色器依「畫到畫面上還是離屏緩衝區」有兩種版本；先把離屏的那一版排進背景編譯。
      placeAssistCameras(cameras, ORIGIN_POSE);
      renderer.setRenderTarget(targets.rear);
      void renderer.compileAsync(scene, cameras.rear);
      renderer.setRenderTarget(null);
    },
    render(scene, pose, layout, opacity) {
      if (opacity <= 0) {
        shownLastFrame = false;
        return;
      }
      placeAssistCameras(cameras, pose);

      // 這一幀要重畫哪幾張：大小變了或剛出現的一定畫，其餘照每幀的額度輪流。
      const redraw = new Set<AssistViewId>();
      for (const id of ASSIST_VIEW_IDS) {
        if (resizeTarget(targets[id], layout[id]) || !shownLastFrame) {
          redraw.add(id);
        }
      }
      for (let count = 0; count < cost.viewsPerFrame; count += 1) {
        const id = ASSIST_VIEW_IDS[nextView % ASSIST_VIEW_IDS.length];
        nextView += 1;
        if (id !== undefined) {
          redraw.add(id);
        }
      }
      shownLastFrame = true;

      // 陰影貼圖沿用主畫面這一幀的：光與場景都沒變，不必再畫一遍。
      const shadowAutoUpdate = renderer.shadowMap.autoUpdate;
      renderer.shadowMap.autoUpdate = false;
      drawScene(() => {
        for (const id of redraw) {
          renderer.setRenderTarget(targets[id]);
          renderer.render(scene, cameras[id]);
        }
      });
      renderer.setRenderTarget(null);
      renderer.shadowMap.autoUpdate = shadowAutoUpdate;

      // 貼到主畫面上：視口用 CSS 像素（renderer 自己乘像素比），y 從畫面底部算起。
      renderer.getSize(canvasSize);
      renderer.autoClear = false;
      if (uniforms['opacity'] !== undefined) {
        uniforms['opacity'].value = Math.min(opacity, 1);
      }
      for (const id of ASSIST_VIEW_IDS) {
        const rect = layout[id];
        if (uniforms['tView'] !== undefined && uniforms['mirrored'] !== undefined) {
          uniforms['tView'].value = targets[id].texture;
          uniforms['mirrored'].value = ASSIST_VIEW_MIRRORED[id] ? 1 : 0;
        }
        renderer.setViewport(rect.x, canvasSize.y - rect.y - rect.height, rect.width, rect.height);
        blit.render(renderer);
      }
      renderer.setViewport(0, 0, canvasSize.x, canvasSize.y);
      renderer.autoClear = true;
    },
  };
}
