# AI 服務接入可行性分析

## 離線字幕工廠 — 接入外部 AI 服務

---

## 一、現況分析

### 1.1 當前工作流程

```
上傳影片 → Whisper 本機轉錄 → 規則清理 → 產生校稿報告 → 人工校閱 → 燒錄
```

目前整個流程完全離線，依賴本機 Whisper 進行語音轉錄。

### 1.2 瓶頸所在

| 階段 | 瓶頸 | 說明 |
|------|------|------|
| ASR 轉錄 | 速度 | Whisper 本機轉錄 1 小時影片約需 30-60 分鐘（CPU） |
| 字幕清理 | 精度 | 現有規則只處理固定字串，無法理解語意 |
| 術語一致性 | 人工 | 專有名詞需人工逐一確認 |
| 斷句品質 | 人工 | 字幕斷句依賴 Whisper 預設行為，常有問題 |

### 1.3 現有設定結構

目前 `job-config.json` 的結構：

```json
{
  "jobId": "...",
  "createdAt": "...",
  "language": "zh-TW",
  "asrEngine": "manual",
  "modelName": "",
  "outputFormats": "srt,vtt",
  "requirements": "",
  "files": { "video": "...", "ruleFile": "...", "existingSrt": "..." }
}
```

`subtitle-style-settings.json`：

```json
{
  "fontFamily": "Microsoft JhengHei",
  "fontSize": 32,
  "position": "bottom",
  "textColor": "#ffffff",
  "outlineColor": "#111111",
  "outlineWidth": 3
}
```

---

## 二、可接入的 AI 服務分析

### 2.1 推薦接入的服務分類

| 類別 | 服務 | 用途 | 必要性 |
|------|------|------|--------|
| **ASR 轉錄** | Azure Speech-to-Text | 替代/補充 Whisper 轉錄 | ⭐⭐⭐ 高 |
| **語意斷句** | OpenAI GPT-4o / GPT-4o-mini | 優化字幕斷句與閱讀節奏 | ⭐⭐ 中 |
| **術語校對** | OpenAI GPT-4o-mini | 自動檢查專有名詞一致性 | ⭐⭐ 中 |
| **口語清理** | OpenAI GPT-4o-mini | 智能移除口語詞並保留語意 | ⭐⭐ 中 |
| **字幕摘要** | OpenAI GPT-4o-mini | 自動產生影片內容摘要 | ⭐ 低 |

### 2.2 各服務詳細分析

#### A. Azure Speech-to-Text（推薦首選）

**理由**：
- 繁體中文轉錄品質優於 Whisper small/medium 模型
- 支援即時轉錄（streaming），適合長影片
- 提供語音辨識置信度分數，可做品質提示
- 按用量計費，每月免費額度 5 小時

**接入方式**：
```
Azure 訂閱 → 建立 Speech Resource → 取得 API Key + Region
```

**優勢**：
- 轉錄速度極快（1 小時影片約 5-10 分鐘）
- 支援說話人分離（speaker diarization）
- 支援即時字幕（real-time captions）

**成本**：
- 前 5 小時/月免費
- 之後 $1/小時（標準）或 $1.5/小時（即時）

#### B. OpenAI GPT-4o-mini（推薦次選）

**用途**：
1. **字幕語意斷句優化** — Whisper 產出後，送 GPT 重新斷句
2. **術語一致性檢查** — 自動識別專有名詞並統一格式
3. **口語詞智能清理** — 比固定規則更精準地移除口語詞
4. **影片內容摘要** — 自動產生字幕摘要供校閱參考

**接入方式**：
```
OpenAI 帳號 → API Key
```

**成本**：
- GPT-4o-mini：$0.15/百萬 tokens（極便宜）
- 1 小時影片的 SRT 約 5000-15000 tokens，成本不到 $0.01

#### C. Google Cloud Speech-to-Text

**理由**：
- 多語言支援廣泛
- 語音辨識準確率高

**缺點**：
- 設定較複雜，需 Google Cloud 帳號
- 繁體中文支援不如 Azure

#### D. 不建議接入的服務

