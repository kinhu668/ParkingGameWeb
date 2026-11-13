// 介面用的文字格式：純函式，不碰 DOM。
import type { TranslationKey } from '../core/i18n';
import { radToDeg } from '../core/units';
import type { Gear } from '../vehicle/gearbox';

const SECONDS_PER_MINUTE = 60;
const TENTHS_PER_SECOND = 10;

/** 浮點誤差的容差：59.999999 秒要顯示成 1:00.0，不是 0:59.9。 */
const TENTH_EPSILON = 1e-6;

/** 檔位 → 顯示的字母與名稱的翻譯鍵（行車資訊與螢幕上的切換檔位鍵共用）。 */
export const GEAR_LABELS: Readonly<
  Record<Gear, { readonly letter: string; readonly key: TranslationKey }>
> = {
  forward: { letter: 'D', key: 'hud.gearForward' },
  reverse: { letter: 'R', key: 'hud.gearReverse' },
};

/** 角度誤差顯示到小數第幾位；3 星的門檻是 3°。 */
const ANGLE_DECIMALS = 1;

/** 角度誤差文字：弧度換成度的絕對值，固定小數位，加度數符號。 */
export function formatAngleDeg(angleRad: number): string {
  return `${Math.abs(radToDeg(angleRad)).toFixed(ANGLE_DECIMALS)}°`;
}

/** 碰撞次數文字：`已撞次數 / 上限`；沒有上限就只顯示次數。 */
export function formatCollisions(collisions: number, maxCollisions: number): string {
  return Number.isFinite(maxCollisions) ? `${collisions} / ${maxCollisions}` : String(collisions);
}

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
