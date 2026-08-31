# 獨立審查報告：Offline Subtitle Factory 0.50.1 AI response repair patch release preparation

- 審查對象 commit／版本：`codex/release-0.50.1` 工作樹，目標 `0.50.1`；`HEAD`、`main`、merge-base 均為 `a111ddd4abe7b7b6854f9b1c483a0c11a1f8840e`
- 對應 08-CHANGE-LOG 條目：2026-08-31 — Offline Subtitle Factory 0.50.1 AI response repair patch release preparation（REL-040）
- 審查輪次：round1
- 審查代理啟動時間、上下文來源：2026-08-31 Asia/Taipei；實測窗口 16:35:58–16:45:42。此為獨立審查上下文，未沿用開發代理對話記憶。

## 1. 需求完整性

- 判定：部分通過
- 證據：`08-CHANGE-LOG.md:3-22` 明確記錄 REL-040、指定 base、0.50.1 版本同步、AI parser 範圍、候選建置、禁止建立 v0.50.1 tag／Release 與禁止外傳字幕資料；`package.json:3,61-99`、`package-lock.json:3,9` 與 `RELEASE-NOTES-0.50.1.md:1-29` 已同步版本與 release notes。`git rev-list --left-right --count a111ddd4abe7b7b6854f9b1c483a0c11a1f8840e...HEAD` 輸出 `0 0`，且 `git diff` 顯示 source／test 沒有變更；repair branch 另有 5 個提交，未被本分支合入。歷史 `RELEASE-NOTES-0.50.0.md` 無 diff，現有檔案 SHA-256 為 `b82abb313f59d890e842e3ae297d586762569bb5bbefd49dac3459429d810966`（與遠端 v0.50.0 Release asset 一致）。
- 證據：需求仍未完整滿足於可重現 CI：repository root 的 `git ls-tree` 顯示 `app/` 才包含專案，root 沒有 `package.json`／`package-lock.json`；但 `.github/workflows/windows-preview.yml:20-38` 沒有 `defaults.run.working-directory: app`，`npm ci`、`./scripts/...` 與後續 `../dist` 路徑均按 root 執行。`docs:check:final` 於 2026-08-31T16:43:38.354+08:00 以 exit 1 結束，指出最新 changelog 仍為「進行中／待執行」且尚無有效獨立審查收尾欄位。

## 2. 邏輯正確性

- 判定：部分通過
- 證據：版本來源一致性獨立檢查輸出 `{"packageVersion":"0.50.1","lockVersion":"0.50.1","rootPackageVersion":"0.50.1","equal":true}`；`electron/main.mjs:297` 使用 `app.getVersion()`，`package.json:90-99` 的 GitHub publish config 與 release notes 路徑一致，`latest.yml` 亦標示 `version: 0.50.1`。`app/lib/ai/subtitle-optimizer.mjs:189-217,233-260,359-361,473-491` 保持 base 行為：只有明確 `cues` 或允許的 top-level 字串 root array 可接受，nested wrapper array 被拒絕，本機 provider 才可進行一次 JSON repair。
- 證據：`git diff --quiet a111ddd4... -- app/lib app/public app/server.mjs app/scripts` 輸出 exit 0，表示本輪只包裝既有 AI 修正，不改變 source behavior。可是 Windows workflow 的工作目錄／輸出路徑在乾淨 checkout 下不成立，因此 release pipeline 的邏輯結果不是可執行的 0.50.1 Windows 流程。

## 3. 邊界情況

- 判定：部分通過
- 證據：`app/scripts/test-ai-response-parser.mjs:17-55` 實測 top-level root array、plain／prose-wrapped fenced JSON、text parts、跨 parts JSON 與 text-part root-array rejection；`57-128` 實測 explicit nested `cues`、各 wrapper／任意 nested array rejection 與非本機 provider 不 repair；`130-200` 實測 Ollama／LM Studio 一次 repair、nested wrapper 一次 repair、第二次缺 `cues` 失敗與 completed checkpoint 不寫入；`202-217` 實測 LM Studio JSON Schema `response_format` 保留。`npm test` 的輸出再次顯示 `AI response parser regression tests passed.`。
- 證據：candidate package 直接檢查存在 `RELEASE-NOTES-0.50.1.md`、`RELEASE-NOTES-0.50.0.md`、Breeze guide 與 runtime manifest，且不存在 `ggml-small.bin`、Breeze checkpoint；Setup／Portable 兩檔均為 `NotSigned`。真實 Ollama／LM Studio、模型品質、取消／逾時與跨平台乾淨實機未被 deterministic tests 取代。

## 4. 程式碼品質

