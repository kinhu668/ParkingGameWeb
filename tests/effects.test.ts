// 動態小效果：倒車輪胎痕（只在倒車時留、有上限、會淡掉）、灰塵（只在車動時揚起、有上限、可重現）、
// 落葉（數量跟著畫質、位置可重現、避開通路與目標車位），以及它們「純視覺」的網格設定。不開 WebGL。
import {
  InstancedMesh,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  ShaderLib,
} from 'three';
import { describe, expect, test } from 'vitest';
import { FIXED_STEP_SECONDS, DEFAULT_SEED } from '../src/core/gameConfig';
import { forward, right } from '../src/core/heading';
import { degToRad, ftToM } from '../src/core/units';
import {
  createDust,
  createDustCloud,
  dustOpacity,
  dustSpritePixels,
  patchDustVertexShader,
} from '../src/effects/dust';
import { createLeafField, createLeaves } from '../src/effects/leaves';
import { createSceneEffects } from '../src/effects/sceneEffects';
import {
  TIRE_MARK_FLOATS_PER_SEGMENT,
  createTireMarkTrail,
  createTireMarks,
  rearWheelContacts,
  tireMarkOpacity,
} from '../src/effects/tireMarks';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import { curbInnerBounds } from '../src/props/lotEdges';
import { lotKeepOutZones, pointInKeepOut, worldToSpotLocal } from '../src/props/lotLayout';
import { SKIP_AMBIENT_OCCLUSION } from '../src/render/ambientOcclusionFlag';
import { RAIN_CONFIG } from '../src/render/weatherPresets';
import { QUALITY_LEVELS } from '../src/render/quality';
import {
  CAR_VISUAL_CONFIG,
  PARTICLE_CONFIG,
  QUALITY_PRESETS,
  SPOT_MARKING_CONFIG,
  TIRE_MARK_CONFIG,
} from '../src/render/renderConfig';
import type { VehiclePose } from '../src/vehicle/bicycleModel';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';

const DT = FIXED_STEP_SECONDS;
const SPOT = PROTOTYPE_LAYOUT.spot;
const START = PROTOTYPE_LAYOUT.startState;
const HIGH = QUALITY_PRESETS.high;

function poseAt(x: number, z: number, headingDeg = 0, steerDeg = 0): VehiclePose {
  return { x, z, headingRad: degToRad(headingDeg), steerRad: degToRad(steerDeg) };
}

/** 從 from 沿車頭方向每步走 stepM（負值 = 倒車）共 steps 步的姿態（不含 from 本身）。 */
function straightRun(from: VehiclePose, stepM: number, steps: number): VehiclePose[] {
  const ahead = forward(from.headingRad);
  return Array.from({ length: steps }, (_, index) => ({
    ...from,
    x: from.x + ahead.x * stepM * (index + 1),
    z: from.z + ahead.z * stepM * (index + 1),
  }));
}

