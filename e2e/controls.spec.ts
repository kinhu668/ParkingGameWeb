// 自訂按鍵的 e2e：HUD 操作說明顯示目前綁定、按鍵設定面板（中英文、重綁、同一鍵不能綁兩個動作、
// 多加／拿掉備用鍵、恢復預設）、存檔（parkinggame.controls.v1；壞檔丟掉回到預設；舊存檔裡已移除的動作不留）、
// 掛 D／R 檔（手排：D 只能向前、R 只能向後）、逗號腳剎、Backspace／T 重來。
import type { Page } from '@playwright/test';
import { nextSnapshot } from './driving';
import { expect, OUTPUT_DIR, test } from './fixtures';

const CONTROLS_KEY = 'parkinggame.controls.v1';
/** 位置比對的容許誤差（ft）。 */
const POSITION_TOLERANCE_FT = 0.01;

/** HUD 操作說明裡某個動作的鍵帽文字。 */
async function hudKeys(page: Page, action: string): Promise<string[]> {
  return page.locator(`.hud-controls .hud-key[data-action="${action}"]`).allTextContents();
}

/** localStorage 裡的按鍵存檔（原始字串）；沒有是 null。 */
async function storedControls(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), CONTROLS_KEY);
}

/** 點某個動作的第 slot 格，再按一個鍵。 */
async function bind(page: Page, action: string, slot: number, code: string): Promise<void> {
  const button = page.locator(`#bind-${action}-${slot}`);
  await button.click();
  await expect(button).toHaveAttribute('data-listening', 'true');
  await page.keyboard.press(code);
  await expect(button).toHaveAttribute('data-listening', 'false');
}

/** 按住一個鍵直到車的狀態符合條件，然後放開；回傳符合時的狀態。 */
async function holdUntil(
  page: Page,
  code: string,
  done: (snapshot: Awaited<ReturnType<typeof nextSnapshot>>) => boolean,
): Promise<Awaited<ReturnType<typeof nextSnapshot>>> {
  await page.keyboard.down(code);
  try {
    let snapshot = await nextSnapshot(page);
    const deadlineMs = Date.now() + 30_000;
    while (!done(snapshot)) {
      if (Date.now() > deadlineMs) {
        throw new Error(`按住 ${code} 等不到要的狀態：${JSON.stringify(snapshot)}`);
      }
      snapshot = await nextSnapshot(page);
    }
    return snapshot;
  } finally {
    await page.keyboard.up(code);
  }
}

