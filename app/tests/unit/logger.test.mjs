import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JobLogger } from '../../lib/logger.mjs';

describe('JobLogger', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'offline-subtitle-log-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('writes structured JSONL and rotates old entries', () => {
    const logger = new JobLogger(root, 2);
    logger.info('one', { stage: 'created' });
    logger.warn('two');
    logger.error('three');
    const entries = logger.getRecent(10);
    expect(entries).toHaveLength(2);
    expect(entries.at(-1)).toMatchObject({ level: 'error', message: 'three' });
  });
});
