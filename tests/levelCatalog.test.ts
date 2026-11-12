// 關卡目錄：src/levels/*.json 全部載得進來、id = 檔名、name_key 兩種語言都有；
// 以及這一輪釘住的兩個方向：w1_l03 的起點 heading 是 180（面向目標）、原型關是 0。
import { describe, expect, test } from 'vitest';
import { forward } from '../src/core/heading';
import { degToRad } from '../src/core/units';
import {
  LEVELS,
  LEVEL_IDS,
  levelById,
  nextLevelId,
  resolveLevelRequest,
  worldLevels,
} from '../src/level/levelCatalog';
import { parseLevel, type LevelDefinition } from '../src/level/levelSchema';
import {
  PROTOTYPE_LAYOUT,
  PROTOTYPE_LAYOUT_FT,
  PROTOTYPE_LEVEL,
} from '../src/level/prototypeLayout';
import en from '../src/locale/en.json';
import zhTW from '../src/locale/zh-TW.json';

/** 第 1 世界的 10 關，依關卡順序。 */
const WORLD_1_IDS = [
  'w1_l01',
  'w1_l02',
  'w1_l03',
  'w1_l04',
  'w1_l05',
  'w1_l06',
  'w1_l07',
  'w1_l08',
  'w1_l09',
  'w1_l10',
];

/** 測試自己再讀一次原始 JSON（不經過目錄），用來對照。 */
const RAW_FILES: Record<string, unknown> = import.meta.glob('../src/levels/*.json', {
  import: 'default',
  eager: true,
});

const MESSAGES: Record<string, Record<string, string>> = { 'zh-TW': zhTW, en };

function mustFind(id: string): LevelDefinition {
  const level = levelById(id);
  if (level === undefined) {
    throw new Error(`目錄裡沒有 ${id}`);
  }
  return level;
}

/** 起點車頭方向與「起點 → 車位中心」向量的內積（ft）；> 0 = 車頭朝著車位那一側。 */
function facingTargetFt(level: LevelDefinition): number {
  const ahead = forward(degToRad(level.startFt.headingDeg));
  return (
    ahead.x * (level.spotFt.centerXFt - level.startFt.xFt) +
    ahead.z * (level.spotFt.centerZFt - level.startFt.zFt)
  );
}

describe('關卡目錄', () => {
  test('原型關與第 1 世界的 10 關都載得進來，依 id 排序', () => {
    expect(LEVEL_IDS).toEqual(['prototype', ...WORLD_1_IDS]);
    expect(LEVELS.map((level) => level.id)).toEqual(LEVEL_IDS);
  });

  test('src/levels/ 的每個 JSON 都在目錄裡，id 與檔名相同、沒有重複', () => {
    const fileIds = Object.keys(RAW_FILES)
      .map((path) => path.slice(path.lastIndexOf('/') + 1).replace(/\.json$/, ''))
      .sort();
    expect(fileIds).toHaveLength(11);
    expect([...LEVEL_IDS].sort()).toEqual(fileIds);
    expect(new Set(LEVEL_IDS).size).toBe(LEVEL_IDS.length);
  });

  test('目錄裡的內容就是那份 JSON 解析的結果', () => {
    for (const [path, raw] of Object.entries(RAW_FILES)) {
      const level = parseLevel(raw, path);
      expect(levelById(level.id), path).toEqual(level);
    }
  });

  test.each(Object.keys(MESSAGES))('每關的 name_key 在 %s 都有翻譯', (locale) => {
    for (const level of LEVELS) {
      expect(level.nameKey, level.id).toBe(`level.${level.id}.name`);
      expect(MESSAGES[locale]?.[level.nameKey]?.trim() ?? '', `${level.id} @ ${locale}`).not.toBe('');
    }
  });

  test('關卡名稱中文版是中文、英文版是英文', () => {
    for (const level of LEVELS) {
      expect(zhTW[level.nameKey as keyof typeof zhTW], level.id).toMatch(/[一-鿿]/);
      expect(en[level.nameKey as keyof typeof en], level.id).toMatch(/^[\x20-\x7e]+$/);
    }
  });

  test('每關：目標時間小於時間上限、車位比車身大', () => {
    for (const level of LEVELS) {
      expect(level.targetTimeS, level.id).toBeLessThan(level.timeLimitS);
      expect(level.spotFt.widthFt, level.id).toBeGreaterThan(6);
      expect(level.spotFt.lengthFt, level.id).toBeGreaterThan(15);
    }
  });

  test('levelById：找得到回傳關卡，找不到回傳 undefined（不會誤中 toString）', () => {
    expect(levelById('w1_l03')?.id).toBe('w1_l03');
    expect(levelById('w1_l99')).toBeUndefined();
    expect(levelById('toString')).toBeUndefined();
    expect(levelById('')).toBeUndefined();
    expect(levelById('W1_L03')).toBeUndefined();
  });

  test('worldLevels：第 1 世界依關卡順序；world 0 只有原型關', () => {
    expect(worldLevels(1).map((level) => level.id)).toEqual(WORLD_1_IDS);
    expect(worldLevels(0).map((level) => level.id)).toEqual(['prototype']);
    expect(worldLevels(2)).toEqual([]);
  });

  test('nextLevelId：同一個世界的下一關；最後一關、原型關、不認得的 id 沒有下一關', () => {
    expect(nextLevelId('w1_l01')).toBe('w1_l02');
    expect(nextLevelId('w1_l02')).toBe('w1_l03');
    expect(nextLevelId('w1_l09')).toBe('w1_l10');
    expect(nextLevelId('w1_l10')).toBeUndefined();
    expect(nextLevelId('prototype')).toBeUndefined();
    expect(nextLevelId('nope')).toBeUndefined();
  });
});

