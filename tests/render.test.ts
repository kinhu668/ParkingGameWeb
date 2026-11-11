// 算圖層裡可以不開瀏覽器就驗證的部分：柏油貼圖的可重現性、鏡頭平滑、車輛模型的朝向約定、車位標線的範圍。
import { Box3, Mesh, Object3D, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { DEFAULT_SEED } from '../src/core/gameConfig';
import { forward } from '../src/core/heading';
import { degToRad, ftToM } from '../src/core/units';
import { parkingSpotFromFt } from '../src/level/parkingJudge';
import { generateAsphaltPixels } from '../src/props/ground';
import { createSpotMarkings } from '../src/props/spotMarkings';
import { createFollowCamera, createPresetCamera, smoothingFactor } from '../src/render/followCamera';
import {
  CAMERA_CONFIG,
  FIXED_CAMERA_CONFIG,
  GROUND_CONFIG,
  SPOT_MARKING_CONFIG,
} from '../src/render/renderConfig';
import { SHOWCASE_IDS, createShowcaseObject } from '../src/render/showcase';
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

describe('車位標線 spotMarkings', () => {
  /** 標線網格在世界座標的外框。 */
  function worldBounds(headingDeg: number): Box3 {
    const markings = createSpotMarkings(
      parkingSpotFromFt({ centerXFt: 40, centerZFt: -25, widthFt: 9, lengthFt: 18, headingDeg }),
    );
    markings.updateMatrixWorld(true);
    return new Box3().setFromObject(markings, true);
  }

  test('heading 0：外緣剛好是 9×18 ft 的車位邊界，中心在車位中心', () => {
    const bounds = worldBounds(0);
    expect(bounds.min.x).toBeCloseTo(ftToM(40 - 4.5), 6);
    expect(bounds.max.x).toBeCloseTo(ftToM(40 + 4.5), 6);
    expect(bounds.min.z).toBeCloseTo(ftToM(-25 - 9), 6);
    expect(bounds.max.z).toBeCloseTo(ftToM(-25 + 9), 6);
  });

  test('heading 90°：長邊轉到東西向（X）', () => {
    const bounds = worldBounds(90);
    expect(bounds.max.x - bounds.min.x).toBeCloseTo(ftToM(18), 6);
    expect(bounds.max.z - bounds.min.z).toBeCloseTo(ftToM(9), 6);
    expect((bounds.min.x + bounds.max.x) / 2).toBeCloseTo(ftToM(40), 6);
    expect((bounds.min.z + bounds.max.z) / 2).toBeCloseTo(ftToM(-25), 6);
  });

  test('平貼地面、略高於地面，面朝上', () => {
    const bounds = worldBounds(30);
    expect(bounds.min.y).toBeCloseTo(SPOT_MARKING_CONFIG.liftM, 9);
    expect(bounds.max.y).toBeCloseTo(SPOT_MARKING_CONFIG.liftM, 9);
    expect(SPOT_MARKING_CONFIG.liftM).toBeGreaterThan(0);
    expect(SPOT_MARKING_CONFIG.liftM).toBeLessThan(ftToM(0.1));

    const markings = createSpotMarkings(
      parkingSpotFromFt({ centerXFt: 0, centerZFt: 0, widthFt: 9, lengthFt: 18, headingDeg: 0 }),
    );
    const normals = markings.geometry.getAttribute('normal');
    for (let index = 0; index < normals.count; index += 1) {
      expect(normals.getY(index)).toBeCloseTo(1, 9);
    }
  });

  test('是空心外框：車位中心沒有標線，線寬內才有', () => {
    const markings = createSpotMarkings(
      parkingSpotFromFt({ centerXFt: 0, centerZFt: 0, widthFt: 9, lengthFt: 18, headingDeg: 0 }),
    );
    const positions = markings.geometry.getAttribute('position');
    const innerHalfWidthM = ftToM(4.5) - SPOT_MARKING_CONFIG.lineWidthM;
    const innerHalfLengthM = ftToM(9) - SPOT_MARKING_CONFIG.lineWidthM;
    // 頂點存成 float32，容差要比 float32 的誤差大。
    const tolerance = 1e-6;
    expect(positions.count).toBeGreaterThan(0);
    for (let index = 0; index < positions.count; index += 1) {
      const insideHole =
        Math.abs(positions.getX(index)) < innerHalfWidthM - tolerance &&
        Math.abs(positions.getZ(index)) < innerHalfLengthM - tolerance;
      expect(insideHole).toBe(false);
    }
  });
});

describe('固定鏡頭 createPresetCamera（?cam=）', () => {
  const spot = parkingSpotFromFt({
    centerXFt: 20,
    centerZFt: -60,
    widthFt: 9,
    lengthFt: 18,
    headingDeg: 0,
  });

  /** 鏡頭的視線方向（世界座標，單位長）。 */
  function viewDirection(camera: ReturnType<typeof createPresetCamera>): Vector3 {
    return camera.getWorldDirection(new Vector3());
  }

  test('follow：與跟隨鏡頭對準車時的位置、朝向相同，與車位無關', () => {
    const preset = createPresetCamera('follow', 10, -20, spot);
    const follow = createFollowCamera(10, -20).camera;
    expect(preset.position.distanceTo(follow.position)).toBeCloseTo(0, DIGITS);
    expect(preset.quaternion.angleTo(follow.quaternion)).toBeCloseTo(0, DIGITS);
  });

  test('top：在車位正上方垂直往下看，畫面上方是北（−Z），與車在哪裡無關', () => {
    const camera = createPresetCamera('top', 10, -20, spot);
    expect(camera.position.x).toBeCloseTo(spot.x, DIGITS);
    expect(camera.position.y).toBeCloseTo(FIXED_CAMERA_CONFIG.topHeightM, DIGITS);
    expect(camera.position.z).toBeCloseTo(spot.z, DIGITS);
    const direction = viewDirection(camera);
    expect(direction.x).toBeCloseTo(0, DIGITS);
    expect(direction.y).toBeCloseTo(-1, DIGITS);
    expect(direction.z).toBeCloseTo(0, DIGITS);
    // 鏡頭本地的 +Y 是畫面上方。
    const screenUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    expect(screenUp.x).toBeCloseTo(0, DIGITS);
    expect(screenUp.z).toBeCloseTo(-1, DIGITS);

    const elsewhere = createPresetCamera('top', -99, 99, spot);
    expect(elsewhere.position.distanceTo(camera.position)).toBeCloseTo(0, DIGITS);
  });

  test('spot_low：低於車頂、在車位外側，視線朝向車位中心', () => {
    const camera = createPresetCamera('spot_low', 10, -20, spot);
    expect(camera.position.y).toBeLessThan(VEHICLE_CONFIG_SI.heightM);
    expect(camera.position.y).toBeGreaterThan(0);
    expect(Math.abs(camera.position.x - spot.x)).toBeGreaterThan(spot.widthM / 2);

    const toSpot = new Vector3(
      spot.x,
      FIXED_CAMERA_CONFIG.spotLowLookAtHeightM,
      spot.z,
    ).sub(camera.position);
    expect(viewDirection(camera).angleTo(toSpot)).toBeCloseTo(0, DIGITS);
  });

  test('spot_low：鏡頭位置跟著車位的方向轉', () => {
    const turned = parkingSpotFromFt({
      centerXFt: 20,
      centerZFt: -60,
      widthFt: 9,
      lengthFt: 18,
      headingDeg: 90,
    });
    const camera = createPresetCamera('spot_low', 0, 0, turned);
    // heading 90°：前方是 +X、右方是 +Z。
    expect(camera.position.x - turned.x).toBeCloseTo(FIXED_CAMERA_CONFIG.spotLowAheadM, DIGITS);
    expect(camera.position.z - turned.z).toBeCloseTo(FIXED_CAMERA_CONFIG.spotLowLateralM, DIGITS);
  });
});

describe('展示登錄表 showcase（?show=）', () => {
  test('本階段登錄了 car_sedan 與 parking_spot', () => {
    expect(SHOWCASE_IDS).toContain('car_sedan');
    expect(SHOWCASE_IDS).toContain('parking_spot');
  });

  test.each(SHOWCASE_IDS)('%s：建得出物件，擺在原點附近而且有大小', (id) => {
    const object = createShowcaseObject(id);
    expect(object).toBeInstanceOf(Object3D);
    if (object === undefined) {
      return;
    }
    const box = new Box3().setFromObject(object);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    expect(Math.abs(center.x)).toBeLessThan(ftToM(1));
    expect(Math.abs(center.z)).toBeLessThan(ftToM(1));
    expect(Math.max(size.x, size.z)).toBeGreaterThan(ftToM(5));
  });

  test('每次建立的是新的物件', () => {
    expect(createShowcaseObject('car_sedan')).not.toBe(createShowcaseObject('car_sedan'));
  });

  test.each(['', 'nope', 'CAR_SEDAN', 'toString', 'constructor', '__proto__'])(
    '未知 id %j → undefined',
    (id) => {
      expect(createShowcaseObject(id)).toBeUndefined();
    },
  );
});
