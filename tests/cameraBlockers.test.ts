// 跟車鏡頭的擋塊：哪些東西算（實心、佔地夠大、沒標 passable）、球沿線段掃過去最遠走到哪。不開 WebGL。
import { BoxGeometry, Group, InstancedMesh, MeshStandardMaterial } from 'three';
import { describe, expect, test } from 'vitest';
import { ftToM, mToFt } from '../src/core/units';
import { LEVELS, levelById } from '../src/level/levelCatalog';
import { occluderBox, registerCameraBlockers, registerOccluders } from '../src/props/occluders';
import {
  blockerTopM,
  clearFraction,
  collectCameraBlockers,
  firstBlocker,
} from '../src/render/cameraBlockers';
import { pointInBox, sightBox } from '../src/render/occlusionFade';
import { GAME_CAMERA_CONFIG, QUALITY_PRESETS } from '../src/render/renderConfig';
import { buildLevelWorld } from './levelWorld';

const MARGIN_M = GAME_CAMERA_CONFIG.avoidance.clearanceM;

/** 一面牆：中心在 (0, z)、面向 Z，寬 20 ft、厚 2 ft。 */
function wallAt(zFt: number, heightFt: number): ReturnType<typeof sightBox> {
  return sightBox(
    occluderBox(
      { x: 0, y: ftToM(heightFt) / 2, z: ftToM(zFt) },
      { x: ftToM(20), y: ftToM(heightFt), z: ftToM(2) },
    ),
  );
}

describe('球沿線段掃過去', () => {
  const wall = wallAt(20, 10);
  const from = { x: 0, y: ftToM(4), z: 0 };

  test('前面沒有東西 → 全程暢通', () => {
    expect(clearFraction(from, { x: 0, y: ftToM(4), z: ftToM(15) }, [wall], 0)).toBe(1);
    expect(firstBlocker(from, { x: 0, y: ftToM(4), z: ftToM(15) }, [wall], 0).blocker).toBeUndefined();
  });

  test('穿過牆 → 停在牆面前面，餘裕越大停得越早', () => {
    const to = { x: 0, y: ftToM(4), z: ftToM(38) };
    // 牆面在 z = 19 ft：走到 19 / 38。
    expect(clearFraction(from, to, [wall], 0)).toBeCloseTo(19 / 38, 9);
    expect(clearFraction(from, to, [wall], ftToM(1))).toBeCloseTo(18 / 38, 9);
    expect(firstBlocker(from, to, [wall], 0).blocker).toBe(wall);
  });

  test('從牆頂上面過去：離牆頂不到餘裕也算擋住', () => {
    const over = { x: 0, y: ftToM(10.5), z: ftToM(38) };
    const start = { x: 0, y: ftToM(10.5), z: 0 };
    expect(clearFraction(start, over, [wall], 0)).toBe(1);
    expect(clearFraction(start, over, [wall], ftToM(1))).toBeLessThan(1);
  });

  test('兩塊都擋：回報先碰到的那一塊', () => {
    const near = wallAt(10, 10);
    const hit = firstBlocker(from, { x: 0, y: ftToM(4), z: ftToM(38) }, [wall, near], 0);
    expect(hit.blocker).toBe(near);
    expect(hit.fraction).toBeCloseTo(9 / 38, 9);
  });

  test('起點已經在擋塊（含餘裕）裡面：那一塊不算，不會把鏡頭壓回起點', () => {
    const inside = { x: 0, y: ftToM(4), z: ftToM(18.5) };
    expect(pointInBox(inside, wall, ftToM(1))).toBe(true);
    expect(clearFraction(inside, { x: 0, y: ftToM(4), z: ftToM(40) }, [wall], ftToM(1))).toBe(1);
  });

  test('擋塊的頂面高度', () => {
    expect(mToFt(blockerTopM(wall))).toBeCloseTo(10, 9);
  });
});