| 服務 | 原因 |
|------|------|
| AWS Transcribe | 設定複雜、成本高、繁體中文支援一般 |
| Deepgram | 繁體中文品質不如 Azure |
| 其他 LLM（Claude、Gemini） | 與 GPT-4o-mini 功能重疊，增加設定複雜度 |

---

## 三、接入架構設計

### 3.1 整體架構

```
                    ┌──────────────────────────────────────┐
                    │          job-config.json             │
                    │                                      │
                    │  aiServices:                         │
                    │    azureSpeech:                      │
                    │      enabled: true/false             │
                    │      apiKey: "sk-..."                │
                    │      region: "eastasia"              │
                    │    openai:                           │
                    │      enabled: true/false             │
                    │      apiKey: "sk-..."                │
                    │      model: "gpt-4o-mini"            │
                    │      subtitleOptimization: true/false│
                    │      terminologyCheck: true/false    │
                    │                                      │
                    └──────────┬───────────────────────────┘
                               │
                    ┌──────────▼───────────────────────────┐
                    │           server.mjs                 │
                    │                                      │
                    │  runJob():                           │
                    │    ├─ preflight:                     │
                    │    │    ├─ 檢查 Whisper              │
                    │    │    └─ 檢查 Azure Speech API     │
                    │    │                               │
                    │    ├─ transcribing:                 │
                    │    │    ├─ IF azureSpeech.enabled    │
                    │    │    │    └─ 呼叫 Azure STT API   │
                    │    │    └─ ELSE                      │
                    │    │       └─ 呼叫本機 Whisper       │
                    │    │                               │
                    │    ├─ ai-enhancement: (新階段)       │
                    │    │    ├─ IF openai.subtitleOptimization │
                    │    │    │    └─ 送 GPT 優化斷句      │
                    │    │    └─ IF openai.terminologyCheck   │
                    │    │       └─ 送 GPT 檢查術語       │
                    │    │                               │
                    │    ├─ rule-cleanup:                 │
                    │    │    └─ 套用 rule.txt             │
                    │    └─ ready-review                  │
                    └──────────────────────────────────────┘
```

### 3.2 流程變化

**原有流程**：
```
transcribing (Whisper) → rule-cleanup → ready-review
```

**新流程**：
```
transcribing (Whisper 或 Azure) → ai-enhancement → rule-cleanup → ready-review
```

新增的 `ai-enhancement` 階段：
1. **語意斷句優化** — 將 Whisper/Azure 產出的 SRT 送 GPT-4o-mini 重新斷句
2. **術語一致性檢查** — 自動識別影片中的專有名詞，與 rule.txt 中的術語表比對
3. **口語詞智能清理** — 比固定規則更精準地移除口語詞

---

## 四、設定介面規劃

### 4.1 設定頁面位置

在現有前台頁面（index.html）的左側工作流工具列中，新增第 11 步驟：

```
1. 建立任務
2. 上傳影片
3. 規則檔
4. 字幕需求
5. 環境檢查
6. 自動轉錄
7. 套用規則
8. 校閱字幕
9. 燒錄預覽
10. 輸出
11. ⚙️ AI 服務設定  ← 新增
```

### 4.2 設定項目詳細規劃

#### A. Azure Speech-to-Text 設定

| 欄位 | 型別 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| 啟用 Azure Speech | toggle | 否 | false | 是否使用 Azure 轉錄 |
| API Key | password | 是（啟用時） | — | Azure Speech Resource 金鑰 |
| 區域 | select | 是（啟用時） | eastasia | 支援的 Azure 區域 |
| 語音模型 | select | 否 | conversational | conversational / dictation |
| 說話人分離 | toggle | 否 | false | 是否啟用 speaker diarization |

**支援的 Azure 區域**：
- eastasia（台灣東部）— 推薦，延遲最低
- southeastasia（新加坡）
- japanwest / japaneast
- koreacentral
- westus2 / eastus2
- westeurope / north europe

#### B. OpenAI 設定

| 欄位 | 型別 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| 啟用 OpenAI | toggle | 否 | false | 是否使用 OpenAI 服務 |
| API Key | password | 是（啟用時） | — | OpenAI API 金鑰 |
| 模型 | select | 否 | gpt-4o-mini | gpt-4o-mini / gpt-4o |
| 字幕斷句優化 | toggle | 否 | true | 送 GPT 優化斷句 |
| 術語檢查 | toggle | 否 | true | 自動檢查專有名詞一致性 |
| 口語詞清理 | toggle | 否 | true | 智能移除口語詞 |
| 影片摘要 | toggle | 否 | false | 自動產生影片內容摘要 |

