// 程序化的轎車模型：放樣的曲面車殼（carBody.ts）、內裝（carInterior.ts）、輪子（carWheel.ts）、後視鏡、輪拱內襯，
// 以及頭燈／尾燈／倒車燈的材質。
// 建模約定：車頭朝本地 −Z、右側是本地 +X、輪胎著地點在 y = 0、原點在車身中心的地面投影。
// 外框（含後視鏡與輪胎）剛好是 VehicleConfig 的長寬高；碰撞與停車判定用的矩形不受外觀影響。
import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import { headingToRotationY } from '../core/heading';
import type { VehicleDetail } from '../render/quality';
import { CAR_DETAIL_CONFIG, CAR_VISUAL_CONFIG as VISUAL } from '../render/renderConfig';
import type { VehiclePose } from './bicycleModel';
import { BODY_LAYOUT, createBodyGeometries, type BodyPart } from './carBody';
import { createCarInterior } from './carInterior';
import { createBrakeDiscGeometry, createRimGeometry, createTireGeometry } from './carWheel';
import { VEHICLE_CONFIG_SI } from './vehicleConfig';

export interface CarMesh {
  /** 整台車；位置與 rotation.y 由 updateCarMesh 設定。 */
  readonly root: Group;
  /** 兩個前輪的轉向樞軸（左、右）。 */
  readonly frontWheelPivots: readonly [Group, Group];
  /** 四個輪子的滾動軸（前左、前右、後左、後右）。 */
  readonly wheelSpinners: readonly Group[];
  /** 方向盤（繞自己的軸轉）。 */
  readonly steeringWheel: Group;
  /** 烤漆車殼（引擎蓋、車頂、柱子、行李廂）。 */
  readonly body: Mesh;
  /** 前擋、側窗、後擋玻璃。駕駛座視角藏起來，視線不隔著一層深色玻璃。 */
  readonly glass: Mesh;
  /** 車艙內襯的上半部：頂篷與 A／B／C 柱內飾。只有從車裡（或隔著玻璃）才看得到。 */
  readonly headliner: Mesh;
}

const HALF_WIDTH_M = VEHICLE_CONFIG_SI.widthM / 2;
const HALF_WHEELBASE_M = VEHICLE_CONFIG_SI.wheelbaseM / 2;

function shadowMesh(geometry: BufferGeometry, material: Material): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 燈殼材質：color 是沒亮時的顏色，glowColor 是發光的顏色。 */
function lamp(color: number, glowColor: number, intensity: number): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    emissive: glowColor,
    emissiveIntensity: intensity,
    roughness: 0.3,
  });
}

/**
 * 後視鏡：鏡殼（壓扁的球）、朝後的鏡面、接到車門的支臂。
 * 鏡殼最外側的頂點剛好在車寬的一半，所以整台車的外框寬度等於 VehicleConfig 的車寬。
 */
function createMirror(side: number, paint: Material, trim: Material, mirrorGlass: Material): Group {
  const shellHalfM = { x: 0.1, y: 0.06, z: 0.05 };
  const mirror = new Group();
  mirror.position.set(
    side * (HALF_WIDTH_M - shellHalfM.x),
    BODY_LAYOUT.cowlHeightM + 0.09,
    BODY_LAYOUT.windshieldBaseZM + 0.3,
  );
  mirror.add(
    shadowMesh(new SphereGeometry(1, 16, 10).scale(shellHalfM.x, shellHalfM.y, shellHalfM.z), paint),
  );
  const face = new Mesh(new CircleGeometry(1, 20).scale(0.8 * shellHalfM.x, 0.8 * shellHalfM.y, 1), mirrorGlass);
  face.position.z = 0.6 * shellHalfM.z;
  mirror.add(face);
  const arm = shadowMesh(new BoxGeometry(0.1, 0.025, 0.05), trim);
  arm.position.set(-side * 0.11, -0.03, 0);
  mirror.add(arm);
  return mirror;
}

/**
 * @param detail 細分程度（CAR_DETAIL_CONFIG）：low 面數少，high 輪拱與輪胎較圓。外框尺寸兩者相同。
 */
