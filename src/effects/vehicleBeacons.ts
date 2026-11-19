// 車輛的警報燈與救護車的燈條（純視覺）：亮起來的鏡片是疊在車身上的另一層網格，不發光也不受光（不看燈光、頂點顏色就是亮的顏色）。
// 每一款停放的車、包裹貨車、衝浪休旅車各一個 InstancedMesh，救護車三個（左、右、車尾的琥珀燈）；
// 用與車身同一個實例矩陣，沒有燈亮的時候一個實例都不畫。誰亮、亮多少只看 level/alarm.ts 的狀態。
// 救護車另外有打在地上的光（畫質有開地面光斑才有）與一盞不投影的點光源（畫質有開真光源才有）。
// 已知的小缺點：跟車鏡頭把車身淡成半透明時，亮著的鏡片不跟著淡。
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ftToM } from '../core/units';
import {
  alarmLampOn,
  lightbarMode,
  lightbarState,
  type AlarmState,
  type LampMotion,
  type LightbarLamps,
} from '../level/alarm';
import { createAmbulanceLampGeometry } from '../props/ambulance';
import { LENS, createDeliveryVanLampGeometry } from '../props/deliveryVan';
import { obstacleInstances, type ObstacleInstance } from '../props/obstacleMeshes';
import { createSurfSuvLampGeometry } from '../props/surfSuv';
import { SKIP_AMBIENT_OCCLUSION } from '../render/ambientOcclusionFlag';
import { SKIP_GROUND_REFLECTION } from '../render/groundReflectionFlag';
import type { HeadlightQualitySettings, VehicleDetail } from '../render/quality';
import { createCarModelParts, type CarModelPart } from '../vehicle/carModelParts';
import { CAR_MODEL_IDS } from '../vehicle/carModels';

const BEACON = {
  /** 亮起來的鏡片的亮度倍數：走高動態範圍後製鏈的級別調高，泛光才帶得出光暈。 */
  lampBrightness: { hdr: 2.4, direct: 1 },
  /** 救護車燈條打在地上的光（左紅右白各一片）：半徑、圓心離車身中線多遠、離地多高、亮度。 */
  poolRadiusM: ftToM(14),
  poolOffsetM: ftToM(5),
  poolLiftM: ftToM(0.08),
  poolBrightness: { hdr: 0.5, direct: 0.16 },
  /** 燈條在車身本地座標的位置（英尺換成公尺）：往車頭 4 ft、車頂上方。 */
  barAheadM: ftToM(4),
  lightHeightM: ftToM(9.8),
  /** 燈條的真光源（不投影）：強度、照多遠、衰減。 */
  lightIntensity: 14,
  lightDistanceM: ftToM(55),
  lightDecay: 1.2,
  red: 0xff2a1f,
  white: 0xdfe8ff,
} as const;

/** 光斑與光暈畫在地面與標線之後（與玩家車頭燈的光斑同一層）。 */
const POOL_RENDER_ORDER = 2;

/** 停放的車警報時會亮的分區與亮起來的顏色（與包裹貨車的鏡片同一組顏色）。 */
const CAR_LAMPS: readonly (readonly [CarModelPart, number])[] = [
  ['headlight', LENS.head.lit],
  ['taillight', LENS.red.lit],
  ['indicator', LENS.amber.lit],
];

export interface VehicleBeacons {
  /** 加進場景（世界座標）。 */
  readonly root: Group;
  /** 依警報狀態更新哪些燈亮著；每幀呼叫，狀態沒變就什麼都不做。 */
  update(alarms: AlarmState, motion: LampMotion): void;
}

/** 某個障礙物上的這一組燈現在的亮度（0 = 不亮）。 */
type LampLevel = (index: number, alarms: AlarmState, motion: LampMotion) => number;

interface Overlay {
  readonly mesh: InstancedMesh;
  readonly instances: readonly ObstacleInstance[];
  readonly level: LampLevel;
  /** 上一次畫的各實例亮度（串成字串）；一樣就不重填。 */
  shown: string;
}

/** 救護車打在地上的一片光，或那盞點光源：跟著哪台救護車的哪一組燈。 */
interface BarGlow {
  readonly index: number;
  readonly show: (lamps: LightbarLamps) => void;
}

