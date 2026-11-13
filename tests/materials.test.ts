// 材質庫：表面的基準數值、烘焙著色器（固定種子、沒有時間或亂數）、沒有 WebGL 時的備援、
// 三面投影的著色器掛鉤插得進 three 的原始碼、場景裡的物件確實換成了庫材質。
// 不開 WebGL：GPU 烘焙的像素由 e2e（?show=materials 的檢查碼）驗。
import {
  Color,
  DoubleSide,
  InstancedMesh,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  ShaderLib,
  type Material,
  type Object3D,
} from 'three';
import { describe, expect, test } from 'vitest';
import { levelById } from '../src/level/levelCatalog';
import type { LevelDefinition } from '../src/level/levelSchema';
import { BAKE_VERTEX_SHADER, createBakeFragmentShader, OVERLAY_BAKE_INDEX } from '../src/materials/bakeShader';
import {
  SURFACE_OVERLAY_MAP,
  SURFACE_WETNESS,
  setSurfaceWetness,
  surfaceMaps,
} from '../src/materials/surfaceLibrary';
import {
  createScenerySurface,
  createSurfaceMaterial,
  surfaceOf,
} from '../src/materials/surfaceMaterial';
import {
  SCENERY_OVERLAYS,
  SURFACE_IDS,
  SURFACE_SEED,
  SURFACE_SPECS,
  type SurfaceId,
} from '../src/materials/surfaces';
import { createEnvironmentLayout, slabSurface } from '../src/props/environmentLayout';
import { createEnvironment } from '../src/props/environments';
import { createCurbs, createWheelStopMaterial } from '../src/props/lotEdges';
import { createObstacleMeshes, OBSTACLE_SURFACES, WALL_SURFACES } from '../src/props/obstacleMeshes';
import { createParkedCars } from '../src/props/parkedCars';
import { QUALITY_LEVELS } from '../src/render/quality';
import { CAR_VISUAL_CONFIG, QUALITY_PRESETS } from '../src/render/renderConfig';
import { WEATHER_PRESETS } from '../src/render/weatherPresets';
import { createCarMesh } from '../src/vehicle/carMesh';

function requireLevel(id: string): LevelDefinition {
  const level = levelById(id);
  if (level === undefined) {
    throw new Error(`沒有關卡 ${id}`);
  }
  return level;
}

function environmentOf(id: string): Object3D {
  const level = requireLevel(id);
  const props = QUALITY_PRESETS.high.props;
  const layout = createEnvironmentLayout(level, props);
  if (layout === undefined) {
    throw new Error(`${id} 沒有環境`);
  }
  return createEnvironment(level.layout.spot, layout, props, true);
}

function materialsIn(root: Object3D): Material[] {
  const found: Material[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh) {
      found.push(...(Array.isArray(object.material) ? object.material : [object.material]));
    }
  });
  return found;
}

function surfacesIn(root: Object3D): Set<SurfaceId> {
  return new Set(materialsIn(root).flatMap((material) => surfaceOf(material) ?? []));
}

/** 跑一次 onBeforeCompile，回傳改過的著色器原始碼與 uniform。 */
function compiled(material: Material): {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { value: unknown }>;
} {
  const shader = {
    vertexShader: ShaderLib.physical.vertexShader,
    fragmentShader: ShaderLib.physical.fragmentShader,
    uniforms: {} as Record<string, { value: unknown }>,
  };
  (material.onBeforeCompile as unknown as (source: typeof shader) => void)(shader);
  return shader;
}

