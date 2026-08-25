# FR-025 Windows Breeze managed runtime Phase 2 round2 獨立只讀審查

- 審查日期：2026-08-24（Asia/Taipei）
- 審查檔案：`docs/project-management/reviews/2026-08-24-breeze-runtime-phase2-round2.md`
- 審查範圍：目前 FR-025 Windows x64 CPU Breeze managed runtime 的發布產物、manifest、受控 clean-profile 安裝、App API／ASR e2e、renderer readiness、測試與已揭露限制。
- 審查方式：只讀檢查與短時間 focused test；未修改 source、tests、docs 或既有 review report。

## 1. 需求完整性

- 判定：有條件通過。
- `app/runtime-manifests/breeze-asr-25-win-x64-cpu.json:1-29` 已固定 `win32/x64/cpu`、Python 3.11、`releaseStatus: published`、可下載 URL、檔名、大小、解壓後大小、SHA-256、Breeze revision `c0993ecd98522d61066d3f5ce769e35c848b7855` 與 patched Whisper revision `f94c6ba670a35ee8d720d4221e102f4685c288d6`。
- `app/breeze-runtime-output/release-download.zip`、`app/breeze-runtime-output/breeze-runtime-win-x64-cpu-2026.08.1.sha256:1`、`app/breeze-runtime-output/release-metadata.json:1-38` 與 `app/docs/project-management/evidence/2026-08-24-breeze-runtime-phase2.json:1-49` 一致：`breeze-runtime-win-x64-cpu-2026.08.1.zip`、286,785,161 bytes、SHA-256 `724e8bcb45c7a1373e1d1eca0e413897354326a4fae207948e72ec529bb8bf4b`，解壓後 1,436,390,789 bytes。
- 本輪已以 `gh api repos/twyderek/offline-subtitle-factory-app/releases/tags/breeze-runtime-2026.08.1 --jq ...` 讀到非 draft、非 prerelease 的公開 Release；遠端 ZIP asset 名稱與 286,785,161 bytes 大小一致，且 manifest 的正式下載 URL 指向該 asset。
- `app/docs/project-management/evidence/2026-08-24-breeze-runtime-phase2.json:16-29` 記錄 controlled clean-profile：PATH 僅 `C:\Windows\System32`，`git`／`node`／`python`／`py` 不可用，以 bundled Node 啟動 App，`POST /api/breeze-runtime/download` 最終為 `installed`、`ready:true`、`source:managed`、版本 `2026.08.1`、`restartRequired:false`。
- 因此 FR-025 的核心「固定 Windows runtime 下載、驗證、managed 安裝、probe 後可用」已有實際產物與實際 App 流程支持；但 clean-profile 不是 pristine Windows VM，也不是 packaged Electron acceptance，故不作無條件完成宣稱。

## 2. 邏輯正確性

- 判定：通過（限目前已驗證的受控流程）。
- `app/docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:168-174` 描述並與 evidence 對應真實 build、固定 revision、ZIP／SHA、Windows DLL-aware probe、長路徑 staging、atomic activation、失敗清理與既有 runtime 保留。
- 本輪短測試實際執行：在 `app` 目錄執行 `node scripts/test-breeze-runtime-manager.mjs`、`node scripts/test-breeze-asr.mjs`、`node scripts/test-core.mjs`，三者均 exit 0；輸出分別確認 managed runtime manager、Breeze ASR probe／CLI 契約與核心 API 回歸通過，總耗時約 16 秒。
- 成功安裝／重試後清錯的現行契約可回溯至 `app/server.mjs:1327-1334`：成功分支將 `state.status` 設為 installed、`progress` 設為 100、`state.error = null`、`state.cancelRequested = false`，並刷新 Breeze Python path；`app/scripts/test-core.mjs:13-14` 亦鎖定此 stale error／cancellation clearing 行為。
- 這支持成功重試／恢復後不殘留錯誤狀態；但現有證據主要是成功 API 狀態與 source-level regression assertion，沒有另存 packaged renderer 的實際 retry-click trace。

## 3. 邊界情況

- 判定：有條件通過。
- 目前治理與 focused coverage 已涵蓋下載取消、大小／SHA 不符、損壞 ZIP、安全解壓、probe failure、atomic rollback、磁碟空間／timeout／redirect／symlink 等 deterministic 邊界；round4 source-foundation 報告與 `app/docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:159-164` 可回溯這些範圍。
- 受控安裝實際涵蓋「無系統 Python／Git／Node」的使用者前置條件，並完成真正 Breeze `/api/jobs` 任務，不是只靠 mock runtime。
- 尚未由本輪證據覆蓋 pristine VM 的權限／防毒／檔案鎖、packaged Electron 啟動後的 managed download、跨重啟恢復，以及完整 API cancel／remove race 的 renderer 實機序列。
- Runtime payload 未 Authenticode 簽章，仍有 SmartScreen／使用者信任風險；台灣華語品質、長音訊效能、GPU 與 macOS managed runtime 也不在本輪完成範圍。

## 4. 程式碼品質

