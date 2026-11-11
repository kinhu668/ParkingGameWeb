// 車位標線：磨損過的白漆矩形外框，平貼地面、略高於地面避免與地面共面閃爍。
// 標線的外緣就是判定用的車位邊界：車身壓在線上算在內，超出線的外緣才算出界。
// 幾何是完整的外框；缺口、毛邊、褪色、輪胎磨痕在著色器裡依車位本地座標算（不透明度與顏色），不影響判定。
import { Mesh, MeshStandardMaterial, Path, Shape, ShapeGeometry, Vector2, Vector4 } from 'three';
import { headingToRotationY } from '../core/heading';
import type { ParkingSpot } from '../level/parkingJudge';
import { SPOT_MARKING_CONFIG } from '../render/renderConfig';
import type { ShaderSource } from './groundShader';

/** 在 path 上畫一個以原點為中心的矩形。 */
function traceRectangle(path: Path, halfWidthM: number, halfLengthM: number): void {
  path.moveTo(-halfWidthM, -halfLengthM);
  path.lineTo(halfWidthM, -halfLengthM);
  path.lineTo(halfWidthM, halfLengthM);
  path.lineTo(-halfWidthM, halfLengthM);
  path.closePath();
}

const VERTEX_PARS = /* glsl */ `
varying vec2 vPaintXZ;
`;

/** 車位本地座標的 xz（公尺）；本地 +Z 是車位後緣（車進來的那一側）。 */
const VERTEX_MAIN = /* glsl */ `
vPaintXZ = transformed.xz;
`;

const FRAGMENT_PARS = /* glsl */ `
varying vec2 vPaintXZ;
uniform vec2 uPaintHalfSize;
uniform vec4 uPaintScale;
uniform vec4 uPaintWear;
uniform vec4 uPaintTire;

// 固定的雜湊（Dave Hoskins 的 hash12）：同樣的座標永遠得到同樣的數，標線的磨損每次都一樣。
float paintHash( vec2 p ) {
	vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
	p3 += dot( p3, p3.yzx + 33.33 );
	return fract( ( p3.x + p3.y ) * p3.z );
}

float paintNoise( vec2 p ) {
	vec2 cell = floor( p );
	vec2 t = fract( p );
	t = t * t * ( 3.0 - 2.0 * t );
	float top = mix( paintHash( cell ), paintHash( cell + vec2( 1.0, 0.0 ) ), t.x );
	float bottom = mix( paintHash( cell + vec2( 0.0, 1.0 ) ), paintHash( cell + vec2( 1.0, 1.0 ) ), t.x );
	return mix( top, bottom, t.y );
}
`;

/** 取代 map_fragment：算剩下多少漆（不透明度）與褪色。 */
const FRAGMENT_PAINT = /* glsl */ `
vec2 paintAbs = abs( vPaintXZ );
float paintLineWidth = uPaintScale.w;
// 離線的外緣、內緣各多遠；0 = 在邊上、1 = 在線的正中央。
float paintOuter = min( uPaintHalfSize.x - paintAbs.x, uPaintHalfSize.y - paintAbs.y );
float paintInner = max( paintAbs.x - ( uPaintHalfSize.x - paintLineWidth ), paintAbs.y - ( uPaintHalfSize.y - paintLineWidth ) );
float paintCenter = clamp( min( paintOuter, paintInner ) / ( 0.5 * paintLineWidth ), 0.0, 1.0 );

// 剝落：三層由粗到細的噪聲。
vec2 paintP = vPaintXZ * uPaintScale.x;
float paintChips = 0.5 * paintNoise( paintP )
	+ 0.3 * paintNoise( paintP * uPaintScale.y + 17.0 )
	+ 0.2 * paintNoise( paintP * uPaintScale.y * uPaintScale.y + 41.0 );
// 整段磨損：沿線一段深一段淺。
float paintPatch = smoothstep( 0.45, 0.8, paintNoise( vPaintXZ * uPaintScale.z + 7.0 ) );
// 輪胎磨痕：只在後緣那條線上，左右輪各一道。
float paintTire = exp( - pow( ( paintAbs.x - uPaintTire.x ) / uPaintTire.y, 2.0 ) )
	* step( uPaintHalfSize.y - 1.5 * paintLineWidth, vPaintXZ.y );

float paintWear = uPaintWear.x
	+ uPaintWear.y * paintPatch
	+ uPaintWear.z * ( 1.0 - paintCenter )
	+ uPaintTire.z * paintTire;
float paintCoverage = smoothstep( paintWear - uPaintTire.w, paintWear + uPaintTire.w, paintChips );

// 褪色：磨損多的地方漆也比較髒、比較暗。
diffuseColor.rgb *= mix( uPaintWear.w, 1.0, clamp( paintChips + 0.35 - 0.5 * paintPatch, 0.0, 1.0 ) );
diffuseColor.a *= paintCoverage;
`;

