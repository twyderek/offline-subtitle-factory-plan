# 獨立審查報告：Windows Breeze managed runtime 0.50.0 公開發布後核對（REL-039）

- 審查對象 commit／版本：公開 GitHub Release `v0.50.0`；annotated tag peeled commit `44c40225e2b0a39e759048439e3db912b6333ad9`。
- 對應 08-CHANGE-LOG 條目：2026-08-25 — Windows Breeze Managed Runtime 0.50.0 正式版本發布（REL-039）。
- 審查輪次：round3。
- 審查代理啟動時間、上下文來源：2026-08-25（Asia/Taipei）；獨立 post-release read-only review context，未沿用主要開發代理對話記憶。依 `app/docs/project-management/workflows/04-INDEPENDENT-REVIEW.md` 執行。

## 1. 需求完整性

- 判定：通過。
- 證據：GitHub REST API `GET https://api.github.com/repos/twyderek/offline-subtitle-factory-plan/releases/tags/v0.50.0` 回傳 Release id `376060022`、`tag_name=v0.50.0`、`draft=false`、`prerelease=false`、published `2026-08-25T00:59:16Z`，且 asset count 為 7。公開頁面為 `https://github.com/twyderek/offline-subtitle-factory-plan/releases/tag/v0.50.0`。
- `git ls-remote origin 'refs/tags/v0.50.0*'` 顯示 tag object `8f3f9f3de47ef418f94056c87548ff52a742636a`，peeled ref `44c40225e2b0a39e759048439e3db912b6333ad9`；`git rev-parse 'v0.50.0^{}'` 與 `git show` 均指向同一 commit。
- 既有 `app/docs/project-management/08-CHANGE-LOG.md:29-33`、`app/docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:184-187` 已記錄公開 Release、發布後核對、packaged renderer smoke 與剩餘風險。當前 workspace 找不到先前 round2 報告檔案，故該報告原文無法再次獨立檢視；本輪不以其不存在推論發布失敗。

## 2. 邏輯正確性

- 判定：通過（公開 Release／tag／資產 metadata 關係）。
- 證據：API 回傳的 7 項資產如下，名稱、大小、GitHub digest 與直接下載 URL 均可回溯：

  | 資產 | bytes | GitHub SHA-256 digest | 直接下載 URL |
  |---|---:|---|---|
  | `latest.yml` | 380 | `083bdb1ef6ea8b8d966fcab7f896dde7fbb8a6b8098a45b48260eea367b851e3` | `https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.50.0/latest.yml` |
  | `offline-subtitle-factory-portable-0.50.0.exe` | 273312899 | `eb4732ab78cf45ce70f0a591d58362ea6d95672503848785318da556ce79100e` | `https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.50.0/offline-subtitle-factory-portable-0.50.0.exe` |
  | `offline-subtitle-factory-setup-0.50.0.exe` | 274020255 | `729539de4381d622e5872fb5d57a50902c5f531e1bf34c2258472a9fdaa53fe5` | `https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.50.0/offline-subtitle-factory-setup-0.50.0.exe` |
  | `offline-subtitle-factory-setup-0.50.0.exe.blockmap` | 286949 | `cdb62fa78a4be606f9d986d95b39637449da297b48219eea1c91551e3a4c17fe` | `https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.50.0/offline-subtitle-factory-setup-0.50.0.exe.blockmap` |
  | `RELEASE-NOTES-0.50.0.md` | 3058 | `b82abb313f59d890e842e3ae297d586762569bb5bbefd49dac3459429d810966` | `https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.50.0/RELEASE-NOTES-0.50.0.md` |
  | `SHA256SUMS-windows-x64.txt` | 336 | `84a4b7c064671aebb8d838ba77c178d8e23e48c87e1cdf6ae04d982498e19bab` | `https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.50.0/SHA256SUMS-windows-x64.txt` |
  | `SIGNING-STATUS-windows-x64.txt` | 167 | `f2f87f739f2d11bd05702d31110f98b1e49122e8f058fcc4d69c568ea516053a` | `https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.50.0/SIGNING-STATUS-windows-x64.txt` |

- `target_commitish=main` 在 Release metadata 中不替代 tag verification；tag peeled commit 與本地／遠端 ref 已另外核對，故來源關係成立。

## 3. 邊界情況

- 判定：部分通過。
- 證據：2026-08-25 只讀重放 7 個直接下載 URL 的 `curl.exe --range 0-0`：7/7 exit 0，均回傳 `HTTP/1.1 206 Partial Content`、`Content-Length: 1`，且 `Content-Range` 分別為 `bytes 0-0/380`、`273312899`、`274020255`、`286949`、`3058`、`336`、`167`，與 API size 完全一致。
- 既有 `06-TEST-AND-PROCESS-AUDIT.md:186` 記錄 5 個小型資產完整下載並 hash-match，以及兩個 EXE 的 GitHub digest／本機 SHA／大小一致；本輪沒有重新下載 7 個完整資產，避免將 range probe 誤寫成完整下載證據。
- 本機 `dist-0.50.0` 的 6 個可用檔案（`latest.yml`、兩個 EXE、blockmap、SHA 清單、signing status）均以 `Get-FileHash -Algorithm SHA256` 與 API digest／size 比對一致；本機 `dist-0.50.0` 沒有 `RELEASE-NOTES-0.50.0.md`，該檔本地 hash 本輪不可用，但公開 API metadata 與既有完整下載核對紀錄均存在。
- 封裝／工作流邊界依既有證據：兩個 EXE `7z t` 通過、unpacked App 含 0.50.0 notes／Breeze guide／manifest／Whisper.cpp／Tiny model，且未含 `breeze-asr-25.pt`；本輪未重跑 7z 或安裝生命週期。

