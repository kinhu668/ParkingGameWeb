// 按鍵綁定：預設鍵位、重綁規則（同一個鍵不能綁兩個動作）、鍵帽文字、存檔（壞檔丟掉回到預設）。
import { describe, expect, test } from 'vitest';
import {
  CONTROL_ACTIONS,
  CONTROLS_STORAGE_KEY,
  CONTROLS_VERSION,
  DEFAULT_BINDINGS,
  MAX_KEYS_PER_ACTION,
  actionBoundTo,
  bindingsEqual,
  clearExtraKey,
  isBindableCode,
  keyLabel,
  loadBindings,
  parseBindings,
  rebind,
  saveBindings,
  type ControlBindings,
  type ControlsStorage,
} from '../src/core/controls';

/** 記憶體裡的假 storage，記下被刪掉的鍵。 */
function memoryStorage(initial: Record<string, string> = {}): ControlsStorage & {
  readonly items: Map<string, string>;
} {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

/** 一用就丟例外的 storage（無痕模式、停用儲存）。 */
const BROKEN_STORAGE: ControlsStorage = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('denied');
  },
  removeItem: () => {
    throw new Error('denied');
  },
};

function stored(bindings: unknown, version: unknown = CONTROLS_VERSION): string {
  return JSON.stringify({ version, bindings });
}

/** rebind 必須成功，回傳新的綁定。 */
function rebound(
  bindings: ControlBindings,
  action: Parameters<typeof rebind>[1],
  slot: number,
  code: string,
): ControlBindings {
  const result = rebind(bindings, action, slot, code);
  if (result.kind !== 'ok') {
    throw new Error(`重綁失敗：${JSON.stringify(result)}`);
  }
  return result.bindings;
}

describe('DEFAULT_BINDINGS：人類指定的預設鍵位', () => {
  test('完整的預設表', () => {
    expect(DEFAULT_BINDINGS).toEqual({
      throttle: ['KeyW', 'ArrowUp'],
      steerLeft: ['KeyA', 'ArrowLeft'],
      steerRight: ['KeyD', 'ArrowRight'],
      brake: ['KeyS', 'ArrowDown', 'Comma'],
      gearToggle: ['KeyR'],
      restart: ['Backspace', 'KeyT'],
      toggleCamera: ['KeyV'],
      pause: ['Escape'],
    });
  });

  test('R 是切換 D／R 檔而不是重來；D 是右轉；Q 沒有動作', () => {
    expect(actionBoundTo(DEFAULT_BINDINGS, 'KeyR')).toBe('gearToggle');
    expect(actionBoundTo(DEFAULT_BINDINGS, 'KeyD')).toBe('steerRight');
    expect(DEFAULT_BINDINGS.restart).not.toContain('KeyR');
    expect(actionBoundTo(DEFAULT_BINDINGS, 'KeyQ')).toBeUndefined();
  });

  test('只有一個切換檔位的動作：沒有倒車油門、掛 D、掛 R', () => {
    expect(CONTROL_ACTIONS).toContain('gearToggle');
    for (const removed of ['reverse', 'gearDrive', 'gearReverse']) {
      expect(CONTROL_ACTIONS).not.toContain(removed);
      expect(DEFAULT_BINDINGS).not.toHaveProperty(removed);
    }
  });

  test('S、↓ 與逗號都是剎車；一個動作最多三個鍵', () => {
    for (const code of ['KeyS', 'ArrowDown', 'Comma']) {
      expect(actionBoundTo(DEFAULT_BINDINGS, code), code).toBe('brake');
    }
    expect(MAX_KEYS_PER_ACTION).toBe(3);
  });

  test('每個動作都有鍵、不超過上限、每個鍵都能綁，而且同一個鍵不會綁到兩個動作', () => {
    expect(Object.keys(DEFAULT_BINDINGS).sort()).toEqual([...CONTROL_ACTIONS].sort());
    const codes = CONTROL_ACTIONS.flatMap((action) => DEFAULT_BINDINGS[action]);
    expect(new Set(codes).size).toBe(codes.length);
    for (const action of CONTROL_ACTIONS) {
      expect(DEFAULT_BINDINGS[action].length).toBeGreaterThanOrEqual(1);
      expect(DEFAULT_BINDINGS[action].length).toBeLessThanOrEqual(MAX_KEYS_PER_ACTION);
    }
    expect(codes.every(isBindableCode)).toBe(true);
  });

  test('預設表通得過存檔的驗證（存了再讀回來一樣）', () => {
    expect(parseBindings({ version: CONTROLS_VERSION, bindings: DEFAULT_BINDINGS })).toEqual(
      DEFAULT_BINDINGS,
    );
  });
});

