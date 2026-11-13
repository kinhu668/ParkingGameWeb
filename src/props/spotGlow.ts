// 目標車位的發光標記：沿著車位輪廓從地面升起的一圈低矮半透明光牆，加上輪廓內側貼地的一圈光暈。
// 光牆往上漸漸淡掉、輕微脈動；停妥後變綠再淡出，重來後回來。
// 牆頂以上另有一段很淡的光幕（veil）：遠處、隔著鄰車的車頂也看得出目標在哪；離鏡頭近了自己消失。
// 純視覺：不進物理、不進碰撞、不進停車判定；不登記成會被遮擋半透明淡掉的擺設（props/occluders.ts）。
//
// 為什麼矮：以前這裡是吊在車位上空的大箭頭（實心、有描邊殼）。車位在起點正後方的關（w1_l05 直線倒車），
// 遠距離跟車的鏡頭正好落在箭頭裡，整個畫面被箭頭塞成一片暗紅黑。
// 現在的光牆頂端比任何一個鏡頭模式的鏡頭都低、沒有蓋子、只有薄薄的半透明面：鏡頭不可能被它包住。
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
} from 'three';
import { headingToRotationY } from '../core/heading';
import { mToFt, radToDeg } from '../core/units';
import type { ParkingSpot } from '../level/parkingJudge';
import { SKIP_AMBIENT_OCCLUSION } from '../render/ambientOcclusionFlag';
import { SPOT_GLOW_CONFIG as CONFIG } from '../render/renderConfig';

/** 車位的大小與位置；標記只需要這些。 */
export type GlowSpot = Pick<ParkingSpot, 'x' | 'z' | 'widthM' | 'lengthM' | 'headingRad'>;

/**
 * 光牆在高度比例 t（0 = 地面、1 = 頂端）的不透明度：地面最濃，往上淡到 0。
 * 用冪次而不是直線：靠近地面的一段明顯，上半段只剩薄薄一層，不擋後面的東西。
 */
export function glowWallAlpha(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return CONFIG.wallOpacity * (1 - clamped) ** CONFIG.wallFalloff;
}

/**
 * 脈動：整體不透明度的倍率，在 1 − pulseDepth 與 1 之間來回。只由累積時間決定；t = 0 是 1（最亮）。
 */
export function glowPulse(elapsedSeconds: number): number {
  const phase = (elapsedSeconds / CONFIG.pulsePeriodS) * Math.PI * 2;
  return 1 - CONFIG.pulseDepth * (0.5 - 0.5 * Math.cos(phase));
}

/** 停妥之後過了 parkedSeconds：變綠了多少（0 = 琥珀、1 = 全綠）。 */
export function glowGreenMix(parkedSeconds: number): number {
  return Math.min(Math.max(parkedSeconds / CONFIG.greenSeconds, 0), 1);
}

/** 停妥之後過了 parkedSeconds：還剩多少不透明度。先維持綠色一會兒（看得出「停好了」），再淡到 0。 */
export function glowParkedFade(parkedSeconds: number): number {
  const fading = (parkedSeconds - CONFIG.greenHoldSeconds) / CONFIG.fadeSeconds;
  return 1 - Math.min(Math.max(fading, 0), 1);
}

/**
 * 標記的幾何（車位本地座標：原點在車位中心的地面，+X 是車位右側，−Z 是車位前方）。
 * 一個網格、兩種面：
 * - 光牆：車位輪廓的四個邊各一片直立的面，從地面到 heightM，分成幾層，每層的不透明度照 glowWallAlpha。
 * - 地面光暈：輪廓內側一圈貼地的帶子，外緣（輪廓上）最濃，往車位中心淡到 0。俯視鏡頭看不到直立的牆，靠它。
 * 頂點顏色是白色 + 不透明度（RGBA）；顏色由材質決定，所以變綠只要改材質。
 */
