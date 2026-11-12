// 第 1 世界 10 關的 e2e：每關開一張俯視定格（沒有 console error、畫面不是空白），截圖存 e2e/output/ 供自審；
// `?cam=…&level=…&t=…` 沿參考路線跑（t = 0 在起點、很大的 t 停在車位裡、同一個網址可重現）；
// 關卡選擇的 10 張卡都是做好的關，沒有「即將推出」。
import type { Page } from '@playwright/test';
import {
  expect,
  imageStats,
  MAX_DOMINANT_FRACTION,
  MIN_DISTINCT_COLORS,
  OUTPUT_DIR,
  test,
} from './fixtures';

/** ?cam 畫完定格的那一幀後在 <body> 設的旗標。 */
const SHOT_READY = 'body[data-shot-ready="true"]';

const WORLD_1_IDS = [
  'w1_l01',
  'w1_l02',
  'w1_l03',
  'w1_l04',
  'w1_l05',
  'w1_l06',
  'w1_l07',
  'w1_l08',
  'w1_l09',
  'w1_l10',
];

/** 很大的 t：參考路線早就跑完，車停在車位裡。 */
const PARKED_T = 999;

/** 開一個定格網址，等畫完，回傳截圖（base64）。fileName 有給就存檔。 */
async function shot(page: Page, url: string, fileName?: string): Promise<string> {
  await page.goto(url);
  await expect(page.locator(SHOT_READY)).toBeAttached();
  const png = await page.screenshot(
    fileName === undefined ? {} : { path: `${OUTPUT_DIR}/${fileName}` },
  );
  return png.toString('base64');
}

for (const id of WORLD_1_IDS) {
  test(`${id}：俯視定格畫得出來，起點與停妥是兩張不同的圖`, async ({ page }) => {
    const atStart = await shot(page, `/?level=${id}&cam=top&t=0`, `levels-${id}-top-start.png`);
    await expect(page.locator('html')).toHaveAttribute('data-level', id);
    const stats = await imageStats(page, atStart);
    expect(stats.distinctColors).toBeGreaterThanOrEqual(MIN_DISTINCT_COLORS);
    expect(stats.dominantFraction).toBeLessThan(MAX_DOMINANT_FRACTION);

    // 很大的 t：車沿參考路線開進車位，畫面與起點不同。
    const parked = await shot(page, `/?level=${id}&cam=top&t=${PARKED_T}`, `levels-${id}-top-parked.png`);
    expect(parked === atStart, '停妥的定格不應該與起點相同').toBe(false);
  });
}

test('?cam&level&t 可重現：同一個網址重開，截圖逐位元組相同；跟車鏡頭跟著車走', async ({ page }) => {
  const url = '/?level=w1_l07&cam=top&t=9';
  const first = await shot(page, url);
  const second = await shot(page, url);
  expect(second === first, '兩次截圖必須完全相同').toBe(true);

  // 跟車鏡頭對準車：路線中途與停妥時車在不同的地方，畫面不同。
  const midway = await shot(page, '/?level=w1_l07&cam=follow&t=9', 'levels-w1_l07-follow-t9.png');
  const parked = await shot(page, `/?level=w1_l07&cam=follow&t=${PARKED_T}`, 'levels-w1_l07-follow-parked.png');
  expect(parked === midway).toBe(false);
});

test('關卡選擇：10 張卡都是做好的關，沒有「即將推出」；兩種語言都有名稱', async ({ page }) => {
  await page.goto('/?lang=en&unlock=all');
  const cards = page.locator('.level-card');
  await expect(cards).toHaveCount(WORLD_1_IDS.length);
  await expect(page.locator('.level-card[data-state="soon"]')).toHaveCount(0);
  for (const [index, id] of WORLD_1_IDS.entries()) {
    await expect(cards.nth(index)).toHaveAttribute('data-level', id);
    await expect(cards.nth(index)).toHaveAttribute('data-state', 'unlocked');
  }
  const englishNames = await page.locator('.level-card-name').allTextContents();
  expect(englishNames).toHaveLength(WORLD_1_IDS.length);
  for (const name of englishNames) {
    // 有翻譯的名稱，不是退回顯示 id。
    expect(name).not.toMatch(/^w1_l\d\d$/);
    expect(name).toMatch(/^[\x20-\x7e]+$/);
  }
  await page.screenshot({ path: `${OUTPUT_DIR}/levels-select-en.png` });

  // 沒有 unlock=all、沒有存檔：第 1 關可點，其餘 9 關是鎖頭（不是「即將推出」）。
  await page.goto('/?lang=zh-TW');
  await expect(page.locator('.level-card[data-state="unlocked"]')).toHaveCount(1);
  await expect(page.locator('.level-card[data-state="locked"]')).toHaveCount(WORLD_1_IDS.length - 1);
  await expect(page.locator('.level-card-lock')).toHaveCount(WORLD_1_IDS.length - 1);
  const chineseNames = await page.locator('.level-card-name').allTextContents();
  for (const name of chineseNames) {
    expect(name).toMatch(/[一-鿿]/);
  }
  await page.screenshot({ path: `${OUTPUT_DIR}/levels-select-zh.png` });
});
