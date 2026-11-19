// 被撞的車怎麼晃：每台被撞的車一個二維的阻尼彈簧（車身本地的橫向與縱向），純函式。不 import three、不碰 DOM。
// 只是畫面：碰撞盒、停車判定都不知道這件事。怎麼把它畫到模型上在 effects/swayMeshes.ts。
import { FIXED_STEP_SECONDS } from '../core/gameConfig';
import { forward, right, type GroundVector } from '../core/heading';
import { degToRad, ftToM, mpsToMph } from '../core/units';
import type { VehicleState } from '../vehicle/bicycleModel';
import { vehicleObb, type Obb } from './collision';
import type { ObstacleType } from './obstacleTypes';

export const SWAY_RULES = {
  /** 自然頻率（Hz）：車身在懸吊上晃大約是 1.5–2 Hz。 */
  frequencyHz: 1.8,
  /** 阻尼比：稍微欠阻尼，晃回來會過頭一兩次（每半個週期剩 40%），1–1.4 秒停住。 */
  dampingRatio: 0.28,
  /**
   * 滿格的一撞、第一下晃到最遠時：側傾與俯仰的角度（度）、整台車被推開的距離（ft；約 5 英寸）。
   * 比真車誇張一點：隔著一個車位、從跟車鏡頭看，要一眼就看得出那台車被撞得晃起來。
   */
  rollDeg: 6,
  pitchDeg: 3,
  shoveFt: 0.4,
  /** 撞擊車速 → 幾成：幾乎沒有速度是 minShare（輕輕一碰也看得出晃了一下），fullSpeedMph 以上是滿格。 */
  minShare: 0.2,
  fullSpeedMph: 5,
  /** 晃到剩滿格的這個比例就當作停了，回到原位。 */
  restShare: 0.02,
  /** 系統設了「減少動態效果」時，整個反應縮成這個比例（還是看得出被碰了一下，但只是輕輕一點）。 */
  reducedMotionScale: 0.3,
} as const;

/** 被撞會晃的障礙物：有懸吊的車。牆、柱、錐、推車這些不會（邊界牆不是關卡的障礙物，也不會）。 */
const SWAYING_TYPES: ReadonlySet<ObstacleType> = new Set<ObstacleType>([
  'parked_car',
  'surf_suv',
  'delivery_van',
  'ambulance',
  'food_truck',
]);

export function swaysWhenHit(type: ObstacleType): boolean {
  return SWAYING_TYPES.has(type);
}

/**
 * 整個反應的比例：`?fx=off` 是 0（不晃，同一個網址的畫面每次相同）；系統設了「減少動態效果」是 reducedMotionScale；其餘是 1。
 */
export function swayScaleFor(fxOff: boolean, reducedMotion: boolean): number {
  return fxOff ? 0 : reducedMotion ? SWAY_RULES.reducedMotionScale : 1;
}

const OMEGA = 2 * Math.PI * SWAY_RULES.frequencyHz;
/** 包絡衰減的速率（每秒）。 */
const SIGMA = SWAY_RULES.dampingRatio * OMEGA;
/** 有阻尼時實際擺動的角頻率。 */
const OMEGA_D = OMEGA * Math.sqrt(1 - SWAY_RULES.dampingRatio ** 2);
/** 從靜止給這個初速，第一個高點剛好是 1（滿格）。 */
const KICK_RATE = OMEGA * Math.exp((SIGMA / OMEGA_D) * Math.atan2(OMEGA_D, SIGMA));

/** 一台正在晃的車。位移的單位是「滿格一撞的第一個高點 = 1」；across 往車身的右邊、along 往車頭。 */
export interface Sway {
  /** 障礙物在關卡 `obstaclesFt` 裡的索引。 */
  readonly index: number;
  readonly across: number;
  readonly along: number;
  /** 位移的變化率（每秒）。 */
  readonly acrossRate: number;
  readonly alongRate: number;
}

