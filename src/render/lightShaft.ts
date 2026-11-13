// 光柱：路燈與車頭燈在有水氣的空氣裡打出來的那一道光（體積光的便宜近似）。
// 幾何是一個開口的圓錐台（頂端在光源、沿本地 −Y 張開），只畫朝外的那一面、加色混合、不寫深度。
// 亮度不是整面均勻：片段著色器算「視線穿過圓錐多長」（射線與圓錐求交，解析式），再乘上沿光軸的衰減，
// 所以邊緣自然淡掉（弦長趨近 0）、正中間最亮、順著光軸看過去更亮——看起來是一團有厚度的光，不是一片貼紙。
// 不需要深度貼圖，也不是全螢幕的 ray march：只有光柱蓋到的像素才算，低畫質也用同一套（段數少、沒有噪聲）。
//
// 霧氣的流動：一層很慢的三維噪聲調整亮度（光柱裡看得出水氣不均勻）。時間來自共用的 uniform；
// `?fx=off` 與定格截圖不走時間，畫面是靜止的。噪聲只由世界座標與時間決定，不閃爍、可重現。
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  CylinderGeometry,
  FrontSide,
  ShaderMaterial,
  Vector3,
  type BufferGeometry,
} from 'three';
import type { LightShaftQualitySettings } from './quality';
import { FOG_CONFIG, LIGHT_SHAFT_CONFIG as CONFIG } from './renderConfig';

/** 一道光柱的形狀與亮度分布（公尺）。本地座標：光源端在原點，光軸沿 −Y。 */
export interface ShaftShape {
  /** 光源端與遠端的半徑。 */
  readonly nearRadiusM: number;
  readonly farRadiusM: number;
  readonly lengthM: number;
  /** 從光源端往外這個比例（0–1）之內亮度由 0 升到最亮（燈殼正前方不是一團死白）。 */
  readonly riseFraction: number;
  /** 往遠端淡到 0 的冪次；越大遠端越快變暗。 */
  readonly falloffExponent: number;
  /** 光束越張越開、越稀：亮度乘上（光源端半徑 ÷ 這一處的半徑）的這個冪次。0 = 不變稀。 */
  readonly spreadExponent: number;
}

/** 光柱所在的空氣：亮度倍率、遠處被霧吃掉的範圍、霧氣流動的時間。 */
export interface ShaftAir {
  /** 這道光在這種天氣的亮度倍率（WeatherPreset.air 的 lampShaft／headlightShaft）。 */
  readonly strength: number;
  /** 線性遠霧的起點與終點（公尺）：光柱在霧裡跟著淡掉。 */
  readonly fogNearM: number;
  readonly fogFarM: number;
  /** 霧氣流動的累積時間（秒）。同一個場景的光柱共用同一個物件；不走時間就是靜止的。 */
  readonly time: { value: number };
}

/** 建立光柱要的兩樣東西：所在的空氣與這個畫質級別的做法。 */
export interface ShaftSetup {
  readonly air: ShaftAir;
  readonly quality: LightShaftQualitySettings;
}

/**
 * 沒有指定時用的：黃昏那種乾淨的空氣（亮度倍率 1、遠霧是黃昏的）、中等的段數、沒有噪聲、時間不走。
 * 展示台與只測擺設的單元測試用這個。
 */
export const DEFAULT_SHAFT_SETUP: ShaftSetup = {
  air: { strength: 1, fogNearM: FOG_CONFIG.nearM, fogFarM: FOG_CONFIG.farM, time: { value: 0 } },
  quality: { radialSegments: 24, headlightBeams: 2, noiseOctaves: 0 },
};

/** 沿光軸的亮度（0–1）：along 是離光源端的比例（0 = 光源端、1 = 遠端）。與著色器裡的式子相同。 */
export function shaftAxialBrightness(shape: ShaftShape, along: number): number {
  const t = Math.min(Math.max(along, 0), 1);
  const rise = shape.riseFraction <= 0 ? 1 : Math.min(t / shape.riseFraction, 1);
  const radius = shape.nearRadiusM + (shape.farRadiusM - shape.nearRadiusM) * t;
  const spread = (shape.nearRadiusM / radius) ** shape.spreadExponent;
  return rise * rise * (3 - 2 * rise) * (1 - t) ** shape.falloffExponent * spread;
}

