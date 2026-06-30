# 安裝指南

## 最簡單方式

1. 下載或 clone 專案
2. 雙擊 `setup-local-tools.bat`
3. 雙擊 `start-offline-subtitle-factory.bat`
4. 開啟 `http://127.0.0.1:8790`

## Git Clone

```powershell
git clone https://github.com/twyderek/offline-subtitle-factory-plan.git
cd offline-subtitle-factory-plan
.\setup-local-tools.bat
.\start-offline-subtitle-factory.bat
```

## 工具安裝位置

所有工具會安裝到：

```text
app/tools/
```

不需要另外手動安裝 Node.js、FFmpeg 或 Whisper。

唯一例外：若電腦完全沒有 Python，請先安裝 Python：

```powershell
winget install Python.Python.3.11
```

然後重新執行：

```powershell
.\setup-local-tools.bat
```

## 驗證

啟動後開啟：

```text
http://127.0.0.1:8790/api/health
```

應看到：

```json
{
  "tools": {
    "node": true,
    "ffmpeg": true,
    "python": true,
    "whisper": true
  }
}
```
