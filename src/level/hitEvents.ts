// 這一步計入了哪些碰撞：比較相鄰兩步的 Session，不改 Session 的形狀。不 import three、不碰 DOM。
// 警報與音效（純表現層）靠它知道「剛剛撞到的是哪一個」。
import type { Session } from './session';

/** 一筆計入的碰撞。 */
export interface CountedHit {
  /**
   * 撞到的東西在 `layout.obstacles` 裡的索引：小於關卡的 `obstaclesFt.length` 是關卡的障礙物
   * （JSON 的障礙物加 `rows` 展開的停放車），其餘是四面邊界牆。
   */
  readonly index: number;
  /** 撞上去那一刻的車速（m/s，絕對值）：撞之前那一步的車速。 */
  readonly impactSpeedMps: number;
}

const NO_HITS: readonly CountedHit[] = [];

/**
 * 從 previous 走一步到 next，這一步計入的碰撞。
 * `stepSession` 只在有計次的那一步換掉 `hitCooldownUntil`，而且只改被計次的那幾格，
 * 所以冷卻期限變大的那幾格就是剛被計次的物件；冷卻中再撞不計次、陣列不變，所以沒有事件。
 * previous 與 next 必須是同一局相鄰的兩步（重來前後不要拿來比）。
 */
export function countedHits(previous: Session, next: Session): readonly CountedHit[] {
  if (next.hitCooldownUntil === previous.hitCooldownUntil) {
    return NO_HITS;
  }
  const impactSpeedMps = Math.abs(previous.vehicle.speedMps);
  return next.hitCooldownUntil.flatMap((until, index) =>
    until > (previous.hitCooldownUntil[index] ?? 0) ? [{ index, impactSpeedMps }] : [],
  );
}
