// 進度：解鎖規則與「過關後怎麼更新存檔」。純函式，不 import three、不碰 DOM。
// 「已解鎖」不另外存，一律由各關星數推導（計畫 7.1）。
import { levelRecord, type SaveData, type SavedStars } from '../core/save';
import { levelById, worldLevels } from './levelCatalog';

/** 解鎖下一關需要的星數：前一關過關（至少 1 星）就行。 */
export const STARS_TO_UNLOCK_NEXT = 1;

/** 一次過關的成績（要寫進存檔的部分）。 */
export interface LevelResult {
  readonly stars: SavedStars;
  /** 成績時間（秒）。 */
  readonly timeS: number;
}

/** 這一關存下來的最佳星數；沒過關是 0。 */
export function bestStars(save: SaveData, levelId: string): number {
  return levelRecord(save, levelId)?.stars ?? 0;
}

/**
 * 依「一個世界的關卡順序」判斷某一關有沒有解鎖：
 * 第 1 關預設解鎖；第 n 關在第 n−1 關拿到至少 1 星後解鎖。不在清單裡的 id 一律沒解鎖。
 * @param orderedIds 同一個世界的關卡 id，依關卡順序
 */
export function isUnlockedIn(
  orderedIds: readonly string[],
  levelId: string,
  save: SaveData,
): boolean {
  const index = orderedIds.indexOf(levelId);
  if (index < 0) {
    return false;
  }
  const previousId = orderedIds[index - 1];
  return previousId === undefined || bestStars(save, previousId) >= STARS_TO_UNLOCK_NEXT;
}

/**
 * 目錄裡的某一關有沒有解鎖。「前一關」是同一個世界裡已經做好的前一關
 * （目錄暫時缺號時，例如只有第 1、3 關，第 3 關的前一關就是第 1 關）。
 * `?unlock=all`（unlockAll）時目錄裡的每一關都算解鎖；這只影響畫面，不會寫進存檔。
 */
export function isUnlocked(levelId: string, save: SaveData, unlockAll = false): boolean {
  const level = levelById(levelId);
  if (level === undefined) {
    return false;
  }
  if (unlockAll) {
    return true;
  }
  return isUnlockedIn(
    worldLevels(level.world).map((sibling) => sibling.id),
    levelId,
    save,
  );
}

/**
 * 把一次過關的成績併進存檔：星數取大、時間取小（兩者各自取最好的，不一定來自同一次）。
 * 回傳新的存檔，不改傳進來的那一份。
 */
export function recordResult(save: SaveData, levelId: string, result: LevelResult): SaveData {
  const previous = levelRecord(save, levelId);
  const stars: SavedStars =
    previous !== undefined && previous.stars > result.stars ? previous.stars : result.stars;
  const bestTimeS =
    previous !== undefined ? Math.min(previous.bestTimeS, result.timeS) : result.timeS;
  return { ...save, levels: { ...save.levels, [levelId]: { stars, bestTimeS } } };
}
