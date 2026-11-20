# 獨立審查報告：PR #4 與 main 分支衝突整合

- 審查對象 commit／版本：merge commit `5ff61b3eb2c333a27c6c9a6b91073d69628f722b`／root `0.52.1`，加上目前尚未提交的 `.github/workflows/windows-preview.yml` 與 `docs/project-management/08-CHANGE-LOG.md` round1 修正差異
- 審查時工作樹識別：workflow 工作檔 `git hash-object` 為 `fdcc3f52206da99f0248cbe035973f74e9067707`；changelog 工作檔為 `1c148e8f1017896ba98be5cdc32a29e30ff4ca95`
- 對應 08-CHANGE-LOG 條目：`2026-11-20 — PR #4 與 main 分支衝突整合`（`docs/project-management/08-CHANGE-LOG.md:3-16`）
- 審查輪次：round2
- 檢查時間：2026-11-20T09:35:34+08:00 至 2026-11-20T09:48:37+08:00（Asia/Taipei）
- 審查代理啟動時間、上下文來源：由獨立 round2 審查上下文啟動；未沿用主要代理對修正品質的評價性結論，判定以目前 checkout、Git objects、工作樹差異與本輪實際命令為準。
- 審查環境：Windows／PowerShell；detached HEAD；`.git` object database 為唯讀，因此未使用會寫入 object database 的 remerge tree，改以既有 commit／tree／blob、三方 `git merge-tree`、diff、index 與工作樹檢查交叉驗證。

## 1. 需求完整性

- 判定：通過（限目前本地 merge 與 round1 修正差異；不包含遠端 PR／Actions 或 release acceptance）
- 證據：
  - `git show -s --format=... 5ff61b3...`、`git merge-base --is-ancestor <parent> 5ff61b3...`：commit 有且只有兩個父提交，第一父為 `030dcffdd166ccfd7eb3384c147a8012bf70464c`（`docs: record PR conflict resolution plan`），第二父為 `10b3044d31a5367a91faacea46b8def7ee103f7c`（`release: prepare 0.51.0`）；兩個 ancestor 檢查均 exit 0。
  - merge tree 與第一父 tree 均為 `7c794d7388f32afbd9964830199cbc4fbde92c96`，`git diff --quiet <first-parent> <merge>` exit 0。完整 `app/` tree 亦同為 `23e04623d9e419c687a3a150e52147637a34aceb`；第二父 `app/` tree 為不同的 `495eed93b559bc7ef28171a93419298fbd2325d3`。root `package.json` blob 與第一父同為 `6071f41cc6647add084cdb6e5654ed3352625e4d`，`RELEASE-NOTES-0.52.1.md` blob 與第一父同為 `e5c4558aeed348f9ec85bd9b22054621203a9229`。因此第一父 root v0.52.1 與完整 tracked `app/` tree 均保留。
  - 第一父的父提交 `d8518aa3cf9c209d1c2c8a8da45970347b56d954`、第一父與 v0.52.1 發布提交 `75d01a9ecd112f998ca1765e4d1d71e75c674e61` 的 `app/` tree 均相同；`git diff ... -- app` 無輸出。目前 `git diff --name-only -- app` 與 `git ls-files --others --exclude-standard -- app` 亦均為 0 筆。這證明本 merge／本輪修正沒有新增 tracked 或 untracked app 差異；更早原工作區的歷史命令過程不在 Git tree 內，無法僅由 repository 反證，但目前結果與「未帶入原工作區 app 變更」一致。

## 2. 邏輯正確性

- 判定：通過（本地靜態契約）
- 證據：
  - `.github/workflows/windows-preview.yml:1,12,34,37,44,48,56,61-62,71,85,91,113,125-129,134-136` 已以 root 執行：版本／tag／artifact 為 0.52.1，cache 使用 root `package-lock.json`，沒有 app working directory，執行 root `npm ci`、`npm run check`、`npm run electron:build`／`electron:build:unsigned`，並從 `../dist` 驗證與複製產物。
  - `package.json:3,32,40-41,57,88,114,117` 顯示 root 版本 `0.52.1`、相關 scripts 存在、electron-builder output 為 `../dist`、0.52.1 release notes 納入 bundle，Setup／Portable artifactName 分別為 `offline-subtitle-factory-setup-${version}.${ext}` 與 `offline-subtitle-factory-portable-${version}.${ext}`。workflow 的 `*setup-0.52.1.exe`／`*portable-0.52.1.exe` 及 `../dist` 因而與 root package 設定一致。
  - 2026-11-20T09:47:xx+08:00 執行自訂 Node 靜態契約檢查，逐項驗證 package／lock 版本、必要 root scripts、builder output、artifactName、release notes、workflow cache／build／artifact／forbidden references，全部為 `true`，exit 0；另以 `rg` 掃描 `0.51.0|app/package-lock.json|working-directory: app|app/.artifacts` 無命中。
  - `git ls-files -u` 為 0 筆；對工作樹及 `5ff61b3...` 執行 `git grep -E '^(<<<<<<<|=======|>>>>>>>)( |$)'` 均為 0 筆，沒有 unresolved index 或 tracked conflict markers。

