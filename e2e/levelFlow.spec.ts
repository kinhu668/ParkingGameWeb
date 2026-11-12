// 驗收 e2e（計畫 4.6）：關卡選擇 → 進關 → 用真實鍵盤停好車 → 結算有星 → 回關卡選擇星數還在、下一關解鎖
// → 重新整理後仍然如此 → localStorage 的內容正確。另有：下一關／重來按鈕、Esc 暫停、?unlock=all、語言寫進存檔。
//
// 第 1 世界的 10 關都做好了，「下一關」是 w1_l02。
// 測試不寫死下一關的 id：一律用「做好的關」（有 data-level 的卡）的第 1、第 2 張；
// 「即將推出」的格子現在是 0 張，那幾個迴圈留著給之後還沒做完的世界。
import type { Locator, Page } from '@playwright/test';
import { driveIntoSpot, nextSnapshot } from './driving';
import { expect, OUTPUT_DIR, test } from './fixtures';

/** 存檔在 localStorage 的鍵（src/core/save.ts 的 SAVE_STORAGE_KEY）。 */
const SAVE_KEY = 'parkinggame.save.v1';
/** 第 1 關：車從 (0, 0) ft 朝北出發，車位中心在正前方 (0, −60) ft。 */
const FIRST_LEVEL_ID = 'w1_l01';
const FIRST_LEVEL_SPOT_Z_FT = -60;
/** 一個世界的格子數。 */
const CARD_COUNT = 10;
/** 位置比對的容許誤差（ft）。 */
const POSITION_TOLERANCE_FT = 0.01;
/** 按住 W 之後車至少要走這麼遠才算「有在動」。 */
const MIN_ADVANCE_FT = 1;
/** 等車開出去的真實時間上限。 */
const MOVE_DEADLINE_MS = 30_000;

interface SavedData {
  readonly version: number;
  readonly levels: Record<string, { readonly stars: number; readonly bestTimeS: number }>;
  readonly settings: { readonly locale?: string };
}

/** 讀 localStorage 裡的存檔；沒存過是 null。 */
async function readSave(page: Page): Promise<SavedData | null> {
  return page.evaluate((key) => {
    const text = window.localStorage.getItem(key);
    return text === null ? null : (JSON.parse(text) as SavedData);
  }, SAVE_KEY);
}

/** 做好的關的卡片（有 data-level），依關卡順序。 */
function madeCards(page: Page): Locator {
  return page.locator('.level-card[data-level]');
}

/** 從卡片讀出關卡 id。 */
async function levelIdOf(card: Locator): Promise<string> {
  const id = await card.getAttribute('data-level');
  if (id === null) {
    throw new Error('卡片沒有 data-level');
  }
  return id;
}

/** 按住 W 直到車離開起點至少 MIN_ADVANCE_FT，放開後回傳當下的 z（ft）。 */
async function driveForwardABit(page: Page): Promise<number> {
  const startZFt = (await nextSnapshot(page)).zFt;
  const deadlineMs = Date.now() + MOVE_DEADLINE_MS;
  await page.keyboard.down('KeyW');
  let zFt = startZFt;
  while (startZFt - zFt < MIN_ADVANCE_FT) {
    if (Date.now() > deadlineMs) {
      await page.keyboard.up('KeyW');
      throw new Error(`時間內車沒有往前走，z = ${zFt}`);
    }
    zFt = (await nextSnapshot(page)).zFt;
  }
  await page.keyboard.up('KeyW');
  return zFt;
}

