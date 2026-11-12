// 關卡 JSON 的 schema：手寫驗證（不加套件）＋ 英尺／度 → 判定與物理用的公尺／弧度。
// 不 import three、不碰 DOM。JSON 的欄位名是規格的 snake_case；解析後一律 camelCase、單位寫在名字上。
// 座標約定（規格第 6 節）：pos 是 [x, y, z]（英尺），heading 0 朝 −Z、從上方看順時針為正（度）。
import { PARKING_RULES } from '../core/gameConfig';
import { degToRad, ftToM } from '../core/units';
import { boundsWallsFt, obbFromFt } from './collision';
import { defaultObstacleSizeFt, isObstacleType, type ObstacleType } from './obstacleTypes';
import { parkingSpotFromFt, type ParkingSpotFt } from './parkingJudge';
import { rulesFromLevel, type SessionRules } from './scoring';
import type { SessionLayout } from './session';

/** `environment` 可用的值：做好擺設的場景環境。 */
export const LEVEL_ENVIRONMENTS = [
  'open_lot',
  'warehouse_club',
  'post_office',
  'city_street',
  'narrow_alley',
] as const;

export type LevelEnvironment = (typeof LEVEL_ENVIRONMENTS)[number];

/** `weather` 可用的值。 */
export const LEVEL_WEATHERS = ['clear', 'dusk', 'rain', 'wet', 'storm', 'night'] as const;

export type LevelWeather = (typeof LEVEL_WEATHERS)[number];

/** `weather` 不填時的值。 */
export const DEFAULT_LEVEL_WEATHER: LevelWeather = 'clear';

/** `vehicle` 可用的值；本階段只有轎車。 */
export const LEVEL_VEHICLES = ['sedan'] as const;

export type LevelVehicle = (typeof LEVEL_VEHICLES)[number];

/** `world` 的範圍：1–5 是正式世界，0 保留給原型關（不出現在選關、不存檔）。 */
export const PROTOTYPE_WORLD = 0;
const MAX_WORLD = 5;

/** id 只能是小寫英數與底線（同時是檔名與網址參數值）。 */
const LEVEL_ID_PATTERN = /^[a-z0-9_]+$/;

/** heading 的範圍是 [0, 360)。 */
const FULL_TURN_DEG = 360;

/** 夾角容許值的上限：180° 等於完全不檢查方向，再大沒有意義。 */
const MAX_ANGLE_TOLERANCE_DEG = 180;

/** 車的起始姿態（英尺、度）。 */
export interface LevelStartFt {
  readonly xFt: number;
  readonly zFt: number;
  readonly headingDeg: number;
}

/** 可行駛範圍：軸對齊矩形（英尺）。 */
export interface LevelBoundsFt {
  readonly minXFt: number;
  readonly minZFt: number;
  readonly maxXFt: number;
  readonly maxZFt: number;
}

/** 一個障礙物：碰撞盒的中心、方向與大小（英尺、度）；大小已經補上類型的預設值。 */
export interface LevelObstacleFt {
  readonly type: ObstacleType;
  readonly centerXFt: number;
  readonly centerZFt: number;
  readonly headingDeg: number;
  /** 橫向（垂直於 heading）的寬度。 */
  readonly widthFt: number;
  /** 縱向（沿 heading）的長度。 */
  readonly lengthFt: number;
}

/** 解析、驗證過的一關。選填欄位已補上預設值。 */
export interface LevelDefinition {
  /** 與檔名相同，全域唯一。 */
  readonly id: string;
  /** 關卡名稱的翻譯鍵（兩種語言都要有，由測試把關）。 */
  readonly nameKey: string;
  readonly world: number;
  readonly environment: LevelEnvironment;
  readonly weather: LevelWeather;
  readonly vehicle: LevelVehicle;
  /** 超過就失敗（秒）。 */
  readonly timeLimitS: number;
  /** 2 星門檻（秒），一定小於 timeLimitS。 */
  readonly targetTimeS: number;
  /** 碰撞次數大於這個值才失敗。 */
  readonly maxCollisions: number;
  /** 可行駛範圍；沒有這個欄位 = 沒有邊界。 */
  readonly boundsFt?: LevelBoundsFt;
  readonly startFt: LevelStartFt;
  /** 目標車位；angleToleranceDeg 一定有值。 */
  readonly spotFt: ParkingSpotFt;
  readonly obstaclesFt: readonly LevelObstacleFt[];
  /**
   * 判定、物理與算圖用的配置（公尺、弧度）。車一開始靜止、方向盤回正；
   * obstacles 是障礙物加四面邊界的碰撞盒，rules 是換成步數的時間與碰撞上限。
   */
  readonly layout: SessionLayout;
}

