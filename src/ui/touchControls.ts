// 螢幕操作層：手機用手指、桌面用滑鼠都能開車的螢幕按鈕——左下的虛擬方向盤（拖曳旋轉、放開回正）、
// 右下的剎車與油門踏板（可同時踩，各自記自己的手指），加上切換檔位、暫停、重來、切換鏡頭。預設顯示，`?touch=off` 才隱藏。
// 用 Pointer Events：每根手指有自己的 pointerId，所以一邊轉方向盤一邊踩踏板互不干擾；滑鼠也是同一套事件。
// 有鍵盤的裝置（主要指標不是手指）每個控制項上還有一顆鍵帽，寫著目前綁的鍵；點鍵帽（不是控制項本體）再按新的鍵就改綁，
// 走的是與按鍵設定面板相同的改鍵流程（controlsPanel.ts 的 createRebindFlow）。拖方向盤、踩踏板本體永遠是開車。
// 位置由 core/touchLayout.ts 算（排在倒車輔助小窗的下面）；踏板與方向盤的換算在 core/touchInput.ts。
import { onLocaleChange, t, type TranslationKey } from '../core/i18n';
import {
  NO_TOUCH_DRIVE,
  keyboardHintsEnabled,
  touchPedalInput,
  touchLayerEnabled,
  wheelAngleAfterDrag,
  wheelAngleAfterRelease,
  type WheelPoint,
} from '../core/touchInput';
import {
  TOUCH_KEY_BADGES,
  TOUCH_KEY_SLOT,
  keyBadgePosition,
  touchKeyCode,
  type TouchKeyBadge,
} from '../core/touchKeys';
import { TOUCH_CONTROL_IDS, touchLayout, type TouchControlId } from '../core/touchLayout';
import { radToDeg } from '../core/units';
import type { TouchParam } from '../core/urlParams';
import { INITIAL_GEAR, type Gear, type PedalInput } from '../vehicle/gearbox';
import {
  ACTION_LABELS,
  createRebindFlow,
  fillTemplate,
  keyText,
  type ControlsAccess,
  type RebindMessage,
} from './controlsPanel';
import { createUiBuilder } from './dom';
import { GEAR_LABELS } from './format';

/** 操作層上的按鈕要做的事（暫停、重來、切換鏡頭）；怎麼做由 main.ts 決定。 */
export interface TouchActions {
  readonly pause: () => void;
  readonly restart: () => void;
  /** 換到循環順序的下一個鏡頭（與切換鏡頭鍵同一條路）。 */
  readonly camera: () => void;
}

/** 每幀交給觸控層的遊戲狀態。 */
export interface TouchFrameState {
  /** 現在能不能開車：這一局還在進行、沒有暫停、按鍵設定沒開。不能開的時候整層收起來，不擋面板上的按鈕。 */
  readonly driving: boolean;
  /** 目前的檔位。 */
  readonly gear: Gear;
}

export interface TouchControls {
  /** 目前觸控的踏板與方向盤；觸控層沒顯示時是「什麼都沒碰」。 */
  pedalInput(): PedalInput;
  /** 上次呼叫之後點了幾下切換檔位；讀完就歸零。 */
  consumeGearToggles(): number;
  /** 每個畫面幀呼叫：顯示或收起、方向盤回正、依畫面大小排位置、切換檔位鍵顯示目前檔位。 */
  update(state: TouchFrameState, frameSeconds: number): void;
  /** 是不是正在等玩家按鍵（點了鍵帽）；等的時候這一局先不動，免得車自己滑走。 */
  listening(): boolean;
  /** 綁定變了（這裡或按鍵設定面板改的）之後呼叫：鍵帽照新的綁定重畫。 */
  refreshKeys(): void;
}

/** 每個控制項的 DOM id、樣式與名稱（aria-label）的翻譯鍵。 */
const CONTROLS: Readonly<
  Record<TouchControlId, { readonly id: string; readonly className: string; readonly label: TranslationKey }>
