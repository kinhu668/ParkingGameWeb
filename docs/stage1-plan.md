# ParkingGame 網頁版 — 第 1 階段（原型）實作計畫

- 依據：`ParkingGame-web-spec-v0.2.md`（v0.2-web，2026-11-10）第 1、2、3、4、5、6、8、12、13、14、15 節。
- 本文件只是計畫；這一輪沒有寫任何應用程式碼，也沒有 `npm install`。
- 規格不修改。計畫中自行補上的假設集中列在本文件第 14 節，請在開工前確認。

## 1. 第 1 階段範圍

對齊規格第 14 節「第 1 階段：原型」：一台車在平地上開、鏡頭跟隨、一個車位與停車判定；翻譯系統與中英切換；展示／截圖／bench 參數骨架。

**要做的：**

| 項目 | 內容 |
| --- | --- |
| 專案骨架 | Vite + TypeScript `strict`，版本釘死（見本文件第 2 節） |
| 單位 | `src/core/units.ts`：ft ↔ m、mph ↔ m/s、mph/s ↔ m/s²、度 ↔ 弧度。內部 1 單位 = 1 公尺，全專案只有這個檔案出現換算係數 |
| VehicleConfig | 規格第 4 節數值（見本文件 4.1），以美制單位寫在一個常數檔 |
| 車輛物理 | 自寫單車模型，固定 60 Hz 時間步長，與畫面更新率脫鉤，結果可重現 |
| 鏡頭 | 斜俯視跟隨，平滑、不隨車身旋轉。正上方俯視只以「固定鏡頭預設 `top`」的形式存在（截圖用），C 鍵本階段不接行為 |
| 場景 | 平地 + 一個 9×18 ft 目標車位（白色標線） |
| 停車判定 | 四角都在車位內（邊線算內）、夾角 ±8°（含 8°）、車速 < 0.5 mph（不含 0.5）、三者同時成立並持續 1 秒 |
| 180° 規則 | 車頭與車位 `heading` 相差約 180° 不算成功，用測試鎖定 |
| 倒車入庫 | 靠把車位 `heading` 設成「車頭該朝的方向」，判定本身不放寬 180° |
| 成功與重來 | 成功後顯示成功畫面；R 鍵隨時重來 |
| 語言 | zh-TW／en 翻譯鍵、即時切換；系統字型 fallback，不內嵌字型檔 |
| 展示模式 | `?show=<id>` 骨架（例如 `?show=car_sedan`） |
| 固定鏡頭截圖 | `?cam=<預設>&t=<秒>` 骨架 |
| 效能測試 | `?bench` 骨架，真的輸出平均 FPS、1% low、draw calls |
| 固定亂數種子 | 程序化生成一律走有種子的亂數，不用 `Math.random` |
| 基本畫面 | Directional light + shadow map（地面收影、車投影）、半球補光、色調映射、霧；不比 Godot 方塊原型陽春 |

**不做的（第 2 階段，本階段一行都不寫）：** 關卡 JSON 載入、計時、碰撞與碰撞計數、星級、結算、存檔、關卡選擇。

也不做第 3 階段以後的內容：程序化材質 shader、後製鏈、畫質預設、音效、手把、觸控、按鍵重新綁定、設定介面。

## 2. 套件（已核准，版本釘死）

| 套件 | 版本 | 類別 | 授權 |
| --- | --- | --- | --- |
| three | 0.187.0 | dependencies | MIT |
| @types/three | 0.187.0 | devDependencies | MIT |
| vite | 8.3.8 | devDependencies | MIT |
| vitest | 5.1.0 | devDependencies | MIT |
| typescript | 7.0.2 | devDependencies | Apache-2.0 |
| @playwright/test | 1.65.0 | devDependencies | Apache-2.0 |

- `package.json` 寫死版本，不用 `^`／`~`；加 `.npmrc`（`save-exact=true`）避免之後不小心寫出範圍版本。提交 `package-lock.json`。
- 不自行改版本，不加其他套件。Playwright 只下載官方 Chromium（`npx playwright install chromium`）。
- 2026-11-10 已用 `npm view`（唯讀查詢，沒有安裝）確認六個版本都存在。本機 Node v24.22.1、npm 11.21.1，符合 vite（`^20.19.0 || >=22.12.0`）與 vitest（`^22.12.0 || ^24.0.0 || >=26.0.0`）的 engines；vitest 5.1.0 的 vite peer 範圍含 `^8.0.0`。
- `@types/three@0.187.0` 自己依賴 `fflate`、`@types/webxr`、`meshoptimizer`、`@types/stats.js`、`@tweenjs/tween.js`、`@dimforge/rapier3d-compat`。它們只會以間接依賴出現在 lockfile，本專案不 import 任何一個（規格規定不引入物理引擎）。
- **刻意不裝**：`@types/node`、ESLint、jsdom／happy-dom。因此：
  - 設定檔與測試不使用 Node API 型別（不寫 `process`、`node:fs`、`node:path`）。
  - Vitest 用預設 node 環境；受測邏輯全部寫成不碰 DOM、不建立 WebGL 的純函式。
  - 需要讀原始碼文字的測試用 Vite 的 `import.meta.glob(..., { query: '?raw' })`。
  - 若實作時發現非裝不可，先停下來徵求同意。

