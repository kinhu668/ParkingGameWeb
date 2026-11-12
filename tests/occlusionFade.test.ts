// 跟車鏡頭的遮擋半透明：「在鏡頭與車之間／不在中間」的判定、淡入淡出、只淡擋住的那一個實例。不開 WebGL。
import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { isChaseView } from '../src/core/cameraView';
import { ftToM } from '../src/core/units';
import { levelById } from '../src/level/levelCatalog';
import { createEnvironmentLayout } from '../src/props/environmentLayout';
import { createEnvironment } from '../src/props/environments';
import { occluderBox, occludersOf, registerOccluders } from '../src/props/occluders';
import { createParkedCars } from '../src/props/parkedCars';
import { createGameCamera } from '../src/render/gameCamera';
import {
  blocksView,
  createOcclusionFade,
  nearSightLine,
  nextOpacity,
  pointInBox,
  segmentHitsBox,
  sightBox,
  sightTargets,
} from '../src/render/occlusionFade';
import { LOT_PROPS_CONFIG, OCCLUSION_FADE_CONFIG, QUALITY_PRESETS } from '../src/render/renderConfig';
import type { VehiclePose } from '../src/vehicle/bicycleModel';

const FRAME_SECONDS = 1 / 60;
/** 車在原點、車頭朝北（−Z）；鏡頭在車後方（+Z）。 */
const POSE: VehiclePose = { x: 0, z: 0, headingRad: 0, steerRad: 0 };
const CAMERA = { x: 0, y: ftToM(5.5), z: ftToM(18.5) };

/** 一根立在 (x, z) 的燈桿（與真的路燈同樣粗細與高度）。 */
function pole(x: number, z: number): ReturnType<typeof sightBox> {
  return sightBox(
    occluderBox(
      { x, y: LOT_PROPS_CONFIG.lampHeightM / 2, z },
      { x: 2 * LOT_PROPS_CONFIG.lampPoleRadiusM, y: LOT_PROPS_CONFIG.lampHeightM, z: 2 * LOT_PROPS_CONFIG.lampPoleRadiusM },
    ),
  );
}

describe('線段與方塊', () => {
  const box = sightBox(occluderBox({ x: 0, y: 1, z: 5 }, { x: 2, y: 2, z: 2 }));

  test('穿過方塊 → 碰到；從旁邊、上面過去 → 沒碰到', () => {
    expect(segmentHitsBox({ x: 0, y: 1, z: 10 }, { x: 0, y: 1, z: 0 }, box)).toBe(true);
    expect(segmentHitsBox({ x: 1.5, y: 1, z: 10 }, { x: 1.5, y: 1, z: 0 }, box)).toBe(false);
    expect(segmentHitsBox({ x: 0, y: 2.5, z: 10 }, { x: 0, y: 2.5, z: 0 }, box)).toBe(false);
  });

  test('只看線段本身：方塊在終點之後、起點之前都不算', () => {
    expect(segmentHitsBox({ x: 0, y: 1, z: 10 }, { x: 0, y: 1, z: 7 }, box)).toBe(false);
    expect(segmentHitsBox({ x: 0, y: 1, z: 3 }, { x: 0, y: 1, z: 0 }, box)).toBe(false);
  });

  test('餘裕：差一點擦過去的，加上餘裕就算碰到', () => {
    const from = { x: 1.2, y: 1, z: 10 };
    const to = { x: 1.2, y: 1, z: 0 };
    expect(segmentHitsBox(from, to, box)).toBe(false);
    expect(segmentHitsBox(from, to, box, 0.3)).toBe(true);
  });

  test('轉過的方塊用它自己的方向測', () => {
    const turned = sightBox(occluderBox({ x: 0, y: 1, z: 5 }, { x: 6, y: 2, z: 0.2 }, Math.PI / 2));
    // 轉 90° 之後長邊沿 Z：從 x = 1 的地方平行 Z 過去碰不到，從 x = 0 穿過去碰得到。
    expect(segmentHitsBox({ x: 1, y: 1, z: 10 }, { x: 1, y: 1, z: 0 }, turned)).toBe(false);
    expect(segmentHitsBox({ x: -3, y: 1, z: 5 }, { x: 3, y: 1, z: 5 }, turned)).toBe(true);
  });

  test('點在不在方塊裡', () => {
    expect(pointInBox({ x: 0, y: 1, z: 5 }, box)).toBe(true);
    expect(pointInBox({ x: 1.2, y: 1, z: 5 }, box)).toBe(false);
    expect(pointInBox({ x: 1.2, y: 1, z: 5 }, box, 0.3)).toBe(true);
  });
});