## 3. 邊界情況

- 判定：通過（merge 邊界）；外部／跨平台邊界仍未驗收
- 證據：
  - 以共同祖先 `0091663a26456aa265e6763a7fdaddb23eb4570a` 執行三方 `git merge-tree <base> <first-parent> <second-parent>`：共 28 個雙方變更 section，其中 26 個產生內容 conflict marker；另有 `app/package-lock.json` 的 modify/delete conflict，共 27 個實際衝突；剩餘 `app/lib/ai/local-ai.mjs` 為可自動合併的雙方變更，不計入衝突。這與 changelog 的「27 個衝突」一致。
  - merge tree 完整等於第一父，故上述 27 個衝突的最後 tree 結果均為 feature side（包含保留 `app/package-lock.json` 的 feature-side 刪除）。`docs/project-management/08-CHANGE-LOG.md:11` 現已如實記錄 root 與 app 逐檔保留 feature side，不再記為 main baseline。
  - Git tree 能驗證最終逐檔結果，不能單獨證明操作者當時是否曾使用整樹 checkout；因此「per-file allowlist／沒有整樹 ours/theirs」屬程序紀錄，repository 可驗證的是最後 27 個 conflict resolution 均與該紀錄相容，未發現相反 tree 證據。

## 4. 程式碼品質

- 判定：通過（workflow／治理修正範圍）
- 證據：
  - workflow 保留單一 root package authority，移除已不存在的 app lockfile 與 app working directory，版本、release notes、artifact filters、output directory、upload directory彼此一致；沒有引入額外產品 runtime 修改。
  - `git diff --check` exit 0。`git status --short` 在建立本報告前只有 workflow、changelog 兩個既有修改及未追蹤 round1 報告；`app/` 無工作樹差異。round1 報告未被修改。
  - 注意：本輪修正仍是未提交工作樹差異；`5ff61b3...` commit object 本身仍保存修正前 workflow／changelog。後續必須以新 commit 固定本輪已審內容，不能把 `5ff61b3...` 單獨稱為已包含 round1 修正的 PR head。

## 5. 測試覆蓋

- 判定：部分通過；足以支持本地 source-level round1 remediation，但不足以宣稱完整 regression、GitHub Actions 或 release acceptance
- 證據：
  - 2026-11-20T09:46:36+08:00 至 09:46:37+08:00 依序執行下列 focused tests，全部 exit 0：
    - `node scripts/test-ai-providers.mjs`
    - `node scripts/test-review-ui.mjs`
    - `node scripts/test-youtube-sdk.mjs`
    - `node scripts/test-youtube-streams.mjs`
    - `node scripts/test-youtube-lifecycle.mjs`
    - `node scripts/test-youtube-ui-cli.mjs`
  - 2026-11-20T09:46:55+08:00 執行 `npm run docs:check`，exit 0，輸出「專案治理文件檢查通過：19 個文件，版本 0.52.1」。root `package.json`、`package-lock.json` top-level version 與 lock root package version 均為 `0.52.1`。
  - 本輪沒有把 focused pass 擴張成完整回歸。`RELEASE-NOTES-0.52.1.md:24` 與 `docs/project-management/00-CURRENT-STATUS.md:7,19,29,35` 均保留 Windows `fs.symlinkSync` fixture `EPERM` 限制；此前 `npm run check` 並非 exit 0，本 reviewer 未重跑並未宣稱其通過。
  - `npm run docs:check:final` 尚未執行：最新 08 條目仍為「進行中」，且本 round2 報告尚待主要代理引用與逐字整合。依治理流程，主要代理完成工作條目與 commit 後仍須執行 final gate；目前的 `docs:check` 不能取代它。

## 6. 實際運行結果

