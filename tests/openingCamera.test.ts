// 開場鏡頭的回歸測試：每一關 × 每一個遊戲鏡頭 × 每個畫質級別，車在起點、鏡頭剛就位時——
// 1. 車在畫面裡，大小合理（駕駛座／引擎蓋本來就貼著車，另有自己的上下限）；
// 2. 鏡頭與車之間沒有被場景擋住（用真的網格打 Raycaster，車自己不算），鏡頭也不在實心的東西裡面；
// 3. 看得到前面的場地，不是只盯著車腳邊的地、也不是埋在牆前面。
// 另外沿每一關的參考路線實際開一趟：跟車鏡頭每一幀都不在擋塊裡、不隔著擋塊看車、車留在畫面裡、沒有突然跳一大段。
// 不開 WebGL：場景照 createGameScene 的組法在 Node 裡組出來（tests/levelWorld.ts）。
import { Raycaster, Vector3, type Mesh, type PerspectiveCamera } from 'three';
import { describe, expect, test } from 'vitest';
import { GAME_CAMERA_VIEWS, type GameCameraView } from '../src/core/cameraView';
import { FIXED_STEP_SECONDS } from '../src/core/gameConfig';
import { forward, right } from '../src/core/heading';
import { ftToM, mToFt, radToDeg } from '../src/core/units';
import { INITIAL_DRIVER_STATE, autoDrive } from '../src/level/autoDriver';
import { LEVELS, worldLevels } from '../src/level/levelCatalog';
import { routeForLevel } from '../src/level/levelRoutes';
import type { LevelDefinition } from '../src/level/levelSchema';
import { startSession, stepSession } from '../src/level/session';
import { clearFraction, collectCameraBlockers } from '../src/render/cameraBlockers';
import { createGameCamera } from '../src/render/gameCamera';
import { pointInBox, sightTargets, type SightBox } from '../src/render/occlusionFade';
import { QUALITY_LEVELS } from '../src/render/quality';
import { CAR_VISUAL_CONFIG, GAME_CAMERA_CONFIG, QUALITY_PRESETS } from '../src/render/renderConfig';
import type { VehiclePose } from '../src/vehicle/bicycleModel';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';
import { buildLevelWorld, solidMeshes } from './levelWorld';

/** 橫式（e2e 與桌面）與直式手機（使用者回報用的視窗）。 */
const ASPECTS = [
  ['橫式 16:9', 16 / 9],
  ['直式 412×892', 412 / 892],
] as const;

/** 路燈（含掛在燈桿上的監視器）與樹：擋到時只淡不擋（細桿、樹冠），視線穿過它們不算「被場景擋住」。 */
const PASSABLE_MESHES: ReadonlySet<string> = new Set([
  'lampPosts',
  'lampLenses',
  'cameras',
  'treeTrunks',
  'treeFoliage',
]);

const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;
const HALF_WIDTH_M = VEHICLE_CONFIG_SI.widthM / 2;
/** 下車身頂面（引擎蓋）的高度。 */
const HOOD_TOP_M = CAR_VISUAL_CONFIG.groundClearanceM + CAR_VISUAL_CONFIG.lowerBodyHeightM;

/** 車的包圍盒表面與內部的取樣點（世界座標）：每個方向 5 格。 */
function carBoxPoints(pose: VehiclePose): Vector3[] {
  const ahead = forward(pose.headingRad);
  const side = right(pose.headingRad);
  const points: Vector3[] = [];
  const steps = [-1, -0.5, 0, 0.5, 1];
  for (const along of steps) {
    for (const across of steps) {
      for (const up of [0, 0.25, 0.5, 0.75, 1]) {
        points.push(
          new Vector3(
            pose.x + ahead.x * along * HALF_LENGTH_M + side.x * across * HALF_WIDTH_M,
            up * VEHICLE_CONFIG_SI.heightM,
            pose.z + ahead.z * along * HALF_LENGTH_M + side.z * across * HALF_WIDTH_M,
          ),
        );
      }
    }
  }
  return points;
}

interface CarOnScreen {
  /** 取樣點有多少比例在畫面裡（在鏡頭前面、NDC 在 ±1 內）。 */
  readonly visibleFraction: number;
  /** 在鏡頭前面的取樣點的外框（夾在畫面內）佔畫面的寬、高比例。 */
  readonly widthFraction: number;
  readonly heightFraction: number;
  /** 外框的中心（NDC）。 */
  readonly centerX: number;
  readonly centerY: number;
}

