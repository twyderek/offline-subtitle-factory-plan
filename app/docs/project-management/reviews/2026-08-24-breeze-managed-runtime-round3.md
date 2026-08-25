# 獨立複審報告：Windows Breeze Managed Runtime FR-025 round3

- 審查對象：目前 workspace 的 2026-08-24 FR-025 工作樹，以及 round2 後的 activation transaction rollback／state snapshot、manager remove busy serialization、platform／arch fail-closed、PowerShell 5.1 相容性與新增 edge assertions。
- 審查輪次：round3；未覆寫 `2026-08-24-breeze-managed-runtime-round1.md` 或 `2026-08-24-breeze-managed-runtime-round2.md`。
- 審查時間：2026-08-24 10:26（Asia/Taipei）；本輪以獨立複審上下文重新讀取 `app/AGENTS.md`、development preflight 路由、目前程式／測試／治理文件與 round2 報告，並重新執行驗證，不將 round2 的通過敘述當作本輪證據。
- 審查範圍：`lib/breeze-runtime-manager.mjs`、`lib/archive-utils.mjs`、`lib/breeze-runtime-probe.mjs`、`server.mjs`、`public/app.js`、`public/index.html`、`scripts/test-breeze-runtime-manager.mjs`、`scripts/test-breeze-asr.mjs`、`scripts/test-core.mjs`、`scripts/build-breeze-runtime-windows.ps1`、`.github/workflows/build-breeze-runtime-windows.yml`、runtime manifest 與 FR-025 治理文件。
- 工作樹基線：`git status --short` 顯示原有大量 modified／untracked 內容；本輪除建立本報告外未修改其他專案檔案。

## 1. 需求完整性

- 判定：部分通過
- 證據：
  - `lib/breeze-runtime-manager.mjs:204-208` 已在 download entry point 先拒絕非 `win32`／`x64`，`installBreezeRuntime()` 亦在 `:282-284` fail-closed；實際以 `node --input-type=module -e ...` 重放 `darwin/x64` 與 `win32/arm64`，兩者均回 `RUNTIME_PLATFORM_UNSUPPORTED`，且 `fetch` 呼叫次數為 0。
  - `runtime-manifests/breeze-asr-25-win-x64-cpu.json:1-29` 嚴格限定 Windows x64 CPU、Python 3.11、`python.exe`／`whisper` probe；`releaseStatus` 為 `not-published`、`download.available` 為 `false`、URL／size／uncompressedSize／SHA-256 與 `patchedWhisperRevision` 均為 null，沒有虛構可下載資產。
  - `scripts/test-breeze-runtime-manager.mjs:167-171` 實測 activation 中 signal abort 後必須拒絕並恢復舊 state／舊 runtime；`:202-218` 實測 manager 安裝進行中 remove 回 `RUNTIME_BUSY`，取消後不留下半成品；`:220-250` 覆蓋 Zip Slip、symlink、corrupt ZIP、disk-space、redirect、timeout、download cancellation 與 HTTP failure。
  - `scripts/build-breeze-runtime-windows.ps1:1-14,27-35,58-85,110-123` 已具備 `OutputDirectory`、Python 3.11、CPU Torch、staged probe、固定 revision、SHA／size metadata 與 license approval gate；`.github/workflows/build-breeze-runtime-windows.yml:28-92` 為手動 Windows workflow，並在 upload candidate 前重跑 CPU／Breeze probe。
  - 但 FR-025 的一般使用者一鍵交付仍未完成：本機遞迴掃描只找到 source manifest，沒有 `breeze-runtime*.zip` 或 `release-metadata.json`；GitHub `gh run list --workflow build-breeze-runtime-windows.yml --limit 5` 在 `twyderek/offline-subtitle-factory-plan` 回報 HTTP 404，`gh release list` 也沒有 Breeze runtime asset。沒有真實 ZIP、固定 patched revision、逐項 license evidence、Windows runner／Release asset 或 clean-machine acceptance，故不能判定完整需求已交付。

## 2. 邏輯正確性

