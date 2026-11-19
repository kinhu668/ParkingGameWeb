// 停放的車（場地裡的背景車與關卡 JSON 的 parked_car）：每一款車的幾何來自 vehicle/carModelParts.ts，
// 同一款的車整批用 InstancedMesh 畫：烤漆、第二車色各一個（每台車自己的顏色），其餘全部併成一個頂點著色的網格。
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
import {
  createCarModelParts,
  type CarModelPart,
  type CarModelParts,
} from '../vehicle/carModelParts';
import { CAR_MODEL_IDS, carModelDimsM, type CarModelId } from '../vehicle/carModels';
import type { ParkedCar, PropPlacement } from './lotLayout';
import { occluderBox, registerOccluders, type OccluderPart } from './occluders';

/** 併進 rest 的一塊：顏色（sRGB）、粗糙度、金屬度，都寫在頂點上。 */
interface RestLook {
  readonly color: number;
  readonly roughness: number;
  readonly metalness: number;
}

/** 燈殼（沒亮）、牌面、座椅的粗糙度。 */
const LAMP_ROUGHNESS = 0.35;

/** 烤漆與第二車色以外的分區：每款車全部併成一個 rest 網格，各自的顏色與光澤如下。 */
const REST_LOOKS: Readonly<Record<Exclude<CarModelPart, 'paint' | 'accent'>, RestLook>> = {
  glass: { color: VISUAL.glassColor, roughness: VISUAL.minGlossRoughness, metalness: 0 },
  trim: { color: VISUAL.trimColor, roughness: VISUAL.trimRoughness, metalness: 0 },
  chrome: { color: VISUAL.chromeColor, roughness: VISUAL.chromeRoughness, metalness: 1 },
  headlight: { color: VISUAL.headlightColor, roughness: LAMP_ROUGHNESS, metalness: 0 },
  taillight: { color: VISUAL.taillightColor, roughness: LAMP_ROUGHNESS, metalness: 0 },
  reverseLight: { color: VISUAL.reverseLightOffColor, roughness: LAMP_ROUGHNESS, metalness: 0 },
  indicator: { color: VISUAL.indicatorColor, roughness: LAMP_ROUGHNESS, metalness: 0 },
  plate: { color: VISUAL.plateColor, roughness: LAMP_ROUGHNESS, metalness: 0 },
  upholstery: { color: LOT.carUpholsteryColor, roughness: LAMP_ROUGHNESS, metalness: 0 },
};
const TIRE_LOOK: RestLook = {
  color: VISUAL.tireColor,
  roughness: VISUAL.tireRoughness,
  metalness: 0,
};

/** 每款車各自用實例顏色的分區（依這個順序）。 */
const PAINTED_PARTS = ['paint', 'accent'] as const satisfies readonly CarModelPart[];

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
function carMatrix(placement: Pick<PropPlacement, 'x' | 'y' | 'z' | 'headingRad'>): Matrix4 {
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
 * rest 的一塊：只留位置與法線（可以先擺到車上的某個位置），加上頂點顏色與 gloss（粗糙度、金屬度）。
 * 一律帶索引，原本共用的頂點照樣共用。
 */
function restPiece(source: BufferGeometry, look: RestLook, matrix?: Matrix4): BufferGeometry {
  const piece = new BufferGeometry();
  const positions = source.getAttribute('position').clone();
  const normals = source.getAttribute('normal').clone();
  piece.setAttribute('position', positions);
  piece.setAttribute('normal', normals);
  piece.setIndex(
    source.getIndex()?.clone() ?? Array.from({ length: positions.count }, (_, index) => index),
  );
  if (matrix !== undefined) {
    piece.applyMatrix4(matrix);
  }
  const color = new Color(look.color);
  const colors = new Float32Array(positions.count * 3);
  const gloss = new Float32Array(positions.count * 2);
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    color.toArray(colors, vertex * 3);
    gloss[vertex * 2] = look.roughness;
    gloss[vertex * 2 + 1] = look.metalness;
  }
  piece.setAttribute('color', new BufferAttribute(colors, 3));
  piece.setAttribute('gloss', new BufferAttribute(gloss, 2));
  return piece;
}

