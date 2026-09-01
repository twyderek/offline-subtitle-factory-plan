# 獨立審查報告：Offline Subtitle Factory 0.50.1 release preparation round3

- 審查對象 commit／版本：`codex/release-0.50.1`，`HEAD`／遠端 PR head `bc00853bdf784f12a1d76a60905aa670f51f9eca`，目標版本 `0.50.1`；同時明確納入目前工作樹的未提交狀態。
- 對應 08-CHANGE-LOG 條目：2026-09-01 — Offline Subtitle Factory 0.50.1 release preparation rerun and closeout（REL-040）
- 審查輪次：round3
- 審查代理啟動時間、上下文來源：2026-09-01（Asia/Taipei）；本審查依 `AGENTS.md`、`app/AGENTS.md`、`docs/project-management/README.md`、release／test／independent-review／build／document-closeout workflows 及目前分支內容獨立執行，未沿用主要開發代理的結論。
- 審查限制：只讀取、執行非變更性檢查與驗證；除本報告外未修改、刪除、清理、stage 或 commit 任何檔案，未 push、建立或修改 PR metadata，未建立 tag／Release。

## 1. 需求完整性

- 判定：部分通過
- 證據：`npm run project:preflight -- --type=release` 回報版本 `0.50.1`、分支 `codex/release-0.50.1`，並辨識工作樹有既有變更。`git rev-parse main` 與 `git rev-parse origin/main` 均為 `a111ddd4abe7b7b6854f9b1c483a0c11a1f8840e`；`git merge-base HEAD main` 也是該 SHA。`git merge-base HEAD codex/ai-cues-response-repair` 為較早的 `ba12b4bd744e00c5243361023e076370ae51607b`，且 graph 顯示 release branch 是從 main 的 `a111ddd` 延伸，不是從 `codex/ai-cues-response-repair` 延伸。
- 證據：`app/package.json:3`、`app/package-lock.json:3,9` 均為 `0.50.1`；`app/electron/main.mjs:297` 以 `app.getVersion()` 顯示產品版本；`app/package.json:61,98,111,114` 與 `app/.github/workflows/windows-preview.yml:1,7-9,61-62,91,134` 的 Release notes、artifact naming 與 trigger 均指向 0.50.1。`app/RELEASE-NOTES-0.50.1.md:1-29` 涵蓋 missing `cues` repair、Markdown JSON、text parts、nested wrapper root-array、LM Studio schema preservation、failed checkpoint 與 live-acceptance 邊界。
- 證據：`gh pr list --state all` 僅列出既有 PR #2（OPEN，`codex/release-0.50.1`）與已合併 PR #1；`gh pr view 2` 顯示 base `main`／`a111ddd4...`、head `codex/release-0.50.1`／`bc00853...`，沒有 merge commit。沒有建立新 PR 或合併操作的證據。
- 證據：`git rev-parse 'v0.50.0^{}'` 與 `git ls-remote origin 'refs/tags/v0.50.0^{}'` 均為 `44c40225e2b0a39e759048439e3db912b6333ad9`；GitHub API 的 v0.50.0 Release 為非 draft、非 prerelease，7 項既有資產仍存在。local／remote 均沒有 `v0.50.1` tag；`gh release view v0.50.1` 回報 `release not found`。目前 `app/RELEASE-NOTES-0.50.0.md` blob 與 v0.50.0 tag 相同，`git diff --quiet v0.50.0 -- app/RELEASE-NOTES-0.50.0.md` exit 0。
- 證據：目前 `app/docs/project-management/08-CHANGE-LOG.md:1-24` 的最新條目仍為「狀態：進行中」，並保留「實際修改：待執行」、「獨立審查是否執行：待執行」及未填入可解析欄位的發布授權；本輪 `npm run docs:check:final` exit 1，明確報出上述 closeout／authorization 缺口。這是目前 release-gate blocker，不是需求已完成的證據。

## 2. 邏輯正確性

- 判定：通過
- 證據：`git diff --quiet a111ddd4abe7b7b6854f9b1c483a0c11a1f8840e HEAD -- app/lib app/public app/server.mjs app/electron app/scripts` 回報 `source_and_test_diff_exit=0`；release preparation commit 沒有重新改動 parser／產品 source／測試邏輯。`node scripts/test-ai-response-parser.mjs` exit 0，輸出 `AI response parser regression tests passed.`。
- 證據：`app/.github/workflows/windows-preview.yml:19-22` 設有 job-level `app` working directory，`:29-32` 使用 `app/package-lock.json` cache path，`:61-62` 使用 `../dist` 的 0.50.1 artifact path，`:131-137` 上傳 `app/.artifacts/windows-x64/*`；這些路徑與 repository layout 一致。現行未提交修改只涉及治理文件與治理 validator 的 CRLF normalization／fixture coverage，未改變產品行為。
- 證據：PR #2 body 的修正摘要與 `app/RELEASE-NOTES-0.50.1.md` 一致；release boundary 明確禁止自動 merge、建立 `v0.50.1` tag 或 GitHub Release。未發現把 `codex/ai-cues-response-repair` 的五個原始 commit 再次 merge／cherry-pick 的證據。

