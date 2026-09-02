# 獨立六面向審查報告：0.51.0 本機驗收

- 審查對象 commit／版本：`main@10b3044d31a5367a91faacea46b8def7ee103f7c`／package version `0.51.0`
- 對應 08-CHANGE-LOG 條目：2026-09-02 — Offline Subtitle Factory 0.51.0 本機驗收（`ACCEPT-051-20260902`）
- 審查輪次：round1
- 審查代理啟動時間、上下文來源：2026-09-02 08:16（Asia/Taipei）；本報告在獨立審查上下文中依目前工作樹、指定治理文件、source／test 與 evidence 重新核對，未把主要驗收條目的結論當成證據。
- 審查限制：只讀既有檔案並執行驗證指令；除建立本報告外，不修改產品程式、測試、Release、tag、版本或任何既有文件。

判定標籤：`PASS` 僅代表該項證據成立；deterministic mock／contract test 不代表 live model 通過。`FAIL` 代表已有可重現的阻擋結果；`BLOCKED` 代表因環境或缺件無法完成核對；`MODEL_NOT_REPRODUCIBLE` 代表模型沒有產生指定情境，不能視為通過；`TEST_GAP` 代表測試或證據尚未覆蓋。

## 1. 來源／範圍

判定：部分通過；來源識別 `PASS`，工作樹來源潔淨性與交付證據一致性 `FAIL`。

- `git rev-parse HEAD`、`git rev-parse v0.51.0^{commit}` 與 `origin/main` 均為 `10b3044d31a5367a91faacea46b8def7ee103f7c`；`v0.51.0` 是 annotated tag，tag object 指向同一 commit。`package.json` version 為 `0.51.0`（`package.json:3`）。這支持指定 source／version 基準，判定 `PASS`。
- 審查時工作樹不是 clean：`git status --short` 顯示既有修改 `docs/project-management/08-CHANGE-LOG.md` 與未追蹤 `docs/project-management/evidence/2026-09-02-acceptance-ollama-llama3.2-1b.json`。因此 08-CHANGE-LOG 所稱「驗收前工作樹 clean」（`docs/project-management/08-CHANGE-LOG.md:13`）不能套用到目前審查工作樹；判定來源可追溯性 `FAIL`，但這些既有變更未由本審查修改。
- 本輪範圍是 0.51.0 本機驗收、AI parser／repair、LM Studio migration、Ollama loopback、封裝與 Release 唯讀核對；08-CHANGE-LOG 已明確列出不發布、不移動 tag、不替換 assets（`docs/project-management/08-CHANGE-LOG.md:9,14-17`）。範圍界線本身 `PASS`。

## 2. 功能／安全

判定：本機 deterministic contract `PASS`；live repair 情境不可判定為通過。

- Provider registry 目前只列 `openai`、`openai-compatible`、`azure`、`groq`、`gemini`、`ollama`，且 `lm-studio` 明確不受支援（`lib/ai/providers.mjs:1-23,155-180`；`scripts/test-ai-providers.mjs:19-22`）。
- LM Studio migration 會清除 provider／endpoint／model／secret reference／profile，回到未選擇；其他 provider profile／secrets 保留，且測試驗證 idempotence（`lib/ai/provider-migration.mjs:27-92`；`scripts/test-ai-provider-migration.mjs:31-95`）。判定 `PASS`。
- loopback URL 分類、無 API key 本機呼叫、非 loopback key gate、manual redirect 與 redirect 第二站零請求均有 source／test 證據（`lib/ai/local-ai.mjs:9-25`；`lib/ai/openai-compatible.mjs:69-117`；`scripts/test-ai-providers.mjs:79-95,150-188`；`scripts/test-core.mjs:347-386`）。判定 `PASS`。
- optimizer 會保存原始 cue ID／順序，嚴格驗證數量與 cue contract；Ollama 的 malformed／missing `cues`、length 或 translation validation 最多進入一次 repair，repair 再失敗不寫 completed checkpoint（`lib/ai/subtitle-optimizer.mjs:421-510`；`scripts/test-ai-response-parser.mjs:115-233`；`scripts/test-ai-optimizer.mjs:83-214`）。判定 deterministic 行為 `PASS`。
- 以上通過項目主要是 mock／contract tests；依指定規則不得把它們當成真實模型品質或 live repair 通過。真實 Ollama 結果中的 LIVE-02／03／04 應維持 `MODEL_NOT_REPRODUCIBLE`，詳見第 3 節。