/** 關卡資料不合格。訊息開頭是來源（檔名）與欄位路徑（最外層沒有路徑）。 */
export class LevelFormatError extends Error {
  constructor(source: string, path: string, problem: string) {
    super(path === '' ? `${source}: ${problem}` : `${source}: ${path} ${problem}`);
    this.name = 'LevelFormatError';
  }
}

/** 驗證時帶著走的位置：來源（檔名）與目前的欄位路徑。 */
interface Cursor {
  readonly source: string;
  readonly path: string;
}

function fail(cursor: Cursor, problem: string): never {
  throw new LevelFormatError(cursor.source, cursor.path, problem);
}

/** 往下一層：欄位用 `a.b`、陣列元素用 `a[0]`。 */
function child(cursor: Cursor, key: string | number): Cursor {
  if (typeof key === 'number') {
    return { source: cursor.source, path: `${cursor.path}[${key}]` };
  }
  return { source: cursor.source, path: cursor.path === '' ? key : `${cursor.path}.${key}` };
}

/** 給錯誤訊息用的值描述。 */
function got(value: unknown): string {
  if (value === undefined) {
    return '沒有這個欄位';
  }
  return `拿到 ${JSON.stringify(value)}`;
}

/** 一個 JSON 物件的欄位讀取器：記下讀過哪些鍵，最後檢查有沒有不認得的鍵（多半是打錯字）。 */
interface Fields {
  /** 必填欄位的值與它的位置。 */
  readonly required: (key: string) => { readonly value: unknown; readonly at: Cursor };
  /** 選填欄位；沒寫回傳 undefined。 */
  readonly optional: (key: string) => { readonly value: unknown; readonly at: Cursor } | undefined;
  /** 讀完之後呼叫：有沒讀過的鍵就報錯。 */
  readonly done: () => void;
}

function fieldsOf(value: unknown, cursor: Cursor): Fields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(cursor, `必須是物件，${got(value)}`);
  }
  const record: Readonly<Record<string, unknown>> = { ...value };
  const seen = new Set<string>();
  const optional: Fields['optional'] = (key) => {
    seen.add(key);
    return Object.hasOwn(record, key) ? { value: record[key], at: child(cursor, key) } : undefined;
  };
  return {
    optional,
    required: (key) => optional(key) ?? fail(child(cursor, key), '是必填欄位'),
    done: () => {
      const unknownKeys = Object.keys(record).filter((key) => !seen.has(key));
      if (unknownKeys.length > 0) {
        fail(cursor, `有不認得的欄位：${unknownKeys.join('、')}`);
      }
    },
  };
}

function readNumber(value: unknown, at: Cursor): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(at, `必須是有限的數字，${got(value)}`);
  }
  return value;
}

function readPositive(value: unknown, at: Cursor): number {
  const number = readNumber(value, at);
  return number > 0 ? number : fail(at, `必須大於 0，${got(value)}`);
}

function readInteger(value: unknown, at: Cursor, min: number, max: number): number {
  const number = readNumber(value, at);
  if (!Number.isInteger(number) || number < min || number > max) {
    const range = Number.isFinite(max) ? `${min}–${max}` : `≥ ${min}`;
    return fail(at, `必須是 ${range} 的整數，${got(value)}`);
  }
  return number;
}

function readString(value: unknown, at: Cursor): string {
  if (typeof value !== 'string' || value.trim() === '') {
    return fail(at, `必須是非空字串，${got(value)}`);
  }
  return value;
}

function readOneOf<T extends string>(value: unknown, at: Cursor, allowed: readonly T[]): T {
  const found = allowed.find((candidate) => candidate === value);
  return found ?? fail(at, `必須是 ${allowed.join('、')} 其中之一，${got(value)}`);
}

/** heading（度）：[0, 360)。 */
function readHeadingDeg(value: unknown, at: Cursor): number {
  const degrees = readNumber(value, at);
  if (degrees < 0 || degrees >= FULL_TURN_DEG) {
    return fail(at, `必須在 0（含）到 360（不含）之間，${got(value)}`);
  }
  return degrees;
}

