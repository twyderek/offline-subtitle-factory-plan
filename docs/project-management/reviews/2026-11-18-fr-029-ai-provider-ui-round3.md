# 獨立審查報告：FR-029 AI provider 設定介面優化與回歸測試

- 審查對象：root `0.52.0`、HEAD `9ce9c8ffeaffaed8ac4fc16f160c00dd157115a8`；目前工作樹仍為 dirty，round3 修正未提交
- 對應 08-CHANGE-LOG 條目：`2026-11-18 — AI provider 設定介面優化與回歸測試`
- 審查輪次：round3，針對 round2 findings 修正後的目前 root 工作樹
- 審查時間：2026-11-18 10:43–10:46（Asia/Taipei）；Node `v24.13.0`
- 審查來源：獨立讀取目前 root 工作樹、相關需求／治理文件、原始碼與測試，並重新執行 focused／full 指令及記憶體內 VM harness；未採用主要代理的評價性結論
- 審查範圍：root `public/`、`server.mjs`、root 測試與治理 closeout。`app/` 子目錄既有 dirty 變更及未追蹤檔案完全不在本輪範圍，未清理、回復或修改

## 審查摘要

本輪結論：**不通過**。

round2 指出的三個 UI 問題已大致修正：`uiFunctionSource()` 能跳過解構參數；save 已捕捉 provider／generation 並防止 stale response／`finally` 解鎖；connection controller 與 `testAiConnection()` 也以 `isCurrent` 保持 fail-closed；local discovery 會走 `loadAiProviderProfile()`，且這些路徑均有 deterministic coverage。root `scripts/test-review-ui.mjs`、provider contract、隔離 PATH core 與所有 `npm test` 前置 suites 本輪均通過。

但獨立檢查仍發現一個未修正的 provider transition race：頁面啟動時的 `loadAiSettings()` 沒有 generation／provider guard。使用者在初始 `/api/ai/settings` 尚未完成時切換 provider，舊設定回應仍會呼叫 `applyAiSettings()`，覆寫目前 provider、輸入與 snapshot，並由 `applyAiSettings()` 將 profile 狀態重新設為 ready。完整 `npm test` 仍在 Windows symlink fixture 以 `EPERM` 結束，最新 08 條目也仍未完成治理 closeout。

## 1. 需求完整性

- 判定：**部分通過**。
- 證據：
  - `docs/project-management/02-REQUIREMENTS-ANALYSIS.md:43-44` 定義 FR-028 NVIDIA NIM 與 FR-029 provider-specific 欄位、Azure-only Deployment／API Version、本機獨立 key、切換清除與正確 provider namespace；`:62-68` 定義 NFR-001、NFR-002、NFR-007。
  - `public/review.html:198-207` 宣告 NVIDIA、Azure 欄位、雲端 `aiApiKey` 與本機 `aiApiKeyLocal`；`public/styles.css:83-84` 隱藏不適用欄位；`public/review.js:304-339,477-533` 負責 key 分流、可見性、`aria-hidden`、generation 與 fail-closed profile transition。
  - `public/review.js:373-413` 已將 save 與 provider／generation 綁定；`public/ai-provider-settings.mjs:44-63` 與 `public/review.js:604-630` 已將 connection response、狀態與按鈕 unlock 綁定 `isCurrent`。
  - `public/review.js:557-584` 的 local discovery 已先設定 provider，再呼叫 `loadAiProviderProfile()`，等待目前 transition 成功後才套用發現的 endpoint、model 與 batch size；`scripts/test-review-ui.mjs:412-451` 有對應 deterministic test。
- 未完整滿足：`loadAiSettings()` (`public/review.js:341-351`) 仍直接 `applyAiSettings(result.settings)`，沒有檢查初始 GET 是否已被 provider change supersede。這使「所有 provider transition 均不被舊回應覆寫」尚未達成。

## 2. 邏輯正確性

