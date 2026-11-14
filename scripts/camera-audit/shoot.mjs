// 開場鏡頭體檢的拍圖腳本：每一關 × 每個遊戲鏡頭，在開場（車在起點、還沒動）拍一張。
// 幾何上的判定（車在不在畫面裡、有沒有被場景擋住）由 tests/openingCamera.test.ts 自動檢查；這裡是給人看的圖。
//
// 用法（先 `npm run build`，再 `npx vite preview --port 4173 --strictPort` 把 dist/ 架起來）：
//   node scripts/camera-audit/shoot.mjs                      # 全部拍到 e2e/output/camera-audit/
//   BASE=http://127.0.0.1:4173 OUT=<目錄> node scripts/camera-audit/shoot.mjs w1_l10-chase_far
//   VIEWPORT=412x892 node scripts/camera-audit/shoot.mjs     # 直式手機
//   CHROME=/usr/bin/google-chrome …                          # 不用 Playwright 自己下載的 Chromium
// 拍完用 sheet.py 拼成一張聯絡圖。
//
// 固定的網址參數：quality=medium、weather=clear（每一關同樣的光，幾何看得最清楚）、touch=off（螢幕操作層不擋車）、lang=en。
// 不加 fx=off：遮擋半透明是玩家實際看到的畫面的一部分。`x-` 開頭的是關卡自己的天氣（w1_l10 的雨）。
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173';
const OUT = process.env.OUT ?? 'e2e/output/camera-audit';
const [viewportWidth, viewportHeight] = (process.env.VIEWPORT ?? '1280x720').split('x').map(Number);
fs.mkdirSync(OUT, { recursive: true });

const LEVELS = ['prototype', ...Array.from({ length: 10 }, (_, index) => `w1_l${String(index + 1).padStart(2, '0')}`)];
const VIEWS = ['chase_near', 'chase_far', 'hood', 'cockpit', 'top'];

const SHOTS = [];
for (const level of LEVELS) {
  for (const view of VIEWS) {
    SHOTS.push([`${level}-${view}`, `?level=${level}&view=${view}&touch=off&quality=medium&weather=clear&lang=en`]);
  }
}
for (const view of VIEWS) {
  SHOTS.push([`x-w1_l10-${view}-rain`, `?level=w1_l10&view=${view}&touch=off&quality=medium&lang=en`]);
}

const wanted = process.argv.slice(2);
const shots = wanted.length > 0 ? SHOTS.filter(([name]) => wanted.includes(name)) : SHOTS;

const browser = await chromium.launch({
  ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}),
  // 無頭環境沒有 GPU：用 ANGLE + SwiftShader 軟體算圖（與 playwright.config.ts 相同）。
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
/** 每一張的鏡頭快照（位置、視角、車在畫面上的位置）：window.__parkingGame.camera()。 */
const snapshots = {};
for (const [name, query] of shots) {
  const startedMs = Date.now();
  const context = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') {
      console.log(`[${name}] console.error: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => console.log(`[${name}] pageerror: ${error.message}`));
  await page.goto(`${BASE}/${query}`);
  await page.waitForSelector('#game-canvas', { timeout: 120_000 });
  await page.waitForFunction(() => window.__parkingGame !== undefined, undefined, { timeout: 120_000 });
  // 等遮擋半透明淡完（0.2 秒），再等幾幀。
  await page.waitForTimeout(1200);
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const tick = () => {
          frames += 1;
          if (frames >= 4) {
            resolve(null);
          } else {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }),
  );
  snapshots[name] = await page.evaluate(() => window.__parkingGame?.camera() ?? null);
  await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 180_000 });
  console.log(`${name} ${((Date.now() - startedMs) / 1000).toFixed(1)}s`);
  await context.close();
}
fs.writeFileSync(`${OUT}/cameras.json`, JSON.stringify(snapshots, null, 1));
await browser.close();
console.log('ALL DONE');
