// 目標車位的發光標記：貼著車位輪廓的低矮光牆（位置、大小、向上淡出）、頂端比每個鏡頭都低（不會包住鏡頭）、
// 由時間決定的脈動、停妥後變綠再淡出與重來、不是會被遮擋半透明淡掉的擺設、倒車輔助小畫面裡不畫。不開 WebGL。
import { Box3, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, Scene, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { GAME_CAMERA_VIEWS } from '../src/core/cameraView';
import { ftToM } from '../src/core/units';
import { LEVELS, levelById } from '../src/level/levelCatalog';
import type { ParkingSpot } from '../src/level/parkingJudge';
import { PROTOTYPE_LAYOUT, PROTOTYPE_LEVEL } from '../src/level/prototypeLayout';
import { createEnvironmentLayout } from '../src/props/environmentLayout';
import { createEnvironment } from '../src/props/environments';
import { spotLocalToWorld, worldToSpotLocal } from '../src/props/lotLayout';
import { occludersOf } from '../src/props/occluders';
import {
  createGlowGeometry,
  createSpotGlow,
  glowGreenMix,
  glowParkedFade,
  glowPulse,
  glowWallAlpha,
} from '../src/props/spotGlow';
import { SKIP_AMBIENT_OCCLUSION } from '../src/render/ambientOcclusionFlag';
import { createGameCamera } from '../src/render/gameCamera';
import { createOcclusionFade } from '../src/render/occlusionFade';
import {
  GAME_CAMERA_CONFIG,
  QUALITY_PRESETS,
  SPOT_GLOW_CONFIG as CONFIG,
  SPOT_MARKING_CONFIG,
} from '../src/render/renderConfig';

const FRAME_SECONDS = 1 / 60;
const EPSILON_M = 1e-5;
/** 停妥後到完全淡出的總時間。 */
const PARKED_TOTAL_SECONDS = CONFIG.greenHoldSeconds + CONFIG.fadeSeconds;

function spotOf(levelId: string): ParkingSpot {
  const level = levelById(levelId);
  if (level === undefined) {
    throw new Error(`沒有 ${levelId}`);
  }
  return level.layout.spot;
}

function meshOf(root: Group): Mesh {
  const mesh = root.getObjectByName('spotGlowMesh');
  if (!(mesh instanceof Mesh)) {
    throw new Error('找不到發光標記的網格');
  }
  return mesh;
}

function materialOf(root: Group): MeshBasicMaterial {
  const material = meshOf(root).material;
  if (!(material instanceof MeshBasicMaterial)) {
    throw new Error('發光標記的材質應該是 MeshBasicMaterial');
  }
  return material;
}

/** 每個頂點：世界座標與不透明度。 */
function worldVertices(root: Group): { point: Vector3; alpha: number }[] {
  root.updateMatrixWorld(true);
  const mesh = meshOf(root);
  const positions = mesh.geometry.getAttribute('position');
  const colors = mesh.geometry.getAttribute('color');
  return Array.from({ length: positions.count }, (_, index) => ({
    point: new Vector3().fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld),
    alpha: colors.getW(index),
  }));
}

