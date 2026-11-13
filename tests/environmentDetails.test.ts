// 第 1 世界環境的擺設密度（步驟 5）：停車場類的環境四周多了車擋、排水孔蓋、垃圾桶、告示牌、灌木、交通錐、圍欄、
// 繳費機與燈桿上的監視器。全部是純視覺、都在 bounds 外面、不擋 `?cam=spot_low` 的鏡頭；數量跟著畫質級別走，
// 低級別是高級別的子集；每一類仍是一個 InstancedMesh。不開 WebGL。
import { InstancedMesh, Mesh, type Object3D } from 'three';
import { describe, expect, test } from 'vitest';
import { ftToM } from '../src/core/units';
import { LEVELS } from '../src/level/levelCatalog';
import type { LevelDefinition } from '../src/level/levelSchema';
import { createEnvironmentLayout } from '../src/props/environmentLayout';
import { createEnvironment } from '../src/props/environments';
import { placementFootprint, type PropCategory, type PropPlacement } from '../src/props/lotLayout';
import { createCameraGeometry, createPayStationGeometry } from '../src/props/lotProps';
import { createPresetCamera } from '../src/render/followCamera';
import { QUALITY_LEVELS, usesHdrChain, type QualityLevel } from '../src/render/quality';
import { LOT_PROPS_CONFIG, QUALITY_PRESETS } from '../src/render/renderConfig';

const BOUNDED = LEVELS.filter((level) => level.boundsFt !== undefined);
/** 停車場類的環境：四周是假車位、背景車與路燈。 */
const LOT_LEVELS = BOUNDED.filter((level) =>
  ['open_lot', 'warehouse_club', 'post_office'].includes(level.environment),
);
/** 跟著 detailFraction 走的小東西。 */
const DETAILS: readonly PropCategory[] = [
  'wheelStops',
  'bins',
  'trafficCones',
  'signs',
  'drains',
  'payStations',
  'cameras',
];

function layoutOf(level: LevelDefinition, quality: QualityLevel): NonNullable<ReturnType<typeof createEnvironmentLayout>> {
  const layout = createEnvironmentLayout(level, QUALITY_PRESETS[quality].props);
  if (layout === undefined) {
    throw new Error(`${level.id} 沒有環境佈局`);
  }
  return layout;
}

function key(placement: PropPlacement): string {
  return `${placement.x.toFixed(4)},${placement.z.toFixed(4)},${placement.y.toFixed(4)}`;
}

function meshesOf(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh) {
      meshes.push(object);
    }
  });
  return meshes;
}

