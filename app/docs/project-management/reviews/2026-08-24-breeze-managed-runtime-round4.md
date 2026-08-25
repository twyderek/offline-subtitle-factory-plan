# 獨立複審報告：Windows Breeze Managed Runtime FR-025 round4

- 審查輪次：round4
- 審查時間：2026-08-24 10:32（Asia/Taipei）
- 審查範圍：本輪 **Phase 1/3 source foundation closeout**；判定固定 manifest、runtime manager、safe archive handling、platform／arch gate、discovery、取消／rollback、server／UI skeleton、測試與 build／CI source skeleton 是否有新的 source-level 阻擋。
- 範圍界線：真實 runtime ZIP／Release asset、license evidence、Windows runner、clean-machine acceptance，以及 API／UI integration 的真實成功安裝／取消／移除／renderer smoke 證據，不作為本輪 source foundation 內的程式缺陷；但它們仍在綜合判定中列為 FR-025 完整使用者交付阻擋。
- 審查基準：重新讀取 `app/AGENTS.md`、development preflight 路由、目前治理文件與 round1／round2／round3 報告；round1／round2／round3 均未覆寫。
- 工作樹基線：`git status --short` 顯示既有大量 modified／untracked 內容；本輪除建立本報告外未修改其他專案檔案。

## 1. 需求完整性

- 判定：通過（限 Phase 1/3 source foundation）
- 證據：
  - `runtime-manifests/breeze-asr-25-win-x64-cpu.json` 固定為 `engine=breeze-asr-25`、`platform=win32`、`arch=x64`、`variant=cpu`、Python 3.11 與 `python.exe`／`whisper` capability probe；`releaseStatus=not-published`，`download.available=false`，URL／size／uncompressedSize／SHA-256／patched Whisper revision 均為 null，沒有虛構下載資產。
  - `lib/breeze-runtime-manager.mjs` 與 `lib/archive-utils.mjs` 已提供 AppData managed runtime path、固定 metadata validation、HTTPS download skeleton、size／SHA 驗證、temporary extraction、Zip Slip／symlink／root containment 防護、probe 後 activation 與 rollback；`lib/breeze-runtime-probe.mjs` 已建立 developer override → active managed → legacy → bundled／system discovery priority。
  - `server.mjs` 已提供 runtime status、download、cancel、remove、recheck API；`public/index.html`／`public/app.js` 已提供 managed runtime panel、進度、取消、recheck 與不需重啟 App 的成功訊息。這些在本輪作為 source skeleton 檢查，不宣稱真實使用者流程已驗收。
  - source foundation 的要求已收斂；完整 FR-025 仍缺真實 package、Release、授權與實機證據，manifest 必須保持 `available:false`。

## 2. 邏輯正確性

- 判定：通過（限 source foundation 的 deterministic contract）
- 證據：
  - `node scripts/test-breeze-runtime-manager.mjs` exit 0，實測 platform／arch 不支援時回 `RUNTIME_PLATFORM_UNSUPPORTED` 且不觸發 fetch；managed runtime activation、既有 active state 保留、activation AbortSignal rollback 與 manager remove busy 均通過。
  - 同一取消契約已貫穿 download／verify／extract／probe／activation；取消不會啟用半成品，`RUNTIME_BUSY` 會阻擋 active install 期間 remove。
  - malformed state 會回 `invalid`；size／SHA mismatch、corrupt ZIP、Zip Slip、symlink 與 probe failure 均清理本輪產物並保留既有 runtime／state。
  - PowerShell build script 在 Windows PowerShell 5.1 與 PowerShell 7 均可 parse，未帶 `-LicenseReviewApproved` 時在 build／download 前 fail closed；這是 source gate 證據，不是成功 build 證據。

## 3. 邊界情況

- 判定：通過（限 deterministic source／fixture coverage）
- 證據：
  - manager focused test 覆蓋 disk-space preflight、timeout、HTTPS／redirect rejection、download cancellation／`.part` cleanup、size／SHA cleanup、corrupt ZIP、absolute／parent traversal、symlink、probe cancellation、activation rollback、malformed state、manager remove busy。
  - `node scripts/test-breeze-asr.mjs` exit 0，覆蓋 runtime probe timeout／AbortSignal cancellation、Windows discovery priority 與 managed runtime UI/API source markers。
  - 未將 fixture 結果擴張為 Windows real file handle、防毒干預、真實 Python／Torch／patched Whisper 或跨重啟行為的實機保證；這些屬 FR-025 完整交付證據缺口。

## 4. 程式碼品質