describe('resolveLevelRequest：網址要求的關卡', () => {
  test('沒有指定（undefined）→ 這一輪仍進原型關', () => {
    expect(resolveLevelRequest(undefined)).toEqual({ kind: 'level', level: PROTOTYPE_LEVEL });
  });

  test.each(['prototype', ...WORLD_1_IDS])('%s → 那一關', (id) => {
    expect(resolveLevelRequest(id)).toEqual({ kind: 'level', level: mustFind(id) });
  });

  test.each(['w1_l11', 'w2_l01', 'nope', 'W1_L03', 'toString', 'w1_l03.json'])(
    '不認得的 id %j → unknown（明確錯誤，不悄悄退回原型關）',
    (id) => {
      expect(resolveLevelRequest(id)).toEqual({ kind: 'unknown', id });
    },
  );
});

describe('原型關（prototype.json）', () => {
  const level = mustFind('prototype');

  test('world 0、open_lot、dusk、沒有邊界、沒有障礙物', () => {
    expect(level.world).toBe(0);
    expect(level.environment).toBe('open_lot');
    expect(level.weather).toBe('dusk');
    expect('boundsFt' in level).toBe(false);
    expect(level.obstaclesFt).toEqual([]);
    expect(level.timeLimitS).toBe(600);
  });

  test('起點 (0, 0) heading 0（不是 180），車位 (0, −60) heading 0、9 × 18 ft', () => {
    expect(level.startFt).toEqual({ xFt: 0, zFt: 0, headingDeg: 0 });
    expect(level.spotFt).toEqual({
      centerXFt: 0,
      centerZFt: -60,
      widthFt: 9,
      lengthFt: 18,
      headingDeg: 0,
      angleToleranceDeg: 8,
    });
  });

  test('heading 0 朝 −Z，車位在正前方 60 ft', () => {
    expect(forward(degToRad(level.startFt.headingDeg))).toEqual({ x: 0, z: -1 });
    expect(facingTargetFt(level)).toBe(60);
  });

  test('PROTOTYPE_LAYOUT 與 PROTOTYPE_LAYOUT_FT 就是這份 JSON 推導出來的', () => {
    expect(PROTOTYPE_LEVEL).toEqual(level);
    expect(PROTOTYPE_LAYOUT).toEqual(level.layout);
    expect(PROTOTYPE_LAYOUT_FT).toEqual({ spot: level.spotFt, start: level.startFt });
    expect(PROTOTYPE_LAYOUT.startState).toEqual({ x: 0, z: 0, headingRad: 0, speedMps: 0, steerRad: 0 });
  });
});

