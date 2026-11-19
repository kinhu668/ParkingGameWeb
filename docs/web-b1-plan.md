# ParkingGameWeb 批次 B1 與 C 計畫

2026-11-18 · 基準 `main@5785270` · 純規劃：沒有改任何檔案、沒有跑 git、測試或 build。規格依 `/workspace/ParkingGame-web-spec-v0.2.md` 第 15 節（工作規則）、第 10 節（Web Audio 合成）、第 1 節（資產程序化、加套件先問）。

寫作說明：長文曾兩次在中途被切斷；「地上的光暈」起為同一 session 的接續寫完，再拼成一份。可行性審查與勘誤見文末「審查註記」。

## 0. 核對過的程式現況

- 沒有 `src/audio/`，專案沒有任何音效程式。`package.json` 只有 `three`，加上 dev 的 vite、vitest、playwright、typescript。
- `SaveSettings`（`src/core/save.ts`）只有 `locale?`。`parseSave` 會丟掉不認得的欄位。鏡頭與按鍵綁定各自存在別的 localStorage 鍵，畫質沒有存。
- `src/ui/pausePanel.ts` 只有繼續、重來、選關、按鍵設定，沒有音量。
- `vehicleHits` 回傳重疊障礙物的索引。`stepSession` 撞到就把位置退回上一步並反彈，同一物件冷卻 30 步（0.5 秒）。
- `Session.hitCooldownUntil` 與 `layout.obstacles` 同索引：關卡障礙物在前，四面邊界牆在後。這個陣列只在「有計次」的那一步才換成新陣列。
- `VehicleState` 只有 `x, z, headingRad, speedMps, steerRad`。
- **沒有手煞車**：`CONTROL_ACTIONS` 是 throttle、steerLeft、steerRight、brake、gearToggle、restart、toggleCamera、pause。空白鍵是切換 D／R，舊存檔的 `handbrake` 在 `parseBindings` 被丟掉。規格第 3 節的手煞車目前不存在。
- `readGroundPos` 規定 `pos` 的 y 必須是 0。`MAX_WORLD = 5`、`LEVELS_PER_WORLD = 10`，第 1 世界 10 格已滿。`main.ts` 的 `SELECT_WORLD = 1` 寫死，關卡選擇只列第 1 世界。
- `obstacleTypes.ts` 沒有 `ambulance`。`delivery_van` 的碰撞盒是 7 × 20 ft。
- 停放車每款車的幾何有獨立的 `headlight`、`taillight`、`indicator` 分區（`createCarModelParts`），但都併進不發光的 `rest` 網格。`delivery_van`、`food_truck`、`surf_suv` 是單一頂點著色幾何，燈只是色塊。玩家車有真的 `SpotLight`（`carHeadlights.ts`，盞數看 `quality.headlights.spotLights`）。
- 環境只有 `open_lot`、`warehouse_club`、`post_office`、`city_street`、`narrow_alley`。鏡頭是 `chase_near`（高 5.5 ft）、`chase_far`（高 22 ft）、`hood`、`cockpit`、`top`（高 70 ft）。
- 換關與回選關是整頁重新載入（`navigateTo` 用 `location.assign`），只有重來留在同一頁。暫停時 `simSeconds = 0`。
- `tests/sourceRules.test.ts` 禁止 `src/` 出現 `Math.random`。`e2e/fixtures.ts` 只要有 `console.error` 或 `pageerror` 就判失敗。
- `w1_l09`（city_street、night、唯一平行停車）有一台併排的 `delivery_van` 在 `[-50, 0, 2.6]`、heading 90，官方路線從它北側 z = −6.22 繞過。`tests/levelCatalog.test.ts:479` 釘住這一關的障礙物類型清單。

## 1. 結論

- **B1 先做，大小：中到大（約 10–12 輪 25 分鐘回合，含審查與整套 e2e）。** 內容是撞車警報（閃燈加喇叭）、靜止的救護車（燈條會閃、被撞會「嗚嗚」叫）、最小的 Web Audio 合成模組（碰撞悶響、警報、警笛、倒車嗶聲、靜音、音量、手勢解鎖），以及設定與兩種語言。
- **B1 不動碰撞模型。** 警報是純表現層，不加任何代價。救護車停著不動，取代 `w1_l09` 那台併排貨車，碰撞盒同為 7 × 20 ft，官方路線、`target_time`、N 都不變。
- **C 在 B1 之後，大小：大，拆四個子批次（以第 3.2 節為準）。**
  - C1：選關世界分頁與解鎖（小，約 2 回合）。
  - C2：室內車庫（平面）、室內光、屋頂剖切、第 3 世界前 4 關（大，約 10–12 回合）。
  - C3：地形與斜坡物理、坡道街、「輪子打向路緣」、第 2 世界前 4 關（大，約 12–14 回合）。
  - C4：車庫錯層與坡道、第 3 世界再 2 關（中，約 6–8 回合）。
  - 依賴：C1 → C2、C3（C2 與 C3 互不依賴，建議先 C2）；C4 依賴 C2 與 C3。
- **第三方套件與外部素材：兩批都是 0。** 沒有音檔、貼圖、字型、模型檔。
- 程序依 `CLAUDE.md`：每個子批次開新對話，開工時把本計畫對應段落存成 `docs/web-b1-plan.md`、`docs/web-c-plan.md`。模型交 `procedural-modeler`，結尾交 `stage-reviewer`。每個小功能一個 commit，e2e 獨占一輪。

## 2. 批次 B1

### 2.1 警報

**觸發規則**

| 障礙物 | 反應 | 理由 |
|---|---|---|
| `parked_car`（5 款）、`surf_suv`、`delivery_van` | 車用警報：閃燈加喇叭 | 使用者要的「撞到車會有警報」 |
| `ambulance` | 警笛短鳴 2.5 秒，燈條改快閃 | 搞笑障礙物 |
| `food_truck` | 無警報，只有悶響 | 營業中、車上有人；見問題 1 |
| 牆、柱、錐、推車、其他、邊界牆 | 無警報，只有悶響 | 不是車 |

- 每一次「計入的碰撞」都觸發，不看力道。它同時是「剛被記一次碰撞」的回饋。
- 冷卻中再撞不計次，所以沒有事件，警報不變。
- 警報中再被計次：剩餘時間重設為 6 秒，閃爍相位與聲音不重啟。
- 警報沒有額外代價，不扣分、不影響星數與挑戰。
- 重來時立刻全停（30 ms 淡出）。停妥或失敗時 0.8 秒淡出並熄燈。換關是整頁重載，自然結束。暫停時凍結，繼續後接著響。

**怎麼拿到「撞到哪一個」**：不改 `Session` 的形狀。在 `session.ts` 加一個純函式 `countedHits(previous, next)`，比較前後兩步的 `hitCooldownUntil`，回傳這一步計次的索引與撞擊車速（取 `|previous.vehicle.speedMps|`）。索引小於 `level.obstaclesFt.length` 的查類型，其餘是邊界牆。`main.ts` 在物理步迴圈裡每步收集，重來那一幀清空、不跨局比較。

**閃燈做法**

- 警報狀態放在新的純邏輯模組 `src/level/alarm.ts`：每個障礙物的已響秒數與剩餘秒數、類型對照表、燈亮不亮的相位函式。
- `parked_car`：`src/effects/vehicleBeacons.ts` 用 `createCarModelParts` 把每款車的頭燈、方向燈、尾燈分區併成一個「燈罩」幾何。每款車一個 `InstancedMesh`，不吃光、白／琥珀／紅頂點色、`polygonOffset`。沒有警報時 `visible = false`，零成本。亮的半週期把實例矩陣設成車的矩陣，暗的半週期縮成零。
- `delivery_van`、`surf_suv`、`ambulance`：請 `procedural-modeler` 另外輸出同一本地座標的燈幾何（`create…LampGeometry()`）。疊圖用與車身相同的實例矩陣，由 `obstacleMeshes.ts` 匯出小函式提供。
- 喇叭的開關由同一個相位驅動（每幀下指令），聲光一定同步，暫停也一起停。
- 已知小瑕疵：車被跟車鏡頭淡成半透明時，燈罩仍不透明。先接受。

**可調常數（放 `src/core/gameConfig.ts` 的 `ALARM_RULES`）**

| 常數 | 建議值 |
|---|---|
| `durationS` | 6 |
| `flashPeriodS`（亮暗各半） | 0.7（約 1.4 Hz） |
| `maxVoices`（同時發聲的警報） | 3，超過時最舊的淡出，燈照閃 |
| `endFadeS` / `restartFadeS` | 0.8 / 0.03 |
| `sirenYelpS`（救護車被撞） | 2.5 |

**閃光安全**：每顆燈不超過每秒 3 次（WCAG 2.3.1）。系統設了 `prefers-reduced-motion: reduce` 時，警報燈改恆亮到結束，燈條改 0.5 Hz 緩慢明暗。

### 2.2 救護車

**方案：停著不動，靠燈條、地面光暈與被撞時的短鳴讓它看起來是活的。** 這是最簡單也仍然好看的做法：夜晚街景裡紅白燈交替很搶眼，而碰撞、官方路線、鏡頭擋塊、定格截圖全部不用動。

**為什麼這批不讓它動（B2 的邊界）**

1. `bounceBack` 假設上一步沒有重疊。障礙物自己開過來壓到靜止的玩家時，退回上一步仍然重疊，車會卡在裡面，每 0.5 秒被記一次碰撞直到失敗。`collision.ts` 只回傳是否重疊，沒有穿透深度可以把車推開。
2. `layout.obstacles` 是每局不變的陣列。會動就要把障礙物姿態放進 `Session` 或寫成時間的函式，官方路線、可解性測試、N 秒門檻、`?cam=…&t=` 定格全部變成與時間有關。
3. 算圖端的障礙物是靜態 `InstancedMesh`，鏡頭擋塊與遮擋淡出只在建場景時收集一次。
4. 還缺「誰讓誰」的規則：移動物要偵測前方並停下，被它撞到算誰的。這些要先寫 B2 的碰撞計畫。

