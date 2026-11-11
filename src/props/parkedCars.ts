// 背景停放的車：重用程序化轎車的車殼與輪子幾何，整批用 InstancedMesh 畫（每個材質分區一個 draw call）。
// 靜態、純視覺：沒有碰撞、輪子不轉、沒有內裝（玻璃不透明）、車燈不亮。
// 每台車的車牌號碼不同（固定種子）：全部車牌的字併成一個網格，只多一個 draw call。
import {
  Color,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DEFAULT_SEED } from '../core/gameConfig';
import { headingToRotationY } from '../core/heading';
import { createRng } from '../core/rng';
import type { VehicleDetail } from '../render/quality';
import { CAR_VISUAL_CONFIG as VISUAL, LOT_PROPS_CONFIG as LOT } from '../render/renderConfig';
import { BODY_LAYOUT, type BodyPart } from '../vehicle/carBody';
import {
  createBodyGeometries,
  createPlateTextGeometry,
  plateText,
} from '../vehicle/carFittings';
import {
  createBrakeDiscGeometry,
  createRimGeometry,
  createTireGeometry,
} from '../vehicle/carWheel';
import { VEHICLE_CONFIG_SI } from '../vehicle/vehicleConfig';
import type { PropPlacement } from './lotLayout';

/** 背景車畫的車身分區（沒有車艙內襯：玻璃不透明，看不進去）。配件（保險桿、燈組、車牌、門縫）已併在各分區裡。 */
export const PARKED_CAR_BODY_PARTS: readonly BodyPart[] = [
  'paint',
  'glass',
  'trim',
  'headlight',
  'taillight',
  'reverseLight',
  'chrome',
  'plate',
];

/** 背景車輪胎一圈的段數（偶數）：比玩家車少，遠看沒有差別。 */
const PARKED_WHEEL_SEGMENTS = 12;

const UNIT_SCALE = new Vector3(1, 1, 1);

/** 這台車的車色（線性色彩）：依 variant 從車色表裡挑。 */
export function parkedCarColor(variant: number): Color {
  const colors = LOT.carColors;
  const index = Math.min(Math.floor(variant * colors.length), colors.length - 1);
  return new Color(colors[index] ?? colors[0]);
}

/** 產生背景車車牌種子的亂數種子：與玩家車牌（DEFAULT_SEED）錯開。 */
const PLATE_SEED = DEFAULT_SEED + 7919;

/**
 * 每台背景車的車牌號碼：固定種子，同樣的數量每次都是同一組；彼此不重複，也不與玩家車的號碼相同。
 * @param count 背景車的數量
 */
export function parkedCarPlates(count: number): string[] {
  const rng = createRng(PLATE_SEED);
  const used = new Set<string>([plateText(DEFAULT_SEED)]);
  const plates: string[] = [];
  while (plates.length < count) {
    const text = plateText(Math.floor(rng() * 0x7fffffff));
    if (!used.has(text)) {
      used.add(text);
      plates.push(text);
    }
  }
  return plates;
}

/** 車的擺放矩陣（車位本地座標）。 */
function carMatrix(placement: PropPlacement): Matrix4 {
  return new Matrix4().compose(
    new Vector3(placement.x, placement.y, placement.z),
    new Quaternion().setFromEuler(new Euler(0, headingToRotationY(placement.headingRad), 0)),
    UNIT_SCALE,
  );
}

