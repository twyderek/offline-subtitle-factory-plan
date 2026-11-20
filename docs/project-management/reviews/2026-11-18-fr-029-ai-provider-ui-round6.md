# 獨立審查報告：FR-029 AI provider 設定介面優化與回歸測試

- 審查對象 commit／版本：root `0.52.0`、HEAD `9ce9c8ffeaffaed8ac4fc16f160c00dd157115a8`；目前工作樹 dirty
- 對應 08-CHANGE-LOG 條目：`2026-11-18 — AI provider 設定介面優化與回歸測試`
- 審查輪次：round6 schema-compliant closeout review
- 審查代理啟動時間、上下文來源：2026-11-18 10:58（Asia/Taipei）；獨立讀取目前 root 工作樹、更新後 `00-CURRENT-STATUS.md`、`06-TEST-AND-PROCESS-AUDIT.md`、`08-CHANGE-LOG.md`、原始碼與測試，並重新執行唯讀檢查
- 審查範圍：root `public/`、`server.mjs`、root 測試與治理 closeout；`app/` 既有 dirty 變更與未追蹤檔案排除，未清理、回復或修改

本輪未發現新的 FR-029 root 產品邏輯阻擋。更新後的 08／00／06 已將工作列為完成並記錄 round5 條件，但獨立重跑 `npm run docs:check:final` 仍因既有 round5 報告的粗體判定值不符合 validator 而 exit 1；完整 `npm test` 仍受 Windows symlink `EPERM` 限制。因此本輪結論為有條件通過，不能把文件聲稱的 closeout 當作 final gate 已實際通過。

## 1. 需求完整性

- 判定：通過
- 證據：
  - `docs/project-management/02-REQUIREMENTS-ANALYSIS.md:43-44` 定義 FR-028 NVIDIA NIM、FR-029 provider-specific 欄位分流、Azure Deployment／API Version、本機獨立 API Key、切換清除與 provider namespace；`:62-68` 定義 NFR-001、NFR-002、NFR-007。
  - `docs/project-management/08-CHANGE-LOG.md:3-24` 已將本條狀態改為完成，保留開發／測試而非發布範圍，補上獨立審查是否執行、發布授權為不發布、功能回歸邊界與遺留風險。`docs/project-management/00-CURRENT-STATUS.md:11-13` 與 `docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:3-10` 也記錄相同 scope 與限制。
  - `public/review.html:198-207` 包含 NVIDIA、Azure-only Deployment／API Version、雲端 `aiApiKey` 與本機 `aiApiKeyLocal`；`public/styles.css:84` 定義 provider-field 隱藏樣式；`public/review.js:304-323` 依 provider 分流 key、disabled 與 `aria-hidden`。
  - `scripts/test-review-ui.mjs:55-106` 與 `scripts/test-ai-providers.mjs:48-127` 目前測試驗證 NVIDIA default URL、Azure 欄位、雲端／本機 key 可見性、loopback 門檻與 provider request contract。

## 2. 邏輯正確性

- 判定：通過
- 證據：
  - `public/review.js:336-355` 的 `isCurrentAiProviderProfileRequest()` 與 `loadAiSettings()` 在 bootstrap 請求前保存 provider／generation，response 與 catch 均只在 transition 仍 current 時作用；過期 response 不會套用設定、重建 ready 或解除 pending。
  - `public/review.js:481-536` 的 profile transition 先增加 generation、清空 snapshot／key、鎖定 controls，只有 current provider 的成功或失敗結果可更新 state。
  - `public/review.js:377-416` 的 save 捕捉 settings provider／generation，並在開始、await 後、response、catch、finally 使用 current predicate；`scripts/test-review-ui.mjs:340-405` 實際驗證 stale response 不套用舊 provider、stale finally 不 unlock。
  - `public/ai-provider-settings.mjs:44-63` 的 connection controller 在 response／catch／finally 以 `isCurrent()` fail-closed；`public/review.js:610-636` 傳入目前 provider／generation；`scripts/test-review-ui.mjs:406-442` 驗證 pending／failed profile 與 stale response。
  - `public/review.js:561-590` 的 discovery 在 scan response 與 profile transition 完成後檢查 generation／provider／ready，只有 current transition 才套用 discovered endpoint、model、batch；`scripts/test-review-ui.mjs:444-483` 驗證 discovery 走同一 profile transition。

