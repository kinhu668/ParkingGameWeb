// 被撞的車怎麼晃（純邏輯）：幅度照撞擊車速、方向照被撞的那一面、阻尼彈簧過頭一兩次後 1–1.5 秒內停住、
// 再撞會疊加但有上限、暫停時不動。
import { describe, expect, test } from 'vitest';
import { FIXED_STEP_SECONDS } from '../src/core/gameConfig';
import { degToRad, ftToM, mphToMps } from '../src/core/units';
import { obbFromFt, vehicleObb, type Obb } from '../src/level/collision';
import {
  SWAY_RULES,
  pushDirection,
  stepSways,
  swayAmplitude,
  swayKick,
  swayPose,
  swayShare,
  swaySnapshots,
  type Sway,
  type SwayKick,
} from '../src/level/hitSway';
import type { VehicleState } from '../src/vehicle/bicycleModel';

const FULL: SwayKick = { index: 3, across: 1, along: 0 };
const SIGMA = SWAY_RULES.dampingRatio * 2 * Math.PI * SWAY_RULES.frequencyHz;

function box(xFt: number, zFt: number, widthFt: number, lengthFt: number, headingDeg = 0): Obb {
  return obbFromFt({ centerXFt: xFt, centerZFt: zFt, widthFt, lengthFt, headingDeg });
}

function vehicleAt(xFt: number, zFt: number, headingDeg: number, speedMph: number): VehicleState {
  return {
    x: ftToM(xFt),
    z: ftToM(zFt),
    headingRad: degToRad(headingDeg),
    speedMps: mphToMps(speedMph),
    steerRad: 0,
  };
}

/** 一推之後每 1/600 秒記一次，直到停住（或 seconds 秒）。回傳每一刻的狀態（停住之後是 undefined）。 */
function trace(kicks: readonly SwayKick[], seconds = 3, dtS = 1 / 600): (Sway | undefined)[] {
  let sways = stepSways([], 0, kicks);
  const samples: (Sway | undefined)[] = [sways[0]];
  for (let step = 0; step < Math.round(seconds / dtS); step += 1) {
    sways = stepSways(sways, dtS, []);
    samples.push(sways[0]);
  }
  return samples;
}

/** 位移的各個高點與低點（依時間）：[秒, 位移]。 */
function extrema(samples: readonly (Sway | undefined)[], dtS = 1 / 600): [number, number][] {
  const found: [number, number][] = [];
  for (let at = 1; at < samples.length - 1; at += 1) {
    const [before, here, after] = [samples[at - 1], samples[at], samples[at + 1]];
    if (before === undefined || here === undefined || after === undefined) {
      break;
    }
    if ((here.across - before.across) * (after.across - here.across) < 0) {
      found.push([at * dtS, here.across]);
    }
  }
  return found;
}

describe('撞擊車速 → 晃幾成', () => {
  test('幾乎沒有速度是 0.15，6 mph 以上是滿格，中間線性；倒車（負的車速）一樣', () => {
    expect(swayShare(0)).toBeCloseTo(0.15, 9);
    expect(swayShare(mphToMps(1))).toBeCloseTo(0.15 + 0.85 / 6, 9);
    expect(swayShare(mphToMps(3))).toBeCloseTo(0.575, 9);
    expect(swayShare(mphToMps(6))).toBeCloseTo(1, 9);
    expect(swayShare(mphToMps(20))).toBe(1);
    expect(swayShare(mphToMps(-3))).toBeCloseTo(0.575, 9);
  });
});

