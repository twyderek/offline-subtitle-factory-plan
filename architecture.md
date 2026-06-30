# 技術架構草案

## 架構原則

- Local-first：影片、字幕、規則檔與輸出都留在個人電腦。
- Job-based：每次字幕生成都是獨立任務。
- 可重跑：每個階段都留下中間檔與 log。
- 不阻塞 UI：長時間工作由背景 worker 執行。
- 與現有校稿頁解耦：前台負責產生字幕，校稿頁負責人工確認。

## 元件

```text
Frontend Dashboard
  -> upload video/rule
  -> create job
  -> show progress
  -> redirect to editor

Local Node Server
  -> file upload
  -> job state API
  -> static file serving
  -> range request video preview

Worker Runner
  -> ffmpeg audio extraction
  -> local ASR transcription
  -> subtitle rule cleanup
  -> QA report generation

Existing Subtitle Editor
  -> proofread
  -> adjust timing
  -> burn settings
  -> save review package
```

## 本機工具

必要：

- Node.js 20+
- FFmpeg
- Chrome / Edge

自動轉錄需要其一：

- Whisper Python
- faster-whisper
- whisper.cpp

可選：

- NVIDIA GPU / CUDA
- local model cache
- portable FFmpeg
- portable Node.js

## 任務狀態模型

```json
{
  "jobId": "20260630-001",
  "status": "running",
  "stage": "transcribing",
  "progress": 42,
  "message": "正在自動轉錄音訊",
  "startedAt": "2026-06-30T10:00:00+08:00",
  "updatedAt": "2026-06-30T10:03:12+08:00",
  "metrics": {
    "videoDuration": 1800,
    "elapsedSeconds": 192,
    "realtimeFactor": 1.8,
    "cpuPercent": 62,
    "memoryPercent": 71,
    "gpuPercent": null
  }
}
```

## 風險與處理

| 風險 | 處理 |
| --- | --- |
| 大影片上傳慢 | 優先使用本機檔案選取或 hard link |
| Windows UTF-8 顯示錯亂 | 以 UTF-8 讀寫檔，UI 不依賴 PowerShell 顯示 |
| ASR 模型不存在 | 預檢階段阻擋並提示下載 |
| 長任務中斷 | job-status 與 log 持續落盤 |
| 字幕時間重疊 | 校稿頁與 QA 報告提示 |
