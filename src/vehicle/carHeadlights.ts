// 玩家車頭燈照地：車頭前方地上的光斑（加色混合的貼地面片）、不投影的真光源（SpotLight），
// 以及倒車時車尾後方的一小片冷白光。用哪幾樣跟著畫質級別走（QUALITY_PRESETS 的 headlights）。
// 全部用車的本地座標（車頭朝 −Z、右側 +X、地面 y = 0），掛在車的根節點底下，所以跟著車走、跟著車頭轉。
// 純視覺：沒有碰撞、不投影。只有遊戲場景掛上；展示台（?show=）的車沒有這些。
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SpotLight,
  type BufferGeometry,
} from 'three';
import { SKIP_AMBIENT_OCCLUSION } from '../render/ambientOcclusionFlag';
import type { HeadlightQualitySettings } from '../render/quality';
import { HEADLIGHT_CONFIG as CONFIG } from '../render/renderConfig';
import { VEHICLE_CONFIG_SI } from './vehicleConfig';

export interface CarHeadlights {
  /** 掛到車的根節點底下。 */
  readonly root: Group;
  /** 倒車燈亮不亮：亮的時候車尾後方的地上才有光。 */
  setReversing(on: boolean): void;
}

/** 一片光斑的形狀（公尺）：從燈往外 lengthM 長、左右各 halfWidthM 寬，裡面一瓣或兩瓣。 */
export interface BeamShape {
  readonly lengthM: number;
  readonly halfWidthM: number;
  /** 每一瓣的中線離光斑中線多遠；0 = 只有一瓣。 */
  readonly lobeOffsetM: number;
  /** 每一瓣的寬度（高斯的 σ）：燈前與最遠處。 */
  readonly nearSpreadM: number;
  readonly farSpreadM: number;
  /** 離燈這麼遠才亮到最亮。 */
  readonly riseM: number;
  /** 往遠處變淡的冪次。 */
  readonly falloffExponent: number;
}

/** 光斑面片的格數（橫向、縱向）：亮度存在頂點上，格子夠細才看不出折線。 */
const POOL_COLUMNS = 28;
const POOL_ROWS = 32;
/** 光斑排在車位標線、輪胎痕這些貼地的半透明面片之後畫（都不寫深度，靠 renderOrder 決定先後）。 */
const POOL_RENDER_ORDER = 2;
const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * 光斑在某一點的亮度（0–1）。
 * @param lateralM 離光斑中線多遠（左右對稱）
 * @param aheadM 離燈多遠（沿照射方向）
 * 燈的正下方是暗的，往前很快亮起來，再往遠處淡到 0；每一瓣離燈越遠越寬；四邊都剛好是 0，面片的邊緣看不出來。
 */
export function beamBrightness(shape: BeamShape, lateralM: number, aheadM: number): number {
  if (aheadM <= 0 || aheadM >= shape.lengthM || Math.abs(lateralM) >= shape.halfWidthM) {
    return 0;
  }
  const far = aheadM / shape.lengthM;
  const spreadM = shape.nearSpreadM + (shape.farSpreadM - shape.nearSpreadM) * far;
  const lobe = (centerM: number): number => Math.exp(-(((lateralM - centerM) / spreadM) ** 2));
  const across =
    shape.lobeOffsetM > 0
      ? Math.min(lobe(-shape.lobeOffsetM) + lobe(shape.lobeOffsetM), 1)
      : lobe(0);
  const along = smoothstep(0, shape.riseM, aheadM) * (1 - far) ** shape.falloffExponent;
  const edge = 1 - smoothstep(0.6, 1, Math.abs(lateralM) / shape.halfWidthM);
  return across * along * edge;
}

/** 光斑的面片：躺在 y = 0、從 z = 0 往 −Z 伸出去，亮度存在頂點顏色裡。 */
function createBeamGeometry(shape: BeamShape): BufferGeometry {
  const geometry = new PlaneGeometry(2 * shape.halfWidthM, shape.lengthM, POOL_COLUMNS, POOL_ROWS)
    .rotateX(-Math.PI / 2)
    .translate(0, 0, -shape.lengthM / 2);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index += 1) {
    const brightness = beamBrightness(shape, position.getX(index), -position.getZ(index));
    colors.set([brightness, brightness, brightness], index * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

/** 一片貼地的光：加色混合、不寫深度、不投影不收影、不參與環境光遮蔽。 */
function createPool(name: string, shape: BeamShape, color: number, brightness: number): Mesh {
  const pool = new Mesh(
    createBeamGeometry(shape),
    // 不做色調映射：直接畫到畫面上時，色調映射會把「沒有光」的邊緣也抬成一圈看得見的顏色。
    new MeshBasicMaterial({
      color: new Color(color).multiplyScalar(brightness),
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    }),
  );
  pool.name = name;
  pool.renderOrder = POOL_RENDER_ORDER;
  pool.userData[SKIP_AMBIENT_OCCLUSION] = true;
  return pool;
}

/**
 * @param settings 這個畫質級別的頭燈做法
 * @param hdr 這個級別是不是走高動態範圍的後製鏈（決定光斑的亮度）
 */
export function createCarHeadlights(settings: HeadlightQualitySettings, hdr: boolean): CarHeadlights {
  const root = new Group();
  root.name = 'headlights';
  const spotLights = Math.min(Math.max(Math.round(settings.spotLights), 0), 2);

  let reversePool: Mesh | undefined;
  if (settings.groundPool) {
    const front = hdr ? CONFIG.poolBrightness.hdr : CONFIG.poolBrightness.direct;
    const headlightPool = createPool(
      'headlightPool',
      CONFIG.frontPool,
      CONFIG.color,
      spotLights > 0 ? front * CONFIG.poolWithLightScale : front,
    );
    headlightPool.position.set(0, CONFIG.poolLiftM, -HALF_LENGTH_M);
    root.add(headlightPool);

    // 倒車燈的光：同一種面片轉半圈，從車尾往後（+Z）伸出去；平常藏著。
    reversePool = createPool(
      'reversePool',
      CONFIG.reversePool,
      CONFIG.reverseColor,
      hdr ? CONFIG.reverseBrightness.hdr : CONFIG.reverseBrightness.direct,
    );
    reversePool.position.set(0, CONFIG.poolLiftM, HALF_LENGTH_M);
    reversePool.rotation.y = Math.PI;
    reversePool.visible = false;
    root.add(reversePool);
  }

  // 真光源：一盞在車頭中央，兩盞就左右各一。不投影。光源與瞄準點都是車的子物件，車轉向時光跟著轉。
  const lateralOffsets =
    spotLights === 2 ? [-CONFIG.lampOffsetM, CONFIG.lampOffsetM] : spotLights === 1 ? [0] : [];
  for (const lateralM of lateralOffsets) {
    const light = new SpotLight(
      CONFIG.color,
      CONFIG.lightIntensity / lateralOffsets.length,
      CONFIG.lightDistanceM,
      CONFIG.lightAngleRad,
      CONFIG.lightPenumbra,
      CONFIG.lightDecay,
    );
    light.name = 'headlightSpot';
    light.castShadow = false;
    const noseZM = -HALF_LENGTH_M - CONFIG.lightAheadOfNoseM;
    light.position.set(lateralM, CONFIG.lightHeightM, noseZM);
    light.target.position.set(lateralM, 0, noseZM - CONFIG.lightAimAheadM);
    root.add(light, light.target);
  }

  return {
    root,
    setReversing(on) {
      if (reversePool !== undefined) {
        reversePool.visible = on;
      }
    },
  };
}
