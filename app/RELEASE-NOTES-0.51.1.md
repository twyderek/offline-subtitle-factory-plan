# 離線字幕工廠 0.51.1

發布狀態：本機 patch release candidate；尚未建立 `v0.51.1` tag 或 GitHub Release。

本 candidate 承接公開 `v0.51.0` 的已知修正與驗收條件，不修改或覆寫既有 `v0.51.0` tag、Release 與公開 assets。

## 修正與治理補強

- 修正 BUG-024：Breeze managed runtime 測試 fixture 明確描述目標平台與架構；Windows x64 positive path 通過，Windows arm64 維持 fail-closed。
- `resolveBreezePython()` 保留未指定架構時採用 host `process.arch` 的預設行為，不放寬正式 managed runtime contract。
- 將 0.51.0 public tag 的 clean-source baseline、current remediation worktree 與 patch source identity 分開記錄。
- package 的 Release notes 由 active `releaseInfo.releaseNotesFile` 指向 `RELEASE-NOTES-0.51.1.md`，避免新封裝嵌入 0.51.0 的 historical candidate wording。
- Windows preparation workflow 改以 0.51.1 candidate 命名，並產生包含 source commit、workflow run、artifact files 與 SHA-256 的 `BUILD-PROVENANCE-windows-x64.json`。
- `latest.yml`／`latest-mac.yml` 的版本、檔名、URL、size 與 checksum 仍須以實際 candidate package 重新核對；沒有 Release upload 授權時不宣稱 public provenance 已 VERIFIED。

## 未完成驗收與安全性

- Windows local／pristine Setup、Portable、renderer、migration、uninstall 與 SmartScreen 觀察仍需實機證據。
- Windows Authenticode 仍可能是 unsigned internal preview；只有憑證可用且簽章驗證通過時才可描述為 signed build。
- macOS 0.51.1 package 若建立，必須重新驗證版本、source identity、ZIP／DMG、renderer、migration 與基本 packaged Ollama path；不可沿用 0.51.0 binary 當作 0.51.1 PASS。
- public per-asset provenance 必須有 `patch source commit → Actions run → artifact／provenance manifest → Release upload → public digest` 的可回溯鏈；本 preparation 尚未公開 Release。
- 真實 Breeze runtime、長音訊品質、Ollama 模型品質、macOS Developer ID／公證仍不是本 candidate 的已完成證據。

## 發布界線

本檔案只代表 0.51.1 preparation candidate；不得據此宣稱 `v0.51.1` 已公開。只有 clean-source regression、docs final、Windows CI、package verification、independent review 與明確發布授權全部完成後，才可另案建立 tag／Release。
