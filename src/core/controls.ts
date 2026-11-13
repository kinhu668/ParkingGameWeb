// 按鍵綁定：可以綁的動作、預設鍵位、重綁規則（同一個鍵不能綁兩個動作）、鍵帽上的字、localStorage 存檔。
// 純邏輯，不碰 DOM：Storage 由呼叫端注入。一律用 KeyboardEvent.code（實體鍵位）。
// 壞掉的存檔（不是 JSON、形狀不對、版本不符、有鍵重複）整份丟掉並回到預設。
import type { TranslationKey } from './i18n';

/** 可以綁鍵的動作，照設定畫面的顯示順序。 */
export const CONTROL_ACTIONS = [
  'throttle',
  'steerLeft',
  'steerRight',
  'brake',
  'gearToggle',
  'restart',
  'toggleCamera',
  'pause',
] as const;

export type ControlAction = (typeof CONTROL_ACTIONS)[number];

/** 動作 → 按鍵清單（1 到 MAX_KEYS_PER_ACTION 個）。 */
export type ControlBindings = Readonly<Record<ControlAction, readonly string[]>>;

/** 一個動作最多綁幾個鍵（主要鍵＋備用鍵）。 */
export const MAX_KEYS_PER_ACTION = 3;

/**
 * 預設鍵位。油門是 W／↑，往哪邊走看檔位；S／↓ 與逗號都是剎車。
 * R 是切換 D／R 檔，所以重來是 Backspace／T。Q、空白鍵與 `/ ?` 那一顆預設不綁任何動作，玩家可以自己拿去綁。
 */
export const DEFAULT_BINDINGS: ControlBindings = {
  throttle: ['KeyW', 'ArrowUp'],
  steerLeft: ['KeyA', 'ArrowLeft'],
  steerRight: ['KeyD', 'ArrowRight'],
  brake: ['KeyS', 'ArrowDown', 'Comma'],
  gearToggle: ['KeyR'],
  restart: ['Backspace', 'KeyT'],
  toggleCamera: ['KeyV'],
  pause: ['Escape'],
};

/** localStorage 的鍵；格式改到不相容時換成 v2，舊檔就自然被丟掉。 */
export const CONTROLS_STORAGE_KEY = 'parkinggame.controls.v1';

/** 存檔內容的版本；讀到別的版本當作壞檔。 */
export const CONTROLS_VERSION = 1;

/** 讀、寫、刪；測試可以注入同樣形狀的物件。 */
export type ControlsStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** 不能綁的鍵：修飾鍵（帶修飾鍵的按鍵是瀏覽器快捷鍵，遊戲不收）、Tab（移動焦點）、選單鍵。 */
const UNBINDABLE_CODES: readonly string[] = [
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'OSLeft',
  'OSRight',
  'Tab',
  'ContextMenu',
  'Unidentified',
];

/** KeyboardEvent.code 的樣子：英數字，不會太長。存檔裡的值也要過這一關。 */
const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,31}$/;

/** 功能鍵（F1–F24）留給瀏覽器。 */
const FUNCTION_KEY_PATTERN = /^F\d{1,2}$/;

/** 這個鍵能不能拿來綁。 */
export function isBindableCode(code: string): boolean {
  return (
    CODE_PATTERN.test(code) && !FUNCTION_KEY_PATTERN.test(code) && !UNBINDABLE_CODES.includes(code)
  );
}

/** 這個鍵目前綁在哪個動作上；沒人用是 undefined。 */
export function actionBoundTo(bindings: ControlBindings, code: string): ControlAction | undefined {
  return CONTROL_ACTIONS.find((action) => bindings[action].includes(code));
}

/** 兩份綁定是不是完全一樣（每個動作的鍵與順序都相同）。 */
export function bindingsEqual(a: ControlBindings, b: ControlBindings): boolean {
  return CONTROL_ACTIONS.every(
    (action) =>
      a[action].length === b[action].length &&
      a[action].every((code, index) => code === b[action][index]),
  );
}

/** 重綁的結果：成功（新的綁定）、這個鍵已經是別的動作的（擋下來）、這個鍵不能綁。 */
export type RebindResult =
  | { readonly kind: 'ok'; readonly bindings: ControlBindings }
  | { readonly kind: 'conflict'; readonly action: ControlAction }
  | { readonly kind: 'unsupported' };

