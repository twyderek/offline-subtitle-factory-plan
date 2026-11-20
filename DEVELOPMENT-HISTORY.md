# 離線字幕工廠開發歷程與版本紀錄

> 整理日期：2026-07-16  
> 整理範圍：`offline-subtitle-factory-plan/` 規劃案、根目錄 `app/` MVP、`APP-PROJECT/` 產品化版本與 0.30 分支紀錄。  
> 主要來源：`AGENTS.md`、`architecture.md`、`workflow.md`、`api-draft.md`、`ELECTRON-MIGRATION-PLAN.md`、`AI-INTEGRATION-FEASIBILITY.md`、`PHASE2-DEVELOPMENT-PLAN.md`、`APP-PROJECT/FINAL-VERSION-LOG.md`、`APP-PROJECT/0.30版/FINAL-VERSION-LOG.md`、`APP-PROJECT/0.30版/NEXT-VERSION-FIX-LOG.md`、`APP-PROJECT/0.30版/RELEASE-NOTES-0.30.1.md`、Git commit 紀錄。

---

## 1. 專案定位

「離線字幕工廠」是一套本機優先的字幕生成、校閱與輸出工具。核心目標是讓使用者在個人電腦上完成影片匯入、離線語音轉文字、字幕規則清理、人工校閱、樣式預覽與燒錄輸出，不依賴雲端字幕服務，也不把影片與字幕素材送出本機。

專案最早以規劃文件與 Node.js 本機 HTTP 伺服器 MVP 形式建立，後續逐步產品化為 Electron 桌面 APP，並加入 Windows/macOS 打包、內建 FFmpeg/Whisper runtime、任務管理、硬字幕/軟字幕輸出、影片修剪與簽章流程。

---

## 2. 資料夾與歷程來源說明

| 區域 | 用途 | 歷程意義 |
|---|---|---|
| 根目錄文件 | 架構、API、UI、工作流、Electron 遷移、AI 整合規劃 | 早期規劃與設計決策來源 |
| `app/` | 初版 Node.js + 靜態前端 MVP | 可執行雛形，包含任務建立、Whisper 整合、校閱頁 |
| `app/electron/` | 根目錄 MVP 的 Electron 包裝 | Electron 遷移第一階段成果 |
| `APP-PROJECT/` | 產品化 APP、打包輸出與封存資料 | 0.20、0.21、0.22 preview、0.30、0.30.1 的主要版本紀錄 |
| `APP-PROJECT/0.30版/` | 0.30 系列獨立開發副本 | 影片修剪、Windows 預覽、0.30.1 修正版與 Git tag 紀錄 |
| `APP-PROJECT/歷史資料/2026-07-03-開發整合封存` | 舊文件、概念圖、測試截圖、早期暫存資料封存 | 0.20 整合時建立的歷史封存 |

根目錄 Git 紀錄目前只有一筆：

```text
0126f62 Initial offline subtitle factory release
```

`APP-PROJECT/0.30版` 內有獨立 Git 歷史，主要 commit 如下：

```text
0e63b99 Release 0.30.1 preview fixes
52385ad Fix Windows artifact upload path
944f3f9 Disable CI auto-publish during Windows build
79d217e Add 0.30 trimming and Windows preview workflow
49e2c5d Release v0.20.0 runtime fixes
ebf09d1 Initial release of offline subtitle factory app
```

---

## 3. 開發歷程總覽

### 2026-06-30：規劃案與 MVP 雛形

早期文件建立了專案的基本方向：

- `architecture.md` 定義 Local-first、Job-based、可重跑、不阻塞 UI、與校稿頁解耦等原則。
- `workflow.md` 定義建立任務、預檢、字幕生成、進度顯示、校閱輸出流程。
- `api-draft.md` 定義最早的任務 API 草案，包含建立任務、開始任務、查詢狀態、取得檔案、中止任務與進入校稿頁。
- `ui-requirements.md` 與 `ui-concept-options.md` 定義前台任務建立與校稿介面需求。
- `README.md` 與啟動/安裝腳本說明本機工具安裝與 web 模式使用方式。

