// 關卡 JSON 的 schema：合法範例、預設值、單位換算、每個欄位缺少／型別錯／數值不合理時的錯誤訊息。
import { describe, expect, test } from 'vitest';
import { PARKING_RULES } from '../src/core/gameConfig';
import { degToRad, ftToM } from '../src/core/units';
import {
  DEFAULT_LEVEL_WEATHER,
  LEVEL_ENVIRONMENTS,
  LEVEL_WEATHERS,
  LevelFormatError,
  parseLevel,
} from '../src/level/levelSchema';
import {
  OBSTACLE_DEFAULT_SIZE_FT,
  OBSTACLE_TYPES,
  defaultObstacleSizeFt,
  isObstacleType,
} from '../src/level/obstacleTypes';
import { VEHICLE_CONFIG_US } from '../src/vehicle/vehicleConfig';

const SOURCE = 'sample.json';

/** 一份每個欄位都有寫的合法關卡；每次回傳新物件，測試可以放心改。 */
function sample(): Record<string, unknown> {
  return {
    id: 'sample',
    name_key: 'level.sample.name',
    world: 1,
    environment: 'warehouse_club',
    weather: 'rain',
    vehicle: 'sedan',
    time_limit: 75,
    target_time: 22,
    max_collisions: 4,
    angle_tolerance: 6,
    bounds: { min: [-22, -48], max: [34, 44] },
    start: { pos: [1, 0, -33], heading: 180 },
    target: { pos: [20, 0, 13], heading: 90, size: [9.5, 18.5] },
    obstacles: [
      { type: 'parked_car', pos: [20, 0, 4], heading: 90 },
      { type: 'cone', pos: [-9, 0, 13] },
      { type: 'wall', pos: [0, 0, 44], heading: 90, size: [1, 56] },
    ],
  };
}

/** 把 sample 的某些欄位換掉（值是 undefined = 拿掉那個欄位）。 */
function sampleWith(changes: Record<string, unknown>): Record<string, unknown> {
  const level = { ...sample(), ...changes };
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) {
      delete level[key];
    }
  }
  return level;
}

/** 解析一定要失敗；回傳錯誤訊息。 */
function errorOf(raw: unknown): string {
  try {
    parseLevel(raw, SOURCE);
  } catch (error) {
    expect(error).toBeInstanceOf(LevelFormatError);
    return error instanceof Error ? error.message : '';
  }
  throw new Error('應該要丟 LevelFormatError，卻解析成功');
}

