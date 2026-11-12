// 疊在畫布上的 HTML HUD：車速（mph）、倒數計時、碰撞次數、檔位、角度誤差、簡要操作說明、
// 語言切換按鈕、關卡選擇按鈕、目前鏡頭名稱、結算面板（results.ts）、暫停面板（pausePanel.ts）。
// 所有文字都走翻譯鍵；語言切換時就地更新，不重新載入頁面。
import type { GameCameraView } from '../core/cameraView';
import { onLocaleChange, t, type TranslationKey } from '../core/i18n';
import { mpsToMph } from '../core/units';
import { angleErrorRad } from '../level/parkingJudge';
import { UNLIMITED_RULES, stepsToSeconds, type FailReason } from '../level/scoring';
import type { Session } from '../level/session';
import type { DriveInput } from '../vehicle/bicycleModel';
import { createUiBuilder } from './dom';
import { formatAngleDeg, formatCollisions, formatTime } from './format';
import { createPausePanel } from './pausePanel';
import { createResultsPanel, resultReadout, type LevelActions } from './results';

// 這幾個函式搬到共用的檔案了；這裡照舊匯出，既有的呼叫端與測試不必改。
export { otherLocale } from './dom';
export { formatAngleDeg, formatCollisions } from './format';

/** 車速顯示到小數第幾位；停車判定門檻是 0.5 mph，整數不夠看。 */
const SPEED_DECIMALS = 1;

/** 剩餘時間低於這個秒數，倒數會變色提醒。 */
const LOW_TIME_SECONDS = 10;

/** 檔位：前進或倒車。 */
export type Gear = 'forward' | 'reverse';

/** 檔位 → 儀表上的字母與名稱的翻譯鍵。 */
const GEAR_LABELS: Readonly<Record<Gear, { readonly letter: string; readonly key: TranslationKey }>> = {
  forward: { letter: 'D', key: 'hud.gearForward' },
  reverse: { letter: 'R', key: 'hud.gearReverse' },
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
  { caps: [{ text: 'Esc' }], label: 'hud.controlPause' },
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
 * 檔位：踩油門（或倒車）而且車沒有往反方向走，就是踩的那個方向。
 * 其他情況維持上一次的檔位：沒踩油門的滑行、反向踩（那是在煞車，煞停後才換檔）、
 * 撞到東西被彈回去（玩家沒有換檔）。
 */
export function gearFor(speedMps: number, throttle: DriveInput['throttle'], previous: Gear): Gear {
  if (throttle === 0 || speedMps * throttle < 0) {
    return previous;
  }
  return throttle > 0 ? 'forward' : 'reverse';
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

export interface Hud {
  /**
   * 每幀呼叫；顯示的文字有變才動 DOM。
   * 停妥或失敗時顯示結算面板（星數或原因、時間、碰撞、角度誤差、按鈕），重來後收起來。
   * @param session 這一局的現況
   * @param input 這一幀的駕駛輸入（決定停著時的檔位）
   */
  update(session: Session, input: DriveInput): void;
  /**
   * 顯示目前的鏡頭名稱（進場與每次切換時呼叫）：短暫出現後淡出。
   * 淡出只是看不見，`#hud-camera` 的文字與 `data-view` 一直留著。
   */
  showCameraView(view: GameCameraView): void;
  /** 顯示或收起暫停面板（Esc）。 */
  setPaused(paused: boolean): void;
}

/**
 * 在 root 裡建立 HUD，並訂閱語言切換。
 * @param actions 結算與暫停面板、關卡選擇按鈕要做的事
 * @param resume 暫停面板按「繼續」要做的事
 */
export function createHud(root: HTMLElement, actions: LevelActions, resume: () => void): Hud {
  const ui = createUiBuilder();
  const { element, translatedElement } = ui;

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

  // 右上角：語言按鈕（顯示「會切到的語言」的名稱），下面是回關卡選擇的按鈕。
  const cornerButtons = element('div', 'hud-corner', root);
  ui.languageButton('hud-language', 'hud-panel hud-button', cornerButtons);
  ui.button(
    'hud-level-select',
    'hud-panel hud-button',
    cornerButtons,
    'result.levelSelect',
    actions.levelSelect,
  );

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

  // 結算面板（停妥或失敗才顯示）與暫停面板（Esc）。
  const results = createResultsPanel(ui, root, actions);
  const pausePanel = createPausePanel(ui, root, actions, resume);

  let shown: HudReadout | undefined;
  let shownGear: Gear = 'forward';

  /** 檔位：字母 + 名稱（名稱跟著語言變）。 */
  function renderGear(): void {
    const label = GEAR_LABELS[shownGear];
    gearValue.dataset.gear = shownGear;
    gearValue.textContent = `${label.letter} ${t(label.key)}`;
  }

  function renderTexts(): void {
    ui.refreshTexts();
    renderGear();
    if (shownView !== undefined) {
      cameraLabel.textContent = t(cameraViewLabelKey(shownView));
    }
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
        results.show(resultReadout(session));
      }
    },
    setPaused(paused: boolean): void {
      pausePanel.setVisible(paused);
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
