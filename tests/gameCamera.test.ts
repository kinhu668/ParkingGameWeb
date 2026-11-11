// 一般遊戲的鏡頭（V 鍵切換的五個模式）裡不開瀏覽器就能驗證的部分：
// 跟車鏡頭在車後方、轉彎落後、倒車不翻面；引擎蓋與駕駛座的視點位置；俯視的朝向；換模式後的鏡片與 up。
import {
  Box3,
  Mesh,
  MeshStandardMaterial,
  Raycaster,
  Vector3,
  type Intersection,
  type PerspectiveCamera,
} from 'three';
import { describe, expect, test } from 'vitest';
import { GAME_CAMERA_VIEWS, type GameCameraView } from '../src/core/cameraView';
import { FIXED_STEP_SECONDS } from '../src/core/gameConfig';
import { forward, headingDelta, right } from '../src/core/heading';
import { degToRad, ftToM, mToFt, mphToMps, radToDeg } from '../src/core/units';
import { createGameCamera, nextChaseHeading } from '../src/render/gameCamera';
import { CAR_VISUAL_CONFIG, GAME_CAMERA_CONFIG } from '../src/render/renderConfig';
import {
  stepVehicle,
  type DriveInput,
  type VehiclePose,
  type VehicleState,
} from '../src/vehicle/bicycleModel';
import { BODY_LAYOUT } from '../src/vehicle/carBody';
import {
  createCarMesh,
  setCarInteriorView,
  updateCarMesh,
  type CarMesh,
} from '../src/vehicle/carMesh';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';

const DIGITS = 9;
const FRAME_SECONDS = 1 / 60;
/** 明顯在前進（遠高於「幾乎靜止」的門檻）。 */
const CRUISE_MPS = mphToMps(12);
const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;
/** 下車身頂面（引擎蓋）的高度。 */
const HOOD_TOP_M = CAR_VISUAL_CONFIG.groundClearanceM + CAR_VISUAL_CONFIG.lowerBodyHeightM;
const CHASE_VIEWS = ['chase_near', 'chase_far'] as const;
const CHASE_RIGS = {
  chase_near: GAME_CAMERA_CONFIG.chaseNear,
  chase_far: GAME_CAMERA_CONFIG.chaseFar,
} as const;

function poseAt(xFt: number, zFt: number, headingDeg: number): VehiclePose {
  return { x: ftToM(xFt), z: ftToM(zFt), headingRad: degToRad(headingDeg), steerRad: 0 };
}

/** 鏡頭相對車身中心的位置，拆成「車頭方向」與「車身右側方向」兩個分量（公尺）。 */
function offsetFromCar(
  camera: PerspectiveCamera,
  pose: VehiclePose,
): { readonly aheadM: number; readonly rightM: number } {
  const dx = camera.position.x - pose.x;
  const dz = camera.position.z - pose.z;
  const ahead = forward(pose.headingRad);
  const side = right(pose.headingRad);
  return { aheadM: dx * ahead.x + dz * ahead.z, rightM: dx * side.x + dz * side.z };
}

/** 車上所有的網格（世界矩陣已更新）。 */
function allMeshes(car: CarMesh): Mesh[] {
  const meshes: Mesh[] = [];
  car.root.updateMatrixWorld(true);
  car.root.traverse((object) => {
    if (object instanceof Mesh) {
      meshes.push(object);
    }
  });
  return meshes;
}

/** 目前看得到的網格。 */
function visibleMeshes(car: CarMesh): Mesh[] {
  return allMeshes(car).filter((mesh) => mesh.visible);
}

/**
 * 從 origin 沿 direction 看出去第一個打到的面；什麼都沒打到是 undefined。
 * Raycaster 與算圖一樣只算正面，所以從車裡看不到的車殼背面不算。
 */
function firstHit(meshes: Mesh[], origin: Vector3, direction: Vector3): Intersection | undefined {
  return new Raycaster(origin, direction.clone().normalize()).intersectObjects(meshes, false)[0];
}

function viewDirection(camera: PerspectiveCamera): Vector3 {
  return camera.getWorldDirection(new Vector3());
}

/**
 * 兩個鏡頭的位置與朝向相同。朝向逐分量比較：Quaternion.angleTo 對沒有剛好正規化的
 * 四元數會回傳 1e-8 等級的雜訊，連同一個四元數自己比自己都可能不是 0。
 */
function expectSamePlacement(actual: PerspectiveCamera, expected: PerspectiveCamera): void {
  expect(actual.position.distanceTo(expected.position)).toBeCloseTo(0, DIGITS);
  const actualAxes = actual.quaternion.toArray();
  expected.quaternion.toArray().forEach((component, index) => {
    expect(actualAxes[index]).toBeCloseTo(component, DIGITS);
  });
}

/** 畫面右方（鏡頭本地 +X）在世界座標的方向；沒有歪斜（roll）時是水平的。 */
function screenRight(camera: PerspectiveCamera): Vector3 {
  return new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
}

