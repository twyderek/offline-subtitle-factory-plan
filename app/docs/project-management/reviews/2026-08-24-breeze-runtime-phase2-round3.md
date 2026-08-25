# FR-025 Windows Breeze managed runtime Phase 2 round3 獨立只讀審查

- 審查日期：2026-08-24（Asia/Taipei）
- 審查範圍：目前發布的 Windows x64 CPU Breeze managed runtime、manifest／SHA、受控 clean-profile、live App `/api/jobs`、renderer readiness、成功 retry 後錯誤清除、工程授權盤點，以及尚未閉合的 pristine VM、packaged Electron、法律與 source provenance 限制。
- 審查方式：僅依據目前工作區已保存的 evidence、發布產物與既有可追溯驗證結果；本報告為獨立只讀 round3 報告。

## 1. 需求完整性

- 判定：部分通過
- 證據：目前 manifest `app/runtime-manifests/breeze-asr-25-win-x64-cpu.json` 與 `app/breeze-runtime-output/release-metadata.json` 已固定 `engine=breeze-asr-25`、`win32/x64/cpu`、Python 3.11、runtime `2026.08.1`、公開下載 URL、檔名、大小 `286785161` bytes、解壓後大小 `1436390789` bytes、SHA-256 `724e8bcb45c7a1373e1d1eca0e413897354326a4fae207948e72ec529bb8bf4b`，並記錄 Breeze revision `c0993ecd98522d61066d3f5ce769e35c848b7855` 與 patched Whisper revision `f94c6ba670a35ee8d720d4221e102f4685c288d6`。本地 ZIP、manifest、checksum、release metadata 與已保存的公開 Release 核對結果一致，FR-025 的核心 runtime 交付條件已有具體產物支持；但完整使用者交付仍受 pristine VM、packaged Electron、法律審查與 App source provenance 缺口限制。

## 2. 邏輯正確性

- 判定：部分通過
- 證據：已保存的受控流程記錄顯示 PATH 僅 `C:\Windows\System32`，`git`、`node`、`python`、`py` 不可用，App 由 bundled Node 啟動，`POST /api/breeze-runtime/download` 最終為 `status=installed`、`ready=true`、`source=managed`、版本 `2026.08.1`、`restartRequired=false`。既有驗證也覆蓋成功安裝後的狀態清理契約：成功分支將 `state.error = null`、`state.cancelRequested = false`，而 `test-core.mjs` 的現有 assertion 明確鎖定成功 retry 必須清除 stale cancellation state；這支持流程邏輯正確，但尚無 packaged Electron 中可重播的完整 retry-click trace。

## 3. 邊界情況

- 判定：部分通過
- 證據：目前 evidence 與既有 focused 測試已涵蓋下載取消、大小或 SHA 不符、損壞 ZIP、安全解壓、probe failure、rollback、長路徑 staging、錯誤清理與無系統 Python／Git／Node 的受控前置條件；同時成功 clean-profile 流程已進入實際 Breeze `/api/jobs` 任務。仍未閉合的邊界包括 pristine Windows VM 的權限、防毒、檔案鎖與網路差異、packaged Electron 啟動與跨重啟恢復、完整 renderer cancel／retry／remove race，以及未簽章 runtime 對 SmartScreen／使用者信任的影響。

## 4. 程式碼品質

- 判定：部分通過
- 證據：runtime manager、archive utility、probe、server API 與 renderer 已有清楚的責任分層，並具備 HTTPS／大小／SHA 驗證、暫存解壓、安全路徑檢查、probe 後啟用、atomic activation、rollback、取消與成功後錯誤狀態清理。工程 license inventory 已記錄 Breeze、patched Whisper、Python、PyTorch 與套件資訊，但其 `reviewStatus` 是 `engineering-evidence`，不是法律意見；目前 41 個 installed package 中有 29 個沒有明確 `license` 欄位。此外，固定的 Breeze／patched Whisper revision 尚未等同於 App source tree 到已發布 runtime 的完整 commit provenance。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：既有保存結果記錄 focused manager、Breeze ASR／CLI、核心 API 與成功 retry 清錯 assertion 均通過；2026-08-24 evidence 亦記錄 live job `20260824050201-97e80c` 使用 `breeze-asr-25`，最終 `completed`、`ready-review`、progress `100`，並產生 `draft.srt`。renderer evidence 記錄已選取 Breeze、顯示「Breeze ASR 25 已就緒，可開始提交任務」、`consoleErrors=[]`。測試仍不足以宣稱 pristine VM、packaged Electron、完整 renderer retry／cancel／remove 序列、逐依賴 redistribution/legal review 或跨機型長音訊品質已驗收。

## 6. 實際運行結果

- 判定：部分通過
- 證據：目前實際運行 evidence 對受控 clean-profile 的 managed runtime 下載、驗證、安裝與 readiness 有明確結果，並由同一 App 完成 Breeze ASR 25 的 `/api/jobs` e2e 任務；renderer 亦回報選取 Breeze 且無 console errors。已保存的成功 retry 清錯證據與現行狀態契約一致，說明成功恢復後會清除 `error` 與取消旗標。這些結果是真實產物與 App 流程的證據，但不是 pristine Windows VM 或 packaged Electron acceptance，也不能取代法律意見與可獨立核對的 App source provenance。

## 綜合判定

- 結論：有條件通過
- 可逐字引用的完整結論句：**FR-025 核心 managed runtime 產物、manifest、SHA、受控 clean-profile 安裝、live App /api/jobs、renderer readiness 與成功 retry 錯誤清除已有證據支持；但 pristine VM、packaged Electron、逐依賴 legal review 與 App source provenance 尚未閉合，因此本輪僅判定有條件通過。**
- 阻擋問題（若有）：
  - 尚未保存 pristine Windows VM 的可重播驗收紀錄。
  - 尚未完成 packaged Electron 的 managed runtime／renderer acceptance。
  - `engineering-evidence` 與 build input 核准不能視為逐依賴 redistribution 或法律核准；仍有 29 個 installed package 缺少明確 license 欄位。
  - App source tree 與已發布 runtime 的可獨立核對 provenance 尚未閉合。
  - runtime payload 未由本輪證據證明已完成 Authenticode 簽章，SmartScreen 與使用者信任風險仍須揭露。

## 審查代理聲明

本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。

若上述聲明不實，本報告無效。