**外觀（交給 `procedural-modeler`）**

- 廂型車式救護車。碰撞盒預設 **7 × 20 ft**（與 `delivery_van` 相同），車高約 8.8 ft（含燈條）。
- 白車身，橘色加青綠色腰線，側面一道心電圖折線當識別圖案。
- **不用紅十字**（受保護的標誌）、**不用生命之星**（註冊標章）、不寫真實單位名稱、不寫 911。
- 文字：車側 `MAPLE HOLLOW AMBULANCE`（沿用遊戲裡虛構的鎮名），車尾 `AMBULANCE`，編號 `MEDIC 7`。放進 `PROP_SIGNS`，過既有的真實品牌檢查。實作時再查一次不是真實單位（上一批 "Aloha Plate" 的教訓），備案 `PINE HARBOR AMBULANCE`。
- 車頂燈條分左右兩組（紅、白），車尾上角兩顆琥珀燈，水箱罩兩顆紅燈。燈條與警示燈要輸出成獨立幾何。
- `art/reference/` 目前沒有救護車參考圖。模型師照 `CLAUDE.md` 先讀該資料夾並在回報裡註明沒有，依美術方向與上述尺寸做。要不要補參考圖見問題 5。

**燈條**

- 純函式 `lightbarState(timeS, mode)` 回傳左、右、車尾燈的亮暗。
- 待機：左右交替，週期 `LIGHTBAR_IDLE_PERIOD_S = 1.0`。被撞後 2.5 秒：週期 `LIGHTBAR_ALERT_PERIOD_S = 0.4`。
- 顯示分三層：
  - 發光疊圖：每個畫質級別都有，HDR 級別會吃到泛光。
  - 地上的光暈：燈條正下方與車尾各一片加色混合的貼地面片（做法同 `carHeadlights.ts` 的 `createPool`），顏色跟著亮的那一組燈走。只在 `quality.headlights.groundPool` 為真的級別建立，並標 `SKIP_GROUND_REFLECTION`、`SKIP_AMBIENT_OCCLUSION`。半徑 `LIGHTBAR_POOL_RADIUS_FT = 14`。
  - 真光源：只在 `quality.headlights.spotLights > 0` 的級別加**一盞**不投影的 `PointLight`（`LIGHTBAR_LIGHT_DISTANCE_FT = 40`、`LIGHTBAR_LIGHT_INTENSITY` 可調）。建場景時就建好，之後只改顏色與強度（燈的數量不變，不會觸發著色器重編）。
- 閃光安全：單一燈具每秒明暗不超過 3 次（待機 1 Hz、警戒 2.5 Hz）。系統開了 `prefers-reduced-motion` 時燈條改成恆亮，警戒只提高亮度。
- 可重現：`?fx=off` 與 `?cam=` 定格時相位固定在 0（左組亮），同一個網址每次截圖相同。
- 暫停時燈號停在當下（吃的是模擬時間，與計時一致）。

**被撞到**

- 照一般碰撞計一次，沒有額外代價。
- 燈條進警戒模式 `AMBULANCE_ALERT_SECONDS = 2.5` 秒，同時鳴一聲短促的警笛（見 2.3）。冷卻中再撞不重複觸發；冷卻過後再撞，重新計 2.5 秒。

**擺放：取代 `w1_l09` 併排的快遞貨車**

- `src/levels/w1_l09.json` 第一個障礙物 `delivery_van`（`pos [-50, 0, 2.6]`、`heading 90`）改成 `ambulance`，位置與方向不動。碰撞盒同為 7 × 20 ft，所以官方路線、`target_time`、N、碰撞上限都不必改。
- 核對過的數字：官方路線在 z = −6.22 繞過去，車身南緣 z = −3.22，碰撞盒北緣 z = −0.9，間隙 2.32 ft，換車後不變。起點車頭到救護車車尾 30.5 ft，車又高又亮，符合「起點前方的障礙物開場要看得到」的規則。
- 選這一關的理由：夜晚，燈條最顯眼；唯一的平行停車關，前後夾車正是最容易觸發警報的地方，兩個新功能在同一關展示；「繞過閃著燈併排的救護車」比貨車有戲。
- 不選其他做法的理由：
  - 新關：第 1 世界 10 格已滿（`LEVELS_PER_WORLD = 10`），選關畫面只有第 1 世界（`SELECT_WORLD = 1`），開新關要先做世界分頁（批次 C1）。
  - `w1_l10`：設計規則是「第 10 關不加新東西」。
  - `w1_l06`：要另找不在路線上的位置並重驗路線，沒有必要。
- `w1_l05` 的 PELICAN PARCEL 貨車留著。第 2 世界的街道關之後可以再用救護車。
- 會動到的測試：`tests/levelCatalog.test.ts`（釘住 l09 的障礙物類型清單）、`tests/levelSchema.test.ts`（類型清單）、`tests/obstacleMeshes.test.ts`（高的類型、貼字）。要重跑確認的：`tests/targetVisibility.test.ts`、`tests/openingCamera.test.ts`，以及 e2e 的 `spotGlow`、`controls`、`levels`、`level`（都有用到 l09）。

**這批不動的結論**

靜止的車加上會閃的燈條、地上的光暈和被撞時的警笛，看起來已經是「活的」，而碰撞、路線、鏡頭擋塊一行都不用改。會動的版本留給 B2，連「在場地外開過去、碰不到」的純佈景版本也算 B2。

### 2.3 音效模組

**原則**

- 只用 Web Audio API 合成。不新增 npm 套件，不下載也不內嵌任何音檔。
- 雜訊用 `core/rng.ts` 的固定種子產生（`tests/sourceRules.test.ts` 禁止 `Math.random`）。
- 沒有 `AudioContext`、建立失敗或被瀏覽器擋住時，整個模組變成空動作：不丟例外、不寫 `console.error`（e2e 的共用 fixture 會因為任何 console error 判失敗）。
- 只有一般遊戲（`runGame`）建立音效；`?show`、`?cam`、`?bench` 與選關畫面不建立。

**三個檔案**

| 檔案 | 內容 | 能不能在 Vitest 測 |
| --- | --- | --- |
| `src/audio/soundDirector.ts` | 純邏輯。每幀吃遊戲狀態，吐出聲音指令 | 可以，不需要 Web Audio |
| `src/audio/voices.ts` | 各種聲音的節點接法（合成配方） | 用手寫的假 context 測接線 |
| `src/audio/audioEngine.ts` | 建立 context、解鎖、匯流排、音量與靜音、暫停、執行指令、唯讀快照 | 用手寫的假 context 測 |

- `soundDirector` 的輸入：模擬時間的 dt、這一局是否進行中、是否暫停、檔位、這一幀計入的碰撞（障礙物索引、類型、撞擊車速）、2.1 的警報狀態。
- 輸出的指令：`thud(gain)`、`alarmStart(index, variant)`、`alarmGate(index, on)`、`alarmStop(index, fadeS)`、`sirenYelp(index)`、`beep()`、`stopAll(fadeS)`。
- 警報喇叭的開關由同一個相位決定燈號與 `alarmGate`，所以聲音和閃燈一定同步，也跟著暫停停住。60 fps 下誤差最多 16 ms，聽不出來。

**訊號路徑**

各聲音 → `sfx` 匯流排 → 主音量 → 限幅器（內建的 `DynamicsCompressorNode`，三台車同時叫也不破音）→ 輸出。另外先建好 `engine`、`ambience`、`music` 三個空的匯流排接到主音量，這批不放任何聲音，之後加引擎聲、環境音、音樂時不必改結構。

**合成配方（數字都是可調常數，放 `src/audio/voices.ts` 開頭的設定物件）**

| 聲音 | 做法 | 建議值 |
| --- | --- | --- |
| 碰撞悶響 | 固定種子的雜訊短脈衝過低通，加一個下滑的正弦 | 低通 300 Hz；正弦 70 → 40 Hz；長度 0.12 s；音量依撞擊車速，0 mph 時 0.25，6 mph 以上 1.0 |
| 車輛警報（喇叭型） | 兩個方波過低通，由燈號相位開關 | 420 Hz ＋ 525 Hz；低通 1.8 kHz；每台車依障礙物索引變調 −200／0／＋150／＋300 音分 |
| 車輛警報（警報器型） | 一個鋸齒波快速上掃 | 650 → 1500 Hz，每秒 4 次；每三台車有一台用這型 |
| 救護車警笛（短鳴） | 鋸齒波過帶通，來回掃頻 | 650 ↔ 1550 Hz，每秒 3.3 次，長度 2.5 s |
| 倒車嗶聲 | 正弦加一個弱的二倍頻 | 1000 Hz；響 0.22 s、週期 0.8 s；起音與收音各 8 ms；音量 0.18 |

- 同時最多 `ALARM_MAX_VOICES = 3` 個警報聲。第 4 台被撞時，最舊的那一個聲音以 30 ms 淡出讓位，它的燈照常閃完。
- 警報型與悶響一律單聲道，這批不做左右定位。
- 倒車嗶聲：掛 R 檔、這一局進行中、沒有暫停時才響；切到 R 檔立刻響第一聲，切回 D 檔就停。節奏用模擬時間算，暫停時不會響。

**什麼時候停**

- 重來：`stopAll(0.03)`，警報狀態清空。
- 停妥或失敗：`stopAll(0.8)`，燈同時熄。
- 換關或回選關：整頁重新載入，context 自然消失。
- 暫停、正在等玩家按新鍵（`touch.listening()`）：`context.suspend()`，繼續時 `resume()`。
- 分頁切到背景：`visibilitychange` 變成 hidden 就 `suspend()`。這一條是必要的：背景分頁的 `requestAnimationFrame` 會停，沒有人去關警報的開關，聲音會一直響。

**手機自動播放解鎖（必做）**

