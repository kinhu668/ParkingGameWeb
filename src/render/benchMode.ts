// `?bench`：以真實時間照固定示範路線的輸入跑一遍，量幀時間與 draw calls，結束後把統計值
// 寫到畫面上的 #bench-result（文字 + data-result 的 JSON）與 console。沒有 HUD、不接鍵盤。
// 畫面與一般遊戲走同一條管線（含後製），所以 draw calls 是「整幀」的數字：場景、陰影貼圖，
// 加上後製鏈每個全螢幕濾鏡各一次（環境光遮蔽還會把場景多畫一遍法線）。
// 數字跟畫質級別有關，所以級別寫在 #bench-result 的 data-quality 上。
import { advanceFixedLoop } from '../core/fixedLoop';
import { FIXED_STEP_SECONDS } from '../core/gameConfig';
import { t, type TranslationKey } from '../core/i18n';
import { msToS } from '../core/units';
import { parseFxOffParam } from '../core/urlParams';
import { resolveWeather } from '../core/weather';
import { DEMO_ROUTE_SECONDS, demoInputAtStep } from '../level/demoRoute';
import type { LevelDefinition } from '../level/levelSchema';
import { interpolateVehiclePose, stepVehicle } from '../vehicle/bicycleModel';
import { computeBenchStats, type BenchSample, type BenchStats } from './benchStats';
import { createFollowCamera } from './followCamera';
import { BENCH_CONFIG } from './renderConfig';
import type { RenderContext } from './renderContext';
import { createGameScene } from './scene';

/** 把統計值填進結果面板：每個數字一列「名稱 + 值」，完整數值放在 data-result。 */
function showResult(panel: HTMLElement, stats: BenchStats): void {
  const rows: readonly (readonly [TranslationKey, string])[] = [
    ['bench.avgFps', stats.avgFps.toFixed(BENCH_CONFIG.decimals)],
    ['bench.low1', stats.low1Fps.toFixed(BENCH_CONFIG.decimals)],
    ['bench.drawCalls', stats.drawCallsAvg.toFixed(BENCH_CONFIG.decimals)],
    ['bench.drawCallsMax', String(stats.drawCallsMax)],
  ];
  const list = document.createElement('dl');
  list.className = 'bench-rows';
  for (const [key, value] of rows) {
    const label = document.createElement('dt');
    label.textContent = t(key);
    const number = document.createElement('dd');
    number.textContent = value;
    list.append(label, number);
  }
  panel.replaceChildren(list);
  panel.dataset.result = JSON.stringify(stats);
}

/**
 * 啟動效能測試。
 * 示範路線的輸入是照原型關調的；在別的關只是讓車在那個場景裡動起來（量的是算圖成本，不是玩法）。
 */
export function runBench(
  { renderer, quality, pipeline }: RenderContext,
  level: LevelDefinition,
): void {
  const { spot, startState: start } = level.layout;
  const gameScene = createGameScene(
    renderer,
    quality,
    spot,
    start,
    level,
    resolveWeather(window.location.search, level.weather),
    !parseFxOffParam(window.location.search),
  );
  const followCamera = createFollowCamera(start.x, start.z);

  const panel = document.createElement('div');
  panel.id = 'bench-result';
  panel.className = 'hud-panel mode-panel';
  panel.dataset.quality = quality.level;
  panel.textContent = t('bench.running');
  document.body.append(panel);

  let previousVehicle = start;
  let vehicle = start;
  let stepIndex = 0;
  let accumulatorSeconds = 0;
  let lastFrameMs: number | undefined;
  /** 第一幀之後經過的真實時間；不受單幀時間上限影響。 */
  let elapsedSeconds = 0;
  let warmupFramesLeft = BENCH_CONFIG.warmupFrames;
  const samples: BenchSample[] = [];

  function frame(nowMs: number): void {
    const frameSeconds = lastFrameMs === undefined ? 0 : Math.max(msToS(nowMs - lastFrameMs), 0);
    const isFirstFrame = lastFrameMs === undefined;
    lastFrameMs = nowMs;
    elapsedSeconds += frameSeconds;

    const loop = advanceFixedLoop(accumulatorSeconds, frameSeconds);
    accumulatorSeconds = loop.accumulatorSeconds;
    for (let step = 0; step < loop.steps; step += 1) {
      previousVehicle = vehicle;
      vehicle = stepVehicle(vehicle, demoInputAtStep(stepIndex), FIXED_STEP_SECONDS);
      stepIndex += 1;
    }

    const pose = interpolateVehiclePose(previousVehicle, vehicle, loop.alpha);
    gameScene.update(pose, frameSeconds);
    followCamera.update(pose.x, pose.z, frameSeconds);
    pipeline.render(gameScene.scene, followCamera.camera);

    // 第一幀沒有「與上一幀的間隔」，不算；接著略過暖機的幀，之後每幀記一筆。
    if (!isFirstFrame) {
      if (warmupFramesLeft > 0) {
        warmupFramesLeft -= 1;
      } else {
        samples.push({ frameSeconds, drawCalls: pipeline.drawCalls() });
      }
    }

    // 跑滿路線的時間就結束；幀率極低時多跑一下，至少量到算得出統計的幀數。
    if (
      elapsedSeconds >= DEMO_ROUTE_SECONDS &&
      samples.length >= BENCH_CONFIG.minMeasuredFrames
    ) {
      const stats = computeBenchStats(samples);
      showResult(panel, stats);
      console.log(`[bench] ${JSON.stringify(stats)}`);
      return;
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