describe('parseLevel：合法關卡', () => {
  test('欄位照單位寫進 LevelDefinition', () => {
    const level = parseLevel(sample(), SOURCE);
    expect(level.id).toBe('sample');
    expect(level.nameKey).toBe('level.sample.name');
    expect(level.world).toBe(1);
    expect(level.environment).toBe('warehouse_club');
    expect(level.weather).toBe('rain');
    expect(level.vehicle).toBe('sedan');
    expect(level.timeLimitS).toBe(75);
    expect(level.targetTimeS).toBe(22);
    expect(level.maxCollisions).toBe(4);
    expect(level.boundsFt).toEqual({ minXFt: -22, minZFt: -48, maxXFt: 34, maxZFt: 44 });
    expect(level.startFt).toEqual({ xFt: 1, zFt: -33, headingDeg: 180 });
    expect(level.spotFt).toEqual({
      centerXFt: 20,
      centerZFt: 13,
      widthFt: 9.5,
      lengthFt: 18.5,
      headingDeg: 90,
      angleToleranceDeg: 6,
    });
  });

  test('size 是 [橫向寬, 沿 heading 的長]', () => {
    const { spotFt, obstaclesFt } = parseLevel(sample(), SOURCE);
    expect(spotFt.widthFt).toBe(9.5);
    expect(spotFt.lengthFt).toBe(18.5);
    expect(obstaclesFt[2]).toMatchObject({ type: 'wall', widthFt: 1, lengthFt: 56 });
  });

  test('layout 換成公尺與弧度；車一開始靜止、方向盤回正', () => {
    const { layout } = parseLevel(sample(), SOURCE);
    expect(layout.startState).toEqual({
      x: ftToM(1),
      z: ftToM(-33),
      headingRad: degToRad(180),
      speedMps: 0,
      steerRad: 0,
    });
    expect(layout.spot).toEqual({
      x: ftToM(20),
      z: ftToM(13),
      widthM: ftToM(9.5),
      lengthM: ftToM(18.5),
      headingRad: degToRad(90),
      angleToleranceRad: degToRad(6),
    });
  });

  test('障礙物：heading 不填 = 0，size 不填 = 該類型的預設碰撞盒', () => {
    const { obstaclesFt } = parseLevel(sample(), SOURCE);
    expect(obstaclesFt).toEqual([
      { type: 'parked_car', centerXFt: 20, centerZFt: 4, headingDeg: 90, widthFt: 6, lengthFt: 15 },
      { type: 'cone', centerXFt: -9, centerZFt: 13, headingDeg: 0, widthFt: 1.2, lengthFt: 1.2 },
      { type: 'wall', centerXFt: 0, centerZFt: 44, headingDeg: 90, widthFt: 1, lengthFt: 56 },
    ]);
  });

  test('障礙物的 size 可以覆蓋預設碰撞盒', () => {
    const level = parseLevel(
      sampleWith({ obstacles: [{ type: 'parked_car', pos: [0, 0, 20], size: [6.5, 17] }] }),
      SOURCE,
    );
    expect(level.obstaclesFt[0]).toMatchObject({ widthFt: 6.5, lengthFt: 17 });
  });

  test('weather 不填 = clear', () => {
    expect(DEFAULT_LEVEL_WEATHER).toBe('clear');
    expect(parseLevel(sampleWith({ weather: undefined }), SOURCE).weather).toBe('clear');
  });

  test('angle_tolerance 不填 = 規則的預設值（8°）', () => {
    const level = parseLevel(sampleWith({ angle_tolerance: undefined }), SOURCE);
    expect(PARKING_RULES.defaultAngleToleranceDeg).toBe(8);
    expect(level.spotFt.angleToleranceDeg).toBe(8);
    expect(level.layout.spot.angleToleranceRad).toBe(degToRad(8));
  });

  test('bounds 不填 = 沒有邊界（LevelDefinition 沒有 boundsFt 這個鍵）', () => {
    const level = parseLevel(sampleWith({ bounds: undefined }), SOURCE);
    expect('boundsFt' in level).toBe(false);
  });

  test('obstacles 可以是空陣列；world 0（原型關）與 max_collisions 0 都合法', () => {
    const level = parseLevel(sampleWith({ obstacles: [], world: 0, max_collisions: 0 }), SOURCE);
    expect(level.obstaclesFt).toEqual([]);
    expect(level.world).toBe(0);
    expect(level.maxCollisions).toBe(0);
  });

  test.each(LEVEL_ENVIRONMENTS)('environment %s 認得', (environment) => {
    expect(parseLevel(sampleWith({ environment }), SOURCE).environment).toBe(environment);
  });

  test.each(LEVEL_WEATHERS)('weather %s 認得', (weather) => {
    expect(parseLevel(sampleWith({ weather }), SOURCE).weather).toBe(weather);
  });

  test('環境與天氣的清單就是計畫第 2 節那幾個', () => {
    expect(LEVEL_ENVIRONMENTS).toEqual([
      'open_lot',
      'warehouse_club',
      'post_office',
      'city_street',
      'narrow_alley',
    ]);
    expect(LEVEL_WEATHERS).toEqual(['clear', 'dusk', 'rain', 'wet', 'storm', 'night']);
  });

  test('不會改到傳進來的資料，兩次解析結果相同', () => {
    const raw = sample();
    const before = JSON.stringify(raw);
    expect(parseLevel(raw, SOURCE)).toEqual(parseLevel(raw, SOURCE));
    expect(JSON.stringify(raw)).toBe(before);
  });
});