describe('擋不擋住鏡頭看車', () => {
  const targets = sightTargets(POSE);

  test('看向車身的點都在車身裡、高過輪胎', () => {
    expect(targets).toHaveLength(9);
    for (const target of targets) {
      expect(Math.abs(target.x)).toBeLessThan(ftToM(3));
      expect(Math.abs(target.z)).toBeLessThan(ftToM(7.5));
      expect(target.y).toBeGreaterThan(ftToM(2));
    }
  });

  test('在中間：鏡頭與車之間的燈桿（正中、偏左、偏右、貼近車尾）都算擋住', () => {
    expect(blocksView(CAMERA, targets, pole(0, ftToM(14)))).toBe(true);
    expect(blocksView(CAMERA, targets, pole(ftToM(0.6), ftToM(15)))).toBe(true);
    expect(blocksView(CAMERA, targets, pole(ftToM(-1.5), ftToM(9)))).toBe(true);
    expect(blocksView(CAMERA, targets, pole(ftToM(2), ftToM(8.5)))).toBe(true);
  });

  test('不在中間：車的另一頭、車的兩側遠處、鏡頭後面的燈桿都不算', () => {
    // 車頭前方（比車遠）。
    expect(blocksView(CAMERA, targets, pole(0, ftToM(-20)))).toBe(false);
    // 兩側。
    expect(blocksView(CAMERA, targets, pole(ftToM(12), ftToM(10)))).toBe(false);
    expect(blocksView(CAMERA, targets, pole(ftToM(-12), 0))).toBe(false);
    // 鏡頭後面。
    expect(blocksView(CAMERA, targets, pole(0, ftToM(26)))).toBe(false);
  });

  test('矮的東西擋不到：視線從它上面過去', () => {
    const curb = sightBox(occluderBox({ x: 0, y: ftToM(0.3), z: ftToM(12) }, { x: ftToM(40), y: ftToM(0.6), z: ftToM(4) }));
    expect(blocksView(CAMERA, targets, curb)).toBe(false);
  });

  test('鏡頭貼著或在東西裡面也算（近平面會把它切開）', () => {
    const car = sightBox(occluderBox({ x: ftToM(4), y: ftToM(2.3), z: CAMERA.z }, { x: ftToM(6), y: ftToM(4.6), z: ftToM(15) }));
    // 鏡頭在車頂上方不到 1 ft、車側 1 ft。
    expect(blocksView(CAMERA, targets, car)).toBe(true);
    const farther = sightBox(occluderBox({ x: ftToM(9), y: ftToM(2.3), z: CAMERA.z }, { x: ftToM(6), y: ftToM(4.6), z: ftToM(15) }));
    expect(blocksView(CAMERA, targets, farther)).toBe(false);
  });

  test('粗篩不會漏：擋住的一定通過粗篩；離視線很遠的被篩掉', () => {
    const blockers = [pole(0, ftToM(14)), pole(ftToM(0.6), ftToM(15)), pole(ftToM(-1.5), ftToM(9)), pole(ftToM(2), ftToM(8.5))];
    for (const box of blockers) {
      expect(nearSightLine(CAMERA, POSE, box)).toBe(true);
    }
    // 鏡頭旁邊貼著的東西也要通過。
    const beside = sightBox(occluderBox({ x: ftToM(4), y: ftToM(2.3), z: CAMERA.z }, { x: ftToM(6), y: ftToM(4.6), z: ftToM(15) }));
    expect(nearSightLine(CAMERA, POSE, beside)).toBe(true);
    // 60 ft 外的建築（半徑不大）篩掉。
    const building = sightBox(occluderBox({ x: ftToM(80), y: ftToM(10), z: 0 }, { x: ftToM(20), y: ftToM(20), z: ftToM(20) }));
    expect(nearSightLine(CAMERA, POSE, building)).toBe(false);
  });

  test('只有兩個跟車鏡頭做遮擋半透明', () => {
    expect(isChaseView('chase_near')).toBe(true);
    expect(isChaseView('chase_far')).toBe(true);
    expect(isChaseView('hood')).toBe(false);
    expect(isChaseView('cockpit')).toBe(false);
    expect(isChaseView('top')).toBe(false);
  });
});