describe('表面的基準數值 SURFACE_SPECS', () => {
  test('規格第 9 節列的 14 種表面都在', () => {
    for (const id of [
      'asphaltDry', 'asphaltWet', 'concrete', 'epoxy', 'wornPaint', 'rustedIron', 'galvanized',
      'corrugated', 'brick', 'glass', 'tire', 'carPaint', 'plastic', 'chrome',
    ] as const) {
      expect(SURFACE_IDS, id).toContain(id);
    }
  });

  test.each(SURFACE_IDS)('%s：粗糙度、金屬度、清漆都在合理範圍', (id) => {
    const spec = SURFACE_SPECS[id];
    expect(spec.roughness).toBeGreaterThanOrEqual(0.04);
    expect(spec.roughness).toBeLessThanOrEqual(1);
    expect(spec.metalness).toBeGreaterThanOrEqual(0);
    expect(spec.metalness).toBeLessThanOrEqual(1);
    expect(spec.clearcoat).toBeGreaterThanOrEqual(0);
    expect(spec.clearcoat).toBeLessThanOrEqual(1);
    expect(spec.tileM).toBeGreaterThan(0.1);
    expect(spec.tileM).toBeLessThan(5);
  });

  test('金屬是金屬、石材不是；鉻最亮、柏油與磚最粗；濕柏油比乾的亮', () => {
    for (const id of ['chrome', 'galvanized', 'corrugated', 'rustedIron'] as const) {
      expect(SURFACE_SPECS[id].metalness, id).toBeGreaterThanOrEqual(0.8);
    }
    for (const id of ['asphaltDry', 'asphaltWet', 'concrete', 'brick', 'plaster', 'tire', 'plastic', 'glass'] as const) {
      expect(SURFACE_SPECS[id].metalness, id).toBe(0);
    }
    expect(SURFACE_SPECS.chrome.metalness).toBe(1);
    expect(SURFACE_SPECS.chrome.roughness).toBeLessThanOrEqual(0.15);
    expect(SURFACE_SPECS.asphaltDry.roughness).toBeGreaterThan(0.85);
    expect(SURFACE_SPECS.brick.roughness).toBeGreaterThan(0.85);
    expect(SURFACE_SPECS.asphaltWet.roughness).toBeLessThan(SURFACE_SPECS.asphaltDry.roughness - 0.2);
    expect(SURFACE_SPECS.tire.roughness).toBeGreaterThan(0.8);
  });

  test('只有車漆與環氧地坪有清漆；車漆的清漆是滿的而且很光滑', () => {
    for (const id of SURFACE_IDS) {
      expect(SURFACE_SPECS[id].clearcoat > 0, id).toBe(id === 'carPaint' || id === 'epoxy');
    }
    expect(SURFACE_SPECS.carPaint.clearcoat).toBe(1);
    expect(SURFACE_SPECS.carPaint.clearcoatRoughness).toBeLessThan(0.15);
  });

  test('油漬與舊輪胎痕只給朝上會被車壓的表面；車身的表面沒有髒污', () => {
    for (const id of ['carPaint', 'glass', 'tire', 'chrome'] as const) {
      expect(Object.values(SCENERY_OVERLAYS[id]).every((value) => value === 0), id).toBe(true);
    }
    for (const id of ['brick', 'plaster', 'corrugated', 'paintedMetal', 'rustedIron'] as const) {
      expect(SCENERY_OVERLAYS[id].streaks, id).toBeGreaterThan(0);
      expect(SCENERY_OVERLAYS[id].oil, id).toBe(0);
      expect(SCENERY_OVERLAYS[id].tireMarks, id).toBe(0);
    }
    expect(SCENERY_OVERLAYS.wornPaint.tireMarks).toBeGreaterThan(0);
    expect(SCENERY_OVERLAYS.asphaltDry.oil).toBeGreaterThan(0);
  });
});