const carLampLevel: LampLevel = (index, alarms, motion) => {
  const alarm = alarms.active.find((active) => active.index === index);
  return alarm !== undefined && alarmLampOn(alarm.elapsedS, motion) ? 1 : 0;
};

const barLampLevel =
  (group: 'left' | 'right' | 'rear'): LampLevel =>
  (index, alarms, motion) => {
    const lamps = lightbarState(alarms.clockS, lightbarMode(alarms, index), motion);
    return lamps[group] ? lamps.level : 0;
  };

/** 車款幾何裡的一個燈組：只留位置，整塊塗成亮起來的顏色。 */
function litPiece(source: BufferGeometry, color: number): BufferGeometry {
  const piece = new BufferGeometry();
  const positions = source.getAttribute('position').clone();
  piece.setAttribute('position', positions);
  piece.setIndex(
    source.getIndex()?.clone() ?? Array.from({ length: positions.count }, (_, index) => index),
  );
  const lit = new Color(color);
  const colors = new Float32Array(positions.count * 3);
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    lit.toArray(colors, vertex * 3);
  }
  piece.setAttribute('color', new BufferAttribute(colors, 3));
  return piece;
}

/** 一款停放的車警報時亮的鏡片（頭燈、尾燈、方向燈），與車身同一個本地座標。 */
export function createParkedCarLampGeometry(
  model: (typeof CAR_MODEL_IDS)[number],
  detail: VehicleDetail,
): BufferGeometry {
  const { body } = createCarModelParts(model, detail);
  return mergeGeometries(
    CAR_LAMPS.flatMap(([part, color]) => {
      const geometry = body.get(part);
      return geometry === undefined ? [] : [litPiece(geometry, color)];
    }),
  );
}

