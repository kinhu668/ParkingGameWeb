// 一般遊戲的鏡頭（按 V 循環）：近／遠距離跟車、引擎蓋、駕駛座、俯視，共用同一個 PerspectiveCamera。
// - 跟車：鏡頭在「平滑朝向」的車尾後方，位置與看向點做指數平滑。實心的東西（樓、牆、停著的車…）擋住時
//   沿「看向點 → 鏡頭」這根桿子拉近，太近就抬高仰角、拉寬視角（resolveChasePlacement）；開場、重來、換模式都直接就位。
// - 引擎蓋、駕駛座：貼在車身上，跟著車的位置與朝向走，不做平滑（落後就會埋進車殼）。
// - 俯視：車正上方垂直往下看，畫面上方固定是北（−Z）。
// `?cam=` 的固定鏡頭在 followCamera.ts，與這裡無關。
import { PerspectiveCamera, Vector3 } from 'three';
import type { GameCameraView } from '../core/cameraView';
import { forward, headingDelta, normalizeHeading, right } from '../core/heading';
import { degToRad, mToFt } from '../core/units';
import type { VehiclePose } from '../vehicle/bicycleModel';
import { VEHICLE_CONFIG_SI } from '../vehicle/vehicleConfig';
import { blockerTopM, clearFraction, firstBlocker } from './cameraBlockers';
import { smoothingFactor } from './followCamera';
import type { Point3, SightBox } from './occlusionFade';
import { GAME_CAMERA_CONFIG as CONFIG } from './renderConfig';

const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;

/** 每個模式的鏡片：垂直視角與近平面。 */
const LENSES: Readonly<Record<GameCameraView, { readonly fovDeg: number; readonly nearM: number }>> = {
  chase_near: CONFIG.chaseNear,
  chase_far: CONFIG.chaseFar,
  hood: CONFIG.hood,
  cockpit: CONFIG.cockpit,
  top: CONFIG.top,
};

/** 跟車鏡頭的擺位。 */
interface ChaseRig extends ChaseLens {
  readonly behindRearM: number;
  readonly heightM: number;
  readonly lookAtHeightM: number;
}

/** 跟車鏡頭被擋住時要用到的鏡片數值。 */
export interface ChaseLens {
  /** 沒被擋時的垂直視角（度）。 */
  readonly fovDeg: number;
  /** 被擋住時鏡頭離看向點至少這麼遠（公尺）；不夠就抬高仰角換取距離。 */
  readonly tightDistanceM: number;
}

const AVOID = CONFIG.avoidance;
/** 找到「剛好夠遠」的仰角之後，再對半逼近幾次（牆慢慢靠近時鏡頭才不會一格一格跳）。 */
const ELEVATION_REFINE_STEPS = 5;
/** 避讓的位移小於這個（公尺）、又沒有東西擋著，就當作已經回到理想位置。 */
const AVOID_SETTLED_M = 1e-3;
/** 視角離目標不到這麼多（度）就直接到位。 */
const FOV_SETTLED_DEG = 0.01;

const boomEnd = new Vector3();

/**
 * 被擋住時鏡頭離看向點至少要多遠（公尺）：鏡片自己的 tightDistanceM，或「車身的寬度不超過畫面寬度的
 * maxCarWidthFraction」所需的距離，取大的。畫面越窄（直式手機）要離得越遠。
 * @param aspect 畫面的長寬比（寬 ÷ 高）
 */
export function tightDistanceM(lens: ChaseLens, aspect: number): number {
  const frameWidthPerM =
    2 * Math.tan(degToRad(Math.max(lens.fovDeg, AVOID.squeezedFovDeg)) / 2) * aspect;
  return Math.max(
    lens.tightDistanceM,
    VEHICLE_CONFIG_SI.widthM / (AVOID.maxCarWidthFraction * frameWidthPerM),
  );
}