test('HUD 顯示預設綁定；按鍵設定可重綁、擋同一鍵、存檔、恢復預設（中英文）', async ({ page }) => {
  // touch=off：左下角的鍵盤操作說明（與它的「自訂按鍵」按鈕）只在螢幕操作層收起來時顯示。
  await page.goto('/?level=w1_l01&lang=zh-TW&touch=off');
  const panel = page.locator('#controls-panel');
  const pause = page.locator('#hud-pause');
  const message = page.locator('#controls-message');
  await expect(page.locator('#hud-speed')).toHaveText('0.0');
  await expect(panel).toBeHidden();

  // 操作說明列的是預設綁定：重來是 Backspace／T（不是 R），剎車是逗號，掛檔是 Q／R；空白鍵與 / 沒有動作，不列。
  expect(await hudKeys(page, 'throttle')).toEqual(['W']);
  expect(await hudKeys(page, 'reverse')).toEqual(['S']);
  expect(await hudKeys(page, 'steerLeft')).toEqual(['A']);
  expect(await hudKeys(page, 'steerRight')).toEqual(['D']);
  expect(await hudKeys(page, 'brake')).toEqual([',']);
  expect(await hudKeys(page, 'gearDrive')).toEqual(['Q']);
  expect(await hudKeys(page, 'gearReverse')).toEqual(['R']);
  expect(await hudKeys(page, 'restart')).toEqual(['Backspace', 'T']);
  expect(await hudKeys(page, 'toggleCamera')).toEqual(['V']);
  expect(await hudKeys(page, 'pause')).toEqual(['Esc']);
  expect(await page.locator('.hud-controls .hud-key').allTextContents()).toEqual([
    'W',
    'S',
    'A',
    'D',
    ',',
    'Q',
    'R',
    'Backspace',
    'T',
    'V',
    'Esc',
  ]);
  expect(await storedControls(page)).toBeNull();

  // 從操作說明進入設定：遊戲先暫停，設定面板蓋住暫停面板。
  await page.locator('#hud-controls-edit').click();
  await expect(panel).toBeVisible();
  await expect(pause).toBeHidden();
  await expect(panel.locator('.controls-title')).toHaveText('按鍵設定');
  await expect(panel.locator('.controls-row')).toHaveCount(10);
  await expect(panel.locator('.controls-row[data-action="brake"] .controls-action')).toHaveText(
    '剎車',
  );
  await expect(panel.locator('.controls-row[data-action="gearReverse"] .controls-action')).toHaveText(
    '掛 R 檔',
  );
  await expect(panel.locator('.controls-note')).toContainText('可以自行改綁');
  await expect(page.locator('#bind-restart-0')).toHaveText('Backspace');
  await expect(page.locator('#bind-restart-1')).toHaveText('T');
  await page.screenshot({ path: `${OUTPUT_DIR}/controls-settings-zh-TW.png` });

  // 同一個鍵不能綁兩個動作：重來想用 R，但 R 是掛 R 檔 → 擋下來並說明，綁定與存檔都沒變。
  await page.locator('#bind-restart-0').click();
  await expect(page.locator('#bind-restart-0')).toHaveText('請按鍵…');
  await page.keyboard.press('KeyR');
  await expect(message).toHaveAttribute('data-kind', 'warning');
  await expect(message).toContainText('掛 R 檔');
  await expect(page.locator('#bind-restart-0')).toHaveText('Backspace');
  expect(await storedControls(page)).toBeNull();
  // 等按鍵時按下去的鍵不是遊戲輸入：沒有重來、沒有掛檔，這一局還沒開始。
  await expect(page.locator('#hud-gear')).toHaveAttribute('data-mode', 'auto');
  await page.screenshot({ path: `${OUTPUT_DIR}/controls-conflict-zh-TW.png` });

  // 先把掛 R 檔改成 E，R 就能給重來了。HUD 的操作說明跟著變。
  await bind(page, 'gearReverse', 0, 'KeyE');
  await expect(page.locator('#bind-gearReverse-0')).toHaveText('E');
  await expect(message).toHaveAttribute('data-kind', 'info');
  await bind(page, 'restart', 0, 'KeyR');
  await expect(page.locator('#bind-restart-0')).toHaveText('R');
  expect(await hudKeys(page, 'restart')).toEqual(['R', 'T']);
  expect(await hudKeys(page, 'gearReverse')).toEqual(['E']);

  // 多加一個備用鍵（剎車加上句點），再拿掉。
  await expect(page.locator('#bind-brake-clear')).toBeHidden();
  await bind(page, 'brake', 1, 'Period');
  await expect(page.locator('#bind-brake-1')).toHaveText('.');
  expect(await hudKeys(page, 'brake')).toEqual([',', '.']);
  await page.locator('#bind-brake-clear').click();
  await expect(page.locator('#bind-brake-1')).toHaveText('＋');
  expect(await hudKeys(page, 'brake')).toEqual([',']);

  // 空白鍵預設沒有動作，可以直接拿來綁（這裡當剎車的備用鍵）；鍵帽寫的是翻譯過的名字。
  await bind(page, 'brake', 1, 'Space');
  await expect(message).toHaveAttribute('data-kind', 'info');
  await expect(page.locator('#bind-brake-1')).toHaveText('空白鍵');
  expect(await hudKeys(page, 'brake')).toEqual([',', '空白鍵']);

  // 等按鍵時按 Esc 是取消：綁定不變，面板也還開著。
  await page.locator('#bind-toggleCamera-0').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#bind-toggleCamera-0')).toHaveText('V');
  await expect(panel).toBeVisible();

  // 存檔：parkinggame.controls.v1，用的是 KeyboardEvent.code。
  const saved = JSON.parse((await storedControls(page)) ?? 'null') as {
    version: number;
    bindings: Record<string, string[]>;
  };
  expect(saved.version).toBe(1);
  expect(saved.bindings.restart).toEqual(['KeyR', 'KeyT']);
  expect(saved.bindings.gearReverse).toEqual(['KeyE']);
  expect(saved.bindings.brake).toEqual(['Comma', 'Space']);
  expect(Object.keys(saved.bindings)).toHaveLength(10);

  // 英文介面：同一個面板就地換成英文。
  await page.locator('#hud-language').click();
  await expect(panel.locator('.controls-title')).toHaveText('Key Bindings');
  await expect(panel.locator('.controls-row[data-action="brake"] .controls-action')).toHaveText(
    'Brake',
  );
  await expect(panel.locator('.controls-row[data-action="gearDrive"] .controls-action')).toHaveText(
    'Shift to D',
  );
  await expect(page.locator('#bind-brake-1')).toHaveText('Space');
  await expect(page.locator('#controls-reset')).toHaveText('Restore defaults');
  await expect(panel.locator('.controls-note')).toContainText('rebind it if you like');
  await page.locator('#bind-gearDrive-0').click();
  await page.keyboard.press('KeyD');
  await expect(message).toContainText('"Steer right"');
  await expect(page.locator('#bind-gearDrive-0')).toHaveText('Q');
  await page.screenshot({ path: `${OUTPUT_DIR}/controls-settings-en.png` });

  // 完成 → 回到暫停面板；按 Esc 繼續。提示寫的是目前的暫停鍵。
  await page.locator('#controls-done').click();
  await expect(panel).toBeHidden();
  await expect(pause).toBeVisible();
  await expect(pause.locator('.hud-status-hint')).toHaveText('Press Esc to resume');
  await page.keyboard.press('Escape');
  await expect(pause).toBeHidden();

  // 新的綁定立刻生效：開一小段後按 R 是重來（不是掛檔），E 才是掛 R 檔。
  const moved = await holdUntil(page, 'KeyW', (snapshot) => snapshot.zFt < -1);
  expect(moved.status).toBe('driving');
  await page.keyboard.press('KeyR');
  await expect.poll(async () => (await nextSnapshot(page)).status).toBe('ready');
  expect(Math.abs((await nextSnapshot(page)).zFt)).toBeLessThan(POSITION_TOLERANCE_FT);
  await expect(page.locator('#hud-gear')).toHaveAttribute('data-mode', 'auto');
  await page.keyboard.press('KeyE');
  await expect(page.locator('#hud-gear')).toHaveAttribute('data-gear', 'reverse');
  await expect(page.locator('#hud-gear')).toHaveAttribute('data-mode', 'manual');

  // 重新整理：綁定還在。
  await page.reload();
  await expect(page.locator('#hud-speed')).toHaveText('0.0');
  expect(await hudKeys(page, 'restart')).toEqual(['R', 'T']);
  expect(await hudKeys(page, 'gearReverse')).toEqual(['E']);

  // 從暫停面板進入設定 → 恢復預設：鍵位回到預設，存檔清掉。
  await page.keyboard.press('Escape');
  await expect(pause).toBeVisible();
  await page.locator('#pause-controls').click();
  await expect(panel).toBeVisible();
  await expect(pause).toBeHidden();
  await expect(page.locator('#bind-restart-0')).toHaveText('R');
  await page.locator('#controls-reset').click();
  await expect(message).toHaveAttribute('data-kind', 'info');
  await expect(page.locator('#bind-restart-0')).toHaveText('Backspace');
  await expect(page.locator('#bind-gearReverse-0')).toHaveText('R');
  expect(await hudKeys(page, 'restart')).toEqual(['Backspace', 'T']);
  expect(await storedControls(page)).toBeNull();

  // 設定開著時按暫停鍵：只收起設定，回到暫停面板。
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(pause).toBeVisible();
});

