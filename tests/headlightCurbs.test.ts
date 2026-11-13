// 頭燈（與倒車燈）的光斑打在路緣上（vehicle/headlightCurbs.ts）：路緣石、車擋、人行道比貼地的光斑高，
// 在它們的頂面與朝著車的立面補上同樣亮度的貼片。不開 WebGL：只檢查幾何與純函式。
import { AdditiveBlending, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, test } from 'vitest';
import { DEFAULT_SEED } from '../src/core/gameConfig';
import { ftToM } from '../src/core/units';
import { LEVELS } from '../src/level/levelCatalog';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import { createEnvironmentLayout } from '../src/props/environmentLayout';
import { curbInnerBounds } from '../src/props/lotEdges';
import { createLotLayout, spotLocalToWorld } from '../src/props/lotLayout';
import { SKIP_AMBIENT_OCCLUSION } from '../src/render/ambientOcclusionFlag';
import { QUALITY_LEVELS, usesHdrChain } from '../src/render/quality';
import {
  CURB_CONFIG,
  HEADLIGHT_CONFIG,
  QUALITY_PRESETS,
  WHEEL_STOP_CONFIG,
} from '../src/render/renderConfig';
import { raisedBoxesOf } from '../src/render/scene';
import { beamBrightness } from '../src/vehicle/carHeadlights';
import {
  createRaisedPoolLight,
  lampLightAt,
  raisedBoxAt,
  raisedBoxFromRect,
  raisedLightPatches,
  type LightPatch,
  type RaisedBox,
} from '../src/vehicle/headlightCurbs';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';

const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;
const RAISED = HEADLIGHT_CONFIG.raisedSurfaces;
const { spot, startState } = PROTOTYPE_LAYOUT;

/** 車在原點、車頭朝北（−Z）。 */
const POSE = { x: 0, z: 0, headingRad: 0 };
/** 車頭正前方 12 ft 橫著一條路緣（6 英吋寬、6 英吋高、左右各 40 ft）。 */
const CURB_AHEAD: RaisedBox = raisedBoxFromRect(
  { minX: ftToM(-40), maxX: ftToM(40), minZ: -HALF_LENGTH_M - ftToM(12.5), maxZ: -HALF_LENGTH_M - ftToM(12) },
  CURB_CONFIG.heightM,
);

function peak(patches: readonly LightPatch[], key: 'front' | 'reverse'): number {
  return Math.max(0, ...patches.flatMap((patch) => patch.corners.map((corner) => corner[key])));
}

describe('車燈的光在地面座標的亮度', () => {
  test('與貼地光斑同一個函式：車頭前方有頭燈的光、車尾後方有倒車燈的光', () => {
    const ahead = lampLightAt(POSE, ftToM(2), -HALF_LENGTH_M - ftToM(12));
    expect(ahead.front).toBeCloseTo(beamBrightness(HEADLIGHT_CONFIG.frontPool, ftToM(2), ftToM(12)), 9);
    expect(ahead.front).toBeGreaterThan(0.3);
    expect(ahead.reverse).toBe(0);
    const behind = lampLightAt(POSE, 0, HALF_LENGTH_M + ftToM(4));
    expect(behind.reverse).toBeCloseTo(beamBrightness(HEADLIGHT_CONFIG.reversePool, 0, ftToM(4)), 9);
    expect(behind.reverse).toBeGreaterThan(0.3);
    expect(behind.front).toBe(0);
  });

  test('跟著車走、跟著車頭轉', () => {
    const turned = { x: 30, z: -12, headingRad: Math.PI / 2 };
    // 車頭朝東（+X）：光在車的東邊。
    expect(lampLightAt(turned, 30 + HALF_LENGTH_M + ftToM(12), -12 + ftToM(2)).front).toBeCloseTo(
      lampLightAt(POSE, ftToM(2), -HALF_LENGTH_M - ftToM(12)).front,
      9,
    );
    expect(lampLightAt(turned, 30, -12 - HALF_LENGTH_M - ftToM(12)).front).toBe(0);
  });
});