## 3. 測試／證據

判定：focused tests `PASS`；完整回歸 `FAIL`；live repair `MODEL_NOT_REPRODUCIBLE`；若干證據鏈為 `TEST_GAP`。

- 於 2026-09-02 08:16（Asia/Taipei）獨立重跑五項指定 focused tests，全部 exit 0：`node scripts/test-ai-response-parser.mjs`、`node scripts/test-ai-optimizer.mjs`、`node scripts/test-ai-provider-migration.mjs`、`node scripts/test-ai-providers.mjs`、`node scripts/test-ollama-batch-stream.mjs`。這是 deterministic source／contract `PASS`，不是模型可重現性 `PASS`。
- 同次執行 `npm run check` exit 1。`docs:check` 先通過，失敗發生於 `scripts/test-breeze-runtime-manager.mjs:125`：實際 `getActiveManagedBreezePythonPath(...)` 為 `null`，測試預期為暫存 `python.exe` 路徑。source 函式以 `platform !== 'win32' || arch !== 'x64'` fail-closed，且該測試呼叫未傳 `arch:'x64'`；在目前 Apple Silicon host `process.arch` 下可重現。這是完整回歸的明確 `FAIL`；是否應修正測試 fixture 或產品 API 需另案釐清，不能把它靜默歸因為模型問題。
- 指定 evidence `docs/project-management/evidence/2026-09-02-acceptance-ollama-llama3.2-1b.json:2-154` 可讀，記錄 Ollama `0.33.2`、`llama3.2:1b`、loopback endpoint、HTTP 200 與單 cue schema validation。`/private/tmp/osf-acceptance-live-ollama-result.json:1-75` 可讀，記錄 `LIVE-01=PASS`、`LIVE-05=PASS`、`LIVE-CHECKPOINT=PASS`；這些結果可列為該 evidence 的 `PASS`。
- 同一 live result 明確記錄 `LIVE-02`（未產生 fenced JSON）、`LIVE-03`（第一次已有 cues，沒有進入 missing-cues repair）、`LIVE-04`（第一次已有 cues，沒有進入 repair failure）為 `MODEL_NOT_REPRODUCIBLE`，request／repairCount 也沒有證明目標情境已執行（`/private/tmp/osf-acceptance-live-ollama-result.json:22-52`）。不得升級為通過。
- `docs/project-management/evidence/2026-09-02-acceptance-ollama-llama3.2-1b.json` 是 `scripts/probe-ollama-live.mjs` 產出的 direct probe：其 single-cue request 使用 `/api/chat`、`stream:false`（`scripts/probe-ollama-live.mjs:17-27`；evidence `:70-126`）。production `createProvider(...).optimize` 在 11434 native path 使用 `/api/chat`、`stream:true`、`num_predict:512`、`keep_alive:'10m'`（`lib/ai/providers.mjs:29-83`；`scripts/test-ai-providers.mjs:84-115`）。因此「versioned evidence 已證明正式 optimizer path」的證據鏈不完整，列為 `TEST_GAP`；不否定 direct probe 本身的 `PASS`。
- parser boundary 的既有 `TEST_GAP` 已在工作紀錄列出：無語言 fence、CRLF／外圍空白、JSON string／prose braces、empty／mixed／missing text parts、plain nested JSON string、candidate priority／cycle bound，以及 multi-cue repair 的 ID／數量／順序正向斷言（`docs/project-management/08-CHANGE-LOG.md:20`）。

## 4. 文件／治理

判定：`FAIL`。

- 治理規則要求高風險驗收須可追溯、測試／審查／發布狀態不可以推測代替，且 `npm run docs:check:final` 需在結案時核對（`docs/project-management/README.md`、`docs/project-management/workflows/04-INDEPENDENT-REVIEW.md`、`docs/project-management/workflows/07-DOCUMENT-CLOSEOUT.md`）。本報告補足本輪指定的獨立審查檔案，但不改寫既有治理文件。
- 目前文件互相矛盾：未提交的最新 changelog 宣稱 GitHub `v0.51.0` Release 為非 draft／非 prerelease 且有 6 項 asset（`docs/project-management/08-CHANGE-LOG.md:23`）；但 tracked `RELEASE-NOTES-0.51.0.md:3` 仍寫「尚未建立 `v0.51.0` tag 或 GitHub Release」，`docs/project-management/00-CURRENT-STATUS.md:4-6,16` 仍把 0.51.0 定位為 candidate／公開版本為 0.50.0，`docs/project-management/05-DEVELOPMENT-AND-DEPLOYMENT.md:6,45` 也仍把 0.51.0 視為 unreleased candidate。這是可直接回溯的治理／文件 `FAIL`。
- local Git 已有 `v0.51.0` tag，與 release notes 的「尚未建立 tag」也不一致。`gh release view` 在本環境回報 `error connecting to api.github.com`，無法獨立確認遠端 Release metadata；因此不能用 changelog 敘述取代遠端核驗。

