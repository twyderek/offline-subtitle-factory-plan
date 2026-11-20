# AI 字幕優化流程修正與同步說明

> 日期：2026-10-21
> 目的：記錄 AI 回傳缺少 `cues` 陣列的診斷、修正與後續同步入口。

## 問題結論

Azure 回應本身是 HTTP 200、`finish_reason=stop`，但模型回傳的 JSON 沒有外層 `cues` 陣列。這不是 API Key、網路或字幕上傳失敗；原本的 prompt 對 JSON 根物件格式不夠明確，單字幕時模型可能直接回傳單一 cue 物件。

## 本次修改重點

- `lib/ai/subtitle-optimizer.mjs`
  - 明確要求根物件必須是 `{"cues":[...]}`。
  - 僅在單批單字幕且物件同時具備 `id` 與字串 `text` 時，安全包裝成 `cues` 陣列。
  - 保持其他缺少 `cues` 的 JSON 嚴格失敗，避免誤套用模型回應。
  - 依文字量動態拆分 prompt batch，並保留斷句上下文。

- `lib/ai/openai-compatible.mjs` 與 `server.mjs`
  - 保存安全的 AI response diagnostics：HTTP 狀態、finish reason、回應欄位形狀與驗證錯誤；不保存字幕全文。

- `public/ai-scope.mjs`、`public/review.html`、`public/review.js`
  - 新增預設「智慧範圍」：依優化模式只送出相關品質問題。
  - 搜尋同時涵蓋原文與譯文；斷句模式附帶前後字幕上下文。

- `scripts/test-ai-*.mjs`、`scripts/test-review-ui.mjs`
  - 覆蓋單一 cue 物件、缺少 cues、外層 JSON、動態分批、智慧範圍與上下文等回歸案例。

## 驗證結果

- `npm test`：通過。
- Windows unpacked build：通過。
- Windows NSIS／Portable build：已產生；目前為未簽章內部預覽版。
- 不提交 `dist/`、`jobs/`、暫存 release 目錄或 API 金鑰。

## 後續同步入口

後續若要同步本功能，優先讀取本文件，再檢查以下檔案：

1. `lib/ai/subtitle-optimizer.mjs`
2. `lib/ai/openai-compatible.mjs`
3. `server.mjs`
4. `public/ai-scope.mjs`、`public/review.html`、`public/review.js`
5. `scripts/test-ai-optimizer.mjs`、`scripts/test-ai-response-parser.mjs`、`scripts/test-ai-diagnostics.mjs`

舊的 failed checkpoint 不會自動重送；修正後應由使用者重新啟動 AI 優化。任何雲端 AI 實機測試都必須另行確認資料傳送範圍。
