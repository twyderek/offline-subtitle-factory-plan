# Offline Subtitle Factory 0.51.1 preparation 獨立複審報告（round3）

## 審查範圍與 source identity

- 審查對象：`twyderek/offline-subtitle-factory-plan` 的本機分支 `codex/release-0.51.1-preparation`、候選 source commit `c3e7b7da6b0f62dec52f9d65da4d60294e7f3bad`，以及更新後的 `docs/project-management/evidence/2026-09-02-patch-preparation-0511.json`。
- source identity：`c3e7b7da6b0f62dec52f9d65da4d60294e7f3bad` 的父提交為 round2 source `53196888ba396a5b0e067bac955d135bab6f8ad1`；`main` 與 `v0.51.0` peeled commit 仍為 `10b3044d31a5367a91faacea46b8def7ee103f7c`，未發現 `v0.51.1` tag。
- 審查時間：2026-09-02（Asia/Taipei）；本輪只複查 round2 lifecycle bug 修正及其餘 preparation gates，不覆寫 round1／round2。
- 審查界線：不推送、不建立或移動 tag、不建立或修改 GitHub Release、不修改既有 `v0.51.0` public Release／assets；本輪只更新本報告，未修改其他檔案。

## 1. 需求完整性

- 判定：部分通過
- 證據：candidate requirements 已涵蓋 BUG-024、版本／embedded notes、Windows provenance 與不發布界線；round2 的 signing-status lifecycle 缺口已在 `c3e7b7d` 修正並新增 order assertion。可是 evidence `:68-81` 仍明確標示 Windows CI `NOT_RUN_THIS_PREPARATION`、Windows local／pristine `TEST_GAP`、public upload provenance `NOT_RUN` 與 `NOT_READY_EXTERNAL_GATES_REQUIRED`，因此 preparation 的 source／package 基線完成，但完整外部發布需求尚未滿足。

## 2. 版本與 source identity

- 判定：通過
- 證據：`git show -s` 確認候選 commit 為 `c3e7b7da6b0f62dec52f9d65da4d60294e7f3bad`、父提交為 `53196888ba396a5b0e067bac955d135bab6f8ad1`；evidence `:5-12` 同步記錄候選版本、分支與 public baseline。package／lockfile／UI marker 為 0.51.1，`git rev-parse v0.51.0^{commit}` 仍為 `10b3044…`，且 `releaseBoundary:75-81` 記錄未建立 public tag／Release、未修改 public assets、未推送。

## 3. BUG-024 Breeze x64 positive

- 判定：通過
- 證據：`lib/breeze-runtime-manager.mjs:90-101` 保持 Windows x64 managed-runtime 的 platform／arch／state／executable 檢查；round1 已以 `scripts/test-breeze-runtime-manager.mjs:125-134` 驗證 x64 positive，round2／round3 的 workflow 變更沒有回退該 contract。更新 evidence `:16-20` 持續記錄 Breeze manager、Breeze ASR 與 metadata focused PASS。

## 4. Windows arm64 fail-closed

- 判定：通過
- 證據：`lib/breeze-runtime-manager.mjs:90-97,117-125` 對 Windows arm64 managed runtime 回傳 `null` 或 `platform-unsupported`；round1 的 deterministic negative assertions 已確認 `scripts/test-breeze-runtime-manager.mjs:125-126,141-142` 不會誤用 x64 runtime。更新後 evidence `:18-20` 保留 Breeze focused PASS，且 round3 只修正 workflow lifecycle，未放寬 arm64 邊界；此判定仍不等同 Windows arm64 實機驗收。

## 5. clean-source npm ci／npm run check／docs／diff

- 判定：通過
- 證據：evidence `:14-24` 記錄 `c3e7b7d` clean worktree 的 `npmCi`、完整 `npmRunCheck`、Breeze、release metadata、`docsCheck` 與 `diffCheck` 均 PASS，`docsCheckFinal` 正確保留為 `PENDING_ROUND3_CLOSEOUT`。本輪依使用者指示不重跑長時間完整 check；獨立執行 `node scripts/test-release-metadata.mjs`、`node scripts/test-project-docs-validator.mjs`、`npm run docs:check` 與 `git diff --check` 均 exit 0。

## 6. package embedded release notes 與 latest-mac metadata