describe('w1_l03（規格範例幾何，修正起點方向）', () => {
  const level = mustFind('w1_l03');

  test('起點 (0, −33)、heading 是 180（規格範例寫 0，那是背向目標）', () => {
    expect(level.startFt).toEqual({ xFt: 0, zFt: -33, headingDeg: 180 });
    expect(level.layout.startState.headingRad).toBe(Math.PI);
  });

  test('heading 180 朝 +Z；目標在 +Z 一側，車頭面向目標', () => {
    const ahead = forward(level.layout.startState.headingRad);
    expect(ahead.z).toBe(1);
    expect(ahead.x).toBeCloseTo(0, 12);
    expect(level.spotFt.centerZFt).toBeGreaterThan(level.startFt.zFt);
    // 往車頭方向量，車位中心在前方 46 ft（13 − (−33)）。
    expect(facingTargetFt(level)).toBeCloseTo(46, 9);
  });

  test('如果照規格範例寫 heading 0，車頭會背向目標', () => {
    const wrong: LevelDefinition = { ...level, startFt: { ...level.startFt, headingDeg: 0 } };
    expect(facingTargetFt(wrong)).toBeCloseTo(-46, 9);
  });

  test('目標車位 (20, 13) heading 90、9.5 × 18.5 ft；warehouse_club、clear', () => {
    expect(level.spotFt).toEqual({
      centerXFt: 20,
      centerZFt: 13,
      widthFt: 9.5,
      lengthFt: 18.5,
      headingDeg: 90,
      angleToleranceDeg: 8,
    });
    expect(level.environment).toBe('warehouse_club');
    expect(level.weather).toBe('clear');
    expect(level.boundsFt).toEqual({ minXFt: -22, minZFt: -48, maxXFt: 34, maxZFt: 44 });
  });

  test('兩側各一台停放車；交通錐在通道西側，不在車位入口（西緣 x = 10.75）前面', () => {
    const cars = level.obstaclesFt.filter((obstacle) => obstacle.type === 'parked_car');
    expect(cars.map((car) => [car.centerXFt, car.centerZFt, car.headingDeg])).toEqual([
      [20, 4, 90],
      [20, 22, 270],
    ]);
    const cones = level.obstaclesFt.filter((obstacle) => obstacle.type === 'cone');
    expect(cones).toHaveLength(1);
    const entranceXFt = level.spotFt.centerXFt - level.spotFt.lengthFt / 2;
    expect(entranceXFt).toBe(10.75);
    for (const cone of cones) {
      // 規格範例的 [10, 0, 13] 正好在入口中線外 1 ft；移到起點那條線（x = 0）的另一側。
      expect(cone.centerXFt).toBeLessThan(level.startFt.xFt);
      expect(entranceXFt - cone.centerXFt).toBeGreaterThan(15);
    }
  });
});

describe('w1_l01（第一個車位）', () => {
  const level = mustFind('w1_l01');

  test('幾何與原型關相同（正前方 60 ft、heading 0），車位放寬成 11 × 20 ft', () => {
    expect(level.startFt).toEqual(PROTOTYPE_LEVEL.startFt);
    expect(level.spotFt).toEqual({ ...PROTOTYPE_LEVEL.spotFt, widthFt: 11, lengthFt: 20 });
    expect(facingTargetFt(level)).toBe(60);
  });

  test('沒有障礙物、有邊界；起點與整個車位都在邊界內', () => {
    expect(level.obstaclesFt).toEqual([]);
    const bounds = level.boundsFt;
    expect(bounds).toBeDefined();
    if (bounds === undefined) {
      return;
    }
    expect(level.startFt.zFt + 7.5).toBeLessThan(bounds.maxZFt);
    expect(level.spotFt.centerZFt - level.spotFt.lengthFt / 2).toBeGreaterThan(bounds.minZFt);
    expect(level.spotFt.centerXFt - level.spotFt.widthFt / 2).toBeGreaterThan(bounds.minXFt);
    expect(level.spotFt.centerXFt + level.spotFt.widthFt / 2).toBeLessThan(bounds.maxXFt);
  });
});