1. context 延後建立，一開始是 suspended。
2. 在 `window` 掛 `pointerdown`、`keydown`、`touchend`（capture、passive）。處理函式裡**同步**做三件事：需要的話建立 context、呼叫 `resume()`、播一個一格長的無聲緩衝（舊版 iOS 要這一步）。
3. `state` 變成 `running` 後拿掉監聽。之後若 `statechange` 回到 `suspended` 或 `interrupted`（來電、切 App），重新掛上，下一次觸碰再解鎖。
4. 每次換關都是整頁重新載入，所以**每一頁都要重新解鎖**。玩家開車的第一下（按鍵或踩踏板）就是那個手勢；不開車就不會撞到東西，所以不會有該響而沒響的聲音。
5. 解鎖前產生的指令直接丟掉，不排隊補播。
6. iPhone 的實體靜音開關會讓 Web Audio 沒聲音。這批尊重這個開關，不繞過。

**音量與靜音**

- 主音量增益 = 靜音 ? 0 :（volume ÷ 100）² × `MASTER_HEADROOM = 0.8`。用 `setTargetAtTime`（時間常數 0.02 s）改，不會有爆音。
- 靜音時指令照常執行、只是增益為 0，取消靜音後正在響的警報會直接接上。

**唯讀快照（給 e2e）**

`window.__parkingGame` 多三個函式：

- `audio()`：`unlockRequested`、`contextState`、`volume`、`muted`、`voices`（例如 `['alarm:12', 'siren:0']`）、`beeps`（累計嗶了幾聲）、`thuds`。
- `alarms()`：每個響著的警報的障礙物索引、剩餘秒數、燈現在亮不亮。
- `lightbars()`：每台救護車的障礙物索引、模式（idle／alert）、左右燈現在亮不亮。

### 2.4 設定與 i18n

**放在哪裡**

- 暫停面板（`src/ui/pausePanel.ts`）加一列「音效」：靜音切換鈕、「−」「＋」兩顆鈕、目前音量的讀數（例如 `70%`）。每按一下 `VOLUME_STEP = 10`，範圍 0–100。
- 不用 `<input type="range">`：`core/input.ts` 在 `window` 上對方向鍵一律 `preventDefault`，而且假設畫面上沒有輸入元件。用按鈕就沒有焦點與方向鍵衝突，手機上也好按，沿用現成的 `ui.button`。
- HUD 右上角（語言鈕、選關鈕那一組）加一顆快速靜音鈕。手機在公共場合突然響警報時，要能一下關掉。
- 不加靜音快捷鍵：新增 `ControlAction` 會讓舊的按鍵存檔被 `parseBindings` 當成壞檔（少一個動作就整份丟掉），要另寫遷移，這批不值得。

**存檔**

- `SaveSettings` 加選填欄位 `audio?: { volume: number; muted: boolean }`。`SAVE_VERSION` 維持 1。
- 預設 `DEFAULT_AUDIO = { volume: 70, muted: false }`。
- 讀檔：`audio` 欄位壞了（不是物件、數字超出範圍）只當作沒有這個欄位，不讓整份存檔作廢（比照 `challenges` 與 `levelsRevision` 的做法）；音量取整並夾在 0–100。
- 新增 `withAudio(save, audio)`，每次改動用 `updateSave` 寫回（每次重讀，不會蓋掉別的分頁的進度）。
- 已知限制（與既有的相同）：還在跑舊版程式的分頁寫回存檔時會丟掉 `audio` 欄位。

**翻譯鍵（兩份 JSON 同時加，`tests/locale.test.ts` 會檢查鍵一致）**

| 鍵 | zh-TW | en |
| --- | --- | --- |
| `audio.title` | 音效 | Sound |
| `audio.volume` | 音量 | Volume |
| `audio.volumeDown` | 調低音量 | Volume down |
| `audio.volumeUp` | 調高音量 | Volume up |
| `audio.mute` | 靜音 | Mute |
| `audio.unmute` | 取消靜音 | Unmute |
| `audio.silentHint` | 聽不到聲音？請檢查手機的靜音開關。 | No sound? Check your phone's silent switch. |

- 靜音鈕的文字與 `aria-label` 顯示「按下去會做的事」（未靜音時顯示「靜音」），HUD 與暫停面板共用同一組鍵。
- `audio.silentHint` 只在觸控裝置的暫停面板顯示。
- 救護車車身的字是模型上的招牌文字，走 `PROP_SIGNS`，不是翻譯鍵。

### 2.5 測試

**Vitest（新檔）**

| 檔案 | 測什麼 |
| --- | --- |
| `tests/hitEvents.test.ts` | 一步裡計入的碰撞索引與撞擊車速；冷卻中的碰撞不出事件；同時撞兩個物件出兩筆 |
| `tests/alarm.test.ts` | 類型表（哪些會叫）；觸發、延長、到時熄滅；燈號相位每秒不超過 3 次明暗；重來清空；暫停（dt = 0）不前進 |
| `tests/lightbar.test.ts` | 待機與警戒的週期、左右不同時亮、相位 0 是左組亮、減少閃光模式恆亮 |
| `tests/soundDirector.test.ts` | 倒車嗶聲的節奏（切 R 立刻一聲、0.8 s 一聲、切回 D 停、暫停不響、局結束不響）；警報最多 3 聲、第 4 台搶最舊的；`alarmGate` 與燈號同相；停妥淡出、重來立刻停；救護車只出 `sirenYelp` |
| `tests/audioEngine.test.ts` | 用手寫的假 context：解鎖只在手勢裡呼叫 `resume()`；`running` 後拿掉監聽、被中斷後重掛；靜音時主增益 0；音量曲線；暫停與背景分頁會 `suspend()`；沒有 `AudioContext` 時每個函式都是空動作且不丟錯 |

**Vitest（改既有檔）**

- `tests/save.test.ts`：`audio` 欄位的讀寫、預設、壞值不作廢整份存檔、舊存檔沒有這個欄位。
- `tests/obstacleMeshes.test.ts`：`ambulance` 的外框等於碰撞盒、列入高的類型、貼字在車身範圍內、燈條與警示燈幾何落在車身外框內、面數上限。
- `tests/levelSchema.test.ts`、`tests/levelCatalog.test.ts`：類型清單加 `ambulance`；l09 的障礙物清單改掉。
- `tests/environmentSigns.test.ts`：新的招牌字過真實品牌檢查。
- `tests/hud.test.ts`：音量加減的純函式（夾在 0–100）。
- `tests/sourceRules.test.ts` 不用改，它自動涵蓋 `src/audio/`。

**e2e（新檔 `e2e/audio.spec.ts`；型別一律 `import type`，避免把語系 JSON 帶進規格檔）**

1. 解鎖：進 `w1_l03`，還沒按鍵時 `audio().unlockRequested` 是 false；按一下鍵後變 true，`contextState` 輪詢到 `running`。
2. 撞車警報：沿用 `collision.spec.ts` 的倒車撞車。撞到後 `alarms()` 有那台車、`voices` 有 `alarm:<索引>`、燈號在亮暗之間切換；碰撞數只加 1；約 6 秒後清空。再撞一次後按 T，立刻清空。
3. 靜音與音量：暫停 → 按靜音 → `audio().muted` 為 true；按「−」兩下音量 50；重新整理後兩者都還在；HUD 角落的靜音鈕與面板同步。
4. 倒車嗶聲：切 R 檔，2 秒內 `beeps` 增加至少 2；暫停期間不增加；切回 D 檔後不再增加。
5. 救護車：進 `w1_l09`，`lightbars()` 有一台、左右燈隨時間交替；直直往前開約 30 ft 撞上車尾，碰撞數加 1、模式變 alert、`voices` 有 `siren:<索引>`，約 2.5 秒後回到 idle。
6. 定格：`?level=w1_l09&fx=off` 連讀兩次 `lightbars()` 相位不變。
7. 截圖存 `e2e/output/`：`?show=obstacle_ambulance`（正面、側面 `az=90`、車尾 `az=180`）、l09 夜景開場、撞車瞬間車燈亮起的一張。

**展示模式**

`obstacle_ambulance` 會自動出現（展示登錄表依 `OBSTACLE_TYPES` 產生），不必另外登錄。展示台上燈條固定在相位 0。

**流程提醒**

- e2e 獨占一輪（每輪 25 分鐘的限制），在匯出的樹上跑（`logs/web-levels-tools/e2e-at.sh`）。
- 改完 l09 後 16 個既有規格檔全部重跑一次。

### 2.6 要新增或修改的檔案

**新增**

| 檔案 | 誰做 | 內容 |
| --- | --- | --- |
| `docs/web-b1-plan.md` | 主代理 | 本批的檔案、步驟、驗收、完成紀錄（規格第 15 節與 `CLAUDE.md` 的交接要求） |
| `src/level/hitEvents.ts` | 主代理 | 比較前後兩個 `Session` 的 `hitCooldownUntil`，得出這一步計入的碰撞；`Session` 的形狀不變 |
| `src/level/alarm.ts` | 主代理 | 警報類型表、警報狀態、燈號相位、`lightbarState` |
| `src/audio/soundDirector.ts`、`voices.ts`、`audioEngine.ts` | 主代理 | 見 2.3 |
| `src/effects/vehicleBeacons.ts` | 主代理 | 警報燈的發光疊圖、燈條的三層顯示；吃 `alarm.ts` 的狀態 |
| `src/props/ambulance.ts` | `procedural-modeler` | 車身幾何、燈條左右兩組幾何、警示燈幾何 |
| `tests/` 五個新檔、`e2e/audio.spec.ts` | 主代理 | 見 2.5 |

**修改**