- 判定：有條件通過
- 證據：
  - activation transaction 位於 `lib/breeze-runtime-manager.mjs:307-327`：先保存既有 state、將舊 runtime 移至 `.previous`、置換新 runtime；`:317` 與 `:319` 都檢查 AbortSignal，失敗時 `:321-326` 移除新 target、恢復舊 target 與舊 state。`node scripts/test-breeze-runtime-manager.mjs` exit 0，且其中 `writeState` 內 abort 的實例確實通過 `RUNTIME_CANCELLED` 與舊 runtime／state assertion。
  - `createBreezeRuntimeManager()` 的 lifecycle 位於 `lib/breeze-runtime-manager.mjs:354-377`；`:375` 在 active promise 尚未 settle 時拒絕 remove。新增 manager regression `scripts/test-breeze-runtime-manager.mjs:202-218` exit 0，證明取消／remove 的主要並發路徑不會在 worker 結束前刪除或宣告完成。
  - `server.mjs:1315-1323` 的 cancel handler 只設定 `cancelRequested` 並呼叫 manager cancel；`:1305-1310` 僅在 manager promise settle 後轉為 `cancelled`／`failed`；`:3873-3882` 的 DELETE API 在仍處理中回 202。UI `public/app.js:785-810` 以 POST／DELETE 呼叫同一 endpoint，分別顯示下載中、取消中與已取消訊息。
  - `lib/breeze-runtime-probe.mjs:58-90` 已將 AbortSignal 接到 probe child cleanup；`node scripts/test-breeze-asr.mjs` exit 0，包含 `:123-128` 的 probe AbortSignal cancellation assertion。
  - 條件仍存在：API/UI 的 managed runtime cancel 沒有成功安裝／真正下載中的 server integration test；`scripts/test-core.mjs:499-508` 只測既有 external runtime、unavailable manifest、recheck 與 health，沒有 managed download／activation cancel／remove race。現有邏輯可由 source 與 manager fixture 支持，但不能擴張成 Windows 實機 lifecycle 已證明。

## 3. 邊界情況

- 判定：部分通過
- 證據：
  - `scripts/test-breeze-runtime-manager.mjs:138-142` 實測 size／SHA mismatch 後 archive 被清除；`:157-166` 實測 probe／state write failure 保留舊 runtime；`:173-178` 實測 malformed state 回 `invalid`；`:220-234` 實測 absolute／parent traversal、symlink 與 corrupt ZIP；`:242-250` 實測 disk full、HTTP redirect／不安全 URL、timeout、download cancel 與 `.part` cleanup。
  - `npm run check` exit 0；其內含 `npm test`、Breeze manager／ASR／core tests，輸出為「Breeze managed runtime manager、下載／驗證／安全解壓／原子安裝測試通過」及核心回歸通過。
  - round3 直接重放 platform／arch fail-closed，`darwin/x64` 與 `win32/arm64` 都沒有觸發 fetch；PowerShell 5.1／pwsh parse 與 gate 亦分別通過 parse、在未 `-LicenseReviewApproved` 時 fail-closed。
  - 尚未覆蓋：Windows 真實 file handle／防毒干預、junction／reparse point 的實機變體、API 層成功安裝／取消／移除的 race、真實 ZIP 的壓縮比／磁碟壓力、真實 Python／Torch／patched Whisper probe、下載中斷後跨重啟恢復，以及 clean-machine 安裝後 ASR end-to-end。

## 4. 程式碼品質

- 判定：部分通過
- 證據：
  - manager、archive parser、probe、server API 分層，並可注入 filesystem root、fetch、extractor、probe、state writer；`lib/breeze-runtime-manager.mjs:147-170` 對 hash／size verification 失敗會清除 archive，`lib/archive-utils.mjs` 對 archive entry path、symlink、root containment 與 expansion limits 有明確拒絕邏輯。
  - discovery priority 由 `lib/breeze-runtime-probe.mjs:23-55` 實作：developer `BREEZE_ASR_PYTHON` → active managed Windows x64 runtime → legacy venv → bundled／system；`scripts/test-breeze-runtime-manager.mjs:116-130` 對 managed／developer／legacy priority 通過。
  - `scripts/build-breeze-runtime-windows.ps1:1-35` 的錯誤文字為 ASCII，`OutputDirectory` 為明確參數且在 `:38-44` 形成所有 build 產物路徑，避免 round2 的 PowerShell 5.1 parser failure；Windows PowerShell 5.1 與 pwsh AST parse 均 exit 0。
  - 仍不能把 source skeleton 當成可發布 runtime：workflow 是 `workflow_dispatch` candidate flow，license gate 是輸入條件而非已完成的 license evidence；沒有實際 build 產物與 Windows runner log，runtime packaging 的 relocatability、第三方 notice 完整性與安裝後行為仍未被真實環境證明。

## 5. 測試覆蓋

- 判定：不通過
- 證據：
  - 2026-08-24 10:26（Asia/Taipei）重新執行 `node scripts/test-breeze-runtime-manager.mjs`、`node scripts/test-breeze-asr.mjs`、`node scripts/test-core.mjs`，三者均 exit 0；重新執行 `npm run check` 亦 exit 0，包含 `docs:check`、JavaScript syntax checks 與完整 `npm test`。
  - focused manager test 現在確實包含 round3 指定的 disk-space、timeout、redirect、symlink、corrupt ZIP、activation cancellation 與 manager remove regression，並透過 `:167-171`、`:216-218`、`:225-250` 可回溯；`test-breeze-asr.mjs:123-128` 覆蓋 probe AbortSignal。
  - 但 focused repository tests 沒有 platform／arch 的 `assert.rejects`，該項只由本輪一次性 `node -e` 重放；也沒有 managed API success／cancel／remove integration、renderer click／poll／cancel smoke 或 Windows real runtime test。`test-core.mjs:499-508` 的 managed API 覆蓋仍限於 unavailable／recheck／health。
  - focused test 與治理文件仍不完全一致：`docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:157-163` 仍標題為「round1 結果」、只列 round1 報告，並錯誤寫著「round2 複審尚未完成」；它沒有登錄 round2／round3 的實際結果，也沒有把現有 timeout／redirect／symlink／corrupt ZIP／activation regression 與 API/UI 缺口更新為當前證據。
  - `npm run docs:check:final` 實際 exit 1，輸出為最新 `08-CHANGE-LOG.md` 尚未標示「完成」，且已執行獨立審查但缺少可解析審查檔案與逐字引用；這是本輪只允許建立 round3 report、未修改治理來源文件的直接結果。