/**
 * 視線穿過圓錐台的長度（公尺）。與著色器裡的式子相同（單元測試用它檢查式子）。
 * @param origin 視線的起點（光柱的本地座標）
 * @param direction 視線方向（單位向量）
 * @param entryM 視線從起點走多遠碰到圓錐朝外的那一面（就是正在畫的那個片段）
 */
export function shaftChordM(
  shape: Pick<ShaftShape, 'nearRadiusM' | 'farRadiusM' | 'lengthM'>,
  origin: { readonly x: number; readonly y: number; readonly z: number },
  direction: { readonly x: number; readonly y: number; readonly z: number },
  entryM: number,
): number {
  const slope = (shape.farRadiusM - shape.nearRadiusM) / shape.lengthM;
  // 這條視線上的半徑：rho(t) = rho0 − slope × dy × t。
  const rho0 = shape.nearRadiusM - slope * origin.y;
  const a = direction.x * direction.x + direction.z * direction.z - slope * slope * direction.y * direction.y;
  const halfB = origin.x * direction.x + origin.z * direction.z + rho0 * slope * direction.y;
  const c = origin.x * origin.x + origin.z * origin.z - rho0 * rho0;
  // 離開兩端平面（y = 0 與 y = −length）之間那一段的時間。
  let slabExit = Number.POSITIVE_INFINITY;
  if (Math.abs(direction.y) > CONFIG.parallelEpsilon) {
    slabExit = Math.max(-origin.y / direction.y, (-shape.lengthM - origin.y) / direction.y);
  }
  let exit = slabExit;
  if (a > CONFIG.parallelEpsilon) {
    // 視線比圓錐的斜面平：從另一側的斜面出去（或先碰到端面）。
    const root = (-halfB + Math.sqrt(Math.max(halfB * halfB - a * c, 0))) / a;
    exit = Math.min(root, slabExit);
  }
  if (!Number.isFinite(exit)) {
    return 0;
  }
  return Math.max(exit - entryM, 0);
}

/**
 * 光柱的幾何：開口的圓錐台，光源端在原點、沿 −Y 伸出去 lengthM。
 * @param radialSegments 一圈的段數（畫質越低越少）
 */
export function createShaftGeometry(shape: ShaftShape, radialSegments: number): BufferGeometry {
  const geometry = new CylinderGeometry(
    shape.nearRadiusM,
    shape.farRadiusM,
    shape.lengthM,
    radialSegments,
    CONFIG.heightSegments,
    true,
  ).translate(0, -shape.lengthM / 2, 0);
  // 沿光軸的比例存在頂點上（0 = 光源端），著色器不必再除一次。
  const position = geometry.getAttribute('position');
  const along = new Float32Array(position.count);
  for (let index = 0; index < position.count; index += 1) {
    along[index] = Math.min(Math.max(-position.getY(index) / shape.lengthM, 0), 1);
  }
  geometry.setAttribute('shaftAlong', new BufferAttribute(along, 1));
  return geometry;
}

const SHAFT_VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocalPosition;
  varying vec3 vLocalCamera;
  varying vec3 vWorldPosition;
  varying float vViewDepth;

  void main() {
    // 光柱的網格只有旋轉與平移（沒有縮放）：鏡頭換到本地座標只要轉置。
    mat4 toWorld = modelMatrix;
    #ifdef USE_INSTANCING
      toWorld = modelMatrix * instanceMatrix;
    #endif
    vec4 world = toWorld * vec4( position, 1.0 );
    vLocalPosition = position;
    vLocalCamera = transpose( mat3( toWorld ) ) * ( cameraPosition - toWorld[ 3 ].xyz );
    vWorldPosition = world.xyz;
    vec4 view = viewMatrix * world;
    vViewDepth = - view.z;
    gl_Position = projectionMatrix * view;
  }
