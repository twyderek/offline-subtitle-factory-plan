# Offline Subtitle Factory 0.51.1 preparation 獨立複審報告（round2）

## 審查範圍與 source identity

- 審查對象：`twyderek/offline-subtitle-factory-plan` 的本機分支 `codex/release-0.51.1-preparation`、候選 source commit `53196888ba396a5b0e067bac955d135bab6f8ad1`，以及更新後的 `docs/project-management/evidence/2026-09-02-patch-preparation-0511.json`。
- source identity：候選 commit `53196888ba396a5b0e067bac955d135bab6f8ad1` 的父提交為 round1 source `75b24daaac9a00536e402565cadbe031200deef2`；`main` 仍為 `10b3044d31a5367a91faacea46b8def7ee103f7c`，`v0.51.0` peeled commit 未變，未發現本地 `v0.51.1` tag。
- 審查時間：2026-09-02（Asia/Taipei）；本輪為針對 round1 provenance manifest 缺口的獨立複審，不覆寫 round1。
- 審查界線：只檢查 0.51.1 preparation；不推送、不建立或移動 tag、不建立或修改 GitHub Release、不修改既有 `v0.51.0` public Release／assets。

## 1. 需求完整性

- 判定：部分通過
- 證據：round1 指出的 provenance manifest 只含 EXE 問題，已在 `5319688` 的 workflow 以 `provenanceFiles` 納入 EXE、`*.blockmap`、`latest.yml`、SHA256SUMS 與 signing status；`app/scripts/test-release-metadata.mjs:33-39` 也新增對應靜態斷言。可是新修正的檔案生成順序仍會在全新 Windows runner 上失敗，且 Windows CI、Windows local／pristine、renderer smoke、public upload provenance 與 docs final 仍未完成，所以 preparation 需求尚未完整收斂。

## 2. 版本與 source identity

- 判定：通過
- 證據：`git show -s` 確認分支指向 `53196888ba396a5b0e067bac955d135bab6f8ad1`、父提交為 `75b24daaac9a00536e402565cadbe031200deef2`；更新 evidence `:5-12` 對應同一候選版本、分支與 public baseline。source package／lockfile／UI marker 仍為 0.51.1，`v0.51.0` tag 仍解析至 `10b3044…`，`releaseBoundary:75-81` 明確記錄未建立 public tag／Release、未修改 public assets、未推送。

## 3. BUG-024 Breeze x64 positive

- 判定：通過
- 證據：round1 已驗證 `lib/breeze-runtime-manager.mjs:90-101` 的 Windows x64 managed-runtime 限制與 state 驗證；round2 沒有回退該 production contract。候選 clean-source evidence `:16-20` 記錄 Breeze manager／Breeze ASR PASS，且前輪獨立執行的 `node scripts/test-breeze-runtime-manager.mjs` 已驗證 x64 positive fixture；本輪未重跑長時間完整測試。

## 4. Windows arm64 fail-closed

- 判定：通過
- 證據：`lib/breeze-runtime-manager.mjs:90-97,117-125` 仍對非 x64 managed runtime 回傳 `null` 或 `platform-unsupported`，沒有因 provenance 修正而放寬平台限制；round1 已獨立確認 `scripts/test-breeze-runtime-manager.mjs:125-126,141-142` 的 arm64 negative assertions。更新後 evidence `:18-20` 保留 Breeze focused PASS，但這仍是 deterministic contract，並非 Windows arm64 實機驗收。

## 5. clean-source npm ci／npm run check／docs／diff

- 判定：通過
- 證據：更新 evidence `:14-24` 記錄候選 tracked-clean worktree 的 `npmCi`、`npmRunCheck`、Breeze、metadata、`docsCheck` 與 `diffCheck` 均 PASS，且 `docsCheckFinal` 正確保留為 `PENDING_ROUND2_CLOSEOUT`。本輪獨立執行 `node scripts/test-release-metadata.mjs`、`node scripts/test-project-docs-validator.mjs`、`npm run docs:check` 與 `git diff --check` 均 exit 0；依使用者指示未重跑長時間 `npm run check`。

## 6. package embedded release notes 與 latest-mac metadata

