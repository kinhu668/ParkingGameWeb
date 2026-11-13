// 天氣的 e2e：同一關、同一個鏡頭，六種 `?weather=` 的定格兩兩不同、同一種重拍逐位元組相同；
// `?weather=` 蓋過關卡 JSON，不認得的值當作沒給。
import type { Page } from '@playwright/test';
import { expect, OUTPUT_DIR, test } from './fixtures';

/** ?cam 畫完定格後在 <body> 設的旗標。 */
const SHOT_READY = 'body[data-shot-ready="true"]';
/** 六種天氣（與 src/core/weather.ts 的 WEATHER_IDS 相同）。 */
const WEATHERS = ['clear', 'dusk', 'rain', 'wet', 'storm', 'night'] as const;
/** 拿來比的關卡：JSON 裡的天氣是 wet（雨後）。 */
const LEVEL_SHOT = 'level=w1_l04&cam=spot_low&t=0';
const LEVEL_WEATHER = 'wet';

/** 開一個定格網址，等畫完，回傳截圖（base64）。fileName 有給就存檔。 */
async function captureShot(page: Page, url: string, fileName?: string): Promise<string> {
  await page.goto(url);
  await expect(page.locator(SHOT_READY)).toBeAttached();
  const png = await page.screenshot(
    fileName === undefined ? {} : { path: `${OUTPUT_DIR}/${fileName}` },
  );
  return png.toString('base64');
}

test('六種 ?weather= 的定格兩兩不同；同一種重拍逐位元組相同', async ({ page }) => {
  const shots = new Map<string, string>();
  for (const weather of WEATHERS) {
    const url = `/?${LEVEL_SHOT}&weather=${weather}`;
    const first = await captureShot(page, url, `weather-${weather}.png`);
    // 雨絲、落葉的位置只由種子與累積時間決定；定格的時間是 0，所以重拍一樣。
    const second = await captureShot(page, url);
    expect(second === first, `${weather}：兩次截圖必須完全相同`).toBe(true);
    shots.set(weather, first);
  }
  expect(new Set(shots.values()).size).toBe(WEATHERS.length);
});

test('?weather= 蓋過關卡 JSON；沒給或不認得的值用關卡自己的天氣', async ({ page }) => {
  const fromLevel = await captureShot(page, `/?${LEVEL_SHOT}`);
  const explicit = await captureShot(page, `/?${LEVEL_SHOT}&weather=${LEVEL_WEATHER}`);
  expect(explicit === fromLevel, '明講關卡自己的天氣，畫面相同').toBe(true);

  const unknown = await captureShot(page, `/?${LEVEL_SHOT}&weather=snow`);
  expect(unknown === fromLevel, '不認得的值當作沒給').toBe(true);

  const overridden = await captureShot(page, `/?${LEVEL_SHOT}&weather=night`);
  expect(overridden === fromLevel, '?weather=night 蓋過關卡的 wet').toBe(false);

  // 原型關的 JSON 是 dusk：明講 weather=dusk 與不講是同一張圖（基準畫面不變）。
  const prototype = await captureShot(page, '/?cam=top&t=2');
  const prototypeDusk = await captureShot(page, '/?cam=top&t=2&weather=dusk');
  expect(prototypeDusk === prototype).toBe(true);
});

test('雷雨的定格：t=0 沒有在閃，t=2 是第一道閃電（閃光＋電弧）而且可重現；?fx=off 與其他天氣沒有', async ({ page }) => {
  const html = page.locator('html');
  const storm = '/?level=w1_l07&cam=spot_low';
  await captureShot(page, `${storm}&t=0`);
  await expect(html).toHaveAttribute('data-lightning', 'none');

  const first = await captureShot(page, `${storm}&t=2`, 'weather-storm-arc-t2.png');
  await expect(html).toHaveAttribute('data-lightning', '0');
  const second = await captureShot(page, `${storm}&t=2`);
  expect(second === first, '同一道閃電重拍必須完全相同').toBe(true);

  // 閃光淡掉之後（一道閃電只有 0.7 秒）又是沒有在閃。
  await captureShot(page, `${storm}&t=3`);
  await expect(html).toHaveAttribute('data-lightning', 'none');

  // ?fx=off：不建立閃電，也沒有電弧。
  const calm = await captureShot(page, `${storm}&t=2&fx=off`);
  await expect(html).toHaveAttribute('data-lightning', 'none');
  expect(calm === first).toBe(false);

  // 不是雷雨的天氣沒有閃電。
  await captureShot(page, `${storm}&t=2&weather=rain`);
  await expect(html).toHaveAttribute('data-lightning', 'none');
});
