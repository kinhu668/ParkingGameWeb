// 有邊界（bounds）的關卡四周的環境：把 environmentLayout.ts 算出來的佈局畫出來。
// 背景車、路燈、樹、背景建築、窗、標線重用 createLotProps；主建築、人行道、門、路面標線是一批上色的方塊
// （一個 InstancedMesh）；招牌是貼了字的平面。全部是純視覺：不進物理、不進碰撞、不進停車判定。
import {
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three';
import { forward, headingToRotationY } from '../core/heading';
import { ftToM } from '../core/units';
import type { ParkingSpot } from '../level/parkingJudge';
import type { PropsQualitySettings } from '../render/quality';
import {
  LOT_PROPS_CONFIG as LOT,
  OCCLUSION_FADE_CONFIG as FADE,
  SPOT_MARKING_CONFIG,
} from '../render/renderConfig';
import type { EnvironmentLayout } from './environmentLayout';
import { createSpotFrame } from './lotEdges';
import { createLotProps } from './lotProps';
import { occluderBox, registerOccluders, type Occluder } from './occluders';
import { createSignMesh } from './signs';

const SLAB_ROUGHNESS = 0.9;
/** 方向箭頭：比標線再高一點點，不與車位的漆共面。 */
const ARROW_LIFT_M = SPOT_MARKING_CONFIG.liftM * 1.5;
const ARROW_OPACITY = 0.55;

/**
 * 目標車位裡的方向箭頭（平貼地面）：指向停好時車頭該朝的方向，倒車入庫時才知道哪一頭是車頭。
 */
export function createSpotArrow(spot: ParkingSpot): Group {
  const stemHalfM = ftToM(0.45);
  const headHalfM = ftToM(1.5);
  const headLengthM = ftToM(3.2);
  const lengthM = Math.min(spot.lengthM * 0.42, ftToM(9));
  const tipY = lengthM / 2;
  const neckY = tipY - headLengthM;
  // 畫在 XY 平面：+Y 是車位前方；躺平後 +Y 變成本地 −Z。
  const outline = new Shape();
  outline.moveTo(-stemHalfM, -lengthM / 2);
  outline.lineTo(stemHalfM, -lengthM / 2);
  outline.lineTo(stemHalfM, neckY);
  outline.lineTo(headHalfM, neckY);
  outline.lineTo(0, tipY);
  outline.lineTo(-headHalfM, neckY);
  outline.lineTo(-stemHalfM, neckY);
  outline.closePath();
  const arrow = new Mesh(
    new ShapeGeometry(outline).rotateX(-Math.PI / 2),
    new MeshStandardMaterial({
      color: SPOT_MARKING_CONFIG.color,
      roughness: SPOT_MARKING_CONFIG.roughness,
      transparent: true,
      opacity: ARROW_OPACITY,
      depthWrite: false,
    }),
  );
  arrow.name = 'spotArrow';
  arrow.position.y = ARROW_LIFT_M;
  arrow.receiveShadow = true;
  const frame = createSpotFrame(spot);
  frame.add(arrow);
  return frame;
}

/**
 * 建立一關四周的環境（世界座標）。
 * @param spot 目標車位（畫方向箭頭用）
 * @param layout createEnvironmentLayout 算出來的佈局
 * @param props 這個畫質級別的擺設設定
 * @param hdr 這個級別是不是走高動態範圍的後製鏈（決定路燈光錐與光暈的亮度）
 * @param lampsLit 路燈亮不亮（跟著天氣）；白天路燈不亮，招牌也不自發光
 */
export function createEnvironment(
  spot: ParkingSpot,
  layout: EnvironmentLayout,
  props: PropsQualitySettings,
  hdr: boolean,
  lampsLit = true,
): Group {
  const group = new Group();
  group.name = 'environment';
  // 佈局已經是世界座標：給 createLotProps 一個在原點、不轉向的座標框。
  group.add(
    // 路燈用 braced：桿、臂、燈頭連成一體的那一種。
    createLotProps({ ...spot, x: 0, z: 0, headingRad: 0 }, layout.lot, props, hdr, lampsLit, 'braced'),
  );

  // 立體的方塊與平貼地面的標線：一個 InstancedMesh。
  const boxes = layout.slabs.filter((slab) => slab.facingRad === undefined);
  let slabMesh: InstancedMesh | undefined;
  if (boxes.length > 0) {
    const mesh = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial({ color: 0xffffff, roughness: SLAB_ROUGHNESS }),
      boxes.length,
    );
    boxes.forEach((slab, index) => {
      mesh.setMatrixAt(
        index,
        new Matrix4()
          .makeTranslation(
            (slab.minX + slab.maxX) / 2,
            (slab.minY + slab.maxY) / 2,
            (slab.minZ + slab.maxZ) / 2,
          )
          .scale(new Vector3(slab.maxX - slab.minX, slab.maxY - slab.minY, slab.maxZ - slab.minZ)),
      );
      mesh.setColorAt(index, new Color(slab.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = 'environmentSlabs';
    // 主建築不投影：太陽很低，會把整個場地罩進影子裡（與背景建築相同）。
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    group.add(mesh);
    slabMesh = mesh;
  }

  // 貼在牆面上的薄片（門、捲門、窗）：只有朝外那一面的平面。吃光的（門）與不吃光的（窗、門燈）各一個 InstancedMesh。
  const lit = LOT.buildingWindowLitColor;
  const dark = LOT.buildingWindowDarkColor;
  for (const glowing of [false, true]) {
    const decals = layout.slabs.filter(
      (slab) => slab.facingRad !== undefined && (slab.lit !== undefined) === glowing,
    );
    if (decals.length === 0) {
      continue;
    }
    const mesh = new InstancedMesh(
      new PlaneGeometry(1, 1),
      glowing
        ? new MeshBasicMaterial({ color: 0xffffff })
        : new MeshStandardMaterial({ color: 0xffffff, roughness: SLAB_ROUGHNESS }),
      decals.length,
    );
    decals.forEach((slab, index) => {
      const facingRad = slab.facingRad ?? 0;
      const ahead = forward(facingRad);
      const sizeX = slab.maxX - slab.minX;
      const sizeZ = slab.maxZ - slab.minZ;
      const thicknessM = Math.min(sizeX, sizeZ);
      mesh.setMatrixAt(
        index,
        new Matrix4().compose(
          new Vector3(
            (slab.minX + slab.maxX) / 2 + (ahead.x * thicknessM) / 2,
            (slab.minY + slab.maxY) / 2,
            (slab.minZ + slab.maxZ) / 2 + (ahead.z * thicknessM) / 2,
          ),
          // 平面的正面是本地 +Z；與招牌相同的轉法。
          new Quaternion().setFromAxisAngle(
            new Vector3(0, 1, 0),
            headingToRotationY(facingRad) + Math.PI,
          ),
          new Vector3(Math.max(sizeX, sizeZ), slab.maxY - slab.minY, 1),
        ),
      );
      const brightness = slab.lit ?? 0;
      mesh.setColorAt(
        index,
        slab.lit === undefined
          ? new Color(slab.color)
          : brightness > 0
            ? new Color().setRGB(lit.r, lit.g, lit.b).multiplyScalar(brightness)
            : new Color().setRGB(dark.r, dark.g, dark.b),
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = glowing ? 'environmentGlass' : 'environmentDecals';
    mesh.receiveShadow = !glowing;
    group.add(mesh);
  }

  const signMeshes = layout.signs.map((sign) => createSignMesh(lampsLit ? sign : { ...sign, glow: 0 }));
  // 一塊一塊加：沒有招牌的環境（空曠的停車場）不能呼叫沒有引數的 add（three 會當成錯誤印出來）。
  for (const signMesh of signMeshes) {
    group.add(signMesh);
  }

  // 擋到跟車鏡頭時淡掉的方塊：立體、夠高的每一塊各自淡（人行道、路緣、地上的標線不淡）。
  // 招牌柱：桿子與牌面一起淡。
  if (slabMesh !== undefined) {
    const mesh = slabMesh;
    const occluders: Occluder[] = [];
    boxes.forEach((slab, index) => {
      if (slab.kind !== 'solid' || slab.maxY < FADE.minHeightM) {
        return;
      }
      const poleSign = layout.poleSigns.find((entry) => layout.slabs[entry.slab] === slab);
      const signMesh = poleSign === undefined ? undefined : signMeshes[poleSign.sign];
      occluders.push({
        boxes: [
          occluderBox(
            {
              x: (slab.minX + slab.maxX) / 2,
              y: (slab.minY + slab.maxY) / 2,
              z: (slab.minZ + slab.maxZ) / 2,
            },
            { x: slab.maxX - slab.minX, y: slab.maxY - slab.minY, z: slab.maxZ - slab.minZ },
          ),
        ],
        parts: [{ mesh, index }],
        ...(signMesh === undefined ? {} : { meshes: [signMesh] }),
      });
    });
    registerOccluders(group, occluders);
  }
  group.add(createSpotArrow(spot));
  return group;
}
