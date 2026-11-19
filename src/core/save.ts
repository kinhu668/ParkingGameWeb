// 存檔：每關的最佳星數、最佳時間與曾經拿過的挑戰，加上設定（語言、音效）。
// 不碰 DOM：Storage 由呼叫端注入（瀏覽器是 localStorage，測試給同樣形狀的物件）。
// 關卡重做過的話（levelsRevision 比現在舊），讀檔時把那幾關的舊紀錄清掉一次，其他的照留。
// 壞資料（不是 JSON、形狀不對、版本不符）一律當作沒存檔（只有紀錄裡的 challenges 壞了是當作空的、設定裡的 audio 壞了是當作沒有）；storage 不能用時遊戲照常，只是不保存。
// 「已解鎖」不存在這裡：它由各關星數推導（level/progress.ts），存檔只有一個事實來源。
import { isLocale, type Locale } from './i18n';

/** localStorage 的鍵；格式改到不相容時換成 v2，舊檔就自然被當作沒存檔。 */
export const SAVE_STORAGE_KEY = 'parkinggame.save.v1';

/** 存檔內容的版本；讀到別的版本當作沒存檔。 */
export const SAVE_VERSION = 1;

/**
 * 關卡內容的版次。重做關卡（同一個 id 換成完全不同的場地）時加 1，並把重做的 id 列進 REDESIGNED_LEVELS：
 * 舊場地拿到的星數、時間與挑戰不該掛在新場地上。
 * 1 = 最初的 10 關（存檔裡沒有這個欄位）；2 = 2026-11 第 1 世界 10 關全部重做。
 */
export const LEVELS_REVISION = 2;

/** 每一次重做：存檔的版次比 revision 舊，就清掉 ids 這幾關的紀錄。 */
const REDESIGNED_LEVELS: readonly { readonly revision: number; readonly ids: readonly string[] }[] = [
  {
    revision: 2,
    ids: ['w1_l01', 'w1_l02', 'w1_l03', 'w1_l04', 'w1_l05', 'w1_l06', 'w1_l07', 'w1_l08', 'w1_l09', 'w1_l10'],
  },
];

/** 只用到讀與寫；測試可以注入同樣形狀的物件，不必碰全域 localStorage。 */
export type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** 一關最多幾顆星。 */
const MAX_STARS = 3;

/** 存下來的星數：過關才會有紀錄，所以至少 1 顆。 */
export type SavedStars = 1 | 2 | 3;

/** 一關的最佳紀錄。星數、時間與挑戰各自取最好的，不一定來自同一次過關。 */
export interface LevelRecord {
  readonly stars: SavedStars;
  /** 最佳成績時間（秒）。 */
  readonly bestTimeS: number;
  /**
   * 曾經拿過的挑戰 id（歷次過關的聯集，不重複）。加這個欄位之前存的紀錄沒有它，讀進來是空的。
   * 存的是字串：這一版不認得的 id 照樣留著（之後的版本可能有）。
   */
  readonly challenges: readonly string[];
}

/** 音效設定：主音量、是否靜音、要不要背景音樂。 */
export interface AudioSettings {
  /** 主音量：0–100 的整數。 */
  readonly volume: number;
  readonly muted: boolean;
  /** 背景音樂開著（靜音時一樣沒有音樂）。 */
  readonly music: boolean;
}

/** 音量的上限。 */
export const MAX_VOLUME = 100;

/** 沒調過音效時的預設：七成音量、不靜音、有背景音樂（本來就要玩家第一次操作之後才會出聲）。 */
export const DEFAULT_AUDIO: AudioSettings = { volume: 70, muted: false, music: true };

/** 設定。之後的畫質、鏡頭也併進來。 */
export interface SaveSettings {
  /** 玩家用語言按鈕選的語言；沒選過就沒有這個欄位。 */
  readonly locale?: Locale;
  /** 玩家調過的音量與靜音；沒調過就沒有這個欄位（用 DEFAULT_AUDIO）。加這個欄位之前的存檔沒有它。 */
  readonly audio?: AudioSettings;
}

export interface SaveData {
  readonly version: typeof SAVE_VERSION;
  /** 這份存檔的紀錄是哪一版關卡內容拿到的（見 LEVELS_REVISION）。 */
  readonly levelsRevision: number;
  /** 關卡 id → 最佳紀錄；沒過關的關不在裡面。 */
  readonly levels: Readonly<Record<string, LevelRecord>>;
  readonly settings: SaveSettings;
}