- 判定：通過
- 證據：更新 evidence `:26-65` 記錄 5319688 產生的 macOS arm64 acceptance-only DMG／ZIP、archive、DMG verify、ad-hoc codesign、active release notes 與 latest metadata 均 PASS。實際檔案 DMG `241396071` bytes／SHA-256 `e2dc02c838e7f5538579b042929d7805b450bb8967c839ada798230a594e7a80`、ZIP `248260215` bytes／SHA-256 `92efed7c3ab02dfd2caead2a2001187418422705bd49b4b907f1a61d60c2518b` 與 evidence 一致；獨立重算 `latest-mac.yml` 兩項 SHA-512／size 均 match，ZIP 內 package version、active notes 與 Tiny-only bundle 內容核對通過。renderer smoke 仍是 `TEST_GAP`。

## 7. Windows workflow lifecycle／provenance manifest 靜態契約

- 判定：不通過
- 證據：雖然 `.github/workflows/windows-preview.yml:137-159` 現在確實以 `$provenanceFiles` 收集 EXE、blockmap、latest、checksum 與 signing status，且 `app/scripts/test-release-metadata.mjs:33-38` 的 focused 靜態測試 exit 0；但 workflow `:142` 先執行 `Get-Item ../dist/SIGNING-STATUS-windows-x64.txt`，而 signing status 直到 `:161-166` 才由 `Set-Content` 建立。獨立靜態順序檢查確認 `Get-Item` 位於兩個 signing status `Set-Content` 之前，因此全新 Windows runner 沒有既有檔案時會在 manifest 建立階段失敗；目前 metadata test 未模擬此生命周期順序，round1 問題尚未充分修正。

## 8. governance／changelog／validator

- 判定：部分通過
- 證據：`08-CHANGE-LOG.md:3-18` 仍保留 preparation 的範圍、不發布界線與 round1 關聯；更新後 `00-CURRENT-STATUS.md:9-16` 與 evidence `:68-81` 正確揭露新 commit、Windows CI `NOT_RUN_THIS_PREPARATION`、public provenance 未驗證與 stable recommendation `NO`。本輪 `node scripts/test-project-docs-validator.mjs`、`npm run docs:check`、`git diff --check` 均通過，但 `npm run docs:check:final` 仍 exit 1，原因是最新 changelog 尚未標示完成且尚缺可解析的 round2 報告／逐字引用；建立本報告後仍需主要代理依治理流程收斂，不能由本複審代改其他文件。

## 9. 剩餘風險

- 判定：部分通過
- 證據：`RELEASE-NOTES-0.51.1.md:16-26`、`00-CURRENT-STATUS.md:11-16` 與 evidence `:64-81` 均持續揭露 renderer smoke `TEST_GAP`、Windows CI／local-pristine 未執行、public upload provenance 未執行、unsigned／SmartScreen、真實 Breeze／Ollama 品質、macOS 公證與 stable recommendation `NO`。本輪新增且尚未消除的風險是 workflow provenance manifest 的 signing-status 生成順序；此外，尚無 Windows 實際 runner 證據可證明修正後 lifecycle 或所有上傳資產 manifest 成功。

## 綜合判定

- 結論：不通過
- 可逐字引用的完整結論句：**本輪 round2 確認 0.51.1 版本、Breeze x64／arm64 contract、clean-source 證據與 macOS package 核對成立，但 provenance workflow 在全新 Windows runner 上會先讀取尚未建立的 signing status 檔案，故 round1 修正不足、preparation 複審不通過，且不得進行任何公開發布操作。**
- 阻擋問題（若有）：
  - 必須先修正 workflow 中 signing-status 的產生與 manifest 收集順序，並補一個能捕捉全新 runner 檔案生命週期的 regression，而不只是 regex 靜態存在性斷言。
  - 修正後仍須重新執行 Windows CI／artifact lifecycle，並取得 Windows local／pristine evidence；本輪未授權 push、tag 或 Release。
  - `npm run docs:check:final` 尚未通過；主要代理須另行更新治理收尾內容與 round2 引用，但不得覆寫 round1 或本報告。
  - renderer smoke、public per-asset upload provenance、簽章／公證、真實 Breeze runtime／品質與長音訊仍屬未完成風險。
- 發布界線：本結論只適用於 0.51.1 preparation round2；不授權 push、建立或移動 tag、建立或修改 GitHub Release、公開下載資產，亦不授權修改既有 `v0.51.0`。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
