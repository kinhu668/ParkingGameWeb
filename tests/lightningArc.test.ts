// 閃電的電弧：形狀與落點只由種子與「第幾道」決定；整條都在場地外面、不從玩家頭上穿過、不會塞住鏡頭；
// 第一道（t = 2）在 w1_l07 的三個固定鏡頭裡看得到；網格跟著閃光亮與淡。不開 WebGL。
import { AdditiveBlending, Mesh, PerspectiveCamera, ShaderMaterial, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { GAME_CAMERA_VIEWS } from '../src/core/cameraView';
import { DEFAULT_SEED } from '../src/core/gameConfig';
import { ftToM } from '../src/core/units';
import { createLightning, lightningSchedule } from '../src/effects/lightning';
import { createLightningArcs } from '../src/effects/lightningArc';
import {
  MAX_STRIKE_SEGMENTS,
  boltCameraFade,
  exitDistance,
  strikeBearingDeg,
  strikeBolts,
  type Bolt,
  type StrikeArea,
} from '../src/effects/lightningBolt';
import { LEVELS, levelById } from '../src/level/levelCatalog';
import { vehicleOnRouteAt } from '../src/level/levelRoutes';
import type { LevelDefinition } from '../src/level/levelSchema';
import { SKIP_AMBIENT_OCCLUSION } from '../src/render/ambientOcclusionFlag';
import { createPresetCamera } from '../src/render/followCamera';
import { createGameCamera } from '../src/render/gameCamera';
import { lightningStrikeArea } from '../src/render/scene';
import { LIGHTNING_CONFIG, WEATHER_PRESETS } from '../src/render/weatherPresets';

const ARC = LIGHTNING_CONFIG.arc;
const SEED = DEFAULT_SEED + 0x1f3;
const STRIKES = 24;
const ASPECT = 16 / 9;

function areaOf(level: LevelDefinition): StrikeArea {
  return lightningStrikeArea(level.layout.spot, level.boundsFt);
}

function levelOf(id: string): LevelDefinition {
  const level = levelById(id);
  if (level === undefined) {
    throw new Error(`沒有 ${id}`);
  }
  return level;
}

/** 點到線段的最短距離。 */
function distanceToSegment(point: Vector3, from: Vector3, to: Vector3): number {
  const axis = to.clone().sub(from);
  const t = Math.min(Math.max(point.clone().sub(from).dot(axis) / axis.lengthSq(), 0), 1);
  return from.clone().addScaledVector(axis, t).distanceTo(point);
}

function nearestBoltM(bolts: readonly Bolt[], point: Vector3): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (const bolt of bolts) {
    for (const segment of bolt.segments) {
      nearest = Math.min(
        nearest,
        distanceToSegment(
          point,
          new Vector3(segment.from.x, segment.from.y, segment.from.z),
          new Vector3(segment.to.x, segment.to.y, segment.to.z),
        ),
      );
    }
  }
  return nearest;
}

/** 這台鏡頭的畫面裡看得到電弧的多少小段（在視錐裡、而且離鏡頭夠遠、沒有被淡掉）。 */
function visibleSegments(camera: PerspectiveCamera, bolts: readonly Bolt[]): number {
  camera.aspect = ASPECT;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  let visible = 0;
  for (const bolt of bolts) {
    for (const segment of bolt.segments) {
      const middle = new Vector3(
        (segment.from.x + segment.to.x) / 2,
        (segment.from.y + segment.to.y) / 2,
        (segment.from.z + segment.to.z) / 2,
      );
      const fade = boltCameraFade(middle.distanceTo(camera.position));
      const ndc = middle.clone().project(camera);
      if (fade > 0.5 && Math.abs(ndc.x) < 0.97 && Math.abs(ndc.y) < 0.97 && ndc.z > -1 && ndc.z < 1) {
        visible += 1;
      }
    }
  }
  return visible;
}