| 檔案 | 改什麼 |
| --- | --- |
| `src/level/obstacleTypes.ts` | 加 `ambulance: { widthFt: 7, lengthFt: 20 }` |
| `src/props/obstacleMeshes.ts` | `createObstacleGeometry`、`OBSTACLE_SURFACES`（`carPaint`）、`obstacleLabels` 的救護車貼字；把實例矩陣提供給燈號疊圖 |
| `src/props/deliveryVan.ts`、`surfSuv.ts` | 模型師：把燈另外輸出成獨立幾何（位置與原模型相同） |
| `src/props/parkedCars.ts` | 每款車的頭燈、方向燈、尾燈併成一份警報燈幾何，連同每台車的矩陣提供出來 |
| `src/props/signs.ts` | 模型師：救護車字樣的樣式 |
| `src/level/environmentSigns.ts` | `PROP_SIGNS.ambulance` |
| `src/render/scene.ts` | `GameScene` 加 `updateBeacons(alarms, simSeconds)`；建立燈號疊圖與燈條的光 |
| `src/render/renderConfig.ts` | 燈號與燈條的亮度、顏色、光暈大小 |
| `src/main.ts` | 建立音效引擎；物理步的迴圈裡收集碰撞事件；每幀跑警報狀態與 `soundDirector`；暫停、重來、結束的處理；`__parkingGame` 的三個快照；音量存檔 |
| `src/core/save.ts` | `SaveSettings.audio`、`withAudio`、寬鬆解析 |
| `src/ui/pausePanel.ts`、`hud.ts`、`style.css` | 音效那一列、角落靜音鈕、樣式（含 412 × 892 直式） |
| `src/locale/zh-TW.json`、`en.json` | 七個新鍵 |
| `src/levels/w1_l09.json` | 一個類型字串 |
| 既有測試 | 見 2.5 |

不改：`session.ts`、`collision.ts`、`bicycleModel.ts`、`levelSchema.ts`、任何官方路線、`core/controls.ts`。

### 2.7 步驟、驗收、風險、大小

**有序步驟（每一步一個 commit，都要 typecheck 與相關 Vitest 過了才提交）**

1. `docs:` 寫 `docs/web-b1-plan.md`。
2. `feat:` `hitEvents.ts` 與測試。
3. `feat:` `alarm.ts`（類型表、狀態、燈號相位、燈條模式）與測試。
4. `feat:` 音效引擎：建立、解鎖、匯流排、音量與靜音、暫停與背景分頁；接進 `runGame`（還沒有聲音）；`__parkingGame.audio()`；假 context 的測試。
5. `feat:` 碰撞悶響與倒車嗶聲（`soundDirector` ＋ `voices`）與測試。
6. `feat:` 存檔的 `audio` 欄位、暫停面板的音效列、HUD 靜音鈕、七個翻譯鍵與測試。
7. `feat:` 停放車的警報：燈號疊圖、`updateBeacons`、警報聲、`__parkingGame.alarms()`。這一步做完，「撞到車會有警報」就能玩了。
8. 模型師（一輪）：廂型貨車與衝浪休旅車的燈獨立輸出。主代理接上疊圖後 `feat:` 提交。
9. 模型師（一到兩輪）：救護車模型、字樣樣式、展示圖。主代理註冊類型、貼字、測試後 `feat:` 提交。
10. `feat:` 燈條動畫、地上光暈、真光源、被撞短鳴、`__parkingGame.lightbars()`。
11. `feat:` l09 換成救護車，更新釘住的測試，重跑可見性與開場鏡頭的測試。
12. `test:` `e2e/audio.spec.ts`；另開一輪把 16 個既有規格檔全部重跑。
13. 自己看截圖（展示台三張、l09 夜景、撞車瞬間），列出不夠好的地方並修掉。
14. `stage-reviewer` 審整個 commit 範圍並跑 typecheck、Vitest、build、e2e；修完它找到的問題。
15. `docs:` 在計畫檔記下做了什麼、已知限制、規格修改提案。

模型師與主代理不同時改 `obstacleMeshes.ts`：第 8、9 步模型師先交，主代理再接。

**驗收標準**

- 撞到停放車、休旅車、貨車：燈閃、喇叭響約 6 秒，碰撞數只加 1，不扣時間。撞牆、錐、推車只有悶響。
- l09 的救護車：燈條左右交替閃，地上有光暈；被撞後快閃並短鳴 2.5 秒。官方路線的時間與第 1 世界其餘 9 關完全不變。
- 掛 R 檔有嗶聲；暫停、停妥、失敗、重來時所有聲音照 2.3 的規則停。
- 第一次按鍵或觸碰之前完全沒有聲音，也沒有 console 警告；之後聲音正常。換關後第一下操作就恢復。
- 靜音與音量在暫停面板和 HUD 都能改，重新整理後還在；兩種語言都有字。
- 分頁切到背景時聲音停住，切回來不會有卡住的警報。
- `?fx=off` 與 `?cam=` 的畫面每次相同。
- typecheck、全部 Vitest、build、全部 e2e 通過；`package.json` 的相依套件沒有變。

**風險**

| 風險 | 對策 |
| --- | --- |
| 無頭 Chromium 或沒有音效裝置的容器裡 context 起不來 | e2e 主要斷言自己的旗標（`unlockRequested`、`voices`），`contextState` 用輪詢；真的起不來就只留旗標的斷言，並在回報裡寫明 |
| iOS Safari 的解鎖與中斷行為和文件不完全一致 | 這一條我沒辦法在實機上驗證，要請使用者在手機上試一次；`statechange` 重掛監聽是保險 |
| l09 的畫面會動了，既有的畫面比對 e2e 可能受影響 | `?fx=off` 時燈號固定；改完先單獨跑 `spotGlow` 與 `controls` |
| 多一盞光與發光疊圖在低階手機上掉幀 | 光只在已經有頭燈光源的級別才加；疊圖在沒有警報時不畫；用 `?bench` 比較 l09 改前改後 |
| 模型師輸出的燈幾何和車身對不上 | 疊圖用整台車的同一個實例矩陣；測試檢查燈幾何在外框內 |
| 車名或字樣剛好是真實單位 | 實作時先查，再過既有的品牌檢查；備案名字已列 |
| 警報太吵 | 長度、音量、同時聲數都是常數；HUD 有一鍵靜音 |

**大小**：中偏大。批次 A 用了 10 個 25 分鐘的回合；這批估 8 到 10 回合，其中模型師 2 到 3 輪、e2e 2 輪。

**第三方套件與外部素材：0 個。** 不新增 npm 套件、不下載音檔、不加字型、不加圖片。唯一可能的外部檔案是使用者自己提供的救護車參考照（問題 5），預設不要。

## 3. 批次 C：室內車庫與斜坡

### 3.1 總體設計

**世界**

- 第 2 世界「路邊停車」做成舊金山的坡道街：路邊平行位、坡上的垂直位、輪子打向路緣。
- 第 3 世界「立體停車場」做成舊金山式的錯層窄車庫：柱子、小車位、死路、半層坡道。
- 兩者都符合規格第 6 節的世界規劃，也和討論計畫一致。
- 每個世界先上 4 到 6 關，其餘的格子顯示既有的「即將推出」。補滿 8 到 10 關另開內容批次（見第 5 節）。

**物理的大原則：世界維持 2D 平面模擬，高度是由地形函式推導出來的**

- 關卡 `pos` 的 y 仍然必須是 0。高度不寫在每個物件上，而是由關卡的地形欄位算出 `heightAt(x, z)`。
- 碰撞仍是平面上的 2D OBB。樓層不重疊：車庫用「錯層」（兩片樓板差半層、並排、用短坡道相連），平面上每一點只有一個高度。舊金山的老車庫很多就是這種格局。
- 坡度只做兩件事：在車速上加一個沿車頭方向的重力分量，以及決定畫面上的高度與俯仰。
- 平地關卡走原本的程式路徑，結果逐位元不變。第 1 世界 10 條官方路線的時間就是回歸測試。

**淨高要不要真的撞**

不做。玩家只有轎車（高 4.6 ft，`LEVEL_VEHICLES` 只有 `sedan`），天花板 8.2 ft、樑底 6.8 ft，怎麼開都碰不到。3D 碰撞沒有玩法意義。這批把限高桿、樑、管線當佈景。等第 4 世界有大型車時再做「2D 加高度檢查」：障礙物多一個離地高度，車比它矮就忽略。這批不留任何半成品程式。

### 3.2 子批次與依賴

| 子批次 | 內容 | 依賴 | 大小 |
| --- | --- | --- | --- |
| C1 | 選關畫面的世界分頁、世界解鎖 | B1 完成 | 小，2 回合 |
| C2 | 室內車庫環境（平面）、室內光、屋頂剖切、第 3 世界前 4 關 | C1 | 大，10–12 回合 |
| C3 | 地形與斜坡物理、坡道街環境、「輪子打向路緣」、第 2 世界前 4 關 | C1 | 大，12–14 回合 |
| C4 | 車庫的錯層與坡道、第 3 世界再 2 關 | C2、C3 | 中，6–8 回合 |

- C2 與 C3 互不依賴。建議先做 C2：它完全沿用現有系統，畫面回報最大，邏輯風險最低；C3 會動到車輛模型的核心。順序見問題 11。
- 每個子批次都是獨立的一個階段：開新對話、寫自己的計畫檔（`docs/web-c1-plan.md` 等）、結束時交 `stage-reviewer`。

### 3.3 C1：世界分頁與解鎖

**設計**

- 選關畫面上方一排世界分頁。進場顯示哪一頁：有效的 `?world=` > 剛離開的那一關所在的世界 > 第 1 世界。
- 世界解鎖看「之前所有世界累計的星數」：`WORLD_UNLOCK_TOTAL_STARS = { 2: 12, 3: 18 }`（可調）。世界內仍是前一關 1 星解鎖下一關。`?unlock=all` 照舊全開。
- 還沒有任何關卡的世界：分頁照樣顯示，10 格都是「即將推出」。

**檔案**

- 改：`src/ui/levelSelect.ts`、`src/main.ts`（`SELECT_WORLD` 換成選到的世界）、`src/level/progress.ts`（`worldStars`、`isWorldUnlocked`）、`src/core/urlParams.ts`（`parseWorldParam`；`navigationSearch` 保留它）、`src/ui/style.css`、兩份語系檔。
- 新翻譯鍵：`select.world1`（停車場入門／Parking Lot Basics）、`select.world2`（路邊停車／Street Parking）、`select.world3`（立體停車場／The Garage）、`select.worldLocked`（再拿 {stars} 顆星解鎖／Earn {stars} more stars to unlock）。既有的 `select.world` 拿掉。
- 測試：`tests/progress.test.ts`、`tests/urlParams.test.ts`、`tests/levelCatalog.test.ts`、`e2e/levelFlow.spec.ts`。

