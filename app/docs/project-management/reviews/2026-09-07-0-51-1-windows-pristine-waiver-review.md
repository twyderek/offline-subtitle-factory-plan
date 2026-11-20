# Offline Subtitle Factory 0.51.1 Windows pristine waiver 獨立審查報告

- 複審時間：2026-09-07T11:19:18+08:00（Asia/Taipei）
- 審查對象：候選版本 `0.51.1`
- binary candidate commit：`36062c9c3c5e57af662eab29fe52eb745ce5d606`
- waiver 類型：`WINDOWS_PRISTINE_RELEASE_RISK`
- 審查範圍：只讀核對 candidate identity、requester-provided Windows CI／artifact context、exact `TEST_GAP`、waiver scope／authority、mitigating evidence、Windows／macOS 簽章風險、public provenance 與 release authorization boundary。

## 資料來源與限制

已閱讀：`AGENTS.md`、`app/AGENTS.md`、`app/docs/project-management/README.md`、`01-PROJECT-GOVERNANCE.md`、`05-DEVELOPMENT-AND-DEPLOYMENT.md`、`09-STANDING-AUTHORIZATIONS.md`、`workflows/03-TEST-VALIDATION.md`、`workflows/04-INDEPENDENT-REVIEW.md`、`workflows/06-BUILD-RELEASE.md`、`00-CURRENT-STATUS.md`、`08-CHANGE-LOG.md`，以及本次新增的 `evidence/2026-09-07-windows-pristine-waiver-0511.json`。

關鍵證據均以檔案內容為準；Windows CI／artifact provenance 明確是 requester-provided authoritative context，未在本審查中重新下載、重新執行或宣稱本地重驗（evidence JSON lines 23–49、92–95）。本地 checkout 目前是 branch `codex/remove-lm-studio`、HEAD `3469618e00255767cbb26735e71dcc68e7f31891`，`app/package.json` 版本為 `0.51.0`；它不是 evidence 所指的 `0.51.1` candidate commit。這只是本地重驗限制，不是否定 requester-provided authoritative candidate context；該 context 可作本輪 waiver 判定的 mitigating evidence。`npm run project:preflight -- --type=release` 在此 checkout 回報 `Missing script: "project:preflight"`，故沒有把該工具的缺失誤記為通過。

本報告只新增本檔；未修改 source、workflow、existing evidence、`08-CHANGE-LOG.md`、`00-CURRENT-STATUS.md`，亦未建立 tag、push、GitHub Release 或上傳 assets。

## 逐項判定

### 1. Candidate identity 與 waiver scope — 通過（窄範圍）

Evidence 內 `candidateVersion`、`binaryCandidateCommit`、`remoteValidationRef` 與 `remoteValidationSha` 互相一致（lines 3–6）。waiver scope 明確限定為 `0.51.1` 與該 binary commit，排除 `0.51.2`、`0.52.x` 及 future builds，且 binary-affecting change 必須重新評估（lines 9–13）。這足以支持本輪對「該候選的風險 waiver」作出判定；本地 checkout 未驗證仍須揭露，但不構成否定 requester-provided candidate context 的 blocker。

### 2. Windows CI／artifact provenance — 部分通過；僅接受為 requester-provided context

Evidence 記載 Windows CI `PASS`（run `33846267720`／job `100938743199`），artifact `9926825379` 有 digest，並記載 Setup／Portable 檔名與 SHA-256、provenance `PASS`、internal consistency `PASS`（lines 23–42）。這是可供 waiver 判定的 requester-provided mitigating evidence；因本輪沒有重新下載或執行，仍標為未本地重驗，但不因此阻擋本輪 waiver／pre-authorization readiness 判定。

### 3. Exact Windows TEST_GAP — 明確存在，不能改成 PASS

Windows environment 的 host qualification 是 `FAIL_NO_APPROVED_ENVIRONMENT`，`localPristine` 是 `TEST_GAP`（lines 51–63）。`windowsPristineStatus` 仍為 `TEST_GAP`，Setup、Portable、migration、uninstall 都是 `NOT_RUN`，SmartScreen 是 `NOT_AVAILABLE`（lines 64–70）。Evidence 也明確聲明 waiver 不會把 `TEST_GAP` 或任何 `NOT_RUN` 轉為 PASS（lines 92–94）。本審查維持這些原值。

