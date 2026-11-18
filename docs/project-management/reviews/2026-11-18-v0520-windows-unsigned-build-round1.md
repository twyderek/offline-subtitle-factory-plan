# 獨立審查報告：v0.52.0 Windows unsigned APP 封裝與實際測試

- 審查對象 commit／版本：root `0.52.0`、HEAD `9ce9c8ffeaffaed8ac4fc16f160c00dd157115a8`；工作樹 dirty，既有 `app/` 與 root 變更均保留
- 對應 08-CHANGE-LOG 條目：`2026-11-18 — v0.52.0 Windows unsigned APP 打包與實際測試`
- 審查輪次：round1
- 審查代理啟動時間、上下文來源：2026-11-18（Asia/Taipei）；獨立讀取目前 root source、`package.json`、`00-CURRENT-STATUS.md`、`08-CHANGE-LOG.md`、release／validation／independent-review workflows、目前 dist 資產與測試輸出；未沿用主要開發代理的評價性結論
- 審查範圍：Windows x64 `unpacked`、Setup、Portable、`latest.yml`、runtime manifest、版本／SHA／Authenticode、NanaZip integrity、packaged renderer smoke、相關 source／package／治理文件與回歸測試；不修改 source、tests、治理文件、既有審查報告或 dist 資產

本輪沒有看到封裝或 packaged renderer 的立即阻擋 runtime code defect，但現有證據只支持「內部 unsigned Windows APP candidate」，不支持完整 Windows 安裝驗收或公開發布。以下把 archive、unpacked／Portable renderer、完整回歸、native GUI、安裝後流程與真實 provider/API key 分開判定。

## 1. 需求完整性

- 判定：部分通過
- 證據：
  - `docs/project-management/08-CHANGE-LOG.md:3-14` 將本輪目標定義為 v0.52.0 Windows x64 unsigned Setup／Portable／unpacked、版本／runtime／封裝完整性／SHA／metadata／簽章核對、packaged renderer／可行 APP GUI smoke，並明確列出不安裝至系統、不輸入或保存真實 API Key。
  - `package.json:3,40,52-174` 的版本為 `0.52.0`；unsigned build 使用 `electron-builder --win --x64 --publish never`，輸出目錄為 `../dist`，artifact 名稱固定為 Setup／Portable 0.52.0，並以 `directories.app="."` 固定 root source。
  - 已找到並核對三項指定 Windows executable：`D:\Codex\subtitle-review-loop\dist\offline-subtitle-factory-setup-0.52.0.exe`、`D:\Codex\subtitle-review-loop\dist\offline-subtitle-factory-portable-0.52.0.exe`、`D:\Codex\subtitle-review-loop\dist\win-unpacked\離線字幕工廠.exe`；另核對 `latest.yml`。版本資訊均為 0.52.0，產品名稱均為「離線字幕工廠」。
  - 需求中的 archive／unpacked／renderer／runtime 靜態範圍有實際證據；「APP GUI 實測」只完成 DevTools packaged renderer，不是 native GUI handle／AX 或安裝後 GUI 驗收，因此需求完整性不能判定為全通過。

## 2. 邏輯正確性

- 判定：通過
- 證據：
  - source 與 unpacked payload 的關鍵檔案 SHA-256 相同：`public/review.js` `A2FECD005FA64ABC7B4D967EB16035C94AA8094569FDF408FA8401371CE8FEBC`、`public/review.html` `52CAAFFDEB6BA9375F6B261D195CFC6052B9186FBFAB5FA777B2C31EE127ADD8`、`public/ai-provider-settings.mjs` `0DCC1855EEB1D913D106E0FA2355CD80D95E484D7D42720ACBB4762FCC96ECAB`、`lib/ai/providers.mjs` `EC622C0BA6FB34DFE1F637B4D7FFEAE80C56E63A970CCB6A2EBA557605DD648A`、`electron/main.mjs` `B5FDF9F8A621332F4CF75ED9220BA40B9AF67D4BEE5F34C6A03EEB38E87BDB05`；每一組 source／packaged hash 均 `True`。
  - `npm run runtime:verify -- --target=win32-x64` 通過；以 `OFFLINE_SUBTITLE_TOOLS_DIR=D:\Codex\subtitle-review-loop\dist\win-unpacked\resources\tools` 指向 packaged runtime 再執行同一驗證也通過。五項 runtime（ffmpeg、ffprobe、whisper CLI、whisper DLL、ggml-tiny model）的檔案大小／SHA-256 與 manifest 相符。
  - `dist\win-unpacked\resources\app\package.json` 為 0.52.0；`resources\tools\manifest.json` 與 `tools\manifests\win32-x64.json` 的 target 均為 `win32-x64`，策略為 `fully-bundled-runtime`。
  - `scripts/verify-electron-renderer.mjs:34,127-380` 使用隔離 user-data、DevTools protocol、實際 HTTP job API、SRT、trim 與 AI review assertions；unpacked／Portable smoke 均完成所有傳入分支的 assertions，未見 renderer flow 的錯誤結果。

