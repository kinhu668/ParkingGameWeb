// 光柱（路燈的光錐、車頭燈的光柱）：哪些天氣、哪些畫質級別有；亮度跟著天氣；材質是加色、不寫深度、不進環境光遮蔽；
// 「視線穿過圓錐多長」與沿光軸亮度的式子。不開 WebGL。
import { AdditiveBlending, InstancedMesh, Mesh, ShaderMaterial, type Object3D } from 'three';
import { describe, expect, test } from 'vitest';
import { DEFAULT_SEED } from '../src/core/gameConfig';
import { WEATHER_IDS, type WeatherId } from '../src/core/weather';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import { createLotLayout } from '../src/props/lotLayout';
import { createLotProps } from '../src/props/lotProps';
import { SKIP_AMBIENT_OCCLUSION } from '../src/render/ambientOcclusionFlag';
import {
  DEFAULT_SHAFT_SETUP,
  createShaftGeometry,
  shaftAxialBrightness,
  shaftChordM,
  shaftPeakBrightness,
  type ShaftSetup,
  type ShaftShape,
} from '../src/render/lightShaft';
import { QUALITY_LEVELS, usesHdrChain, type QualityLevel } from '../src/render/quality';
import {
  HEADLIGHT_CONFIG,
  LIGHT_SHAFT_CONFIG,
  LOT_PROPS_CONFIG,
  QUALITY_PRESETS,
} from '../src/render/renderConfig';
import { WEATHER_PRESETS } from '../src/render/weatherPresets';
import { createCarHeadlights, headlightShaftShape } from '../src/vehicle/carHeadlights';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';

const { spot, startState } = PROTOTYPE_LAYOUT;
const MISTY: readonly WeatherId[] = ['rain', 'storm', 'night'];

/** 與 scene.ts 相同的組法：這種天氣、這個畫質級別的光柱設定。 */
function setupFor(level: QualityLevel, strength: number, time = { value: 0 }): ShaftSetup {
  return {
    air: { strength, fogNearM: 20, fogFarM: 120, time },
    quality: QUALITY_PRESETS[level].lightShafts,
  };
}

function lampCones(level: QualityLevel, weather: WeatherId): Mesh | undefined {
  const quality = QUALITY_PRESETS[level];
  const preset = WEATHER_PRESETS[weather];
  const group = createLotProps(
    spot,
    createLotLayout(spot, startState, DEFAULT_SEED, quality.props),
    quality.props,
    usesHdrChain(quality),
    preset.lampsOn,
    'classic',
    Infinity,
    setupFor(level, preset.air.lampShaft),
  );
  const found = group.getObjectByName('lampCones');
  return found instanceof Mesh ? found : undefined;
}

function shaftsOf(root: Object3D): Mesh[] {
  const shafts: Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh && object.name === 'headlightShaft') {
      shafts.push(object);
    }
  });
  return shafts;
}

function headlightShafts(level: QualityLevel, weather: WeatherId): Mesh[] {
  const quality = QUALITY_PRESETS[level];
  return shaftsOf(
    createCarHeadlights(
      quality.headlights,
      usesHdrChain(quality),
      setupFor(level, WEATHER_PRESETS[weather].air.headlightShaft),
    ).root,
  );
}

function shaftMaterial(mesh: Mesh): ShaderMaterial {
  if (!(mesh.material instanceof ShaderMaterial)) {
    throw new Error('光柱的材質應該是 ShaderMaterial');
  }
  return mesh.material;
}

describe('畫質分級', () => {
  test('low 用便宜的版本：段數最少、車頭只有一道、沒有噪聲；級別越高越完整', () => {
    expect(QUALITY_PRESETS.low.lightShafts).toEqual({
      radialSegments: 12,
      headlightBeams: 1,
      noiseOctaves: 0,
    });
    let previous = QUALITY_PRESETS.low.lightShafts;
    for (const level of ['medium', 'high', 'ultra'] as const) {
      const shafts = QUALITY_PRESETS[level].lightShafts;
      expect(shafts.radialSegments).toBeGreaterThanOrEqual(previous.radialSegments);
      expect(shafts.noiseOctaves).toBeGreaterThanOrEqual(previous.noiseOctaves);
      expect(shafts.headlightBeams).toBe(2);
      expect(shafts.noiseOctaves).toBeGreaterThan(0);
      previous = shafts;
    }
  });
});

