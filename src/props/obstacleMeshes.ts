// 關卡的障礙物與邊界（會撞到的東西）的模型：盒、圓柱、細桿的組合，全部程序化。
// 每一種一個 InstancedMesh（一個 draw call）；模型在本地座標的外框會被縮放成剛好等於碰撞盒的底面，
// 所以看到的佔地就是會撞到的範圍。停放車輛交給 createParkedCars（與背景車同一套轎車與車牌）。
// 碰撞只看 level/collision.ts，不看這裡。
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { forward, headingToRotationY } from '../core/heading';
import { degToRad, ftToM } from '../core/units';
import type { BoundsFt, ObbFt } from '../level/collision';
import { signText } from '../level/environmentSigns';
import type { LevelEnvironment } from '../level/levelSchema';
import {
  OBSTACLE_DEFAULT_SIZE_FT,
  OBSTACLE_TYPES,
  type ObstacleType,
} from '../level/obstacleTypes';
import type { VehicleDetail } from '../render/quality';
import { OCCLUSION_FADE_CONFIG as FADE } from '../render/renderConfig';
import { createBinGeometry, createTrafficConeGeometry, tinted } from './lotProps';
import type { PropPlacement } from './lotLayout';
import { occluderBox, registerOccluders, type Occluder } from './occluders';
import { createParkedCars } from './parkedCars';
import { createSignMesh } from './signs';

/** 要畫的東西：關卡的障礙物、（選填的）可行駛範圍與環境。LevelDefinition 本身就符合這個形狀。 */
export interface ObstacleSource {
  readonly obstaclesFt: readonly (ObbFt & { readonly type: ObstacleType })[];
  readonly boundsFt?: BoundsFt;
  /** 決定牆與邊界畫成什麼樣子；不給 = 停車場。 */
  readonly environment?: LevelEnvironment;
}

/** 邊界怎麼畫：高度、往外的厚度、顏色（英尺）。內緣一定貼齊可行駛範圍。 */
export interface BoundsStyle {
  readonly heightFt: number;
  /** 往可行駛範圍外面長多厚（純視覺；碰撞盒的厚度在 collision.ts）。 */
  readonly depthFt: number;
  readonly color: number;
}

/** 停車場的邊界是矮路緣：不擋視線，但看得出範圍。 */
const CURB_BOUNDS: BoundsStyle = { heightFt: 0.6, depthFt: 4, color: 0xb9b4a8 };

/**
 * 各環境的邊界。街道是人行道的路緣；巷子的邊界就是兩旁的建築（很厚的一整塊，
 * 鏡頭跑到牆後面時在方塊裡面，背面不畫，所以看得穿）。
 */
export const BOUNDS_STYLES: Readonly<Record<LevelEnvironment, BoundsStyle>> = {
  open_lot: CURB_BOUNDS,
  warehouse_club: CURB_BOUNDS,
  post_office: CURB_BOUNDS,
  city_street: { heightFt: 0.5, depthFt: 4, color: 0xb3afa4 },
  narrow_alley: { heightFt: 22, depthFt: 45, color: 0x70503f },
};

/** 牆（JSON 的 wall）的高度與顏色。 */
export const WALL_STYLES: Readonly<Record<LevelEnvironment, { heightFt: number; color: number }>> = {
  open_lot: { heightFt: 7, color: 0x9a8b7d },
  warehouse_club: { heightFt: 7, color: 0x9a8b7d },
  post_office: { heightFt: 7, color: 0x8e5a48 },
  city_street: { heightFt: 7, color: 0x9a8b7d },
  narrow_alley: { heightFt: 22, color: 0x82584a },
};

// ── 零件（單位：英尺；最後整個模型一起換成公尺）──────────────────────────

/** 盒子：寬（X）、高、長（Z），中心在 (x, z)、底面在 y。 */
function box(
  width: number,
  height: number,
  length: number,
  x: number,
  y: number,
  z: number,
  color: number,
): BufferGeometry {
  return tinted(new BoxGeometry(width, height, length).translate(x, y + height / 2, z), color);
}

