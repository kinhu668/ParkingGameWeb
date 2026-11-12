// 進入點：讀網址參數，決定畫質（?quality 或自動）與關卡（?level），
// 啟動關卡選擇（沒有 ?level 的首頁）／一般遊戲（?level）／展示（?show）／固定鏡頭截圖（?cam）／
// 效能測試（?bench）其中一種。?cam、?bench 沒給 ?level 是原型關。
import {
  nextGameCameraView,
  resolveInitialView,
  storeView,
  type ViewStorage,
} from './core/cameraView';
import { advanceFixedLoop } from './core/fixedLoop';
import { PHYSICS_HZ } from './core/gameConfig';
import { detectLocale, getLocale, onLocaleChange, setLocale, t } from './core/i18n';
import { attachKeyboardInput } from './core/input';
import { msToS } from './core/units';
import { loadSave, updateSave, withLocale, type SaveStorage } from './core/save';
import {
  navigationSearch,
  parseLevelParam,
  parseUnlockAllParam,
  parseUrlMode,
  type CameraPreset,
} from './core/urlParams';
import { DEMO_ROUTE_STEPS, demoVehicleAfterSteps } from './level/demoRoute';
import {
  LEVEL_IDS,
  nextLevelId,
  resolveLevelRequest,
  worldLevels,
  worldSlots,
} from './level/levelCatalog';
import { PROTOTYPE_WORLD, type LevelDefinition } from './level/levelSchema';
import { recordResult } from './level/progress';
import { PROTOTYPE_LEVEL } from './level/prototypeLayout';
import { stepsToSeconds } from './level/scoring';
import {
  restartSession,
  sessionSnapshot,
  startSession,
  stepSession,
  type SessionResult,
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
import { createLevelSelect, levelCards } from './ui/levelSelect';
import { showChoicesNotice } from './ui/notice';
import './ui/style.css';
import { interpolateVehiclePose, type DriveInput } from './vehicle/bicycleModel';
import { carLightsFor } from './vehicle/carMesh';

declare global {
  interface Window {
    /**
     * e2e 用的唯讀狀態，只在一般遊戲模式存在。只能讀、不能改遊戲；
     * 要操作車子一律送真實鍵盤事件。
     */
    __parkingGame?: {
      /** 這一局的關卡 id。 */
      readonly levelId: string;
      readonly snapshot: () => SessionSnapshot;
    };
  }
}

/** 關卡選擇畫面列的世界（本階段只有第 1 世界）。 */
const SELECT_WORLD = 1;

/** 暫停時餵給 HUD 與車燈的輸入：什麼都沒按。 */
const NO_DRIVE_INPUT: DriveInput = { throttle: 0, steer: 0, handbrake: false };

/**
 * 記住鏡頭與存檔用的 localStorage；瀏覽器停用儲存時連讀 `window.localStorage` 都會丟例外，那就當作沒有。
 */
function browserStorage(): (ViewStorage & SaveStorage) | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * 換關／回關卡選擇：換網址重新載入（場景還不能在頁內整個換掉），
 * 保留 `quality`、`lang`、`view` 等參數。
 * @param levelId 要進的關卡；undefined = 回關卡選擇
 */
function navigateTo(levelId: string | undefined): void {
  const search = navigationSearch(window.location.search, levelId, getLocale());
  window.location.assign(`${window.location.pathname}${search}`);
}

/**
 * 一般遊戲：固定步長物理迴圈 + 算圖內插 + 鍵盤開車 + 碰撞／計時／停車判定 + 可切換的鏡頭（V）+ HUD
 * + 暫停（Esc）+ 過關寫存檔。
 */
function runGame({ renderer, quality, pipeline }: RenderContext, level: LevelDefinition): void {
  const { layout } = level;
  const hudRoot = document.querySelector<HTMLElement>('#hud');
  if (hudRoot === null) {
    throw new Error('找不到 #hud');
  }

  const gameScene = createGameScene(renderer, quality, layout.spot, layout.startState, level);
  const input = attachKeyboardInput(window);

  // 面板上的按鈕：重來留在這一頁（下一幀處理，與按 R 同一條路），其餘換網址。
  let restartRequested = false;
  let paused = false;
  const nextId = nextLevelId(level.id);
  const hud = createHud(
    hudRoot,
    {
      restart: () => {
        restartRequested = true;
      },
      levelSelect: () => {
        navigateTo(undefined);
      },
      nextLevel:
        nextId === undefined
          ? undefined
          : () => {
              navigateTo(nextId);
            },
    },
    () => {
      setPaused(false);
    },
  );
  function setPaused(next: boolean): void {
    paused = next;
    hud.setPaused(next);
  }

  // 進場的鏡頭：?view= > 上次存的 > 預設。
  const storage = browserStorage();
  const gameCamera = createGameCamera(
    resolveInitialView(window.location.search, storage),
    layout.startState,
  );
  hud.showCameraView(gameCamera.view());

  // 內插需要相鄰兩步的車輛狀態：previousVehicle = 上一步、session.vehicle = 最新一步。
  let session = startSession(layout);
  let previousVehicle = session.vehicle;
  let accumulatorSeconds = 0;
  let lastFrameMs: number | undefined;
  /** 已經寫進存檔的那一次成績；同一次停妥只寫一次，重來後再過關會是新的成績。 */
  let savedResult: SessionResult | null = null;

  window.__parkingGame = Object.freeze({
    levelId: level.id,
    snapshot: () => sessionSnapshot(session),
  });

  function frame(nowMs: number): void {
    // 第一幀沒有「上一幀」，經過時間算 0。
    const frameSeconds = lastFrameMs === undefined ? 0 : Math.max(msToS(nowMs - lastFrameMs), 0);
    lastFrameMs = nowMs;

    // R 重來：車回起點、判定／計時／碰撞歸零，成功或失敗的面板消失（hud.update 會看到新的一局）。
    // 按鍵與面板上的「重來」按鈕走同一條路；暫停中重來會順便解除暫停。
    if (input.consumeRestart() || restartRequested) {
      restartRequested = false;
      session = restartSession(session);
      previousVehicle = session.vehicle;
      accumulatorSeconds = 0;
      gameCamera.snapTo(session.vehicle);
      setPaused(false);
    }

    // Esc 暫停／繼續。已經停妥或失敗就沒有東西可以暫停（結算面板上已經有同樣的按鈕）。
    if (input.consumePause() && session.status !== 'parked' && session.status !== 'failed') {
      setPaused(!paused);
    }

    // V 切換鏡頭：換到循環順序的下一個，記住選擇，HUD 顯示名稱。
    if (input.consumeToggleCamera()) {
      const view = nextGameCameraView(gameCamera.view());
      gameCamera.setView(view);
      storeView(storage, view);
      hud.showCameraView(view);
    }

    // 暫停時時間不前進：不跑物理（計時也跟著停）、特效不動；畫面照畫，鏡頭仍可切換。
    const simSeconds = paused ? 0 : frameSeconds;
    const loop = advanceFixedLoop(accumulatorSeconds, simSeconds);
    accumulatorSeconds = loop.accumulatorSeconds;
    const driveInput = paused ? NO_DRIVE_INPUT : input.driveInput();
    for (let step = 0; step < loop.steps; step += 1) {
      previousVehicle = session.vehicle;
      session = stepSession(session, driveInput);
    }

    // 剛停妥：把成績併進存檔（星數取大、時間取小）。原型關不存。
    const { result } = session;
    if (result !== null && result !== savedResult) {
      savedResult = result;
      if (level.world !== PROTOTYPE_WORLD) {
        updateSave(storage, (save) =>
          recordResult(save, level.id, {
            stars: result.stars,
            timeS: stepsToSeconds(result.timeSteps),
          }),
        );
      }
    }

    const pose = interpolateVehiclePose(previousVehicle, session.vehicle, loop.alpha);
    gameScene.update(pose, simSeconds);
    // 駕駛座視角要藏起玻璃，其他模式恢復。
    gameScene.setInteriorView(gameCamera.view() === 'cockpit');
    // 引擎蓋視角收斂烤漆的掠射反光，其他模式恢復。
    gameScene.setHoodView(gameCamera.view() === 'hood');
    gameScene.setLights(carLightsFor(driveInput, session.vehicle.speedMps));
    gameCamera.update(pose, session.vehicle.speedMps, frameSeconds);
    pipeline.render(gameScene.scene, gameCamera.camera);
    hud.update(session, driveInput);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

/**
 * 固定鏡頭截圖：沿示範路線同步跑 round(t × 60) 步物理（不等真實時間），
 * 用指定鏡頭畫一幀後定格，並在 `<body>` 設 `data-shot-ready="true"`。沒有 HUD、不接鍵盤。
 * 示範路線只適用原型關；其他關在有各自的參考路線之前，不論 t 是多少都定格在起點。
 */
function runCameraShot(
  { renderer, quality, pipeline }: RenderContext,
  level: LevelDefinition,
  preset: CameraPreset,
  timeSeconds: number,
): void {
  const { spot, startState } = level.layout;
  // 路線結束後車已停住，再跑也不會變；超過的時間夾在路線長度，免得很大的 t 把分頁卡死。
  const steps =
    level.id === PROTOTYPE_LEVEL.id
      ? Math.min(Math.round(timeSeconds * PHYSICS_HZ), DEMO_ROUTE_STEPS)
      : 0;
  const vehicle = demoVehicleAfterSteps(startState, steps);

  const gameScene = createGameScene(renderer, quality, spot, startState, level);
  gameScene.update(vehicle);
  const camera = createPresetCamera(preset, vehicle.x, vehicle.z, spot);

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

/**
 * 關卡選擇（首頁）：背景是第 1 關場景的固定鏡頭定格（CSS 壓暗），上面是關卡卡片。
 * 點已解鎖的卡就換網址進關。`?unlock=all` 讓每一關都可以點，但不寫入存檔。
 */
function runLevelSelect({ renderer, quality, pipeline }: RenderContext): void {
  const backdrop = worldLevels(SELECT_WORLD)[0] ?? PROTOTYPE_LEVEL;
  const { spot, startState } = backdrop.layout;
  const gameScene = createGameScene(renderer, quality, spot, startState, backdrop);
  gameScene.update(startState);
  const camera = createPresetCamera('spot_low', startState.x, startState.z, spot);
  const draw = (): void => {
    pipeline.render(gameScene.scene, camera);
  };
  // 與 ?cam 相同：先畫一次，後製的非同步資源載入後再畫一次；視窗大小變了用同一個狀態重畫。
  draw();
  window.addEventListener('resize', draw);
  void pipeline.ready.then(draw);

  createLevelSelect(
    document.body,
    levelCards(
      worldSlots(SELECT_WORLD),
      loadSave(browserStorage()),
      parseUnlockAllParam(window.location.search),
    ),
    navigateTo,
  );
}

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (canvas === null) {
  throw new Error('找不到 #game-canvas');
}

// 語言：?lang= 優先，其次是存檔裡上次用語言按鈕選的，否則跟隨瀏覽器；<html lang> 隨語言切換同步。
// 每種模式都適用。之後每次切換（只有按語言按鈕會切換）都寫進存檔；?lang= 本身不寫。
function syncDocumentLanguage(): void {
  document.documentElement.lang = getLocale();
}
setLocale(
  detectLocale(
    window.location.search,
    navigator.language,
    loadSave(browserStorage()).settings.locale,
  ),
);
syncDocumentLanguage();
onLocaleChange(() => {
  syncDocumentLanguage();
  updateSave(browserStorage(), (save) => withLocale(save, getLocale()));
});

// 畫質：有效的 ?quality= 優先，否則依裝置自動選。只在這裡讀一次網址；每種模式都用同一份設定。
// 決議結果寫在 <html data-quality>，方便除錯與 e2e 確認。
const resolvedQuality = resolveQuality(window.location.search, detectQualityHints());
document.documentElement.dataset.quality = resolvedQuality.settings.level;
document.documentElement.dataset.qualitySource = resolvedQuality.source;
const renderContext = createRenderContext(canvas, resolvedQuality.settings);

/**
 * 需要關卡的模式（一般遊戲、?cam、?bench）共用：`?level=<id>` 指定關卡，沒給就進原型關
 * （一般遊戲沒給 `?level=` 不會走到這裡，那是關卡選擇）。
 * `?level=` 直接進關，不檢查有沒有解鎖（e2e、截圖、人類驗收用）。
 * 目錄裡沒有的 id 不悄悄換成別關：不啟動，在畫面上列出可用的 id。
 * 決議結果寫在 <html data-level>，方便除錯與 e2e 確認。
 */
function startWithLevel(run: (level: LevelDefinition) => void): void {
  const request = resolveLevelRequest(parseLevelParam(window.location.search));
  if (request.kind === 'unknown') {
    showChoicesNotice('level-notice', t('level.unknown'), LEVEL_IDS);
    return;
  }
  document.documentElement.dataset.level = request.level.id;
  run(request.level);
}

const mode = parseUrlMode(window.location.search);
switch (mode.kind) {
  case 'show':
    runShowcase(renderContext, mode.id);
    break;
  case 'cam':
    startWithLevel((level) => {
      runCameraShot(renderContext, level, mode.preset, mode.timeSeconds);
    });
    break;
  case 'bench':
    startWithLevel((level) => {
      runBench(renderContext, level);
    });
    break;
  case 'game':
    if (parseLevelParam(window.location.search) === undefined) {
      runLevelSelect(renderContext);
    } else {
      startWithLevel((level) => {
        runGame(renderContext, level);
      });
    }
    break;
}
