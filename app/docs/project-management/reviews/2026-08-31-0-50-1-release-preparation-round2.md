# 獨立審查報告：Offline Subtitle Factory 0.50.1 release preparation round2

- 審查範圍：目前工作樹 `D:\Codex\subtitle-review-loop\offline-subtitle-factory-plan`
- 基準：`a111ddd4abe7b7b6854f9b1c483a0c11a1f8840e`
- 審查限制：只讀取、執行與驗證；本報告是本輪唯一建立的檔案。未提交、push、建立 PR、tag 或 Release。

## 1. 需求完整性

- 判定：部分通過
- 證據：目前 `HEAD` 等於指定基準 commit；工作樹的 release-preparation 變更已將 `app/package.json`、`app/package-lock.json`、Release notes、治理狀態與 Windows workflow 指向 0.50.1。`app/.github/workflows/windows-preview.yml:19-21` 已設定 job-level `defaults.run.working-directory: app`；`:29-32` 已設定 `cache-dependency-path: app/package-lock.json`；`:131-137` 已將 artifact upload path 設為 `app/.artifacts/windows-x64/*`。round1 指出的三項 workflow 路徑缺口已修正。`app/RELEASE-NOTES-0.50.1.md:1-29` 與 `app/docs/project-management/08-CHANGE-LOG.md:3-24` 也明確記錄 0.50.1、未建立 v0.50.1 tag／Release 與 live provider 狀態。
- 證據：`npm run docs:check:final` 目前 exit 1；報錯包括最新 changelog 尚未標示「完成」、round1 報告的結論格式未被 validator 識別、工作紀錄未逐字引用最新報告結論，以及發布等級授權欄位／風險覆蓋不足。依本輪只讀限制，這些來源文件與 round1 報告未被修改。

## 2. 邏輯正確性

- 判定：通過
- 證據：`app/package.json`、`app/package-lock.json`、lockfile root package 與 `dist-0.50.1/win-unpacked/resources/app/package.json` 的版本獨立核對結果均為 `0.50.1`。`git diff --quiet a111ddd4... -- app/lib app/public app/server.mjs app/scripts` exit 0，表示本輪沒有改動 parser source／tests；本 round2 複審的是既有修正加上 release-preparation metadata／workflow。
- 證據：workflow 的 `app` working directory 與相對 `../dist`／`../scripts` 路徑現在一致；setup／portable 檔名、release notes 檔名與 artifact upload path 均已改為 0.50.1。這證實 round1 的 workflow finding 已修正，但未證實 GitHub runner 實際成功執行。

## 3. 邊界情況

- 判定：部分通過
- 證據：`app/scripts/test-ai-response-parser.mjs:5-219` 覆蓋 top-level root array、fenced／prose-wrapped JSON、跨 text parts、無 type text parts、explicit nested `cues`、各 nested wrapper root-array rejection、非本機 provider strict failure、Ollama／LM Studio 一次 repair、LM Studio `response_format` preservation，以及第二次 repair 失敗不寫 completed checkpoint。
- 證據：`dist-0.50.1` 的 Setup／Portable EXE 以 `7z t` exit 0；Authenticode 狀態均為 `NotSigned`，且文件沒有將其宣稱為已簽章。unpacked package、0.50.1／0.50.0 Release notes、Breeze guide、`app-update.yml` 與 runtime manifest 存在；`ggml-small.bin` 與 Breeze checkpoint 未被 bundled。真實 Ollama／LM Studio 模型品質、取消／timeout 端到端與跨平台實機仍未由 deterministic tests 取代。

## 4. 程式碼品質

- 判定：部分通過
- 證據：`npm ci --ignore-scripts --dry-run` exit 0；`git diff --check` exit 0。版本、release notes、workflow 與 candidate metadata 彼此一致；`latest.yml` 宣告的 Setup SHA-512 與本地計算值相同。未發現本輪 source／test 改動，也未發現把 unsigned candidate 寫成 signed release 的證據。
- 證據：治理 closeout 仍未完成；`08-CHANGE-LOG.md:5-6` 仍是「進行中（round1 修正後待 round2 複審）」且授權欄位未達 final validator 要求。此為 release-preparation 文件品質／流程缺口，不是 round1 workflow path 修正失敗。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：本輪實跑 `npm test` exit 0，輸出明確包含 `AI response parser regression tests passed.`，且 `app/package.json:20-21` 的 `test`／`check` chain 明確包含 `node scripts/test-ai-response-parser.mjs`。`npm ci --ignore-scripts --dry-run` 與 `git diff --check` 亦 exit 0。
- 證據：GitHub Actions API 以 branch `codex/release-0.50.1` 查得 `total_count=0`、runs 為空；`gh run list` 亦未取得可核對的 `windows-preview.yml` run。故只能報告本地測試與本地 candidate evidence 通過，不能宣稱 0.50.1 CI 通過。依需求，本項作為明確揭露的 CI evidence risk，而不倒推 workflow content 未修正。

