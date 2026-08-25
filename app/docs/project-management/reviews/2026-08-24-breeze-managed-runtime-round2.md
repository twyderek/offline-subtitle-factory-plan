# 獨立複審報告：Windows Breeze Managed Runtime FR-025 round2

- 審查對象：目前 workspace 的 2026-08-24 FR-025 工作樹修正，並讀取但未覆寫 `docs/project-management/reviews/2026-08-24-breeze-managed-runtime-round1.md`。
- 審查環境：Windows 10、Node.js／npm、PowerShell 7（`pwsh`）與 Windows PowerShell 5.1；本輪只讀取、執行驗證及建立本報告。
- 審查範圍：`lib/breeze-runtime-manager.mjs`、`lib/archive-utils.mjs`、`lib/breeze-runtime-probe.mjs`、`server.mjs`、`public/app.js`、`public/index.html`、`scripts/test-breeze-runtime-manager.mjs`、`scripts/test-breeze-asr.mjs`、`scripts/test-core.mjs`、`scripts/build-breeze-runtime-windows.ps1`、`.github/workflows/build-breeze-runtime-windows.yml`、runtime manifest 與 FR-025 治理文件。
- 審查重點：round1 修正後的取消生命週期、metadata 防禦／移除、完整性與暫存清理、active-state recovery、platform／arch、CPU-only build／CI、UI 取消訊息、focused test 與治理文件一致性，以及真實 runtime／授權／Windows 外部驗收缺口。

## 1. 需求完整性

