// 地面：一大片平面。柏油的顆粒、裂縫、油漬、潮濕反光在著色器裡用世界座標算（groundShader.ts），
// 噪聲來源是固定種子的貼圖（groundNoise.ts）。地面跟著車平移，紋理釘在世界上不動。
// 路緣石與車擋落在地面上的影子也由著色器直接算（陰影貼圖畫不完整的部分）。
import {
  Color,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  PlaneGeometry,
  RGBAFormat,
  RepeatWrapping,
  UnsignedByteType,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import type { GroundReflectionUniforms } from '../render/groundReflection';
import type { GroundQualitySettings } from '../render/quality';
import { GROUND_CONFIG, GROUND_REFLECTION_CONFIG } from '../render/renderConfig';
import type { GroundWetnessPreset } from '../render/weatherPresets';
import { generateAsphaltPixels } from './groundNoise';
import {
  GROUND_EDGE_SHADOW_SOFTNESS,
  groundLayerTransforms,
  groundMirrorMode,
  groundRipplesEnabled,
  groundShaderDefines,
  groundStainSmear,
  patchGroundShader,
  type GroundEdgeShadows,
} from './groundShader';

/** 噪聲貼圖：線性數值（不是顏色），四個方向都可重複，開 mipmap（遠處自動平均成素色，不會閃爍）。 */
function createNoiseTexture(seed: number, sizePx: number, anisotropy: number): DataTexture {
  const texture = new DataTexture(
    generateAsphaltPixels(seed, sizePx),
    sizePx,
    sizePx,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.colorSpace = NoColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

/** 沒有指定天氣時的潮濕設定：GROUND_CONFIG 原本的數值。 */
const DEFAULT_WETNESS: GroundWetnessPreset = { ...GROUND_CONFIG, fallback: null, reflection: 0 };

/** 積水上雨滴的漣漪（只有正在下雨、`?fx=off` 沒開時才給）。 */
export interface GroundRipples {
  /** 雨量（WeatherPreset.rain，0–1）：漣漪的幅度照它打折。 */
  readonly rain: number;
  /** 漣漪的時間（秒）；物件固定，場景每幀把經過的時間加上去。定格截圖停在 0（每一格的時間差固定，所以可重現）。 */
  readonly time: { value: number };
}

/** 濕地與積水映出來的東西（天氣有積水的倒影時才用得到；每一項都可以不給）。 */
export interface GroundWater {
  /**
   * 平面反射的貼圖與矩陣（render/groundReflection.ts）；不給 = 濕與積水的地方只映天空（環境貼圖）。
   * quality.reflection 是 null（這個級別不畫倒影那一遍）時不必給。
   */
  readonly reflection?: GroundReflectionUniforms | undefined;
  /**
   * 環境貼圖的亮度乘上這個值才等於畫面上的天空（天空穹頂的倍率 ÷ 環境光的倍率）；不給 = 1。
   * 只映天空的積水因此與平面反射的積水一樣亮。
   */
  readonly skyScale?: number | undefined;
  /** 積水上雨滴的漣漪；不給 = 沒有（沒下雨、`?fx=off`）。 */
  readonly ripples?: GroundRipples | undefined;
}

/**
 * 柏油材質：MeshStandardMaterial 加上世界座標的程序化細節，仍然吃環境貼圖、陰影與霧。
 * @param seed 噪聲貼圖與各層位移的亂數種子
 * @param quality 這個畫質級別的地面開關
 * @param maxAnisotropy 顯示卡支援的各向異性過濾上限
 * @param edgeShadows 路緣石、車擋的影子；不給就只有陰影貼圖的影子
 * @param wetness 這種天氣的潮濕與積水；不給 = GROUND_CONFIG（黃昏的少量潮濕斑）
 * @param water 濕地與積水映出來的東西（倒影貼圖、天空的亮度、漣漪）；不給 = 只映天空、沒有漣漪
 */
export function createGroundMaterial(
  seed: number,
  quality: GroundQualitySettings,
  maxAnisotropy: number,
  edgeShadows?: GroundEdgeShadows,
  wetness: GroundWetnessPreset = DEFAULT_WETNESS,
  water: GroundWater = {},
): MeshStandardMaterial {
  const { reflection, ripples } = water;
  const config = GROUND_CONFIG;
  // 沒有潮濕著色器的級別：雨天用整片壓暗＋降粗糙度代替。
  const fallback = quality.wetness ? null : wetness.fallback;
  const anisotropy = Math.max(1, Math.min(maxAnisotropy, quality.maxAnisotropy));
  const noise = createNoiseTexture(seed, quality.textureSizePx, anisotropy);
  const layers = groundLayerTransforms(seed).map(
    (layer) =>
      new Vector4(layer.cosOverPeriod, layer.sinOverPeriod, layer.offsetU, layer.offsetV),
  );
  const stainSmear = groundStainSmear();
  // 倒影：天氣有積水的倒影、級別有潮濕著色器才有；有給倒影貼圖才是平面反射，否則只映天空。
  const mirror = groundMirrorMode(
    reflection === undefined ? { ...quality, reflection: null } : quality,
    wetness.reflection,
  );
  const rippling =
    ripples !== undefined && groundRipplesEnabled(quality, mirror, ripples.rain, true);
  const defines = groundShaderDefines(quality, edgeShadows?.boxes.length, mirror, rippling);
  // 有限差分的步長：細顆粒層的一個貼圖像素。
  const normalEpsM = config.layers.fineGrain.periodM / quality.textureSizePx;

  const material = new MeshStandardMaterial({
    color:
      fallback === null
        ? new Color(config.baseColor)
        : new Color(config.baseColor).multiplyScalar(fallback.colorScale),
    roughness: fallback === null ? config.roughness : fallback.roughness,
    metalness: 0,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uGroundNoise: { value: noise },
      uGroundLayers: { value: layers },
      uGroundContrast: {
        value: new Vector4(
          config.fineGrainContrast,
          config.coarseGrainContrast,
          config.macroAContrast,
          config.macroBContrast,
        ),
      },
      uGroundDustTint: {
        value: new Vector3(config.dustTint.r, config.dustTint.g, config.dustTint.b),
      },
      uGroundCrack: {
        value: new Vector4(
          config.crackMaskStart,
          config.crackMaskEnd,
          config.crackDarken,
          config.crackWarp,
        ),
      },
      uGroundStain: {
        value: new Vector4(config.stainStart, config.stainEnd, config.stainRoughness, 0),
      },
      uGroundStainTint: {
        value: new Vector3(config.stainTint.r, config.stainTint.g, config.stainTint.b),
      },
      uGroundStainWarp: {
        value: new Vector3(config.stainWarpScale, config.stainWarp, config.wetWarp),
      },
      uGroundStainMacro: {
        value: new Vector2(config.stainMacroAWeight, config.stainMacroBWeight),
      },
      uGroundStainSmear: { value: new Vector2(stainSmear.x, stainSmear.z) },
      uGroundStainDrift: { value: config.stainDriftM },
      uGroundStainShape: {
        value: new Vector4(
          config.stainStreakStretch,
          config.stainStreakWeight,
          config.stainSplatterScale,
          config.stainSplatterWeight,
        ),
      },
      uGroundWet: {
        value: new Vector4(
          wetness.wetStart,
          wetness.wetEnd,
          wetness.wetDarken,
          wetness.wetRoughness,
        ),
      },
      uGroundPuddle: {
        value: new Vector4(wetness.puddleStart, wetness.puddleEnd, wetness.puddleRoughness, 0),
      },
      uGroundHeights: {
        value: new Vector4(
          config.fineGrainHeightM,
          config.coarseGrainHeightM,
          config.crackDepthM,
          normalEpsM,
        ),
      },
      uGroundNormalFade: {
        value: new Vector2(config.normalFadeStartM, config.normalFadeEndM),
      },
    });
    if (mirror !== 'none') {
      const look = GROUND_REFLECTION_CONFIG;
      Object.assign(shader.uniforms, {
        uGroundMirror: {
          value: new Vector4(
            look.puddleReflectance,
            look.puddleGrazingReflectance,
            look.wetReflectance,
            look.wetGrazingReflectance,
          ),
        },
        uGroundMirrorLook: {
          value: new Vector4(
            wetness.reflection,
            look.puddleDarken,
            look.puddleFresnelPower,
            look.wetFresnelPower,
          ),
        },
        uGroundMirrorSky: { value: water.skyScale ?? 1 },
      });
    }
    if (mirror === 'planar' && reflection !== undefined) {
      const look = GROUND_REFLECTION_CONFIG;
      Object.assign(shader.uniforms, {
        uGroundReflection: reflection.texture,
        uGroundReflectionMatrix: reflection.matrix,
        uGroundReflectionStrength: reflection.strength,
        uGroundReflectionShape: {
          value: new Vector3(look.wetStreakLength, look.grainDistortion, look.streakSkew),
        },
        uGroundReflectionBlur: { value: new Vector2(look.wetBlurLod, look.puddleBlurLod) },
      });
    }
    if (rippling && ripples !== undefined) {
      const ripple = GROUND_REFLECTION_CONFIG.ripple;
      Object.assign(shader.uniforms, {
        uGroundRippleTime: ripples.time,
        uGroundRipple: {
          value: new Vector3(ripple.slope * ripples.rain, ripple.reflectionShift, ripple.contrast),
        },
        uGroundRippleCells: {
          value: new Vector4(
            ripple.cellsM[0],
            ripple.cellsM[1],
            ripple.ratesHz[0],
            ripple.ratesHz[1],
          ),
        },
        uGroundRippleShape: {
          value: new Vector3(ripple.maxRadius, ripple.frequency, ripple.sharpness),
        },
        uGroundRippleFade: { value: new Vector2(ripple.fadeStartM, ripple.fadeEndM) },
      });
    }
    if (edgeShadows !== undefined && edgeShadows.boxes.length > 0) {
      Object.assign(shader.uniforms, {
        uGroundEdgeFrame: {
          value: new Vector4(
            edgeShadows.originX,
            edgeShadows.originZ,
            edgeShadows.rightX,
            edgeShadows.rightZ,
          ),
        },
        uGroundEdgeSun: {
          value: new Vector3(edgeShadows.sunRunX, edgeShadows.sunRunZ, GROUND_EDGE_SHADOW_SOFTNESS),
        },
        uGroundEdgeBoxes: {
          value: edgeShadows.boxes.map(
            (box) => new Vector4(box.minX, box.minZ, box.maxX, box.maxZ),
          ),
        },
        uGroundEdgeHeights: { value: edgeShadows.boxes.map((box) => box.heightM) },
      });
    }
    patchGroundShader(shader, defines);
  };
  // 開關不同就是不同的著色器程式；快取鍵要分開。
  material.customProgramCacheKey = () => `ground:${defines.join(',')}`;
  return material;
}

/**
 * 建立地面網格（y = 0 的水平面，只收陰影不投影）。
 * @param seed 柏油的亂數種子
 * @param quality 這個畫質級別的地面開關
 * @param maxAnisotropy 顯示卡支援的各向異性過濾上限；斜看地面時遠處才不會糊成一片
 * @param edgeShadows 路緣石、車擋的影子（著色器裡直接算）；不給就只有陰影貼圖的影子
 * @param wetness 這種天氣的潮濕與積水；不給 = 黃昏
 * @param water 濕地與積水映出來的東西（倒影貼圖、天空的亮度、漣漪）；不給 = 只映天空、沒有漣漪
 */
export function createGround(
  seed: number,
  quality: GroundQualitySettings,
  maxAnisotropy: number,
  edgeShadows?: GroundEdgeShadows,
  wetness?: GroundWetnessPreset,
  water?: GroundWater,
): Mesh {
  const ground = new Mesh(
    new PlaneGeometry(GROUND_CONFIG.sizeM, GROUND_CONFIG.sizeM),
    createGroundMaterial(seed, quality, maxAnisotropy, edgeShadows, wetness, water),
  );
  // PlaneGeometry 預設立在 XY 平面、面朝 +Z；繞 X 轉 −90° 讓它躺平、面朝 +Y。
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}
