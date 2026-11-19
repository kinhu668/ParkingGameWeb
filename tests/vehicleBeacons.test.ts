// 警報燈與救護車燈條的疊加層：平常一個實例都不畫；被撞的那一台才亮，用的是車身同一個矩陣；
// 燈條照 lightbarState 左右交替；地上的光與點光源跟著畫質設定；鏡片的幾何落在車身的外框裡。
import {
  AdditiveBlending,
  Box3,
  Color,
  Group,
  InstancedBufferGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  ShaderMaterial,
  Vector3,
} from 'three';
import { describe, expect, test } from 'vitest';
import { ALARM_RULES } from '../src/core/gameConfig';
import { ftToM } from '../src/core/units';
import {
  createParkedCarLampGeometry,
  createVehicleBeacons,
  lampGlowPoints,
} from '../src/effects/vehicleBeacons';
import { NO_ALARMS, alarmKinds, stepAlarms, type AlarmState } from '../src/level/alarm';
import {
  ambulanceLampGlowsFt,
  createAmbulanceGeometry,
  createAmbulanceLampGeometry,
} from '../src/props/ambulance';
import { createDeliveryVanGeometry, createDeliveryVanLampGeometry } from '../src/props/deliveryVan';
import {
  createObstacleMeshes,
  obstacleInstances,
  type ObstacleSource,
} from '../src/props/obstacleMeshes';
import { createSurfSuvGeometry, createSurfSuvLampGeometry } from '../src/props/surfSuv';
import { SKIP_AMBIENT_OCCLUSION } from '../src/render/ambientOcclusionFlag';
import { SKIP_GROUND_REFLECTION } from '../src/render/groundReflectionFlag';
import { CAR_MODEL_IDS, carModelDimsM } from '../src/vehicle/carModels';

const CAR = { widthFt: 6, lengthFt: 15.5 };
const SOURCE: ObstacleSource = {
  obstaclesFt: [
    { type: 'cone', centerXFt: 0, centerZFt: 0, headingDeg: 0, widthFt: 1.5, lengthFt: 1.5 },
    { type: 'parked_car', centerXFt: 20, centerZFt: 0, headingDeg: 0, model: 'sedan', ...CAR },
    { type: 'parked_car', centerXFt: 30, centerZFt: 4, headingDeg: 90, model: 'sedan', ...CAR },
    { type: 'parked_car', centerXFt: 40, centerZFt: 0, headingDeg: 180, model: 'rally', ...CAR },
    { type: 'delivery_van', centerXFt: -30, centerZFt: 12, headingDeg: 90, widthFt: 7, lengthFt: 20 },
    { type: 'surf_suv', centerXFt: -30, centerZFt: 30, headingDeg: 0, widthFt: 6.5, lengthFt: 16 },
    { type: 'ambulance', centerXFt: -50, centerZFt: 2.6, headingDeg: 90, widthFt: 7, lengthFt: 20 },
  ],
};
const KINDS = alarmKinds(SOURCE.obstaclesFt);
const NO_GLOW = { groundPool: false, spotLights: 0 };

function build(
  lights = NO_GLOW,
  hdr = false,
  night = true,
): { obstacles: Group; root: Group; update: (alarms: AlarmState, motion?: 'flash' | 'steady' | 'frozen') => void } {
  const obstacles = createObstacleMeshes(SOURCE, 'low');
  const beacons = createVehicleBeacons(obstacles, 'low', lights, hdr, night);
  return {
    obstacles,
    root: beacons.root,
    update: (alarms, motion = 'flash') => {
      beacons.update(alarms, motion);
    },
  };
}

function overlay(root: Group, name: string): InstancedMesh {
  const mesh = root.getObjectByName(`beacon:${name}`);
  if (!(mesh instanceof InstancedMesh)) {
    throw new Error(`沒有 beacon:${name}`);
  }
  return mesh;
}

function hit(state: AlarmState, ...indices: number[]): AlarmState {
  return stepAlarms(state, 0, indices, KINDS);
}

const CAR_OVERLAYS = ['parked_car:sedan', 'parked_car:rally', 'delivery_van', 'surf_suv'];

