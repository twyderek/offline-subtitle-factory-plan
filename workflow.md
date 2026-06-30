# 離線字幕生成工作流

## 1. 建立任務

使用者在前台頁面建立字幕任務：

- 上傳影片檔。
- 上傳規則檔 `rule.txt`。
- 可選：上傳術語表、既有 SRT、參考文件。
- 填寫字幕生成需求說明。

系統建立任務資料夾：

```text
workspace/jobs/{jobId}/
  input/
  working/
  review-output/
  output/
  logs/
  job-config.json
  job-status.json
```

## 2. 任務預檢

檢查項目：

- 影片是否可讀。
- 是否有音軌。
- 影片長度、解析度、格式。
- rule 檔是否存在。
- rule 檔是否為 UTF-8。
- Node.js 是否可用。
- FFmpeg 是否可用。
- Python / ASR 工具是否可用。
- 本機模型是否存在。

若缺少工具，顯示缺少項目與建議安裝指令。

## 3. 字幕生成

處理順序：

1. 使用 FFmpeg 抽取音訊。
2. 使用本機 ASR 產生 `draft.srt`。
3. 套用使用者提供的 rule 檔。
4. 產生 `rule-cleaned.srt`。
5. 產生校正報告與術語表。
6. 更新任務狀態。

## 4. 進度與效能顯示

前台需顯示：

- 目前階段。
- 百分比。
- 已耗時。
- 預估剩餘時間。
- 影片長度。
- 轉錄速度，例如 `1.3x realtime`。
- CPU / RAM / GPU 使用狀態。
- 即時 log。

## 5. 完成後進入校閱

字幕生成完成後，自動導向：

```text
src/subtitle-editor.html?jobId={jobId}
```

校閱頁自動載入：

- `input/media.mp4`
- `working/rule-cleaned.srt`
- `working/correction-report.md`
- `working/terminology.tsv`
- `job-config.json`

## 6. 校閱與輸出

沿用既有兩階段校稿流程：

1. 第一階段：字幕校稿與時間調整。
2. 第二階段：燒錄字幕樣式設定。
3. 儲存校稿包。
4. 產生短樣片。
5. 確認後產生正式燒字幕影片。
