# 本機 API 草案

## 建立任務

```http
POST /api/jobs
Content-Type: multipart/form-data
```

欄位：

- `video`
- `ruleFile`
- `glossaryFile`
- `existingSrt`
- `requirements`
- `language`
- `asrEngine`
- `modelName`
- `outputFormats`

回傳：

```json
{
  "jobId": "20260630-001",
  "folder": "workspace/jobs/20260630-001"
}
```

## 開始任務

```http
POST /api/jobs/{jobId}/start
```

## 查詢任務狀態

```http
GET /api/jobs/{jobId}/status
```

回傳：

```json
{
  "jobId": "20260630-001",
  "status": "running",
  "stage": "transcribing",
  "progress": 42,
  "message": "正在自動轉錄音訊",
  "logs": [
    "檢查 FFmpeg 完成",
    "音訊抽取完成",
    "開始 ASR 轉錄"
  ]
}
```

## 取得任務檔案

```http
GET /api/jobs/{jobId}/files
```

回傳：

```json
{
  "video": "workspace/jobs/20260630-001/input/media.mp4",
  "draftSrt": "workspace/jobs/20260630-001/working/draft.srt",
  "cleanedSrt": "workspace/jobs/20260630-001/working/rule-cleaned.srt",
  "report": "workspace/jobs/20260630-001/working/correction-report.md"
}
```

## 中止任務

```http
POST /api/jobs/{jobId}/cancel
```

## 進入校稿頁

```text
src/subtitle-editor.html?jobId=20260630-001
```

校稿頁需要支援：

- 依 `jobId` 讀取影片與字幕。
- 儲存校稿包到該 job 的 `review-output/`。