function instanced(
  geometry: BufferGeometry,
  material: Material,
  matrices: readonly Matrix4[],
): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((matrix, index) => {
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * 建立全部的背景車。回傳的群組用車位本地座標，要加進車位的座標框裡。
 * 每個車殼分區、輪胎、輪圈各一個 InstancedMesh，加上一個裝全部車牌號碼的網格；只有烤漆車殼投影。
 * @param detail low：輪圈只是一片圓盤；high：有輪輻的輪圈。
 */
export function createParkedCars(
  placements: readonly PropPlacement[],
  detail: VehicleDetail = 'high',
): Group {
  const group = new Group();
  group.name = 'parkedCars';
  if (placements.length === 0) {
    return group;
  }

  const lampOff = (color: number): MeshStandardMaterial =>
    new MeshStandardMaterial({ color, roughness: 0.3 });
  const trim = new MeshStandardMaterial({ color: VISUAL.trimColor, roughness: VISUAL.trimRoughness });
  const materials: Readonly<Record<BodyPart, Material>> = {
    // 車色由每個實例的顏色決定，材質本身是白的。
    paint: new MeshStandardMaterial({
      color: 0xffffff,
      roughness: LOT.carRoughness,
      metalness: LOT.carMetalness,
    }),
    glass: new MeshStandardMaterial({
      color: VISUAL.glassColor,
      roughness: VISUAL.minGlossRoughness,
    }),
    trim,
    headlight: lampOff(VISUAL.headlightColor),
    taillight: lampOff(VISUAL.taillightColor),
    reverseLight: lampOff(VISUAL.reverseLightOffColor),
    chrome: new MeshStandardMaterial({
      color: VISUAL.chromeColor,
      roughness: VISUAL.chromeRoughness,
      metalness: 1,
    }),
    plate: new MeshStandardMaterial({ color: VISUAL.plateColor, roughness: VISUAL.plateRoughness }),
    headliner: trim,
    cabinTrim: trim,
  };

  const carMatrices = placements.map(carMatrix);
  // 車牌上的字不併進共用的車殼：每台車的號碼不同，另外畫。
  const bodyGeometries = createBodyGeometries('low', { plateText: false });
  for (const part of PARKED_CAR_BODY_PARTS) {
    const geometry = bodyGeometries.get(part);
    if (geometry === undefined) {
      continue;
    }
    const mesh = instanced(geometry, materials[part], carMatrices);
    mesh.name = `parkedCars:${part}`;
    if (part === 'paint') {
      mesh.castShadow = true;
      placements.forEach((placement, index) => {
        mesh.setColorAt(index, parkedCarColor(placement.variant));
      });
    }
    group.add(mesh);
  }

  // 車牌的字：每台車自己的號碼，擺到各自的位置後全部併成一個網格（一個 draw call）。
  const plates = parkedCarPlates(placements.length);
  const plateTexts = new Mesh(
    mergeGeometries(
      carMatrices.map((matrix, index) =>
        createPlateTextGeometry(plates[index] ?? '').applyMatrix4(matrix),
      ),
    ),
    trim,
  );
  plateTexts.name = 'parkedCars:plateText';
  plateTexts.receiveShadow = true;
  plateTexts.userData.plates = plates;
  group.add(plateTexts);

  // 輪子：每台車四個。幾何的外側面朝 +X，左側的轉半圈。
  const wheelXM = BODY_LAYOUT.halfWidthM - VISUAL.wheelTuckM - VISUAL.wheelWidthM / 2;
  const halfWheelbaseM = VEHICLE_CONFIG_SI.wheelbaseM / 2;
  const wheelMatrices: Matrix4[] = [];
  for (const car of carMatrices) {
    for (const side of [-1, 1]) {
      for (const axleZM of [-halfWheelbaseM, halfWheelbaseM]) {
        const wheel = new Matrix4().compose(
          new Vector3(side * wheelXM, VISUAL.wheelRadiusM, axleZM),
          new Quaternion().setFromEuler(new Euler(0, side < 0 ? Math.PI : 0, 0)),
          UNIT_SCALE,
        );
        wheelMatrices.push(car.clone().multiply(wheel));
      }
    }
  }
  const segments = PARKED_WHEEL_SEGMENTS;
  const tires = instanced(
    createTireGeometry(segments),
    new MeshStandardMaterial({ color: VISUAL.tireColor, roughness: VISUAL.tireRoughness }),
    wheelMatrices,
  );
  tires.name = 'parkedCars:tire';
  const rims = instanced(
    detail === 'high' ? createRimGeometry(segments) : createBrakeDiscGeometry(segments),
    new MeshStandardMaterial({
      color: VISUAL.rimColor,
      roughness: VISUAL.rimRoughness,
      metalness: VISUAL.rimMetalness,
    }),
    wheelMatrices,
  );
  rims.name = 'parkedCars:rim';
  group.add(tires, rims);
  return group;
}