## 3. 邊界情況

- 判定：部分通過
- 證據：`node scripts/test-ai-response-parser.mjs`、`node scripts/test-ai-optimizer.mjs`、`node scripts/test-ai-providers.mjs`、`node scripts/test-ollama-batch-stream.mjs` 與 `node scripts/test-ai-fetch.mjs` 均 exit 0。現有 `app/scripts/test-ai-response-parser.mjs` 的案例涵蓋 top-level root array、fenced／prose-wrapped JSON、跨 text parts、explicit nested `cues`、`response`／`output`／`result`／`data`／`content`／`message` nested root-array rejection、local one-shot repair、LM Studio `response_format` 保留及第二次 repair 失敗不寫 completed checkpoint。
- 證據：本輪檢查 `127.0.0.1:11434`（Ollama）與 `127.0.0.1:1234`（LM Studio）均未監聽；依需求標記 `LIVE_PROVIDER_TESTS=NOT_RUN`。未啟動服務、未下載模型、未送出字幕資料，因此 deterministic contract tests 未被誤稱為 live provider acceptance。
- 證據：真實 provider 模型品質、取消／timeout 端到端、Windows 10／11 clean-machine、macOS、簽章／公證仍未在本輪完成；這些是未覆蓋證據，不是已通過的邊界驗收。

## 4. 程式碼品質

- 判定：部分通過
- 證據：本輪 syntax checks（`server.mjs`、`public/app.js`、`public/review.js`、`public/trim.js`、`electron/main.mjs`、`lib/ai/subtitle-optimizer.mjs`、`scripts/test-ai-response-parser.mjs`）整批 exit 0；`npm ci --ignore-scripts --dry-run` exit 0，回報 `up to date`；`git diff --check` exit 0。diff check 的 CRLF warning 只指出 Git 將來觸碰檔案時的行尾轉換，沒有 whitespace error。
- 證據：目前 `git status --short --branch` 顯示 6 個 tracked files modified（`00-CURRENT-STATUS.md`、`06-TEST-AND-PROCESS-AUDIT.md`、`08-CHANGE-LOG.md`、3 個 project-docs validator files）及多個 user-owned untracked artifacts。它們未包含在遠端 PR #2 head `bc00853...`；PR #2 的 body 仍宣稱 `docs:check:final` passed，但目前 working tree 的同一命令 exit 1。這是 release closeout／可追溯性 blocker，不能由 PR body 的舊說明取代。
- 證據：candidate recheck 的 `latest.yml` 所宣告 Setup SHA-512 與 `dist-0.50.1-recheck/offline-subtitle-factory-setup-0.50.1.exe` 實際計算值相同；Setup／Portable `Get-AuthenticodeSignature` 均為 `NotSigned`，文件未宣稱已簽章。未發現 unsigned 被標示為 signed 的證據。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：本輪執行時間為 2026-09-01 Asia/Taipei（檢查時間輸出 `2026-09-01T09:05:34.044+08:00`）。實際 exit 結果如下：`npm run docs:check` 0（19 個治理文件）；`npm run docs:check:final` 1（最新工作紀錄未完成、含待執行、缺獨立審查／發布授權欄位）；`npm ci --ignore-scripts --dry-run` 0；上述 syntax checks 0；5 個 AI／provider focused tests 0；`node scripts/test-project-preflight.mjs` 0；`node scripts/test-project-docs-validator.mjs` 0；`node scripts/test-standing-authorization.mjs` 0；`git diff --check` 0。
- 證據：`app/docs/project-management/06-TEST-AND-PROCESS-AUDIT.md` 的 2026-09-01 rerun 條目及 PR #2 body 記錄過 `npm ci`、`npm run check`（包含完整 `npm test`）、runtime verify、Windows candidate build、archive／checksum 與 installer／renderer smoke 均 exit 0；本輪因使用者要求只做 read-only review，未重跑會建立／刪除 temporary test files、runtime manifest、build output 或安裝／解除安裝狀態的命令，故不把既有紀錄冒充本輪 full-suite／installer execution。
- 證據：`gh pr checks 2` 回報 `no checks reported`；`gh api '.../actions/runs?branch=codex%2Frelease-0.50.1'` 回報 `total_count=0, runs=[]`。`gh run list --workflow windows-preview.yml` 另回報 default branch 找不到該 workflow；沒有可核對的 0.50.1 GitHub Actions run／artifact。這是 CI evidence gap，不是已證明 workflow 失敗。

## 6. 實際運行結果

