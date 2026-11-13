// 按鍵設定面板：每個動作一列，點鍵帽後按新的鍵就重綁；同一個鍵不能綁兩個動作（擋下來並說明是誰的）；
// 可以多加一個備用鍵、拿掉備用鍵、恢復預設。從暫停面板或 HUD 的操作說明進入。
// 掛在 HUD 的 `#controls-panel` 裡，平常隱藏。
import {
  CONTROL_ACTIONS,
  DEFAULT_BINDINGS,
  MAX_KEYS_PER_ACTION,
  clearExtraKey,
  keyLabel,
  rebind,
  type ControlAction,
  type ControlBindings,
} from '../core/controls';
import { t, type TranslationKey } from '../core/i18n';
import type { UiBuilder } from './dom';

/** 面板要用到的綁定存取；怎麼存、怎麼攔按鍵由 main.ts 決定。 */
export interface ControlsAccess {
  /** 目前的綁定。 */
  readonly current: () => ControlBindings;
  /** 換成新的綁定（立刻生效並存檔）。 */
  readonly apply: (bindings: ControlBindings) => void;
  /** 攔下一個按鍵交給 onKey；回傳取消攔截的函式。 */
  readonly captureNextKey: (onKey: (code: string) => void) => () => void;
  /** 從 HUD 的操作說明開啟設定前要做的事（這一局還在進行就先暫停）。 */
  readonly hold: () => void;
}

/** 動作 → 名稱的翻譯鍵；少列一個動作會編譯失敗。 */
export const ACTION_LABELS: Readonly<Record<ControlAction, TranslationKey>> = {
  throttle: 'controls.action.throttle',
  reverse: 'controls.action.reverse',
  steerLeft: 'controls.action.steerLeft',
  steerRight: 'controls.action.steerRight',
  brake: 'controls.action.brake',
  gearDrive: 'controls.action.gearDrive',
  gearReverse: 'controls.action.gearReverse',
  restart: 'controls.action.restart',
  toggleCamera: 'controls.action.toggleCamera',
  pause: 'controls.action.pause',
};

/** 正在等玩家按鍵時，按這個鍵是取消（重綁「暫停」時例外：它本來就是暫停的預設鍵）。 */
const CANCEL_CODE = 'Escape';

/** 這個鍵在目前語言下的寫法。 */
export function keyText(code: string): string {
  const label = keyLabel(code);
  return 'key' in label ? t(label.key) : label.text;
}

/** 一個動作的所有鍵，寫成一行（給「按 … 重來」這類提示用）。 */
export function keysText(codes: readonly string[]): string {
  return codes.map(keyText).join(' / ');
}

/** 把翻譯文字裡的 `{名稱}` 換成對應的值；沒有給的名稱原樣留著。 */
export function fillTemplate(text: string, values: Readonly<Record<string, string>>): string {
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder);
}

/** 改鍵之後要給玩家看的那一行訊息；存的是「怎麼產生文字」，語言切換後重畫才會是新語言。 */
export interface RebindMessage {
  readonly warning: boolean;
  readonly text: () => string;
}

/**
 * 改鍵流程：等玩家按鍵 → 套用重綁規則（同一個鍵不能綁兩個動作、不能綁的鍵、Esc 取消）→ 存檔 → 訊息。
 * 按鍵設定面板與螢幕操作層上的鍵帽用的是同一份，規則與訊息才不會有兩套。
 */
export interface RebindFlow {
  /** 正在等玩家按鍵的那一格；沒有在等是 undefined。 */
  listening(): { readonly action: ControlAction; readonly slot: number } | undefined;
  /** 最近一次改鍵的訊息（改好了、衝突、不能用）；沒有是 undefined。 */
  message(): RebindMessage | undefined;
  /** 開始等這一格的新鍵；再點一次正在等的那一格 = 取消。 */
  listen(action: ControlAction, slot: number): void;
  /** 不等了（不改訊息、不重畫）。 */
  stop(): void;
  /** 套用新的綁定並換訊息；綁定其實沒變就只更新訊息。 */
  change(next: ControlBindings, message: RebindMessage | undefined): void;
  /** 不等了，訊息也清掉（不重畫）。 */
  reset(): void;
}

/**
 * @param onChanged 綁定真的變了之後呼叫
 * @param render 等待中的那一格或訊息變了之後呼叫，擁有者在這裡重畫
 */
export function createRebindFlow(
  access: ControlsAccess,
  onChanged: () => void,
  render: () => void,
): RebindFlow {
  let listening:
    | { readonly action: ControlAction; readonly slot: number; readonly cancel: () => void }
    | undefined;
  let message: RebindMessage | undefined;

  function stop(): void {
    listening?.cancel();
    listening = undefined;
  }

  function change(next: ControlBindings, nextMessage: RebindMessage | undefined): void {
    message = nextMessage;
    if (next !== access.current()) {
      access.apply(next);
      onChanged();
    }
    render();
  }

  function onKey(action: ControlAction, slot: number, code: string): void {
    if (code === CANCEL_CODE && action !== 'pause') {
      message = undefined;
      render();
      return;
    }
    const result = rebind(access.current(), action, slot, code);
    switch (result.kind) {
      case 'ok':
        change(result.bindings, {
          warning: false,
          text: () =>
            fillTemplate(t('controls.bound'), {
              key: keyText(code),
              action: t(ACTION_LABELS[action]),
            }),
        });
        break;
      case 'conflict': {
        const owner = result.action;
        change(access.current(), {
          warning: true,
          text: () =>
            fillTemplate(t('controls.conflict'), {
              key: keyText(code),
              action: t(ACTION_LABELS[owner]),
            }),
        });
        break;
      }
      case 'unsupported':
        change(access.current(), { warning: true, text: () => t('controls.unsupported') });
        break;
    }
  }

  return {
    listening: () => listening,
    message: () => message,
    listen(action, slot): void {
      const same = listening?.action === action && listening.slot === slot;
      stop();
      message = undefined;
      if (!same) {
        const cancel = access.captureNextKey((code) => {
          listening = undefined;
          onKey(action, slot, code);
        });
        listening = { action, slot, cancel };
      }
      render();
    },
    stop,
    change,
    reset(): void {
      stop();
      message = undefined;
    },
  };
}

