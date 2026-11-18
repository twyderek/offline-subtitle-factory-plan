# 獨立審查報告：FR-029 AI provider 設定介面優化與回歸測試

- 審查對象 commit／版本：root `0.52.0`、HEAD `9ce9c8ffeaffaed8ac4fc16f160c00dd157115a8`；目前工作樹 dirty，round5 修正尚未提交
- 對應 08-CHANGE-LOG 條目：`2026-11-18 — AI provider 設定介面優化與回歸測試`
- 審查輪次：round5 closeout read-only review
- 審查代理啟動時間、上下文來源：2026-11-18 10:53（Asia/Taipei）；獨立讀取目前 root 工作樹、需求／治理文件、原始碼與測試，未採用主要代理的評價性結論
- 審查範圍：root `public/`、`server.mjs`、root 測試與治理狀態；`app/` 既有 dirty 變更與未追蹤檔案排除，未清理、回復或修改

本輪未發現新的 FR-029 root 產品邏輯阻擋。Bootstrap、save、connection、discovery 的 provider／generation guard 與 fail-closed 行為仍在，focused 與完整回歸的功能 suites 均有實際結果；完整 `npm test` 的唯一失敗仍是 Windows symlink fixture 的 `EPERM`。治理 `docs:check:final` 仍未 close out，因此整體結論為有條件通過。

## 1. 需求完整性

- 判定：**通過**（治理 closeout 另列條件）。
- 證據：
  - `docs/project-management/02-REQUIREMENTS-ANALYSIS.md:43-44` 定義 FR-028 NVIDIA NIM 與 FR-029 provider-specific 欄位、Azure-only Deployment／API Version、本機獨立 key、切換清除與正確 provider namespace；`:62-68` 定義 NFR-001、NFR-002、NFR-007。
  - `public/review.html:198-207` 包含 NVIDIA provider、Azure 專用欄位、雲端 `aiApiKey` 與本機 `aiApiKeyLocal`；`public/styles.css:84` 提供 provider-field 隱藏樣式；`public/review.js:304-323` 依 provider 分流 key 與欄位可見性／可存取性。
  - NVIDIA default URL、雲端／本機 key、Azure-only 欄位與 loopback privacy 門檻有 `public/review.js:496-529`、`scripts/test-review-ui.mjs:55-106` 的目前 source／deterministic assertions；`scripts/test-ai-providers.mjs:48-127` 也驗證 NVIDIA／Azure provider contract。
  - 未把真實外部 provider 品質、真實 API Key、GUI 安裝後驗收或發布完成誤列為本需求已完成範圍。

## 2. 邏輯正確性

- 判定：**通過**。
- 證據：
  - Bootstrap `loadAiSettings()` 在 `public/review.js:341-355` 於請求前保存 provider／generation；response 與 catch 均在 `:347`、`:352` 呼叫 `isCurrentAiProviderProfileRequest()`。過期 response 不會 `applyAiSettings()`、重建 ready 或解除目前 transition。
  - Provider profile transition `public/review.js:481-536` 以 `state.aiProviderProfileGeneration` 增量、先清空 snapshot／key、pending 時鎖定 save／test，並只讓 current provider 的 response／failure 改變狀態。
  - Save `public/review.js:377-416` 捕捉 settings provider／generation；在開始、await 後、response、catch 與 finally 使用 `isCurrentSave()`，故過期 response 不套用舊 provider，過期 finally 不會解除新 transition 的按鈕鎖定。`scripts/test-review-ui.mjs:340-405` 實際覆蓋 save-in-flight stale response／finally。
  - Connection `public/ai-provider-settings.mjs:44-63` 在 response、catch、finally 以 `isCurrent()` fail-closed；`public/review.js:610-636` 將目前 provider／generation 傳入。`scripts/test-review-ui.mjs:406-442` 覆蓋 pending／failed profile 與 stale connection response 不更新狀態／unlock。
  - Local discovery `public/review.js:561-590` 在 scan response、`loadAiProviderProfile()` 完成後再次檢查 generation／provider／ready，只有 current transition 才套用 endpoint、model、batch；`scripts/test-review-ui.mjs:444-483` 證實 discovery 使用同一 profile transition。

## 3. 邊界情況

- 判定：**部分通過**。
- 證據：
  - `scripts/test-review-ui.mjs:170-206` 的 `uiFunctionSource()` 追蹤解構參數的括號深度後才擷取 function body；因此 `setAiApiKeyFields({ ... })` 等目前函式可被 deterministic VM 執行。`node scripts/test-review-ui.mjs` 於 2026-11-18 10:54:17.4463526+08:00–10:54:17.5172951+08:00 exit 0。
  - `scripts/test-review-ui.mjs:208-306` 覆蓋快速 provider 切換、舊 profile response、failure、key 清空與 pending save；`:308-338` 覆蓋 delayed bootstrap response；`:340-405` 覆蓋 save；`:406-442` 覆蓋 connection；`:444-483` 覆蓋 discovery transition。
  - `scripts/test-review-ui.mjs:86-166` 覆蓋 provider／Base URL／model／Azure deployment／API Version／未保存 key、loopback 可留空與錯誤 response／network exception 的 connection guard。
  - 尚未以真實 Electron／瀏覽器 AX 流程重做 round5；沒有真實 API Key、錯誤 key、外部 NVIDIA／雲端 endpoint、長批次或真實字幕品質證據。Bootstrap stale rejection、connection stale rejection 與 discovery 中途使用者手動改選 provider 也沒有各自獨立的 deterministic case；目前 source guard 已存在，但這些仍是未測試風險。

