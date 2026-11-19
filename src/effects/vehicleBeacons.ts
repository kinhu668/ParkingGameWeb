// 車輛的警報燈與救護車的燈條（純視覺）：亮起來的鏡片是疊在車身上的另一層網格，不發光也不受光（不看燈光、頂點顏色就是亮的顏色）。
// 每一款停放的車、包裹貨車、衝浪休旅車各一個 InstancedMesh，救護車三個（左、右、車尾的琥珀燈）；
// 用與車身同一個實例矩陣，沒有燈亮的時候一個實例都不畫。誰亮、亮多少只看 level/alarm.ts 的狀態。
// 每顆亮著的燈周圍另有一圈光暈（永遠正對鏡頭的加色方片，整關一個 draw call，每個畫質級別都有）：
// 夜裡遠遠看得出哪一台在閃，靠的是這一圈光。
// 救護車另外有打在地上的光（畫質有開地面光斑才有）與一盞不投影的點光源（畫質有開真光源才有）。
// 已知的小缺點：跟車鏡頭把車身淡成半透明時，亮著的鏡片與光暈不跟著淡。
import {
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
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
import { ambulanceLampGlowsFt, createAmbulanceLampGeometry } from '../props/ambulance';
import { LENS, createDeliveryVanLampGeometry } from '../props/deliveryVan';
import { obstacleInstances, type ObstacleInstance } from '../props/obstacleMeshes';
import { createSurfSuvLampGeometry } from '../props/surfSuv';
import { SKIP_AMBIENT_OCCLUSION } from '../render/ambientOcclusionFlag';
import { SKIP_GROUND_REFLECTION } from '../render/groundReflectionFlag';
import type { HeadlightQualitySettings, VehicleDetail } from '../render/quality';
import { createCarModelParts, type CarModelPart } from '../vehicle/carModelParts';
import { CAR_MODEL_IDS, type CarModelId } from '../vehicle/carModels';

const BEACON = {
  /** 亮起來的鏡片的亮度倍數：走高動態範圍後製鏈的級別調高，泛光才帶得出光暈。 */
  lampBrightness: { hdr: 2.4, direct: 1 },
  /** 燈周圍的光暈：亮度、白天（路燈沒亮的天氣）的倍率。 */
  glowBrightness: { hdr: 2.6, direct: 0.6 },
  glowDayScale: 0.4,
  /** 光暈沿視線往鏡頭拉近多少：畫面上的位置不變，但不會被燈所在的車身切掉一半。 */
  glowPullM: ftToM(4),
  /** 車燈的光暈直徑 = 那一角鏡片外框較長的一邊 × 這個倍數，夾在下面兩個值之間。 */
  carGlowScale: 2.4,
  carGlowMinM: ftToM(1.8),
  carGlowMaxM: ftToM(3.4),
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

/** 光斑畫在地面與標線之後（與玩家車頭燈的光斑同一層）；光暈再晚一層。 */
const POOL_RENDER_ORDER = 2;
const GLOW_RENDER_ORDER = 3;

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

/** 一圈光暈在模型本地座標的位置（公尺）、直徑與顏色（線性色彩）。 */
export interface GlowPoint {
  readonly position: Vector3;
  readonly sizeM: number;
  readonly color: Color;
}

/** 場景裡的一圈光暈：世界座標的位置，以及跟著哪個障礙物的哪一組燈亮。 */
interface Glow extends GlowPoint {
  readonly index: number;
  readonly level: LampLevel;
}

/** 救護車打在地上的一片光，或那盞點光源：跟著哪台救護車。 */
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
export function createParkedCarLampGeometry(model: CarModelId, detail: VehicleDetail): BufferGeometry {
  const { body } = createCarModelParts(model, detail);
  return mergeGeometries(
    CAR_LAMPS.flatMap(([part, color]) => {
      const geometry = body.get(part);
      return geometry === undefined ? [] : [litPiece(geometry, color)];
    }),
  );
}

/**
 * 一台車亮起來的鏡片四個角落（左前、右前、左後、右後）各一圈光暈：
 * 中心是那一角鏡片的外框中心，顏色是那一角鏡片的平均顏色（車頭偏暖白、車尾偏紅）。
 * @param geometry 亮起來的鏡片（車身的本地座標、有頂點顏色）
 */
export function lampGlowPoints(geometry: BufferGeometry): GlowPoint[] {
  const position = geometry.getAttribute('position');
  const color = geometry.getAttribute('color');
  const corners = new Map<number, { readonly box: Box3; readonly sum: Color; count: number }>();
  const point = new Vector3();
  const tint = new Color();
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    point.fromBufferAttribute(position, vertex);
    const key = (point.x < 0 ? 0 : 1) + (point.z < 0 ? 0 : 2);
    let corner = corners.get(key);
    if (corner === undefined) {
      corner = { box: new Box3(), sum: new Color(0, 0, 0), count: 0 };
      corners.set(key, corner);
    }
    corner.box.expandByPoint(point);
    corner.sum.add(tint.fromBufferAttribute(color, vertex));
    corner.count += 1;
  }
  return [...corners.values()].map(({ box, sum, count }) => {
    const size = box.getSize(new Vector3());
    return {
      position: box.getCenter(new Vector3()),
      sizeM: Math.min(
        Math.max(BEACON.carGlowScale * Math.max(size.x, size.y), BEACON.carGlowMinM),
        BEACON.carGlowMaxM,
      ),
      color: sum.multiplyScalar(1 / count),
    };
  });
}

/** 救護車某一組警示燈的光暈（公尺；位置與顏色來自 ambulance.ts 的警示燈表）。 */
function ambulanceGlowPoints(group: 'left' | 'right' | 'rear'): GlowPoint[] {
  return ambulanceLampGlowsFt()[group].map(({ x, y, z, sizeFt, color }) => ({
    position: new Vector3(ftToM(x), ftToM(y), ftToM(z)),
    sizeM: ftToM(sizeFt),
    color: new Color(color),
  }));
}

const GLOW_VERTEX_SHADER = /* glsl */ `
  attribute vec4 glow;
  attribute vec3 tint;
  uniform float pull;
  varying vec2 vOffset;
  varying vec3 vTint;

  void main() {
    // 永遠正對鏡頭的方片：中心（glow.xyz，世界座標）先換到鏡頭座標，再往四個角攤開（glow.w 是直徑）。
    vec3 corner = ( viewMatrix * vec4( glow.xyz, 1.0 ) ).xyz + vec3( position.xy * glow.w, 0.0 );
    // 沿視線往鏡頭拉近：畫面上的位置不變，但不會被燈所在的車身切掉一半；更靠近鏡頭的東西照樣擋得住它。
    corner *= max( 0.0, 1.0 - pull / length( corner ) );
    gl_Position = projectionMatrix * vec4( corner, 1.0 );
    vOffset = position.xy * 2.0;
    vTint = tint;
  }
`;

const GLOW_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vOffset;
  varying vec3 vTint;

  void main() {
    // 中心一小團亮的，外面一圈往邊緣淡到 0（方片的邊看不出來）。
    float fromCenter = length( vOffset );
    float halo = max( 0.0, 1.0 - fromCenter );
    float core = max( 0.0, 1.0 - fromCenter * 3.0 );
    gl_FragColor = vec4( vTint * ( halo * halo + core * core ), 1.0 );
    // 直接畫到畫面上（low、medium）時轉成 sRGB，畫進後製鏈的緩衝區時維持線性；不做色調映射。
    #include <colorspace_fragment>
  }
`;

/** 全部光暈共用的網格：每個實例一圈（glow = 世界座標的中心 + 直徑、tint = 顏色 × 亮度），一開始一個都不畫。 */
function createGlowMesh(capacity: number): Mesh<InstancedBufferGeometry, ShaderMaterial> {
  const quad = new PlaneGeometry(1, 1);
  const geometry = new InstancedBufferGeometry();
  geometry.setIndex(quad.getIndex());
  geometry.setAttribute('position', quad.getAttribute('position'));
  geometry.setAttribute('glow', new InstancedBufferAttribute(new Float32Array(capacity * 4), 4));
  geometry.setAttribute('tint', new InstancedBufferAttribute(new Float32Array(capacity * 3), 3));
  geometry.instanceCount = 0;
  const mesh = new Mesh(
    geometry,
    new ShaderMaterial({
      name: 'BeaconGlowShader',
      uniforms: { pull: { value: BEACON.glowPullM } },
      vertexShader: GLOW_VERTEX_SHADER,
      fragmentShader: GLOW_FRAGMENT_SHADER,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  mesh.name = 'beacon:glow';
  mesh.visible = false;
  // 頂點在著色器裡才攤開，幾何的外框沒有意義。
  mesh.frustumCulled = false;
  mesh.renderOrder = GLOW_RENDER_ORDER;
  // 沒有實體表面：不畫進環境光遮蔽那一遍（那一遍的深度也給光柱用）。
  mesh.userData[SKIP_AMBIENT_OCCLUSION] = true;
  return mesh;
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
 * @param hdr 這個級別是不是走高動態範圍的後製鏈（決定鏡片、光暈與光斑的亮度）
 * @param night 天黑、路燈亮著的天氣：光暈全開；白天只留淡淡的一圈
 */
export function createVehicleBeacons(
  obstacles: Group,
  detail: VehicleDetail,
  lights: HeadlightQualitySettings,
  hdr: boolean,
  night: boolean,
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
  const glows: Glow[] = [];
  /** 一種車（或救護車的一組燈）的疊加層與光暈；場景裡沒有這種車就什麼都不建。 */
  const addLamps = (
    name: string,
    meshName: string,
    geometry: () => BufferGeometry,
    glowPoints: (geometry: BufferGeometry) => readonly GlowPoint[],
    level: LampLevel,
  ): readonly ObstacleInstance[] => {
    const instances = obstacleInstances(obstacles, meshName);
    if (instances.length === 0) {
      return instances;
    }
    const lit = geometry();
    const mesh = new InstancedMesh(lit, material, instances.length);
    mesh.name = `beacon:${name}`;
    mesh.count = 0;
    mesh.visible = false;
    // 實例每幀可能換位置（只留亮著的），外框不重算，乾脆不做視錐剔除（整關只有幾個這種網格）。
    mesh.frustumCulled = false;
    root.add(mesh);
    overlays.push({ mesh, instances, level, shown: '' });
    const points = glowPoints(lit);
    for (const { index, matrix } of instances) {
      for (const point of points) {
        glows.push({ ...point, position: point.position.clone().applyMatrix4(matrix), index, level });
      }
    }
    return instances;
  };

  for (const model of CAR_MODEL_IDS) {
    addLamps(
      `parked_car:${model}`,
      `parkedCars:${model}:rest`,
      () => createParkedCarLampGeometry(model, detail),
      lampGlowPoints,
      carLampLevel,
    );
  }
  addLamps('delivery_van', 'obstacle:delivery_van', createDeliveryVanLampGeometry, lampGlowPoints, carLampLevel);
  addLamps('surf_suv', 'obstacle:surf_suv', createSurfSuvLampGeometry, lampGlowPoints, carLampLevel);

  let barGeometry: ReturnType<typeof createAmbulanceLampGeometry> | undefined;
  const addBar = (group: 'left' | 'right' | 'rear'): readonly ObstacleInstance[] =>
    addLamps(
      `ambulance:${group}`,
      'obstacle:ambulance',
      () => {
        barGeometry ??= createAmbulanceLampGeometry();
        return barGeometry[group];
      },
      () => ambulanceGlowPoints(group),
      barLampLevel(group),
    );
  const ambulances = addBar('left');
  addBar('right');
  addBar('rear');

  const glowMesh = glows.length > 0 ? createGlowMesh(glows.length) : undefined;
  if (glowMesh !== undefined) {
    root.add(glowMesh);
  }
  const glowBrightness =
    (hdr ? BEACON.glowBrightness.hdr : BEACON.glowBrightness.direct) *
    (night ? 1 : BEACON.glowDayScale);
  let glowsShown = '';

  // 燈條照在地上的光：左紅、右白，各一片；只有那一組亮著的時候才畫。
  const barGlows: BarGlow[] = [];
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
        barGlows.push({
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
    barGlows.push({
      index: first.index,
      show(lamps) {
        light.color.copy(lamps.left && lamps.right ? both : lamps.left ? red : white);
        light.intensity = lamps.left || lamps.right ? BEACON.lightIntensity * lamps.level : 0;
      },
    });
  }

  const tint = new Color();
  /** 上一次更新時沒有警報、這一關也沒有救護車：所有的燈都已經關掉，之後不必再算。 */
  let allOff = false;
  return {
    root,
    update(alarms, motion) {
      const quiet = alarms.active.length === 0 && ambulances.length === 0;
      if (quiet && allOff) {
        return;
      }
      allOff = quiet;
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

      if (glowMesh !== undefined) {
        const levels = glows.map((glow) => glow.level(glow.index, alarms, motion));
        const key = levels.join();
        if (key !== glowsShown) {
          glowsShown = key;
          const place = glowMesh.geometry.getAttribute('glow');
          const color = glowMesh.geometry.getAttribute('tint');
          let lit = 0;
          glows.forEach((glow, slot) => {
            const level = levels[slot] ?? 0;
            if (level > 0) {
              place.setXYZW(lit, glow.position.x, glow.position.y, glow.position.z, glow.sizeM);
              tint.copy(glow.color).multiplyScalar(level * glowBrightness);
              color.setXYZ(lit, tint.r, tint.g, tint.b);
              lit += 1;
            }
          });
          glowMesh.geometry.instanceCount = lit;
          glowMesh.visible = lit > 0;
          place.needsUpdate = true;
          color.needsUpdate = true;
        }
      }

      for (const glow of barGlows) {
        glow.show(lightbarState(alarms.clockS, lightbarMode(alarms, glow.index), motion));
      }
    },
  };
}
