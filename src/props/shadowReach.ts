// 建築的影子長度上限。太陽很低時（黃昏仰角 9°），一棟樓的影子有樓高的六倍長，照實投影會把整塊場地罩進影子裡；
// 所以建築（環境的主建築、背景樓）只在陰影貼圖裡被壓矮：高過「上限高度」的頂點壓到上限高度，
// 影子最長就是 SUN_CONFIG.buildingShadowReachM。太陽高的天氣（晴天、雨天、夜晚）上限比樓還高，影子就是照實的。
// 畫面上的建築不變；影子的方向也不變（仍然是太陽的方向），只是不會拉過整個場地。
// 牆、路燈、樹、車不走這一套：它們照實投影。
import { MeshDepthMaterial } from 'three';
import { SUN_CONFIG } from '../render/renderConfig';

/** 光幾乎水平時 tan(仰角) 趨近 0；上限高度不低於這個值（建築貼地的那一截仍然有影子）。 */
const MIN_SHADOW_HEIGHT_M = 0.5;

/**
 * 這個太陽方向下，建築在陰影貼圖裡最高算多高：影子長度上限 × tan(仰角)。
 * @param directionToSun 從被照的點指向太陽的方向（不必是單位長）
 */
export function buildingShadowMaxHeightM(directionToSun: {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}): number {
  const flat = Math.hypot(directionToSun.x, directionToSun.z);
  if (flat === 0) {
    return Infinity;
  }
  return Math.max(
    (SUN_CONFIG.buildingShadowReachM * Math.max(directionToSun.y, 0)) / flat,
    MIN_SHADOW_HEIGHT_M,
  );
}

/** 著色器裡上限高度的 uniform 名稱。 */
export const SHADOW_MAX_HEIGHT_UNIFORM = 'shadowMaxHeightM';

/** 取代 three 的 project_vertex：先換成世界座標，把高過上限的頂點壓到上限高度，再投到陰影相機。 */
const CAPPED_PROJECT_VERTEX = /* glsl */ `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 cappedWorld = modelMatrix * mvPosition;
cappedWorld.y = min( cappedWorld.y, ${SHADOW_MAX_HEIGHT_UNIFORM} );
mvPosition = viewMatrix * cappedWorld;
gl_Position = projectionMatrix * mvPosition;
`;

/** 把深度材質的頂點著色器改成「高度有上限」的版本。 */
export function capShadowVertexShader(vertexShader: string): string {
  return vertexShader
    .replace('#include <common>', `#include <common>\nuniform float ${SHADOW_MAX_HEIGHT_UNIFORM};`)
    .replace('#include <project_vertex>', CAPPED_PROJECT_VERTEX);
}

/**
 * 只在畫陰影貼圖時用的深度材質（Object3D.customDepthMaterial）：世界座標高過 maxHeightM 的頂點壓到 maxHeightM。
 * InstancedMesh 與一般 Mesh（遮擋半透明的替身）都可以用同一個。
 */
export function createCappedShadowDepthMaterial(maxHeightM: number): MeshDepthMaterial {
  const material = new MeshDepthMaterial();
  material.userData[SHADOW_MAX_HEIGHT_UNIFORM] = maxHeightM;
  material.onBeforeCompile = (shader) => {
    shader.uniforms[SHADOW_MAX_HEIGHT_UNIFORM] = { value: maxHeightM };
    shader.vertexShader = capShadowVertexShader(shader.vertexShader);
  };
  // 與 three 內建的深度材質分開快取（否則兩者的程式碼相同鍵值、會共用到沒改過的那一份）。
  material.customProgramCacheKey = () => 'cappedShadowDepth';
  return material;
}
