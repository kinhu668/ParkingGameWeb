// 關卡四周的環境：bounds 裡沒有「看得見、穿得過」的東西（計畫 §6.2）；四個環境各有自己的建築與招牌；
// 招牌文字只來自 environmentSigns 的表；原型關不走這裡。不開 WebGL。
import { InstancedMesh } from 'three';
import { describe, expect, test, vi } from 'vitest';
import { ftToM } from '../src/core/units';
import { ENVIRONMENT_SIGNS, signText, signTextsFor } from '../src/level/environmentSigns';
import { LEVELS, levelById } from '../src/level/levelCatalog';
import {
  DECAL_DEPTH_FT,
  createEnvironmentLayout,
  facingSide,
  type EnvironmentLayout,
} from '../src/props/environmentLayout';
import { createEnvironment, createSpotArrow } from '../src/props/environments';
import {
  FLAT_PROP_CATEGORIES,
  PROP_CATEGORIES,
  placementFootprint,
} from '../src/props/lotLayout';
import { SIGN_STYLES, SIGN_TEXTURE_MAX_PX, createSignMesh, signTextureSize } from '../src/props/signs';
import { QUALITY_LEVELS } from '../src/render/quality';
import { QUALITY_PRESETS } from '../src/render/renderConfig';

const ULTRA = QUALITY_PRESETS.ultra.props;
const BOUNDED = LEVELS.filter((level) => level.boundsFt !== undefined);
/** 容許的誤差（公尺）。 */
const EPSILON_M = 1e-6;

function layoutOf(id: string): EnvironmentLayout {
  const level = levelById(id);
  const layout = level === undefined ? undefined : createEnvironmentLayout(level, ULTRA);
  if (layout === undefined) {
    throw new Error(`${id} 沒有環境佈局`);
  }
  return layout;
}

describe('環境佈局', () => {
  test('原型關沒有 bounds → 不走環境模組（仍是原本的停車場）', () => {
    const prototype = levelById('prototype');
    expect(prototype?.boundsFt).toBeUndefined();
    expect(prototype === undefined ? null : createEnvironmentLayout(prototype, ULTRA)).toBeUndefined();
  });

  test('第 1 世界 10 關都有 bounds，都有環境佈局', () => {
    expect(BOUNDED).toHaveLength(10);
  });

  test('車一開始面對哪一邊', () => {
    expect(facingSide(0)).toBe('n');
    expect(facingSide(90)).toBe('e');
    expect(facingSide(180)).toBe('s');
    expect(facingSide(270)).toBe('w');
  });
});