**步驟**

1. 計畫檔。
2. 解鎖規則的純函式與測試。
3. 分頁介面與 `?world=`。
4. e2e、截圖（橫式與 412 × 892 直式）、審查。

**驗收**：三個分頁可切換；第 2、3 世界照門檻上鎖並顯示還差幾顆星；第 1 世界的行為與存檔完全不變。

**風險**：低。直式畫面分頁列和語言鈕、「目前」徽章可能互擠，要截圖確認。

### 3.4 C2：室內車庫（平面）

**環境 `parking_garage`**

- 尺寸（都放設定物件，可調）：天花板 `GARAGE_CEILING_FT = 8.2`、樑底 `GARAGE_BEAM_CLEAR_FT = 6.8`、走道 18–20 ft（戶外是 24 ft）、小車位 8 × 16 ft、柱距每 3 格一根。
- 佈景交給 `procedural-modeler`：環氧地坪（油漬、輪胎痕）、天花板與樑、日光燈管、灑水管線、柱腳的黃黑警示漆、牆面防撞條、轉角凸面鏡、地上的箭頭、入口的限高桿。
- 招牌全用通用字，放進 `ENVIRONMENT_SIGNS`：`CLEARANCE 6 FT 8 IN`、`COMPACT`、`EXIT`、`LEVEL P1`、`SLOW`。
- 搞笑佈景：車頂綁著衝浪板的休旅車停在限高桿前面（靜止，既有的 `surf_suv`）。
- 四周邊界是到頂的牆，登記成鏡頭擋塊（比照巷子）。

**室內光**

- 新天氣 `garage`。`parking_garage` 只接受這個天氣，由關卡格式驗證；室內忽略 `?weather=`。
- 不新增任何逐燈具的真光源。做法是重用現有的整套燈光：
  - 「太陽」改成由正上方往下、日光燈色、較弱的主光，陰影貼圖照舊蓋住整個場地，車底有接觸陰影。
  - 天花板不投影（否則整層都在影子裡）。
  - 天空環境貼圖換成深灰的室內色，車漆不會反射出藍天。
  - 燈管是發光材質（HDR 級別有泛光），每支燈管正下方一片加色的地面光斑。
  - 玩家的頭燈在室內終於有戲。
- 短距離的霧做出深度。不下雨、沒有閃電、沒有落葉。

**鏡頭與屋頂：剖切**

| 鏡頭 | 位置 | 處理 |
| --- | --- | --- |
| 近距跟車 | 高 5.5 ft，在天花板下 | 天花板照畫 |
| 引擎蓋、駕駛座 | 車上 | 天花板照畫 |
| 遠距跟車 | 高 22 ft，在天花板上方 | 隱藏天花板與吊掛的佈景，像看剖面模型 |
| 俯視 | 高 70 ft | 同上 |
| 倒車輔助的鳥瞰小畫面 | 上方 | 同上 |
| 倒車輔助的後視鏡、倒後鏡頭 | 車上 | 天花板照畫 |

- 天花板、樑、燈管、管線放在同一個群組，`GameScene` 加 `setRoofVisible(visible)`，`main.ts` 依鏡頭模式每幀設定。柱子與牆永遠畫。
- 天花板不登記成鏡頭擋塊、也不登記成會淡的東西。如果登記了，遠距跟車會被現有的避讓邏輯壓到離車只剩約 3 ft，畫面塞滿車尾。
- 不選「把遠距跟車限制在室內」：8.2 ft 的淨高裡，它會變成和近距跟車幾乎一樣的鏡頭，等於少一個模式。
- 倒車輔助的四個小畫面目前在同一個回呼裡畫，要改成鳥瞰與其他三個分開設定屋頂。

**關卡（第 3 世界前 4 關，全部平面）**

| 關 | 暫定名稱 | 招牌難點 |
| --- | --- | --- |
| w3_l01 | 進場／Going In | 過限高桿、沿 20 ft 的走道右轉進一般車位；熟悉室內鏡頭 |
| w3_l02 | 小車位／Compact Only | 8 × 16 ft 的小車位夾在柱子與鄰車之間 |
| w3_l03 | 死路／Dead End | 18 ft 的死路走道，要三點調頭或一路倒進去 |
| w3_l04 | 柱子後面／Behind the Pillar | 入口被柱子擋掉一角的角落車位，只能倒車進 |

- 設計時直接用批次 A 量到的數字：全鎖掃過的帶寬約 10 ft、外側前角半徑 19.9 ft、兩面實牆之間寬 10 ft 的凹槽從 17 ft 的走道車頭一把進不去。「一把進不去」這類招牌動作用模擬掃描的測試釘住。
- 路線用 `logs/web-levels-tools/` 的 probe 工具調。每關一條零碰撞的官方路線，N = round(0.7 × `target_time`)。

**檔案**

- 改：`src/level/levelSchema.ts`（環境、天氣、兩者的配對驗證）、`src/core/weather.ts`、`src/render/weatherPresets.ts`、`src/level/environmentSigns.ts`、`src/props/environmentLayout.ts`、`src/props/environments.ts`、`src/props/obstacleMeshes.ts`（`BOUNDS_STYLES`、`WALL_STYLES`、`WALL_SURFACES` 三張表各加一列）、`src/render/scene.ts`（`setRoofVisible`、室內不建戶外柏油地面）、`src/render/reverseAssistViews.ts` 與 `src/ui/reverseAssist.ts`（鳥瞰分開處理屋頂）、`src/main.ts`、`src/level/challenges.ts`（N 的表）、兩份語系檔（關卡名稱）。
- 新增：`src/props/garageShell.ts`（模型師）、需要時 `src/materials/surfaces.ts` 加環氧地坪（模型師）、`src/levels/w3_l01.json` 到 `w3_l04.json` 與對應的路線檔。
- 測試：`levelSchema`、`environments`、`environmentSigns`、`levelCatalog`、`challenges`、`openingCamera`、`targetVisibility`、`materials`、`shadowCasters`、`e2eRoutes`；e2e 的 `levels`、`camera`（各鏡頭下屋頂顯示與否）、`materials`。

**步驟**

1. 計畫檔。
2. 環境與天氣的格式、驗證、測試（先用空殼）。
3. 室內光的天氣設定；一關測試用的空車庫，拍圖確認亮度。
4. 模型師：車庫外殼與佈景（兩到三輪，對照截圖修）。
5. 屋頂剖切：`setRoofVisible`、鏡頭與倒車輔助。
6. 四關，一關一個 commit（關卡、路線、N、名稱、測試）。
7. 效能：`?bench` 在 low 與 medium 量最密的一關。
8. e2e 一輪、截圖自評、`stage-reviewer`、記錄。

**驗收**

- 五個鏡頭在四關的開場都看得到車與目標（或有方向指標），橫式與直式都過既有的可見性測試。
- 近距跟車看得到天花板、燈管與自己的頭燈光；遠距跟車與俯視是乾淨的剖面，沒有浮在半空的燈管。
- 四條官方路線零碰撞、時間在 N 以內。
- 室內關不受 `?weather=` 影響。第 1 世界的測試與 e2e 全部不變。

**風險**

| 風險 | 對策 |
| --- | --- |
| 沒有逐燈具的光，室內看起來平 | 第 3 步先拍圖定亮度與光斑，再請模型師加密佈景；必要時 high 以上加一盞跟著車走的補光 |
| 剖切視角看起來像沒蓋完 | 牆頂加一圈收邊、地坪做足細節；截圖自評 |
| 室內的畫質級別成本（佈景密度） | 燈管與管線數量跟著 `quality.props` 走 |
| 窄場地的路線很難調 | 用 probe 與暴力掃描；先定車位與柱子再擺佈景 |

### 3.5 C3：地形、斜坡與第 2 世界

**先做一輪技術試作，再決定要不要往下做**

第一步只做一件事：一關測試用的整片坡面街道，拍 12% 與 20% 兩張圖，並量測車在坡上的溜動。看過圖、確認觀感與手感之後才做環境與關卡。這是整個批次 C 風險最高的地方，值得先花一回合確認。

**關卡格式**

- 最外層加選填欄位 `grade`：`{ "downhill": <方向，度>, "percent": <0–25> }`。整關是一個傾斜的平面。
- 最外層加選填欄位 `curb`：`{ "side": "left" | "right" }`，路緣在目標車位 `heading` 的哪一側。
- 兩個欄位都不填就是平地，行為與現在完全相同。

**地形（新檔 `src/level/terrain.ts`，純函式）**

- `heightAt(x, z)` 與 `gradientAt(x, z)`。C3 只有整片平面；C4 再加分區。
- 沿車頭方向的重力加速度：a = −g × (坡度向量 · 車頭方向) ÷ √(1 + 坡度²)。車頭朝下坡時為正。

**車速**

- `stepVehicle` 多一個參數 `slopeAccelMps2`，預設 0。等於 0 時直接走原本的程式，一個位元都不變。
- 不等於 0 時，把滑行阻力與煞車當成「只會抵抗運動」的力，重力當成真正的外力：
  - 靜止時：淨推力（油門加重力）不超過阻力就停著不動，超過才動。
  - 行進中：照淨力加減速，阻力不會讓車反向。
- 推算出的手感（依現有的 `VEHICLE_CONFIG_US`）：

| 情況 | 結果 |
| --- | --- |
| 坡度約 14% 以下，放開所有踏板 | 滑行阻力（3 mph/s）撐得住，不溜車 |
| 20% | 以約 1.3 mph/s 慢慢溜 |
| 25% | 以約 2.3 mph/s 溜 |
| 20% 上坡全油門 | 淨加速度約 1.7 mph/s，明顯吃力 |
| 踩煞車（18 mph/s） | 任何坡都壓得住 |
| 31% 以上 | 油門（6 mph/s）爬不上去，所以格式限制 `MAX_GRADE_PERCENT = 25` |

