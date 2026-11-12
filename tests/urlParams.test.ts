// 網址參數 → 啟動模式：各模式、優先順序（show > cam > bench > 一般遊戲）、未知值的處理、與 ?lang= 並用。
import { describe, expect, test } from 'vitest';
import { detectLocale } from '../src/core/i18n';
import {
  CAMERA_PRESETS,
  navigationSearch,
  parseLevelParam,
  parseUnlockAllParam,
  parseUrlMode,
} from '../src/core/urlParams';

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

describe('parseLevelParam：?level=<id>', () => {
  test.each(['', '?', '?foo=1', '?cam=top&t=2', '?bench', '?view=top&lang=en'])(
    '%j 沒有指定關卡 → undefined',
    (search) => {
      expect(parseLevelParam(search)).toBeUndefined();
    },
  );

  test.each(['?level', '?level=', '?level=%20%20'])('%j 空值當作沒給', (search) => {
    expect(parseLevelParam(search)).toBeUndefined();
  });

  test('回傳 id（去掉前後空白，其餘原樣保留）', () => {
    expect(parseLevelParam('?level=w1_l03')).toBe('w1_l03');
    expect(parseLevelParam('?level=prototype')).toBe('prototype');
    expect(parseLevelParam('?level=%20w1_l01%20')).toBe('w1_l01');
    expect(parseLevelParam('?level=W1_L03')).toBe('W1_L03');
  });

  test('不認得的 id 也原樣回傳：認不認得由關卡目錄決定，這裡不悄悄換成別關', () => {
    expect(parseLevelParam('?level=nope')).toBe('nope');
  });

  test('可以與任何模式、其他參數並用，不影響啟動模式', () => {
    expect(parseLevelParam('?cam=top&t=2&level=w1_l03')).toBe('w1_l03');
    expect(parseLevelParam('?bench&level=w1_l01&quality=low')).toBe('w1_l01');
    expect(parseLevelParam('?view=top&level=prototype&lang=zh-TW')).toBe('prototype');
    expect(parseUrlMode('?level=w1_l03')).toEqual({ kind: 'game' });
    expect(parseUrlMode('?cam=top&t=2&level=w1_l03')).toEqual({
      kind: 'cam',
      preset: 'top',
      timeSeconds: 2,
    });
    expect(parseUrlMode('?bench&level=w1_l03')).toEqual({ kind: 'bench' });
  });

  test('重複給的時候用第一個', () => {
    expect(parseLevelParam('?level=w1_l01&level=w1_l03')).toBe('w1_l01');
  });
});

describe('parseUnlockAllParam', () => {
  test('只有 ?unlock=all 算數', () => {
    expect(parseUnlockAllParam('?unlock=all')).toBe(true);
    expect(parseUnlockAllParam('?lang=en&unlock=all&quality=low')).toBe(true);
  });

  test.each(['', '?unlock', '?unlock=', '?unlock=ALL', '?unlock=1', '?unlock=w1_l03', '?level=all'])(
    '%j → false',
    (search) => {
      expect(parseUnlockAllParam(search)).toBe(false);
    },
  );

  test('不是啟動模式：不影響 parseUrlMode', () => {
    expect(parseUrlMode('?unlock=all')).toEqual({ kind: 'game' });
  });
});

describe('navigationSearch：換關／回關卡選擇的查詢字串', () => {
  test('進關：加上 level，放在最前面；quality、lang、view 原樣保留', () => {
    expect(navigationSearch('?quality=low&lang=zh-TW&view=top', 'w1_l01', 'zh-TW')).toBe(
      '?level=w1_l01&quality=low&lang=zh-TW&view=top',
    );
  });

  test('下一關：level 換掉，不會出現兩個', () => {
    expect(navigationSearch('?level=w1_l01&quality=high', 'w1_l03', 'en')).toBe(
      '?level=w1_l03&quality=high',
    );
  });

  test('回關卡選擇：拿掉 level，其餘保留；沒有其他參數就是空字串', () => {
    expect(navigationSearch('?level=w1_l01&view=cockpit&unlock=all', undefined, 'en')).toBe(
      '?view=cockpit&unlock=all',
    );
    expect(navigationSearch('?level=w1_l01', undefined, 'en')).toBe('');
    expect(navigationSearch('', undefined, 'zh-TW')).toBe('');
  });

  test('網址原本有 lang：改成現在的語言（在這一頁按過語言按鈕不會被蓋回去）', () => {
    expect(navigationSearch('?level=w1_l01&lang=zh-TW', 'w1_l03', 'en')).toBe(
      '?level=w1_l03&lang=en',
    );
    expect(navigationSearch('?lang=en', 'w1_l01', 'zh-TW')).toBe('?level=w1_l01&lang=zh-TW');
  });

  test('網址原本沒有 lang：不加（交給存檔或瀏覽器語言）', () => {
    expect(navigationSearch('?quality=low', 'w1_l01', 'en')).toBe('?level=w1_l01&quality=low');
  });

  test('結果解析回來：level 是目的地，其他模式參數沒有被加進去', () => {
    const search = navigationSearch('?view=top', 'w1_l03', 'en');
    expect(parseLevelParam(search)).toBe('w1_l03');
    expect(parseUrlMode(search)).toEqual({ kind: 'game' });
  });
});
