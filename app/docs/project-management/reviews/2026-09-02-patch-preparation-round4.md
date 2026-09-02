# Offline Subtitle Factory 0.51.1 preparation 獨立複審報告（round4）

## 審查範圍與 source identity

- 審查對象：本機分支 `codex/release-0.51.1-preparation` 的 HEAD `c3e7b7da6b0f62dec52f9d65da4d60294e7f3bad`、現有 `docs/project-management/evidence/2026-09-02-patch-preparation-0511.json`，以及 round1／round2／round3 審查報告。
- source identity：candidate version 為 `0.51.1`；public `v0.51.0` peeled commit 為 `10b3044d31a5367a91faacea46b8def7ee103f7c`；本機未建立 `v0.51.1` tag，且本輪未 push、未建立或修改 tag／Release／public assets。
- 審查界線：只檢查 round3 修正後的 Windows signing-status lifecycle、metadata/provenance static contract、clean-source regression、既有 macOS arm64 package／renderer smoke 與 governance closeout；不重跑昂貴完整封裝，不修改 round1／round2／round3、evidence 或其他專案檔案。

## 1. 需求完整性

- 判定：部分通過
- 證據：evidence 已記錄 `c3e7b7d`、`0.51.1`、clean-source `npm ci`／`npm run check`、macOS package／renderer smoke 與 Windows static contract；同一份 evidence 也明確標示 Windows CI `NOT_RUN_THIS_PREPARATION`、local-pristine `TEST_GAP`、artifact provenance `PREPARED_UNVERIFIED`、public upload `NOT_RUN`，故 preparation 範圍與未完成的外部 gate 有揭露，但完整發布需求尚未達成。

## 2. 邏輯正確性

- 判定：通過
- 證據：repository root `.github/workflows/windows-preview.yml:137-167` 先執行簽章判定並以 signed／unsigned 兩條 `Set-Content` 建立 `SIGNING-STATUS-windows-x64.txt`，再於 `provenanceFiles` 收集 EXE、`*.blockmap`、`latest.yml`、SHA256SUMS 與 signing status，最後以 `$assetRecords` 計算每項 name、size、SHA-256；`app/scripts/test-release-metadata.mjs:33-42` 的 index-order assertion 並已通過。

## 3. 邊界情況

- 判定：部分通過
- 證據：既有 evidence 的 Breeze focused regression 保留 Windows x64 positive 與 Windows arm64 fail-closed，workflow 也覆蓋 signed／unsigned signing-status 分支；macOS acceptance package 的 notes、latest metadata、archive、DMG verify、ad-hoc codesign 與 renderer smoke 均 PASS，但沒有 Windows runner 或 pristine Windows 實機結果，故跨平台執行期邊界仍未完成驗證。

## 4. 程式碼品質

- 判定：通過
- 證據：HEAD 的實際 source diff 僅限 `.github/workflows/windows-preview.yml` 與 `app/scripts/test-release-metadata.mjs`，修正集中在 lifecycle ordering、全資產 manifest 收集及對應 regression assertion；本輪 `git diff --check` exit 0，未發現 whitespace 或差異格式問題。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：本輪 `node scripts/test-release-metadata.mjs`、`node scripts/test-project-docs-validator.mjs`、`npm run docs:check` 與 `git diff --check` 均 exit 0；evidence 另記錄 clean-source `npm ci`／完整 `npm run check` PASS、macOS renderer smoke PASS。然而 `npm run docs:check:final` 實際 exit 1，指出既有 round3 報告缺少邏輯正確性、邊界情況、程式碼品質、測試覆蓋、實際運行結果五個 validator 面向，且 Windows CI／local-pristine／public provenance 仍未測試。

## 6. 實際運行結果

- 判定：部分通過
- 證據：現有 package evidence 記錄由 `c3e7b7d` 重建的 macOS arm64 DMG／ZIP 之 archive、DMG verify、version、embedded release notes、latest-mac metadata 與 renderer verifier PASS；renderer smoke 覆蓋 page title、settings、Breeze selection/cancel、manual upload job 201/202/completed、trim、AI review/provider、glossary round-trip 與 folder flow。另一方面，本輪治理 final check 失敗，Windows CI、pristine lifecycle 與公開上傳 provenance 仍無實際運行證據。

## 綜合判定

- 結論：不通過
- 可逐字引用的完整結論句：**本輪確認 round3 的 signing-status write-before-read 與 provenance 靜態契約已修正，clean-source 及 macOS package renderer smoke 亦有通過證據，但既有 round3 報告使 docs:check:final 實際失敗，且 Windows 外部 gates 尚未完成，因此 0.51.1 preparation 目前不通過。**
- 阻擋問題（若有）：
  - `npm run docs:check:final` 的實際結果與 evidence 所記錄的 `docsCheckFinal: PASS` 不一致；現有 round3 報告缺少 validator 要求的五個六面向標題，造成治理 final gate 失敗。本輪依授權未修改 round3 或其他既有檔案。
  - Windows CI、Windows local-pristine lifecycle 與 public per-asset upload provenance 尚未執行或驗證，不能把 static contract PASS 擴大為 Windows package 或公開 provenance PASS。
- 發布界線：本結論僅適用於 0.51.1 preparation round4；不授權 push、建立或移動 tag、建立或修改 GitHub Release、公開下載資產，亦不授權修改既有 `v0.51.0`。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