- 常數放 `core/gameConfig.ts` 的 `SLOPE_RULES`：重力 32.17 ft/s²、最大坡度 25%、靜止撐住的阻力（預設等於滑行阻力，可另外調）。

**溜車頂著障礙物**

現在的規則是頂著障礙物每 0.5 秒計一次碰撞。在坡上，車會被重力反覆壓回障礙物，玩家什麼都沒按也一直被計次。要加一條規則：有坡度的關卡，沒踩油門、撞擊車速低於 `REST_CONTACT_SPEED_MPH = 1`、而且撞的是上一次同一個物件時，不再計次，車停在原地。平地關卡不適用，`collision.spec.ts` 依賴的「繼續頂著每 0.5 秒再計一次」不變。

**手煞車**

- 現況：專案沒有手煞車。按鍵表裡沒有這個動作，空白鍵是切換 D／R；舊存檔裡的 `handbrake` 會被丟掉。這和規格第 3、4 節不一致（見規格提案）。
- 在這個模型裡，腳煞車壓得住任何坡；停妥成立後這一局就凍結，車不會再動。所以手煞車沒有物理上的必要。
- 建議這批不加手煞車鍵，把「停妥」當成已經拉了手煞車。坡上的技巧放在三件事：放開煞車會溜、上坡起步吃力、停妥時輪子要打向路緣。
- 如果使用者要手煞車當玩法：做成斜坡關的停妥條件（拉了才開始算那 1 秒）。成本是新的按鍵動作、舊按鍵存檔的遷移、觸控鈕、HUD 燈號，建議另列一步（問題 14）。

**「輪子打向路緣」勾**

- 可以只看停妥當下的方向盤，不需要額外的物理。停妥成立時 `session.vehicle.steerRad` 會被凍結，玩家要在判定的那 1 秒裡按住方向盤（放開會以每秒 120° 回正）。
- 判定是純函式，放 `src/level/challenges.ts`，挑戰 id `curb_wheels`：
  - 車頭朝下坡：前輪轉向路緣那一側。
  - 車頭朝上坡：前輪轉離路緣。
  - 轉角至少 `CURB_WHEEL_MIN_STEER_DEG = 20`。
- 只有同時有 `grade`（至少 `CURB_RULE_MIN_GRADE_PERCENT = 3`）與 `curb` 的關卡才有這個勾。沒打對只是少一個勾，不算失敗。
- 能不能提早做：判定本身可以，半個回合就寫得完。但我建議和第一個坡道關一起上線。在平地上，「上坡」「下坡」對玩家沒有意義，單獨放在 `w1_l09` 會讓人看不懂為什麼要打輪子（問題 15）。
- 新翻譯鍵：`challenge.curbWheels`（輪子打向路緣／Wheels curbed）、`hud.grade`（坡度／Grade）。HUD 在有坡的關顯示坡度與方向。

**畫面**

- 車：高度取 `heightAt`，俯仰與側傾對齊坡面。頭燈的光斑是車的子物件，會自動跟著傾斜。
- 停放車與車輛類障礙物：各自放到所在位置的高度，並對齊坡面。
- 建築、路燈、樹、消防栓、錐：放到各自位置的高度，保持垂直。
- 新環境 `hill_street`：兩側是一棟棟窄的排屋，每棟各在自己的基準高度上（階梯狀，舊金山的樣子），人行道與路緣是順著坡面的斜板。排屋交給模型師。
- 地面：平面的著色器加上坡面的係數。有坡的關不做平面倒影、不做積水（只用乾的天氣與不積水的潮濕），路緣的解析陰影改由陰影貼圖來。
- 鏡頭：所有寫死的離地高度都改成「車所在位置的地面高度加上原本的值」，包含跟車、俯視、車上鏡頭、倒車輔助的四個鏡頭、`?cam` 的預設鏡頭。
- 車位標線、發光標記、輪胎痕、灰塵、方向指標的投影點都要吃同一個高度。

**關卡（第 2 世界前 4 關）**

| 關 | 暫定名稱 | 坡度 | 招牌難點 |
| --- | --- | --- | --- |
| w2_l01 | 緩坡／Gentle Grade | 8% 下坡 | 寬鬆的路邊平行位；不會溜車；第一次輪子打向路緣 |
| w2_l02 | 上坡起步／Uphill Start | 18% 上坡 | 放開煞車會往後溜；停進上坡的路邊位，輪子打離路緣 |
| w2_l03 | 橫著停／Across the Hill | 20% | 坡上的垂直車位（車身橫在坡上），進出時車頭一轉就開始溜；併排的救護車擋半條路 |
| w2_l04 | 陡坡夾縫／Steep Squeeze | 22% 下坡 | 很緊的平行位，前後有車，消防栓前不能停 |

**檔案**

- 新增：`src/level/terrain.ts`、`src/levels/w2_l01.json` 到 `w2_l04.json` 與路線檔、模型師的排屋與斜的人行道。
- 改（邏輯）：`src/level/levelSchema.ts`、`src/core/gameConfig.ts`、`src/vehicle/bicycleModel.ts`、`src/level/session.ts`、`src/level/autoDriver.ts`（腳本駕駛在坡上的定速）、`src/level/challenges.ts`、`src/ui/results.ts`、`src/ui/hud.ts`、兩份語系檔。
- 改（畫面）：`src/render/scene.ts`、`src/vehicle/carMesh.ts`、`src/props/ground.ts` 與 `groundShader.ts`、`src/props/obstacleMeshes.ts`、`src/props/parkedCars.ts`、`src/props/environmentLayout.ts` 與 `environments.ts`、`src/props/spotMarkings.ts`、`src/props/spotGlow.ts`、`src/effects/` 的輪胎痕與灰塵、`src/vehicle/headlightCurbs.ts`（有坡的關停用）、`src/render/gameCamera.ts`、`src/render/followCamera.ts`、`src/render/reverseAssistViews.ts`。
- 測試：新的 `tests/terrain.test.ts`；`bicycleModel`、`session`、`challenges`、`levelSchema`、`autoDriver`、`levelSolvable`、`gameCamera`、`openingCamera`、`targetVisibility`；新的 e2e `hill.spec.ts`（放開煞車會溜、踩住會停、輪子打對拿到勾）。

**步驟**

1. 計畫檔。
2. 技術試作（上面那一輪）。把圖與量測交給使用者看，確認後再往下。
3. `terrain.ts`、`grade` 與 `curb` 的格式與測試。
4. 車速的重力項與測試。同一個 commit 裡加回歸測試：第 1 世界 10 條官方路線的時間與改之前完全相同。
5. 溜車頂著障礙物的規則與測試。
6. 畫面：車、地面、鏡頭（先在空的坡面上過 `openingCamera` 類的測試）。
7. 畫面：障礙物、停放車、標線、特效。
8. 模型師：`hill_street` 環境（兩到三輪）。
9. `curb_wheels` 挑戰、HUD 坡度、翻譯鍵。
10. 腳本駕駛在坡上的定速；四關，一關一個 commit。
11. e2e、效能、截圖自評、`stage-reviewer`、記錄。

**驗收**

- 第 1 世界 10 條官方路線的結果與改之前逐位元相同；既有的 Vitest 與 e2e 全過。
- 20% 的坡上放開踏板，車在 2 秒內明顯開始溜；踩住煞車完全不動；14% 以下不溜。
- 車、停放車、標線、發光標記都貼在坡面上，五個鏡頭與倒車輔助都沒有穿地或懸空。
- 四條官方路線零碰撞、在 N 以內，而且都拿得到 `curb_wheels`。
- 頂著障礙物溜車不會連續計次。

**風險**

| 風險 | 對策 |
| --- | --- |
| 整個算圖堆疊預設地面在 y = 0，漏改的地方很多 | 先做試作；用「整關一個平面」把範圍壓到最小；逐鏡頭截圖 |
| 平地結果不小心變了 | 坡度為 0 時走原程式；10 條路線的逐位元回歸測試 |
| 平面模擬與斜面上的實際長度差 cos θ（25% 時約 3%，車長差不到半英尺） | 接受並寫進已知限制 |
| 腳本駕駛與路線工具在坡上不穩 | 第 10 步先修定速再做關卡；N 的規則不變 |
| 坡上的手感太難或太無聊 | 阻力與坡度都是常數；第一關用 8% 不溜車當教學 |
| 有坡的關少了倒影與積水，夜景變平 | 坡道關用白天、黃昏與夜晚的乾地面；雨夜留給平的街道關 |

### 3.6 C4：車庫的錯層與坡道

**設計**

- 關卡加 `decks`（平的區塊，各有高度）與 `ramps`（矩形，沿方向線性爬升 `rise`）。`terrain.ts` 變成分區的高度函式。
- 格式驗證：區塊交界的高度要接得上；障礙物、車位、起點、目標都要整個落在平的區塊上，不能跨坡道邊緣；坡道坡度不超過 25%。
- 錯層高差 `GARAGE_SPLIT_RISE_FT = 5`，坡道長 28 ft（約 18%），寬 11 ft。
- 上下兩片樓板各有自己的天花板高度；屋頂剖切的規則不變。
- 物理不用再改，C3 的重力項直接吃分區的坡度。

**關卡**

| 關 | 暫定名稱 | 招牌難點 |
| --- | --- | --- |
| w3_l05 | 上半層／Half a Level Up | 上 11 ft 寬的坡道，到頂立刻左轉進車位 |
| w3_l06 | 坡道口／Ramp Mouth | 車位就在坡道頂旁邊，倒車時車尾會往坡道溜 |

**檔案**：`src/level/levelSchema.ts`、`src/level/terrain.ts`、`src/props/garageShell.ts`（模型師：錯層的樓板、坡道、護欄）、`src/props/environmentLayout.ts`、`src/render/scene.ts`、兩個關卡與路線、相關測試。

