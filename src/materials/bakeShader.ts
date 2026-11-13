// 烘焙著色器：把每一種表面畫成可以無縫重複的貼圖。只有字串，不 import three：可以純函式測試。
// 一個程式畫全部表面（uSurface 選哪一種）；一次輸出三張：
//   0 顏色：rgb = 不跟著底色走的顏色（灰縫、鏽、露出來的柏油），a = 它蓋住多少
//   1 ORM ：r = AO、g = 粗糙度倍率 ÷ 2、b = 金屬度倍率、a = 底色的明暗倍率 ÷ 2
//   2 法線：rg = 切線空間法線的 xy、b = z、a = 高度
// 亂數全部來自整數雜湊（不用 sin 雜湊，各家顯示卡算出來才會一樣），格點座標對周期取餘數，所以貼圖四邊接得起來。
import { SURFACE_IDS, SURFACE_SEED } from './surfaces';

/** 髒污疊加貼圖在烘焙著色器裡的編號（排在全部表面之後）。 */
export const OVERLAY_BAKE_INDEX = SURFACE_IDS.length;

export const BAKE_VERTEX_SHADER = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const NOISE = /* glsl */ `
const uint SEED = ${SURFACE_SEED}u;

uint hashU(uint x) {
  x ^= x >> 16; x *= 0x7feb352dU; x ^= x >> 15; x *= 0x846ca68bU; x ^= x >> 16;
  return x;
}
float hash(ivec2 p, uint s) {
  uint h = hashU(uint(p.x) * 0x9e3779b9U + hashU(uint(p.y) + hashU(s + SEED)));
  return float(h >> 8) * (1.0 / 16777215.0);
}
// 取餘數的被除數不能是負的（GLSL ES 的 % 對負數沒有定義）：先加一個周期。
ivec2 wrap2(ivec2 p, ivec2 n) { return (p + n) % n; }

/** 周期是 freq 格的值噪聲（兩個方向的格數可以不同：拉長的條紋）。 */
float vnoise2(vec2 uv, ivec2 freq, uint s) {
  vec2 p = uv * vec2(freq);
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * (3.0 - 2.0 * f);
  ivec2 ip = ivec2(i);
  float a = hash(wrap2(ip, freq), s);
  float b = hash(wrap2(ip + ivec2(1, 0), freq), s);
  float c = hash(wrap2(ip + ivec2(0, 1), freq), s);
  float d = hash(wrap2(ip + ivec2(1, 1), freq), s);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float vnoise(vec2 uv, int freq, uint s) { return vnoise2(uv, ivec2(freq), s); }

float fbm(vec2 uv, int freq, int octaves, uint s) {
  float sum = 0.0;
  float amp = 0.5;
  float norm = 0.0;
  for (int o = 0; o < octaves; o++) {
    sum += amp * vnoise(uv, freq, s + uint(o) * 17u);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/** 細胞噪聲：x = 到最近的點的距離、y = 那一格的亂數、z = 第二近 − 最近（細胞邊界上是 0）。 */
vec3 cells(vec2 uv, int freq, uint s) {
  vec2 p = uv * float(freq);
  ivec2 ip = ivec2(floor(p));
  vec2 f = p - floor(p);
  float d1 = 9.0;
  float d2 = 9.0;
  float id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      ivec2 c = wrap2(ip + ivec2(x, y), ivec2(freq));
      vec2 o = vec2(hash(c, s), hash(c, s + 71u));
      vec2 r = vec2(float(x), float(y)) + o - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; id = hash(c, s + 133u); }
      else if (d < d2) { d2 = d; }
    }
  }
  return vec3(sqrt(d1), id, sqrt(d2) - sqrt(d1));
}
`;