describe('路燈的光錐', () => {
  test('雨、雷雨、夜晚每個畫質級別都有（low 也有）；黃昏的 low 沒有；白天路燈不亮所以沒有', () => {
    for (const level of QUALITY_LEVELS) {
      for (const weather of MISTY) {
        const cones = lampCones(level, weather);
        expect(cones, `${level} ${weather}`).toBeInstanceOf(InstancedMesh);
        expect(cones instanceof InstancedMesh ? cones.count : 0).toBeGreaterThan(0);
      }
      expect(lampCones(level, 'clear'), level).toBeUndefined();
      expect(lampCones(level, 'wet'), level).toBeUndefined();
    }
    expect(lampCones('low', 'dusk')).toBeUndefined();
    expect(lampCones('medium', 'dusk')).toBeInstanceOf(InstancedMesh);
  });

  test('亮度跟著天氣：雷雨 ≥ 雨 > 夜晚 > 黃昏；黃昏就是設定檔的基準值', () => {
    for (const level of ['medium', 'high'] as const) {
      const peak = (weather: WeatherId): number => {
        const cones = lampCones(level, weather);
        if (cones === undefined) {
          throw new Error(`${level} ${weather} 應該有光錐`);
        }
        return shaftPeakBrightness(shaftMaterial(cones));
      };
      expect(peak('storm')).toBeGreaterThanOrEqual(peak('rain'));
      expect(peak('rain')).toBeGreaterThan(peak('night'));
      expect(peak('night')).toBeGreaterThan(peak('dusk') * 1.5);
      const base = usesHdrChain(QUALITY_PRESETS[level])
        ? LOT_PROPS_CONFIG.lampConeBrightness.hdr
        : LOT_PROPS_CONFIG.lampConeBrightness.direct;
      // 顏色最大的分量是 1（紅），所以最亮處就是亮度本身。
      expect(peak('dusk')).toBeCloseTo(base, 6);
    }
  });

  test('加色混合、不寫深度、不做色調映射、不吃霧、不進環境光遮蔽、不投影；實例只有平移', () => {
    for (const level of QUALITY_LEVELS) {
      const cones = lampCones(level, 'storm');
      if (!(cones instanceof InstancedMesh)) {
        throw new Error('應該有光錐');
      }
      const material = shaftMaterial(cones);
      expect(material.blending).toBe(AdditiveBlending);
      expect(material.transparent).toBe(true);
      expect(material.depthWrite).toBe(false);
      expect(material.depthTest).toBe(true);
      expect(material.toneMapped).toBe(false);
      expect(material.fog).toBe(false);
      expect(cones.userData[SKIP_AMBIENT_OCCLUSION]).toBe(true);
      expect(cones.castShadow).toBe(false);
      expect(material.defines?.['SHAFT_NOISE_OCTAVES']).toBe(QUALITY_PRESETS[level].lightShafts.noiseOctaves);
      // 著色器把鏡頭換到光柱本地座標時假設沒有縮放。
      const elements = cones.instanceMatrix.array;
      for (let index = 0; index < cones.count; index += 1) {
        const m = elements.slice(index * 16, index * 16 + 16);
        expect([m[0], m[5], m[10]]).toEqual([1, 1, 1]);
        expect([m[1], m[2], m[4], m[6], m[8], m[9]]).toEqual([0, 0, 0, 0, 0, 0]);
      }
    }
  });

  test('光錐從燈頭一路到地面', () => {
    const cones = lampCones('medium', 'rain');
    if (!(cones instanceof InstancedMesh)) {
      throw new Error('應該有光錐');
    }
    cones.geometry.computeBoundingBox();
    const box = cones.geometry.boundingBox;
    expect(box?.max.y).toBeCloseTo(0, 6);
    const headY = cones.instanceMatrix.array[13] ?? 0;
    expect(headY + (box?.min.y ?? 0)).toBeCloseTo(0, 5);
    expect(headY).toBeGreaterThan(LOT_PROPS_CONFIG.lampHeightM * 0.9);
  });
});

