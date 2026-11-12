import { describe, expect, test } from 'vitest';
import { DEFAULT_BINDINGS, type ControlBindings } from '../src/core/controls';
import {
  attachKeyboardInput,
  driveInputFromHeldCodes,
  shouldPreventDefault,
} from '../src/core/input';

function held(...codes: string[]): ReadonlySet<string> {
  return new Set(codes);
}

describe('driveInputFromHeldCodes', () => {
  test('什麼都沒按：全部放開', () => {
    expect(driveInputFromHeldCodes(held())).toEqual({
      throttle: 0,
      steer: 0,
      handbrake: false,
      brake: false,
    });
  });

  test('W 與 ↑ 都是油門；S 與 ↓ 都是倒車', () => {
    expect(driveInputFromHeldCodes(held('KeyW')).throttle).toBe(1);
    expect(driveInputFromHeldCodes(held('ArrowUp')).throttle).toBe(1);
    expect(driveInputFromHeldCodes(held('KeyS')).throttle).toBe(-1);
    expect(driveInputFromHeldCodes(held('ArrowDown')).throttle).toBe(-1);
  });

  test('A 與 ← 是左轉（−1）；D 與 → 是右轉（+1）', () => {
    expect(driveInputFromHeldCodes(held('KeyA')).steer).toBe(-1);
    expect(driveInputFromHeldCodes(held('ArrowLeft')).steer).toBe(-1);
    expect(driveInputFromHeldCodes(held('KeyD')).steer).toBe(1);
    expect(driveInputFromHeldCodes(held('ArrowRight')).steer).toBe(1);
  });

  test('空白鍵與 / 是手煞車，不是腳剎', () => {
    for (const code of ['Space', 'Slash']) {
      expect(driveInputFromHeldCodes(held(code))).toMatchObject({ handbrake: true, brake: false });
    }
  });

  test('逗號是腳剎，不是手煞車', () => {
    expect(driveInputFromHeldCodes(held('Comma'))).toMatchObject({ handbrake: false, brake: true });
  });

  test('照傳入的綁定算：改綁之後舊的鍵不再有作用', () => {
    const custom: ControlBindings = {
      ...DEFAULT_BINDINGS,
      throttle: ['KeyI'],
      reverse: ['KeyK'],
      brake: ['KeyB'],
    };
    expect(driveInputFromHeldCodes(held('KeyI'), custom).throttle).toBe(1);
    expect(driveInputFromHeldCodes(held('KeyK'), custom).throttle).toBe(-1);
    expect(driveInputFromHeldCodes(held('KeyB'), custom).brake).toBe(true);
    expect(driveInputFromHeldCodes(held('KeyW', 'ArrowDown', 'Comma'), custom)).toEqual({
      throttle: 0,
      steer: 0,
      handbrake: false,
      brake: false,
    });
  });

  test('相反的鍵同時按住互相抵銷為 0（跨 WASD 與方向鍵也一樣）', () => {
    expect(driveInputFromHeldCodes(held('KeyW', 'KeyS')).throttle).toBe(0);
    expect(driveInputFromHeldCodes(held('ArrowUp', 'KeyS')).throttle).toBe(0);
    expect(driveInputFromHeldCodes(held('KeyA', 'KeyD')).steer).toBe(0);
    expect(driveInputFromHeldCodes(held('ArrowLeft', 'KeyD')).steer).toBe(0);
  });

  test('同一個動作的兩個鍵一起按，結果與按一個相同', () => {
    expect(driveInputFromHeldCodes(held('KeyW', 'ArrowUp')).throttle).toBe(1);
    expect(driveInputFromHeldCodes(held('KeyD', 'ArrowRight')).steer).toBe(1);
  });

  test('可以同時油門、轉向、手煞車', () => {
    expect(driveInputFromHeldCodes(held('KeyW', 'KeyD', 'Space'))).toEqual({
      throttle: 1,
      steer: 1,
      handbrake: true,
      brake: false,
    });
  });

  test('掛檔（Q、R）、重來（Backspace、T）、V、Esc 與沒綁定的鍵不影響駕駛輸入', () => {
    expect(
      driveInputFromHeldCodes(
        held('KeyR', 'KeyQ', 'Backspace', 'KeyT', 'KeyV', 'Escape', 'KeyC', 'Enter'),
      ),
    ).toEqual({
      throttle: 0,
      steer: 0,
      handbrake: false,
      brake: false,
    });
  });
});

describe('shouldPreventDefault', () => {
  test('方向鍵與空白鍵（捲動頁面）、/ 與 \'（頁內搜尋）、Backspace（回上一頁）要擋', () => {
    for (const code of [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Space',
      'Slash',
      'Quote',
      'Backspace',
    ]) {
      expect(shouldPreventDefault(code)).toBe(true);
    }
  });

  test('字母鍵、Esc、功能鍵不擋，瀏覽器快捷鍵照常運作', () => {
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyT', 'KeyV', 'Comma', 'Escape', 'F5', 'Tab']) {
      expect(shouldPreventDefault(code)).toBe(false);
    }
  });
});