describe.each(BOUNDED.map((level) => [level.id, level] as const))('%s 的環境', (_id, level) => {
  const bounds = level.boundsFt ?? { minXFt: 0, maxXFt: 0, minZFt: 0, maxZFt: 0 };
  const minX = ftToM(bounds.minXFt);
  const maxX = ftToM(bounds.maxXFt);
  const minZ = ftToM(bounds.minZFt);
  const maxZ = ftToM(bounds.maxZFt);
  const inside = (x: number, z: number, marginM = EPSILON_M): boolean =>
    x > minX + marginM && x < maxX - marginM && z > minZ + marginM && z < maxZ - marginM;

  test.each(QUALITY_LEVELS)('%s 畫質：bounds 裡沒有背景車、路燈、樹、建築、桶、錐、標誌', (quality) => {
    const layout = createEnvironmentLayout(level, QUALITY_PRESETS[quality].props);
    expect(layout).toBeDefined();
    for (const category of PROP_CATEGORIES) {
      if (FLAT_PROP_CATEGORIES.includes(category) || category === 'windows') {
        continue;
      }
      for (const placement of layout?.lot[category] ?? []) {
        for (const point of placementFootprint(placement)) {
          expect(inside(point.x, point.z), `${category} @ ${placement.x}, ${placement.z}`).toBe(false);
        }
      }
    }
  });

  test('立體的方塊都在 bounds 外；貼在牆上的薄片與窗只凸出牆面一點點；標線平貼地面', () => {
    const layout = createEnvironmentLayout(level, ULTRA);
    const decalM = ftToM(DECAL_DEPTH_FT + 0.06);
    for (const slab of layout?.slabs ?? []) {
      const overlaps = (marginM: number): boolean =>
        slab.maxX > minX + marginM && slab.minX < maxX - marginM && slab.maxZ > minZ + marginM && slab.minZ < maxZ - marginM;
      if (slab.kind === 'solid') {
        expect(overlaps(EPSILON_M), `solid ${slab.minX},${slab.minZ}`).toBe(false);
      } else if (slab.kind === 'decal') {
        // JSON 的牆朝巷子的那一面也可以貼；那種薄片整片在 bounds 裡，但厚度一樣很薄。
        const thin = Math.min(slab.maxX - slab.minX, slab.maxZ - slab.minZ);
        expect(thin).toBeLessThanOrEqual(decalM);
      } else {
        expect(slab.maxY).toBeLessThan(ftToM(0.1));
      }
    }
    for (const window of layout?.lot.windows ?? []) {
      const thin = Math.min(window.sizeX, window.sizeZ);
      if (inside(window.x, window.z, -thin)) {
        expect(thin).toBeLessThanOrEqual(ftToM(2 * DECAL_DEPTH_FT) + EPSILON_M);
      }
    }
    for (const line of layout?.lot.stallLines ?? []) {
      expect(line.y + line.sizeY).toBeLessThan(ftToM(0.1));
    }
  });

  test('招牌文字都來自這個環境的表；同樣的種子得到同一份佈局', () => {
    const layout = createEnvironmentLayout(level, ULTRA);
    const allowed = signTextsFor(level.environment);
    for (const sign of layout?.signs ?? []) {
      expect(allowed).toContain(sign.text);
      expect(sign.widthM / sign.heightM).toBeGreaterThan(1);
    }
    expect(createEnvironmentLayout(level, ULTRA)).toEqual(layout);
  });

  test('建得出網格（不需要 WebGL、不需要 DOM），有目標車位的方向箭頭', () => {
    const layout = createEnvironmentLayout(level, QUALITY_PRESETS.low.props);
    if (layout === undefined) {
      throw new Error('沒有佈局');
    }
    const group = createEnvironment(level.layout.spot, layout, QUALITY_PRESETS.low.props, false);
    const names: string[] = [];
    group.traverse((child) => names.push(child.name));
    expect(names).toContain('lotProps');
    expect(names).toContain('spotArrow');
    expect(names.filter((name) => name === 'sign')).toHaveLength(layout.signs.length);
  });

  test('建立網格時 three 沒有印出錯誤（沒有招牌的環境也一樣）', () => {
    const layout = createEnvironmentLayout(level, ULTRA);
    if (layout === undefined) {
      throw new Error('沒有佈局');
    }
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      createEnvironment(level.layout.spot, layout, ULTRA, true);
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });
});

