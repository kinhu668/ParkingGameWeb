// 落葉：場地上少量的枯葉，在弱風裡一輪一輪地「飄落 → 停在地上 → 被吹一小段（幾次）→ 被風捲走」。
// 純視覺、沒有碰撞。每片葉子任何時刻的位置都只由固定種子與累積時間決定（沒有逐幀累積的狀態），
// 所以同一個時間點畫出來永遠一樣。葉子的整條路徑都避開起點到車位的通路、目標車位與 `?cam=spot_low` 的鏡頭前方。
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { createRng } from '../core/rng';
import { forward, right, type GroundVector } from '../core/heading';
import { degToRad } from '../core/units';
import type { ParkingSpot } from '../level/parkingJudge';
import { curbInnerBounds } from '../props/lotEdges';
import {
  lotKeepOutZones,
  pointInKeepOut,
  spotLocalToWorld,
  worldToSpotLocal,
} from '../props/lotLayout';
import { PARTICLE_CONFIG } from '../render/renderConfig';

const LEAF = PARTICLE_CONFIG.leaf;
const FULL_TURN_RAD = 2 * Math.PI;

/** 找落點時每片葉子最多試幾次；試不到（場地幾乎全是禁區）就少放一片。 */
const PLACEMENT_ATTEMPTS = 40;
/** 檢查路徑有沒有碰到禁區的取樣間距。 */
const PATH_SAMPLE_STEP_M = 0.4;

/** 一片葉子固定不變的參數。 */
interface Leaf {
  /** 落點（世界座標）；之後順風一小段一小段移動。 */
  readonly homeX: number;
  readonly homeZ: number;
  readonly cycleS: number;
  /** 這片葉子在自己的一輪裡領先多少（0–1），大家才不會同時落下。 */
  readonly phase: number;
  readonly hops: number;
  readonly hopLengthM: number;
  readonly sizeM: number;
  readonly yawRad: number;
  /** 飄落與被吹起時往哪一側擺（±1）、翻幾圈。 */
  readonly swaySide: number;
  readonly tumbleTurns: number;
  readonly colorIndex: number;
}

/** 一片葉子在某個時刻的姿態（世界座標）。scale 是 0–1：剛出現與被捲走時縮小。 */
export interface LeafState {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yawRad: number;
  /** 繞葉子自己的橫軸翻轉的角度；停在地上時是一點點傾斜。 */
  readonly tumbleRad: number;
  readonly scale: number;
}

/** 整片場地的落葉。 */
export interface LeafField {
  readonly count: number;
  /** 第 index 片葉子的長度（公尺）與顏色在色表裡的索引。 */
  sizeM(index: number): number;
  colorIndex(index: number): number;
  /** 第 index 片葉子在累積時間 timeS（秒）的姿態。 */
  stateAt(index: number, timeS: number): LeafState;
}

function smooth(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return clamped * clamped * (3 - 2 * clamped);
}

/** 風吹去的方向（世界座標的單位向量）與它的右手邊（葉子左右擺動的方向）。 */
const WIND = forward(degToRad(PARTICLE_CONFIG.windHeadingDeg));
const ACROSS_WIND = right(degToRad(PARTICLE_CONFIG.windHeadingDeg));

/** 葉子在地上一共順風走多遠（幾小段，加上最後被捲走的那一段）。 */
function pathLengthM(hops: number, hopLengthM: number): number {
  return hops * hopLengthM + LEAF.blowLengthM;
}

/**
 * 建立落葉。位置由種子決定；每片葉子的整條路徑（含左右擺動的幅度）都在路緣內、禁區外。
 * @param start 車的起點（世界座標）
 * @param count 要幾片（畫質級別的 particles.leaves）
 */
