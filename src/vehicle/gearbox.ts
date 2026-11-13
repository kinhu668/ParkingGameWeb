// 檔位：永遠有一個明確的檔位，開局與重來都是 D，只有「切換檔位」能改它（按一下 D↔R，不必先停車）。
// 玩家的油門沒有方向：踩下去就是往目前檔位的方向推（D 向前、R 向後），不會變成剎車。
// 純邏輯，不 import three、不碰 DOM。
import type { DriveInput } from './bicycleModel';

/** 檔位：前進（D）或倒車（R）。 */
export type Gear = 'forward' | 'reverse';

/** 新的一局的檔位；重來後也回到這裡。 */
export const INITIAL_GEAR: Gear = 'forward';

/** 玩家踩的踏板與打的方向盤（鍵盤與觸控合併之後）；油門還沒有方向。 */
export interface PedalInput {
  /** 油門是否踩著。 */
  readonly gas: boolean;
  /** 方向盤：−1（左打到底）到 +1（右打到底），0 = 放開。 */
  readonly steer: number;
  /** 剎車是否踩著。 */
  readonly brake: boolean;
}

/** 什麼都沒踩、方向盤放開。 */
export const NO_PEDAL_INPUT: PedalInput = { gas: false, steer: 0, brake: false };

/** 切換檔位：D → R、R → D。 */
export function toggledGear(gear: Gear): Gear {
  return gear === 'forward' ? 'reverse' : 'forward';
}

/** 一個畫面幀開頭，玩家對檔位下的指令。 */
export interface GearCommands {
  /** 這一幀重來了（按鍵或面板上的按鈕）。 */
  readonly restarted: boolean;
  /** 重來之後按了幾下切換檔位（重來之前按的不算，見 core/input.ts）。 */
  readonly toggles: number;
  /** 現在能不能換檔：這一局（重來的話是新的一局）還在進行，而且沒有暫停。 */
  readonly canShift: boolean;
}

/**
 * 畫面幀開頭的檔位：重來一律先回到 D 檔（上一局掛的檔不留），之後才看切換鍵——
 * 按一下換到另一檔，同一幀按兩下等於沒換。
 */
export function gearForFrame(gear: Gear, commands: GearCommands): Gear {
  const base = commands.restarted ? INITIAL_GEAR : gear;
  return commands.canShift && commands.toggles % 2 === 1 ? toggledGear(base) : base;
}

/** 把玩家的踏板套上檔位，變成物理層的駕駛輸入：油門 D 檔是 +1、R 檔是 −1；剎車與方向盤原樣。 */
export function driveInputForGear(pedals: PedalInput, gear: Gear): DriveInput {
  const direction = gear === 'forward' ? 1 : -1;
  return { throttle: pedals.gas ? direction : 0, steer: pedals.steer, brake: pedals.brake };
}
