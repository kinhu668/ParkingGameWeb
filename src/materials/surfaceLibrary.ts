// 材質庫的貼圖：每種表面三張（顏色、ORM、法線）＋全庫共用的一張髒污疊加。
// 沒有 WebGL 時（單元測試、還沒烘之前）每張都是 1×1 的中性值：材質就是它的底色與基準粗糙度／金屬度。
// prepareSurfaceLibrary 用 GPU 烘一次（同一個算圖器、同一個尺寸只烘一次），烘好後把貼圖換進共用的 uniform：
// 已經建好的材質全都指著同一組 uniform 物件，不必逐一去改，也不必登記誰用了哪一種表面。
import {
  DataTexture,
  GLSL3,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RawShaderMaterial,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  UnsignedByteType,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { BAKE_VERTEX_SHADER, createBakeFragmentShader, OVERLAY_BAKE_INDEX } from './bakeShader';
import { SURFACE_IDS, surfaceIndex, type MaterialQualitySettings, type SurfaceId } from './surfaces';

/** 著色器 uniform 的值盒：材質們共用同一個物件，換掉 value 全部一起變。 */
export interface Shared<T> {
  value: T;
}

/** 一種表面的三張貼圖（共用的 uniform）。 */
export interface SurfaceMaps {
  readonly color: Shared<Texture>;
  readonly orm: Shared<Texture>;
  readonly normal: Shared<Texture>;
}

function pixel(r: number, g: number, b: number, a: number): DataTexture {
  const texture = new DataTexture(new Uint8Array([r, g, b, a]), 1, 1, RGBAFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** 中性的 1×1 貼圖：沒有蓋色、AO 1、粗糙度與明暗倍率 1（存成 0.5）、金屬度倍率 1、法線朝外。 */
const FALLBACK = {
  color: pixel(0, 0, 0, 0),
  orm: pixel(255, 128, 255, 128),
  normal: pixel(128, 128, 255, 128),
  overlay: pixel(0, 0, 0, 0),
} as const;

const MAPS = new Map<SurfaceId, SurfaceMaps>(
  SURFACE_IDS.map((id) => [
    id,
    { color: { value: FALLBACK.color }, orm: { value: FALLBACK.orm }, normal: { value: FALLBACK.normal } },
  ]),
);

/** 這種表面的貼圖 uniform（材質直接引用回傳的物件）。 */
export function surfaceMaps(id: SurfaceId): SurfaceMaps {
  const maps = MAPS.get(id);
  if (maps === undefined) {
    throw new Error(`材質庫沒有這種表面：${id}`);
  }
  return maps;
}

/** 髒污疊加貼圖（r 髒斑、g 雨痕、b 油漬、a 舊輪胎痕）。 */
export const SURFACE_OVERLAY_MAP: Shared<Texture> = { value: FALLBACK.overlay };

/** 天氣帶來的潮濕（0 乾、1 下雨）：建築、金屬、人行道跟著變深、變亮，雨痕更明顯。地面自己另有一套。 */
export const SURFACE_WETNESS: Shared<number> = { value: 0 };

export function setSurfaceWetness(wetness: number): void {
  SURFACE_WETNESS.value = Math.min(Math.max(wetness, 0), 1);
}

/** 目前材質著色器要編成哪一種（跟著最近一次 prepareSurfaceLibrary 的畫質）。 */
interface LibraryDetail {
  normals: boolean;
  triplanarBlend: boolean;
}
const DETAIL: LibraryDetail = { normals: false, triplanarBlend: false };

export function surfaceLibraryDetail(): Readonly<LibraryDetail> {
  return DETAIL;
}

interface BakedSet {
  readonly sizePx: number;
  readonly normals: boolean;
  readonly targets: readonly WebGLRenderTarget[];
}
const BAKED = new WeakMap<WebGLRenderer, BakedSet>();

function useBaked(set: BakedSet): void {
  SURFACE_IDS.forEach((id) => {
    const target = set.targets[surfaceIndex(id)];
    const maps = surfaceMaps(id);
    maps.color.value = target?.textures[0] ?? FALLBACK.color;
    maps.orm.value = target?.textures[1] ?? FALLBACK.orm;
    maps.normal.value = (set.normals ? target?.textures[2] : undefined) ?? FALLBACK.normal;
  });
  SURFACE_OVERLAY_MAP.value = set.targets[OVERLAY_BAKE_INDEX]?.textures[0] ?? FALLBACK.overlay;
}

/**
 * 烘出整個材質庫（每種表面一次、髒污疊加一次），並讓全部庫材質改用烘好的貼圖。
 * 同一個算圖器、同一個尺寸再呼叫只是把貼圖指回去，不重烘。固定種子：每次烘出來的像素都相同。
 */
export function prepareSurfaceLibrary(renderer: WebGLRenderer, settings: MaterialQualitySettings): void {
  DETAIL.normals = settings.normals;
  DETAIL.triplanarBlend = settings.triplanarBlend;
  const cached = BAKED.get(renderer);
  if (cached !== undefined && cached.sizePx === settings.textureSizePx && cached.normals === settings.normals) {
    useBaked(cached);
    return;
  }
  cached?.targets.forEach((target) => {
    target.dispose();
  });

  const sizePx = settings.textureSizePx;
  const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), settings.maxAnisotropy);
  const material = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: BAKE_VERTEX_SHADER,
    fragmentShader: createBakeFragmentShader(settings.normals),
    uniforms: { uSurface: { value: 0 }, uTexel: { value: 1 / sizePx } },
    depthTest: false,
    depthWrite: false,
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new Scene();
  scene.add(quad);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const previousTarget = renderer.getRenderTarget();
  const targets: WebGLRenderTarget[] = [];
  for (let index = 0; index <= OVERLAY_BAKE_INDEX; index += 1) {
    const target = new WebGLRenderTarget(sizePx, sizePx, {
      count: settings.normals ? 3 : 2,
      depthBuffer: false,
      generateMipmaps: true,
      minFilter: LinearMipmapLinearFilter,
      magFilter: LinearFilter,
      wrapS: RepeatWrapping,
      wrapT: RepeatWrapping,
      anisotropy,
    });
    material.uniforms.uSurface = { value: index };
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    targets.push(target);
  }
  renderer.setRenderTarget(previousTarget);
  quad.geometry.dispose();
  material.dispose();

  const set: BakedSet = { sizePx, normals: settings.normals, targets };
  BAKED.set(renderer, set);
  useBaked(set);
}

/**
 * 讀回一種表面烘好的顏色貼圖的檢查碼（展示台與 e2e 用：同一個種子烘兩次要相同）。沒烘過回傳 undefined。
 */
export function surfaceChecksum(renderer: WebGLRenderer): number | undefined {
  const set = BAKED.get(renderer);
  if (set === undefined) {
    return undefined;
  }
  const buffer = new Uint8Array(set.sizePx * set.sizePx * 4);
  let sum = 0;
  set.targets.forEach((target) => {
    for (let texture = 0; texture < target.textures.length; texture += 1) {
      renderer.readRenderTargetPixels(target, 0, 0, set.sizePx, set.sizePx, buffer, undefined, texture);
      for (let index = 0; index < buffer.length; index += 1) {
        sum = (Math.imul(sum, 31) + (buffer[index] ?? 0)) | 0;
      }
    }
  });
  return sum >>> 0;
}

/** 丟掉這個算圖器烘好的貼圖（測試「重烘結果相同」用）；材質退回中性貼圖。 */
export function disposeSurfaceLibrary(renderer: WebGLRenderer): void {
  const set = BAKED.get(renderer);
  if (set === undefined) {
    return;
  }
  set.targets.forEach((target) => {
    target.dispose();
  });
  BAKED.delete(renderer);
  SURFACE_IDS.forEach((id) => {
    const maps = surfaceMaps(id);
    maps.color.value = FALLBACK.color;
    maps.orm.value = FALLBACK.orm;
    maps.normal.value = FALLBACK.normal;
  });
  SURFACE_OVERLAY_MAP.value = FALLBACK.overlay;
}
