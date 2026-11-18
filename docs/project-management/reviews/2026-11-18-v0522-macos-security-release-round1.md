# 獨立審查報告：v0.52.2 macOS arm64 安全修正版發布候選

- 審查對象 commit／版本：`32e22357d36fbe1b7bed235277d14ae8ea9abba1`／`v0.52.2`
- 對應 08-CHANGE-LOG 條目：2026-11-18 — v0.52.2 macOS arm64 安全修正版打包與 GitHub 發布
- 審查輪次：round1
- 審查代理啟動時間、上下文來源：2026-11-18 16:14 CST；依需求方提供的獨立審查指示，以本審查上下文重新核對，未採用先前嘗試的審查結論。
- 審查界限：遵守只做快速本機核對；未使用網路、未重跑完整測試、未執行 Git staging／commit／push／tag／upload／publish。唯一檔案寫入為本報告。

## 1. 需求完整性
- 判定：通過
- 證據：`docs/project-management/08-CHANGE-LOG.md:8-19` 指定來源 `v0.52.1` peeled commit `75d01a9ecd112f998ca1765e4d1d71e75c674e61`、新版本 `0.52.2`、macOS arm64 範圍、Electron `43.8.10`、electron-builder `26.18.1`，並記錄本次需求方核准建立 GitHub Release 及接受 ad-hoc／未公證限制。`docs/project-management/09-STANDING-AUTHORIZATIONS.md:5-14` 的 `AUTH-2026-07-23-01` 有效，明確涵蓋未用 Apple Developer ID 簽章／公證的發布，且未豁免測試、審查及資產核對。
- 證據：`package.json:3,49-50` 與 `package-lock.json:3,9,1522-1544` 版本及依賴相符；`../dist/BUILD-PROVENANCE-macos-arm64.json:5-19` 記錄候選 commit 與 arm64 目標。

## 2. 邏輯正確性
- 判定：通過
- 證據：`package.json:3,49-50` 宣告版本 `0.52.2`、Electron `^43.8.9`、electron-builder `^26.18.1`；`package-lock.json:1522-1544` 鎖定 Electron `43.8.10` 及 electron-builder `26.18.1`。`../dist/BUILD-PROVENANCE-macos-arm64.json:5-19` 的 candidate commit、作業系統、Electron 與 builder 版本與審查對象一致。
- 證據：`README.md:3-14`、`RELEASE-NOTES-0.52.2.md:5-15`、`docs/project-management/00-CURRENT-STATUS.md:5-17` 一致揭露本輪只提供 macOS arm64、Windows `v0.52.1` 仍使用受影響的 Electron `43.8.0`、本版 ad-hoc／未公證，以及正式 audit 0 項、完整 build-time audit 11 項（5 moderate／6 high）。本地檢查確認候選版本與 metadata 一致；依要求未透過網路重新查詢外部 advisory。

## 3. 邊界情況
- 判定：通過（限制已揭露）
- 證據：`../dist/mac-arm64/離線字幕工廠.app/Contents/Info.plist` 由 `/usr/libexec/PlistBuddy` 讀得 `CFBundleShortVersionString=0.52.2`、`CFBundleVersion=0.52.2`、`LSMinimumSystemVersion=12.0`；`lipo -archs` 回報 `arm64`。檢查時間：2026-11-18 16:14 CST。
- 證據：`RELEASE-NOTES-0.52.2.md:6-15` 及 `../dist/SIGNING-STATUS-macos-arm64.txt:1-5` 揭露未使用 Apple Developer ID、未公證、未驗 Gatekeeper、未跑乾淨帳號與 macOS 全版本矩陣、未以真實 Google／YouTube 帳號測試、合成媒體不代表完整轉錄品質，並揭露 11 項 build-time findings。`docs/project-management/evidence/2026-11-18-v0522-macos-release-candidate.json:52-56,85-90` 另將三個 Ollama／Seatbelt 整合項列為環境條件不足而 skip，沒有算作通過。
- 剩餘風險均已在候選說明與證據中列出；`AUTH-2026-07-23-01` 對簽章風險的接受不包含上述其他未驗項目。

## 4. 程式碼品質
- 判定：通過（本輪未修改應用程式碼）
- 證據：`git diff-tree --no-commit-id --name-status -r HEAD` 顯示本候選 commit 變更為 README、release notes、治理紀錄／證據及 package／lockfile；沒有應用程式原始碼變更。`git status --short --branch` 顯示工作樹原先乾淨，HEAD 為指定 commit。此輪靜態檢視集中於版本／依賴／資產 metadata 的一致性。
- 證據：`package.json:3,49-50` 與 `package-lock.json:3,9,1522-1544` 的 package version 和依賴範圍／鎖定版本一致，未發現版本標示錯配。

