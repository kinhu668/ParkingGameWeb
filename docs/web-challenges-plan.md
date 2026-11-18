# ParkingGameWeb 過關挑戰打鉤計畫

> **狀態（2026-11-17 16:32 PT）：使用者已核准，實作中。** 下文「尚未…／等使用者點頭後才開跑」的句子已不適用。
> 使用者的決定（優先於下文的開放問題）：
> (a) 挑戰就是下文建議的 5 項；一般車位關（含原型關）兩個朝向都算停妥，平行關 w1_l08、w1_l09 只有 3 項共通挑戰、維持單一朝向。
> (b) 「N 秒內」的 N 必須比該關 2 星的 `target_time` **更緊**：先取 round(0.70 × target_time) 整秒，再用官方路線實測（含判定的 1 秒），做不到才往路線時間放寬（仍嚴格小於 target_time）。N 放在 `src/level/challenges.ts` 的一張表。§2 第 1 項「與 2 星門檻相同」作廢。
> (c) 打鉤跨局保存為每關「曾經拿過」的聯集，寫在 `parkinggame.save.v1`（版本維持 1）；結算本局的是 `data-state="earned"`、先前拿過但本局沒有的是 `data-state="best"`。原型關只顯示本局、不存檔。關卡選擇畫面不在本批。
> (d) 新字串都要 zh-TW 與 en。
> 進度與門檻表：`~/parking-dev/logs/web-challenges-progress.md`。

批次目標：除路邊平行停車關以外，車頭入庫與倒車入庫都算停妥。結算畫面保留 3 顆星，底下加一排挑戰打鉤（車頭入庫、倒車入庫、N 秒內等）。本文件只是計畫，尚未改遊戲程式、尚未開 Claude Code、尚未 commit 或推送。

規格唯讀：`/workspace/ParkingGame-web-spec-v0.2.md`。不改規格；建議的規格修正列在文末。不新增 npm 套件或外部素材。等使用者就「挑戰清單、秒數門檻、打鉤是否跨局保存」點頭後才開跑。

工作流程：主 `claude -p` session 做邏輯、測試、整合與 commit。不派 `procedural-modeler`。結束時跑 `stage-reviewer`。不要開第 4 階段。

基準：HEAD `88ab37b`（已部署）。

---

## 1. 現況

**停車判定**（`src/level/parkingJudge.ts`，規格 §2）：四個角都在車位內、車頭與車位 `heading` 夾角在容許值內（預設 ±8°，含邊界）、車速 < 0.5 mph，連續成立 1 秒（60 步）才算停妥。夾角用 `headingDelta` 折到 (−180°, 180°]，車頭反向時差值是 180°，**一律不算成功**。註解與規格都寫：倒車入庫是把車位 `heading` 設成「車頭該朝的方向」，判定本身不放寬 180°。`tests/parkingJudge.test.ts` 案例 7、8 釘死這條（反向永遠失敗；「車頭先進」停進倒車車位也失敗）。

**星數**（`src/level/scoring.ts`）：停妥至少 1 星；成績時間（含判定的 1 秒）≤ 該關 `target_time` → 2 星；再加上 0 碰撞且角度誤差 < 3° → 3 星。失敗：時間或碰撞嚴格超過上限。

**一局狀態**（`src/level/session.ts`）：停妥時 `SessionResult` 只有 `stars`、`timeSteps`、`collisions`、`angleErrorRad`。沒有換檔次數、沒有入庫方式、沒有置中偏移。檔位活在 `src/main.ts` / `gearbox.ts`，開局與重來都是 D，不記入 session。HUD 與結算的角度誤差都直接用 `angleErrorRad(vehicle, spot)`，只對現行單一 heading。

**第 1 世界 10 關 + 原型關**（`src/levels/*.json`）。JSON 沒有停車種類欄位。依名稱、車位長寬與官方路線，平行停車只有兩關：

