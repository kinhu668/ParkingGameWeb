// 跟車鏡頭的擋塊：場景裡實心的東西（樓、牆、停著的車、子母車、巷子兩旁的整棟建築…）各用一塊方塊代表，
// 鏡頭不能跑到它裡面、屋頂上或後面（render/gameCamera.ts 用這裡的 clearFraction 把鏡頭拉回來）。
// 方塊來自擺設自己的登記（props/occluders.ts），所以每一關、每一種環境都適用，不必為哪一關另外寫。
// 細桿、薄片與標成 passable 的（路燈、樹）不算擋塊：掃過一根燈桿就把鏡頭拉近再放開，畫面會抽動；它們交給遮擋半透明。
import { Matrix4, Vector3, type Object3D } from 'three';
import { cameraBlockerBoxesOf, occludersOf } from '../props/occluders';
import { sightBox, type Point3, type SightBox } from './occlusionFade';
import { GAME_CAMERA_CONFIG } from './renderConfig';

const CONFIG = GAME_CAMERA_CONFIG.avoidance;

/** 佔地夠大才擋鏡頭（細桿與薄片不擋）。 */
function blocksCamera(box: SightBox): boolean {
  return box.size.x * box.size.z >= CONFIG.minFootprintM2;
}

/**
 * 收集 root 底下所有的擋塊（世界座標）。要在場景組好、擺設都就位之後才呼叫。
 */
export function collectCameraBlockers(root: Object3D): readonly SightBox[] {
  root.updateMatrixWorld(true);
  const blockers: SightBox[] = [];
  const add = (owner: Object3D, local: Matrix4): void => {
    const box = sightBox(new Matrix4().multiplyMatrices(owner.matrixWorld, local));
    if (blocksCamera(box)) {
      blockers.push(box);
    }
  };
  root.traverse((object) => {
    for (const occluder of occludersOf(object)) {
      if (occluder.passable !== true) {
        for (const box of occluder.boxes) {
          add(object, box);
        }
      }
    }
    for (const box of cameraBlockerBoxesOf(object)) {
      add(object, box);
    }
  });
  return blockers;
}

const localFrom = new Vector3();
const localTo = new Vector3();

/**
 * 線段 from → to 從全程的幾分之幾開始進到方塊（往外擴 marginM）裡面；沒碰到是 1。
 * 起點已經在方塊裡面的回傳 0。
 */
function entryFraction(from: Point3, to: Point3, box: SightBox, marginM: number): number {
  localFrom.set(from.x, from.y, from.z).applyMatrix4(box.inverse);
  localTo.set(to.x, to.y, to.z).applyMatrix4(box.inverse);
  const starts = [localFrom.x, localFrom.y, localFrom.z];
  const ends = [localTo.x, localTo.y, localTo.z];
  const half = [
    0.5 + marginM / box.size.x,
    0.5 + marginM / box.size.y,
    0.5 + marginM / box.size.z,
  ];
  let enter = 0;
  let leave = 1;
  for (let axis = 0; axis < 3; axis += 1) {
    const start = starts[axis] ?? 0;
    const delta = (ends[axis] ?? 0) - start;
    const limit = half[axis] ?? 0.5;
    if (Math.abs(delta) < 1e-12) {
      if (Math.abs(start) > limit) {
        return 1;
      }
      continue;
    }
    const a = (-limit - start) / delta;
    const b = (limit - start) / delta;
    enter = Math.max(enter, Math.min(a, b));
    leave = Math.min(leave, Math.max(a, b));
    if (enter > leave) {
      return 1;
    }
  }
  return enter;
}

/** 沿一段路最先碰到的擋塊。 */
export interface BlockerHit {
  /** 最遠能走到全程的幾分之幾（0–1）；1 = 全程暢通。 */
  readonly fraction: number;
  /** 擋住的那一塊；全程暢通是 undefined。 */
  readonly blocker: SightBox | undefined;
}

/**
 * 從 from 往 to 走，離每一塊擋塊都至少 marginM，最遠能走到全程的幾分之幾，以及是哪一塊擋住的。
 * 等於拿一顆半徑 marginM 的球沿線段掃過去（方塊往外擴 marginM，轉角略保守）。
 * 起點已經貼著或在某一塊裡面的那一塊不算：車貼著牆（或卡進障礙物）時，不能把鏡頭壓回車身裡。
 */
export function firstBlocker(
  from: Point3,
  to: Point3,
  blockers: readonly SightBox[],
  marginM: number,
): BlockerHit {
  const middleX = (from.x + to.x) / 2;
  const middleY = (from.y + to.y) / 2;
  const middleZ = (from.z + to.z) / 2;
  // 外擴後的方塊，外接球最多大 √3 × marginM：多留兩倍，寧可多細算幾塊。
  const reachM = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) / 2 + 2 * marginM;
  let fraction = 1;
  let blocker: SightBox | undefined;
  for (const box of blockers) {
    // 粗篩：方塊的外接球碰不到這一段路的就不必細算（絕大多數都在這裡篩掉）。
    if (
      Math.hypot(box.center.x - middleX, box.center.y - middleY, box.center.z - middleZ) >
      reachM + box.radiusM
    ) {
      continue;
    }
    const entry = entryFraction(from, to, box, marginM);
    if (entry > 0 && entry < fraction) {
      fraction = entry;
      blocker = box;
    }
  }
  return { fraction, blocker };
}

/** firstBlocker 只要比例的版本：從 from 往 to 最遠能走到全程的幾分之幾（0–1）；1 = 全程暢通。 */
export function clearFraction(
  from: Point3,
  to: Point3,
  blockers: readonly SightBox[],
  marginM: number,
): number {
  return firstBlocker(from, to, blockers, marginM).fraction;
}

/** 擋塊的頂面高度（公尺）。擋塊都是直立的（只繞 Y 轉）。 */
export function blockerTopM(box: SightBox): number {
  return box.center.y + box.size.y / 2;
}
