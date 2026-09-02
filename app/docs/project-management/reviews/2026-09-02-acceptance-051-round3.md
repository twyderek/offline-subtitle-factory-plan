# 獨立六面向複審報告：0.51.0 本機驗收 round3

- 審查對象 commit／版本：`main@10b3044d31a5367a91faacea46b8def7ee103f7c`／package version `0.51.0`
- 對應 08-CHANGE-LOG 條目：2026-09-02 — Offline Subtitle Factory 0.51.0 本機驗收（`ACCEPT-051-20260902`）
- 審查輪次：round3
- 審查代理啟動時間、上下文來源：2026-09-02 08:30（Asia/Taipei）；本輪重新讀取 full preflight 列出的固定核心／路由文件、目前 source／test、全部 evidence、round1 與 round2 報告，並以只讀指令交叉核對目前工作樹、tag、live result 與封裝檔狀態。
- 審查限制：依需求不再執行長時間完整測試；不把前兩輪結論、模型未產生目標情境或缺件當成通過證據。

## 1. 需求完整性
- 判定：部分通過
- 證據：
  - 需求範圍可回溯至 `docs/project-management/02-REQUIREMENTS-ANALYSIS.md:37-41` 的 `FR-021`、`FR-024`、`FR-025`，以及 `docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:52-58`；涵蓋 LM Studio removal／migration、Ollama parser／repair、loopback privacy、完整回歸與 live acceptance 限制。
  - 來源可重現：2026-09-02 08:30 的只讀核對得到 `git rev-parse HEAD`、`git rev-parse v0.51.0^{commit}` 均為 `10b3044d31a5367a91faacea46b8def7ee103f7c`，`package.json:3` 為 `0.51.0`。
  - active provider 與 migration 有實作／測試追溯：`lib/ai/providers.mjs:4-24,95-109` 僅保留六個 provider，`lib/ai/provider-migration.mjs:31-114` 清除 LM Studio 並保留其他 provider，`scripts/test-ai-provider-migration.mjs:31-95` 驗證 migration、secret preservation 與 idempotence。
  - 驗收成功條件尚未閉合：round2 `docs/project-management/reviews/2026-09-02-acceptance-051-round2.md:47-54,66-76` 仍記錄完整回歸 failure、封裝 smoke 缺件、三個 live repair 情境不可重現與 parser／multi-cue TEST_GAP；本輪未取得新證據解除它們。

## 2. 邏輯正確性
- 判定：部分通過
- 證據：
  - parser 在 `lib/ai/subtitle-optimizer.mjs:161-215` 對 JSON candidate、明確 `cues`、nested wrapper root array 與循環 object 採 strict／fail-closed 處理；cue contract 與 repair 行為由 `docs/project-management/03-FUNCTIONAL-DESIGN.md:81-87` 定義。
  - Ollama production adapter 在 `lib/ai/providers.mjs:45-92` 使用原生 `/api/chat`、streaming、schema、`num_predict:512` 與 `keep_alive:'10m'`；provider security 在 `lib/ai/openai-compatible.mjs:69-129` 具備 loopback key gate、manual redirect、timeout／abort 與錯誤分類。
  - deterministic 證據成立：`scripts/test-ai-response-parser.mjs:115-233`、`scripts/test-ai-optimizer.mjs:83-214`、`scripts/test-ai-providers.mjs:79-193` 涵蓋一次 repair、strict non-Ollama、failed checkpoint、ID／數量／順序保護及 provider transport 邊界。
  - live 證據不能升級為完整邏輯通過：`/private/tmp/osf-acceptance-live-ollama-result.json:22-52` 將 LIVE-02、LIVE-03、LIVE-04 記為 `MODEL_NOT_REPRODUCIBLE`，實際 request count 為 1，沒有證明 fenced JSON、missing-cues repair 或 repair failure；`docs/project-management/evidence/2026-09-02-acceptance-ollama-llama3.2-1b.json:70-126` 的 direct probe 仍使用 `stream:false`，與正式 adapter 的 streaming path 不同，保留 `TEST_GAP`。