/** 車身本地座標（右、上、前，公尺）的點投影到畫面：NDC 的 x、y 在 [−1, 1] 內才看得到，y < 0 是下半部。 */
function projectCarPoint(
  camera: PerspectiveCamera,
  pose: VehiclePose,
  local: { readonly rightM: number; readonly upM: number; readonly aheadM: number },
): Vector3 {
  const ahead = forward(pose.headingRad);
  const side = right(pose.headingRad);
  camera.aspect = 16 / 9;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return new Vector3(
    pose.x + side.x * local.rightM + ahead.x * local.aheadM,
    local.upM,
    pose.z + side.z * local.rightM + ahead.z * local.aheadM,
  ).project(camera);
}

describe('跟車鏡頭 chase_near / chase_far', () => {
  test.each(CHASE_VIEWS)('%s：車朝北時鏡頭在車的南方（+Z）正後方，看向車', (view) => {
    const pose = poseAt(10, -20, 0);
    const { camera } = createGameCamera(view, pose);
    expect(camera.position.z).toBeGreaterThan(pose.z + HALF_LENGTH_M);
    expect(camera.position.x).toBeCloseTo(pose.x, DIGITS);
    expect(camera.position.y).toBeCloseTo(CHASE_RIGS[view].heightM, DIGITS);
    // 視線朝北（朝車）、略往下。
    const direction = viewDirection(camera);
    expect(direction.z).toBeLessThan(-0.5);
    expect(direction.x).toBeCloseTo(0, DIGITS);
    expect(direction.y).toBeLessThan(0);
  });

  test.each(CHASE_VIEWS)('%s：車朝東時鏡頭在車的西方（−X）', (view) => {
    const pose = poseAt(10, -20, 90);
    const { camera } = createGameCamera(view, pose);
    expect(camera.position.x).toBeLessThan(pose.x - HALF_LENGTH_M);
    expect(camera.position.z).toBeCloseTo(pose.z, DIGITS);
    expect(viewDirection(camera).x).toBeGreaterThan(0.5);
  });

  test.each([0, 45, 90, 180, 270, 315])(
    '朝向 %d°：鏡頭在車尾正後方「車尾 + 設定距離」處，不是固定的世界偏移',
    (headingDeg) => {
      const pose = poseAt(-30, 40, headingDeg);
      for (const view of CHASE_VIEWS) {
        const offset = offsetFromCar(createGameCamera(view, pose).camera, pose);
        expect(offset.aheadM).toBeCloseTo(-(HALF_LENGTH_M + CHASE_RIGS[view].behindRearM), DIGITS);
        expect(offset.rightM).toBeCloseTo(0, DIGITS);
      }
    },
  );

  test('近距離：離車尾 10–14 ft、高 3.5–5.5 ft、視角 55–60°', () => {
    const rig = GAME_CAMERA_CONFIG.chaseNear;
    expect(mToFt(rig.behindRearM)).toBeGreaterThanOrEqual(10);
    expect(mToFt(rig.behindRearM)).toBeLessThanOrEqual(14);
    expect(mToFt(rig.heightM)).toBeGreaterThanOrEqual(3.5);
    expect(mToFt(rig.heightM)).toBeLessThanOrEqual(5.5);
    expect(rig.fovDeg).toBeGreaterThanOrEqual(55);
    expect(rig.fovDeg).toBeLessThanOrEqual(60);
  });

  test('遠距離：離車尾 28–40 ft、高 16–26 ft、視角 40–50°，比近距離更遠更高、俯角更大', () => {
    const near = GAME_CAMERA_CONFIG.chaseNear;
    const far = GAME_CAMERA_CONFIG.chaseFar;
    expect(mToFt(far.behindRearM)).toBeGreaterThanOrEqual(28);
    expect(mToFt(far.behindRearM)).toBeLessThanOrEqual(40);
    expect(mToFt(far.heightM)).toBeGreaterThanOrEqual(16);
    expect(mToFt(far.heightM)).toBeLessThanOrEqual(26);
    expect(far.fovDeg).toBeGreaterThanOrEqual(40);
    expect(far.fovDeg).toBeLessThanOrEqual(50);

    const pose = poseAt(0, 0, 0);
    const nearDirection = viewDirection(createGameCamera('chase_near', pose).camera);
    const farDirection = viewDirection(createGameCamera('chase_far', pose).camera);
    expect(far.behindRearM).toBeGreaterThan(near.behindRearM);
    expect(far.heightM).toBeGreaterThan(near.heightM);
    expect(farDirection.y).toBeLessThan(nearDirection.y);
  });

  test('前進轉彎：鏡頭先落後，幾個時間常數後繞到新的車尾後方', () => {
    const start = poseAt(0, 0, 0);
    const turned = poseAt(0, 0, 90);
    const game = createGameCamera('chase_near', start);

    game.update(turned, CRUISE_MPS, FRAME_SECONDS);
    // 一幀之後幾乎還在原地（南方），相對新的車頭方向是在車的右側。
    expect(game.camera.position.z).toBeGreaterThan(turned.z + HALF_LENGTH_M);
    expect(Math.abs(game.camera.position.x - turned.x)).toBeLessThan(ftToM(3));

    for (let frame = 0; frame < 5 * 60; frame += 1) {
      game.update(turned, CRUISE_MPS, FRAME_SECONDS);
    }
    const settled = offsetFromCar(game.camera, turned);
    expect(settled.aheadM).toBeCloseTo(
      -(HALF_LENGTH_M + GAME_CAMERA_CONFIG.chaseNear.behindRearM),
      3,
    );
    expect(settled.rightM).toBeCloseTo(0, 3);
    expect(game.camera.position.x).toBeLessThan(turned.x);
  });

  test('幾乎靜止：車頭方向變了鏡頭也不繞（保持上一次的前方朝向）', () => {
    const start = poseAt(0, 0, 0);
    const game = createGameCamera('chase_near', start);
    const before = game.camera.position.clone();
    for (const speedMps of [0, mphToMps(0.5), mphToMps(-0.5)]) {
      for (let frame = 0; frame < 120; frame += 1) {
        game.update(poseAt(0, 0, 170), speedMps, FRAME_SECONDS);
      }
      expect(game.camera.position.distanceTo(before)).toBeCloseTo(0, DIGITS);
    }
  });

  test('60 fps 與 240 fps 跟同一個目標 1 秒，鏡頭位置相同（平滑與幀率無關）', () => {
    const settle = (framesPerSecond: number): Vector3 => {
      const game = createGameCamera('chase_far', poseAt(0, 0, 0));
      for (let frame = 0; frame < framesPerSecond; frame += 1) {
        game.update(poseAt(30, -40, 0), CRUISE_MPS, 1 / framesPerSecond);
      }
      return game.camera.position;
    };
    const slow = settle(60);
    const fast = settle(240);
    expect(fast.x).toBeCloseTo(slow.x, DIGITS);
    expect(fast.z).toBeCloseTo(slow.z, DIGITS);
    // 已經很接近目標，但還沒完全到（有在平滑，不是直接跳過去）。
    expect(slow.x).toBeGreaterThan(ftToM(29));
    expect(slow.x).toBeLessThan(ftToM(30));
  });

  test('snapTo（重來）：不管之前開到哪、朝哪，鏡頭直接回到車尾正後方', () => {
    const game = createGameCamera('chase_near', poseAt(0, 0, 0));
    for (let frame = 0; frame < 120; frame += 1) {
      game.update(poseAt(80, -50, 135), CRUISE_MPS, FRAME_SECONDS);
    }
    const restart = poseAt(0, 0, 0);
    game.snapTo(restart);
    expectSamePlacement(game.camera, createGameCamera('chase_near', restart).camera);
  });
});