> = {
  wheel: { id: 'touch-wheel', className: 'touch-wheel', label: 'touch.wheel' },
  brake: { id: 'touch-brake', className: 'touch-pedal touch-brake', label: 'touch.brake' },
  gas: { id: 'touch-gas', className: 'touch-pedal touch-gas', label: 'touch.gas' },
  gear: { id: 'touch-gear', className: 'touch-button touch-gear', label: 'touch.gearToggle' },
  pause: { id: 'touch-pause', className: 'touch-button', label: 'touch.pause' },
  restart: { id: 'touch-restart', className: 'touch-button', label: 'touch.restart' },
  camera: { id: 'touch-camera', className: 'touch-button', label: 'touch.camera' },
};

/** 方向盤角度量化到這個刻度（度）才改 DOM。 */
const WHEEL_RENDER_STEP_DEG = 0.5;

/** 鏡頭名稱與暫停／重來鍵之間的間距。 */
const CAMERA_LABEL_GAP_PX = 10;

/** 大的控制項（方向盤、踏板）：上面的鍵帽用大一號的樣式。 */
const LARGE_CONTROLS: readonly TouchControlId[] = ['wheel', 'brake', 'gas'];

/** 改鍵的結果訊息（改好了、衝突、不能用）顯示多久後收起（秒）。 */
const KEY_MESSAGE_SECONDS = 5;

/** `?touch=off`：不建立任何東西。 */
const INERT: TouchControls = {
  pedalInput: () => touchPedalInput(NO_TOUCH_DRIVE),
  consumeGearToggles: () => 0,
  update: () => undefined,
  listening: () => false,
  refreshKeys: () => undefined,
};

/**
 * 在 root（#hud）裡建立螢幕操作層。預設建立並顯示；`?touch=off` 不建立。
 * `#hud[data-touch]` 是 on／off；`#hud[data-keys]` 是 on（顯示鍵盤提示與鍵帽）／off（手機：不顯示）。
 * @param param `?touch=` 的值（parseTouchParam）
 * @param controls 按鍵綁定的存取（鍵帽上的字、點鍵帽改鍵）
 */
