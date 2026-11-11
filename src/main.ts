// 輪次 1 的最小進入點：只把畫布清成單色，證明建置與 WebGL2 可用。
// 之後的輪次會改由 Three.js 的 renderer 接手同一個畫布。

const CLEAR_COLOR = { r: 0.53, g: 0.62, b: 0.7, a: 1 } as const;

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (canvas === null) {
  throw new Error('找不到 #game-canvas');
}

const gl = canvas.getContext('webgl2');
if (gl === null) {
  throw new Error('這個瀏覽器不支援 WebGL2');
}

gl.clearColor(CLEAR_COLOR.r, CLEAR_COLOR.g, CLEAR_COLOR.b, CLEAR_COLOR.a);
gl.clear(gl.COLOR_BUFFER_BIT);