這個階段的主要成果是「可在本機建立字幕任務」的 MVP 方向，而非完整桌面 APP。

### 2026-07-01：Electron 遷移第一階段

根目錄 `AGENTS.md` 與 `ELECTRON-MIGRATION-PLAN.md` 記錄了 Electron 包裝方案。

已完成項目：

- 新增 `app/electron/main.mjs`，由 Electron 主行程啟動 `server.mjs`，等待 `/api/health` 就緒後開啟 BrowserWindow。
- 新增 `app/electron/preload.mjs`，透過 `contextBridge` 暴露 `window.electronAPI`。
- `app/package.json` 加入 Electron 與 electron-builder 設定。
- `app/public/app.js` 與 `app/public/review.js` 改為使用 `API_BASE = 'http://127.0.0.1:8790'`。
- `index.html` 與 `review.html` 加入 CSP meta tag。
- `review.html` 的返回首頁連結改為 `button#backToHome`，由 JS 控制導回本機 server。
- 新增 Electron IPC `open-folder` / `open-external`，讓 renderer 透過 main process 開啟資料夾或外部連結。
- 任務狀態模型補齊 `created -> running -> completed / failed / cancelled / needs-action`。
- 已規劃並完成 cancel/retry API 與前端按鈕接線。

仍待完成項目：

- `electron/icons/` 只有 `icon.svg`，尚缺 `icon.ico`、`icon.png`。
- 根目錄 MVP 尚未執行 `npm install`、`npx electron .` 與 Windows 打包驗證。

### 2026-07-01：AI 整合可行性與 Phase 2 規劃

`AI-INTEGRATION-FEASIBILITY.md` 與 `PHASE2-DEVELOPMENT-PLAN.md` 評估雲端 AI 服務整合，但多數內容停留在規劃階段。

規劃方向：

- Azure Speech-to-Text 作為 Whisper 之外的 ASR 選項。
- OpenAI GPT-4o / GPT-4o-mini 用於字幕優化、術語一致性、填充詞清理、摘要生成。
- `job-config.json` 增加 `aiServices` 設定。
- 新增 `ai-enhancement` 階段。
- UI 增加 AI 服務設定區、API Key、連線測試與成本估算。

狀態：文件規劃完成，根目錄 MVP 尚未實作 AI API 串接。

### 2026-07-03：0.20.0 產品化整合

`APP-PROJECT/FINAL-VERSION-LOG.md` 記錄 0.20.0 Windows x64 Setup / Portable 打包完成。

版本定位：

- 版本：`0.20.0`
- 平台：Windows x64
- 狀態：已完成 Setup / Portable 打包
- 成品：
  - `APP-PROJECT/dist/離線字幕工廠 Setup 0.20.0.exe`
  - `APP-PROJECT/dist/離線字幕工廠 0.20.0.exe`
  - `APP-PROJECT/dist/win-unpacked`

主要功能：

- Electron 選單與 `.osfp` 專案檔。
- NYCU 品牌與關於視窗。
- `/api/bootstrap` 與 `/api/health` 環境檢查。
- GPU / CUDA / PyTorch 狀態偵測。
- 影片資訊即時顯示，透過 FFprobe 取得時長、解析度與檔案大小。
- 字幕規則處理從「單純複製 draft.srt」進化為 `parseRules()` / `applyRulesToSrt()`。
- 任務管理列表 `GET /api/jobs`。
- 第 10 步輸出，支援硬字幕 MP4、軟字幕 MP4/MKV。
- 校閱頁可先儲存校稿包再啟動燒錄輸出。

驗證結果：

- `node --check` 通過：`server.mjs`、`public/app.js`、`public/review.js`、`electron/main.mjs`。
- `/api/health`、`/api/bootstrap`、`/api/jobs` 通過。
- 任務建立、匯入既有 SRT、規則清理通過。
- 硬燒錄 MP4 與軟字幕 MKV 實測通過。
- source 與 `win-unpacked/resources/app` hash 比對通過。