## 4. 程式碼品質

- 判定：**通過**。
- 證據：
  - `public/review.js:336-339` 集中 current provider／generation predicate；profile、save、connection、discovery 均重用此 predicate 或同一 generation state，沒有另外建立互相矛盾的 transition 判斷。
  - `public/ai-provider-settings.mjs:1-63` 集中 provider profile snapshot、欄位分流、form validation 與 connection controller；`server.mjs:581-624,4077-4133` 依 provider 讀取 profile／key、保存 provider profile、清除與更新 provider-scoped runtime key。
  - 2026-11-18T10:55:53.8557440+08:00–10:55:54.6047828+08:00 執行 `git diff --check -- . ':(exclude)app'` exit 0；只看到既有 LF／CRLF warning，沒有 root whitespace error。完整工作樹仍含既有 `app/` dirty 內容，未列入本輪品質判定。
  - 本輪未發現需要以 root provider UI 程式碼品質為由阻擋的問題。

## 5. 測試覆蓋

- 判定：**有條件通過**。
- 證據：
  - `node --check public/review.js`、`node --check public/ai-provider-settings.mjs`、`node --check scripts/test-review-ui.mjs`、`node --check server.mjs` 於 2026-11-18 10:54:13.5513634+08:00–10:54:13.7129452+08:00 全部 exit 0。
  - `node scripts/test-review-ui.mjs` 於 10:54:17.4463526–10:54:17.5172951 exit 0；輸出校閱 UI 測試通過，包含 bootstrap、save、connection、discovery race cases。
  - `node scripts/test-ai-providers.mjs` 於 10:54:21.1106171–10:54:21.5108744 exit 0；輸出 provider contract 與術語／Prompt 測試通過。
  - 一般 PATH 的 `node scripts/test-core.mjs` 於 10:54:25.1936781–10:54:32.1426912 exit 1，因全域 Python 分支造成 Whisper.cpp mock 未產生 SRT；未修改程式或終止外部 process。依既有稽核方式，以排除 Python、保留 Node／系統工具的隔離 PATH 重播，於 10:55:22.3126120–10:55:26.7181266 exit 0，核心回歸測試通過。
  - 隔離 PATH 下 `npm test` 於 10:55:34.6449491–10:55:44.9549472 執行所有前置 suites、provider／UI／YouTube UI CLI／core，均通過；`posttest` 的 `scripts/test-youtube.mjs:154` 在 `fs.symlinkSync` 以 Windows `EPERM` 結束，整體 exit 1。這是環境權限限制，不判定為 FR-029 產品失敗，但不能把完整 suite 宣稱為 exit 0。
  - `npm run docs:check` 於 10:55:53.8557440–10:55:54.6047828 exit 0；同一段執行的 `npm run docs:check:final` exit 1，指出 08 缺少「獨立審查是否執行：」「發布授權：」、最新工作紀錄尚未標示「完成」且獨立審查欄位非是／否。

## 6. 實際運行結果

- 判定：**有條件通過**。
- 證據：
  - focused UI test 的 VM 會實際執行目前 `public/review.js` function source；bootstrap delayed response、save stale response／finally、connection stale response／unlock 與 discovery shared transition 均在實際執行後 assertions 通過，不只是檔案 marker 檢查。
  - provider contract test 實際建立 NVIDIA／Azure provider request，檢查 NVIDIA `/models`、`/chat/completions` Authorization、Azure deployment／API version／`api-key` header，以及不帶錯誤的 provider body；不使用真實金鑰。
  - 隔離 PATH 的 full `npm test` 已實際跑完 root 功能 suites；唯一 failure 位於 posttest YouTube symlink fixture。依本輪指示，Windows `EPERM` 只列為環境限制，應在 Developer Mode／允許 symlink 的環境重跑，不應修改產品或測試繞過。
  - 未進行真實外部 provider request、Electron／瀏覽器人工驗收、安裝後流程、簽章／公證／發布驗證；因此 focused／functional pass 不等於真實模型品質或交付完成。

## 綜合判定

- 結論：有條件通過
- 可逐字引用的完整結論句：**有條件通過。本輪未發現 FR-029 root 產品邏輯阻擋；bootstrap／save／connection／discovery 的 provider／generation guards、fail-closed 行為、provider-specific UI 與 namespace contract 均有目前 source 及 deterministic focused evidence。完整 `npm test` 的功能 suites 均通過，僅受 Windows symlink fixture 的 `EPERM` 環境限制中止；另有真實 GUI／外部 provider／部分 rejection 與手動 intent race 未測試，且 `docs:check:final` 仍未完成 08-CHANGE-LOG closeout。完成治理 closeout 並在允許 symlink 的環境取得完整 exit 0 回歸證據後，才可宣稱本輪整體結案。**
- 阻擋問題（若有）：無 root FR-029 產品邏輯阻擋；closeout 條件為 Windows symlink 權限環境證據與 `08-CHANGE-LOG.md` 治理欄位／完成狀態。
- 剩餘風險：真實 provider／API key／模型品質、Electron／瀏覽器人工流程、bootstrap／connection stale rejection 的獨立案例、discovery 與手動改選的實機 intent precedence、Developer Mode 下完整 npm exit 0、安裝／簽章／公證／發布均未驗證。
- 給主要開發代理的具體修正要求：補齊 08-CHANGE-LOG 的獨立審查欄位、發布授權／不發布範圍與「完成」狀態，重跑 `npm run docs:check:final`；在允許 symlink 的 Windows 環境重跑 `npm test` 取得完整 exit 0，保留本次 `EPERM` 證據，不修改產品或測試繞過。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
