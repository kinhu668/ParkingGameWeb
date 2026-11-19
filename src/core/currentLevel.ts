// 這個分頁「正在玩／剛離開」的是哪一關：關卡選擇畫面用它標出那張卡。
// 記在 sessionStorage：同一個分頁換網址重新載入後還在，關掉分頁就沒了；不進存檔。

/** sessionStorage 裡的鍵。 */
export const CURRENT_LEVEL_STORAGE_KEY = 'parkinggame.currentLevel';

/** 只用到讀與寫；測試可以注入同樣形狀的物件。 */
export type CurrentLevelStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** 進關時記下關卡 id；沒有 storage 或寫入失敗就算了（關卡選擇不標示而已）。 */
export function storeCurrentLevel(storage: CurrentLevelStorage | undefined, levelId: string): void {
  try {
    storage?.setItem(CURRENT_LEVEL_STORAGE_KEY, levelId);
  } catch {
    // 存不了不影響遊戲。
  }
}

/** 這個分頁最近進過的關卡 id；沒進過、沒有 storage 或讀取失敗 → undefined。 */
export function loadCurrentLevel(storage: CurrentLevelStorage | undefined): string | undefined {
  try {
    return storage?.getItem(CURRENT_LEVEL_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
