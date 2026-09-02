# 獨立六面向審查報告：0.51.0 本機驗收 round2

- 審查對象 commit／版本：`main@10b3044d31a5367a91faacea46b8def7ee103f7c`／package version `0.51.0`
- 對應 08-CHANGE-LOG 條目：2026-09-02 — Offline Subtitle Factory 0.51.0 本機驗收（`ACCEPT-051-20260902`）
- 審查輪次：round2
- 審查代理啟動時間、上下文來源：2026-09-02 08:22（Asia/Taipei）；本輪在獨立審查上下文中讀取目前工作樹、固定核心與 full 路由治理文件、source／test／evidence、round1 報告、`/private/tmp` live result 及 GitHub Release API evidence，未修改 round1 或其他既有檔案。
- 判定標籤：`PASS` 僅代表該項證據成立；mock／deterministic contract 不代表 live model 通過；`MODEL_NOT_REPRODUCIBLE` 不得升級為通過；`BLOCKED` 代表缺件；`TEST_GAP` 代表測試或證據未覆蓋。

## 1. 需求完整性

- 判定：部分通過
- 證據：
  - 需求與範圍可追溯至 `docs/project-management/08-CHANGE-LOG.md:3-28`、`docs/project-management/02-REQUIREMENTS-ANALYSIS.md:FR-008,FR-010,FR-021` 與 `docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:58-69`；內容涵蓋來源／安全、parser／repair、LM Studio migration、Ollama live、完整回歸、封裝 smoke 與 Release gate。
  - source identity 已成立：本輪 `git rev-parse HEAD` 為 `10b3044d31a5367a91faacea46b8def7ee103f7c`，`package.json:3` 為 `0.51.0`；round1 report `2026-09-02-acceptance-051-round1.md:15` 另記錄本地 `v0.51.0` peeled commit 與 `origin/main` 一致。
  - LM Studio removal 的需求大致具備實作與測試追溯：active registry 在 `lib/ai/providers.mjs:4-25,95-182` 僅保留六個 provider，migration 在 `lib/ai/provider-migration.mjs:31-114` 清除已移除 provider 並保留其他 profile／secret，`scripts/test-ai-provider-migration.mjs:31-95` 驗證 idempotence 與保存其他 provider。
  - 完整驗收條件尚未閉合：既有 round1 可回溯結果 `docs/project-management/reviews/2026-09-02-acceptance-051-round1.md:33-38` 記錄完整 `npm run check` 失敗、封裝 smoke 缺件、LIVE-02／03／04 未重現與 parser TEST_GAP；這些仍直接影響本輪需求完成度。

## 2. 邏輯正確性

- 判定：部分通過
- 證據：
  - JSON parser 的 strict 邏輯在 `lib/ai/subtitle-optimizer.mjs:161-259`：root JSON array 僅在原始字串情境允許；nested wrapper 的 array 除明確 `cues` 外拒絕；`cues` object 可遞迴尋找；text parts 組合後再做 candidate extraction。
  - cue contract 在 `lib/ai/subtitle-optimizer.mjs:261-299` 固定數量、ID、順序、文字長度與翻譯語系；Ollama repair 僅在 `lib/ai/subtitle-optimizer.mjs:352-403,472-499` 觸發一次，成功前不寫 completed checkpoint，符合 `scripts/test-ai-response-parser.mjs:115-233` 與 `scripts/test-ai-optimizer.mjs:83-214` 的 deterministic 證據。
  - provider／安全邏輯有成立證據：`lib/ai/local-ai.mjs:15-33` 僅精確接受 `localhost`、`127.0.0.1`、`[::1]`；`lib/ai/openai-compatible.mjs:69-129` 對非 loopback 要求 key、停用自動 redirect、以 abort／timeout 結束；`scripts/test-ai-providers.mjs:79-193` 驗證無 key loopback、遠端 Ollama key gate、chunk idle timeout、headers 後 timeout 及 redirect rejection。
  - Ollama production adapter 在 `lib/ai/providers.mjs:45-92` 使用原生 `/api/chat`、streaming、schema／`num_predict:512`／`keep_alive:'10m'`；但 versioned direct evidence `docs/project-management/evidence/2026-09-02-acceptance-ollama-llama3.2-1b.json` 的 single-cue probe 使用 `stream:false`、只帶 temperature，故不能把 direct probe 單獨視為正式 optimizer path 的完整 live 證明，該差異維持 `TEST_GAP`（round1 report: `:35-37`）。
  - 完整回歸失敗具體落在 `scripts/test-breeze-runtime-manager.mjs:119-125`：測試呼叫 `getActiveManagedBreezePythonPath` 未傳 `arch:'x64'`，而產品函式 `lib/breeze-runtime-manager.mjs:90-102` 依目前 Apple Silicon `process.arch` fail-closed，round1 於 `2026-09-02 08:16` 已記錄實際回傳 `null`、預期 `python.exe`（round1 report: `:33-34`）。此項未被 focused AI 測試抵銷。

## 3. 邊界情況

