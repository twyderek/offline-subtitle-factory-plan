# 獨立審查報告：FR-029 AI provider 設定介面優化與回歸測試

- 審查對象：root `0.52.0`、HEAD `9ce9c8ffeaffaed8ac4fc16f160c00dd157115a8`；FR-029 變更仍未提交，工作樹為 dirty
- 對應 08-CHANGE-LOG 條目：`2026-11-18 — AI provider 設定介面優化與回歸測試`
- 審查輪次：round2，針對 round1 findings 修正後的目前工作樹
- 審查時間：2026-11-18 10:32–10:35（Asia/Taipei）；Node `v24.13.0`
- 審查來源：本輪獨立讀取目前工作樹、FR-029／FR-028／NFR-001／NFR-002／NFR-007 相關文件、原始碼、round1 報告及重新執行的指令／VM harness；未以主要代理的評價作為結論依據
- 審查範圍：`public/`、root `server.mjs`、相關 root 測試與治理 closeout。`app/` 子目錄既有修改與未追蹤檔案維持原狀，不納入本輪產品差異，也未清理或回復

## 審查摘要

本輪結論：**不通過**。

round1 要求的 profile 載入 generation、切換即清空兩組 key／Azure 欄位、pending 狀態鎖定保存／測試，以及載入失敗 fail-closed 已部分落實；獨立 VM harness 證實舊 profile GET 回應不會覆寫目前 provider，測試連線在 pending 狀態也不會呼叫 `/api/ai/test`。但目前仍有一個更晚發生的非同步競態：舊 provider 的儲存回應沒有 generation／provider guard，會在使用者已切換 provider 後無條件呼叫 `applyAiSettings()`，並在 `finally` 解鎖儲存按鈕。

此外，新 deterministic UI regression 本身在執行期以 `SyntaxError` 失敗，原因是 `uiFunctionSource()` 在解構參數的 `}` 位置提前截斷 `setAiApiKeyFields()`；因此目前不能宣稱 round2 race regression 已通過。`npm run docs:check:final` 也仍失敗，最新 08 條目尚未完成治理 closeout。

## 1. 需求完整性

- 判定：**部分通過**。
- 通過證據：
  - `docs/project-management/02-REQUIREMENTS-ANALYSIS.md:43-44` 定義 FR-028 NVIDIA NIM 預設 URL、provider ID／金鑰隔離，以及 FR-029 的 provider-specific 欄位、Azure-only Deployment／API Version、本機獨立 key、切換清除與 namespace 要求；`:62-68` 定義 NFR-001、NFR-002、NFR-007。
  - `public/review.html:198-207` 有 NVIDIA 選項、Azure 專用欄位、雲端 `aiApiKey` 與本機 `aiApiKeyLocal`；`public/styles.css:83-84` 隱藏不適用欄位；`public/ai-provider-settings.mjs:29-32` 以 provider token 判定欄位可見性。
  - `public/review.js:304-339,469-524` 已建立兩組 key input、欄位可見性／disabled／`aria-hidden`、generation、pending／ready 與失敗清空流程；`public/review.js:373-405,592-610` 已加入保存／連線測試的 fail-closed guard 與目前 provider key namespace。
- 未完整滿足：
  - `public/review.js:549-571` 的 `discoverLocalAi()` 直接設定 `aiProvider.value`，但沒有呼叫 `loadAiProviderProfile()` 或共同 provider transition；因此由「掃描本機服務」切換時，可能留下前一 provider 的可見 key、Azure 欄位可見性與舊 snapshot。這是 FR-029「選擇 provider 後只顯示適用欄位」的未涵蓋入口。
  - 已開始的保存請求仍可跨 provider transition 套用回應，故 FR-029 的切換安全性與 NFR-002 namespace 邊界尚未完整交付。

## 2. 邏輯正確性

- 判定：**不通過**。
- 已修正且獨立驗證的部分：
  - `public/review.js:475-483` 在 profile GET 前遞增 generation、清空兩組 key／Azure 值、清除 snapshot 並進入 pending；`:498-524` 只接受目前 provider 的回應，失敗時清空 snapshot／key 並維持 `ready=false`。
  - 2026-11-18T10:34:53.5966430+08:00–10:34:53.6452427+08:00 的只讀 VM harness 對 `testAiConnection()` 驗證：`fetchCount=0`、狀態為「供應商設定尚未載入完成，暫時無法測試連線」、按鈕仍 disabled。
