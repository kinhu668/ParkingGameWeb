// 組裝場景：黃昏的天空與環境光、霧、半球補光、太陽與陰影、地面、車位標線、車。
import {
  DirectionalLight,
  Fog,
  HemisphereLight,
  Scene,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { DEFAULT_SEED } from '../core/gameConfig';
import type { ParkingSpot } from '../level/parkingJudge';
import { createGround } from '../props/ground';
import { createSpotMarkings } from '../props/spotMarkings';
import type { VehiclePose } from '../vehicle/bicycleModel';
import { createCarMesh, setCarInteriorView, updateCarMesh } from '../vehicle/carMesh';
import type { QualitySettings } from './quality';
import {
  FOG_CONFIG,
  GROUND_CONFIG,
  HEMISPHERE_LIGHT_CONFIG,
  SKY_CONFIG,
  SUN_CONFIG,
} from './renderConfig';
import { SUN_DIRECTION, createSkyEnvironment, type Direction3 } from './sky';

export interface GameScene {
  readonly scene: Scene;
  /** 每個畫面幀呼叫：把車擺到算圖姿態，並讓陰影範圍與地面跟著車走。 */
  update(pose: VehiclePose): void;
  /** 駕駛座視角開關：開啟時藏起會擋住視線的車艙玻璃（車頂保留）。 */
  setInteriorView(enabled: boolean): void;
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

function createSun(keyLight: KeyLight, shadowMapSize: number): DirectionalLight {
  const sun = new DirectionalLight(keyLight.color, keyLight.intensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.left = -SUN_CONFIG.shadowHalfExtentM;
  sun.shadow.camera.right = SUN_CONFIG.shadowHalfExtentM;
  sun.shadow.camera.top = SUN_CONFIG.shadowHalfExtentM;
  sun.shadow.camera.bottom = -SUN_CONFIG.shadowHalfExtentM;
  sun.shadow.camera.near = SUN_CONFIG.shadowNearM;
  sun.shadow.camera.far = SUN_CONFIG.shadowFarM;
  sun.shadow.bias = SUN_CONFIG.shadowBias;
  sun.shadow.normalBias = SUN_CONFIG.shadowNormalBias;
  return sun;
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
 */
export function addLights(
  scene: Scene,
  directionToSun: Direction3,
  quality: QualitySettings,
  keyLight: KeyLight = SUN_CONFIG,
): SceneLights {
  scene.add(
    new HemisphereLight(
      HEMISPHERE_LIGHT_CONFIG.skyColor,
      HEMISPHERE_LIGHT_CONFIG.groundColor,
      HEMISPHERE_LIGHT_CONFIG.intensity,
    ),
  );

  // 太陽照向 sun.target；兩者一起平移，光線方向不變，陰影貼圖的解析度都用在目標點附近。
  const sun = createSun(keyLight, quality.shadowMapSize);
  const sunOffset = new Vector3(directionToSun.x, directionToSun.y, directionToSun.z).setLength(
    SUN_CONFIG.distanceM,
  );
  scene.add(sun, sun.target);

  const aimAt = (x: number, z: number): void => {
    sun.target.position.set(x, 0, z);
    sun.position.copy(sun.target.position).add(sunOffset);
  };
  aimAt(0, 0);
  return { aimAt };
}

/**
 * @param renderer 用來烘天空貼圖，並查這張顯示卡支援的各向異性過濾等級
 * @param quality 畫質設定
 * @param spot 要畫標線的車位
 */
export function createGameScene(
  renderer: WebGLRenderer,
  quality: QualitySettings,
  spot: ParkingSpot,
): GameScene {
  const scene = new Scene();
  scene.add(addSkyEnvironment(scene, renderer, quality).dome);
  // 霧色與天空貼圖在地平線那一圈的霾同色，遠處的地面融進天空，沒有硬邊。
  scene.fog = new Fog(FOG_CONFIG.color, FOG_CONFIG.nearM, FOG_CONFIG.farM);

  // 太陽的方向與天空裡的太陽位置是同一個向量。
  const lights = addLights(scene, SUN_DIRECTION, quality);

  const ground = createGround(DEFAULT_SEED, renderer.capabilities.getMaxAnisotropy());
  scene.add(ground);

  scene.add(createSpotMarkings(spot));

  const car = createCarMesh();
  scene.add(car.root);

  return {
    scene,
    update(pose) {
      updateCarMesh(car, pose);

      lights.aimAt(pose.x, pose.z);

      // 地面跟著車走，但每次只移動整數張貼圖的距離，所以柏油紋路在世界座標裡不動，
      // 車怎麼開都開不到地面邊緣。
      ground.position.x = Math.round(pose.x / GROUND_CONFIG.tileM) * GROUND_CONFIG.tileM;
      ground.position.z = Math.round(pose.z / GROUND_CONFIG.tileM) * GROUND_CONFIG.tileM;
    },
    setInteriorView(enabled) {
      setCarInteriorView(car, enabled);
    },
  };
}
