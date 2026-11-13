// 螢幕操作層上的鍵帽：控制項 ↔ 動作的對應、鍵帽上的字跟著綁定走（改鍵後是新的鍵）、鍵帽的位置落在控制項裡。
import { describe, expect, test } from 'vitest';
import { ASSIST_VIEW_IDS, assistLayout, type Rect } from '../src/core/assistLayout';
import { DEFAULT_BINDINGS, keyLabel, rebind, type ControlBindings } from '../src/core/controls';
import {
  TOUCH_KEY_BADGES,
  TOUCH_KEY_SLOT,
  keyBadgePosition,
  touchKeyCode,
} from '../src/core/touchKeys';
import { TOUCH_CONTROL_IDS, touchLayout } from '../src/core/touchLayout';
import en from '../src/locale/en.json';
import zhTW from '../src/locale/zh-TW.json';

/** 鍵帽上的字（不含要翻譯的空白鍵）。 */
function capText(bindings: ControlBindings, action: Parameters<typeof touchKeyCode>[1]): string {
  const label = keyLabel(touchKeyCode(bindings, action));
  return 'text' in label ? label.text : label.key;
}

function badgesOn(control: string): readonly string[] {
  return TOUCH_KEY_BADGES.filter((badge) => badge.control === control).map((badge) => badge.action);
}

describe('控制項 ↔ 動作', () => {
  test('方向盤是左轉與右轉兩個鍵；油門是 throttle；剎車是腳剎 brake（不是手煞車）', () => {
    expect(badgesOn('wheel')).toEqual(['steerLeft', 'steerRight']);
    expect(badgesOn('gas')).toEqual(['throttle']);
    expect(badgesOn('brake')).toEqual(['brake']);
    expect(TOUCH_KEY_BADGES.map((badge) => badge.action)).not.toContain('handbrake');
  });

  test('掛檔、暫停、重來、鏡頭各一個；每個控制項都有鍵帽，每個動作只出現一次', () => {
    expect(badgesOn('gearDrive')).toEqual(['gearDrive']);
    expect(badgesOn('gearReverse')).toEqual(['gearReverse']);
    expect(badgesOn('pause')).toEqual(['pause']);
    expect(badgesOn('restart')).toEqual(['restart']);
    expect(badgesOn('camera')).toEqual(['toggleCamera']);
    for (const id of TOUCH_CONTROL_IDS) {
      expect(badgesOn(id).length, id).toBeGreaterThanOrEqual(1);
    }
    const actions = TOUCH_KEY_BADGES.map((badge) => badge.action);
    expect(new Set(actions).size).toBe(actions.length);
  });

  test('方向盤的兩個鍵帽一左一右', () => {
    const anchors = TOUCH_KEY_BADGES.filter((badge) => badge.control === 'wheel').map((badge) => badge.anchor);
    expect(anchors).toEqual(['left', 'right']);
  });
});

describe('鍵帽上的字', () => {
  test('預設綁定：A／D、W、逗號、Q／R、Esc、Backspace、V', () => {
    expect(capText(DEFAULT_BINDINGS, 'steerLeft')).toBe('A');
    expect(capText(DEFAULT_BINDINGS, 'steerRight')).toBe('D');
    expect(capText(DEFAULT_BINDINGS, 'throttle')).toBe('W');
    expect(capText(DEFAULT_BINDINGS, 'brake')).toBe(',');
    expect(capText(DEFAULT_BINDINGS, 'gearDrive')).toBe('Q');
    expect(capText(DEFAULT_BINDINGS, 'gearReverse')).toBe('R');
    expect(capText(DEFAULT_BINDINGS, 'pause')).toBe('Esc');
    expect(capText(DEFAULT_BINDINGS, 'restart')).toBe('Backspace');
    expect(capText(DEFAULT_BINDINGS, 'toggleCamera')).toBe('V');
  });

  test('改鍵之後用的是新的綁定；鍵帽改的是主要鍵，備用鍵不動', () => {
    const result = rebind(DEFAULT_BINDINGS, 'throttle', TOUCH_KEY_SLOT, 'KeyI');
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') {
      return;
    }
    expect(capText(result.bindings, 'throttle')).toBe('I');
    expect(result.bindings.throttle).toEqual(['KeyI', 'ArrowUp']);
    // 別的鍵帽不受影響。
    expect(capText(result.bindings, 'brake')).toBe(',');
    expect(capText(result.bindings, 'steerLeft')).toBe('A');
  });

  test('已經是別的動作的鍵：擋下來（與按鍵設定面板同一條規則），鍵帽不變', () => {
    const result = rebind(DEFAULT_BINDINGS, 'throttle', TOUCH_KEY_SLOT, 'KeyS');
    expect(result).toEqual({ kind: 'conflict', action: 'reverse' });
    expect(capText(DEFAULT_BINDINGS, 'throttle')).toBe('W');
  });

  test('空白鍵走翻譯鍵', () => {
    const result = rebind({ ...DEFAULT_BINDINGS, handbrake: ['Slash'] }, 'brake', TOUCH_KEY_SLOT, 'Space');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(capText(result.bindings, 'brake')).toBe('hud.keySpace');
    }
  });
});

describe('鍵帽的位置', () => {
  const rect: Rect = { x: 100, y: 200, width: 80, height: 120 };

  test('左：貼左上角；中：上緣中間往內一點；右：貼右上角', () => {
    expect(keyBadgePosition(rect, 'left')).toEqual({ x: 100, y: 200, anchor: 'left' });
    expect(keyBadgePosition(rect, 'center')).toEqual({ x: 140, y: 204, anchor: 'center' });
    expect(keyBadgePosition(rect, 'right')).toEqual({ x: 180, y: 200, anchor: 'right' });
  });

  test.each([
    [1280, 720],
    [1920, 1080],
    [1024, 768],
    [844, 390],
  ] as const)('%i×%i：定位點都在自己的控制項裡，所以在輔助小窗的下面', (width, height) => {
    const layout = touchLayout(width, height);
    const assist = assistLayout(width, height);
    const assistBottom = Math.max(...ASSIST_VIEW_IDS.map((id) => assist[id].y + assist[id].height));
    for (const badge of TOUCH_KEY_BADGES) {
      const control = layout[badge.control];
      const position = keyBadgePosition(control, badge.anchor);
      expect(position.x, badge.action).toBeGreaterThanOrEqual(control.x);
      expect(position.x, badge.action).toBeLessThanOrEqual(control.x + control.width);
      expect(position.y, badge.action).toBeGreaterThanOrEqual(control.y);
      expect(position.y, badge.action).toBeLessThan(control.y + control.height / 2);
      expect(position.y, badge.action).toBeGreaterThan(assistBottom);
    }
  });
});

describe('文案', () => {
  test('鏡頭鍵與改鍵提示中英文都有', () => {
    expect(zhTW['touch.camera']).toBe('鏡頭');
    expect(en['touch.camera']).toBe('Camera');
    expect(zhTW['touch.rebindPrompt']).toContain('{action}');
    expect(en['touch.rebindPrompt']).toContain('{action}');
    expect(zhTW['touch.rebindCancel']).toContain('Esc');
    expect(en['touch.rebindCancel']).toContain('Esc');
  });
});
