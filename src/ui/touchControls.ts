// 觸控層：手機／平板用的螢幕按鈕——左下的虛擬方向盤（拖曳旋轉、放開回正）、右下的剎車與油門踏板
// （可同時踩，各自記自己的手指），加上掛 D、掛 R、暫停、重來。
// 用 Pointer Events：每根手指有自己的 pointerId，所以一邊轉方向盤一邊踩踏板互不干擾；滑鼠也能操作（?touch=on）。
// 位置由 core/touchLayout.ts 算（排在倒車輔助小窗的下面）；駕駛輸入的換算在 core/touchInput.ts。
import { onLocaleChange, t, type TranslationKey } from '../core/i18n';
import {
  NO_TOUCH_DRIVE,
  touchDriveInput,
  touchLayerEnabled,
  wheelAngleAfterDrag,
  wheelAngleAfterRelease,
  type WheelPoint,
} from '../core/touchInput';
import { TOUCH_CONTROL_IDS, touchLayout, type TouchControlId } from '../core/touchLayout';
import { radToDeg } from '../core/units';
import type { TouchParam } from '../core/urlParams';
import type { DriveInput } from '../vehicle/bicycleModel';
import type { Gear, Gearbox } from '../vehicle/gearbox';
import { createUiBuilder } from './dom';

/** 觸控層上的按鈕要做的事（暫停、重來）；怎麼做由 main.ts 決定。 */
export interface TouchActions {
  readonly pause: () => void;
  readonly restart: () => void;
}

/** 每幀交給觸控層的遊戲狀態。 */
export interface TouchFrameState {
  /** 現在能不能開車：這一局還在進行、沒有暫停、按鍵設定沒開。不能開的時候整層收起來，不擋面板上的按鈕。 */
  readonly driving: boolean;
  readonly gearbox: Gearbox;
}

export interface TouchControls {
  /** 目前觸控的駕駛輸入（方向盤、油門、剎車）；觸控層沒顯示時是「什麼都沒碰」。 */
  driveInput(gearbox: Gearbox): DriveInput;
  /** 上次呼叫之後點過的掛檔鍵要掛的檔（點了好幾次取最後一次）；沒點是 null。讀完就清掉。 */
  consumeShift(): Gear | null;
  /** 每個畫面幀呼叫：顯示或收起、方向盤回正、依畫面大小排位置、標出目前檔位。 */
  update(state: TouchFrameState, frameSeconds: number): void;
}

/** 每個控制項的 DOM id、樣式與名稱（aria-label）的翻譯鍵。 */
const CONTROLS: Readonly<
  Record<TouchControlId, { readonly id: string; readonly className: string; readonly label: TranslationKey }>
> = {
  wheel: { id: 'touch-wheel', className: 'touch-wheel', label: 'touch.wheel' },
  brake: { id: 'touch-brake', className: 'touch-pedal touch-brake', label: 'touch.brake' },
  gas: { id: 'touch-gas', className: 'touch-pedal touch-gas', label: 'touch.gas' },
  gearDrive: { id: 'touch-gear-drive', className: 'touch-button touch-gear', label: 'touch.gearDrive' },
  gearReverse: {
    id: 'touch-gear-reverse',
    className: 'touch-button touch-gear',
    label: 'touch.gearReverse',
  },
  pause: { id: 'touch-pause', className: 'touch-button', label: 'touch.pause' },
  restart: { id: 'touch-restart', className: 'touch-button', label: 'touch.restart' },
};

/** 方向盤角度量化到這個刻度（度）才改 DOM。 */
const WHEEL_RENDER_STEP_DEG = 0.5;

/** 鏡頭名稱與暫停／重來鍵之間的間距。 */
const CAMERA_LABEL_GAP_PX = 10;

/** `?touch=off`：不建立任何東西。 */
const INERT: TouchControls = {
  driveInput: (gearbox) => touchDriveInput(NO_TOUCH_DRIVE, gearbox),
  consumeShift: () => null,
  update: () => undefined,
};