describe('位置與形狀：貼著車位輪廓、從地面升起的矮牆', () => {
  // 原型關（沒有環境模組）、正向車位、直線倒車（車位在起點後方）、側向停車（heading 90°、車位很長）、窄巷。
  test.each(['prototype', 'w1_l01', 'w1_l05', 'w1_l08', 'w1_l09', 'w1_l10'])(
    '%s：光牆的四個面就在車位的四個邊上，從地面到 heightM',
    (levelId) => {
      const spot = spotOf(levelId);
      const glow = createSpotGlow(spot);
      const halfW = spot.widthM / 2;
      const halfL = spot.lengthM / 2;
      let highest = 0;
      let onOutline = 0;
      for (const { point } of worldVertices(glow.root)) {
        const local = worldToSpotLocal(spot, point.x, point.z);
        // 沒有任何一點超出車位（輪廓就是判定用的邊界）。
        expect(Math.abs(local.x)).toBeLessThanOrEqual(halfW + EPSILON_M);
        expect(Math.abs(local.z)).toBeLessThanOrEqual(halfL + EPSILON_M);
        expect(point.y).toBeGreaterThanOrEqual(CONFIG.liftM - EPSILON_M);
        highest = Math.max(highest, point.y);
        const onEdge =
          Math.abs(Math.abs(local.x) - halfW) < EPSILON_M || Math.abs(Math.abs(local.z) - halfL) < EPSILON_M;
        if (point.y > CONFIG.liftM + EPSILON_M) {
          // 高於地面的頂點都是牆：一定在輪廓上（沒有蓋子、沒有往車位中間伸的東西）。
          expect(onEdge).toBe(true);
        }
        onOutline += onEdge ? 1 : 0;
      }
      expect(highest).toBeCloseTo(CONFIG.heightM, 6);
      expect(onOutline).toBeGreaterThan(0);
      // 四個角都有牆立到頂。
      for (const [signX, signZ] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
        const corner = spotLocalToWorld(spot, signX * halfW, signZ * halfL);
        const atCorner = worldVertices(glow.root).filter(
          ({ point }) => Math.hypot(point.x - corner.x, point.z - corner.z) < EPSILON_M,
        );
        expect(Math.max(...atCorner.map(({ point }) => point.y))).toBeCloseTo(CONFIG.heightM, 6);
      }
    },
  );

  test('每一關的標記都在自己的車位上（含原型關）', () => {
    for (const level of [PROTOTYPE_LEVEL, ...LEVELS]) {
      const { spot } = level.layout;
      const snapshot = createSpotGlow(spot).snapshot();
      expect(ftToM(snapshot.xFt)).toBeCloseTo(spot.x, 9);
      expect(ftToM(snapshot.zFt)).toBeCloseTo(spot.z, 9);
      expect(ftToM(snapshot.widthFt)).toBeCloseTo(spot.widthM, 9);
      expect(ftToM(snapshot.lengthFt)).toBeCloseTo(spot.lengthM, 9);
      expect(ftToM(snapshot.heightFt)).toBeCloseTo(CONFIG.heightM, 9);
      expect(snapshot).toMatchObject({ pulse: 1, green: 0, opacity: 1, visible: true });
    }
  });

  test('側向停車的車位（heading 90°）：長邊沿世界 X', () => {
    const spot = spotOf('w1_l08');
    const glow = createSpotGlow(spot);
    glow.root.updateMatrixWorld(true);
    const size = new Box3().setFromObject(glow.root).getSize(new Vector3());
    expect(size.x).toBeCloseTo(spot.lengthM, 5);
    expect(size.z).toBeCloseTo(spot.widthM, 5);
  });

  test('向上淡出：貼地最濃，越高越淡，頂端完全透明', () => {
    expect(glowWallAlpha(0)).toBe(CONFIG.wallOpacity);
    expect(glowWallAlpha(1)).toBe(0);
    let previous = glowWallAlpha(0);
    for (let step = 1; step <= 20; step += 1) {
      const alpha = glowWallAlpha(step / 20);
      expect(alpha).toBeLessThan(previous);
      previous = alpha;
    }
    // 上半段只剩薄薄一層：不擋後面的東西。
    expect(glowWallAlpha(0.5)).toBeLessThan(CONFIG.wallOpacity * 0.4);

    const vertices = worldVertices(createSpotGlow(PROTOTYPE_LAYOUT.spot).root);
    for (const { point, alpha } of vertices) {
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(1);
      if (point.y > CONFIG.liftM + EPSILON_M) {
        const t = (point.y - CONFIG.liftM) / (CONFIG.heightM - CONFIG.liftM);
        expect(alpha).toBeCloseTo(glowWallAlpha(t), 5);
      }
    }
    const top = vertices.filter(({ point }) => Math.abs(point.y - CONFIG.heightM) < EPSILON_M);
    expect(top.length).toBeGreaterThan(0);
    expect(top.every(({ alpha }) => alpha === 0)).toBe(true);
  });

  test('貼地的光暈：輪廓上最濃，往車位中心淡到 0；略高於標線（俯視鏡頭靠它）', () => {
    const spot = PROTOTYPE_LAYOUT.spot;
    const ground = worldVertices(createSpotGlow(spot).root).filter(
      ({ point }) => Math.abs(point.y - CONFIG.liftM) < EPSILON_M,
    );
    const inner = ground.filter(({ alpha }) => alpha === 0);
    expect(inner.length).toBeGreaterThan(0);
    for (const { point } of inner) {
      const local = worldToSpotLocal(spot, point.x, point.z);
      expect(spot.widthM / 2 - Math.abs(local.x)).toBeCloseTo(CONFIG.groundBandM, 5);
      expect(spot.lengthM / 2 - Math.abs(local.z)).toBeCloseTo(CONFIG.groundBandM, 5);
    }
    expect(ground.some(({ alpha }) => Math.abs(alpha - CONFIG.groundOpacity) < 1e-6)).toBe(true);
    expect(CONFIG.liftM).toBeGreaterThan(SPOT_MARKING_CONFIG.liftM);
    expect(CONFIG.liftM).toBeLessThan(ftToM(0.2));
  });

  test('很小的車位：光暈不會縮過中心', () => {
    const geometry = createGlowGeometry({ widthM: 0.6, lengthM: 4 });
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    expect(box?.max.x).toBeCloseTo(0.3, 6);
    expect(box?.min.x).toBeCloseTo(-0.3, 6);
  });
});

