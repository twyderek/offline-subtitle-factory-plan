# 獨立審查報告：Offline Subtitle Factory 0.51.1 Release Candidate External Validation

- 審查對象 commit／版本：`EXTERNAL_VALIDATION_SOURCE_COMMIT=b183d4fd5741bcc7a905d8b8299fa740110107ee`／Offline Subtitle Factory `0.51.1`；`PREPARATION_REVIEWED_COMMIT=c3e7b7da6b0f62dec52f9d65da4d60294e7f3bad`
- 對應 08-CHANGE-LOG 條目：2026-09-03 — Offline Subtitle Factory 0.51.1 Release Candidate External Validation（`ACCEPT-0511-EXTERNAL-20260903`）
- 審查輪次：round1
- 審查代理啟動時間、上下文來源：2026-09-03（Asia/Taipei）；依本輪指定基準重新讀取目前 checkout、preflight release 路由、source、workflow、preparation evidence、external evidence 與 round6 report，並以本報告作為獨立審查輸出；未以主要代理的評價性敘述取代可回溯證據。

## 1. 需求完整性

- 判定：部分通過
- 證據：`docs/project-management/08-CHANGE-LOG.md` 的 `ACCEPT-0511-EXTERNAL-20260903` 條目列明 source gate、Windows CI／artifact／pristine、macOS evidence reuse、public provenance 與「不自動發布」邊界；`docs/project-management/evidence/2026-09-03-release-candidate-external-0511.json:1-78` 逐項記錄 `b183d4f`、`c3e7b7d`、0.51.1、Windows `NOT_RUN_NO_REMOTE_CANDIDATE`、artifact `NOT_AVAILABLE`、Windows pristine `TEST_GAP`、macOS reuse、public provenance `UNVERIFIED` 與 authorization `NOT_REQUESTED`。本輪需求與風險欄位完整，但 external candidate acceptance 所需的 Windows 與 public gates 尚未具備，不能判定為完整驗收通過。

## 2. 邏輯正確性

- 判定：部分通過
- 證據：`git rev-parse HEAD` 為 `b183d4fd5741bcc7a905d8b8299fa740110107ee`；`git show` 顯示其 parent 為 `f07814f9ebb6758de155e47c2be7096dc52c7a3e`，而 `c3e7b7d` 是前一個 preparation reviewed commit。`git diff --name-status c3e7b7d b183d4f` 僅落在治理文件、evidence 與既有 review report，沒有 production、renderer、package build 或 workflow 行為變更，因此沿用 c3e7b7d macOS package／renderer evidence 的理由成立。`scripts/test-release-metadata.mjs:25-42` 的 static contract 會檢查 0.51.1 metadata、active notes、provenance asset 集合及 signing-status write-before-read，2026-09-03T11:11:03+0800 執行通過。惟 remote candidate 未可執行，無法用實際 run／artifact 進一步證明 external chain。

## 3. 邊界情況

- 判定：部分通過
- 證據：source regression 的 `npm run check` 以同架構唯讀 test-tools 授權重跑通過，包含 Breeze manager／ASR、AI deterministic CASE-R01／R02／R03、provider migration、Ollama streaming 與 core integration；這些是 source／fixture 邊界，不是 Windows 實機。`2026-09-03-release-candidate-external-0511.json:48-56` 明確將 Setup、Portable、migration、uninstall 標為 `TEST_GAP`，SmartScreen 為 `NOT_AVAILABLE`，signing 為 `NOT_RUN`，原因是沒有同源 artifact 與 approved Windows 10／11 host／VM。macOS evidence 明確為 `AD_HOC_ONLY`／`NOT_NOTARIZED`；public upload 未執行，故不能把 Windows 安裝、解除安裝、遷移、SmartScreen 或 public asset chain 推論為通過。

## 4. 程式碼品質

- 判定：通過
- 證據：`git diff --name-status c3e7b7d b183d4f` 未顯示 production、renderer、package 或 workflow 行為修改；本輪受評 source 的 `node scripts/test-release-metadata.mjs`、`node scripts/test-project-docs-validator.mjs`、`npm run docs:check` 與 `git diff --check` 於 2026-09-03T11:11:03+0800 均 exit 0。`.github/workflows/windows-preview.yml:122-167` 先產生 SHA256SUMS／SIGNING-STATUS，再以 source commit、run metadata、檔案 size 與 SHA-256 建立 per-asset provenance manifest；這個 static lifecycle contract 具體且有 regression assertion，但尚未被 Windows run 實際執行。

## 5. 測試覆蓋

