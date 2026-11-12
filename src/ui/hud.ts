// 疊在畫布上的 HTML HUD：車速（mph）、倒數計時、碰撞次數、檔位、角度誤差、簡要操作說明、
// 語言切換按鈕、目前鏡頭名稱、成功／失敗的狀態面板（完整的結算畫面之後再做）。
// 所有文字都走翻譯鍵；語言切換時就地更新，不重新載入頁面。
import type { GameCameraView } from '../core/cameraView';
import { getLocale, onLocaleChange, setLocale, t, type Locale, type TranslationKey } from '../core/i18n';
import { mpsToMph, radToDeg } from '../core/units';
import { angleErrorRad } from '../level/parkingJudge';
import { UNLIMITED_RULES, stepsToSeconds, type FailReason } from '../level/scoring';
import type { Session } from '../level/session';
import type { DriveInput } from '../vehicle/bicycleModel';
import { formatStars, formatTime } from './format';

/** 車速顯示到小數第幾位；停車判定門檻是 0.5 mph，整數不夠看。 */
const SPEED_DECIMALS = 1;

/** 角度誤差顯示到小數第幾位；3 星的門檻是 3°。 */
const ANGLE_DECIMALS = 1;

/** 剩餘時間低於這個秒數，倒數會變色提醒。 */
const LOW_TIME_SECONDS = 10;

/** 檔位：前進或倒車。 */
export type Gear = 'forward' | 'reverse';

/** 檔位 → 儀表上的字母與名稱的翻譯鍵。 */
const GEAR_LABELS: Readonly<Record<Gear, { readonly letter: string; readonly key: TranslationKey }>> = {
  forward: { letter: 'D', key: 'hud.gearForward' },
  reverse: { letter: 'R', key: 'hud.gearReverse' },
};

/** 失敗原因 → 說明的翻譯鍵；少列一個原因會編譯失敗。 */
const FAIL_REASON_LABELS: Readonly<Record<FailReason, TranslationKey>> = {
  timeout: 'status.failTimeout',
  collisions: 'status.failCollisions',
};

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

/**
 * 檔位：車在動就看行進方向；停著就看油門（踩倒車 = 倒車檔）；
 * 停著又沒踩油門，維持上一次的檔位。
 */
export function gearFor(speedMps: number, throttle: DriveInput['throttle'], previous: Gear): Gear {
  const direction = speedMps !== 0 ? speedMps : throttle;
  if (direction === 0) {
    return previous;
  }
  return direction > 0 ? 'forward' : 'reverse';
}

/** 角度誤差文字：弧度換成度的絕對值，固定小數位，加度數符號。 */
export function formatAngleDeg(angleRad: number): string {
  return `${Math.abs(radToDeg(angleRad)).toFixed(ANGLE_DECIMALS)}°`;
}

/** 碰撞次數文字：`已撞次數 / 上限`；沒有上限就只顯示次數。 */
export function formatCollisions(collisions: number, maxCollisions: number): string {
  return Number.isFinite(maxCollisions) ? `${collisions} / ${maxCollisions}` : String(collisions);
}

/** HUD 每幀要顯示的內容（已經換成文字，方便比對有沒有變）。 */
export interface HudReadout {
  readonly speed: string;
  /** 倒數：剩餘時間 `m:ss.s`；還沒開始計時就是整個時間上限。 */
  readonly time: string;
  /** 剩餘時間是否偏低。 */
  readonly lowTime: boolean;
  readonly collisions: string;
  readonly angle: string;
  /** 狀態面板：null = 不顯示（還在開）。 */
  readonly outcome: 'parked' | 'failed' | null;
  /** 停妥的星數；其他時候是 null。 */
  readonly stars: number | null;
  readonly failReason: FailReason | null;
}

/** 由一局的現況算出 HUD 要顯示的內容。 */
export function hudReadout(session: Session): HudReadout {
  const rules = session.layout.rules ?? UNLIMITED_RULES;
  const remainingS = stepsToSeconds(Math.max(rules.timeLimitSteps - session.elapsedSteps, 0));
  return {
    speed: formatSpeedMph(session.vehicle.speedMps),
    time: formatTime(remainingS),
    lowTime: remainingS < LOW_TIME_SECONDS,
    collisions: formatCollisions(session.collisions, rules.maxCollisions),
    angle: formatAngleDeg(angleErrorRad(session.vehicle, session.layout.spot)),
    outcome: session.status === 'parked' || session.status === 'failed' ? session.status : null,
    stars: session.result?.stars ?? null,
    failReason: session.failReason,
  };
}

