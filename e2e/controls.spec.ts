// 自訂按鍵的 e2e：HUD 操作說明顯示目前綁定、按鍵設定面板（中英文、重綁、同一鍵不能綁兩個動作、
// 多加／拿掉備用鍵（最多三個鍵）、恢復預設）、存檔（parkinggame.controls.v1；壞檔丟掉回到預設；舊存檔遷移）、
// 一個鍵切換 D／R 檔（油門往目前檔位的方向推，R 檔按油門是倒車、不是剎車）、S／↓／逗號剎車、Backspace／T 重來。
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

test('HUD 顯示預設綁定；按鍵設定可重綁、擋同一鍵、三個鍵、存檔、恢復預設（中英文）', async ({ page }) => {
  // touch=off：左下角的鍵盤操作說明（與它的「自訂按鍵」按鈕）只在螢幕操作層收起來時顯示。
  await page.goto('/?level=w1_l01&lang=zh-TW&touch=off');
  const panel = page.locator('#controls-panel');
  const pause = page.locator('#hud-pause');
  const message = page.locator('#controls-message');
  const gear = page.locator('#hud-gear');
  await expect(page.locator('#hud-speed')).toHaveText('0.0');
  await expect(panel).toBeHidden();

  // 操作說明列的是預設綁定：油門 W／↑，剎車 S／↓／逗號，切換檔位 R，重來是 Backspace／T（不是 R）；
  // Q、空白鍵與 / 沒有動作，不列。沒有「倒車」鍵，也沒有分開的掛 D、掛 R。
  expect(await hudKeys(page, 'throttle')).toEqual(['W', '↑']);
  expect(await hudKeys(page, 'steerLeft')).toEqual(['A']);
  expect(await hudKeys(page, 'steerRight')).toEqual(['D']);
  expect(await hudKeys(page, 'brake')).toEqual(['S', '↓', ',']);
  expect(await hudKeys(page, 'gearToggle')).toEqual(['R']);
  expect(await hudKeys(page, 'restart')).toEqual(['Backspace', 'T']);
  expect(await hudKeys(page, 'toggleCamera')).toEqual(['V']);
  expect(await hudKeys(page, 'pause')).toEqual(['Esc']);
  expect(await page.locator('.hud-controls .hud-key').allTextContents()).toEqual([
    'W',
    '↑',
    'A',
    'D',
    'S',
    '↓',
    ',',
    'R',
    'Backspace',
    'T',
    'V',
    'Esc',
  ]);
  for (const removed of ['reverse', 'gearDrive', 'gearReverse']) {
    expect(await hudKeys(page, removed)).toEqual([]);
  }
  expect(await page.locator('.hud-controls .hud-controls-action').allTextContents()).toEqual([
    '油門',
    '轉向',
    '剎車',
    '切換 D／R 檔',
    '重來',
    '切換鏡頭',
    '暫停',
  ]);
  expect(await storedControls(page)).toBeNull();

  // 從操作說明進入設定：遊戲先暫停，設定面板蓋住暫停面板。
  await page.locator('#hud-controls-edit').click();
  await expect(panel).toBeVisible();
  await expect(pause).toBeHidden();
  await expect(panel.locator('.controls-title')).toHaveText('按鍵設定');
  await expect(panel.locator('.controls-row')).toHaveCount(8);
  await expect(panel.locator('.controls-row[data-action="brake"] .controls-action')).toHaveText(
    '剎車',
  );
  await expect(panel.locator('.controls-row[data-action="gearToggle"] .controls-action')).toHaveText(
    '切換 D／R 檔',
  );
  for (const removed of ['reverse', 'gearDrive', 'gearReverse']) {
    await expect(panel.locator(`.controls-row[data-action="${removed}"]`)).toHaveCount(0);
  }
  await expect(panel.locator('.controls-note')).toContainText('不會變成剎車');
  await expect(page.locator('#bind-restart-0')).toHaveText('Backspace');
  await expect(page.locator('#bind-restart-1')).toHaveText('T');
  // 剎車有三個鍵；重來有兩個鍵，第三格是「＋」；切換檔位只有一個鍵，第二格是「＋」、第三格先不顯示。
  await expect(page.locator('#bind-brake-0')).toHaveText('S');
  await expect(page.locator('#bind-brake-1')).toHaveText('↓');
  await expect(page.locator('#bind-brake-2')).toHaveText(',');
  await expect(page.locator('#bind-restart-2')).toHaveText('＋');
  await expect(page.locator('#bind-gearToggle-0')).toHaveText('R');
  await expect(page.locator('#bind-gearToggle-1')).toHaveText('＋');
  await expect(page.locator('#bind-gearToggle-2')).toBeHidden();
  await page.screenshot({ path: `${OUTPUT_DIR}/controls-settings-zh-TW.png` });

  // 同一個鍵不能綁兩個動作：重來想用 R，但 R 是切換檔位 → 擋下來並說明，綁定與存檔都沒變。
  await page.locator('#bind-restart-0').click();
  await expect(page.locator('#bind-restart-0')).toHaveText('請按鍵…');
  await page.keyboard.press('KeyR');
  await expect(message).toHaveAttribute('data-kind', 'warning');
  await expect(message).toContainText('切換 D／R 檔');
  await expect(page.locator('#bind-restart-0')).toHaveText('Backspace');
  expect(await storedControls(page)).toBeNull();
  // 等按鍵時按下去的鍵不是遊戲輸入：沒有重來、沒有換檔，這一局還沒開始。
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await page.screenshot({ path: `${OUTPUT_DIR}/controls-conflict-zh-TW.png` });

  // 先把切換檔位改成 E，R 就能給重來了。HUD 的操作說明跟著變。
  await bind(page, 'gearToggle', 0, 'KeyE');
  await expect(page.locator('#bind-gearToggle-0')).toHaveText('E');
  await expect(message).toHaveAttribute('data-kind', 'info');
  await bind(page, 'restart', 0, 'KeyR');
  await expect(page.locator('#bind-restart-0')).toHaveText('R');
  expect(await hudKeys(page, 'restart')).toEqual(['R', 'T']);
  expect(await hudKeys(page, 'gearToggle')).toEqual(['E']);

  // 多加備用鍵到三個（切換檔位加上句點與 Q），再一個一個拿掉。
  await expect(page.locator('#bind-gearToggle-clear')).toBeHidden();
  await bind(page, 'gearToggle', 1, 'Period');
  await expect(page.locator('#bind-gearToggle-1')).toHaveText('.');
  await expect(page.locator('#bind-gearToggle-2')).toHaveText('＋');
  await bind(page, 'gearToggle', 2, 'KeyQ');
  await expect(page.locator('#bind-gearToggle-2')).toHaveText('Q');
  expect(await hudKeys(page, 'gearToggle')).toEqual(['E', '.', 'Q']);
  await page.locator('#bind-gearToggle-clear').click();
  await expect(page.locator('#bind-gearToggle-2')).toHaveText('＋');
  expect(await hudKeys(page, 'gearToggle')).toEqual(['E', '.']);
  await page.locator('#bind-gearToggle-clear').click();
  await expect(page.locator('#bind-gearToggle-1')).toHaveText('＋');
  await expect(page.locator('#bind-gearToggle-2')).toBeHidden();
  await expect(page.locator('#bind-gearToggle-clear')).toBeHidden();
  expect(await hudKeys(page, 'gearToggle')).toEqual(['E']);

  // 空白鍵預設沒有動作，可以直接拿來綁（這裡換掉剎車的第三個鍵）；鍵帽寫的是翻譯過的名字。
  await bind(page, 'brake', 2, 'Space');
  await expect(message).toHaveAttribute('data-kind', 'info');
  await expect(page.locator('#bind-brake-2')).toHaveText('空白鍵');
  expect(await hudKeys(page, 'brake')).toEqual(['S', '↓', '空白鍵']);

  // 等按鍵時按 Esc 是取消：綁定不變，面板也還開著。
  await page.locator('#bind-toggleCamera-0').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#bind-toggleCamera-0')).toHaveText('V');
  await expect(panel).toBeVisible();

  // 存檔：parkinggame.controls.v1，用的是 KeyboardEvent.code；只有現在的八個動作。
  const saved = JSON.parse((await storedControls(page)) ?? 'null') as {
    version: number;
    bindings: Record<string, string[]>;
  };
  expect(saved.version).toBe(1);
  expect(saved.bindings.restart).toEqual(['KeyR', 'KeyT']);
  expect(saved.bindings.gearToggle).toEqual(['KeyE']);
  expect(saved.bindings.brake).toEqual(['KeyS', 'ArrowDown', 'Space']);
  expect(Object.keys(saved.bindings).sort()).toEqual(
    ['brake', 'gearToggle', 'pause', 'restart', 'steerLeft', 'steerRight', 'throttle', 'toggleCamera'],
  );

  // 英文介面：同一個面板就地換成英文。
  await page.locator('#hud-language').click();
  await expect(panel.locator('.controls-title')).toHaveText('Key Bindings');
  await expect(panel.locator('.controls-row[data-action="brake"] .controls-action')).toHaveText(
    'Brake',
  );
  await expect(panel.locator('.controls-row[data-action="gearToggle"] .controls-action')).toHaveText(
    'Switch D / R',
  );
  await expect(page.locator('#bind-brake-2')).toHaveText('Space');
  await expect(page.locator('#controls-reset')).toHaveText('Restore defaults');
  await expect(panel.locator('.controls-note')).toContainText('never acts as a brake');
  await page.locator('#bind-gearToggle-0').click();
  await page.keyboard.press('KeyD');
  await expect(message).toContainText('"Steer right"');
  await expect(page.locator('#bind-gearToggle-0')).toHaveText('E');
  await page.screenshot({ path: `${OUTPUT_DIR}/controls-settings-en.png` });

  // 完成 → 回到暫停面板；按 Esc 繼續。提示寫的是目前的暫停鍵。
  await page.locator('#controls-done').click();
  await expect(panel).toBeHidden();
  await expect(pause).toBeVisible();
  await expect(pause.locator('.hud-status-hint')).toHaveText('Press Esc to resume');
  await page.keyboard.press('Escape');
  await expect(pause).toBeHidden();

  // 新的綁定立刻生效：開一小段後按 R 是重來（不是換檔），E 才是切換檔位（按一下到 R、再按一下回 D）。
  const moved = await holdUntil(page, 'KeyW', (snapshot) => snapshot.zFt < -1);
  expect(moved.status).toBe('driving');
  await page.keyboard.press('KeyR');
  await expect.poll(async () => (await nextSnapshot(page)).status).toBe('ready');
  expect(Math.abs((await nextSnapshot(page)).zFt)).toBeLessThan(POSITION_TOLERANCE_FT);
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await page.keyboard.press('KeyE');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await page.keyboard.press('KeyE');
  await expect(gear).toHaveAttribute('data-gear', 'forward');

  // 重新整理：綁定還在。
  await page.reload();
  await expect(page.locator('#hud-speed')).toHaveText('0.0');
  expect(await hudKeys(page, 'restart')).toEqual(['R', 'T']);
  expect(await hudKeys(page, 'gearToggle')).toEqual(['E']);
  expect(await hudKeys(page, 'brake')).toEqual(['S', '↓', '空白鍵']);

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
  await expect(page.locator('#bind-gearToggle-0')).toHaveText('R');
  await expect(page.locator('#bind-brake-2')).toHaveText(',');
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
        steerLeft: ['KeyA'],
        steerRight: ['KeyD'],
        brake: ['KeyS'],
        gearToggle: ['KeyR'],
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
    expect(await hudKeys(page, 'gearToggle')).toEqual(['R']);
    expect(await hudKeys(page, 'brake')).toEqual(['S', '↓', ',']);
    expect(await storedControls(page)).toBeNull();
  });
}

