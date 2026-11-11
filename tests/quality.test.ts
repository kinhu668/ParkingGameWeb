// 畫質級別的純邏輯：?quality= 解析、自動選擇、決議的優先順序、各級別的開關矩陣。
// 不開 WebGL：裝置線索（顯示卡名稱、記憶體、核心數）一律由測試注入。
import { describe, expect, test } from 'vitest';
import { parseViewParam } from '../src/core/cameraView';
import { detectLocale } from '../src/core/i18n';
import { parseUrlMode } from '../src/core/urlParams';
import {
  QUALITY_LEVELS,
  chooseAutoQuality,
  effectivePixelRatio,
  isSoftwareRenderer,
  parseQualityParam,
  qualitySettings,
  resolveQuality,
  usesHdrChain,
  type QualityHints,
  type QualityLevel,
} from '../src/render/quality';
import { QUALITY_PRESETS } from '../src/render/renderConfig';

/** e2e 的無頭 Chromium 回報的顯示卡名稱（ANGLE + SwiftShader）。 */
const SWIFTSHADER =
  'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)';
/** 一般的獨立顯示卡。 */
const DISCRETE_GPU = 'ANGLE (NVIDIA, NVIDIA GeForce RTX 5070 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)';
/** 規格夠好的裝置：不是軟體算圖，記憶體與核心數都多。 */
const CAPABLE: QualityHints = {
  rendererName: DISCRETE_GPU,
  deviceMemoryGb: 8,
  hardwareConcurrency: 16,
};

describe('畫質級別', () => {
  test('四個級別，由低到高', () => {
    expect(QUALITY_LEVELS).toEqual(['low', 'medium', 'high', 'ultra']);
  });

  test('每個級別都有設定，而且 level 欄位與鍵一致', () => {
    expect(Object.keys(QUALITY_PRESETS).sort()).toEqual([...QUALITY_LEVELS].sort());
    for (const level of QUALITY_LEVELS) {
      expect(qualitySettings(level)).toBe(QUALITY_PRESETS[level]);
      expect(qualitySettings(level).level).toBe(level);
    }
  });
});

describe('parseQualityParam（?quality=）', () => {
  test.each(QUALITY_LEVELS)('?quality=%s → 該級別', (level) => {
    expect(parseQualityParam(`?quality=${level}`)).toBe(level);
  });

  test.each([
    ['?quality=LOW', 'low'],
    ['?quality=Medium', 'medium'],
    ['?quality=HIGH', 'high'],
    ['?quality=uLtRa', 'ultra'],
    ['?quality=%20high%20', 'high'],
  ] as const)('%j：不分大小寫、去掉前後空白 → %s', (search, level) => {
    expect(parseQualityParam(search)).toBe(level);
  });

  test.each(['', '?', '?quality', '?quality=', '?quality=best', '?quality=0', '?quality=high!', '?q=high'])(
    '%j：沒給、空值或不認得 → undefined（不是錯誤）',
    (search) => {
      expect(parseQualityParam(search)).toBeUndefined();
    },
  );

  test('開頭沒有問號、參數順序不同也能解析', () => {
    expect(parseQualityParam('quality=low')).toBe('low');
    expect(parseQualityParam('?lang=en&quality=ultra&view=top')).toBe('ultra');
  });
});

describe('?quality= 與其他參數並用', () => {
  test.each([
    ['?quality=high', 'game'],
    ['?quality=nope', 'game'],
    ['?quality=low&show=car_sedan', 'show'],
    ['?cam=top&t=2&quality=medium', 'cam'],
    ['?bench&quality=ultra', 'bench'],
    ['?quality=high&bench&cam=spot_low&show=parking_spot', 'show'],
  ] as const)('%j → 啟動模式仍是 %s', (search, kind) => {
    expect(parseUrlMode(search).kind).toBe(kind);
  });

  test('多了 ?quality= 不改變模式的其他欄位', () => {
    expect(parseUrlMode('?cam=top&t=2&quality=high')).toEqual(parseUrlMode('?cam=top&t=2'));
    expect(parseUrlMode('?show=car_sedan&quality=low')).toEqual(parseUrlMode('?show=car_sedan'));
    expect(parseUrlMode('?quality=ultra')).toEqual(parseUrlMode(''));
  });

  test('與 ?lang=、?view=、?cam= 一起給，各自解析各自的', () => {
    const search = '?lang=en&view=cockpit&quality=low';
    expect(parseQualityParam(search)).toBe('low');
    expect(detectLocale(search, 'zh-TW')).toBe('en');
    expect(parseViewParam(search)).toBe('cockpit');
    expect(parseUrlMode(search)).toEqual({ kind: 'game' });

    const shot = '?cam=spot_low&t=3&lang=zh-TW&quality=HIGH';
    expect(parseQualityParam(shot)).toBe('high');
    expect(detectLocale(shot, 'en')).toBe('zh-TW');
    expect(parseUrlMode(shot)).toEqual({ kind: 'cam', preset: 'spot_low', timeSeconds: 3 });
  });
});

