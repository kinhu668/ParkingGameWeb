// 一般遊戲的鏡頭（按 V 循環）：近／遠距離跟車、引擎蓋、駕駛座、俯視，共用同一個 PerspectiveCamera。
// - 跟車：鏡頭在「平滑朝向」的車尾後方，位置與看向點做指數平滑。
// - 引擎蓋、駕駛座：貼在車身上，跟著車的位置與朝向走，不做平滑（落後就會埋進車殼）。
// - 俯視：車正上方垂直往下看，畫面上方固定是北（−Z）。
// `?cam=` 的固定鏡頭在 followCamera.ts，與這裡無關。
import { PerspectiveCamera, Vector3 } from 'three';
import type { GameCameraView } from '../core/cameraView';
import { forward, headingDelta, normalizeHeading, right } from '../core/heading';
import type { VehiclePose } from '../vehicle/bicycleModel';
import { VEHICLE_CONFIG_SI } from '../vehicle/vehicleConfig';
import { smoothingFactor } from './followCamera';
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
interface ChaseRig {
  readonly behindRearM: number;
  readonly heightM: number;
  readonly lookAtHeightM: number;
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

/** 建立鏡頭，一開始就在 initialView 對準 initialPose 的位置。 */
export function createGameCamera(
  initialView: GameCameraView,
  initialPose: VehiclePose,
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
    camera.position.copy(chasePosition);
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
    camera.fov = lens.fovDeg;
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
      place(dtSeconds);
    },
    snapTo(nextPose) {
      pose = nextPose;
      chaseHeadingRad = nextPose.headingRad;
      place();
    },
  };
}
