// 各環境的招牌文字（計畫 §3.2）。全部是虛構的英文名稱，不用真實商標。不 import three、不碰 DOM。
// 這裡只定資料；招牌的模型與貼圖之後由 props/ 讀這張表來畫。
import type { LevelEnvironment } from './levelSchema';

/** 一個環境的招牌文字。 */
export interface EnvironmentSigns {
  /** 主招牌（建築正面）；沒有建築的環境是 null。 */
  readonly main: string | null;
  /** 次要招牌、店面、路牌、牆上的字。 */
  readonly secondary: readonly string[];
}

export const ENVIRONMENT_SIGNS: Readonly<Record<LevelEnvironment, EnvironmentSigns>> = {
  open_lot: { main: null, secondary: [] },
  warehouse_club: {
    main: 'BULKWORTH WHOLESALE CLUB',
    secondary: ['MEMBERS ENTRANCE', 'TIRE CENTER', 'CART RETURN'],
  },
  post_office: {
    main: 'MAPLE HOLLOW POST OFFICE',
    secondary: ['MAIL', '15 MIN PARKING'],
  },
  city_street: {
    main: null,
    secondary: [
      "DELLA'S DINER",
      'CORNER BOOKS',
      'SUDS LAUNDROMAT',
      "HANK'S HARDWARE",
      'BLUE KETTLE CAFE',
      'OAK ST',
      '2 HR PARKING',
    ],
  },
  narrow_alley: {
    main: null,
    secondary: ['LOADING ZONE', 'DELIVERIES ONLY', 'NO PARKING'],
  },
};

/** 一個環境的全部招牌文字（主招牌在最前面）。 */
export function signTextsFor(environment: LevelEnvironment): readonly string[] {
  const { main, secondary } = ENVIRONMENT_SIGNS[environment];
  return main === null ? secondary : [main, ...secondary];
}
