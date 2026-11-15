// 濕地／積水的倒影（平面反射）：鏡像鏡頭的幾何、貼圖座標的矩陣、斜的近平面、倒影貼圖的大小、不畫進倒影的物件、場景的登記。
// 不開 WebGL：只測矩陣與物件。
import { Group, Matrix4, Mesh, PerspectiveCamera, Scene, Texture, Vector3, Vector4 } from 'three';
import { describe, expect, test } from 'vitest';
import {
  collectReflectionSkips,
  groundReflectionOf,
  placeMirrorCamera,
  reflectionTargetSize,
  registerGroundReflection,
  type GroundReflection,
} from '../src/render/groundReflection';
import { SKIP_GROUND_REFLECTION } from '../src/render/groundReflectionFlag';
import { GROUND_REFLECTION_CONFIG } from '../src/render/renderConfig';

const CLIP_M = GROUND_REFLECTION_CONFIG.clipHeightM;

/** 跟車鏡頭那樣的擺位：在後上方往前下方看。 */
function chaseCamera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(50, 16 / 9, 0.3, 400);
  camera.position.set(3, 6, 11);
  camera.lookAt(1, 0.5, -2);
  camera.updateMatrixWorld();
  return camera;
}

/** 擺好的鏡像鏡頭與貼圖座標矩陣。 */
function mirrored(camera: PerspectiveCamera): { mirror: PerspectiveCamera; matrix: Matrix4 } {
  const mirror = new PerspectiveCamera();
  const matrix = placeMirrorCamera(camera, mirror, CLIP_M, new Matrix4());
  return { mirror, matrix };
}

/** 世界座標的點 → 貼圖座標（除以 w 之後）。 */
function textureUv(matrix: Matrix4, point: Vector3): { u: number; v: number } {
  const coord = new Vector4(point.x, point.y, point.z, 1).applyMatrix4(matrix);
  return { u: coord.x / coord.w, v: coord.y / coord.w };
}

/** 鏡頭看到 point 的畫面位置（0–1，左下是原點）；用鏡頭原本的（沒換近平面的）投影。 */
function screenUv(camera: PerspectiveCamera, point: Vector3): { u: number; v: number } {
  const ndc = point.clone().project(camera);
  return { u: (ndc.x + 1) / 2, v: (ndc.y + 1) / 2 };
}