## 3. 邊界情況
- 判定：部分通過
- 證據：
  - 已有 focused tests 實際覆蓋 plain／prose Markdown fence、text parts、明確 nested `cues`、nested wrapper root-array rejection、Ollama one-shot repair、non-Ollama strict failure、failed checkpoint、IPv6 loopback、非 loopback key gate、chunk idle timeout、headers 後延遲、client abort、301／302／303／307／308 redirect 與 migration idempotence（`scripts/test-ai-response-parser.mjs:17-233`、`scripts/test-ai-providers.mjs:110-193`、`scripts/test-ollama-batch-stream.mjs:40-65`、`scripts/test-ai-provider-migration.mjs:31-95`）。
  - 仍未由證據覆蓋的 parser／repair 邊界，已列於 `docs/project-management/08-CHANGE-LOG.md:20` 與 round2 `:28-36`：無語言 fence、CRLF／外圍空白、JSON string／prose braces、empty／mixed／missing text parts、plain nested JSON string、candidate priority／cycle-depth bound，以及 multi-cue repair 後 ID／數量／順序的正向斷言。
  - 目前模型沒有產生指定 live 邊界：同一 live result `:22-52` 明確顯示 LIVE-02／03／04 為 `MODEL_NOT_REPRODUCIBLE`；依驗收規則，模型未重現不能算邊界通過。
  - 舊 evidence `docs/project-management/evidence/2026-07-28-lm-studio-qwen2.5-1.5b-live.json` 與 2026-07-30 Ollama evidence 可支持歷史觀察，但版本／provider 情境不同，不能補足 0.51.0 的 current live repair 或 packaged acceptance。

## 4. 程式碼品質
- 判定：部分通過
- 證據：
  - provider registry、local endpoint classifier、transport、migration 與 optimizer 責任分離，且 source 有具體安全限制：`lib/ai/providers.mjs:4-24`、`lib/ai/local-ai.mjs:15-33`、`lib/ai/openai-compatible.mjs:69-129`、`lib/ai/provider-migration.mjs:31-114`。
  - secret isolation 有可追溯證據：`server.mjs:514-565` 僅回傳 `hasApiKey`／摘要，migration test `scripts/test-ai-provider-migration.mjs:53-61` 驗證移除 LM Studio secret 而保留 Ollama／OpenAI secret；parser `seen` set 在 `lib/ai/subtitle-optimizer.mjs:187-215` 提供循環 object 的基本保護。
  - 品質判定不能全數通過：round1／round2 均記錄完整 `npm run check` 在 `scripts/test-breeze-runtime-manager.mjs:125` 失敗；source `lib/breeze-runtime-manager.mjs:90-102` 要求 `platform='win32'` 且 `arch='x64'`，fixture 未傳 arch，形成可重現的 test／API contract mismatch。
  - 目前工作樹並非 clean：2026-09-02 08:30 `git status --short` 顯示既存 `08-CHANGE-LOG.md`、Ollama evidence、round1／round2 報告變更；本輪不把它們歸因於本報告，也不修改它們。

## 5. 測試覆蓋
- 判定：不通過
- 證據：
  - round2 `docs/project-management/reviews/2026-09-02-acceptance-051-round2.md:47-54` 記錄 2026-09-02 08:22:26–08:22:27 五項 focused tests 全部 exit 0：`test-ai-response-parser.mjs`、`test-ai-optimizer.mjs`、`test-ai-provider-migration.mjs`、`test-ai-providers.mjs`、`test-ollama-batch-stream.mjs`。這只證明 deterministic contract，不能代替 live model acceptance。
  - 完整回歸仍有未解除的失敗證據：round1 `:33-34` 與 round2 `:49-53` 記錄 `npm run check` exit 1，失敗於 `scripts/test-breeze-runtime-manager.mjs:125`；`package.json:20-21` 證明該測試屬於 `npm test`／`npm run check`。
  - 依需求本輪未再跑長時間 `npm run check`，因此只能如實保留既有 failure，不能宣稱 full regression 已修正或通過。
  - focused coverage 仍有 `TEST_GAP`：parser 邊界、multi-cue repair positive identity/order、正式 optimizer streaming live path、packaged app smoke 與 clean-machine acceptance 均未被這些快速測試補足。

