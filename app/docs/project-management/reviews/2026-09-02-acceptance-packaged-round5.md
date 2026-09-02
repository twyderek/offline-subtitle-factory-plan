# 獨立審查報告：Offline Subtitle Factory 0.51.0 Packaged Acceptance Remediation round5

- 審查對象 commit／版本：`HEAD`／`v0.51.0` 均解析為 `10b3044d31a5367a91faacea46b8def7ee103f7c`；`app/package.json:2-3`、`app/package-lock.json:2-9` 均為 `0.51.0`。
- 對應 08-CHANGE-LOG 條目：`app/docs/project-management/08-CHANGE-LOG.md:3-31`（`ACCEPT-051-PACKAGED-ROUND3-20260902`）。
- 審查輪次：round5。
- 審查代理啟動時間、上下文來源：2026-09-02T04:58:00+00:00 起；重新執行 full preflight，重新讀取目前 worktree、最新 changelog、round2／round3／round4 reports、round3 macOS／packaged evidence、BUG-024、Windows workflow 與發布／授權治理文件，並重新執行只讀驗證；未沿用主要代理對話記憶或預設其結論。
- 審查限制：未修改 changelog、產品、測試、Release、tag、asset 或任何既有 report；未重跑大型 macOS package。唯一新增檔案為本 round5 report。

## 1. 需求完整性

- 判定：部分通過。
- 證據：
  - 最新 changelog 已標示 round3「完成」，並列出 exact source baseline、remediation worktree、Windows CI／local gap、public provenance、stale package text、版本建議與 review history：`app/docs/project-management/08-CHANGE-LOG.md:3-31`。其中 `:29` 明確記錄條件接受不等同 stable 0.51.0 放行。
  - round3 evidence 的 source／version／baseline／current validation／Windows classification／public asset classification 可回溯至 `app/docs/project-management/evidence/2026-09-02-acceptance-packaged-round3.json:2-31,33-60,62-97`；macOS package provenance／content／smoke／migration／Ollama 可回溯至 `app/docs/project-management/evidence/2026-09-02-acceptance-packaged-0510-macos-arm64.json:2-24,25-61,63-99`。
  - round3 的欄位格式已符合 validator 要求：`app/docs/project-management/reviews/2026-09-02-acceptance-packaged-round3.md:80` 為 `- 阻擋問題（若有）：`；本輪未改寫其不通過判定。round4 仍保留為另一份歷史 report，未覆寫。
  - 文件／證據內容可有條件接受，但治理 final closeout 尚未通過：2026-09-02T04:59:48Z 的 `npm run docs:check` exit 0，`npm run docs:check:final` exit 1，實際錯誤為「最新一輪獨立審查結論為不通過」。因此不能將 changelog 的 `GOVERNANCE_CLOSEOUT=PASS_AFTER_DOCUMENT_CLOSEOUT`（`:30`）當成 validator 已通過的事實。

## 2. 邏輯正確性

- 判定：部分通過。
- 證據：
  - Breeze managed path 的正式 contract 仍在 `app/lib/breeze-runtime-manager.mjs:90-102,117-125,204-208,282-284`：只有 `win32`／`x64` 可使用 managed runtime；arm64 不能誤用 x64 runtime。`app/lib/breeze-runtime-probe.mjs:23-45` 的 `arch` 參數只提供明確 target seam。
  - current remediation test `app/scripts/test-breeze-runtime-manager.mjs:125-142` 實際驗證 x64 positive、arm64 `null`、unsupported fetch 不發生與 arm64 install rejection；2026-09-02T04:59:48Z focused command chain exit 0。
  - exact public tag baseline 在 `/Users/nycu/Documents/離線字幕工廠/.acceptance-worktrees/osf-051-10b3044d/app` 於 2026-09-02T04:59:18.628Z 執行 `node scripts/test-breeze-runtime-manager.mjs` exit 1，`scripts/test-breeze-runtime-manager.mjs:125` actual `null`／expected managed `python.exe`。這是 public tag 的既有 clean-source failure；不得把 current dirty worktree PASS 回寫成 public tag 已修正。
  - AI parser bounded traversal／循環保護／context validation 位於 `app/lib/ai/subtitle-optimizer.mjs:104-132,190-275`，deterministic R01／R02／R03 位於 `app/scripts/test-ai-acceptance-contract.mjs:17-83`；它們支持 current remediation 邏輯，不改變對 public package provenance 的判定。

## 3. 邊界情況

- 判定：部分通過。
- 證據：
  - Breeze manager test 的 platform／architecture、archive integrity、probe failure、atomic rollback、timeout、cancel、disk-full 與 HTTPS／redirect boundary 可回溯至 `app/scripts/test-breeze-runtime-manager.mjs:125-190,244-267`；focused validation exit 0。
  - parser／repair 的無語言 fence、CRLF、empty／non-text parts、nested candidate priority、循環／深度上限與 multi-cue ID／順序正向斷言位於 `app/scripts/test-ai-response-parser.mjs:235-285`、`app/scripts/test-ai-optimizer.mjs:274-303`；current full suite 已執行。
  - macOS arm64 evidence `app/docs/project-management/evidence/2026-09-02-acceptance-packaged-0510-macos-arm64.json:63-68` 將 Windows Setup／Portable／uninstall 標為 `TEST_GAP`；round3 evidence `:59-60` 將 local Windows machine 標為 `NOT_AVAILABLE`。CI Windows lifecycle 不得升格為 local／pristine acceptance。
  - packaged Ollama evidence `:76-91` 只有既有 loopback `llama3.2:1b`、3 cues、0 changed suggestions 的實際 path；不能推論模型品質、Breeze 真實 runtime 或所有 live repair scenario 已通過。

