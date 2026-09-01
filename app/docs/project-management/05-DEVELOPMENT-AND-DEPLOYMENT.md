# 軟體開發與部署

## 支援環境

- Node.js 22.12.0 以上；CI 目前使用 Node.js 22。Electron 43 的安裝工具鏈不再支援 Node 20。
- 目前 unreleased candidate 為 0.51.0；0.50.1 preparation 已取消／由 0.51.0 取代。LM Studio provider 已移除；官方本機 provider 為 Ollama，`openai-compatible` 僅代表通用 transport。
- 0.50.0 已鎖定 Electron 43.3.0／electron-builder 26.15.7 並作為 Windows Breeze managed runtime 正式 App 版本發布；依賴或版本更新後必須重跑完整 audit、雙平台封裝與 packaged renderer smoke。既有公開 `v0.49.1` 與 runtime Release 資產保留為歷史／獨立版本，不得覆寫。
- Windows 10/11 x64；封裝由 `windows-2022` runner 執行。
- Apple Silicon macOS 12 以上。

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
- Breeze checkpoint、Python／PyTorch／patched Whisper runtime 不納入 Windows runtime 或安裝包；目前 0.51.0 候選封裝必須包含 `docs/BREEZE-ASR-25.md` 與 `RELEASE-NOTES-0.51.0.md`，並維持 Whisper.cpp Tiny 為預設可用路徑。0.50.0 Release notes 仍作為歷史文件保留。
- 0.51.0 候選 build 使用明確 GitHub publish config 產生本機 `latest.yml`／`app-update.yml` metadata；release preparation 指令一律使用 `--publish never`，不得因 metadata 生成而上傳或建立 GitHub Release。unsigned internal preview 必須明確標示未簽章。

### Breeze managed runtime build（開發者／CI only）

```powershell
./scripts/build-breeze-runtime-windows.ps1 `
  -OutputDirectory .\breeze-runtime-output `
  -PythonExecutable (Get-Command python).Source `
  -BreezeRevision c0993ecd98522d61066d3f5ce769e35c848b7855 `
  -PatchedWhisperRevision f94c6ba670a35ee8d720d4221e102f4685c288d6 `
  -RuntimeVersion 2026.08.1 `
  -LicenseReviewApproved
```

這個 script 只供 Windows runner／開發者建立 optional runtime package；它可以在 build 階段使用 `git clone`、venv 與 pip，但不會被 App 呼叫。預設使用 PyTorch CPU index 的 `torch==2.4.1+cpu`，並以 `torch.version.cuda is None`／`torch.cuda.is_available() == false` 驗證，不只依套件名稱推定 CPU-only。`-LicenseReviewApproved` 是明確門檻，未完成 Breeze、patched Whisper、PyTorch、Python 與 transitive dependencies 的 redistribution review 時必須 fail。本輪已用固定 revision 產出並發布 `breeze-runtime-2026.08.1`；ZIP size／SHA、license evidence、HTTP Content-Length 與實際下載 hash 已核對，正式 manifest 已切換為 `download.available:true`。

`build-breeze-runtime-windows.yml` 使用 `workflow_dispatch`、固定 Breeze／patched Whisper revision、Python 3.11 與 CPU Torch，先執行 `npm run check`，再對 staged `python.exe` 重跑 `whisper.available_models()`／CPU Torch probe，最後才上傳短期 candidate artifact。公開 Release 仍須完成 engineering license evidence、SHA／size 核對與 Windows clean-machine acceptance；本輪已以本機 Windows build、公開 Release、受控 clean-profile API 安裝與真實 App job 完成驗收，pristine VM／packaged Electron 仍待另案驗收。

使用者端 managed runtime 位於 `%LOCALAPPDATA%\\Offline Subtitle Factory\\runtimes\\breeze-asr-25\\<runtime-version>`，不放入 `Program Files` 或 Electron `resources`；下載、hash、temporary extraction、capability probe 與 atomic activation 由 `lib/breeze-runtime-manager.mjs` 處理。

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
