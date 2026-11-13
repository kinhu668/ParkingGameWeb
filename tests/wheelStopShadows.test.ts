// 假車位的車擋在每個畫質級別都有影子：網格一律投影；陰影貼圖太粗、畫不出這麼矮的東西的級別（low、medium），
// 落在地面上的影子改由地面的著色器直接算（與目標車位的車擋、路緣石同一套）。不開 WebGL。
import { InstancedMesh } from 'three';
import { describe, expect, test } from 'vitest';
import { DEFAULT_SEED } from '../src/core/gameConfig';
import { PROTOTYPE_LAYOUT } from '../src/level/prototypeLayout';
import { groundEdgeLight, groundEdgeShadows } from '../src/props/groundShader';
import { edgeShadowBoxes, wheelStopShadowBoxes } from '../src/props/lotEdges';
import { createLotLayout, spotLocalToWorld, type LotLayout } from '../src/props/lotLayout';
import { createLotProps } from '../src/props/lotProps';
import { QUALITY_LEVELS, usesHdrChain, type QualityLevel } from '../src/render/quality';
import { QUALITY_PRESETS, SUN_CONFIG, WHEEL_STOP_CONFIG } from '../src/render/renderConfig';
import { lotGroundEdgeBoxes, lotShadowBox, shadowNormalBias } from '../src/render/scene';
import { SUN_DIRECTION } from '../src/render/sky';

const { spot, startState } = PROTOTYPE_LAYOUT;

function layoutFor(level: QualityLevel): LotLayout {
  return createLotLayout(spot, startState, DEFAULT_SEED, QUALITY_PRESETS[level].props);
}

/** 這個畫質級別在原型關的陰影範圍下的法線偏移。 */
function normalBiasFor(level: QualityLevel): number {
  const box = lotShadowBox(spot);
  return shadowNormalBias(box.right - box.left, QUALITY_PRESETS[level].shadowMapSize);
}

describe('假車位的車擋：網格在每個畫質級別都投影', () => {
  test.each(QUALITY_LEVELS)('%s', (level) => {
    const quality = QUALITY_PRESETS[level];
    const layout = layoutFor(level);
    expect(layout.wheelStops.length).toBeGreaterThan(0);
    const stops = createLotProps(spot, layout, quality.props, usesHdrChain(quality)).getObjectByName(
      'wheelStops',
    );
    expect(stops).toBeInstanceOf(InstancedMesh);
    expect(stops instanceof InstancedMesh ? stops.count : 0).toBe(layout.wheelStops.length);
    // 以前跟著 detailShadows（low／medium 是 false）。
    expect(stops?.castShadow).toBe(true);
    expect(stops?.receiveShadow).toBe(true);
  });

  test('low 與 medium 的 detailShadows 仍然是關的（圍欄、垃圾桶、交通錐照舊），只有車擋不跟它', () => {
    expect(QUALITY_PRESETS.low.props.detailShadows).toBe(false);
    expect(QUALITY_PRESETS.medium.props.detailShadows).toBe(false);
  });
});

