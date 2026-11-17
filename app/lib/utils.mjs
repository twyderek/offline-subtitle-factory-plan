import fs from 'node:fs';

export function sanitizeLog(value, maxLength = 500) {
  if (!value) return '';
  return String(value)
    .replace(/\r/g, '\n')
    .replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '')
    .replace(/[�]+/g, '')
    .split('\n')
    .map((line) => line.trim().replace(/[^\S\r\n]+/g, ' '))
    .filter((line) => line && !/^[\s\-=|/\\_.:,%\d]+$/.test(line))
    .join('\n')
    .slice(0, maxLength);
}

export function parseTime(value) {
  const match = String(value || '')
    .trim()
    .match(/^(\d+):([0-5]\d):([0-5]\d)[,.](\d{1,3})$/);
  if (!match) return Number.NaN;
  return (
    Number(match[1]) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3]) +
    Number(`0.${match[4].padEnd(3, '0')}`)
  );
}

export function formatTime(seconds) {
  const totalMs = Math.max(0, Math.round(Number(seconds) * 1000));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

export function looksLikeMojibake(value) {
  return /[\u0080-\u00ff]/.test(String(value || ''));
}

export function cjkCount(value) {
  return (String(value || '').match(/[\u3400-\u9fff]/g) || []).length;
}

export function decodeMojibakeText(value) {
  let current = String(value || '');
  for (let attempt = 0; attempt < 3 && looksLikeMojibake(current); attempt += 1) {
    const decoded = Buffer.from(current, 'latin1').toString('utf8');
    if (decoded.includes('\uFFFD')) break;
    const currentScore = cjkCount(current) * 4 - (current.match(/[\u0080-\u00ff]/g) || []).length;
    const decodedScore = cjkCount(decoded) * 4 - (decoded.match(/[\u0080-\u00ff]/g) || []).length;
    if (decodedScore <= currentScore) break;
    current = decoded;
  }
  return current;
}

export function displayFileName(value) {
  return decodeMojibakeText(String(value || ''));
}

export function uploadedFileName(value, fallback = 'upload.bin') {
  const rawName =
    String(value || '')
      .trim()
      .split(/[\\/]/)
      .filter(Boolean)
      .pop() || fallback;
  const decoded = decodeMojibakeText(rawName);
  const cleaned = decoded
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');
  return cleaned || fallback;
}

export function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function getModelCacheKey(modelsDir, fallbackDirs = []) {
  return [modelsDir, ...fallbackDirs]
    .filter(Boolean)
    .map((directory) => {
      try {
        const stat = fs.statSync(directory);
        return `${directory}:${stat.mtimeMs}:${stat.size}`;
      } catch {
        return String(directory);
      }
    })
    .join('|');
}

export function createTtlCache(entries) {
  const cache = Object.fromEntries(
    Object.entries(entries).map(([name, ttl]) => [name, { value: null, checkedAt: 0, ttl }])
  );
  return {
    cache,
    isFresh(name, now = Date.now()) {
      const item = cache[name];
      return Boolean(item?.value) && now - item.checkedAt < item.ttl;
    },
    set(name, value, now = Date.now()) {
      if (!cache[name]) throw new Error(`未知快取項目：${name}`);
      cache[name] = { ...cache[name], value, checkedAt: now };
      return value;
    },
    clear(name) {
      if (name) cache[name] = { ...cache[name], value: null, checkedAt: 0 };
      else
        for (const key of Object.keys(cache))
          cache[key] = { ...cache[key], value: null, checkedAt: 0 };
    },
  };
}

export function parseJsonLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}