export function createTouchControls(
  root: HTMLElement,
  param: TouchParam | undefined,
  actions: TouchActions,
  controls: ControlsAccess,
): TouchControls {
  if (!touchLayerEnabled(param)) {
    root.dataset.touch = 'off';
    root.dataset.keys = 'on';
    return INERT;
  }
  root.dataset.touch = 'on';
  // 手機與平板沒有鍵盤：不放鍵帽，面板上「按 … 繼續／重來」的提示也收起來（樣式看 data-keys）。
  const keyHints = keyboardHintsEnabled(window.matchMedia('(pointer: coarse)').matches);
  root.dataset.keys = keyHints ? 'on' : 'off';
  const ui = createUiBuilder();

  // 放在 HUD 的最前面：資訊面板、結算與暫停面板都在它上面。
  const container = document.createElement('div');
  container.id = 'touch-controls';
  container.className = 'touch';
  container.hidden = true;
  root.prepend(container);
  // 長按不跳出選單（存圖、選取）。
  container.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  const elements = {} as Record<TouchControlId, HTMLElement>;
  for (const id of TOUCH_CONTROL_IDS) {
    const spec = CONTROLS[id];
    const created =
      id === 'wheel'
        ? ui.element('div', spec.className, container)
        : ui.plainButton(spec.id, spec.className, container);
    created.id = spec.id;
    elements[id] = created;
  }

  // 方向盤：會轉的是裡面那一層（輪圈、輪輻、正上方的記號）。
  elements.wheel.setAttribute('role', 'slider');
  const rim = ui.element('div', 'touch-wheel-rim', elements.wheel);
  ui.element('span', 'touch-wheel-mark', rim);
  ui.element('span', 'touch-wheel-hub', rim);

  // 踏板與小鍵上的字。切換檔位鍵顯示目前的檔位：大字母 D 或 R 加檔位名稱（renderGear）。
  ui.translatedElement('span', 'touch-label', elements.brake, 'touch.brake');
  ui.translatedElement('span', 'touch-label', elements.gas, 'touch.gas');
  const gearLetter = ui.element('span', 'touch-gear-letter', elements.gear);
  const gearName = ui.element('span', 'touch-gear-name', elements.gear);
  ui.translatedElement('span', 'touch-label', elements.pause, 'touch.pause');
  ui.translatedElement('span', 'touch-label', elements.restart, 'touch.restart');
  ui.translatedElement('span', 'touch-label', elements.camera, 'touch.camera');

  // ── 鍵帽：每個控制項上寫著目前綁的鍵；點鍵帽 → 按新的鍵 → 改綁（與按鍵設定面板同一套規則） ──
  // 鍵帽是控制項的「兄弟」而不是子元素，疊在控制項上面：點鍵帽不會踩到踏板，踩踏板也不會開始改鍵。
  const flow = createRebindFlow(
    controls,
    // 綁定變了由 controls.apply 統一通知（main.ts）：HUD、按鍵設定面板與這裡的鍵帽一起重畫。
    () => undefined,
    () => {
      renderKeys();
    },
  );
  const badges: (TouchKeyBadge & { readonly button: HTMLButtonElement })[] = [];
  if (keyHints) {
    for (const badge of TOUCH_KEY_BADGES) {
      const button = ui.plainButton(`touch-key-${badge.action}`, 'touch-key', container);
      button.dataset.action = badge.action;
      button.dataset.anchor = badge.anchor;
      // 方向盤與踏板上的鍵帽大一點；小鍵上的要塞在按鈕上緣，小一點。
      button.dataset.size = LARGE_CONTROLS.includes(badge.control) ? 'large' : 'small';
      button.addEventListener('click', () => {
        flow.listen(badge.action, TOUCH_KEY_SLOT);
      });
      badges.push({ ...badge, button });
    }
  }
  // 改鍵的提示與結果：下方中間、鏡頭名稱的上面。
  const keyMessage = ui.element('div', 'hud-panel touch-key-message', container);
  keyMessage.id = 'touch-key-message';
  keyMessage.setAttribute('role', 'status');
  keyMessage.hidden = true;
  let shownMessage: RebindMessage | undefined;
  let messageAgeSeconds = 0;

  /** 鍵帽與提示：照目前的綁定、正在等的那一格、最近的訊息重畫。 */
  function renderKeys(): void {
    const bindings = controls.current();
    const listening = flow.listening();
    const message = flow.message();
    for (const { action, button } of badges) {
      const code = touchKeyCode(bindings, action);
      const waiting = listening?.action === action;
      const actionName = t(ACTION_LABELS[action]);
      button.textContent = waiting ? '…' : keyText(code);
      button.dataset.listening = String(waiting);
      button.dataset.code = code;
      button.title = `${actionName}: ${t('controls.rebind')}`;
      button.setAttribute('aria-label', `${actionName}: ${keyText(code)}`);
    }
    if (message !== shownMessage) {
      shownMessage = message;
      messageAgeSeconds = 0;
    }
    if (listening !== undefined) {
      // 暫停鍵預設就是 Esc，所以改「暫停」時 Esc 是要綁的鍵，不是取消。
      const prompt = fillTemplate(t('touch.rebindPrompt'), { action: t(ACTION_LABELS[listening.action]) });
      keyMessage.textContent =
        listening.action === 'pause' ? prompt : `${prompt}${t('touch.rebindCancel')}`;
      keyMessage.dataset.kind = 'listening';
    } else {
      keyMessage.textContent = message?.text() ?? '';
      keyMessage.dataset.kind = message === undefined ? 'none' : message.warning ? 'warning' : 'info';
    }
    keyMessage.hidden = listening === undefined && message === undefined;
  }

  // 正在等按鍵時去碰控制項本體（踩踏板、拖方向盤、點小鍵）= 不改了，照常開車。
  container.addEventListener(
    'pointerdown',
    (event) => {
      const origin = event.target;
      if (
        flow.listening() !== undefined &&
        !(origin instanceof Element && origin.closest('.touch-key') !== null)
      ) {
        flow.reset();
        renderKeys();
      }
    },
    { capture: true },
  );

  /** 切換檔位鍵上的字：目前的檔位（D 前進／R 倒車）。 */
  let shownGear: Gear = INITIAL_GEAR;
  function renderGear(): void {
    const label = GEAR_LABELS[shownGear];
    elements.gear.dataset.gear = shownGear;
    gearLetter.textContent = label.letter;
    gearName.textContent = t(label.key);
  }

  function renderTexts(): void {
    ui.refreshTexts();
    for (const id of TOUCH_CONTROL_IDS) {
      elements[id].setAttribute('aria-label', t(CONTROLS[id].label));
    }
    renderGear();
    renderKeys();
  }
  renderTexts();
  onLocaleChange(renderTexts);

  // ── 方向盤 ──────────────────────────────────────────────────
  let wheelAngleRad = 0;
  let wheelPointer: number | undefined;
  let wheelLast: WheelPoint = { dx: 0, dy: 0 };
  let wheelRadiusPx = 1;
  let shownWheelStep = 0;

  /** 手指相對方向盤中心的位置。 */
  function wheelPoint(event: PointerEvent): WheelPoint {
    const box = elements.wheel.getBoundingClientRect();
    wheelRadiusPx = Math.max(box.width / 2, 1);
    return {
      dx: event.clientX - (box.left + box.width / 2),
      dy: event.clientY - (box.top + box.height / 2),
    };
  }

  /** 讓這根手指之後的事件都送到這個控制項（手指滑出去也算）。失敗（指標已經不在了）就算了。 */
  function capture(element: HTMLElement, pointerId: number): void {
    try {
      element.setPointerCapture(pointerId);
    } catch {
      // 指標已經放開：之後不會再有它的事件，不必處理。
    }
  }

  elements.wheel.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (wheelPointer !== undefined) {
      return;
    }
    wheelPointer = event.pointerId;
    wheelLast = wheelPoint(event);
    capture(elements.wheel, event.pointerId);
    elements.wheel.dataset.held = 'true';
  });
  elements.wheel.addEventListener('pointermove', (event) => {
    if (event.pointerId !== wheelPointer) {
      return;
    }
    event.preventDefault();
    const point = wheelPoint(event);
    wheelAngleRad = wheelAngleAfterDrag(wheelAngleRad, wheelLast, point, wheelRadiusPx);
    wheelLast = point;
  });
  function releaseWheel(event: PointerEvent): void {
    if (event.pointerId === wheelPointer) {
      wheelPointer = undefined;
      elements.wheel.dataset.held = 'false';
    }
  }
  elements.wheel.addEventListener('pointerup', releaseWheel);
  elements.wheel.addEventListener('pointercancel', releaseWheel);
  elements.wheel.addEventListener('lostpointercapture', releaseWheel);

  function renderWheel(): void {
    const step = Math.round(radToDeg(wheelAngleRad) / WHEEL_RENDER_STEP_DEG);
    if (step === shownWheelStep) {
      return;
    }
    shownWheelStep = step;
    const degrees = step * WHEEL_RENDER_STEP_DEG;
    rim.style.transform = `rotate(${degrees}deg)`;
    elements.wheel.setAttribute('aria-valuenow', degrees.toFixed(0));
  }

  // ── 踏板：各自記踩在上面的手指，一根以上就算踩著 ───────────────
  function pedal(element: HTMLElement): { readonly pressed: () => boolean; readonly clear: () => void } {
    const pointers = new Set<number>();
    function sync(): void {
      element.dataset.pressed = String(pointers.size > 0);
    }
    element.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      pointers.add(event.pointerId);
      capture(element, event.pointerId);
      sync();
    });
    const release = (event: PointerEvent): void => {
      pointers.delete(event.pointerId);
      sync();
    };
    element.addEventListener('pointerup', release);
    element.addEventListener('pointercancel', release);
    element.addEventListener('lostpointercapture', release);
    sync();
    return {
      pressed: () => pointers.size > 0,
      clear: () => {
        pointers.clear();
        sync();
      },
    };
  }
  const brakePedal = pedal(elements.brake);
  const gasPedal = pedal(elements.gas);

  // ── 小鍵：按下去那一刻就算（不等放開），換檔才跟得上手 ──────────
  let gearToggles = 0;
  function onPress(element: HTMLElement, action: () => void): void {
    element.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      action();
    });
  }
  onPress(elements.gear, () => {
    gearToggles += 1;
  });
  onPress(elements.pause, actions.pause);
  onPress(elements.restart, actions.restart);
  onPress(elements.camera, actions.camera);

  // ── 每幀 ────────────────────────────────────────────────────
  let shownActive = false;
  let layoutWidth = 0;
  let layoutHeight = 0;

  function fitLayout(): void {
    const width = root.clientWidth;
    const height = root.clientHeight;
    if (width === layoutWidth && height === layoutHeight) {
      return;
    }
    layoutWidth = width;
    layoutHeight = height;
    const layout = touchLayout(width, height);
    for (const id of TOUCH_CONTROL_IDS) {
      const rect = layout[id];
      const { style } = elements[id];
      style.left = `${rect.x}px`;
      style.top = `${rect.y}px`;
      style.width = `${rect.width}px`;
      style.height = `${rect.height}px`;
    }
    for (const { control, anchor, button } of badges) {
      const position = keyBadgePosition(layout[control], anchor);
      button.style.left = `${position.x}px`;
      button.style.top = `${position.y}px`;
    }
    // 鏡頭名稱（下方置中）要讓到暫停／重來鍵的上面：把那一排上緣離畫面底的距離交給樣式。
    root.style.setProperty('--touch-clear-bottom', `${height - layout.pause.y + CAMERA_LABEL_GAP_PX}px`);
  }

  /** 收起時放掉所有手指：回來的時候不會有踏板還踩著、方向盤還歪著。 */
  function releaseAll(): void {
    wheelPointer = undefined;
    wheelAngleRad = 0;
    elements.wheel.dataset.held = 'false';
    brakePedal.clear();
    gasPedal.clear();
    gearToggles = 0;
    flow.reset();
    renderKeys();
  }

  return {
    pedalInput() {
      if (!shownActive) {
        return touchPedalInput(NO_TOUCH_DRIVE);
      }
      return touchPedalInput({
        wheelAngleRad,
        gas: gasPedal.pressed(),
        brake: brakePedal.pressed(),
      });
    },
    consumeGearToggles() {
      const presses = gearToggles;
      gearToggles = 0;
      return presses;
    },
    update(state, frameSeconds) {
      const active = state.driving;
      if (active !== shownActive) {
        shownActive = active;
        container.hidden = !active;
        if (!active) {
          releaseAll();
        }
      }
      if (!active) {
        renderWheel();
        return;
      }
      fitLayout();
      if (wheelPointer === undefined) {
        wheelAngleRad = wheelAngleAfterRelease(wheelAngleRad, frameSeconds);
      }
      renderWheel();
      if (state.gear !== shownGear) {
        shownGear = state.gear;
        renderGear();
      }
      // 改鍵的結果訊息過一會兒自己收起來（正在等按鍵的提示不會）。
      if (shownMessage !== undefined && flow.listening() === undefined) {
        messageAgeSeconds += frameSeconds;
        if (messageAgeSeconds > KEY_MESSAGE_SECONDS) {
          flow.change(controls.current(), undefined);
        }
      }
    },
    listening: () => flow.listening() !== undefined,
    refreshKeys: renderKeys,
  };
}

/**
 * 擋掉整頁的觸控手勢：雙指縮放（Safari 的 gesture 事件）、拖曳捲動與下拉重新整理。
 * 樣式已經有 `touch-action: none`；這裡補上不看 touch-action 的瀏覽器。
 * 可以捲動的面板（關卡選擇、按鍵設定）裡照常捲。每種模式都呼叫一次。
 */
export function preventPageGestures(target: Document): void {
  const block = (event: Event): void => {
    event.preventDefault();
  };
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    target.addEventListener(type, block);
  }
  target.addEventListener(
    'touchmove',
    (event) => {
      const origin = event.target;
      if (origin instanceof Element && origin.closest('.level-select, .controls-panel') !== null) {
        return;
      }
      if (event.cancelable) {
        event.preventDefault();
      }
    },
    { passive: false },
  );
}
