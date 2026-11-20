# 獨立審查報告：FR-029 AI provider 設定介面優化與回歸測試

- 審查對象 commit／版本：`9ce9c8ffeaffaed8ac4fc16f160c00dd157115a8`／root `0.52.0`；FR-029 相關修改尚未提交，工作樹為 dirty
- 對應 08-CHANGE-LOG 條目：`2026-11-18 — AI provider 設定介面優化與回歸測試`
- 審查輪次：round1
- 審查時間：2026-11-18 10:19–10:23（Asia/Taipei）；Node `v24.13.0`
- 審查代理啟動時間、上下文來源：本報告以目前工作樹、指定治理文件、實際原始碼、獨立重跑的測試輸出及本機 UI 操作為判定來源，未沿用主要開發代理的評價性結論。
- 審查範圍：`FR-029`、`FR-028` UI 相容性、`NFR-001`、`NFR-002`、`NFR-007`。`app/` 子目錄已有大量既有修改與 53 個未追蹤檔案；本審查未修改、未回復，也未將其視為本輪產品差異。

## 審查摘要

本輪結論：**不通過**。

成功路徑的欄位分流、Azure 專用欄位、Ollama／LM Studio 本機金鑰欄位、NVIDIA NIM 預設 URL、可存取性語意，以及 focused provider／UI／core 驗證均有證據；但 provider 切換的非同步 profile 載入沒有鎖住儲存，也沒有在請求失敗時立即清除舊輸入。使用者可在 profile fetch 尚未完成或失敗時按儲存，使舊 API Key 被收集到目前 provider，違反 FR-029 的 provider namespace 邊界並形成 NFR-002 安全風險。

另有兩個結案阻擋：完整隔離 PATH `npm test` 仍在既有 Windows symlink fixture 以 `EPERM` 結束；最新 `08-CHANGE-LOG.md` 尚未補齊獨立審查／發布授權欄位且仍為進行中，`npm run docs:check:final` 因此失敗。

## 1. 需求完整性

- 判定：部分通過
- 證據：
  - `docs/project-management/02-REQUIREMENTS-ANALYSIS.md:44` 明確要求 provider-specific 欄位、Azure-only Deployment／API Version、本機 API Key、切換時預設 Base URL／清除殘值，以及保存／清除／連線測試的 provider namespace；`docs/project-management/02-REQUIREMENTS-ANALYSIS.md:62-68` 定義 NFR-001、NFR-002、NFR-007。
  - `public/review.html:201-205` 已宣告 Azure、雲端 key 與本機 key 欄位；`public/styles.css:84` 隱藏不適用欄位；`public/ai-provider-settings.mjs:29-31` 解析 provider 白名單。
  - `public/review.js:255-285,288-318` 已將目前 provider 映射到欄位可見性、`aria-hidden`、disabled 狀態、loopback 隱私提示與金鑰輸入；`public/review.js:333-374,382-392,550-563` 的保存、清除與連線測試均以目前 provider 選擇 key input／namespace。
  - 但 `public/review.js:444-482` 只在 profile fetch 成功後呼叫 `setAiApiKeyFields()`；切換事件本身只在 `:450` 套用可見性，沒有同步清除舊 key／Azure 值，也沒有阻止 `:352-374` 的儲存流程。故「切換時清除不適用欄位」及 NFR-002 只在成功、快速回應路徑成立。

## 2. 邏輯正確性

