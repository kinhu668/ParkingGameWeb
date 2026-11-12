// 評分與失敗條件（計畫 7.2）：純函式，不 import three、不碰 DOM。
// 時間一律用整數物理步數比較，不累加浮點秒數。
import { PHYSICS_HZ, SCORING_RULES } from '../core/gameConfig';
import { degToRad } from '../core/units';

/** 星數：停妥至少 1 星。 */
export type Stars = 1 | 2 | 3;

/** 失敗原因：超過時間上限，或碰撞次數超過上限。 */
export type FailReason = 'timeout' | 'collisions';

/** 一局的規則（由關卡 JSON 換算而來）。 */
export interface SessionRules {
  /** 時間上限（步）；已經過的步數嚴格大於它就失敗。 */
  readonly timeLimitSteps: number;
  /** 2 星門檻（步）；成績時間小於等於它才有 2 星。 */
  readonly targetSteps: number;
  /** 碰撞次數嚴格大於它才失敗；0 = 碰一次就失敗。 */
  readonly maxCollisions: number;
}

/** 沒有給規則的配置（測試、展示）：不限時、不限碰撞次數。 */
export const UNLIMITED_RULES: SessionRules = {
  timeLimitSteps: Infinity,
  targetSteps: Infinity,
  maxCollisions: Infinity,
};

/** 3 星的角度門檻。嚴格小於、不加容差。 */
const THREE_STAR_ANGLE_RAD = degToRad(SCORING_RULES.threeStarMaxAngleDeg);

/** 秒 → 物理步數（四捨五入到整數步）。 */
export function secondsToSteps(seconds: number): number {
  return Math.round(seconds * PHYSICS_HZ);
}

/** 物理步數 → 秒。 */
export function stepsToSeconds(steps: number): number {
  return steps / PHYSICS_HZ;
}

/** 關卡的秒數與次數 → 一局的規則。 */
export function rulesFromLevel(
  timeLimitS: number,
  targetTimeS: number,
  maxCollisions: number,
): SessionRules {
  return {
    timeLimitSteps: secondsToSteps(timeLimitS),
    targetSteps: secondsToSteps(targetTimeS),
    maxCollisions,
  };
}

export interface ScoreInput {
  /** 成績時間（步）：從第一次駕駛輸入到停妥成立的那一步，含判定的 1 秒。 */
  readonly timeSteps: number;
  /** 2 星門檻（步）。 */
  readonly targetSteps: number;
  /** 這一局的碰撞次數。 */
  readonly collisions: number;
  /** 停妥當下車頭與車位 heading 的夾角（弧度，絕對值）。 */
  readonly angleErrorRad: number;
}

/**
 * 停妥之後的星數。
 * 1 星：停妥。2 星：時間 ≤ 目標時間。3 星：2 星的條件，加上 0 碰撞、角度誤差 < 3°。
 */
export function starsFor(score: ScoreInput): Stars {
  if (score.timeSteps > score.targetSteps) {
    return 1;
  }
  const clean = score.collisions === 0 && Math.abs(score.angleErrorRad) < THREE_STAR_ANGLE_RAD;
  return clean ? 3 : 2;
}

export interface FailInput {
  /** 開始計時後經過的步數。 */
  readonly elapsedSteps: number;
  readonly collisions: number;
  readonly rules: SessionRules;
}

/**
 * 這一步要不要判失敗；還沒失敗回傳 null。
 * 兩個門檻都是「嚴格大於」：剛好用完時間、剛好等於碰撞上限都還沒失敗。
 * 同一步兩個條件都成立時回報碰撞（那一下撞擊是玩家當下看得到的原因）。
 */
export function failReason(input: FailInput): FailReason | null {
  if (input.collisions > input.rules.maxCollisions) {
    return 'collisions';
  }
  if (input.elapsedSteps > input.rules.timeLimitSteps) {
    return 'timeout';
  }
  return null;
}
