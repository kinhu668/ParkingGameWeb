// 翻譯檔的一致性，以及 i18n 的語言偵測與切換（純邏輯，不需要瀏覽器）。
import { beforeEach, describe, expect, test } from 'vitest';
import {
  LOCALES,
  detectLocale,
  getLocale,
  isLocale,
  isTranslationKey,
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
  // 第 2 階段第 2 輪：行車資訊與失敗狀態。
  'hud.time',
  'hud.collisions',
  'hud.gear',
  'hud.gearForward',
  'hud.gearReverse',
  'hud.angle',
  'status.failed',
  'status.failTimeout',
  'status.failCollisions',
  // 第 2 階段第 3 輪：結算、暫停、關卡選擇。
  'hud.controlPause',
  'result.time',
  'result.collisions',
  'result.angle',
  'result.next',
  'result.retry',
  'result.levelSelect',
  'pause.title',
  'pause.resume',
  'pause.hint',
  'select.title',
  'select.world',
  'select.bestTime',
  'select.locked',
  'select.comingSoon',
  // 第 2 階段第 4 輪：第 1 世界 10 關的名稱。
  'level.w1_l01.name',
  'level.w1_l02.name',
  'level.w1_l03.name',
  'level.w1_l04.name',
  'level.w1_l05.name',
  'level.w1_l06.name',
  'level.w1_l07.name',
  'level.w1_l08.name',
  'level.w1_l09.name',
  'level.w1_l10.name',
  'show.unknown',
  'bench.running',
  'bench.avgFps',
  'bench.low1',
  'bench.drawCalls',
  // 自訂按鍵：操作說明的新列、按鍵設定面板。
  'hud.controlBrake',
  'hud.controlGear',
  'hud.controlThrottle',
  'hud.controlsEdit',
  'pause.controls',
  'controls.title',
  'controls.hint',
  'controls.action.throttle',
  'controls.action.steerLeft',
  'controls.action.steerRight',
  'controls.action.brake',
  'controls.action.gearToggle',
  'controls.action.restart',
  'controls.action.toggleCamera',
  'controls.action.pause',
  'controls.listening',
  'controls.conflict',
  'controls.unsupported',
  'controls.gearNote',
  'controls.reset',
  'controls.done',
  'touch.gearToggle',
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

  test('提示文字不寫死按鍵：重來與繼續的提示用 {key}，由目前的綁定代入', () => {
    for (const locale of Object.keys(MESSAGES)) {
      const messages = MESSAGES[locale] ?? {};
      expect(String(messages['status.restartHint']), locale).toContain('{key}');
      expect(String(messages['pause.hint']), locale).toContain('{key}');
      expect(String(messages['controls.conflict']), locale).toContain('{key}');
      expect(String(messages['controls.conflict']), locale).toContain('{action}');
    }
  });

  test('檔位只有一個切換動作：沒有倒車油門、掛 D、掛 R、手排的字串，說明也不再講自排／手排', () => {
    for (const locale of Object.keys(MESSAGES)) {
      const messages = MESSAGES[locale] ?? {};
      for (const removed of [
        'controls.action.reverse',
        'controls.action.gearDrive',
        'controls.action.gearReverse',
        'touch.gearDrive',
        'touch.gearReverse',
        'hud.controlDrive',
        'hud.controlGears',
        'hud.gearManual',
      ]) {
        expect(messages, `${locale} ${removed}`).not.toHaveProperty([removed]);
      }
      expect(String(messages['controls.gearNote']), locale).not.toMatch(/自排|手排|manual|automatic/i);
    }
    expect(zhTW['hud.controlThrottle']).toBe('油門');
    expect(zhTW['controls.action.gearToggle']).toBe('切換 D／R 檔');
    expect(en['hud.controlThrottle']).toBe('Throttle');
    expect(en['controls.action.gearToggle']).toBe('Switch D / R');
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

describe('detectLocale：存檔裡的語言', () => {
  test('優先順序是 ?lang= > 存檔 > 瀏覽器', () => {
    expect(detectLocale('?lang=en', 'zh-TW', 'zh-TW')).toBe('en');
    expect(detectLocale('', 'zh-TW', 'en')).toBe('en');
    expect(detectLocale('', 'en-US', 'zh-TW')).toBe('zh-TW');
    expect(detectLocale('?level=w1_l01', 'en-US', 'zh-TW')).toBe('zh-TW');
  });

  test('?lang= 不認得：退回存檔的語言；沒有存檔才看瀏覽器', () => {
    expect(detectLocale('?lang=fr', 'zh-TW', 'en')).toBe('en');
    expect(detectLocale('?lang=fr', 'zh-TW', undefined)).toBe('zh-TW');
  });
});

describe('isLocale / isTranslationKey', () => {
  test('isLocale 只認支援的語言（大小寫要相同）', () => {
    expect(LOCALES.every((locale) => isLocale(locale))).toBe(true);
    expect(isLocale('zh-tw')).toBe(false);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('')).toBe(false);
  });

  test('isTranslationKey 只認翻譯檔裡有的鍵，不被物件內建屬性騙到', () => {
    expect(isTranslationKey('level.w1_l01.name')).toBe(true);
    expect(isTranslationKey('select.title')).toBe(true);
    expect(isTranslationKey('level.w9_l99.name')).toBe(false);
    expect(isTranslationKey('toString')).toBe(false);
    expect(isTranslationKey('')).toBe(false);
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