test('舊存檔遷移（倒車油門、掛 D／掛 R、handbrake）：照常讀進來，改成剎車與一個切換檔位，再存不留舊動作', async ({
  page,
}) => {
  // 舊版存的內容：重來改成 R／T、掛 R 檔改成 E；S／↓ 是倒車油門、Q 掛 D 檔，另外還有一項 handbrake 佔著 / 與空白鍵。
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
  await page.goto('/?level=w1_l05&lang=zh-TW&touch=off');
  await expect(page.locator('#hud-speed')).toHaveText('0.0');
  await page.evaluate(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: CONTROLS_KEY, value: legacy },
  );
  await page.reload();
  await expect(page.locator('#hud-speed')).toHaveText('0.0');

  // 不算壞檔：改過的鍵都還在，存檔沒有被刪掉。
  // 倒車油門的 S／↓ 接在玩家原本的剎車鍵（逗號）後面；R 已經是重來，切換檔位用玩家原本掛 R 檔的 E。
  expect(await hudKeys(page, 'restart')).toEqual(['R', 'T']);
  expect(await hudKeys(page, 'brake')).toEqual([',', 'S', '↓']);
  expect(await hudKeys(page, 'gearToggle')).toEqual(['E']);
  expect(await hudKeys(page, 'throttle')).toEqual(['W', '↑']);
  const hudTexts = await page.locator('.hud-controls .hud-key').allTextContents();
  expect(hudTexts).not.toContain('Q');
  expect(hudTexts).not.toContain('/');
  expect(hudTexts).not.toContain('空白鍵');
  expect(await storedControls(page)).toBe(legacy);

  // 按鍵設定裡只有現在的八個動作；handbrake 原本佔的空白鍵可以綁給暫停。
  await page.locator('#hud-controls-edit').click();
  const panel = page.locator('#controls-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.controls-row')).toHaveCount(8);
  for (const removed of ['handbrake', 'reverse', 'gearDrive', 'gearReverse']) {
    await expect(panel.locator(`.controls-row[data-action="${removed}"]`)).toHaveCount(0);
  }
  await expect(page.locator('#bind-gearToggle-0')).toHaveText('E');
  await bind(page, 'pause', 1, 'Space');
  await expect(page.locator('#controls-message')).toHaveAttribute('data-kind', 'info');
  await expect(page.locator('#bind-pause-1')).toHaveText('空白鍵');

  // 這一次存檔寫回去的內容不再有已移除的動作，其他鍵照舊。
  const saved = JSON.parse((await storedControls(page)) ?? 'null') as {
    version: number;
    bindings: Record<string, string[]>;
  };
  for (const removed of ['handbrake', 'reverse', 'gearDrive', 'gearReverse']) {
    expect(saved.bindings).not.toHaveProperty(removed);
  }
  expect(saved.bindings.brake).toEqual(['Comma', 'KeyS', 'ArrowDown']);
  expect(saved.bindings.gearToggle).toEqual(['KeyE']);
  expect(saved.bindings.restart).toEqual(['KeyR', 'KeyT']);
  expect(saved.bindings.pause).toEqual(['Escape', 'Space']);

  // 遷移後的鍵真的照新的意思作用：W 前進，S（原本的倒車油門）現在是剎車——停住，不會倒退。
  await page.locator('#controls-done').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#hud-pause')).toBeHidden();
  const gear = page.locator('#hud-gear');
  const moving = await holdUntil(page, 'KeyW', (snapshot) => snapshot.speedMph > 1.5);
  expect(moving.status).toBe('driving');
  const stopped = await holdUntil(page, 'KeyS', (snapshot) => snapshot.speedMph === 0);
  expect(stopped.status).toBe('driving');
  await page.keyboard.down('KeyS');
  for (let frame = 0; frame < 6; frame += 1) {
    const snapshot = await nextSnapshot(page);
    expect(snapshot.speedMph).toBe(0);
    expect(snapshot.zFt).toBe(stopped.zFt);
  }
  await page.keyboard.up('KeyS');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  // Q（原本掛 D 檔）沒有動作了；E（原本掛 R 檔）切換檔位：到 R 之後油門是倒車。
  await page.keyboard.press('KeyQ');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await page.keyboard.press('KeyE');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  const reversing = await holdUntil(page, 'KeyW', (snapshot) => snapshot.speedMph < -1);
  expect(reversing.zFt).toBeGreaterThan(stopped.zFt);
  const end = await holdUntil(page, 'Comma', (snapshot) => snapshot.speedMph === 0);
  expect(end.status).toBe('driving');
});

