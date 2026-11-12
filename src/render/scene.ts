// 組裝場景：依天氣的天空與環境光、霧、半球補光、太陽與陰影、地面、車位標線、路緣石與車擋、場地擺設、車。
import {
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Scene,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { DEFAULT_SEED } from '../core/gameConfig';
import type { GroundVector } from '../core/heading';
import { degToRad } from '../core/units';
import type { WeatherId } from '../core/weather';
import { createLightning } from '../effects/lightning';
import { createSceneEffects } from '../effects/sceneEffects';
import type { ParkingSpot } from '../level/parkingJudge';
import { createGround } from '../props/ground';
import { groundEdgeShadows } from '../props/groundShader';
import {
  createCurbs,
  createWheelStop,
  curbInnerBounds,
  edgeShadowBoxes,
} from '../props/lotEdges';
import { createLotLayout, spotLocalToWorld } from '../props/lotLayout';
import type { GroundEdgeBox } from '../props/groundShader';
import type { BoundsFt } from '../level/collision';
import { ftToM } from '../core/units';
import { createLotProps } from '../props/lotProps';
import { createEnvironmentLayout, type EnvironmentSource } from '../props/environmentLayout';
import { createEnvironment } from '../props/environments';
import {
  BOUNDS_STYLES,
  boundsVisualBoxesFt,
  createObstacleMeshes,
  type ObstacleSource,
} from '../props/obstacleMeshes';
import { createSpotMarkings } from '../props/spotMarkings';
import type { VehiclePose } from '../vehicle/bicycleModel';
import { createCarHeadlights } from '../vehicle/carHeadlights';
import {
  createCarMesh,
  setCarHoodView,
  setCarInteriorView,
  setCarLights,
  updateCarMesh,
  type CarLights,
} from '../vehicle/carMesh';
import { usesHdrChain, type QualitySettings } from './quality';
import {
  HEMISPHERE_LIGHT_CONFIG,
  SKY_CONFIG,
  SUN_CONFIG,
} from './renderConfig';
import { createOcclusionFade, type Point3 } from './occlusionFade';
import { fitShadowBox, type ShadowBox } from './shadowArea';
import {
  SUN_DIRECTION,
  createSkyEnvironment,
  directionToSun,
  setSkyDomeIntensity,
  type Direction3,
} from './sky';
import {
  LIGHTNING_CONFIG,
  RAIN_CONFIG,
  weatherPreset,
  type HemispherePreset,
  type WeatherPreset,
} from './weatherPresets';

/** 閃電用自己的亂數序列（種子加上這個位移）。 */
const LIGHTNING_SEED_OFFSET = 0x1f3;

export interface GameScene {
  readonly scene: Scene;
  /**
   * 每個畫面幀呼叫：把車擺到算圖姿態，並讓地面跟著車走（車開出場地時陰影範圍也跟著走）。
   * @param frameSeconds 距離上一幀多久（輪胎痕、灰塵、落葉用）；定格截圖不傳，這些效果停在起始狀態。
   */
  update(pose: VehiclePose, frameSeconds?: number): void;
  /** 駕駛座視角開關：開啟時藏起玻璃（車殼、頂篷、內裝保留）。 */
  setInteriorView(enabled: boolean): void;
  /** 引擎蓋視角開關：開啟時收斂烤漆的掠射反光（夕陽不把引擎蓋洗白）。 */
  setHoodView(enabled: boolean): void;
  /** 燈號：煞車燈、倒車燈。 */
  setLights(lights: CarLights): void;
  /**
   * 遮擋半透明：把擋在鏡頭與車之間的擺設（路燈、樹、背景車、建築塊…）淡成半透明，不擋了再淡回來。
   * 每個畫面幀、鏡頭就位之後呼叫。`?fx=off` 時什麼都不做。
   * @param cameraPosition 鏡頭位置（世界座標）
   * @param enabled 這個鏡頭模式要不要做（只有跟車鏡頭要）；false 時已經淡掉的會淡回來
   * @param frameSeconds 距離上一幀多久
   */
  fadeOccluders(
    cameraPosition: Point3,
    pose: VehiclePose,
    enabled: boolean,
    frameSeconds: number,
  ): void;
  /**
   * 用沒有遮擋淡出的場景跑 draw（淡掉的擺設暫時放回不透明，跑完恢復）。
   * 倒車輔助層的小畫面用：那些鏡頭不是跟車鏡頭，看到的鄰車與燈柱不該是半透明的。
   */
  drawUnfaded(draw: () => void): void;
}

/** 場景的燈光：半球補光 + 會投影的太陽。 */
export interface SceneLights {
  /** 讓太陽照向 (x, z)：光線方向不變，陰影貼圖的範圍跟著移到這一點附近。 */
  aimAt(x: number, z: number): void;
  /** 半球補光的強度乘上 scale（閃電的閃光用；1 = 原本的強度）。 */
  scaleFill(scale: number): void;
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
 * @param sunDirection 太陽的方向；不給 = 黃昏的太陽
 */
export function lotShadowBox(spot: ParkingSpot, sunDirection: Direction3 = SUN_DIRECTION): ShadowBox {
  const inner = curbInnerBounds(spot);
  const margin = SUN_CONFIG.lotShadowMarginM;
  const corners = [
    spotLocalToWorld(spot, inner.minX - margin, inner.minZ - margin),
    spotLocalToWorld(spot, inner.maxX + margin, inner.minZ - margin),
    spotLocalToWorld(spot, inner.maxX + margin, inner.maxZ + margin),
    spotLocalToWorld(spot, inner.minX - margin, inner.maxZ + margin),
  ];
  return fitShadowBox(
    sunDirection,
    corners,
    SUN_CONFIG.lotShadowMaxHeightM,
    SUN_CONFIG.distanceM,
    SUN_CONFIG.lotShadowDepthMarginM,
  );
}

/** bounds 四個角的世界座標（公尺），往外多留 marginM。 */
function boundsCorners(bounds: BoundsFt, marginM: number): GroundVector[] {
  const minX = ftToM(bounds.minXFt) - marginM;
  const maxX = ftToM(bounds.maxXFt) + marginM;
  const minZ = ftToM(bounds.minZFt) - marginM;
  const maxZ = ftToM(bounds.maxZFt) + marginM;
  return [
    { x: minX, z: minZ },
    { x: maxX, z: minZ },
    { x: maxX, z: maxZ },
    { x: minX, z: maxZ },
  ];
}

/** 有邊界的關卡的陰影範圍：蓋住整個可行駛範圍，加上邊界外的路燈、樹與背景車。 */
export function boundsShadowBox(
  bounds: BoundsFt,
  sunDirection: Direction3 = SUN_DIRECTION,
): ShadowBox {
  return fitShadowBox(
    sunDirection,
    boundsCorners(bounds, SUN_CONFIG.lotShadowMarginM),
    SUN_CONFIG.lotShadowMaxHeightM,
    SUN_CONFIG.distanceM,
    SUN_CONFIG.lotShadowDepthMarginM,
  );
}

/** 邊界的矮路緣落在地面上的影子（由地面著色器直接算）；高牆（巷子）不算，回傳空的。 */
function boundsEdgeBoxes(bounds: BoundsFt, level: ObstacleSource): GroundEdgeBox[] {
  const style = BOUNDS_STYLES[level.environment ?? 'open_lot'];
  if (style.heightFt > 2) {
    return [];
  }
  return boundsVisualBoxesFt(bounds, style.depthFt).map((box) => ({
    minX: ftToM(box.centerXFt - box.widthFt / 2),
    maxX: ftToM(box.centerXFt + box.widthFt / 2),
    minZ: ftToM(box.centerZFt - box.lengthFt / 2),
    maxZ: ftToM(box.centerZFt + box.lengthFt / 2),
    heightM: ftToM(style.heightFt),
  }));
}

/**
 * 把環境貼圖（反射＋補光）設到 scene 上，回傳整組天空（穹頂要不要加進場景由呼叫端決定）。
 * 遊戲場景與展示台共用同一套做法；展示台不給天氣（＝黃昏），也不用天空當背景。
 * @param weather 這種天氣的天空、霧色與太陽方向；不給 = 黃昏
 */
export function addSkyEnvironment(
  scene: Scene,
  renderer: WebGLRenderer,
  quality: QualitySettings,
  weather?: Pick<WeatherPreset, 'sky' | 'fog'> & { readonly sunDirection: Direction3 },
): ReturnType<typeof createSkyEnvironment> {
  const sky =
    weather === undefined
      ? createSkyEnvironment(renderer, quality)
      : createSkyEnvironment(renderer, quality, weather.sky, weather.fog, weather.sunDirection);
  scene.environment = sky.environment;
  scene.environmentIntensity =
    weather === undefined ? SKY_CONFIG.environmentIntensity : weather.sky.environmentIntensity;
  return sky;
}

/**
 * 把半球補光與會投影的主光加進 scene，一開始照向原點。遊戲場景與展示台共用同一組燈具。
 * @param directionToSun 從被照的點指向太陽的方向（不必是單位長）
 * @param quality 畫質設定（決定陰影貼圖的解析度）
 * @param keyLight 主光的顏色與強度；不給就是遊戲場景的夕陽
 * @param shadowBox 陰影相機的範圍；不給就是以目標點為中心的正方形
 * @param hemisphere 半球補光的顏色與強度；不給就是黃昏的
 */
export function addLights(
  scene: Scene,
  directionToSun: Direction3,
  quality: QualitySettings,
  keyLight: KeyLight = SUN_CONFIG,
  shadowBox: ShadowBox = DEFAULT_SHADOW_BOX,
  hemisphere: HemispherePreset = HEMISPHERE_LIGHT_CONFIG,
): SceneLights {
  const fill = new HemisphereLight(
    hemisphere.skyColor,
    hemisphere.groundColor,
    hemisphere.intensity,
  );
  scene.add(fill);

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
  return {
    aimAt,
    scaleFill(scale) {
      fill.intensity = hemisphere.intensity * scale;
    },
  };
}

/**
 * @param renderer 用來烘天空貼圖，並查這張顯示卡支援的各向異性過濾等級
 * @param quality 畫質設定
 * @param spot 要畫標線的車位
 * @param start 車的起點（世界座標）；起點到車位的通路上不放擺設
 * @param level 關卡的障礙物、邊界與環境；不給就只有原型關的停車場
 * @param weather 天氣（core/weather.ts 的 resolveWeather）；不給 = 黃昏（基準畫面）
 * @param ambientFx 會自己動的環境效果（落葉、雨絲、閃電）與跟車鏡頭的遮擋半透明要不要有；`?fx=off` 傳 false
 */
export function createGameScene(
  renderer: WebGLRenderer,
  quality: QualitySettings,
  spot: ParkingSpot,
  start: GroundVector,
  level?: ObstacleSource & EnvironmentSource,
  weather: WeatherId = 'dusk',
  ambientFx = true,
): GameScene {
  // 這種天氣的全部數值；太陽（夜晚是月亮）的方向與天空裡的圓盤位置是同一個向量。
  const preset = weatherPreset(weather);
  const sunDirection = directionToSun(
    degToRad(preset.sun.azimuthDeg),
    degToRad(preset.sun.elevationDeg),
  );

  const scene = new Scene();
  const skyDome = addSkyEnvironment(scene, renderer, quality, { ...preset, sunDirection }).dome;
  scene.add(skyDome);
  // 霧色與天空貼圖在地平線那一圈的霾同色，遠處的地面融進天空，沒有硬邊。
  const fog = new Fog(preset.fog.color, preset.fog.nearM, preset.fog.farM);
  scene.fog = fog;

  // 有邊界的關卡：四周是環境模組畫的（大賣場、郵局、街道、窄巷…），陰影範圍與地面影子跟著 bounds 走。
  // 沒有邊界的（原型關）：原本那座停車場，一樣東西都不變。
  const bounds = level?.boundsFt;
  const environmentLayout =
    level === undefined ? undefined : createEnvironmentLayout(level, quality.props);

  // 陰影範圍固定蓋住整塊場地。
  const shadowBox =
    bounds === undefined ? lotShadowBox(spot, sunDirection) : boundsShadowBox(bounds, sunDirection);
  const lights = addLights(
    scene,
    sunDirection,
    quality,
    preset.sun,
    shadowBox,
    preset.hemisphere,
  );
  // 車開出這個範圍（世界座標的外框）才讓陰影範圍跟著車移動。
  const inner = curbInnerBounds(spot);
  const lotCorners =
    bounds === undefined
      ? [
          spotLocalToWorld(spot, inner.minX, inner.minZ),
          spotLocalToWorld(spot, inner.maxX, inner.minZ),
          spotLocalToWorld(spot, inner.maxX, inner.maxZ),
          spotLocalToWorld(spot, inner.minX, inner.maxZ),
        ]
      : boundsCorners(bounds, 0);
  const lotMinX = Math.min(...lotCorners.map((corner) => corner.x));
  const lotMaxX = Math.max(...lotCorners.map((corner) => corner.x));
  const lotMinZ = Math.min(...lotCorners.map((corner) => corner.z));
  const lotMaxZ = Math.max(...lotCorners.map((corner) => corner.z));

  const ground = createGround(
    DEFAULT_SEED,
    quality.ground,
    renderer.capabilities.getMaxAnisotropy(),
    // 路緣石與車擋又矮又長，低角度的太陽下陰影貼圖畫不完整；它們落在地面上的影子由地面著色器直接算。
    bounds === undefined || level === undefined
      ? groundEdgeShadows(spot, spot.headingRad, sunDirection, edgeShadowBoxes(spot))
      : groundEdgeShadows({ x: 0, z: 0 }, 0, sunDirection, boundsEdgeBoxes(bounds, level)),
    preset.ground,
  );
  scene.add(ground);

  scene.add(createSpotMarkings(spot));
  if (environmentLayout === undefined) {
    // 路緣石與車擋只是擺設：沒有碰撞，也不進停車判定。
    scene.add(createCurbs(spot), createWheelStop(spot));
    // 場地擺設（路燈、柱子、建築、圍欄、樹、背景車、小細節）同樣只是擺設：固定種子、全部用 InstancedMesh。
    scene.add(
      createLotProps(
        spot,
        createLotLayout(spot, start, DEFAULT_SEED, quality.props),
        quality.props,
        usesHdrChain(quality),
        preset.lampsOn,
      ),
    );
  } else {
    // bounds 外面的建築、招牌、背景車、路燈…；bounds 裡面沒有穿得過去的東西。
    scene.add(
      createEnvironment(
        spot,
        environmentLayout,
        quality.props,
        usesHdrChain(quality),
        preset.lampsOn,
      ),
    );
  }

  // 關卡的障礙物與邊界：這些才有碰撞。模型的佔地就是碰撞盒。
  if (level !== undefined) {
    scene.add(createObstacleMeshes(level, quality.props.meshDetail));
  }

  const car = createCarMesh(quality.vehicleDetail);
  scene.add(car.root);
  // 頭燈照地：掛在車底下，跟著車走、跟著車頭轉。只有遊戲場景的車有，展示台的沒有。
  const headlights = createCarHeadlights(quality.headlights, usesHdrChain(quality));
  car.root.add(headlights.root);

  // 倒車輪胎痕、灰塵、落葉、雨絲：純視覺的小效果，數量跟著畫質級別走。下雨時不揚灰塵、不飄落葉。
  const raining = preset.rain > 0;
  const effects = createSceneEffects(quality, spot, start, DEFAULT_SEED, {
    rainStreaks: ambientFx ? RAIN_CONFIG.maxStreaks[quality.level] * preset.rain : 0,
    leaves: ambientFx && !raining,
    dust: !raining,
  });
  scene.add(effects.root);

  // 閃電（只有閃光）：依固定的時間表，短暫提高補光、環境光與天空，霧色往閃光色靠。
  // 定格截圖不走時間（累積時間 0），畫面是「沒有在閃」的狀態。
  const lightning =
    ambientFx && preset.lightning ? createLightning(DEFAULT_SEED + LIGHTNING_SEED_OFFSET) : undefined;
  const fogBaseColor = new Color(preset.fog.color);
  const flashColor = new Color(LIGHTNING_CONFIG.flashColor);
  let weatherSeconds = 0;
  let shownFlash = 0;
  const applyFlash = (flash: number): void => {
    lights.scaleFill(1 + LIGHTNING_CONFIG.hemisphereBoost * flash);
    scene.environmentIntensity =
      preset.sky.environmentIntensity * (1 + LIGHTNING_CONFIG.environmentBoost * flash);
    setSkyDomeIntensity(skyDome, preset.sky.intensity * (1 + LIGHTNING_CONFIG.skyBoost * flash));
    fog.color.copy(fogBaseColor).lerp(flashColor, LIGHTNING_CONFIG.fogBlend * flash);
  };

  // 遮擋半透明：擺設都就位了才收集（佔地方塊要換成世界座標）。玩家車沒有登記，不會被淡掉。
  const occlusion = ambientFx ? createOcclusionFade(scene) : undefined;

  return {
    scene,
    fadeOccluders(cameraPosition, pose, enabled, frameSeconds) {
      occlusion?.update(cameraPosition, pose, enabled, frameSeconds);
    },
    drawUnfaded(draw) {
      if (occlusion === undefined) {
        draw();
      } else {
        occlusion.drawUnfaded(draw);
      }
    },
    update(pose, frameSeconds = 0) {
      updateCarMesh(car, pose);
      effects.update(pose, frameSeconds);
      if (lightning !== undefined) {
        weatherSeconds += frameSeconds;
        const flash = lightning.flashAt(weatherSeconds);
        if (flash !== shownFlash) {
          shownFlash = flash;
          applyFlash(flash);
        }
      }

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
    setHoodView(enabled) {
      setCarHoodView(car, enabled);
    },
    setLights(lights) {
      setCarLights(car, lights);
      headlights.setReversing(lights.reversing);
    },
  };
}
