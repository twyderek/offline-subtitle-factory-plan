# AI 服務接入 — Phase 2 開發計畫

## 離線字幕工廠 v2.0

---

## 一、Phase 2 目標

在 Phase 1（基礎 Azure 轉錄 + GPT 斷句優化）完成的前提下，Phase 2 的目標是：

1. **術語一致性檢查** — 自動識別影片中的專有名詞，與 rule.txt 比對後標記不一致處
2. **口語詞智能清理** — 用 GPT 取代固定規則，更精準地移除口語詞
3. **影片內容摘要** — 自動產生字幕摘要供校閱參考
4. **用量追蹤與費用估算** — 顯示每筆任務的 API 使用量與預估費用

**總工時**：約 8-10 天  
**與 Phase 1 的關係**：Phase 2 是 Phase 1 的延伸，共用相同的 `aiServices` 設定結構與 `ai-enhancement` 階段框架。

---

## 二、開發時程總覽

### 2.1 時間軸（以 10 個工作天計）

```
Week 1                          Week 2
Mon    Tue    Wed    Thu    Fri
│      │      │      │      │
▼      ▼      ▼      ▼      ▼
Task 1  Task 2  Task 3  Task 4  Task 5
(後端)  (後端)  (後端)  (前端)  (前端)

                        Mon    Tue    Wed    Thu    Fri
                        │      │      │      │      │
                        ▼      ▼      ▼      ▼      ▼
                      Task 6  Task 7  Task 8  Task 9  Task 10
                     (整合)  (測試)  (測試)  (測試)  (文件)
```

### 2.2 每日工時分配

| 日 | 上午（4h） | 下午（4h） |
|----|-----------|-----------|
| Day 1 | 術語檢查後端 | 術語檢查後端 |
| Day 2 | 口語清理後端 | 口語清理後端 |
| Day 3 | 影片摘要後端 | 用量追蹤後端 |
| Day 4 | AI 設定頁面 UI | API Key 儲存邏輯 |
| Day 5 | 測試連線按鈕 | 費用估算顯示 |
| Day 6 | 整合測試（術語+口語） | 整合測試（摘要+用量） |
| Day 7 | 錯誤處理與重試 | Edge case 測試 |
| Day 8 | 前端 UI 微調 | 整體流程測試 |
| Day 9 | 文件更新 | 程式碼審查 |
| Day 10 | 打包測試 | 最終驗收 |

---

## 三、待辦事項清單

### 3.1 後端開發（server.mjs）

#### Task 2.1-1：術語一致性檢查 API 整合

- [ ] **2.1-1.1** 建立 `aiServices.terminologyCheck` 的 prompt 模板
  - 輸入：draft.srt 內容 + rule.txt 中的術語表
  - 輸出：JSON 格式，包含每個術語的出現位置、建議修正、置信度
  - 範例 prompt：
    ```
    你是一位專業的字幕校對助手。請檢查以下字幕中的專有名詞是否一致。
    
    已知的專有名詞列表：
    {terminologyList}
    
    字幕內容：
    {subtitleContent}
    
    請以 JSON 格式回傳：
    {
      "terms": [
        {
          "term": "專有名詞",
          "occurrences": [
            {"text": "出現的文字", "lineIndex": 5, "suggestedCorrection": "建議修正"}
          ],
          "inconsistencies": ["不一致的用法說明"]
        }
      ],
      "summary": "整體報告摘要"
    }
    ```

- [ ] **2.1-1.2** 建立 `extractTerminologyFromRule()` 函式
  - 從 rule.txt 中解析 NORMALIZE_TERM 規則，提取術語列表
  - 回傳格式：`[{ term: "Whisper", canonical: "WHISPER" }, ...]`

- [ ] **2.1-1.3** 建立 `callOpenAITerminologyCheck()` 函式
  - 使用 `fetch()` 呼叫 OpenAI Chat Completions API
  - 參數：model=gpt-4o-mini, temperature=0.3
  - 加入超時處理（30 秒）
  - 加入重試機制（最多 2 次）

