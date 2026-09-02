import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import {
  BREEZE_RUNTIME_STATUS,
  getBreezeRuntimeDirectory,
  getBreezeRuntimeManifest,
  getActiveManagedBreezePythonPath,
  inspectInstalledBreezeRuntime,
  validateBreezeRuntimeManifest,
  verifyBreezeRuntimeArchive,
  downloadBreezeRuntime,
  installBreezeRuntime,
  resolveManagedBreezePython,
  createBreezeRuntimeManager,
} from '../lib/breeze-runtime-manager.mjs';
import { extractZipArchive, inspectZipArchive } from '../lib/archive-utils.mjs';
import { resolveBreezePython } from '../lib/breeze-runtime-probe.mjs';

const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'breeze-runtime-manager-test-'));

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const content = Buffer.from(entry.content || '');
    const method = entry.deflated ? 8 : 0;
    const storedContent = entry.deflated ? deflateRawSync(content) : content;
    const isDirectory = entry.name.endsWith('/');
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc32(content), 14);
    local.writeUInt32LE(storedContent.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    localParts.push(local, storedContent);
    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc32(content), 16);
    central.writeUInt32LE(storedContent.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(entry.symlink ? 0xa0000000 : isDirectory ? 0x10 : 0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centralParts.push(central);
    offset += local.length + storedContent.length;
  }
  const central = Buffer.concat(centralParts);
  const body = Buffer.concat(localParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(body.length, 16);
  return Buffer.concat([body, central, eocd]);
}

function responseFromBuffer(buffer, { status = 200, headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key) => headers[String(key).toLowerCase()] || null },
    body: (async function* body() { yield buffer; }()),
  };
}

function testManifest({ version = '2026.08.1', archive, available = true } = {}) {
  return {
    schemaVersion: 1,
    engine: 'breeze-asr-25',
    runtimeVersion: version,
    platform: 'win32',
    arch: 'x64',
    variant: 'cpu',
    pythonVersion: '3.11',
    download: available ? {
      available: true,
      url: 'https://example.test/releases/breeze-runtime.zip',
      filename: 'breeze-runtime-win-x64-cpu.zip',
      size: archive.length,
      uncompressedSize: archive.length,
      sha256: crypto.createHash('sha256').update(archive).digest('hex'),
    } : { available: false, url: null, filename: null, size: null, uncompressedSize: null, sha256: null },
    entrypoint: 'python.exe',
    probe: { module: 'whisper', requiredModel: 'breeze-asr-25' },
  };
}

