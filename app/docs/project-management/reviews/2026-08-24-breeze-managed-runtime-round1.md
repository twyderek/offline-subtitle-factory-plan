# 獨立審查報告：Windows Breeze Managed Runtime Phase 1（FR-025）

- 審查對象 commit／版本：`main` HEAD `0126f62711240684559674bf11bebf432bad4666`、`package.json` 版本 `0.49.1`，加上 2026-08-24 尚未提交的 FR-025 工作樹變更；本輪沒有可獨立辨識的 FR-025 commit。
- 對應 08-CHANGE-LOG 條目：2026-08-24 — Windows Breeze Managed Runtime Phase 1（FR-025）
- 審查輪次：round1
- 審查代理啟動時間、上下文來源：2026-08-24T09:57:53.670+08:00；本代理為本輪獨立上下文，只依使用者指定範圍、目前 workspace、治理文件與本輪實測判定，未沿用開發代理對話記憶。
- 審查範圍：`lib/breeze-runtime-manager.mjs`、`lib/archive-utils.mjs`、`lib/breeze-runtime-probe.mjs`、`server.mjs`、`public/app.js`、`public/index.html`、`public/styles.css`、`runtime-manifests/breeze-asr-25-win-x64-cpu.json`、`scripts/build-breeze-runtime-windows.ps1`、`.github/workflows/build-breeze-runtime-windows.yml`、`scripts/test-breeze-runtime-manager.mjs`、`scripts/test-breeze-asr.mjs`、`scripts/test-core.mjs`、`package.json` 及 FR-025 相關治理／授權揭露文件。

## 1. 需求完整性

- 判定：部分通過
- 證據：
  - FR-025 要求固定 manifest、Windows x64 CPU、大小／SHA-256、安全 temporary extraction、capability probe 後啟用、進度、AbortController 取消、磁碟預檢、既有 runtime 保留及 discovery priority（`docs/project-management/02-REQUIREMENTS-ANALYSIS.md:41`）。目前 source 已具備固定 manifest 與 unavailable fail-closed（`runtime-manifests/breeze-asr-25-win-x64-cpu.json:1-28`）、下載／驗證／安裝核心（`lib/breeze-runtime-manager.mjs:127-269`）、ZIP 路徑與 symlink 防護（`lib/archive-utils.mjs:21-35,83-87,93-143`）、managed discovery（`lib/breeze-runtime-probe.mjs:23-55`）、server API（`server.mjs:3863-3893`）及首頁操作面板（`public/index.html:480-547`、`public/app.js:656-895`）。
  - source manifest 如實標示 `releaseStatus:not-published`、`download.available:false`、URL／size／SHA 為 null，沒有 placeholder download（`runtime-manifests/breeze-asr-25-win-x64-cpu.json:9-16`），符合設計的 fail-closed 要求（`docs/project-management/03-FUNCTIONAL-DESIGN.md:73`）。
  - 本輪尚不能完成 FR-025 的可交付使用者流程：本機 `rg --files -g '*breeze-runtime*.zip' -g 'release-metadata.json' -g 'breeze-runtime-output/**' .` 於 2026-08-24T10:00:52.487+08:00 無輸出；GitHub Release API 查詢 `twyderek/offline-subtitle-factory-app` 的所有 asset 亦沒有 `breeze-runtime` 命名資產。沒有真實 runtime ZIP、實際 size／SHA、固定 patched Whisper revision、Release asset、逐項 license evidence 或 Windows clean-machine acceptance；治理來源亦明確承認此狀態（`docs/project-management/08-CHANGE-LOG.md:27-28`、`THIRD-PARTY-NOTICES.md:35-41`、`docs/BREEZE-ASR-25.md:108`）。這些是 FR-025 完整結案與任何公開下載啟用的阻擋，不可由 Phase 1 fixture 取代。
  - manifest 驗證固定寫死 `win32/x64`，但安裝只檢查傳入 `platform`，沒有比對實際 `process.arch`（`lib/breeze-runtime-manager.mjs:43-62,228-231`）；不符合設計所述 manifest platform／arch 必須與執行環境一致（`docs/project-management/03-FUNCTIONAL-DESIGN.md:73`）。
  - 治理範圍前後不一致：條目把「不先接入 UI」列為不在範圍（`docs/project-management/08-CHANGE-LOG.md:17`），實際修改卻包含 server API、UI、build script 與 workflow（同檔 `:26`）。雖然實作可被審查，Phase 1／Phase 2 邊界與成功條件尚未同步收斂。

## 2. 邏輯正確性

