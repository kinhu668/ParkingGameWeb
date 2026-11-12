// 把網址參數解析成有型別的啟動模式。不碰 DOM：查詢字串由呼叫端傳入。
// 優先順序：show > cam > bench > 一般遊戲。
// `?lang=` 不在這裡處理（i18n.detectLocale 負責），所以可以與任何模式並用。
// `?view=`（一般遊戲的初始鏡頭）也不在這裡：它不是啟動模式，由 cameraView.ts 解析。
// `?level=`（要進哪一關）同樣不是啟動模式：一般遊戲、`?cam`、`?bench` 都可以帶，由 parseLevelParam 解析。
// 一般遊戲沒帶 `?level=` 就是關卡選擇畫面；`?unlock=all` 讓那個畫面的每一關都可以點。
import { LANG_PARAM, type Locale } from './i18n';

/** `?cam=` 可用的固定鏡頭預設。 */
export const CAMERA_PRESETS = ['follow', 'top', 'spot_low'] as const;

export type CameraPreset = (typeof CAMERA_PRESETS)[number];

/** `?cam=` 沒給值或給了不認得的值時用的預設。 */
const DEFAULT_CAMERA_PRESET: CameraPreset = 'follow';

/** 啟動模式。 */
export type UrlMode =
  | { readonly kind: 'game' }
  /** 展示模式。id 原樣保留；認不認得由展示登錄表決定（不認得會顯示可用清單）。 */
  | { readonly kind: 'show'; readonly id: string }
  /** 固定鏡頭截圖：沿示範路線跑到 timeSeconds（≥ 0）後用 preset 鏡頭畫一幀。 */
  | { readonly kind: 'cam'; readonly preset: CameraPreset; readonly timeSeconds: number }
  | { readonly kind: 'bench' };

const SHOW_PARAM = 'show';
const CAM_PARAM = 'cam';
const CAM_TIME_PARAM = 't';
const BENCH_PARAM = 'bench';
const LEVEL_PARAM = 'level';
const UNLOCK_PARAM = 'unlock';
const FX_PARAM = 'fx';
const FX_OFF_VALUE = 'off';
/** `?unlock=` 只認這個值。 */
const UNLOCK_ALL_VALUE = 'all';

function isCameraPreset(value: string): value is CameraPreset {
  return (CAMERA_PRESETS as readonly string[]).includes(value);
}

/** `t` 的秒數：沒給、不是數字、無限大或負數一律當 0（示範路線的起點）。 */
function parseTimeSeconds(value: string | null): number {
  const seconds = Number(value ?? '');
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

/**
 * 由查詢字串（`window.location.search`）決定啟動模式。
 * 參數只要出現就算數：`?bench` 不必有值，`?show=`（空值）仍是展示模式。
 */
export function parseUrlMode(urlSearch: string): UrlMode {
  const params = new URLSearchParams(urlSearch);

  const showId = params.get(SHOW_PARAM);
  if (showId !== null) {
    return { kind: 'show', id: showId };
  }

  const cam = params.get(CAM_PARAM);
  if (cam !== null) {
    return {
      kind: 'cam',
      preset: isCameraPreset(cam) ? cam : DEFAULT_CAMERA_PRESET,
      timeSeconds: parseTimeSeconds(params.get(CAM_TIME_PARAM)),
    };
  }

  if (params.has(BENCH_PARAM)) {
    return { kind: 'bench' };
  }

  return { kind: 'game' };
}

/**
 * `?level=<id>`：網址指定的關卡 id（去掉前後空白，其餘原樣保留）。
 * 沒給或空值回傳 undefined。這裡只解析字串；id 認不認得由關卡目錄決定（levelCatalog.resolveLevelRequest）。
 */
export function parseLevelParam(urlSearch: string): string | undefined {
  const id = new URLSearchParams(urlSearch).get(LEVEL_PARAM)?.trim();
  return id === undefined || id === '' ? undefined : id;
}

/**
 * `?unlock=all`：關卡選擇畫面的每一關都可以點（人類驗收、截圖用）。
 * 只影響畫面，不寫入存檔；其他的值當作沒給。
 */
export function parseUnlockAllParam(urlSearch: string): boolean {
  return new URLSearchParams(urlSearch).get(UNLOCK_PARAM) === UNLOCK_ALL_VALUE;
}

/**
 * `?fx=off`：不建立會自己動的環境效果（落葉、雨絲、閃電），也不做跟車鏡頭的遮擋半透明，
 * 畫面在車不動時每一幀都相同（e2e 逐像素比對用）。
 * 其他的值當作沒給。不是啟動模式，不影響 parseUrlMode。
 */
export function parseFxOffParam(urlSearch: string): boolean {
  return new URLSearchParams(urlSearch).get(FX_PARAM) === FX_OFF_VALUE;
}

/**
 * 換關／回關卡選擇要去的查詢字串：`level` 換成目的地，其餘參數（`quality`、`view`、`unlock`…）原樣保留。
 * 網址原本有 `lang` 就改成現在的語言：玩家在這一頁按過語言按鈕的話，不會被舊的參數蓋回去
 * （原本沒有 `lang` 就不加，由存檔或瀏覽器語言決定）。
 * @param urlSearch 目前的 `window.location.search`
 * @param levelId 要進的關卡；undefined = 回關卡選擇（拿掉 `level`）
 * @param locale 目前的語言
 * @returns 含開頭 `?` 的查詢字串；沒有任何參數時是空字串
 */
export function navigationSearch(
  urlSearch: string,
  levelId: string | undefined,
  locale: Locale,
): string {
  const params = new URLSearchParams(urlSearch);
  params.delete(LEVEL_PARAM);
  if (params.has(LANG_PARAM)) {
    params.set(LANG_PARAM, locale);
  }
  const next = new URLSearchParams();
  // 關卡放最前面，網址一眼看得出在哪一關。
  if (levelId !== undefined) {
    next.set(LEVEL_PARAM, levelId);
  }
  for (const [key, value] of params) {
    next.append(key, value);
  }
  const text = next.toString();
  return text === '' ? '' : `?${text}`;
}

const ASSIST_PARAM = 'assist';
const ASSIST_OFF_VALUE = 'off';

/**
 * `?assist=off`：不建立倒車輔助層（左右後視鏡、鳥瞰、倒後鏡頭）。`?fx=off` 也一併關掉：
 * 輔助層會蓋住畫面的一部分，逐像素比對的 e2e 不能被它影響。其他的值當作沒給；預設是開。
 */
export function parseAssistOffParam(urlSearch: string): boolean {
  const params = new URLSearchParams(urlSearch);
  return params.get(ASSIST_PARAM) === ASSIST_OFF_VALUE || params.get(FX_PARAM) === FX_OFF_VALUE;
}