try {
  const publishedManifest = await getBreezeRuntimeManifest();
  assert.equal(publishedManifest.releaseStatus, 'published');
  assert.equal(validateBreezeRuntimeManifest(publishedManifest).available, true);
  assert.equal(validateBreezeRuntimeManifest({ ...publishedManifest, download: { ...publishedManifest.download, url: 'http://unsafe.test/x.zip' } }).valid, false);

  const runtimeDirectory = getBreezeRuntimeDirectory({ platform: 'win32', env: { LOCALAPPDATA: tempDir } });
  assert.equal(runtimeDirectory, path.join(tempDir, 'Offline Subtitle Factory', 'runtimes', 'breeze-asr-25'));
  const managedPython = path.join(runtimeDirectory, '2026.08.1', 'python.exe');
  await fs.promises.mkdir(path.dirname(managedPython), { recursive: true });
  await fs.promises.writeFile(managedPython, 'managed');
  await fs.promises.writeFile(path.join(runtimeDirectory, 'runtime-state.json'), JSON.stringify({ activeVersion: '2026.08.1' }));
  assert.equal(getActiveManagedBreezePythonPath({ runtimeDirectory, platform: 'win32', arch: 'x64' }), managedPython);
  assert.equal(getActiveManagedBreezePythonPath({ runtimeDirectory, platform: 'win32', arch: 'arm64' }), null, 'Windows arm64 不得誤用 x64 managed runtime');
  const legacyHome = path.join(tempDir, 'legacy-home');
  const legacyPython = path.join(legacyHome, 'Breeze-ASR-25', '.venv', 'Scripts', 'python.exe');
  await fs.promises.mkdir(path.dirname(legacyPython), { recursive: true });
  await fs.promises.writeFile(legacyPython, 'legacy');
  assert.equal(resolveBreezePython({ platform: 'win32', arch: 'x64', env: { LOCALAPPDATA: tempDir, USERPROFILE: legacyHome }, managedRuntimeDirectory: runtimeDirectory }), managedPython);
  assert.equal(resolveBreezePython({ platform: 'win32', arch: 'x64', env: { LOCALAPPDATA: tempDir, USERPROFILE: legacyHome, BREEZE_ASR_PYTHON: 'developer-python.exe' }, managedRuntimeDirectory: runtimeDirectory }), 'developer-python.exe');
  await fs.promises.rm(path.join(runtimeDirectory, 'runtime-state.json'));
  assert.equal(resolveBreezePython({ platform: 'win32', arch: 'x64', env: { LOCALAPPDATA: tempDir, USERPROFILE: legacyHome }, managedRuntimeDirectory: runtimeDirectory }), legacyPython);

  const goodZip = makeZip([{ name: 'python.exe', content: 'fake python executable' }, { name: 'Lib/', content: '' }, { name: 'Lib/whisper.py', content: 'fixture' }]);
  const goodManifest = testManifest({ archive: goodZip });
  const archivePath = path.join(tempDir, goodManifest.download.filename);
  await fs.promises.writeFile(archivePath, goodZip);
  let unsupportedFetches = 0;
  await assert.rejects(() => downloadBreezeRuntime({ manifest: goodManifest, platform: 'darwin', arch: 'x64', fetchImpl: async () => { unsupportedFetches += 1; return responseFromBuffer(goodZip); }, getFreeBytes: async () => Number.MAX_SAFE_INTEGER }), (error) => error.code === 'RUNTIME_PLATFORM_UNSUPPORTED');
  await assert.rejects(() => installBreezeRuntime({ archivePath, manifest: goodManifest, runtimeDirectory, platform: 'win32', arch: 'arm64', extractArchive: extractZipArchive, probe: async () => ({ ok: true }) }), (error) => error.code === 'RUNTIME_PLATFORM_UNSUPPORTED');
  assert.equal(unsupportedFetches, 0, 'unsupported platform 不得觸發 runtime fetch');
  assert.deepEqual((await inspectZipArchive(archivePath)).map((entry) => entry.path), ['python.exe', 'Lib', 'Lib/whisper.py']);
  const compressedZip = makeZip([{ name: 'compressed.txt', content: 'deflate extraction works', deflated: true }, { name: 'empty.txt', content: '', deflated: true }]);
  const compressedZipPath = path.join(tempDir, 'compressed.zip');
  const compressedTarget = path.join(tempDir, 'compressed-target');
  await fs.promises.writeFile(compressedZipPath, compressedZip);
  await extractZipArchive(compressedZipPath, compressedTarget);
  assert.equal(await fs.promises.readFile(path.join(compressedTarget, 'compressed.txt'), 'utf8'), 'deflate extraction works', 'deflated ZIP entry 應可安全解壓');
  assert.equal((await fs.promises.stat(path.join(compressedTarget, 'empty.txt'))).size, 0, '0-byte ZIP entry 應可安全解壓');
  assert.equal((await verifyBreezeRuntimeArchive({ archivePath, manifest: goodManifest })).sha256, goodManifest.download.sha256);
  await assert.rejects(() => verifyBreezeRuntimeArchive({ archivePath, manifest: { ...goodManifest, download: { ...goodManifest.download, size: goodZip.length + 1 } } }), (error) => error.code === 'RUNTIME_SIZE_MISMATCH');
  assert.equal(fs.existsSync(archivePath), false, 'size mismatch 必須清除 managed archive');
  await fs.promises.writeFile(archivePath, goodZip);
  await assert.rejects(() => verifyBreezeRuntimeArchive({ archivePath, manifest: { ...goodManifest, download: { ...goodManifest.download, sha256: '0'.repeat(64) } } }), (error) => error.code === 'RUNTIME_SHA256_MISMATCH');
  assert.equal(fs.existsSync(archivePath), false, 'SHA mismatch 必須清除 managed archive');
  await fs.promises.writeFile(archivePath, goodZip);

  const probe = async ({ pythonPath }) => ({ ok: path.basename(pythonPath) === 'python.exe', module: 'whisper', availableModels: ['breeze-asr-25'] });
  const installed = await installBreezeRuntime({ archivePath, manifest: goodManifest, runtimeDirectory, platform: 'win32', arch: 'x64', extractArchive: extractZipArchive, probe });
  assert.equal(installed.status, BREEZE_RUNTIME_STATUS.INSTALLED);
  assert.equal((await inspectInstalledBreezeRuntime({ runtimeDirectory, manifest: goodManifest, platform: 'win32', arch: 'x64', probe })).ready, true);
  assert.equal(await resolveManagedBreezePython({ runtimeDirectory, manifest: goodManifest, probe }), path.join(runtimeDirectory, goodManifest.runtimeVersion, 'python.exe'));
  const state = JSON.parse(await fs.promises.readFile(path.join(runtimeDirectory, 'runtime-state.json'), 'utf8'));
  assert.equal(state.activeVersion, goodManifest.runtimeVersion);

  const badZip = makeZip([{ name: 'python.exe', content: 'new fake python executable' }]);
  const badManifest = testManifest({ version: '2026.09.1', archive: badZip });
  const badArchivePath = path.join(tempDir, badManifest.download.filename);
  await fs.promises.writeFile(badArchivePath, badZip);
  await assert.rejects(() => installBreezeRuntime({ archivePath: badArchivePath, manifest: badManifest, runtimeDirectory, platform: 'win32', arch: 'x64', extractArchive: extractZipArchive, probe: async () => ({ ok: false, stderr: 'hidden diagnostic' }) }), (error) => error.code === 'RUNTIME_PROBE_FAILED');
  assert.equal(JSON.parse(await fs.promises.readFile(path.join(runtimeDirectory, 'runtime-state.json'), 'utf8')).activeVersion, goodManifest.runtimeVersion, 'probe 失敗不得替換既有 active runtime');
  assert.equal(fs.existsSync(badArchivePath), false, 'probe 失敗必須清除本輪 archive');

  const malformedStatePath = path.join(runtimeDirectory, 'runtime-state.json');
  const atomicFailureArchivePath = path.join(tempDir, 'atomic-failure.zip');
  await fs.promises.writeFile(atomicFailureArchivePath, goodZip);
  await assert.rejects(() => installBreezeRuntime({ archivePath: atomicFailureArchivePath, manifest: goodManifest, runtimeDirectory, platform: 'win32', arch: 'x64', extractArchive: extractZipArchive, probe, writeState: async () => { throw new Error('injected state write failure'); } }), /injected state write failure/);
  assert.equal(JSON.parse(await fs.promises.readFile(malformedStatePath, 'utf8')).activeVersion, goodManifest.runtimeVersion, 'state write 失敗不得遺失既有 active state');
  assert.equal(await fs.promises.readFile(path.join(runtimeDirectory, goodManifest.runtimeVersion, 'python.exe'), 'utf8'), 'fake python executable', 'state write 失敗不得遺失既有 runtime');
  const activationAbortController = new AbortController();
  await fs.promises.writeFile(atomicFailureArchivePath, goodZip);
  await assert.rejects(() => installBreezeRuntime({ archivePath: atomicFailureArchivePath, manifest: goodManifest, runtimeDirectory, platform: 'win32', arch: 'x64', extractArchive: extractZipArchive, probe, signal: activationAbortController.signal, writeState: async (filePath, data) => { await fs.promises.writeFile(filePath, JSON.stringify(data)); activationAbortController.abort(); } }), (error) => error.code === 'RUNTIME_CANCELLED');
  assert.equal(JSON.parse(await fs.promises.readFile(malformedStatePath, 'utf8')).activeVersion, goodManifest.runtimeVersion, 'activation commit 中取消不得遺失既有 active state');
  assert.equal(await fs.promises.readFile(path.join(runtimeDirectory, goodManifest.runtimeVersion, 'python.exe'), 'utf8'), 'fake python executable', 'activation commit 中取消不得替換既有 runtime');

  await fs.promises.writeFile(malformedStatePath, '{"activeVersion":');
  const malformedState = await inspectInstalledBreezeRuntime({ runtimeDirectory, manifest: goodManifest, platform: 'win32', arch: 'x64', probe });
  assert.equal(malformedState.status, BREEZE_RUNTIME_STATUS.INVALID);
  assert.equal(malformedState.reason, 'state-invalid');
  await fs.promises.rm(malformedStatePath);
  await fs.promises.writeFile(malformedStatePath, JSON.stringify({ activeVersion: goodManifest.runtimeVersion, platform: 'win32', arch: 'x64' }));

  const cancelledArchivePath = path.join(tempDir, 'cancel-install.zip');
  const cancelledManifest = testManifest({ version: '2026.10.1', archive: goodZip });
  await fs.promises.writeFile(cancelledArchivePath, goodZip);
  const installController = new AbortController();
  await assert.rejects(() => installBreezeRuntime({
    archivePath: cancelledArchivePath,
    manifest: cancelledManifest,
    runtimeDirectory,
    platform: 'win32',
    arch: 'x64',
    signal: installController.signal,
    extractArchive: async (_archive, destination, { signal }) => {
      await fs.promises.writeFile(path.join(destination, 'python.exe'), 'fake');
      if (signal.aborted) return;
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
    },
    onProgress: (event) => { if (event.status === BREEZE_RUNTIME_STATUS.INSTALLING) setTimeout(() => installController.abort(), 0); },
    probe,
  }), (error) => error.code === 'RUNTIME_CANCELLED');
  assert.equal(JSON.parse(await fs.promises.readFile(malformedStatePath, 'utf8')).activeVersion, goodManifest.runtimeVersion, '安裝中取消不得替換既有 active runtime');
  assert.equal(fs.existsSync(cancelledArchivePath), false, '安裝中取消必須清除本輪 archive');

  const managerCancelDir = path.join(tempDir, 'manager-cancel');
  const manager = createBreezeRuntimeManager({ platform: 'win32', arch: 'x64', runtimeDirectory: managerCancelDir, getFreeBytes: async () => Number.MAX_SAFE_INTEGER });
  const managerManifest = testManifest({ version: '2026.11.1', archive: goodZip });
  const managerInstall = manager.install({
    manifest: managerManifest,
    fetchImpl: async () => responseFromBuffer(goodZip),
    extractArchive: async (_archive, destination, { signal }) => {
      await fs.promises.writeFile(path.join(destination, 'python.exe'), 'fake');
      if (signal.aborted) return;
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
    },
    onProgress: (event) => { if (event.status === BREEZE_RUNTIME_STATUS.INSTALLING) setTimeout(() => manager.cancel(), 0); },
    probe,
  });
  await assert.rejects(() => manager.remove(), (error) => error.code === 'RUNTIME_BUSY');
  await assert.rejects(() => managerInstall, (error) => error.code === 'RUNTIME_CANCELLED');
  assert.equal(fs.existsSync(path.join(managerCancelDir, managerManifest.runtimeVersion)), false, 'manager cancel 不得啟用半成品 runtime');

  for (const badName of ['../escape.txt', '/absolute.txt', 'C:/absolute.txt', 'nested/../../escape.txt']) {
    const zipPath = path.join(tempDir, `bad-${badName.replaceAll(/[^a-z0-9]/gi, '_')}.zip`);
    await fs.promises.writeFile(zipPath, makeZip([{ name: badName, content: 'bad' }]));
    await assert.rejects(() => extractZipArchive(zipPath, path.join(tempDir, 'zip-slip-target')), (error) => error.code === 'ZIP_SLIP');
  }
  const symlinkZipPath = path.join(tempDir, 'symlink.zip');
  await fs.promises.writeFile(symlinkZipPath, makeZip([{ name: 'link', content: 'target', symlink: true }]));
  await assert.rejects(() => extractZipArchive(symlinkZipPath, path.join(tempDir, 'symlink-target')), (error) => error.code === 'ZIP_SYMLINK');

  const corruptZip = Buffer.from('not-a-zip');
  const corruptManifest = testManifest({ version: '2026.12.1', archive: corruptZip });
  const corruptArchivePath = path.join(tempDir, corruptManifest.download.filename);
  await fs.promises.writeFile(corruptArchivePath, corruptZip);
  await assert.rejects(() => installBreezeRuntime({ archivePath: corruptArchivePath, manifest: corruptManifest, runtimeDirectory, platform: 'win32', arch: 'x64', extractArchive: extractZipArchive, probe }), (error) => error.code === 'ZIP_CORRUPT');
  assert.equal(fs.existsSync(corruptArchivePath), false, 'corrupt ZIP 必須清除 managed archive');

  const downloadDir = path.join(tempDir, 'download');
  const downloadManifest = testManifest({ archive: goodZip });
  const progress = [];
  const successfulDownload = await downloadBreezeRuntime({ manifest: downloadManifest, runtimeDirectory: downloadDir, platform: 'win32', arch: 'x64', fetchImpl: async () => responseFromBuffer(goodZip, { headers: { 'content-length': String(goodZip.length) } }), getFreeBytes: async () => Number.MAX_SAFE_INTEGER, onProgress: (event) => progress.push(event) });
  assert.equal(fs.existsSync(successfulDownload.archivePath), true);
  assert.equal(progress.at(-1).progress, 100);
  await assert.rejects(() => downloadBreezeRuntime({ manifest: downloadManifest, runtimeDirectory: path.join(tempDir, 'disk-full'), platform: 'win32', arch: 'x64', getFreeBytes: async () => 0, fetchImpl: async () => responseFromBuffer(goodZip) }), (error) => error.code === 'RUNTIME_DISK_SPACE');
  await assert.rejects(() => downloadBreezeRuntime({ manifest: { ...downloadManifest, download: { ...downloadManifest.download, url: 'http://example.test/runtime.zip' } }, runtimeDirectory: path.join(tempDir, 'insecure'), platform: 'win32', arch: 'x64', getFreeBytes: async () => Number.MAX_SAFE_INTEGER, fetchImpl: async () => responseFromBuffer(goodZip) }), (error) => error.code === 'RUNTIME_INSECURE_URL');
  await assert.rejects(() => downloadBreezeRuntime({ manifest: downloadManifest, runtimeDirectory: path.join(tempDir, 'redirect'), platform: 'win32', arch: 'x64', getFreeBytes: async () => Number.MAX_SAFE_INTEGER, fetchImpl: async () => ({ ok: false, status: 302, headers: { get: () => 'http://unsafe.test/runtime.zip' } }) }), (error) => error.code === 'RUNTIME_INSECURE_URL');
  await assert.rejects(() => downloadBreezeRuntime({ manifest: downloadManifest, runtimeDirectory: path.join(tempDir, 'timeout'), platform: 'win32', arch: 'x64', timeoutMs: 10, getFreeBytes: async () => Number.MAX_SAFE_INTEGER, fetchImpl: async () => ({ ok: true, status: 200, headers: { get: () => null }, body: (async function* body() { yield goodZip.subarray(0, 5); await new Promise((resolve) => setTimeout(resolve, 50)); yield goodZip.subarray(5); }()) }) }), (error) => error.code === 'RUNTIME_TIMEOUT');
  const cancelController = new AbortController();
  const cancelDir = path.join(tempDir, 'cancel');
  await assert.rejects(() => downloadBreezeRuntime({ manifest: downloadManifest, runtimeDirectory: cancelDir, platform: 'win32', arch: 'x64', signal: cancelController.signal, fetchImpl: async () => ({ ok: true, status: 200, headers: { get: () => null }, body: (async function* body() { yield goodZip.subarray(0, 5); await new Promise((resolve) => setTimeout(resolve, 20)); yield goodZip.subarray(5); }()) }), getFreeBytes: async () => Number.MAX_SAFE_INTEGER, onProgress: ({ bytesDownloaded }) => { if (bytesDownloaded > 0) cancelController.abort(); } }), (error) => error.code === 'RUNTIME_CANCELLED');
  assert.equal((await fs.promises.readdir(cancelDir).catch(() => [])).some((name) => name.endsWith('.part')), false);
  await assert.rejects(() => downloadBreezeRuntime({ manifest: downloadManifest, runtimeDirectory: path.join(tempDir, 'http-fail'), platform: 'win32', arch: 'x64', fetchImpl: async () => responseFromBuffer(Buffer.alloc(0), { status: 503 }), getFreeBytes: async () => Number.MAX_SAFE_INTEGER }), (error) => error.code === 'RUNTIME_HTTP_ERROR');

  const probeFailure = await inspectInstalledBreezeRuntime({ runtimeDirectory, manifest: goodManifest, platform: 'win32', arch: 'x64', probe: async () => ({ ok: false, timedOut: true }) });
  assert.equal(probeFailure.status, BREEZE_RUNTIME_STATUS.INVALID);
  console.log('Breeze managed runtime manager、下載／驗證／安全解壓／原子安裝測試通過');
} finally {
  await fs.promises.rm(tempDir, { recursive: true, force: true });
}