describe('倒車輪胎痕 tireMarks', () => {
  const settings = { maxSegments: 40, lifetimeS: 8 };
  /** 每步倒退 0.05 m（60 Hz 下約 6.7 mph）。 */
  const REVERSE_STEP_M = -0.05;

  test('後輪著地點：在車身中心後方半個軸距、左右對稱於車身中線、落在輪胎的寬度內', () => {
    for (const headingDeg of [0, 70, 200]) {
      const pose = poseAt(3, -4, headingDeg);
      const wheels = rearWheelContacts(pose);
      const ahead = forward(pose.headingRad);
      const side = right(pose.headingRad);
      for (const [wheel, sign] of [
        [wheels.left, -1],
        [wheels.right, 1],
      ] as const) {
        const dx = wheel.x - pose.x;
        const dz = wheel.z - pose.z;
        expect(dx * ahead.x + dz * ahead.z).toBeCloseTo(-VEHICLE_CONFIG_SI.wheelbaseM / 2, 9);
        const lateralM = (dx * side.x + dz * side.z) * sign;
        expect(lateralM).toBeGreaterThan(VEHICLE_CONFIG_SI.widthM / 2 - ftToM(1.2));
        expect(lateralM).toBeLessThan(VEHICLE_CONFIG_SI.widthM / 2);
      }
      expect((wheels.left.x + wheels.right.x) / 2 - pose.x).toBeCloseTo(
        -ahead.x * (VEHICLE_CONFIG_SI.wheelbaseM / 2),
        9,
      );
    }
  });

  test('前進、靜止、原地轉向、瞬移都不留痕', () => {
    const trail = createTireMarkTrail(settings);
    const start = poseAt(0, 0);
    trail.advance(start, DT);
    for (const pose of straightRun(start, 0.1, 120)) {
      expect(trail.advance(pose, DT)).toBe(0);
    }
    const stopped = poseAt(0, -12);
    for (let step = 0; step < 30; step += 1) {
      expect(trail.advance(stopped, DT)).toBe(0);
      expect(trail.advance({ ...stopped, steerRad: degToRad(step) }, DT)).toBe(0);
    }
    // 按 R 重來：一步之內回到起點（往車尾方向 12 m）。
    expect(trail.advance(start, DT)).toBe(0);
    expect(trail.liveCount()).toBe(0);
  });

  test('倒車才留痕：左右後輪各一段，位置就在後輪走過的地方', () => {
    const trail = createTireMarkTrail(settings);
    const start = poseAt(2, 5, 40);
    trail.advance(start, DT);
    const run = straightRun(start, REVERSE_STEP_M, 60);
    let added = 0;
    for (const pose of run) {
      added += trail.advance(pose, DT);
    }
    expect(added).toBeGreaterThanOrEqual(4);
    expect(added % 2).toBe(0);
    expect(trail.liveCount()).toBe(added);

    // 每一段的四個角都貼著某一個後輪的軌跡（離軌跡中線半個痕寬），而且左右各半。
    const side = right(start.headingRad);
    const wheels = rearWheelContacts(start);
    const lateralOf = (x: number, z: number): number => (x - start.x) * side.x + (z - start.z) * side.z;
    const leftM = lateralOf(wheels.left.x, wheels.left.z);
    const rightM = lateralOf(wheels.right.x, wheels.right.z);
    expect(leftM).toBeCloseTo(-rightM, 9);
    let leftSegments = 0;
    for (let slot = 0; slot < added; slot += 1) {
      const corners = trail.corners.subarray(
        slot * TIRE_MARK_FLOATS_PER_SEGMENT,
        (slot + 1) * TIRE_MARK_FLOATS_PER_SEGMENT,
      );
      const laterals = [0, 2, 4, 6].map((offset) =>
        lateralOf(corners[offset] ?? NaN, corners[offset + 1] ?? NaN),
      );
      const track = (laterals[0] ?? 0) < 0 ? leftM : rightM;
      leftSegments += track === leftM ? 1 : 0;
      for (const lateralM of laterals) {
        expect(Math.abs(lateralM - track)).toBeCloseTo(TIRE_MARK_CONFIG.widthM / 2, 5);
      }
    }
    expect(leftSegments).toBe(added / 2);
    expect(TIRE_MARK_CONFIG.widthM).toBeLessThan(CAR_VISUAL_CONFIG.wheelWidthM);
  });

  test('倒車中途停一下再繼續倒，痕接得起來；改往前開就提筆', () => {
    const trail = createTireMarkTrail(settings);
    const start = poseAt(0, 0);
    trail.advance(start, DT);
    const run = straightRun(start, REVERSE_STEP_M, 40);
    for (const pose of run) {
      trail.advance(pose, DT);
    }
    const afterReverse = trail.liveCount();
    expect(afterReverse).toBeGreaterThan(0);
    const last = run.at(-1) ?? start;
    for (const pose of straightRun(last, 0.05, 40)) {
      expect(trail.advance(pose, DT)).toBe(0);
    }
    expect(trail.liveCount()).toBe(afterReverse);
  });

  test('有上限：環形緩衝滿了蓋掉最舊的，段數不超過 maxSegments', () => {
    const trail = createTireMarkTrail({ maxSegments: 10, lifetimeS: 1000 });
    const start = poseAt(0, 0);
    trail.advance(start, DT);
    let added = 0;
    for (const pose of straightRun(start, REVERSE_STEP_M, 600)) {
      added += trail.advance(pose, DT);
      expect(trail.liveCount()).toBeLessThanOrEqual(10);
    }
    expect(added).toBeGreaterThan(40);
    expect(trail.liveCount()).toBe(10);
    // 留下來的是最新的幾段：都在車最後的位置附近。
    const endZ = 600 * -REVERSE_STEP_M;
    for (let slot = 0; slot < 10; slot += 1) {
      const z = trail.corners[slot * TIRE_MARK_FLOATS_PER_SEGMENT + 1] ?? NaN;
      expect(z).toBeGreaterThan(endZ - 5 * TIRE_MARK_CONFIG.segmentLengthM - 1);
    }
  });

  test('過了壽命就消失；不透明度先維持、再淡到 0，最濃也很克制', () => {
    const trail = createTireMarkTrail(settings);
    const start = poseAt(0, 0);
    trail.advance(start, DT);
    const run = straightRun(start, REVERSE_STEP_M, 30);
    for (const pose of run) {
      trail.advance(pose, DT);
    }
    expect(trail.liveCount()).toBeGreaterThan(0);
    const parked = run.at(-1) ?? start;
    trail.advance(parked, settings.lifetimeS / 2);
    expect(trail.liveCount()).toBeGreaterThan(0);
    trail.advance(parked, settings.lifetimeS);
    expect(trail.liveCount()).toBe(0);

    expect(tireMarkOpacity(0, 10)).toBe(TIRE_MARK_CONFIG.opacity);
    expect(tireMarkOpacity(4, 10)).toBe(TIRE_MARK_CONFIG.opacity);
    expect(tireMarkOpacity(8, 10)).toBeLessThan(TIRE_MARK_CONFIG.opacity);
    expect(tireMarkOpacity(8, 10)).toBeGreaterThan(0);
    expect(tireMarkOpacity(10, 10)).toBe(0);
    expect(tireMarkOpacity(Infinity, 10)).toBe(0);
    expect(TIRE_MARK_CONFIG.opacity).toBeLessThanOrEqual(0.5);
  });

  test('由低到高，段數上限與壽命只增不減；low 最少', () => {
    const marks = QUALITY_LEVELS.map((level) => QUALITY_PRESETS[level].tireMarks);
    for (const field of ['maxSegments', 'lifetimeS'] as const) {
      const values = marks.map((mark) => mark[field]);
      expect(values, field).toEqual([...values].sort((a, b) => a - b));
    }
    expect(QUALITY_PRESETS.ultra.tireMarks.maxSegments).toBeGreaterThan(
      QUALITY_PRESETS.low.tireMarks.maxSegments,
    );
    // 每段都是一個四邊形；最高級別也只有幾百個。
    expect(QUALITY_PRESETS.ultra.tireMarks.maxSegments).toBeLessThanOrEqual(1000);
  });

  test('網格：一個 Mesh、深色半透明、不寫深度、不投影、不進環境光遮蔽，比車位標線低', () => {
    const marks = createTireMarks(settings);
    expect(marks.mesh).toBeInstanceOf(Mesh);
    const material = marks.mesh.material as MeshBasicMaterial;
    expect(material).toBeInstanceOf(MeshBasicMaterial);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeLessThan(0.1);
    expect(marks.mesh.castShadow).toBe(false);
    expect(marks.mesh.userData[SKIP_AMBIENT_OCCLUSION]).toBe(true);
    expect(TIRE_MARK_CONFIG.liftM).toBeGreaterThan(0);
    expect(TIRE_MARK_CONFIG.liftM).toBeLessThan(SPOT_MARKING_CONFIG.liftM);

    // 沒有痕的時候不畫；倒車之後才出現，頂點都貼地。
    const start = poseAt(0, 0);
    marks.update(start, DT);
    expect(marks.mesh.visible).toBe(false);
    for (const pose of straightRun(start, REVERSE_STEP_M, 30)) {
      marks.update(pose, DT);
    }
    expect(marks.mesh.visible).toBe(true);
    const positions = marks.mesh.geometry.getAttribute('position');
    const colors = marks.mesh.geometry.getAttribute('color');
    expect(positions.count).toBe(settings.maxSegments * 4);
    expect(colors.itemSize).toBe(4);
    let visibleVertices = 0;
    for (let index = 0; index < positions.count; index += 1) {
      expect(positions.getY(index)).toBeCloseTo(TIRE_MARK_CONFIG.liftM, 6);
      const alpha = colors.getW(index);
      expect(alpha).toBeLessThanOrEqual(TIRE_MARK_CONFIG.opacity + 1e-6);
      visibleVertices += alpha > 0 ? 1 : 0;
    }
    expect(visibleVertices).toBe(marks.trail.liveCount() * 4);
  });
});

