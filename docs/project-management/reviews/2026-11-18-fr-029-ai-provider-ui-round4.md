# 獨立審查報告：FR-029 AI provider 設定介面優化與回歸測試

- 審查對象：root `0.52.0`、HEAD `9ce9c8ffeaffaed8ac4fc16f160c00dd157115a8`；round4 修正尚未提交，工作樹為 dirty
- 對應 08-CHANGE-LOG 條目：`2026-11-18 — AI provider 設定介面優化與回歸測試`
- 審查輪次：round4，針對 round3 bootstrap race 修正後的目前 root 工作樹
- 審查時間：2026-11-18 10:48–10:50（Asia/Taipei）；Node `v24.13.0`
- 審查來源：獨立讀取目前 root 工作樹、相關需求／治理文件、原始碼與測試，重新執行 focused／full 指令及 deterministic VM tests；未依賴主要代理的評價性結論
- 審查範圍：root `public/`、`server.mjs`、root 測試與治理 closeout。`app/` 既有 dirty 變更與未追蹤檔案完全不在範圍，未清理、回復或修改

## 審查摘要

本輪結論：**有條件通過**。

round3 的 bootstrap race 已修正。`loadAiSettings()` 會在請求開始時捕捉目前 provider／generation，response 與 catch 均只在仍屬於目前 transition 時作用；`scripts/test-review-ui.mjs:308-338` 的 delayed bootstrap regression 通過。round2／round3 的 save、connection、discovery、provider field split 與 namespace cases 也持續通過。

本輪沒有發現新的 root 產品邏輯阻擋。完整 `npm test` 的所有功能 suites 均通過，僅在 posttest 的 Windows `fs.symlinkSync` fixture 以 `EPERM` 結束；這是目前環境的 symlink 權限限制，不判定為產品失敗。治理方面 `npm run docs:check:final` 仍未通過，最新 08 條目仍為進行中，故整體只能有條件通過，尚不能宣稱治理結案。

## 1. 需求完整性

- 判定：**通過**（治理 closeout 另列條件）。
- 證據：
  - `docs/project-management/02-REQUIREMENTS-ANALYSIS.md:43-44` 定義 FR-028 NVIDIA NIM 與 FR-029 provider-specific 欄位、Azure-only Deployment／API Version、本機獨立 key、切換清除與正確 provider namespace；`:62-68` 定義 NFR-001、NFR-002、NFR-007。
  - `public/review.html:198-207` 有 NVIDIA、Azure 欄位、雲端 `aiApiKey` 與本機 `aiApiKeyLocal`；`public/styles.css:83-84` 隱藏不適用欄位；`public/review.js:304-339,477-533` 負責 key 分流、可見性、`aria-hidden`、generation 與 fail-closed profile transition。
  - `public/review.js:341-356` 已將初始 settings GET 綁定開始時的 provider／generation；`:347` 與 `:352` 對 response／failure 進行 current-transition guard。
  - `public/review.js:373-413` 的 save、`public/ai-provider-settings.mjs:44-63` 的 connection controller、`public/review.js:604-630` 的 test handler，以及 `public/review.js:561-590` 的 local discovery 均納入 provider transition 狀態。
- 範圍確認：NVIDIA default URL、雲端／本機 API Key UI、Azure-only 欄位、loopback 隱私提示及可存取性語意均有 root source／deterministic test evidence；未宣稱真實外部 provider 品質或發布驗收。

## 2. 邏輯正確性

- 判定：**通過**。
- Bootstrap race：`loadAiSettings()` (`public/review.js:341-356`) 在呼叫前保存 `provider`／`generation`，response 在 `:347`、error 在 `:352` 都呼叫 `isCurrentAiProviderProfileRequest()`；過期 response 不會 `applyAiSettings()`、重建 ready 或改寫目前 transition。
- Save race：`saveAiSettings()` (`public/review.js:373-413`) 保存 provider／generation，於 key、project settings、runtime/settings fetch、response、catch 與 finally 都檢查 `isCurrentSave()`；stale response 不會套用，stale finally 不會 unlock。
- Connection race：`runProviderConnectionTest()` (`public/ai-provider-settings.mjs:44-63`) 在 response、catch、finally 檢查 `isCurrent()`；`testAiConnection()` (`public/review.js:604-630`) 傳入目前 provider／generation，過期結果不更新狀態或按鈕。
- Discovery race：`discoverLocalAi()` (`public/review.js:561-590`) 先保存 `discoveryGeneration`，scan response 回來時先檢查 generation，再設定 provider、呼叫 `loadAiProviderProfile()`，profile 完成後再檢查 provider／generation／ready 才套用 endpoint、model、batch。
- Round4 deterministic evidence：`scripts/test-review-ui.mjs:308-338` 的 bootstrap stale response case 通過；`:340-405` 的 save-in-flight case、`:407-443` 的 connection pending／stale response case、`:445-484` 的 discovery transition case 均通過。未發現新的 root 邏輯阻擋。

