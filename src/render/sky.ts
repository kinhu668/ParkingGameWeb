// 黃昏的天空與環境光：three 的程序化 Sky 烘成立方體貼圖，再用 PMREM 生成環境貼圖。
// 只在建立場景時烘一次；之後每幀畫天空只是查一張貼圖，CPU 軟體算圖也負擔得起。
import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  Color,
  CubeCamera,
  HalfFloatType,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  WebGLCubeRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { forward } from '../core/heading';
import { degToRad } from '../core/units';
import { SKIP_AMBIENT_OCCLUSION } from './ambientOcclusionFlag';
import type { QualitySettings } from './quality';
import { FOG_CONFIG, SKY_CONFIG, SUN_CONFIG } from './renderConfig';
import type { FogPreset, SkyPreset } from './weatherPresets';

/** 單位向量（世界座標）。 */
export interface Direction3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * 由方位（heading 約定：0 = 北 −Z，順時針為正）與仰角算出「從地面指向太陽」的單位向量。
 * 天空的太陽位置與 DirectionalLight 的方向都用這一個，兩者才會一致。
 */
export function directionToSun(azimuthRad: number, elevationRad: number): Direction3 {
  const ground = forward(azimuthRad);
  const horizontal = Math.cos(elevationRad);
  return { x: ground.x * horizontal, y: Math.sin(elevationRad), z: ground.z * horizontal };
}

/** 遊戲場景的太陽方向（SUN_CONFIG 的方位與仰角）。 */
export const SUN_DIRECTION: Direction3 = directionToSun(
  degToRad(SUN_CONFIG.azimuthDeg),
  degToRad(SUN_CONFIG.elevationDeg),
);

/**
 * 地平線的霾在某個仰角的不透明度：地平線以下全不透明，往上以平方曲線淡到 hazeTopDeg 歸零。
 * 地平線那一圈因此剛好是霧的顏色，遠處的地面（被霧染成同色）與天空接得起來。
 * @param overcast 陰天雲層的不透明度（SkyPreset.overcast）；不給 = 0
 */
export function hazeOpacityAt(elevationDeg: number, overcast = 0): number {
  if (elevationDeg <= 0) {
    return 1;
  }
  const remaining = Math.max(1 - elevationDeg / FOG_CONFIG.hazeTopDeg, 0);
  // 陰天：整片天空至少蓋上這麼厚的霧色（雲層）；0 = 只有地平線的霾。
  return Math.max(remaining * remaining, overcast);
}

/** 地平線以下，霾色往地面反彈色過渡的比例（0 = 霾色，1 = 地面色）。 */
export function groundBlendAt(elevationDeg: number): number {
  return Math.min(Math.max(-elevationDeg / FOG_CONFIG.groundFadeDeg, 0), 1);
}

export interface SkyEnvironment {
  /**
   * 天空穹頂（含太陽圓盤與地平線的霾）：永遠以鏡頭為中心、畫在最遠處。加進場景就是背景。
   * 不用 scene.background 是因為那會在所有東西之前把整個畫面塗一遍；穹頂排在不透明物件之後畫，
   * 被地面與車擋住的像素不必算，俯視時幾乎不花成本。
   */
  readonly dome: Mesh;
  /** 環境貼圖（PMREM）：給標準材質的反射與補光用。 */
  readonly environment: Texture;
}

const SPHERE_WIDTH_SEGMENTS = 48;
/** 每一緯度圈 1°，霾的漸層才平滑（頂點之間是線性內插）。 */
const SPHERE_HEIGHT_SEGMENTS = 180;
/** 烘天空用的立方體鏡頭的近、遠平面。Sky 的頂點著色器把深度釘在遠平面，霾的球半徑是 1。 */
const BAKE_NEAR = 0.1;
const BAKE_FAR = 10;
/** Sky 方塊的邊長；只要比霾的球大就好（方向由世界座標算，與大小無關）。 */
const SKY_BOX_SCALE = 8;
const COLOR_ITEM_SIZE = 4;