### 4. Waiver authority 與 scope — WAIVED（僅限指定候選）

Evidence 明示 waiver requester 為 `REQUESTER_IN_CURRENT_TASK`（line 8），decision boundary 明示 `windowsPristineWaiver: GRANTED_BY_REQUESTER`、`windowsPristineReleaseBlocker: WAIVED`，並要求新 Windows defect 重新開啟 readiness blocker（lines 83–90）。因此，本輪判定 Windows pristine release-risk waiver 在上述 exact version／commit scope 內成立；它不是測試通過、不是 binary acceptance，也不是 public release authorization。

### 5. Mitigating evidence 與邊界 — 通過（在窄範圍 waiver 內）

Packaged renderer CI smoke、deterministic provider migration coverage、uninstall CI lifecycle 與 macOS package／renderer `PASS_REUSED` 被列為既有 mitigating evidence（lines 44–49）。它們不能取代 pristine Windows lifecycle、Setup／Portable／migration／uninstall 實機驗收，但在 requester 已授予的 exact waiver scope 內足以作為風險緩解；任何新增 Windows defect 都會使 readiness blocker 重開（line 90）。

### 6. Windows unsigned／SmartScreen risk — 已知風險接受；仍非發布授權

候選 Windows signing status 是 `UNSIGNED_INTERNAL_PREVIEW`，SmartScreen observation `NOT_AVAILABLE`（lines 64–70）；因此可能出現 Unknown Publisher／SmartScreen 警告。`AUTH-2026-07-23-01` 有效並涵蓋 Windows Authenticode 未簽章，但其條件仍要求每次發布揭露風險並驗證來源 SHA、封裝、asset、digest 與下載結果；明確排除未實機測試、checksum／asset／updater metadata 未驗證，以及測試／獨立審查失敗（`09-STANDING-AUTHORIZATIONS.md` lines 5–14）。故此風險可作為已知簽章風險接受，不可據此宣布可發布。

### 7. macOS ad-hoc／notarization risk — 已知風險接受；證據仍為 reused context

Evidence 記載 macOS package／renderer 為 `PASS_REUSED`、signing 為 `AD_HOC_ONLY`、notarization 為 `NOT_NOTARIZED`，並標為 `ACCEPTABLE_KNOWN_RISK`（lines 71–76）。這與 `AUTH-2026-07-23-01` 涵蓋的 macOS 未 Developer ID／未公證風險一致，但不等於本輪重新完成 macOS package、下載或公證驗證，也不擴張 Windows pristine waiver scope。

### 8. Public provenance boundary — READY FOR AUTHORIZATION（未宣稱 public provenance 已驗證）

Evidence 將 `PUBLIC_PROVENANCE_PIPELINE` 記為 `READY_FOR_FUTURE_RELEASE_UPLOAD`，同時將 `PUBLIC_RELEASE_PROVENANCE` 記為 `UNVERIFIED`、release upload 記為 `NOT_RUN`（lines 78–81）。依本輪 requester 指示，pre-release／pre-authorization 階段的 `UNVERIFIED` 不形成 circular blocker；它仍須如實保留，且不能被描述成已上傳／已公開資產的證據。就 readiness boundary 而言，pipeline ready 足以通過此關卡。

### 9. Release authorization boundary — 刻意停止線；不阻擋 readiness

Evidence 明示 `PUBLIC_RELEASE_AUTHORIZATION: NOT_GRANTED`（`releaseAuthorization`／`publicReleaseAuthorization`，lines 83–89）。依本輪 requester 指示，這是刻意的停止邊界，不應倒推為 `PUBLIC_RELEASE_READINESS` blocker；readiness 與 authorization 分開。治理規則與常設授權仍不允許本報告授予 tag、push、GitHub Release、public asset upload 或任何正式 release operation。

### 10. 重新套用兩個 requester decision boundary — 無其他 blocker

