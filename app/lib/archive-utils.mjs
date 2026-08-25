import fs from 'node:fs';
import path from 'node:path';
import { createInflateRaw } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const MAX_EOCD_SEARCH = 22 + 0xffff;

function archiveError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function readUInt32(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

function safeArchiveEntryPath(entryName) {
  const name = String(entryName || '').replaceAll('\\', '/');
  if (!name || name.includes('\0') || name.startsWith('/') || /^[A-Za-z]:\//.test(name)) {
    throw archiveError('ZIP_SLIP', `不安全的 ZIP 路徑：${entryName}`);
  }
  const parts = name.split('/').filter(Boolean);
  if (parts.some((part) => part === '..')) {
    throw archiveError('ZIP_SLIP', `ZIP 路徑包含父層跳脫：${entryName}`);
  }
  const normalized = path.posix.normalize(parts.join('/'));
  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized.startsWith('/')) {
    throw archiveError('ZIP_SLIP', `不安全的 ZIP 路徑：${entryName}`);
  }
  return { normalized, directory: name.endsWith('/') };
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw signal.reason || archiveError('ZIP_CANCELLED', 'ZIP 解壓已取消');
}

async function readAt(handle, offset, length, signal) {
  throwIfAborted(signal);
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await handle.read(buffer, 0, length, offset);
  throwIfAborted(signal);
  if (bytesRead !== length) throw archiveError('ZIP_CORRUPT', 'ZIP 檔案資料不完整');
  return buffer;
}

async function readZipEntries(handle, archiveSize, signal) {
  throwIfAborted(signal);
  const tailLength = Math.min(archiveSize, MAX_EOCD_SEARCH);
  const tail = await readAt(handle, archiveSize - tailLength, tailLength, signal);
  let eocdOffset = -1;
  for (let index = tail.length - 22; index >= 0; index -= 1) {
    if (tail.readUInt32LE(index) === EOCD_SIGNATURE) {
      eocdOffset = index;
      break;
    }
  }
  if (eocdOffset < 0) throw archiveError('ZIP_CORRUPT', '找不到 ZIP central directory');
  const totalEntries = tail.readUInt16LE(eocdOffset + 10);
  const centralSize = tail.readUInt32LE(eocdOffset + 12);
  const centralOffset = tail.readUInt32LE(eocdOffset + 16);
  if (totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw archiveError('ZIP64_UNSUPPORTED', '目前不支援 ZIP64 runtime archive');
  }
  if (centralOffset + centralSize > archiveSize) throw archiveError('ZIP_CORRUPT', 'ZIP central directory 超出檔案範圍');
  const central = await readAt(handle, centralOffset, centralSize, signal);
  const entries = [];
  let offset = 0;
  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > central.length || readUInt32(central, offset) !== CENTRAL_SIGNATURE) {
      throw archiveError('ZIP_CORRUPT', 'ZIP central directory entry 無效');
    }
    const flags = central.readUInt16LE(offset + 8);
    const method = central.readUInt16LE(offset + 10);
    const compressedSize = readUInt32(central, offset + 20);
    const uncompressedSize = readUInt32(central, offset + 24);
    const nameLength = central.readUInt16LE(offset + 28);
    const extraLength = central.readUInt16LE(offset + 30);
    const commentLength = central.readUInt16LE(offset + 32);
    const externalAttributes = readUInt32(central, offset + 38);
    const localOffset = readUInt32(central, offset + 42);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > central.length) throw archiveError('ZIP_CORRUPT', 'ZIP entry header 超出範圍');
    const nameBytes = central.subarray(offset + 46, offset + 46 + nameLength);
    const name = nameBytes.toString((flags & 0x800) ? 'utf8' : 'latin1');
    const safePath = safeArchiveEntryPath(name);
    const unixMode = (externalAttributes >>> 16) & 0xffff;
    const isSymlink = (unixMode & 0xf000) === 0xa000 || Boolean(externalAttributes & 0x400);
    if (isSymlink) throw archiveError('ZIP_SYMLINK', `ZIP 不允許 symlink：${name}`);
    if ((flags & 0x1) !== 0) throw archiveError('ZIP_ENCRYPTED', `ZIP entry 已加密：${name}`);
    entries.push({ name, path: safePath.normalized, directory: safePath.directory, method, flags, compressedSize, uncompressedSize, localOffset });
    offset = end;
  }
  return entries;
}