describe('車頭燈的光柱', () => {
  test('雨、雷雨、夜晚每個畫質級別都有：low 一道、其餘兩道；乾淨的空氣（晴天、黃昏、雨後）沒有', () => {
    for (const level of QUALITY_LEVELS) {
      for (const weather of MISTY) {
        expect(headlightShafts(level, weather).length, `${level} ${weather}`).toBe(
          QUALITY_PRESETS[level].lightShafts.headlightBeams,
        );
      }
      for (const weather of ['clear', 'dusk', 'wet'] as const) {
        expect(headlightShafts(level, weather), `${level} ${weather}`).toEqual([]);
      }
    }
    expect(headlightShafts('low', 'rain')).toHaveLength(1);
    expect(headlightShafts('medium', 'rain')).toHaveLength(2);
  });

  test('不給光柱設定（展示台、舊的呼叫方式）就沒有光柱', () => {
    const quality = QUALITY_PRESETS.high;
    expect(shaftsOf(createCarHeadlights(quality.headlights, true).root)).toEqual([]);
  });

  test('從車頭的燈殼往前、略往下；兩道在左右兩盞燈的位置；一道時在中央而且比較寬', () => {
    const halfLengthM = VEHICLE_CONFIG_SI.lengthM / 2;
    const two = headlightShafts('medium', 'storm');
    expect(two.map((shaft) => shaft.position.x).sort()).toEqual(
      [-HEADLIGHT_CONFIG.lampOffsetM, HEADLIGHT_CONFIG.lampOffsetM].sort(),
    );
    for (const shaft of two) {
      expect(shaft.position.z).toBeLessThan(-halfLengthM);
      expect(shaft.position.y).toBeCloseTo(HEADLIGHT_CONFIG.shaft.heightM, 9);
      // 本地 −Y（光軸）轉到世界之後：朝車頭（−Z）而且往下。
      shaft.updateMatrixWorld();
      const e = shaft.matrixWorld.elements;
      const axis = { y: -(e[5] ?? 0), z: -(e[6] ?? 0) };
      expect(axis.z).toBeLessThan(-0.99);
      expect(axis.y).toBeLessThan(0);
      expect(shaft.userData[SKIP_AMBIENT_OCCLUSION]).toBe(true);
      expect(shaftMaterial(shaft).blending).toBe(AdditiveBlending);
      expect(shaftMaterial(shaft).depthWrite).toBe(false);
    }
    const [single] = headlightShafts('low', 'storm');
    expect(single?.position.x).toBe(0);
    expect(headlightShaftShape(1).farRadiusM).toBeGreaterThan(headlightShaftShape(2).farRadiusM);
  });

  test('亮度跟著天氣：雷雨 ≥ 雨 > 夜晚', () => {
    const peak = (weather: WeatherId): number => {
      const [shaft] = headlightShafts('medium', weather);
      if (shaft === undefined) {
        throw new Error('應該有光柱');
      }
      return shaftPeakBrightness(shaftMaterial(shaft));
    };
    expect(peak('storm')).toBeGreaterThanOrEqual(peak('rain'));
    expect(peak('rain')).toBeGreaterThan(peak('night'));
    expect(peak('night')).toBeGreaterThan(0);
  });
});