describe('倒車時跟車鏡頭不翻面', () => {
  const REVERSE: DriveInput = { throttle: -1, steer: 0, handbrake: false };
  const START: VehicleState = { x: 0, z: 0, headingRad: 0, speedMps: 0, steerRad: 0 };

  /** 從靜止開始用真正的物理倒車，每一步更新鏡頭並回報「鏡頭在車頭方向上的偏移」。 */
  function reverseFor(seconds: number, input: DriveInput): { readonly aheadM: number[]; readonly vehicle: VehicleState } {
    const game = createGameCamera('chase_near', START);
    let vehicle = START;
    const aheadM: number[] = [];
    for (let step = 0; step < Math.round(seconds / FIXED_STEP_SECONDS); step += 1) {
      vehicle = stepVehicle(vehicle, input, FIXED_STEP_SECONDS);
      game.update(vehicle, vehicle.speedMps, FIXED_STEP_SECONDS);
      aheadM.push(offsetFromCar(game.camera, vehicle).aheadM);
    }
    return { aheadM, vehicle };
  }

  test('直線倒車一小段：鏡頭每一幀都還在車尾後方，沒有跑到車頭正前方', () => {
    const { aheadM, vehicle } = reverseFor(1.5, REVERSE);
    // 車真的往南（+Z）倒了一段。
    expect(vehicle.speedMps).toBeLessThan(0);
    expect(vehicle.z).toBeGreaterThan(ftToM(3));
    for (const ahead of aheadM) {
      expect(ahead).toBeLessThan(-HALF_LENGTH_M);
    }
  });

  test('邊倒車邊打方向盤：鏡頭仍在車尾那一側', () => {
    const { aheadM, vehicle } = reverseFor(1.5, { ...REVERSE, steer: 1 });
    // 車頭方向確實變了不少。
    expect(Math.abs(radToDeg(headingDelta(0, vehicle.headingRad)))).toBeGreaterThan(20);
    for (const ahead of aheadM) {
      expect(ahead).toBeLessThan(-HALF_LENGTH_M);
    }
  });

  test('nextChaseHeading：前進追車頭；倒車極慢；幾乎靜止不動', () => {
    const target = degToRad(90);
    const forwardStep = nextChaseHeading(0, target, CRUISE_MPS, FRAME_SECONDS);
    const reverseStep = nextChaseHeading(0, target, -CRUISE_MPS, FRAME_SECONDS);
    expect(forwardStep).toBeGreaterThan(0);
    expect(reverseStep).toBeGreaterThan(0);
    expect(reverseStep).toBeLessThan(forwardStep / 4);
    expect(nextChaseHeading(0, target, 0, FRAME_SECONDS)).toBe(0);
    expect(nextChaseHeading(0, target, mphToMps(0.9), FRAME_SECONDS)).toBe(0);
    expect(nextChaseHeading(0, target, mphToMps(-0.9), FRAME_SECONDS)).toBe(0);
  });

  test('nextChaseHeading：一幀最多轉一小角度，車頭突然反向也不會立刻翻 180°', () => {
    for (const speedMps of [CRUISE_MPS, -CRUISE_MPS, 0]) {
      const next = nextChaseHeading(0, degToRad(180), speedMps, FRAME_SECONDS);
      expect(Math.abs(radToDeg(headingDelta(0, next)))).toBeLessThan(10);
    }
  });

  test('nextChaseHeading：跨過 0°／360° 走最短弧', () => {
    let heading = degToRad(350);
    for (let frame = 0; frame < 5 * 60; frame += 1) {
      const next = nextChaseHeading(heading, degToRad(10), CRUISE_MPS, FRAME_SECONDS);
      // 每一幀都是順時針的小步（350° → 0° → 10°），不會逆時針繞 340°。
      const stepDeg = radToDeg(headingDelta(heading, next));
      expect(stepDeg).toBeGreaterThanOrEqual(0);
      expect(stepDeg).toBeLessThan(2);
      heading = next;
    }
    expect(radToDeg(headingDelta(heading, degToRad(10)))).toBeCloseTo(0, 3);
  });
});

