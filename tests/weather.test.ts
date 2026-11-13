// 天氣：`?weather=` 的解析與覆蓋規則、六種天氣的預設值（dusk 必須等於既有設定）、閃電的時間表與閃光曲線。
import { LineBasicMaterial } from 'three';
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
  SKY_CONFIG,
  SUN_CONFIG,
} from '../src/render/renderConfig';
import { SUN_DIRECTION, directionToSun, hazeOpacityAt } from '../src/render/sky';
import {
  LIGHTNING_CONFIG,
  RAIN_CONFIG,
  WEATHER_PRESETS,
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