describe('isBindableCode', () => {
  test('字母、數字、符號、方向鍵、Shift、Enter 可以綁', () => {
    for (const code of ['KeyP', 'Digit1', 'Comma', 'Slash', 'ArrowUp', 'ShiftLeft', 'Enter', 'Numpad0']) {
      expect(isBindableCode(code), code).toBe(true);
    }
  });

  test('修飾鍵、Tab、功能鍵、空字串與奇怪的字串不能綁', () => {
    for (const code of ['ControlLeft', 'AltRight', 'MetaLeft', 'Tab', 'F5', 'F12', '', 'Unidentified', 'Key W', '<b>']) {
      expect(isBindableCode(code), code).toBe(false);
    }
  });
});

describe('rebind：重綁', () => {
  test('把剎車的逗號改成 B；其他動作不變，原本的物件也沒被改到', () => {
    const next = rebound(DEFAULT_BINDINGS, 'brake', 2, 'KeyB');
    expect(next.brake).toEqual(['KeyS', 'ArrowDown', 'KeyB']);
    expect(next.restart).toEqual(DEFAULT_BINDINGS.restart);
    expect(DEFAULT_BINDINGS.brake).toEqual(['KeyS', 'ArrowDown', 'Comma']);
    expect(actionBoundTo(next, 'Comma')).toBeUndefined();
  });

  test('第二格：換掉備用鍵，或在只有一個鍵時多加一個', () => {
    expect(rebound(DEFAULT_BINDINGS, 'restart', 1, 'KeyY').restart).toEqual(['Backspace', 'KeyY']);
    expect(rebound(DEFAULT_BINDINGS, 'gearToggle', 1, 'Period').gearToggle).toEqual(['KeyR', 'Period']);
  });

  test('第三格：已經有兩個鍵時再加一個，或換掉第三個鍵', () => {
    expect(rebound(DEFAULT_BINDINGS, 'restart', 2, 'KeyY').restart).toEqual(['Backspace', 'KeyT', 'KeyY']);
    expect(rebound(DEFAULT_BINDINGS, 'brake', 2, 'Space').brake).toEqual(['KeyS', 'ArrowDown', 'Space']);
  });

  test('同一個鍵不能綁兩個動作：擋下來並回報是誰的', () => {
    // 人類的例子：R 現在是切換檔位，重來要用 R 必須先把切換檔位改掉。
    expect(rebind(DEFAULT_BINDINGS, 'restart', 0, 'KeyR')).toEqual({
      kind: 'conflict',
      action: 'gearToggle',
    });
    expect(rebind(DEFAULT_BINDINGS, 'gearToggle', 0, 'KeyD')).toEqual({
      kind: 'conflict',
      action: 'steerRight',
    });
    // S 現在是剎車：油門不能搶。
    expect(rebind(DEFAULT_BINDINGS, 'throttle', 0, 'KeyS')).toEqual({
      kind: 'conflict',
      action: 'brake',
    });
    // 備用鍵也算。
    expect(rebind(DEFAULT_BINDINGS, 'brake', 0, 'KeyT')).toEqual({
      kind: 'conflict',
      action: 'restart',
    });
    // 同一個動作的另一格也算。
    expect(rebind(DEFAULT_BINDINGS, 'restart', 0, 'KeyT')).toEqual({
      kind: 'conflict',
      action: 'restart',
    });
  });

  test('先把佔用的動作改掉，原本衝突的鍵就能綁了', () => {
    const freed = rebound(DEFAULT_BINDINGS, 'gearToggle', 0, 'KeyE');
    const next = rebound(freed, 'restart', 0, 'KeyR');
    expect(next.restart).toEqual(['KeyR', 'KeyT']);
    expect(next.gearToggle).toEqual(['KeyE']);
  });

  test('換成原本的鍵算成功，綁定是同一份', () => {
    expect(rebind(DEFAULT_BINDINGS, 'brake', 2, 'Comma')).toEqual({
      kind: 'ok',
      bindings: DEFAULT_BINDINGS,
    });
  });

  test('不能綁的鍵、超出範圍的格子：不支援', () => {
    expect(rebind(DEFAULT_BINDINGS, 'brake', 0, 'Tab')).toEqual({ kind: 'unsupported' });
    expect(rebind(DEFAULT_BINDINGS, 'brake', 0, 'ControlLeft')).toEqual({ kind: 'unsupported' });
    // 只有一個鍵時不能跳過第二格直接填第三格。
    expect(rebind(DEFAULT_BINDINGS, 'pause', 2, 'KeyB')).toEqual({ kind: 'unsupported' });
    expect(rebind(DEFAULT_BINDINGS, 'brake', MAX_KEYS_PER_ACTION, 'KeyB')).toEqual({
      kind: 'unsupported',
    });
    expect(rebind(DEFAULT_BINDINGS, 'brake', -1, 'KeyB')).toEqual({ kind: 'unsupported' });
  });

  test('不論怎麼重綁，同一個鍵都不會出現在兩個地方', () => {
    let bindings = DEFAULT_BINDINGS;
    const codes = ['KeyR', 'KeyD', 'Space', 'KeyB', 'KeyQ', 'Comma', 'KeyT', 'Enter', 'KeyW'];
    CONTROL_ACTIONS.forEach((action, index) => {
      for (let slot = 0; slot < MAX_KEYS_PER_ACTION; slot += 1) {
        const result = rebind(bindings, action, slot, codes[(index + slot) % codes.length] ?? 'KeyZ');
        if (result.kind === 'ok') {
          bindings = result.bindings;
        }
      }
    });
    const all = CONTROL_ACTIONS.flatMap((action) => bindings[action]);
    expect(new Set(all).size).toBe(all.length);
    expect(parseBindings({ version: CONTROLS_VERSION, bindings })).toEqual(bindings);
  });
});