const SURFACES = /* glsl */ `
struct Surf {
  vec3 over;   // 不跟底色走的顏色（線性）
  float cov;   // 它蓋住多少
  float tint;  // 底色的明暗倍率
  float ao;
  float rough; // 粗糙度倍率
  float metal; // 金屬度倍率
  float h;     // 高度（以貼圖邊長為 1）
  vec2 nrm;    // 直接加在法線上的偏移（金屬片）
};

Surf blank() {
  return Surf(vec3(0.0), 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, vec2(0.0));
}

// 柏油：碎石骨材＋細顆粒；wet > 0 時有潮濕的深色區與反光的小水窪。
Surf asphalt(vec2 uv, float wet) {
  Surf s = blank();
  vec3 c = cells(uv, 96, 1u);
  float stone = smoothstep(0.55, 0.15, c.x);
  float grain = fbm(uv, 128, 3, 3u);
  float mott = fbm(uv, 6, 4, 4u);
  s.tint = 0.78 + 0.34 * stone * c.y + 0.16 * (grain - 0.5) + 0.2 * (mott - 0.5);
  s.h = 0.0016 * stone * (0.5 + 0.5 * c.y) + 0.0006 * grain;
  s.ao = 0.8 + 0.2 * stone;
  s.rough = 1.0 + 0.1 * (grain - 0.5);
  if (wet > 0.0) {
    float puddle = smoothstep(0.5, 0.62, fbm(uv, 3, 4, 5u));
    float damp = smoothstep(0.3, 0.6, fbm(uv, 5, 3, 6u));
    s.tint *= mix(1.0, 0.72, damp) * mix(1.0, 0.8, puddle);
    s.rough = mix(mix(1.4, 0.8, damp), 0.14, puddle);
    s.h *= 1.0 - puddle;
  }
  return s;
}

// 水泥：大片的色斑、細砂、氣孔、每半張貼圖一道伸縮縫、水漬。
Surf concrete(vec2 uv) {
  Surf s = blank();
  float mott = fbm(uv, 4, 5, 10u);
  float fine = fbm(uv, 96, 3, 11u);
  vec3 pores = cells(uv, 56, 12u);
  float pore = smoothstep(0.16, 0.06, pores.x) * step(0.72, pores.y);
  vec2 g = abs(fract(uv * 2.0 + 0.5) - 0.5) * 0.5;
  float joint = smoothstep(0.0035, 0.0012, min(g.x, g.y));
  float stain = smoothstep(0.52, 0.75, fbm(uv, 3, 4, 13u));
  s.tint = 0.92 + 0.22 * (mott - 0.5) + 0.1 * (fine - 0.5) - 0.3 * pore - 0.4 * joint - 0.1 * stain;
  s.h = 0.0012 * fine - 0.004 * pore - 0.006 * joint;
  s.ao = 1.0 - 0.5 * joint - 0.4 * pore;
  s.rough = 1.0 + 0.12 * (fine - 0.5) - 0.08 * stain;
  return s;
}

// 環氧地坪：平滑反光、撒了彩色碎片、鞋印與拖痕把局部磨霧。
Surf epoxy(vec2 uv) {
  Surf s = blank();
  vec3 fl = cells(uv, 72, 20u);
  float flake = smoothstep(0.3, 0.2, fl.x) * step(0.55, fl.y);
  float scuff = smoothstep(0.55, 0.8, fbm(uv, 8, 4, 21u));
  float streak = vnoise2(uv, ivec2(4, 96), 22u);
  s.tint = 0.95 + 0.1 * (fbm(uv, 5, 3, 23u) - 0.5) + flake * (fl.y > 0.8 ? 0.45 : -0.3);
  s.rough = 1.0 + 0.9 * scuff * streak + 0.3 * scuff;
  s.h = 0.0006 * fbm(uv, 24, 2, 24u);
  return s;
}

// 磨損標線：漆面被磨穿的地方露出底下的柏油，另有細裂紋。
Surf wornPaint(vec2 uv) {
  Surf s = blank();
  float wear = fbm(uv, 6, 5, 30u);
  vec3 ag = cells(uv, 64, 31u);
  float worn = smoothstep(0.5, 0.7, wear + 0.25 * (ag.x - 0.4));
  vec3 cr = cells(uv, 7, 32u);
  worn = max(worn, smoothstep(0.03, 0.01, cr.z));
  s.over = vec3(0.1, 0.1, 0.105) * (0.8 + 0.5 * ag.y);
  s.cov = worn * 0.92;
  s.tint = 0.94 + 0.14 * (fbm(uv, 24, 3, 33u) - 0.5) - 0.12 * smoothstep(0.35, 0.5, wear);
  s.h = 0.0015 * (1.0 - worn) + 0.0008 * smoothstep(0.5, 0.1, ag.x);
  s.rough = 1.0 + 0.2 * worn;
  s.ao = 1.0 - 0.15 * worn;
  return s;
}

// 生鏽鐵件：成片的鏽（不是金屬、粗糙、有坑），其餘是還看得到的鐵。
Surf rustedIron(vec2 uv) {
  Surf s = blank();
  float r = fbm(uv, 4, 6, 40u);
  float r2 = fbm(uv, 24, 4, 41u);
  float rust = smoothstep(0.42, 0.62, r + 0.25 * (r2 - 0.5));
  vec3 pit = cells(uv, 48, 42u);
  float pits = smoothstep(0.4, 0.1, pit.x);
  vec3 rustA = vec3(0.36, 0.14, 0.05);
  vec3 rustB = vec3(0.19, 0.08, 0.04);
  vec3 rustC = vec3(0.55, 0.27, 0.09);
  s.over = mix(mix(rustB, rustA, r2), rustC, smoothstep(0.6, 0.9, pit.y) * 0.6);
  s.cov = rust;
  s.metal = 1.0 - rust;
  s.rough = mix(0.75, 1.5, rust);
  s.h = rust * (0.002 * r2 + 0.0015 * pits);
  s.tint = 0.9 + 0.2 * (r2 - 0.5);
  s.ao = 1.0 - 0.25 * rust * pits;
  return s;
}

// 鍍鋅鋼：一片一片亮度不同的鋅花、淡淡的拉絲、少量白鏽。
Surf galvanized(vec2 uv) {
  Surf s = blank();
  vec3 sp = cells(uv, 14, 50u);
  vec3 sp2 = cells(uv, 30, 51u);
  float streak = vnoise2(uv, ivec2(160, 3), 52u);
  float white = smoothstep(0.62, 0.82, fbm(uv, 5, 4, 53u));
  s.tint = 0.86 + 0.22 * sp.y + 0.1 * (sp2.y - 0.5) + 0.06 * (streak - 0.5);
  s.rough = 0.8 + 0.5 * sp2.y + 0.2 * (streak - 0.5);
  s.metal = 1.0 - 0.3 * white;
  s.over = vec3(0.7, 0.72, 0.72);
  s.cov = 0.5 * white;
  s.h = 0.0004 * sp.y;
  return s;
}

// 瓦楞鐵皮：16 道波（沿 v 變化：貼在牆上是橫的），搭接縫、谷底積的鏽。
Surf corrugated(vec2 uv) {
  Surf s = blank();
  float w = sin(uv.y * 6.2831853 * 16.0);
  float seam = smoothstep(0.006, 0.002, abs(fract(uv.x + 0.5) - 0.5));
  float rust = smoothstep(0.55, 0.8, fbm(uv, 5, 5, 60u)) * (0.3 + 0.7 * smoothstep(0.2, -0.6, w));
  s.h = 0.0065 * w;
  s.ao = 0.72 + 0.28 * smoothstep(-1.0, 0.4, w);
  s.tint = 0.92 + 0.12 * (fbm(uv, 8, 3, 62u) - 0.5) - 0.25 * seam + 0.05 * w;
  s.over = vec3(0.3, 0.13, 0.05);
  s.cov = 0.6 * rust;
  s.metal = 1.0 - 0.6 * rust;
  s.rough = 1.0 + 0.5 * rust;
  return s;
}

// 磚：6 塊 × 20 皮的順砌；每塊磚明暗不同、少數燒得較深，灰縫凹下去。
Surf brick(vec2 uv) {
  Surf s = blank();
  const float cols = 6.0;
  const float rows = 20.0;
  float row = floor(uv.y * rows);
  vec2 p = vec2(uv.x * cols + mod(row, 2.0) * 0.5, uv.y * rows);
  ivec2 id = ivec2(int(mod(floor(p.x), cols)), int(row));
  vec2 f = fract(p);
  // 到磚緣的距離（公釐）：一塊磚連灰縫 213 × 64 mm。
  vec2 edge = min(f, 1.0 - f) * vec2(213.0, 64.0);
  float d = min(edge.x, edge.y);
  float mortar = smoothstep(6.5, 4.0, d);
  float face = smoothstep(4.0, 9.0, d);
  float rnd = hash(id, 70u);
  float grain = fbm(uv, 64, 4, 72u);
  float mott = fbm(uv, 12, 3, 73u);
  s.tint = (0.78 + 0.36 * rnd) * (0.9 + 0.2 * (grain - 0.5)) * (0.94 + 0.12 * mott);
  s.tint *= hash(id, 71u) > 0.86 ? 0.68 : 1.0;
  s.over = vec3(0.52, 0.5, 0.46) * (0.85 + 0.3 * fbm(uv, 48, 3, 74u));
  s.cov = mortar;
  s.h = face * (0.0035 + 0.001 * rnd) + 0.0012 * grain * face;
  s.ao = mix(0.62, 1.0, face);
  s.rough = 1.0 + 0.1 * (grain - 0.5);
  return s;
}

// 玻璃：幾乎乾淨，只有淡淡的指紋與灰塵把局部磨霧。
Surf glass(vec2 uv) {
  Surf s = blank();
  float smudge = smoothstep(0.5, 0.8, fbm(uv, 5, 4, 80u));
  float dust = fbm(uv, 48, 3, 81u);
  s.rough = 1.0 + 1.6 * smudge + 0.5 * (dust - 0.5);
  s.tint = 1.0 + 0.1 * smudge;
  return s;
}

// 輪胎：下半張（v < 0.5）是胎面的人字溝，上半張是胎壁的同心稜線與一圈凸字。
Surf tire(vec2 uv) {
  Surf s = blank();
  float grain = fbm(uv, 64, 3, 90u);
  if (uv.y < 0.5) {
    float a = abs(uv.y * 2.0 - 0.5);
    float sipe = smoothstep(0.12, 0.06, abs(fract(uv.x * 4.0 + a * 1.4) - 0.5));
    float rib = smoothstep(0.03, 0.015, abs(a - 0.17));
    float block = 1.0 - max(sipe, rib);
    s.tint = mix(0.45, 1.0, block) * (0.92 + 0.16 * grain);
    s.ao = mix(0.5, 1.0, block);
  } else {
    float v = (uv.y - 0.5) * 2.0;
    float ring = smoothstep(0.02, 0.008, abs(v - 0.22)) + smoothstep(0.02, 0.008, abs(v - 0.8));
    float cell = floor(uv.x * 24.0);
    float fx = fract(uv.x * 24.0);
    float letter = step(0.45, hash(ivec2(int(cell), 3), 91u)) * step(0.15, fx) * step(fx, 0.8)
      * step(0.42, v) * step(v, 0.62);
    float tick = step(0.86, v) * step(fract(uv.x * 32.0), 0.5);
    s.tint = 0.92 + 0.3 * letter + 0.25 * ring - 0.3 * tick + 0.1 * (grain - 0.5);
    s.rough = 1.0 - 0.15 * letter;
    s.ao = 1.0 - 0.3 * tick;
  }
  return s;
}

// 車漆：清漆底下的金屬片（每一片的法線各自歪一點、亮度略有不同）＋很淡的橘皮。
Surf carPaint(vec2 uv) {
  Surf s = blank();
  vec3 fl = cells(uv, 110, 100u);
  float flake = smoothstep(0.5, 0.25, fl.x);
  float a = fl.y * 6.2831853;
  s.nrm = flake * vec2(cos(a), sin(a)) * (0.25 + 0.75 * fract(fl.y * 7.31));
  s.tint = 1.0 + 0.1 * flake * (fract(fl.y * 13.7) - 0.4);
  s.rough = 1.0 + 0.25 * flake * (fract(fl.y * 3.3) - 0.5);
  s.h = 0.0005 * fbm(uv, 10, 2, 102u);
  return s;
}

// 塑膠：咬花的細顆粒＋少量刮痕。
Surf plastic(vec2 uv) {
  Surf s = blank();
  vec3 g = cells(uv, 90, 110u);
  s.h = 0.0012 * smoothstep(0.6, 0.1, g.x);
  s.tint = 0.96 + 0.08 * g.y;
  s.rough = 0.95 + 0.15 * g.y + 0.2 * smoothstep(0.6, 0.8, fbm(uv, 6, 4, 111u));
  return s;
}

// 鉻：鏡面，只有兩個方向的細刮痕把反光拉霧一點。
Surf chrome(vec2 uv) {
  Surf s = blank();
  float sc = vnoise2(uv, ivec2(3, 220), 120u);
  float sc2 = vnoise2(uv, ivec2(200, 4), 121u);
  s.rough = 0.85 + 0.9 * smoothstep(0.7, 0.95, sc) + 0.5 * smoothstep(0.75, 0.95, sc2);
  return s;
}

// 塗裝鋼：平滑的漆面、淡淡的橘皮、零星的掉漆（露出鏽或底漆）、垂直的水痕。
Surf paintedMetal(vec2 uv) {
  Surf s = blank();
  float peel = fbm(uv, 40, 3, 130u);
  vec3 cc = cells(uv, 22, 132u);
  float chip = smoothstep(0.66, 0.72, fbm(uv, 10, 5, 131u)) * smoothstep(0.35, 0.2, cc.x);
  float streak = vnoise2(uv, ivec2(48, 2), 133u);
  s.over = mix(vec3(0.3, 0.13, 0.06), vec3(0.42, 0.4, 0.38), step(0.5, cc.y));
  s.cov = chip;
  s.tint = 0.95 + 0.14 * (fbm(uv, 5, 3, 134u) - 0.5) - 0.07 * smoothstep(0.6, 0.9, streak);
  s.rough = 1.0 + 0.6 * chip + 0.15 * (peel - 0.5);
  s.h = 0.0005 * peel - 0.0015 * chip;
  return s;
}

// 粉刷牆：粗顆粒的抹面、大片的色斑、幾道髮絲裂紋。
Surf plaster(vec2 uv) {
  Surf s = blank();
  float b = fbm(uv, 48, 4, 140u);
  vec3 c = cells(uv, 80, 141u);
  float bump = smoothstep(0.5, 0.1, c.x);
  float mott = fbm(uv, 4, 5, 142u);
  vec3 cr = cells(uv, 5, 143u);
  float crack = smoothstep(0.012, 0.004, cr.z) * smoothstep(0.5, 0.7, fbm(uv, 3, 3, 144u));
  s.h = 0.002 * b + 0.0012 * bump - 0.004 * crack;
  s.tint = 0.93 + 0.16 * (mott - 0.5) + 0.08 * (b - 0.5) - 0.3 * crack;
  s.ao = 1.0 - 0.4 * crack - 0.08 * (1.0 - bump);
  return s;
}

// 髒污疊加（四個色版）：r 髒斑、g 垂直的雨痕、b 油漬、a 舊輪胎痕。
vec4 overlays(vec2 uv) {
  float grime = smoothstep(0.42, 0.75, fbm(uv, 4, 6, 150u));
  float column = vnoise2(uv, ivec2(72, 1), 151u);
  float streak = smoothstep(0.55, 0.9, column) * smoothstep(0.25, 0.7, vnoise2(uv, ivec2(9, 2), 153u));
  vec3 oc = cells(uv, 5, 154u);
  float blob = smoothstep(0.34, 0.1, oc.x + 0.18 * (fbm(uv, 24, 3, 155u) - 0.5)) * step(0.45, oc.y);
  vec3 sp = cells(uv, 40, 156u);
  float splat = smoothstep(0.25, 0.1, sp.x) * step(0.9, sp.y) * smoothstep(0.6, 0.3, oc.x);
  float oil = max(blob * (0.5 + 0.5 * oc.y), splat * 0.7);
  float track = abs(fract((uv.x + 0.06 * sin(uv.y * 6.2831853 + 1.3)) * 2.0) - 0.5);
  float mark = smoothstep(0.012, 0.007, abs(track - 0.2))
    * smoothstep(0.45, 0.6, vnoise2(uv, ivec2(2, 5), 157u))
    * (0.6 + 0.4 * fbm(uv, 96, 2, 158u));
  return vec4(grime, streak, oil, mark);
}

Surf surfaceAt(int id, vec2 uv) {
  if (id == 0) return asphalt(uv, 0.0);
  if (id == 1) return asphalt(uv, 1.0);
  if (id == 2) return concrete(uv);
  if (id == 3) return epoxy(uv);
  if (id == 4) return wornPaint(uv);
  if (id == 5) return rustedIron(uv);
  if (id == 6) return galvanized(uv);
  if (id == 7) return corrugated(uv);
  if (id == 8) return brick(uv);
  if (id == 9) return glass(uv);
  if (id == 10) return tire(uv);
  if (id == 11) return carPaint(uv);
  if (id == 12) return plastic(uv);
  if (id == 13) return chrome(uv);
  if (id == 14) return paintedMetal(uv);
  return plaster(uv);
}
`;