describe('霧氣流動的時間', () => {
  test('同一個場景的光柱共用同一個時間 uniform；不走時間就是靜止的', () => {
    const time = { value: 0 };
    const quality = QUALITY_PRESETS.high;
    const first = shaftsOf(createCarHeadlights(quality.headlights, true, setupFor('high', 1, time)).root);
    const second = shaftsOf(createCarHeadlights(quality.headlights, true, setupFor('high', 1, time)).root);
    for (const shaft of [...first, ...second]) {
      expect(shaftMaterial(shaft).uniforms['shaftTime']).toBe(time);
    }
    expect(DEFAULT_SHAFT_SETUP.air.time.value).toBe(0);
    expect(DEFAULT_SHAFT_SETUP.quality.noiseOctaves).toBe(0);
  });
});

describe('光柱的式子', () => {
  const shape: ShaftShape = {
    nearRadiusM: 0.5,
    farRadiusM: 4,
    lengthM: 7,
    riseFraction: 0.05,
    falloffExponent: 1,
    spreadExponent: 0.3,
  };

  test('沿光軸：光源端是 0、很快升到最亮、往遠端淡到 0', () => {
    expect(shaftAxialBrightness(shape, 0)).toBe(0);
    expect(shaftAxialBrightness(shape, 1)).toBe(0);
    const samples = [0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 0.95].map((along) =>
      shaftAxialBrightness(shape, along),
    );
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeLessThan(samples[index - 1] ?? 0);
    }
    expect(samples[0]).toBeGreaterThan(0.5);
    expect(samples[samples.length - 1]).toBeGreaterThan(0);
  });

  test('橫著穿過正中間：弦長就是那一處的直徑', () => {
    // 高度 −3.5（一半長度）的半徑是 2.25；視線水平、通過軸心。
    const radius = 0.5 + (4 - 0.5) * 0.5;
    const chord = shaftChordM(shape, { x: -10, y: -3.5, z: 0 }, { x: 1, y: 0, z: 0 }, 10 - radius);
    expect(chord).toBeCloseTo(2 * radius, 6);
  });

  test('越靠近輪廓弦越短，擦過邊緣趨近 0（邊緣自然淡掉）', () => {
    const radius = 2.25;
    let previous = Number.POSITIVE_INFINITY;
    for (const offset of [0, 0.5, 1, 1.5, 2, 2.2, 2.249]) {
      const half = Math.sqrt(radius * radius - offset * offset);
      const chord = shaftChordM(shape, { x: -10, y: -3.5, z: offset }, { x: 1, y: 0, z: 0 }, 10 - half);
      expect(chord).toBeCloseTo(2 * half, 6);
      expect(chord).toBeLessThan(previous);
      previous = chord;
    }
    expect(previous).toBeLessThan(0.15);
  });

  test('順著光軸往下看：從側面進去、從遠端的端面出去，弦比直徑長', () => {
    // 從上方外側斜斜往下：在高度 −1 碰到斜面（半徑 1），一路走到 y = −7。
    const origin = { x: 1, y: 3, z: 0 };
    const direction = { x: 0, y: -1, z: 0 };
    const chord = shaftChordM(shape, origin, direction, 4);
    expect(chord).toBeCloseTo(6, 6);
  });

  test('幾何：光源端在原點、沿 −Y；段數跟著畫質；每個頂點帶著沿光軸的比例', () => {
    for (const segments of [12, 28]) {
      const geometry = createShaftGeometry(shape, segments);
      geometry.computeBoundingBox();
      expect(geometry.boundingBox?.max.y).toBeCloseTo(0, 6);
      expect(geometry.boundingBox?.min.y).toBeCloseTo(-shape.lengthM, 6);
      expect(geometry.boundingBox?.max.x).toBeCloseTo(shape.farRadiusM, 6);
      const along = geometry.getAttribute('shaftAlong');
      const position = geometry.getAttribute('position');
      expect(along.count).toBe((segments + 1) * (LIGHT_SHAFT_CONFIG.heightSegments + 1));
      for (let index = 0; index < along.count; index += 1) {
        expect(along.getX(index)).toBeCloseTo(-position.getY(index) / shape.lengthM, 6);
      }
    }
  });

  test('六種天氣都列到了', () => {
    expect(WEATHER_IDS).toHaveLength(6);
  });
});
