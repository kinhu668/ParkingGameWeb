// 停放用的車款幾何：每一款的外框剛好是車款表的長寬高（碰撞盒讀的就是那張表），輪子在軸距上，
// 車上唯一的字是車牌號碼，面數不比轎車多太多。不開 WebGL。
import { Box3, Color, Matrix4, Vector3, type BufferGeometry } from 'three';
import { describe, expect, test } from 'vitest';
import { parkedCarPaint } from '../src/props/parkedCars';
import { PARKED_CAR_PAINTS } from '../src/render/renderConfig';
import {
  CAR_MODEL_PARTS,
  createCarModelParts,
  type CarModelParts,
} from '../src/vehicle/carModelParts';
import { CAR_MODEL_IDS, carModelDimsM, type CarModelId } from '../src/vehicle/carModels';

const DETAILS = ['low', 'high'] as const;
const NEW_MODELS = CAR_MODEL_IDS.filter((model) => model !== 'sedan');
/** 外框對車款表的容許誤差。 */
const ENVELOPE_TOLERANCE_M = 0.002;

function boundsOf(geometry: BufferGeometry, matrix?: Matrix4): Box3 {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox?.clone() ?? new Box3();
  return matrix === undefined ? box : box.applyMatrix4(matrix);
}

/** 幾何在車頭那一半（z < 0）或車尾那一半的頂點的外框。 */
function endBounds(geometry: BufferGeometry, front: boolean): Box3 {
  const positions = geometry.getAttribute('position');
  const box = new Box3();
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    if (positions.getZ(vertex) < 0 === front) {
      box.expandByPoint(new Vector3().fromBufferAttribute(positions, vertex));
    }
  }
  return box;
}

/** 四個輪子各自的擺放矩陣（右前、右後、左前、左後）：與 parkedCars.ts 相同，左側轉半圈。 */
function wheelMatrices(parts: CarModelParts): Matrix4[] {
  return [1, -1].flatMap((side) =>
    parts.wheel.centers.map(([xM, yM, zM]) =>
      new Matrix4()
        .makeRotationY(side < 0 ? Math.PI : 0)
        .setPosition(new Vector3(side * xM, yM, zM)),
    ),
  );
}

/** 整台車（車身各分區＋四個輪子）的外框。 */
function envelopeOf(parts: CarModelParts): Box3 {
  const box = new Box3();
  for (const geometry of parts.body.values()) {
    box.union(boundsOf(geometry));
  }
  for (const matrix of wheelMatrices(parts)) {
    box.union(boundsOf(parts.wheel.tire, matrix)).union(boundsOf(parts.wheel.rim, matrix));
  }
  return box;
}

function triangles(geometry: BufferGeometry): number {
  return (geometry.getIndex()?.count ?? geometry.getAttribute('position').count) / 3;
}

function totalTriangles(parts: CarModelParts): number {
  let total = 4 * (triangles(parts.wheel.tire) + triangles(parts.wheel.rim));
  for (const geometry of parts.body.values()) {
    total += triangles(geometry);
  }
  return total;
}