describe('不擋鏡頭：鏡頭不可能在標記裡面', () => {
  test('光牆頂端比每一個鏡頭模式的鏡頭都低', () => {
    const cameraHeights = [
      GAME_CAMERA_CONFIG.chaseNear.heightM,
      GAME_CAMERA_CONFIG.chaseFar.heightM,
      GAME_CAMERA_CONFIG.hood.heightM,
      GAME_CAMERA_CONFIG.cockpit.heightM,
      GAME_CAMERA_CONFIG.top.heightM,
    ];
    expect(CONFIG.heightM).toBeLessThan(Math.min(...cameraHeights));
  });

  test('每一關、每個鏡頭模式的起點：鏡頭都在標記的包圍盒之外', () => {
    for (const level of [PROTOTYPE_LEVEL, ...LEVELS]) {
      const glow = createSpotGlow(level.layout.spot);
      glow.root.updateMatrixWorld(true);
      const box = new Box3().setFromObject(glow.root);
      for (const view of GAME_CAMERA_VIEWS) {
        const camera = createGameCamera(view, level.layout.startState).camera;
        expect(box.containsPoint(camera.position), `${level.id} ${view}`).toBe(false);
        // 近平面也碰不到牆頂。
        expect(camera.position.y - camera.near, `${level.id} ${view}`).toBeGreaterThan(box.max.y);
      }
    }
  });

  test('w1_l05（直線倒車）：遠距跟車的鏡頭就在車位正上方，以前被吊在空中的箭頭包住', () => {
    const level = levelById('w1_l05');
    if (level === undefined) {
      throw new Error('沒有 w1_l05');
    }
    const { spot, startState } = level.layout;
    const camera = createGameCamera('chase_far', startState).camera;
    // 鏡頭的水平位置落在車位的範圍裡（這就是那個 bug 的幾何條件）…
    const local = worldToSpotLocal(spot, camera.position.x, camera.position.z);
    expect(Math.abs(local.x)).toBeLessThan(spot.widthM / 2);
    expect(Math.abs(local.z)).toBeLessThan(spot.lengthM / 2);
    // …但標記只到腰的高度，鏡頭在它上方很遠的地方。
    expect(camera.position.y).toBeGreaterThan(CONFIG.heightM + 5);
  });
});

