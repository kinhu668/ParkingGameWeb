// 庫材質：MeshStandardMaterial／MeshPhysicalMaterial 加上三面投影取樣（onBeforeCompile）。
// 建立材質不需要 WebGL：顏色、粗糙度、金屬度、清漆都是材質自己的數值，貼圖只是在上面調變；
// 還沒烘之前貼圖是 1×1 的中性值（surfaceLibrary.ts），所以單元測試與烘焙失敗時材質仍然合理。
//
// 三種取樣座標：
// - world（預設）：世界座標三面投影。建築與擺設是縮放過的方塊，一般的 UV 會被拉長；世界座標不會，
//   相鄰的方塊紋路也接得起來。InstancedMesh 照用（頂點著色器把實例矩陣乘進去），不必拆實例。
// - local：物件座標三面投影。會動的東西（車）用這個，紋路才會跟著車走。
// - radial：繞本地 X 軸的圓柱座標（輪胎）：胎面與胎壁各用貼圖的一半。
import {
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector4,
  type ColorRepresentation,
  type MeshStandardMaterialParameters,
} from 'three';
import {
  SURFACE_OVERLAY_MAP,
  SURFACE_WETNESS,
  surfaceLibraryDetail,
  surfaceMaps,
} from './surfaceLibrary';
import {
  NO_OVERLAYS,
  SCENERY_OVERLAYS,
  SURFACE_SPECS,
  type SurfaceId,
  type SurfaceOverlays,
} from './surfaces';

export type SurfaceSpace = 'world' | 'local' | 'radial';

export interface SurfaceMaterialOptions {
  /** 底色；不給 = 這種表面的預設色。用實例顏色或頂點顏色上色的給 0xffffff。 */
  readonly color?: ColorRepresentation;
  readonly roughness?: number;
  readonly metalness?: number;
  readonly clearcoat?: number;
  readonly clearcoatRoughness?: number;
  readonly space?: SurfaceSpace;
  /** 髒污疊加的強度（只有 world 有）。 */
  readonly overlays?: Partial<SurfaceOverlays>;
  /** 天氣的潮濕對它有多大作用（0–1）；不給：world = 1，其餘 = 0。 */
  readonly wetResponse?: number;
  /** 貼圖裡「不跟底色走的顏色」（灰縫、鏽、露出的柏油）的明暗倍率；不給 = 1。 */
  readonly overlayTint?: number;
  /** 貼圖鋪一次幾公尺；不給 = 這種表面的預設。 */
  readonly tileM?: number;
  /** 法線強度的倍率。 */
  readonly normalScale?: number;
  /** radial 用：[一圈重複幾次, 胎寬的一半, 輪圈半徑, 輪胎半徑]（公尺）。 */
  readonly radial?: readonly [number, number, number, number];
  /** 其餘照抄給 three 的參數（transparent、opacity、side、vertexColors、depthWrite、emissive…）。 */
  readonly parameters?: MeshStandardMaterialParameters;
}

/** 掛在 material.userData 上的記號：這個材質是哪一種表面（測試與除錯用）。 */
export const SURFACE_USER_DATA = 'surface';

const VERTEX_DECLARATIONS = /* glsl */ `
varying vec3 vSurfPos;
#ifndef SURF_WORLD
  varying vec3 vSurfNormal;
  varying mat3 vSurfBasis;
#endif
`;

const VERTEX_MAIN = /* glsl */ `
#ifdef SURF_WORLD
  vec4 surfWorld = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    surfWorld = instanceMatrix * surfWorld;
  #endif
  vSurfPos = ( modelMatrix * surfWorld ).xyz;
#else
  vSurfPos = transformed;
  vSurfNormal = normal;
  mat3 surfBasis = mat3( modelViewMatrix );
  #ifdef USE_INSTANCING
    surfBasis = surfBasis * mat3( instanceMatrix );
  #endif
  vSurfBasis = surfBasis;
#endif
`;