/** 直立的圓柱（可以上下不同半徑），底面在 y。 */
function cylinder(
  topRadius: number,
  bottomRadius: number,
  height: number,
  x: number,
  y: number,
  z: number,
  color: number,
  segments = 12,
): BufferGeometry {
  return tinted(
    new CylinderGeometry(topRadius, bottomRadius, height, segments).translate(x, y + height / 2, z),
    color,
  );
}

/** 橫躺的圓柱（軸沿 X）：輪子、郵筒的圓頂。中心在 (x, y, z)。 */
function roller(radius: number, width: number, x: number, y: number, z: number, color: number): BufferGeometry {
  return tinted(
    new CylinderGeometry(radius, radius, width, 12).rotateZ(Math.PI / 2).translate(x, y, z),
    color,
  );
}

type Point = readonly [number, number, number];

/** 細桿：從 from 到 to 的一根方桿。 */
function bar(from: Point, to: Point, thickness: number, color: number): BufferGeometry {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const direction = end.clone().sub(start);
  const geometry = new BoxGeometry(thickness, thickness, direction.length());
  geometry.applyQuaternion(
    new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), direction.normalize()),
  );
  const middle = start.add(end).multiplyScalar(0.5);
  return tinted(geometry.translate(middle.x, middle.y, middle.z), color);
}

