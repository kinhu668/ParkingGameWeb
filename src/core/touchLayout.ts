// 螢幕操作層八個控制項在畫面上的位置（CSS 像素，原點在左上）。純函式，不碰 DOM。
// 位置由倒車輔助層的佈局（assistLayout）推出來：全部排在四個小窗的下面，所以不會擋到小窗。
// 橫向：方向盤左下、踏板右下，掛檔在踏板左邊，暫停／重來／鏡頭在下方中間。
// 直向（放不下一排）：方向盤與踏板在最下面，上面一排左邊是暫停／重來／鏡頭、右邊是掛 D／掛 R。
import { assistLayout, type Rect } from './assistLayout';

/** 八個控制項：方向盤、剎車、油門、掛 D、掛 R、暫停、重來、切換鏡頭。 */
export const TOUCH_CONTROL_IDS = [
  'wheel',
  'brake',
  'gas',
  'gearDrive',
  'gearReverse',
  'pause',
  'restart',
  'camera',
] as const;

export type TouchControlId = (typeof TOUCH_CONTROL_IDS)[number];

export type TouchLayout = Readonly<Record<TouchControlId, Rect>>;

const LAYOUT = {
  /** 離畫面邊緣、控制項之間、與輔助小窗之間的間距。 */
  marginPx: 16,
  gapPx: 12,
  /** 方向盤直徑 = 畫面短邊 × 這個比例，夾在上下限之間（再受可用高度限制）。 */
  wheelFraction: 0.42,
  wheelMinPx: 96,
  wheelMaxPx: 210,
  /** 排成一排時方向盤可以為了放得下而縮小，但不能比這個小；再小就改成兩排。 */
  singleRowMinWheelPx: 120,
  /** 踏板：油門窄而高、剎車寬一點（跟真車一樣）；寬度隨方向盤直徑縮放。 */
  gasWidthFraction: 0.5,
  brakeWidthFraction: 0.62,
  pedalMaxHeightPx: 170,
  /** 掛檔鍵與暫停／重來／鏡頭鍵（小鍵）的大小：手指點得到的最小尺寸以上，寬度放得下兩個字或 "Restart"。 */
  smallWidthPx: 60,
  smallHeightPx: 48,
  /** 下方中間那一組小鍵的數目：暫停、重來、鏡頭。 */
  centerGroupCount: 3,
  /** 兩排時上面那一排的小鍵數目：暫停、重來、鏡頭、掛 D、掛 R。 */
  stackedRowCount: 5,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 依畫面大小排螢幕操作層。座標都是整數像素。
 * 所有控制項都在輔助小窗最下緣的下面；畫面矮到放不下時方向盤與踏板跟著縮小。
 */
export function touchLayout(widthPx: number, heightPx: number): TouchLayout {
  const assist = assistLayout(widthPx, heightPx);
  // 四個小窗最下面的那一條邊，再留一個間距：操作層只能用這條線以下。
  const assistBottomPx = Math.max(
    assist.bird.y + assist.bird.height,
    assist.rear.y + assist.rear.height,
    assist.mirrorLeft.y + assist.mirrorLeft.height,
    assist.mirrorRight.y + assist.mirrorRight.height,
  );
  const topLimitPx = assistBottomPx + LAYOUT.gapPx;
  const bottomPx = heightPx - LAYOUT.marginPx;
  const bandPx = Math.max(bottomPx - topLimitPx, 1);

  const wantedWheelPx = clamp(
    Math.min(widthPx, heightPx) * LAYOUT.wheelFraction,
    LAYOUT.wheelMinPx,
    LAYOUT.wheelMaxPx,
  );
  const smallH = LAYOUT.smallHeightPx;
  const pedalsPerWheel = 1 + LAYOUT.brakeWidthFraction + LAYOUT.gasWidthFraction;

  // 一排放得下嗎：方向盤、暫停／重來／鏡頭、掛檔、剎車、油門。方向盤可以縮一點來湊，縮太多就改成兩排。
  const centerGroupWidthPx =
    LAYOUT.centerGroupCount * LAYOUT.smallWidthPx + (LAYOUT.centerGroupCount - 1) * LAYOUT.gapPx;
  const singleRowFixedPx =
    2 * LAYOUT.marginPx + centerGroupWidthPx + LAYOUT.smallWidthPx + 4 * LAYOUT.gapPx;
  const singleRowWheelPx = Math.floor(
    Math.min(wantedWheelPx, bandPx, (widthPx - singleRowFixedPx) / pedalsPerWheel),
  );
  const stacked = singleRowWheelPx < LAYOUT.singleRowMinWheelPx;

  // 兩排：上面多一排小鍵，方向盤與踏板的高度要扣掉它；寬度也不能讓方向盤與踏板相撞。
  const wheelPx = stacked
    ? Math.max(
        Math.floor(
          Math.min(
            wantedWheelPx,
            bandPx - smallH - LAYOUT.gapPx,
            (widthPx - 2 * LAYOUT.marginPx - 2 * LAYOUT.gapPx) / pedalsPerWheel,
          ),
        ),
        1,
      )
    : Math.max(singleRowWheelPx, 1);

  const gasWidthPx = Math.round(wheelPx * LAYOUT.gasWidthFraction);
  const brakeWidthPx = Math.round(wheelPx * LAYOUT.brakeWidthFraction);
  const pedalHeightPx = Math.min(wheelPx, LAYOUT.pedalMaxHeightPx);
  const pedalY = bottomPx - pedalHeightPx;
  const gasX = widthPx - LAYOUT.marginPx - gasWidthPx;
  const brakeX = gasX - LAYOUT.gapPx - brakeWidthPx;

  const wheel: Rect = {
    x: LAYOUT.marginPx,
    y: bottomPx - wheelPx,
    width: wheelPx,
    height: wheelPx,
  };
  const brake: Rect = { x: brakeX, y: pedalY, width: brakeWidthPx, height: pedalHeightPx };
  const gas: Rect = { x: gasX, y: pedalY, width: gasWidthPx, height: pedalHeightPx };

  if (stacked) {
    // 上面那一排：左邊暫停、重來、鏡頭，右邊掛 D、掛 R（貼右，在踏板正上方）。
    // 很窄的手機一排放不下五顆 60 px：五顆一起變窄（仍在手指點得到的大小以上）。
    const smallW = Math.min(
      LAYOUT.smallWidthPx,
      Math.floor(
        (widthPx - 2 * LAYOUT.marginPx - LAYOUT.stackedRowCount * LAYOUT.gapPx) /
          LAYOUT.stackedRowCount,
      ),
    );
    const rowY = bottomPx - wheelPx - LAYOUT.gapPx - smallH;
    const reverseX = widthPx - LAYOUT.marginPx - smallW;
    const leftX = (index: number): number => LAYOUT.marginPx + index * (smallW + LAYOUT.gapPx);
    return {
      wheel,
      brake,
      gas,
      gearDrive: {
        x: reverseX - LAYOUT.gapPx - smallW,
        y: rowY,
        width: smallW,
        height: smallH,
      },
      gearReverse: { x: reverseX, y: rowY, width: smallW, height: smallH },
      pause: { x: leftX(0), y: rowY, width: smallW, height: smallH },
      restart: { x: leftX(1), y: rowY, width: smallW, height: smallH },
      camera: { x: leftX(2), y: rowY, width: smallW, height: smallH },
    };
  }

  // 一排：掛檔在剎車左邊，D 上、R 下，兩顆合起來與踏板同高。
  const smallW = LAYOUT.smallWidthPx;
  const gearX = brakeX - LAYOUT.gapPx - smallW;
  const gearHeightPx = Math.floor((pedalHeightPx - LAYOUT.gapPx) / 2);
  // 暫停／重來／鏡頭：下方中間，夾在方向盤與掛檔之間的空位正中央。
  const freeLeft = wheel.x + wheel.width + LAYOUT.gapPx;
  const freeRight = gearX - LAYOUT.gapPx;
  const groupX = Math.round(
    clamp(widthPx / 2 - centerGroupWidthPx / 2, freeLeft, freeRight - centerGroupWidthPx),
  );
  const smallY = bottomPx - smallH;
  const centerX = (index: number): number => groupX + index * (smallW + LAYOUT.gapPx);
  return {
    wheel,
    brake,
    gas,
    gearDrive: { x: gearX, y: pedalY, width: smallW, height: gearHeightPx },
    gearReverse: {
      x: gearX,
      y: bottomPx - gearHeightPx,
      width: smallW,
      height: gearHeightPx,
    },
    pause: { x: centerX(0), y: smallY, width: smallW, height: smallH },
    restart: { x: centerX(1), y: smallY, width: smallW, height: smallH },
    camera: { x: centerX(2), y: smallY, width: smallW, height: smallH },
  };
}