describe('淡入淡出', () => {
  test('擋住：fadeSeconds 內淡到設定的不透明度，不會更低；不擋：同樣的時間淡回 1', () => {
    let opacity = 1;
    const frames = Math.ceil(OCCLUSION_FADE_CONFIG.fadeSeconds / FRAME_SECONDS);
    opacity = nextOpacity(opacity, true, FRAME_SECONDS);
    expect(opacity).toBeLessThan(1);
    expect(opacity).toBeGreaterThan(OCCLUSION_FADE_CONFIG.opacity);
    for (let frame = 0; frame < frames; frame += 1) {
      opacity = nextOpacity(opacity, true, FRAME_SECONDS);
    }
    expect(opacity).toBe(OCCLUSION_FADE_CONFIG.opacity);
    for (let frame = 0; frame <= frames; frame += 1) {
      opacity = nextOpacity(opacity, false, FRAME_SECONDS);
    }
    expect(opacity).toBe(1);
  });

  test('設定在計畫的範圍內：不透明度 0.25–0.4、淡入淡出 0.15–0.25 秒', () => {
    expect(OCCLUSION_FADE_CONFIG.opacity).toBeGreaterThanOrEqual(0.25);
    expect(OCCLUSION_FADE_CONFIG.opacity).toBeLessThanOrEqual(0.4);
    expect(OCCLUSION_FADE_CONFIG.fadeSeconds).toBeGreaterThanOrEqual(0.15);
    expect(OCCLUSION_FADE_CONFIG.fadeSeconds).toBeLessThanOrEqual(0.25);
  });
});

/** 三根燈桿的 InstancedMesh：第 0 根在鏡頭與車之間，另外兩根在旁邊。 */
function poleScene(): { root: Group; mesh: InstancedMesh; hidden: boolean[] } {
  const size = { x: 0.2, y: 6, z: 0.2 };
  const positions = [
    { x: 0, z: ftToM(14) },
    { x: ftToM(15), z: ftToM(14) },
    { x: ftToM(-15), z: ftToM(-10) },
  ];
  const mesh = new InstancedMesh(
    new BoxGeometry(size.x, size.y, size.z),
    new MeshStandardMaterial({ color: 0x808080 }),
    positions.length,
  );
  mesh.name = 'poles';
  mesh.castShadow = true;
  positions.forEach((position, index) => {
    mesh.setMatrixAt(index, new Matrix4().makeTranslation(position.x, size.y / 2, position.z));
  });
  const root = new Group();
  root.add(mesh);
  const hidden = positions.map(() => false);
  registerOccluders(
    root,
    positions.map((position, index) => ({
      boxes: [occluderBox({ x: position.x, y: size.y / 2, z: position.z }, size)],
      parts: [{ mesh, index }],
      setHidden: (value: boolean) => {
        hidden[index] = value;
      },
    })),
  );
  return { root, mesh, hidden };
}

function instanceScale(mesh: InstancedMesh, index: number): number {
  const matrix = new Matrix4();
  mesh.getMatrixAt(index, matrix);
  return new Vector3().setFromMatrixScale(matrix).length();
}

function standIns(mesh: InstancedMesh): Mesh[] {
  return mesh.children.filter((child): child is Mesh => child instanceof Mesh);
}