## 4. 程式碼品質

- 判定：部分通過。
- 證據：
  - `app/lib/breeze-runtime-probe.mjs:23-56` 的可選 `arch` seam 與 `app/lib/breeze-runtime-manager.mjs:90-102` 的集中 fail-closed gate，使模擬 Windows x64 與實際 host architecture 分離；測試同時保留 x64 positive／arm64 negative。
  - parser 的 `MAX_PARSER_DEPTH`、object／string seen sets 與 explicit `cues` gate 具體位於 `app/lib/ai/subtitle-optimizer.mjs:104-132,190-220`，對應測試可回溯且 current full regression PASS。
  - `git status --short` 在本輪核對仍顯示 source／test／governance／evidence／reports 為既有 dirty worktree 變更；`HEAD` exact 並不表示這些 remediation diff 已進入 public tag。BUG-024 的根因／修正／防回歸界線記錄於 `app/docs/project-management/07-DEBUG-AND-FIX-HISTORY.md:90-100`。
  - source `app/README.md:3-10`、`app/RELEASE-NOTES-0.51.0.md:1-21`、`app/docs/project-management/00-CURRENT-STATUS.md:1-16` 已揭露 public／conditional／NO；但 exact package embedded notes 與 public `latest.yml` 的 candidate text 仍是交付一致性風險，evidence `:82-86` 正確分類為 stale／historical 並建議 `RECOMMEND_0.51.1_PATCH`。

## 5. 測試覆蓋

- 判定：部分通過。
- 證據：
  - current remediation full regression：2026-09-02T04:59:18.632Z 執行 `OFFLINE_SUBTITLE_TEST_TOOLS_DIR=/Users/nycu/Documents/離線字幕工廠/offline-subtitle-factory-app/tools npm run check` exit 0；包含 `docs:check`、syntax、Breeze、Whisper、AI deterministic／parser／optimizer、provider／migration、Ollama streaming、review UI 與 core localhost integration。
  - 2026-09-02T04:59:48Z focused `node scripts/test-breeze-runtime-manager.mjs`、`node scripts/test-breeze-asr.mjs`、兩個 `node --check`、`npm run docs:check` 與 `git diff --check` 均通過。
  - exact public tag baseline 同一 Breeze test 於 2026-09-02T04:59:18.628Z exit 1；這個 failure 的不可回寫條件仍成立，不能以 current dirty worktree regression PASS 覆蓋。
  - `npm run docs:check:final` 於 2026-09-02T04:59:48Z exit 1。此為治理 closeout gate 的實際 failure，即使 changelog draft 已標示完成，也不能宣稱 final closeout 已通過。

## 6. 實際運行結果

