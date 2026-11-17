# 獨立審查報告：FR-028 NVIDIA NIM provider 整合

- 審查對象 commit／版本：`e8227f28e263ce6ad2d620de13e9ab1b21ff974e`／root `0.52.0`；工作樹為 dirty
- 對應 08-CHANGE-LOG 條目：`2026-11-17 — NVIDIA NIM provider 整合、驗證與 Windows unsigned build`
- 審查輪次：round1
- 審查代理啟動時間、上下文來源：2026-11-17（Asia/Taipei）；本報告以目前工作樹、指定治理文件、目前測試輸出、live evidence 與現有 `dist` 產物為唯一判定來源，未沿用主要開發代理的評價性結論。
- 審查限制：`app/` 子目錄已有大量使用者變更；本審查未修改、未要求回復，也未將其納入 FR-028 產品差異。

## 審查摘要

本輪結論：**有條件通過**。

FR-028 的 NVIDIA NIM registry、預設端點、OpenAI-compatible `/models`／`/chat/completions`、設定頁選項、provider-ID 金鑰隔離路徑、focused contract tests、live evidence、unsigned package 與 packaged renderer smoke 均有可回溯證據；未發現 P0／P1 的 provider 程式碼邏輯阻擋。

條件為：完整 `npm test` 仍因 Windows `fs.symlinkSync` EPERM 阻塞；目前最新 `08-CHANGE-LOG.md` 尚為「進行中／待執行」，`npm run docs:check:final` 尚未通過；NVIDIA 錯誤金鑰、斷網、長批次取消、32 個模型逐一品質及完整安裝後人工流程仍未驗證。因此不得把本輪判定擴大為完整回歸、字幕品質、Windows 安裝後驗收或公開發布通過。

## 綜合判定

- 結論：有條件通過
- 可逐字引用的完整結論句：**有條件通過。在 FR-028「provider integration development verification」範圍內，現有實作與可取得證據相互一致，沒有需要立即阻擋 NVIDIA provider 的 P0／P1 runtime code defect；可維持本地開發／測試候選狀態。**
- 阻擋問題（若有）：完整 `npm test` 仍受 Windows `fs.symlinkSync` `EPERM` 阻塞；NVIDIA 負向／跨模型品質、完整安裝後人工流程、正式簽章／公證與公開 Release 不在已通過證據內。

## 1. 需求完整性

- 判定：部分通過
- 證據：需求與設計文件列出 provider registry、預設 endpoint、OpenAI-compatible `/models`／`/chat/completions`、模型載入、連線測試、優化與 provider-ID 金鑰隔離；目前程式、live evidence 與治理文件均對應這些開發整合項目，但未完成外部品質／安裝驗收。
- 已通過：
  - `docs/project-management/02-REQUIREMENTS-ANALYSIS.md:43` 要求 NVIDIA NIM 選項、預設 `https://integrate.api.nvidia.com/v1`、OpenAI-compatible `/models`／`/chat/completions`、模型載入、連線測試、字幕優化及 provider-ID 金鑰隔離。
  - `docs/project-management/03-FUNCTIONAL-DESIGN.md:3-7` 明確要求不強制 `response_format`，仍沿用 JSON cues parser／repair，且不把模型列表或 deterministic contract 當品質驗收。
  - `lib/ai/providers.mjs:5-28,151-155` 已註冊 `nvidia` capability、預設 URL 與共用 OpenAI-compatible adapter。
  - `public/review.html:198`、`public/review.js:74,428-453` 已提供 NVIDIA NIM 選項、合法 provider ID 與預設 URL。
  - `server.mjs:523-625,4077-4173` 的共用設定、profile、runtime-key、模型清單、連線測試及 optimizer 路徑會接受 `nvidia`，並按 provider 讀取金鑰。
  - `docs/project-management/evidence/2026-11-17-fr-028-nvidia-live.json:11-27` 記錄 `provider=nvidia`、指定 Base URL、模型可用、32 筆模型及單一 cue JSON contract pass。
- 未完成／不在本輪可宣稱範圍：`02-REQUIREMENTS-ANALYSIS.md:43` 本身也明確指出模型清單成功不等同品質或跨模型 JSON 驗收；`06-TEST-AND-PROCESS-AUDIT.md:11` 列出的錯誤 key、斷網、長批次取消、跨 32 模型能力、人工品質、安裝後人工流程與公開 Release 均未測試。

## 2. 邏輯正確性