export function createLeafField(
  spot: ParkingSpot,
  start: GroundVector,
  seed: number,
  count: number,
): LeafField {
  const rng = createRng(seed);
  const between = (low: number, high: number): number => low + (high - low) * rng();
  const bounds = curbInnerBounds(spot);
  const zones = lotKeepOutZones(spot, start);

  /** 世界座標的這一點可不可以有葉子：在路緣內（留一點邊）而且不在禁區裡。 */
  const allowed = (x: number, z: number): boolean => {
    const local = worldToSpotLocal(spot, x, z);
    return (
      local.x >= bounds.minX + LEAF.curbMarginM &&
      local.x <= bounds.maxX - LEAF.curbMarginM &&
      local.z >= bounds.minZ + LEAF.curbMarginM &&
      local.z <= bounds.maxZ - LEAF.curbMarginM &&
      !pointInKeepOut(zones, local.x, local.z)
    );
  };
  const pathAllowed = (homeX: number, homeZ: number, lengthM: number): boolean => {
    const steps = Math.ceil(lengthM / PATH_SAMPLE_STEP_M);
    for (let step = 0; step <= steps; step += 1) {
      const alongM = (lengthM * step) / steps;
      for (const acrossM of [-LEAF.swayM, 0, LEAF.swayM]) {
        const x = homeX + WIND.x * alongM + ACROSS_WIND.x * acrossM;
        const z = homeZ + WIND.z * alongM + ACROSS_WIND.z * acrossM;
        if (!allowed(x, z)) {
          return false;
        }
      }
    }
    return true;
  };

  const leaves: Leaf[] = [];
  for (let index = 0; index < count; index += 1) {
    const hops = LEAF.minHops + Math.floor(rng() * (LEAF.maxHops - LEAF.minHops + 1));
    const hopLengthM = between(LEAF.minHopLengthM, LEAF.maxHopLengthM);
    for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt += 1) {
      const home = spotLocalToWorld(
        spot,
        between(bounds.minX, bounds.maxX),
        between(bounds.minZ, bounds.maxZ),
      );
      if (!pathAllowed(home.x, home.z, pathLengthM(hops, hopLengthM))) {
        continue;
      }
      leaves.push({
        homeX: home.x,
        homeZ: home.z,
        cycleS: between(LEAF.minCycleS, LEAF.maxCycleS),
        phase: rng(),
        hops,
        hopLengthM,
        sizeM: between(LEAF.minSizeM, LEAF.maxSizeM),
        yawRad: rng() * FULL_TURN_RAD,
        swaySide: rng() < 0.5 ? -1 : 1,
        tumbleTurns: 1 + Math.floor(rng() * 2),
        colorIndex: Math.floor(rng() * LEAF.colors.length),
      });
      break;
    }
  }

  const stateOf = (leaf: Leaf, timeS: number): LeafState => {
    const turns = timeS / leaf.cycleS + leaf.phase;
    const u = turns - Math.floor(turns);
    /** 順風走了多遠、往側邊擺了多遠。 */
    let alongM: number;
    let acrossM = 0;
    let y = LEAF.restLiftM;
    let tumbleRad = LEAF.restTiltRad;
    let yawRad = leaf.yawRad;
    let scale = 1;

    if (u < LEAF.fallFraction) {
      // 飄落：左右擺著往下掉，落地時剛好回到落點、葉面躺平。
      const t = u / LEAF.fallFraction;
      alongM = 0;
      acrossM = leaf.swaySide * LEAF.swayM * Math.sin(2 * Math.PI * t) * (1 - t);
      y = LEAF.restLiftM + LEAF.fallHeightM * (1 - t) ** 1.5;
      tumbleRad = LEAF.restTiltRad + leaf.tumbleTurns * FULL_TURN_RAD * (1 - smooth(t));
      yawRad += (1 - t) * Math.PI;
      scale = smooth(t / 0.2);
    } else if (u < 1 - LEAF.blowFraction) {
      // 中段：分成 hops 個小段，每段先停在地上，再被吹起來順風走一小段。
      const slot = ((u - LEAF.fallFraction) / (1 - LEAF.fallFraction - LEAF.blowFraction)) * leaf.hops;
      const hop = Math.min(Math.floor(slot), leaf.hops - 1);
      const t = Math.max((slot - hop - LEAF.restFraction) / (1 - LEAF.restFraction), 0);
      alongM = (hop + smooth(t)) * leaf.hopLengthM;
      acrossM = leaf.swaySide * 0.5 * LEAF.swayM * Math.sin(Math.PI * t);
      y = LEAF.restLiftM + LEAF.hopHeightM * Math.sin(Math.PI * t);
      tumbleRad = LEAF.restTiltRad + leaf.tumbleTurns * FULL_TURN_RAD * smooth(t);
      // 每落地一次換一個朝向。
      yawRad += (hop + smooth(t)) * 1.7;
    } else {
      // 被風捲走：越吹越快、越升越高，同時縮小到消失；下一輪從落點上空重新飄落。
      const t = (u - (1 - LEAF.blowFraction)) / LEAF.blowFraction;
      alongM = leaf.hops * leaf.hopLengthM + LEAF.blowLengthM * t * t;
      y = LEAF.restLiftM + LEAF.blowHeightM * t * t;
      tumbleRad = LEAF.restTiltRad + (leaf.tumbleTurns + 1) * FULL_TURN_RAD * t;
      yawRad += leaf.hops * 1.7 + t * Math.PI;
      scale = 1 - smooth((t - 0.4) / 0.6);
    }

    return {
      x: leaf.homeX + WIND.x * alongM + ACROSS_WIND.x * acrossM,
      y,
      z: leaf.homeZ + WIND.z * alongM + ACROSS_WIND.z * acrossM,
      yawRad,
      tumbleRad,
      scale,
    };
  };

  const leafAt = (index: number): Leaf => {
    const leaf = leaves[index];
    if (leaf === undefined) {
      throw new Error(`沒有第 ${index} 片落葉`);
    }
    return leaf;
  };

  return {
    count: leaves.length,
    sizeM: (index) => leafAt(index).sizeM,
    colorIndex: (index) => leafAt(index).colorIndex,
    stateAt: (index, timeS) => stateOf(leafAt(index), timeS),
  };
}

