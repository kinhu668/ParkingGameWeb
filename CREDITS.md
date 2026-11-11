# CREDITS

本專案直接使用的第三方套件（版本釘死，見 `package.json` 與 `package-lock.json`）。
授權全文在各套件目錄的 `LICENSE` 檔內（`node_modules/<套件>/`）。

| 套件 | 版本 | 類別 | 授權 | 用途 |
| --- | --- | --- | --- | --- |
| three | 0.187.0 | dependencies | MIT | 3D 算圖（隨遊戲發佈） |
| @types/three | 0.187.0 | devDependencies | MIT | three 的型別定義 |
| vite | 8.3.8 | devDependencies | MIT | 開發伺服器與建置 |
| vitest | 5.1.0 | devDependencies | MIT | 單元測試 |
| typescript | 7.0.2 | devDependencies | Apache-2.0 | 型別檢查 |
| @playwright/test | 1.65.0 | devDependencies | Apache-2.0 | 端對端測試 |

只有 `three` 會被打包進發佈的遊戲；其餘皆為開發工具，不隨遊戲發佈。
間接依賴只出現在 `package-lock.json`，本專案不直接 import。
