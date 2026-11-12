// 2D OBB 碰撞：分離軸測試（平行、旋轉、角對邊、剛好相切）、車身外框、邊界盒、粗篩不漏判。
import { describe, expect, test } from 'vitest';
import { degToRad, ftToM, mToFt } from '../src/core/units';
import {
  BOUNDS_WALL_THICKNESS_FT,
  boundingCirclesTouch,
  boundsWallsFt,
  firstHit,
  obbCorners,
  obbFromFt,
  obbRadius,
  obbsOverlap,
  vehicleHits,
  vehicleObb,
  type Obb,
  type ObbFt,
} from '../src/level/collision';
import { createRng } from '../src/core/rng';
import { vehicleCorners, type VehicleState } from '../src/vehicle/bicycleModel';

/** 英尺／度寫的矩形，測試讀起來直接。 */
function box(xFt: number, zFt: number, widthFt: number, lengthFt: number, headingDeg = 0): Obb {
  return obbFromFt({ centerXFt: xFt, centerZFt: zFt, widthFt, lengthFt, headingDeg });
}

function vehicleAt(xFt: number, zFt: number, headingDeg = 0): VehicleState {
  return { x: ftToM(xFt), z: ftToM(zFt), headingRad: degToRad(headingDeg), speedMps: 0, steerRad: 0 };
}

/** 兩個方向都要得到同一個答案。 */
function overlapBothWays(a: Obb, b: Obb): boolean {
  const forwardResult = obbsOverlap(a, b);
  expect(obbsOverlap(b, a)).toBe(forwardResult);
  return forwardResult;
}

describe('obbFromFt 與外框', () => {
  test('英尺／度 → 公尺／弧度，寬長各取一半', () => {
    expect(box(10, -20, 6, 15, 90)).toEqual({
      x: ftToM(10),
      z: ftToM(-20),
      halfWidthM: ftToM(3),
      halfLengthM: ftToM(7.5),
      headingRad: Math.PI / 2,
    });
  });

  test('四個角：heading 0 時長沿 Z、寬沿 X；heading 90 時互換', () => {
    const north = obbCorners(box(0, 0, 6, 15, 0)).map((corner) => [mToFt(corner.x), mToFt(corner.z)]);
    expect(north[0]?.[0]).toBeCloseTo(-3, 9);
    expect(north[0]?.[1]).toBeCloseTo(-7.5, 9);
    expect(north[2]?.[0]).toBeCloseTo(3, 9);
    expect(north[2]?.[1]).toBeCloseTo(7.5, 9);

    const east = obbCorners(box(0, 0, 6, 15, 90)).map((corner) => [mToFt(corner.x), mToFt(corner.z)]);
    for (const [xFt = 0, zFt = 0] of east) {
      expect(Math.abs(xFt)).toBeCloseTo(7.5, 9);
      expect(Math.abs(zFt)).toBeCloseTo(3, 9);
    }
  });

  test('車身的矩形與 vehicleCorners() 是同一個外框', () => {
    const vehicle = vehicleAt(12, -7, 37);
    const fromObb = obbCorners(vehicleObb(vehicle));
    const fromVehicle = vehicleCorners(vehicle);
    fromObb.forEach((corner, index) => {
      expect(corner.x).toBeCloseTo(fromVehicle[index]?.x ?? NaN, 12);
      expect(corner.z).toBeCloseTo(fromVehicle[index]?.z ?? NaN, 12);
    });
  });
});

