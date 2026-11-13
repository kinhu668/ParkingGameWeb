// 只烘這一關用到的表面：哪些烘焙索引還缺（missingBakeIndices）、場景用到哪些表面（surfacesUsedIn）。不開 WebGL。
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { describe, expect, test } from 'vitest';
import { levelById } from '../src/level/levelCatalog';
import { OVERLAY_BAKE_INDEX } from '../src/materials/bakeShader';
import { missingBakeIndices } from '../src/materials/surfaceLibrary';
import { createSurfaceMaterial, surfacesUsedIn } from '../src/materials/surfaceMaterial';
import { SURFACE_IDS, surfaceIndex, type SurfaceId } from '../src/materials/surfaces';
import { createEnvironmentLayout } from '../src/props/environmentLayout';
import { createEnvironment } from '../src/props/environments';
import { createObstacleMeshes } from '../src/props/obstacleMeshes';
import { QUALITY_PRESETS } from '../src/render/renderConfig';
import { createCarMesh } from '../src/vehicle/carMesh';

describe('還缺哪些要烘 missingBakeIndices', () => {
  test('什麼表面都不要：只有髒污疊加（每個場景都要）', () => {
    expect(missingBakeIndices([], new Set())).toEqual([OVERLAY_BAKE_INDEX]);
  });

  test('全部表面（展示台）：每種表面一個索引，加上髒污疊加，照索引排序', () => {
    const all = missingBakeIndices(SURFACE_IDS, new Set());
    expect(all).toEqual(Array.from({ length: SURFACE_IDS.length + 1 }, (_, index) => index));
  });

  test('只給用到的；重複的只算一次；順序與給的順序無關', () => {
    const wanted: SurfaceId[] = ['tire', 'brick', 'tire', 'carPaint'];
    expect(missingBakeIndices(wanted, new Set())).toEqual(
      [surfaceIndex('brick'), surfaceIndex('tire'), surfaceIndex('carPaint'), OVERLAY_BAKE_INDEX].sort(
        (a, b) => a - b,
      ),
    );
  });

  test('已經烘過的不重烘：第二次只補還缺的；都有了就是空的', () => {
    const baked = new Set(missingBakeIndices(['brick', 'glass'], new Set()));
    expect(missingBakeIndices(['brick', 'glass'], baked)).toEqual([]);
    expect(missingBakeIndices([], baked)).toEqual([]);
    expect(missingBakeIndices(['brick', 'concrete'], baked)).toEqual([surfaceIndex('concrete')]);
  });
});

describe('場景用到哪些表面 surfacesUsedIn', () => {
  test('單一材質、材質陣列、藏起來的物件都算；不是庫材質的不算', () => {
    const geometry = new PlaneGeometry(1, 1);
    const root = new Group();
    root.add(new Mesh(geometry, createSurfaceMaterial('brick')));
    root.add(new Mesh(geometry, [createSurfaceMaterial('glass'), createSurfaceMaterial('chrome')]));
    const hidden = new Mesh(geometry, createSurfaceMaterial('plastic'));
    hidden.visible = false;
    const nested = new Group();
    nested.add(hidden);
    root.add(nested);
    root.add(new Mesh(geometry, new MeshBasicMaterial()));
    expect([...surfacesUsedIn(root)].sort()).toEqual(['brick', 'chrome', 'glass', 'plastic']);
    expect(surfacesUsedIn(new Group()).size).toBe(0);
  });

  test('玩家車＋郵局關的環境與障礙物：用到的是庫的一部分，沒有東西用柏油與環氧地坪', () => {
    const level = levelById('w1_l05');
    if (level === undefined) {
      throw new Error('沒有 w1_l05');
    }
    const props = QUALITY_PRESETS.high.props;
    const layout = createEnvironmentLayout(level, props);
    if (layout === undefined) {
      throw new Error('w1_l05 應該有環境佈局');
    }
    const scene = new Group();
    scene.add(
      createCarMesh('high').root,
      createEnvironment(level.layout.spot, layout, props, true),
      createObstacleMeshes(level, 'high'),
    );
    const used = surfacesUsedIn(scene);
    for (const id of ['carPaint', 'glass', 'tire', 'brick', 'concrete'] as const) {
      expect(used, id).toContain(id);
    }
    // 地面用自己的著色器，不是庫材質。
    for (const id of ['asphaltDry', 'asphaltWet', 'epoxy'] as const) {
      expect(used, id).not.toContain(id);
    }
    expect(used.size).toBeLessThan(SURFACE_IDS.length);
    // 要烘的張數比「全部都烘」少。
    expect(missingBakeIndices(used, new Set()).length).toBeLessThan(SURFACE_IDS.length + 1);
  });
});