- [ ] **2.1-1.4** 建立 `parseTerminologyResponse()` 函式
  - 解析 GPT 回傳的 JSON
  - 將結果寫入 `job-status.json` 的 `aiMetrics.terminologyReport`
  - 若解析失敗，記錄 log 但不中斷流程

- [ ] **2.1-1.5** 在 `runJob()` 的 `ai-enhancement` 階段中整合
  - 檢查 `job.config.aiServices.openai.enabled`
  - 檢查 `job.config.aiServices.openai.terminologyCheck`
  - 若都為 true，呼叫術語檢查
  - 將結果寫入 `working/terminology-report.json`

- [ ] **2.1-1.6** 更新 `buildCorrectionReport()` 加入術語檢查結果
  - 新增「## 術語一致性檢查」區塊
  - 列出發現的不一致項與建議修正

**預估工時**：2 天

---

#### Task 2.1-2：口語詞智能清理 API 整合

- [ ] **2.1-2.1** 建立 `aiServices.fillerCleanup` 的 prompt 模板
  - 輸入：draft.srt 中每段字幕文字
  - 輸出：清理後的文字（保留語意，移除口語詞）
  - 範例 prompt：
    ```
    你是一位專業的字幕編輯助手。請幫我将以下字幕中的口語詞移除，
    但必須保留原意且讓句子通順自然。
    
    口語詞包括：呃、啊、嗯、那個、就是、然後、這個、你知道吧、對吧
    
    原始字幕：{originalText}
    
    請只回傳清理後的字幕文字，不要其他說明。
    ```

- [ ] **2.1-2.2** 建立 `callOpenAIFillerCleanup()` 函式
  - 逐段處理 SRT（避免單次請求過長）
  - 每批次最多 20 段字幕
  - 使用 `fetch()` 呼叫 OpenAI API
  - 加入批次處理的進度回報（每 20 段更新一次 job-status）

- [ ] **2.1-2.3** 建立 `compareFillerCleanup()` 函式
  - 比對清理前後差異，記錄哪些段落被修改
  - 統計修改次數、保留次數
  - 寫入 `aiMetrics.fillerCleanupReport`

- [ ] **2.1-2.4** 在 `runJob()` 的 `ai-enhancement` 階段中整合
  - 檢查 `job.config.aiServices.openai.fillerCleanup`
  - 若為 true，在 Whisper/Azure 轉錄後、rule-cleanup 前執行
  - 清理後的字幕作為 rule-cleanup 的輸入

- [ ] **2.1-2.5** 加入 fallback 機制
  - 若 GPT 呼叫失敗，回退到原有的固定規則清理
  - 記錄 log：`AI 口語清理失敗，使用預設規則`

**預估工時**：2 天

---

#### Task 2.1-3：影片內容摘要 API 整合

- [ ] **2.1-3.1** 建立 `aiServices.summaryGeneration` 的 prompt 模板
  - 輸入：cleaned SRT 全文
  - 輸出：50-200 字的內容摘要
  - 範例 prompt：
    ```
    你是一位專業的影片內容摘要助手。請根據以下字幕內容，
    產生一段 50-200 字的摘要，涵蓋主要論點與重點。
    
    字幕內容：
    {subtitleContent}
    
    請以繁體中文回傳摘要，不要其他說明。
    ```

- [ ] **2.1-3.2** 建立 `callOpenAISummary()` 函式
  - 若 SRT 過長（>5000 tokens），先截取前 5000 tokens
  - 使用 `fetch()` 呼叫 OpenAI API
  - 加入超時處理（15 秒）

- [ ] **2.1-3.3** 將摘要寫入 `working/content-summary.md`
  - 格式：
    ```markdown
    ## 影片內容摘要
    
    {generated summary}
    
    ---
    - 產生時間：{timestamp}
    - 使用模型：{model}
    - 字幕段落數：{cueCount}
    ```

- [ ] **2.1-3.4** 在 `runJob()` 的 `ai-enhancement` 階段中整合
  - 檢查 `job.config.aiServices.openai.summaryGeneration`
  - 若為 true，在所有 AI 處理完成後執行

**預估工時**：1 天

---

