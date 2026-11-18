# v0.52.1 GitHub pre-release 發布後獨立唯讀複審報告 round4

- 審查日期：2026-11-18
- 審查對象：`C:\\Users\\derek\\.codex\\worktrees\\05db\\offline-subtitle-factory-plan`
- 發布對象：GitHub release id `449596135`、tag `v0.52.1`、[release URL](https://github.com/twyderek/offline-subtitle-factory-plan/releases/tag/v0.52.1)。
- 審查限制：只新增本報告；不修改其他檔案、既有報告或 `app/`，不 commit／push／tag／release／upload。

## 1. 需求完整性

- 判定：通過
- 證據：GitHub API 回報 release id `449596135`、tag `v0.52.1`、URL 正確、`draft=false`、`prerelease=true`，資產數量為 6；annotated tag 的 target commit 為 `75d01a9ecd112f998ca1765e4d1d71e75c674e61`。
- 證據：release 資產名稱完整包含 Setup、Portable、Setup blockmap、`latest.yml`、`SHA256SUMS-windows-x64.txt` 與 `SIGNING-STATUS-windows-x64.txt`，符合本版 Windows unsigned pre-release 交付範圍。

## 2. 邏輯正確性

- 判定：通過
- 證據：6 項 GitHub API asset 的 name、size、`sha256:` digest 與 download URL 均可讀取；完整串流下載後逐項計算的 bytes 與 SHA-256 全部等於 API metadata。
- 證據：GitHub tag target、release tag、`latest.yml` version 與 Setup size／SHA-512、SHA256SUMS 所列 Setup／Portable hashes 互相一致，沒有發現版本或資產名稱漂移。

## 3. 邊界情況

- 判定：部分通過
- 證據：本機 Setup 為 `255,587,780` bytes／SHA-256 `5C312FDF9A8F652F3C26BE639E508FFDAE0397B51076FC529499D02AC07362BC`；Portable 為 `254,880,396` bytes／SHA-256 `3ACBC7DEA8122D9AF7EF3F54F01D0EE41F3B832479389F7EBB498C7EE5334A93`，均與 GitHub 下載後 hash 相同。
- 證據：Setup blockmap 為 `267,109` bytes 且 API digest 匹配；NanaZip 對 Setup／Portable 均回報 `Everything is Ok`；三個 Windows executable 的 Authenticode 狀態均為 `NotSigned`，signing-status 明確揭露 unsigned／SmartScreen 風險。
- 未覆蓋：Setup 安裝／解除安裝、捷徑、乾淨帳號、native GUI／AX、screen reader、macOS 資產、真實 Google OAuth／YouTube upload 與 GitHub 安裝後流程尚未驗證。

## 4. 程式碼品質

- 判定：通過
- 證據：既有 source／package evidence 已確認 root package 與 unpacked package 為 `0.52.1`，YouTube PNG／DOCX stable assets 已進入 Windows package；staged root allowlist 不含 `app/` dirty 或 debug files。
- 證據：既有發布文件與 Release notes 將本版限定為 Windows x64 unsigned pre-release，未把 packaged smoke、asset metadata 或下載 hash 誤寫成安裝後、macOS 或真實 Google 驗收。
- 證據：既有 secret-scope evidence 未發現 OAuth JSON、Client Secret、token 或簽章憑證進入 staged root scope；本次 reviewer 只讀取 GitHub metadata／下載 bytes，未保存下載檔案至專案。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：既有 unpacked 與 Portable packaged renderer smoke 均 exit 0，完成首頁、Electron bridge、設定 modal、Breeze、SRT upload、trim、AI review、folder flow，並確認 YouTube module／PNG／DOCX HTTP 讀取成功。
- 證據：既有 focused syntax、review UI、YouTube SDK／streams／lifecycle／UI CLI、隔離 PATH core、runtime／archive／metadata checks 均有通過記錄；GitHub 6 項資產又完成全數下載後 size／hash replay。
- 證據：完整 `npm test`／publisher regression 仍受 `scripts/test-youtube.mjs:154` 的 Windows `fs.symlinkSync` `EPERM` 限制，故不宣稱完整 YouTube regression 通過；這不影響本次 GitHub 6 項資產 digest 核對。
- 未覆蓋：未重新執行安裝後 smoke 或真實頻道上傳；GitHub download evidence 只證明資產完整性，不證明 APP 的安裝後行為。

## 6. 實際運行結果

- 判定：通過
- 證據：GitHub release id、tag、target commit、release URL 與 6 項 asset metadata 均已取得；6 項資產完整下載後的 bytes 與 API size 全數相等，下載後 SHA-256 與 API digest 全數相等。
- 證據：`latest.yml`、Setup blockmap、SHA256SUMS 與 signing-status 均可由 release download URL 取得；本機 Setup／Portable hash 與 GitHub 下載後 hash 一致，release 為非 draft 的 prerelease。
- 證據：既有 unpacked／Portable packaged renderer smoke 與 Windows unsigned build evidence 通過；目前結果可支持「GitHub v0.52.1 Windows unsigned pre-release 資產已發布且可下載核對」，不外推為完整安裝或跨平台驗收。

## 綜合判定

- 結論：有條件通過
- 可逐字引用的完整結論句：**有條件通過：v0.52.1 GitHub Windows unsigned pre-release 的 tag、資產與下載後 digest 均已核對；不代表安裝後、macOS 或真實 Google 驗收。**
- 阻擋問題（若有）：
  - 無 P0／P1 的 tag、release asset、下載後 size／hash 或本機 package integrity 阻擋問題。
  - 持續限制：unsigned package、Windows symlink `EPERM`、Setup 安裝後、native GUI／AX、macOS 與真實 Google／YouTube 流程仍未驗收。
  - 文件追蹤：目前 08 工作紀錄仍需由主要代理將本 round4 報告納入最終發布後審查引用；本報告不修改治理文件。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
