# v0.52.1 GitHub pre-release 唯讀複審報告

- 審查日期：2026-11-18
- 審查對象：`D:\\Codex\\subtitle-review-loop\\offline-subtitle-factory-plan`
- 審查範圍：v0.52.1 GitHub pre-release 準備狀態、root source diff、Windows x64 unsigned package、文件與 GitHub 唯讀狀態。
- 審查限制：本報告只評估目前可取得的本機與 GitHub 唯讀 evidence；不把未建立的 tag／Release／asset upload 視為已完成。

## 1. 需求完整性

- 判定：部分通過
- 證據：root `package.json`、root `package-lock.json` 及 unpacked package version 均為 `0.52.1`；`RELEASE-NOTES-0.52.1.md`、README、`00-CURRENT-STATUS.md`、`05-DEVELOPMENT-AND-DEPLOYMENT.md`、`06-TEST-AND-PROCESS-AUDIT.md` 與 `08-CHANGE-LOG.md` 均已有 v0.52.1 或 Windows unsigned candidate 內容。PNG／DOCX 也已進入 `public/assets`，並在 unpacked package 內存在。
- 證據：目前 root checkout 的 HEAD 與 origin branch 都是 `9ce9c8ffeaffaed8ac4fc16f160c00dd157115a8`，但工作樹有 20 個 tracked unstaged changes、65 個 untracked entries、0 個 staged entries；尚未形成可追溯的 release commit，也尚未建立 `v0.52.1` tag／GitHub pre-release 或上傳 asset。
- 發現：`app/package.json` 與 `app/package-lock.json` 仍是 `0.51.0`，但 root electron-builder 的 application root 為 `.`，本次 package 使用 root `0.52.1`。這不是目前 root package 版本失敗，但若未用明確 allowlist stage，可能把既有 `app/` 變更或除錯檔錯誤帶入提交。

## 2. 邏輯正確性

- 判定：部分通過
- 證據：YouTube publish UI 使用 stable asset URLs，測試檢查 `/assets/youtube-setup-flow.zh-TW.png`、`/assets/youtube-setup-reference.zh-TW.docx` 與下載屬性；packaged renderer smoke 也實際確認 YouTube module、PNG、DOCX HTTP response 與非零 bytes。
- 證據：目前說明把附件內容定位為 Google Cloud／YouTube Data API v3／OAuth 設定參考，並將實際 APP 操作入口對齊為「匯入 OAuth JSON」與「連結頻道」，沒有把 OAuth JSON、Client Secret 或 token 納入 repo 或一般 UI 狀態。
- 發現：README 已指向 GitHub `v0.52.1` pre-release，但 GitHub 唯讀查詢回報該 release not found，遠端 tag 列表也沒有 `v0.52.1`；在發布前這是尚待完成的外部一致性，不應被當成已發布連結。

## 3. 邊界情況

- 判定：部分通過
- 證據：Release notes、05／06 文件及 08 工作紀錄明確揭露 unsigned Windows、Unknown Publisher／SmartScreen、未完成 Setup 安裝後 native GUI／AX、screen reader、真實 Google OAuth／YouTube 上傳與 macOS 未重新建置等限制。
- 證據：`SHA256SUMS-windows-x64.txt` 列出 Setup `255,587,780` bytes、SHA-256 `5c312fdf9a8f652f3c26be639e508ffdae0397b51076fc529499d02ac07362bc`，Portable `254,880,396` bytes、SHA-256 `3acbc7dea8122d9af7ef3f54f01d0ee41f3b832479389f7ebb498c7ee5334a93`；本機檔案雜湊與清單一致。
- 證據：`latest.yml` version 為 `0.52.1`，列出的 Setup size 與 Base64 SHA-512 與本機 Setup 相符；Setup blockmap 存在且為 electron-builder gzip JSON，簽章狀態檔明確寫為 `UNSIGNED INTERNAL PRE-RELEASE`。
- 發現：完整 `npm test`／publisher regression 仍受 `scripts/test-youtube.mjs:154` 的 Windows `fs.symlinkSync` `EPERM` 阻擋；這不是本輪 UI asset assertion 失敗，但不能外推為完整 YouTube regression 通過。

## 4. 程式碼品質