## 3. 座標與 heading 約定（最容易轉錯的地方）

### 3.1 世界座標

- Three.js 右手系、Y 向上。地面是 XZ 平面（y = 0）。
- 從正上方往下看（鏡頭在 +Y、畫面上方是 −Z）：+X 在畫面右邊，+Z 在畫面下方。等同地圖：**−Z 是北、+X 是東**。
- 內部長度一律公尺；關卡與設定對外一律英尺。

### 3.2 遊戲的 heading（規格第 6 節）

`heading` θ：0° 朝 −Z，從上方看**順時針為正**。

| θ | 車頭方向 | 地圖方位 |
| --- | --- | --- |
| 0° | −Z | 北 |
| 90° | +X | 東 |
| 180° | +Z | 南 |
| 270°（= −90°） | −X | 西 |

- 前方向量：`forward(θ) = ( sin θ, 0, −cos θ )`
- 右方向量：`right(θ) = ( cos θ, 0, sin θ )`
- 由方向向量反推：`θ = atan2(dx, −dz)`

### 3.3 與 Three.js `rotation.y` 的換算

Three.js 的 `object.rotation.y = φ` 是繞 +Y 軸的右手旋轉，**從上方看逆時針為正**，和遊戲 heading 方向相反。

推導：模型車頭朝本地 −Z，即本地前方 `(0, 0, −1)`。套用 `R_y(φ)` 後變成 `( −sin φ, 0, −cos φ )`。要等於 `forward(θ) = ( sin θ, 0, −cos θ )`，必須 **φ = −θ**。

驗算：θ = 90° → φ = −90° → `( −sin(−90°), 0, −cos(−90°) ) = ( 1, 0, 0 )` = +X ✓。

**規則（寫進程式與測試）：**

1. 所有車輛／車位模型建模時，**車頭朝本地 −Z、右側是本地 +X**。
2. `mesh.rotation.y = −headingRad`。這個負號只存在於 `src/core/heading.ts` 的 `headingToRotationY()` 一個函式裡，其他地方不准直接用 heading 寫 `rotation.y`。
3. 前輪轉向角 δ（正 = 向右打）同理：前輪群組 `rotation.y = −δ`，也經同一個函式。
4. 邏輯層（物理、停車判定）不 import Three.js，只用 `{ x, z }` 與 heading，完全不碰 `rotation.y`。
5. 夾角差一律用 `headingDelta(a, b)`，回傳值折到 (−180°, 180°]。程式裡不出現任何「對 180° 取餘數」的寫法。

### 3.4 本地座標 ↔ 世界座標

- 車身本地點（向右 `lx`、向前 `ly`）→ 世界：`p = center + right(θ)·lx + forward(θ)·ly`。四個角是 `(±寬/2, ±長/2)`。
- 世界點 → 車位本地：`d = p − spotCenter`；橫向 `= d · right(θs)`；縱向 `= d · forward(θs)`。

## 4. 車輛模型

### 4.1 VehicleConfig（`src/vehicle/vehicleConfig.ts`）

以美制單位寫成一個常數，另匯出一份經 `units.ts` 換算成 SI 的版本供物理使用。

| 參數 | 值 |
| --- | --- |
| 最高速度 | 18 mph |
| 倒車最高速度 | 9 mph |
| 加速度 | 6 mph/s |
| 煞車 | 18 mph/s |
| 滑行減速 | 3 mph/s |
| 最大轉向角 | 35° |
| 打方向盤速率 | 90°/s |
| 回正速率 | 120°/s |
| 軸距 | 9 ft |
| 車身長／寬／高 | 15／6／4.6 ft |

