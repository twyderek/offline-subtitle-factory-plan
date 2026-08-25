# 獨立審查報告：Windows Breeze managed runtime 0.50.0 正式發布（REL-039）

- 審查對象 commit／版本：目前專案 `main@0126f62711240684559674bf11bebf432bad4666`；工作樹中的 `app/package.json`／封裝資料為 `0.50.0` 候選，尚無本版 commit 或 `v0.50.0` tag。
- 對應 08-CHANGE-LOG 條目：2026-08-25 — Windows Breeze Managed Runtime 0.50.0 正式版本發布（REL-039）。
- 審查輪次：round1
- 審查代理啟動時間、上下文來源：2026-08-25 07:48:59 +08:00；本報告由獨立審查上下文建立，依 `docs/project-management/workflows/04-INDEPENDENT-REVIEW.md` 六面向格式，只讀檢查目前工作樹、候選封裝、runtime Release 與 GitHub remote；證據補核至 2026-08-25 07:53:57 +08:00。

## 1. 需求完整性

- 判定：部分通過
- 證據：
  - `app/package.json:3` 與 `app/package-lock.json:3,9` 的版本均為 `0.50.0`；目前候選也包含 `RELEASE-NOTES-0.50.0.md`，其 `:1,3` 明列版本與發布日期。
  - `RELEASE-NOTES-0.50.0.md:7,19-23`、`app/package.json:56-73,120-144` 對 Breeze managed runtime、Breeze guide、runtime manifest、既有 Whisper.cpp 與 checkpoint 排除有明確描述。
  - `app/docs/project-management/00-CURRENT-STATUS.md:4-6,14` 仍如實記錄公開版本為 `0.49.1`、`v0.50.0` 待發布；REL-039 工作條目 `app/docs/project-management/08-CHANGE-LOG.md:3-26` 仍為「進行中／待執行」。這與「正式發布已完成」尚不一致，但沒有掩飾未完成狀態。
  - GitHub API（2026-08-25，只讀 `GET`）對 `https://api.github.com/repos/twyderek/offline-subtitle-factory-plan/releases/tags/v0.50.0` 回傳 HTTP 404；`git -C D:\Codex\subtitle-review-loop\offline-subtitle-factory-plan ls-remote --tags origin refs/tags/v0.50.0` 亦無輸出。故正式 App Release、tag、可下載 App 資產尚未存在。
  - 結論：版本／文件／封裝準備大致具備，但正式發布的 Git provenance、公開 Release 與發布後核對尚未完成。

## 2. 邏輯正確性

- 判定：部分通過
- 證據：
  - `runtime-manifests/breeze-asr-25-win-x64-cpu.json:4-26` 與既有 runtime Release 的遠端 manifest（HTTP 200）核心欄位逐項一致：runtime `2026.08.1`、Windows x64 CPU、下載檔名、286,785,161 bytes、解壓後 1,436,390,789 bytes、SHA-256 `724e8bcb45c7a1373e1d1eca0e413897354326a4fae207948e72ec529bb8bf4b`、Breeze revision `c0993ecd98522d61066d3f5ce769e35c848b7855`、patched Whisper revision `f94c6ba670a35ee8d720d4221e102f4685c288d6`。
  - 既有 runtime Release `breeze-runtime-2026.08.1` API 回傳公開、非 draft、非 prerelease；四個 asset 的 HTTP HEAD 均為 200，ZIP Content-Length 為 286,785,161，與 manifest 一致；本機 `breeze-runtime-output/release-download.zip` 的 SHA-256 亦一致。
  - `dist-0.50.0/latest.yml` 的 `version: 0.50.0`、Setup size `274020255` 與 SHA-512 `fcB0q0LVsdIVuhOqEUY8Yv+6GXnIZ8UR8VLiCl4Yjxzl6l9NWnRMp4s498kgt1FFYyjHbnv4qWpw3PQnej1uew==` 與本機 Setup 計算值一致。該 metadata 只列 Setup，沒有列 Portable；若 Release／updater 契約要求兩個 Windows 資產均由 metadata 描述，仍需明確核准或補強。
  - `.github/workflows/windows-preview.yml:1,8-9,40-52,127-133` 名稱、tag trigger 與 0.50.0 artifact 名稱一致，但 workflow 實際只上傳保留 14 天的 Actions artifact，沒有建立 GitHub Release 或上傳正式 Release asset。其簽章判斷在 step `if: env.CSC_LINK != ''`，而 `CSC_LINK` 只在各 step 的 `env` 內設定；此條件的實際 GitHub Actions 評估行為未有本輪 run 證據，屬發布邏輯風險。現有本機產物只能證明 unsigned 路徑。
  - 結論：runtime manifest／既有 runtime Release 的固定資料流正確；App Release 發布流程與簽章分支尚未形成可追溯、可重播的正式邏輯。