- 判定：通過
- 證據：evidence `:26-66` 記錄由 `c3e7b7d` 建立的 macOS arm64 acceptance-only package 五項產物與 archive／DMG／codesign／notes／metadata checks 均 PASS，且 `rendererSmoke` 已更新為 PASS。實際 DMG `241396413` bytes／SHA-256 `a925dab28358414a3edaa793867c147bf79fac2a5d675ebff30d7373f7a0b955`、ZIP `248260211` bytes／SHA-256 `b7de0503eadcf2f7cd23f6afabf7db34ba9c0d5e65f4c0fd2cb7da6a7f5c3c03` 及 blockmap／latest hash 均與 evidence 一致；`unzip -t`、`hdiutil verify`、deep strict ad-hoc codesign 通過，ZIP 內 package version／active `RELEASE-NOTES-0.51.1.md` 與 latest-mac version／size／SHA-512 均核對通過。renderer verifier 已 exit 0，覆蓋 page title、settings modal、Breeze selection/cancel、manual upload job `201/202/completed`、trim assets、AI review/provider UI、glossary round-trip 與 folder flow。

## 7. Windows workflow lifecycle／provenance manifest 靜態契約

- 判定：通過
- 證據：`.github/workflows/windows-preview.yml:137-167` 現在先對 EXE 執行 `Get-AuthenticodeSignature`，再以 signed／unsigned 兩條 `Set-Content` 建立 `SIGNING-STATUS-windows-x64.txt`，之後才由 `provenanceFiles` 收集 EXE、`*.blockmap`、`latest.yml`、SHA256SUMS 與 signing status，最後計算所有項目的 name／size／SHA-256。`app/scripts/test-release-metadata.mjs:33-42` 新增 signing write-before-read index assertion；本輪獨立執行 `node scripts/test-release-metadata.mjs` exit 0，並以靜態順序檢查確認 signing write 位於 `Get-Item SIGNING-STATUS` 之前，故 round2 的全新 runner lifecycle blocker 已解除。實際 Windows CI／artifact 仍未執行，不能把靜態契約 PASS 擴大為 Windows package 或 public provenance PASS。

## 8. governance／changelog／validator

- 判定：部分通過
- 證據：`08-CHANGE-LOG.md:3-18` 保留 preparation 的目標、風險、驗證計畫與不發布界線；`00-CURRENT-STATUS.md:9-16` 與 evidence `:68-81` 已同步到 `c3e7b7d` 並揭露外部 gate 未完成。本輪 `node scripts/test-project-docs-validator.mjs`、`npm run docs:check`、`git diff --check` 均 exit 0；但 latest changelog 仍是「進行中」，evidence 的 `docsCheckFinal` 為 `PENDING_ROUND3_CLOSEOUT`，且在本報告建立前不存在可解析的 round3 report／逐字引用，因此 governance final closeout 尚未完成。

## 9. 剩餘風險

- 判定：部分通過
- 證據：`RELEASE-NOTES-0.51.1.md:16-26`、`00-CURRENT-STATUS.md:11-16` 與 evidence `:68-81` 持續揭露 Windows CI、Windows local／pristine、public upload provenance、unsigned／SmartScreen、真實 Breeze／Ollama 品質與 macOS 公證缺口；macOS renderer smoke 已由 verifier exit 0 補成 PASS，round2 的 signing-status 生成順序風險也已解除，但尚無 Windows runner 實際輸出證明完整 manifest lifecycle 成功，也尚無公開 per-asset provenance。

## 綜合判定

- 結論：有條件通過
- 可逐字引用的完整結論句：**本輪 round3 確認 signing-status 生成順序與 provenance manifest 靜態契約已修正並通過 focused assertion，macOS package renderer verifier 亦已 exit 0，且 source、clean regression 與 package evidence 一致；但 Windows CI／實機、公開 provenance 與 governance final closeout 尚未完成，因此僅可有條件接受為本機 preparation，仍不得建立或公開 v0.51.1 Release。**
- 阻擋問題（若有）：
  - 若要進入公開發布流程，必須先取得 Windows CI／artifact lifecycle 的實際成功證據，不能只依賴靜態 workflow test。
  - Windows local／pristine lifecycle、public per-asset upload provenance 與必要的簽章／公證條件仍未完成或未驗證；macOS renderer smoke 已通過但不替代 Windows 驗收。
  - `docs:check:final` 尚待 round3 報告引用與 changelog 結案收斂；不得由本複審修改其他文件。
- 發布界線：本結論只適用於 0.51.1 preparation round3，不授權 push、建立或移動 tag、建立或修改 GitHub Release、公開下載資產，亦不授權修改既有 `v0.51.0`。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
