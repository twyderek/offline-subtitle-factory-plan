# 獨立審查報告：Offline Subtitle Factory 0.51.0 Packaged Acceptance Remediation round6

- 審查對象 commit／版本：目前 `HEAD` 與公開 `v0.51.0` 的 peeled target 均為 `10b3044d31a5367a91faacea46b8def7ee103f7c`；`app/package.json:2-3`、`app/package-lock.json:2-9` 均為 `0.51.0`。目前 remediation source／test／治理文件／evidence／既有 reports 仍是 dirty worktree，不能把 `HEAD` 身分誤寫成 remediation diff 已進入公開 tag。
- 對應 08-CHANGE-LOG 條目：`app/docs/project-management/08-CHANGE-LOG.md:3-34`（`ACCEPT-051-PACKAGED-ROUND3-20260902`；其中 `:30-32` 已原樣引用 round5 並記錄條件接受，不等同 stable 0.51.0 放行）。
- 審查輪次：round6。
- 審查代理啟動時間、上下文來源：2026-09-02T05:05:02Z 起；本輪重新讀取目前工作樹、round5 report、最新 changelog、BUG-024、Breeze source／tests、macOS／Windows evidence、repository workflow、README／release notes／current status 與治理流程，並重新執行唯讀驗證；未沿用主要代理對話記憶或預設其評價。
- 審查限制：未修改 changelog、產品、測試、既有 report、Release、tag 或 asset；未重跑大型 macOS package。公開網路本輪未取得新的可用 raw body，故不新增遠端推論；公開狀態以既有 evidence 與 round5 記錄的 API 核對結果為準，無法獨立刷新之處明確保留 `TEST_GAP`／`UNVERIFIED`。

## 1. 需求完整性

- 判定：部分通過。
- 證據：
  - exact identity、版本與 worktree 範圍可回溯至 `app/package.json:2-3`、`app/package-lock.json:2-9`、`git rev-parse HEAD`（2026-09-02T05:05:02Z 前後讀取）及 `git status --short`；目前差異含 `app/lib/breeze-runtime-probe.mjs`、`app/scripts/test-breeze-runtime-manager.mjs`、治理文件與既有 evidence／reports，故 exact public tag baseline 與 current remediation worktree 必須分開判定。
  - BUG-024 已記錄現象、根因、修正與防回歸界線：`app/docs/project-management/07-DEBUG-AND-FIX-HISTORY.md:90-99`。目前需求所要求的四個未解除條件仍被 changelog 明確列出：exact public tag historical baseline、Windows local／pristine、public per-asset provenance、stale embedded documents；`app/docs/project-management/08-CHANGE-LOG.md:30-34` 並記錄需求方接受條件且不等同 stable approval。
  - macOS arm64 packaged evidence 已具備 exact clean-source build identity、asset hash／size、package content、renderer／trim、migration、packaged Ollama 與治理分類：`app/docs/project-management/evidence/2026-09-02-acceptance-packaged-0510-macos-arm64.json:2-24,25-61,63-91,93-113`。
  - Windows 要求已正確拆成 CI lifecycle 與 local／pristine 實機：`app/docs/project-management/evidence/2026-09-02-acceptance-packaged-round3.json:33-60`；CI 有 run／job／artifact 證據，local Windows 明確為 `NOT_AVAILABLE`，不可升格為實機 PASS。
  - 文件治理已將 source current state、public Release、unsigned status、provenance 缺口與 patch recommendation 對外揭露：`app/README.md:3-10`、`app/RELEASE-NOTES-0.51.0.md:1-21`、`app/docs/project-management/00-CURRENT-STATUS.md:1-16`。

## 2. 邏輯正確性

