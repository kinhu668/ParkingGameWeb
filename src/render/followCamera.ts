// 斜俯視跟隨鏡頭：鏡頭位置 = 平滑後的目標點 + 固定的世界座標偏移，看向目標點。
// 偏移固定在世界座標，所以鏡頭不隨車身旋轉。另有 `?cam=` 用的固定鏡頭預設。
// 這個鏡頭現在只給 `?cam=follow` 的定格與 `?bench` 用；一般遊戲的鏡頭在 gameCamera.ts。
import { PerspectiveCamera } from 'three';
import { forward, right } from '../core/heading';
import type { CameraPreset } from '../core/urlParams';
import type { ParkingSpot } from '../level/parkingJudge';
import { CAMERA_CONFIG, FIXED_CAMERA_CONFIG } from './renderConfig';

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

/** 全專案共用的鏡頭規格。長寬比先給 1，實際值由 fitRendererToCanvas 依畫布大小設定。 */
export function createCamera(): PerspectiveCamera {
  return new PerspectiveCamera(CAMERA_CONFIG.fovDeg, 1, CAMERA_CONFIG.nearM, CAMERA_CONFIG.farM);
}

/** 建立鏡頭，一開始就對準 (startX, startZ)，不從別處滑過來。 */
export function createFollowCamera(startX: number, startZ: number): FollowCamera {
  const camera = createCamera();
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

/**
 * `?cam=` 的固定鏡頭：擺好就不動。
 * - `follow`：跟隨鏡頭對準車 (vehicleX, vehicleZ) 的定格。
 * - `top`：車位正上方往下看，畫面上方是北（−Z），與跟隨鏡頭同向。
 * - `spot_low`：車位左前方的低角度，看向車位中心。
 */
export function createPresetCamera(
  preset: CameraPreset,
  vehicleX: number,
  vehicleZ: number,
  spot: ParkingSpot,
): PerspectiveCamera {
  switch (preset) {
    case 'follow':
      return createFollowCamera(vehicleX, vehicleZ).camera;
    case 'top': {
      const camera = createCamera();
      camera.position.set(spot.x, FIXED_CAMERA_CONFIG.topHeightM, spot.z);
      // 視線垂直向下時與預設的「上」（+Y）平行，lookAt 算不出畫面朝向；改用北方當畫面上方。
      camera.up.set(0, 0, -1);
      camera.lookAt(spot.x, 0, spot.z);
      return camera;
    }
    case 'spot_low': {
      const camera = createCamera();
      const lateral = right(spot.headingRad);
      const ahead = forward(spot.headingRad);
      camera.position.set(
        spot.x +
          lateral.x * FIXED_CAMERA_CONFIG.spotLowLateralM +
          ahead.x * FIXED_CAMERA_CONFIG.spotLowAheadM,
        FIXED_CAMERA_CONFIG.spotLowHeightM,
        spot.z +
          lateral.z * FIXED_CAMERA_CONFIG.spotLowLateralM +
          ahead.z * FIXED_CAMERA_CONFIG.spotLowAheadM,
      );
      camera.lookAt(spot.x, FIXED_CAMERA_CONFIG.spotLowLookAtHeightM, spot.z);
      return camera;
    }
  }
}