### 2026-07-14：Windows runtime 修正與 0.21.0 準備

`APP-PROJECT/0.30版/NEXT-VERSION-FIX-LOG.md` 項目 1-12 記錄了 0.20 系列在非開發機上 Python/Whisper 失效的根因與修正。

問題根因：

- 0.20.0 打包版使用 `tools/python-venv`。
- `pyvenv.cfg` 內含開發機 Python 絕對路徑。
- 使用者電腦沒有相同路徑時，Python 或 Whisper 被判定為不可用。

修正重點：

- 重構 `server.mjs` 工具路徑解析，支援多種 tools 來源與 `OFFLINE_SUBTITLE_TOOLS_DIR`。
- Whisper 執行方式改為 `python -m whisper`，避免依賴 `whisper.exe` launcher。
- Electron 主行程同步工具 resolver 與 server 環境變數。
- setup/start 腳本支援指定 tools 目錄，並寫出 `tools/manifest.json`。
- 新增 `scripts/verify-runtime-package.mjs` 與 `npm run runtime:verify`。
- 正式 build 排除 `tools/python-venv`，避免再次打包開發機 venv。
- 建立正式可攜 Python runtime `tools/python`。
- 實測 `win-unpacked/離線字幕工廠.exe` 啟動與 `/api/health`。

結果：

- 解決安裝版/免安裝版在非開發機上 Python/Whisper 指向錯誤的問題。
- 0.21.0 定位為完整獨立 Windows 包，內建 Electron/Node、FFmpeg、FFprobe、Whisper.cpp/Whisper runtime 與模型，不要求使用者自行安裝字幕處理套件。

### 2026-07-15：macOS 0.21.0 與 0.22 preview

`APP-PROJECT/0.30版/FINAL-VERSION-LOG.md` 補充 macOS 發行紀錄。

macOS 0.21.0：

- 平台：Apple Silicon macOS 12+
- 成品：DMG 與 ZIP
- 內建 FFmpeg、FFprobe、Whisper.cpp、ggml-tiny multilingual model。
- 測試通過：封裝 UI、任務 API、真實語音轉錄、Metal 加速、硬字幕輸出、DMG/ZIP 完整性與 ad-hoc 深層簽章。

macOS 0.22.0-preview.1：

- 修正空白可選 SRT 造成略過 ASR、產生 0-byte 字幕卻直接完成的問題。
- macOS 介面不再把 Python 顯示為必要元件，改為內建 Whisper.cpp/Metal。
- 套用深藍側欄新版首頁、字幕校對及樣式輸出畫面。
- 使用回報問題的 11:33 影片重跑，產生 138 段字幕。

macOS 0.22.0-preview.2：

- 首頁恢復為核定深藍側欄專案總覽。
- 最近專案、處理中任務、健康狀態與影片縮圖綁定本機真實資料。
- 校閱頁移除固定 CSS 假聲波，改用 FFmpeg 音軌取樣與 canvas 真實繪製。
- 聲波時間刻度、播放游標與影片同步，支援點擊聲波跳轉。
- `npm run check`、封裝後 Electron 測試、簽章、DMG/ZIP 完整性均通過。

### 2026-07-15：字幕校對、上傳與任務執行強化

`NEXT-VERSION-FIX-LOG.md` 項目 13-20 記錄多項核心改良。

已完成：

- 補齊 `POST /api/jobs/:jobId/cancel` 與 `POST /api/jobs/:jobId/retry`。
- 每個執行任務保存 `AbortController`，取消時終止 Whisper 子程序。
- 大型影片改用 `busboy` 串流上傳，不再 `Buffer.concat()` 整部影片。
- 加入上傳檔案限制、暫存檔清理、跨磁碟 fallback。
- 加入全域字幕任務佇列，預設同時只跑 1 個 Whisper/字幕任務。
- 前端支援 `queued` 狀態與取消排隊任務。
- 校閱頁加入延遲自動保存、離開確認、自動跟隨目前字幕、快捷鍵。
- 大量字幕定位由線性掃描優化為目前/前後段檢查與二分搜尋。
- 字幕清單事件監聽改為事件委派。
- 工具檢查快取、任務列表快取與分頁。
- Whisper 新增快速/平衡/精準模式、CPU threads、音訊前處理與長影片最佳化。