## 5. 測試覆蓋
- 判定：有條件通過
- 證據：`docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:5-12` 與 `docs/project-management/evidence/2026-11-18-v0522-macos-release-candidate.json:16-56` 記錄 `npm ci`、隔離系統 Python 的 `npm run check`、`npm run electron:build:mac`、runtime 驗證、production audit、DMG／ZIP 完整性及 packaged renderer smoke 結果；來源紀錄稱上述主要命令 exit 0、production audit 0。完整 audit 記錄 5 moderate／6 high，Ollama 相關三項為明確 skip。
- 本審查依限制沒有重跑上述套件或 UI smoke。機器證據記錄結果，但沒有記錄原測試的執行時間或原始逐項輸出；因此本報告只將它們列為候選工作紀錄所載證據，不宣稱本審查重現了完整測試。
- 本審查於 2026-11-18 16:14 CST 執行下列快速獨立檢查：
  - 在 `/Users/nycu/Documents/離線字幕工廠/.acceptance-worktrees/dist` 執行 `shasum -a 256 -c SHA256SUMS-macos-arm64.txt`，exit 0；DMG、ZIP 與兩個 blockmap 均回報 `OK`。
  - 以本機 Node `js-yaml` 解析 `../dist/latest-mac.yml`，從實際 DMG／ZIP bytes 計算 SHA-512 與大小並比對每筆 `files` 及預設 ZIP 欄位，exit 0；版本為 `0.52.2`，兩檔 size 與 SHA-512 均相符。
  - 以 `/usr/libexec/PlistBuddy`、`lipo -archs` 檢查版本、最低 macOS 與架構，輸出為 `0.52.2`／`0.52.2`／`12.0`／`arm64`。
  - 對 `../dist/mac-arm64/離線字幕工廠.app` 執行 `codesign --verify --deep --strict --verbose=2`，exit 0；輸出 `valid on disk` 及 `satisfies its Designated Requirement`。

## 6. 實際運行結果
- 判定：有條件通過
- 證據：本審查實際檢查了候選 `.app` 的 Info.plist、主程式架構與 deep strict code signature；簽章驗證命令及輸出見第 5 節。`../dist/SHA256SUMS-macos-arm64.txt:1-4` 的四項 SHA-256 均已對實際 bytes 驗證；`../dist/latest-mac.yml:1-10` 中 DMG／ZIP 的版本、size、SHA-512 與預設 ZIP 欄位亦逐一對實際 bytes 驗證。
- 證據：`docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:7-11` 與 `docs/project-management/evidence/2026-11-18-v0522-macos-release-candidate.json:39-50` 記錄 DMG、ZIP 中的 app 曾各自啟動並執行 renderer smoke，涵蓋首頁／設定、字幕任務與清理、AI review、YouTube 指南資產及合成影片 trim 流程。本審查依指示未再次啟動 app，因此此項是可追溯的既有執行紀錄，並非本輪重演。
- GitHub Release 尚未建立；本輪未使用網路，無法核對 GitHub API asset digest 或直接下載 bytes。此為發布後必做的反向核對，**不阻擋現在建立 Release**，但在完成前不可將整項發布工作結案。

## 綜合判定
- 結論：有條件通過
- 完整單句結論：**本輪獨立審查結論為有條件通過：本機發布前可核對項目的授權、候選來源／版本、風險揭露、SHA-256、updater SHA-512／大小、arm64 目標及 ad-hoc 嚴格簽章均一致，沒有阻擋建立 GitHub Release 的未解問題；完整回歸與 packaged renderer smoke 僅依候選工作紀錄採信而未由本審查重跑，GitHub API digest 與直接下載 bytes 反向核對則須於發布後完成才能結案。**
- 阻擋問題（若有）：無發布前阻擋。發布後 GitHub API／下載核對仍是結案條件，不是建立 Release 的前置阻擋。
- 剩餘風險：ad-hoc 簽章、未公證／未驗 Gatekeeper；完整 audit 11 項 build-time findings；三項 Ollama integration skip；未測乾淨帳號、全 macOS 版本矩陣、真實 Google／YouTube 流程及完整轉錄品質。完整測試與 smoke 的執行時間未存於目前機器證據，本審查未重跑。
- 給主要開發代理的具體後續：將本報告連結及本節完整單句結論逐字記入 08 工作條目；發布後取得 GitHub API asset digest 並下載資產回讀核對 SHA／bytes，再更新 00／06／08 並執行文件結案流程。

## 審查代理聲明
- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
