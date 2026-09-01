# 本機語言模型設定手冊

目前產品只提供 Ollama 的官方本機 provider 支援。LM Studio provider 已停止維護並從 registry、UI、端點預設值與 response-format 特例移除；舊設定會在啟動或匯入時清除並回到未選擇狀態，不會自動切換到其他 provider。

## Ollama（macOS／Windows）

1. 從 [Ollama 官方網站](https://ollama.com/download) 安裝並啟動 Ollama。
2. 使用者自行準備已授權模型，例如：

```bash
ollama pull llama3.2:1b
```

3. 確認服務端點 `http://127.0.0.1:11434`。
4. 專案設定填入：

   - Provider：`ollama`
   - Base URL：`http://127.0.0.1:11434/v1`
   - Model：已載入的模型名稱
   - API Key：本機端點不需要

驗證：

```bash
curl http://127.0.0.1:11434/v1/models
```

App 不會自動下載、啟動、停止或刪除模型。真實 endpoint 驗收必須由使用者先啟動服務並準備模型；deterministic mock tests 不等同於 live provider acceptance。

## 一般 OpenAI-compatible 端點

若使用其他相容服務，可選擇 `openai-compatible` 並填入服務提供者的 `/v1` Base URL、模型與必要 API Key。這是通用 transport 支援，不是官方 LM Studio provider；非 loopback 端點會依雲端／遠端政策要求 API Key 與資料傳送同意。

## 舊設定與資料安全

若設定檔、專案匯入檔或瀏覽器 localStorage 仍含 `lm-studio` 或其 `1234` endpoint，App 會移除該 provider 的 endpoint、model、capabilities、secret reference 與 profile，並顯示：

`LM Studio 已停止支援，相關設定已移除，請重新選擇 AI 供應商。`

其他 provider 設定與 secrets 不會因 migration 被刪除。migration 可重複執行而不會重新啟用已移除的 provider。

## 模型建議

所有 AI 建議都必須人工逐段確認；本機模型通過 JSON 或 API 測試，不代表字幕品質驗收通過。模型下載與實機 provider 測試不在 release preparation 中自動執行。

## 專案設定位置

macOS 持久設定：

`~/Library/Application Support/offline-subtitle-factory/config/settings.json`

Ollama loopback 端點會標記為 `endpointPrivacy: local`，不需要雲端同意或 API Key。遠端 URL 不應冒充本機端點。