#### Task 2.1-4：用量追蹤與費用估算

- [ ] **2.1-4.1** 建立 `trackUsage()` 函式
  - 記錄每次 API 呼叫的：
    - 服務名稱（azure-speech / openai）
    - 模型名稱
    - 輸入 tokens / 輸出 tokens
    - 耗時（秒）
    - 是否成功
  - 寫入 `job-status.json` 的 `aiUsage` 欄位

- [ ] **2.1-4.2** 建立 `estimateCost()` 函式
  - Azure Speech-to-Text：$0.00/小時（前 5 小時免費）或 $0.0167/分鐘
  - OpenAI GPT-4o-mini：$0.15/百萬 input tokens + $0.60/百萬 output tokens
  - 回傳格式：
    ```json
    {
      "azureSpeech": { "costUSD": 0.00, "minutes": 5.2 },
      "openai": { "costUSD": 0.008, "inputTokens": 2500, "outputTokens": 800 }
    }
    ```

- [ ] **2.1-4.3** 在 `runJob()` 完成時寫入 `aiUsage` 到 `job-status.json`
  - 欄位結構：
    ```json
    {
      "aiUsage": {
        "azureSpeech": { "enabled": true, "minutes": 5.2, "costUSD": 0.00 },
        "openai": {
          "enabled": true,
          "calls": [
            { "endpoint": "terminology-check", "inputTokens": 1200, "outputTokens": 400, "costUSD": 0.0003 },
            { "endpoint": "filler-cleanup", "inputTokens": 2500, "outputTokens": 2200, "costUSD": 0.0012 },
            { "endpoint": "summary", "inputTokens": 3000, "outputTokens": 150, "costUSD": 0.0005 }
          ],
          "totalCostUSD": 0.002
        }
      }
    }
    ```

**預估工時**：1 天

---

### 3.2 前端開發（index.html + app.js）

#### Task 2.2-1：AI 服務設定頁面

- [ ] **2.2-1.1** 在 `index.html` 左側工作流工具列新增第 11 步驟
  - 按鈕文字：「⚙️ AI 服務設定」
  - data-step="ai-settings"
  - 排在「10 輸出」之後

- [ ] **2.2-1.2** 建立 AI 設定區塊（放在主內容區）
  - 區塊 ID：`ai-settings`
  - 包含兩個卡片：
    1. Azure Speech-to-Text 設定卡片
    2. OpenAI 智慧增強設定卡片
  
  Azure 卡片內容：
  ```
  ┌─ Azure Speech-to-Text ─────────────────────┐
  │ ☑ 啟用 Azure Speech 轉錄服務                │
  │                                             │
  │ API Key:  [________________________] 🔒   │
  │ 區域:     [eastasia ▼]                     │
  │ 語音模型: [conversational ▼]               │
  │ ☐ 啟用說話人分離                            │
  │                                             │
  │ [測試連線] [儲存設定]                       │
  └────────────────────────────────────────────┘
  ```
  
  OpenAI 卡片內容：
  ```
  ┌─ OpenAI 智慧增強 ──────────────────────────┐
  │ ☑ 啟用 OpenAI 服務                          │
  │                                             │
  │ API Key:  [________________________] 🔒   │
  │ 模型:     [gpt-4o-mini ▼]                  │
  │                                             │
  │ 功能選擇：                                  │
  │ ☑ 字幕斷句優化（推薦）                      │
  │ ☑ 術語一致性檢查（推薦）                    │
  │ ☑ 口語詞智能清理                            │
  │ ☐ 影片內容摘要                              │
  │                                             │
  │ [測試連線] [儲存設定]                       │
  └────────────────────────────────────────────┘
  ```

- [ ] **2.2-1.3** 建立費用估算區塊
  - 位置：AI 設定卡片下方
  - 內容：
    ```
    ┌─ 費用估算 ──────────────────────────────────┐
    │ 每小時影片預估費用：                          │
    │ Azure Speech: $0.00（前 5 小時免費）         │
    │ OpenAI:       ~$0.01                        │
    │                                             │
    │ 💡 提示：API Key 僅儲存於本機，不會傳輸至第三方 │
    └────────────────────────────────────────────┘
    ```