- 判定：部分通過
- 證據：
  - 已覆蓋的 parser／repair 邊界包括 plain／prose Markdown fence、跨 text parts、`content` text part、明確 nested `cues`、nested wrapper root-array rejection、Ollama missing-cues one-shot repair、non-Ollama strict failure、repair failure checkpoint protection 與 generic JSON Schema preservation（`scripts/test-ai-response-parser.mjs:17-233`）。
  - 已覆蓋的 provider／運行邊界包括 IPv6 loopback、`localhost.example.com` 不得視為 loopback、遠端 Ollama 不得免 key、HTTP 301／302／303／307／308 redirect 均阻擋、stream chunk idle timeout、headers 後第一 chunk 延遲與 client abort（`scripts/test-ai-providers.mjs:110-193`、`scripts/test-ollama-batch-stream.mjs:40-65`）。
  - 已覆蓋 migration 的舊設定／project import／browser localStorage、其他 provider／secret preservation 與重跑不重遷移（`scripts/test-ai-provider-migration.mjs:31-95`）。
  - 必須標示 `TEST_GAP` 的未覆蓋項目已由目前 changelog `:20` 與 round1 report `:38,65-67` 明列：無語言 fence、CRLF／外圍空白、JSON string／prose braces、empty／mixed／missing text parts、plain nested JSON string、candidate priority／cycle-depth bound，以及 multi-cue repair 後 ID／數量／順序的正向斷言。這些不是「已考慮」即可取代的測試證據。
  - Ollama live 的指定情境沒有被模型產生：`/private/tmp/osf-acceptance-live-ollama-result.json` 記錄 LIVE-02 fenced JSON、LIVE-03 missing cues exactly-two-repair、LIVE-04 repair failure 均為 `MODEL_NOT_REPRODUCIBLE`；依本輪規則不得視為邏輯通過。

## 4. 程式碼品質

- 判定：部分通過
- 證據：
  - provider registry、loopback privacy、transport、migration、optimizer responsibilities 分離清楚，且 source 內有具體 fail-closed 邏輯：`lib/ai/providers.mjs:4-25`、`lib/ai/local-ai.mjs:15-33`、`lib/ai/openai-compatible.mjs:69-129`、`lib/ai/provider-migration.mjs:31-114`。
  - secret 不回傳與 provider isolation 有 source／test 支持：`server.mjs:514-565` 僅回傳 `hasApiKey`／來源摘要，`electron/main.mjs:723-750` 對 provider 做 allowlist 驗證；migration 測試驗證 LM Studio secret 移除而 Ollama／OpenAI secret 保留（`scripts/test-ai-provider-migration.mjs:53-61`）。
  - `seen` set 使 parser 對循環 object 有基本防護（`lib/ai/subtitle-optimizer.mjs:187-215`），但未見明確 cycle-depth bound 測試；`scripts/test-breeze-runtime-manager.mjs:119-125` 的 host arch fixture／API 契約不一致又造成完整 regression 失敗，因此品質判定不能為全數通過。
  - 目前工作樹已有使用者既有變更：`git status --short` 於本輪顯示 `08-CHANGE-LOG.md`、Ollama evidence JSON 與 round1 report；本報告沒有把工作樹誤寫成 clean，也未修改它們。

## 5. 測試覆蓋

- 判定：不通過
- 證據：
  - 本輪 2026-09-02 08:22:26–08:22:27（Asia/Taipei）重新執行五項 focused tests，全部 exit 0：`node scripts/test-ai-response-parser.mjs`、`node scripts/test-ai-optimizer.mjs`、`node scripts/test-ai-provider-migration.mjs`、`node scripts/test-ai-providers.mjs`、`node scripts/test-ollama-batch-stream.mjs`；實際輸出分別包含 parser、optimizer、migration、provider contract、Ollama streaming passed。
  - 完整回歸不可列為通過：round1 在 2026-09-02 08:16 實際執行 `npm run check` exit 1，失敗於 `scripts/test-breeze-runtime-manager.mjs:125`（round1 report: `:33-34`）；`package.json:20-21` 證明 `npm test`／`npm run check` 會包含該測試。
  - 依使用者要求本輪未再執行長時間完整回歸；因此本報告不宣稱 full regression 已被修正或重新通過。既有 failure 仍是未解除的阻擋證據。
  - focused 測試本身仍有 `TEST_GAP`：parser 邊界、multi-cue repair positive identity/order、正式 optimizer live path 的 versioned evidence，以及 packaged app smoke 均未由這五項 deterministic test 補足。

## 6. 實際運行結果

