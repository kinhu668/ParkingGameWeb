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
  skipsGroundReflection,
  skipsLensEffects,
  usesHdrChain,
  withoutGroundReflection,
  withoutLensEffects,
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

  test('手機與平板（主要指標是手指）→ medium，即使記憶體與核心數很多', () => {
    expect(chooseAutoQuality({ ...CAPABLE, coarsePointer: true })).toBe('medium');
    expect(chooseAutoQuality({ coarsePointer: true })).toBe('medium');
    expect(chooseAutoQuality({ ...CAPABLE, coarsePointer: false })).toBe('high');
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
  test('有效的 ?quality= 蓋過自動選擇（軟體算圖也給那個級別，只少了景深、動態模糊、鏡頭光暈）', () => {
    for (const level of QUALITY_LEVELS) {
      const resolved = resolveQuality(`?quality=${level}`, { rendererName: SWIFTSHADER });
      expect(resolved.source).toBe('url');
      expect(resolved.settings).toEqual(withoutLensEffects(QUALITY_PRESETS[level]));
      expect(resolveQuality(`?quality=${level}`, CAPABLE)).toEqual({
        settings: QUALITY_PRESETS[level],
        source: 'url',
      });
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
      // 軟體算圖：medium，但不多畫倒影那一遍（其餘照表）。
      expect(resolveQuality(search, { rendererName: SWIFTSHADER })).toEqual({
        settings: withoutGroundReflection(QUALITY_PRESETS.medium),
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

describe('地面（柏油）的畫質矩陣', () => {
  test('low：沒有法線、沒有潮濕反光；medium：加上潮濕反光；high、ultra：兩者都開', () => {
    expect(QUALITY_PRESETS.low.ground).toMatchObject({ normals: false, wetness: false });
    expect(QUALITY_PRESETS.medium.ground).toMatchObject({ normals: false, wetness: true });
    expect(QUALITY_PRESETS.high.ground).toMatchObject({ normals: true, wetness: true });
    expect(QUALITY_PRESETS.ultra.ground).toMatchObject({ normals: true, wetness: true });
  });

  test('軟體算圖自動選到的級別不做法線（每個像素要多取樣幾次噪聲）', () => {
    const auto = resolveQuality('', { rendererName: SWIFTSHADER });
    expect(auto.settings.ground.normals).toBe(false);
  });

  test('噪聲貼圖邊長是 2 的次方；邊長與各向異性由低到高不遞減', () => {
    const grounds = QUALITY_LEVELS.map((level) => QUALITY_PRESETS[level].ground);
    for (const ground of grounds) {
      expect(Number.isInteger(Math.log2(ground.textureSizePx))).toBe(true);
      expect(ground.maxAnisotropy).toBeGreaterThanOrEqual(1);
    }
    for (let index = 1; index < grounds.length; index += 1) {
      const lower = grounds[index - 1];
      const higher = grounds[index];
      if (lower === undefined || higher === undefined) {
        throw new Error('級別不存在');
      }
      expect(higher.textureSizePx).toBeGreaterThanOrEqual(lower.textureSizePx);
      expect(higher.maxAnisotropy).toBeGreaterThanOrEqual(lower.maxAnisotropy);
    }
  });
});

describe('濕地／積水的倒影（ground.reflection）的畫質矩陣', () => {
  test('low 不多畫倒影那一遍；medium 畫得小、隔幀重畫、不拉長；high 每幀；ultra 更大、取樣更多', () => {
    expect(QUALITY_PRESETS.low.ground.reflection).toBeNull();
    const medium = QUALITY_PRESETS.medium.ground.reflection;
    const high = QUALITY_PRESETS.high.ground.reflection;
    const ultra = QUALITY_PRESETS.ultra.ground.reflection;
    if (medium === null || high === null || ultra === null) {
      throw new Error('medium 以上應該有倒影的設定');
    }
    expect(medium.updateEveryFrames).toBeGreaterThan(1);
    expect(medium.streakTaps).toBe(1);
    expect(high.updateEveryFrames).toBe(1);
    expect(ultra.updateEveryFrames).toBe(1);
    expect(medium.resolutionScale).toBeLessThan(high.resolutionScale);
    expect(high.resolutionScale).toBeLessThan(ultra.resolutionScale);
    expect(high.streakTaps).toBeLessThan(ultra.streakTaps);
    // 沒有一個級別是全解析度的倒影：那等於整個場景畫兩遍。
    for (const settings of [medium, high, ultra]) {
      expect(settings.resolutionScale).toBeGreaterThan(0);
      expect(settings.resolutionScale).toBeLessThan(1);
    }
    // 倒影要靠潮濕著色器取樣：沒有潮濕著色器的級別不能開。
    for (const level of QUALITY_LEVELS) {
      const ground = QUALITY_PRESETS[level].ground;
      expect(ground.reflection === null || ground.wetness, level).toBe(true);
    }
  });

  test('手機與平板（主要指標是手指）自動選 medium，而且不多畫倒影那一遍，其餘設定不變', () => {
    const phone = resolveQuality('', { ...CAPABLE, coarsePointer: true });
    expect(phone.source).toBe('auto');
    expect(phone.settings.level).toBe('medium');
    expect(phone.settings.ground.reflection).toBeNull();
    expect(phone.settings).toEqual(withoutGroundReflection(QUALITY_PRESETS.medium));
    expect({ ...phone.settings, ground: QUALITY_PRESETS.medium.ground }).toEqual(
      QUALITY_PRESETS.medium,
    );
    // 低階的手機也一樣。
    const lowEnd = resolveQuality('', { ...CAPABLE, deviceMemoryGb: 4, coarsePointer: true });
    expect(lowEnd.settings.level).toBe('medium');
    expect(lowEnd.settings.ground.reflection).toBeNull();
    expect(lowEnd.settings.ground.wetness).toBe(true);
  });

  test('CPU 軟體算圖自動選到的級別（medium）也不多畫倒影那一遍', () => {
    const software = resolveQuality('', { rendererName: SWIFTSHADER });
    expect(software.settings.level).toBe('medium');
    expect(software.settings.ground.reflection).toBeNull();
    expect(software.settings).toEqual(withoutGroundReflection(QUALITY_PRESETS.medium));
    expect(skipsGroundReflection({ rendererName: SWIFTSHADER })).toBe(true);
    expect(skipsGroundReflection({ coarsePointer: true })).toBe(true);
    expect(skipsGroundReflection(CAPABLE)).toBe(false);
    expect(skipsGroundReflection({})).toBe(false);
    // 記憶體或核心數少、但有真的顯示卡的桌機（medium）照表畫小張的倒影。
    const lowEndDesktop = resolveQuality('', { ...CAPABLE, hardwareConcurrency: 4 });
    expect(lowEndDesktop.settings).toBe(QUALITY_PRESETS.medium);
  });

  test('桌面（或沒有這個線索）自動選到的級別照表給；?quality= 明確指定的在手機與軟體算圖上倒影也照表給', () => {
    expect(resolveQuality('', CAPABLE).settings).toBe(QUALITY_PRESETS.high);
    expect(resolveQuality('', { ...CAPABLE, coarsePointer: false }).settings).toBe(QUALITY_PRESETS.high);
    for (const level of QUALITY_LEVELS) {
      for (const hints of [{ ...CAPABLE, coarsePointer: true }, { rendererName: SWIFTSHADER }]) {
        const settings = resolveQuality(`?quality=${level}`, hints).settings;
        expect(settings.level, level).toBe(level);
        expect(settings.ground, level).toBe(QUALITY_PRESETS[level].ground);
      }
    }
  });

  test('withoutGroundReflection：本來就沒有的級別原樣傳回，不複製', () => {
    expect(withoutGroundReflection(QUALITY_PRESETS.low)).toBe(QUALITY_PRESETS.low);
    expect(withoutGroundReflection(QUALITY_PRESETS.ultra)).not.toBe(QUALITY_PRESETS.ultra);
    expect(QUALITY_PRESETS.ultra.ground.reflection).not.toBeNull();
  });
});

describe('景深、動態模糊、鏡頭光暈的畫質矩陣', () => {
  const LENS_EFFECTS = ['depthOfField', 'motionBlur', 'lensFlare'] as const;
  const PHONE: QualityHints = { ...CAPABLE, coarsePointer: true };
  const SOFTWARE: QualityHints = { rendererName: SWIFTSHADER };

  test('low、medium 三項都關，而且仍然直接畫到畫面上；high、ultra 三項都開', () => {
    for (const level of ['low', 'medium'] as const) {
      for (const effect of LENS_EFFECTS) {
        expect(QUALITY_PRESETS[level][effect], `${level} ${effect}`).toBeNull();
      }
      expect(usesHdrChain(QUALITY_PRESETS[level]), level).toBe(false);
    }
    for (const level of ['high', 'ultra'] as const) {
      for (const effect of LENS_EFFECTS) {
        expect(QUALITY_PRESETS[level][effect], `${level} ${effect}`).not.toBeNull();
      }
    }
  });

  test('這三項不決定走不走後製鏈：只開它們的級別仍然直接畫到畫面上', () => {
    const { depthOfField, motionBlur, lensFlare } = QUALITY_PRESETS.ultra;
    expect(usesHdrChain({ ...QUALITY_PRESETS.medium, depthOfField, motionBlur, lensFlare })).toBe(false);
  });

  test('開了這三項的級別都有它們需要的東西：深度來自環境光遮蔽，光源來自泛光', () => {
    for (const level of QUALITY_LEVELS) {
      const settings = QUALITY_PRESETS[level];
      if (settings.depthOfField !== null || settings.motionBlur !== null) {
        expect(settings.ambientOcclusion, level).not.toBeNull();
      }
      if (settings.lensFlare !== null) {
        expect(settings.bloom, level).not.toBeNull();
      }
    }
  });

  test('ultra 每一項都不比 high 弱；數值都很輕', () => {
    const high = QUALITY_PRESETS.high;
    const ultra = QUALITY_PRESETS.ultra;
    if (
      high.depthOfField === null || ultra.depthOfField === null ||
      high.motionBlur === null || ultra.motionBlur === null ||
      high.lensFlare === null || ultra.lensFlare === null
    ) {
      throw new Error('high 與 ultra 都要有景深、動態模糊、鏡頭光暈');
    }
    expect(ultra.depthOfField.maxBlur).toBeGreaterThanOrEqual(high.depthOfField.maxBlur);
    expect(ultra.depthOfField.taps).toBeGreaterThanOrEqual(high.depthOfField.taps);
    expect(ultra.motionBlur.shutter).toBeGreaterThanOrEqual(high.motionBlur.shutter);
    expect(ultra.motionBlur.maxBlur).toBeGreaterThanOrEqual(high.motionBlur.maxBlur);
    expect(ultra.lensFlare.streak).toBeGreaterThanOrEqual(high.lensFlare.streak);
    expect(ultra.lensFlare.ghosts).toBeGreaterThanOrEqual(high.lensFlare.ghosts);
    for (const settings of [high, ultra]) {
      // 模糊那一張是縮小的；模糊半徑與拖影長度都只有畫面高度的百分之一、二。
      expect(settings.depthOfField?.resolutionScale).toBeLessThanOrEqual(0.5);
      expect(settings.depthOfField?.maxBlur).toBeLessThanOrEqual(0.01);
      expect(settings.motionBlur?.maxBlur).toBeLessThanOrEqual(0.02);
      expect(settings.motionBlur?.shutter).toBeLessThanOrEqual(0.5);
      expect(settings.lensFlare?.streak).toBeLessThanOrEqual(0.1);
      expect(settings.lensFlare?.ghosts).toBeLessThanOrEqual(0.1);
    }
  });

  test('桌面的顯示卡：自動選到的 high 與 ?quality= 指定的級別三項照表給', () => {
    expect(skipsLensEffects(CAPABLE)).toBe(false);
    expect(skipsLensEffects({})).toBe(false);
    expect(resolveQuality('', CAPABLE).settings).toBe(QUALITY_PRESETS.high);
    expect(resolveQuality('?quality=ultra', CAPABLE).settings).toBe(QUALITY_PRESETS.ultra);
  });

  test('手機、平板與軟體算圖：三項一律關，就算 ?quality=high／ultra 明確指定也一樣；其餘照那個級別', () => {
    expect(skipsLensEffects(PHONE)).toBe(true);
    expect(skipsLensEffects(SOFTWARE)).toBe(true);
    for (const hints of [PHONE, SOFTWARE]) {
      for (const level of ['high', 'ultra'] as const) {
        const settings = resolveQuality(`?quality=${level}`, hints).settings;
        for (const effect of LENS_EFFECTS) {
          expect(settings[effect], `${level} ${effect}`).toBeNull();
        }
        expect(settings).toEqual(withoutLensEffects(QUALITY_PRESETS[level]));
        expect(settings.bloom).toBe(QUALITY_PRESETS[level].bloom);
        expect(settings.ambientOcclusion).toBe(QUALITY_PRESETS[level].ambientOcclusion);
        expect(usesHdrChain(settings)).toBe(true);
      }
    }
  });

  test('?fx=off：桌面也三項全關；?fx=on：手機與軟體算圖也照級別給', () => {
    for (const search of ['?fx=off', '?quality=high&fx=off', '?fx=off&quality=ultra']) {
      const settings = resolveQuality(search, CAPABLE).settings;
      for (const effect of LENS_EFFECTS) {
        expect(settings[effect], `${search} ${effect}`).toBeNull();
      }
    }
    for (const hints of [PHONE, SOFTWARE]) {
      expect(resolveQuality('?quality=high&fx=on', hints).settings).toBe(QUALITY_PRESETS.high);
      expect(resolveQuality('?quality=ultra&fx=on', hints).settings).toBe(QUALITY_PRESETS.ultra);
      // ?fx=on 不改變自動選到的級別：手機與軟體算圖仍然是 medium（本來就沒有這三項）。
      expect(resolveQuality('?fx=on', hints).settings.level).toBe('medium');
    }
    // 不認得的值當作沒給。
    expect(resolveQuality('?fx=maybe', CAPABLE).settings).toBe(QUALITY_PRESETS.high);
    expect(resolveQuality('?quality=high&fx=maybe', SOFTWARE).settings.depthOfField).toBeNull();
  });

  test('withoutLensEffects：本來就都沒有的級別原樣傳回，不複製', () => {
    expect(withoutLensEffects(QUALITY_PRESETS.low)).toBe(QUALITY_PRESETS.low);
    expect(withoutLensEffects(QUALITY_PRESETS.medium)).toBe(QUALITY_PRESETS.medium);
    expect(withoutLensEffects(QUALITY_PRESETS.high)).not.toBe(QUALITY_PRESETS.high);
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