/** 包在鏡頭外面的一顆球：地平線以上是往上漸淡的霾，以下是不透明的地面反彈色。 */
function createHazeDome(material: MeshBasicMaterial, sky: SkyPreset, fog: FogPreset): Mesh {
  const geometry = new SphereGeometry(1, SPHERE_WIDTH_SEGMENTS, SPHERE_HEIGHT_SEGMENTS);
  const positions = geometry.getAttribute('position');
  // 穹頂畫出來時會整張乘上 SKY_CONFIG.intensity；先除回來，地平線那一圈才剛好是霧色。
  const haze = new Color(fog.color).multiplyScalar(1 / sky.intensity);
  const ground = new Color(fog.groundColor).multiplyScalar(1 / sky.intensity);
  const mixed = new Color();
  const colors = new Float32Array(positions.count * COLOR_ITEM_SIZE);
  for (let index = 0; index < positions.count; index += 1) {
    // 球半徑是 1，所以 y 就是仰角的正弦。
    const elevationDeg = (Math.asin(Math.min(Math.max(positions.getY(index), -1), 1)) * 180) / Math.PI;
    mixed.copy(haze).lerp(ground, groundBlendAt(elevationDeg));
    colors.set(
      [mixed.r, mixed.g, mixed.b, hazeOpacityAt(elevationDeg, sky.overcast)],
      index * COLOR_ITEM_SIZE,
    );
  }
  geometry.setAttribute('color', new BufferAttribute(colors, COLOR_ITEM_SIZE));

  return new Mesh(geometry, material);
}

/** 霾的材質：顏色與不透明度都來自頂點；不寫深度、不測深度，畫在天空之上。 */
function createHazeMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false,
  });
}

/** 排在所有不透明物件之後畫（renderOrder 越大越晚），靠深度測試略過被擋住的像素。 */
const DOME_RENDER_ORDER = 1000;

const DOME_VERTEX_SHADER = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    // 只取視角矩陣的旋轉：穹頂永遠以鏡頭為中心，鏡頭怎麼移動天空都不動。
    gl_Position = projectionMatrix * vec4( mat3( viewMatrix ) * position, 1.0 );
    // 深度釘在遠平面：任何場景裡的東西都擋得住它。
    gl_Position.z = gl_Position.w;
  }
