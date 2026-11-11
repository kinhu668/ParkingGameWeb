// 地面：噪聲貼圖的可重現性、各層疊起來沒有短周期、畫質級別對著色器開關的矩陣、著色器片段插得進 three 的原始碼。
// 不開 WebGL：只測純函式、字串與材質物件。
import { ShaderLib, type DataTexture, type Vector4 } from 'three';
import { describe, expect, test } from 'vitest';
import { DEFAULT_SEED } from '../src/core/gameConfig';
import { ftToM } from '../src/core/units';
import { createGround, createGroundMaterial } from '../src/props/ground';
import { GROUND_NOISE_CHANNEL, generateAsphaltPixels } from '../src/props/groundNoise';
import {
  GROUND_LAYER_ORDER,
  groundLayerTransforms,
  groundLayerUv,
  groundShaderDefines,
  patchGroundShader,
} from '../src/props/groundShader';
import { QUALITY_LEVELS } from '../src/render/quality';
import { FOG_CONFIG, GROUND_CONFIG, QUALITY_PRESETS } from '../src/render/renderConfig';

/** 測試用的小貼圖邊長；產生器的行為與邊長無關，小一點測試才快。 */
const SMALL = 128;

/** 某個色版的所有數值。 */
function channelValues(pixels: Uint8Array, channel: number): number[] {
  const values: number[] = [];
  for (let offset = channel; offset < pixels.length; offset += 4) {
    values.push(pixels[offset] ?? 0);
  }
  return values;
}

describe('地面噪聲貼圖 generateAsphaltPixels', () => {
  test('同種子位元組完全相同，不同種子不同', () => {
    const first = generateAsphaltPixels(DEFAULT_SEED, SMALL);
    expect(generateAsphaltPixels(DEFAULT_SEED, SMALL)).toEqual(first);
    expect(generateAsphaltPixels(DEFAULT_SEED + 1, SMALL)).not.toEqual(first);
  });

  test.each([64, SMALL, 512])('邊長 %i：大小是 邊長² × 4', (size) => {
    expect(generateAsphaltPixels(DEFAULT_SEED, size).length).toBe(size * size * 4);
  });

  test('四個色版都不是純死色', () => {
    const pixels = generateAsphaltPixels(DEFAULT_SEED, SMALL);
    for (const channel of [
      GROUND_NOISE_CHANNEL.grain,
      GROUND_NOISE_CHANNEL.patch,
      GROUND_NOISE_CHANNEL.blotch,
    ]) {
      expect(new Set(channelValues(pixels, channel)).size, `色版 ${channel}`).toBeGreaterThan(30);
    }
    // 大片深淺與斑塊拉伸到用滿 0–255，著色器的門檻才不必跟著種子調。
    for (const channel of [GROUND_NOISE_CHANNEL.patch, GROUND_NOISE_CHANNEL.blotch]) {
      const values = channelValues(pixels, channel);
      expect(Math.min(...values)).toBe(0);
      expect(Math.max(...values)).toBe(255);
    }
  });

  test('顆粒的平均在中間值附近（著色器以 0.5 為「不變」）', () => {
    const values = channelValues(generateAsphaltPixels(DEFAULT_SEED, SMALL), GROUND_NOISE_CHANNEL.grain);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length / 255;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });

  test('裂縫是細線：大部分像素沒有裂縫，但確實有裂縫', () => {
    const values = channelValues(
      generateAsphaltPixels(DEFAULT_SEED, 512),
      GROUND_NOISE_CHANNEL.crack,
    );
    const cracked = values.filter((value) => value > 128).length / values.length;
    expect(cracked).toBeGreaterThan(0.001);
    expect(cracked).toBeLessThan(0.1);
    expect(values.filter((value) => value === 0).length / values.length).toBeGreaterThan(0.8);
  });
});