const FRAGMENT_DECLARATIONS = /* glsl */ `
varying vec3 vSurfPos;
#ifndef SURF_WORLD
  varying vec3 vSurfNormal;
  varying mat3 vSurfBasis;
#endif
uniform sampler2D uSurfColor;
uniform sampler2D uSurfOrm;
uniform sampler2D uSurfNormal;
uniform sampler2D uSurfOverlayMap;
// x = 1 ÷ 貼圖鋪一次的公尺數、y = 法線強度、z = 大尺度明暗、w = 潮濕的作用
uniform vec4 uSurfParams;
// 髒污、雨痕、油漬、舊輪胎痕
uniform vec4 uSurfOverlay;
uniform vec4 uSurfRadial;
uniform float uSurfWet;
// 蓋色（灰縫、鏽…）的明暗倍率：深色的舊磚牆灰縫也跟著暗
uniform float uSurfOverTint;
`;

// 接在 normal_fragment_maps 後面：這時 diffuseColor（含實例／頂點顏色）、roughnessFactor、metalnessFactor、
// normal（視角空間的幾何法線）都有了。
const FRAGMENT_MAIN = /* glsl */ `
float surfAo = 1.0;
{
  #ifdef SURF_WORLD
    vec3 sN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  #else
    vec3 sN = normalize( vSurfNormal );
  #endif
  vec3 sP = vSurfPos;
  vec3 sW = pow( abs( sN ), vec3( 6.0 ) );
  sW /= sW.x + sW.y + sW.z;
  vec3 sQ = sP * uSurfParams.x;
  vec3 sG = vec3( 0.0 );
  #if defined( SURF_RADIAL )
    // 輪胎：u 繞輪軸一圈、v 在胎面是橫向位置（貼圖下半）、在胎壁是半徑（貼圖上半）。
    // 角度在 ±180° 那一條線上會跳：改用轉半圈的另一個角度算導數，那條線上才不會取到最糊的那一層。
    float sAngA = atan( sP.z, sP.y ) / 6.2831853;
    float sAngB = atan( - sP.z, - sP.y ) / 6.2831853;
    bool sUseA = fwidth( sAngA ) <= fwidth( sAngB );
    vec2 sDu = uSurfRadial.x * ( sUseA ? vec2( dFdx( sAngA ), dFdy( sAngA ) ) : vec2( dFdx( sAngB ), dFdy( sAngB ) ) );
    float sRad = length( sP.yz );
    bool sTread = abs( sN.x ) < 0.6;
    float sV = sTread
      ? 0.5 * clamp( sP.x / ( 2.0 * uSurfRadial.y ) + 0.5, 0.03, 0.97 )
      : 0.5 + 0.5 * clamp( ( sRad - uSurfRadial.z ) / ( uSurfRadial.w - uSurfRadial.z ), 0.03, 0.97 );
    vec2 sUv = vec2( ( sAngA + 0.5 ) * uSurfRadial.x, sV );
    vec2 sDv = clamp( vec2( dFdx( sV ), dFdy( sV ) ), - 0.02, 0.02 );
    vec4 sC = textureGrad( uSurfColor, sUv, vec2( sDu.x, sDv.x ), vec2( sDu.y, sDv.y ) );
    vec4 sO = textureGrad( uSurfOrm, sUv, vec2( sDu.x, sDv.x ), vec2( sDu.y, sDv.y ) );
  #elif defined( SURF_BLEND )
    vec4 sC = texture2D( uSurfColor, sQ.zy ) * sW.x + texture2D( uSurfColor, sQ.xz ) * sW.y + texture2D( uSurfColor, sQ.xy ) * sW.z;
    vec4 sO = texture2D( uSurfOrm, sQ.zy ) * sW.x + texture2D( uSurfOrm, sQ.xz ) * sW.y + texture2D( uSurfOrm, sQ.xy ) * sW.z;
    #ifdef SURF_NORMALS
      vec2 sTx = texture2D( uSurfNormal, sQ.zy ).xy * 2.0 - 1.0;
      vec2 sTy = texture2D( uSurfNormal, sQ.xz ).xy * 2.0 - 1.0;
      vec2 sTz = texture2D( uSurfNormal, sQ.xy ).xy * 2.0 - 1.0;
      // 每個投影面的切線方向就是世界（或物件）座標軸：把三面的偏移各自放回去再混合，不需要切線、不怕鏡射。
      sG = sW.x * vec3( 0.0, sTx.y, sTx.x ) + sW.y * vec3( sTy.x, 0.0, sTy.y ) + sW.z * vec3( sTz.x, sTz.y, 0.0 );
    #endif
  #else
    // 只取樣最正對的那一面。
    bool sIsX = sW.x > max( sW.y, sW.z );
    bool sIsY = ! sIsX && sW.y > sW.z;
    vec2 sUv = sIsX ? sQ.zy : ( sIsY ? sQ.xz : sQ.xy );
    vec4 sC = texture2D( uSurfColor, sUv );
    vec4 sO = texture2D( uSurfOrm, sUv );
    #ifdef SURF_NORMALS
      vec2 sT = texture2D( uSurfNormal, sUv ).xy * 2.0 - 1.0;
      sG = sIsX ? vec3( 0.0, sT.y, sT.x ) : ( sIsY ? vec3( sT.x, 0.0, sT.y ) : vec3( sT.x, sT.y, 0.0 ) );
    #endif
  #endif

  vec3 sBase = mix( diffuseColor.rgb * ( sO.a * 2.0 ), sC.rgb * uSurfOverTint, sC.a );
  float sRough = roughnessFactor * sO.g * 2.0;
  float sMetal = metalnessFactor * sO.b;
  surfAo = sO.r;

  #ifdef SURF_OVERLAYS
    // 髒污疊加：只看最正對的那一面，用世界座標（公尺）。
    bool oIsX = sW.x > max( sW.y, sW.z );
    bool oIsY = ! oIsX && sW.y > sW.z;
    vec2 oUv = oIsX ? sP.zy : ( oIsY ? sP.xz : sP.xy );
    float oUp = ( oIsY && sN.y > 0.0 ) ? 1.0 : 0.0;
    float oMacro = texture2D( uSurfOverlayMap, oUv * 0.0437 + 0.37 ).r;
    vec4 oMask = texture2D( uSurfOverlayMap, oUv * 0.1667 );
    sBase *= 1.0 + uSurfParams.z * ( oMacro - 0.35 ) * 2.0;
    // 垂直面：牆腳 1.4 m 內的濺痕＋大片髒斑、由上往下的雨痕（潮濕時更明顯）。
    float oFoot = smoothstep( 1.4, 0.0, sP.y );
    float oDirt = uSurfOverlay.x * mix( clamp( oMask.r * 0.55 + oFoot * ( 0.35 + 0.65 * oMask.r ), 0.0, 1.0 ), oMask.r * 0.6, oUp );
    float oStreak = ( 1.0 - oUp ) * oMask.g * uSurfOverlay.y * ( 0.45 + 0.55 * uSurfWet );
    // 朝上的面：油漬（深色、比較亮）與舊輪胎痕（深色、霧面）。
    float oOil = oUp * oMask.b * uSurfOverlay.z;
    float oTire = oUp * oMask.a * uSurfOverlay.w;
    sBase = mix( sBase, sBase * vec3( 0.55, 0.52, 0.47 ), oDirt );
    sBase *= ( 1.0 - 0.45 * oStreak ) * ( 1.0 - 0.6 * oOil ) * ( 1.0 - 0.5 * oTire );
    sRough = mix( sRough, sRough * 0.55, oOil );
    sRough = mix( sRough, min( sRough * 1.2, 1.0 ), oDirt );
    sMetal *= 1.0 - 0.7 * oDirt;
    // 天氣的潮濕：朝上的面整片濕，垂直面順著雨痕濕。
    float oWet = uSurfWet * uSurfParams.w * mix( 0.3 + 0.7 * oMask.g, 1.0, oUp );
    sBase *= 1.0 - 0.3 * oWet * ( 1.0 - sMetal );
    sRough *= 1.0 - 0.55 * oWet;
  #endif

  diffuseColor.rgb = sBase * mix( 1.0, surfAo, 0.6 );
  roughnessFactor = clamp( sRough, 0.04, 1.0 );
  metalnessFactor = clamp( sMetal, 0.0, 1.0 );
  #ifdef SURF_NORMALS
    #ifdef SURF_WORLD
      normal = normalize( normal + uSurfParams.y * ( viewMatrix * vec4( sG, 0.0 ) ).xyz );
    #else
      normal = normalize( normal + uSurfParams.y * ( vSurfBasis * sG ) );
    #endif
  #endif
}
`;

