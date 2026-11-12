// 關卡選擇畫面（首頁）：一個世界 10 張卡，每張有編號、名稱、星數、最佳時間；
// 還沒解鎖的顯示鎖頭、不能點；目錄裡還沒有的關顯示「即將推出」。點已解鎖的卡由呼叫端換網址進關。
import { isTranslationKey, onLocaleChange, type TranslationKey } from '../core/i18n';
import { levelRecord, type SaveData } from '../core/save';
import type { WorldSlot } from '../level/levelCatalog';
import { isUnlocked } from '../level/progress';
import { createUiBuilder } from './dom';
import { formatStars, formatTime } from './format';

/**
 * 一張卡的狀態：unlocked = 可以點；locked = 前一關還沒過；soon = 這一關還沒做（目錄裡沒有）。
 */
export type LevelCardState = 'unlocked' | 'locked' | 'soon';

/** 一張卡要顯示的內容（純資料）。 */
export interface LevelCardView {
  /** 從 1 開始的關卡編號。 */
  readonly number: number;
  readonly id: string;
  readonly state: LevelCardState;
  /** 關卡名稱的翻譯鍵；還沒做的關，或鍵不在翻譯檔裡，是 undefined（改顯示 id）。 */
  readonly nameKey: TranslationKey | undefined;
  /** 最佳星數；沒過關是 0。 */
  readonly stars: number;
  /** 最佳時間（秒）；沒過關是 undefined。 */
  readonly bestTimeS: number | undefined;
}

/**
 * 由一個世界的格子與存檔算出每張卡的內容。
 * @param unlockAll `?unlock=all`：做好的關全部可以點（還沒做的關仍然是 soon）
 */
export function levelCards(
  slots: readonly WorldSlot[],
  save: SaveData,
  unlockAll: boolean,
): readonly LevelCardView[] {
  return slots.map(({ number, id, level }) => {
    if (level === undefined) {
      return { number, id, state: 'soon', nameKey: undefined, stars: 0, bestTimeS: undefined };
    }
    const record = levelRecord(save, id);
    return {
      number,
      id,
      state: isUnlocked(id, save, unlockAll) ? 'unlocked' : 'locked',
      nameKey: isTranslationKey(level.nameKey) ? level.nameKey : undefined,
      stars: record?.stars ?? 0,
      bestTimeS: record?.bestTimeS,
    };
  });
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** 鎖頭圖示（內嵌 SVG；不靠表情符號字型，每台機器畫出來都一樣）。 */
function lockIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'level-card-lock');
  svg.setAttribute('aria-hidden', 'true');
  const shackle = document.createElementNS(SVG_NAMESPACE, 'path');
  shackle.setAttribute('d', 'M7.5 11V8a4.5 4.5 0 0 1 9 0v3');
  shackle.setAttribute('fill', 'none');
  shackle.setAttribute('stroke', 'currentColor');
  shackle.setAttribute('stroke-width', '2');
  const body = document.createElementNS(SVG_NAMESPACE, 'rect');
  body.setAttribute('x', '5');
  body.setAttribute('y', '11');
  body.setAttribute('width', '14');
  body.setAttribute('height', '10');
  body.setAttribute('rx', '2');
  body.setAttribute('fill', 'currentColor');
  svg.append(shackle, body);
  return svg;
}

/**
 * 在 parent 裡建立關卡選擇畫面（`#level-select`），並訂閱語言切換。
 * 每張卡是 `.level-card`，有 `data-state`；做好的關另有 `data-level`（關卡 id）與 `data-stars`。
 * @param onPick 點了已解鎖的卡；參數是關卡 id
 */
export function createLevelSelect(
  parent: HTMLElement,
  cards: readonly LevelCardView[],
  onPick: (levelId: string) => void,
): void {
  const ui = createUiBuilder();
  const root = ui.element('div', 'level-select', parent);
  root.id = 'level-select';

  ui.languageButton('select-language', 'hud-panel hud-button select-language', root);

  const inner = ui.element('main', 'select-inner', root);
  ui.translatedElement('h1', 'select-title', inner, 'select.title');
  ui.translatedElement('div', 'select-world', inner, 'select.world');
  const grid = ui.element('div', 'select-grid', inner);

  for (const card of cards) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hud-panel level-card';
    button.dataset.state = card.state;
    button.disabled = card.state !== 'unlocked';
    grid.append(button);

    ui.element('span', 'level-card-number', button).textContent = String(card.number);

    if (card.state === 'soon') {
      ui.translatedElement('span', 'level-card-name', button, 'select.comingSoon');
      continue;
    }

    button.dataset.level = card.id;
    button.dataset.stars = String(card.stars);
    if (card.nameKey === undefined) {
      ui.element('span', 'level-card-name', button).textContent = card.id;
    } else {
      ui.translatedElement('span', 'level-card-name', button, card.nameKey);
    }

    if (card.state === 'locked') {
      button.append(lockIcon());
      ui.translatedElement('span', 'level-card-note', button, 'select.locked');
      continue;
    }

    ui.element('span', 'level-card-stars', button).textContent = formatStars(card.stars);
    const time = ui.element('span', 'level-card-time', button);
    ui.translatedElement('span', 'level-card-time-label', time, 'select.bestTime');
    // 沒過關的時間顯示成 –:––.–。
    ui.element('span', 'level-card-time-value', time).textContent = formatTime(
      card.bestTimeS ?? Number.NaN,
    );
    button.addEventListener('click', () => {
      onPick(card.id);
    });
  }

  ui.refreshTexts();
  onLocaleChange(() => {
    ui.refreshTexts();
  });
}