### 2026-07-16：0.30 影片修剪功能規劃與實作

`VIDEO-TRIM-FEATURE-PLAN.md`、`VIDEO-TRIM-IMPLEMENTATION-CHECKLIST.md` 與 `NEXT-VERSION-FIX-LOG.md` 項目 31-38 記錄 0.30 系列。

0.30 開發分支：

- 建立獨立資料夾 `APP-PROJECT/0.30版`。
- 舊專案保持不變，後續影片修剪只在 0.30 專案進行。
- 版本更新為 `0.30.0`。

影片修剪資料層：

- 新增 `lib/media-edit.mjs`。
- 新增 `lib/subtitle-timeline.mjs`。
- 新增 `scripts/test-media-edit.mjs`。
- 支援 edit plan 驗證、effective media 解析、單一保留區間字幕重算、邊界截短、時間平移與重新編號。

修剪 API 與 FFmpeg：

- 新增 edit plan、apply trim、trim status、cancel trim、restore API。
- 精準模式 macOS 優先使用 `h264_videotoolbox`，失敗回退 `libx264`。
- 快速模式使用 stream copy。
- 使用 `.partial.mp4`、FFprobe 驗證與原子更名避免半成品。
- 加入磁碟空間檢查、字幕轉錄/修剪/燒錄互斥鎖、進度回報與快取失效。

修剪工作區：

- 新增 `/trim/:jobId`。
- 保留核定深藍側欄與白色內容卡風格。
- 提供原始影片、真實音軌聲波、動態刻度、播放游標、In/Out 把手、保留/移除區域、精準/快速模式與處理進度。
- 支援拖曳、時間欄輸入、I/O 快捷鍵、Space 播放、方向鍵微調、前後 5 秒與區間循環。
- 首頁、任務管理與校對側欄都新增「修剪」入口。
- 新增專案頁支援「先修剪影片」，可只建立任務、不立即啟動 Whisper。

完整流程整合：

- Whisper 音訊前處理、FFprobe、真實聲波、首頁縮圖、校對播放器與硬字幕輸出統一使用 effective media。
- 修剪頁仍讀原始影片，確保可重新調整完整範圍。
- 有既有 SRT 時，修剪會先重算字幕，轉錄任務優先匯入 `trimmed.srt`。
- 任務重試保留 edit plan、修剪影片與聲波快取。

0.30.0 macOS 預覽版：

- 平台：Apple Silicon macOS 12+
- 內建 FFmpeg、FFprobe、Whisper.cpp、ggml-tiny multilingual 與 Apple Metal runtime。
- 成品：
  - `dist/離線字幕工廠 0.30.0 macOS-arm64.dmg`
  - `dist/離線字幕工廠 0.30.0 macOS-arm64.zip`
- 驗證：封裝 smoke test、真實修剪、字幕任務、校對資料、codesign、DMG checksum、ZIP 測試均通過。

### 2026-07-16：Windows 0.30 預覽與本機打包

`NEXT-VERSION-FIX-LOG.md` 項目 39-40 記錄 Windows 建置流程。

GitHub Actions：

- 新增 `.github/workflows/windows-preview.yml`。
- 分支：`codex/windows-0.30-preview`。
- 在 GitHub `windows-2022` runner 執行 `npm ci`、runtime 準備、回歸測試、NSIS Setup/Portable 建置與 7-Zip 完整性檢查。
- 新增 `scripts/prepare-windows-runtime.ps1`，下載固定版本：
  - FFmpeg 8.1.2
  - Whisper.cpp 1.9.1 x64
  - ggml-tiny multilingual model
- 新增 `WINDOWS-11-TEST-CHECKLIST.md`。
- 修正 CI 自動發布與 artifact 相對路徑問題。