describe('只淡擋住的那一個實例', () => {
  test('擋住的那一根換成半透明的替身，其他兩根原封不動；不擋了再換回來', () => {
    const { root, mesh, hidden } = poleScene();
    const fade = createOcclusionFade(root);
    expect(fade.count).toBe(3);
    const before = Array.from(mesh.instanceMatrix.array);

    fade.update(CAMERA, POSE, true, FRAME_SECONDS);
    expect(fade.fadedCount()).toBe(1);
    // 第 0 根的實例縮成零（不畫），原地是一個半透明、照樣投影的替身。
    expect(instanceScale(mesh, 0)).toBe(0);
    expect(instanceScale(mesh, 1)).toBeGreaterThan(1);
    expect(instanceScale(mesh, 2)).toBeGreaterThan(1);
    expect(hidden).toEqual([true, false, false]);
    const [standIn] = standIns(mesh);
    expect(standIns(mesh)).toHaveLength(1);
    expect(standIn?.visible).toBe(true);
    expect(standIn?.castShadow).toBe(true);
    // 實例矩陣存的是單精度。
    expect(standIn?.matrix.elements[14]).toBeCloseTo(ftToM(14), 5);
    const material = standIn?.material as MeshStandardMaterial;
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeLessThan(1);
    // 共用的材質沒有被改：整排不會一起淡。
    expect((mesh.material as MeshStandardMaterial).transparent).toBe(false);
    expect((mesh.material as MeshStandardMaterial).opacity).toBe(1);

    for (let frame = 0; frame < 30; frame += 1) {
      fade.update(CAMERA, POSE, true, FRAME_SECONDS);
    }
    expect(material.opacity).toBe(OCCLUSION_FADE_CONFIG.opacity);

    // 車開走了（鏡頭與車都平移到旁邊）：淡回來，實例的矩陣與原本一模一樣。
    const away: VehiclePose = { ...POSE, x: ftToM(-40) };
    const awayCamera = { ...CAMERA, x: ftToM(-40) };
    fade.update(awayCamera, away, true, FRAME_SECONDS);
    expect(material.opacity).toBeGreaterThan(OCCLUSION_FADE_CONFIG.opacity);
    expect(fade.fadedCount()).toBe(1);
    for (let frame = 0; frame < 30; frame += 1) {
      fade.update(awayCamera, away, true, FRAME_SECONDS);
    }
    expect(fade.fadedCount()).toBe(0);
    expect(Array.from(mesh.instanceMatrix.array)).toEqual(before);
    expect(standIn?.visible).toBe(false);
    expect(hidden).toEqual([false, false, false]);
  });

  test('不是跟車鏡頭（active = false）：不淡；已經淡掉的會淡回來', () => {
    const { root, mesh } = poleScene();
    const fade = createOcclusionFade(root);
    fade.update(CAMERA, POSE, false, FRAME_SECONDS);
    expect(fade.fadedCount()).toBe(0);
    expect(standIns(mesh)).toHaveLength(0);
    fade.update(CAMERA, POSE, true, FRAME_SECONDS);
    expect(fade.fadedCount()).toBe(1);
    for (let frame = 0; frame < 30; frame += 1) {
      fade.update(CAMERA, POSE, false, FRAME_SECONDS);
    }
    expect(fade.fadedCount()).toBe(0);
    expect(instanceScale(mesh, 0)).toBeGreaterThan(1);
  });
});