async function assertInsideRoot(rootDir, targetPath) {
  const root = path.resolve(rootDir);
  const target = path.resolve(targetPath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw archiveError('ZIP_SLIP', `ZIP 解壓路徑逃逸：${targetPath}`);
  return target;
}

async function ensureSafeParent(rootDir, targetPath) {
  const parent = path.dirname(targetPath);
  await assertInsideRoot(rootDir, parent);
  await fs.promises.mkdir(parent, { recursive: true });
  let cursor = parent;
  const root = path.resolve(rootDir);
  while (cursor !== root) {
    const stat = await fs.promises.lstat(cursor);
    if (stat.isSymbolicLink()) throw archiveError('ZIP_SYMLINK', `ZIP parent directory 不可為 symlink：${cursor}`);
    cursor = path.dirname(cursor);
  }
}

async function extractEntry(handle, archivePath, rootDir, entry, maxEntryBytes, signal) {
  throwIfAborted(signal);
  const targetPath = await assertInsideRoot(rootDir, path.join(rootDir, ...entry.path.split('/')));
  if (entry.uncompressedSize > maxEntryBytes) throw archiveError('ZIP_BOMB', `ZIP entry 解壓後過大：${entry.name}`);
  if (entry.directory) {
    await fs.promises.mkdir(targetPath, { recursive: true });
    return;
  }
  await ensureSafeParent(rootDir, targetPath);
  if (entry.compressedSize === 0) {
    await fs.promises.writeFile(targetPath, Buffer.alloc(0), { flag: 'wx' });
    const outputStat = await fs.promises.stat(targetPath);
    if (outputStat.size !== entry.uncompressedSize) throw archiveError('ZIP_CORRUPT', `ZIP entry 解壓大小不符：${entry.name}`);
    return;
  }
  const localHeader = await readAt(handle, entry.localOffset, 30, signal);
  if (readUInt32(localHeader, 0) !== LOCAL_SIGNATURE) throw archiveError('ZIP_CORRUPT', `ZIP local header 無效：${entry.name}`);
  const localNameLength = localHeader.readUInt16LE(26);
  const localExtraLength = localHeader.readUInt16LE(28);
  const dataStart = entry.localOffset + 30 + localNameLength + localExtraLength;
  const dataEnd = dataStart + entry.compressedSize;
  const stat = await fs.promises.stat(archivePath);
  if (dataEnd > stat.size) throw archiveError('ZIP_CORRUPT', `ZIP entry 資料超出檔案：${entry.name}`);
  const source = fs.createReadStream(archivePath, { start: dataStart, end: dataEnd - 1 });
  const output = fs.createWriteStream(targetPath, { flags: 'wx' });
  try {
    if (entry.method === 0) await pipeline(source, output, { signal });
    else if (entry.method === 8) await pipeline(source, createInflateRaw(), output, { signal });
    else throw archiveError('ZIP_METHOD_UNSUPPORTED', `ZIP compression method 不支援：${entry.method}`);
  } catch (error) {
    source.destroy();
    output.destroy();
    try { await fs.promises.rm(targetPath, { force: true }); } catch {}
    throw error;
  }
  throwIfAborted(signal);
  const outputStat = await fs.promises.stat(targetPath);
  if (outputStat.size !== entry.uncompressedSize) throw archiveError('ZIP_CORRUPT', `ZIP entry 解壓大小不符：${entry.name}`);
}

export async function inspectZipArchive(archivePath, { maxEntries = 100000, signal } = {}) {
  const handle = await fs.promises.open(archivePath, 'r');
  try {
    const stat = await handle.stat();
    const entries = await readZipEntries(handle, stat.size, signal);
    if (entries.length > maxEntries) throw archiveError('ZIP_TOO_MANY_ENTRIES', 'ZIP entry 數量超過限制');
    return entries;
  } finally {
    await handle.close();
  }
}

export async function extractZipArchive(archivePath, destinationDir, { maxEntries = 100000, maxEntryBytes = 10 * 1024 * 1024 * 1024, maxTotalBytes = 20 * 1024 * 1024 * 1024, signal } = {}) {
  throwIfAborted(signal);
  await fs.promises.mkdir(destinationDir, { recursive: true });
  const handle = await fs.promises.open(archivePath, 'r');
  try {
    const stat = await handle.stat();
    const entries = await readZipEntries(handle, stat.size, signal);
    if (entries.length > maxEntries) throw archiveError('ZIP_TOO_MANY_ENTRIES', 'ZIP entry 數量超過限制');
    const totalUncompressed = entries.reduce((sum, entry) => sum + entry.uncompressedSize, 0);
    if (totalUncompressed > maxTotalBytes) throw archiveError('ZIP_BOMB', 'ZIP 解壓後總大小超過限制');
    for (const entry of entries) await extractEntry(handle, archivePath, destinationDir, entry, maxEntryBytes, signal);
    return { entries: entries.length, uncompressedBytes: totalUncompressed };
  } finally {
    await handle.close();
  }
}

export { safeArchiveEntryPath };