/** 球（灌木）。 */
function blob(radius: number, x: number, y: number, z: number, color: number): BufferGeometry {
  return tinted(new SphereGeometry(radius, 8, 6).translate(x, y, z), color);
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** 英尺的零件合成一個公尺的幾何。 */
function assemble(parts: readonly BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries([...parts]);
  const scale = ftToM(1);
  return merged.scale(scale, scale, scale);
}

// ── 各種障礙物的零件（本地 X = 橫向、−Z = 前方，與車的模型相同）─────────────

/** 購物車：鐵絲籃（上寬下窄、前面斜）、底架、四個輪子、青綠色的把手。把手在後方（+Z）。 */
function shoppingCartParts(offsetX = 0, offsetZ = 0): BufferGeometry[] {
  const metal = 0xc4cad0;
  const wire = 0.07;
  const parts: BufferGeometry[] = [];
  const at = (x: number, y: number, z: number): Point => [x + offsetX, y, z + offsetZ];
  const bottomY = 1.4;
  const topY = 2.9;
  // 籃底與籃口的四個角（前面往前斜出去）。
  const bottom = { halfX: 0.8, frontZ: -1.2, rearZ: 1.4 };
  const top = { halfX: 0.96, frontZ: -1.52, rearZ: 1.45 };
  for (const side of [-1, 1]) {
    for (const z of [-1.3, 1.3]) {
      parts.push(roller(0.2, 0.12, side * 0.78 + offsetX, 0.2, z + offsetZ, 0x232527));
      parts.push(bar(at(side * 0.78, 0.2, z), at(side * 0.78, 0.5, z), 0.08, metal));
    }
    // 底架與後方撐起把手的立桿。
    parts.push(bar(at(side * 0.78, 0.5, -1.4), at(side * 0.78, 0.5, 1.4), 0.1, metal));
    parts.push(bar(at(side * 0.78, 0.5, 1.4), at(side * 0.92, 3.3, 1.5), 0.09, metal));
    // 籃子側面：上下兩圈、中間一圈、直條。
    for (const t of [0, 0.5, 1]) {
      const y = lerp(bottomY, topY, t);
      const halfX = lerp(bottom.halfX, top.halfX, t);
      parts.push(
        bar(
          at(side * halfX, y, lerp(bottom.frontZ, top.frontZ, t)),
          at(side * halfX, y, lerp(bottom.rearZ, top.rearZ, t)),
          wire,
          metal,
        ),
      );
    }
    for (let slat = 0; slat <= 6; slat += 1) {
      const t = slat / 6;
      parts.push(
        bar(
          at(side * bottom.halfX, bottomY, lerp(bottom.frontZ, bottom.rearZ, t)),
          at(side * top.halfX, topY, lerp(top.frontZ, top.rearZ, t)),
          wire,
          metal,
        ),
      );
    }
  }
  // 籃子前後兩面。
  for (const end of ['frontZ', 'rearZ'] as const) {
    for (const t of [0, 0.5, 1]) {
      const y = lerp(bottomY, topY, t);
      const halfX = lerp(bottom.halfX, top.halfX, t);
      const z = lerp(bottom[end], top[end], t);
      parts.push(bar(at(-halfX, y, z), at(halfX, y, z), wire, metal));
    }
    for (let slat = 1; slat <= 3; slat += 1) {
      const t = slat / 4;
      parts.push(
        bar(
          at(lerp(-bottom.halfX, bottom.halfX, t), bottomY, bottom[end]),
          at(lerp(-top.halfX, top.halfX, t), topY, top[end]),
          wire,
          metal,
        ),
      );
    }
  }
  parts.push(box(1.6, 0.05, 2.6, offsetX, bottomY - 0.02, 0.1 + offsetZ, 0x9aa1a8));
  // 把手。
  parts.push(bar(at(-0.96, 3.3, 1.5), at(0.96, 3.3, 1.5), 0.14, 0x1f8f8a));
  return parts;
}

/** 推車回收架：兩側欄杆、封閉的前端、門形的招牌架，裡面套著幾台推車。開口在後方（+Z）。 */
function cartCorralParts(): BufferGeometry[] {
  const rail = 0x8d99a6;
  const parts: BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    for (let post = 0; post <= 4; post += 1) {
      parts.push(box(0.2, 3.6, 0.2, side * 2.9, 0, lerp(-7.9, 7.9, post / 4), rail));
    }
    for (const y of [1.4, 3.4]) {
      parts.push(box(0.14, 0.14, 16, side * 2.93, y, 0, rail));
    }
    // 招牌架的兩根立柱。
    parts.push(box(0.24, 7.2, 0.24, side * 2.88, 0, -7.88, 0x5c6670));
  }
  for (const y of [1.4, 3.4]) {
    parts.push(box(6, 0.14, 0.14, 0, y, -7.93, rail));
  }
  // 招牌的底板（字另外貼在兩面）。
  parts.push(box(5.9, 1.7, 0.16, 0, 5.4, -7.88, 0x12706c));
  // 套在一起的推車：左邊三台、右邊兩台。
  for (const [x, z] of [
    [-1.3, -5.6],
    [-1.3, -4.4],
    [-1.3, -3.2],
    [1.3, -5.4],
    [1.3, -4.2],
  ] as const) {
    parts.push(...shoppingCartParts(x, z));
  }
  return parts;
}

/** 垃圾子母車：深綠色的箱體、黑色的掀蓋、兩側的叉槽、四個小輪。長邊沿 X。 */
function dumpsterParts(): BufferGeometry[] {
  const body = 0x2f5d50;
  const trim = 0x234a3f;
  const parts: BufferGeometry[] = [
    box(5.4, 3.2, 3.3, 0, 0.45, 0, body),
    box(5.6, 0.2, 3.5, 0, 3.65, 0, trim),
    box(2.72, 0.16, 3.4, -1.39, 3.85, 0, 0x1e2022),
    box(2.72, 0.16, 3.4, 1.39, 3.85, 0, 0x26282b),
    box(5.5, 0.3, 0.3, 0, 3.85, 1.55, 0x1e2022),
  ];
  for (const side of [-1, 1]) {
    parts.push(box(0.3, 0.6, 2.6, side * 2.85, 1.9, 0, trim));
    for (const z of [-1.3, 1.3]) {
      parts.push(roller(0.26, 0.2, side * 2.3, 0.26, z, 0x1a1b1c));
    }
    for (const x of [-1.8, 0, 1.8]) {
      parts.push(box(0.16, 2.8, 0.1, x, 0.6, side * 1.7, trim));
    }
  }
  return parts;
}