for (const [name, text] of [
  ['不是 JSON', '{oops'],
  [
    '同一個鍵綁了兩個動作',
    JSON.stringify({
      version: 1,
      bindings: {
        throttle: ['KeyW'],
        reverse: ['KeyS'],
        steerLeft: ['KeyA'],
        steerRight: ['KeyD'],
        brake: ['Comma'],
        gearDrive: ['KeyQ'],
        gearReverse: ['KeyR'],
        restart: ['KeyR'],
        toggleCamera: ['KeyV'],
        pause: ['Escape'],
      },
    }),
  ],
] as const) {
  test(`壞掉的按鍵存檔（${name}）：丟棄並回到預設`, async ({ page }) => {
    await page.goto('/?level=w1_l01&lang=zh-TW');
    await expect(page.locator('#hud-speed')).toHaveText('0.0');
    await page.evaluate(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      { key: CONTROLS_KEY, value: text },
    );
    await page.reload();
    await expect(page.locator('#hud-speed')).toHaveText('0.0');

    expect(await hudKeys(page, 'restart')).toEqual(['Backspace', 'T']);
    expect(await hudKeys(page, 'gearReverse')).toEqual(['R']);
    expect(await hudKeys(page, 'brake')).toEqual([',']);
    expect(await storedControls(page)).toBeNull();
  });
}