## 5. 發布／Release gate

判定：`FAIL`；stable-release recommendation：`NO`。

- local source gate：HEAD、tag peeled commit 與 `origin/main` 一致，判定 source identity `PASS`；但工作樹有既有 changelog 修改與未追蹤 live evidence，不能視為乾淨發布來源。
- packaged app smoke：在 app、`dist`、`dist-0.51.0`、`dist-0.51.0-dir` 及父層候選輸出位置未找到可供本輪 smoke 的 0.51.0 Setup／Portable／DMG／ZIP，判定 `BLOCKED`。未下載或建立新封裝，符合本輪不發布範圍。
- Release metadata／assets：本地 Git tag 有證據；遠端 Release API 查詢因網路連線失敗而 `BLOCKED`。因此 6 項 asset digest、遠端大小、直接下載 URL 與 Release notes 是否一致，不能在本輪獨立核定。既有 changelog 的聲稱不能當作本報告已重驗的遠端證據。
- 依發布流程，完整 `npm run check` `FAIL`、packaged smoke `BLOCKED`、LIVE-02／03／04 `MODEL_NOT_REPRODUCIBLE`，再加上 release 文件矛盾與遠端核對阻擋；即使本輪明確不發布且發布授權為不適用，仍不得判定 Release gate 通過。

## 6. 剩餘風險

必須保留的狀態清單：

- `PASS`：指定 commit／tag peeled commit／package version identity；五項 AI／Ollama deterministic focused tests；provider allowlist、LM Studio migration、secret preservation、loopback privacy／auth gate／redirect protection；指定 live evidence 的 LIVE-01、LIVE-05、LIVE-CHECKPOINT。
- `FAIL`：完整 `npm run check`；目前 release／candidate 文件一致性；目前工作樹不能被描述為 clean release source；stable Release gate。
- `BLOCKED`：0.51.0 packaged Setup／Portable／DMG／ZIP smoke；本環境對 GitHub Release metadata、6 項 asset digest／大小／下載 URL 的獨立重驗。
- `MODEL_NOT_REPRODUCIBLE`：LIVE-02 fenced JSON、LIVE-03 missing-cues exactly-two-repair、LIVE-04 repair failure。現有 `llama3.2:1b` 未在指定 prompt 情境產生所需輸入，不能視為功能通過。
- `TEST_GAP`：正式 `createProvider(...).optimize` live path 與 versioned direct probe 的證據不一致；parser 邊界與 multi-cue repair 正向保護未明確覆蓋；Breeze runtime manager 測試在 Apple Silicon host 的 `arch` fixture／API 契約尚未釐清。

具體後續要求：先釐清或修正 Breeze runtime manager 的跨平台測試失敗並重跑完整 `npm run check`；補齊 parser／multi-cue boundary tests；以可控制 response 的 deterministic harness 或可重現模型重跑 LIVE-02／03／04，並保存正式 optimizer path 的 request／response／repair count；取得與 commit／notes 一致的 0.51.0 packaged artifacts 後完成 Setup／Portable／macOS smoke；同步核正 release notes、current status、development/deployment、changelog 與遠端 Release 實況後，再重新評估 Release gate。

## 綜合判定

- 結論：**不通過**。
- 一句判定：0.51.0 的 source identity 與 focused deterministic AI／Ollama contract 證據成立，但完整回歸失敗、封裝 smoke 阻塞、三個 live repair 情境不可由目前模型重現，且 Release 文件／遠端證據鏈未閉合，故不得視為本機驗收通過或穩定發布候選。
- 阻擋問題：完整 `npm run check` exit 1；packaged artifacts／smoke 缺失；LIVE-02／03／04 `MODEL_NOT_REPRODUCIBLE`；release notes／status／changelog 不一致；GitHub Release API 無法在本環境獨立核驗。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 本報告不把 mock、deterministic contract test、模型未產生目標情境或無法連線的 Release API 當成通過證據。
- 若上述聲明不實，本報告無效。
