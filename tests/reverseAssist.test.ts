// 倒車輔助層不需要瀏覽器就能驗證的部分：何時顯示／收起、四個視口的版面、引導線的幾何與投影、
// `?assist=off`、HUD 的檔位在重來後回到前進檔。
import { Vector3 } from 'three';
import { describe, expect, test } from 'vitest';
import {
  ASSIST_VIEW_ASPECT,
  ASSIST_VIEW_IDS,
  assistLayout,
  type Rect,
} from '../src/core/assistLayout';
import {
  ASSIST_HIDDEN,
  REVERSE_ASSIST_RULES,
  nextAssistVisibility,
  type AssistDriveState,
  type AssistVisibility,
} from '../src/core/reverseAssist';
import { degToRad, mphToMps } from '../src/core/units';
import { parseAssistOffParam } from '../src/core/urlParams';
import en from '../src/locale/en.json';
import zhTW from '../src/locale/zh-TW.json';
import { rearWheelContacts } from '../src/effects/tireMarks';
import { PARTICLE_CONFIG, REVERSE_ASSIST_CONFIG } from '../src/render/renderConfig';
import { QUALITY_LEVELS } from '../src/render/quality';
import {
  ASSIST_VIEW_MIRRORED,
  createAssistCameras,
  createGuideProjector,
  placeAssistCameras,
} from '../src/render/reverseAssistViews';
import { stepVehicle, type VehicleState } from '../src/vehicle/bicycleModel';
import {
  REVERSE_GUIDE_BANDS,
  rearCameraGuides,
  reversePathGuides,
  reversePathPoint,
} from '../src/vehicle/reverseGuides';
import { VEHICLE_CONFIG_SI } from '../src/vehicle/vehicleConfig';
import { forward, right } from '../src/core/heading';

const FRAME_S = 1 / 60;
const STOPPED_FORWARD: AssistDriveState = { reverseGear: false, speedMps: 0, running: true };
const REVERSING: AssistDriveState = { reverseGear: true, speedMps: mphToMps(-4), running: true };

function run(
  start: AssistVisibility,
  drive: AssistDriveState,
  seconds: number,
): AssistVisibility {
  let state = start;
  for (let elapsed = 0; elapsed < seconds; elapsed += FRAME_S) {
    state = nextAssistVisibility(state, drive, FRAME_S);
  }
  return state;
}

