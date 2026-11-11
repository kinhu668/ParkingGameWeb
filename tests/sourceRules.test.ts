// 原始碼規則（計畫第 13、14 節）：src/ 內不用 Math.random、不用 any 型別、不用 @ts-ignore 之類的註記。
// 沒裝 ESLint 與 @types/node，所以用 Vite 的 import.meta.glob 把 src/ 的原始碼當字串讀進來檢查。
import { describe, expect, test } from 'vitest';

const SOURCES: Record<string, string> = import.meta.glob('../src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const SOURCE_ENTRIES = Object.entries(SOURCES);

/**
 * 拿掉註解（區塊註解與行尾註解），讓註解裡的說明文字不會被當成程式碼。
 * 區塊註解裡的換行留著，回報的行號才對得上原始檔。
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ''))
    .replace(/\/\/.*$/gm, '');
}

/** 找出符合 pattern 的行，回報成「檔案:行號: 內容」。 */
function violations(pattern: RegExp, prepare: (source: string) => string): string[] {
  const found: string[] = [];
  for (const [path, source] of SOURCE_ENTRIES) {
    prepare(source).split('\n').forEach((line, index) => {
      if (pattern.test(line)) {
        found.push(`${path}:${index + 1}: ${line.trim()}`);
      }
    });
  }
  return found;
}

describe('檢查規則本身', () => {
  test('stripComments 拿掉兩種註解、留下程式碼，行數不變', () => {
    expect(stripComments('const a = 1; // any\n/* Math.random */ const b = 2;')).toBe(
      'const a = 1; \n const b = 2;',
    );
    expect(stripComments('/**\n * any\n */\nconst c = 3;')).toBe('\n\n\nconst c = 3;');
  });

  test('any 的比對抓得到各種寫法，不誤抓含 any 的識別字', () => {
    const anyType = /\bany\b/;
    for (const bad of ['let x: any;', 'value as any', 'Array<any>', 'any[]', '(a: any) => a']) {
      expect(anyType.test(bad)).toBe(true);
    }
    for (const fine of ['anyHeld(codes)', 'const company = 1;', 'many']) {
      expect(anyType.test(fine)).toBe(false);
    }
  });
});

describe('src/ 原始碼規則', () => {
  test('真的有讀到原始碼（含進入點與各層）', () => {
    const paths = SOURCE_ENTRIES.map(([path]) => path);
    expect(paths).toContain('../src/main.ts');
    expect(paths).toContain('../src/core/urlParams.ts');
    expect(paths).toContain('../src/vehicle/bicycleModel.ts');
    expect(paths.length).toBeGreaterThanOrEqual(25);
    for (const [, source] of SOURCE_ENTRIES) {
      expect(source.length).toBeGreaterThan(0);
    }
  });

  test('沒有 Math.random（亂數一律用 core/rng.ts 的固定種子）', () => {
    expect(violations(/Math\s*\.\s*random/, stripComments)).toEqual([]);
  });

  test('沒有 any 型別', () => {
    expect(violations(/\bany\b/, stripComments)).toEqual([]);
  });

  test('沒有 @ts-ignore、@ts-expect-error、@ts-nocheck', () => {
    expect(violations(/@ts-(ignore|expect-error|nocheck)/, (source) => source)).toEqual([]);
  });
});
