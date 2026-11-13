// 鍵盤輸入：「按住的鍵 → 駕駛輸入」的純函式，以及掛在 window 上的鍵盤狀態。
// 哪個鍵做什麼由綁定表決定（core/controls.ts；玩家可以在按鍵設定裡改）。
// 一律用 KeyboardEvent.code（實體鍵位），不受鍵盤配置與輸入法影響。
import type { DriveInput } from '../vehicle/bicycleModel';
import type { Gear } from '../vehicle/gearbox';
import { DEFAULT_BINDINGS, type ControlBindings } from './controls';

/**
 * 按下時要擋掉瀏覽器預設行為的鍵：方向鍵與空白鍵會捲動頁面，
 * `/` 與 `'` 在部分瀏覽器會開啟頁內搜尋，Backspace 在舊瀏覽器是回上一頁。
 */
const BROWSER_DEFAULT_CODES: readonly string[] = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'Slash',
  'Quote',
  'Backspace',
];

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

/** 這個鍵按下時是否要擋掉瀏覽器預設行為。 */
export function shouldPreventDefault(code: string): boolean {
  return BROWSER_DEFAULT_CODES.includes(code);
}

/** 由目前按住的鍵算出駕駛輸入（還沒套用檔位）。 */
export function driveInputFromHeldCodes(
  heldCodes: ReadonlySet<string>,
  bindings: ControlBindings = DEFAULT_BINDINGS,
): DriveInput {
  return {
    throttle: axis(anyHeld(bindings.throttle, heldCodes), anyHeld(bindings.reverse, heldCodes)),
    steer: axis(anyHeld(bindings.steerRight, heldCodes), anyHeld(bindings.steerLeft, heldCodes)),
    brake: anyHeld(bindings.brake, heldCodes),
  };
}

/** 鍵盤狀態的讀取介面。 */
export interface KeyboardInput {
  /** 目前按住的鍵對應的駕駛輸入。 */
  driveInput(): DriveInput;
  /** 上次呼叫之後是否按過「重來」；讀完就清掉，按住不放只算一次。 */
  consumeRestart(): boolean;
  /** 上次呼叫之後是否按過「切換鏡頭」；語意與 consumeRestart 相同。 */
  consumeToggleCamera(): boolean;
  /** 上次呼叫之後是否按過「暫停」；語意與 consumeRestart 相同。 */
  consumePause(): boolean;
  /**
   * 上次呼叫之後按過的掛檔鍵要掛的檔（按了好幾次取最後一次）；沒按是 null。讀完就清掉。
   * 按「重來」會把在它之前按的掛檔鍵丟掉，所以與 consumeRestart 同一幀讀到的一定是重來之後才按的。
   */
  consumeShift(): Gear | null;
  /**
   * 攔下一個按鍵（按鍵設定用）：下一次按下的鍵不當成遊戲輸入，而是把它的 code 交給 onKey，只攔一次。
   * 帶修飾鍵的按鍵（瀏覽器快捷鍵）與按住不放的重複事件不算。
   * @returns 取消攔截的函式；已經攔到或已經取消再呼叫也沒關係
   */
  captureNextKey(onKey: (code: string) => void): () => void;
}

/**
 * 在 window 上掛鍵盤監聽。視窗失焦時清空按住狀態，避免放開鍵的事件漏掉後車子自己一直跑。
 * @param bindings 每次按鍵都重新取目前的綁定，玩家改完立刻生效
 */
export function attachKeyboardInput(
  target: Window,
  bindings: () => ControlBindings = () => DEFAULT_BINDINGS,
): KeyboardInput {
  const heldCodes = new Set<string>();
  let restartPressed = false;
  let toggleCameraPressed = false;
  let pausePressed = false;
  let shiftPressed: Gear | null = null;
  let capture: ((code: string) => void) | undefined;

  target.addEventListener('keydown', (event) => {
    // 帶修飾鍵的是瀏覽器快捷鍵（例如 Ctrl+R 重新整理），不當成遊戲輸入。
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    // 按鍵設定正在等玩家按鍵：整個交給它，不重來、不暫停、也不算按住。
    if (capture !== undefined) {
      event.preventDefault();
      if (!event.repeat) {
        const onKey = capture;
        capture = undefined;
        onKey(event.code);
      }
      return;
    }
    if (shouldPreventDefault(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      const current = bindings();
      if (current.restart.includes(event.code)) {
        restartPressed = true;
        // 重來之前按的掛檔鍵屬於上一局：丟掉，否則同一幀裡「先掛 R、再重來」會讓新的一局從 R 檔開始。
        // 重來之後才按的掛檔鍵照常算（下面會再記上）。
        shiftPressed = null;
      }
      if (current.toggleCamera.includes(event.code)) {
        toggleCameraPressed = true;
      }
      if (current.pause.includes(event.code)) {
        pausePressed = true;
      }
      if (current.gearDrive.includes(event.code)) {
        shiftPressed = 'forward';
      }
      if (current.gearReverse.includes(event.code)) {
        shiftPressed = 'reverse';
      }
    }
    heldCodes.add(event.code);
  });

  target.addEventListener('keyup', (event) => {
    heldCodes.delete(event.code);
  });

  target.addEventListener('blur', () => {
    heldCodes.clear();
    restartPressed = false;
    toggleCameraPressed = false;
    pausePressed = false;
    shiftPressed = null;
  });

  return {
    driveInput: () => driveInputFromHeldCodes(heldCodes, bindings()),
    consumeRestart: () => {
      const pressed = restartPressed;
      restartPressed = false;
      return pressed;
    },
    consumeToggleCamera: () => {
      const pressed = toggleCameraPressed;
      toggleCameraPressed = false;
      return pressed;
    },
    consumePause: () => {
      const pressed = pausePressed;
      pausePressed = false;
      return pressed;
    },
    consumeShift: () => {
      const pressed = shiftPressed;
      shiftPressed = null;
      return pressed;
    },
    captureNextKey: (onKey) => {
      capture = onKey;
      return () => {
        if (capture === onKey) {
          capture = undefined;
        }
      };
    },
  };
}
