# 獨立審查報告：Offline Subtitle Factory 0.51.0 LM Studio removal round1

- 審查對象：`codex/remove-lm-studio` working tree，基準 `main` `0091663a26456aa265e6763a7fdaddb23eb4570a`，候選版本 `0.51.0`。
- 審查輪次：round1
- 審查代理啟動時間、上下文來源：2026-09-01（Asia/Taipei）；獨立檢查 provider registry、server／Electron migration、UI、optimizer、tests、package／workflow、active release documents 與 residual reference scan。
- 審查限制：沒有建立 tag 或 GitHub Release；沒有下載模型、啟動 provider 或傳送字幕內容到外部服務。

## 1. 需求完整性

- 判定：通過
- 證據：候選由指定 `main` SHA 建立，版本已同步至 `app/package.json`、`app/package-lock.json` 與 active UI／workflow／release notes。0.50.1 被標記為未發布、已取消並由 0.51.0 取代；歷史 `v0.50.0` 不在變更範圍。
- 證據：active provider matrix 保留 Ollama、OpenAI、OpenAI-compatible、Azure、Groq、Gemini；LM Studio 只出現在 migration、negative regression 與歷史 audit／release records，不再是可選 provider。

## 2. 邏輯正確性

- 判定：通過
- 證據：`local-ai.mjs`、`providers.mjs`、review selector、local discovery、server provider validation 與 Electron key IPC 均移除 LM Studio active path；`createProvider({ provider: 'lm-studio' })` 明確失敗，不會 fallback。
- 證據：startup／project import／browser localStorage migration 將 LM 設定改為未選擇、清除 endpoint／model／capabilities／secret reference／profile，顯示一次通知並保留其他 provider；migration helper 的 repeated run 不再產生變更。
- 證據：optimizer 保留 shared JSON candidate extraction／balanced bracket parsing；root array 僅在原始 top-level content string 接受，nested wrapper root arrays 嚴格拒絕，Ollama 仍可 one-shot repair，通用 JSON Schema response format 不被 repair 覆寫。

## 3. 邊界情況

- 判定：通過
- 證據：parser regression 覆蓋 Markdown fence、前後 prose、text parts、explicit nested `cues`、`response`／`output`／`result`／`data`／`content`／`message` 與 arbitrary nested arrays 的 direct／serialized／fenced 負例。
- 證據：Ollama missing-cues repair、second-response failure、completed checkpoint 保護、非本機 strict failure、LM Studio API rejection、舊設定 migration、其他 secrets 保留與 idempotence 均有 deterministic regression coverage。

## 4. 程式碼品質

- 判定：通過
- 證據：所有變更 JavaScript 通過 `node --check`；`npm run check` 通過完整 package test chain；新增 migration helper 與 provider support matrix 均納入 active runtime／documentation scope。
- 證據：沒有修改 `v0.50.0` 的 tag／Release 資產；workflow active trigger、artifact、package release notes 均指向 0.51.0，未保留 0.50.1 active artifact filename。

## 5. 測試覆蓋

- 判定：通過
- 證據：focused parser、migration、optimizer、provider、Ollama streaming 與 AI fetch tests 均 exit 0；`npm run docs:check`、`npm run docs:check:final`、`npm run runtime:manifest`、`npm run runtime:verify` 與 `git diff --check` 均 exit 0；`npm ci` 回報 0 vulnerabilities。
- 證據：完整 `npm run check` 包含 migration regression、provider removal／rejection、startup migration core test 與既有 Whisper／Breeze／core tests，整體 exit 0。

## 6. 實際運行結果

- 判定：部分通過
- 證據：本輪只執行 deterministic local tests 與 runtime package verification，沒有使用者已授權的 Ollama endpoint／模型可供 live acceptance；`LIVE_PROVIDER_TESTS=NOT_RUN`，沒有把 mock 測試描述為真實 provider 驗收。
- 證據：Windows signed build、clean-machine 安裝、macOS notarization、真實模型品質與 public release asset 尚未驗收；unsigned internal preview 必須維持未簽章標示。

## P0／P1 判定與剩餘風險

- P0：未發現。沒有看到 provider fallback、LM secret 外洩、v0.50.0 資產修改或未授權外部資料傳送。
- P1：未發現 active code／test blocker。公開發布前仍需使用者另行完成 live Ollama、Windows signing／clean-machine 與跨平台實機 acceptance。
- Residual references：`provider-migration.mjs`、renderer migration helper、negative tests 與 0.51.0 release notes 是必要相容性／回歸證據；`docs/project-management/reviews/`、舊 `08-CHANGE-LOG.md`、舊 0.48 release／evidence 是不可改寫的歷史紀錄，已由 active status 明確標示 discontinued／historical。

## 綜合判定

- 結論：有條件通過
- 可逐字引用的完整結論句：**本輪獨立審查確認 0.51.0 已移除 LM Studio active provider、完成舊設定安全 migration、保留 Ollama parser／one-shot repair、通過 provider／parser／core regression 與文件／runtime checks，且未修改 v0.50.0；但 live provider、clean-machine、signed／notarized packaging 與 public release 尚未驗收，因此只可進入 review，不能直接建立 tag 或 GitHub Release。**
- 阻擋問題（若有）：無 active P1 blocker；公開發布門檻仍要求 live Ollama acceptance、Windows／macOS packaging evidence 與新的發布核准。
- 剩餘風險：`LIVE_PROVIDER_TESTS=NOT_RUN`；真實模型輸出品質、跨平台安裝、Authenticode、macOS notarization 與正式 0.51.0 assets 仍待另行驗收。
- 給主要開發代理的具體修正要求（若有）：push 本候選 branch 並建立 review PR；不要建立 tag／Release，不要修改 v0.50.0。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
