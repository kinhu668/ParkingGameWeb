// 檔位：自排（由車速與油門推導，沒按過掛檔鍵時）與手排（玩家按了掛 D／掛 R）。
// 手排時油門方向受檔位限制：D 只能向前、R 只能向後，另一個方向的油門鍵當成腳剎。
// 純邏輯，不 import three、不碰 DOM。
import type { DriveInput } from './bicycleModel';

/** 檔位：前進（D）或倒車（R）。 */
export type Gear = 'forward' | 'reverse';

export interface Gearbox {
  readonly gear: Gear;
  /** 玩家這一局按過掛檔鍵：檔位不再由車速推導，油門方向受檔位限制。 */
  readonly manual: boolean;
}

/** 新的一局：自排、D 檔。重來後也回到這裡。 */
export const INITIAL_GEARBOX: Gearbox = { gear: 'forward', manual: false };

/** 一局的階段（與 level/session 的 SessionStatus 同形）。 */
type RunStatus = 'ready' | 'driving' | 'parked' | 'failed';

/**
 * 自排的檔位：踩油門（或倒車）而且車沒有往反方向走，就是踩的那個方向。
 * 其他情況維持上一次的檔位：沒踩油門的滑行、反向踩（那是在煞車，煞停後才換檔）、
 * 撞到東西被彈回去（玩家沒有換檔）。
 */
export function gearFor(speedMps: number, throttle: DriveInput['throttle'], previous: Gear): Gear {
  if (throttle === 0 || speedMps * throttle < 0) {
    return previous;
  }
  return throttle > 0 ? 'forward' : 'reverse';
}

/** 玩家按了掛檔鍵：進入手排，檔位立刻換過去（不必先停車）。 */
export function shiftTo(gear: Gear): Gearbox {
  return { gear, manual: true };
}

/**
 * 物理步之後更新檔位。手排：只有掛檔鍵能換，這裡不動。
 * 自排：新的一局在第一次駕駛輸入之前（ready）是前進檔；已經結束（停妥或失敗）就不再換。
 * @param throttle 玩家按的油門（還沒被檔位限制的）
 */
export function nextGearbox(
  gearbox: Gearbox,
  status: RunStatus,
  speedMps: number,
  throttle: DriveInput['throttle'],
): Gearbox {
  if (gearbox.manual) {
    return gearbox;
  }
  const base: Gear = status === 'ready' ? 'forward' : gearbox.gear;
  const gear =
    status === 'ready' || status === 'driving' ? gearFor(speedMps, throttle, base) : base;
  return gear === gearbox.gear ? gearbox : { gear, manual: false };
}

/**
 * 把玩家的輸入套上檔位。自排：原樣。手排：與檔位同方向的油門原樣；
 * 反方向的油門不會推車，改成踩腳剎（D 檔按倒車油門、R 檔按油門都只會煞到停）。
 */
export function inputForGear(input: DriveInput, gearbox: Gearbox): DriveInput {
  if (!gearbox.manual || input.throttle === 0) {
    return input;
  }
  const allowed = gearbox.gear === 'forward' ? 1 : -1;
  if (input.throttle === allowed) {
    return input;
  }
  return { ...input, throttle: 0, brake: true };
}
