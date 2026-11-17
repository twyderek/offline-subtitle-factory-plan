# Electron 桌面應用開發計畫

## 離線字幕工廠 v2 — 從網頁到獨立 APP

---

## 一、現況總結

### 1.1 現有架構

```
server.mjs (Node.js HTTP 伺服器)
  ├── 靜態檔案服務 → index.html / review.html / styles.css / app.js / review.js
  ├── REST API     → /api/jobs, /api/health, /api/jobs/:id/status, ...
  └── 流程控制     → spawn Whisper subprocess、寫 job JSON 到磁碟
         │
         └── 瀏覽器 (Chrome/Edge) 透過 localhost:8790 存取
```

### 1.2 現有檔案清單

| 檔案 | 路徑 | 角色 | 需要改嗎 |
|------|------|------|----------|
| `server.mjs` | `app/server.mjs` | 後端 HTTP API + 流程控制 | **不需要** |
| `index.html` | `app/public/index.html` | 任務建立前台 | ✅ 已改 (CSP meta tag) |
| `app.js` | `app/public/app.js` | 前台前端邏輯 | ✅ 已改 (API base URL + Electron IPC) |
| `review.html` | `app/public/review.html` | 校閱前台 | ✅ 已改 (CSP meta tag) |
| `review.js` | `app/public/review.js` | 校閱前端邏輯 | ✅ 已改 (API base URL) |
| `styles.css` | `app/public/styles.css` | 共用樣式 | **不需要** |
| `package.json` | `app/package.json` | npm 設定 | ✅ 已擴充 (加 electron 相依) |
| `start-offline-subtitle-factory.bat` | `app/start-offline-subtitle-factory.bat` | 啟動腳本 | **不需要** |
| `setup-local-tools.bat` | `app/setup-local-tools.bat` | 工具安裝 | **不需要** |
| `scripts/setup-local-tools.ps1` | `app/scripts/setup-local-tools.ps1` | PowerShell 工具安裝 | **不需要** |

### 1.3 已新增的檔案

| 檔案 | 路徑 | 角色 |
|------|------|------|
| `main.mjs` | `app/electron/main.mjs` | Electron 主行程：啟動 server.mjs、建立 BrowserWindow |
| `preload.mjs` | `app/electron/preload.mjs` | Electron preload script：暴露 IPC helpers 給 renderer |
| `icon.svg` | `app/electron/icons/icon.svg` | 臨時圖示 |

---

## 二、設計原則

1. **後端零改動** — `server.mjs` 完全保留，Electron 主行程負責啟動它
2. **前端最小改動** — 只改 API base URL 和瀏覽器專屬 API（`window.location.href`、`start()`）
3. **雙模式支援** — 網頁模式（`node server.mjs`）和 Electron 模式（`electron .`）共用同一套前端
4. **安全性** — Electron 使用 `contextIsolation: true` + `nodeIntegration: false`，renderer 只能透過 preload 的 IPC 溝通
5. **增量交付** — 每步都可獨立測試，不阻塞下一步

---

## 三、已完成的工作

### Phase 0：Electron 骨架 ✅

已建立以下檔案：

#### `app/electron/main.mjs`

```javascript
// 功能：
// 1. 啟動 server.mjs 作為子行程（port 8790）
// 2. 輪詢 /api/health 等待伺服器就绪
// 3. 建立 BrowserWindow（1400x900）
// 4. 開發模式載入 localhost，生產模式載入本地 HTML
// 5. IPC handlers: open-folder（解析相對路徑後開啟）、open-external
// 6. 關閉視窗時殺掉伺服器行程
```

#### `app/electron/preload.mjs`

```javascript
// 功能：
// 1. exposeInMainWorld('electronAPI') 暴露 3 個方法給 renderer
// 2. openFolder(relativePath) — 接收 server 回傳的相對路徑，由 main process 解析為絕對路徑後開啟
// 3. openExternal(url) — 開啟外部連結
// 4. isElectron — 布林值，renderer 用來判斷是否在 Electron 環境中
```

#### `app/package.json` 擴充

```json
{
  "main": "../electron/main.mjs",
  "scripts": {
    "electron:start": "ELECTRON_ENV=development electron .",
    "electron:build": "electron-builder"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0"
  },
  "build": {
    "appId": "com.offline-subtitle-factory.app",
    "productName": "離線字幕工廠",
    "win": { "target": ["nsis", "portable"] },
    "nsis": { "oneClick": false, "allowToChangeInstallationDirectory": true }
  }
}
```

