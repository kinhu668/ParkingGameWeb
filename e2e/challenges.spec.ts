// 過關挑戰的 e2e：結算畫面星星下面那一排打鉤，以及存檔裡「曾經拿過」的聯集。
// 車頭入庫與倒車入庫都在 w1_l01：直行 → 右轉進車位，或開過車位再倒進去（e2e/driving.ts 的兩條鍵盤路線）。
// 「安全出車」在 w1_l03：起點停在車位裡，整條路倒著開（倒車出庫 → 沿走道倒退 → 倒車入庫）。
// 路邊平行停車（只有三項、反向不算停妥）由單元測試把關：用鍵盤閉迴路開不進去。
// 存檔的 levelsRevision：2 = 第 1 世界重做之後存的；沒有這個欄位的舊存檔，第 1 世界的紀錄會被清掉一次（最後一個測試）。
import type { Page } from '@playwright/test';
import {
  driveIntoSpot,
  driveRoute,
  W1_L01_BACK_IN,
  W1_L01_HEAD_IN,
  W1_L03_BACK_OUT_AND_IN,
} from './driving';
import { challengeIdsInState, expect, OUTPUT_DIR, test } from './fixtures';

/** 存檔在 localStorage 的鍵（src/core/save.ts 的 SAVE_STORAGE_KEY）。 */
const SAVE_KEY = 'parkinggame.save.v1';
/** 現在的關卡版次（src/core/save.ts 的 LEVELS_REVISION）。 */
const LEVELS_REVISION = 2;
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

test('w1_l01 車頭入庫：五項挑戰，車頭入庫打鉤、倒車入庫沒有；舊格式的紀錄（沒有 challenges）照樣併進去', async ({
  page,
}) => {
  test.slow();
  // 加挑戰之前的紀錄格式：只有星數與時間。
  await openWithSave(page, '/?level=w1_l01&lang=zh-TW&touch=off&quality=low', {
    version: 1,
    levelsRevision: LEVELS_REVISION,
    levels: { w1_l01: { stars: 1, bestTimeS: 3 } },
    settings: {},
  });
  await expect(page.locator('#result-challenges')).toBeHidden();

  const parked = await driveRoute(page, W1_L01_HEAD_IN);
  await expect(page.locator('#hud-status')).toHaveAttribute('data-status', 'parked');
  const row = page.locator('#result-challenges');
  await expect(row).toBeVisible();
  expect(await shownChallengeIds(page)).toEqual(BAY_CHALLENGES);
  await expect(row.locator('[data-challenge="head_in"]')).toHaveAttribute('data-state', 'earned');
  await expect(row.locator('[data-challenge="back_in"]')).toHaveAttribute('data-state', 'none');
  // 沒撞到東西（目標車位兩側都是空格）。
  expect(parked.collisions).toBe(0);
  await expect(row.locator('[data-challenge="no_collisions"]')).toHaveAttribute('data-state', 'earned');
  await expect(row.locator('[data-challenge="head_in"]')).toHaveText('車頭入庫');
  await expect(row.locator('[data-challenge="time"]')).toHaveText('13 秒內');
  expect(await challengeIdsInState(page, 'best')).toEqual([]);

  // 存檔：舊紀錄的最佳時間留著、星數取大，挑戰是這一局拿到的。
  const earned = await challengeIdsInState(page, 'earned');
  expect(await readSave(page)).toEqual({
    version: 1,
    levelsRevision: LEVELS_REVISION,
    levels: { w1_l01: { stars: Math.max(1, parked.stars ?? 0), bestTimeS: 3, challenges: earned } },
    settings: {},
  });

  // 換成英文：同一排換成英文字。
  await page.locator('#hud-language').click();
  await expect(row.locator('[data-challenge="head_in"]')).toHaveText('Head-in');
  await expect(row.locator('[data-challenge="time"]')).toHaveText('Under 13 s');
  await page.screenshot({ path: `${OUTPUT_DIR}/challenges-1-head-in.png` });
});

