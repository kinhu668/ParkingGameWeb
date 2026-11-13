// 規格第 4 節的車輛數值。調手感只改 VEHICLE_CONFIG_US；SI 版本一律由 units.ts 換算。
import { degToRad, ftToM, mphPerSToMps2, mphToMps } from '../core/units';

/** 對外的美制數值（mph、mph/s、度、度/秒、英尺）。 */
export const VEHICLE_CONFIG_US = {
  maxSpeedMph: 18,
  maxReverseSpeedMph: 9,
  accelerationMphPerS: 6,
  brakeMphPerS: 18,
  coastDecelMphPerS: 3,
  maxSteerDeg: 35,
  steerRateDegPerS: 90,
  steerReturnRateDegPerS: 120,
  wheelbaseFt: 9,
  lengthFt: 15,
  widthFt: 6,
  heightFt: 4.6,
} as const;

/** 物理與算圖用的 SI 數值（m/s、m/s²、弧度、弧度/秒、公尺）。 */
export const VEHICLE_CONFIG_SI = {
  maxSpeedMps: mphToMps(VEHICLE_CONFIG_US.maxSpeedMph),
  maxReverseSpeedMps: mphToMps(VEHICLE_CONFIG_US.maxReverseSpeedMph),
  accelerationMps2: mphPerSToMps2(VEHICLE_CONFIG_US.accelerationMphPerS),
  brakeMps2: mphPerSToMps2(VEHICLE_CONFIG_US.brakeMphPerS),
  coastDecelMps2: mphPerSToMps2(VEHICLE_CONFIG_US.coastDecelMphPerS),
  maxSteerRad: degToRad(VEHICLE_CONFIG_US.maxSteerDeg),
  steerRateRadPerS: degToRad(VEHICLE_CONFIG_US.steerRateDegPerS),
  steerReturnRateRadPerS: degToRad(VEHICLE_CONFIG_US.steerReturnRateDegPerS),
  wheelbaseM: ftToM(VEHICLE_CONFIG_US.wheelbaseFt),
  lengthM: ftToM(VEHICLE_CONFIG_US.lengthFt),
  widthM: ftToM(VEHICLE_CONFIG_US.widthFt),
  heightM: ftToM(VEHICLE_CONFIG_US.heightFt),
} as const;
