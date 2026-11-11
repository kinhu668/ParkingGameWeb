// 算圖層裡可以不開瀏覽器就驗證的部分：鏡頭平滑、車輛模型的朝向約定、車位標線的範圍。
// 地面（柏油）的測試在 ground.test.ts。
import {
  Box3,
  Euler,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  ShaderLib,
  Vector3,
} from 'three';
import { describe, expect, test } from 'vitest';
import { forward } from '../src/core/heading';
import { degToRad, ftToM, mToFt } from '../src/core/units';
import { parkingSpotFromFt } from '../src/level/parkingJudge';
import { createSpotMarkings, patchPaintShader } from '../src/props/spotMarkings';
import { createFollowCamera, createPresetCamera, smoothingFactor } from '../src/render/followCamera';
import {
  CAMERA_CONFIG,
  CAR_VISUAL_CONFIG,
  FIXED_CAMERA_CONFIG,
  SPOT_MARKING_CONFIG,
} from '../src/render/renderConfig';
import { SHOWCASE_IDS, createShowcaseObject } from '../src/render/showcase';
import type { DriveInput } from '../src/vehicle/bicycleModel';
import { BODY_LAYOUT } from '../src/vehicle/carBody';
import {
  carLightsFor,
  createCarMesh,
  setCarLights,
  updateCarMesh,
  type CarMesh,
} from '../src/vehicle/carMesh';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';

