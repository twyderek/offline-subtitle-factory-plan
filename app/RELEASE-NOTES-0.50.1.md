# 離線字幕工廠 0.50.1

發布日期：待正式建立 `v0.50.1` Release

## 版本定位

0.50.1 是修復本機 AI 回應結構問題的 patch release。它延續 0.50.0 的本機優先與字幕 cue 保護契約，不改寫既有 `v0.50.0` tag 或 Release 資產。

## 主要修正

- 修復本機 AI 回應缺少 `cues` 時的單次格式修復；Ollama 與 LM Studio 最多只執行一次 repair。
- 支援 Markdown-wrapped JSON，包括 fenced JSON 以及前後含說明文字的回應。
- 支援跨 text parts 組合後再解析 JSON，維持原始 part 順序。
- 明確限制 nested wrapper root arrays；`response`、`output`、`result`、`data`、`content`、`message` 等巢狀欄位不會任意把陣列當成 cues。
- LM Studio repair 保留原始 JSON Schema `response_format`。
- repair 失敗不會誤寫 completed checkpoint，也不會讓非本機 provider 自行重送。

## 驗證範圍

- 回歸測試涵蓋 top-level root array、Markdown fenced JSON、text parts、明確 nested `cues`、nested root-array rejection、local-provider one-shot repair、失敗 checkpoint 行為與 LM Studio JSON Schema preservation。
- 本版 release preparation 使用 deterministic mock／contract tests；真實 Ollama／LM Studio endpoint、模型品質、取消／逾時與完整安裝後實機驗收須由 release acceptance 另行確認。

## 發布與安全狀態

本文件隨 0.50.1 release preparation 建立；在正式核准前不建立 tag、不建立或發布 GitHub Release，也不覆蓋 `v0.50.0` 的任何資產。Windows 未簽章／macOS 未公證風險若於後續公開發布，須依 `AUTH-2026-07-23-01` 與正式發布核對結果如實揭露。

## 待執行的實機驗收步驟

若 Ollama／LM Studio 已由使用者明確啟動並備妥模型，請在不傳送資料到雲端的本機環境分別驗證：正常 `{"cues":[...]}`、Markdown fenced JSON、text parts JSON、第一次缺少 cues 後 repair 成功、nested wrapper root array 只 repair 一次、第二次仍缺少 cues 時停止、取消／timeout 不再 repair、repair 失敗不寫 completed checkpoint，以及 LM Studio 初次與 repair 的 `response_format` 完全相同。未啟動 endpoint 時，本版不得將 deterministic mock／contract test 說成實機驗收通過。
