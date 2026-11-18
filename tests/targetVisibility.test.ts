// 目標車位看得到、或有指標（關卡重做時的兩個決定）：
// 1. 開場：每一關 × 每個遊戲鏡頭 × 橫式／直式——發光標記有一部分在畫面裡、沒被實心的東西擋住，
//    不然 HUD 有指標（車位方向指標，或「車位在後方」的提示）。
// 2. 沿參考路線開一趟（第 1 世界）：每半秒檢查一次，「看得到發光標記、或有車位方向指標」一路成立
//    （離車位中心 12 ft 內、車已經在車位上或正要進去時除外；倒車時指標收起、倒車輔助層接手，也除外）。
// 3. 要找車位的只有 w1_l02：其餘各關在橫式畫面的四個行車鏡頭下，參考路線轉完第一個彎之後 1 秒內，
//    發光標記已經進過畫面（沒有彎的 w1_l09 是開場就看得到）。
// 不開 WebGL：場景照 createGameScene 的組法在 Node 裡組出來（tests/levelWorld.ts），視線用真的網格打 Raycaster。
import { Vector3, type Mesh, type PerspectiveCamera } from 'three';
import { describe, expect, test } from 'vitest';
import { GAME_CAMERA_VIEWS, type GameCameraView } from '../src/core/cameraView';
import { FIXED_STEP_SECONDS, TARGET_POINTER_RULES } from '../src/core/gameConfig';
import { forward, headingDelta, right } from '../src/core/heading';
import { ftToM, radToDeg } from '../src/core/units';
import { INITIAL_DRIVER_STATE, autoDrive } from '../src/level/autoDriver';
import { LEVELS, worldLevels } from '../src/level/levelCatalog';
import { routeForLevel } from '../src/level/levelRoutes';
import type { LevelDefinition } from '../src/level/levelSchema';
import type { ParkingSpot } from '../src/level/parkingJudge';
import { startSession, stepSession } from '../src/level/session';
import { collectCameraBlockers } from '../src/render/cameraBlockers';
import { createGameCamera, targetView, type GameCamera } from '../src/render/gameCamera';
import type { SightBox } from '../src/render/occlusionFade';
import { QUALITY_PRESETS, SPOT_GLOW_CONFIG } from '../src/render/renderConfig';
import { spotHintVisible, targetPointerReadout } from '../src/ui/hud';
import type { Gear } from '../src/vehicle/gearbox';
import { PASSABLE_MESHES, blockedBetween, buildLevelWorld, solidMeshes } from './levelWorld';

const ASPECTS = [
  ['橫式 16:9', 16 / 9],
  ['直式 412×892', 412 / 892],
] as const;

/** 取樣點離畫面邊緣至少留這麼多（NDC）：貼著邊的一小角不算看得到。 */
const FRAME_LIMIT = 0.97;
/** 至少要有這麼多個取樣點看得到才算（單獨一條視線從車縫穿過去不算）。 */
const MIN_SAMPLES = 2;

/** 車位輪廓上的取樣點（每邊 5 個），高度 y。 */
function outlinePoints(spot: ParkingSpot, y: number): Vector3[] {
  const ahead = forward(spot.headingRad);
  const side = right(spot.headingRad);
  const points: Vector3[] = [];
  const at = (across: number, along: number): void => {
    points.push(
      new Vector3(
        spot.x + (ahead.x * along * spot.lengthM) / 2 + (side.x * across * spot.widthM) / 2,
        y,
        spot.z + (ahead.z * along * spot.lengthM) / 2 + (side.z * across * spot.widthM) / 2,
      ),
    );
  };
  for (const f of [-1, -0.5, 0, 0.5, 1]) {
    at(f, -1);
    at(f, 1);
    at(-1, f);
    at(1, f);
  }
  return points;
}

interface Glow {
  /** 光牆：貼地最濃的那一段（0.5 ft 與 1.5 ft 高）。 */
  readonly wall: Vector3[];
  /** 光幕：牆頂以上、比車頂高的那一段（5.5 ft 與 8 ft 高）。 */
  readonly veil: Vector3[];
}

function glowOf(spot: ParkingSpot): Glow {
  return {
    wall: [...outlinePoints(spot, ftToM(0.5)), ...outlinePoints(spot, ftToM(1.5))],
    veil: [...outlinePoints(spot, ftToM(5.5)), ...outlinePoints(spot, ftToM(8))],
  };
}

