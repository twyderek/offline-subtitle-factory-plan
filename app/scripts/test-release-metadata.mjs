import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(path.join(appDir, 'package-lock.json'), 'utf8'));
const releaseNotes = fs.readFileSync(path.join(appDir, 'RELEASE-NOTES-0.51.1.md'), 'utf8');
const workflow = fs.readFileSync(path.join(appDir, '..', '.github', 'workflows', 'windows-preview.yml'), 'utf8');
const indexHtml = fs.readFileSync(path.join(appDir, 'public', 'index.html'), 'utf8');
const version = '0.51.1';

assert.equal(packageJson.version, version, 'package.json version must be 0.51.1');
assert.equal(packageLock.version, version, 'package-lock top-level version must match');
assert.equal(packageLock.packages[''].version, version, 'package-lock root package version must match');
assert.equal(packageJson.build.releaseInfo.releaseNotesFile, `RELEASE-NOTES-${version}.md`, 'active release notes file must follow candidate version');
assert.ok(packageJson.build.files.includes(`RELEASE-NOTES-${version}.md`), 'candidate release notes must be packaged');
assert.match(indexHtml, /0\.51\.1/, 'renderer About/version marker must use candidate version');

assert.match(releaseNotes, /本機 patch release candidate/);
assert.match(releaseNotes, /尚未建立 `v0\.51\.1` tag 或 GitHub Release/);
assert.doesNotMatch(releaseNotes, /尚未建立 `v0\.51\.0` tag 或 GitHub Release/);
assert.doesNotMatch(releaseNotes, /發布狀態：已公開/);

assert.match(workflow, /^name: Build Windows 0\.51\.1$/m);
assert.match(workflow, /codex\/release-0\.51\.1-preparation/);
assert.match(workflow, /v0\.51\.1/);
assert.doesNotMatch(workflow, /RELEASE-NOTES-0\.51\.0|setup-0\.51\.0|portable-0\.51\.0/);
assert.match(workflow, /RELEASE-NOTES-0\.51\.1\.md/);
assert.match(workflow, /BUILD-PROVENANCE-windows-x64\.json/);
assert.match(workflow, /sourceCommit = \$env:GITHUB_SHA/);
assert.match(workflow, /\$provenanceFiles = @\(/);
assert.match(workflow, /Get-ChildItem \.\.\/dist -Filter '\*\.blockmap'/);
assert.match(workflow, /Get-Item \.\.\/dist\/latest\.yml/);
assert.match(workflow, /Get-Item \.\.\/dist\/SHA256SUMS-windows-x64\.txt/);
assert.match(workflow, /Get-Item \.\.\/dist\/SIGNING-STATUS-windows-x64\.txt/);
assert.match(workflow, /\$assetRecords = @\(\$provenanceFiles/);
const signingStatusWrite = workflow.indexOf("'SIGNED RELEASE: Authenticode signatures are valid.' | Set-Content ../dist/SIGNING-STATUS-windows-x64.txt");
const signingStatusRead = workflow.indexOf('Get-Item ../dist/SIGNING-STATUS-windows-x64.txt');
assert.ok(signingStatusWrite >= 0 && signingStatusWrite < signingStatusRead, 'signing status must be created before provenance collection');
assert.match(workflow, /actions\/upload-artifact@v4/);

function validateLatestMetadata(metadataText, expectedVersion, expectedNotes) {
  const versionMatch = metadataText.match(/^version: (.+)$/m);
  const pathMatch = metadataText.match(/^path: (.+)$/m);
  const releaseNotesMatch = metadataText.match(/^releaseNotes: (.+)$/m);
  assert.equal(versionMatch?.[1], expectedVersion, 'latest metadata version must match package');
  assert.equal(pathMatch?.[1], `offline-subtitle-factory-setup-${expectedVersion}.exe`, 'latest metadata path must match Setup artifact');
  assert.ok(releaseNotesMatch, 'latest metadata must carry release notes');
  assert.equal(JSON.parse(releaseNotesMatch[1]), expectedNotes, 'latest metadata release notes must be generated from active notes');
  assert.doesNotMatch(metadataText, /尚未建立 `v0\.51\.0` tag/);
}

const metadataFixture = [
  `version: ${version}`,
  'files:',
  `  - url: offline-subtitle-factory-setup-${version}.exe`,
  '    sha512: fixture',
  '    size: 123',
  `path: offline-subtitle-factory-setup-${version}.exe`,
  'sha512: fixture',
  `releaseNotes: ${JSON.stringify(releaseNotes)}`,
].join('\n');
validateLatestMetadata(metadataFixture, version, releaseNotes);

const provenanceFixture = {
  schemaVersion: 1,
  sourceCommit: 'a'.repeat(40),
  packageVersion: version,
  assets: [{ name: `offline-subtitle-factory-setup-${version}.exe`, size: 123, sha256: 'b'.repeat(64) }],
};
assert.match(provenanceFixture.sourceCommit, /^[0-9a-f]{40}$/);
assert.equal(provenanceFixture.packageVersion, packageJson.version);
assert.equal(provenanceFixture.assets[0].sha256.length, 64);

console.log('Release metadata contract tests passed: version, embedded notes, latest metadata fixture, workflow provenance manifest');