> 2026-11-13 更新（[pt27u]）：手煞車與一般剎車功能重疊，已整個移除——規格第 4 節的「手煞車 30 mph/s」、它的輸入與按鍵都不再實作。要停車就踩剎車（`DriveInput.brake`，預設鍵是逗號，18 mph/s）。本文件其餘提到剎車的地方已照現況改寫。

> 2026-11-13 更新（[pt28u]）：油門不再有方向，也不再兼當剎車。車永遠有一個明確的檔位（開局與重來都是 D），按「切換 D／R 檔」（預設 `KeyR`）在 D↔R 之間換；玩家的油門（`KeyW`／`ArrowUp`、螢幕上的油門踏板）往目前檔位的方向推——D 檔向前、R 檔向後。`KeyS`／`ArrowDown` 改成剎車（與逗號並存），沒有獨立的「倒車油門」。物理層的 `DriveInput.throttle` 仍是 −1／0／+1（下面 4.2、4.3 照舊），由 `src/vehicle/gearbox.ts` 把「油門踩著」依檔位換成 +1 或 −1；腳本駕駛（示範路線、參考路線）直接給有號油門。第 6 節的按鍵表與第 14 節假設 3 已照現況改寫。

### 4.2 狀態與輸入

- 狀態：車身中心 `x, z`（m）、`heading`（rad，順時針為正）、`speed`（m/s，前進為正、倒車為負）、`steer`（rad，向右為正）。
- 輸入：`throttle` ∈ {−1, 0, +1}、`steer` ∈ {−1, 0, +1}、`brake` 布林（剎車）。同時按相反鍵互相抵銷為 0。

### 4.3 每一步的固定順序（`dt = 1/60 s`）

1. **方向盤**：有輸入時以 90°/s 朝 `輸入 × 35°` 移動；沒輸入時以 120°/s 回到 0。夾在 ±35°。
2. **車速**：
   - 剎車踩著：以 18 mph/s 朝 0 減速，忽略油門。
   - 油門方向與目前行進方向相同，或車已停止：以 6 mph/s 加速，上限前進 18 mph、倒車 9 mph。
   - 油門方向與行進方向相反：以 18 mph/s 煞車到 0（到 0 後下一步才開始往反方向加速）。
   - 沒有油門：以 3 mph/s 滑行減速到 0。
   - 任何減速都停在剛好 0，不會在同一步內跨過 0 變號。
3. **heading**：`Δθ = (speed / 軸距) × tan(steer) × dt`。
4. **位置**：後軸中心沿 `forward(θ + Δθ/2)` 前進 `speed × dt`，再換回車身中心（車身中心 = 後軸中心 + `forward × 軸距/2`）。
5. `heading` 正規化到 [0, 2π)。

方向檢查：前進 + 向右打 → heading 增加（順時針）；倒車 + 向右打 → heading 減少。全鎖時後軸迴轉半徑 = 9 ft ÷ tan 35° ≈ 12.85 ft。

### 4.4 固定時間步長（`src/core/fixedLoop.ts`）

- 累加器：每幀把經過時間加進累加器，每滿 `1/60 s` 跑一步物理。
- 單幀時間上限（例如 0.25 s）避免分頁切回來後一次補跑太多步。
- 算圖用上一步與這一步的姿態做內插（位置線性、heading 走最短弧），高更新率螢幕才不會抖。
- `PHYSICS_HZ`、單幀上限、預設種子集中在 `src/core/gameConfig.ts`。

## 5. 停車判定（`src/level/parkingJudge.ts`）

車位資料：中心（ft）、寬 9 ft、長 18 ft、`heading`（度）、角度容許值（預設 8°，每關可調）、速度門檻 0.5 mph、持續時間 1 秒。

每個物理步檢查三個條件：

1. **四角在內**：四個角轉到車位本地座標，`|橫向| ≤ 寬/2` 且 `|縱向| ≤ 長/2`。邊線算內，所以用 `≤`，並加一個具名的極小容差 `LENGTH_EPSILON_M`（1e-9 m）吸收浮點誤差。
2. **夾角**：`|headingDelta(車, 車位)| ≤ 容許值`，含邊界，同樣加具名容差 `ANGLE_EPSILON_RAD`（1e-9 rad）。
3. **車速**：`|speed| < 0.5 mph`，嚴格小於，不加容差（剛好 0.5 mph 不算）。

持續時間用**整數步數**計：`requiredSteps = round(持續秒數 × PHYSICS_HZ)` = 60。三個條件連續成立滿 60 步的那一步判定成功；中途任何一步不成立，計數歸零。不用浮點累加秒數，避免 59.999… 的問題。