describe('parseLevel：錯誤訊息指出檔名與欄位', () => {
  test.each([
    'id',
    'name_key',
    'world',
    'environment',
    'vehicle',
    'time_limit',
    'target_time',
    'max_collisions',
    'start',
    'target',
    'obstacles',
  ])('缺少必填欄位 %s', (key) => {
    expect(errorOf(sampleWith({ [key]: undefined }))).toBe(`${SOURCE}: ${key} 是必填欄位`);
  });

  test.each([
    ['start', 'pos'],
    ['start', 'heading'],
    ['target', 'pos'],
    ['target', 'heading'],
    ['target', 'size'],
    ['bounds', 'min'],
    ['bounds', 'max'],
  ])('缺少 %s.%s', (parent, key) => {
    const level = sample();
    const inner = { ...(level[parent] as Record<string, unknown>) };
    delete inner[key];
    expect(errorOf({ ...level, [parent]: inner })).toBe(`${SOURCE}: ${parent}.${key} 是必填欄位`);
  });

  test.each([null, undefined, 3, 'level', [], [sample()]])('整份資料不是物件：%j', (raw) => {
    expect(errorOf(raw)).toMatch(/^sample\.json: 必須是物件/);
  });

  test.each([
    ['id', 7],
    ['id', ''],
    ['id', 'W1_L03'],
    ['id', 'w1-l03'],
    ['id', '../w1_l03'],
    ['name_key', null],
    ['name_key', '   '],
    ['world', '1'],
    ['world', 1.5],
    ['world', -1],
    ['world', 6],
    ['environment', 'underground_garage_night'],
    ['environment', 3],
    ['weather', 'sunny'],
    ['weather', null],
    ['vehicle', 'suv'],
    ['vehicle', 'trailer'],
    ['time_limit', 0],
    ['time_limit', -5],
    ['time_limit', '60'],
    ['target_time', 0],
    ['target_time', null],
    ['max_collisions', -1],
    ['max_collisions', 2.5],
    ['max_collisions', '3'],
    ['angle_tolerance', 0],
    ['angle_tolerance', -8],
    ['angle_tolerance', 181],
    ['angle_tolerance', '8'],
    ['bounds', [[-1, -1], [1, 1]]],
    ['start', [0, 0, 0]],
    ['target', null],
    ['obstacles', {}],
    ['obstacles', null],
  ])('%s = %j 不合格', (key, value) => {
    expect(errorOf(sampleWith({ [key]: value }))).toMatch(new RegExp(`^sample\\.json: ${key} `));
  });

  test('vehicle 本階段只接受 sedan，訊息列出可用的值與拿到的值', () => {
    expect(errorOf(sampleWith({ vehicle: 'suv' }))).toBe(
      `${SOURCE}: vehicle 必須是 sedan 其中之一，拿到 "suv"`,
    );
  });

  test('target_time 必須小於 time_limit（相等也不行）', () => {
    expect(errorOf(sampleWith({ time_limit: 60, target_time: 60 }))).toMatch(
      /^sample\.json: target_time 必須小於 time_limit（60）/,
    );
    expect(errorOf(sampleWith({ time_limit: 60, target_time: 61 }))).toMatch(/target_time/);
    expect(parseLevel(sampleWith({ time_limit: 60, target_time: 59.9 }), SOURCE).targetTimeS).toBe(
      59.9,
    );
  });

  test('數字不能是 NaN 或無限大', () => {
    expect(errorOf(sampleWith({ time_limit: Number.NaN }))).toMatch(/time_limit 必須是有限的數字/);
    expect(errorOf(sampleWith({ time_limit: Infinity }))).toMatch(/time_limit 必須是有限的數字/);
  });

  test.each([-1, 360, 720, '180', null])('heading = %j 不合格（範圍是 [0, 360)）', (heading) => {
    expect(errorOf(sampleWith({ start: { pos: [0, 0, 0], heading } }))).toMatch(
      /^sample\.json: start\.heading /,
    );
    expect(errorOf(sampleWith({ target: { pos: [0, 0, 0], heading, size: [9, 18] } }))).toMatch(
      /^sample\.json: target\.heading /,
    );
  });

  test.each([0, 359.5, 180])('heading = %j 合格', (heading) => {
    const level = parseLevel(sampleWith({ start: { pos: [0, 0, 0], heading } }), SOURCE);
    expect(level.startFt.headingDeg).toBe(heading);
  });

  test('pos 必須是 3 個數字，y 必須是 0', () => {
    expect(errorOf(sampleWith({ start: { pos: [0, 0], heading: 0 } }))).toMatch(
      /^sample\.json: start\.pos 必須是 3 個數字的陣列/,
    );
    expect(errorOf(sampleWith({ start: { pos: [0, 0, 'a'], heading: 0 } }))).toMatch(
      /^sample\.json: start\.pos\[2\] 必須是有限的數字/,
    );
    expect(errorOf(sampleWith({ start: { pos: [0, 2, 0], heading: 0 } }))).toMatch(
      /^sample\.json: start\.pos\[1\] （y）本階段必須是 0/,
    );
  });

  test('size 必須是 2 個大於 0 的數字', () => {
    const target = { pos: [0, 0, 0], heading: 0 };
    expect(errorOf(sampleWith({ target: { ...target, size: [9] } }))).toMatch(
      /^sample\.json: target\.size 必須是 2 個數字的陣列/,
    );
    expect(errorOf(sampleWith({ target: { ...target, size: [0, 18] } }))).toMatch(
      /^sample\.json: target\.size\[0\] 必須大於 0/,
    );
    expect(errorOf(sampleWith({ target: { ...target, size: [9, -18] } }))).toMatch(
      /^sample\.json: target\.size\[1\] 必須大於 0/,
    );
  });

  test('bounds 的 min 必須小於 max（x、z 都要）', () => {
    expect(errorOf(sampleWith({ bounds: { min: [5, 0], max: [5, 10] } }))).toMatch(
      /^sample\.json: bounds min 的 x、z 都必須小於 max/,
    );
    expect(errorOf(sampleWith({ bounds: { min: [0, 10], max: [5, -10] } }))).toMatch(/bounds/);
    expect(errorOf(sampleWith({ bounds: { min: [0, 0, 0], max: [5, 5] } }))).toMatch(
      /^sample\.json: bounds\.min 必須是 2 個數字的陣列/,
    );
  });

  test('障礙物的錯誤指出是第幾個', () => {
    const good = { type: 'cone', pos: [0, 0, 5] };
    expect(errorOf(sampleWith({ obstacles: [good, { type: 'ufo', pos: [0, 0, 0] }] }))).toBe(
      `${SOURCE}: obstacles[1].type 是不認得的障礙物類型，拿到 "ufo"`,
    );
    expect(errorOf(sampleWith({ obstacles: [{ pos: [0, 0, 0] }] }))).toBe(
      `${SOURCE}: obstacles[0].type 是必填欄位`,
    );
    expect(errorOf(sampleWith({ obstacles: [good, good, { type: 'cone' }] }))).toBe(
      `${SOURCE}: obstacles[2].pos 是必填欄位`,
    );
    expect(errorOf(sampleWith({ obstacles: [{ ...good, heading: 400 }] }))).toMatch(
      /^sample\.json: obstacles\[0\]\.heading /,
    );
    expect(errorOf(sampleWith({ obstacles: [{ ...good, size: [1, 0] }] }))).toMatch(
      /^sample\.json: obstacles\[0\]\.size\[1\] 必須大於 0/,
    );
    expect(errorOf(sampleWith({ obstacles: ['cone'] }))).toMatch(
      /^sample\.json: obstacles\[0\] 必須是物件/,
    );
  });

  test('wall 沒有預設大小，size 必填', () => {
    expect(errorOf(sampleWith({ obstacles: [{ type: 'wall', pos: [0, 0, 0] }] }))).toBe(
      `${SOURCE}: obstacles[0].size 是必填欄位（wall 沒有預設大小）`,
    );
  });

  test('不認得的欄位（多半是打錯字）會報錯，不會被悄悄忽略', () => {
    expect(errorOf(sampleWith({ angle_tolerence: 8 }))).toBe(
      `${SOURCE}: 有不認得的欄位：angle_tolerence`,
    );
    expect(errorOf(sampleWith({ start: { pos: [0, 0, 0], heading: 0, speed: 3 } }))).toBe(
      `${SOURCE}: start 有不認得的欄位：speed`,
    );
    expect(
      errorOf(sampleWith({ obstacles: [{ type: 'cone', pos: [0, 0, 0], rotation: 90 }] })),
    ).toBe(`${SOURCE}: obstacles[0] 有不認得的欄位：rotation`);
  });
});

