# AI provider support matrix（0.51.0）

本表只描述目前產品 active contract。LM Studio provider 已移除，不得以 `openai-compatible` 名稱或自訂 endpoint 重新啟用官方 LM Studio 支援。

| Provider | Active | 官方本機 provider | API Key | JSON／repair contract |
|---|---:|---:|---:|---|
| `ollama` | 是 | 是 | loopback 可省略 | JSON candidate extraction；缺少 `cues` 最多 repair 一次 |
| `openai-compatible` | 是 | 否（可使用 loopback） | 依 endpoint privacy | `json_object`／通用 JSON Schema；非本機 strict failure |
| `openai` | 是 | 否 | 必須 | provider capabilities 決定 `json_object` 或 JSON Schema |
| `azure` | 是 | 否 | 必須 | Azure deployment API contract |
| `groq` | 是 | 否 | 必須 | OpenAI-compatible transport |
| `gemini` | 是 | 否 | 必須 | Gemini models API 與 compatible completion transport |
| `lm-studio` | 否 | 否 | 不適用 | API、UI、registry 均拒絕；不會 fallback |

舊設定若含 `lm-studio`，啟動、專案匯入或瀏覽器 localStorage migration 會清除 endpoint、model、capabilities、secret reference 與 profile，將 provider 設為未選擇並顯示一次 migration notice。其他 provider 與 secrets 保留；migration 可重複執行。
