// 翻譯查詢、語言偵測與即時切換。不碰 DOM：網址與瀏覽器語言由呼叫端傳入，
// 「切換後要更新畫面」由呼叫端用 onLocaleChange 訂閱。
import en from '../locale/en.json';
import zhTW from '../locale/zh-TW.json';

/** 翻譯鍵由 zh-TW.json 推導；打錯鍵會編譯失敗。 */
export type TranslationKey = keyof typeof zhTW;

/** 支援的語言；值同時是 `?lang=` 的參數值與 `<html lang>` 的值。 */
export const LOCALES = ['zh-TW', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/** 每種語言都必須有全部的鍵；en.json 少鍵會在這裡編譯失敗。 */
const MESSAGES: Record<Locale, Record<TranslationKey, string>> = {
  'zh-TW': zhTW,
  en,
};

/** 網址指定語言的參數名（`?lang=zh-TW`、`?lang=en`）。 */
const LANG_PARAM = 'lang';

/** 瀏覽器語言以這個開頭就用繁體中文，其餘一律英文。 */
const CHINESE_LANGUAGE_PREFIX = 'zh';

let currentLocale: Locale = 'en';
const listeners: (() => void)[] = [];

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * 決定預設語言：網址的 `?lang=` 優先（必須剛好是支援的值），
 * 否則看瀏覽器語言（`zh` 開頭 → zh-TW，其餘 → en）。
 */
export function detectLocale(urlSearch: string, browserLanguage: string): Locale {
  const requested = new URLSearchParams(urlSearch).get(LANG_PARAM);
  if (requested !== null && isLocale(requested)) {
    return requested;
  }
  return browserLanguage.toLowerCase().startsWith(CHINESE_LANGUAGE_PREFIX) ? 'zh-TW' : 'en';
}

export function getLocale(): Locale {
  return currentLocale;
}

/** 切換語言並通知訂閱者；語言沒變就不通知。本階段不記住選擇。 */
export function setLocale(locale: Locale): void {
  if (locale === currentLocale) {
    return;
  }
  currentLocale = locale;
  for (const listener of listeners) {
    listener();
  }
}

/** 語言切換後呼叫 listener。 */
export function onLocaleChange(listener: () => void): void {
  listeners.push(listener);
}

/** 目前語言下這個鍵的文字。 */
export function t(key: TranslationKey): string {
  return MESSAGES[currentLocale][key];
}
