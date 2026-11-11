// 畫一幀的唯一入口：一般遊戲、?cam、?show、?bench 都呼叫 FramePipeline.render()，畫面才會一致。
// 依畫質級別走兩條路之一：
//
// A. 沒有高動態範圍的效果（low、medium）：場景直接畫到畫面上，色調映射與色域轉換由 renderer
//    在材質著色器裡做，抗鋸齒用畫布本身的多重取樣。有暈影（medium）就再疊一張乘法混合的全螢幕四邊形。
//    不用半浮點緩衝區、也不回讀畫面：內顯與 CPU 軟體算圖畫半浮點＋多重取樣非常慢
//    （SwiftShader 實測只剩三分之一幀率），而回讀畫面在無頭 Chromium 會偶發整張畫布空白。
//
// B. 有環境光遮蔽／泛光／SMAA（high、ultra）：後製鏈（EffectComposer），順序是
//    1. RenderPass        場景 → 半浮點緩衝區（場景線性亮度，還沒做色調映射；多重取樣只開在這一張）
//    2. GTAOPass          環境光遮蔽
//    3. UnrealBloomPass   泛光；門檻是線性亮度，所以要在色調映射之前
//    4. SMAAPass          ultra
//    5. 輸出 ShaderPass    色差 → 暈影 → 色調映射 + 轉成輸出色域（sRGB）→ 抖色
//
// 兩條路的色調映射都只做一次，用的是同一個函式（AgX + 黃昏的色調分級，見 renderer.ts）：three 只有
// 「畫到畫面上」才會幫材質做色調映射與色域轉換，畫到離屏緩衝區時不做。B 的最後一步用的是 three 內建的
// <tonemapping_fragment>／<colorspace_fragment>，與 OutputPass 等價；自己寫是為了把鏡頭效果併進同一個
// 全螢幕濾鏡，而且抖色要在「顯示空間」做，必須排在色調映射之後。
import {
  CustomBlending,
  DataTexture,
  HalfFloatType,
  PerspectiveCamera,
  RGBAFormat,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SrcColorFactor,
  Texture,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  ZeroFactor,
  type Object3D,
  type WebGLRenderer,
} from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { DEFAULT_SEED } from '../core/gameConfig';
import { createRng } from '../core/rng';
import { SKIP_AMBIENT_OCCLUSION } from './ambientOcclusionFlag';
import {
  effectivePixelRatio,
  usesHdrChain,
  type LensSettings,
  type QualitySettings,
} from './quality';
import { POST_CONFIG } from './renderConfig';

export interface FramePipeline {
  /**
   * 讓繪圖緩衝區（含後製鏈的每一張）跟上畫布的顯示大小與像素比，並更新鏡頭長寬比。
   * render() 自己會呼叫；要在畫之前先用到 camera.aspect 的地方（展示模式算鏡頭距離）才需要另外呼叫。
   */
  fit(camera: PerspectiveCamera): void;
  /** 畫一幀。scene 與 camera 每次都可以不同（遊戲鏡頭切換、不同的 ?cam 預設）。 */
  render(scene: Scene, camera: PerspectiveCamera): void;
  /**
   * 上一次 render() 的 draw calls：場景、陰影貼圖，加上每個全螢幕濾鏡各一次
   * （環境光遮蔽還會把場景多畫一遍法線）。比「場景裡的物件數」多，這是後製真實的成本。
   */
  drawCalls(): number;
  /**
   * 後製鏈的非同步資源都載入後解決（目前只有 SMAA 的查表貼圖；沒有就立刻解決）。
   * 定格截圖要等它，再畫一幀，畫面才是完整後製過的。
   */
  readonly ready: Promise<void>;
}

const NOISE_SIZE_PX = 64;
const BYTE_MAX = 255;

const FULLSCREEN_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`;

/**
 * 暈影的亮度倍率，兩條路共用同一段 GLSL：以畫面半高為 1 的座標算離中心的距離，
 * 從 vignetteInner 開始變暗，到 vignetteOuter 壓到 1 − vignette。
 */
const VIGNETTE_GLSL = /* glsl */ `
  uniform float aspect;
  uniform float vignette;
  uniform float vignetteInner;
  uniform float vignetteOuter;

  // 以畫面半高為 1 的座標：中心 (0, 0)，上下邊 ±1，左右邊 ±aspect。
  vec2 lensCoord( vec2 uv ) {
    return ( uv - 0.5 ) * 2.0 * vec2( aspect, 1.0 );
  }

  float vignetteFactor( vec2 uv ) {
    return 1.0 - vignette * smoothstep( vignetteInner, vignetteOuter, length( lensCoord( uv ) ) );
  }
