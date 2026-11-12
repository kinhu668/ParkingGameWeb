// 啟動參數不認得時的提示面板：一句說明 + 可用值的清單。`?show=`、`?level=` 共用。

/**
 * 在畫面上加一塊提示面板。
 * @param elementId 面板的 id（e2e 用它找面板）
 * @param message 已經翻譯好的說明文字
 * @param choices 可用的值，逐項列出
 */
export function showChoicesNotice(
  elementId: string,
  message: string,
  choices: readonly string[],
): void {
  const notice = document.createElement('div');
  notice.id = elementId;
  notice.className = 'hud-panel mode-panel';
  const text = document.createElement('div');
  text.textContent = message;
  const list = document.createElement('ul');
  list.className = 'mode-list';
  for (const choice of choices) {
    const item = document.createElement('li');
    const code = document.createElement('code');
    code.textContent = choice;
    item.append(code);
    list.append(item);
  }
  notice.append(text, list);
  document.body.append(notice);
}
