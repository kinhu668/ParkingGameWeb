// 第 3 階段的陰影：建築（環境的主建築、背景樓）、巷子的高牆與邊界、假車位的車擋都要投影；
// 建築的影子在太陽很低時有長度上限（props/shadowReach.ts），不會把整個場地罩進影子裡。不開 WebGL。
import { InstancedMesh, Matrix4, MeshDepthMaterial, ShaderLib, Vector3, type Object3D } from 'three';
import { describe, expect, test } from 'vitest';
import { DEFAULT_SEED } from '../src/core/gameConfig';
import { degToRad, ftToM } from '../src/core/units';
import { WEATHER_IDS } from '../src/core/weather';
import { LEVELS, levelById } from '../src/level/levelCatalog';
import type { LevelDefinition } from '../src/level/levelSchema';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import { createEnvironmentLayout } from '../src/props/environmentLayout';
import { createEnvironment } from '../src/props/environments';
import { createLotLayout } from '../src/props/lotLayout';
import { createLotProps } from '../src/props/lotProps';
import { BOUNDS_STYLES, WALL_STYLES, createObstacleMeshes } from '../src/props/obstacleMeshes';
import {
  SHADOW_MAX_HEIGHT_UNIFORM,
  buildingShadowMaxHeightM,
  capShadowVertexShader,
  createCappedShadowDepthMaterial,
} from '../src/props/shadowReach';
import { QUALITY_LEVELS, usesHdrChain } from '../src/render/quality';
import { QUALITY_PRESETS, SUN_CONFIG } from '../src/render/renderConfig';
import { boundsShadowBox, lotShadowBox } from '../src/render/scene';
import { fitShadowBox } from '../src/render/shadowArea';
import { SUN_DIRECTION, directionToSun } from '../src/render/sky';
import { weatherPreset } from '../src/render/weatherPresets';

function requireLevel(id: string): LevelDefinition {
  const level = levelById(id);
  if (level === undefined) {
    throw new Error(`找不到 ${id}`);
  }
  return level;
}

function named(root: Object3D, name: string): InstancedMesh {
  const found = root.getObjectByName(name);
  if (!(found instanceof InstancedMesh)) {
    throw new Error(`沒有 ${name}`);
  }
  return found;
}

function environmentOf(id: string, shadowHeightM?: number): Object3D {
  const level = requireLevel(id);
  const props = QUALITY_PRESETS.high.props;
  const layout = createEnvironmentLayout(level, props);
  if (layout === undefined) {
    throw new Error(`${id} 沒有環境佈局`);
  }
  return createEnvironment(level.layout.spot, layout, props, true, true, shadowHeightM);
}

function sunOf(weather: (typeof WEATHER_IDS)[number]): { x: number; y: number; z: number } {
  const { sun } = weatherPreset(weather);
  return directionToSun(degToRad(sun.azimuthDeg), degToRad(sun.elevationDeg));
}

/** 這個 InstancedMesh 裡最高的實例頂多高（公尺；單位方塊的實例）。 */
function tallestTopM(mesh: InstancedMesh): number {
  const matrix = new Matrix4();
  const position = new Vector3();
  const scale = new Vector3();
  let top = 0;
  for (let index = 0; index < mesh.count; index += 1) {
    mesh.getMatrixAt(index, matrix);
    position.setFromMatrixPosition(matrix);
    scale.setFromMatrixScale(matrix);
    top = Math.max(top, position.y + scale.y);
  }
  return top;
}

/** onBeforeCompile 會動到的兩個欄位。 */
interface CompiledShader {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
}