- 判定：部分通過
- 證據：
  - 固定 manifest 仍嚴格限定 `win32`／`x64`／`cpu`／`python.exe`／`whisper` probe；目前 `runtime-manifests/breeze-asr-25-win-x64-cpu.json` 如實標示 `releaseStatus: not-published`、`download.available: false`，URL、size、uncompressedSize、SHA-256 與 patched Whisper revision 均未填入虛構值，符合 fail-closed 原則。
  - manager 已具備 managed path、size／SHA 驗證、temporary extraction、Zip Slip／symlink 防護、probe 後 activation、state invalid 檢查、`.previous` recovery、下載進度與 server API／UI skeleton。`server.mjs` 的取消路徑在收到 DELETE 時只設 `cancelRequested` 並呼叫 manager cancel，不會直接把尚未停止的工作宣告為 `cancelled`。
  - round1 指出的 CPU build 契約已在 source 層補強：`build-breeze-runtime-windows.ps1` 預設使用 `torch==2.4.1+cpu` 與 PyTorch CPU index，並在 venv 與 staged `python.exe` 檢查 `torch.version.cuda is None` 及 `torch.cuda.is_available() == false`；workflow 先執行 `npm run check`，再執行 generated package 的 7z／HTTPS／SHA／Breeze／CPU probe assertions。
  - 但目前沒有真實 runtime ZIP、實際 size／SHA、固定 patched Whisper revision、GitHub Release asset、逐項 license／notice evidence 或 Windows clean-machine acceptance。source manifest 仍拒絕下載，故 FR-025 的「Windows Breeze ASR 25 一鍵安裝」使用者交付尚未完成。
  - 另外，Windows PowerShell 5.1 以 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\\build-breeze-runtime-windows.ps1 ...` 實跑在 license gate 前即發生 ParserError；PowerShell 7 可執行到 license gate，但這表示 build script 的 Windows shell 相容性仍未由可支援的 Windows PowerShell 5.1+ 環境證明。

## 2. 邏輯正確性

- 判定：不通過
- 證據：
  - round1 後 manager 的同一 AbortSignal 已傳入 download、`verifyBreezeRuntimeArchive` 的 hash stream、`extractArchive` 與 capability `probe`；`runBreezeRuntimeProbe` 也會在 abort 時終止 child 並等待 close。installing 階段 cancellation fixture 能阻止半成品 runtime 啟用，並清除本輪 archive。
  - active-state recovery 已比 round1 完整：`writeJsonAtomic()` 將舊 state 暫存為 `runtime-state.json.previous`，新 state rename 失敗時嘗試還原；state reader 在主檔損壞時可讀 `.previous`，而無可恢復 state 時回報 `invalid`。注入 `writeState` 失敗的 fixture 也確認既有 active version 與 state 保留。
  - 仍有 activation cancellation 漏洞。`installBreezeRuntime()` 在 `rename(tempDir, targetDir)` 後只於 `writeState(...)` 前檢查 signal，`writeState` 本身未接收 signal，且完成後沒有再次 `throwIfAborted(signal)`。實際重放以 `writeState` 內呼叫 `controller.abort()`：輸出為 `{"resultStatus":"installed","signalAborted":true,"activeStateExists":true,"activeVersionExists":true}`。因此 AbortSignal 沒有完整貫穿 activation，取消在 state commit 期間可能仍完成啟用。
  - API 的「不提前宣告 cancelled」部分通過 source inspection：cancel endpoint 在 download／verify／installing 期間保持公開 status 為進行中並標記 `cancelRequested`，只有 manager promise settle 後 catch 才轉為 `cancelled`。但上述 activation race 仍使取消結果可能變成 `installed`，不可宣稱取消契約已完整閉合。
  - `downloadBreezeRuntime()` 本身沒有在下載前以 `process.platform`／`process.arch` reject；現在 install 會拒絕 `darwin` 或 `arm64`，但非 Windows x64 若 manifest 日後變成 available，仍可能先下載 Windows package 後才在 install 階段失敗，應在 manager／download entry point 先 fail closed。

## 3. 邊界情況

- 判定：部分通過
- 證據：
  - round2 focused manager test 通過 missing／malformed state、valid install、probe failure 保留既有 active runtime、size mismatch／SHA mismatch archive cleanup、download cancellation `.part` cleanup、installing／manager cancellation、HTTP failure、HTTPS rejection、managed／legacy／developer discovery priority、Zip Slip traversal 與 absolute path rejection。
  - round2 額外負向重放通過：損壞 ZIP 在 extract failure 後 archive 與 `.tmp-install-*` 清除；installed `runtime-manifest.json` 為 truncated JSON 時 `inspectInstalledBreezeRuntime()` 回報 `status: invalid, reason: manifest-invalid`；`removeBreezeRuntime()` 可清除該 malformed runtime directory；`darwin`／`arm64` install 均回報 `RUNTIME_PLATFORM_UNSUPPORTED`。
  - SHA mismatch 的固定 archive 現在由 `verifyBreezeRuntimeArchive()` 的 catch 清除；extract／probe／state write failure 的 install finally 也清除本輪 archive、temporary directory 與 previous directory，同時保留既有 active runtime。
  - 尚未覆蓋或未納入回歸的邊界包括：verify／probe／activation 各時點的 cancellation race、active install 與 remove／retry 的並發 API、state／manifest write／rename crash fault injection 的完整矩陣、timeout／redirect limit／disk-space failure、symlink／junction 變體、invalid managed runtime 與有效 legacy runtime 的 fallback、實際 Windows file lock／防毒干預與長時間下載。
  - activation 時點的負向重放已實際暴露「signal 已 aborted 仍 installed」，所以不能把 installing cancellation fixture 擴張解讀為所有安裝階段均可取消。

## 4. 程式碼品質

- 判定：部分通過
- 證據：
  - archive parser、runtime manager、probe 與 server API 分層；filesystem root、fetch、extractor、probe、state writer 可注入，便於 deterministic fixture；ZIP entry path、parent symlink、entry／total expansion limit 與 HTTPS redirect policy 均有明確邊界。
  - managed／external discovery 順序清晰：`BREEZE_ASR_PYTHON` developer override 優先，其次 active managed Windows x64 runtime，再是 legacy Breeze venv、bundled 與 system candidates；server refresh 後可立即更新 `toolPaths.breezePython`，完成後不要求重啟 App。
  - UI 取消訊息有兩段狀態：送出 DELETE 後顯示「正在取消 Breeze 執行環境安裝…」，promise settle 後顯示「Breeze 執行環境下載已取消。」；managed success log 顯示「不需要重新啟動 App」。
  - active-state helper 以 `.previous` 支援 recovery，但 activation 的 signal check 不涵蓋 `writeState` commit；manager 的 `remove()` 本身也沒有 active promise serialization，安全性主要依賴 server route 在 active status 時拒絕 remove。這讓核心生命週期仍有競態風險。
  - build script 的 source assertion 品質良好，但實際 Windows PowerShell 5.1 ParserError 與目前治理文件對可支援 Windows PowerShell 5.1+ 的外部驗收描述不一致；workflow 使用 `pwsh` 不等同已證明 Windows PowerShell 5.1 可執行。

## 5. 測試覆蓋

- 判定：不通過
- 證據：
  - `npm run check` 實際完成並 exit 0；其中包含 `docs:check`、JavaScript syntax checks、`test-breeze-asr.mjs`、`test-breeze-runtime-manager.mjs`、`test-core.mjs` 及完整既有 regression suite。輸出包含「Breeze managed runtime manager、下載／驗證／安全解壓／原子安裝測試通過」與核心回歸通過。
  - 額外執行 `node --check lib/breeze-runtime-manager.mjs`、`lib/archive-utils.mjs`、`lib/breeze-runtime-probe.mjs`、`scripts/test-breeze-runtime-manager.mjs` 均 exit 0；PowerShell 7 AST parser 回報 0 syntax errors；`git diff --check -- app` exit 0，只有既有 LF→CRLF warnings。
  - focused test 與治理文件仍不一致：`06-TEST-AND-PROCESS-AUDIT.md`／round1 changelog 描述涵蓋 disk-space preflight、timeout、redirect、corrupt archive、symlink、missing／invalid metadata 等，但目前 `scripts/test-breeze-runtime-manager.mjs` 沒有 `RUNTIME_DISK_SPACE`、`RUNTIME_TIMEOUT`、redirect、corrupt ZIP、`ZIP_SYMLINK` 或 `checkBreezeRuntimeDiskSpace` 的回歸 assertion。round2 額外負向重放是命令列 fixture，不是 repository regression。
  - `test-core.mjs` 目前覆蓋 `/api/breeze-runtime` status、unavailable download fail-closed、recheck 與 health payload，但沒有 managed successful install、verify／extract／probe／activation cancellation、API cancel／remove／retry race 的 integration test；UI 也只有 source assertions，沒有 renderer click／cancel／poll smoke。
  - `npm run docs:check:final` 實際 exit 1，原因是最新 08 changelog 條目仍為「進行中」、round2 尚未登錄可解析的審查檔案與逐字引用。這是本輪只允許建立 report、未修改治理條目的直接結果，不可記為 final gate 通過。

## 6. 實際運行結果

- 判定：不通過
- 證據：
  - 本機 deterministic manager／ASR／core tests 與 `npm run check` 均通過；PowerShell 7 可執行 build script 到明確的 `-LicenseReviewApproved` gate，未帶 approval 時 exit 1 並輸出「未核准時不得建立 Release asset」，證明 release gate 不是假成功。
  - Windows PowerShell 5.1 直接執行相同 build script 在 license gate 前發生 ParserError，故不能把 build script 宣稱為已在 Windows PowerShell 5.1+ 實際可執行；本輪也未執行 git clone、pip、Python 3.11、PyTorch CPU 或 patched Whisper 的真實 build。
  - local artifact scan 只找到 source manifest，沒有 `breeze-runtime*.zip` 或 `release-metadata.json`；manifest 的 `patchedWhisperRevision` 仍為 null、`download.available` 仍為 false。GitHub Release API 篩選 `breeze-runtime` asset 無輸出；`gh run list --workflow build-breeze-runtime-windows.yml` 回報 HTTP 404，沒有可追溯的 Windows runner run／candidate artifact。
  - round2 activation cancellation replay 實際回傳 installed，即使 `AbortController.signal.aborted === true`；這是目前仍存在的程式行為阻擋，不是單純缺測試。
  - 尚未完成真實 ZIP 的 size／SHA／封裝安裝／probe、固定 patched revision 的 runner build、逐 dependency license evidence、GitHub Release asset 反向核對、Windows 10／11 clean-machine 安裝／取消／移除／ASR end-to-end acceptance。

## 綜合判定

- 結論：不通過
- 阻擋問題（若有）：
  1. AbortSignal 尚未完整貫穿 activation；在 `writeState` 期間 abort 的實測會回傳 `installed` 並留下 active state，故不能宣稱所有 download／verify／extract／probe／activation 階段均可安全取消。
  2. focused regression 與治理文件宣稱的 edge coverage 不一致；disk-space、timeout、redirect、corrupt ZIP、symlink、API successful install／cancel／remove／race 等仍未鎖定為 repository tests。
  3. build script 的 CPU-only source assertions 與 workflow test step 已補齊，但沒有實際 Windows runner／真實 Python 3.11／PyTorch CPU／patched Whisper build 證據；Windows PowerShell 5.1 直接執行還有 ParserError。
  4. 真實 runtime ZIP、固定 patched Whisper revision、release metadata／size／SHA、逐項 license redistribution evidence、GitHub Release asset 與 Windows clean-machine acceptance 仍缺失；source manifest 因此必須維持 `available:false`，FR-025 不得標記完成。
  5. `npm run docs:check:final` 尚未通過，最新 changelog 尚未納入本 round2 報告與結論。
- 遺留風險與追蹤：修正 activation cancellation／remove serialization 後補同時序 fault-injection regression；將治理宣稱縮限至實際 test cases；以 `pwsh`／Windows PowerShell 5.1 明確決定支援矩陣並修正或改寫 build script；完成 license review、真實 candidate package、runner run、Release 反向核對及 Windows clean-machine acceptance 後再進行下一輪獨立複審。
- 可逐字引用完整結論句：**本輪 Windows Breeze Managed Runtime FR-025 round2 獨立複審結論為不通過：round1 的 malformed state／manifest invalid、SHA／損壞 ZIP cleanup、active-state recovery、CPU-only source assertions 與 UI 取消訊息已有可執行修正，且 `npm run check` 與 focused tests 通過；但 activation 期間 AbortSignal 實測仍可在 signal 已 aborted 後回傳 installed，focused test 與治理文件宣稱的 edge coverage 不一致，Windows PowerShell 5.1 build script 直接執行發生 ParserError，並且真實 runtime ZIP、固定 patched revision、license evidence、Windows runner／Release asset 與 clean-machine acceptance 全部缺失，因此不得宣稱 FR-025 或 Windows Breeze managed runtime 一鍵安裝已完成。**

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- round1 報告未覆寫；本輪命令列負向 fixture 僅寫入系統 temporary directory，驗證結束後已清理；沒有把 fixture 或其他測試輸出寫入專案工作樹。
- 若上述聲明不實，本報告無效。
