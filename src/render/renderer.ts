// 建立 WebGLRenderer（three 0.187 只支援 WebGL2），並讓繪圖緩衝區跟著畫布的顯示大小走。
import {
  ACESFilmicToneMapping,
  PCFShadowMap,
  SRGBColorSpace,
  WebGLRenderer,
  type PerspectiveCamera,
} from 'three';
import { RENDERER_CONFIG } from './renderConfig';

export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = RENDERER_CONFIG.toneMappingExposure;
  renderer.shadowMap.enabled = true;
  // r186 起 PCFSoftShadowMap 已棄用，PCFShadowMap 本身就是柔邊。
  renderer.shadowMap.type = PCFShadowMap;
  return renderer;
}

/**
 * 每幀呼叫：畫布的顯示大小或像素比變了，就重設繪圖緩衝區與鏡頭長寬比。
 * 每幀比對而不是聽 resize 事件，縮放視窗、換螢幕（像素比改變）都涵蓋得到。
 */
export function fitRendererToCanvas(renderer: WebGLRenderer, camera: PerspectiveCamera): void {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || height === 0) {
    return;
  }

  const pixelRatio = Math.min(window.devicePixelRatio, RENDERER_CONFIG.maxPixelRatio);
  if (
    canvas.width !== Math.floor(width * pixelRatio) ||
    canvas.height !== Math.floor(height * pixelRatio)
  ) {
    renderer.setPixelRatio(pixelRatio);
    // 第三個引數 false：不改畫布的 CSS 大小，版面由 index.html 的樣式決定。
    renderer.setSize(width, height, false);
  }

  const aspect = width / height;
  if (camera.aspect !== aspect) {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
}