describe('建築的影子長度上限', () => {
  test('上限高度 = 影子長度上限 × tan(仰角)：黃昏很矮，晴天、雨天、夜晚比兩層樓高', () => {
    const reach = SUN_CONFIG.buildingShadowReachM;
    expect(buildingShadowMaxHeightM(SUN_DIRECTION)).toBeCloseTo(
      reach * Math.tan(degToRad(SUN_CONFIG.elevationDeg)),
      6,
    );
    // 黃昏：一棟樓照實投影會有樓高的六倍長；壓到比一層樓還矮，影子最長就是 reach。
    expect(buildingShadowMaxHeightM(sunOf('dusk'))).toBeLessThan(ftToM(12));
    expect(buildingShadowMaxHeightM(sunOf('dusk'))).toBeGreaterThan(ftToM(6));
    for (const weather of ['clear', 'rain', 'storm', 'night'] as const) {
      expect(buildingShadowMaxHeightM(sunOf(weather)), weather).toBeGreaterThan(ftToM(40));
    }
    // 任何天氣影子都不比 reach 長（上限高度 ÷ tan(仰角) = reach）。
    for (const weather of WEATHER_IDS) {
      const sun = sunOf(weather);
      const lengthM = (buildingShadowMaxHeightM(sun) * Math.hypot(sun.x, sun.z)) / sun.y;
      expect(lengthM, weather).toBeCloseTo(reach, 6);
    }
    // 正上方的光沒有水平分量：不設限。
    expect(buildingShadowMaxHeightM({ x: 0, y: 1, z: 0 })).toBe(Infinity);
    // 影子長度上限比一個車位長、比原型關的場地短（不會橫跨全場）。
    expect(reach).toBeGreaterThan(PROTOTYPE_LAYOUT.spot.lengthM);
    expect(reach).toBeLessThan(ftToM(100));
  });

  test('深度材質：把高過上限的頂點壓到上限高度（世界座標），其餘照 three 內建的做', () => {
    const original = ShaderLib.depth.vertexShader;
    const capped = capShadowVertexShader(original);
    expect(original).toContain('#include <project_vertex>');
    expect(capped).not.toContain('#include <project_vertex>');
    expect(capped).toContain(`uniform float ${SHADOW_MAX_HEIGHT_UNIFORM};`);
    expect(capped).toContain(`min( cappedWorld.y, ${SHADOW_MAX_HEIGHT_UNIFORM} )`);
    // InstancedMesh 的實例矩陣要先乘，才換成世界座標。
    expect(capped.indexOf('instanceMatrix * mvPosition')).toBeLessThan(
      capped.indexOf('modelMatrix * mvPosition'),
    );
    expect(capped).toContain('vHighPrecisionZW = gl_Position.zw;');

    const material = createCappedShadowDepthMaterial(3.5);
    expect(material).toBeInstanceOf(MeshDepthMaterial);
    const shader: CompiledShader = { uniforms: {}, vertexShader: original };
    // onBeforeCompile 只動 uniforms 與 vertexShader；其餘欄位用不到。
    (material.onBeforeCompile as (compiled: CompiledShader) => void)(shader);
    expect(shader.uniforms[SHADOW_MAX_HEIGHT_UNIFORM]?.value).toBe(3.5);
    expect(shader.vertexShader).toBe(capped);
    // 與 three 內建的深度材質分開快取。
    expect(material.customProgramCacheKey()).not.toBe(new MeshDepthMaterial().customProgramCacheKey());
  });
});

describe('建築會投影', () => {
  // 以前主建築與背景樓都不投影（怕黃昏的低太陽把場地罩黑）；現在一律投影，低太陽時靠影子長度上限。
  test.each(['w1_l03', 'w1_l05', 'w1_l08', 'w1_l10'])('%s：主建築（environmentSlabs）投影', (id) => {
    const slabs = named(environmentOf(id), 'environmentSlabs');
    expect(slabs.castShadow).toBe(true);
    expect(slabs.receiveShadow).toBe(true);
    // 沒給上限 = 照實投影，用 three 內建的深度材質。
    expect(slabs.customDepthMaterial).toBeUndefined();
    // 真的有夠高的體塊（不是只有人行道）。
    expect(tallestTopM(slabs)).toBeGreaterThan(ftToM(10));
  });

  test('給了上限：主建築與背景樓都換成有上限的深度材質；畫面上的網格不變', () => {
    const capM = buildingShadowMaxHeightM(sunOf('dusk'));
    // 郵局有主建築也有背景樓；街道只有主建築（environmentSlabs）。
    for (const [id, names] of [
      ['w1_l05', ['environmentSlabs', 'buildings']],
      ['w1_l08', ['environmentSlabs']],
    ] as const) {
      const free = environmentOf(id);
      const capped = environmentOf(id, capM);
      for (const name of names) {
        const mesh = named(capped, name);
        expect(mesh.castShadow, `${id} ${name}`).toBe(true);
        expect(mesh.customDepthMaterial, `${id} ${name}`).toBeInstanceOf(MeshDepthMaterial);
        expect(mesh.customDepthMaterial?.userData[SHADOW_MAX_HEIGHT_UNIFORM]).toBe(capM);
        // 上限真的比樓矮（否則等於沒壓）。
        expect(tallestTopM(mesh)).toBeGreaterThan(capM);
        // 看得到的網格一模一樣：只有影子變短。
        expect(Array.from(mesh.instanceMatrix.array)).toEqual(
          Array.from(named(free, name).instanceMatrix.array),
        );
      }
    }
  });

  test.each(QUALITY_LEVELS)('原型關 %s：背景樓投影，黃昏有上限', (level) => {
    const quality = QUALITY_PRESETS[level];
    const { spot, startState } = PROTOTYPE_LAYOUT;
    const layout = createLotLayout(spot, startState, DEFAULT_SEED, quality.props);
    const capM = buildingShadowMaxHeightM(SUN_DIRECTION);
    const group = createLotProps(spot, layout, quality.props, usesHdrChain(quality), true, 'classic', capM);
    const buildings = named(group, 'buildings');
    expect(buildings.castShadow).toBe(true);
    expect(buildings.customDepthMaterial?.userData[SHADOW_MAX_HEIGHT_UNIFORM]).toBe(capM);
    // 窗是不吃光的薄片，不投影。
    expect(named(group, 'buildingWindows').castShadow).toBe(false);
    // 既有的投影物沒有弄丟。
    for (const name of ['concrete', 'lampPoles', 'treeTrunks', 'foliage']) {
      const mesh = group.getObjectByName(name);
      if (mesh !== undefined) {
        expect(mesh.castShadow, name).toBe(true);
      }
    }
    expect(named(group, 'parkedCars:paint').castShadow).toBe(true);
  });
});

