// 測試用的關卡（不在目錄裡）：直線倒車。車位在起點正後方 35 ft、四個角各有一個小障礙物。
// 第 1 世界重做之前它是 w1_l05；倒檔、「車位在後面」提示與車位標記的回歸測試需要這個幾何。
import { parseLevel, type LevelDefinition } from '../src/level/levelSchema';

export const REVERSE_BAY_LEVEL: LevelDefinition = parseLevel(
  {
    id: 'reverse_bay',
    name_key: 'level.w1_l05.name',
    world: 1,
    environment: 'post_office',
    weather: 'clear',
    vehicle: 'sedan',
    time_limit: 60,
    target_time: 18,
    max_collisions: 3,
    parking: 'bay',
    head_in_heading: 180,
    bounds: { min: [-22, -22], max: [22, 47] },
    start: { pos: [0, 0, 0], heading: 0 },
    target: { pos: [0, 0, 35], heading: 0, size: [10, 19] },
    obstacles: [
      { type: 'mailbox', pos: [-6.6, 0, 28] },
      { type: 'trash_bin', pos: [7, 0, 28] },
      { type: 'trash_bin', pos: [-7, 0, 38] },
      { type: 'mailbox', pos: [6.6, 0, 38] },
    ],
  },
  'reverse_bay.json',
);