const DIGITS = 9;

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

  test.each(['low', 'high'] as const)(
    '%s 細分：模型的外框等於 VehicleConfig 的長寬高（15 × 6 × 4.6 ft），底部貼地',
    (detail) => {
      const car = createCarMesh(detail);
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
      expect(mToFt(max.x - min.x)).toBeCloseTo(6, 5);
      expect(mToFt(max.z - min.z)).toBeCloseTo(15, 5);
      expect(mToFt(max.y)).toBeCloseTo(4.6, 5);
      expect(max.x - min.x).toBeCloseTo(VEHICLE_CONFIG_SI.widthM, 6);
      expect(max.z - min.z).toBeCloseTo(VEHICLE_CONFIG_SI.lengthM, 6);
      expect(max.y).toBeCloseTo(VEHICLE_CONFIG_SI.heightM, 6);
      expect(min.y).toBeCloseTo(0, 6);
      // 前後、左右對稱於原點：車頭在 −長/2、車尾在 +長/2。
      expect(min.z).toBeCloseTo(-VEHICLE_CONFIG_SI.lengthM / 2, 6);
      expect(min.x).toBeCloseTo(-VEHICLE_CONFIG_SI.widthM / 2, 6);
    },
  );

  test('後軸在車身中心後方半個軸距；四個輪子的最外緣不超出鈑金', () => {
    const car = createCarMesh();
    car.root.updateMatrixWorld(true);
    const pivots = car.wheelSpinners.map((spinner) => spinner.parent);
    expect(pivots.length).toBe(4);
    const zs = pivots.map((pivot) => pivot?.position.z ?? NaN).sort((a, b) => a - b);
    expect(zs[0]).toBeCloseTo(-VEHICLE_CONFIG_SI.wheelbaseM / 2, DIGITS);
    expect(zs[3]).toBeCloseTo(VEHICLE_CONFIG_SI.wheelbaseM / 2, DIGITS);
    for (const spinner of car.wheelSpinners) {
      const bounds = new Box3().setFromObject(spinner);
      expect(bounds.max.x).toBeLessThan(BODY_LAYOUT.halfWidthM);
      expect(bounds.min.x).toBeGreaterThan(-BODY_LAYOUT.halfWidthM);
    }
  });

  test('不是方塊車：車殼是一張細分的曲面，烤漆有清漆層，玻璃半透明、不寫深度', () => {
    const low = createCarMesh('low');
    const high = createCarMesh('high');
    const vertexCount = (car: CarMesh): number => car.body.geometry.getAttribute('position').count;
    // 一個 BoxGeometry 只有 24 個頂點。
    expect(vertexCount(low)).toBeGreaterThan(500);
    expect(vertexCount(high)).toBeGreaterThan(vertexCount(low));

    const paint = high.body.material;
    expect(paint).toBeInstanceOf(MeshPhysicalMaterial);
    expect((paint as MeshPhysicalMaterial).clearcoat).toBeGreaterThan(0.5);
    const glass = high.glass.material as MeshStandardMaterial;
    expect(glass.transparent).toBe(true);
    expect(glass.opacity).toBeLessThan(0.8);
    expect(glass.depthWrite).toBe(false);
    expect(high.glass.castShadow).toBe(false);
  });

  test('沒有過於光滑的材質：太陽的高光不會超出半浮點緩衝區（否則走後製鏈時整個畫面變黑）', () => {
    const car = createCarMesh();
    let checked = 0;
    car.root.traverse((object) => {
      if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) {
        return;
      }
      checked += 1;
      expect(object.material.roughness).toBeGreaterThanOrEqual(CAR_VISUAL_CONFIG.minGlossRoughness);
      if (object.material instanceof MeshPhysicalMaterial) {
        expect(object.material.clearcoatRoughness).toBeGreaterThanOrEqual(
          CAR_VISUAL_CONFIG.minGlossRoughness,
        );
      }
    });
    expect(checked).toBeGreaterThan(20);
    expect(CAR_VISUAL_CONFIG.minGlossRoughness).toBeGreaterThanOrEqual(0.1);
  });

  test('車殼的法線朝外：車頂朝上、車頭朝前、車尾朝後、右側朝右', () => {
    const { body } = createCarMesh();
    const positions = body.geometry.getAttribute('position');
    const normals = body.geometry.getAttribute('normal');
    const index = body.geometry.getIndex();
    const used = new Set<number>(index === null ? [] : Array.from(index.array));
    /** 烤漆分區用到的頂點裡，某個座標最大（或最小）的那一個的法線。 */
    const normalAtExtreme = (pick: (v: Vector3) => number): Vector3 => {
      let best = -Infinity;
      const normal = new Vector3();
      const vertex = new Vector3();
      for (const vertexIndex of used) {
        const score = pick(vertex.fromBufferAttribute(positions, vertexIndex));
        if (score > best) {
          best = score;
          normal.fromBufferAttribute(normals, vertexIndex);
        }
      }
      return normal;
    };
    expect(normalAtExtreme((v) => v.y).y).toBeGreaterThan(0.9);
    expect(normalAtExtreme((v) => v.x).x).toBeGreaterThan(0.9);
    // 車頭、車尾的端點是收成一點的那一圈，取離端點一小段距離內最靠外側的點。
    expect(normalAtExtreme((v) => (v.z < -2 && Math.abs(v.x) < 0.3 ? -v.z : -Infinity)).z).toBeLessThan(-0.5);
    expect(normalAtExtreme((v) => (v.z > 2 && Math.abs(v.x) < 0.3 ? v.z : -Infinity)).z).toBeGreaterThan(0.5);
  });

  test('輪子隨行駛距離滾動：前進時頂端往前，倒車反向；第一次擺放與原地轉向不滾', () => {
    const car = createCarMesh();
    const spins = (): number[] => car.wheelSpinners.map((spinner) => spinner.rotation.x);
    updateCarMesh(car, { x: 5, z: 5, headingRad: 0, steerRad: 0 });
    expect(spins()).toEqual([0, 0, 0, 0]);
    updateCarMesh(car, { x: 5, z: 5, headingRad: 0, steerRad: degToRad(20) });
    expect(spins()).toEqual([0, 0, 0, 0]);

    // 朝北（−Z）前進 0.1 m：繞 +X 軸負轉 0.1 / 輪胎半徑。
    updateCarMesh(car, { x: 5, z: 4.9, headingRad: 0, steerRad: 0 });
    const rolledRad = -0.1 / CAR_VISUAL_CONFIG.wheelRadiusM;
    for (const spin of spins()) {
      expect(spin).toBeCloseTo(rolledRad, DIGITS);
    }
    // 輪胎頂端（本地 +Y）往車頭（−Z）移動。
    const top = new Vector3(0, 1, 0).applyEuler(car.wheelSpinners[0]?.rotation ?? new Euler());
    expect(top.z).toBeLessThan(0);

    // 倒回原位：轉回 0。朝東的車往東走也是前進。
    updateCarMesh(car, { x: 5, z: 5, headingRad: 0, steerRad: 0 });
    for (const spin of spins()) {
      expect(spin).toBeCloseTo(0, DIGITS);
    }
    updateCarMesh(car, { x: 5.1, z: 5, headingRad: degToRad(90), steerRad: 0 });
    for (const spin of spins()) {
      expect(spin).toBeCloseTo(rolledRad, DIGITS);
    }
  });

  test('方向盤跟著轉向角轉：向右打是順時針（繞朝向駕駛的軸負轉）', () => {
    const car = createCarMesh();
    updateCarMesh(car, { x: 0, z: 0, headingRad: 0, steerRad: degToRad(10) });
    expect(car.steeringWheel.rotation.z).toBeCloseTo(
      -degToRad(10) * CAR_VISUAL_CONFIG.steeringRatio,
      DIGITS,
    );
    updateCarMesh(car, { x: 0, z: 0, headingRad: 0, steerRad: 0 });
    expect(car.steeringWheel.rotation.z).toBeCloseTo(0, DIGITS);
  });
});