describe('假車位的車擋：落在地面上的影子', () => {
  test('每個車擋一個箱子：長邊沿車位的橫向，高度是車擋的高度，深度不超過底面', () => {
    const layout = layoutFor('medium');
    const boxes = wheelStopShadowBoxes(layout.wheelStops);
    expect(boxes).toHaveLength(layout.wheelStops.length);
    boxes.forEach((box, index) => {
      const stop = layout.wheelStops[index];
      expect(box.heightM).toBe(WHEEL_STOP_CONFIG.heightM);
      expect(box.maxX - box.minX).toBeCloseTo(WHEEL_STOP_CONFIG.lengthM, 9);
      expect(box.maxZ - box.minZ).toBeLessThan(WHEEL_STOP_CONFIG.baseDepthM);
      expect(box.maxZ - box.minZ).toBeGreaterThan(WHEEL_STOP_CONFIG.topDepthM);
      expect((box.minX + box.maxX) / 2).toBeCloseTo(stop?.x ?? NaN, 9);
      expect((box.minZ + box.maxZ) / 2).toBeCloseTo(stop?.z ?? NaN, 9);
    });
  });

  test('轉 90° 的車擋長邊換成沿 Z；斜的略過（箱子只能是軸對齊的）', () => {
    const base = { x: 3, z: -2, y: 0, sizeX: 1.8, sizeY: 0.11, sizeZ: 0.2, variant: 0 };
    const [straight] = wheelStopShadowBoxes([{ ...base, headingRad: Math.PI }]);
    const [turned] = wheelStopShadowBoxes([{ ...base, headingRad: -Math.PI / 2 }]);
    expect((straight?.maxX ?? 0) - (straight?.minX ?? 0)).toBeCloseTo(1.8, 9);
    expect((turned?.maxZ ?? 0) - (turned?.minZ ?? 0)).toBeCloseTo(1.8, 9);
    expect((turned?.maxX ?? 0) - (turned?.minX ?? 0)).toBeLessThan(0.2);
    expect(wheelStopShadowBoxes([{ ...base, headingRad: 0.4 }])).toHaveLength(0);
    expect(wheelStopShadowBoxes([])).toHaveLength(0);
  });

  test('low、medium：著色器的箱子包含假車擋；high、ultra 的陰影貼圖夠細，不多算', () => {
    const curbsAndTarget = edgeShadowBoxes(spot).length;
    for (const level of ['low', 'medium'] as const) {
      const layout = layoutFor(level);
      const boxes = lotGroundEdgeBoxes(spot, layout.wheelStops, normalBiasFor(level));
      expect(boxes, level).toHaveLength(curbsAndTarget + layout.wheelStops.length);
      // 原本的箱子（路緣石、目標車位的車擋）排在最前面，一個不變。
      expect(boxes.slice(0, curbsAndTarget)).toEqual(edgeShadowBoxes(spot));
    }
    for (const level of ['high', 'ultra'] as const) {
      const layout = layoutFor(level);
      expect(lotGroundEdgeBoxes(spot, layout.wheelStops, normalBiasFor(level)), level).toEqual(
        edgeShadowBoxes(spot),
      );
      // 貼圖夠細：法線偏移遠小於車擋的高度。
      expect(normalBiasFor(level)).toBeLessThan(
        WHEEL_STOP_CONFIG.heightM * SUN_CONFIG.shadowBiasPerCasterHeight,
      );
    }
  });

  test.each(['low', 'medium'] as const)('%s：每個假車擋背光那一側的地面在影子裡，向光那一側照得到', (level) => {
    const layout = layoutFor(level);
    const boxes = lotGroundEdgeBoxes(spot, layout.wheelStops, normalBiasFor(level));
    const shadows = groundEdgeShadows(spot, spot.headingRad, SUN_DIRECTION, boxes);
    const withoutStops = groundEdgeShadows(spot, spot.headingRad, SUN_DIRECTION, edgeShadowBoxes(spot));
    // 黃昏的影子長度（沿車位本地 Z）：高度 × sunRunZ；取樣點放在影子中段。
    const offsetZ = -shadows.sunRunZ * WHEEL_STOP_CONFIG.heightM * 0.5;
    expect(Math.abs(offsetZ)).toBeGreaterThan(WHEEL_STOP_CONFIG.baseDepthM);
    const offsetX = -shadows.sunRunX * WHEEL_STOP_CONFIG.heightM * 0.5;
    let darkened = 0;
    const curbsAndTarget = edgeShadowBoxes(spot).length;
    layout.wheelStops.forEach((stop, index) => {
      const shaded = spotLocalToWorld(spot, stop.x + offsetX, stop.z + offsetZ);
      const sunny = spotLocalToWorld(spot, stop.x - offsetX, stop.z - offsetZ);
      expect(groundEdgeLight(shadows, shaded.x, shaded.z)).toBeLessThan(0.05);
      // 向光側：這個車擋自己不擋那一點（那一點可能在隔壁車擋的影子裡，所以跟「拿掉這一個」比）。
      const withoutThisOne = groundEdgeShadows(
        spot,
        spot.headingRad,
        SUN_DIRECTION,
        boxes.filter((_box, boxIndex) => boxIndex !== curbsAndTarget + index),
      );
      expect(groundEdgeLight(shadows, sunny.x, sunny.z)).toBeCloseTo(
        groundEdgeLight(withoutThisOne, sunny.x, sunny.z),
        9,
      );
      if (groundEdgeLight(withoutStops, shaded.x, shaded.z) > 0.95) {
        darkened += 1;
      }
    });
    // 大部分的假車擋影子是新增的（原本那一點是亮的）。
    expect(darkened).toBeGreaterThan(layout.wheelStops.length / 2);
  });
});
