// 停放的車（場地裡的背景車與關卡 JSON 的 parked_car）：每一款車的幾何來自 vehicle/carModelParts.ts，
// 同一款的車整批用 InstancedMesh 畫（每個材質分區一個 draw call）。
// 靜態、純視覺：輪子不轉、沒有內裝（玻璃不透明）、車燈不亮；碰撞由關卡的碰撞盒負責。
// 每台車的車牌號碼不同（固定種子）：全部車牌的字併成一個網格，只多一個 draw call。
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DEFAULT_SEED } from '../core/gameConfig';
import { headingToRotationY } from '../core/heading';
import { createRng } from '../core/rng';
import { createSurfaceMaterial } from '../materials/surfaceMaterial';
import type { VehicleDetail } from '../render/quality';
import {
  CAR_VISUAL_CONFIG as VISUAL,
  LOT_PROPS_CONFIG as LOT,
  PARKED_CAR_PAINTS,
} from '../render/renderConfig';
import { plateText } from '../vehicle/carFittings';
import { createRimMaterial, createTireMaterial } from '../vehicle/carMesh';
import {
  createCarModelParts,
  type CarModelPart,
  type CarModelParts,
} from '../vehicle/carModelParts';
import { CAR_MODEL_IDS, carModelDimsM, type CarModelId } from '../vehicle/carModels';
import type { PropPlacement } from './lotLayout';
import { occluderBox, registerOccluders, type OccluderPart } from './occluders';

/** 停放的一台車：擺放位置加上車款。 */
export interface ParkedCar extends PropPlacement {
  readonly model: CarModelId;
}

/** 併成一個頂點著色網格的小分區（燈殼、牌面、敞篷車的座椅）：一款車只多一個 draw call，不是六個。 */
const DETAIL_PARTS = [
  'headlight',
  'taillight',
  'reverseLight',
  'indicator',
  'plate',
  'upholstery',
] as const satisfies readonly CarModelPart[];

const DETAIL_COLORS: Readonly<Record<(typeof DETAIL_PARTS)[number], number>> = {
  headlight: VISUAL.headlightColor,
  taillight: VISUAL.taillightColor,
  reverseLight: VISUAL.reverseLightOffColor,
  indicator: VISUAL.indicatorColor,
  plate: VISUAL.plateColor,
  upholstery: LOT.carUpholsteryColor,
};

/** 一款車各自畫成一個 InstancedMesh 的分區（依這個順序）；其餘的小分區併進 detail。 */
const INSTANCED_PARTS = ['paint', 'accent', 'glass', 'trim', 'chrome'] as const satisfies readonly CarModelPart[];

const UNIT_SCALE = new Vector3(1, 1, 1);

/**
 * 這台車的車色與第二個車色（線性色彩）：依 variant 從這款車的配色表裡挑一組。
 * 第二個車色用在 accent 分區（條紋之類）；沒有那個分區的車款用不到。
 */
export function parkedCarPaint(model: CarModelId, variant: number): { paint: Color; accent: Color } {
  const paints = PARKED_CAR_PAINTS[model];
  const index = Math.min(Math.floor(variant * paints.length), paints.length - 1);
  const [paint, accent] = paints[index] ?? [0xffffff, 0xffffff];
  return { paint: new Color(paint), accent: new Color(accent) };
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

/** 小分區併成一個帶頂點顏色的幾何（只留位置與法線）；這款車一個小分區都沒有就回傳 undefined。 */
function createDetailGeometry(body: CarModelParts['body']): BufferGeometry | undefined {
  const pieces: BufferGeometry[] = [];
  for (const part of DETAIL_PARTS) {
    const source = body.get(part);
    if (source === undefined) {
      continue;
    }
    const flat = source.index === null ? source : source.toNonIndexed();
    const piece = new BufferGeometry();
    piece.setAttribute('position', flat.getAttribute('position'));
    piece.setAttribute('normal', flat.getAttribute('normal'));
    const color = new Color(DETAIL_COLORS[part]);
    const count = flat.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let vertex = 0; vertex < count; vertex += 1) {
      color.toArray(colors, vertex * 3);
    }
    piece.setAttribute('color', new BufferAttribute(colors, 3));
    pieces.push(piece);
  }
  return pieces.length === 0 ? undefined : mergeGeometries(pieces);
}