describe('四個環境各自認得出來', () => {
  const texts = (id: string): string[] => layoutOf(id).signs.map((sign) => sign.text);

  test('大賣場：主招牌 BULKWORTH WHOLESALE CLUB 自發光，還有會員入口與輪胎中心；有一棟大建築', () => {
    for (const id of ['w1_l03', 'w1_l04', 'w1_l07']) {
      const layout = layoutOf(id);
      const main = layout.signs.find((sign) => sign.text === ENVIRONMENT_SIGNS.warehouse_club.main);
      expect(main?.glow).toBeGreaterThan(0.5);
      expect(texts(id)).toEqual(expect.arrayContaining(['MEMBERS ENTRANCE', 'TIRE CENTER']));
      const biggest = Math.max(...layout.slabs.map((slab) => (slab.maxX - slab.minX) * (slab.maxZ - slab.minZ)));
      expect(biggest).toBeGreaterThan(ftToM(100) * ftToM(100));
    }
  });

  test('郵局：主招牌 MAPLE HOLLOW POST OFFICE，還有 MAIL 與 15 MIN PARKING', () => {
    for (const id of ['w1_l05', 'w1_l06']) {
      expect(texts(id)).toEqual(
        expect.arrayContaining(['MAPLE HOLLOW POST OFFICE', 'MAIL', '15 MIN PARKING']),
      );
    }
  });

  test('街道：五間店的招牌、OAK ST、2 HR PARKING；兩旁有人行道、一側是店面，沒有假車位裡的背景車', () => {
    for (const id of ['w1_l08', 'w1_l09']) {
      expect([...texts(id)].sort()).toEqual([...signTextsFor('city_street')].sort());
      expect(layoutOf(id).lot.parkedCars).toHaveLength(0);
      expect(layoutOf(id).slabs.filter((slab) => slab.kind === 'flat').length).toBeGreaterThan(3);
    }
  });

  test('窄巷：LOADING ZONE、DELIVERIES ONLY、NO PARKING；牆上有後門與捲門，沒有背景車與樹', () => {
    const layout = layoutOf('w1_l10');
    expect([...new Set(texts('w1_l10'))].sort()).toEqual([...signTextsFor('narrow_alley')].sort());
    expect(layout.slabs.filter((slab) => slab.kind === 'decal').length).toBeGreaterThan(5);
    expect(layout.lot.parkedCars).toHaveLength(0);
    expect(layout.lot.trees).toHaveLength(0);
  });

  test('空地：沒有招牌，四周是假車位與背景車', () => {
    const layout = layoutOf('w1_l02');
    expect(layout.signs).toHaveLength(0);
    expect(layout.lot.parkedCars.length).toBeGreaterThan(5);
  });
});

describe('招牌', () => {
  test('signText 只給表裡有的字', () => {
    expect(signText('post_office', 'MAIL')).toBe('MAIL');
    expect(() => signText('post_office', 'CART RETURN')).toThrow();
    expect(() => signText('open_lot', 'PARKING')).toThrow();
  });

  test('貼圖不超過 512 × 128', () => {
    for (const aspect of [0.5, 1, 2.5, 4, 6, 10, 20]) {
      const size = signTextureSize(aspect);
      expect(size.width).toBeLessThanOrEqual(SIGN_TEXTURE_MAX_PX.width);
      expect(size.height).toBeLessThanOrEqual(SIGN_TEXTURE_MAX_PX.height);
      expect(size.width / size.height).toBeCloseTo(aspect, 0);
    }
  });

  test('每個環境的招牌貼圖不超過 8 張（同樣的字共用一張）', () => {
    for (const level of BOUNDED) {
      const layout = createEnvironmentLayout(level, ULTRA);
      expect(new Set(layout?.signs.map((sign) => `${sign.text}|${sign.style}`)).size).toBeLessThanOrEqual(8);
    }
  });

  test('樣式的顏色都是 #rrggbb；沒有 DOM 時退回成一片底色的牌子，位置與大小不變', () => {
    for (const style of Object.values(SIGN_STYLES)) {
      expect(style.background).toMatch(/^#[0-9a-f]{6}$/);
      expect(style.color).toMatch(/^#[0-9a-f]{6}$/);
    }
    const mesh = createSignMesh({
      text: 'MAIL', style: 'mail', x: 1, y: 2, z: 3, facingRad: 0, widthM: 2, heightM: 1, glow: 0,
    });
    expect(mesh.position.toArray()).toEqual([1, 2, 3]);
    expect(mesh.userData.signText).toBe('MAIL');
    expect(mesh).not.toBeInstanceOf(InstancedMesh);
    expect(createSpotArrow(LEVELS[0]?.layout.spot ?? { x: 0, z: 0, widthM: 3, lengthM: 6, headingRad: 0, angleToleranceRad: 0.1 }).children).toHaveLength(1);
  });
});