describe('obbsOverlap：分離軸', () => {
  test('平行：重疊、分開、一個包住另一個', () => {
    expect(overlapBothWays(box(0, 0, 4, 4), box(3, 0, 4, 4))).toBe(true);
    expect(overlapBothWays(box(0, 0, 4, 4), box(5, 0, 4, 4))).toBe(false);
    expect(overlapBothWays(box(0, 0, 4, 4), box(0, 5, 4, 4))).toBe(false);
    expect(overlapBothWays(box(0, 0, 10, 10), box(1, 1, 2, 2))).toBe(true);
    expect(overlapBothWays(box(0, 0, 4, 4), box(0, 0, 4, 4))).toBe(true);
  });

  test('剛好相切（間隙 0）不算重疊；再靠近一點就算', () => {
    // 邊貼邊：座標取 2 的次方的公尺值，相加沒有浮點誤差。
    const left: Obb = { x: 0, z: 0, halfWidthM: 1, halfLengthM: 1, headingRad: 0 };
    const touching: Obb = { x: 2, z: 0, halfWidthM: 1, halfLengthM: 1, headingRad: 0 };
    expect(overlapBothWays(left, touching)).toBe(false);
    expect(overlapBothWays(left, { ...touching, x: 2 - 1e-6 })).toBe(true);
    expect(overlapBothWays(left, { ...touching, x: 2 + 1e-6 })).toBe(false);
    // 角碰角。
    expect(overlapBothWays(left, { ...touching, z: 2 })).toBe(false);
  });

  test('旋轉 45° 的方塊：外接 AABB 重疊但實際沒碰到（要靠旋轉那一方的軸分開）', () => {
    // 邊長 4 的方塊轉 45°，尖角朝 ±X、±Z，角到中心 2√2 ≈ 2.83。
    const diamond = box(0, 0, 4, 4, 45);
    // 放在右上角的小方塊：落在 diamond 的 AABB（±2.83）裡，但在斜邊外面。
    expect(overlapBothWays(diamond, box(2.4, -2.4, 1, 1))).toBe(false);
    // 往中心移，壓到斜邊。
    expect(overlapBothWays(diamond, box(1.6, -1.6, 1, 1))).toBe(true);
  });

  test('角對邊：尖角剛好沒碰到邊、戳進邊裡', () => {
    const diamond = box(0, 0, 4, 4, 45);
    const reachFt = 2 * Math.SQRT2;
    // 牆的左緣在 x = wallLeft；尖角在 x = reach。
    const wallAt = (leftFt: number): Obb => box(leftFt + 1, 0, 2, 20);
    expect(overlapBothWays(diamond, wallAt(reachFt + 0.01))).toBe(false);
    expect(overlapBothWays(diamond, wallAt(reachFt - 0.01))).toBe(true);
  });

  test('兩個都旋轉：十字交叉重疊；平行錯開不重疊', () => {
    expect(overlapBothWays(box(0, 0, 2, 20, 30), box(0, 0, 2, 20, 120))).toBe(true);
    // 同樣斜 30° 的兩條長條，沿法線方向錯開 3 ft（各寬 2 ft）。
    const normalX = Math.cos(degToRad(30));
    const normalZ = Math.sin(degToRad(30));
    expect(overlapBothWays(box(0, 0, 2, 20, 30), box(3 * normalX, 3 * normalZ, 2, 20, 30))).toBe(false);
    expect(overlapBothWays(box(0, 0, 2, 20, 30), box(1.9 * normalX, 1.9 * normalZ, 2, 20, 30))).toBe(true);
  });

  test('heading 差 180° 或 360° 是同一個矩形', () => {
    const other = box(3, 1, 2, 6, 20);
    for (const heading of [20, 200]) {
      expect(overlapBothWays(box(0, 0, 4, 9, heading), other)).toBe(
        obbsOverlap(box(0, 0, 4, 9, 20), other),
      );
    }
  });
});

describe('粗篩（外接圓）', () => {
  test('外接圓半徑 = 中心到角', () => {
    expect(mToFt(obbRadius(box(0, 0, 6, 8)))).toBeCloseTo(5, 9);
  });

  test('不漏判：固定種子的隨機矩形，只要分離軸說重疊，粗篩一定也說可能', () => {
    const rng = createRng(20261111);
    const between = (min: number, max: number): number => min + rng() * (max - min);
    const randomBox = (): Obb =>
      box(between(-20, 20), between(-20, 20), between(0.5, 20), between(0.5, 20), between(0, 360));
    let overlapping = 0;
    let rejected = 0;
    for (let trial = 0; trial < 4000; trial += 1) {
      const a = randomBox();
      const b = randomBox();
      const overlap = obbsOverlap(a, b);
      const maybe = boundingCirclesTouch(a, b);
      if (overlap) {
        overlapping += 1;
        expect(maybe).toBe(true);
      }
      if (!maybe) {
        rejected += 1;
      }
    }
    // 兩種情況都真的有測到。
    expect(overlapping).toBeGreaterThan(200);
    expect(rejected).toBeGreaterThan(200);
  });
});

