// 結算面板：停妥（成功）或失敗後顯示。成功有星數，失敗有原因；兩者都列出時間、碰撞、角度誤差，
// 以及下一關／重來／關卡選擇的按鈕。掛在 HUD 的 `#hud-status` 裡；還在開的時候整塊隱藏。
import { onLocaleChange, t, type TranslationKey } from '../core/i18n';
import { angleErrorRad } from '../level/parkingJudge';
import { UNLIMITED_RULES, stepsToSeconds, type FailReason } from '../level/scoring';
import type { Session } from '../level/session';
import { fillTemplate } from './controlsPanel';
import type { UiBuilder } from './dom';
import { formatAngleDeg, formatCollisions, formatStars, formatTime } from './format';

/** 失敗原因 → 說明的翻譯鍵；少列一個原因會編譯失敗。 */
const FAIL_REASON_LABELS: Readonly<Record<FailReason, TranslationKey>> = {
  timeout: 'status.failTimeout',
  collisions: 'status.failCollisions',
};

/** 結算面板要顯示的內容（數值已經換成文字）。 */
export interface ResultReadout {
  readonly outcome: 'parked' | 'failed';
  /** 停妥的星數；失敗是 null。 */
  readonly stars: number | null;
  /** 失敗原因；停妥是 null。 */
  readonly failReason: FailReason | null;
  /** 花掉的時間 `m:ss.s`：停妥是成績時間，失敗是到失敗那一步為止。 */
  readonly time: string;
  readonly collisions: string;
  /** 結束當下車頭與車位方向的夾角。 */
  readonly angle: string;
}

/** 由一局的現況算出結算內容；還沒結束（ready、driving）回傳 null。 */
export function resultReadout(session: Session): ResultReadout | null {
  if (session.status !== 'parked' && session.status !== 'failed') {
    return null;
  }
  const rules = session.layout.rules ?? UNLIMITED_RULES;
  const { result } = session;
  return {
    outcome: session.status,
    stars: result?.stars ?? null,
    failReason: session.failReason,
    time: formatTime(stepsToSeconds(result?.timeSteps ?? session.elapsedSteps)),
    collisions: formatCollisions(result?.collisions ?? session.collisions, rules.maxCollisions),
    angle: formatAngleDeg(result?.angleErrorRad ?? angleErrorRad(session.vehicle, session.layout.spot)),
  };
}

/** 結算與暫停面板上的按鈕要做的事；怎麼做（頁內重來、換網址）由 main.ts 決定。 */
export interface LevelActions {
  /** 重來：留在這一頁，車回起點。 */
  readonly restart: () => void;
  /** 回關卡選擇。 */
  readonly levelSelect: () => void;
  /** 進下一關；這一關沒有下一關（最後一關、原型關）就是 undefined，不顯示按鈕。 */
  readonly nextLevel: (() => void) | undefined;
}

export interface ResultsPanel {
  /** 顯示這份結算；null = 收起來。內容沒變也可以重複呼叫。 */
  show(readout: ResultReadout | null): void;
}

/**
 * 在 root 裡建立結算面板（一開始隱藏），並訂閱語言切換。
 * `#hud-status[data-status]` 是 parked 或 failed；成功時 `#result-stars[data-stars]` 是星數。
 * @param restartKeys 目前綁在「重來」上的鍵（提示文字用）
 */
export function createResultsPanel(
  ui: UiBuilder,
  root: HTMLElement,
  actions: LevelActions,
  restartKeys: () => string,
): ResultsPanel {
  const overlay = ui.element('div', 'hud-status', root);
  overlay.id = 'hud-status';
  overlay.setAttribute('role', 'status');
  overlay.hidden = true;
  const panel = ui.element('div', 'hud-panel hud-status-panel', overlay);
  const title = ui.element('div', 'hud-status-title', panel);
  // 標題下面那一行：成功時是星數、失敗時是原因。
  const detail = ui.element('div', 'hud-status-detail', panel);
  detail.id = 'hud-status-detail';
  const starsText = document.createElement('span');
  starsText.id = 'result-stars';

  // 時間、碰撞、角度誤差。
  const rows = ui.element('dl', 'result-rows', panel);
  function row(id: string, label: TranslationKey): HTMLElement {
    ui.translatedElement('dt', 'result-label', rows, label);
    const value = ui.element('dd', 'result-value', rows);
    value.id = id;
    return value;
  }
  const timeValue = row('result-time', 'result.time');
  const collisionsValue = row('result-collisions', 'result.collisions');
  const angleValue = row('result-angle', 'result.angle');

  // 按鈕：下一關只在過關而且真的有下一關時出現。
  const buttons = ui.element('div', 'panel-actions', panel);
  const { nextLevel } = actions;
  const nextButton =
    nextLevel === undefined
      ? undefined
      : ui.button('result-next', 'panel-button panel-button-primary', buttons, 'result.next', nextLevel);
  ui.button('result-retry', 'panel-button', buttons, 'result.retry', actions.restart);
  ui.button('result-select', 'panel-button', buttons, 'result.levelSelect', actions.levelSelect);
  ui.translatedElement('div', 'hud-status-hint', panel, 'status.restartHint', (text) =>
    fillTemplate(text, { key: restartKeys() }),
  );

  let shown: ResultReadout | null = null;

  function render(): void {
    overlay.hidden = shown === null;
    if (shown === null) {
      delete overlay.dataset.status;
      delete detail.dataset.stars;
      return;
    }
    overlay.dataset.status = shown.outcome;
    if (shown.outcome === 'parked') {
      const stars = shown.stars ?? 0;
      title.textContent = t('status.parked');
      starsText.textContent = formatStars(stars);
      starsText.dataset.stars = String(stars);
      detail.replaceChildren(starsText);
      detail.dataset.stars = String(stars);
    } else {
      title.textContent = t('status.failed');
      detail.textContent = shown.failReason === null ? '' : t(FAIL_REASON_LABELS[shown.failReason]);
      delete detail.dataset.stars;
    }
    timeValue.textContent = shown.time;
    collisionsValue.textContent = shown.collisions;
    angleValue.textContent = shown.angle;
    if (nextButton !== undefined) {
      nextButton.hidden = shown.outcome !== 'parked';
    }
  }

  onLocaleChange(render);

  return {
    show(readout: ResultReadout | null): void {
      shown = readout;
      render();
    },
  };
}
