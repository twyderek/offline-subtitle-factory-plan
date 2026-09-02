# Offline Subtitle Factory 0.51.1 patch preparation 獨立審查報告（round1）

## 審查範圍與 source identity

- 審查對象：`twyderek/offline-subtitle-factory-plan` 的本機分支 `codex/release-0.51.1-preparation`、候選 source commit `75b24daaac9a00536e402565cadbe031200deef2`，以及 `docs/project-management/evidence/2026-09-02-patch-preparation-0511.json`。
- source identity：`75b24daaac9a00536e402565cadbe031200deef2` 的父提交為 `10b3044d31a5367a91faacea46b8def7ee103f7c`；本地 `v0.51.0` tag 仍解析至同一 peeled commit，未發現本地 `v0.51.1` tag。
- 審查時間：2026-09-02（Asia/Taipei）；本輪以獨立上下文從實際 repository、source tree、acceptance-only package 與 evidence 重新核對。
- 工作樹界線：候選 repo 在審查前已有 `app/docs/project-management/00-CURRENT-STATUS.md`、`06-TEST-AND-PROCESS-AUDIT.md` 修改及 evidence 未追蹤檔；現有 acceptance worktree 另有產生的 `dist/` 未追蹤輸出。這些既有狀態均未由本審查修改。
- 本報告範圍是 0.51.1 本機 patch preparation，不是公開 Release 放行；不得把本報告的條件式結論解讀為 Windows、公開資產 provenance 或 0.51.1 Release 已完成。

## 1. 需求完整性

- 判定：部分通過
- 證據：`02-REQUIREMENTS-ANALYSIS.md:56-64` 已建立 PREP-0511-001 至 PREP-0511-003，涵蓋 BUG-024 arch seam、0.51.1 embedded metadata 與 Windows provenance；`06-TEST-AND-PROCESS-AUDIT.md:16-25` 也列出 clean-source、package、Windows 與 public provenance 的完成／未完成界線。可是 Windows CI、Windows local／pristine、renderer smoke、docs final 與 public upload provenance 仍未完成，因此完整發布需求尚未滿足。

## 2. 版本與 source identity

- 判定：通過
- 證據：`git show -s` 確認候選提交為 `75b24daaac9a00536e402565cadbe031200deef2`、父提交為 `10b3044d31a5367a91faacea46b8def7ee103f7c`；`package.json` 與 `package-lock.json` 均為 `0.51.1`，`public/index.html` 顯示 `0.51.1`，`releaseInfo.releaseNotesFile` 指向 `RELEASE-NOTES-0.51.1.md`。`git rev-parse v0.51.0^{commit}` 與基準一致，且沒有本地 `v0.51.1` tag；未觀察到推送、tag 建立或 Release 建立。

## 3. BUG-024 Breeze x64 positive

- 判定：通過
- 證據：`lib/breeze-runtime-manager.mjs:90-101` 將 managed runtime 限定為 Windows x64，並檢查 state platform、arch、active version 與 executable；`scripts/test-breeze-runtime-manager.mjs:125-134` 明確執行 x64 positive fixture 及 resolver x64 路徑。獨立執行 `node scripts/test-breeze-runtime-manager.mjs`（2026-09-02）exit 0，輸出「Breeze managed runtime manager、下載／驗證／安全解壓／原子安裝測試通過」。

## 4. Windows arm64 fail-closed

- 判定：通過
- 證據：`lib/breeze-runtime-manager.mjs:90-97,117-125` 對非 x64 managed runtime 回傳 `null` 或 `INVALID/platform-unsupported`，下載／安裝亦拒絕非 Windows x64；測試 `scripts/test-breeze-runtime-manager.mjs:125-126,141-142` 驗證 Windows arm64 不會誤用 x64 runtime 且安裝會回傳 `RUNTIME_PLATFORM_UNSUPPORTED`。獨立 focused test exit 0；`lib/breeze-runtime-probe.mjs:23-45` 也將可選 arch seam 傳入 managed resolver。此判定限於 managed runtime contract，不等同 Windows arm64 實機驗收。

## 5. clean-source npm ci／npm run check／docs／diff

- 判定：通過
- 證據：evidence `2026-09-02-patch-preparation-0511.json:14-24` 記錄候選 clean worktree 的 `npmCi`、`npmRunCheck`、Breeze focused、release metadata、`docsCheck` 與 `diffCheck` 均為 PASS；`06-TEST-AND-PROCESS-AUDIT.md:20-25` 亦保留相同驗證結果。獨立在 `/Users/nycu/Documents/離線字幕工廠/.acceptance-worktrees/osf-0511-75b24da/app` 執行 `npm run check`（2026-09-02）exit 0，包含 docs、syntax、Breeze、AI、provider、Ollama、review UI 與 core integration；另執行 `npm run docs:check` 與 `git diff --check` 均 exit 0。`npm ci` PASS 依候選執行紀錄採信，未重跑以避免違反「僅報告可寫」界線。

## 6. package embedded release notes 與 latest-mac metadata

