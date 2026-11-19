// 關卡選擇畫面不需要 DOM 就能驗證的部分：一個世界的 10 格，以及由存檔算出每張卡的內容。
// 目前第 1 世界只做好一部分的關（其餘顯示「即將推出」）；這裡的斷言不寫死做好了哪幾關。
import { describe, expect, test } from 'vitest';
import { EMPTY_SAVE } from '../src/core/save';
import { LEVELS_PER_WORLD, worldLevels, worldSlots } from '../src/level/levelCatalog';
import { recordResult } from '../src/level/progress';
import { levelCards } from '../src/ui/levelSelect';

describe('關卡選擇的卡片', () => {
  const slots = worldSlots(1);

  test('固定 10 格，編號 1–10，id 是 w1_l01 … w1_l10', () => {
    expect(LEVELS_PER_WORLD).toBe(10);
    expect(slots.map((slot) => slot.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(slots[0]?.id).toBe('w1_l01');
    expect(slots[9]?.id).toBe('w1_l10');
  });

  test('目錄裡第 1 世界的每一關都有一格（不會有做好了卻選不到的關）', () => {
    const slotLevels = slots.flatMap((slot) => (slot.level === undefined ? [] : [slot.level.id]));
    expect(slotLevels).toEqual(worldLevels(1).map((level) => level.id));
  });

  test('空的存檔：第 1 關可以點、其他做好的關鎖著、還沒做的關是「即將推出」', () => {
    const cards = levelCards(slots, EMPTY_SAVE, false);
    expect(cards).toHaveLength(10);
    expect(cards[0]).toEqual({
      number: 1,
      id: 'w1_l01',
      state: 'unlocked',
      nameKey: 'level.w1_l01.name',
      stars: 0,
      bestTimeS: undefined,
      current: false,
    });
    for (const [index, card] of cards.entries()) {
      const made = slots[index]?.level !== undefined;
      expect(card.state, card.id).toBe(index === 0 ? 'unlocked' : made ? 'locked' : 'soon');
    }
  });

  test('第 1 關過關：卡片顯示星數與最佳時間，下一張做好的關解鎖', () => {
    const save = recordResult(EMPTY_SAVE, 'w1_l01', { stars: 2, timeS: 12.5, challenges: [] });
    const made = levelCards(slots, save, false).filter((card) => card.state !== 'soon');
    expect(made[0]).toMatchObject({ id: 'w1_l01', state: 'unlocked', stars: 2, bestTimeS: 12.5 });
    expect(made[1]).toMatchObject({ state: 'unlocked', stars: 0, bestTimeS: undefined });
    expect(made.slice(2).every((card) => card.state === 'locked')).toBe(true);
  });

  test('沒有「目前的關卡」（第一次來）：沒有任何一張標成目前', () => {
    expect(levelCards(slots, EMPTY_SAVE, false).some((card) => card.current)).toBe(false);
    expect(levelCards(slots, EMPTY_SAVE, true, undefined).some((card) => card.current)).toBe(false);
  });

  test('目前的關卡：只有那一張標成目前，解鎖狀態、星數、時間不受影響', () => {
    const save = recordResult(EMPTY_SAVE, 'w1_l01', { stars: 2, timeS: 12.5, challenges: [] });
    const plain = levelCards(slots, save, false);
    const marked = levelCards(slots, save, false, 'w1_l02');
    expect(marked.filter((card) => card.current).map((card) => card.id)).toEqual(['w1_l02']);
    expect(marked.map((card) => ({ ...card, current: false }))).toEqual(plain);
  });

  test('用 ?level= 直接進了還鎖著的關：那張卡仍然鎖著，但照樣標成目前', () => {
    const cards = levelCards(slots, EMPTY_SAVE, false, 'w1_l07');
    const card = cards.find((candidate) => candidate.id === 'w1_l07');
    expect(card).toMatchObject({ state: 'locked', current: true });
    expect(cards.filter((candidate) => candidate.current)).toHaveLength(1);
  });

  test('目前的關卡不在這個世界的格子裡（原型關、不認得的 id）：沒有任何一張標成目前', () => {
    for (const id of ['prototype', 'w2_l01', 'nope', '']) {
      expect(levelCards(slots, EMPTY_SAVE, true, id).some((card) => card.current), id).toBe(false);
    }
  });

  test('unlockAll：做好的關全部可以點，還沒做的關仍然不能點', () => {
    const cards = levelCards(slots, EMPTY_SAVE, true);
    for (const [index, card] of cards.entries()) {
      expect(card.state, card.id).toBe(slots[index]?.level === undefined ? 'soon' : 'unlocked');
    }
  });
});
