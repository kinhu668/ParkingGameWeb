// 閃電電弧的形狀：純函式，不 import three、不碰 DOM。形狀與落點只由種子與「第幾道閃電」決定。
// 每一道有一條主電弧與一條次電弧，各自從雲底打到場地外面的地上；主電弧另有幾條在半空中結束的分岔。
// 落點的規則見 LIGHTNING_CONFIG.arc：以車位為準選方位，走出場地邊界後再往外一段；電弧越往上越往場地外面斜，
// 所以整條電弧都在場地外面，不會從玩家頭上穿過。怎麼畫在 effects/lightningArc.ts。
import { forward, right } from '../core/heading';
import { createRng, type Rng } from '../core/rng';
import { degToRad } from '../core/units';
import { LIGHTNING_CONFIG } from '../render/weatherPresets';

const ARC = LIGHTNING_CONFIG.arc;

/** 推到框外時多推這麼一點（公尺），不會剛好停在框線上。 */
const KEEP_OUT_EPSILON_M = 1e-3;
/** 每一道閃電用自己的亂數序列：種子加上「第幾道」乘這個數。 */
const STRIKE_SEED_STRIDE = 0x9e3779b1;

export interface BoltPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** 電弧的一小段：兩端、面片的寬度（公尺）與亮度比例（主電弧 1，次電弧與分岔較暗）。 */
export interface BoltSegment {
  readonly from: BoltPoint;
  readonly to: BoltPoint;
  readonly widthM: number;
  readonly brightness: number;
}

/** 一條打到地上的電弧。 */
export interface Bolt {
  /** 落點（地面，世界座標）。 */
  readonly ground: { readonly x: number; readonly z: number };
  /** 這條電弧（含分岔）的全部小段。 */
  readonly segments: readonly BoltSegment[];
}