- 判定：通過
- 證據：本輪檢視的 YouTube guide 整合採用既有 static `public/**/*` package allowlist，不新增憑證讀取、外部發布或 OAuth secret 儲存邏輯；UI 測試與 packaged renderer verifier 對 stable path、response status 與非零 bytes 具體斷言。
- 證據：`public/assets/youtube-setup-flow.zh-TW.png` 為 `1,670,594` bytes、SHA-256 `90a8e692e7af84a6a7c7d58a5248e1e3d11459bf3f39cba1ac9ff469a8567fb1`；`youtube-setup-reference.zh-TW.docx` 為 `1,563,905` bytes、SHA-256 `3d8462aca5fbbdb90235b95e185cb708fa16ba840e0a3dfdb7d0e328b8b46fe`，source 與 unpacked package 相同。
- 發現：工作樹包含大量既有 `app/` 除錯與測試檔，且 root diff 尚未 stage；程式本身未見 P0 級安全或 runtime 缺陷，但 release 操作必須維持明確 allowlist，不能以整個 dirty worktree 建立來源宣稱。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：本輪已取得 `node --check public/youtube-publish.mjs`、`node --check public/review.js`、`node --check scripts/test-review-ui.mjs`、`node --check scripts/verify-electron-renderer.mjs` 與 `node scripts/test-review-ui.mjs` 通過；既有 focused YouTube SDK／streams／lifecycle／UI CLI 與 packaged renderer smoke evidence 亦通過。
- 證據：unpacked 與 Portable packaged renderer smoke 均 exit 0，並實際讀取 YouTube module、PNG、DOCX；Setup／Portable 檔案存在，`latest.yml`、blockmap、SHA256SUMS 與 unsigned signing status 均有本機 evidence。
- 證據：`npm run docs:check:final` 本輪實際失敗，錯誤包括最新 08 工作紀錄缺少「獨立審查是否執行」、最新條目仍為「進行中」、以及發布授權範圍未明確記錄核准提交／推送／發布／共享；因此不能宣稱文件 final gate 通過。
- 未覆蓋：沒有 Setup 安裝／解除安裝／捷徑、native GUI／AX、screen reader、真實 Google OAuth、真實 YouTube upload、正式簽章、macOS package 或 GitHub 下載後 digest 核對 evidence。

## 6. 實際運行結果

- 判定：部分通過
- 證據：`D:\\Codex\\subtitle-review-loop\\dist\\win-unpacked` 存在，`resources/app/package.json` 為 `0.52.1`，`resources/app/public/assets` 內 PNG／DOCX 與 source bytes／SHA-256 一致；Windows Setup `255,587,780` bytes、Portable `254,880,396` bytes 均存在。
- 證據：三個 Windows executable 的 `Get-AuthenticodeSignature` 結果均為 `NotSigned`；`SIGNING-STATUS-windows-x64.txt` 也明確聲明未配置 Windows Authenticode，可能出現 Unknown Publisher 或 SmartScreen 警告。
- 證據：GitHub 唯讀狀態顯示目前 release 列表最高為 `v0.51.1`，`v0.52.1` release not found，tag 列表亦無 `v0.52.1`；因此現況是本機 unsigned candidate，還不是可由 GitHub 下載核對的 pre-release。
- 未覆蓋：沒有安裝後實際啟動、乾淨帳號、解除安裝、簽章驗證、GitHub asset name／size／digest／download URL 或真實 Google／YouTube 流程結果。

## 綜合判定

- 結論：不通過
- 可逐字引用的完整結論句：**v0.52.1 Windows unsigned pre-release 的來源、封裝與本機 smoke 證據足夠，但目前 GitHub pre-release 準備不通過：工作樹尚未形成受控 staged／commit／push scope，`docs:check:final` 失敗，且 GitHub 尚無 v0.52.1 tag、Release 或 asset；不代表完整 Windows 安裝後、macOS 或真實 Google 驗收。**
- 阻擋問題（若有）：
  - P1：`08-CHANGE-LOG.md` 最新 v0.52.1 工作項目仍為「進行中」，缺少獨立審查欄位與明確發布授權範圍，導致 `npm run docs:check:final` 失敗。
  - P1：目前沒有 staged scope、release commit、`v0.52.1` tag、GitHub pre-release 或上傳後 asset evidence；不能把本機 `dist` 檔案直接視為 GitHub 發布完成。
  - P2：`app/` 子目錄仍保留 `0.51.0` package metadata、tracked changes 與大量 untracked debug/test files；若發布前沒有明確 allowlist，來源可追溯性與版本邊界不清楚。
- 建議的最小解除條件：先以明確 allowlist stage 目標 root 修改與必要 release notes／資產，補齊 08 的獨立審查與發布授權欄位，讓 `npm run docs:check:final` 通過；再建立 commit／push／tag／GitHub pre-release，最後逐一核對 GitHub asset 名稱、大小、digest、下載 URL、`latest.yml` 與 SHA256SUMS。完成前不得宣稱已發布。

本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
若上述聲明不實，本報告無效。
