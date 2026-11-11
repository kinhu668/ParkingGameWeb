// heading 約定（規格第 6 節）：0 朝 −Z，從上方看順時針為正。
// 地面是 XZ 平面；從上方看 +X 在右、+Z 在下，所以 0 = 北(−Z)、90° = 東(+X)、180° = 南(+Z)、270° = 西(−X)。
// 這個檔案的角度全部是弧度；度 ↔ 弧度請用 units.ts。

const HALF_TURN_RAD = Math.PI;
const FULL_TURN_RAD = 2 * Math.PI;

/** 地面（XZ 平面）上的向量或點。 */
export interface GroundVector {
  readonly x: number;
  readonly z: number;
}

/** 車頭方向的單位向量：( sin θ, −cos θ )。 */
export function forward(headingRad: number): GroundVector {
  return { x: Math.sin(headingRad), z: -Math.cos(headingRad) };
}

/** 車身右側方向的單位向量：( cos θ, sin θ )。 */
export function right(headingRad: number): GroundVector {
  return { x: Math.cos(headingRad), z: Math.sin(headingRad) };
}

/**
 * 由方向向量反推 heading：θ = atan2(dx, −dz)。向量不必是單位長。
 * 回傳值是 atan2 的範圍 [−π, π]（例如朝 −X 回傳 −π/2，與 270° 等價）；比較角度請用 headingDelta。
 */
export function headingFromDirection(dx: number, dz: number): number {
  return Math.atan2(dx, -dz);
}

/**
 * 從 fromRad 轉到 toRad 的最短有號夾角，折到 (−π, π]；正值 = 順時針。
 * 剛好反向時回傳 +π，不論引數順序。
 */
export function headingDelta(fromRad: number, toRad: number): number {
  const turn = (((toRad - fromRad) % FULL_TURN_RAD) + FULL_TURN_RAD) % FULL_TURN_RAD;
  return turn > HALF_TURN_RAD ? turn - FULL_TURN_RAD : turn;
}

/**
 * heading → Three.js 的 rotation.y。
 * rotation.y 是繞 +Y 的右手旋轉（從上方看逆時針為正），與 heading 方向相反，所以 φ = −θ。
 * 前提：模型車頭朝本地 −Z、右側是本地 +X。這個負號全專案只准出現在這裡。
 */
export function headingToRotationY(headingRad: number): number {
  return -headingRad;
}
