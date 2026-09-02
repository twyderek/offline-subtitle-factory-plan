# 獨立審查報告：Offline Subtitle Factory 0.51.0 Packaged Acceptance Remediation round4

- 審查對象 commit／版本：`HEAD`／`v0.51.0` 均為 `10b3044d31a5367a91faacea46b8def7ee103f7c`；`app/package.json:2-3`、`app/package-lock.json:2-9` 為 `0.51.0`。
- 對應 08-CHANGE-LOG 條目：`app/docs/project-management/08-CHANGE-LOG.md:3-28`（`ACCEPT-051-PACKAGED-ROUND3-20260902`）。
- 審查輪次：round4。
- 審查代理啟動時間、上下文來源：2026-09-02T04:50:00+00:00 起；同一獨立審查角色重新執行 full preflight，重新閱讀目前 worktree、最新 changelog、round3／macOS evidence、workflow、BUG-024 與前輪 packaged round2 report，並重新執行只讀驗證；未沿用主要代理對話記憶或評價。
- 審查限制：只修改先前由本審查代理建立的 round3 欄位格式，並新增本 round4 報告；不修改產品、測試、changelog、Release、tag、asset 或其他既有報告，不重跑大型 macOS package。

## 1. 需求完整性

- 判定：部分通過。
- 證據：
  - 最新 changelog 已將 round3 條目標示為完成，並記錄 exact-source baseline、remediation worktree、Windows CI、local Windows gap、public provenance、package／latest.yml stale text 與版本建議於 `app/docs/project-management/08-CHANGE-LOG.md:3-28`；`app/docs/project-management/evidence/2026-09-02-acceptance-packaged-round3.json:2-12,24-31,33-60,62-97` 與其欄位一致。
  - source identity 在 2026-09-02T04:50 後的只讀核對仍為 exact SHA；`git status --short` 顯示主要代理既有未提交 source／test／governance／evidence 變更，因此 remediation worktree 的 PASS 不能改寫為已提交或已發布的 `v0.51.0` binary。
  - changelog 的 closeout draft 雖記錄 `GOVERNANCE_CLOSEOUT=PASS_AFTER_DOCUMENT_CLOSEOUT`（`:27`），但 2026-09-02T04:52:07.650Z 實際執行 `npm run docs:check:final` 仍 exit 1，錯誤為「最新一輪獨立審查結論為不通過」。故文件 draft 與 validator 實況尚未完全一致。

## 2. 邏輯正確性

- 判定：部分通過。
- 證據：
  - Breeze 正式 fail-closed contract 仍在 `app/lib/breeze-runtime-manager.mjs:90-102,117-125,204-208,282-284`：managed runtime 只接受 Windows x64；`app/lib/breeze-runtime-probe.mjs:23-45` 的 optional `arch` 只作明確 target seam，未放寬 arm64。
  - 修正後 `app/scripts/test-breeze-runtime-manager.mjs:125-142` 同時驗證 x64 positive、arm64 `null`、unsupported fetch 與 arm64 install rejection；2026-09-02T04:52:07.650Z 的 focused chain exit 0。
  - exact public tag baseline 仍在 macOS arm64 clean acceptance worktree 的 `scripts/test-breeze-runtime-manager.mjs:125` 失敗（2026-09-02T04:42:23.512Z：actual `null`／expected managed `python.exe`）；這證明 release tag 尚未包含 remediation fixture fix。不得回寫既有 `v0.51.0` tag／Release／asset，也不得將 current uncommitted PASS 等同 public tag PASS。
  - AI bounded parser／candidate validation 與 deterministic R01/R02/R03 仍有 source/test evidence：`app/lib/ai/subtitle-optimizer.mjs:104-132,190-275`、`app/scripts/test-ai-acceptance-contract.mjs:17-83`；它們支持 remediation worktree contract，但不消除 package provenance 或 Windows/pristine gap。

## 3. 邊界情況

