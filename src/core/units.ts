// 全專案唯一的單位換算。內部一律公尺、秒、弧度；對外（設定、HUD、關卡）一律美制與度。
// 換算係數只准出現在這個檔案。

/** 1 ft = 0.3048 m（定義值，精確）。 */
const METERS_PER_FOOT = 0.3048;

/** 1 mph = 0.44704 m/s（定義值，精確）。mph/s → m/s² 是同一個係數。 */
const MPS_PER_MPH = 0.44704;

/** 半圈 = 180° = π rad。 */
const DEGREES_PER_HALF_TURN = 180;

/** 1 s = 1000 ms。 */
const MS_PER_SECOND = 1000;

export function ftToM(feet: number): number {
  return feet * METERS_PER_FOOT;
}

export function mToFt(meters: number): number {
  return meters / METERS_PER_FOOT;
}

export function mphToMps(mph: number): number {
  return mph * MPS_PER_MPH;
}

export function mpsToMph(metersPerSecond: number): number {
  return metersPerSecond / MPS_PER_MPH;
}

export function mphPerSToMps2(mphPerSecond: number): number {
  return mphPerSecond * MPS_PER_MPH;
}

export function mps2ToMphPerS(metersPerSecondSquared: number): number {
  return metersPerSecondSquared / MPS_PER_MPH;
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / DEGREES_PER_HALF_TURN;
}

export function radToDeg(radians: number): number {
  return (radians * DEGREES_PER_HALF_TURN) / Math.PI;
}

export function msToS(milliseconds: number): number {
  return milliseconds / MS_PER_SECOND;
}
