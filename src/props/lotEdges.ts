// 停車場的邊界擺設：圍住場地的路緣石，與車位盡頭的車擋。
// 兩者都是純視覺：不進物理、不進碰撞、不進停車判定（判定只看 parkingJudge 的車位矩形）。
import {
  BoxGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  type BufferGeometry,
} from 'three';
import { headingToRotationY } from '../core/heading';
import { createScenerySurface } from '../materials/surfaceMaterial';
import type { ParkingSpot } from '../level/parkingJudge';
import { CURB_CONFIG, WHEEL_STOP_CONFIG } from '../render/renderConfig';
import type { GroundEdgeBox } from './groundShader';
import type { PropPlacement } from './lotLayout';

/** 車位本地座標裡的一個矩形（公尺）；本地 −Z 是車位前方、+X 是右方。 */
export interface LocalRect {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

/** 路緣石圍出來的場地內緣（車位本地座標）。 */
export function curbInnerBounds(spot: ParkingSpot): LocalRect {
  return {
    minX: -CURB_CONFIG.halfWidthM,
    maxX: CURB_CONFIG.halfWidthM,
    minZ: -(spot.lengthM / 2 + CURB_CONFIG.aheadOfSpotM),
    maxZ: CURB_CONFIG.behindSpotM,
  };
}

/** 車擋底面佔的範圍（車位本地座標）：整個在車位前緣之外。 */
export function wheelStopFootprint(spot: ParkingSpot): LocalRect {
  const nearZ = -(spot.lengthM / 2 + WHEEL_STOP_CONFIG.gapFromSpotM);
  return {
    minX: -WHEEL_STOP_CONFIG.lengthM / 2,
    maxX: WHEEL_STOP_CONFIG.lengthM / 2,
    minZ: nearZ - WHEEL_STOP_CONFIG.baseDepthM,
    maxZ: nearZ,
  };
}

/** 路緣石的四段各佔的範圍（車位本地座標）：前、後、左、右。前後兩段只有內緣那麼長，左右兩段把四個轉角補滿。 */
export function curbSegmentRects(spot: ParkingSpot): readonly LocalRect[] {
  const { widthM } = CURB_CONFIG;
  const inner = curbInnerBounds(spot);
  return [
    { minX: inner.minX, maxX: inner.maxX, minZ: inner.minZ - widthM, maxZ: inner.minZ },
    { minX: inner.minX, maxX: inner.maxX, minZ: inner.maxZ, maxZ: inner.maxZ + widthM },
    { minX: inner.minX - widthM, maxX: inner.minX, minZ: inner.minZ - widthM, maxZ: inner.maxZ + widthM },
    { minX: inner.maxX, maxX: inner.maxX + widthM, minZ: inner.minZ - widthM, maxZ: inner.maxZ + widthM },
  ];
}

/**
 * 路緣石四段與車擋，當成箱子（底面範圍是車位本地座標）。地面的著色器用它們直接算影子（groundShader.ts 的 GroundEdgeShadows）：
 * 黃昏的太陽很低，這些東西又只有十幾公分高，在蓋住整塊場地的陰影貼圖裡只有兩三個像素，光靠貼圖影子會斷斷續續。
 * 車擋的斷面是梯形，這裡取頂面與底面寬度的平均。
 */
export function edgeShadowBoxes(spot: ParkingSpot): readonly GroundEdgeBox[] {
  const stop = wheelStopFootprint(spot);
  const stopInsetM = (WHEEL_STOP_CONFIG.baseDepthM - WHEEL_STOP_CONFIG.topDepthM) / 4;
  return [
    ...curbSegmentRects(spot).map((rect) => ({ ...rect, heightM: CURB_CONFIG.heightM })),
    {
      minX: stop.minX,
      maxX: stop.maxX,
      minZ: stop.minZ + stopInsetM,
      maxZ: stop.maxZ - stopInsetM,
      heightM: WHEEL_STOP_CONFIG.heightM,
    },
  ];
}

/** 朝向離 90° 的倍數在這個角度內，才當成與座標軸平行。 */
const AXIS_ALIGNED_EPSILON_RAD = 1e-3;

/**
 * 假車位的車擋（createLotLayout 的 wheelStops，車位本地座標）當成箱子，給地面的著色器直接算影子。
 * 車擋只有十一公分高：陰影貼圖粗的畫質級別（low、medium）法線偏移比它還大，貼圖裡完全畫不出它的影子。
 * 箱子是軸對齊的，所以只收朝向是 90° 倍數的（假車位都是）；其餘的略過，留給陰影貼圖。
 */
export function wheelStopShadowBoxes(placements: readonly PropPlacement[]): GroundEdgeBox[] {
  const stopInsetM = (WHEEL_STOP_CONFIG.baseDepthM - WHEEL_STOP_CONFIG.topDepthM) / 4;
  const boxes: GroundEdgeBox[] = [];
  for (const placement of placements) {
    const quarterTurns = placement.headingRad / (Math.PI / 2);
    if (Math.abs(quarterTurns - Math.round(quarterTurns)) > AXIS_ALIGNED_EPSILON_RAD) {
      continue;
    }
    // 長邊沿本地 X（sizeX）；轉了奇數個 90° 就換成沿 Z。斷面是梯形，深度取頂面與底面的平均。
    const turned = Math.abs(Math.round(quarterTurns)) % 2 === 1;
    const halfLongM = placement.sizeX / 2;
    const halfDepthM = placement.sizeZ / 2 - stopInsetM;
    const halfX = turned ? halfDepthM : halfLongM;
    const halfZ = turned ? halfLongM : halfDepthM;
    boxes.push({
      minX: placement.x - halfX,
      maxX: placement.x + halfX,
      minZ: placement.z - halfZ,
      maxZ: placement.z + halfZ,
      heightM: placement.sizeY,
    });
  }
  return boxes;
}

/** 擺到車位的位置與朝向的空群組；子物件用車位本地座標。 */
export function createSpotFrame(spot: ParkingSpot): Group {
  const frame = new Group();
  frame.position.set(spot.x, 0, spot.z);
  frame.rotation.y = headingToRotationY(spot.headingRad);
  return frame;
}

/**
 * 路緣石：沿場地內緣外側的一圈水泥條（四段箱子，轉角處由左右兩段補滿）。
 * 純視覺，車可以穿過去。會投影到陰影貼圖（標線、車身上的影子）；落在地面上的影子另由地面著色器補完整。
 */
export function createCurbs(spot: ParkingSpot): Group {
  const { heightM } = CURB_CONFIG;
  const material = createScenerySurface('concrete', {
    color: CURB_CONFIG.color,
    roughness: CURB_CONFIG.roughness,
  });

  const frame = createSpotFrame(spot);
  for (const rect of curbSegmentRects(spot)) {
    const segment = new Mesh(
      new BoxGeometry(rect.maxX - rect.minX, heightM, rect.maxZ - rect.minZ),
      material,
    );
    segment.position.set((rect.minX + rect.maxX) / 2, heightM / 2, (rect.minZ + rect.maxZ) / 2);
    segment.castShadow = true;
    segment.receiveShadow = true;
    frame.add(segment);
  }
  return frame;
}

/** 車擋的幾何：梯形斷面的水泥塊，長邊沿本地 X，底面在 y = 0、中心在原點。假車位的車擋也用這個。 */
export function createWheelStopGeometry(): BufferGeometry {
  const { lengthM, baseDepthM, topDepthM, heightM } = WHEEL_STOP_CONFIG;
  // 梯形斷面畫在 XY 平面（X = 前後方向、Y = 高），沿 Z 擠出長度，再轉成橫跨車位。
  const profile = new Shape();
  profile.moveTo(-baseDepthM / 2, 0);
  profile.lineTo(baseDepthM / 2, 0);
  profile.lineTo(topDepthM / 2, heightM);
  profile.lineTo(-topDepthM / 2, heightM);
  profile.closePath();
  return new ExtrudeGeometry(profile, { depth: lengthM, bevelEnabled: false })
    .translate(0, 0, -lengthM / 2)
    .rotateY(Math.PI / 2);
}

/** 車擋的材質。 */
export function createWheelStopMaterial(): MeshStandardMaterial {
  return createScenerySurface('concrete', {
    color: WHEEL_STOP_CONFIG.color,
    roughness: WHEEL_STOP_CONFIG.roughness,
    // 車擋很小：水泥的伸縮縫不要剛好切在上面，紋路也細一點。
    tileM: 1.9,
  });
}

/**
 * 車擋：車位前緣標線外側的一條梯形斷面水泥塊，橫跨車位中線。
 * 純視覺；放在判定用的車位矩形之外，車停到最前面也不會插進去。
 */
export function createWheelStop(spot: ParkingSpot): Group {
  const footprint = wheelStopFootprint(spot);
  const block = new Mesh(createWheelStopGeometry(), createWheelStopMaterial());
  block.position.set(0, 0, (footprint.minZ + footprint.maxZ) / 2);
  block.castShadow = true;
  block.receiveShadow = true;

  const frame = createSpotFrame(spot);
  frame.add(block);
  return frame;
}