test('回歸：倒車關按 R 切到 R 檔後按住油門是倒車（不是剎車）；S／↓／逗號剎車；再按 R 回 D；Backspace 重來回到 D 檔', async ({
  page,
}) => {
  await page.goto('/?level=w1_l05&view=chase_near&lang=zh-TW');
  const gear = page.locator('#hud-gear');
  const assist = page.locator('#reverse-assist');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(gear).toHaveText('D 前進');
  // 沒有自排／手排之分了：檔位上不再標模式。
  await expect(gear).not.toHaveAttribute('data-mode');
  await expect(assist).toHaveAttribute('data-visible', 'false');
  const start = await nextSnapshot(page);

  // 按 R：切到倒檔。車還沒動、計時也還沒開始，但 HUD 是 R，倒車輔助層出現。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await expect(gear).toHaveText('R 倒車');
  await expect(assist).toHaveAttribute('data-visible', 'true');
  await expect(assist).toHaveCSS('opacity', '1');
  const shifted = await nextSnapshot(page);
  expect(shifted.status).toBe('ready');
  expect(shifted.zFt).toBe(start.zFt);
  await page.screenshot({ path: `${OUTPUT_DIR}/controls-gear-r-assist.png` });

  // R 檔按住油門（W）：車往後走（車頭朝 −Z，往後是 z 變大），不是減速、也不是停在原地。
  // 一退起來就放開，用 S 剎停（S 現在是剎車，不是倒車油門）；這一局還在進行，檔位仍是 R。
  const reversing = await holdUntil(page, 'KeyW', (snapshot) => snapshot.speedMph < -1);
  expect(reversing.status).toBe('driving');
  expect(reversing.zFt).toBeGreaterThan(start.zFt);
  const braked = await holdUntil(page, 'KeyS', (snapshot) => snapshot.speedMph === 0);
  expect(braked.status).toBe('driving');
  expect(braked.zFt).toBeGreaterThan(reversing.zFt - POSITION_TOLERANCE_FT);
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await expect(assist).toHaveAttribute('data-visible', 'true');

  // 油門的備用鍵（↑）也一樣往後；↓ 剎停。
  const again = await holdUntil(page, 'ArrowUp', (snapshot) => snapshot.speedMph < -1);
  expect(again.zFt).toBeGreaterThan(braked.zFt);
  const brakedAgain = await holdUntil(page, 'ArrowDown', (snapshot) => snapshot.speedMph === 0);
  expect(brakedAgain.status).toBe('driving');
  await page.keyboard.down('Comma');
  await nextSnapshot(page);
  await page.screenshot({ path: `${OUTPUT_DIR}/controls-brake-comma.png` });
  await page.keyboard.up('Comma');

  // 再按一下 R：切回 D 檔，輔助層收起。Q 預設沒有動作，按了不換檔。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(assist).toHaveAttribute('data-visible', 'false');
  await page.keyboard.press('KeyQ');
  for (let frame = 0; frame < 4; frame += 1) {
    await nextSnapshot(page);
    expect(await gear.getAttribute('data-gear')).toBe('forward');
  }

  // D 檔停著按 S：只是剎車，車不會後退，檔位也不會變。
  await page.keyboard.down('KeyS');
  for (let frame = 0; frame < 6; frame += 1) {
    const snapshot = await nextSnapshot(page);
    expect(snapshot.speedMph).toBe(0);
    expect(snapshot.zFt).toBe(brakedAgain.zFt);
  }
  await page.keyboard.up('KeyS');
  await expect(gear).toHaveAttribute('data-gear', 'forward');

  // D 檔按住油門（W）往前；逗號剎停。
  const forward = await holdUntil(page, 'KeyW', (snapshot) => snapshot.speedMph > 1);
  expect(forward.zFt).toBeLessThan(brakedAgain.zFt);
  const stopped = await holdUntil(page, 'Comma', (snapshot) => snapshot.speedMph === 0);
  expect(stopped.status).toBe('driving');

  // 切到 R 再按 Backspace 重來：車回起點，檔位回到 D 檔，輔助層收起。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await page.keyboard.press('Backspace');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(assist).toHaveAttribute('data-visible', 'false');
  const restarted = await nextSnapshot(page);
  expect(restarted.status).toBe('ready');
  expect(Math.abs(restarted.zFt - start.zFt)).toBeLessThan(POSITION_TOLERANCE_FT);
  await page.screenshot({ path: `${OUTPUT_DIR}/controls-restart-backspace.png` });
});