describe('材質：自己發亮、半透明、純視覺', () => {
  test('不吃燈、不吃霧、不寫深度、兩面都畫、不投影；琥珀色、沒有過曝成白', () => {
    const glow = createSpotGlow(PROTOTYPE_LAYOUT.spot);
    const material = materialOf(glow.root);
    expect(material.fog).toBe(false);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.side).toBe(DoubleSide);
    expect(material.vertexColors).toBe(true);
    expect(material.opacity).toBe(1);
    expect(material.color.getHex()).toBe(CONFIG.color);
    const { r, g, b } = material.color;
    expect(Math.max(r, g, b)).toBeLessThanOrEqual(1);
    expect(r).toBeGreaterThan(b * 3);

    glow.root.traverse((object) => {
      expect(object.castShadow).toBe(false);
      expect(object.receiveShadow).toBe(false);
    });
    // 不參與環境光遮蔽。
    expect(glow.root.userData[SKIP_AMBIENT_OCCLUSION]).toBe(true);
    // 一次 draw call。
    let meshes = 0;
    glow.root.traverse((object) => {
      meshes += object instanceof Mesh ? 1 : 0;
    });
    expect(meshes).toBe(1);
  });

  test('貼地處也是半透明：看得到底下的標線與柏油', () => {
    expect(CONFIG.wallOpacity).toBeLessThan(1);
    expect(CONFIG.groundOpacity).toBeLessThan(1);
    expect(CONFIG.wallOpacity).toBeGreaterThan(0.4);
  });
});

describe('脈動：只由累積時間決定', () => {
  test('t = 0 最亮；在 1 − pulseDepth 與 1 之間來回；一個週期回到原點', () => {
    expect(glowPulse(0)).toBe(1);
    expect(glowPulse(CONFIG.pulsePeriodS / 2)).toBeCloseTo(1 - CONFIG.pulseDepth, 9);
    expect(glowPulse(CONFIG.pulsePeriodS)).toBeCloseTo(1, 9);
    for (let step = 0; step <= 100; step += 1) {
      const value = glowPulse((step / 100) * CONFIG.pulsePeriodS * 3);
      expect(value).toBeGreaterThanOrEqual(1 - CONFIG.pulseDepth - 1e-9);
      expect(value).toBeLessThanOrEqual(1);
    }
    // 輕微：最暗也還有大半的亮度；不閃（一個來回至少一秒）。
    expect(CONFIG.pulseDepth).toBeLessThanOrEqual(0.4);
    expect(CONFIG.pulsePeriodS).toBeGreaterThanOrEqual(1);
  });

  test('沒走時間就不動；同樣的累積時間，不論切成幾幀，亮度都一樣', () => {
    const still = createSpotGlow(PROTOTYPE_LAYOUT.spot);
    still.advance(0);
    expect(materialOf(still.root).opacity).toBe(1);

    const oneStep = createSpotGlow(PROTOTYPE_LAYOUT.spot);
    oneStep.advance(0.6);
    const manySteps = createSpotGlow(PROTOTYPE_LAYOUT.spot);
    for (let frame = 0; frame < 36; frame += 1) {
      manySteps.advance(0.6 / 36);
    }
    expect(materialOf(manySteps.root).opacity).toBeCloseTo(materialOf(oneStep.root).opacity, 9);
    expect(materialOf(oneStep.root).opacity).toBeCloseTo(glowPulse(0.6), 9);
    expect(oneStep.snapshot().pulse).toBeCloseTo(glowPulse(0.6), 9);
    // 脈動只改亮度：位置、大小不動，停妥淡出的進度也不受影響。
    expect(oneStep.root.position.toArray()).toEqual(still.root.position.toArray());
    expect(oneStep.opacity()).toBe(1);
  });

  test('`?fx=off`（animate = false）：照樣顯示，亮度固定', () => {
    const glow = createSpotGlow(PROTOTYPE_LAYOUT.spot, false);
    const before = glow.snapshot();
    for (let frame = 0; frame < 120; frame += 1) {
      glow.advance(FRAME_SECONDS);
      glow.show(false, FRAME_SECONDS);
    }
    expect(glow.snapshot()).toEqual(before);
    expect(before).toMatchObject({ pulse: 1, opacity: 1, visible: true });
    expect(materialOf(glow.root).opacity).toBe(1);
  });
});

