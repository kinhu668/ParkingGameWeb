// 材質庫的貼圖：每種表面三張（顏色、ORM、法線）＋全庫共用的一張髒污疊加。
// 沒有 WebGL 時（單元測試、還沒烘之前）每張都是 1×1 的中性值：材質就是它的底色與基準粗糙度／金屬度。
// prepareSurfaceLibrary 用 GPU 烘（同一個算圖器、同一個尺寸每種表面只烘一次；遊戲場景只烘這一關用到的），烘好後把貼圖換進共用的 uniform：
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

/** 目前材質著色器要編成哪一種（跟著最近一次 configureSurfaceLibrary／prepareSurfaceLibrary 的畫質）。 */
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
  /** 烘焙索引（表面在 SURFACE_IDS 裡的索引；OVERLAY_BAKE_INDEX = 髒污疊加）→ 烘好的那一張。沒烘的不在裡面。 */
  readonly targets: Map<number, WebGLRenderTarget>;
}
const BAKED = new WeakMap<WebGLRenderer, BakedSet>();

function useBaked(set: BakedSet): void {
  SURFACE_IDS.forEach((id) => {
    const target = set.targets.get(surfaceIndex(id));
    const maps = surfaceMaps(id);
    maps.color.value = target?.textures[0] ?? FALLBACK.color;
    maps.orm.value = target?.textures[1] ?? FALLBACK.orm;
    maps.normal.value = (set.normals ? target?.textures[2] : undefined) ?? FALLBACK.normal;
  });
  SURFACE_OVERLAY_MAP.value = set.targets.get(OVERLAY_BAKE_INDEX)?.textures[0] ?? FALLBACK.overlay;
}

/**
 * 還沒烘的烘焙索引：要的表面裡沒烘過的，加上髒污疊加（不論要哪些表面都要有）。純函式，方便測試。
 * @param surfaces 要用的表面
 * @param baked 已經烘好的烘焙索引
 */
export function missingBakeIndices(
  surfaces: Iterable<SurfaceId>,
  baked: { has(index: number): boolean },
): number[] {
  const wanted = new Set<number>([...surfaces].map(surfaceIndex));
  wanted.add(OVERLAY_BAKE_INDEX);
  return [...wanted].filter((index) => !baked.has(index)).sort((a, b) => a - b);
}

/**
 * 只設定材質著色器的細節（法線、三面混合），不烘任何東西。建立庫材質之前呼叫：
 * 遊戲場景要等東西都建好才知道用到哪些表面，那時再呼叫 prepareSurfaceLibrary 烘。
 * （不在這裡先烘髒污疊加：烘焙著色器很大，分兩次烘就要編譯兩次，軟體算圖下每次要一兩秒。）
 */
export function configureSurfaceLibrary(settings: MaterialQualitySettings): void {
  DETAIL.normals = settings.normals;
  DETAIL.triplanarBlend = settings.triplanarBlend;
}

/**
 * 準備材質庫：設定材質著色器的細節，烘出 surfaces 裡還沒烘過的表面與髒污疊加，
 * 並讓全部庫材質改用烘好的貼圖（沒烘的表面維持 1×1 的中性貼圖）。
 * 同一個算圖器、同一個尺寸已經烘過的不重烘；再呼叫只補還缺的。固定種子：每次烘出來的像素都相同。
 * @param surfaces 要烘哪些表面；不給 = 全部（展示台）。遊戲場景給「這一關實際用到的」：
 *   每種表面烘一次要畫滿二到三張貼圖，軟體算圖下不用的也烘會讓載入變慢。
 */
export function prepareSurfaceLibrary(
  renderer: WebGLRenderer,
  settings: MaterialQualitySettings,
  surfaces: Iterable<SurfaceId> = SURFACE_IDS,
): void {
  configureSurfaceLibrary(settings);
  let set = BAKED.get(renderer);
  if (set === undefined || set.sizePx !== settings.textureSizePx || set.normals !== settings.normals) {
    set?.targets.forEach((target) => {
      target.dispose();
    });
    set = { sizePx: settings.textureSizePx, normals: settings.normals, targets: new Map() };
    BAKED.set(renderer, set);
  }
  const missing = missingBakeIndices(surfaces, set.targets);
  if (missing.length === 0) {
    useBaked(set);
    return;
  }

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
  for (const index of missing) {
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
    set.targets.set(index, target);
  }
  renderer.setRenderTarget(previousTarget);
  quad.geometry.dispose();
  material.dispose();
  useBaked(set);
}

/** 這個算圖器已經烘好的表面（依 SURFACE_IDS 的順序；除錯與 e2e 用）。沒烘過是空的。 */
export function bakedSurfaces(renderer: WebGLRenderer): SurfaceId[] {
  const set = BAKED.get(renderer);
  return set === undefined ? [] : SURFACE_IDS.filter((id) => set.targets.has(surfaceIndex(id)));
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
  // 依烘焙索引的順序讀（不是烘的先後）：分幾次烘出來的檢查碼也一樣。
  const ordered = [...set.targets.entries()].sort(([a], [b]) => a - b).map(([, target]) => target);
  ordered.forEach((target) => {
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
