# Breeze ASR 25 實驗性轉錄

本分支新增 MediaTek Research Breeze ASR 25 選項，目標是改善台灣華語、中英混用與字幕時間對齊。這是選用功能；內建 Whisper.cpp Tiny／Base／Small 仍是預設，不受影響。

## 目前支援範圍

- App 可從固定官方 revision 下載 `breeze-asr-25.pt` 至使用者模型快取。
- 下載前需人工確認；下載使用暫存檔，完成後驗證 3,087,008,569 bytes 與 SHA-256 `9c94a3554ff4f0de83494e2ed7ba5826efa74bd87955c034b4d0fd681746b690`。
- App 只在 managed 或外部 Python 的 `whisper.available_models()` 確實包含 `breeze-asr-25` 時啟動推論。
- 轉錄沿用既有 16 kHz 音訊準備、取消、SRT 時間碼清理、繁體規則與人工校閱。

Windows CPU managed runtime 不放進 Electron 安裝包；目前固定 manifest 指向獨立的 `breeze-runtime-2026.08.1` Release asset，下載後才寫入 `%LOCALAPPDATA%\\Offline Subtitle Factory\\runtimes\\breeze-asr-25\\<runtime-version>`。模型快取與 runtime cache 分開。若日後 manifest 無法通過固定 HTTPS／大小／SHA 驗證，App 會 fail closed，並保留下方的外部 developer mode。

## 第一次選擇 Breeze

首頁選取 `Breeze ASR 25` 後，App 會立即檢查模型與 runtime；模型缺失時開啟固定官方版本的模型下載對話框，下載完成並通過大小／SHA-256 驗證後，若 managed runtime 尚未安裝會顯示一次性安裝按鈕。managed 流程是下載 → SHA-256／大小驗證 → temporary extraction → capability probe → atomic activation；完成後立即可使用，不需要重新啟動 App。若 runtime release asset 尚未發布，畫面會明確顯示原因並可展開「使用外部 Breeze Runtime（開發者）」。一般 Windows 使用者不需要操作 `git clone`、`pip install`、PowerShell 或 `BREEZE_ASR_PYTHON`。

## Windows managed runtime

第一版只提供 Windows x64 CPU runtime（Python 3.11.15、PyTorch `2.4.1+cpu`）。App 不修改系統 Python、PATH、PYTHONPATH 或 Registry；managed runtime 與模型都放在使用者可寫入的 cache。下載前會估算 ZIP、解壓與暫存所需空間；下載取消、逾時、大小／SHA 不符、Zip Slip、解壓失敗或 probe 失敗都會清除本輪暫存，不刪除既有可用 runtime。staging 會使用短 sibling path，避免 Windows 原生 DLL 在長 `%LOCALAPPDATA%` 路徑下無法載入。

API：

- `GET /api/breeze-runtime`：回傳 `not-installed`／`downloading`／`verifying`／`installing`／`installed`／`invalid` 等狀態。
- `POST /api/breeze-runtime/download`：啟動下載、驗證、解壓、probe 與原子啟用；同一時間只允許一個安裝工作。
- `DELETE /api/breeze-runtime/download`：取消並清除未完成檔案。
- `DELETE /api/breeze-runtime`：移除 managed runtime，不影響模型或 Whisper.cpp。
- `POST /api/breeze-runtime/recheck`：重新執行 capability probe。

runtime discovery 順序為：`BREEZE_ASR_PYTHON`（developer override）→ managed runtime → legacy `~/Breeze-ASR-25/.venv` → bundled runtime → system Python。既有 legacy runtime 仍支援，但產品 UI 將 managed runtime 放在一般使用者主流程。

## 外部 runtime（進階／開發者模式）

建議使用獨立 Python 3.8–3.11 virtual environment：

```bash
BREEZE_REPO="$HOME/Breeze-ASR-25"
git clone --recurse-submodules https://github.com/mtkresearch/Breeze-ASR-25.git "$BREEZE_REPO"
PYTHON_BIN="$(command -v python3.11 || true)"
test -n "$PYTHON_BIN" || { echo "需要 Python 3.11（Python 3.8–3.11 皆可，請調整 PYTHON_BIN）" >&2; exit 1; }
"$PYTHON_BIN" -m venv "$BREEZE_REPO/.venv"
"$BREEZE_REPO/.venv/bin/python" -m pip install --upgrade pip
"$BREEZE_REPO/.venv/bin/python" -m pip install "$BREEZE_REPO/third_party/whisper-patch-breeze"
"$BREEZE_REPO/.venv/bin/python" -c "import whisper; assert 'breeze-asr-25' in whisper.available_models()"
```

Windows PowerShell：

