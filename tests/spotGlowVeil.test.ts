// 目標車位發光標記的光幕（遠處用的淡漸層）：比光牆高、非常淡、離鏡頭近了完全不畫——鏡頭就算在光幕的範圍裡
// 眼前也沒有東西（以前吊在空中的實心箭頭會把鏡頭包住）。顏色、脈動、停妥後變綠與淡出都跟著光牆。不開 WebGL。
import { Color, DoubleSide, Mesh, ShaderMaterial, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import { GAME_CAMERA_VIEWS } from '../src/core/cameraView';
import { LEVELS } from '../src/level/levelCatalog';
import { PROTOTYPE_LAYOUT, PROTOTYPE_LEVEL } from '../src/level/prototypeLayout';
import { worldToSpotLocal } from '../src/props/lotLayout';
import {
  createSpotGlow,
  createVeilGeometry,
  glowVeilAlpha,
  glowVeilCameraFade,
  glowVeilEdgeFade,
  glowVeilHeightFade,
  glowWallAlpha,
} from '../src/props/spotGlow';
import { SKIP_AMBIENT_OCCLUSION } from '../src/render/ambientOcclusionFlag';
import { createGameCamera } from '../src/render/gameCamera';
import {
  CAMERA_CONFIG,
  FIXED_CAMERA_CONFIG,
  GAME_CAMERA_CONFIG,
  SPOT_GLOW_CONFIG as CONFIG,
} from '../src/render/renderConfig';

const VEIL = CONFIG.veil;

function veilMaterial(veil: Mesh): ShaderMaterial {
  if (!(veil.material instanceof ShaderMaterial)) {
    throw new Error('光幕的材質應該是 ShaderMaterial');
  }
  return veil.material;
}

function uniformOf(veil: Mesh, name: string): unknown {
  return veilMaterial(veil).uniforms[name]?.value;
}

describe('光幕很淡：不是實心的東西', () => {
  test('最濃的地方（牆頂）也只有兩成，遠比光牆淡；往上單調淡到 0', () => {
    expect(glowVeilAlpha(0)).toBe(VEIL.opacity);
    expect(VEIL.opacity).toBeLessThanOrEqual(0.25);
    expect(VEIL.opacity).toBeLessThan(CONFIG.wallOpacity / 3);
    expect(glowVeilAlpha(1)).toBe(0);
    let previous = Number.POSITIVE_INFINITY;
    for (let step = 0; step <= 20; step += 1) {
      const alpha = glowVeilAlpha(step / 20);
      expect(alpha).toBeLessThanOrEqual(previous);
      expect(alpha).toBeGreaterThanOrEqual(0);
      previous = alpha;
    }
    // 上半段幾乎看不見。
    expect(glowVeilAlpha(0.5)).toBeLessThan(0.1);
    // 光牆自己在牆頂已經淡到 0：光幕接在它上面，不是把牆加厚。
    expect(glowWallAlpha(1)).toBe(0);
  });

  test('每一面的左右兩端淡到 0，中段全濃：不是一塊硬邊的矩形', () => {
    expect(glowVeilEdgeFade(0)).toBe(0);
    expect(glowVeilEdgeFade(1)).toBe(0);
    expect(glowVeilEdgeFade(0.5)).toBe(1);
    expect(glowVeilEdgeFade(VEIL.edgeFade)).toBe(1);
    expect(glowVeilEdgeFade(1 - VEIL.edgeFade)).toBe(1);
    expect(glowVeilEdgeFade(VEIL.edgeFade / 2)).toBeGreaterThan(0);
    expect(glowVeilEdgeFade(VEIL.edgeFade / 2)).toBeLessThan(1);
    expect(VEIL.edgeFade).toBeGreaterThan(0.2);
    expect(VEIL.edgeFade).toBeLessThan(0.5);
  });

  test('幾何：四個邊各一片、從光牆的頂端到 veil.heightM、沒有頂蓋；每個頂點的不透明度照高度', () => {
    const { spot } = PROTOTYPE_LAYOUT;
    const geometry = createVeilGeometry(spot);
    const position = geometry.getAttribute('position');
    const alpha = geometry.getAttribute('alpha');
    const along = geometry.getAttribute('along');
    expect(position.count).toBe(4 * VEIL.layers * 6);
    expect(along.count).toBe(position.count);
    let maxAlpha = 0;
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      // 每個頂點都在車位的輪廓上（不是蓋子、不是內部）。
      const onOutline =
        Math.abs(Math.abs(x) - spot.widthM / 2) < 1e-6 || Math.abs(Math.abs(z) - spot.lengthM / 2) < 1e-6;
      expect(onOutline).toBe(true);
      expect(y).toBeGreaterThanOrEqual(CONFIG.heightM - 1e-6);
      expect(y).toBeLessThanOrEqual(VEIL.heightM + 1e-6);
      const t = (y - CONFIG.heightM) / (VEIL.heightM - CONFIG.heightM);
      expect(alpha.getX(index)).toBeCloseTo(glowVeilAlpha(t), 6);
      const alongValue = along.getX(index);
      expect(alongValue === 0 || alongValue === 1).toBe(true);
      maxAlpha = Math.max(maxAlpha, alpha.getX(index));
    }
    expect(maxAlpha).toBeCloseTo(VEIL.opacity, 6);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(VEIL.heightM, 6);
    // 比鄰車的車頂高得多（隔著鄰車也看得到），但不是插到天上的柱子。
    expect(VEIL.heightM).toBeGreaterThan(GAME_CAMERA_CONFIG.chaseNear.heightM * 2);
    expect(VEIL.heightM).toBeLessThan(GAME_CAMERA_CONFIG.chaseFar.heightM);
  });
});