- 判定：不通過
- 證據：
  - 主要邏輯正確部分：`public/review.js:299-318` 以 provider 決定 key input，並以 `providerFieldIsVisible()` 控制欄位；`server.mjs:581-625,4086-4129` 以 provider ID 讀寫金鑰、profile 與 runtime key，且一般設定回應不含 API Key。
  - 阻擋問題（P1）：`loadAiProviderProfile()` 在 `public/review.js:444-482` 是非同步函式。使用者從 OpenAI-compatible 輸入尚未保存的 key 後切換到 NVIDIA；在 `/api/ai/profile?provider=nvidia` 回應前，`aiApiKey` 仍保留舊值，而 `saveAiSettings()` (`:352-374`) 沒有等待或檢查 provider profile 載入狀態。此時按儲存，`collectAiSettings()` (`:333-349`) 會以目前 `provider=nvidia` 收集舊 key，並由 server `:4101-4104` 保存到 NVIDIA namespace。若 profile 請求非 2xx，`:453` 直接 return，舊值甚至不會被清除。
  - 同一問題也可在 Azure → Ollama → 回切雲端或網路／本機 server 短暫失敗時發生：不適用的 DOM key 仍暫留，且使用者可在非同步載入完成前再次看到或提交它。這不是只限於速度問題，而是 provider-specific secret isolation 的錯誤狀態處理。
  - 具體修正要求：provider change handler 必須先同步清空兩個 API Key input 與 Azure 專用值，再開始 fetch；在 profile 載入完成前鎖住保存／連線測試，並以 generation／provider token 忽略過期回應；fetch 失敗時維持清空狀態並顯示失敗。補上跨 provider、延遲、非 2xx／network rejection 的測試。

## 3. 邊界情況

- 判定：不通過
- 證據：
  - 已實測 deterministic 邊界：`scripts/test-review-ui.mjs:99-106` 覆蓋 NVIDIA 顯示雲端 key、Ollama 不顯示雲端 key、LM Studio 顯示本機 key、非 Azure 不顯示 Azure 欄位；`:112-141` 另覆蓋未保存 profile／API Key、loopback 與連線測試 guard。
  - 已實測本機 UI（CUA／DOM，約 2026-11-18 10:19，隔離 server `http://127.0.0.1:8791/review/round1-ui-check`）：Azure 顯示 Deployment／API Version；NVIDIA 顯示 `https://integrate.api.nvidia.com/v1`、雲端 API Key 且隱藏本機 key；Ollama 顯示「本機 API Key（可留空）」、`http://127.0.0.1:11434/v1`、批次 8、同意 checkbox disabled；填入合成 Azure 值後切到 NVIDIA，DOM 讀值確認 Deployment、API Version 與兩組 key 均為空。
  - 未覆蓋且實際存在缺陷的邊界：profile fetch 延遲、非 2xx、network rejection、連續快速切換，以及切換後立即按儲存／測試。這些情境正是上節 P1 的觸發條件。未輸入或保存真實 API Key。

## 4. 程式碼品質

