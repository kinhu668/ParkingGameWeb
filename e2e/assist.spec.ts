// 倒車輔助層的 e2e：用真實鍵盤倒車，確認四個小畫面（左右後視鏡、鳥瞰、倒後鏡頭）出現、
// 警告文字與引導線都在；換回前進檔後收起；重來後檔位回到 D；`?assist=off`／`?fx=off` 不建立。
import type { Page } from '@playwright/test';
import { nextSnapshot } from './driving';
import { expect, OUTPUT_DIR, test } from './fixtures';

const VIEW_IDS = ['assist-bird', 'assist-rear', 'assist-mirror-left', 'assist-mirror-right'] as const;

/** 踩剎車到車完全停住；這一局必須還在進行（沒有撞到失敗）。 */
async function stop(page: Page): Promise<void> {
  await page.keyboard.down('Comma');
  await expect.poll(async () => (await nextSnapshot(page)).speedMph).toBe(0);
  await page.keyboard.up('Comma');
  expect((await nextSnapshot(page)).status).toBe('driving');
}

test('倒車時顯示輔助層，回到前進檔收起，重來後回到 D 檔', async ({ page }) => {
  await page.goto('/?level=w1_l05&view=chase_near&lang=zh-TW');
  const assist = page.locator('#reverse-assist');
  const gear = page.locator('#hud-gear');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(assist).toHaveAttribute('data-visible', 'false');
  await expect(assist).toBeHidden();

  // 按 S：掛倒檔 → 淡入到完全顯示。一掛上就放開並踩剎車：軟體算圖幀率低，一直倒下去會撞到東西；
  // 停著但仍掛倒檔，輔助層要留著。
  await page.keyboard.down('KeyS');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await page.keyboard.up('KeyS');
  await stop(page);
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await expect(assist).toHaveAttribute('data-visible', 'true');
  await expect(assist).toHaveCSS('opacity', '1');
  for (const id of VIEW_IDS) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  // 兩個上排畫面並排在上方，後視鏡在左右兩邊。
  const bird = await page.locator('#assist-bird').boundingBox();
  const rear = await page.locator('#assist-rear').boundingBox();
  const left = await page.locator('#assist-mirror-left').boundingBox();
  const right = await page.locator('#assist-mirror-right').boundingBox();
  expect(bird?.y).toBe(rear?.y);
  expect((bird?.x ?? 0) + (bird?.width ?? 0)).toBeLessThan(rear?.x ?? 0);
  expect((left?.x ?? 0) + (left?.width ?? 0)).toBeLessThan(bird?.x ?? 0);
  expect(right?.x ?? 0).toBeGreaterThan((rear?.x ?? 0) + (rear?.width ?? 0));

  // 倒後鏡頭：英文警告 + 中文那一行；綠／黃／紅距離帶與藍色虛線。鳥瞰：綠色軌跡。
  await expect(page.locator('#assist-warning')).toContainText('Check surroundings for safety.');
  await expect(page.locator('#assist-warning-local')).toHaveText('請注意周圍安全。');
  for (const color of ['green', 'yellow', 'red']) {
    await expect(page.locator(`#assist-rear .assist-guide[data-color="${color}"]`)).toHaveCount(2);
  }
  await expect(
    page.locator('#assist-rear .assist-guide[data-color="blue"][data-dashed="true"]'),
  ).toHaveCount(1);
  expect(
    await page.locator('#assist-bird .assist-guide[data-color="green"]').count(),
  ).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: `${OUTPUT_DIR}/assist-reverse-chase.png` });

  // 英文介面只留英文那一行。
  await page.locator('#hud-language').click();
  await expect(page.locator('#assist-warning-local')).toBeHidden();
  await expect(page.locator('#assist-warning [lang="en"]')).toHaveText(
    'Check surroundings for safety.',
  );
  await expect(page.locator('#assist-warning [lang="en"]')).toBeVisible();

  // 按 W：換成前進檔 → 收起。
  await page.keyboard.down('KeyW');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await page.keyboard.up('KeyW');
  await stop(page);
  await expect(assist).toHaveAttribute('data-visible', 'false');
  await expect(assist).toBeHidden();
  await page.screenshot({ path: `${OUTPUT_DIR}/assist-forward-hidden.png` });

  // 再掛倒檔後按 Backspace 重來：新的一局從 D 檔開始，輔助層收起。
  await page.keyboard.down('KeyS');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await page.keyboard.up('KeyS');
  await stop(page);
  await expect(assist).toHaveAttribute('data-visible', 'true');
  await page.keyboard.press('Backspace');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(assist).toHaveAttribute('data-visible', 'false');
});

for (const param of ['assist=off', 'fx=off']) {
  test(`?${param}：倒車也不建立輔助層`, async ({ page }) => {
    await page.goto(`/?level=w1_l05&view=chase_near&lang=zh-TW&${param}`);
    const gear = page.locator('#hud-gear');
    await expect(gear).toHaveAttribute('data-gear', 'forward');
    await page.keyboard.down('KeyS');
    await expect(gear).toHaveAttribute('data-gear', 'reverse');
    await expect(page.locator('#reverse-assist')).toHaveCount(0);
    await page.keyboard.up('KeyS');
  });
}
