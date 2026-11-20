# 軟體開發與部署

## 支援環境

- Node.js 22.12.0 以上；CI 目前使用 Node.js 22。Electron 43 的安裝工具鏈不再支援 Node 20。
- NVIDIA NIM provider 使用外部 OpenAI-compatible endpoint；預設 `https://integrate.api.nvidia.com/v1`，API Key 只可經受控環境／安全金鑰流程提供，不得寫入 repo、一般設定、log 或封裝 artifact。`/models` 成功僅證明 endpoint／認證／模型清單契約，不代表模型品質或可計費服務已完成驗收。
- 0.51.0 公開版使用 Electron 43.3.0／electron-builder 26.15.7。0.52.0 source `b2b942eb6d941e61f1a5a27e065e51dd8c31e26f` 使用 Electron 43.8.0／electron-builder 26.17.0；round15 確認該 SHA 的完整 source check／production audit、macOS arm64 candidate package／runtime／checksum／signature／UI smoke、exact-source Windows CI run `39380574427`／artifact `12244799752` 與 73/73 shared app hashes 通過各自聲明範圍。Windows artifact 僅讀取 500,000-byte ZIP tail range，未下載完整 archive，無 whole-archive integrity claim；smoke 合成影片沒有有效播放／完整轉錄證明。round14 發現的額外 Windows user-profile 路徑已以中性佔位符去識別；round12 報告中的單一路徑為需求方明確核准且在 README／Release notes 揭露的唯一例外。round15 整體判 BLOCK，原因是 `00`／`05`／`06`／`08` 未同步 b2b942e 的實際證據；新工作項目已立項同步文件，文件新 SHA 須重新通過完整 check、macOS arm64 candidate、exact-source Windows CI／73-file hash gate 與 round16 無阻擋複審。依 `workflows/06-BUILD-RELEASE.md`／`workflows/07-DOCUMENT-CLOSEOUT.md`，`docs:check:final` 在發布及資產核對後執行。此版不含 Windows assets；`GHSA-hp3w-g68c-fv3c`、ad-hoc／未公證與 Google 流程未驗收仍須揭露。GitHub Latest 仍 0.51.0；不得覆寫既有 tag／Release。
- 0.50.0 開發分支目前只變更 Breeze 效能參考 payload、選取後提醒與版本識別；尚未建立 tag／Release。若進入發布流程，需以 `v0.50.0` 重新建置並重新核對雙平台資產。
- Windows 10/11 x64；封裝由 `windows-2022` runner 執行。
- Apple Silicon macOS 12 以上。

## 2026-11-18 v0.52.1 GitHub pre-release 發布後核對

- 版本由 `0.52.0` 升為 `0.52.1`，Release notes 為 `RELEASE-NOTES-0.52.1.md`；目標為目前 origin `twyderek/offline-subtitle-factory-plan`，不切換至附件計畫中的另一個 app repo。
- `npm run electron:build:unsigned` exit 0；Setup `255,587,780` bytes／SHA-256 `5C312FDF9A8F652F3C26BE639E508FFDAE0397B51076FC529499D02AC07362BC`；Portable `254,880,396` bytes／SHA-256 `3ACBC7DEA8122D9AF7EF3F54F01D0EE41F3B832479389F7EBB498C7EE5334A93`；三項 executable 均未簽章。
- unpacked 與 Portable packaged renderer smoke 均通過；資產、版本與 Release notes 已進入 `dist/win-unpacked/resources/app`。GitHub `v0.52.1` prerelease 已發布於 `https://github.com/twyderek/offline-subtitle-factory-plan/releases/tag/v0.52.1`，tag 解析至 commit `75d01a9ecd112f998ca1765e4d1d71e75c674e61`。
- 六項 Release assets 的 API name／size／`sha256:` digest／直接下載 URL 已核對；下載後逐項重算 size／SHA-256 全部一致。Setup `255,587,780` bytes／`5c312fdf9a8f652f3c26be639e508ffdae0397b51076fc529499d02ac07362bc`，Portable `254,880,396` bytes／`3acbc7dea8122d9af7ef3f54f01d0ee41f3b832479389f7ebb498c7ee5334a93`；本版仍為 unsigned Windows pre-release，安裝後、native GUI／AX、macOS 與真實 Google／YouTube 上傳未驗收。

## 2026-11-18 v0.52.0 本機 Windows unsigned APP candidate

- 以 root `0.52.0`、Electron `43.8.0`／electron-builder `26.17.0` 執行 `npm run electron:build:unsigned`，exit 0；輸出 `dist/win-unpacked/`、ASCII 檔名 Setup／Portable 與 `latest.yml`。本輪只建立本機 candidate，不建立 tag／Release、不上傳、不推送。
- Setup `252,618,434` bytes／SHA-256 `8bc2656db6e65f4199aa5d9a1e35ebeff3920cc28006e95efd82c1ff1cdaefc6`；Portable `251,911,057` bytes／SHA-256 `4f5d1bddc6666b73bd3abc4622a1ad19d85c904a21c931c7dd2be65801af4990`。NanaZip `7z t` 兩包均 exit 0／`Everything is Ok`；`latest.yml` 的 `0.52.0`、Setup size 與 Base64 SHA-512 與檔案 bytes 相符。
- `dist/win-unpacked/resources/tools` 重新執行 runtime verifier 通過；FFmpeg、FFprobe、Whisper.cpp CLI／DLL 與 tiny model 均符合 `win32-x64` manifest。封裝 resources/app 未發現 `.env`、憑證、私鑰或 partial artifact。Setup／Portable／unpacked 主 executable 的 Authenticode 均為 `NotSigned`，不得描述為已簽章可信發布。
- Builder 的 `asar:false` 與未配置憑證警告為已知封裝狀態；本輪未改變該既有策略，並以 archive integrity、runtime hash、renderer smoke 與 unsigned 狀態驗證代替簽章聲明。