## 6. 實際運行結果
- 判定：部分通過
- 證據：
  - `docs/project-management/evidence/2026-09-02-acceptance-ollama-llama3.2-1b.json:1-154` 記錄 Ollama `0.33.2`、`llama3.2:1b`、loopback endpoint 與 HTTP 200；`/private/tmp/osf-acceptance-live-ollama-result.json:6-75` 的 LIVE-01、LIVE-05、LIVE-CHECKPOINT 為 `PASS`，包含 3 cues／ID 順序、client abort 與 `nextBatchIndex=1` checkpoint。
  - 同一 live result `:22-52` 將 LIVE-02、LIVE-03、LIVE-04 明確記為 `MODEL_NOT_REPRODUCIBLE`；request／repairCount 沒有證明目標情境已執行，不能算實際運行通過。
  - 本機封裝缺件：2026-09-02 08:30 的只讀 `find .. -maxdepth 3` 只找到 `../app/RELEASE-NOTES-0.51.0.md`，沒有 0.51.0 Setup／Portable／DMG／ZIP 可供 smoke；round2 `:60-64` 亦記錄 packaged smoke `BLOCKED`。遠端 Release metadata 即使存在，也不能替代本機安裝／啟動／解除安裝實測。
  - 文件與遠端狀態仍不一致：`RELEASE-NOTES-0.51.0.md:3`、`README.md:3-5`、`docs/project-management/00-CURRENT-STATUS.md:4-16` 仍描述 candidate／尚未建立 tag 或 Release；round2 `:63-64` 所記錄的唯讀 GitHub evidence 則描述 `v0.51.0` 已公開。這不是可忽略的實際運行／交付證據差異。

## 綜合判定
- 判定：不通過
- 結論：不通過
- 可逐字引用的完整結論句：**本輪 round3 獨立複審確認 0.51.0 的 source identity、LM Studio migration／provider 安全契約、Ollama deterministic parser／repair contract 與部分 loopback live 結果仍有可回溯證據；但既有完整 npm run check failure 未解除、packaged app smoke 仍缺件、LIVE-02／03／04 仍為 MODEL_NOT_REPRODUCIBLE、parser／multi-cue 邊界與正式 optimizer live 證據仍有 TEST_GAP，且本機 tracked Release 文件與已記錄的遠端 Release 狀態互相矛盾，因此本機驗收、治理 closeout 與穩定發布候選均不通過。**
- 阻擋問題（若有）：
  - `npm run check` 的既有 exit 1 尚未解除；須先釐清 `getActiveManagedBreezePythonPath` 的 Apple Silicon host fixture／API contract，修正後重跑完整回歸。
  - 本機沒有 0.51.0 Setup／Portable／DMG／ZIP，packaged app smoke 為 `BLOCKED`；遠端資產或 metadata 不能替代本機實際安裝、啟動與解除安裝。
  - LIVE-02／03／04 必須維持 `MODEL_NOT_REPRODUCIBLE`；需可控制 response 的 deterministic harness 或可重現模型輸出，並保存正式 optimizer path 的 request／response／repair count，不能以 mock 或模型未觸發情境宣稱通過。
  - parser／multi-cue boundary TEST_GAP 及 direct probe 與正式 streaming path 的證據差異未補齊。
  - `RELEASE-NOTES-0.51.0.md`、README、current status 與已記錄的 GitHub Release 狀態矛盾；須由負責變更者同步核正後重新評估 Release／治理 gate。本輪依需求不修改這些文件。

## 審查代理聲明
- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
