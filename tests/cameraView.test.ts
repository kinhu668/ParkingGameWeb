// 鏡頭模式的純邏輯：V 鍵的循環順序、?view= 解析、進場鏡頭的優先順序、用 Storage 記住選擇。
// 不碰全域 localStorage：測試一律注入同樣形狀的物件。
import { describe, expect, test } from 'vitest';
import {
  CAMERA_VIEW_STORAGE_KEY,
  DEFAULT_GAME_CAMERA_VIEW,
  GAME_CAMERA_VIEWS,
  loadStoredView,
  nextGameCameraView,
  parseViewParam,
  resolveInitialView,
  storeView,
  type GameCameraView,
  type ViewStorage,
} from '../src/core/cameraView';
import { detectLocale } from '../src/core/i18n';
import { parseUrlMode } from '../src/core/urlParams';

/** 用 Map 做的假 Storage；entries 可以直接檢查存了什麼。 */
function fakeStorage(initial: Readonly<Record<string, string>> = {}): {
  readonly storage: ViewStorage;
  readonly entries: Map<string, string>;
} {
  const entries = new Map(Object.entries(initial));
  return {
    entries,
    storage: {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => {
        entries.set(key, value);
      },
    },
  };
}

/** 讀寫都丟例外的 Storage（瀏覽器停用儲存、額度已滿）。 */
const BROKEN_STORAGE: ViewStorage = {
  getItem: () => {
    throw new Error('getItem 被擋');
  },
  setItem: () => {
    throw new Error('setItem 被擋');
  },
};

describe('鏡頭模式與循環順序', () => {
  test('五個模式，順序就是按 V 的順序', () => {
    expect(GAME_CAMERA_VIEWS).toEqual(['chase_near', 'chase_far', 'hood', 'cockpit', 'top']);
  });

  test('預設是近距離跟車', () => {
    expect(DEFAULT_GAME_CAMERA_VIEW).toBe('chase_near');
  });

  test('每按一次換到下一個，最後一個之後回到第一個', () => {
    expect(nextGameCameraView('chase_near')).toBe('chase_far');
    expect(nextGameCameraView('chase_far')).toBe('hood');
    expect(nextGameCameraView('hood')).toBe('cockpit');
    expect(nextGameCameraView('cockpit')).toBe('top');
    expect(nextGameCameraView('top')).toBe('chase_near');
  });

  test.each(GAME_CAMERA_VIEWS)('從 %s 開始按五次，走過每個模式各一次後回到起點', (start) => {
    const visited: GameCameraView[] = [];
    let view = start;
    for (let press = 0; press < GAME_CAMERA_VIEWS.length; press += 1) {
      view = nextGameCameraView(view);
      visited.push(view);
    }
    expect(view).toBe(start);
    expect([...visited].sort()).toEqual([...GAME_CAMERA_VIEWS].sort());
  });
});

describe('parseViewParam（?view=）', () => {
  test.each(GAME_CAMERA_VIEWS)('?view=%s → 該模式', (view) => {
    expect(parseViewParam(`?view=${view}`)).toBe(view);
  });

  test.each([
    '',
    '?',
    '?foo=1',
    '?view',
    '?view=',
    '?view=nope',
    '?view=follow',
    '?view=spot_low',
    '?view=TOP',
    '?view=Cockpit',
    '?view=chase-near',
    '?view=%20hood',
    '?view=toString',
  ])('%j → 無效（undefined），不丟例外', (search) => {
    expect(parseViewParam(search)).toBeUndefined();
  });

  test('開頭沒有問號、參數順序不同也能解析', () => {
    expect(parseViewParam('view=hood')).toBe('hood');
    expect(parseViewParam('?lang=en&view=top&foo=1')).toBe('top');
  });

  test.each(['?view=cockpit', '?view=top', '?view=nope', '?view=', '?view=hood&lang=en&t=3'])(
    '%j 不改變啟動模式：仍是一般遊戲',
    (search) => {
      expect(parseUrlMode(search)).toEqual({ kind: 'game' });
    },
  );

  test('同時有 show／cam／bench 時，啟動模式由它們決定，與 ?view= 無關', () => {
    expect(parseUrlMode('?view=cockpit&show=car_sedan')).toEqual({ kind: 'show', id: 'car_sedan' });
    expect(parseUrlMode('?view=cockpit&cam=top&t=2')).toEqual({
      kind: 'cam',
      preset: 'top',
      timeSeconds: 2,
    });
    expect(parseUrlMode('?view=cockpit&bench')).toEqual({ kind: 'bench' });
  });

  test('可與 ?lang= 並用，兩邊各自解析', () => {
    for (const search of ['?view=hood&lang=en', '?lang=en&view=hood']) {
      expect(parseViewParam(search)).toBe('hood');
      expect(detectLocale(search, 'zh-TW')).toBe('en');
      expect(parseUrlMode(search)).toEqual({ kind: 'game' });
    }
    expect(detectLocale('?view=hood&lang=zh-TW', 'en-US')).toBe('zh-TW');
  });
});