`;

/** A 路的暈影：只輸出亮度倍率，靠乘法混合壓暗已經畫好的畫面。 */
const VIGNETTE_OVERLAY_FRAGMENT_SHADER = /* glsl */ `
  ${VIGNETTE_GLSL}
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4( vec3( vignetteFactor( vUv ) ), 1.0 );
  }
`;

/** B 路的最後一步：輸入是場景線性亮度。 */
const OUTPUT_FRAGMENT_SHADER = /* glsl */ `
  ${VIGNETTE_GLSL}
  uniform sampler2D tDiffuse;
  uniform float chromaticAberration;
  varying vec2 vUv;

  // 只跟像素座標有關的雜湊：同一個像素每幀都一樣，截圖可以重現。
  float hash( vec2 p ) {
    vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
    p3 += dot( p3, p3.yzx + 33.33 );
    return fract( ( p3.x + p3.y ) * p3.z );
  }

  void main() {
    gl_FragColor = vec4( texture2D( tDiffuse, vUv ).rgb, 1.0 );

    #ifdef CHROMATIC_ABERRATION
      // 色差：紅、藍兩個色版沿半徑方向往相反的方向錯開，越靠角落越多。
      vec2 lens = lensCoord( vUv );
      vec2 shift = ( vUv - 0.5 ) * dot( lens, lens ) * chromaticAberration;
      gl_FragColor.r = texture2D( tDiffuse, vUv - shift ).r;
      gl_FragColor.b = texture2D( tDiffuse, vUv + shift ).b;
    #endif

    // 暈影乘在色調映射之前：等於角落少一點曝光，太陽與車燈這些很亮的地方不會被壓成灰色。
    gl_FragColor.rgb *= vignetteFactor( vUv );

    // 色調映射與輸出色域：畫到畫面上時 three 會注入 renderer.toneMapping 對應的函式。整條鏈只有這裡做。
    #include <tonemapping_fragment>
    #include <colorspace_fragment>

    // 抖色（顯示空間）：加上不到一階的雜訊再量化成 8 位元，天空的漸層才不會出現色帶。
    vec3 color = gl_FragColor.rgb;
    color += ( hash( gl_FragCoord.xy ) - 0.5 ) / 255.0;
    gl_FragColor = vec4( clamp( color, 0.0, 1.0 ), 1.0 );
  }
