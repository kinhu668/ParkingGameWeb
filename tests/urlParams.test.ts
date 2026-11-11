// 網址參數 → 啟動模式：各模式、優先順序（show > cam > bench > 一般遊戲）、未知值的處理、與 ?lang= 並用。
import { describe, expect, test } from 'vitest';
import { detectLocale } from '../src/core/i18n';
import { CAMERA_PRESETS, parseUrlMode } from '../src/core/urlParams';

describe('parseUrlMode：各模式', () => {
  test.each(['', '?', '?foo=1', '?t=3'])('%j → 一般遊戲', (search) => {
    expect(parseUrlMode(search)).toEqual({ kind: 'game' });
  });

  test('?show=<id> → 展示模式，id 原樣保留', () => {
    expect(parseUrlMode('?show=car_sedan')).toEqual({ kind: 'show', id: 'car_sedan' });
    expect(parseUrlMode('?show=parking_spot')).toEqual({ kind: 'show', id: 'parking_spot' });
  });

  test.each(CAMERA_PRESETS)('?cam=%s&t=2 → 固定鏡頭截圖', (preset) => {
    expect(parseUrlMode(`?cam=${preset}&t=2`)).toEqual({ kind: 'cam', preset, timeSeconds: 2 });
  });

  test('鏡頭預設就是 follow、top、spot_low', () => {
    expect(CAMERA_PRESETS).toEqual(['follow', 'top', 'spot_low']);
  });

  test('t 可以是小數，參數順序不影響', () => {
    expect(parseUrlMode('?t=2.5&cam=top')).toEqual({ kind: 'cam', preset: 'top', timeSeconds: 2.5 });
  });

  test.each(['?bench', '?bench=', '?bench=1'])('%j → 效能測試（不必有值）', (search) => {
    expect(parseUrlMode(search)).toEqual({ kind: 'bench' });
  });

  test('開頭沒有問號也能解析', () => {
    expect(parseUrlMode('bench')).toEqual({ kind: 'bench' });
  });
});

describe('parseUrlMode：優先順序 show > cam > bench > 一般遊戲', () => {
  test('show 蓋過 cam 與 bench', () => {
    expect(parseUrlMode('?bench&cam=top&t=2&show=car_sedan')).toEqual({
      kind: 'show',
      id: 'car_sedan',
    });
  });

  test('cam 蓋過 bench', () => {
    expect(parseUrlMode('?bench&cam=spot_low&t=1')).toEqual({
      kind: 'cam',
      preset: 'spot_low',
      timeSeconds: 1,
    });
  });
});

describe('parseUrlMode：未知值', () => {
  test('未知的 show id 仍是展示模式（由展示模式顯示可用清單），空值也一樣', () => {
    expect(parseUrlMode('?show=nope')).toEqual({ kind: 'show', id: 'nope' });
    expect(parseUrlMode('?show=')).toEqual({ kind: 'show', id: '' });
    expect(parseUrlMode('?show')).toEqual({ kind: 'show', id: '' });
  });

  test.each(['?cam=nope&t=2', '?cam=&t=2', '?cam&t=2', '?cam=TOP&t=2'])(
    '%j：不認得的鏡頭退回 follow',
    (search) => {
      expect(parseUrlMode(search)).toEqual({ kind: 'cam', preset: 'follow', timeSeconds: 2 });
    },
  );

  test.each(['?cam=top', '?cam=top&t=', '?cam=top&t=abc', '?cam=top&t=-3', '?cam=top&t=Infinity', '?cam=top&t=NaN'])(
    '%j：沒給 t 或 t 不是非負的有限數字 → 0',
    (search) => {
      expect(parseUrlMode(search)).toEqual({ kind: 'cam', preset: 'top', timeSeconds: 0 });
    },
  );
});

describe('?lang= 與其他參數並用', () => {
  test.each([
    ['?lang=en&show=car_sedan', 'show'],
    ['?cam=top&t=2&lang=en', 'cam'],
    ['?bench&lang=en', 'bench'],
    ['?lang=en', 'game'],
  ])('%j → 模式 %s，語言 en', (search, kind) => {
    expect(parseUrlMode(search).kind).toBe(kind);
    expect(detectLocale(search, 'zh-TW')).toBe('en');
  });
});
