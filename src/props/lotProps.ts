// 場景擺設的網格：把 lotLayout.ts 算出來的佈局畫成 InstancedMesh（同幾何同材質的一類一個 draw call）。
// 全部是純視覺：不進物理、不進碰撞、不進停車判定。
// 路燈：燈殼底下的發光面每一盞都有；前幾盞（依畫質級別）是真的 SpotLight（不投影），
// 其餘用地上的加色光暈代替；半透明的光錐做出體積光的感覺，不參與環境光遮蔽。
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SpotLight,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { forward, headingToRotationY } from '../core/heading';
import { ftToM } from '../core/units';
import type { ParkingSpot } from '../level/parkingJudge';
import { SKIP_AMBIENT_OCCLUSION } from '../render/ambientOcclusionFlag';
import type { PropsQualitySettings, VehicleDetail } from '../render/quality';
import { LOT_PROPS_CONFIG as LOT, OCCLUSION_FADE_CONFIG as FADE } from '../render/renderConfig';
import { createSpotFrame, createWheelStopGeometry, createWheelStopMaterial } from './lotEdges';
import type { LotLayout, PropPlacement } from './lotLayout';
import { occluderBox, registerOccluders, type OccluderPart } from './occluders';
import { createParkedCars } from './parkedCars';
import { createCappedShadowDepthMaterial } from './shadowReach';

/** 光暈離地的高度：高過標線，又低到看不出浮起來。 */
const LAMP_POOL_LIFT_M = ftToM(0.08);

/** 遮擋判定用：燈臂＋燈殼那一塊的高度（含斜撐以上的部分）。 */
const LAMP_ARM_BOX_HEIGHT_M = ftToM(1.2);

/** 路燈沒亮時燈罩的顏色。 */
const LAMP_OFF_LENS_COLOR = 0xd8d4c8;

/** 一個實例的位置、繞 Y 的旋轉、縮放。 */
interface InstanceTransform {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rotationY: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly scaleZ: number;
}

function matrixOf(transform: InstanceTransform): Matrix4 {
  return new Matrix4().compose(
    new Vector3(transform.x, transform.y, transform.z),
    new Quaternion().setFromEuler(new Euler(0, transform.rotationY, 0)),
    new Vector3(transform.scaleX, transform.scaleY, transform.scaleZ),
  );
}

/** 擺在 placement 的位置與朝向，不縮放。 */
function atPlacement(placement: PropPlacement): InstanceTransform {
  return {
    x: placement.x,
    y: placement.y,
    z: placement.z,
    rotationY: headingToRotationY(placement.headingRad),
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
  };
}

/** 單位方塊（底面在 y = 0）縮放成 placement 的大小。 */
function boxAt(placement: PropPlacement): InstanceTransform {
  return {
    ...atPlacement(placement),
    scaleX: placement.sizeX,
    scaleY: placement.sizeY,
    scaleZ: placement.sizeZ,
  };
}

interface InstancedOptions {
  readonly name: string;
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
  /** 每個實例的顏色（乘在材質顏色上）。 */
  readonly colors?: readonly Color[];
}

