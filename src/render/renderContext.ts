// 進入點用：在瀏覽器裡蒐集自動選畫質的線索，並建立四種模式共用的算圖環境（renderer + 畫一幀的管線）。
// 這個檔案會碰 DOM 與 WebGL；純邏輯（解析、選擇、各級別的設定）在 quality.ts。
import type { WebGLRenderer } from 'three';
import { createFramePipeline, type FramePipeline } from './framePipeline';
import type { QualityHints, QualitySettings } from './quality';
import { createRenderer } from './renderer';

/** 四種模式（一般遊戲、?cam、?show、?bench）共用的算圖環境。 */
export interface RenderContext {
  readonly renderer: WebGLRenderer;
  readonly quality: QualitySettings;
  readonly pipeline: FramePipeline;
}

/**
 * 顯示卡名稱。用一張丟棄式的畫布問，因為真正的 renderer 要等畫質決定之後才建立。
 * 拿不到 WebGL、或瀏覽器不肯說，就回傳 undefined。
 */
function detectRendererName(): string | undefined {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (gl === null) {
    return undefined;
  }
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const name: unknown = gl.getParameter(
    debugInfo === null ? gl.RENDERER : debugInfo.UNMASKED_RENDERER_WEBGL,
  );
  // 問完就釋放，不佔一個 WebGL context 的名額。
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return typeof name === 'string' ? name : undefined;
}

/** 蒐集自動選畫質的線索：顯示卡名稱、記憶體、核心數。瀏覽器沒提供的欄位就留空。 */
export function detectQualityHints(): QualityHints {
  // `navigator.deviceMemory` 只有 Chromium 有，TypeScript 的 DOM 型別裡沒有。
  const deviceMemory: unknown = Reflect.get(navigator, 'deviceMemory');
  const cores: unknown = navigator.hardwareConcurrency;
  return {
    rendererName: detectRendererName(),
    deviceMemoryGb: typeof deviceMemory === 'number' ? deviceMemory : undefined,
    hardwareConcurrency: typeof cores === 'number' ? cores : undefined,
  };
}

/** 用決議好的畫質建立 renderer 與畫一幀的管線。 */
export function createRenderContext(
  canvas: HTMLCanvasElement,
  quality: QualitySettings,
): RenderContext {
  const renderer = createRenderer(canvas, quality);
  return { renderer, quality, pipeline: createFramePipeline(renderer, quality) };
}