**預估工時**：2 天

---

#### Task 2.2-2：API Key 儲存與讀取

- [ ] **2.2-2.1** 建立 `saveAiSettings()` 函式（app.js）
  - 讀取設定頁面的表單值
  - 寫入 `job-config.json` 的 `aiServices` 欄位
  - 透過 `POST /api/jobs/:id/settings` 送出

- [ ] **2.2-2.2** 建立 `loadAiSettings()` 函式（app.js）
  - 讀取 `job-config.json` 的 `aiServices` 欄位
  - 填充設定頁面的表單值
  - 頁面載入時自動呼叫

- [ ] **2.2-2.3** 建立 `POST /api/jobs/:id/settings` 端點（server.mjs）
  - 接收 payload：`{ aiServices: { azureSpeech: {...}, openai: {...} } }`
  - 寫入 `job-config.json`
  - 回傳 200 OK

- [ ] **2.2-2.4** 建立 `GET /api/jobs/:id/settings` 端點（server.mjs）
  - 回傳 `job-config.json` 中的 `aiServices` 欄位
  - 若不存在，回傳預設值

**預估工時**：1 天

---

#### Task 2.2-3：測試連線按鈕

- [ ] **2.2-3.1** 建立 `testAzureConnection()` 函式（app.js）
  - 讀取 API Key 與 Region
  - 呼叫 Azure Speech REST API（簡易測試端點）
  - 顯示結果：成功/失敗 + 錯誤訊息

- [ ] **2.2-3.2** 建立 `testOpenAIConnection()` 函式（app.js）
  - 讀取 API Key 與 Model
  - 呼叫 OpenAI `/v1/chat/completions`（簡易測試：發送 1 token 請求）
  - 顯示結果：成功/失敗 + 錯誤訊息

- [ ] **2.2-3.3** 建立後端測試端點（server.mjs）
  - `POST /api/ai/test-azure` — 驗證 Azure API Key 與 Region
  - `POST /api/ai/test-openai` — 驗證 OpenAI API Key
  - 回傳 `{ ok: true, message: "連線成功" }` 或 `{ ok: false, error: "..." }`

**預估工時**：1 天

---

### 3.3 整合與測試

#### Task 2.3-1：整體流程測試

- [ ] **2.3-1.1** 測試完整流程：建立任務 → 上傳影片 → 啟用 AI 服務 → 開始生成
  - 驗證 Azure Speech 轉錄正常
  - 驗證術語檢查正常
  - 驗證口語清理正常
  - 驗證影片摘要正常
  - 驗證用量追蹤正常

- [ ] **2.3-1.2** 測試 fallback 機制
  - 模擬 Azure API 失敗 → 應回退到 Whisper
  - 模擬 OpenAI API 失敗 → 應回退到固定規則
  - 驗證 log 中記錄了 fallback 訊息

- [ ] **2.3-1.3** 測試錯誤處理
  - API Key 錯誤 → 顯示明確錯誤訊息
  - 網路中斷 → 顯示重試選項
  - 回應格式錯誤 → 記錄 log 並 fallback

- [ ] **2.3-1.4** 測試用量追蹤
  - 驗證 `aiUsage` 欄位正確寫入 `job-status.json`
  - 驗證費用估算正確

**預估工時**：2 天

---

#### Task 2.3-2：文件更新

- [ ] **2.3-2.1** 更新 `AGENTS.md`
  - 新增 `aiServices` 結構說明
  - 新增 `ai-enhancement` 階段說明
  - 新增 AI 設定頁面說明

- [ ] **2.3-2.2** 更新 `README.md`
  - 新增 AI 服務接入說明
  - 新增 Azure / OpenAI 申請指南
  - 新增費用說明

- [ ] **2.3-2.3** 更新 `ELECTRON-MIGRATION-PLAN.md`
  - 標記 Phase 2 已完成項目

**預估工時**：0.5 天

---

## 四、完成標準

### 4.1 功能完成標準

