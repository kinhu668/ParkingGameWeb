// 灰塵：車在動的時候，從後輪著地點附近揚起幾顆很淡的塵土，往上、往外擴散，一兩秒內淡掉。
// 純視覺、沒有碰撞。車速由相鄰兩次姿態的位移除以經過時間算出，不讀輸入、不碰物理。
// 亂數來自固定種子的產生器，同樣的姿態序列每次揚起的灰塵都一樣。
// 前半是純邏輯（粒子的環形緩衝），後半把它畫成一組 Points（一個 draw call）。
import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  DynamicDrawUsage,
  LinearFilter,
  Points,
  PointsMaterial,
  RGBAFormat,
  UnsignedByteType,
} from 'three';
import { right } from '../core/heading';
import { createRng } from '../core/rng';
import { SKIP_AMBIENT_OCCLUSION } from '../render/ambientOcclusionFlag';
import { PARTICLE_CONFIG } from '../render/renderConfig';
import type { VehiclePose } from '../vehicle/bicycleModel';
import { VEHICLE_CONFIG_SI } from '../vehicle/vehicleConfig';
import { rearWheelContacts } from './tireMarks';

const DUST = PARTICLE_CONFIG.dust;

/** 一顆灰塵在這個年齡（佔壽命的比例，0–1）的不透明度：很快浮現，之後慢慢淡掉。 */
export function dustOpacity(lifeFraction: number): number {
  if (!(lifeFraction >= 0 && lifeFraction < 1)) {
    return 0;
  }
  const rise = Math.min(lifeFraction / 0.15, 1);
  const fade = Math.min(Math.max((lifeFraction - 0.3) / 0.7, 0), 1);
  return DUST.opacity * rise * (1 - fade * fade * (3 - 2 * fade));
}

/** 灰塵粒子的環形緩衝：最多 capacity 顆，滿了蓋掉最舊的。 */
export interface DustCloud {
  readonly capacity: number;
  /** 各粒子的世界座標 (x, y, z)。 */
  readonly positions: Float32Array;
  /** 各粒子的直徑（公尺）；沒有粒子的格子是 0。 */
  readonly sizes: Float32Array;
  /** 各粒子的不透明度；沒有粒子的格子是 0。 */
  readonly opacities: Float32Array;
  /** 還沒淡掉的粒子數。 */
  liveCount(): number;
  /**
   * 車擺到新的姿態、過了 frameSeconds 秒：舊的粒子飄一段、變大變淡，車在動就從後輪附近揚起新的。
   * @returns 這次新揚起的粒子數
   */
  advance(pose: VehiclePose, frameSeconds: number): number;
}

/**
 * @param capacity 粒子上限（畫質級別的 particles.dust）
 * @param seed 亂數種子
 */