/**
 * 一片葉子的幾何：菱形的葉面沿中肋微微對折，躺在本地 XZ 平面、長度 1（葉尖朝 −Z）。
 * 兩個三角形各有自己的法線，對折的稜線才看得出來。
 */
function createLeafGeometry(): BufferGeometry {
  const tip = [0, 0, -0.5];
  const stem = [0, 0, 0.5];
  const rightEdge = [0.3, 0.07, 0.04];
  const leftEdge = [-0.3, 0.07, 0.04];
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(
      new Float32Array([...tip, ...stem, ...rightEdge, ...tip, ...leftEdge, ...stem]),
      3,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}

/** 畫在場景裡的落葉。 */
export interface Leaves {
  /** 全部的葉子是一個 InstancedMesh（世界座標，直接加進場景）。 */
  readonly mesh: InstancedMesh;
  readonly field: LeafField;
  /** 把每片葉子擺到累積時間 timeS 的姿態。 */
  setTime(timeS: number): void;
}

/** 建立落葉的網格：不投影（太小，影子只是雜點）、收陰影、雙面。 */
export function createLeaves(
  spot: ParkingSpot,
  start: GroundVector,
  seed: number,
  count: number,
): Leaves {
  const field = createLeafField(spot, start, seed, count);
  const mesh = new InstancedMesh(
    createLeafGeometry(),
    new MeshStandardMaterial({ color: 0xffffff, roughness: LEAF.roughness, side: DoubleSide }),
    field.count,
  );
  mesh.name = 'leaves';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  // 葉子散在整個場地而且會動，幾何自己的包圍球沒有意義。
  mesh.frustumCulled = false;
  for (let index = 0; index < field.count; index += 1) {
    mesh.setColorAt(index, new Color(LEAF.colors[field.colorIndex(index)] ?? LEAF.colors[0]));
  }

  const matrix = new Matrix4();
  const position = new Vector3();
  const rotation = new Quaternion();
  const euler = new Euler(0, 0, 0, 'YXZ');
  const scale = new Vector3();
  const setTime = (timeS: number): void => {
    for (let index = 0; index < field.count; index += 1) {
      const state = field.stateAt(index, timeS);
      position.set(state.x, state.y, state.z);
      euler.set(state.tumbleRad, state.yawRad, 0);
      rotation.setFromEuler(euler);
      scale.setScalar(field.sizeM(index) * state.scale);
      mesh.setMatrixAt(index, matrix.compose(position, rotation, scale));
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  setTime(0);

  return { mesh, field, setTime };
}
