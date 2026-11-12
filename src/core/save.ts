// 存檔：每關的最佳星數與最佳時間，加上設定（目前只有語言）。
// 不碰 DOM：Storage 由呼叫端注入（瀏覽器是 localStorage，測試給同樣形狀的物件）。
// 壞資料（不是 JSON、形狀不對、版本不符）一律當作沒存檔；storage 不能用時遊戲照常，只是不保存。
// 「已解鎖」不存在這裡：它由各關星數推導（level/progress.ts），存檔只有一個事實來源。
import { isLocale, type Locale } from './i18n';

/** localStorage 的鍵；格式改到不相容時換成 v2，舊檔就自然被當作沒存檔。 */
export const SAVE_STORAGE_KEY = 'parkinggame.save.v1';

/** 存檔內容的版本；讀到別的版本當作沒存檔。 */
export const SAVE_VERSION = 1;

/** 只用到讀與寫；測試可以注入同樣形狀的物件，不必碰全域 localStorage。 */
export type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** 一關最多幾顆星。 */
const MAX_STARS = 3;

/** 存下來的星數：過關才會有紀錄，所以至少 1 顆。 */
export type SavedStars = 1 | 2 | 3;

/** 一關的最佳紀錄。星數與時間各自取最好的，不一定來自同一次過關。 */
export interface LevelRecord {
  readonly stars: SavedStars;
  /** 最佳成績時間（秒）。 */
  readonly bestTimeS: number;
}

/** 設定。之後的畫質、鏡頭也併進來。 */
export interface SaveSettings {
  /** 玩家用語言按鈕選的語言；沒選過就沒有這個欄位。 */
  readonly locale?: Locale;
}

export interface SaveData {
  readonly version: typeof SAVE_VERSION;
  /** 關卡 id → 最佳紀錄；沒過關的關不在裡面。 */
  readonly levels: Readonly<Record<string, LevelRecord>>;
  readonly settings: SaveSettings;
}

/** 沒存檔時的內容。 */
export const EMPTY_SAVE: SaveData = { version: SAVE_VERSION, levels: {}, settings: {} };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSavedStars(value: unknown): value is SavedStars {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_STARS;
}

function parseLevelRecord(raw: unknown): LevelRecord | undefined {
  if (!isPlainObject(raw)) {
    return undefined;
  }
  const { stars, bestTimeS } = raw;
  if (!isSavedStars(stars)) {
    return undefined;
  }
  if (typeof bestTimeS !== 'number' || !Number.isFinite(bestTimeS) || bestTimeS < 0) {
    return undefined;
  }
  return { stars, bestTimeS };
}

/**
 * 驗證 JSON.parse 出來的內容。任何一處不合格就整份不要（回傳 undefined）：
 * 寧可從頭開始，也不要讀進一份半對半錯的進度。多出來的欄位會被丟掉。
 */
export function parseSave(raw: unknown): SaveData | undefined {
  if (!isPlainObject(raw) || raw.version !== SAVE_VERSION) {
    return undefined;
  }
  if (!isPlainObject(raw.levels) || !isPlainObject(raw.settings)) {
    return undefined;
  }

  const levels: Record<string, LevelRecord> = {};
  for (const [id, rawRecord] of Object.entries(raw.levels)) {
    const record = parseLevelRecord(rawRecord);
    if (record === undefined) {
      return undefined;
    }
    levels[id] = record;
  }

  const { locale } = raw.settings;
  if (locale === undefined) {
    return { version: SAVE_VERSION, levels, settings: {} };
  }
  if (typeof locale !== 'string' || !isLocale(locale)) {
    return undefined;
  }
  return { version: SAVE_VERSION, levels, settings: { locale } };
}

/** 讀存檔；沒存過、壞資料、沒有 storage 或讀取丟例外 → 空的存檔。 */
export function loadSave(storage: SaveStorage | undefined): SaveData {
  try {
    const text = storage?.getItem(SAVE_STORAGE_KEY) ?? null;
    if (text === null) {
      return EMPTY_SAVE;
    }
    const raw: unknown = JSON.parse(text);
    return parseSave(raw) ?? EMPTY_SAVE;
  } catch {
    // 無痕模式或停用儲存時 getItem 會丟例外；不是 JSON 時 JSON.parse 會丟例外。都當作沒存檔。
    return EMPTY_SAVE;
  }
}

/** 寫存檔。回傳有沒有寫成功；沒有 storage 或寫入失敗（額度滿、停用儲存）不影響遊戲。 */
export function storeSave(storage: SaveStorage | undefined, save: SaveData): boolean {
  if (storage === undefined) {
    return false;
  }
  try {
    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

/**
 * 讀出目前的存檔、套用 change、寫回去，回傳新的內容。
 * 每次都重新讀：另一個分頁剛寫進去的進度不會被這個分頁的舊資料蓋掉。
 */
export function updateSave(
  storage: SaveStorage | undefined,
  change: (save: SaveData) => SaveData,
): SaveData {
  const next = change(loadSave(storage));
  storeSave(storage, next);
  return next;
}

/** 這一關的最佳紀錄；沒過關就是 undefined。用 hasOwn，`toString` 之類的 id 不會誤中。 */
export function levelRecord(save: SaveData, levelId: string): LevelRecord | undefined {
  return Object.hasOwn(save.levels, levelId) ? save.levels[levelId] : undefined;
}

/** 記住玩家選的語言。 */
export function withLocale(save: SaveData, locale: Locale): SaveData {
  return { ...save, settings: { ...save.settings, locale } };
}
