// 按鍵綁定：預設鍵位、重綁規則（同一個鍵不能綁兩個動作）、鍵帽文字、存檔（壞檔丟掉回到預設、舊版預設的存檔改走新預設）。
import { describe, expect, test } from 'vitest';
import {
  CONTROL_ACTIONS,
  CONTROLS_STORAGE_KEY,
  CONTROLS_VERSION,
  DEFAULTS_REVISION,
  DEFAULT_BINDINGS,
  MAX_KEYS_PER_ACTION,
  PREVIOUS_DEFAULT_BINDINGS,
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
      throttle: ['Slash', 'KeyW', 'ArrowUp'],
      steerLeft: ['KeyA', 'ArrowLeft'],
      steerRight: ['KeyD', 'ArrowRight'],
      brake: ['Period', 'KeyS', 'ArrowDown'],
      gearToggle: ['Space', 'KeyR'],
      restart: ['Backspace', 'KeyT'],
      toggleCamera: ['KeyV'],
      pause: ['Escape'],
    });
  });

  test('主要鍵（第一個）：油門 /、剎車 .、切換檔位是空白鍵', () => {
    expect(DEFAULT_BINDINGS.throttle[0]).toBe('Slash');
    expect(DEFAULT_BINDINGS.brake[0]).toBe('Period');
    expect(DEFAULT_BINDINGS.gearToggle[0]).toBe('Space');
  });

  test('/、. 與空白鍵沒有搶到別的動作：轉向、重來、鏡頭、暫停的鍵照舊', () => {
    expect(actionBoundTo(DEFAULT_BINDINGS, 'Slash')).toBe('throttle');
    expect(actionBoundTo(DEFAULT_BINDINGS, 'Period')).toBe('brake');
    expect(actionBoundTo(DEFAULT_BINDINGS, 'Space')).toBe('gearToggle');
    expect(DEFAULT_BINDINGS.steerLeft).toEqual(['KeyA', 'ArrowLeft']);
    expect(DEFAULT_BINDINGS.steerRight).toEqual(['KeyD', 'ArrowRight']);
    expect(DEFAULT_BINDINGS.restart).toEqual(['Backspace', 'KeyT']);
    expect(DEFAULT_BINDINGS.toggleCamera).toEqual(['KeyV']);
    expect(DEFAULT_BINDINGS.pause).toEqual(['Escape']);
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

  test('.、S 與 ↓ 都是剎車；一個動作最多三個鍵，所以逗號不再是預設的剎車鍵', () => {
    for (const code of ['Period', 'KeyS', 'ArrowDown']) {
      expect(actionBoundTo(DEFAULT_BINDINGS, code), code).toBe('brake');
    }
    expect(MAX_KEYS_PER_ACTION).toBe(3);
    expect(DEFAULT_BINDINGS.brake).toHaveLength(MAX_KEYS_PER_ACTION);
    expect(actionBoundTo(DEFAULT_BINDINGS, 'Comma')).toBeUndefined();
  });

  test('上一版的官方預設留著給舊存檔比對：W／↑、S／↓／逗號、只有 R', () => {
    expect(PREVIOUS_DEFAULT_BINDINGS).toEqual({
      throttle: ['KeyW', 'ArrowUp'],
      steerLeft: ['KeyA', 'ArrowLeft'],
      steerRight: ['KeyD', 'ArrowRight'],
      brake: ['KeyS', 'ArrowDown', 'Comma'],
      gearToggle: ['KeyR'],
      restart: ['Backspace', 'KeyT'],
      toggleCamera: ['KeyV'],
      pause: ['Escape'],
    });
    expect(bindingsEqual(PREVIOUS_DEFAULT_BINDINGS, DEFAULT_BINDINGS)).toBe(false);
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
  test('把剎車的 ↓ 改成 B；其他動作不變，原本的物件也沒被改到', () => {
    const next = rebound(DEFAULT_BINDINGS, 'brake', 2, 'KeyB');
    expect(next.brake).toEqual(['Period', 'KeyS', 'KeyB']);
    expect(next.restart).toEqual(DEFAULT_BINDINGS.restart);
    expect(DEFAULT_BINDINGS.brake).toEqual(['Period', 'KeyS', 'ArrowDown']);
    expect(actionBoundTo(next, 'ArrowDown')).toBeUndefined();
  });

  test('第二格：換掉備用鍵，或在只有一個鍵時多加一個', () => {
    expect(rebound(DEFAULT_BINDINGS, 'restart', 1, 'KeyY').restart).toEqual(['Backspace', 'KeyY']);
    expect(rebound(DEFAULT_BINDINGS, 'gearToggle', 1, 'KeyG').gearToggle).toEqual(['Space', 'KeyG']);
    expect(rebound(DEFAULT_BINDINGS, 'toggleCamera', 1, 'KeyC').toggleCamera).toEqual(['KeyV', 'KeyC']);
  });

  test('第三格：已經有兩個鍵時再加一個，或換掉第三個鍵', () => {
    expect(rebound(DEFAULT_BINDINGS, 'restart', 2, 'KeyY').restart).toEqual(['Backspace', 'KeyT', 'KeyY']);
    expect(rebound(DEFAULT_BINDINGS, 'brake', 2, 'Comma').brake).toEqual(['Period', 'KeyS', 'Comma']);
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
    // 新的主要鍵也一樣：空白鍵是切換檔位、/ 是油門、. 是剎車。
    expect(rebind(DEFAULT_BINDINGS, 'pause', 1, 'Space')).toEqual({
      kind: 'conflict',
      action: 'gearToggle',
    });
    expect(rebind(DEFAULT_BINDINGS, 'brake', 0, 'Slash')).toEqual({
      kind: 'conflict',
      action: 'throttle',
    });
    expect(rebind(DEFAULT_BINDINGS, 'restart', 0, 'Period')).toEqual({
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
    const freed = rebound(DEFAULT_BINDINGS, 'gearToggle', 1, 'KeyE');
    const next = rebound(freed, 'restart', 0, 'KeyR');
    expect(next.restart).toEqual(['KeyR', 'KeyT']);
    expect(next.gearToggle).toEqual(['Space', 'KeyE']);
  });

  test('換成原本的鍵算成功，綁定是同一份', () => {
    expect(rebind(DEFAULT_BINDINGS, 'brake', 2, 'ArrowDown')).toEqual({
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
    expect(two.brake).toEqual(['Period', 'KeyS']);
    const one = clearExtraKey(two, 'brake');
    expect(one.brake).toEqual(['Period']);
    expect(clearExtraKey(one, 'brake')).toBe(one);
  });
});

describe('bindingsEqual', () => {
  test('內容相同就相等；鍵不同、順序不同、數目不同都不相等', () => {
    expect(
      bindingsEqual(DEFAULT_BINDINGS, { ...DEFAULT_BINDINGS, brake: ['Period', 'KeyS', 'ArrowDown'] }),
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
  /** 舊版的預設表：上一版的預設再多一個 handbrake，佔著 / 與空白鍵。 */
  const LEGACY_DEFAULTS = { ...PREVIOUS_DEFAULT_BINDINGS, handbrake: ['Slash', 'Space'] };

  test('現在沒有這個動作；它原本的 / 與空白鍵現在是油門與切換檔位的預設鍵', () => {
    expect(CONTROL_ACTIONS).not.toContain('handbrake');
    expect(DEFAULT_BINDINGS).not.toHaveProperty('handbrake');
    expect(actionBoundTo(DEFAULT_BINDINGS, 'Slash')).toBe('throttle');
    expect(actionBoundTo(DEFAULT_BINDINGS, 'Space')).toBe('gearToggle');
  });

  test('含 handbrake 的舊存檔讀得進來：那一項丟掉，其他鍵照舊，存檔沒被當成壞檔刪掉', () => {
    const legacy = { ...LEGACY_DEFAULTS, brake: ['KeyB'], restart: ['Enter', 'KeyT'] };
    const storage = memoryStorage({ [CONTROLS_STORAGE_KEY]: stored(legacy) });
    const loaded = loadBindings(storage);
    expect(loaded).not.toHaveProperty('handbrake');
    // 玩家改過鍵的存檔：其他動作維持當時的鍵，不會被換成新的預設。
    expect(loaded).toEqual({ ...PREVIOUS_DEFAULT_BINDINGS, brake: ['KeyB'], restart: ['Enter', 'KeyT'] });
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(true);
  });

  test('舊存檔只改過 handbrake：等於沒自訂，讀回來是現在的預設，那一筆刪掉', () => {
    const storage = memoryStorage({
      [CONTROLS_STORAGE_KEY]: stored({ ...LEGACY_DEFAULTS, handbrake: ['KeyH'] }),
    });
    expect(loadBindings(storage)).toBe(DEFAULT_BINDINGS);
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(false);
  });

  test.each<[string, unknown]>([
    ['不是陣列', 'Space'],
    ['空的', []],
    ['不能綁的鍵', ['Tab']],
    ['null', null],
  ])('handbrake 那一項的內容不看（%s）：其他綁定照樣讀進來', (_name, handbrake) => {
    const raw = { version: CONTROLS_VERSION, bindings: { ...LEGACY_DEFAULTS, brake: ['KeyB'], handbrake } };
    expect(parseBindings(raw)).toEqual({ ...PREVIOUS_DEFAULT_BINDINGS, brake: ['KeyB'] });
  });

  test('handbrake 原本佔的鍵空出來了：可以綁給別的動作', () => {
    const loaded = parseBindings({ version: CONTROLS_VERSION, bindings: LEGACY_DEFAULTS });
    expect(loaded).toEqual(PREVIOUS_DEFAULT_BINDINGS);
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
      defaultsRevision: DEFAULTS_REVISION,
      bindings: { ...PREVIOUS_DEFAULT_BINDINGS, brake: ['KeyB'] },
    });
    expect(JSON.stringify(saved)).not.toContain('handbrake');
    expect(loadBindings(storage)).toEqual(loaded);
  });

  test('舊存檔讀進來是預設：讀的時候那一筆就刪掉了，再存也不留 handbrake', () => {
    const storage = memoryStorage({ [CONTROLS_STORAGE_KEY]: stored(LEGACY_DEFAULTS) });
    const loaded = loadBindings(storage);
    expect(loaded).toBe(DEFAULT_BINDINGS);
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(false);
    saveBindings(storage, loaded);
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(false);
  });
});

describe('舊存檔遷移：倒車油門、掛 D、掛 R 改成一個切換檔位', () => {
  /** 改成單鍵切換之前的預設表：S／↓ 是倒車油門，剎車只有逗號，Q 掛 D、R 掛 R。 */
  const OLD_DEFAULTS = {
    throttle: ['KeyW', 'ArrowUp'],
    reverse: ['KeyS', 'ArrowDown'],
    steerLeft: ['KeyA', 'ArrowLeft'],
    steerRight: ['KeyD', 'ArrowRight'],
    brake: ['Comma'],
    gearDrive: ['KeyQ'],
    gearReverse: ['KeyR'],
    restart: ['Backspace', 'KeyT'],
    toggleCamera: ['KeyV'],
    pause: ['Escape'],
  };
  const REMOVED = ['reverse', 'gearDrive', 'gearReverse'] as const;

  function parseOld(overrides: Record<string, unknown> = {}): ControlBindings | undefined {
    return parseBindings({ version: CONTROLS_VERSION, bindings: { ...OLD_DEFAULTS, ...overrides } });
  }

  test('舊的預設表：每個鍵做的事與上一版的預設相同（S／↓ 併進剎車、R 切換檔位、Q 空出來）', () => {
    const loaded = parseOld();
    expect(loaded).toEqual({
      ...PREVIOUS_DEFAULT_BINDINGS,
      // 玩家原本的剎車鍵（逗號）仍是主要鍵，倒車油門的鍵接在後面。
      brake: ['Comma', 'KeyS', 'ArrowDown'],
      gearToggle: ['KeyR'],
    });
    const migrated = loaded ?? DEFAULT_BINDINGS;
    for (const code of CONTROL_ACTIONS.flatMap((action) => PREVIOUS_DEFAULT_BINDINGS[action])) {
      expect(actionBoundTo(migrated, code), code).toBe(actionBoundTo(PREVIOUS_DEFAULT_BINDINGS, code));
    }
    // 補上去的切換檔位是當時的 R，不是現在預設的空白鍵；/、. 與空白鍵沒有被塞進來。
    for (const code of ['Slash', 'Period', 'Space']) {
      expect(actionBoundTo(migrated, code), code).toBeUndefined();
    }
    expect(actionBoundTo(migrated, 'KeyQ')).toBeUndefined();
    for (const removed of REMOVED) {
      expect(migrated).not.toHaveProperty(removed);
    }
  });

  test('讀得進來、不算壞檔：存檔還在，玩家改過的鍵照舊', () => {
    const legacy = { ...OLD_DEFAULTS, throttle: ['KeyI', 'ArrowUp'], restart: ['Enter', 'KeyT'] };
    const storage = memoryStorage({ [CONTROLS_STORAGE_KEY]: stored(legacy) });
    const loaded = loadBindings(storage);
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(true);
    expect(loaded.throttle).toEqual(['KeyI', 'ArrowUp']);
    expect(loaded.restart).toEqual(['Enter', 'KeyT']);
    expect(loaded.gearToggle).toEqual(['KeyR']);
    expect(Object.keys(loaded).sort()).toEqual([...CONTROL_ACTIONS].sort());
  });

  test('玩家自訂的剎車鍵不動：倒車油門的鍵接在後面，放得下幾個算幾個', () => {
    expect(parseOld({ brake: ['Space'] })?.brake).toEqual(['Space', 'KeyS', 'ArrowDown']);
    // 原本就有兩個剎車鍵：只放得下一個，↓ 空出來。
    const two = parseOld({ brake: ['Comma', 'Space'] });
    expect(two?.brake).toEqual(['Comma', 'Space', 'KeyS']);
    expect(actionBoundTo(two ?? DEFAULT_BINDINGS, 'ArrowDown')).toBeUndefined();
    // 倒車油門改綁過：跟著過來的是玩家綁的那個鍵。
    const custom = parseOld({ reverse: ['KeyK'] });
    expect(custom?.brake).toEqual(['Comma', 'KeyK']);
    expect(actionBoundTo(custom ?? DEFAULT_BINDINGS, 'KeyS')).toBeUndefined();
  });

  test('R 沒人用：切換檔位補上那一版預設的 R（即使掛 R 檔原本改綁到別的鍵）', () => {
    const loaded = parseOld({ gearReverse: ['KeyE'], gearDrive: ['KeyG'] });
    expect(loaded?.gearToggle).toEqual(['KeyR']);
    expect(actionBoundTo(loaded ?? DEFAULT_BINDINGS, 'KeyE')).toBeUndefined();
    expect(actionBoundTo(loaded ?? DEFAULT_BINDINGS, 'KeyG')).toBeUndefined();
  });

  test('R 已經綁給別的動作：不製造衝突，改用玩家原本掛 R 檔的鍵', () => {
    const loaded = parseOld({ gearReverse: ['KeyE'], restart: ['KeyR', 'KeyT'] });
    expect(loaded?.restart).toEqual(['KeyR', 'KeyT']);
    expect(loaded?.gearToggle).toEqual(['KeyE']);
    const codes = CONTROL_ACTIONS.flatMap((action) => (loaded ?? DEFAULT_BINDINGS)[action]);
    expect(new Set(codes).size).toBe(codes.length);
  });

  test('R 被倒車油門佔著：R 變成剎車鍵，切換檔位用原本掛 R 檔的鍵', () => {
    const loaded = parseOld({ reverse: ['KeyR'], gearReverse: ['KeyE'] });
    expect(loaded?.brake).toEqual(['Comma', 'KeyR']);
    expect(loaded?.gearToggle).toEqual(['KeyE']);
  });

  test('候選的順序：R → 原本掛 R 檔的鍵 → 原本掛 D 檔的鍵 → G → 字母鍵 A–Z 裡第一個沒人用的', () => {
    const taken = { restart: ['KeyR', 'KeyT'] };
    // 掛 R 檔那一項壞了（不看）：用掛 D 檔的鍵。
    expect(parseOld({ ...taken, gearReverse: 'KeyE' })?.gearToggle).toEqual(['KeyQ']);
    // 兩項都沒有：G。
    expect(parseOld({ ...taken, gearReverse: undefined, gearDrive: undefined })?.gearToggle).toEqual(['KeyG']);
    // G 也被佔了：A 是左轉，B 是第一個沒人用的字母。
    expect(
      parseOld({ ...taken, gearReverse: undefined, gearDrive: undefined, pause: ['Escape', 'KeyG'] })
        ?.gearToggle,
    ).toEqual(['KeyB']);
  });

  test.each<[string, unknown]>([
    ['不是陣列', 'KeyS'],
    ['空的', []],
    ['不是字串', [7]],
    ['不能綁的鍵', ['Tab']],
    ['null', null],
    ['沒有這一項', undefined],
  ])('已移除動作那幾項的內容壞了（%s）：不算壞檔，只是沒有鍵可以帶過來', (_name, value) => {
    const loaded = parseOld({ reverse: value, gearDrive: value, gearReverse: value });
    expect(loaded).toEqual({ ...PREVIOUS_DEFAULT_BINDINGS, brake: ['Comma'], gearToggle: ['KeyR'] });
  });

  test('倒車油門的鍵與留下來的鍵重複（手改過的存檔）：那個鍵不帶過來，不算壞檔', () => {
    const loaded = parseOld({ reverse: ['KeyW', 'ArrowDown'] });
    expect(loaded?.throttle).toEqual(['KeyW', 'ArrowUp']);
    expect(loaded?.brake).toEqual(['Comma', 'ArrowDown']);
  });

  test('現有的動作有問題仍然是壞檔', () => {
    expect(parseOld({ brake: undefined })).toBeUndefined();
    expect(parseOld({ brake: [] })).toBeUndefined();
    expect(parseOld({ restart: ['KeyW'] })).toBeUndefined();
    const storage = memoryStorage({ [CONTROLS_STORAGE_KEY]: stored({ ...OLD_DEFAULTS, pause: ['Tab'] }) });
    expect(loadBindings(storage)).toBe(DEFAULT_BINDINGS);
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(false);
  });

  test('更舊的存檔同時還有 handbrake：一樣讀得進來', () => {
    const loaded = parseOld({ handbrake: ['Slash', 'Space'], brake: ['KeyB'] });
    expect(loaded).toEqual({
      ...PREVIOUS_DEFAULT_BINDINGS,
      brake: ['KeyB', 'KeyS', 'ArrowDown'],
      gearToggle: ['KeyR'],
    });
  });

  test('已經有 gearToggle 的存檔：多出來的舊欄位只是丟掉，不會再併進剎車', () => {
    const current = { ...DEFAULT_BINDINGS, brake: ['KeyB'], gearToggle: ['KeyG'] };
    expect(
      parseBindings({ version: CONTROLS_VERSION, bindings: { ...current, reverse: ['KeyK'], gearReverse: ['KeyE'] } }),
    ).toEqual(current);
  });

  test('讀進來再存：寫回去的內容沒有已移除的動作，有 gearToggle，再讀一次還是一樣', () => {
    const legacy = { ...OLD_DEFAULTS, gearReverse: ['KeyE'], restart: ['KeyR', 'KeyT'] };
    const storage = memoryStorage({ [CONTROLS_STORAGE_KEY]: stored(legacy) });
    const loaded = loadBindings(storage);
    saveBindings(storage, loaded);
    const text = storage.items.get(CONTROLS_STORAGE_KEY) ?? 'null';
    const saved = JSON.parse(text) as { readonly bindings: Record<string, unknown> };
    expect(Object.keys(saved.bindings).sort()).toEqual([...CONTROL_ACTIONS].sort());
    for (const removed of REMOVED) {
      expect(saved.bindings).not.toHaveProperty(removed);
    }
    expect(saved.bindings.gearToggle).toEqual(['KeyE']);
    expect(loadBindings(storage)).toEqual(loaded);
  });
});

describe('舊存檔遷移：內容正好是上一版官方預設', () => {
  test('上一版官方預設（W／↑、S／↓／逗號、R）→ 現在的預設，那一筆刪掉，別的鍵不動', () => {
    const storage = memoryStorage({
      [CONTROLS_STORAGE_KEY]: stored(PREVIOUS_DEFAULT_BINDINGS),
      other: 'keep',
    });
    const loaded = loadBindings(storage);
    expect(loaded).toBe(DEFAULT_BINDINGS);
    expect(loaded.throttle).toEqual(['Slash', 'KeyW', 'ArrowUp']);
    expect(loaded.brake).toEqual(['Period', 'KeyS', 'ArrowDown']);
    expect(loaded.gearToggle).toEqual(['Space', 'KeyR']);
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(false);
    expect(storage.items.get('other')).toBe('keep');
    // 之後跟著預設走：再讀還是預設，存預設也不會留檔。
    expect(loadBindings(storage)).toBe(DEFAULT_BINDINGS);
    saveBindings(storage, loaded);
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(false);
  });

  test('只改過油門的舊存檔：原樣保留，其他動作不會被換成新的預設，存檔還在', () => {
    const custom = { ...PREVIOUS_DEFAULT_BINDINGS, throttle: ['KeyI', 'ArrowUp'] };
    const text = stored(custom);
    const storage = memoryStorage({ [CONTROLS_STORAGE_KEY]: text });
    const loaded = loadBindings(storage);
    expect(loaded).toEqual(custom);
    expect(loaded.brake).toEqual(['KeyS', 'ArrowDown', 'Comma']);
    expect(loaded.gearToggle).toEqual(['KeyR']);
    for (const code of ['Slash', 'Period', 'Space']) {
      expect(actionBoundTo(loaded, code), code).toBeUndefined();
    }
    expect(storage.items.get(CONTROLS_STORAGE_KEY)).toBe(text);
  });

  test.each<[string, Partial<Record<keyof ControlBindings, readonly string[]>>]>([
    ['少一個備用鍵', { brake: ['KeyS', 'ArrowDown'] }],
    ['順序不同', { brake: ['Comma', 'KeyS', 'ArrowDown'] }],
    ['多一個備用鍵', { gearToggle: ['KeyR', 'KeyG'] }],
    ['改了與這次無關的動作', { toggleCamera: ['KeyC'] }],
    ['自己先把空白鍵綁成切換檔位', { gearToggle: ['Space'] }],
  ])('與上一版預設只差一點（%s）也是自訂：原樣保留', (_name, change) => {
    const custom = { ...PREVIOUS_DEFAULT_BINDINGS, ...change };
    const storage = memoryStorage({ [CONTROLS_STORAGE_KEY]: stored(custom) });
    expect(loadBindings(storage)).toEqual(custom);
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(true);
  });

  test('存檔會記下是在哪一版預設底下改的；上一版寫的存檔沒有這一欄', () => {
    const storage = memoryStorage();
    saveBindings(storage, { ...DEFAULT_BINDINGS, brake: ['KeyB'] });
    const saved: unknown = JSON.parse(storage.items.get(CONTROLS_STORAGE_KEY) ?? 'null');
    expect(saved).toEqual({
      version: CONTROLS_VERSION,
      defaultsRevision: DEFAULTS_REVISION,
      bindings: { ...DEFAULT_BINDINGS, brake: ['KeyB'] },
    });
    expect(DEFAULTS_REVISION).toBe(2);
    expect(stored(PREVIOUS_DEFAULT_BINDINGS)).not.toContain('defaultsRevision');
  });

  test('在現在的預設底下自己改回上一版的鍵位：那是玩家的選擇，重新載入後還在', () => {
    const storage = memoryStorage();
    saveBindings(storage, PREVIOUS_DEFAULT_BINDINGS);
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(true);
    expect(loadBindings(storage)).toEqual(PREVIOUS_DEFAULT_BINDINGS);
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(true);
  });

  test.each<[string, unknown]>([
    ['比現在舊的版號', 1],
    ['不是數字', '2'],
    ['null', null],
  ])('defaultsRevision 是%s：當成舊存檔，上一版預設照樣改走新預設', (_name, defaultsRevision) => {
    const storage = memoryStorage({
      [CONTROLS_STORAGE_KEY]: JSON.stringify({
        version: CONTROLS_VERSION,
        defaultsRevision,
        bindings: PREVIOUS_DEFAULT_BINDINGS,
      }),
    });
    expect(loadBindings(storage)).toBe(DEFAULT_BINDINGS);
    expect(storage.items.has(CONTROLS_STORAGE_KEY)).toBe(false);
  });

  test('改走新預設之後玩家再改鍵：存的是以新預設為底的綁定', () => {
    const storage = memoryStorage({ [CONTROLS_STORAGE_KEY]: stored(PREVIOUS_DEFAULT_BINDINGS) });
    const next = rebound(loadBindings(storage), 'toggleCamera', 0, 'KeyC');
    saveBindings(storage, next);
    expect(loadBindings(storage)).toEqual({ ...DEFAULT_BINDINGS, toggleCamera: ['KeyC'] });
  });

  test('storage 刪不掉（丟例外）：照樣用新的預設，不會壞', () => {
    const storage: ControlsStorage = {
      getItem: () => stored(PREVIOUS_DEFAULT_BINDINGS),
      setItem: () => undefined,
      removeItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadBindings(storage)).toBe(DEFAULT_BINDINGS);
  });
});

describe('keyLabel：鍵帽上的字', () => {
  test('字母與數字直接寫；方向鍵是箭頭；符號鍵寫符號', () => {
    expect(keyLabel('KeyW')).toEqual({ text: 'W' });
    expect(keyLabel('Digit7')).toEqual({ text: '7' });
    expect(keyLabel('ArrowLeft')).toEqual({ text: '←' });
    expect(keyLabel('Comma')).toEqual({ text: ',' });
    expect(keyLabel('Slash')).toEqual({ text: '/' });
    expect(keyLabel('Period')).toEqual({ text: '.' });
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
