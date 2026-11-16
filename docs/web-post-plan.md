# ParkingGameWeb 後製與體積光計畫

批次目標：電影感後製（色調分級／色調映射、景深、動態模糊、鏡頭光暈與泛光微調）＋體積光（路燈與車頭燈光柱、雨夜霧氣），並修好已知問題：w1_l07 停車場展示左邊燈下／受光的車被泛光洗成一片白。

規格唯讀：`/workspace/ParkingGame-web-spec-v0.2.md`（§5 鏡頭已寫景深與可關的輕微動態模糊；§9 已寫體積霧與光束、泛光、AgX／ACES、每場景色調分級；§7 設定裡的畫質預設與個別效果開關；§13 先列檔案與步驟）。不改規格、不新增 npm 套件或外部素材、不開始實作，等使用者點頭。

工作流程：主 `claude -p` session 做邏輯、測試、整合與 commit（本批幾乎全在 `src/render/`）。`procedural-modeler` 預設不派工；只有把光與泛光修好之後，車漆仍然死白，才針對材質做一次小修正，且須使用者同意才開額度。結束時跑 `stage-reviewer`。不要開第 4 階段。

基準：HEAD `2d02a04`（已部署）。對照圖一律寫到 `/workspace/parking-web-post-*.png`。

---

## 1. 現況

後製與光影已經有一條能用的鏈，缺的是電影感鏡頭效果，以及亮部控制。

**畫質級別**（`src/render/quality.ts`、`renderConfig.ts` 的 `QUALITY_PRESETS`）：`low` / `medium` / `high` / `ultra`。`?quality=` 優先於自動選擇。自動：軟體算圖或低記憶體／少核心 → `medium`，其餘 → `high`，永不自動選 `ultra`。手機／平板（`coarsePointer`）與軟體算圖只會拿掉地面倒影，**不會因此降到 medium**；記憶體與核心夠的手機仍可能走到 high 後製鏈。

**兩條算圖路**（`framePipeline.ts`；遊戲、`?cam`、`?show`、`?bench` 共用）：

- A（low、medium）：直接畫到畫面。low 無全螢幕濾鏡；medium 只疊乘法暈影。不開半浮點緩衝區（SwiftShader 實測會只剩約 1/3 幀率）。
- B（high、ultra）：`EffectComposer`，順序為 RenderPass（半浮點、場景線性）→ GTAOPass → UnrealBloomPass →（ultra）SMAAPass → 自寫 Output ShaderPass（色差 → 暈影 → AgX＋黃昏色調分級 → sRGB → 抖色）。色調映射只做一次，與 A 路共用 `renderer.ts` 的 `CustomToneMapping`（AgX + `TONE_LOOK_CONFIG`）。不用 `OutputPass`，是為了把鏡頭效果併進同一道濾鏡。

**已有、本批要沿用而不是重做：**

- 色調：四個級別都是 `agx`。黃昏色調分級（暗部偏冷、亮部偏暖、飽和 1.3、對比 1.1）所有天氣共用同一套，還沒有「每場景色調」。
- 泛光：僅 high（strength 0.18、radius 0.5、threshold 1.8）與 ultra（0.24 / 0.6 / 1.6）。單元測試釘死 threshold > 1、strength < 0.5。門檻是場景線性亮度，與天氣無關。
- 鏡頭：high／ultra 有暈影與很輕的色差；medium 只有較輕的暈影。沒有景深、沒有動態模糊、沒有鏡頭光暈。
- 天空／太陽／PMREM／陰影、濕地平面反射、高度霧（`heightFog.ts`：雨、雷雨、夜晚把 three 的霧片段換成「貼地、隨高度指數遞減」的解析積分）、光柱（`lightShaft.ts`：開口圓錐台＋視線弦長，不是全螢幕 ray march）。
- 路燈：high 3 盞、ultra 5 盞真的 `SpotLight`（不投影，強度 150）；其餘只有自發光燈殼、光錐與地上加色光暈。車頭燈：medium 地上光斑，high 1 盞／ultra 2 盞不投影 SpotLight，有水氣時加光柱。
- 天氣空氣：`rain` lampShaft 2.6、headlightShaft 1、mist 0.02；`storm` 3 / 1.2 / 0.028；`night` 2.4 / 0.6 / 0.006。晴天、黃昏、雨後是乾淨空氣（無貼地霧、無頭燈光柱）。**沒有獨立的「雨夜」天氣。** 最接近的是 `storm`（w1_l07）與 `night`（w1_l09）／`rain`（w1_l10）。
- `?fx=off` 凍結會自己動的效果與光柱噪聲時間；定格 `?cam` 同樣不走時間。畫質尚未寫入設定／存檔（`save.ts` 註明「之後的畫質、鏡頭也併進來」）；暫停選單也還沒有畫質或效果開關。