describe('路緣上的貼片', () => {
  const patches = raisedLightPatches([CURB_AHEAD], POSE, false);
  const tops = patches.filter((patch) => patch.face === 'top');
  const sides = patches.filter((patch) => patch.face === 'side');

  test('光斑跨過路緣的地方：頂面與朝著車的立面都有光，而且與同一處的地面一樣亮', () => {
    expect(tops.length).toBeGreaterThan(8);
    expect(sides.length).toBeGreaterThan(8);
    const ground = beamBrightness(HEADLIGHT_CONFIG.frontPool, ftToM(2), ftToM(12));
    expect(ground).toBeGreaterThan(0.3);
    // 路緣高度上最亮的地方不比同一排的地面暗（格點夠細，跟得上兩瓣光）。
    expect(peak(tops, 'front')).toBeGreaterThan(ground * 0.9);
    expect(peak(sides, 'front')).toBeGreaterThan(ground * 0.9);
    for (const patch of patches) {
      for (const corner of patch.corners) {
        expect(corner.front).toBeCloseTo(lampLightAt(POSE, corner.x, corner.z).front, 2);
        expect(corner.front).toBeLessThanOrEqual(1);
        expect(corner.reverse).toBe(0);
      }
    }
  });

  test('頂面在路緣頂上（高過貼地的光斑）；立面從貼地光斑的高度到頂、貼在朝車的那一面', () => {
    const topY = CURB_CONFIG.heightM + RAISED.liftM;
    for (const patch of tops) {
      for (const corner of patch.corners) {
        expect(corner.y).toBeCloseTo(topY, 9);
        expect(corner.y).toBeGreaterThan(HEADLIGHT_CONFIG.poolLiftM);
      }
    }
    // 朝車的那一面是南面（+Z 那一側，z = −半車長 − 12 ft），往外推一點點。
    const faceZ = -HALF_LENGTH_M - ftToM(12) + RAISED.liftM;
    for (const patch of sides) {
      const heights = patch.corners.map((corner) => corner.y).sort((a, b) => a - b);
      expect(heights[0]).toBeCloseTo(HEADLIGHT_CONFIG.poolLiftM, 9);
      expect(heights[3]).toBeCloseTo(topY, 9);
      for (const corner of patch.corners) {
        expect(corner.z).toBeCloseTo(faceZ, 9);
      }
    }
  });

  test('只補光斑範圍裡的那一段：路緣兩頭、光斑之外沒有貼片', () => {
    for (const patch of patches) {
      for (const corner of patch.corners) {
        expect(Math.abs(corner.x)).toBeLessThanOrEqual(HEADLIGHT_CONFIG.frontPool.halfWidthM + 1e-9);
      }
    }
    // 整條都在光斑外的路緣：一片都沒有。
    const farAway = raisedBoxFromRect({ minX: 60, maxX: 61, minZ: -40, maxZ: 40 }, CURB_CONFIG.heightM);
    expect(raisedLightPatches([farAway], POSE, true)).toEqual([]);
    const behindCar = raisedBoxFromRect(
      { minX: -10, maxX: 10, minZ: HALF_LENGTH_M + 1, maxZ: HALF_LENGTH_M + 1.2 },
      CURB_CONFIG.heightM,
    );
    expect(raisedLightPatches([behindCar], POSE, false)).toEqual([]);
  });

  test('倒車燈亮的時候車尾後方的路緣也有光；不亮就沒有', () => {
    const behindCar = raisedBoxFromRect(
      { minX: ftToM(-10), maxX: ftToM(10), minZ: HALF_LENGTH_M + ftToM(4), maxZ: HALF_LENGTH_M + ftToM(4.5) },
      CURB_CONFIG.heightM,
    );
    const reversing = raisedLightPatches([behindCar], POSE, true);
    expect(peak(reversing, 'reverse')).toBeGreaterThan(0.3);
    expect(peak(reversing, 'front')).toBe(0);
    expect(reversing.some((patch) => patch.face === 'side')).toBe(true);
    expect(raisedLightPatches([behindCar], POSE, false)).toEqual([]);
  });

  test('斜放的車擋（任意朝向）一樣補得到；背對車的立面不補', () => {
    const stop = raisedBoxAt(
      ftToM(1),
      -HALF_LENGTH_M - ftToM(9),
      0.5,
      WHEEL_STOP_CONFIG.lengthM,
      WHEEL_STOP_CONFIG.baseDepthM,
      WHEEL_STOP_CONFIG.heightM,
    );
    const stopPatches = raisedLightPatches([stop], POSE, false);
    expect(stopPatches.some((patch) => patch.face === 'top')).toBe(true);
    const stopSides = stopPatches.filter((patch) => patch.face === 'side');
    expect(stopSides.length).toBeGreaterThan(0);
    for (const patch of stopSides) {
      // 立面的中點比車擋的中心更靠近車。
      const midZ = (patch.corners[0].z + patch.corners[1].z) / 2;
      const midX = (patch.corners[0].x + patch.corners[1].x) / 2;
      expect(Math.hypot(midX, midZ)).toBeLessThan(Math.hypot(stop.centerX, stop.centerZ) + ftToM(3.1));
    }
    // 貼片數有上限。
    expect(raisedLightPatches([CURB_AHEAD], POSE, false, 5)).toHaveLength(5);
  });
});