test('驗收：選關 → 停好車 → 結算有星 → 回選單星數還在、下一關解鎖 → 重新整理後仍在', async ({
  page,
}) => {
  // 清空 localStorage 再開首頁。
  await page.goto('/?lang=zh-TW');
  await page.evaluate(() => {
    window.localStorage.clear();
  });
  await page.goto('/?lang=zh-TW');
  expect(await readSave(page)).toBeNull();

  // 首頁是關卡選擇：10 格；第 1 關可以點、沒有星；下一關鎖著不能點。
  const select = page.locator('#level-select');
  await expect(select).toBeVisible();
  await expect(select.locator('.select-title')).toHaveText('選擇關卡');
  await expect(page.locator('.level-card')).toHaveCount(CARD_COUNT);
  const firstCard = madeCards(page).nth(0);
  const nextCard = madeCards(page).nth(1);
  await expect(firstCard).toHaveAttribute('data-level', FIRST_LEVEL_ID);
  await expect(firstCard).toHaveAttribute('data-state', 'unlocked');
  await expect(firstCard).toHaveAttribute('data-stars', '0');
  await expect(firstCard).toBeEnabled();
  await expect(firstCard.locator('.level-card-name')).toHaveText('第一個車位');
  await expect(firstCard.locator('.level-card-stars')).toHaveText('☆☆☆');
  await expect(nextCard).toHaveAttribute('data-state', 'locked');
  await expect(nextCard).toBeDisabled();
  await expect(nextCard.locator('.level-card-lock')).toBeVisible();
  const nextLevelId = await levelIdOf(nextCard);
  expect(nextLevelId).not.toBe(FIRST_LEVEL_ID);
  // 還沒做的關不能點。
  for (const soon of await page.locator('.level-card[data-state="soon"]').all()) {
    await expect(soon).toBeDisabled();
  }
  expect(await page.evaluate(() => window.__parkingGame === undefined)).toBe(true);
  await page.screenshot({ path: `${OUTPUT_DIR}/levelflow-1-select-empty.png` });

  // 點第 1 關：換網址進關，lang 參數保留。
  await firstCard.click();
  await expect(page.locator('html')).toHaveAttribute('data-level', FIRST_LEVEL_ID);
  expect(new URL(page.url()).searchParams.get('level')).toBe(FIRST_LEVEL_ID);
  expect(new URL(page.url()).searchParams.get('lang')).toBe('zh-TW');
  await expect(page.locator('#hud-speed')).toHaveText('0.0');
  await expect(page.locator('#hud-status')).toBeHidden();
  // 還沒過關：存檔沒有被寫入。
  expect(await readSave(page)).toBeNull();

  // 用真實鍵盤把車停進車位。
  const parked = await driveIntoSpot(page, FIRST_LEVEL_SPOT_Z_FT);
  expect(parked.status).toBe('parked');
  const earnedStars = parked.stars ?? 0;
  expect(earnedStars).toBeGreaterThanOrEqual(1);

  // 結算：星數、時間、碰撞、下一關／重來／關卡選擇。
  const status = page.locator('#hud-status');
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute('data-status', 'parked');
  const resultStars = page.locator('#result-stars');
  await expect(resultStars).toBeVisible();
  await expect(resultStars).toHaveAttribute('data-stars', String(earnedStars));
  await expect(resultStars).toHaveText('★'.repeat(earnedStars) + '☆'.repeat(3 - earnedStars));
  await expect(page.locator('#result-time')).toHaveText(/^\d+:\d{2}\.\d$/);
  await expect(page.locator('#result-collisions')).toHaveText(`${parked.collisions} / 5`);
  await expect(page.locator('#result-next')).toBeVisible();
  await expect(page.locator('#result-retry')).toBeVisible();
  await expect(page.locator('#result-select')).toBeVisible();
  await page.screenshot({ path: `${OUTPUT_DIR}/levelflow-2-result.png` });

  // 停妥當下就寫進存檔：只有這一關，星數與時間就是這一次的成績。
  const expectedSave: SavedData = {
    version: 1,
    levels: { [FIRST_LEVEL_ID]: { stars: earnedStars, bestTimeS: parked.elapsedS } },
    settings: {},
  };
  expect(parked.elapsedS).toBeGreaterThan(0);
  expect(await readSave(page)).toEqual(expectedSave);

  // 回關卡選擇：第 1 關顯示同樣的星數與時間，下一關解鎖。
  await page.locator('#result-select').click();
  await expect(select).toBeVisible();
  expect(new URL(page.url()).searchParams.has('level')).toBe(false);
  expect(new URL(page.url()).searchParams.get('lang')).toBe('zh-TW');
  async function expectProgressShown(): Promise<void> {
    await expect(firstCard).toHaveAttribute('data-stars', String(earnedStars));
    await expect(firstCard.locator('.level-card-stars')).toHaveText(
      '★'.repeat(earnedStars) + '☆'.repeat(3 - earnedStars),
    );
    await expect(firstCard.locator('.level-card-time-value')).toHaveText(/^\d+:\d{2}\.\d$/);
    await expect(nextCard).toHaveAttribute('data-level', nextLevelId);
    await expect(nextCard).toHaveAttribute('data-state', 'unlocked');
    await expect(nextCard).toBeEnabled();
    await expect(nextCard.locator('.level-card-lock')).toHaveCount(0);
    // 再下一關（如果已經做好）還鎖著：只解鎖一關。
    for (const later of (await madeCards(page).all()).slice(2)) {
      await expect(later).toHaveAttribute('data-state', 'locked');
    }
  }
  await expectProgressShown();
  await page.screenshot({ path: `${OUTPUT_DIR}/levelflow-3-select-after-clear.png` });

  // 重新整理：星數還在、下一關仍然解鎖，localStorage 的內容沒變。
  await page.reload();
  await expect(select).toBeVisible();
  await expectProgressShown();
  expect(await readSave(page)).toEqual(expectedSave);
  await page.screenshot({ path: `${OUTPUT_DIR}/levelflow-4-select-after-reload.png` });

  // 剛解鎖的下一關真的點得進去。
  await nextCard.click();
  await expect(page.locator('html')).toHaveAttribute('data-level', nextLevelId);
  expect((await nextSnapshot(page)).status).toBe('ready');
});