test('w1_l01 倒車入庫：倒車入庫打鉤；存檔裡以前拿過的車頭入庫是較淡的 best，兩個都留在存檔', async ({
  page,
}) => {
  test.slow();
  // 之前某一局車頭入庫過（還有一個這一版不認得的 id）。
  await openWithSave(page, '/?level=w1_l01&lang=zh-TW&touch=off&quality=low', {
    version: 1,
    levelsRevision: LEVELS_REVISION,
    levels: { w1_l01: { stars: 2, bestTimeS: 9, challenges: ['head_in', 'someday_new'] } },
    settings: {},
  });

  // 開過車位再倒進去：車頭朝通道 = 倒車入庫。
  const parked = await driveRoute(page, W1_L01_BACK_IN);
  await expect(page.locator('#hud-status')).toHaveAttribute('data-status', 'parked');
  const row = page.locator('#result-challenges');
  expect(await shownChallengeIds(page)).toEqual(BAY_CHALLENGES);
  await expect(row.locator('[data-challenge="back_in"]')).toHaveAttribute('data-state', 'earned');
  await expect(row.locator('[data-challenge="head_in"]')).toHaveAttribute('data-state', 'best');
  // 角度誤差看較近的合法朝向：倒進去是幾度以內，不是 180° 上下。
  expect(parked.angleErrorDeg).toBeLessThan(5);
  await expect(page.locator('#result-angle')).toHaveText(`${parked.angleErrorDeg.toFixed(1)}°`);
  await page.screenshot({ path: `${OUTPUT_DIR}/challenges-2-back-in.png` });

  const earned = await challengeIdsInState(page, 'earned');
  expect(earned).toContain('back_in');
  expect(earned).not.toContain('head_in');
  const save = (await readSave(page)) as {
    levels: Record<string, { stars: number; bestTimeS: number; challenges: string[] }>;
  };
  // 聯集：先前的在前面（不認得的 id 也留著），後面接這一局新拿到的。
  expect(save.levels.w1_l01?.challenges).toEqual(['head_in', 'someday_new', ...earned]);
  expect(save.levels.w1_l01?.stars).toBe(Math.max(2, parked.stars ?? 0));

  // 重來再倒一次：面板先消失；再停妥後車頭入庫仍是 best、存檔不變多。
  await page.locator('#result-retry').click();
  await expect(page.locator('#hud-status')).toBeHidden();
  await driveRoute(page, W1_L01_BACK_IN);
  await expect(row.locator('[data-challenge="head_in"]')).toHaveAttribute('data-state', 'best');
  const again = (await readSave(page)) as typeof save;
  expect(new Set(again.levels.w1_l01?.challenges).size).toBe(again.levels.w1_l01?.challenges.length);
  expect(again.levels.w1_l01?.challenges).toEqual(expect.arrayContaining(['head_in', 'back_in']));
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

test('w1_l03 起點停在車位裡：多一項「安全出車」，倒車出庫沒碰到鄰車就打鉤並寫進存檔', async ({ page }) => {
  test.slow();
  await openWithSave(page, '/?level=w1_l03&lang=zh-TW&touch=off&quality=low', null);

  const parked = await driveRoute(page, W1_L03_BACK_OUT_AND_IN);
  await expect(page.locator('#hud-status')).toHaveAttribute('data-status', 'parked');
  expect(parked.collisions).toBe(0);
  const row = page.locator('#result-challenges');
  expect(await shownChallengeIds(page)).toEqual([...BAY_CHALLENGES, 'clean_exit']);
  await expect(row.locator('[data-challenge="clean_exit"]')).toHaveAttribute('data-state', 'earned');
  await expect(row.locator('[data-challenge="clean_exit"]')).toHaveText('安全出車');
  await expect(row.locator('[data-challenge="back_in"]')).toHaveAttribute('data-state', 'earned');
  await expect(row.locator('[data-challenge="time"]')).toHaveText('25 秒內');
  await page.screenshot({ path: `${OUTPUT_DIR}/challenges-3-clean-exit.png` });

  const earned = await challengeIdsInState(page, 'earned');
  expect(earned).toContain('clean_exit');
  expect(await readSave(page)).toEqual({
    version: 1,
    levelsRevision: LEVELS_REVISION,
    levels: { w1_l03: { stars: parked.stars, bestTimeS: parked.elapsedS, challenges: earned } },
    settings: {},
  });

  await page.locator('#hud-language').click();
  await expect(row.locator('[data-challenge="clean_exit"]')).toHaveText('Clean exit');
});

test('第 1 世界重做前的存檔（沒有 levelsRevision）：那 10 關的星數與挑戰清掉一次，語言設定留著，之後的紀錄照常保存', async ({
  page,
}) => {
  test.slow();
  // 重做之前存的：第 1、2 關三星。
  await openWithSave(page, '/?lang=zh-TW', {
    version: 1,
    levels: {
      w1_l01: { stars: 3, bestTimeS: 4.2, challenges: ['time', 'head_in'] },
      w1_l02: { stars: 3, bestTimeS: 6, challenges: ['centered'] },
    },
    settings: { locale: 'zh-TW' },
  });
  // 關卡選擇：第 1 關沒有星、第 2 關鎖著（舊紀錄不算）。
  const cards = page.locator('.level-card[data-level]');
  await expect(cards.first()).toHaveAttribute('data-level', 'w1_l01');
  await expect(cards.first()).toHaveAttribute('data-stars', '0');
  await expect(cards.nth(1)).toBeDisabled();

  // 在新的第 1 關過關：存檔只有這一局的紀錄，版次是現在的，語言還在。
  await page.goto('/?level=w1_l01&lang=zh-TW&touch=off&quality=low');
  await expect(page.locator('#game-canvas')).toBeVisible();
  const parked = await driveRoute(page, W1_L01_HEAD_IN);
  const earned = await challengeIdsInState(page, 'earned');
  expect(earned).toContain('head_in');
  const save = (await readSave(page)) as {
    levelsRevision: number;
    levels: Record<string, { stars: number; bestTimeS: number; challenges: string[] }>;
    settings: { locale?: string };
  };
  expect(save.levelsRevision).toBe(LEVELS_REVISION);
  expect(Object.keys(save.levels)).toEqual(['w1_l01']);
  expect(save.levels.w1_l01?.stars).toBe(parked.stars);
  expect(save.levels.w1_l01?.challenges).toEqual(earned);
  expect(save.settings.locale).toBe('zh-TW');
});