/** 按語言按鈕會切到的語言（只有兩種語言，就是另一種）。 */
export function otherLocale(locale: Locale): Locale {
  return locale === 'zh-TW' ? 'en' : 'zh-TW';
}

export interface Hud {
  /**
   * 每幀呼叫；顯示的文字有變才動 DOM。
   * 停妥顯示成功面板（含星數），失敗顯示失敗面板（含原因），重來後收起來。
   * @param session 這一局的現況
   * @param input 這一幀的駕駛輸入（決定停著時的檔位）
   */
  update(session: Session, input: DriveInput): void;
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

  // 行車資訊：上方置中一排。倒數、碰撞次數、檔位、角度誤差。
  const statsPanel = element('div', 'hud-panel hud-stats', root);
  function stat(id: string, label: TranslationKey): HTMLElement {
    const cell = element('div', 'hud-stat', statsPanel);
    translatedElement('span', 'hud-stat-label', cell, label);
    const value = element('span', 'hud-stat-value', cell);
    value.id = id;
    return value;
  }
  const timeValue = stat('hud-time', 'hud.time');
  const collisionsValue = stat('hud-collisions', 'hud.collisions');
  const gearValue = stat('hud-gear', 'hud.gear');
  const angleValue = stat('hud-angle', 'hud.angle');

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

  // 狀態面板：先隱藏，停妥或失敗才顯示；重來後再藏起來。
  // `data-status` 是 parked 或 failed；標題下面那一行，成功時是星數、失敗時是原因。
  const statusOverlay = element('div', 'hud-status', root);
  statusOverlay.id = 'hud-status';
  statusOverlay.setAttribute('role', 'status');
  statusOverlay.hidden = true;
  const statusPanel = element('div', 'hud-panel hud-status-panel', statusOverlay);
  const statusTitle = element('div', 'hud-status-title', statusPanel);
  const statusDetail = element('div', 'hud-status-detail', statusPanel);
  statusDetail.id = 'hud-status-detail';
  translatedElement('div', 'hud-status-hint', statusPanel, 'status.restartHint');

  let shown: HudReadout | undefined;
  let shownGear: Gear = 'forward';

  /** 檔位：字母 + 名稱（名稱跟著語言變）。 */
  function renderGear(): void {
    const label = GEAR_LABELS[shownGear];
    gearValue.dataset.gear = shownGear;
    gearValue.textContent = `${label.letter} ${t(label.key)}`;
  }

  /** 狀態面板的標題與說明（跟著語言變）。 */
  function renderOutcome(): void {
    const outcome = shown?.outcome ?? null;
    statusOverlay.hidden = outcome === null;
    if (outcome === null || shown === undefined) {
      delete statusOverlay.dataset.status;
      delete statusDetail.dataset.stars;
      return;
    }
    statusOverlay.dataset.status = outcome;
    if (outcome === 'parked') {
      statusTitle.textContent = t('status.parked');
      statusDetail.textContent = formatStars(shown.stars ?? 0);
      statusDetail.dataset.stars = String(shown.stars ?? 0);
    } else {
      statusTitle.textContent = t('status.failed');
      statusDetail.textContent =
        shown.failReason === null ? '' : t(FAIL_REASON_LABELS[shown.failReason]);
      delete statusDetail.dataset.stars;
    }
  }

  function renderTexts(): void {
    for (const entry of translated) {
      entry.element.textContent = t(entry.key);
    }
    renderGear();
    renderOutcome();
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

  return {
    update(session: Session, input: DriveInput): void {
      const next = hudReadout(session);
      const previous = shown;
      shown = next;
      if (next.speed !== previous?.speed) {
        speedValue.textContent = next.speed;
      }
      if (next.time !== previous?.time) {
        timeValue.textContent = next.time;
      }
      if (next.lowTime !== previous?.lowTime) {
        timeValue.dataset.low = String(next.lowTime);
      }
      if (next.collisions !== previous?.collisions) {
        collisionsValue.textContent = next.collisions;
      }
      if (next.angle !== previous?.angle) {
        angleValue.textContent = next.angle;
      }
      // 已經結束（停妥或失敗）就不再換檔位：車不會動了。
      const gear =
        next.outcome === null ? gearFor(session.vehicle.speedMps, input.throttle, shownGear) : shownGear;
      if (gear !== shownGear) {
        shownGear = gear;
        renderGear();
      }
      if (
        next.outcome !== previous?.outcome ||
        next.stars !== previous.stars ||
        next.failReason !== previous.failReason
      ) {
        renderOutcome();
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