describe('灰塵 dust', () => {
  const CAPACITY = 48;

  /** 沿直線開 steps 步，回傳揚起的粒子總數。 */
  function drive(
    cloud: ReturnType<typeof createDustCloud>,
    from: VehiclePose,
    stepM: number,
    steps: number,
  ): number {
    let spawned = 0;
    for (const pose of straightRun(from, stepM, steps)) {
      spawned += cloud.advance(pose, DT);
    }
    return spawned;
  }

  test('車不動不揚塵；沒有經過時間（定格截圖）也不揚塵；瞬移不算在動', () => {
    const cloud = createDustCloud(CAPACITY, DEFAULT_SEED);
    const start = poseAt(0, 0);
    for (let step = 0; step < 60; step += 1) {
      expect(cloud.advance({ ...start, steerRad: degToRad(step % 30) }, DT)).toBe(0);
    }
    expect(cloud.advance(poseAt(0, -1), 0)).toBe(0);
    expect(cloud.advance(poseAt(0, -40), DT)).toBe(0);
    expect(cloud.liveCount()).toBe(0);
  });

  test('車在動（前進或倒車）就揚塵，出現在後輪附近的低處；停下來一陣子後全部淡掉', () => {
    for (const stepM of [0.05, -0.05]) {
      const cloud = createDustCloud(CAPACITY, DEFAULT_SEED);
      const start = poseAt(1, 2, 30);
      cloud.advance(start, DT);
      expect(drive(cloud, start, stepM, 30)).toBeGreaterThan(0);
      const live = cloud.liveCount();
      expect(live).toBeGreaterThan(0);

      const end = straightRun(start, stepM, 30).at(-1) ?? start;
      const wheels = rearWheelContacts(end);
      for (let slot = 0; slot < CAPACITY; slot += 1) {
        if ((cloud.opacities[slot] ?? 0) === 0 && (cloud.sizes[slot] ?? 0) === 0) {
          continue;
        }
        const x = cloud.positions[slot * 3] ?? NaN;
        const y = cloud.positions[slot * 3 + 1] ?? NaN;
        const z = cloud.positions[slot * 3 + 2] ?? NaN;
        const nearestWheelM = Math.min(
          Math.hypot(x - wheels.left.x, z - wheels.left.z),
          Math.hypot(x - wheels.right.x, z - wheels.right.z),
        );
        // 半秒內揚起的：離後輪不遠，高度遠低於車窗下緣。
        expect(nearestWheelM).toBeLessThan(ftToM(8));
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(ftToM(2));
        expect(cloud.opacities[slot]).toBeLessThanOrEqual(PARTICLE_CONFIG.dust.opacity + 1e-6);
      }

      for (let step = 0; step < 150; step += 1) {
        expect(cloud.advance(end, DT)).toBe(0);
      }
      expect(cloud.liveCount()).toBe(0);
      expect(Math.max(...cloud.opacities)).toBe(0);
    }
  });

  test('有上限：全速開很久，粒子數也不超過上限', () => {
    const cloud = createDustCloud(CAPACITY, DEFAULT_SEED);
    const start = poseAt(0, 0);
    cloud.advance(start, DT);
    let spawned = 0;
    for (const pose of straightRun(start, VEHICLE_CONFIG_SI.maxSpeedMps * DT, 600)) {
      spawned += cloud.advance({ ...pose, steerRad: VEHICLE_CONFIG_SI.maxSteerRad }, DT);
      expect(cloud.liveCount()).toBeLessThanOrEqual(CAPACITY);
    }
    expect(spawned).toBeGreaterThan(CAPACITY);
    expect(cloud.positions.length).toBe(CAPACITY * 3);
  });

  test('起步時揚得比等速行駛多（每公尺）', () => {
    const slow = createDustCloud(CAPACITY, DEFAULT_SEED);
    const fast = createDustCloud(CAPACITY, DEFAULT_SEED);
    const start = poseAt(0, 0);
    slow.advance(start, DT);
    fast.advance(start, DT);
    // 同樣走 6 m：一個慢慢走（剛起步的車速），一個全速。
    const slowSpawned = drive(slow, start, 0.02, 300);
    const fastSpawned = drive(fast, start, 0.12, 50);
    expect(slowSpawned).toBeGreaterThan(fastSpawned);
  });

  test('同種子、同樣的姿態序列，粒子完全相同；換種子就不同', () => {
    const run = (seed: number): Float32Array => {
      const cloud = createDustCloud(CAPACITY, seed);
      const start = poseAt(0, 0);
      cloud.advance(start, DT);
      drive(cloud, start, -0.05, 45);
      return cloud.positions.slice();
    };
    expect(run(DEFAULT_SEED)).toEqual(run(DEFAULT_SEED));
    expect(run(DEFAULT_SEED + 1)).not.toEqual(run(DEFAULT_SEED));
  });

  test('不透明度：一出現是 0、很快浮現、最後淡到 0，最濃也很淡', () => {
    expect(dustOpacity(0)).toBe(0);
    expect(dustOpacity(0.2)).toBeCloseTo(PARTICLE_CONFIG.dust.opacity, 6);
    expect(dustOpacity(0.8)).toBeLessThan(dustOpacity(0.5));
    expect(dustOpacity(1)).toBe(0);
    expect(dustOpacity(Infinity)).toBe(0);
    // 單顆仍是半透明的薄霧（蓋不住標線），但不會淡到看不見。
    expect(PARTICLE_CONFIG.dust.opacity).toBeLessThanOrEqual(0.4);
    expect(PARTICLE_CONFIG.dust.opacity).toBeGreaterThanOrEqual(0.3);
  });

  test.each(['medium', 'high', 'ultra'] as const)(
    '%s：倒車 5 m 揚起一團看得出來的灰塵（同時存在的粒子夠多），粒子上限夠用',
    (level) => {
      const capacity = QUALITY_PRESETS[level].particles.dust;
      const cloud = createDustCloud(capacity, DEFAULT_SEED);
      const start = poseAt(0, 0);
      cloud.advance(start, DT);
      // 倒車的車速約 9 mph（4 m/s）：每幀退 4 m/s × DT。
      const stepM = -4 * DT;
      const steps = Math.round(5 / Math.abs(stepM));
      const spawned = drive(cloud, start, stepM, steps);
      expect(spawned).toBeGreaterThanOrEqual(18);
      expect(cloud.liveCount()).toBeGreaterThanOrEqual(14);
      // 直線等速時還沒用到上限：最舊的粒子是自己淡掉的，不是被蓋掉的。
      expect(cloud.liveCount()).toBeLessThan(capacity);
    },
  );

  test('貼圖是程式裡畫的柔邊圓點：中心不透明、四角透明、每次相同', () => {
    const size = PARTICLE_CONFIG.dust.spriteSizePx;
    const pixels = dustSpritePixels(size);
    expect(pixels.length).toBe(size * size * 4);
    expect(dustSpritePixels(size)).toEqual(pixels);
    const alphaAt = (column: number, row: number): number => pixels[(row * size + column) * 4 + 3] ?? NaN;
    expect(alphaAt(size / 2, size / 2)).toBeGreaterThan(230);
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(size - 1, size - 1)).toBe(0);
    expect(alphaAt(size / 4, size / 2)).toBeLessThan(alphaAt(size / 2, size / 2));
  });

  test('每顆粒子自己的大小插得進這一版 three 的 Points 著色器', () => {
    const patched = patchDustVertexShader(ShaderLib.points.vertexShader);
    expect(patched).toContain('attribute float dustSize;');
    expect(patched).toContain('gl_PointSize = dustSize * projectionMatrix[ 1 ][ 1 ];');
    expect(patched).not.toContain('gl_PointSize = size;');
    expect(() => patchDustVertexShader('void main() {}')).toThrow();
  });

  test('網格：一組 Points、半透明、不寫深度、不投影、不進環境光遮蔽；沒有粒子時不畫', () => {
    const dust = createDust(CAPACITY, DEFAULT_SEED);
    expect(dust.points).toBeInstanceOf(Points);
    const material = dust.points.material as PointsMaterial;
    expect(material).toBeInstanceOf(PointsMaterial);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.map).not.toBeNull();
    expect(dust.points.castShadow).toBe(false);
    expect(dust.points.userData[SKIP_AMBIENT_OCCLUSION]).toBe(true);
    expect(dust.points.geometry.getAttribute('position').count).toBe(CAPACITY);
    expect(dust.points.geometry.getAttribute('dustSize').count).toBe(CAPACITY);

    const start = poseAt(0, 0);
    dust.update(start, DT);
    expect(dust.points.visible).toBe(false);
    for (const pose of straightRun(start, -0.05, 30)) {
      dust.update(pose, DT);
    }
    expect(dust.points.visible).toBe(true);
    const colors = dust.points.geometry.getAttribute('color');
    let visible = 0;
    for (let slot = 0; slot < CAPACITY; slot += 1) {
      visible += colors.getW(slot) > 0 ? 1 : 0;
    }
    expect(visible).toBeGreaterThan(0);
    expect(visible).toBeLessThanOrEqual(dust.cloud.liveCount());
  });
});