**three 0.187 已內建、不算新套件**（`three/examples/jsm`）：現有鏈已用 EffectComposer、RenderPass、GTAOPass、UnrealBloomPass、SMAAPass、ShaderPass。本批可用：BokehPass／BokehShader／DOFMipMapShader、Lensflare（要貼圖）、FilmPass、LUTPass、AfterimagePass、VignetteShader、CSM（本批不用）。**沒有**官方動態模糊 Pass，也**沒有**官方體積光／上帝光 Pass。`AfterimagePass` 是殘影不是運動模糊，不要用。`Lensflare.js` 要flare貼圖，且會從畫框回讀，跟 HDR 鏈不好接；光暈改從 bloom 緩衝做程序化條紋／鬼影，不下載貼圖。

**過曝問題（已對圖確認）：** 對照圖 `/workspace/parking-web-cars-lot-showcase.png`（2026-11-16 00:17 PT，1920×1080），網址是 `/?level=w1_l07&cam=chase&t=2&quality=high&weather=clear`。注意 `cam=chase` 不是合法預設（只有 `follow` / `top` / `spot_low`），會落到 `follow`。這張是晴天，路燈按設定是關的；左邊兩台淺色車與人行道被 UnrealBloomPass 洗成死白，還帶紅青色散。近白像素約 90% 在畫面左 35%。先前紀錄也寫：同一批車在黃昏會被點亮的路燈光斑加泛光同樣吹掉。根因是「受太陽光的淺色車漆（線性亮度已超過 threshold 1.8）」加上「黃昏／雨夜時 SpotLight 150 × 光柱倍率再進同一道泛光」，不是車模本身。先修這個，再加景深／光暈，否則會更白。

**效能底線（規格 §9）：** RTX 5070 Ti 4K 極致 60 FPS；GTX 1070 1080p 中畫質 60 FPS；低畫質要能在一般筆電和手機上跑。e2e 是無頭 Chromium + SwiftShader、1280×720；high／ultra 每幀已要數百毫秒，再加全解析度 BokehPass（它會用深度材質把場景再畫一遍）很容易讓既有 `quality.spec.ts` 的 high 遊戲測試逾時。`?bench` 在本機 RTX 5070 Ti 與手機幀時間都還沒量過，本批不取代那次量測，但低畫質與手機路徑不得變貴。

---

## 2. 要改或新增的檔案

**改：**

- `src/render/quality.ts`：加上 `depthOfField` / `motionBlur` / `lensFlare`（`null` = 關）；自動選擇時手機與軟體算圖跳過這三項（比照倒影）；`usesHdrChain` 維持只看 AO／bloom／SMAA，不因這三項把 medium 拉進 HDR 鏈。
- `src/render/renderConfig.ts`：`QUALITY_PRESETS`、`POST_CONFIG`；路燈強度若要天氣倍率，可留在 `LOT_PROPS_CONFIG` 或改由天氣表縮放。
- `src/render/framePipeline.ts`：插入景深、動態模糊、光暈；高畫質光柱要的深度貼圖在這裡產生並交給場景。
- `src/render/weatherPresets.ts`：每場景色調、泛光門檻／強度倍率、（可選）路燈強度倍率；微調 rain／storm／night 的 `air`（霧與光柱）。`tests/weather.test.ts` 釘死 dusk 的天空／太陽／霧／半球必須完全不變。
- `src/render/renderer.ts`、`tests/toneLook.test.ts`：色調分級改為可依天氣換參數；預設（黃昏）數值與現在的 GLSL 相同。
- `src/render/lightShaft.ts`、`src/props/lotProps.ts`、`src/vehicle/carHeadlights.ts`、`src/render/scene.ts`：high／ultra 光柱可依深度淡出（被車與樓擋住），並接上天氣倍率後的路燈強度。
- `src/core/urlParams.ts`：`?fx=off` 一併關閉景深、動態模糊、光暈；不必新參數，除非實作時發現要單獨測。
- 測試：`tests/quality.test.ts` 矩陣；新增純函式測試（不開 WebGL）覆蓋泛光天氣倍率、景深對焦距離、速度低於門檻時模糊為 0、光柱深度淡出公式。
- e2e：既有 `quality.spec.ts` / `weather.spec.ts` / `modes.spec.ts` 必須繼續過（定格可重現、不是整片單色）。不強制新的逐位元組比對（畫面本來就會變）。

