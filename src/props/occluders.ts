// 會擋住鏡頭的擺設（路燈、樹、背景車、建築塊、招牌柱…）在這裡登記：佔的空間＋由哪些網格實例畫出來。
// 這裡只記資料，不判定、不改材質；跟車鏡頭的遮擋半透明（render/occlusionFade.ts）讀這份登記。
// 玩家自己的車不登記，所以永遠不會被淡掉。
// 同一份登記也是跟車鏡頭的「擋塊」來源（render/cameraBlockers.ts）：實心的東西鏡頭不會跑到它裡面或後面；
// 標成 passable 的（路燈、樹）只淡不擋。不會淡、但鏡頭一樣不能進去的（巷子兩旁的整棟建築）另外用 registerCameraBlockers 登記。
import { Matrix4, Quaternion, Vector3, type InstancedMesh, type Mesh, type Object3D } from 'three';

/** InstancedMesh 裡的一個實例。 */
export interface OccluderPart {
  readonly mesh: InstancedMesh;
  readonly index: number;
}

/** 一樣會擋住鏡頭的東西：整個一起淡、一起恢復。 */
export interface Occluder {
  /**
   * 佔的空間：每個矩陣把「中心在原點、邊長 1 的方塊」擺到登記它的那個物件的本地座標。
   * 一樣東西可以有好幾塊（路燈＝燈桿＋燈臂與燈頭），任何一塊擋住就算擋住。
   */
  readonly boxes: readonly Matrix4[];
  /** 畫出這樣東西的實例（同一樣東西可以跨好幾個 InstancedMesh：車殼各分區＋輪胎＋輪圈）。 */
  readonly parts: readonly OccluderPart[];
  /** 不是實例的網格（招牌的牌面）：材質必須是它自己專用的，淡的時候直接改它的透明度。 */
  readonly meshes?: readonly Mesh[];
  /** 併在別的網格裡、沒辦法單獨淡的小東西（背景車車牌上的字）：淡的時候藏起來，恢復時再顯示。 */
  readonly setHidden?: (hidden: boolean) => void;
  /**
   * 細長或鬆散的東西（路燈、樹）：擋到跟車鏡頭時只淡掉，鏡頭不為它讓位（掃過一根燈桿就把鏡頭拉近再放開，畫面會抽動）。
   * 不給 = 實心的（樓、牆、車、子母車…），鏡頭會避開。
   */
  readonly passable?: boolean;
}

const registry = new WeakMap<Object3D, Occluder[]>();

/** 在 owner 底下登記會擋鏡頭的東西；boxes 用 owner 的本地座標。 */
export function registerOccluders(owner: Object3D, occluders: readonly Occluder[]): void {
  const list = registry.get(owner);
  if (list === undefined) {
    registry.set(owner, [...occluders]);
  } else {
    list.push(...occluders);
  }
}

/** 這個物件底下登記過的東西（沒有就是空的）。 */
export function occludersOf(owner: Object3D): readonly Occluder[] {
  return registry.get(owner) ?? [];
}

const blockerRegistry = new WeakMap<Object3D, Matrix4[]>();

/**
 * 在 owner 底下登記「只擋鏡頭、不淡」的方塊（巷子兩旁的整棟建築）；boxes 用 owner 的本地座標，寫法與 Occluder.boxes 相同。
 */
export function registerCameraBlockers(owner: Object3D, boxes: readonly Matrix4[]): void {
  const list = blockerRegistry.get(owner);
  if (list === undefined) {
    blockerRegistry.set(owner, [...boxes]);
  } else {
    list.push(...boxes);
  }
}

/** 這個物件底下用 registerCameraBlockers 登記過的方塊（沒有就是空的）。 */
export function cameraBlockerBoxesOf(owner: Object3D): readonly Matrix4[] {
  return blockerRegistry.get(owner) ?? [];
}

const Y_AXIS = new Vector3(0, 1, 0);

/**
 * 一塊佔地方塊的矩陣。
 * @param center 方塊中心
 * @param size 三個方向的邊長
 * @param rotationY 繞 Y 轉多少（弧度；three 的 rotation.y）
 */
export function occluderBox(
  center: { readonly x: number; readonly y: number; readonly z: number },
  size: { readonly x: number; readonly y: number; readonly z: number },
  rotationY = 0,
): Matrix4 {
  return new Matrix4().compose(
    new Vector3(center.x, center.y, center.z),
    new Quaternion().setFromAxisAngle(Y_AXIS, rotationY),
    new Vector3(size.x, size.y, size.z),
  );
}
