// 場景裡的動態小效果：倒車輪胎痕、車輪揚起的灰塵、場地上的落葉、雨絲。全部是純視覺，沒有碰撞。
// 數量跟著畫質級別走；上限是 0 的效果整個不建立（不佔 draw call）。
import { Group } from 'three';
import type { GroundVector } from '../core/heading';
import type { ParkingSpot } from '../level/parkingJudge';
import type { QualitySettings } from '../render/quality';
import type { VehiclePose } from '../vehicle/bicycleModel';
import { createDust } from './dust';
import { createLeaves } from './leaves';
import { DEFAULT_RAIN_STYLE, LOW_RAIN_STYLE, createRain } from './rain';
import { createTireMarks } from './tireMarks';

export interface SceneEffects {
  /** 全部效果的網格（世界座標），加進場景。 */
  readonly root: Group;
  /**
   * 每個畫面幀呼叫。
   * @param frameSeconds 距離上一幀多久；定格截圖傳 0：落葉與雨絲停在起始位置，沒有輪胎痕與灰塵。
   */
  update(pose: VehiclePose, frameSeconds: number): void;
  /**
   * 把雨絲的長方體改以 (x, z) 為中心（平常跟著車）。定格截圖用：鏡頭離車很遠時（`?cam=spot_low`、`?cam=top` 而車還在起點），
   * 以車為中心的那一箱雨落不到鏡頭前面，畫面上看不出在下雨。雨絲釘在世界座標上，換中心只是換「畫哪一塊的雨」。
   * 下一次 update 又回到跟著車。沒有下雨就什麼都不做。
   */
  centerRainOn(x: number, z: number): void;
  /**
   * 不畫灰塵地跑 draw（跑完恢復）。倒車輔助層的小畫面用：後視鏡沿著車身往後看，後輪揚起的灰塵就在視線正中間，
   * 窄視角下幾顆半透明的粒子就蓋滿整個畫面；而且 three 用主畫布的高度算粒子的像素大小，
   * 畫進小的離屏緩衝區時粒子會大上好幾倍。小畫面是看路用的，不畫這個裝飾效果。
   */
  drawWithoutDust(draw: () => void): void;
}

/** 灰塵與落葉各用自己的亂數序列（種子加上這個位移），互不影響，也不影響場地擺設。 */
const DUST_SEED_OFFSET = 0x51;
const LEAF_SEED_OFFSET = 0xa7;
const RAIN_SEED_OFFSET = 0xd3;

/** 依天氣與 `?fx=off` 決定要不要建立的效果；都不給 = 黃昏（有落葉與灰塵、沒有雨）。 */
export interface SceneEffectOptions {
  /** 雨絲數；0 = 不下雨。 */
  readonly rainStreaks?: number;
  /** 雨絲數量少的級別（low）：每一條畫得長一點、亮一點。 */
  readonly sparseRain?: boolean;
  /** 落葉（下雨時、`?fx=off` 時不飄）。 */
  readonly leaves?: boolean;
  /** 車輪揚起的灰塵（下雨時不揚）。 */
  readonly dust?: boolean;
}

/**
 * @param spot 目標車位（落葉避開它與通路）
 * @param start 車的起點（世界座標）
 * @param seed 亂數種子
 * @param options 依天氣開關的效果
 */
export function createSceneEffects(
  quality: Pick<QualitySettings, 'tireMarks' | 'particles'>,
  spot: ParkingSpot,
  start: GroundVector,
  seed: number,
  options: SceneEffectOptions = {},
): SceneEffects {
  const root = new Group();
  root.name = 'effects';

  const tireMarks = quality.tireMarks.maxSegments > 0 ? createTireMarks(quality.tireMarks) : undefined;
  const dust =
    quality.particles.dust > 0 && (options.dust ?? true)
      ? createDust(quality.particles.dust, seed + DUST_SEED_OFFSET)
      : undefined;
  const leaves =
    quality.particles.leaves > 0 && (options.leaves ?? true)
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
  const rainStreaks = Math.round(options.rainStreaks ?? 0);
  const rain =
    rainStreaks > 0
      ? createRain(
          rainStreaks,
          seed + RAIN_SEED_OFFSET,
          options.sparseRain === true ? LOW_RAIN_STYLE : DEFAULT_RAIN_STYLE,
        )
      : undefined;
  if (rain !== undefined) {
    root.add(rain.lines);
  }

  // 風從一開始就吹：落葉與雨的位置只由累積時間決定，車還沒開動也在飄。
  // 定格截圖不傳時間（frameSeconds = 0），停在起始位置，所以可重現。
  let elapsedSeconds = 0;
  return {
    root,
    update(pose, frameSeconds) {
      elapsedSeconds += frameSeconds;
      tireMarks?.update(pose, frameSeconds);
      dust?.update(pose, frameSeconds);
      leaves?.setTime(elapsedSeconds);
      rain?.update(elapsedSeconds, pose.x, pose.z);
    },
    centerRainOn(x, z) {
      rain?.update(elapsedSeconds, x, z);
    },
    drawWithoutDust(draw) {
      if (dust === undefined || !dust.points.visible) {
        draw();
        return;
      }
      dust.points.visible = false;
      try {
        draw();
      } finally {
        dust.points.visible = true;
      }
    },
  };
}