**步驟**：計畫檔 → 分區地形與驗證 → 外殼與坡道模型 → 兩關 → e2e、審查、記錄。

**驗收**：車上下坡道時高度與俯仰連續，沒有跳動；坡道上放開踏板會溜；兩條官方路線零碰撞。

**風險**：坡道頂與底的折角讓車身俯仰突變（用前後軸的高度算俯仰來平滑）；兩片樓板交界處的鏡頭避讓。

### 3.7 批次 C 的套件與素材

**第三方套件：0 個。外部素材：0 個。** 車庫與坡道街的模型、材質、招牌全部程序化；招牌只用通用字與虛構名稱；不下載 HDRI、貼圖或照片。如果使用者想提供舊金山車庫或坡道街的參考照，放 `art/reference/`，那是使用者自己的檔案。

## 4. 需要使用者決定的問題

**B1**

1. 哪些東西會觸發警報？
   - (a) 停放車、衝浪休旅車、快遞貨車會叫；救護車是短鳴警笛；餐車、牆、錐、推車只有悶響。**建議**
   - (b) 餐車也叫。
   - (c) 只有停放車。
2. 警報多長、要不要額外代價？
   - 建議 6 秒、沒有額外代價（碰撞計次已經是代價）。可選 4 或 10 秒。
3. 救護車放哪？
   - (a) 取代 `w1_l09` 併排的貨車，路線不動。**建議**
   - (b) 在 `w1_l06` 餐車旁另加一台。
   - (c) 兩關都放。
   - (d) 等第 2 世界再出現。
4. 救護車平常要不要鳴笛？
   - (a) 只閃燈，被撞才短鳴。**建議**（一直響很吵）
   - (b) 很小聲的長鳴當背景。
5. 救護車的參考圖？
   - (a) 不補，模型師照文字描述與尺寸做。**建議**
   - (b) 使用者提供幾張照片放 `art/reference/`。我不會自己下載外部圖片。
6. 車身文字 `MAPLE HOLLOW AMBULANCE`、`MEDIC 7` 可以嗎？不用紅十字與生命之星，改用心電圖折線，可以嗎？
7. 音量介面：
   - (a) 暫停面板用「−」「＋」按鈕，另加 HUD 角落的快速靜音鈕。**建議**
   - (b) 用滑桿。
   - (c) 不要 HUD 的靜音鈕。
8. 預設音量 70%、預設不靜音，可以嗎？（本來就要玩家第一次操作後才會出聲）
9. 倒車嗶聲：
   - (a) 固定節奏、小聲。**建議**
   - (b) 不要。
   - (c) 之後改成越靠近障礙物越急的倒車雷達（另一批）。
10. 閃光：跟隨系統的「減少動態效果」設定自動改成恆亮，可以嗎？還是要在設定裡加開關？建議跟隨系統。

**C**

11. 子批次順序：
    - (a) C1 → C2 車庫 → C3 斜坡 → C4 坡道。**建議**（車庫風險低、畫面回報大）
    - (b) 先斜坡再車庫（世界會依編號順序出現）。
12. 每個世界先上幾關？
    - (a) 先各 4 關，車庫再加 2 關，其餘顯示「即將推出」。**建議**
    - (b) 一次做滿 8 關（批次 C 會大一倍）。
13. 世界解鎖門檻：累計 12 顆星開第 2 世界、18 顆開第 3 世界，可以嗎？或先全部開放？
14. 手煞車：
    - (a) 不加；腳煞車壓得住，停妥就當作拉了手煞車。**建議**
    - (b) 加切換鍵，斜坡關要拉了才算停妥（多一個按鍵動作、觸控鈕、舊按鍵存檔的遷移）。
15. 「輪子打向路緣」：
    - (a) 和第一個坡道關一起上線。**建議**
    - (b) 先放在平地的 `w1_l09` 當預告。
16. 室內的遠距跟車與俯視：
    - (a) 隱藏天花板，看剖面。**建議**
    - (b) 把遠距跟車壓進室內（會和近距跟車幾乎一樣）。
17. 溜車的門檻：約 14% 以下不溜、最大坡度 25%，可以嗎？還是要更敏感（緩坡也溜）？
18. 斜坡的試作圖出來後，要不要先給你看過再繼續做 C3？建議要。

## 5. 刻意不做的事與規格修改提案

### 5.1 刻意不做

**B2 的邊界（這兩批都不碰）**

- 任何會動的障礙物：倒車出來的車、推車的人、等車位的車、行人，也包含會開動的救護車與在場地外開過的佈景車。
- 不改 `bounceBack`「上一步沒有重疊」的假設，不改 `layout.obstacles` 每局不變的性質，不把障礙物姿態放進 `Session`。
- B2 動手前要先寫碰撞計畫：被移動物撞到算誰的、怎麼分離重疊、移動物怎麼讓路、路線與 N 怎麼在有時間因素下固定、鏡頭擋塊怎麼更新。

**音效**

- 引擎聲、輪胎摩擦、停妥與星星的音效、選單音效、音樂、環境音（雨、迴音、日光燈）、殘響。匯流排已經留好，之後另開一批。
- 左右聲道定位、都卜勒。
- 音效與音樂分開的音量條（現在只有主音量）。
- 靜音快捷鍵、繞過 iPhone 靜音開關。

**物理與關卡**

- 3D 碰撞、上下重疊的樓層、螺旋坡道、真的會撞到的淨高。
- 大型車、拖車（第 4、5 世界）。
- 街道的路口（坡道街仍是一段直路）。
- 第 2、3 世界補滿 8 到 10 關：批次 C 做完時第 2 世界 4 關、第 3 世界 6 關，其餘另開內容批次。
- 關卡編輯器、手把。

**其他**

- 不改規格檔。不新增 npm 套件。不下載或內嵌任何外部素材。不用真實店名、單位名稱或受保護的標誌。
- 警報、輪子沒打對都不影響星數與過關。

### 5.2 規格修改提案（只列，沒有改規格）

接在批次 A 的 15 條之後。

**B1**

16. 第 10 節：音效分批做。先做碰撞悶響、車輛警報、救護車警笛、倒車嗶聲；引擎聲、音樂、環境音留在第 4 階段。註明要玩家第一次操作後才出聲、分頁在背景或暫停時靜止、尊重手機的靜音開關。
17. 第 7、11 節：音量與靜音放在暫停面板與 HUD 角落，存進存檔的 `settings.audio`（音量 0–100、是否靜音）。規格寫的主音量、音效、音樂三條目前只有主音量。
18. 第 4 節：撞到車輛類障礙物會觸發警報（閃燈與聲音約 6 秒），沒有額外代價。
19. 第 6 節：障礙物類型加 `ambulance`（7 × 20 ft，有燈條，被撞短鳴）。
20. 第 9 節：閃光的安全規則（單一燈具每秒明暗不超過 3 次；系統設定減少動態效果時恆亮）；`?fx=off` 與定格截圖的燈號固定。
21. 第 13 節：`window.__parkingGame` 增加音效、警報、燈條的唯讀快照。
22. 第 3、4 節與現況不符：規格寫空白鍵是手煞車、手煞車減速 30 mph/s；實際上沒有手煞車，空白鍵是切換 D／R，重來是 Backspace／T。請依問題 14 的決定更新。

**C**

23. 第 6 節（世界）：第 2 世界是舊金山坡道街的路邊停車，第 3 世界是舊金山式的錯層窄車庫。每個世界可以先上一部分關卡，其餘顯示「即將推出」。世界解鎖用累計星數門檻。
24. 第 6 節（格式）：加 `grade`（整關一個坡面，最大 25%）、`curb`（路緣在哪一側）、`decks` 與 `ramps`（錯層）。`pos` 的 y 仍必須是 0，高度由地形推導。環境加 `parking_garage`、`hill_street`；天氣加室內用的 `garage`，而且室內關只能用它。
25. 第 4 節：坡度的重力分量加在車速上，平地的結果不變。滑行阻力約可撐住 14% 以下的坡。有坡的關卡，沒踩油門頂著同一個障礙物不重複計次。
26. 第 1 節（物理）：碰撞維持 2D，樓層不重疊。淨高在這個階段只是佈景，大型車世界再加高度檢查。
27. 第 2 節（挑戰）：新勾「輪子打向路緣」：下坡朝路緣、上坡背向路緣，停妥當下前輪轉角至少 20°。
28. 第 5 節：室內時遠距跟車、俯視與鳥瞰小畫面隱藏天花板；近距跟車、引擎蓋、駕駛座保留。
29. 第 9 節：室內不用太陽，改用由上往下的日光燈色主光、發光燈管與地面光斑；有坡的關卡不做平面倒影與積水。

## 審查註記（Grok Bot，對照 `main@5785270` 的程式）

計畫本文是 Claude 寫的。下面是對照程式後的勘誤與補充；沒有改遊戲程式，也沒有改規格。第 1 節的子批次名單已改成與第 3.2 節一致（原稿在接續寫完之前寫成五段，後段定案是四段）。

**已核對為正確的重點**