**新增（小檔、純函式可測）：** 例如 `src/render/depthOfField.ts`、`motionBlur.ts`、`lensFlare.ts`（以及對應 `tests/*.test.ts`）。不要新增 postprocessing npm 套件。

**不動：** 規格檔、`package.json`、車輛物理與碰撞、停車判定、關卡 JSON（不新增天氣 id，除非使用者同意）、設定／存檔 UI（留給第 4 階段）。

---

## 3. 步驟（每步小到可以單獨 commit）

建議 commit 訊息前綴 `feat:` / `fix:` / `test:`，英文短句。

1. **先修左邊過曝（fix）**  
   依天氣縮放泛光：晴天／雨後／黃昏提高 threshold、略降 strength，讓受太陽光的白車漆不進 bloom；夜晚／雨／雷雨保持較低門檻，只讓燈殼與光柱發光。黃昏有太陽（強度 8）又開路燈時，把路燈 SpotLight／光斑乘上小於 1 的白天倍率，避免 150 燭光再疊陽光。不改 dusk 的天空與太陽常數。  
   **驗證：** 單元測試釘住各天氣的門檻關係與「晴天淺色車漆估計亮度 < 泛光門檻」。重拍 `/?level=w1_l07&cam=chase&t=2&quality=high&weather=clear` → `/workspace/parking-web-post-l07-clear-chase.png`，並做左邊裁切對照 `/workspace/parking-web-post-l07-left-compare.png`（對齊現有 `/workspace/parking-web-cars-lot-showcase.png`）。加拍 `weather=dusk` 與關卡原天氣 `storm`（不帶 weather 或明講）。車要看得出顏色與摺線，燈仍然亮，畫面不能變悶。`npx vitest run tests/quality.test.ts tests/weather.test.ts`。

2. **每場景色調分級（feat）**  
   在 AgX 之後接天氣表：夜晚偏冷、雨／雷雨降低飽和並略抬暗部、黃昏維持現有 `TONE_LOOK_CONFIG`（基準畫面一個數字都不改）。  
   **驗證：** `tests/toneLook.test.ts` 擴成可代入天氣；dusk 的 GLSL 與現在逐字相同。截圖：`/workspace/parking-web-post-look-{clear,dusk,rain,storm,night,wet}.png`（同一關同一鏡頭，建議 `w1_l07` + `cam=follow&t=2&quality=high`）。既有天氣 e2e（六種天氣兩兩不同、同一種重拍相同）要繼續過。

3. **景深（feat）**  
   不要直接丟全解析度 `BokehPass`（多一遍深度場景，SwiftShader 會爆）。自寫半解析度、少取樣的 ShaderPass，對焦在玩家車（follow／chase_*），hood／cockpit 略近，`top` 與定格俯視關閉或極弱。只開在 high／ultra，且軟體算圖與手機自動選擇即使落到 high 也關。`?cam` 定格可重現。  
   **驗證：** 純函式測對焦距離與「低級別／軟體算圖為 null」。截圖：`/workspace/parking-web-post-dof-hood.png`、`...-dof-chase.png`，遠樓與前景路燈桿略柔、車主體清楚。跑 `e2e/quality.spec.ts` 確認 high 遊戲測試與定格沒逾時、可重現。

4. **輕微動態模糊（feat）**  
   自寫依相機前後 view-projection 重建速度的 ShaderPass，不要用 AfterimagePass。只開在 high／ultra；速度低於門檻、`?cam` 定格、`?fx=off`、軟體算圖、手機自動選擇皆為 0。停車遊戲以清楚為主，強度要很小。  
   **驗證：** 單元測試：位移為 0 → 模糊為 0；定格 `t=` 與改前可重現（e2e quality high／ultra）。動態僅在一般遊戲裡目視：短距離開車截一張 `/workspace/parking-web-post-motion-chase.png`，背景略拖、車輛可讀。

