// 程序化的轎車模型：放樣的曲面車殼（carBody.ts）與併進去的配件（carFittings.ts：保險桿、燈組、車牌、門縫）、
// 內裝（carInterior.ts）、輪子（carWheel.ts）、後視鏡、雨刷、輪拱內襯，以及頭燈／尾燈／倒車燈的材質。
// 建模約定：車頭朝本地 −Z、右側是本地 +X、輪胎著地點在 y = 0、原點在車身中心的地面投影。
// 外框（含後視鏡與輪胎）剛好是 VehicleConfig 的長寬高；碰撞與停車判定用的矩形不受外觀影響。
import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import { forward, headingToRotationY } from '../core/heading';
import { createSurfaceMaterial } from '../materials/surfaceMaterial';
import type { VehicleDetail } from '../render/quality';
import { CAR_DETAIL_CONFIG, CAR_VISUAL_CONFIG as VISUAL } from '../render/renderConfig';
import type { DriveInput, VehiclePose } from './bicycleModel';
import { BODY_LAYOUT, bodyTopHeightM, type BodyPart } from './carBody';
import { createBeamGeometry, createBodyGeometries } from './carFittings';
import { createCarInterior } from './carInterior';
import { createBrakeDiscGeometry, createRimGeometry, createTireGeometry } from './carWheel';
import { VEHICLE_CONFIG_SI } from './vehicleConfig';

/** 燈號狀態。 */
export interface CarLights {
  /** 煞車燈（尾燈加亮）。 */
  readonly braking: boolean;
  /** 倒車燈。 */
  readonly reversing: boolean;
}

export interface CarMesh {
  /** 整台車；位置與 rotation.y 由 updateCarMesh 設定。 */
  readonly root: Group;
  /** 兩個前輪的轉向樞軸（左、右）。 */
  readonly frontWheelPivots: readonly [Group, Group];
  /** 四個輪子的滾動軸（前左、前右、後左、後右）；rotation.x 隨行駛距離轉。 */
  readonly wheelSpinners: readonly Group[];
  /** 方向盤；rotation.z 隨轉向角轉。 */
  readonly steeringWheel: Group;
  /** 烤漆車殼（引擎蓋、車頂、柱子、行李廂）。 */
  readonly body: Mesh;
  /** 前擋、側窗、後擋玻璃。駕駛座視角藏起來，視線不隔著一層深色玻璃。 */
  readonly glass: Mesh;
  /** 車艙內襯的上半部：頂篷與 A／B／C 柱內飾。只有從車裡（或隔著玻璃）才看得到。 */
  readonly headliner: Mesh;
  /** 尾燈與倒車燈的材質；亮度由 setCarLights 設定。 */
  readonly taillightMaterial: MeshStandardMaterial;
  readonly reverseLightMaterial: MeshStandardMaterial;
  /** 上一次擺放的位置，用來算輪子滾了多遠；還沒擺過是 undefined。 */
  lastPlacement: { readonly x: number; readonly z: number } | undefined;
}

/** 輪胎貼圖繞一圈重複幾次（一次有 4 道人字溝）。 */
const TIRE_PATTERN_REPEATS = 6;
const HALF_WIDTH_M = VEHICLE_CONFIG_SI.widthM / 2;
const HALF_WHEELBASE_M = VEHICLE_CONFIG_SI.wheelbaseM / 2;

function shadowMesh(geometry: BufferGeometry, material: Material): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 輪胎的材質：胎面的人字溝與胎壁的稜線、凸字繞著輪軸鋪（材質庫的 tire，圓柱座標）。 */
export function createTireMaterial(): MeshStandardMaterial {
  return createSurfaceMaterial('tire', {
    space: 'radial',
    color: VISUAL.tireColor,
    roughness: VISUAL.tireRoughness,
    radial: [TIRE_PATTERN_REPEATS, VISUAL.wheelWidthM / 2, VISUAL.rimRadiusM, VISUAL.wheelRadiusM],
  });
}

