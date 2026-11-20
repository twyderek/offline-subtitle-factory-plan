# v0.52.1 GitHub pre-release 獨立唯讀複審報告 round3

- 審查日期：2026-11-18
- 審查對象：`D:\\Codex\\subtitle-review-loop\\offline-subtitle-factory-plan`
- 複審依據：round1／round2 報告、目前 staged root allowlist、目前 source/package、dist v0.52.1 unsigned candidate 與既有 smoke／focused evidence。
- 審查限制：只新增本報告；不修改其他檔案、既有報告或 `app/`，不重新打包、不 commit、不 push、不 tag、不建立 GitHub Release。

## 1. 需求完整性

- 判定：部分通過
- 證據：root `package.json`、lockfile、unpacked `resources/app/package.json` 與 Setup／Portable 檔名均為 `0.52.1`；Release notes、README、00／05／06／08 文件已記錄 Windows x64 unsigned pre-release 範圍與限制，但 GitHub tag／Release／assets 尚未作外部發布核對。
- 證據：目前 staged scope 為 root allowlist，`git diff --cached --name-only -- app` 無輸出；`app/` 仍有既有 dirty／debug 檔案但未 staged，符合本輪不納入 `app/` 的發布邊界。

## 2. 邏輯正確性

- 判定：通過
- 證據：v0.52.1 source、unpacked package、Setup／Portable artifact 名稱與 `latest.yml` 版本一致；YouTube PNG／DOCX stable assets 已進入 package，renderer smoke 也確認兩者 HTTP 讀取成功。
- 證據：README、Release notes 與 08 採 unsigned pre-release 描述，明確揭露 Unknown Publisher／SmartScreen、未完成安裝後、macOS 與真實 Google 驗收，沒有把本機 smoke 誤寫成完整發布驗收。

## 3. 邊界情況

- 判定：部分通過
- 證據：Setup `255,587,780` bytes、Portable `254,880,396` bytes、Setup blockmap `267,109` bytes、`latest.yml`、SHA256SUMS 與 signing-status 均存在；NanaZip 對 Setup／Portable 均回報 `Everything is Ok`。
- 證據：三個 Windows executable 均為 `NotSigned`，且既有 npm evidence 明確記錄 `scripts/test-youtube.mjs:154` 的 Windows `fs.symlinkSync` 以 `EPERM` 阻擋完整 publisher regression；未宣稱完整 `npm test` 通過。
- 未覆蓋：Setup 安裝／解除安裝、捷徑、乾淨帳號、native GUI／AX、screen reader、macOS 資產、真實 Google OAuth／YouTube upload 與 GitHub 下載後 digest 尚未驗證。

## 4. 程式碼品質

- 判定：通過
- 證據：staged root allowlist 包含版本、Release notes、治理文件、YouTube UI／assets、focused assertions 與 packaged renderer verifier；目前 index 不含 `app/` 或其 debug scripts，scope 可追溯。
- 證據：既有 round2 asset evidence 記錄 PNG `1,670,594` bytes／SHA-256 `90A8E692E7AF84A6A7C7D58A5248E1E3D11459BF3F39CBA1AC9FF469A8567FB1` 與 DOCX `1,563,905` bytes／SHA-256 `3D8462ACA5FBBDB90235B95E185CB708FA16BAE840E0A3DFDB7D0E328B8B46FE`，source 與 unpacked package 一致。
- 證據：目前 staged scope 沒有 OAuth JSON、Client Secret、token 或簽章憑證；Release notes／signing-status 也明確標示 unsigned 內部 pre-release。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：既有 evidence 記錄 unpacked 與 Portable packaged renderer smoke 均 exit 0，完成首頁、Electron bridge、設定 modal、Breeze、SRT upload、trim、AI review、folder flow，並確認 YouTube module／PNG／DOCX HTTP bytes `1,670,594`／`1,563,905`。
- 證據：syntax、review UI、YouTube SDK／streams／lifecycle／UI CLI、隔離 PATH core、runtime／archive／metadata checks 均有通過記錄；`latest.yml` 的 version、Setup size 與 SHA-512 與本機 candidate 相符。
- 證據：round2 指出的 08 狀態、獨立審查欄位與發布授權欄位已在目前 08 最新條目補齊；目前文件記錄 `docs:check:final` 的結案狀態，fresh command 未在本次快速複審重跑。
- 未覆蓋：完整 `npm test` 仍受既有 symlink `EPERM` 邊界限制，不得外推為完整 YouTube publisher regression 通過。

## 6. 實際運行結果

- 判定：部分通過
- 證據：目前 dist 存在 v0.52.1 Setup、Portable、`win-unpacked\\離線字幕工廠.exe`、blockmap、`latest.yml`、SHA256SUMS 與 signing-status；unpacked package version 為 `0.52.1`，Windows artifacts 的 hash／size 與文件 evidence 一致。
- 證據：Setup／Portable archive integrity 均為 NanaZip `Everything is Ok`，三個 executable 均 `NotSigned`；renderer smoke 是實際啟動 packaged app 的本機證據，但不是 Setup 安裝後 GUI／AX 驗收。
- 證據：GitHub 外部 commit／push／tag／pre-release／asset upload 與下載後名稱、大小、digest、URL 反向核對仍未執行；這是本輪禁止外部寫入與共享的範圍，不是本機 package runtime defect。

## 綜合判定

- 結論：有條件通過
- 可逐字引用的完整結論句：**有條件通過：v0.52.1 Windows unsigned pre-release 的來源、封裝與本機 smoke 證據足夠；不代表完整 Windows 安裝後、macOS 或真實 Google 驗收。**
- 阻擋問題（若有）：
  - 無 P0／P1 的本機 source、封裝或 renderer 阻擋問題。
  - 發布前條件：仍須在獲准的後續發布步驟完成 commit／push／tag／GitHub pre-release、asset upload 與下載後 digest 核對；本報告不將未執行的外部操作寫成已完成。
  - 持續限制：完整 npm publisher regression 的 symlink `EPERM`、Setup 安裝後、native GUI／AX、macOS 與真實 Google／YouTube 流程仍未驗收。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