/** 這一幀新的一撞：推哪一台、往哪個方向推多大（車身本地；長度 = 幾成）。 */
export interface SwayKick {
  readonly index: number;
  readonly across: number;
  readonly along: number;
}

/** 沒有車在晃（共用同一個空陣列）。 */
export const NO_SWAYS: readonly Sway[] = [];

/** 撞擊車速（m/s）→ 晃幾成：從 minShare 線性到 1。 */
export function swayShare(impactSpeedMps: number): number {
  const { minShare, fullSpeedMph } = SWAY_RULES;
  return minShare + (1 - minShare) * Math.min(mpsToMph(Math.abs(impactSpeedMps)) / fullSpeedMph, 1);
}

function projectedRadius(box: Obb, axis: GroundVector): number {
  const across = right(box.headingRad);
  const along = forward(box.headingRad);
  return (
    box.halfWidthM * Math.abs(across.x * axis.x + across.z * axis.z) +
    box.halfLengthM * Math.abs(along.x * axis.x + along.z * axis.z)
  );
}

/**
 * striker 撞上 struck 時把它往哪個方向推（世界座標的單位向量）：兩個矩形四條邊法線裡「卡得最淺」的那一條
 * （分離軸裡間隙最大的），方向從 striker 指向 struck。正面撞上去就是行進方向；擦撞是被擦到的那一面的法線。
 */
export function pushDirection(striker: Obb, struck: Obb): GroundVector {
  const dx = struck.x - striker.x;
  const dz = struck.z - striker.z;
  let best: GroundVector = { x: 0, z: 0 };
  let bestGapM = Number.NEGATIVE_INFINITY;
  for (const axis of [
    right(striker.headingRad),
    forward(striker.headingRad),
    right(struck.headingRad),
    forward(struck.headingRad),
  ]) {
    const distanceM = dx * axis.x + dz * axis.z;
    const gapM = Math.abs(distanceM) - projectedRadius(striker, axis) - projectedRadius(struck, axis);
    if (gapM > bestGapM) {
      bestGapM = gapM;
      best = distanceM < 0 ? { x: -axis.x, z: -axis.z } : axis;
    }
  }
  return best;
}

/**
 * 玩家車撞上一台車的那一推。
 * @param before 撞之前那一步的玩家車（`stepSession` 撞到會把車退回這個位置）
 * @param struck 被撞的車的碰撞盒
 * @param scale 整體的比例（1 = 一般；減少動態效果時是 reducedMotionScale）
 */
export function swayKick(
  index: number,
  before: Pick<VehicleState, 'x' | 'z' | 'headingRad' | 'speedMps'>,
  struck: Obb,
  scale: number,
): SwayKick {
  // 撞上去的那個位置：撞之前的位置照車速再走一步。
  const ahead = forward(before.headingRad);
  const travelM = before.speedMps * FIXED_STEP_SECONDS;
  const push = pushDirection(
    vehicleObb({ ...before, x: before.x + ahead.x * travelM, z: before.z + ahead.z * travelM }),
    struck,
  );
  const share = swayShare(before.speedMps) * scale;
  const across = right(struck.headingRad);
  const along = forward(struck.headingRad);
  return {
    index,
    across: (push.x * across.x + push.z * across.z) * share,
    along: (push.x * along.x + push.z * along.z) * share,
  };
}

/** 現在晃的幅度（包絡；1 = 滿格）：只會照 e^(−σt) 變小，不隨擺動的相位起伏。 */
export function swayAmplitude(sway: Sway): number {
  return Math.hypot(
    sway.across,
    sway.along,
    (sway.acrossRate + SIGMA * sway.across) / OMEGA_D,
    (sway.alongRate + SIGMA * sway.along) / OMEGA_D,
  ) * (OMEGA_D / KICK_RATE);
}

