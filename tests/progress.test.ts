// 進度：解鎖規則（由星數推導）、`?unlock=all`、過關後星數取大／時間取小／挑戰取聯集。
import { describe, expect, test } from 'vitest';
import { EMPTY_SAVE, SAVE_STORAGE_KEY, loadSave, parseSave, type SaveData } from '../src/core/save';
import { worldLevels } from '../src/level/levelCatalog';
import {
  STARS_TO_UNLOCK_NEXT,
  bestChallenges,
  bestStars,
  isUnlocked,
  isUnlockedIn,
  recordResult,
} from '../src/level/progress';

const ORDER = ['a', 'b', 'c', 'd'];

function saveWith(levels: SaveData['levels']): SaveData {
  return { ...EMPTY_SAVE, levels };
}

describe('isUnlockedIn：一個世界裡的解鎖規則', () => {
  test('空的存檔：只有第 1 關解鎖', () => {
    expect(ORDER.map((id) => isUnlockedIn(ORDER, id, EMPTY_SAVE))).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });

  test('第 n−1 關拿到至少 1 星，第 n 關才解鎖；不會連帶解鎖更後面的關', () => {
    expect(STARS_TO_UNLOCK_NEXT).toBe(1);
    const save = saveWith({ a: { stars: 1, bestTimeS: 50, challenges: [] } });
    expect(ORDER.map((id) => isUnlockedIn(ORDER, id, save))).toEqual([true, true, false, false]);
    const further = saveWith({ a: { stars: 1, bestTimeS: 50, challenges: [] }, b: { stars: 3, bestTimeS: 9, challenges: [] } });
    expect(ORDER.map((id) => isUnlockedIn(ORDER, id, further))).toEqual([true, true, true, false]);
  });

  test('只看前一關：後面的關有星、前一關沒有，還是鎖著', () => {
    const save = saveWith({ c: { stars: 3, bestTimeS: 9, challenges: [] } });
    expect(isUnlockedIn(ORDER, 'c', save)).toBe(false);
    expect(isUnlockedIn(ORDER, 'd', save)).toBe(true);
  });

  test('不在清單裡的 id 一律沒解鎖', () => {
    expect(isUnlockedIn(ORDER, 'zzz', EMPTY_SAVE)).toBe(false);
    expect(isUnlockedIn([], 'a', EMPTY_SAVE)).toBe(false);
  });
});

describe('isUnlocked：目錄裡的關卡', () => {
  const world1 = worldLevels(1).map((level) => level.id);
  const [first, second] = world1;

  test('第 1 世界至少有兩關（才測得到解鎖）', () => {
    expect(world1.length).toBeGreaterThanOrEqual(2);
    expect(first).toBe('w1_l01');
  });

  test('空的存檔：第 1 關解鎖，其餘都鎖著', () => {
    expect(world1.map((id) => isUnlocked(id, EMPTY_SAVE))).toEqual(
      world1.map((_, index) => index === 0),
    );
  });

  test('第 1 關過關後，目錄裡的下一關解鎖', () => {
    const save = recordResult(EMPTY_SAVE, first ?? '', { stars: 1, timeS: 55, challenges: [] });
    expect(isUnlocked(second ?? '', save)).toBe(true);
  });

  test('unlockAll：目錄裡每一關都算解鎖；不認得的 id 仍然不算', () => {
    expect(world1.every((id) => isUnlocked(id, EMPTY_SAVE, true))).toBe(true);
    expect(isUnlocked('w9_l99', EMPTY_SAVE, true)).toBe(false);
    expect(isUnlocked('w9_l99', EMPTY_SAVE)).toBe(false);
  });

  test('原型關（不在關卡選擇裡）不受進度影響', () => {
    expect(isUnlocked('prototype', EMPTY_SAVE)).toBe(true);
  });
});

