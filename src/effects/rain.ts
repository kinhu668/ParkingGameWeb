// 雨絲：一個跟著車走的長方體裡的短線段，全部在一個 LineSegments 裡（一個 draw call）。純視覺。
// 每個畫質級別都有；low 的數量少，每一條畫得長一點、亮一點（LOW_RAIN_STYLE）。
// 每條雨絲的位置只由種子與累積時間決定：同一個時間畫出來一樣，`?cam` 定格（時間 0）也看得到雨。
// 雨絲釘在世界座標上（用長方體的邊長取餘數繞回來），車開動時雨不會跟著車平移。
import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments } from 'three';
import { createRng } from '../core/rng';
import { SKIP_AMBIENT_OCCLUSION } from '../render/ambientOcclusionFlag';
import { RAIN_CONFIG as CONFIG } from '../render/weatherPresets';

/** 一條雨絲在時間 0 的位置：x、z 在 [0, 邊長)、y 在 [0, 高)。 */
export interface RainStreak {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** 固定種子的雨絲起始位置。 */
export function createRainStreaks(seed: number, count: number): RainStreak[] {
  const rng = createRng(seed);
  const streaks: RainStreak[] = [];
  for (let index = 0; index < count; index += 1) {
    streaks.push({
      x: rng() * CONFIG.boxSizeM,
      y: rng() * CONFIG.boxHeightM,
      z: rng() * CONFIG.boxSizeM,
    });
  }
  return streaks;
}

/** 正的餘數：結果在 [0, size)。 */
function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

/**
 * 一條雨絲在累積時間 timeS、長方體中心在 (centerX, centerZ) 時的頂端位置（世界座標）。
 * 往下掉、被風吹斜；掉到地面就從頂端再來。
 */
export function rainStreakTop(
  streak: RainStreak,
  timeS: number,
  centerX: number,
  centerZ: number,
): { x: number; y: number; z: number } {
  const half = CONFIG.boxSizeM / 2;
  const worldX = streak.x + CONFIG.windXMps * timeS;
  const worldZ = streak.z + CONFIG.windZMps * timeS;
  return {
    x: centerX - half + wrap(worldX - centerX + half, CONFIG.boxSizeM),
    y: wrap(streak.y - CONFIG.fallSpeedMps * timeS, CONFIG.boxHeightM),
    z: centerZ - half + wrap(worldZ - centerZ + half, CONFIG.boxSizeM),
  };
}

export interface Rain {
  /** 雨絲的網格（世界座標），加進場景。 */
  readonly lines: LineSegments;
  /** 把雨絲擺到累積時間 timeS、以 (centerX, centerZ) 為中心的位置。 */
  update(timeS: number, centerX: number, centerZ: number): void;
}

const POSITION_ITEM_SIZE = 3;
const VERTICES_PER_STREAK = 2;

/** 一條雨絲畫多長、多不透明。 */
export interface RainStreakStyle {
  readonly lengthM: number;
  readonly opacity: number;
}

/** 一般的雨絲（medium 以上）。 */
export const DEFAULT_RAIN_STYLE: RainStreakStyle = {
  lengthM: CONFIG.streakLengthM,
  opacity: CONFIG.opacity,
};

/** low 的雨絲：數量少，每一條長一點、亮一點。 */
export const LOW_RAIN_STYLE: RainStreakStyle = {
  lengthM: CONFIG.streakLengthM * CONFIG.lowStreak.lengthScale,
  opacity: CONFIG.lowStreak.opacity,
};

/**
 * @param count 雨絲數
 * @param seed 亂數種子
 * @param style 一條雨絲的長度與不透明度；不給 = 一般的
 */
export function createRain(count: number, seed: number, style: RainStreakStyle = DEFAULT_RAIN_STYLE): Rain {
  const streaks = createRainStreaks(seed, count);
  const positions = new Float32Array(count * VERTICES_PER_STREAK * POSITION_ITEM_SIZE);
  const geometry = new BufferGeometry();
  const attribute = new BufferAttribute(positions, POSITION_ITEM_SIZE);
  geometry.setAttribute('position', attribute);
  const lines = new LineSegments(
    geometry,
    new LineBasicMaterial({
      color: CONFIG.color,
      transparent: true,
      opacity: style.opacity,
      depthWrite: false,
      // 雨絲都在車附近（長方體只有幾十公尺）：不吃霧，貼地的霧氣才不會把雨絲蓋成霧色。
      fog: false,
    }),
  );
  lines.name = 'rain';
  // 位置每幀都在變，包圍球沒有意義；不做視錐剔除。
  lines.frustumCulled = false;
  lines.userData[SKIP_AMBIENT_OCCLUSION] = true;

  // 雨絲的方向：沿著落下的速度（往下＋風）往回拉一段固定的長度。
  const speed = Math.hypot(CONFIG.fallSpeedMps, CONFIG.windXMps, CONFIG.windZMps);
  const tailX = (-CONFIG.windXMps / speed) * style.lengthM;
  const tailY = (CONFIG.fallSpeedMps / speed) * style.lengthM;
  const tailZ = (-CONFIG.windZMps / speed) * style.lengthM;

  return {
    lines,
    update(timeS, centerX, centerZ) {
      streaks.forEach((streak, index) => {
        const head = rainStreakTop(streak, timeS, centerX, centerZ);
        const offset = index * VERTICES_PER_STREAK * POSITION_ITEM_SIZE;
        positions[offset] = head.x;
        positions[offset + 1] = head.y;
        positions[offset + 2] = head.z;
        positions[offset + 3] = head.x + tailX;
        positions[offset + 4] = head.y + tailY;
        positions[offset + 5] = head.z + tailZ;
      });
      attribute.needsUpdate = true;
    },
  };
}