0.30.0 Windows x64 本機打包：

- 執行資料夾：`APP-PROJECT/0.30版`
- 開始：2026-07-16 12:34:38 +08:00
- 完成：2026-07-16 12:41:18 +08:00
- 指令流程：
  - `npm ci`
  - `scripts/prepare-windows-runtime.ps1`
  - `npm run check`
  - `npm run electron:build:dir`
  - `npm run electron:build`
- 成品：
  - `APP-PROJECT/dist/離線字幕工廠 Setup 0.30.0.exe`
  - `APP-PROJECT/dist/離線字幕工廠 0.30.0.exe`
  - `APP-PROJECT/dist-0.30`
- 驗證：
  - `npm run check` 通過。
  - FFmpeg、FFprobe、Whisper.cpp CLI、Whisper DLL、ggml-tiny model 與 manifest 驗證通過。
  - Setup/Portable 7-Zip 完整性檢查通過。
- 注意：本機沒有 Windows Code Signing 憑證，0.30.0 Windows 成品為未簽章測試包。

### 2026-07-16：0.30.1 修正版

`RELEASE-NOTES-0.30.1.md`、`README.md` 與 `NEXT-VERSION-FIX-LOG.md` 項目 41-44 記錄 0.30.1。

修正 1：Windows 簽章流程

- `package.json` 將 `win.signAndEditExecutable` 改為 `true`。
- 新增 `scripts/assert-windows-codesign.ps1`。
- 新增 `scripts/verify-windows-signatures.ps1`。
- 正式 `npm run electron:build` 改為：
  - runtime manifest
  - runtime verify
  - 簽章憑證 preflight
  - electron-builder
  - 簽章驗證
- 新增 `npm run electron:build:unsigned` 作為內部測試包流程。
- GitHub Actions 接入 `WINDOWS_CODESIGN_PFX_BASE64` 與 `WINDOWS_CODESIGN_PASSWORD` secrets。

修正 2：校閱字幕預覽比例

- `public/review.js` 新增 ASS 預覽縮放計算。
- 依據 ASS PlayRes 1920x1080、影片實際顯示高度、letterbox/pillarbox 偏移換算字級、外框與垂直邊距。
- 影片 metadata 載入與播放器尺寸變化時重新更新預覽。
- `public/styles.css` 將校閱影片設為 `object-fit: contain`。

修正 3：中文檔名亂碼

- `server.mjs` 新增中文檔名還原與清理流程。
- 正常 UTF-8 中文檔名保留原字。
- UTF-8 bytes 被誤解成 Latin-1 的 mojibake 會嘗試還原。
- 套用範圍包含串流上傳、舊 multipart 解析、最近專案、review-data 與燒錄輸出基底檔名。
- 回歸測試新增中文檔名與刻意 mojibake 檔名案例。

0.30.1 發布內容：

- `package.json` 與 `package-lock.json` 版本由 `0.30.0` 升為 `0.30.1`。
- 首頁版本標示改為 `0.30.1・影片修剪預覽版`。
- 新增 `RELEASE-NOTES-0.30.1.md`。
- README 加入 0.30.1 發布重點。
- Windows workflow artifact 名稱更新為 `offline-subtitle-factory-0.30.1-windows-x64`。

0.30.1 Windows x64 本機打包：

- 正式簽章打包因未提供 Code Signing 憑證而正確中止。
- 內部未簽章測試包使用一次性 CLI 覆寫 `signAndEditExecutable=false` 產出。
- 成品整理至 `APP-PROJECT/dist-0.30.1`。
- Setup：`離線字幕工廠 Setup 0.30.1.exe`，206,747,868 bytes。
- Portable：`離線字幕工廠 0.30.1.exe`，206,042,778 bytes。
- SHA-256：
  - Setup：`b6a57c89e3bffd62a8e522f1743e7d857db201a403421b7f79dfd5af92298430`
  - Portable：`a2a885732b26a7ffd1679c4b524103c10ae8b226dca4fdb2e4d3a0253d61eb3b`
