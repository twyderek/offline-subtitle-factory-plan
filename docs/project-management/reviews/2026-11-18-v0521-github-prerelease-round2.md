# v0.52.1 GitHub pre-release 唯讀複審報告 round2

- 審查日期：2026-11-18
- 審查對象：`D:\\Codex\\subtitle-review-loop\\offline-subtitle-factory-plan`
- 複審依據：round1 報告 `docs/project-management/reviews/2026-11-18-v0521-github-prerelease-round1.md` 指出的 P1，以及本輪目前 staged／unstaged／untracked、文件、封裝與 renderer evidence。
- 審查限制：本輪只讀取、執行驗證指令並建立本報告；不修改 round1 或其他檔案，不重新打包，不 commit／push／tag／release。

## 1. 需求完整性

- 判定：部分通過
- 證據：root `package.json`、root `package-lock.json`、lockfile root package entry 與 unpacked `resources/app/package.json` 都是 `0.52.1`；`RELEASE-NOTES-0.52.1.md` 存在且為 2,363 bytes，README、00／05／06／08 均有 v0.52.1 candidate 或發布範圍記錄。
- 證據：`git diff --cached --name-status` 現在只列 root 路徑，包括 README、release notes、project-management 文件、review evidence、root package、public UI／assets 與 scripts；`git diff --cached --name-only -- app` 無輸出，表示上一輪指出的 app/ staged scope 問題已解除。
- 證據：工作樹中的 `app/` 仍有 tracked dirty changes 與大量 untracked debug/test files，但它們沒有進入 index；這符合 08 所記錄的「不包含 app/ 下既有除錯檔」範圍，仍須在後續 commit 前維持此邊界。
- 發現：v0.52.1 GitHub tag／Release／assets 尚未存在，這是本輪禁止外部寫入下的未完成發布狀態，不應被描述為已同步到 GitHub。

## 2. 邏輯正確性

- 判定：部分通過
- 證據：root package 與 lockfile 版本、unpacked package version、Setup／Portable 檔名與 `latest.yml` 的 `0.52.1` 一致；renderer verifier 回報 YouTube module、guide image、reference DOCX 都存在，兩個資產 HTTP read 均成功。
- 證據：README 與 Release notes 將本版限定為 Windows x64 unsigned pre-release，並明確說明實際 YouTube 入口、未簽章風險與真實 Google／YouTube 流程未驗收；沒有把 smoke 或 metadata 宣稱成完整產品驗收。
- 發現：08 最新條目仍寫「狀態：進行中」，且最新條目缺少 validator 要求的獨立審查欄位；因此發布流程邏輯仍不能進入「文件結案完成」狀態，即使 source／package 證據本身一致。

## 3. 邊界情況

- 判定：部分通過
- 證據：`dist` 內 Setup `255,587,780` bytes、Portable `254,880,396` bytes、Setup blockmap `267,109` bytes、`latest.yml`、SHA256SUMS 與 signing-status 均存在；`latest.yml` 的 version、Setup size 與 SHA-512 欄位與本機候選資料一致。
- 證據：SHA256SUMS 列出 Setup `5c312fdf9a8f652f3c26be639e508ffdae0397b51076fc529499d02ac07362bc` 與 Portable `3acbc7dea8122d9af7ef3f54f01d0ee41f3b832479389f7ebb498c7ee5334a93`；round1 已取得本機實際檔案 hash 與清單一致的 evidence，本輪未發現版本或檔名漂移。
- 證據：`SIGNING-STATUS-windows-x64.txt` 明確聲明 Windows Authenticode 未存在；Release notes 也揭露 Unknown Publisher／SmartScreen 風險，沒有把 unsigned package 寫成可信簽章發布。
- 未覆蓋：Setup 安裝／解除安裝、捷徑、乾淨帳號、native GUI／AX、screen reader、macOS 資產、真實 Google OAuth／YouTube upload 與 GitHub 下載後 digest 尚未驗證。

## 4. 程式碼品質