## 3. 邊界情況

- 判定：**部分通過**。
- 已覆蓋：
  - `scripts/test-review-ui.mjs:170-206` 的 `uiFunctionSource()` 會先追蹤參數括號，再從 body opening brace 計算深度，已能擷取 `setAiApiKeyFields({ ... })` 等解構參數函式。
  - `scripts/test-review-ui.mjs:208-306` 覆蓋 delayed／rapid provider profile、非同步 failure、key 清空與 pending save；`:308-405` 覆蓋 bootstrap 與 save-in-flight；`:407-484` 覆蓋 connection stale response 與 local discovery transition。
  - provider helper assertions (`scripts/test-review-ui.mjs:86-106,112-166`) 覆蓋 provider／Base URL／model／Azure 欄位／API Key 變更時的連線 guard，以及 loopback key／同意門檻。
- 剩餘邊界：
  - 尚未以真實瀏覽器／Electron AX 流程重新執行 round4；本輪以 root deterministic UI functions、HTML/CSS assertions 與 server contract 為主。
  - 尚未使用真實 API Key、錯誤 key、外部 NVIDIA／雲端 endpoint、長批次或各 provider 真實字幕品質；LM Studio 仍無實機服務可驗收。
  - local discovery 的 generation guard 已有測試，但沒有真實 UI 中「scan 已開始後使用者手動再選 provider」的可視化 intent precedence evidence；這是剩餘風險，不是本輪已重現的產品失敗。

## 4. 程式碼品質

- 判定：**通過**（out-of-scope 工作樹格式問題除外）。
- 正面證據：
  - provider field／key routing 集中於 `public/review.js:304-339` 與 `public/ai-provider-settings.mjs:29-32`；save／profile／connection／discovery 均透過 current-generation predicate 收斂狀態。
  - `scripts/test-review-ui.mjs` 直接執行實際 UI function source，對高風險 asynchronous branches 有可重現 fixture，不只是 source marker。
  - 2026-11-18T10:49:30.1664432+08:00–10:49:30.2147759+08:00，root scoped `git diff --check` exit 0。
- 全工作樹 `git diff --check` 於 2026-11-18T10:49:30.2172554+08:00–10:49:30.3097055+08:00 exit 2，命中既有 `app/` 修改的 trailing whitespace；該區域不在本輪範圍，本審查未修改。
- 未發現需要以程式碼品質為由阻擋本輪 root provider UI 變更的問題。

## 5. 測試覆蓋

- 判定：**有條件通過**。
- 2026-11-18 執行證據：
  - `node --check public/review.js`、`node --check public/ai-provider-settings.mjs`、`node --check scripts/test-review-ui.mjs`：均 exit 0，10:48:36.2269996–10:48:36.3496274（+08:00）。
  - `node scripts/test-review-ui.mjs`：exit 0，10:48:36.3499309–10:48:36.4127505；輸出校閱 UI 測試通過，含 bootstrap、save、connection、discovery race cases。
  - `node scripts/test-ai-providers.mjs`：exit 0，10:48:36.4131400–10:48:36.8135322；provider contract 與術語／Prompt 測試通過。
  - 隔離 PATH `node scripts/test-core.mjs` 首次因 fixture port `19292` 被占用而 exit 1（10:48:36.8141296–10:48:46.9372940）；未修改程式或終止外部 process。稍後重試於 10:49:02.4076281–10:49:07.2611034 exit 0，核心回歸測試通過。
  - 隔離 PATH `npm test`：所有前置 suites、provider、UI、YouTube UI CLI 與 core 均完成並通過，10:49:12.6644235–10:49:24.0321988；`posttest` 在 `scripts/test-youtube.mjs:154` 建立 symlink 時以 Windows `EPERM` 結束。此為環境權限限制，不是本輪產品 failure，但完整 suite 仍沒有 exit 0 證據。
  - `npm run docs:check`：exit 0，10:48:46.9377415–10:48:47.3093844。
  - `npm run docs:check:final`：exit 1，10:49:30.3101499–10:49:30.6470430；最新 08 條目仍缺少「獨立審查是否執行：」「發布授權：」且狀態仍為進行中。
- 測試覆蓋結論：round3 bootstrap blocker 已有有效 deterministic regression，所有指定前置與 root functional suites 通過；剩餘限制是 symlink 環境、未重新人工 GUI，以及上述真實 provider／intent precedence 範圍。