describe('nextAssistVisibility：何時顯示', () => {
  test('前進檔、沒有後退：一直收著', () => {
    expect(run(ASSIST_HIDDEN, STOPPED_FORWARD, 2).opacity).toBe(0);
    expect(run(ASSIST_HIDDEN, { ...STOPPED_FORWARD, speedMps: mphToMps(12) }, 2).opacity).toBe(0);
  });

  test('掛倒檔立刻開始淡入，淡入時間約 fadeSeconds', () => {
    const first = nextAssistVisibility(ASSIST_HIDDEN, REVERSING, FRAME_S);
    expect(first.opacity).toBeGreaterThan(0);
    expect(first.opacity).toBeLessThan(1);
    expect(run(ASSIST_HIDDEN, REVERSING, REVERSE_ASSIST_RULES.fadeSeconds + 0.05).opacity).toBe(1);
  });

  test('倒檔但車還沒動（剛掛檔、或倒車中踩前進在煞車）也顯示', () => {
    expect(run(ASSIST_HIDDEN, { ...REVERSING, speedMps: 0 }, 1).opacity).toBe(1);
  });

  test('回到前進檔而且不再後退：淡出到完全收起', () => {
    const shown = run(ASSIST_HIDDEN, REVERSING, 1);
    const fading = nextAssistVisibility(shown, STOPPED_FORWARD, FRAME_S);
    expect(fading.opacity).toBeLessThan(1);
    expect(fading.opacity).toBeGreaterThan(0);
    expect(run(shown, STOPPED_FORWARD, REVERSE_ASSIST_RULES.fadeSeconds + 0.05).opacity).toBe(0);
  });

  test('前進檔被撞回來的一瞬間不顯示；持續往後溜才顯示', () => {
    const bounced: AssistDriveState = { reverseGear: false, speedMps: mphToMps(-3), running: true };
    expect(run(ASSIST_HIDDEN, bounced, REVERSE_ASSIST_RULES.rollbackHoldSeconds / 2).opacity).toBe(0);
    expect(run(ASSIST_HIDDEN, bounced, REVERSE_ASSIST_RULES.rollbackHoldSeconds + 0.5).opacity).toBe(1);
    // 中間停下來過就重新計時。
    const interrupted = run(
      run(run(ASSIST_HIDDEN, bounced, 0.3), STOPPED_FORWARD, 0.1),
      bounced,
      0.3,
    );
    expect(interrupted.opacity).toBe(0);
  });

  test('這一局結束（停妥或失敗）就收起，即使還掛著倒檔', () => {
    const shown = run(ASSIST_HIDDEN, REVERSING, 1);
    expect(run(shown, { ...REVERSING, speedMps: 0, running: false }, 1).opacity).toBe(0);
  });

  test('不透明度永遠在 0–1；時間倒退不會出錯', () => {
    expect(nextAssistVisibility(ASSIST_HIDDEN, REVERSING, 5).opacity).toBe(1);
    expect(nextAssistVisibility({ opacity: 1, rollbackSeconds: 0 }, STOPPED_FORWARD, 5).opacity).toBe(0);
    expect(nextAssistVisibility(ASSIST_HIDDEN, REVERSING, -1).opacity).toBe(0);
  });
});

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

describe('assistLayout：四個視口的版面', () => {
  const SIZES: readonly (readonly [number, number])[] = [
    [1280, 720],
    [1920, 1080],
    [2560, 1440],
    [800, 600],
    [390, 844],
    [844, 390],
  ];

  test.each(SIZES)('%i×%i：都在畫面內、互不重疊、長寬比正確', (width, height) => {
    const layout = assistLayout(width, height);
    for (const id of ASSIST_VIEW_IDS) {
      const rect = layout[id];
      expect(Number.isInteger(rect.x) && Number.isInteger(rect.y), id).toBe(true);
      expect(Number.isInteger(rect.width) && Number.isInteger(rect.height), id).toBe(true);
      expect(rect.x, id).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width, id).toBeLessThanOrEqual(width);
      expect(rect.y, id).toBeGreaterThanOrEqual(0);
      expect(rect.width, id).toBeGreaterThan(40);
      // 整數像素的捨入誤差以內。
      expect(Math.abs(rect.width / rect.height - ASSIST_VIEW_ASPECT[id]), id).toBeLessThan(0.03);
      for (const other of ASSIST_VIEW_IDS) {
        if (other !== id) {
          expect(overlaps(rect, layout[other]), `${id} × ${other}`).toBe(false);
        }
      }
    }
  });

  test('鳥瞰與倒後鏡頭在上方並排置中，後視鏡左右對稱', () => {
    const layout = assistLayout(1280, 720);
    expect(layout.bird.y).toBe(layout.rear.y);
    expect(layout.bird.height).toBe(layout.rear.height);
    expect(layout.bird.x + layout.bird.width).toBeLessThan(layout.rear.x);
    const rowCenter = (layout.bird.x + layout.rear.x + layout.rear.width) / 2;
    expect(Math.abs(rowCenter - 640)).toBeLessThanOrEqual(1);
    expect(layout.mirrorLeft.x).toBe(1280 - layout.mirrorRight.x - layout.mirrorRight.width);
    expect(layout.mirrorLeft.y).toBe(layout.mirrorRight.y);
    expect(layout.mirrorLeft.x).toBeLessThan(layout.bird.x);
  });
});