test('回歸：w1_l06（倒車入庫）切到 R 檔後按住油門，車沿車尾方向後退', async ({ page }) => {
  await page.goto('/?level=w1_l06&view=chase_near&lang=zh-TW');
  const gear = page.locator('#hud-gear');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  const start = await nextSnapshot(page);
  // 起點車頭朝 +X（heading 90°）：往後走是 x 變小。
  expect(start.headingDeg).toBeCloseTo(90, 6);

  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  const reversing = await holdUntil(page, 'KeyW', (snapshot) => snapshot.speedMph < -1);
  expect(reversing.status).toBe('driving');
  expect(reversing.xFt).toBeLessThan(start.xFt);
  const stopped = await holdUntil(page, 'KeyS', (snapshot) => snapshot.speedMph === 0);
  expect(stopped.status).toBe('driving');
  expect(stopped.xFt).toBeLessThan(start.xFt);
  await expect(gear).toHaveAttribute('data-gear', 'reverse');

  // 切回 D 檔按住油門：往前（x 變大）。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  const forward = await holdUntil(page, 'KeyW', (snapshot) => snapshot.speedMph > 1);
  expect(forward.xFt).toBeGreaterThan(stopped.xFt);
  const end = await holdUntil(page, 'Comma', (snapshot) => snapshot.speedMph === 0);
  expect(end.status).toBe('driving');
});

