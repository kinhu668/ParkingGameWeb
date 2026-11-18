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
import {
  CAR_MODEL_DIMS_FT,
  CAR_MODEL_IDS,
  carModelDimsM,
  carModelMix,
} from '../src/vehicle/carModels';
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
    parking: 'bay',
    head_in_heading: 90,
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
      headInHeadingDeg: 90,
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
      headInHeadingRad: degToRad(90),
      angleToleranceRad: degToRad(6),
    });
  });

  test('障礙物：heading 不填 = 0，size 不填 = 該類型的預設碰撞盒；停放車輛的碰撞盒是它那款車的外框', () => {
    const { obstaclesFt } = parseLevel(sample(), SOURCE);
    const model = obstaclesFt[0]?.model ?? 'sedan';
    expect(CAR_MODEL_IDS).toContain(obstaclesFt[0]?.model);
    expect(obstaclesFt).toEqual([
      {
        type: 'parked_car',
        centerXFt: 20,
        centerZFt: 4,
        headingDeg: 90,
        widthFt: CAR_MODEL_DIMS_FT[model].widthFt,
        lengthFt: CAR_MODEL_DIMS_FT[model].lengthFt,
        model,
      },
      { type: 'cone', centerXFt: -9, centerZFt: 13, headingDeg: 0, widthFt: 1.2, lengthFt: 1.2 },
      { type: 'wall', centerXFt: 0, centerZFt: 44, headingDeg: 90, widthFt: 1, lengthFt: 56 },
    ]);
  });

  test('障礙物的 size 可以覆蓋預設碰撞盒', () => {
    const level = parseLevel(
      sampleWith({ obstacles: [{ type: 'dumpster', pos: [0, 0, 20], size: [6.5, 17] }] }),
      SOURCE,
    );
    expect(level.obstaclesFt[0]).toMatchObject({ widthFt: 6.5, lengthFt: 17 });
    expect(level.obstaclesFt[0]?.model).toBeUndefined();
  });

  test('停放車輛：車款由關卡 id 決定，同一份 JSON 每次都一樣；會撞到的矩形（公尺）就是車款的外框', () => {
    const cars = Array.from({ length: 7 }, (_, index) => ({
      type: 'parked_car',
      pos: [index * 12, 0, 60],
    }));
    const level = parseLevel(sampleWith({ obstacles: cars }), SOURCE);
    const models = level.obstaclesFt.map((obstacle) => obstacle.model);
    expect(models).toEqual(carModelMix(level.id, cars.length));
    expect(parseLevel(sampleWith({ obstacles: cars }), SOURCE).obstaclesFt).toEqual(level.obstaclesFt);
    // 換一個關卡 id 就是另一組。
    const other = parseLevel(sampleWith({ id: 'another_level', obstacles: cars }), SOURCE);
    expect(other.obstaclesFt.map((obstacle) => obstacle.model)).not.toEqual(models);
    level.obstaclesFt.forEach((obstacle, index) => {
      const dims = carModelDimsM(obstacle.model ?? 'sedan');
      expect(level.layout.obstacles?.[index]?.halfWidthM).toBeCloseTo(dims.widthM / 2, 12);
      expect(level.layout.obstacles?.[index]?.halfLengthM).toBeCloseTo(dims.lengthM / 2, 12);
    });
    // 不是停放車輛的障礙物不佔車款的名額：中間插一個交通錐，車的車款不變。
    const mixed = parseLevel(
      sampleWith({ obstacles: [cars[0], { type: 'cone', pos: [0, 0, 30] }, ...cars.slice(1)] }),
      SOURCE,
    );
    expect(
      mixed.obstaclesFt.filter((obstacle) => obstacle.type === 'parked_car').map((car) => car.model),
    ).toEqual(models);
  });

  test('停放車輛不能自己給 size：看到的車多大，碰撞盒就多大', () => {
    expect(
      errorOf(sampleWith({ obstacles: [{ type: 'parked_car', pos: [0, 0, 20], size: [6.5, 17] }] })),
    ).toBe(`${SOURCE}: obstacles[0].size 不能用在 parked_car：碰撞盒就是車款的外框`);
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
    'parking',
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
  test('類型就是計畫第 2.2 節那 13 種，加上關卡重做的 6 種（安全島、柱子、餐車、貨車、衝浪板休旅車、鳳梨立牌）', () => {
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
      'lamp_island',
      'pillar',
      'food_truck',
      'delivery_van',
      'surf_suv',
      'pineapple_standee',
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

describe('parseLevel：停車種類與車頭入庫的方向', () => {
  test('bay：head_in_heading 寫進車位，兩個朝向都合法', () => {
    const level = parseLevel(sample(), SOURCE);
    expect(level.parking).toBe('bay');
    expect(level.spotFt.headInHeadingDeg).toBe(90);
    expect(level.layout.spot.headInHeadingRad).toBe(degToRad(90));
  });

  test('bay：head_in_heading 可以是 target.heading 的反向（倒車才對得上車位方向的關）', () => {
    const level = parseLevel(sampleWith({ head_in_heading: 270 }), SOURCE);
    expect(level.spotFt.headingDeg).toBe(90);
    expect(level.spotFt.headInHeadingDeg).toBe(270);
    expect(level.layout.spot.headInHeadingRad).toBe(degToRad(270));
  });

  test('parallel：沒有 head_in_heading，車位只接受單一朝向', () => {
    const level = parseLevel(sampleWith({ parking: 'parallel', head_in_heading: undefined }), SOURCE);
    expect(level.parking).toBe('parallel');
    expect(level.spotFt).not.toHaveProperty('headInHeadingDeg');
    expect(level.layout.spot.headInHeadingRad).toBeNull();
  });

  test('bay 少了 head_in_heading、parallel 多了 head_in_heading 都不合格', () => {
    expect(errorOf(sampleWith({ head_in_heading: undefined }))).toBe(
      `${SOURCE}: head_in_heading parking 是 bay 時是必填欄位`,
    );
    expect(errorOf(sampleWith({ parking: 'parallel' }))).toBe(
      `${SOURCE}: head_in_heading parking 是 parallel 時不能有這個欄位`,
    );
  });

  test.each([0, 180, 91, 269.5])('head_in_heading = %j 不是車位方向或它的反向 → 不合格', (headIn) => {
    expect(errorOf(sampleWith({ head_in_heading: headIn }))).toMatch(
      /^sample\.json: head_in_heading 必須是 target\.heading（90）或它的反向/,
    );
  });

  test.each([-90, 360, '90', null])('head_in_heading = %j 不合格（範圍是 [0, 360)）', (headIn) => {
    expect(errorOf(sampleWith({ head_in_heading: headIn }))).toMatch(/^sample\.json: head_in_heading /);
  });

  test.each(['angled', 'BAY', 1, null])('parking = %j 不合格', (parking) => {
    expect(errorOf(sampleWith({ parking }))).toMatch(/^sample\.json: parking 必須是 bay、parallel 其中之一/);
  });
});

describe('parseLevel：車排（rows）與停在車位裡的起點（start.parked）', () => {
  /** 一排 4 格、往東排、車頭朝南（heading 90 + angle 90 = 180），第 1 格是空的。 */
  const row = { pos: [-10, 0, -20], heading: 90, count: 4, empty: [1] };

  test('沒有 rows：stallsFt 是空的，沒有 startStallFt，layout 沒有 startStall', () => {
    const level = parseLevel(sample(), SOURCE);
    expect(level.stallsFt).toEqual([]);
    expect(level.startStallFt).toBeUndefined();
    expect(level.layout.startStall).toBeUndefined();
  });

  test('一排垂直車位：每 9 ft 一格、預設 9 × 18，車頭方向 = heading + angle', () => {
    const level = parseLevel(sampleWith({ rows: [row] }), SOURCE);
    expect(level.stallsFt.map((stall) => [stall.centerXFt, stall.centerZFt])).toEqual([
      [-10, -20],
      [-1, -20],
      [8, -20],
      [17, -20],
    ]);
    for (const stall of level.stallsFt) {
      expect(stall.headingDeg).toBe(180);
      expect(stall.widthFt).toBe(9);
      expect(stall.lengthFt).toBe(18);
    }
    expect(level.stallsFt.map((stall) => stall.occupied)).toEqual([true, false, true, true]);
  });

  test('有停車的格子展開成 parked_car，接在 JSON 的障礙物後面；空格不放車', () => {
    const level = parseLevel(sampleWith({ rows: [row] }), SOURCE);
    const listed = parseLevel(sample(), SOURCE).obstaclesFt.length;
    const rowCars = level.obstaclesFt.slice(listed);
    expect(rowCars.map((car) => car.type)).toEqual(['parked_car', 'parked_car', 'parked_car']);
    expect(rowCars.map((car) => [car.centerXFt, car.centerZFt])).toEqual([
      [-10, -20],
      [8, -20],
      [17, -20],
    ]);
    // 碰撞盒是那款車的外框，也進了 layout。
    for (const car of rowCars) {
      const dims = CAR_MODEL_DIMS_FT[car.model ?? 'sedan'];
      expect(car.widthFt).toBe(dims.widthFt);
      expect(car.lengthFt).toBe(dims.lengthFt);
    }
    // 會撞到的矩形 = 障礙物 + 四面邊界。
    expect(level.layout.obstacles).toHaveLength(level.obstaclesFt.length + 4);
  });

  test('垂直車位每 4 格有一台倒車入庫的車（方向相反），每一排錯開；斜角車位一律車頭入庫', () => {
    const straight = parseLevel(
      sampleWith({ obstacles: [], rows: [{ pos: [-10, 0, -20], heading: 90, count: 8 }] }),
      SOURCE,
    );
    expect(straight.obstaclesFt.map((car) => car.headingDeg)).toEqual([180, 180, 180, 0, 180, 180, 180, 0]);
    const angled = parseLevel(
      sampleWith({ obstacles: [], rows: [{ pos: [-10, 0, -30], heading: 90, angle: 45, count: 4 }] }),
      SOURCE,
    );
    expect(angled.obstaclesFt.map((car) => car.headingDeg)).toEqual([135, 135, 135, 135]);
  });

  test('斜角車位：間距 = 寬 ÷ sin(angle)，車頭方向 = heading + angle', () => {
    const level = parseLevel(
      sampleWith({ rows: [{ pos: [0, 0, 30], heading: 0, angle: 45, count: 3, size: [9, 19] }] }),
      SOURCE,
    );
    const pitchFt = 9 / Math.sin(degToRad(45));
    level.stallsFt.forEach((stall, index) => {
      expect(stall.centerXFt).toBeCloseTo(0, 9);
      // 每一格的間距取到 1e-9 ft（軸向的車排才不會帶著 cos 90° 的零頭）。
      expect(stall.centerZFt).toBeCloseTo(30 - pitchFt * index, 7);
      expect(stall.headingDeg).toBe(45);
      expect(stall.lengthFt).toBe(19);
    });
  });

  test('angle 270：車頭朝車排方向的左手邊；heading + angle 超過 360 會繞回來', () => {
    const level = parseLevel(
      sampleWith({ rows: [{ pos: [0, 0, 0], heading: 180, angle: 270, count: 2 }] }),
      SOURCE,
    );
    expect(level.stallsFt.map((stall) => stall.headingDeg)).toEqual([90, 90]);
    expect(level.stallsFt[1]?.centerZFt).toBeCloseTo(9, 9);
  });

  test('多排：stallsFt 依 rows 的順序接起來', () => {
    const level = parseLevel(
      sampleWith({ rows: [row, { pos: [-10, 0, 30], heading: 90, angle: 270, count: 2 }] }),
      SOURCE,
    );
    expect(level.stallsFt).toHaveLength(6);
    expect(level.stallsFt[4]?.headingDeg).toBe(0);
  });

  test('start.parked：起點在空格裡，startStallFt 是那一格，layout.startStall 是它的矩形（公尺）', () => {
    const level = parseLevel(
      sampleWith({ rows: [row], start: { pos: [-1, 0, -19], heading: 0, parked: true } }),
      SOURCE,
    );
    expect(level.startStallFt).toEqual({
      centerXFt: -1,
      centerZFt: -20,
      headingDeg: 180,
      widthFt: 9,
      lengthFt: 18,
      occupied: false,
    });
    expect(level.layout.startStall).toEqual({
      x: ftToM(-1),
      z: ftToM(-20),
      halfWidthM: ftToM(4.5),
      halfLengthM: ftToM(9),
      headingRad: degToRad(180),
    });
    // 起點本身不帶 parked。
    expect(level.startFt).toEqual({ xFt: -1, zFt: -19, headingDeg: 0 });
  });

  test('start.parked：車位方向剛好在 0／360 的接縫另一邊（359.995 對 0）也算同向', () => {
    const seamRow = { pos: [-10, 0, -20], heading: 89.995, angle: 270, count: 4, empty: [1] };
    for (const heading of [0, 180]) {
      const level = parseLevel(
        sampleWith({ rows: [seamRow], start: { pos: [-1, 0, -20], heading, parked: true } }),
        SOURCE,
      );
      expect(level.startStallFt?.headingDeg).toBeCloseTo(359.995, 6);
    }
  });

  test('start.parked 是 false 與不寫一樣', () => {
    const level = parseLevel(
      sampleWith({ rows: [row], start: { pos: [1, 0, -33], heading: 180, parked: false } }),
      SOURCE,
    );
    expect(level.startStallFt).toBeUndefined();
  });

  test('start.parked 的錯誤：沒有 rows、不在空格裡、在有車的格子裡、方向歪了、不是布林', () => {
    const parkedStart = { pos: [-1, 0, -19], heading: 0, parked: true };
    expect(errorOf(sampleWith({ start: parkedStart }))).toContain('sample.json: start parked 是 true 時');
    expect(
      errorOf(sampleWith({ rows: [row], start: { ...parkedStart, pos: [-1, 0, -40] } })),
    ).toContain('必須在 rows 的一個空格裡');
    expect(
      errorOf(sampleWith({ rows: [row], start: { ...parkedStart, pos: [8, 0, -20] } })),
    ).toContain('必須在 rows 的一個空格裡');
    expect(
      errorOf(sampleWith({ rows: [row], start: { ...parkedStart, heading: 10 } })),
    ).toContain('heading 與那一格同向或反向');
    expect(errorOf(sampleWith({ rows: [row], start: { ...parkedStart, parked: 'yes' } }))).toBe(
      'sample.json: start.parked 必須是 true 或 false，拿到 "yes"',
    );
  });

  test('rows 的錯誤指出是第幾排的哪個欄位', () => {
    expect(errorOf(sampleWith({ rows: {} }))).toContain('sample.json: rows 必須是陣列');
    expect(errorOf(sampleWith({ rows: [{ heading: 90, count: 4 }] }))).toBe(
      'sample.json: rows[0].pos 是必填欄位',
    );
    expect(errorOf(sampleWith({ rows: [row, { ...row, count: 0 }] }))).toContain(
      'sample.json: rows[1].count 必須是 1–60 的整數',
    );
    expect(errorOf(sampleWith({ rows: [{ ...row, count: 2.5 }] }))).toContain('rows[0].count');
    expect(errorOf(sampleWith({ rows: [{ ...row, empty: [4] }] }))).toContain(
      'sample.json: rows[0].empty[0] 必須是 0–3 的整數',
    );
    expect(errorOf(sampleWith({ rows: [{ ...row, empty: [1, 1] }] }))).toContain(
      'sample.json: rows[0].empty[1] 重複了',
    );
    expect(errorOf(sampleWith({ rows: [{ ...row, empty: 1 }] }))).toContain(
      'sample.json: rows[0].empty 必須是格子索引的陣列',
    );
    expect(errorOf(sampleWith({ rows: [{ ...row, angle: 10 }] }))).toContain(
      'sample.json: rows[0].angle 與車排方向的夾角至少要 30 度',
    );
    expect(errorOf(sampleWith({ rows: [{ ...row, angle: 180 }] }))).toContain('rows[0].angle');
    expect(errorOf(sampleWith({ rows: [{ ...row, size: [9] }] }))).toContain('rows[0].size');
    expect(errorOf(sampleWith({ rows: [{ ...row, pitch: 9 }] }))).toContain(
      'sample.json: rows[0] 有不認得的欄位：pitch',
    );
  });
});
