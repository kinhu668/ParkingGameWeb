// 地面：一大片平面。柏油的顆粒、裂縫、油漬、潮濕反光在著色器裡用世界座標算（groundShader.ts），
// 噪聲來源是固定種子的貼圖（groundNoise.ts）。地面跟著車平移，紋理釘在世界上不動。
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
import type { GroundQualitySettings } from '../render/quality';
import { GROUND_CONFIG } from '../render/renderConfig';
import { generateAsphaltPixels } from './groundNoise';
import { groundLayerTransforms, groundShaderDefines, patchGroundShader } from './groundShader';

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

/**
 * 柏油材質：MeshStandardMaterial 加上世界座標的程序化細節，仍然吃環境貼圖、陰影與霧。
 * @param seed 噪聲貼圖與各層位移的亂數種子
 * @param quality 這個畫質級別的地面開關
 * @param maxAnisotropy 顯示卡支援的各向異性過濾上限
 */
export function createGroundMaterial(
  seed: number,
  quality: GroundQualitySettings,
  maxAnisotropy: number,
): MeshStandardMaterial {
  const config = GROUND_CONFIG;
  const anisotropy = Math.max(1, Math.min(maxAnisotropy, quality.maxAnisotropy));
  const noise = createNoiseTexture(seed, quality.textureSizePx, anisotropy);
  const layers = groundLayerTransforms(seed).map(
    (layer) =>
      new Vector4(layer.cosOverPeriod, layer.sinOverPeriod, layer.offsetU, layer.offsetV),
  );
  const defines = groundShaderDefines(quality);
  // 有限差分的步長：細顆粒層的一個貼圖像素。
  const normalEpsM = config.layers.fineGrain.periodM / quality.textureSizePx;

  const material = new MeshStandardMaterial({
    color: new Color(config.baseColor),
    roughness: config.roughness,
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
      uGroundWet: {
        value: new Vector4(config.wetStart, config.wetEnd, config.wetDarken, config.wetRoughness),
      },
      uGroundPuddle: {
        value: new Vector4(config.puddleStart, config.puddleEnd, config.puddleRoughness, 0),
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
 */
export function createGround(
  seed: number,
  quality: GroundQualitySettings,
  maxAnisotropy: number,
): Mesh {
  const ground = new Mesh(
    new PlaneGeometry(GROUND_CONFIG.sizeM, GROUND_CONFIG.sizeM),
    createGroundMaterial(seed, quality, maxAnisotropy),
  );
  // PlaneGeometry 預設立在 XY 平面、面朝 +Z；繞 X 轉 −90° 讓它躺平、面朝 +Y。
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}