const FRAGMENT_AO = /* glsl */ `
reflectedLight.indirectDiffuse *= surfAo;
reflectedLight.indirectSpecular *= mix( 1.0, surfAo, 0.7 );
`;

/**
 * 建立一個庫材質。
 * @param id 哪一種表面
 */
export function createSurfaceMaterial(
  id: SurfaceId,
  options: SurfaceMaterialOptions = {},
): MeshStandardMaterial {
  const spec = SURFACE_SPECS[id];
  const space = options.space ?? 'world';
  const clearcoat = options.clearcoat ?? spec.clearcoat;
  const base: MeshStandardMaterialParameters = {
    color: options.color ?? spec.color,
    roughness: options.roughness ?? spec.roughness,
    metalness: options.metalness ?? spec.metalness,
    ...options.parameters,
  };
  const material =
    clearcoat > 0
      ? new MeshPhysicalMaterial({
          ...base,
          clearcoat,
          clearcoatRoughness: options.clearcoatRoughness ?? spec.clearcoatRoughness,
        })
      : new MeshStandardMaterial(base);
  material.userData[SURFACE_USER_DATA] = id;

  const overlays = { ...NO_OVERLAYS, ...options.overlays };
  const hasOverlays =
    space === 'world' &&
    (spec.macro > 0 || overlays.dirt + overlays.streaks + overlays.oil + overlays.tireMarks > 0);
  const maps = surfaceMaps(id);
  const params = new Vector4(
    1 / (options.tileM ?? spec.tileM),
    spec.normalScale * (options.normalScale ?? 1),
    spec.macro,
    options.wetResponse ?? (space === 'world' ? 1 : 0),
  );
  const overlay = new Vector4(overlays.dirt, overlays.streaks, overlays.oil, overlays.tireMarks);
  const radial = new Vector4(...(options.radial ?? [1, 1, 0, 1]));
  // 法線：雙面的材質（玻璃）不做，背面的法線方向不值得多一條分支。
  const wantsNormals = spec.normalScale > 0 && space !== 'radial' && material.side !== DoubleSide;

  const variant = (): string => {
    const detail = surfaceLibraryDetail();
    return [
      space,
      detail.normals && wantsNormals ? 'n' : '',
      detail.triplanarBlend ? 'b' : '',
      hasOverlays ? 'o' : '',
    ].join(':');
  };

  material.onBeforeCompile = (shader) => {
    const detail = surfaceLibraryDetail();
    shader.uniforms.uSurfColor = maps.color;
    shader.uniforms.uSurfOrm = maps.orm;
    shader.uniforms.uSurfNormal = maps.normal;
    shader.uniforms.uSurfOverlayMap = SURFACE_OVERLAY_MAP;
    shader.uniforms.uSurfParams = { value: params };
    shader.uniforms.uSurfOverlay = { value: overlay };
    shader.uniforms.uSurfRadial = { value: radial };
    shader.uniforms.uSurfWet = SURFACE_WETNESS;
    shader.uniforms.uSurfOverTint = { value: options.overlayTint ?? 1 };
    const defines = [
      space === 'world' ? '#define SURF_WORLD' : '',
      space === 'radial' ? '#define SURF_RADIAL' : '',
      detail.normals && wantsNormals ? '#define SURF_NORMALS' : '',
      detail.triplanarBlend ? '#define SURF_BLEND' : '',
      hasOverlays ? '#define SURF_OVERLAYS' : '',
    ]
      .filter((line) => line !== '')
      .join('\n');
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', `${defines}\n${VERTEX_DECLARATIONS}\nvoid main() {`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${VERTEX_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${defines}\n${FRAGMENT_DECLARATIONS}\nvoid main() {`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAGMENT_MAIN}`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>\n${FRAGMENT_AO}`);
  };
  material.customProgramCacheKey = () => `surface:${variant()}`;
  return material;
}

/**
 * 不會動的場景物件（建築、擺設、障礙物）用的庫材質：世界座標三面投影，加上這種表面慣用的髒污。
 */
export function createScenerySurface(
  id: SurfaceId,
  options: Omit<SurfaceMaterialOptions, 'space'> = {},
): MeshStandardMaterial {
  return createSurfaceMaterial(id, {
    ...options,
    space: 'world',
    overlays: { ...SCENERY_OVERLAYS[id], ...options.overlays },
  });
}

/** 這個材質是庫裡的哪一種表面；不是庫材質回傳 undefined。 */
export function surfaceOf(material: { readonly userData: Record<string, unknown> }): SurfaceId | undefined {
  const id = material.userData[SURFACE_USER_DATA];
  return typeof id === 'string' ? (id as SurfaceId) : undefined;
}
