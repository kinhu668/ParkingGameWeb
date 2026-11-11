// 疊在畫布上的 HTML HUD：車速（mph）、簡要操作說明、語言切換按鈕、目前鏡頭名稱、停車成功畫面。
// 所有文字都走翻譯鍵；語言切換時就地更新，不重新載入頁面。
import type { GameCameraView } from '../core/cameraView';
import { getLocale, onLocaleChange, setLocale, t, type Locale, type TranslationKey } from '../core/i18n';
import { mpsToMph } from '../core/units';

/** 車速顯示到小數第幾位；停車判定門檻是 0.5 mph，整數不夠看。 */
const SPEED_DECIMALS = 1;

/** 鏡頭名稱出現後多久完全淡出（毫秒），以及其中維持不透明的比例。 */
const CAMERA_LABEL_FADE_MS = 2600;
const CAMERA_LABEL_HOLD_FRACTION = 0.65;

/** 鏡頭模式 → 名稱的翻譯鍵；少列一個模式會編譯失敗。 */
const CAMERA_VIEW_LABELS: Readonly<Record<GameCameraView, TranslationKey>> = {
  chase_near: 'camera.chase_near',
  chase_far: 'camera.chase_far',
  hood: 'camera.hood',
  cockpit: 'camera.cockpit',
  top: 'camera.top',
};

/** 鍵帽上的字：實體鍵的字母直接寫，有名字的鍵（空白鍵）走翻譯鍵。 */
type KeyCap = { readonly text: string } | { readonly key: TranslationKey };

/** 操作說明的每一列：鍵帽 + 動作名稱。 */
const CONTROL_ROWS: readonly { readonly caps: readonly KeyCap[]; readonly label: TranslationKey }[] = [
  { caps: [{ text: 'W' }, { text: 'S' }], label: 'hud.controlDrive' },
  { caps: [{ text: 'A' }, { text: 'D' }], label: 'hud.controlSteer' },
  { caps: [{ key: 'hud.keySpace' }], label: 'hud.controlHandbrake' },
  { caps: [{ text: 'R' }], label: 'hud.controlRestart' },
  { caps: [{ text: 'V' }], label: 'hud.controlCamera' },
];

/** 這個鏡頭模式的名稱翻譯鍵。 */
export function cameraViewLabelKey(view: GameCameraView): TranslationKey {
  return CAMERA_VIEW_LABELS[view];
}

/** 車速文字：m/s 換成 mph 的絕對值（倒車也顯示正數），固定小數位。 */
export function formatSpeedMph(speedMps: number): string {
  return Math.abs(mpsToMph(speedMps)).toFixed(SPEED_DECIMALS);
}

/** 按語言按鈕會切到的語言（只有兩種語言，就是另一種）。 */
export function otherLocale(locale: Locale): Locale {
  return locale === 'zh-TW' ? 'en' : 'zh-TW';
}

export interface Hud {
  /** 每幀呼叫；車速文字或「已停妥」有變才動 DOM。parked 為 true 時顯示成功畫面。 */
  update(speedMps: number, parked: boolean): void;
  /**
   * 顯示目前的鏡頭名稱（進場與每次切換時呼叫）：短暫出現後淡出。
   * 淡出只是看不見，`#hud-camera` 的文字與 `data-view` 一直留著。
   */
  showCameraView(view: GameCameraView): void;
}