- 判定：通過
- 證據：acceptance-only macOS arm64 package 的 DMG `241396188` bytes／SHA-256 `3f6431a82fa6078bab7176cbd4a81de6c821648ecb15779615905a50634917b2`、ZIP `248260213` bytes／SHA-256 `efef003f30a3cd12c4cde91ffcb070650ca1373ce91e1dda995a025d4e9b1874`，均與 evidence `:31-55` 一致；`unzip -t`、`hdiutil verify` 與 deep strict ad-hoc codesign 均通過。ZIP 內 `package.json` 為 `0.51.1`，嵌入 `RELEASE-NOTES-0.51.1.md` 且沒有 0.51.0 stale candidate phrase；`latest-mac.yml:1-10` 的 version、檔名與 size 一致，獨立重算兩檔 SHA-512 均 match。這是 package archive／metadata 驗證，不是 renderer 或乾淨安裝 PASS。

## 7. Windows workflow lifecycle／provenance manifest 靜態契約

- 判定：部分通過
- 證據：`.github/workflows/windows-preview.yml:62-131` 有 0.51.1 Setup／Portable 檔名、安裝生命週期、archive、guide、active release notes、`latest.yml` version／naming／stale-text checks；`:137-152` 會寫入 schemaVersion、repository、workflow、runId、runAttempt、ref、sourceCommit、runnerImage、packageVersion 與 asset name／size／SHA-256；`:162-177` 將 manifest 與 EXE、blockmap、latest、checksum、signing status 一起上傳。`node scripts/test-release-metadata.mjs`（2026-09-02）exit 0，確認版本、notes、workflow marker 與 manifest 欄位契約。然而 `$assetRecords` 來源是 `Get-ChildItem ../dist -Filter '*.exe'`（`:75,137-140`），沒有將 blockmap、`latest.yml`、SHA256SUMS 或 signing status 納入 manifest 的 assets 陣列；且本輪未執行 Windows CI，故 lifecycle／provenance 只能判靜態部分通過，不能判實際 Windows package 或完整 per-asset provenance 通過。

## 8. governance／changelog／validator

- 判定：部分通過
- 證據：`08-CHANGE-LOG.md:3-18` 有最新 PREP-0511 工作條目、範圍、風險、驗證計畫與不發布界線；`node scripts/test-project-docs-validator.mjs`（2026-09-02）exit 0，`npm run docs:check` 亦回報 19 個文件、版本 0.51.1 通過。可是獨立執行 `npm run docs:check:final` exit 1，明確指出最新工作紀錄尚未標示「完成」，並缺少可解析的審查檔案與逐字引用；這些是建立本報告後仍需主要代理依治理流程收斂的結案條件。候選 commit 另修改了 source tree 的歷史 `RELEASE-NOTES-0.51.0.md` 文字，但 `v0.51.0` tag pointer 未改變，未見對既有 public tag／Release／assets 的操作。

## 9. 剩餘風險

- 判定：部分通過
- 證據：`evidence/2026-09-02-patch-preparation-0511.json:64-81` 明確標示 renderer smoke `TEST_GAP`、Windows CI `NOT_RUN_THIS_PREPARATION`、Windows local／pristine `TEST_GAP`、artifact provenance `PREPARED_UNVERIFIED`、public Release upload `NOT_RUN`、stable recommendation `NO` 與 `NOT_READY_EXTERNAL_GATES_REQUIRED`；`RELEASE-NOTES-0.51.1.md:16-26` 也揭露 Windows 實機、unsigned／SmartScreen、Breeze 真實 runtime、長音訊品質、Ollama 品質、macOS 公證與 public provenance 缺口。另有 workflow manifest 未列出所有上傳檔案，以及尚未完成 docs final 的治理風險。

## 綜合判定

- 結論：有條件通過
- 可逐字引用的完整結論句：**本輪獨立審查確認 0.51.1 source、BUG-024 managed-runtime contract、clean-source regression 與 macOS acceptance-only package 可作為本機 patch preparation 基線，但 Windows CI／實機、完整 provenance、renderer smoke 與治理 final gate 尚未完成，因此不得據此建立或公開 v0.51.1 Release。**
- 阻擋問題（若有）：
  - `npm run docs:check:final` 目前 exit 1；須在不改寫本報告的前提下完成 changelog 狀態與本報告引用的治理收斂。
  - Windows CI／artifact 與 Windows local／pristine lifecycle 尚未執行；不得以 macOS package 或 deterministic tests 代替。
  - public per-asset upload provenance 尚未取得；workflow manifest 目前只記錄 EXE，需釐清並補足所有需追溯資產的 manifest 範圍。
  - packaged renderer smoke 在本機 host timeout，且真實 Breeze runtime／模型、Ollama 品質、乾淨安裝、簽章／公證尚未驗收。
- 交付界線：本結論只允許作為 local preparation review；不授權 push、tag、GitHub Release、公開下載資產或修改既有 `v0.51.0` public Release。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 與若上述聲明不實，本報告無效。
