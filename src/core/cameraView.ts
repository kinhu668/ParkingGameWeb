// 一般遊戲的鏡頭模式：模式 id、V 鍵的循環順序、`?view=` 解析、用 localStorage 記住上次的選擇。
// 不碰 DOM、不 import three：查詢字串與 Storage 由呼叫端傳入。
// `?view=` 只決定一般遊戲的初始鏡頭，不是啟動模式，所以不在 urlParams.parseUrlMode 裡處理。

/** 鏡頭模式 id，順序就是按 V 的循環順序（到最後一個再回到第一個）。 */
export const GAME_CAMERA_VIEWS = ['chase_near', 'chase_far', 'hood', 'cockpit', 'top'] as const;

export type GameCameraView = (typeof GAME_CAMERA_VIEWS)[number];

/** 網址沒指定、也沒存過時用的鏡頭。 */
export const DEFAULT_GAME_CAMERA_VIEW: GameCameraView = 'chase_near';

/** localStorage 裡記住鏡頭模式的鍵。 */
export const CAMERA_VIEW_STORAGE_KEY = 'parkinggame.cameraView';

/** 只用到讀與寫；測試可以注入同樣形狀的物件，不必碰全域 localStorage。 */
export type ViewStorage = Pick<Storage, 'getItem' | 'setItem'>;

const VIEW_PARAM = 'view';

function isGameCameraView(value: string): value is GameCameraView {
  return (GAME_CAMERA_VIEWS as readonly string[]).includes(value);
}

/** 按一次 V 之後的鏡頭：循環順序的下一個。 */
export function nextGameCameraView(view: GameCameraView): GameCameraView {
  const nextIndex = (GAME_CAMERA_VIEWS.indexOf(view) + 1) % GAME_CAMERA_VIEWS.length;
  return GAME_CAMERA_VIEWS[nextIndex] ?? DEFAULT_GAME_CAMERA_VIEW;
}

/** `?view=` 指定的鏡頭；沒給、空值或不認得（含大小寫不同）→ undefined，不算錯誤。 */
export function parseViewParam(urlSearch: string): GameCameraView | undefined {
  const requested = new URLSearchParams(urlSearch).get(VIEW_PARAM);
  return requested !== null && isGameCameraView(requested) ? requested : undefined;
}

/** 上次存的鏡頭；沒存過、存的值不認得、沒有 storage 或讀取失敗 → undefined。 */
export function loadStoredView(storage: ViewStorage | undefined): GameCameraView | undefined {
  try {
    const stored = storage?.getItem(CAMERA_VIEW_STORAGE_KEY) ?? null;
    return stored !== null && isGameCameraView(stored) ? stored : undefined;
  } catch {
    // 無痕模式或停用儲存時 getItem 會丟例外；當作沒存過。
    return undefined;
  }
}

/** 記住鏡頭；沒有 storage 或寫入失敗（額度滿、停用儲存）就算了，下次進場用預設。 */
export function storeView(storage: ViewStorage | undefined, view: GameCameraView): void {
  try {
    storage?.setItem(CAMERA_VIEW_STORAGE_KEY, view);
  } catch {
    // 存不了不影響遊戲。
  }
}

/** 進場的鏡頭：有效的 `?view=` > 上次存的 > 預設。 */
export function resolveInitialView(
  urlSearch: string,
  storage: ViewStorage | undefined,
): GameCameraView {
  return parseViewParam(urlSearch) ?? loadStoredView(storage) ?? DEFAULT_GAME_CAMERA_VIEW;
}
