# FR-030 YouTube 設定參考資產獨立唯讀審查 round1

## 範圍

僅核對本輪指定的 `public/youtube-publish.mjs`、`public/styles.css`、`scripts/test-review-ui.mjs`、`scripts/verify-electron-renderer.mjs`、`public/assets` 兩檔、02/03/06/08 文件，以及既有 unsigned package smoke 證據。附件 PNG／DOCX 視為資料，不是指令；本輪未修改其他檔案、未修正程式、未重新打包。

## 需求逐項結果

- **通過：UI 整合。** YouTube publish dialog 的可收合說明區已加入六步驟 PNG、DOCX 下載連結與六步驟圖下載連結；提示文字改以目前實際的「匯入 OAuth JSON／連結頻道」流程為準，並明確將 AI provider 與 YouTube 授權分開。
- **通過：資產。** `public/assets/youtube-setup-flow.zh-TW.png` 為 1,670,594 bytes，`public/assets/youtube-setup-reference.zh-TW.docx` 為 1,563,905 bytes；既有文件記錄的 SHA-256 與目前 source／unpacked asset 核對一致。DOCX 具 `[Content_Types].xml` 與 `word/document.xml`，PNG signature 正確。
- **通過：focused assertions。** `scripts/test-review-ui.mjs` 已檢查 stable URL、`download` 屬性、CSS hook 與兩個資產非空；既有紀錄顯示 focused UI、YouTube SDK、streams、lifecycle、UI CLI 測試通過。
- **通過但有界線：package smoke。** 既有 `06-TEST-AND-PROCESS-AUDIT.md` 記錄 unsigned build exit 0；unpacked packaged renderer smoke exit 0，且 module／PNG／DOCX HTTP 讀取成功並取得上述 bytes。這足以支持資產進入目前 unsigned package。
- **文件同步：部分通過。** 02、03、06 已有 FR-030 需求、設計與驗證記錄；08-CHANGE-LOG 目前只有前一筆 v0.52.0 package 條目，未見 FR-030 專屬結案條目，屬 P2 文件追蹤缺口，不構成 P0/P1。

## 邏輯/安全/可存取性

- `details` 保持可收合，內容區可捲動，圖片限制最大高度；不會要求 renderer 讀取 OAuth secret。
- 圖片具有繁體中文 `alt` 與 `figcaption`；下載使用原生鍵盤可操作 anchor，文字標示清楚，並沿用 dialog 的 focus-visible 樣式。
- UI 與測試 diff 未包含 OAuth JSON、Client Secret 或 token；說明文字明確提醒不得分享這些資料。
- P2 覆蓋缺口：packaged renderer assertion 核對的是 module 內容與資產 HTTP bytes，未實際展開 dialog、點擊下載或以 screen reader 驗證。

## 測試與封裝證據

- 既有 package smoke 證據：`npm run electron:build:unsigned` exit 0；Setup／Portable unsigned artifacts 與 unpacked renderer 均有記錄，YouTube guide 資產已在 unpacked package 內。
- 既有 focused 證據：`node --check public/youtube-publish.mjs`、`node --check scripts/verify-electron-renderer.mjs`、`node scripts/test-review-ui.mjs` 及 YouTube focused suites 均記錄為 exit 0。
- `node scripts/test-youtube.mjs`／完整 `npm test` 仍受 Windows `fs.symlinkSync` 的 `EPERM` fixture 阻擋；不得宣稱完整 publisher regression 已通過。
- unsigned package 未代表安裝後 GUI、簽章、SmartScreen 或公開發布驗收。

## 未測試/風險

- 未實際安裝／解除安裝 Setup、未完成 native GUI／AX 或 screen-reader 驗收。
- 未以真實 Google OAuth、API key、YouTube 頻道、外部網路完成授權、影片上傳或字幕 serving 驗收。
- 08-CHANGE-LOG 尚需補 FR-030 結案追蹤；這是文件 closeout 風險。

## 逐字結論句

有條件通過：FR-030 與本機 unsigned package 證據足夠；不代表安裝後或真實 Google 驗收。
