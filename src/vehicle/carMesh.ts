// 第 1 階段的簡單車輛模型：下車身 + 斜面車艙 + 車頂 + 四個輪子 + 頭燈／尾燈色塊，
// 以及駕駛座視角要看的極簡內裝（儀表板、A 柱）。
// 建模約定：車頭朝本地 −Z、右側是本地 +X、輪胎著地點在 y = 0、原點在車身中心的地面投影。
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { headingToRotationY } from '../core/heading';
import { CAR_VISUAL_CONFIG as VISUAL } from '../render/renderConfig';
import type { VehiclePose } from './bicycleModel';
import { VEHICLE_CONFIG_SI } from './vehicleConfig';

export interface CarMesh {
  /** 整台車；位置與 rotation.y 由 updateCarMesh 設定。 */
  readonly root: Group;
  /** 兩個前輪的轉向樞軸（左、右）。 */
  readonly frontWheelPivots: readonly [Group, Group];
  /** 車艙玻璃（不透明的深色方塊）。駕駛座視角要藏起來，否則視點被包在裡面什麼都看不到。 */
  readonly cabinGlass: Mesh;
  /** 車頂；駕駛座視角與玻璃一起藏起來。 */
  readonly roof: Mesh;
}

const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;
const HALF_WIDTH_M = VEHICLE_CONFIG_SI.widthM / 2;
const HALF_WHEELBASE_M = VEHICLE_CONFIG_SI.wheelbaseM / 2;

function shadowMesh(geometry: BufferGeometry, material: Material): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * 車艙玻璃：方塊的頂面往內收，做出前擋、後擋的斜度與側窗內傾。
 * 方塊每個面有自己的頂點，移動後重算法線仍是每面一個平面法線。
 */
function createCabinGeometry(widthM: number, heightM: number, lengthM: number): BufferGeometry {
  const geometry = new BoxGeometry(widthM, heightM, lengthM);
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index += 1) {
    if (positions.getY(index) <= 0) {
      continue;
    }
    const x = positions.getX(index);
    const z = positions.getZ(index);
    positions.setX(index, x - Math.sign(x) * VISUAL.cabinTopSideInsetM);
    // z < 0 是車頭側（前擋），往後收；z > 0 是車尾側（後擋），往前收。
    positions.setZ(index, z < 0 ? z + VISUAL.windshieldRakeM : z - VISUAL.rearWindowRakeM);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** 從 from 到 to 的細方柱（A 柱用）：方塊的長軸（本地 Y）轉到兩點連線的方向。 */
function createStrut(from: Vector3, to: Vector3, thicknessM: number, material: Material): Mesh {
  const span = new Vector3().subVectors(to, from);
  const strut = shadowMesh(new BoxGeometry(thicknessM, span.length(), thicknessM), material);
  strut.position.copy(from).addScaledVector(span, 0.5);
  strut.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), span.normalize());
  return strut;
}

