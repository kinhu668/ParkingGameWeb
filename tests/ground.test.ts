// 地面：噪聲貼圖的可重現性、各層疊起來沒有短周期、油漬的形狀（不規則、可重現）、畫質級別對著色器開關的矩陣、
// 著色器片段插得進 three 的原始碼。
// 不開 WebGL：只測純函式、字串與材質物件。
import { ShaderLib, type DataTexture, type Vector4 } from 'three';
import { describe, expect, test } from 'vitest';
import { DEFAULT_SEED } from '../src/core/gameConfig';
import { ftToM } from '../src/core/units';
import { createGround, createGroundMaterial } from '../src/props/ground';
import { GROUND_NOISE_CHANNEL, generateAsphaltPixels } from '../src/props/groundNoise';
import {
  GROUND_LAYER_ORDER,
  groundEdgeShadows,
  groundLayerTransforms,
  groundLayerUv,
  groundShaderDefines,
  groundStainAmount,
  groundStainSmear,
  patchGroundShader,
  type GroundNoiseSampler,
} from '../src/props/groundShader';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import { edgeShadowBoxes } from '../src/props/lotEdges';
import { QUALITY_LEVELS } from '../src/render/quality';
import {
  FOG_CONFIG,
  GROUND_CONFIG,
  LOT_PROPS_CONFIG,
  QUALITY_PRESETS,
} from '../src/render/renderConfig';
import { SUN_DIRECTION } from '../src/render/sky';

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