describe('recordResult：星數取大、時間取小、挑戰取聯集', () => {
  test('第一次過關：照成績記下來', () => {
    const save = recordResult(EMPTY_SAVE, 'w1_l01', { stars: 2, timeS: 14.5, challenges: [] });
    expect(save.levels).toEqual({ w1_l01: { stars: 2, bestTimeS: 14.5, challenges: [] } });
    expect(bestStars(save, 'w1_l01')).toBe(2);
    expect(bestStars(save, 'w1_l03')).toBe(0);
  });

  test('比較差的成績不會蓋掉比較好的', () => {
    const best = recordResult(EMPTY_SAVE, 'w1_l01', { stars: 3, timeS: 8, challenges: [] });
    expect(recordResult(best, 'w1_l01', { stars: 1, timeS: 40, challenges: [] }).levels).toEqual(best.levels);
  });

  test('星數與時間各自取最好的：慢但 3 星 + 快但 1 星 → 3 星與快的時間', () => {
    const slowClean = recordResult(EMPTY_SAVE, 'w1_l01', { stars: 3, timeS: 14, challenges: [] });
    const fastMessy = recordResult(slowClean, 'w1_l01', { stars: 1, timeS: 9, challenges: [] });
    expect(fastMessy.levels).toEqual({ w1_l01: { stars: 3, bestTimeS: 9, challenges: [] } });
    // 順序反過來結果相同。
    const reversed = recordResult(
      recordResult(EMPTY_SAVE, 'w1_l01', { stars: 1, timeS: 9, challenges: [] }),
      'w1_l01',
      { stars: 3, timeS: 14, challenges: [] },
    );
    expect(reversed.levels).toEqual(fastMessy.levels);
  });

  test('不改傳進來的存檔，也不動其他關與設定', () => {
    const before: SaveData = {
      version: 1,
      levels: { w1_l03: { stars: 2, bestTimeS: 20, challenges: [] } },
      settings: { locale: 'en' },
    };
    const after = recordResult(before, 'w1_l01', { stars: 1, timeS: 30, challenges: [] });
    expect(before.levels).toEqual({ w1_l03: { stars: 2, bestTimeS: 20, challenges: [] } });
    expect(after).toEqual({
      version: 1,
      levels: { w1_l03: { stars: 2, bestTimeS: 20, challenges: [] }, w1_l01: { stars: 1, bestTimeS: 30, challenges: [] } },
      settings: { locale: 'en' },
    });
  });

  test('寫出去的存檔讀得回來（JSON 來回一趟）', () => {
    const save = recordResult(EMPTY_SAVE, 'w1_l01', { stars: 3, timeS: 326 / 60, challenges: [] });
    const items = new Map([[SAVE_STORAGE_KEY, JSON.stringify(save)]]);
    expect(loadSave({ getItem: (key) => items.get(key) ?? null, setItem: () => undefined })).toEqual(
      save,
    );
  });
});

describe('recordResult：挑戰是歷次過關的聯集', () => {
  test('第一次過關：記下這一次拿到的', () => {
    const save = recordResult(EMPTY_SAVE, 'w1_l01', {
      stars: 3,
      timeS: 8,
      challenges: ['time', 'no_collisions', 'head_in'],
    });
    expect(bestChallenges(save, 'w1_l01')).toEqual(['time', 'no_collisions', 'head_in']);
    expect(bestChallenges(save, 'w1_l02')).toEqual([]);
    expect(bestChallenges(EMPTY_SAVE, 'w1_l01')).toEqual([]);
  });

  test('車頭入庫一次、倒車入庫一次 → 兩個都有；先前拿過的不會因為這一次沒拿到而消失', () => {
    const headIn = recordResult(EMPTY_SAVE, 'w1_l01', {
      stars: 3,
      timeS: 8,
      challenges: ['time', 'no_collisions', 'head_in'],
    });
    const backIn = recordResult(headIn, 'w1_l01', {
      stars: 1,
      timeS: 40,
      challenges: ['back_in', 'no_collisions'],
    });
    expect(backIn.levels).toEqual({
      w1_l01: {
        // 星數與時間仍是比較好的那一次。
        stars: 3,
        bestTimeS: 8,
        challenges: ['time', 'no_collisions', 'head_in', 'back_in'],
      },
    });
    // 什麼都沒拿到的一次不會清掉任何東西。
    const nothing = recordResult(backIn, 'w1_l01', { stars: 1, timeS: 50, challenges: [] });
    expect(nothing.levels).toEqual(backIn.levels);
  });

  test('舊存檔（紀錄沒有 challenges）讀進來是空的，過關後併進這一次的；不認得的 id 留著', () => {
    const old = parseSave({
      version: 1,
      levels: { w1_l01: { stars: 2, bestTimeS: 12 }, w1_l02: { stars: 1, bestTimeS: 30, challenges: ['someday_new'] } },
      settings: {},
    });
    expect(old).toBeDefined();
    const save = old ?? EMPTY_SAVE;
    expect(bestChallenges(save, 'w1_l01')).toEqual([]);
    expect(recordResult(save, 'w1_l01', { stars: 1, timeS: 20, challenges: ['centered'] }).levels.w1_l01).toEqual({
      stars: 2,
      bestTimeS: 12,
      challenges: ['centered'],
    });
    expect(
      bestChallenges(recordResult(save, 'w1_l02', { stars: 1, timeS: 31, challenges: ['time'] }), 'w1_l02'),
    ).toEqual(['someday_new', 'time']);
  });

  test('不改傳進來的存檔', () => {
    const before = recordResult(EMPTY_SAVE, 'w1_l01', { stars: 1, timeS: 9, challenges: ['time'] });
    const snapshot = JSON.stringify(before);
    recordResult(before, 'w1_l01', { stars: 1, timeS: 9, challenges: ['centered'] });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});