describe('電弧的形狀', () => {
  const area = areaOf(levelOf('w1_l07'));

  test('同樣的種子與第幾道永遠是同一條；換種子或換一道就不同', () => {
    for (let strike = 0; strike < 5; strike += 1) {
      expect(strikeBolts(SEED, strike, area)).toEqual(strikeBolts(SEED, strike, area));
    }
    expect(strikeBolts(SEED, 0, area)).not.toEqual(strikeBolts(SEED, 1, area));
    expect(strikeBolts(SEED, 3, area)).not.toEqual(strikeBolts(SEED + 1, 3, area));
  });

  test('每一道有主、次兩條電弧：從雲底一路連到地面的落點；主電弧有分岔', () => {
    for (let strike = 0; strike < STRIKES; strike += 1) {
      const bolts = strikeBolts(SEED, strike, area);
      expect(bolts).toHaveLength(2);
      const [main, secondary] = bolts;
      if (main === undefined || secondary === undefined) {
        throw new Error('少了電弧');
      }
      const mainChannel = 2 ** ARC.subdivisions;
      expect(secondary.segments).toHaveLength(mainChannel);
      expect(main.segments.length).toBeGreaterThanOrEqual(
        mainChannel + ARC.branches.min * 2 ** ARC.branchSubdivisions,
      );
      expect(main.segments.length + secondary.segments.length).toBeLessThanOrEqual(MAX_STRIKE_SEGMENTS);
      for (const bolt of bolts) {
        const channel = bolt.segments.slice(0, mainChannel);
        // 頭尾相接。
        for (let index = 1; index < channel.length; index += 1) {
          expect(channel[index]?.from).toEqual(channel[index - 1]?.to);
        }
        const top = channel[0]?.from;
        const foot = channel[channel.length - 1]?.to;
        expect(top?.y).toBeGreaterThanOrEqual(ARC.cloudHeightM.min);
        expect(top?.y).toBeLessThanOrEqual(ARC.cloudHeightM.max);
        expect(foot).toEqual({ x: bolt.ground.x, y: 0, z: bolt.ground.z });
        for (const segment of bolt.segments) {
          expect(segment.from.y).toBeGreaterThanOrEqual(0);
          expect(segment.to.y).toBeGreaterThanOrEqual(0);
          expect(segment.widthM).toBeGreaterThan(0);
          expect(segment.brightness).toBeGreaterThan(0);
          expect(segment.brightness).toBeLessThanOrEqual(1);
        }
      }
      // 次電弧比主電弧細、暗。
      expect(secondary.segments[0]?.widthM).toBeLessThan(main.segments[0]?.widthM ?? 0);
      expect(secondary.segments[0]?.brightness).toBeLessThan(1);
    }
  });

  test('折線是鋸齒狀的：不是一條直線', () => {
    const [main] = strikeBolts(SEED, 0, area);
    const channel = main?.segments.slice(0, 2 ** ARC.subdivisions) ?? [];
    const top = channel[0]?.from;
    const foot = channel[channel.length - 1]?.to;
    if (top === undefined || foot === undefined) {
      throw new Error('少了主電弧');
    }
    const from = new Vector3(top.x, top.y, top.z);
    const to = new Vector3(foot.x, foot.y, foot.z);
    const off = channel.map((segment) =>
      distanceToSegment(new Vector3(segment.to.x, segment.to.y, segment.to.z), from, to),
    );
    expect(Math.max(...off)).toBeGreaterThan(ftToM(4));
    // 路徑比直線長（折來折去），但不是亂飛。
    const length = channel.reduce(
      (sum, segment) =>
        sum +
        Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y, segment.to.z - segment.from.z),
      0,
    );
    expect(length).toBeGreaterThan(from.distanceTo(to) * 1.03);
    expect(length).toBeLessThan(from.distanceTo(to) * 1.8);
  });

  test('方位：第一道固定（截圖用），之後每一道多轉一個黃金角', () => {
    expect(strikeBearingDeg(0)).toBe(ARC.firstBearingDeg);
    expect(strikeBearingDeg(1)).toBeCloseTo((ARC.firstBearingDeg + ARC.turnDeg) % 360, 9);
    const sectors = new Set(
      Array.from({ length: 12 }, (_, strike) => Math.floor(strikeBearingDeg(strike) / 90)),
    );
    // 十二道裡四個象限都打過。
    expect(sectors.size).toBe(4);
  });

  test('exitDistance：從矩形裡沿一個方向走到邊界的距離', () => {
    const rect = { minX: -10, maxX: 30, minZ: -5, maxZ: 5 };
    expect(exitDistance(rect, 0, 0, 1, 0)).toBeCloseTo(30, 9);
    expect(exitDistance(rect, 0, 0, -1, 0)).toBeCloseTo(10, 9);
    expect(exitDistance(rect, 0, 0, 0, 1)).toBeCloseTo(5, 9);
    expect(exitDistance(rect, 0, 0, Math.SQRT1_2, Math.SQRT1_2)).toBeCloseTo(5 * Math.SQRT2, 9);
    expect(exitDistance(rect, 50, 0, 1, 0)).toBe(0);
  });
});

