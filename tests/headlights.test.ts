// 玩家車頭燈照地（carHeadlights.ts）：各畫質級別有哪些元件、光斑與真光源的位置、倒車的光、亮度上限。
// 不開 WebGL：只檢查物件、材質與幾何。
import {
  AdditiveBlending,
  Box3,
  Mesh,
  MeshBasicMaterial,
  SpotLight,
  Vector3,
  type Object3D,
} from 'three';
import { describe, expect, test } from 'vitest';
import { SKIP_AMBIENT_OCCLUSION } from '../src/render/ambientOcclusionFlag';
import { QUALITY_LEVELS, usesHdrChain } from '../src/render/quality';
import {
  HEADLIGHT_CONFIG,
  LOT_PROPS_CONFIG,
  QUALITY_PRESETS,
  SPOT_MARKING_CONFIG,
} from '../src/render/renderConfig';
import { beamBrightness, createCarHeadlights, type CarHeadlights } from '../src/vehicle/carHeadlights';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';

const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;

function headlightsFor(level: (typeof QUALITY_LEVELS)[number]): CarHeadlights {
  const quality = QUALITY_PRESETS[level];
  return createCarHeadlights(quality.headlights, usesHdrChain(quality));
}

function spotLightsOf(root: Object3D): SpotLight[] {
  const lights: SpotLight[] = [];
  root.traverse((object) => {
    if (object instanceof SpotLight) {
      lights.push(object);
    }
  });
  return lights;
}

function poolOf(root: Object3D, name: string): Mesh | undefined {
  const found = root.getObjectByName(name);
  return found instanceof Mesh ? found : undefined;
}

/** 光斑材質的顏色裡最大的一個分量（線性）＝最亮處加到畫面上的量。 */
function peakBrightness(pool: Mesh): number {
  const { color } = pool.material as MeshBasicMaterial;
  return Math.max(color.r, color.g, color.b);
}

describe('頭燈的畫質設定', () => {
  test('low 只有發光燈殼；medium 加地上的光斑；high、ultra 再加真光源，盞數只增不減', () => {
    expect(QUALITY_PRESETS.low.headlights).toEqual({ groundPool: false, spotLights: 0 });
    expect(QUALITY_PRESETS.medium.headlights).toEqual({ groundPool: true, spotLights: 0 });
    expect(QUALITY_PRESETS.high.headlights.groundPool).toBe(true);
    expect(QUALITY_PRESETS.high.headlights.spotLights).toBeGreaterThanOrEqual(1);
    expect(QUALITY_PRESETS.ultra.headlights.spotLights).toBeGreaterThanOrEqual(
      QUALITY_PRESETS.high.headlights.spotLights,
    );
    expect(QUALITY_PRESETS.ultra.headlights.spotLights).toBeLessThanOrEqual(2);
  });
});