export function createDustCloud(capacity: number, seed: number): DustCloud {
  const rng = createRng(seed);
  const signed = (): number => rng() * 2 - 1;
  const positions = new Float32Array(capacity * 3);
  const velocities = new Float32Array(capacity * 3);
  const sizes = new Float32Array(capacity);
  const opacities = new Float32Array(capacity);
  const ages = new Float32Array(capacity).fill(Infinity);
  const lifetimes = new Float32Array(capacity).fill(1);
  let nextSlot = 0;
  let lastPose: VehiclePose | undefined;
  /** 還沒揚起的「零頭」：每走一段路累積一點，滿 1 就揚起一顆。 */
  let pending = 0;

  const spawn = (pose: VehiclePose, travelX: number, travelZ: number, speedMps: number): void => {
    const wheels = rearWheelContacts(pose);
    const outward = rng() < 0.5 ? -1 : 1;
    const wheel = outward < 0 ? wheels.left : wheels.right;
    const side = right(pose.headingRad);
    const trailMps = Math.min(DUST.trailSpeedFraction * speedMps, DUST.maxTrailSpeedMps);
    const offset = nextSlot * 3;
    positions[offset] = wheel.x + signed() * DUST.spawnSpreadM;
    positions[offset + 1] = rng() * DUST.spawnHeightM;
    positions[offset + 2] = wheel.z + signed() * DUST.spawnSpreadM;
    // 往行進的反方向甩、往外側散、往上飄；每顆都有一點差異。
    const outwardMps = outward * DUST.outwardSpeedMps * (0.4 + 0.6 * rng());
    velocities[offset] = -travelX * trailMps + side.x * outwardMps;
    velocities[offset + 1] = DUST.riseSpeedMps * (0.5 + 0.5 * rng());
    velocities[offset + 2] = -travelZ * trailMps + side.z * outwardMps;
    ages[nextSlot] = 0;
    lifetimes[nextSlot] =
      DUST.minLifetimeS + (DUST.maxLifetimeS - DUST.minLifetimeS) * rng();
    nextSlot = (nextSlot + 1) % capacity;
  };

  /** 依年齡更新每顆粒子的大小與不透明度；過了壽命的清掉。 */
  const refresh = (): void => {
    for (let slot = 0; slot < capacity; slot += 1) {
      const lifeFraction = (ages[slot] ?? Infinity) / (lifetimes[slot] ?? 1);
      if (lifeFraction < 1) {
        sizes[slot] = DUST.startSizeM + (DUST.endSizeM - DUST.startSizeM) * Math.sqrt(lifeFraction);
        opacities[slot] = dustOpacity(lifeFraction);
      } else {
        ages[slot] = Infinity;
        sizes[slot] = 0;
        opacities[slot] = 0;
      }
    }
  };

  return {
    capacity,
    positions,
    sizes,
    opacities,
    liveCount() {
      let count = 0;
      for (let slot = 0; slot < capacity; slot += 1) {
        if ((ages[slot] ?? Infinity) < (lifetimes[slot] ?? 1)) {
          count += 1;
        }
      }
      return count;
    },
    advance(pose, frameSeconds) {
      const previous = lastPose;
      lastPose = pose;
      // 沒有經過時間（定格截圖、第一幀）：算不出車速，也沒有東西要動。
      if (previous === undefined || capacity === 0 || frameSeconds <= 0) {
        return 0;
      }

      const drag = DUST.dragPerSecond ** frameSeconds;
      for (let slot = 0; slot < capacity; slot += 1) {
        if ((ages[slot] ?? Infinity) === Infinity) {
          continue;
        }
        ages[slot] = (ages[slot] ?? 0) + frameSeconds;
        for (let axis = 0; axis < 3; axis += 1) {
          const index = slot * 3 + axis;
          positions[index] = (positions[index] ?? 0) + (velocities[index] ?? 0) * frameSeconds;
          velocities[index] = (velocities[index] ?? 0) * drag;
        }
      }

      let spawned = 0;
      const dx = pose.x - previous.x;
      const dz = pose.z - previous.z;
      const stepM = Math.hypot(dx, dz);
      const speedMps = stepM / frameSeconds;
      // 瞬移（重來）不算在動。
      if (stepM <= DUST.teleportStepM && speedMps >= DUST.minSpeedMps) {
        const launch = Math.max(1 - speedMps / DUST.launchSpeedMps, 0);
        const steer = Math.min(Math.abs(pose.steerRad) / VEHICLE_CONFIG_SI.maxSteerRad, 1);
        pending +=
          stepM *
          capacity *
          DUST.emitPerMeterPerCapacity *
          (1 + DUST.launchBoost * launch) *
          (1 + DUST.steerBoost * steer);
        // 一次最多揚起整個緩衝那麼多（幀率極低時不會空轉）。
        pending = Math.min(pending, capacity);
        while (pending >= 1) {
          pending -= 1;
          spawn(pose, dx / stepM, dz / stepM, speedMps);
          spawned += 1;
        }
      }

      refresh();
      return spawned;
    },
  };
}

/** 柔邊圓點的貼圖位元組（RGBA）：白色，alpha 從中心往外平滑降到 0。純函式。 */
export function dustSpritePixels(sizePx: number): Uint8Array<ArrayBuffer> {
  const pixels = new Uint8Array(sizePx * sizePx * 4);
  const center = (sizePx - 1) / 2;
  for (let row = 0; row < sizePx; row += 1) {
    for (let column = 0; column < sizePx; column += 1) {
      const radius = Math.hypot(column - center, row - center) / (sizePx / 2);
      const falloff = Math.max(1 - radius, 0);
      const offset = (row * sizePx + column) * 4;
      pixels[offset] = 255;
      pixels[offset + 1] = 255;
      pixels[offset + 2] = 255;
      pixels[offset + 3] = Math.round(255 * falloff * falloff * (3 - 2 * falloff));
    }
  }
  return pixels;
}