### Phase 1：前端適配 ✅

#### `app/public/app.js` 改動

| 改動 | 說明 |
|------|------|
| 新增 `API_BASE` 常數 | `const API_BASE = 'http://127.0.0.1:8790'` |
| 修改 9 處 `fetch()` | 全部加上 `${API_BASE}` 前綴 |
| 修改 `openReviewStage()` | 改用 `API_BASE` 作為跳转目標 |
| 修改 `openFolder()` | Electron 環境透過 `electronAPI.openFolder()` 開啟（server 回傳相對路徑，main process 解析為絕對路徑） |

#### `app/public/review.js` 改動

| 改動 | 說明 |
|------|------|
| 新增 `API_BASE` 常數 | `const API_BASE = 'http://127.0.0.1:8790'` |
| 修改 3 處 `fetch()` | 全部加上 `${API_BASE}` 前綴 |
| 新增返回按鈕事件監聽 | `backToHome` 按鈕點擊後導航至 `${API_BASE}/` |

#### `app/public/index.html` 改動

| 改動 | 說明 |
|------|------|
| 新增 CSP meta tag | 允許自載入 script/style/img/video |

#### `app/public/review.html` 改動

| 改動 | 說明 |
|------|------|
| 新增 CSP meta tag | 允許自載入 script/style/img/video |
| 修改返回按鈕 | `<a href="/">` → `<button id="backToHome">`（避免 Electron 中 a tag 行為異常） |

---

## 四、待完成的工作

### Phase 2：圖示

目前 `electron/icons/` 下只有 `icon.svg`（臨時圖示）。打包前需要：

1. 產生 `icon.ico`（Windows 圖示，256x256，包含多尺寸）
2. 產生 `icon.png`（macOS/Linux 圖示，1024x1024）