describe('停妥後變綠再淡出、重來後回來', () => {
  test('還沒停妥（開車中、失敗）一直是琥珀色、完全顯示', () => {
    const glow = createSpotGlow(PROTOTYPE_LAYOUT.spot, false);
    for (let frame = 0; frame < 600; frame += 1) {
      glow.show(false, FRAME_SECONDS);
    }
    expect(glow.opacity()).toBe(1);
    expect(glow.snapshot()).toMatchObject({ green: 0, opacity: 1, visible: true });
    expect(materialOf(glow.root).color.getHex()).toBe(CONFIG.color);
  });

  test('純函式：很快變綠、綠色停一下、再柔和地淡到 0', () => {
    expect(glowGreenMix(0)).toBe(0);
    expect(glowGreenMix(CONFIG.greenSeconds / 2)).toBeCloseTo(0.5, 9);
    expect(glowGreenMix(CONFIG.greenSeconds)).toBe(1);
    expect(glowGreenMix(99)).toBe(1);
    expect(glowParkedFade(0)).toBe(1);
    expect(glowParkedFade(CONFIG.greenHoldSeconds)).toBe(1);
    expect(glowParkedFade(CONFIG.greenHoldSeconds + CONFIG.fadeSeconds / 2)).toBeCloseTo(0.5, 9);
    expect(glowParkedFade(PARKED_TOTAL_SECONDS)).toBe(0);
    expect(glowParkedFade(99)).toBe(0);
    // 變綠之後還完全顯示一段時間，玩家看得到「停好了」；整段在兩秒內結束。
    expect(CONFIG.greenHoldSeconds).toBeGreaterThan(CONFIG.greenSeconds + 0.3);
    expect(PARKED_TOTAL_SECONDS).toBeLessThanOrEqual(2);
    expect(CONFIG.fadeSeconds).toBeGreaterThanOrEqual(0.4);
  });

  test('停妥：變綠 → 維持 → 淡到 0，然後不畫', () => {
    const glow = createSpotGlow(PROTOTYPE_LAYOUT.spot, false);
    const material = materialOf(glow.root);
    const green = new Color(CONFIG.parkedColor);

    glow.show(true, CONFIG.greenSeconds);
    expect(glow.snapshot()).toMatchObject({ green: 1, opacity: 1, visible: true });
    expect(material.color.getHex()).toBe(green.getHex());
    // 綠色明顯不是琥珀色：綠的色版最大。
    expect(material.color.g).toBeGreaterThan(material.color.r);

    glow.show(true, CONFIG.greenHoldSeconds - CONFIG.greenSeconds);
    expect(glow.opacity()).toBe(1);

    const opacities: number[] = [];
    for (let frame = 0; frame < Math.ceil(CONFIG.fadeSeconds / FRAME_SECONDS) + 2; frame += 1) {
      glow.show(true, FRAME_SECONDS);
      opacities.push(glow.opacity());
      expect(material.opacity).toBeCloseTo(glow.opacity(), 9);
    }
    // 一路變淡、沒有跳動。
    for (let index = 1; index < opacities.length; index += 1) {
      expect(opacities[index] ?? 1).toBeLessThanOrEqual(opacities[index - 1] ?? 1);
      expect((opacities[index - 1] ?? 1) - (opacities[index] ?? 1)).toBeLessThan(0.05);
    }
    expect(glow.opacity()).toBe(0);
    expect(glow.root.visible).toBe(false);
    expect(glow.snapshot()).toMatchObject({ green: 1, opacity: 0, visible: false });
  });

  test('重來（parked 回到 false）：立刻回到琥珀色、完全顯示', () => {
    const glow = createSpotGlow(PROTOTYPE_LAYOUT.spot, false);
    glow.show(true, 10);
    expect(glow.root.visible).toBe(false);
    glow.show(false, FRAME_SECONDS);
    expect(glow.snapshot()).toMatchObject({ green: 0, opacity: 1, visible: true });
    expect(materialOf(glow.root).color.getHex()).toBe(CONFIG.color);
    // 再停一次：重新從頭變綠、淡出。
    glow.show(true, CONFIG.greenSeconds / 2);
    expect(glow.snapshot().green).toBeCloseTo(0.5, 9);
    expect(glow.opacity()).toBe(1);
  });

  test('定格（frameSeconds = 0）不會往前走；脈動與淡出相乘', () => {
    const glow = createSpotGlow(PROTOTYPE_LAYOUT.spot);
    glow.show(true, CONFIG.greenHoldSeconds + CONFIG.fadeSeconds / 2);
    const halfway = glow.opacity();
    expect(halfway).toBeCloseTo(0.5, 9);
    glow.show(true, 0);
    expect(glow.opacity()).toBe(halfway);
    glow.advance(CONFIG.pulsePeriodS / 2);
    expect(glow.opacity()).toBe(halfway);
    expect(materialOf(glow.root).opacity).toBeCloseTo(halfway * (1 - CONFIG.pulseDepth), 9);
  });
});

