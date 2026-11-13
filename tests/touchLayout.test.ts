// 螢幕操作層的版面：每種手機／平板／桌面畫面大小下，七個控制項（含切換檔位、切換鏡頭）都在畫面內、夠大、互不重疊，
// 而且不壓到倒車輔助的四個小窗；手機上的輔助小窗明顯比桌面的算法小。
import { describe, expect, test } from 'vitest';
import {
  ASSIST_VIEW_ASPECT,
  ASSIST_VIEW_IDS,
  assistLayout,
  assistViewScale,
  isPhoneViewport,
  type Rect,
} from '../src/core/assistLayout';
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
    // 切換檔位只有一顆，在剎車左邊、貼著下緣，不比踏板高；暫停／重來在方向盤與它之間。
    expect(layout.gear.x + layout.gear.width).toBeLessThan(layout.brake.x);
    expect(layout.gear.y + layout.gear.height).toBe(layout.brake.y + layout.brake.height);
    expect(layout.gear.y).toBeGreaterThanOrEqual(layout.brake.y);
    expect(layout.pause.x).toBeGreaterThan(layout.wheel.x + layout.wheel.width);
    expect(layout.restart.x + layout.restart.width).toBeLessThan(layout.gear.x);
    // 鏡頭鍵排在暫停、重來的右邊，同一排、同樣大小，仍在切換檔位的左邊。
    expect(layout.camera.y).toBe(layout.pause.y);
    expect(layout.camera.x).toBeGreaterThan(layout.restart.x + layout.restart.width);
    expect(layout.camera.x + layout.camera.width).toBeLessThan(layout.gear.x);
    expect(layout.camera.width).toBe(layout.pause.width);
    const center: Rect = { x: width / 2 - 40, y: height / 2 - 20, width: 80, height: 40 };
    for (const id of TOUCH_CONTROL_IDS) {
      expect(overlaps(layout[id], center), id).toBe(false);
    }
  });

  test.each(PORTRAIT)('直向 %i×%i：小鍵在方向盤與踏板的上面一排，下半部以外留給車', (width, height) => {
    const layout = touchLayout(width, height);
    for (const id of ['pause', 'restart', 'camera', 'gear'] as const) {
      expect(layout[id].y + layout[id].height).toBeLessThan(layout.wheel.y);
      expect(layout[id].y).toBe(layout.pause.y);
    }
    expect(layout.pause.x).toBeLessThan(layout.restart.x);
    expect(layout.restart.x + layout.restart.width).toBeLessThan(layout.camera.x);
    // 切換檔位貼右，在踏板正上方。
    expect(layout.camera.x + layout.camera.width).toBeLessThan(layout.gear.x);
    expect(layout.gear.x + layout.gear.width).toBe(layout.gas.x + layout.gas.width);
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

describe('切換檔位鍵', () => {
  test('只有一顆（沒有分開的掛 D、掛 R）', () => {
    expect(TOUCH_CONTROL_IDS.filter((id) => id.startsWith('gear'))).toEqual(['gear']);
  });
});

describe('切換鏡頭鍵', () => {
  test('排進了版面，而且每種畫面大小都不與輔助小窗相交', () => {
    expect(TOUCH_CONTROL_IDS).toContain('camera');
    expect(TOUCH_CONTROL_IDS).toHaveLength(7);
    for (const [width, height] of ALL_SIZES) {
      const { camera } = touchLayout(width, height);
      const assist = assistLayout(width, height);
      expect(camera.width, `${width}×${height}`).toBeGreaterThanOrEqual(MIN_TAP_PX);
      expect(camera.height, `${width}×${height}`).toBeGreaterThanOrEqual(MIN_TAP_PX);
      for (const view of ASSIST_VIEW_IDS) {
        expect(overlaps(camera, assist[view]), `${width}×${height} ${view}`).toBe(false);
      }
    }
  });
});

/** 上一版（縮小之前）的小窗大小：上排高 = 畫面高 × 0.27（90–230），後視鏡寬 = 畫面寬 × 0.17（100–250），都受畫面寬度限制。 */
function previousAssistSize(width: number, height: number): { rowHeight: number; mirrorWidth: number } {
  const usable = width - 2 * 16;
  const rowAspect = ASSIST_VIEW_ASPECT.bird + ASSIST_VIEW_ASPECT.rear;
  return {
    rowHeight: Math.floor(Math.min(Math.min(Math.max(height * 0.27, 90), 230), (usable - 10) / rowAspect)),
    mirrorWidth: Math.round(Math.min(Math.min(Math.max(width * 0.17, 100), 250), (usable - 10) / 2)),
  };
}

describe('手機上的輔助小窗比較小', () => {
  const PHONES: readonly (readonly [number, number])[] = [
    [844, 390],
    [390, 844],
    [667, 375],
    [932, 430],
    [360, 740],
    [430, 932],
  ];
  const DESKTOPS: readonly (readonly [number, number])[] = [
    [1280, 720],
    [1920, 1080],
    [1024, 768],
    [768, 1024],
  ];

  test('看短邊：手機橫向與直向都算手機，平板與桌面不算', () => {
    for (const [width, height] of PHONES) {
      expect(isPhoneViewport(width, height), `${width}×${height}`).toBe(true);
      expect(assistViewScale(width, height)).toBeLessThanOrEqual(0.7);
    }
    for (const [width, height] of DESKTOPS) {
      expect(isPhoneViewport(width, height), `${width}×${height}`).toBe(false);
      expect(assistViewScale(width, height)).toBe(1);
    }
  });

  test.each(PHONES)('手機 %i×%i：後視鏡與倒後鏡頭每一邊至少少 30%，但仍看得清楚', (width, height) => {
    const before = previousAssistSize(width, height);
    const assist = assistLayout(width, height);
    // 倒後鏡頭與鳥瞰（上排同高）。
    expect(assist.rear.height).toBeLessThanOrEqual(before.rowHeight * 0.7);
    expect(assist.bird.height).toBe(assist.rear.height);
    expect(assist.rear.width).toBeLessThanOrEqual(before.rowHeight * ASSIST_VIEW_ASPECT.rear * 0.7);
    // 左右後視鏡。
    expect(assist.mirrorLeft.width).toBeLessThanOrEqual(before.mirrorWidth * 0.7);
    expect(assist.mirrorRight.width).toBe(assist.mirrorLeft.width);
    // 面積不到原本的一半。
    expect(assist.rear.width * assist.rear.height).toBeLessThan(
      before.rowHeight * ASSIST_VIEW_ASPECT.rear * before.rowHeight * 0.5,
    );
    // 不是小點：倒後鏡頭至少 100×60、後視鏡至少 64×42，長寬比不變。
    expect(assist.rear.width).toBeGreaterThanOrEqual(100);
    expect(assist.rear.height).toBeGreaterThanOrEqual(60);
    expect(assist.mirrorLeft.width).toBeGreaterThanOrEqual(64);
    expect(assist.mirrorLeft.height).toBeGreaterThanOrEqual(42);
    for (const id of ASSIST_VIEW_IDS) {
      expect(Math.abs(assist[id].width / assist[id].height - ASSIST_VIEW_ASPECT[id]), id).toBeLessThan(0.03);
    }
  });

  test.each(DESKTOPS)('桌面／平板 %i×%i：維持原本的大小', (width, height) => {
    const before = previousAssistSize(width, height);
    const assist = assistLayout(width, height);
    expect(assist.rear.height).toBe(before.rowHeight);
    expect(assist.mirrorLeft.width).toBe(before.mirrorWidth);
  });

  test('1280×720 的小窗是 194 px 高的上排與 218 px 寬的後視鏡（沒有被一起縮小）', () => {
    const assist = assistLayout(1280, 720);
    expect(assist.rear.height).toBe(194);
    expect(assist.rear.width).toBe(310);
    expect(assist.mirrorLeft.width).toBe(218);
  });

  test('小窗變小之後，手機橫向的方向盤與踏板有更多空間（不比原本小）', () => {
    const { wheel, gas } = touchLayout(844, 390);
    expect(wheel.width).toBeGreaterThanOrEqual(143);
    expect(gas.height).toBeGreaterThanOrEqual(143);
  });
});