- 判定：**不通過**。
- 已通過的 round2 修正：
  - `saveAiSettings()` (`public/review.js:373-413`) 在開始時捕捉 `provider`／`generation`，於 Electron key、project settings、runtime/settings fetch、response、catch 與 finally 路徑呼叫 `isCurrentSave()`；過期 response 不會 `applyAiSettings()`，過期 finally 不會解除目前 transition 的鎖定。
  - `runProviderConnectionTest()` (`public/ai-provider-settings.mjs:44-63`) 在 response JSON 後、錯誤處理與 finally 均檢查 `isCurrent()`；`testAiConnection()` (`public/review.js:604-630`) 將目前 provider／generation 傳入，stale response 不會更新成功／失敗狀態或 unlock。
  - `discoverLocalAi()` (`public/review.js:567-578`) 已經過共同 profile transition 後才套用 local discovery 結果。
- 阻擋問題 F-001（P1）：初始設定 GET 仍可覆寫新的 provider transition。
  - `loadAiSettings()` (`public/review.js:341-350`) 沒有捕捉 generation，也沒有以目前 provider 驗證 response；`:346` 無條件呼叫 `applyAiSettings()`。
  - 2026-11-18T10:45:03.1414879+08:00–10:45:03.1888907+08:00 的只讀 VM harness 先啟動 `loadAiSettings()`，再把目前 provider 改為 `nvidia` 並維持 pending；釋放舊 `openai-compatible` 回應後，輸出為 `{"appliedProvider":"openai-compatible","currentProvider":"nvidia","pending":true,"ready":false}`，證明沒有 stale-response guard，且確實呼叫了舊設定套用路徑。實際 `applyAiSettings()` (`:259-290`) 會再改寫 provider／fields／snapshot 並呼叫 `setAiProviderProfileState({ ready: true })`。
  - 具體風險是使用者已選 NVIDIA、甚至已輸入新欄位時，舊初始回應將畫面切回舊 provider；後續 NVIDIA profile response 會因 `isCurrentAiProviderProfileRequest()` 的 provider 不再相符而被忽略，形成錯誤 ready／snapshot 狀態。
- 修正要求：將初始 settings load 納入同一 provider transition generation，或在 `loadAiSettings()` 套用前確認目前仍是 bootstrap generation／未開始 provider transition；任何 stale bootstrap response 都不得呼叫 `applyAiSettings()` 或改寫 ready／snapshot／按鈕狀態。補上初始 GET delayed → provider switch 的 deterministic regression。

## 3. 邊界情況

- 判定：**部分通過**。
- 已通過證據：
  - `scripts/test-review-ui.mjs:170-206` 的 `uiFunctionSource()` 先追蹤參數括號，再從函式 body opening brace 開始計算深度，能正確擷取 `setAiApiKeyFields({ ... })` 等解構參數函式。
  - `scripts/test-review-ui.mjs:208-306` 覆蓋 delayed／rapid profile switch、舊 response 忽略、rejected profile、key 清空與 pending save fail-closed。
  - `scripts/test-review-ui.mjs:308-372` 覆蓋 save-in-flight 後切換 provider；`:374-410` 覆蓋 pending／failed connection、stale connection success response 不更新狀態且不解鎖；`:412-451` 覆蓋 local discovery 使用 profile transition。
- 未完整覆蓋：
  - 初始 `loadAiSettings()` delayed → provider switch 尚無測試，且已由 VM harness 重現。
  - local discovery 的 scan response 若晚於使用者手動 provider change，沒有獨立 intent token；現行 code 會在 scan response 到達後把選擇設為第一個 available local provider。這是剩餘的低頻 UI intent race，至少應在後續測試明確定義「掃描結果是否可覆寫使用者後續選擇」。
  - 未使用真實 API Key、未呼叫 NVIDIA／其他外部端點、未驗證錯誤 key、長批次、安裝後人工流程或各 provider 真實字幕品質。

## 4. 程式碼品質

