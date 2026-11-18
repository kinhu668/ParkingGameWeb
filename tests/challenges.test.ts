// 過關挑戰：六種規則、門檻邊界、每關的「N 秒內」門檻與官方路線實測。
import { describe, expect, test } from 'vitest';
import { PHYSICS_HZ } from '../src/core/gameConfig';
import { forward, right } from '../src/core/heading';
import { degToRad, ftToM } from '../src/core/units';
import { runRoute } from '../src/level/autoDriver';
import { obbFromFt } from '../src/level/collision';
import {
  CENTERED_MAX_OFFSET_FT,
  CHALLENGE_IDS,
  challengeTimeS,
  challengesForLayout,
  earnedChallenges,
  sessionChallenges,
  type ChallengeInput,
} from '../src/level/challenges';
import { LEVELS, levelById } from '../src/level/levelCatalog';
import { routeForLevel } from '../src/level/levelRoutes';
import type { LevelDefinition } from '../src/level/levelSchema';
import { parkingSpotFromFt, type ParkingSpot } from '../src/level/parkingJudge';
import { secondsToSteps } from '../src/level/scoring';
import { startSession, stepSession, type Session } from '../src/level/session';
import { IDLE, inputsToStopAtSpotCenter } from './driveHelpers';

/** 測試用的「N 秒內」門檻。 */
const TIME_S = 14;

/** 一般車位：方向朝東（90°），車頭入庫也是朝東。故意不放在原點。 */
const BAY: ParkingSpot = parkingSpotFromFt({
  centerXFt: 20,
  centerZFt: -10,
  widthFt: 9,
  lengthFt: 18,
  headingDeg: 90,
  headInHeadingDeg: 90,
});

/** 路邊平行停車：同一個位置，只接受朝東。 */
const PARALLEL: ParkingSpot = { ...BAY, headInHeadingRad: null };

/** 車在車位本地座標的偏移（ft）與車頭方向（度）。 */
function carAt(spot: ParkingSpot, headingDeg: number, lateralFt = 0, longitudinalFt = 0) {
  const spotRight = right(spot.headingRad);
  const spotForward = forward(spot.headingRad);
  return {
    x: spot.x + spotRight.x * ftToM(lateralFt) + spotForward.x * ftToM(longitudinalFt),
    z: spot.z + spotRight.z * ftToM(lateralFt) + spotForward.z * ftToM(longitudinalFt),
    headingRad: degToRad(headingDeg),
  };
}

/** 一局完美的車頭入庫：置中、0 碰撞、10 秒。 */
function perfect(changes: Partial<ChallengeInput> = {}): ChallengeInput {
  return {
    spot: BAY,
    vehicle: carAt(BAY, 90),
    timeSteps: secondsToSteps(10),
    collisions: 0,
    challengeTimeS: TIME_S,
    exitCollisions: 0,
    ...changes,
  };
}

/** 起始車位（「安全出車」的關卡才有）：位置不重要，只看有沒有。 */
const START_STALL = obbFromFt({ centerXFt: -30, centerZFt: 40, widthFt: 9, lengthFt: 18, headingDeg: 0 });

describe('每個車位有哪些挑戰', () => {
  test('挑戰 id 與顯示順序', () => {
    expect(CHALLENGE_IDS).toEqual(['time', 'no_collisions', 'centered', 'head_in', 'back_in', 'clean_exit']);
  });

  test('一般車位五項；路邊平行停車只有三項共通的，沒有車頭入庫／倒車入庫', () => {
    expect(challengesForLayout({ spot: BAY })).toEqual(['time', 'no_collisions', 'centered', 'head_in', 'back_in']);
    expect(challengesForLayout({ spot: PARALLEL })).toEqual(['time', 'no_collisions', 'centered']);
  });

  test('起點停在車位裡的關卡多一項「安全出車」，排在最後', () => {
    expect(challengesForLayout({ spot: BAY, startStall: START_STALL })).toEqual(CHALLENGE_IDS);
    expect(challengesForLayout({ spot: PARALLEL, startStall: START_STALL })).toEqual([
      'time',
      'no_collisions',
      'centered',
      'clean_exit',
    ]);
  });

  test.each(LEVELS.map((level) => [level.id, level] as const))('%s 的清單', (_id, level) => {
    const list = challengesForLayout(level.layout);
    const parallel = level.parking === 'parallel';
    const parkedStart = level.startStallFt !== undefined;
    expect(list).toHaveLength(3 + (parallel ? 0 : 2) + (parkedStart ? 1 : 0));
    expect(list.includes('head_in')).toBe(!parallel);
    expect(list.includes('back_in')).toBe(!parallel);
    expect(list.includes('clean_exit')).toBe(parkedStart);
  });
});

