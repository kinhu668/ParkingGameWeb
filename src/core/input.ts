// 鍵盤輸入：按鍵綁定表、「按住的鍵 → 駕駛輸入」的純函式，以及掛在 window 上的鍵盤狀態。
// 一律用 KeyboardEvent.code（實體鍵位），不受鍵盤配置與輸入法影響。
import type { DriveInput } from '../vehicle/bicycleModel';

/** 動作 → 按鍵清單。toggleCamera 與 pause 本階段只定義、不接行為。 */
export const KEY_BINDINGS = {
  throttle: ['KeyW', 'ArrowUp'],
  reverse: ['KeyS', 'ArrowDown'],
  steerLeft: ['KeyA', 'ArrowLeft'],
  steerRight: ['KeyD', 'ArrowRight'],
  handbrake: ['Space'],
  restart: ['KeyR'],
  toggleCamera: ['KeyC'],
  pause: ['Escape'],
} as const satisfies Record<string, readonly string[]>;

/** 會捲動頁面的鍵（方向鍵、空白鍵）；按下時要 preventDefault。 */
const PAGE_SCROLL_CODES: readonly string[] = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
];

function isBound(codes: readonly string[], code: string): boolean {
  return codes.includes(code);
}

function anyHeld(codes: readonly string[], heldCodes: ReadonlySet<string>): boolean {
  return codes.some((code) => heldCodes.has(code));
}

/** 相反的兩個方向同時按住互相抵銷為 0。 */
function axis(positive: boolean, negative: boolean): -1 | 0 | 1 {
  if (positive === negative) {
    return 0;
  }
  return positive ? 1 : -1;
}

/** 這個鍵按下時是否要擋掉瀏覽器預設行為（捲動頁面）。 */
export function shouldPreventDefault(code: string): boolean {
  return isBound(PAGE_SCROLL_CODES, code);
}

/** 由目前按住的鍵算出駕駛輸入。 */
export function driveInputFromHeldCodes(heldCodes: ReadonlySet<string>): DriveInput {
  return {
    throttle: axis(
      anyHeld(KEY_BINDINGS.throttle, heldCodes),
      anyHeld(KEY_BINDINGS.reverse, heldCodes),
    ),
    steer: axis(
      anyHeld(KEY_BINDINGS.steerRight, heldCodes),
      anyHeld(KEY_BINDINGS.steerLeft, heldCodes),
    ),
    handbrake: anyHeld(KEY_BINDINGS.handbrake, heldCodes),
  };
}

/** 鍵盤狀態的讀取介面。 */
export interface KeyboardInput {
  /** 目前按住的鍵對應的駕駛輸入。 */
  driveInput(): DriveInput;
  /** 上次呼叫之後是否按過「重來」；讀完就清掉，按住不放只算一次。 */
  consumeRestart(): boolean;
}

/** 在 window 上掛鍵盤監聽。視窗失焦時清空按住狀態，避免放開鍵的事件漏掉後車子自己一直跑。 */
export function attachKeyboardInput(target: Window): KeyboardInput {
  const heldCodes = new Set<string>();
  let restartPressed = false;

  target.addEventListener('keydown', (event) => {
    // 帶修飾鍵的是瀏覽器快捷鍵（例如 Ctrl+R 重新整理），不當成遊戲輸入。
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (shouldPreventDefault(event.code)) {
      event.preventDefault();
    }
    if (isBound(KEY_BINDINGS.restart, event.code) && !event.repeat) {
      restartPressed = true;
    }
    heldCodes.add(event.code);
  });

  target.addEventListener('keyup', (event) => {
    heldCodes.delete(event.code);
  });

  target.addEventListener('blur', () => {
    heldCodes.clear();
    restartPressed = false;
  });

  return {
    driveInput: () => driveInputFromHeldCodes(heldCodes),
    consumeRestart: () => {
      const pressed = restartPressed;
      restartPressed = false;
      return pressed;
    },
  };
}