## 3. 邊界情況

- 判定：部分通過
- 證據：
  - unpacked smoke（`node scripts/verify-electron-renderer.mjs 'D:\Codex\subtitle-review-loop\dist\win-unpacked\離線字幕工廠.exe' 9235 60000 '...\electron\assets\offline-subtitle-splash.mp4'`）實際通過首頁／Electron API／設定 modal、Breeze 首次選擇開啟與取消、手動 SRT upload→completed→cleaned SRT、AI review settings／glossary／9 provider IDs、real trim `2.021333` 秒、post-trim 字幕重算與 folder flow。
  - Portable smoke（同一 script，Portable executable，port 9237，傳入同一 trim fixture）亦實際通過上述流程；輸出顯示 `finalStatus=completed`、`trimStatus=completed`、`jobStatus=completed`、`usesTrimmedVideo=true`、`shiftedSubtitle=true`。
  - 隔離 PATH `node scripts/test-review-ui.mjs`、`node scripts/test-ai-providers.mjs`、`node scripts/test-core.mjs` 均通過；2026-11-18T11:20:53.134+08:00–11:20:58.602+08:00 的 grouped syntax／focused／core replay exit 0。
  - 已觀察到一般 PATH 的 `npm test` 會先在 `scripts/test-core.mjs:663` 因全域 `whisper.exe` 造成 mock 未產生 SRT；隔離 PATH 排除該外部工具後，測試才到達既有 YouTube symlink fixture。這是可重現的環境敏感性，不應被誤報為 package 已完整回歸。
  - 尚未測試：Setup 安裝／解除安裝／捷徑／乾淨帳號、native GUI handle／AX、SmartScreen、真正有效媒體轉錄品質、長音訊、真實 provider／錯誤 API key／外部網路／跨模型品質；這些不是 renderer synthetic fixture 能取代的邊界。

## 4. 程式碼品質

- 判定：部分通過
- 證據：
  - `git diff --check -- . ':(exclude)app'` exit 0；只出現既有 LF／CRLF conversion warnings，沒有 root source／治理範圍的 whitespace error。既有 `app/` dirty 變更未納入本輪修改或判斷。
  - `package.json` 明確指定 `directories.app="."`、Windows x64 targets、穩定 ASCII artifact name、runtime `extraResources` 與 `publish never`；這與 unpacked payload、runtime manifest 及 smoke 的實際結果一致。
  - 目前工作樹不是 clean commit；關鍵 source／packaged hash 已相符，但資產沒有內嵌 source commit provenance。因此可確認目前關鍵檔案內容已進入 unpacked payload，不能把這批 binary 宣稱為 clean HEAD 或可重建 source commit 的 release artifact。
  - `08-CHANGE-LOG.md:55` 的前一輪 FR-028 歷史紀錄仍寫 Setup `252,617,424` bytes、Portable `251,910,055` bytes；目前 dist 實際為 Setup `252,618,434`、Portable `251,911,057` bytes。這不表示目前 archive 損壞（`latest.yml` 與目前 Setup 互相匹配），但表示治理紀錄的資產大小尚未與本批資產同步。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：
  - 2026-11-18 本輪執行 `NanaZipC.exe t -y`：Setup 與 Portable 均 exit 0，均輸出 `Everything is Ok`；Setup archive 13 files／251,800,872 uncompressed bytes，Portable archive 5 files／251,626,598 uncompressed bytes。
  - Setup：檔案大小 `252,618,434`，SHA-256 `8BC2656DB6E65F4199AA5D9A1E35EBEFF3920CC28006E95EFD82C1FF1CDAEFC6`。Portable：檔案大小 `251,911,057`，SHA-256 `4F5D1BDDC6666B73BD3ABC4622A1AD19D85C904A21C931C7DD2BE65801AF4990`。Unpacked executable：檔案大小 `239,627,776`，SHA-256 `2F42E9DF95FE88C6297775AB20D3DAB58FCE6D8F515F4DF3912C3C20096A2B27`。
  - `latest.yml` 版本為 `0.52.0`，Setup size `252618434`；其 base64 SHA-512 `+joPqPRZhgKIc6P+EWAZAyfAKIHcWBXnav0g9SPxmXcYrnzn0rJFxtcGnwq4b9l8cSPZ3+S8UxxQNJMcshjABw==` 與從目前 Setup bytes 計算的值相同。
  - 三項 executable 的 `Get-AuthenticodeSignature` 均為 `NotSigned`；沒有宣稱 signed。dist recursive scan 沒有發現 `.crdownload`、`.part`、`.partial` 或同類 partial artifact。
  - 隔離 PATH `npm test` 的功能 suites 均先通過，posttest 於 `scripts/test-youtube.mjs:154` 的 `fs.symlinkSync` 以 `EPERM` 結束；同一環境的 `npm run check` 也在相同 fixture 結束，因此完整 npm regression 不是 exit 0，不能標示為完整回歸通過。
  - `npm run docs:check` 通過（19 個治理文件）；`npm run docs:check:final` 於本輪 exit 1，因最新 08 條目仍為「進行中」且缺少「獨立審查是否執行／發布授權」必要欄位。這是 closeout blocker，不是封裝 archive integrity 的通過證據。

