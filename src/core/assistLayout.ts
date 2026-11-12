// 倒車輔助層四個視口在畫面上的位置（CSS 像素，原點在左上）。純函式：WebGL 的視口與疊在上面的
// DOM 外框都用這一份，兩邊才會對齊。不 import three、不碰 DOM。

/** 四個視口：鳥瞰、倒後鏡頭、左後視鏡、右後視鏡。 */
export const ASSIST_VIEW_IDS = ['bird', 'rear', 'mirrorLeft', 'mirrorRight'] as const;

export type AssistViewId = (typeof ASSIST_VIEW_IDS)[number];

/** 每個視口的長寬比（寬 ÷ 高）；鏡頭的長寬比也用這一份，所以畫面不會被拉伸。 */
export const ASSIST_VIEW_ASPECT: Readonly<Record<AssistViewId, number>> = {
  bird: 0.7,
  rear: 1.6,
  mirrorLeft: 1.5,
  mirrorRight: 1.5,
};

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type AssistLayout = Readonly<Record<AssistViewId, Rect>>;

const LAYOUT = {
  /** 離畫面邊緣與視口之間的間距。 */
  marginPx: 16,
  gapPx: 10,
  /** 上排（鳥瞰＋倒後鏡頭）的上緣：在上方置中那排行車資訊的下面。 */
  topRowYPx: 92,
  /**
   * 畫面不比這個寬（手機直向）時，上方的資訊排成兩排（樣式表的 `max-width: 600px`），
   * 上排的上緣要再往下讓。
   */
  narrowWidthPx: 600,
  narrowTopRowYPx: 138,
  /** 上排的高度 = 畫面高 × 這個比例，夾在上下限之間。 */
  topRowHeightFraction: 0.27,
  topRowMinHeightPx: 90,
  topRowMaxHeightPx: 230,
  /** 後視鏡的寬 = 畫面寬 × 這個比例，夾在上下限之間。 */
  mirrorWidthFraction: 0.17,
  mirrorMinWidthPx: 100,
  mirrorMaxWidthPx: 250,
  /** 後視鏡中心的高度（畫面高的比例）。 */
  mirrorCenterYFraction: 0.44,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 依畫面大小排四個視口：鳥瞰與倒後鏡頭在上方並排置中，左右後視鏡貼在左右兩邊。
 * 畫面很窄時上排整排等比縮小；後視鏡若會壓到上排就往下讓。座標都是整數像素。
 */
export function assistLayout(widthPx: number, heightPx: number): AssistLayout {
  const usableWidthPx = Math.max(widthPx - 2 * LAYOUT.marginPx, 1);
  const topRowYPx = widthPx <= LAYOUT.narrowWidthPx ? LAYOUT.narrowTopRowYPx : LAYOUT.topRowYPx;

  // 上排：高度先照比例，整排太寬就縮到剛好放得下。
  const rowAspect = ASSIST_VIEW_ASPECT.bird + ASSIST_VIEW_ASPECT.rear;
  const wantedHeightPx = clamp(
    heightPx * LAYOUT.topRowHeightFraction,
    LAYOUT.topRowMinHeightPx,
    LAYOUT.topRowMaxHeightPx,
  );
  const rowHeightPx = Math.max(
    Math.floor(Math.min(wantedHeightPx, (usableWidthPx - LAYOUT.gapPx) / rowAspect)),
    1,
  );
  const birdWidthPx = Math.max(Math.round(rowHeightPx * ASSIST_VIEW_ASPECT.bird), 1);
  const rearWidthPx = Math.max(Math.round(rowHeightPx * ASSIST_VIEW_ASPECT.rear), 1);
  const rowX = Math.round((widthPx - (birdWidthPx + LAYOUT.gapPx + rearWidthPx)) / 2);

  // 後視鏡：左右各一塊。
  const mirrorWidthPx = Math.round(
    Math.min(
      clamp(widthPx * LAYOUT.mirrorWidthFraction, LAYOUT.mirrorMinWidthPx, LAYOUT.mirrorMaxWidthPx),
      (usableWidthPx - LAYOUT.gapPx) / 2,
    ),
  );
  const mirrorHeightPx = Math.max(Math.round(mirrorWidthPx / ASSIST_VIEW_ASPECT.mirrorLeft), 1);
  const centeredY = Math.round(heightPx * LAYOUT.mirrorCenterYFraction - mirrorHeightPx / 2);
  const overlapsRow = LAYOUT.marginPx + mirrorWidthPx + LAYOUT.gapPx > rowX;
  const mirrorY = overlapsRow
    ? Math.max(centeredY, topRowYPx + rowHeightPx + LAYOUT.gapPx)
    : centeredY;

  return {
    bird: { x: rowX, y: topRowYPx, width: birdWidthPx, height: rowHeightPx },
    rear: {
      x: rowX + birdWidthPx + LAYOUT.gapPx,
      y: topRowYPx,
      width: rearWidthPx,
      height: rowHeightPx,
    },
    mirrorLeft: { x: LAYOUT.marginPx, y: mirrorY, width: mirrorWidthPx, height: mirrorHeightPx },
    mirrorRight: {
      x: widthPx - LAYOUT.marginPx - mirrorWidthPx,
      y: mirrorY,
      width: mirrorWidthPx,
      height: mirrorHeightPx,
    },
  };
}
