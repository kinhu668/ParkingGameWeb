// 天氣：`?weather=` 的解析與覆蓋規則、六種天氣的預設值（dusk 必須等於既有設定）、閃電的時間表與閃光曲線、
// 泛光與路燈跟著天氣的倍率。
import { Color, LineBasicMaterial, Scene } from 'three';
import { describe, expect, test } from 'vitest';
import { DEFAULT_SEED } from '../src/core/gameConfig';
import { parseFxOffParam } from '../src/core/urlParams';
import { WEATHER_IDS, parseWeatherParam, resolveWeather } from '../src/core/weather';
import { createLightning, flashCurve, lightningSchedule } from '../src/effects/lightning';
import { DEFAULT_RAIN_STYLE, LOW_RAIN_STYLE, createRain } from '../src/effects/rain';
import { LEVELS } from '../src/level/levelCatalog';
import { PROTOTYPE_LEVEL } from '../src/level/prototypeLayout';
import { QUALITY_LEVELS } from '../src/render/quality';
import {
  FOG_CONFIG,
  GROUND_CONFIG,
  HEMISPHERE_LIGHT_CONFIG,
  LOT_PROPS_CONFIG,
  POST_CONFIG,
  QUALITY_PRESETS,
  SKY_CONFIG,
  SUN_CONFIG,
} from '../src/render/renderConfig';
import { SUN_DIRECTION, directionToSun, hazeOpacityAt } from '../src/render/sky';
import {
  LIGHTNING_CONFIG,
  RAIN_CONFIG,
  WEATHER_PRESETS,
  scenePostOf,
  setScenePost,
  weatherBloom,
  weatherPreset,
} from '../src/render/weatherPresets';
import { degToRad } from '../src/core/units';

describe('?weather= 的解析', () => {
  test('六種天氣', () => {
    expect(WEATHER_IDS).toEqual(['clear', 'dusk', 'rain', 'wet', 'storm', 'night']);
    for (const weather of WEATHER_IDS) {
      expect(parseWeatherParam(`?weather=${weather}`)).toBe(weather);
    }
  });

  test('不分大小寫、去掉前後空白、可以和其他參數並用', () => {
    expect(parseWeatherParam('?weather=RAIN')).toBe('rain');
    expect(parseWeatherParam('?weather=%20Night%20')).toBe('night');
    expect(parseWeatherParam('?level=w1_l04&cam=spot_low&weather=storm&quality=low')).toBe('storm');
  });

  test('沒給、空值、不認得的值都當作沒給', () => {
    for (const search of ['', '?', '?weather', '?weather=', '?weather=snow', '?weather=1', '?Weather=rain']) {
      expect(parseWeatherParam(search), search).toBeUndefined();
    }
  });
});

describe('resolveWeather：網址蓋過關卡 JSON', () => {
  test('網址有給就用網址的', () => {
    expect(resolveWeather('?weather=night', 'clear')).toBe('night');
    expect(resolveWeather('?weather=dusk', 'storm')).toBe('dusk');
  });

  test('網址沒給或不認得就用關卡的；關卡也沒有就是 clear', () => {
    expect(resolveWeather('', 'wet')).toBe('wet');
    expect(resolveWeather('?weather=nope', 'rain')).toBe('rain');
    expect(resolveWeather('?quality=low')).toBe('clear');
  });

  test('原型關的天氣是 dusk；每一關的天氣都有預設值', () => {
    expect(resolveWeather('', PROTOTYPE_LEVEL.weather)).toBe('dusk');
    for (const level of LEVELS) {
      expect(WEATHER_PRESETS[resolveWeather('', level.weather)], level.id).toBeDefined();
    }
  });
});

describe('?fx=off', () => {
  test('只有 off 算數', () => {
    expect(parseFxOffParam('?fx=off')).toBe(true);
    expect(parseFxOffParam('?level=prototype&fx=off&lang=en')).toBe(true);
    for (const search of ['', '?fx', '?fx=', '?fx=on', '?fx=OFF', '?effects=off']) {
      expect(parseFxOffParam(search), search).toBe(false);
    }
  });
});