- 判定：**部分通過**。
- 正面證據：
  - provider 欄位可見性集中於 `providerFieldIsVisible()` (`public/ai-provider-settings.mjs:29-32`) 與 `applyAiProviderFieldVisibility()` (`public/review.js:317-324`)；key input 由 `getAiApiKeyInput()` (`:304-306`) 依 local／cloud provider 選擇。
  - save、profile、connection、discovery 的主要非同步路徑現在都有可讀的 current-generation predicate；round2 新增的 deterministic cases 直接執行實際 UI function source，而不是只做 regex marker assertion。
  - 2026-11-18T10:43:56.9226329+08:00–10:43:56.9621505+08:00，root scoped `git diff --check` exit 0。
- 品質問題：`loadAiSettings()` 仍是同一狀態機之外的非同步寫入者，造成 transition guard 不完整；應與 profile load 共用明確的 bootstrap／provider generation，而非讓 `applyAiSettings()` 同時扮演無條件初始化與 save response 套用入口。
- 全工作樹 `git diff --check` 於 2026-11-18T10:43:56.9645974+08:00–10:43:57.0519660+08:00 exit 2，命中既有 `app/` 修改的 trailing whitespace；該區域 out of scope，本審查未修改。

## 5. 測試覆蓋

- 判定：**部分通過**。
- 2026-11-18 執行證據：
  - `node --check public/review.js`、`node --check public/ai-provider-settings.mjs`、`node --check scripts/test-review-ui.mjs`：均 exit 0，10:43:41.8674961–10:43:41.9912727（+08:00）。
  - `node scripts/test-review-ui.mjs`：exit 0，10:43:41.9915646–10:43:42.0488810；輸出「校閱 UI 測試通過」，包含 parser、save race、connection stale response、discovery transition cases。
  - `node scripts/test-ai-providers.mjs`：exit 0，10:43:42.0492660–10:43:42.4570767；provider contract 與術語／Prompt 測試通過。
  - 隔離 PATH `node scripts/test-core.mjs`：exit 0，10:43:42.4576026–10:43:47.2739142；核心回歸測試通過。
  - `npm run docs:check`：exit 0，10:43:47.2743659–10:43:47.6590423。
  - 隔離 PATH `npm test`：exit 1，10:43:57.3852298–10:44:08.8736034；所有前置 suites、provider、UI、YouTube UI CLI 與 core 均完成並通過，`posttest` 在 `scripts/test-youtube.mjs:154` 的 Windows `fs.symlinkSync` 以 `EPERM` 結束。未繞過權限，故不能宣稱完整回歸通過。
  - `npm run docs:check:final`：exit 1，10:43:57.0524210–10:43:57.3847099；最新 08 條目仍缺少「獨立審查是否執行：」「發布授權：」且狀態仍非「完成」。
- 覆蓋缺口：round3 deterministic suite 已涵蓋使用者指定的 parser、save、connection 與 discovery 路徑，但尚未涵蓋 `loadAiSettings()` bootstrap stale response；local discovery scan 與手動 provider change 的 intent precedence 也未定義或測試。

## 6. 實際運行結果

- 判定：**部分通過**。
- Root focused suite 的實際執行結果支持：UI parser 可執行、provider-specific 欄位與 NVIDIA helper contract 通過、save／connection／discovery 的指定 race cases 通過、隔離 PATH core 通過；`public/review.html:198-207`、`public/styles.css:83-84`、`public/review.js:317-323` 的 static／test evidence 支持 Azure-only、雲端／本機 key 分流與 NFR-007 的 disabled／`aria-hidden` 語意。
- Root backend namespace 仍以 provider ID 讀寫：`server.mjs:581-624` 依 provider 讀取 key／profile，`server.mjs:4077-4104` 以 provider profile 與 settings 寫入，`server.mjs:4110-4128` 以 provider 參數清除／更新 runtime key；本輪 core／provider tests 通過且未使用真實 key。
- 完整實際執行仍有邊界：所有 npm test 功能 suites 已跑完，但 YouTube symlink fixture 受 Windows `EPERM` 阻塞；本輪沒有重新執行人工瀏覽器／Electron GUI pass，也沒有外部 provider 請求。round1／round2 的 GUI 結果不替代本輪新增 bootstrap race 的驗證。

## 阻擋問題與具體修正要求

### F-001 — P1：初始 `loadAiSettings()` response 可覆寫已開始的 provider transition

