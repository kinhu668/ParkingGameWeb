// 內裝：儀表板（有厚度的斷面沿車寬擠出）、儀表罩與錶框、中控螢幕、飾條、方向盤、座椅、防火牆與後置物板。
// 從車外透過玻璃看得到車艙輪廓，駕駛座視角看得到儀表板上緣與方向盤上半圈；全部低於視線，不擋正前方。
import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  RingGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import { CAR_VISUAL_CONFIG as VISUAL, GAME_CAMERA_CONFIG } from '../render/renderConfig';
import { BODY_LAYOUT } from './carBody';
import { VEHICLE_CONFIG_SI } from './vehicleConfig';

export interface CarInterior {
  readonly root: Group;
  /** 方向盤（繞自己的軸轉）；rotation.z 由 updateCarMesh 依轉向角設定。 */
  readonly steeringWheel: Group;
}

/** 駕駛座在車身左側多遠：與駕駛座鏡頭同一條線。 */
const DRIVER_X_M = GAME_CAMERA_CONFIG.cockpit.lateralM;
/** 內裝比車艙內襯每側再縮這麼多，不與門板共面。 */
const CLEARANCE_M = 0.03;
const INNER_HALF_WIDTH_M = BODY_LAYOUT.cabinHalfWidthM - CLEARANCE_M;
const FLOOR_M = VISUAL.groundClearanceM;
const COWL_M = BODY_LAYOUT.cowlHeightM;
/** 儀表板前緣（靠前擋）與後緣（靠駕駛）的 Z、頂面高度。 */
const DASH_FRONT_Z_M = BODY_LAYOUT.windshieldBaseZM + VISUAL.dashboardInsetM;
const DASH_REAR_Z_M = DASH_FRONT_Z_M + VISUAL.dashboardLengthM;
const DASH_TOP_M = COWL_M + VISUAL.dashboardHeightM;

function shadowMesh(geometry: BufferGeometry, material: Material): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(
  material: Material,
  size: readonly [number, number, number],
  center: readonly [number, number, number],
): Mesh {
  const mesh = shadowMesh(new BoxGeometry(...size), material);
  mesh.position.set(...center);
  return mesh;
}

/**
 * 儀表板：側面看的斷面（頂面從前擋下緣略升到靠駕駛的圓角，正面往下內收）沿車寬擠出。
 * Shape 的 X 是車的 Z、Y 是車的 Y；擠出方向轉到車的 X。
 */
function createDashboardGeometry(): BufferGeometry {
  const profile = new Shape();
  profile.moveTo(DASH_FRONT_Z_M, COWL_M - 0.02);
  profile.lineTo(DASH_REAR_Z_M - 0.1, DASH_TOP_M);
  profile.quadraticCurveTo(DASH_REAR_Z_M, DASH_TOP_M, DASH_REAR_Z_M, DASH_TOP_M - 0.07);
  profile.lineTo(DASH_REAR_Z_M - 0.05, DASH_TOP_M - 0.24);
  profile.lineTo(DASH_REAR_Z_M - 0.16, DASH_TOP_M - 0.34);
  profile.lineTo(DASH_FRONT_Z_M, DASH_TOP_M - 0.34);
  profile.closePath();
  const widthM = 2 * INNER_HALF_WIDTH_M;
  return new ExtrudeGeometry(profile, { depth: widthM, bevelEnabled: false, curveSegments: 6 })
    .rotateY(-Math.PI / 2)
    .translate(widthM / 2, 0, 0);
}

/** 方向盤：輪圈、三根輪輻、中央的蓋子。盤面在本地 XY 平面、軸沿本地 Z（朝駕駛）。 */
function createSteeringWheel(material: Material): Group {
  const radiusM = VISUAL.steeringWheelRadiusM;
  const wheel = new Group();
  wheel.add(shadowMesh(new TorusGeometry(radiusM, 0.016, 8, 28), material));
  wheel.add(shadowMesh(new CylinderGeometry(0.05, 0.06, 0.04, 16).rotateX(Math.PI / 2), material));
  // 輪輻朝左、朝右、朝下，上半圈留空，看得到儀表。
  for (const angleRad of [Math.PI / 2, -Math.PI / 2, Math.PI]) {
    const spoke = shadowMesh(
      new BoxGeometry(0.034, radiusM, 0.014).translate(0, radiusM / 2, 0),
      material,
    );
    spoke.rotation.z = angleRad;
    wheel.add(spoke);
  }
  return wheel;
}

/** 一張座椅：椅墊、後傾的椅背、頭枕。backZM 是椅背底部的 Z。 */
function createSeat(material: Material, xM: number, backZM: number, widthM: number): Group {
  const seat = new Group();
  seat.add(box(material, [widthM, 0.14, 0.5], [xM, FLOOR_M + 0.27, backZM - 0.22]));
  const back = box(material, [widthM, 0.6, 0.12], [xM, FLOOR_M + 0.6, backZM + 0.1]);
  back.rotation.x = 0.2;
  seat.add(back);
  seat.add(box(material, [0.5 * widthM, 0.17, 0.09], [xM, FLOOR_M + 0.98, backZM + 0.2]));
  return seat;
}