- 判定：部分通過
- 證據：本輪 diff 僅 9 個 tracked release／治理／package／workflow 檔及新增 release notes；source／tests 無 diff。`package.json:76-88` 排除 `.env`、憑證與 secrets 路徑，changed-content scan 於 2026-08-31T16:45:42.753+08:00 未找到 token/private-key pattern，workflow 只有具名 GitHub Actions secret references，沒有 secret value 或字幕資料。
- 證據：`README.md:3-10`、`00-CURRENT-STATUS.md:3-17`、`RELEASE-NOTES-0.50.1.md:18-29` 均把候選版、未建 tag／Release、未簽章與 live provider 未執行狀態分開揭露；但 `06-TEST-AND-PROCESS-AUDIT.md:60` 仍寫「進行中」，同文件 `62-70` 又記錄已完成結果，且 workflow 缺少 repository layout 所需的 working-directory 設定，故尚未達 release-quality closeout。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：2026-08-31T16:35:58.987+08:00 開始、16:36:23.589+08:00 結束的 `npm test` exit 0，完整鏈包含 `scripts/test-ai-response-parser.mjs` 與 core regression；2026-08-31T16:37:12.053+08:00 開始、16:37:36.391+08:00 結束的 `npm run check` exit 0，包含 docs check、Node syntax check 與同一完整 test chain，docs validator 回報 19 個文件、版本 0.50.1。`git diff --check` 亦無錯誤。
- 證據：本地驗證已覆蓋 deterministic parser／provider contract／checkpoint 與既有核心測試，但沒有可核對的 0.50.1 GitHub Windows workflow run；現行 workflow 先天無法在乾淨 repository root 找到 `app/package-lock.json`。`docs:check:final` 上述 exit 1 也是尚未完成 release closeout 的實際結果。

## 6. 實際運行結果

- 判定：部分通過
- 證據：2026-08-31T16:41:48.787+08:00–16:41:50.371+08:00 執行 `npm run runtime:verify -- --target=win32-x64` exit 0，回報 FFmpeg、Whisper.cpp 與 Tiny model；candidate `dist-0.50.1` 的 Setup `274022273` bytes／SHA-256 `ad03200058a8f7c8709acc4e59d29e1404bed1bc35c8c3f4e3811eed5560932d`、Portable `273315012` bytes／SHA-256 `9adf5a063aaa610918077ec6d615c2cbb0be2c94ad0bb256b028c6347acfa6d4`、blockmap `286903` bytes、`latest.yml` `2119` bytes 均與 `06-TEST-AND-PROCESS-AUDIT.md:65-67` 相符。NanaZip `7z t` 對兩個 EXE 均輸出 `Everything is Ok`，exit 0。
- 證據：unpacked `dist-0.50.1/win-unpacked/resources/app/package.json` 為 0.50.1；`resources/app-update.yml` 指向 `twyderek/offline-subtitle-factory-plan`；`resources/tools/manifest.json` 的五個 runtime 檔案 size／SHA-256 與實檔全部 match。`latest.yml` 宣告的 Setup SHA-512 與實檔計算值相同。`06-TEST-AND-PROCESS-AUDIT.md:68` 記錄曾完成 Setup／Portable／uninstall renderer smoke，但本輪依 read-only 限制未重新執行會改變安裝／暫存狀態的 installer smoke；尚無 0.50.1 Windows Actions 證據可取代它。
- 證據：2026-08-31T16:45:42.753+08:00 的 loopback probe 為 `127.0.0.1:11434=False`、`127.0.0.1:1234=False`；因此 `LIVE_PROVIDER_TESTS=NOT_RUN` 是誠實狀態，未下載模型、未啟動服務、未把字幕資料送到雲端。`git ls-remote origin refs/tags/v0.50.1 refs/tags/v0.50.1^{}` 無輸出；`gh release view v0.50.1` 回報 `release not found`。既有 `v0.50.0` peeled tag 仍為 `44c40225e2b0a39e759048439e3db912b6333ad9`，遠端 Release 仍為非 draft／非 prerelease，未見被本輪改寫。

## 綜合判定

- 結論：不通過
- 結論句（可逐字引用）：**REL-040 round1 獨立六面向審查結論為不通過：0.50.1 版本來源、AI parser deterministic regression、runtime manifest 與本地 Windows candidate archive 證據基本齊備，且既有 v0.50.0 tag／Release 未被改動、v0.50.1 tag／Release 尚未建立並如實標示 LIVE_PROVIDER_TESTS=NOT_RUN；但 `app/.github/workflows/windows-preview.yml` 未設定 `app` working directory，乾淨 checkout 下的 `npm ci`、runtime script、build output 與 installer verification 路徑無法成立，`docs:check:final` 亦仍失敗，因此在修正 workflow、完成 changelog／獨立審查 closeout 並取得新的 Windows CI／installer 證據前，不得視為可交付的 0.50.1 release preparation。**
- 阻擋問題（若有）：
  - 修正 workflow 的 working directory 與 npm cache dependency path（例如 job-level `defaults.run.working-directory: app` 並明確指定 `app/package-lock.json`），再從乾淨 checkout 執行 Windows source／build／archive／Setup／Portable／uninstall smoke。
  - 由主要開發代理在不改寫本報告的前提下完成 `08-CHANGE-LOG.md` 的結案狀態、review report link／逐字引用與發布授權欄位，重跑 `npm run docs:check:final`；本輪不得自行代改該文件。
- 剩餘風險：真實 Ollama／LM Studio 模型與輸出品質、取消／逾時端到端行為、Windows 10／11 乾淨實機、Authenticode、macOS notarization、正式 v0.50.1 CI／Release asset 仍未驗收；未追蹤的 `dist-0.50.1*` 只作本機候選證據，不屬於本次 tracked diff 或公開交付物。
- 給主要開發代理的具體修正要求（若有）：先修 workflow 路徑與 cache 設定，從新 checkout 取得成功 run／artifact／installer log；接著完成文件 closeout 並重跑 `npm test`、`npm run check`、`npm run docs:check:final`。在 live endpoints 缺席時維持 `LIVE_PROVIDER_TESTS=NOT_RUN`，不得把 mock／contract 測試寫成真實 provider acceptance，也不得建立 tag／Release。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
