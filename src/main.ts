// 進入點：固定步長物理迴圈 + 算圖內插 + 鍵盤開車 + 停車判定 + HUD。
import { advanceFixedLoop } from './core/fixedLoop';
import { detectLocale, getLocale, onLocaleChange, setLocale } from './core/i18n';
import { attachKeyboardInput } from './core/input';
import { msToS } from './core/units';
import { PROTOTYPE_LAYOUT } from './level/prototypeLayout';
import { restartSession, startSession, stepSession } from './level/session';
import { createFollowCamera } from './render/followCamera';
import { createRenderer, fitRendererToCanvas } from './render/renderer';
import { createGameScene } from './render/scene';
import { createHud } from './ui/hud';
import './ui/style.css';
import { interpolateVehiclePose } from './vehicle/bicycleModel';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (canvas === null) {
  throw new Error('找不到 #game-canvas');
}

const hudRoot = document.querySelector<HTMLElement>('#hud');
if (hudRoot === null) {
  throw new Error('找不到 #hud');
}

// 語言：?lang= 優先，否則跟隨瀏覽器；<html lang> 隨語言切換同步。
function syncDocumentLanguage(): void {
  document.documentElement.lang = getLocale();
}
setLocale(detectLocale(window.location.search, navigator.language));
syncDocumentLanguage();
onLocaleChange(syncDocumentLanguage);

const renderer = createRenderer(canvas);
const gameScene = createGameScene(renderer.capabilities.getMaxAnisotropy(), PROTOTYPE_LAYOUT.spot);
const followCamera = createFollowCamera(
  PROTOTYPE_LAYOUT.startState.x,
  PROTOTYPE_LAYOUT.startState.z,
);
const input = attachKeyboardInput(window);
const hud = createHud(hudRoot);

// 內插需要相鄰兩步的車輛狀態：previousVehicle = 上一步、session.vehicle = 最新一步。
let session = startSession(PROTOTYPE_LAYOUT);
let previousVehicle = session.vehicle;
let accumulatorSeconds = 0;
let lastFrameMs: number | undefined;

function frame(nowMs: number): void {
  // 第一幀沒有「上一幀」，經過時間算 0。
  const frameSeconds = lastFrameMs === undefined ? 0 : Math.max(msToS(nowMs - lastFrameMs), 0);
  lastFrameMs = nowMs;

  // R 重來：車回起點、判定歸零、成功畫面消失（hud.update 會收到 parked = false）。
  if (input.consumeRestart()) {
    session = restartSession(session);
    previousVehicle = session.vehicle;
    accumulatorSeconds = 0;
  }

  const loop = advanceFixedLoop(accumulatorSeconds, frameSeconds);
  accumulatorSeconds = loop.accumulatorSeconds;
  const driveInput = input.driveInput();
  for (let step = 0; step < loop.steps; step += 1) {
    previousVehicle = session.vehicle;
    session = stepSession(session, driveInput);
  }

  const pose = interpolateVehiclePose(previousVehicle, session.vehicle, loop.alpha);
  gameScene.update(pose);
  followCamera.update(pose.x, pose.z, frameSeconds);
  fitRendererToCanvas(renderer, followCamera.camera);
  renderer.render(gameScene.scene, followCamera.camera);
  hud.update(session.vehicle.speedMps, session.parked);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
