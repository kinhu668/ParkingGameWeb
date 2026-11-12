// 有邊界（bounds）的關卡，場地四周長什麼樣子：只做計算（固定種子的亂數），不建立網格、不需要 WebGL。
// 座標一律是世界座標（公尺）。規則（計畫 §6.2）：bounds 裡「看起來是實體」的東西只能來自關卡 JSON，
// 所以這裡的背景車、路燈、樹、建築全部放在 bounds 外面；bounds 裡只有平貼地面的標線與貼在牆面上的門窗招牌。
// 原型關沒有 bounds，不走這裡（仍然是 lotLayout.ts 的那座停車場）。
import { DEFAULT_SEED } from '../core/gameConfig';
import { forward } from '../core/heading';
import { createRng, type Rng } from '../core/rng';
import { degToRad, ftToM } from '../core/units';
import type { BoundsFt, ObbFt } from '../level/collision';
import { signText } from '../level/environmentSigns';
import type { LevelEnvironment } from '../level/levelSchema';
import type { ObstacleType } from '../level/obstacleTypes';
import type { PropsQualitySettings } from '../render/quality';
import { LOT_PROPS_CONFIG as LOT, SPOT_MARKING_CONFIG } from '../render/renderConfig';
import { VEHICLE_CONFIG_SI } from '../vehicle/vehicleConfig';
import { PROP_CATEGORIES, type LotLayout, type PropCategory, type PropPlacement } from './lotLayout';
import type { SignPlacement, SignStyleId } from './signs';

/** 算環境佈局要用到的關卡資料。LevelDefinition 本身就符合這個形狀。 */
export interface EnvironmentSource {
  readonly environment: LevelEnvironment;
  readonly boundsFt?: BoundsFt;
  readonly startFt: { readonly xFt: number; readonly zFt: number; readonly headingDeg: number };
  readonly spotFt: {
    readonly centerXFt: number;
    readonly centerZFt: number;
    readonly widthFt: number;
    readonly lengthFt: number;
    readonly headingDeg: number;
  };
  readonly obstaclesFt: readonly (ObbFt & { readonly type: ObstacleType })[];
}

/**
 * 一塊軸對齊的方塊（世界座標，公尺）。
 * solid：立體的東西，必須整個在 bounds 外；flat：平貼地面的標線；decal：貼在牆面上的薄片（門、捲門）。
 */
export interface EnvironmentSlab {
  readonly kind: 'solid' | 'flat' | 'decal';
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly minY: number;
  readonly maxY: number;
  readonly color: number;
}

/** 一個環境的全部擺設。 */
export interface EnvironmentLayout {
  /** 交給 createLotProps 畫的那些類別（背景車、路燈、樹、背景建築、窗、標線）。 */
  readonly lot: LotLayout;
  readonly slabs: readonly EnvironmentSlab[];
  readonly signs: readonly SignPlacement[];
}

/** bounds 的四個邊：n = −Z、s = +Z、w = −X、e = +X。 */
type Side = 'n' | 's' | 'w' | 'e';
const SIDES: readonly Side[] = ['n', 's', 'w', 'e'];

/** 貼在牆上的薄片凸出牆面多少（英尺）。 */
export const DECAL_DEPTH_FT = 0.12;
/** 邊界路緣的寬度（與 obstacleMeshes 的停車場邊界相同）。 */
const CURB_FT = 4;
const STALL_WIDTH_FT = 9;
const STALL_LENGTH_FT = 18;
/** 假車位那一列離 bounds 邊緣多遠（中間是路緣與路燈）。 */
const STALL_ROW_OUT_FT = 7;
const LAMP_OUT_FT = 5.6;

/** 一個邊上的座標系：along 沿著邊、out 往外。 */
interface SideFrame {
  readonly side: Side;
  /** 沿邊的範圍（英尺）。 */
  readonly from: number;
  readonly to: number;
  /** 朝 bounds 裡面看的方向（heading，度）。 */
  readonly inwardDeg: number;
  /** (along, out) → 世界座標（英尺）。 */
  point(along: number, out: number): { x: number; z: number };
}

function sideFrame(bounds: BoundsFt, side: Side): SideFrame {
  switch (side) {
    case 'n':
      return {
        side,
        from: bounds.minXFt,
        to: bounds.maxXFt,
        inwardDeg: 180,
        point: (along, out) => ({ x: along, z: bounds.minZFt - out }),
      };
    case 's':
      return {
        side,
        from: bounds.minXFt,
        to: bounds.maxXFt,
        inwardDeg: 0,
        point: (along, out) => ({ x: along, z: bounds.maxZFt + out }),
      };
    case 'w':
      return {
        side,
        from: bounds.minZFt,
        to: bounds.maxZFt,
        inwardDeg: 90,
        point: (along, out) => ({ x: bounds.minXFt - out, z: along }),
      };
    case 'e':
      return {
        side,
        from: bounds.minZFt,
        to: bounds.maxZFt,
        inwardDeg: 270,
        point: (along, out) => ({ x: bounds.maxXFt + out, z: along }),
      };
  }
}