describe('isSoftwareRenderer', () => {
  test.each([
    SWIFTSHADER,
    'Google SwiftShader',
    'llvmpipe (LLVM 15.0.7, 256 bits)',
    'Mesa/X.org, softpipe',
    'Microsoft Basic Render Driver',
    'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'Apple Software Renderer',
    'SWIFTSHADER',
  ])('%j 是軟體算圖', (name) => {
    expect(isSoftwareRenderer(name)).toBe(true);
  });

  test.each([
    DISCRETE_GPU,
    'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'Apple M3',
    'Mali-G78',
    '',
  ])('%j 不是軟體算圖', (name) => {
    expect(isSoftwareRenderer(name)).toBe(false);
  });

  test('拿不到名稱不當成軟體算圖', () => {
    expect(isSoftwareRenderer(undefined)).toBe(false);
  });
});

describe('chooseAutoQuality', () => {
  test('軟體算圖 → medium，即使記憶體與核心數很多', () => {
    expect(chooseAutoQuality({ ...CAPABLE, rendererName: SWIFTSHADER })).toBe('medium');
    expect(chooseAutoQuality({ rendererName: 'llvmpipe (LLVM 15.0.7, 256 bits)' })).toBe('medium');
  });

  test('一般裝置 → high', () => {
    expect(chooseAutoQuality(CAPABLE)).toBe('high');
  });

  test.each([4, 2, 0.5])('記憶體 %d GB（≤ 4）→ medium', (deviceMemoryGb) => {
    expect(chooseAutoQuality({ ...CAPABLE, deviceMemoryGb })).toBe('medium');
  });

  test.each([4, 2, 1])('%d 個核心（≤ 4）→ medium', (hardwareConcurrency) => {
    expect(chooseAutoQuality({ ...CAPABLE, hardwareConcurrency })).toBe('medium');
  });

  test('剛好超過門檻 → high', () => {
    expect(chooseAutoQuality({ ...CAPABLE, deviceMemoryGb: 8, hardwareConcurrency: 6 })).toBe('high');
  });

  test('瀏覽器沒提供的欄位不扣分：什麼線索都沒有 → high', () => {
    expect(chooseAutoQuality({})).toBe('high');
    expect(chooseAutoQuality({ rendererName: DISCRETE_GPU })).toBe('high');
    expect(
      chooseAutoQuality({ rendererName: undefined, deviceMemoryGb: undefined, hardwareConcurrency: 12 }),
    ).toBe('high');
  });

  test('不管線索多好，都不會自動選 ultra', () => {
    const hintSets: readonly QualityHints[] = [
      {},
      CAPABLE,
      { rendererName: DISCRETE_GPU, deviceMemoryGb: 64, hardwareConcurrency: 128 },
      { rendererName: SWIFTSHADER },
      { deviceMemoryGb: 1, hardwareConcurrency: 1 },
    ];
    for (const hints of hintSets) {
      expect(chooseAutoQuality(hints)).not.toBe('ultra');
    }
  });
});

describe('resolveQuality：有效的 ?quality= > 自動選擇', () => {
  test('有效的 ?quality= 蓋過自動選擇（軟體算圖也照給）', () => {
    for (const level of QUALITY_LEVELS) {
      const resolved = resolveQuality(`?quality=${level}`, { rendererName: SWIFTSHADER });
      expect(resolved.source).toBe('url');
      expect(resolved.settings).toBe(QUALITY_PRESETS[level]);
    }
  });

  test('ultra 只能由網址開啟', () => {
    expect(resolveQuality('?quality=ultra', CAPABLE).settings.level).toBe('ultra');
    expect(resolveQuality('', CAPABLE).settings.level).toBe('high');
  });

  test.each(['', '?quality=', '?quality=nope', '?lang=en'])(
    '%j：沒給或不認得 → 自動選擇',
    (search) => {
      expect(resolveQuality(search, CAPABLE)).toEqual({
        settings: QUALITY_PRESETS.high,
        source: 'auto',
      });
      expect(resolveQuality(search, { rendererName: SWIFTSHADER })).toEqual({
        settings: QUALITY_PRESETS.medium,
        source: 'auto',
      });
    },
  );
});