- 阻擋問題 F-001（P1）：
  - `saveAiSettings()` 在 `public/review.js:373-405` 沒有保存開始時的 provider／generation，也沒有在 `await` 後確認目前 transition 仍相同；`:398` 無條件 `applyAiSettings(result.settings)`，`:403` 無條件 `button.disabled = false`。
  - 2026-11-18T10:34:44.3782580+08:00–10:34:44.4421945+08:00 的獨立 stdin VM harness 先以 `nvidia` 開始保存，再把目前選擇改為 `azure` 並設為 pending／not-ready，最後釋放舊保存回應；輸出為 `{"appliedProvider":"nvidia","currentProvider":"azure","pending":true,"ready":false,"saveButtonDisabled":false}`。這證明舊保存回應仍被套用，且會破壞 fail-closed 的按鈕狀態；實際 `applyAiSettings()` 還會在 `:261-289` 把 provider 與 profile 寫回畫面並重新設為 ready。
  - `discoverLocalAi()` 的程式切換缺少同一 transition guard，與上述問題共同表示 provider 轉換尚未收斂為單一狀態機。
- 修正要求：保存與連線測試開始時捕捉 provider／generation；每個非同步回應及 `finally` 都只可作用於目前 transition，過期保存回應不得呼叫 `applyAiSettings()`，也不得解鎖目前仍 pending 的按鈕。將手動 select change 與 local discovery 共用同一個 provider transition helper，並保證 key、Azure 欄位、snapshot、可見性及 ready 狀態同步更新。

## 3. 邊界情況

- 判定：**不通過**。
- 已覆蓋／可追溯證據：
  - `scripts/test-review-ui.mjs:99-106` 的 helper assertions 覆蓋 NVIDIA 雲端 key、Ollama／LM Studio 本機 key、Azure-only 欄位與非 Azure 隱藏規則。
  - `scripts/test-review-ui.mjs:197-295` 已設計 delayed old response、rapid switch、rejected profile、key 清空與保存 fail-closed 情境；`public/review.js:469-524` 的實作也與該意圖大致一致。
  - 但該測試在建立 VM 函式前即失敗，故上述情境沒有形成有效的 suite pass 證據。
- 未通過／未涵蓋：
  - F-001 的「保存已開始後切換 provider」情境尚無回歸測試，且只讀 VM harness 已重現。
  - `discoverLocalAi()` 的程式切換未驗證欄位 visibility、key 清空、snapshot 與保存／測試鎖定；這是與手動 select change 不同的實際入口。
  - 未使用真實 key、未呼叫 NVIDIA 或其他外部 provider、未驗證錯誤 key、外部網路錯誤、長批次或安裝後人工流程；這些仍不能由 focused helper assertions 推論通過。

## 4. 程式碼品質

- 判定：**部分通過**。
- 正面證據：
  - `public/review.js:304-339` 將 key 選擇、欄位可見性與 provider profile 狀態集中處理；`public/ai-provider-settings.mjs:29-32` 將 `data-providers` 判定抽成可測 helper；scoped `git diff --check` 於 2026-11-18T10:32:49.0053114+08:00–10:32:49.0569103+08:00 exit 0。
  - `public/review.js:592-610` 的連線測試先檢查 profile ready，再把目前 provider 的 saved key 狀態傳給既有 connection controller，方向正確。
- 品質問題：
  - 非同步保存流程沒有與 profile generation／provider transition 共用狀態，導致舊回應可重新套用畫面並解除鎖定；這是可維護性與狀態一致性問題，不只是測試缺口。
  - `discoverLocalAi()` 以直接 DOM assignment 旁路 change handler，造成 provider transition 邏輯分散。
  - 新增的 `scripts/test-review-ui.mjs:170-195` `uiFunctionSource()` 以 `{}` 深度解析函式，但從函式名稱開始計算，未先跳過解構參數；它對 `setAiApiKeyFields({ ... })` 在函式 body 前提前結束，直接製造測試執行期 syntax error。
  - 全工作樹 `git diff --check` 於 2026-11-18T10:32:49.0591389+08:00–10:32:49.1544601+08:00 exit 2，命中使用者既有 `app/` 修改的 trailing whitespace；本審查不將該 out-of-scope 區域歸責於 FR-029，也未修改它。

