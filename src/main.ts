// 進入點：固定步長物理迴圈 + 算圖內插 + 鍵盤開車 + HUD。
import { advanceFixedLoop } from './core/fixedLoop';
import { FIXED_STEP_SECONDS } from './core/gameConfig';
import { detectLocale, getLocale, onLocaleChange, setLocale } from './core/i18n';
import { attachKeyboardInput } from './core/input';
import { msToS } from './core/units';
import { createFollowCamera } from './render/followCamera';
import { createRenderer, fitRendererToCanvas } from './render/renderer';
import { createGameScene } from './render/scene';
import { createHud } from './ui/hud';
import './ui/style.css';
import { interpolateVehiclePose, stepVehicle, type VehicleState } from './vehicle/bicycleModel';

/** 起始姿態：原點、車頭朝 −Z（heading 0）、靜止。 */
const START_STATE: VehicleState = { x: 0, z: 0, headingRad: 0, speedMps: 0, steerRad: 0 };

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
const gameScene = createGameScene(renderer.capabilities.getMaxAnisotropy());
const followCamera = createFollowCamera(START_STATE.x, START_STATE.z);
const input = attachKeyboardInput(window);
const hud = createHud(hudRoot);

// 內插需要相鄰兩步的狀態：previous = 上一步、current = 最新一步。
let previousState = START_STATE;
let currentState = START_STATE;
let accumulatorSeconds = 0;
let lastFrameMs: number | undefined;

function frame(nowMs: number): void {
  // 第一幀沒有「上一幀」，經過時間算 0。
  const frameSeconds = lastFrameMs === undefined ? 0 : Math.max(msToS(nowMs - lastFrameMs), 0);
  lastFrameMs = nowMs;

  if (input.consumeRestart()) {
    previousState = START_STATE;
    currentState = START_STATE;
    accumulatorSeconds = 0;
  }

  const loop = advanceFixedLoop(accumulatorSeconds, frameSeconds);
  accumulatorSeconds = loop.accumulatorSeconds;
  const driveInput = input.driveInput();
  for (let step = 0; step < loop.steps; step += 1) {
    previousState = currentState;
    currentState = stepVehicle(currentState, driveInput, FIXED_STEP_SECONDS);
  }

  const pose = interpolateVehiclePose(previousState, currentState, loop.alpha);
  gameScene.update(pose);
  followCamera.update(pose.x, pose.z, frameSeconds);
  fitRendererToCanvas(renderer, followCamera.camera);
  renderer.render(gameScene.scene, followCamera.camera);
  hud.update(currentState.speedMps);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