| # | 功能 | 完成標準 |
|---|------|----------|
| 1 | 術語一致性檢查 | GPT 能正確識別 rule.txt 中的術語，並在 SRT 中標記不一致處 |
| 2 | 口語詞智能清理 | GPT 能移除口語詞且不改變原意，fallback 到固定規則時不中斷 |
| 3 | 影片內容摘要 | 能產生 50-200 字的繁體中文摘要，寫入 `content-summary.md` |
| 4 | 用量追蹤 | `aiUsage` 欄位正確記錄每次 API 呼叫的 tokens 與費用 |
| 5 | 設定頁面 | 能儲存/讀取 API Key，測試連線按鈕能驗證連線 |
| 6 | 費用估算 | 顯示每小時影片的預估費用（Azure 免費額度 + OpenAI 用量） |

### 4.2 非功能完成標準

| # | 項目 | 標準 |
|---|------|------|
| 1 | 錯誤處理 | API 失敗時不崩潰，記錄 log 並 fallback |
| 2 | 超時處理 | OpenAI 請求 30 秒超時，Azure 請求 60 秒超時 |
| 3 | 重試機制 | 網路錯誤自動重試最多 2 次 |
| 4 | 安全性 | API Key 不寫入 log，不透過網路傳輸到第三方 |
| 5 | 效能 | AI 處理階段不阻塞 UI，進度條正常更新 |

---

## 五、風險管理

| 風險 | 影響 | 對策 | 負責人 |
|------|------|------|--------|
| OpenAI API 限流 | 處理延遲 | 加入排隊機制，批次處理 | 開發者 |
| Azure 區域延遲高 | 轉錄速度慢 | 預設 eastasia，提供區域選擇 | 開發者 |
| GPT 輸出格式不穩定 | 解析失敗 | 加入 JSON schema validation + fallback | 開發者 |
| API Key 洩漏 | 資安問題 | Key 存本地、不寫 log、.gitignore 排除 | 開發者 |
| 費用超出預期 | 使用者負擔 | 顯示費用估算、加入用量上限 | 開發者 |

---

## 六、與 Phase 1 的銜接

Phase 2 完全建立在 Phase 1 的基礎上：

```
Phase 1 完成：
  ├── job-config.json 加入 aiServices 結構  ← Phase 2 直接使用
  ├── Azure Speech-to-Text 轉錄             ← Phase 2 共用
  ├── OpenAI 斷句優化                       ← Phase 2 共用
  ├── 設定頁面基礎 UI                        ← Phase 2 在此擴充
  └── ai-enhancement 階段框架               ← Phase 2 在此新增功能

Phase 2 新增：
  ├── 術語一致性檢查（使用 aiServices.openai.terminologyCheck）
  ├── 口語詞智能清理（使用 aiServices.openai.fillerCleanup）
  ├── 影片內容摘要（使用 aiServices.openai.summaryGeneration）
  ├── 用量追蹤與費用估算（使用 aiUsage 欄位）
  └── 設定頁面擴充（Azure 高級選項 + OpenAI 功能勾選）
```

---

## 七、給 Codex 的執行指令

### 執行順序

```
1. Task 2.1-1：術語一致性檢查後端（2 天）
2. Task 2.1-2：口語詞智能清理後端（2 天）
3. Task 2.1-3：影片內容摘要後端（1 天）
4. Task 2.1-4：用量追蹤與費用估算（1 天）
5. Task 2.2-1：AI 設定頁面 UI（2 天）
6. Task 2.2-2：API Key 儲存與讀取（1 天）
7. Task 2.2-3：測試連線按鈕（1 天）
8. Task 2.3-1：整體流程測試（2 天）
9. Task 2.3-2：文件更新（0.5 天）
```

### 注意事項

1. **所有 API 呼叫必須是非同步的**，不阻塞主流程
2. **所有 prompt 模板必須可自訂**，存放在獨立的 `.json` 檔案中
3. **所有 AI 功能必須有 fallback**，失敗時回退到原有離線流程
4. **API Key 不得寫入 log**，不得透過網路傳輸到非官方端點
5. **用量追蹤必須精確**，每筆 API 呼叫都要記錄 tokens 與費用
