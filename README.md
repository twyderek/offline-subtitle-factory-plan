# Offline Subtitle Factory Plan

本專案是一套可在 Windows 個人電腦本機執行的「離線字幕生成、校稿、燒錄預覽與輸出管理」工具。  
設計目標是讓影片、規則檔、ASR 轉錄、字幕校閱與輸出檔案集中在同一個專案資料夾中，不依賴雲端服務，也不需要手動到多個位置安裝工具。

## 核心特色

- 本機網頁介面：上傳影片、規則檔、既有 SRT 與字幕需求。
- 本機工具集中管理：Node.js、FFmpeg、Python venv、Whisper 全部安裝到 `app/tools/`。
- 自動字幕流程：建立任務、環境檢查、Whisper 轉錄、SRT 初稿、校閱頁交接。
- 完整字幕校稿頁：播放影片、逐句校稿、跳轉、刪除、合併段落、單句/全片時間長度調整。
- 燒錄預覽設定：字型、大小、顏色、外框、位置、邊距，輸出 FFmpeg ASS Style。
- 任務資料夾管理：每次處理都建立獨立 `jobs/{jobId}/`，方便保存與追蹤。

## 適用情境

- 教學影片字幕製作
- 課程錄影轉字幕
- SOP 或操作影片字幕校稿
- 本機離線字幕工具包
- 需要保護影片資料、不想上傳雲端的工作流

## 專案結構

```text
offline-subtitle-factory-plan/
  app/
    public/                 # 前台與校閱網頁
    scripts/                # 工具安裝腳本
    server.mjs              # 本機 Node.js 服務
    setup-local-tools.bat   # 安裝 app/tools
    start-offline-subtitle-factory.bat
    tools/                  # 一鍵安裝後產生，不提交到 Git
    jobs/                   # 每次任務輸出，不提交到 Git
  assets/                   # UI 概念圖與設計參考
  architecture.md
  workflow.md
  api-draft.md
  ui-requirements.md
  ui-concept-options.md
  setup-local-tools.bat     # 根目錄一鍵安裝入口
  start-offline-subtitle-factory.bat
```

## 第一次使用

### 1. 下載專案

```powershell
git clone https://github.com/twyderek/offline-subtitle-factory-plan.git
cd offline-subtitle-factory-plan
```

如果沒有 Git，也可以從 GitHub 下載 ZIP 後解壓縮。

### 2. 一鍵安裝本機工具

雙擊根目錄：

```text
setup-local-tools.bat
```

或使用 PowerShell：

```powershell
.\setup-local-tools.bat
```

安裝完成後，工具會集中放在：

```text
app/tools/
  node/
  ffmpeg/
  python-venv/
  whisper-models/
  _downloads/
```

### 3. 啟動服務

雙擊根目錄：

```text
start-offline-subtitle-factory.bat
```

瀏覽器會自動開啟：

```text
http://127.0.0.1:8790
```

## 會安裝哪些工具？

`setup-local-tools.bat` 會統一安裝或建立以下工具到 `app/tools/`：

| 工具 | 專案內位置 | 用途 |
|---|---|---|
| Node.js portable | `app/tools/node/node.exe` | 啟動本機網頁服務 |
| FFmpeg | `app/tools/ffmpeg/bin/ffmpeg.exe` | 影片處理、字幕燒錄 |
| Python venv | `app/tools/python-venv/` | 隔離 Python 執行環境 |
| openai-whisper | `app/tools/python-venv/Scripts/whisper.exe` | 本機 ASR 語音轉字幕 |
| Whisper models | `app/tools/whisper-models/` | Whisper 模型快取 |

> 注意：若電腦完全沒有 Python，請先安裝一次 Python，再執行本專案安裝腳本。

```powershell
winget install Python.Python.3.11
```

除此之外，Node.js、FFmpeg、Whisper 都會由本專案腳本集中處理。

## 使用流程

1. 開啟 `start-offline-subtitle-factory.bat`
2. 上傳影片
3. 上傳字幕規則檔 `rule.txt`（可選）
4. 上傳既有 SRT（可選，若已有字幕可跳過 ASR）
5. 填寫字幕生成需求
6. 點擊「開始字幕生成」
7. 完成後進入「8 校閱字幕」
8. 逐句校稿、刪除、合併、調整時間
9. 進入「9 燒錄預覽」設定字幕樣式
10. 點擊「10 輸出」開啟輸出資料夾或進行後續燒錄流程

## 任務輸出位置

每次任務會建立：

```text
app/jobs/{jobId}/
  input/                    # 原始影片、規則檔、既有 SRT
  working/                  # draft.srt、rule-cleaned.srt、校閱報告
  review-output/            # reviewed.srt、burn-settings、manifest
  output/                   # 後續影片輸出位置
  logs/
  job-config.json
  job-status.json
```

## 字幕校稿功能

- 影片播放與目前字幕同步
- 搜尋字幕文字
- 每句字幕文字修改
- 單句字幕長度增減
- 全片每句字幕長度批次增減
- 刪除單句字幕
- 合併目前字幕與下一段字幕
- 套用清理規則
- 下載 SRT
- 儲存校稿包

## 燒錄預覽輸出

校稿頁「儲存校稿包」會輸出：

```text
app/jobs/{jobId}/review-output/
  reviewed.srt
  burn-settings.json
  burn-settings.ffmpeg-style.txt
  export-manifest.json
```

這些檔案可供後續 FFmpeg 燒錄字幕使用。

## 常見問題

### 啟動時顯示找不到 `server.mjs`

代表專案檔案不完整，請重新下載完整專案，或確認：

```text
app/server.mjs
```

存在。

### 啟動時顯示找不到 Project-local Node.js

請先執行：

```text
setup-local-tools.bat
```

### Whisper 轉錄很慢

Whisper 是本機 CPU/GPU 運算，影片越長、模型越大，處理時間越久。可先使用較小模型，例如 `small`。

### 不想重新轉錄，只想校稿

上傳影片時同時上傳既有 SRT，系統會略過 ASR，直接進入校閱流程。

## 開發者資訊

本專案目前使用原生 Node.js，不依賴 Express 或前端框架，方便攜帶與離線部署。

```powershell
cd app
tools\node\node.exe server.mjs
```

若尚未安裝 `tools/node/`，可暫時使用系統 Node.js：

```powershell
cd app
node server.mjs
```

## 授權

本專案可作為教學、研究、內部工作流程與開源分享用途。若要正式發布，請依需求補充 LICENSE。