/** 固定長度的數字陣列。 */
function readNumberTuple(value: unknown, at: Cursor, length: number): readonly number[] {
  if (!Array.isArray(value) || value.length !== length) {
    return fail(at, `必須是 ${length} 個數字的陣列，${got(value)}`);
  }
  const items: readonly unknown[] = value;
  return items.map((item, index) => readNumber(item, child(at, index)));
}

/** `pos`：[x, y, z]（英尺）。本階段地面是平的，y 必須是 0。 */
function readGroundPos(value: unknown, at: Cursor): { readonly xFt: number; readonly zFt: number } {
  const [xFt = 0, yFt = 0, zFt = 0] = readNumberTuple(value, at, 3);
  if (yFt !== 0) {
    fail(child(at, 1), `（y）本階段必須是 0，${got(yFt)}`);
  }
  return { xFt, zFt };
}

/** `[x, z]`（英尺）。 */
function readGroundPoint(value: unknown, at: Cursor): { readonly xFt: number; readonly zFt: number } {
  const [xFt = 0, zFt = 0] = readNumberTuple(value, at, 2);
  return { xFt, zFt };
}

/** `size`：[橫向寬, 沿 heading 的長]（英尺），都要大於 0。 */
function readSize(
  value: unknown,
  at: Cursor,
): { readonly widthFt: number; readonly lengthFt: number } {
  const [widthFt = 0, lengthFt = 0] = readNumberTuple(value, at, 2);
  readPositive(widthFt, child(at, 0));
  readPositive(lengthFt, child(at, 1));
  return { widthFt, lengthFt };
}

function readStart(value: unknown, at: Cursor): LevelStartFt {
  const fields = fieldsOf(value, at);
  const pos = fields.required('pos');
  const heading = fields.required('heading');
  fields.done();
  return {
    ...readGroundPos(pos.value, pos.at),
    headingDeg: readHeadingDeg(heading.value, heading.at),
  };
}

function readTarget(value: unknown, at: Cursor, angleToleranceDeg: number): ParkingSpotFt {
  const fields = fieldsOf(value, at);
  const pos = fields.required('pos');
  const heading = fields.required('heading');
  const size = fields.required('size');
  fields.done();
  const center = readGroundPos(pos.value, pos.at);
  return {
    centerXFt: center.xFt,
    centerZFt: center.zFt,
    ...readSize(size.value, size.at),
    headingDeg: readHeadingDeg(heading.value, heading.at),
    angleToleranceDeg,
  };
}

function readBounds(value: unknown, at: Cursor): LevelBoundsFt {
  const fields = fieldsOf(value, at);
  const min = fields.required('min');
  const max = fields.required('max');
  fields.done();
  const minPoint = readGroundPoint(min.value, min.at);
  const maxPoint = readGroundPoint(max.value, max.at);
  if (minPoint.xFt >= maxPoint.xFt || minPoint.zFt >= maxPoint.zFt) {
    fail(at, 'min 的 x、z 都必須小於 max');
  }
  return {
    minXFt: minPoint.xFt,
    minZFt: minPoint.zFt,
    maxXFt: maxPoint.xFt,
    maxZFt: maxPoint.zFt,
  };
}

function readObstacle(value: unknown, at: Cursor): LevelObstacleFt {
  const fields = fieldsOf(value, at);
  const typeField = fields.required('type');
  const pos = fields.required('pos');
  const heading = fields.optional('heading');
  const size = fields.optional('size');
  fields.done();

  const typeName = readString(typeField.value, typeField.at);
  if (!isObstacleType(typeName)) {
    return fail(typeField.at, `是不認得的障礙物類型，${got(typeName)}`);
  }
  const center = readGroundPos(pos.value, pos.at);
  const footprint =
    size === undefined ? defaultObstacleSizeFt(typeName) : readSize(size.value, size.at);
  if (footprint === null) {
    return fail(child(at, 'size'), `是必填欄位（${typeName} 沒有預設大小）`);
  }
  return {
    type: typeName,
    centerXFt: center.xFt,
    centerZFt: center.zFt,
    // 不填 = 0（規格範例的 cone 就沒寫）。
    headingDeg: heading === undefined ? 0 : readHeadingDeg(heading.value, heading.at),
    widthFt: footprint.widthFt,
    lengthFt: footprint.lengthFt,
  };
}

function readObstacles(value: unknown, at: Cursor): readonly LevelObstacleFt[] {
  if (!Array.isArray(value)) {
    return fail(at, `必須是陣列（可以是空的），${got(value)}`);
  }
  const items: readonly unknown[] = value;
  return items.map((item, index) => readObstacle(item, child(at, index)));
}

