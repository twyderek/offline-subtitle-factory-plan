import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JobManager, QUEUE_STATE_FILE } from '../../lib/job-manager.mjs';

describe('JobManager', () => {
  let jobsDir;

  beforeEach(() => {
    jobsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'offline-subtitle-job-'));
  });

  afterEach(() => {
    fs.rmSync(jobsDir, { recursive: true, force: true });
  });

  it('creates and lists a job', () => {
    const manager = new JobManager({ jobsDir });
    const result = manager.createJob({
      fields: { language: 'zh-TW' },
      files: { video: { filename: 'test.mp4', size: 1000 } },
    });
    expect(result.jobId).toMatch(/^\d{14}-[a-f0-9]{6}$/);
    expect(result.status.status).toBe('created');
    expect(manager.listJobs()).toHaveLength(1);
  });

  it('persists and restores queued work', () => {
    const first = new JobManager({ jobsDir });
    const result = first.createJob({ files: { video: { filename: 'test.mp4', size: 1000 } } });
    first.jobQueue.push({
      jobId: result.jobId,
      job: first.loadJob(result.jobId),
      controller: new AbortController(),
      runner: async () => {},
    });
    first.persistQueueState();
    expect(fs.existsSync(path.join(jobsDir, QUEUE_STATE_FILE))).toBe(true);
    const second = new JobManager({ jobsDir });
    expect(second.jobQueue.map((entry) => entry.jobId)).toEqual([result.jobId]);
  });

  it('runs a queued job and persists the completed status', async () => {
    const manager = new JobManager({ jobsDir, maxConcurrentJobs: 1 });
    const result = manager.createJob({ files: { video: { filename: 'test.mp4', size: 1000 } } });
    manager.startJob(result.jobId, async () => {});
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(manager.loadJob(result.jobId).status.status).toBe('completed');
  });
});