describe('停車場類的環境：四周的小東西', () => {
  test('有這幾關（空地、大賣場、郵局）', () => {
    expect(LOT_LEVELS.length).toBeGreaterThanOrEqual(5);
  });

  test.each(LOT_LEVELS.map((level) => [level.id, level] as const))(
    '%s：high 畫質每一類都有；每個假車位盡頭一塊車擋',
    (_id, level) => {
      const { lot } = layoutOf(level, 'high');
      for (const category of [...DETAILS, 'bushes', 'fencePosts', 'fenceRails'] as const) {
        expect(lot[category].length, category).toBeGreaterThan(0);
      }
      // 每一列 n 個車位有 n + 2 條線（n + 1 條直的＋一條收尾的橫線）。主建築那一邊沒有假車位。
      const rows = level.environment === 'open_lot' ? 4 : 3;
      expect(lot.wheelStops).toHaveLength(lot.stallLines.length - 2 * rows);
      // 兩道橫桿：橫桿數 = 2 ×（立柱數 − 圍欄段數）。
      expect(lot.fenceRails).toHaveLength(2 * (lot.fencePosts.length - rows));
      // 每一列一台繳費機。
      expect(lot.payStations.length).toBeLessThanOrEqual(rows);
    },
  );

  test.each(LOT_LEVELS.map((level) => [level.id, level] as const))(
    '%s：數量跟著畫質級別，低級別是高級別的子集',
    (_id, level) => {
      const layouts = QUALITY_LEVELS.map((quality) => layoutOf(level, quality).lot);
      for (const category of DETAILS) {
        for (let index = 1; index < layouts.length; index += 1) {
          const lower = layouts[index - 1]?.[category] ?? [];
          const higher = layouts[index]?.[category] ?? [];
          expect(lower.length, category).toBeLessThanOrEqual(higher.length);
          const higherKeys = new Set(higher.map(key));
          for (const placement of lower) {
            expect(higherKeys.has(key(placement)), `${category} ${key(placement)}`).toBe(true);
          }
        }
      }
      const low = layouts[0];
      const high = layouts[2];
      if (low === undefined || high === undefined) {
        throw new Error('少了佈局');
      }
      // low 明顯比較少，但不是空的。
      const total = (lot: typeof low): number =>
        DETAILS.reduce((sum, category) => sum + lot[category].length, 0);
      expect(total(low)).toBeGreaterThan(0);
      expect(total(low)).toBeLessThan(total(high) * 0.5);
      expect(low.fencePosts.length).toBeLessThan(high.fencePosts.length);
      expect(low.bushes.length).toBeLessThanOrEqual(QUALITY_PRESETS.low.props.bushes);
    },
  );

  test.each(BOUNDED.map((level) => [level.id, level] as const))(
    '%s：小東西（含貼地的排水孔蓋）都在 bounds 外面，離 ?cam=spot_low 的鏡頭夠遠',
    (_id, level) => {
      const bounds = level.boundsFt;
      if (bounds === undefined) {
        throw new Error('沒有 bounds');
      }
      const { spot, startState } = level.layout;
      const camera = createPresetCamera('spot_low', startState.x, startState.z, spot).position;
      for (const quality of QUALITY_LEVELS) {
        const { lot } = layoutOf(level, quality);
        for (const category of DETAILS) {
          for (const placement of lot[category]) {
            for (const point of placementFootprint(placement)) {
              const inside =
                point.x > ftToM(bounds.minXFt) + 1e-6 &&
                point.x < ftToM(bounds.maxXFt) - 1e-6 &&
                point.z > ftToM(bounds.minZFt) + 1e-6 &&
                point.z < ftToM(bounds.maxZFt) - 1e-6;
              expect(inside, `${category} ${key(placement)}`).toBe(false);
            }
            expect(
              Math.hypot(placement.x - camera.x, placement.z - camera.z),
              `${category} ${key(placement)}`,
            ).toBeGreaterThan(LOT_PROPS_CONFIG.cameraClearRadiusM);
          }
        }
      }
    },
  );

  test.each(BOUNDED.map((level) => [level.id, level] as const))(
    '%s：監視器都掛在這個畫質級別真的有的路燈桿上、朝向與燈臂相同',
    (_id, level) => {
      for (const quality of QUALITY_LEVELS) {
        const { lot } = layoutOf(level, quality);
        for (const camera of lot.cameras) {
          const lamp = lot.lamps.find((candidate) => candidate.x === camera.x && candidate.z === camera.z);
          expect(lamp, key(camera)).toBeDefined();
          expect(camera.headingRad).toBe(lamp?.headingRad);
        }
        expect(lot.cameras.length).toBeLessThanOrEqual(lot.lamps.length);
      }
      // 每一關（含街道與窄巷）high 畫質至少一台。
      expect(layoutOf(level, 'high').lot.cameras.length).toBeGreaterThan(0);
    },
  );

  test('同樣的種子得到同一份佈局', () => {
    for (const level of LOT_LEVELS) {
      expect(layoutOf(level, 'high')).toEqual(layoutOf(level, 'high'));
    }
  });
});