/** 阻尼彈簧走 dtS 秒（解析解：不論一幀多長、切成幾步，結果都一樣）。回傳 [位移, 變化率]。 */
function advance(position: number, rate: number, dtS: number): readonly [number, number] {
  const decay = Math.exp(-SIGMA * dtS);
  const cos = Math.cos(OMEGA_D * dtS);
  const sin = Math.sin(OMEGA_D * dtS);
  return [
    decay * (position * cos + ((rate + SIGMA * position) / OMEGA_D) * sin),
    decay * (rate * cos - ((SIGMA * rate + OMEGA * OMEGA * position) / OMEGA_D) * sin),
  ];
}

/**
 * 走一幀：先讓正在晃的車走 dtS 秒（晃到幾乎停了就拿掉，車回到原位），再加上這一幀新的一撞。
 * 還在晃的車再被撞：新的一推直接加在現在的速度上（同方向晃更大、反方向抵掉一些），速度不超過滿格一撞的初速。
 * 沒有車在晃、也沒有新的一撞時回傳同一個陣列。
 */
export function stepSways(
  sways: readonly Sway[],
  dtS: number,
  kicks: readonly SwayKick[],
): readonly Sway[] {
  if (sways.length === 0 && kicks.length === 0) {
    return sways;
  }
  const next: Sway[] = [];
  for (const sway of sways) {
    if (dtS === 0) {
      // 暫停：一個位元都不變。
      next.push(sway);
      continue;
    }
    const [across, acrossRate] = advance(sway.across, sway.acrossRate, dtS);
    const [along, alongRate] = advance(sway.along, sway.alongRate, dtS);
    const moved = { index: sway.index, across, along, acrossRate, alongRate };
    if (swayAmplitude(moved) >= SWAY_RULES.restShare) {
      next.push(moved);
    }
  }
  for (const kick of kicks) {
    const at = next.findIndex((sway) => sway.index === kick.index);
    const sway = next[at] ?? { index: kick.index, across: 0, along: 0, acrossRate: 0, alongRate: 0 };
    const acrossRate = sway.acrossRate + kick.across * KICK_RATE;
    const alongRate = sway.alongRate + kick.along * KICK_RATE;
    const limit = Math.min(1, KICK_RATE / Math.max(Math.hypot(acrossRate, alongRate), KICK_RATE));
    const kicked = { ...sway, acrossRate: acrossRate * limit, alongRate: alongRate * limit };
    if (at === -1) {
      next.push(kicked);
    } else {
      next[at] = kicked;
    }
  }
  return next.length === 0 ? NO_SWAYS : next;
}

/** 一台車現在被晃成什麼姿勢（相對它停著的位置）。 */
export interface SwayPose {
  /** 車頂往右倒的角度（弧度；負的是往左）。 */
  readonly leanAcrossRad: number;
  /** 車頂往車頭方向倒的角度（弧度）。 */
  readonly leanAlongRad: number;
  /** 整台車往右、往前被推開的距離（公尺）。 */
  readonly shoveAcrossM: number;
  readonly shoveAlongM: number;
}

const ROLL_RAD = degToRad(SWAY_RULES.rollDeg);
const PITCH_RAD = degToRad(SWAY_RULES.pitchDeg);
const SHOVE_M = ftToM(SWAY_RULES.shoveFt);

export function swayPose(sway: Sway): SwayPose {
  return {
    leanAcrossRad: sway.across * ROLL_RAD,
    leanAlongRad: sway.along * PITCH_RAD,
    shoveAcrossM: sway.across * SHOVE_M,
    shoveAlongM: sway.along * SHOVE_M,
  };
}

/** 給 e2e 讀的快照：哪幾台車在晃、現在的幅度（1 = 滿格）。 */
export interface SwaySnapshot {
  readonly index: number;
  readonly amplitude: number;
}

export function swaySnapshots(sways: readonly Sway[]): SwaySnapshot[] {
  return sways.map((sway) => ({ index: sway.index, amplitude: swayAmplitude(sway) }));
}
