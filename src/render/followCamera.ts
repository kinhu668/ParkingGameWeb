// 斜俯視跟隨鏡頭：鏡頭位置 = 平滑後的目標點 + 固定的世界座標偏移，看向目標點。
// 偏移固定在世界座標，所以鏡頭不隨車身旋轉。
import { PerspectiveCamera } from 'three';
import { CAMERA_CONFIG } from './renderConfig';

/**
 * 指數逼近的係數：1 − exp(−dt / 時間常數)。
 * 與幀率無關：同樣的總時間不論切成幾幀，逼近目標的比例都一樣。
 */
export function smoothingFactor(dtSeconds: number, timeConstantSeconds: number): number {
  return 1 - Math.exp(-dtSeconds / timeConstantSeconds);
}

export interface FollowCamera {
  readonly camera: PerspectiveCamera;
  /** 每個畫面幀呼叫：讓平滑目標點朝 (targetX, targetZ) 靠近，並更新鏡頭位置。 */
  update(targetX: number, targetZ: number, dtSeconds: number): void;
}

/** 建立鏡頭，一開始就對準 (startX, startZ)，不從別處滑過來。 */
export function createFollowCamera(startX: number, startZ: number): FollowCamera {
  // 長寬比先給 1，實際值由 fitRendererToCanvas 依畫布大小設定。
  const camera = new PerspectiveCamera(
    CAMERA_CONFIG.fovDeg,
    1,
    CAMERA_CONFIG.nearM,
    CAMERA_CONFIG.farM,
  );
  let smoothedX = startX;
  let smoothedZ = startZ;

  const place = (): void => {
    camera.position.set(
      smoothedX,
      CAMERA_CONFIG.offsetHeightM,
      smoothedZ + CAMERA_CONFIG.offsetBackM,
    );
    camera.lookAt(smoothedX, 0, smoothedZ);
  };
  place();

  return {
    camera,
    update(targetX, targetZ, dtSeconds) {
      const factor = smoothingFactor(dtSeconds, CAMERA_CONFIG.followTimeConstantS);
      smoothedX += (targetX - smoothedX) * factor;
      smoothedZ += (targetZ - smoothedZ) * factor;
      place();
    },
  };
}
