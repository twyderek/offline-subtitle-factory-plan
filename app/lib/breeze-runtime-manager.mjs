import crypto from 'node:crypto';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractZipArchive } from './archive-utils.mjs';

export const BREEZE_RUNTIME_STATUS = Object.freeze({
  NOT_INSTALLED: 'not-installed',
  DOWNLOADING: 'downloading',
  VERIFYING: 'verifying',
  INSTALLING: 'installing',
  INSTALLED: 'installed',
  INVALID: 'invalid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

export const BREEZE_RUNTIME_ENGINE = 'breeze-asr-25';
export const BREEZE_RUNTIME_VARIANT = 'cpu';
export const BREEZE_RUNTIME_DEFAULT_VERSION = '2026.08.1';
export const BREEZE_RUNTIME_MANIFEST_PATH = new URL('../runtime-manifests/breeze-asr-25-win-x64-cpu.json', import.meta.url);

function runtimeError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function localAppData({ env = process.env, platform = process.platform } = {}) {
  if (platform === 'win32') return String(env.LOCALAPPDATA || path.join(env.USERPROFILE || os.homedir(), 'AppData', 'Local'));
  return String(env.XDG_DATA_HOME || path.join(env.HOME || os.homedir(), '.local', 'share'));
}

export function getBreezeRuntimeDirectory({ env = process.env, platform = process.platform, appDataRoot = '' } = {}) {
  const root = appDataRoot || localAppData({ env, platform });
  return path.join(root, 'Offline Subtitle Factory', 'runtimes', BREEZE_RUNTIME_ENGINE);
}

export const getBreezeRuntimeRoot = getBreezeRuntimeDirectory;

export function validateBreezeRuntimeManifest(manifest = {}) {
  const download = manifest.download || {};
  const available = download.available !== false && Boolean(download.url);
  const errors = [];
  if (manifest.schemaVersion !== 1) errors.push('schemaVersion');
  if (manifest.engine !== BREEZE_RUNTIME_ENGINE) errors.push('engine');
  if (manifest.platform !== 'win32') errors.push('platform');
  if (manifest.arch !== 'x64') errors.push('arch');
  if (manifest.variant !== BREEZE_RUNTIME_VARIANT) errors.push('variant');
  if (!/^\d+\.\d+\.\d+$/.test(String(manifest.runtimeVersion || ''))) errors.push('runtimeVersion');
  if (manifest.entrypoint !== 'python.exe') errors.push('entrypoint');
  if (manifest.probe?.module !== 'whisper' || manifest.probe?.requiredModel !== BREEZE_RUNTIME_ENGINE) errors.push('probe');
  if (available) {
    if (!/^https:\/\//i.test(String(download.url))) errors.push('download.url');
    if (!/^[^\\/]+\.zip$/i.test(String(download.filename || ''))) errors.push('download.filename');
    if (!Number.isSafeInteger(download.size) || download.size <= 0) errors.push('download.size');
    if (!/^[a-f0-9]{64}$/i.test(String(download.sha256 || ''))) errors.push('download.sha256');
    if (download.uncompressedSize != null && (!Number.isSafeInteger(download.uncompressedSize) || download.uncompressedSize <= 0)) errors.push('download.uncompressedSize');
  }
  return { valid: errors.length === 0, available, errors };
}

export async function getBreezeRuntimeManifest({ manifestPath = BREEZE_RUNTIME_MANIFEST_PATH } = {}) {
  const raw = await fs.promises.readFile(manifestPath, 'utf8');
  let manifest;
  try { manifest = JSON.parse(raw); } catch (error) { throw runtimeError('RUNTIME_MANIFEST_INVALID', 'Breeze runtime manifest 不是有效 JSON', { cause: error }); }
  const validation = validateBreezeRuntimeManifest(manifest);
  if (!validation.valid) throw runtimeError('RUNTIME_MANIFEST_INVALID', `Breeze runtime manifest 欄位無效：${validation.errors.join(', ')}`, { errors: validation.errors });
  return manifest;
}

function activeStatePath(runtimeDirectory) {
  return path.join(runtimeDirectory, 'runtime-state.json');
}

function runtimeVersionPath(runtimeDirectory, version) {
  return path.join(runtimeDirectory, version);
}

function runtimePythonPath(runtimeDirectory, version, entrypoint = 'python.exe') {
  return path.join(runtimeVersionPath(runtimeDirectory, version), entrypoint);
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw runtimeError('RUNTIME_CANCELLED', 'Breeze runtime 安裝已取消');
}

export function getActiveManagedBreezePythonPath({ runtimeDirectory, platform = process.platform, arch = process.arch, manifest = {}, state = null } = {}) {
  if (platform !== 'win32' || arch !== 'x64' || !runtimeDirectory) return null;
  let effectiveState = state;
  if (effectiveState == null) {
    try { effectiveState = JSON.parse(fs.readFileSync(activeStatePath(runtimeDirectory), 'utf8')); } catch { effectiveState = null; }
  }
  if (effectiveState?.platform && effectiveState.platform !== 'win32') return null;
  if (effectiveState?.arch && effectiveState.arch !== 'x64') return null;
  const activeVersion = effectiveState?.activeVersion;
  if (!activeVersion || !/^\d+\.\d+\.\d+$/.test(String(activeVersion))) return null;
  const candidate = runtimePythonPath(runtimeDirectory, activeVersion, manifest.entrypoint || 'python.exe');
  return fs.existsSync(candidate) ? candidate : null;
}

async function readJsonIfExists(filePath) {
  let parseError = null;
  for (const candidate of [filePath, `${filePath}.previous`]) {
    try { return JSON.parse(await fs.promises.readFile(candidate, 'utf8')); }
    catch (error) {
      if (error?.code === 'ENOENT') continue;
      parseError ||= error;
    }
  }
  if (parseError) throw runtimeError('RUNTIME_STATE_INVALID', `Breeze runtime metadata 不是有效 JSON：${path.basename(filePath)}`, { cause: parseError });
  return null;
}

export async function inspectInstalledBreezeRuntime({ runtimeDirectory = getBreezeRuntimeDirectory(), manifest = {}, probe = null, platform = process.platform, arch = process.arch } = {}) {
  const base = { status: BREEZE_RUNTIME_STATUS.NOT_INSTALLED, installed: false, ready: false, runtimeVersion: manifest.runtimeVersion || null, platform, arch, variant: manifest.variant || BREEZE_RUNTIME_VARIANT };
  if (platform !== 'win32' || arch !== 'x64') return { ...base, status: BREEZE_RUNTIME_STATUS.INVALID, reason: 'platform-unsupported' };
  let state;
  try { state = await readJsonIfExists(activeStatePath(runtimeDirectory)); }
  catch (error) { return { ...base, status: BREEZE_RUNTIME_STATUS.INVALID, installed: true, reason: 'state-invalid', error: error.message }; }
  if (!state) return base;
  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(String(state.activeVersion || '')) || state.platform && state.platform !== 'win32' || state.arch && state.arch !== 'x64') {
    return { ...base, status: BREEZE_RUNTIME_STATUS.INVALID, installed: true, activeVersion: state.activeVersion || null, reason: 'state-invalid' };
  }
  const version = String(state.activeVersion);
  const versionDir = runtimeVersionPath(runtimeDirectory, version);
  const python = runtimePythonPath(runtimeDirectory, version, manifest.entrypoint || 'python.exe');
  let stat;
  try { stat = await fs.promises.stat(python); } catch { return { ...base, status: BREEZE_RUNTIME_STATUS.INVALID, installed: true, activeVersion: version, reason: 'python-missing' }; }
  if (!stat.isFile()) return { ...base, status: BREEZE_RUNTIME_STATUS.INVALID, installed: true, activeVersion: version, reason: 'python-not-file' };
  let installedManifest;
  try { installedManifest = await readJsonIfExists(path.join(versionDir, 'runtime-manifest.json')); }
  catch (error) { return { ...base, status: BREEZE_RUNTIME_STATUS.INVALID, installed: true, activeVersion: version, python, reason: 'manifest-invalid', error: error.message }; }
  const installedValidation = installedManifest ? validateBreezeRuntimeManifest(installedManifest) : { valid: false, errors: ['missing'] };
  if (!installedValidation.valid || installedManifest.runtimeVersion !== version) return { ...base, status: BREEZE_RUNTIME_STATUS.INVALID, installed: true, activeVersion: version, python, reason: 'manifest-invalid', manifestErrors: installedValidation.errors };
  let probeResult = { ok: true };
  if (typeof probe === 'function') {
    try { probeResult = await probe({ pythonPath: python, runtimeDirectory: versionDir, manifest: installedManifest || manifest }); }
    catch (error) { return { ...base, status: BREEZE_RUNTIME_STATUS.INVALID, installed: true, activeVersion: version, python, reason: 'probe-error', error: error.message }; }
  }
  if (!probeResult?.ok) return { ...base, status: BREEZE_RUNTIME_STATUS.INVALID, installed: true, activeVersion: version, python, probe: probeResult, reason: 'probe-failed' };
  return { ...base, status: BREEZE_RUNTIME_STATUS.INSTALLED, installed: true, ready: true, activeVersion: version, python, probe: probeResult };
}

async function sha256File(filePath, signal) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(filePath, { highWaterMark: 8 * 1024 * 1024 })) {
    throwIfAborted(signal);
    hash.update(chunk);
  }
  throwIfAborted(signal);
  return hash.digest('hex');
}

