# Offline Subtitle Factory v0.52.2

## macOS Apple Silicon security update

- Updates the packaged Electron runtime from 43.8.0 to 43.8.10. This includes Electron's fix for compromised eMudhra intermediate certificates (GHSA-jr5w-w6x2-84p9).
- This release provides macOS arm64 DMG and ZIP assets for macOS 12 and later. It does not include a Windows v0.52.2 package.
- The previous Windows v0.52.1 package contains Electron 43.8.0 and is affected by the advisory. Do not use that package for network connections on untrusted networks; a patched Windows package is not included here.
- The macOS app is ad-hoc signed and is not signed or notarized with an Apple Developer ID. macOS may show a security warning. Download only from this project's GitHub Release and verify `SHA256SUMS-macos-arm64.txt`.

## Scope and limitations

- This release does not include installation on a clean macOS account, Gatekeeper acceptance, or testing across every supported macOS version.
- Real Google OAuth, YouTube channel authorization, video upload, and subtitle upload have not been tested with a real account.
- Synthetic media and packaged-renderer smoke checks do not demonstrate complete transcription or subtitle quality.
- Production dependency audit: 0 vulnerabilities. The full dependency audit reports 11 findings (5 moderate, 6 high) in the development/build dependency tree; these are disclosed here and were not present in the production dependency set.

## Verification

Use the Release assets `SHA256SUMS-macos-arm64.txt`, `latest-mac.yml`, the DMG/ZIP files, and GitHub asset digests to verify the published bytes.