const POINT_SIZE_ANCHOR = 'gl_PointSize = size;';

/**
 * PointsMaterial 的每顆粒子都一樣大；這裡把頂點著色器改成「每顆粒子自己的直徑（公尺）」。
 * 乘上投影矩陣的縮放，畫出來的大小在任何視角（FOV）下都是真實的世界尺寸。
 * 找不到插入點就丟錯（three 改版時寧可立刻發現）。
 */
export function patchDustVertexShader(vertexShader: string): string {
  if (!vertexShader.includes(POINT_SIZE_ANCHOR)) {
    throw new Error(`灰塵著色器：找不到插入點 ${POINT_SIZE_ANCHOR}`);
  }
  return vertexShader
    .replace('void main() {', 'attribute float dustSize;\nvoid main() {')
    .replace(POINT_SIZE_ANCHOR, 'gl_PointSize = dustSize * projectionMatrix[ 1 ][ 1 ];');
}

/** 畫在場景裡的灰塵。 */
export interface Dust {
  /** 全部的粒子是一組 Points（世界座標，直接加進場景）。沒有粒子的時候不畫。 */
  readonly points: Points;
  readonly cloud: DustCloud;
  /** 每個畫面幀呼叫：推進粒子，並把結果寫進頂點緩衝。 */
  update(pose: VehiclePose, frameSeconds: number): void;
}

/**
 * 建立灰塵的 Points：柔邊圓點、很淡的塵土色（不透明度寫在頂點顏色的 alpha）、不寫深度、不參與環境光遮蔽。
 * @param capacity 粒子上限（畫質級別的 particles.dust）
 */
export function createDust(capacity: number, seed: number): Dust {
  const cloud = createDustCloud(capacity, seed);
  // 頂點顏色固定是白的（乘上材質的塵土色），只有 alpha 隨年齡變。
  const colors = new Float32Array(capacity * 4).fill(1);
  const positionAttribute = new BufferAttribute(cloud.positions, 3).setUsage(DynamicDrawUsage);
  const sizeAttribute = new BufferAttribute(cloud.sizes, 1).setUsage(DynamicDrawUsage);
  const colorAttribute = new BufferAttribute(colors, 4).setUsage(DynamicDrawUsage);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('dustSize', sizeAttribute);
  geometry.setAttribute('color', colorAttribute);

  const sprite = new DataTexture(
    dustSpritePixels(DUST.spriteSizePx),
    DUST.spriteSizePx,
    DUST.spriteSizePx,
    RGBAFormat,
    UnsignedByteType,
  );
  sprite.magFilter = LinearFilter;
  sprite.minFilter = LinearFilter;
  sprite.needsUpdate = true;

  const material = new PointsMaterial({
    color: DUST.color,
    map: sprite,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = patchDustVertexShader(shader.vertexShader);
  };
  material.customProgramCacheKey = () => 'dust';

  const points = new Points(geometry, material);
  points.name = 'dust';
  points.castShadow = false;
  points.receiveShadow = false;
  // 粒子跟著車到處跑，幾何自己的包圍球沒有意義。
  points.frustumCulled = false;
  points.userData[SKIP_AMBIENT_OCCLUSION] = true;
  points.visible = false;

  return {
    points,
    cloud,
    update(pose, frameSeconds) {
      cloud.advance(pose, frameSeconds);
      const wasVisible = points.visible;
      points.visible = cloud.liveCount() > 0;
      if (!points.visible && !wasVisible) {
        return;
      }
      for (let slot = 0; slot < capacity; slot += 1) {
        colors[slot * 4 + 3] = cloud.opacities[slot] ?? 0;
      }
      positionAttribute.needsUpdate = true;
      sizeAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;
    },
  };
}