describe('clearExtraKey', () => {
  test('拿掉備用鍵；只剩一個鍵時不動', () => {
    const cleared = clearExtraKey(DEFAULT_BINDINGS, 'restart');
    expect(cleared.restart).toEqual(['Backspace']);
    expect(actionBoundTo(cleared, 'KeyT')).toBeUndefined();
    expect(clearExtraKey(cleared, 'restart')).toBe(cleared);
    expect(clearExtraKey(DEFAULT_BINDINGS, 'pause')).toBe(DEFAULT_BINDINGS);
  });

  test('三個鍵：一次拿掉最後一個，拿到剩一個為止', () => {
    const two = clearExtraKey(DEFAULT_BINDINGS, 'brake');
    expect(two.brake).toEqual(['KeyS', 'ArrowDown']);
    const one = clearExtraKey(two, 'brake');
    expect(one.brake).toEqual(['KeyS']);
    expect(clearExtraKey(one, 'brake')).toBe(one);
  });
});

describe('bindingsEqual', () => {
  test('內容相同就相等；鍵不同、順序不同、數目不同都不相等', () => {
    expect(
      bindingsEqual(DEFAULT_BINDINGS, { ...DEFAULT_BINDINGS, brake: ['KeyS', 'ArrowDown', 'Comma'] }),
    ).toBe(true);
    expect(bindingsEqual(DEFAULT_BINDINGS, { ...DEFAULT_BINDINGS, brake: ['KeyB'] })).toBe(false);
    expect(bindingsEqual(DEFAULT_BINDINGS, { ...DEFAULT_BINDINGS, restart: ['KeyT', 'Backspace'] })).toBe(false);
    expect(bindingsEqual(DEFAULT_BINDINGS, { ...DEFAULT_BINDINGS, restart: ['Backspace'] })).toBe(false);
  });
});

describe('parseBindings：壞檔整份不要', () => {
  const custom = { ...DEFAULT_BINDINGS, brake: ['KeyB'], restart: ['Enter'] };

  test('合格的內容原樣讀回來，多出來的欄位丟掉', () => {
    expect(parseBindings({ version: 1, bindings: custom })).toEqual(custom);
    const three = { ...custom, brake: ['KeyB', 'KeyN', 'KeyM'] };
    expect(parseBindings({ version: 1, bindings: three })).toEqual(three);
    expect(parseBindings({ version: 1, bindings: { ...custom, horn: ['KeyH'] }, extra: 1 })).toEqual(custom);
  });

  test.each<[string, unknown]>([
    ['不是物件', 'KeyW'],
    ['null', null],
    ['陣列', []],
    ['版本不符', { version: 2, bindings: custom }],
    ['沒有版本', { bindings: custom }],
    ['bindings 不是物件', { version: 1, bindings: [] }],
    ['少一個動作', { version: 1, bindings: { ...custom, pause: undefined } }],
    ['鍵清單是空的', { version: 1, bindings: { ...custom, brake: [] } }],
    ['鍵清單不是陣列', { version: 1, bindings: { ...custom, brake: 'KeyB' } }],
    ['鍵太多', { version: 1, bindings: { ...custom, brake: ['KeyB', 'KeyN', 'KeyM', 'KeyL'] } }],
    ['鍵不是字串', { version: 1, bindings: { ...custom, brake: [7] } }],
    ['不能綁的鍵', { version: 1, bindings: { ...custom, brake: ['Tab'] } }],
    ['同一個鍵綁到兩個動作', { version: 1, bindings: { ...custom, brake: ['KeyR'] } }],
    ['同一個動作裡重複', { version: 1, bindings: { ...custom, brake: ['KeyB', 'KeyB'] } }],
  ])('%s → undefined', (_name, raw) => {
    expect(parseBindings(raw)).toBeUndefined();
  });
});

