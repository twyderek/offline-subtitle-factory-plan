import { describe, expect, it } from 'vitest';
import {
  cjkCount,
  createTtlCache,
  decodeMojibakeText,
  formatTime,
  getModelCacheKey,
  parseJsonLines,
  parseTime,
  sanitizeLog,
  uploadedFileName,
} from '../../lib/utils.mjs';

describe('utils', () => {
  it('parses and formats SRT time', () => {
    expect(parseTime('00:00:01,500')).toBe(1.5);
    expect(parseTime('01:30:45,123')).toBe(5445.123);
    expect(parseTime('00:00:01.5')).toBe(1.5);
    expect(Number.isNaN(parseTime('invalid'))).toBe(true);
    expect(formatTime(1.5)).toBe('00:00:01,500');
  });

  it('sanitizes logs and keeps the legacy truncation contract', () => {
    expect(sanitizeLog('\u001b[31mRed\u001b[0m')).toBe('Red');
    expect(sanitizeLog('a'.repeat(600)).length).toBeLessThanOrEqual(500);
  });

  it('handles upload names and mojibake safely', () => {
    expect(uploadedFileName('../../etc/passwd')).toBe('passwd');
    expect(uploadedFileName('test<>:file.mp4')).toBe('test_file.mp4');
    expect(uploadedFileName('...')).toBe('upload.bin');
    expect(cjkCount('繁中文')).toBe(3);
    expect(decodeMojibakeText('æ¸¸ä¸­æ')).toBe('游中文');
  });

  it('builds a stable directory cache key', () => {
    expect(getModelCacheKey('missing-model-dir', ['missing-fallback'])).toContain(
      'missing-model-dir'
    );
  });

  it('supports tiered cache entries and tolerant JSONL parsing', () => {
    const cache = createTtlCache({ fast: 1000 });
    expect(cache.isFresh('fast')).toBe(false);
    cache.set('fast', { ok: true }, 100);
    expect(cache.isFresh('fast', 500)).toBe(true);
    expect(cache.isFresh('fast', 1200)).toBe(false);
    expect(parseJsonLines('{"ok":true}\ninvalid\n{"n":1}')).toEqual([{ ok: true }, { n: 1 }]);
    cache.clear();
    expect(cache.isFresh('fast')).toBe(false);
  });
});