/** Node 內建的 EventTarget 當成 window；只用得到 addEventListener。 */
function attach(bindings?: () => ControlBindings): {
  readonly target: EventTarget;
  readonly input: ReturnType<typeof attachKeyboardInput>;
} {
  const target = new EventTarget();
  return { target, input: attachKeyboardInput(target as Window, bindings) };
}

/** 送一個鍵盤事件；Node 沒有 KeyboardEvent，用 Event 加上會被讀到的欄位。回傳事件有沒有被 preventDefault。 */
function key(
  target: EventTarget,
  type: 'keydown' | 'keyup',
  code: string,
  extra: { readonly repeat?: boolean; readonly ctrlKey?: boolean } = {},
): boolean {
  const event = Object.assign(new Event(type, { cancelable: true }), {
    code,
    repeat: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...extra,
  });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('attachKeyboardInput：一次性的按鍵（重來、切換鏡頭）', () => {

  test('按 V：consumeToggleCamera 回傳 true 一次，讀完就清掉', () => {
    const { target, input } = attach();
    expect(input.consumeToggleCamera()).toBe(false);

    key(target, 'keydown', 'KeyV');
    expect(input.consumeToggleCamera()).toBe(true);
    expect(input.consumeToggleCamera()).toBe(false);
  });

  test('按住 V 不放（repeat）只算一次；放開再按才算下一次', () => {
    const { target, input } = attach();
    key(target, 'keydown', 'KeyV');
    expect(input.consumeToggleCamera()).toBe(true);

    key(target, 'keydown', 'KeyV', { repeat: true });
    key(target, 'keydown', 'KeyV', { repeat: true });
    expect(input.consumeToggleCamera()).toBe(false);

    key(target, 'keyup', 'KeyV');
    key(target, 'keydown', 'KeyV');
    expect(input.consumeToggleCamera()).toBe(true);
  });

  test('兩次讀取之間按了好幾下也只算一次', () => {
    const { target, input } = attach();
    for (let press = 0; press < 3; press += 1) {
      key(target, 'keydown', 'KeyV');
      key(target, 'keyup', 'KeyV');
    }
    expect(input.consumeToggleCamera()).toBe(true);
    expect(input.consumeToggleCamera()).toBe(false);
  });

  test('視窗失焦會清掉還沒讀的按鍵', () => {
    const { target, input } = attach();
    key(target, 'keydown', 'KeyV');
    key(target, 'keydown', 'Backspace');
    key(target, 'keydown', 'KeyR');
    target.dispatchEvent(new Event('blur'));
    expect(input.consumeToggleCamera()).toBe(false);
    expect(input.consumeRestart()).toBe(false);
    expect(input.consumeShift()).toBeNull();
  });

  test('V 與重來鍵（Backspace、T）各管各的，也都不影響駕駛輸入', () => {
    const { target, input } = attach();
    key(target, 'keydown', 'KeyV');
    expect(input.consumeRestart()).toBe(false);
    expect(input.driveInput()).toEqual({ throttle: 0, steer: 0, handbrake: false, brake: false });
    expect(input.consumeToggleCamera()).toBe(true);

    key(target, 'keydown', 'Backspace');
    expect(input.consumeToggleCamera()).toBe(false);
    expect(input.consumeRestart()).toBe(true);
    key(target, 'keydown', 'KeyT');
    expect(input.consumeRestart()).toBe(true);
    expect(input.consumeRestart()).toBe(false);
  });

  test('R 不再是重來：它是掛 R 檔', () => {
    const { target, input } = attach();
    key(target, 'keydown', 'KeyR');
    expect(input.consumeRestart()).toBe(false);
    expect(input.consumeShift()).toBe('reverse');
  });

  test('C（舊的綁定）與帶修飾鍵的 V（瀏覽器快捷鍵）都不切換鏡頭', () => {
    const { target, input } = attach();
    key(target, 'keydown', 'KeyC');
    key(target, 'keydown', 'KeyV', { ctrlKey: true });
    expect(input.consumeToggleCamera()).toBe(false);
  });
});

describe('attachKeyboardInput：掛檔鍵', () => {
  test('Q 掛 D 檔、R 掛 R 檔；讀完就清掉，按住不放只算一次', () => {
    const { target, input } = attach();
    expect(input.consumeShift()).toBeNull();

    key(target, 'keydown', 'KeyR');
    key(target, 'keydown', 'KeyR', { repeat: true });
    expect(input.consumeShift()).toBe('reverse');
    expect(input.consumeShift()).toBeNull();

    key(target, 'keydown', 'KeyQ');
    expect(input.consumeShift()).toBe('forward');
  });

  test('兩次讀取之間兩個都按了：取最後按的那一個', () => {
    const { target, input } = attach();
    key(target, 'keydown', 'KeyQ');
    key(target, 'keydown', 'KeyR');
    expect(input.consumeShift()).toBe('reverse');
    key(target, 'keydown', 'KeyR');
    key(target, 'keydown', 'KeyQ');
    expect(input.consumeShift()).toBe('forward');
  });

  test('掛檔鍵不影響駕駛輸入；右轉的 D 也不會掛檔', () => {
    const { target, input } = attach();
    key(target, 'keydown', 'KeyD');
    expect(input.consumeShift()).toBeNull();
    expect(input.driveInput().steer).toBe(1);
  });
});

describe('attachKeyboardInput：重來與掛檔鍵的先後', () => {
  test('先掛 R、再重來（同一幀內）：重來之前按的掛檔鍵被丟掉，新的一局不會從 R 檔開始', () => {
    const { target, input } = attach();
    key(target, 'keydown', 'KeyR');
    key(target, 'keydown', 'Backspace');
    expect(input.consumeRestart()).toBe(true);
    expect(input.consumeShift()).toBeNull();

    // 備用的重來鍵（T）與掛 D 也一樣。
    key(target, 'keydown', 'KeyQ');
    key(target, 'keydown', 'KeyT');
    expect(input.consumeRestart()).toBe(true);
    expect(input.consumeShift()).toBeNull();
  });

  test('先重來、再掛 R：重來之後按的照算', () => {
    const { target, input } = attach();
    key(target, 'keydown', 'KeyR');
    key(target, 'keydown', 'Backspace');
    key(target, 'keydown', 'KeyR');
    expect(input.consumeRestart()).toBe(true);
    expect(input.consumeShift()).toBe('reverse');
  });

  test('按住掛 R 鍵不放再重來：重複事件不算再掛一次', () => {
    const { target, input } = attach();
    key(target, 'keydown', 'KeyR');
    expect(input.consumeShift()).toBe('reverse');
    key(target, 'keydown', 'KeyR', { repeat: true });
    key(target, 'keydown', 'Backspace');
    key(target, 'keydown', 'KeyR', { repeat: true });
    expect(input.consumeRestart()).toBe(true);
    expect(input.consumeShift()).toBeNull();
  });
});

describe('attachKeyboardInput：綁定可以換', () => {
  test('每次按鍵都用當下的綁定：改完立刻生效', () => {
    let bindings: ControlBindings = DEFAULT_BINDINGS;
    const { target, input } = attach(() => bindings);
    key(target, 'keydown', 'KeyP');
    expect(input.consumePause()).toBe(false);

    bindings = { ...DEFAULT_BINDINGS, pause: ['KeyP'], brake: ['KeyB'] };
    key(target, 'keydown', 'KeyP');
    expect(input.consumePause()).toBe(true);
    key(target, 'keydown', 'Escape');
    expect(input.consumePause()).toBe(false);
    key(target, 'keydown', 'KeyB');
    expect(input.driveInput().brake).toBe(true);
  });
});

describe('attachKeyboardInput：captureNextKey（按鍵設定攔下一個鍵）', () => {
  test('攔到的鍵交給 onKey，不當成遊戲輸入，只攔一次', () => {
    const { target, input } = attach();
    const captured: string[] = [];
    input.captureNextKey((code) => captured.push(code));

    expect(key(target, 'keydown', 'Backspace')).toBe(true);
    expect(captured).toEqual(['Backspace']);
    expect(input.consumeRestart()).toBe(false);

    // 第二次按就是一般的遊戲輸入了。
    key(target, 'keydown', 'Backspace');
    expect(captured).toEqual(['Backspace']);
    expect(input.consumeRestart()).toBe(true);
  });

  test('攔到的鍵不算按住；Esc 也攔得到而且不會暫停', () => {
    const { target, input } = attach();
    const captured: string[] = [];
    input.captureNextKey((code) => captured.push(code));
    key(target, 'keydown', 'KeyW');
    expect(input.driveInput().throttle).toBe(0);

    input.captureNextKey((code) => captured.push(code));
    key(target, 'keydown', 'Escape');
    expect(captured).toEqual(['KeyW', 'Escape']);
    expect(input.consumePause()).toBe(false);
  });

  test('帶修飾鍵的按鍵與重複事件不算，繼續等', () => {
    const { target, input } = attach();
    const captured: string[] = [];
    input.captureNextKey((code) => captured.push(code));
    key(target, 'keydown', 'KeyR', { ctrlKey: true });
    key(target, 'keydown', 'KeyX', { repeat: true });
    expect(captured).toEqual([]);
    key(target, 'keydown', 'KeyX');
    expect(captured).toEqual(['KeyX']);
  });

  test('取消之後不再攔；舊的取消函式不會取消到新的攔截', () => {
    const { target, input } = attach();
    const captured: string[] = [];
    const cancelFirst = input.captureNextKey((code) => captured.push(`first:${code}`));
    cancelFirst();
    key(target, 'keydown', 'KeyV');
    expect(captured).toEqual([]);
    expect(input.consumeToggleCamera()).toBe(true);

    const cancelSecond = input.captureNextKey((code) => captured.push(`second:${code}`));
    input.captureNextKey((code) => captured.push(`third:${code}`));
    cancelSecond();
    key(target, 'keydown', 'KeyV');
    expect(captured).toEqual(['third:KeyV']);
  });
});