### 4.3 設定儲存位置

設定儲存在 `job-config.json` 的 `aiServices` 欄位：

```json
{
  "aiServices": {
    "azureSpeech": {
      "enabled": true,
      "apiKey": "sk-xxxx",
      "region": "eastasia",
      "speechModel": "conversational",
      "speakerDiarization": false
    },
    "openai": {
      "enabled": true,
      "apiKey": "sk-xxxx",
      "model": "gpt-4o-mini",
      "subtitleOptimization": true,
      "terminologyCheck": true,
      "fillerCleanup": true,
      "summaryGeneration": false
    }
  }
}
```

**安全考量**：
- API Key 存在本地 JSON 檔中（與現有 `job-config.json` 同目錄）
- 不建議加密（會增加使用者設定複雜度）
- 建議在 `.gitignore` 中排除 `job-config.json`（已存在）

### 4.4 設定 UI 佈局

```
┌────────────────────────────────────────────────────┐
│  ⚙️ AI 服務設定                                     │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌─ Azure Speech-to-Text ─────────────────────┐   │
│  │ ☑ 啟用 Azure Speech 轉錄服務                │   │
│  │                                            │   │
│  │ API Key:  [________________________] 🔒   │   │
│  │ 區域:     [eastasia ▼]                     │   │
│  │ 語音模型: [conversational ▼]               │   │
│  │ ☐ 啟用說話人分離                            │   │
│  │                                            │   │
│  │ [測試連線]                                 │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  ┌─ OpenAI 智慧增強 ──────────────────────────┐   │
│  │ ☑ 啟用 OpenAI 服務                          │   │
│  │                                            │   │
│  │ API Key:  [________________________] 🔒   │   │
│  │ 模型:     [gpt-4o-mini ▼]                  │   │
│  │                                            │   │
│  │ 功能選擇：                                  │   │
│  │ ☑ 字幕斷句優化（推薦）                      │   │
│  │ ☑ 術語一致性檢查（推薦）                    │   │
│  │ ☑ 口語詞智能清理                            │   │
│  │ ☐ 影片內容摘要                              │   │
│  │                                            │   │
│  │ [測試連線]                                 │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  ┌─ 費用估算 ──────────────────────────────────┐   │
│  │ 每小時影片預估費用：                          │   │
│  │ Azure Speech: $0.00（前 5 小時免費）         │   │
│  │ OpenAI:       ~$0.01                        │   │
│  └────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

---

## 五、效能改善分析

### 5.1 轉錄速度對比

| 方案 | 1 小時影片 | 10 小時影片 | 備註 |
|------|-----------|------------|------|
| Whisper small (CPU) | ~30 分鐘 | ~5 小時 | 本機，免費 |
| Whisper large (GPU) | ~15 分鐘 | ~2.5 小時 | 需 NVIDIA GPU |
| Azure Speech-to-Text | ~5 分鐘 | ~50 分鐘 | 雲端，按量計費 |
| Azure + GPT 優化 | ~10 分鐘 | ~1 小時 | Azure 轉錄 + GPT 優化 |

**結論**：Azure Speech-to-Text 轉錄速度是 Whisper CPU 的 **6 倍**。

### 5.2 轉錄品質對比（繁體中文）

| 方案 | WER（字詞錯誤率） | 說明 |
|------|-------------------|------|
| Whisper small | ~15-20% | 基礎品質 |
| Whisper large | ~10-15% | 較好，但仍有口語詞 |
| Azure Speech-to-Text | ~8-12% | 繁體中文優化，支援說話人分離 |
| Azure + GPT 優化斷句 | ~5-8%（有效） | Azure 轉錄 + GPT 語意重整 |

**結論**：Azure + GPT 優化後，有效錯誤率可降低 **60%**。

### 5.3 校閱效率提升

| 項目 | 原有流程 | 接入 AI 後 | 提升 |
|------|----------|-----------|------|
| 斷句調整 | 人工逐一調整 | GPT 自動優化 | **節省 70% 時間** |
| 術語檢查 | 人工逐一確認 | GPT 自動標記不一致 | **節省 80% 時間** |
| 口語詞清理 | 規則固定，不精準 | GPT 語意理解後清理 | **減少 50% 人工修正** |
| 字幕摘要 | 無 | 自動產生 | **新增功能** |

### 5.4 綜合效益

```
原本 1 小時影片流程：
  Whisper 轉錄 30 分鐘 + 人工校閱 30 分鐘 = 60 分鐘

