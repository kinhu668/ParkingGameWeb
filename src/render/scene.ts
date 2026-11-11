// 組裝場景：黃昏的天空與環境光、霧、半球補光、太陽與陰影、地面、車位標線、路緣石與車擋、場地擺設、車。
import {
  DirectionalLight,
  Fog,
  HemisphereLight,
  Scene,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { DEFAULT_SEED } from '../core/gameConfig';
import type { GroundVector } from '../core/heading';
import type { ParkingSpot } from '../level/parkingJudge';
import { createGround } from '../props/ground';
import { createCurbs, createWheelStop, curbInnerBounds } from '../props/lotEdges';
import { createLotLayout, spotLocalToWorld } from '../props/lotLayout';
import { createLotProps } from '../props/lotProps';
import { createSpotMarkings } from '../props/spotMarkings';
import type { VehiclePose } from '../vehicle/bicycleModel';
import { createCarHeadlights } from '../vehicle/carHeadlights';
import {
  createCarMesh,
  setCarInteriorView,
  setCarLights,
  updateCarMesh,
  type CarLights,
} from '../vehicle/carMesh';
import { usesHdrChain, type QualitySettings } from './quality';
import {
  FOG_CONFIG,
  HEMISPHERE_LIGHT_CONFIG,
  SKY_CONFIG,
  SUN_CONFIG,
} from './renderConfig';
import { fitShadowBox, type ShadowBox } from './shadowArea';
import { SUN_DIRECTION, createSkyEnvironment, type Direction3 } from './sky';

export interface GameScene {
  readonly scene: Scene;
  /** 每個畫面幀呼叫：把車擺到算圖姿態，並讓地面跟著車走（車開出場地時陰影範圍也跟著走）。 */
  update(pose: VehiclePose): void;
  /** 駕駛座視角開關：開啟時藏起玻璃（車殼、頂篷、內裝保留）。 */
  setInteriorView(enabled: boolean): void;
  /** 燈號：煞車燈、倒車燈。 */
  setLights(lights: CarLights): void;
}

/** 場景的燈光：半球補光 + 會投影的太陽。 */
export interface SceneLights {
  /** 讓太陽照向 (x, z)：光線方向不變，陰影貼圖的範圍跟著移到這一點附近。 */
  aimAt(x: number, z: number): void;
}

/** 主光的顏色與強度。 */
export interface KeyLight {
  readonly color: number;
  readonly intensity: number;
}

/** 沒有指定陰影範圍時用的：以目標點為中心的正方形。 */
const DEFAULT_SHADOW_BOX: ShadowBox = {
  targetX: 0,
  targetZ: 0,
  left: -SUN_CONFIG.shadowHalfExtentM,
  right: SUN_CONFIG.shadowHalfExtentM,
  bottom: -SUN_CONFIG.shadowHalfExtentM,
  top: SUN_CONFIG.shadowHalfExtentM,
  near: SUN_CONFIG.shadowNearM,
  far: SUN_CONFIG.shadowFarM,
};

/**
 * 陰影的法線偏移：範圍越大、貼圖越小，一個像素蓋的地面越大，偏移要跟著放大才不會有條紋。
 * @param widthM 陰影範圍的寬（公尺）
 * @param mapSizePx 陰影貼圖的邊長（像素）
 */
export function shadowNormalBias(widthM: number, mapSizePx: number): number {
  return Math.max(
    SUN_CONFIG.shadowNormalBias,
    (widthM / mapSizePx) * SUN_CONFIG.shadowNormalBiasTexels,
  );
}

function createSun(keyLight: KeyLight, shadowMapSize: number, box: ShadowBox): DirectionalLight {
  const sun = new DirectionalLight(keyLight.color, keyLight.intensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.left = box.left;
  sun.shadow.camera.right = box.right;
  sun.shadow.camera.top = box.top;
  sun.shadow.camera.bottom = box.bottom;
  sun.shadow.camera.near = box.near;
  sun.shadow.camera.far = box.far;
  sun.shadow.bias = SUN_CONFIG.shadowBias;
  sun.shadow.normalBias = shadowNormalBias(box.right - box.left, shadowMapSize);
  return sun;
}

/**
 * 場地的陰影範圍：蓋住路緣圍成的整塊場地（加上路緣外的圍欄、路燈與樹）。
 * 範圍是固定的，所以遠處的路緣與擺設都有影子，車移動時影子的邊緣也不會跟著抖。
 */
export function lotShadowBox(spot: ParkingSpot): ShadowBox {
  const inner = curbInnerBounds(spot);
  const margin = SUN_CONFIG.lotShadowMarginM;
  const corners = [
    spotLocalToWorld(spot, inner.minX - margin, inner.minZ - margin),
    spotLocalToWorld(spot, inner.maxX + margin, inner.minZ - margin),
    spotLocalToWorld(spot, inner.maxX + margin, inner.maxZ + margin),
    spotLocalToWorld(spot, inner.minX - margin, inner.maxZ + margin),
  ];
  return fitShadowBox(
    SUN_DIRECTION,
    corners,
    SUN_CONFIG.lotShadowMaxHeightM,
    SUN_CONFIG.distanceM,
    SUN_CONFIG.lotShadowDepthMarginM,
  );
}

/**
 * 把黃昏的環境貼圖（反射＋補光）設到 scene 上，回傳整組天空（穹頂要不要加進場景由呼叫端決定）。
 * 遊戲場景與展示台共用同一片天空的環境光；展示台不用天空當背景。
 */
export function addSkyEnvironment(
  scene: Scene,
  renderer: WebGLRenderer,
  quality: QualitySettings,
): ReturnType<typeof createSkyEnvironment> {
  const sky = createSkyEnvironment(renderer, quality);
  scene.environment = sky.environment;
  scene.environmentIntensity = SKY_CONFIG.environmentIntensity;
  return sky;
}

/**
 * 把半球補光與會投影的主光加進 scene，一開始照向原點。遊戲場景與展示台共用同一組燈具。
 * @param directionToSun 從被照的點指向太陽的方向（不必是單位長）
 * @param quality 畫質設定（決定陰影貼圖的解析度）
 * @param keyLight 主光的顏色與強度；不給就是遊戲場景的夕陽
 * @param shadowBox 陰影相機的範圍；不給就是以目標點為中心的正方形
 */
export function addLights(
  scene: Scene,
  directionToSun: Direction3,
  quality: QualitySettings,
  keyLight: KeyLight = SUN_CONFIG,
  shadowBox: ShadowBox = DEFAULT_SHADOW_BOX,
): SceneLights {
  scene.add(
    new HemisphereLight(
      HEMISPHERE_LIGHT_CONFIG.skyColor,
      HEMISPHERE_LIGHT_CONFIG.groundColor,
      HEMISPHERE_LIGHT_CONFIG.intensity,
    ),
  );

  // 太陽照向 sun.target；兩者一起平移，光線方向不變，陰影貼圖的解析度都用在目標點附近。
  const sun = createSun(keyLight, quality.shadowMapSize, shadowBox);
  const sunOffset = new Vector3(directionToSun.x, directionToSun.y, directionToSun.z).setLength(
    SUN_CONFIG.distanceM,
  );
  scene.add(sun, sun.target);

  const aimAt = (x: number, z: number): void => {
    sun.target.position.set(x, 0, z);
    sun.position.copy(sun.target.position).add(sunOffset);
  };
  aimAt(shadowBox.targetX, shadowBox.targetZ);
  return { aimAt };
}

/**
 * @param renderer 用來烘天空貼圖，並查這張顯示卡支援的各向異性過濾等級
 * @param quality 畫質設定
 * @param spot 要畫標線的車位
 * @param start 車的起點（世界座標）；起點到車位的通路上不放擺設
 */
export function createGameScene(
  renderer: WebGLRenderer,
  quality: QualitySettings,
  spot: ParkingSpot,
  start: GroundVector,
): GameScene {
  const scene = new Scene();
  scene.add(addSkyEnvironment(scene, renderer, quality).dome);
  // 霧色與天空貼圖在地平線那一圈的霾同色，遠處的地面融進天空，沒有硬邊。
  scene.fog = new Fog(FOG_CONFIG.color, FOG_CONFIG.nearM, FOG_CONFIG.farM);

  // 太陽的方向與天空裡的太陽位置是同一個向量。陰影範圍固定蓋住整塊場地。
  const shadowBox = lotShadowBox(spot);
  const lights = addLights(scene, SUN_DIRECTION, quality, SUN_CONFIG, shadowBox);
  // 車開出這個範圍（世界座標的外框）才讓陰影範圍跟著車移動。
  const inner = curbInnerBounds(spot);
  const lotCorners = [
    spotLocalToWorld(spot, inner.minX, inner.minZ),
    spotLocalToWorld(spot, inner.maxX, inner.minZ),
    spotLocalToWorld(spot, inner.maxX, inner.maxZ),
    spotLocalToWorld(spot, inner.minX, inner.maxZ),
  ];
  const lotMinX = Math.min(...lotCorners.map((corner) => corner.x));
  const lotMaxX = Math.max(...lotCorners.map((corner) => corner.x));
  const lotMinZ = Math.min(...lotCorners.map((corner) => corner.z));
  const lotMaxZ = Math.max(...lotCorners.map((corner) => corner.z));

  const ground = createGround(
    DEFAULT_SEED,
    quality.ground,
    renderer.capabilities.getMaxAnisotropy(),
  );
  scene.add(ground);

  scene.add(createSpotMarkings(spot));
  // 路緣石與車擋只是擺設：沒有碰撞，也不進停車判定。
  scene.add(createCurbs(spot), createWheelStop(spot));
  // 場地擺設（路燈、柱子、建築、圍欄、樹、背景車、小細節）同樣只是擺設：固定種子、全部用 InstancedMesh。
  scene.add(
    createLotProps(
      spot,
      createLotLayout(spot, start, DEFAULT_SEED, quality.props),
      quality.props,
      usesHdrChain(quality),
    ),
  );

  const car = createCarMesh(quality.vehicleDetail);
  scene.add(car.root);
  // 頭燈照地：掛在車底下，跟著車走、跟著車頭轉。只有遊戲場景的車有，展示台的沒有。
  const headlights = createCarHeadlights(quality.headlights, usesHdrChain(quality));
  car.root.add(headlights.root);

  // 倒車輪胎痕、灰塵、落葉：純視覺的小效果，數量跟著畫質級別走。
  const effects = createSceneEffects(quality, spot, start, DEFAULT_SEED);
  scene.add(effects.root);

  return {
    scene,
    update(pose) {
      updateCarMesh(car, pose);

      // 車在場地裡時陰影範圍不動；開出去多遠，範圍就跟著平移多遠。
      lights.aimAt(
        shadowBox.targetX + pose.x - Math.min(Math.max(pose.x, lotMinX), lotMaxX),
        shadowBox.targetZ + pose.z - Math.min(Math.max(pose.z, lotMinZ), lotMaxZ),
      );

      // 地面跟著車走，車怎麼開都開不到邊緣。柏油的紋路是著色器用世界座標算的，
      // 網格平移時紋路留在原地，不會跟著滑動或跳格。
      ground.position.x = pose.x;
      ground.position.z = pose.z;
    },
    setInteriorView(enabled) {
      setCarInteriorView(car, enabled);
    },
    setLights(lights) {
      setCarLights(car, lights);
      headlights.setReversing(lights.reversing);
    },
  };
}