/**
 * 建立全部停放的車。回傳的群組用車位本地座標，要加進車位的座標框裡。
 * 每一款有車的車款各自一組 InstancedMesh（`parkedCars:<車款>:<分區>`：烤漆、第二車色、玻璃、黑飾條、鍍鉻、
 * 併在一起的小分區 detail、輪胎 tire、輪圈 rim），加上一個裝全部車牌號碼的網格；只有烤漆投影。
 * @param detail low：輪圈只是一片輪蓋、輪胎 12 段；high：有輪輻的輪圈、輪胎 20 段。
 */
export function createParkedCars(cars: readonly ParkedCar[], detail: VehicleDetail = 'high'): Group {
  const group = new Group();
  group.name = 'parkedCars';
  if (cars.length === 0) {
    return group;
  }

  // 與玩家車同一套庫材質（物件座標取樣）；停放的車不開清漆（省一層反射的計算），車色是每台各自的實例顏色。
  const trim = createSurfaceMaterial('plastic', {
    space: 'local',
    color: VISUAL.trimColor,
    roughness: VISUAL.trimRoughness,
  });
  const paint = (): Material =>
    createSurfaceMaterial('carPaint', {
      space: 'local',
      color: 0xffffff,
      roughness: LOT.carRoughness,
      metalness: LOT.carMetalness,
      clearcoat: 0,
    });
  const materials: Readonly<Record<(typeof INSTANCED_PARTS)[number], Material>> = {
    paint: paint(),
    accent: paint(),
    glass: createSurfaceMaterial('glass', {
      space: 'local',
      color: VISUAL.glassColor,
      roughness: VISUAL.minGlossRoughness,
    }),
    trim,
    chrome: createSurfaceMaterial('chrome', {
      space: 'local',
      color: VISUAL.chromeColor,
      roughness: VISUAL.chromeRoughness,
      metalness: 1,
    }),
  };
  // 燈殼沒亮、牌面、座椅：顏色在頂點上。
  const detailMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 0.35 });

  const carMatrices = cars.map(carMatrix);
  const plates = parkedCarPlates(cars.length);
  /** 每台車車牌上的字（已擺到各自的位置）；依 cars 的順序。 */
  const plateGeometries: BufferGeometry[] = [];
  /** 每台車在「它那一款」的 InstancedMesh 裡是第幾個，以及那一款的全部網格。 */
  const fadeParts: OccluderPart[][] = cars.map(() => []);

  for (const model of CAR_MODEL_IDS) {
    /** 這一款的車在 cars 裡的索引。 */
    const members = cars.flatMap((car, index) => (car.model === model ? [index] : []));
    if (members.length === 0) {
      continue;
    }
    const parts = createCarModelParts(model, detail);
    const matrices = members.map((index) => carMatrices[index] ?? new Matrix4());
    const add = (name: string, geometry: BufferGeometry, material: Material): InstancedMesh => {
      const mesh = instanced(geometry, material, matrices);
      mesh.name = `parkedCars:${model}:${name}`;
      group.add(mesh);
      members.forEach((car, instance) => fadeParts[car]?.push({ mesh, index: instance }));
      return mesh;
    };

    for (const part of INSTANCED_PARTS) {
      const geometry = parts.body.get(part);
      if (geometry === undefined) {
        continue;
      }
      const mesh = add(part, geometry, materials[part]);
      mesh.castShadow = part === 'paint';
      if (part === 'paint' || part === 'accent') {
        members.forEach((car, instance) => {
          mesh.setColorAt(instance, parkedCarPaint(model, cars[car]?.variant ?? 0)[part]);
        });
      }
    }
    const detailGeometry = createDetailGeometry(parts.body);
    if (detailGeometry !== undefined) {
      add('detail', detailGeometry, detailMaterial);
    }

    // 輪子：每台車四個。幾何的外側面朝 +X，左側的轉半圈。
    const { wheel } = parts;
    const wheelMatrices: Matrix4[] = [];
    for (const car of matrices) {
      for (const side of [-1, 1]) {
        for (const [xM, yM, zM] of wheel.centers) {
          const local = new Matrix4().compose(
            new Vector3(side * xM, yM, zM),
            new Quaternion().setFromEuler(new Euler(0, side < 0 ? Math.PI : 0, 0)),
            UNIT_SCALE,
          );
          wheelMatrices.push(car.clone().multiply(local));
        }
      }
    }
    const tires = instanced(wheel.tire, createTireMaterial(wheel), wheelMatrices);
    tires.name = `parkedCars:${model}:tire`;
    const rims = instanced(wheel.rim, createRimMaterial(wheel.rimColor), wheelMatrices);
    rims.name = `parkedCars:${model}:rim`;
    group.add(tires, rims);
    members.forEach((car, instance) => {
      for (let corner = 0; corner < 4; corner += 1) {
        fadeParts[car]?.push(
          { mesh: tires, index: instance * 4 + corner },
          { mesh: rims, index: instance * 4 + corner },
        );
      }
      plateGeometries[car] = parts
        .plateText(plates[car] ?? '')
        .applyMatrix4(carMatrices[car] ?? new Matrix4());
    });
  }

  // 車牌的字：每台車自己的號碼，擺到各自的位置後全部併成一個網格（一個 draw call）。
  /** 每台車的字在合併後的網格裡佔幾個索引（沒有索引就是頂點數）。 */
  const plateCounts = plateGeometries.map(
    (geometry) => geometry.getIndex()?.count ?? geometry.getAttribute('position').count,
  );
  const plateGeometry = mergeGeometries(plateGeometries);
  const plateTexts: Mesh = new Mesh(plateGeometry, trim);
  // 某幾台車被淡成半透明時，它們車牌上的字不畫：用分組只畫其餘的車。沒有車被淡就不分組，與原本完全相同。
  const hiddenPlates = new Set<number>();
  const setPlateHidden = (index: number, hidden: boolean): void => {
    if (hidden) {
      hiddenPlates.add(index);
    } else {
      hiddenPlates.delete(index);
    }
    plateGeometry.clearGroups();
    if (hiddenPlates.size === 0) {
      plateTexts.material = trim;
      return;
    }
    let start = 0;
    plateCounts.forEach((count, car) => {
      if (!hiddenPlates.has(car)) {
        plateGeometry.addGroup(start, count, 0);
      }
      start += count;
    });
    plateTexts.material = [trim];
  };
  plateTexts.name = 'parkedCars:plateText';
  plateTexts.receiveShadow = true;
  plateTexts.userData.plates = plates;
  group.add(plateTexts);

  // 擋到跟車鏡頭時整台一起淡：車身各分區、四個輪胎與輪圈；車牌上的字藏起來。擋住鏡頭的範圍就是這款車的外框。
  registerOccluders(
    group,
    cars.map((car, index) => {
      const dims = carModelDimsM(car.model);
      return {
        boxes: [
          occluderBox(
            { x: car.x, y: car.y + dims.heightM / 2, z: car.z },
            { x: dims.widthM, y: dims.heightM, z: dims.lengthM },
            headingToRotationY(car.headingRad),
          ),
        ],
        parts: fadeParts[index] ?? [],
        setHidden: (hidden: boolean) => {
          setPlateHidden(index, hidden);
        },
      };
    }),
  );
  return group;
}
