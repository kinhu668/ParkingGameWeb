// 關卡 JSON 的 schema：手寫驗證（不加套件）＋ 英尺／度 → 判定與物理用的公尺／弧度。
// 不 import three、不碰 DOM。JSON 的欄位名是規格的 snake_case；解析後一律 camelCase、單位寫在名字上。
// 座標約定（規格第 6 節）：pos 是 [x, y, z]（英尺），heading 0 朝 −Z、從上方看順時針為正（度）。
import { PARKING_RULES } from '../core/gameConfig';
import { degToRad, ftToM } from '../core/units';
import { CAR_MODEL_DIMS_FT, carModelMix, type CarModelId } from '../vehicle/carModels';
import { boundsWallsFt, obbFromFt } from './collision';
import {
  OBSTACLE_DEFAULT_SIZE_FT,
  defaultObstacleSizeFt,
  isObstacleType,
  type ObstacleType,
} from './obstacleTypes';
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

/**
 * `parking` 可用的值：bay = 一般車位（車頭入庫與倒車入庫都算停妥），
 * parallel = 路邊平行停車（只接受 target.heading 那一個朝向，與車流同向）。
 */
export const LEVEL_PARKINGS = ['bay', 'parallel'] as const;

export type LevelParking = (typeof LEVEL_PARKINGS)[number];

/** `world` 的範圍：1–5 是正式世界，0 保留給原型關（不出現在選關、不存檔）。 */
export const PROTOTYPE_WORLD = 0;
const MAX_WORLD = 5;

/** id 只能是小寫英數與底線（同時是檔名與網址參數值）。 */
const LEVEL_ID_PATTERN = /^[a-z0-9_]+$/;

/** heading 的範圍是 [0, 360)。 */
const FULL_TURN_DEG = 360;

/** `rows[].angle` 不填時的值：車位與車排垂直。 */
const DEFAULT_ROW_ANGLE_DEG = 90;

/** 車位與車排方向的夾角至少要這麼大（再小車位就疊在一起了）。 */
const MIN_ROW_ANGLE_DEG = 30;

/** `rows[].size` 不填時的車位大小（英尺）：寬 9、長 18。 */
const DEFAULT_STALL_SIZE_FT = { widthFt: 9, lengthFt: 18 } as const;

/** 一排最多幾格。 */
const MAX_ROW_COUNT = 60;

/** 垂直車位的車有一部分倒車入庫：每 ROW_BACKED_IN_EVERY 格一台（斜角車位一律車頭入庫）。 */
const ROW_BACKED_IN_EVERY = 4;

/** `start.parked` 的起點方向與車位方向（或反向）最多差這麼多度。 */
const PARKED_START_HEADING_EPSILON_DEG = 0.01;

/** 夾角容許值的上限：180° 等於完全不檢查方向，再大沒有意義。 */
const MAX_ANGLE_TOLERANCE_DEG = 180;

/** 車的起始姿態（英尺、度）。 */
export interface LevelStartFt {
  readonly xFt: number;
  readonly zFt: number;
  readonly headingDeg: number;
}

