// 救護車燈條：待機與警戒的週期、左右不同時亮、相位 0 是左組亮、每顆燈每秒不超過 3 次、
// 減少動態效果時恆亮、定格時相位固定。
import { describe, expect, test } from 'vitest';
import { ALARM_RULES } from '../src/core/gameConfig';
import {
  NO_ALARMS,
  lightbarMode,
  lightbarSnapshots,
  lightbarState,
  stepAlarms,
  type AlarmKind,
  type LightbarLamps,
  type LightbarMode,
} from '../src/level/alarm';

const MODES: readonly LightbarMode[] = ['idle', 'alert'];
const LAMPS = ['left', 'right', 'rear'] as const;

const PERIOD_S: Readonly<Record<LightbarMode, number>> = {
  idle: ALARM_RULES.lightbarIdlePeriodS,
  alert: ALARM_RULES.lightbarAlertPeriodS,
};

/** 一秒內某一顆燈由暗變亮的次數最多幾次（每 1 ms 取樣，滑動 1 秒的視窗）。 */
function maxFlashesPerSecond(lit: (timeS: number) => boolean, seconds: number): number {
  const rises: number[] = [];
  let previous = lit(0.0005);
  for (let ms = 1; ms <= seconds * 1000; ms += 1) {
    const now = lit((ms + 0.5) / 1000);
    if (now && !previous) {
      rises.push(ms);
    }
    previous = now;
  }
  return Math.max(
    0,
    ...rises.map((start) => rises.filter((at) => at >= start && at < start + 1000).length),
  );
}

describe('lightbarState：照常閃（flash）', () => {
  test('週期：待機 1.0 秒、警戒 0.4 秒', () => {
    expect(PERIOD_S).toEqual({ idle: 1, alert: 0.4 });
  });

  test('相位 0 是左組亮，右組與琥珀燈暗', () => {
    for (const mode of MODES) {
      const lamps = lightbarState(0, mode);
      expect([lamps.left, lamps.right, lamps.rear]).toEqual([true, false, false]);
    }
  });

  test('左右各佔半個週期，永遠只有一邊亮', () => {
    for (const mode of MODES) {
      const period = PERIOD_S[mode];
      expect(lightbarState(period * 0.25, mode).left).toBe(true);
      expect(lightbarState(period * 0.75, mode).right).toBe(true);
      expect(lightbarState(period * 1.25, mode).left).toBe(true);
      for (let ms = 0; ms < 3000; ms += 1) {
        const lamps = lightbarState((ms + 0.5) / 1000, mode);
        expect(lamps.left).not.toBe(lamps.right);
      }
    }
  });

  test('琥珀燈晚四分之一個週期：左 → 左＋琥珀 → 右＋琥珀 → 右', () => {
    for (const mode of MODES) {
      const period = PERIOD_S[mode];
      const at = (fraction: number): LightbarLamps => lightbarState(period * fraction, mode);
      expect([at(0.1).left, at(0.1).rear]).toEqual([true, false]);
      expect([at(0.4).left, at(0.4).rear]).toEqual([true, true]);
      expect([at(0.6).right, at(0.6).rear]).toEqual([true, true]);
      expect([at(0.9).right, at(0.9).rear]).toEqual([true, false]);
    }
  });

  test('每顆燈每秒由暗變亮不超過 3 次（待機 1 次、警戒 2.5 次）', () => {
    expect(ALARM_RULES.lightbarIdlePeriodS).toBeGreaterThanOrEqual(1 / 3);
    expect(ALARM_RULES.lightbarAlertPeriodS).toBeGreaterThanOrEqual(1 / 3);
    for (const lamp of LAMPS) {
      expect(maxFlashesPerSecond((timeS) => lightbarState(timeS, 'idle')[lamp], 5)).toBe(1);
      const alert = maxFlashesPerSecond((timeS) => lightbarState(timeS, 'alert')[lamp], 5);
      expect(alert).toBeGreaterThanOrEqual(2);
      expect(alert).toBeLessThanOrEqual(3);
    }
  });

  test('警戒比待機亮', () => {
    expect(lightbarState(0.1, 'idle').level).toBe(1);
    expect(lightbarState(0.1, 'alert').level).toBe(ALARM_RULES.lightbarAlertLevel);
    expect(ALARM_RULES.lightbarAlertLevel).toBeGreaterThan(1);
  });
});

describe('lightbarState：定格（frozen，`?fx=off` 與 `?cam=`）', () => {
  test('不論時間，相位固定在 0：只有左組亮', () => {
    for (const mode of MODES) {
      for (const timeS of [0, 0.3, 0.55, 0.9, 12.345, 600]) {
        const lamps = lightbarState(timeS, mode, 'frozen');
        expect([lamps.left, lamps.right, lamps.rear]).toEqual([true, false, false]);
        expect(lamps).toEqual(lightbarState(0, mode, 'frozen'));
      }
    }
  });
});