describe('背景車', () => {
  test('擋住的那一台整台淡（車殼各分區＋四個輪胎與輪圈），車牌上的字藏起來；旁邊那一台不動', () => {
    const size = { sizeX: ftToM(6), sizeY: 0, sizeZ: ftToM(15) };
    // 第 0 台橫在鏡頭與車之間，第 1 台在 30 ft 外。
    const cars = createParkedCars([
      { x: 0, z: ftToM(13), y: 0, headingRad: Math.PI / 2, variant: 0.1, ...size },
      { x: ftToM(30), z: 0, y: 0, headingRad: 0, variant: 0.6, ...size },
    ]);
    const root = new Group();
    root.add(cars);
    const plateText = cars.getObjectByName('parkedCars:plateText');
    if (!(plateText instanceof Mesh)) {
      throw new Error('找不到車牌的字');
    }
    const fade = createOcclusionFade(root);
    expect(fade.count).toBe(2);
    expect(Array.isArray(plateText.material)).toBe(false);

    fade.update(CAMERA, POSE, true, FRAME_SECONDS);
    expect(fade.fadedCount()).toBe(1);
    const instancedMeshes = cars.children.filter(
      (child): child is InstancedMesh => child instanceof InstancedMesh,
    );
    for (const mesh of instancedMeshes) {
      const perCar = mesh.name === 'parkedCars:tire' || mesh.name === 'parkedCars:rim' ? 4 : 1;
      expect(standIns(mesh)).toHaveLength(perCar);
      for (let index = 0; index < perCar; index += 1) {
        expect(instanceScale(mesh, index)).toBe(0);
        expect(instanceScale(mesh, perCar + index)).toBeGreaterThan(1);
      }
    }
    // 烤漆的替身帶著這台車自己的車色。
    const paint = cars.getObjectByName('parkedCars:paint');
    const paintStandIn = paint instanceof InstancedMesh ? standIns(paint)[0] : undefined;
    const tint = (paintStandIn?.material as MeshStandardMaterial).color;
    expect(tint.r + tint.g + tint.b).toBeLessThan(3);
    // 車牌的字：只畫第 1 台的那一組。
    expect(Array.isArray(plateText.material)).toBe(true);
    expect(plateText.geometry.groups).toHaveLength(1);
    expect(plateText.geometry.groups[0]?.start).toBeGreaterThan(0);

    for (let frame = 0; frame < 40; frame += 1) {
      fade.update(CAMERA, POSE, false, FRAME_SECONDS);
    }
    expect(fade.fadedCount()).toBe(0);
    expect(Array.isArray(plateText.material)).toBe(false);
    expect(plateText.geometry.groups).toHaveLength(0);
  });
});

describe('w1_l07：起點的近距離跟車鏡頭', () => {
  const level = levelById('w1_l07');
  if (level === undefined) {
    throw new Error('找不到 w1_l07');
  }
  const layout = createEnvironmentLayout(level, QUALITY_PRESETS.ultra.props);
  if (layout === undefined) {
    throw new Error('w1_l07 沒有環境佈局');
  }
  const environment = createEnvironment(level.layout.spot, layout, QUALITY_PRESETS.ultra.props, true);

  test('路燈、樹、背景車、建築塊都登記了', () => {
    let count = 0;
    environment.traverse((object) => {
      count += occludersOf(object).length;
    });
    expect(count).toBeGreaterThanOrEqual(
      layout.lot.lamps.length + layout.lot.trees.length + layout.lot.parkedCars.length + 1,
    );
  });

  test('車後方那一根路燈（參考圖擋住右半邊的那根）被淡掉；其他路燈、樹、建築都不淡', () => {
    const start = level.layout.startState;
    const camera = createGameCamera('chase_near', start).camera;
    const fade = createOcclusionFade(environment);
    fade.update(camera.position, start, true, FRAME_SECONDS);
    const fadedIn = (name: string): number => {
      const mesh = environment.getObjectByName(name);
      return mesh instanceof InstancedMesh ? standIns(mesh).length : 0;
    };
    expect(fadedIn('lampPosts')).toBe(1);
    expect(fadedIn('lampLenses')).toBe(1);
    expect(fadedIn('treeTrunks')).toBe(0);
    expect(fadedIn('foliage')).toBe(0);
    expect(fadedIn('environmentSlabs')).toBe(0);
    expect(fadedIn('buildings')).toBe(0);
    // 這一關的起點，鏡頭就在邊界外那一列背景車的車頭旁邊（不到 1.5 ft）：貼著鏡頭的那一台也淡，最多一台。
    expect(fadedIn('parkedCars:paint')).toBeLessThanOrEqual(1);
    expect(fade.fadedCount()).toBe(1 + fadedIn('parkedCars:paint'));
  });
});