## 6. 實際運行結果

- 判定：**有條件通過**。
- root UI／provider／core 的實際執行結果支持：解構參數函式 extractor 可執行；bootstrap、save、connection、discovery 的 stale response／unlock guards 通過；FR-029 欄位分流、NVIDIA UI helper、Azure-only 欄位、Ollama／LM Studio 本機 key 與 provider namespace contract 通過。
- `server.mjs:581-624` 依 provider 讀取 key／profile，`server.mjs:4077-4104` 依 provider profile／settings 保存，`server.mjs:4110-4128` 依 provider 清除／更新 runtime key；本輪未讀取、輸出或保存真實 API Key。
- 完整 `npm test` 已實際跑完 root 功能 suites，唯一失敗在 posttest YouTube symlink fixture 的 Windows `EPERM`；依使用者要求，此只列為環境限制，不轉化為產品缺陷。未進行真實外部 provider request 或 round4 GUI／安裝後人工驗收。

## 阻擋條件、剩餘風險與具體要求

### C-001 — 治理條件：08-CHANGE-LOG 尚未 close out

- 檔案／行號：`docs/project-management/08-CHANGE-LOG.md:3-17`。
- 證據：10:49:30 `npm run docs:check:final` exit 1；最新條目仍為「進行中」，缺少獨立審查與發布授權欄位。
- 要求：主要開發代理應依本 round4 結論補入 round4 報告引用、完整回歸的 symlink 環境限制、未發布範圍與適用授權，再重跑 `npm run docs:check:final`。本審查代理不修改治理文件。

### C-002 — 環境條件：Windows symlink 權限限制

- 檔案／行號：`scripts/test-youtube.mjs:154`。
- 證據：10:49:12–10:49:24 full `npm test` 的前置、provider、UI、YouTube UI CLI、core 均通過，posttest `fs.symlinkSync` 以 `EPERM` 結束。
- 要求：在 Developer Mode／允許 symlink 的 Windows 環境重跑以取得完整 exit 0；在此環境不應修改產品或測試來繞過。此條件不是本輪 root provider UI 的產品 blocker。

## 明確狀態分類

- 已通過：bootstrap delayed response generation／provider guard；`uiFunctionSource()` 解構參數擷取；save stale response／finally guard；connection stale response／status／unlock guard；local discovery shared transition 與 deterministic coverage；FR-029 欄位分流、FR-028 NVIDIA UI／provider contract、基本 namespace separation；focused syntax／UI／provider／隔離 PATH core；root `npm test` 除 symlink fixture 外的全部功能 suites；`npm run docs:check`；root scoped `git diff --check`。
- 有條件：完整 `npm test` 受 Windows symlink `EPERM` 環境限制；`docs:check:final` 需由主要開發代理完成 08 closeout；未重新執行 GUI／AX／真實 provider。
- 未測試／剩餘風險：Developer Mode 下完整 npm exit 0、round4 GUI／安裝後人工流程、真實／錯誤 provider key、外部 NVIDIA／雲端 request、各 provider 真實字幕品質、local discovery 與手動切換的實機 intent precedence、LM Studio 實機、發布／簽章／公證。

## 綜合判定

- 結論：**有條件通過**。
- 可逐字引用的完整結論句：**有條件通過。round3 bootstrap race 已由 provider／generation guard 與 delayed deterministic regression 證實解除；save、connection、discovery stale response／unlock、provider-specific UI 與 namespace separation 也通過本輪 root focused／functional suites。完整 `npm test` 僅受 Windows symlink fixture 的 `EPERM` 環境限制，未構成產品失敗；但 08-CHANGE-LOG 尚未完成獨立審查／發布授權欄位與 final closeout，且真實 provider／GUI／安裝後流程仍未驗收。完成治理 closeout 並在適當 symlink 權限環境取得完整回歸證據後，才可宣稱本輪整體結案。**
- 阻擋／條件：C-001 治理 closeout；C-002 full-test 環境證據。
- 剩餘風險：未使用真實 key、未呼叫外部 provider；focused／functional pass 不代表真實模型品質、GUI／安裝後人工流程或發布完整性。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行檔案讀取、唯讀指令／測試與記憶體內 deterministic VM harness；未修改任何其他程式碼、測試、治理來源文件、round1／round2／round3 報告或使用者既有 `app/` 變更，未清理或回復工作樹。
- 本輪未輸入、讀取、保存或輸出任何真實 API Key，未呼叫外部 provider endpoint；VM harness 未寫入專案檔案。
- 若上述聲明不實，本報告無效。
