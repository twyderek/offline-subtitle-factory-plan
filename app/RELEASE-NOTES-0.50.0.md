# 離線字幕工廠 0.50.0

發布日期：2026-08-25

## 版本重點

0.50.0 將 Windows Breeze ASR 25 managed runtime 一鍵安裝流程整理為正式 App 版本。Windows x64 使用者不需要預先安裝 Python、Git 或 Node.js；第一次選擇 Breeze ASR 25 時，App 會從固定 Release asset 下載、驗證、解壓、探針檢查並原子啟用 CPU runtime。

- App Release：[v0.50.0](https://github.com/twyderek/offline-subtitle-factory-plan/releases/tag/v0.50.0)
- Breeze runtime Release：[breeze-runtime-2026.08.1](https://github.com/twyderek/offline-subtitle-factory-app/releases/tag/breeze-runtime-2026.08.1)
- Runtime ZIP：`breeze-runtime-win-x64-cpu-2026.08.1.zip`
- Runtime SHA-256：`724e8bcb45c7a1373e1d1eca0e413897354326a4fae207948e72ec529bb8bf4b`
- Runtime 大小：286,785,161 bytes
- Runtime 內容：Python 3.11.15、PyTorch `2.4.1+cpu`、MediaTek patched Whisper；CPU-only，不含 CUDA
- 安裝位置：`%LOCALAPPDATA%\Offline Subtitle Factory\runtimes\breeze-asr-25\2026.08.1`

## 主要變更

- Breeze managed runtime 下載、SHA／大小驗證、安全解壓、Windows DLL-aware capability probe、atomic activation、取消與失敗清理。
- 下載完成後立即刷新 readiness，不需要重新啟動 App。
- Breeze checkpoint 約 2.88 GiB 仍由 App 個別下載，不放入 App 安裝包或 runtime ZIP。
- 內建 Whisper.cpp Tiny／Base／Small 維持原有路徑與預設行為，不受 managed runtime 影響。
- 正式 manifest 固定 Windows x64 CPU runtime 的來源 URL、版本、大小、解壓大小與 SHA-256。

## Windows 安裝

提供 x64 NSIS Setup 與 Portable 版本。安裝包為未簽章測試／公開交付版本，Windows 可能顯示 Unknown Publisher 或 SmartScreen 警告；請先以 Release 提供的 SHA-256 清單核對檔案。

首次使用 Breeze 時，請保持網路連線以取得獨立 runtime 與模型；下載完成後可在 App 內重新檢查 runtime 狀態。若不使用 Breeze，選回「內建 Whisper.cpp」即可完全離線轉錄。

## 驗證狀態

- Windows runtime 真實 build、ZIP integrity、大小／SHA、公開 Release HTTP Content-Length 與下載 hash 已核對。
- 受控 clean profile 在 PATH 僅含 `C:\Windows\System32` 且沒有 `git`、`node`、`python`、`py` 的條件下完成 API 安裝與 managed probe。
- 已完成真實 Breeze App `/api/jobs` 轉錄與 renderer readiness 驗證。
- `npm run check`、`npm run docs:check:final`、focused runtime／ASR／core tests 通過。

## 已知限制

- Windows App 與 runtime payload 未使用 Authenticode 簽章；可能觸發 SmartScreen。
- 本版未宣稱 pristine Windows VM、完整 packaged Electron 實機矩陣、macOS managed runtime、台灣華語品質、長音訊效能或 GPU 驗收已完成。
- `runtime-license-review.json` 是 engineering evidence，不是法律意見；部分 transitive package license metadata 仍需逐項 review。
- Breeze runtime 與模型需要較大的磁碟空間，CPU 模式可能較慢；模型品質仍須人工逐段校閱。

