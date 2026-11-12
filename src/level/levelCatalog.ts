// 關卡目錄：把 src/levels/*.json 全部載入、驗證，依 id 排序。不 import three、不碰 DOM。
// 任何一份 JSON 不合格，或 id 與檔名不同，模組載入時就丟錯（測試與建置都會擋下來）。
import { parseLevel, PROTOTYPE_WORLD, type LevelDefinition } from './levelSchema';
import { PROTOTYPE_LEVEL } from './prototypeLayout';

/** 建置時由 Vite 收集：檔案路徑 → JSON 內容。只收這一層，不含子資料夾。 */
const LEVEL_FILES: Readonly<Record<string, unknown>> = import.meta.glob('../levels/*.json', {
  import: 'default',
  eager: true,
});

const JSON_EXTENSION = '.json';

/** `../levels/w1_l03.json` → `w1_l03.json`。 */
function fileNameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function loadLevels(): readonly LevelDefinition[] {
  const levels = Object.entries(LEVEL_FILES).map(([path, raw]) => {
    const fileName = fileNameOf(path);
    const level = parseLevel(raw, fileName);
    if (`${level.id}${JSON_EXTENSION}` !== fileName) {
      throw new Error(`${fileName}: id 必須與檔名相同，拿到 ${JSON.stringify(level.id)}`);
    }
    return level;
  });
  // 用字元碼排序，不受執行環境的語系影響。
  return levels.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** 全部的關卡（含原型關），依 id 排序。 */
export const LEVELS: readonly LevelDefinition[] = loadLevels();

/** id → 關卡。用 Map，`toString` 之類的 id 才不會誤中。 */
const LEVELS_BY_ID: ReadonlyMap<string, LevelDefinition> = new Map(
  LEVELS.map((level) => [level.id, level]),
);

/** 全部的關卡 id（依字母順序）。 */
export const LEVEL_IDS: readonly string[] = LEVELS.map((level) => level.id);

/** 找 id 對應的關卡；沒有就回傳 undefined。 */
export function levelById(id: string): LevelDefinition | undefined {
  return LEVELS_BY_ID.get(id);
}

/** 某個世界的關卡，依 id 排序（= 關卡順序）。 */
export function worldLevels(world: number): readonly LevelDefinition[] {
  return LEVELS.filter((level) => level.world === world);
}

/** 同一個世界的下一關的 id；最後一關、原型關或不認得的 id 回傳 undefined。 */
export function nextLevelId(id: string): string | undefined {
  const level = levelById(id);
  if (level === undefined || level.world === PROTOTYPE_WORLD) {
    return undefined;
  }
  const siblings = worldLevels(level.world);
  return siblings[siblings.indexOf(level) + 1]?.id;
}

/** 網址要求的關卡決議結果。 */
export type LevelRequest =
  | { readonly kind: 'level'; readonly level: LevelDefinition }
  /** 網址給了目錄裡沒有的 id；不悄悄換成別關，由呼叫端顯示錯誤與可用清單。 */
  | { readonly kind: 'unknown'; readonly id: string };

/**
 * 決定要進哪一關。
 * @param requestedId `parseLevelParam` 的結果；undefined = 網址沒有指定，進原型關
 */
export function resolveLevelRequest(requestedId: string | undefined): LevelRequest {
  if (requestedId === undefined) {
    return { kind: 'level', level: PROTOTYPE_LEVEL };
  }
  const level = levelById(requestedId);
  return level === undefined ? { kind: 'unknown', id: requestedId } : { kind: 'level', level };
}