- 判定：通過
- 證據：本輪 staged root allowlist 包含 YouTube UI、asset、UI assertion 與 packaged renderer verifier 的成套變更，沒有把 app/ dirty 或 debug scripts staged；此範圍比 round1 的未 staged 狀態更可追溯。
- 證據：`public/assets/youtube-setup-flow.zh-TW.png` 為 `1,670,594` bytes、SHA-256 `90A8E692E7AF84A6A7C7D58A5248E1E3D11459BF3F39CBA1AC9FF469A8567FB1`；DOCX 為 `1,563,905` bytes、SHA-256 `3D8462ACA5FBBDB90235B95E185CB708FA16BAE840E0A3DFDB7D0E328B8B46FE`，unpacked package 中對應檔案存在且 hash／bytes 與 source 一致。
- 證據：目前沒有新增 OAuth JSON、Client Secret、token 或簽章憑證進入 staged root allowlist 的 evidence；app/ 內的除錯檔也未 staged，降低誤發布風險。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：本輪 `node scripts/verify-electron-renderer.mjs` 對目前 `dist/win-unpacked/離線字幕工廠.exe` exit 0；首頁、Electron bridge、設定 modal、Breeze flow、SRT upload、trim、AI review、folder flow 與 YouTube guide assets 均完成 packaged renderer smoke。
- 證據：renderer current candidate 回報 `moduleOk=true`、`hasGuideImage=true`、`hasReferenceDocx=true`、`imageOk=true`、`docxOk=true`，實際 bytes 為 PNG `1,670,594` 與 DOCX `1,563,905`；這與 source／dist hash evidence 一致。
- 證據：本輪 `npm run docs:check:final` 仍失敗，明確指出最新 08 缺少「獨立審查是否執行」、最新工作紀錄尚未標示「完成」、獨立審查值缺失，以及發布授權範圍沒有明確記錄同意／核准／接受打包、發布、提交、推送或共享。
- 未覆蓋：完整 `npm test`／publisher regression 仍不能標示通過；既有 `scripts/test-youtube.mjs:154` Windows symlink fixture 的 `fs.symlinkSync` `EPERM` 限制仍須在允許 symlink 的環境另行重驗。

## 6. 實際運行結果

- 判定：部分通過
- 證據：目前 unpacked `dist/win-unpacked`、Setup、Portable、blockmap、latest.yml、SHA256SUMS 與 signing-status 均可讀取；unpacked package 的 package version 為 `0.52.1`，YouTube PNG／DOCX 均隨 package 存在。
- 證據：本輪 renderer smoke 以當前 unpacked executable 實際啟動，並取得 completed SRT／trim／AI review 等流程與 YouTube guide asset HTTP bytes；這是可重播的本機 packaged evidence，不是安裝後人工驗收。
- 證據：工作樹目前 staged allowlist 已不含 app/，但尚未 commit／push；GitHub 遠端仍未取得 `v0.52.1` tag、pre-release 或下載 asset 的名稱／大小／digest／URL 反向核對結果。
- 未覆蓋：三個 Windows executable 仍是未簽章；沒有安裝後、SmartScreen、真實 Google、公開 YouTube、macOS 或跨平台 release evidence。

## 綜合判定

- 結論：不通過
- 可逐字引用的完整結論句：**v0.52.1 Windows unsigned pre-release 的來源、封裝與本機 smoke 證據足夠，且本輪已確認 staged root allowlist 不含 app/；但上一輪的文件結案 P1 尚未解除，因 08 最新工作紀錄仍為進行中且 `npm run docs:check:final` 失敗，因此目前不通過 GitHub pre-release 準備門檻；不代表完整 Windows 安裝後、macOS 或真實 Google 驗收。**
- 阻擋問題（若有）：
  - P1（上一輪未解除）：`08-CHANGE-LOG.md` 最新 v0.52.1 條目仍為「進行中」，缺少獨立審查欄位，且發布授權範圍未通過 validator；這直接造成 `npm run docs:check:final` exit 1。
  - 已解除：上一輪「沒有明確 staged root allowlist、可能混入 app/ dirty」的 P1 已由目前 index evidence 解除；`git diff --cached --name-only -- app` 無輸出，root staged scope 可逐項列出。
  - 非阻擋範圍限制：尚未 commit／push/tag/release/upload 是本輪明確禁止的操作，故不作為 package runtime defect；但在公開同步前仍必須完成來源提交與 GitHub asset 反向核對。
- 最小後續條件：只需由主要代理補齊 08 最新條目的獨立審查欄位、結案狀態與明確發布授權，使 `npm run docs:check:final` 通過；維持目前 staged allowlist 不納入 app/，再於獲准的發布輪次進行 commit／push／tag／release 與資產下載核對。

本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
若上述聲明不實，本報告無效。