| 關卡 | 名稱 | 種類 | 時限 / 2 星目標 / 碰撞上限 | 車位 heading | 官方路線 | 車頭入庫 heading（建議寫進資料） |
| --- | --- | --- | --- | --- | --- | --- |
| prototype | 原型測試場 | 車位 | 600 / 30 / 0 | 0° | （無）前進 | 0° |
| w1_l01 | 第一個車位 | 車位 | 60 / 15 / 5 | 0° | 前進 | 0° |
| w1_l02 | 轉彎入位 | 車位 | 75 / 20 / 5 | 90° | 前進 | 90° |
| w1_l03 | 左鄰右舍 | 車位 | 75 / 22 / 4 | 90° | 前進 | 90° |
| w1_l04 | 推車回收區 | 車位 | 80 / 25 / 3 | 90° | 前進 | 90° |
| w1_l05 | 直線倒車 | 車位 | 60 / 18 / 3 | 0° | 倒車 | 180° |
| w1_l06 | 倒車入庫 | 車位 | 90 / 30 / 3 | 0° | 前進再倒入 | 180° |
| w1_l07 | 雷雨採買 | 車位 | 95 / 34 / 3 | 0° | 前進再倒入 | 180° |
| w1_l08 | 路邊停車 | **平行** | 90 / 30 / 3 | 90° | 經典倒車平行 | — |
| w1_l09 | 夜間路邊 | **平行** | 110 / 40 / 2 | 90° | 經典倒車平行 | — |
| w1_l10 | 後巷卸貨 | 車位 | 130 / 50 / 2 | 180° | 繞過再倒入 | 0° |

玩家車 15 × 6 ft。一般車位左右／前後餘裕約 1.25–2.5 ft；平行車位沿路邊較長（餘裕 3.25–5 ft），橫向較緊（1–1.25 ft）。

**結算 UI**（`src/ui/results.ts`、`style.css`）：標題 + 星星（或失敗原因）+ 時間／碰撞／角度三欄 + 下一關／重來／關卡選擇。成功時 `#result-stars[data-stars]`、`#hud-status[data-status=parked]`。沒有挑戰列。桌面面板較寬、置中；手機（`max-width: 600px`）縮小標題與內距、限制不超出畫面，統計欄只縮間距、不換行。

**存檔**（`src/core/save.ts`，鍵 `parkinggame.save.v1`，版本 1）：`localStorage`。每關只有 `stars` 與 `bestTimeS`，兩者各自取最好、不必來自同一局。`recordResult`（`src/level/progress.ts`）在 `main.ts` 停妥時寫入；原型關（world 0）不存。解鎖只看前一關至少 1 星。關卡選擇卡顯示星數與最佳時間，沒有挑戰。`parseSave` 遇到多出來的欄位會丟掉、版本不符整份作廢——**不可把版本改成 2**，否則舊進度會被清空。新欄位必須向後相容（舊紀錄缺挑戰 = 空集合）。

**翻譯**（`src/locale/zh-TW.json`、`en.json`）：結算鍵有 `status.parked`、`result.time` / `collisions` / `angle` 與按鈕。沒有挑戰字串。`tests/locale.test.ts` 要求兩種語言鍵集合完全相同。

**既有測試（會被這批碰到）：**

- 單元：`parkingJudge.test.ts`（180° 反向）、`scoring.test.ts`、`session.test.ts`、`results.test.ts`、`save.test.ts`、`progress.test.ts`、`hud.test.ts`、`levelSchema.test.ts`、`locale.test.ts`、`levelCatalog.test.ts`
- e2e：`park.spec.ts`、`levelFlow.spec.ts`（選關 → 停妥 → 星數寫入）、`spotGlow.spec.ts`（看 `#hud-status`）

接受雙向之後，必須改判定測試，並讓 3 星的角度改看「較近的合法朝向」，否則反向停妥的角度誤差是 ~180°，永遠沒有 3 星。HUD 角度顯示也要跟著改（只在「允許反向」的車位）。

---

## 2. 建議的挑戰定義

每關 3 到 5 項，全部可由停妥當下的既有狀態判定（車姿、車位、時間、碰撞）。換檔次數目前不在 session 裡，本批預設不做，列為可選加項。

**所有關都有（含平行停車、含原型關畫面）：**

1. **N 秒內** — `timeSteps <= targetSteps`，與 2 星的時間門檻相同。標籤用該關的 `target_time`：w1_l01 是「15 秒內」／「Under 15 s」，w1_l10 是 50 秒，依此類推。成績時間已含判定的 1 秒。
2. **零碰撞** — `collisions === 0`。可與 3 星分開拿到（逾時但仍乾淨停妥時，仍可打這個鉤）。
3. **停正置中** — 車中心相對車位中心，橫向與縱向偏移都 ≤ 0.5 ft（約 15 cm）。比「四角在內」更緊，一般車位左右餘裕約 1.5–2.5 ft，做得到。