describe('電弧在場地外面、離鏡頭遠', () => {
  /** 落點至少在場地邊界之外這麼遠。 */
  const minOutsideM = Math.min(ARC.mainExtraM.min, ARC.secondaryExtraM.min) - 1e-6;

  test('每一關、前 24 道：落點在場地邊界之外，整條電弧（含分岔）沒有任何一點在場地（外擴 12 ft）上空', () => {
    for (const level of LEVELS) {
      const area = areaOf(level);
      for (let strike = 0; strike < STRIKES; strike += 1) {
        for (const bolt of strikeBolts(SEED, strike, area)) {
          const outside = Math.max(
            area.minX - bolt.ground.x,
            bolt.ground.x - area.maxX,
            area.minZ - bolt.ground.z,
            bolt.ground.z - area.maxZ,
          );
          // 沿斜的方向走出去時，離最近那一邊的距離比沿線的距離短；至少有下限的一半。
          expect(outside, `${level.id} #${strike}`).toBeGreaterThan(minOutsideM * 0.5);
          for (const segment of bolt.segments) {
            for (const point of [segment.from, segment.to]) {
              const margin = ARC.keepOutMarginM - 1e-6;
              const inside =
                point.x > area.minX - margin &&
                point.x < area.maxX + margin &&
                point.z > area.minZ - margin &&
                point.z < area.maxZ + margin;
              expect(inside, `${level.id} #${strike}`).toBe(false);
            }
          }
        }
      }
    }
  });

  test('鏡頭在場地裡（駕駛座、引擎蓋、俯視…）：離前 24 道的任何一條電弧至少 12 ft', () => {
    for (const level of LEVELS) {
      const area = areaOf(level);
      const { spot, startState } = level.layout;
      const cameras: Vector3[] = GAME_CAMERA_VIEWS.map(
        (view) => createGameCamera(view, startState).camera.position.clone(),
      );
      for (const preset of ['follow', 'top', 'spot_low'] as const) {
        cameras.push(createPresetCamera(preset, startState.x, startState.z, spot).position.clone());
      }
      const inLot = cameras.filter(
        (camera) =>
          camera.x >= area.minX && camera.x <= area.maxX && camera.z >= area.minZ && camera.z <= area.maxZ,
      );
      // 駕駛座、引擎蓋與俯視鏡頭一定在場地裡（車在場地裡）。
      expect(inLot.length, level.id).toBeGreaterThanOrEqual(3);
      for (let strike = 0; strike < STRIKES; strike += 1) {
        const bolts = strikeBolts(SEED, strike, area);
        for (const camera of inLot) {
          expect(nearestBoltM(bolts, camera), `${level.id} #${strike}`).toBeGreaterThan(
            ARC.keepOutMarginM - 1e-6,
          );
        }
      }
    }
  });

  test('鏡頭跑到場地外面（遠距跟車）貼近電弧時：近處的片段不畫，畫得出來的最寬也只佔視野一小條', () => {
    // 面片在剛開始畫的距離（淡入到一半）時的視角寬度：不到 8°，塞不住鏡頭。
    const halfwayM = (ARC.cameraFadeNearM + ARC.cameraFadeFarM) / 2;
    expect(boltCameraFade(halfwayM)).toBeCloseTo(0.5, 6);
    const widthDeg = (2 * Math.atan(ARC.mainWidthM / 2 / halfwayM) * 180) / Math.PI;
    expect(widthDeg).toBeLessThan(8);
    // 最亮的芯更窄。
    expect(widthDeg * ARC.coreFraction).toBeLessThan(1.5);
    // 比每個鏡頭的近平面遠得多的距離以內完全不畫。
    expect(ARC.cameraFadeNearM).toBeGreaterThanOrEqual(ftToM(20));
  });

  test('車在場地裡的任何地方（駕駛座的高度）：離電弧至少有落點的下限那麼遠', () => {
    for (const level of LEVELS) {
      const area = areaOf(level);
      const corners = [
        new Vector3(area.minX, 1.2, area.minZ),
        new Vector3(area.maxX, 1.2, area.minZ),
        new Vector3(area.maxX, 1.2, area.maxZ),
        new Vector3(area.minX, 1.2, area.maxZ),
        new Vector3((area.minX + area.maxX) / 2, 1.2, (area.minZ + area.maxZ) / 2),
      ];
      for (let strike = 0; strike < STRIKES; strike += 1) {
        const bolts = strikeBolts(SEED, strike, area);
        for (const corner of corners) {
          expect(nearestBoltM(bolts, corner), `${level.id} #${strike}`).toBeGreaterThan(ftToM(11));
        }
      }
    }
  });

  test('太近的電弧在著色器裡淡掉：近距離是 0、遠處是 1、中間單調', () => {
    expect(boltCameraFade(0)).toBe(0);
    expect(boltCameraFade(ARC.cameraFadeNearM)).toBe(0);
    expect(boltCameraFade(ARC.cameraFadeFarM)).toBe(1);
    expect(boltCameraFade(1000)).toBe(1);
    let previous = 0;
    for (let step = 1; step <= 10; step += 1) {
      const fade = boltCameraFade(
        ARC.cameraFadeNearM + ((ARC.cameraFadeFarM - ARC.cameraFadeNearM) * step) / 10,
      );
      expect(fade).toBeGreaterThanOrEqual(previous);
      previous = fade;
    }
  });
});