describe('鏡像鏡頭 placeMirrorCamera', () => {
  test('位置與看的方向都對地面鏡像', () => {
    const camera = chaseCamera();
    const { mirror } = mirrored(camera);
    expect(mirror.position.x).toBeCloseTo(camera.position.x, 9);
    expect(mirror.position.y).toBeCloseTo(-camera.position.y, 9);
    expect(mirror.position.z).toBeCloseTo(camera.position.z, 9);
    const forward = new Vector3(0, 0, -1).transformDirection(camera.matrixWorld);
    const mirrorForward = new Vector3(0, 0, -1).transformDirection(mirror.matrixWorld);
    expect(mirrorForward.x).toBeCloseTo(forward.x, 9);
    expect(mirrorForward.y).toBeCloseTo(-forward.y, 9);
    expect(mirrorForward.z).toBeCloseTo(forward.z, 9);
  });

  test('倒影接在東西的腳下：地面上某一點取到的貼圖位置，就是鏡像鏡頭看到「從那一點反射出去會碰到的東西」的位置', () => {
    const camera = chaseCamera();
    const { matrix } = mirrored(camera);
    // 路燈的燈頭、車頂、遠處的招牌：都在地面以上。
    for (const object of [new Vector3(2, 6, -9), new Vector3(0.5, 1.4, 1), new Vector3(-14, 9, -40)]) {
      // 主鏡頭看「東西的鏡像」的那條視線穿過地面的點：倒影就出現在那裡。
      const image = new Vector3(object.x, -object.y, object.z);
      const t = camera.position.y / (camera.position.y - image.y);
      const onGround = camera.position.clone().lerp(image, t);
      expect(onGround.y).toBeCloseTo(0, 9);
      // 那一點的貼圖座標 = 東西本身投影到倒影貼圖的位置（貼圖是用同一個矩陣畫的）。
      const atGround = textureUv(matrix, onGround);
      const atObject = textureUv(matrix, object);
      expect(atGround.u).toBeCloseTo(atObject.u, 6);
      expect(atGround.v).toBeCloseTo(atObject.v, 6);
      // 貼圖座標落在畫面裡，而且只是主畫面左右對調（鏡像鏡頭是真的鏡頭，不是負的縮放）。
      const onScreen = screenUv(camera, onGround);
      expect(atGround.u).toBeCloseTo(1 - onScreen.u, 6);
      expect(atGround.v).toBeCloseTo(onScreen.v, 6);
    }
  });

  test('斜的近平面：比 clipHeightM 高的東西畫得到，地面以下與貼地的東西被裁掉', () => {
    const camera = chaseCamera();
    const { mirror } = mirrored(camera);
    /** 在鏡像鏡頭的裁切空間裡，z 有沒有在近平面之內（z ≥ −w）。 */
    const insideNear = (point: Vector3): boolean => {
      const clip = new Vector4(point.x, point.y, point.z, 1)
        .applyMatrix4(mirror.matrixWorldInverse)
        .applyMatrix4(mirror.projectionMatrix);
      return clip.z >= -clip.w;
    };
    for (const [x, z] of [
      [1, -2],
      [-6, -20],
      [8, 4],
    ] as const) {
      expect(insideNear(new Vector3(x, CLIP_M + 0.05, z)), `(${x}, ${z}) 上方`).toBe(true);
      expect(insideNear(new Vector3(x, 3, z)), `(${x}, ${z}) 高處`).toBe(true);
      expect(insideNear(new Vector3(x, 0, z)), `(${x}, ${z}) 貼地`).toBe(false);
      expect(insideNear(new Vector3(x, -0.5, z)), `(${x}, ${z}) 地面以下`).toBe(false);
    }
  });

  test('正上方往下看的鏡頭（?cam=top）也擺得出來', () => {
    const camera = new PerspectiveCamera(40, 1.6, 0.5, 300);
    camera.up.set(0, 0, -1);
    camera.position.set(4, 30, -6);
    camera.lookAt(4, 0, -6);
    camera.updateMatrixWorld();
    const { mirror, matrix } = mirrored(camera);
    expect(mirror.position.y).toBeCloseTo(-30, 9);
    for (const value of [...mirror.matrixWorld.elements, ...matrix.elements]) {
      expect(Number.isFinite(value)).toBe(true);
    }
    // 鏡頭正下方的地面在貼圖正中央。
    const center = textureUv(matrix, new Vector3(4, 0, -6));
    expect(center.u).toBeCloseTo(0.5, 6);
    expect(center.v).toBeCloseTo(0.5, 6);
  });
});

describe('倒影貼圖的大小 reflectionTargetSize', () => {
  test('繪圖緩衝區 × 比例，四捨五入，至少 1 個像素', () => {
    expect(reflectionTargetSize(1280, 720, 0.5)).toEqual({ width: 640, height: 360 });
    expect(reflectionTargetSize(1280, 720, 0.35)).toEqual({ width: 448, height: 252 });
    expect(reflectionTargetSize(1, 1, 0.35)).toEqual({ width: 1, height: 1 });
    expect(reflectionTargetSize(0, 0, 0.5)).toEqual({ width: 1, height: 1 });
  });
});

describe('不畫進倒影的物件 collectReflectionSkips', () => {
  test('只收集標了 SKIP_GROUND_REFLECTION 的（含巢狀的），沒標的不動', () => {
    const scene = new Scene();
    const decal = new Mesh();
    decal.userData[SKIP_GROUND_REFLECTION] = true;
    const effects = new Group();
    effects.userData[SKIP_GROUND_REFLECTION] = true;
    const building = new Mesh();
    const nested = new Mesh();
    nested.userData[SKIP_GROUND_REFLECTION] = true;
    const holder = new Group();
    holder.add(nested);
    scene.add(decal, effects, building, holder);
    expect(collectReflectionSkips(scene)).toEqual([decal, effects, nested]);
  });
});

describe('場景的登記', () => {
  test('登記過的場景查得到自己的倒影；沒登記的是 undefined', () => {
    const scene = new Scene();
    const reflection: GroundReflection = {
      uniforms: {
        texture: { value: new Texture() },
        matrix: { value: new Matrix4() },
        strength: { value: 0 },
      },
      render: () => undefined,
      exclude: () => undefined,
      drawWithout: (draw) => {
        draw();
      },
      size: () => ({ width: 0, height: 0 }),
    };
    expect(groundReflectionOf(scene)).toBeUndefined();
    registerGroundReflection(scene, reflection);
    expect(groundReflectionOf(scene)).toBe(reflection);
    expect(groundReflectionOf(new Scene())).toBeUndefined();
  });
});
