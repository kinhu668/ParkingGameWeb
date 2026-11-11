// 停車判定：計畫 11.1 的指定案例。
import { describe, expect, test } from 'vitest';
import { FIXED_STEP_SECONDS, PARKING_RULES, PHYSICS_HZ } from '../src/core/gameConfig';
import { forward, right } from '../src/core/heading';
import { degToRad, ftToM, mphToMps } from '../src/core/units';
import {
  REQUIRED_HOLD_STEPS,
  isHoldComplete,
  nextHeldSteps,
  parkingConditionsMet,
  parkingSpotFromFt,
  type ParkingSpot,
} from '../src/level/parkingJudge';
import { stepVehicle, vehicleCorners, type VehicleState } from '../src/vehicle/bicycleModel';
import { VEHICLE_CONFIG_US } from '../src/vehicle/vehicleConfig';
import { IDLE, inputsToStopAtSpotCenter } from './driveHelpers';

const SPOT_WIDTH_FT = 9;
const SPOT_LENGTH_FT = 18;
// 車位故意不放在原點，位移算錯會被抓到。
const SPOT_CENTER_X_FT = 40;
const SPOT_CENTER_Z_FT = -25;

/** 置中時車身到車位邊線的餘裕：左右 (9 − 6) / 2 = 1.5 ft，前後 (18 − 15) / 2 = 1.5 ft。 */
const SIDE_MARGIN_FT = (SPOT_WIDTH_FT - VEHICLE_CONFIG_US.widthFt) / 2;
const END_MARGIN_FT = (SPOT_LENGTH_FT - VEHICLE_CONFIG_US.lengthFt) / 2;

/** 「永遠不成功」的案例跑這麼多步（10 秒）。 */
const LONG_RUN_STEPS = 10 * PHYSICS_HZ;

/** 9×18 ft 的車位，heading 與角度容許值可指定；不給容許值就用預設 8°。 */
function spotFacing(headingDeg: number, angleToleranceDeg?: number): ParkingSpot {
  return parkingSpotFromFt({
    centerXFt: SPOT_CENTER_X_FT,
    centerZFt: SPOT_CENTER_Z_FT,
    widthFt: SPOT_WIDTH_FT,
    lengthFt: SPOT_LENGTH_FT,
    headingDeg,
    ...(angleToleranceDeg === undefined ? {} : { angleToleranceDeg }),
  });
}

interface CarPlacement {
  /** 車頭方向（度，世界座標的 heading，不是相對車位）。 */
  readonly headingDeg: number;
  /** 車身中心在車位本地座標的位置：向車位右側、向車位前方（ft）。 */
  readonly lateralFt?: number;
  readonly longitudinalFt?: number;
  readonly speedMph?: number;
}

/** 把車擺在車位本地座標的指定位置。 */
function carInSpot(spot: ParkingSpot, placement: CarPlacement): VehicleState {
  const spotRight = right(spot.headingRad);
  const spotForward = forward(spot.headingRad);
  const lateralM = ftToM(placement.lateralFt ?? 0);
  const longitudinalM = ftToM(placement.longitudinalFt ?? 0);
  return {
    x: spot.x + spotRight.x * lateralM + spotForward.x * longitudinalM,
    z: spot.z + spotRight.z * lateralM + spotForward.z * longitudinalM,
    headingRad: degToRad(placement.headingDeg),
    speedMps: mphToMps(placement.speedMph ?? 0),
    steerRad: 0,
  };
}

/** 車維持同一個狀態連續判定 steps 步，回傳最後的連續成立步數。 */
function holdFor(vehicle: VehicleState, spot: ParkingSpot, steps: number, heldSteps = 0): number {
  let held = heldSteps;
  for (let step = 0; step < steps; step += 1) {
    held = nextHeldSteps(held, vehicle, spot);
  }
  return held;
}