describe('引擎蓋鏡頭 hood', () => {
  const mount = GAME_CAMERA_CONFIG.hood;

  test('視點在引擎蓋上方、前擋下緣之前、車頭之後的中線上', () => {
    const pose = poseAt(12, -8, 0);
    const { camera } = createGameCamera('hood', pose);
    const offset = offsetFromCar(camera, pose);
    const windshieldBaseAheadM = HALF_LENGTH_M - CAR_VISUAL_CONFIG.hoodLengthM;
    expect(offset.rightM).toBeCloseTo(0, DIGITS);
    expect(offset.aheadM).toBeGreaterThan(windshieldBaseAheadM);
    expect(offset.aheadM).toBeLessThan(HALF_LENGTH_M);
    expect(camera.position.y).toBeGreaterThan(HOOD_TOP_M + ftToM(0.3));
    expect(camera.position.y).toBeLessThan(HOOD_TOP_M + ftToM(1.5));
  });

  test('沿車頭向前、略俯；車轉向時跟著轉', () => {
    for (const headingDeg of [0, 90, 215]) {
      const pose = poseAt(0, 0, headingDeg);
      const direction = viewDirection(createGameCamera('hood', pose).camera);
      const ahead = forward(pose.headingRad);
      expect(direction.x * ahead.x + direction.z * ahead.z).toBeGreaterThan(0.95);
      expect(direction.y).toBeCloseTo(-Math.sin(mount.pitchDownRad), DIGITS);
      expect(direction.y).toBeLessThan(0);
    }
  });

  test('畫面下半部看得到車頭前緣；視角 60–70°、近平面遠小於 2 ft', () => {
    const pose = poseAt(0, 0, 30);
    const { camera } = createGameCamera('hood', pose);
    const nose = projectCarPoint(camera, pose, { rightM: 0, upM: HOOD_TOP_M, aheadM: HALF_LENGTH_M });
    expect(nose.y).toBeLessThan(-0.1);
    expect(nose.y).toBeGreaterThan(-0.9);
    expect(Math.abs(nose.x)).toBeLessThan(0.01);
    expect(camera.fov).toBeGreaterThanOrEqual(60);
    expect(camera.fov).toBeLessThanOrEqual(70);
    expect(mToFt(camera.near)).toBeLessThanOrEqual(0.5);
  });

  test('沒有埋進車殼：往上、沿視線都打不到車身，正下方就是烤漆的引擎蓋', () => {
    const pose = poseAt(5, 5, 0);
    const car = createCarMesh();
    updateCarMesh(car, pose);
    const { camera } = createGameCamera('hood', pose);
    const meshes = visibleMeshes(car);
    expect(firstHit(meshes, camera.position, new Vector3(0, 1, 0))).toBeUndefined();
    expect(firstHit(meshes, camera.position, viewDirection(camera))).toBeUndefined();
    const below = firstHit(meshes, camera.position, new Vector3(0, -1, 0));
    expect(below?.object).toBe(car.body);
    expect(below?.distance).toBeGreaterThan(camera.near);
    expect(below?.distance).toBeLessThan(ftToM(1.5));
  });
});