`;

const DOME_FRAGMENT_SHADER = /* glsl */ `
  uniform samplerCube tSky;
  uniform float intensity;
  varying vec3 vDirection;
  void main() {
    gl_FragColor = vec4( textureCube( tSky, vDirection ).rgb * intensity, 1.0 );
    // 直接畫到畫面上（沒有後製）時在這裡做色調映射；畫進後製鏈的緩衝區時 three 不會注入，維持線性。
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** 用烘好的立方體貼圖畫天空的穹頂。 */
function createSkyDome(skyTexture: Texture, intensity: number): Mesh {
  const dome = new Mesh(
    new BoxGeometry(1, 1, 1),
    new ShaderMaterial({
      name: 'SkyDomeShader',
      uniforms: {
        tSky: { value: skyTexture },
        intensity: { value: intensity },
      },
      vertexShader: DOME_VERTEX_SHADER,
      fragmentShader: DOME_FRAGMENT_SHADER,
      side: BackSide,
      depthWrite: false,
    }),
  );
  // 頂點著色器不看模型位置，所以包圍球沒有意義；不做視錐剔除。
  dome.frustumCulled = false;
  dome.renderOrder = DOME_RENDER_ORDER;
  // 天空不是實體表面，不參與環境光遮蔽。
  dome.userData[SKIP_AMBIENT_OCCLUSION] = true;
  return dome;
}

/** 把場景從原點往六個方向畫進立方體貼圖（半浮點，保留高動態範圍）。 */
function bakeCube(renderer: WebGLRenderer, scene: Scene, sizePx: number): WebGLCubeRenderTarget {
  const target = new WebGLCubeRenderTarget(sizePx, {
    type: HalfFloatType,
    generateMipmaps: false,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
  });
  new CubeCamera(BAKE_NEAR, BAKE_FAR, target).update(renderer, scene);
  return target;
}

/** 沒有指定天氣時的天空：黃昏（展示台也用這個當環境光）。 */
const DUSK_SKY: SkyPreset = { ...SKY_CONFIG, overcast: 0 };

/**
 * 設定天空穹頂的亮度倍率（閃電的閃光用）。
 */
export function setSkyDomeIntensity(dome: Mesh, intensity: number): void {
  const material = dome.material;
  if (material instanceof ShaderMaterial) {
    const uniform = material.uniforms['intensity'];
    if (uniform !== undefined) {
      uniform.value = intensity;
    }
  }
}

/**
 * 烘出天空背景與環境貼圖（預設是黃昏）。要先有 renderer（會用它畫幾張離屏貼圖），每個場景呼叫一次。
 * 畫到離屏貼圖時 three 不做色調映射，所以貼圖裡是場景線性亮度，與場景其他東西一起在最後才映射。
 * @param skyPreset 天空的參數（依天氣）；不給 = 黃昏
 * @param fogPreset 霧色與地面反彈色（地平線的霾用）；不給 = 黃昏
 * @param sunDirection 太陽（夜晚是月亮）的方向；不給 = 黃昏的太陽
 */
export function createSkyEnvironment(
  renderer: WebGLRenderer,
  quality: QualitySettings,
  skyPreset: SkyPreset = DUSK_SKY,
  fogPreset: FogPreset = FOG_CONFIG,
  sunDirection: Direction3 = SUN_DIRECTION,
): SkyEnvironment {
  const sky = new Sky();
  sky.scale.setScalar(SKY_BOX_SCALE);
  const uniforms = sky.material.uniforms;
  const set = (name: string, value: number): void => {
    const uniform = uniforms[name];
    if (uniform === undefined) {
      throw new Error(`Sky 沒有 uniform「${name}」`);
    }
    uniform.value = value;
  };
  set('turbidity', skyPreset.turbidity);
  set('rayleigh', skyPreset.rayleigh);
  set('mieCoefficient', skyPreset.mieCoefficient);
  set('mieDirectionalG', skyPreset.mieDirectionalG);
  set('cloudScale', skyPreset.cloudScale);
  set('cloudDensity', skyPreset.cloudDensity);
  set('cloudElevation', skyPreset.cloudElevation);
  set('cloudCoverage', skyPreset.cloudCoverage);
  // 時間固定在 0：雲不飄，截圖才能重現。
  set('time', 0);
  const sunPosition = uniforms['sunPosition']?.value;
  if (!(sunPosition instanceof Vector3)) {
    throw new Error('Sky 沒有 sunPosition');
  }
  sunPosition.set(sunDirection.x, sunDirection.y, sunDirection.z);

  const bakeScene = new Scene();
  // 霾要畫在天空之後（兩者都不寫深度，靠 renderOrder 決定先後）。
  const hazeMaterial = createHazeMaterial();
  const haze = createHazeDome(hazeMaterial, skyPreset, fogPreset);
  haze.renderOrder = 1;
  bakeScene.add(sky, haze);

  // 背景：含（壓暗過的）太陽圓盤。
  set('showSunDisc', skyPreset.sunDiscIntensity);
  const backgroundTarget = bakeCube(renderer, bakeScene, quality.skyCubeSizePx);

  // 環境貼圖的來源：不畫太陽圓盤，烘小張；轉成 PMREM 之後來源就可以丟掉。
  set('showSunDisc', 0);
  const environmentSource = bakeCube(renderer, bakeScene, SKY_CONFIG.environmentCubeSizePx);
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromCubemap(environmentSource.texture).texture;
  pmrem.dispose();
  environmentSource.dispose();

  // 烘完就用不到了：只留下兩張貼圖。
  sky.geometry.dispose();
  sky.material.dispose();
  haze.geometry.dispose();
  hazeMaterial.dispose();

  return { dome: createSkyDome(backgroundTarget.texture, skyPreset.intensity), environment };
}
