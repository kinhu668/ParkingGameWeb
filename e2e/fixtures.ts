// e2e 共用：每個測試自動收集 pageerror 與 console error，測試結束時必須一個都沒有；
// 另有讀 WebGL 畫布內容的 canvasStats（確認畫面不是空白、不是整片同一個顏色）。
// 每個 spec 都從這裡 import `test`／`expect`，不必各自重複掛監聽。
import { expect, test as base, type Page } from '@playwright/test';

/** 測試自己存的截圖放這裡（已在 .gitignore）。 */
export const OUTPUT_DIR = 'e2e/output';

export const test = base.extend<{ readonly pageProblems: readonly string[] }>({
  pageProblems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => {
        problems.push(`pageerror: ${error.message}`);
      });
      page.on('console', (message) => {
        if (message.type() === 'error') {
          problems.push(`console.error: ${message.text()}`);
        }
      });

      await use(problems);

      expect(problems, '頁面不應該有 pageerror 或 console error').toEqual([]);
    },
    // auto：測試沒有明講要用這個 fixture 也會套用。
    { auto: true },
  ],
});

export { expect };

/** 畫布縮小成這個大小來統計顏色；夠看出「有沒有畫東西」，又不必搬整張圖。 */
const PROBE_WIDTH = 160;
const PROBE_HEIGHT = 90;
/** 佔最多像素的那個顏色不能超過這個比例；全黑、全白、只有天空都會接近 1。 */
export const MAX_DOMINANT_FRACTION = 0.8;
/** 至少要有這麼多種不同的顏色（每個色版量化成 16 階之後）。 */
export const MIN_DISTINCT_COLORS = 12;

export interface CanvasStats {
  /** 量化後不同顏色的數目。 */
  readonly distinctColors: number;
  /** 佔最多像素的顏色所佔的比例（0–1）。 */
  readonly dominantFraction: number;
  /** 縮小後的像素（每個色版量化成 16 階），用來比較兩個鏡頭的畫面是否不同。 */
  readonly signature: string;
}

/**
 * 讀 WebGL 畫布這一幀的內容。在 requestAnimationFrame 裡讀：遊戲的 frame 比這個回呼早登記，
 * 所以這時畫布上是剛畫好的這一幀（還沒被合成器清掉）。只看畫布，HUD 的面板不會混進統計。
 */
export async function canvasStats(page: Page): Promise<CanvasStats> {
  return page.evaluate(
    ({ width, height }) =>
      new Promise<CanvasStats>((resolve, reject) => {
        requestAnimationFrame(() => {
          const source = document.querySelector<HTMLCanvasElement>('#game-canvas');
          const context = document.createElement('canvas').getContext('2d');
          if (source === null || context === null) {
            reject(new Error('讀不到畫布'));
            return;
          }
          context.canvas.width = width;
          context.canvas.height = height;
          context.drawImage(source, 0, 0, width, height);
          const pixels = context.getImageData(0, 0, width, height).data;

          const counts = new Map<string, number>();
          const quantized: string[] = [];
          for (let offset = 0; offset < pixels.length; offset += 4) {
            const color = [0, 1, 2]
              .map((channel) => ((pixels[offset + channel] ?? 0) >> 4).toString(16))
              .join('');
            quantized.push(color);
            counts.set(color, (counts.get(color) ?? 0) + 1);
          }
          resolve({
            distinctColors: counts.size,
            dominantFraction: Math.max(...counts.values()) / (width * height),
            signature: quantized.join(''),
          });
        });
      }),
    { width: PROBE_WIDTH, height: PROBE_HEIGHT },
  );
}

/**
 * 統計一張截圖（PNG 的 base64）的顏色，量化方式與 canvasStats 相同。
 * 定格模式（?cam）只畫一次，之後畫布的內容已經交給合成器，讀不回來；所以改看截圖本身。
 */
export async function imageStats(page: Page, pngBase64: string): Promise<CanvasStats> {
  return page.evaluate(
    async ({ base64, width, height }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const context = document.createElement('canvas').getContext('2d');
      if (context === null) {
        throw new Error('建立不了 2D 畫布');
      }
      context.canvas.width = width;
      context.canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;

      const counts = new Map<string, number>();
      const quantized: string[] = [];
      for (let offset = 0; offset < pixels.length; offset += 4) {
        const color = [0, 1, 2]
          .map((channel) => ((pixels[offset + channel] ?? 0) >> 4).toString(16))
          .join('');
        quantized.push(color);
        counts.set(color, (counts.get(color) ?? 0) + 1);
      }
      return {
        distinctColors: counts.size,
        dominantFraction: Math.max(...counts.values()) / (width * height),
        signature: quantized.join(''),
      };
    },
    { base64: pngBase64, width: PROBE_WIDTH, height: PROBE_HEIGHT },
  );
}