describe('警報燈的疊加層', () => {
  test('每一款有車的車款、貨車、休旅車各一個，救護車三個；沒有車的車款不建', () => {
    const { root } = build();
    expect(root.children.map((child) => child.name).sort()).toEqual(
      [...CAR_OVERLAYS, 'ambulance:left', 'ambulance:right', 'ambulance:rear', 'glow']
        .map((name) => `beacon:${name}`)
        .sort(),
    );
  });

  test('沒有會響的車就什麼都不建', () => {
    const obstacles = createObstacleMeshes(
      { obstaclesFt: [{ type: 'cone', centerXFt: 0, centerZFt: 0, headingDeg: 0, widthFt: 1.5, lengthFt: 1.5 }] },
      'low',
    );
    expect(createVehicleBeacons(obstacles, 'low', { groundPool: true, spotLights: 2 }, true, true).root.children).toEqual([]);
  });

  test('沒有警報時車的燈一個實例都不畫', () => {
    const { root, update } = build();
    update(NO_ALARMS);
    for (const name of CAR_OVERLAYS) {
      expect(overlay(root, name).count, name).toBe(0);
      expect(overlay(root, name).visible, name).toBe(false);
    }
  });

  test('被撞的那一台才亮，矩陣就是車身的矩陣；同款的另一台不亮', () => {
    const { obstacles, root, update } = build();
    const alarms = hit(NO_ALARMS, 2);
    update(alarms);
    const sedans = overlay(root, 'parked_car:sedan');
    expect(sedans.count).toBe(1);
    expect(sedans.visible).toBe(true);
    const shown = new Matrix4();
    sedans.getMatrixAt(0, shown);
    const body = obstacleInstances(obstacles, 'parkedCars:sedan:rest').find((car) => car.index === 2);
    expect(body).toBeDefined();
    expect(shown.equals(body?.matrix ?? new Matrix4())).toBe(true);
    expect(overlay(root, 'parked_car:rally').count).toBe(0);
    expect(overlay(root, 'delivery_van').count).toBe(0);
  });

  test('跟著相位一明一暗；減少動態效果時恆亮；響完就熄', () => {
    const { root, update } = build();
    const sedans = overlay(root, 'parked_car:sedan');
    let alarms = hit(NO_ALARMS, 1);
    update(alarms);
    expect(sedans.count).toBe(1);
    alarms = stepAlarms(alarms, ALARM_RULES.flashPeriodS * 0.75, [], KINDS);
    update(alarms);
    expect(sedans.count).toBe(0);
    expect(sedans.visible).toBe(false);
    update(alarms, 'steady');
    expect(sedans.count).toBe(1);
    update(alarms, 'frozen');
    expect(sedans.count).toBe(1);
    update(stepAlarms(alarms, ALARM_RULES.durationS, [], KINDS), 'steady');
    expect(sedans.count).toBe(0);
  });

  test('兩台同款都在響就兩個實例；貨車與休旅車各自亮', () => {
    const { root, update } = build();
    update(hit(NO_ALARMS, 1, 2, 4, 5));
    expect(overlay(root, 'parked_car:sedan').count).toBe(2);
    expect(overlay(root, 'delivery_van').count).toBe(1);
    expect(overlay(root, 'surf_suv').count).toBe(1);
    expect(overlay(root, 'parked_car:rally').count).toBe(0);
  });

  test('撞到交通錐或邊界牆（索引超出障礙物）不亮任何燈', () => {
    const { root, update } = build();
    update(hit(NO_ALARMS, 0, SOURCE.obstaclesFt.length + 2));
    for (const name of CAR_OVERLAYS) {
      expect(overlay(root, name).count, name).toBe(0);
    }
  });

  test('疊加層不受光、用頂點顏色、往鏡頭偏一點深度', () => {
    const { root } = build();
    const { material } = overlay(root, 'delivery_van');
    expect(material).toBeInstanceOf(MeshBasicMaterial);
    const basic = material as MeshBasicMaterial;
    expect(basic.vertexColors).toBe(true);
    expect(basic.polygonOffset).toBe(true);
    expect(basic.polygonOffsetFactor).toBeLessThan(0);
    expect(basic.toneMapped).toBe(false);
  });
});

