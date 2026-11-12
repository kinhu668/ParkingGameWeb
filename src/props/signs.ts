// 招牌：2D canvas 畫字 → CanvasTexture，貼在一片平面上。用系統的 sans-serif 粗體，不內嵌字型、不加素材。
// 文字只來自 level/environmentSigns.ts 的那張表（signText 會檢查）。同樣的字＋同樣的樣式共用一張貼圖。
// 沒有 DOM 的環境（單元測試）畫不了字：招牌退回成一片底色的牌子，位置與大小不變。
import {
  CanvasTexture,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { headingToRotationY } from '../core/heading';

/** 招牌的配色（CSS 顏色）。 */
export interface SignStyle {
  readonly background: string;
  readonly color: string;
  /** 外框的顏色；不給就沒有外框。 */
  readonly border?: string;
}

/** 招牌樣式表。配色避開常見量販店的紅藍、郵政的藍紅白。 */
export const SIGN_STYLES = {
  /** 大賣場主招牌：青綠底、米白字、橘框。 */
  club: { background: '#12706c', color: '#f6efdc', border: '#e8822a' },
  /** 大賣場的次要招牌：米白底、青綠字。 */
  clubMinor: { background: '#f1ead8', color: '#12706c' },
  /** 郵局：米白底、深綠字。 */
  postal: { background: '#ece5d0', color: '#1f5b3a', border: '#1f5b3a' },
  /** 投遞箱上的字：深綠底、米白字。 */
  mail: { background: '#1f5b3a', color: '#f1ead8' },
  /** 停車告示：白底、深綠字。 */
  notice: { background: '#f4f2ea', color: '#1d4d33', border: '#1d4d33' },
  /** 路牌：綠底白字。 */
  street: { background: '#1d5e3c', color: '#f4f2ea', border: '#f4f2ea' },
  /** 店面招牌（五種底色輪流用）。 */
  shopA: { background: '#7a2e2a', color: '#f6e9c8' },
  shopB: { background: '#2f3f4f', color: '#f1ead8' },
  shopC: { background: '#e9dfc3', color: '#2b4a5a' },
  shopD: { background: '#3b3a36', color: '#f0b64a' },
  shopE: { background: '#27566b', color: '#f4f2ea' },
  /** 巷子牆上的噴漆牌：黃底黑字。 */
  alley: { background: '#e2c33b', color: '#1b1b1a', border: '#1b1b1a' },
  /** 禁止停車：白底、暗紅字。 */
  warning: { background: '#f4f2ea', color: '#8f2a22', border: '#8f2a22' },
} as const satisfies Readonly<Record<string, SignStyle>>;

export type SignStyleId = keyof typeof SIGN_STYLES;

/** 每張招牌貼圖的上限（計畫 §6.4）。 */
export const SIGN_TEXTURE_MAX_PX = { width: 512, height: 128 } as const;

/** 這個長寬比（寬 ÷ 高）的招牌，貼圖要多大：不超過上限，長的那一邊頂到上限。 */
export function signTextureSize(aspect: number): { readonly width: number; readonly height: number } {
  const { width: maxWidth, height: maxHeight } = SIGN_TEXTURE_MAX_PX;
  if (aspect >= maxWidth / maxHeight) {
    return { width: maxWidth, height: Math.max(16, Math.round(maxWidth / aspect)) };
  }
  return { width: Math.max(16, Math.round(maxHeight * aspect)), height: maxHeight };
}

const textureCache = new Map<string, Texture>();

/** 畫一張招牌貼圖；沒有 DOM 就回傳 undefined。 */
function signTexture(text: string, style: SignStyle, aspect: number): Texture | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const { width, height } = signTextureSize(aspect);
  const key = `${text}|${style.background}|${style.color}|${style.border ?? ''}|${width}x${height}`;
  const cached = textureCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) {
    return undefined;
  }
  context.fillStyle = style.background;
  context.fillRect(0, 0, width, height);
  const borderPx = style.border === undefined ? 0 : Math.max(2, Math.round(height * 0.06));
  if (style.border !== undefined) {
    context.strokeStyle = style.border;
    context.lineWidth = borderPx;
    context.strokeRect(borderPx / 2, borderPx / 2, width - borderPx, height - borderPx);
  }
  // 先用最大的字級量寬度，放不下就等比例縮小。
  const maxTextWidth = (width - 2 * borderPx) * 0.9;
  let fontPx = Math.round((height - 2 * borderPx) * 0.68);
  const fontOf = (px: number): string => `bold ${px}px sans-serif`;
  context.font = fontOf(fontPx);
  const measured = context.measureText(text).width;
  if (measured > maxTextWidth) {
    fontPx = Math.max(8, Math.floor((fontPx * maxTextWidth) / measured));
    context.font = fontOf(fontPx);
  }
  context.fillStyle = style.color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, width / 2, height / 2 + fontPx * 0.04);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

/** 一塊招牌要擺在哪裡（世界座標，公尺）。 */
export interface SignPlacement {
  readonly text: string;
  readonly style: SignStyleId;
  /** 牌面中心。 */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** 牌面朝向（heading 約定）：字朝這個方向給人看。 */
  readonly facingRad: number;
  readonly widthM: number;
  readonly heightM: number;
  /** 自發光的強度（黃昏與夜晚的主招牌）；0 = 不發光。 */
  readonly glow: number;
}

/** 把一塊招牌畫成一片平面（只有正面）。 */
export function createSignMesh(sign: SignPlacement): Mesh {
  const style: SignStyle = SIGN_STYLES[sign.style];
  const texture = signTexture(sign.text, style, sign.widthM / sign.heightM);
  const material =
    texture === undefined
      ? new MeshStandardMaterial({ color: style.background, roughness: 0.7 })
      : new MeshStandardMaterial({
          map: texture,
          roughness: 0.7,
          emissive: 0xffffff,
          emissiveMap: texture,
          emissiveIntensity: sign.glow,
        });
  const mesh = new Mesh(new PlaneGeometry(sign.widthM, sign.heightM), material);
  mesh.name = 'sign';
  mesh.userData.signText = sign.text;
  mesh.position.set(sign.x, sign.y, sign.z);
  // 平面的正面是本地 +Z；headingToRotationY 把本地 −Z 轉到 heading 的方向，所以再轉半圈。
  mesh.rotation.y = headingToRotationY(sign.facingRad) + Math.PI;
  mesh.receiveShadow = true;
  return mesh;
}