test('舊存檔還帶著已移除的 handbrake：照常讀進來，那一項不留，空出來的鍵可以重綁', async ({ page }) => {
  // 舊版存的內容：重來改成 R／T、掛 R 檔改成 E，另外還有一項 handbrake 佔著 / 與空白鍵。
  const legacy = JSON.stringify({
    version: 1,
    bindings: {
      throttle: ['KeyW', 'ArrowUp'],
      reverse: ['KeyS', 'ArrowDown'],
      steerLeft: ['KeyA', 'ArrowLeft'],
      steerRight: ['KeyD', 'ArrowRight'],
      brake: ['Comma'],
      handbrake: ['Slash', 'Space'],
      gearDrive: ['KeyQ'],
      gearReverse: ['KeyE'],
      restart: ['KeyR', 'KeyT'],
      toggleCamera: ['KeyV'],
      pause: ['Escape'],
    },
  });
  await page.goto('/?level=w1_l01&lang=zh-TW&touch=off');
  await expect(page.locator('#hud-speed')).toHaveText('0.0');
  await page.evaluate(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: CONTROLS_KEY, value: legacy },
  );
  await page.reload();
  await expect(page.locator('#hud-speed')).toHaveText('0.0');

  // 不算壞檔：改過的鍵都還在，存檔沒有被刪掉；操作說明裡沒有 / 與空白鍵。
  expect(await hudKeys(page, 'restart')).toEqual(['R', 'T']);
  expect(await hudKeys(page, 'gearReverse')).toEqual(['E']);
  expect(await hudKeys(page, 'brake')).toEqual([',']);
  const hudTexts = await page.locator('.hud-controls .hud-key').allTextContents();
  expect(hudTexts).not.toContain('/');
  expect(hudTexts).not.toContain('空白鍵');
  expect(await storedControls(page)).toBe(legacy);

  // 按鍵設定裡沒有那一列；它原本佔的空白鍵可以綁給剎車。
  await page.locator('#hud-controls-edit').click();
  const panel = page.locator('#controls-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.controls-row')).toHaveCount(10);
  await expect(panel.locator('.controls-row[data-action="handbrake"]')).toHaveCount(0);
  await bind(page, 'brake', 1, 'Space');
  await expect(page.locator('#controls-message')).toHaveAttribute('data-kind', 'info');
  await expect(page.locator('#bind-brake-1')).toHaveText('空白鍵');

  // 這一次存檔寫回去的內容不再有 handbrake，其他鍵照舊。
  const saved = JSON.parse((await storedControls(page)) ?? 'null') as {
    version: number;
    bindings: Record<string, string[]>;
  };
  expect(saved.bindings).not.toHaveProperty('handbrake');
  expect(saved.bindings.brake).toEqual(['Comma', 'Space']);
  expect(saved.bindings.restart).toEqual(['KeyR', 'KeyT']);
  expect(saved.bindings.gearReverse).toEqual(['KeyE']);

  // 新綁的空白鍵真的是剎車：開起來之後按住它會停住。
  await page.locator('#controls-done').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#hud-pause')).toBeHidden();
  const moving = await holdUntil(page, 'KeyW', (snapshot) => snapshot.speedMph > 3);
  expect(moving.status).toBe('driving');
  const stopped = await holdUntil(page, 'Space', (snapshot) => snapshot.speedMph === 0);
  expect(stopped.status).toBe('driving');
});