`;

function vignetteUniforms(lens: LensSettings | null): ShaderMaterial['uniforms'] {
  return {
    aspect: { value: 1 },
    vignette: { value: lens?.vignette ?? 0 },
    vignetteInner: { value: POST_CONFIG.vignetteInner },
    vignetteOuter: { value: POST_CONFIG.vignetteOuter },
  };
}

/** A 路的暈影材質：乘法混合（結果 = 畫面上原本的顏色 × 這裡輸出的倍率），不必回讀畫面。 */
function createVignetteOverlayMaterial(lens: LensSettings): ShaderMaterial {
  return new ShaderMaterial({
    name: 'VignetteOverlayShader',
    uniforms: vignetteUniforms(lens),
    vertexShader: FULLSCREEN_VERTEX_SHADER,
    fragmentShader: VIGNETTE_OVERLAY_FRAGMENT_SHADER,
    transparent: true,
    blending: CustomBlending,
    blendSrc: ZeroFactor,
    blendDst: SrcColorFactor,
    // 輸出的是倍率不是顏色，不可以被色調映射。
    toneMapped: false,
    depthTest: false,
    depthWrite: false,
  });
}

/** B 路最後一步的材質：色調映射 + 輸出色域，加上鏡頭效果（lens 為 null 時只剩抖色）。 */
function createOutputMaterial(lens: LensSettings | null): ShaderMaterial {
  const defines: Record<string, string> = {};
  if (lens !== null && lens.chromaticAberration > 0) {
    defines['CHROMATIC_ABERRATION'] = '';
  }
  return new ShaderMaterial({
    name: 'OutputShader',
    defines,
    uniforms: {
      ...vignetteUniforms(lens),
      tDiffuse: { value: null },
      chromaticAberration: { value: lens?.chromaticAberration ?? 0 },
    },
    vertexShader: FULLSCREEN_VERTEX_SHADER,
    fragmentShader: OUTPUT_FRAGMENT_SHADER,
    depthTest: false,
    depthWrite: false,
  });
}

/**
 * GTAO 降噪用的雜訊貼圖。three 內建的版本用沒有種子的亂數，每次開頁面都不一樣；
 * 換成固定種子的，同一個網址的截圖才能逐位元重現。內容的算法與 GTAOPass 內建的相同。
 */
function createDenoiseNoiseTexture(): DataTexture {
  const simplex = new SimplexNoise({ random: createRng(DEFAULT_SEED) });
  const size = NOISE_SIZE_PX;
  const data = new Uint8Array(size * size * 4);
  const toByte = (noise: number): number => Math.round((noise * 0.5 + 0.5) * BYTE_MAX);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const offset = (row * size + column) * 4;
      data[offset] = toByte(simplex.noise(row, column));
      data[offset + 1] = toByte(simplex.noise(row + size, column));
      data[offset + 2] = toByte(simplex.noise(row, column + size));
      data[offset + 3] = toByte(simplex.noise(row + size, column + size));
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * 環境光遮蔽：GTAOPass 會用法線材質把場景再畫一遍。天空穹頂、半透明的光束沒有實體表面，
 * 畫進去會在它後面的東西上留下假的遮蔽，所以這一遍先把標了 SKIP_AMBIENT_OCCLUSION 的物件藏起來。
 */
class SceneAmbientOcclusionPass extends GTAOPass {
  private readonly hidden: Object3D[] = [];

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean,
  ): void {
    this.scene.traverseVisible((object) => {
      if (object.userData[SKIP_AMBIENT_OCCLUSION] === true) {
        object.visible = false;
        this.hidden.push(object);
      }
    });
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    for (const object of this.hidden) {
      object.visible = true;
    }
    this.hidden.length = 0;
  }
}

/**
 * SMAA 的兩張查表貼圖是從 data URL 非同步解碼的：圖片的 load 事件觸發後，SMAAPass 才把貼圖標成
 * 「需要上傳」（version 從 0 變成 1）。在那之前畫出來的幀沒有 SMAA 的效果。等兩張都標記好（或逾時）。
 */
function whenSmaaTexturesLoad(pass: SMAAPass): Promise<void> {
  const pending: Promise<void>[] = [];
  // 型別宣告沒有公開這兩個欄位（three 0.187 的內部名稱）；拿不到就當作不必等。
  for (const key of ['_areaTexture', '_searchTexture']) {
    const texture: unknown = Reflect.get(pass, key);
    if (!(texture instanceof Texture) || texture.version > 0) {
      continue;
    }
    const image: unknown = texture.image;
    if (image instanceof HTMLImageElement) {
      // 不看 image.complete：它可能已經是 true 而 load 事件還在排隊。SMAAPass 自己的 onload 比這裡先登記，
      // 所以這個回呼執行時貼圖已經標記好了。
      pending.push(
        new Promise((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        }),
      );
    }
  }
  if (pending.length === 0) {
    return Promise.resolve();
  }
  const timeout = new Promise<void>((resolve) => {
    window.setTimeout(resolve, POST_CONFIG.readyTimeoutMs);
  });
  return Promise.race([Promise.all(pending).then(() => undefined), timeout]);
}

/** 設定著色器材質的 uniform；名稱打錯就丟例外，不會默默沒效果。 */
function setUniform(material: ShaderMaterial, name: string, value: number | Texture): void {
  const uniform = material.uniforms[name];
  if (uniform === undefined) {
    throw new Error(`著色器「${material.name}」沒有 uniform「${name}」`);
  }
  uniform.value = value;
}

/**
 * 建立畫一幀的管線。renderer 要用同一個 quality 建立（createRenderer）。
 */
export function createFramePipeline(
  renderer: WebGLRenderer,
  quality: QualitySettings,
): FramePipeline {
  let drawCalls = 0;

  /** 畫布大小或像素比變了就重設 renderer；回傳有沒有變。鏡頭長寬比一併更新。 */
  const fitRenderer = (camera: PerspectiveCamera): boolean => {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) {
      return false;
    }

    const pixelRatio = effectivePixelRatio(quality, window.devicePixelRatio);
    const resized =
      canvas.width !== Math.floor(width * pixelRatio) ||
      canvas.height !== Math.floor(height * pixelRatio);
    if (resized) {
      renderer.setPixelRatio(pixelRatio);
      // 第三個引數 false：不改畫布的 CSS 大小，版面由 index.html 的樣式決定。
      renderer.setSize(width, height, false);
    }

    const aspect = width / height;
    if (camera.aspect !== aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    return resized;
  };

  // 每幀開頭手動歸零統計：一幀裡 renderer.render() 不只呼叫一次（場景、每個全螢幕濾鏡），
  // 自動歸零的話 renderer.info 只會留下最後那一次。
  renderer.info.autoReset = false;

  if (!usesHdrChain(quality)) {
    // A：直接畫到畫面上；有暈影就再疊一張乘法混合的全螢幕四邊形。
    const lens = quality.lens;
    const overlayMaterial =
      lens !== null && lens.vignette > 0 ? createVignetteOverlayMaterial(lens) : undefined;
    const overlay = overlayMaterial === undefined ? undefined : new FullScreenQuad(overlayMaterial);
    return {
      fit(camera) {
        fitRenderer(camera);
      },
      render(scene, camera) {
        fitRenderer(camera);
        renderer.info.reset();
        renderer.render(scene, camera);
        if (overlay !== undefined && overlayMaterial !== undefined) {
          setUniform(overlayMaterial, 'aspect', camera.aspect);
          // 疊在剛畫好的畫面上：這一次不可以先清掉畫面。
          renderer.autoClear = false;
          overlay.render(renderer);
          renderer.autoClear = true;
        }
        drawCalls = renderer.info.render.calls;
      },
      drawCalls: () => drawCalls,
      ready: Promise.resolve(),
    };
  }

  // B：後製鏈。
  // 後製鏈的兩張緩衝區都是半浮點（保留高動態範圍）。多重取樣只開在場景畫進去的那一張：
  // 其餘的全螢幕濾鏡不需要抗鋸齒，寫進多重取樣的緩衝區只是白白多一次解析。
  const size = renderer.getDrawingBufferSize(new Vector2());
  const width = Math.max(size.x, 1);
  const height = Math.max(size.y, 1);
  const filterBuffer = new WebGLRenderTarget(width, height, { type: HalfFloatType });
  const sceneBuffer = new WebGLRenderTarget(width, height, {
    type: HalfFloatType,
    samples: quality.msaaSamples,
  });
  const composer = new EffectComposer(renderer, filterBuffer);
  composer.renderTarget2.dispose();
  composer.renderTarget2 = sceneBuffer;
  // 緩衝區的大小一律直接給「繪圖緩衝區的像素數」（整數），不讓 composer 自己乘像素比（會乘出小數）。
  composer.setPixelRatio(1);

  // 場景與鏡頭每次 render() 都會換成呼叫端給的；這裡先放空的佔位。
  const renderPass = new RenderPass(new Scene(), new PerspectiveCamera());
  composer.addPass(renderPass);

  let aoPass: SceneAmbientOcclusionPass | undefined;
  if (quality.ambientOcclusion !== null) {
    const ao = quality.ambientOcclusion;
    aoPass = new SceneAmbientOcclusionPass(renderPass.scene, renderPass.camera, size.x, size.y);
    aoPass.blendIntensity = ao.intensity;
    aoPass.updateGtaoMaterial({ radius: ao.radiusM, samples: ao.samples });
    aoPass.updatePdMaterial({ samples: ao.denoiseSamples, radius: POST_CONFIG.aoDenoiseRadiusPx });
    aoPass.pdNoiseTexture.dispose();
    aoPass.pdNoiseTexture = createDenoiseNoiseTexture();
    setUniform(aoPass.pdMaterial, 'tNoise', aoPass.pdNoiseTexture);
    composer.addPass(aoPass);
  }

  if (quality.bloom !== null) {
    const bloom = quality.bloom;
    composer.addPass(
      new UnrealBloomPass(new Vector2(size.x, size.y), bloom.strength, bloom.radius, bloom.threshold),
    );
  }

  let ready: Promise<void> = Promise.resolve();
  if (quality.smaa) {
    const smaaPass = new SMAAPass();
    composer.addPass(smaaPass);
    ready = whenSmaaTexturesLoad(smaaPass);
  }

  const outputMaterial = createOutputMaterial(quality.lens);
  composer.addPass(new ShaderPass(outputMaterial));

  /** 後製鏈的緩衝區有沒有照畫布的大小設過；第一次一定要設。 */
  let composerSized = false;
  const fit = (camera: PerspectiveCamera): void => {
    const resized = fitRenderer(camera);
    if (resized || !composerSized) {
      // 後製鏈的每一張緩衝區（含環境光遮蔽、泛光自己的）都跟上繪圖緩衝區的大小。
      renderer.getDrawingBufferSize(size);
      composer.setSize(size.x, size.y);
      composerSized = true;
    }
    setUniform(outputMaterial, 'aspect', camera.aspect);
  };

  return {
    fit,
    render(scene, camera) {
      fit(camera);
      // 鏡頭每幀都可能換：場景與鏡頭的引用每次重設。
      renderPass.scene = scene;
      renderPass.camera = camera;
      if (aoPass !== undefined) {
        aoPass.scene = scene;
        aoPass.camera = camera;
      }
      // composer 每畫完一個濾鏡就交換兩張緩衝區，交換的次數跟著濾鏡數走；
      // 每幀開頭重設，場景才永遠畫進有多重取樣的那一張。
      composer.readBuffer = sceneBuffer;
      composer.writeBuffer = filterBuffer;
      renderer.info.reset();
      composer.render();
      drawCalls = renderer.info.render.calls;
    },
    drawCalls: () => drawCalls,
    ready,
  };
}
