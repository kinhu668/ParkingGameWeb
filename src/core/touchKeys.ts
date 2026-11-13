// 螢幕操作層上的鍵帽：哪個控制項上顯示哪個動作的鍵、鍵帽貼在控制項的哪裡。純邏輯，不碰 DOM。
// 鍵帽是獨立的點擊目標（點它＝改這個動作的鍵）；控制項本體照常開車，兩者不混在一起。
import type { Rect } from './assistLayout';
import type { ControlAction, ControlBindings } from './controls';
import type { TouchControlId } from './touchLayout';

/** 鍵帽貼在控制項上緣的哪裡：左上角、上緣中間、右上角。 */
export type KeyBadgeAnchor = 'left' | 'center' | 'right';

export interface TouchKeyBadge {
  /** 這個鍵帽顯示（並且改）哪個動作的鍵。 */
  readonly action: ControlAction;
  /** 貼在哪個控制項上。 */
  readonly control: TouchControlId;
  readonly anchor: KeyBadgeAnchor;
}

/**
 * 每個控制項上的鍵帽。方向盤有兩個（左轉、右轉，在方向盤外接正方形的左上、右上角，圓的外面）；
 * 油門是 `throttle`、剎車是腳剎 `brake`（不是手煞車）。倒車與手煞車在螢幕上沒有自己的控制項，不列。
 */
export const TOUCH_KEY_BADGES: readonly TouchKeyBadge[] = [
  { action: 'steerLeft', control: 'wheel', anchor: 'left' },
  { action: 'steerRight', control: 'wheel', anchor: 'right' },
  { action: 'brake', control: 'brake', anchor: 'center' },
  { action: 'throttle', control: 'gas', anchor: 'center' },
  { action: 'gearDrive', control: 'gearDrive', anchor: 'center' },
  { action: 'gearReverse', control: 'gearReverse', anchor: 'center' },
  { action: 'pause', control: 'pause', anchor: 'center' },
  { action: 'restart', control: 'restart', anchor: 'center' },
  { action: 'toggleCamera', control: 'camera', anchor: 'center' },
];

/** 鍵帽顯示與改的是動作的第幾個鍵：主要鍵。備用鍵在按鍵設定面板裡改。 */
export const TOUCH_KEY_SLOT = 0;

/** 這個動作的鍵帽要顯示的鍵（KeyboardEvent.code）；每個動作至少有一個鍵。 */
export function touchKeyCode(bindings: ControlBindings, action: ControlAction): string {
  return bindings[action][TOUCH_KEY_SLOT] ?? '';
}

/** 鍵帽離控制項上緣與左右邊緣的距離。 */
const BADGE_INSET_PX = 4;

/** 鍵帽的定位點：x 是鍵帽左緣（left）、中心（center）或右緣（right）的位置，y 是鍵帽的上緣。 */
export interface KeyBadgePosition {
  readonly x: number;
  readonly y: number;
  readonly anchor: KeyBadgeAnchor;
}

/** 鍵帽貼在控制項 rect 的哪裡（CSS 像素）；一定落在 rect 裡面，所以不會壓到輔助小窗或別的控制項。 */
export function keyBadgePosition(rect: Rect, anchor: KeyBadgeAnchor): KeyBadgePosition {
  const y = rect.y + BADGE_INSET_PX;
  switch (anchor) {
    case 'left':
      return { x: rect.x, y: rect.y, anchor };
    case 'right':
      return { x: rect.x + rect.width, y: rect.y, anchor };
    case 'center':
      return { x: rect.x + rect.width / 2, y, anchor };
  }
}