describe('障礙物類型表', () => {
  test('類型就是計畫第 2.2 節那 13 種', () => {
    expect(OBSTACLE_TYPES).toEqual([
      'parked_car',
      'cone',
      'shopping_cart',
      'cart_corral',
      'trash_bin',
      'dumpster',
      'mailbox',
      'pallet',
      'pallet_stack',
      'bollard',
      'barrier',
      'planter',
      'wall',
    ]);
  });

  test('除了 wall 都有預設碰撞盒，寬與長都大於 0', () => {
    for (const type of OBSTACLE_TYPES) {
      const size = defaultObstacleSizeFt(type);
      if (type === 'wall') {
        expect(size).toBeNull();
      } else {
        expect(size?.widthFt, type).toBeGreaterThan(0);
        expect(size?.lengthFt, type).toBeGreaterThan(0);
      }
    }
  });

  test('停放車輛的碰撞盒與玩家的轎車一樣大', () => {
    expect(OBSTACLE_DEFAULT_SIZE_FT.parked_car).toEqual({
      widthFt: VEHICLE_CONFIG_US.widthFt,
      lengthFt: VEHICLE_CONFIG_US.lengthFt,
    });
  });

  test('isObstacleType 只認表裡的類型（不會誤中 toString 之類的字）', () => {
    expect(isObstacleType('cone')).toBe(true);
    expect(isObstacleType('wall')).toBe(true);
    expect(isObstacleType('Cone')).toBe(false);
    expect(isObstacleType('toString')).toBe(false);
    expect(isObstacleType('')).toBe(false);
  });
});
