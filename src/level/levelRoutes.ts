// 每一關的參考路線：把 src/levels/routes/*.json 載入、驗證，換成腳本駕駛用的公尺制路線。
// 不 import three、不碰 DOM。可解性測試與 `?cam=…&level=…&t=…` 的定格都用它。
// JSON 的單位是英尺與 mph；座標是 [x, z]，與關卡 JSON 同一個座標系。
import { PHYSICS_HZ } from '../core/gameConfig';
import { ftToM, mphToMps } from '../core/units';
import type { VehicleState } from '../vehicle/bicycleModel';
import { VEHICLE_CONFIG_US } from '../vehicle/vehicleConfig';
import { runRoute, type Route, type RouteGear, type RouteSegment } from './autoDriver';
import type { LevelDefinition } from './levelSchema';

/** 建置時由 Vite 收集：檔案路徑 → JSON 內容。 */
const ROUTE_FILES: Readonly<Record<string, unknown>> = import.meta.glob('../levels/routes/*.json', {
  import: 'default',
  eager: true,
});

const JSON_EXTENSION = '.json';

/** 路線資料不合格。訊息開頭是來源（檔名）。 */
export class RouteFormatError extends Error {
  constructor(source: string, problem: string) {
    super(`${source}: ${problem}`);
    this.name = 'RouteFormatError';
  }
}

function recordOf(value: unknown, source: string, where: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new RouteFormatError(source, `${where} 必須是物件`);
  }
  return { ...value };
}

function listOf(value: unknown, source: string, where: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new RouteFormatError(source, `${where} 必須是陣列`);
  }
  return value;
}

function numberOf(value: unknown, source: string, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RouteFormatError(source, `${where} 必須是有限的數字，拿到 ${JSON.stringify(value)}`);
  }
  return value;
}

function positiveOf(value: unknown, source: string, where: string): number {
  const number = numberOf(value, source, where);
  if (number <= 0) {
    throw new RouteFormatError(source, `${where} 必須大於 0，拿到 ${number}`);
  }
  return number;
}

function gearOf(value: unknown, source: string, where: string): RouteGear {
  if (value !== 'forward' && value !== 'reverse') {
    throw new RouteFormatError(source, `${where} 必須是 forward 或 reverse，拿到 ${JSON.stringify(value)}`);
  }
  return value;
}

/** 巡航車速（mph）：大於 0，而且不超過這個檔位的最高車速。 */
function speedOf(value: unknown, gear: RouteGear, source: string, where: string): number {
  const mph = positiveOf(value, source, where);
  const maxMph =
    gear === 'forward' ? VEHICLE_CONFIG_US.maxSpeedMph : VEHICLE_CONFIG_US.maxReverseSpeedMph;
  if (mph > maxMph) {
    throw new RouteFormatError(source, `${where} 不能超過 ${maxMph} mph，拿到 ${mph}`);
  }
  return mphToMps(mph);
}

/** 有轉向的 arc 最多走半圈（進度是用 heading 的變化量算的，超過半圈分不出來）。 */
function maxArcDistanceFt(steer: number): number {
  if (steer === 0) {
    return Infinity;
  }
  const maxSteerRad = (VEHICLE_CONFIG_US.maxSteerDeg * Math.PI) / 180;
  return (Math.PI * VEHICLE_CONFIG_US.wheelbaseFt) / Math.tan(Math.abs(steer) * maxSteerRad);
}