- 判定：部分通過。
- 證據：
  - macOS arm64 packaged acceptance：`app/docs/project-management/evidence/2026-09-02-acceptance-packaged-0510-macos-arm64.json:2-24,25-61,63-91` 記錄 exact clean source build provenance、ZIP／DMG／blockmap hash／size、unzip／hdiutil、embedded version／`darwin-arm64` runtime、renderer／trim／migration／packaged Ollama PASS；Windows package／uninstall 保留 `TEST_GAP`。
  - exact Windows CI lifecycle：`app/docs/project-management/evidence/2026-09-02-acceptance-packaged-round3.json:33-60` 記錄 run `33483093931`、head exact SHA、`windows-2022`、job `99776892605`、unsigned Setup／Portable、install／renderer、uninstall、Portable、archive 與 artifact upload PASS；公開 API 2026-09-02T04:59:43.480Z 重新確認 run／job success，以及 artifact `9790782830` 的 487,020,484 bytes、digest `sha256:4a69b338d509846b200504118023768106e3502402b6d9d9ac4d440b15e62793`、未過期。公開 [run](https://github.com/twyderek/offline-subtitle-factory-plan/actions/runs/33483093931)、[job](https://github.com/twyderek/offline-subtitle-factory-plan/actions/runs/33483093931/job/99776892605) 與 [artifact API](https://api.github.com/repos/twyderek/offline-subtitle-factory-plan/actions/artifacts/9790782830) 可回溯；分類只能是 `WINDOWS_CI_LIFECYCLE=PASS`、`LOCAL_WINDOWS_PRISTINE=TEST_GAP`。
  - public Release：公開 [v0.51.0](https://github.com/twyderek/offline-subtitle-factory-plan/releases/tag/v0.51.0) API 於同一時間確認 target exact、non-draft、non-prerelease。六項 asset 的 size／GitHub digest 仍為：Setup 243,687,067／`5328c4f015a27290b5ef8ce90cf552f818aa4cc16f1635fd46c2632905616835`；Portable 242,979,811／`cb6f7d6aa1127a0d254fbb1379a986c2c17277572b11c1e723c6c01d7db89c78`；blockmap 255,227／`c8dac8499da7969fb533ce7af9b08b777b10bb7970f7f14be6347009a3e21bc0`；`latest.yml` 2,155／`afef8a7b5de7ff65cdfba2fa4204bd23dd5c3d04947fe1ab5f0ef1e086a61283`；SHA file 221／`cbf9208e2e7e66ab29dca79e294c08fc23362f09a532ebf9c0462aaf53fe5f5b`；signing file 91／`a1dd9e1dc7ba28cfd8faed976343777e636a7642488e426ec628a5e949937347`。
  - public [SHA256SUMS](https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.51.0/SHA256SUMS-windows-x64.txt) 的兩個 EXE hash 與 Release digest 一致；public [latest.yml](https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.51.0/latest.yml) 的 setup size／SHA-512 與既有 evidence cross-check 一致；public [signing status](https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.51.0/SIGNING-STATUS-windows-x64.txt) 為 `UNSIGNED INTERNAL PREVIEW`。workflow `.github/workflows/windows-preview.yml:18-28,47-70,72-142` 只有 `actions/upload-artifact@v4`，沒有 Release upload step，因此 public per-asset provenance 必須維持 `UNVERIFIED`，不得因 digest 不同自動判為 mismatch。
  - public `latest.yml` `releaseNotes` 仍包含「候選準備中；尚未建立 `v0.51.0` tag 或 GitHub Release」；exact package embedded release notes 同樣為 candidate text。round3 evidence `:82-86` 的 `STALE_CANDIDATE_TEXT`／`HISTORICAL_CANDIDATE_TEXT`／`RECOMMEND_0.51.1_PATCH` 分類正確，不能透過修改既有 binary 靜默消除。

## 綜合判定

- 結論：不通過。
- remediation 文件／證據 closeout：證據內容可有條件接受；current regression、macOS package、Windows CI、public asset checks 與風險分類均可追溯，但治理 final closeout 尚未通過，因 `docs:check:final` 仍 exit 1。
- stable 0.51.0 gate：不放行；`STABLE_RELEASE_RECOMMENDATION=NO`。
- 可逐字引用的完整結論句：**本輪 round5 確認 remediation worktree 的完整 `npm run check` PASS，Breeze x64 positive／arm64 fail-closed、macOS arm64 package、exact Windows CI lifecycle PASS、public asset size／digest／SHA256SUMS／latest.yml／unsigned status 與 changelog closeout draft 均有可回溯證據；但 exact public tag 的 clean-source baseline failure 仍可重現且不可回寫，Windows local／pristine 仍為 TEST_GAP，public per-asset provenance 仍 UNVERIFIED，public latest.yml／exact package embedded candidate text 仍 stale，且 `docs:check:final` 仍 exit 1，因此證據僅可有條件接受、治理 final closeout 與本輪獨立複審不通過，stable 0.51.0 gate 維持 NO，版本建議維持 `RECOMMEND_0.51.1_PATCH`。**
- 阻擋問題（若有）：
  - 由主要代理處理 `docs:check:final` 的實際不通過狀態，讓 changelog 所引用的最新 review／逐字判定與 validator 規則一致；本輪不修改 changelog，也不把 round3／round4 歷史判定改成通過。
  - 若要宣稱 public exact source regression 已修正，必須把 BUG-024／fixture remediation 形成新的可追溯 commit／patch release 並重新建置驗證；不可修改既有 `v0.51.0` tag／Release／assets。
  - 若要解除 packaged acceptance 的平台條件，仍需 Windows Setup／Portable／uninstall 的 local／pristine Windows 實機 evidence；CI evidence 僅保持 `WINDOWS_CI_LIFECYCLE=PASS`。
  - 若要解除 public provenance 條件，需可公開回溯每一 Release asset 與 exact CI build 的 upload chain；目前維持 `UNVERIFIED`。
- 剩餘風險：Windows Authenticode／SmartScreen、Windows 10／11 clean install、macOS Developer ID／公證／拖曳安裝、真實 Breeze runtime／長音訊品質、Ollama 模型品質，以及 package／public metadata stale candidate text。`AUTH-2026-07-23-01` 僅涵蓋未簽章／未公證，不涵蓋實機缺口、provenance、文件 closeout 或測試失敗（`app/docs/project-management/09-STANDING-AUTHORIZATIONS.md:3-15`）。
- 給主要開發代理的具體修正要求：保留 `STABLE_RELEASE_RECOMMENDATION=NO` 與 `RECOMMEND_0.51.1_PATCH`；完成 validator／source provenance／Windows實機條件後再複審。不得修改本報告、round3／round4 reports、產品、測試、changelog、Release、tag 或 assets 以掩蓋條件。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 本輪未修改產品、測試、changelog、Release、tag、asset 或既有 report；唯一新增檔案為本 round5 報告。
- 若上述聲明不實，本報告無效。