describe('阻尼彈簧', () => {
  test('滿格的一推：第一個高點剛好是 1，大約在 0.12 秒', () => {
    const [[atS, peak] = [0, 0]] = extrema(trace([FULL]));
    expect(peak).toBeCloseTo(1, 3);
    expect(atS).toBeGreaterThan(0.1);
    expect(atS).toBeLessThan(0.14);
  });

  test('晃回來會過頭：高低點正負交替，每一次剩前一次的四成左右；看得出來的過頭是一到兩次', () => {
    const peaks = extrema(trace([FULL])).map(([, value]) => value);
    expect(peaks.length).toBeGreaterThanOrEqual(4);
    peaks.slice(1).forEach((value, index) => {
      const previous = peaks[index] ?? 0;
      expect(Math.sign(value)).toBe(-Math.sign(previous));
      expect(Math.abs(value / previous)).toBeGreaterThan(0.35);
      expect(Math.abs(value / previous)).toBeLessThan(0.45);
    });
    const visible = peaks.slice(1).filter((value) => Math.abs(value) > 0.1);
    expect(visible.length).toBeGreaterThanOrEqual(1);
    expect(visible.length).toBeLessThanOrEqual(2);
  });

  test('幅度（包絡）照 e^(−σt) 衰減，不隨擺動的相位起伏', () => {
    const samples = trace([FULL], 1);
    expect(swayAmplitude(samples[0] as Sway)).toBeCloseTo(1, 9);
    for (const at of [60, 150, 333, 600]) {
      expect(swayAmplitude(samples[at] as Sway)).toBeCloseTo(Math.exp((-SIGMA * at) / 600), 9);
    }
  });

  test('滿格的一推在 1–1.5 秒之間停住；輕輕一碰（1 mph）停得更早；停住之後清單是空的', () => {
    const settledAt = (kick: SwayKick): number => trace([kick]).findIndex((sway) => sway === undefined) / 600;
    expect(settledAt(FULL)).toBeGreaterThan(1);
    expect(settledAt(FULL)).toBeLessThan(1.5);
    const tap = settledAt({ index: 3, across: swayShare(mphToMps(1)), along: 0 });
    expect(tap).toBeGreaterThan(0.6);
    expect(tap).toBeLessThan(1.2);
    expect(stepSways(stepSways([], 0, [FULL]), 2, [])).toEqual([]);
  });

  test('一幀多長、切成幾步，結果都一樣', () => {
    const start = stepSways([], 0, [{ index: 0, across: 0.6, along: -0.3 }]);
    const once = stepSways(start, 0.5, [])[0] as Sway;
    let stepped = start;
    for (let step = 0; step < 30; step += 1) {
      stepped = stepSways(stepped, 0.5 / 30, []);
    }
    const many = stepped[0] as Sway;
    for (const key of ['across', 'along', 'acrossRate', 'alongRate'] as const) {
      expect(many[key]).toBeCloseTo(once[key], 9);
    }
  });

  test('暫停（dtS = 0）：狀態完全不變，也不會被當成停住', () => {
    const moving = stepSways(stepSways([], 0, [FULL]), 0.2, []);
    expect(stepSways(moving, 0, [])).toEqual(moving);
    const nearlyDone = stepSways(moving, 0.9, []);
    expect(nearlyDone).toHaveLength(1);
    expect(stepSways(nearlyDone, 0, [])).toEqual(nearlyDone);
  });

  test('沒有車在晃、也沒有新的一撞：回傳同一個陣列（不配置新的）', () => {
    const none: readonly Sway[] = [];
    expect(stepSways(none, FIXED_STEP_SECONDS, [])).toBe(none);
  });
});

describe('幅度與方向', () => {
  test('高點與那一推成正比；方向就是那一推的方向（橫向與縱向各自獨立）', () => {
    const half = extrema(trace([{ index: 0, across: 0.5, along: 0 }]))[0]?.[1] ?? 0;
    expect(half).toBeCloseTo(0.5, 3);
    const left = extrema(trace([{ index: 0, across: -1, along: 0 }]))[0]?.[1] ?? 0;
    expect(left).toBeCloseTo(-1, 3);
    // 斜的一推：兩個方向同相，比例不變。
    const samples = trace([{ index: 0, across: 0.6, along: -0.8 }], 0.3);
    for (const sway of samples.slice(1)) {
      expect((sway?.along ?? 0) / (sway?.across ?? 1)).toBeCloseTo(-0.8 / 0.6, 6);
    }
  });

  test('姿勢：滿格往右推的高點是側傾 4°、往右推開 3 英寸；往前推是俯仰 2°', () => {
    const pose = swayPose({ index: 0, across: 1, along: 1, acrossRate: 0, alongRate: 0 });
    expect(pose.leanAcrossRad).toBeCloseTo(degToRad(4), 9);
    expect(pose.leanAlongRad).toBeCloseTo(degToRad(2), 9);
    expect(pose.shoveAcrossM).toBeCloseTo(ftToM(0.25), 9);
    expect(pose.shoveAlongM).toBeCloseTo(ftToM(0.25), 9);
    const other = swayPose({ index: 0, across: -0.5, along: 0, acrossRate: 0, alongRate: 0 });
    expect(other.leanAcrossRad).toBeCloseTo(-degToRad(2), 9);
    expect(other.shoveAcrossM).toBeCloseTo(-ftToM(0.125), 9);
    expect(other.leanAlongRad).toBeCloseTo(0, 9);
  });

  test('快照：索引與幅度', () => {
    const sways = stepSways([], 0, [FULL, { index: 7, across: 0, along: 0.5 }]);
    expect(swaySnapshots(sways)).toEqual([
      { index: 3, amplitude: expect.closeTo(1, 9) as number },
      { index: 7, amplitude: expect.closeTo(0.5, 9) as number },
    ]);
  });
});