## 5. 測試覆蓋

- 判定：**不通過**。
- 2026-11-18 執行證據：
  - `node --check public/review.js`、`node --check public/ai-provider-settings.mjs`、`node --check scripts/test-review-ui.mjs`：均 exit 0，時間 10:32:17.4241853–10:32:17.5696240（+08:00）。
  - `node scripts/test-ai-providers.mjs`：exit 0，10:32:33.1425094–10:32:33.5469695；輸出 provider contract 測試通過。
  - 隔離 PATH `node scripts/test-core.mjs`：exit 0，10:32:33.5497837–10:32:38.5977855；輸出核心回歸測試通過。
  - `npm run docs:check`：exit 0，10:32:38.5984253–10:32:38.9651491。
  - `node scripts/test-review-ui.mjs`：exit 1，10:32:17.5699215–10:32:17.6218478；`evalmachine.<anonymous>:5` 在 `function updateAiPrivacyStatus()` 報 `SyntaxError: Unexpected token 'function'`，堆疊指向 `scripts/test-review-ui.mjs:243`。因此 UI suite 不能算通過。
  - 隔離 PATH `npm test`：exit 1，10:32:49.5051662–10:32:53.8724613；前置 suites 與 provider／core 在 UI suite 前通過，於同一 `test-review-ui.mjs` syntax error 中止，尚未走到 YouTube symlink fixture。round1 記錄的 Windows `fs.symlinkSync` `EPERM` 仍是後續 full-suite residual blocker，須在 UI suite 修復後重跑確認。
  - `npm run docs:check:final`：exit 1，10:32:49.1548729–10:32:49.5046143；指出最新 08 條目缺少「獨立審查是否執行：」「發布授權：」、且未標示「完成」。
- 覆蓋缺口：
  - `scripts/test-review-ui.mjs:197-295` 的新 race block 雖宣稱 save/test controls，實際只 extract／呼叫 `saveAiSettings()`，沒有 extract／執行 `testAiConnection()`，也沒有 assert pending／failed provider 狀態下 `/api/ai/test` fetch 次數；因此即使 parser 修正，test fail-closed 仍需補成可執行 regression。
  - 本輪未把任何真實 API key、外部 provider response 或影片／音訊送出測試環境。

## 6. 實際運行結果

- 判定：**部分通過**。
- `public/review.html:198-207`、`public/styles.css:83-84` 與 `public/review.js:317-323` 的靜態檢查支持 NVIDIA 雲端欄位、Ollama／LM Studio 本機欄位、Azure-only 欄位及 disabled／`aria-hidden` 語意；provider contract helper 與 core 測試也通過。
- 只讀 VM harness 在 10:34 直接執行目前 `public/review.js` 的 profile／save／test 函式，確認：profile 舊回應可被 generation guard 丟棄、失敗可維持 not-ready、pending 測試不發 request；同一 harness 也重現 F-001 舊保存回應被套用。
- 本輪沒有重新宣稱 round1 的人工瀏覽器 UI 結果；沒有外部 NVIDIA／雲端請求、沒有使用或輸出真實 API Key。由於 `test-review-ui` 執行期失敗，NVIDIA 欄位的目前工作樹 GUI／AX 行為沒有取得新的完整 round2 pass 證據。

## 阻擋問題與具體修正要求

### F-001 — P1：已開始的舊 provider 儲存回應可覆寫切換後狀態

- 檔案／行號：`public/review.js:373-405,475-524`。
- 證據：10:34:44 的只讀 VM harness 輸出 `appliedProvider=nvidia`，當前 provider 已為 `azure`，且 pending／not-ready 時 `saveButtonDisabled=false`。
- 修正要求：為 save／test／profile transition 建立共同 generation／provider token；舊 save response 不得套用 `applyAiSettings()`，`finally` 不得解除目前 transition 的鎖定；補上 save-in-flight → rapid provider switch regression。

