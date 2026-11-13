// 看得見的閃電電弧：把 lightningBolt.ts 算出來的小段畫成永遠面向鏡頭的窄面片（一個網格、一個 draw call），
// 加上落點地上的一圈閃光。加色混合、不寫深度、不參與環境光遮蔽；亮度跟著閃光強度，沒在閃的時候整組不畫。
// 面片中間是很亮的芯、兩旁是淡的光暈；離鏡頭太近的片段在著色器裡淡掉（LIGHTNING_CONFIG.arc.cameraFade*），
// 所以不論車開到哪裡、鏡頭在哪裡，電弧都不可能塞住畫面。
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
} from 'three';
import { SKIP_AMBIENT_OCCLUSION } from '../render/ambientOcclusionFlag';
import { LIGHTNING_CONFIG } from '../render/weatherPresets';
import { MAX_STRIKE_SEGMENTS, strikeBolts, type Bolt, type StrikeArea } from './lightningBolt';

const ARC = LIGHTNING_CONFIG.arc;
const VERTICES_PER_SEGMENT = 4;
const INDICES_PER_SEGMENT = 6;
const GLOW_SEGMENTS = 32;
/** 一道閃電有幾條打到地上的電弧（主、次）。 */
const BOLTS_PER_STRIKE = 2;
/** 排在其他半透明的東西之後畫。 */
const ARC_RENDER_ORDER = 3;

const ARC_VERTEX_SHADER = /* glsl */ `
  attribute vec3 axis;
  attribute vec2 ribbon;
  attribute float glow;
  varying float vAcross;
  varying float vGlow;
  varying float vDistance;
  varying float vViewDepth;

  void main() {
    // 面片永遠面向鏡頭：在視角座標裡，沿「小段方向 × 視線」把兩側推開半個寬度；兩端各多伸出一點蓋住折角的縫。
    vec4 view = modelViewMatrix * vec4( position, 1.0 );
    vec3 along = normalize( mat3( modelViewMatrix ) * axis );
    vec3 across = cross( along, normalize( view.xyz ) );
    float acrossLength = length( across );
    across = acrossLength > 1e-4 ? across / acrossLength : vec3( 1.0, 0.0, 0.0 );
    view.xyz += across * ribbon.x * ribbon.y * 0.5;
    vAcross = ribbon.x;
    vGlow = glow;
    vDistance = length( view.xyz );
    vViewDepth = - view.z;
    gl_Position = projectionMatrix * view;
  }
`;

const ARC_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 arcColor;
  uniform float flash;
  uniform float coreFraction;
  uniform float coreBrightness;
  uniform float haloBrightness;
  uniform float cameraFadeNear;
  uniform float cameraFadeFar;
  uniform float fogNear;
  uniform float fogFar;
  uniform float fogFade;
  varying float vAcross;
  varying float vGlow;
  varying float vDistance;
  varying float vViewDepth;

  void main() {
    float offset = abs( vAcross );
    float core = exp( - ( offset * offset ) / ( coreFraction * coreFraction ) );
    float halo = ( 1.0 - offset ) * ( 1.0 - offset );
    float brightness = ( core * coreBrightness + halo * haloBrightness ) * vGlow * flash;
    brightness *= smoothstep( cameraFadeNear, cameraFadeFar, vDistance );
    brightness *= 1.0 - fogFade * smoothstep( fogNear, fogFar, vViewDepth );
    gl_FragColor = vec4( arcColor * brightness, 1.0 );
  }