describe('駕駛座鏡頭 cockpit', () => {
  test('視點在左側座位、眼睛高度 3.7–4.1 ft（低於車頂、高於下車身），在前擋後方', () => {
    const pose = poseAt(12, -8, 0);
    const { camera } = createGameCamera('cockpit', pose);
    const offset = offsetFromCar(camera, pose);
    expect(offset.rightM).toBeLessThan(ftToM(-0.8));
    expect(offset.rightM).toBeGreaterThan(-VEHICLE_CONFIG_SI.widthM / 2);
    expect(mToFt(camera.position.y)).toBeGreaterThanOrEqual(3.7);
    expect(mToFt(camera.position.y)).toBeLessThanOrEqual(4.1);
    expect(camera.position.y).toBeLessThan(VEHICLE_CONFIG_SI.heightM);
    expect(camera.position.y).toBeGreaterThan(HOOD_TOP_M);

    // 整片前擋（連最靠後的上緣）都在眼睛前方 1 ft 以上；眼睛在車頂（頂篷）的範圍內。
    expect(offset.aheadM).toBeLessThan(-BODY_LAYOUT.windshieldTopZM - ftToM(1));
    expect(offset.aheadM).toBeGreaterThan(-BODY_LAYOUT.rearWindowTopZM);
  });

  test('沿車頭向前（略俯），車轉向時跟著轉、仍在車的左側', () => {
    for (const headingDeg of [0, 90, 215]) {
      const pose = poseAt(3, 4, headingDeg);
      const { camera } = createGameCamera('cockpit', pose);
      const direction = viewDirection(camera);
      const ahead = forward(pose.headingRad);
      expect(direction.x * ahead.x + direction.z * ahead.z).toBeGreaterThan(0.95);
      expect(direction.y).toBeLessThanOrEqual(0);
      expect(offsetFromCar(camera, pose).rightM).toBeCloseTo(GAME_CAMERA_CONFIG.cockpit.lateralM, DIGITS);
    }
  });

  test('畫面下半部看得到車頭前緣與儀表板；視角 70–75°、近平面遠小於 2 ft', () => {
    const pose = poseAt(0, 0, 300);
    const { camera } = createGameCamera('cockpit', pose);
    const eye = offsetFromCar(camera, pose);
    const nose = projectCarPoint(camera, pose, {
      rightM: eye.rightM,
      upM: HOOD_TOP_M,
      aheadM: HALF_LENGTH_M,
    });
    const dashboardFrontAheadM =
      HALF_LENGTH_M - CAR_VISUAL_CONFIG.hoodLengthM - CAR_VISUAL_CONFIG.dashboardInsetM;
    const dashboard = projectCarPoint(camera, pose, {
      rightM: eye.rightM,
      upM: HOOD_TOP_M + CAR_VISUAL_CONFIG.dashboardHeightM,
      aheadM: dashboardFrontAheadM - CAR_VISUAL_CONFIG.dashboardLengthM / 2,
    });
    // 由上到下：地平線 → 車頭前緣 → 儀表板，都在畫面內。
    expect(nose.y).toBeLessThan(0);
    expect(dashboard.y).toBeLessThan(nose.y);
    expect(dashboard.y).toBeGreaterThan(-1);
    expect(camera.fov).toBeGreaterThanOrEqual(70);
    expect(camera.fov).toBeLessThanOrEqual(75);
    expect(mToFt(camera.near)).toBeLessThanOrEqual(0.5);
  });
});