/** 把車的包圍盒投影到畫面上。 */
function carOnScreen(camera: PerspectiveCamera, pose: VehiclePose): CarOnScreen {
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const points = carBoxPoints(pose);
  let visible = 0;
  let minX = 1;
  let maxX = -1;
  let minY = 1;
  let maxY = -1;
  for (const point of points) {
    if (point.clone().applyMatrix4(camera.matrixWorldInverse).z > -camera.near) {
      continue;
    }
    const screen = point.project(camera);
    if (Math.abs(screen.x) <= 1 && Math.abs(screen.y) <= 1) {
      visible += 1;
    }
    minX = Math.min(minX, Math.max(screen.x, -1));
    maxX = Math.max(maxX, Math.min(screen.x, 1));
    minY = Math.min(minY, Math.max(screen.y, -1));
    maxY = Math.max(maxY, Math.min(screen.y, 1));
  }
  return {
    visibleFraction: visible / points.length,
    widthFraction: Math.max(maxX - minX, 0) / 2,
    heightFraction: Math.max(maxY - minY, 0) / 2,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

const raycaster = new Raycaster();

/**
 * from 與 to 之間有沒有被 meshes 擋住。兩個方向各打一次：Raycaster 與算圖一樣只算正面，
 * 鏡頭在實心方塊裡面時，從鏡頭打出去只碰得到背面（不算），從另一頭打回來才碰得到正面。
 */
function blockedBetween(from: Vector3, to: Vector3, meshes: Mesh[]): string | undefined {
  const direction = to.clone().sub(from);
  const distance = direction.length();
  direction.normalize();
  raycaster.far = distance;
  raycaster.set(from, direction);
  const hit = raycaster.intersectObjects(meshes, false)[0];
  if (hit !== undefined) {
    return hit.object.name;
  }
  raycaster.set(to, direction.clone().negate());
  return raycaster.intersectObjects(meshes, false)[0]?.object.name;
}

/** 鏡頭看車身上 9 個點，各被什麼擋住（沒被擋的不列）。 */
function sightBlockers(camera: PerspectiveCamera, pose: VehiclePose, meshes: Mesh[]): string[] {
  return sightTargets(pose)
    .map((target) => blockedBetween(camera.position, new Vector3(target.x, target.y, target.z), meshes))
    .filter((name): name is string => name !== undefined);
}

/** 鏡頭往下看的角度（度）；往上看是負的。 */
function pitchDownDeg(camera: PerspectiveCamera): number {
  return -radToDeg(Math.asin(camera.getWorldDirection(new Vector3()).y));
}

/**
 * 畫面上緣正中央的視線打到地面的地方，在車身中心前方多遠（公尺，沿車頭方向）；看得到地平線是 Infinity。
 */
function groundSeenAheadM(camera: PerspectiveCamera, pose: VehiclePose): number {
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const origin = camera.position;
  const direction = new Vector3(0, 1, 0.5).unproject(camera).sub(origin).normalize();
  if (direction.y >= -1e-6) {
    return Infinity;
  }
  const reach = origin.y / -direction.y;
  const ahead = forward(pose.headingRad);
  return (
    (origin.x + direction.x * reach - pose.x) * ahead.x +
    (origin.z + direction.z * reach - pose.z) * ahead.z
  );
}

/** 沿鏡頭正前方打出去，第一個實心的東西離多遠（公尺）；什麼都沒有是 Infinity。 */
function clearAheadM(camera: PerspectiveCamera, meshes: Mesh[]): number {
  raycaster.far = Infinity;
  raycaster.set(camera.position, camera.getWorldDirection(new Vector3()));
  return raycaster.intersectObjects(meshes, false)[0]?.distance ?? Infinity;
}

interface World {
  readonly meshes: Mesh[];
  /** 不含路燈與樹（它們只淡不擋）。 */
  readonly hardMeshes: Mesh[];
  readonly blockers: readonly SightBox[];
}

function worldOf(level: LevelDefinition, quality: (typeof QUALITY_LEVELS)[number]): World {
  const root = buildLevelWorld(level, QUALITY_PRESETS[quality]);
  const meshes = solidMeshes(root);
  return {
    meshes,
    hardMeshes: meshes.filter((mesh) => !PASSABLE_MESHES.has(mesh.name)),
    blockers: collectCameraBlockers(root),
  };
}

function openingCamera(
  view: GameCameraView,
  level: LevelDefinition,
  world: World,
  aspect: number,
): PerspectiveCamera {
  const game = createGameCamera(view, level.layout.startState, world.blockers);
  // 與 main.ts 相同：先設好長寬比再就位。
  game.camera.aspect = aspect;
  game.camera.updateProjectionMatrix();
  game.snapTo(level.layout.startState);
  // 第一幀（dt = 0）不會再移動。
  const placed = game.camera.position.clone();
  game.update(level.layout.startState, 0, 0);
  expect(game.camera.position.distanceTo(placed)).toBe(0);
  return game.camera;
}

const CASES = LEVELS.flatMap((level) =>
  QUALITY_LEVELS.map((quality) => [level.id, quality, level] as const),
);

describe.each(CASES)('%s（%s）的開場鏡頭', (_id, quality, level) => {
  const world = worldOf(level, quality);
  const pose = level.layout.startState;

  describe.each(ASPECTS)('%s', (_label, aspect) => {
    test.each(GAME_CAMERA_VIEWS)('%s：鏡頭不在實心的東西裡面，也沒有隔著場景看車', (view) => {
      const camera = openingCamera(view, level, world, aspect);
      expect(camera.position.y).toBeGreaterThan(ftToM(1.5));
      expect(world.blockers.filter((blocker) => pointInBox(camera.position, blocker))).toEqual([]);
      // 樓、牆、車、障礙物一條視線都不能擋。
      expect(sightBlockers(camera, pose, world.hardMeshes)).toEqual([]);
      // 連細燈桿與樹都算進來，最多擋掉左中右其中一排（3 條）：車大半看得到，而且那根桿子會被淡掉。
      expect(sightBlockers(camera, pose, world.meshes).length).toBeLessThanOrEqual(3);
    });

    test.each(['chase_near', 'chase_far'] as const)(
      '%s：整台車大半在畫面裡、在畫面中間，不是一小點也沒有塞滿畫面；看得到車頭前面的場地',
      (view) => {
        const camera = openingCamera(view, level, world, aspect);
        const car = carOnScreen(camera, pose);
        expect(car.visibleFraction).toBeGreaterThanOrEqual(0.7);
        expect(Math.abs(car.centerX)).toBeLessThan(0.05);
        expect(Math.abs(car.centerY)).toBeLessThan(0.75);
        expect(car.widthFraction).toBeGreaterThan(0.08);
        expect(car.heightFraction).toBeGreaterThan(0.12);
        expect(car.heightFraction).toBeLessThan(0.85);
        // 橫式畫面車寬不到一半；直式畫面本來就窄，近距離跟車沒被擋時車尾幾乎與畫面同寬（原本的擺位）。
        expect(car.widthFraction).toBeLessThan(aspect > 1 ? 0.5 : 1.01);
        // 畫面上緣看到的地面在車頭前面至少 15 ft（或看得到地平線）：不是只盯著車腳邊的地。
        expect(groundSeenAheadM(camera, pose)).toBeGreaterThan(HALF_LENGTH_M + ftToM(15));
        // 往下看的角度有上限：不是垂直往下。
        expect(pitchDownDeg(camera)).toBeLessThanOrEqual(
          radToDeg(GAME_CAMERA_CONFIG.avoidance.maxElevationRad) + 1e-6,
        );
      },
    );

    test('top：車在畫面正中央，四周的場地都看得到', () => {
      const camera = openingCamera('top', level, world, aspect);
      const car = carOnScreen(camera, pose);
      expect(car.visibleFraction).toBe(1);
      expect(Math.abs(car.centerX)).toBeLessThan(0.01);
      expect(Math.abs(car.centerY)).toBeLessThan(0.01);
      expect(Math.max(car.widthFraction, car.heightFraction)).toBeGreaterThan(0.1);
      expect(Math.max(car.widthFraction, car.heightFraction)).toBeLessThan(0.6);
    });

    test.each(['hood', 'cockpit'] as const)(
      '%s：畫面下半部看得到車頭（看得出在車上），正前方有路、沒有埋在牆前面，看得到地平線',
      (view) => {
        const camera = openingCamera(view, level, world, aspect);
        camera.updateMatrixWorld(true);
        // 引擎蓋前緣的中點：在畫面裡、在下半部（車頭沒有蓋過畫面中線，也沒有掉到畫面外）。
        const ahead = forward(pose.headingRad);
        const nose = new Vector3(
          pose.x + ahead.x * HALF_LENGTH_M,
          HOOD_TOP_M,
          pose.z + ahead.z * HALF_LENGTH_M,
        ).project(camera);
        expect(Math.abs(nose.x)).toBeLessThan(1);
        expect(nose.y).toBeGreaterThan(-1);
        expect(nose.y).toBeLessThan(-0.05);
        // 正前方至少 12 ft 沒有實心的東西。
        expect(clearAheadM(camera, world.meshes)).toBeGreaterThan(ftToM(12));
        // 視線只略往下：地平線在畫面裡。
        expect(pitchDownDeg(camera)).toBeLessThan(camera.fov / 2);
        expect(pitchDownDeg(camera)).toBeGreaterThan(0);
      },
    );
  });
});

describe('使用者回報的畫面：w1_l10 遠距離跟車', () => {
  const level = LEVELS.find((candidate) => candidate.id === 'w1_l10');
  if (level === undefined) {
    throw new Error('找不到 w1_l10');
  }
  const world = worldOf(level, 'medium');
  const pose = level.layout.startState;

  test('沒有避讓的擺位（修正前）：鏡頭在南面那棟樓的屋頂上方，9 條視線全被屋頂擋住', () => {
    const { camera } = createGameCamera('chase_far', pose);
    const blockers = sightBlockers(camera, pose, world.hardMeshes);
    expect(blockers).toHaveLength(9);
    expect(new Set(blockers)).toEqual(new Set(['bounds']));
  });

  test.each(ASPECTS)('%s：鏡頭在巷子裡（南牆的前面、兩面牆之間）、高過車頂，看得到車與前面的巷子', (_label, aspect) => {
    const camera = openingCamera('chase_far', level, world, aspect);
    const bounds = level.boundsFt;
    if (bounds === undefined) {
      throw new Error('w1_l10 沒有 bounds');
    }
    expect(mToFt(camera.position.z)).toBeLessThan(bounds.maxZFt - 1);
    expect(mToFt(camera.position.z)).toBeGreaterThan(mToFt(pose.z));
    expect(mToFt(camera.position.x)).toBeGreaterThan(bounds.minXFt + 1);
    expect(mToFt(camera.position.x)).toBeLessThan(6.75 - 1);
    expect(camera.position.y).toBeGreaterThan(VEHICLE_CONFIG_SI.heightM + ftToM(4));
    expect(carOnScreen(camera, pose).visibleFraction).toBeGreaterThanOrEqual(0.9);
    expect(groundSeenAheadM(camera, pose)).toBeGreaterThan(HALF_LENGTH_M + ftToM(20));
  });
});

/** 一幀之內鏡頭最多可以比車多移動這麼多（公尺）：繞過高牆的牆角時會跳一小段，其餘都遠小於這個。 */
const MAX_FRAME_JUMP_M = ftToM(6);

describe.each(worldLevels(1).map((level) => [level.id, level] as const))(
  '%s：沿參考路線開一趟',
  (_id, level) => {
    const world = worldOf(level, 'medium');
    const route = routeForLevel(level.id);
    if (route === undefined) {
      throw new Error(`${level.id} 沒有參考路線`);
    }

    describe.each(ASPECTS)('%s', (_label, aspect) => {
      test.each(['chase_near', 'chase_far'] as const)(
        '%s：每一幀鏡頭都不在擋塊裡、不隔著擋塊看車、車在畫面裡，沒有突然跳一大段',
        (view) => {
          const game = createGameCamera(view, level.layout.startState, world.blockers);
          const { camera } = game;
          camera.aspect = aspect;
          camera.updateProjectionMatrix();
          game.snapTo(level.layout.startState);

          let session = startSession(level.layout);
          let driver = INITIAL_DRIVER_STATE;
          const previous = camera.position.clone();
          const center = new Vector3();
          let frames = 0;
          let inside = 0;
          let blocked = 0;
          let offScreen = 0;
          let largestJumpM = 0;
          while (session.status !== 'parked' && session.status !== 'failed') {
            const decision = autoDrive(route, driver, session.vehicle);
            driver = decision.state;
            session = stepSession(session, decision.input);
            const pose = session.vehicle;
            game.update(pose, pose.speedMps, FIXED_STEP_SECONDS);
            frames += 1;

            if (world.blockers.some((blocker) => pointInBox(camera.position, blocker))) {
              inside += 1;
            }
            center.set(pose.x, VEHICLE_CONFIG_SI.heightM / 2, pose.z);
            if (clearFraction(center, camera.position, world.blockers, 0) < 1) {
              blocked += 1;
            }
            camera.updateMatrixWorld(true);
            const screen = center.clone().project(camera);
            if (Math.abs(screen.x) > 0.6 || Math.abs(screen.y) > 0.8) {
              offScreen += 1;
            }
            largestJumpM = Math.max(
              largestJumpM,
              camera.position.distanceTo(previous) - Math.abs(pose.speedMps) * FIXED_STEP_SECONDS,
            );
            previous.copy(camera.position);
          }

          expect(session.status).toBe('parked');
          expect(frames).toBeGreaterThan(60);
          expect({ inside, blocked, offScreen }).toEqual({ inside: 0, blocked: 0, offScreen: 0 });
          expect(largestJumpM).toBeLessThan(MAX_FRAME_JUMP_M);
          // 視角只在跟車鏡頭被擠近時拉寬，不會超過上限。
          expect(camera.fov).toBeLessThanOrEqual(GAME_CAMERA_CONFIG.avoidance.squeezedFovDeg);
        },
      );
    });
  },
);
