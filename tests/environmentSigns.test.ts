// 招牌文字（計畫 §3.2）：每個環境都有一筆、主招牌是計畫定的虛構名稱、字元合規、不含真實品牌。
import { describe, expect, test } from 'vitest';
import { ENVIRONMENT_SIGNS, signTextsFor } from '../src/level/environmentSigns';
import { worldLevels } from '../src/level/levelCatalog';
import { LEVEL_ENVIRONMENTS } from '../src/level/levelSchema';

/** 招牌只能用大寫英數、空白與 & ' . -（系統粗體 sans-serif 畫得出來、每台機器一樣）。 */
const SIGN_PATTERN = /^[A-Z0-9&'. -]+$/;

/** 不能出現的真實品牌與機構（小寫比對）。 */
const REAL_BRANDS = [
  'costco',
  'walmart',
  "sam's",
  'target',
  'usps',
  'fedex',
  'ups',
  'kroger',
  'safeway',
  'starbucks',
  'home depot',
  "bj's",
  'cvs',
  'walgreens',
  "mcdonald's",
  'mcdonalds',
  'amazon',
  'lowes',
  "lowe's",
  'dhl',
];

/** 多個字的真實品牌與機構名稱（小寫，整句裡出現就不行）。 */
const REAL_BRAND_PHRASES = [
  'home depot',
  'united states postal service',
  'u.s. postal service',
  'us postal service',
  'postal service',
  'us post office',
  'u.s. post office',
  'united states post office',
  'whole foods',
  'best buy',
  'trader joe',
];

describe('環境招牌', () => {
  test('每個環境都有一筆，沒有多的', () => {
    expect(Object.keys(ENVIRONMENT_SIGNS).sort()).toEqual([...LEVEL_ENVIRONMENTS].sort());
  });

  test('大賣場與郵局的主招牌是計畫定的虛構名稱', () => {
    expect(ENVIRONMENT_SIGNS.warehouse_club.main).toBe('BULKWORTH WHOLESALE CLUB');
    expect(ENVIRONMENT_SIGNS.post_office.main).toBe('MAPLE HOLLOW POST OFFICE');
    expect(signTextsFor('warehouse_club')[0]).toBe('BULKWORTH WHOLESALE CLUB');
    expect(signTextsFor('open_lot')).toEqual([]);
  });

  test('第 1 世界用到的環境，除了空地都至少有一塊招牌', () => {
    for (const level of worldLevels(1)) {
      if (level.environment !== 'open_lot') {
        expect(signTextsFor(level.environment).length, level.id).toBeGreaterThan(0);
      }
    }
  });

  test.each(LEVEL_ENVIRONMENTS)('%s：字元合規、沒有重複、不含真實品牌', (environment) => {
    const texts = signTextsFor(environment);
    expect(new Set(texts).size).toBe(texts.length);
    for (const text of texts) {
      expect(text, text).toMatch(SIGN_PATTERN);
      expect(text.trim(), text).toBe(text);
      for (const brand of REAL_BRANDS) {
        expect(text.toLowerCase().split(/[^a-z']+/), text).not.toContain(brand);
      }
      for (const phrase of REAL_BRAND_PHRASES) {
        expect(text.toLowerCase(), text).not.toContain(phrase);
      }
      // 「POST OFFICE」只能跟在虛構地名後面當通稱，不能單獨當官方名稱。
      expect(text).not.toBe('POST OFFICE');
    }
  });
});