function readSegment(value: unknown, source: string, where: string): RouteSegment {
  const record = recordOf(value, source, where);
  const gear = gearOf(record.gear, source, `${where}.gear`);
  const speedMps = speedOf(record.speed_mph, gear, source, `${where}.speed_mph`);
  if (record.type === 'path') {
    const points = listOf(record.points, source, `${where}.points`).map((point, index) => {
      const pair = listOf(point, source, `${where}.points[${index}]`);
      if (pair.length !== 2) {
        throw new RouteFormatError(source, `${where}.points[${index}] 必須是 [x, z]`);
      }
      return {
        x: ftToM(numberOf(pair[0], source, `${where}.points[${index}][0]`)),
        z: ftToM(numberOf(pair[1], source, `${where}.points[${index}][1]`)),
      };
    });
    if (points.length < 2) {
      throw new RouteFormatError(source, `${where}.points 至少要兩點`);
    }
    points.slice(1).forEach((point, index) => {
      const from = points[index] ?? point;
      if (from.x === point.x && from.z === point.z) {
        throw new RouteFormatError(source, `${where}.points[${index + 1}] 與前一點重合`);
      }
    });
    return { kind: 'path', gear, speedMps, points };
  }
  if (record.type === 'arc') {
    const steer = numberOf(record.steer, source, `${where}.steer`);
    if (steer < -1 || steer > 1) {
      throw new RouteFormatError(source, `${where}.steer 必須在 −1 到 1 之間，拿到 ${steer}`);
    }
    const distanceFt = positiveOf(record.distance_ft, source, `${where}.distance_ft`);
    if (distanceFt >= maxArcDistanceFt(steer)) {
      throw new RouteFormatError(source, `${where}.distance_ft 不能超過半圈，拿到 ${distanceFt}`);
    }
    return { kind: 'arc', gear, steer, distanceM: ftToM(distanceFt), speedMps };
  }
  throw new RouteFormatError(source, `${where}.type 必須是 path 或 arc，拿到 ${JSON.stringify(record.type)}`);
}

/**
 * 驗證一份路線 JSON（已經 JSON.parse 過的值）：`{ "level": "<id>", "segments": [ … ] }`。
 * @param source 寫進錯誤訊息的來源，通常是檔名
 * @returns 路線與它所屬的關卡 id
 */
export function parseRoute(raw: unknown, source: string): { readonly levelId: string; readonly route: Route } {
  const record = recordOf(raw, source, '最外層');
  if (typeof record.level !== 'string' || record.level === '') {
    throw new RouteFormatError(source, 'level 必須是關卡 id');
  }
  const segments = listOf(record.segments, source, 'segments').map((segment, index) =>
    readSegment(segment, source, `segments[${index}]`),
  );
  if (segments.length === 0) {
    throw new RouteFormatError(source, 'segments 至少要一段');
  }
  return { levelId: record.level, route: { segments } };
}

function loadRoutes(): ReadonlyMap<string, Route> {
  const routes = new Map<string, Route>();
  for (const [path, raw] of Object.entries(ROUTE_FILES)) {
    const fileName = path.slice(path.lastIndexOf('/') + 1);
    const { levelId, route } = parseRoute(raw, `routes/${fileName}`);
    if (`${levelId}${JSON_EXTENSION}` !== fileName) {
      throw new RouteFormatError(`routes/${fileName}`, `level 必須與檔名相同，拿到 ${JSON.stringify(levelId)}`);
    }
    routes.set(levelId, route);
  }
  return routes;
}

const ROUTES: ReadonlyMap<string, Route> = loadRoutes();

/** 有參考路線的關卡 id（依字母順序）。 */
export const ROUTE_LEVEL_IDS: readonly string[] = [...ROUTES.keys()].sort();

/** 這一關的參考路線；沒有（原型關）回傳 undefined。 */
export function routeForLevel(levelId: string): Route | undefined {
  return ROUTES.get(levelId);
}

/**
 * 沿這一關的參考路線跑 timeSeconds 之後的車輛狀態（`?cam=…&level=…&t=…` 的定格用）。
 * 跑的是真正的一局：停妥之後車就留在車位裡，所以很大的 t = 停在車位裡；
 * 步數夾在關卡的時間上限，很大的 t 不會把分頁卡死。沒有參考路線的關卡回傳 undefined。
 */
export function vehicleOnRouteAt(level: LevelDefinition, timeSeconds: number): VehicleState | undefined {
  const route = routeForLevel(level.id);
  if (route === undefined) {
    return undefined;
  }
  const steps = Math.round(Math.min(Math.max(timeSeconds, 0), level.timeLimitS) * PHYSICS_HZ);
  return runRoute(level.layout, route, { maxSteps: steps }).vehicle;
}