export async function verifyBreezeRuntimeArchive({ archivePath, manifest, signal } = {}) {
  const validation = validateBreezeRuntimeManifest(manifest);
  if (!validation.valid || !validation.available) throw runtimeError('RUNTIME_NOT_AVAILABLE', '目前沒有可下載的 Breeze runtime package');
  try {
    throwIfAborted(signal);
    const stat = await fs.promises.stat(archivePath);
    if (!stat.isFile()) throw runtimeError('RUNTIME_ARCHIVE_INVALID', 'Breeze runtime archive 不是檔案');
    if (stat.size !== manifest.download.size) throw runtimeError('RUNTIME_SIZE_MISMATCH', `Breeze runtime archive 大小不符（${stat.size} / ${manifest.download.size} bytes）`);
    const sha256 = await sha256File(archivePath, signal);
    if (sha256.toLowerCase() !== manifest.download.sha256.toLowerCase()) throw runtimeError('RUNTIME_SHA256_MISMATCH', 'Breeze runtime archive SHA-256 驗證失敗', { sha256 });
    return { archivePath, size: stat.size, sha256 };
  } catch (error) {
    await fs.promises.rm(archivePath, { force: true }).catch(() => {});
    throw error;
  }
}

async function availableBytes(directory) {
  if (typeof fs.promises.statfs !== 'function') return null;
  const stat = await fs.promises.statfs(directory);
  return Number(stat.bavail) * Number(stat.bsize);
}

