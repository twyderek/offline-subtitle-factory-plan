# 獨立審查報告：Windows Breeze managed runtime 0.50.0 正式發布（REL-039）

- 審查對象 commit／版本：遠端 annotated tag `v0.50.0`，tag peeled commit `44c40225e2b0a39e759048439e3db912b6333ad9`。
- 對應 08-CHANGE-LOG 條目：2026-08-25 — Windows Breeze Managed Runtime 0.50.0 正式版本發布（REL-039）。
- 審查輪次：round2。
- 審查代理啟動時間、上下文來源：2026-08-25（Asia/Taipei）；獨立 read-only review context，未沿用主要開發代理對話記憶。依 `app/docs/project-management/workflows/04-INDEPENDENT-REVIEW.md` 執行。

## 1. 需求完整性

- 判定：部分通過。
- 證據：`git ls-remote origin`／`git show-ref` 顯示 `v0.50.0` 已存在；`git show v0.50.0` 顯示其提交內容為 `44c40225e2b0a39e759048439e3db912b6333ad9`。`app/package.json:3`、`app/package-lock.json:3` 及 lockfile root package 均為 `0.50.0`。本機 `dist-0.50.0` 含 Setup、Portable、blockmap、`latest.yml`、SHA-256 清單及簽章狀態檔。
- GitHub Release 狀態：只讀 `GET https://api.github.com/repos/twyderek/offline-subtitle-factory-plan/releases/tags/v0.50.0` 回傳 HTTP 404。GitHub Release 本身尚未建立；因此發布後資產／digest／下載 URL 反向核對尚不可完成。

## 2. 邏輯正確性

- 判定：通過（以本輪可驗證的候選包與版本／標籤關係為限）。
- 證據：遠端 tag 的 peeled commit 與要求完全一致；封裝內 `dist-0.50.0/win-unpacked/resources/app/package.json` 亦為 `0.50.0`。`latest.yml` 的版本與 Setup size／SHA-512 metadata 存在，且稽核紀錄 `app/docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:179-183` 對版本、資產及 metadata 關係有明確記錄。
- 限制：因正式 Release 尚未建立，尚未能驗證 GitHub API asset metadata、公開下載 URL 與本機檔案的最終一致性。

## 3. 邊界情況

- 判定：部分通過。
- 證據：已核對 Setup／Portable 兩種 Windows x64 主資產、blockmap、`latest.yml`、SHA 清單及 unsigned 狀態；unpacked 內容存在 `RELEASE-NOTES-0.50.0.md`、`docs/BREEZE-ASR-25.md`、Breeze manifest、Whisper.cpp CLI、Tiny model，且不存在 `breeze-asr-25.pt`。兩個 EXE 的 `7z t` 均輸出 `Everything is Ok` 且 exit 0。
- 尚不可驗證：正式 Release 下載後的完整 asset round-trip、pristine Windows VM、安裝／解除安裝及 SmartScreen／Defender 行為。主要代理的 packaged Electron smoke 結果在本輪可讀證據中不可取得；只取得 `app/scripts/verify-windows-installation.ps1` 腳本，不能把腳本內容推定為實際通過。

## 4. 程式碼品質

- 判定：部分通過。
- 證據：`app/package.json` 的 build 設定明確使用 0.50.0 artifact naming；`dist-0.50.0/SIGNING-STATUS-windows-x64.txt` 明確標示 unsigned；`app/docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:181-184` 已記錄封裝內容、checkpoint 排除及未簽章／license evidence 限制。`npm run check` 的 exit 0 已由主要代理記錄，本輪未重跑。
- 限制：本輪沒有重新審查完整 source diff，也沒有把 engineering license evidence 當作法律意見；部分 transitive license metadata 仍需後續逐項確認。

## 5. 測試覆蓋

- 判定：部分通過。
- 證據：主要代理已記錄 2026-08-25 `npm run check` exit 0，涵蓋 docs check、語法檢查及完整 npm test（`app/docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:182`）。本輪重新執行唯讀 `7z t`：Setup exit 0、Portable exit 0；重新計算 SHA-256 並與 `dist-0.50.0/SHA256SUMS-windows-x64.txt` 比對一致：Setup `729539de4381d622e5872fb5d57a50902c5f531e1bf34c2258472a9fdaa53fe`／274020255 bytes，Portable `eb4732ab78cf45ce70f0a591d58362ea6d95672503848785318da556ce79100e`／273312899 bytes，blockmap `cdb62fa78a4be606f9d986d95b39637449da297b48219eea1c91551e3a4c17fe`／286949 bytes。
- 不可用檢查：本輪未重跑 `npm run check`，未取得 packaged Electron smoke 的實際輸出或 exit code；依範圍只檢視 smoke script／既有紀錄。

## 6. 實際運行結果

- 判定：部分通過。
- 證據：本機 `dist-0.50.0` 資產可讀、SHA 清單重放一致、Setup／Portable archive integrity 均通過；unpacked payload 的版本、Release notes、Breeze guide／manifest、Whisper.cpp 與 Tiny model marker 均可讀，Breeze checkpoint 未被打入。可取得的 smoke script `app/scripts/verify-windows-installation.ps1` 定義 Setup 安裝、renderer smoke、解除安裝及 Portable smoke，但本輪沒有其 0.50.0 實際執行輸出；因此 packaged Electron smoke 狀態記錄為 unavailable，而非 pass。
- GitHub Release：尚未建立（API 404）。本輪沒有建立、修改或發布 Release。

## 綜合判定

- 結論：有條件通過；0.50.0 候選包可在明確接受下發布，但目前尚不能宣稱已完成無條件發布驗收，也不能宣稱 GitHub Release 已建立。
- 阻擋問題（若有）：發布前仍應保存 packaged Electron／Setup／Portable smoke 的實際輸出與 exit code，並於 Release 建立後反向核對所有 asset 名稱、大小、digest 與直接下載 URL。若這些證據不可補齊，應將本輪維持為有條件發布。
- 剩餘風險：Windows EXE 未 Authenticode 簽章，可能觸發 Unknown Publisher／SmartScreen；沒有 pristine Windows VM；engineering license evidence 不是法律意見，部分 transitive license metadata 未逐項完成法律審查；尚有跨機型、長音訊、Breeze 品質／效能、GPU、macOS managed runtime 與正式下載後行為等 post-release verification risks。
- 給主要開發代理的具體修正要求（若有）：建立 GitHub Release 後保存 API／下載核對結果；保存並連結 0.50.0 packaged Electron smoke log；在 Release notes／目前狀態持續揭露 unsigned、無 pristine VM、license evidence 非法律意見及上述 post-release risks。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案；未 commit、push、tag 或建立 GitHub Release。
- 若上述聲明不實，本報告無效。