test('掛 R／D 檔進入手排、逗號腳剎、Backspace 重來後回到自排 D 檔', async ({ page }) => {
  await page.goto('/?level=w1_l05&view=chase_near&lang=zh-TW');
  const gear = page.locator('#hud-gear');
  const assist = page.locator('#reverse-assist');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(gear).toHaveAttribute('data-mode', 'auto');
  await expect(assist).toHaveAttribute('data-visible', 'false');
  const start = await nextSnapshot(page);

  // 按 R：掛倒檔。車還沒動、計時也還沒開始，但 HUD 是 R、手排，倒車輔助層出現。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await expect(gear).toHaveAttribute('data-mode', 'manual');
  await expect(gear).toHaveText('R 倒車');
  await expect(assist).toHaveAttribute('data-visible', 'true');
  await expect(assist).toHaveCSS('opacity', '1');
  const shifted = await nextSnapshot(page);
  expect(shifted.status).toBe('ready');
  expect(shifted.zFt).toBe(start.zFt);
  await page.screenshot({ path: `${OUTPUT_DIR}/controls-gear-r-assist.png` });

  // R 檔只能向後：按油門（W）車不會往前，位置不變。
  await page.keyboard.down('KeyW');
  for (let frame = 0; frame < 6; frame += 1) {
    const snapshot = await nextSnapshot(page);
    expect(snapshot.speedMph).toBe(0);
    expect(snapshot.zFt).toBe(start.zFt);
  }
  await page.keyboard.up('KeyW');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');

  // 按倒車油門（S）才會後退。一退起來就放開，用逗號（腳剎）停住；這一局還在進行。
  const reversing = await holdUntil(page, 'KeyS', (snapshot) => snapshot.speedMph < -1);
  expect(reversing.zFt).toBeGreaterThan(start.zFt);
  const braked = await holdUntil(page, 'Comma', (snapshot) => snapshot.speedMph === 0);
  expect(braked.status).toBe('driving');
  expect(braked.zFt).toBeGreaterThan(start.zFt);
  await page.keyboard.down('Comma');
  await nextSnapshot(page);
  await page.screenshot({ path: `${OUTPUT_DIR}/controls-brake-comma.png` });
  await page.keyboard.up('Comma');
  // 停著仍是 R 檔，輔助層留著。
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await expect(assist).toHaveAttribute('data-visible', 'true');

  // 按 Q：掛 D 檔。輔助層收起；D 檔只能向前：按倒車油門（S）車不會後退。
  await page.keyboard.press('KeyQ');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(gear).toHaveAttribute('data-mode', 'manual');
  await expect(assist).toHaveAttribute('data-visible', 'false');
  await page.keyboard.down('KeyS');
  for (let frame = 0; frame < 6; frame += 1) {
    const snapshot = await nextSnapshot(page);
    expect(snapshot.speedMph).toBe(0);
    expect(snapshot.zFt).toBe(braked.zFt);
  }
  await page.keyboard.up('KeyS');
  await expect(gear).toHaveAttribute('data-gear', 'forward');

  // 油門（W）往前；逗號剎停。
  const forward = await holdUntil(page, 'KeyW', (snapshot) => snapshot.speedMph > 1);
  expect(forward.zFt).toBeLessThan(braked.zFt);
  const stopped = await holdUntil(page, 'Comma', (snapshot) => snapshot.speedMph === 0);
  expect(stopped.status).toBe('driving');

  // 掛回 R 再按 Backspace 重來：車回起點，檔位回到自排 D 檔，輔助層收起。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await page.keyboard.press('Backspace');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(gear).toHaveAttribute('data-mode', 'auto');
  await expect(assist).toHaveAttribute('data-visible', 'false');
  const restarted = await nextSnapshot(page);
  expect(restarted.status).toBe('ready');
  expect(Math.abs(restarted.zFt - start.zFt)).toBeLessThan(POSITION_TOLERANCE_FT);
  await page.screenshot({ path: `${OUTPUT_DIR}/controls-restart-backspace.png` });

  // 回到自排：沒按掛檔鍵時 S 照舊直接倒車、檔位由車速推導。
  await page.keyboard.down('KeyS');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await page.keyboard.up('KeyS');
  await expect(gear).toHaveAttribute('data-mode', 'auto');
  const end = await holdUntil(page, 'Comma', (snapshot) => snapshot.speedMph === 0);
  expect(end.status).toBe('driving');
});

