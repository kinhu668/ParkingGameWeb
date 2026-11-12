// 介面用的文字格式：純函式，不碰 DOM。

const SECONDS_PER_MINUTE = 60;
const TENTHS_PER_SECOND = 10;

/** 浮點誤差的容差：59.999999 秒要顯示成 1:00.0，不是 0:59.9。 */
const TENTH_EPSILON = 1e-6;

/**
 * 秒 → `m:ss.s`（無條件捨去到 0.1 秒；負值當 0）。
 * 不是有限的數字（沒有時間上限）顯示成 `–:––.–`。
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return '–:––.–';
  }
  const totalTenths = Math.floor(Math.max(seconds, 0) * TENTHS_PER_SECOND + TENTH_EPSILON);
  const tenths = totalTenths % TENTHS_PER_SECOND;
  const totalSeconds = Math.floor(totalTenths / TENTHS_PER_SECOND);
  const secondsPart = totalSeconds % SECONDS_PER_MINUTE;
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  return `${minutes}:${String(secondsPart).padStart(2, '0')}.${tenths}`;
}

/** 星數文字：拿到的是實心、沒拿到的是空心，一共 3 顆（例如 2 星 = `★★☆`）。 */
export function formatStars(stars: number): string {
  const total = 3;
  const earned = Math.min(Math.max(Math.round(stars), 0), total);
  return '★'.repeat(earned) + '☆'.repeat(total - earned);
}