## 6. 實際運行結果

- 判定：部分通過
- 證據：本地 `dist-0.50.1` 存在 Setup `274,022,273` bytes／SHA-256 `ad03200058a8f7c8709acc4e59d29e1404bed1bc35c8c3f4e3811eed5560932d`、Portable `273,315,012` bytes／SHA-256 `9adf5a063aaa610918077ec6d615c2cbb0be2c94ad0bb256b028c6347acfa6d4`、blockmap `286,903` bytes／SHA-256 `b981b7168bb66423e6467f3dd36799afeb99f17a44b726cae410f751d2624442` 與 `latest.yml` `2,119` bytes／SHA-256 `36dd784750b03f489f85264e80177f7cd41dde91ff7fa321f06619ba84ae3775`。unpacked package 版本與 metadata 均為 0.50.1，Setup SHA-512 與 `latest.yml` 相符。
- 證據：既有 `app/docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:64-70` 與 round1 report:42 記錄 `verify-windows-installation.ps1` 已通過 Setup 靜默安裝、安裝後 renderer smoke、靜默解除安裝／ executable 移除及 Portable renderer smoke；本輪因只讀限制沒有重新執行會改變安裝／暫存狀態的 installer smoke。`LIVE_PROVIDER_TESTS=NOT_RUN` 且本輪 loopback probe `127.0.0.1:11434=False`、`127.0.0.1:1234=False`；未下載模型、未啟動服務、未送出字幕資料。
- 證據：local／remote `v0.50.0` tag 仍 peeled 至 `44c40225e2b0a39e759048439e3db912b6333ad9`；GitHub Release `v0.50.0` 仍為非 draft、非 prerelease。local／remote 均未見 `v0.50.1` tag，`gh release view v0.50.1` 回報 `release not found`。`app/RELEASE-NOTES-0.50.0.md` 相對基準無 diff，未見既有 v0.50.0 被改寫。

## P0／P1 判定與阻擋／剩餘風險

- P0：未發現。沒有 checksum mismatch、資料外送、v0.50.0 tag／Release 改寫、v0.50.1 tag／Release 誤建立或 unsigned 宣稱 signed 的證據。
- P1：有一項 release-gate closeout blocker：`npm run docs:check:final` exit 1，最新 changelog 尚未完成，且 round1 報告／工作紀錄的逐字結論與發布授權結構仍未滿足 validator。此項需由主要代理在後續流程修改治理來源文件並重跑 final closeout；本輪不代改。
- 剩餘風險（非 CI 通過宣稱）：沒有可核對的 0.50.1 GitHub Actions Windows run／artifact；現有證據是本地 candidate、既有文件紀錄與本地測試。workflow 內容已修正，但缺少 CI run 仍須在後續明確補驗。
- 其他剩餘風險：真實 Ollama／LM Studio endpoint 與模型品質、Windows 10／11 乾淨實機、Authenticode、macOS notarization、正式 v0.50.1 公開資產尚未驗收或建立；`LIVE_PROVIDER_TESTS=NOT_RUN` 必須維持原樣。

## 綜合判定

- 結論：有條件通過
- 可逐字引用的完整結論句：**本輪 round2 獨立六面向審查確認 round1 的 Windows workflow working-directory、npm cache dependency path 與 artifact path finding 已修正，本地 0.50.1 candidate、installer／renderer evidence、package／lock 版本、parser regression 與 npm test 均有支持，且 v0.50.0 未變更、v0.50.1 尚未建立、LIVE_PROVIDER_TESTS=NOT_RUN 誠實；但 docs:check:final 仍失敗且未觀察到 GitHub Actions run，因此本結論僅為有條件通過 release-preparation evidence review，不代表 CI 通過、治理 closeout 完成或可公開發布 0.50.1。**
- 阻擋問題（若有）：P1 為治理 closeout 未完成；在主要代理完成 changelog／round1 reference／授權欄位並使 `npm run docs:check:final` 通過前，不應宣稱 release-preparation final closeout 完成。缺少 GitHub Actions run 是明確揭露的 CI evidence risk，不得偽稱 CI 通過。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
