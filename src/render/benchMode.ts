// `?bench`：以真實時間沿固定示範路線跑一遍，量幀時間與 draw calls，結束後把統計值
// 寫到畫面上的 #bench-result（文字 + data-result 的 JSON）與 console。沒有 HUD、不接鍵盤。
import { advanceFixedLoop } from '../core/fixedLoop';
import { FIXED_STEP_SECONDS } from '../core/gameConfig';
import { t, type TranslationKey } from '../core/i18n';
import { msToS } from '../core/units';
import { DEMO_ROUTE_SECONDS, demoInputAtStep } from '../level/demoRoute';
import { PROTOTYPE_LAYOUT } from '../level/prototypeLayout';
import { interpolateVehiclePose, stepVehicle } from '../vehicle/bicycleModel';
import { computeBenchStats, type BenchSample, type BenchStats } from './benchStats';
import { createFollowCamera } from './followCamera';
import { BENCH_CONFIG } from './renderConfig';
import { createRenderer, fitRendererToCanvas } from './renderer';
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

/** 啟動效能測試。 */
export function runBench(canvas: HTMLCanvasElement): void {
  const renderer = createRenderer(canvas);
  const gameScene = createGameScene(renderer.capabilities.getMaxAnisotropy(), PROTOTYPE_LAYOUT.spot);
  const start = PROTOTYPE_LAYOUT.startState;
  const followCamera = createFollowCamera(start.x, start.z);

  const panel = document.createElement('div');
  panel.id = 'bench-result';
  panel.className = 'hud-panel mode-panel';
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
    gameScene.update(pose);
    followCamera.update(pose.x, pose.z, frameSeconds);
    fitRendererToCanvas(renderer, followCamera.camera);
    renderer.render(gameScene.scene, followCamera.camera);

    // 第一幀沒有「與上一幀的間隔」，不算；接著略過暖機的幀，之後每幀記一筆。
    if (!isFirstFrame) {
      if (warmupFramesLeft > 0) {
        warmupFramesLeft -= 1;
      } else {
        samples.push({ frameSeconds, drawCalls: renderer.info.render.calls });
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