`;

export interface LightningArcs {
  /** 加進場景的那一組（世界座標）。 */
  readonly root: Group;
  /**
   * 顯示第 strikeIndex 道閃電的電弧，亮度是閃光強度 flash（0–1）。flash ≤ 0 或還沒打過（strikeIndex < 0）就不畫。
   * 換了一道才重算形狀。
   */
  show(strikeIndex: number, flash: number): void;
  /** 目前畫的是第幾道的電弧（還沒畫過是 −1）、有沒有在畫。測試與除錯用。 */
  shown(): { readonly strikeIndex: number; readonly visible: boolean; readonly bolts: readonly Bolt[] };
}

/** 落點地上的一圈閃光：中心亮、邊緣淡到 0 的圓。 */
function createGroundGlow(hdr: boolean): Mesh {
  const geometry = new CircleGeometry(ARC.groundGlowRadiusM, GLOW_SEGMENTS).rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position');
  const fade = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index += 1) {
    const fromCenter = Math.hypot(position.getX(index), position.getZ(index)) / ARC.groundGlowRadiusM;
    const brightness = Math.max(0, 1 - fromCenter) ** 2;
    fade.set([brightness, brightness, brightness], index * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(fade, 3));
  const glow = new Mesh(
    geometry,
    new MeshBasicMaterial({
      color: 0x000000,
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    }),
  );
  glow.name = 'lightningGroundGlow';
  glow.position.y = ARC.groundGlowLiftM;
  glow.renderOrder = ARC_RENDER_ORDER;
  glow.userData.peak = hdr ? ARC.groundGlowBrightness.hdr : ARC.groundGlowBrightness.direct;
  return glow;
}

/**
 * @param seed 亂數種子（與閃電的時間表無關；同一個種子、同一道永遠是同一條電弧）
 * @param area 場地：車位與電弧不能落進去的矩形
 * @param hdr 這個級別是不是走高動態範圍的後製鏈（決定亮度）
 * @param fog 線性遠霧的起點與終點（公尺）
 */
export function createLightningArcs(
  seed: number,
  area: StrikeArea,
  hdr: boolean,
  fog: { readonly nearM: number; readonly farM: number },
): LightningArcs {
  const vertexCount = MAX_STRIKE_SEGMENTS * VERTICES_PER_SEGMENT;
  const positions = new Float32Array(vertexCount * 3);
  const axes = new Float32Array(vertexCount * 3);
  const ribbons = new Float32Array(vertexCount * 2);
  const glows = new Float32Array(vertexCount);
  const indices = new Uint16Array(MAX_STRIKE_SEGMENTS * INDICES_PER_SEGMENT);
  for (let segment = 0; segment < MAX_STRIKE_SEGMENTS; segment += 1) {
    const vertex = segment * VERTICES_PER_SEGMENT;
    indices.set(
      [vertex, vertex + 1, vertex + 2, vertex + 2, vertex + 1, vertex + 3],
      segment * INDICES_PER_SEGMENT,
    );
  }
  const geometry = new BufferGeometry();
  const attributes = {
    position: new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage),
    axis: new BufferAttribute(axes, 3).setUsage(DynamicDrawUsage),
    ribbon: new BufferAttribute(ribbons, 2).setUsage(DynamicDrawUsage),
    glow: new BufferAttribute(glows, 1).setUsage(DynamicDrawUsage),
  };
  geometry.setAttribute('position', attributes.position);
  geometry.setAttribute('axis', attributes.axis);
  geometry.setAttribute('ribbon', attributes.ribbon);
  geometry.setAttribute('glow', attributes.glow);
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.setDrawRange(0, 0);

  const flashColor = new Color(LIGHTNING_CONFIG.flashColor);
  const material = new ShaderMaterial({
    name: 'LightningArcShader',
    uniforms: {
      arcColor: { value: flashColor.clone() },
      flash: { value: 0 },
      coreFraction: { value: ARC.coreFraction },
      coreBrightness: { value: hdr ? ARC.coreBrightness.hdr : ARC.coreBrightness.direct },
      haloBrightness: { value: hdr ? ARC.haloBrightness.hdr : ARC.haloBrightness.direct },
      cameraFadeNear: { value: ARC.cameraFadeNearM },
      cameraFadeFar: { value: ARC.cameraFadeFarM },
      fogNear: { value: fog.nearM },
      fogFar: { value: fog.farM },
      fogFade: { value: ARC.fogFade },
    },
    vertexShader: ARC_VERTEX_SHADER,
    fragmentShader: ARC_FRAGMENT_SHADER,
    side: DoubleSide,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  const ribbonsMesh = new Mesh(geometry, material);
  ribbonsMesh.name = 'lightningArc';
  // 頂點每一道都在換，包圍球沒有意義；不做視錐剔除。
  ribbonsMesh.frustumCulled = false;
  ribbonsMesh.renderOrder = ARC_RENDER_ORDER;

  const groundGlows = Array.from({ length: BOLTS_PER_STRIKE }, () => createGroundGlow(hdr));
  const root = new Group();
  root.name = 'lightningArcs';
  root.add(ribbonsMesh, ...groundGlows);
  root.visible = false;
  // 電弧沒有實體表面：不參與環境光遮蔽。
  root.userData[SKIP_AMBIENT_OCCLUSION] = true;

  let shownStrike = -1;
  let bolts: readonly Bolt[] = [];

  const rebuild = (strikeIndex: number): void => {
    bolts = strikeBolts(seed, strikeIndex, area);
    let segmentIndex = 0;
    for (const bolt of bolts) {
      for (const segment of bolt.segments) {
        if (segmentIndex >= MAX_STRIKE_SEGMENTS) {
          break;
        }
        const dx = segment.to.x - segment.from.x;
        const dy = segment.to.y - segment.from.y;
        const dz = segment.to.z - segment.from.z;
        const length = Math.hypot(dx, dy, dz) || 1;
        // 兩端各沿小段的方向多伸出四分之一個寬度：折角的地方面片互相蓋住，不會有縫。
        const overlap = segment.widthM * ARC.coreFraction;
        const ends = [
          { point: segment.from, push: -overlap },
          { point: segment.to, push: overlap },
        ] as const;
        ends.forEach((end, endIndex) => {
          for (const side of [-1, 1] as const) {
            const vertex = segmentIndex * VERTICES_PER_SEGMENT + endIndex * 2 + (side + 1) / 2;
            positions.set(
              [
                end.point.x + (dx / length) * end.push,
                end.point.y + (dy / length) * end.push,
                end.point.z + (dz / length) * end.push,
              ],
              vertex * 3,
            );
            axes.set([dx / length, dy / length, dz / length], vertex * 3);
            ribbons.set([side, segment.widthM], vertex * 2);
            glows[vertex] = segment.brightness;
          }
        });
        segmentIndex += 1;
      }
    }
    for (const attribute of Object.values(attributes)) {
      attribute.needsUpdate = true;
    }
    geometry.setDrawRange(0, segmentIndex * INDICES_PER_SEGMENT);
    groundGlows.forEach((glow, index) => {
      const bolt = bolts[index];
      glow.visible = bolt !== undefined;
      if (bolt !== undefined) {
        glow.position.x = bolt.ground.x;
        glow.position.z = bolt.ground.z;
      }
    });
    shownStrike = strikeIndex;
  };

  return {
    root,
    show(strikeIndex, flash) {
      const visible = strikeIndex >= 0 && flash > 0;
      root.visible = visible;
      if (!visible) {
        return;
      }
      if (strikeIndex !== shownStrike) {
        rebuild(strikeIndex);
      }
      const uniform = material.uniforms['flash'];
      if (uniform !== undefined) {
        uniform.value = flash;
      }
      for (const glow of groundGlows) {
        const peak: unknown = glow.userData.peak;
        if (glow.material instanceof MeshBasicMaterial && typeof peak === 'number') {
          glow.material.color.copy(flashColor).multiplyScalar(peak * flash);
        }
      }
    },
    shown: () => ({ strikeIndex: shownStrike, visible: root.visible, bolts }),
  };
}
