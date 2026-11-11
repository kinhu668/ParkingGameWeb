// 進入點：讀網址參數，決定畫質（?quality 或自動），啟動一般遊戲／展示（?show）／固定鏡頭截圖（?cam）／效能測試（?bench）其中一種。
import {
  nextGameCameraView,
  resolveInitialView,
  storeView,
  type ViewStorage,
} from './core/cameraView';
import { advanceFixedLoop } from './core/fixedLoop';
import { PHYSICS_HZ } from './core/gameConfig';
import { detectLocale, getLocale, onLocaleChange, setLocale } from './core/i18n';
import { attachKeyboardInput } from './core/input';
import { msToS } from './core/units';
import { parseUrlMode, type CameraPreset } from './core/urlParams';
import { DEMO_ROUTE_STEPS, demoVehicleAfterSteps } from './level/demoRoute';
import { PROTOTYPE_LAYOUT } from './level/prototypeLayout';
import {
  restartSession,
  sessionSnapshot,
  startSession,
  stepSession,
  type SessionSnapshot,
} from './level/session';
import { runBench } from './render/benchMode';
import { createPresetCamera } from './render/followCamera';
import { createGameCamera } from './render/gameCamera';
import { resolveQuality } from './render/quality';
import {
  createRenderContext,
  detectQualityHints,
  type RenderContext,
} from './render/renderContext';
import { createGameScene } from './render/scene';
import { runShowcase } from './render/showcase';
import { createHud } from './ui/hud';
import './ui/style.css';
import { interpolateVehiclePose } from './vehicle/bicycleModel';

declare global {
  interface Window {
    /**
     * e2e 用的唯讀狀態，只在一般遊戲模式存在。只能讀、不能改遊戲；
     * 要操作車子一律送真實鍵盤事件。
     */
    __parkingGame?: { readonly snapshot: () => SessionSnapshot };
  }
}

/** 記住鏡頭用的 localStorage；瀏覽器停用儲存時連讀 `window.localStorage` 都會丟例外，那就當作沒有。 */
function browserStorage(): ViewStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** 一般遊戲：固定步長物理迴圈 + 算圖內插 + 鍵盤開車 + 停車判定 + 可切換的鏡頭（V）+ HUD。 */
function runGame({ renderer, quality, pipeline }: RenderContext): void {
  const hudRoot = document.querySelector<HTMLElement>('#hud');
  if (hudRoot === null) {
    throw new Error('找不到 #hud');
  }

  const gameScene = createGameScene(renderer, quality, PROTOTYPE_LAYOUT.spot);
  const input = attachKeyboardInput(window);
  const hud = createHud(hudRoot);

  // 進場的鏡頭：?view= > 上次存的 > 預設。
  const viewStorage = browserStorage();
  const gameCamera = createGameCamera(
    resolveInitialView(window.location.search, viewStorage),
    PROTOTYPE_LAYOUT.startState,
  );
  hud.showCameraView(gameCamera.view());

  // 內插需要相鄰兩步的車輛狀態：previousVehicle = 上一步、session.vehicle = 最新一步。
  let session = startSession(PROTOTYPE_LAYOUT);
  let previousVehicle = session.vehicle;
  let accumulatorSeconds = 0;
  let lastFrameMs: number | undefined;

  window.__parkingGame = Object.freeze({ snapshot: () => sessionSnapshot(session) });

  function frame(nowMs: number): void {
    // 第一幀沒有「上一幀」，經過時間算 0。
    const frameSeconds = lastFrameMs === undefined ? 0 : Math.max(msToS(nowMs - lastFrameMs), 0);
    lastFrameMs = nowMs;

    // R 重來：車回起點、判定歸零、成功畫面消失（hud.update 會收到 parked = false）。
    if (input.consumeRestart()) {
      session = restartSession(session);
      previousVehicle = session.vehicle;
      accumulatorSeconds = 0;
      gameCamera.snapTo(session.vehicle);
    }

    // V 切換鏡頭：換到循環順序的下一個，記住選擇，HUD 顯示名稱。
    if (input.consumeToggleCamera()) {
      const view = nextGameCameraView(gameCamera.view());
      gameCamera.setView(view);
      storeView(viewStorage, view);
      hud.showCameraView(view);
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
    // 駕駛座視角要藏起玻璃，其他模式恢復。
    gameScene.setInteriorView(gameCamera.view() === 'cockpit');
    gameCamera.update(pose, session.vehicle.speedMps, frameSeconds);
    pipeline.render(gameScene.scene, gameCamera.camera);
    hud.update(session.vehicle.speedMps, session.parked);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

/**
 * 固定鏡頭截圖：沿示範路線同步跑 round(t × 60) 步物理（不等真實時間），
 * 用指定鏡頭畫一幀後定格，並在 `<body>` 設 `data-shot-ready="true"`。沒有 HUD、不接鍵盤。
 */
function runCameraShot(
  { renderer, quality, pipeline }: RenderContext,
  preset: CameraPreset,
  timeSeconds: number,
): void {
  // 路線結束後車已停住，再跑也不會變；超過的時間夾在路線長度，免得很大的 t 把分頁卡死。
  const steps = Math.min(Math.round(timeSeconds * PHYSICS_HZ), DEMO_ROUTE_STEPS);
  const vehicle = demoVehicleAfterSteps(PROTOTYPE_LAYOUT.startState, steps);

  const gameScene = createGameScene(renderer, quality, PROTOTYPE_LAYOUT.spot);
  gameScene.update(vehicle);
  const camera = createPresetCamera(preset, vehicle.x, vehicle.z, PROTOTYPE_LAYOUT.spot);

  const draw = (): void => {
    pipeline.render(gameScene.scene, camera);
  };
  // 第一次畫：著色器在這裡同步編譯完，畫布上已經是經過整條後製鏈的一幀。
  draw();
  // 畫面是定格的，但視窗大小變了要用同一個狀態重畫，否則舊的一幀會被拉伸。
  window.addEventListener('resize', draw);
  // 後製鏈若有非同步載入的資源（SMAA 的查表貼圖），第一幀還沒有它的效果；
  // 等它載入後重畫一次再標記定格完成，截圖才是完整的後製結果、也才能重現。
  void pipeline.ready.then(() => {
    draw();
    document.body.dataset.shotReady = 'true';
  });
}

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (canvas === null) {
  throw new Error('找不到 #game-canvas');
}

// 語言：?lang= 優先，否則跟隨瀏覽器；<html lang> 隨語言切換同步。每種模式都適用。
function syncDocumentLanguage(): void {
  document.documentElement.lang = getLocale();
}
setLocale(detectLocale(window.location.search, navigator.language));
syncDocumentLanguage();
onLocaleChange(syncDocumentLanguage);

// 畫質：有效的 ?quality= 優先，否則依裝置自動選。只在這裡讀一次網址；每種模式都用同一份設定。
// 決議結果寫在 <html data-quality>，方便除錯與 e2e 確認。
const resolvedQuality = resolveQuality(window.location.search, detectQualityHints());
document.documentElement.dataset.quality = resolvedQuality.settings.level;
document.documentElement.dataset.qualitySource = resolvedQuality.source;
const renderContext = createRenderContext(canvas, resolvedQuality.settings);

const mode = parseUrlMode(window.location.search);
switch (mode.kind) {
  case 'show':
    runShowcase(renderContext, mode.id);
    break;
  case 'cam':
    runCameraShot(renderContext, mode.preset, mode.timeSeconds);
    break;
  case 'bench':
    runBench(renderContext);
    break;
  case 'game':
    runGame(renderContext);
    break;
}