- 簽章狀態：本機成品為 `NotSigned`，需正式 Code Signing PFX 才能發布可信安裝版。

---

## 4. 版本紀錄表

| 版本 / 階段 | 日期 | 平台 | 狀態 | 重點 |
|---|---:|---|---|---|
| 規劃草案 / MVP | 2026-06-30 | Web / Node | 完成初版規劃與雛形 | Local-first、Job-based、任務資料夾、API 草案、校閱流程 |
| Electron 遷移 Phase 0/1 | 2026-07-01 | Windows / Electron | 根目錄 MVP 完成包裝程式碼，未完整打包驗證 | Electron main/preload、API_BASE、CSP、IPC open-folder |
| AI 整合規劃 | 2026-07-01 | 規劃 | 文件完成，未實作 | Azure STT、OpenAI 字幕優化、術語檢查、成本估算 |
| 0.20.0 | 2026-07-03 | Windows x64 | 已打包 | 專案檔、任務列表、GPU 偵測、規則清理、第 10 步硬/軟字幕輸出 |
| 0.21.0 | 2026-07-14/15 | Windows x64 / macOS arm64 | 完整獨立包 | 修正 Python/Whisper runtime，內建工具與模型 |
| 0.22.0-preview.1 | 2026-07-15 | macOS arm64 | 預覽 | 修正空白 SRT 問題，導入新版深藍側欄介面 |
| 0.22.0-preview.2 | 2026-07-15 | macOS arm64 | 預覽 | 首頁總覽真實資料、真實音軌聲波、DMG/ZIP 驗證 |
| 0.30.0 | 2026-07-16 | macOS arm64 / Windows x64 | 預覽 | 非破壞式單區間影片修剪、effective media、字幕時間重算、Windows workflow |
| 0.30.1 | 2026-07-16 | Windows x64 / 共同程式碼 | 修正版 | 字幕預覽比例修正、中文檔名亂碼修正、Windows 簽章流程強制檢查 |

---

## 5. 功能演進摘要

### 任務與流程

- 早期：建立任務、上傳影片/規則/SRT、產生 `job-config.json` 與 `job-status.json`。
- 後續：加入任務列表、狀態輪詢、cancel/retry、queued 狀態、全域佇列、任務快取與分頁。
- 0.30：加入修剪任務與字幕任務/燒錄任務互斥鎖。

### ASR 與 runtime

- 早期：Whisper Python venv。
- 0.20：可執行打包，但 venv 仍綁定開發機路徑。
- 0.21：改用可攜 runtime、manifest、runtime verify。
- 0.30：macOS/Windows 轉向內建 Whisper.cpp、FFmpeg、FFprobe 與固定模型。

### 字幕規則

- 早期根目錄 MVP：`rule-cleaned.srt` 一度只是複製 `draft.srt`。
- 0.20：實作 `parseRules()` / `applyRulesToSrt()`。
- 支援繁體轉換、填充詞移除、術語正規化、自訂取代、正則替換與標點清理。

### 校閱體驗

- 早期：SRT 編輯、燒錄樣式預覽、校稿包儲存。
- 後續：自動保存、離開確認、字幕跟隨播放、快捷鍵、大量字幕效能優化。
- 0.22：真實聲波預覽與播放游標同步。
- 0.30.1：校閱預覽依 ASS PlayRes 與影片實際顯示尺寸縮放，接近 FFmpeg/ASS 燒錄結果。

### 輸出

- 早期：產生校稿包。
- 0.20：加入硬字幕 MP4、軟字幕 MP4/MKV。
- 後續：修正 Windows FFmpeg ASS filter 路徑問題、輸出 manifest、保留 reviewed SRT 與 ASS。

### 影片修剪

- 0.30 新增單一連續保留區間、非破壞式修剪。
- 支援原始影片保留、衍生影片、字幕時間重算、還原、取消、進度、快取失效。
- 第一版不支援多段剪接、轉場、濾鏡、多軌與素材拼接。

### 打包與發布

