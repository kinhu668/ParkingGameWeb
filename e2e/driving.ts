// e2e 共用的開車方法：用真實鍵盤事件，閉迴路把車開進車位。
// driveIntoSpot：起點朝北（−Z）、車位在正前方而且與車同向的關卡（原型關）。
// driveRoute：要轉彎的關卡（第 1 世界），由「直線開到某個座標停下」與「原地把方向盤打到底、轉到某個車頭方向停下」兩種路段組成；
// 兩種路段都是閉迴路、停下來才換下一段，所以幀率多低都走同一條路。
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
/** 照路線開（driveRoute）的真實時間上限：路線比直線長，幀率低時遊戲時間走得比真實時間慢。 */
const ROUTE_DEADLINE_MS = 150_000;

/** 油門（往目前檔位的方向推）與剎車：預設綁定的主要鍵 `/` 與 `.`。 */
const THROTTLE_KEY = 'Slash';
const BRAKE_KEY = 'Period';
const DRIVE_KEYS = [THROTTLE_KEY, BRAKE_KEY] as const;
type DriveKey = (typeof DRIVE_KEYS)[number];
/** 切換 D／R 檔：預設綁定的主要鍵（空白鍵）。 */
const GEAR_TOGGLE_KEY = 'Space';

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
    return { reverse, keys: [BRAKE_KEY] };
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
    return { reverse: wantReverse, keys: [BRAKE_KEY] };
  }
  if (towardSpeedMph < targetSpeedMph) {
    return { reverse: wantReverse, keys: [THROTTLE_KEY] };
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

/** 方向盤：預設綁定的主要鍵。 */
const STEER_LEFT_KEY = 'KeyA';
const STEER_RIGHT_KEY = 'KeyD';
type RouteKey = DriveKey | typeof STEER_LEFT_KEY | typeof STEER_RIGHT_KEY;
const ROUTE_KEYS: readonly RouteKey[] = [THROTTLE_KEY, BRAKE_KEY, STEER_LEFT_KEY, STEER_RIGHT_KEY];

/** 路段的終點在這個距離內就踩剎車（ft）；比 STOP_BAND_FT 小，因為停的位置會變成下一段的橫向誤差。 */
const LEG_STOP_BAND_FT = 0.25;
/** 路段接近終點時的最低車速（mph）：一幀走不到 LEG_STOP_BAND_FT。 */
const LEG_MIN_MPH = 1.2;
/** 弧線段：方向盤從回正打到底要 35° ÷ 90°/s ≈ 0.39 s；原地按住這麼久（遊戲時間）才起步，整段弧就是同一個半徑。 */
const STEER_LOCK_S = 0.6;
/** 弧線段結束後放開方向盤，等它回正（35° ÷ 120°/s ≈ 0.29 s）再走下一段。 */
const STEER_RETURN_S = 0.45;
/** 弧線段：離目標車頭方向在這個角度內就踩剎車。 */
const ARC_STOP_BAND_DEG = 1;
/** 弧線段的目標車速 = 剩餘角度 × 這個係數，夾在下面兩個值之間（打到底時 1 mph ≈ 6.5°/s）。 */
const ARC_MPH_PER_DEG = 0.1;
const ARC_MIN_MPH = 1.2;
const ARC_MAX_MPH = 3.5;

/** 一段路。reverse = 掛 R 檔走這一段。 */
export type RouteLeg =
  /** 直線開到車身中心的 x 或 z（ft）等於 stopAtFt 的地方停下；最後一段停下後踩著剎車等判定。 */
  | { readonly kind: 'straight'; readonly axis: 'x' | 'z'; readonly stopAtFt: number; readonly reverse?: boolean }
  /** 原地把方向盤往 steer 打到底，再開到車頭方向等於 untilHeadingDeg 停下，放開方向盤等它回正。 */
  | { readonly kind: 'arc'; readonly steer: 'left' | 'right'; readonly untilHeadingDeg: number; readonly reverse?: boolean };

/** 這一幀要掛的檔與要按住的鍵。 */
export interface RoutePlan {
  readonly reverse: boolean;
  readonly keys: readonly RouteKey[];
}

/** 朝目標車速開：太快踩剎車、不夠快踩油門、差不多就滑行。 */
function speedKeys(speedMph: number, targetMph: number): readonly DriveKey[] {
  if (speedMph > targetMph + OVERSPEED_MPH) {
    return [BRAKE_KEY];
  }
  return speedMph < targetMph ? [THROTTLE_KEY] : [];
}

/**
 * 路線的閉迴路規劃：每一幀給它車的現況，回傳這一幀要掛的檔與要按住的鍵；全部走完回傳 null。
 * 純邏輯、不碰頁面（tests/e2eRoutes.test.ts 用同一份邏輯在物理模型上驗證路線）。
 *
 * 幾何（給寫路線的人）：方向盤打到底時後軸中心的轉彎半徑 R = 9 ft ÷ tan 35° ≈ 12.85 ft，車身中心在後軸前方 4.5 ft。
 */
export function createRoutePlanner(
  legs: readonly RouteLeg[],
): (snapshot: SessionSnapshot) => RoutePlan | null {
  let index = 0;
  let phase: 'start' | 'lock' | 'move' | 'settle' = 'start';
  let phaseStartS = 0;
  let direction = 1;

  return (snapshot) => {
    for (;;) {
      const leg = legs[index];
      if (leg === undefined) {
        return null;
      }
      const reverse = leg.reverse === true;
      const speedMph = Math.abs(snapshot.speedMph);

      if (leg.kind === 'straight') {
        const coordinateFt = leg.axis === 'x' ? snapshot.xFt : snapshot.zFt;
        if (phase === 'start') {
          direction = leg.stopAtFt >= coordinateFt ? 1 : -1;
          phase = 'move';
        }
        const remainingFt = (leg.stopAtFt - coordinateFt) * direction;
        if (remainingFt > LEG_STOP_BAND_FT) {
          const targetMph = Math.min(
            Math.max(remainingFt * APPROACH_MPH_PER_FT, LEG_MIN_MPH),
            MAX_APPROACH_MPH,
          );
          return { reverse, keys: speedKeys(speedMph, targetMph) };
        }
        if (speedMph > 0 || index === legs.length - 1) {
          return { reverse, keys: [BRAKE_KEY] };
        }
        index += 1;
        phase = 'start';
        continue;
      }

      const steerKey = leg.steer === 'left' ? STEER_LEFT_KEY : STEER_RIGHT_KEY;
      if (phase === 'start') {
        phase = 'lock';
        phaseStartS = snapshot.elapsedS;
      }
      if (phase === 'lock') {
        if (snapshot.elapsedS - phaseStartS < STEER_LOCK_S) {
          return { reverse, keys: [steerKey, BRAKE_KEY] };
        }
        phase = 'move';
      }
      if (phase === 'move') {
        // 車頭方向順時針為正：前進右打、倒車左打都讓它增加。
        const turnSign = (leg.steer === 'right' ? 1 : -1) * (reverse ? -1 : 1);
        const remainingDeg =
          ((((leg.untilHeadingDeg - snapshot.headingDeg) * turnSign + 180) % 360) + 360) % 360 - 180;
        if (remainingDeg > ARC_STOP_BAND_DEG) {
          const targetMph = Math.min(Math.max(remainingDeg * ARC_MPH_PER_DEG, ARC_MIN_MPH), ARC_MAX_MPH);
          return { reverse, keys: [steerKey, ...speedKeys(speedMph, targetMph)] };
        }
        if (speedMph > 0) {
          return { reverse, keys: [steerKey, BRAKE_KEY] };
        }
        phase = 'settle';
        phaseStartS = snapshot.elapsedS;
      }
      if (snapshot.elapsedS - phaseStartS < STEER_RETURN_S) {
        return { reverse, keys: [BRAKE_KEY] };
      }
      index += 1;
      phase = 'start';
    }
  };
}

/**
 * w1_l01（src/levels/w1_l01.json）：起點 (−4, 55) ft 朝北，車位中心 (21, −8) ft 在東側那一排、車位口朝西。
 * 車頭入庫：往北開到車身中心 z = 0.35（後軸在 z = 4.85 = −8 + R），右打到底轉 90° 後車身中心在 (13.35, −8) 朝東，直線開進去。
 */
export const W1_L01_HEAD_IN: readonly RouteLeg[] = [
  { kind: 'straight', axis: 'z', stopAtFt: 0.35 },
  { kind: 'arc', steer: 'right', untilHeadingDeg: 90 },
  { kind: 'straight', axis: 'x', stopAtFt: 21 },
];

/**
 * w1_l01 倒車入庫：往北開過車位，到車身中心 z = −25.35（後軸在 z = −20.85 = −8 − R），
 * 掛 R 檔右打到底倒 90°（車尾甩向東邊），車身中心在 (4.35, −8)、車頭朝西，直線倒進去。
 */
export const W1_L01_BACK_IN: readonly RouteLeg[] = [
  { kind: 'straight', axis: 'z', stopAtFt: -25.35 },
  { kind: 'arc', steer: 'right', untilHeadingDeg: 270, reverse: true },
  { kind: 'straight', axis: 'x', stopAtFt: 21, reverse: true },
];

/**
 * w1_l03（src/levels/w1_l03.json）：起點車頭朝南停在南排的車位裡 (−18, 21) ft，兩側都有車；目標是北排的空位 (27, −21) ft。
 * 整條路都掛 R 檔：直退 10.25 ft（9.5–11 ft 都可以：太短車頭會掃到西邊的鄰車，太長第二個弧會擦到目標車位旁的車），
 * 左打到底倒到車頭朝西（車身中心 (−9.65, −6.6)），沿走道直退到 x = 9.65（後軸在目標車位中線以西 R），
 * 右打到底倒到車頭朝南，直退進車位。停妥是倒車入庫，出車位時沒有碰撞（安全出車）。
 */
export const W1_L03_BACK_OUT_AND_IN: readonly RouteLeg[] = [
  { kind: 'straight', axis: 'z', stopAtFt: 10.75, reverse: true },
  { kind: 'arc', steer: 'left', untilHeadingDeg: 270, reverse: true },
  { kind: 'straight', axis: 'x', stopAtFt: 9.65, reverse: true },
  { kind: 'arc', steer: 'right', untilHeadingDeg: 180, reverse: true },
  { kind: 'straight', axis: 'z', stopAtFt: -21, reverse: true },
];

/**
 * 照路線把車開到停妥：每幀讀狀態 → 規劃 → 只對有變化的鍵送 keydown／keyup；換檔都在停住的時候。
 * 進場時必須是 D 檔（新的一局）。回傳時已停妥，所有鍵都已放開；這一局失敗、路線走完或超過時間還沒停妥就丟例外。
 */
export async function driveRoute(page: Page, legs: readonly RouteLeg[]): Promise<SessionSnapshot> {
  const plan = createRoutePlanner(legs);
  const held = new Set<RouteKey>();
  async function hold(wanted: readonly RouteKey[]): Promise<void> {
    for (const key of ROUTE_KEYS) {
      if (wanted.includes(key) && !held.has(key)) {
        await page.keyboard.down(key);
        held.add(key);
      } else if (!wanted.includes(key) && held.has(key)) {
        await page.keyboard.up(key);
        held.delete(key);
      }
    }
  }

  const deadlineMs = Date.now() + ROUTE_DEADLINE_MS;
  let reverse = false;
  let snapshot = await nextSnapshot(page);
  while (!snapshot.parked) {
    const step = plan(snapshot);
    if (step === null || snapshot.status === 'failed' || Date.now() > deadlineMs) {
      await hold([]);
      throw new Error(`沒有停妥，最後狀態：${JSON.stringify(snapshot)}`);
    }
    if (step.reverse !== reverse) {
      await page.keyboard.press(GEAR_TOGGLE_KEY);
      reverse = step.reverse;
    }
    await hold(step.keys);
    snapshot = await nextSnapshot(page);
  }
  await hold([]);
  return snapshot;
}