describe('落葉 leaves', () => {
  const COUNT = 80;
  const field = createLeafField(SPOT, START, DEFAULT_SEED, COUNT);
  /** 取樣的時間點（秒）：涵蓋好幾輪。 */
  const TIMES = Array.from({ length: 90 }, (_, index) => index * 1.9);

  test('要幾片就有幾片；同種子、同時間的姿態完全相同，換種子就不同', () => {
    expect(field.count).toBe(COUNT);
    const again = createLeafField(SPOT, START, DEFAULT_SEED, COUNT);
    const other = createLeafField(SPOT, START, DEFAULT_SEED + 1, COUNT);
    for (const timeS of [0, 7.3, 123.4]) {
      for (let index = 0; index < COUNT; index += 1) {
        expect(again.stateAt(index, timeS)).toEqual(field.stateAt(index, timeS));
      }
    }
    expect(other.stateAt(0, 0)).not.toEqual(field.stateAt(0, 0));
  });

  test('任何時刻都在路緣內，而且避開起點到車位的通路、目標車位與 spot_low 鏡頭前方', () => {
    const bounds = curbInnerBounds(SPOT);
    const zones = lotKeepOutZones(SPOT, START);
    for (let index = 0; index < COUNT; index += 1) {
      for (const timeS of TIMES) {
        const state = field.stateAt(index, timeS);
        const local = worldToSpotLocal(SPOT, state.x, state.z);
        expect(local.x).toBeGreaterThan(bounds.minX);
        expect(local.x).toBeLessThan(bounds.maxX);
        expect(local.z).toBeGreaterThan(bounds.minZ);
        expect(local.z).toBeLessThan(bounds.maxZ);
        expect(pointInKeepOut(zones, local.x, local.z), `第 ${index} 片 t=${timeS}`).toBe(false);
      }
    }
  });

  test('緩緩地動：不會鑽到地面下、飛不高，相鄰兩幀之間移動很小（弱風），大部分時間停在地上', () => {
    let resting = 0;
    let samples = 0;
    for (let index = 0; index < COUNT; index += 1) {
      for (const timeS of TIMES) {
        const state = field.stateAt(index, timeS);
        const next = field.stateAt(index, timeS + DT);
        expect(state.y).toBeGreaterThan(0);
        expect(state.y).toBeLessThanOrEqual(
          PARTICLE_CONFIG.leaf.restLiftM + PARTICLE_CONFIG.leaf.fallHeightM + 1e-9,
        );
        expect(state.scale).toBeGreaterThanOrEqual(0);
        expect(state.scale).toBeLessThanOrEqual(1);
        // 一輪結束（被捲走、已縮到看不見）跳回落點上空的那一幀不算。
        if (state.scale > 0.01 && next.scale > 0.01) {
          const speedMps = Math.hypot(next.x - state.x, next.y - state.y, next.z - state.z) / DT;
          expect(speedMps).toBeLessThan(6);
        }
        samples += 1;
        resting += state.y === PARTICLE_CONFIG.leaf.restLiftM ? 1 : 0;
      }
    }
    expect(resting / samples).toBeGreaterThan(0.4);
    expect(resting / samples).toBeLessThan(0.9);
  });

  test('葉子很小：長度不到 1 ft', () => {
    for (let index = 0; index < COUNT; index += 1) {
      expect(field.sizeM(index)).toBeGreaterThan(ftToM(0.3));
      expect(field.sizeM(index)).toBeLessThan(ftToM(1));
    }
  });

  test('網格：一個 InstancedMesh、不投影、時間 0 就已經擺好', () => {
    const leaves = createLeaves(SPOT, START, DEFAULT_SEED, COUNT);
    expect(leaves.mesh).toBeInstanceOf(InstancedMesh);
    expect(leaves.mesh.count).toBe(COUNT);
    expect(leaves.mesh.castShadow).toBe(false);
    expect(leaves.mesh.instanceColor).not.toBeNull();
    const before = leaves.mesh.instanceMatrix.array.slice();
    expect(before.some((value) => value !== 0)).toBe(true);
    leaves.setTime(5);
    expect(leaves.mesh.instanceMatrix.array).not.toEqual(before);
    leaves.setTime(0);
    expect(leaves.mesh.instanceMatrix.array).toEqual(before);
  });
});

