// 進入點：讀網址參數，決定畫質（?quality 或自動）與關卡（?level），
// 啟動關卡選擇（沒有 ?level 的首頁）／一般遊戲（?level）／展示（?show）／固定鏡頭截圖（?cam）／
// 效能測試（?bench）其中一種。?cam、?bench 沒給 ?level 是原型關。
import {
  isChaseView,
  nextGameCameraView,
  resolveInitialView,
  storeView,
} from './core/cameraView';
import { loadBindings, saveBindings } from './core/controls';
import { advanceFixedLoop } from './core/fixedLoop';
import { PHYSICS_HZ } from './core/gameConfig';
import { detectLocale, getLocale, onLocaleChange, setLocale, t } from './core/i18n';
import { attachKeyboardInput } from './core/input';
import { mergePedalInputs } from './core/touchInput';
import { msToS } from './core/units';
import { resolveWeather } from './core/weather';
import { loadSave, updateSave, withLocale } from './core/save';
import {
  navigationSearch,
  parseAssistOffParam,
  parseFxOffParam,
  parseLevelParam,
  parseTouchParam,
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
import { vehicleOnRouteAt } from './level/levelRoutes';
import { PROTOTYPE_WORLD, type LevelDefinition } from './level/levelSchema';
import { recordResult } from './level/progress';
import { bakedSurfaces } from './materials/surfaceLibrary';
import { PROTOTYPE_LEVEL } from './level/prototypeLayout';
import type { SpotGlowSnapshot } from './props/spotGlow';
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
import { cameraSnapshot, createGameCamera, type CameraSnapshot } from './render/gameCamera';
import { resolveQuality } from './render/quality';
import {
  createRenderContext,
  detectQualityHints,
  type RenderContext,
} from './render/renderContext';
import { createGameScene, type GameScene } from './render/scene';
import { runShowcase } from './render/showcase';
import { weatherPreset } from './render/weatherPresets';
import { createHud } from './ui/hud';
import { createLevelSelect, levelCards } from './ui/levelSelect';
import { showChoicesNotice } from './ui/notice';
import { createReverseAssist } from './ui/reverseAssist';
import type { ControlsAccess } from './ui/controlsPanel';
import './ui/style.css';
import { createTouchControls, preventPageGestures } from './ui/touchControls';
import { interpolateVehiclePose, type VehiclePose } from './vehicle/bicycleModel';
import { carLightsFor } from './vehicle/carMesh';
import {
  INITIAL_GEAR,
  NO_PEDAL_INPUT,
  driveInputForGear,
  gearForFrame,
  type Gear,
} from './vehicle/gearbox';

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
      /** 目標車位的發光標記：位置與大小（ft）、變綠了多少、不透明度、有沒有在畫。 */
      readonly spotGlow: () => SpotGlowSnapshot;
      /** 鏡頭目前的模式、位置、視角，以及車在畫面上的位置。 */
      readonly camera: () => CameraSnapshot;
    };
  }
}

/** 關卡選擇畫面列的世界（本階段只有第 1 世界）。 */
const SELECT_WORLD = 1;

/**
 * 記住鏡頭、存檔與按鍵綁定用的 localStorage；瀏覽器停用儲存時連讀 `window.localStorage` 都會丟例外，那就當作沒有。
 */