/** 閃電落點用的場地：車位的位置與朝向，加上電弧不能落進去的矩形（世界座標，與座標軸平行；公尺）。 */
export interface StrikeArea {
  readonly spotX: number;
  readonly spotZ: number;
  readonly spotHeadingRad: number;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

function between(rng: Rng, range: { readonly min: number; readonly max: number }): number {
  return range.min + rng() * (range.max - range.min);
}

/**
 * 第 strikeIndex 道閃電的主電弧方位（度，相對車位的朝向、順時針）。不含亂數的那一部分：
 * 第一道固定在 firstBearingDeg，之後每一道多轉一個黃金角。
 */
export function strikeBearingDeg(strikeIndex: number): number {
  return (ARC.firstBearingDeg + strikeIndex * ARC.turnDeg) % 360;
}

/**
 * 從 (originX, originZ)（在矩形裡）沿水平方向 (dirX, dirZ)（單位向量）走，走多遠離開矩形。
 * 起點不在矩形裡時回傳 0。
 */
export function exitDistance(
  area: Pick<StrikeArea, 'minX' | 'maxX' | 'minZ' | 'maxZ'>,
  originX: number,
  originZ: number,
  dirX: number,
  dirZ: number,
): number {
  const along = (origin: number, dir: number, min: number, max: number): number => {
    if (dir > 0) {
      return (max - origin) / dir;
    }
    return dir < 0 ? (min - origin) / dir : Number.POSITIVE_INFINITY;
  };
  const distance = Math.min(
    along(originX, dirX, area.minX, area.maxX),
    along(originZ, dirZ, area.minZ, area.maxZ),
  );
  return Number.isFinite(distance) ? Math.max(distance, 0) : 0;
}

/** 把 from → to 對半細分 levels 次，每次把中點沿垂直於整條線的方向推開一段亂數距離（幅度每次縮小）。 */
function jaggedPath(rng: Rng, from: BoltPoint, to: BoltPoint, levels: number): BoltPoint[] {
  const axis = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
  const length = Math.hypot(axis.x, axis.y, axis.z);
  // 垂直於整條線的兩個方向：一個水平的，一個與前兩者都垂直的。
  const flat = Math.hypot(axis.x, axis.z);
  const sideA = flat > 1e-6 ? { x: -axis.z / flat, y: 0, z: axis.x / flat } : { x: 1, y: 0, z: 0 };
  const sideB = {
    x: (axis.y * sideA.z - axis.z * sideA.y) / length,
    y: (axis.z * sideA.x - axis.x * sideA.z) / length,
    z: (axis.x * sideA.y - axis.y * sideA.x) / length,
  };
  let points: BoltPoint[] = [from, to];
  let amplitude = length * ARC.jitterFraction;
  for (let level = 0; level < levels; level += 1) {
    const next: BoltPoint[] = [];
    for (let index = 0; index + 1 < points.length; index += 1) {
      const a = points[index];
      const b = points[index + 1];
      if (a === undefined || b === undefined) {
        continue;
      }
      const offsetA = (rng() * 2 - 1) * amplitude;
      const offsetB = (rng() * 2 - 1) * amplitude;
      next.push(a, {
        x: (a.x + b.x) / 2 + sideA.x * offsetA + sideB.x * offsetB,
        y: Math.max((a.y + b.y) / 2 + sideA.y * offsetA + sideB.y * offsetB, 0),
        z: (a.z + b.z) / 2 + sideA.z * offsetA + sideB.z * offsetB,
      });
    }
    const last = points[points.length - 1];
    if (last !== undefined) {
      next.push(last);
    }
    points = next;
    amplitude *= ARC.roughness;
  }
  return points;
}

/**
 * 把落在「場地外框往外擴 keepOutMarginM」裡面的點沿 (outX, outZ)（往場地外面的水平方向）推到框外。
 * 折線的亂數偏移可能把半空中的幾個點推回場地上空；推出去之後整條電弧保證在場地外面。
 */
function keepOutside(
  path: readonly BoltPoint[],
  area: StrikeArea,
  outX: number,
  outZ: number,
): BoltPoint[] {
  const margin = ARC.keepOutMarginM;
  const expanded = {
    minX: area.minX - margin,
    maxX: area.maxX + margin,
    minZ: area.minZ - margin,
    maxZ: area.maxZ + margin,
  };
  return path.map((point) => {
    const inside =
      point.x > expanded.minX &&
      point.x < expanded.maxX &&
      point.z > expanded.minZ &&
      point.z < expanded.maxZ;
    if (!inside) {
      return point;
    }
    const push = exitDistance(expanded, point.x, point.z, outX, outZ) + KEEP_OUT_EPSILON_M;
    return { x: point.x + outX * push, y: point.y, z: point.z + outZ * push };
  });
}

function toSegments(path: readonly BoltPoint[], widthM: number, brightness: number): BoltSegment[] {
  const segments: BoltSegment[] = [];
  for (let index = 0; index + 1 < path.length; index += 1) {
    const from = path[index];
    const to = path[index + 1];
    if (from !== undefined && to !== undefined) {
      segments.push({ from, to, widthM, brightness });
    }
  }
  return segments;
}

/**
 * 一條電弧：落點在「從車位沿 bearing 走出場地邊界、再往外 extra」的地方，頂端在雲底、更往場地外面。
 * @param bearingRad 方位（世界座標的 heading：0 = 北，順時針為正）
 * @param scale 寬度與亮度的比例（主電弧 1）
 * @param withBranches 要不要分岔
 */
function createBolt(
  rng: Rng,
  area: StrikeArea,
  bearingRad: number,
  extraM: { readonly min: number; readonly max: number },
  scale: number,
  withBranches: boolean,
): Bolt {
  const outward = forward(bearingRad);
  const sideways = right(bearingRad);
  const reachM =
    exitDistance(area, area.spotX, area.spotZ, outward.x, outward.z) + between(rng, extraM);
  // 斜著走出邊界時，落點離最近那一邊可能比 extra 近：不夠遠就再往外推到外框之外。
  const [ground] = keepOutside(
    [{ x: area.spotX + outward.x * reachM, y: 0, z: area.spotZ + outward.z * reachM }],
    area,
    outward.x,
    outward.z,
  ) as [BoltPoint];
  const leanOutM = between(rng, ARC.leanOutM);
  const leanSideM = (rng() * 2 - 1) * ARC.leanSideM;
  const top: BoltPoint = {
    x: ground.x + outward.x * leanOutM + sideways.x * leanSideM,
    y: between(rng, ARC.cloudHeightM),
    z: ground.z + outward.z * leanOutM + sideways.z * leanSideM,
  };
  const foot: BoltPoint = { x: ground.x, y: 0, z: ground.z };
  const path = keepOutside(jaggedPath(rng, top, foot, ARC.subdivisions), area, outward.x, outward.z);
  const widthM = ARC.mainWidthM * scale;
  const segments = toSegments(path, widthM, scale);

  if (withBranches) {
    const lengthM = Math.hypot(top.x - foot.x, top.y, top.z - foot.z);
    const count = ARC.branches.min + Math.floor(rng() * (ARC.branches.max - ARC.branches.min + 1));
    for (let branch = 0; branch < count; branch += 1) {
      const start = path[Math.floor(between(rng, ARC.branchFrom) * (path.length - 1))];
      if (start === undefined) {
        continue;
      }
      // 分岔往下、往場地外面或兩旁岔出去（水平方向與「往外」的夾角在 ±80° 以內），不會折回場地上空。
      const swing = degToRad((rng() * 2 - 1) * 80);
      const flatX = outward.x * Math.cos(swing) + sideways.x * Math.sin(swing);
      const flatZ = outward.z * Math.cos(swing) + sideways.z * Math.sin(swing);
      const spread = 0.35 + rng() * 0.5;
      const branchLengthM = Math.min(lengthM * between(rng, ARC.branchLength), start.y / 0.9);
      const end: BoltPoint = {
        x: start.x + flatX * branchLengthM * spread,
        y: Math.max(start.y - branchLengthM * 0.85, 0),
        z: start.z + flatZ * branchLengthM * spread,
      };
      segments.push(
        ...toSegments(
          keepOutside(jaggedPath(rng, start, end, ARC.branchSubdivisions), area, outward.x, outward.z),
          widthM * ARC.branchScale,
          scale * ARC.branchScale,
        ),
      );
    }
  }
  return { ground: { x: ground.x, z: ground.z }, segments };
}

/**
 * 第 strikeIndex 道閃電（0 = 第一道）的電弧：主電弧（有分岔）與次電弧。同樣的引數永遠得到同樣的結果。
 * @param seed 亂數種子
 */
export function strikeBolts(seed: number, strikeIndex: number, area: StrikeArea): Bolt[] {
  const rng = createRng(seed + Math.imul(strikeIndex + 1, STRIKE_SEED_STRIDE));
  const jitterDeg = (rng() * 2 - 1) * ARC.bearingJitterDeg;
  // 第一道（截圖用）的主電弧不加亂數：方位就是 firstBearingDeg。
  const mainDeg = strikeBearingDeg(strikeIndex) + (strikeIndex === 0 ? 0 : jitterDeg);
  const secondaryDeg = mainDeg + ARC.secondaryBearingDeg + (rng() * 2 - 1) * ARC.bearingJitterDeg;
  return [
    createBolt(rng, area, area.spotHeadingRad + degToRad(mainDeg), ARC.mainExtraM, 1, true),
    createBolt(
      rng,
      area,
      area.spotHeadingRad + degToRad(secondaryDeg),
      ARC.secondaryExtraM,
      ARC.secondaryScale,
      false,
    ),
  ];
}

/** 一道閃電最多有幾小段（主電弧＋最多的分岔＋次電弧）：畫的那一邊照這個數配置緩衝區。 */
export const MAX_STRIKE_SEGMENTS =
  2 ** ARC.subdivisions * 2 + ARC.branches.max * 2 ** ARC.branchSubdivisions;

/** 離鏡頭 distanceM 的電弧還剩多少亮度（0–1）：太近的不畫。與著色器裡的式子相同。 */
export function boltCameraFade(distanceM: number): number {
  const t = Math.min(
    Math.max((distanceM - ARC.cameraFadeNearM) / (ARC.cameraFadeFarM - ARC.cameraFadeNearM), 0),
    1,
  );
  return t * t * (3 - 2 * t);
}