describe('lightbarState：減少動態效果（steady）', () => {
  test('三組恆亮，沒有任何一顆燈在閃', () => {
    for (const mode of MODES) {
      for (let ms = 0; ms < 5000; ms += 3) {
        const lamps = lightbarState(ms / 1000, mode, 'steady');
        expect([lamps.left, lamps.right, lamps.rear]).toEqual([true, true, true]);
      }
    }
  });

  test('待機：0.5 Hz 的緩慢明暗，亮度連續、不會掉到一半以下', () => {
    expect(ALARM_RULES.steadyPulseHz).toBe(0.5);
    const floor = 1 - ALARM_RULES.steadyPulseDepth;
    expect(floor).toBeGreaterThanOrEqual(0.5);
    let previous = lightbarState(0, 'idle', 'steady').level;
    expect(previous).toBeCloseTo(1, 9);
    for (let ms = 1; ms <= 4000; ms += 1) {
      const level = lightbarState(ms / 1000, 'idle', 'steady').level;
      expect(level).toBeGreaterThanOrEqual(floor - 1e-9);
      expect(level).toBeLessThanOrEqual(1 + 1e-9);
      // 每毫秒的變化很小：是漸變，不是閃爍。
      expect(Math.abs(level - previous)).toBeLessThan(0.001);
      previous = level;
    }
    // 一個週期 2 秒：1 秒時最暗，2 秒時回到最亮。
    expect(lightbarState(1, 'idle', 'steady').level).toBeCloseTo(floor, 9);
    expect(lightbarState(2, 'idle', 'steady').level).toBeCloseTo(1, 9);
  });

  test('警戒：只是更亮，亮度不變', () => {
    for (const timeS of [0, 0.2, 0.7, 1.9]) {
      expect(lightbarState(timeS, 'alert', 'steady').level).toBe(ALARM_RULES.lightbarAlertLevel);
    }
  });
});

describe('燈條的模式與快照', () => {
  /** 索引 0 是車、1 是錐、2 與 3 是救護車。 */
  const kinds: readonly (AlarmKind | null)[] = ['car', null, 'ambulance', 'ambulance'];

  test('平常是 idle；被撞的那一台變 alert，2.5 秒後回到 idle', () => {
    expect(lightbarMode(NO_ALARMS, 2)).toBe('idle');
    const hit = stepAlarms(NO_ALARMS, 0, [2], kinds);
    expect(lightbarMode(hit, 2)).toBe('alert');
    expect(lightbarMode(hit, 3)).toBe('idle');
    const later = stepAlarms(hit, ALARM_RULES.sirenYelpS + 0.1, [], kinds);
    expect(lightbarMode(later, 2)).toBe('idle');
  });

  test('快照只列救護車，依障礙物的順序；燈號照時鐘與各自的模式', () => {
    expect(lightbarSnapshots(NO_ALARMS, kinds, 'flash')).toEqual([
      { index: 2, mode: 'idle', left: true, right: false, rear: false },
      { index: 3, mode: 'idle', left: true, right: false, rear: false },
    ]);
    // 過了 0.7 秒：待機的在後半個週期（右＋琥珀）。
    const later = stepAlarms(NO_ALARMS, 0.7, [], kinds);
    expect(lightbarSnapshots(later, kinds, 'flash')[0]).toEqual({
      index: 2,
      mode: 'idle',
      left: false,
      right: true,
      rear: true,
    });
    // 第 3 個被撞：它用警戒的週期（0.7 秒 = 1.75 個週期，右組亮），另一台不變。
    const hit = stepAlarms(later, 0, [3], kinds);
    const snapshots = lightbarSnapshots(hit, kinds, 'flash');
    expect(snapshots.map((bar) => bar.mode)).toEqual(['idle', 'alert']);
    expect(snapshots[1]?.right).toBe(true);
  });

  test('定格：連讀兩次相位不變，時間走了也一樣', () => {
    const first = lightbarSnapshots(NO_ALARMS, kinds, 'frozen');
    const later = lightbarSnapshots(stepAlarms(NO_ALARMS, 0.77, [], kinds), kinds, 'frozen');
    expect(later).toEqual(first);
    expect(first[0]).toEqual({ index: 2, mode: 'idle', left: true, right: false, rear: false });
  });

  test('沒有救護車的關卡：空的', () => {
    expect(lightbarSnapshots(NO_ALARMS, ['car', null], 'flash')).toEqual([]);
  });
});