/** 輪圈的材質：拋光的合金（材質庫的 chrome，用輪圈自己的顏色與粗糙度）。 */
export function createRimMaterial(): MeshStandardMaterial {
  return createSurfaceMaterial('chrome', {
    space: 'local',
    color: VISUAL.rimColor,
    roughness: VISUAL.rimRoughness,
    metalness: VISUAL.rimMetalness,
  });
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
 * 車外後視鏡：方正的鏡殼（烤漆）、朝後的黑色鏡框與鏡面、接到車門的支臂。
 * 從駕駛座看過去是「黑框裡一面鏡子」，不是一顆浮著的色塊。
 * 鏡殼最外側剛好在車寬的一半，所以整台車的外框寬度等於 VehicleConfig 的車寬。
 */
function createMirror(side: number, paint: Material, trim: Material, mirrorGlass: Material): Group {
  const shellM = { x: 0.19, y: 0.12, z: 0.07 };
  const mirror = new Group();
  mirror.name = 'doorMirror';
  mirror.position.set(
    side * (HALF_WIDTH_M - shellM.x / 2),
    BODY_LAYOUT.cowlHeightM + 0.09,
    BODY_LAYOUT.windshieldBaseZM + 0.3,
  );
  mirror.add(shadowMesh(new BoxGeometry(shellM.x, shellM.y, shellM.z), paint));
  // 鏡框比鏡殼略小、貼在朝後的那一面；鏡面再比鏡框小一圈。
  const frame = shadowMesh(new BoxGeometry(shellM.x - 0.012, shellM.y - 0.012, 0.012), trim);
  frame.name = 'doorMirror:frame';
  frame.position.z = shellM.z / 2;
  const face = new Mesh(new PlaneGeometry(shellM.x - 0.04, shellM.y - 0.04), mirrorGlass);
  face.name = 'doorMirror:glass';
  face.position.z = shellM.z / 2 + 0.007;
  const arm = shadowMesh(new BoxGeometry(0.12, 0.035, 0.05), trim);
  arm.position.set(-side * 0.12, -0.035, 0);
  mirror.add(frame, face, arm);
  return mirror;
}

/**
 * 雨刷：兩支靜止的雨刷停在前擋下緣（刷片貼著玻璃橫放、刷臂從集水槽伸上來）。
 * 駕駛座看得到它們在儀表板前方，但低於視線，不擋路。
 */
function createWipers(material: Material): Group {
  const wipers = new Group();
  wipers.name = 'wipers';
  const bladeZM = BODY_LAYOUT.windshieldBaseZM + 0.085;
  const pivotZM = BODY_LAYOUT.windshieldBaseZM + 0.01;
  /** 玻璃（或集水槽）表面上方一點點。 */
  const above = (xM: number, zM: number): readonly [number, number, number] => [
    xM,
    bodyTopHeightM(zM, xM) + 0.014,
    zM,
  ];
  // 左駕：刷臂的軸在左邊與中間，刷片朝右躺。
  for (const [fromXM, toXM] of [
    [-0.56, -0.04],
    [0.06, 0.58],
  ] as const) {
    const blade = new Mesh(
      createBeamGeometry(above(fromXM, bladeZM), above(toXM, bladeZM + 0.03), 0.014),
      material,
    );
    blade.name = 'wiper:blade';
    const middleXM = (fromXM + toXM) / 2;
    const arm = new Mesh(
      createBeamGeometry(above(fromXM + 0.03, pivotZM), above(middleXM, bladeZM + 0.015), 0.01),
      material,
    );
    arm.name = 'wiper:arm';
    wipers.add(blade, arm);
  }
  return wipers;
}

/**
 * @param detail 細分程度（CAR_DETAIL_CONFIG）：low 面數少，high 輪拱與輪胎較圓。外框尺寸兩者相同。
 */
export function createCarMesh(detail: VehicleDetail = 'high'): CarMesh {
  // 車身的材質來自材質庫，用物件座標取樣（紋路跟著車走）。
  // 烤漆：清漆底下有金屬片（法線各自歪一點，近看有細碎的反光），清漆層本身是平滑的。
  const paint = createSurfaceMaterial('carPaint', {
    space: 'local',
    color: VISUAL.bodyColor,
    roughness: VISUAL.bodyRoughness,
    metalness: VISUAL.bodyMetalness,
    clearcoat: VISUAL.clearcoat,
    clearcoatRoughness: VISUAL.minGlossRoughness,
  });
  // 玻璃雙面、不寫深度：隔著它還看得到車艙，也不會擋掉後面的另一片玻璃；從車裡往外看同樣隔著一層。
  const glass = createSurfaceMaterial('glass', {
    space: 'local',
    color: VISUAL.glassColor,
    roughness: VISUAL.minGlossRoughness,
    parameters: {
      transparent: true,
      opacity: VISUAL.glassOpacity,
      depthWrite: false,
      side: DoubleSide,
    },
  });
  const trim = createSurfaceMaterial('plastic', {
    space: 'local',
    color: VISUAL.trimColor,
    roughness: VISUAL.trimRoughness,
  });
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
  const chrome = createSurfaceMaterial('chrome', {
    space: 'local',
    color: VISUAL.chromeColor,
    roughness: VISUAL.chromeRoughness,
    metalness: 1,
  });
  const plate = new MeshStandardMaterial({
    color: VISUAL.plateColor,
    roughness: VISUAL.plateRoughness,
  });
  const bodyMaterials: Readonly<Record<BodyPart, Material>> = {
    paint,
    glass,
    trim,
    headlight: lamp(VISUAL.headlightColor, VISUAL.headlightColor, VISUAL.headlightEmissiveIntensity),
    taillight: taillightMaterial,
    reverseLight: reverseLightMaterial,
    chrome,
    plate,
    headliner,
    cabinTrim,
  };

  const root = new Group();

  // 車殼：每個材質分區一個網格。玻璃不投影，陽光才照得進車艙。
  const bodyMeshes = new Map<BodyPart, Mesh>();
  for (const [part, geometry] of createBodyGeometries(detail)) {
    const mesh = shadowMesh(geometry, bodyMaterials[part]);
    mesh.castShadow = part !== 'glass';
    mesh.name = `body:${part}`;
    bodyMeshes.set(part, mesh);
    root.add(mesh);
  }
  const body = bodyMeshes.get('paint');
  const glassMesh = bodyMeshes.get('glass');
  const headlinerMesh = bodyMeshes.get('headliner');
  if (body === undefined || glassMesh === undefined || headlinerMesh === undefined) {
    throw new Error('車殼缺少烤漆、玻璃或頂篷分區');
  }

  const mirrorGlass = new MeshStandardMaterial({
    color: VISUAL.mirrorGlassColor,
    roughness: VISUAL.minGlossRoughness,
    metalness: 1,
  });
  const interior = createCarInterior(mirrorGlass);
  root.add(interior.root);

  root.add(createMirror(-1, paint, trim, mirrorGlass), createMirror(1, paint, trim, mirrorGlass));
  root.add(createWipers(trim));

  // 輪子：樞軸（轉向，繞 Y）→ 滾動軸（繞 X）→ 輪胎、輪圈、煞車盤。幾何的外側面朝 +X，左側轉半圈。
  const { wheelSegments } = CAR_DETAIL_CONFIG[detail];
  const tireGeometry = createTireGeometry(wheelSegments);
  const rimGeometry = createRimGeometry(wheelSegments);
  const discGeometry = createBrakeDiscGeometry(wheelSegments);
  const tire = createTireMaterial();
  const rim = createRimMaterial();
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
    taillightMaterial,
    reverseLightMaterial,
    lastPlacement: undefined,
  };
}