describe('噪聲層 groundLayerTransforms', () => {
  test('同種子相同、不同種子位移不同；層數與順序固定', () => {
    const layers = groundLayerTransforms(DEFAULT_SEED);
    expect(layers).toHaveLength(GROUND_LAYER_ORDER.length);
    expect(groundLayerTransforms(DEFAULT_SEED)).toEqual(layers);
    const other = groundLayerTransforms(DEFAULT_SEED + 1);
    expect(other.map((layer) => layer.offsetU)).not.toEqual(layers.map((layer) => layer.offsetU));
    // 周期與角度來自設定，不隨種子變。
    expect(other.map((layer) => layer.cosOverPeriod)).toEqual(
      layers.map((layer) => layer.cosOverPeriod),
    );
  });

  test('貼圖座標只看世界座標：走一個周期剛好繞一圈', () => {
    const layers = groundLayerTransforms(DEFAULT_SEED);
    const fine = layers[0];
    expect(fine).toBeDefined();
    if (fine === undefined) {
      return;
    }
    // 細顆粒層沒有旋轉：沿 +X 走一個周期，u 加 1、v 不變。
    const period = GROUND_CONFIG.layers.fineGrain.periodM;
    const here = groundLayerUv(fine, 3, -7);
    const there = groundLayerUv(fine, 3 + period, -7);
    expect(there.u - here.u).toBeCloseTo(1, 9);
    expect(there.v - here.v).toBeCloseTo(0, 9);
  });

  test('各層的角度都不同、周期互不成整數比', () => {
    const entries = GROUND_LAYER_ORDER.map((name) => GROUND_CONFIG.layers[name]);
    for (let first = 0; first < entries.length; first += 1) {
      for (let second = first + 1; second < entries.length; second += 1) {
        const a = entries[first];
        const b = entries[second];
        if (a === undefined || b === undefined) {
          throw new Error('層設定不存在');
        }
        // 方形貼圖轉 90° 還是同一個格子，所以角度差以 90° 為周期來看。
        const angleGap = Math.abs(((a.angleDeg - b.angleDeg) % 90) + 90) % 90;
        expect(Math.min(angleGap, 90 - angleGap), `${first}/${second} 角度`).toBeGreaterThan(5);
        const ratio = Math.max(a.periodM, b.periodM) / Math.min(a.periodM, b.periodM);
        expect(Math.abs(ratio - Math.round(ratio)), `${first}/${second} 周期比`).toBeGreaterThan(0.02);
      }
    }
  });

  test('大片圖樣在看得到的範圍內不重複：平移任何 20 ft 的倍數（含舊的 60 ft）都對不回去', () => {
    const pixels = generateAsphaltPixels(DEFAULT_SEED, SMALL);
    const layers = groundLayerTransforms(DEFAULT_SEED);
    // 決定「哪裡深、哪裡有油漬、哪裡濕」的四層：大片深淺 A、B（G 色版），油漬、潮濕（A 色版）。
    const macroLayers = [
      { index: GROUND_LAYER_ORDER.indexOf('macroA'), channel: GROUND_NOISE_CHANNEL.patch },
      { index: GROUND_LAYER_ORDER.indexOf('macroB'), channel: GROUND_NOISE_CHANNEL.patch },
      { index: GROUND_LAYER_ORDER.indexOf('stains'), channel: GROUND_NOISE_CHANNEL.blotch },
      { index: GROUND_LAYER_ORDER.indexOf('wetness'), channel: GROUND_NOISE_CHANNEL.blotch },
    ];
    const wrap = (value: number): number => ((Math.floor(value * SMALL) % SMALL) + SMALL) % SMALL;
    /** 世界座標 (x, z) 的大片圖樣：四層各取最近的像素（0–1）。 */
    const signature = (x: number, z: number): number[] =>
      macroLayers.map(({ index, channel }) => {
        const layer = layers[index];
        if (layer === undefined) {
          throw new Error('層不存在');
        }
        const { u, v } = groundLayerUv(layer, x, z);
        return (pixels[(wrap(v) * SMALL + wrap(u)) * 4 + channel] ?? 0) / 255;
      });
    /** 整片圖樣平移 (shiftX, shiftZ) 之後與原本的平均差異；0 = 完全重複。 */
    const difference = (shiftX: number, shiftZ: number): number => {
      let total = 0;
      let count = 0;
      for (let row = 0; row < 16; row += 1) {
        for (let column = 0; column < 16; column += 1) {
          const x = ftToM(-200 + column * 26.7);
          const z = ftToM(-200 + row * 26.7);
          const here = signature(x, z);
          const there = signature(x + shiftX, z + shiftZ);
          here.forEach((value, index) => {
            total += Math.abs(value - (there[index] ?? 0));
            count += 1;
          });
        }
      }
      return total / count;
    };

    expect(difference(0, 0)).toBe(0);
    const visibleFt = FOG_CONFIG.farM / ftToM(1);
    for (let shiftFt = 20; shiftFt <= visibleFt; shiftFt += 20) {
      for (const [shiftX, shiftZ] of [
        [ftToM(shiftFt), 0],
        [0, ftToM(shiftFt)],
        [ftToM(shiftFt), ftToM(shiftFt)],
      ] as const) {
        expect(difference(shiftX, shiftZ), `平移 ${shiftFt} ft`).toBeGreaterThan(0.08);
      }
    }
  });
});