## 6. 實際運行結果

- 判定：部分通過
- 證據：
  - Unpacked executable 與 Portable executable 均由 `scripts/verify-electron-renderer.mjs` 實際啟動，透過 `--remote-debugging-port` 連到 renderer，並以隔離 user-data 執行 UI／API／job assertions；兩次含 trim fixture 的 smoke 均 exit 0。
  - Unpacked smoke 輸出包含：`healthOk=true`、`settingsOk=true`、create `201`、start `202`、`finalStatus=completed`、`hasCleanedSrt=true`、`trimStatus=completed`、`jobStatus=completed`、`providerIds` 含 `nvidia`、`folderIconFlow.openResult=skipped`。
  - Portable smoke 輸出同樣包含 upload completed／cleaned SRT、AI review provider IDs、trim `2.021333` 秒、post-trim completed、trimmed video／shifted subtitle assertions；這是 packaged renderer flow 證據，不是 native GUI handle。
  - Setup 僅完成 NanaZip integrity、檔案版本／大小／SHA／`latest.yml` metadata 與 unsigned 狀態；本輪沒有執行 Setup 安裝器，因此沒有安裝後流程、解除安裝、捷徑或 SmartScreen 的實際結果。
  - 沒有輸入或保存真實 API Key，也沒有發送真實 provider／NVIDIA／雲端 request；renderer smoke 的 provider 檢查是 UI／settings contract，不是 provider availability 或字幕品質驗收。

## 綜合判定

- 結論：有條件通過
- 可逐字引用的完整結論句：**有條件通過。本輪確認 root v0.52.0 dirty worktree 產出的 unpacked 與 Portable packaged renderer flow、Setup／Portable NanaZip integrity、runtime／version／SHA／unsigned checks 均通過，未發現封裝或 renderer 的立即阻擋 runtime defect；但 Setup 未安裝、native GUI handle／AX、安裝後／解除安裝／捷徑、真實 provider／API key、完整 npm regression（隔離 PATH 仍在 `scripts/test-youtube.mjs:154` 受 Windows symlink `EPERM` 阻塞）與 `docs:check:final` 尚未通過，因此本批只能作為內部 unsigned APP candidate，不能宣稱完整 Windows acceptance 或 release ready。**
- 阻擋問題（若有）：
  - 若目標是完整 Windows acceptance 或 release ready，Setup 安裝後流程、native GUI handle／AX、SmartScreen／乾淨帳號與真實 provider/API key 仍沒有實際證據；目前只能判定 archive 與 packaged renderer 範圍。
  - 隔離 PATH `npm test`／`npm run check` 均在既有 `scripts/test-youtube.mjs:154` 的 Windows `fs.symlinkSync` `EPERM` 結束；不得把功能 suites 通過寫成完整命令 exit 0。應在 Developer Mode 或允許 symlink 的 Windows 環境重跑，不應修改測試繞過。
  - `npm run docs:check:final` 目前 exit 1，最新 08 條目仍為進行中且缺少 final-gate 欄位；本輪依限制不修改治理文件，故文件 closeout 尚未完成。
  - `08-CHANGE-LOG.md:55` 的歷史 Setup／Portable byte counts 與目前 dist 不一致；主要代理需在不覆寫本報告的前提下同步實際資產證據，並重新執行必要文件 gate。
- 剩餘風險：
  - 所有 executable 均 `NotSigned`，使用者可能看到 Unknown Publisher／SmartScreen；未驗證簽章、SmartScreen 放行或正式發布下載流程。
  - 工作樹 dirty，只有關鍵 source／packaged payload hashes 相符；沒有 clean commit provenance，不能外推為可重建的 clean-source release。
  - 未驗證完整安裝／解除安裝、捷徑、乾淨使用者 profile、native AX handle、真實 provider／錯誤 key／timeout／cancel、跨模型品質、有效長音訊轉錄與 offline 網路邊界。
- 給主要開發代理的具體修正要求：保留本報告原文；在允許 symlink 的 Windows 環境重跑完整 `npm test`／`npm run check`，修正並同步 08 的實際資產大小與本輪審查欄位後重跑 `npm run docs:check:final`；若要宣稱完整 Windows acceptance，另需以 Setup 實際安裝／解除安裝並取得 native GUI／AX、乾淨 profile 與真實 provider 範圍證據。不得以本輪 renderer smoke 取代上述流程。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