describe('安全出車', () => {
  test('有起始車位、離開前零碰撞：拿到；離開前撞過：沒有（之後才撞的不影響）', () => {
    expect(earnedChallenges(perfect({ startStall: START_STALL }))).toContain('clean_exit');
    expect(earnedChallenges(perfect({ startStall: START_STALL, exitCollisions: 1 }))).not.toContain('clean_exit');
    // 出車乾淨、後面撞了兩次：零碰撞沒了，安全出車還在。
    const later = earnedChallenges(perfect({ startStall: START_STALL, collisions: 2 }));
    expect(later).toContain('clean_exit');
    expect(later).not.toContain('no_collisions');
  });

  test('起點不在車位裡的關卡沒有這一項（零碰撞也不會拿到）', () => {
    expect(earnedChallenges(perfect())).not.toContain('clean_exit');
  });
});

describe('earnedChallenges：五種規則', () => {
  test('完美的車頭入庫：倒車入庫以外都有，依顯示順序', () => {
    expect(earnedChallenges(perfect())).toEqual(['time', 'no_collisions', 'centered', 'head_in']);
  });

  test('N 秒內：剛好 N 秒算過，多一步就不算', () => {
    const limitSteps = secondsToSteps(TIME_S);
    expect(earnedChallenges(perfect({ timeSteps: limitSteps }))).toContain('time');
    expect(earnedChallenges(perfect({ timeSteps: limitSteps + 1 }))).not.toContain('time');
    expect(earnedChallenges(perfect({ timeSteps: limitSteps - 1 }))).toContain('time');
  });

  test('零碰撞：一次都不能有；逾時仍可以拿到', () => {
    expect(earnedChallenges(perfect({ collisions: 1 }))).not.toContain('no_collisions');
    expect(earnedChallenges(perfect({ timeSteps: secondsToSteps(60) }))).toEqual([
      'no_collisions',
      'centered',
      'head_in',
    ]);
  });

  test('停正置中：橫向、縱向各自剛好 0.5 ft 算過，0.51 ft 不算', () => {
    expect(CENTERED_MAX_OFFSET_FT).toBe(0.5);
    for (const sign of [1, -1]) {
      for (const [lateralFt, longitudinalFt, centered] of [
        [0.5, 0, true],
        [0, 0.5, true],
        [0.5, 0.5, true],
        [0.51, 0, false],
        [0, 0.51, false],
        [0.51, 0.51, false],
      ] as const) {
        const vehicle = carAt(BAY, 90, sign * lateralFt, sign * longitudinalFt);
        expect(earnedChallenges(perfect({ vehicle })).includes('centered')).toBe(centered);
      }
    }
  });

  test('停正置中看車位本地座標：斜向車位沿自己的軸量', () => {
    const angled = parkingSpotFromFt({
      centerXFt: 5,
      centerZFt: 7,
      widthFt: 9,
      lengthFt: 18,
      headingDeg: 30,
      headInHeadingDeg: 30,
    });
    // 沿車位兩軸各偏 0.4 ft：對角線距離 0.57 ft，仍算置中；單一軸偏 0.6 ft 不算。
    expect(earnedChallenges(perfect({ spot: angled, vehicle: carAt(angled, 30, 0.4, 0.4) }))).toContain(
      'centered',
    );
    expect(
      earnedChallenges(perfect({ spot: angled, vehicle: carAt(angled, 30, 0.6, 0) })),
    ).not.toContain('centered');
  });

  test('車頭入庫與倒車入庫看停妥的車頭朝向，同一局只有一個', () => {
    for (const headingDeg of [90, 82, 98]) {
      const earned = earnedChallenges(perfect({ vehicle: carAt(BAY, headingDeg) }));
      expect(earned).toContain('head_in');
      expect(earned).not.toContain('back_in');
    }
    for (const headingDeg of [270, 262, 278]) {
      const earned = earnedChallenges(perfect({ vehicle: carAt(BAY, headingDeg) }));
      expect(earned).toContain('back_in');
      expect(earned).not.toContain('head_in');
    }
  });

  test('head_in_heading 是車位方向的反向時（倒車才對得上車位方向的關）：朝車位方向 = 倒車入庫', () => {
    const backInBay: ParkingSpot = { ...BAY, headInHeadingRad: degToRad(270) };
    expect(earnedChallenges(perfect({ spot: backInBay, vehicle: carAt(backInBay, 90) }))).toContain(
      'back_in',
    );
    expect(earnedChallenges(perfect({ spot: backInBay, vehicle: carAt(backInBay, 270) }))).toContain(
      'head_in',
    );
  });

  test('路邊平行停車：完美的一局也只有三項', () => {
    expect(earnedChallenges(perfect({ spot: PARALLEL, vehicle: carAt(PARALLEL, 90) }))).toEqual([
      'time',
      'no_collisions',
      'centered',
    ]);
  });

  test('什麼都沒拿到：逾時、有碰撞、沒置中的平行停車', () => {
    expect(
      earnedChallenges({
        spot: PARALLEL,
        vehicle: carAt(PARALLEL, 90, 0, 2),
        timeSteps: secondsToSteps(TIME_S) + 1,
        collisions: 2,
        challengeTimeS: TIME_S,
        exitCollisions: 0,
      }),
    ).toEqual([]);
  });
});