describe('場景裡的矮東西', () => {
  test('原型關：四段路緣石、目標車位的車擋、假車位的車擋', () => {
    const layout = createLotLayout(spot, startState, DEFAULT_SEED, QUALITY_PRESETS.high.props);
    const boxes = raisedBoxesOf(spot, layout, undefined, undefined);
    expect(boxes).toHaveLength(4 + 1 + layout.wheelStops.length);
    expect(boxes.filter((box) => box.heightM === CURB_CONFIG.heightM)).toHaveLength(4);
    // 前方的路緣在車位前緣之外。
    const inner = curbInnerBounds(spot);
    const frontCurb = spotLocalToWorld(spot, 0, inner.minZ - CURB_CONFIG.widthM / 2);
    expect(
      boxes.some(
        (box) => Math.abs(box.centerX - frontCurb.x) < 1e-6 && Math.abs(box.centerZ - frontCurb.z) < 1e-6,
      ),
    ).toBe(true);
    for (const box of boxes) {
      expect(box.heightM).toBeLessThanOrEqual(RAISED.maxHeightM);
      expect(box.heightM).toBeGreaterThan(HEADLIGHT_CONFIG.poolLiftM);
      expect(Math.hypot(box.axisX, box.axisZ)).toBeCloseTo(1, 9);
    }
  });

  test('第 1 世界：矮路緣的關卡四面邊界都算；窄巷的邊界是高牆，不算', () => {
    const bounded = LEVELS.filter((level) => level.boundsFt !== undefined);
    expect(bounded.length).toBeGreaterThanOrEqual(10);
    for (const level of bounded) {
      const layout = createEnvironmentLayout(level, QUALITY_PRESETS.medium.props);
      const boxes = raisedBoxesOf(level.layout.spot, undefined, layout, level);
      if (level.environment === 'narrow_alley') {
        expect(boxes.every((box) => box.heightM <= RAISED.maxHeightM), level.id).toBe(true);
        expect(boxes.some((box) => box.heightM > ftToM(2)), level.id).toBe(false);
      } else {
        expect(boxes.length, level.id).toBeGreaterThanOrEqual(4);
      }
      for (const box of boxes) {
        expect(box.heightM, level.id).toBeLessThanOrEqual(RAISED.maxHeightM);
        expect(box.halfAlongM, level.id).toBeGreaterThan(0);
        expect(box.halfAcrossM, level.id).toBeGreaterThan(0);
      }
    }
  });
});