`;

const SHAFT_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 shaftColor;
  uniform float nearRadius;
  uniform float farRadius;
  uniform float shaftLength;
  uniform float riseFraction;
  uniform float falloffExponent;
  uniform float spreadExponent;
  uniform float edgeExponent;
  uniform float maxThickness;
  uniform float cameraFadeNear;
  uniform float cameraFadeFar;
  uniform float fogNear;
  uniform float fogFar;
  uniform float fogFade;
  uniform float noiseAmount;
  uniform float noiseScale;
  uniform vec3 noiseDrift;
  uniform float shaftTime;

  varying vec3 vLocalPosition;
  varying vec3 vLocalCamera;
  varying vec3 vWorldPosition;
  varying float vViewDepth;

  #if SHAFT_NOISE_OCTAVES > 0
    // 整數雜湊（不用 sin）：同一個格點在每一台機器上都是同一個值。
    float latticeHash( ivec3 cell ) {
      uint h = uint( cell.x ) * 0x8da6b343u + uint( cell.y ) * 0xd8163841u + uint( cell.z ) * 0xcb1ab31fu;
      h ^= h >> 15u;
      h *= 0x2c1b3c6du;
      h ^= h >> 12u;
      h *= 0x297a2d39u;
      h ^= h >> 15u;
      return float( h & 0xffffu ) / 65535.0;
    }

    float valueNoise( vec3 point ) {
      vec3 cell = floor( point );
      vec3 f = point - cell;
      f = f * f * ( 3.0 - 2.0 * f );
      ivec3 i = ivec3( cell );
      float x00 = mix( latticeHash( i ), latticeHash( i + ivec3( 1, 0, 0 ) ), f.x );
      float x10 = mix( latticeHash( i + ivec3( 0, 1, 0 ) ), latticeHash( i + ivec3( 1, 1, 0 ) ), f.x );
      float x01 = mix( latticeHash( i + ivec3( 0, 0, 1 ) ), latticeHash( i + ivec3( 1, 0, 1 ) ), f.x );
      float x11 = mix( latticeHash( i + ivec3( 0, 1, 1 ) ), latticeHash( i + ivec3( 1, 1, 1 ) ), f.x );
      return mix( mix( x00, x10, f.y ), mix( x01, x11, f.y ), f.z );
    }
  #endif

  void main() {
    // 視線（本地座標）：從鏡頭穿過這個片段，一路走到從圓錐的另一側（或端面）出去。
    vec3 toFragment = vLocalPosition - vLocalCamera;
    float entry = length( toFragment );
    vec3 direction = toFragment / max( entry, 1e-5 );
    float slope = ( farRadius - nearRadius ) / shaftLength;
    float rho0 = nearRadius - slope * vLocalCamera.y;
    float a = dot( direction.xz, direction.xz ) - slope * slope * direction.y * direction.y;
    float halfB = dot( vLocalCamera.xz, direction.xz ) + rho0 * slope * direction.y;
    float c = dot( vLocalCamera.xz, vLocalCamera.xz ) - rho0 * rho0;
    float slabExit = 1e9;
    if ( abs( direction.y ) > PARALLEL_EPSILON ) {
      slabExit = max( - vLocalCamera.y / direction.y, ( - shaftLength - vLocalCamera.y ) / direction.y );
    }
    float exit = slabExit;
    if ( a > PARALLEL_EPSILON ) {
      exit = min( ( - halfB + sqrt( max( halfB * halfB - a * c, 0.0 ) ) ) / a, slabExit );
    }
    float chord = clamp( exit - entry, 0.0, 4.0 * shaftLength );

    // 取弦的中點算「這一段光有多濃」：沿光軸的升起與衰減、越張越稀。
    vec3 middle = vLocalCamera + direction * ( entry + 0.5 * chord );
    float along = clamp( - middle.y / shaftLength, 0.0, 1.0 );
    float radius = nearRadius + ( farRadius - nearRadius ) * along;
    float rise = riseFraction <= 0.0 ? 1.0 : smoothstep( 0.0, riseFraction, along );
    float axial = rise * pow( 1.0 - along, falloffExponent ) * pow( nearRadius / radius, spreadExponent );
    // 弦長以這一處的直徑為 1：正中間橫著看是 1，邊緣趨近 0，順著光軸看比 1 大（有上限，不洗白）。
    // 冪次把邊緣收柔（照實的弦長在輪廓邊上升得很急，看起來像硬邊）。
    float thickness = min( pow( chord / ( 2.0 * radius ), edgeExponent ), maxThickness );

    float brightness = axial * thickness;
    // 鏡頭快要穿進光柱時，貼近鏡頭的那一片先淡掉：穿進去的瞬間不會整片跳掉。
    brightness *= smoothstep( cameraFadeNear, cameraFadeFar, entry );
    // 遠處的光柱被霧吃掉。
    brightness *= 1.0 - fogFade * smoothstep( fogNear, fogFar, vViewDepth );

    #if SHAFT_NOISE_OCTAVES > 0
      vec3 noisePoint = vWorldPosition * noiseScale + noiseDrift * shaftTime;
      float wisps = valueNoise( noisePoint );
      #if SHAFT_NOISE_OCTAVES > 1
        wisps = ( wisps + 0.5 * valueNoise( noisePoint * 2.17 + 7.3 ) ) / 1.5;
      #endif
      brightness *= 1.0 + noiseAmount * ( wisps - 0.5 ) * 2.0;
    #endif

    gl_FragColor = vec4( shaftColor * brightness, 1.0 );
    // 輸出色域：直接畫到畫面上（low、medium）時 three 在這裡轉成 sRGB，與其他加色的光（地上的光暈、光斑）同一套；
    // 畫進後製鏈的緩衝區時不轉，維持線性。不做色調映射（toneMapped = false）。
    #include <colorspace_fragment>
  }
`;