describe('不是會被遮擋半透明淡掉的擺設', () => {
  test('沒有登記成 occluder；擋在鏡頭與車之間也不會被淡掉', () => {
    const spot = PROTOTYPE_LAYOUT.spot;
    const glow = createSpotGlow(spot);
    const scene = new Scene();
    scene.add(glow.root);
    glow.root.traverse((object) => {
      expect(occludersOf(object)).toEqual([]);
    });
    const fade = createOcclusionFade(scene);
    expect(fade.count).toBe(0);

    // 車在車位裡，近距離跟車的鏡頭在車位後方：視線穿過後面那道光牆。
    const pose = { x: spot.x, z: spot.z, headingRad: spot.headingRad, steerRad: 0 };
    const camera = createGameCamera('chase_near', pose).camera.position;
    for (let frame = 0; frame < 60; frame += 1) {
      fade.update(camera, pose, true, FRAME_SECONDS);
    }
    expect(fade.fadedCount()).toBe(0);
    expect(glow.opacity()).toBe(1);
    expect(materialOf(glow.root).opacity).toBe(1);
  });

  test('有環境模組的關：環境登記的擺設裡沒有發光標記；地面的方向箭頭還在', () => {
    const level = levelById('w1_l10');
    if (level === undefined) {
      throw new Error('沒有 w1_l10');
    }
    const props = QUALITY_PRESETS.low.props;
    const layout = createEnvironmentLayout(level, props);
    if (layout === undefined) {
      throw new Error('w1_l10 應該有環境佈局');
    }
    const environment = createEnvironment(level.layout.spot, layout, props, false);
    const glow = createSpotGlow(level.layout.spot);
    const scene = new Scene();
    scene.add(environment, glow.root);
    const before = createOcclusionFade(environment).count;
    expect(createOcclusionFade(scene).count).toBe(before);

    expect(environment.getObjectByName('spotArrow')).toBeDefined();
    expect(environment.getObjectByName('spotGlow')).toBeUndefined();
    expect(scene.getObjectByName('spotGlow')).toBe(glow.root);
  });
});

describe('倒車輔助層的小畫面不畫發光標記', () => {
  test('drawHidden：draw 跑的時候看不到，跑完恢復', () => {
    const glow = createSpotGlow(PROTOTYPE_LAYOUT.spot);
    const seen: boolean[] = [];
    glow.drawHidden(() => {
      seen.push(glow.root.visible);
    });
    expect(seen).toEqual([false]);
    expect(glow.root.visible).toBe(true);
    expect(glow.opacity()).toBe(1);
  });

  test('draw 丟例外也會恢復', () => {
    const glow = createSpotGlow(PROTOTYPE_LAYOUT.spot);
    expect(() => {
      glow.drawHidden(() => {
        throw new Error('畫壞了');
      });
    }).toThrow('畫壞了');
    expect(glow.root.visible).toBe(true);
  });

  test('已經淡出（停妥後）的標記，畫完小畫面也還是不畫', () => {
    const glow = createSpotGlow(PROTOTYPE_LAYOUT.spot);
    glow.show(true, 5);
    glow.drawHidden(() => {
      expect(glow.root.visible).toBe(false);
    });
    expect(glow.root.visible).toBe(false);
  });

  test('淡到一半時畫小畫面：不透明度不受影響', () => {
    const glow = createSpotGlow(PROTOTYPE_LAYOUT.spot);
    glow.show(true, CONFIG.greenHoldSeconds + CONFIG.fadeSeconds / 2);
    glow.drawHidden(() => {
      expect(glow.root.visible).toBe(false);
    });
    expect(glow.root.visible).toBe(true);
    expect(glow.opacity()).toBeCloseTo(0.5, 9);
  });
});