describe('牆與邊界會投影', () => {
  // 以前高於 10 ft 的牆與邊界不投影（怕巷子全黑）；巷子裡一邊在影子裡才是對的。
  test('窄巷：兩側的高牆（bounds）與牆障礙物（wall）都投影', () => {
    const level = requireLevel('w1_l10');
    expect(level.environment).toBe('narrow_alley');
    expect(BOUNDS_STYLES.narrow_alley.heightFt).toBeGreaterThan(10);
    expect(WALL_STYLES.narrow_alley.heightFt).toBeGreaterThan(10);
    const group = createObstacleMeshes(level, 'low');
    const bounds = named(group, 'bounds');
    expect(bounds.castShadow).toBe(true);
    expect(bounds.receiveShadow).toBe(true);
    expect(bounds.count).toBe(4);
    const walls = named(group, 'obstacle:wall');
    expect(walls.count).toBeGreaterThan(0);
    expect(walls.castShadow).toBe(true);
    // 牆照實投影：不用有上限的深度材質。
    expect(bounds.customDepthMaterial).toBeUndefined();
    expect(walls.customDepthMaterial).toBeUndefined();
  });

  test('每一關的每一種障礙物與邊界都投影', () => {
    for (const level of LEVELS) {
      createObstacleMeshes(level, 'low').traverse((child) => {
        if (child instanceof InstancedMesh && (child.name === 'bounds' || child.name.startsWith('obstacle:'))) {
          expect(child.castShadow, `${level.id} ${child.name}`).toBe(true);
        }
      });
    }
  });
});

describe('陰影相機的近平面容得下高的投影物', () => {
  const corners = [
    { x: -20, z: -30 },
    { x: 20, z: -30 },
    { x: 20, z: 30 },
    { x: -20, z: 30 },
  ];

  test('casterHeightM 只把近平面往太陽推，範圍的寬高與遠平面不變', () => {
    for (const weather of WEATHER_IDS) {
      const sun = sunOf(weather);
      const low = fitShadowBox(sun, corners, 8, 60, 3);
      const tall = fitShadowBox(sun, corners, 8, 60, 3, 20);
      expect(tall.near, weather).toBeLessThan(low.near);
      expect({ ...tall, near: low.near }, weather).toEqual(low);
      // 不給就是原本的行為；給得比 maxHeightM 矮也不會把近平面往回拉。
      expect(fitShadowBox(sun, corners, 8, 60, 3, 8)).toEqual(low);
      expect(fitShadowBox(sun, corners, 8, 60, 3, 2)).toEqual(low);
    }
  });

  test('範圍內 casterHeightM 高的點都在近平面之後（不會被切掉）', () => {
    const sun = sunOf('clear');
    const length = Math.hypot(sun.x, sun.y, sun.z);
    const box = fitShadowBox(sun, corners, 8, 60, 3, 20);
    for (const corner of corners) {
      // 這一點沿光線方向離目標點多遠（朝太陽為正）；離光源的距離 = 60 − 這個值。
      const towardSun =
        ((corner.x - box.targetX) * sun.x + 20 * sun.y + (corner.z - box.targetZ) * sun.z) / length;
      expect(60 - towardSun).toBeGreaterThan(box.near);
    }
  });

  test('遊戲的陰影範圍：窄巷的牆頂、每一關最高的主建築體塊都不超過 lotShadowCasterHeightM', () => {
    expect(SUN_CONFIG.lotShadowCasterHeightM).toBeGreaterThan(SUN_CONFIG.lotShadowMaxHeightM);
    expect(ftToM(BOUNDS_STYLES.narrow_alley.heightFt * 1.5)).toBeLessThan(
      SUN_CONFIG.lotShadowCasterHeightM,
    );
    for (const id of ['w1_l03', 'w1_l05', 'w1_l08', 'w1_l10']) {
      expect(tallestTopM(named(environmentOf(id), 'environmentSlabs')), id).toBeLessThanOrEqual(
        SUN_CONFIG.lotShadowCasterHeightM,
      );
    }
    // 近平面一定在遠平面之前；原型關的場地很大，換成高太陽的天氣時近平面會退到光源後面（負值），不夾住。
    for (const weather of WEATHER_IDS) {
      const sun = sunOf(weather);
      const boxes = [
        lotShadowBox(PROTOTYPE_LAYOUT.spot, sun),
        ...LEVELS.flatMap((level) =>
          level.boundsFt === undefined ? [] : [boundsShadowBox(level.boundsFt, sun)],
        ),
      ];
      for (const box of boxes) {
        expect(box.near, weather).toBeLessThan(box.far);
        expect(Number.isFinite(box.near), weather).toBe(true);
      }
    }
    expect(lotShadowBox(PROTOTYPE_LAYOUT.spot, sunOf('clear')).near).toBeLessThan(0);
  });
});