describe('不擋鏡頭：離鏡頭近的光幕完全不畫', () => {
  test('近距離是 0、遠處是 1、中間單調', () => {
    expect(glowVeilCameraFade(0)).toBe(0);
    expect(glowVeilCameraFade(VEIL.fadeNearM)).toBe(0);
    expect(glowVeilCameraFade(VEIL.fadeFarM)).toBe(1);
    expect(glowVeilCameraFade(500)).toBe(1);
    let previous = 0;
    for (let step = 0; step <= 20; step += 1) {
      const fade = glowVeilCameraFade(VEIL.fadeNearM + ((VEIL.fadeFarM - VEIL.fadeNearM) * step) / 20);
      expect(fade).toBeGreaterThanOrEqual(previous);
      previous = fade;
    }
    // 完全不畫的距離比車身還長：車開到車位旁邊時只剩原本的光牆。
    expect(VEIL.fadeNearM).toBeGreaterThan(5);
  });

  test('每一關、每個鏡頭模式的起點：鏡頭不在光幕裡；就算水平位置在車位上空，鏡頭也比光幕的頂端高', () => {
    for (const level of [PROTOTYPE_LEVEL, ...LEVELS]) {
      const { spot, startState } = level.layout;
      for (const view of GAME_CAMERA_VIEWS) {
        const camera = createGameCamera(view, startState).camera;
        const local = worldToSpotLocal(spot, camera.position.x, camera.position.z);
        const overSpot = Math.abs(local.x) <= spot.widthM / 2 && Math.abs(local.z) <= spot.lengthM / 2;
        const insideVeil = overSpot && camera.position.y <= VEIL.heightM;
        expect(insideVeil, `${level.id} ${view}`).toBe(false);
      }
    }
  });

  test('最壞的情況（鏡頭貼著光幕）：畫得出來的不透明度是 0；任何距離、任何高度都不超過兩成', () => {
    // 鏡頭在光幕的面上：那一片離鏡頭 0–fadeNearM 的部分全部不畫。
    for (const distanceM of [0, 0.5, 2, 5, VEIL.fadeNearM]) {
      expect(glowVeilAlpha(0) * glowVeilCameraFade(distanceM)).toBe(0);
    }
    for (const distanceM of [VEIL.fadeNearM + 1, 12, 20, 50, 200]) {
      for (const t of [0, 0.25, 0.5, 1]) {
        expect(glowVeilAlpha(t) * glowVeilCameraFade(distanceM)).toBeLessThanOrEqual(VEIL.opacity);
      }
    }
    // 兩片光幕疊在一起（穿過車位看另一邊）也還是淡的。
    expect(1 - (1 - VEIL.opacity) ** 2).toBeLessThan(0.4);
  });
});