describe('記住鏡頭：loadStoredView / storeView', () => {
  test('存的鍵是 parkinggame.cameraView', () => {
    expect(CAMERA_VIEW_STORAGE_KEY).toBe('parkinggame.cameraView');
  });

  test.each(GAME_CAMERA_VIEWS)('存 %s 之後讀得回來', (view) => {
    const { storage, entries } = fakeStorage();
    storeView(storage, view);
    expect(entries.get(CAMERA_VIEW_STORAGE_KEY)).toBe(view);
    expect(loadStoredView(storage)).toBe(view);
  });

  test('後存的蓋掉先存的，不動別的鍵', () => {
    const { storage, entries } = fakeStorage({ other: 'keep' });
    storeView(storage, 'hood');
    storeView(storage, 'top');
    expect(loadStoredView(storage)).toBe('top');
    expect(entries.get('other')).toBe('keep');
    expect(entries.size).toBe(2);
  });

  test('沒存過、存的值不認得 → undefined', () => {
    expect(loadStoredView(fakeStorage().storage)).toBeUndefined();
    for (const junk of ['', 'nope', 'TOP', 'follow', '{"view":"top"}']) {
      const { storage } = fakeStorage({ [CAMERA_VIEW_STORAGE_KEY]: junk });
      expect(loadStoredView(storage)).toBeUndefined();
    }
  });

  test('讀寫丟例外或根本沒有 storage：當作沒存過，不往外丟', () => {
    expect(loadStoredView(BROKEN_STORAGE)).toBeUndefined();
    expect(() => storeView(BROKEN_STORAGE, 'hood')).not.toThrow();
    expect(loadStoredView(undefined)).toBeUndefined();
    expect(() => storeView(undefined, 'hood')).not.toThrow();
  });
});

describe('resolveInitialView：?view= > 上次存的 > 預設', () => {
  test('什麼都沒有 → 預設', () => {
    expect(resolveInitialView('', fakeStorage().storage)).toBe(DEFAULT_GAME_CAMERA_VIEW);
    expect(resolveInitialView('?lang=en', undefined)).toBe(DEFAULT_GAME_CAMERA_VIEW);
  });

  test('只有存過 → 用存的', () => {
    const { storage } = fakeStorage({ [CAMERA_VIEW_STORAGE_KEY]: 'top' });
    expect(resolveInitialView('', storage)).toBe('top');
    expect(resolveInitialView('?lang=en', storage)).toBe('top');
  });

  test('有效的 ?view= 蓋過存的，而且不會因此改寫存的值', () => {
    const { storage, entries } = fakeStorage({ [CAMERA_VIEW_STORAGE_KEY]: 'top' });
    expect(resolveInitialView('?view=cockpit', storage)).toBe('cockpit');
    expect(entries.get(CAMERA_VIEW_STORAGE_KEY)).toBe('top');
  });

  test('無效的 ?view= 當作沒給：退回存的，再退回預設', () => {
    const { storage } = fakeStorage({ [CAMERA_VIEW_STORAGE_KEY]: 'hood' });
    expect(resolveInitialView('?view=nope', storage)).toBe('hood');
    expect(resolveInitialView('?view=', storage)).toBe('hood');
    expect(resolveInitialView('?view=HOOD', fakeStorage().storage)).toBe(DEFAULT_GAME_CAMERA_VIEW);
  });

  test('存的值不認得或 storage 壞掉 → 預設；?view= 仍然有效', () => {
    const { storage } = fakeStorage({ [CAMERA_VIEW_STORAGE_KEY]: 'nope' });
    expect(resolveInitialView('', storage)).toBe(DEFAULT_GAME_CAMERA_VIEW);
    expect(resolveInitialView('', BROKEN_STORAGE)).toBe(DEFAULT_GAME_CAMERA_VIEW);
    expect(resolveInitialView('?view=chase_far', BROKEN_STORAGE)).toBe('chase_far');
  });

  test('切換後存起來，下次進場（沒有 ?view=）就是那個模式', () => {
    const { storage } = fakeStorage();
    const switched = nextGameCameraView(resolveInitialView('', storage));
    storeView(storage, switched);
    expect(resolveInitialView('', storage)).toBe('chase_far');
  });
});
