// 車位標線：白色矩形外框，平貼地面、略高於地面避免與地面共面閃爍。
// 標線的外緣就是判定用的車位邊界：車身壓在線上算在內，超出線的外緣才算出界。
import { Mesh, MeshStandardMaterial, Path, Shape, ShapeGeometry } from 'three';
import { headingToRotationY } from '../core/heading';
import type { ParkingSpot } from '../level/parkingJudge';
import { SPOT_MARKING_CONFIG } from '../render/renderConfig';

/** 在 path 上畫一個以原點為中心的矩形。 */
function traceRectangle(path: Path, halfWidthM: number, halfLengthM: number): void {
  path.moveTo(-halfWidthM, -halfLengthM);
  path.lineTo(halfWidthM, -halfLengthM);
  path.lineTo(halfWidthM, halfLengthM);
  path.lineTo(-halfWidthM, halfLengthM);
  path.closePath();
}

/** 建立一個車位的標線網格（只收陰影不投影），已擺到車位的位置與朝向。 */
export function createSpotMarkings(spot: ParkingSpot): Mesh {
  const halfWidthM = spot.widthM / 2;
  const halfLengthM = spot.lengthM / 2;

  // 外框矩形挖掉內縮一個線寬的矩形，剩下的就是四條線。
  const outline = new Shape();
  traceRectangle(outline, halfWidthM, halfLengthM);
  const inner = new Path();
  traceRectangle(
    inner,
    halfWidthM - SPOT_MARKING_CONFIG.lineWidthM,
    halfLengthM - SPOT_MARKING_CONFIG.lineWidthM,
  );
  outline.holes.push(inner);

  // ShapeGeometry 立在 XY 平面、面朝 +Z；繞 X 轉 −90° 讓它躺平、面朝 +Y，
  // 這時形狀的 +Y 變成本地 −Z（車位的前方），符合「車頭朝本地 −Z」的建模約定。
  const geometry = new ShapeGeometry(outline).rotateX(-Math.PI / 2);
  const markings = new Mesh(
    geometry,
    new MeshStandardMaterial({
      color: SPOT_MARKING_CONFIG.color,
      roughness: SPOT_MARKING_CONFIG.roughness,
      metalness: 0,
    }),
  );
  markings.position.set(spot.x, SPOT_MARKING_CONFIG.liftM, spot.z);
  markings.rotation.y = headingToRotationY(spot.headingRad);
  markings.receiveShadow = true;
  return markings;
}