- 判定：部分通過。
- 證據：
  - Breeze contract 將 managed runtime 限制為 Windows x64，Windows arm64 fail closed；集中 gate 可回溯至 `app/lib/breeze-runtime-manager.mjs:90-102,117-125,204-208,282-284`。`app/lib/breeze-runtime-probe.mjs:23-56` 增加可選 `arch` seam，保留未傳入時採用 host `process.arch` 的既有預設，沒有把 arm64 變成可誤用 x64 runtime。
  - remediation fixture 在 `app/scripts/test-breeze-runtime-manager.mjs:125-142` 明確以 `arch: 'x64'` 驗證 positive，以 `arch: 'arm64'` 驗證 `null` 與禁止下載／安裝；這是修正測試環境描述，不是放寬 production contract。
  - exact public tag 的 clean-source baseline 於 `/Users/nycu/Documents/離線字幕工廠/.acceptance-worktrees/osf-051-10b3044d/app` 在 2026-09-02T05:05:02Z 重跑 `node scripts/test-breeze-runtime-manager.mjs`，仍於 `scripts/test-breeze-runtime-manager.mjs:125` 以 `actual null`／expected managed `python.exe` 失敗。這是 exact public tag 的既有 failure，不能被 current dirty remediation PASS 回寫或重新分類為 public tag PASS。
  - public Release 的 digest 一致性與 provenance 是不同命題：round3 evidence 將 checksum／latest metadata cross-check 記為 PASS，但因 exact workflow 沒有 Release upload step，per-asset build provenance 正確維持 `UNVERIFIED`：`app/docs/project-management/evidence/2026-09-02-acceptance-packaged-round3.json:62-80`。

## 3. 邊界情況

- 判定：部分通過。
- 證據：
  - Breeze 測試涵蓋 platform／architecture、archive integrity、probe failure、atomic rollback、timeout、cancel、disk-full、HTTPS／redirect、unsupported platform 與 arm64 install rejection：`app/scripts/test-breeze-runtime-manager.mjs:125-190,244-267`；current focused run 於 2026-09-02T05:05:46Z 起完成並 exit 0。
  - parser／AI deterministic 邊界仍由既有 bounded traversal、循環／深度限制、explicit `cues` gate 與固定 cue identity/order 測試覆蓋：`app/lib/ai/subtitle-optimizer.mjs:104-132,190-275`、`app/scripts/test-ai-acceptance-contract.mjs:17-83`；本輪完整 `npm run check` 亦實際跑到該測試。
  - macOS evidence 明確將 Windows Setup／Portable／uninstall 標為 `TEST_GAP`：`app/docs/project-management/evidence/2026-09-02-acceptance-packaged-0510-macos-arm64.json:63-68`；round3 evidence 將本機 Windows 標為 `NOT_AVAILABLE`：`:59-60`。CI lifecycle PASS 不涵蓋 Windows clean install、權限、SmartScreen 或本機／pristine lifecycle。
  - packaged Ollama 只證明既有 loopback `127.0.0.1:11434/v1`、`llama3.2:1b`、3 cues、0 changed suggestions 的實際 path：`app/docs/project-management/evidence/2026-09-02-acceptance-packaged-0510-macos-arm64.json:76-91`；不能外推模型品質、真實 Breeze runtime 或所有 live repair scenario。
  - exact package embedded release notes 與 public `latest.yml` 的候選文字仍是 stale／historical boundary，不得以 source 文件已更新而宣稱 binary／public metadata 已更新：`app/docs/project-management/evidence/2026-09-02-acceptance-packaged-round3.json:82-86`。

## 4. 程式碼品質