describe('各級別的開關矩陣', () => {
  const low = QUALITY_PRESETS.low;
  const medium = QUALITY_PRESETS.medium;
  const high = QUALITY_PRESETS.high;
  const ultra = QUALITY_PRESETS.ultra;

  test('low：最貴的效果全關，直接畫到畫面上', () => {
    expect(low.ambientOcclusion).toBeNull();
    expect(low.bloom).toBeNull();
    expect(low.lens).toBeNull();
    expect(low.smaa).toBe(false);
    expect(usesHdrChain(low)).toBe(false);
    expect(low.maxPixelRatio).toBe(1);
    expect(low.shadowMapSize).toBeLessThanOrEqual(1024);
  });

  test('medium：只多了輕微的暈影，沒有環境光遮蔽、泛光、色差，仍然直接畫到畫面上', () => {
    expect(medium.ambientOcclusion).toBeNull();
    expect(medium.bloom).toBeNull();
    expect(medium.smaa).toBe(false);
    expect(usesHdrChain(medium)).toBe(false);
    expect(medium.lens).not.toBeNull();
    expect(medium.lens?.vignette).toBeGreaterThan(0);
    expect(medium.lens?.chromaticAberration).toBe(0);
  });

  test('high：環境光遮蔽、泛光、暈影、色差都開，走後製鏈；不開 SMAA', () => {
    expect(high.ambientOcclusion).not.toBeNull();
    expect(high.bloom).not.toBeNull();
    expect(high.lens?.vignette).toBeGreaterThan(0);
    expect(high.lens?.chromaticAberration).toBeGreaterThan(0);
    expect(high.smaa).toBe(false);
    expect(usesHdrChain(high)).toBe(true);
    expect(high.toneMapping).toBe('agx');
  });

  test('ultra：全開，而且每一項都不比 high 弱', () => {
    expect(ultra.smaa).toBe(true);
    expect(usesHdrChain(ultra)).toBe(true);
    expect(ultra.toneMapping).toBe('agx');
    expect(ultra.lens?.vignette).toBeGreaterThan(0);
    expect(ultra.lens?.chromaticAberration).toBeGreaterThan(0);

    const highAo = high.ambientOcclusion;
    const ultraAo = ultra.ambientOcclusion;
    const highBloom = high.bloom;
    const ultraBloom = ultra.bloom;
    if (highAo === null || ultraAo === null || highBloom === null || ultraBloom === null) {
      throw new Error('high 與 ultra 都要有環境光遮蔽與泛光');
    }
    expect(ultraAo.samples).toBeGreaterThan(highAo.samples);
    expect(ultraAo.denoiseSamples).toBeGreaterThanOrEqual(highAo.denoiseSamples);
    expect(ultraAo.intensity).toBeGreaterThanOrEqual(highAo.intensity);
    expect(ultraBloom.strength).toBeGreaterThan(highBloom.strength);
  });

  test('泛光的門檻都高於 1：只有太陽、車燈這些高亮度的東西會發光，柏油不會', () => {
    for (const level of ['high', 'ultra'] as const) {
      expect(QUALITY_PRESETS[level].bloom?.threshold).toBeGreaterThan(1);
      // 「稍強但不過曝」：強度有上限。
      expect(QUALITY_PRESETS[level].bloom?.strength).toBeLessThan(0.5);
    }
  });

  test('由低到高，陰影貼圖、像素比上限、天空貼圖都只增不減，而且頭尾真的有差', () => {
    const fields = ['shadowMapSize', 'maxPixelRatio', 'skyCubeSizePx'] as const;
    for (const field of fields) {
      const values = QUALITY_LEVELS.map((level) => QUALITY_PRESETS[level][field]);
      expect(values, field).toEqual([...values].sort((a, b) => a - b));
      expect(ultra[field], field).toBeGreaterThan(low[field]);
    }
    expect(medium.shadowMapSize).toBeGreaterThan(low.shadowMapSize);
    expect(high.shadowMapSize).toBeGreaterThan(medium.shadowMapSize);
    expect(ultra.shadowMapSize).toBe(4096);
    expect(medium.maxPixelRatio).toBeGreaterThan(low.maxPixelRatio);
    expect(high.maxPixelRatio).toBeGreaterThan(medium.maxPixelRatio);
  });

  test('陰影貼圖與天空貼圖的邊長都是 2 的次方', () => {
    for (const level of QUALITY_LEVELS) {
      for (const size of [QUALITY_PRESETS[level].shadowMapSize, QUALITY_PRESETS[level].skyCubeSizePx]) {
        expect(Number.isInteger(Math.log2(size)), `${level}: ${size}`).toBe(true);
      }
    }
  });

  test('任兩個級別的設定都不完全相同', () => {
    const serialized = QUALITY_LEVELS.map((level: QualityLevel) => {
      const { level: _level, ...rest } = QUALITY_PRESETS[level];
      return JSON.stringify(rest);
    });
    expect(new Set(serialized).size).toBe(QUALITY_LEVELS.length);
  });
});

describe('effectivePixelRatio：像素比上限由畫質級別控制', () => {
  test('裝置像素比低於上限就用裝置的', () => {
    expect(effectivePixelRatio(QUALITY_PRESETS.high, 1)).toBe(1);
    expect(effectivePixelRatio(QUALITY_PRESETS.medium, 1.25)).toBe(1.25);
  });

  test('超過上限就夾在上限', () => {
    expect(effectivePixelRatio(QUALITY_PRESETS.low, 2)).toBe(1);
    expect(effectivePixelRatio(QUALITY_PRESETS.low, 3)).toBe(1);
    expect(effectivePixelRatio(QUALITY_PRESETS.medium, 3)).toBe(1.5);
    expect(effectivePixelRatio(QUALITY_PRESETS.high, 3)).toBe(2);
    expect(effectivePixelRatio(QUALITY_PRESETS.ultra, 3)).toBe(2);
  });
});
