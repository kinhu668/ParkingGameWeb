// 目標車位上方的天空箭頭：吊在車位中心正上方、尖端朝下的立體大箭頭（圓錐 + 桿，外面包一層深色描邊殼）。
// 駕駛座視角很平，看不見地上的標線；這個箭頭讓玩家從起點就知道目標在哪。
// 純視覺：不進物理、不進碰撞、不進停車判定；不登記成會被遮擋半透明淡掉的擺設（props/occluders.ts）。
// 與地面的方向箭頭（environments.ts 的 createSpotArrow）是兩回事：那個平貼地面、指出停好時車頭的方向。
import {
  BackSide,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three';
import { mToFt } from '../core/units';
import type { ParkingSpot } from '../level/parkingJudge';
import { SKIP_AMBIENT_OCCLUSION } from '../render/ambientOcclusionFlag';
import { SPOT_BEACON_CONFIG as CONFIG } from '../render/renderConfig';

/** 剖面上的一個點：離中心軸多遠、離尖端多高（公尺）。 */
interface ProfilePoint {
  readonly radius: number;
  readonly y: number;
}

/** 空間裡的一個點（公尺）。 */
interface BeaconPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * 箭頭的剖面（繞 Y 軸轉一圈就是整支箭頭）：原點在尖端，+Y 往上。
 * 順序：尖端 → 圓錐最寬處 → 桿的底 → 桿頂 → 桿頂的中心。
 * @param growM 整個輪廓往外長多少（描邊殼用）；0 = 箭頭本體
 */
export function beaconProfile(growM = 0): ProfilePoint[] {
  const { headLengthM, headRadiusM, shaftRadiusM, lengthM } = CONFIG;
  // 圓錐的斜面往外推 growM：尖端沿軸往下移 growM / sin(半頂角)，最寬處跟著斜面走。
  const slantM = Math.hypot(headRadiusM, headLengthM);
  const sinHalf = headRadiusM / slantM;
  const cosHalf = headLengthM / slantM;
  return [
    { radius: 0, y: -growM / sinHalf },
    { radius: headRadiusM + growM * (sinHalf / cosHalf) + growM / cosHalf, y: headLengthM + growM },
    { radius: shaftRadiusM + growM, y: headLengthM + growM },
    { radius: shaftRadiusM + growM, y: lengthM + growM },
    { radius: 0, y: lengthM + growM },
  ];
}

/**
 * 把剖面繞 Y 軸轉成一面一面的三角形（不共用頂點，每一面一個顏色）。每個三角形的正面朝外。
 * @param shade 這一面（朝外的單位法線）的亮度 0–1；不給 = 全部 1
 */
export function createBeaconGeometry(
  profile: readonly ProfilePoint[],
  color: number,
  shade: (normal: Vector3) => number = () => 1,
): BufferGeometry {
  const segments = CONFIG.radialSegments;
  const positions: number[] = [];
  const colors: number[] = [];
  const base = new Color(color);
  const point = (profilePoint: ProfilePoint, angle: number): Vector3 =>
    new Vector3(
      profilePoint.radius * Math.cos(angle),
      profilePoint.y,
      profilePoint.radius * Math.sin(angle),
    );
  const edgeA = new Vector3();
  const edgeB = new Vector3();
  const faceNormal = new Vector3();

  for (let band = 0; band + 1 < profile.length; band += 1) {
    const lower = profile[band];
    const upper = profile[band + 1];
    if (lower === undefined || upper === undefined) {
      continue;
    }
    // 剖面上這一段朝外的法線：把走向順時針轉 90°（圓錐的斜面朝外下方、桿的側面朝外、桿頂朝上）。
    const outRadial = upper.y - lower.y;
    const outY = lower.radius - upper.radius;
    for (let segment = 0; segment < segments; segment += 1) {
      const angle0 = (segment / segments) * Math.PI * 2;
      const angle1 = ((segment + 1) / segments) * Math.PI * 2;
      const middle = (angle0 + angle1) / 2;
      const outward = new Vector3(
        outRadial * Math.cos(middle),
        outY,
        outRadial * Math.sin(middle),
      ).normalize();
      const tint = base.clone().multiplyScalar(shade(outward));
      const corners = [
        point(lower, angle0),
        point(lower, angle1),
        point(upper, angle1),
        point(upper, angle0),
      ] as const;
      for (const [a, b, c] of [
        [corners[0], corners[1], corners[2]],
        [corners[0], corners[2], corners[3]],
      ] as const) {
        faceNormal.crossVectors(edgeA.subVectors(b, a), edgeB.subVectors(c, a));
        // 半徑是 0 的那一端兩個角疊在一起：這個三角形沒有面積，不要。
        if (faceNormal.lengthSq() < 1e-12) {
          continue;
        }
        const ordered = faceNormal.dot(outward) >= 0 ? [a, b, c] : [a, c, b];
        for (const vertex of ordered) {
          positions.push(vertex.x, vertex.y, vertex.z);
          colors.push(tint.r, tint.g, tint.b);
        }
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** 烘在頂點顏色裡的明暗：面朝假想的光最亮（1），背光最暗（CONFIG.minShade）。 */
export function beaconShade(normal: Vector3): number {
  const { x, y, z } = CONFIG.shadeDirection;
  const facing = (normal.x * x + normal.y * y + normal.z * z) / Math.hypot(x, y, z);
  return CONFIG.minShade + (1 - CONFIG.minShade) * (0.5 + 0.5 * facing);
}

/** 浮動：尖端比靜止高度高（正）或低（負）多少。只由累積時間決定；t = 0 是 0。 */
export function beaconBobM(elapsedSeconds: number): number {
  return CONFIG.bobAmplitudeM * Math.sin((elapsedSeconds / CONFIG.bobPeriodS) * Math.PI * 2);
}

/** 自轉：繞世界 Y 轉了多少（弧度，0–2π）。只由累積時間決定；t = 0 是 0。 */
export function beaconSpinRad(elapsedSeconds: number): number {
  return ((elapsedSeconds / CONFIG.spinPeriodS) % 1) * Math.PI * 2;
}

/**
 * 從這個鏡頭位置看，箭頭該有多不透明。
 * 鏡頭比桿頂低（駕駛座、引擎蓋、跟車）：1。鏡頭在箭頭上方往下看（俯視）而且靠近車位：
 * 箭頭就擋在鏡頭與車位之間，會蓋住標線與停進去的車，淡成 CONFIG.overheadOpacity（看得穿、但還看得到）。
 */
export function beaconViewOpacity(camera: BeaconPoint, spot: Pick<ParkingSpot, 'x' | 'z'>): number {
  const topM = CONFIG.hoverTipM + CONFIG.bobAmplitudeM + CONFIG.lengthM;
  if (camera.y <= topM) {
    return 1;
  }
  const distanceM = Math.hypot(camera.x - spot.x, camera.z - spot.z);
  const t = Math.min(
    Math.max((distanceM - CONFIG.overheadNearM) / (CONFIG.overheadFarM - CONFIG.overheadNearM), 0),
    1,
  );
  const eased = t * t * (3 - 2 * t);
  return CONFIG.overheadOpacity + (1 - CONFIG.overheadOpacity) * eased;
}

/** e2e 與除錯用的唯讀狀態（對外用英尺，與 SessionSnapshot 一致）。 */
export interface SpotBeaconSnapshot {
  /** 尖端的世界座標：x、z 就是車位中心，heightFt 是離地高度（含浮動）。 */
  readonly xFt: number;
  readonly zFt: number;
  readonly tipHeightFt: number;
  /** 桿頂離地的高度。 */
  readonly topHeightFt: number;
  /** 繞世界 Y 轉了多少（弧度）。 */
  readonly spinRad: number;
  /** 目前的不透明度（1 = 完全顯示、0 = 已淡出）。 */
  readonly opacity: number;
  /** 有沒有在畫（淡到 0 就不畫了）。 */
  readonly visible: boolean;
}

export interface SpotBeacon {
  /** 加進場景的那一組（世界座標；原點在箭頭的尖端）。 */
  readonly root: Group;
  /**
   * 浮動與自轉往前走 frameSeconds：姿勢只由累積時間決定。
   * 定格截圖與暫停時傳 0，停在原地；從沒走過時間就是起始姿勢。
   */
  advance(frameSeconds: number): void;
  /**
   * 顯示狀態走一幀。
   * @param parked 這一局是不是已經停妥：停妥後在 CONFIG.fadeSeconds 內淡出；重來（false）立刻回到完全顯示
   * @param camera 鏡頭位置：俯視而且靠近車位時淡成看得穿（beaconViewOpacity）
   * @param frameSeconds 距離上一幀多久
   */
  show(parked: boolean, camera: BeaconPoint, frameSeconds: number): void;
  /** 目前的不透明度。 */
  opacity(): number;
  /**
   * 不畫箭頭地跑 draw（跑完恢復原本的樣子）。倒車輔助層的四個小畫面用：
   * 後視鏡與倒後鏡頭裡吊在天上的箭頭只會擋路，小畫面是看路用的。
   */
  drawHidden(draw: () => void): void;
  snapshot(): SpotBeaconSnapshot;
}

/** 本體排在描邊殼之後畫：淡出（半透明）時本體疊在殼的上面。 */
const OUTLINE_RENDER_ORDER = 1;
const BODY_RENDER_ORDER = 2;

/**
 * 建立目標車位上方的天空箭頭。不論車位朝哪個方向、多長多寬（側向停車的車位也一樣），
 * 都吊在車位中心 (spot.x, spot.z) 的正上方、尖端朝下。
 * @param animate 要不要浮動與自轉；`?fx=off` 傳 false：照樣顯示，停在起始姿勢
 */
export function createSpotBeacon(spot: Pick<ParkingSpot, 'x' | 'z'>, animate = true): SpotBeacon {
  // 不吃場景的燈、不吃霧：白天、夜晚、雨天、遠近都是同一個亮度；顏色不超過 1，不靠光暈。
  // 一直走半透明那一路（不透明度 1 時看起來就是不透明的），淡出時不必換材質、重編著色器。
  const bodyMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    fog: false,
    transparent: true,
  });
  const outlineMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    fog: false,
    transparent: true,
    // 只畫殼的背面：從任何方向看，都只在本體的輪廓外露出一圈。
    side: BackSide,
  });
  const body = new Mesh(
    createBeaconGeometry(beaconProfile(), CONFIG.color, beaconShade),
    bodyMaterial,
  );
  body.name = 'spotBeaconBody';
  body.renderOrder = BODY_RENDER_ORDER;
  const outline = new Mesh(
    createBeaconGeometry(beaconProfile(CONFIG.outlineM), CONFIG.outlineColor),
    outlineMaterial,
  );
  outline.name = 'spotBeaconOutline';
  outline.renderOrder = OUTLINE_RENDER_ORDER;

  const root = new Group();
  root.name = 'spotBeacon';
  root.add(outline, body);
  root.position.set(spot.x, CONFIG.hoverTipM, spot.z);
  // 發光的標記沒有實體表面：不投影、不接影子，也不參與環境光遮蔽。
  root.userData[SKIP_AMBIENT_OCCLUSION] = true;

  let elapsedSeconds = 0;
  /** 停妥後的淡出（1 → 0）與俯視時的淡化（1 → overheadOpacity）各自走，畫出來的是兩者相乘。 */
  let parkedFade = 1;
  let viewFade = 1;
  const opacity = (): number => parkedFade * viewFade;
  const applyOpacity = (): void => {
    const value = opacity();
    bodyMaterial.opacity = value;
    outlineMaterial.opacity = value;
    root.visible = value > 0;
  };

  return {
    root,
    advance(frameSeconds) {
      if (!animate) {
        return;
      }
      elapsedSeconds += Math.max(frameSeconds, 0);
      root.position.y = CONFIG.hoverTipM + beaconBobM(elapsedSeconds);
      root.rotation.y = beaconSpinRad(elapsedSeconds);
    },
    show(parked, camera, frameSeconds) {
      const step = Math.max(frameSeconds, 0) / CONFIG.fadeSeconds;
      parkedFade = parked ? Math.max(0, parkedFade - step) : 1;
      const wanted = beaconViewOpacity(camera, spot);
      viewFade = viewFade < wanted ? Math.min(wanted, viewFade + step) : Math.max(wanted, viewFade - step);
      applyOpacity();
    },
    opacity,
    drawHidden(draw) {
      const wasVisible = root.visible;
      root.visible = false;
      try {
        draw();
      } finally {
        root.visible = wasVisible;
      }
    },
    snapshot: () => ({
      xFt: mToFt(root.position.x),
      zFt: mToFt(root.position.z),
      tipHeightFt: mToFt(root.position.y),
      topHeightFt: mToFt(root.position.y + CONFIG.lengthM),
      spinRad: root.rotation.y,
      opacity: opacity(),
      visible: root.visible,
    }),
  };
}