export function createCarMesh(): CarMesh {
  const paint = new MeshStandardMaterial({
    color: VISUAL.bodyColor,
    roughness: VISUAL.bodyRoughness,
    metalness: VISUAL.bodyMetalness,
  });
  const glass = new MeshStandardMaterial({
    color: VISUAL.glassColor,
    roughness: VISUAL.glassRoughness,
  });
  const dashboardTrim = new MeshStandardMaterial({
    color: VISUAL.dashboardColor,
    roughness: VISUAL.dashboardRoughness,
  });
  const tire = new MeshStandardMaterial({
    color: VISUAL.tireColor,
    roughness: VISUAL.tireRoughness,
  });
  const hub = new MeshStandardMaterial({ color: VISUAL.hubColor, roughness: VISUAL.hubRoughness });
  const headlight = new MeshStandardMaterial({
    color: VISUAL.headlightColor,
    emissive: VISUAL.headlightColor,
    emissiveIntensity: VISUAL.headlightEmissiveIntensity,
  });
  const taillight = new MeshStandardMaterial({
    color: VISUAL.taillightColor,
    emissive: VISUAL.taillightColor,
    emissiveIntensity: VISUAL.taillightEmissiveIntensity,
  });

  const root = new Group();

  // 下車身。燈塊凸出車身前後端面 trimProud，所以車身兩端各縮這麼多，整體長度仍等於車長。
  const bodyWidthM = VEHICLE_CONFIG_SI.widthM - 2 * VISUAL.bodySideInsetM;
  const bodyLengthM = VEHICLE_CONFIG_SI.lengthM - 2 * VISUAL.trimProudM;
  const bodyTopM = VISUAL.groundClearanceM + VISUAL.lowerBodyHeightM;
  const body = shadowMesh(
    new BoxGeometry(bodyWidthM, VISUAL.lowerBodyHeightM, bodyLengthM),
    paint,
  );
  body.position.y = VISUAL.groundClearanceM + VISUAL.lowerBodyHeightM / 2;
  root.add(body);

  // 車艙：引擎蓋比行李廂長，所以車艙中心偏向車尾（+Z）。
  const cabinWidthM = bodyWidthM - 2 * VISUAL.cabinSideInsetM;
  const cabinLengthM = VEHICLE_CONFIG_SI.lengthM - VISUAL.hoodLengthM - VISUAL.trunkLengthM;
  const cabinCenterZM = (VISUAL.hoodLengthM - VISUAL.trunkLengthM) / 2;
  const glassHeightM = VEHICLE_CONFIG_SI.heightM - bodyTopM - VISUAL.roofThicknessM;
  const cabin = shadowMesh(createCabinGeometry(cabinWidthM, glassHeightM, cabinLengthM), glass);
  cabin.position.set(0, bodyTopM + glassHeightM / 2, cabinCenterZM);
  root.add(cabin);

  // 車頂：蓋在玻璃收窄後的頂面上，頂端剛好是車高。
  const roof = shadowMesh(
    new BoxGeometry(
      cabinWidthM - 2 * VISUAL.cabinTopSideInsetM,
      VISUAL.roofThicknessM,
      cabinLengthM - VISUAL.windshieldRakeM - VISUAL.rearWindowRakeM,
    ),
    paint,
  );
  roof.position.set(
    0,
    VEHICLE_CONFIG_SI.heightM - VISUAL.roofThicknessM / 2,
    cabinCenterZM + (VISUAL.windshieldRakeM - VISUAL.rearWindowRakeM) / 2,
  );
  root.add(roof);

  // 儀表板：下車身頂面上、前擋後方的一條箱子。整個在車艙玻璃裡面，從車外看不到。
  const cabinFrontZM = cabinCenterZM - cabinLengthM / 2;
  const dashboard = shadowMesh(
    new BoxGeometry(
      cabinWidthM - 2 * VISUAL.dashboardInsetM,
      VISUAL.dashboardHeightM,
      VISUAL.dashboardLengthM,
    ),
    dashboardTrim,
  );
  dashboard.position.set(
    0,
    bodyTopM + VISUAL.dashboardHeightM / 2,
    cabinFrontZM + VISUAL.dashboardInsetM + VISUAL.dashboardLengthM / 2,
  );
  root.add(dashboard);

  // A 柱：沿前擋兩側的斜邊，從車艙前下角到車頂前角。一半露在玻璃外，從車外看是前擋的邊框。
  const glassTopM = bodyTopM + glassHeightM;
  for (const side of [-1, 1]) {
    root.add(
      createStrut(
        new Vector3((side * cabinWidthM) / 2, bodyTopM, cabinFrontZM),
        new Vector3(
          side * (cabinWidthM / 2 - VISUAL.cabinTopSideInsetM),
          glassTopM,
          cabinFrontZM + VISUAL.windshieldRakeM,
        ),
        VISUAL.pillarThicknessM,
        paint,
      ),
    );
  }

  // 燈塊：包住車身上緣的兩個角，略凸出端面與頂面，從正後上方的鏡頭也看得到。
  const lightGeometry = new BoxGeometry(
    VISUAL.lightWidthM,
    VISUAL.lightHeightM,
    VISUAL.lightDepthM,
  );
  const lightXM = bodyWidthM / 2 - VISUAL.lightWidthM / 2 + VISUAL.trimProudM;
  const lightYM = bodyTopM - VISUAL.lightHeightM / 2 + VISUAL.trimProudM;
  const lightZM = HALF_LENGTH_M - VISUAL.lightDepthM / 2;
  for (const side of [-1, 1]) {
    const front = shadowMesh(lightGeometry, headlight);
    front.position.set(side * lightXM, lightYM, -lightZM);
    const rear = shadowMesh(lightGeometry, taillight);
    rear.position.set(side * lightXM, lightYM, lightZM);
    root.add(front, rear);
  }

  // 輪子：圓柱預設軸向是 Y，繞 Z 轉 90° 讓輪軸沿 X。輪框蓋比輪胎側面凸出 trimProud，最外緣剛好是車寬。
  const tireGeometry = new CylinderGeometry(
    VISUAL.wheelRadiusM,
    VISUAL.wheelRadiusM,
    VISUAL.wheelWidthM,
    VISUAL.wheelSegments,
  ).rotateZ(Math.PI / 2);
  const hubGeometry = new CylinderGeometry(
    VISUAL.hubRadiusM,
    VISUAL.hubRadiusM,
    VISUAL.wheelWidthM + 2 * VISUAL.trimProudM,
    VISUAL.wheelSegments,
  ).rotateZ(Math.PI / 2);
  const wheelXM = HALF_WIDTH_M - VISUAL.trimProudM - VISUAL.wheelWidthM / 2;
  const createWheel = (side: number, zM: number): Group => {
    const pivot = new Group();
    pivot.position.set(side * wheelXM, VISUAL.wheelRadiusM, zM);
    pivot.add(shadowMesh(tireGeometry, tire), shadowMesh(hubGeometry, hub));
    root.add(pivot);
    return pivot;
  };
  // 前軸在車身中心前方（−Z）半個軸距，後軸在後方（+Z）。
  const frontLeft = createWheel(-1, -HALF_WHEELBASE_M);
  const frontRight = createWheel(1, -HALF_WHEELBASE_M);
  createWheel(-1, HALF_WHEELBASE_M);
  createWheel(1, HALF_WHEELBASE_M);

  return { root, frontWheelPivots: [frontLeft, frontRight], cabinGlass: cabin, roof };
}

/**
 * 駕駛座視角開關：開啟時藏起車艙玻璃與車頂，視線才看得出去，並看得到儀表板、A 柱與引擎蓋；
 * 關閉就恢復外觀。藏起來的網格也不投影，所以這段期間地上的車影少了車艙那一塊。
 */
export function setCarInteriorView(car: CarMesh, enabled: boolean): void {
  car.cabinGlass.visible = !enabled;
  car.roof.visible = !enabled;
}

/** 把模型擺到指定姿態：車身位置與朝向、前輪轉向角。 */
export function updateCarMesh(car: CarMesh, pose: VehiclePose): void {
  car.root.position.set(pose.x, 0, pose.z);
  car.root.rotation.y = headingToRotationY(pose.headingRad);
  const steerRotationY = headingToRotationY(pose.steerRad);
  for (const pivot of car.frontWheelPivots) {
    pivot.rotation.y = steerRotationY;
  }
}
