# 第三方元件與授權說明

離線字幕工廠 0.30.0 預覽版發行包包含以下第三方元件：

## Electron

- 專案：https://www.electronjs.org/
- 授權：MIT License

## FFmpeg 8.1.2 Essentials Build

- 上游：https://ffmpeg.org/
- Windows build：https://www.gyan.dev/ffmpeg/builds/
- macOS arm64 build：https://ffmpeg.martin-riedl.de/
- 授權：依發行包所附授權條款；Windows 版內容位於 `tools/ffmpeg/LICENSE`，macOS 版內容位於 `tools/ffmpeg/LICENSE-macos`。

## whisper.cpp 1.9.1

- 專案：https://github.com/ggml-org/whisper.cpp
- 發行包：https://github.com/ggml-org/whisper.cpp/releases/tag/v1.9.1
- 授權：MIT License
- Copyright (c) 2023-2026 The ggml authors

## Whisper ggml-tiny 多語模型

- 模型來源：https://huggingface.co/ggerganov/whisper.cpp
- 原始模型：https://github.com/openai/whisper
- 模型用途：安裝後可立即進行本機離線轉錄，不需另行下載。

## Busboy

- 專案：https://github.com/mscdex/busboy
- 授權：MIT License

## Breeze ASR 25 managed runtime（獨立 Release asset，不納入目前安裝包）

- 上游程式：https://github.com/mtkresearch/Breeze-ASR-25
- 模型：https://huggingface.co/MediaTek-Research/Breeze-ASR-25
- 可能隨 runtime release 一起散布的元件：Python 3.11、MediaTek patched Whisper、PyTorch CPU 及其 transitive dependencies。
- 狀態：runtime `2026.08.1` 已以獨立 GitHub Release asset 發布；Python／PyTorch／patched Whisper 仍沒有放入 Electron Setup／Portable。asset 內附 `runtime-license-review.json`、`THIRD-PARTY-NOTICES.txt` 與 source license files；這是 engineering evidence，不等同法律意見。部分 transitive package metadata 沒有明確 license 欄位，仍需後續逐項法務／再散布確認。
- 發布證據：<https://github.com/twyderek/offline-subtitle-factory-app/releases/tag/breeze-runtime-2026.08.1>；runtime ZIP 的實際版本、來源、license evidence、大小與 SHA-256 以固定 manifest 及 Release checksum 為準。
- 持續門檻：若後續逐項 review 發現任一依賴不允許再散布，必須停止更新該 runtime asset 並發布修正版／撤回導流；不得把 engineering evidence 改寫成完整法律核准。

本軟體不會將使用者的影片、音訊或字幕上傳到上述第三方服務。
