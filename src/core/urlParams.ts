// 把網址參數解析成有型別的啟動模式。不碰 DOM：查詢字串由呼叫端傳入。
// 優先順序：show > cam > bench > 一般遊戲。
// `?lang=` 不在這裡處理（i18n.detectLocale 負責），所以可以與任何模式並用。
// `?view=`（一般遊戲的初始鏡頭）也不在這裡：它不是啟動模式，由 cameraView.ts 解析。

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