/** points 裡有幾個在畫面裡、而且鏡頭到它之間沒有實心的東西。 */
function seenCount(camera: PerspectiveCamera, points: Vector3[], meshes: Mesh[]): number {
  let count = 0;
  for (const point of points) {
    if (point.clone().applyMatrix4(camera.matrixWorldInverse).z > -camera.near) {
      continue;
    }
    const screen = point.clone().project(camera);
    if (Math.abs(screen.x) > FRAME_LIMIT || Math.abs(screen.y) > FRAME_LIMIT) {
      continue;
    }
    if (blockedBetween(camera.position, point, meshes) === undefined) {
      count += 1;
    }
  }
  return count;
}

/**
 * 光幕對這台鏡頭有沒有至少一半的濃度：鏡頭夠低（高的鏡頭不畫光幕）、離車位夠遠（近了光幕自己消失）。
 * 門檻取 renderConfig 裡兩段漸變的中點。
 */
function veilActive(camera: PerspectiveCamera, spot: ParkingSpot): boolean {
  const { veil } = SPOT_GLOW_CONFIG;
  const distanceM = Math.hypot(camera.position.x - spot.x, camera.position.z - spot.z);
  return (
    camera.position.y <= (veil.cameraLowM + veil.cameraHighM) / 2 &&
    distanceM >= (veil.fadeNearM + veil.fadeFarM) / 2
  );
}

/** 發光標記（光牆，或這台鏡頭畫得出來的光幕）有沒有在畫面裡、沒被擋住。 */
function glowSeen(camera: PerspectiveCamera, spot: ParkingSpot, glow: Glow, meshes: Mesh[]): boolean {
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const wall = seenCount(camera, glow.wall, meshes);
  if (wall >= MIN_SAMPLES) {
    return true;
  }
  return veilActive(camera, spot) && wall + seenCount(camera, glow.veil, meshes) >= MIN_SAMPLES;
}

interface World {
  /** 擋得住視線的網格（路燈與樹只淡不擋，不算）。 */
  readonly hardMeshes: Mesh[];
  readonly blockers: readonly SightBox[];
  readonly glow: Glow;
}

function worldOf(level: LevelDefinition): World {
  const root = buildLevelWorld(level, QUALITY_PRESETS.medium);
  return {
    hardMeshes: solidMeshes(root).filter((mesh) => !PASSABLE_MESHES.has(mesh.name)),
    blockers: collectCameraBlockers(root),
    glow: glowOf(level.layout.spot),
  };
}

function cameraAtStart(
  view: GameCameraView,
  level: LevelDefinition,
  world: World,
  aspect: number,
): GameCamera {
  const game = createGameCamera(view, level.layout.startState, world.blockers);
  game.camera.aspect = aspect;
  game.camera.updateProjectionMatrix();
  game.snapTo(level.layout.startState);
  return game;
}

describe.each(LEVELS.map((level) => [level.id, level] as const))('%s 開場', (_id, level) => {
  const world = worldOf(level);
  const { spot } = level.layout;

  describe.each(ASPECTS)('%s', (_label, aspect) => {
    test.each(GAME_CAMERA_VIEWS)('%s：看得到車位的發光標記，不然 HUD 有指標', (view) => {
      const game = cameraAtStart(view, level, world, aspect);
      const session = startSession(level.layout);
      const seen = glowSeen(game.camera, spot, world.glow, world.hardMeshes);
      const pointer = targetPointerReadout(session, 'forward', targetView(game, spot), false) !== null;
      const hint = spotHintVisible(session, 'forward', false);
      expect(seen || pointer || hint).toBe(true);
    });
  });
});

interface RouteLog {
  /** 參考路線轉完第一個彎（車頭方向離起點超過 80°）的時間；沒有這樣的彎是 null。 */
  readonly firstTurnS: number | null;
  /** 發光標記第一次進畫面的時間；整趟都沒有（或沒有要記）是 null。 */
  readonly firstSeenS: number | null;
  /** 既看不到發光標記、也沒有車位方向指標的時刻（秒）。 */
  readonly unmarkedS: number[];
  readonly parked: boolean;
}

const CHECK_EVERY_STEPS = 30;
const FIRST_TURN_DEG = 80;