- 判定：部分通過。
- 證據：
  - Breeze x64／arm64 邊界、archive SHA／size、platform rejection、probe failure、atomic rollback、timeout、cancel、disk-full 與 insecure URL 均由 `app/scripts/test-breeze-runtime-manager.mjs:125-190,244-267` 覆蓋；本輪 focused tests exit 0。
  - deterministic parser／repair 邊界與 multi-cue ID／順序測試位於 `app/scripts/test-ai-response-parser.mjs:235-285`、`app/scripts/test-ai-optimizer.mjs:274-303`，完整 remediation `npm run check` 已實際通過；這不是 live model quality 證據。
  - macOS arm64 package evidence `app/docs/project-management/evidence/2026-09-02-acceptance-packaged-0510-macos-arm64.json:63-68` 將 Windows Setup／Portable／uninstall 標為 `TEST_GAP`；round3 evidence `:59-60` 將 local Windows machine 標為 `NOT_AVAILABLE`。CI Windows lifecycle 與本機／pristine Windows 必須維持分離。
  - public asset provenance 仍是 `UNVERIFIED`，不是 digest mismatch；package／latest.yml candidate text 仍是既有交付邊界，需另以 patch release 處理。

## 4. 程式碼品質

- 判定：部分通過。
- 證據：
  - `app/lib/breeze-runtime-probe.mjs:23-56` 的 `arch` seam、`app/lib/breeze-runtime-manager.mjs:90-102` 的集中 gate 與測試中的明確 target architecture 使跨 host fixture 意圖清楚，修改幅度小且保持 fail-closed。
  - parser 深度上限／循環保護／context-aware acceptance 位於 `app/lib/ai/subtitle-optimizer.mjs:104-132,190-220,235-275`，並由新增 deterministic tests 覆蓋。
  - `git diff --name-status` 仍顯示 `lib/breeze-runtime-probe.mjs`、`scripts/test-breeze-runtime-manager.mjs` 及其他主要代理變更尚未提交；目前 public `v0.51.0` 是 exact HEAD，而不是這個 remediation diff 的可追溯發布快照。
  - source `app/README.md:3-10`、`app/RELEASE-NOTES-0.51.0.md:1-21`、`app/docs/project-management/00-CURRENT-STATUS.md:1-16` 已分類公開狀態與風險；exact package embedded release notes 與 `latest-mac.yml` 仍為 candidate text，round3 evidence `:82-86` 已正確標為 stale／historical，並建議 `RECOMMEND_0.51.1_PATCH`。

## 5. 測試覆蓋

- 判定：部分通過。
- 證據：
  - 2026-09-02T04:52:07.650Z 的 focused commands：`node scripts/test-breeze-runtime-manager.mjs`、`node scripts/test-breeze-asr.mjs`、兩個 Breeze `node --check` 與 `git diff --check` 均 exit 0。
  - 2026-09-02T04:52:31.768Z 以 `OFFLINE_SUBTITLE_TEST_TOOLS_DIR=/Users/nycu/Documents/離線字幕工廠/offline-subtitle-factory-app/tools npm run check` 執行 current remediation worktree，`docs:check`、所有 `npm test` 項目與 core localhost integration 均 exit 0。
  - exact `10b3044d…` acceptance worktree 的 baseline test 仍於 2026-09-02T04:42:23.512Z exit 1；因此不能宣稱 public exact tag 的 cross-host full regression 已被回寫修正。
  - 2026-09-02T04:52:07.650Z `npm run docs:check:final` exit 1；round3 report 的欄位格式已修正為 `阻擋問題（若有）`，但 validator 仍依 changelog 引用的 round3 `不通過` 判定拒絕 final closeout。這是治理測試的實際結果，不以 changelog draft 的 PASS_AFTER_DOCUMENT_CLOSEOUT 取代。

## 6. 實際運行結果

