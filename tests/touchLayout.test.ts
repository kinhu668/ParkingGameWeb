// 觸控層的版面：每種手機／平板畫面大小下，七個控制項都在畫面內、夠大、互不重疊，而且不壓到倒車輔助的四個小窗。
import { describe, expect, test } from 'vitest';
import { ASSIST_VIEW_IDS, assistLayout, type Rect } from '../src/core/assistLayout';
import { TOUCH_CONTROL_IDS, touchLayout } from '../src/core/touchLayout';

/** 常見的畫面大小（CSS 像素）：手機橫向、手機直向、平板、桌機。 */
const LANDSCAPE: readonly (readonly [number, number])[] = [
  [667, 375],
  [740, 360],
  [844, 390],
  [932, 430],
  [1024, 768],
  [1280, 720],
  [1920, 1080],
];
const PORTRAIT: readonly (readonly [number, number])[] = [
  [360, 740],
  [375, 667],
  [390, 844],
  [430, 932],
];
const ALL_SIZES = [...LANDSCAPE, ...PORTRAIT, [768, 1024] as const];

/** 手指點得到的最小邊長。 */
const MIN_TAP_PX = 44;

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

describe('touchLayout', () => {
  test.each(ALL_SIZES)('%i×%i：都在畫面內、整數像素、夠大', (width, height) => {
    const layout = touchLayout(width, height);
    for (const id of TOUCH_CONTROL_IDS) {
      const rect = layout[id];
      for (const value of [rect.x, rect.y, rect.width, rect.height]) {
        expect(Number.isInteger(value)).toBe(true);
      }
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width);
      expect(rect.y + rect.height).toBeLessThanOrEqual(height);
      expect(rect.width).toBeGreaterThanOrEqual(MIN_TAP_PX);
      expect(rect.height).toBeGreaterThanOrEqual(MIN_TAP_PX);
    }
    // 方向盤是正圓，而且大到拖得動。
    expect(layout.wheel.width).toBe(layout.wheel.height);
    expect(layout.wheel.width).toBeGreaterThanOrEqual(120);
  });

  test.each(ALL_SIZES)('%i×%i：控制項互不重疊', (width, height) => {
    const layout = touchLayout(width, height);
    TOUCH_CONTROL_IDS.forEach((a, index) => {
      for (const b of TOUCH_CONTROL_IDS.slice(index + 1)) {
        expect(overlaps(layout[a], layout[b]), `${a} 與 ${b}`).toBe(false);
      }
    });
  });

  test.each(ALL_SIZES)('%i×%i：不壓到倒車輔助的四個小窗', (width, height) => {
    const layout = touchLayout(width, height);
    const assist = assistLayout(width, height);
    for (const id of TOUCH_CONTROL_IDS) {
      for (const view of ASSIST_VIEW_IDS) {
        expect(overlaps(layout[id], assist[view]), `${id} 與 ${view}`).toBe(false);
      }
    }
  });

  test.each(ALL_SIZES)('%i×%i：方向盤在左、踏板在右，剎車在油門左邊', (width, height) => {
    const { wheel, brake, gas } = touchLayout(width, height);
    expect(wheel.x + wheel.width).toBeLessThan(brake.x);
    expect(brake.x + brake.width).toBeLessThan(gas.x);
    expect(wheel.x + wheel.width / 2).toBeLessThan(width / 2);
    expect(brake.x + brake.width / 2).toBeGreaterThan(width / 2);
    // 貼著下緣。
    expect(wheel.y + wheel.height).toBe(gas.y + gas.height);
    expect(height - (wheel.y + wheel.height)).toBeLessThanOrEqual(24);
  });

  test.each(LANDSCAPE)('橫向 %i×%i：一排；畫面正中央（車的位置）沒有控制項', (width, height) => {
    const layout = touchLayout(width, height);
    // 掛檔在剎車左邊、D 在 R 上面；暫停／重來在方向盤與掛檔之間。
    expect(layout.gearDrive.x + layout.gearDrive.width).toBeLessThan(layout.brake.x);
    expect(layout.gearDrive.y + layout.gearDrive.height).toBeLessThan(layout.gearReverse.y);
    expect(layout.pause.x).toBeGreaterThan(layout.wheel.x + layout.wheel.width);
    expect(layout.restart.x + layout.restart.width).toBeLessThan(layout.gearDrive.x);
    const center: Rect = { x: width / 2 - 40, y: height / 2 - 20, width: 80, height: 40 };
    for (const id of TOUCH_CONTROL_IDS) {
      expect(overlaps(layout[id], center), id).toBe(false);
    }
  });

  test.each(PORTRAIT)('直向 %i×%i：小鍵在方向盤與踏板的上面一排，下半部以外留給車', (width, height) => {
    const layout = touchLayout(width, height);
    for (const id of ['pause', 'restart', 'gearDrive', 'gearReverse'] as const) {
      expect(layout[id].y + layout[id].height).toBeLessThan(layout.wheel.y);
      expect(layout[id].y).toBe(layout.pause.y);
    }
    expect(layout.pause.x).toBeLessThan(layout.restart.x);
    expect(layout.restart.x + layout.restart.width).toBeLessThan(layout.gearDrive.x);
    expect(layout.gearDrive.x).toBeLessThan(layout.gearReverse.x);
    // 控制項只佔畫面下面不到 35%。
    expect(layout.pause.y).toBeGreaterThan(height * 0.65);
  });
});

describe('assistLayout 在很窄的畫面', () => {
  test('手機直向：上排往下讓給兩排的行車資訊，四個小窗仍在畫面內、互不重疊', () => {
    for (const [width, height] of PORTRAIT) {
      const assist = assistLayout(width, height);
      expect(assist.bird.y).toBe(138);
      expect(assist.rear.y).toBe(138);
      ASSIST_VIEW_IDS.forEach((a, index) => {
        expect(assist[a].x).toBeGreaterThanOrEqual(0);
        expect(assist[a].x + assist[a].width).toBeLessThanOrEqual(width);
        expect(assist[a].y + assist[a].height).toBeLessThanOrEqual(height);
        for (const b of ASSIST_VIEW_IDS.slice(index + 1)) {
          expect(overlaps(assist[a], assist[b]), `${a} 與 ${b}`).toBe(false);
        }
      });
    }
  });

  test('比較寬的畫面（手機橫向、桌機）上排位置不變', () => {
    for (const [width, height] of LANDSCAPE) {
      expect(assistLayout(width, height).bird.y).toBe(92);
    }
  });
});