describe('第 1 世界的 10 關（計畫 §3.1）', () => {
  /** id、環境、天氣、車位 heading 與起點 heading 的關係（正停 = 車頭開進去、倒車 = 車尾進去、平行 = 路邊）。 */
  const PLAN: readonly (readonly [string, string, string, readonly string[]])[] = [
    ['w1_l01', 'open_lot', 'clear', []],
    ['w1_l02', 'open_lot', 'dusk', ['cone']],
    ['w1_l03', 'warehouse_club', 'clear', ['parked_car', 'cone', 'shopping_cart']],
    ['w1_l04', 'warehouse_club', 'wet', ['cart_corral', 'parked_car', 'shopping_cart', 'pallet_stack']],
    ['w1_l05', 'post_office', 'clear', ['mailbox', 'trash_bin']],
    ['w1_l06', 'post_office', 'dusk', ['parked_car', 'mailbox', 'bollard']],
    ['w1_l07', 'warehouse_club', 'storm', ['parked_car', 'shopping_cart', 'cone']],
    ['w1_l08', 'city_street', 'clear', ['parked_car']],
    ['w1_l09', 'city_street', 'night', ['parked_car', 'cone']],
    ['w1_l10', 'narrow_alley', 'rain', ['wall', 'dumpster', 'pallet', 'trash_bin', 'pallet_stack']],
  ];

  test.each(PLAN)('%s：%s、%s，障礙物類型齊全', (id, environment, weather, obstacleTypes) => {
    const level = mustFind(id);
    expect(level.world).toBe(1);
    expect(level.environment).toBe(environment);
    expect(level.weather).toBe(weather);
    const types = new Set<string>(level.obstaclesFt.map((obstacle) => obstacle.type));
    for (const type of obstacleTypes) {
      expect(types.has(type), `${id} 應該有 ${type}`).toBe(true);
    }
    expect(level.boundsFt, `${id} 必須有邊界`).toBeDefined();
  });

  test('五種環境、六種天氣都用到', () => {
    const levels = worldLevels(1);
    expect(new Set(levels.map((level) => level.environment)).size).toBe(5);
    expect(new Set(levels.map((level) => level.weather)).size).toBe(6);
  });

  test('難度遞增：碰撞上限只減不增；窄的關卡角度容許值比較小', () => {
    const levels = worldLevels(1);
    levels.slice(1).forEach((level, index) => {
      expect(level.maxCollisions, level.id).toBeLessThanOrEqual(levels[index]?.maxCollisions ?? 0);
    });
    expect(mustFind('w1_l09').spotFt.angleToleranceDeg).toBe(7);
    expect(mustFind('w1_l10').spotFt.angleToleranceDeg).toBe(6);
  });

  test('倒車的關卡：起點在車位「車頭那一側」或側邊，車位 heading 不是朝著遠離起點的方向', () => {
    // 倒車入庫停好時車頭朝外（朝通道）：車位的車頭方向指回通道，也就是大致指向起點那一側。
    for (const id of ['w1_l05', 'w1_l06', 'w1_l07', 'w1_l10']) {
      const level = mustFind(id);
      const out = forward(degToRad(level.spotFt.headingDeg ?? 0));
      const toStartX = level.startFt.xFt - level.spotFt.centerXFt;
      const toStartZ = level.startFt.zFt - level.spotFt.centerZFt;
      expect(out.x * toStartX + out.z * toStartZ, id).toBeGreaterThan(0);
    }
  });

  test('平行停車：車位長邊沿著路（比寬邊長得多），前後各有一台同向的停放車', () => {
    for (const id of ['w1_l08', 'w1_l09']) {
      const level = mustFind(id);
      expect(level.spotFt.lengthFt, id).toBeGreaterThan(level.spotFt.widthFt * 2.5);
      const neighbours = level.obstaclesFt.filter(
        (obstacle) =>
          obstacle.type === 'parked_car' &&
          obstacle.headingDeg === level.spotFt.headingDeg &&
          Math.abs(obstacle.centerXFt - level.spotFt.centerXFt) < 25,
      );
      expect(neighbours, id).toHaveLength(2);
    }
    // 第 9 關的空位比第 8 關短。
    expect(mustFind('w1_l09').spotFt.lengthFt).toBeLessThan(mustFind('w1_l08').spotFt.lengthFt);
  });
});
