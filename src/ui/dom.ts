// 介面共用的 DOM 小工具：建立元素、把文字綁到翻譯鍵（語言切換時重填）、按鈕、語言切換按鈕。
// HUD、結算面板、暫停面板、關卡選擇都用這一份，不各自重複。
import { getLocale, setLocale, t, type Locale, type TranslationKey } from '../core/i18n';

/** 按語言按鈕會切到的語言（只有兩種語言，就是另一種）。 */
export function otherLocale(locale: Locale): Locale {
  return locale === 'zh-TW' ? 'en' : 'zh-TW';
}

export interface UiBuilder {
  /** 建立元素並接到 parent 後面。 */
  element(tag: string, className: string, parent: HTMLElement): HTMLElement;
  /**
   * 內容是翻譯文字的元素；refreshTexts 時會重填。
   * @param fill 翻譯文字裡有要代換的部分（例如 `{key}` 換成目前綁的鍵）時，由它把文字補完
   */
  translatedElement(
    tag: string,
    className: string,
    parent: HTMLElement,
    key: TranslationKey,
    fill?: (text: string) => string,
  ): HTMLElement;
  /** 沒有固定文字的按鈕（文字由呼叫端自己填，例如按鍵設定裡的鍵帽）。 */
  plainButton(id: string, className: string, parent: HTMLElement): HTMLButtonElement;
  /** 按鈕：文字走翻譯鍵。HUD 整體不接滑鼠，按鈕的樣式要自己開 `pointer-events: auto`。 */
  button(
    id: string,
    className: string,
    parent: HTMLElement,
    key: TranslationKey,
    onClick: () => void,
  ): HTMLButtonElement;
  /** 語言按鈕：顯示「會切到的語言」的名稱，按了就切換。 */
  languageButton(id: string, className: string, parent: HTMLElement): HTMLButtonElement;
  /** 用目前的語言重填所有綁了翻譯鍵的文字。建立完與語言切換後由擁有者呼叫。 */
  refreshTexts(): void;
}

export function createUiBuilder(): UiBuilder {
  const translated: {
    readonly element: HTMLElement;
    readonly key: TranslationKey;
    readonly fill?: (text: string) => string;
  }[] = [];
  const languageButtons: HTMLButtonElement[] = [];

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
    fill?: (text: string) => string,
  ): HTMLElement {
    const created = element(tag, className, parent);
    translated.push(fill === undefined ? { element: created, key } : { element: created, key, fill });
    return created;
  }

  function plainButton(id: string, className: string, parent: HTMLElement): HTMLButtonElement {
    const created = document.createElement('button');
    created.type = 'button';
    created.id = id;
    created.className = className;
    parent.append(created);
    // 用滑鼠點按鈕時不讓它拿走鍵盤焦點，否則之後按空白鍵（手煞車）會再觸發一次按鈕。
    created.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });
    return created;
  }

  return {
    element,
    translatedElement,
    plainButton,
    button(id, className, parent, key, onClick): HTMLButtonElement {
      const created = plainButton(id, className, parent);
      translated.push({ element: created, key });
      created.addEventListener('click', onClick);
      return created;
    },
    languageButton(id, className, parent): HTMLButtonElement {
      const created = plainButton(id, className, parent);
      translated.push({ element: created, key: 'hud.languageTarget' });
      languageButtons.push(created);
      created.addEventListener('click', () => {
        setLocale(otherLocale(getLocale()));
      });
      return created;
    },
    refreshTexts(): void {
      for (const entry of translated) {
        const text = t(entry.key);
        entry.element.textContent = entry.fill === undefined ? text : entry.fill(text);
      }
      for (const button of languageButtons) {
        // 按鈕上的字是另一種語言寫的，標上 lang 讓字型與螢幕報讀正確。
        button.lang = otherLocale(getLocale());
        const hint = t('hud.language');
        button.title = hint;
        button.setAttribute('aria-label', `${hint}: ${t('hud.languageTarget')}`);
      }
    },
  };
}