describe('高處的鏡頭不畫光幕', () => {
  test('貼近地面的鏡頭（駕駛座、引擎蓋、近距跟車）全濃；遠距跟車、俯視、?cam=follow／top 完全不畫', () => {
    for (const lowM of [
      GAME_CAMERA_CONFIG.cockpit.heightM,
      GAME_CAMERA_CONFIG.hood.heightM,
      GAME_CAMERA_CONFIG.chaseNear.heightM,
      FIXED_CAMERA_CONFIG.spotLowHeightM,
    ]) {
      expect(glowVeilHeightFade(lowM)).toBe(1);
    }
    for (const highM of [
      GAME_CAMERA_CONFIG.chaseFar.heightM,
      GAME_CAMERA_CONFIG.top.heightM,
      CAMERA_CONFIG.offsetHeightM,
      FIXED_CAMERA_CONFIG.topHeightM,
    ]) {
      expect(glowVeilHeightFade(highM)).toBe(0);
    }
    let previous = 1;
    for (let step = 0; step <= 20; step += 1) {
      const fade = glowVeilHeightFade(VEIL.cameraLowM + ((VEIL.cameraHighM - VEIL.cameraLowM) * step) / 20);
      expect(fade).toBeLessThanOrEqual(previous);
      previous = fade;
    }
    expect(previous).toBe(0);
    const glow = createSpotGlow(PROTOTYPE_LAYOUT.spot);
    expect(uniformOf(glow.veil, 'cameraLow')).toBe(VEIL.cameraLowM);
    expect(uniformOf(glow.veil, 'cameraHigh')).toBe(VEIL.cameraHighM);
  });
});

describe('光幕的網格與狀態', () => {
  test('是另一個網格（不在光牆那一組裡）、與車位同位置同方向；半透明、不寫深度、兩面都畫、不吃霧、不進環境光遮蔽', () => {
    for (const level of [PROTOTYPE_LEVEL, ...LEVELS]) {
      const glow = createSpotGlow(level.layout.spot);
      expect(glow.veil).toBeInstanceOf(Mesh);
      expect(glow.veil.name).toBe('spotGlowVeil');
      expect(glow.veil.parent).toBeNull();
      expect(glow.veil.position.toArray()).toEqual(glow.root.position.toArray());
      expect(glow.veil.rotation.y).toBe(glow.root.rotation.y);
      const material = veilMaterial(glow.veil);
      expect(material.transparent).toBe(true);
      expect(material.depthWrite).toBe(false);
      expect(material.depthTest).toBe(true);
      expect(material.side).toBe(DoubleSide);
      expect(material.fog).toBe(false);
      expect(glow.veil.castShadow).toBe(false);
      expect(glow.veil.userData[SKIP_AMBIENT_OCCLUSION]).toBe(true);
      expect(uniformOf(glow.veil, 'fadeNear')).toBe(VEIL.fadeNearM);
      expect(uniformOf(glow.veil, 'fadeFar')).toBe(VEIL.fadeFarM);
      expect(uniformOf(glow.veil, 'edgeFade')).toBe(VEIL.edgeFade);
    }
  });

  test('顏色與整體不透明度跟著光牆：脈動、停妥變綠、淡出後不畫、重來後回來', () => {
    const glow = createSpotGlow(PROTOTYPE_LAYOUT.spot);
    const color = (): Color => {
      const value = uniformOf(glow.veil, 'veilColor');
      if (!(value instanceof Color)) {
        throw new Error('veilColor 應該是 Color');
      }
      return value;
    };
    expect(color().getHex()).toBe(CONFIG.color);
    expect(uniformOf(glow.veil, 'veilOpacity')).toBe(1);

    glow.advance(CONFIG.pulsePeriodS / 2);
    expect(uniformOf(glow.veil, 'veilOpacity')).toBeCloseTo(1 - CONFIG.pulseDepth, 9);

    glow.show(true, CONFIG.greenSeconds);
    expect(color().getHex()).toBe(CONFIG.parkedColor);
    expect(glow.veil.visible).toBe(true);

    glow.show(true, CONFIG.greenHoldSeconds + CONFIG.fadeSeconds);
    expect(glow.veil.visible).toBe(false);
    expect(glow.root.visible).toBe(false);

    glow.show(false, 0);
    expect(glow.veil.visible).toBe(true);
    expect(color().getHex()).toBe(CONFIG.color);
  });

  test('倒車輔助的小畫面裡不畫（drawHidden），畫完恢復', () => {
    const glow = createSpotGlow(PROTOTYPE_LAYOUT.spot);
    let seen: boolean | undefined;
    glow.drawHidden(() => {
      seen = glow.veil.visible || glow.root.visible;
    });
    expect(seen).toBe(false);
    expect(glow.veil.visible).toBe(true);
    expect(glow.root.visible).toBe(true);
    // 光幕頂端的世界高度就是設定值。
    glow.veil.updateMatrixWorld(true);
    glow.veil.geometry.computeBoundingBox();
    const top = new Vector3(0, glow.veil.geometry.boundingBox?.max.y ?? 0, 0).applyMatrix4(glow.veil.matrixWorld);
    expect(top.y).toBeCloseTo(VEIL.heightM, 6);
  });
});