const HALF_LENGTH_M = VEHICLE_CONFIG_SI.lengthM / 2;
const HALF_WIDTH_M = VEHICLE_CONFIG_SI.widthM / 2;

describe('引導線的幾何', () => {
  test('倒後鏡頭：紅、黃、綠由近到遠相接，左右對稱，中間一條藍色虛線', () => {
    const lines = rearCameraGuides();
    expect(REVERSE_GUIDE_BANDS.map((band) => band.color)).toEqual(['red', 'yellow', 'green']);
    for (let index = 1; index < REVERSE_GUIDE_BANDS.length; index += 1) {
      expect(REVERSE_GUIDE_BANDS[index]?.fromM).toBe(REVERSE_GUIDE_BANDS[index - 1]?.toM);
    }
    for (const color of ['red', 'yellow', 'green'] as const) {
      const sides = lines.filter((line) => line.color === color);
      expect(sides).toHaveLength(2);
      const [left, right] = sides;
      expect(left?.points.map((point) => -point.lateralM)).toEqual(
        right?.points.map((point) => point.lateralM),
      );
      for (const line of sides) {
        expect(line.dashed).toBe(false);
        for (const point of line.points) {
          // 都在車尾後面的地上。
          expect(point.aheadM).toBeLessThan(-HALF_LENGTH_M);
        }
        // 邊線在車身外側。
        expect(Math.abs(line.points[0]?.lateralM ?? 0)).toBeGreaterThan(HALF_WIDTH_M);
      }
    }
    const blue = lines.filter((line) => line.color === 'blue');
    expect(blue).toHaveLength(1);
    expect(blue[0]?.dashed).toBe(true);
    expect(blue[0]?.points.every((point) => point.lateralM === 0)).toBe(true);
  });

  test('倒車軌跡：方向盤回正是直線往後', () => {
    const point = reversePathPoint({ lateralM: 0.5, aheadM: -2 }, 0, 3);
    expect(point).toEqual({ lateralM: 0.5, aheadM: -5 });
  });

  test.each([0.5, -0.5, 0.15])('倒車軌跡與物理一致（轉向角 %f rad）', (steerRad) => {
    // 真的用單車模型倒車一段，車身中心的新位置換回原本的車身座標，應該落在預測的軌跡上。
    const start: VehicleState = { x: 3, z: -2, headingRad: 0.7, speedMps: 0, steerRad };
    const speedMps = -1.5;
    const dt = 1 / 240;
    let state: VehicleState = { ...start, speedMps };
    let travelledM = 0;
    while (travelledM < 3) {
      // 直接設定車速與轉向角，不經過油門與方向盤的動態。
      const stepped = stepVehicle(state, { throttle: 0, steer: 0, handbrake: false }, dt);
      state = { ...stepped, speedMps, steerRad };
      travelledM += Math.abs(stepped.speedMps) * dt;
    }
    const ahead = forward(start.headingRad);
    const side = right(start.headingRad);
    const dx = state.x - start.x;
    const dz = state.z - start.z;
    const predicted = reversePathPoint({ lateralM: 0, aheadM: 0 }, steerRad, travelledM);
    expect(dx * side.x + dz * side.z).toBeCloseTo(predicted.lateralM, 1);
    expect(dx * ahead.x + dz * ahead.z).toBeCloseTo(predicted.aheadM, 1);
  });

  test('鳥瞰的軌跡從左右後車角出發；向右打，車尾甩向右邊', () => {
    const straight = reversePathGuides(0);
    expect(straight.every((line) => line.color === 'green')).toBe(true);
    expect(straight[0]?.points[0]).toEqual({ lateralM: -HALF_WIDTH_M, aheadM: -HALF_LENGTH_M });
    expect(straight[1]?.points[0]).toEqual({ lateralM: HALF_WIDTH_M, aheadM: -HALF_LENGTH_M });
    const turned = reversePathGuides(0.5);
    // 條數不隨方向盤變（DOM 只改每條線的點）。
    expect(turned).toHaveLength(straight.length);
    for (const line of turned.slice(0, 2)) {
      const first = line.points[0];
      const last = line.points[line.points.length - 1];
      expect(last?.lateralM ?? 0).toBeGreaterThan(first?.lateralM ?? 0);
      expect(last?.aheadM ?? 0).toBeLessThan(first?.aheadM ?? 0);
    }
    const mirrored = reversePathGuides(-0.5);
    expect(mirrored[0]?.points.at(-1)?.lateralM).toBeCloseTo(-(turned[1]?.points.at(-1)?.lateralM ?? 0));
  });
});