export function createCarInterior(): CarInterior {
  const dash = new MeshStandardMaterial({
    color: VISUAL.dashboardColor,
    roughness: VISUAL.dashboardRoughness,
  });
  const accent = new MeshStandardMaterial({
    color: VISUAL.dashAccentColor,
    roughness: 0.35,
    metalness: 0.8,
  });
  const fabric = new MeshStandardMaterial({ color: VISUAL.seatColor, roughness: 0.95 });
  const glow = new MeshStandardMaterial({
    color: VISUAL.gaugeColor,
    emissive: VISUAL.gaugeColor,
    emissiveIntensity: VISUAL.gaugeEmissiveIntensity,
  });

  const display = new MeshStandardMaterial({
    color: VISUAL.screenColor,
    emissive: VISUAL.screenColor,
    emissiveIntensity: VISUAL.screenEmissiveIntensity,
    roughness: 0.2,
  });

  const root = new Group();
  root.add(shadowMesh(createDashboardGeometry(), dash));

  // 儀表罩：駕駛正前方、儀表板後緣上方的半橢球；下面一塊朝駕駛的錶板，上面兩個發光的錶框。
  const binnacle = shadowMesh(
    new SphereGeometry(1, 20, 8, 0, 2 * Math.PI, 0, Math.PI / 2).scale(0.2, 0.06, 0.15),
    dash,
  );
  binnacle.position.set(DRIVER_X_M, DASH_TOP_M - 0.012, DASH_REAR_Z_M - 0.12);
  root.add(binnacle);
  const cluster = new Group();
  cluster.position.set(DRIVER_X_M, DASH_TOP_M - 0.1, DASH_REAR_Z_M + 0.016);
  // 錶板朝後上方，正對駕駛的眼睛。
  cluster.rotation.x = -0.3;
  for (const side of [-1, 1]) {
    const ring = new Mesh(new RingGeometry(0.04, 0.046, 24), glow);
    ring.position.set(side * 0.075, 0, 0);
    cluster.add(ring);
  }
  root.add(cluster);

  // 橫貫儀表板正面的金屬飾條，以及中控螢幕。
  root.add(
    box(accent, [2 * INNER_HALF_WIDTH_M - 0.06, 0.012, 0.012], [0, DASH_TOP_M - 0.2, DASH_REAR_Z_M - 0.035]),
  );
  const screen = box(display, [0.24, 0.12, 0.008], [0.02, DASH_TOP_M - 0.09, DASH_REAR_Z_M + 0.02]);
  screen.rotation.x = -0.25;
  root.add(screen);

  // 方向盤與轉向柱：盤面上緣往前傾，頂端略高於儀表板頂面，仍遠低於視線。
  const column = new Group();
  column.position.set(
    DRIVER_X_M,
    DASH_TOP_M + 0.09 - VISUAL.steeringWheelRadiusM * Math.cos(VISUAL.steeringWheelTiltRad),
    DASH_REAR_Z_M + 0.2,
  );
  column.rotation.x = -VISUAL.steeringWheelTiltRad;
  const steeringWheel = createSteeringWheel(dash);
  column.add(steeringWheel);
  column.add(
    shadowMesh(new CylinderGeometry(0.03, 0.035, 0.24, 12).rotateX(Math.PI / 2).translate(0, 0, -0.12), dash),
  );
  root.add(column);

  // 中央扶手、前座兩張、後座一排、防火牆與後置物板。
  root.add(box(dash, [0.2, 0.24, 0.9], [0, FLOOR_M + 0.22, DASH_REAR_Z_M + 0.4]));
  const frontBackZM = GAME_CAMERA_CONFIG.cockpit.aheadM * -1 + 0.2;
  root.add(createSeat(fabric, DRIVER_X_M, frontBackZM, 0.5));
  root.add(createSeat(fabric, -DRIVER_X_M, frontBackZM, 0.5));
  const rearBackZM = BODY_LAYOUT.rearWindowBaseZM - 0.5;
  // 後座椅背比車艙窄、比後擋玻璃低，角落才不會穿出 C 柱；它同時蓋住後輪拱在車艙裡隆起的地板。
  root.add(box(fabric, [2 * INNER_HALF_WIDTH_M, 0.22, 0.5], [0, FLOOR_M + 0.31, rearBackZM - 0.2]));
  root.add(box(fabric, [2 * INNER_HALF_WIDTH_M - 0.1, 0.5, 0.3], [0, FLOOR_M + 0.52, rearBackZM + 0.15]));
  root.add(
    box(dash, [2 * INNER_HALF_WIDTH_M, 0.03, 0.24], [0, COWL_M + 0.03, BODY_LAYOUT.rearWindowBaseZM - 0.1]),
  );
  root.add(
    box(dash, [2 * INNER_HALF_WIDTH_M, COWL_M - FLOOR_M, 0.02], [0, (COWL_M + FLOOR_M) / 2, BODY_LAYOUT.windshieldBaseZM + 0.02]),
  );

  // 車內後視鏡：掛在前擋上緣中央、頂篷下方。
  root.add(
    box(dash, [0.17, 0.045, 0.015], [0, VEHICLE_CONFIG_SI.heightM - 0.13, BODY_LAYOUT.windshieldTopZM + 0.02]),
  );

  return { root, steeringWheel };
}