/**
 * 沿參考路線開一趟，鏡頭跟著走；每半秒檢查一次發光標記與指標。
 * @param trackFirstSeen 要不要記發光標記第一次進畫面的時間（打視線很花時間：不記的時候，有指標的時刻就不打了）
 */
function driveRoute(
  level: LevelDefinition,
  world: World,
  view: GameCameraView,
  aspect: number,
  trackFirstSeen: boolean,
): RouteLog {
  const route = routeForLevel(level.id);
  if (route === undefined) {
    throw new Error(`${level.id} 沒有參考路線`);
  }
  const { spot } = level.layout;
  const start = level.layout.startState;
  const game = cameraAtStart(view, level, world, aspect);
  let session = startSession(level.layout);
  let driver = INITIAL_DRIVER_STATE;
  let pointerShown = false;
  // 檔位照參考路線的油門：倒車的時候是 R 檔（指標收起、倒車輔助層接手看後面），那一段不要求有標記。
  let gear: Gear = 'forward';
  let firstTurnS: number | null = null;
  let firstSeenS: number | null = null;
  const unmarkedS: number[] = [];

  const check = (seconds: number): void => {
    const { vehicle } = session;
    const onTheSpot =
      Math.hypot(spot.x - vehicle.x, spot.z - vehicle.z) < TARGET_POINTER_RULES.minDistanceM;
    const needsMark = gear === 'forward' && !pointerShown && !onTheSpot;
    if (!needsMark && !(trackFirstSeen && firstSeenS === null)) {
      return;
    }
    const seen = glowSeen(game.camera, spot, world.glow, world.hardMeshes);
    if (seen && firstSeenS === null) {
      firstSeenS = seconds;
    }
    if (!seen && needsMark) {
      unmarkedS.push(seconds);
    }
  };

  pointerShown = targetPointerReadout(session, gear, targetView(game, spot), pointerShown) !== null;
  check(0);
  let steps = 0;
  while (session.status !== 'parked' && session.status !== 'failed') {
    const decision = autoDrive(route, driver, session.vehicle);
    driver = decision.state;
    session = stepSession(session, decision.input);
    const pose = session.vehicle;
    game.update(pose, pose.speedMps, FIXED_STEP_SECONDS);
    steps += 1;
    if (decision.input.throttle !== 0) {
      gear = decision.input.throttle < 0 ? 'reverse' : 'forward';
    }
    pointerShown =
      targetPointerReadout(session, gear, targetView(game, spot), pointerShown) !== null;
    const seconds = steps * FIXED_STEP_SECONDS;
    const turnedDeg = Math.abs(radToDeg(headingDelta(start.headingRad, pose.headingRad)));
    if (firstTurnS === null && turnedDeg >= FIRST_TURN_DEG) {
      firstTurnS = seconds;
    }
    if (steps % CHECK_EVERY_STEPS === 0 && session.status === 'driving') {
      check(seconds);
    }
  }
  return { firstTurnS, firstSeenS, unmarkedS, parked: session.status === 'parked' };
}

/** 轉完第一個彎之後多久之內要看過發光標記（秒）。 */
const SEEN_WITHIN_S = 1;

describe.each(worldLevels(1).map((level) => [level.id, level] as const))(
  '%s 沿參考路線',
  (id, level) => {
    const world = worldOf(level);

    describe.each(ASPECTS)('%s', (label, aspect) => {
      test.each(GAME_CAMERA_VIEWS)('%s：一路上看得到發光標記，不然有車位方向指標', (view) => {
        // 「第一個彎之後就看得到」只要求橫式畫面的行車鏡頭：俯視只看得到車四周 33 ft，直式畫面左右很窄，靠指標。
        const mustSeeEarly = id !== 'w1_l02' && label.startsWith('橫式') && view !== 'top';
        const log = driveRoute(level, world, view, aspect, mustSeeEarly);
        expect(log.parked).toBe(true);
        expect(log.unmarkedS).toEqual([]);
        // 第一個彎的定義沒有落空：只有 w1_l09（整條路線只換車道）沒有 80° 以上的彎。
        expect(log.firstTurnS === null).toBe(id === 'w1_l09');
        if (mustSeeEarly) {
          // 沒有彎的 w1_l09：開場就要看得到。
          const deadlineS = log.firstTurnS === null ? 0 : log.firstTurnS + SEEN_WITHIN_S;
          expect(log.firstSeenS ?? Infinity).toBeLessThanOrEqual(deadlineS);
        }
      });
    });
  },
);