- 判定：通過（限本輪 scope）。
- `app/lib/breeze-runtime-manager.mjs`、`app/lib/archive-utils.mjs`、`app/lib/breeze-runtime-probe.mjs`、`app/server.mjs` 與 renderer 以 manager／archive／probe／API／UI 分層；manifest 驗證、temporary extraction、probe 後 activation 與錯誤狀態清理均有明確責任邊界。
- `app/docs/BREEZE-ASR-25.md:18-30` 明確說明 runtime 不放入 Electron 安裝包、寫入使用者可寫 cache、不修改系統 Python／PATH／Registry，並描述下載→SHA／大小驗證→安全解壓→probe→atomic activation。
- Release metadata 與 runtime license inventory 有固定來源、revision、Python／PyTorch 版本與 notices；但 `app/breeze-runtime-output/work/runtime/runtime-license-review.json` 的 `reviewStatus` 是 `engineering-evidence`，41 個 installed package 中有 29 個沒有明確 `license` 欄位。這是工程盤點證據，不是法律意見或完整法律 redistribution opinion。
- Current source tree 的 App implementation／evidence 並未由本輪建立一個可直接對應 runtime Release 的 App source commit provenance；Breeze／patched Whisper revision 有固定記錄，但不能等同於 App source tree provenance 已閉合。

## 5. 測試覆蓋

- 判定：有條件通過。
- 本輪獨立重跑的三個 focused commands 均 exit 0：`node scripts/test-breeze-runtime-manager.mjs`、`node scripts/test-breeze-asr.mjs`、`node scripts/test-core.mjs`。這提供 manager、probe／CLI 與核心 API／成功清錯 source assertion 的最新回歸證據。
- `app/docs/project-management/evidence/2026-08-24-breeze-runtime-phase2.json:30-44` 提供 live App `/api/jobs` e2e 與 renderer 證據：job `20260824050201-97e80c` 使用 `breeze-asr-25`，最終 `completed`、`ready-review`、100%，renderer 選取 Breeze，顯示「Breeze ASR 25 已就緒，可開始提交任務」，`consoleErrors: []`。
- 測試缺口仍需保留：沒有 pristine VM、沒有 packaged Electron acceptance、沒有逐 dependency license/legal review 的完成證明、沒有可重播的完整 renderer retry-click／cancel／remove trace，也沒有跨機型品質／長音訊效能回歸。
- 因而測試足以支持本輪受控 FR-025 交付，但不足以支持「所有 Windows 使用者環境與正式 Electron 包均已驗收」的更廣泛聲稱。

## 6. 實際運行結果

- 判定：有條件通過。
- `app/docs/project-management/evidence/2026-08-24-breeze-runtime-phase2.json:16-37` 是受控 clean-profile 的實際結果：managed runtime 下載／安裝後 `installed`、`ready:true`，並由同一 App 以 `POST /api/jobs` 完成 Breeze ASR 25 短片任務，產生 `draft.srt`。
- `app/docs/project-management/evidence/2026-08-24-breeze-runtime-phase2.json:39-44` 是 renderer 實際結果：Breeze 已選取並 ready，無 console errors；成功狀態與 `app/server.mjs:1327-1334` 的 `error=null`／`cancelRequested=false` 清除契約一致。
- 公開 Release、manifest、checksum、ZIP 與 runtime source/license evidence 均在工作區可追溯，且遠端 Release API 已確認 ZIP asset 公開存在。這不是只讀 source skeleton 或 deterministic mock 的結論。
- 限制：本輪沒有 pristine Windows VM、沒有 packaged Electron acceptance；license 檔案是 engineering evidence 而非法律意見；App source tree 與 runtime Release 之間缺少可獨立核對的 source commit provenance；payload 仍未簽章。

## 綜合判定

- 結論：有條件通過。
- 阻擋／條件：
  1. FR-025 核心 managed runtime 交付已由固定 ZIP／manifest／SHA、公開 Release、受控 clean-profile API 安裝、live Breeze `/api/jobs` e2e 與 renderer readiness 支持。
  2. 若要升級為無條件通過，需補 pristine Windows VM 與 packaged Electron acceptance，並保存可重播的 renderer retry／cancel／remove 證據。
  3. 需將 engineering license evidence 與逐 dependency redistribution／法律審查分開記錄；目前不能把 `approved-by-build-input` 或 `engineering-evidence` 當作法律核准。
  4. 需補 App source tree 到 runtime Release 的可追溯 provenance；固定 Breeze／patched Whisper revision 不足以替代 App source commit binding。
- 剩餘風險：Windows unsigned runtime／SmartScreen、真實使用者環境的權限／防毒／鎖檔與跨重啟行為、台灣華語品質、長音訊效能、GPU、macOS managed runtime，以及 packaged Electron 行為。
- **綜合結論：FR-025 Windows Breeze managed runtime 的固定發布產物、受控 clean-profile 安裝、live App Breeze e2e、renderer readiness 與成功後錯誤清除均已獲得目前證據支持，但因 pristine VM、packaged Electron、完整 license/legal review 與 App source provenance 尚未閉合，本輪判定為有條件通過。**

## 審查代理聲明

- 本審查代理除建立 `docs/project-management/reviews/2026-08-24-breeze-runtime-phase2-round2.md` 外，僅執行讀取、指令執行與驗證，未修改其他專案檔案或既有 review report。
- 本報告未覆寫任何 round1／round2／round3／round4 既有審查原文；測試執行未被用來宣稱未覆蓋的 pristine VM、packaged Electron 或法律審查已完成。
- 若上述聲明不實，本報告無效。