- 判定：部分通過
- 證據：
  - 可維護部分：欄位白名單集中於 `public/ai-provider-settings.mjs:29-31`；UI 以 HTML `data-providers` 加共用 `applyAiProviderFieldVisibility()` (`public/review.js:312-318`) 重用，不另建 NVIDIA 專用 transport；scoped `git diff --check` 於 2026-11-18T10:21:00.9306500+08:00–10:21:00.9734786+08:00 exit 0。
  - 品質問題：profile fetch、欄位重設、可見性與保存互動沒有共同的 pending／generation 狀態，導致 UI 顯示層與秘密收集／保存層可在不同 provider 狀態下同時運作。`loadAiProviderProfile()` 內 `applyAiProviderFieldVisibility()` 在 `:450` 與 `:479` 重複呼叫，雖非主要阻擋，但修正時應將 provider transition 收斂成單一可驗證流程。
  - 完整工作樹的 `git diff --check` 於 2026-11-18T10:21:32.8013429+08:00–10:21:32.8981549+08:00 exit 2，命中既有 `app/package.json`、`app/scripts/test-core.mjs`、`app/server-runtime.mjs` 的 trailing whitespace；不把該既有區域的問題歸責於 FR-029。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：
  - 2026-11-18T10:22:38.4709301+08:00–10:22:39.0386709+08:00：`node --check public/review.js`、`node --check public/ai-provider-settings.mjs`、`node --check scripts/test-review-ui.mjs`、`node scripts/test-review-ui.mjs`、`node scripts/test-ai-providers.mjs` 全部 exit 0；輸出分別為 UI 測試通過與 provider contract 測試通過。
  - 2026-11-18T10:20:01.3994584+08:00–10:20:06.1960353+08:00：隔離 PATH `node scripts/test-core.mjs` exit 0，輸出「核心回歸測試通過」。`scripts/test-core.mjs:357-378,408-430,547-577` 覆蓋 key 不回傳、local provider、provider-specific profile／runtime key 與 clear namespace 相關契約。
  - 2026-11-18T10:20:10.6736190+08:00–10:20:22.1527038+08:00：隔離 PATH `npm test` 的前置 suites、provider／UI／core 均完成；`posttest` 在 `scripts/test-youtube.mjs:154` `fs.symlinkSync` 以 Windows `EPERM` exit 1。未繞過權限，故不能宣稱完整回歸通過。
  - `npm run docs:check` 於 2026-11-18T10:21:00.9298578+08:00–10:21:01.2959221+08:00 exit 0；`npm run docs:check:final` 於 2026-11-18T10:21:50.4472480+08:00–10:21:50.8213688+08:00 exit 1，指出最新工作紀錄缺少獨立審查／發布授權欄位、尚未標示完成。
  - 測試缺口：現有 UI suite 主要是 HTML／CSS／JS source marker 與 helper assertion，沒有真正延遲／失敗 profile fetch 後的保存競態測試；本輪人工 UI 只驗證成功回應路徑。

## 6. 實際運行結果

- 判定：部分通過
- 證據：
  - 實際啟動 root `0.52.0` server 的隔離執行個體（因 8790 已被占用，使用 8791），載入 `http://127.0.0.1:8791/review/round1-ui-check`；雖 synthetic job 不存在而顯示「找不到任務」，AI 設定 modal 可正常載入並可操作。server log 顯示取得 `/api/ai/settings` 與多次 `/api/ai/profile`，未呼叫外部 provider endpoint、未輸入／保存 API Key。
  - 實際 AX／DOM 狀態確認 NFR-007：可見 provider／label／checkbox／select／status 語意存在；不適用欄位 `aria-hidden=true`、`display:none` 且 controls `disabled=true`。`public/review.js:312-318` 是對應實作，UI 操作結果與 `public/review.html:201-205` 一致。
  - NVIDIA UI 相容性實測通過：NVIDIA 選項可選、Base URL 為 `https://integrate.api.nvidia.com/v1`、雲端 API Key 可見、本機 key 與 Azure 欄位隱藏；Ollama loopback 狀態與 Azure 欄位切換亦通過。
  - 未執行：真實 NVIDIA／雲端請求、真實 key／錯誤 key、完整字幕品質、安裝後人工流程、完整 `npm test` 收尾及發布驗收。現有 `docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:5-9` 的未測試揭露與本輪實測一致，但不能取代上述未完成驗證。

## Findings

### F-001 — P1：provider 切換非同步競態可能跨 namespace 保存舊 API Key

- 檔案／行號：`public/review.js:333-374,382-392,444-482`。
- 證據：provider change handler 啟動非同步 profile fetch；key input 清除只在成功回應後執行；保存流程可同時執行且沒有 pending／generation guard。具體情境是輸入舊 provider 的 key、切換 provider、在 fetch 完成前按「儲存」，新 provider 會收到舊 key；非 2xx 路徑在 `:453` 直接 return，舊值不清除。
- 修正要求：切換開始即清空 secrets 與不適用欄位；鎖定保存／連線測試至目前 provider profile 載入完成；處理失敗時 fail-closed；加入 delayed／rejected／rapid-switch deterministic regression。
- 若不修正：使用者的 provider key 可能被保存到錯誤 provider namespace，並可能送至錯誤的外部端點，違反 FR-029／NFR-002。

### F-002 — P1：完整回歸仍被 Windows symlink 權限阻塞