/**
 * 英尺／度的關卡資料 → 一局的配置（公尺、弧度）。
 * 會撞到的矩形 = 關卡的障礙物（依 JSON 的順序）＋ bounds 的四面邊界（西、東、北、南）。
 */
function layoutOf(
  startFt: LevelStartFt,
  spotFt: ParkingSpotFt,
  obstaclesFt: readonly LevelObstacleFt[],
  boundsFt: LevelBoundsFt | undefined,
  rules: SessionRules,
): SessionLayout {
  const wallsFt = boundsFt === undefined ? [] : boundsWallsFt(boundsFt);
  return {
    spot: parkingSpotFromFt(spotFt),
    startState: {
      x: ftToM(startFt.xFt),
      z: ftToM(startFt.zFt),
      headingRad: degToRad(startFt.headingDeg),
      speedMps: 0,
      steerRad: 0,
    },
    obstacles: [...obstaclesFt, ...wallsFt].map(obbFromFt),
    rules,
  };
}

/**
 * 驗證一份關卡 JSON（已經 JSON.parse 過的值）並換成 LevelDefinition。
 * 任何欄位缺少、型別不對、數值不合理或多出不認得的欄位都丟 LevelFormatError。
 * @param raw JSON 的內容
 * @param source 寫進錯誤訊息的來源，通常是檔名（例如 `w1_l03.json`）
 */
export function parseLevel(raw: unknown, source: string): LevelDefinition {
  const fields = fieldsOf(raw, { source, path: '' });

  const id = fields.required('id');
  const nameKey = fields.required('name_key');
  const world = fields.required('world');
  const environment = fields.required('environment');
  const weather = fields.optional('weather');
  const vehicle = fields.required('vehicle');
  const timeLimit = fields.required('time_limit');
  const targetTime = fields.required('target_time');
  const maxCollisions = fields.required('max_collisions');
  const angleTolerance = fields.optional('angle_tolerance');
  const bounds = fields.optional('bounds');
  const start = fields.required('start');
  const target = fields.required('target');
  const obstacles = fields.required('obstacles');
  fields.done();

  const levelId = readString(id.value, id.at);
  if (!LEVEL_ID_PATTERN.test(levelId)) {
    fail(id.at, `只能用小寫英數與底線，${got(levelId)}`);
  }

  const timeLimitS = readPositive(timeLimit.value, timeLimit.at);
  const targetTimeS = readPositive(targetTime.value, targetTime.at);
  if (targetTimeS >= timeLimitS) {
    fail(targetTime.at, `必須小於 time_limit（${timeLimitS}），${got(targetTimeS)}`);
  }

  const angleToleranceDeg =
    angleTolerance === undefined
      ? PARKING_RULES.defaultAngleToleranceDeg
      : readPositive(angleTolerance.value, angleTolerance.at);
  if (angleTolerance !== undefined && angleToleranceDeg > MAX_ANGLE_TOLERANCE_DEG) {
    fail(angleTolerance.at, `不能超過 ${MAX_ANGLE_TOLERANCE_DEG}，${got(angleToleranceDeg)}`);
  }

  const startFt = readStart(start.value, start.at);
  const spotFt = readTarget(target.value, target.at, angleToleranceDeg);
  const maxCollisionCount = readInteger(maxCollisions.value, maxCollisions.at, 0, Infinity);
  const boundsFt = bounds === undefined ? undefined : readBounds(bounds.value, bounds.at);
  const obstaclesFt = readObstacles(obstacles.value, obstacles.at);

  return {
    id: levelId,
    nameKey: readString(nameKey.value, nameKey.at),
    world: readInteger(world.value, world.at, PROTOTYPE_WORLD, MAX_WORLD),
    environment: readOneOf(environment.value, environment.at, LEVEL_ENVIRONMENTS),
    weather:
      weather === undefined
        ? DEFAULT_LEVEL_WEATHER
        : readOneOf(weather.value, weather.at, LEVEL_WEATHERS),
    vehicle: readOneOf(vehicle.value, vehicle.at, LEVEL_VEHICLES),
    timeLimitS,
    targetTimeS,
    maxCollisions: maxCollisionCount,
    ...(boundsFt === undefined ? {} : { boundsFt }),
    startFt,
    spotFt,
    obstaclesFt,
    layout: layoutOf(
      startFt,
      spotFt,
      obstaclesFt,
      boundsFt,
      rulesFromLevel(timeLimitS, targetTimeS, maxCollisionCount),
    ),
  };
}
