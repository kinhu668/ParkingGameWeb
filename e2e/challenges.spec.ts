// 過關挑戰的 e2e：結算畫面星星下面那一排打鉤，以及存檔裡「曾經拿過」的聯集。
// 車頭入庫：w1_l01（車位在正前方，直接開進去）。倒車入庫：w1_l05（車位在正後方，直線倒進去）。
// 路邊平行停車（只有三項、反向不算停妥）由單元測試把關：用鍵盤閉迴路開不進去。
import type { Page } from '@playwright/test';
import { driveIntoSpot } from './driving';
import { challengeIdsInState, expect, OUTPUT_DIR, test } from './fixtures';

/** 存檔在 localStorage 的鍵（src/core/save.ts 的 SAVE_STORAGE_KEY）。 */
const SAVE_KEY = 'parkinggame.save.v1';
/** 一般車位的五項挑戰，依顯示順序。 */
const BAY_CHALLENGES = ['time', 'no_collisions', 'centered', 'head_in', 'back_in'];

/** 讀 localStorage 裡存檔的原始內容；沒存過是 null。 */
async function readSave(page: Page): Promise<unknown> {
  return page.evaluate((key) => {
    const text = window.localStorage.getItem(key);
    return text === null ? null : (JSON.parse(text) as unknown);
  }, SAVE_KEY);
}

/** 把 localStorage 換成 save（null = 清空），再開 url。 */
async function openWithSave(page: Page, url: string, save: unknown): Promise<void> {
  await page.goto(url);
  await page.evaluate(
    ({ key, text }) => {
      window.localStorage.clear();
      if (text !== null) {
        window.localStorage.setItem(key, text);
      }
    },
    { key: SAVE_KEY, text: save === null ? null : JSON.stringify(save) },
  );
  await page.goto(url);
  await expect(page.locator('#game-canvas')).toBeVisible();
}

/** 挑戰列上所有項目的 id（依顯示順序）。 */
async function shownChallengeIds(page: Page): Promise<string[]> {
  return page
    .locator('#result-challenges [data-challenge]')
    .evaluateAll((items) => items.map((item) => item.getAttribute('data-challenge') ?? ''));
}

test('w1_l01 車頭入庫：五項挑戰，車頭入庫打鉤、倒車入庫沒有；舊格式的存檔（沒有 challenges）照樣併進去', async ({
  page,
}) => {
  // 加挑戰之前存的紀錄：只有星數與時間。
  await openWithSave(page, '/?level=w1_l01&lang=zh-TW&touch=off', {
    version: 1,
    levels: { w1_l01: { stars: 1, bestTimeS: 3 } },
    settings: {},
  });
  await expect(page.locator('#result-challenges')).toBeHidden();

  const parked = await driveIntoSpot(page, -60);
  await expect(page.locator('#hud-status')).toHaveAttribute('data-status', 'parked');
  const row = page.locator('#result-challenges');
  await expect(row).toBeVisible();
  expect(await shownChallengeIds(page)).toEqual(BAY_CHALLENGES);
  await expect(row.locator('[data-challenge="head_in"]')).toHaveAttribute('data-state', 'earned');
  await expect(row.locator('[data-challenge="back_in"]')).toHaveAttribute('data-state', 'none');
  // 沒撞到東西（這一關沒有障礙物，直線開進去）。
  expect(parked.collisions).toBe(0);
  await expect(row.locator('[data-challenge="no_collisions"]')).toHaveAttribute('data-state', 'earned');
  await expect(row.locator('[data-challenge="head_in"]')).toHaveText('車頭入庫');
  await expect(row.locator('[data-challenge="time"]')).toHaveText('11 秒內');
  expect(await challengeIdsInState(page, 'best')).toEqual([]);

  // 存檔：舊紀錄的最佳時間留著、星數取大，挑戰是這一局拿到的。
  const earned = await challengeIdsInState(page, 'earned');
  expect(await readSave(page)).toEqual({
    version: 1,
    levels: { w1_l01: { stars: parked.stars, bestTimeS: 3, challenges: earned } },
    settings: {},
  });

  // 換成英文：同一排換成英文字。
  await page.locator('#hud-language').click();
  await expect(row.locator('[data-challenge="head_in"]')).toHaveText('Head-in');
  await expect(row.locator('[data-challenge="time"]')).toHaveText('Under 11 s');
  await page.screenshot({ path: `${OUTPUT_DIR}/challenges-1-head-in.png` });
});