## 3. 邊界情況

- 判定：部分通過
- 證據：
  - 2026-08-25 執行 `7z t`：`offline-subtitle-factory-setup-0.50.0.exe` 與 `offline-subtitle-factory-portable-0.50.0.exe` 均回報 `Everything is Ok`，退出碼均為 0。
  - `dist-0.50.0` 本機檔案核對：Setup 274,020,255 bytes、Portable 273,312,899 bytes、blockmap 286,949 bytes；SHA-256 分別為 `729539de4381d622e5872fb5d57a50902c5f531e1bf34c2258472a9fdaa53fe5`、`eb4732ab78cf45ce70f0a591d58362ea6d95672503848785318da556ce79100e`、`cdb62fa78a4be606f9d986d95b39637449da297b48219eea1c91551e3a4c17fe`，與 `SHA256SUMS-windows-x64.txt` 一致。
  - `dist-0.50.0/win-unpacked/resources/app/` 內存在 `RELEASE-NOTES-0.50.0.md`、`docs/BREEZE-ASR-25.md` 與 `runtime-manifests/breeze-asr-25-win-x64-cpu.json`；`resources/tools/whisper-cpp/whisper-cli.exe`、DLL 與 `ggml-tiny.bin` 存在。
  - 封裝搜尋未發現 `breeze-asr-25.pt`、`ggml-small.bin`、`ggml-base.bin` 或 checkpoint；Breeze checkpoint 沒有被放進 App 封裝。解壓目錄主程式 `離線字幕工廠.exe` 為 PE machine `0x8664`；Setup／Portable 自解壓 stub 為 `0x014C`，不能單獨作為 App payload 架構判定。
  - 本輪未執行 Setup 安裝／解除安裝、Portable 啟動、Windows packaged renderer、捷徑／權限／重啟或 pristine Windows VM；因此上述只證明 archive／unpacked 靜態邊界，不證明完整使用者生命週期。

## 4. 程式碼品質

- 判定：部分通過
- 證據：
  - `git -C D:\Codex\subtitle-review-loop\offline-subtitle-factory-plan rev-parse HEAD` 為 `0126f62711240684559674bf11bebf432bad4666`，分支為 `main`，remote 為 `https://github.com/twyderek/offline-subtitle-factory-plan.git`；`HEAD:app/package.json` 仍是 `0.1.0`，目前 `app/package.json` 是由 0.1.0 大幅變更到 0.50.0 的工作樹內容。
  - 目前 `git status --porcelain=v1 --untracked-files=all` 統計為 `A = 316`、`M = 14`、`?? = 144731`；REL-039 的 package-lock、Release notes、workflow、runtime manifest 多數是 staged 新增，並且有大量未追蹤任務／建置／runtime 檔案。這使得目前來源與候選封裝無法由一個乾淨、已提交的 commit 唯一對應。
  - `package.json` 的 build files 明確納入 Release notes、Breeze guide、runtime manifest，`extraResources` 明確納入 Whisper.cpp 與 Tiny model，沒有將 Breeze Python／checkpoint列為 bundled resource；這部分結構清楚。
  - workflow 的名稱仍為 `Build Windows 0.50.0`／`windows-preview`，輸出是 Actions preview artifact 而非 GitHub Release；`permissions: contents: read` 也沒有發布權限設計。這是流程品質與交付邊界問題，不是 runtime manifest 本身的問題。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：
  - 2026-08-25 執行 `npm run check`，退出碼 0。輸出包含治理 docs check（版本 0.50.0）、Node syntax checks，以及 Whisper fallback／三模型／下載取消清理、Breeze ASR／managed runtime manager、provider、UI 與 core regression tests，均回報通過。
  - 2026-08-25 執行 `git diff --check`，退出碼 0。
  - 2026-08-25 執行 `npm run docs:check:final`，退出碼 1，明確指出：最新工作紀錄尚未標示「完成」、仍有「待執行」欄位、以及「獨立審查是否執行」尚未填為是／否。這直接阻擋發布級結案。
  - 已實際執行的封裝／遠端測試包括兩個 EXE `7z t`、Setup latest.yml SHA-512／size 比對、Authenticode 查驗、runtime Release API／HTTP HEAD／本機 ZIP SHA；但沒有本輪 GitHub Actions artifact 下載交叉驗證、App Release asset 下載驗證或 packaged Electron Windows smoke。

