// 場景裡的動態小效果：倒車輪胎痕、車輪揚起的灰塵、場地上的落葉。全部是純視覺，沒有碰撞。
// 數量跟著畫質級別走；上限是 0 的效果整個不建立（不佔 draw call）。
import { Group } from 'three';
import type { GroundVector } from '../core/heading';
import type { ParkingSpot } from '../level/parkingJudge';
import type { QualitySettings } from '../render/quality';
import type { VehiclePose } from '../vehicle/bicycleModel';
import { createDust } from './dust';
import { createLeaves } from './leaves';
import { createTireMarks } from './tireMarks';

export interface SceneEffects {
  /** 全部效果的網格（世界座標），加進場景。 */
  readonly root: Group;
  /**
   * 每個畫面幀呼叫。
   * @param frameSeconds 距離上一幀多久；定格截圖傳 0：落葉停在起始位置，沒有輪胎痕與灰塵。
   */
  update(pose: VehiclePose, frameSeconds: number): void;
}

/** 灰塵與落葉各用自己的亂數序列（種子加上這個位移），互不影響，也不影響場地擺設。 */
const DUST_SEED_OFFSET = 0x51;
const LEAF_SEED_OFFSET = 0xa7;

/**
 * @param spot 目標車位（落葉避開它與通路）
 * @param start 車的起點（世界座標）
 * @param seed 亂數種子
 */
export function createSceneEffects(
  quality: Pick<QualitySettings, 'tireMarks' | 'particles'>,
  spot: ParkingSpot,
  start: GroundVector,
  seed: number,
): SceneEffects {
  const root = new Group();
  root.name = 'effects';

  const tireMarks = quality.tireMarks.maxSegments > 0 ? createTireMarks(quality.tireMarks) : undefined;
  const dust =
    quality.particles.dust > 0
      ? createDust(quality.particles.dust, seed + DUST_SEED_OFFSET)
      : undefined;
  const leaves =
    quality.particles.leaves > 0
      ? createLeaves(spot, start, seed + LEAF_SEED_OFFSET, quality.particles.leaves)
      : undefined;
  if (tireMarks !== undefined) {
    root.add(tireMarks.mesh);
  }
  if (dust !== undefined) {
    root.add(dust.points);
  }
  if (leaves !== undefined) {
    root.add(leaves.mesh);
  }

  let elapsedSeconds = 0;
  return {
    root,
    update(pose, frameSeconds) {
      elapsedSeconds += frameSeconds;
      tireMarks?.update(pose, frameSeconds);
      dust?.update(pose, frameSeconds);
      leaves?.setTime(elapsedSeconds);
    },
  };
}