test('w1_l05 倒車入庫：倒車入庫打鉤；存檔裡以前拿過的車頭入庫是較淡的 best，兩個都留在存檔', async ({
  page,
}) => {
  // 之前某一局車頭入庫過（還有一個這一版不認得的 id）。
  await openWithSave(page, '/?level=w1_l05&lang=zh-TW&touch=off', {
    version: 1,
    levels: { w1_l05: { stars: 2, bestTimeS: 9, challenges: ['head_in', 'someday_new'] } },
    settings: {},
  });

  // 車位在正後方 35 ft：直線倒進去，車頭朝通道 = 倒車入庫。
  const parked = await driveIntoSpot(page, 35);
  await expect(page.locator('#hud-status')).toHaveAttribute('data-status', 'parked');
  const row = page.locator('#result-challenges');
  expect(await shownChallengeIds(page)).toEqual(BAY_CHALLENGES);
  await expect(row.locator('[data-challenge="back_in"]')).toHaveAttribute('data-state', 'earned');
  await expect(row.locator('[data-challenge="head_in"]')).toHaveAttribute('data-state', 'best');
  // 角度誤差看較近的合法朝向：直線倒進去是 0°，不是 180°。
  expect(parked.angleErrorDeg).toBeLessThan(1);
  await expect(page.locator('#result-angle')).toHaveText('0.0°');
  await page.screenshot({ path: `${OUTPUT_DIR}/challenges-2-back-in.png` });

  const earned = await challengeIdsInState(page, 'earned');
  expect(earned).toContain('back_in');
  expect(earned).not.toContain('head_in');
  const save = (await readSave(page)) as {
    levels: Record<string, { stars: number; bestTimeS: number; challenges: string[] }>;
  };
  // 聯集：先前的在前面（不認得的 id 也留著），後面接這一局新拿到的。
  expect(save.levels.w1_l05?.challenges).toEqual(['head_in', 'someday_new', ...earned]);
  expect(save.levels.w1_l05?.stars).toBe(Math.max(2, parked.stars ?? 0));

  // 重來再倒一次：面板先消失；再停妥後車頭入庫仍是 best、存檔不變多。
  await page.locator('#result-retry').click();
  await expect(page.locator('#hud-status')).toBeHidden();
  await driveIntoSpot(page, 35);
  await expect(row.locator('[data-challenge="head_in"]')).toHaveAttribute('data-state', 'best');
  const again = (await readSave(page)) as typeof save;
  expect(new Set(again.levels.w1_l05?.challenges).size).toBe(again.levels.w1_l05?.challenges.length);
  expect(again.levels.w1_l05?.challenges).toEqual(expect.arrayContaining(['head_in', 'back_in']));
});

test('原型關：只顯示這一局的打鉤，不寫存檔', async ({ page }) => {
  await openWithSave(page, '/?level=prototype&lang=en&touch=off', null);
  await driveIntoSpot(page, -60);
  await expect(page.locator('#hud-status')).toHaveAttribute('data-status', 'parked');
  expect(await shownChallengeIds(page)).toEqual(BAY_CHALLENGES);
  await expect(page.locator('#result-challenges [data-challenge="head_in"]')).toHaveAttribute(
    'data-state',
    'earned',
  );
  await expect(page.locator('#result-challenges [data-challenge="time"]')).toHaveText('Under 21 s');
  expect(await challengeIdsInState(page, 'best')).toEqual([]);
  expect(await readSave(page)).toBeNull();
});