describe('烘焙著色器 createBakeFragmentShader', () => {
  test('同樣的參數每次產生完全相同的原始碼（固定種子寫在裡面）', () => {
    expect(createBakeFragmentShader(true)).toBe(createBakeFragmentShader(true));
    expect(createBakeFragmentShader(false)).toBe(createBakeFragmentShader(false));
    expect(createBakeFragmentShader(true)).toContain(`const uint SEED = ${SURFACE_SEED}u;`);
  });

  test('沒有任何會讓兩次烘焙不同的東西：不讀時間、不用 sin 雜湊、沒有外部貼圖', () => {
    for (const source of [createBakeFragmentShader(true), createBakeFragmentShader(false), BAKE_VERTEX_SHADER]) {
      expect(source).not.toMatch(/uTime|iTime|random|43758\.5453|sampler2D/);
    }
    // 亂數只來自整數雜湊。
    expect(createBakeFragmentShader(true)).toContain('uint hashU(uint x)');
  });

  test('每一種表面與髒污疊加各有一條分支；編號就是 SURFACE_IDS 的順序', () => {
    const source = createBakeFragmentShader(true);
    SURFACE_IDS.slice(0, -1).forEach((_, index) => {
      expect(source, `表面 ${index}`).toContain(`if (id == ${index}) return`);
    });
    expect(OVERLAY_BAKE_INDEX).toBe(SURFACE_IDS.length);
    expect(source).toContain(`if (uSurface == ${OVERLAY_BAKE_INDEX})`);
    for (const name of ['asphalt', 'concrete', 'epoxy', 'wornPaint', 'rustedIron', 'galvanized', 'corrugated',
      'brick', 'glass', 'tire', 'carPaint', 'plastic', 'chrome', 'paintedMetal', 'plaster', 'overlays']) {
      expect(source, name).toMatch(new RegExp(`(Surf|vec4) ${name}\\(vec2 uv`));
    }
  });

  test('不烘法線的版本不輸出、也不多算法線', () => {
    const lean = createBakeFragmentShader(false);
    expect(lean).not.toContain('oNormal');
    expect(lean).not.toContain('float hU');
    expect(createBakeFragmentShader(true)).toContain('layout(location = 2) out vec4 oNormal;');
  });

  test('貼圖接得起來：格點對周期取餘數，取餘數前先加一個周期（不對負數取餘數）', () => {
    expect(createBakeFragmentShader(true)).toContain('ivec2 wrap2(ivec2 p, ivec2 n) { return (p + n) % n; }');
  });
});

describe('沒有 WebGL 時的備援貼圖', () => {
  test('每種表面的三張貼圖都是 1×1 的中性值：材質就是自己的顏色與基準數值', () => {
    for (const id of SURFACE_IDS) {
      const maps = surfaceMaps(id);
      for (const texture of [maps.color.value, maps.orm.value, maps.normal.value]) {
        expect((texture.image as { width: number }).width, id).toBe(1);
      }
      // 顏色：沒有蓋色；ORM：AO 1、粗糙度與明暗倍率 ×1（存成 0.5）、金屬度 ×1；法線朝外。
      expect([...(maps.color.value.image as { data: Uint8Array }).data]).toEqual([0, 0, 0, 0]);
      expect([...(maps.orm.value.image as { data: Uint8Array }).data]).toEqual([255, 128, 255, 128]);
      expect([...(maps.normal.value.image as { data: Uint8Array }).data].slice(0, 3)).toEqual([128, 128, 255]);
    }
    expect([...(SURFACE_OVERLAY_MAP.value.image as { data: Uint8Array }).data]).toEqual([0, 0, 0, 0]);
  });

  test('同一種表面的材質共用同一組貼圖 uniform（烘好後換一次，全部跟著換）', () => {
    const first = compiled(createSurfaceMaterial('brick'));
    const second = compiled(createScenerySurface('brick', { color: 0x70503f }));
    expect(first.uniforms.uSurfColor).toBe(surfaceMaps('brick').color);
    expect(second.uniforms.uSurfColor).toBe(first.uniforms.uSurfColor);
    expect(second.uniforms.uSurfOrm).toBe(first.uniforms.uSurfOrm);
    expect(second.uniforms.uSurfNormal).toBe(first.uniforms.uSurfNormal);
    expect(compiled(createSurfaceMaterial('concrete')).uniforms.uSurfColor).not.toBe(first.uniforms.uSurfColor);
  });

  test('潮濕程度是全庫共用的一個值，夾在 0–1', () => {
    const material = compiled(createSurfaceMaterial('concrete'));
    expect(material.uniforms.uSurfWet).toBe(SURFACE_WETNESS);
    setSurfaceWetness(2);
    expect(SURFACE_WETNESS.value).toBe(1);
    setSurfaceWetness(-1);
    expect(SURFACE_WETNESS.value).toBe(0);
  });

  test('天氣：晴天、黃昏、夜晚的建築是乾的；雨天、雷雨最濕，雨後居中', () => {
    expect(WEATHER_PRESETS.clear.surfaceWetness).toBe(0);
    expect(WEATHER_PRESETS.dusk.surfaceWetness).toBe(0);
    expect(WEATHER_PRESETS.night.surfaceWetness).toBe(0);
    expect(WEATHER_PRESETS.wet.surfaceWetness).toBeGreaterThan(0.2);
    expect(WEATHER_PRESETS.rain.surfaceWetness).toBeGreaterThan(WEATHER_PRESETS.wet.surfaceWetness);
    expect(WEATHER_PRESETS.storm.surfaceWetness).toBeGreaterThanOrEqual(WEATHER_PRESETS.rain.surfaceWetness);
  });
});