describe('收集擋塊', () => {
  function instanced(count: number): InstancedMesh {
    return new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial(), count);
  }

  test('實心、佔地夠大的算；標成 passable 的、細桿與薄片不算；只擋不淡的另外登記', () => {
    const root = new Group();
    const mesh = instanced(5);
    root.add(mesh);
    const box = (xFt: number, widthFt: number, lengthFt: number): ReturnType<typeof occluderBox> =>
      occluderBox(
        { x: ftToM(xFt), y: ftToM(5), z: 0 },
        { x: ftToM(widthFt), y: ftToM(10), z: ftToM(lengthFt) },
      );
    registerOccluders(root, [
      // 一台車那麼大：算。
      { boxes: [box(0, 6, 15)], parts: [{ mesh, index: 0 }] },
      // 樹冠很大，但標成 passable：不算。
      { boxes: [box(30, 12, 12)], parts: [{ mesh, index: 1 }], passable: true },
      // 細桿、薄片（窗）：不算。
      { boxes: [box(60, 0.6, 0.6)], parts: [{ mesh, index: 2 }] },
      { boxes: [box(90, 6.5, 0.2)], parts: [{ mesh, index: 3 }] },
      // 又薄又長的牆：算。
      { boxes: [box(120, 1, 12)], parts: [{ mesh, index: 4 }] },
    ]);
    registerCameraBlockers(root, [box(150, 40, 40)]);

    const centersFt = collectCameraBlockers(root).map((blocker) => Math.round(mToFt(blocker.center.x)));
    expect(centersFt.sort((a, b) => a - b)).toEqual([0, 120, 150]);
  });

  test('擋塊的位置跟著它所在的物件走（世界座標）', () => {
    const root = new Group();
    const child = new Group();
    child.position.set(ftToM(100), 0, ftToM(-50));
    root.add(child);
    registerCameraBlockers(child, [
      occluderBox({ x: 0, y: 1, z: 0 }, { x: 4, y: 2, z: 4 }),
    ]);
    const [blocker] = collectCameraBlockers(root);
    expect(mToFt(blocker?.center.x ?? 0)).toBeCloseTo(100, 6);
    expect(mToFt(blocker?.center.z ?? 0)).toBeCloseTo(-50, 6);
  });

  test.each(LEVELS.map((level) => [level.id, level] as const))(
    '%s：起點的車身中心不在任何一塊擋塊（含餘裕）裡面，開場的桿子一定有起點',
    (_id, level) => {
      const blockers = collectCameraBlockers(buildLevelWorld(level, QUALITY_PRESETS.medium));
      const start = level.layout.startState;
      for (const height of [GAME_CAMERA_CONFIG.chaseNear.lookAtHeightM, GAME_CAMERA_CONFIG.chaseFar.lookAtHeightM]) {
        expect(
          blockers.filter((blocker) => pointInBox({ x: start.x, y: height, z: start.z }, blocker, MARGIN_M)),
        ).toEqual([]);
      }
    },
  );

  test('巷子（w1_l10）：兩旁的整棟建築是擋塊，四面的高度各自不同；路燈不是', () => {
    const level = levelById('w1_l10');
    if (level === undefined) {
      throw new Error('找不到 w1_l10');
    }
    const blockers = collectCameraBlockers(buildLevelWorld(level, QUALITY_PRESETS.medium));
    // 南面那一棟（車的正後方）：比遠距離跟車鏡頭的高度矮——鏡頭原本就是落在它的屋頂上方。
    const south = blockers.find(
      (blocker) => mToFt(blocker.center.z) > 100 && mToFt(blocker.size.x) > 100,
    );
    if (south === undefined) {
      throw new Error('找不到南面的建築');
    }
    expect(mToFt(blockerTopM(south))).toBeLessThan(mToFt(GAME_CAMERA_CONFIG.chaseFar.heightM));
    // 沒有細桿：路燈的燈桿 0.6 ft 見方。
    expect(blockers.every((blocker) => mToFt(Math.max(blocker.size.x, blocker.size.z)) > 3)).toBe(true);
  });

  test('空曠的停車場（w1_l01）：邊界是矮路緣，不算擋塊；停著的背景車算', () => {
    const level = levelById('w1_l01');
    if (level === undefined) {
      throw new Error('找不到 w1_l01');
    }
    const blockers = collectCameraBlockers(buildLevelWorld(level, QUALITY_PRESETS.medium));
    expect(blockers.length).toBeGreaterThan(0);
    expect(blockers.every((blocker) => mToFt(blockerTopM(blocker)) >= 3.4)).toBe(true);
    expect(
      blockers.some(
        (blocker) =>
          Math.abs(mToFt(blocker.size.x) - 6) < 0.01 && Math.abs(mToFt(blocker.size.z) - 15) < 0.01,
      ),
    ).toBe(true);
  });
});
