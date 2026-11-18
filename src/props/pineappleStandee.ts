// 巨型鳳梨吉祥物立牌：路邊的玻璃纖維吉祥物。配重底板、短桿、卵形的鳳梨身體（交錯排列的菱形凸粒）、
// 一圈往上往外張開的葉子、正面（−Z）的墨鏡與笑臉、兩隻短手（右手舉高揮手，戴白手套）。
// 本地 X = 橫向、−Z = 前方；外框的底面（X × Z）要剛好等於 obstacleTypes.ts 的預設碰撞盒（4 × 4 ft）。
import { BoxGeometry, ConeGeometry, SphereGeometry, type BufferGeometry } from 'three';
import { tinted } from './lotProps';
import { assemble, bar, blob, box, cylinder } from './partShapes';

const BODY = 0xf2b632;
const STUD = 0xc4841c;
const LEAF = 0x2f8a3a;
const LEAF_LIGHT = 0x49a84a;
const DARK = 0x15171a;
const GLOVE = 0xf7f5ef;

// 身體：橢球，中心高度與半徑（英尺）。
const BODY_Y = 4.3;
const BODY_RADIUS = 1.35;
const BODY_HALF_HEIGHT = 2.2;

/** 身體表面在高度 y 的水平半徑。 */
function bodyRadiusAt(y: number): number {
  const t = (y - BODY_Y) / BODY_HALF_HEIGHT;
  return BODY_RADIUS * Math.sqrt(Math.max(0, 1 - t * t));
}

/** 身體上的菱形凸粒：一排一排交錯，貼著表面朝外；正面的臉留空。 */
function studParts(): BufferGeometry[] {
  const parts: BufferGeometry[] = [];
  const rows = 10;
  const perRow = 14;
  for (let row = 0; row < rows; row += 1) {
    const latitude = (-0.62 + (1.24 * row) / (rows - 1)) * (Math.PI / 2);
    const y = BODY_Y + BODY_HALF_HEIGHT * Math.sin(latitude);
    const radius = BODY_RADIUS * Math.cos(latitude);
    // 表面法線的仰角：凸粒跟著表面傾斜。
    const tilt = -Math.atan2(Math.sin(latitude) / BODY_HALF_HEIGHT, Math.cos(latitude) / BODY_RADIUS);
    for (let index = 0; index < perRow; index += 1) {
      const angle = ((index + (row % 2) * 0.5) / perRow) * Math.PI * 2;
      const onFace = Math.cos(angle) < -0.76 && y > 3.2 && y < 5.5;
      if (onFace) {
        continue;
      }
      parts.push(
        tinted(
          new BoxGeometry(0.3, 0.3, 0.12)
            .rotateZ(Math.PI / 4)
            .rotateX(tilt)
            .translate(0, 0, radius)
            .rotateY(angle)
            .translate(0, y, 0),
          STUD,
        ),
      );
    }
  }
  return parts;
}

/** 頭頂的葉子：外圈往外張、內圈較直、中間一片最高；都是壓扁的尖錐。 */
function crownParts(): BufferGeometry[] {
  const baseY = BODY_Y + BODY_HALF_HEIGHT - 0.35;
  const leaf = (length: number, tiltRad: number, angle: number, out: number, color: number): BufferGeometry =>
    tinted(
      new ConeGeometry(0.34, length, 5)
        .scale(1, 1, 0.45)
        .translate(0, length / 2, out)
        .rotateX(tiltRad)
        .rotateY(angle)
        .translate(0, baseY, 0),
      color,
    );
  const parts: BufferGeometry[] = [];
  for (let index = 0; index < 8; index += 1) {
    parts.push(leaf(2, 0.62, (index / 8) * Math.PI * 2, 0.3, index % 2 === 0 ? LEAF : LEAF_LIGHT));
  }
  for (let index = 0; index < 5; index += 1) {
    parts.push(leaf(2.5, 0.28, ((index + 0.5) / 5) * Math.PI * 2, 0.15, index % 2 === 0 ? LEAF_LIGHT : LEAF));
  }
  parts.push(leaf(3, 0, 0, 0, LEAF));
  return parts;
}

/** 正面（−Z）的臉：墨鏡（兩片鏡片、鼻樑、鏡腳、反光）與一排往上彎的笑臉（中間露出牙齒）。 */
function faceParts(): BufferGeometry[] {
  const glassesY = 4.75;
  const lensZ = -bodyRadiusAt(glassesY + 0.3) - 0.02;
  const parts: BufferGeometry[] = [box(0.36, 0.14, 0.2, 0, glassesY + 0.36, lensZ, DARK)];
  for (const side of [-1, 1]) {
    parts.push(box(0.84, 0.6, 0.5, side * 0.58, glassesY, lensZ + 0.2, DARK));
    parts.push(box(0.3, 0.1, 0.04, side * 0.58 - 0.16, glassesY + 0.4, lensZ - 0.065, 0x66707c));
    // 鏡腳繞到身體側面。
    parts.push(bar([side * 0.98, glassesY + 0.42, lensZ + 0.3], [side * 1.36, glassesY + 0.42, 0.1], 0.1, DARK));
  }
  for (let index = -5; index <= 5; index += 1) {
    const x = index * 0.15;
    const y = 3.35 + 0.42 * (x / 0.75) ** 2;
    const z = -Math.sqrt(Math.max(0, bodyRadiusAt(y + 0.1) ** 2 - x * x));
    parts.push(box(0.17, 0.2, 0.12, x, y, z - 0.02, 0x2a1a12));
    if (Math.abs(index) <= 3) {
      parts.push(box(0.13, 0.2, 0.1, x, y + 0.2, z - 0.04, 0xfaf6ea));
    }
  }
  return parts;
}

/** 兩隻短手：左手（−X）插腰往下，右手（+X）舉高揮手；手上是白手套。都在 ±2 ft 以內。 */
function armParts(): BufferGeometry[] {
  return [
    bar([-1.2, 4.2, -0.1], [-1.66, 3.5, -0.25], 0.32, BODY),
    blob(0.3, -1.68, 3.38, -0.27, GLOVE),
    bar([1.15, 4.5, -0.1], [1.62, 5.55, -0.25], 0.32, BODY),
    blob(0.34, 1.64, 5.78, -0.27, GLOVE),
    // 張開的手指。
    blob(0.14, 1.42, 6.1, -0.27, GLOVE),
    blob(0.14, 1.64, 6.18, -0.27, GLOVE),
    blob(0.14, 1.84, 6.06, -0.27, GLOVE),
  ];
}

/** 巨型鳳梨吉祥物立牌的幾何（公尺，底面在 y = 0，帶頂點顏色）。 */
export function createPineappleStandeeGeometry(): BufferGeometry {
  return assemble([
    // 配重底板（最寬的一塊，剛好 4 × 4 ft）、圓形的底座與短桿。
    box(4, 0.3, 4, 0, 0, 0, 0x3a3d42),
    cylinder(1.3, 1.6, 0.35, 0, 0.3, 0, 0x565a60, 16),
    cylinder(0.24, 0.3, 1.9, 0, 0.65, 0, 0xa3a9af),
    cylinder(0.75, 0.5, 0.3, 0, 2.05, 0, LEAF),
    tinted(
      new SphereGeometry(1, 20, 14).scale(BODY_RADIUS, BODY_HALF_HEIGHT, BODY_RADIUS).translate(0, BODY_Y, 0),
      BODY,
    ),
    ...studParts(),
    ...crownParts(),
    ...faceParts(),
    ...armParts(),
  ]);
}