**僅一般車位關（第 1 世界除 w1_l08、w1_l09 以外，含原型關）：**

4. **車頭入庫** — 停妥時車頭與該關 `head_in_heading` 的夾角在該關角度容許值內。
5. **倒車入庫** — 停妥時車頭與 `head_in_heading + 180°` 的夾角在容許值內。

同一局 4 與 5 互斥；若打鉤跨局保存（聯集），重玩就可兩種都點亮。這正是「兩種方式都可以」的收集樂趣。

**平行關（w1_l08、w1_l09）：** 只有上面 1–3 項。車頭方向仍只接受資料裡的單一 heading（與車流同向），不放寬 180°，也沒有車頭／倒車入庫打鉤。

**判定規則（車位關）：** `headingAligned` 改為「較近合法朝向的夾角 ≤ 容許值」。也就是接受 `head_in_heading` 或它的反向。3 星與 HUD 的 `angleErrorRad` 改為對較近合法朝向的絕對夾角，不再對「設計用的單一 heading」。平行關維持現況。

車頭／倒車的定義以「車頭朝車位底部（遠離通道）= 車頭入庫，車頭朝通道 = 倒車入庫」為準，**不是**看最後一個檔位——進庫後微調倒車仍算車頭入庫。各關的 `head_in_heading` 依官方路線與起點推得，寫死在關卡 JSON，不在執行期推斷。

**可選、本批預設不做：** 「換檔不超過 N 次」（平行關尤其有意思，例如 N = 2）。要做的話必須在 session 或 `main.ts` 加計數器，不屬於既有狀態。

---

## 3. 要改或新增的檔案

**改：**

- `src/level/parkingJudge.ts`：車位增加「是否接受反向」與 `headInHeadingRad`；`headingAligned` / `angleErrorRad` 在車位關改看較近合法朝向。
- `src/level/levelSchema.ts` 與 `src/levels/*.json`（11 份）：新增必填 `parking`: `"bay"` | `"parallel"`；`bay` 另必填 `head_in_heading`（度，[0, 360)）。未知欄位仍然報錯。
- `src/level/session.ts`：停妥成績帶上挑戰結果（或由純函式當場算）；角度用新的 `angleErrorRad`。
- `src/level/scoring.ts`：不必改星數公式；輸入的角度改為較近合法朝向即可。
- `src/ui/hud.ts`、`src/ui/results.ts`、`src/ui/style.css`：HUD 角度；結算在星星下方加挑戰列。
- `src/core/save.ts`、`src/level/progress.ts`、`src/main.ts`：`LevelRecord` 增加 `challenges`（字串 id 陣列）；`recordResult` 做聯集；停妥時寫入。版本維持 1。缺欄位當空陣列。原型關仍不寫存檔。
- `src/locale/zh-TW.json`、`en.json`：挑戰名稱與（若需要）`{seconds}` 模板。
- 對應單元測試（上列「既有測試」）與 e2e（`park.spec.ts` 或新建 `e2e/challenges.spec.ts`，並確認 `levelFlow.spec.ts` 仍過）。

**新增：**

- `src/level/challenges.ts`：挑戰 id、每關清單、純函式判定。不 import three、不碰 DOM。
- `tests/challenges.test.ts`

**不改：** 規格、關卡選擇卡（本批不在選關畫面顯示打鉤，避免範圍變大）、車模與後製、npm 依賴。關卡選擇要加小點是後續可選。

---

## 4. 可各自 commit 的步驟

1. **雙向停妥。** 判定接受車位關的反向朝向；平行關不變。`angleErrorRad` 改看較近合法朝向。改寫 `parkingJudge` / `session` / HUD 測試。一個 commit。
2. **關卡資料。** schema 加 `parking` 與 `head_in_heading`，11 份 JSON 依上表填好，schema／catalog 測試釘死：只有 l08、l09 是 parallel，bay 關都有 head_in。一個 commit。
3. **挑戰純函式。** `challenges.ts` + `tests/challenges.test.ts`：五種規則、平行關沒有入庫項、門檻邊界、同一局車頭／倒車互斥。一個 commit。
4. **結算 UI + 翻譯。** 成功畫面在星星下方顯示本局打鉤；失敗不顯示。桌面一橫排，手機可換行。`results.test.ts` 與 locale 測試。一個 commit。
5. **存檔聯集。** `LevelRecord.challenges` 向後相容；`recordResult` 星數取大、時間取小、挑戰取聯集。結算：本局點亮為實心，先前拿過但本局沒拿到的打成較淡的「曾完成」。`save` / `progress` 測試；`main.ts` 接入。一個 commit。
6. **e2e。** 在原型關或 w1_l01 分別車頭、倒車停妥，確認對應打鉤與存檔聯集；單元已覆蓋「平行關反向不算成功」。跑 typecheck、vitest、build、e2e。一個 commit。
7. **`stage-reviewer` 審查**，修好再推 main、部署 gh-pages。

