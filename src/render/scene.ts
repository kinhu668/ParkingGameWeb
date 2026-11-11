// 組裝場景：天空底色、霧、半球補光、太陽與陰影、地面、車位標線、車。
import { Color, DirectionalLight, Fog, HemisphereLight, Scene, Vector3 } from 'three';
import { DEFAULT_SEED } from '../core/gameConfig';
import type { ParkingSpot } from '../level/parkingJudge';
import { createGround } from '../props/ground';
import { createSpotMarkings } from '../props/spotMarkings';
import type { VehiclePose } from '../vehicle/bicycleModel';
import { createCarMesh, setCarInteriorView, updateCarMesh } from '../vehicle/carMesh';
import {
  GROUND_CONFIG,
  HEMISPHERE_LIGHT_CONFIG,
  SKY_CONFIG,
  SUN_CONFIG,
} from './renderConfig';

export interface GameScene {
  readonly scene: Scene;
  /** 每個畫面幀呼叫：把車擺到算圖姿態，並讓陰影範圍與地面跟著車走。 */
  update(pose: VehiclePose): void;
  /** 駕駛座視角開關：開啟時藏起會擋住視線的車艙玻璃與車頂。 */
  setInteriorView(enabled: boolean): void;
}

/** 場景的燈光：半球補光 + 會投影的太陽。 */
export interface SceneLights {
  /** 讓太陽照向 (x, z)：光線方向不變，陰影貼圖的範圍跟著移到這一點附近。 */
  aimAt(x: number, z: number): void;
}

function createSun(): DirectionalLight {
  const sun = new DirectionalLight(SUN_CONFIG.color, SUN_CONFIG.intensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SUN_CONFIG.shadowMapSize, SUN_CONFIG.shadowMapSize);
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
 * 把半球補光與太陽加進 scene，一開始照向原點。遊戲場景與展示台共用，物件在兩邊的受光才一致。
 * @param directionToSun 從被照的點指向太陽的方向（不必是單位長）
 */
export function addLights(
  scene: Scene,
  directionToSun: { readonly x: number; readonly y: number; readonly z: number },
): SceneLights {
  scene.add(
    new HemisphereLight(
      HEMISPHERE_LIGHT_CONFIG.skyColor,
      HEMISPHERE_LIGHT_CONFIG.groundColor,
      HEMISPHERE_LIGHT_CONFIG.intensity,
    ),
  );

  // 太陽照向 sun.target；兩者一起平移，光線方向不變，陰影貼圖的解析度都用在目標點附近。
  const sun = createSun();
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
 * @param maxAnisotropy 這張顯示卡支援的最大各向異性過濾等級（renderer.capabilities.getMaxAnisotropy()）
 * @param spot 要畫標線的車位
 */
export function createGameScene(maxAnisotropy: number, spot: ParkingSpot): GameScene {
  const scene = new Scene();
  scene.background = new Color(SKY_CONFIG.color);
  scene.fog = new Fog(SKY_CONFIG.color, SKY_CONFIG.fogNearM, SKY_CONFIG.fogFarM);

  const lights = addLights(scene, SUN_CONFIG.directionToSun);

  const ground = createGround(DEFAULT_SEED, maxAnisotropy);
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