export async function checkBreezeRuntimeDiskSpace({ runtimeDirectory, manifest, getFreeBytes = availableBytes, multiplier = 1.5 } = {}) {
  const zipSize = Number(manifest?.download?.size || 0);
  const uncompressedSize = Number(manifest?.download?.uncompressedSize || 0);
  const requiredBytes = Math.ceil((zipSize + uncompressedSize) * multiplier);
  if (!requiredBytes) throw runtimeError('RUNTIME_NOT_AVAILABLE', 'Breeze runtime package 尚未提供大小 metadata');
  await fs.promises.mkdir(runtimeDirectory, { recursive: true });
  const freeBytes = await getFreeBytes(runtimeDirectory);
  if (freeBytes != null && freeBytes < requiredBytes) throw runtimeError('RUNTIME_DISK_SPACE', `磁碟空間不足：需要至少 ${requiredBytes} bytes，目前只有 ${freeBytes} bytes`, { requiredBytes, freeBytes });
  return { requiredBytes, freeBytes };
}

async function fetchHttps(url, { fetchImpl, signal, maxRedirects = 5 } = {}) {
  let current = new URL(url);
  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    if (current.protocol !== 'https:') throw runtimeError('RUNTIME_INSECURE_URL', 'Breeze runtime 只允許 HTTPS 下載');
    const response = await fetchImpl(current, { redirect: 'manual', signal });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers?.get?.('location');
    if (!location) throw runtimeError('RUNTIME_REDIRECT_INVALID', 'Breeze runtime 下載 redirect 缺少位置');
    current = new URL(location, current);
  }
  throw runtimeError('RUNTIME_REDIRECT_INVALID', 'Breeze runtime 下載 redirect 次數過多');
}

