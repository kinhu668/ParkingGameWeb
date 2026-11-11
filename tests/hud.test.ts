// HUD 裡不需要 DOM 就能驗證的部分：車速文字與語言按鈕的切換目標。
import { describe, expect, test } from 'vitest';
import { LOCALES } from '../src/core/i18n';
import { mphToMps } from '../src/core/units';
import { formatSpeedMph, otherLocale } from '../src/ui/hud';

describe('formatSpeedMph', () => {
  test('m/s 換成 mph，固定一位小數', () => {
    expect(formatSpeedMph(0)).toBe('0.0');
    expect(formatSpeedMph(mphToMps(18))).toBe('18.0');
    expect(formatSpeedMph(mphToMps(0.5))).toBe('0.5');
    expect(formatSpeedMph(mphToMps(6.04))).toBe('6.0');
  });

  test('倒車顯示正數，不會出現 -0.0', () => {
    expect(formatSpeedMph(mphToMps(-9))).toBe('9.0');
    expect(formatSpeedMph(-0)).toBe('0.0');
    expect(formatSpeedMph(mphToMps(-0.01))).toBe('0.0');
  });
});

describe('otherLocale', () => {
  test('兩種語言互相切換，切兩次回到原本的語言', () => {
    expect(otherLocale('zh-TW')).toBe('en');
    expect(otherLocale('en')).toBe('zh-TW');
    for (const locale of LOCALES) {
      expect(otherLocale(otherLocale(locale))).toBe(locale);
    }
  });
});