- 判定：通過
- 證據：provider registry、shared adapter、server settings/profile 路徑、provider contract tests 與 packaged renderer provider-ID assertion 均對 NVIDIA 使用同一套已驗證的 endpoint、Bearer 與 request-cleaning 路徑；未觀察到 NVIDIA 專屬 endpoint 拼接或 key 回傳錯誤。
- 證據：
  - `lib/ai/providers.mjs:151-155` 將 `test`／`listModels`／`optimize` 分別接到既有 OpenAI-compatible transport；`lib/ai/providers.mjs:181-189` 由 provider ID 建立 adapter。
  - `lib/ai/openai-compatible.mjs:69-147` 提供非 loopback API key gate、Bearer header、manual redirect、錯誤分類及 internal chat fields 清理；NVIDIA 使用 `createChatCompletion`，不會把 `operation`、`output_language`、cue count／IDs 送至外部 API。
  - `server.mjs:548-574` 對 `nvidia` 套用 provider default URL；`server.mjs:581-625` 以 `providers[nvidia]`／runtime provider namespace 讀取金鑰；`server.mjs:4086-4104` 保存 profile 並回傳去金鑰設定；`server.mjs:4110-4129` 驗證 provider-specific key 操作。
  - `scripts/test-ai-providers.mjs:105-127` 實際斷言 NVIDIA `/models`、Bearer key、`/chat/completions`、model 與 internal fields 清理。
  - `scripts/test-core.mjs:547-565` 實際保存 NVIDIA 設定、確認 provider 不回退、回應不含 key，並確認 NVIDIA profile 與 key 狀態可讀。
  - `scripts/verify-electron-renderer.mjs:238-261,367-371` 在 packaged renderer 內從 `/api/ai/settings` 讀取 provider IDs，且明確要求包含 `nvidia`。
- 未觀察到的邏輯問題：未發現 NVIDIA 專屬 endpoint 拼接、Bearer header、provider fallback 或一般設定回傳 API Key 的錯誤。

## 3. 邊界情況

- 判定：部分通過
- 證據：focused tests 與 live evidence 覆蓋 default URL、`/models`、Bearer header、單 cue JSON response、profile key isolation；錯誤 key、斷網、timeout、取消、長批次、跨 32 模型品質與 clear-key 尚未逐項驗證。
- 已實測：
  - provider default URL、NVIDIA `/models`、指定模型可用、Bearer header、chat request internal fields 清理：`scripts/test-ai-providers.mjs:105-127`。
  - provider list、UI option、UI default URL、合法 provider marker：`scripts/test-review-ui.mjs:54-70`。
  - provider key 不進一般設定／回應，NVIDIA profile 可保存：`scripts/test-core.mjs:357-381,547-565`。
  - live single-cue response contract：`docs/project-management/evidence/2026-11-17-fr-028-nvidia-live.json:17-27`；本次另以 JSON parse／欄位／key-shaped 字串檢查確認 evidence 可讀且未含 `apiKey`／`secret` 字串。
- 未測試：
  - NVIDIA 錯誤或過期 key、HTTP 401／429／5xx、網路中斷、timeout、redirect、取消及長批次。
  - NVIDIA `/models` 缺少 `data`、模型清單空值或 response shape 異常。
  - 32 個模型逐一 JSON cues 能力、實際字幕品質、跨模型 rate-limit／計費行為。
  - NVIDIA 專屬 clear-key 回歸；現有 core suite 測試了 Groq clear 與 Gemini 隔離，但未對 NVIDIA 再做同一 clear-key assertion。
- 建議：若要把 FR-028 從開發整合提升為外部 provider acceptance，新增 NVIDIA-specific negative／cancel／clear-key cases，並以受控 key 重播跨模型或明確保留上述未測試聲明。

## 4. 程式碼品質

- 判定：通過
- 證據：FR-028 使用既有 registry／shared adapter／shared settings contract；scoped `git diff --check` 通過，且 packaged source markers 與 runtime manifest hash 核對一致。`app/` 既有使用者變更未納入或修改。
- 證據：
  - 變更採既有 registry／shared adapter／shared settings contract，沒有複製另一套 NVIDIA HTTP transport；FR-028 相關 root 差異為小範圍 registry、UI、測試與 build-root 設定。
  - `package.json:39-40,52-63` 保留既定 unsigned build scripts，並以 `build.directories.app="."` 固定 root application root；`06-TEST-AND-PROCESS-AUDIT.md:9` 說明此設定是為避開 stale `app/` subtree，未修改 `app/`。
  - scoped `git diff --check` 對 FR-028 相關檔案 exit 0；完整工作樹 `git diff --check` 的失敗只命中既有 `app/` 使用者變更的 CRLF／trailing whitespace，未修改該區域。
  - source 與 `dist/win-unpacked/resources/app` 的 `lib/ai/providers.mjs`、`public/review.html`、`public/review.js`、`server.mjs` SHA-256 均逐檔相同；封裝後 `package.json` 為 electron-builder 移除 scripts／build metadata 的正常 packaged manifest，不作 source hash 不一致解讀。