describe('天氣預設值', () => {
  test('六種都有', () => {
    expect(Object.keys(WEATHER_PRESETS).sort()).toEqual([...WEATHER_IDS].sort());
  });

  test('dusk 就是既有的設定，一個數字都不改', () => {
    const dusk = weatherPreset('dusk');
    expect(dusk.sun).toBe(SUN_CONFIG);
    expect(dusk.fog).toBe(FOG_CONFIG);
    expect(dusk.hemisphere).toBe(HEMISPHERE_LIGHT_CONFIG);
    expect(dusk.sky).toEqual({ ...SKY_CONFIG, overcast: 0 });
    for (const key of [
      'wetStart',
      'wetEnd',
      'wetDarken',
      'wetRoughness',
      'puddleStart',
      'puddleEnd',
      'puddleRoughness',
    ] as const) {
      expect(dusk.ground[key], key).toBe(GROUND_CONFIG[key]);
    }
    expect(dusk.ground.fallback).toBeNull();
    // 基準的黃昏沒有積水的倒影：地面的著色器與原本一模一樣，也不多畫倒影那一遍。
    expect(dusk.ground.reflection).toBe(0);
    expect(dusk.rain).toBe(0);
    expect(dusk.lightning).toBe(false);
    expect(dusk.lampsOn).toBe(true);
    // 太陽方向與原本的常數完全相同（同一條算式）。
    expect(
      directionToSun(degToRad(dusk.sun.azimuthDeg), degToRad(dusk.sun.elevationDeg)),
    ).toEqual(SUN_DIRECTION);
  });

  test('沒有陰天雲層時，霾的不透明度與原本相同；有雲層時整片天空至少那麼厚', () => {
    for (const elevationDeg of [-10, 0, 1, 4, 8.5, 20, 90]) {
      expect(hazeOpacityAt(elevationDeg, 0)).toBe(hazeOpacityAt(elevationDeg));
      expect(hazeOpacityAt(elevationDeg, 0.8)).toBeGreaterThanOrEqual(0.8);
    }
    expect(hazeOpacityAt(60, 0.8)).toBe(0.8);
  });

  test('每種天氣的數值都合理', () => {
    for (const weather of WEATHER_IDS) {
      const preset = weatherPreset(weather);
      expect(preset.sky.intensity, weather).toBeGreaterThan(0);
      expect(preset.sky.environmentIntensity, weather).toBeGreaterThan(0);
      expect(preset.sky.overcast, weather).toBeGreaterThanOrEqual(0);
      expect(preset.sky.overcast, weather).toBeLessThanOrEqual(1);
      expect(preset.sun.intensity, weather).toBeGreaterThan(0);
      // 主光在地平線以上（陰影相機才有意義）。
      expect(preset.sun.elevationDeg, weather).toBeGreaterThan(5);
      expect(preset.sun.elevationDeg, weather).toBeLessThan(85);
      expect(preset.fog.farM, weather).toBeGreaterThan(preset.fog.nearM);
      expect(preset.ground.wetEnd, weather).toBeGreaterThan(preset.ground.wetStart);
      expect(preset.ground.puddleEnd, weather).toBeGreaterThan(preset.ground.puddleStart);
      expect(preset.rain, weather).toBeGreaterThanOrEqual(0);
      expect(preset.rain, weather).toBeLessThanOrEqual(1);
    }
  });

  test('看得出差別的地方：雨與雷雨才下雨、只有雷雨有閃電、白天（clear、wet）路燈不亮', () => {
    const raining = WEATHER_IDS.filter((weather) => weatherPreset(weather).rain > 0);
    expect(raining).toEqual(['rain', 'storm']);
    expect(WEATHER_IDS.filter((weather) => weatherPreset(weather).lightning)).toEqual(['storm']);
    expect(WEATHER_IDS.filter((weather) => !weatherPreset(weather).lampsOn)).toEqual(['clear', 'wet']);
    expect(weatherPreset('storm').rain).toBeGreaterThan(weatherPreset('rain').rain);
    // 雷雨比雨天暗、霧更近；夜晚的天空最暗。
    expect(weatherPreset('storm').fog.farM).toBeLessThan(weatherPreset('rain').fog.farM);
    expect(weatherPreset('storm').sky.intensity).toBeLessThan(weatherPreset('rain').sky.intensity);
    for (const weather of WEATHER_IDS) {
      expect(weatherPreset('night').sky.intensity, weather).toBeLessThanOrEqual(
        weatherPreset(weather).sky.intensity,
      );
    }
    // 晴天的太陽最高、霧最遠；乾的天氣沒有濕斑（門檻在噪聲值域之外）。
    expect(weatherPreset('clear').sun.elevationDeg).toBeGreaterThan(weatherPreset('wet').sun.elevationDeg);
    expect(weatherPreset('clear').fog.farM).toBeGreaterThan(weatherPreset('dusk').fog.farM);
    expect(weatherPreset('clear').ground.wetStart).toBeGreaterThan(1);
    expect(weatherPreset('night').ground.wetStart).toBeGreaterThan(1);
    // 雨天與雨後的濕斑、積水都比黃昏多（門檻低）；沒有潮濕著色器的級別有替代做法。
    for (const weather of ['rain', 'wet', 'storm'] as const) {
      const ground = weatherPreset(weather).ground;
      expect(ground.wetEnd, weather).toBeLessThan(GROUND_CONFIG.wetStart);
      expect(ground.puddleEnd, weather).toBeLessThan(GROUND_CONFIG.puddleStart);
      expect(ground.fallback?.colorScale, weather).toBeLessThan(1);
      expect(ground.fallback?.roughness, weather).toBeLessThan(GROUND_CONFIG.roughness);
    }
    // 積水的倒影只出現在有積水的天氣；乾的天氣（晴天、黃昏、夜晚）不會無故多出水窪與倒影。
    expect(WEATHER_IDS.filter((weather) => weatherPreset(weather).ground.reflection > 0)).toEqual(
      WEATHER_IDS.filter((weather) => weather === 'rain' || weather === 'wet' || weather === 'storm'),
    );
    for (const weather of WEATHER_IDS) {
      expect(weatherPreset(weather).ground.reflection, weather).toBeGreaterThanOrEqual(0);
      expect(weatherPreset(weather).ground.reflection, weather).toBeLessThanOrEqual(1);
    }
  });

  test('雨絲數：每個級別都有（low 也畫得出雨絲，但數量最少），級別越高越多', () => {
    const counts = QUALITY_LEVELS.map((level) => RAIN_CONFIG.maxStreaks[level]);
    expect(counts[0]).toBeGreaterThan(0);
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    // low 的數量比 medium 少一截：低階裝置不被拖慢（雨絲是一個 draw call 的細線，很便宜）。
    expect(RAIN_CONFIG.maxStreaks.low).toBeLessThanOrEqual(RAIN_CONFIG.maxStreaks.medium * 0.65);
    // 雨天（雨量 0.6）的 low 仍有幾百條：窄巷裡（大半被牆擋住）也看得到。
    expect(Math.round(RAIN_CONFIG.maxStreaks.low * WEATHER_PRESETS.rain.rain)).toBeGreaterThanOrEqual(300);
  });

  test('low 的雨絲比較長、比較亮（數量少，靠每一條更醒目補回來）；仍是半透明的細線', () => {
    expect(LOW_RAIN_STYLE.lengthM).toBeGreaterThan(DEFAULT_RAIN_STYLE.lengthM);
    expect(LOW_RAIN_STYLE.opacity).toBeGreaterThan(DEFAULT_RAIN_STYLE.opacity);
    expect(LOW_RAIN_STYLE.opacity).toBeLessThan(0.8);
    expect(DEFAULT_RAIN_STYLE).toEqual({ lengthM: RAIN_CONFIG.streakLengthM, opacity: RAIN_CONFIG.opacity });
    const sparse = createRain(64, DEFAULT_SEED, LOW_RAIN_STYLE);
    const normal = createRain(64, DEFAULT_SEED);
    sparse.update(0, 0, 0);
    normal.update(0, 0, 0);
    const lengthOf = (rain: typeof sparse): number => {
      const position = rain.lines.geometry.getAttribute('position');
      return Math.hypot(
        position.getX(1) - position.getX(0),
        position.getY(1) - position.getY(0),
        position.getZ(1) - position.getZ(0),
      );
    };
    expect(lengthOf(sparse)).toBeCloseTo(LOW_RAIN_STYLE.lengthM, 5);
    expect(lengthOf(normal)).toBeCloseTo(RAIN_CONFIG.streakLengthM, 5);
    // 雨絲不吃霧：貼地的霧氣不會把它蓋成霧色；一個網格（一個 draw call）。
    const materialOf = (rain: typeof sparse): LineBasicMaterial => {
      const material = rain.lines.material;
      if (!(material instanceof LineBasicMaterial)) {
        throw new Error('雨絲的材質應該是 LineBasicMaterial');
      }
      return material;
    };
    for (const rain of [sparse, normal]) {
      expect(materialOf(rain).fog).toBe(false);
      expect(materialOf(rain).transparent).toBe(true);
    }
    expect(materialOf(sparse).opacity).toBe(LOW_RAIN_STYLE.opacity);
  });
});

