// 過關挑戰：結算畫面星星下面那一排打鉤。純函式，不 import three、不碰 DOM。
// 由停妥當下的狀態判定（車姿、車位、成績時間、碰撞次數），加上這一局出車時的碰撞次數；失敗的一局沒有挑戰。
import { forward, right } from '../core/heading';
import { ftToM } from '../core/units';
import type { VehicleState } from '../vehicle/bicycleModel';
import { parkFacing, type ParkingSpot } from './parkingJudge';
import { secondsToSteps } from './scoring';
import type { Session, SessionLayout } from './session';

/** 挑戰的 id（也是存檔裡的字串），依顯示順序。 */
export const CHALLENGE_IDS = [
  'time',
  'no_collisions',
  'centered',
  'head_in',
  'back_in',
  'clean_exit',
] as const;

export type ChallengeId = (typeof CHALLENGE_IDS)[number];

/** 每一關都有的挑戰。 */
const COMMON_CHALLENGES: readonly ChallengeId[] = ['time', 'no_collisions', 'centered'];

/** 「停正置中」：車中心離車位中心的橫向、縱向偏移各自不超過這個值（含邊界）。 */
export const CENTERED_MAX_OFFSET_FT = 0.5;

/** 吸收浮點誤差用的長度容差：剛好 0.5 ft 的偏移不會因為最後一個位元被判成沒過。 */
const LENGTH_EPSILON_M = 1e-9;

/**
 * 「N 秒內」的 N（整秒）。N = round(0.70 × target_time)，一律比 2 星的目標時間緊；
 * 每一關的官方路線（含判定的 1 秒）都在 N 以內，由 tests/challenges.test.ts 把關。
 * 原型關沒有官方路線，用直線開進去的時間量。
 */
const CHALLENGE_TIME_S: ReadonlyMap<string, number> = new Map([
  ['prototype', 21],
  ['w1_l01', 13],
  ['w1_l02', 24],
  ['w1_l03', 25],
  ['w1_l04', 18],
  ['w1_l05', 13],
  ['w1_l06', 21],
  ['w1_l07', 24],
  ['w1_l08', 21],
  ['w1_l09', 28],
  ['w1_l10', 35],
]);

/** 這一關「N 秒內」的 N（秒）。目錄裡的每一關都有（由測試把關）；沒有就是資料漏了，直接丟錯。 */
export function challengeTimeS(levelId: string): number {
  const seconds = CHALLENGE_TIME_S.get(levelId);
  if (seconds === undefined) {
    throw new Error(`${levelId} 沒有「N 秒內」的門檻`);
  }
  return seconds;
}

/**
 * 這一關有哪些挑戰（顯示順序）。一般車位有車頭入庫／倒車入庫，路邊平行停車只接受單一朝向所以沒有；
 * 起點停在車位裡的關卡多一項「安全出車」。
 */
export function challengesForLayout(layout: {
  readonly spot: ParkingSpot;
  readonly startStall?: SessionLayout['startStall'];
}): readonly ChallengeId[] {
  const facing: readonly ChallengeId[] = layout.spot.headInHeadingRad === null ? [] : ['head_in', 'back_in'];
  const exit: readonly ChallengeId[] = layout.startStall === undefined ? [] : ['clean_exit'];
  return [...COMMON_CHALLENGES, ...facing, ...exit];
}

/** 停妥那一刻的狀態。 */
export interface ChallengeInput {
  readonly spot: ParkingSpot;
  /** 停妥的車姿。 */
  readonly vehicle: Pick<VehicleState, 'x' | 'z' | 'headingRad'>;
  /** 成績時間（步），含判定的 1 秒。 */
  readonly timeSteps: number;
  readonly collisions: number;
  /** 這一關「N 秒內」的 N（秒）。 */
  readonly challengeTimeS: number;
  /** 起始車位的矩形；起點不在車位裡的關卡沒有（也就沒有「安全出車」）。 */
  readonly startStall?: SessionLayout['startStall'];
  /** 車身完全離開起始車位之前的碰撞次數。 */
  readonly exitCollisions: number;
}

/** 車中心在車位本地座標的偏移（橫向、縱向）是否都在 CENTERED_MAX_OFFSET_FT 以內。 */
function isCentered(vehicle: Pick<VehicleState, 'x' | 'z'>, spot: ParkingSpot): boolean {
  const spotRight = right(spot.headingRad);
  const spotForward = forward(spot.headingRad);
  const dx = vehicle.x - spot.x;
  const dz = vehicle.z - spot.z;
  const maxOffsetM = ftToM(CENTERED_MAX_OFFSET_FT) + LENGTH_EPSILON_M;
  return (
    Math.abs(dx * spotRight.x + dz * spotRight.z) <= maxOffsetM &&
    Math.abs(dx * spotForward.x + dz * spotForward.z) <= maxOffsetM
  );
}

/**
 * 這一局拿到哪些挑戰（依顯示順序）。只在停妥之後呼叫。
 * 時間剛好等於 N 秒算過；車頭入庫與倒車入庫看停妥的車頭朝向，同一局只會有一個；
 * 「安全出車」= 車身完全離開起始車位之前沒有碰撞。
 */
export function earnedChallenges(input: ChallengeInput): readonly ChallengeId[] {
  const { spot, vehicle } = input;
  const facing = parkFacing(vehicle, spot);
  const earned: Readonly<Record<ChallengeId, boolean>> = {
    time: input.timeSteps <= secondsToSteps(input.challengeTimeS),
    no_collisions: input.collisions === 0,
    centered: isCentered(vehicle, spot),
    head_in: facing === 'head_in',
    back_in: facing === 'back_in',
    clean_exit: input.exitCollisions === 0,
  };
  return challengesForLayout(input).filter((id) => earned[id]);
}

/** 停妥的一局拿到哪些挑戰（結算畫面與存檔用同一份）；還沒停妥或失敗是空的。 */
export function sessionChallenges(session: Session, timeS: number): readonly ChallengeId[] {
  const { result } = session;
  if (result === null) {
    return [];
  }
  return earnedChallenges({
    spot: session.layout.spot,
    vehicle: session.vehicle,
    timeSteps: result.timeSteps,
    collisions: result.collisions,
    challengeTimeS: timeS,
    ...(session.layout.startStall === undefined ? {} : { startStall: session.layout.startStall }),
    exitCollisions: session.exitCollisions,
  });
}
