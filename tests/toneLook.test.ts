// 色調映射（AgX + 黃昏的色調分級）的著色器文字。不開 WebGL：只檢查產生出來的 GLSL 與 three 內建著色器的銜接。
import { ShaderChunk } from 'three';
import { describe, expect, test } from 'vitest';
import { TONE_LOOK_CONFIG } from '../src/render/renderConfig';
import { toneLookShader } from '../src/render/renderer';

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