---

## 5. 測試

**單元：**

- 車位關：對正 `head_in_heading` 或 +180°（含容許值兩端）成功；其他角度失敗。
- 平行關：只有設計 heading 成功，180° ± 容許值仍失敗。
- 3 星：反向但夾角 < 3°、零碰撞、目標時間內 → 3 星。
- 挑戰：五種規則的成立／不成立；N 秒剛好等於目標時間算過；置中剛好 0.5 ft 算過、0.51 ft 不算；平行關清單沒有 head-in／back-in。
- 存檔：舊的 v1（沒有 `challenges`）讀得回來且挑戰為空；壞資料仍整份丟棄；聯集不覆蓋較好的星與時間；多出來的未知挑戰 id 保留（與現在「不認得的關卡 id 留著」同一精神）。
- 翻譯兩檔鍵集合相同。

**e2e：**

- 開 w1_l01（或原型關）前進停入 → `#hud-status` 成功，車頭入庫打鉤、倒車入庫沒有。
- 同一關倒車停入 → 倒車入庫打鉤；若有存檔，兩個打鉤都在（一個實心、一個曾完成，或第二次兩個都實心視本局而定）。
- 既有 `park.spec.ts`、`levelFlow.spec.ts` 仍通過（星數、重來、下一關、解鎖）。

---

## 6. 打鉤是否跨局保存

建議：**要保存，而且是「曾經拿過」的聯集**，與現有「星數取大、時間取小、不必同一局」一致。否則車頭入庫與倒車入庫永遠沒辦法同時亮起，收集意義就沒了。

- 寫在同一份 `parkinggame.save.v1` 的 `levels[id].challenges`，不升版本。
- 結算同時顯示本局（實心）與曾完成（較淡）。
- 原型關不寫存檔，只顯示本局。
- 本批不在關卡選擇卡上畫打鉤。

---

## 7. 結算排版

成功時，星星下面、時間／碰撞／角度上面，加 `#result-challenges`：

- 每一項是一個小勾選框（CSS 或內嵌 SVG，比照選關鎖頭，不用新素材）+ 短標籤。本局完成：`data-state="earned"`，金色勾。本局沒拿到但存檔有：`data-state="best"`，較淡的勾。都沒有：空框。
- **桌面：** 一橫排置中，五項（車位關）或三項（平行關）放進現有面板寬度。
- **手機（≤600px）：** 允許換行成兩排，字約 12–13px，面板已有 `max-width: calc(100vw - 2 * var(--ui-gap))` 與縮小內距，不得超出畫面或擋住按鈕。
- 失敗畫面不顯示這一排（挑戰只在過關時算）。

---

## 8. 風險

- **教學關變簡單：** w1_l05「直線倒車」、w1_l06「倒車入庫」、w1_l10「後巷卸貨」目前只能倒車過關；放寬後可以改用較易的車頭入庫過關拿星。這是使用者要的規則；挑戰打鉤仍鼓勵兩種都做。若之後覺得教學關必須強迫倒車，再把那幾關標成例外（本批不做）。
- **平行關若誤放寬 180°：** 車會以逆向停在路邊，不該算成功。用 schema 與測試釘死只有 l08、l09 不接受反向。
- **3 星角度：** 若不改成較近合法朝向，反向停妥永遠沒有 3 星。必須與判定一起改。
- **存檔版本：** 升到 v2 會清空舊進度。只擴充 `LevelRecord`。
- **官方示範路線**仍走原本的單一方式，不必改；只是玩家現在也可以走另一種。
- **「N 秒內」與 2 星重疊：** 標籤更直觀，但語意幾乎等於第二顆星的時間條件。若希望挑戰完全獨立於星星，改用更緊的門檻（見下方決定事項）。
- **置中 0.5 ft：** 平行關橫向餘裕只有約 1 ft，0.5 ft 偏緊但仍合理；若實測太難可放寬到 0.75 ft。

---

## 9. 套件與素材

