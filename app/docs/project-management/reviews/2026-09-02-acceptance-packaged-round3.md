# 獨立審查報告：Offline Subtitle Factory 0.51.0 Packaged Acceptance Remediation round3

- 審查對象 commit／版本：`HEAD`／`v0.51.0` 均為 `10b3044d31a5367a91faacea46b8def7ee103f7c`；`app/package.json:2-3` 與 `app/package-lock.json:2-9` 為 `0.51.0`。
- 對應 08-CHANGE-LOG 條目：`app/docs/project-management/08-CHANGE-LOG.md:3-24`（`ACCEPT-051-PACKAGED-ROUND3-20260902`）。
- 審查輪次：round3。
- 審查代理啟動時間、上下文來源：2026-09-02T04:40:00+00:00 起；由獨立上下文重新執行 full preflight，閱讀固定核心／full 路由、目前工作樹、指定 evidence、round2 報告與公開 GitHub API／下載 URL，未沿用主要代理的對話記憶或評價。
- 審查限制：不建立或修改 tag／Release／asset，不重跑大型 macOS package；Windows 實機不可得時只採 CI lifecycle 證據，不改寫為本機／pristine Windows 實機結果。

## 1. 需求完整性

- 判定：部分通過。
- 證據：
  - 本輪 scope、exact source、不得發布／修改遠端、TEST_GAP／UNVERIFIED 分類及驗證計畫記錄於 `app/docs/project-management/08-CHANGE-LOG.md:3-24`；`REL-041` 的 active provider、migration、Ollama、live provider 與回歸範圍記錄於 `app/docs/project-management/06-TEST-AND-PROCESS-AUDIT.md:52-67`。
  - source identity 可重現：2026-09-02T04:45:39Z 執行 `git rev-parse HEAD` 得到 exact SHA；同時 `git status --short` 顯示目前 worktree 有既有未提交修改，故「exact HEAD」與「目前 remediation worktree」不能視為同一個可發布快照。
  - `docs/project-management/evidence/2026-09-02-acceptance-packaged-round3.json:2-12,24-31,33-60,62-86` 完整記錄 Breeze baseline／修正、current check、Windows CI、公開 asset checks、文件分類與推薦 `RECOMMEND_0.51.1_PATCH`。
  - 需求尚未達治理結案：2026-09-02T04:42:56.075Z 執行 `npm run docs:check:final` exit 1，實際錯誤為最新 changelog 尚未標示「完成」且缺少可解析的審查檔案／逐字引用。這在本報告建立前是可重現的 closeout gap，且本輪不得修改 changelog。

## 2. 邏輯正確性

- 判定：部分通過。
- 證據：
  - Breeze fail-closed 邏輯在 `app/lib/breeze-runtime-manager.mjs:90-102`（managed path 僅接受 `win32`／`x64`）、`:117-125`（inspect 非 x64 回傳 unsupported）、`:204-208` 與 `:282-284`（download／install 非 x64 拒絕）。`app/lib/breeze-runtime-probe.mjs:23-45` 新增可選 `arch` 並轉傳給 managed resolver，沒有放寬正式 arm64 邊界。
  - 修正後 focused test 於 2026-09-02T04:41:21.681Z 執行 `node scripts/test-breeze-runtime-manager.mjs` exit 0；`app/scripts/test-breeze-runtime-manager.mjs:125-142` 同時驗證 Windows x64 positive、Windows arm64 `null`、unsupported fetch 不觸發與 arm64 install 拒絕。
  - exact clean-source baseline 於 2026-09-02T04:42:23.512Z 在 `/Users/nycu/Documents/離線字幕工廠/.acceptance-worktrees/osf-051-10b3044d/app` 執行同一 test，仍於第 125 行失敗：actual `null`、expected managed `python.exe`。這是 release tag 上的跨 host fixture failure；current uncommitted remediation 已修正 fixture，但尚未進入 exact tag／公開 asset。
  - AI parser 的 bounded traversal／循環保護／explicit `cues` gate 位於 `app/lib/ai/subtitle-optimizer.mjs:104-132,190-220,235-275`，deterministic contract 位於 `app/scripts/test-ai-acceptance-contract.mjs:17-83`；這支持本輪 parser／repair 邏輯，但不解除 packaged provenance 或 live model gaps。

## 3. 邊界情況

