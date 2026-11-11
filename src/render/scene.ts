// 組裝場景：天空底色、霧、半球補光、太陽與陰影、地面、車。
import { Color, DirectionalLight, Fog, HemisphereLight, Scene, Vector3 } from 'three';
import { DEFAULT_SEED } from '../core/gameConfig';
import { createGround } from '../props/ground';
import type { VehiclePose } from '../vehicle/bicycleModel';
import { createCarMesh, updateCarMesh } from '../vehicle/carMesh';
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
 * @param maxAnisotropy 這張顯示卡支援的最大各向異性過濾等級（renderer.capabilities.getMaxAnisotropy()）
 */
export function createGameScene(maxAnisotropy: number): GameScene {
  const scene = new Scene();
  scene.background = new Color(SKY_CONFIG.color);
  scene.fog = new Fog(SKY_CONFIG.color, SKY_CONFIG.fogNearM, SKY_CONFIG.fogFarM);

  scene.add(
    new HemisphereLight(
      HEMISPHERE_LIGHT_CONFIG.skyColor,
      HEMISPHERE_LIGHT_CONFIG.groundColor,
      HEMISPHERE_LIGHT_CONFIG.intensity,
    ),
  );

  // 太陽照向 sun.target；兩者一起跟著車平移，光線方向不變，陰影貼圖的解析度都用在車附近。
  const sun = createSun();
  const sunOffset = new Vector3(
    SUN_CONFIG.directionToSun.x,
    SUN_CONFIG.directionToSun.y,
    SUN_CONFIG.directionToSun.z,
  ).setLength(SUN_CONFIG.distanceM);
  scene.add(sun, sun.target);

  const ground = createGround(DEFAULT_SEED, maxAnisotropy);
  scene.add(ground);

  const car = createCarMesh();
  scene.add(car.root);

  return {
    scene,
    update(pose) {
      updateCarMesh(car, pose);

      sun.target.position.set(pose.x, 0, pose.z);
      sun.position.copy(sun.target.position).add(sunOffset);

      // 地面跟著車走，但每次只移動整數張貼圖的距離，所以柏油紋路在世界座標裡不動，
      // 車怎麼開都開不到地面邊緣。
      ground.position.x = Math.round(pose.x / GROUND_CONFIG.tileM) * GROUND_CONFIG.tileM;
      ground.position.z = Math.round(pose.z / GROUND_CONFIG.tileM) * GROUND_CONFIG.tileM;
    },
  };
}