test('結算的「重來」留在頁內、「下一關」換網址並保留參數；成績只會變好', async ({ page }) => {
  await page.goto(`/?level=${FIRST_LEVEL_ID}&lang=zh-TW&view=top&quality=low`);
  const status = page.locator('#hud-status');
  await expect(page.locator('#hud-speed')).toHaveText('0.0');

  const first = await driveIntoSpot(page, FIRST_LEVEL_SPOT_Z_FT);
  await expect(status).toBeVisible();
  const firstSave = await readSave(page);
  expect(firstSave?.levels[FIRST_LEVEL_ID]).toEqual({
    stars: first.stars,
    bestTimeS: first.elapsedS,
  });

  // 重來（按鈕）：面板消失、車回起點、計時歸零；網址沒變，存檔也還在。
  const urlBefore = page.url();
  await page.locator('#result-retry').click();
  await expect(status).toBeHidden();
  const restarted = await nextSnapshot(page);
  expect(restarted.status).toBe('ready');
  expect(restarted.elapsedS).toBe(0);
  expect(Math.abs(restarted.zFt)).toBeLessThan(POSITION_TOLERANCE_FT);
  expect(page.url()).toBe(urlBefore);
  expect(await readSave(page)).toEqual(firstSave);

  // 再過一次：星數取大、時間取小。
  const second = await driveIntoSpot(page, FIRST_LEVEL_SPOT_Z_FT);
  await expect(status).toBeVisible();
  expect((await readSave(page))?.levels[FIRST_LEVEL_ID]).toEqual({
    stars: Math.max(first.stars ?? 0, second.stars ?? 0),
    bestTimeS: Math.min(first.elapsedS, second.elapsedS),
  });

  // 下一關：換網址，quality、lang、view 保留。
  await page.locator('#result-next').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-level', FIRST_LEVEL_ID);
  await expect(page.locator('html')).toHaveAttribute('data-level', /^w1_l\d{2}$/);
  const params = new URL(page.url()).searchParams;
  expect(params.get('level')).toBe(await page.locator('html').getAttribute('data-level'));
  expect(params.get('lang')).toBe('zh-TW');
  expect(params.get('view')).toBe('top');
  expect(params.get('quality')).toBe('low');
  await expect(page.locator('html')).toHaveAttribute('data-quality', 'low');
  await expect(page.locator('#hud-camera')).toHaveAttribute('data-view', 'top');
});

test('Esc 暫停：車與計時都停住；繼續後照常；暫停面板可以回關卡選擇', async ({ page }) => {
  await page.goto(`/?level=${FIRST_LEVEL_ID}&lang=zh-TW`);
  const pause = page.locator('#hud-pause');
  await expect(page.locator('#hud-speed')).toHaveText('0.0');
  await expect(pause).toBeHidden();

  // 先開一小段，計時開始。
  const movedZFt = await driveForwardABit(page);
  expect(movedZFt).toBeLessThan(0);

  // Esc：暫停面板出現；之後車不動、計時不走，按住 W 也沒用。
  await page.keyboard.press('Escape');
  await expect(pause).toBeVisible();
  await expect(pause.locator('.hud-status-title')).toHaveText('暫停');
  const pausedAt = await nextSnapshot(page);
  await page.keyboard.down('KeyW');
  await nextSnapshot(page);
  await nextSnapshot(page);
  await nextSnapshot(page);
  const stillPaused = await nextSnapshot(page);
  await page.keyboard.up('KeyW');
  expect(stillPaused.zFt).toBe(pausedAt.zFt);
  expect(stillPaused.elapsedS).toBe(pausedAt.elapsedS);
  expect(stillPaused.status).toBe('driving');
  await page.screenshot({ path: `${OUTPUT_DIR}/levelflow-pause.png` });

  // 「繼續」：面板收起來，車又開得動。
  await page.locator('#pause-resume').click();
  await expect(pause).toBeHidden();
  expect(await driveForwardABit(page)).toBeLessThan(pausedAt.zFt);

  // 再按 Esc 暫停、再按一次 Esc 繼續。
  await page.keyboard.press('Escape');
  await expect(pause).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pause).toBeHidden();

  // 暫停面板的「重來」：回起點、解除暫停。
  await page.keyboard.press('Escape');
  await expect(pause).toBeVisible();
  await page.locator('#pause-retry').click();
  await expect(pause).toBeHidden();
  const restarted = await nextSnapshot(page);
  expect(restarted.status).toBe('ready');
  expect(Math.abs(restarted.zFt)).toBeLessThan(POSITION_TOLERANCE_FT);

  // 暫停面板的「關卡選擇」：回首頁。沒過關，所以沒有存檔。
  await page.keyboard.press('Escape');
  await page.locator('#pause-select').click();
  await expect(page.locator('#level-select')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('level')).toBe(false);
  expect(await readSave(page)).toBeNull();
});