/**
 * 駕駛座視角開關：開啟時藏起玻璃（雙面的，從車裡看也是一層深色），視線才清楚；車殼、頂篷、柱子、儀表板都留著，
 * 所以畫面上方是頂篷、兩側是 A 柱、下方是儀表板與引擎蓋。關閉就恢復外觀。玻璃本來就不投影，車影不變。
 */
export function setCarInteriorView(car: CarMesh, enabled: boolean): void {
  car.glass.visible = !enabled;
}

/**
 * 引擎蓋視角開關：開啟時烤漆換成 hoodViewPaint 的數值（掠射反光收斂，看得出車色與摺線），關閉就恢復。
 * 只改材質的數值、不換材質也不增減功能（清漆始終開著），所以切換鏡頭不必重新編譯著色器。
 */
export function setCarHoodView(car: CarMesh, enabled: boolean): void {
  const paint = car.body.material;
  if (!(paint instanceof MeshPhysicalMaterial)) {
    return;
  }
  const hood = VISUAL.hoodViewPaint;
  paint.metalness = enabled ? hood.metalness : VISUAL.bodyMetalness;
  paint.specularIntensity = enabled ? hood.specularIntensity : 1;
  paint.clearcoat = enabled ? hood.clearcoat : VISUAL.clearcoat;
  paint.clearcoatRoughness = enabled ? hood.clearcoatRoughness : VISUAL.minGlossRoughness;
  paint.envMapIntensity = enabled ? hood.envMapIntensity : 1;
}

