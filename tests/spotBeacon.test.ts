// 目標車位上方的天空箭頭：位置（車位中心正上方、尖端朝下）、由時間決定的浮動與自轉、停妥後淡出與重來、
// 俯視時淡成看得穿、不是會被遮擋半透明淡掉的擺設、倒車輔助小畫面裡不畫。不開 WebGL。
import { Box3, Group, Mesh, MeshBasicMaterial, Scene, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { ftToM, mToFt } from '../src/core/units';
import { LEVELS, levelById } from '../src/level/levelCatalog';
import type { ParkingSpot } from '../src/level/parkingJudge';
import { PROTOTYPE_LAYOUT, PROTOTYPE_LEVEL } from '../src/level/prototypeLayout';
import { createEnvironmentLayout } from '../src/props/environmentLayout';
import { createEnvironment, createSpotArrow } from '../src/props/environments';
import { BOUNDS_STYLES } from '../src/props/obstacleMeshes';
import { occludersOf } from '../src/props/occluders';
import {
  beaconBobM,
  beaconProfile,
  beaconSpinRad,
  beaconViewOpacity,
  createSpotBeacon,
} from '../src/props/spotBeacon';
import { SKIP_AMBIENT_OCCLUSION } from '../src/render/ambientOcclusionFlag';
import { createOcclusionFade } from '../src/render/occlusionFade';
import {
  GAME_CAMERA_CONFIG,
  QUALITY_PRESETS,
  SPOT_BEACON_CONFIG as CONFIG,
  SPOT_MARKING_CONFIG,
} from '../src/render/renderConfig';

const FRAME_SECONDS = 1 / 60;
/** 駕駛座那樣低的鏡頭：在箭頭下方，不會觸發俯視的淡化。 */
const LOW_CAMERA = { x: 0, y: GAME_CAMERA_CONFIG.cockpit.heightM, z: 0 };

function spotOf(levelId: string): ParkingSpot {
  const level = levelById(levelId);
  if (level === undefined) {
    throw new Error(`沒有 ${levelId}`);
  }
  return level.layout.spot;
}

function bodyOf(root: Group): Mesh {
  const body = root.getObjectByName('spotBeaconBody');
  if (!(body instanceof Mesh)) {
    throw new Error('找不到箭頭本體');
  }
  return body;
}

/** 本體每個頂點的世界座標。 */
function worldVertices(root: Group): Vector3[] {
  root.updateMatrixWorld(true);
  const body = bodyOf(root);
  const positions = body.geometry.getAttribute('position');
  return Array.from({ length: positions.count }, (_, index) =>
    new Vector3().fromBufferAttribute(positions, index).applyMatrix4(body.matrixWorld),
  );
}

describe('位置與形狀', () => {
  // 原型關（沒有環境模組）、正向車位、側向停車（heading 90°、車位很長）、倒車入庫的窄巷。
  test.each(['prototype', 'w1_l01', 'w1_l08', 'w1_l09', 'w1_l10'])(
    '%s：吊在車位中心正上方、尖端朝下',
    (levelId) => {
      const spot = spotOf(levelId);
      const { root } = createSpotBeacon(spot);
      const vertices = worldVertices(root);

      // 最低的那一點就是尖端：在車位中心的正上方、離地 hoverTipM。
      const lowest = vertices.reduce((a, b) => (b.y < a.y ? b : a));
      expect(lowest.x).toBeCloseTo(spot.x, 6);
      expect(lowest.z).toBeCloseTo(spot.z, 6);
      expect(lowest.y).toBeCloseTo(CONFIG.hoverTipM, 6);

      // 整支是直立的：以車位中心為軸左右對稱，最寬處（箭頭的肩）在下半段，桿頂在最上面。
      const box = new Box3().setFromPoints(vertices);
      expect((box.min.x + box.max.x) / 2).toBeCloseTo(spot.x, 6);
      expect(box.max.y).toBeCloseTo(CONFIG.hoverTipM + CONFIG.lengthM, 6);
      const widest = vertices.reduce((a, b) =>
        Math.hypot(b.x - spot.x, b.z - spot.z) > Math.hypot(a.x - spot.x, a.z - spot.z) ? b : a,
      );
      expect(Math.hypot(widest.x - spot.x, widest.z - spot.z)).toBeCloseTo(CONFIG.headRadiusM, 6);
      expect(widest.y - CONFIG.hoverTipM).toBeCloseTo(CONFIG.headLengthM, 6);
      expect(CONFIG.headLengthM).toBeLessThan(CONFIG.lengthM / 2);
      // 不跟著車位的 heading 轉、也不傾斜。
      expect(root.rotation.x).toBe(0);
      expect(root.rotation.y).toBe(0);
      expect(root.rotation.z).toBe(0);
    },
  );

  test('每一關的箭頭都在自己的車位上方（含原型關）', () => {
    for (const level of [PROTOTYPE_LEVEL, ...LEVELS]) {
      const snapshot = createSpotBeacon(level.layout.spot).snapshot();
      expect(snapshot.xFt).toBeCloseTo(mToFt(level.layout.spot.x), 6);
      expect(snapshot.zFt).toBeCloseTo(mToFt(level.layout.spot.z), 6);
      expect(snapshot.tipHeightFt).toBeCloseTo(mToFt(CONFIG.hoverTipM), 6);
      expect(snapshot.opacity).toBe(1);
      expect(snapshot.visible).toBe(true);
    }
  });

  test('夠大、夠高：比車高得多，桿頂高過窄巷的牆，尖端在路燈與車頂之上', () => {
    expect(CONFIG.lengthM).toBeGreaterThanOrEqual(3);
    expect(CONFIG.headRadiusM * 2).toBeGreaterThanOrEqual(2);
    expect(CONFIG.hoverTipM - CONFIG.bobAmplitudeM).toBeGreaterThan(ftToM(10.5));
    const alleyWallM = ftToM(BOUNDS_STYLES.narrow_alley.heightFt);
    expect(CONFIG.hoverTipM - CONFIG.bobAmplitudeM + CONFIG.lengthM).toBeGreaterThan(alleyWallM + 1.5);
  });

  test('每個三角形的正面朝外：圓錐的斜面朝外下方，桿的側面朝外', () => {
    const body = bodyOf(createSpotBeacon(PROTOTYPE_LAYOUT.spot).root);
    const positions = body.geometry.getAttribute('position');
    const normals = body.geometry.getAttribute('normal');
    expect(positions.count % 3).toBe(0);
    expect(positions.count / 3).toBeGreaterThanOrEqual(CONFIG.radialSegments * 5);
    for (let index = 0; index < positions.count; index += 3) {
      const corners = [0, 1, 2].map((offset) =>
        new Vector3().fromBufferAttribute(positions, index + offset),
      );
      const centroid = corners.reduce((sum, corner) => sum.add(corner), new Vector3()).divideScalar(3);
      const normal = new Vector3().fromBufferAttribute(normals, index);
      const radial = normal.x * centroid.x + normal.z * centroid.z;
      if (centroid.y < CONFIG.headLengthM - 1e-6) {
        expect(normal.y).toBeLessThan(0);
        expect(radial).toBeGreaterThan(0);
      } else if (centroid.y > CONFIG.headLengthM + 1e-6 && centroid.y < CONFIG.lengthM - 1e-6) {
        expect(Math.abs(normal.y)).toBeLessThan(1e-6);
        expect(radial).toBeGreaterThan(0);
      } else {
        // 箭頭的肩與桿頂：朝上。
        expect(normal.y).toBeCloseTo(1, 6);
      }
    }
  });

  test('描邊殼把本體整個包在裡面', () => {
    const body = beaconProfile();
    const shell = beaconProfile(CONFIG.outlineM);
    expect(shell).toHaveLength(body.length);
    expect(shell[0]?.y).toBeLessThan(body[0]?.y ?? 0);
    shell.forEach((point, index) => {
      expect(point.radius).toBeGreaterThanOrEqual(body[index]?.radius ?? 0);
    });
    expect(shell.at(-1)?.y).toBeCloseTo(CONFIG.lengthM + CONFIG.outlineM, 9);
  });
});

describe('材質：自己發亮、看得出顏色、純視覺', () => {
  test('不吃燈、不吃霧、不投影；琥珀色、沒有過曝成白', () => {
    const { root } = createSpotBeacon(PROTOTYPE_LAYOUT.spot);
    const meshes: Mesh[] = [];
    root.traverse((object) => {
      if (object instanceof Mesh) {
        meshes.push(object);
      }
    });
    expect(meshes.map((mesh) => mesh.name).sort()).toEqual(['spotBeaconBody', 'spotBeaconOutline']);
    for (const mesh of meshes) {
      expect(mesh.material).toBeInstanceOf(MeshBasicMaterial);
      const material = mesh.material as MeshBasicMaterial;
      expect(material.fog).toBe(false);
      expect(material.vertexColors).toBe(true);
      expect(mesh.castShadow).toBe(false);
      expect(mesh.receiveShadow).toBe(false);
    }
    expect(root.userData[SKIP_AMBIENT_OCCLUSION]).toBe(true);

    // 本體每一面的顏色：紅 > 綠 > 藍（琥珀），最亮的不超過 1，最暗的也還亮。
    const colors = bodyOf(root).geometry.getAttribute('color');
    let brightest = 0;
    let darkest = 1;
    for (let index = 0; index < colors.count; index += 1) {
      const [r, g, b] = [colors.getX(index), colors.getY(index), colors.getZ(index)];
      expect(r).toBeGreaterThan(g);
      expect(g).toBeGreaterThan(b);
      expect(r).toBeLessThanOrEqual(1);
      brightest = Math.max(brightest, r);
      darkest = Math.min(darkest, r);
    }
    expect(brightest).toBeGreaterThan(0.85);
    expect(darkest).toBeGreaterThanOrEqual(CONFIG.minShade - 1e-6);
    // 每一面的明暗不同（自轉時看得出是立體的）。
    expect(brightest - darkest).toBeGreaterThan(0.2);
    // 與地面白漆標線不同色。
    expect(CONFIG.color).not.toBe(SPOT_MARKING_CONFIG.color);
  });

  test('與畫質無關：低畫質建立出來的是同一支箭頭', () => {
    // createSpotBeacon 不收畫質設定；每個級別（含 low）走的是同一條路。
    expect(Object.keys(QUALITY_PRESETS)).toContain('low');
    const first = bodyOf(createSpotBeacon(PROTOTYPE_LAYOUT.spot).root).geometry.getAttribute('position');
    const second = bodyOf(createSpotBeacon(PROTOTYPE_LAYOUT.spot).root).geometry.getAttribute('position');
    expect(Array.from(second.array)).toEqual(Array.from(first.array));
  });
});

describe('浮動與自轉：只由累積時間決定', () => {
  test('t = 0 是固定的起始姿勢；沒走時間就不動', () => {
    expect(beaconBobM(0)).toBe(0);
    expect(beaconSpinRad(0)).toBe(0);
    const beacon = createSpotBeacon(PROTOTYPE_LAYOUT.spot);
    const start = beacon.snapshot();
    for (let frame = 0; frame < 10; frame += 1) {
      beacon.advance(0);
    }
    expect(beacon.snapshot()).toEqual(start);
    expect(start.spinRad).toBe(0);
  });

  test('同樣的累積時間，不論切成幾幀，姿勢都一樣', () => {
    const coarse = createSpotBeacon(PROTOTYPE_LAYOUT.spot);
    const fine = createSpotBeacon(PROTOTYPE_LAYOUT.spot);
    for (let frame = 0; frame < 30; frame += 1) {
      coarse.advance(0.1);
    }
    for (let frame = 0; frame < 300; frame += 1) {
      fine.advance(0.01);
    }
    expect(fine.snapshot().tipHeightFt).toBeCloseTo(coarse.snapshot().tipHeightFt, 6);
    expect(fine.snapshot().spinRad).toBeCloseTo(coarse.snapshot().spinRad, 6);
    expect(coarse.root.position.y).toBeCloseTo(CONFIG.hoverTipM + beaconBobM(3), 6);
    expect(coarse.root.rotation.y).toBeCloseTo(beaconSpinRad(3), 6);
  });

  test('溫和地上下浮動、慢慢繞世界 Y 轉；水平位置不動、不傾斜', () => {
    const spot = spotOf('w1_l08');
    const beacon = createSpotBeacon(spot);
    let lowest = Infinity;
    let highest = -Infinity;
    let lastSpin = 0;
    let wraps = 0;
    const seconds = CONFIG.spinPeriodS * 1.5;
    for (let frame = 0; frame < seconds / FRAME_SECONDS; frame += 1) {
      beacon.advance(FRAME_SECONDS);
      const { x, y, z } = beacon.root.position;
      expect(x).toBe(spot.x);
      expect(z).toBe(spot.z);
      lowest = Math.min(lowest, y);
      highest = Math.max(highest, y);
      const spin = beacon.root.rotation.y;
      if (spin < lastSpin) {
        wraps += 1;
      } else {
        // 一幀轉不到 5°。
        expect(spin - lastSpin).toBeLessThan((5 * Math.PI) / 180);
      }
      lastSpin = spin;
      expect(beacon.root.rotation.x).toBe(0);
      expect(beacon.root.rotation.z).toBe(0);
    }
    expect(highest - CONFIG.hoverTipM).toBeCloseTo(CONFIG.bobAmplitudeM, 2);
    expect(CONFIG.hoverTipM - lowest).toBeCloseTo(CONFIG.bobAmplitudeM, 2);
    expect(CONFIG.bobAmplitudeM).toBeLessThanOrEqual(0.5);
    expect(CONFIG.spinPeriodS).toBeGreaterThanOrEqual(4);
    expect(wraps).toBe(1);
  });

  test('`?fx=off`（animate = false）：照樣顯示，停在起始姿勢', () => {
    const beacon = createSpotBeacon(PROTOTYPE_LAYOUT.spot, false);
    const start = beacon.snapshot();
    for (let frame = 0; frame < 120; frame += 1) {
      beacon.advance(FRAME_SECONDS);
      beacon.show(false, LOW_CAMERA, FRAME_SECONDS);
    }
    expect(beacon.snapshot()).toEqual(start);
    expect(start.visible).toBe(true);
    expect(start.opacity).toBe(1);
  });
});

describe('停妥後淡出、重來後回來', () => {
  test('還沒停妥（開車中、失敗）一直是完全顯示', () => {
    const beacon = createSpotBeacon(PROTOTYPE_LAYOUT.spot);
    for (let frame = 0; frame < 600; frame += 1) {
      beacon.advance(FRAME_SECONDS);
      beacon.show(false, LOW_CAMERA, FRAME_SECONDS);
      expect(beacon.opacity()).toBe(1);
    }
    expect(beacon.root.visible).toBe(true);
  });

  test('停妥：在 0.4–0.8 秒內柔和地淡到 0，然後不畫', () => {
    const beacon = createSpotBeacon(PROTOTYPE_LAYOUT.spot);
    expect(CONFIG.fadeSeconds).toBeGreaterThanOrEqual(0.4);
    expect(CONFIG.fadeSeconds).toBeLessThanOrEqual(0.8);

    let previous = beacon.opacity();
    let frames = 0;
    while (beacon.opacity() > 0) {
      beacon.show(true, LOW_CAMERA, FRAME_SECONDS);
      frames += 1;
      // 每一幀只降一點點，不是突然消失。
      expect(previous - beacon.opacity()).toBeLessThan(0.05);
      expect(beacon.opacity()).toBeLessThan(previous);
      previous = beacon.opacity();
      expect(frames).toBeLessThan(1000);
    }
    expect(frames * FRAME_SECONDS).toBeCloseTo(CONFIG.fadeSeconds, 1);
    expect(beacon.root.visible).toBe(false);
    expect(beacon.snapshot()).toMatchObject({ opacity: 0, visible: false });

    // 淡到一半時兩個網格的材質都是半透明的同一個值。
    const half = createSpotBeacon(PROTOTYPE_LAYOUT.spot);
    half.show(true, LOW_CAMERA, CONFIG.fadeSeconds / 2);
    expect(half.opacity()).toBeCloseTo(0.5, 6);
    half.root.traverse((object) => {
      if (object instanceof Mesh) {
        const material = object.material as MeshBasicMaterial;
        expect(material.transparent).toBe(true);
        expect(material.opacity).toBeCloseTo(0.5, 6);
      }
    });
    expect(half.root.visible).toBe(true);
  });

  test('重來（parked 回到 false）：立刻再出現，不透明度回到 1', () => {
    const beacon = createSpotBeacon(PROTOTYPE_LAYOUT.spot);
    beacon.show(true, LOW_CAMERA, 5);
    expect(beacon.opacity()).toBe(0);
    expect(beacon.root.visible).toBe(false);

    beacon.show(false, LOW_CAMERA, FRAME_SECONDS);
    expect(beacon.opacity()).toBe(1);
    expect(beacon.root.visible).toBe(true);
    expect((bodyOf(beacon.root).material as MeshBasicMaterial).opacity).toBe(1);
  });

  test('定格（frameSeconds = 0）不會淡', () => {
    const beacon = createSpotBeacon(PROTOTYPE_LAYOUT.spot);
    beacon.show(true, LOW_CAMERA, 0);
    expect(beacon.opacity()).toBe(1);
  });
});

describe('俯視而且靠近車位：淡成看得穿（不蓋住標線與車）', () => {
  const spot = spotOf('w1_l08');
  const topM = GAME_CAMERA_CONFIG.top.heightM;

  test('比箭頭低的鏡頭（駕駛座、引擎蓋、近／遠跟車）不論多近都不淡', () => {
    for (const heightM of [
      GAME_CAMERA_CONFIG.cockpit.heightM,
      GAME_CAMERA_CONFIG.hood.heightM,
      GAME_CAMERA_CONFIG.chaseNear.heightM,
      GAME_CAMERA_CONFIG.chaseFar.heightM,
    ]) {
      for (const distanceM of [0, 3, 8, 30]) {
        expect(beaconViewOpacity({ x: spot.x + distanceM, y: heightM, z: spot.z }, spot)).toBe(1);
      }
    }
  });

  test('俯視鏡頭：遠處完全顯示，靠近車位才淡，最淡也還看得到', () => {
    const at = (distanceM: number): number =>
      beaconViewOpacity({ x: spot.x, y: topM, z: spot.z + distanceM }, spot);
    expect(at(CONFIG.overheadFarM)).toBe(1);
    expect(at(40)).toBe(1);
    expect(at(0)).toBe(CONFIG.overheadOpacity);
    expect(at(CONFIG.overheadNearM)).toBe(CONFIG.overheadOpacity);
    expect(CONFIG.overheadOpacity).toBeGreaterThanOrEqual(0.2);
    expect(CONFIG.overheadOpacity).toBeLessThan(0.6);
    // 中間單調變化。
    let previous = at(CONFIG.overheadNearM);
    for (let distanceM = CONFIG.overheadNearM; distanceM <= CONFIG.overheadFarM; distanceM += 0.25) {
      expect(at(distanceM)).toBeGreaterThanOrEqual(previous);
      previous = at(distanceM);
    }
  });

  test('走過去是漸變的；離開或換回低的鏡頭再淡回來；停妥後照樣淡到 0', () => {
    const beacon = createSpotBeacon(spot);
    const overhead = { x: spot.x, y: topM, z: spot.z };
    beacon.show(false, overhead, FRAME_SECONDS);
    expect(beacon.opacity()).toBeLessThan(1);
    expect(beacon.opacity()).toBeGreaterThan(0.9);
    for (let frame = 0; frame < 120; frame += 1) {
      beacon.show(false, overhead, FRAME_SECONDS);
    }
    expect(beacon.opacity()).toBeCloseTo(CONFIG.overheadOpacity, 6);
    expect(beacon.root.visible).toBe(true);

    for (let frame = 0; frame < 120; frame += 1) {
      beacon.show(false, { ...overhead, y: GAME_CAMERA_CONFIG.chaseNear.heightM }, FRAME_SECONDS);
    }
    expect(beacon.opacity()).toBe(1);

    for (let frame = 0; frame < 120; frame += 1) {
      beacon.show(true, overhead, FRAME_SECONDS);
    }
    expect(beacon.opacity()).toBe(0);
    expect(beacon.root.visible).toBe(false);
  });
});

describe('不是會被遮擋半透明淡掉的擺設', () => {
  test('沒有登記成 occluder；擋在鏡頭與車之間也不會被淡掉', () => {
    const spot = PROTOTYPE_LAYOUT.spot;
    const beacon = createSpotBeacon(spot);
    const scene = new Scene();
    scene.add(beacon.root);
    beacon.root.traverse((object) => {
      expect(occludersOf(object)).toEqual([]);
    });
    const fade = createOcclusionFade(scene);
    expect(fade.count).toBe(0);

    // 車在車位裡，鏡頭在箭頭正上方往下看：視線穿過箭頭。
    const pose = { x: spot.x, z: spot.z, headingRad: spot.headingRad, steerRad: 0 };
    for (let frame = 0; frame < 60; frame += 1) {
      fade.update({ x: spot.x, y: 30, z: spot.z }, pose, true, FRAME_SECONDS);
    }
    expect(fade.fadedCount()).toBe(0);
    expect(beacon.opacity()).toBe(1);
    expect((bodyOf(beacon.root).material as MeshBasicMaterial).opacity).toBe(1);
  });

  test('有環境模組的關：環境登記的擺設裡沒有箭頭；地面的方向箭頭還在', () => {
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
    const beacon = createSpotBeacon(level.layout.spot);
    const scene = new Scene();
    scene.add(environment, beacon.root);
    const before = createOcclusionFade(environment).count;
    expect(createOcclusionFade(scene).count).toBe(before);

    // 兩個箭頭各管各的：地面那個平貼地面（很低），天空這個在它正上方很高的地方。
    expect(environment.getObjectByName('spotArrow')).toBeDefined();
    expect(environment.getObjectByName('spotBeacon')).toBeUndefined();
    const ground = createSpotArrow(level.layout.spot);
    ground.updateMatrixWorld(true);
    const groundBox = new Box3().setFromObject(ground);
    expect(groundBox.max.y).toBeLessThan(0.1);
    expect(beacon.root.position.y).toBeGreaterThan(groundBox.max.y + 3);
  });
});

describe('倒車輔助層的小畫面不畫箭頭', () => {
  test('drawHidden：draw 跑的時候看不到，跑完恢復', () => {
    const beacon = createSpotBeacon(PROTOTYPE_LAYOUT.spot);
    const seen: boolean[] = [];
    beacon.drawHidden(() => {
      seen.push(beacon.root.visible);
    });
    expect(seen).toEqual([false]);
    expect(beacon.root.visible).toBe(true);
    expect(beacon.opacity()).toBe(1);
  });

  test('draw 丟例外也會恢復', () => {
    const beacon = createSpotBeacon(PROTOTYPE_LAYOUT.spot);
    expect(() => {
      beacon.drawHidden(() => {
        throw new Error('畫壞了');
      });
    }).toThrow('畫壞了');
    expect(beacon.root.visible).toBe(true);
  });

  test('已經淡出（停妥後）的箭頭，畫完小畫面也還是不畫', () => {
    const beacon = createSpotBeacon(PROTOTYPE_LAYOUT.spot);
    beacon.show(true, LOW_CAMERA, 5);
    beacon.drawHidden(() => {
      expect(beacon.root.visible).toBe(false);
    });
    expect(beacon.root.visible).toBe(false);
  });

  test('淡到一半時畫小畫面：不透明度不受影響', () => {
    const beacon = createSpotBeacon(PROTOTYPE_LAYOUT.spot);
    beacon.show(true, LOW_CAMERA, CONFIG.fadeSeconds / 2);
    beacon.drawHidden(() => {
      expect(beacon.root.visible).toBe(false);
    });
    expect(beacon.root.visible).toBe(true);
    expect(beacon.opacity()).toBeCloseTo(0.5, 6);
  });
});