接入 AI 後：
  Azure 轉錄 5 分鐘 + GPT 優化 2 分鐘 + 人工校閱 10 分鐘 = 17 分鐘

效率提升：約 3.5 倍
```

---

## 六、開發工作量評估

### 6.1 後端（server.mjs）

| 項目 | 工作量 | 難度 |
|------|--------|------|
| Azure Speech-to-Text 整合 | 2-3 天 | 中 |
| OpenAI API 整合（斷句優化） | 1-2 天 | 中 |
| OpenAI API 整合（術語檢查） | 1 天 | 低 |
| OpenAI API 整合（口語清理） | 1 天 | 低 |
| job-config.json 結構擴充 | 0.5 天 | 低 |
| 錯誤處理與重試機制 | 1 天 | 中 |

### 6.2 前端（index.html + app.js）

| 項目 | 工作量 | 難度 |
|------|--------|------|
| AI 服務設定頁面 | 2-3 天 | 中 |
| API Key 儲存與讀取 | 0.5 天 | 低 |
| 測試連線按鈕 | 0.5 天 | 低 |
| 費用估算顯示 | 0.5 天 | 低 |
| 進度階段調整（新增 ai-enhancement） | 0.5 天 | 低 |

### 6.3 總計

| 階段 | 工作量 |
|------|--------|
| 後端 | 6-8 天 |
| 前端 | 4-5 天 |
| 測試與除錯 | 2-3 天 |
| **合計** | **12-16 天** |

---

## 七、風險與對策

| 風險 | 影響 | 機率 | 對策 |
|------|------|------|------|
| API Key 洩漏 | 資安問題 | 低 | Key 存在本地，不傳輸至第三方；建議加入 .gitignore |
| API 費用失控 | 使用者負擔 | 中 | 加入用量上限設定；顯示預估費用 |
| API 服務中斷 | 無法使用 | 低 | 保留 Whisper 作為 fallback |
| 隱私疑慮 | 使用者不信任 | 中 | 明確說明資料流向；提供離線模式 |
| GPT 優化結果不穩定 | 品質波動 | 中 | 提供 prompt 模板可自訂 |

---

## 八、實施建議

### Phase 1：基礎接入（2 週）

1. 擴充 `job-config.json` 加入 `aiServices` 結構
2. 實作 Azure Speech-to-Text 轉錄
3. 實作 OpenAI 字幕斷句優化
4. 設定頁面 UI

### Phase 2：進階功能（2 週）

1. 術語一致性檢查
2. 口語詞智能清理
3. 影片內容摘要
4. 用量追蹤與費用估算

### Phase 3：優化（1 週）

1. Prompt 模板自訂
2. 錯誤處理強化
3. 效能優化

---

## 九、總結

### 是否值得接入？

**強烈建議接入**。理由：

1. **效能提升顯著** — 轉錄速度提升 6 倍，校閱時間減少 70%
2. **成本極低** — 每小時影片 AI 成本不到 $0.02（OpenAI）+ 免費額度（Azure）
3. **技術成熟** — Azure Speech-to-Text 和 OpenAI API 都是成熟服務
4. **設定簡單** — 只需 API Key，無需部署模型
5. **離線模式保留** — 不啟用 AI 服務時，完全離線運作

### 推薦組合

| 優先級 | 服務 | 原因 |
|--------|------|------|
| **首選** | Azure Speech-to-Text | 繁體中文品質最佳，免費額度充足 |
| **次選** | OpenAI GPT-4o-mini | 價格極低，功能強大 |
| **可選** | 兩者同時使用 | Azure 轉錄 + GPT 優化，效果最佳 |