/**
 * 跟車鏡頭該擺在哪裡：理想位置 ideal 沒被擋就是它；被擋塊擋住（或落在擋塊裡面、屋頂上）時，
 * 沿「pivot → ideal」這根桿子拉近到擋塊前面；拉近後離 pivot 不到 tightDistanceM()（車快塞滿畫面）就把桿子往上抬，
 * 找最低的、夠遠的仰角——鏡頭在車的後上方往下看。怎麼抬都不夠遠（頭上也有東西）就用最遠的那一個。
 * 鏡頭之後一律看向 pivot，所以位置變了俯仰跟著變，不會位置拉近了還用原本的角度盯著地面。
 * @param pivot 鏡頭看向的點（車身中心上方）
 * @param ideal 沒有東西擋時鏡頭的位置
 * @param aspect 畫面的長寬比（寬 ÷ 高）
 * @param out 寫入鏡頭該去的位置
 * @returns 垂直視角（度）：離 pivot 越近越寬，近看時整台車與前面的路才裝得進畫面
 */
export function resolveChasePlacement(
  pivot: Point3,
  ideal: Point3,
  lens: ChaseLens,
  blockers: readonly SightBox[],
  aspect: number,
  out: Vector3,
): number {
  const boomX = ideal.x - pivot.x;
  const boomY = ideal.y - pivot.y;
  const boomZ = ideal.z - pivot.z;
  const lengthM = Math.hypot(boomX, boomY, boomZ);
  const hit = firstBlocker(pivot, ideal, blockers, AVOID.clearanceM);
  const clear = hit.fraction;
  if (hit.blocker === undefined || lengthM < 1e-9) {
    out.set(ideal.x, ideal.y, ideal.z);
    return lens.fovDeg;
  }

  const levelM = Math.hypot(boomX, boomZ);
  const needM = Math.min(lengthM, tightDistanceM(lens, aspect));
  const idealRad = Math.atan2(boomY, levelM);
  let elevationRad = idealRad;
  let reachM = clear * lengthM;
  // 桿子幾乎垂直時沒有「後方」可言：只拉近，不抬。
  if (levelM > 1e-9) {
    const backX = boomX / levelM;
    const backZ = boomZ / levelM;
    /** 桿子抬到這個仰角時，鏡頭最遠能離 pivot 多遠（不超過原本的長度）。 */
    const reachAt = (angleRad: number): number => {
      const level = Math.cos(angleRad) * lengthM;
      boomEnd.set(pivot.x + backX * level, pivot.y + Math.sin(angleRad) * lengthM, pivot.z + backZ * level);
      return clearFraction(pivot, boomEnd, blockers, AVOID.clearanceM) * lengthM;
    };
    /**
     * 從 fromRad 往上找（最高到 limitRad）第一個伸得到 targetM 的仰角，再往下對半逼近，取最低的那一個。
     * 找到就更新 elevationRad／reachM 並回傳 true；找不到時 elevationRad／reachM 留在沿路伸得最遠的那一個。
     */
    const liftUntil = (fromRad: number, limitRad: number, targetM: number): boolean => {
      let tooLowRad = fromRad;
      for (
        let angleRad = fromRad + AVOID.elevationStepRad;
        angleRad <= limitRad;
        angleRad += AVOID.elevationStepRad
      ) {
        const candidateM = reachAt(angleRad);
        if (candidateM >= targetM) {
          let enoughRad = angleRad;
          let enoughM = candidateM;
          for (let step = 0; step < ELEVATION_REFINE_STEPS; step += 1) {
            const middleRad = (tooLowRad + enoughRad) / 2;
            const middleM = reachAt(middleRad);
            if (middleM >= targetM) {
              enoughRad = middleRad;
              enoughM = middleM;
            } else {
              tooLowRad = middleRad;
            }
          }
          elevationRad = enoughRad;
          reachM = enoughM;
          return true;
        }
        if (candidateM > reachM) {
          elevationRad = angleRad;
          reachM = candidateM;
        }
        tooLowRad = angleRad;
      }
      return false;
    };
    // 1. 擋住的是矮的東西（停著的車、矮牆），抬高一點就能整根越過去：留在原本的距離，只是高一點。
    const liftLimitRad = Math.min(idealRad + AVOID.clearLiftRad, AVOID.maxElevationRad);
    const startReachM = reachM;
    const low = blockerTopM(hit.blocker) <= AVOID.clearLiftMaxTopM;
    if (!low || !liftUntil(idealRad, liftLimitRad, lengthM)) {
      // 2. 越不過去（樓、高牆）：沿原本的方向拉近；太近了才繼續往上抬，找最低的、夠遠的仰角。
      elevationRad = idealRad;
      reachM = startReachM;
      if (reachM < needM) {
        liftUntil(idealRad, AVOID.maxElevationRad, needM);
      }
    }
    const level = Math.cos(elevationRad) * reachM;
    out.set(pivot.x + backX * level, pivot.y + Math.sin(elevationRad) * reachM, pivot.z + backZ * level);
  } else {
    out.set(pivot.x + boomX * clear, pivot.y + boomY * clear, pivot.z + boomZ * clear);
  }

  // 越近越寬：從 widenFromM 開始拉寬，到最近距離 needM 時是 squeezedFovDeg。
  const widenFromM = Math.min(lengthM, needM * AVOID.widenFromRatio);
  const widen =
    widenFromM - needM > 1e-9
      ? Math.min(Math.max((widenFromM - reachM) / (widenFromM - needM), 0), 1)
      : 1;
  return lens.fovDeg + Math.max(AVOID.squeezedFovDeg - lens.fovDeg, 0) * widen;
}

