// 路燈的桿、臂、燈頭連成一體：每個零件都接在前面的零件上，發光面在燈殼正下方。不開 WebGL。
import { Box3, type BufferGeometry } from 'three';
import { describe, expect, test } from 'vitest';
import { ftToM } from '../src/core/units';
import type { PropPlacement } from '../src/props/lotLayout';
import { createLampPostParts, lampHeadPosition, type LampStyle } from '../src/props/lotProps';
import { LOT_PROPS_CONFIG as LOT } from '../src/render/renderConfig';

/** 兩個外框有沒有相接（重疊至少 minM）。 */
function joined(a: Box3, b: Box3, minM: number): boolean {
  return (
    Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x) >= minM &&
    Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y) >= minM &&
    Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z) >= minM
  );
}

function boundsOf(geometry: BufferGeometry): Box3 {
  geometry.computeBoundingBox();
  return geometry.boundingBox ?? new Box3();
}

describe('路燈：桿、臂、燈頭一體', () => {
  const lamp: PropPlacement = {
    x: 0,
    z: 0,
    y: 0,
    headingRad: 0,
    sizeX: 2 * LOT.lampPoleRadiusM,
    sizeY: LOT.lampHeightM,
    sizeZ: 2 * LOT.lampPoleRadiusM,
    variant: 0,
  };

  test.each<LampStyle>(['classic', 'braced'])('%s：每個零件都接在前面的零件上，沒有懸空的', (style) => {
    const boxes = createLampPostParts(style).map(boundsOf);
    // 幾何的頂點是單精度。
    expect(boxes[0]?.min.y).toBeCloseTo(0, 5);
    boxes.slice(1).forEach((box, index) => {
      expect(boxes.slice(0, index + 1).some((earlier) => joined(box, earlier, ftToM(0.04)))).toBe(true);
    });
  });

  test.each<LampStyle>(['classic', 'braced'])('%s：燈殼是最後一件，發光面就在燈殼正下方', (style) => {
    const boxes = createLampPostParts(style).map(boundsOf);
    const housing = boxes[boxes.length - 1] ?? new Box3();
    const head = lampHeadPosition(lamp);
    expect(head.x).toBeGreaterThan(housing.min.x);
    expect(head.x).toBeLessThan(housing.max.x);
    expect(head.z).toBeGreaterThan(housing.min.z);
    expect(head.z).toBeLessThan(housing.max.z);
    expect(head.y).toBeCloseTo(housing.min.y, 5);
  });

  test('braced（有邊界的關卡用的）：燈臂與燈殼同高、伸進燈殼裡，桿頂有接頭、下面有斜撐', () => {
    const [base, pole, joint, arm, brace, neck, housing] = createLampPostParts('braced').map(boundsOf);
    if (
      base === undefined || pole === undefined || joint === undefined || arm === undefined ||
      brace === undefined || neck === undefined || housing === undefined
    ) {
      throw new Error('braced 路燈少了零件');
    }
    // 燈臂的上下緣都在燈殼的厚度裡，而且伸進燈殼至少 0.3 ft。
    expect(arm.min.y).toBeGreaterThanOrEqual(housing.min.y - 1e-9);
    expect(arm.max.y).toBeLessThanOrEqual(housing.max.y + 1e-9);
    expect(housing.max.z - arm.min.z).toBeGreaterThanOrEqual(ftToM(0.3));
    // 接頭包住桿頂與燈臂的根部；斜撐一頭在桿上、一頭在燈臂下面。
    expect(joined(joint, pole, ftToM(0.3))).toBe(true);
    expect(joined(joint, arm, ftToM(0.3))).toBe(true);
    expect(joined(brace, pole, ftToM(0.1))).toBe(true);
    expect(joined(brace, arm, ftToM(0.05))).toBe(true);
    // 比原型關的 classic 粗：燈臂至少 0.5 ft 寬。
    expect(arm.max.x - arm.min.x).toBeGreaterThanOrEqual(ftToM(0.5));
    expect(base.max.x - base.min.x).toBeGreaterThan(pole.max.x - pole.min.x);
    expect(neck.max.x - neck.min.x).toBeLessThan(housing.max.x - housing.min.x);
  });
});