- 未觀察到需立即修正的程式碼品質問題。`app/` 的換行／未追蹤檔案不列為本輪 finding。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：provider／UI／core focused suites、語法檢查、live evidence schema、unsigned archive tests、runtime manifest hashes 與 packaged renderer smoke 均通過；完整 `npm test` 在 YouTube symlink fixture 因 Windows `EPERM` 結束，故未宣稱完整回歸通過。
- 已通過（本輪唯讀重放，2026-11-17，Node `v24.13.0`）：
  - `node --check lib/ai/providers.mjs`：exit 0。
  - `node --check public/review.js`：exit 0。
  - `node --check scripts/test-ai-providers.mjs`、`scripts/test-review-ui.mjs`、`scripts/test-core.mjs`、`scripts/verify-electron-renderer.mjs`：均 exit 0。
  - `node scripts/test-ai-providers.mjs`：exit 0，輸出「AI provider contract 與術語／Prompt 測試通過」。
  - `node scripts/test-review-ui.mjs`：exit 0，輸出「校閱 UI 測試通過」。
  - `scripts/test-core.mjs`：在隔離 PATH（Node／System32，排除全域 Python Whisper 分支）重放 exit 0，輸出「核心回歸測試通過」。一般 PATH 首次重放曾在 `scripts/test-core.mjs:663` 因全域 Python Whisper 分支得到 `Whisper did not produce an SRT file`；隔離 PATH 後通過。這是環境分支差異，不是 NVIDIA assertion failure。
  - `node scripts/verify-electron-renderer.mjs '..\\dist\\win-unpacked\\離線字幕工廠.exe' 9295 30000`：exit 0；homepage、Electron API、safe-key UI、upload completed／cleaned SRT、AI review provider IDs（含 `nvidia`）均回傳 pass。
  - `git diff --check` 的 scoped 版本：exit 0；`package.json` JSON parse：exit 0；live evidence schema/content check：exit 0。
- 受環境阻塞：
  - 完整 `npm test`：前述 suites（含 provider、UI、core）完成後，在 `posttest -> scripts/test-youtube.mjs:154` 建立 symlink 時以 Windows `EPERM` 結束；本次未繞過權限。`06-TEST-AND-PROCESS-AUDIT.md:8` 及同一輸出均支持此結果。
  - `npm run docs:check:final`：exit 1，實際訊息為最新 `08-CHANGE-LOG.md` 尚未標示「完成」、仍有「待執行」，且缺少可解析的獨立審查檔案／逐字引用；在本報告建立前這是預期的 closeout blocker。
- 未測試／不適用：root `package.json` 沒有 `typecheck` script；未以完整 `npm run check` 宣稱通過，因其包含同一個被 symlink EPERM 阻塞的 `npm test`。

## 6. 實際運行結果

- 判定：部分通過
- 證據：live evidence 記錄 32 個 NVIDIA 模型與指定模型 JSON cue contract pass；setup／portable archive、latest metadata、runtime manifest、unsigned signature state 與 packaged renderer smoke 均有實際核對。完整安裝後人工流程及正式發布未執行。
- NVIDIA live evidence：
  - `docs/project-management/evidence/2026-11-17-fr-028-nvidia-live.json:3-27` 記錄 Windows x64、Node v24.13.0、NVIDIA endpoint、指定模型、`modelCount=32`、`modelAvailable=true` 及 `LIVE-1/one-cue/id-text-reason` JSON contract pass。
  - evidence 未記錄 API key；`scripts/probe-provider-live.mjs:14,82-116` 只保存去敏後的 provider／URL／模型／結果欄位。本審查未重新要求或讀取 NVIDIA API key。
- unsigned build／封裝靜態驗證：
  - 現有 `dist` 產物為 Setup `252,617,424` bytes、Portable `251,910,055` bytes；NanaZip `7z t` 對兩者均 exit 0、`Everything is Ok`。
  - `latest.yml` 的 Setup size 與 SHA-512 與實際 Setup bytes 重算一致；Setup／Portable `Get-AuthenticodeSignature` 均為 `NotSigned`，符合 unsigned scope。
  - `dist/win-unpacked/resources/app/package.json` 版本為 `0.52.0`；NVIDIA provider markers 存在於 packaged `providers.mjs`／`review.html`／`review.js`；runtime manifest 的 ffmpeg、ffprobe、whisper、DLL、model 五項 size／SHA-256 重算均為 true／true。