### F-002 — P1：round2 deterministic UI regression 本身無法執行

- 檔案／行號：`scripts/test-review-ui.mjs:170-195,243-295`；被擷取函式 `public/review.js:308-315`。
- 證據：10:32:17 `node scripts/test-review-ui.mjs` exit 1，VM compile 在 `updateAiPrivacyStatus()` 報 `Unexpected token 'function'`；擷取器在解構參數閉合處先返回。
- 修正要求：讓 extractor 先定位函式 body 的 opening brace，或改用不脆弱的可執行測試模組；修復後重新執行 UI suite，不得以 `node --check` 代替 runtime pass。

### F-003 — P1：local discovery 旁路 provider transition

- 檔案／行號：`public/review.js:549-571`。
- 證據：`discoverLocalAi()` 直接寫入 `aiProvider`／`aiBaseUrl`，未呼叫 `applyAiProviderFieldVisibility()`、`setAiProviderProfileState()` 或 `loadAiProviderProfile()`；因此前一 provider 的欄位顯示、snapshot 與狀態可能殘留。
- 修正要求：讓 local discovery 使用與 select change 相同的 transition helper，或明確在套用 discovery 結果前後同步清除 key／Azure 值、套用 visibility、重置 snapshot 並鎖定／解鎖保存與測試。

### F-004 — P1：治理 closeout 尚未完成

- 檔案／行號：`docs/project-management/08-CHANGE-LOG.md:3-17`。
- 證據：10:32:49 `npm run docs:check:final` exit 1；最新條目仍是「進行中」，缺少獨立審查與發布授權必要欄位。本審查代理不修改該治理文件。
- 修正要求：主要開發代理修復上述產品／測試問題後，以 round2 報告逐字結論更新 08 條目、揭露完整回歸與 symlink 權限狀態、填入本輪適用的發布授權／不發布範圍，並重跑 final gate。

## 明確狀態分類

- 已通過：FR-028／FR-029 的靜態 provider 欄位標記；NVIDIA default URL／provider helper contract；雲端／本機 key 分離的基本實作；profile GET 的 stale-response guard；profile failure 與 pending connection 的 fail-closed code path；provider contract、隔離 PATH core、syntax check、`npm run docs:check`、scoped `git diff --check`。
- 不通過／阻擋：F-001 save-in-flight cross-provider race；F-002 UI regression runtime failure；F-003 discovery transition bypass；F-004 08 closeout／`docs:check:final`。
- 未測試／剩餘風險：修正後的完整 UI runtime／GUI／AX pass、test handler 的 deterministic fetch assertion、真實或錯誤 provider key、外部 NVIDIA／雲端請求、各 provider 真實字幕品質、完整 `npm test` 後續 YouTube symlink 權限、LM Studio 實機、安裝後人工流程與發布／簽章／公證。

## 綜合判定

- 結論：**不通過**。
- 可逐字引用的完整結論句：**不通過。round1 的 profile 載入競態修正已部分成立，但已開始的舊 provider 保存回應仍可在切換後套用並解除 fail-closed 狀態；round2 deterministic UI suite 又因函式擷取器錯誤而無法執行，local discovery 亦旁路 provider transition，且治理 final gate 尚未完成。在完成 save／test／discovery 的共同 generation guard、可執行且涵蓋 delayed／rejected／rapid／save-in-flight regression、完整回歸重跑與 08 closeout 前，不得宣稱 FR-029 provider UI race safety、namespace separation 或本輪治理結案已通過。**
- 阻擋問題：F-001、F-002、F-003、F-004。
- 剩餘風險：本輪沒有真實 key 或外部 provider 請求；目前完整回歸在 UI suite 先行失敗，round1 的 Windows symlink `EPERM` 尚未在本輪重新走到；focused pass 不代表完整安裝、跨 provider 真實品質或發布驗收。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行檔案讀取、唯讀指令／測試與記憶體內 VM harness；未修改任何其他程式碼、測試、治理來源文件、既有審查報告或使用者既有 `app/` 變更，未清理或回復工作樹。
- 本輪未輸入、讀取、保存或輸出任何真實 API Key，未呼叫外部 provider endpoint；VM harness 未寫入專案檔案。
- 若上述聲明不實，本報告無效。