describe('loadBindings／saveBindings', () => {
  test('沒存過、沒有 storage、storage 丟例外：預設', () => {
    expect(loadBindings(memoryStorage())).toBe(DEFAULT_BINDINGS);
    expect(loadBindings(undefined)).toBe(DEFAULT_BINDINGS);
    expect(loadBindings(BROKEN_STORAGE)).toBe(DEFAULT_BINDINGS);
    expect(() => {
      saveBindings(BROKEN_STORAGE, { ...DEFAULT_BINDINGS, brake: ['KeyB'] });
      saveBindings(undefined, DEFAULT_BINDINGS);
    }).not.toThrow();
  });

  test('存了再讀：拿回同樣的綁定，鍵名是 parkinggame.controls.v1', () => {
    const storage = memoryStorage();
    const custom = rebound(rebound(DEFAULT_BINDINGS, 'brake', 0, 'KeyB'), 'pause', 0, 'KeyP');
    saveBindings(storage, custom);
    expect(CONTROLS_STORAGE_KEY).toBe('parkinggame.controls.v1');
    expect([...storage.items.keys()]).toEqual(['parkinggame.controls.v1']);
    expect(loadBindings(storage)).toEqual(custom);
  });

  test('存的是預設：不留存檔（恢復預設會把舊的那一筆刪掉）', () => {
    const storage = memoryStorage();
    saveBindings(storage, { ...DEFAULT_BINDINGS, brake: ['KeyB'] });
    expect(storage.items.size).toBe(1);
    saveBindings(storage, DEFAULT_BINDINGS);
    expect(storage.items.size).toBe(0);
    expect(loadBindings(storage)).toBe(DEFAULT_BINDINGS);
  });

  test.each<[string, string]>([
    ['不是 JSON', '{oops'],
    ['形狀不對', JSON.stringify({ version: 1 })],
    ['版本不符', stored(DEFAULT_BINDINGS, 99)],
    ['同一個鍵綁兩個動作', stored({ ...DEFAULT_BINDINGS, restart: ['KeyR'] })],
    ['舊的八個動作的表', stored({ throttle: ['KeyW'], restart: ['KeyR'] })],
  ])('壞檔（%s）：回到預設，而且那一筆被刪掉', (_name, text) => {
    const storage = memoryStorage({ [CONTROLS_STORAGE_KEY]: text, other: 'keep' });
    expect(loadBindings(storage)).toBe(DEFAULT_BINDINGS);
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(false);
    expect(storage.items.get('other')).toBe('keep');
  });
});

