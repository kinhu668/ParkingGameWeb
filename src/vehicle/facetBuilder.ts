// 手工拼曲面用的小工具：一片一片加進來，每一片有自己的頂點（片與片之間的稜線是硬的，片裡面的法線是平滑的），
// 正反面由「這一片大致朝哪裡」決定，不必自己數頂點順序。車身配件（燈組、輪拱唇、後視鏡殼）與輪圈都用它。
import { BufferAttribute, BufferGeometry, Vector3 } from 'three';

export type Point3 = readonly [number, number, number];

/** 一片面朝哪裡：固定的方向，或由這一片某一格的中心算出來。 */
export type Outward = Point3 | ((center: Vector3) => Point3);

/** 面積小於這個值的三角形算退化（收成一點的那一格），不拿來判斷正反面。 */
const DEGENERATE_AREA = 1e-12;

export class FacetBuilder {
  private readonly positions: number[] = [];
  private readonly indices: number[] = [];

  private add(point: Point3): number {
    this.positions.push(point[0], point[1], point[2]);
    return this.positions.length / 3 - 1;
  }

  private at(index: number): Vector3 {
    return new Vector3(
      this.positions[index * 3],
      this.positions[index * 3 + 1],
      this.positions[index * 3 + 2],
    );
  }

  /** 加進一批三角形；整批的頂點順序一致，用第一個沒退化的三角形對照 outward 決定要不要整批翻面。 */
  private addTriangles(triangles: readonly (readonly [number, number, number])[], outward: Outward): void {
    let flip = false;
    for (const [a, b, c] of triangles) {
      const pa = this.at(a);
      const normal = this.at(b).sub(pa).cross(this.at(c).sub(pa));
      if (normal.lengthSq() < DEGENERATE_AREA) {
        continue;
      }
      const center = pa.add(this.at(b)).add(this.at(c)).multiplyScalar(1 / 3);
      const hint = typeof outward === 'function' ? outward(center) : outward;
      flip = normal.dot(new Vector3(hint[0], hint[1], hint[2])) < 0;
      break;
    }
    for (const [a, b, c] of triangles) {
      if (flip) {
        this.indices.push(a, c, b);
      } else {
        this.indices.push(a, b, c);
      }
    }
  }

  /** 一片網格：rows[i][j] 是第 i 列第 j 個點，每一列的點數相同。 */
  grid(rows: readonly (readonly Point3[])[], outward: Outward): this {
    const columns = rows[0]?.length ?? 0;
    const base = this.positions.length / 3;
    for (const row of rows) {
      for (const point of row) {
        this.add(point);
      }
    }
    const triangles: [number, number, number][] = [];
    for (let row = 0; row + 1 < rows.length; row += 1) {
      for (let column = 0; column + 1 < columns; column += 1) {
        const a = base + row * columns + column;
        const b = a + 1;
        const c = a + columns;
        const d = c + 1;
        triangles.push([a, b, c], [b, d, c]);
      }
    }
    this.addTriangles(triangles, outward);
    return this;
  }

  /** 一圈一圈接起來的管狀曲面：每一圈的點數相同、頭尾相接（沒有接縫），法線朝外（遠離整批點的中心）。 */
  loop(rings: readonly (readonly Point3[])[]): this {
    const count = rings[0]?.length ?? 0;
    const base = this.positions.length / 3;
    const middle = new Vector3();
    let total = 0;
    for (const ring of rings) {
      for (const point of ring) {
        this.add(point);
        middle.add(new Vector3(point[0], point[1], point[2]));
        total += 1;
      }
    }
    middle.multiplyScalar(1 / Math.max(total, 1));
    const triangles: [number, number, number][] = [];
    for (let ring = 0; ring + 1 < rings.length; ring += 1) {
      for (let point = 0; point < count; point += 1) {
        const a = base + ring * count + point;
        const b = base + ring * count + ((point + 1) % count);
        const c = a + count;
        const d = b + count;
        triangles.push([a, b, c], [b, d, c]);
      }
    }
    this.addTriangles(triangles, (center) => {
      const away = center.clone().sub(middle);
      return [away.x, away.y, away.z];
    });
    return this;
  }

  /** 把一圈點用扇形封起來（蓋子）：center 是扇形的中心。 */
  fan(ring: readonly Point3[], center: Point3, outward: Outward): this {
    const hub = this.add(center);
    const first = this.positions.length / 3;
    for (const point of ring) {
      this.add(point);
    }
    const triangles: [number, number, number][] = [];
    for (let point = 0; point < ring.length; point += 1) {
      triangles.push([hub, first + point, first + ((point + 1) % ring.length)]);
    }
    this.addTriangles(triangles, outward);
    return this;
  }

  /** 做成幾何：只有位置與法線、有索引（與車殼的屬性一致，併得起來）。 */
  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setIndex(this.indices);
    geometry.computeVertexNormals();
    return geometry;
  }
}