5. **鏡頭光暈與泛光微調（feat）**  
   在 bloom 之後，用 bloom 緩衝做程序化的輕微變形蟲條紋與少數鬼影，只取太陽圓盤與燈殼，不取車漆亮點。不引入 `Lensflare.js`、不下載貼圖。過曝修好後才能做這步；若光暈再次吹白左邊的車，收緊光源遮罩。  
   **驗證：** 單元測試：遮罩只含「像燈／太陽」的高亮。截圖：逆光黃昏 `/?level=w1_l06&cam=follow&t=2&quality=high` → `/workspace/parking-web-post-flare-l06-dusk.png`；再比一次 l07 clear 左邊裁切，不能比步驟 1 更白。low／medium 截圖應與步驟 1 幾乎相同（這一步不影響 A 路）。

6. **體積光與雨夜霧（feat）**  
   沿用現有光柱＋高度霧，**不加全螢幕 volumetric ray march**。high／ultra 對光柱做深度淡出，避免光錐穿車穿樓。微調 storm／night／rain 的 mist 與 shaft 倍率，讓雨夜（尤其 w1_l07 雷雨、w1_l09 夜晚、w1_l10 雨巷）的光束與貼地霧更有厚度；low 維持少段數、無噪聲、無深度取樣。不新增天氣 id。  
   **驗證：** 光柱公式單元測試加上深度淡出。截圖：`/workspace/parking-web-post-shaft-l07-storm.png`、`...-shaft-l09-night.png`、`...-shaft-l10-rain.png`，以及 low 對照 `...-shaft-l07-storm-low.png`（要看得出光錐，但不能明顯比較貴）。目視：光束有體積、不穿實體、路面與車不會再洗白。

7. **級別矩陣、回歸與審查（test）**  
   補齊 quality 開關矩陣與「手機／軟體算圖跳過新效果」。跑 `npm run typecheck`、`npx vitest run`、`npm run build`、`npx playwright test`。同一組對照圖若步驟中已過期就重拍最終版。交 `stage-reviewer` 看 diff 與驗證。通過後才依既有批次規則部署（本計畫不動手）。

---

## 4. 各畫質級別怎麼處理（低畫質與手機必須便宜）

| 效果 | low | medium | high | ultra | 手機自動／軟體算圖 |
| --- | --- | --- | --- | --- | --- |
| 色調分級 | 有（材質著色器，幾乎免費） | 同左 | 同左（輸出 Pass） | 同左 | 有 |
| 泛光 | 無 | 無 | 有，天氣縮放門檻 | 略強，同樣縮放 | 走 medium 則無；若 `?quality=high` 強制開，e2e 仍要能跑完 |
| 景深 | 無 | 無 | 半解析度、少取樣 | 略強，仍半解析度 | **關**（即使裝置被選成 high） |
| 動態模糊 | 無 | 無 | 微弱、近乎靜止為 0 | 略明顯，仍有門檻 | **關** |
| 鏡頭光暈 | 無 | 無 | 輕、只從燈／太陽 | 略明顯 | **關** |
| 光柱 | 雨／夜／雷雨才有；12 段、車頭 1 道、無噪聲；黃昏不畫 | 有，20 段、2 道、1 層噪聲 | 28 段、2 層噪聲＋深度淡出 | 36 段＋深度淡出 | 跟所選級別；不額外加深度取樣若在 medium／low |
| 高度霧 | 各級相同（改著色器片段，不多 draw call） | 同左 | 同左 | 同左 | 同左 |
| 真路燈 | 0 | 0 | 3 | 5 | 跟所選級別 |

A 路（low／medium）不因本批改走 EffectComposer。新效果不得把 `usesHdrChain('medium')` 變成 true。

---

## 5. 風險

- SwiftShader e2e 逾時：景深若用官方 BokehPass 或全解析度取樣，high 遊戲測試會炸。所以自寫半解析度，並在軟體算圖關閉。
- 泛光＋光暈＋光柱疊加再次洗白淺色車。步驟必須先 1 後 5，對照圖用同一網址。
- 打破 dusk 基準測試、或讓天氣／quality 定格無法逐位元重現（動態模糊在定格必須為 0；SMAA 仍要等查表貼圖）。
- 色調映射做兩次、或加色光柱被錯誤 tone map（現況 `toneMapped: false` 要維持）。
- 記憶體夠的手機自動選 high：若不跳過新效果，填充率會掉幀。計畫在自動選擇時強制關掉這三項。
- `?bench` 與真機幀時間仍缺，本批只能守住「low／medium 成本不升」與 e2e；不能宣稱已達 4K 60。
- 官方沒有運動模糊與體積 ray march；自寫 shader 要保持簡單，測純函式，避免新抽象層。