- packaged renderer smoke：2026-11-17 本審查實際啟動 `dist/win-unpacked/離線字幕工廠.exe` 並執行 verifier，exit 0；結果包含 `uploadFlow.finalStatus=completed`、`hasCleanedSrt=true`、`aiReviewAssets.saveStatus=200`、`providerIds` 含 `nvidia`。這只證明 packaged smoke，不證明 Setup 安裝後人工流程、實際 NVIDIA UI 優化品質或完整字幕工作流。
- 未測試：Setup 安裝／解除安裝後人工流程、Windows 乾淨帳號、正式簽章、macOS build、公開 Release。

## Findings

### F-001 — P1：工作紀錄與 final closeout 尚未完成（非 NVIDIA runtime 邏輯缺陷）

- 檔案／行號：`docs/project-management/08-CHANGE-LOG.md:3-21`，特別是 `:5`、`:16-18`。
- 證據：該條目仍為「進行中」、開發驗證結果為「待執行」、獨立審查結論為「待執行」；`npm run docs:check:final` 實測 exit 1，指出最新工作未完成、仍有待執行欄位、缺少可解析審查檔案與逐字引用。
- 建議：主要開發代理讀取本報告後，依治理流程更新工作紀錄的實際驗證結果、連結本報告並逐字引用本報告結論；只有在不再有「待執行」且 final gate 通過後才可宣稱本工作結案。此審查代理不修改 `08-CHANGE-LOG.md`。

### F-002 — P1：完整回歸被 Windows symlink 權限阻塞（非 NVIDIA-specific failure）

- 檔案／行號：`scripts/test-youtube.mjs:154`；治理摘要 `docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:8`。
- 證據：本輪隔離 PATH 執行 `npm test` 時，provider、UI、core 等前置 suites 完成；`posttest` 在 `fs.symlinkSync` 以 `EPERM` 結束。核心錯誤不是 NVIDIA assertion，且未繞過權限。
- 建議：在具備 Developer Mode／symlink 權限的 Windows 環境重放完整 `npm test`；在此之前維持「環境阻塞」，不得把 focused pass 擴大為完整回歸 pass。

### F-003 — P2：NVIDIA 專屬負向與品質覆蓋仍不足

- 檔案／行號：`docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:11`；需求邊界 `docs/project-management/02-REQUIREMENTS-ANALYSIS.md:43`。
- 證據：目前有單次 `/models`／單 cue JSON contract live pass，但未測錯誤 key、網路中斷、長批次取消、32 模型逐一 JSON 能力或人工字幕品質；這些項目已被目前稽核文件列為未測試。
- 嚴重度說明：這是外部 acceptance／coverage gap，不是已觀察到的 provider 邏輯錯誤；FR-028 本身明確禁止把模型列表成功當成品質驗收。
- 建議：若產品要宣稱 provider acceptance，補上 NVIDIA-specific negative／cancel／clear-key 及受控跨模型測試；若維持本輪開發範圍，保留目前未測試揭露。

## 明確狀態分類

- 已通過：FR-028 registry／UI／server contract；provider／UI／core focused tests；隔離 PATH core；指定檔案語法；live evidence schema；Setup／Portable archive test；latest.yml SHA-512；runtime manifest 五項 hash；unsigned `NotSigned` 狀態；packaged source markers；packaged renderer smoke。
- 受環境阻塞：完整 `npm test` 的 YouTube symlink fixture；`docs:check:final` 的工作紀錄／審查 closeout gate；完整工作樹 `git diff --check` 亦被既有 `app/` 使用者 CRLF／trailing whitespace 變更命中，但 scoped FR-028 diff check 通過。
- 未測試：NVIDIA 負向網路／key／timeout／取消、長批次、跨模型品質、Windows 安裝後人工流程、macOS build、正式簽章、公證、公開 Release。

## 結論

**有條件通過。** 在 FR-028「provider integration development verification」範圍內，現有實作與可取得證據相互一致，沒有需要立即阻擋 NVIDIA provider 的 P0／P1 runtime code defect；可維持本地開發／測試候選狀態。

本結論的解除條件是：完成 `08-CHANGE-LOG.md` closeout 與 `npm run docs:check:final`，並在可用 symlink 權限的 Windows 環境重放完整 `npm test`，或持續明確保留該環境阻塞。未完成 NVIDIA 負向／跨模型品質、安裝後人工流程、正式簽章／公證與公開 Release 前，不得宣稱 FR-028 的完整外部驗收或可發布。

## 審查代理聲明

本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。未修改、未要求回復 `app/` 既有使用者變更，也未讀取或保存 NVIDIA API Key。若上述聲明不實，本報告無效。