describe('boundsWallsFt：四面邊界', () => {
  const bounds = { minXFt: -22, minZFt: -48, maxXFt: 34, maxZFt: 44 };
  const walls = boundsWallsFt(bounds).map(obbFromFt);

  test('四面牆貼在範圍外側，內緣剛好在 bounds 上', () => {
    const wallsFt = boundsWallsFt(bounds);
    expect(wallsFt).toHaveLength(4);
    const edges = (wall: ObbFt): readonly number[] => [
      wall.centerXFt - wall.widthFt / 2,
      wall.centerXFt + wall.widthFt / 2,
      wall.centerZFt - wall.lengthFt / 2,
      wall.centerZFt + wall.lengthFt / 2,
    ];
    const [west, east, north, south] = wallsFt.map(edges);
    expect(west?.[1]).toBe(bounds.minXFt);
    expect(east?.[0]).toBe(bounds.maxXFt);
    expect(north?.[3]).toBe(bounds.minZFt);
    expect(south?.[2]).toBe(bounds.maxZFt);
    for (const wall of wallsFt) {
      expect(Math.min(wall.widthFt, wall.lengthFt)).toBe(BOUNDS_WALL_THICKNESS_FT);
      expect(wall.headingDeg).toBe(0);
    }
  });

  test('範圍內的車（貼著邊也算）不會撞到；任何一邊超出一點就撞到那一面', () => {
    // 車 6×15 ft、車頭朝北：左緣 x−3、前緣 z−7.5。
    expect(vehicleHits(vehicleAt(0, 0), walls)).toEqual([]);
    expect(vehicleHits(vehicleAt(-18.9, 0), walls)).toEqual([]);
    expect(vehicleHits(vehicleAt(-19.1, 0), walls)).toEqual([0]);
    expect(vehicleHits(vehicleAt(31.1, 0), walls)).toEqual([1]);
    expect(vehicleHits(vehicleAt(0, -40.6), walls)).toEqual([2]);
    expect(vehicleHits(vehicleAt(0, 36.6), walls)).toEqual([3]);
  });

  test('角落：同時壓到兩面牆，沒有縫可以鑽出去', () => {
    expect(vehicleHits(vehicleAt(-19.1, -40.6), walls)).toEqual([0, 2]);
    expect(vehicleHits(vehicleAt(31.1, 36.6), walls)).toEqual([1, 3]);
    // 斜著頂在角落外面一點的地方也一定碰到至少一面。
    expect(vehicleHits(vehicleAt(-23, -49, 45), walls).length).toBeGreaterThan(0);
  });
});

describe('vehicleHits／firstHit', () => {
  const cone = box(0, -12, 1.2, 1.2);
  const car = box(12, 0, 6, 15, 90);

  test('沒有障礙物、或都離得遠 → 空的，firstHit 是 −1', () => {
    expect(vehicleHits(vehicleAt(0, 0), [])).toEqual([]);
    expect(vehicleHits(vehicleAt(0, 20), [cone, car])).toEqual([]);
    expect(firstHit(vehicleAt(0, 20), [cone, car])).toBe(-1);
  });

  test('車頭前緣在 z = −7.5：錐的近緣在 −11.4，往前 3.8 ft 還沒碰到、4 ft 碰到', () => {
    expect(vehicleHits(vehicleAt(0, -3.8), [cone, car])).toEqual([]);
    expect(vehicleHits(vehicleAt(0, -4), [cone, car])).toEqual([0]);
    expect(firstHit(vehicleAt(0, -4), [cone, car])).toBe(0);
  });

  test('回傳的是索引，同時壓到多個就全部列出（由小到大）', () => {
    // 橫停的車佔 x ∈ [4.5, 19.5]、z ∈ [−3, 3]；車在 (2.5, −6) 朝北，車身 x ∈ [−0.5, 5.5]、z ∈ [−13.5, 1.5]，同時壓到錐與車。
    expect(vehicleHits(vehicleAt(2.5, -6), [cone, car])).toEqual([0, 1]);
    expect(vehicleHits(vehicleAt(2.5, -6), [car, cone])).toEqual([0, 1]);
    expect(firstHit(vehicleAt(8, 6), [cone, car])).toBe(1);
  });

  test('車轉了方向：橫著過得去的地方，斜著會掃到', () => {
    // 錐在車的右前方：車朝北時右緣 x = 3，錐的左緣 x = 3.4。
    const sideCone = box(4, -5, 1.2, 1.2);
    expect(vehicleHits(vehicleAt(0, 0, 0), [sideCone])).toEqual([]);
    expect(vehicleHits(vehicleAt(0, 0, 30), [sideCone])).toEqual([0]);
  });
});