```powershell
$BreezeRepo = Join-Path $HOME 'Breeze-ASR-25'
git clone --recurse-submodules https://github.com/mtkresearch/Breeze-ASR-25.git $BreezeRepo
py -3.11 -m venv (Join-Path $BreezeRepo '.venv')
$BreezePython = Join-Path $BreezeRepo '.venv\Scripts\python.exe'
& $BreezePython -m pip install --upgrade pip
& $BreezePython -m pip install (Join-Path $BreezeRepo 'third_party\whisper-patch-breeze')
& $BreezePython -c "import whisper; assert 'breeze-asr-25' in whisper.available_models()"
```

上面的 `--recurse-submodules` 不可省略，因官方 `third_party/whisper-patch-breeze` 是 git submodule。PyTorch 是否能使用 CUDA 取決於安裝方式與電腦驅動；沒有 CUDA 時會使用 CPU，2B 參數模型可能非常慢且需要大量記憶體。

啟動 App 前將 Python 路徑設為 `BREEZE_ASR_PYTHON`。開發版必須在本專案 `offline-subtitle-factory-app` 目錄執行：

```bash
BREEZE_ASR_PYTHON="$HOME/Breeze-ASR-25/.venv/bin/python" npm start
```

macOS 已安裝 App（預設 `/Applications` 路徑）：

```bash
BREEZE_ASR_PYTHON="$HOME/Breeze-ASR-25/.venv/bin/python" "/Applications/離線字幕工廠.app/Contents/MacOS/離線字幕工廠"
```

Windows 開發版必須在本專案 `offline-subtitle-factory-app` 目錄執行：

```powershell
$env:BREEZE_ASR_PYTHON = (Join-Path $HOME 'Breeze-ASR-25\.venv\Scripts\python.exe')
npm start
```

Windows 已安裝 App（NSIS 預設路徑）：

```powershell
$env:BREEZE_ASR_PYTHON = (Join-Path $HOME 'Breeze-ASR-25\.venv\Scripts\python.exe')
& (Join-Path $env:LOCALAPPDATA 'Programs\離線字幕工廠\離線字幕工廠.exe')
```

若安裝位置自訂，只替換最後一行的 App executable 路徑；不要在 Breeze 官方 repo 內執行 `npm start`。完成啟動後回到 App 按「重新檢查 runtime」。

未設定環境變數時，App 會依序嘗試 managed runtime、legacy Breeze venv、bundled Python 與系統 `python3`／`python`，但每一個候選仍必須通過模型能力探針。

## 外部驗收前檢查

安裝 runtime 或下載模型前，可先用只讀探針確認目前環境：

```bash
BREEZE_ASR_MODEL_DIR=/absolute/path/to/breeze-asr \\
BREEZE_ASR_PYTHON=/absolute/path/Breeze-ASR-25/.venv/bin/python \\
npm run probe:breeze -- --json
```

探針會輸出固定 revision／檔名／大小／SHA、模型快取狀態、`whisper.available_models()` 結果、runtime stderr 與耗時；runtime 缺失、模型缺失、SHA 不符或 probe timeout 時以非零狀態結束。它不會執行 `pip`、下載檔案或啟動字幕任務。

## 安全與回復

- App 不接受任意模型 URL、檔名、大小或 SHA。
- 模型未完成驗證、runtime 不相容或推論失敗時，任務不會標記成功。
- 若不使用 Breeze，將 ASR 模型選回「內建 Whisper.cpp」即可；可刪除 App 顯示的 Breeze 模型快取以回收約 3 GB 空間。
- Windows managed runtime Release、engineering license／third-party notices evidence、strict clean-profile 安裝、真實 Breeze JFK sample 與 App `/api/jobs` 短片流程已完成驗證；`runtime-license-review.json` 仍有部分 transitive package metadata 缺少明確 license 欄位，不等同法律意見。仍未完成台灣華語品質、長音訊效能、GPU 與 macOS managed runtime 驗收。本地 deterministic tests 不取代上述尚未完成的品質與跨平台驗收。

## Mac Air 效能發布依據（需求方實機回報）

- 環境：MacBook Air `Mac15,12`、Apple M3、8 GB RAM、8 cores、macOS `26.5.2`（Build `25F84`）。
- Breeze ASR 25 對約 1 小時 46 分鐘影片耗時約 6 小時，約為影片長度的 `3.4×`；這是單一低資源 Mac Air 的 CPU／runtime 觀察，不是跨機型保證。
- 未保存 profiler、原始音訊或完整逐段 telemetry，因此不能據此推導品質、溫度、記憶體峰值或其他硬體效能。需要較快結果時，請改用內建 Whisper.cpp；Breeze 的「快速」模式僅是參數選擇，不保證達到即時或固定倍率。

## 官方來源

- 模型與授權：<https://huggingface.co/MediaTek-Research/Breeze-ASR-25>
- 官方程式與 patched Whisper 安裝方式：<https://github.com/mtkresearch/Breeze-ASR-25>