test('重來一律回到自排 D 檔：按著轉向或油門重來、T、暫停面板的重來按鈕', async ({ page }) => {
  await page.goto('/?level=w1_l05&view=chase_near&lang=zh-TW');
  const gear = page.locator('#hud-gear');
  const assist = page.locator('#reverse-assist');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  const start = await nextSnapshot(page);

  /** 接下來幾幀都還是自排 D 檔、輔助層收著（重設過的檔位不會被仍按著的鍵變回 R）。 */
  async function staysInDrive(): Promise<void> {
    for (let frame = 0; frame < 8; frame += 1) {
      await nextSnapshot(page);
      expect(await gear.getAttribute('data-gear')).toBe('forward');
      expect(await gear.getAttribute('data-mode')).toBe('auto');
      expect(await assist.getAttribute('data-visible')).toBe('false');
    }
  }

  // 手排 R、按著左轉不放時按 Backspace：回到自排 D，輔助層收起；左轉仍按著也不會變回 R。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await expect(gear).toHaveAttribute('data-mode', 'manual');
  await expect(assist).toHaveAttribute('data-visible', 'true');
  await page.keyboard.down('KeyA');
  await nextSnapshot(page);
  await page.keyboard.press('Backspace');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(gear).toHaveAttribute('data-mode', 'auto');
  await expect(assist).toHaveAttribute('data-visible', 'false');
  await staysInDrive();
  await page.keyboard.up('KeyA');

  // 自排倒車（按 S）後停住，檔位留在 R；按著右轉不放時按 T（備用的重來鍵）：同樣回到 D。
  const reversing = await holdUntil(page, 'KeyS', (snapshot) => snapshot.speedMph < -0.5);
  expect(reversing.status).toBe('driving');
  const stopped = await holdUntil(page, 'Comma', (snapshot) => snapshot.speedMph === 0);
  expect(stopped.status).toBe('driving');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await expect(gear).toHaveAttribute('data-mode', 'auto');
  await expect(assist).toHaveAttribute('data-visible', 'true');
  await page.keyboard.down('KeyD');
  await nextSnapshot(page);
  await page.keyboard.press('KeyT');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(assist).toHaveAttribute('data-visible', 'false');
  await staysInDrive();
  await page.keyboard.up('KeyD');
  expect(Math.abs((await nextSnapshot(page)).zFt - start.zFt)).toBeLessThan(POSITION_TOLERANCE_FT);

  // 手排 R、按著油門（R 檔下只是腳剎，車不動）時重來：回到自排，仍按著的油門讓車往前走，檔位是 D。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-mode', 'manual');
  await page.keyboard.down('KeyW');
  await nextSnapshot(page);
  expect((await nextSnapshot(page)).speedMph).toBe(0);
  await page.keyboard.press('Backspace');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(gear).toHaveAttribute('data-mode', 'auto');
  await expect.poll(async () => (await nextSnapshot(page)).speedMph).toBeGreaterThan(0.5);
  expect(await gear.getAttribute('data-gear')).toBe('forward');
  await page.keyboard.up('KeyW');
  const rolled = await holdUntil(page, 'Comma', (snapshot) => snapshot.speedMph === 0);
  expect(rolled.status).toBe('driving');
  expect(rolled.zFt).toBeLessThan(start.zFt);
  await staysInDrive();

  // 手排 R → 暫停 → 面板上的「重來」按鈕：解除暫停、車回起點、自排 D、輔助層收起。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await expect(assist).toHaveAttribute('data-visible', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#hud-pause')).toBeVisible();
  await page.locator('#pause-retry').click();
  await expect(page.locator('#hud-pause')).toBeHidden();
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(gear).toHaveAttribute('data-mode', 'auto');
  await expect(assist).toHaveAttribute('data-visible', 'false');
  await staysInDrive();
  const restarted = await nextSnapshot(page);
  expect(restarted.status).toBe('ready');
  expect(Math.abs(restarted.zFt - start.zFt)).toBeLessThan(POSITION_TOLERANCE_FT);

  // 重來之後再按一次掛 R：這才會是 R 檔（玩家新下的指令）。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await expect(gear).toHaveAttribute('data-mode', 'manual');
  await expect(assist).toHaveAttribute('data-visible', 'true');
});
