# 離線字幕工廠 v0.52.1

## 本次更新

- AI provider 設定介面依供應商分流欄位；Azure Deployment／API Version 僅於 Azure 顯示，Ollama／LM Studio 使用本機 API Key 欄位。
- 新增 NVIDIA NIM provider 設定與 OpenAI-compatible `/models`／`/chat/completions` 支援。
- YouTube 發佈說明加入六步驟 Google Cloud／OAuth 設定圖解，並提供詳細 DOCX 參考下載。
- YouTube 發佈視窗明確區分字幕 AI provider 與 YouTube OAuth；不會把 OAuth JSON、Client Secret 或 token 放入 repo 或一般 UI 狀態。

## Windows x64 pre-release 資產

本次 GitHub `v0.52.1` 為 Windows x64 unsigned pre-release，提供 Setup 與 Portable APP。兩者未使用 Authenticode 憑證，Windows 可能顯示 Unknown Publisher／SmartScreen 警告；下載後請先核對 Release 附帶的 SHA-256 資產。

本版以目前 root checkout 重新建立 package，並以 packaged renderer smoke 驗證首頁、Electron bridge、設定 modal、SRT upload、trim、AI review 與 YouTube guide PNG／DOCX 靜態資產。這些證據不等同 Setup 安裝後 native GUI／AX 驗收，也不等同真實 Google OAuth、YouTube 頻道、影片或字幕上傳驗收。

## YouTube 設定參考

首次使用 YouTube 發佈前，請在 Google Cloud 建立 Desktop OAuth client、啟用 YouTube Data API v3，並把 OAuth Testing 模式的登入帳號加入測試使用者。APP 內的實際入口是 YouTube 發佈視窗中的「匯入 OAuth JSON」與「連結頻道」。

YouTube 發佈會將影片設為私人影片；公開、排程與處理狀態請在 YouTube Studio 確認。請勿分享 OAuth JSON、Client Secret 或授權 token。

## 已知限制

- `node scripts/test-youtube.mjs` 的 Windows symlink path-boundary fixture 可能因系統未啟用 symlink 權限而以 `EPERM` 結束；這不應被描述為完整 publisher regression 通過。
- 尚未完成 Setup 安裝／解除安裝、乾淨帳號、native GUI／AX、screen reader、真實 Google OAuth／API key／外部網路與實帳號 YouTube 上傳驗收。
- 本次 pre-release 不包含 macOS 重新建置資產；不得以本版宣稱 macOS release-ready。

## 驗證

來源、封裝、版本、資產名稱與 SHA-256 請以本 Release 的 `SHA256SUMS-windows-x64.txt`、`latest.yml`、Setup／Portable 檔案及 GitHub asset digest 為準。
