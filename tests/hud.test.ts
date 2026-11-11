// HUD 裡不需要 DOM 就能驗證的部分：車速文字、語言按鈕的切換目標、鏡頭名稱的翻譯鍵。
import { beforeEach, describe, expect, test } from 'vitest';
import { GAME_CAMERA_VIEWS } from '../src/core/cameraView';
import { LOCALES, setLocale, t } from '../src/core/i18n';
import { mphToMps } from '../src/core/units';
import { cameraViewLabelKey, formatSpeedMph, otherLocale } from '../src/ui/hud';

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

describe('cameraViewLabelKey：鏡頭名稱', () => {
  beforeEach(() => {
    setLocale('zh-TW');
  });

  test('每個鏡頭模式各有自己的名稱，沒有兩個模式共用', () => {
    const keys = GAME_CAMERA_VIEWS.map(cameraViewLabelKey);
    expect(new Set(keys).size).toBe(GAME_CAMERA_VIEWS.length);
  });

  test.each([
    ['chase_near', '近距離跟車', 'Chase Cam (Near)'],
    ['chase_far', '遠距離跟車', 'Chase Cam (Far)'],
    ['hood', '引擎蓋', 'Hood Cam'],
    ['cockpit', '駕駛座', 'Cockpit'],
    ['top', '俯視', 'Top-Down'],
  ] as const)('%s：中文「%s」、英文 “%s”，切換語言後跟著變', (view, chinese, english) => {
    expect(t(cameraViewLabelKey(view))).toBe(chinese);
    setLocale('en');
    expect(t(cameraViewLabelKey(view))).toBe(english);
  });
});