describe('sessionChallenges：結算畫面與存檔共用', () => {
  const level = levelById('w1_l01');
  if (level === undefined) {
    throw new Error('w1_l01 不在目錄裡');
  }
  const route = routeForLevel(level.id);
  if (route === undefined) {
    throw new Error('w1_l01 沒有參考路線');
  }

  test('還沒停妥（剛開局、開到一半）→ 空的', () => {
    expect(sessionChallenges(startSession(level.layout), 11)).toEqual([]);
    const driving = runRoute(level.layout, route, { maxSteps: PHYSICS_HZ });
    expect(driving.status).toBe('driving');
    expect(sessionChallenges(driving, 11)).toEqual([]);
  });

  test('停妥：用那一局的成績時間、碰撞與車姿', () => {
    const parked = runRoute(level.layout, route, { maxSteps: 60 * PHYSICS_HZ });
    expect(parked.status).toBe('parked');
    expect(sessionChallenges(parked, 11)).toEqual(['time', 'no_collisions', 'centered', 'head_in']);
    // 門檻比這一局的時間緊就沒有「N 秒內」。
    expect(sessionChallenges(parked, 3)).toEqual(['no_collisions', 'centered', 'head_in']);
  });
});

describe('每關的「N 秒內」門檻', () => {
  /** 關卡 id → N（秒）。改門檻要同時改這張表與進度檔的門檻表。 */
  const EXPECTED: ReadonlyArray<readonly [string, number]> = [
    ['prototype', 21],
    ['w1_l01', 13],
    ['w1_l02', 24],
    ['w1_l03', 25],
    ['w1_l04', 27],
    ['w1_l05', 17],
    ['w1_l06', 29],
    ['w1_l07', 36],
    ['w1_l08', 35],
    ['w1_l09', 28],
    ['w1_l10', 35],
  ];

  /** 官方路線跑到停妥；原型關沒有路線，直線開進去。 */
  function driveOfficial(level: LevelDefinition): Session {
    const route = routeForLevel(level.id);
    if (route !== undefined) {
      return runRoute(level.layout, route, { maxSteps: Math.round(level.timeLimitS * PHYSICS_HZ) });
    }
    const { startState, spot } = level.layout;
    let session = startSession(level.layout);
    for (const input of inputsToStopAtSpotCenter(startState, spot, 1)) {
      session = stepSession(session, input);
    }
    for (let step = 0; step < 2 * PHYSICS_HZ; step += 1) {
      session = stepSession(session, IDLE);
    }
    return session;
  }

  test('表涵蓋目錄裡的每一關；不在目錄裡的 id 丟錯', () => {
    expect(EXPECTED.map(([id]) => id)).toEqual(LEVELS.map((level) => level.id));
    expect(() => challengeTimeS('nope')).toThrow(/nope/);
  });

  test.each(EXPECTED)('%s：N = %d 秒 = round(0.70 × 目標時間)，比 2 星的目標時間緊', (id, seconds) => {
    const level = levelById(id);
    expect(challengeTimeS(id)).toBe(seconds);
    expect(seconds).toBe(Math.round(0.7 * (level?.targetTimeS ?? NaN)));
    expect(seconds).toBeLessThan(level?.targetTimeS ?? NaN);
  });

  test.each(EXPECTED)('%s：官方路線（含判定的 1 秒）在 N 秒內停妥，拿得到「N 秒內」與「零碰撞」', (id, seconds) => {
    const level = levelById(id);
    if (level === undefined) {
      throw new Error(`${id} 不在目錄裡`);
    }
    const session = driveOfficial(level);
    expect(session.status).toBe('parked');
    expect(session.result?.timeSteps).toBeLessThanOrEqual(secondsToSteps(seconds));
    const earned = earnedChallenges({
      spot: level.layout.spot,
      vehicle: session.vehicle,
      timeSteps: session.result?.timeSteps ?? Infinity,
      collisions: session.collisions,
      challengeTimeS: seconds,
      ...(level.layout.startStall === undefined ? {} : { startStall: level.layout.startStall }),
      exitCollisions: session.exitCollisions,
    });
    expect(earned.includes('clean_exit')).toBe(level.startStallFt !== undefined);
    expect(earned).toContain('time');
    expect(earned).toContain('no_collisions');
    // 一般車位的官方路線停在中心 0.2 ft 內，置中也拿得到；車頭／倒車入庫剛好拿到其中一個。
    if (level.parking === 'bay') {
      expect(earned).toContain('centered');
      expect(earned.filter((challenge) => challenge === 'head_in' || challenge === 'back_in')).toHaveLength(1);
    }
  });
});