describe('貼片的網格', () => {
  test('有貼地光斑的級別（medium 以上）才建立；low 維持原設定（沒有）', () => {
    for (const level of QUALITY_LEVELS) {
      const quality = QUALITY_PRESETS[level];
      const light = createRaisedPoolLight([CURB_AHEAD], quality.headlights, usesHdrChain(quality));
      expect(light !== undefined, level).toBe(quality.headlights.groundPool);
    }
    expect(createRaisedPoolLight([CURB_AHEAD], QUALITY_PRESETS.low.headlights, false)).toBeUndefined();
    expect(createRaisedPoolLight([], QUALITY_PRESETS.high.headlights, true)).toBeUndefined();
  });

  test('加色混合、保留深度測試（不穿透東西）、不寫深度、不進環境光遮蔽；一個網格', () => {
    const quality = QUALITY_PRESETS.medium;
    const light = createRaisedPoolLight([CURB_AHEAD], quality.headlights, false);
    if (light === undefined) {
      throw new Error('medium 應該有');
    }
    expect(light.mesh).toBeInstanceOf(Mesh);
    const material = light.mesh.material;
    if (!(material instanceof MeshBasicMaterial)) {
      throw new Error('材質應該是 MeshBasicMaterial');
    }
    expect(material.blending).toBe(AdditiveBlending);
    expect(material.depthTest).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.toneMapped).toBe(false);
    expect(light.mesh.userData[SKIP_AMBIENT_OCCLUSION]).toBe(true);
    expect(light.mesh.castShadow).toBe(false);
  });

  test('update 依車的位置填頂點：亮度與貼地光斑同一個上限；車開走就清空', () => {
    const quality = QUALITY_PRESETS.medium;
    const light = createRaisedPoolLight([CURB_AHEAD], quality.headlights, false);
    if (light === undefined) {
      throw new Error('medium 應該有');
    }
    expect(light.mesh.geometry.drawRange.count).toBe(0);
    light.update(POSE, false);
    const count = light.mesh.geometry.drawRange.count;
    expect(count).toBe(raisedLightPatches([CURB_AHEAD], POSE, false).length * 6);
    expect(count).toBeGreaterThan(0);
    const colors = light.mesh.geometry.getAttribute('color');
    let brightest = 0;
    for (let index = 0; index < (count / 6) * 4; index += 1) {
      brightest = Math.max(brightest, colors.getX(index), colors.getY(index), colors.getZ(index));
    }
    expect(brightest).toBeGreaterThan(HEADLIGHT_CONFIG.poolBrightness.direct * 0.3);
    expect(brightest).toBeLessThanOrEqual(HEADLIGHT_CONFIG.poolBrightness.direct + 1e-6);
    // 車開到很遠的地方：這條路緣上沒有光。
    light.update({ x: 500, z: 500, headingRad: 1 }, false);
    expect(light.mesh.geometry.drawRange.count).toBe(0);
  });

  test('有真光源的級別（high）貼片只補一點形狀，與貼地光斑同一個比例', () => {
    const peakOf = (level: 'medium' | 'high'): number => {
      const quality = QUALITY_PRESETS[level];
      const light = createRaisedPoolLight([CURB_AHEAD], quality.headlights, usesHdrChain(quality));
      if (light === undefined) {
        throw new Error(`${level} 應該有`);
      }
      light.update(POSE, false);
      const colors = light.mesh.geometry.getAttribute('color');
      let brightest = 0;
      for (let index = 0; index < (light.mesh.geometry.drawRange.count / 6) * 4; index += 1) {
        brightest = Math.max(brightest, colors.getX(index));
      }
      return brightest;
    };
    expect(peakOf('high')).toBeLessThanOrEqual(
      HEADLIGHT_CONFIG.poolBrightness.hdr * HEADLIGHT_CONFIG.poolWithLightScale + 1e-6,
    );
    expect(peakOf('medium')).toBeLessThanOrEqual(HEADLIGHT_CONFIG.poolBrightness.direct + 1e-6);
  });
});