describe('效果的畫質級別 createSceneEffects', () => {
  test('由低到高，灰塵與落葉只增不減；low 沒有粒子，其餘級別都有', () => {
    const particles = QUALITY_LEVELS.map((level) => QUALITY_PRESETS[level].particles);
    for (const field of ['dust', 'leaves'] as const) {
      const values = particles.map((particle) => particle[field]);
      expect(values, field).toEqual([...values].sort((a, b) => a - b));
    }
    expect(QUALITY_PRESETS.low.particles).toEqual({ dust: 0, leaves: 0 });
    for (const level of ['medium', 'high', 'ultra'] as const) {
      expect(QUALITY_PRESETS[level].particles.dust).toBeGreaterThan(0);
      expect(QUALITY_PRESETS[level].particles.leaves).toBeGreaterThan(0);
    }
    expect(QUALITY_PRESETS.high.particles.leaves).toBeGreaterThan(
      QUALITY_PRESETS.medium.particles.leaves,
    );
    // medium 也要有足夠的灰塵才看得出來；級別之間有明顯差距。
    expect(QUALITY_PRESETS.medium.particles.dust).toBeGreaterThanOrEqual(48);
    expect(QUALITY_PRESETS.high.particles.dust).toBeGreaterThan(QUALITY_PRESETS.medium.particles.dust);
    expect(QUALITY_PRESETS.ultra.particles.dust).toBeGreaterThan(QUALITY_PRESETS.high.particles.dust);
    // 克制：最高級別的粒子也只有幾百個。
    expect(QUALITY_PRESETS.ultra.particles.dust).toBeLessThanOrEqual(200);
    expect(QUALITY_PRESETS.ultra.particles.leaves).toBeLessThanOrEqual(300);
  });

  test.each(QUALITY_LEVELS)('%s：每種效果最多一個 draw call，上限是 0 的不建立', (level) => {
    const quality = QUALITY_PRESETS[level];
    const effects = createSceneEffects(quality, SPOT, START, DEFAULT_SEED);
    const names = effects.root.children.map((child) => child.name).sort();
    const expected = [
      ...(quality.particles.dust > 0 ? ['dust'] : []),
      ...(quality.particles.leaves > 0 ? ['leaves'] : []),
      ...(quality.tireMarks.maxSegments > 0 ? ['tireMarks'] : []),
    ];
    expect(names).toEqual(expected);
    for (const child of effects.root.children) {
      expect(child.children.length).toBe(0);
      expect(child.castShadow).toBe(false);
    }
    const leaves = effects.root.getObjectByName('leaves');
    if (leaves instanceof InstancedMesh) {
      expect(leaves.count).toBe(quality.particles.leaves);
    }
  });

  test('定格（frameSeconds = 0）：落葉不動，沒有輪胎痕與灰塵；有經過時間才會動', () => {
    const effects = createSceneEffects(HIGH, SPOT, START, DEFAULT_SEED);
    const leaves = effects.root.getObjectByName('leaves') as InstancedMesh;
    const marks = effects.root.getObjectByName('tireMarks') as Mesh;
    const dust = effects.root.getObjectByName('dust') as Points;
    const before = leaves.instanceMatrix.array.slice();
    effects.update(poseAt(0, 0), 0);
    effects.update(poseAt(0, 1), 0);
    expect(leaves.instanceMatrix.array).toEqual(before);
    expect(marks.visible).toBe(false);
    expect(dust.visible).toBe(false);

    // 倒車半秒多：痕與灰塵都出現，落葉也動了。
    for (const pose of straightRun(poseAt(0, 1), -0.05, 40)) {
      effects.update(pose, DT);
    }
    expect(marks.visible).toBe(true);
    expect(dust.visible).toBe(true);
    expect(leaves.instanceMatrix.array).not.toEqual(before);
  });

  test('落葉從一開始就飄（車還沒開動也在飄）；同一個累積時間畫出來一樣；車不動就沒有痕與灰塵', () => {
    const effects = createSceneEffects(HIGH, SPOT, START, DEFAULT_SEED);
    const leaves = effects.root.getObjectByName('leaves') as InstancedMesh;
    const marks = effects.root.getObjectByName('tireMarks') as Mesh;
    const dust = effects.root.getObjectByName('dust') as Points;
    const before = leaves.instanceMatrix.array.slice();
    // 停在原地 5 秒（含原地打方向盤）：落葉在飄，但沒有痕、沒有灰塵。
    for (let frame = 0; frame < 300; frame += 1) {
      effects.update({ ...poseAt(0, 0), steerRad: frame % 2 === 0 ? 0.3 : 0 }, DT);
    }
    expect(leaves.instanceMatrix.array).not.toEqual(before);
    expect(marks.visible).toBe(false);
    expect(dust.visible).toBe(false);

    // 另一組效果走同樣長的時間（一樣的步數）：落葉的位置完全相同。
    const again = createSceneEffects(HIGH, SPOT, START, DEFAULT_SEED);
    for (let frame = 0; frame < 300; frame += 1) {
      again.update(poseAt(0, 0), DT);
    }
    expect((again.root.getObjectByName('leaves') as InstancedMesh).instanceMatrix.array).toEqual(
      leaves.instanceMatrix.array,
    );
  });

  test('雨絲：有給數量才建立，一個 draw call；下雨時不揚灰塵、不飄落葉；同一個時間位置相同、會往下掉', () => {
    expect(createSceneEffects(HIGH, SPOT, START, DEFAULT_SEED).root.getObjectByName('rain')).toBeUndefined();

    const options = { rainStreaks: 200, leaves: false, dust: false };
    const effects = createSceneEffects(HIGH, SPOT, START, DEFAULT_SEED, options);
    expect(effects.root.children.map((child) => child.name).sort()).toEqual(['rain', 'tireMarks']);
    const rain = effects.root.getObjectByName('rain') as LineSegments;
    const positions = rain.geometry.getAttribute('position');
    expect(positions.count).toBe(400);

    // 定格（時間 0）也看得到雨：每條雨絲都有長度，而且都在車附近的長方體裡。
    effects.update(poseAt(3, -4), 0);
    const still = positions.array.slice();
    for (let index = 0; index < positions.count; index += 2) {
      expect(positions.getY(index + 1)).toBeGreaterThan(positions.getY(index));
      expect(Math.abs(positions.getX(index) - 3)).toBeLessThanOrEqual(RAIN_CONFIG.boxSizeM / 2);
      expect(Math.abs(positions.getZ(index) + 4)).toBeLessThanOrEqual(RAIN_CONFIG.boxSizeM / 2);
      expect(positions.getY(index)).toBeGreaterThanOrEqual(0);
      expect(positions.getY(index)).toBeLessThan(RAIN_CONFIG.boxHeightM);
    }
    const again = createSceneEffects(HIGH, SPOT, START, DEFAULT_SEED, options);
    again.update(poseAt(3, -4), 0);
    expect((again.root.getObjectByName('rain') as LineSegments).geometry.getAttribute('position').array).toEqual(still);

    // 過了一點時間：雨絲動了。
    effects.update(poseAt(3, -4), DT);
    expect(positions.array).not.toEqual(still);
  });

  test('?fx=off（不要落葉）：落葉不建立，其餘照常', () => {
    const effects = createSceneEffects(HIGH, SPOT, START, DEFAULT_SEED, { leaves: false });
    expect(effects.root.children.map((child) => child.name).sort()).toEqual(['dust', 'tireMarks']);
  });
});