/**
 * 烘焙用的片段著色器。
 * @param normals 要不要輸出法線（low 畫質不烘：少算兩次高度、少一張貼圖）
 */
export function createBakeFragmentShader(normals: boolean): string {
  return /* glsl */ `
precision highp float;
precision highp int;
in vec2 vUv;
uniform int uSurface;
uniform float uTexel;
layout(location = 0) out vec4 oColor;
layout(location = 1) out vec4 oOrm;
${normals ? 'layout(location = 2) out vec4 oNormal;' : ''}
${NOISE}
${SURFACES}
void main() {
  if (uSurface == ${OVERLAY_BAKE_INDEX}) {
    oColor = overlays(vUv);
    oOrm = vec4(1.0, 0.5, 1.0, 0.5);
    ${normals ? 'oNormal = vec4(0.5, 0.5, 1.0, 0.5);' : ''}
    return;
  }
  Surf s = surfaceAt(uSurface, vUv);
  oColor = vec4(clamp(s.over, 0.0, 1.0), clamp(s.cov, 0.0, 1.0));
  oOrm = vec4(clamp(s.ao, 0.0, 1.0), clamp(s.rough * 0.5, 0.0, 1.0), clamp(s.metal, 0.0, 1.0), clamp(s.tint * 0.5, 0.0, 1.0));
  ${
    normals
      ? `// 法線：高度在一個像素的距離上的斜率，再加上金屬片自己的偏移。
  float hU = surfaceAt(uSurface, vUv + vec2(uTexel, 0.0)).h;
  float hV = surfaceAt(uSurface, vUv + vec2(0.0, uTexel)).h;
  vec2 slope = clamp(vec2(s.h - hU, s.h - hV) / uTexel, -2.0, 2.0);
  vec3 n = normalize(vec3(slope + s.nrm, 1.0));
  oNormal = vec4(n * 0.5 + 0.5, clamp(s.h * 100.0 + 0.5, 0.0, 1.0));`
      : ''
  }
}
`;
}
