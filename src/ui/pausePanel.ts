// 暫停面板（預設 Esc）：繼續／重來／關卡選擇／按鍵設定／音效（靜音、音量、背景音樂）。掛在 HUD 的 `#hud-pause` 裡，平常隱藏。
import { t, type TranslationKey } from '../core/i18n';
import { MAX_VOLUME, type AudioSettings } from '../core/save';
import { fillTemplate } from './controlsPanel';
import type { UiBuilder } from './dom';
import type { LevelActions } from './results';

/** 按一下「−」或「＋」音量變多少（0–100）。 */
export const VOLUME_STEP = 10;

/** 音量與靜音的存取：HUD 的靜音鈕與暫停面板的音效列用同一份。 */
export interface AudioAccess {
  current(): AudioSettings;
  /** 玩家改了音量或靜音：立刻套用並存起來。 */
  change(next: AudioSettings): void;
}

/** 按一下「−」（direction −1）或「＋」（+1）之後的設定：音量夾在 0–100；調高音量會順便取消靜音。 */
export function volumeStepped(audio: AudioSettings, direction: -1 | 1): AudioSettings {
  const volume = Math.min(Math.max(audio.volume + direction * VOLUME_STEP, 0), MAX_VOLUME);
  return { ...audio, volume, muted: direction > 0 ? false : audio.muted };
}

/** 靜音鈕上的字：寫的是「按下去會做的事」（還沒靜音時是「靜音」）。 */
export function muteLabelKey(audio: AudioSettings): TranslationKey {
  return audio.muted ? 'audio.unmute' : 'audio.mute';
}

/** 音樂鈕上的字：寫的是「按下去會做的事」（音樂開著時是「關閉音樂」）。 */
export function musicLabelKey(audio: AudioSettings): TranslationKey {
  return audio.music ? 'audio.musicOff' : 'audio.musicOn';
}

/** 音量的讀數，例如 `70%`。 */
export function formatVolume(audio: AudioSettings): string {
  return `${audio.volume}%`;
}

export interface PausePanel {
  /** 顯示或收起面板。 */
  setVisible(visible: boolean): void;
  /** 音量、靜音或語言變了之後呼叫：音效列照現況重畫。 */
  refreshAudio(): void;
}

/**
 * 在 root 裡建立暫停面板（一開始隱藏）。文字由 ui.refreshTexts 填。
 * @param resume 按「繼續」要做的事
 * @param openControls 按「按鍵設定」要做的事
 * @param pauseKeys 目前綁在「暫停」上的鍵（提示文字用）
 * @param audio 音量與靜音的存取（改了之後由擁有者呼叫 refreshAudio）
 */
export function createPausePanel(
  ui: UiBuilder,
  root: HTMLElement,
  actions: LevelActions,
  resume: () => void,
  openControls: () => void,
  pauseKeys: () => string,
  audio: AudioAccess,
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
  const settings = ui.element('div', 'panel-actions', panel);
  ui.button('pause-controls', 'panel-button', settings, 'pause.controls', openControls);
  // 音效列：靜音鈕、「−」、讀數、「＋」。不用滑桿：方向鍵是開車的鍵（core/input.ts 一律 preventDefault）。
  const sound = ui.element('div', 'panel-sound', panel);
  ui.translatedElement('span', 'panel-sound-title', sound, 'audio.title');
  const mute = ui.plainButton('pause-mute', 'panel-button', sound);
  mute.addEventListener('click', () => {
    const current = audio.current();
    audio.change({ ...current, muted: !current.muted });
  });
  const stepButton = (id: string, text: string, direction: -1 | 1): HTMLButtonElement => {
    const created = ui.plainButton(id, 'panel-button panel-button-step', sound);
    created.textContent = text;
    created.addEventListener('click', () => {
      audio.change(volumeStepped(audio.current(), direction));
    });
    return created;
  };
  const down = stepButton('pause-volume-down', '−', -1);
  const readout = ui.element('span', 'panel-sound-value', sound);
  readout.id = 'pause-volume';
  readout.setAttribute('role', 'status');
  const up = stepButton('pause-volume-up', '＋', 1);
  // 背景音樂的開關：自己一列（音效列在窄螢幕上已經排滿了）。靜音時一樣沒有音樂。
  const music = ui.plainButton('pause-music', 'panel-button', ui.element('div', 'panel-sound', panel));
  music.addEventListener('click', () => {
    const current = audio.current();
    audio.change({ ...current, music: !current.music });
  });
  // 手機側邊的靜音開關會讓網頁沒有聲音：只在觸控裝置顯示（樣式看 `#hud[data-keys]`）。
  ui.translatedElement('div', 'panel-sound-hint', panel, 'audio.silentHint');
  ui.translatedElement('div', 'hud-status-hint', panel, 'pause.hint', (text) =>
    fillTemplate(text, { key: pauseKeys() }),
  );

  return {
    setVisible(visible: boolean): void {
      overlay.hidden = !visible;
    },
    refreshAudio(): void {
      const current = audio.current();
      const muteText = t(muteLabelKey(current));
      mute.textContent = muteText;
      mute.setAttribute('aria-label', muteText);
      down.setAttribute('aria-label', t('audio.volumeDown'));
      down.disabled = current.volume <= 0;
      up.setAttribute('aria-label', t('audio.volumeUp'));
      up.disabled = current.volume >= MAX_VOLUME;
      readout.textContent = formatVolume(current);
      readout.setAttribute('aria-label', `${t('audio.volume')} ${formatVolume(current)}`);
      readout.dataset.muted = String(current.muted);
      const musicText = t(musicLabelKey(current));
      music.textContent = musicText;
      music.setAttribute('aria-label', musicText);
      music.dataset.music = String(current.music);
    },
  };
}
