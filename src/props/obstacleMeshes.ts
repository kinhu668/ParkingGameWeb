// 關卡的障礙物與邊界：這一輪先畫成單色方塊，底面與碰撞盒完全相同（看到的就是會撞到的）。
// 精細模型之後再換；碰撞只看 level/collision.ts，不看這裡。
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { headingToRotationY } from '../core/heading';
import { degToRad, ftToM } from '../core/units';
import { boundsWallsFt, type BoundsFt, type ObbFt } from '../level/collision';
import type { ObstacleType } from '../level/obstacleTypes';

/** 方塊的高度（英尺）與顏色。 */
interface BoxStyle {
  readonly heightFt: number;
  readonly color: number;
}

/** 每種障礙物的方塊樣式；少列一種會編譯失敗。 */
export const OBSTACLE_BOX_STYLES: Readonly<Record<ObstacleType, BoxStyle>> = {
  parked_car: { heightFt: 4.6, color: 0x4f6f9c },
  cone: { heightFt: 2.3, color: 0xf26a1b },
  shopping_cart: { heightFt: 3.4, color: 0xb9c0c7 },
  cart_corral: { heightFt: 3.6, color: 0x8d99a6 },
  trash_bin: { heightFt: 3.5, color: 0x3d5a40 },
  dumpster: { heightFt: 4.5, color: 0x2f5d50 },
  mailbox: { heightFt: 4.2, color: 0x1f5b3a },
  pallet: { heightFt: 0.5, color: 0xb08a5a },
  pallet_stack: { heightFt: 4.5, color: 0xa47c4d },
  bollard: { heightFt: 3, color: 0xe2c33b },
  barrier: { heightFt: 3.2, color: 0xd9472b },
  planter: { heightFt: 2, color: 0x8a8f7a },
  wall: { heightFt: 7, color: 0x9a8b7d },
};

/** 四面邊界畫成矮路緣：高度低，不擋視線，但看得出範圍。 */
export const BOUNDS_BOX_STYLE: BoxStyle = { heightFt: 0.6, color: 0xb9b4a8 };

const BOX_ROUGHNESS = 0.85;

/** 要畫的東西：關卡的障礙物與（選填的）可行駛範圍。LevelDefinition 本身就符合這個形狀。 */
export interface ObstacleSource {
  readonly obstaclesFt: readonly (ObbFt & { readonly type: ObstacleType })[];
  readonly boundsFt?: BoundsFt;
}

/**
 * 建立障礙物與邊界的方塊。子物件的順序與碰撞盒相同：先障礙物（依 JSON 順序），再四面邊界。
 * 每個方塊的底面就是它的碰撞盒，立在地面上。
 */
export function createObstacleBoxes(source: ObstacleSource): Group {
  const group = new Group();
  group.name = 'obstacles';
  // 所有方塊共用一個單位立方體，各自縮放；同色的共用材質。
  const unitBox = new BoxGeometry(1, 1, 1);
  const materials = new Map<number, MeshStandardMaterial>();
  const materialFor = (color: number): MeshStandardMaterial => {
    const existing = materials.get(color);
    if (existing !== undefined) {
      return existing;
    }
    const created = new MeshStandardMaterial({ color, roughness: BOX_ROUGHNESS });
    materials.set(color, created);
    return created;
  };

  const addBox = (box: ObbFt, style: BoxStyle, name: string): void => {
    const mesh = new Mesh(unitBox, materialFor(style.color));
    mesh.name = name;
    const heightM = ftToM(style.heightFt);
    // 本地 X = 橫向（寬）、本地 Z = 縱向（長），與車的模型相同。
    mesh.scale.set(ftToM(box.widthFt), heightM, ftToM(box.lengthFt));
    mesh.position.set(ftToM(box.centerXFt), heightM / 2, ftToM(box.centerZFt));
    mesh.rotation.y = headingToRotationY(degToRad(box.headingDeg));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  for (const obstacle of source.obstaclesFt) {
    addBox(obstacle, OBSTACLE_BOX_STYLES[obstacle.type], obstacle.type);
  }
  if (source.boundsFt !== undefined) {
    for (const wall of boundsWallsFt(source.boundsFt)) {
      addBox(wall, BOUNDS_BOX_STYLE, 'bounds');
    }
  }
  return group;
}