**180° 與倒車入庫：** 夾角差折到 (−180°, 180°]，車頭反向時差值是 180°，遠大於 8°，直接失敗。倒車入庫的車位把 `heading` 設成車頭該朝的方向（例如車位開口朝北、要車尾先進，就設成車頭朝北的角度），判定邏輯完全不變。

尺寸餘裕備忘：15×6 ft 的車在 9×18 ft 車位內，置中時左右各 1.5 ft、前後各 1.5 ft；置中且偏 8° 時橫向半寬約 4.02 ft（< 4.5）、縱向半長約 7.85 ft（< 9），所以「置中 + 剛好 8°」是合法的成功案例。

## 6. 操作

| 動作 | 按鍵（`KeyboardEvent.code`） | 本階段 |
| --- | --- | --- |
| 油門（往目前檔位的方向：D 向前、R 向後） | `KeyW`／`ArrowUp` | 接 |
| 左轉 | `KeyA`／`ArrowLeft` | 接 |
| 右轉 | `KeyD`／`ArrowRight` | 接 |
| 剎車 | `KeyS`／`ArrowDown`／`Comma` | 接 |
| 切換 D／R 檔 | `KeyR` | 接 |
| 重來 | `Backspace`／`KeyT` | 接 |
| 切換鏡頭 | `KeyC` | 只在綁定表定義，不接行為 |
| 暫停 | `Escape` | 只在綁定表定義，不接行為 |

- 綁定表是 `src/core/input.ts` 裡的一個常數（動作 → 按鍵清單）。用 `code` 而不是 `key`，不受鍵盤配置與輸入法影響。
- 方向鍵與空白鍵 `preventDefault`，避免捲動頁面；視窗失焦時清空按住狀態。
- 手把、觸控、重新綁定是第 4 階段。

## 7. 鏡頭與畫面

**鏡頭（`src/render/followCamera.ts`）**
- 斜俯視跟隨：鏡頭位置 = 平滑後的目標點 + 固定的世界座標偏移（高度、後退距離），看向目標點。偏移固定在世界座標，所以不隨車身旋轉。
- 平滑用與幀率無關的指數逼近：`係數 = 1 − exp(−dt / 時間常數)`。
- 固定鏡頭預設表（`?cam=` 用）：`follow`（跟隨視角定格）、`top`（車位正上方俯視）、`spot_low`（車位旁低角度）。

**畫面（`src/render/renderer.ts`、`scene.ts`）**
- `WebGLRenderer`（WebGL2、抗鋸齒、sRGB 輸出、色調映射、像素比上限 2、跟隨視窗大小）。
- `DirectionalLight` 開陰影，shadow map 2048；陰影相機範圍跟著車移動，維持解析度。軟陰影類型與色調映射的確切常數名以 `three@0.187.0` 的型別定義為準，實作時查證。
- `HemisphereLight` 補光、天空底色、遠處霧。
- 地面：大平面，`receiveShadow`，貼一張用固定種子生成的柏油顆粒 `DataTexture`，避免純色死板。
- 車位：四條白色標線（略高於地面避免閃爍）。
- 車：車身 + 車艙 + 四個輪子 + 頭燈／尾燈色塊（一眼分得出車頭車尾），前輪依 `steer` 轉向，全部 `castShadow`。
- 光線方向、陰影大小、鏡頭偏移、顏色等集中在 `src/render/renderConfig.ts`，長度用英尺。

## 8. 語言

- `src/locale/zh-TW.json`、`en.json`，鍵完全一致。所有畫面文字都走翻譯鍵。
- `src/core/i18n.ts`：`t(key)`、`setLocale()`、`getLocale()`、`onLocaleChange()`。鍵的型別由 `zh-TW.json` 推導（`keyof typeof`），打錯鍵會編譯失敗。
- 預設語言：`?lang=zh-TW|en` 優先，否則看 `navigator.language`（`zh` 開頭 → zh-TW，其餘 → en）。
- HUD 上有語言切換按鈕，按下即時更新所有文字與 `<html lang>`，不重新載入頁面。
- 本階段不記住語言選擇（存檔是第 2 階段）。
- 字型：CSS 字型堆疊 `system-ui, "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", "Noto Sans CJK TC", sans-serif`，不內嵌、不下載任何字型檔。
- 預計的鍵：`hud.speed`、`hud.controls`、`hud.language`、`status.parked`、`status.restartHint`、`show.unknown`、`bench.running`、`bench.avgFps`、`bench.low1`、`bench.drawCalls`。車速以 mph 顯示。

## 9. 網址參數（自我驗收骨架，規格第 13 節）