不需要新的 npm 套件，也不需要外部圖片或字型。打鉤用 CSS／SVG。

---

## 10. 建議的規格修正（不在本批改規格檔）

1. §2 停車成功：一般車位接受車頭與 `head_in_heading` 或反向，夾角仍在容許值內；平行停車仍只接受資料中的單一 heading。
2. §2 評分：3 星的角度誤差改為相對「較近的合法朝向」。
3. §7 UI：結算在 3 星之外加一排挑戰打鉤。
4. §8 存檔：每關除最佳星數與時間外，保存曾完成的挑戰（聯集）；格式仍向後相容 v1。
5. §6 關卡格式：補上 `parking`（`bay` | `parallel`）與 bay 關的 `head_in_heading`。

以上只是提案，等這批做完再決定要不要改規格檔。

---

## 11. 實作結果（2026-11-17，使用者核准後實作）

| 步驟 | 做了什麼 | 主要檔案 |
| --- | --- | --- |
| 1 | 一般車位兩個朝向都算停妥（`headInHeadingRad` 有值的車位）；3 星、HUD 與結算的角度誤差看較近的合法朝向；平行車位不變 | `parkingJudge.ts` |
| 2 | 關卡格式加必填 `parking`（`bay`／`parallel`）與 bay 關必填的 `head_in_heading`；11 份 JSON 填好，只有 w1_l08、w1_l09 是 `parallel` | `levelSchema.ts`、`src/levels/*.json` |
| 3 | 挑戰純函式：`time`、`no_collisions`、`centered`（橫向、縱向各 ≤ 0.5 ft，含邊界）、`head_in`、`back_in`（看停妥的車頭朝向，不看檔位）；「N 秒內」的 N 是一張表 | `challenges.ts` |
| 4 | 成功的結算畫面在星星下面加一排打鉤（`#result-challenges`，每項 `data-challenge`、`data-state`）；失敗畫面沒有；zh-TW 與 en 字串 | `results.ts`、`style.css`、`locale/*.json` |
| 5 | 存檔每關多一個 `challenges`（歷次聯集，版本維持 1，舊紀錄讀進來是空的，欄位壞了只當空的）；本局拿到 `earned`、以前拿過 `best`、都沒有 `none`；原型關只看本局、不存 | `save.ts`、`progress.ts`、`main.ts` |
| 6 | e2e：w1_l01 車頭入庫（舊格式存檔）、w1_l05 倒車入庫（先前的打鉤變淡、存檔聯集）、原型關不存檔、失敗畫面沒有挑戰列 | `e2e/challenges.spec.ts`、`e2e/collision.spec.ts`、`e2e/levelFlow.spec.ts` |
| 7 | `stage-reviewer` 審查並修正（`cf0ca8e`） | — |

「N 秒內」的 N = round(0.70 × `target_time`)，每一關都比 2 星的目標時間緊，官方路線（含判定的 1 秒）都在 N 以內，所以沒有放寬（`tests/challenges.test.ts` 把關）：

| 關卡 | prototype | w1_l01 | w1_l02 | w1_l03 | w1_l04 | w1_l05 | w1_l06 | w1_l07 | w1_l08 | w1_l09 | w1_l10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `target_time`（秒） | 30 | 15 | 20 | 22 | 25 | 18 | 30 | 34 | 30 | 40 | 50 |
| N（秒） | 21 | 11 | 14 | 15 | 18 | 13 | 21 | 24 | 21 | 28 | 35 |
| 官方路線（秒） | 5.23 | 5.85 | 7.40 | 8.72 | 10.22 | 5.88 | 13.27 | 13.45 | 13.82 | 13.68 | 23.32 |

已知、留給之後：關卡選擇卡還不顯示打鉤；w1_l08、w1_l09 的官方路線縱向停得比中心短 1.5／2.3 ft，路線本身拿不到「停正置中」（玩家可以）；教學倒車的 w1_l05／06／07／10 現在也能車頭入庫過關（使用者的決定），「倒車入庫」打鉤是倒車的獎勵；手機橫式結算面板會蓋到上方行車資訊列的下緣（原本就有，這批讓面板高了約 31 px）。「換檔不超過 N 次」沒做。

截圖在 `/workspace/parking-web-challenges-{desktop,phone}-{zh,en}.png`；進度、門檻實測與規格修正提議在 `~/parking-dev/logs/web-challenges-progress.md`（規格檔沒有改）。
