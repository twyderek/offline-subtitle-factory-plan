# 離線字幕工廠 0.51.0

發布狀態：已公開；GitHub `v0.51.0` Release 已建立，target commit 為 `10b3044d31a5367a91faacea46b8def7ee103f7c`，非 draft／非 prerelease。

## 重要變更

- 修復本機 Ollama AI 回應缺少 `cues` 時的單次格式修復。
- 支援 Markdown-wrapped JSON、含前後說明文字的 JSON，以及跨 text parts 組合的 JSON。
- 明確限制 nested wrapper root arrays：`response`、`output`、`result`、`data`、`content`、`message` 或其他 nested field 下的 root array 不會自動視為字幕 cues；只有明確的 `cues` property 可接受。
- Ollama 缺少 `cues` 時最多 repair 一次；其他 provider 維持 strict failure。
- 移除 LM Studio provider、UI 選項、端點預設值、能力特例與正式設定支援。一般 OpenAI-compatible 端點仍可使用，但不代表官方 LM Studio 支援。
- 舊的 LM Studio 設定會在啟動／匯入時移除，provider 會回到未選擇狀態，不會自動切換到 Ollama 或雲端 provider；其他 provider 與 secrets 保留。
- repair 第二次仍失敗時不會誤寫 completed checkpoint。

## 相容性與安全性

0.50.1 release preparation 已取消並由本 0.51.0 release 取代；歷史稽核紀錄保留，不代表 0.50.1 已發布。既有 `v0.50.0` tag、Release 與資產未修改。本輪已由乾淨的 `10b3044d31a5367a91faacea46b8def7ee103f7c` 建立並驗證 macOS arm64 acceptance-only package；同一 exact source 的 GitHub Actions Windows 2022 run `33483093931` 已完成 unsigned Setup／Portable、renderer、Setup install、uninstall、Portable smoke 與 archive checks，但本機／pristine Windows machine 仍未驗證。exact public tag 的 clean-source Breeze fixture baseline 仍為 `FAIL`，current remediation worktree 修正已通過回歸。公開 assets 的 digest／大小／SHA256SUMS 已核對，因 workflow 沒有直接的 Release upload step，per-asset build provenance 仍未證實；公開 `latest.yml` 與 exact 0.51.0 package 內的 embedded release-notes 仍保留歷史 candidate 狀態，source 文件本身已同步為公開狀態。packaged acceptance 與 remediation 文件／證據治理 closeout 維持 CONDITIONAL，stable acceptance 不放行；版本建議 `RECOMMEND_0.51.1_PATCH`。如需修正 embedded binary／metadata，應另發 `0.51.1` patch，不覆寫本 Release。

Windows unsigned internal preview 若由 workflow 產生，必須標示為未簽章版本；只有憑證可用且簽章驗證通過時才可描述為 signed build。

本版本的 provider 異常格式、repair 次數、取消／timeout 與 checkpoint 行為以 deterministic regression tests 驗證。真實 Ollama endpoint 與模型品質需另行人工驗收；未授權或不存在的本機 endpoint 不會被偽稱為 live test。