/** 在 root 裡建立 HUD，並訂閱語言切換。 */
export function createHud(root: HTMLElement): Hud {
  /** 內容是翻譯文字的元素；語言切換時全部重填。 */
  const translated: { readonly element: HTMLElement; readonly key: TranslationKey }[] = [];

  function element(tag: string, className: string, parent: HTMLElement): HTMLElement {
    const created = document.createElement(tag);
    created.className = className;
    parent.append(created);
    return created;
  }

  function translatedElement(
    tag: string,
    className: string,
    parent: HTMLElement,
    key: TranslationKey,
  ): HTMLElement {
    const created = element(tag, className, parent);
    translated.push({ element: created, key });
    return created;
  }

  // 車速
  const speedPanel = element('div', 'hud-panel hud-speed', root);
  translatedElement('span', 'hud-speed-label', speedPanel, 'hud.speed');
  const speedValue = element('span', 'hud-speed-value', speedPanel);
  speedValue.id = 'hud-speed';
  translatedElement('span', 'hud-speed-unit', speedPanel, 'hud.speedUnit');

  // 語言按鈕：顯示「會切到的語言」的名稱。
  const languageButton = document.createElement('button');
  languageButton.type = 'button';
  languageButton.id = 'hud-language';
  languageButton.className = 'hud-panel hud-language';
  root.append(languageButton);
  translated.push({ element: languageButton, key: 'hud.languageTarget' });
  // 用滑鼠點按鈕時不讓它拿走鍵盤焦點，否則之後按空白鍵（手煞車）會再觸發一次按鈕。
  languageButton.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  languageButton.addEventListener('click', () => {
    setLocale(otherLocale(getLocale()));
  });

  // 操作說明
  const controlsPanel = element('div', 'hud-panel hud-controls', root);
  translatedElement('div', 'hud-controls-title', controlsPanel, 'hud.controls');
  const controlsList = element('dl', 'hud-controls-list', controlsPanel);
  for (const row of CONTROL_ROWS) {
    const caps = element('dt', 'hud-controls-keys', controlsList);
    for (const cap of row.caps) {
      if ('key' in cap) {
        translatedElement('kbd', 'hud-key', caps, cap.key);
      } else {
        element('kbd', 'hud-key', caps).textContent = cap.text;
      }
    }
    translatedElement('dd', 'hud-controls-action', controlsList, row.label);
  }

  // 鏡頭名稱：下方置中。還沒呼叫 showCameraView 之前是空的。
  const cameraLabel = element('div', 'hud-panel hud-camera', root);
  cameraLabel.id = 'hud-camera';
  cameraLabel.setAttribute('role', 'status');
  let shownView: GameCameraView | undefined;
  let cameraLabelFade: Animation | undefined;

  // 停車成功畫面：先隱藏，已停妥才顯示；重來後再藏起來。
  const statusOverlay = element('div', 'hud-status', root);
  statusOverlay.id = 'hud-status';
  statusOverlay.setAttribute('role', 'status');
  statusOverlay.hidden = true;
  const statusPanel = element('div', 'hud-panel hud-status-panel', statusOverlay);
  translatedElement('div', 'hud-status-title', statusPanel, 'status.parked');
  translatedElement('div', 'hud-status-hint', statusPanel, 'status.restartHint');

  function renderTexts(): void {
    for (const entry of translated) {
      entry.element.textContent = t(entry.key);
    }
    if (shownView !== undefined) {
      cameraLabel.textContent = t(cameraViewLabelKey(shownView));
    }
    // 按鈕上的字是另一種語言寫的，標上 lang 讓字型與螢幕報讀正確。
    languageButton.lang = otherLocale(getLocale());
    const languageHint = t('hud.language');
    languageButton.title = languageHint;
    languageButton.setAttribute('aria-label', `${languageHint}: ${t('hud.languageTarget')}`);
  }

  renderTexts();
  onLocaleChange(renderTexts);

  let shownSpeed = '';
  let shownParked = false;
  return {
    update(speedMps: number, parked: boolean): void {
      const text = formatSpeedMph(speedMps);
      if (text !== shownSpeed) {
        shownSpeed = text;
        speedValue.textContent = text;
      }
      if (parked !== shownParked) {
        shownParked = parked;
        statusOverlay.hidden = !parked;
      }
    },
    showCameraView(view: GameCameraView): void {
      shownView = view;
      cameraLabel.dataset.view = view;
      cameraLabel.textContent = t(cameraViewLabelKey(view));
      // 重新從不透明開始：先停掉上一次還沒跑完的淡出。
      cameraLabelFade?.cancel();
      cameraLabelFade = cameraLabel.animate(
        [{ opacity: 1 }, { opacity: 1, offset: CAMERA_LABEL_HOLD_FRACTION }, { opacity: 0 }],
        { duration: CAMERA_LABEL_FADE_MS, fill: 'forwards' },
      );
    },
  };
}
