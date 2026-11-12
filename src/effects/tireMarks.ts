// 倒車輪胎痕：倒車時沿左右後輪的軌跡，在地上留下一段一段深色的橡膠痕，過一陣子淡掉。
// 純視覺：不進物理、不進碰撞、不進停車判定。是不是在倒車由相鄰兩次姿態的位移判斷，不讀輸入。
// 前半是純邏輯（環形緩衝、何時落痕、淡出），後半把它畫成一個網格（一個 draw call）。
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { forward, right, type GroundVector } from '../core/heading';
import { SKIP_AMBIENT_OCCLUSION } from '../render/ambientOcclusionFlag';
import type { TireMarkQualitySettings } from '../render/quality';
import { CAR_VISUAL_CONFIG as VISUAL, TIRE_MARK_CONFIG as CONFIG } from '../render/renderConfig';
import type { VehiclePose } from '../vehicle/bicycleModel';
import { BODY_LAYOUT } from '../vehicle/carBody';
import { VEHICLE_CONFIG_SI } from '../vehicle/vehicleConfig';

/** 一段痕存 4 個角、每個角 (x, z)：起點左緣、起點右緣、終點右緣、終點左緣（世界座標）。 */
export const TIRE_MARK_FLOATS_PER_SEGMENT = 8;

const HALF_WHEELBASE_M = VEHICLE_CONFIG_SI.wheelbaseM / 2;
/** 後輪中心離車身中線多遠（與 carMesh.ts 擺輪子的位置相同）。 */
const WHEEL_OFFSET_M = BODY_LAYOUT.halfWidthM - VISUAL.wheelTuckM - VISUAL.wheelWidthM / 2;

/** 左右後輪著地點的世界座標。 */
export function rearWheelContacts(pose: VehiclePose): {
  readonly left: GroundVector;
  readonly right: GroundVector;
} {
  const ahead = forward(pose.headingRad);
  const side = right(pose.headingRad);
  const axleX = pose.x - ahead.x * HALF_WHEELBASE_M;
  const axleZ = pose.z - ahead.z * HALF_WHEELBASE_M;
  return {
    left: { x: axleX - side.x * WHEEL_OFFSET_M, z: axleZ - side.z * WHEEL_OFFSET_M },
    right: { x: axleX + side.x * WHEEL_OFFSET_M, z: axleZ + side.z * WHEEL_OFFSET_M },
  };
}

/** 一段痕在這個年齡的不透明度：前半段維持，之後平滑淡到 0。 */
export function tireMarkOpacity(ageS: number, lifetimeS: number): number {
  if (!(ageS < lifetimeS)) {
    return 0;
  }
  const fadeStartS = CONFIG.fadeStartFraction * lifetimeS;
  const t = Math.min(Math.max((ageS - fadeStartS) / (lifetimeS - fadeStartS), 0), 1);
  return CONFIG.opacity * (1 - t * t * (3 - 2 * t));
}

/** 輪胎痕的環形緩衝：最多 capacity 段，滿了蓋掉最舊的；每段過了壽命就消失。 */
export interface TireMarkTrail {
  readonly capacity: number;
  readonly lifetimeS: number;
  /** 各段的四個角（見 TIRE_MARK_FLOATS_PER_SEGMENT）。 */
  readonly corners: Float32Array;
  /** 各段的年齡（秒）；Infinity = 這一格是空的。 */
  readonly ages: Float32Array;
  /** 還看得到的段數。 */
  liveCount(): number;
  /**
   * 車擺到新的姿態、過了 frameSeconds 秒：舊的痕變老，倒車夠遠就在左右後輪各留一段。
   * @returns 這次新留下的段數（0 或 2）
   */
  advance(pose: VehiclePose, frameSeconds: number): number;
}

/** 下筆的位置：上一段結束時左右後輪的著地點與當時的車頭方向。 */
interface PenAnchor {
  readonly left: GroundVector;
  readonly right: GroundVector;
  readonly headingRad: number;
}