**快速做法**：用 [convertico.com](https://convertico.com) 或 [icoconvert.com](https://icoconvert.com) 把 SVG 轉成 ICO。

### Phase 3：安裝與測試

```bash
# 1. 安裝相依
cd app
npm install

# 2. 測試 Electron 開發模式
npx electron .

# 3. 驗證所有功能：
#    - 建立任務 → 上傳影片 → 開始生成 → 進度輪詢
#    - 進入校閱頁 → 編輯字幕 → 儲存校稿包
#    - 關閉 APP → 伺服器自動關閉
#    - 殘留 job 恢復（關閉後重新開啟）

# 4. 打包
npx electron-builder --win --x64
```

### Phase 4：完整測試清單

| # | 測試項目 | 預期結果 |
|---|----------|----------|
| 1 | 雙擊 `.exe` 啟動 | 彈出主視窗，顯示任務建立頁面 |
| 2 | 上傳影片 + 規則檔 + 點擊開始 | 任務建立成功，進度開始跑 |
| 3 | 環境檢查按鈕 | 顯示各工具狀態 |
| 4 | 進度輪詢 | 進度條和 log 正常更新 |
| 5 | 中止任務按鈕 | 出現，點擊後任務狀態變 cancelled |
| 6 | 重新執行按鈕 | 取消後出現，點擊後重新跑 |
| 7 | 完成後進入校閱頁 | 按鈕啟用，點擊跳轉到校閱頁 |
| 8 | 校閱頁載入專案 | 自動載入影片和字幕 |
| 9 | 校閱頁編輯字幕 | 文字和時間軸可編輯 |
| 10 | 儲存校稿包 | 寫入 job 的 review-output 資料夾 |
| 11 | 開啟資料夾 | 點擊後能打開 Windows Explorer |
| 12 | 關閉應用程式 | 伺服器正常關閉，無殘留行程 |
| 13 | 安裝版安裝 | 能安裝、建立桌面捷徑、開始功能表捷徑 |
| 14 | 免安裝版 | 解壓即用，無安裝程序 |
| 15 | 殘留 job 恢復 | 關閉後重新開啟，上一個 job 的狀態能恢復 |

---

## 五、檔案結構總覽

### 5.1 最終檔案結構

```
offline-subtitle-factory-plan/
├── ELECTRON-MIGRATION-PLAN.md    ← 本文件
├── README.md
├── architecture.md
├── workflow.md
├── api-draft.md
├── ui-requirements.md
├── ui-concept-options.md
├── assets/                       ← 規劃用 UI 概念圖
├── dist/                         ← 打包輸出目錄（build 後產生）
└── app/                          ← 應用程式
    ├── server.mjs                ← 後端（不改）
    ├── package.json              ← 擴充（加 electron 相依）
    ├── .gitignore
    ├── public/                   ← 前端（小改）
    │   ├── index.html            ← ✅ 已改 (CSP meta tag)
    │   ├── app.js                ← ✅ 已改 (API base URL)
    │   ├── review.html           ← ✅ 已改 (CSP + 返回按鈕)
    │   ├── review.js             ← ✅ 已改 (API base URL)
    │   ├── styles.css            ← 不改
    │   └── sample-rule.txt       ← 規則範例
    ├── jobs/                     ← 使用者資料（動態產生）
    ├── tools/                    ← portable 工具（setup 後產生）
    ├── scripts/                  ← 安裝腳本（不改）
    ├── start-offline-subtitle-factory.bat
    ├── start-offline-subtitle-factory.ps1
    ├── setup-local-tools.bat
    └── electron/                 ← 新增
        ├── main.mjs              ← ✅ 已建立
        ├── preload.mjs           ← ✅ 已建立
        └── icons/
            ├── icon.svg          ← 臨時圖示
            ├── icon.ico          ← 待產生（打包用）
            └── icon.png          ← 待產生（打包用）
```

### 5.2 打包後結構（nsis 安裝版）

```
C:\Program Files\離線字幕工廠\
├── 離線字幕工廠.exe          ← Electron 打包後的執行檔
├── resources/
│   ├── app.asar              ← 打包後的整個 app/ 目錄
│   └── electron/
│       └── main.mjs           ← （asar 內部）
└── updater/                   ← electron-updater 自動更新用
```

---

## 六、風險與對策

| 風險 | 影響 | 對策 |
|------|------|------|
| Electron 版本與 Node.js 版本不相容 | 無法啟動 | 使用 LTS 版 Electron（~33），配合 Node.js 20+ |
| CSP 阻擋本地資源載入 | 前端無法運作 | CSP meta tag 已加入，允許自載入資源 |
| 大影片上傳記憶體溢出 | 使用者體驗差 | 保持現有 multipart 解析邏輯，未來可加檔案大小限制 |
| 伺服器端口衝突（8790） | 無法啟動 | 加入端口偵測，自動找可用端口或提示使用者 |
| Windows Defender 誤判 | 安裝失敗 | 程式碼簽署（購買 EV 憑證）或加入排除清單 |

---

## 七、未來可擴充項目（不在本次範圍）

1. **自動更新** — 加入 `electron-updater`，每次啟動檢查新版本
2. **系統托盤** — 最小化到系統托盤，背景執行時不關機
3. **拖放上傳** — 直接把影片檔拖進 APP 視窗即開始建立任務
4. **多語言** — 加入 i18n 支援（中英雙語）
5. **FFmpeg 燒錄** — 在 APP 內直接呼叫 FFmpeg 燒錄字幕到影片
6. **macOS / Linux 支援** — 同一份程式碼打包三個平台
7. **設定頁** — 在 APP 內設定端口、工具路徑、預設語言等

---

## 八、給 Codex 的執行指令

### 已完成 ✅

- [x] 建立 `electron/main.mjs`（Electron 主行程）
- [x] 建立 `electron/preload.mjs`（IPC 橋接）
- [x] 建立 `electron/icons/icon.svg`（臨時圖示）
- [x] 擴充 `package.json`（electron 相依 + build config）
- [x] 修改 `app.js`（API base URL + Electron IPC）
- [x] 修改 `review.js`（API base URL + 返回按鈕）
- [x] 修改 `index.html`（CSP meta tag）
- [x] 修改 `review.html`（CSP meta tag + 返回按鈕）

### 待完成 🔄

```bash
# 1. 產生圖示檔案
#    - 把 icon.svg 轉成 icon.ico 和 icon.png
#    - 放到 electron/icons/

# 2. 安裝相依
cd app
npm install

# 3. 測試 Electron 開發模式
npx electron .

# 4. 驗證所有功能正常

# 5. 打包
npx electron-builder --win --x64

# 6. 測試 dist/ 下的 .exe
```