/** 投遞箱：四支腳、深綠色的箱體、圓頂、米白色的腰帶、前面的投信口。字（MAIL）另外貼。 */
function mailboxParts(): BufferGeometry[] {
  const green = 0x1f5b3a;
  const parts: BufferGeometry[] = [
    box(1.8, 2.3, 1.8, 0, 0.9, 0, green),
    roller(0.9, 1.8, 0, 3.2, 0, green),
    box(1.8, 0.22, 1.8, 0, 1.25, 0, 0xe9e2cf),
    // 投信口的拉門與把手。
    box(1.4, 0.5, 0.05, 0, 3.05, -0.875, 0x163f29),
    box(0.9, 0.08, 0.05, 0, 3.2, -0.875, 0xc9ced3),
  ];
  for (const x of [-0.72, 0.72]) {
    for (const z of [-0.72, 0.72]) {
      parts.push(box(0.18, 0.9, 0.18, x, 0, z, 0x163f29));
    }
  }
  return parts;
}

/** 木棧板：三根縱樑、底板、上面七片面板（深淺交錯）。 */
function palletParts(): BufferGeometry[] {
  const parts: BufferGeometry[] = [];
  for (const x of [-1.55, 0, 1.55]) {
    parts.push(box(0.3, 0.3, 4, x, 0.08, 0, 0x8f6c41));
  }
  for (const z of [-1.75, 0, 1.75]) {
    parts.push(box(3.4, 0.08, 0.5, 0, 0, z, 0x9c7748));
  }
  for (let board = 0; board < 7; board += 1) {
    parts.push(
      box(3.4, 0.1, 0.46, 0, 0.38, lerp(-1.77, 1.77, board / 6), board % 2 === 0 ? 0xb08a5a : 0xa27d4f),
    );
  }
  return parts;
}

/** 疊高的棧板貨物：棧板上兩層紙箱（各四箱）、淺色的纏膜頂蓋與綑帶。 */
function palletStackParts(): BufferGeometry[] {
  const parts = palletParts();
  const tones = [0xb9925e, 0xa9834f, 0xc19a66, 0xb08a58];
  [0.5, 2.22].forEach((y, tier) => {
    [-1, 1].forEach((sideX, column) => {
      [-1, 1].forEach((sideZ, row) => {
        parts.push(
          box(1.58, 1.68, 1.86, sideX * 0.82, y, sideZ * 0.96, tones[(tier + column + row) % tones.length] ?? 0xb9925e),
        );
      });
    });
  });
  parts.push(box(3.3, 0.06, 3.9, 0, 3.92, 0, 0xd9dee2));
  for (const x of [-0.85, 0.85]) {
    parts.push(box(0.16, 3.5, 3.98, x, 0.48, 0, 0xdfe6ea));
  }
  return parts;
}

/** 護柱：黃色的鋼柱、白色反光帶、圓頂。 */
function bollardParts(): BufferGeometry[] {
  return [
    cylinder(0.4, 0.4, 0.08, 0, 0, 0, 0x4a4d52),
    cylinder(0.34, 0.36, 2.7, 0, 0, 0, 0xe2c33b),
    cylinder(0.37, 0.37, 0.3, 0, 2, 0, 0xf2f2ee),
    cylinder(0.12, 0.34, 0.3, 0, 2.7, 0, 0xe2c33b),
  ];
}

/** 橫桿路障：兩支 A 字腳、上下兩條橘白相間的橫板。長邊沿 X。 */
function barrierParts(): BufferGeometry[] {
  const leg = 0xd9d9d4;
  const parts: BufferGeometry[] = [];
  for (const x of [-2.6, 2.6]) {
    parts.push(box(0.26, 0.14, 1.5, x, 0, 0, leg));
    parts.push(bar([x, 0.1, -0.68], [x, 3.1, 0], 0.16, leg));
    parts.push(bar([x, 0.1, 0.68], [x, 3.1, 0], 0.16, leg));
  }
  for (let stripe = 0; stripe < 8; stripe += 1) {
    const x = -2.625 + 0.75 * stripe;
    parts.push(box(0.75, 0.62, 0.12, x, 2.35, 0, stripe % 2 === 0 ? 0xf26a1b : 0xf4f1e8));
    parts.push(box(0.75, 0.36, 0.12, x, 1.2, 0, stripe % 2 === 0 ? 0xf4f1e8 : 0xf26a1b));
  }
  return parts;
}