export async function downloadBreezeRuntime({ manifest, runtimeDirectory = getBreezeRuntimeDirectory(), platform = process.platform, arch = process.arch, fetchImpl = globalThis.fetch, onProgress = () => {}, signal, timeoutMs = 30 * 60 * 1000, getFreeBytes = availableBytes } = {}) {
  if (platform !== 'win32' || arch !== 'x64') throw runtimeError('RUNTIME_PLATFORM_UNSUPPORTED', 'Breeze managed runtime 第一版只支援 Windows x64');
  if (manifest?.download?.available && !/^https:\/\//i.test(String(manifest.download.url || ''))) throw runtimeError('RUNTIME_INSECURE_URL', 'Breeze runtime 只允許 HTTPS 下載');
  const validation = validateBreezeRuntimeManifest(manifest);
  if (!validation.valid || !validation.available) throw runtimeError('RUNTIME_NOT_AVAILABLE', '目前沒有可下載的 Breeze runtime package');
  if (typeof fetchImpl !== 'function') throw runtimeError('RUNTIME_FETCH_UNAVAILABLE', '目前執行環境不支援 Breeze runtime 下載');
  await checkBreezeRuntimeDiskSpace({ runtimeDirectory, manifest, getFreeBytes });
  await fs.promises.mkdir(runtimeDirectory, { recursive: true });
  const archivePath = path.join(runtimeDirectory, manifest.download.filename);
  const partPath = `${archivePath}.part`;
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason || new Error('Breeze runtime 下載已取消'));
  if (signal?.aborted) abortFromCaller(); else signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => controller.abort(new Error('Breeze runtime 下載逾時')), timeoutMs);
  let committed = false;
  try {
    const response = await fetchHttps(manifest.download.url, { fetchImpl, signal: controller.signal });
    if (!response?.ok) throw runtimeError('RUNTIME_HTTP_ERROR', `Breeze runtime 下載失敗（HTTP ${response?.status || 0}）`);
    if (!response.body) throw runtimeError('RUNTIME_HTTP_ERROR', 'Breeze runtime 回應沒有下載內容');
    const declaredSize = Number(response.headers?.get?.('content-length') || 0);
    if (declaredSize && declaredSize !== manifest.download.size) throw runtimeError('RUNTIME_SIZE_MISMATCH', `下載 Content-Length 不符（${declaredSize} / ${manifest.download.size} bytes）`);
    const output = fs.createWriteStream(partPath, { flags: 'w' });
    const outputClosed = Promise.race([once(output, 'close'), once(output, 'error').then(([error]) => { throw error; })]);
    let bytesDownloaded = 0;
    onProgress({ status: BREEZE_RUNTIME_STATUS.DOWNLOADING, bytesDownloaded, totalBytes: manifest.download.size, progress: 0 });
    try {
      for await (const chunk of response.body) {
        if (controller.signal.aborted) throw controller.signal.reason || new Error('Breeze runtime 下載已取消');
        const buffer = Buffer.from(chunk);
        bytesDownloaded += buffer.length;
        if (bytesDownloaded > manifest.download.size) throw runtimeError('RUNTIME_SIZE_MISMATCH', '下載內容超過 manifest 大小');
        if (!output.write(buffer)) await new Promise((resolve, reject) => { output.once('drain', resolve); output.once('error', reject); });
        onProgress({ status: BREEZE_RUNTIME_STATUS.DOWNLOADING, bytesDownloaded, totalBytes: manifest.download.size, progress: Math.round((bytesDownloaded / manifest.download.size) * 100) });
      }
      output.end();
      await outputClosed;
    } finally { output.destroy(); }
    if (bytesDownloaded !== manifest.download.size) throw runtimeError('RUNTIME_SIZE_MISMATCH', `下載大小不符（${bytesDownloaded} / ${manifest.download.size} bytes）`);
    await fs.promises.rm(archivePath, { force: true });
    await fs.promises.rename(partPath, archivePath);
    committed = true;
    return { archivePath, bytesDownloaded, totalBytes: manifest.download.size };
  } catch (error) {
    if (controller.signal.aborted || signal?.aborted || error?.name === 'AbortError') {
      if (String(controller.signal.reason?.message || '').includes('逾時')) throw runtimeError('RUNTIME_TIMEOUT', 'Breeze runtime 下載逾時');
      throw runtimeError('RUNTIME_CANCELLED', 'Breeze runtime 下載已取消');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
    if (!committed) await fs.promises.rm(partPath, { force: true }).catch(() => {});
  }
}

