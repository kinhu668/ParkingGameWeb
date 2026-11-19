// 「正在玩哪一關」的記憶（sessionStorage）：存、讀，以及沒有 storage／storage 壞掉時不丟例外。
import { describe, expect, test } from 'vitest';
import {
  CURRENT_LEVEL_STORAGE_KEY,
  loadCurrentLevel,
  storeCurrentLevel,
  type CurrentLevelStorage,
} from '../src/core/currentLevel';

function memoryStorage(): CurrentLevelStorage & { readonly items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

const BROKEN: CurrentLevelStorage = {
  getItem: () => {
    throw new Error('storage disabled');
  },
  setItem: () => {
    throw new Error('storage disabled');
  },
};

describe('目前的關卡', () => {
  test('沒存過 → undefined', () => {
    expect(loadCurrentLevel(memoryStorage())).toBeUndefined();
  });

  test('存了就讀得回來；再存一次蓋掉舊的', () => {
    const storage = memoryStorage();
    storeCurrentLevel(storage, 'w1_l07');
    expect(storage.items.get(CURRENT_LEVEL_STORAGE_KEY)).toBe('w1_l07');
    expect(loadCurrentLevel(storage)).toBe('w1_l07');
    storeCurrentLevel(storage, 'w1_l08');
    expect(loadCurrentLevel(storage)).toBe('w1_l08');
  });

  test('沒有 storage、或讀寫會丟例外（停用儲存）：不丟例外，當作沒存過', () => {
    expect(() => storeCurrentLevel(undefined, 'w1_l01')).not.toThrow();
    expect(loadCurrentLevel(undefined)).toBeUndefined();
    expect(() => storeCurrentLevel(BROKEN, 'w1_l01')).not.toThrow();
    expect(loadCurrentLevel(BROKEN)).toBeUndefined();
  });
});
