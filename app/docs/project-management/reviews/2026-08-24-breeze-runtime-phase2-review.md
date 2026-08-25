# FR-025 Windows Breeze managed runtime — Phase 2 independent read-only review

- Review date: 2026-08-24 (Asia/Taipei)
- Scope: manifest and release metadata, Windows runtime build/release path, manager/server/probe code, current documentation, and persisted evidence. No source changes, build, install, or long test was completed.

## Verified facts

- The source manifest is enabled and internally coherent: Windows `win32`/`x64`, CPU, Python 3.11, runtime `2026.08.1`, HTTPS download, exact size `286,785,161`, uncompressed size `1,436,390,789`, SHA-256 `724e8bcb45c7a1373e1d1eca0e413897354326a4fae207948e72ec529bb8bf4b`, and fixed Breeze/patched-Whisper revisions (`runtime-manifests/breeze-asr-25-win-x64-cpu.json:1-27`).
- The persisted ZIP has the recorded size and SHA-256; the local checksum file, local release metadata, and the remote GitHub asset agree. A read-only remote check found release `breeze-runtime-2026.08.1` published, non-draft, non-prerelease, with four assets; the ZIP HEAD returned HTTP 200 and `Content-Length: 286785161`. Release: <https://github.com/twyderek/offline-subtitle-factory-app/releases/tag/breeze-runtime-2026.08.1>.
- The persisted package evidence contains a Python 3.11.15 runtime, `torch==2.4.1+cpu`, source revisions, runtime manifest, notices, and `runtime-license-review.json` (`breeze-runtime-output/work/runtime/*`; outer metadata: `breeze-runtime-output/release-metadata.json:1-38`). `real-transcription/jfk.srt` and `jfk-e2e.mp4` are also present.
- The manager implements HTTPS/size/SHA verification with failed-archive cleanup, short temporary extraction, capability probe before activation, rollback, cancellation propagation, and remove-busy protection (`lib/breeze-runtime-manager.mjs:147-171,191-257,282-340,358-380`). ZIP traversal/symlink/encryption/size controls are present (`lib/archive-utils.mjs:21-189`).
- Server status/download/cancel/remove/recheck routes and a bounded Windows DLL-aware probe are wired (`server.mjs:110-141,1238-1355,3900-3929`). Discovery prioritizes explicit override, managed runtime, legacy runtime, bundled runtime, then system Python (`lib/breeze-runtime-probe.mjs:23-55`).

## Claims not independently closed by this workspace

- The release page and `08-CHANGE-LOG.md` claim strict clean-Windows installation and successful App API/UI delivery, but no saved clean-machine transcript, API progress/state artifact, packaged-Electron smoke result, or job `job-status.json`/`job-config.json` accompanies the current runtime evidence. The saved SRT proves a real transcription artifact, not necessarily the full App `/api/jobs` path.
- The current source tree has the FR-025 implementation and metadata as untracked files relative to the sole recorded `HEAD` (`0126f62`); there is no source commit SHA tying this App tree to the published runtime release. Reproducibility and provenance are therefore not independently closed.
- `runtime-license-review.json` is explicitly `reviewStatus: engineering-evidence`; local inspection found 41 package records, 29 without an explicit `license` field. This is useful inventory, not proof of completed redistribution/legal review.

## Blockers and remaining risks

1. Governance documentation is contradictory: `THIRD-PARTY-NOTICES.md:35-41` still says the managed runtime is not included and redistribution review is not complete, while the release notes/change log describe a published runtime. Reconcile this before treating FR-025 as closed.
2. Preserve an auditable clean Windows acceptance record: no pre-existing Python/launcher/runtime override, managed download/install/probe, cancel/remove behavior, and real App job completion. Do not label a controlled PATH/profile test “strict clean” without environment evidence.
3. Complete dependency-by-dependency license/notice review, including the transitive packages with missing metadata, and record the decision separately from the build boolean `-LicenseReviewApproved` (`scripts/build-breeze-runtime-windows.ps1:1-9,27-35,119-175`).
4. Create a traceable App commit/release relationship and add saved API/UI integration evidence. Remaining operational risks include unsigned runtime payload/SmartScreen, long-path and antivirus/file-lock behavior, interrupted-download recovery, and unverified Taiwanese-Mandarin quality, long-audio performance, GPU, and macOS managed runtime.

## Verdict

**Phase 2 package/release foundation: verified. FR-025 complete managed-runtime delivery: not verified / do not close.** The artifact, published manifest, remote size/SHA, and source-level manager/server/probe controls are real and mutually consistent. The stronger claims—strict clean Windows, packaged/App end-to-end success, complete redistribution review, and reproducible source provenance—remain claims or incomplete evidence in the current workspace. Keep the runtime available only with the above documentation, acceptance, licensing, and traceability gaps explicitly open.