/** 把 anchor 換成 replacement；找不到就丟錯。 */
function replaceOnce(source: string, anchor: string, replacement: string): string {
  if (!source.includes(anchor)) {
    throw new Error(`標線著色器：找不到插入點 ${anchor}`);
  }
  return source.replace(anchor, replacement);
}

/** 把磨損的片段插進 MeshStandardMaterial 的著色器原始碼。 */
export function patchPaintShader(source: ShaderSource): void {
  let vertex = source.vertexShader;
  vertex = replaceOnce(vertex, '#include <common>', `#include <common>\n${VERTEX_PARS}`);
  vertex = replaceOnce(vertex, '#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_MAIN}`);
  source.vertexShader = vertex;

  let fragment = source.fragmentShader;
  fragment = replaceOnce(fragment, '#include <common>', `#include <common>\n${FRAGMENT_PARS}`);
  fragment = replaceOnce(fragment, '#include <map_fragment>', FRAGMENT_PAINT);
  source.fragmentShader = fragment;
}

/** 磨損的漆面材質；半透明（剝落處透出柏油），不寫深度。 */
function createPaintMaterial(halfWidthM: number, halfLengthM: number): MeshStandardMaterial {
  const config = SPOT_MARKING_CONFIG;
  const material = new MeshStandardMaterial({
    color: config.color,
    roughness: config.roughness,
    metalness: 0,
    transparent: true,
    opacity: config.opacity,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uPaintHalfSize: { value: new Vector2(halfWidthM, halfLengthM) },
      uPaintScale: {
        value: new Vector4(
          1 / config.chipSizeM,
          config.chipLacunarity,
          1 / config.patchSizeM,
          config.lineWidthM,
        ),
      },
      uPaintWear: {
        value: new Vector4(config.baseWear, config.patchWear, config.edgeWear, config.fadeMin),
      },
      uPaintTire: {
        value: new Vector4(
          config.tireTrackOffsetM,
          config.tireTrackHalfWidthM,
          config.tireWear,
          config.chipSoftness,
        ),
      },
    });
    patchPaintShader(shader);
  };
  material.customProgramCacheKey = () => 'spot-paint';
  return material;
}

/** 建立一個車位的標線網格（只收陰影不投影），已擺到車位的位置與朝向。 */
export function createSpotMarkings(spot: ParkingSpot): Mesh {
  const halfWidthM = spot.widthM / 2;
  const halfLengthM = spot.lengthM / 2;

  // 外框矩形挖掉內縮一個線寬的矩形，剩下的就是四條線。
  const outline = new Shape();
  traceRectangle(outline, halfWidthM, halfLengthM);
  const inner = new Path();
  traceRectangle(
    inner,
    halfWidthM - SPOT_MARKING_CONFIG.lineWidthM,
    halfLengthM - SPOT_MARKING_CONFIG.lineWidthM,
  );
  outline.holes.push(inner);

  // ShapeGeometry 立在 XY 平面、面朝 +Z；繞 X 轉 −90° 讓它躺平、面朝 +Y，
  // 這時形狀的 +Y 變成本地 −Z（車位的前方），符合「車頭朝本地 −Z」的建模約定。
  const geometry = new ShapeGeometry(outline).rotateX(-Math.PI / 2);
  const markings = new Mesh(geometry, createPaintMaterial(halfWidthM, halfLengthM));
  markings.position.set(spot.x, SPOT_MARKING_CONFIG.liftM, spot.z);
  markings.rotation.y = headingToRotationY(spot.headingRad);
  markings.receiveShadow = true;
  return markings;
}