export interface ControlsPanel {
  open(): void;
  /** 收起面板；正在等按鍵就取消。 */
  close(): void;
  isOpen(): boolean;
  /** 語言切換後重畫鍵帽與訊息（固定文字由 ui.refreshTexts 填）。 */
  refresh(): void;
}

/**
 * 在 root 裡建立按鍵設定面板（一開始隱藏）。
 * @param onChanged 綁定變了（重綁、清掉備用鍵、恢復預設）之後呼叫；HUD 用它更新操作說明
 * @param onVisibility 面板開或關之後呼叫
 */
export function createControlsPanel(
  ui: UiBuilder,
  root: HTMLElement,
  access: ControlsAccess,
  onChanged: () => void,
  onVisibility: () => void,
): ControlsPanel {
  const overlay = ui.element('div', 'hud-status controls-overlay', root);
  overlay.id = 'controls-panel';
  overlay.setAttribute('role', 'dialog');
  overlay.hidden = true;
  const panel = ui.element('div', 'hud-panel controls-panel', overlay);
  ui.translatedElement('div', 'controls-title', panel, 'controls.title');
  ui.translatedElement('div', 'controls-hint', panel, 'controls.hint');

  // 等按鍵、重綁規則與訊息都在共用的改鍵流程裡；面板只負責畫。
  const flow = createRebindFlow(access, onChanged, () => {
    render();
  });

  const rows = ui.element('div', 'controls-rows', panel);
  const slotButtons: {
    readonly action: ControlAction;
    readonly slot: number;
    readonly button: HTMLButtonElement;
  }[] = [];
  const clearButtons: { readonly action: ControlAction; readonly button: HTMLButtonElement }[] = [];
  for (const action of CONTROL_ACTIONS) {
    const row = ui.element('div', 'controls-row', rows);
    row.dataset.action = action;
    ui.translatedElement('span', 'controls-action', row, ACTION_LABELS[action]);
    for (let slot = 0; slot < MAX_KEYS_PER_ACTION; slot += 1) {
      const button = ui.plainButton(`bind-${action}-${slot}`, 'controls-key', row);
      button.addEventListener('click', () => {
        flow.listen(action, slot);
      });
      slotButtons.push({ action, slot, button });
    }
    const clear = ui.plainButton(`bind-${action}-clear`, 'controls-clear', row);
    clear.textContent = '×';
    clear.addEventListener('click', () => {
      flow.stop();
      flow.change(clearExtraKey(access.current(), action), undefined);
    });
    clearButtons.push({ action, button: clear });
  }

  const messageLine = ui.element('div', 'controls-message', panel);
  messageLine.id = 'controls-message';
  messageLine.setAttribute('role', 'status');
  ui.translatedElement('div', 'controls-note', panel, 'controls.gearNote');

  const buttons = ui.element('div', 'panel-actions', panel);
  ui.button('controls-reset', 'panel-button', buttons, 'controls.reset', () => {
    flow.stop();
    flow.change(DEFAULT_BINDINGS, { warning: false, text: () => t('controls.resetDone') });
  });
  ui.button('controls-done', 'panel-button panel-button-primary', buttons, 'controls.done', () => {
    close();
  });

  function render(): void {
    const bindings = access.current();
    const listening = flow.listening();
    const message = flow.message();
    for (const { action, slot, button } of slotButtons) {
      const code = bindings[action][slot];
      const waiting = listening?.action === action && listening.slot === slot;
      // 第二格還沒有鍵：顯示「＋」，點了就是多加一個備用鍵。
      button.textContent = waiting ? t('controls.listening') : code === undefined ? '＋' : keyText(code);
      button.dataset.listening = String(waiting);
      button.dataset.code = code ?? '';
      const actionName = t(ACTION_LABELS[action]);
      button.setAttribute(
        'aria-label',
        code === undefined ? `${actionName}: ${t('controls.addKey')}` : `${actionName}: ${keyText(code)}`,
      );
      button.title = code === undefined ? t('controls.addKey') : t('controls.rebind');
    }
    for (const { action, button } of clearButtons) {
      // 只有備用鍵可以拿掉；沒有備用鍵時按鈕留著位置但看不到，各列才對得齊。
      button.dataset.available = String(bindings[action].length > 1);
      button.disabled = bindings[action].length <= 1;
      button.title = t('controls.clear');
      button.setAttribute('aria-label', `${t(ACTION_LABELS[action])}: ${t('controls.clear')}`);
    }
    messageLine.textContent = message?.text() ?? '';
    messageLine.dataset.kind = message === undefined ? 'none' : message.warning ? 'warning' : 'info';
  }

  function close(): void {
    if (overlay.hidden) {
      return;
    }
    flow.reset();
    overlay.hidden = true;
    onVisibility();
  }

  render();

  return {
    open(): void {
      if (!overlay.hidden) {
        return;
      }
      overlay.hidden = false;
      render();
      onVisibility();
    },
    close,
    isOpen: () => !overlay.hidden,
    refresh: render,
  };
}