## 4. 程式碼品質

- 判定：部分通過。
- 證據：`app/docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:179-187` 與 `app/docs/project-management/08-CHANGE-LOG.md:29-30` 提供版本一致性、封裝內容、`npm run check`、`npm audit`、runtime manifest／verify、packaged renderer smoke、公開資產 digest 與 range 回讀的可追溯摘要。packaged renderer smoke 被記錄為以 `dist-0.50.0/win-unpacked/離線字幕工廠.exe` 執行並 exit 0，覆蓋 preload／設定／導覽、Breeze 選擇、manual SRT job、trim、AI review、七 provider 與 folder event。
- 發布級限制仍成立：`app/RELEASE-NOTES-0.50.0.md` 與 `dist-0.50.0/SIGNING-STATUS-windows-x64.txt` 均明示 Windows Authenticode 未設定；治理紀錄也明示 runtime license review 是 engineering evidence，不是法律意見，且部分 transitive license metadata 尚未逐項 review。
- 本輪未重新審查完整 source diff、未重跑 packaged renderer，亦未將既有摘要擴大解釋為 pristine-machine 或跨平台品質證明。

## 5. 測試覆蓋

- 判定：部分通過。
- 證據：既有發布證據記錄 `npm run check`、`npm ci --ignore-scripts --dry-run`、`npm audit --json`（286 dependencies，0 項 info／low／moderate／high／critical）、`npm run runtime:manifest`、`npm run runtime:verify`、`git diff --check`、7z archive／封裝內容及 packaged renderer smoke 均通過（`06-TEST-AND-PROCESS-AUDIT.md:182-186`）。本輪實際執行 GitHub Release API、tag ref、7 項 range probe 及 6 個本地檔案 SHA／size 比對。
- Release evidence 結果：7/7 API assets 均有完整 name／size／digest／browser download URL；7/7 direct URLs 的 range response 均為 206 且 exact total size 正確。這證明公開資產可達及 HTTP range metadata 一致，不等同 7 個資產本輪全部完整下載後重 hash。
- 不可用或未重跑：本輪未重跑 `npm run check`、7z、packaged Electron、Setup 安裝／解除安裝、pristine VM、完整跨平台矩陣或真實長音訊／品質測試；依本輪範圍記錄為既有證據或未覆蓋。

## 6. 實際運行結果

- 判定：部分通過。
- 證據：公開頁面可辨識 Release `v0.50.0`、Latest 標示、發布者、短 commit `44c4022` 與發布時間；API 顯示 7 項正式 asset。所有直接下載 URL 都成功完成 1-byte range request，返回 exact total size；API digest 與本機 6 個檔案 hash／size 全部一致。既有記錄另提供 packaged renderer smoke exit 0、7z、完整小資產下載與 hash-match。
- 公開頁面在本次文字擷取中出現 `Assets 9` 及載入錯誤，但同一頁顯示資產區域載入失敗；API 明確回傳 7 項 asset，且 7 項清單與 REL-039 預期集合一致。本報告以 API 資產清單及直接 URL／range 結果為有效交付證據，將頁面 UI 的暫時性計數／載入錯誤保留為觀察事項，不據此新增發布阻擋。
- 剩餘實際運行風險：未在 pristine Windows VM 完成安裝／啟動／解除安裝／捷徑／Defender／SmartScreen 矩陣；未驗收 macOS managed runtime、台灣華語品質、長音訊效能、GPU、模型人工校閱與完整 source provenance。

## 綜合判定

- 結論：有條件通過。
- 阻擋問題（若有）：沒有新的公開 Release 資產一致性阻擋；但本輪必須維持條件式，而非無條件通過，因 Windows 未簽章、pristine VM／完整實機矩陣、逐項 license review、品質／效能與完整 source provenance 仍未閉合，且本地 Release Notes 檔案缺失使本輪無法對該項做本地 hash 重放。
- 剩餘風險：Windows Unknown Publisher／SmartScreen；未使用 Authenticode；沒有 pristine Windows VM；engineering license evidence 不是法律意見且 transitive metadata 仍待逐項 review；Breeze 台灣華語品質、長音訊 CPU 效能、GPU、模型品質、macOS managed runtime、跨平台安裝與 source provenance 尚未完成；公開頁面暫時顯示 Assets 9／載入錯誤而 API 顯示 7，需留意 GitHub UI／API 顯示差異。
- 給主要開發代理的具體修正要求（若有）：保留目前公開 Release 與 checksum／signing disclosures；後續補做 pristine Windows 安裝／解除安裝與 Defender／SmartScreen 驗收、逐項 license／source provenance review、長音訊／品質／效能驗收，並在可取得時保存完整 7 資產下載後 hash transcript。不要把本輪 206 range probe 宣稱為 7 個資產全部完整下載驗證。
- 可逐字引用完整結論句：**本輪 REL-039 Windows Breeze managed runtime 0.50.0 公開發布後獨立複審結論為有條件通過：GitHub Release v0.50.0 已公開且非 draft／非 prerelease，annotated tag 已 peeled 至 44c40225e2b0a39e759048439e3db912b6333ad9，7 項資產的名稱／大小／GitHub digest／直接下載 URL 均已核對，7/7 range 回讀均以 HTTP 206 回傳正確總大小，現有證據亦記錄 packaged renderer smoke exit 0；但 Windows 未簽章、pristine VM／完整實機矩陣、license evidence 非法律意見、品質／效能與 source provenance 仍未閉合，因此不得宣稱無條件通過。**

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