- 檔案／行號：`public/review.js:221,341-351,259-290`。
- 證據：10:45:03 只讀 VM harness 證明舊 `openai-compatible` response 在目前 provider 已為 `nvidia` 且 pending 時仍呼叫 `applyAiSettings()`；實際套用函式會重新設定 provider、snapshot 與 ready。
- 修正要求：為 bootstrap settings GET 增加 generation／provider guard，並加入 delayed initial load → provider switch → stale response regression。
- 若不修正：使用者的 provider 選擇、欄位與 snapshot 會被舊初始化資料覆寫，後續 profile response 可能被當成 stale 丟棄；FR-029 async transition safety 仍不成立。

### F-002 — P1：完整回歸仍受 Windows symlink 權限阻塞

- 檔案／行號：`scripts/test-youtube.mjs:154`。
- 證據：10:43:57–10:44:08 隔離 PATH `npm test` 的所有前置與 root provider／UI／core suites 通過，`posttest` 以 `Error: EPERM: operation not permitted, symlink` 結束。
- 修正要求：在具 Windows Developer Mode／symlink 權限的環境重跑完整 `npm test`；若維持環境限制，治理紀錄必須明確揭露，不能把本輪 focused pass 寫成 full regression pass。

### F-003 — P1：最新工作條目尚未完成治理 closeout

- 檔案／行號：`docs/project-management/08-CHANGE-LOG.md:3-17`。
- 證據：10:43:57 `npm run docs:check:final` exit 1，指出缺少獨立審查欄位、發布授權欄位且最新條目仍為「進行中」。本審查代理不修改該文件。
- 修正要求：主要開發代理依本報告結論更新 08 條目，補入 round3 報告引用、focused／full test 邊界、非發布授權與適用狀態，並重跑 final closeout。

## 明確狀態分類

- 已通過：`uiFunctionSource()` 解構參數擷取；save provider／generation guard；stale save response／finally guard；connection controller／`testAiConnection()` stale guard；local discovery 共用 profile transition 與 deterministic coverage；FR-029 靜態欄位分流、NVIDIA UI／provider contract、基本 namespace separation；focused syntax／UI／provider／隔離 PATH core；`npm run docs:check`；root scoped `git diff --check`。
- 不通過／阻擋：F-001 bootstrap settings race；F-002 Windows symlink `EPERM` 使完整 `npm test` 未完成；F-003 08 final closeout 未完成。
- 未測試／剩餘風險：bootstrap stale response 修正後 regression、local discovery scan 與手動切換的 intent precedence、人工 GUI／AX round3 pass、真實／錯誤 provider key、外部 NVIDIA／雲端請求、各 provider 真實字幕品質、LM Studio 實機、安裝後流程、發布／簽章／公證。

## 綜合判定

- 結論：**不通過**。
- 可逐字引用的完整結論句：**不通過。round2 所指出的 parser、save stale response／finally、connection stale response／status、local discovery transition 與 deterministic coverage 均已通過本輪 focused 驗證；但頁面初始 `loadAiSettings()` 仍可在 provider 切換後無條件套用過期設定並重新建立錯誤 ready／snapshot，完整 `npm test` 仍被 Windows symlink `EPERM` 阻塞，且 08-CHANGE-LOG 尚未完成治理 closeout。在 bootstrap generation guard、完整回歸環境證據與文件結案完成前，不得宣稱 FR-029 provider UI async race safety 或本輪整體驗收通過。**
- 阻擋問題：F-001、F-002、F-003。
- 剩餘風險：本輪未送出真實 key／外部 provider request；focused pass 不代表 GUI／安裝後人工驗收、真實字幕品質或發布完整性。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行檔案讀取、唯讀指令／測試與記憶體內 VM harness；未修改任何其他程式碼、測試、治理來源文件、round1／round2 報告或使用者既有 `app/` 變更，未清理或回復工作樹。
- 本輪未輸入、讀取、保存或輸出任何真實 API Key，未呼叫外部 provider endpoint；VM harness 未寫入專案檔案。
- 若上述聲明不實，本報告無效。