test('重來一律回到 D 檔：按著轉向或油門重來、T、暫停面板的重來按鈕', async ({ page }) => {
  await page.goto('/?level=w1_l05&view=chase_near&lang=zh-TW');
  const gear = page.locator('#hud-gear');
  const assist = page.locator('#reverse-assist');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  const start = await nextSnapshot(page);

  /** 接下來幾幀都還是 D 檔、輔助層收著（重設過的檔位不會被仍按著的鍵變回 R）。 */
  async function staysInDrive(): Promise<void> {
    for (let frame = 0; frame < 8; frame += 1) {
      await nextSnapshot(page);
      expect(await gear.getAttribute('data-gear')).toBe('forward');
      expect(await assist.getAttribute('data-visible')).toBe('false');
    }
  }

  // R 檔、按著左轉不放時按 Backspace：回到 D，輔助層收起；左轉仍按著也不會變回 R。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await expect(assist).toHaveAttribute('data-visible', 'true');
  await page.keyboard.down('KeyA');
  await nextSnapshot(page);
  await page.keyboard.press('Backspace');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(assist).toHaveAttribute('data-visible', 'false');
  await staysInDrive();
  await page.keyboard.up('KeyA');

  // R 檔倒車後停住，檔位留在 R；按著右轉不放時按 T（備用的重來鍵）：同樣回到 D。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  const reversing = await holdUntil(page, 'KeyW', (snapshot) => snapshot.speedMph < -0.5);
  expect(reversing.status).toBe('driving');
  const stopped = await holdUntil(page, 'Comma', (snapshot) => snapshot.speedMph === 0);
  expect(stopped.status).toBe('driving');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await expect(assist).toHaveAttribute('data-visible', 'true');
  await page.keyboard.down('KeyD');
  await nextSnapshot(page);
  await page.keyboard.press('KeyT');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(assist).toHaveAttribute('data-visible', 'false');
  await staysInDrive();
  await page.keyboard.up('KeyD');
  expect(Math.abs((await nextSnapshot(page)).zFt - start.zFt)).toBeLessThan(POSITION_TOLERANCE_FT);

  // R 檔按著油門倒車時重來：回到 D 檔，仍按著的油門讓車往前走（不是繼續往後）。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await nextSnapshot(page)).speedMph).toBeLessThan(-0.5);
  await page.keyboard.press('Backspace');
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect.poll(async () => (await nextSnapshot(page)).speedMph).toBeGreaterThan(0.5);
  expect(await gear.getAttribute('data-gear')).toBe('forward');
  await page.keyboard.up('KeyW');
  const rolled = await holdUntil(page, 'Comma', (snapshot) => snapshot.speedMph === 0);
  expect(rolled.status).toBe('driving');
  expect(rolled.zFt).toBeLessThan(start.zFt);
  await staysInDrive();

  // R 檔 → 暫停 → 面板上的「重來」按鈕：解除暫停、車回起點、D 檔、輔助層收起。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await expect(assist).toHaveAttribute('data-visible', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#hud-pause')).toBeVisible();
  // 暫停中按切換檔位不換檔。
  await page.keyboard.press('KeyR');
  await nextSnapshot(page);
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await page.locator('#pause-retry').click();
  await expect(page.locator('#hud-pause')).toBeHidden();
  await expect(gear).toHaveAttribute('data-gear', 'forward');
  await expect(assist).toHaveAttribute('data-visible', 'false');
  await staysInDrive();
  const restarted = await nextSnapshot(page);
  expect(restarted.status).toBe('ready');
  expect(Math.abs(restarted.zFt - start.zFt)).toBeLessThan(POSITION_TOLERANCE_FT);

  // 重來之後再按一次 R：這才會是 R 檔（玩家新下的指令）。
  await page.keyboard.press('KeyR');
  await expect(gear).toHaveAttribute('data-gear', 'reverse');
  await expect(assist).toHaveAttribute('data-visible', 'true');
});