---

## 6. 新套件與素材

無。只用已安裝的 three@0.187.0 與現有程序化幾何／著色器。光暈貼圖若需要，用程式畫的 `DataTexture`，不下載 CC0 HDRI 或 flare PNG。

---

## 7. 擬議的規格修正（只列、不改檔）

- §7 設定裡的畫質預設與「景深／動態模糊／光暈」個別開關：現況只有 `?quality=`，存檔與暫停選單都還沒接。建議留到第 4 階段，本批先用級別預設＋`?fx=off`。
- 自動畫質：建議手機（coarse pointer）預設改為 medium（現在只拿掉倒影，仍可能選 high）。若同意，可在本批一併改；否則至少關掉新的貴效果。
- 是否新增天氣 id `rain_night`：規格目前六種已含 rain／storm／night。本批先把 storm／night／rain 的霧與光柱打磨成雨夜感，不新增 id。若要真正的「雨＋夜」（比 storm 更暗、比 night 更濕），再另開一批。
- §9 的 TAA：本批不做（ultra 已有 SMAA）。級聯陰影（three 有 CSM）本批也不做。
- `?cam=chase` 會靜默落到 `follow`。可在規格或實作裡把 `chase` 當 `follow` 的別名，或在文件註明；本批對照圖繼續用同一個網址以利前後比較。

---

## 8. 本批明確不做

第 4 階段內容（設定 UI、手把以外已有的系統、關卡編輯器、新世界）。近看車身肩線、水箱罩網格、飾條材質、積水以外的地面磨損（先前已另列的建模項）。WebGPU、新套件、改規格檔、在點頭前開 Claude 實作或 commit／push。

---

## 9. 實作結果（2026-11-16，使用者已核准後實作）

使用者的決定：體積光只加強既有的光錐與高度霧（high／ultra 加深度淡出），不做全螢幕 ray march；手機（coarse pointer）自動畫質改為 `medium`，景深／動態模糊／鏡頭光暈在手機與軟體算圖上一律關（`?quality=high` 也一樣）；不做個別效果開關、不新增 `rain_night`。

| 步驟 | 做了什麼 | 主要檔案 |
| --- | --- | --- |
| 1 | 泛光門檻／強度跟天氣走（`PostPreset`），泛光輸入壓上限，黃昏路燈減半 | `weatherPresets.ts`、`framePipeline.ts`、`lotProps.ts` |
| 2 | 每種天氣自己的色調分級；黃昏的 GLSL 逐字不變 | `renderer.ts`、`weatherPresets.ts` |
| 3 | 景深：半解析度模糊，深度沿用環境光遮蔽那一遍，對焦在玩家車，俯視不做 | `depthOfField.ts` |
| 4 | 動態模糊：前後兩幀的 view-projection 重投影，只在一般遊戲的連續畫面；玩家車周圍不拖 | `motionBlur.ts` |
| 5 | 鏡頭光暈：太陽與最近三盞路燈的燈頭，照畫面上的位置畫條紋與鬼影，被擋住看深度；色差降三分之一 | `lensFlare.ts`、`scene.ts` |
| 6 | 光柱依上一幀的場景深度裁掉被擋住的部分（high／ultra）；雨、雷雨、夜晚的貼地霧與光柱加厚 | `lightShaft.ts`、`weatherPresets.ts` |
| 7 | 畫質矩陣測試、`?fx=on` 的 e2e（軟體算圖上也編譯三個著色器）、審查與修正 | `tests/quality.test.ts`、`e2e/quality.spec.ts` |

網址參數：`?quality=low|medium|high|ultra` 指定級別；`?fx=off` 關掉會動的效果與這三項鏡頭效果；`?fx=on` 在手機／軟體算圖上強制開這三項（截圖與測試用）。

還沒做、留給之後：設定選單裡的畫質與個別效果開關（第 4 階段）；`?bench` 在真機（RTX 5070 Ti、GTX 1070、手機）的幀時間還沒量；TAA、級聯陰影；動態模糊的鏡頭切換判斷是逐像素的（切鏡頭那一幀遠處可能有很輕的一幀拖影）。對照圖在 `/workspace/parking-web-post-*.png`，進度與規格修正提議在 `~/parking-dev/logs/web-post-progress.md`。