## 每次開發前

```bash
npm run project:preflight -- --type=development
git status --short
```

完成必讀並在 `08-CHANGE-LOG.md` 建立工作項目後，才可修改。安裝依賴使用 `npm ci`；不得將 token、API Key、PFX 或密碼寫入檔案。

## 本機驗證

```bash
npm run docs:check
npm run check
```

`npm run check` 應包含文件完整性、語法、媒體編輯、AI optimizer、provider、校閱 UI 與核心 API 回歸。需要本機 port 的測試若受 sandbox 限制，須明確取得授權後重跑。

## Windows runtime 與打包

```powershell
npm ci
Set-ExecutionPolicy -Scope Process Bypass
./scripts/prepare-windows-runtime.ps1
npm run check
npm run electron:build       # 需要有效簽章設定
npm run electron:build:unsigned  # 僅供已明確接受風險的未簽章版本
```

- runtime 固定版本並比對 SHA；不得依賴開發機 venv 或系統 PATH。
- 正式可信發布應配置 `WINDOWS_CODESIGN_PFX_BASE64` 與 `WINDOWS_CODESIGN_PASSWORD`。
- 未簽章發布必須在 Release notes、狀態檔與交付說明標示 Unknown Publisher／SmartScreen，並附 SHA。
- Setup、Portable、blockmap、`latest.yml` 的檔名必須彼此一致；上傳後需重新核對 GitHub 實際資產名稱。
- Breeze checkpoint、Python／PyTorch／patched Whisper runtime 不納入 Windows runtime 或安裝包；封裝必須包含 `docs/BREEZE-ASR-25.md` 與 0.49.1 Release notes，並維持 Whisper.cpp Tiny 為預設可用路徑。

## macOS 打包

```bash
npm ci
npm run check
npm run electron:build:mac:dir
npm run electron:build:mac
```

- 目前為 ad-hoc 簽章、未公證；不得描述為 Apple Developer ID 正式公證版本。
- 發布前驗證 `.app`、DMG、ZIP、bundled runtime 與 SHA。
- Electron 43 是目前維持 macOS 12 最低版本的升級線；後續若升至 Electron 44 以上，須先把最低支援版本重新評估為 macOS 13 以上。
- Breeze checkpoint、Python／PyTorch／patched Whisper runtime 不納入 App bundle；封裝內容檢查須確認沒有意外帶入開發機 venv、模型快取或約 3 GB checkpoint。

## GitHub 發布清單

1. 執行 `npm run project:preflight -- --type=release`；確認工作樹、版本號、分支、commit 與 Release tag 關係已記錄。
2. CI build 與必要測試成功；來源 SHA 與 artifact 可追溯。
3. 下載 artifact，核對 runner checksum；展開或列出封裝內容。
4. 更新 Release notes：功能、修正、手冊、簽章狀態、已知風險。
5. 上傳穩定 ASCII 檔名的資產，避免平台改名造成 checksum／updater 不一致。
6. 發布後核對名稱、大小、GitHub digest、直接下載 URL、checksum 內容與 `latest.yml`。
7. 更新 `00-CURRENT-STATUS.md`、`04-DEVELOPMENT-HISTORY.md`、`06-TEST-AND-PROCESS-AUDIT.md` 與 `08-CHANGE-LOG.md`。

## 常設簽章風險授權

- `AUTH-2026-07-23-01` 已同意 Windows Authenticode 未簽章及 macOS 未經 Apple Developer ID 簽章／公證狀態下公開發布。
- 每次適用發布須在工作紀錄引用該 ID，並持續揭露 Windows Unknown Publisher／SmartScreen 與 macOS Gatekeeper 風險。
- 此授權不涵蓋未實機測試、checksum／資產不一致、未驗證 updater metadata、機密洩漏或測試／審查失敗；完整範圍見 `09-STANDING-AUTHORIZATIONS.md`。

## 0.45.2 候選發布

- 版本：`0.45.2`；候選 tag：`v0.45.2`。
- Windows workflow：`Build Windows 0.45.2`，輸出 `offline-subtitle-factory-0.45.2-windows-x64`。
- macOS 與 Windows 均內建 `resources/docs/0.45.2/USER-GUIDE.html` 及圖文／動畫資產。
- 本次授權接受 Windows 未簽章、macOS 未公證及未完成跨平台乾淨實機測試；仍須在 Release notes 與最終狀態持續揭露。

## 回復策略

- 程式缺陷：停止新增下載導流，保留 Release 證據，發布修正版而非靜默覆蓋不可追溯內容。
- 資產命名／說明錯誤：先上傳正確資產並驗證，再刪除明確的錯誤重複項。
- checksum 不一致：視為阻擋；不得要求使用者忽略。