/**
 * 把 action 的第 slot 個鍵換成 code；slot 等於目前的鍵數就是多加一個備用鍵。
 * 同一個鍵不能綁兩個動作（同一個動作的另一格也算）：回報衝突，綁定不變，玩家要先把那個動作改掉。
 * 換成原本的鍵算成功（什麼都沒變）。
 */
export function rebind(
  bindings: ControlBindings,
  action: ControlAction,
  slot: number,
  code: string,
): RebindResult {
  const codes = bindings[action];
  if (!isBindableCode(code) || !Number.isInteger(slot) || slot < 0) {
    return { kind: 'unsupported' };
  }
  if (slot > codes.length || slot >= MAX_KEYS_PER_ACTION) {
    return { kind: 'unsupported' };
  }
  if (codes[slot] === code) {
    return { kind: 'ok', bindings };
  }
  const owner = actionBoundTo(bindings, code);
  if (owner !== undefined) {
    return { kind: 'conflict', action: owner };
  }
  const next = [...codes];
  next[slot] = code;
  return { kind: 'ok', bindings: { ...bindings, [action]: next } };
}

/** 拿掉 action 的備用鍵（最後一個）；只剩一個鍵時不動，每個動作至少要有一個鍵。 */
export function clearExtraKey(bindings: ControlBindings, action: ControlAction): ControlBindings {
  const codes = bindings[action];
  if (codes.length <= 1) {
    return bindings;
  }
  return { ...bindings, [action]: codes.slice(0, -1) };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 舊版存檔裡一個已移除動作的鍵：只留能綁的字串，其他的不看（那一項本來就要丟掉，不因為它算壞檔）。 */
function legacyCodes(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return (value as readonly unknown[]).filter(
    (code): code is string => typeof code === 'string' && isBindableCode(code),
  );
}

/** A–Z 的字母鍵：舊存檔補「切換檔位」時最後的候選，一定挑得到一個沒人用的。 */
const LETTER_CODES: readonly string[] = Array.from(
  { length: 26 },
  (_, index) => `Key${String.fromCharCode('A'.charCodeAt(0) + index)}`,
);

/**
 * 舊存檔（沒有 `gearToggle`）補上「切換檔位」的鍵，不能與已經讀進來的鍵衝突。依序挑第一個沒人用的：
 * 預設的 R → 玩家原本掛 R 檔的鍵 → 原本掛 D 檔的鍵 → G → 字母鍵 A–Z。
 */
function legacyGearToggleCode(
  saved: Readonly<Record<string, unknown>>,
  used: ReadonlySet<string>,
): string | undefined {
  const candidates = [
    ...DEFAULT_BINDINGS.gearToggle,
    ...legacyCodes(saved.gearReverse),
    ...legacyCodes(saved.gearDrive),
    'KeyG',
    ...LETTER_CODES,
  ];
  return candidates.find((code) => !used.has(code));
}

/**
 * 驗證 JSON.parse 出來的內容。任何一處不合格就整份不要（回傳 undefined）：
 * 少了動作、鍵數不對、不能綁的鍵、同一個鍵出現兩次都算壞檔。多出來的欄位會被丟掉。
 * 舊版存檔裡已經移除的動作就是這樣遷移的：那一項不留（不算壞檔），其他綁定照舊；
 * 下次存檔寫的是這裡回傳的內容，不會再有它們。
 * - `handbrake`：不看也不留，它原本佔的鍵空出來可以重綁。
 * - 沒有 `gearToggle` 的存檔是「油門／倒車油門、掛 D、掛 R」那一版的：
 *   `reverse`（倒車油門）的鍵現在是剎車，接在玩家原本的剎車鍵後面，放得下幾個算幾個（原本的剎車鍵不動）；
 *   `gearDrive`、`gearReverse` 丟掉，補上 `gearToggle`（見 legacyGearToggleCode）。
 */
export function parseBindings(raw: unknown): ControlBindings | undefined {
  if (!isPlainObject(raw) || raw.version !== CONTROLS_VERSION || !isPlainObject(raw.bindings)) {
    return undefined;
  }
  const saved = raw.bindings;
  const legacy = saved.gearToggle === undefined;
  const seen = new Set<string>();
  const parsed: Partial<Record<ControlAction, string[]>> = {};
  for (const action of CONTROL_ACTIONS) {
    if (legacy && action === 'gearToggle') {
      continue;
    }
    const codes: unknown = saved[action];
    if (!Array.isArray(codes) || codes.length < 1 || codes.length > MAX_KEYS_PER_ACTION) {
      return undefined;
    }
    const accepted: string[] = [];
    for (const code of codes as readonly unknown[]) {
      if (typeof code !== 'string' || !isBindableCode(code) || seen.has(code)) {
        return undefined;
      }
      seen.add(code);
      accepted.push(code);
    }
    parsed[action] = accepted;
  }
  if (legacy) {
    const brake = parsed.brake ?? [];
    for (const code of legacyCodes(saved.reverse)) {
      if (brake.length < MAX_KEYS_PER_ACTION && !seen.has(code)) {
        seen.add(code);
        brake.push(code);
      }
    }
    const toggle = legacyGearToggleCode(saved, seen);
    if (toggle === undefined) {
      return undefined;
    }
    parsed.gearToggle = [toggle];
  }
  // 每個動作都填過了，才走得到這裡。
  return parsed as ControlBindings;
}

/** 讀綁定；沒存過、沒有 storage → 預設。壞檔 → 刪掉那一筆並回到預設。 */
export function loadBindings(storage: ControlsStorage | undefined): ControlBindings {
  try {
    const text = storage?.getItem(CONTROLS_STORAGE_KEY) ?? null;
    if (text === null) {
      return DEFAULT_BINDINGS;
    }
    let parsed: ControlBindings | undefined;
    try {
      const raw: unknown = JSON.parse(text);
      parsed = parseBindings(raw);
    } catch {
      parsed = undefined;
    }
    if (parsed === undefined) {
      storage?.removeItem(CONTROLS_STORAGE_KEY);
      return DEFAULT_BINDINGS;
    }
    return parsed;
  } catch {
    // 無痕模式或停用儲存時 getItem／removeItem 會丟例外：照預設玩，只是不保存。
    return DEFAULT_BINDINGS;
  }
}

/** 存綁定。與預設完全相同就不留存檔（之後預設若調整，沒改過鍵的玩家會跟著走）。 */
export function saveBindings(storage: ControlsStorage | undefined, bindings: ControlBindings): void {
  try {
    if (bindingsEqual(bindings, DEFAULT_BINDINGS)) {
      storage?.removeItem(CONTROLS_STORAGE_KEY);
      return;
    }
    storage?.setItem(
      CONTROLS_STORAGE_KEY,
      JSON.stringify({ version: CONTROLS_VERSION, bindings }),
    );
  } catch {
    // 存不進去（停用儲存、空間滿了）：這一次的綁定仍然有效，只是重新整理後會回到舊的。
  }
}

/** 鍵帽上的字：直接寫的文字，或有名字的鍵（空白鍵）走翻譯鍵。 */
export type KeyLabel = { readonly text: string } | { readonly key: TranslationKey };

/** 有固定寫法的鍵。 */
const NAMED_KEY_TEXT: Readonly<Record<string, string>> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
  ShiftLeft: 'L Shift',
  ShiftRight: 'R Shift',
  CapsLock: 'Caps',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  Delete: 'Del',
  Insert: 'Ins',
};

/** 這個鍵在鍵帽上怎麼寫：字母與數字直接寫，方向鍵用箭頭，其餘沒有列的就用 code 本身。 */
export function keyLabel(code: string): KeyLabel {
  if (code === 'Space') {
    return { key: 'hud.keySpace' };
  }
  const named = NAMED_KEY_TEXT[code];
  if (named !== undefined) {
    return { text: named };
  }
  const letter = /^Key([A-Z])$/.exec(code)?.[1];
  if (letter !== undefined) {
    return { text: letter };
  }
  const digit = /^Digit(\d)$/.exec(code)?.[1];
  if (digit !== undefined) {
    return { text: digit };
  }
  const numpad = /^Numpad(.+)$/.exec(code)?.[1];
  if (numpad !== undefined) {
    return { text: `Num ${numpad}` };
  }
  return { text: code };
}