describe('救護車的燈條', () => {
  const lit = (root: Group): Record<'left' | 'right' | 'rear', number> => ({
    left: overlay(root, 'ambulance:left').count,
    right: overlay(root, 'ambulance:right').count,
    rear: overlay(root, 'ambulance:rear').count,
  });

  test('定格（相位 0）只有左組亮', () => {
    const { root, update } = build();
    update(stepAlarms(NO_ALARMS, 0.6, [], KINDS), 'frozen');
    expect(lit(root)).toEqual({ left: 1, right: 0, rear: 0 });
  });

  test('待機時左右交替，琥珀燈晚四分之一個週期', () => {
    const { root, update } = build();
    const at = (timeS: number): Record<'left' | 'right' | 'rear', number> => {
      update(stepAlarms(NO_ALARMS, timeS * ALARM_RULES.lightbarIdlePeriodS, [], KINDS));
      return lit(root);
    };
    expect(at(0.1)).toEqual({ left: 1, right: 0, rear: 0 });
    expect(at(0.3)).toEqual({ left: 1, right: 0, rear: 1 });
    expect(at(0.6)).toEqual({ left: 0, right: 1, rear: 1 });
    expect(at(0.9)).toEqual({ left: 0, right: 1, rear: 0 });
  });

  test('被撞之後（警戒）更亮；減少動態效果時三組恆亮', () => {
    const { root, update } = build();
    const level = (): number => {
      const color = new Color();
      overlay(root, 'ambulance:left').getColorAt(0, color);
      return color.r;
    };
    update(NO_ALARMS);
    expect(level()).toBeCloseTo(1, 6);
    update(hit(NO_ALARMS, 6));
    expect(level()).toBeCloseTo(ALARM_RULES.lightbarAlertLevel, 6);
    update(hit(NO_ALARMS, 6), 'steady');
    expect(lit(root)).toEqual({ left: 1, right: 1, rear: 1 });
  });

  test('高動態範圍的級別鏡片更亮（泛光才帶得出光暈）', () => {
    const { root, update } = build(NO_GLOW, true);
    update(NO_ALARMS);
    const color = new Color();
    overlay(root, 'ambulance:left').getColorAt(0, color);
    expect(color.r).toBeGreaterThan(1.5);
  });

  test('地上的光：畫質有開才有，左紅右白各一片，跟著那一組亮；不進倒影與環境光遮蔽', () => {
    expect(build().root.getObjectByName('lightbarPool')).toBeUndefined();
    const { root, update } = build({ groundPool: true, spotLights: 0 });
    const pools = root.children.filter((child): child is Mesh => child.name === 'lightbarPool');
    expect(pools).toHaveLength(2);
    for (const pool of pools) {
      expect(pool.userData[SKIP_GROUND_REFLECTION]).toBe(true);
      expect(pool.userData[SKIP_AMBIENT_OCCLUSION]).toBe(true);
      expect(pool.castShadow).toBe(false);
      pool.geometry.computeBoundingBox();
      const box = pool.geometry.boundingBox ?? new Box3();
      expect(box.max.x - box.min.x).toBeCloseTo(2 * ftToM(14), 5);
      // 貼在地面上一點點，在救護車附近（車心在 x = −50 ft、z = 2.6 ft）。
      expect(pool.position.y).toBeGreaterThan(0);
      expect(pool.position.y).toBeLessThan(ftToM(0.2));
      expect(Math.hypot(pool.position.x - ftToM(-50), pool.position.z - ftToM(2.6))).toBeLessThan(ftToM(8));
    }
    update(NO_ALARMS, 'frozen');
    expect(pools.map((pool) => pool.visible)).toEqual([true, false]);
    update(stepAlarms(NO_ALARMS, 0.6 * ALARM_RULES.lightbarIdlePeriodS, [], KINDS));
    expect(pools.map((pool) => pool.visible)).toEqual([false, true]);
    expect(root.getObjectByName('lightbarLight')).toBeUndefined();
  });

  test('點光源：畫質有開真光源才有，整關一盞、不投影，只改顏色與強度', () => {
    const { root, update } = build({ groundPool: false, spotLights: 1 });
    const lights = root.children.filter((child): child is PointLight => child instanceof PointLight);
    expect(lights).toHaveLength(1);
    const [light] = lights;
    expect(light?.castShadow).toBe(false);
    // 在車頂燈條上方。
    expect(light?.position.y).toBeGreaterThan(ftToM(9));
    update(NO_ALARMS, 'frozen');
    const idle = light?.intensity ?? 0;
    expect(idle).toBeGreaterThan(0);
    const red = light?.color.clone();
    update(stepAlarms(NO_ALARMS, 0.6 * ALARM_RULES.lightbarIdlePeriodS, [], KINDS));
    expect(light?.color.equals(red ?? new Color())).toBe(false);
    update(hit(NO_ALARMS, 6));
    expect(light?.intensity).toBeCloseTo(idle * ALARM_RULES.lightbarAlertLevel, 6);
  });
});