/**
 * 由駕駛輸入與車速決定燈號（與 bicycleModel 的車速規則一致，但不影響物理）：
 * 剎車、或油門與行進方向相反（正在煞車）→ 煞車燈；正在倒退、或靜止時按著倒車 → 倒車燈。
 */
export function carLightsFor(input: DriveInput, speedMps: number): CarLights {
  return {
    braking: input.brake === true || speedMps * input.throttle < 0,
    reversing: speedMps < 0 || (speedMps === 0 && input.throttle < 0),
  };
}

/** 套用燈號：煞車時尾燈加亮，倒車時倒車燈亮。 */
export function setCarLights(car: CarMesh, lights: CarLights): void {
  car.taillightMaterial.emissiveIntensity = lights.braking
    ? VISUAL.brakeLightEmissiveIntensity
    : VISUAL.taillightEmissiveIntensity;
  car.reverseLightMaterial.emissiveIntensity = lights.reversing
    ? VISUAL.reverseLightEmissiveIntensity
    : 0;
}

/** 把模型擺到指定姿態：車身位置與朝向、前輪與方向盤的轉向角；輪子依這次與上次位置的距離滾動。 */
export function updateCarMesh(car: CarMesh, pose: VehiclePose): void {
  // 沿車頭方向走了多遠（倒車為負）。輪子頂端往前走 = 繞 +X 軸負轉。
  if (car.lastPlacement !== undefined) {
    const ahead = forward(pose.headingRad);
    const traveledM =
      (pose.x - car.lastPlacement.x) * ahead.x + (pose.z - car.lastPlacement.z) * ahead.z;
    const rollRad = -traveledM / VISUAL.wheelRadiusM;
    for (const spinner of car.wheelSpinners) {
      spinner.rotation.x = (spinner.rotation.x + rollRad) % (2 * Math.PI);
    }
  }
  car.lastPlacement = { x: pose.x, z: pose.z };

  car.root.position.set(pose.x, 0, pose.z);
  car.root.rotation.y = headingToRotationY(pose.headingRad);
  const steerRotationY = headingToRotationY(pose.steerRad);
  for (const pivot of car.frontWheelPivots) {
    pivot.rotation.y = steerRotationY;
  }
  // 從駕駛看過去，向右打是順時針 = 繞朝向駕駛的軸負轉。
  car.steeringWheel.rotation.z = -pose.steerRad * VISUAL.steeringRatio;
}