/** 車一開始面對的那一邊：主建築蓋在那裡，一進場就看得到。 */
export function facingSide(headingDeg: number): Side {
  const ahead = forward(degToRad(headingDeg));
  if (Math.abs(ahead.x) > Math.abs(ahead.z)) {
    return ahead.x > 0 ? 'e' : 'w';
  }
  return ahead.z > 0 ? 's' : 'n';
}

/** 收集擺設的小工具：全部用英尺下筆，存成公尺。 */
class Builder {
  readonly lot: Record<PropCategory, PropPlacement[]>;
  readonly slabs: EnvironmentSlab[] = [];
  readonly signs: SignPlacement[] = [];

  constructor() {
    const lot = {} as Record<PropCategory, PropPlacement[]>;
    for (const category of PROP_CATEGORIES) {
      lot[category] = [];
    }
    this.lot = lot;
  }

  /** 軸對齊方塊：兩個對角（英尺）與高度範圍。 */
  slab(
    kind: EnvironmentSlab['kind'],
    a: { x: number; z: number },
    b: { x: number; z: number },
    minY: number,
    maxY: number,
    color: number,
  ): void {
    this.slabs.push({
      kind,
      minX: ftToM(Math.min(a.x, b.x)),
      maxX: ftToM(Math.max(a.x, b.x)),
      minZ: ftToM(Math.min(a.z, b.z)),
      maxZ: ftToM(Math.max(a.z, b.z)),
      minY: ftToM(minY),
      maxY: ftToM(maxY),
      color,
    });
  }

  /** 邊上的方塊：沿邊 [a0, a1]、往外 [o0, o1]。 */
  sideSlab(
    kind: EnvironmentSlab['kind'],
    frame: SideFrame,
    a0: number,
    a1: number,
    o0: number,
    o1: number,
    minY: number,
    maxY: number,
    color: number,
  ): void {
    this.slab(kind, frame.point(a0, o0), frame.point(a1, o1), minY, maxY, color);
  }

  /** 交給 createLotProps 的擺設（中心、大小都是英尺；朝向是度）。 */
  prop(
    category: PropCategory,
    at: { x: number; z: number },
    size: { x: number; y: number; z: number },
    headingDeg = 0,
    variant = 0,
    y = 0,
  ): void {
    this.lot[category].push({
      x: ftToM(at.x),
      z: ftToM(at.z),
      y: ftToM(y),
      headingRad: degToRad(headingDeg),
      sizeX: ftToM(size.x),
      sizeY: ftToM(size.y),
      sizeZ: ftToM(size.z),
      variant,
    });
  }

  /** 牆面上的一片玻璃（窗、店面、門）：亮度 0 = 沒開燈。沿邊 [a0, a1]、高 [y0, y1]，貼在 out 這個距離的牆面上。 */
  glass(frame: SideFrame, a0: number, a1: number, out: number, y0: number, y1: number, brightness: number): void {
    const acrossX = frame.side === 'n' || frame.side === 's';
    const widthFt = Math.abs(a1 - a0);
    const thicknessFt = 2 * DECAL_DEPTH_FT;
    this.prop(
      'windows',
      frame.point((a0 + a1) / 2, out),
      acrossX ? { x: widthFt, y: y1 - y0, z: thicknessFt } : { x: thicknessFt, y: y1 - y0, z: widthFt },
      0,
      brightness,
      y0,
    );
  }

  /** 牆面上的招牌：沿邊的中心、牆面的 out、牌面中心的高度。字朝 bounds 裡面。 */
  sign(
    frame: SideFrame,
    text: string,
    style: SignStyleId,
    along: number,
    out: number,
    y: number,
    width: number,
    height: number,
    glow = 0,
  ): void {
    const at = frame.point(along, out - DECAL_DEPTH_FT - 0.05);
    this.signs.push({
      text,
      style,
      x: ftToM(at.x),
      y: ftToM(y),
      z: ftToM(at.z),
      facingRad: degToRad(frame.inwardDeg),
      widthM: ftToM(width),
      heightM: ftToM(height),
      glow,
    });
  }

  /** 立在人行道上的告示牌：一根桿子＋一塊朝 facingDeg 的牌子。 */
  poleSign(
    at: { x: number; z: number },
    text: string,
    style: SignStyleId,
    facingDeg: number,
    width: number,
    height: number,
    topY: number,
  ): void {
    const half = 0.12;
    this.slab('solid', { x: at.x - half, z: at.z - half }, { x: at.x + half, z: at.z + half }, 0, topY, 0x4b4f55);
    const ahead = forward(degToRad(facingDeg));
    this.signs.push({
      text,
      style,
      x: ftToM(at.x + ahead.x * (half + 0.05)),
      y: ftToM(topY - height / 2),
      z: ftToM(at.z + ahead.z * (half + 0.05)),
      facingRad: degToRad(facingDeg),
      widthM: ftToM(width),
      heightM: ftToM(height),
      glow: 0,
    });
  }
}