describe('燈周圍的光暈', () => {
  const AMBULANCE = 6;
  function glowMesh(root: Group): Mesh<InstancedBufferGeometry, ShaderMaterial> {
    const mesh = root.getObjectByName('beacon:glow');
    if (!(mesh instanceof Mesh)) {
      throw new Error('沒有 beacon:glow');
    }
    return mesh as Mesh<InstancedBufferGeometry, ShaderMaterial>;
  }
  /** 目前畫出來的每一圈：世界座標的中心、直徑、顏色（已乘亮度）。 */
  function shown(root: Group): { center: Vector3; sizeM: number; tint: Color }[] {
    const { geometry } = glowMesh(root);
    const place = geometry.getAttribute('glow');
    const tint = geometry.getAttribute('tint');
    return Array.from({ length: geometry.instanceCount }, (_, slot) => ({
      center: new Vector3(place.getX(slot), place.getY(slot), place.getZ(slot)),
      sizeM: place.getW(slot),
      tint: new Color(tint.getX(slot), tint.getY(slot), tint.getZ(slot)),
    }));
  }

  test('定格時只有救護車左組的燈有光暈：每顆鏡片一圈，車頂燈條的半邊合成一圈大的', () => {
    const { obstacles, root, update } = build();
    update(NO_ALARMS, 'frozen');
    const left = ambulanceLampGlowsFt().left;
    const glows = shown(root);
    expect(glows).toHaveLength(left.length);
    expect(glowMesh(root).visible).toBe(true);
    // 中心就是車身矩陣把本地座標換到世界座標的位置；最大的一圈在車頂燈條上、偏紅。
    const body = obstacleInstances(obstacles, 'obstacle:ambulance').find((car) => car.index === AMBULANCE);
    const [bar] = left;
    const expected = new Vector3(ftToM(bar?.x ?? 0), ftToM(bar?.y ?? 0), ftToM(bar?.z ?? 0)).applyMatrix4(
      body?.matrix ?? new Matrix4(),
    );
    const biggest = glows.reduce((a, b) => (b.sizeM > a.sizeM ? b : a));
    expect(biggest.center.distanceTo(expected)).toBeLessThan(1e-4);
    expect(biggest.center.y).toBeGreaterThan(ftToM(8.3));
    expect(biggest.sizeM).toBeCloseTo(ftToM(bar?.sizeFt ?? 0), 5);
    expect(biggest.tint.r).toBeGreaterThan(biggest.tint.b * 2);
  });

  test('左右交替時光暈跟著換邊；右半的燈條是白的', () => {
    const { root, update } = build();
    update(stepAlarms(NO_ALARMS, 0.9 * ALARM_RULES.lightbarIdlePeriodS, [], KINDS));
    const glows = shown(root);
    expect(glows).toHaveLength(ambulanceLampGlowsFt().right.length);
    const biggest = glows.reduce((a, b) => (b.sizeM > a.sizeM ? b : a));
    expect(biggest.tint.b).toBeGreaterThan(biggest.tint.r * 0.8);
  });

  test('被撞的車四個角落各多一圈，暗的半個週期收回去；沒有任何燈亮就整個不畫', () => {
    const source: ObstacleSource = { obstaclesFt: SOURCE.obstaclesFt.slice(0, 4) };
    const obstacles = createObstacleMeshes(source, 'low');
    const beacons = createVehicleBeacons(obstacles, 'low', NO_GLOW, false, true);
    const kinds = alarmKinds(source.obstaclesFt);
    beacons.update(NO_ALARMS, 'flash');
    expect(glowMesh(beacons.root).visible).toBe(false);
    expect(glowMesh(beacons.root).geometry.instanceCount).toBe(0);
    let alarms = stepAlarms(NO_ALARMS, 0, [1], kinds);
    beacons.update(alarms, 'flash');
    const glows = shown(beacons.root);
    expect(glows).toHaveLength(4);
    // 那台車在 x = 20 ft：四圈都在它的外框附近、離地不到車頂。
    for (const glow of glows) {
      expect(Math.abs(glow.center.x - ftToM(20))).toBeLessThan(ftToM(3.2));
      expect(Math.abs(glow.center.z)).toBeLessThan(ftToM(8));
      expect(glow.center.y).toBeGreaterThan(ftToM(1));
      expect(glow.center.y).toBeLessThan(ftToM(4));
    }
    alarms = stepAlarms(alarms, ALARM_RULES.flashPeriodS * 0.75, [], kinds);
    beacons.update(alarms, 'flash');
    expect(glowMesh(beacons.root).geometry.instanceCount).toBe(0);
    expect(glowMesh(beacons.root).visible).toBe(false);
  });

  test('加色、不寫深度、不做色調映射、不進環境光遮蔽；不做視錐剔除（頂點在著色器裡才攤開）', () => {
    const mesh = glowMesh(build().root);
    expect(mesh.material.blending).toBe(AdditiveBlending);
    expect(mesh.material.depthWrite).toBe(false);
    expect(mesh.material.depthTest).toBe(true);
    expect(mesh.material.toneMapped).toBe(false);
    expect(mesh.frustumCulled).toBe(false);
    expect(mesh.castShadow).toBe(false);
    expect(mesh.userData[SKIP_AMBIENT_OCCLUSION]).toBe(true);
  });

  test('白天比夜裡淡；高動態範圍的級別比較亮', () => {
    const level = (hdr: boolean, night: boolean): number => {
      const { root, update } = build(NO_GLOW, hdr, night);
      update(NO_ALARMS, 'frozen');
      return Math.max(...shown(root).map((glow) => glow.tint.r));
    };
    expect(level(false, false)).toBeLessThan(level(false, true) * 0.6);
    expect(level(true, true)).toBeGreaterThan(level(false, true));
  });

  test.each(CAR_MODEL_IDS)('%s：鏡片分成四個角落，車頭的光偏白、車尾的偏紅', (model) => {
    const points = lampGlowPoints(createParkedCarLampGeometry(model, 'low'));
    expect(points).toHaveLength(4);
    const dims = carModelDimsM(model);
    for (const point of points) {
      expect(Math.abs(point.position.x)).toBeLessThanOrEqual(dims.widthM / 2 + 0.02);
      expect(Math.abs(point.position.z)).toBeGreaterThan(dims.lengthM / 4);
      expect(point.sizeM).toBeGreaterThanOrEqual(ftToM(1.8) - 1e-9);
      expect(point.sizeM).toBeLessThanOrEqual(ftToM(3.4) + 1e-9);
      // 本地 −Z 是車頭。
      if (point.position.z < 0) {
        expect(point.color.g).toBeGreaterThan(point.color.r * 0.5);
      } else {
        expect(point.color.r).toBeGreaterThan(point.color.b * 2);
      }
    }
  });
});