describe.each(CAR_MODEL_IDS.flatMap((model) => DETAILS.map((detail) => [model, detail] as const)))(
  '%s（%s）',
  (model, detail) => {
    const parts = createCarModelParts(model, detail);
    const dims = carModelDimsM(model);

    test('外框就是車款表的長寬高：看到的車多大，碰撞盒就多大', () => {
      const box = envelopeOf(parts);
      expect(box.min.x).toBeCloseTo(-dims.widthM / 2, 2);
      expect(Math.abs(box.min.x + dims.widthM / 2)).toBeLessThan(ENVELOPE_TOLERANCE_M);
      expect(Math.abs(box.max.x - dims.widthM / 2)).toBeLessThan(ENVELOPE_TOLERANCE_M);
      expect(Math.abs(box.min.z + dims.lengthM / 2)).toBeLessThan(ENVELOPE_TOLERANCE_M);
      expect(Math.abs(box.max.z - dims.lengthM / 2)).toBeLessThan(ENVELOPE_TOLERANCE_M);
      expect(Math.abs(box.min.y)).toBeLessThan(ENVELOPE_TOLERANCE_M);
      expect(Math.abs(box.max.y - dims.heightM)).toBeLessThan(ENVELOPE_TOLERANCE_M);
    });

    test('輪子在軸距上、著地、沒有超出車寬；輪圈在輪胎裡', () => {
      const { wheel } = parts;
      const [front, rear] = wheel.centers;
      expect(front[2]).toBeCloseTo(-dims.wheelbaseM / 2, 3);
      expect(rear[2]).toBeCloseTo(dims.wheelbaseM / 2, 3);
      for (const [xM, yM] of wheel.centers) {
        expect(yM).toBeCloseTo(wheel.radiusM, 6);
        expect(xM + wheel.widthM / 2).toBeLessThanOrEqual(dims.widthM / 2 + ENVELOPE_TOLERANCE_M);
        expect(xM - wheel.widthM / 2).toBeGreaterThan(dims.widthM / 4);
      }
      const tire = boundsOf(wheel.tire);
      expect(tire.max.y).toBeCloseTo(wheel.radiusM, 2);
      expect(tire.max.z).toBeCloseTo(wheel.radiusM, 2);
      expect(tire.max.x - tire.min.x).toBeCloseTo(wheel.widthM, 2);
      const rim = boundsOf(wheel.rim);
      expect(rim.max.y).toBeLessThanOrEqual(wheel.radiusM);
      expect(wheel.rimRadiusM).toBeLessThan(wheel.radiusM);
      // 輪徑像一台車的輪子（直徑約 1.9–2.4 ft）。
      expect(wheel.radiusM).toBeGreaterThan(0.28);
      expect(wheel.radiusM).toBeLessThan(0.37);
    });

    test('每個分區都是認得的、有東西、位置與法線都是有限的數字，法線是單位長', () => {
      expect(parts.body.size).toBeGreaterThan(0);
      for (const [part, geometry] of [
        ...parts.body,
        ['tire', parts.wheel.tire] as const,
        ['rim', parts.wheel.rim] as const,
      ]) {
        if (part !== 'tire' && part !== 'rim') {
          expect(CAR_MODEL_PARTS).toContain(part);
        }
        const positions = geometry.getAttribute('position');
        const normals = geometry.getAttribute('normal');
        expect(triangles(geometry), part).toBeGreaterThan(0);
        expect(Number.isInteger(triangles(geometry)), part).toBe(true);
        expect(normals.count, part).toBe(positions.count);
        let worst = 0;
        for (let vertex = 0; vertex < positions.count; vertex += 1) {
          const length = Math.hypot(normals.getX(vertex), normals.getY(vertex), normals.getZ(vertex));
          worst = Math.max(worst, Math.abs(length - 1));
          if (
            !Number.isFinite(positions.getX(vertex) + positions.getY(vertex) + positions.getZ(vertex))
          ) {
            expect.fail(`${part} 的第 ${vertex} 個頂點不是有限的數字`);
          }
        }
        expect(worst, part).toBeLessThan(1e-3);
      }
    });

    test('有烤漆、玻璃、黑飾條、頭燈、尾燈、前後牌面', () => {
      for (const part of ['paint', 'glass', 'trim', 'headlight', 'taillight', 'plate'] as const) {
        expect(parts.body.has(part), part).toBe(true);
      }
      // 牌面前後各一塊：車頭、車尾兩端都有。
      const plate = parts.body.get('plate');
      const box = plate === undefined ? new Box3() : boundsOf(plate);
      expect(box.min.z).toBeLessThan(-dims.lengthM / 2 + 0.25);
      expect(box.max.z).toBeGreaterThan(dims.lengthM / 2 - 0.25);
    });

    test('車上唯一的字是車牌號碼：字貼在牌面上，車身的幾何與號碼無關', () => {
      const plate = parts.body.get('plate');
      if (plate === undefined) {
        expect.fail('沒有牌面');
      }
      for (const front of [true, false]) {
        const plaque = endBounds(plate, front).expandByScalar(0.02);
        const text = endBounds(parts.plateText('ABC-1234'), front);
        expect(text.isEmpty()).toBe(false);
        expect(plaque.containsBox(text)).toBe(true);
        // 字的高度是車牌的大小，不是塗在車身上的大字。
        expect(text.max.y - text.min.y).toBeLessThan(0.2);
      }
      // 換一個號碼，字的幾何跟著變；車身不變（重建一次完全相同）。
      const other = parts.plateText('XYZ-9876');
      expect(Array.from(other.getAttribute('position').array)).not.toEqual(
        Array.from(parts.plateText('ABC-1234').getAttribute('position').array),
      );
      const again = createCarModelParts(model, detail);
      expect([...again.body.keys()]).toEqual([...parts.body.keys()]);
      for (const [part, geometry] of parts.body) {
        expect(
          Array.from(again.body.get(part)?.getAttribute('position').array ?? []),
          part,
        ).toEqual(Array.from(geometry.getAttribute('position').array));
      }
    });
  },
);