/**
 * 一款車烤漆以外的全部東西（玻璃、黑飾條、鍍鉻、燈殼、牌面、座椅、四個輪胎與輪圈）併成一個幾何：
 * 每多一款車只多一個 draw call，不是八個。輪子不轉，所以直接擺在輪心；幾何的外側面朝 +X，左側的轉半圈。
 */
function createRestGeometry(parts: CarModelParts): BufferGeometry {
  const pieces: BufferGeometry[] = [];
  for (const [part, geometry] of parts.body) {
    if (part !== 'paint' && part !== 'accent') {
      pieces.push(restPiece(geometry, REST_LOOKS[part]));
    }
  }
  const { wheel } = parts;
  const rimLook: RestLook = {
    color: wheel.rimColor,
    roughness: VISUAL.rimRoughness,
    metalness: VISUAL.rimMetalness,
  };
  for (const side of [-1, 1]) {
    for (const [xM, yM, zM] of wheel.centers) {
      const matrix = new Matrix4().compose(
        new Vector3(side * xM, yM, zM),
        new Quaternion().setFromEuler(new Euler(0, side < 0 ? Math.PI : 0, 0)),
        UNIT_SCALE,
      );
      pieces.push(restPiece(wheel.tire, TIRE_LOOK, matrix), restPiece(wheel.rim, rimLook, matrix));
    }
  }
  return mergeGeometries(pieces);
}

/** rest 的材質：顏色、粗糙度、金屬度都讀頂點上的值（color、gloss 兩個屬性）。 */
function createRestMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ vertexColors: true });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 gloss;\nvarying vec2 vGloss;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGloss = gloss;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGloss;')
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = vGloss.x;',
      )
      .replace(
        '#include <metalnessmap_fragment>',
        '#include <metalnessmap_fragment>\nmetalnessFactor = vGloss.y;',
      );
  };
  return material;
}

/**
 * 建立全部停放的車。回傳的群組用車位本地座標，要加進車位的座標框裡。
 * 每一款有車的車款各自最多三個 InstancedMesh（`parkedCars:<車款>:paint`、`:accent`、`:rest`；
 * userData.cars 是各實例在 cars 裡的索引），加上一個裝全部車牌號碼的網格；只有烤漆投影。
 * @param detail low：輪圈只是一片輪蓋、輪胎 12 段；high：有輪輻的輪圈、輪胎 20 段。
 */
export function createParkedCars(
  cars: readonly Pick<ParkedCar, 'x' | 'y' | 'z' | 'headingRad' | 'variant' | 'model'>[],
  detail: VehicleDetail = 'high',
): Group {
  const group = new Group();
  group.name = 'parkedCars';
  if (cars.length === 0) {
    return group;
  }

  // 烤漆與玩家車同一套庫材質（物件座標取樣）；停放的車不開清漆（省一層反射的計算），車色是每台各自的實例顏色。
  const paintMaterial = createSurfaceMaterial('carPaint', {
    space: 'local',
    color: 0xffffff,
    roughness: LOT.carRoughness,
    metalness: LOT.carMetalness,
    clearcoat: 0,
  });
  const restMaterial = createRestMaterial();
  // 車牌上的字：與玩家車的黑飾條同一種塑膠。
  const trim = createSurfaceMaterial('plastic', {
    space: 'local',
    color: VISUAL.trimColor,
    roughness: VISUAL.trimRoughness,
  });

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
      // 各實例是 cars 裡的第幾台（警報燈的疊加層要對回是哪一台車）。
      mesh.userData.cars = members;
      group.add(mesh);
      members.forEach((car, instance) => fadeParts[car]?.push({ mesh, index: instance }));
      return mesh;
    };

    for (const part of PAINTED_PARTS) {
      const geometry = parts.body.get(part);
      if (geometry === undefined) {
        continue;
      }
      const mesh = add(part, geometry, paintMaterial);
      mesh.castShadow = part === 'paint';
      members.forEach((car, instance) => {
        mesh.setColorAt(instance, parkedCarPaint(model, cars[car]?.variant ?? 0)[part]);
      });
    }
    add('rest', createRestGeometry(parts), restMaterial);
    members.forEach((car) => {
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

  // 擋到跟車鏡頭時整台一起淡（烤漆、第二車色、rest）；車牌上的字藏起來。擋住鏡頭的範圍就是這款車的外框。
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