- 判定：部分通過
- 證據：
  - 本輪實際運行涵蓋 Git graph／tree／blob、conflict reconstruction、index／marker、版本、workflow 靜態契約、文件檢查與六項 focused tests；所列命令均得到上述 exit 0 結果。
  - 未執行 GitHub remote PR mergeability 重查、GitHub Actions Windows job、Actions artifact 下載與內容核對；因此目前只能確認 workflow 的本地靜態契約，不能宣稱遠端 CI 成功或 PR 已可合併。
  - 未執行 Setup 安裝／解除安裝、安裝後 native GUI／AX／screen reader、真實 Google OAuth／API key／YouTube 頻道、影片與字幕上傳、macOS build／package／實機；`RELEASE-NOTES-0.52.1.md:14,24-26` 已正確保留這些限制。

## 綜合判定

- 結論：有條件通過。round1 指出的 workflow app lockfile／0.51.0 路徑與 changelog main-baseline 不實記載，已在目前本地工作樹修正；merge commit 的兩個父提交、完整第一父 root v0.52.1／app tree、27 個 conflict resolution、無 unresolved index／markers、root package／lock 版本與 focused tests均已驗證。本結論只接受目前本地 source-level remediation，不代表 `5ff61b3...` 已包含修正，也不代表 GitHub PR、Actions、完整 regression 或 release acceptance 已通過。
- 可逐字引用的完整結論句：**本輪 PR #4 與 main 分支衝突整合 round2 獨立複審為有條件通過：目前本地工作樹已解除 round1 的 Windows workflow app lockfile／0.51.0 路徑與 changelog main-baseline 記載問題，merge commit 仍具兩個正確父提交、保留第一父完整 root v0.52.1 與 app tree、27 個實際衝突均形成 feature-side 結果且沒有 unresolved index／conflict markers，root package／lock 版本、文件檢查與六項 focused tests亦通過；但修正尚未形成並推送新 commit，GitHub remote mergeability／Actions、完整 regression、安裝後 GUI、真實 OAuth／YouTube 與 macOS 均未驗收，Windows symlink fixture EPERM 仍是環境限制，因此不得把本結論擴張為完整 PR、產品或 release acceptance。**
- Blocker：
  1. 對「本地修正內容」未發現新的程式或治理 blocker。
  2. 對「結案／PR remote 狀態」仍有程序 blocker：workflow、changelog、round1 與本 round2 報告尚未形成並推送新 commit；主要代理須以明確 allowlist 提交，更新 08 條目引用本報告的逐字結論並結案，再執行 `npm run docs:check:final`。在此之前不得稱遠端 PR head 已包含修正。
- Environment limitation：Windows symlink fixture 的 `fs.symlinkSync` `EPERM` 使此前完整 `npm run check`／publisher regression 未 exit 0；這是已揭露的環境限制，不應改寫成產品缺陷，也不可被 focused pass 當作完整 regression 通過。
- Remaining untested risk：
  1. GitHub remote PR mergeability、base/head 是否仍正確、最新修正 commit 是否出現在 PR、Windows Actions job 與 artifact 均未驗收。
  2. Setup 安裝／解除安裝、捷徑／SmartScreen、安裝後 native GUI／AX／screen reader 未驗收。
  3. 真實 Google OAuth／API key／外部網路、YouTube 頻道／影片／字幕上傳未驗收。
  4. macOS build、package、Developer ID／公證／Gatekeeper 與 macOS 實機未驗收。
  5. 完整 `npm run check` 未 exit 0；本輪六項 focused pass 與靜態 workflow pass 不等同完整產品或 release acceptance。
- 給主要開發代理的具體後續要求：以目前已審 workflow（root package／`../dist`）與 changelog 差異為準，僅 stage 明確 allowlist 加上 round1／round2 報告；commit／push 後重查 PR base/head／mergeability 與 Actions，保存 run SHA／exit／artifact 證據；補齊 08 結案引用並執行 `npm run docs:check:final`。若 commit 後內容或 workflow 再變，須重跑受影響契約檢查，不得沿用本報告代表新差異。

### 治理格式補充（主要代理附加，保留本報告原文）

- 阻擋問題（若有）：本報告原列的遠端結案、文件 final gate、完整 regression、安裝後 GUI、真實 OAuth／YouTube 與 macOS 未驗收，以及 Windows symlink `EPERM` 環境限制。

## 審查代理聲明

- 本審查代理除建立 `docs/project-management/reviews/2026-11-20-pr4-main-sync-round2.md` 外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 本報告未修改 `docs/project-management/08-CHANGE-LOG.md` 或 round1 報告。
- 若上述聲明不實，本報告無效。

本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
若上述聲明不實，本報告無效。