- 判定：不通過
- 證據：
  1. **取消只中止下載，不能中止 verifying／installing，卻被 API 宣告已取消。** manager 的 AbortSignal 只傳入 `downloadBreezeRuntime()`，後續 `installBreezeRuntime()` 沒有 signal（`lib/breeze-runtime-manager.mjs:293-304`）；server 卻在 downloading、verifying、installing 三種狀態都接受取消並立即把公開狀態改為 cancelled（`server.mjs:1309-1317`）。本輪於 2026-08-24T10:01:45.562+08:00 以可注入 extractor／probe 重放，在收到 `installing` 後呼叫 `manager.cancel()`，輸出為 `{"cancelIssuedAtInstalling":true,"finalStatus":"installed","activeStateExists":true}`（exit 0）。這直接違反 FR-025 AbortController 取消及「取消會清理未完成安裝」契約，也使隨後 remove／retry 可能與仍在進行的安裝競態。
  2. **損壞的 state metadata 不會回傳 `invalid`，而是使 status／recheck／remove 路徑拋錯。** `readJsonIfExists()` 只吞 ENOENT，JSON parse error 直接重拋（`lib/breeze-runtime-manager.mjs:98-105`）。2026-08-24T10:01:51.820+08:00 將 truncated `runtime-state.json` 交給 `inspectInstalledBreezeRuntime()`，實際輸出 `{"threw":true,"name":"SyntaxError","message":"Unexpected end of JSON input"}`（exit 0）。因此 `GET /api/breeze-runtime`、recheck，甚至 remove 前的狀態讀取都可能失去自助修復路徑（`server.mjs:3863-3893`），不符合可辨識 invalid／failure 狀態的 NFR-005。
  3. **SHA-256 不符後固定 ZIP 沒有被刪除，與產品訊息相反。** 下載先把 `.part` rename 成固定 archive，再由 install 驗 hash（`lib/breeze-runtime-manager.mjs:203-207,228-232`）；verify 失敗沒有刪除固定 archive。2026-08-24T10:02:01.917+08:00 的 mismatch 重放輸出 `{"errorCode":"RUNTIME_SHA256_MISMATCH","archiveExists":true,"partExists":false}`（exit 0），但 server 對使用者聲稱「已自動刪除檔案」（`server.mjs:1195-1197`）。
  4. **active state 更新不是 crash-safe atomic replacement。** `writeJsonAtomic()` 先刪除既有 `runtime-state.json` 再 rename temp（`lib/breeze-runtime-manager.mjs:221-226`）。若兩者之間 crash／rename 失敗，舊 state 已消失；install 雖嘗試恢復 previous directory（`:248-258`），卻不能恢復已刪除的 state，且 finally 仍會清理 previous path（`:263-267`）。這不符合「既有 runtime 保留」與 atomic activation 承諾（`docs/project-management/03-FUNCTIONAL-DESIGN.md:75`）。
  5. **CPU runtime build 契約沒有被真正約束。** build script 預設只安裝 `torch==2.4.1`，未固定 CPU wheel index／`+cpu` build，probe 也只 import Torch（`scripts/build-breeze-runtime-windows.ps1:7,60-64,81-82`），之後卻將 manifest 標成 `variant=cpu`（`:84-96`）。workflow 同樣沒有 assert `torch.version.cuda`／CPU-only wheel（`.github/workflows/build-breeze-runtime-windows.yml:52-73`），不足以支持治理文件的「CPU Torch」敘述（`docs/project-management/05-DEVELOPMENT-AND-DEPLOYMENT.md:59`）。

## 3. 邊界情況

