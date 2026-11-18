// 存檔：讀寫、壞資料（不是 JSON、形狀不對、版本不符）、storage 丟例外、語言設定、關卡重做後清掉舊紀錄。
import { describe, expect, test } from 'vitest';
import {
  EMPTY_SAVE,
  LEVELS_REVISION,
  SAVE_STORAGE_KEY,
  SAVE_VERSION,
  levelRecord,
  loadSave,
  parseSave,
  storeSave,
  updateSave,
  withLocale,
  type SaveData,
  type SaveStorage,
} from '../src/core/save';

/** 記憶體裡的假 storage；items 可以直接讀來確認寫了什麼。 */
function memoryStorage(initial: Record<string, string> = {}): SaveStorage & {
  readonly items: Map<string, string>;
} {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

/** 讀寫都丟例外的 storage（無痕模式、停用儲存、額度滿）。 */
const THROWING_STORAGE: SaveStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

const SAMPLE: SaveData = {
  version: SAVE_VERSION,
  levelsRevision: LEVELS_REVISION,
  levels: {
    w1_l01: { stars: 3, bestTimeS: 7.5, challenges: ['time', 'head_in'] },
    w1_l03: { stars: 1, bestTimeS: 41.25, challenges: [] },
  },
  settings: { locale: 'en' },
};

describe('存檔的鍵與版本', () => {
  test('鍵是 parkinggame.save.v1、版本是 1', () => {
    expect(SAVE_STORAGE_KEY).toBe('parkinggame.save.v1');
    expect(SAVE_VERSION).toBe(1);
    expect(EMPTY_SAVE).toEqual({ version: 1, levelsRevision: 2, levels: {}, settings: {} });
  });
});

describe('loadSave / storeSave', () => {
  test('沒存過 → 空的存檔', () => {
    expect(loadSave(memoryStorage())).toEqual(EMPTY_SAVE);
  });

  test('寫進去再讀出來是同一份內容，而且寫在約定的鍵', () => {
    const storage = memoryStorage();
    expect(storeSave(storage, SAMPLE)).toBe(true);
    expect([...storage.items.keys()]).toEqual([SAVE_STORAGE_KEY]);
    expect(JSON.parse(storage.items.get(SAVE_STORAGE_KEY) ?? '')).toEqual(SAMPLE);
    expect(loadSave(storage)).toEqual(SAMPLE);
  });

  test('沒有 storage：讀到空的存檔，寫入回報失敗，不丟例外', () => {
    expect(loadSave(undefined)).toEqual(EMPTY_SAVE);
    expect(storeSave(undefined, SAMPLE)).toBe(false);
  });

  test('storage 讀寫丟例外：當作沒存檔、寫入回報失敗，不丟例外', () => {
    expect(loadSave(THROWING_STORAGE)).toEqual(EMPTY_SAVE);
    expect(storeSave(THROWING_STORAGE, SAMPLE)).toBe(false);
    expect(updateSave(THROWING_STORAGE, (save) => withLocale(save, 'en'))).toEqual({
      ...EMPTY_SAVE,
      settings: { locale: 'en' },
    });
  });

  test.each([
    ['不是 JSON', '{"version":1,'],
    ['空字串', ''],
    ['null', 'null'],
    ['數字', '42'],
    ['陣列', '[]'],
    ['字串', '"save"'],
  ])('壞資料（%s）當作沒存檔', (_name, text) => {
    expect(loadSave(memoryStorage({ [SAVE_STORAGE_KEY]: text }))).toEqual(EMPTY_SAVE);
  });

  test('別的鍵裡的資料不會被當成存檔', () => {
    const storage = memoryStorage({ 'parkinggame.save.v0': JSON.stringify(SAMPLE) });
    expect(loadSave(storage)).toEqual(EMPTY_SAVE);
  });
});

describe('parseSave：形狀不對就整份不要', () => {
  test('合格的內容原樣通過', () => {
    expect(parseSave(JSON.parse(JSON.stringify(SAMPLE)))).toEqual(SAMPLE);
    expect(parseSave({ version: 1, levelsRevision: 2, levels: {}, settings: {} })).toEqual(EMPTY_SAVE);
  });

  test.each([
    ['版本不符', { version: 2, levels: {}, settings: {} }],
    ['版本是字串', { version: '1', levels: {}, settings: {} }],
    ['沒有版本', { levels: {}, settings: {} }],
    ['沒有 levels', { version: 1, settings: {} }],
    ['沒有 settings', { version: 1, levelsRevision: 2, levels: {} }],
    ['levels 是陣列', { version: 1, levelsRevision: 2, levels: [], settings: {} }],
    ['settings 是 null', { version: 1, levelsRevision: 2, levels: {}, settings: null }],
    ['紀錄不是物件', { version: 1, levelsRevision: 2, levels: { w1_l01: 3 }, settings: {} }],
    ['星數是 0', { version: 1, levelsRevision: 2, levels: { w1_l01: { stars: 0, bestTimeS: 5 } }, settings: {} }],
    ['星數是 4', { version: 1, levelsRevision: 2, levels: { w1_l01: { stars: 4, bestTimeS: 5 } }, settings: {} }],
    ['星數不是整數', { version: 1, levelsRevision: 2, levels: { w1_l01: { stars: 2.5, bestTimeS: 5 } }, settings: {} }],
    ['星數是字串', { version: 1, levelsRevision: 2, levels: { w1_l01: { stars: '3', bestTimeS: 5 } }, settings: {} }],
    ['沒有時間', { version: 1, levelsRevision: 2, levels: { w1_l01: { stars: 3 } }, settings: {} }],
    ['時間是負的', { version: 1, levelsRevision: 2, levels: { w1_l01: { stars: 3, bestTimeS: -1 } }, settings: {} }],
    ['時間是字串', { version: 1, levelsRevision: 2, levels: { w1_l01: { stars: 3, bestTimeS: '5' } }, settings: {} }],
    ['時間是 null（NaN 存成 JSON 的樣子）', { version: 1, levelsRevision: 2, levels: { w1_l01: { stars: 3, bestTimeS: null } }, settings: {} }],
    ['不支援的語言', { version: 1, levelsRevision: 2, levels: {}, settings: { locale: 'fr' } }],
    ['語言不是字串', { version: 1, levelsRevision: 2, levels: {}, settings: { locale: 1 } }],
  ])('%s → undefined', (_name, raw) => {
    expect(parseSave(raw)).toBeUndefined();
  });

  test('一筆紀錄壞掉，其他好的紀錄也不留（不讀進半對半錯的進度）', () => {
    const raw = {
      version: 1,
      levelsRevision: 2,
      levels: { w1_l01: { stars: 3, bestTimeS: 7.5 }, w1_l03: { stars: 9, bestTimeS: 1 } },
      settings: {},
    };
    expect(parseSave(raw)).toBeUndefined();
    expect(loadSave(memoryStorage({ [SAVE_STORAGE_KEY]: JSON.stringify(raw) }))).toEqual(EMPTY_SAVE);
  });

  test('多出來的欄位被丟掉，不認得的關卡 id 留著（之後的版本可能有）', () => {
    const parsed = parseSave({
      version: 1,
      levelsRevision: 2,
      levels: { w7_l09: { stars: 2, bestTimeS: 30, extra: true } },
      settings: { locale: 'zh-TW', volume: 3 },
      extra: 'x',
    });
    expect(parsed).toEqual({
      version: 1,
      levelsRevision: 2,
      levels: { w7_l09: { stars: 2, bestTimeS: 30, challenges: [] } },
      settings: { locale: 'zh-TW' },
    });
  });

  test('加挑戰之前存的 v1（紀錄沒有 challenges）讀得回來，挑戰是空的，星數與時間不變', () => {
    const old = {
      version: 1,
      levelsRevision: 2,
      levels: { w1_l01: { stars: 3, bestTimeS: 7.5 }, w1_l02: { stars: 1, bestTimeS: 33 } },
      settings: { locale: 'en' },
    };
    expect(loadSave(memoryStorage({ [SAVE_STORAGE_KEY]: JSON.stringify(old) }))).toEqual({
      version: 1,
      levelsRevision: 2,
      levels: {
        w1_l01: { stars: 3, bestTimeS: 7.5, challenges: [] },
        w1_l02: { stars: 1, bestTimeS: 33, challenges: [] },
      },
      settings: { locale: 'en' },
    });
  });

  test('challenges：不認得的 id 留著（之後的版本可能有），重複的只留一個', () => {
    const parsed = parseSave({
      version: 1,
      levelsRevision: 2,
      levels: { w1_l01: { stars: 2, bestTimeS: 9, challenges: ['head_in', 'someday_new', 'head_in'] } },
      settings: {},
    });
    expect(parsed?.levels.w1_l01?.challenges).toEqual(['head_in', 'someday_new']);
  });

  test.each([
    ['challenges 不是陣列', 'time', []],
    ['challenges 是物件', { time: true }, []],
    ['challenges 是 null', null, []],
    ['challenges 裡有不是字串的東西', ['time', 3, null, 'head_in'], ['time', 'head_in']],
  ])('%s → 只丟掉壞掉的打鉤，星數與時間留著（不整份作廢）', (_name, challenges, kept) => {
    expect(
      parseSave({ version: 1, levelsRevision: 2, levels: { w1_l01: { stars: 2, bestTimeS: 9, challenges } }, settings: {} }),
    ).toEqual({
      version: 1,
      levelsRevision: 2,
      levels: { w1_l01: { stars: 2, bestTimeS: 9, challenges: kept } },
      settings: {},
    });
  });
});

describe('updateSave / levelRecord / withLocale', () => {
  test('updateSave 每次都重新讀 storage，再寫回去', () => {
    const storage = memoryStorage();
    storeSave(storage, SAMPLE);
    const next = updateSave(storage, (save) => withLocale(save, 'zh-TW'));
    expect(next).toEqual({ ...SAMPLE, settings: { locale: 'zh-TW' } });
    expect(loadSave(storage)).toEqual(next);
  });

  test('壞存檔上 updateSave：從空的存檔開始，寫回去的是合格的內容', () => {
    const storage = memoryStorage({ [SAVE_STORAGE_KEY]: 'not json' });
    updateSave(storage, (save) => withLocale(save, 'en'));
    expect(loadSave(storage)).toEqual({ version: 1, levelsRevision: 2, levels: {}, settings: { locale: 'en' } });
  });

  test('withLocale 只改語言，不動進度，也不改原本那一份', () => {
    const next = withLocale(SAMPLE, 'zh-TW');
    expect(next.levels).toEqual(SAMPLE.levels);
    expect(next.settings.locale).toBe('zh-TW');
    expect(SAMPLE.settings.locale).toBe('en');
  });

  test('levelRecord：有紀錄回傳紀錄；沒過關、或 id 剛好是物件內建屬性名 → undefined', () => {
    expect(levelRecord(SAMPLE, 'w1_l01')).toEqual({ stars: 3, bestTimeS: 7.5, challenges: ['time', 'head_in'] });
    expect(levelRecord(SAMPLE, 'w1_l02')).toBeUndefined();
    expect(levelRecord(SAMPLE, 'toString')).toBeUndefined();
    expect(levelRecord(SAMPLE, 'constructor')).toBeUndefined();
  });
});

describe('關卡重做：舊場地的紀錄讀檔時清掉一次', () => {
  const WORLD_ONE = Array.from({ length: 10 }, (_, index) => `w1_l${String(index + 1).padStart(2, '0')}`);
  const record = { stars: 3, bestTimeS: 9, challenges: ['time', 'head_in'] };
  /** 重做之前存的檔：沒有 levelsRevision，第 1 世界 10 關都過了，另外有別的世界與不認得的 id。 */
  const oldSave = {
    version: 1,
    levels: {
      ...Object.fromEntries(WORLD_ONE.map((id) => [id, record])),
      w2_l01: record,
      future_level: { stars: 1, bestTimeS: 30 },
    },
    settings: { locale: 'en' },
  };

  test('現在的版次是 2；空的存檔就是這一版', () => {
    expect(LEVELS_REVISION).toBe(2);
    expect(EMPTY_SAVE.levelsRevision).toBe(2);
  });

  test('沒有 levelsRevision 的舊檔：w1_l01–w1_l10 的星數、時間、挑戰全部清掉，其他關與設定留著', () => {
    expect(parseSave(oldSave)).toEqual({
      version: 1,
      levelsRevision: 2,
      levels: { w2_l01: record, future_level: { stars: 1, bestTimeS: 30, challenges: [] } },
      settings: { locale: 'en' },
    });
  });

  test('levelsRevision 是 1 與沒寫一樣；壞掉的值（字串、0、小數、null）也當成最舊的一版，不整份作廢', () => {
    const cleared = parseSave(oldSave);
    for (const levelsRevision of [1, '2', 0, 1.5, null, -3]) {
      expect(parseSave({ ...oldSave, levelsRevision })).toEqual(cleared);
    }
  });

  test('已經是這一版的存檔：第 1 世界的紀錄留著（只清一次）', () => {
    const current = { ...oldSave, levelsRevision: 2 };
    expect(parseSave(current)?.levels).toHaveProperty('w1_l01', record);
    expect(Object.keys(parseSave(current)?.levels ?? {})).toHaveLength(12);
  });

  test('比現在還新的版次（之後的版本存的）：紀錄留著，版次不往回改', () => {
    const newer = parseSave({ ...oldSave, levelsRevision: 7 });
    expect(newer?.levelsRevision).toBe(7);
    expect(newer?.levels).toHaveProperty('w1_l05', record);
  });

  test('舊檔讀進來、過一關、寫回去：寫出去的是新版次，下次讀不會再清', () => {
    const storage = memoryStorage({ [SAVE_STORAGE_KEY]: JSON.stringify(oldSave) });
    expect(levelRecord(loadSave(storage), 'w1_l03')).toBeUndefined();
    updateSave(storage, (save) => ({
      ...save,
      levels: { ...save.levels, w1_l03: { stars: 2, bestTimeS: 40, challenges: ['clean_exit'] } },
    }));
    const written: unknown = JSON.parse(storage.items.get(SAVE_STORAGE_KEY) ?? '');
    expect(written).toMatchObject({ version: 1, levelsRevision: 2 });
    expect(levelRecord(loadSave(storage), 'w1_l03')).toEqual({
      stars: 2,
      bestTimeS: 40,
      challenges: ['clean_exit'],
    });
    expect(levelRecord(loadSave(storage), 'w1_l01')).toBeUndefined();
    expect(levelRecord(loadSave(storage), 'w2_l01')).toEqual(record);
  });

  test('舊檔裡第 1 世界的紀錄壞了：照舊整份不要（不會因為要清掉就放過壞資料）', () => {
    expect(parseSave({ ...oldSave, levels: { w1_l01: { stars: 9, bestTimeS: 1 } } })).toBeUndefined();
  });
});