- 判定：部分通過。
- 證據：
  - Breeze 測試實際覆蓋 x64 positive／arm64 fail-closed，並保留 archive size／SHA、unsupported platform、probe failure、atomic rollback、timeout、cancel、disk-full 與 insecure URL 案例；可回溯 `app/scripts/test-breeze-runtime-manager.mjs:125-190,244-267`，2026-09-02T04:41:21.681Z focused run exit 0。
  - parser／repair 邊界新增並實測：無語言 fence／CRLF、empty／non-text parts、nested JSON candidate priority、循環／超深 traversal 於 `app/scripts/test-ai-response-parser.mjs:235-285`；multi-cue repair 的 request count、ID、original 與 telemetry 於 `app/scripts/test-ai-optimizer.mjs:274-303`。完整受控 `npm run check` 亦於 2026-09-02T04:41:57.457Z exit 0。
  - macOS arm64 package 的 Windows Setup／Portable／uninstall 不是可執行邊界：`app/docs/project-management/evidence/2026-09-02-acceptance-packaged-0510-macos-arm64.json:63-68` 明確標 `TEST_GAP`；round3 Windows evidence 也將本機 Windows 標為 `NOT_AVAILABLE`（`:59-60`）。不得改寫為本機／pristine Windows PASS。
  - 真實模型情境仍須保留限制：macOS packaged Ollama evidence `:76-91` 只證明既有 `llama3.2:1b` loopback path 完成且 0 suggestions；未以此推論模型品質或所有 repair 情境。round2 報告 `app/docs/project-management/reviews/2026-09-02-acceptance-packaged-round2.md:17-19,29-38` 的未覆蓋風險仍有效。

## 4. 程式碼品質

- 判定：部分通過。
- 證據：
  - `app/lib/breeze-runtime-probe.mjs:23-56` 的 `arch` seam 小而明確，managed／external／bundled candidate 順序未被改寫；manager 的平台／架構檢查集中於 `app/lib/breeze-runtime-manager.mjs:90-102,117-125,204-208,282-284`。這是對測試可攜性與 fail-closed 契約的低幅度修正。
  - parser 的深度上限與 `seen` 集合位於 `app/lib/ai/subtitle-optimizer.mjs:104-132,190-220`；validation callback 讓 candidate selection 與 cue contract 一起判定，並有對應測試 `app/scripts/test-ai-response-parser.mjs:252-285`、`app/scripts/test-ai-optimizer.mjs:274-303`。
  - 目前 `git diff --name-status` 於 2026-09-02T04:45:39Z 顯示 production／test／governance 變更與未追蹤 evidence／既有 reports；本輪 report 不能把它們變成已提交或已發布內容。特別是 `app/lib/breeze-runtime-probe.mjs` 與 `app/scripts/test-breeze-runtime-manager.mjs` 的 remediation 差異不在 `10b3044d…` tag 中。
  - package／metadata stale 狀態已被分類而非隱藏：source `app/RELEASE-NOTES-0.51.0.md:1-21`、`app/README.md:3-10` 已寫公開／conditional／NO；但 exact package embedded notes `/Users/nycu/Documents/離線字幕工廠/.acceptance-worktrees/osf-051-10b3044d/dist/acceptance-0.51.0-10b3044d/mac-arm64/離線字幕工廠.app/Contents/Resources/app/RELEASE-NOTES-0.51.0.md:1-21` 與其 `latest-mac.yml:11-28` 仍是 candidate text。這是可揭露的交付品質條件，不是可忽略的文字差異。

## 5. 測試覆蓋

- 判定：不通過（current remediation suite 通過，但 exact release-source／治理 gate 未閉合）。
- 證據：
  - 2026-09-02T04:41:21.681Z：`node scripts/test-breeze-runtime-manager.mjs`、`node scripts/test-breeze-asr.mjs`、兩個 `node --check`、`npm run docs:check`、`git diff --check` 均 exit 0。
  - 2026-09-02T04:41:33.334Z 第一次 sandbox 執行 `OFFLINE_SUBTITLE_TEST_TOOLS_DIR=/Users/nycu/Documents/離線字幕工廠/offline-subtitle-factory-app/tools npm run check` 在 `test-core.mjs` 綁定 `0.0.0.0:22224` 以 `EPERM` 結束；這是環境阻擋，不是測試 assertion failure。2026-09-02T04:41:57.457Z 取得受控 localhost 權限重跑，同一命令 exit 0，包含 docs、syntax、Breeze、AI acceptance contract、provider／migration、Ollama streaming、review UI 與 core integration。
  - exact clean-source test 於 2026-09-02T04:42:23.512Z exit 1（第 125 行）；因此不能把 current remediation `npm run check` exit 0 寫成 exact `10b3044d…` source 已通過。
  - 2026-09-02T04:42:56.075Z `npm run docs:check:final` exit 1，尚未滿足「最新工作條目完成＋可解析 review link／逐字引用」的治理 closeout 條件。這是本輪最直接的 final-gate failure。

