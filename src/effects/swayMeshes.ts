// 被撞的車晃動的畫面（純視覺）：把 level/hitSway.ts 算出的姿勢套到那台車的模型上。
// 整台車（車身、輪子、車牌上的字、車身上的字樣、亮著的警報燈）繞「車底正中央的地面」傾斜，再平移一小段；
// 停了就放回原本的矩陣，一個位元都不差。碰撞盒與鏡頭的擋塊都不動。
// 輪子與車身併在同一個網格裡，所以是整台一起傾（傾 6° 時一側的輪子離地約 3 英寸，另一側陷進地面一樣多）。
// 障礙物的群組與它底下的網格都沒有自己的位移或旋轉，所以實例的矩陣就是世界座標。
import { InstancedMesh, Matrix4, Mesh, Vector3, type Group } from 'three';
import { forward, right, type GroundVector } from '../core/heading';
import { degToRad, ftToM } from '../core/units';
import { swayPose, swaysWhenHit, type Sway } from '../level/hitSway';
import type { ObstacleSource } from '../props/obstacleMeshes';
import type { OccluderPart } from '../props/occluders';
import { moveParkedCarPlate } from '../props/parkedCars';

export interface SwayMeshes {
  /**
   * 每個畫面幀呼叫：正在晃的車擺到現在的姿勢，剛停下來的放回原位。
   * 沒有車在晃、也沒有車離開原位時什麼都不做。
   */
  update(sways: readonly Sway[]): void;
}

/** 一台會晃的車：模型的哪些部分要跟著動，以及它們原本的矩陣。 */
interface SwayTarget {
  readonly index: number;
  /** 傾斜的支點：車底正中央的地面。 */
  readonly pivot: Vector3;
  /** 車身的右邊與車頭方向（世界座標）。 */
  readonly across: GroundVector;
  readonly along: GroundVector;
  readonly parts: { readonly part: OccluderPart; readonly rest: Matrix4 }[];
  /** 貼在車身上的字樣（貨車、救護車、餐車）。 */
  readonly labels: { readonly mesh: Mesh; readonly rest: Matrix4 }[];
  /** 停放的車：它在 parkedCars 群組裡是第幾台（車牌上的字用）；其他車是 -1。 */
  readonly plateCar: number;
}

/**
 * @param obstacles createObstacleMeshes 的回傳值
 * @param source 同一份障礙物資料（位置、方向、種類）
 * @param place 改一個實例的矩陣（遮擋半透明的 place：正淡著的實例動的是替身；moving = 正在晃，晃的時候不淡）
 * @param moveLamps 那台車亮著的警報燈跟著走（VehicleBeacons.move）
 */
export function createSwayMeshes(
  obstacles: Group,
  source: ObstacleSource,
  place: (part: OccluderPart, matrix: Matrix4, moving: boolean) => void,
  moveLamps: (index: number, matrix: Matrix4 | undefined) => void,
): SwayMeshes {
  const cars = obstacles.getObjectByName('parkedCars') as Group | undefined;
  const carIndices = (cars?.userData.obstacleIndices ?? []) as readonly number[];
  const targets = new Map<number, SwayTarget>();
  const targetOf = (index: number): SwayTarget | undefined => {
    const known = targets.get(index);
    const obstacle = source.obstaclesFt[index];
    if (known !== undefined || obstacle === undefined || !swaysWhenHit(obstacle.type)) {
      return known;
    }
    const headingRad = degToRad(obstacle.headingDeg);
    const target: SwayTarget = {
      index,
      pivot: new Vector3(ftToM(obstacle.centerXFt), 0, ftToM(obstacle.centerZFt)),
      across: right(headingRad),
      along: forward(headingRad),
      parts: [],
      labels: [],
      plateCar: carIndices.indexOf(index),
    };
    targets.set(index, target);
    return target;
  };
  obstacles.traverse((object) => {
    if (object instanceof InstancedMesh) {
      const indices = object.userData.obstacleIndices as readonly number[] | undefined;
      indices?.forEach((index, instance) => {
        const rest = new Matrix4();
        object.getMatrixAt(instance, rest);
        targetOf(index)?.parts.push({ part: { mesh: object, index: instance }, rest });
      });
    } else if (object instanceof Mesh && typeof object.userData.obstacleIndex === 'number') {
      const target = targetOf(object.userData.obstacleIndex);
      if (target !== undefined) {
        // 字樣原本用 position／rotation 擺；之後由這裡直接寫矩陣。
        object.updateMatrix();
        object.matrixAutoUpdate = false;
        target.labels.push({ mesh: object, rest: object.matrix.clone() });
      }
    }
  });

  /** 把一台車擺到「原位再套上 matrix」；undefined = 放回原位。 */
  const placed = new Matrix4();
  const show = (target: SwayTarget, matrix: Matrix4 | undefined): void => {
    for (const { part, rest } of target.parts) {
      place(part, matrix === undefined ? rest : placed.multiplyMatrices(matrix, rest), matrix !== undefined);
    }
    for (const { mesh, rest } of target.labels) {
      if (matrix === undefined) {
        mesh.matrix.copy(rest);
      } else {
        mesh.matrix.multiplyMatrices(matrix, rest);
      }
      mesh.matrixWorldNeedsUpdate = true;
    }
    if (cars !== undefined && target.plateCar >= 0) {
      moveParkedCarPlate(cars, target.plateCar, matrix);
    }
    moveLamps(target.index, matrix);
  };

  /** 目前離開原位的車。 */
  const shown = new Set<SwayTarget>();
  const tilt = new Matrix4();
  const axis = new Vector3();
  const turned = new Vector3();
  return {
    update(sways) {
      if (sways.length === 0 && shown.size === 0) {
        return;
      }
      for (const target of shown) {
        if (!sways.some((sway) => sway.index === target.index)) {
          show(target, undefined);
          shown.delete(target);
        }
      }
      for (const sway of sways) {
        const target = targets.get(sway.index);
        if (target === undefined) {
          continue;
        }
        const { across, along, pivot } = target;
        const pose = swayPose(sway);
        // 車頂往哪邊倒（世界座標的水平向量，長度是角度）：繞「ŷ × 那個方向」這條水平軸轉，車頂就往那邊倒。
        const leanX = across.x * pose.leanAcrossRad + along.x * pose.leanAlongRad;
        const leanZ = across.z * pose.leanAcrossRad + along.z * pose.leanAlongRad;
        const angleRad = Math.hypot(leanX, leanZ);
        if (angleRad > 0) {
          tilt.makeRotationAxis(axis.set(leanZ / angleRad, 0, -leanX / angleRad), angleRad);
        } else {
          tilt.identity();
        }
        // 支點留在原地，再加上整台車被推開的那一小段。
        turned.copy(pivot).applyMatrix4(tilt);
        tilt.setPosition(
          pivot.x - turned.x + across.x * pose.shoveAcrossM + along.x * pose.shoveAlongM,
          pivot.y - turned.y,
          pivot.z - turned.z + across.z * pose.shoveAcrossM + along.z * pose.shoveAlongM,
        );
        show(target, tilt);
        shown.add(target);
      }
    },
  };
}