describe('閃電', () => {
  const seed = DEFAULT_SEED + 5;

  test('時間表：固定種子可重現；第一道在 2 秒；兩道之間至少隔 3 秒', () => {
    const schedule = lightningSchedule(seed, 120);
    expect(lightningSchedule(seed, 120)).toEqual(schedule);
    expect(schedule[0]).toBe(2);
    expect(schedule.length).toBeGreaterThan(8);
    for (let index = 1; index < schedule.length; index += 1) {
      const gap = (schedule[index] ?? 0) - (schedule[index - 1] ?? 0);
      expect(gap).toBeGreaterThanOrEqual(3);
      expect(gap).toBeLessThanOrEqual(LIGHTNING_CONFIG.maxGapS);
    }
    expect(lightningSchedule(seed + 1, 120)).not.toEqual(schedule);
    expect(lightningSchedule(seed, 1)).toEqual([]);
  });

  test('閃光曲線：開始前與結束後是 0；一開始最亮；第二下比第一下弱；永遠在 0–1 之間', () => {
    expect(flashCurve(-0.01)).toBe(0);
    expect(flashCurve(0)).toBe(1);
    expect(flashCurve(LIGHTNING_CONFIG.durationS)).toBe(0);
    expect(flashCurve(10)).toBe(0);
    const second = flashCurve(LIGHTNING_CONFIG.secondPulseDelayS);
    expect(second).toBeCloseTo(LIGHTNING_CONFIG.secondPulseScale, 9);
    expect(second).toBeGreaterThan(flashCurve(LIGHTNING_CONFIG.secondPulseDelayS - 0.01));
    for (let since = 0; since < 1; since += 0.01) {
      expect(flashCurve(since)).toBeGreaterThanOrEqual(0);
      expect(flashCurve(since)).toBeLessThanOrEqual(1);
    }
  });

  test('createLightning 照同一份時間表閃；時間 0（定格）沒有在閃', () => {
    const lightning = createLightning(seed);
    expect(lightning.flashAt(0)).toBe(0);
    expect(lightning.flashAt(1.99)).toBe(0);
    expect(lightning.flashAt(2)).toBe(1);
    expect(lightning.flashAt(2.5)).toBeGreaterThan(0);
    expect(lightning.flashAt(2.5)).toBeLessThan(0.1);
    const schedule = lightningSchedule(seed, 60);
    const secondStrike = schedule[1] ?? 0;
    expect(lightning.flashAt(secondStrike - 0.05)).toBe(0);
    expect(lightning.flashAt(secondStrike)).toBe(1);
  });
});