在保留 Windows `TEST_GAP`、所有 `NOT_RUN`、unsigned／ad-hoc known risks 與未本地重驗限制後，重新套用：`PUBLIC_RELEASE_PROVENANCE=UNVERIFIED` + `PUBLIC_PROVENANCE_PIPELINE=READY_FOR_FUTURE_RELEASE_UPLOAD` 不構成 pre-authorization circular blocker；`PUBLIC_RELEASE_AUTHORIZATION=NOT_GRANTED` 是停止線而非 readiness 判定。依目前 evidence 未發現其他足以阻擋 `READY_FOR_AUTHORIZATION` 的 blocker。

## 六面向獨立審查摘要

1. 需求完整性：通過（針對本輪 waiver／pre-authorization readiness）。候選 identity、waiver scope、exact gap、風險與兩個 decision boundary 均有記錄；public release authorization 明確未授予且保持停止線。
2. 邏輯正確性：通過（就 waiver 判斷邏輯）。`WAIVED` 僅表示窄範圍 blocker waiver；`testingGapResolved: false`，沒有把 gap 轉成 PASS（lines 84–93）。
3. 邊界情況：部分通過。版本／commit 限定、binary-affecting change re-review、新 Windows defect reopen 均已記錄；future builds 不受本 waiver 涵蓋。
4. 程式碼品質：不適用於本輪風險 waiver 審查；本輪沒有 source change，也沒有以本報告宣稱產品行為已獨立驗收。
5. 測試覆蓋：條件通過。requester-provided CI／artifact context 可作 mitigating evidence；pristine Windows、Setup／Portable／migration／uninstall 與 SmartScreen 仍未覆蓋，但已由 exact waiver scope 明確接受為 TEST_GAP。
6. 實際運行結果：未完成本地重驗，但不構成本輪 waiver／pre-authorization readiness blocker。沒有把本地未重驗寫成 PASS，也沒有宣稱 public Release upload 已完成。

## 三層結論

| 層級 | 結論 | 說明 |
|---|---|---|
| `RELEASE_CANDIDATE_ACCEPTANCE` | **CONDITIONAL_PASS** | exact `0.51.1`／`36062c9c3c5e57af662eab29fe52eb745ce5d606` 的 Windows pristine release-risk blocker 為 `WAIVED`；Windows `TEST_GAP`、各項 `NOT_RUN`、unsigned／ad-hoc risk 與未本地重驗狀態保持原狀，且 binary-affecting change 必須重新評估。 |
| `PUBLIC_RELEASE_READINESS` | **READY_FOR_AUTHORIZATION** | `PUBLIC_PROVENANCE_PIPELINE=READY_FOR_FUTURE_RELEASE_UPLOAD` 足以通過 pre-authorization readiness；`PUBLIC_RELEASE_PROVENANCE=UNVERIFIED` 保持揭露但不形成 circular blocker。 |
| `STABLE_RELEASE_RECOMMENDATION` | **CONDITIONAL** | 可進入獨立的 authorization step；正式 stable release 仍須取得 release authorization，並在獲授權後完成實際 public upload、asset／digest／download 核對與風險揭露。 |

## 完整結論句（可逐字引用）

> **本輪獨立 release-risk waiver 複審判定：`0.51.1`／binary candidate commit `36062c9c3c5e57af662eab29fe52eb745ce5d606` 的 Windows pristine release-risk blocker 在 exact candidate scope 內 WAIVED，`RELEASE_CANDIDATE_ACCEPTANCE` 為 CONDITIONAL_PASS；Windows pristine 狀態仍為 `TEST_GAP`，所有 `NOT_RUN` 保持原狀，requester-provided CI／artifact context 未於本地重驗但可作 mitigating evidence；因 `PUBLIC_PROVENANCE_PIPELINE=READY_FOR_FUTURE_RELEASE_UPLOAD`，`PUBLIC_RELEASE_PROVENANCE=UNVERIFIED` 在 pre-authorization 階段不形成 circular blocker，故 `PUBLIC_RELEASE_READINESS` 為 READY_FOR_AUTHORIZATION；`PUBLIC_RELEASE_AUTHORIZATION=NOT_GRANTED` 仍是刻意停止邊界，`STABLE_RELEASE_RECOMMENDATION` 為 CONDITIONAL，而本報告不構成任何正式 release authorization。**

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- 本報告沒有把 Windows pristine `TEST_GAP` 改寫為 PASS，也沒有把 requester-provided context 改寫成本地重驗結果。
- 若上述聲明不實，本報告無效。
