// 倒車雷達量的距離：正後方的牆、斜放的車、旁邊與前面的東西不算、與碰撞判定是同一把尺。
import { describe, expect, test } from 'vitest';
import { forward, right } from '../src/core/heading';
import { createRng } from '../src/core/rng';
import { degToRad, ftToM, mToFt } from '../src/core/units';
import { boundsWallsFt, obbCorners, obbFromFt, vehicleHits, type Obb } from '../src/level/collision';
import { REAR_SENSOR_SIDE_MARGIN_FT, rearClearanceFt } from '../src/level/rearSensor';
import type { VehicleState } from '../src/vehicle/bicycleModel';

/** 車身 6 × 15 ft。 */
const HALF_WIDTH_FT = 3;
const HALF_LENGTH_FT = 7.5;
const HALF_BAND_FT = HALF_WIDTH_FT + REAR_SENSOR_SIDE_MARGIN_FT;

function box(xFt: number, zFt: number, widthFt: number, lengthFt: number, headingDeg = 0): Obb {
  return obbFromFt({ centerXFt: xFt, centerZFt: zFt, widthFt, lengthFt, headingDeg });
}

/** 車頭朝北（−Z）時車尾在中心南邊 7.5 ft。 */
function vehicleAt(xFt: number, zFt: number, headingDeg = 0): VehicleState {
  return { x: ftToM(xFt), z: ftToM(zFt), headingRad: degToRad(headingDeg), speedMps: 0, steerRad: 0 };
}

/** 沿車尾方向直直退 distanceFt 之後的車。 */
function backedUp(vehicle: VehicleState, distanceFt: number): VehicleState {
  const ahead = forward(vehicle.headingRad);
  return {
    ...vehicle,
    x: vehicle.x - ahead.x * ftToM(distanceFt),
    z: vehicle.z - ahead.z * ftToM(distanceFt),
  };
}

/**
 * 另一種算法當對照：沿碰撞盒的四條邊密密地取點，留下落在帶子裡的，取最靠近車尾的那一點。
 * 整塊都在車尾那條線之前就不算。
 */
function sampledClearanceFt(vehicle: VehicleState, obstacle: Obb): number {
  const ahead = forward(vehicle.headingRad);
  const across = right(vehicle.headingRad);
  const rearX = vehicle.x - ahead.x * ftToM(HALF_LENGTH_FT);
  const rearZ = vehicle.z - ahead.z * ftToM(HALF_LENGTH_FT);
  const corners = obbCorners(obstacle);
  let minW = Number.POSITIVE_INFINITY;
  let maxW = Number.NEGATIVE_INFINITY;
  const samples = 4000;
  corners.forEach((from, index) => {
    const to = corners[(index + 1) % corners.length] ?? from;
    for (let step = 0; step <= samples; step += 1) {
      const x = from.x + ((to.x - from.x) * step) / samples;
      const z = from.z + ((to.z - from.z) * step) / samples;
      const u = (x - rearX) * across.x + (z - rearZ) * across.z;
      const w = -((x - rearX) * ahead.x + (z - rearZ) * ahead.z);
      if (Math.abs(u) <= ftToM(HALF_BAND_FT)) {
        minW = Math.min(minW, w);
        maxW = Math.max(maxW, w);
      }
    }
  });
  return maxW > 0 ? mToFt(Math.max(minW, 0)) : Number.POSITIVE_INFINITY;
}