describe('四款新車', () => {
  test.each(NEW_MODELS)('%s：不是轎車換皮，烤漆的幾何與轎車不同', (model) => {
    const sedan = createCarModelParts('sedan', 'high').body.get('paint');
    const paint = createCarModelParts(model, 'high').body.get('paint');
    if (sedan === undefined || paint === undefined) {
      expect.fail('沒有烤漆');
    }
    const size = boundsOf(paint).getSize(new Vector3());
    const sedanSize = boundsOf(sedan).getSize(new Vector3());
    expect(
      Math.abs(size.x - sedanSize.x) + Math.abs(size.y - sedanSize.y) + Math.abs(size.z - sedanSize.z),
    ).toBeGreaterThan(0.02);
  });

  test.each(DETAILS)('%s：每一款的面數不超過轎車的 1.3 倍', (detail) => {
    const sedan = totalTriangles(createCarModelParts('sedan', detail));
    for (const model of NEW_MODELS) {
      expect(totalTriangles(createCarModelParts(model, detail)), model).toBeLessThanOrEqual(
        sedan * 1.3,
      );
    }
  });

  test.each(NEW_MODELS)('%s：low 的面數不比 high 多', (model) => {
    const low = createCarModelParts(model, 'low');
    const high = createCarModelParts(model, 'high');
    expect(totalTriangles(low)).toBeLessThanOrEqual(totalTriangles(high));
    expect(triangles(low.wheel.rim)).toBeLessThan(triangles(high.wheel.rim));
  });

  test('招牌特徵：拉力車是金色輪圈、寬體是黑色輪圈、肌肉車有條紋與鍍鉻、敞篷車看得到座椅', () => {
    const hsl = (model: CarModelId): { h: number; s: number; l: number } =>
      new Color(createCarModelParts(model, 'high').wheel.rimColor).getHSL({ h: 0, s: 0, l: 0 });
    const gold = hsl('rally');
    expect(gold.h).toBeGreaterThan(0.08);
    expect(gold.h).toBeLessThan(0.16);
    expect(gold.s).toBeGreaterThan(0.35);
    expect(hsl('widebody').l).toBeLessThan(0.15);
    const fastback = createCarModelParts('fastback', 'high').body;
    expect(fastback.has('accent')).toBe(true);
    expect(fastback.has('chrome')).toBe(true);
    const roadster = createCarModelParts('roadster', 'high').body;
    expect(roadster.has('upholstery')).toBe(true);
    // 條紋從車頭拉到車尾。
    const stripes = fastback.get('accent');
    const stripeLength = stripes === undefined ? 0 : boundsOf(stripes).getSize(new Vector3()).z;
    expect(stripeLength).toBeGreaterThan(carModelDimsM('fastback').lengthM * 0.8);
    // 高尾翼：拉力車最高的東西在車尾那一段，不是車頂。
    const rally = createCarModelParts('rally', 'high');
    const rallyTop = envelopeOf(rally).max.y;
    const rear = new Box3();
    for (const geometry of rally.body.values()) {
      const positions = geometry.getAttribute('position');
      for (let vertex = 0; vertex < positions.count; vertex += 1) {
        if (positions.getY(vertex) > rallyTop - 0.03) {
          rear.expandByPoint(new Vector3().fromBufferAttribute(positions, vertex));
        }
      }
    }
    expect(rear.min.z).toBeGreaterThan(carModelDimsM('rally').lengthM * 0.25);
  });
});

describe('停放車輛的配色', () => {
  test.each(CAR_MODEL_IDS)('%s：至少四種車色，variant 0–1 每一種都抽得到', (model) => {
    const paints = PARKED_CAR_PAINTS[model];
    expect(new Set(paints.map(([paint]) => paint)).size).toBeGreaterThanOrEqual(4);
    const picked = new Set<number>();
    for (let step = 0; step < 100; step += 1) {
      picked.add(parkedCarPaint(model, step / 100).paint.getHex());
    }
    expect(picked.size).toBe(new Set(paints.map(([paint]) => new Color(paint).getHex())).size);
    // variant 剛好是 1 也不會抽到表外。
    expect(parkedCarPaint(model, 1).paint.getHex()).toBe(
      new Color(paints[paints.length - 1]?.[0] ?? 0).getHex(),
    );
  });
});