export function createGlowGeometry(spot: Pick<ParkingSpot, 'widthM' | 'lengthM'>): BufferGeometry {
  const halfW = spot.widthM / 2;
  const halfL = spot.lengthM / 2;
  // 輪廓的四個角，繞一圈。
  const corners: readonly (readonly [number, number])[] = [
    [-halfW, -halfL],
    [halfW, -halfL],
    [halfW, halfL],
    [-halfW, halfL],
  ];
  // 地面光暈的內緣：每個角往車位中心縮 groundBandM（不會縮過中心）。
  const band = Math.min(CONFIG.groundBandM, halfW, halfL);
  const inner = corners.map(([x, z]) => [x - Math.sign(x) * band, z - Math.sign(z) * band] as const);

  const positions: number[] = [];
  const colors: number[] = [];
  const pushVertex = (x: number, y: number, z: number, alpha: number): void => {
    positions.push(x, y, z);
    colors.push(1, 1, 1, alpha);
  };
  /** 一個四邊形（兩個三角形）；a → b 是下緣或外緣，d → c 是上緣或內緣。 */
  const pushQuad = (
    a: readonly [number, number, number, number],
    b: readonly [number, number, number, number],
    c: readonly [number, number, number, number],
    d: readonly [number, number, number, number],
  ): void => {
    for (const vertex of [a, b, c, a, c, d]) {
      pushVertex(...vertex);
    }
  };

  const layers = CONFIG.wallLayers;
  for (let side = 0; side < corners.length; side += 1) {
    const from = corners[side];
    const to = corners[(side + 1) % corners.length];
    const innerFrom = inner[side];
    const innerTo = inner[(side + 1) % corners.length];
    if (from === undefined || to === undefined || innerFrom === undefined || innerTo === undefined) {
      continue;
    }
    for (let layer = 0; layer < layers; layer += 1) {
      const t0 = layer / layers;
      const t1 = (layer + 1) / layers;
      const y0 = CONFIG.liftM + t0 * (CONFIG.heightM - CONFIG.liftM);
      const y1 = CONFIG.liftM + t1 * (CONFIG.heightM - CONFIG.liftM);
      const alpha0 = glowWallAlpha(t0);
      const alpha1 = glowWallAlpha(t1);
      pushQuad(
        [from[0], y0, from[1], alpha0],
        [to[0], y0, to[1], alpha0],
        [to[0], y1, to[1], alpha1],
        [from[0], y1, from[1], alpha1],
      );
    }
    pushQuad(
      [from[0], CONFIG.liftM, from[1], CONFIG.groundOpacity],
      [to[0], CONFIG.liftM, to[1], CONFIG.groundOpacity],
      [innerTo[0], CONFIG.liftM, innerTo[1], 0],
      [innerFrom[0], CONFIG.liftM, innerFrom[1], 0],
    );
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 4));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** 光幕在高度比例 t（0 = 牆頂、1 = 光幕頂端）的不透明度：牆頂最濃（也只有一點點），往上淡到 0。 */
export function glowVeilAlpha(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return CONFIG.veil.opacity * (1 - clamped) ** CONFIG.veil.falloff;
}

/** 光幕離鏡頭 distanceM 時還剩多少（0–1）：貼近鏡頭的完全不畫。與著色器裡的式子相同。 */
export function glowVeilCameraFade(distanceM: number): number {
  const t = Math.min(
    Math.max((distanceM - CONFIG.veil.fadeNearM) / (CONFIG.veil.fadeFarM - CONFIG.veil.fadeNearM), 0),
    1,
  );
  return t * t * (3 - 2 * t);
}

/** 鏡頭在離地 cameraYM 的高度時光幕還剩多少（0–1）：貼近地面的鏡頭是 1，高處的鏡頭（遠距跟車、俯視）是 0。 */
export function glowVeilHeightFade(cameraYM: number): number {
  const t = Math.min(
    Math.max((cameraYM - CONFIG.veil.cameraLowM) / (CONFIG.veil.cameraHighM - CONFIG.veil.cameraLowM), 0),
    1,
  );
  return 1 - t * t * (3 - 2 * t);
}