- 判定：部分通過。
- 證據：
  - `arch` seam 的變更最小且集中：`app/lib/breeze-runtime-probe.mjs:23-45` 僅將 target architecture 傳入 managed resolver；正向與負向 fixture 同時存在於 `app/scripts/test-breeze-runtime-manager.mjs:125-142`，並保留既有 fallback／安全錯誤路徑。
  - BUG-024 的記錄沒有把 host-specific fixture failure 偽裝成產品 runtime failure；根因與 workaround／防回歸條件可回溯於 `app/docs/project-management/07-DEBUG-AND-FIX-HISTORY.md:93-99`。
  - `git diff --check` 於 2026-09-02T05:05:46Z exit 0；current source diff 仍未提交，且 `git diff --stat` 顯示 source／test／治理文件差異，故本輪只能評估 worktree quality，不能給 public tag provenance 或 stable release approval。
  - source README、release notes、current status 已揭露 conditional／NO，但 public `latest.yml` 與 exact package embedded candidate text 仍 stale；evidence 的 `RECOMMEND_0.51.1_PATCH` 分類是較安全的版本邊界：`app/docs/project-management/evidence/2026-09-02-acceptance-packaged-round3.json:82-86`。

## 5. 測試覆蓋

- 判定：部分通過。
- 證據：
  - current remediation worktree 於 2026-09-02T05:05:05Z 執行 `OFFLINE_SUBTITLE_TEST_TOOLS_DIR=/Users/nycu/Documents/離線字幕工廠/offline-subtitle-factory-app/tools npm run check`，exit 0；實際通過 `docs:check`、syntax checks、Breeze／Whisper、AI parser／optimizer／deterministic contract、provider／migration、Ollama streaming、review UI 與 core localhost integration。
  - focused chain 於 2026-09-02T05:05:46Z 起執行 `node scripts/test-breeze-runtime-manager.mjs`、`node scripts/test-breeze-asr.mjs`、`node --check lib/breeze-runtime-probe.mjs`、`node --check scripts/test-breeze-runtime-manager.mjs`、`npm run docs:check` 與 `git diff --check`，均 exit 0。
  - `npm run docs:check:final` 於 2026-09-02T05:05:46Z exit 1，實際錯誤為「最新一輪獨立審查結論為不通過」。這是目前 changelog 仍引用 round5 不通過句的 validator 狀態；不能在本輪報告中將它改寫為已 PASS，也不能因此否認 round5 條件已被需求方明確接受。
  - exact public tag 的同一 Breeze test 於 2026-09-02T05:05:02Z exit 1；round3 evidence 另記錄 exact source／version／failure：`app/docs/project-management/evidence/2026-09-02-acceptance-packaged-round3.json:2-12`。因此 `CLEAN_REMEDIATION_WORKTREE_NPM_CHECK=PASS` 與 `PUBLIC_0.51.0_EXACT_SOURCE_BASELINE=FAIL` 必須並列。

## 6. 實際運行結果