/** 車維持同一個狀態滿 1 秒後是否停妥。 */
function parksAfterOneSecond(vehicle: VehicleState, spot: ParkingSpot): boolean {
  return isHoldComplete(holdFor(vehicle, spot, REQUIRED_HOLD_STEPS));
}

/** 車維持同一個狀態很久（10 秒），是否有任何一步停妥。 */
function everParks(vehicle: VehicleState, spot: ParkingSpot): boolean {
  let held = 0;
  for (let step = 0; step < LONG_RUN_STEPS; step += 1) {
    held = nextHeldSteps(held, vehicle, spot);
    if (isHoldComplete(held)) {
      return true;
    }
  }
  return false;
}

describe('判定規則的數值', () => {
  test('持續時間 1 秒 @ 60 Hz = 60 個整數步', () => {
    expect(REQUIRED_HOLD_STEPS).toBe(60);
    expect(Number.isInteger(REQUIRED_HOLD_STEPS)).toBe(true);
  });

  test('parkingSpotFromFt 換成公尺與弧度；容許值預設 8°，可另外指定', () => {
    const spot = spotFacing(30);
    expect(spot.x).toBe(ftToM(SPOT_CENTER_X_FT));
    expect(spot.z).toBe(ftToM(SPOT_CENTER_Z_FT));
    expect(spot.widthM).toBe(ftToM(9));
    expect(spot.lengthM).toBe(ftToM(18));
    expect(spot.headingRad).toBe(degToRad(30));
    expect(spot.angleToleranceRad).toBe(degToRad(8));
    expect(spotFacing(30, 3).angleToleranceRad).toBe(degToRad(3));
  });
});

describe('案例 1：置中、同向、靜止', () => {
  const spot = spotFacing(0);
  const car = carInSpot(spot, { headingDeg: 0 });

  test('第 59 步未成功，第 60 步成功', () => {
    let held = 0;
    for (let step = 1; step <= 59; step += 1) {
      held = nextHeldSteps(held, car, spot);
      expect(isHoldComplete(held)).toBe(false);
    }
    expect(held).toBe(59);
    held = nextHeldSteps(held, car, spot);
    expect(held).toBe(60);
    expect(isHoldComplete(held)).toBe(true);
  });

  test('還沒開始判定（0 步）不算成功', () => {
    expect(isHoldComplete(0)).toBe(false);
  });
});

describe('案例 2、3：四角與邊線', () => {
  const spot = spotFacing(0);

  test('置中時的餘裕是左右、前後各 1.5 ft', () => {
    expect(SIDE_MARGIN_FT).toBe(1.5);
    expect(END_MARGIN_FT).toBe(1.5);
  });

  test('車身側邊剛好壓在邊線（橫移 ±1.5 ft）→ 成功', () => {
    for (const lateralFt of [SIDE_MARGIN_FT, -SIDE_MARGIN_FT]) {
      expect(parksAfterOneSecond(carInSpot(spot, { headingDeg: 0, lateralFt }), spot)).toBe(true);
    }
  });

  test('車頭／車尾剛好壓線（縱移 ±1.5 ft）→ 成功', () => {
    for (const longitudinalFt of [END_MARGIN_FT, -END_MARGIN_FT]) {
      const car = carInSpot(spot, { headingDeg: 0, longitudinalFt });
      expect(parksAfterOneSecond(car, spot)).toBe(true);
    }
  });

  test('側邊與車頭同時壓線（角落剛好在車位的角上）→ 成功', () => {
    const car = carInSpot(spot, {
      headingDeg: 0,
      lateralFt: SIDE_MARGIN_FT,
      longitudinalFt: END_MARGIN_FT,
    });
    expect(parksAfterOneSecond(car, spot)).toBe(true);
  });

  test('橫向超出一點（±1.51 ft）→ 失敗', () => {
    for (const lateralFt of [1.51, -1.51]) {
      const car = carInSpot(spot, { headingDeg: 0, lateralFt });
      expect(parkingConditionsMet(car, spot)).toBe(false);
      expect(everParks(car, spot)).toBe(false);
    }
  });

  test('縱向超出一點（±1.51 ft）→ 失敗', () => {
    for (const longitudinalFt of [1.51, -1.51]) {
      const car = carInSpot(spot, { headingDeg: 0, longitudinalFt });
      expect(parkingConditionsMet(car, spot)).toBe(false);
      expect(everParks(car, spot)).toBe(false);
    }
  });

  test('只有一個角在外也失敗', () => {
    // 車偏 5°（在 8° 容許值內）、靜止；不橫移時四角都在內，會成功。
    const turned = carInSpot(spot, { headingDeg: 5 });
    expect(parksAfterOneSecond(turned, spot)).toBe(true);

    // 同樣的角度再往右橫移 1 ft：只有右前角超出右邊線。
    const car = carInSpot(spot, { headingDeg: 5, lateralFt: 1 });
    // 車位 heading 是 0，邊線與世界座標軸平行，直接用座標數出在外的角（不經過判定的程式）。
    const outside = vehicleCorners(car).filter(
      (corner) =>
        Math.abs(corner.x - spot.x) > spot.widthM / 2 ||
        Math.abs(corner.z - spot.z) > spot.lengthM / 2,
    );
    expect(outside).toHaveLength(1);
    // vehicleCorners 的順序：左前、右前、右後、左後。
    expect(outside[0]).toEqual(vehicleCorners(car)[1]);

    expect(parkingConditionsMet(car, spot)).toBe(false);
    expect(everParks(car, spot)).toBe(false);
  });
});

