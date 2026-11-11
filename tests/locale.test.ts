// 翻譯檔的一致性，以及 i18n 的語言偵測與切換（純邏輯，不需要瀏覽器）。
import { beforeEach, describe, expect, test } from 'vitest';
import {
  LOCALES,
  detectLocale,
  getLocale,
  onLocaleChange,
  setLocale,
  t,
} from '../src/core/i18n';
import en from '../src/locale/en.json';
import zhTW from '../src/locale/zh-TW.json';

const MESSAGES: Record<string, Record<string, unknown>> = { 'zh-TW': zhTW, en };

/** 計畫第 8 節預計的鍵，兩種語言都必須有。 */
const PLANNED_KEYS = [
  'hud.speed',
  'hud.controls',
  'hud.language',
  'status.parked',
  'status.restartHint',
  'show.unknown',
  'bench.running',
  'bench.avgFps',
  'bench.low1',
  'bench.drawCalls',
];

describe('翻譯檔', () => {
  test('zh-TW 與 en 的鍵集合完全相同', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zhTW).sort());
  });

  test('每個支援的語言都有翻譯檔，而且沒有多的', () => {
    expect(Object.keys(MESSAGES).sort()).toEqual([...LOCALES].sort());
  });

  test.each(Object.keys(MESSAGES))('%s：每個值都是字串，沒有空字串或只有空白', (locale) => {
    const entries = Object.entries(MESSAGES[locale] ?? {});
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, value] of entries) {
      expect(typeof value, key).toBe('string');
      expect(String(value).trim(), key).not.toBe('');
    }
  });

  test.each(Object.keys(MESSAGES))('%s：包含計畫預計的鍵', (locale) => {
    expect(Object.keys(MESSAGES[locale] ?? {})).toEqual(expect.arrayContaining(PLANNED_KEYS));
  });

  test('操作說明有「切換鏡頭」，五個鏡頭模式各有名稱', () => {
    expect(zhTW['hud.controlCamera']).toBe('切換鏡頭');
    expect(en['hud.controlCamera']).toBe('Change camera');
    for (const locale of Object.keys(MESSAGES)) {
      const cameraKeys = Object.keys(MESSAGES[locale] ?? {}).filter((key) => key.startsWith('camera.'));
      expect(cameraKeys.sort(), locale).toEqual(
        ['camera.chase_far', 'camera.chase_near', 'camera.cockpit', 'camera.hood', 'camera.top'],
      );
    }
  });

  test('中文版真的是中文、英文版真的是英文（防止兩份檔貼反）', () => {
    expect(zhTW['hud.speed']).toMatch(/[一-鿿]/);
    expect(en['hud.speed']).toMatch(/^[\x20-\x7e]+$/);
  });
});

describe('detectLocale', () => {
  test('?lang= 優先於瀏覽器語言', () => {
    expect(detectLocale('?lang=en', 'zh-TW')).toBe('en');
    expect(detectLocale('?lang=zh-TW', 'en-US')).toBe('zh-TW');
  });

  test('?lang= 可以與其他參數並用', () => {
    expect(detectLocale('?cam=top&lang=zh-TW&t=2', 'en-US')).toBe('zh-TW');
    expect(detectLocale('?bench&lang=en', 'zh-TW')).toBe('en');
  });

  test('沒有 ?lang=：zh 開頭 → zh-TW，其餘 → en', () => {
    expect(detectLocale('', 'zh-TW')).toBe('zh-TW');
    expect(detectLocale('', 'zh')).toBe('zh-TW');
    expect(detectLocale('', 'zh-Hant-HK')).toBe('zh-TW');
    expect(detectLocale('', 'zh-CN')).toBe('zh-TW');
    expect(detectLocale('', 'ZH-tw')).toBe('zh-TW');
    expect(detectLocale('', 'en-US')).toBe('en');
    expect(detectLocale('', 'ja-JP')).toBe('en');
    expect(detectLocale('', '')).toBe('en');
  });

  test('?lang= 是不支援的值或空值：當作沒給，退回瀏覽器語言', () => {
    expect(detectLocale('?lang=fr', 'zh-TW')).toBe('zh-TW');
    expect(detectLocale('?lang=fr', 'en-US')).toBe('en');
    expect(detectLocale('?lang=', 'zh-TW')).toBe('zh-TW');
    expect(detectLocale('?lang=zh', 'en-US')).toBe('en');
  });
});

describe('setLocale / getLocale / t', () => {
  beforeEach(() => {
    setLocale('zh-TW');
  });

  test('切換後 getLocale 與 t 立刻反映新語言', () => {
    expect(getLocale()).toBe('zh-TW');
    expect(t('hud.speed')).toBe(zhTW['hud.speed']);
    expect(t('status.parked')).toBe(zhTW['status.parked']);

    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(t('hud.speed')).toBe(en['hud.speed']);
    expect(t('status.parked')).toBe(en['status.parked']);
  });

  test('切換時通知訂閱者，通知當下已經是新語言', () => {
    const seen: string[] = [];
    onLocaleChange(() => {
      seen.push(`${getLocale()}:${t('hud.speed')}`);
    });

    setLocale('en');
    setLocale('zh-TW');
    expect(seen).toEqual([`en:${en['hud.speed']}`, `zh-TW:${zhTW['hud.speed']}`]);
  });

  test('設成目前的語言不通知', () => {
    let calls = 0;
    onLocaleChange(() => {
      calls += 1;
    });

    setLocale('zh-TW');
    expect(calls).toBe(0);
    setLocale('en');
    setLocale('en');
    expect(calls).toBe(1);
  });
});