/** 貼地的一片圓形的光：中心最亮、邊緣是 0；加色混合、不寫深度、不進倒影與環境光遮蔽。 */
function createPool(color: number, brightness: number): Mesh<BufferGeometry, MeshBasicMaterial> {
  const geometry = new CircleGeometry(BEACON.poolRadiusM, 32).rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  // 第一個頂點是圓心，其餘在圓周上。
  colors.fill(1, 0, 3);
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  const pool = new Mesh(
    geometry,
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
  pool.name = 'lightbarPool';
  pool.renderOrder = POOL_RENDER_ORDER;
  pool.userData[SKIP_AMBIENT_OCCLUSION] = true;
  pool.userData[SKIP_GROUND_REFLECTION] = true;
  return pool;
}

/**
 * @param obstacles createObstacleMeshes 的回傳值（從它讀每台車的實例矩陣）
 * @param detail 停放車輛的細分（與 createObstacleMeshes 相同）
 * @param lights 這個畫質級別的照地做法：groundPool 決定救護車有沒有地上的光，spotLights > 0 才有點光源
 * @param hdr 這個級別是不是走高動態範圍的後製鏈（決定鏡片與光斑的亮度）
 */
export function createVehicleBeacons(
  obstacles: Group,
  detail: VehicleDetail,
  lights: HeadlightQualitySettings,
  hdr: boolean,
): VehicleBeacons {
  const root = new Group();
  root.name = 'vehicleBeacons';
  const brightness = hdr ? BEACON.lampBrightness.hdr : BEACON.lampBrightness.direct;
  // 鏡片的疊加層：不受光、不做色調映射（直接就是亮的顏色）；往鏡頭偏一點深度，蓋在車身的鏡片上不閃爍。
  const material = new MeshBasicMaterial({
    vertexColors: true,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

  const overlays: Overlay[] = [];
  const addOverlay = (
    name: string,
    meshName: string,
    geometry: () => BufferGeometry,
    level: LampLevel,
  ): readonly ObstacleInstance[] => {
    const instances = obstacleInstances(obstacles, meshName);
    if (instances.length === 0) {
      return instances;
    }
    const mesh = new InstancedMesh(geometry(), material, instances.length);
    mesh.name = `beacon:${name}`;
    mesh.count = 0;
    mesh.visible = false;
    // 實例每幀可能換位置（只留亮著的），外框不重算，乾脆不做視錐剔除（整關只有幾個這種網格）。
    mesh.frustumCulled = false;
    root.add(mesh);
    overlays.push({ mesh, instances, level, shown: '' });
    return instances;
  };

  for (const model of CAR_MODEL_IDS) {
    addOverlay(
      `parked_car:${model}`,
      `parkedCars:${model}:rest`,
      () => createParkedCarLampGeometry(model, detail),
      carLampLevel,
    );
  }
  addOverlay('delivery_van', 'obstacle:delivery_van', createDeliveryVanLampGeometry, carLampLevel);
  addOverlay('surf_suv', 'obstacle:surf_suv', createSurfSuvLampGeometry, carLampLevel);

  let barGeometry: ReturnType<typeof createAmbulanceLampGeometry> | undefined;
  const barPart = (group: 'left' | 'right' | 'rear') => (): BufferGeometry => {
    barGeometry ??= createAmbulanceLampGeometry();
    return barGeometry[group];
  };
  const ambulances = addOverlay('ambulance:left', 'obstacle:ambulance', barPart('left'), barLampLevel('left'));
  addOverlay('ambulance:right', 'obstacle:ambulance', barPart('right'), barLampLevel('right'));
  addOverlay('ambulance:rear', 'obstacle:ambulance', barPart('rear'), barLampLevel('rear'));

  // 燈條照在地上的光：左紅、右白，各一片；只有那一組亮著的時候才畫。
  const glows: BarGlow[] = [];
  if (lights.groundPool) {
    const poolBrightness = hdr ? BEACON.poolBrightness.hdr : BEACON.poolBrightness.direct;
    for (const { index, matrix } of ambulances) {
      for (const [group, side, color] of [
        ['left', -1, BEACON.red],
        ['right', 1, BEACON.white],
      ] as const) {
        const pool = createPool(color, poolBrightness);
        pool.position
          .set(side * BEACON.poolOffsetM, 0, -BEACON.barAheadM)
          .applyMatrix4(matrix)
          .setY(BEACON.poolLiftM);
        const base = pool.material.color.clone();
        root.add(pool);
        glows.push({
          index,
          show(lamps) {
            pool.visible = lamps[group];
            pool.material.color.copy(base).multiplyScalar(lamps.level);
          },
        });
      }
    }
  }
  // 真光源：整關一盞（第一台救護車），建場景時就在，之後只改顏色與強度；不投影。
  const first = ambulances[0];
  if (lights.spotLights > 0 && first !== undefined) {
    const light = new PointLight(BEACON.red, 0, BEACON.lightDistanceM, BEACON.lightDecay);
    light.name = 'lightbarLight';
    light.castShadow = false;
    light.position.copy(
      new Vector3(0, BEACON.lightHeightM, -BEACON.barAheadM).applyMatrix4(first.matrix),
    );
    const red = new Color(BEACON.red);
    const white = new Color(BEACON.white);
    const both = red.clone().lerp(white, 0.5);
    root.add(light);
    glows.push({
      index: first.index,
      show(lamps) {
        light.color.copy(lamps.left && lamps.right ? both : lamps.left ? red : white);
        light.intensity = lamps.left || lamps.right ? BEACON.lightIntensity * lamps.level : 0;
      },
    });
  }

  const tint = new Color();
  const beacons: VehicleBeacons = {
    root,
    update(alarms, motion) {
      for (const overlay of overlays) {
        const levels = overlay.instances.map(({ index }) => overlay.level(index, alarms, motion));
        const key = levels.join();
        if (key === overlay.shown) {
          continue;
        }
        overlay.shown = key;
        const { mesh } = overlay;
        let lit = 0;
        overlay.instances.forEach(({ matrix }, instance) => {
          const level = levels[instance] ?? 0;
          if (level > 0) {
            mesh.setMatrixAt(lit, matrix);
            mesh.setColorAt(lit, tint.setScalar(level * brightness));
            lit += 1;
          }
        });
        mesh.count = lit;
        mesh.visible = lit > 0;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor !== null) {
          mesh.instanceColor.needsUpdate = true;
        }
      }
      for (const glow of glows) {
        glow.show(lightbarState(alarms.clockS, lightbarMode(alarms, glow.index), motion));
      }
    },
  };
  return beacons;
}