`src/core/urlParams.ts` 把網址解析成一個有型別的模式；優先順序 `show` > `cam` > `bench` > 一般遊戲。

| 參數 | 行為 |
| --- | --- |
| （無） | 一般遊戲 |
| `?lang=zh-TW` / `?lang=en` | 指定語言，可與其他參數並用 |
| `?show=<id>` | 展示模式：只顯示該物件，固定燈光與 3/4 視角，沒有玩法與 HUD。本階段登錄 `car_sedan`、`parking_spot`。未知 id 顯示可用清單 |
| `?cam=<預設>&t=<秒>` | 固定鏡頭截圖：沿固定示範路線同步跑 `round(t × 60)` 步物理（不等真實時間），用指定鏡頭畫一幀後定格，並在 `<body>` 設 `data-shot-ready="true"` 讓 Playwright 知道可以截圖 |
| `?bench` | 以真實時間沿同一條固定示範路線跑約 10 秒，結束後輸出結果 |

- **固定示範路線**（`src/level/demoRoute.ts`）：一張「時間 → 輸入」的表（例如前進、右轉、左轉、手煞），`?cam` 與 `?bench` 共用。
- **bench 輸出**：略過前 30 幀暖機後，逐幀記錄幀時間與 `renderer.info.render.calls`。
  - 平均 FPS = 幀數 ÷ 總時間。
  - 1% low = 最慢 1% 幀（至少 1 幀）的平均幀時間換算成 FPS。
  - draw calls = 每幀平均值與最大值。
  - 輸出到畫面上的 `#bench-result`（文字 + `data-result` 的 JSON）與 `console.log('[bench] …')`。
- **固定種子**（`src/core/rng.ts`）：mulberry32 小型演算法（自己寫，不裝套件），種子來自 `gameConfig.ts` 的 `DEFAULT_SEED`。`src/` 內禁用 `Math.random`，由測試把關。
- **e2e 用的唯讀狀態**：`window.__parkingGame.snapshot()` 回傳車的位置（ft）、heading（度）、車速（mph）、是否成功。只能讀、不能改遊戲狀態；輸入一律走真實鍵盤事件。

## 10. 檔案清單（對齊規格第 12 節）

**專案根目錄**

| 檔案 | 用途 |
| --- | --- |
| `package.json` | 釘死版本的相依與 `dev`／`build`／`typecheck`／`test`／`e2e` 指令 |
| `package-lock.json` | lockfile，提交進 git |
| `.npmrc` | `save-exact=true` |
| `.gitignore` | 忽略 `node_modules`、`dist`、Playwright 報告與截圖輸出 |
| `tsconfig.json` | `strict` 全開，另加 `noUncheckedIndexedAccess`、`noUnusedLocals`、`noUnusedParameters`、`exactOptionalPropertyTypes`、`noImplicitOverride` |
| `vite.config.ts` | Vite 建置設定與 Vitest 設定 |
| `playwright.config.ts` | 無頭 Chromium、自動啟動本機伺服器、WebGL 啟動參數 |
| `index.html` | 畫布與 HUD 容器 |

**`src/`**