/**
 * 光柱的材質。
 * @param color 光的顏色（sRGB 十六進位）
 * @param brightness 最亮處加到畫面上的量（已經依「走不走後製鏈」選好的那一個）
 */
export function createShaftMaterial(
  shape: ShaftShape,
  color: number,
  brightness: number,
  air: ShaftAir,
  quality: Pick<LightShaftQualitySettings, 'noiseOctaves'>,
): ShaderMaterial {
  return new ShaderMaterial({
    name: 'LightShaftShader',
    defines: {
      SHAFT_NOISE_OCTAVES: quality.noiseOctaves,
      PARALLEL_EPSILON: CONFIG.parallelEpsilon.toExponential(),
    },
    uniforms: {
      shaftColor: { value: new Color(color).multiplyScalar(brightness * air.strength) },
      nearRadius: { value: shape.nearRadiusM },
      farRadius: { value: shape.farRadiusM },
      shaftLength: { value: shape.lengthM },
      riseFraction: { value: shape.riseFraction },
      falloffExponent: { value: shape.falloffExponent },
      spreadExponent: { value: shape.spreadExponent },
      edgeExponent: { value: CONFIG.edgeExponent },
      maxThickness: { value: CONFIG.maxThickness },
      cameraFadeNear: { value: CONFIG.cameraFadeNearM },
      cameraFadeFar: { value: CONFIG.cameraFadeFarM },
      fogNear: { value: air.fogNearM },
      fogFar: { value: air.fogFarM },
      fogFade: { value: CONFIG.fogFade },
      noiseAmount: { value: CONFIG.noiseAmount },
      noiseScale: { value: 1 / CONFIG.noiseCellM },
      noiseDrift: {
        value: new Vector3(
          CONFIG.noiseDriftMps.x / CONFIG.noiseCellM,
          CONFIG.noiseDriftMps.y / CONFIG.noiseCellM,
          CONFIG.noiseDriftMps.z / CONFIG.noiseCellM,
        ),
      },
      // 同一個物件：場景每幀只改一次，所有光柱一起動。
      shaftTime: air.time,
    },
    vertexShader: SHAFT_VERTEX_SHADER,
    fragmentShader: SHAFT_FRAGMENT_SHADER,
    side: FrontSide,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    // 加色混合的光不做色調映射：直接畫到畫面上時，色調映射會把「沒有光」的邊緣也抬成一圈看得見的顏色。
    toneMapped: false,
    fog: false,
  });
}

/** 光柱最亮處加到畫面上的量（線性；材質的 shaftColor 裡最大的分量）。測試與除錯用。 */
export function shaftPeakBrightness(material: ShaderMaterial): number {
  const color: unknown = material.uniforms['shaftColor']?.value;
  return color instanceof Color ? Math.max(color.r, color.g, color.b) : 0;
}
