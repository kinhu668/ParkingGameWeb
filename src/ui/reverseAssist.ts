// 倒車輔助層：倒車時疊在畫面上的四個小畫面——左右後視鏡、上方並排的鳥瞰與倒後鏡頭。
// 畫面本身由 render/reverseAssistViews.ts 畫在主畫布上；這裡是疊在上面的 DOM：外框、名稱、
// 引導線（SVG：倒後鏡頭的綠／黃／紅距離帶與藍色中心虛線、鳥瞰的綠色倒車軌跡）與警告文字。
// 這是疊加層，不是鏡頭模式：V 鍵的鏡頭循環照舊，每個鏡頭模式下倒車都會出現。
import {
  ASSIST_VIEW_IDS,
  assistLayout,
  type AssistLayout,
  type AssistViewId,
} from '../core/assistLayout';
import { getLocale, onLocaleChange, type TranslationKey } from '../core/i18n';
import {
  ASSIST_HIDDEN,
  nextAssistVisibility,
  type AssistDriveState,
} from '../core/reverseAssist';
import type { QualitySettings } from '../render/quality';
import {
  createGuideProjector,
  createReverseAssistViews,
  type AssistSceneGuard,
} from '../render/reverseAssistViews';
import type { Scene, WebGLRenderer } from 'three';
import type { VehiclePose } from '../vehicle/bicycleModel';
import {
  rearCameraGuides,
  reversePathGuides,
  type GuideLine,
} from '../vehicle/reverseGuides';
import { createUiBuilder } from './dom';

/** 倒後鏡頭上方的警告：與真車一樣固定是英文；介面是中文時下面再加一行翻譯（assist.warning）。 */
export const REAR_CAMERA_WARNING = 'Check surroundings for safety.';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** 引導線的 SVG 座標：每個畫面都是 0–100 的正方形，拉伸到外框大小（線寬不跟著拉伸，見樣式）。 */
const SVG_SIZE = 100;
/** 方向盤角度量化到這個刻度（弧度）才重畫鳥瞰的軌跡，免得每幀都改 DOM。 */
const STEER_QUANTUM_RAD = 0.004;

/** 每個畫面的 DOM id 與名稱的翻譯鍵。 */
const VIEW_LABELS: Readonly<Record<AssistViewId, { readonly id: string; readonly key: TranslationKey }>> = {
  bird: { id: 'assist-bird', key: 'assist.bird' },
  rear: { id: 'assist-rear', key: 'assist.rear' },
  mirrorLeft: { id: 'assist-mirror-left', key: 'assist.mirrorLeft' },
  mirrorRight: { id: 'assist-mirror-right', key: 'assist.mirrorRight' },
};

export interface ReverseAssist {
  /**
   * 每個畫面幀、主畫面畫完之後呼叫：決定顯示與否（淡入淡出），顯示時畫四個畫面並更新引導線。
   * @param pose 算圖用的車輛姿態
   * @param frameSeconds 距離上一幀多久（真實時間；暫停時也照樣淡入淡出）
   */
  frame(scene: Scene, pose: VehiclePose, drive: AssistDriveState, frameSeconds: number): void;
  /** 重來：立刻收起（不淡出），新的一局從收起的狀態開始。下一次 frame 才會改到畫面。 */
  reset(): void;
}

/** 一條引導線的 SVG `points`：車身座標的地面點投影到這個畫面。 */
function polylinePoints(
  line: GuideLine,
  view: AssistViewId,
  project: ReturnType<typeof createGuideProjector>,
): string {
  return line.points
    .map((point) => {
      const { u, v } = project(view, point);
      return `${(u * SVG_SIZE).toFixed(2)},${(v * SVG_SIZE).toFixed(2)}`;
    })
    .join(' ');
}

/**
 * 在 root（#hud）裡建立倒車輔助層。一開始是收起的。
 * @param renderer 主畫布的 renderer（四個畫面貼在同一張畫布上）
 * @param drawScene 畫四個小畫面時包在外面的那一層（GameScene.drawAssistViews）：小畫面不套用跟車鏡頭的遮擋半透明、不畫車輪揚起的灰塵
 */