describe('再撞一次', () => {
  test('還在晃的時候同方向再推：比單獨一推晃得大一點，但不會失控', () => {
    let sways = stepSways(stepSways([], 0, [FULL]), 0.5, []);
    sways = stepSways(sways, 0, [FULL]);
    expect(sways).toHaveLength(1);
    let peak = 0;
    for (let step = 0; step < 600; step += 1) {
      sways = stepSways(sways, 1 / 600, []);
      peak = Math.max(peak, Math.abs(sways[0]?.across ?? 0));
    }
    expect(peak).toBeGreaterThan(0.85);
    expect(peak).toBeLessThan(1.3);
  });

  test('同一刻推很多次：速度不超過滿格一推的初速，高點還是 1 左右', () => {
    const many = Array.from({ length: 10 }, () => FULL);
    const peak = Math.max(...trace(many).map((sway) => Math.abs(sway?.across ?? 0)));
    expect(peak).toBeCloseTo(1, 3);
  });

  test('反方向的一推會抵掉一些；別台車不受影響', () => {
    const [first] = stepSways([], 0, [FULL]);
    const both = stepSways([first as Sway], 0, [{ index: 3, across: -0.4, along: 0 }, { index: 9, across: 0, along: 1 }]);
    expect(both.map((sway) => sway.index)).toEqual([3, 9]);
    expect(swayAmplitude(both[0] as Sway)).toBeCloseTo(0.6, 9);
    expect(swayAmplitude(both[1] as Sway)).toBeCloseTo(1, 9);
  });
});

describe('往哪個方向推', () => {
  // 被撞的車在原點、車頭朝北（−Z）：右邊是 +X。
  const struck = box(0, 0, 6, 15);

  test('從西邊直直撞上它的側面：往東（它的右邊）推，沒有縱向', () => {
    // 玩家車頭朝東，車頭前緣剛碰到它的左側面（x = −3）。
    const kick = swayKick(4, vehicleAt(-10.6, 0, 90, 6), struck, 1);
    expect(kick.index).toBe(4);
    expect(kick.across).toBeCloseTo(1, 6);
    expect(kick.along).toBeCloseTo(0, 6);
    // 倒車撞上去（車尾朝東）方向一樣；速度 3 mph 是 0.575 成。
    const reversing = swayKick(4, vehicleAt(-10.6, 0, 270, -3), struck, 1);
    expect(reversing.across).toBeCloseTo(0.575, 6);
    expect(reversing.along).toBeCloseTo(0, 6);
  });

  test('從後面追撞：往它的車頭方向推；從前面撞：往車尾方向推', () => {
    expect(swayKick(0, vehicleAt(0, 15.1, 0, 6), struck, 1).along).toBeCloseTo(1, 6);
    expect(swayKick(0, vehicleAt(0, -15.1, 180, 6), struck, 1).along).toBeCloseTo(-1, 6);
    expect(swayKick(0, vehicleAt(0, 15.1, 0, 6), struck, 1).across).toBeCloseTo(0, 6);
  });

  test('擦撞：兩台平行，玩家沿著它的側面往前開，推的方向是側面的法線而不是行進方向', () => {
    // 玩家在它的西側（左邊）、車頭朝北，兩台車的側面剛好貼著。
    const kick = swayKick(0, vehicleAt(-6.05, 4, 0, 6), struck, 1);
    expect(kick.across).toBeCloseTo(1, 6);
    expect(kick.along).toBeCloseTo(0, 6);
  });

  test('被撞的車朝別的方向：同一推換到它自己的左右與前後', () => {
    // 車頭朝東（+X）的車，被從西邊（它的車尾）撞：往它的車頭方向推。
    const eastbound = box(0, 0, 6, 15, 90);
    const kick = swayKick(0, vehicleAt(-15.1, 0, 90, 6), eastbound, 1);
    expect(kick.along).toBeCloseTo(1, 6);
    expect(kick.across).toBeCloseTo(0, 6);
  });

  test('比例：減少動態效果時整個縮小；0 就是完全不推', () => {
    const reduced = swayKick(0, vehicleAt(-10.6, 0, 90, 6), struck, SWAY_RULES.reducedMotionScale);
    expect(reduced.across).toBeCloseTo(0.3, 6);
    expect(Math.hypot(swayKick(0, vehicleAt(-10.6, 0, 90, 6), struck, 0).across)).toBe(0);
  });

  test('pushDirection：單位向量，從撞的指向被撞的', () => {
    const push = pushDirection(vehicleObb(vehicleAt(-10.4, 0, 90, 0)), struck);
    expect(push.x).toBeCloseTo(1, 9);
    expect(push.z).toBeCloseTo(0, 9);
    const angled = pushDirection(vehicleObb(vehicleAt(-9, 9, 45, 0)), struck);
    expect(Math.hypot(angled.x, angled.z)).toBeCloseTo(1, 9);
  });
});
