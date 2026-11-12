// 跟車鏡頭的遮擋半透明：擋在鏡頭與玩家車之間的擺設淡成半透明，不擋了再淡回來。
// 判定：從鏡頭到車身上幾個點各拉一條線段，線段穿過某樣擺設的佔地方塊（往外擴一點）就算擋住；
// 線段到車身為止，所以車後面（更遠處）的建築不會被淡掉。鏡頭貼在擺設旁邊或裡面時也算。
// 做法：InstancedMesh 沒辦法只讓一個實例半透明，所以把那個實例縮成零（藏起來），原地放一個
// 同幾何、半透明材質的替身；恢復時把實例的矩陣放回去、替身藏起來。沒有東西被擋時場景與原本完全相同。
import {
  Color,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import { forward, right } from '../core/heading';
import { occludersOf, type Occluder, type OccluderPart } from '../props/occluders';
import type { VehiclePose } from '../vehicle/bicycleModel';
import { VEHICLE_CONFIG_SI } from '../vehicle/vehicleConfig';
import { SKIP_AMBIENT_OCCLUSION } from './ambientOcclusionFlag';
import { OCCLUSION_FADE_CONFIG as CONFIG } from './renderConfig';

/** 空間裡的一個點（公尺）。 */
export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** 一塊佔地方塊，已經換算成方便測試的形式。 */
export interface SightBox {
  /** 世界座標 → 方塊本地（中心在原點、邊長 1）。 */
  readonly inverse: Matrix4;
  /** 方塊三個方向的邊長（公尺）：把「公尺的餘裕」換成本地座標用。 */
  readonly size: Point3;
}

/** 把「單位方塊 → 世界」的矩陣換成 SightBox。 */
export function sightBox(matrix: Matrix4): SightBox {
  const size = new Vector3().setFromMatrixScale(matrix);
  return { inverse: matrix.clone().invert(), size: { x: size.x, y: size.y, z: size.z } };
}

const localFrom = new Vector3();
const localTo = new Vector3();

/** 方塊往外擴 marginM 之後，在本地座標三個方向的半邊長。 */
function halfExtents(box: SightBox, marginM: number): readonly [number, number, number] {
  return [
    0.5 + marginM / box.size.x,
    0.5 + marginM / box.size.y,
    0.5 + marginM / box.size.z,
  ];
}

/** 點有沒有在方塊（往外擴 marginM）裡面。 */
export function pointInBox(point: Point3, box: SightBox, marginM = 0): boolean {
  localFrom.set(point.x, point.y, point.z).applyMatrix4(box.inverse);
  const [halfX, halfY, halfZ] = halfExtents(box, marginM);
  return (
    Math.abs(localFrom.x) <= halfX && Math.abs(localFrom.y) <= halfY && Math.abs(localFrom.z) <= halfZ
  );
}

/** 從 from 到 to 的線段有沒有碰到方塊（往外擴 marginM）。只看線段本身，不看兩端之外的延長線。 */
export function segmentHitsBox(from: Point3, to: Point3, box: SightBox, marginM = 0): boolean {
  localFrom.set(from.x, from.y, from.z).applyMatrix4(box.inverse);
  localTo.set(to.x, to.y, to.z).applyMatrix4(box.inverse);
  const half = halfExtents(box, marginM);
  const starts = [localFrom.x, localFrom.y, localFrom.z];
  const ends = [localTo.x, localTo.y, localTo.z];
  // 線段參數 t ∈ [0, 1]；三個方向各切出一段，交集不是空的就是碰到。
  let enter = 0;
  let leave = 1;
  for (let axis = 0; axis < 3; axis += 1) {
    const start = starts[axis] ?? 0;
    const delta = (ends[axis] ?? 0) - start;
    const limit = half[axis] ?? 0.5;
    if (Math.abs(delta) < 1e-12) {
      if (Math.abs(start) > limit) {
        return false;
      }
      continue;
    }
    const a = (-limit - start) / delta;
    const b = (limit - start) / delta;
    enter = Math.max(enter, Math.min(a, b));
    leave = Math.min(leave, Math.max(a, b));
    if (enter > leave) {
      return false;
    }
  }
  return true;
}

/** 視線看向車身上的哪些點：車身中段高度上的 3 × 3 個點（左中右 × 前中後，各往內縮一點）。 */
export function sightTargets(pose: VehiclePose): Point3[] {
  const ahead = forward(pose.headingRad);
  const side = right(pose.headingRad);
  const halfLengthM = (VEHICLE_CONFIG_SI.lengthM / 2) * CONFIG.targetInset;
  const halfWidthM = (VEHICLE_CONFIG_SI.widthM / 2) * CONFIG.targetInset;
  const y = VEHICLE_CONFIG_SI.heightM * CONFIG.targetHeightRatio;
  const targets: Point3[] = [];
  for (const along of [-1, 0, 1]) {
    for (const across of [-1, 0, 1]) {
      targets.push({
        x: pose.x + ahead.x * along * halfLengthM + side.x * across * halfWidthM,
        y,
        z: pose.z + ahead.z * along * halfLengthM + side.z * across * halfWidthM,
      });
    }
  }
  return targets;
}

/**
 * 這塊方塊有沒有擋住鏡頭看車：在鏡頭與車之間（任何一條視線穿過它），或鏡頭貼著它／在它裡面。
 * @param camera 鏡頭位置
 * @param targets sightTargets 算出來的點
 */
export function blocksView(camera: Point3, targets: readonly Point3[], box: SightBox): boolean {
  return (
    pointInBox(camera, box, CONFIG.cameraClearanceM) ||
    targets.some((target) => segmentHitsBox(camera, target, box, CONFIG.sightMarginM))
  );
}

/**
 * 不透明度走一幀：擋住就往 CONFIG.opacity 淡，沒擋就往 1 淡回去；速度固定（全程 fadeSeconds）。
 */
export function nextOpacity(opacity: number, blocked: boolean, dtSeconds: number): number {
  const step = ((1 - CONFIG.opacity) * Math.max(dtSeconds, 0)) / CONFIG.fadeSeconds;
  return blocked ? Math.max(CONFIG.opacity, opacity - step) : Math.min(1, opacity + step);
}

export interface OcclusionFade {
  /** 登記了幾樣會被淡掉的東西。 */
  readonly count: number;
  /**
   * 每個畫面幀呼叫。
   * @param camera 鏡頭位置（世界座標）
   * @param pose 玩家車的算圖姿態
   * @param active 這個鏡頭要不要做遮擋半透明；false 時已經淡掉的會淡回來
   * @param dtSeconds 距離上一幀多久
   */
  update(camera: Point3, pose: VehiclePose, active: boolean, dtSeconds: number): void;
  /** 目前不是完全不透明的有幾樣（測試與除錯用）。 */
  fadedCount(): number;
}

/** 一個實例的替身。 */
interface StandIn {
  readonly part: OccluderPart;
  readonly mesh: Mesh;
  readonly material: Material;
  /** 實例原本的矩陣（藏起來時實例被縮成零）。 */
  readonly original: Matrix4;
}

interface FadeGroup {
  readonly occluder: Occluder;
  readonly boxes: readonly SightBox[];
  opacity: number;
  /** 第一次被擋住時才建立。 */
  standIns: StandIn[] | undefined;
}

const HIDDEN_MATRIX = new Matrix4().makeScale(0, 0, 0);
/** 替身排在其他半透明的東西（光錐、雨絲、車窗）之後畫：後面的東西都畫好了才疊上去。 */
const STAND_IN_RENDER_ORDER = 10;

function singleMaterial(material: Material | Material[]): Material | undefined {
  return Array.isArray(material) ? material[0] : material;
}

function createStandIn(part: OccluderPart): StandIn | undefined {
  const source = singleMaterial(part.mesh.material);
  if (source === undefined) {
    return undefined;
  }
  const material = source.clone();
  material.transparent = true;
  // 實例的顏色乘進替身的材質裡。
  if (
    part.mesh.instanceColor !== null &&
    (material instanceof MeshStandardMaterial || material instanceof MeshBasicMaterial)
  ) {
    const tint = new Color();
    part.mesh.getColorAt(part.index, tint);
    material.color.multiply(tint);
  }
  const original = new Matrix4();
  part.mesh.getMatrixAt(part.index, original);
  const mesh = new Mesh(part.mesh.geometry, material);
  mesh.name = `${part.mesh.name}:faded`;
  mesh.matrixAutoUpdate = false;
  mesh.matrix.copy(original);
  // 影子照舊：東西還在那裡，只是看得穿。
  mesh.castShadow = part.mesh.castShadow;
  mesh.receiveShadow = part.mesh.receiveShadow;
  mesh.renderOrder = STAND_IN_RENDER_ORDER;
  mesh.visible = false;
  // 半透明的替身沒有實體表面，不參與環境光遮蔽。
  mesh.userData[SKIP_AMBIENT_OCCLUSION] = true;
  part.mesh.add(mesh);
  mesh.updateMatrixWorld(true);
  return { part, mesh, material, original };
}

function setInstanceMatrix(part: OccluderPart, matrix: Matrix4): void {
  part.mesh.setMatrixAt(part.index, matrix);
  part.mesh.instanceMatrix.needsUpdate = true;
}

/** 把這樣東西畫成 opacity 的不透明度（1 = 原本的樣子）。 */
function applyOpacity(group: FadeGroup, opacity: number): void {
  const wasFaded = group.opacity < 1;
  const faded = opacity < 1;
  group.opacity = opacity;
  if (faded && group.standIns === undefined) {
    group.standIns = group.occluder.parts
      .map(createStandIn)
      .filter((standIn): standIn is StandIn => standIn !== undefined);
  }
  const standIns = group.standIns ?? [];
  if (faded !== wasFaded) {
    for (const standIn of standIns) {
      setInstanceMatrix(standIn.part, faded ? HIDDEN_MATRIX : standIn.original);
      standIn.mesh.visible = faded;
    }
    for (const mesh of group.occluder.meshes ?? []) {
      const material = singleMaterial(mesh.material);
      if (material !== undefined) {
        material.transparent = faded;
        material.needsUpdate = true;
      }
    }
    group.occluder.setHidden?.(faded);
  }
  for (const standIn of standIns) {
    standIn.material.opacity = opacity;
  }
  for (const mesh of group.occluder.meshes ?? []) {
    const material = singleMaterial(mesh.material);
    if (material !== undefined) {
      material.opacity = opacity;
    }
  }
}

/**
 * 收集 root 底下登記過的擺設（props/occluders.ts），建立遮擋半透明。
 * 佔地方塊在這裡換成世界座標，所以要在場景組好、擺設都就位之後才呼叫。
 */
export function createOcclusionFade(root: Object3D): OcclusionFade {
  root.updateMatrixWorld(true);
  const groups: FadeGroup[] = [];
  root.traverse((object) => {
    for (const occluder of occludersOf(object)) {
      groups.push({
        occluder,
        boxes: occluder.boxes.map((box) =>
          sightBox(new Matrix4().multiplyMatrices(object.matrixWorld, box)),
        ),
        opacity: 1,
        standIns: undefined,
      });
    }
  });

  return {
    count: groups.length,
    update(camera, pose, active, dtSeconds) {
      const targets = active ? sightTargets(pose) : [];
      for (const group of groups) {
        const blocked = active && group.boxes.some((box) => blocksView(camera, targets, box));
        // 沒被擋、也已經完全不透明：什麼都不必做（絕大多數的擺設每一幀都走這裡）。
        if (!blocked && group.opacity >= 1) {
          continue;
        }
        const opacity = nextOpacity(group.opacity, blocked, dtSeconds);
        if (opacity !== group.opacity) {
          applyOpacity(group, opacity);
        }
      }
    },
    fadedCount: () => groups.filter((group) => group.opacity < 1).length,
  };
}
