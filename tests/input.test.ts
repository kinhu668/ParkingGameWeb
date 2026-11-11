import { describe, expect, test } from 'vitest';
import {
  KEY_BINDINGS,
  attachKeyboardInput,
  driveInputFromHeldCodes,
  shouldPreventDefault,
} from '../src/core/input';

function held(...codes: string[]): ReadonlySet<string> {
  return new Set(codes);
}

describe('KEY_BINDINGS', () => {
  // 計畫第 6 節的表寫的是 KeyC（當時只定義、沒接行為）；遊戲鏡頭切換實際接上時改用 V，
  // 這裡以實作為準，其餘按鍵與計畫相同。
  test('與計畫第 6 節的按鍵表一致（切換鏡頭改用 V，不再用未接線的 C）', () => {
    expect(KEY_BINDINGS).toEqual({
      throttle: ['KeyW', 'ArrowUp'],
      reverse: ['KeyS', 'ArrowDown'],
      steerLeft: ['KeyA', 'ArrowLeft'],
      steerRight: ['KeyD', 'ArrowRight'],
      handbrake: ['Space'],
      restart: ['KeyR'],
      toggleCamera: ['KeyV'],
      pause: ['Escape'],
    });
  });

  test('同一個鍵不會綁到兩個動作', () => {
    const codes = Object.values(KEY_BINDINGS).flat();
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('driveInputFromHeldCodes', () => {
  test('什麼都沒按：全部放開', () => {
    expect(driveInputFromHeldCodes(held())).toEqual({ throttle: 0, steer: 0, handbrake: false });
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

  test('空白鍵是手煞車', () => {
    expect(driveInputFromHeldCodes(held('Space')).handbrake).toBe(true);
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
    });
  });

  test('R、V、Esc 與沒綁定的鍵不影響駕駛輸入', () => {
    expect(
      driveInputFromHeldCodes(held('KeyR', 'KeyV', 'Escape', 'KeyC', 'KeyQ', 'Enter')),
    ).toEqual({
      throttle: 0,
      steer: 0,
      handbrake: false,
    });
  });
});

describe('shouldPreventDefault', () => {
  test('方向鍵與空白鍵要擋（會捲動頁面）', () => {
    for (const code of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']) {
      expect(shouldPreventDefault(code)).toBe(true);
    }
  });

  test('字母鍵、Esc、功能鍵不擋，瀏覽器快捷鍵照常運作', () => {
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyV', 'Escape', 'F5', 'Tab']) {
      expect(shouldPreventDefault(code)).toBe(false);
    }
  });
});

describe('attachKeyboardInput：一次性的按鍵（重來、切換鏡頭）', () => {
  /** Node 內建的 EventTarget 當成 window；只用得到 addEventListener。 */
  function attach(): { readonly target: EventTarget; readonly input: ReturnType<typeof attachKeyboardInput> } {
    const target = new EventTarget();
    return { target, input: attachKeyboardInput(target as Window) };
  }

  /** 送一個鍵盤事件；Node 沒有 KeyboardEvent，用 Event 加上會被讀到的欄位。 */
  function key(
    target: EventTarget,
    type: 'keydown' | 'keyup',
    code: string,
    extra: { readonly repeat?: boolean; readonly ctrlKey?: boolean } = {},
  ): void {
    target.dispatchEvent(
      Object.assign(new Event(type), {
        code,
        repeat: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        ...extra,
      }),
    );
  }

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
    key(target, 'keydown', 'KeyR');
    target.dispatchEvent(new Event('blur'));
    expect(input.consumeToggleCamera()).toBe(false);
    expect(input.consumeRestart()).toBe(false);
  });

  test('V 與 R 各管各的，也都不影響駕駛輸入', () => {
    const { target, input } = attach();
    key(target, 'keydown', 'KeyV');
    expect(input.consumeRestart()).toBe(false);
    expect(input.driveInput()).toEqual({ throttle: 0, steer: 0, handbrake: false });
    expect(input.consumeToggleCamera()).toBe(true);

    key(target, 'keydown', 'KeyR');
    expect(input.consumeToggleCamera()).toBe(false);
    expect(input.consumeRestart()).toBe(true);
  });

  test('C（舊的綁定）與帶修飾鍵的 V（瀏覽器快捷鍵）都不切換鏡頭', () => {
    const { target, input } = attach();
    key(target, 'keydown', 'KeyC');
    key(target, 'keydown', 'KeyV', { ctrlKey: true });
    expect(input.consumeToggleCamera()).toBe(false);
  });
});