describe('案例 4：夾角', () => {
  const spot = spotFacing(0);

  test('剛好 +8° 與 −8° → 成功', () => {
    expect(parksAfterOneSecond(carInSpot(spot, { headingDeg: 8 }), spot)).toBe(true);
    expect(parksAfterOneSecond(carInSpot(spot, { headingDeg: -8 }), spot)).toBe(true);
    // −8° 的另一種寫法。
    expect(parksAfterOneSecond(carInSpot(spot, { headingDeg: 352 }), spot)).toBe(true);
  });

  test('±8.01° → 失敗', () => {
    for (const headingDeg of [8.01, -8.01, 351.99]) {
      const car = carInSpot(spot, { headingDeg });
      expect(parkingConditionsMet(car, spot)).toBe(false);
      expect(everParks(car, spot)).toBe(false);
    }
  });
});

describe('案例 5：車速', () => {
  const spot = spotFacing(0);

  test('門檻是 0.5 mph', () => {
    expect(PARKING_RULES.maxSpeedMph).toBe(0.5);
  });

  test('0.49 mph 成立；倒車 −0.49 mph 也成立', () => {
    for (const speedMph of [0.49, -0.49]) {
      const car = carInSpot(spot, { headingDeg: 0, speedMph });
      expect(parkingConditionsMet(car, spot)).toBe(true);
      expect(parksAfterOneSecond(car, spot)).toBe(true);
    }
  });

  test('剛好 0.5 mph 不成立；倒車 −0.5 mph 也不成立', () => {
    for (const speedMph of [0.5, -0.5]) {
      const car = carInSpot(spot, { headingDeg: 0, speedMph });
      expect(parkingConditionsMet(car, spot)).toBe(false);
      expect(everParks(car, spot)).toBe(false);
    }
  });

  test('更快當然不成立', () => {
    for (const speedMph of [0.51, -0.51, 18, -9]) {
      const car = carInSpot(spot, { headingDeg: 0, speedMph });
      expect(parkingConditionsMet(car, spot)).toBe(false);
    }
  });
});