## 6. 實際運行結果

- 判定：不通過
- 證據：
  - Windows PowerShell 5.1：`powershell.exe -NoProfile -Command ... Parser.ParseFile(...)` 輸出 `Windows PowerShell 5.1 parse OK`、exit 0；以 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\\build-breeze-runtime-windows.ps1 -PatchedWhisperRevision 000...` 實跑，exit 1 且在 build／download 前輸出 license review gate。這證明 round2 的 ParserError 已解除，並且未授權時不會假造 Release asset。
  - pwsh 7：AST parse 輸出 `PowerShell 7 parse OK`、exit 0；同一 script 未帶 `-LicenseReviewApproved` 時 exit 1，輸出 `Complete the Breeze, patched Whisper, PyTorch, Python, and dependency license review...`。只證明 parse／gate，不是成功建置。
  - `git diff --check -- app` exit 0，只有既有 LF→CRLF warnings；`npm run check`、三個 focused tests、platform／arch direct replay 均成功。
  - 本機 artifact scan 只找到 `runtime-manifests/breeze-asr-25-win-x64-cpu.json`（663 bytes），沒有 `breeze-runtime*.zip` 或 `release-metadata.json`；manifest 的 `download.available=false` 與 `source.patchedWhisperRevision=null` 仍是 fail-closed 狀態。
  - 尚未執行成功的真實 Python 3.11／PyTorch CPU／patched Whisper build、Windows runner、Release asset upload／反向下載核對、license evidence review、Windows 10／11 clean-machine install／cancel／remove／ASR acceptance；因此不能將目前結果描述為「Windows Breeze ASR 25 一鍵安裝已完成」。

## 綜合判定

- 結論：不通過
- 完整單句結論：**本輪 Windows Breeze Managed Runtime FR-025 round3 獨立複審結論為不通過：activation 後 AbortSignal rollback、state snapshot、manager remove busy serialization、platform／arch fail-closed、PowerShell 5.1／pwsh parse-gate，以及 disk-space／timeout／redirect／symlink／corrupt ZIP／probe cancellation 的 deterministic coverage 已通過重放，且 `npm run check` exit 0，但 managed API／UI cancel 尚無成功安裝整合測試、治理文件仍停留在 round1 並錯誤標示 round2 未完成，最重要的是沒有真實 runtime ZIP、固定 patched Whisper revision、逐項 license evidence、Windows runner／Release asset 或 clean-machine acceptance，因此 FR-025 的 Windows Breeze ASR 25 一鍵安裝仍不可宣稱完成。**
- 阻擋問題：
  1. 目前只能證明 Phase 1 source／fixture foundation；沒有可供一般使用者下載的 runtime package，manifest 必須繼續 `available:false`。
  2. `06-TEST-AND-PROCESS-AUDIT.md` 與最新 `08-CHANGE-LOG.md` 沒有登錄 round2／round3 的現況；`docs:check:final` 因此失敗。
  3. API／UI cancel、managed successful install、remove race 與 renderer poll 尚未有 repository integration／renderer smoke coverage。
  4. 真實 build、CPU-only staged runtime、patched revision、license／notice evidence、Windows runner／Release 與 clean-machine acceptance 全部仍缺。
- 剩餘風險：Windows 真實 file lock／防毒、runtime relocatability、下載重啟恢復、長音訊／音訊品質、真實模型與 patched runtime 行為均未被本輪 deterministic tests 覆蓋。
- 給主要開發代理的具體修正要求：先以真實 Windows runner 建立並保存固定 revision／CPU probe／ZIP size／SHA／license evidence，完成 Release asset 與 clean-machine acceptance；補上 managed API／UI cancel integration／renderer smoke 與 platform／arch repository assertions；同步更新 `06-TEST-AND-PROCESS-AUDIT.md`、`08-CHANGE-LOG.md`、`00-CURRENT-STATUS.md`，再執行 `npm run docs:check:final` 並要求下一輪獨立複審。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- round1／round2 報告未覆寫；本輪 focused tests 使用的 temporary fixture 由測試自行建立並在 `finally` 清理，未建立其他專案檔案。
- 若上述聲明不實，本報告無效。