describe('畫質級別 → 地面著色器開關', () => {
  test.each([
    ['low', []],
    ['medium', ['GROUND_WETNESS']],
    ['high', ['GROUND_NORMALS', 'GROUND_WETNESS']],
    ['ultra', ['GROUND_NORMALS', 'GROUND_WETNESS']],
  ] as const)('%s → %j', (level, defines) => {
    expect(groundShaderDefines(QUALITY_PRESETS[level].ground)).toEqual(defines);
  });

  test('開關不同的級別用不同的著色器程式（快取鍵不同），相同的共用', () => {
    const key = (level: (typeof QUALITY_LEVELS)[number]): string =>
      createGroundMaterial(DEFAULT_SEED, { ...QUALITY_PRESETS[level].ground, textureSizePx: 32 }, 16)
        .customProgramCacheKey();
    expect(new Set([key('low'), key('medium'), key('high')]).size).toBe(3);
    expect(key('ultra')).toBe(key('high'));
  });
});

describe('著色器片段 patchGroundShader', () => {
  function patched(defines: readonly string[]): { vertexShader: string; fragmentShader: string } {
    const source = {
      vertexShader: ShaderLib.standard.vertexShader,
      fragmentShader: ShaderLib.standard.fragmentShader,
    };
    patchGroundShader(source, defines);
    return source;
  }

  test('插得進這一版 three 的 MeshStandardMaterial：世界座標、顏色、粗糙度、法線都接上', () => {
    const { vertexShader, fragmentShader } = patched(['GROUND_NORMALS', 'GROUND_WETNESS']);
    expect(vertexShader).toContain('vGroundXZ = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;');
    expect(fragmentShader).toContain('#define GROUND_NORMALS');
    expect(fragmentShader).toContain('#define GROUND_WETNESS');
    expect(fragmentShader).toContain('diffuseColor.rgb = groundColor;');
    expect(fragmentShader).toContain('roughnessFactor = mix( roughnessFactor');
    expect(fragmentShader).toContain('normal = normalize( ( viewMatrix');
    // 不用 three 的貼圖座標（uv）：那會跟著網格走。
    expect(fragmentShader).not.toContain('#include <map_fragment>');
    // 環境光、陰影、霧的片段都還在。
    for (const chunk of ['lights_fragment_begin', 'shadowmap_pars_fragment', 'fog_fragment']) {
      expect(fragmentShader).toContain(`#include <${chunk}>`);
    }
  });

  test('沒開的開關不會出現在著色器裡', () => {
    const { fragmentShader } = patched([]);
    expect(fragmentShader).not.toContain('#define GROUND_NORMALS');
    expect(fragmentShader).not.toContain('#define GROUND_WETNESS');
  });

  test('找不到插入點就丟錯，不會悄悄變回素色地面', () => {
    expect(() =>
      patchGroundShader({ vertexShader: 'void main() {}', fragmentShader: 'void main() {}' }, []),
    ).toThrow();
  });
});

describe('地面網格 createGround', () => {
  test('躺平、只收陰影，材質不用會跟著網格走的貼圖座標', () => {
    const ground = createGround(DEFAULT_SEED, { ...QUALITY_PRESETS.low.ground, textureSizePx: 32 }, 16);
    expect(ground.rotation.x).toBeCloseTo(-Math.PI / 2, 12);
    expect(ground.receiveShadow).toBe(true);
    expect(ground.castShadow).toBe(false);
    const material = createGroundMaterial(
      DEFAULT_SEED,
      { ...QUALITY_PRESETS.low.ground, textureSizePx: 32 },
      16,
    );
    expect(material.map).toBeNull();
    expect(material.metalness).toBe(0);
  });

  test('噪聲貼圖的邊長與各向異性跟著畫質級別，各向異性不超過顯示卡的上限', () => {
    const uniformsFor = (
      level: (typeof QUALITY_LEVELS)[number],
      maxAnisotropy: number,
    ): Record<string, { value: unknown }> => {
      const material = createGroundMaterial(
        DEFAULT_SEED,
        { ...QUALITY_PRESETS[level].ground, textureSizePx: 64 },
        maxAnisotropy,
      );
      const shader = {
        uniforms: {} as Record<string, { value: unknown }>,
        vertexShader: ShaderLib.standard.vertexShader,
        fragmentShader: ShaderLib.standard.fragmentShader,
      };
      // 測試不開 WebGL：直接呼叫 three 編譯前的掛鉤，只給它會用到的三個欄位。
      material.onBeforeCompile(shader as never, undefined as never);
      return shader.uniforms;
    };

    const high = uniformsFor('high', 16);
    const noise = high.uGroundNoise?.value as DataTexture;
    expect(noise.image.width).toBe(64);
    expect(noise.anisotropy).toBe(QUALITY_PRESETS.high.ground.maxAnisotropy);
    expect((high.uGroundLayers?.value as Vector4[]).length).toBe(GROUND_LAYER_ORDER.length);

    const limited = uniformsFor('ultra', 4).uGroundNoise?.value as DataTexture;
    expect(limited.anisotropy).toBe(4);
    const none = uniformsFor('low', 0).uGroundNoise?.value as DataTexture;
    expect(none.anisotropy).toBe(1);
  });
});