describe('材質工廠 createSurfaceMaterial', () => {
  test.each(SURFACE_IDS)('%s：不需要 WebGL，數值就是這種表面的基準', (id) => {
    const material = createSurfaceMaterial(id);
    const spec = SURFACE_SPECS[id];
    expect(surfaceOf(material)).toBe(id);
    expect(material.roughness).toBe(spec.roughness);
    expect(material.metalness).toBe(spec.metalness);
    expect(material.color.getHex()).toBe(spec.color);
    expect(material instanceof MeshPhysicalMaterial).toBe(spec.clearcoat > 0);
    if (material instanceof MeshPhysicalMaterial) {
      expect(material.clearcoat).toBe(spec.clearcoat);
    }
  });

  test('顏色、粗糙度、金屬度、清漆、透明度可以由呼叫端指定', () => {
    const paint = createSurfaceMaterial('carPaint', { color: 0xff0000, roughness: 0.2, metalness: 0.6, clearcoat: 0 });
    expect(paint instanceof MeshPhysicalMaterial).toBe(false);
    expect(paint.color.getHex()).toBe(0xff0000);
    expect(paint.roughness).toBe(0.2);
    expect(paint.metalness).toBe(0.6);
    const glass = createSurfaceMaterial('glass', { parameters: { transparent: true, opacity: 0.4, side: DoubleSide } });
    expect(glass.transparent).toBe(true);
    expect(glass.opacity).toBe(0.4);
  });

  test('著色器掛鉤插得進這一版 three：三面投影的取樣、粗糙度、金屬度、法線、AO 都接上', () => {
    const { vertexShader, fragmentShader } = compiled(createScenerySurface('brick'));
    expect(vertexShader).toContain('#define SURF_WORLD');
    // 世界座標：實例矩陣也乘進去，InstancedMesh 不必拆。
    expect(vertexShader).toContain('surfWorld = instanceMatrix * surfWorld;');
    expect(vertexShader).toContain('vSurfPos = ( modelMatrix * surfWorld ).xyz;');
    expect(fragmentShader).toContain('uniform sampler2D uSurfColor;');
    expect(fragmentShader).toContain('roughnessFactor = clamp( sRough, 0.04, 1.0 );');
    expect(fragmentShader).toContain('metalnessFactor = clamp( sMetal, 0.0, 1.0 );');
    expect(fragmentShader).toContain('reflectedLight.indirectDiffuse *= surfAo;');
    // 三個投影面：YZ、XZ、XY。
    for (const plane of ['sQ.zy', 'sQ.xz', 'sQ.xy']) {
      expect(fragmentShader).toContain(plane);
    }
    // 掛鉤接在 three 原本的片段後面，不是取代它們。
    expect(fragmentShader).toContain('#include <normal_fragment_maps>');
    expect(fragmentShader).toContain('#include <aomap_fragment>');
  });

  test('world 用世界座標、local 用物件座標（跟著車走）、radial 繞輪軸；程式快取鍵各自不同', () => {
    const world = createSurfaceMaterial('plastic');
    const local = createSurfaceMaterial('plastic', { space: 'local' });
    const radial = createSurfaceMaterial('tire', { space: 'radial', radial: [6, 0.1, 0.2, 0.32] });
    expect(compiled(local).vertexShader).not.toContain('#define SURF_WORLD');
    expect(compiled(local).vertexShader).toContain('vSurfPos = transformed;');
    expect(compiled(radial).fragmentShader).toContain('#define SURF_RADIAL');
    const keys = [world, local, radial].map((material) => material.customProgramCacheKey());
    expect(new Set(keys).size).toBe(3);
    // 同一種取樣方式的不同表面共用同一個程式（只差 uniform）。
    expect(createSurfaceMaterial('chrome', { space: 'local' }).customProgramCacheKey()).toBe(
      createSurfaceMaterial('carPaint', { space: 'local' }).customProgramCacheKey(),
    );
  });

  test('髒污只給 world；潮濕預設只作用在 world（車身不會在雨天變色）', () => {
    const scenery = compiled(createScenerySurface('concrete'));
    expect(scenery.fragmentShader).toContain('#define SURF_OVERLAYS');
    expect((scenery.uniforms.uSurfParams?.value as { w: number }).w).toBe(1);
    const car = compiled(createSurfaceMaterial('carPaint', { space: 'local' }));
    expect(car.fragmentShader).not.toContain('#define SURF_OVERLAYS');
    expect((car.uniforms.uSurfParams?.value as { w: number }).w).toBe(0);
  });
});