/** 車排（`rows`）展開後的一格車位（英尺、度）。 */
export interface LevelStallFt {
  readonly centerXFt: number;
  readonly centerZFt: number;
  /** 車頭入庫時車頭朝的方向。 */
  readonly headingDeg: number;
  /** 橫向（垂直於 heading）的寬度。 */
  readonly widthFt: number;
  /** 縱向（沿 heading）的長度。 */
  readonly lengthFt: number;
  /** 這一格有沒有停車（有 = 展開成一台 parked_car）。 */
  readonly occupied: boolean;
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
  /** 停放車輛（parked_car）是哪一款車：碰撞盒就是這款車的外框。其他類型沒有這個欄位。 */
  readonly model?: CarModelId;
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
  /** 停車種類；bay 的 spotFt 一定有 headInHeadingDeg，parallel 一定沒有。 */
  readonly parking: LevelParking;
  /** 目標車位；angleToleranceDeg 一定有值。 */
  readonly spotFt: ParkingSpotFt;
  /** 障礙物：JSON 的 `obstacles`（依原順序）在前，`rows` 展開的停放車在後。 */
  readonly obstaclesFt: readonly LevelObstacleFt[];
  /** `rows` 展開的全部車位（含空格），依 rows 的順序；畫標線與輪擋用。沒有 rows 是空的。 */
  readonly stallsFt: readonly LevelStallFt[];
  /** `start.parked`：起點所在的那一格（一定是空格）。沒有 = 起點不在車位裡。 */
  readonly startStallFt?: LevelStallFt;
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

function readBoolean(value: unknown, at: Cursor): boolean {
  return typeof value === 'boolean' ? value : fail(at, `必須是 true 或 false，${got(value)}`);
}

/** `start`：位置、方向，以及（選填）`parked` = 起點停在 `rows` 的一個空格裡。 */
function readStart(value: unknown, at: Cursor): LevelStartFt & { readonly parked: boolean } {
  const fields = fieldsOf(value, at);
  const pos = fields.required('pos');
  const heading = fields.required('heading');
  const parked = fields.optional('parked');
  fields.done();
  return {
    ...readGroundPos(pos.value, pos.at),
    headingDeg: readHeadingDeg(heading.value, heading.at),
    parked: parked === undefined ? false : readBoolean(parked.value, parked.at),
  };
}

/**
 * `rows[]` 的一排車位：`pos` 是第 0 格的中心，`heading` 是車排的方向（格子往這個方向排下去）。
 * `angle` 是從車排方向順時針轉到「車頭入庫方向」的角度：90（預設）= 車頭朝車排方向的右手邊、
 * 270 = 朝左手邊、45 或 135 之類 = 斜角車位。`count` 是格數，`empty` 是不停車的格子索引，
 * `size` 是每一格的 [寬, 長]（預設 9 × 18）。相鄰兩格的間距 = 車位寬 ÷ |sin(angle)|。
 */
function readRow(value: unknown, at: Cursor, rowIndex: number): readonly LevelStallFt[] {
  const fields = fieldsOf(value, at);
  const pos = fields.required('pos');
  const heading = fields.required('heading');
  const count = fields.required('count');
  const angle = fields.optional('angle');
  const empty = fields.optional('empty');
  const size = fields.optional('size');
  fields.done();

  const origin = readGroundPos(pos.value, pos.at);
  const rowHeadingDeg = readHeadingDeg(heading.value, heading.at);
  const stallCount = readInteger(count.value, count.at, 1, MAX_ROW_COUNT);
  const angleDeg = angle === undefined ? DEFAULT_ROW_ANGLE_DEG : readHeadingDeg(angle.value, angle.at);
  const sine = Math.sin(degToRad(angleDeg));
  if (angle !== undefined && Math.abs(sine) < Math.sin(degToRad(MIN_ROW_ANGLE_DEG)) - 1e-9) {
    fail(angle.at, `與車排方向的夾角至少要 ${MIN_ROW_ANGLE_DEG} 度，${got(angleDeg)}`);
  }
  const emptyIndices = new Set<number>();
  if (empty !== undefined) {
    if (!Array.isArray(empty.value)) {
      fail(empty.at, `必須是格子索引的陣列，${got(empty.value)}`);
    }
    const items: readonly unknown[] = empty.value;
    items.forEach((item, index) => {
      const itemAt = child(empty.at, index);
      const stallIndex = readInteger(item, itemAt, 0, stallCount - 1);
      if (emptyIndices.has(stallIndex)) {
        fail(itemAt, `重複了，${got(stallIndex)}`);
      }
      emptyIndices.add(stallIndex);
    });
  }
  const { widthFt, lengthFt } =
    size === undefined ? DEFAULT_STALL_SIZE_FT : readSize(size.value, size.at);
  const pitchFt = widthFt / Math.abs(sine);
  const rowRad = degToRad(rowHeadingDeg);
  // heading 0 朝 −Z、順時針為正：前進方向 = (sin, −cos)。
  const stepXFt = Math.sin(rowRad) * pitchFt;
  const stepZFt = -Math.cos(rowRad) * pitchFt;
  const headInDeg = (rowHeadingDeg + angleDeg) % FULL_TURN_DEG;
  const perpendicular = angleDeg % (FULL_TURN_DEG / 2) === DEFAULT_ROW_ANGLE_DEG;
  return Array.from({ length: stallCount }, (_, index) => ({
    centerXFt: origin.xFt + stepXFt * index,
    centerZFt: origin.zFt + stepZFt * index,
    // 垂直車位每隔幾格有一台倒車入庫的（每一排錯開）；格子本身的方向不變，只有車掉頭。
    headingDeg: headInDeg,
    widthFt,
    lengthFt,
    occupied: !emptyIndices.has(index),
    ...(perpendicular && (index + rowIndex) % ROW_BACKED_IN_EVERY === ROW_BACKED_IN_EVERY - 1
      ? { backedIn: true }
      : {}),
  }));
}

/** `rows`：每一排展開成車位，接成一個陣列。 */
function readRows(value: unknown, at: Cursor): readonly (LevelStallFt & { readonly backedIn?: boolean })[] {
  if (!Array.isArray(value)) {
    return fail(at, `必須是陣列，${got(value)}`);
  }
  const items: readonly unknown[] = value;
  return items.flatMap((item, index) => readRow(item, child(at, index), index));
}

/** 停在車位裡的車：碰撞盒先用預設值，車款決定之後換成那款車的外框。 */
function stallCar(stall: LevelStallFt & { readonly backedIn?: boolean }): LevelObstacleFt {
  return {
    type: 'parked_car',
    centerXFt: stall.centerXFt,
    centerZFt: stall.centerZFt,
    headingDeg:
      stall.backedIn === true ? (stall.headingDeg + FULL_TURN_DEG / 2) % FULL_TURN_DEG : stall.headingDeg,
    ...OBSTACLE_DEFAULT_SIZE_FT.parked_car,
  };
}

/**
 * `start.parked` 的起點在哪一格：位置在一個空格裡面，方向與車位方向相同或相反。找不到就報錯。
 */
function startStallOf(
  startFt: LevelStartFt,
  stalls: readonly LevelStallFt[],
  at: Cursor,
): LevelStallFt {
  const found = stalls.find((stall) => {
    if (stall.occupied) {
      return false;
    }
    const headingRad = degToRad(stall.headingDeg);
    const dx = startFt.xFt - stall.centerXFt;
    const dz = startFt.zFt - stall.centerZFt;
    const along = dx * Math.sin(headingRad) - dz * Math.cos(headingRad);
    const across = dx * Math.cos(headingRad) + dz * Math.sin(headingRad);
    const turnDeg = Math.abs(((startFt.headingDeg - stall.headingDeg + 270) % 180) - 90);
    return (
      Math.abs(along) <= stall.lengthFt / 2 &&
      Math.abs(across) <= stall.widthFt / 2 &&
      turnDeg <= PARKED_START_HEADING_EPSILON_DEG
    );
  });
  return found ?? fail(at, 'parked 是 true 時，pos 必須在 rows 的一個空格裡，heading 與那一格同向或反向');
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

/**
 * `head_in_heading`：一般車位必填、路邊平行停車不能有（回傳 undefined）。
 * 值是車頭入庫時車頭朝的方向，只能是車位的 heading 或它的反向（車位只有這兩個朝向）。
 * @param at `head_in_heading` 的位置（沒寫這個欄位時錯誤訊息也指向它）
 */
function readHeadInHeading(
  parking: LevelParking,
  value: unknown,
  at: Cursor,
  spotHeadingDeg: number,
): number | undefined {
  if (parking === 'parallel') {
    return value === undefined ? undefined : fail(at, 'parking 是 parallel 時不能有這個欄位');
  }
  if (value === undefined) {
    return fail(at, 'parking 是 bay 時是必填欄位');
  }
  const headInDeg = readHeadingDeg(value, at);
  const turnDeg = (headInDeg - spotHeadingDeg + FULL_TURN_DEG) % FULL_TURN_DEG;
  if (turnDeg !== 0 && turnDeg !== FULL_TURN_DEG / 2) {
    return fail(at, `必須是 target.heading（${spotHeadingDeg}）或它的反向，${got(headInDeg)}`);
  }
  return headInDeg;
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
  if (typeName === 'parked_car' && size !== undefined) {
    return fail(size.at, '不能用在 parked_car：碰撞盒就是車款的外框');
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

/**
 * 障礙物清單：JSON 的 `obstacles` 在前，`rows` 展開的停放車（rowCars）在後。停放車輛的車款由關卡 id 決定（固定種子，同一關永遠是同一組），碰撞盒換成那款車的外框：
 * 看到的車有多大，會撞到的範圍就有多大。
 */
function readObstacles(
  value: unknown,
  at: Cursor,
  levelId: string,
  rowCars: readonly LevelObstacleFt[],
): readonly LevelObstacleFt[] {
  if (!Array.isArray(value)) {
    return fail(at, `必須是陣列（可以是空的），${got(value)}`);
  }
  const items: readonly unknown[] = value;
  const obstacles = [...items.map((item, index) => readObstacle(item, child(at, index))), ...rowCars];
  const models = carModelMix(
    levelId,
    obstacles.filter((obstacle) => obstacle.type === 'parked_car').length,
  );
  let parked = 0;
  return obstacles.map((obstacle) => {
    if (obstacle.type !== 'parked_car') {
      return obstacle;
    }
    const model = models[parked] ?? 'sedan';
    parked += 1;
    const { widthFt, lengthFt } = CAR_MODEL_DIMS_FT[model];
    return { ...obstacle, widthFt, lengthFt, model };
  });
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
  startStallFt: LevelStallFt | undefined,
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
    ...(startStallFt === undefined ? {} : { startStall: obbFromFt(startStallFt) }),
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
  const parkingField = fields.required('parking');
  const headInHeading = fields.optional('head_in_heading');
  const bounds = fields.optional('bounds');
  const start = fields.required('start');
  const target = fields.required('target');
  const obstacles = fields.required('obstacles');
  const rows = fields.optional('rows');
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

  const { parked: startParked, ...startFt } = readStart(start.value, start.at);
  const parking = readOneOf(parkingField.value, parkingField.at, LEVEL_PARKINGS);
  const strictSpotFt = readTarget(target.value, target.at, angleToleranceDeg);
  const headInHeadingDeg = readHeadInHeading(
    parking,
    headInHeading?.value,
    { source, path: 'head_in_heading' },
    strictSpotFt.headingDeg,
  );
  const spotFt =
    headInHeadingDeg === undefined ? strictSpotFt : { ...strictSpotFt, headInHeadingDeg };
  const maxCollisionCount = readInteger(maxCollisions.value, maxCollisions.at, 0, Infinity);
  const boundsFt = bounds === undefined ? undefined : readBounds(bounds.value, bounds.at);
  const rowStalls = rows === undefined ? [] : readRows(rows.value, rows.at);
  const obstaclesFt = readObstacles(
    obstacles.value,
    obstacles.at,
    levelId,
    rowStalls.filter((stall) => stall.occupied).map(stallCar),
  );
  const stallsFt: readonly LevelStallFt[] = rowStalls.map(
    ({ centerXFt, centerZFt, headingDeg, widthFt, lengthFt, occupied }) => ({
      centerXFt,
      centerZFt,
      headingDeg,
      widthFt,
      lengthFt,
      occupied,
    }),
  );
  const startStallFt = startParked ? startStallOf(startFt, stallsFt, start.at) : undefined;

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
    parking,
    spotFt,
    obstaclesFt,
    stallsFt,
    ...(startStallFt === undefined ? {} : { startStallFt }),
    layout: layoutOf(
      startFt,
      spotFt,
      obstaclesFt,
      boundsFt,
      rulesFromLevel(timeLimitS, targetTimeS, maxCollisionCount),
      startStallFt,
    ),
  };
}