function browserStorage(): Storage | undefined {
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
 * 這一關的場景。天氣：`?weather=` 蓋過關卡 JSON 的 `weather`；`?fx=off` 不建立落葉、雨絲與閃電，也不做遮擋半透明。
 */
function createLevelScene(
  renderer: RenderContext['renderer'],
  quality: RenderContext['quality'],
  level: LevelDefinition,
): GameScene {
  const search = window.location.search;
  const gameScene = createGameScene(
    renderer,
    quality,
    level.layout.spot,
    level.layout.startState,
    level,
    resolveWeather(search, level.weather),
    !parseFxOffParam(search),
  );
  // 這一關烘了材質庫的哪些表面（只烘用到的）：寫在 <html data-surfaces>，方便除錯與 e2e 確認。
  document.documentElement.dataset.surfaces = bakedSurfaces(renderer).join(' ');
  return gameScene;
}

/**
 * 一般遊戲：固定步長物理迴圈 + 算圖內插 + 鍵盤開車（按鍵可自訂）+ 碰撞／計時／停車判定 + 可切換的鏡頭 + HUD
 * + 暫停 + 過關寫存檔 + 倒車輔助層 + 檔位（一個鍵在 D↔R 之間切換，油門往目前檔位的方向推）+ 螢幕操作層（方向盤、踏板、切換檔位與鏡頭鍵；滑鼠或手指）。
 */
function runGame({ renderer, quality, pipeline }: RenderContext, level: LevelDefinition): void {
  const { layout } = level;
  const hudRoot = document.querySelector<HTMLElement>('#hud');
  if (hudRoot === null) {
    throw new Error('找不到 #hud');
  }

  const gameScene = createLevelScene(renderer, quality, level);
  // 按鍵綁定：讀存檔（壞檔會被丟掉並回到預設）；玩家在按鍵設定裡改了就立刻生效並存起來。
  const storage = browserStorage();
  let bindings = loadBindings(storage);
  const input = attachKeyboardInput(window, () => bindings);

  // 面板上的按鈕：重來留在這一頁（下一幀處理，與按重來鍵同一條路），其餘換網址。
  let restartRequested = false;
  let paused = false;
  const nextId = nextLevelId(level.id);
  // 按鍵綁定的存取：HUD（操作說明、按鍵設定面板）與螢幕操作層（鍵帽）用同一份。
  // 不論在哪裡改的鍵，套用後三個地方一起重畫。
  const controlsAccess: ControlsAccess = {
    current: () => bindings,
    apply: (next) => {
      bindings = next;
      saveBindings(storage, next);
      hud.refreshBindings();
      touch.refreshKeys();
    },
    captureNextKey: input.captureNextKey,
    // 從操作說明開啟按鍵設定：這一局還在進行就先暫停，改完鍵回到暫停面板。
    hold: () => {
      if (session.status === 'ready' || session.status === 'driving') {
        setPaused(true);
      }
    },
  };
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
    controlsAccess,
  );
  function setPaused(next: boolean): void {
    paused = next;
    hud.setPaused(next);
  }

  // 進場的鏡頭：?view= > 上次存的 > 預設。
  // 鏡頭一建立就在起點、已經避開這一關的擋塊（樓、牆、停著的車…），第一幀就是對的位置。
  const gameCamera = createGameCamera(
    resolveInitialView(window.location.search, storage),
    layout.startState,
    gameScene.cameraBlockers,
  );
  // 避讓的擺位看畫面的長寬比（直式的手機要離得更遠）：先把長寬比設好再就位，第一幀就是對的。
  pipeline.fit(gameCamera.camera);
  gameCamera.snapTo(layout.startState);
  hud.showCameraView(gameCamera.view());

  /** 切換鏡頭：換到循環順序的下一個，記住選擇，HUD 顯示名稱。切換鏡頭鍵與螢幕上的「鏡頭」鍵都走這裡。 */
  function cycleCamera(): void {
    const view = nextGameCameraView(gameCamera.view());
    gameCamera.setView(view);
    storeView(storage, view);
    hud.showCameraView(view);
  }

  // 螢幕操作層（方向盤、剎車、油門、切換檔位、暫停、重來、鏡頭）：預設顯示，手機用手指、桌面用滑鼠；`?touch=off` 才隱藏。
  // 暫停、重來、切換鏡頭走與鍵盤、面板按鈕相同的路；暫停後用暫停面板上的按鈕繼續。
  const touch = createTouchControls(
    hudRoot,
    parseTouchParam(window.location.search),
    {
      pause: () => {
        if (session.status === 'ready' || session.status === 'driving') {
          setPaused(true);
        }
      },
      restart: () => {
        restartRequested = true;
      },
      camera: cycleCamera,
    },
    controlsAccess,
  );

  // 倒車輔助層（左右後視鏡、鳥瞰、倒後鏡頭）：預設開；`?assist=off`、`?fx=off` 不建立。
  // 四個小畫面用沒有遮擋淡出的場景畫（跟車鏡頭的主畫面才淡）。
  const reverseAssist = parseAssistOffParam(window.location.search)
    ? undefined
    : createReverseAssist(
        renderer,
        quality,
        hudRoot,
        gameScene.scene,
        gameScene.drawAssistViews,
        // 夜晚、雷雨的小畫面把暗處抬亮（主畫面的曝光不變）。
        weatherPreset(resolveWeather(window.location.search, level.weather)).assistView,
      );

  // 內插需要相鄰兩步的車輛狀態：previousVehicle = 上一步、session.vehicle = 最新一步。
  let session = startSession(layout);
  /** 檔位：開局與重來都是 D，只有切換檔位（鍵盤或觸控層）會改它。 */
  let gear: Gear = INITIAL_GEAR;
  let previousVehicle = session.vehicle;
  let accumulatorSeconds = 0;
  /** 上一幀車的算圖姿態（還沒畫過就是起點）；鏡頭快照用。 */
  let shownPose: VehiclePose = layout.startState;
  let lastFrameMs: number | undefined;
  /** 已經寫進存檔的那一次成績；同一次停妥只寫一次，重來後再過關會是新的成績。 */
  let savedResult: SessionResult | null = null;

  window.__parkingGame = Object.freeze({
    levelId: level.id,
    snapshot: () => sessionSnapshot(session),
    spotGlow: () => gameScene.spotGlow(),
    camera: () => cameraSnapshot(gameCamera, shownPose),
  });

  function frame(nowMs: number): void {
    // 第一幀沒有「上一幀」，經過時間算 0。
    const frameSeconds = lastFrameMs === undefined ? 0 : Math.max(msToS(nowMs - lastFrameMs), 0);
    lastFrameMs = nowMs;

    // 按鍵設定開著：遊戲鍵都不作用（免得試鍵時把這一局重來或換了檔），只有暫停鍵會把設定收起來。
    if (hud.controlsOpen()) {
      input.consumeRestart();
      input.consumeToggleCamera();
      input.consumeGearToggles();
      touch.consumeGearToggles();
      if (input.consumePause()) {
        hud.closeControls();
      }
    }

    // 重來：車回起點、判定／計時／碰撞歸零、檔位回到 D 檔，成功或失敗的面板消失（hud.update 會看到新的一局）。
    // 按鍵與面板上的「重來」按鈕走同一條路；暫停中重來會順便解除暫停。
    // 重來之前按的切換檔位不帶進新的一局：鍵盤重來由 input 依按鍵先後丟掉；面板與觸控層的按鈕不知道先後，這裡一律丟掉。
    const restarted = input.consumeRestart() || restartRequested;
    if (restarted) {
      if (restartRequested) {
        input.consumeGearToggles();
      }
      touch.consumeGearToggles();
      restartRequested = false;
      session = restartSession(session);
      previousVehicle = session.vehicle;
      accumulatorSeconds = 0;
      gameCamera.snapTo(session.vehicle);
      setPaused(false);
      reverseAssist?.reset();
    }

    // 暫停／繼續。已經停妥或失敗就沒有東西可以暫停（結算面板上已經有同樣的按鈕）。
    const running = session.status === 'ready' || session.status === 'driving';
    if (input.consumePause() && running) {
      setPaused(!paused);
    }

    // 檔位：重來先回到 D 檔；切換檔位（鍵盤或觸控層）按一下就在 D↔R 之間換，不必先停車。暫停中或這一局已經結束時不換檔。
    gear = gearForFrame(gear, {
      restarted,
      toggles: input.consumeGearToggles() + touch.consumeGearToggles(),
      canShift: running && !paused,
    });

    // 切換鏡頭（鍵盤；螢幕上的「鏡頭」鍵在按下去的當下就切了）。
    if (input.consumeToggleCamera()) {
      cycleCamera();
    }

    // 暫停時時間不前進：不跑物理（計時也跟著停）、特效不動；畫面照畫，鏡頭仍可切換。
    // 點了螢幕上的鍵帽、正在等玩家按新的鍵時也一樣先停住，免得車自己滑走、計時白白流掉。
    const held = paused || touch.listening();
    const simSeconds = held ? 0 : frameSeconds;
    const loop = advanceFixedLoop(accumulatorSeconds, simSeconds);
    accumulatorSeconds = loop.accumulatorSeconds;
    // 鍵盤與觸控層的踏板合在一起，再套上檔位：油門往目前檔位的方向推（D 向前、R 向後），剎車只剎車。
    const pedals = held ? NO_PEDAL_INPUT : mergePedalInputs(input.pedalInput(), touch.pedalInput());
    const driveInput = driveInputForGear(pedals, gear);
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
    shownPose = pose;
    gameScene.update(pose, simSeconds);
    // 駕駛座視角要藏起玻璃，其他模式恢復。
    gameScene.setInteriorView(gameCamera.view() === 'cockpit');
    // 引擎蓋視角收斂烤漆的掠射反光，其他模式恢復。
    gameScene.setHoodView(gameCamera.view() === 'hood');
    gameScene.setLights(carLightsFor(driveInput, session.vehicle.speedMps, gear));
    gameCamera.update(pose, session.vehicle.speedMps, frameSeconds);
    // 跟車鏡頭：擋在鏡頭與車之間的擺設淡成半透明（暫停時也照真實時間淡，鏡頭仍可切換）。
    gameScene.fadeOccluders(
      gameCamera.camera.position,
      pose,
      isChaseView(gameCamera.view()),
      frameSeconds,
    );
    // 目標車位的發光標記：停妥後變綠再淡出，重來後回來（暫停時也照真實時間走）。
    gameScene.updateSpotGlow(session.parked, frameSeconds);
    pipeline.render(gameScene.scene, gameCamera.camera);
    hud.update(session, gear);
    // 觸控層只在能開車的時候顯示：暫停、結算、按鍵設定開著時收起來，不擋面板上的按鈕。
    touch.update(
      {
        driving:
          (session.status === 'ready' || session.status === 'driving') &&
          !paused &&
          !hud.controlsOpen(),
        gear,
      },
      frameSeconds,
    );
    // 倒車輔助層疊在剛畫好的主畫面上；看的是 HUD 顯示的同一個檔位。
    reverseAssist?.frame(
      gameScene.scene,
      pose,
      {
        reverseGear: gear === 'reverse',
        speedMps: session.vehicle.speedMps,
        running: session.status === 'ready' || session.status === 'driving',
      },
      frameSeconds,
    );

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

/**
 * 固定鏡頭截圖：同步跑 round(t × 60) 步物理（不等真實時間），
 * 用指定鏡頭畫一幀後定格，並在 `<body>` 設 `data-shot-ready="true"`。沒有 HUD、不接鍵盤。
 * 有參考路線的關卡（第 1 世界）沿參考路線跑，很大的 t = 停在車位裡；原型關沿示範路線跑；
 * 兩者都沒有的關卡不論 t 是多少都定格在起點。
 */
function runCameraShot(
  { renderer, quality, pipeline }: RenderContext,
  level: LevelDefinition,
  preset: CameraPreset,
  timeSeconds: number,
): void {
  const { spot, startState } = level.layout;
  // 示範路線結束後車已停住，再跑也不會變；超過的時間夾在路線長度，免得很大的 t 把分頁卡死。
  const demoSteps =
    level.id === PROTOTYPE_LEVEL.id
      ? Math.min(Math.round(timeSeconds * PHYSICS_HZ), DEMO_ROUTE_STEPS)
      : 0;
  const vehicle =
    vehicleOnRouteAt(level, timeSeconds) ?? demoVehicleAfterSteps(startState, demoSteps);

  const gameScene = createLevelScene(renderer, quality, level);
  gameScene.update(vehicle);
  // 閃電照同一個 t 走：雷雨的 `t=2` 正好是第一道（閃光＋電弧）；其他特效仍停在時間 0。
  gameScene.showWeatherAt(timeSeconds);
  // 這一張定格裡畫的是第幾道閃電的電弧（沒有在閃是 none）：寫在 <html data-lightning>，方便除錯與 e2e 確認。
  document.documentElement.dataset.lightning = String(gameScene.lightningStrike() ?? 'none');
  const camera = createPresetCamera(preset, vehicle.x, vehicle.z, spot);
  // 雨絲平常跟著車；定格的鏡頭可能離車很遠（車位旁、車位正上方），改成以鏡頭為中心才看得到雨。
  gameScene.centerRainOn(camera.position.x, camera.position.z);

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
  const gameScene = createLevelScene(renderer, quality, backdrop);
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
// 手機上不讓整頁被拖著捲動或雙指縮放（每種模式都適用；可以捲動的面板照常捲）。
preventPageGestures(document);

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