- 沒有 `src/audio/`；`package.json` 的正式相依只有 `three@0.187.0`（開發相依還有 `@types/three`，正文漏列）。
- `SaveSettings` 只有 `locale`；`parseSave` 只保留認識的欄位。暫停選單沒有音量。
- 碰撞是 2D OBB；`bounceBack` 退回上一步；同一物件冷卻 30 步。`layout.obstacles` 的順序是 `obstaclesFt`（JSON 障礙物加 `rows` 展開的停放車）在前，四面邊界牆在後。做 `countedHits` 時請用 `obstaclesFt.length` 區分關卡物件與邊界牆。
- `VehicleState` 沒有 y 與重力；`pos` 的 y 必須是 0。沒有手煞車，空白鍵是切換 D／R；`parseBindings` 少一個動作就整份不要，所以這批不加靜音快捷鍵是對的。
- 沒有 `ambulance`；`w1_l09` 第 0 個障礙物確是 `delivery_van` 在 `[-50, 0, 2.6]`、heading 90。官方路線在 z = −6.22 繞過，以車寬 6 ft、貨車寬 7 ft 計算，側向淨空約 2.3 ft。把類型改成同樣 7 × 20 ft 的救護車，路線可以不動。現有貨車模型本身已經大約 9 ft 高，救護車（含燈條約 8.8–9.3 ft）高度接近，開場鏡頭應差不多。
- 鏡頭高度、`?fx=off`、`quality.headlights.groundPool`、`SKIP_GROUND_REFLECTION`／`SKIP_AMBIENT_OCCLUSION`、`signs.ts`、`followCamera.ts`、`reverseAssistViews.ts`、`updateSave`、`touchControls.listening()`、16 個 e2e 規格檔，都與計畫所寫相符。
- 斜坡數字說得通：滑行減速 3 mph/s ≈ 1.34 m/s²，約可撐住 14% 的坡；腳煞車 18 mph/s 壓得住計畫中的最大 25%。

**建議實作時注意的地方**

1. **不要預先建立空的 `engine`／`ambience`／`music` 匯流排。** 第 2.3 節與第 5.1 節寫「先留好」，但 `CLAUDE.md` 與規格都要求不留死碼。需要時再加匯流排即可，主音量與限幅器這批先做。
2. **「第 1 世界路線逐位元不變」**（C3）只有在坡度為 0 時完全走舊程式路徑才比較有把握。若所有關都走新的重力項，即使用 0 乘，浮點路徑也可能微幅偏掉。驗收請以「官方路線時間與碰撞次數與改前相同」為準，不要死守位元級相同。
3. **B1 回合數** 第 1 節寫 10–12 輪，第 2.7 節寫 8–10 輪。以 8–12 個 25 分鐘回合來看即可，e2e 與模型師容易佔滿上緣。
4. **`prefers-reduced-motion`** 目前程式裡沒有，是這批要新加的規則，不是既有行為。
5. 第 0 節「關卡障礙物在前」的精準說法見上：包含 `rows` 展開的停放車。

其餘設計（靜止救護車、警報不加代價、Web Audio 合成、手機手勢解鎖、世界分頁、2D 高度由地形推導、室內剖切屋頂、輪子打向路緣與第一個坡道關一起上）都可行，也對得上現有架構。

## B1 實作紀錄（2026-11-19，基準 `5785270`）

批次 B1（第 2 節）已實作；批次 C 與 B2 沒有動。每一步的觀察、截圖路徑與 e2e 紀錄在 `~/parking-dev/logs/web-b1-progress.md`。

### 做了什麼

| 項目 | 檔案 | 說明 |
|---|---|---|
| 碰撞事件 | `src/level/hitEvents.ts` | `countedHits(previous, next)` 比較兩步之間的 `hitCooldownUntil`，回傳這一步被計次的障礙物索引與撞擊速度。`session.ts`、`collision.ts`、`bicycleModel.ts`、`levelSchema.ts`、`core/controls.ts` 都沒有改。 |
| 警報與燈條的規則 | `src/level/alarm.ts`、`core/gameConfig.ts` 的 `ALARM_RULES` | 類型對照表 `ALARM_KINDS`（停放的車、衝浪休旅車、包裹貨車是車輛警報；救護車是警笛；其他沒有）、`stepAlarms`（重撞只把剩餘時間補回 6 秒，不重啟相位）、`alarmLampOn`、`lightbarState(timeS, mode)`、`LampMotion`（`flash`／`steady`／`frozen`）。全部是純函式。 |
| 聲音 | `src/audio/audioEngine.ts`、`voices.ts`、`soundDirector.ts` | Web Audio 合成，沒有音檔。`soundDirector` 把每一幀的遊戲狀態換成指令（悶響、嗶聲、警報開始／開關／停止、全部停止）；`voices` 是各個聲音的節點圖，參數集中在檔案開頭的 `VOICE_SETTINGS`；`audioEngine` 管解鎖、暫停與分頁隱藏時的 `suspend`、主音量與限幅器。訊號路徑：聲音 → `sfx` → 主音量 → `DynamicsCompressorNode` → 輸出；沒有預留其他匯流排。 |
| 燈 | `src/effects/vehicleBeacons.ts` | 被撞的車亮起來的鏡片（每個車款一個平常隱藏的 `InstancedMesh`，與車身同一個矩陣）、救護車燈條的左／右／後三組鏡片、每顆亮燈周圍的光暈（一個加色的 `InstancedMesh`，所有畫質級別都有）、地面光斑（畫質有 `groundPool` 才有）、一盞不投影的 `PointLight`（畫質有真的車頭燈才有）。 |
| 救護車 | `src/props/ambulance.ts`、`signs.ts`、`obstacleTypes.ts`、`obstacleMeshes.ts`、`environmentSigns.ts` | 新的障礙物類型 `ambulance`（7 × 20 ft）：程序化的箱型救護車，車頂分段燈條、車尾角柱上的尾燈組、車尾下半的斜紋警示板；字樣 `MAPLE HOLLOW AMBULANCE`／`AMBULANCE`／`MEDIC 7` 放在 `PROP_SIGNS`，直接漆在車身上（只有字的貼圖）。 |
| 設定與介面 | `src/core/save.ts`、`src/ui/pausePanel.ts`、`src/ui/hud.ts`、`style.css`、兩個語系檔 | `settings.audio`（音量 0–100、靜音；`SAVE_VERSION` 還是 1，壞掉的值只忽略這一欄）、暫停面板的「音效」列（靜音、−、百分比、＋，每格 10）、HUD 右上角的靜音鈕、七個 `audio.*` 字串。 |
| 關卡 | `src/levels/w1_l09.json` | 第 0 個障礙物從 `delivery_van` 換成 `ambulance`（同一個位置與碰撞盒）；官方路線、目標時間、碰撞上限都沒有改。 |
| 偵錯介面 | `src/main.ts` | `window.__parkingGame` 多了 `audio()`、`alarms()`、`lightbars()` 三份唯讀快照。 |

### 與計畫本文不同的地方

- 救護車的警笛不是另一個一次性的指令，而是與車輛警報同一種「持續的聲音」（`alarmStart` 的 `siren` 型），所以警戒期間再撞一次只會延長，不會重疊第二個警笛。
- 多了 `ALARM_RULES.expireFadeS`（警報自己響完時 0.06 秒淡出）與 `maxVoices = 3`（同時最多三個警報聲，最舊的讓位，它的燈照常閃完）。
- 每顆亮燈都有光暈（計畫只寫鏡片、光斑與點光源）：低畫質沒有光斑與點光源，只靠鏡片在 40 ft 外看不出來。
- 救護車的車尾角柱下方多了會跟著左右組一起閃的紅色尾燈：`w1_l09` 開場時車頂燈條剛好在 HUD 的資訊列後面，要有一顆在 HUD 下方的燈。
- 悶響多了一層很短的中頻「喀」（1100 Hz 帶通、40 ms）：其他幾層都在 300 Hz 以下，手機喇叭放不出來。
- `?show=obstacle_ambulance` 的燈條固定亮左組（鏡片與光暈；沒有光斑與光源），截圖才看得到亮起來的樣子。
- 解鎖聲音的手勢照瀏覽器「使用者啟動」的定義收斂（審查發現 F1）：滑鼠的 `pointerdown`、鍵盤的 `keydown`（Esc 除外）、`touchend`，另外多聽 `pointerup`（筆沒有 `touchend`）。觸控與筆的 `pointerdown`、Esc 不解鎖：在這些事件裡 `resume()` 起不來，只會留下一個停住的 context。所以手機上第一聲出現在第一次手指放開之後。
- 解鎖之前的指令照樣丟掉。context 建立之後、真的開始出聲之前最多 30 幀（約半秒）的指令會照收，排在 context 的時間 0，所以第一個按鍵就是切 R 檔時聽得到第一聲嗶；超過 30 幀還沒開始就丟掉，不會累積到之後一起爆出來。

### 已知限制

- 這個環境聽不到聲音。聲音是用假的 `AudioContext` 記錄節點圖（接線、頻率、增益、開始與停止時間）加上 e2e 讀 `__parkingGame.audio()` 的旗標與計數驗證的；實際聽感要在真的裝置上確認，參數都在 `VOICE_SETTINGS`。
- 跟隨鏡頭把擋住視線的車身淡出時，亮著的鏡片與光暈不會跟著淡出。
- `w1_l09` 開場的鏡頭位置，救護車的車頂燈條在 HUD 資訊列後面；看得到的是車尾的尾燈、光暈與（高畫質的）地面光斑。往前開幾英尺燈條就會露出來。
- 高畫質的色調映射會把很亮的紅色鏡片洗成偏粉的顏色；紅色主要靠光暈與地面光斑。
- `MEDIC 7` 是很多真實單位都在用的通用呼號（像 `ENGINE 7`），不是機構名稱；想完全避開的話改 `PROP_SIGNS.ambulanceUnit` 一個字串就好。`MAPLE HOLLOW AMBULANCE` 查過沒有同名的真實單位。
- iPhone 的靜音開關會讓遊戲沒有聲音（刻意不繞過）；暫停面板在觸控裝置上有一行提示。
- 亮燈的鏡片與光暈平常是隱藏的，第一次撞到會響的車時才第一次進畫面，可能有一次著色器編譯的停頓（審查發現 F5；沒有在實機上量過）。
- 有救護車的關卡與警報響著的時候，`vehicleBeacons` 的每幀更新還會配置一些小陣列與字串（審查發現 F3 的後半；沒有警報也沒有救護車的關卡已經是直接返回）。
- 沒有測試直接證明 `?show`、`?cam`、`?bench` 與選關畫面不建立音效引擎（審查發現 N5）；結構上只有 `runGame` 會建立。

### 規格修改提案

第 5.2 節的第 16–22 項照舊，沒有新增；規格檔沒有改。