- 判定：不通過
- 證據：
  - 已實測：fixed size／SHA mismatch、下載途中 AbortController 取消、HTTP 503、absolute／drive／parent traversal ZIP、probe failure 保留舊 active version、managed／legacy／developer priority（`scripts/test-breeze-runtime-manager.mjs:109-175`）；本輪另實測 installing 階段取消、truncated state JSON、hash mismatch 殘留 archive，三者均暴露上述缺陷。
  - 治理文件宣稱 focused test 覆蓋 HTTPS only、timeout、disk-space、corrupt archive、symlink rejection、missing／invalid state 等（`docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:159`；`docs/project-management/08-CHANGE-LOG.md:25`），但 `scripts/test-breeze-runtime-manager.mjs:109-175` 沒有這些案例。2026-08-24T10:02:09.375+08:00 執行 `rg -n "RUNTIME_DISK_SPACE|RUNTIME_TIMEOUT|ZIP_SYMLINK|ZIP_CORRUPT|RUNTIME_INSECURE_URL|RUNTIME_REDIRECT|createBreezeRuntimeManager|removeBreezeRuntime|checkBreezeRuntimeDiskSpace" scripts/test-breeze-runtime-manager.mjs` 為 exit 1（無匹配）。其中 `:113` 把 URL 改成 HTTP 時仍保留 `available:false`，沒有進入 HTTPS 驗證分支，不能算 HTTPS-only 測試。
  - 尚未測試：cancel during verify/extract/probe、remove／retry 與 active install 競態、malformed state／installed manifest、active-state write failure rollback、非 x64 process、invalid managed runtime 是否應 fallback 到可用 legacy runtime、redirect 邊界、ZIP duplicate／CRC／junction、實際磁碟壓力及長時間下載。
  - Windows runner、真實 Python 3.11／PyTorch CPU／patched Whisper package、Windows 10／11 clean machine、長音訊、真實 capability 與字幕品質均沒有本輪實測證據（`docs/project-management/08-CHANGE-LOG.md:28`）。

## 4. 程式碼品質

- 判定：部分通過
- 證據：
  - 優點：runtime manager、archive parser 與 process probe 分離；下載、filesystem root、extractor 與 probe 可注入；ZIP extraction 逐 entry 驗證路徑、大小、method、symlink 與 parent containment（`lib/archive-utils.mjs:21-35,83-90,93-167`）；probe 使用 `shell:false`、timeout 與診斷遮罩（`lib/breeze-runtime-probe.mjs:58-94`）。source manifest unavailable 亦採安全失敗。
  - 問題：取消生命週期分散在 server state 與 manager controller，造成公開狀態和實際工作不一致；state JSON 缺少 defensive parse／recovery；所謂 atomic helper 先刪再改名；archive verification failure cleanup 只處理 `.part`；這些均是核心可靠性問題，不只是命名或風格。
  - workflow step 名稱是「Install app dependencies and run runtime manager tests」，實際只有 `npm ci`（`.github/workflows/build-breeze-runtime-windows.yml:49-50`），候選 runtime CI 不會執行該 focused test。
  - UI 的 managed 成功路徑正確顯示「不需要重新啟動 App」（`public/app.js:758-767`），但首次缺 runtime 的 log 仍要求「完成安裝並重新啟動 App」（`:939-946`），與同一流程及 `docs/BREEZE-ASR-25.md:16` 矛盾。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：
  - 2026-08-24T10:00:11.672+08:00–10:00:11.954+08:00：對 manager、archive、probe、server、app、兩個 Breeze tests 與 core test 執行 `node --check`，8 個檔案全部 exit 0。
  - 2026-08-24T10:00:15.896+08:00 起平行執行：`node scripts/test-breeze-runtime-manager.mjs`（10:00:16.029，exit 0）、`node scripts/test-breeze-asr.mjs`（10:00:17.239，exit 0）、`node scripts/test-core.mjs`（10:00:23.338，exit 0）。core 覆蓋 status API、unavailable download fail-closed、recheck 與 health payload（`scripts/test-core.mjs:489-513`），未覆蓋 managed 成功下載／install／cancel／remove。
  - 2026-08-24T10:00:28.157+08:00–10:00:40.259+08:00：`npm run check` exit 0；治理檢查、語法檢查與完整 npm test 串列均通過。
  - 2026-08-24T10:02:09.375+08:00：`git diff --check` exit 0（只有既有 LF→CRLF warning）。
  - 通過的測試不足以支持治理文件列出的覆蓋範圍，且本輪三個負向重放均找到未覆蓋缺陷；因此不能以 suite 全綠判定 FR-025 Phase 1 可靠性通過。

## 6. 實際運行結果

- 判定：不通過
- 證據：
  - manager fixture 的正常下載／安裝與 API fail-closed 路徑可執行，所有指定本機測試均通過；PowerShell parser 於 2026-08-24T10:00:52.487+08:00 對 `scripts/build-breeze-runtime-windows.ps1` 回報 0 syntax errors。
  - 實際 post-download cancellation、malformed metadata 與 hash cleanup 結果分別是「取消後仍 installed」、「拋 SyntaxError」、「不合格 ZIP 仍存在」，詳見第 2 節時間戳輸出；這些是實際行為失敗，不是推測。
  - 2026-08-24T10:00:52.487+08:00–10:00:54.233+08:00 的 GitHub 唯讀查核：`gh api repos/twyderek/offline-subtitle-factory-app/releases?per_page=100` 篩選 `breeze-runtime` asset 無結果（query exit 0）；`gh run list --repo twyderek/offline-subtitle-factory-app --workflow build-breeze-runtime-windows.yml ...` 回覆 HTTP 404「workflow ... not found on the default branch」。因此目前只有本地 workflow skeleton，沒有可追溯的 Windows runner run 或 candidate artifact。
  - 沒有真實 runtime ZIP／Release asset／license evidence／Windows clean-machine acceptance，故未執行真實 package build、安裝、capability probe、移除、更新或 ASR end-to-end；不得寫成實際運行成功。