describe('案例 6：中斷歸零', () => {
  const spot = spotFacing(0);
  const good = carInSpot(spot, { headingDeg: 0 });

  test.each([
    ['車速超過門檻', carInSpot(spot, { headingDeg: 0, speedMph: 0.5 })],
    ['角度超過容許值', carInSpot(spot, { headingDeg: 8.01 })],
    ['一個邊出界', carInSpot(spot, { headingDeg: 0, lateralFt: 1.51 })],
  ])('成立 59 步後有一步%s → 歸零，要重新滿 60 步', (_reason, bad) => {
    let held = holdFor(good, spot, 59);
    expect(held).toBe(59);

    held = nextHeldSteps(held, bad, spot);
    expect(held).toBe(0);

    held = holdFor(good, spot, 59, held);
    expect(held).toBe(59);
    expect(isHoldComplete(held)).toBe(false);

    held = nextHeldSteps(held, good, spot);
    expect(isHoldComplete(held)).toBe(true);
  });
});

describe('案例 7：車頭反向', () => {
  const spot = spotFacing(0);

  test('車身轉 180° 佔的範圍相同：正向的 0°、−8°、+8° 都成功（對照組）', () => {
    for (const headingDeg of [0, -8, 8]) {
      expect(parksAfterOneSecond(carInSpot(spot, { headingDeg }), spot)).toBe(true);
    }
  });

  test('相差 180°、172°、188°：四角在內、靜止，仍永遠不成功', () => {
    for (const headingDeg of [180, 172, 188]) {
      const car = carInSpot(spot, { headingDeg });
      expect(parkingConditionsMet(car, spot)).toBe(false);
      expect(everParks(car, spot)).toBe(false);
      // 換成車頭該朝反方向的車位，同一台車就成功：失敗的原因只有車頭方向。
      expect(parksAfterOneSecond(car, spotFacing(180))).toBe(true);
    }
  });
});

describe('案例 8：倒車入庫', () => {
  // 車位的 heading 設成車頭該朝的方向：東（90°）。車從車位東邊倒車（往西）進來。
  const spot = spotFacing(90);
  const APPROACH_FT = 40;

  /** 照輸入逐步跑物理並判定，停下後再放開所有按鍵等 extraSteps 步。 */
  function drive(
    start: VehicleState,
    throttle: 1 | -1,
    extraSteps: number,
  ): { vehicle: VehicleState; held: number; parked: boolean; minSpeedMps: number } {
    const inputs = [
      ...inputsToStopAtSpotCenter(start, spot, throttle),
      ...Array.from({ length: extraSteps }, () => IDLE),
    ];
    let vehicle = start;
    let held = 0;
    let parked = false;
    let minSpeedMps = 0;
    for (const input of inputs) {
      vehicle = stepVehicle(vehicle, input, FIXED_STEP_SECONDS);
      held = nextHeldSteps(held, vehicle, spot);
      parked ||= isHoldComplete(held);
      minSpeedMps = Math.min(minSpeedMps, vehicle.speedMps);
    }
    return { vehicle, held, parked, minSpeedMps };
  }

  test('車頭朝車位 heading、以負速度倒入後停下 → 成功', () => {
    const start = carInSpot(spot, { headingDeg: 90, longitudinalFt: APPROACH_FT });
    const result = drive(start, -1, REQUIRED_HOLD_STEPS);
    // 真的是倒車進來的，而且停住了。
    expect(result.minSpeedMps).toBeLessThan(mphToMps(-5));
    expect(result.vehicle.speedMps).toBe(0);
    expect(result.vehicle.headingRad).toBeCloseTo(degToRad(90), 9);
    expect(result.parked).toBe(true);
  });

  test('倒入後剛停下時還沒成功，要等滿 1 秒', () => {
    const start = carInSpot(spot, { headingDeg: 90, longitudinalFt: APPROACH_FT });
    const result = drive(start, -1, 0);
    expect(result.vehicle.speedMps).toBe(0);
    expect(result.held).toBeGreaterThan(0);
    expect(result.parked).toBe(false);
  });

  test('同一個車位車頭朝反方向（車頭先進）停入 → 失敗', () => {
    // 從同一側、車頭朝西（270°）前進開進來，停在同一個位置。
    const start = carInSpot(spot, { headingDeg: 270, longitudinalFt: APPROACH_FT });
    const result = drive(start, 1, LONG_RUN_STEPS);
    expect(result.vehicle.speedMps).toBe(0);
    expect(result.held).toBe(0);
    expect(result.parked).toBe(false);
    // 位置沒問題：把車位的 heading 反過來（車頭該朝西）就會成功。
    expect(parksAfterOneSecond(result.vehicle, spotFacing(270))).toBe(true);
  });
});

