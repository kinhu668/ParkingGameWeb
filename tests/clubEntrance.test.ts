// 大賣場的入口是門、玻璃、門框與雨遮，不是一整塊發光的牆。不開 WebGL。
import { describe, expect, test } from 'vitest';
import { ftToM } from '../src/core/units';
import { LEVELS } from '../src/level/levelCatalog';
import { CLUB_ENTRANCE, createEnvironmentLayout } from '../src/props/environmentLayout';
import { LOT_PROPS_CONFIG as LOT, QUALITY_PRESETS } from '../src/render/renderConfig';

const CLUBS = LEVELS.filter((level) => level.environment === 'warehouse_club');

describe.each(CLUBS.map((level) => [level.id, level] as const))('%s 的大賣場入口', (_id, level) => {
  const layout = createEnvironmentLayout(level, QUALITY_PRESETS.ultra.props);
  if (layout === undefined) {
    throw new Error('沒有環境佈局');
  }
  const doorTopM = ftToM(CLUB_ENTRANCE.topY);
  /** 入口的玻璃：亮度是入口那三種的 windows（背景建築的窗不是 0 就是 0.55 以上）。 */
  const glows: readonly number[] = [CLUB_ENTRANCE.doorGlow, CLUB_ENTRANCE.sideGlow, CLUB_ENTRANCE.transomGlow];
  const glass = layout.lot.windows.filter((window) => glows.includes(window.variant));
  const others = layout.lot.windows.filter((window) => !glows.includes(window.variant));
  const frames = layout.slabs.filter((slab) => slab.color === CLUB_ENTRANCE.frameColor);

  test('玻璃分成一格一格（兩扇門＋四片落地窗＋六片氣窗），沒有一整片的大玻璃', () => {
    expect(glass).toHaveLength(12);
    for (const pane of glass) {
      expect(Math.max(pane.sizeX, pane.sizeZ)).toBeLessThanOrEqual(ftToM(CLUB_ENTRANCE.doorWidth));
    }
  });

  test('玻璃不是發光牆：亮度都不超過 0.35（原本整片 0.95）', () => {
    for (const pane of glass) {
      expect(pane.variant).toBeGreaterThan(0);
      expect(pane.variant).toBeLessThanOrEqual(0.35);
    }
    // 其餘的窗都是背景建築上一格一格的小窗，沒有留下整片的大玻璃。
    for (const window of others) {
      expect(Math.max(window.sizeX, window.sizeZ)).toBeLessThanOrEqual(LOT.buildingWindowSizeM.x + 1e-6);
    }
  });

  test('有門框與直櫺、門把、踢腳板、雨遮與柱子', () => {
    // 兩側立框＋上框＋橫櫺＋五根直櫺＋兩根雨遮柱。
    expect(frames).toHaveLength(11);
    expect(layout.slabs.filter((slab) => slab.color === CLUB_ENTRANCE.handleColor)).toHaveLength(2);
    expect(layout.slabs.filter((slab) => slab.color === CLUB_ENTRANCE.kickColor)).toHaveLength(6);
    const canopy = layout.slabs.find(
      (slab) =>
        Math.abs(slab.minY - ftToM(CLUB_ENTRANCE.canopyY)) < 1e-6 &&
        Math.abs(slab.maxY - ftToM(CLUB_ENTRANCE.canopyTopY)) < 1e-6,
    );
    expect(canopy).toBeDefined();
    // 雨遮比門洞寬、蓋在門的上方。
    expect(Math.max((canopy?.maxX ?? 0) - (canopy?.minX ?? 0), (canopy?.maxZ ?? 0) - (canopy?.minZ ?? 0))).toBeGreaterThan(
      ftToM(2 * CLUB_ENTRANCE.halfWidth),
    );
    expect(canopy?.minY ?? 0).toBeGreaterThan(doorTopM);
  });

  test('MEMBERS ENTRANCE 的牌子還在，立在雨遮上面', () => {
    const sign = layout.signs.find((entry) => entry.text === 'MEMBERS ENTRANCE');
    expect(sign).toBeDefined();
    expect((sign?.y ?? 0) - (sign?.heightM ?? 0) / 2).toBeGreaterThanOrEqual(ftToM(CLUB_ENTRANCE.canopyTopY) - 1e-6);
  });
});