describe('舊存檔遷移：已移除的動作 handbrake', () => {
  /** 舊版的預設表：多一個 handbrake，佔著 / 與空白鍵。 */
  const LEGACY_DEFAULTS = { ...DEFAULT_BINDINGS, handbrake: ['Slash', 'Space'] };

  test('現在沒有這個動作；空白鍵與 / 預設沒有動作，可以拿去綁', () => {
    expect(CONTROL_ACTIONS).not.toContain('handbrake');
    expect(DEFAULT_BINDINGS).not.toHaveProperty('handbrake');
    for (const code of ['Space', 'Slash']) {
      expect(actionBoundTo(DEFAULT_BINDINGS, code), code).toBeUndefined();
      expect(rebound(DEFAULT_BINDINGS, 'pause', 1, code).pause).toEqual(['Escape', code]);
    }
  });

  test('含 handbrake 的舊存檔讀得進來：那一項丟掉，其他鍵照舊，存檔沒被當成壞檔刪掉', () => {
    const legacy = { ...LEGACY_DEFAULTS, brake: ['KeyB'], restart: ['Enter', 'KeyT'] };
    const storage = memoryStorage({ [CONTROLS_STORAGE_KEY]: stored(legacy) });
    const loaded = loadBindings(storage);
    expect(loaded).not.toHaveProperty('handbrake');
    expect(loaded).toEqual({ ...DEFAULT_BINDINGS, brake: ['KeyB'], restart: ['Enter', 'KeyT'] });
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(true);
  });

  test('舊存檔只改過 handbrake：讀回來就是預設', () => {
    const storage = memoryStorage({
      [CONTROLS_STORAGE_KEY]: stored({ ...LEGACY_DEFAULTS, handbrake: ['KeyH'] }),
    });
    expect(loadBindings(storage)).toEqual(DEFAULT_BINDINGS);
  });

  test.each<[string, unknown]>([
    ['不是陣列', 'Space'],
    ['空的', []],
    ['不能綁的鍵', ['Tab']],
    ['null', null],
  ])('handbrake 那一項的內容不看（%s）：其他綁定照樣讀進來', (_name, handbrake) => {
    const raw = { version: CONTROLS_VERSION, bindings: { ...LEGACY_DEFAULTS, brake: ['KeyB'], handbrake } };
    expect(parseBindings(raw)).toEqual({ ...DEFAULT_BINDINGS, brake: ['KeyB'] });
  });

  test('handbrake 原本佔的鍵空出來了：可以綁給別的動作', () => {
    const loaded = parseBindings({ version: CONTROLS_VERSION, bindings: LEGACY_DEFAULTS });
    expect(loaded).toEqual(DEFAULT_BINDINGS);
    const next = rebound(rebound(loaded ?? DEFAULT_BINDINGS, 'gearToggle', 1, 'Space'), 'pause', 1, 'Slash');
    expect(next.gearToggle).toEqual(['KeyR', 'Space']);
    expect(next.pause).toEqual(['Escape', 'Slash']);
  });

  test('讀進來再存：寫回去的內容沒有 handbrake，再讀一次還是一樣', () => {
    const legacy = { ...LEGACY_DEFAULTS, brake: ['KeyB'] };
    const storage = memoryStorage({ [CONTROLS_STORAGE_KEY]: stored(legacy) });
    const loaded = loadBindings(storage);
    saveBindings(storage, loaded);
    const saved: unknown = JSON.parse(storage.items.get(CONTROLS_STORAGE_KEY) ?? 'null');
    expect(saved).toEqual({
      version: CONTROLS_VERSION,
      bindings: { ...DEFAULT_BINDINGS, brake: ['KeyB'] },
    });
    expect(JSON.stringify(saved)).not.toContain('handbrake');
    expect(loadBindings(storage)).toEqual(loaded);
  });

  test('舊存檔讀進來是預設、再存：那一筆刪掉，不留 handbrake', () => {
    const storage = memoryStorage({ [CONTROLS_STORAGE_KEY]: stored(LEGACY_DEFAULTS) });
    saveBindings(storage, loadBindings(storage));
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(false);
  });
});

describe('keyLabel：鍵帽上的字', () => {
  test('字母與數字直接寫；方向鍵是箭頭；符號鍵寫符號', () => {
    expect(keyLabel('KeyW')).toEqual({ text: 'W' });
    expect(keyLabel('Digit7')).toEqual({ text: '7' });
    expect(keyLabel('ArrowLeft')).toEqual({ text: '←' });
    expect(keyLabel('Comma')).toEqual({ text: ',' });
    expect(keyLabel('Slash')).toEqual({ text: '/' });
    expect(keyLabel('Escape')).toEqual({ text: 'Esc' });
    expect(keyLabel('Backspace')).toEqual({ text: 'Backspace' });
    expect(keyLabel('Numpad5')).toEqual({ text: 'Num 5' });
  });

  test('空白鍵走翻譯鍵；沒列的鍵用 code 本身', () => {
    expect(keyLabel('Space')).toEqual({ key: 'hud.keySpace' });
    expect(keyLabel('Enter')).toEqual({ text: 'Enter' });
    expect(keyLabel('Home')).toEqual({ text: 'Home' });
  });

  test('預設表裡每個鍵的寫法都不是空的', () => {
    for (const code of CONTROL_ACTIONS.flatMap((action) => DEFAULT_BINDINGS[action])) {
      const label = keyLabel(code);
      expect('key' in label ? label.key : label.text, code).not.toBe('');
    }
  });
});