describe('亮起來的鏡片的幾何', () => {
  test.each(CAR_MODEL_IDS)('%s：有頂點顏色，落在這款車的外框裡', (model) => {
    const geometry = createParkedCarLampGeometry(model, 'low');
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0);
    expect(geometry.getAttribute('color').count).toBe(geometry.getAttribute('position').count);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox ?? new Box3();
    const dims = carModelDimsM(model);
    const slack = 0.02;
    expect(box.min.x).toBeGreaterThanOrEqual(-dims.widthM / 2 - slack);
    expect(box.max.x).toBeLessThanOrEqual(dims.widthM / 2 + slack);
    expect(box.min.z).toBeGreaterThanOrEqual(-dims.lengthM / 2 - slack);
    expect(box.max.z).toBeLessThanOrEqual(dims.lengthM / 2 + slack);
    expect(box.min.y).toBeGreaterThan(0);
    expect(box.max.y).toBeLessThanOrEqual(dims.heightM + slack);
    // 車頭與車尾都有燈。
    expect(box.min.z).toBeLessThan(-dims.lengthM / 4);
    expect(box.max.z).toBeGreaterThan(dims.lengthM / 4);
  });

  test.each([
    ['delivery_van', createDeliveryVanGeometry, (): Box3 => bounds(createDeliveryVanLampGeometry())],
    ['surf_suv', createSurfSuvGeometry, (): Box3 => bounds(createSurfSuvLampGeometry())],
    [
      'ambulance',
      createAmbulanceGeometry,
      (): Box3 => {
        const { left, right, rear } = createAmbulanceLampGeometry();
        return bounds(left).union(bounds(right)).union(bounds(rear));
      },
    ],
  ] as const)('%s：鏡片貼在車身上（最多凸出 0.03 英尺）', (_name, body, lamps) => {
    const outline = bounds(body()).expandByScalar(ftToM(0.03));
    expect(outline.containsBox(lamps())).toBe(true);
  });
});

function bounds(geometry: { computeBoundingBox(): void; boundingBox: Box3 | null }): Box3 {
  geometry.computeBoundingBox();
  return (geometry.boundingBox ?? new Box3()).clone();
}