/** 貼在車身上的鏡頭：相對車身中心的位置（右、上、前）與往下俯的角度。 */
interface CarMount {
  readonly lateralM: number;
  readonly heightM: number;
  readonly aheadM: number;
  readonly pitchDownRad: number;
}

/**
 * 跟車鏡頭的平滑朝向走一幀。鏡頭在這個朝向的車尾後方。
 * - 前進（快過門檻）：追車頭，轉彎時略為落後。
 * - 倒車（快過門檻）：極慢地跟。追的是車頭方向而不是行進方向，所以不會翻到車頭前面。
 * - 幾乎靜止：不動。
 */
export function nextChaseHeading(
  chaseHeadingRad: number,
  vehicleHeadingRad: number,
  speedMps: number,
  dtSeconds: number,
): number {
  if (Math.abs(speedMps) <= CONFIG.headingFollowSpeedMps) {
    return chaseHeadingRad;
  }
  const timeConstantS =
    speedMps > 0 ? CONFIG.headingTimeConstantS : CONFIG.reverseHeadingTimeConstantS;
  // 走最短弧：跨過 0°／360° 也不會繞一整圈。
  const turnRad = headingDelta(chaseHeadingRad, vehicleHeadingRad);
  return normalizeHeading(chaseHeadingRad + turnRad * smoothingFactor(dtSeconds, timeConstantS));
}

export interface GameCamera {
  readonly camera: PerspectiveCamera;
  /** 目前的模式。 */
  view(): GameCameraView;
  /** 換模式：立刻換鏡片並擺到新位置，不從舊位置滑過去。 */
  setView(view: GameCameraView): void;
  /** 每個畫面幀呼叫。speedMps 前進為正、倒車為負。 */
  update(pose: VehiclePose, speedMps: number, dtSeconds: number): void;
  /** 車被搬到別處（重來）：鏡頭直接就位，平滑朝向重設成車頭方向。 */
  snapTo(pose: VehiclePose): void;
}

/** 鏡頭目前的狀態（唯讀；e2e 與除錯用）。 */
export interface CameraSnapshot {
  readonly view: GameCameraView;
  /** 鏡頭的位置（英尺，世界座標；yFt 是離地高度）。 */
  readonly xFt: number;
  readonly yFt: number;
  readonly zFt: number;
  /** 目前的垂直視角（度）；跟車鏡頭被擠近時比平常寬。 */
  readonly fovDeg: number;
  /**
   * 車身中心（半個車高）在畫面上的位置：x、y 都在 [−1, 1] 內就是在畫面裡（−1 是左／下緣）。
   * 在鏡頭後面是 null（引擎蓋的視點在車身中心前面）。
   */
  readonly carScreen: { readonly x: number; readonly y: number } | null;
}

const snapshotPoint = new Vector3();

/** 讀出鏡頭目前的狀態。pose 是這一幀車的算圖姿態。 */
export function cameraSnapshot(gameCamera: GameCamera, pose: VehiclePose): CameraSnapshot {
  const { camera } = gameCamera;
  camera.updateMatrixWorld(true);
  snapshotPoint.set(pose.x, VEHICLE_CONFIG_SI.heightM / 2, pose.z);
  const inFront =
    snapshotPoint.clone().applyMatrix4(camera.matrixWorldInverse).z < -camera.near;
  const screen = snapshotPoint.project(camera);
  return {
    view: gameCamera.view(),
    xFt: mToFt(camera.position.x),
    yFt: mToFt(camera.position.y),
    zFt: mToFt(camera.position.z),
    fovDeg: camera.fov,
    carScreen: inFront ? { x: screen.x, y: screen.y } : null,
  };
}

