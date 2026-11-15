// 天氣的 e2e：同一關、同一個鏡頭，六種 `?weather=` 的定格兩兩不同、同一種重拍逐位元組相同；
// `?weather=` 蓋過關卡 JSON，不認得的值當作沒給。
// 濕地／積水的倒影：有積水的天氣 medium 以上是平面反射（<html data-ground-mirror="planar">），low 與乾的天氣沒有；
// 軟體算圖（與手機）自動選到的級別不多畫倒影那一遍（只映天空，data-ground-mirror="sky"）。
import type { Page } from '@playwright/test';
import {
  canvasStats,
  expect,
  MAX_DOMINANT_FRACTION,
  MIN_DISTINCT_COLORS,
  OUTPUT_DIR,
  test,
} from './fixtures';

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

/** 看得到一大片地面與停著的車的定格：大賣場關（JSON 是晴天），鏡頭在車位旁的低角度。 */
const MIRROR_SHOT = 'level=w1_l03&cam=spot_low&t=0';

test('濕地的倒影：有積水的天氣 medium 以上是平面反射（軟體算圖自動選到的只映天空）；low 與乾的天氣沒有', async ({ page }) => {
  const html = page.locator('html');
  for (const weather of ['rain', 'storm', 'wet']) {
    // 沒有 ?quality=：軟體算圖自動選 medium，而且不多畫倒影那一遍，積水只映天空。
    const sky = await captureShot(page, `/?${MIRROR_SHOT}&weather=${weather}`, `mirror-${weather}-auto.png`);
    await expect(html).toHaveAttribute('data-quality-source', 'auto');
    await expect(html).toHaveAttribute('data-ground-mirror', 'sky');
    // 明確指定的級別照表給：多畫一遍鏡像的場景，畫面上多了車、燈與建築的倒影。
    const url = `/?${MIRROR_SHOT}&weather=${weather}&quality=medium`;
    const planar = await captureShot(page, url, `mirror-${weather}-medium.png`);
    await expect(html).toHaveAttribute('data-ground-mirror', 'planar');
    expect(planar === sky, `${weather}：平面反射的畫面應該與只映天空的不同`).toBe(false);
    // 倒影貼圖隔幀重畫、陰影貼圖沿用主畫面的：定格重拍仍然逐位元組相同。
    const again = await captureShot(page, url);
    expect(again === planar, `${weather}：平面反射的定格重拍必須完全相同`).toBe(true);
  }
  for (const weather of ['clear', 'dusk', 'night']) {
    await captureShot(page, `/?${MIRROR_SHOT}&weather=${weather}&quality=medium`);
    await expect(html).toHaveAttribute('data-ground-mirror', 'none');
  }
  // low 沒有潮濕著色器：雨天也沒有倒影。
  await captureShot(page, `/?${MIRROR_SHOT}&weather=rain&quality=low`);
  await expect(html).toHaveAttribute('data-ground-mirror', 'none');
});

test('平面反射的一般遊戲（雨天的巷子關）：每幀先畫倒影再畫主畫面，掛倒車檔叫出小畫面也沒有錯誤', async ({ page }) => {
  await page.goto('/?level=w1_l10&quality=medium&lang=zh-TW');
  await expect(page.locator('#hud-camera')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-ground-mirror', 'planar');
  // 倒車輔助層的小畫面用別的鏡頭畫同一個場景（地面退回只映天空）。
  await page.keyboard.press('Space');
  await expect(page.locator('#reverse-assist')).toBeVisible();
  const stats = await canvasStats(page);
  expect(stats.distinctColors).toBeGreaterThanOrEqual(MIN_DISTINCT_COLORS);
  expect(stats.dominantFraction).toBeLessThan(MAX_DOMINANT_FRACTION);
});