describe('案例 9：跨 0° 邊界', () => {
  const spot = spotFacing(355);

  test('車位 355°、車 3°（差 8°）→ 成功', () => {
    expect(parksAfterOneSecond(carInSpot(spot, { headingDeg: 3 }), spot)).toBe(true);
  });

  test('車位 355°、車 4°（差 9°）→ 失敗', () => {
    const car = carInSpot(spot, { headingDeg: 4 });
    expect(parkingConditionsMet(car, spot)).toBe(false);
    expect(everParks(car, spot)).toBe(false);
  });

  test('另一側：車 347°（差 −8°）成功，346° 失敗', () => {
    expect(parksAfterOneSecond(carInSpot(spot, { headingDeg: 347 }), spot)).toBe(true);
    expect(everParks(carInSpot(spot, { headingDeg: 346 }), spot)).toBe(false);
  });
});

describe('案例 10：每個車位可調的角度容許值', () => {
  test('容許值 3°：3° 成功、4° 失敗', () => {
    const strict = spotFacing(0, 3);
    expect(parksAfterOneSecond(carInSpot(strict, { headingDeg: 3 }), strict)).toBe(true);
    expect(parksAfterOneSecond(carInSpot(strict, { headingDeg: -3 }), strict)).toBe(true);
    expect(everParks(carInSpot(strict, { headingDeg: 4 }), strict)).toBe(false);
    expect(everParks(carInSpot(strict, { headingDeg: -4 }), strict)).toBe(false);
  });

  test('同樣的 4° 在預設 8° 的車位成功', () => {
    const normal = spotFacing(0);
    expect(parksAfterOneSecond(carInSpot(normal, { headingDeg: 4 }), normal)).toBe(true);
  });
});

describe('案例 11：斜向車位（heading 30°）', () => {
  const spot = spotFacing(30);

  test('對正停入 → 成功', () => {
    expect(parksAfterOneSecond(carInSpot(spot, { headingDeg: 30 }), spot)).toBe(true);
  });

  test('邊線沿車位自己的方向算：壓線成功、超出 0.01 ft 失敗', () => {
    const onLines = carInSpot(spot, {
      headingDeg: 30,
      lateralFt: SIDE_MARGIN_FT,
      longitudinalFt: -END_MARGIN_FT,
    });
    expect(parksAfterOneSecond(onLines, spot)).toBe(true);

    const pastSide = carInSpot(spot, { headingDeg: 30, lateralFt: 1.51 });
    const pastEnd = carInSpot(spot, { headingDeg: 30, longitudinalFt: -1.51 });
    expect(everParks(pastSide, spot)).toBe(false);
    expect(everParks(pastEnd, spot)).toBe(false);
  });

  test('車頭朝北（0°，與車位差 30°）→ 失敗；反向 210° → 失敗', () => {
    expect(everParks(carInSpot(spot, { headingDeg: 0 }), spot)).toBe(false);
    expect(everParks(carInSpot(spot, { headingDeg: 210 }), spot)).toBe(false);
  });

  test('容許值兩端 22° 與 38° 成功，21.99° 與 38.01° 失敗', () => {
    expect(parksAfterOneSecond(carInSpot(spot, { headingDeg: 22 }), spot)).toBe(true);
    expect(parksAfterOneSecond(carInSpot(spot, { headingDeg: 38 }), spot)).toBe(true);
    expect(everParks(carInSpot(spot, { headingDeg: 21.99 }), spot)).toBe(false);
    expect(everParks(carInSpot(spot, { headingDeg: 38.01 }), spot)).toBe(false);
  });
});