export function createTireMarkTrail(settings: TireMarkQualitySettings): TireMarkTrail {
  const capacity = settings.maxSegments;
  const corners = new Float32Array(capacity * TIRE_MARK_FLOATS_PER_SEGMENT);
  const ages = new Float32Array(capacity).fill(Infinity);
  let nextSlot = 0;
  let lastPose: VehiclePose | undefined;
  let pen: PenAnchor | undefined;

  /** 從 from（下筆時的車頭方向 fromHeadingRad）到 to 的一段；兩端的邊緣各自垂直於當時的車頭，相鄰兩段接得起來。 */
  const writeSegment = (
    from: GroundVector,
    fromHeadingRad: number,
    to: GroundVector,
    toHeadingRad: number,
  ): void => {
    const halfWidthM = CONFIG.widthM / 2;
    const fromSide = right(fromHeadingRad);
    const toSide = right(toHeadingRad);
    corners.set(
      [
        from.x - fromSide.x * halfWidthM,
        from.z - fromSide.z * halfWidthM,
        from.x + fromSide.x * halfWidthM,
        from.z + fromSide.z * halfWidthM,
        to.x + toSide.x * halfWidthM,
        to.z + toSide.z * halfWidthM,
        to.x - toSide.x * halfWidthM,
        to.z - toSide.z * halfWidthM,
      ],
      nextSlot * TIRE_MARK_FLOATS_PER_SEGMENT,
    );
    ages[nextSlot] = 0;
    nextSlot = (nextSlot + 1) % capacity;
  };

  return {
    capacity,
    lifetimeS: settings.lifetimeS,
    corners,
    ages,
    liveCount() {
      let count = 0;
      for (const ageS of ages) {
        if (ageS < settings.lifetimeS) {
          count += 1;
        }
      }
      return count;
    },
    advance(pose, frameSeconds) {
      for (let slot = 0; slot < capacity; slot += 1) {
        const ageS = (ages[slot] ?? Infinity) + frameSeconds;
        ages[slot] = ageS < settings.lifetimeS ? ageS : Infinity;
      }

      const previous = lastPose;
      lastPose = pose;
      if (previous === undefined || capacity === 0) {
        return 0;
      }
      const dx = pose.x - previous.x;
      const dz = pose.z - previous.z;
      const ahead = forward(pose.headingRad);
      const alongM = dx * ahead.x + dz * ahead.z;
      // 瞬移（重來）或往前開：提筆，不留痕。
      if (Math.hypot(dx, dz) > CONFIG.teleportStepM || alongM > CONFIG.minReverseStepM) {
        pen = undefined;
        return 0;
      }
      // 靜止、原地轉向：筆留在原地。
      if (alongM >= -CONFIG.minReverseStepM) {
        return 0;
      }

      const wheels = rearWheelContacts(pose);
      if (pen === undefined) {
        pen = { ...wheels, headingRad: pose.headingRad };
        return 0;
      }
      const movedM = Math.max(
        Math.hypot(wheels.left.x - pen.left.x, wheels.left.z - pen.left.z),
        Math.hypot(wheels.right.x - pen.right.x, wheels.right.z - pen.right.z),
      );
      if (movedM < CONFIG.segmentLengthM) {
        return 0;
      }
      writeSegment(pen.left, pen.headingRad, wheels.left, pose.headingRad);
      writeSegment(pen.right, pen.headingRad, wheels.right, pose.headingRad);
      pen = { ...wheels, headingRad: pose.headingRad };
      return 2;
    },
  };
}

const VERTICES_PER_SEGMENT = 4;

/** 畫在場景裡的輪胎痕。 */
export interface TireMarks {
  /** 全部的痕是一個網格（世界座標，直接加進場景）。沒有痕的時候不畫。 */
  readonly mesh: Mesh;
  readonly trail: TireMarkTrail;
  /** 每個畫面幀呼叫：推進環形緩衝，並把結果寫進網格。 */
  update(pose: VehiclePose, frameSeconds: number): void;
}

/**
 * 建立輪胎痕的網格：每段一個貼地的四邊形，深灰、半透明（不透明度寫在頂點顏色的 alpha）、
 * 不寫深度、不投影。高度比車位標線低，痕穿過標線時標線仍然完整。
 */
export function createTireMarks(settings: TireMarkQualitySettings): TireMarks {
  const trail = createTireMarkTrail(settings);
  const { capacity } = trail;

  const positions = new Float32Array(capacity * VERTICES_PER_SEGMENT * 3);
  for (let offset = 1; offset < positions.length; offset += 3) {
    positions[offset] = CONFIG.liftM;
  }
  // 頂點顏色固定是白的（乘上材質的深灰），只有 alpha 隨年齡變。
  const colors = new Float32Array(capacity * VERTICES_PER_SEGMENT * 4).fill(1);
  const indices: number[] = [];
  for (let slot = 0; slot < capacity; slot += 1) {
    const first = slot * VERTICES_PER_SEGMENT;
    indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
  }
  const positionAttribute = new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage);
  const colorAttribute = new BufferAttribute(colors, 4).setUsage(DynamicDrawUsage);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', colorAttribute);
  geometry.setIndex(indices);

  const mesh = new Mesh(
    geometry,
    new MeshBasicMaterial({
      color: CONFIG.color,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  mesh.name = 'tireMarks';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  // 痕散在整個場地，網格自己的包圍球沒有意義。
  mesh.frustumCulled = false;
  // 比其他半透明的東西（車位標線、光斑）先畫：它們疊在痕的上面。
  mesh.renderOrder = -1;
  mesh.userData[SKIP_AMBIENT_OCCLUSION] = true;
  mesh.visible = false;

  return {
    mesh,
    trail,
    update(pose, frameSeconds) {
      const added = trail.advance(pose, frameSeconds);
      const wasVisible = mesh.visible;
      mesh.visible = trail.liveCount() > 0;
      if (!mesh.visible && !wasVisible) {
        return;
      }

      if (added > 0) {
        for (let slot = 0; slot < capacity; slot += 1) {
          for (let corner = 0; corner < VERTICES_PER_SEGMENT; corner += 1) {
            const source = slot * TIRE_MARK_FLOATS_PER_SEGMENT + corner * 2;
            const target = (slot * VERTICES_PER_SEGMENT + corner) * 3;
            positions[target] = trail.corners[source] ?? 0;
            positions[target + 2] = trail.corners[source + 1] ?? 0;
          }
        }
        positionAttribute.needsUpdate = true;
      }
      for (let slot = 0; slot < capacity; slot += 1) {
        const alpha = tireMarkOpacity(trail.ages[slot] ?? Infinity, trail.lifetimeS);
        for (let corner = 0; corner < VERTICES_PER_SEGMENT; corner += 1) {
          colors[(slot * VERTICES_PER_SEGMENT + corner) * 4 + 3] = alpha;
        }
      }
      colorAttribute.needsUpdate = true;
    },
  };
}