export function createCarMesh(detail: VehicleDetail = 'high'): CarMesh {
  const paint = new MeshPhysicalMaterial({
    color: VISUAL.bodyColor,
    roughness: VISUAL.bodyRoughness,
    metalness: VISUAL.bodyMetalness,
    clearcoat: VISUAL.clearcoat,
    clearcoatRoughness: VISUAL.minGlossRoughness,
  });
  // 玻璃雙面、不寫深度：隔著它還看得到車艙，也不會擋掉後面的另一片玻璃；從車裡往外看同樣隔著一層。
  const glass = new MeshStandardMaterial({
    color: VISUAL.glassColor,
    roughness: VISUAL.minGlossRoughness,
    transparent: true,
    opacity: VISUAL.glassOpacity,
    depthWrite: false,
    side: DoubleSide,
  });
  const trim = new MeshStandardMaterial({ color: VISUAL.trimColor, roughness: VISUAL.trimRoughness });
  const headliner = new MeshStandardMaterial({
    color: VISUAL.headlinerColor,
    emissive: VISUAL.headlinerColor,
    emissiveIntensity: VISUAL.headlinerEmissiveIntensity,
    roughness: 1,
  });
  const cabinTrim = new MeshStandardMaterial({
    color: VISUAL.cabinTrimColor,
    emissive: VISUAL.cabinTrimColor,
    emissiveIntensity: VISUAL.cabinTrimEmissiveIntensity,
    roughness: 0.9,
  });
  const taillightMaterial = lamp(
    VISUAL.taillightColor,
    VISUAL.taillightColor,
    VISUAL.taillightEmissiveIntensity,
  );
  const reverseLightMaterial = lamp(VISUAL.reverseLightOffColor, VISUAL.reverseLightColor, 0);
  const bodyMaterials: Readonly<Record<BodyPart, Material>> = {
    paint,
    glass,
    trim,
    headlight: lamp(VISUAL.headlightColor, VISUAL.headlightColor, VISUAL.headlightEmissiveIntensity),
    taillight: taillightMaterial,
    reverseLight: reverseLightMaterial,
    headliner,
    cabinTrim,
  };

  const root = new Group();

  // 車殼：每個材質分區一個網格。玻璃不投影，陽光才照得進車艙。
  const bodyMeshes = new Map<BodyPart, Mesh>();
  for (const [part, geometry] of createBodyGeometries(detail)) {
    const mesh = shadowMesh(geometry, bodyMaterials[part]);
    mesh.castShadow = part !== 'glass';
    bodyMeshes.set(part, mesh);
    root.add(mesh);
  }
  const body = bodyMeshes.get('paint');
  const glassMesh = bodyMeshes.get('glass');
  const headlinerMesh = bodyMeshes.get('headliner');
  if (body === undefined || glassMesh === undefined || headlinerMesh === undefined) {
    throw new Error('車殼缺少烤漆、玻璃或頂篷分區');
  }

  const interior = createCarInterior();
  root.add(interior.root);

  const mirrorGlass = new MeshStandardMaterial({
    color: VISUAL.mirrorGlassColor,
    roughness: VISUAL.minGlossRoughness,
    metalness: 1,
  });
  root.add(createMirror(-1, paint, trim, mirrorGlass), createMirror(1, paint, trim, mirrorGlass));

  // 輪子：樞軸（轉向，繞 Y）→ 滾動軸（繞 X）→ 輪胎、輪圈、煞車盤。幾何的外側面朝 +X，左側轉半圈。
  const { wheelSegments } = CAR_DETAIL_CONFIG[detail];
  const tireGeometry = createTireGeometry(wheelSegments);
  const rimGeometry = createRimGeometry(wheelSegments);
  const discGeometry = createBrakeDiscGeometry(wheelSegments);
  const tire = new MeshStandardMaterial({ color: VISUAL.tireColor, roughness: VISUAL.tireRoughness });
  const rim = new MeshStandardMaterial({
    color: VISUAL.rimColor,
    roughness: VISUAL.rimRoughness,
    metalness: VISUAL.rimMetalness,
  });
  const wheelXM = BODY_LAYOUT.halfWidthM - VISUAL.wheelTuckM - VISUAL.wheelWidthM / 2;
  const wheelSpinners: Group[] = [];
  const createWheel = (side: number, zM: number): Group => {
    const pivot = new Group();
    pivot.position.set(side * wheelXM, VISUAL.wheelRadiusM, zM);
    const spinner = new Group();
    const outward = new Group();
    outward.rotation.y = side < 0 ? Math.PI : 0;
    outward.add(
      shadowMesh(tireGeometry, tire),
      shadowMesh(rimGeometry, rim),
      shadowMesh(discGeometry, trim),
    );
    spinner.add(outward);
    pivot.add(spinner);
    root.add(pivot);
    wheelSpinners.push(spinner);
    return pivot;
  };
  // 前軸在車身中心前方（−Z）半個軸距，後軸在後方（+Z）。
  const frontLeft = createWheel(-1, -HALF_WHEELBASE_M);
  const frontRight = createWheel(1, -HALF_WHEELBASE_M);
  createWheel(-1, HALF_WHEELBASE_M);
  createWheel(1, HALF_WHEELBASE_M);

  // 輪拱內襯：兩輪之間的半圓筒，略小於車殼底部的輪拱；從輪胎與輪拱的縫看進去是黑的，不會穿到另一側。
  const linerGeometry = new CylinderGeometry(
    BODY_LAYOUT.archRadiusM - 0.012,
    BODY_LAYOUT.archRadiusM - 0.012,
    2 * (wheelXM - VISUAL.wheelWidthM / 2 - 0.02),
    wheelSegments / 2,
    1,
    false,
    0,
    Math.PI,
  ).rotateZ(Math.PI / 2);
  for (const axleZM of [-HALF_WHEELBASE_M, HALF_WHEELBASE_M]) {
    const liner = shadowMesh(linerGeometry, trim);
    liner.position.set(0, VISUAL.wheelRadiusM, axleZM);
    root.add(liner);
  }

  return {
    root,
    frontWheelPivots: [frontLeft, frontRight],
    wheelSpinners,
    steeringWheel: interior.steeringWheel,
    body,
    glass: glassMesh,
    headliner: headlinerMesh,
  };
}

/**
 * 駕駛座視角開關：開啟時藏起玻璃（雙面的，從車裡看也是一層深色），視線才清楚；車殼、頂篷、柱子、儀表板都留著，
 * 所以畫面上方是頂篷、兩側是 A 柱、下方是儀表板與引擎蓋。關閉就恢復外觀。玻璃本來就不投影，車影不變。
 */
export function setCarInteriorView(car: CarMesh, enabled: boolean): void {
  car.glass.visible = !enabled;
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