/**
 * 在 root（#hud）裡建立觸控層。`?touch=off` 不建立；`?touch=on` 一開始就顯示；
 * 沒給參數時主要指標是手指（`pointer: coarse`）就顯示，否則等到第一次真的收到觸控事件才顯示。
 * @param param `?touch=` 的值（parseTouchParam）
 */
export function createTouchControls(
  root: HTMLElement,
  param: TouchParam | undefined,
  actions: TouchActions,
): TouchControls {
  if (param === 'off') {
    root.dataset.touch = 'off';
    return INERT;
  }
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

  // 踏板與小鍵上的字。掛檔鍵是大字母 D／R 加檔位名稱。
  ui.translatedElement('span', 'touch-label', elements.brake, 'touch.brake');
  ui.translatedElement('span', 'touch-label', elements.gas, 'touch.gas');
  ui.element('span', 'touch-gear-letter', elements.gearDrive).textContent = 'D';
  ui.translatedElement('span', 'touch-gear-name', elements.gearDrive, 'hud.gearForward');
  ui.element('span', 'touch-gear-letter', elements.gearReverse).textContent = 'R';
  ui.translatedElement('span', 'touch-gear-name', elements.gearReverse, 'hud.gearReverse');
  ui.translatedElement('span', 'touch-label', elements.pause, 'touch.pause');
  ui.translatedElement('span', 'touch-label', elements.restart, 'touch.restart');

  function renderTexts(): void {
    ui.refreshTexts();
    for (const id of TOUCH_CONTROL_IDS) {
      elements[id].setAttribute('aria-label', t(CONTROLS[id].label));
    }
  }
  renderTexts();
  onLocaleChange(renderTexts);

  // ── 顯示與否 ────────────────────────────────────────────────
  let sawTouch = false;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  let enabled = touchLayerEnabled(param, coarsePointer, sawTouch);
  root.dataset.touch = enabled ? 'on' : 'off';
  if (!enabled) {
    // 桌機接了觸控螢幕、或偵測不到粗指標的裝置：第一次真的碰到螢幕就顯示。
    const onFirstTouch = (): void => {
      sawTouch = true;
      enabled = touchLayerEnabled(param, coarsePointer, sawTouch);
      root.dataset.touch = enabled ? 'on' : 'off';
      window.removeEventListener('touchstart', onFirstTouch);
    };
    window.addEventListener('touchstart', onFirstTouch, { passive: true });
  }

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

  // ── 小鍵：按下去那一刻就算（不等放開），掛檔才跟得上手 ──────────
  let shiftPressed: Gear | null = null;
  function onPress(element: HTMLElement, action: () => void): void {
    element.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      action();
    });
  }
  onPress(elements.gearDrive, () => {
    shiftPressed = 'forward';
  });
  onPress(elements.gearReverse, () => {
    shiftPressed = 'reverse';
  });
  onPress(elements.pause, actions.pause);
  onPress(elements.restart, actions.restart);

  // ── 每幀 ────────────────────────────────────────────────────
  let shownActive = false;
  let layoutWidth = 0;
  let layoutHeight = 0;
  let shownGear: Gear | undefined;

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
    shiftPressed = null;
  }

  return {
    driveInput(gearbox) {
      if (!shownActive) {
        return touchDriveInput(NO_TOUCH_DRIVE, gearbox);
      }
      return touchDriveInput(
        { wheelAngleRad, gas: gasPedal.pressed(), brake: brakePedal.pressed() },
        gearbox,
      );
    },
    consumeShift() {
      const pressed = shiftPressed;
      shiftPressed = null;
      return pressed;
    },
    update(state, frameSeconds) {
      const active = enabled && state.driving;
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
      if (state.gearbox.gear !== shownGear) {
        shownGear = state.gearbox.gear;
        elements.gearDrive.dataset.active = String(shownGear === 'forward');
        elements.gearReverse.dataset.active = String(shownGear === 'reverse');
      }
    },
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