- 判定：通過（限 source foundation）
- 證據：
  - manager、archive parser、runtime probe、server API 與 renderer UI 分層；filesystem root、fetch、extractor、probe、state writer 可注入，便於 deterministic verification。
  - managed runtime 寫入 user data path，不修改系統 Python、PATH、Registry 或 Program Files；manifest unavailable 時 fail closed。
  - archive entry path、symlink／reparse metadata、父層 symlink、檔案數／大小限制與 output containment 均有明確檢查；activation 失敗可恢復舊 runtime／state。
  - `git diff --check -- app` exit 0。沒有發現新的 source-level blocker。

## 5. 測試覆蓋

- 判定：通過（限 repository source foundation）
- 證據：
- 實測結果：
  - `npm run check` exit 0；包含治理檢查、Node syntax checks、完整 `npm test`、Breeze manager／ASR／core tests。
  - `node scripts/test-breeze-runtime-manager.mjs` exit 0。
  - `node scripts/test-breeze-asr.mjs` exit 0。
  - `node scripts/test-core.mjs` exit 0；core API regression 通過，並保留 managed runtime unavailable／recheck／health 的 fail-closed 行為。
  - platform／arch repository assertions、activation rollback、manager remove busy、disk-space／timeout／redirect／symlink／corrupt ZIP／probe cancellation assertions 均已由目前 focused test 重跑通過。
  - PowerShell 5.1／pwsh parser 均 exit 0；兩種 shell 的未授權 license gate 均以 exit 1 在建置前拒絕。
  - `docs/project-management/06-TEST-AND-PROCESS-AUDIT.md`、`08-CHANGE-LOG.md` 與 `00-CURRENT-STATUS.md` 目前均可讀取 round1／round2／round3 references；本輪報告尚未登錄到工作紀錄，因此 `npm run docs:check:final` 目前按治理規則 exit 1（缺少可解析的本輪審查檔案／逐字引用）。這是 closeout record 尚待補登的文件狀態，不是 source foundation 程式阻擋。

## 6. 實際運行結果

- 判定：通過（限本機 source／fixture verification）
- 證據：
  - 本輪在目前 workspace 實際完成完整 check、focused tests、repository assertions、PowerShell 5.1／pwsh parser、license gate 與 diff check；所有 source foundation 驗證均符合預期。
  - manifest 現況已直接確認 `download.available=false`，且沒有把 placeholder URL／size／SHA 宣稱成可下載 runtime。
  - 本輪沒有成功執行真實 Python 3.11／PyTorch CPU／patched Whisper build，也沒有真實 ZIP、Release asset、Windows runner log、license evidence、clean-machine acceptance 或 API／UI managed install／cancel／remove／renderer smoke record；不把 deterministic fixture 或 CI skeleton 誤寫成這些外部證據。

## 綜合判定

- 結論：通過（僅限本輪 Phase 1/3 source foundation closeout）
- 阻擋問題（若有）：Phase 1/3 source foundation 無新阻擋；完整 FR-025 仍有外部交付阻擋，詳見下一行。
- source foundation 阻擋問題：0。round1／round2／round3 指出的 source-level cancellation、state／archive cleanup、activation rollback、platform／arch、PowerShell parser／gate 與 edge coverage 問題，均已在目前 source／focused tests 中重驗通過。
- FR-025 完整使用者交付阻擋：真實 runtime ZIP 與固定 size／SHA、固定 patched Whisper revision、逐項 license／notice evidence、Windows runner／Release asset、Windows clean-machine acceptance，以及 API／UI successful managed install／cancel／remove／renderer smoke 的外部整合證據仍缺；因此 source manifest 必須維持 `available:false`。
- 可逐字引用完整結論句：**本輪 Phase 1/3 source foundation 獨立複審結論為通過：固定 manifest、available:false fail-closed、Windows x64 CPU platform／arch gate、managed discovery、下載／驗證／安全解壓／probe／activation rollback、取消／remove busy、disk-space／timeout／redirect／symlink／corrupt ZIP／probe cancellation、PowerShell 5.1／pwsh parser+license gate 與 repository regression 均通過；但 FR-025 完整使用者交付仍被真實 runtime ZIP／Release asset／license evidence／Windows runner／clean-machine acceptance／API UI integration 外部證據阻擋，故 source manifest 必須維持 available:false。**

## 審查代理聲明

- 本審查代理除建立本報告外，僅執行讀取、指令執行與驗證，未修改任何其他專案檔案。
- round1／round2／round3 報告未覆寫；本輪 focused tests 使用的 temporary fixture 由測試自行建立並在 `finally` 清理，未建立其他專案檔案。
- 本報告的「通過」只適用於明確限定的 Phase 1/3 source foundation，不等同於 FR-025 完整使用者交付或公開下載啟用。
- 若上述聲明不實，本報告無效。
