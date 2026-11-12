// 暫停面板（Esc）：繼續／重來／關卡選擇。掛在 HUD 的 `#hud-pause` 裡，平常隱藏。
import type { UiBuilder } from './dom';
import type { LevelActions } from './results';

export interface PausePanel {
  /** 顯示或收起面板。 */
  setVisible(visible: boolean): void;
}

/**
 * 在 root 裡建立暫停面板（一開始隱藏）。文字由 ui.refreshTexts 填。
 * @param resume 按「繼續」要做的事
 */
export function createPausePanel(
  ui: UiBuilder,
  root: HTMLElement,
  actions: LevelActions,
  resume: () => void,
): PausePanel {
  const overlay = ui.element('div', 'hud-status hud-pause', root);
  overlay.id = 'hud-pause';
  overlay.setAttribute('role', 'dialog');
  overlay.hidden = true;
  const panel = ui.element('div', 'hud-panel hud-status-panel', overlay);
  ui.translatedElement('div', 'hud-status-title', panel, 'pause.title');
  const buttons = ui.element('div', 'panel-actions', panel);
  ui.button('pause-resume', 'panel-button panel-button-primary', buttons, 'pause.resume', resume);
  ui.button('pause-retry', 'panel-button', buttons, 'result.retry', actions.restart);
  ui.button('pause-select', 'panel-button', buttons, 'result.levelSelect', actions.levelSelect);
  ui.translatedElement('div', 'hud-status-hint', panel, 'pause.hint');

  return {
    setVisible(visible: boolean): void {
      overlay.hidden = !visible;
    },
  };
}