| 檔案 | 用途 |
| --- | --- |
| `src/main.ts` | 進入點：讀網址參數，啟動遊戲／展示／截圖／bench 其中一種模式 |
| `src/core/units.ts` | 全專案唯一的單位換算 |
| `src/core/heading.ts` | heading 約定：前方／右方向量、夾角差、轉成 Three.js `rotation.y` |
| `src/core/gameConfig.ts` | 物理頻率、單幀時間上限、預設亂數種子 |
| `src/core/fixedLoop.ts` | 固定時間步長累加器與內插係數 |
| `src/core/input.ts` | 按鍵綁定表與鍵盤狀態 → 駕駛輸入 |
| `src/core/i18n.ts` | 翻譯查詢、語言偵測與即時切換 |
| `src/core/rng.ts` | 有種子的亂數產生器 |
| `src/core/urlParams.ts` | 把網址參數解析成有型別的啟動模式 |
| `src/vehicle/vehicleConfig.ts` | 規格第 4 節的車輛數值（美制）與 SI 版本 |
| `src/vehicle/bicycleModel.ts` | 單車模型的狀態與單步更新、四個角點計算 |
| `src/vehicle/carMesh.ts` | 第 1 階段的簡單車輛模型生成 |
| `src/level/prototypeLayout.ts` | 第 1 階段唯一場景的車位與起始姿態（英尺；第 2 階段由關卡 JSON 取代） |
| `src/level/parkingJudge.ts` | 停車判定 |
| `src/level/session.ts` | 一局遊戲：車輛狀態 + 判定進度 + 重來，不依賴 Three.js 與 DOM |
| `src/level/demoRoute.ts` | `?cam` 與 `?bench` 共用的固定示範路線 |
| `src/render/renderConfig.ts` | 鏡頭、燈光、陰影、顏色等可調數值 |
| `src/render/renderer.ts` | 建立 WebGLRenderer、陰影與色調映射設定、視窗縮放 |
| `src/render/scene.ts` | 組裝場景：燈光、霧、地面、車位、車 |
| `src/render/followCamera.ts` | 跟隨鏡頭與固定鏡頭預設 |
| `src/render/showcase.ts` | `?show=` 的物件登錄表與展示場景 |
| `src/render/benchStats.ts` | 由幀時間與 draw calls 算出統計值（純函式） |
| `src/render/benchMode.ts` | 跑 bench、收集數據、輸出結果 |
| `src/props/ground.ts` | 地面與固定種子的柏油顆粒貼圖 |
| `src/props/spotMarkings.ts` | 車位標線 |
| `src/ui/hud.ts` | HUD、語言按鈕、成功畫面，語言切換時更新文字 |
| `src/ui/style.css` | 介面樣式與系統字型堆疊 |
| `src/locale/zh-TW.json` | 繁體中文文字 |
| `src/locale/en.json` | 英文文字 |

**`tests/`（Vitest）**

| 檔案 | 用途 |
| --- | --- |
| `tests/units.test.ts` | 單位換算 |
| `tests/heading.test.ts` | heading 約定與 `rotation.y` 換算 |
| `tests/vehicleConfig.test.ts` | 數值與規格第 4 節一致 |
| `tests/bicycleModel.test.ts` | 單車物理 |
| `tests/fixedLoop.test.ts` | 固定時間步長與可重現性 |
| `tests/parkingJudge.test.ts` | 停車判定（含指定案例） |
| `tests/session.test.ts` | 成功後的狀態與重來 |
| `tests/locale.test.ts` | 兩種語言的鍵一致 |
| `tests/rng.test.ts` | 同種子同結果 |
| `tests/urlParams.test.ts` | 網址參數解析 |
| `tests/benchStats.test.ts` | bench 統計計算 |
| `tests/sourceRules.test.ts` | `src/` 內沒有 `Math.random`、沒有 `any` |

**`e2e/`（Playwright）**

| 檔案 | 用途 |
| --- | --- |
| `e2e/park.spec.ts` | 用按鍵把車開進車位、確認成功訊息、切換英文、截圖 |
| `e2e/modes.spec.ts` | `?show=`、`?cam=&t=`、`?bench` 三種模式能跑並有輸出 |

本階段不建立 `src/materials/`、`src/audio/`、`src/levels/`、`tools/`（分別屬於第 3、4、2、3 階段）。

## 11. 測試計畫

### 11.1 Vitest

**units**
- 1 ft = 0.3048 m、1 mph = 0.44704 m/s（精確值）；來回換算還原；mph/s 與度／弧度換算。

**heading**
- 0°／90°／180°／270° 的前方向量分別是 −Z／+X／+Z／−X；右方向量垂直於前方。
- `headingToRotationY(θ) = −θ`；用 `R_y(φ)` 的公式手算驗證轉出來的車頭方向等於 `forward(θ)`。
- 夾角差：355° 對 3° = 8°；0° 對 180° = 180°；結果落在 (−180°, 180°]。

**VehicleConfig**
- 每個數值與規格第 4 節逐項比對；SI 版本等於經 `units.ts` 換算的結果。

**單車物理**
- 全油門 1 秒後 6 mph、3 秒後 18 mph，之後不超過 18 mph。
- 倒車最高 −9 mph。
- 18 mph 放開油門：6 秒停下，停在剛好 0，不變號。
- 18 mph 反向油門：1 秒到 0，繼續按才開始倒車。
- 18 mph 踩剎車：1 秒停下；踩著剎車時油門無效。
- 方向盤：35/90 秒打到底、35/120 秒回正、不超過 ±35°。
- heading 0° 直行：z 減少、x 不變；heading 90° 直行：x 增加。
- 前進 + 右轉 → heading 增加；前進 + 左轉 → 減少；倒車 + 右轉 → 減少。
- 全鎖定速繞圈：後軸軌跡半徑 ≈ 12.85 ft（誤差 1% 內）。
- 靜止時打方向盤，位置與 heading 不變。
- 同一串輸入跑兩次，狀態逐位元相同。