- 判定：部分通過。
- 證據：
  - macOS arm64 acceptance-only package 的 source／build provenance、ZIP／DMG／blockmap size／SHA、unzip／hdiutil、embedded version、`darwin-arm64` runtime、renderer／trim／migration／packaged Ollama 均記錄於 `app/docs/project-management/evidence/2026-09-02-acceptance-packaged-0510-macos-arm64.json:2-24,25-61,63-91`；Windows Setup／Portable／uninstall 是 `TEST_GAP`。
  - exact Windows CI lifecycle：`app/docs/project-management/evidence/2026-09-02-acceptance-packaged-round3.json:33-60` 記錄 run `33483093931`、head exact SHA、`windows-2022`、job `99776892605` success、unsigned Setup／Portable build、install／renderer、uninstall、Portable smoke、archive 與 artifact upload PASS；公開 run [33483093931](https://github.com/twyderek/offline-subtitle-factory-plan/actions/runs/33483093931)、job [99776892605](https://github.com/twyderek/offline-subtitle-factory-plan/actions/runs/33483093931/job/99776892605) 與 artifact [9790782830](https://api.github.com/repos/twyderek/offline-subtitle-factory-plan/actions/artifacts/9790782830) 可回溯。分類只能是 `WINDOWS_CI_LIFECYCLE=PASS`、`LOCAL_WINDOWS_PRISTINE=TEST_GAP`。
  - exact-source workflow `.github/workflows/windows-preview.yml:18-28,47-70,72-142` 只含 `actions/upload-artifact@v4`，沒有 GitHub Release upload step；故六項 public Windows asset 與 CI artifact 的 per-asset provenance 仍 `UNVERIFIED`。既有 public Release [v0.51.0](https://github.com/twyderek/offline-subtitle-factory-plan/releases/tag/v0.51.0) 的 target／tag／asset checks 不因 digest 不同自動判 mismatch。
  - round3 evidence `app/docs/project-management/evidence/2026-09-02-acceptance-packaged-round3.json:62-86` 記錄 public tag target exact、六項 asset downloaded／verified、SHA256SUMS cross-check PASS、latest.yml setup SHA-512 cross-check PASS、`UNSIGNED_INTERNAL_PREVIEW`、`STALE_CANDIDATE_TEXT`、`HISTORICAL_CANDIDATE_TEXT` 與 `RECOMMEND_0.51.1_PATCH`。這些條件仍需在交付說明中保持原分類。

## 綜合判定

- 結論：不通過。
- 可逐字引用的完整結論句：**本輪 round4 確認修正後 remediation worktree 的完整 `npm run check` 已 PASS，Breeze x64 positive／arm64 fail-closed、exact Windows CI lifecycle PASS、macOS arm64 packaged evidence、public asset size／digest／checksum／unsigned status 與 changelog closeout draft 均有可回溯證據；但 public exact tag 的 clean-source baseline failure 不可回寫、`docs:check:final` 仍 exit 1、Windows 本機／pristine 實機仍為 TEST_GAP、public per-asset provenance 仍 UNVERIFIED，package／latest.yml stale candidate text 仍待 patch，故 remediation round4 與治理 final closeout 仍不通過，stable 0.51.0 gate 維持 NO，版本建議維持 `RECOMMEND_0.51.1_PATCH`。**
- 阻擋問題（若有）：
  - 需由主要代理決定如何處理 exact tag 的跨 host fixture failure：形成新的可追溯 patch commit／版本並重建，或明確保留為 public tag 的已知 TEST_GAP；不得以未提交 worktree PASS 覆蓋 public tag baseline FAIL。
  - 需在不改寫既有 round3 判定的前提下，由主要代理使 changelog 的最新 review link／判定與 `docs:check:final` 實際規則一致；本輪不得修改 changelog。
  - 若要解除 packaged acceptance，仍需 Windows Setup／Portable／uninstall 的本機／pristine Windows 實機證據；CI evidence 不得升格。
  - 若要將 provenance 升為 VERIFIED，需公開可追溯的 per-asset CI build／Release upload chain；目前只能維持 `UNVERIFIED`。
- 剩餘風險：Windows Authenticode／SmartScreen、macOS Developer ID／公證／拖曳安裝、真實 Breeze runtime、長音訊品質／效能、Ollama 模型品質、package／public metadata stale text 與 patch release 是否建立。`AUTH-2026-07-23-01` 只涵蓋未簽章／未公證，不涵蓋測試失敗、實機缺口、provenance 或治理 closeout（`app/docs/project-management/09-STANDING-AUTHORIZATIONS.md:3-15`）。
- 給主要開發代理的具體修正要求：保留 `STABLE_RELEASE_RECOMMENDATION=NO` 與 `RECOMMEND_0.51.1_PATCH`；完成 source／changelog validator closeout、Windows/pristine acceptance 與 public provenance 規劃後再複審。不得修改本 round3 報告內容（除本輪已指定的欄位格式修正）、本 round4 報告、前輪 reports、Release、tag 或 asset 以掩蓋缺口。

## 審查代理聲明

- 本審查代理除修正自己 round3 報告指定欄位格式及建立本 round4 報告外，僅執行讀取、指令執行與驗證，未修改其他專案檔案。
- 本輪未修改產品、測試、changelog、Release、tag、asset 或其他既有報告；round3 原有阻擋內容與結論未改寫。
- 若上述聲明不實，本報告無效。