- 判定：部分通過
- 證據：
  - 真實 Ollama evidence `docs/project-management/evidence/2026-09-02-acceptance-ollama-llama3.2-1b.json` 記錄 endpoint `http://127.0.0.1:11434/v1`、Ollama `0.33.2`、model `llama3.2:1b`、既有模型清單與 HTTP 200；`/private/tmp/osf-acceptance-live-ollama-result.json` 記錄 LIVE-01 `PASS`（3 cues／ID 順序）、LIVE-05 `PASS`（client abort）、LIVE-CHECKPOINT `PASS`（`nextBatchIndex=1`）。本輪沒有執行 `ollama pull`，也沒有停止服務。
  - 同一 live result 將 LIVE-02、LIVE-03、LIVE-04 明確標為 `MODEL_NOT_REPRODUCIBLE`：模型分別未產生 fenced JSON、第一次已含 cues 未觸發 missing-cues repair、第一次已含 cues 未進入 repair failure；不能用 request count 1 冒充 exactly-two repair 或 failure path。
  - packaged app smoke 為 `BLOCKED`：目前 app／候選輸出位置沒有可供本機執行的 0.51.0 Setup／Portable／DMG／ZIP；沒有下載或另行建立封裝。GitHub asset 存在不等於本機已完成安裝／啟動／解除安裝 smoke。
  - GitHub Release 只讀 API 核對於 2026-09-02 08:21:59（Asia/Taipei）成功：`v0.51.0` target `10b3044d31a5367a91faacea46b8def7ee103f7c`、`draft=false`、`prerelease=false`、published `2026-09-01T07:55:23Z`、6 assets。資產為 `latest.yml` 2,155 bytes digest `sha256:afef8a7b5de7ff65cdfba2fa4204bd23dd5c3d04947fe1ab5f0ef1e086a61283`、Portable 242,979,811 bytes `sha256:cb6f7d6aa1127a0d254fbb1379a986c2c17277572b11c1e723c6c01d7db89c78`、Setup 243,687,067 bytes `sha256:5328c4f015a27290b5ef8ce90cf552f818aa4cc16f1635fd46c2632905616835`、blockmap 255,227 bytes `sha256:c8dac8499da7969fb533ce7af9b08b777b10bb7970f7f14be6347009a3e21bc0`、SHA list 221 bytes `sha256:cbf9208e2e7e66ab29dca79e294c08fc23362f09a532ebf9c0462aaf53fe5f5b`、signing status 91 bytes `sha256:a1dd9e1dc7ba28cfd8faed976343777e636a7642488e426ec628a5e949937347`。這證實遠端 Release／資產存在，但未提供本機 packaged smoke 證據。
  - 遠端 Release body 於 2026-09-02 08:22:09 唯讀取得，明確揭露 Windows Setup／Portable 為 **UNSIGNED INTERNAL PREVIEWS**、可能出現 Unknown Publisher／SmartScreen，且 release environment 未執行 live provider validation；這部分揭露成立，但與目前本機 tracked 文件不一致。

## 綜合判定

- 判定：不通過
- 結論：不通過
- 可逐字引用的完整結論句：**本輪 round2 獨立六面向複審確認 0.51.0 的 source identity、LM Studio removal／migration、provider 安全契約、Ollama deterministic parser／repair contract 與部分真實 Ollama 結果有證據支持；但完整 npm run check 仍有可重現失敗、packaged app smoke 缺件、LIVE-02／03／04 仍為 MODEL_NOT_REPRODUCIBLE、parser／multi-cue 邊界存在 TEST_GAP，且已公開 GitHub Release 與本機 tracked Release 文件／目前狀態互相矛盾，因此不得視為本機驗收通過、治理 closeout 完成或穩定發布候選。**
- 阻擋問題（若有）：
  - `npm run check` exit 1，阻擋完整回歸與治理驗收閉環；根因／責任邊界須先釐清 Breeze runtime manager 的 Apple Silicon host `arch` fixture／API 契約並重跑完整回歸。
  - 0.51.0 本機 Setup／Portable／macOS 封裝缺件，packaged app smoke 為 `BLOCKED`；遠端 assets 不能替代本機實際安裝／啟動／解除安裝驗證。
  - LIVE-02／03／04 必須保持 `MODEL_NOT_REPRODUCIBLE`；需可控制 response 的 deterministic harness 或能重現指定模型輸出的正式 optimizer path evidence，不能以 mock 或模型未觸發情境宣稱通過。
  - `RELEASE-NOTES-0.51.0.md:3`、`README.md:3-5`、`docs/project-management/00-CURRENT-STATUS.md:4-16`、`docs/project-management/05-DEVELOPMENT-AND-DEPLOYMENT.md:6,44-45` 仍寫 candidate／尚未建立 tag 或 Release，而 GitHub API 已證實公開非 prerelease `v0.51.0`；須同步核正文件與實際 Release 狀態，並重新核定 Release gate。
- 剩餘風險：未完成 clean-machine／跨平台實機矩陣、Windows unsigned／macOS notarization 狀態下的實機風險、真實模型品質、長音訊與取消／timeout／checkpoint 完整端到端；這些不得由 focused deterministic test 或遠端 Release metadata 隱含通過。

## 審查代理聲明

- 判定：通過
- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改 round1、source、test、evidence、治理文件、Release、tag 或任何其他專案檔案。
- 本輪沒有執行長時間完整回歸；依使用者指示直接使用已讀的 round1 可回溯 failure、目前 source／test／evidence／live result 與唯讀 GitHub Release evidence 完成複審，不把 mock、deterministic contract、模型未產生目標情境或遠端 metadata 當成 packaged／live 通過證據。
- 本報告是唯一新增寫入的專案檔案；若上述聲明不實，本報告無效。