describe('駕駛座視角的車身 setCarInteriorView', () => {
  const pose = poseAt(0, 0, 0);

  /** 車朝北時，從正前方往右 azimuthDeg、往上 elevationDeg 的方向。 */
  function lookDirection(azimuthDeg: number, elevationDeg: number): Vector3 {
    const azimuthRad = degToRad(azimuthDeg);
    const elevationRad = degToRad(elevationDeg);
    return new Vector3(
      Math.sin(azimuthRad) * Math.cos(elevationRad),
      Math.sin(elevationRad),
      -Math.cos(azimuthRad) * Math.cos(elevationRad),
    );
  }

  function cockpitCar(): { car: CarMesh; eye: Vector3; camera: PerspectiveCamera } {
    const car = createCarMesh();
    updateCarMesh(car, pose);
    const { camera } = createGameCamera('cockpit', pose);
    return { car, eye: camera.position, camera };
  }

  test('開啟時只藏玻璃，車殼、頂篷、內裝都留著；關閉後全部恢復', () => {
    const { car } = cockpitCar();
    const meshes = allMeshes(car);
    expect(meshes.every((mesh) => mesh.visible)).toBe(true);

    setCarInteriorView(car, true);
    expect(meshes.filter((mesh) => !mesh.visible)).toEqual([car.glass]);
    expect(car.body.visible).toBe(true);
    expect(car.headliner.visible).toBe(true);

    setCarInteriorView(car, false);
    expect(meshes.every((mesh) => mesh.visible)).toBe(true);
  });

  test('外觀模式隔著半透明的前擋；駕駛座視角沿視線與正前方都看得出去', () => {
    const { car, eye, camera } = cockpitCar();
    const ahead = firstHit(visibleMeshes(car), eye, viewDirection(camera));
    expect(ahead?.object).toBe(car.glass);

    setCarInteriorView(car, true);
    const meshes = visibleMeshes(car);
    expect(firstHit(meshes, eye, viewDirection(camera))).toBeUndefined();
    // 正前方左右各 15°、水平到往上 10° 都沒有東西擋。
    for (const azimuthDeg of [-15, -8, 0, 8, 15]) {
      for (const elevationDeg of [0, 5, 10]) {
        expect(firstHit(meshes, eye, lookDirection(azimuthDeg, elevationDeg))).toBeUndefined();
      }
    }
  });

  test('視點四周沒有貼臉的網格：各個方向最近的東西都比近平面遠', () => {
    const { car, eye, camera } = cockpitCar();
    setCarInteriorView(car, true);
    const meshes = visibleMeshes(car);
    for (let azimuthDeg = -180; azimuthDeg < 180; azimuthDeg += 30) {
      for (const elevationDeg of [-60, -30, 0, 30, 60]) {
        const hit = firstHit(meshes, eye, lookDirection(azimuthDeg, elevationDeg));
        if (hit !== undefined) {
          expect(hit.distance).toBeGreaterThan(2 * camera.near);
        }
      }
    }
  });

  test('頂篷不壓住畫面：正前方往上 22° 以內都是擋風玻璃外的天空，頂篷前緣在畫面最上面的一小條', () => {
    const { car, eye, camera } = cockpitCar();
    setCarInteriorView(car, true);
    const meshes = visibleMeshes(car);
    for (const azimuthDeg of [-10, 0, 10, 20]) {
      for (const elevationDeg of [14, 18, 22]) {
        expect(firstHit(meshes, eye, lookDirection(azimuthDeg, elevationDeg))).toBeUndefined();
      }
    }
    // 畫面上緣的仰角 = 半個視角 − 俯角；頂篷前緣要在離上緣不到 10° 的地方才開始。
    const topEdgeDeg = camera.fov / 2 - radToDeg(GAME_CAMERA_CONFIG.cockpit.pitchDownRad);
    let headerDeg = topEdgeDeg;
    for (let elevationDeg = 0; elevationDeg <= topEdgeDeg; elevationDeg += 0.5) {
      if (firstHit(meshes, eye, lookDirection(0, elevationDeg))?.object === car.headliner) {
        headerDeg = elevationDeg;
        break;
      }
    }
    expect(topEdgeDeg - headerDeg).toBeLessThan(10);
  });

  test('頭頂是淺色、有自發光的頂篷（不是一團黑），離眼睛不到 1 ft', () => {
    const { car, eye } = cockpitCar();
    setCarInteriorView(car, true);
    const above = firstHit(visibleMeshes(car), eye, new Vector3(0, 1, 0));
    expect(above?.object).toBe(car.headliner);
    expect(above?.distance).toBeLessThan(ftToM(1));
    const material = car.headliner.material as MeshStandardMaterial;
    expect(material.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThan(0.25);
    expect(material.emissiveIntensity).toBeGreaterThan(0);
    expect(material.emissive.getHex()).not.toBe(0);
  });

  test('前下方是儀表板，再往前越過它看得到引擎蓋；方向盤上緣低於儀表板上緣的視線', () => {
    const { car, eye } = cockpitCar();
    setCarInteriorView(car, true);
    const meshes = visibleMeshes(car);
    const isDashboard = (hit: Intersection | undefined): boolean =>
      hit !== undefined &&
      hit.object instanceof Mesh &&
      hit.object.material instanceof MeshStandardMaterial &&
      hit.object.material.color.getHex() === CAR_VISUAL_CONFIG.dashboardColor;

    // 駕駛正前方：俯角 30° 打到儀表板（或它上面的儀表罩、方向盤），俯角 12° 越過它打到引擎蓋。
    const driverAzimuthDeg = 0;
    expect(isDashboard(firstHit(meshes, eye, lookDirection(driverAzimuthDeg, -30)))).toBe(true);
    expect(firstHit(meshes, eye, lookDirection(driverAzimuthDeg, -12))?.object).toBe(car.body);
    // 副駕那一側（沒有儀表罩與方向盤）也一樣：先是儀表板，再往上是引擎蓋。
    expect(isDashboard(firstHit(meshes, eye, lookDirection(35, -24)))).toBe(true);
    expect(firstHit(meshes, eye, lookDirection(20, -12))?.object).toBe(car.body);

    // 方向盤整個在視點下方，而且最高點低於水平視線 15° 以上。
    car.root.updateMatrixWorld(true);
    const wheel = new Box3().setFromObject(car.steeringWheel);
    const wheelTop = new Vector3(eye.x, wheel.max.y, wheel.min.z);
    const dropRad = Math.atan2(eye.y - wheelTop.y, eye.z - wheelTop.z);
    expect(radToDeg(dropRad)).toBeGreaterThan(15);
    expect(wheel.max.y).toBeLessThan(eye.y);
  });

  test('左右各一根 A 柱：水平掃過前方，只在兩側各擋一小段（不到 10°），正前方完全沒有', () => {
    const { car, eye } = cockpitCar();
    setCarInteriorView(car, true);
    const meshes = visibleMeshes(car);
    /** 水平視線上被頂篷／柱內飾擋住的方位角（度）。 */
    const blocked: number[] = [];
    for (let azimuthDeg = -75; azimuthDeg <= 75; azimuthDeg += 0.5) {
      if (firstHit(meshes, eye, lookDirection(azimuthDeg, 0))?.object === car.headliner) {
        blocked.push(azimuthDeg);
      }
    }
    // 連續被擋的方位角合併成一段一段。
    const runs: { from: number; to: number }[] = [];
    for (const azimuthDeg of blocked) {
      const last = runs.at(-1);
      if (last !== undefined && azimuthDeg - last.to <= 0.5) {
        last.to = azimuthDeg;
      } else {
        runs.push({ from: azimuthDeg, to: azimuthDeg });
      }
    }
    expect(runs.length).toBe(2);
    const [leftPillar, rightPillar] = runs;
    // 左駕：左 A 柱比較近、在正前方左邊不遠；右 A 柱在右邊比較遠的地方。
    expect(leftPillar?.to).toBeLessThan(-10);
    expect(rightPillar?.from).toBeGreaterThan(30);
    for (const run of runs) {
      expect(run.to - run.from).toBeLessThan(10);
      expect(run.to - run.from).toBeGreaterThan(1);
    }
  });

  test('車內後視鏡整面在畫面裡：右上方、視線上方、不貼邊也不擋正前方，沒有被頂篷或柱子遮住', () => {
    const { car, eye, camera } = cockpitCar();
    setCarInteriorView(car, true);
    camera.aspect = 16 / 9;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    car.root.updateMatrixWorld(true);

    const housing = car.root.getObjectByName('rearViewMirror:housing');
    const glass = car.root.getObjectByName('rearViewMirror:glass');
    if (!(housing instanceof Mesh) || !(glass instanceof Mesh)) {
      throw new Error('找不到車內後視鏡');
    }
    // 鏡殼的八個角投影到畫面（NDC：x、y 在 [−1, 1] 內才看得到）。
    housing.geometry.computeBoundingBox();
    const bounds = housing.geometry.boundingBox ?? new Box3();
    const corners: Vector3[] = [];
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          corners.push(new Vector3(x, y, z).applyMatrix4(housing.matrixWorld).project(camera));
        }
      }
    }
    const xs = corners.map((corner) => corner.x);
    const ys = corners.map((corner) => corner.y);
    // 整面鏡子離畫面邊緣至少 3%（不被切掉），而且在鏡頭前方。
    expect(Math.max(...xs)).toBeLessThan(0.94);
    expect(Math.max(...ys)).toBeLessThan(0.94);
    for (const corner of corners) {
      expect(corner.z).toBeLessThan(1);
      expect(corner.z).toBeGreaterThan(-1);
    }
    // 在畫面右上方：整個在畫面中線右邊、水平視線（NDC y ≈ 0.07）上方，不擋正前方的路面。
    expect(Math.min(...xs)).toBeGreaterThan(0.3);
    expect(Math.min(...ys)).toBeGreaterThan(0.15);
    // 夠大，一眼看得出是一面鏡子：寬度佔畫面寬的 10% 以上、高度佔 5% 以上。
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.2);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.1);

    // 從眼睛看向鏡面中心與四個角落附近，第一個打到的就是鏡面（沒有被頂篷、A 柱、鏡框擋住）。
    const meshes = visibleMeshes(car);
    glass.geometry.computeBoundingBox();
    const face = glass.geometry.boundingBox ?? new Box3();
    for (const [u, v] of [
      [0.5, 0.5],
      [0.1, 0.1],
      [0.9, 0.1],
      [0.1, 0.9],
      [0.9, 0.9],
    ] as const) {
      const target = new Vector3(
        face.min.x + u * (face.max.x - face.min.x),
        face.min.y + v * (face.max.y - face.min.y),
        0,
      ).applyMatrix4(glass.matrixWorld);
      const hit = firstHit(meshes, eye, target.clone().sub(eye));
      expect(hit?.object.name).toBe('rearViewMirror:glass');
      // 離眼睛比近平面遠得多，不會被切掉。
      expect(hit?.distance).toBeGreaterThan(5 * camera.near);
    }
  });
});