describe('rearClearanceFt：車尾到正後方最近的碰撞盒', () => {
  test('正後方一面牆：距離是車尾到牆面的淨空', () => {
    // 車尾在 z = 7.5；牆 1 ft 厚、中心在 z = 13，近的那一面在 z = 12.5。
    expect(rearClearanceFt(vehicleAt(0, 0), [box(0, 13, 40, 1)])).toBeCloseTo(5, 9);
    expect(rearClearanceFt(vehicleAt(0, 0), [box(0, 8.5, 40, 1)])).toBeCloseTo(0.5, 9);
  });

  test('後面什麼都沒有是 Infinity；沒有任何碰撞盒也是', () => {
    expect(rearClearanceFt(vehicleAt(0, 0), [])).toBe(Number.POSITIVE_INFINITY);
    expect(rearClearanceFt(vehicleAt(0, 0), [box(30, 30, 4, 4)])).toBe(Number.POSITIVE_INFINITY);
  });

  test('車頭前面的東西不算', () => {
    expect(rearClearanceFt(vehicleAt(0, 0), [box(0, -12, 40, 1)])).toBe(Number.POSITIVE_INFINITY);
    // 前面很近、後面很遠：量到的是後面那一個。
    expect(rearClearanceFt(vehicleAt(0, 0), [box(0, -8.5, 40, 1), box(0, 30, 40, 1)])).toBeCloseTo(22, 9);
  });

  test('旁邊的東西不算：隔壁車位的車離車身 1.5 ft，雷達不叫', () => {
    const neighbours = [box(-7.5, 2, 6, 15), box(7.5, 2, 6, 15)];
    expect(rearClearanceFt(vehicleAt(0, 0), neighbours)).toBe(Number.POSITIVE_INFINITY);
    // 車尾後方、比車身寬出去 1 ft 的柱子也不算。
    expect(rearClearanceFt(vehicleAt(0, 0), [box(HALF_WIDTH_FT + 2, 12, 2, 2)])).toBe(
      Number.POSITIVE_INFINITY,
    );
  });

  test('差一點點就擦到車尾角的東西算在後面（帶子比車身每邊寬一點）', () => {
    // 柱子的內緣離車身側面 0.1 ft：在帶子裡。
    const post = box(HALF_WIDTH_FT + 0.1 + 0.5, 11, 1, 1);
    expect(rearClearanceFt(vehicleAt(0, 0), [post])).toBeCloseTo(3, 9);
    // 內緣離車身側面超過那個餘裕：不算。
    const clear = box(HALF_WIDTH_FT + REAR_SENSOR_SIDE_MARGIN_FT + 0.01 + 0.5, 11, 1, 1);
    expect(rearClearanceFt(vehicleAt(0, 0), [clear])).toBe(Number.POSITIVE_INFINITY);
  });

  test('好幾個東西取最近的；小東西（交通錐）夾在中間也量得到', () => {
    const cone = box(1, 10, 1, 1);
    expect(rearClearanceFt(vehicleAt(0, 0), [box(0, 20, 40, 1), cone, box(0, 30, 6, 15)])).toBeCloseTo(
      2,
      9,
    );
  });

  test('斜放在後面的車：量到它最靠近車尾的那個角', () => {
    const vehicle = vehicleAt(0, 0);
    const parked = box(1, 20, 6, 15, 30);
    const nearestCornerW = Math.min(
      ...obbCorners(parked)
        .filter((corner) => Math.abs(mToFt(corner.x)) <= HALF_BAND_FT)
        .map((corner) => mToFt(corner.z) - HALF_LENGTH_FT),
    );
    expect(rearClearanceFt(vehicle, [parked])).toBeCloseTo(nearestCornerW, 9);
    expect(rearClearanceFt(vehicle, [parked])).toBeCloseTo(sampledClearanceFt(vehicle, parked), 2);
  });

  test('斜的長牆橫過車尾後方：最近的點在帶子的邊上（牆的角都在帶子外面）', () => {
    const vehicle = vehicleAt(0, 0);
    const wall = box(0, 16, 60, 1, 20);
    const clearance = rearClearanceFt(vehicle, [wall]);
    expect(clearance).toBeCloseTo(sampledClearanceFt(vehicle, wall), 2);
    // 牆面的中心線過 (0, 16)、往一邊斜 20°：帶子邊上比正後方近。
    expect(clearance).toBeLessThan(16 - HALF_LENGTH_FT - 0.5);
    expect(clearance).toBeGreaterThan(5);
  });

  test('車朝任何方向、碰撞盒怎麼擺，都與逐點取樣的對照算法一致', () => {
    const random = createRng(0xb15);
    for (let round = 0; round < 300; round += 1) {
      const vehicle = vehicleAt(random() * 40 - 20, random() * 40 - 20, random() * 360);
      const obstacle = box(
        random() * 80 - 40,
        random() * 80 - 40,
        1 + random() * 12,
        1 + random() * 20,
        random() * 360,
      );
      // 與車身重疊的擺法在遊戲裡不會出現（撞到就被退回上一步）。
      if (vehicleHits(vehicle, [obstacle]).length > 0) {
        continue;
      }
      const expected = sampledClearanceFt(vehicle, obstacle);
      const actual = rearClearanceFt(vehicle, [obstacle]);
      if (expected === Number.POSITIVE_INFINITY) {
        // 取樣可能漏掉只擦過帶子邊緣一點點的角；那種情況量到的距離一定很接近帶子邊上的值，這裡只要求不是負的。
        expect(actual).toBeGreaterThanOrEqual(0);
      } else {
        expect(actual).toBeCloseTo(expected, 1);
      }
    }
  });

  test('與碰撞判定同一把尺：退到差一點點不會撞，再多退一點就撞到', () => {
    const random = createRng(0x5e50);
    let checked = 0;
    for (let round = 0; round < 200; round += 1) {
      const vehicle = vehicleAt(random() * 20 - 10, random() * 20 - 10, random() * 360);
      const ahead = forward(vehicle.headingRad);
      // 擺在車尾後方 3–25 ft、左右不超出車身的方塊：最近的點一定在車身的寬度裡。
      const behindFt = HALF_LENGTH_FT + 3 + random() * 22;
      const obstacle: Obb = {
        x: vehicle.x - ahead.x * ftToM(behindFt),
        z: vehicle.z - ahead.z * ftToM(behindFt),
        halfWidthM: ftToM(0.5 + random() * 2),
        halfLengthM: ftToM(0.5 + random() * 2),
        headingRad: vehicle.headingRad,
      };
      const clearance = rearClearanceFt(vehicle, [obstacle]);
      expect(Number.isFinite(clearance)).toBe(true);
      expect(vehicleHits(backedUp(vehicle, clearance - 0.01), [obstacle])).toEqual([]);
      expect(vehicleHits(backedUp(vehicle, clearance + 0.01), [obstacle])).toEqual([0]);
      checked += 1;
    }
    expect(checked).toBe(200);
  });

  test('貼著後面的東西是 0，不會是負的', () => {
    expect(rearClearanceFt(vehicleAt(0, 0), [box(0, HALF_LENGTH_FT + 0.5, 40, 1)])).toBeCloseTo(0, 9);
  });

  test('邊界牆也量得到：場地 100 × 100 ft，車在正中央朝北，車尾離南牆 42.5 ft', () => {
    const walls = boundsWallsFt({ minXFt: -50, minZFt: -50, maxXFt: 50, maxZFt: 50 }).map(obbFromFt);
    expect(rearClearanceFt(vehicleAt(0, 0), walls)).toBeCloseTo(42.5, 9);
    // 車頭朝東（+X）：車尾對著西牆。
    expect(rearClearanceFt(vehicleAt(10, 0, 90), walls)).toBeCloseTo(60 - HALF_LENGTH_FT, 9);
    // 斜 45°：車尾對著西南角，量到的是比較近的那一面牆。
    const diagonal = rearClearanceFt(vehicleAt(0, 0, 45), walls);
    expect(diagonal).toBeGreaterThan(50);
    expect(diagonal).toBeLessThan(50 * Math.SQRT2 - HALF_LENGTH_FT + 0.01);
  });
});