- 判定：部分通過
- 證據：現有 `dist-0.50.1-recheck` 的 Setup `274,022,496` bytes／SHA-256 `25cb89730320f6f95adc6b667fd375d04dfa4635f6dffc98af90314eb3a01677`、Portable `273,315,242` bytes／SHA-256 `78b0f341d49e17afe888369357d4ec815375b2aea0fb21e38bdbcc45eba25e5a`、blockmap `286,922` bytes／SHA-256 `8e051c62852bba98cd3a44d7a6d291c9423543dc225f7efda99d9956647a6d02`、`latest.yml` `2,782` bytes／SHA-256 `066d85fa47b553bdbacf7c33ee8fb1efa42329fa8b6bb97fcfae76dc3a5c6fcd`。NanaZip `7z t` 對兩個 EXE 均輸出 `Everything is Ok`、exit 0；unpacked `resources/app/package.json` 為 `0.50.1`，含 0.50.1／0.50.0 Release notes、Breeze guide 與 Tiny model，沒有 `ggml-small.bin` 或 Breeze checkpoint。
- 證據：較早的 `dist-0.50.1` candidate 有 `resources/app-update.yml`，但 2026-09-01 的 `dist-0.50.1-recheck` 未找到該檔案；recheck 的 Setup／Portable／blockmap／latest.yml 大小與先前 candidate 亦不同。因 7z、版本、model exclusion 與 Setup SHA-512 一致性仍通過，這項目前列為 packaging reproducibility／updater-metadata evidence gap，需由交付者釐清是否為本版本必要產物，不直接推定為 checksum failure。
- 證據：`app/docs/project-management/06-TEST-AND-PROCESS-AUDIT.md` 與 round1／round2 reports 記錄 `scripts/verify-windows-installation.ps1` 曾通過 Setup silent install、installed renderer smoke、uninstall cleanup 與 Portable renderer smoke；本輪沒有重新執行該 state-mutating installer smoke。故 installer 結果只能引用既有證據，不能宣稱本輪重新驗收。
- 證據：v0.50.0 local／remote peeled tag、GitHub Release 狀態與 0.50.0 notes blob 均保持不變；`v0.50.1` tag／Release 均不存在。`LIVE_PROVIDER_TESTS=NOT_RUN` 持續有效。

## P0／P1 判定與阻擋／剩餘風險

- P0：未發現。沒有 v0.50.0 tag／Release 改寫、v0.50.1 tag／Release 誤建立、candidate checksum mismatch、資料外送或 unsigned 宣稱 signed 的證據。
- P1 blocker：目前 `npm run docs:check:final` exit 1；最新 changelog 仍未完成，且沒有可解析的 round3 review reference／逐字結論／發布授權欄位。另目前工作樹的 closeout／validator 修改尚未進入 PR #2 的 remote head。主要開發者或授權交付者須完成治理文件 closeout、把正確內容納入既有 PR #2 並重新驗證；本報告不代為修改或推送。
- Evidence gaps（不是已證明失敗）：沒有 GitHub Actions run／artifact；本輪未重跑 full `npm test`、installer smoke 或 build；`LIVE_PROVIDER_TESTS=NOT_RUN`；沒有 clean-machine、真實 Ollama／LM Studio、Windows signing、macOS notarization；recheck 缺少 `app-update.yml` 與先前 candidate 不一致，需釐清 updater metadata 要求。
- 未發現需要建立新 PR、merge、tag、Release 或清理／刪除 user-owned artifacts 的理由；依需求應繼續只使用既有 PR #2，並保留所有現有 untracked artifacts。

## 綜合判定

- 結論：有條件通過
- 可逐字引用的完整結論句：**本輪 round3 獨立六面向審查確認指定 `main` base／branch ancestry、0.50.1 package／lock／產品版本來源、AI parser regression、Release notes、既有 v0.50.0 保留、PR #2 邊界與本地 candidate archive／checksum evidence 均有支持；但目前 `npm run docs:check:final` exit 1，且 current closeout／validator 修改尚未進入既有 PR #2，因此只能有條件通過 release-preparation evidence review，不能宣稱治理 final closeout 或公開發布準備完成；缺少 CI、live provider、clean-machine 與本輪 installer rerun 屬 evidence gaps，`LIVE_PROVIDER_TESTS=NOT_RUN` 必須維持。**
- 阻擋問題（若有）：P1 為 release-gate closeout blocker：完成最新 changelog 的完成狀態、獨立審查 reference／逐字結論與具體發布授權，並由授權交付者把必要 closeout 變更納入既有 PR #2 後，重新通過 `npm run docs:check:final`。recheck 的 `app-update.yml` 差異是待釐清的 packaging evidence gap；若確認它是本版必要 updater 產物，則應升級為 build acceptance blocker。
- 剩餘風險：真實 provider／模型品質、取消／逾時／checkpoint 實機、CI runner、Windows clean-machine、Authenticode、macOS notarization 與正式 0.50.1 公開資產均未驗收或建立；候選 EXE 僅是本機 release-preparation evidence。
- 給主要開發代理的具體修正要求（若有）：只在取得既有授權範圍內完成 closeout 並更新 PR #2；不要建立新 PR、不要 merge、不要建立 `v0.50.1` tag／GitHub Release、不要刪除或清理任何現有 untracked artifact；確認 `app-update.yml` 是否為必要產物並補可追溯的 build／CI 證據。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
