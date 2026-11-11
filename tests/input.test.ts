import { describe, expect, test } from 'vitest';
import { KEY_BINDINGS, driveInputFromHeldCodes, shouldPreventDefault } from '../src/core/input';

function held(...codes: string[]): ReadonlySet<string> {
  return new Set(codes);
}

describe('KEY_BINDINGS', () => {
  test('與計畫第 6 節的按鍵表一致', () => {
    expect(KEY_BINDINGS).toEqual({
      throttle: ['KeyW', 'ArrowUp'],
      reverse: ['KeyS', 'ArrowDown'],
      steerLeft: ['KeyA', 'ArrowLeft'],
      steerRight: ['KeyD', 'ArrowRight'],
      handbrake: ['Space'],
      restart: ['KeyR'],
      toggleCamera: ['KeyC'],
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

  test('R、C、Esc 與沒綁定的鍵不影響駕駛輸入', () => {
    expect(driveInputFromHeldCodes(held('KeyR', 'KeyC', 'Escape', 'KeyQ', 'Enter'))).toEqual({
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
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyC', 'Escape', 'F5', 'Tab']) {
      expect(shouldPreventDefault(code)).toBe(false);
    }
  });
});