/** 花台：水泥箱、深色的土、幾叢灌木。 */
function planterParts(): BufferGeometry[] {
  return [
    box(4, 1.5, 4, 0, 0, 0, 0x9a9a8e),
    box(3.5, 0.14, 3.5, 0, 1.5, 0, 0x3b2e24),
    blob(1.05, -0.75, 2.2, -0.6, 0x3d5a2e),
    blob(1.15, 0.7, 2.3, 0.5, 0x4a6a33),
    blob(0.85, -0.5, 2.1, 0.9, 0x566f38),
    blob(0.8, 0.8, 2, -0.9, 0x34502c),
  ];
}

/** 畫成實例化模型的類型（停放車輛另外走 createParkedCars）。 */
export type ModelObstacleType = Exclude<ObstacleType, 'parked_car'>;

/** 每一種的幾何（公尺）。牆是單位方塊（底面在 y = 0），高度與顏色由實例決定。 */
export function createObstacleGeometry(type: ModelObstacleType): BufferGeometry {
  switch (type) {
    case 'cone':
      return createTrafficConeGeometry();
    case 'trash_bin':
      return createBinGeometry();
    case 'shopping_cart':
      return assemble(shoppingCartParts());
    case 'cart_corral':
      return assemble(cartCorralParts());
    case 'dumpster':
      return assemble(dumpsterParts());
    case 'mailbox':
      return assemble(mailboxParts());
    case 'pallet':
      return assemble(palletParts());
    case 'pallet_stack':
      return assemble(palletStackParts());
    case 'bollard':
      return assemble(bollardParts());
    case 'barrier':
      return assemble(barrierParts());
    case 'planter':
      return assemble(planterParts());
    case 'wall':
      return tinted(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0), 0xffffff);
  }
}

const MODEL_ROUGHNESS = 0.78;

/** 障礙物在世界座標的矩陣：模型的外框（本地 X、Z）縮放成碰撞盒的寬與長，立在地面上。 */
function obstacleMatrix(obstacle: ObbFt, geometry: BufferGeometry, heightScale = 1): Matrix4 {
  geometry.computeBoundingBox();
  const size = new Vector3();
  const center = new Vector3();
  geometry.boundingBox?.getSize(size);
  geometry.boundingBox?.getCenter(center);
  const scale = new Vector3(ftToM(obstacle.widthFt) / size.x, heightScale, ftToM(obstacle.lengthFt) / size.z);
  const rotation = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    headingToRotationY(degToRad(obstacle.headingDeg)),
  );
  // 先把模型外框的中心移到原點，再縮放、旋轉、擺到碰撞盒的中心。
  return new Matrix4()
    .compose(new Vector3(ftToM(obstacle.centerXFt), 0, ftToM(obstacle.centerZFt)), rotation, scale)
    .multiply(new Matrix4().makeTranslation(-center.x, 0, -center.z));
}

