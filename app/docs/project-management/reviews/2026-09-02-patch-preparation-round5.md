# Offline Subtitle Factory 0.51.1 preparation 獨立最終複審報告（round5）

## 審查範圍與 source identity

- 審查對象：本機分支 `codex/release-0.51.1-preparation`、HEAD `c3e7b7da6b0f62dec52f9d65da4d60294e7f3bad`、現有 patch preparation evidence，以及 round1／round2／round3／round4 報告。
- source identity：candidate version 為 `0.51.1`；candidate branch 與 evidence 一致；public `v0.51.0` peeled commit 為 `10b3044d31a5367a91faacea46b8def7ee103f7c`，未建立 `v0.51.1` tag。
- 審查界線：只執行低成本讀取與驗證，不重跑昂貴完整封裝；本輪不 push、不建立或修改 tag／Release／public assets，不修改 round1／round2／round3／round4 或其他既有檔案。

## 1. 需求完整性

- 判定：部分通過
- 證據：current changelog 已將 latest entry 暫列進行中並引用 round4，evidence worktree 已改為 `osf-0511-c3e7b7d`，且記錄 source、clean regression、macOS package、renderer smoke 與 Windows static contract；同時仍如實標示 `docsCheckFinal=PENDING_ROUND5_CLOSEOUT`、Windows CI `NOT_RUN_THIS_PREPARATION`、local-pristine `TEST_GAP`、artifact provenance `PREPARED_UNVERIFIED` 與 public upload `NOT_RUN`，故本機 preparation 需求大致具備，但 final closeout 與外部 gates 尚未完成。

## 2. 邏輯正確性

- 判定：通過
- 證據：repository root `.github/workflows/windows-preview.yml:137-167` 先以 signed／unsigned 分支建立 `SIGNING-STATUS-windows-x64.txt`，再收集所有 EXE、`*.blockmap`、`latest.yml`、SHA256SUMS 與 signing status，並由 `$assetRecords` 計算每項 name、size、SHA-256；`app/scripts/test-release-metadata.mjs:33-42` 的 write-before-read index assertion 已通過，round2 lifecycle blocker 已解除。

## 3. 邊界情況

- 判定：部分通過
- 證據：既有 focused evidence 覆蓋 BUG-024 Windows x64 positive 與 Windows arm64 fail-closed，workflow 也保留 signed／unsigned status 生成分支；macOS renderer smoke 已覆蓋設定、Breeze selection/cancel、manual job completion、trim、AI review/provider、glossary 與 folder flow，但 Windows runner、pristine Windows lifecycle、真實簽章與 public upload provenance 仍沒有實際證據。

## 4. 程式碼品質

- 判定：通過
- 證據：HEAD `c3e7b7d` 的實際修改集中於 Windows workflow lifecycle 與 `test-release-metadata.mjs` regression assertion，沒有擴張到無關產品檔案；本輪 `git diff --check` exit 0，focused metadata test 亦通過，顯示修正範圍集中且差異格式乾淨。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：本輪 `node scripts/test-release-metadata.mjs`、`node scripts/test-project-docs-validator.mjs`、`npm run docs:check` 與 `git diff --check` 均 PASS；evidence 的 clean-source worktree `osf-0511-c3e7b7d` 另記錄 `npm ci`、完整 `npm run check`、Breeze 與 package checks PASS。`npm run docs:check:final` 不再報 round3／round4 六面向格式錯誤，但仍因 latest entry 尚未標示完成及最新 round4 結論為不通過而 exit 1，Windows 外部 gates 也仍未執行。

## 6. 實際運行結果

- 判定：部分通過
- 證據：現有 evidence 記錄由 `c3e7b7d` clean candidate 建立的 macOS arm64 DMG／ZIP，其 archive、DMG verify、版本、embedded release notes、latest-mac metadata、ad-hoc codesign 與 renderer verifier 均 PASS；renderer verifier 包含 manual upload job `201/202/completed` 等實際流程。另一方面，Windows CI／local-pristine／public upload provenance 仍分別為未執行、TEST_GAP 與未驗證，且 current final governance command 仍失敗。

## 綜合判定

- 結論：不通過
- 可逐字引用的完整結論句：**本輪確認 round3／round4 格式問題已不再阻擋 latest review，round3 lifecycle 修正、技術 evidence、clean-source regression 與 macOS renderer/package smoke 均有支持，但 docs:check:final 尚未通過且 Windows 外部 gates 仍未完成，因此 0.51.1 preparation 尚不能結案。**
- 阻擋問題（若有）：
  - `npm run docs:check:final` 實際 exit 1，現階段剩餘原因是 latest changelog entry 尚為「進行中」及其引用的 round4 結論為「不通過」；本輪已確認輸出不再包含 round3／round4 格式缺失，且未修改任何既有報告。
  - Windows CI、Windows local-pristine lifecycle、實際 artifact lifecycle 與 public per-asset upload provenance 尚未完成；static workflow PASS 不足以宣稱 Windows package 或公開 provenance PASS。
- 發布界線：本結論僅適用於 0.51.1 preparation round5；外部 gates 與治理 closeout 完成前，不得 push、建立或移動 tag、建立或修改 GitHub Release、公開資產，亦不得修改既有 `v0.51.0`。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
