// 色調映射（AgX + 每種天氣的色調分級）的著色器文字。不開 WebGL：只檢查產生出來的 GLSL 與 three 內建著色器的銜接。
import { ShaderChunk } from 'three';
import { describe, expect, test } from 'vitest';
import { WEATHER_IDS } from '../src/core/weather';
import { TONE_LOOK_CONFIG } from '../src/render/renderConfig';
import { installToneLook, toneLookShader } from '../src/render/renderer';
import { weatherPreset } from '../src/render/weatherPresets';

describe('色調映射的著色器 toneLookShader', () => {
  const shader = toneLookShader();

  test('是 three 自訂色調映射的函式，先做內建的 AgX', () => {
    expect(shader.startsWith('vec3 CustomToneMapping( vec3 color ) {')).toBe(true);
    expect(shader).toContain('color = AgXToneMapping( color );');
    expect(shader.trimEnd().endsWith('}')).toBe(true);
  });

  test('three 的著色器裡有要被換掉的預設實作，而且 AgX 定義在它前面', () => {
    const chunk = ShaderChunk.tonemapping_pars_fragment;
    const customAt = chunk.indexOf('vec3 CustomToneMapping( vec3 color ) { return color; }');
    const agxAt = chunk.indexOf('vec3 AgXToneMapping( vec3 color )');
    expect(agxAt).toBeGreaterThanOrEqual(0);
    expect(customAt).toBeGreaterThan(agxAt);
  });

  test('數值來自 TONE_LOOK_CONFIG，寫成帶小數點的 GLSL 浮點數', () => {
    expect(shader).toContain(TONE_LOOK_CONFIG.saturation.toFixed(5));
    expect(shader).toContain(TONE_LOOK_CONFIG.contrast.toFixed(5));
    expect(shader).toContain(TONE_LOOK_CONFIG.shadowLift.b.toFixed(5));
    expect(shader).toContain(TONE_LOOK_CONFIG.highlightTint.b.toFixed(5));
    // 沒有不帶小數點的整數字面值混進 vec3(...)（GLSL ES 不會自動轉型）。
    expect(shader).not.toMatch(/vec3\( \d+,/);
  });

  test('暗部偏冷、亮部偏暖', () => {
    const { shadowLift, highlightTint } = TONE_LOOK_CONFIG;
    expect(shadowLift.b).toBeGreaterThan(shadowLift.r);
    expect(highlightTint.r).toBeGreaterThan(highlightTint.b);
  });

  test('每次產生的文字相同', () => {
    expect(toneLookShader()).toBe(shader);
  });
});

/** 2d02a04（改成每種天氣一套之前）的黃昏著色器：基準畫面的顏色一個字都不能變。 */
const DUSK_BASELINE_SHADER = `vec3 CustomToneMapping( vec3 color ) {
	color = AgXToneMapping( color );
	const vec3 lumaWeights = vec3( 0.2126, 0.7152, 0.0722 );
	float luma = dot( color, lumaWeights );
	// 暗部往冷色抬一點，亮部乘上暖色。
	color += vec3( 0.00000, 0.00250, 0.00700 ) * ( 1.0 - luma ) * ( 1.0 - luma );
	color *= mix( vec3( 1.0 ), vec3( 1.00000, 0.95500, 0.88000 ), smoothstep( 0.08, 0.7, luma ) );
	// 飽和度，再以中間灰為支點加一點對比。
	luma = dot( color, lumaWeights );
	color = max( mix( vec3( luma ), color, 1.30000 ), 0.0 );
	color = 0.18000 * pow( color / 0.18000, vec3( 1.10000 ) );
	return clamp( color, 0.0, 1.0 );
}`;

describe('每種天氣的色調分級', () => {
  test('黃昏（基準畫面）的著色器與改之前逐字相同，也是沒指定天氣時的預設', () => {
    expect(weatherPreset('dusk').look).toBe(TONE_LOOK_CONFIG);
    expect(toneLookShader(weatherPreset('dusk').look)).toBe(DUSK_BASELINE_SHADER);
    expect(toneLookShader()).toBe(DUSK_BASELINE_SHADER);
  });

  test('六種天氣的著色器只差數值：結構與黃昏相同', () => {
    const shape = (shader: string): string => shader.replace(/\d+\.\d{5}/g, '#');
    for (const weather of WEATHER_IDS) {
      expect(shape(toneLookShader(weatherPreset(weather).look)), weather).toBe(
        shape(DUSK_BASELINE_SHADER),
      );
    }
  });

  test('夜晚偏冷：暗部的藍比黃昏多，亮部不染暖色', () => {
    const night = weatherPreset('night').look;
    expect(night.shadowLift.b).toBeGreaterThan(TONE_LOOK_CONFIG.shadowLift.b);
    expect(night.shadowLift.b).toBeGreaterThan(night.shadowLift.r);
    expect(night.highlightTint.b).toBeGreaterThanOrEqual(night.highlightTint.r);
  });

  test('雨與雷雨：飽和度比黃昏低、暗部整體抬高、對比比較軟', () => {
    for (const weather of ['rain', 'storm'] as const) {
      const look = weatherPreset(weather).look;
      expect(look.saturation, weather).toBeLessThan(TONE_LOOK_CONFIG.saturation);
      expect(look.shadowLift.r, weather).toBeGreaterThan(TONE_LOOK_CONFIG.shadowLift.r);
      expect(look.shadowLift.g, weather).toBeGreaterThan(TONE_LOOK_CONFIG.shadowLift.g);
      expect(look.contrast, weather).toBeLessThan(TONE_LOOK_CONFIG.contrast);
    }
    expect(weatherPreset('storm').look.saturation).toBeLessThanOrEqual(
      weatherPreset('rain').look.saturation,
    );
  });

  test('數值都在安全範圍：暗部的抬升很小、亮部倍率不超過 1、飽和與對比離 1 不遠', () => {
    for (const weather of WEATHER_IDS) {
      const look = weatherPreset(weather).look;
      for (const channel of ['r', 'g', 'b'] as const) {
        expect(look.shadowLift[channel], weather).toBeGreaterThanOrEqual(0);
        expect(look.shadowLift[channel], weather).toBeLessThan(0.02);
        expect(look.highlightTint[channel], weather).toBeGreaterThan(0.85);
        expect(look.highlightTint[channel], weather).toBeLessThanOrEqual(1);
      }
      expect(look.saturation, weather).toBeGreaterThanOrEqual(1);
      expect(look.saturation, weather).toBeLessThanOrEqual(1.35);
      expect(look.contrast, weather).toBeGreaterThanOrEqual(1);
      expect(look.contrast, weather).toBeLessThanOrEqual(1.2);
      expect(look.contrastPivot, weather).toBe(TONE_LOOK_CONFIG.contrastPivot);
    }
  });

  test('installToneLook：換天氣時把上一次掛的換掉，three 的著色器裡永遠只有一份', () => {
    const count = (text: string): number =>
      ShaderChunk.tonemapping_pars_fragment.split(text).length - 1;
    installToneLook();
    expect(count(DUSK_BASELINE_SHADER)).toBe(1);
    const night = toneLookShader(weatherPreset('night').look);
    installToneLook(weatherPreset('night').look);
    expect(count(night)).toBe(1);
    expect(count(DUSK_BASELINE_SHADER)).toBe(0);
    installToneLook(weatherPreset('night').look);
    expect(count(night)).toBe(1);
    installToneLook();
    expect(count(DUSK_BASELINE_SHADER)).toBe(1);
    expect(count('vec3 CustomToneMapping(')).toBe(1);
  });
});