describe('俯視鏡頭 top', () => {
  test('在車正上方 50–80 ft 垂直往下看，畫面上方是北（−Z）', () => {
    const pose = poseAt(25, -35, 0);
    const { camera } = createGameCamera('top', pose);
    expect(camera.position.x).toBeCloseTo(pose.x, DIGITS);
    expect(camera.position.z).toBeCloseTo(pose.z, DIGITS);
    expect(mToFt(camera.position.y)).toBeGreaterThanOrEqual(50);
    expect(mToFt(camera.position.y)).toBeLessThanOrEqual(80);

    const direction = viewDirection(camera);
    expect(direction.x).toBeCloseTo(0, DIGITS);
    expect(direction.y).toBeCloseTo(-1, DIGITS);
    expect(direction.z).toBeCloseTo(0, DIGITS);
    const screenUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    expect(screenUp.x).toBeCloseTo(0, DIGITS);
    expect(screenUp.z).toBeCloseTo(-1, DIGITS);
  });

  test('跟著車走，但不隨車頭轉：車朝哪裡畫面上方都是北', () => {
    const game = createGameCamera('top', poseAt(0, 0, 0));
    const moved = poseAt(60, 45, 135);
    game.update(moved, CRUISE_MPS, FRAME_SECONDS);
    expectSamePlacement(game.camera, createGameCamera('top', { ...moved, headingRad: 0 }).camera);
  });
});