describe('燈號 carLightsFor / setCarLights', () => {
  const drive = (throttle: -1 | 0 | 1, handbrake = false): DriveInput => ({
    throttle,
    steer: 0,
    handbrake,
  });

  test('煞車燈：手煞車，或油門與行進方向相反；滑行與加速不亮', () => {
    expect(carLightsFor(drive(0, true), 3).braking).toBe(true);
    expect(carLightsFor(drive(-1), 3).braking).toBe(true);
    expect(carLightsFor(drive(1), -2).braking).toBe(true);
    expect(carLightsFor(drive(0), 3).braking).toBe(false);
    expect(carLightsFor(drive(1), 3).braking).toBe(false);
    expect(carLightsFor(drive(-1), -2).braking).toBe(false);
    expect(carLightsFor(drive(0), 0).braking).toBe(false);
  });

  test('倒車燈：正在倒退，或靜止時按著倒車；前進中按倒車只是煞車', () => {
    expect(carLightsFor(drive(-1), -2).reversing).toBe(true);
    expect(carLightsFor(drive(0), -1).reversing).toBe(true);
    expect(carLightsFor(drive(-1), 0).reversing).toBe(true);
    expect(carLightsFor(drive(-1), 3).reversing).toBe(false);
    expect(carLightsFor(drive(1), 0).reversing).toBe(false);
    expect(carLightsFor(drive(0), 0).reversing).toBe(false);
  });

  test('頭燈常亮；尾燈平常微亮、煞車時加亮；倒車燈平常不亮', () => {
    const car = createCarMesh();
    const emissiveIntensities = new Map<number, number>();
    car.root.traverse((object) => {
      if (object instanceof Mesh && object.material instanceof MeshStandardMaterial) {
        emissiveIntensities.set(object.material.emissive.getHex(), object.material.emissiveIntensity);
      }
    });
    expect(emissiveIntensities.get(CAR_VISUAL_CONFIG.headlightColor)).toBeGreaterThan(1);

    expect(car.taillightMaterial.emissive.getHex()).toBe(CAR_VISUAL_CONFIG.taillightColor);
    expect(car.taillightMaterial.emissiveIntensity).toBe(CAR_VISUAL_CONFIG.taillightEmissiveIntensity);
    expect(car.reverseLightMaterial.emissiveIntensity).toBe(0);

    setCarLights(car, { braking: true, reversing: true });
    expect(car.taillightMaterial.emissiveIntensity).toBeGreaterThan(
      2 * CAR_VISUAL_CONFIG.taillightEmissiveIntensity,
    );
    expect(car.reverseLightMaterial.emissiveIntensity).toBeGreaterThan(1);

    setCarLights(car, { braking: false, reversing: false });
    expect(car.taillightMaterial.emissiveIntensity).toBe(CAR_VISUAL_CONFIG.taillightEmissiveIntensity);
    expect(car.reverseLightMaterial.emissiveIntensity).toBe(0);
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

describe('磨損的漆面 spotMarkings 材質', () => {
  const markings = createSpotMarkings(
    parkingSpotFromFt({ centerXFt: 0, centerZFt: 0, widthFt: 9, lengthFt: 18, headingDeg: 0 }),
  );

  test('半透明（剝落處透出柏油）、不寫深度、只收陰影', () => {
    const material = markings.material;
    expect(material).toBeInstanceOf(MeshStandardMaterial);
    if (!(material instanceof MeshStandardMaterial)) {
      return;
    }
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(markings.receiveShadow).toBe(true);
    expect(markings.castShadow).toBe(false);
  });

  test('磨損的片段插得進這一版 three 的 MeshStandardMaterial', () => {
    const source = {
      vertexShader: ShaderLib.standard.vertexShader,
      fragmentShader: ShaderLib.standard.fragmentShader,
    };
    patchPaintShader(source);
    expect(source.vertexShader).toContain('vPaintXZ = transformed.xz;');
    expect(source.fragmentShader).toContain('diffuseColor.a *= paintCoverage;');
    expect(source.fragmentShader).not.toContain('#include <map_fragment>');
    expect(() =>
      patchPaintShader({ vertexShader: 'void main() {}', fragmentShader: 'void main() {}' }),
    ).toThrow();
  });

  test('磨損有限度：線仍然清楚到能停車對位', () => {
    const config = SPOT_MARKING_CONFIG;
    // 剝落噪聲的平均是 0.5：磨損量低於它，就有過半的漆留著。
    expect(config.baseWear).toBeGreaterThan(0);
    expect(config.baseWear).toBeLessThan(0.35);
    // 線的正中央、沒被輪胎壓過的地方，即使在整段磨損最重處也還有漆。
    expect(config.baseWear + config.patchWear).toBeLessThan(0.6);
    expect(config.opacity).toBeGreaterThan(0.8);
    expect(config.fadeMin).toBeGreaterThan(0.5);
    // 輪胎磨痕在車位寬度以內。
    expect(config.tireTrackOffsetM + config.tireTrackHalfWidthM).toBeLessThan(ftToM(4.5));
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