- 檔案／行號：`scripts/test-youtube.mjs:154`。
- 證據：2026-11-18T10:20:10.6736190+08:00–10:20:22.1527038+08:00 的隔離 PATH `npm test` 在 `fs.symlinkSync` 以 `EPERM` 結束；provider／UI／core 前置 suites 已通過，但沒有完整回歸成功證據。
- 修正要求：在具備 Windows Developer Mode／symlink 權限的環境重跑完整 `npm test`，或在結案紀錄中明確保留環境阻塞，不得把 focused pass 寫成完整回歸 pass。
- 若不修正：NFR-006 的完整回歸關卡仍未滿足，其他未執行 suite 的回歸不能排除。

### F-003 — P1：工作紀錄與 final closeout 尚未完成

- 檔案／行號：`docs/project-management/08-CHANGE-LOG.md:3-18`。
- 證據：最新條目仍為「進行中」；2026-11-18T10:21:50.4472480+08:00–10:21:50.8213688+08:00 的 `npm run docs:check:final` exit 1，明確指出缺少「獨立審查是否執行：」「發布授權：」、尚未標示「完成」。本報告建立前這是預期的 closeout blocker；本審查代理不修改該檔案。
- 修正要求：主要開發代理依本報告結論更新 08 條目，補正實際驗證、獨立報告連結與逐字引用，並在不宣稱未完成測試的前提下重跑 final gate。
- 若不修正：治理流程無法將本輪判定、未完成回歸與非發布範圍清楚結案。

## 明確狀態分類

- 已通過：FR-029 成功路徑欄位分流；Azure-only 欄位；Ollama／LM Studio 本機 key UI；NVIDIA option／預設 URL／雲端 key UI；NFR-007 的可見 DOM／AX 語意；focused syntax／UI／provider／隔離 PATH core；`npm run docs:check`；本輪 scoped `git diff --check`。
- 不通過／阻擋：provider transition 的舊 key 清除與保存競態；完整 `npm test` 的 Windows symlink `EPERM`；`08-CHANGE-LOG.md` closeout 與 `docs:check:final`。
- 未測試／剩餘風險：profile fetch 延遲／失敗／快速切換、真實或錯誤 API Key、外部 NVIDIA／雲端請求、各 provider 真實字幕品質、完整安裝後人工流程、發布／簽章／公證。

## 綜合判定

- 結論：不通過
- 可逐字引用的完整結論句：**不通過。FR-029／NFR-002 的 provider 切換非同步競態仍可能把舊 API Key 收集並保存到目前 provider；在同步清除、pending guard、失敗 fail-closed 與對應回歸測試完成前，不得結案或宣稱本輪 provider UI 安全與 namespace 分流已完成。**
- 阻擋問題（若有）：F-001 的 provider key cross-namespace race；F-002 的完整回歸環境阻塞；F-003 的治理 closeout 未完成。
- 剩餘風險：本輪未使用真實 key／外部端點；NVIDIA 字幕品質、錯誤 key／網路錯誤／長批次取消、LM Studio 實機、安裝後人工流程與發布均未驗收。即使 F-001 修正，這些仍不得從 focused UI pass 推論為已通過。
- 給主要開發代理的具體修正要求（若有）：先修正 F-001 並補 delayed／rejected／rapid-switch／save-race 測試；再以具 symlink 權限的 Windows 環境重跑完整 `npm test`，或維持明確環境阻塞；更新 `08-CHANGE-LOG.md` 的實際狀態、審查連結／逐字引用與必要欄位；最後重跑受影響 focused suites、`npm run docs:check:final`，並以 round2 重新審查。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證；未修改任何其他專案檔案、程式碼、測試、治理來源文件、既有審查報告或使用者既有 `app/` 變更。
- 本輪啟動並停止一個本機 root server 供 UI 驗證；未輸入、讀取、保存或輸出任何真實 API Key，未呼叫外部 provider endpoint。
- 若上述聲明不實，本報告無效。