describe('四台鏡頭與投影', () => {
  const project = createGuideProjector();

  test('鳥瞰：車在正中央，車頭朝上、右邊在右', () => {
    const center = project('bird', { lateralM: 0, aheadM: 0 });
    expect(center.u).toBeCloseTo(0.5);
    expect(center.v).toBeCloseTo(0.5);
    expect(project('bird', { lateralM: 0, aheadM: 3 }).v).toBeLessThan(0.5);
    expect(project('bird', { lateralM: 0, aheadM: -3 }).v).toBeGreaterThan(0.5);
    expect(project('bird', { lateralM: 2, aheadM: 0 }).u).toBeGreaterThan(0.5);
    // 整台車與車後的軌跡都在畫面內。
    for (const line of [...reversePathGuides(0), ...reversePathGuides(0.3)]) {
      for (const point of line.points) {
        const { u, v } = project('bird', point);
        expect(u).toBeGreaterThan(0);
        expect(u).toBeLessThan(1);
        expect(v).toBeLessThan(1);
      }
    }
  });

  test('倒後鏡頭：左右鏡像（車的左邊在畫面左邊），遠的在上面，引導線都在畫面內', () => {
    expect(ASSIST_VIEW_MIRRORED.rear).toBe(true);
    const behind = project('rear', { lateralM: 0, aheadM: -HALF_LENGTH_M - 3 });
    expect(behind.u).toBeCloseTo(0.5);
    expect(project('rear', { lateralM: -1.5, aheadM: -HALF_LENGTH_M - 3 }).u).toBeLessThan(0.5);
    expect(project('rear', { lateralM: 1.5, aheadM: -HALF_LENGTH_M - 3 }).u).toBeGreaterThan(0.5);
    expect(project('rear', { lateralM: 0, aheadM: -HALF_LENGTH_M - 6 }).v).toBeLessThan(behind.v);
    for (const line of rearCameraGuides()) {
      for (const point of line.points) {
        const { u, v } = project('rear', point);
        expect(u).toBeGreaterThan(0);
        expect(u).toBeLessThan(1);
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  test('後視鏡：各看自己那一側的後方，車身在靠畫面中央的那一邊', () => {
    const farLeft = { lateralM: -3, aheadM: -10 };
    const farRight = { lateralM: 3, aheadM: -10 };
    const inLeft = project('mirrorLeft', farLeft);
    expect(inLeft.u).toBeGreaterThan(0);
    expect(inLeft.u).toBeLessThan(1);
    const inRight = project('mirrorRight', farRight);
    expect(inRight.u).toBeCloseTo(1 - inLeft.u);
    // 左鏡：越外側（車的左邊）越靠畫面左邊，車身那一側在右邊。
    expect(project('mirrorLeft', { lateralM: -6, aheadM: -10 }).u).toBeLessThan(inLeft.u);
    expect(project('mirrorRight', { lateralM: 6, aheadM: -10 }).u).toBeGreaterThan(inRight.u);
  });

  test('後輪旁揚起的灰塵就在同側後視鏡的畫面裡、離鏡頭很近：所以小畫面不畫灰塵', () => {
    const contacts = rearWheelContacts({ x: 0, z: 0, headingRad: 0, steerRad: 0 });
    const cameras = createAssistCameras();
    placeAssistCameras(cameras, { x: 0, z: 0, headingRad: 0, steerRad: 0 });
    const dust = PARTICLE_CONFIG.dust;
    for (const [view, contact] of [
      ['mirrorLeft', contacts.left],
      ['mirrorRight', contacts.right],
    ] as const) {
      // 灰塵從著地點上方 spawnHeightM 以內揚起，再往上飄：那個高度已經在畫面裡了。
      const puff = new Vector3(contact.x, dust.spawnHeightM, contact.z);
      const distanceM = cameras[view].position.distanceTo(puff);
      const onScreen = puff.clone().project(cameras[view]);
      expect(Math.abs(onScreen.x), view).toBeLessThan(1);
      expect(Math.abs(onScreen.y), view).toBeLessThan(1);
      // 一顆灰塵長到最大時，在這個距離就佔掉畫面高度的一半以上（窄視角）；幾顆疊起來整個畫面都是。
      const viewHeightM = 2 * distanceM * Math.tan(degToRad(REVERSE_ASSIST_CONFIG.mirror.fovDeg) / 2);
      expect(dust.endSizeM / viewHeightM, view).toBeGreaterThan(0.5);
    }
  });

  test('鏡頭跟著車的位置與朝向走', () => {
    const cameras = createAssistCameras();
    placeAssistCameras(cameras, { x: 10, z: -4, headingRad: Math.PI / 2, steerRad: 0 });
    // 車頭朝 +X：倒後鏡頭在車尾（−X 那一端）後面，後視鏡在車的左右（∓Z）。
    expect(cameras.rear.position.x).toBeLessThan(10 - HALF_LENGTH_M);
    expect(cameras.rear.position.z).toBeCloseTo(-4);
    expect(cameras.bird.position.x).toBeCloseTo(10);
    expect(cameras.bird.position.z).toBeCloseTo(-4);
    expect(cameras.mirrorLeft.position.z).toBeLessThan(-4 - HALF_WIDTH_M);
    expect(cameras.mirrorRight.position.z).toBeGreaterThan(-4 + HALF_WIDTH_M);
    expect(cameras.mirrorLeft.position.x).toBeGreaterThan(10);
  });

  test('每個畫質級別都有成本設定；low 的解析度比 high 低、每幀重畫的視口不比 high 多', () => {
    for (const level of QUALITY_LEVELS) {
      const cost = REVERSE_ASSIST_CONFIG.quality[level];
      expect(cost.resolutionScale, level).toBeGreaterThan(0);
      expect(cost.viewsPerFrame, level).toBeGreaterThanOrEqual(1);
    }
    expect(REVERSE_ASSIST_CONFIG.quality.low.resolutionScale).toBeLessThan(
      REVERSE_ASSIST_CONFIG.quality.high.resolutionScale,
    );
    expect(REVERSE_ASSIST_CONFIG.quality.low.viewsPerFrame).toBeLessThanOrEqual(
      REVERSE_ASSIST_CONFIG.quality.high.viewsPerFrame,
    );
  });
});

describe('?assist=off 與文字', () => {
  test('?assist=off 或 ?fx=off 關掉輔助層；預設是開', () => {
    expect(parseAssistOffParam('?assist=off')).toBe(true);
    expect(parseAssistOffParam('?level=w1_l05&fx=off')).toBe(true);
    for (const search of ['', '?assist', '?assist=on', '?assist=OFF', '?fx=on', '?level=w1_l05']) {
      expect(parseAssistOffParam(search), search).toBe(false);
    }
  });

  test('警告文字：英文與真車相同，中文是另一行', () => {
    expect(en['assist.warning']).toBe('Check surroundings for safety.');
    expect(zhTW['assist.warning']).toBe('請注意周圍安全。');
  });
});