/**
 * 建立鏡頭，一開始就在 initialView 對準 initialPose 的位置（已經避開擋塊，不是從別處滑過來）。
 * @param blockers 跟車鏡頭要避開的擋塊（cameraBlockers.ts 的 collectCameraBlockers）；不給 = 空地，鏡頭照固定的擺位走
 */
export function createGameCamera(
  initialView: GameCameraView,
  initialPose: VehiclePose,
  blockers: readonly SightBox[] = [],
): GameCamera {
  // 視角與近平面由 applyLens 依模式設定；長寬比由 fitRendererToCanvas 依畫布大小設定。
  const camera = new PerspectiveCamera();
  camera.far = CONFIG.farM;

  let view = initialView;
  let pose = initialPose;
  let chaseHeadingRad = initialPose.headingRad;
  /** 跟車鏡頭平滑後的位置與看向點。 */
  const chasePosition = new Vector3();
  const chaseLookAt = new Vector3();
  const desiredPosition = new Vector3();
  const desiredLookAt = new Vector3();
  /** 避讓：鏡頭實際的位置相對 chasePosition 的位移；沒被擋時是零，鏡頭就在 chasePosition。 */
  const avoidOffset = new Vector3();
  const avoidTarget = new Vector3();
  /** 目前的垂直視角（度）；跟車鏡頭被擠近時比鏡片原本的寬。 */
  let fovDeg = LENSES[initialView].fovDeg;
  /** 上一次擺位時畫面的長寬比：變了（第一次畫、轉向、改視窗大小）就重新就位，不慢慢滑過去。 */
  let placedAspect = camera.aspect;

  /** 視角往 targetDeg 靠近；dtSeconds 不給 = 直接到位。 */
  function setFov(targetDeg: number, dtSeconds: number | undefined): void {
    const next =
      dtSeconds === undefined
        ? targetDeg
        : fovDeg + (targetDeg - fovDeg) * smoothingFactor(dtSeconds, AVOID.timeConstantS);
    fovDeg = Math.abs(next - targetDeg) < FOV_SETTLED_DEG ? targetDeg : next;
    if (camera.fov !== fovDeg) {
      camera.fov = fovDeg;
      camera.updateProjectionMatrix();
    }
  }

  function placeChase(rig: ChaseRig, dtSeconds: number | undefined): void {
    const ahead = forward(chaseHeadingRad);
    const backM = HALF_LENGTH_M + rig.behindRearM;
    desiredPosition.set(pose.x - ahead.x * backM, rig.heightM, pose.z - ahead.z * backM);
    desiredLookAt.set(pose.x, rig.lookAtHeightM, pose.z);
    if (dtSeconds === undefined) {
      chasePosition.copy(desiredPosition);
      chaseLookAt.copy(desiredLookAt);
    } else {
      chasePosition.lerp(desiredPosition, smoothingFactor(dtSeconds, CONFIG.positionTimeConstantS));
      chaseLookAt.lerp(desiredLookAt, smoothingFactor(dtSeconds, CONFIG.lookAtTimeConstantS));
    }
    // 避讓：chasePosition 被擋住時鏡頭改去 avoidTarget。位移（相對 chasePosition）做平滑：擋塊讓開之後鏡頭慢慢回去，
    // 擋塊進出視線時也不會瞬間跳一大段。
    const fovTargetDeg = resolveChasePlacement(
      chaseLookAt,
      chasePosition,
      rig,
      blockers,
      camera.aspect,
      avoidTarget,
    );
    avoidTarget.sub(chasePosition);
    if (dtSeconds === undefined) {
      avoidOffset.copy(avoidTarget);
    } else {
      avoidOffset.lerp(avoidTarget, smoothingFactor(dtSeconds, AVOID.timeConstantS));
      if (avoidTarget.lengthSq() === 0 && avoidOffset.lengthSq() < AVOID_SETTLED_M * AVOID_SETTLED_M) {
        avoidOffset.set(0, 0, 0);
      }
    }
    camera.position.copy(chasePosition).add(avoidOffset);
    // 平滑到一半的位置可能被擋住（牆正在逼近而鏡頭還沒讓開、桿子剛擦到旁邊那台車的車頂、剛繞過牆角）。
    // 這時有兩個一定沒被擋的位置：avoidTarget，或是沿「看向點 → 鏡頭」把這個位置拉回擋塊前面；取離它近的那一個，
    // 跳動最小。所以鏡頭任何一幀都不在擋塊裡、也不隔著擋塊看車。
    const clear = clearFraction(chaseLookAt, camera.position, blockers, AVOID.clearanceM);
    if (clear < 1) {
      const pulledBackM = (1 - clear) * camera.position.distanceTo(chaseLookAt);
      avoidTarget.add(chasePosition);
      if (pulledBackM < camera.position.distanceTo(avoidTarget)) {
        camera.position.lerpVectors(chaseLookAt, camera.position, clear);
      } else {
        camera.position.copy(avoidTarget);
      }
      avoidOffset.subVectors(camera.position, chasePosition);
    }
    setFov(fovTargetDeg, dtSeconds);
    camera.lookAt(chaseLookAt);
  }

  function placeMounted(mount: CarMount): void {
    const ahead = forward(pose.headingRad);
    const side = right(pose.headingRad);
    camera.position.set(
      pose.x + side.x * mount.lateralM + ahead.x * mount.aheadM,
      mount.heightM,
      pose.z + side.z * mount.lateralM + ahead.z * mount.aheadM,
    );
    // 視線：沿車頭水平向前，再往下俯 pitchDownRad。
    const levelM = Math.cos(mount.pitchDownRad);
    camera.lookAt(
      camera.position.x + ahead.x * levelM,
      camera.position.y - Math.sin(mount.pitchDownRad),
      camera.position.z + ahead.z * levelM,
    );
  }

  /**
   * 把鏡頭擺到目前模式的位置。dtSeconds 只有跟車模式用：這一幀平滑多少；
   * 不給 = 直接就位（換模式、重來）。
   */
  function place(dtSeconds?: number): void {
    placedAspect = camera.aspect;
    switch (view) {
      case 'chase_near':
        placeChase(CONFIG.chaseNear, dtSeconds);
        break;
      case 'chase_far':
        placeChase(CONFIG.chaseFar, dtSeconds);
        break;
      case 'hood':
        placeMounted(CONFIG.hood);
        break;
      case 'cockpit':
        placeMounted(CONFIG.cockpit);
        break;
      case 'top':
        camera.position.set(pose.x, CONFIG.top.heightM, pose.z);
        camera.lookAt(pose.x, 0, pose.z);
        break;
    }
  }

  function applyLens(): void {
    const lens = LENSES[view];
    fovDeg = lens.fovDeg;
    camera.fov = fovDeg;
    camera.near = lens.nearM;
    camera.updateProjectionMatrix();
    // 垂直往下看時視線與預設的「上」（+Y）平行，lookAt 算不出畫面朝向，俯視改用北方當畫面上方；
    // 其他模式一定要換回 +Y，否則 lookAt 會把畫面轉歪。
    if (view === 'top') {
      camera.up.set(0, 0, -1);
    } else {
      camera.up.set(0, 1, 0);
    }
  }

  applyLens();
  place();

  return {
    camera,
    view: () => view,
    setView(nextView) {
      view = nextView;
      applyLens();
      place();
    },
    update(nextPose, speedMps, dtSeconds) {
      pose = nextPose;
      // 不論哪個模式都更新平滑朝向，切回跟車時鏡頭已經在合理的方位。
      chaseHeadingRad = nextChaseHeading(chaseHeadingRad, pose.headingRad, speedMps, dtSeconds);
      // 避讓的擺位看畫面的長寬比（直式要離得更遠）；長寬比變了就直接就位。
      place(camera.aspect === placedAspect ? dtSeconds : undefined);
    },
    snapTo(nextPose) {
      pose = nextPose;
      chaseHeadingRad = nextPose.headingRad;
      place();
    },
  };
}