const CAR_SIZE_FT = {
  x: VEHICLE_CONFIG_SI.widthM / ftToM(1),
  y: VEHICLE_CONFIG_SI.heightM / ftToM(1),
  z: VEHICLE_CONFIG_SI.lengthM / ftToM(1),
};
const LAMP_SIZE_FT = {
  x: (2 * LOT.lampPoleRadiusM) / ftToM(1),
  y: LOT.lampHeightM / ftToM(1),
  z: (2 * LOT.lampPoleRadiusM) / ftToM(1),
};
const LINE_WIDTH_FT = SPOT_MARKING_CONFIG.lineWidthM / ftToM(1);
const LINE_LIFT_FT = SPOT_MARKING_CONFIG.liftM / ftToM(1);
const LINE_HEIGHT_FT = LOT.stallLineHeightM / ftToM(1);

/** 平貼地面的一條白線（世界座標的矩形，英尺）。 */
function groundLine(builder: Builder, a: { x: number; z: number }, b: { x: number; z: number }): void {
  builder.prop(
    'stallLines',
    { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
    { x: Math.abs(b.x - a.x), y: LINE_HEIGHT_FT, z: Math.abs(b.z - a.z) },
    0,
    0,
    LINE_LIFT_FT,
  );
}

/** 一個邊外面的一列假車位＋背景車。每個車位抽一樣多次亂數，數量變了位置也不變。 */
function addStallRow(builder: Builder, frame: SideFrame, rng: Rng, occupancy: number): void {
  const count = Math.max(1, Math.floor((frame.to - frame.from) / STALL_WIDTH_FT));
  const first = (frame.from + frame.to) / 2 - (count * STALL_WIDTH_FT) / 2;
  const near = STALL_ROW_OUT_FT;
  const far = STALL_ROW_OUT_FT + STALL_LENGTH_FT;
  for (let index = 0; index <= count; index += 1) {
    const along = first + index * STALL_WIDTH_FT;
    const a = frame.point(along - LINE_WIDTH_FT / 2, near);
    const b = frame.point(along + LINE_WIDTH_FT / 2, far);
    groundLine(builder, a, b);
    if (index === count) {
      break;
    }
    const parked = rng() < occupancy;
    const lateral = (rng() * 2 - 1) * 0.45;
    const lengthwise = (rng() * 2 - 1) * 0.7;
    const noseOut = rng() < 0.3;
    const skew = (rng() * 2 - 1) * 2.5;
    const variant = rng();
    if (parked) {
      builder.prop(
        'parkedCars',
        frame.point(along + STALL_WIDTH_FT / 2 + lateral, (near + far) / 2 + lengthwise),
        CAR_SIZE_FT,
        frame.inwardDeg + (noseOut ? 180 : 0) + skew,
        variant,
      );
    }
  }
  // 車位後面一條橫線，把整列收起來。
  const end0 = frame.point(first, far);
  const end1 = frame.point(first + count * STALL_WIDTH_FT, far + LINE_WIDTH_FT);
  groundLine(builder, end0, end1);
}

/** 一個邊外面、路緣旁的路燈：燈臂朝 bounds 裡面，光落在邊界內側。 */
function addLamps(builder: Builder, frame: SideFrame, spacingFt: number, out = LAMP_OUT_FT): void {
  const length = frame.to - frame.from;
  const count = Math.max(1, Math.round(length / spacingFt));
  for (let index = 0; index < count; index += 1) {
    const along = frame.from + ((index + 0.5) / count) * length;
    builder.prop('lamps', frame.point(along, out), LAMP_SIZE_FT, frame.inwardDeg);
  }
}

/** 一個邊外面的一排樹。 */
function addTrees(builder: Builder, frame: SideFrame, rng: Rng, out: number, spacingFt: number, crownFt = 13): void {
  const length = frame.to - frame.from + 40;
  const count = Math.max(1, Math.round(length / spacingFt));
  for (let index = 0; index < count; index += 1) {
    const along = frame.from - 20 + ((index + 0.5) / count) * length + (rng() * 2 - 1) * 4;
    const crown = crownFt + 5 * rng();
    builder.prop(
      'trees',
      frame.point(along, out + 3 * rng()),
      { x: crown, y: crown + 5 + 6 * rng(), z: crown },
      rng() * 360,
      rng(),
    );
  }
}

/** 建築某一面牆上的一格一格的窗（樓層從 firstFloorY 往上）。 */
function addWindowGrid(
  builder: Builder,
  frame: SideFrame,
  a0: number,
  a1: number,
  out: number,
  firstFloorY: number,
  topY: number,
  rng: Rng,
): void {
  const spacing = LOT.buildingWindowSpacingM / ftToM(1);
  const floorHeight = LOT.buildingFloorHeightM / ftToM(1);
  const windowWidth = LOT.buildingWindowSizeM.x / ftToM(1);
  const windowHeight = LOT.buildingWindowSizeM.y / ftToM(1);
  const columns = Math.floor((a1 - a0 - 0.5 * spacing) / spacing);
  const floors = Math.floor((topY - firstFloorY - 0.2 * floorHeight) / floorHeight);
  for (let floor = 0; floor < floors; floor += 1) {
    for (let column = 0; column < columns; column += 1) {
      const center = (a0 + a1) / 2 + (column - (columns - 1) / 2) * spacing;
      const lit = rng() < LOT.buildingWindowLitChance;
      const brightness = lit ? 0.55 + 0.45 * rng() : 0;
      const y = firstFloorY + (floor + 0.3) * floorHeight;
      builder.glass(frame, center - windowWidth / 2, center + windowWidth / 2, out, y, y + windowHeight, brightness);
    }
  }
}

/** 遠處的背景建築（灰色的方塊＋窗），蓋在某一邊外面。 */
function addBackdropBuildings(builder: Builder, frame: SideFrame, rng: Rng, out: number): void {
  const acrossX = frame.side === 'n' || frame.side === 's';
  const middle = (frame.from + frame.to) / 2;
  for (const offset of [-55, 45]) {
    const width = 50 + 20 * rng();
    const depth = 45 + 15 * rng();
    const height = 30 + 26 * rng();
    const center = middle + offset + (rng() * 2 - 1) * 10;
    const near = out + 25 * rng();
    builder.prop(
      'buildings',
      frame.point(center, near + depth / 2),
      acrossX ? { x: width, y: height, z: depth } : { x: depth, y: height, z: width },
      0,
      rng(),
    );
    addWindowGrid(builder, frame, center - width / 2, center + width / 2, near, 0, height, rng);
  }
}

/** 停車場類的環境共用：主建築以外的每一邊是一列假車位、背景車、路燈、樹與遠處的建築。 */
function addLotSurroundings(
  builder: Builder,
  bounds: BoundsFt,
  rng: Rng,
  buildingSide: Side | undefined,
  occupancy: number,
): void {
  for (const side of SIDES) {
    const frame = sideFrame(bounds, side);
    addLamps(builder, frame, 46);
    if (side === buildingSide) {
      continue;
    }
    addStallRow(builder, frame, rng, occupancy);
    addTrees(builder, frame, rng, STALL_ROW_OUT_FT + STALL_LENGTH_FT + 10, 34);
    addBackdropBuildings(builder, frame, rng, 85);
  }
}

const CLUB = {
  wall: 0xcfc8b8,
  portal: 0xdcd6c6,
  teal: 0x1f8f8a,
  orange: 0xe8822a,
  walkway: 0xbdb8ad,
  bayDoor: 0x4a5056,
} as const;

/** 大賣場：米灰色的大箱型建築、青綠＋橘色腰帶、凸出來的入口門廊與主招牌。 */
function addWarehouseClub(builder: Builder, frame: SideFrame): void {
  const facade = 16;
  const height = 30;
  const center = (frame.from + frame.to) / 2;
  const half = Math.max((frame.to - frame.from) / 2 + 55, 95);
  builder.sideSlab('solid', frame, center - half, center + half, CURB_FT, facade, 0, 0.45, CLUB.walkway);
  builder.sideSlab('solid', frame, center - half, center + half, facade, facade + 120, 0, height, CLUB.wall);
  // 腰帶：青綠一條、下面一條橘色細帶。
  builder.sideSlab('solid', frame, center - half, center + half, facade - 0.3, facade, 21.5, 25, CLUB.teal);
  builder.sideSlab('solid', frame, center - half, center + half, facade - 0.35, facade, 19.8, 20.9, CLUB.orange);
  // 入口門廊：比牆面高一點、凸出來。
  const portalHalf = 24;
  const portalFace = facade - 5;
  builder.sideSlab('solid', frame, center - portalHalf, center + portalHalf, portalFace, facade, 0, 36, CLUB.portal);
  builder.sideSlab('solid', frame, center - portalHalf, center + portalHalf, portalFace - 0.3, portalFace, 33, 36, CLUB.teal);
  builder.sideSlab('solid', frame, center - portalHalf, center + portalHalf, portalFace - 0.3, portalFace, 13.2, 14.2, CLUB.orange);
  builder.glass(frame, center - 10, center + 10, portalFace, 0.4, 9.2, 0.95);
  builder.sign(frame, signText('warehouse_club', 'BULKWORTH WHOLESALE CLUB'), 'club', center, portalFace, 24, 44, 7.6, 0.85);
  builder.sign(frame, signText('warehouse_club', 'MEMBERS ENTRANCE'), 'clubMinor', center, portalFace, 11.2, 20, 2.4, 0.35);
  // 輪胎中心：門廊旁邊三個捲門。
  const tire = center + 58;
  for (const offset of [-13, 0, 13]) {
    builder.sideSlab('solid', frame, tire + offset - 5.5, tire + offset + 5.5, facade - 0.2, facade, 0, 11, CLUB.bayDoor);
  }
  builder.sign(frame, signText('warehouse_club', 'TIRE CENTER'), 'clubMinor', tire, facade, 15.5, 22, 3.2, 0.3);
}

const POSTAL = { brick: 0x9a5a44, cream: 0xe9e2cf, green: 0x1f5b3a, walkway: 0xc2bdb1 } as const;

/** 郵局：磚造的小建築、米白色的橫額、深綠色的飾帶與雨遮；門口一個大投遞箱與限時停車告示。 */
function addPostOffice(builder: Builder, frame: SideFrame): void {
  const facade = 14;
  const height = 19;
  const center = (frame.from + frame.to) / 2;
  const half = 33;
  const walkHalf = Math.max((frame.to - frame.from) / 2 + 20, half + 10);
  builder.sideSlab('solid', frame, center - walkHalf, center + walkHalf, CURB_FT, facade, 0, 0.45, POSTAL.walkway);
  builder.sideSlab('solid', frame, center - half, center + half, facade, facade + 42, 0, height, POSTAL.brick);
  builder.sideSlab('solid', frame, center - half - 0.5, center + half + 0.5, facade - 0.4, facade, 11.6, height + 1.2, POSTAL.cream);
  builder.sideSlab('solid', frame, center - half - 0.5, center + half + 0.5, facade - 0.5, facade, 10.8, 11.6, POSTAL.green);
  builder.sign(frame, signText('post_office', 'MAPLE HOLLOW POST OFFICE'), 'postal', center, facade - 0.4, 15.8, 50, 6.6, 0.7);
  // 門與雨遮、兩側的窗。
  builder.glass(frame, center - 4, center + 4, facade, 0.4, 8.2, 0.9);
  builder.sideSlab('solid', frame, center - 6.5, center + 6.5, facade - 3.5, facade, 8.8, 9.5, POSTAL.green);
  for (const side of [-1, 1]) {
    builder.glass(frame, center + side * 12, center + side * 24, facade, 3, 8.6, side > 0 ? 0.75 : 0.5);
  }
  // 門口的大投遞箱（在 bounds 外的人行道上）。
  const box0 = frame.point(center - 9.5, facade - 2.4);
  const box1 = frame.point(center - 6.5, facade - 0.4);
  builder.slab('solid', box0, box1, 0, 4.4, POSTAL.green);
  builder.sign(frame, signText('post_office', 'MAIL'), 'mail', center - 8, facade - 2.4 + DECAL_DEPTH_FT, 3.2, 2.4, 1);
  builder.poleSign(
    frame.point(center + 18, CURB_FT + 1.2),
    signText('post_office', '15 MIN PARKING'),
    'notice',
    frame.inwardDeg,
    3,
    2.2,
    7.2,
  );
}

const STREET = {
  sidewalk: 0xb3afa4,
  yellow: 0xd6b23a,
  shops: [0x8c4a3c, 0xcdbf9f, 0x5f7480, 0x9b8468, 0x6f7f5c, 0xa1543a, 0x7a6a8a],
  awnings: [0x1f5b3a, 0x8f2a22, 0x27566b, 0xb9772a, 0x3b3a36],
} as const;
const SHOP_SIGN_STYLES: readonly SignStyleId[] = ['shopA', 'shopB', 'shopC', 'shopD', 'shopE'];
const SIDEWALK_FT = 14;
/** 街道往 bounds 兩端之外延伸多遠。 */
const STREET_OVERRUN_FT = 70;

/**
 * 街道：bounds 是一段沿 X 的馬路。兩旁是人行道與一整排店面，路面有黃色中線、
 * 路邊停車格的白線（依目標車位與 JSON 裡的停放車輛畫格子），人行道上有路燈、行道樹與路牌。
 */
function addCityStreet(builder: Builder, source: EnvironmentSource, bounds: BoundsFt, rng: Rng): void {
  const fromX = bounds.minXFt - STREET_OVERRUN_FT;
  const toX = bounds.maxXFt + STREET_OVERRUN_FT;
  const shopNames = ["DELLA'S DINER", 'CORNER BOOKS', 'SUDS LAUNDROMAT', "HANK'S HARDWARE", 'BLUE KETTLE CAFE'].map(
    (name) => signText('city_street', name),
  );
  let nextName = 0;
  for (const side of ['n', 's'] as const) {
    const frame = sideFrame(bounds, side);
    // 人行道：bounds 的路緣外面那一段，再加上 bounds 兩端之外的路緣。
    builder.sideSlab('solid', frame, fromX, toX, CURB_FT, SIDEWALK_FT, 0, 0.48, STREET.sidewalk);
    builder.sideSlab('solid', frame, fromX, bounds.minXFt - CURB_FT, 0, CURB_FT, 0, 0.5, STREET.sidewalk);
    builder.sideSlab('solid', frame, bounds.maxXFt + CURB_FT, toX, 0, CURB_FT, 0, 0.5, STREET.sidewalk);
    // 店面：一棟接一棟，寬度、高度、顏色各自不同。靠近中間的幾間掛招牌。
    let x = fromX;
    const namesHere = side === 'n' ? 3 : 2;
    let named = 0;
    while (x < toX - 12) {
      const width = Math.min(26 + 14 * rng(), toX - x);
      const height = 24 + Math.floor(rng() * 3) * 7;
      const color = STREET.shops[Math.floor(rng() * STREET.shops.length)] ?? STREET.shops[0];
      const awning = STREET.awnings[Math.floor(rng() * STREET.awnings.length)] ?? STREET.awnings[0];
      const lit = 0.6 + 0.4 * rng();
      builder.sideSlab('solid', frame, x + 0.3, x + width - 0.3, SIDEWALK_FT, SIDEWALK_FT + 45, 0, height, color);
      // 一樓：左邊的門、右邊的大櫥窗；上面一條雨遮。
      builder.glass(frame, x + 3, x + 6.6, SIDEWALK_FT, 0.5, 8, lit * 0.7);
      builder.glass(frame, x + 8.5, x + width - 3, SIDEWALK_FT, 2.2, 8.6, lit);
      builder.sideSlab('solid', frame, x + 1.5, x + width - 1.5, SIDEWALK_FT - 3, SIDEWALK_FT, 9.6, 10.2, awning);
      addWindowGrid(builder, frame, x + 1, x + width - 1, SIDEWALK_FT, 13.5, height, rng);
      const center = x + width / 2;
      if (named < namesHere && center > bounds.minXFt + 8 + (side === 'n' ? 0 : 12) && center < bounds.maxXFt && nextName < shopNames.length) {
        const text = shopNames[nextName] ?? '';
        builder.sign(
          frame,
          text,
          SHOP_SIGN_STYLES[nextName % SHOP_SIGN_STYLES.length] ?? 'shopA',
          center,
          SIDEWALK_FT,
          12,
          Math.min(width - 5, 24),
          2.7,
          0.45,
        );
        nextName += 1;
        named += 1;
      }
      x += width;
    }
    addLamps(builder, { ...frame, from: fromX + (side === 'n' ? 0 : 30), to: toX }, 62, 6);
    addTrees(builder, { ...frame, from: frame.from + (side === 'n' ? 25 : -5), to: frame.to - 20 }, rng, 9.5, 58, 7);
  }

  // 路面標線。目標車位在路的哪一側，就在那一側畫路邊停車格。
  const spot = source.spotFt;
  const middleZ = (bounds.minZFt + bounds.maxZFt) / 2;
  const toward = spot.centerZFt > middleZ ? 1 : -1;
  const curbZ = toward > 0 ? bounds.maxZFt : bounds.minZFt;
  const farCurbZ = toward > 0 ? bounds.minZFt : bounds.maxZFt;
  // 平行停車：車位的「寬」垂直於路。停車帶的內緣線。
  const laneZ = spot.centerZFt - (toward * spot.widthFt) / 2;
  groundLine(builder, { x: fromX, z: laneZ - LINE_WIDTH_FT / 2 }, { x: toX, z: laneZ + LINE_WIDTH_FT / 2 });
  // 格線：相鄰兩台（或車位）的中點各一條，頭尾再各一條。
  const bays = [
    { center: spot.centerXFt, half: spot.lengthFt / 2 },
    ...source.obstaclesFt
      .filter((obstacle) => obstacle.type === 'parked_car' && (obstacle.centerZFt - laneZ) * toward > 0)
      .map((car) => ({ center: car.centerXFt, half: car.lengthFt / 2 + 2 })),
  ].sort((a, b) => a.center - b.center);
  const ticks: number[] = [];
  bays.forEach((bay, index) => {
    const previous = bays[index - 1];
    ticks.push(previous === undefined ? bay.center - bay.half : (previous.center + previous.half + bay.center - bay.half) / 2);
    if (index === bays.length - 1) {
      ticks.push(bay.center + bay.half);
    }
  });
  for (const tick of ticks) {
    groundLine(builder, { x: tick - LINE_WIDTH_FT / 2, z: laneZ }, { x: tick + LINE_WIDTH_FT / 2, z: curbZ });
  }
  // 黃色的虛線中線：行車的那一段路面的中間。
  const centerZ = (farCurbZ + laneZ) / 2;
  for (let x = fromX + 5; x + 10 <= toX; x += 30) {
    builder.slab(
      'flat',
      { x, z: centerZ - LINE_WIDTH_FT / 2 },
      { x: x + 10, z: centerZ + LINE_WIDTH_FT / 2 },
      LINE_LIFT_FT,
      LINE_LIFT_FT + LINE_HEIGHT_FT,
      STREET.yellow,
    );
  }
  // 路牌：起點那一端的人行道上；限時停車的牌子在停車帶旁邊。
  const startSide = source.startFt.xFt < (bounds.minXFt + bounds.maxXFt) / 2 ? -1 : 1;
  builder.poleSign(
    { x: startSide < 0 ? bounds.minXFt + 22 : bounds.maxXFt - 22, z: farCurbZ - toward * (CURB_FT + 1.5) },
    signText('city_street', 'OAK ST'),
    'street',
    startSide < 0 ? 270 : 90,
    4.6,
    1.3,
    10.5,
  );
  builder.poleSign(
    { x: spot.centerXFt + spot.lengthFt / 2 + 1.5, z: curbZ + toward * (CURB_FT + 1.2) },
    signText('city_street', '2 HR PARKING'),
    'notice',
    toward > 0 ? 0 : 180,
    2.8,
    2.3,
    7.6,
  );
}

const ALLEY = {
  doors: [0x5a3326, 0x2f4a3a, 0x3d4650],
  rollUp: 0x9aa0a4,
  rollUpRib: 0x80868a,
  yellow: 0xd6b23a,
  roofUnit: 0x8b9094,
} as const;

/** 點 (x, z) 有沒有落在某一面 JSON 牆裡（英尺；牆都是軸對齊的）。 */
function insideWall(source: EnvironmentSource, x: number, z: number): boolean {
  return source.obstaclesFt.some((obstacle) => {
    if (obstacle.type !== 'wall') {
      return false;
    }
    const quarterTurn = Math.abs(Math.round(obstacle.headingDeg / 90)) % 2 === 1;
    const halfX = (quarterTurn ? obstacle.lengthFt : obstacle.widthFt) / 2;
    const halfZ = (quarterTurn ? obstacle.widthFt : obstacle.lengthFt) / 2;
    return Math.abs(x - obstacle.centerXFt) <= halfX && Math.abs(z - obstacle.centerZFt) <= halfZ;
  });
}

/**
 * 窄巷：bounds 的四面就是兩旁的建築（obstacleMeshes 畫成很高的磚牆）。這裡補上牆面上的後門、窗、
 * 卸貨口的捲門與招牌、屋頂上的設備、伸到巷子上方的壁燈，以及地上的黃色邊線。
 */
function addNarrowAlley(builder: Builder, source: EnvironmentSource, bounds: BoundsFt, rng: Rng): void {
  const spot = source.spotFt;
  // 車位的車尾朝向的那一面牆是卸貨口。
  const dockSide = facingSide(spot.headingDeg + 180);
  for (const side of SIDES) {
    const frame = sideFrame(bounds, side);
    const visible = (along: number): boolean => {
      const inside = frame.point(along, -0.5);
      return !insideWall(source, inside.x, inside.z);
    };
    const dockAlong = side === 'n' || side === 's' ? spot.centerXFt : spot.centerZFt;
    // 沿牆每隔一段擺一樣東西：後門、窗、窗、後門…；被 JSON 的牆擋住的那一段不擺。
    let slot = 0;
    for (let along = frame.from + 7; along <= frame.to - 7; along += 15, slot += 1) {
      const lit = rng() < 0.45 ? 0.5 + 0.5 * rng() : 0;
      const doorColor = ALLEY.doors[Math.floor(rng() * ALLEY.doors.length)] ?? ALLEY.doors[0];
      if (!visible(along) || (side === dockSide && Math.abs(along - dockAlong) < 12)) {
        continue;
      }
      if (slot % 3 === 0) {
        builder.sideSlab('decal', frame, along - 1.8, along + 1.8, -DECAL_DEPTH_FT, 0, 0, 7.2, doorColor);
        builder.glass(frame, along - 0.6, along + 0.6, 0, 8, 8.6, 1);
      } else {
        builder.glass(frame, along - 2.2, along + 2.2, 0, 10.5, 15, lit);
      }
    }
    // 壁燈：桿子藏在建築裡，燈頭伸到巷子上方。
    addLamps(builder, frame, 34, 2.5);
    // 地上的黃色邊線（沿著看得到的牆腳）。
    for (let along = frame.from; along < frame.to; along += 6) {
      if (visible(along + 3)) {
        builder.sideSlab('flat', frame, along, Math.min(along + 6, frame.to), -1.2, -1.2 + LINE_WIDTH_FT, LINE_LIFT_FT, LINE_LIFT_FT + LINE_HEIGHT_FT, ALLEY.yellow);
      }
    }
    // 屋頂上的設備（從上面看才看得到）。
    for (const offset of [0.25, 0.7]) {
      const along = frame.from + (frame.to - frame.from) * offset;
      builder.sideSlab('solid', frame, along - 4, along + 4, 10 + 6 * rng(), 18 + 6 * rng(), 20, 29, ALLEY.roofUnit);
    }
    if (side === dockSide) {
      // 卸貨口：一扇大捲門＋橫紋，上面是 LOADING ZONE。
      builder.sideSlab('decal', frame, dockAlong - 6, dockAlong + 6, -DECAL_DEPTH_FT, 0, 0, 11, ALLEY.rollUp);
      for (let rib = 1; rib <= 6; rib += 1) {
        builder.sideSlab('decal', frame, dockAlong - 6, dockAlong + 6, -DECAL_DEPTH_FT - 0.03, 0, rib * 1.55, rib * 1.55 + 0.18, ALLEY.rollUpRib);
      }
      builder.sign(frame, signText('narrow_alley', 'LOADING ZONE'), 'alley', dockAlong, 0, 13, 13, 2.1, 0.3);
      const besideDock = dockAlong + 16 <= frame.to - 6 ? dockAlong + 16 : dockAlong - 16;
      if (visible(besideDock)) {
        builder.sign(frame, signText('narrow_alley', 'DELIVERIES ONLY'), 'notice', besideDock, 0, 8.4, 9, 1.6, 0.2);
      }
    }
  }
  // NO PARKING：起點前方、巷子兩側的牆上各一塊。
  const start = source.startFt;
  const ahead = forward(degToRad(start.headingDeg));
  const alongZ = Math.abs(ahead.z) >= Math.abs(ahead.x);
  const reach = 34;
  for (const side of alongZ ? (['w', 'e'] as const) : (['n', 's'] as const)) {
    const frame = sideFrame(bounds, side);
    const along = alongZ ? start.zFt + ahead.z * reach : start.xFt + ahead.x * reach;
    const inside = frame.point(along, -0.5);
    if (!insideWall(source, inside.x, inside.z)) {
      builder.sign(frame, signText('narrow_alley', 'NO PARKING'), 'warning', along, 0, 7.6, 7, 1.5, 0.2);
    }
  }
  // JSON 的牆朝巷子的那幾面也貼上招牌與窗：找出牆的每一面，面在 bounds 裡面的才貼。
  for (const obstacle of source.obstaclesFt) {
    if (obstacle.type !== 'wall') {
      continue;
    }
    const quarterTurn = Math.abs(Math.round(obstacle.headingDeg / 90)) % 2 === 1;
    const wallBounds: BoundsFt = {
      minXFt: obstacle.centerXFt - (quarterTurn ? obstacle.lengthFt : obstacle.widthFt) / 2,
      maxXFt: obstacle.centerXFt + (quarterTurn ? obstacle.lengthFt : obstacle.widthFt) / 2,
      minZFt: obstacle.centerZFt - (quarterTurn ? obstacle.widthFt : obstacle.lengthFt) / 2,
      maxZFt: obstacle.centerZFt + (quarterTurn ? obstacle.widthFt : obstacle.lengthFt) / 2,
    };
    for (const side of SIDES) {
      // 牆的這一面朝外；用「反過來的 bounds」當座標系：out 取負值就是往牆外（巷子裡）。
      const frame = sideFrame(wallBounds, side);
      const outward: SideFrame = {
        ...frame,
        inwardDeg: frame.inwardDeg + 180,
        point: (along, out) => frame.point(along, -out),
      };
      const probe = frame.point((frame.from + frame.to) / 2, 1);
      const faceInside =
        probe.x > bounds.minXFt && probe.x < bounds.maxXFt && probe.z > bounds.minZFt && probe.z < bounds.maxZFt;
      if (!faceInside) {
        continue;
      }
      let slot = 0;
      for (let along = frame.from + 9; along <= frame.to - 7; along += 15, slot += 1) {
        const lit = rng() < 0.45 ? 0.5 + 0.5 * rng() : 0;
        if (slot % 3 === 1) {
          builder.sideSlab('decal', outward, along - 1.8, along + 1.8, -DECAL_DEPTH_FT, 0, 0, 7.2, ALLEY.doors[slot % ALLEY.doors.length] ?? ALLEY.doors[0]);
          builder.glass(outward, along - 0.6, along + 0.6, 0, 8, 8.6, 1);
        } else {
          builder.glass(outward, along - 2.2, along + 2.2, 0, 10.5, 15, lit);
        }
      }
    }
  }
}

/** 取候選的前幾個。 */
function take<T>(candidates: readonly T[], count: number): T[] {
  return candidates.slice(0, Math.max(0, Math.ceil(count)));
}

/** 依離 (x, z) 的距離由近到遠排序（公尺）：畫質低、數量少時留下離車位近的。 */
function nearestFirst(placements: readonly PropPlacement[], x: number, z: number): PropPlacement[] {
  return [...placements].sort(
    (a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z),
  );
}

/**
 * 產生一關四周的擺設。沒有 bounds 的關卡（原型關）回傳 undefined：它走 lotLayout 的停車場。
 * @param seed 亂數種子；同一個種子、同樣的設定永遠得到同一份佈局
 * @param props 這個畫質級別的擺設密度
 */
export function createEnvironmentLayout(
  source: EnvironmentSource,
  props: PropsQualitySettings,
  seed: number = DEFAULT_SEED,
): EnvironmentLayout | undefined {
  const bounds = source.boundsFt;
  if (bounds === undefined) {
    return undefined;
  }
  const builder = new Builder();
  const rng = createRng(seed + 104729);
  const buildingSide = facingSide(source.startFt.headingDeg);
  switch (source.environment) {
    case 'open_lot':
      addLotSurroundings(builder, bounds, rng, undefined, 0.55);
      break;
    case 'warehouse_club':
      addLotSurroundings(builder, bounds, rng, buildingSide, 0.7);
      addWarehouseClub(builder, sideFrame(bounds, buildingSide));
      break;
    case 'post_office':
      addLotSurroundings(builder, bounds, rng, buildingSide, 0.35);
      addPostOffice(builder, sideFrame(bounds, buildingSide));
      break;
    case 'city_street':
      addCityStreet(builder, source, bounds, rng);
      break;
    case 'narrow_alley':
      addNarrowAlley(builder, source, bounds, rng);
      break;
  }
  const spotX = ftToM(source.spotFt.centerXFt);
  const spotZ = ftToM(source.spotFt.centerZFt);
  const lot: LotLayout = {
    ...builder.lot,
    parkedCars: take(nearestFirst(builder.lot.parkedCars, spotX, spotZ), props.parkedCars),
    lamps: take(nearestFirst(builder.lot.lamps, spotX, spotZ), props.lampHeads),
    trees: take(nearestFirst(builder.lot.trees, spotX, spotZ), props.trees),
  };
  return { lot, slabs: builder.slabs, signs: builder.signs };
}