describe('切換模式 setView', () => {
  const LENSES: Readonly<Record<GameCameraView, { readonly fovDeg: number; readonly nearM: number }>> = {
    chase_near: GAME_CAMERA_CONFIG.chaseNear,
    chase_far: GAME_CAMERA_CONFIG.chaseFar,
    hood: GAME_CAMERA_CONFIG.hood,
    cockpit: GAME_CAMERA_CONFIG.cockpit,
    top: GAME_CAMERA_CONFIG.top,
  };

  test('view() 回報目前模式；同一個 PerspectiveCamera 換鏡片（視角、近平面）', () => {
    const game = createGameCamera('chase_near', poseAt(0, 0, 0));
    const { camera } = game;
    for (const view of [...GAME_CAMERA_VIEWS, ...GAME_CAMERA_VIEWS]) {
      game.setView(view);
      expect(game.view()).toBe(view);
      expect(game.camera).toBe(camera);
      expect(camera.fov).toBe(LENSES[view].fovDeg);
      expect(camera.near).toBe(LENSES[view].nearM);
      expect(camera.far).toBe(GAME_CAMERA_CONFIG.farM);
    }
  });

  test.each(GAME_CAMERA_VIEWS)('換到 %s 立刻就位：與一開始就用這個模式建立的鏡頭相同', (view) => {
    const pose = poseAt(18, -27, 75);
    for (const from of GAME_CAMERA_VIEWS) {
      const game = createGameCamera(from, pose);
      game.setView(view);
      const fresh = createGameCamera(view, pose).camera;
      expectSamePlacement(game.camera, fresh);
      expect(game.camera.projectionMatrix.equals(fresh.projectionMatrix)).toBe(true);
    }
  });

  test.each(['chase_near', 'chase_far', 'hood', 'cockpit'] as const)(
    '從俯視換到 %s：camera.up 回到 +Y，畫面沒有歪',
    (view) => {
      const pose = poseAt(0, 0, 40);
      const game = createGameCamera('top', pose);
      expect(game.camera.up.toArray()).toEqual([0, 0, -1]);

      game.setView(view);
      game.update(pose, 0, FRAME_SECONDS);
      expect(game.camera.up.toArray()).toEqual([0, 1, 0]);
      // 畫面右方是水平的，而且就是車身右側方向。
      const screenRightDirection = screenRight(game.camera);
      const side = right(pose.headingRad);
      expect(screenRightDirection.y).toBeCloseTo(0, DIGITS);
      expect(screenRightDirection.x).toBeCloseTo(side.x, DIGITS);
      expect(screenRightDirection.z).toBeCloseTo(side.z, DIGITS);
    },
  );

  test('在別的模式開了一段再切回跟車：鏡頭在車尾後方，不是留在切走前的位置', () => {
    const game = createGameCamera('chase_near', poseAt(0, 0, 0));
    game.setView('cockpit');
    const later = poseAt(120, -90, 90);
    for (let frame = 0; frame < 10 * 60; frame += 1) {
      game.update(later, CRUISE_MPS, FRAME_SECONDS);
    }
    game.setView('chase_near');
    const offset = offsetFromCar(game.camera, later);
    expect(offset.aheadM).toBeCloseTo(-(HALF_LENGTH_M + GAME_CAMERA_CONFIG.chaseNear.behindRearM), 3);
    expect(offset.rightM).toBeCloseTo(0, 3);
  });
});