async function writeJsonAtomic(filePath, data) {
  const tempPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  const backupPath = `${filePath}.previous`;
  await fs.promises.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  let hadExisting = false;
  try {
    try {
      await fs.promises.access(filePath);
      await fs.promises.rm(backupPath, { force: true });
      await fs.promises.rename(filePath, backupPath);
      hadExisting = true;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    await fs.promises.rename(tempPath, filePath);
  } catch (error) {
    if (hadExisting) await fs.promises.rename(backupPath, filePath).catch(() => {});
    await fs.promises.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
  await fs.promises.rm(backupPath, { force: true }).catch(() => {});
}

export async function installBreezeRuntime({ archivePath, manifest, runtimeDirectory = getBreezeRuntimeDirectory(), platform = process.platform, arch = process.arch, extractArchive = extractZipArchive, probe, onProgress = () => {}, signal, writeState = writeJsonAtomic } = {}) {
  if (platform !== 'win32' || arch !== 'x64') throw runtimeError('RUNTIME_PLATFORM_UNSUPPORTED', 'Breeze managed runtime 第一版只支援 Windows x64');
  if (typeof probe !== 'function') throw runtimeError('RUNTIME_PROBE_REQUIRED', '安裝 Breeze runtime 前必須提供 capability probe');
  const validation = await verifyBreezeRuntimeArchive({ archivePath, manifest, signal });
  // Keep the staging path short. Windows native-extension loading can fail
  // before the runtime is activated when a clean profile has a long
  // LOCALAPPDATA path; the sibling directory remains on the same volume, so
  // the final rename is still atomic.
  const tempDir = path.join(path.dirname(runtimeDirectory), `.osf-${crypto.randomUUID()}`);
  const targetDir = runtimeVersionPath(runtimeDirectory, manifest.runtimeVersion);
  const previousDir = `${targetDir}.${process.pid}.${crypto.randomUUID()}.previous`;
  const statePath = activeStatePath(runtimeDirectory);
  let previousState = null;
  let hadPreviousState = false;
  let activated = false;
  try {
    throwIfAborted(signal);
    onProgress({ status: BREEZE_RUNTIME_STATUS.VERIFYING, progress: 100 });
    await fs.promises.mkdir(tempDir, { recursive: true });
    onProgress({ status: BREEZE_RUNTIME_STATUS.INSTALLING, progress: 0 });
    await extractArchive(archivePath, tempDir, { signal });
    throwIfAborted(signal);
    const pythonPath = path.join(tempDir, manifest.entrypoint);
    const pythonStat = await fs.promises.stat(pythonPath).catch(() => null);
    if (!pythonStat?.isFile()) throw runtimeError('RUNTIME_LAYOUT_INVALID', 'Breeze runtime archive 缺少 python.exe');
    await fs.promises.writeFile(path.join(tempDir, 'runtime-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
    const probeResult = await probe({ pythonPath, runtimeDirectory: tempDir, manifest, timeoutMs: 15000, signal });
    throwIfAborted(signal);
    if (!probeResult?.ok) throw runtimeError('RUNTIME_PROBE_FAILED', 'Breeze runtime capability probe 未通過', { probe: probeResult });
    await fs.promises.mkdir(runtimeDirectory, { recursive: true });
    try {
      previousState = await fs.promises.readFile(statePath);
      hadPreviousState = true;
    } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    try {
      await fs.promises.rename(targetDir, previousDir);
    } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    try {
      await fs.promises.rename(tempDir, targetDir);
      throwIfAborted(signal);
      await writeState(statePath, { activeVersion: manifest.runtimeVersion, installedAt: new Date().toISOString(), platform: 'win32', arch: 'x64', variant: manifest.variant, validated: true });
      throwIfAborted(signal);
      activated = true;
    } catch (error) {
      await fs.promises.rm(targetDir, { recursive: true, force: true }).catch(() => {});
      try { await fs.promises.rename(previousDir, targetDir); } catch {}
      if (hadPreviousState) await fs.promises.writeFile(statePath, previousState, { flag: 'w' }).catch(() => {});
      else await fs.promises.rm(statePath, { force: true }).catch(() => {});
      throw error;
    }
    await fs.promises.rm(previousDir, { recursive: true, force: true }).catch(() => {});
    onProgress({ status: BREEZE_RUNTIME_STATUS.INSTALLED, progress: 100 });
    return { status: BREEZE_RUNTIME_STATUS.INSTALLED, ready: true, runtimeVersion: manifest.runtimeVersion, python: runtimePythonPath(runtimeDirectory, manifest.runtimeVersion, manifest.entrypoint), probe: probeResult, ...validation };
  } finally {
    if (!activated) {
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      await fs.promises.rm(previousDir, { recursive: true, force: true }).catch(() => {});
      await fs.promises.rm(archivePath, { force: true }).catch(() => {});
    }
  }
}

export async function removeBreezeRuntime({ runtimeDirectory = getBreezeRuntimeDirectory() } = {}) {
  await fs.promises.rm(runtimeDirectory, { recursive: true, force: true });
  return { status: BREEZE_RUNTIME_STATUS.NOT_INSTALLED, installed: false, ready: false };
}

export function cancelBreezeRuntimeDownload(controller, reason = new Error('Breeze runtime 下載已取消')) {
  if (controller && typeof controller.abort === 'function') controller.abort(reason);
}

export async function resolveManagedBreezePython({ runtimeDirectory = getBreezeRuntimeDirectory(), manifest = {}, probe } = {}) {
  const inspected = await inspectInstalledBreezeRuntime({ runtimeDirectory, manifest, probe, platform: 'win32', arch: 'x64' });
  return inspected.ready ? inspected.python : null;
}

export function createBreezeRuntimeManager(options = {}) {
  const base = { ...options };
  let activePromise = null;
  let activeController = null;
  return {
    getBreezeRuntimeDirectory: () => base.runtimeDirectory || getBreezeRuntimeDirectory(base),
    getBreezeRuntimeManifest: () => getBreezeRuntimeManifest(base),
    inspectInstalledBreezeRuntime: (extra = {}) => inspectInstalledBreezeRuntime({ ...base, ...extra, runtimeDirectory: extra.runtimeDirectory || base.runtimeDirectory || getBreezeRuntimeDirectory(base) }),
    async install(extra = {}) {
      if (activePromise) return activePromise;
      activeController = new AbortController();
      activePromise = (async () => {
        const manifest = extra.manifest || await getBreezeRuntimeManifest({ ...base, ...extra });
        const runtimeDirectory = extra.runtimeDirectory || base.runtimeDirectory || getBreezeRuntimeDirectory(base);
        const download = await downloadBreezeRuntime({ ...base, ...extra, manifest, runtimeDirectory, signal: activeController.signal });
        return installBreezeRuntime({ ...base, ...extra, manifest, runtimeDirectory, archivePath: download.archivePath, signal: activeController.signal });
      })().finally(() => { activePromise = null; activeController = null; });
      return activePromise;
    },
    cancel: () => cancelBreezeRuntimeDownload(activeController),
    async remove(extra = {}) {
      if (activePromise) throw runtimeError('RUNTIME_BUSY', 'Breeze runtime 安裝工作尚未結束，請先等待取消完成');
      return removeBreezeRuntime({ ...base, ...extra, runtimeDirectory: extra.runtimeDirectory || base.runtimeDirectory || getBreezeRuntimeDirectory(base) });
    },
  };
}