**固定時間步長**
- 均勻幀與不規則幀（總時間相同）跑出相同步數與相同狀態；超長單幀被上限截斷。

**停車判定（指定案例）**
1. 置中、同向、靜止：第 59 步未成功，第 60 步成功。
2. 邊線算內：車身側邊剛好壓在車位邊線（橫移 1.5 ft）、車頭剛好壓線（縱移 1.5 ft）→ 成功。
3. 超出一點（1.51 ft）→ 失敗；只有一個角在外也失敗。
4. 夾角剛好 +8° 與 −8° → 成功；8.01° → 失敗。
5. 車速 0.49 mph → 成立；剛好 0.5 mph → 不成立；倒車的 −0.49／−0.5 mph 同理。
6. 持續中途有一步不成立 → 計數歸零，要重新滿 1 秒。
7. **180°**：四角在內、靜止、車頭與車位相差 180° → 永遠不成功；172° 與 188° 也不成功。
8. **倒車入庫**：車位 `heading` 設為車頭該朝的方向，車以負速度倒入後停下、heading 與車位相同 → 成功；同一車位車頭朝反方向停入 → 失敗。
9. 跨 0° 邊界：車位 355°、車 3° → 成功；車 4° → 失敗。
10. 每關可調容許值：容許值設 3° 時 4° 失敗。
11. 斜向車位（heading 30°）對正停入 → 成功。

**session**
- 成功後狀態為已停妥；重來後車回起始姿態、判定進度歸零。

**翻譯**
- zh-TW 與 en 的鍵集合完全相同；沒有空字串。

**其他**
- rng 同種子同序列、不同種子不同序列；地面貼圖同種子位元組相同。
- 網址參數各模式與優先順序、未知值的處理。
- bench 統計：已知幀時間序列算出正確的平均 FPS 與 1% low。
- `src/` 原始碼不含 `Math.random` 與 `any` 型別。

### 11.2 Playwright（無頭 Chromium）

- `playwright.config.ts` 的 `webServer` 自動啟動本機伺服器，固定連接埠與視窗大小。
- 無頭 WebGL：先試預設；跑不起來就加軟體算圖參數（`--use-gl=angle`、`--use-angle=swiftshader`，必要時 `--enable-unsafe-swiftshader`）。最後實際用到哪些參數寫進階段回報。
- **`park.spec.ts`**
  1. 開 `/?lang=zh-TW`，等畫布與 HUD 出現。
  2. 用真實鍵盤事件（`keyboard.down`／`up`）開車：按住 W 前進，接近車位後放開，按住逗號（剎車）停車；過頭就按 R 切到 R 檔、再按 W 倒回來。以 `window.__parkingGame.snapshot()` 的唯讀狀態做閉迴路判斷何時放鍵，低速接近，不靠寫死的毫秒數，軟體算圖幀率不穩也不會失敗。
  3. 等成功訊息出現，確認文字是中文版。
  4. 按語言按鈕，確認同一個訊息變成英文、`<html lang>` 變成 `en`。
  5. 截圖（中文成功畫面、英文成功畫面）。
  6. 按 R，確認成功畫面消失、車回到起點。
- **`modes.spec.ts`**
  - `?show=car_sedan`：畫面出現、沒有 console 錯誤、截圖。
  - `?cam=top&t=2`：等 `data-shot-ready`，截圖；重開同一網址再截一次，兩張完全相同（驗證可重現）。
  - `?bench`：等結果出現，確認平均 FPS、1% low、draw calls 都是大於 0 的有限數字。無頭軟體算圖的數字不代表真實效能，只驗證「真的有輸出」。
- 所有 e2e 都檢查頁面沒有 console error。
- 截圖輸出到 `e2e/output/`，不進 git。階段結束前我會自己看每張截圖，列出不夠好的地方，改好或寫進已知問題（規格第 13 節）。

### 11.3 回報前必跑

`npm run typecheck`、`npm test`、`npm run build`、`npm run e2e` 全過才回報完成；沒跑或沒過就照實寫。

## 12. 實作步驟（小輪次）

每一輪做完都跑該輪相關的驗證再 commit；不 push、不加 remote。

