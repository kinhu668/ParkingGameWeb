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
import type { ParkingSpot } from '../level/parkingJudge';
import { CURB_CONFIG, WHEEL_STOP_CONFIG } from '../render/renderConfig';

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

/** 擺到車位的位置與朝向的空群組；子物件用車位本地座標。 */
export function createSpotFrame(spot: ParkingSpot): Group {
  const frame = new Group();
  frame.position.set(spot.x, 0, spot.z);
  frame.rotation.y = headingToRotationY(spot.headingRad);
  return frame;
}

/**
 * 路緣石：沿場地內緣外側的一圈水泥條（四段箱子，轉角處由左右兩段補滿）。
 * 純視覺，車可以穿過去。
 */
export function createCurbs(spot: ParkingSpot): Group {
  const { widthM, heightM } = CURB_CONFIG;
  const inner = curbInnerBounds(spot);
  const material = new MeshStandardMaterial({
    color: CURB_CONFIG.color,
    roughness: CURB_CONFIG.roughness,
    metalness: 0,
  });

  const frame = createSpotFrame(spot);
  const addSegment = (centerX: number, centerZ: number, sizeX: number, sizeZ: number): void => {
    const segment = new Mesh(new BoxGeometry(sizeX, heightM, sizeZ), material);
    segment.position.set(centerX, heightM / 2, centerZ);
    segment.castShadow = true;
    segment.receiveShadow = true;
    frame.add(segment);
  };

  const spanX = inner.maxX - inner.minX;
  const spanZ = inner.maxZ - inner.minZ;
  const centerX = (inner.minX + inner.maxX) / 2;
  const centerZ = (inner.minZ + inner.maxZ) / 2;
  // 前後兩段只有內緣那麼長；左右兩段多出兩個路緣寬，把四個轉角補滿。
  addSegment(centerX, inner.minZ - widthM / 2, spanX, widthM);
  addSegment(centerX, inner.maxZ + widthM / 2, spanX, widthM);
  addSegment(inner.minX - widthM / 2, centerZ, widthM, spanZ + widthM * 2);
  addSegment(inner.maxX + widthM / 2, centerZ, widthM, spanZ + widthM * 2);
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
  return new MeshStandardMaterial({
    color: WHEEL_STOP_CONFIG.color,
    roughness: WHEEL_STOP_CONFIG.roughness,
    metalness: 0,
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