## 6. 實際運行結果

- 判定：不通過
- 證據：
  - 本機 `dist-0.50.0` 確實存在 Setup、Portable、blockmap、latest.yml、SHA 與 signing status；兩個 EXE archive integrity 通過，且 unpacked 內容符合 guide／manifest／Whisper.cpp／Breeze checkpoint 排除要求。
  - `Get-AuthenticodeSignature` 對 Setup 與 Portable 均回報 `NotSigned`；`SIGNING-STATUS-windows-x64.txt` 也明確寫為 `UNSIGNED PUBLIC RELEASE`。這與 Release notes 的未簽章揭露一致，且可引用 `AUTH-2026-07-23-01` 的未簽章常設授權，但該授權不涵蓋無 tag、無 Release、無來源 provenance 或未完成實機測試。
  - 既有 runtime Release 可由 GitHub 直接取得，四個 asset HTTP HEAD 皆為 200；但 App Release URL `https://github.com/twyderek/offline-subtitle-factory-plan/releases/tag/v0.50.0` 在本輪 API 查詢回傳 404，且 local／remote `v0.50.0` tag 均不存在。
  - 本輪沒有實際執行封裝後 App，因此不能把 source `npm run check` 或 `win-unpacked` 靜態檢查寫成 Windows 安裝／renderer 實機成功。

## 綜合判定

- 結論：不通過
- 阻擋問題（若有）：
  1. `v0.50.0` 尚無 local／remote tag，GitHub App Release API 404，無法建立正式發布後資產核對證據。
  2. 目前工作樹不是可追溯的乾淨發布來源：`HEAD` 仍為初始 `0.1.0`，REL-039 內容與封裝散落在大量 staged／untracked scope 中，尚未有只包含本輪交付的 commit。
  3. `npm run docs:check:final` 失敗，REL-039 仍為進行中／待執行，且獨立審查欄位尚未結案。
  4. `windows-preview.yml` 只產生短期 Actions artifact，沒有正式 GitHub Release 發布步驟；簽章條件與實際 signed／unsigned run 沒有可回溯的 workflow run 證據。
  5. 尚無本輪 packaged Electron／Setup 安裝、Portable 啟動、renderer、解除安裝、pristine Windows VM 或 Windows 10／11 實機證據。
- 剩餘風險：Windows Authenticode 未簽章／SmartScreen；無 pristine VM；App source provenance 與 remote scope 尚未閉合；workflow preview 與正式 Release 的邊界未閉合；未完成 packaged Electron／實機安裝矩陣；runtime `runtime-license-review.json` 是 engineering evidence 而非法律意見，部分 transitive license metadata 仍需逐項 review；Breeze 台灣華語品質、長音訊 CPU 效能、GPU、macOS managed runtime 與模型人工校閱仍未由本輪驗收。
- 給主要開發代理的具體修正要求（若有）：
  1. 在隔離且可審查的 scope 中整理 REL-039，只納入 0.50.0 source、lockfile、文件、workflow、manifest 與必要測試／證據，建立可追溯 commit；確認 `git show <commit>:app/package.json` 為 0.50.0，並保存既有 dirty scope 不被誤納入。
  2. 先完成 `npm run docs:check:final` 與本報告連結／判定欄位，再以該 commit 建立 annotated `v0.50.0`；推送後從 GitHub API 反向核對 tag、Release 狀態、所有資產名稱／大小／digest／直接 URL／本機 SHA。
  3. 修正或明確化 workflow 的 signed／unsigned 分支與正式 Release 交付邊界；下載 Actions artifact 後重新核對 Setup／Portable／blockmap／latest.yml／SHA，不能只依賴 job 綠燈。
  4. 在 Windows 實際執行 Setup、Portable、packaged renderer、安裝／解除安裝與 Breeze 首次 runtime 安裝 smoke；若仍未做 pristine VM，必須在 Release notes／目前狀態／交付說明持續明列。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