- 判定：部分通過。
- 證據：
  - macOS arm64 acceptance-only package 由 clean exact source 建立，ZIP／DMG／blockmap 的 size／SHA-256、`unzip -t`、`hdiutil verify`、embedded `0.51.0`、Mach-O arm64、runtime contents、renderer、trim、migration 與 packaged Ollama path 均有 evidence：`app/docs/project-management/evidence/2026-09-02-acceptance-packaged-0510-macos-arm64.json:2-24,25-61,63-91`；Windows package／uninstall 仍是 `TEST_GAP`。
  - exact Windows CI lifecycle：workflow `../.github/workflows/windows-preview.yml:18-28,47-70,72-142` 使用 `windows-2022`，執行 source regression、unsigned Setup／Portable build、install／renderer、uninstall、Portable、archive／content／SHA checks，並於 `:135-142` 只執行 `actions/upload-artifact@v4`。它沒有 GitHub Release upload step。既有公開 API 核對（round5 report `:59-61`，2026-09-02T04:59:43Z）記錄 run `33483093931`、job `99776892605` success、artifact `9790782830` 487,020,484 bytes、digest `sha256:4a69b338d509846b200504118023768106e3502402b6d9d9ac4d440b15e62793` 且未過期；分類為 `WINDOWS_CI_LIFECYCLE=PASS`、`LOCAL_WINDOWS_PRISTINE=TEST_GAP`。
  - public Release 的 tag／target／asset 資料由 `app/docs/project-management/evidence/2026-09-02-acceptance-packaged-round3.json:62-80` 與 round5 `:60-62` 可回溯；既有核對記錄的六項 asset 如下，digest 不因沒有 local same-name match 就稱為 mismatch：

    | 公開 asset | size bytes | GitHub digest／記錄 SHA-256 |
    |---|---:|---|
    | `offline-subtitle-factory-setup-0.51.0.exe` | 243,687,067 | `5328c4f015a27290b5ef8ce90cf552f818aa4cc16f1635fd46c2632905616835` |
    | `offline-subtitle-factory-portable-0.51.0.exe` | 242,979,811 | `cb6f7d6aa1127a0d254fbb1379a986c2c17277572b11c1e723c6c01d7db89c78` |
    | `offline-subtitle-factory-setup-0.51.0.exe.blockmap` | 255,227 | `c8dac8499da7969fb533ce7af9b08b777b10bb7970f7f14be6347009a3e21bc0` |
    | `latest.yml` | 2,155 | `afef8a7b5de7ff65cdfba2fa4204bd23dd5c3d04947fe1ab5f0ef1e086a61283` |
    | `SHA256SUMS-windows-x64.txt` | 221 | `cbf9208e2e7e66ab29dca79e294c08fc23362f09a532ebf9c0462aaf53fe5f5b` |
    | `SIGNING-STATUS-windows-x64.txt` | 91 | `a1dd9e1dc7ba28cfd8faed976343777e636a7642488e426ec628a5e949937347` |

  - public `SHA256SUMS` 與 Release digest、public `latest.yml` Setup size／SHA-512 cross-check 均在既有 evidence 記為 PASS；signing status 是 `UNSIGNED_INTERNAL_PREVIEW`。但 workflow 不含 Release upload，且本輪公開 API／download raw refresh 於約 2026-09-02T05:05:46Z 未取得可用 body（公開 fetch cache miss／空回應），故本輪不宣稱新增 public provenance；`PUBLIC_ASSET_PROVENANCE=UNVERIFIED` 仍是正確分類。可回溯 URL：[v0.51.0 Release](https://github.com/twyderek/offline-subtitle-factory-plan/releases/tag/v0.51.0)、[Actions run 33483093931](https://github.com/twyderek/offline-subtitle-factory-plan/actions/runs/33483093931)、[job 99776892605](https://github.com/twyderek/offline-subtitle-factory-plan/actions/runs/33483093931/job/99776892605)、[artifact API 9790782830](https://api.github.com/repos/twyderek/offline-subtitle-factory-plan/actions/artifacts/9790782830)、[latest.yml](https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.51.0/latest.yml)、[SHA256SUMS](https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.51.0/SHA256SUMS-windows-x64.txt)、[signing status](https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.51.0/SIGNING-STATUS-windows-x64.txt)。
  - public `latest.yml` 的 release notes 仍含「候選準備中；尚未建立 `v0.51.0` tag 或 GitHub Release」，exact package embedded release notes 亦為 candidate text；分類 `STALE_CANDIDATE_TEXT`／`HISTORICAL_CANDIDATE_TEXT` 與 `RECOMMEND_0.51.1_PATCH` 可回溯至 `app/docs/project-management/evidence/2026-09-02-acceptance-packaged-round3.json:82-86`。不得修改既有 public binary／metadata 以消除這個歷史差異。
  - 授權邊界仍以 `app/docs/project-management/09-STANDING-AUTHORIZATIONS.md:3-15` 為準：`AUTH-2026-07-23-01` 僅涵蓋未簽章／未公證風險揭露，不授權忽略 Windows 實機、provenance、exact baseline、文件 stale 或 validator gate，也不授權修改既有 Release／tag／asset。

## 綜合判定

- 結論：有條件通過。
- remediation 文件／證據治理 closeout：有條件通過。round5 所列條件已由需求方明確接受，且目前 evidence 的分類可追溯；這不是無條件 closeout，也不表示 `docs:check:final` 已通過。current validator failure 必須保留到治理整合完成後再驗證。
- stable 0.51.0 gate：不放行；`STABLE_RELEASE_RECOMMENDATION=NO`。
- 可逐字引用的完整結論句：**本輪 round6 獨立審查判定 Offline Subtitle Factory 0.51.0 Packaged Acceptance Remediation 的文件／證據治理 closeout 可有條件通過：current remediation regression、Breeze x64 positive／arm64 fail-closed、macOS arm64 packaged evidence、exact Windows CI lifecycle 與 public asset size／digest／SHA256SUMS／latest.yml／unsigned status 均有可回溯紀錄，且 round5 的 exact public tag baseline FAIL、Windows local／pristine TEST_GAP、public per-asset provenance UNVERIFIED、public latest.yml／exact package embedded candidate text stale 等條件已由需求方明確接受；但這不等同 stable 0.51.0 放行，stable 0.51.0 gate 維持 NO，`docs:check:final` 目前仍因最新 changelog 引用 round5「不通過」而 exit 1，後續必須完成治理 validator 對 round6 條件性結論的可回溯收斂，並保留 `RECOMMEND_0.51.1_PATCH` 與 Windows/pristine/provenance/package-doc risks。**
- 阻擋問題（若有）：
  - 對「有條件 remediation 文件／證據 closeout」本身，沒有未被需求方接受的隱藏阻擋；但以下條件必須在任何 stable approval 前保持明確且未解除：exact public tag baseline FAIL、Windows local／pristine `TEST_GAP`、public per-asset provenance `UNVERIFIED`、public latest.yml／exact package embedded candidate text stale。
  - 目前 `npm run docs:check:final` 仍 exit 1；主要代理後續若要完成治理 validator closeout，須在不修改本報告與歷史 reports 的前提下，讓 changelog 可回溯引用本 round6 的條件性結論，再重跑 final validator。此要求不代表本輪可修改 changelog。
  - exact public tag 的 Breeze fixture failure 不得被 current dirty worktree PASS 覆蓋；若要宣稱 source regression 已進入可發布修正，須建立新的可追溯 commit／patch release（建議 `0.51.1`）並重新建置／驗證，不得回寫 `v0.51.0`。
  - Windows CI 只能維持 lifecycle PASS；解除 packaged 條件仍需 Windows local／pristine 實機的 Setup／Portable／uninstall evidence。解除 public provenance 條件仍需每一 public Release asset 到 exact CI build 的公開 upload chain。
- 剩餘風險：stable release gate、Windows 真實 clean install／權限／SmartScreen／Authenticode、Windows local／pristine lifecycle、每資產 provenance、macOS Developer ID／公證／拖曳安裝、真實 Breeze runtime／長音訊品質、Ollama 模型品質，以及 package／public metadata stale candidate text。網路 refresh 不可得的公開資料不擴張為新 PASS；其既有證據仍須以 `UNVERIFIED`／既有 timestamp 管理。
- 給主要開發代理的具體修正要求（若有）：保留 `STABLE_RELEASE_RECOMMENDATION=NO` 與 `RECOMMEND_0.51.1_PATCH`；完成 round6 changelog 可回溯整合後重跑 `npm run docs:check:final`；另以新 patch 版本處理 BUG-024 fixture／embedded package／public metadata，取得 Windows local／pristine 與 per-asset provenance evidence，再重新請求 independent review。不得修改 `v0.51.0` tag／Release／assets 或本 round6／round5／round4／round3 報告以掩蓋條件。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 本輪唯一允許寫入且實際新增的檔案為 `app/docs/project-management/reviews/2026-09-02-acceptance-packaged-round6.md`；未修改產品、測試、changelog、既有 reports、Release、tag 或 assets。
- 若上述聲明不實，本報告無效。