- 判定：部分通過
- 證據：`evidence/2026-09-03-release-candidate-external-0511.json:9-16` 記錄 source `npm ci`、完整 `npm run check`、`docs:check`、`docs:check:final` 與 `git diff --check` 均 PASS，並記錄 full check 使用同架構唯讀 tools。審查時以 `OFFLINE_SUBTITLE_TEST_TOOLS_DIR=/Users/nycu/Documents/離線字幕工廠/offline-subtitle-factory-app/tools npm run check` 於 2026-09-03T11:11 左右重跑；第一次只因 sandbox bind `0.0.0.0:22087` 回報 `EPERM`，取得授權後相同命令 exit 0，所有列出的 source regression、release metadata、Breeze、AI、provider、Ollama、review UI 與 core test 均通過。Windows CI、同源 artifact、Windows pristine lifecycle、real signing／SmartScreen 與 public upload provenance 沒有測試結果，故 coverage 只支持 source／local preparation，不支持 external release acceptance。

## 6. 實際運行結果

- 判定：部分通過
- 證據：`git branch -avv --no-abbrev` 顯示本機 branch `codex/release-0.51.1-preparation` 在 b183d4f，`origin/main` 與本機 `main` 在 `10b3044d31a5367a91faacea46b8def7ee103f7c`，未見 remote candidate tracking ref。`git ls-remote origin ...` 本輪因 `Could not resolve host: github.com` 無法刷新遠端；`gh auth status` 於 2026-09-03 回報 `The token in default is invalid`。依 external evidence，candidate 未 push、Windows workflow `NOT_RUN_NO_REMOTE_CANDIDATE`、artifact `NOT_AVAILABLE`，所以沒有 run／job／asset 可供 head SHA、artifact digest、SHA256SUMS、SIGNING-STATUS 或 per-file provenance 核對。macOS package／renderer 僅以 c3e7b7d preparation evidence reuse，package／renderer PASS、ad-hoc only、not notarized；public upload `NOT_RUN`、public provenance `UNVERIFIED`、stable recommendation `NO`。

## 綜合判定

- 結論：不通過
- 可逐字引用的完整結論句：**本輪 0.51.1 external validation 的 source gate 與 c3e7b7d macOS acceptance-only evidence reuse 均有可回溯證據，但 candidate 未推送、遠端目前僅有 main@10b3044d、GitHub token invalid，且沒有同源 Windows CI run／artifact／Setup／Portable／migration／uninstall／pristine lifecycle 或 public per-asset provenance，因此 external candidate acceptance 被阻擋，stable recommendation 維持 NO；本報告不授權任何 push、tag、Release 或公開發布。**
- 阻擋問題（若有）：
  - `WINDOWS_CI=NOT_RUN_NO_REMOTE_CANDIDATE`：b183d4f 未在 remote，且本輪不授權 push 或重新登入；沒有可驗證的 Windows runner、head SHA、job、artifact ID／digest。
  - `WINDOWS_ARTIFACT=NOT_AVAILABLE`：沒有同源 EXE、blockmap、`latest.yml`、SHA256SUMS、SIGNING-STATUS 或 BUILD-PROVENANCE 可核對。
  - `WINDOWS_LOCAL_PRISTINE=TEST_GAP`：Setup／Portable、renderer、restart／migration、uninstall、user-data boundary 與 SmartScreen 均未在 approved Windows 10／11 clean host 執行；不能將歷史 0.51.0 run 或 source fixture 冒充 0.51.1 external acceptance。
  - `PUBLIC_RELEASE_PROVENANCE=UNVERIFIED`：workflow static contract 只證明未來上傳流程的設計，public upload 尚未執行；`releaseAuthorization=NOT_REQUESTED`，不得由本審查推定發布授權。
- 剩餘風險：Windows Authenticode／SmartScreen 真實狀態、Setup／Portable／uninstall／migration lifecycle、artifact 到 public asset 的逐檔 provenance、macOS Developer ID／公證、真實 Breeze runtime／模型與長音訊品質仍未解除。macOS evidence 是 c3e7b7d 的 acceptance-only package reuse，不是 b183d4f 新建 package；歷史 0.51.0 public release 的狀態不得轉移給 0.51.1。
- 給主要開發代理的具體修正要求（若有）：取得明確授權後，將 exact external-validation source 暴露給受控 Windows workflow，確認 run head SHA 等於 b183d4f，再下載並核對同源 artifact、每項 asset SHA／size／provenance；於同一 artifact 上完成 approved Windows clean／pristine lifecycle。之後另建 final independent release review，重新核對 public upload／digest 與發布授權；在上述條件完成前維持 `PUBLIC_RELEASE_READINESS=NOT_READY`、`STABLE_RELEASE_RECOMMENDATION=NO`，不得發布。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 若上述聲明不實，本報告無效。
