// e2e 共用的開車方法：用真實鍵盤事件，閉迴路把車直線開進正前方的車位。
// 適用起點朝北（−Z）、車位在正前方而且與車同向的關卡（原型關、w1_l01）。
// 車的狀態只透過 window.__parkingGame.snapshot() 讀取（唯讀）；操作一律送鍵盤事件。
import type { Page } from '@playwright/test';
import type { SessionSnapshot } from '../src/level/session';

/** 車身中心離車位中心（縱向）在這個距離內就放開油門、踩剎車；要比車位餘裕小。 */
const STOP_BAND_FT = 0.5;
/** 接近車位時的目標車速 = 剩餘距離 × 這個係數，再夾在下面兩個值之間：越近越慢。 */
const APPROACH_MPH_PER_FT = 0.4;
const MIN_APPROACH_MPH = 1.5;
const MAX_APPROACH_MPH = 10;
/** 比目標車速快超過這麼多就踩剎車，否則只放開油門滑行。 */
const OVERSPEED_MPH = 1;
/** 整段駕駛的真實時間上限；軟體算圖幀率低也綽綽有餘。 */
const DRIVE_DEADLINE_MS = 90_000;

/** 油門（往目前檔位的方向推）與剎車。 */
const DRIVE_KEYS = ['KeyW', 'Comma'] as const;
type DriveKey = (typeof DRIVE_KEYS)[number];
/** 切換 D／R 檔。 */
const GEAR_TOGGLE_KEY = 'KeyR';

/** 這一幀要掛的檔與要按住的鍵。 */
interface DrivePlan {
  readonly reverse: boolean;
  readonly keys: readonly DriveKey[];
}

/** 等遊戲畫完下一幀，再讀唯讀狀態：每幀最多判斷一次，不靠寫死的毫秒數。 */
export async function nextSnapshot(page: Page): Promise<SessionSnapshot> {
  return page.evaluate(
    () =>
      new Promise<SessionSnapshot>((resolve, reject) => {
        requestAnimationFrame(() => {
          const game = window.__parkingGame;
          if (game === undefined) {
            reject(new Error('window.__parkingGame 不存在'));
          } else {
            resolve(game.snapshot());
          }
        });
      }),
  );
}

/**
 * 依車的現況決定這一幀要掛的檔與要按住的鍵。
 * @param reverse 目前是不是 R 檔
 */
function drivePlan(snapshot: SessionSnapshot, spotCenterZFt: number, reverse: boolean): DrivePlan {
  // 車朝 −Z 開：正值 = 車位還在前方，負值 = 開過頭了。
  const aheadFt = snapshot.zFt - spotCenterZFt;
  if (Math.abs(aheadFt) <= STOP_BAND_FT) {
    return { reverse, keys: ['Comma'] };
  }

  // 開過頭了要倒回去：先切到 R 檔，油門才會往後推。
  const wantReverse = aheadFt < 0;
  // 朝車位方向的車速（mph）；過頭時是倒車的速度。
  const towardSpeedMph = aheadFt > 0 ? snapshot.speedMph : -snapshot.speedMph;
  const targetSpeedMph = Math.min(
    Math.max(Math.abs(aheadFt) * APPROACH_MPH_PER_FT, MIN_APPROACH_MPH),
    MAX_APPROACH_MPH,
  );

  if (towardSpeedMph > targetSpeedMph + OVERSPEED_MPH) {
    return { reverse: wantReverse, keys: ['Comma'] };
  }
  if (towardSpeedMph < targetSpeedMph) {
    return { reverse: wantReverse, keys: ['KeyW'] };
  }
  return { reverse: wantReverse, keys: [] };
}

/**
 * 閉迴路把車停進正前方的車位：每幀讀狀態 → 決定檔位與按鍵 → 只對有變化的鍵送 keydown／keyup。
 * 進場時必須是 D 檔（新的一局）。回傳時已停妥，所有鍵都已放開。
 * @param spotCenterZFt 車位中心的 z（ft）；車從起點朝 −Z 直線開過去
 */
export async function driveIntoSpot(page: Page, spotCenterZFt: number): Promise<SessionSnapshot> {
  const held = new Set<DriveKey>();
  async function hold(wanted: readonly DriveKey[]): Promise<void> {
    for (const key of DRIVE_KEYS) {
      if (wanted.includes(key) && !held.has(key)) {
        await page.keyboard.down(key);
        held.add(key);
      } else if (!wanted.includes(key) && held.has(key)) {
        await page.keyboard.up(key);
        held.delete(key);
      }
    }
  }

  const deadlineMs = Date.now() + DRIVE_DEADLINE_MS;
  let reverse = false;
  let snapshot = await nextSnapshot(page);
  while (!snapshot.parked) {
    if (Date.now() > deadlineMs) {
      await hold([]);
      throw new Error(`時間內沒有停妥，最後狀態：${JSON.stringify(snapshot)}`);
    }
    const plan = drivePlan(snapshot, spotCenterZFt, reverse);
    if (plan.reverse !== reverse) {
      await page.keyboard.press(GEAR_TOGGLE_KEY);
      reverse = plan.reverse;
    }
    await hold(plan.keys);
    snapshot = await nextSnapshot(page);
  }
  await hold([]);
  return snapshot;
}