describe('頭燈元件 createCarHeadlights', () => {
  test('low：沒有真光源，也沒有光斑', () => {
    const { root } = headlightsFor('low');
    expect(spotLightsOf(root)).toEqual([]);
    expect(poolOf(root, 'headlightPool')).toBeUndefined();
    expect(poolOf(root, 'reversePool')).toBeUndefined();
  });

  test('medium：有光斑、沒有真光源', () => {
    const { root } = headlightsFor('medium');
    expect(spotLightsOf(root)).toEqual([]);
    expect(poolOf(root, 'headlightPool')).toBeDefined();
  });

  test.each(['high', 'ultra'] as const)('%s：有不投影的真光源，也有光斑', (level) => {
    const { root } = headlightsFor(level);
    const lights = spotLightsOf(root);
    expect(lights.length).toBe(QUALITY_PRESETS[level].headlights.spotLights);
    expect(lights.length).toBeGreaterThan(0);
    for (const light of lights) {
      expect(light.castShadow).toBe(false);
      expect(light.distance).toBeGreaterThan(0);
      expect(light.angle).toBeLessThan(Math.PI / 4);
    }
    expect(poolOf(root, 'headlightPool')).toBeDefined();
  });

  test('真光源在車頭前緣之前、瞄準更前方的地面；光源與瞄準點都掛在同一個根節點下（跟著車轉）', () => {
    for (const level of ['high', 'ultra'] as const) {
      const { root } = headlightsFor(level);
      for (const light of spotLightsOf(root)) {
        expect(light.parent).toBe(root);
        expect(light.target.parent).toBe(root);
        expect(light.position.z).toBeLessThan(-HALF_LENGTH_M);
        expect(light.position.y).toBeGreaterThan(0);
        expect(light.target.position.z).toBeLessThan(light.position.z - 3);
        expect(light.target.position.y).toBe(0);
        expect(Math.abs(light.position.x)).toBeLessThan(VEHICLE_CONFIG_SI.widthM / 2);
      }
    }
    // 兩盞時左右對稱。
    const xs = spotLightsOf(headlightsFor('ultra').root).map((light) => light.position.x);
    expect(xs.reduce((sum, x) => sum + x, 0)).toBeCloseTo(0, 9);
  });

  test('真光源的總強度與盞數無關', () => {
    const total = (level: 'high' | 'ultra'): number =>
      spotLightsOf(headlightsFor(level).root).reduce((sum, light) => sum + light.intensity, 0);
    expect(total('high')).toBeCloseTo(HEADLIGHT_CONFIG.lightIntensity, 9);
    expect(total('ultra')).toBeCloseTo(HEADLIGHT_CONFIG.lightIntensity, 9);
  });

  test('光斑整片在車頭前方（本地 −Z）、貼地但高於車位標線、左右對稱', () => {
    const { root } = headlightsFor('medium');
    root.updateMatrixWorld(true);
    const pool = poolOf(root, 'headlightPool');
    if (pool === undefined) {
      throw new Error('medium 應該有光斑');
    }
    const bounds = new Box3().setFromObject(pool);
    expect(bounds.max.z).toBeCloseTo(-HALF_LENGTH_M, 6);
    expect(bounds.min.z).toBeLessThan(-HALF_LENGTH_M - 6);
    expect(bounds.min.x).toBeCloseTo(-bounds.max.x, 6);
    expect(bounds.min.y).toBeGreaterThan(SPOT_MARKING_CONFIG.liftM);
    expect(bounds.max.y).toBeLessThan(0.05);
    expect(bounds.max.y - bounds.min.y).toBeLessThan(1e-6);
  });

  test('光斑是加色混合、不寫深度、不做色調映射、不投影不收影、不參與環境光遮蔽', () => {
    const { root } = headlightsFor('high');
    for (const name of ['headlightPool', 'reversePool']) {
      const pool = poolOf(root, name);
      if (pool === undefined) {
        throw new Error(`缺少 ${name}`);
      }
      const material = pool.material as MeshBasicMaterial;
      expect(material).toBeInstanceOf(MeshBasicMaterial);
      expect(material.blending).toBe(AdditiveBlending);
      expect(material.transparent).toBe(true);
      expect(material.depthWrite).toBe(false);
      expect(material.toneMapped).toBe(false);
      expect(material.vertexColors).toBe(true);
      expect(pool.castShadow).toBe(false);
      expect(pool.receiveShadow).toBe(false);
      expect(pool.userData[SKIP_AMBIENT_OCCLUSION]).toBe(true);
    }
  });

  test('倒車的光只在 setReversing(true) 時看得到，而且整片在車尾後方（+Z），比頭燈的光斑小', () => {
    const headlights = headlightsFor('medium');
    headlights.root.updateMatrixWorld(true);
    const reverse = poolOf(headlights.root, 'reversePool');
    const front = poolOf(headlights.root, 'headlightPool');
    if (reverse === undefined || front === undefined) {
      throw new Error('medium 應該有兩片光斑');
    }
    expect(reverse.visible).toBe(false);
    expect(front.visible).toBe(true);
    headlights.setReversing(true);
    expect(reverse.visible).toBe(true);
    expect(front.visible).toBe(true);
    headlights.setReversing(false);
    expect(reverse.visible).toBe(false);

    const bounds = new Box3().setFromObject(reverse);
    expect(bounds.min.z).toBeCloseTo(HALF_LENGTH_M, 6);
    expect(bounds.max.z).toBeGreaterThan(HALF_LENGTH_M + 2);
    const size = bounds.getSize(new Vector3());
    const frontSize = new Box3().setFromObject(front).getSize(new Vector3());
    expect(size.z).toBeLessThan(frontSize.z / 2);
    expect(size.x).toBeLessThan(frontSize.x);
  });

  test('low 沒有倒車的光，setReversing 也不會出錯', () => {
    const headlights = headlightsFor('low');
    expect(() => {
      headlights.setReversing(true);
    }).not.toThrow();
    expect(headlights.root.children).toEqual([]);
  });

  test('亮度有上限（不洗白）：光斑不比路燈的光暈亮太多，倒車的光比頭燈淡很多，有真光源時光斑更淡', () => {
    for (const level of ['medium', 'high', 'ultra'] as const) {
      const { root } = headlightsFor(level);
      const front = poolOf(root, 'headlightPool');
      if (front === undefined) {
        throw new Error(`${level} 應該有光斑`);
      }
      const lampPool = usesHdrChain(QUALITY_PRESETS[level])
        ? LOT_PROPS_CONFIG.lampPoolBrightness.hdr
        : LOT_PROPS_CONFIG.lampPoolBrightness.direct;
      expect(peakBrightness(front)).toBeGreaterThan(0);
      expect(peakBrightness(front)).toBeLessThanOrEqual(2 * lampPool);
    }
    // 倒車的光比（沒有真光源時的）頭燈光斑淡一半以上。
    const { poolBrightness, reverseBrightness } = HEADLIGHT_CONFIG;
    expect(reverseBrightness.hdr).toBeLessThan(0.5 * poolBrightness.hdr);
    expect(reverseBrightness.direct).toBeLessThan(0.5 * poolBrightness.direct);
    expect(HEADLIGHT_CONFIG.poolWithLightScale).toBeLessThan(1);
    expect(HEADLIGHT_CONFIG.poolBrightness.direct).toBeLessThan(0.25);
    expect(HEADLIGHT_CONFIG.poolBrightness.hdr).toBeLessThan(1);
  });
});