test('HUD 的關卡選擇按鈕回首頁；?unlock=all 全部可點但不寫存檔；?level= 不檢查解鎖', async ({
  page,
}) => {
  // 空的存檔直接開還沒解鎖的關：進得去。
  await page.goto('/?lang=en');
  const lockedId = await levelIdOf(madeCards(page).nth(1));
  await expect(madeCards(page).nth(1)).toBeDisabled();
  await page.goto(`/?level=${lockedId}&lang=en`);
  await expect(page.locator('html')).toHaveAttribute('data-level', lockedId);
  expect((await nextSnapshot(page)).status).toBe('ready');

  // HUD 右上角的按鈕回關卡選擇。
  await expect(page.locator('#hud-level-select')).toHaveText('Level select');
  await page.locator('#hud-level-select').click();
  await expect(page.locator('#level-select')).toBeVisible();
  await expect(page.locator('.select-title')).toHaveText('Select a Level');

  // ?unlock=all：做好的關全部可以點；還沒做的關仍然不能點；存檔沒有被寫入。
  await page.goto('/?lang=en&unlock=all');
  for (const card of await madeCards(page).all()) {
    await expect(card).toHaveAttribute('data-state', 'unlocked');
    await expect(card).toBeEnabled();
  }
  for (const soon of await page.locator('.level-card[data-state="soon"]').all()) {
    await expect(soon).toBeDisabled();
    await expect(soon.locator('.level-card-name')).toHaveText('Coming soon');
  }
  expect(await readSave(page)).toBeNull();
  await page.screenshot({ path: `${OUTPUT_DIR}/levelflow-select-unlock-all-en.png` });

  // 點進去再回來，unlock=all 還在網址上，仍然沒有存檔。
  await madeCards(page).nth(1).click();
  await expect(page.locator('html')).toHaveAttribute('data-level', lockedId);
  await page.locator('#hud-level-select').click();
  await expect(page.locator('#level-select')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('unlock')).toBe('all');
  expect(await readSave(page)).toBeNull();

  // 拿掉 unlock=all：又鎖回去。
  await page.goto('/?lang=en');
  await expect(madeCards(page).nth(1)).toHaveAttribute('data-state', 'locked');
});

test('語言按鈕的選擇寫進存檔：重新整理、進關都沿用；?lang= 仍然優先', async ({ page }) => {
  const html = page.locator('html');

  // 無頭瀏覽器的語言是英文；網址沒有 ?lang=。
  await page.goto('/');
  await expect(html).toHaveAttribute('lang', 'en');
  await expect(page.locator('.select-title')).toHaveText('Select a Level');
  expect(await readSave(page)).toBeNull();

  // 按語言按鈕：就地變中文，寫進存檔。
  await page.locator('#select-language').click();
  await expect(html).toHaveAttribute('lang', 'zh-TW');
  await expect(page.locator('.select-title')).toHaveText('選擇關卡');
  await expect(madeCards(page).nth(0).locator('.level-card-name')).toHaveText('第一個車位');
  expect(await readSave(page)).toEqual({ version: 1, levels: {}, settings: { locale: 'zh-TW' } });

  // 重新整理：還是中文。
  await page.reload();
  await expect(html).toHaveAttribute('lang', 'zh-TW');
  await expect(page.locator('.select-title')).toHaveText('選擇關卡');

  // 進關：HUD 也是中文。
  await madeCards(page).nth(0).click();
  await expect(html).toHaveAttribute('data-level', FIRST_LEVEL_ID);
  await expect(html).toHaveAttribute('lang', 'zh-TW');
  await expect(page.locator('#hud-level-select')).toHaveText('關卡選擇');

  // ?lang= 優先於存檔，而且只是這一次：不會改掉存檔。
  await page.goto('/?lang=en');
  await expect(html).toHaveAttribute('lang', 'en');
  expect((await readSave(page))?.settings.locale).toBe('zh-TW');
});