describe('網格：每一類一個 draw call', () => {
  test.each(LOT_LEVELS.map((level) => [level.id, level] as const))(
    '%s：監視器、繳費機、車擋、垃圾桶、告示牌、交通錐、排水孔蓋、圍欄各是一個 InstancedMesh，實例數等於佈局',
    (_id, level) => {
      for (const quality of ['low', 'high'] as const) {
        const settings = QUALITY_PRESETS[quality];
        const layout = layoutOf(level, quality);
        const group = createEnvironment(level.layout.spot, layout, settings.props, usesHdrChain(settings));
        const meshes = meshesOf(group);
        const named = (name: string): Mesh[] => meshes.filter((mesh) => mesh.name === name);
        const expected: readonly (readonly [string, number])[] = [
          ['cameras', layout.lot.cameras.length],
          ['payStations', layout.lot.payStations.length],
          ['wheelStops', layout.lot.wheelStops.length],
          ['bins', layout.lot.bins.length],
          ['signs', layout.lot.signs.length],
          ['trafficCones', layout.lot.trafficCones.length],
          ['drains', layout.lot.drains.length],
          ['fence', layout.lot.fencePosts.length + layout.lot.fenceRails.length],
        ];
        for (const [name, count] of expected) {
          const found = named(name);
          expect(found.length, `${quality} ${name}`).toBe(count > 0 ? 1 : 0);
          const [mesh] = found;
          if (mesh !== undefined) {
            expect(mesh).toBeInstanceOf(InstancedMesh);
            expect(mesh instanceof InstancedMesh ? mesh.count : 0, `${quality} ${name}`).toBe(count);
          }
        }
        // 整個環境的網格數有上限：加密不是靠多開 draw call。
        expect(meshes.length, quality).toBeLessThanOrEqual(60);
      }
    },
  );

  test('監視器：掛在燈桿上（比車頂高、比燈頭低），往燈臂的方向伸出去一小段', () => {
    const geometry = createCameraGeometry();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    expect(box?.min.y).toBeGreaterThan(ftToM(10));
    expect(box?.max.y).toBeLessThan(LOT_PROPS_CONFIG.lampHeightM);
    expect(box?.min.z).toBeLessThan(-ftToM(1.5));
    expect(box?.min.z).toBeGreaterThan(-ftToM(4));
    expect(Math.max(Math.abs(box?.min.x ?? 0), Math.abs(box?.max.x ?? 0))).toBeLessThan(ftToM(1));
    expect(geometry.getAttribute('color')).toBeDefined();
  });

  test('繳費機：站在地上、高度與佔地就是設定值（比人矮一點的立式機器）', () => {
    const geometry = createPayStationGeometry();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const size = LOT_PROPS_CONFIG.payStationSizeM;
    expect(box?.min.y).toBeCloseTo(0, 6);
    expect(box?.max.y).toBeCloseTo(size.y, 6);
    expect((box?.max.x ?? 0) - (box?.min.x ?? 0)).toBeLessThan(size.x * 1.2);
    expect(size.y).toBeGreaterThan(ftToM(4));
    expect(size.y).toBeLessThan(ftToM(6.5));
    expect(geometry.getAttribute('color')).toBeDefined();
  });
});

describe('步驟 5 剩項：減速丘、管線、海報、額外磨損', () => {
  test.each(LOT_LEVELS.map((level) => [level.id, level] as const))(
    '%s：四周車道有減速丘、假車位地面有磨損斑，背景樓有海報與管線；立體的都在 bounds 外',
    (_id, level) => {
      const bounds = level.boundsFt;
      if (bounds === undefined) {
        throw new Error('沒有 bounds');
      }
      const { slabs } = layoutOf(level, 'high');
      const bumps = slabs.filter(
        (slab) => slab.kind === 'solid' && slab.maxY <= ftToM(0.35) && slab.maxY >= ftToM(0.2),
      );
      const stains = slabs.filter((slab) => slab.kind === 'flat' && slab.color === 0x2a2418);
      const posters = slabs.filter(
        (slab) => slab.kind === 'decal' && [0xc45a3a, 0x2e5a8c, 0xd6c48a].includes(slab.color),
      );
      const conduits = slabs.filter((slab) => slab.kind === 'solid' && slab.color === 0x8a9088);
      expect(bumps.length).toBeGreaterThanOrEqual(4);
      expect(stains.length).toBeGreaterThan(0);
      expect(posters.length).toBeGreaterThan(0);
      expect(conduits.length).toBeGreaterThan(0);
      const inside = (x: number, z: number): boolean =>
        x > ftToM(bounds.minXFt) + 1e-6 &&
        x < ftToM(bounds.maxXFt) - 1e-6 &&
        z > ftToM(bounds.minZFt) + 1e-6 &&
        z < ftToM(bounds.maxZFt) - 1e-6;
      for (const slab of [...bumps, ...conduits]) {
        expect(inside(slab.minX, slab.minZ), `solid ${slab.minX},${slab.minZ}`).toBe(false);
        expect(inside(slab.maxX, slab.maxZ), `solid ${slab.maxX},${slab.maxZ}`).toBe(false);
      }
    },
  );
});