## 6. 實際運行結果

- 判定：部分通過。
- 證據：
  - macOS arm64 packaged evidence `app/docs/project-management/evidence/2026-09-02-acceptance-packaged-0510-macos-arm64.json:2-24,25-61`：clean tracked source／version／arm64 build provenance、ZIP／DMG／blockmap size／SHA、unzip／hdiutil、embedded version、runtime target、content exclusion 與 ad-hoc not-notarized status 可回溯；`:63-91` 的 renderer／trim／migration／packaged Ollama PASS 與 Windows TEST_GAP 已分開記錄。
  - Windows public CI evidence `app/docs/project-management/evidence/2026-09-02-acceptance-packaged-round3.json:33-60` 與公開 API（取證時間 2026-09-02T04:43:58.284Z）：[run 33483093931](https://github.com/twyderek/offline-subtitle-factory-plan/actions/runs/33483093931) 的 head SHA exact、runner `windows-2022`、job [99776892605](https://github.com/twyderek/offline-subtitle-factory-plan/actions/runs/33483093931/job/99776892605) success；公開 API jobs list 顯示同一 job `completed/success`。artifact [9790782830](https://api.github.com/repos/twyderek/offline-subtitle-factory-plan/actions/artifacts/9790782830) 為 487,020,484 bytes、digest `sha256:4a69b338d509846b200504118023768106e3502402b6d9d9ac4d440b15e62793`、未過期。此證據成立為 `WINDOWS_CI_LIFECYCLE=PASS`，不成立為本機／pristine Windows 實機驗收。
  - repository workflow [exact-source `.github/workflows/windows-preview.yml`](https://github.com/twyderek/offline-subtitle-factory-plan/blob/10b3044d31a5367a91faacea46b8def7ee103f7c/.github/workflows/windows-preview.yml) 的本地行號 `.github/workflows/windows-preview.yml:18-28,47-70,72-142`（位於 repository root，公開 exact source 同內容）顯示 source check、unsigned build、installer／renderer lifecycle、archive／content／SHA checks 與 `actions/upload-artifact@v4`；`135-142` 沒有 GitHub Release upload action／command。因此 per-asset provenance 應為 `UNVERIFIED`，不是 `PROVENANCE_MISMATCH`。
  - 公開 [Release `v0.51.0`](https://github.com/twyderek/offline-subtitle-factory-plan/releases/tag/v0.51.0) API 取證於 2026-09-02T04:43:58.284Z：annotated tag ref [v0.51.0](https://api.github.com/repos/twyderek/offline-subtitle-factory-plan/git/ref/tags/v0.51.0) object `746b6d01669a2555fa6a237890f86193a40eb7dc`，peeled tag object [746b6d…](https://api.github.com/repos/twyderek/offline-subtitle-factory-plan/git/tags/746b6d01669a2555fa6a237890f86193a40eb7dc) 指向 exact commit；Release 為 public、non-draft、non-prerelease、target commit exact。
  - 六項公開 Windows asset 的 API size／digest（同一公開 Release API 取證）如下：

    | asset | size | GitHub digest |
    |---|---:|---|
    | `offline-subtitle-factory-setup-0.51.0.exe` | 243,687,067 | `5328c4f015a27290b5ef8ce90cf552f818aa4cc16f1635fd46c2632905616835` |
    | `offline-subtitle-factory-portable-0.51.0.exe` | 242,979,811 | `cb6f7d6aa1127a0d254fbb1379a986c2c17277572b11c1e723c6c01d7db89c78` |
    | `offline-subtitle-factory-setup-0.51.0.exe.blockmap` | 255,227 | `c8dac8499da7969fb533ce7af9b08b777b10bb7970f7f14be6347009a3e21bc0` |
    | `latest.yml` | 2,155 | `afef8a7b5de7ff65cdfba2fa4204bd23dd5c3d04947fe1ab5f0ef1e086a61283` |
    | `SHA256SUMS-windows-x64.txt` | 221 | `cbf9208e2e7e66ab29dca79e294c08fc23362f09a532ebf9c0462aaf53fe5f5b` |
    | `SIGNING-STATUS-windows-x64.txt` | 91 | `a1dd9e1dc7ba28cfd8faed976343777e636a7642488e426ec628a5e949937347` |

    公開 [SHA256SUMS](https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.51.0/SHA256SUMS-windows-x64.txt) 內容列出兩個 EXE，與上述 EXE digest 一致；公開 [latest.yml](https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.51.0/latest.yml) 的 setup size／SHA-512 與 evidence 記錄一致；公開 [signing status](https://github.com/twyderek/offline-subtitle-factory-plan/releases/download/v0.51.0/SIGNING-STATUS-windows-x64.txt) 為 `UNSIGNED INTERNAL PREVIEW`。未因 non-EXE asset 不在 SHA256SUMS 文字中而錯判 checksum failure。
  - 公開 `latest.yml` 實際 `releaseNotes` 仍是 candidate text（例如「候選準備中；尚未建立 `v0.51.0` tag 或 GitHub Release」），可回溯至上述 public URL；round3 evidence `:82-86` 正確分類為 `STALE_CANDIDATE_TEXT`／`HISTORICAL_CANDIDATE_TEXT`，patch recommendation 為 `RECOMMEND_0.51.1_PATCH`，未要求回寫既有 binary 或 public Release。

## 綜合判定

- 結論：不通過。
- 可逐字引用的完整結論句：**本輪獨立 round3 審查確認 exact source identity、Breeze x64 positive／arm64 fail-closed 修正、macOS arm64 packaged evidence、Windows exact CI lifecycle 與公開六項 asset 的 size／digest／checksum／unsigned status 均有可回溯證據；但 exact `10b3044d…` clean-source test 仍可在 macOS arm64 host 於第 125 行失敗，修正尚在未提交 worktree，`docs:check:final` exit 1，Windows 本機／pristine 實機仍為 TEST_GAP，public per-asset provenance 仍 UNVERIFIED，且 public `latest.yml`／exact package embedded release notes 仍為 candidate text，因此本輪 packaged acceptance remediation 與治理 closeout 不通過，stable-release recommendation 維持 NO。**
- 阻擋問題（若有）：
  - 先將 Breeze fixture／`arch` seam 修正形成可追溯 commit，或正式記錄為另案修正；重新在 exact release-source／macOS arm64 與 Windows x64 矩陣執行 full regression，不能只以 uncommitted current worktree 的 exit 0 關閉 gate。
  - 由主要代理完成 changelog 的 round3 review link／逐字引用與完成狀態後，再重跑 `npm run docs:check:final`；本輪不代為修改 changelog。
  - 若要解除 packaged acceptance 條件，補 Windows Setup／Portable／uninstall 的本機／pristine Windows 實機證據；CI success 僅可保持 `WINDOWS_CI_LIFECYCLE=PASS`。
  - 若要宣稱 public asset provenance VERIFIED，須讓公開 Release asset 與 exact CI artifact 有可回溯的 per-asset build／upload chain；目前 workflow 只有 Actions artifact upload，應維持 `UNVERIFIED`。
- 剩餘風險：Windows Authenticode／SmartScreen、macOS Developer ID／公證與拖曳安裝、真實 Breeze runtime、長音訊品質／效能、Ollama 模型品質，以及 public/package stale release-note metadata。`AUTH-2026-07-23-01` 只涵蓋未簽章／未公證，不涵蓋實機缺口、provenance、文件 closeout 或測試失敗（`app/docs/project-management/09-STANDING-AUTHORIZATIONS.md:3-15`）。
- 給主要開發代理的具體修正要求：完成上述 source／governance closeout；不得修改本報告或前輪報告，不得把 CI Windows lifecycle 改寫為本機 Windows 實機，不得把未有 upload chain 的 asset digest 差異標成 mismatch；若修正 embedded package／public metadata，依既有分類另行評估 `0.51.1` patch，不覆寫 `v0.51.0`。

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 本輪未修改產品、測試、治理文件、Release、tag、asset 或既有 review；唯一新增檔案為本報告。
- 若上述聲明不實，本報告無效。
