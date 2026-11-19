// 被撞的車晃動的畫面：整台車（各個實例、車牌上的字、車身上的字樣、亮著的警報燈）一起傾斜、平移，
// 停了一個位元不差地放回原位；別的車不動；正被淡成半透明的車動的是替身，晃的時候淡回實心。不開 WebGL。
import { Group, InstancedMesh, Matrix4, Mesh, Vector3, type BufferAttribute } from 'three';
import { describe, expect, test } from 'vitest';
import { forward, right } from '../src/core/heading';
import { degToRad, ftToM } from '../src/core/units';
import { createSwayMeshes } from '../src/effects/swayMeshes';
import { createVehicleBeacons } from '../src/effects/vehicleBeacons';
import { NO_ALARMS, alarmKinds, stepAlarms } from '../src/level/alarm';
import { SWAY_RULES, stepSways, swayPose, type Sway } from '../src/level/hitSway';
import { createObstacleMeshes, type ObstacleSource } from '../src/props/obstacleMeshes';
import { createOcclusionFade } from '../src/render/occlusionFade';
import type { VehiclePose } from '../src/vehicle/bicycleModel';

const CAR = { widthFt: 6, lengthFt: 15.5 };
const SOURCE: ObstacleSource = {
  obstaclesFt: [
    { type: 'cone', centerXFt: 40, centerZFt: 40, headingDeg: 0, widthFt: 1.5, lengthFt: 1.5 },
    // 第 1 台橫在鏡頭與玩家車之間（會被淡成半透明）；第 2 台同車款，在旁邊。
    { type: 'parked_car', centerXFt: 0, centerZFt: 13, headingDeg: 90, model: 'sedan', ...CAR },
    { type: 'parked_car', centerXFt: 30, centerZFt: 0, headingDeg: 0, model: 'sedan', ...CAR },
    { type: 'delivery_van', centerXFt: -30, centerZFt: 12, headingDeg: 90, widthFt: 7, lengthFt: 20 },
    { type: 'wall', centerXFt: 0, centerZFt: -40, headingDeg: 0, widthFt: 30, lengthFt: 1 },
  ],
};
const FRAME_SECONDS = 1 / 60;
/** 玩家車在原點、車頭朝北；跟車鏡頭在車後方：第 1 台車正好擋在中間。 */
const POSE: VehiclePose = { x: 0, z: 0, headingRad: 0, steerRad: 0 };
const CAMERA = { x: 0, y: ftToM(5.5), z: ftToM(18.5) };

function build() {
  const obstacles = createObstacleMeshes(SOURCE, 'low');
  const root = new Group();
  root.add(obstacles);
  const fade = createOcclusionFade(root);
  const beacons = createVehicleBeacons(obstacles, { groundPool: false, spotLights: 0 }, false, true);
  const sways = createSwayMeshes(obstacles, SOURCE, fade.place, beacons.move);
  const instanced = (name: string): InstancedMesh => {
    const mesh = obstacles.getObjectByName(name) ?? beacons.root.getObjectByName(name);
    if (!(mesh instanceof InstancedMesh)) {
      throw new Error(`沒有 ${name}`);
    }
    return mesh;
  };
  return { obstacles, fade, beacons, sways, instanced };
}

/** 矩陣寫進實例緩衝區（32 位元浮點數）之後讀回來的值。 */
function stored(matrix: Matrix4): number[] {
  return Array.from(new Float32Array(matrix.elements));
}

function matrixAt(mesh: InstancedMesh, instance: number): Matrix4 {
  const matrix = new Matrix4();
  mesh.getMatrixAt(instance, matrix);
  return matrix;
}

/** 一撞之後過了 seconds 秒的晃動狀態（車身本地：across 往右、along 往車頭）。 */
function swayAfter(index: number, across: number, along: number, seconds: number): Sway {
  const [sway] = stepSways(stepSways([], 0, [{ index, across, along }]), seconds, []);
  if (sway === undefined) {
    throw new Error('已經停了');
  }
  return sway;
}

/** 大約第一個高點（四分之一個週期多一點）。 */
const PEAK_S = 0.25 / SWAY_RULES.frequencyHz;