export function createReverseAssist(
  renderer: WebGLRenderer,
  quality: QualitySettings,
  root: HTMLElement,
  scene: Scene,
  drawScene?: AssistSceneGuard,
): ReverseAssist {
  const views = createReverseAssistViews(renderer, quality, drawScene);
  views.warmUp(scene);
  const project = createGuideProjector();
  const ui = createUiBuilder();

  // 放在 HUD 的最前面：結算與暫停面板在它上面。
  const container = document.createElement('div');
  container.id = 'reverse-assist';
  container.className = 'assist';
  container.dataset.visible = 'false';
  container.setAttribute('aria-hidden', 'true');
  root.prepend(container);

  const frames = {} as Record<AssistViewId, HTMLElement>;
  const guideLayers = {} as Record<AssistViewId, SVGSVGElement>;
  for (const view of ASSIST_VIEW_IDS) {
    const frame = ui.element('div', 'assist-view', container);
    frame.id = VIEW_LABELS[view].id;
    frame.dataset.view = view;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'assist-guides');
    svg.setAttribute('viewBox', `0 0 ${SVG_SIZE} ${SVG_SIZE}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    frame.append(svg);
    ui.translatedElement('span', 'assist-label', frame, VIEW_LABELS[view].key);
    frames[view] = frame;
    guideLayers[view] = svg;
  }

  function polyline(view: AssistViewId, line: GuideLine): SVGPolylineElement {
    const element = document.createElementNS(SVG_NS, 'polyline');
    element.setAttribute('class', 'assist-guide');
    element.dataset.color = line.color;
    element.dataset.dashed = String(line.dashed);
    element.setAttribute('points', polylinePoints(line, view, project));
    guideLayers[view].append(element);
    return element;
  }

  // 倒後鏡頭：固定的距離帶與中心虛線，加上方的警告文字。
  for (const line of rearCameraGuides()) {
    polyline('rear', line);
  }
  const warning = ui.element('div', 'assist-warning', frames.rear);
  warning.id = 'assist-warning';
  const warningEnglish = ui.element('span', 'assist-warning-line', warning);
  warningEnglish.lang = 'en';
  warningEnglish.textContent = REAR_CAMERA_WARNING;
  const warningLocal = ui.translatedElement('span', 'assist-warning-line', warning, 'assist.warning');
  warningLocal.id = 'assist-warning-local';

  // 鳥瞰：倒車軌跡跟著方向盤彎；線的條數固定，只改每條的點。
  const pathLines = reversePathGuides(0).map((line) => polyline('bird', line));
  let shownSteerStep: number | undefined;
  function renderPath(steerRad: number): void {
    const steerStep = Math.round(steerRad / STEER_QUANTUM_RAD);
    if (steerStep === shownSteerStep) {
      return;
    }
    shownSteerStep = steerStep;
    reversePathGuides(steerStep * STEER_QUANTUM_RAD).forEach((line, index) => {
      pathLines[index]?.setAttribute('points', polylinePoints(line, 'bird', project));
    });
  }

  function renderTexts(): void {
    ui.refreshTexts();
    // 介面是英文時第二行與第一行重複，不顯示。
    warningLocal.hidden = getLocale() === 'en';
  }
  renderTexts();
  onLocaleChange(renderTexts);

  let layout: AssistLayout | undefined;
  let layoutWidth = 0;
  let layoutHeight = 0;
  function fitLayout(): AssistLayout {
    const canvas = renderer.domElement;
    if (layout !== undefined && canvas.clientWidth === layoutWidth && canvas.clientHeight === layoutHeight) {
      return layout;
    }
    layoutWidth = canvas.clientWidth;
    layoutHeight = canvas.clientHeight;
    const next = assistLayout(layoutWidth, layoutHeight);
    for (const view of ASSIST_VIEW_IDS) {
      const rect = next[view];
      const { style } = frames[view];
      style.left = `${rect.x}px`;
      style.top = `${rect.y}px`;
      style.width = `${rect.width}px`;
      style.height = `${rect.height}px`;
    }
    layout = next;
    return next;
  }

  let visibility = ASSIST_HIDDEN;
  let shownOpacity = 0;

  return {
    frame(frameScene, pose, drive, frameSeconds) {
      visibility = nextAssistVisibility(visibility, drive, frameSeconds);
      const { opacity } = visibility;
      if (opacity !== shownOpacity) {
        const visible = opacity > 0;
        if (visible !== shownOpacity > 0) {
          container.dataset.visible = String(visible);
          container.setAttribute('aria-hidden', String(!visible));
        }
        container.style.opacity = opacity.toFixed(3);
        shownOpacity = opacity;
      }
      if (opacity <= 0) {
        // 讓算圖端知道已經收起：下次出現時四張都重畫。
        views.render(frameScene, pose, layout ?? fitLayout(), 0);
        return;
      }
      renderPath(pose.steerRad);
      views.render(frameScene, pose, fitLayout(), opacity);
    },
    reset() {
      visibility = ASSIST_HIDDEN;
    },
  };
}
