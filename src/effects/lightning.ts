// 閃電的時間：固定種子的時間表與閃光強度曲線。純函式，不 import three、不碰 DOM。
// 閃光強度只由種子與累積時間決定；怎麼套到燈光、霧與天空由 render/scene.ts 負責。
// 看得見的電弧：形狀在 effects/lightningBolt.ts、網格在 effects/lightningArc.ts，跟著這裡的閃光強度亮與淡。
import { createRng } from '../core/rng';
import { LIGHTNING_CONFIG as CONFIG } from '../render/weatherPresets';

/**
 * 閃電的時間表：每一道開始的時間（秒），由小到大。第一道固定在 firstStrikeS，之後的間隔在 minGapS–maxGapS 之間。
 * @param seed 亂數種子；同一個種子永遠得到同一份時間表
 * @param untilS 排到這個時間為止（含）
 */
export function lightningSchedule(seed: number, untilS: number): number[] {
  const rng = createRng(seed);
  const strikes: number[] = [];
  let at: number = CONFIG.firstStrikeS;
  while (at <= untilS) {
    strikes.push(at);
    at += CONFIG.minGapS + rng() * (CONFIG.maxGapS - CONFIG.minGapS);
  }
  return strikes;
}

/**
 * 一道閃電開始之後 sinceS 秒的閃光強度（0–1）：兩下指數衰減的閃光，第二下比較弱；開始之前與結束之後是 0。
 */
export function flashCurve(sinceS: number): number {
  if (sinceS < 0 || sinceS >= CONFIG.durationS) {
    return 0;
  }
  const first = Math.exp(-sinceS / CONFIG.decayS);
  const sinceSecondS = sinceS - CONFIG.secondPulseDelayS;
  const second =
    sinceSecondS < 0 ? 0 : CONFIG.secondPulseScale * Math.exp(-sinceSecondS / CONFIG.decayS);
  return Math.min(1, Math.max(first, second));
}

/** 閃電：問某個累積時間的閃光強度。 */
export interface Lightning {
  /** 累積時間 timeS（秒）的閃光強度（0–1）。時間 0（定格截圖）一律是 0：沒有在閃。時間只能往前問。 */
  flashAt(timeS: number): number;
  /**
   * 上一次 flashAt 問的那個時間，最近的一道是第幾道（0 = 第一道）；還沒打過第一道是 −1。
   * 電弧的形狀由它決定：同一道閃電的兩下閃光是同一條電弧。
   */
  strikeIndex(): number;
}

/**
 * @param seed 亂數種子；與 lightningSchedule 用同一個種子就是同一份時間表
 */
export function createLightning(seed: number): Lightning {
  // 時間表邊走邊排：只記最後一道與下一道。
  const rng = createRng(seed);
  let current = Number.NEGATIVE_INFINITY;
  let next: number = CONFIG.firstStrikeS;
  let index = -1;
  return {
    flashAt(timeS) {
      while (timeS >= next) {
        current = next;
        index += 1;
        next += CONFIG.minGapS + rng() * (CONFIG.maxGapS - CONFIG.minGapS);
      }
      return flashCurve(timeS - current);
    },
    strikeIndex: () => index,
  };
}