describe('第一道（t = 2）在截圖鏡頭裡看得到', () => {
  test('w1_l07：?cam=spot_low、?cam=top、?cam=follow 的畫面裡都有電弧', () => {
    const level = levelOf('w1_l07');
    const bolts = strikeBolts(SEED, 0, areaOf(level));
    const vehicle = vehicleOnRouteAt(level, LIGHTNING_CONFIG.firstStrikeS) ?? level.layout.startState;
    const { spot } = level.layout;
    const seen = (preset: 'follow' | 'top' | 'spot_low'): number =>
      visibleSegments(createPresetCamera(preset, vehicle.x, vehicle.z, spot), bolts);
    expect(seen('spot_low')).toBeGreaterThanOrEqual(2);
    expect(seen('top')).toBeGreaterThanOrEqual(1);
    expect(seen('follow')).toBeGreaterThanOrEqual(1);
  });

  test('每一關的 ?cam=spot_low：第一道的主電弧在畫面裡（方位以車位為準，所以每一關都一樣）', () => {
    for (const level of LEVELS) {
      const [main] = strikeBolts(SEED, 0, areaOf(level));
      if (main === undefined) {
        throw new Error('少了主電弧');
      }
      const { spot, startState } = level.layout;
      const camera = createPresetCamera('spot_low', startState.x, startState.z, spot);
      expect(visibleSegments(camera, [main]), level.id).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('電弧的網格', () => {
  const area = areaOf(levelOf('w1_l07'));
  const fog = WEATHER_PRESETS.storm.fog;

  test('還沒打過（定格的 t = 0）或沒在閃：整組不畫', () => {
    const arcs = createLightningArcs(SEED, area, true, fog);
    expect(arcs.root.visible).toBe(false);
    arcs.show(-1, 0);
    expect(arcs.root.visible).toBe(false);
    arcs.show(0, 0);
    expect(arcs.root.visible).toBe(false);
    arcs.show(-1, 1);
    expect(arcs.root.visible).toBe(false);
    expect(arcs.shown().strikeIndex).toBe(-1);
  });

  test('跟著閃電的時間表：t = 0 不畫、t = 2 第一道最亮、淡掉後不畫、下一道換一條', () => {
    const lightning = createLightning(SEED);
    const arcs = createLightningArcs(SEED, area, false, fog);
    const material = (): ShaderMaterial => {
      const mesh = arcs.root.getObjectByName('lightningArc');
      if (!(mesh instanceof Mesh) || !(mesh.material instanceof ShaderMaterial)) {
        throw new Error('找不到電弧的網格');
      }
      return mesh.material;
    };
    const at = (timeS: number): number => {
      const flash = lightning.flashAt(timeS);
      arcs.show(lightning.strikeIndex(), flash);
      return flash;
    };
    expect(at(0)).toBe(0);
    expect(arcs.root.visible).toBe(false);
    expect(at(1.99)).toBe(0);
    expect(arcs.root.visible).toBe(false);

    expect(at(LIGHTNING_CONFIG.firstStrikeS)).toBe(1);
    expect(arcs.root.visible).toBe(true);
    expect(arcs.shown().strikeIndex).toBe(0);
    expect(arcs.shown().bolts).toEqual(strikeBolts(SEED, 0, area));
    expect(material().uniforms['flash']?.value).toBe(1);

    // 同一道閃電淡下去：同一條電弧，亮度跟著閃光。
    const dim = at(LIGHTNING_CONFIG.firstStrikeS + 0.1);
    expect(dim).toBeGreaterThan(0);
    expect(dim).toBeLessThan(1);
    expect(material().uniforms['flash']?.value).toBe(dim);
    expect(arcs.shown().strikeIndex).toBe(0);

    expect(at(LIGHTNING_CONFIG.firstStrikeS + LIGHTNING_CONFIG.durationS)).toBe(0);
    expect(arcs.root.visible).toBe(false);

    const second = lightningSchedule(SEED, 60)[1] ?? Number.NaN;
    expect(second - LIGHTNING_CONFIG.firstStrikeS).toBeGreaterThanOrEqual(LIGHTNING_CONFIG.minGapS);
    expect(at(second)).toBe(1);
    expect(arcs.root.visible).toBe(true);
    expect(arcs.shown().strikeIndex).toBe(1);
    expect(arcs.shown().bolts).toEqual(strikeBolts(SEED, 1, area));
  });

  test('一個 draw call 的面片＋兩片落點的閃光；加色、不寫深度、保留深度測試、不進環境光遮蔽', () => {
    const arcs = createLightningArcs(SEED, area, true, fog);
    arcs.show(0, 1);
    const ribbon = arcs.root.getObjectByName('lightningArc');
    if (!(ribbon instanceof Mesh) || !(ribbon.material instanceof ShaderMaterial)) {
      throw new Error('找不到電弧的網格');
    }
    expect(ribbon.material.blending).toBe(AdditiveBlending);
    expect(ribbon.material.depthWrite).toBe(false);
    expect(ribbon.material.depthTest).toBe(true);
    expect(ribbon.material.toneMapped).toBe(false);
    expect(arcs.root.userData[SKIP_AMBIENT_OCCLUSION]).toBe(true);
    const segments = strikeBolts(SEED, 0, area).reduce((sum, bolt) => sum + bolt.segments.length, 0);
    expect(ribbon.geometry.drawRange.count).toBe(segments * 6);
    const meshes = arcs.root.children.filter((child) => child instanceof Mesh);
    expect(meshes).toHaveLength(3);
    const glows = meshes.filter((mesh) => mesh.name === 'lightningGroundGlow');
    expect(glows).toHaveLength(2);
    const grounds = strikeBolts(SEED, 0, area).map((bolt) => bolt.ground);
    glows.forEach((glow, index) => {
      expect(glow.position.x).toBeCloseTo(grounds[index]?.x ?? Number.NaN, 9);
      expect(glow.position.z).toBeCloseTo(grounds[index]?.z ?? Number.NaN, 9);
    });
    // 走後製鏈的級別電弧的芯超過泛光門檻；直接畫到畫面上的級別亮度在顯示範圍附近。
    expect(ribbon.material.uniforms['coreBrightness']?.value).toBe(ARC.coreBrightness.hdr);
    const direct = createLightningArcs(SEED, area, false, fog).root.getObjectByName('lightningArc');
    expect(
      direct instanceof Mesh && direct.material instanceof ShaderMaterial
        ? direct.material.uniforms['coreBrightness']?.value
        : undefined,
    ).toBe(ARC.coreBrightness.direct);
  });

  test('閃電的間隔下限沒有變（光敏感）：兩道之間至少 4 秒', () => {
    expect(LIGHTNING_CONFIG.minGapS).toBeGreaterThanOrEqual(4);
    const schedule = lightningSchedule(SEED, 600);
    for (let index = 1; index < schedule.length; index += 1) {
      expect((schedule[index] ?? 0) - (schedule[index - 1] ?? 0)).toBeGreaterThanOrEqual(
        LIGHTNING_CONFIG.minGapS,
      );
    }
  });
});
