// 算圖層裡可以不開瀏覽器就驗證的部分：柏油貼圖的可重現性、鏡頭平滑、車輛模型的朝向約定。
import { Mesh, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { DEFAULT_SEED } from '../src/core/gameConfig';
import { forward } from '../src/core/heading';
import { degToRad } from '../src/core/units';
import { generateAsphaltPixels } from '../src/props/ground';
import { createFollowCamera, smoothingFactor } from '../src/render/followCamera';
import { CAMERA_CONFIG, GROUND_CONFIG } from '../src/render/renderConfig';
import { createCarMesh, updateCarMesh } from '../src/vehicle/carMesh';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';

const DIGITS = 9;

describe('柏油貼圖 generateAsphaltPixels', () => {
  test('同種子位元組完全相同，不同種子不同', () => {
    const first = generateAsphaltPixels(DEFAULT_SEED);
    expect(generateAsphaltPixels(DEFAULT_SEED)).toEqual(first);
    expect(generateAsphaltPixels(DEFAULT_SEED + 1)).not.toEqual(first);
  });

  test('大小是 邊長² × 4，全部不透明，而且不是純死色', () => {
    const pixels = generateAsphaltPixels(DEFAULT_SEED);
    const pixelCount = GROUND_CONFIG.textureSizePx ** 2;
    expect(pixels.length).toBe(pixelCount * 4);

    const redValues = new Set<number>();
    let transparentPixels = 0;
    for (let index = 0; index < pixelCount; index += 1) {
      if (pixels[index * 4 + 3] !== 255) {
        transparentPixels += 1;
      }
      redValues.add(pixels[index * 4] ?? 0);
    }
    expect(transparentPixels).toBe(0);
    expect(redValues.size).toBeGreaterThan(30);
  });
});

describe('鏡頭平滑 smoothingFactor', () => {
  test('dt = 0 不動；dt 很大時趨近 1', () => {
    expect(smoothingFactor(0, 0.25)).toBe(0);
    expect(smoothingFactor(100, 0.25)).toBeCloseTo(1, DIGITS);
  });

  test('過一個時間常數，逼近 1 − 1/e', () => {
    expect(smoothingFactor(0.25, 0.25)).toBeCloseTo(1 - 1 / Math.E, DIGITS);
  });

  test('與幀率無關：一幀走完與切成四幀走完，剩下的距離比例相同', () => {
    const remainingAfterOneFrame = 1 - smoothingFactor(1 / 30, 0.25);
    const remainingAfterFourFrames = (1 - smoothingFactor(1 / 120, 0.25)) ** 4;
    expect(remainingAfterFourFrames).toBeCloseTo(remainingAfterOneFrame, DIGITS);
  });
});

describe('跟隨鏡頭 createFollowCamera', () => {
  test('一開始就在起點 + 固定世界偏移', () => {
    const { camera } = createFollowCamera(10, -20);
    expect(camera.position.x).toBeCloseTo(10, DIGITS);
    expect(camera.position.y).toBeCloseTo(CAMERA_CONFIG.offsetHeightM, DIGITS);
    expect(camera.position.z).toBeCloseTo(-20 + CAMERA_CONFIG.offsetBackM, DIGITS);
  });

  test('60 fps 與 240 fps 跟同一個目標 1 秒，鏡頭位置相同', () => {
    const settle = (framesPerSecond: number): Vector3 => {
      const follow = createFollowCamera(0, 0);
      for (let frame = 0; frame < framesPerSecond; frame += 1) {
        follow.update(30, -40, 1 / framesPerSecond);
      }
      return follow.camera.position;
    };
    const slow = settle(60);
    const fast = settle(240);
    expect(fast.x).toBeCloseTo(slow.x, DIGITS);
    expect(fast.z).toBeCloseTo(slow.z, DIGITS);
    // 1 秒 = 4 個時間常數，已經很接近目標但還沒完全到。
    expect(slow.x).toBeGreaterThan(29);
    expect(slow.x).toBeLessThan(30);
  });

  test('鏡頭朝向不隨目標位置改變（不隨車旋轉、只平移）', () => {
    const follow = createFollowCamera(0, 0);
    const before = follow.camera.quaternion.clone();
    follow.update(50, 80, 0.5);
    expect(follow.camera.quaternion.angleTo(before)).toBeCloseTo(0, DIGITS);
  });
});

describe('車輛模型 carMesh', () => {
  /** 本地座標的點經過整台車的位置與旋轉後的世界座標。 */
  function toWorld(car: ReturnType<typeof createCarMesh>, local: Vector3): Vector3 {
    car.root.updateMatrixWorld(true);
    return car.root.localToWorld(local.clone());
  }

  test('模型車頭朝本地 −Z：擺到各個 heading 後，本地 −Z 的世界方向等於 forward(heading)', () => {
    const car = createCarMesh();
    for (const headingDeg of [0, 30, 90, 180, 270, 359]) {
      const headingRad = degToRad(headingDeg);
      updateCarMesh(car, { x: 3, z: -7, headingRad, steerRad: 0 });
      const origin = toWorld(car, new Vector3(0, 0, 0));
      const nose = toWorld(car, new Vector3(0, 0, -1));
      const expected = forward(headingRad);
      expect(origin.x).toBeCloseTo(3, DIGITS);
      expect(origin.z).toBeCloseTo(-7, DIGITS);
      expect(nose.x - origin.x).toBeCloseTo(expected.x, DIGITS);
      expect(nose.z - origin.z).toBeCloseTo(expected.z, DIGITS);
    }
  });

  test('前輪樞軸在車身中心前方半個軸距、左右對稱；向右打時 rotation.y 為負', () => {
    const car = createCarMesh();
    const steerRad = degToRad(20);
    updateCarMesh(car, { x: 0, z: 0, headingRad: 0, steerRad });
    const [left, right] = car.frontWheelPivots;
    expect(left.position.z).toBeCloseTo(-VEHICLE_CONFIG_SI.wheelbaseM / 2, DIGITS);
    expect(right.position.z).toBeCloseTo(-VEHICLE_CONFIG_SI.wheelbaseM / 2, DIGITS);
    expect(left.position.x).toBeLessThan(0);
    expect(right.position.x).toBeCloseTo(-left.position.x, DIGITS);
    expect(left.rotation.y).toBeCloseTo(-steerRad, DIGITS);
    expect(right.rotation.y).toBeCloseTo(-steerRad, DIGITS);
  });

  test('模型的外框等於 VehicleConfig 的長寬高，底部貼地', () => {
    const car = createCarMesh();
    car.root.updateMatrixWorld(true);
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    const vertex = new Vector3();
    car.root.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return;
      }
      const positions = object.geometry.getAttribute('position');
      for (let index = 0; index < positions.count; index += 1) {
        vertex.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld);
        min.min(vertex);
        max.max(vertex);
      }
    });
    expect(max.x - min.x).toBeCloseTo(VEHICLE_CONFIG_SI.widthM, 6);
    expect(max.z - min.z).toBeCloseTo(VEHICLE_CONFIG_SI.lengthM, 6);
    expect(max.y).toBeCloseTo(VEHICLE_CONFIG_SI.heightM, 6);
    expect(min.y).toBeCloseTo(0, 6);
    // 前後對稱於原點：車頭在 −長/2、車尾在 +長/2。
    expect(min.z).toBeCloseTo(-VEHICLE_CONFIG_SI.lengthM / 2, 6);
  });
});
