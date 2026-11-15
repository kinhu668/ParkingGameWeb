// 地面的倒影（平面反射）：停車場的地面是 y = 0 的平面，所以倒影不必做全畫面的螢幕空間反射——
// 把鏡頭對地面鏡像，用鏡像鏡頭把場景畫進一張縮小的貼圖；地面著色器（props/groundShader.ts）在濕與積水的地方
// 用同一個投影矩陣取樣，車、路燈、建築的倒影就接在它們的腳下，畫面外的東西也映得出來。
//
// - 只有有積水的天氣（雨、雷雨、雨後）而且畫質級別有開（QualitySettings.ground.reflection）才建立；
//   其他情況這個檔案的東西一樣都不建立，不多一個 draw call。
// - 鏡像鏡頭的近平面換成「地面往上一點」的斜平面（Lengyel 的 oblique near plane）：地面以下與貼地的東西不畫。
// - 陰影貼圖沿用上一次主畫面畫好的（第一幀還沒有，才讓這一遍自己畫）。
// - 倒車輔助層的小畫面用別的鏡頭畫同一個場景：那時把強度設成 0，地面退回只映天空（環境貼圖），不會取到主鏡頭的倒影。
// - 每一幀由 framePipeline 在畫主畫面之前呼叫（一般遊戲、?cam、?bench 都走同一條路）。
import {
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  PerspectiveCamera,
  Plane,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  type Object3D,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { SKIP_GROUND_REFLECTION } from './groundReflectionFlag';
import type { GroundReflectionSettings } from './quality';
import { GROUND_REFLECTION_CONFIG } from './renderConfig';

/** 地面著色器要的三個 uniform；物件固定，內容每幀更新。 */
export interface GroundReflectionUniforms {
  /** 倒影貼圖（場景線性亮度，有 mipmap）。 */
  readonly texture: { value: Texture };
  /** 世界座標 → 倒影貼圖座標（齊次；除以 w 之後是 0–1）。 */
  readonly matrix: { value: Matrix4 };
  /** 0 = 這一次不取倒影貼圖（退回環境貼圖），1 = 取。 */
  readonly strength: { value: number };
}

export interface GroundReflection {
  readonly uniforms: GroundReflectionUniforms;
  /**
   * 畫主畫面之前呼叫：用 camera 的鏡像把 scene 畫進倒影貼圖（隔幀重畫的級別有時不畫）。
   * 鏡頭在地面以下時不畫，強度歸 0。
   */
  render(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): void;
  /**
   * 倒影那一遍不畫的物件（地面自己、標了 SKIP_GROUND_REFLECTION 的）。場景建好之後呼叫一次。
   */
  exclude(objects: readonly Object3D[]): void;
  /** 不取倒影貼圖地跑 draw（跑完恢復）：用別的鏡頭畫同一個場景時用（倒車輔助層的小畫面）。 */
  drawWithout(draw: () => void): void;
  /** 倒影貼圖目前的大小（像素）；還沒畫過是 0×0。唯讀，除錯用。 */
  size(): { readonly width: number; readonly height: number };
}

const UP = new Vector3(0, 1, 0);
const scratchPosition = new Vector3();
const scratchForward = new Vector3();
const scratchTarget = new Vector3();
const scratchPlane = new Plane();
const scratchClip = new Vector4();
const scratchCorner = new Vector4();

/**
 * 把 mirror 擺成 camera 對「y = 0 的地面」的鏡像，並把它的近平面換成 y = clipHeightM 的斜平面
 * （只畫比它高的東西）。camera 的 matrixWorld 要是最新的。不需要 WebGL。
 * @returns 世界座標 → 倒影貼圖座標的矩陣（寫進 textureMatrix 後回傳）
 */
export function placeMirrorCamera(
  camera: PerspectiveCamera,
  mirror: PerspectiveCamera,
  clipHeightM: number,
  textureMatrix: Matrix4,
): Matrix4 {
  // 位置、看的方向、上方都對地面鏡像（y 變號）。
  scratchPosition.setFromMatrixPosition(camera.matrixWorld);
  scratchForward.set(0, 0, -1).transformDirection(camera.matrixWorld);
  mirror.position.set(scratchPosition.x, -scratchPosition.y, scratchPosition.z);
  scratchTarget.set(
    mirror.position.x + scratchForward.x,
    mirror.position.y - scratchForward.y,
    mirror.position.z + scratchForward.z,
  );
  mirror.up.set(0, 1, 0).transformDirection(camera.matrixWorld);
  mirror.up.y = -mirror.up.y;
  mirror.lookAt(scratchTarget);
  mirror.near = camera.near;
  mirror.far = camera.far;
  mirror.updateMatrixWorld();
  mirror.projectionMatrix.copy(camera.projectionMatrix);
  mirror.projectionMatrixInverse.copy(camera.projectionMatrixInverse);

  // 貼圖座標用還沒換近平面的投影矩陣算：近平面只影響深度，不影響 x、y。
  textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  textureMatrix.multiply(mirror.projectionMatrix);
  textureMatrix.multiply(mirror.matrixWorldInverse);

  // 斜的近平面：把投影矩陣的第三列換成裁切平面（鏡像鏡頭的視角座標），遠平面盡量維持原樣。
  scratchPlane.set(UP, -clipHeightM).applyMatrix4(mirror.matrixWorldInverse);
  scratchClip.set(
    scratchPlane.normal.x,
    scratchPlane.normal.y,
    scratchPlane.normal.z,
    scratchPlane.constant,
  );
  const projection = mirror.projectionMatrix.elements;
  scratchCorner.set(
    (Math.sign(scratchClip.x) + (projection[8] ?? 0)) / (projection[0] ?? 1),
    (Math.sign(scratchClip.y) + (projection[9] ?? 0)) / (projection[5] ?? 1),
    -1,
    (1 + (projection[10] ?? 0)) / (projection[14] ?? 1),
  );
  scratchClip.multiplyScalar(2 / scratchClip.dot(scratchCorner));
  projection[2] = scratchClip.x;
  projection[6] = scratchClip.y;
  projection[10] = scratchClip.z + 1;
  projection[14] = scratchClip.w;
  return textureMatrix;
}

/** 倒影貼圖的大小：繪圖緩衝區 × 比例，至少 1 個像素。 */
export function reflectionTargetSize(
  bufferWidth: number,
  bufferHeight: number,
  resolutionScale: number,
): { readonly width: number; readonly height: number } {
  return {
    width: Math.max(Math.round(bufferWidth * resolutionScale), 1),
    height: Math.max(Math.round(bufferHeight * resolutionScale), 1),
  };
}

/** scene 裡標了 SKIP_GROUND_REFLECTION 的物件（建立場景後收集一次；之後才加進場景的不算）。 */
export function collectReflectionSkips(scene: Object3D): Object3D[] {
  const skipped: Object3D[] = [];
  scene.traverse((object) => {
    if (object.userData[SKIP_GROUND_REFLECTION] === true) {
      skipped.push(object);
    }
  });
  return skipped;
}

/**
 * 建立倒影：一張離屏緩衝區與一台鏡像鏡頭。地面材質建立之前就要有（材質要拿 uniforms）；
 * 場景建好之後再用 exclude 告訴它哪些物件不畫進倒影。
 */
export function createGroundReflection(
  renderer: WebGLRenderer,
  settings: GroundReflectionSettings,
): GroundReflection {
  // 半浮點才裝得下比 1 亮的天空與燈；顯示卡不能畫進浮點緩衝區就退回 8 位元（亮部會被夾住）。
  const type =
    renderer.extensions.has('EXT_color_buffer_float') ||
    renderer.extensions.has('EXT_color_buffer_half_float')
      ? HalfFloatType
      : UnsignedByteType;
  // mipmap：濕柏油上的倒影是糊的，取樣時直接拿比較小的那幾級。
  const target = new WebGLRenderTarget(1, 1, {
    type,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: true,
  });
  // 鏡像鏡頭的位置、方向與投影矩陣每次都由 placeMirrorCamera 直接填（投影矩陣不是由 fov／aspect 算的）。
  const mirror = new PerspectiveCamera();
  const uniforms: GroundReflectionUniforms = {
    texture: { value: target.texture },
    matrix: { value: new Matrix4() },
    strength: { value: 0 },
  };
  let skipped: readonly Object3D[] = [];
  const hidden: Object3D[] = [];
  const bufferSize = new Vector2();
  /** 倒影貼圖畫過了沒有。 */
  let drawn = false;
  /** 距離上一次重畫過了幾幀。 */
  let framesSinceDraw = 0;

  return {
    uniforms,
    render(activeRenderer, activeScene, camera) {
      camera.updateMatrixWorld();
      if (camera.position.y <= GROUND_REFLECTION_CONFIG.clipHeightM) {
        uniforms.strength.value = 0;
        return;
      }
      activeRenderer.getDrawingBufferSize(bufferSize);
      const size = reflectionTargetSize(bufferSize.x, bufferSize.y, settings.resolutionScale);
      const resized = target.width !== size.width || target.height !== size.height;
      if (resized) {
        target.setSize(size.width, size.height);
      }
      framesSinceDraw += 1;
      // 隔幀重畫：沒輪到的那一幀沿用上一張貼圖與它的投影矩陣（靜止的東西不會錯位）。
      if (drawn && !resized && framesSinceDraw < settings.updateEveryFrames) {
        return;
      }
      framesSinceDraw = 0;

      placeMirrorCamera(camera, mirror, GROUND_REFLECTION_CONFIG.clipHeightM, uniforms.matrix.value);

      for (const object of skipped) {
        if (object.visible) {
          object.visible = false;
          hidden.push(object);
        }
      }
      const previousTarget = activeRenderer.getRenderTarget();
      const shadowAutoUpdate = activeRenderer.shadowMap.autoUpdate;
      // 陰影貼圖沿用上一次主畫面畫好的；第一次還沒有，讓這一遍自己畫（主畫面隨後會再畫一次，只多這一幀）。
      activeRenderer.shadowMap.autoUpdate = shadowAutoUpdate && !drawn;
      activeRenderer.setRenderTarget(target);
      activeRenderer.render(activeScene, mirror);
      activeRenderer.setRenderTarget(previousTarget);
      activeRenderer.shadowMap.autoUpdate = shadowAutoUpdate;
      for (const object of hidden) {
        object.visible = true;
      }
      hidden.length = 0;

      drawn = true;
      uniforms.strength.value = 1;
    },
    exclude(objects) {
      skipped = [...objects];
    },
    drawWithout(draw) {
      const strength = uniforms.strength.value;
      uniforms.strength.value = 0;
      try {
        draw();
      } finally {
        uniforms.strength.value = strength;
      }
    },
    size: () => (drawn ? { width: target.width, height: target.height } : { width: 0, height: 0 }),
  };
}

/** 哪個場景有倒影：framePipeline 畫主畫面之前查這張表（場景被回收時跟著消失）。 */
const REFLECTIONS = new WeakMap<Scene, GroundReflection>();

/** 登記這個場景的倒影。 */
export function registerGroundReflection(scene: Scene, reflection: GroundReflection): void {
  REFLECTIONS.set(scene, reflection);
}

/** 這個場景的倒影；沒有（乾的天氣、畫質級別沒開、展示台）就是 undefined。 */
export function groundReflectionOf(scene: Scene): GroundReflection | undefined {
  return REFLECTIONS.get(scene);
}