- 0.20：Windows Setup/Portable。
- 0.21：Windows/macOS 獨立 runtime。
- 0.22：macOS preview DMG/ZIP。
- 0.30：macOS preview、Windows GitHub Actions preview 與本機 Windows 打包。
- 0.30.1：正式 Windows build 強制檢查簽章；未簽章流程保留給內部測試。

---

## 6. 已知限制與待辦

### 根目錄 `app/` MVP

- Electron 圖示尚缺 `icon.ico` 與 `icon.png`。
- 尚未在根目錄 MVP 執行 `npm install`、`npx electron .`、`electron-builder` 驗證。
- 根目錄 `server.mjs` 相較 `APP-PROJECT/0.30版` 已明顯落後，不包含 0.20 之後的產品化修正。
- 若要繼續開發正式 APP，應以 `APP-PROJECT/0.30版` 或後續正式 repo 為主，而不是根目錄 MVP。

### 0.30.1 產品版

- Windows 0.30.1 本機成品目前為未簽章內部測試包。
- 正式 Windows 發布需提供 Code Signing PFX 或 Windows 憑證庫 Code Signing 憑證。
- GitHub Actions 已接入簽章 secrets，但仍需實際提供 secrets 並重新建置。
- Windows 11 實機 GUI、SmartScreen、Defender、安裝/升級/解除安裝與真實影片工作流仍需最終驗收。
- macOS 預覽版為 ad-hoc 簽章，尚未 Apple Developer ID 公證。
- 0.30 修剪第一版只支援單一保留區間，多段剪接屬下一階段。

---

## 7. 建議後續整理方向

1. 決定唯一主線：若 `APP-PROJECT/0.30版` 是最新可交付版本，建議將根目錄 MVP 標示為 archived planning prototype。
2. 將版本紀錄集中維護：後續每次修改同步更新本檔、`RELEASE-NOTES-*.md` 與 `NEXT-VERSION-FIX-LOG.md`。
3. 補齊正式簽章與發布流程：Windows Code Signing、macOS Developer ID、公證與乾淨機驗收。
4. 建立正式 changelog 格式：例如 `CHANGELOG.md`，只放使用者可理解的版本差異；本檔保留工程歷程。
5. 清理大型輸出與封存策略：`dist-*`、runtime、node_modules、歷史壓縮檔應明確區分「可重建」與「需保留證據」。

---

## 8. 附錄：重要檔案索引

| 檔案 | 說明 |
|---|---|
| `AGENTS.md` | 根目錄 AI agent 開發指南，記錄 2026-07-01 狀態 |
| `ELECTRON-MIGRATION-PLAN.md` | 根目錄 MVP Electron 遷移計畫 |
| `AI-INTEGRATION-FEASIBILITY.md` | AI 服務整合可行性分析 |
| `PHASE2-DEVELOPMENT-PLAN.md` | AI 整合 Phase 2 詳細任務規劃 |
| `APP-PROJECT/FINAL-VERSION-LOG.md` | 0.20.0 Windows 整合與打包紀錄 |
| `APP-PROJECT/0.30版/FINAL-VERSION-LOG.md` | 0.20/0.21/0.22 preview 與 0.30 補充紀錄 |
| `APP-PROJECT/0.30版/NEXT-VERSION-FIX-LOG.md` | 0.21 runtime 修正、0.30 修剪、0.30.1 修正的逐項紀錄 |
| `APP-PROJECT/0.30版/RELEASE-NOTES-0.30.1.md` | 0.30.1 對外版本說明 |
| `APP-PROJECT/0.30版/VIDEO-TRIM-FEATURE-PLAN.md` | 影片修剪功能規劃 |
| `APP-PROJECT/0.30版/VIDEO-TRIM-IMPLEMENTATION-CHECKLIST.md` | 影片修剪實作步驟 |
| `APP-PROJECT/0.30版/WINDOWS-11-TEST-CHECKLIST.md` | Windows 11 測試清單 |
| `APP-PROJECT/0.30版/THIRD-PARTY-NOTICES.md` | 第三方元件授權說明 |