describe('光斑的形狀 beamBrightness', () => {
  const shape = HEADLIGHT_CONFIG.frontPool;

  test('亮度在 0–1；面片的四邊剛好是 0（看不出面片的邊）', () => {
    for (let ahead = 0; ahead <= shape.lengthM; ahead += shape.lengthM / 40) {
      for (let lateral = -shape.halfWidthM; lateral <= shape.halfWidthM; lateral += shape.halfWidthM / 20) {
        const value = beamBrightness(shape, lateral, ahead);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      expect(beamBrightness(shape, shape.halfWidthM, ahead)).toBe(0);
      expect(beamBrightness(shape, -shape.halfWidthM, ahead)).toBe(0);
    }
    expect(beamBrightness(shape, 0, 0)).toBe(0);
    expect(beamBrightness(shape, 0, shape.lengthM)).toBe(0);
  });

  test('車頭前不遠最亮、往遠處變淡；左右對稱', () => {
    const near = beamBrightness(shape, shape.lobeOffsetM, shape.riseM);
    const middle = beamBrightness(shape, shape.lobeOffsetM, shape.lengthM / 2);
    const far = beamBrightness(shape, shape.lobeOffsetM, 0.9 * shape.lengthM);
    expect(near).toBeGreaterThan(0.5);
    expect(middle).toBeLessThan(near);
    expect(far).toBeLessThan(middle);
    expect(beamBrightness(shape, -1.1, 3)).toBeCloseTo(beamBrightness(shape, 1.1, 3), 12);
  });

  test('車頭前是兩瓣（兩盞燈之間比燈的正前方暗），遠處合成一片', () => {
    const nearM = 0.6 * shape.riseM;
    expect(beamBrightness(shape, 0, nearM)).toBeLessThan(
      0.8 * beamBrightness(shape, shape.lobeOffsetM, nearM),
    );
    const farM = 0.7 * shape.lengthM;
    expect(beamBrightness(shape, 0, farM)).toBeGreaterThanOrEqual(
      beamBrightness(shape, shape.lobeOffsetM, farM),
    );
  });

  test('倒車的光只有一瓣：中線最亮', () => {
    const reverse = HEADLIGHT_CONFIG.reversePool;
    expect(reverse.lobeOffsetM).toBe(0);
    expect(beamBrightness(reverse, 0, reverse.riseM)).toBeGreaterThan(
      beamBrightness(reverse, 1, reverse.riseM),
    );
  });
});