describe('油漬 groundStainAmount', () => {
  /** 取樣用的貼圖邊長：與 low 級別相同。 */
  const SIZE = 512;
  /** 取最近的像素（著色器是線性內插；形狀的統計不受影響）。 */
  function nearestSampler(seed: number): GroundNoiseSampler {
    const pixels = generateAsphaltPixels(seed, SIZE);
    const wrap = (value: number): number => ((Math.floor(value * SIZE) % SIZE) + SIZE) % SIZE;
    return (u, v) => {
      const offset = (wrap(v) * SIZE + wrap(u)) * 4;
      return {
        grain: (pixels[offset + GROUND_NOISE_CHANNEL.grain] ?? 0) / 255,
        patch: (pixels[offset + GROUND_NOISE_CHANNEL.patch] ?? 0) / 255,
        crack: (pixels[offset + GROUND_NOISE_CHANNEL.crack] ?? 0) / 255,
        blotch: (pixels[offset + GROUND_NOISE_CHANNEL.blotch] ?? 0) / 255,
      };
    };
  }

  /** 取樣格子：360 × 360 ft，每格 0.75 ft。 */
  const GRID = 480;
  const CELL_M = ftToM(0.75);
  /** 一片世界座標範圍內「有油漬」（油漬量過半）的格子。 */
  function stainMask(amount: (x: number, z: number) => number): Uint8Array {
    const mask = new Uint8Array(GRID * GRID);
    for (let row = 0; row < GRID; row += 1) {
      for (let column = 0; column < GRID; column += 1) {
        const x = (column - GRID / 2) * CELL_M;
        const z = (row - GRID * 0.75) * CELL_M;
        mask[row * GRID + column] = amount(x, z) > 0.5 ? 1 : 0;
      }
    }
    return mask;
  }

  /**
   * 遮罩的統計：覆蓋率，以及每一塊（至少 30 格的連通區塊）的「周長² ÷ (4π × 面積)」的中位數。
   * 圓是最小的；用格子邊數量周長時，圓大約是 1.6，越不規則（缺口、尾巴、鋸齒）越大。
   */
  function shapeStats(mask: Uint8Array): { coverage: number; blobs: number; raggedness: number } {
    const seen = new Uint8Array(mask.length);
    const ratios: number[] = [];
    let covered = 0;
    for (let start = 0; start < mask.length; start += 1) {
      covered += mask[start] ?? 0;
      if (mask[start] !== 1 || seen[start] === 1) {
        continue;
      }
      const stack = [start];
      seen[start] = 1;
      let area = 0;
      let perimeter = 0;
      for (let cell = stack.pop(); cell !== undefined; cell = stack.pop()) {
        area += 1;
        const row = Math.floor(cell / GRID);
        const column = cell % GRID;
        for (const [stepRow, stepColumn] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nextRow = row + stepRow;
          const nextColumn = column + stepColumn;
          const next = nextRow * GRID + nextColumn;
          const inside = nextRow >= 0 && nextColumn >= 0 && nextRow < GRID && nextColumn < GRID;
          if (!inside || mask[next] !== 1) {
            perimeter += 1;
          } else if (seen[next] !== 1) {
            seen[next] = 1;
            stack.push(next);
          }
        }
      }
      if (area >= 30) {
        ratios.push(perimeter ** 2 / (4 * Math.PI * area));
      }
    }
    ratios.sort((a, b) => a - b);
    return {
      coverage: covered / mask.length,
      blobs: ratios.length,
      raggedness: ratios[Math.floor(ratios.length / 2)] ?? NaN,
    };
  }

  const sample = nearestSampler(DEFAULT_SEED);
  const layers = groundLayerTransforms(DEFAULT_SEED);
  const amount = (x: number, z: number): number => groundStainAmount(sample, layers, x, z);

  test('只看世界座標與種子：同一點每次都一樣，換種子就是另一片油漬', () => {
    const points = Array.from({ length: 400 }, (_, index) => ({
      x: ftToM(-150 + (index % 20) * 15.3),
      z: ftToM(-220 + Math.floor(index / 20) * 14.1),
    }));
    const first = points.map(({ x, z }) => amount(x, z));
    expect(points.map(({ x, z }) => amount(x, z))).toEqual(first);
    expect(first.every((value) => value >= 0 && value <= 1)).toBe(true);

    const otherSample = nearestSampler(DEFAULT_SEED + 1);
    const otherLayers = groundLayerTransforms(DEFAULT_SEED + 1);
    const other = points.map(({ x, z }) => groundStainAmount(otherSample, otherLayers, x, z));
    expect(other).not.toEqual(first);
  });

  test('不是圓團：每一塊的輪廓比「斑塊噪聲直接過門檻」的舊做法不規則得多', () => {
    const stainLayer = layers[GROUND_LAYER_ORDER.indexOf('stains')];
    const macroLayer = layers[GROUND_LAYER_ORDER.indexOf('macroA')];
    if (stainLayer === undefined || macroLayer === undefined) {
      throw new Error('層不存在');
    }
    /** 舊做法：斑塊噪聲加上大片深淺，直接過門檻（一團一團的圓斑）。 */
    const roundBlobs = (x: number, z: number): number => {
      const stainUv = groundLayerUv(stainLayer, x, z);
      const macroUv = groundLayerUv(macroLayer, x, z);
      const field =
        sample(stainUv.u, stainUv.v).blotch + 0.25 * (sample(macroUv.u, macroUv.v).patch - 0.5);
      return field > 0.79 ? 1 : 0;
    };
    const irregular = shapeStats(stainMask(amount));
    const round = shapeStats(stainMask(roundBlobs));
    expect(irregular.blobs).toBeGreaterThan(20);
    expect(round.blobs).toBeGreaterThan(20);
    expect(irregular.raggedness).toBeGreaterThan(3.2);
    expect(irregular.raggedness).toBeGreaterThan(1.2 * round.raggedness);
  });

  test('拉絲有方向：油漬沿拉絲方向比垂直方向延續得更遠', () => {
    const smear = groundStainSmear();
    const length = Math.hypot(smear.x, smear.z);
    expect(length).toBeCloseTo(GROUND_CONFIG.stainSmearM, 9);
    const along = { x: smear.x / length, z: smear.z / length };
    const across = { x: along.z, z: -along.x };
    /** 有油漬的點沿某個方向走 stepM 之後仍有油漬的比例。 */
    const persistence = (direction: { x: number; z: number }, stepM: number): number => {
      let stained = 0;
      let still = 0;
      for (let row = 0; row < 240; row += 1) {
        for (let column = 0; column < 240; column += 1) {
          const x = (column - 120) * ftToM(1.1);
          const z = (row - 180) * ftToM(1.1);
          if (amount(x, z) > 0.5) {
            stained += 1;
            still += amount(x + direction.x * stepM, z + direction.z * stepM) > 0.5 ? 1 : 0;
          }
        }
      }
      expect(stained).toBeGreaterThan(200);
      return still / stained;
    };
    expect(persistence(along, ftToM(2))).toBeGreaterThan(1.15 * persistence(across, ftToM(2)));
  });

  test('有節制：整片場地只有零星幾處，起點到車位的通路與車位裡大部分是乾淨的', () => {
    const lot = shapeStats(stainMask(amount));
    expect(lot.coverage).toBeGreaterThan(0.01);
    expect(lot.coverage).toBeLessThan(0.06);

    const { spot, startState } = PROTOTYPE_LAYOUT;
    let cells = 0;
    let stained = 0;
    const halfWidthM = LOT_PROPS_CONFIG.corridorHalfWidthM;
    for (let x = -halfWidthM; x <= halfWidthM; x += CELL_M) {
      for (let z = spot.z - spot.lengthM / 2; z <= startState.z; z += CELL_M) {
        cells += 1;
        stained += amount(spot.x + x, z) > 0.5 ? 1 : 0;
      }
    }
    expect(stained / cells).toBeLessThan(0.1);
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

  test('要在著色器裡算影子的箱子數寫進開關；0 個就不寫', () => {
    expect(groundShaderDefines(QUALITY_PRESETS.low.ground, 5)).toEqual(['GROUND_EDGE_BOXES 5']);
    expect(groundShaderDefines(QUALITY_PRESETS.high.ground, 5)).toEqual([
      'GROUND_NORMALS',
      'GROUND_WETNESS',
      'GROUND_EDGE_BOXES 5',
    ]);
    expect(groundShaderDefines(QUALITY_PRESETS.low.ground, 0)).toEqual([]);
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
    expect(fragmentShader).not.toMatch(/\bvUv\b|vMapUv/);
    // 環境光、陰影、霧的片段都還在；打光的片段整段展開在著色器裡（太陽的陰影那一行要多乘路緣石的影子）。
    for (const chunk of ['lights_fragment_maps', 'shadowmap_pars_fragment', 'fog_fragment']) {
      expect(fragmentShader).toContain(`#include <${chunk}>`);
    }
    expect(fragmentShader).toContain('getShadow( directionalShadowMap[ i ]');
    expect(fragmentShader).toContain('RE_Direct( directLight, geometryPosition');
  });

  test('油漬用世界座標算：扭曲、拉絲、濺灑三項都在，取樣座標都來自 vGroundXZ', () => {
    const { fragmentShader } = patched([]);
    expect(fragmentShader).toContain('vec2 groundStainUv = groundUv( uGroundLayers[ 5 ], vGroundXZ );');
    // 扭曲：取樣位置被另一次取樣推開。
    expect(fragmentShader).toContain('groundStainWarp * uGroundStainWarp.y');
    // 拉絲：條紋層只拉長一個方向（非等向），斑塊再被它沿拉絲方向拖動。
    expect(fragmentShader).toContain(`uGroundLayers[ ${GROUND_LAYER_ORDER.indexOf('stainStreaks')} ], vGroundXZ`);
    expect(fragmentShader).toContain('groundStreakUv.y / uGroundStainShape.x');
    expect(fragmentShader).toContain('vGroundXZ + uGroundStainSmear * ( groundStainStreak - 0.5 )');
    // 濺灑：減去高頻的缺口。
    expect(fragmentShader).toContain('- ( groundStainSplatter - 0.5 ) * uGroundStainShape.w');
    for (const uniform of ['uGroundStainWarp', 'uGroundStainShape', 'uGroundStainMacro', 'uGroundStainSmear']) {
      expect(fragmentShader).toMatch(new RegExp(`uniform vec\\d ${uniform};`));
    }
  });

  test('路緣石與車擋的影子乘在太陽的陰影上（只擋陽光），地面的陰影座標不沿法線偏移', () => {
    const { vertexShader, fragmentShader } = patched(['GROUND_EDGE_BOXES 5']);
    expect(fragmentShader).toContain('#define GROUND_EDGE_BOXES 5');
    expect(fragmentShader).toContain('groundEdgeLit = groundEdgeLight( vGroundXZ );');
    expect(fragmentShader).not.toContain('#include <lights_fragment_begin>');
    expect(fragmentShader).toContain('vDirectionalShadowCoord[ i ] ) * groundEdgeLit : 1.0;');
    // 路燈、車燈（SpotLight）的那一行沒有被動到。
    expect(fragmentShader).toContain('vSpotLightCoord[ i ] ) : 1.0;');
    expect(vertexShader).toContain(
      'vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * worldPosition;',
    );
    expect(vertexShader.indexOf('directionalShadowMatrix[ i ] * worldPosition;')).toBeGreaterThan(
      vertexShader.indexOf('#include <shadowmap_vertex>'),
    );
  });

  test('沒開的開關不會出現在著色器裡', () => {
    const { fragmentShader } = patched([]);
    expect(fragmentShader).not.toContain('#define GROUND_NORMALS');
    expect(fragmentShader).not.toContain('#define GROUND_WETNESS');
    expect(fragmentShader).not.toContain('#define GROUND_EDGE_BOXES');
  });

  test('找不到插入點就丟錯，不會悄悄變回素色地面', () => {
    expect(() =>
      patchGroundShader({ vertexShader: 'void main() {}', fragmentShader: 'void main() {}' }, []),
    ).toThrow();
  });
});

describe('地面上的路緣石與車擋影子 createGroundMaterial', () => {
  test('給了箱子：每個箱子一組範圍與高度送進著色器，著色器程式與沒有箱子的分開', () => {
    const { spot } = PROTOTYPE_LAYOUT;
    const boxes = edgeShadowBoxes(spot);
    const edges = groundEdgeShadows(spot, spot.headingRad, SUN_DIRECTION, boxes);
    const quality = { ...QUALITY_PRESETS.medium.ground, textureSizePx: 32 };
    const material = createGroundMaterial(DEFAULT_SEED, quality, 4, edges);
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: ShaderLib.standard.vertexShader,
      fragmentShader: ShaderLib.standard.fragmentShader,
    };
    material.onBeforeCompile(shader as never, undefined as never);

    expect((shader.uniforms.uGroundEdgeBoxes?.value as Vector4[]).length).toBe(boxes.length);
    expect((shader.uniforms.uGroundEdgeHeights?.value as number[])).toEqual(
      boxes.map((box) => box.heightM),
    );
    expect(shader.fragmentShader).toContain(`#define GROUND_EDGE_BOXES ${boxes.length}`);
    expect(material.customProgramCacheKey()).not.toBe(
      createGroundMaterial(DEFAULT_SEED, quality, 4).customProgramCacheKey(),
    );

    // 太陽在西北方很低：每公尺高度的影子有好幾公尺長，朝東南（本地 +X、+Z 的反方向是朝太陽）。
    expect(edges.sunRunX).toBeLessThan(0);
    expect(edges.sunRunZ).toBeLessThan(0);
    expect(Math.hypot(edges.sunRunX, edges.sunRunZ)).toBeGreaterThan(3);
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

    // 油漬形狀的參數都送進著色器，數值就是設定裡的那幾個。
    for (const name of ['uGroundStain', 'uGroundStainWarp', 'uGroundStainShape', 'uGroundStainMacro', 'uGroundStainSmear']) {
      expect(high[name], name).toBeDefined();
    }
    expect((high.uGroundStainShape?.value as Vector4).toArray()).toEqual([
      GROUND_CONFIG.stainStreakStretch,
      GROUND_CONFIG.stainStreakWeight,
      GROUND_CONFIG.stainSplatterScale,
      GROUND_CONFIG.stainSplatterWeight,
    ]);
    // 沒給路緣石與車擋就沒有那幾個 uniform。
    expect(high.uGroundEdgeBoxes).toBeUndefined();

    const limited = uniformsFor('ultra', 4).uGroundNoise?.value as DataTexture;
    expect(limited.anisotropy).toBe(4);
    const none = uniformsFor('low', 0).uGroundNoise?.value as DataTexture;
    expect(none.anisotropy).toBe(1);
  });
});
