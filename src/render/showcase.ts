// `?show=<id>`：只展示一個物件。固定燈光、固定 3/4 視角、深色展示台，沒有玩法與 HUD。
// 之後新增模型、材質或道具時，在 SHOWCASE_OBJECTS 登錄一筆就能單獨檢視。
import {
  Box3,
  CircleGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  Scene,
  Sphere,
  type Object3D,
} from 'three';
import { forward } from '../core/heading';
import { t } from '../core/i18n';
import { degToRad } from '../core/units';
import { parkingSpotFromFt } from '../level/parkingJudge';
import { PROTOTYPE_LAYOUT_FT } from '../level/prototypeLayout';
import { createSpotMarkings } from '../props/spotMarkings';
import { createCarMesh } from '../vehicle/carMesh';
import { createCamera } from './followCamera';
import { SHOWCASE_CONFIG } from './renderConfig';
import type { RenderContext } from './renderContext';
import { addLights } from './scene';

/** 展示登錄表：id → 建立物件（擺在原點、車頭／車位前方朝 −Z）。用 Map，`toString` 之類的 id 才不會誤中。 */
const SHOWCASE_OBJECTS: ReadonlyMap<string, () => Object3D> = new Map([
  ['car_sedan', (): Object3D => createCarMesh().root],
  [
    'parking_spot',
    (): Object3D =>
      createSpotMarkings(
        parkingSpotFromFt({ ...PROTOTYPE_LAYOUT_FT.spot, centerXFt: 0, centerZFt: 0 }),
      ),
  ],
]);

/** 可用的展示 id（依登錄順序）。 */
export const SHOWCASE_IDS: readonly string[] = [...SHOWCASE_OBJECTS.keys()];

/** 建立 id 對應的展示物件；沒有登錄就回傳 undefined。 */
export function createShowcaseObject(id: string): Object3D | undefined {
  return SHOWCASE_OBJECTS.get(id)?.();
}

/** 圓形地台：承接陰影，也讓平貼地面的物件（車位標線）有底色可襯。 */
function createFloor(): Mesh {
  const floor = new Mesh(
    new CircleGeometry(SHOWCASE_CONFIG.floorRadiusM, SHOWCASE_CONFIG.floorSegments),
    new MeshStandardMaterial({
      color: SHOWCASE_CONFIG.floorColor,
      roughness: SHOWCASE_CONFIG.floorRoughness,
      metalness: 0,
    }),
  );
  // CircleGeometry 立在 XY 平面、面朝 +Z；繞 X 轉 −90° 讓它躺平、面朝 +Y。
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  return floor;
}

/** 未知 id：在畫面上列出 `show.unknown` 與可用清單。 */
function showUnknownNotice(): void {
  const notice = document.createElement('div');
  notice.id = 'show-notice';
  notice.className = 'hud-panel mode-panel';
  const message = document.createElement('div');
  message.textContent = t('show.unknown');
  const list = document.createElement('ul');
  list.className = 'mode-list';
  for (const id of SHOWCASE_IDS) {
    const item = document.createElement('li');
    const code = document.createElement('code');
    code.textContent = id;
    item.append(code);
    list.append(item);
  }
  notice.append(message, list);
  document.body.append(notice);
}

/** 啟動展示模式。畫出完整的一幀後在 `<body>` 設 `data-shot-ready="true"`。 */
export function runShowcase({ pipeline }: RenderContext, id: string): void {
  const scene = new Scene();
  scene.background = new Color(SHOWCASE_CONFIG.backgroundColor);
  addLights(scene, SHOWCASE_CONFIG.directionToKeyLight);

  const floor = createFloor();
  scene.add(floor);

  const object = createShowcaseObject(id);
  if (object === undefined) {
    showUnknownNotice();
  } else {
    scene.add(object);
  }

  // 鏡頭對準物件的包圍球；沒有物件（未知 id）時對準空的地台。
  const subject = new Box3().setFromObject(object ?? floor).getBoundingSphere(new Sphere());
  const azimuth = forward(degToRad(SHOWCASE_CONFIG.cameraAzimuthDeg));
  const elevationRad = degToRad(SHOWCASE_CONFIG.cameraElevationDeg);
  const camera = createCamera();

  function frame(): void {
    pipeline.fit(camera);

    // 以垂直與水平視角中窄的那一邊算「包圍球塞滿畫面」的距離；視窗改變長寬比時跟著調整。
    const verticalHalfRad = degToRad(camera.fov) / 2;
    const horizontalHalfRad = Math.atan(Math.tan(verticalHalfRad) * camera.aspect);
    const distanceM =
      (subject.radius / Math.sin(Math.min(verticalHalfRad, horizontalHalfRad))) *
      SHOWCASE_CONFIG.fitScale;
    const horizontalM = distanceM * Math.cos(elevationRad);
    camera.position.set(
      subject.center.x + azimuth.x * horizontalM,
      subject.center.y + distanceM * Math.sin(elevationRad),
      subject.center.z + azimuth.z * horizontalM,
    );
    camera.lookAt(subject.center);

    pipeline.render(scene, camera);
    // 後製鏈的非同步資源（SMAA 的查表貼圖）載入後畫出來的幀才算數。
    if (pipelineReady) {
      document.body.dataset.shotReady = 'true';
    }
    requestAnimationFrame(frame);
  }

  let pipelineReady = false;
  void pipeline.ready.then(() => {
    pipelineReady = true;
  });
  requestAnimationFrame(frame);
}