## 3. 邊界情況

- 判定：部分通過
- 證據：
  - `scripts/test-review-ui.mjs:170-206` 的 `uiFunctionSource()` 先追蹤解構參數括號，再擷取 function body；目前 `node scripts/test-review-ui.mjs` 實際執行 bootstrap、save、connection、discovery VM cases 並通過。
  - `scripts/test-review-ui.mjs:208-306` 覆蓋 rapid provider profile、過期 profile response、failure、key 清空與 pending save；`:308-338` 覆蓋 delayed bootstrap response；`:340-405` 覆蓋 save-in-flight；`:406-442` 覆蓋 connection pending／stale response；`:444-483` 覆蓋 local discovery。
  - `scripts/test-review-ui.mjs:86-166` 覆蓋未保存 provider／Base URL／model／Azure deployment／API Version／API Key 變更、loopback 可留空、HTTP error 與 network exception。
  - 尚無 bootstrap stale rejection、connection stale rejection 的獨立 deterministic case；也未以真實 UI 重播 discovery 進行中使用者手動改選 provider 的 intent precedence。真實 API Key、外部 NVIDIA／雲端端點、各 provider 字幕品質、真實 Electron／AX、LM Studio 實機與安裝後流程仍未驗證。

## 4. 程式碼品質

- 判定：通過
- 證據：
  - `public/review.js:336-339` 集中 provider／generation predicate；profile、save、connection、discovery 重用同一 transition state，避免各自維護不一致的 stale 判斷。
  - `public/ai-provider-settings.mjs:1-63` 集中欄位分流、profile snapshot、form validation 與 connection controller；`server.mjs:581-624,4073-4133` 依 provider 讀取／保存／清除 key 與 profile，並分開 runtime key namespace。
  - 2026-11-18T11:00:58.6210488+08:00–11:00:58.6991542+08:00 執行 `git diff --check -- . ':(exclude)app'` exit 0；僅有既有 LF／CRLF warning，沒有 root whitespace error。`app/` 的既有 dirty 狀態未納入判定。
  - 2026-11-18T10:59:38.9586791+08:00–10:59:39.1239572+08:00 的 root status／symbol inspection 確認 FR-029 變更仍限於已知 root source、tests 與治理文件，未看到新的未審查產品路徑。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：
  - 2026-11-18T10:59:50.5270328+08:00–10:59:50.6776395+08:00：`node --check public/review.js`、`node --check public/ai-provider-settings.mjs`、`node --check scripts/test-review-ui.mjs`、`node --check server.mjs` 全部 exit 0。
  - 2026-11-18T10:59:54.6096628+08:00–10:59:54.6777994+08:00：`node scripts/test-review-ui.mjs` exit 0，輸出校閱 UI 測試通過。
  - 2026-11-18T10:59:58.9081600+08:00–10:59:59.3231625+08:00：`node scripts/test-ai-providers.mjs` exit 0，輸出 AI provider contract 與術語／Prompt 測試通過。
  - 2026-11-18T11:00:03.3622130+08:00–11:00:08.2004411+08:00：隔離 PATH `PATH=C:\Windows\System32;C:\Windows;C:\Program Files\nodejs` 下 `node scripts/test-core.mjs` exit 0，核心回歸通過。
  - 2026-11-18T11:00:13.2749897+08:00–11:00:24.4712812+08:00：同一隔離 PATH 下 `npm test` 的所有前置 suites、provider／UI／YouTube UI CLI／core 均通過；`posttest` 在 `scripts/test-youtube.mjs:154` 的 `fs.symlinkSync` 以 Windows `EPERM` 結束，整體 exit 1。這是環境限制，不是 FR-029 root product failure，但不能記為完整 exit 0。
  - 2026-11-18T10:59:26.0563413+08:00–10:59:26.4158733+08:00：`npm run docs:check:final` exit 1，validator 明確指出 `docs/project-management/reviews/2026-11-18-fr-029-ai-provider-ui-round5.md` 六個面向的判定均無有效 plain 判定；原因是 round5 使用粗體判定值。round5 原件不可由本輪修改。