/** 邊界四面的視覺方塊（英尺）：北、南、西、東。內緣貼齊可行駛範圍，南北兩面把轉角補滿。 */
export function boundsVisualBoxesFt(bounds: BoundsFt, depthFt: number): readonly ObbFt[] {
  const widthFt = bounds.maxXFt - bounds.minXFt;
  const lengthFt = bounds.maxZFt - bounds.minZFt;
  const centerXFt = (bounds.minXFt + bounds.maxXFt) / 2;
  const centerZFt = (bounds.minZFt + bounds.maxZFt) / 2;
  const across = { centerXFt, widthFt: widthFt + 2 * depthFt, lengthFt: depthFt, headingDeg: 0 };
  const along = { centerZFt, widthFt: depthFt, lengthFt, headingDeg: 0 };
  return [
    { ...across, centerZFt: bounds.minZFt - depthFt / 2 },
    { ...across, centerZFt: bounds.maxZFt + depthFt / 2 },
    { ...along, centerXFt: bounds.minXFt - depthFt / 2 },
    { ...along, centerXFt: bounds.maxXFt + depthFt / 2 },
  ];
}

/** 巷子四面建築的高度倍數與明暗（北、南、西、東），屋頂才不會是同一個平面。 */
const BOUNDS_SIDE_VARIATION = [
  { height: 1.18, shade: 0.92 },
  { height: 0.9, shade: 1.06 },
  { height: 1, shade: 1 },
  { height: 1.1, shade: 0.86 },
] as const;

/**
 * 建立障礙物與邊界的模型。
 * 子物件：每種障礙物一個 InstancedMesh（`obstacle:<type>`，userData.obstacleIndices 是各實例在 JSON 裡的索引）、
 * 停放車輛的群組（`parkedCars`，同樣有 obstacleIndices）、邊界（`bounds`）、貼在障礙物上的字（`sign`）。
 * @param detail 停放車輛輪圈的細分（跟著畫質級別）
 */
