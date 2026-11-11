// 有種子的亂數：mulberry32。同一個種子永遠產生同一串數字，程序化生成與截圖才能重現。
// src/ 內一律用這個，不用內建的亂數函式。

/** 回傳 [0, 1) 均勻亂數的函式。 */
export type Rng = () => number;

// mulberry32 演算法本身的常數（不是可調數值）。
const STATE_INCREMENT = 0x6d2b79f5;
const UINT32_RANGE = 0x100000000;

/** 用 32 位元種子建立亂數產生器；種子會先折成無號 32 位元整數。 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + STATE_INCREMENT) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}