| 輪次 | 內容 | 完成條件 |
| --- | --- | --- |
| 1 | 骨架：`package.json`（釘死版本）、lockfile、`.npmrc`、`.gitignore`、`tsconfig.json`、`vite.config.ts`、`index.html`、最小 `main.ts` | `typecheck`、`build` 通過；瀏覽器看得到空畫布 |
| 2 | `units.ts`、`heading.ts`、`gameConfig.ts`、`vehicleConfig.ts` 與測試 | 對應 Vitest 通過 |
| 3 | `bicycleModel.ts`、`fixedLoop.ts` 與測試 | 對應 Vitest 通過 |
| 4 | `renderer.ts`、`scene.ts`、`ground.ts`、`carMesh.ts`、`rng.ts`、`input.ts`、`followCamera.ts`、`renderConfig.ts` | 瀏覽器裡能用鍵盤開車，有陰影，鏡頭平滑跟隨 |
| 5 | `i18n.ts`、兩份 locale、`hud.ts`、`style.css`、語言按鈕與測試 | 按鈕即時切換中英；鍵一致測試通過 |
| 6 | `prototypeLayout.ts`、`spotMarkings.ts`、`parkingJudge.ts`、`session.ts`、成功畫面、R 重來與測試 | 停進車位顯示成功；判定測試（含 180°、倒車入庫）通過 |
| 7 | `urlParams.ts`、`showcase.ts`、`demoRoute.ts`、`benchStats.ts`、`benchMode.ts`、固定鏡頭截圖模式與測試 | 三種網址參數可用；bench 輸出數字 |
| 8 | `playwright.config.ts`、兩個 e2e、下載 Chromium、看截圖修問題 | 全部驗證通過 |
| 9 | 階段回報：做了什麼、怎麼試玩、已知問題、下一步；等指示才進第 2 階段 | — |

## 13. 程式品質約束

- TypeScript `strict`，不用 `any`，不用 `@ts-ignore`；JSON 以 `resolveJsonModule` 匯入取得型別。
- 少抽象：以純函式與一般物件為主，不為「以後可能用到」預先加介面、基底類別或事件系統。
- 無死碼：沒被呼叫的函式、沒用到的參數與匯出都不留（`noUnusedLocals`／`noUnusedParameters` 強制）。唯一的例外是使用者指定的 C、Esc 兩個按鍵在綁定表中的定義。
- 可調數值不散落：車輛數值在 `vehicleConfig.ts`，場景配置在 `prototypeLayout.ts`，畫面數值在 `renderConfig.ts`，模擬參數在 `gameConfig.ts`；換算係數只在 `units.ts`。其他檔案不出現裸數字（0、1、2 這類結構性數字除外）。
- 對外一律美制單位（設定檔、HUD、e2e 唯讀狀態）；內部一律公尺、秒、弧度。
- 邏輯層（`core`、`vehicle/bicycleModel`、`level`）不 import Three.js、不碰 DOM。

## 14. 需要確認的假設

規格沒寫到、我先這樣定的地方。有不同意的請在開工前說，否則照此實作：

1. **前後懸對稱**：軸距 9 ft、車長 15 ft，假設前後懸各 3 ft，所以後軸在車身中心後方 4.5 ft。
2. **倒車加速度**：規格只給一個加速度，倒車也用 6 mph/s。
3. **油門與檔位**（2026-11-13 [pt28u] 改寫；原本是「油門與煞車共用按鍵」）：油門只往目前檔位的方向推，要換方向先按「切換 D／R 檔」。行進中切到另一檔再踩油門，車先以 18 mph/s 減速到 0，再往新的方向加速（物理層的規則不變）；要停車踩剎車。
4. **方向盤反打**：有輸入時一律用 90°/s（含從另一側打回來經過中心的那段），只有放開時才用 120°/s 回正。
5. **起始配置**：車在車位正後方約 60 ft、與車位同向，直線開進去就能停。對 e2e 最穩定，也能驗收。想要一開始就需要轉向的配置請告知。
6. **不裝 `@types/node`、ESLint、jsdom**（本文件第 2 節）。「不用 `any`」與「不用 `Math.random`」改由 `tests/sourceRules.test.ts` 把關。
7. **截圖不進 git**：第 1 階段截圖只當驗收產物；基準圖比較工具留到 `tools/` 出現的階段。
8. **語言選擇不保存**：重新整理後回到瀏覽器語言，因為存檔是第 2 階段。
9. **中文字型**：用系統字型。這台機器有 Noto Sans CJK TC，無頭截圖的中文可正常顯示；其他機器若沒有中文字型會顯示成方塊，屆時列為已知問題，不會自行加字型檔。
10. **TypeScript 7.0.2**：若某個 `tsconfig` 選項在這版被移除或改名，依官方文件調整選項，不改版本；調整內容會寫進回報。