describe('泛光與路燈跟著天氣（PostPreset）', () => {
  /** 走後製鏈的級別（有泛光的）。 */
  const BLOOM_LEVELS = QUALITY_LEVELS.filter((level) => QUALITY_PRESETS[level].bloom !== null);
  const LUMA = { r: 0.2126, g: 0.7152, b: 0.0722 };
  /** 白車漆的反照率（線性）；比遊戲裡最淺的車漆還亮一點。 */
  const WHITE_PAINT_ALBEDO = 0.9;

  /** 這種天氣、這個級別的泛光門檻。 */
  const thresholdOf = (weather: (typeof WEATHER_IDS)[number], level: (typeof BLOOM_LEVELS)[number]): number => {
    const bloom = QUALITY_PRESETS[level].bloom;
    if (bloom === null) {
      throw new Error(`${level} 沒有泛光`);
    }
    return weatherBloom(bloom, weatherPreset(weather).post).threshold;
  };

  /**
   * 正對太陽的白車漆的漫反射亮度上限（場景線性亮度）：three 的 Lambert 是「反照率 ÷ π × 照度」，
   * 太陽與半球補光都算正面照到；環境貼圖的漫反射再算進天空亮度的一份。
   */
  const litWhitePaintLuma = (weather: (typeof WEATHER_IDS)[number]): number => {
    const preset = weatherPreset(weather);
    return (
      (WHITE_PAINT_ALBEDO * (preset.sun.intensity + preset.hemisphere.intensity)) / Math.PI +
      WHITE_PAINT_ALBEDO * preset.sky.environmentIntensity
    );
  };

  /** 亮著的燈殼在後製鏈裡的亮度。 */
  const lampShellLuma = (): number => {
    const color = new Color(LOT_PROPS_CONFIG.lampGlowColor);
    return (
      (color.r * LUMA.r + color.g * LUMA.g + color.b * LUMA.b) * LOT_PROPS_CONFIG.lampGlowIntensity.hdr
    );
  };

  test('有泛光的級別是 high 與 ultra', () => {
    expect(BLOOM_LEVELS).toEqual(['high', 'ultra']);
  });

  test('每種天氣：受太陽光的白車漆在泛光門檻之下（不會整台車發光）', () => {
    for (const weather of WEATHER_IDS) {
      for (const level of BLOOM_LEVELS) {
        expect(litWhitePaintLuma(weather), `${weather} ${level}`).toBeLessThan(thresholdOf(weather, level));
      }
    }
  });

  test('路燈亮著的天氣：燈殼在泛光門檻之上、在進泛光的亮度上限之下（燈照常發光）', () => {
    const lampsOn = WEATHER_IDS.filter((weather) => weatherPreset(weather).lampsOn);
    expect(lampsOn).toEqual(['dusk', 'rain', 'storm', 'night']);
    for (const weather of lampsOn) {
      for (const level of BLOOM_LEVELS) {
        expect(lampShellLuma(), `${weather} ${level}`).toBeGreaterThan(thresholdOf(weather, level));
      }
    }
    expect(lampShellLuma()).toBeLessThan(POST_CONFIG.bloomMaxLuma);
  });

  test('有太陽的天氣門檻比較高；雨、雷雨、夜晚照畫質級別原本的數值', () => {
    for (const weather of ['rain', 'storm', 'night'] as const) {
      expect(weatherPreset(weather).post).toEqual({
        bloomThresholdScale: 1,
        bloomStrengthScale: 1,
        lampLightScale: 1,
        flareSurfaceScale: 1,
        sunFlare: 0,
      });
    }
    for (const weather of ['clear', 'wet', 'dusk'] as const) {
      const post = weatherPreset(weather).post;
      // 有太陽：車漆與積水上的反光不當鏡頭光暈的光源。
      expect(post.flareSurfaceScale).toBe(0);
      expect(post.sunFlare).toBeGreaterThan(0);
      expect(post.bloomThresholdScale).toBeGreaterThan(1);
      expect(post.bloomStrengthScale).toBeLessThanOrEqual(1);
      expect(post.bloomStrengthScale).toBeGreaterThan(0.5);
    }
    // 進泛光的亮度上限高過每一個門檻。
    for (const weather of WEATHER_IDS) {
      for (const level of BLOOM_LEVELS) {
        expect(POST_CONFIG.bloomMaxLuma).toBeGreaterThan(thresholdOf(weather, level));
      }
    }
  });

  test('黃昏還有太陽：路燈的真光源只開一部分；其他天氣全亮', () => {
    expect(weatherPreset('dusk').post.lampLightScale).toBeGreaterThan(0);
    expect(weatherPreset('dusk').post.lampLightScale).toBeLessThan(1);
    for (const weather of ['rain', 'storm', 'night'] as const) {
      expect(weatherPreset(weather).post.lampLightScale).toBe(1);
    }
  });

  test('weatherBloom：門檻與強度各乘上倍率，半徑不變', () => {
    const bloom = { strength: 0.2, radius: 0.5, threshold: 1.8 };
    expect(
      weatherBloom(bloom, {
        bloomThresholdScale: 2,
        bloomStrengthScale: 0.5,
        lampLightScale: 1,
        flareSurfaceScale: 0,
        sunFlare: 0,
      }),
    ).toEqual({ strength: 0.1, radius: 0.5, threshold: 3.6 });
  });

  test('場景登記的倍率查得回來；沒登記的場景是 undefined', () => {
    const scene = new Scene();
    expect(scenePostOf(scene)).toBeUndefined();
    setScenePost(scene, weatherPreset('clear').post);
    expect(scenePostOf(scene)).toBe(weatherPreset('clear').post);
  });
});