/** 沒存檔時的內容。 */
export const EMPTY_SAVE: SaveData = {
  version: SAVE_VERSION,
  levelsRevision: LEVELS_REVISION,
  levels: {},
  settings: {},
};

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
  return { stars, bestTimeS, challenges: parseChallenges(raw.challenges) };
}

/**
 * 紀錄裡的 `challenges`：只留字串、重複的只留一個。沒有這個欄位（舊紀錄）或不是陣列 = 空的。
 * 這個欄位壞了不會讓整份存檔作廢：丟掉幾個打鉤，比連星數與時間一起丟掉好。
 */
function parseChallenges(raw: unknown): readonly string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return [...new Set(raw.filter((id): id is string => typeof id === 'string'))];
}

/**
 * 存檔裡的 `levelsRevision`：沒有這個欄位（加它之前存的）或不是正整數 = 1（最舊的一版）。
 * 這個欄位壞了不會讓整份存檔作廢：頂多多清一次重做過的關卡。
 */
function parseLevelsRevision(raw: unknown): number {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 ? raw : 1;
}

/**
 * 設定裡的 `audio`：不是物件、音量不是 0–100 的數字、muted 不是布林 = 當作沒有這個欄位（用預設值）。
 * 這個欄位壞了不會讓整份存檔作廢：重調一次音量，比丟掉全部進度好。音量取整。
 * `music` 是後來加的：沒有這一項（舊存檔）或不是布林就當作開著，其餘的設定照留。
 */
function parseAudio(raw: unknown): AudioSettings | undefined {
  if (!isPlainObject(raw)) {
    return undefined;
  }
  const { volume, muted, music } = raw;
  if (
    typeof volume !== 'number' ||
    !Number.isFinite(volume) ||
    volume < 0 ||
    volume > MAX_VOLUME ||
    typeof muted !== 'boolean'
  ) {
    return undefined;
  }
  return { volume: Math.round(volume), muted, music: music !== false };
}

/** 這個 id 的紀錄是不是在 savedRevision 之後重做過（舊場地的紀錄，要清掉）。 */
function isStaleRecord(levelId: string, savedRevision: number): boolean {
  return REDESIGNED_LEVELS.some(
    (redesign) => savedRevision < redesign.revision && redesign.ids.includes(levelId),
  );
}

/**
 * 驗證 JSON.parse 出來的內容。任何一處不合格就整份不要（回傳 undefined）：
 * 寧可從頭開始，也不要讀進一份半對半錯的進度。多出來的欄位會被丟掉。
 * 比現在舊的 levelsRevision：重做過的關卡的紀錄不讀進來，回傳的版次是現在的（下次寫檔就不會再清）。
 */
export function parseSave(raw: unknown): SaveData | undefined {
  if (!isPlainObject(raw) || raw.version !== SAVE_VERSION) {
    return undefined;
  }
  if (!isPlainObject(raw.levels) || !isPlainObject(raw.settings)) {
    return undefined;
  }

  const savedRevision = parseLevelsRevision(raw.levelsRevision);
  const levelsRevision = Math.max(savedRevision, LEVELS_REVISION);
  const levels: Record<string, LevelRecord> = {};
  for (const [id, rawRecord] of Object.entries(raw.levels)) {
    const record = parseLevelRecord(rawRecord);
    if (record === undefined) {
      return undefined;
    }
    if (!isStaleRecord(id, savedRevision)) {
      levels[id] = record;
    }
  }

  let settings: SaveSettings = {};
  const { locale } = raw.settings;
  if (locale !== undefined) {
    if (typeof locale !== 'string' || !isLocale(locale)) {
      return undefined;
    }
    settings = { locale };
  }
  const audio = parseAudio(raw.settings.audio);
  if (audio !== undefined) {
    settings = { ...settings, audio };
  }
  return { version: SAVE_VERSION, levelsRevision, levels, settings };
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

/** 存檔裡的音效設定；沒調過就是預設值。 */
export function savedAudio(save: SaveData): AudioSettings {
  return save.settings.audio ?? DEFAULT_AUDIO;
}

/** 記住音量與靜音。 */
export function withAudio(save: SaveData, audio: AudioSettings): SaveData {
  return { ...save, settings: { ...save.settings, audio } };
}
