// 倒車輔助層什麼時候顯示：掛著倒檔（HUD 的 R）或車真的在後退時顯示，回到前進檔而且不再後退就收起。
// 顯示與收起都有短淡入淡出。純邏輯，不 import three、不碰 DOM。
import { mphToMps } from './units';

export const REVERSE_ASSIST_RULES = {
  /** 淡入、淡出各要多久（秒）。 */
  fadeSeconds: 0.2,
  /** 前進檔時車往後退得比這個快才算「正在後退」。 */
  rollbackSpeedMps: mphToMps(0.5),
  /**
   * 前進檔時要連續後退這麼久才顯示（秒）：車頭撞到東西被彈回來只有一瞬間，不該閃一下輔助層。
   * 掛倒檔則立刻顯示。
   */
  rollbackHoldSeconds: 0.4,
} as const;

/** 輔助層的顯示狀態。 */
export interface AssistVisibility {
  /** 不透明度 0–1；0 = 完全收起（不必畫）。 */
  readonly opacity: number;
  /** 前進檔下已經連續後退多久（秒）。 */
  readonly rollbackSeconds: number;
}

export const ASSIST_HIDDEN: AssistVisibility = { opacity: 0, rollbackSeconds: 0 };

/** 這一幀決定顯示與否要看的東西。 */
export interface AssistDriveState {
  /** HUD 目前顯示的是不是倒檔（R）。 */
  readonly reverseGear: boolean;
  /** 車速（m/s），倒車為負。 */
  readonly speedMps: number;
  /** 這一局還在進行（沒有停妥、沒有失敗）。結束後一律收起，不擋結算面板。 */
  readonly running: boolean;
}

/** 走一幀：更新「連續後退多久」，不透明度朝目標淡過去。 */
export function nextAssistVisibility(
  previous: AssistVisibility,
  drive: AssistDriveState,
  dtSeconds: number,
): AssistVisibility {
  const rules = REVERSE_ASSIST_RULES;
  const dt = Math.max(dtSeconds, 0);
  const rollingBack = drive.speedMps < -rules.rollbackSpeedMps;
  const rollbackSeconds = rollingBack && drive.running ? previous.rollbackSeconds + dt : 0;
  const wanted =
    drive.running && (drive.reverseGear || rollbackSeconds >= rules.rollbackHoldSeconds);
  const step = dt / rules.fadeSeconds;
  const opacity = wanted
    ? Math.min(previous.opacity + step, 1)
    : Math.max(previous.opacity - step, 0);
  return { opacity, rollbackSeconds };
}