## 綜合判定

- 結論：不通過
- 阻擋問題（若有）：
  1. installing／verifying 取消不會中止實際安裝，公開狀態與最終狀態不一致，並留下 remove／retry 競態。
  2. malformed runtime state／installed manifest 缺少可恢復的 invalid 狀態；狀態、recheck 與 remove API 可能直接 500／409 且無法自助修復。
  3. active state replacement 不具 crash-safe rollback；SHA mismatch archive 未清除且 UI 訊息失真。
  4. Windows candidate build 未鎖定／證明 CPU-only Torch，workflow 也沒有實際執行 runtime manager tests；目前 workflow 未出現在遠端預設分支，沒有 runner 證據。
  5. focused test 與治理文件宣稱的 edge coverage 不一致；上述核心負向案例尚未納入回歸。
  6. FR-025 完整結案／公開下載仍被真實 runtime ZIP、固定 Release metadata 與 asset、patched Whisper revision、完整 license redistribution evidence、Windows clean-machine acceptance 所阻擋。
- 剩餘風險：真實 package 的 Python home／DLL／Torch 載入、runtime 體積與磁碟峰值、HTTP redirect／長下載、Windows 10／11 權限與防毒、取消後 process／filesystem 殘留、更新／降版、長音訊效能與台灣華語品質都未驗證；invalid managed runtime 可能優先於有效 legacy runtime（`lib/breeze-runtime-probe.mjs:39-55`），亦缺少 fallback 行為測試。
- 給主要開發代理的具體修正要求（若有）：
  1. 將同一 AbortSignal 貫穿 download、verify、extract、probe、activation；server 不得在工作尚未停止時宣告 cancelled，remove／retry 必須與 active promise 序列化，並新增 verifying／installing／probe 三階段取消與 remove race 測試。
  2. 對 state 與 installed manifest 做 defensive parse/schema validation；損壞時回傳 `invalid` 並允許 remove／repair。重新設計 active-state commit／recovery，使任何 write／rename／crash failure 都能保留或恢復舊 state 與舊 runtime，並以故障注入測試證明。
  3. SHA／size／extract／probe 失敗時依契約清除本輪 archive／temporary paths，修正使用者訊息並加入檔案殘留斷言。
  4. 明確比對 process platform／arch；CPU build 使用固定 CPU wheel source/version 並 assert CPU-only；workflow 實際執行 manager、Breeze 與 generated-package install/probe tests，不得只用 step 名稱宣稱執行。
  5. 補齊 HTTPS available=true、redirect、timeout、disk-space、corrupt ZIP、symlink／junction、malformed metadata、state write rollback、invalid managed＋valid legacy、API successful install/cancel/remove/recheck 與 UI remove／error recovery；修正 `06-TEST-AND-PROCESS-AUDIT.md:159`、`08-CHANGE-LOG.md:25` 的過度宣稱及 Phase 邊界矛盾。
  6. 在開啟 source manifest download 前，保存真實 ZIP／size／SHA、固定 upstream revisions、逐 dependency license／notice evidence、GitHub Release asset 反向核對、Windows clean-machine 安裝／取消／移除／ASR acceptance；完成後另建 round2 複審，不得修改本報告。

## 完整單句結論

本輪 FR-025 Windows Breeze Managed Runtime Phase 1 獨立審查結論為不通過：雖然 fixed manifest、下載驗證、安全解壓、probe、API／UI skeleton 與既有自動回歸均可執行，但 installing 階段取消仍會完成啟用、破損 state 會直接拋錯、SHA 不符 ZIP 未清除、active state 不具 crash-safe rollback，CPU build／CI 與測試治理證據亦未收斂，且真實 runtime ZIP、Release asset、license evidence 與 Windows clean-machine acceptance 仍全部缺失，因此不得將 FR-025 或一鍵 managed runtime 宣稱完成。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 本輪針對性驗證僅在系統 temporary directory 留下可回溯 fixture，未刪除既有暫存檔；沒有將 fixture 寫入專案工作樹。
- 若上述聲明不實，本報告無效。