describe('畫質級別 → 材質細節', () => {
  test('貼圖邊長隨級別變大；low 沒有法線、只取樣一面；high 以上三面混合', () => {
    const sizes = QUALITY_LEVELS.map((level) => QUALITY_PRESETS[level].materials.textureSizePx);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    expect(new Set(sizes).size).toBe(sizes.length);
    expect(QUALITY_PRESETS.low.materials.normals).toBe(false);
    expect(QUALITY_PRESETS.low.materials.triplanarBlend).toBe(false);
    expect(QUALITY_PRESETS.medium.materials.normals).toBe(true);
    expect(QUALITY_PRESETS.high.materials.triplanarBlend).toBe(true);
    expect(QUALITY_PRESETS.ultra.materials.triplanarBlend).toBe(true);
  });
});

describe('場景裡的物件換成了庫材質', () => {
  test('玩家車：烤漆（清漆）、玻璃（透明）、塑膠、鉻、輪胎都是庫材質，用物件座標', () => {
    const car = createCarMesh('high');
    const surfaces = surfacesIn(car.root);
    for (const id of ['carPaint', 'glass', 'plastic', 'chrome', 'tire'] as const) {
      expect(surfaces, id).toContain(id);
    }
    const paint = car.body.material;
    expect(paint).toBeInstanceOf(MeshPhysicalMaterial);
    expect(surfaceOf(paint as Material)).toBe('carPaint');
    expect((paint as MeshPhysicalMaterial).clearcoat).toBe(CAR_VISUAL_CONFIG.clearcoat);
    expect((paint as MeshPhysicalMaterial).metalness).toBe(CAR_VISUAL_CONFIG.bodyMetalness);
    expect(compiled(paint as Material).vertexShader).not.toContain('#define SURF_WORLD');
    const glass = car.glass.material as MeshStandardMaterial;
    expect(surfaceOf(glass)).toBe('glass');
    expect(glass.transparent).toBe(true);
    expect(glass.opacity).toBe(CAR_VISUAL_CONFIG.glassOpacity);
    expect(glass.opacity).toBeLessThan(1);
  });

  test('背景車：與玩家車同一套表面，車色仍是每台各自的實例顏色，烤漆不開清漆', () => {
    const cars = createParkedCars(
      [0.1, 0.5, 0.9].map((variant, index) => ({
        x: index * 4, y: 0, z: 0, headingRad: 0, sizeX: 1.8, sizeY: 0, sizeZ: 4.6, variant,
      })),
      'high',
    );
    const surfaces = surfacesIn(cars);
    for (const id of ['carPaint', 'glass', 'plastic', 'chrome', 'tire'] as const) {
      expect(surfaces, id).toContain(id);
    }
    const paint = cars.getObjectByName('parkedCars:paint');
    expect(paint).toBeInstanceOf(InstancedMesh);
    const mesh = paint as InstancedMesh;
    expect(mesh.material instanceof MeshPhysicalMaterial).toBe(false);
    expect(mesh.count).toBe(3);
    const colors = [0, 1, 2].map((index) => {
      const color = new Color();
      mesh.getColorAt(index, color);
      return color.getHex();
    });
    expect(new Set(colors).size).toBeGreaterThan(1);
  });

  test('路緣石與車擋是水泥', () => {
    expect(surfacesIn(createCurbs(requireLevel('prototype').layout.spot))).toEqual(new Set(['concrete']));
    expect(surfaceOf(createWheelStopMaterial())).toBe('concrete');
  });

  test.each([
    ['w1_l03', ['concrete', 'paintedMetal', 'corrugated']],
    ['w1_l05', ['brick', 'concrete', 'paintedMetal', 'plaster']],
    ['w1_l08', ['brick', 'concrete', 'plaster', 'wornPaint']],
    ['w1_l10', ['paintedMetal', 'corrugated', 'wornPaint']],
  ] as const)('%s 的環境用到這些表面', (id, expected) => {
    const surfaces = surfacesIn(environmentOf(id));
    for (const surface of expected) {
      expect(surfaces, surface).toContain(surface);
    }
  });

  test('環境方塊：每種表面一個 InstancedMesh（最多六個），實例總數等於方塊數；亮著的窗仍是不吃光的玻璃', () => {
    for (const id of ['w1_l03', 'w1_l05', 'w1_l08', 'w1_l10']) {
      const level = requireLevel(id);
      const layout = createEnvironmentLayout(level, QUALITY_PRESETS.high.props);
      if (layout === undefined) {
        throw new Error(`${id} 沒有環境`);
      }
      const environment = environmentOf(id);
      const slabMeshes: InstancedMesh[] = [];
      environment.traverse((object) => {
        if (object instanceof InstancedMesh && object.name === 'environmentSlabs') {
          slabMeshes.push(object);
        }
      });
      const boxes = layout.slabs.filter((slab) => slab.facingRad === undefined);
      expect(slabMeshes.length, id).toBe(new Set(boxes.map((slab) => slab.surface)).size);
      expect(slabMeshes.length, id).toBeLessThanOrEqual(6);
      expect(slabMeshes.reduce((sum, mesh) => sum + mesh.count, 0), id).toBe(boxes.length);
      for (const mesh of slabMeshes) {
        expect(surfaceOf(mesh.material as Material), id).toBe(mesh.userData.surface);
      }
      const glass = environment.getObjectByName('environmentGlass');
      if (layout.slabs.some((slab) => slab.lit !== undefined)) {
        expect(glass, id).toBeInstanceOf(InstancedMesh);
        expect(surfaceOf((glass as InstancedMesh).material as Material), id).toBeUndefined();
      }
    }
  });

  test('方塊的表面：標線是磨損的漆，沒登記的顏色當粉刷牆', () => {
    expect(slabSurface('flat', 0xffffff)).toBe('wornPaint');
    expect(slabSurface('solid', 0x123456)).toBe('plaster');
    expect(slabSurface('solid', 0x9a5a44)).toBe('brick');
  });

  test('障礙物：每一種各有表面；巷子與郵局的牆是磚，矮路緣是水泥', () => {
    expect(WALL_SURFACES.narrow_alley).toBe('brick');
    expect(WALL_SURFACES.post_office).toBe('brick');
    expect(OBSTACLE_SURFACES.cone).toBe('plastic');
    expect(OBSTACLE_SURFACES.dumpster).toBe('rustedIron');
    const alley = createObstacleMeshes(requireLevel('w1_l10'));
    const bounds = alley.getObjectByName('bounds');
    expect(surfaceOf((bounds as InstancedMesh).material as Material)).toBe('brick');
    const lot = createObstacleMeshes(requireLevel('w1_l03'));
    expect(surfaceOf((lot.getObjectByName('bounds') as InstancedMesh).material as Material)).toBe('concrete');
    // 模型上的金屬是上了漆的：金屬度不高，顏色來自頂點顏色。
    for (const material of materialsIn(lot)) {
      if (surfaceOf(material) !== undefined && material instanceof MeshStandardMaterial && material.vertexColors) {
        expect(material.metalness).toBeLessThanOrEqual(0.45);
      }
    }
  });
});
