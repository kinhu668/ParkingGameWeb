// 跟車鏡頭的避讓：牆在車後面時拉近、太近就抬高並拉寬視角、永遠看向車；矮的東西抬高一點越過去；
// 開場、重來、換模式直接就位；倒向牆的每一幀鏡頭都不在牆裡。不開 WebGL。
import { Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { forward } from '../src/core/heading';
import { degToRad, ftToM, mToFt, mphToMps, radToDeg } from '../src/core/units';
import { occluderBox } from '../src/props/occluders';
import { clearFraction } from '../src/render/cameraBlockers';
import {
  cameraSnapshot,
  createGameCamera,
  resolveChasePlacement,
  tightDistanceM,
} from '../src/render/gameCamera';
import { pointInBox, sightBox, type SightBox } from '../src/render/occlusionFade';
import { GAME_CAMERA_CONFIG } from '../src/render/renderConfig';
import type { VehiclePose } from '../src/vehicle/bicycleModel';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';

const FRAME_SECONDS = 1 / 60;
const LANDSCAPE = 16 / 9;
const PORTRAIT = 412 / 892;
const AVOID = GAME_CAMERA_CONFIG.avoidance;
const CHASE_VIEWS = ['chase_near', 'chase_far'] as const;
const RIGS = {
  chase_near: GAME_CAMERA_CONFIG.chaseNear,
  chase_far: GAME_CAMERA_CONFIG.chaseFar,
} as const;
const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;

/** 車在原點、車頭朝北（−Z）：鏡頭在南邊（+Z）。 */
const POSE: VehiclePose = { x: 0, z: 0, headingRad: 0, steerRad: 0 };

/** 車後方的一面牆：牆面在 z = faceFt，往南厚 40 ft，寬 60 ft。 */
function wallBehind(faceFt: number, heightFt: number): SightBox {
  return sightBox(
    occluderBox(
      { x: 0, y: ftToM(heightFt) / 2, z: ftToM(faceFt + 20) },
      { x: ftToM(60), y: ftToM(heightFt), z: ftToM(40) },
    ),
  );
}

/** 一台停在車後方的車（車頭朝北），中心在 z = centerFt。 */
function parkedCarBehind(centerFt: number): SightBox {
  return sightBox(
    occluderBox(
      { x: 0, y: VEHICLE_CONFIG_SI.heightM / 2, z: ftToM(centerFt) },
      { x: VEHICLE_CONFIG_SI.widthM, y: VEHICLE_CONFIG_SI.heightM, z: VEHICLE_CONFIG_SI.lengthM },
    ),
  );
}

function landscape(view: (typeof CHASE_VIEWS)[number], pose: VehiclePose, blockers: readonly SightBox[]) {
  const game = createGameCamera(view, pose, blockers);
  game.camera.aspect = LANDSCAPE;
  game.snapTo(pose);
  return game;
}

/** 鏡頭往下看的角度（度）。 */
function pitchDownDeg(game: ReturnType<typeof createGameCamera>): number {
  return -radToDeg(Math.asin(game.camera.getWorldDirection(new Vector3()).y));
}

describe.each(CHASE_VIEWS)('%s 被車後方的牆擋住', (view) => {
  const rig = RIGS[view];
  // 牆面離車尾 2.5 ft（w1_l10 開場的情形）：比鏡頭高的 26 ft 牆，與比遠距鏡頭矮的 19.8 ft 牆。
  const faceFt = mToFt(HALF_LENGTH_M) + 2.5;

  test.each([26, 19.8])('牆高 %d ft：鏡頭留在牆的前面、高過車頂、沒有鑽進牆裡或跑到牆頂上', (heightFt) => {
    const wall = wallBehind(faceFt, heightFt);
    const { camera } = landscape(view, POSE, [wall]);
    expect(camera.position.z).toBeLessThanOrEqual(ftToM(faceFt) - AVOID.clearanceM + 1e-6);
    expect(camera.position.z).toBeGreaterThan(0);
    expect(camera.position.y).toBeGreaterThan(VEHICLE_CONFIG_SI.heightM + ftToM(3));
    expect(pointInBox(camera.position, wall, ftToM(0.5))).toBe(false);
    expect(camera.position.x).toBeCloseTo(0, 9);
  });

  test('拉近之後抬高、視角拉寬，仍然看向車：車身中心在畫面正中央，往下看的角度比平常大', () => {
    const game = landscape(view, POSE, [wallBehind(faceFt, 26)]);
    const free = landscape(view, POSE, []);
    const lookAt = new Vector3(POSE.x, rig.lookAtHeightM, POSE.z);
    // 離看向點不比「最近距離」近：車不會塞滿畫面。
    expect(game.camera.position.distanceTo(lookAt)).toBeGreaterThanOrEqual(
      tightDistanceM(rig, LANDSCAPE) - 1e-6,
    );
    expect(game.camera.fov).toBeCloseTo(AVOID.squeezedFovDeg, 0);
    expect(pitchDownDeg(game)).toBeGreaterThan(pitchDownDeg(free) + 10);
    expect(pitchDownDeg(game)).toBeLessThanOrEqual(radToDeg(AVOID.maxElevationRad) + 1e-6);
    const screen = lookAt.clone().project(game.camera);
    expect(screen.x).toBeCloseTo(0, 6);
    expect(screen.y).toBeCloseTo(0, 6);
    // 畫面上緣的視線打到地面的地方在車頭前面至少 15 ft：不是只盯著車腳邊的地。
    const topEdgeDownDeg = pitchDownDeg(game) - game.camera.fov / 2;
    const groundAheadM =
      topEdgeDownDeg <= 0
        ? Infinity
        : game.camera.position.y / Math.tan(degToRad(topEdgeDownDeg)) - game.camera.position.z;
    expect(groundAheadM).toBeGreaterThan(HALF_LENGTH_M + ftToM(15));
  });

  test('直式的手機畫面：離得比橫式遠（抬得更高），車身寬度不超過畫面寬度的一半', () => {
    const wall = wallBehind(faceFt, 26);
    const wide = landscape(view, POSE, [wall]);
    const tall = createGameCamera(view, POSE, [wall]);
    tall.camera.aspect = PORTRAIT;
    tall.camera.updateProjectionMatrix();
    tall.snapTo(POSE);
    tall.camera.updateMatrixWorld(true);
    const lookAt = new Vector3(POSE.x, rig.lookAtHeightM, POSE.z);
    expect(tall.camera.position.distanceTo(lookAt)).toBeGreaterThan(
      wide.camera.position.distanceTo(lookAt) + ftToM(3),
    );
    expect(tall.camera.position.y).toBeGreaterThan(wide.camera.position.y);
    const half = VEHICLE_CONFIG_SI.widthM / 2;
    const left = new Vector3(-half, rig.lookAtHeightM, 0).project(tall.camera);
    const right = new Vector3(half, rig.lookAtHeightM, 0).project(tall.camera);
    // 視角離最寬還差一點點（鏡頭比最近距離略遠），留 0.02 的餘裕。
    expect((right.x - left.x) / 2).toBeLessThanOrEqual(AVOID.maxCarWidthFraction + 0.02);
  });

  test('牆離得夠遠（鏡頭擺得下）：與沒有牆完全一樣', () => {
    const farWall = wallBehind(mToFt(HALF_LENGTH_M + rig.behindRearM) + 4, 26);
    const game = landscape(view, POSE, [farWall]);
    const free = landscape(view, POSE, []);
    expect(game.camera.position.toArray()).toEqual(free.camera.position.toArray());
    expect(game.camera.quaternion.toArray()).toEqual(free.camera.quaternion.toArray());
    expect(game.camera.fov).toBe(rig.fovDeg);
  });

  test('牆只擋到一點：沿原本的方向拉近，還沒近到要抬高', () => {
    const backM = HALF_LENGTH_M + rig.behindRearM;
    const wall = wallBehind(mToFt(backM) - 2, 40);
    const game = landscape(view, POSE, [wall]);
    const free = landscape(view, POSE, []);
    expect(game.camera.position.z).toBeLessThan(free.camera.position.z);
    expect(pitchDownDeg(game)).toBeCloseTo(pitchDownDeg(free), 6);
  });
});

describe('矮的東西：抬高一點越過去，不拉近', () => {
  test('近距離跟車，車後方停著一台車：鏡頭留在原本的距離、高過那台車的車頂，視角不變', () => {
    // 那台車的車頭離玩家的車尾 3 ft。
    const parked = parkedCarBehind(mToFt(VEHICLE_CONFIG_SI.lengthM) + 3);
    const game = landscape('chase_near', POSE, [parked]);
    const free = landscape('chase_near', POSE, []);
    const rig = GAME_CAMERA_CONFIG.chaseNear;
    const lookAt = new Vector3(0, rig.lookAtHeightM, 0);
    expect(game.camera.position.distanceTo(lookAt)).toBeCloseTo(free.camera.position.distanceTo(lookAt), 6);
    expect(game.camera.position.y).toBeGreaterThan(VEHICLE_CONFIG_SI.heightM + AVOID.clearanceM);
    expect(game.camera.position.y).toBeGreaterThan(free.camera.position.y);
    expect(game.camera.position.y).toBeLessThan(free.camera.position.y + ftToM(6));
    expect(game.camera.fov).toBe(rig.fovDeg);
    // 視線越過那台車：從看向點到鏡頭這一段沒有被擋。
    expect(clearFraction(lookAt, game.camera.position, [parked], ftToM(0.5))).toBe(1);
  });

  test('高牆不越：遠距離跟車不會抬到牆頂上方去看屋頂', () => {
    // 19.8 ft 的牆比遠距鏡頭（22 ft）矮：抬 15° 以內就越得過去，但它不是矮的東西。
    const wall = wallBehind(mToFt(HALF_LENGTH_M) + 12, 19.8);
    const { camera } = landscape('chase_far', POSE, [wall]);
    expect(camera.position.z).toBeLessThan(ftToM(mToFt(HALF_LENGTH_M) + 12));
    expect(pointInBox({ x: camera.position.x, y: 1, z: camera.position.z }, wall)).toBe(false);
  });
});

describe('resolveChasePlacement', () => {
  const lens = GAME_CAMERA_CONFIG.chaseFar;
  const pivot = { x: 0, y: lens.lookAtHeightM, z: 0 };
  const ideal = { x: 0, y: lens.heightM, z: HALF_LENGTH_M + lens.behindRearM };

  test('沒有擋塊、或擋塊不在路上：位置就是理想位置，視角是鏡片原本的', () => {
    const out = new Vector3();
    expect(resolveChasePlacement(pivot, ideal, lens, [], LANDSCAPE, out)).toBe(lens.fovDeg);
    expect(out.toArray()).toEqual([ideal.x, ideal.y, ideal.z]);
    const aside = sightBox(occluderBox({ x: 30, y: 5, z: 5 }, { x: 4, y: 10, z: 4 }));
    expect(resolveChasePlacement(pivot, ideal, lens, [aside], LANDSCAPE, out)).toBe(lens.fovDeg);
    expect(out.toArray()).toEqual([ideal.x, ideal.y, ideal.z]);
  });

  test('頭上、後面都有東西（車庫）：怎麼抬都不夠遠，就用伸得最遠的那個位置，仍然不在擋塊裡', () => {
    const back = wallBehind(mToFt(HALF_LENGTH_M) + 2, 30);
    const ceiling = sightBox(
      occluderBox({ x: 0, y: ftToM(10), z: 0 }, { x: ftToM(60), y: ftToM(2), z: ftToM(80) }),
    );
    const out = new Vector3();
    const fov = resolveChasePlacement(pivot, ideal, lens, [back, ceiling], LANDSCAPE, out);
    expect(fov).toBeCloseTo(AVOID.squeezedFovDeg, 6);
    expect(out.y).toBeLessThan(ftToM(9) - AVOID.clearanceM + 1e-6);
    expect(out.y).toBeGreaterThanOrEqual(pivot.y);
    expect(pointInBox(out, back, ftToM(0.5))).toBe(false);
    expect(pointInBox(out, ceiling, ftToM(0.5))).toBe(false);
  });

  test('最近距離：橫式是鏡片自己的 tightDistanceM，直式要更遠', () => {
    expect(tightDistanceM(lens, LANDSCAPE)).toBe(lens.tightDistanceM);
    expect(tightDistanceM(lens, PORTRAIT)).toBeGreaterThan(lens.tightDistanceM + ftToM(3));
  });
});

describe('就位與平滑', () => {
  const faceFt = mToFt(HALF_LENGTH_M) + 2.5;
  const wall = wallBehind(faceFt, 26);

  test.each(CHASE_VIEWS)('%s：一建立就在避讓後的位置；第一幀（dt = 0）、重來、換模式都不滑動', (view) => {
    const game = landscape(view, POSE, [wall]);
    const placed = game.camera.position.clone();
    expect(placed.z).toBeLessThan(ftToM(faceFt));

    game.update(POSE, 0, 0);
    expect(game.camera.position.toArray()).toEqual(placed.toArray());
    game.update(POSE, 0, FRAME_SECONDS);
    expect(game.camera.position.distanceTo(placed)).toBeLessThan(1e-9);

    // 開到空曠的地方再重來：直接回到開場的位置。
    const away: VehiclePose = { x: ftToM(200), z: ftToM(-300), headingRad: degToRad(90), steerRad: 0 };
    for (let frame = 0; frame < 120; frame += 1) {
      game.update(away, mphToMps(10), FRAME_SECONDS);
    }
    expect(game.camera.fov).toBe(RIGS[view].fovDeg);
    game.snapTo(POSE);
    expect(game.camera.position.distanceTo(placed)).toBeLessThan(1e-9);
    expect(game.camera.fov).toBeCloseTo(AVOID.squeezedFovDeg, 0);

    // 換到駕駛座再換回來：鏡片先回到原本的視角，換回來立刻又是避讓後的位置。
    game.setView('cockpit');
    expect(game.camera.fov).toBe(GAME_CAMERA_CONFIG.cockpit.fovDeg);
    game.setView(view);
    expect(game.camera.position.distanceTo(placed)).toBeLessThan(1e-9);
    expect(game.camera.fov).toBeCloseTo(AVOID.squeezedFovDeg, 0);
  });

  test('畫面的長寬比變了（轉成直式）：下一幀直接就位，不慢慢滑過去', () => {
    const game = landscape('chase_far', POSE, [wall]);
    const expected = createGameCamera('chase_far', POSE, [wall]);
    expected.camera.aspect = PORTRAIT;
    expected.snapTo(POSE);

    game.camera.aspect = PORTRAIT;
    game.update(POSE, 0, FRAME_SECONDS);
    expect(game.camera.position.distanceTo(expected.camera.position)).toBeLessThan(1e-9);
  });

  test.each(CHASE_VIEWS)('%s：往牆倒過去，每一幀鏡頭都在牆的前面；開走之後慢慢回到原本的擺位', (view) => {
    // 牆面在車後方 60 ft；車以 6 mph 直線倒車到離牆 1 ft，再往前開走。
    const back = wallBehind(60, 26);
    const game = landscape(view, POSE, [back]);
    const free = landscape(view, POSE, []);
    expect(game.camera.position.toArray()).toEqual(free.camera.position.toArray());

    const speedMps = mphToMps(6);
    let z = 0;
    const stopZ = ftToM(60 - 1) - HALF_LENGTH_M;
    let previous = game.camera.position.clone();
    let largestStepM = 0;
    while (z < stopZ) {
      z = Math.min(z + speedMps * FRAME_SECONDS, stopZ);
      game.update({ ...POSE, z }, -speedMps, FRAME_SECONDS);
      expect(pointInBox(game.camera.position, back, ftToM(0.5))).toBe(false);
      largestStepM = Math.max(largestStepM, game.camera.position.distanceTo(previous));
      previous = game.camera.position.clone();
    }
    // 牆是慢慢靠近的：鏡頭跟著慢慢拉近、抬高，沒有哪一幀突然跳一大段。
    expect(largestStepM).toBeLessThan(ftToM(1.5));
    expect(game.camera.fov).toBeGreaterThan(RIGS[view].fovDeg + 5);

    while (z > 0) {
      z = Math.max(z - speedMps * FRAME_SECONDS, 0);
      game.update({ ...POSE, z }, speedMps, FRAME_SECONDS);
    }
    for (let frame = 0; frame < 180; frame += 1) {
      game.update(POSE, 0, FRAME_SECONDS);
      free.update(POSE, 0, FRAME_SECONDS);
    }
    expect(game.camera.position.distanceTo(free.camera.position)).toBeLessThan(1e-6);
    expect(game.camera.fov).toBe(RIGS[view].fovDeg);
  });

  test('車貼著旁邊的牆開：鏡頭照常在車尾後方，不被旁邊的牆影響', () => {
    // 牆面在車身右側外 0.5 ft，與車平行。
    const side = sightBox(
      occluderBox(
        { x: VEHICLE_CONFIG_SI.widthM / 2 + ftToM(0.5) + ftToM(10), y: ftToM(13), z: 0 },
        { x: ftToM(20), y: ftToM(26), z: ftToM(200) },
      ),
    );
    const game = landscape('chase_near', POSE, [side]);
    const free = landscape('chase_near', POSE, []);
    expect(game.camera.position.toArray()).toEqual(free.camera.position.toArray());
  });
});

describe('鏡頭快照 cameraSnapshot', () => {
  test('跟車：位置換成英尺，車身中心在畫面裡；引擎蓋：車身中心在鏡頭後面', () => {
    const pose: VehiclePose = { x: ftToM(10), z: ftToM(-20), headingRad: 0, steerRad: 0 };
    const chase = landscape('chase_far', pose, []);
    const snapshot = cameraSnapshot(chase, pose);
    const ahead = forward(pose.headingRad);
    expect(snapshot.view).toBe('chase_far');
    expect(snapshot.xFt).toBeCloseTo(10 - ahead.x * 37.5, 6);
    expect(snapshot.yFt).toBeCloseTo(22, 6);
    expect(snapshot.zFt).toBeCloseTo(-20 - ahead.z * 37.5, 6);
    expect(snapshot.fovDeg).toBe(GAME_CAMERA_CONFIG.chaseFar.fovDeg);
    expect(Math.abs(snapshot.carScreen?.x ?? 9)).toBeLessThan(0.01);
    expect(Math.abs(snapshot.carScreen?.y ?? 9)).toBeLessThan(0.2);

    const hood = createGameCamera('hood', pose);
    expect(cameraSnapshot(hood, pose).carScreen).toBeNull();
  });
});