## 6. 實際運行結果

- 判定：部分通過
- 證據：
  - focused UI test 以 VM 實際執行目前 `public/review.js` function source，而非只比對 marker；bootstrap delayed response、save stale response／finally、connection stale response／unlock 與 discovery shared transition assertions 均通過。
  - provider contract test 實際檢查 NVIDIA `/models`、`/chat/completions` Authorization、Azure deployment／API version／`api-key` header 與 provider-specific request body；未輸入或輸出真實 API Key。
  - 隔離 PATH full `npm test` 已實際跑完 root 功能 suites，唯一 observed failure 是 YouTube symlink fixture；應在 Developer Mode／允許 symlink 的 Windows 環境重跑，不應修改產品／測試繞過。
  - `docs/project-management/08-CHANGE-LOG.md:5,17-24`、`00-CURRENT-STATUS.md:13`、`06-TEST-AND-PROCESS-AUDIT.md:7-10` 的文件狀態已記錄完成、round5 條件與不發布界線；但獨立重新執行的 `docs:check:final` 仍 exit 1，因此治理 closeout 尚未由目前 validator 證實。
  - 未執行真實外部 provider request、Electron／瀏覽器人工驗收、安裝後流程、簽章／公證／發布驗證；focused／functional pass 不等於真實模型品質或交付完成。

## 綜合判定

- 結論：有條件通過
- 可逐字引用的完整結論句：**有條件通過。本輪重驗確認 FR-029 的 bootstrap／save／connection／discovery provider-generation guards、fail-closed 行為、provider-specific UI 與 namespace separation 仍正確，focused syntax／UI／provider／隔離 PATH core 及 full npm 的功能 suites 均通過；完整命令仍受 Windows symlink fixture 的 EPERM 環境限制，且 `docs:check:final` 仍因既有 round5 報告的粗體判定格式不合 validator 而 exit 1。真實 provider／GUI／部分 rejection 與 discovery 手動 intent race 未測試；修正治理報告格式並在允許 symlink 的環境取得 final gate 證據後，才可宣稱本輪整體 closeout 完成。**
- 阻擋問題（若有）：
  - 既有 `round5` 報告的六個 `- 判定：` 值使用粗體，造成 2026-11-18 10:59:26 `docs:check:final` exit 1；本輪不修改既有報告，需由治理維護者另行處理。
  - Windows `scripts/test-youtube.mjs:154` symlink fixture 仍以 `EPERM` 阻塞完整 `npm test` exit 0；這是環境條件，不是 FR-029 產品邏輯阻擋。
- 剩餘風險：真實／錯誤 API Key、外部 NVIDIA／雲端 request、各 provider 真實字幕品質、Electron／瀏覽器 AX、bootstrap／connection stale rejection 的獨立案例、discovery 與手動改選的實機 intent precedence、LM Studio 實機、Developer Mode 下完整 npm exit 0、安裝／簽章／公證／發布均未驗證。
- 給主要開發代理的具體修正要求：不要修改本報告或其他歷史報告內容；由治理維護者依政策處理 round5 schema 問題，重新執行 `npm run docs:check:final`；在允許 symlink 的 Windows 環境重跑 `npm test` 並保留 `EPERM`／exit 0 邊界證據，不得修改產品或測試繞過。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