export function createObstacleMeshes(source: ObstacleSource, detail: VehicleDetail = 'high'): Group {
  const group = new Group();
  group.name = 'obstacles';
  const environment = source.environment ?? 'open_lot';
  const material = new MeshStandardMaterial({
    color: 0xffffff,
    roughness: MODEL_ROUGHNESS,
    vertexColors: true,
  });

  const indicesByType = new Map<ObstacleType, number[]>();
  source.obstaclesFt.forEach((obstacle, index) => {
    const list = indicesByType.get(obstacle.type) ?? [];
    list.push(index);
    indicesByType.set(obstacle.type, list);
  });
  const obstacleAt = (index: number): ObbFt => {
    const obstacle = source.obstaclesFt[index];
    if (obstacle === undefined) {
      throw new Error(`沒有第 ${index} 個障礙物`);
    }
    return obstacle;
  };

  for (const type of OBSTACLE_TYPES) {
    const indices = indicesByType.get(type);
    if (indices === undefined) {
      continue;
    }
    if (type === 'parked_car') {
      // 與背景車同一套轎車；車色由障礙物在 JSON 裡的索引決定（固定，不用亂數）。
      const placements: PropPlacement[] = indices.map((index) => {
        const car = obstacleAt(index);
        return {
          x: ftToM(car.centerXFt),
          z: ftToM(car.centerZFt),
          y: 0,
          headingRad: degToRad(car.headingDeg),
          sizeX: ftToM(car.widthFt),
          sizeY: 0,
          sizeZ: ftToM(car.lengthFt),
          variant: ((index * 0.381966 + 0.07) % 1 + 1) % 1,
        };
      });
      const cars = createParkedCars(placements, detail);
      cars.userData.obstacleIndices = indices;
      group.add(cars);
      continue;
    }
    const geometry = createObstacleGeometry(type);
    geometry.computeBoundingBox();
    const mesh = new InstancedMesh(geometry, material, indices.length);
    const wall = WALL_STYLES[environment];
    // 夠高、擋得住跟車鏡頭的才登記（牆、子母車、疊高的棧板、回收架…）；交通錐、推車這些矮的不淡。
    const heightM = (geometry.boundingBox?.max.y ?? 0) * (type === 'wall' ? ftToM(wall.heightFt) : 1);
    const occluders: Occluder[] = [];
    indices.forEach((index, instance) => {
      const obstacle = obstacleAt(index);
      mesh.setMatrixAt(
        instance,
        obstacleMatrix(obstacle, geometry, type === 'wall' ? ftToM(wall.heightFt) : 1),
      );
      if (heightM >= FADE.minHeightM) {
        occluders.push({
          boxes: [
            occluderBox(
              { x: ftToM(obstacle.centerXFt), y: heightM / 2, z: ftToM(obstacle.centerZFt) },
              { x: ftToM(obstacle.widthFt), y: heightM, z: ftToM(obstacle.lengthFt) },
              headingToRotationY(degToRad(obstacle.headingDeg)),
            ),
          ],
          parts: [{ mesh, index: instance }],
        });
      }
      if (type === 'wall') {
        mesh.setColorAt(instance, new Color(wall.color));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = `obstacle:${type}`;
    mesh.userData.obstacleIndices = indices;
    // 巷子的牆很高，太陽又低：投影會把整條巷子罩黑，所以高牆不投影。
    mesh.castShadow = !(type === 'wall' && wall.heightFt > 10);
    mesh.receiveShadow = true;
    group.add(mesh);
    registerOccluders(group, occluders);

    // 貼在模型上的字：投遞箱前面的 MAIL、推車回收架招牌兩面的 CART RETURN。
    for (const index of indices) {
      const obstacle = obstacleAt(index);
      const headingRad = degToRad(obstacle.headingDeg);
      const ahead = forward(headingRad);
      const x = ftToM(obstacle.centerXFt);
      const z = ftToM(obstacle.centerZFt);
      if (type === 'mailbox') {
        const outM = ftToM(obstacle.lengthFt / 2 + 0.03);
        group.add(
          createSignMesh({
            text: signText('post_office', 'MAIL'),
            style: 'mail',
            x: x + ahead.x * outM,
            y: ftToM(2.15),
            z: z + ahead.z * outM,
            facingRad: headingRad,
            widthM: ftToM(1.3),
            heightM: ftToM(0.55),
            glow: 0,
          }),
        );
      }
      if (type === 'cart_corral') {
        for (const face of [1, -1]) {
          const outM = ftToM(obstacle.lengthFt / 2 - 0.12 + face * 0.1);
          group.add(
            createSignMesh({
              text: signText('warehouse_club', 'CART RETURN'),
              style: 'club',
              x: x + ahead.x * outM,
              y: ftToM(6.25),
              z: z + ahead.z * outM,
              facingRad: face > 0 ? headingRad : headingRad + Math.PI,
              widthM: ftToM(5.6),
              heightM: ftToM(1.45),
              glow: 0.25,
            }),
          );
        }
      }
    }
  }

  if (source.boundsFt !== undefined) {
    const style = BOUNDS_STYLES[environment];
    const geometry = createObstacleGeometry('wall');
    const boxes = boundsVisualBoxesFt(source.boundsFt, style.depthFt);
    const mesh = new InstancedMesh(geometry, material, boxes.length);
    const tall = style.heightFt > 10;
    boxes.forEach((wallBox, instance) => {
      const variation = BOUNDS_SIDE_VARIATION[instance];
      const heightFt = style.heightFt * (tall ? (variation?.height ?? 1) : 1);
      mesh.setMatrixAt(instance, obstacleMatrix(wallBox, geometry, ftToM(heightFt)));
      mesh.setColorAt(
        instance,
        new Color(style.color).multiplyScalar(tall ? (variation?.shade ?? 1) : 1),
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = 'bounds';
    mesh.castShadow = !tall;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

/** `?show=obstacle_<type>` 用：原點上一個這種障礙物（預設大小；牆給一段 12 × 1 ft）。 */
export function createObstacleShowcase(type: ObstacleType, detail: VehicleDetail = 'high'): Group {
  const size = OBSTACLE_DEFAULT_SIZE_FT[type] ?? { widthFt: 12, lengthFt: 1 };
  return createObstacleMeshes(
    {
      obstaclesFt: [{ type, centerXFt: 0, centerZFt: 0, headingDeg: 0, ...size }],
      environment: type === 'mailbox' ? 'post_office' : 'warehouse_club',
    },
    detail,
  );
}