/**
 * 光幕每一面在 along（0 = 這一邊的起點、1 = 終點）還剩多少（0–1）：
 * 靠近兩端的 edgeFade 這一段淡到 0，所以四個面疊在一起時不是一塊硬邊的矩形。
 * 與著色器裡的 smoothstep(0.0, edgeFade, along) 相同。
 */
export function glowVeilEdgeFade(along: number): number {
  const edge = CONFIG.veil.edgeFade;
  const smooth = (x: number): number => {
    const u = Math.min(Math.max(edge <= 0 ? 1 : x / edge, 0), 1);
    return u * u * (3 - 2 * u);
  };
  return smooth(along) * smooth(1 - along);
}

/**
 * 光幕的幾何（車位本地座標）：車位輪廓的四個邊各一片直立的面，從光牆的頂端到 veil.heightM，
 * 分成幾層，每層的不透明度照 glowVeilAlpha（存在 alpha 屬性裡）。沒有頂蓋。
 */
export function createVeilGeometry(spot: Pick<ParkingSpot, 'widthM' | 'lengthM'>): BufferGeometry {
  const halfW = spot.widthM / 2;
  const halfL = spot.lengthM / 2;
  const corners: readonly (readonly [number, number])[] = [
    [-halfW, -halfL],
    [halfW, -halfL],
    [halfW, halfL],
    [-halfW, halfL],
  ];
  const positions: number[] = [];
  const alphas: number[] = [];
  const alongs: number[] = [];
  const { layers } = CONFIG.veil;
  for (let side = 0; side < corners.length; side += 1) {
    const from = corners[side];
    const to = corners[(side + 1) % corners.length];
    if (from === undefined || to === undefined) {
      continue;
    }
    for (let layer = 0; layer < layers; layer += 1) {
      const t0 = layer / layers;
      const t1 = (layer + 1) / layers;
      const y0 = CONFIG.heightM + t0 * (CONFIG.veil.heightM - CONFIG.heightM);
      const y1 = CONFIG.heightM + t1 * (CONFIG.veil.heightM - CONFIG.heightM);
      const alpha0 = glowVeilAlpha(t0);
      const alpha1 = glowVeilAlpha(t1);
      // 每個頂點：(x, y, z, 高度不透明度, 沿邊 0–1)
      const quad: readonly (readonly [number, number, number, number, number])[] = [
        [from[0], y0, from[1], alpha0, 0],
        [to[0], y0, to[1], alpha0, 1],
        [to[0], y1, to[1], alpha1, 1],
        [from[0], y0, from[1], alpha0, 0],
        [to[0], y1, to[1], alpha1, 1],
        [from[0], y1, from[1], alpha1, 0],
      ];
      for (const [x, y, z, alpha, along] of quad) {
        positions.push(x, y, z);
        alphas.push(alpha);
        alongs.push(along);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('alpha', new Float32BufferAttribute(alphas, 1));
  geometry.setAttribute('along', new Float32BufferAttribute(alongs, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

const VEIL_VERTEX_SHADER = /* glsl */ `
  attribute float alpha;
  attribute float along;
  varying float vAlpha;
  varying float vAlong;
  varying float vDistance;
  void main() {
    vAlpha = alpha;
    vAlong = along;
    vec4 view = modelViewMatrix * vec4( position, 1.0 );
    vDistance = length( view.xyz );
    gl_Position = projectionMatrix * view;
  }
`;

const VEIL_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 veilColor;
  uniform float veilOpacity;
  uniform float fadeNear;
  uniform float fadeFar;
  uniform float cameraLow;
  uniform float cameraHigh;
  uniform float edgeFade;
  varying float vAlpha;
  varying float vAlong;
  varying float vDistance;
  void main() {
    // 貼近鏡頭的部分不畫：鏡頭在光幕的範圍裡時，眼前沒有東西。
    float nearFade = smoothstep( fadeNear, fadeFar, vDistance );
    // 高處的鏡頭（遠距跟車、俯視）不畫：它們看得到整個車位，光幕只會蓋住旁邊的東西。
    float heightFade = 1.0 - smoothstep( cameraLow, cameraHigh, cameraPosition.y );
    // 每一面的左右兩端淡掉：夜晚從正面看時不是一塊矩形色板。
    float sideFade = smoothstep( 0.0, edgeFade, vAlong ) * smoothstep( 0.0, edgeFade, 1.0 - vAlong );
    gl_FragColor = vec4( veilColor, vAlpha * veilOpacity * nearFade * heightFade * sideFade );
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** e2e 與除錯用的唯讀狀態（對外用英尺與度，與 SessionSnapshot 一致）。 */
export interface SpotGlowSnapshot {
  /** 標記的中心：就是車位中心。 */
  readonly xFt: number;
  readonly zFt: number;
  /** 光牆圍住的範圍：就是車位的寬與長，方向與車位相同。 */
  readonly widthFt: number;
  readonly lengthFt: number;
  readonly headingDeg: number;
  /** 光牆頂端離地的高度。 */
  readonly heightFt: number;
  /** 脈動的倍率（1 − pulseDepth 到 1）；`?fx=off` 永遠是 1。 */
  readonly pulse: number;
  /** 變綠了多少（0 = 琥珀、1 = 全綠）。 */
  readonly green: number;
  /** 停妥後淡出的進度：1 = 完全顯示、0 = 已淡出。不含脈動。 */
  readonly opacity: number;
  /** 有沒有在畫（淡到 0 就不畫了）。 */
  readonly visible: boolean;
}

export interface SpotGlow {
  /** 加進場景的那一組（世界座標；原點在車位中心的地面，方向跟著車位）。 */
  readonly root: Group;
  /**
   * 遠處用的光幕（另一個網格，也要加進場景）：從光牆的頂端再往上很淡的一段漸層，離鏡頭近了自己消失。
   * 顏色、脈動、停妥後變綠與淡出都跟著光牆。
   */
  readonly veil: Mesh;
  /**
   * 脈動往前走 frameSeconds：亮度只由累積時間決定。
   * 定格截圖與暫停時傳 0，停在原地；從沒走過時間就是最亮的起始狀態。
   */
  advance(frameSeconds: number): void;
  /**
   * 顯示狀態走一幀。
   * @param parked 這一局是不是已經停妥：停妥後變綠、停一下、淡出；重來（false）立刻回到琥珀色、完全顯示
   * @param frameSeconds 距離上一幀多久
   */
  show(parked: boolean, frameSeconds: number): void;
  /** 停妥後淡出的進度（1 = 完全顯示、0 = 已淡出），不含脈動。 */
  opacity(): number;
  /**
   * 不畫標記地跑 draw（跑完恢復原本的樣子）。倒車輔助層的四個小畫面用：
   * 後視鏡、倒後鏡頭與鳥瞰是看路與看標線用的，不要蓋一層光。
   */
  drawHidden(draw: () => void): void;
  snapshot(): SpotGlowSnapshot;
}

/** 排在一般半透明的東西（標線、輪胎痕）之後畫，才不會被貼地的東西蓋過。 */
const GLOW_RENDER_ORDER = 2;

/**
 * 建立目標車位的發光標記：不論車位朝哪個方向、多長多寬（側向停車的車位也一樣），都貼著它的輪廓。
 * @param animate 要不要脈動；`?fx=off` 傳 false：照樣顯示，亮度固定
 */
export function createSpotGlow(spot: GlowSpot, animate = true): SpotGlow {
  const idleColor = new Color(CONFIG.color);
  const parkedColor = new Color(CONFIG.parkedColor);
  // 不吃場景的燈、不吃霧：白天、夜晚、雨天、遠近都是同一個亮度；顏色不超過 1，不靠光暈。
  // 不寫深度、兩面都畫：從車位裡面往外看（駕駛座停進去之後）也看得到，後面的東西照樣透出來。
  const material = new MeshBasicMaterial({
    color: idleColor.clone(),
    vertexColors: true,
    fog: false,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    // 貼地的光暈與標線、柏油幾乎共面：往鏡頭推一點，遠處才不會閃。
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
  const mesh = new Mesh(createGlowGeometry(spot), material);
  mesh.name = 'spotGlowMesh';
  mesh.renderOrder = GLOW_RENDER_ORDER;

  const root = new Group();
  root.name = 'spotGlow';
  root.add(mesh);
  root.position.set(spot.x, 0, spot.z);
  root.rotation.y = headingToRotationY(spot.headingRad);
  // 發光的標記沒有實體表面：不投影、不接影子，也不參與環境光遮蔽。
  root.userData[SKIP_AMBIENT_OCCLUSION] = true;

  const veilMaterial = new ShaderMaterial({
    name: 'SpotGlowVeilShader',
    uniforms: {
      veilColor: { value: idleColor.clone() },
      veilOpacity: { value: 1 },
      fadeNear: { value: CONFIG.veil.fadeNearM },
      fadeFar: { value: CONFIG.veil.fadeFarM },
      cameraLow: { value: CONFIG.veil.cameraLowM },
      cameraHigh: { value: CONFIG.veil.cameraHighM },
      edgeFade: { value: CONFIG.veil.edgeFade },
    },
    vertexShader: VEIL_VERTEX_SHADER,
    fragmentShader: VEIL_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    fog: false,
  });
  const veil = new Mesh(createVeilGeometry(spot), veilMaterial);
  veil.name = 'spotGlowVeil';
  veil.renderOrder = GLOW_RENDER_ORDER;
  veil.position.copy(root.position);
  veil.rotation.copy(root.rotation);
  veil.userData[SKIP_AMBIENT_OCCLUSION] = true;
  const veilColor: unknown = veilMaterial.uniforms['veilColor']?.value;
  const veilOpacity = veilMaterial.uniforms['veilOpacity'];

  let elapsedSeconds = 0;
  /** 停妥之後過了多久；還沒停妥是 0。 */
  let parkedSeconds = 0;
  let parked = false;
  const fade = (): number => (parked ? glowParkedFade(parkedSeconds) : 1);
  const green = (): number => (parked ? glowGreenMix(parkedSeconds) : 0);
  const pulse = (): number => (animate ? glowPulse(elapsedSeconds) : 1);
  const apply = (): void => {
    material.color.copy(idleColor).lerp(parkedColor, green());
    material.opacity = fade() * pulse();
    root.visible = fade() > 0;
    // 光幕跟著光牆：同一個顏色、同一個脈動與淡出。
    if (veilColor instanceof Color) {
      veilColor.copy(material.color);
    }
    if (veilOpacity !== undefined) {
      veilOpacity.value = material.opacity;
    }
    veil.visible = root.visible;
  };

  return {
    root,
    veil,
    advance(frameSeconds) {
      if (!animate) {
        return;
      }
      elapsedSeconds += Math.max(frameSeconds, 0);
      apply();
    },
    show(nowParked, frameSeconds) {
      parkedSeconds = nowParked ? parkedSeconds + Math.max(frameSeconds, 0) : 0;
      parked = nowParked;
      apply();
    },
    opacity: fade,
    drawHidden(draw) {
      const wasVisible = root.visible;
      const veilWasVisible = veil.visible;
      root.visible = false;
      veil.visible = false;
      try {
        draw();
      } finally {
        root.visible = wasVisible;
        veil.visible = veilWasVisible;
      }
    },
    snapshot: () => ({
      xFt: mToFt(root.position.x),
      zFt: mToFt(root.position.z),
      widthFt: mToFt(spot.widthM),
      lengthFt: mToFt(spot.lengthM),
      headingDeg: radToDeg(spot.headingRad),
      heightFt: mToFt(CONFIG.heightM),
      pulse: pulse(),
      green: green(),
      opacity: fade(),
      visible: root.visible,
    }),
  };
}