describe('被撞的車晃動的畫面', () => {
  test('被撞的那一台整台一起動：車頂往被推的方向倒，車底正中央只平移那一小段；別台不動', () => {
    const { sways, instanced } = build();
    const paint = instanced('parkedCars:sedan:paint');
    const rest = instanced('parkedCars:sedan:rest');
    const before = [matrixAt(paint, 0), matrixAt(paint, 1), matrixAt(rest, 0), matrixAt(rest, 1)];
    // 第 1 台車頭朝東（+X），往它的右邊（南，+Z）推一下。
    const sway = swayAfter(1, 1, 0, PEAK_S);
    sways.update([sway]);

    const pose = swayPose(sway);
    expect(pose.leanAcrossRad).toBeGreaterThan(degToRad(5));
    const south = right(degToRad(90));
    expect(south.z).toBeCloseTo(1, 6);
    // 兩個網格的那個實例用同一個變換。
    const moved = matrixAt(paint, 0).multiply(before[0]!.clone().invert());
    const movedRest = matrixAt(rest, 0).multiply(before[2]!.clone().invert());
    moved.elements.forEach((value, at) => {
      expect(value).toBeCloseTo(movedRest.elements[at] ?? Number.NaN, 9);
    });
    // 車底正中央：只有平移（往南）。
    const pivot = new Vector3(0, 0, ftToM(13));
    const ground = pivot.clone().applyMatrix4(moved);
    expect(ground.x - pivot.x).toBeCloseTo(0, 6);
    expect(ground.y).toBeCloseTo(0, 6);
    expect(ground.z - pivot.z).toBeCloseTo(pose.shoveAcrossM, 6);
    // 車頂（5 ft 高）：再多往南倒 5 ft × sin(角度)，高度幾乎不變。
    const roof = new Vector3(0, ftToM(5), ftToM(13)).applyMatrix4(moved);
    expect(roof.z - pivot.z).toBeCloseTo(pose.shoveAcrossM + ftToM(5) * Math.sin(pose.leanAcrossRad), 6);
    expect(roof.x).toBeCloseTo(0, 6);
    // 南側的輪子往下、北側往上（整台一起傾）。
    expect(new Vector3(0, 0, ftToM(13 + 3)).applyMatrix4(moved).y).toBeLessThan(0);
    expect(new Vector3(0, 0, ftToM(13 - 3)).applyMatrix4(moved).y).toBeGreaterThan(0);
    // 旁邊那一台一個位元都沒變。
    expect(matrixAt(paint, 1).elements).toEqual(before[1]!.elements);
    expect(matrixAt(rest, 1).elements).toEqual(before[3]!.elements);
  });

  test('往車頭方向推：車頂往車頭倒（俯仰），幅度是側傾的一半', () => {
    const { sways, instanced } = build();
    const paint = instanced('parkedCars:sedan:paint');
    const before = matrixAt(paint, 1);
    const sway = swayAfter(2, 0, 1, PEAK_S);
    sways.update([sway]);
    const moved = matrixAt(paint, 1).multiply(before.clone().invert());
    // 第 2 台車頭朝北（−Z）。
    const north = forward(0);
    const pivot = new Vector3(ftToM(30), 0, 0);
    const roof = new Vector3(ftToM(30), ftToM(5), 0).applyMatrix4(moved);
    const pose = swayPose(sway);
    expect(pose.leanAlongRad).toBeGreaterThan(degToRad(2.5));
    expect(pose.leanAlongRad).toBeLessThan(degToRad(3.01));
    expect((roof.z - pivot.z) * north.z).toBeCloseTo(
      pose.shoveAlongM + ftToM(5) * Math.sin(pose.leanAlongRad),
      6,
    );
    expect(roof.x - pivot.x).toBeCloseTo(0, 6);
  });

  test('停了就放回原位，一個位元都不差（實例、車牌上的字）；之後不再動任何東西', () => {
    const { obstacles, sways, instanced } = build();
    const meshes = ['parkedCars:sedan:paint', 'parkedCars:sedan:rest'].map(instanced);
    const plates = obstacles.getObjectByName('parkedCars:plateText') as Mesh;
    const platePositions = plates.geometry.getAttribute('position') as BufferAttribute;
    const before = meshes.map((mesh) => Array.from(mesh.instanceMatrix.array));
    const platesBefore = Array.from(platePositions.array);

    sways.update([swayAfter(1, 0.7, -0.4, 0.1)]);
    expect(Array.from(meshes[0]!.instanceMatrix.array)).not.toEqual(before[0]);
    expect(Array.from(platePositions.array)).not.toEqual(platesBefore);
    sways.update([swayAfter(1, 0.7, -0.4, 0.4)]);
    sways.update([]);
    meshes.forEach((mesh, at) => {
      expect(Array.from(mesh.instanceMatrix.array)).toEqual(before[at]);
    });
    expect(Array.from(platePositions.array)).toEqual(platesBefore);

    // 沒有車在晃：不寫任何緩衝區。
    const versions = meshes.map((mesh) => mesh.instanceMatrix.version);
    const plateVersion = platePositions.version;
    sways.update([]);
    expect(meshes.map((mesh) => mesh.instanceMatrix.version)).toEqual(versions);
    expect(platePositions.version).toBe(plateVersion);
  });

  test('車牌上的字跟著那台車走，別台的字不動', () => {
    const { obstacles, sways, instanced } = build();
    const plates = obstacles.getObjectByName('parkedCars:plateText') as Mesh;
    const positions = plates.geometry.getAttribute('position') as BufferAttribute;
    const before = Float32Array.from(positions.array);
    const paint = instanced('parkedCars:sedan:paint');
    const rest = matrixAt(paint, 0);
    sways.update([swayAfter(1, 1, 0, PEAK_S)]);
    const moved = matrixAt(paint, 0).multiply(rest.clone().invert());
    let movedVertices = 0;
    const point = new Vector3();
    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      point.fromArray(before, vertex * 3);
      // 第 1 台在 z = 13 ft 附近，第 2 台在 x = 30 ft 附近。
      const mine = Math.abs(point.x) < ftToM(10);
      if (mine) {
        point.applyMatrix4(moved);
        movedVertices += 1;
      }
      expect(positions.getX(vertex)).toBeCloseTo(point.x, 5);
      expect(positions.getY(vertex)).toBeCloseTo(point.y, 5);
      expect(positions.getZ(vertex)).toBeCloseTo(point.z, 5);
    }
    expect(movedVertices).toBeGreaterThan(0);
    expect(movedVertices).toBeLessThan(positions.count);
  });

  test('貨車車身上的字樣跟著車身走，停了回到原位', () => {
    const { obstacles, sways, instanced } = build();
    const labels = obstacles.children.filter(
      (child): child is Mesh => child instanceof Mesh && child.name === 'sign',
    );
    expect(labels).toHaveLength(2);
    const van = instanced('obstacle:delivery_van');
    const vanRest = matrixAt(van, 0);
    const labelRest = labels.map((label) => label.matrix.clone());
    sways.update([swayAfter(3, -1, 0, PEAK_S)]);
    const moved = matrixAt(van, 0).multiply(vanRest.clone().invert());
    labels.forEach((label, at) => {
      const expected = moved.clone().multiply(labelRest[at]!);
      // 實例的矩陣存成 32 位元浮點數，字樣的矩陣是 64 位元：比到小數第 6 位。
      label.matrix.elements.forEach((value, element) => {
        expect(value).toBeCloseTo(expected.elements[element] ?? Number.NaN, 6);
      });
      expect(label.matrix.elements).not.toEqual(labelRest[at]!.elements);
    });
    sways.update([]);
    labels.forEach((label, at) => {
      expect(label.matrix.elements).toEqual(labelRest[at]!.elements);
    });
  });

  test('不會晃的東西（交通錐、牆）就算收到晃動也不動', () => {
    const { sways, instanced } = build();
    const cone = instanced('obstacle:cone');
    const wall = instanced('obstacle:wall');
    const versions = [cone.instanceMatrix.version, wall.instanceMatrix.version];
    sways.update([swayAfter(0, 1, 0, PEAK_S), swayAfter(4, 1, 0, PEAK_S)]);
    expect([cone.instanceMatrix.version, wall.instanceMatrix.version]).toEqual(versions);
  });

  test('亮著的警報燈跟著車身走：疊加層的實例矩陣與車身的相同', () => {
    const { beacons, sways, instanced } = build();
    const alarms = stepAlarms(NO_ALARMS, 0, [1], alarmKinds(SOURCE.obstaclesFt));
    const lamps = instanced('beacon:parked_car:sedan');
    const paint = instanced('parkedCars:sedan:paint');
    beacons.update(alarms, 'steady');
    expect(lamps.count).toBe(1);
    expect(matrixAt(lamps, 0).elements).toEqual(matrixAt(paint, 0).elements);

    sways.update([swayAfter(1, 1, 0.5, PEAK_S)]);
    beacons.update(alarms, 'steady');
    const swayed = matrixAt(paint, 0);
    expect(matrixAt(lamps, 0).elements).toEqual(swayed.elements);

    sways.update([]);
    beacons.update(alarms, 'steady');
    expect(matrixAt(lamps, 0).elements).toEqual(matrixAt(paint, 0).elements);
    expect(matrixAt(lamps, 0).elements).not.toEqual(swayed.elements);
  });

  test('正被淡成半透明的車被撞：先動替身，晃的時候淡回實心；晃完還擋著就再淡掉，實例在原位', () => {
    const { fade, sways, instanced } = build();
    const paint = instanced('parkedCars:sedan:paint');
    const rest = matrixAt(paint, 0);
    fade.update(CAMERA, POSE, true, FRAME_SECONDS);
    expect(fade.fadedCount()).toBe(1);
    const standIn = paint.children.find((child) => child instanceof Mesh);
    if (standIn === undefined) {
      throw new Error('沒有替身');
    }
    expect(matrixAt(paint, 0).elements[0]).toBe(0);

    sways.update([swayAfter(1, 1, 0, PEAK_S)]);
    // 實例還是藏著的；替身在晃。
    expect(matrixAt(paint, 0).elements[0]).toBe(0);
    expect(standIn.matrix.elements).not.toEqual(rest.elements);
    const swayed = standIn.matrix.clone();
    // 倒車輔助層的小畫面（不淡）：畫的是晃著的實例，畫完再藏回去。
    fade.drawUnfaded(() => {
      expect(matrixAt(paint, 0).elements).toEqual(stored(swayed));
    });
    expect(matrixAt(paint, 0).elements[0]).toBe(0);

    // 還擋著視線，但正在晃：淡回實心（0.2 秒），實例接著晃。
    for (let frame = 0; frame < 15; frame += 1) {
      fade.update(CAMERA, POSE, true, FRAME_SECONDS);
    }
    expect(fade.fadedCount()).toBe(0);
    expect(matrixAt(paint, 0).elements).toEqual(stored(swayed));

    // 晃完放回原位；還擋著，所以又淡掉（實例藏起來，替身在原位）。
    sways.update([]);
    expect(matrixAt(paint, 0).elements).toEqual(rest.elements);
    fade.update(CAMERA, POSE, true, FRAME_SECONDS);
    expect(fade.fadedCount()).toBe(1);
    expect(matrixAt(paint, 0).elements[0]).toBe(0);
    expect(standIn.matrix.elements).toEqual(rest.elements);
    // 不擋了：實例回到原位。
    for (let frame = 0; frame < 60; frame += 1) {
      fade.update(CAMERA, POSE, false, FRAME_SECONDS);
    }
    expect(fade.fadedCount()).toBe(0);
    expect(matrixAt(paint, 0).elements).toEqual(rest.elements);
  });

  test('正在晃的車擋住視線也不淡；鏡頭在它裡面（近平面會切開它）照樣淡，晃完、淡回來之後實例在原位', () => {
    const { fade, sways, instanced } = build();
    const paint = instanced('parkedCars:sedan:paint');
    const rest = matrixAt(paint, 0);
    sways.update([swayAfter(1, 1, 0, PEAK_S)]);
    const swayed = matrixAt(paint, 0);
    fade.update(CAMERA, POSE, true, FRAME_SECONDS);
    expect(fade.fadedCount()).toBe(0);
    expect(matrixAt(paint, 0).elements).toEqual(swayed.elements);
    // 旁邊沒在晃的車照常判定（這個鏡頭位置沒有擋到它）。
    expect(matrixAt(paint, 1).elements[0]).not.toBe(0);

    const inside = { x: 0, y: ftToM(3), z: ftToM(13) };
    fade.update(inside, POSE, true, FRAME_SECONDS);
    expect(fade.fadedCount()).toBe(1);
    expect(matrixAt(paint, 0).elements[0]).toBe(0);
    sways.update([]);
    expect(matrixAt(paint, 0).elements[0]).toBe(0);
    for (let frame = 0; frame < 60; frame += 1) {
      fade.update(CAMERA, POSE, false, FRAME_SECONDS);
    }
    expect(matrixAt(paint, 0).elements).toEqual(rest.elements);
  });
});