/** 建立一個 InstancedMesh；沒有實例就回傳 undefined（不佔 draw call）。 */
function instanced(
  geometry: BufferGeometry,
  material: Material,
  transforms: readonly InstanceTransform[],
  options: InstancedOptions,
): InstancedMesh | undefined {
  if (transforms.length === 0) {
    return undefined;
  }
  const mesh = new InstancedMesh(geometry, material, transforms.length);
  transforms.forEach((transform, index) => {
    mesh.setMatrixAt(index, matrixOf(transform));
  });
  options.colors?.forEach((color, index) => {
    mesh.setColorAt(index, color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = options.name;
  mesh.castShadow = options.castShadow ?? false;
  mesh.receiveShadow = options.receiveShadow ?? true;
  return mesh;
}

/** 這個實例在這幾個 InstancedMesh 裡的那一份（沒有實例的網格是 undefined，略過）。 */
function instanceParts(
  meshes: readonly (InstancedMesh | undefined)[],
  index: number,
): OccluderPart[] {
  return meshes.flatMap((mesh) => (mesh === undefined ? [] : [{ mesh, index }]));
}

/** 單位方塊：邊長 1、底面在 y = 0。 */
function unitBox(): BoxGeometry {
  return new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
}

/** 把整個幾何塗成同一個頂點顏色（合併成一個幾何後各部分仍有自己的顏色）。 */
export function tinted<T extends BufferGeometry>(geometry: T, hex: number): T {
  const color = new Color(hex);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

/** 依 variant 從顏色表裡挑一個，再用 shade（0–1）稍微調整明暗。 */
function pick(colors: readonly number[], variant: number, shade = 0.5): Color {
  const index = Math.min(Math.floor(variant * colors.length), colors.length - 1);
  return new Color(colors[index] ?? 0xffffff).multiplyScalar(0.85 + 0.3 * shade);
}

/** variant 的小數部分再展開成另一個 0–1 的數（同一個實例要兩個不相關的亂數時用）。 */
function secondary(variant: number): number {
  return (variant * 7.31) % 1;
}

function standard(color: number, roughness: number, metalness = 0): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness, metalness });
}

/** 燈頭（發光面的中心）的位置：燈桿頂端沿燈臂方向伸出去。 */
export function lampHeadPosition(lamp: PropPlacement): { x: number; y: number; z: number } {
  const ahead = forward(lamp.headingRad);
  return {
    x: lamp.x + ahead.x * LOT.lampArmLengthM,
    y: lamp.sizeY - LOT.lampHeadSizeM.y / 2,
    z: lamp.z + ahead.z * LOT.lampArmLengthM,
  };
}

/**
 * 路燈的樣式。
 * - classic：原型關那座停車場的燈（細燈臂托著燈殼）；原型關的基準畫面靠它，不改。
 * - braced：有邊界的關卡用的：底座、桿頂的接頭、與燈殼同高的粗燈臂、斜撐。遠看、正對著燈臂看，
 *   桿、臂、燈頭都連成一體，不會只剩一根細桿頂著一個小方塊。
 */
export type LampStyle = 'classic' | 'braced';

/**
 * 燈桿的零件（本地座標：桿底在原點、燈臂朝 −Z）。順序是從地面往燈頭：每一件都與前面的某一件相接。
 * 兩種樣式的燈殼位置相同（發光面、光錐、真光源都以它為準，見 lampHeadPosition）。
 */
export function createLampPostParts(style: LampStyle): BufferGeometry[] {
  const heightM = LOT.lampHeightM;
  const head = LOT.lampHeadSizeM;
  const armM = LOT.lampArmLengthM;
  const pole = new CylinderGeometry(LOT.lampPoleRadiusM * 0.75, LOT.lampPoleRadiusM, heightM, 10).translate(
    0,
    heightM / 2,
    0,
  );
  const housing = new BoxGeometry(head.x, head.y, head.z).translate(0, heightM, -armM);
  if (style === 'classic') {
    const armThicknessM = ftToM(0.35);
    return [
      pole,
      new BoxGeometry(armThicknessM, armThicknessM, armM).translate(0, heightM - armThicknessM, -armM / 2),
      housing,
    ];
  }
  const baseHeightM = ftToM(1.6);
  const jointM = { x: ftToM(0.8), y: ftToM(0.9), z: ftToM(0.8) };
  const armM3 = { x: ftToM(0.55), y: ftToM(0.4) };
  // 燈臂與燈殼同高，一路伸進燈殼裡。
  const armReachM = armM - head.z / 2 + ftToM(0.4);
  // 斜撐：從桿身斜上去托住燈臂的中段。
  const braceDropM = ftToM(3.2);
  const braceOutM = ftToM(3.2);
  const braceLengthM = Math.hypot(braceDropM, braceOutM);
  const braceThicknessM = ftToM(0.3);
  const brace = new BoxGeometry(braceThicknessM, braceThicknessM, braceLengthM)
    .rotateX(Math.atan2(braceDropM, braceOutM))
    .translate(0, heightM - braceDropM / 2 - armM3.y / 2, -braceOutM / 2);
  // 燈殼後端的收邊：比燈殼窄、比燈臂寬，燈臂接進燈殼的地方不是直角硬接。
  const neckLengthM = ftToM(0.9);
  const neck = new BoxGeometry(head.x * 0.62, head.y * 1.25, neckLengthM).translate(
    0,
    heightM,
    -armM + head.z / 2 + neckLengthM / 2 - ftToM(0.1),
  );
  return [
    new CylinderGeometry(LOT.lampPoleRadiusM * 1.5, LOT.lampPoleRadiusM * 1.9, baseHeightM, 10).translate(
      0,
      baseHeightM / 2,
      0,
    ),
    pole,
    new BoxGeometry(jointM.x, jointM.y, jointM.z).translate(0, heightM - jointM.y / 2 + head.y / 2, 0),
    new BoxGeometry(armM3.x, armM3.y, armReachM).translate(0, heightM, -armReachM / 2),
    brace,
    neck,
    housing,
  ];
}

/** 路燈：燈桿＋燈臂＋燈殼（一個幾何）、發光面、光錐、地上的光暈、少數幾盞真光源。 */
function addLamps(
  group: Group,
  lamps: readonly PropPlacement[],
  props: PropsQualitySettings,
  hdr: boolean,
  lampsLit: boolean,
  style: LampStyle,
): void {
  if (lamps.length === 0) {
    return;
  }
  const heightM = LOT.lampHeightM;
  const head = LOT.lampHeadSizeM;
  const armM = LOT.lampArmLengthM;
  const post = mergeGeometries(createLampPostParts(style));
  const posts = instanced(post, standard(LOT.lampColor, 0.6, 0.5), lamps.map(atPlacement), {
    name: 'lampPosts',
    castShadow: true,
  });
  const lensThicknessM = ftToM(0.1);
  const lens = new BoxGeometry(head.x * 0.82, lensThicknessM, head.z * 0.82).translate(
    0,
    heightM - head.y / 2 - lensThicknessM / 2,
    -armM,
  );
  const lenses = instanced(
    lens,
    lampsLit
      ? new MeshStandardMaterial({
          color: LOT.lampGlowColor,
          emissive: LOT.lampGlowColor,
          emissiveIntensity: LOT.lampGlowIntensity,
          roughness: 0.4,
        })
      : // 白天不亮：只是一片乳白的燈罩。
        new MeshStandardMaterial({ color: LAMP_OFF_LENS_COLOR, roughness: 0.4 }),
    lamps.map(atPlacement),
    { name: 'lampLenses', receiveShadow: false },
  );
  for (const mesh of [posts, lenses]) {
    if (mesh !== undefined) {
      group.add(mesh);
    }
  }
  // 擋到跟車鏡頭時整盞一起淡：燈桿一塊、燈臂＋燈殼一塊（光錐與光暈本來就是半透明的，不必淡）。
  const reachM = armM + head.z / 2;
  registerOccluders(
    group,
    lamps.map((lamp, index) => {
      const ahead = forward(lamp.headingRad);
      return {
        boxes: [
          occluderBox(
            { x: lamp.x, y: heightM / 2, z: lamp.z },
            { x: 2 * LOT.lampPoleRadiusM, y: heightM, z: 2 * LOT.lampPoleRadiusM },
          ),
          occluderBox(
            {
              x: lamp.x + (ahead.x * reachM) / 2,
              y: heightM - LAMP_ARM_BOX_HEIGHT_M / 2 + head.y / 2,
              z: lamp.z + (ahead.z * reachM) / 2,
            },
            { x: head.x, y: LAMP_ARM_BOX_HEIGHT_M, z: reachM },
            headingToRotationY(lamp.headingRad),
          ),
        ],
        parts: instanceParts([posts, lenses], index),
      };
    }),
  );

  // 沒亮的燈到這裡為止：沒有光錐、沒有地上的光暈、沒有真光源。
  if (!lampsLit) {
    return;
  }

  const heads = lamps.map(lampHeadPosition);
  const realLights = Math.min(props.realLights, lamps.length);
  // 加色混合的材質不做色調映射：直接畫到畫面上時，色調映射會把「沒有光」的邊緣也抬成一圈看得見的冷色。
  const glow = (brightness: { readonly hdr: number; readonly direct: number }): MeshBasicMaterial =>
    new MeshBasicMaterial({
      color: new Color(LOT.lampConeColor).multiplyScalar(hdr ? brightness.hdr : brightness.direct),
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });

  // 光錐：頂端在燈頭、往地面張開；頂點顏色從頂端的 1 淡到地面的 0，加色混合，不寫深度。
  // 只畫朝外的那一面：鏡頭在光錐外面時每個像素只疊一層，不會把畫面洗白，也省一半的填色。
  if (props.lightCones) {
    const cone = new CylinderGeometry(1, 1, 1, 24, 6, true).translate(0, -0.5, 0);
    const position = cone.getAttribute('position');
    const fade = new Float32Array(position.count * 3);
    for (let index = 0; index < position.count; index += 1) {
      // y：0 是頂端、−1 是地面。半徑沿高度由頂端的小圓張到地面的大圓。
      const down = -position.getY(index);
      const radius =
        LOT.lampConeTopRadiusM + (LOT.lampConeBottomRadiusM - LOT.lampConeTopRadiusM) * down;
      position.setXYZ(index, position.getX(index) * radius, -down, position.getZ(index) * radius);
      const brightness = (1 - down) ** 2;
      fade.set([brightness, brightness, brightness], index * 3);
    }
    cone.setAttribute('color', new BufferAttribute(fade, 3));
    const cones = instanced(
      cone,
      glow(LOT.lampConeBrightness),
      heads.map((position3) => ({
        x: position3.x,
        y: position3.y,
        z: position3.z,
        rotationY: 0,
        scaleX: 1,
        scaleY: position3.y,
        scaleZ: 1,
      })),
      { name: 'lampCones', receiveShadow: false },
    );
    if (cones !== undefined) {
      cones.userData[SKIP_AMBIENT_OCCLUSION] = true;
      group.add(cones);
    }
  }

  // 地上的光暈：沒有真光源的燈用一片加色的圓（中心亮、邊緣淡到 0）假裝照亮地面。
  const pool = new CircleGeometry(LOT.lampPoolRadiusM, 32).rotateX(-Math.PI / 2);
  const poolPosition = pool.getAttribute('position');
  const poolFade = new Float32Array(poolPosition.count * 3);
  for (let index = 0; index < poolPosition.count; index += 1) {
    const fromCenter =
      Math.hypot(poolPosition.getX(index), poolPosition.getZ(index)) / LOT.lampPoolRadiusM;
    const brightness = Math.max(0, 1 - fromCenter);
    poolFade.set([brightness, brightness, brightness], index * 3);
  }
  pool.setAttribute('color', new BufferAttribute(poolFade, 3));
  const pools = instanced(
    pool,
    glow(LOT.lampPoolBrightness),
    heads.slice(realLights).map((position3) => ({
      x: position3.x,
      y: LAMP_POOL_LIFT_M,
      z: position3.z,
      rotationY: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
    })),
    { name: 'lampPools', receiveShadow: false },
  );
  if (pools !== undefined) {
    pools.userData[SKIP_AMBIENT_OCCLUSION] = true;
    group.add(pools);
  }

  // 真光源：最重要的前幾盞，從燈頭垂直往下照。不投影（每多一張陰影貼圖，軟體算圖就多畫一遍場景）。
  for (const position3 of heads.slice(0, realLights)) {
    const light = new SpotLight(
      LOT.lampGlowColor,
      LOT.lampLightIntensity,
      LOT.lampLightDistanceM,
      LOT.lampLightAngleRad,
      LOT.lampLightPenumbra,
    );
    light.name = 'lampLight';
    light.position.set(position3.x, position3.y, position3.z);
    light.target.position.set(position3.x, 0, position3.z);
    group.add(light, light.target);
  }
}

/** 樹：樹幹（圓柱）＋兩團樹冠；灌木是貼地的一團。樹冠與灌木共用一個 InstancedMesh。 */
function addPlants(
  group: Group,
  trees: readonly PropPlacement[],
  bushes: readonly PropPlacement[],
  detail: VehicleDetail,
): void {
  const trunkRadiusM = ftToM(0.55);
  const trunks = instanced(
    new CylinderGeometry(0.7, 1, 1, 8).translate(0, 0.5, 0),
    standard(LOT.trunkColor, 0.95),
    trees.map((tree) => ({
      ...atPlacement(tree),
      scaleX: trunkRadiusM,
      scaleY: tree.sizeY * 0.5,
      scaleZ: trunkRadiusM,
    })),
    { name: 'treeTrunks', castShadow: true },
  );

  const blobs: InstanceTransform[] = [];
  const colors: Color[] = [];
  for (const tree of trees) {
    const radiusM = tree.sizeX / 2;
    const ahead = forward(tree.headingRad);
    const rotationY = headingToRotationY(tree.headingRad);
    // 主樹冠在上半部；第二團小一點、偏一邊、高一點，樹形才不是一顆球。
    blobs.push({
      x: tree.x,
      y: tree.sizeY * 0.62,
      z: tree.z,
      rotationY,
      scaleX: radiusM,
      scaleY: tree.sizeY * 0.36,
      scaleZ: radiusM * (0.85 + 0.15 * tree.variant),
    });
    blobs.push({
      x: tree.x + ahead.x * radiusM * 0.45,
      y: tree.sizeY * 0.74,
      z: tree.z + ahead.z * radiusM * 0.45,
      rotationY: rotationY + 1,
      scaleX: radiusM * 0.62,
      scaleY: tree.sizeY * 0.24,
      scaleZ: radiusM * 0.62,
    });
    const color = pick(LOT.foliageColors, tree.variant, secondary(tree.variant));
    colors.push(color, color.clone().multiplyScalar(1.12));
  }
  for (const bush of bushes) {
    blobs.push({
      x: bush.x,
      y: bush.sizeY * 0.4,
      z: bush.z,
      rotationY: headingToRotationY(bush.headingRad),
      scaleX: bush.sizeX / 2,
      scaleY: bush.sizeY * 0.6,
      scaleZ: bush.sizeZ / 2,
    });
    colors.push(pick(LOT.foliageColors, bush.variant, secondary(bush.variant)));
  }
  const foliage = instanced(
    new IcosahedronGeometry(1, detail === 'high' ? 2 : 1),
    new MeshStandardMaterial({
      color: 0xffffff,
      roughness: LOT.foliageRoughness,
      flatShading: true,
    }),
    blobs,
    { name: 'foliage', castShadow: true, colors },
  );
  for (const mesh of [trunks, foliage]) {
    if (mesh !== undefined) {
      group.add(mesh);
    }
  }
  // 擋到跟車鏡頭時整棵一起淡：樹幹一塊、樹冠一塊（樹冠是橢球，方塊取小一點，角落的空氣不算）。灌木很矮，不淡。
  registerOccluders(
    group,
    trees.map((tree, index) => ({
      boxes: [
        occluderBox(
          { x: tree.x, y: tree.sizeY * 0.25, z: tree.z },
          { x: 2 * trunkRadiusM, y: tree.sizeY * 0.5, z: 2 * trunkRadiusM },
        ),
        occluderBox(
          { x: tree.x, y: tree.sizeY * 0.64, z: tree.z },
          { x: tree.sizeX * 0.8, y: tree.sizeY * 0.6, z: tree.sizeX * 0.8 },
        ),
      ],
      parts: [
        ...instanceParts([trunks], index),
        ...instanceParts([foliage], 2 * index),
        ...instanceParts([foliage], 2 * index + 1),
      ],
    })),
  );
}

/** 交通錐：黑色底座、橘色錐身、中間一圈白色反光帶，合成一個幾何（頂點顏色）。 */
export function createTrafficConeGeometry(): BufferGeometry {
  const baseM = ftToM(1.2);
  const baseHeightM = ftToM(0.12);
  const bodyHeightM = ftToM(2.15);
  const bottomRadiusM = ftToM(0.45);
  const topRadiusM = ftToM(0.1);
  const radiusAt = (t: number): number => bottomRadiusM + (topRadiusM - bottomRadiusM) * t;
  const bandFrom = 0.45;
  const bandTo = 0.68;
  const bandLiftM = ftToM(0.02);
  return mergeGeometries([
    tinted(new BoxGeometry(baseM, baseHeightM, baseM).translate(0, baseHeightM / 2, 0), LOT.trafficConeBaseColor),
    tinted(
      new CylinderGeometry(topRadiusM, bottomRadiusM, bodyHeightM, 12).translate(
        0,
        baseHeightM + bodyHeightM / 2,
        0,
      ),
      LOT.trafficConeColor,
    ),
    tinted(
      new CylinderGeometry(
        radiusAt(bandTo) + bandLiftM,
        radiusAt(bandFrom) + bandLiftM,
        (bandTo - bandFrom) * bodyHeightM,
        12,
        1,
        true,
      ).translate(0, baseHeightM + ((bandFrom + bandTo) / 2) * bodyHeightM, 0),
      LOT.trafficConeStripeColor,
    ),
  ]);
}

/** 垃圾桶：桶身＋蓋子。 */
export function createBinGeometry(): BufferGeometry {
  const bodyHeightM = ftToM(3);
  const lidHeightM = ftToM(0.3);
  return mergeGeometries([
    tinted(
      new CylinderGeometry(ftToM(1), ftToM(0.85), bodyHeightM, 14).translate(0, bodyHeightM / 2, 0),
      LOT.binColor,
    ),
    tinted(
      new CylinderGeometry(ftToM(1.08), ftToM(1.08), lidHeightM, 14).translate(
        0,
        bodyHeightM + lidHeightM / 2,
        0,
      ),
      LOT.binLidColor,
    ),
  ]);
}

/** 標誌：一根桿子、頂端一塊藍色方牌，正反兩面各一塊白色的小方塊。 */
function createSignGeometry(): BufferGeometry {
  const poleHeightM = ftToM(7.4);
  const plateM = ftToM(1.7);
  const plateThicknessM = ftToM(0.08);
  const plateY = poleHeightM - plateM / 2;
  const markM = plateM * 0.5;
  return mergeGeometries([
    tinted(
      new CylinderGeometry(ftToM(0.09), ftToM(0.09), poleHeightM, 6).translate(0, poleHeightM / 2, 0),
      LOT.signPoleColor,
    ),
    tinted(new BoxGeometry(plateM, plateM, plateThicknessM).translate(0, plateY, 0), LOT.signPlateColor),
    tinted(
      new BoxGeometry(markM, markM, plateThicknessM * 1.6).translate(0, plateY, 0),
      LOT.signMarkColor,
    ),
  ]);
}

/**
 * 建立整個場地的擺設。回傳的群組已經擺到車位的位置與朝向。
 * @param spot 目標車位
 * @param layout createLotLayout 算出來的佈局
 * @param props 這個畫質級別的擺設設定（真光源數、光錐、小細節要不要投影、細分）
 * @param hdr 這個級別是不是走高動態範圍的後製鏈（決定光錐與光暈的亮度）
 * @param lampsLit 路燈亮不亮（白天的天氣不亮）；不給 = 亮
 * @param lampStyle 路燈的樣式；不給 = 原型關的 classic
 * @param buildingShadowHeightM 背景建築在陰影貼圖裡最高算多高（shadowReach.ts）；不給 = 不設限，照實投影
 */
export function createLotProps(
  spot: ParkingSpot,
  layout: LotLayout,
  props: PropsQualitySettings,
  hdr: boolean,
  lampsLit = true,
  lampStyle: LampStyle = 'classic',
  buildingShadowHeightM = Infinity,
): Group {
  const frame = createSpotFrame(spot);
  frame.name = 'lotProps';
  const add = (mesh: InstancedMesh | undefined): void => {
    if (mesh !== undefined) {
      frame.add(mesh);
    }
  };
  const box = unitBox();
  /** 加進場景，並把每個方塊實例登記成會擋鏡頭的東西（太矮的不登記）。 */
  const addBoxes = (mesh: InstancedMesh | undefined, placements: readonly PropPlacement[]): void => {
    add(mesh);
    if (mesh === undefined) {
      return;
    }
    registerOccluders(
      frame,
      placements.flatMap((placement, index) =>
        placement.y + placement.sizeY < FADE.minHeightM
          ? []
          : [
              {
                boxes: [
                  occluderBox(
                    { x: placement.x, y: placement.y + placement.sizeY / 2, z: placement.z },
                    { x: placement.sizeX, y: placement.sizeY, z: placement.sizeZ },
                    headingToRotationY(placement.headingRad),
                  ),
                ],
                parts: [{ mesh, index }],
              },
            ],
      ),
    );
  };

  frame.add(createParkedCars(layout.parkedCars, props.meshDetail));
  addLamps(frame, layout.lamps, props, hdr, lampsLit, lampStyle);

  // 混凝土柱與柱頂的橫梁：同一個材質，一個 draw call。
  const concrete = [...layout.pillars, ...layout.beams];
  addBoxes(
    instanced(box, standard(LOT.concreteColor, LOT.concreteRoughness), concrete.map(boxAt), {
      name: 'concrete',
      castShadow: true,
    }),
    concrete,
  );

  // 背景建築也投影。太陽很低時影子的長度有上限（shadowReach.ts）：樓腳前面有影子，但不會拉過整個場地。
  const buildings = instanced(
    box,
    standard(0xffffff, LOT.buildingRoughness),
    layout.buildings.map(boxAt),
    {
      name: 'buildings',
      castShadow: true,
      colors: layout.buildings.map((building) =>
        pick(LOT.buildingColors, building.variant, secondary(building.variant)),
      ),
    },
  );
  if (buildings !== undefined && Number.isFinite(buildingShadowHeightM)) {
    buildings.customDepthMaterial = createCappedShadowDepthMaterial(buildingShadowHeightM);
  }
  addBoxes(buildings, layout.buildings);
  // 窗：不吃光的材質，顏色就是亮度。亮著的是暖黃，沒亮的是深色玻璃。
  const lit = LOT.buildingWindowLitColor;
  const dark = LOT.buildingWindowDarkColor;
  addBoxes(
    instanced(
      box,
      new MeshBasicMaterial({ color: 0xffffff }),
      layout.windows.map(boxAt),
      {
        name: 'buildingWindows',
        receiveShadow: false,
        colors: layout.windows.map((window) =>
          window.variant > 0
            ? new Color().setRGB(lit.r, lit.g, lit.b).multiplyScalar(window.variant)
            : new Color().setRGB(dark.r, dark.g, dark.b),
        ),
      },
    ),
    layout.windows,
  );

  add(
    instanced(
      box,
      standard(LOT.fenceColor, 0.6, 0.4),
      [...layout.fencePosts, ...layout.fenceRails].map(boxAt),
      { name: 'fence', castShadow: props.detailShadows },
    ),
  );

  addPlants(frame, layout.trees, layout.bushes, props.meshDetail);

  add(
    instanced(box, standard(LOT.stallLineColor, 0.85), layout.stallLines.map(boxAt), {
      name: 'stallLines',
    }),
  );
  add(
    instanced(createWheelStopGeometry(), createWheelStopMaterial(), layout.wheelStops.map(atPlacement), {
      name: 'wheelStops',
      // 假車位的車擋在每個畫質級別都投影（不跟 detailShadows）：少了影子它們像浮在地面上的色塊。
      castShadow: true,
    }),
  );

  const painted = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, vertexColors: true });
  add(
    instanced(createBinGeometry(), painted, layout.bins.map(atPlacement), {
      name: 'bins',
      castShadow: props.detailShadows,
    }),
  );
  add(
    instanced(createTrafficConeGeometry(), painted, layout.trafficCones.map(atPlacement), {
      name: 'trafficCones',
      castShadow: props.detailShadows,
    }),
  );
  add(
    instanced(createSignGeometry(), painted, layout.signs.map(atPlacement), {
      name: 'signs',
      castShadow: props.detailShadows,
    }),
  );
  add(
    instanced(box, standard(LOT.drainColor, 0.55, 0.6), layout.drains.map(boxAt), {
      name: 'drains',
    }),
  );
  return frame;
}
