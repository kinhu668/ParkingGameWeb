// Playwright e2e 設定：無頭 Chromium、固定視窗、自動啟動本機伺服器、軟體算圖的 WebGL。
// 專案刻意不裝 @types/node，所以這裡不用 process、node:path；路徑都相對於 repo 根目錄。
import { defineConfig } from '@playwright/test';

/** 本機伺服器的固定連接埠（vite preview 的預設值）。 */
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  // 軟體算圖很吃 CPU：一次只跑一個測試，幀率才穩定，bench 的數字也不會互相干擾。
  workers: 1,
  fullyParallel: false,
  retries: 0,
  // 無頭軟體算圖大約 20 FPS；停車閉迴路 + 1 秒判定、?bench 真實時間約 10 秒都會超過預設的 30 秒。
  timeout: 120_000,
  expect: { timeout: 15_000 },
  // 只印文字結果，不產生 HTML 報告。
  reporter: 'list',
  // 失敗時的 trace／截圖放這裡（已在 .gitignore）；測試自己存的截圖在 e2e/output/。
  outputDir: 'test-results',

  use: {
    baseURL: BASE_URL,
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 720 },
    // 像素比固定為 1，截圖大小與逐像素比較才不受機器影響。
    deviceScaleFactor: 1,
    launchOptions: {
      // 無頭環境沒有 GPU：用 ANGLE + SwiftShader 軟體算圖建立 WebGL2 context。
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
    trace: 'retain-on-failure',
  },

  webServer: {
    // 測的是正式建置的產物：先建置，再用 vite preview 提供 dist/。
    // --strictPort：連接埠被占用就直接失敗，不會悄悄換到別的埠。
    command: `npx vite build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    // 一律自己啟動、跑完自己關掉；不沿用已經在跑的伺服器，免得測到舊的建置。
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
